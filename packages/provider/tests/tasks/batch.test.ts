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
import { BatchCommitter } from '../../src/tasks/batch'
import { AccountKey, accountAddress, accountMnemonic } from '../dataUtils/DatabaseAccounts'
import { getSignedTasks, getUser } from '../mocks/accounts'
import { CaptchaSolution } from '@prosopo/datasets'
import { ScheduledTaskNames } from '../../src/types/scheduler'
import { randomAsHex } from '@polkadot/util-crypto'
import { sleep } from './tasks.test'
chai.should()
chai.use(chaiAsPromised)
const expect = chai.expect

describe('BATCH TESTS', () => {
    const mnemonic = 'unaware pulp tuna oyster tortoise judge ordinary doll maid whisper cry cat'
    const env = new MockEnvironment(mnemonic)

    before(async () => {
        await env.isReady()
    })

    after(async () => {
        await env.db?.connection?.close()
    })

    it.only('Batches commitments on-chain', async () => {
        const contractApi = await env.getContractApi()
        if (env.db) {
            console.log('getting Provider Account')
            const providerAccount = await getUser(env, AccountKey.providersWithStakeAndDataset)
            console.log('got Provider Account')
            await env.changeSigner(accountMnemonic(providerAccount))
            // Remove any existing commitments and solutions from the db
            // Note - don't do this as it messes with other tests
            // await env.db.tables?.commitment.deleteMany({})
            // await env.db.tables?.usersolution.deleteMany({})

            // Get account nonce
            const startNonce = await contractApi.api.call.accountNonceApi.accountNonce(accountAddress(providerAccount))

            // Batcher must be created with the provider account as the pair on the contractApi, otherwise the batcher
            // will fail with `ProviderDoesNotExist` error.
            const batcher = new BatchCommitter(
                env.config.batchCommit,
                await env.getContractApi(),
                env.db,
                2,
                startNonce.toNumber(),
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
                const dappUser = await getUser(env, AccountKey.dappUsers)
                // Store 10 commitments in the local db
                for (let count = 0; count < 10; count++) {
                    // not the real commitment id, which would be calculated as the root of a merkle tree
                    const commitmentId = randomAsHex()
                    commitmentIds.push(commitmentId)
                    const approved = count % 2 === 0
                    await providerTasks.db.storeDappUserSolution(
                        [captchaSolution],
                        commitmentId,
                        accountAddress(dappUser),
                        accountAddress(dappAccount),
                        providerDetails.datasetId.toString()
                    )
                    if (approved) {
                        await providerTasks.db.approveDappUserCommitment(commitmentId)
                    }
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
                expect(commitmentsFromDbBeforeBatching.length).to.be.equal(10)

                // 5 commitments should be approved and 5 disapproved
                expect(
                    commitmentsFromDbBeforeBatching.map((c) => +c.approved).reduce((prev, next) => prev + next)
                ).to.equal(5)

                // Commit the commitments to the contract
                const result = await batcher.runBatch()
                console.log(result)

                // Try to get the solutions from the db
                const solutionsFromDbAfter = (await env.db.getProcessedDappUserSolutions()).filter(
                    (solution) => commitmentIds.indexOf(solution.commitmentId) > -1
                )

                // Check the solutions are no longer in the db
                expect(solutionsFromDbAfter).to.be.empty

                // Try to get the commitments from the db
                const commitmentsFromDbAfter = (await env.db.getProcessedDappUserCommitments()).filter(
                    (commitment) => commitmentIds.indexOf(commitment.commitmentId) > -1
                )
                console.log(commitmentsFromDbAfter)

                // Check the solutions are no longer in the db
                console.log(commitmentsFromDbAfter.length, 'commitments matching the ids', commitmentIds)
                expect(commitmentsFromDbAfter).to.be.empty

                // We have to wait for batched commitments to become available on-chain
                const waitTime = 3000
                await sleep(waitTime)

                // Check the commitments are in the contract
                let count = 0
                for (const commitment of commitmentsFromDbBeforeBatching) {
                    const approved = count % 2 === 0 ? 'Approved' : 'Disapproved'
                    const contractCommitment = await contractApi.getCaptchaSolutionCommitment(commitment.commitmentId)
                    expect(contractCommitment).to.be.not.empty
                    expect(contractCommitment.status).to.be.equal(approved)
                    count++
                }
                // Check the last batch commitment time
                const lastBatchCommit = await providerTasks.db.getLastScheduledTask(ScheduledTaskNames.BatchCommitment)
                expect(lastBatchCommit).to.be.not.empty

                // Expect the last batch commitment time to be within the last 10 seconds
                if (lastBatchCommit !== undefined) {
                    expect(+Date.now() - +lastBatchCommit?.datetime).to.be.lessThan(10000 + waitTime)
                }
            }
        }
    })
})
