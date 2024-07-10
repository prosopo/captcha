// Copyright 2021-2024 Prosopo (UK) Ltd.
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
import { ApiPromise } from '@polkadot/api/promise/Api'
import { BN, BN_THOUSAND, BN_TWO, bnMin } from '@polkadot/util/bn'
import { BatchCommitmentsTask } from '../../batch/commitments.js'
import {
    CaptchaMerkleTree,
    computeCaptchaSolutionHash,
    computePendingRequestHash,
    datasetWithSolutionHashes,
} from '@prosopo/datasets'
import { CaptchaSolution, DappUserSolutionResult } from '@prosopo/types'
import { CaptchaStatus, Commit, DappPayee, Payee } from '@prosopo/captcha-contract/types-returns'
import { ContractDeployer, getCurrentBlockNumber, getPairAsync, wrapQuery } from '@prosopo/contract'
import { DappAbiJSON, DappWasm } from '../dataUtils/dapp-example-contract/loadFiles.js'
import { EventRecord } from '@polkadot/types/interfaces'
import { MockEnvironment, ProviderEnvironment } from '@prosopo/env'
import { PROVIDER, accountAddress, accountContract, accountMnemonic, getSignedTasks } from '../accounts.js'
import { ProsopoContractError, ProsopoEnvError, hexHash, i18n } from '@prosopo/common'
import { ReturnNumber } from '@prosopo/typechain-types'
import { ScheduledTaskNames } from '@prosopo/types'
import { UserCommitmentRecord } from '@prosopo/types-database'
import { ViteTestContext } from '@prosopo/env'
import { assert, beforeEach, describe, expect, test } from 'vitest'
import { at, get } from '@prosopo/util'
import { datasetWithIndexSolutions } from '@prosopo/datasets'
import { getDispatchError } from '@prosopo/tx'
import { getSendAmount, getStakeAmount, sendFunds } from '../dataUtils/funds.js'
import { getTestConfig } from '@prosopo/config'
import { getUser } from '../getUser.js'
import { parseBlockNumber } from '../../index.js'
import { randomAsHex } from '@polkadot/util-crypto/random'
import { signatureVerify } from '@polkadot/util-crypto/signature'
import { sleep } from '@prosopo/util'
import { stringToHex, stringToU8a } from '@polkadot/util/string'
import { u8aToHex } from '@polkadot/util/u8a'

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

const PROVIDER_PAYEE = Payee.dapp
declare module 'vitest' {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    export interface TestContext extends ViteTestContext {}
}

describe.sequential('CONTRACT TASKS', async function (): Promise<void> {
    beforeEach(async function (context) {
        const config = getTestConfig()
        const network = config.networks[config.defaultNetwork]
        const alicePair = await getPairAsync(network, '//Alice')
        const env = new MockEnvironment(getTestConfig(), alicePair)
        try {
            await env.isReady()
        } catch (e) {
            throw new ProsopoEnvError(e as Error)
        }
        context.env = env
        const promiseStakeDefault: Promise<ReturnNumber> = wrapQuery(
            context.env.getContractInterface().query.getProviderStakeThreshold,
            context.env.getContractInterface().query
        )()

        const dappStakeDefault: Promise<ReturnNumber> = wrapQuery(
            context.env.getContractInterface().query.getDappStakeThreshold,
            context.env.getContractInterface().query
        )()
        context.providerStakeThreshold = (await promiseStakeDefault).rawNumber
        context.dappStakeThreshold = (await promiseStakeDefault).rawNumber
        return () => {
            env.db?.close()
        }
    })

    const commitmentCount = 50

    test(`Batches ~${commitmentCount} commitments on-chain`, async ({ env }) => {
        const providerAccount = await getUser(env, AccountKey.providersWithStakeAndDataset)

        await env.changeSigner(
            await getPairAsync(env.config.networks[env.config.defaultNetwork], accountMnemonic(providerAccount), '')
        )
        // contract API must be initialized with an account that has funds or the error StorageDepositLimitExhausted
        // will be thrown when trying to batch commitments
        const contractApi = await env.getContractApi()
        // Remove any existing commitments and solutions from the db
        // FIXME - deleting these can mess with other tests since they're all running asynchronously. The database
        //    instance *should* be separate for this batch file but issues have been seen in the past...
        await env.getDb().getTables().commitment.deleteMany({})
        await env.getDb().getTables().usersolution.deleteMany({})

        // Get account nonce
        const startNonce = await contractApi.api.call.accountNonceApi.accountNonce(accountAddress(providerAccount))

        // Batcher must be created with the provider account as the pair on the contractApi, otherwise the batcher
        // will fail with `ProviderDoesNotExist` error.
        const batcher = new BatchCommitmentsTask(
            env.config.batchCommit,
            await env.getContractApi(),
            env.getDb(),
            BigInt(startNonce.toNumber()),
            env.logger
        )

        const providerTasks = await getSignedTasks(env, providerAccount)
        const providerDetails = (await providerTasks.contract.query.getProvider(accountAddress(providerAccount))).value
            .unwrap()
            .unwrap()
        const dappAccount = await getUser(env, AccountKey.dappsWithStake)
        const randomCaptchasResult = await providerTasks.db.getRandomCaptcha(true, providerDetails.datasetId)

        if (randomCaptchasResult) {
            const solutions = await providerTasks.db.getSolutions(providerDetails.datasetId.toString())
            const solutionIndex = solutions.findIndex(
                (s) => s.captchaContentId === at(randomCaptchasResult, 0).captchaContentId
            )
            const solution = at(solutions, solutionIndex).solution
            const unsolvedCaptcha = at(randomCaptchasResult, 0)
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
                const requestedAtTimestamp = Date.now()
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
                    stored: false,
                    requestedAtTimestamp,
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

            const batcherResult = await env.getDb().getLastScheduledTaskStatus(ScheduledTaskNames.BatchCommitment)
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
                const commitmentsFromDbAfter = await env.getDb().getUnbatchedDappUserCommitments()

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
    }, 120000)

    /** Gets some static solved captchas and constructions captcha solutions from them
     *  Computes the request hash for these captchas and the dappUser and then stores the request hash in the mock db
     *  @return {CaptchaSolution[], string} captchaSolutions and requestHash
     */
    async function createMockCaptchaSolutionsAndRequestHash(env: ProviderEnvironment) {
        // There must exist a dappUser who can receive a captcha
        const dappUserAccount = await getUser(env, AccountKey.dappUsers)
        // There must exist a provider with a dataset for us to get a random dataset with solutions
        const providerAccount = await getUser(env, AccountKey.providersWithStakeAndDataset)
        // There must exist a dapp that is staked who can use the service
        const dappContractAccount = await getUser(env, AccountKey.dappsWithStake)
        const tasks = await getSignedTasks(env, providerAccount)
        const providerDetails = (await tasks.contract.query.getProvider(accountAddress(providerAccount))).value
            .unwrap()
            .unwrap()
        //await sleep(132000)
        const solvedCaptchas = await env
            .getDb()
            .getRandomSolvedCaptchasFromSingleDataset(providerDetails.datasetId.toString(), 2)
        const network = env.config.networks[env.config.defaultNetwork]
        const pair = await getPairAsync(network, accountMnemonic(dappUserAccount), '')
        await env.changeSigner(pair)

        const userSalt = randomAsHex()
        const captchaSolutions: CaptchaSolution[] = solvedCaptchas.map((captcha) => ({
            captchaId: captcha.captchaId,
            salt: userSalt,
            solution: captcha.solution,
            captchaContentId: captcha.captchaContentId,
        }))
        const pendingRequestSalt = randomAsHex()
        const requestHash = computePendingRequestHash(
            captchaSolutions.map((c) => c.captchaId),
            accountAddress(dappUserAccount),
            pendingRequestSalt
        )

        const blockNumber = await getCurrentBlockNumber(env.getApi())

        if ('storeDappUserPending' in env.getDb()) {
            await env
                .getDb()
                .storeDappUserPending(
                    hexHash(accountAddress(dappUserAccount)),
                    requestHash,
                    pendingRequestSalt,
                    99999999999999,
                    blockNumber
                )
        }
        const signer = env.keyring.addFromMnemonic(accountMnemonic(dappUserAccount))
        const userSignature = signer.sign(stringToHex(requestHash))
        signatureVerify(stringToHex(requestHash), userSignature, accountAddress(dappUserAccount))

        const timestamp = Date.now().toString()
        const signedTimestamp = u8aToHex(signer.sign(stringToHex(timestamp)))

        return {
            dappUserAccount,
            captchaSolutions,
            requestHash,
            providerAccount,
            dappContractAccount,
            userSalt,
            userSignature,
            blockNumber,
            timestamp,
            signedTimestamp,
        }
    }

    test('Provider registration', async function ({ env, providerStakeThreshold }) {
        const providerAccount = env.createAccountAndAddToKeyring() || ['', '']
        const tasks = await getSignedTasks(env, providerAccount)
        const stakeAmount = getStakeAmount(env, providerStakeThreshold)
        const sendAmount = getSendAmount(env, stakeAmount)
        await sendFunds(env, providerAccount.address, 'ProsopoPayee', sendAmount)

        const queryResult = await tasks.contract.query.providerRegister(
            Array.from(stringToU8a(PROVIDER.url + randomAsHex().slice(0, 8))),
            PROVIDER.fee,
            PROVIDER_PAYEE
        )
        if (queryResult.value.err) {
            throw new Error(queryResult.value.err)
        }

        if (queryResult.value.ok?.err) {
            throw new Error(queryResult.value.ok.err)
        }

        const result = await tasks.contract.tx.providerRegister(
            Array.from(stringToU8a(PROVIDER.url + randomAsHex().slice(0, 8))),
            PROVIDER.fee,
            PROVIDER_PAYEE
        )
        console.log(JSON.stringify(result.error, null, 4))
        expect(result?.error).to.be.undefined
    })

    test('Provider update', async ({ env, providerStakeThreshold }): Promise<void> => {
        const providerAccount = await getUser(env, AccountKey.providers)
        const tasks = await getSignedTasks(env, providerAccount)

        const value = providerStakeThreshold
        const result = (
            await tasks.contract.tx.providerUpdate(
                Array.from(stringToU8a(PROVIDER.url + randomAsHex().slice(0, 8))),
                PROVIDER.fee,
                PROVIDER_PAYEE,
                { value }
            )
        ).result
        if (result?.isError && result?.dispatchError) {
            const dispatchError = getDispatchError(result?.dispatchError)
            throw new ProsopoContractError(new Error(dispatchError))
        }
        expect(result?.isError).to.be.false
    })

    test('Provider add dataset', async ({ env }): Promise<void> => {
        const providerAccount = await getUser(env, AccountKey.providersWithStake)

        const tasks = await getSignedTasks(env, providerAccount)

        await tasks.providerSetDatasetFromFile(JSON.parse(JSON.stringify(datasetWithIndexSolutions)))
    })

    test('Provider add dataset with too few captchas will fail', async ({ env }): Promise<void> => {
        const providerAccount = await getUser(env, AccountKey.providersWithStake)

        const tasks = await getSignedTasks(env, providerAccount)

        // copy captchaData and remove all but one captcha
        const dataset = { ...datasetWithIndexSolutions }
        dataset.captchas = dataset.captchas.slice(0, 1)
        try {
            await tasks.providerSetDatasetFromFile(JSON.parse(JSON.stringify(dataset)))
        } catch (e) {
            expect(e).to.match(/Number of captchas in dataset is less than configured number of captchas/)
        }
    })

    test('Provider add dataset with too few solutions will fail', async ({ env }): Promise<void> => {
        const providerAccount = await getUser(env, AccountKey.providersWithStake)

        const tasks = await getSignedTasks(env, providerAccount)

        const dataset = { ...datasetWithIndexSolutions }
        // remove solution field from each captcha
        dataset.captchas = dataset.captchas.map((captcha) => {
            const { solution, ...rest } = captcha
            return rest as any
        })
        try {
            await tasks.providerSetDatasetFromFile(JSON.parse(JSON.stringify(dataset)))
        } catch (e) {
            expect(e).to.match(/Number of solutions in dataset is less than configured number of solutions/)
        }
    })

    test('Inactive Provider cannot add dataset', async ({ env }): Promise<void> => {
        const providerAccount = await getUser(env, AccountKey.providers)

        const tasks = await getSignedTasks(env, providerAccount)

        try {
            await tasks.providerSetDatasetFromFile(JSON.parse(JSON.stringify(datasetWithIndexSolutions)))
        } catch (e) {
            expect(e).to.match(/ProviderInactive/)
        }
    })

    test('Provider approve', async ({ env }): Promise<void> => {
        const { dappUserAccount, captchaSolutions, providerAccount, dappContractAccount, userSignature } =
            await createMockCaptchaSolutionsAndRequestHash(env)
        const tasks = await getSignedTasks(env, dappUserAccount)
        const salt = randomAsHex()
        const tree = new CaptchaMerkleTree()
        const captchaSolutionsSalted = captchaSolutions.map((captcha) => ({
            ...captcha,
            salt: salt,
        }))
        const captchasHashed = captchaSolutionsSalted.map((captcha) => computeCaptchaSolutionHash(captcha))
        tree.build(captchasHashed)
        const commitmentId = tree.root!.hash

        const provider = (await tasks.contract.query.getProvider(accountAddress(providerAccount))).value
            .unwrap()
            .unwrap()
        const completedAt = (await env.getApi().rpc.chain.getBlock()).block.header.number.toNumber()
        const requestedAt = completedAt - 1
        const providerTasks = await getSignedTasks(env, providerAccount)
        const commit: Commit = {
            dappContract: accountContract(dappContractAccount),
            datasetId: provider.datasetId,
            id: commitmentId,
            providerAccount: accountAddress(providerAccount),
            userAccount: accountAddress(dappUserAccount),
            status: CaptchaStatus.approved,
            requestedAt,
            completedAt,
            userSignature: [...userSignature],
        }
        const queryResult = await providerTasks.contract.query.providerCommit(commit)
        if (queryResult.value.err) {
            throw new Error(queryResult.value.err)
        }
        const result = await providerTasks.contract.tx.providerCommit(commit)
        if (result.result?.isError && result.result?.dispatchError) {
            const dispatchError = getDispatchError(result.result?.dispatchError)
            throw new ProsopoContractError(new Error(dispatchError))
        }
        expect(result.result?.isError).to.be.false
        if (result.error) {
            throw new ProsopoContractError(result.error.message)
        }
    })

    test('Provider disapprove', async ({ env }): Promise<void> => {
        const { dappUserAccount, captchaSolutions, providerAccount, dappContractAccount, userSignature } =
            await createMockCaptchaSolutionsAndRequestHash(env)

        const tasks = await getSignedTasks(env, dappUserAccount)

        const salt = randomAsHex()

        const tree = new CaptchaMerkleTree()

        const captchaSolutionsSalted = captchaSolutions.map((captcha) => ({
            ...captcha,
            salt: salt,
        }))
        const captchasHashed = captchaSolutionsSalted.map((captcha) => computeCaptchaSolutionHash(captcha))

        tree.build(captchasHashed)
        const commitmentId = tree.root!.hash

        const provider = (await tasks.contract.query.getProvider(accountAddress(providerAccount))).value
            .unwrap()
            .unwrap()

        const completedAt = (await env.getApi().rpc.chain.getBlock()).block.header.number.toNumber()
        const requestedAt = completedAt - 1
        const providerTasks = await getSignedTasks(env, providerAccount)
        await providerTasks.contract.tx.providerCommit({
            dappContract: accountContract(dappContractAccount),
            datasetId: provider.datasetId.toString(),
            id: commitmentId,
            providerAccount: accountAddress(providerAccount),
            userAccount: accountAddress(dappUserAccount),
            status: CaptchaStatus.disapproved,
            requestedAt,
            completedAt,
            userSignature: [...userSignature],
        })
    })

    test('Timestamps check', async ({ env }): Promise<void> => {
        const salt = randomAsHex()

        const tree = new CaptchaMerkleTree()

        const { dappUserAccount, captchaSolutions, providerAccount, dappContractAccount, userSignature } =
            await createMockCaptchaSolutionsAndRequestHash(env)

        const tasks = await getSignedTasks(env, dappUserAccount)

        const captchaSolutionsSalted = captchaSolutions.map((captcha) => ({
            ...captcha,
            salt: salt,
        }))
        const captchasHashed = captchaSolutionsSalted.map((captcha) => computeCaptchaSolutionHash(captcha))

        tree.build(captchasHashed)
        const commitmentId = tree.root!.hash

        const provider = (await tasks.contract.query.getProvider(accountAddress(providerAccount))).value
            .unwrap()
            .unwrap()

        const completedAt = (await env.getApi().rpc.chain.getBlock()).block.header.number.toNumber()
        const requestedAt = completedAt - 1
        const providerTasks = await getSignedTasks(env, providerAccount)
        await providerTasks.contract.tx.providerCommit({
            dappContract: accountContract(dappContractAccount),
            datasetId: provider.datasetId.toString(),
            id: commitmentId,
            providerAccount: accountAddress(providerAccount),
            userAccount: accountAddress(dappUserAccount),
            status: CaptchaStatus.approved,
            completedAt,
            requestedAt,
            userSignature: [...userSignature],
        })

        const commitment = (await providerTasks.contract.query.getCommit(commitmentId)).value.unwrap().unwrap()

        // check the timestamp
        const completedAtCheck = parseInt(commitment.completedAt.toString().replace(',', ''))

        expect(completedAtCheck).to.be.above(0)

        // check how much time passed after successful completion
        const lastCorrectCaptcha = (
            await providerTasks.contract.query.dappOperatorLastCorrectCaptcha(accountAddress(dappUserAccount))
        ).value
            .unwrap()
            .unwrap()

        expect(Number.parseInt(lastCorrectCaptcha.before.toString())).to.be.above(0)
    })

    test('Provider details', async ({ env }): Promise<void> => {
        try {
            const providerAccount = await getUser(env, AccountKey.providersWithStakeAndDataset)
            const tasks = await getSignedTasks(env, providerAccount)

            const result = (await tasks.contract.query.getProvider(accountAddress(providerAccount))).value
                .unwrap()
                .unwrap()
            expect(result).to.have.a.property('status')
        } catch (err) {
            throw new ProsopoEnvError(err as Error)
        }
    })

    test('Provider accounts', async ({ env }): Promise<void> => {
        const providerAccount = await getUser(env, AccountKey.providersWithStakeAndDataset)

        const tasks = await getSignedTasks(env, providerAccount)

        const result = (await tasks.contract.query.getAllProviderAccounts()).value.unwrap().unwrap()

        expect(result).to.be.an('array')
    })

    test('Dapp registration', async ({ env, providerStakeThreshold, dappStakeThreshold }): Promise<void> => {
        const newAccount = env.createAccountAndAddToKeyring() || ['', '']
        const tasks = await getSignedTasks(env, newAccount)
        const stakeAmount = getStakeAmount(env, providerStakeThreshold)
        const sendAmount = getSendAmount(env, stakeAmount)
        await sendFunds(env, accountAddress(newAccount), 'Dapp', sendAmount)
        const dappParams = ['1000000000000000000', 1000, env.getContractInterface().address, 65, 1000000]

        if (!env.pair) {
            throw new ProsopoContractError('CONTRACT.SIGNER_UNDEFINED')
        }
        const deployer = new ContractDeployer(
            env.getApi(),
            await DappAbiJSON(),
            await DappWasm(),
            env.pair,
            dappParams,
            0,
            0,
            randomAsHex()
        )
        const deployResult = await deployer.deploy()
        const instantiateEvent: EventRecord | undefined = deployResult.events.find(
            (event) => event.event.section === 'contracts'
        )
        const contractAddress = String(get(instantiateEvent?.event.data, 'contract'))
        const result = (await tasks.contract.tx.dappRegister(contractAddress, DappPayee.dapp)).result
        expect(result?.isError).to.be.false
        const dapp = (await tasks.contract.query.getDapp(contractAddress)).value.unwrap().unwrap()
        expect(dapp.owner).to.equal(accountAddress(newAccount))
    })

    test('Dapp is active', async ({ env }): Promise<void> => {
        const dappAccount = await getUser(env, AccountKey.dappsWithStake)

        const tasks = await getSignedTasks(env, dappAccount)

        const result: any = await tasks.dappIsActive(accountContract(dappAccount))

        expect(result).to.equal(true)
    })

    test('Dapp details', async ({ env }): Promise<void> => {
        const dappAccount = await getUser(env, AccountKey.dapps)

        const tasks = await getSignedTasks(env, dappAccount)

        const result: any = (await tasks.contract.query.getDapp(accountContract(dappAccount))).value.unwrap().unwrap()

        expect(result).to.have.a.property('status')
    })

    test('Dapp fund', async ({ env, dappStakeThreshold }): Promise<void> => {
        const dappAccount = await getUser(env, AccountKey.dappsWithStake)
        const tasks = await getSignedTasks(env, dappAccount)
        const dappContractAddress = accountContract(dappAccount)
        const dappBefore = (await tasks.contract.query.getDapp(dappContractAddress)).value.unwrap().unwrap()
        const result = (await tasks.contract.tx.dappFund(dappContractAddress, { value: dappStakeThreshold })).result
        expect(result?.isError).to.be.false
        const dappAfter = (await tasks.contract.query.getDapp(dappContractAddress)).value.unwrap().unwrap()
        expect(dappBefore.balance.rawNumber.add(dappStakeThreshold).toString()).to.equal(
            dappAfter.balance.rawNumber.toString()
        )
    })

    test('Captchas are correctly formatted before being passed to the API layer', async ({ env }): Promise<void> => {
        const dappUserAccount = await getUser(env, AccountKey.dappUsers)
        const providerAccount = await getUser(env, AccountKey.providersWithStakeAndDataset)

        const dappUserTasks = await getSignedTasks(env, dappUserAccount)
        const provider = (await dappUserTasks.contract.query.getProvider(accountAddress(providerAccount))).value
            .unwrap()
            .unwrap()

        const captchas = await dappUserTasks.getCaptchaWithProof(provider.datasetId.toString(), true, 1)

        expect(captchas[0]).to.have.nested.property('captcha.captchaId')
        expect(captchas[0]).to.have.nested.property('captcha.datasetId', provider.datasetId.toString())
        expect(captchas[0]).to.have.property('proof')
        expect(captchas[0]).to.not.have.property('solution')
        expect(captchas[0]).to.not.have.nested.property('captcha.solution')
    })

    test('Captcha proofs are returned if commitment found and solution is correct', async ({ env }): Promise<void> => {
        // Construct a pending request hash between dappUserAccount, providerAccount and dappContractAccount
        const {
            captchaSolutions,
            requestHash,
            dappUserAccount,
            providerAccount,
            dappContractAccount,
            userSignature,
            timestamp,
            signedTimestamp,
        } = await createMockCaptchaSolutionsAndRequestHash(env)

        const dappUserTasks = await getSignedTasks(env, dappUserAccount)

        const tree = new CaptchaMerkleTree()
        const captchaSolutionsSalted = captchaSolutions
        const captchasHashed = captchaSolutionsSalted.map((captcha) => computeCaptchaSolutionHash(captcha))

        tree.build(captchasHashed)
        const commitmentId = tree.root!.hash

        const provider = (await dappUserTasks.contract.query.getProvider(accountAddress(providerAccount))).value
            .unwrap()
            .unwrap()

        const completedAt = (await env.getApi().rpc.chain.getBlock()).block.header.number.toNumber()
        const requestedAt = completedAt - 1
        // next part contains internal contract calls that must be run by provider
        const providerTasks = await getSignedTasks(env, providerAccount)
        await providerTasks.contract.tx.providerCommit({
            dappContract: accountContract(dappContractAccount),
            datasetId: provider.datasetId.toString(),
            id: commitmentId,
            providerAccount: accountAddress(providerAccount),
            userAccount: accountAddress(dappUserAccount),
            status: CaptchaStatus.approved,
            completedAt,
            requestedAt,
            userSignature: [...userSignature],
        })

        const commitment = (await providerTasks.contract.query.getCommit(commitmentId)).value.unwrap().unwrap()

        // next part contains internal contract calls that must be run by provider
        await env.getApi().rpc.chain.getBlockHash(commitment.completedAt)
        const result: DappUserSolutionResult = await providerTasks.dappUserSolution(
            accountAddress(dappUserAccount),
            accountContract(dappContractAccount),
            requestHash,
            JSON.parse(JSON.stringify(captchaSolutionsSalted)),
            u8aToHex(userSignature),
            timestamp,
            signedTimestamp
        )
        expect(result.captchas.length).to.be.eq(2)
        const expectedProof = tree.proof(at(captchaSolutionsSalted, 0).captchaId)
        const filteredResult = at(
            result.captchas.filter((res) => res.captchaId == at(captchaSolutionsSalted, 0).captchaId),
            0
        )
        expect(filteredResult.proof).to.deep.eq(expectedProof)
        expect(filteredResult.captchaId).to.eq(at(captchaSolutionsSalted, 0).captchaId)
    })

    // test('Dapp User sending an invalid captchas causes error', async ({env}): Promise<void> => {
    //     const { requestHash } = await createMockCaptchaSolutionsAndRequestHash( env, pairType, ss58Format );
    //
    //     await env.getContractInterface()!.changeSigner(env,  provider.mnemonic as string);
    //     const providerTasks = new Tasks(env);
    //     const captchaSolutions = [
    //         { captchaId: 'blah', solution: [21], salt: 'blah' }
    //     ];
    //     const tree = new CaptchaMerkleTree();
    //     const captchasHashed = captchaSolutions.map((captcha) =>
    //         computeCaptchaSolutionHash(captcha)
    //     );
    //
    //     tree.build(captchasHashed);
    //     const solutionPromise = providerTasks.dappUserSolution(
    //         dappUser.address,
    //         dapp.contractAccount as string,
    //         requestHash,
    //         JSON.parse(JSON.stringify(captchaSolutions)) as JSON
    //     );
    //
    //     solutionPromise.catch((e) =>
    //         e.message.should.match(`/${ERRORS.CAPTCHA.INVALID_CAPTCHA_ID.message}/`)
    //     );
    // });
    //
    // test('Dapp User sending solutions without committing to blockchain causes error', async ({env}): Promise<void> => {
    //     const { captchaSolutions, requestHash } = await createMockCaptchaSolutionsAndRequestHash( env, pairType, ss58Format );
    //
    //     await env.getContractInterface()!.changeSigner(env,  provider.mnemonic as string);
    //     const providerTasks = new Tasks(env);
    //     const tree = new CaptchaMerkleTree();
    //     const captchasHashed = captchaSolutions.map((captcha) =>
    //         computeCaptchaSolutionHash(captcha)
    //     );
    //
    //     tree.build(captchasHashed);
    //     const solutionPromise = providerTasks.dappUserSolution(
    //         dappUser.address,
    //         dapp.contractAccount as string,
    //         requestHash,
    //         JSON.parse(JSON.stringify(captchaSolutions)) as JSON
    //     );
    //
    //     solutionPromise.catch((e) =>
    //         e.message.should.match(
    //             `/${ERRORS.CONTRACT.CAPTCHA_SOLUTION_COMMITMENT_DOES_NOT_EXIST.message}/`
    //         )
    //     );
    // });
    //
    // test('No proofs are returned if commitment found and solution is incorrect', async ({env}): Promise<void> => {
    //     const { captchaSolutions, requestHash } = await createMockCaptchaSolutionsAndRequestHash( env, pairType, ss58Format );
    //     const captchaSolutionsBad = captchaSolutions.map((original) => ({
    //         ...original,
    //         solution: [3]
    //     }));
    //     const tree = new CaptchaMerkleTree();
    //     const salt = randomAsHex();
    //     // Have to salt the solutions with random salt each time otherwise we end up with the same commitment for
    //     // multiple users
    //     const captchaSolutionsSalted = captchaSolutionsBad.map((captcha) => ({
    //         ...captcha,
    //         salt: salt
    //     }));
    //     const solutionsHashed = captchaSolutionsSalted.map((captcha) =>
    //         computeCaptchaSolutionHash(captcha)
    //     );
    //
    //     tree.build(solutionsHashed);
    //     const commitmentId = tree.root!.hash;
    //
    //     await env.getContractInterface()!.changeSigner(env,  dappUser.mnemonic);
    //     const dappUserTasks = new Tasks(env);
    //
    //     await ,dappUserTasks.contractApi.dappUserCommtest(
    //         dapp.contractAccount as string,
    //         datasetId as string,
    //         commitmentId,
    //         provider.address as string
    //     );
    //     // next part contains internal contract calls that must be run by provider
    //     await env.getContractInterface()!.changeSigner(env,  provider.mnemonic as string);
    //     const providerTasks = new Tasks(env);
    //     const result = await providerTasks.dappUserSolution(
    //         dappUser.address,
    //         dapp.contractAccount as string,
    //         requestHash,
    //         JSON.parse(JSON.stringify(captchaSolutionsSalted)) as JSON
    //     );
    //
    //     expect(result!.length).to.be.eq(0);
    // });

    test('Validates the received captchas length', async ({ env }): Promise<void> => {
        const providerAccount = await getUser(env, AccountKey.providersWithStakeAndDataset)

        const { captchaSolutions } = await createMockCaptchaSolutionsAndRequestHash(env)

        const providerTasks = await getSignedTasks(env, providerAccount)

        // All of the captchaIds present in the solutions should be in the database
        try {
            await providerTasks.validateReceivedCaptchasAgainstStoredCaptchas(captchaSolutions)
        } catch (e) {
            assert.fail('Should not throw')
        }
    })

    test('Builds the tree and gets the commitment', async ({ env }): Promise<void> => {
        try {
            const { captchaSolutions, dappUserAccount, userSignature } =
                await createMockCaptchaSolutionsAndRequestHash(env)

            const dappAccount = await getUser(env, AccountKey.dappsWithStake)

            const tasks = await getSignedTasks(env, dappUserAccount)

            const initialTree = new CaptchaMerkleTree()
            const captchasHashed = captchaSolutions.map((captcha) => computeCaptchaSolutionHash(captcha))

            initialTree.build(captchasHashed)
            const initialCommitmentId = initialTree.root!.hash

            const providerAccount = await getUser(env, AccountKey.providersWithStakeAndDataset)

            const provider = (await tasks.contract.query.getProvider(accountAddress(providerAccount))).value
                .unwrap()
                .unwrap()
            const providerTasks = await getSignedTasks(env, providerAccount)
            const completedAt = (await env.getApi().rpc.chain.getBlock()).block.header.number.toNumber()
            const requestedAt = completedAt - 1
            const commit: Commit = {
                dappContract: accountContract(dappAccount),
                datasetId: provider.datasetId.toString(),
                id: initialCommitmentId,
                providerAccount: accountAddress(providerAccount),
                userAccount: accountAddress(dappUserAccount),
                status: CaptchaStatus.approved,
                completedAt,
                requestedAt,
                userSignature: [...userSignature],
            }
            const queryResult = await providerTasks.contract.query.providerCommit(commit)
            const error: string | undefined = queryResult.value.err || queryResult.value.ok?.err
            if (error) {
                throw new Error(error)
            }
            const result = (await providerTasks.contract.tx.providerCommit(commit)).result
            expect(result?.isError).to.be.false
            const { commitmentId, tree } = await tasks.buildTreeAndGetCommitmentId(captchaSolutions)

            expect(tree).to.deep.equal(initialTree)
            expect(commitmentId).to.equal(initialCommitmentId)
            const commitment: Commit = await wrapQuery(
                tasks.contract.query.getCommit,
                tasks.contract.query
            )(commitmentId)
            expect(commitment).to.not.be.undefined
        } catch (e) {
            console.log(e)
            throw e
        }
    })

    test('BuildTreeAndGetCommitment throws if commitment does not exist', async ({ env }): Promise<void> => {
        const { captchaSolutions, dappUserAccount } = await createMockCaptchaSolutionsAndRequestHash(env)

        const tasks = await getSignedTasks(env, dappUserAccount)

        const salt = randomAsHex()
        const captchaSolutionsSalted = captchaSolutions.map((captcha) => ({
            ...captcha,
            salt: salt,
        }))
        const commitmentPromise = tasks.buildTreeAndGetCommitmentId(captchaSolutionsSalted)

        commitmentPromise.catch((e: Error) =>
            e.message.should.match(new RegExp(i18n.t('CONTRACT.CAPTCHA_SOLUTION_COMMITMENT_DOES_NOT_EXIST')))
        )
    })

    test('Validates the Dapp User Solution Request is Pending', async ({ env }): Promise<void> => {
        const { dappUserAccount, captchaSolutions, blockNumber } = await createMockCaptchaSolutionsAndRequestHash(env)

        const tasks = await getSignedTasks(env, dappUserAccount)

        const pendingRequestSalt = randomAsHex()
        const captchaIds = captchaSolutions.map((c) => c.captchaId)

        const requestHash = computePendingRequestHash(captchaIds, accountAddress(dappUserAccount), pendingRequestSalt)

        await env
            .getDb()
            .storeDappUserPending(
                hexHash(accountAddress(dappUserAccount)),
                requestHash,
                pendingRequestSalt,
                99999999999999,
                blockNumber
            )
        const pendingRecord = await env.getDb().getDappUserPending(requestHash)
        const valid = await tasks.validateDappUserSolutionRequestIsPending(
            requestHash,
            pendingRecord,
            accountAddress(dappUserAccount),
            captchaIds
        )

        expect(valid).to.be.true
    })

    test('Get random captchas and request hash', async ({ env }): Promise<void> => {
        try {
            // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
            // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
            // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
            // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
            // NOTE this test can fail if the contract contains Providers that
            // are not present in the database. It can also fail if the contract
            // contains providers that have loaded a different dataset to the
            // one imported from captchasData (above)
            // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
            // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
            // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
            // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
            const dappUserAccount = await getUser(env, AccountKey.dappUsers)
            // there must be at least one provider in the contract and db
            await getUser(env, AccountKey.providersWithStakeAndDataset)

            const dappUserTasks = await getSignedTasks(env, dappUserAccount)
            const solvedCaptchaCount = env.config.captchas.solved.count
            const unsolvedCaptchaCount = env.config.captchas.unsolved.count

            const { captchas, requestHash } = await dappUserTasks.getRandomCaptchasAndRequestHash(
                datasetWithSolutionHashes.datasetId.toString(), // This is the dataset that all test providers have loaded
                hexHash(accountAddress(dappUserAccount))
            )

            expect(captchas.length).to.equal(solvedCaptchaCount + unsolvedCaptchaCount)
            const pendingRequest = await env.getDb().getDappUserPending(requestHash)

            expect(pendingRequest).to.not.be.null
        } catch (err) {
            throw new ProsopoEnvError(err as Error)
        }
    })

    test('Validate provided captcha dataset', async ({ env }): Promise<void> => {
        const dappAccount = await getUser(env, AccountKey.dappsWithStake)

        const tasks = await getSignedTasks(env, dappAccount)

        const res = (
            await tasks.contract.query.getRandomActiveProvider(
                accountContract(dappAccount),
                accountContract(dappAccount)
            )
        ).value
            .unwrap()
            .unwrap()
        const blockNumberParsed = parseBlockNumber(res.blockNumber.toString())
        await tasks.validateProviderWasRandomlyChosen(
            accountContract(dappAccount),
            accountContract(dappAccount),
            res.provider.datasetId.toString() as string,
            blockNumberParsed
        )
        const valid = await tasks
            .validateProviderWasRandomlyChosen(
                accountContract(dappAccount),
                accountContract(dappAccount),
                res.provider.datasetId.toString() as string,
                blockNumberParsed
            )
            .then(() => true)
            .catch(() => false)

        expect(valid).to.be.true
    })

    test('Validate provided captcha dataset - fail', async ({ env, providerStakeThreshold }): Promise<void> => {
        const providerAccount = await getUser(env, AccountKey.providers)

        const tasks = await getSignedTasks(env, providerAccount)

        let provider = (await tasks.contract.query.getProvider(accountAddress(providerAccount))).value.unwrap().unwrap()

        const resultProviderUpdate1 = (
            await tasks.contract.tx.providerUpdate(provider.url, provider.fee as unknown as number, PROVIDER_PAYEE, {
                value: 0,
            })
        ).result
        expect(resultProviderUpdate1?.isError).to.be.false
        provider = (await tasks.contract.query.getProvider(accountAddress(providerAccount))).value.unwrap().unwrap()
        expect(provider.status).to.equal('Inactive')
        const resultproviderUpdate2 = (
            await tasks.contract.tx.providerUpdate(provider.url, provider.fee as unknown as number, PROVIDER_PAYEE, {
                value: providerStakeThreshold,
            })
        ).result
        expect(resultproviderUpdate2?.isError).to.be.false

        await tasks.providerSetDatasetFromFile(JSON.parse(JSON.stringify(datasetWithIndexSolutions)))

        const dappAccount = await getUser(env, AccountKey.dappsWithStake)
        const dappUser = await getUser(env, AccountKey.dappUsers)

        const dappUserTasks = await getSignedTasks(env, dappUser)

        const res = (
            await dappUserTasks.contract.query.getRandomActiveProvider(
                accountAddress(dappUser),
                accountContract(dappAccount)
            )
        ).value
            .unwrap()
            .unwrap()
        const blockNumberParsed = parseBlockNumber(res.blockNumber.toString())
        const valid = await dappUserTasks
            .validateProviderWasRandomlyChosen(
                accountAddress(dappUser),
                accountContract(dappAccount),
                '0x1dc833d14a257f21967feddafb3b3876b75b3fc9b0a2d071f29da9bfebc84f5a',
                blockNumberParsed
            )
            .then(() => true)
            .catch(() => false)

        expect(valid).to.be.false
    })

    test('Provider deregister', async ({ env }): Promise<void> => {
        const providerAccount = await getUser(env, AccountKey.providersWithStake)

        const tasks = await getSignedTasks(env, providerAccount)
        const isError = (await tasks.contract.tx.providerDeregister()).result?.isError
        expect(isError).to.be.false
    })
})
