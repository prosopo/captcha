// Copyright 2021-2023 Prosopo (UK) Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import type { ApiPromise } from '@polkadot/api/promise/Api'
import type { SubmittableExtrinsic } from '@polkadot/api/types'
import type { WeightV2 } from '@polkadot/types/interfaces'
import { randomAsHex } from '@polkadot/util-crypto/random'
import { BN } from '@polkadot/util/bn'
import type { Commit, Hash } from '@prosopo/captcha-contract/types-returns'
import { type Logger, ProsopoContractError } from '@prosopo/common'
import {
    type ProsopoCaptchaContract,
    batch,
    encodeStringArgs,
    oneUnit,
} from '@prosopo/contract'
import {
    type BatchCommitConfigOutput,
    type ExtrinsicBatch,
    ScheduledTaskNames,
    ScheduledTaskStatus,
} from '@prosopo/types'
import type { Database, UserCommitmentRecord } from '@prosopo/types-database'
import { checkIfTaskIsRunning } from '../util.js'

const BN_TEN_THOUSAND = new BN(10_000)
const CONTRACT_METHOD_NAME = 'providerCommitMany'

export class BatchCommitmentsTask {
    contract: ProsopoCaptchaContract
    db: Database
    batchCommitConfig: BatchCommitConfigOutput
    logger: Logger
    private nonce: bigint
    constructor(
        batchCommitConfig: BatchCommitConfigOutput,
        contractApi: ProsopoCaptchaContract,
        db: Database,
        startNonce: bigint,
        logger: Logger
    ) {
        this.contract = contractApi
        this.db = db
        this.batchCommitConfig = batchCommitConfig
        this.logger = logger
        this.nonce = startNonce
    }
    async run(): Promise<any> {
        // create a task id
        const taskId = randomAsHex(32)
        const taskRunning = await checkIfTaskIsRunning(
            ScheduledTaskNames.BatchCommitment,
            this.db
        )
        // taskRunning and intervalExceeded checks separated over multiple lines to avoid race conditions between providers
        if (!taskRunning) {
            const intervalExceeded = await this.batchIntervalExceeded()
            if (intervalExceeded) {
                try {
                    // update last commit time
                    await this.db.storeScheduledTaskStatus(
                        taskId,
                        ScheduledTaskNames.BatchCommitment,
                        ScheduledTaskStatus.Running
                    )
                    //get commitments
                    const commitments = await this.getCommitments()
                    if (commitments.length > 0) {
                        this.logger.info(
                            `Found ${commitments.length} commitments to commit`
                        )
                        // get the extrinsics that are to be batched and an id associated with each one
                        const { extrinsics, ids: commitmentIds } =
                            await this.createExtrinsics(commitments)
                        // commit and get the Ids of the commitments that were committed on-chain
                        await batch(
                            this.contract.contract,
                            this.contract.pair,
                            extrinsics,
                            this.logger
                        )
                        // flag commitments as batched
                        await this.flagBatchedCommitments(commitmentIds)
                        // update last commit time and store the commitmentIds that were batched
                        await this.db.storeScheduledTaskStatus(
                            taskId,
                            ScheduledTaskNames.BatchCommitment,
                            ScheduledTaskStatus.Completed,
                            {
                                data: {
                                    commitmentIds: commitments
                                        .filter(
                                            (commitment) =>
                                                commitmentIds.indexOf(
                                                    commitment.id
                                                ) > -1
                                        )
                                        .map((c) => c.id),
                                },
                            }
                        )
                    }
                    return commitments
                } catch (e) {
                    const err = e as Error
                    this.logger.error(e)
                    await this.db.storeScheduledTaskStatus(
                        taskId,
                        ScheduledTaskNames.BatchCommitment,
                        ScheduledTaskStatus.Failed,
                        {
                            error: JSON.stringify(
                                e && err.message ? err.message : e
                            ),
                        }
                    )
                    return err.message
                }
            }
        }
    }

    async createExtrinsics(
        commitments: UserCommitmentRecord[]
    ): Promise<ExtrinsicBatch> {
        const txs: SubmittableExtrinsic<any>[] = []
        const fragment = this.contract.abi.findMessage(CONTRACT_METHOD_NAME)
        const batchedCommitmentIds: Hash[] = []
        let totalRefTime = new BN(0)
        let totalProofSize = new BN(0)
        let totalFee = new BN(0)
        const maxBlockWeight =
            this.contract.api.consts.system.blockWeights.maxBlock
        const commitmentArray: Commit[] = []
        let extrinsic: SubmittableExtrinsic<'promise'> | undefined
        for (const commitment of commitments) {
            const commit = this.convertCommit(commitment)
            commitmentArray.push(commit)
            const encodedArgs: Uint8Array[] = encodeStringArgs(
                this.contract.abi,
                fragment,
                [commitmentArray]
            )

            // TODO can we get storage deposit from the provided query method?
            //  https://matrix.to/#/!utTuYglskDvqRRMQta:matrix.org/$tELySFxCORlHCHveOknGJBx-MdVe-SxFN8_BsYvcDmI?via=matrix.org&via=t2bot.io&via=cardinal.ems.host
            //  const response = await this.contract.query.providerCommitMany(commitmentArray)
            const buildExtrinsicResult =
                await this.contract.getExtrinsicAndGasEstimates(
                    'providerCommitMany',
                    encodedArgs
                )
            extrinsic = buildExtrinsicResult.extrinsic
            const { options, storageDeposit } = buildExtrinsicResult
            let paymentInfo: BN
            try {
                paymentInfo = (
                    await extrinsic.paymentInfo(this.contract.pair)
                ).partialFee.toBn()
                this.logger.debug(
                    `${CONTRACT_METHOD_NAME} paymentInfo:`,
                    paymentInfo.toNumber()
                )
            } catch (e) {
                // TODO https://github.com/polkadot-js/api/issues/5504
                paymentInfo = new BN(0)
            }
            //totalEncodedLength += extrinsic.encodedLength
            totalRefTime = totalRefTime.add(
                this.contract.api.registry
                    .createType('WeightV2', options.gasLimit)
                    .refTime.toBn()
            )
            totalProofSize = totalProofSize.add(
                this.contract.api.registry
                    .createType('WeightV2', options.gasLimit)
                    .proofSize.toBn()
            )

            totalFee = totalFee.add(
                paymentInfo.add(storageDeposit.asCharge.toBn())
            )
            const extrinsicTooHigh = this.extrinsicTooHigh(
                totalRefTime,
                totalProofSize,
                maxBlockWeight
            )
            this.logger.debug(
                'Free balance',
                '`',
                (
                    await this.contract.api.query.system.account(
                        this.contract.pair.address
                    )
                ).data.free
                    .toBn()
                    .div(oneUnit(this.contract.api as ApiPromise))
                    .toString(),
                '`',
                'UNIT'
            )
            this.logger.debug(
                'Total Fee `',
                totalFee
                    .div(oneUnit(this.contract.api as ApiPromise))
                    .toString(),
                '`',
                'UNIT'
            )
            const feeTooHigh = totalFee.gt(
                (
                    await this.contract.api.query.system.account(
                        this.contract.pair.address
                    )
                ).data.free.toBn()
            )

            // Check if we have a maximum number of transactions that we can successfully submit in a block or if the
            // total fee is more than the provider has left in their account
            if (extrinsicTooHigh || feeTooHigh) {
                const msg = extrinsicTooHigh
                    ? 'Max batch extrinsic percentage reached'
                    : 'Fee too high'
                this.logger.warn(msg)
                break
            }
            batchedCommitmentIds.push(commitment.id)
        }
        if (!extrinsic) {
            throw new ProsopoContractError('CONTRACT.TX_ERROR', {
                context: { error: 'No extrinsics created' },
            })
        }
        txs.push(extrinsic)
        this.logger.info(`${txs.length} transactions will be batched`)
        this.logger.debug('totalRefTime:', totalRefTime.toString())
        this.logger.debug('totalProofSize:', totalProofSize.toString())
        return {
            extrinsics: txs,
            ids: batchedCommitmentIds,
            totalFee,
            totalRefTime,
            totalProofSize,
        }
    }

    extrinsicTooHigh(
        totalRefTime: BN,
        totalProofSize: BN,
        maxBlockWeight: WeightV2
    ): boolean {
        return (
            totalRefTime
                .mul(BN_TEN_THOUSAND)
                .div(maxBlockWeight.refTime.toBn())
                .toNumber() /
                100 >
            this.batchCommitConfig.maxBatchExtrinsicPercentage
        )
    }

    async batchIntervalExceeded(): Promise<boolean> {
        //if time since last commit > batchCommitInterval
        const lastTime = await this.db.getLastBatchCommitTime()
        return (
            Date.now() - lastTime.getSeconds() > this.batchCommitConfig.interval
        )
    }

    async getCommitments(): Promise<UserCommitmentRecord[]> {
        // get commitments that have not yet been batched on-chain
        return await this.db.getUnbatchedDappUserCommitments()
    }

    async flagBatchedCommitments(commitmentIds: Hash[]): Promise<void> {
        await this.db.flagBatchedDappUserCommitments(commitmentIds)
    }

    convertCommit(commitment: UserCommitmentRecord): Commit {
        const {
            batched,
            processed,
            userSignature,
            requestedAt,
            completedAt,
            ...commit
        } = commitment

        return {
            ...commit,
            userSignature,
            // to satisfy typescript
            requestedAt: new BN(requestedAt).toNumber(),
            completedAt: new BN(completedAt).toNumber(),
        }
    }
}
