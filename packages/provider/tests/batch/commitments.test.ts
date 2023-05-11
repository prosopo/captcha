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

import { MockEnvironment } from '../mocks/mockenv'
import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { BatchCommitments } from '../../src/batch'
import { AccountKey } from '../dataUtils/DatabaseAccounts'
import { accountContract, getSignedTasks } from '../mocks/accounts'
import { getUser } from '../mocks/getUser'
import { CaptchaSolution, ScheduledTaskNames } from '@prosopo/types'
import { randomAsHex } from '@polkadot/util-crypto'
import { sleep } from '../tasks/tasks.test'
import { accountAddress, accountMnemonic } from '../mocks/accounts'
import { BN, BN_THOUSAND, BN_TWO, bnMin } from '@polkadot/util'
import { ApiPromise } from '@polkadot/api'
import { KeypairType } from '@polkadot/util-crypto/types'
import { getPair } from '@prosopo/common'
import { getPairType, getSs58Format } from '@prosopo/env'
chai.should()
chai.use(chaiAsPromised)
const expect = chai.expect

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

describe('BATCH TESTS', async () => {
    const mnemonic = 'unaware pulp tuna oyster tortoise judge ordinary doll maid whisper cry cat'
    const ss58Format = getSs58Format()
    const pairType = getPairType()
    const pair = await getPair(
        (process.env.PAIR_TYPE as KeypairType) || ('sr25519' as KeypairType),
        ss58Format,
        mnemonic
    )
    const env = new MockEnvironment(pair)

    before(async () => {
        await env.isReady()
    })

    after(async () => {
        await env.db?.connection?.close()
    })

    const commitmentCount = 50

    it(`Batches ~${commitmentCount} commitments on-chain`, async () => {
        if (env.db) {
            const providerAccount = await getUser(env, AccountKey.providersWithStakeAndDataset)

            await env.changeSigner(await getPair(pairType, ss58Format, accountMnemonic(providerAccount)))
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
            const batcher = new BatchCommitments(
                env.config.batchCommit,
                await env.getContractApi(),
                env.db,
                2,
                BigInt(startNonce.toNumber()),
                env.logger
            )

            const providerTasks = await getSignedTasks(env, providerAccount)
            const providerDetails = await providerTasks.contractApi.getProviderDetails(accountAddress(providerAccount))
            const dappAccount = await getUser(env, AccountKey.dappsWithStake)
            const randomCaptchasResult = await providerTasks.db.getRandomCaptcha(false, providerDetails.datasetId)

            if (randomCaptchasResult) {
                const unsolvedCaptcha = randomCaptchasResult[0]
                const solution = [
                    unsolvedCaptcha.items[0].hash || '',
                    unsolvedCaptcha.items[2].hash || '',
                    unsolvedCaptcha.items[3].hash || '',
                ]
                const captchaSolution: CaptchaSolution = { ...unsolvedCaptcha, solution, salt: randomAsHex() }
                const commitmentIds: string[] = []

                // Store 10 commitments in the local db
                for (let count = 0; count < commitmentCount; count++) {
                    // need to submit different commits under different user accounts to avoid the commitments being
                    // trimmed by the contract when the max number of commitments per user is reached (e.g. 10 per user)
                    const dappUser = await getUser(env, AccountKey.dappUsers, false)
                    // not the real commitment id, which would be calculated as the root of a merkle tree
                    const commitmentId = randomAsHex()
                    commitmentIds.push(commitmentId)
                    const approved = count % 2 === 0
                    await providerTasks.db.storeDappUserSolution(
                        [captchaSolution],
                        commitmentId,
                        accountAddress(dappUser),
                        accountContract(dappAccount),
                        providerDetails.datasetId.toString()
                    )
                    if (approved) {
                        await providerTasks.db.approveDappUserCommitment(commitmentId)
                    }
                    await sleep(10)
                    const userSolutions = await providerTasks.db.getDappUserSolutionById(commitmentId)
                    expect(userSolutions).to.be.not.empty
                }

                // Try to get commitments that are ready to be batched
                const commitmentsFromDbBeforeProcessing = (await batcher.getCommitments()).filter(
                    (solution) => commitmentIds.indexOf(solution.commitmentId) > -1
                )

                // Check the commitments are not returned from the db as they are not yet processed
                expect(commitmentsFromDbBeforeProcessing).to.be.empty

                // Mark the commitments as processed
                await providerTasks.db.flagUsedDappUserCommitments(commitmentIds)
                await providerTasks.db.flagUsedDappUserSolutions(commitmentIds)

                // Check the commitments are returned from the db as they are now processed
                const commitmentsFromDbBeforeBatching = (await batcher.getCommitments()).filter(
                    (solution) => commitmentIds.indexOf(solution.commitmentId) > -1
                )
                expect(commitmentsFromDbBeforeBatching.length).to.be.equal(commitmentCount)

                // n/2 commitments should be approved and n/2 disapproved
                expect(
                    commitmentsFromDbBeforeBatching.map((c) => +c.approved).reduce((prev, next) => prev + next)
                ).to.equal(Math.round(commitmentCount / 2))

                // Commit the commitments to the contract
                await batcher.runBatch()

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

                const batcherResult = await env.db.getLastScheduledTask(ScheduledTaskNames.BatchCommitment)
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
                    const processedCommitments = commitmentsFromDbBeforeBatching.filter(
                        (commitment) => processedCommitmentIds.indexOf(commitment.commitmentId) > -1
                    )

                    // Try to get the solutions from the db
                    const solutionsFromDbAfter = (await env.db.getProcessedDappUserSolutions()).filter(
                        (solution) => processedCommitmentIds.indexOf(solution.commitmentId) === -1
                    )

                    // Check the processed solutions are no longer in the db
                    expect(solutionsFromDbAfter).to.be.empty

                    // Try to get the commitments from the db
                    const commitmentsFromDbAfter = (await env.db.getProcessedDappUserCommitments()).filter(
                        (commitment) => processedCommitmentIds.indexOf(commitment.commitmentId) === -1
                    )

                    // Check the processed commitments are no longer in the db
                    // console.log('commitmentsFromDbAfter.length', commitmentsFromDbAfter.length)
                    // console.log('processedCommitmentIds.length', processedCommitmentIds.length)
                    // console.log(
                    //     'commitmentsFromDbBeforeBatching.length - processedCommitmentIds.length',
                    //     commitmentsFromDbBeforeBatching.length - processedCommitmentIds.length
                    // )
                    expect(commitmentsFromDbAfter.length).to.equal(
                        commitmentsFromDbBeforeBatching.length - processedCommitmentIds.length
                    )

                    // We have to wait for batched commitments to become available on-chain
                    const waitTime = calcInterval(contractApi.api as ApiPromise).toNumber() * 2
                    env.logger.debug(`waiting ${waitTime}ms for commitments to be available on-chain`)
                    await sleep(waitTime)

                    // Check the commitments are in the contract

                    let count = 0
                    for (const commitment of processedCommitments) {
                        const approved = count % 2 === 0 ? 'Approved' : 'Disapproved'
                        env.logger.debug(`Getting commitmentId ${commitment.commitmentId} from contract`)
                        const contractCommitment = await contractApi.getCaptchaSolutionCommitment(
                            commitment.commitmentId
                        )
                        expect(contractCommitment).to.be.not.empty
                        expect(contractCommitment.status).to.be.equal(approved)
                        count++
                    }
                    // Check the last batch commitment time
                    const lastBatchCommit = await providerTasks.db.getLastScheduledTask(
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
    })
})
