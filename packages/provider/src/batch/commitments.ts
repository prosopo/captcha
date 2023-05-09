<<<<<<< HEAD
import { ProsopoContractApi, batch, encodeStringArgs, oneUnit } from '@prosopo/contract'
=======
import { batch, encodeStringArgs, oneUnit } from '@prosopo/contract'
>>>>>>> main
import { BN } from '@polkadot/util'
import {
    BatchCommitConfig,
    Database,
    ExtrinsicBatch,
<<<<<<< HEAD
=======
    IProsopoContractMethods,
>>>>>>> main
    ScheduledTaskNames,
    ScheduledTaskStatus,
    UserCommitmentRecord,
} from '@prosopo/types'
import { ApiPromise } from '@polkadot/api'
import { SubmittableExtrinsic } from '@polkadot/api/types'
import { Logger } from '@prosopo/common'
import { randomAsHex } from '@polkadot/util-crypto'
import { WeightV2 } from '@polkadot/types/interfaces'

const BN_TEN_THOUSAND = new BN(10_000)
const CONTRACT_METHOD_NAME = 'dappUserCommit'

export class BatchCommitments {
<<<<<<< HEAD
    contract: ProsopoContractApi
=======
    contract: IProsopoContractMethods
>>>>>>> main
    db: Database
    batchCommitConfig: BatchCommitConfig
    logger: Logger
    private nonce: bigint
    constructor(
        batchCommitConfig: BatchCommitConfig,
<<<<<<< HEAD
        contractApi: ProsopoContractApi,
=======
        contractApi: IProsopoContractMethods,
>>>>>>> main
        db: Database,
        concurrent: number,
        startNonce: bigint,
        logger: Logger
    ) {
        this.contract = contractApi
        this.db = db
        this.batchCommitConfig = batchCommitConfig
        this.logger = logger
        this.nonce = startNonce
    }
    async runBatch(): Promise<void> {
        // create a task id
        const taskId = randomAsHex(32)
        if (await this.batchIntervalExceeded()) {
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
                    this.logger.info(`Found ${commitments.length} commitments to commit`)
                    // get the extrinsics that are to be batched and an id associated with each one
                    const { extrinsics, ids: commitmentIds } = await this.createExtrinsics(commitments)
                    console.log(
                        'extrinsics',
                        extrinsics.map((e) => e.toHuman())
                    )
                    // commit and get the Ids of the commitments that were committed on-chain
                    await batch(this.contract, this.contract.pair, extrinsics, this.logger)
                    // remove commitments
                    await this.removeCommitmentsAndSolutions(commitmentIds)
                    // update last commit time and store the commitmentIds that were batched
                    await this.db.storeScheduledTaskStatus(
                        taskId,
                        ScheduledTaskNames.BatchCommitment,
                        ScheduledTaskStatus.Completed,
                        {
                            data: {
                                commitmentIds: commitments
                                    .filter((commitment) => commitmentIds.indexOf(commitment.commitmentId) > -1)
                                    .map((c) => c.commitmentId),
                            },
                        }
                    )
                }
            } catch (e) {
                this.logger.error(e)
                await this.db.storeScheduledTaskStatus(
                    taskId,
                    ScheduledTaskNames.BatchCommitment,
                    ScheduledTaskStatus.Failed,
                    {
                        error: JSON.stringify(e && e.message ? e.message : e),
                    }
                )
            }
        }
    }

    async createExtrinsics(commitments): Promise<ExtrinsicBatch> {
        const txs: SubmittableExtrinsic<any>[] = []
        const fragment = this.contract.abi.findMessage(CONTRACT_METHOD_NAME)
        const batchedCommitmentIds: string[] = []
        let totalRefTime = new BN(0)
        let totalProofSize = new BN(0)
        let totalFee = new BN(0)
        const maxBlockWeight = this.contract.api.consts.system.blockWeights.maxBlock

        for (const commitment of commitments) {
            const args = [
                commitment.dappAccount, // contract account
                commitment.datasetId,
                commitment.commitmentId,
                this.contract.pair.address,
                commitment.userAccount,
                commitment.approved ? 'Approved' : 'Disapproved',
            ]
            this.logger.debug('Provider Address', this.contract.pair.address)
            const encodedArgs: Uint8Array[] = encodeStringArgs(this.contract.abi, fragment, args)
            this.logger.debug(`Commitment:`, args)
<<<<<<< HEAD
            const { extrinsic, options } = await this.contract.buildExtrinsic('dappUserCommit', encodedArgs)

            const paymentInfo = await extrinsic.paymentInfo(this.contract.pair)

            console.log(JSON.stringify(this.contract.api.consts.transactionPayment))
=======
            const { extrinsic, options, storageDeposit } = await this.contract.buildExtrinsic(
                'dappUserCommit',
                encodedArgs
            )

            const paymentInfo = await extrinsic.paymentInfo(this.contract.pair)

            //console.log(JSON.stringify(this.contract.api.consts.transactionPayment))
>>>>>>> main

            this.logger.debug(`${CONTRACT_METHOD_NAME} paymentInfo:`, paymentInfo.toHuman())
            //totalEncodedLength += extrinsic.encodedLength
            totalRefTime = totalRefTime.add(
                this.contract.api.registry.createType('WeightV2', options.gasLimit).refTime.toBn()
            )
            totalProofSize = totalProofSize.add(
                this.contract.api.registry.createType('WeightV2', options.gasLimit).proofSize.toBn()
            )
<<<<<<< HEAD
            totalFee = totalFee.add(paymentInfo.partialFee.toBn())
            const extrinsicTooHigh = this.extrinsicTooHigh(totalRefTime, totalProofSize, maxBlockWeight)
            console.log(
                'Free balance',
                (await this.contract.api.query.system.account(this.contract.pair.address)).data.free
                    .toBn()
                    .div(oneUnit(this.contract.api as ApiPromise))
                    .toString()
            )
            console.log('Total Fee', totalFee.div(oneUnit(this.contract.api as ApiPromise)).toString())
=======
            totalFee = totalFee.add(paymentInfo.partialFee.toBn().add(storageDeposit.asCharge.toBn()))
            const extrinsicTooHigh = this.extrinsicTooHigh(totalRefTime, totalProofSize, maxBlockWeight)
            console.log(
                'Free balance',
                '`',
                (await this.contract.api.query.system.account(this.contract.pair.address)).data.free
                    .toBn()
                    .div(oneUnit(this.contract.api as ApiPromise))
                    .toString(),
                '`',
                'UNIT'
            )
            console.log('Total Fee `', totalFee.div(oneUnit(this.contract.api as ApiPromise)).toString(), '`', 'UNIT')
>>>>>>> main
            const feeTooHigh = totalFee.gt(
                (await this.contract.api.query.system.account(this.contract.pair.address)).data.free.toBn()
            )

            // Check if we have a maximum number of transactions that we can successfully submit in a block or if the
            // total fee is more than the provider has left in their account
            if (extrinsicTooHigh || feeTooHigh) {
                const msg = extrinsicTooHigh ? 'Max batch extrinsic percentage reached' : 'Fee too high'
                this.logger.warn(msg)
                break
            } else {
                batchedCommitmentIds.push(commitment.commitmentId)
                txs.push(extrinsic)
            }
        }
        this.logger.info(`${txs.length} transactions will be batched`)
        this.logger.debug('totalRefTime:', totalRefTime.toString())
        this.logger.debug('totalProofSize:', totalProofSize.toString())
        return { extrinsics: txs, ids: batchedCommitmentIds, totalFee, totalRefTime, totalProofSize }
    }

    extrinsicTooHigh(totalRefTime: BN, totalProofSize: BN, maxBlockWeight: WeightV2): boolean {
        return (
            totalRefTime.mul(BN_TEN_THOUSAND).div(maxBlockWeight.refTime.toBn()).toNumber() / 100 >
            this.batchCommitConfig.maxBatchExtrinsicPercentage
        )
    }

    async batchIntervalExceeded(): Promise<boolean> {
        //if time since last commit > batchCommitInterval
        const lastTime = await this.db.getLastBatchCommitTime()
        return Date.now() - lastTime > this.batchCommitConfig.interval
    }

    async getCommitments(): Promise<UserCommitmentRecord[]> {
        // get commitments that have already been used to generate a solution
        return await this.db.getProcessedDappUserCommitments()
    }

    async removeCommitmentsAndSolutions(commitmentIds: string[]): Promise<void> {
        const removeSolutionsResult = await this.db.removeProcessedDappUserSolutions(commitmentIds)
        const removeCommitmentsResult = await this.db.removeProcessedDappUserCommitments(commitmentIds)
        this.logger.info('Deleted user solutions', removeSolutionsResult)
        this.logger.info('Deleted user commitments', removeCommitmentsResult)
    }
}
