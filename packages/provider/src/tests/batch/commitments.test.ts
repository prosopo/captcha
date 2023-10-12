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

import { AccountKey } from '../dataUtils/DatabaseAccounts.js'
import { ApiPromise } from '@polkadot/api'
import { BN, BN_THOUSAND, BN_TWO, bnMin, stringToHex } from '@polkadot/util'
import { BatchCommitmentsTask } from '../../batch/commitments.js'
import { CaptchaSolution, ScheduledTaskNames } from '@prosopo/types'
import { CaptchaStatus } from '@prosopo/captcha-contract'
import { KeypairType } from '@polkadot/util-crypto/types'
import { MockEnvironment, getPair } from '@prosopo/env'
import { ProsopoEnvError } from '@prosopo/common'
import { ReturnNumber } from '@727-ventures/typechain-types'
import { UserCommitmentRecord } from '@prosopo/types-database'
import { ViteTestContext } from '@prosopo/env'
import { accountAddress, accountContract, accountMnemonic, getSignedTasks } from '../accounts.js'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { at } from '@prosopo/util'
import { getTestConfig } from '@prosopo/config'
import { getUser } from '../getUser.js'
import { randomAsHex } from '@polkadot/util-crypto'
import { sleep } from '../tasks/tasks.test.js'
import { wrapQuery } from '@prosopo/contract'

// Some chains incorrectly use these, i.e. it is set to values such as 0 or even 2
// Use a low minimum validity threshold to check these against
const THRESHOLD = BN_THOUSAND.div(BN_TWO)
const DEFAULT_TIME = new BN(6_000)
const A_DAY = new BN(24 * 60 * 60 * 1000)

function calcInterval(api: ApiPromise): BN {
    return bnMin(
        A_DAY,
        // Babe, e.g. Relay chains (Substrate defaults)
        api.consts.babe?.expectedBlockTime ||
            // POW, eg. Kulupu
            api.consts.difficulty?.targetBlockTime ||
            // Subspace
            api.consts.subspace?.expectedBlockTime ||
            // Check against threshold to determine value validity
            (api.consts.timestamp?.minimumPeriod.gte(THRESHOLD)
                ? // Default minimum period config
                  api.consts.timestamp.minimumPeriod.mul(BN_TWO)
                : api.query.parachainSystem
                ? // default guess for a parachain
                  DEFAULT_TIME.mul(BN_TWO)
                : // default guess for others
                  DEFAULT_TIME)
    )
}
declare module 'vitest' {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    export interface TestContext extends ViteTestContext {}
}

describe('BATCH TESTS', function () {
    beforeEach(async function (context: ViteTestContext) {
        context.ss58Format = 42
        context.pairType = 'sr25519' as KeypairType
        const alicePair = await getPair(undefined, '//Alice', undefined, context.pairType, context.ss58Format)
        context.env = new MockEnvironment(alicePair, getTestConfig())
        try {
            await context.env.isReady()
        } catch (e) {
            throw new ProsopoEnvError(e as Error)
        }
        const promiseStakeDefault: Promise<ReturnNumber> = wrapQuery(
            context.env.getContractInterface().query.getProviderStakeThreshold,
            context.env.getContractInterface().query
        )()
        context.providerStakeThreshold = new BN((await promiseStakeDefault).toNumber())
    })

    afterEach(async ({ env }): Promise<void> => {
        if (env && 'db' in env) await env.db?.close()
    })

    const commitmentCount = 50

    test(`Batches ~${commitmentCount} commitments on-chain`, async ({ env, pairType, ss58Format }) => {
        if (env.db) {
            const providerAccount = await getUser(env, AccountKey.providersWithStakeAndDataset)

            await env.changeSigner(
                await getPair(undefined, accountMnemonic(providerAccount), undefined, pairType, ss58Format)
            )
            // contract API must be initialized with an account that has funds or the error StorageDepositLimitExhausted
            // will be thrown when trying to batch commitments
            const contractApi = await env.getContractApi()
            // Remove any existing commitments and solutions from the db
            // FIXME - deleting these can mess with other tests since they're all running asynchronously. The database
            //    instance *should* be separate for this batch file but issues have been seen in the past...
            await env.db.tables?.commitment.deleteMany({})
            await env.db.tables?.usersolution.deleteMany({})

            // Get account nonce
            const startNonce = await contractApi.api.call.accountNonceApi.accountNonce(accountAddress(providerAccount))

            // Batcher must be created with the provider account as the pair on the contractApi, otherwise the batcher
            // will fail with `ProviderDoesNotExist` error.
            const batcher = new BatchCommitmentsTask(
                env.config.batchCommit,
                await env.getContractApi(),
                env.db,
                BigInt(startNonce.toNumber()),
                env.logger
            )

            const providerTasks = await getSignedTasks(env, providerAccount)
            const providerDetails = (
                await providerTasks.contract.query.getProvider(accountAddress(providerAccount))
            ).value
                .unwrap()
                .unwrap()
            const dappAccount = await getUser(env, AccountKey.dappsWithStake)
            const randomCaptchasResult = await providerTasks.db.getRandomCaptcha(false, providerDetails.datasetId)

            if (randomCaptchasResult) {
                const unsolvedCaptcha = at(randomCaptchasResult, 0)
                const solution = [
                    at(unsolvedCaptcha.items, 0).hash || '',
                    at(unsolvedCaptcha.items, 2).hash || '',
                    at(unsolvedCaptcha.items, 3).hash || '',
                ]
                const captchaSolution: CaptchaSolution = { ...unsolvedCaptcha, solution, salt: randomAsHex() }
                const commitmentIds: string[] = []

                // Store 10 commitments in the local db
                const completedAt = (await env.getApi().rpc.chain.getBlock()).block.header.number.toNumber()
                const requestedAt = completedAt - 1
                const requestHash = 'requestHash'
                for (let count = 0; count < commitmentCount; count++) {
                    // need to submit different commits under different user accounts to avoid the commitments being
                    // trimmed by the contract when the max number of commitments per user is reached (e.g. 10 per user)
                    const dappUser = await getUser(env, AccountKey.dappUsers, false)
                    // not the real commitment id, which would be calculated as the root of a merkle tree
                    const commitmentId = randomAsHex()
                    commitmentIds.push(commitmentId)
                    const status = count % 2 === 0 ? CaptchaStatus.approved : CaptchaStatus.disapproved
                    const signer = env.keyring.addFromMnemonic(accountMnemonic(dappUser))
                    const userSignature = signer.sign(stringToHex(requestHash))
                    const commit: UserCommitmentRecord = {
                        id: commitmentId,
                        userAccount: accountAddress(dappUser),
                        providerAccount: accountAddress(providerAccount),
                        datasetId: providerDetails.datasetId.toString(),
                        dappContract: accountContract(dappAccount),
                        status,
                        requestedAt,
                        completedAt,
                        userSignature: Array.from(userSignature),
                        processed: false,
                        batched: false,
                    }
                    await providerTasks.db.storeDappUserSolution([captchaSolution], commit)
                    if (status === CaptchaStatus.approved) {
                        await providerTasks.db.approveDappUserCommitment(commitmentId)
                    }
                    await sleep(10)
                    const userSolutions = await providerTasks.db.getDappUserSolutionById(commitmentId)
                    expect(userSolutions).to.be.not.empty
                    const commitRecord = await providerTasks.db.getDappUserCommitmentById(commitmentId)
                    expect(commitRecord).to.be.not.empty
                }
                // Try to get commitments that are ready to be batched
                const commitmentsBeforeBatching = await batcher.getCommitments()

                expect(commitmentsBeforeBatching.length).to.be.equal(commitmentCount)

                // n/2 commitments should be approved and n/2 disapproved
                expect(
                    commitmentsBeforeBatching
                        .map((c) => +(c.status === CaptchaStatus.approved))
                        .reduce((prev, next) => prev + next)
                ).to.equal(Math.round(commitmentCount / 2))

                // Commit the commitments to the contract
                await batcher.run()

                // Get the batcher result from the db
                // Records should look like this in the db
                //   [
                //   {
                //       _id: ObjectId("64008a2396cccd8e0b33f5b2"),
                //       taskId: '0xa0e53b407a4f2254cc7d9626aff02c2032cf4a48898772a650d9016d880147f0',
                //       processName: 'BatchCommitment',
                //       datetime: ISODate("2023-03-02T11:36:03.077Z"),
                //       status: 'Running',
                //       __v: 0
                //   },
                //     {
                //         _id: ObjectId("64008a2596cccd8e0b33f5b7"),
                //         taskId: '0xa0e53b407a4f2254cc7d9626aff02c2032cf4a48898772a650d9016d880147f0',
                //         processName: 'BatchCommitment',
                //         datetime: ISODate("2023-03-02T11:36:05.962Z"),
                //         status: 'Completed',
                //         result: {
                //             data: {
                //                 commitmentIds: [
                //                     '0x68b0425027636a9130fae67b6cad16a3686e0ce4afd7bc01ecc2504558cbde23',
                //                     '0x38ed96eeb240c2c3b5dbb7d29fad276317b5a6bb30094ddf0b845585503dd830', ...

                const batcherResult = await env.db.getLastScheduledTaskStatus(ScheduledTaskNames.BatchCommitment)
                console.log('batcherResult', batcherResult)
                if (
                    !batcherResult ||
                    (batcherResult && !batcherResult.result) ||
                    (batcherResult && batcherResult.result && !batcherResult.result.data)
                ) {
                    expect(true).to.be.false
                }

                if (batcherResult && batcherResult.result && batcherResult.result.data) {
                    const processedCommitmentIds = batcherResult.result.data.commitmentIds
                    const processedCommitments = commitmentsBeforeBatching.filter(
                        (commitment) => processedCommitmentIds.indexOf(commitment.id.toString()) > -1
                    )

                    // Try to get unbatched commitments after batching
                    const commitmentsFromDbAfter = await env.db.getUnbatchedDappUserCommitments()

                    // Check that the number of batched commitments is equal to the number of commitments that were
                    // processed by the batcher
                    expect(commitmentsBeforeBatching.length - processedCommitments.length).to.equal(
                        commitmentsFromDbAfter.length
                    )

                    // We have to wait for batched commitments to become available on-chain
                    const waitTime = calcInterval(contractApi.api as ApiPromise).toNumber() * 2
                    env.logger.debug(`waiting ${waitTime}ms for commitments to be available on-chain`)
                    await sleep(waitTime)

                    // Check the commitments are in the contract

                    let count = 0
                    for (const commitment of processedCommitments) {
                        const approved = count % 2 === 0 ? 'Approved' : 'Disapproved'
                        env.logger.debug(`Getting commitmentId ${commitment.id} from contract`)
                        const contractCommitment = (await contractApi.query.getCommit(commitment.id)).value
                            .unwrap()
                            .unwrap()
                        expect(contractCommitment).to.be.not.empty
                        expect(contractCommitment.status).to.be.equal(approved)
                        count++
                    }
                    // Check the last batch commitment time
                    const lastBatchCommit = await providerTasks.db.getLastScheduledTaskStatus(
                        ScheduledTaskNames.BatchCommitment
                    )
                    expect(lastBatchCommit).to.be.not.empty
                    expect(lastBatchCommit!.status).to.be.equal('Completed')

                    // Expect the last batch commitment time to be within the last 10 seconds
                    if (lastBatchCommit !== undefined) {
                        expect(+Date.now() - +lastBatchCommit?.datetime).to.be.lessThan(waitTime * 2)
                    }
                }
            }
        }
    }, 24000)
})
