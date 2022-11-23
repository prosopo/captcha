// Copyright (C) 2021-2022 Prosopo (UK) Ltd.
// This file is part of provider <https://github.com/prosopo/provider>.
//
// provider is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// provider is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
import { DappUserSolutionResult, Tasks, loadJSONFile, parseBlockNumber, sendFunds } from '@prosopo/provider'
import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import path from 'path'
import { randomAsHex } from '@polkadot/util-crypto'
import {
    CaptchaMerkleTree,
    CaptchaSolution,
    ProsopoEnvError,
    computeCaptchaSolutionHash,
    computePendingRequestHash,
    hexHash,
    parseCaptchaDataset,
} from '@prosopo/datasets'
import { TransactionResponse, getEventsFromMethodName } from '@prosopo/contract'
import { Account, AccountKey, IDatabaseAccounts, accountAddress, accountMnemonic } from '../dataUtils/DatabaseAccounts'
import { DAPP, PROVIDER } from '../mocks/accounts'
import { MockEnvironment } from '../mocks/mockenv'
import { populateDatabase } from '../dataUtils/populateDatabase'
import { i18n } from '@prosopo/i18n'
import { after, before } from 'mocha'

chai.should()
chai.use(chaiAsPromised)
const expect = chai.expect

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

async function sleep(timeout) {
    await delay(timeout)
    console.log('Timeout reached')
}

describe('CONTRACT TASKS', () => {
    let providerStakeDefault: bigint
    const mockEnv = new MockEnvironment()

    // Create a user of specified type using the databasePopulator
    async function getUser(accountType: AccountKey): Promise<Account> {
        try {
            const accountConfig = Object.assign({}, ...Object.keys(AccountKey).map((item) => ({ [item]: 0 })))
            accountConfig[accountType] = 1
            const databaseAccounts: IDatabaseAccounts = await populateDatabase(mockEnv, accountConfig, false)
            const account = databaseAccounts[accountType].pop()
            if (account === undefined) {
                throw new ProsopoEnvError(new Error(`${accountType} not created by databasePopulator`))
            }
            return account
        } catch (e) {
            throw new ProsopoEnvError(e)
        }
    }

    before(async () => {
        // try {
        await mockEnv.isReady()
        // } catch (e) {
        //     throw new ProsopoEnvError(e, 'isReady')
        // }

        // try {
        //   // Seed some initial accounts
        //   databaseAccounts = await populateDatabase(TEST_USER_COUNT)
        // } catch (e) {
        //   throw new ProsopoEnvError(e, 'populateDatabase');
        // }

        const tasks = new Tasks(mockEnv)

        try {
            await mockEnv.changeSigner('//Alice')
        } catch (e) {
            throw new ProsopoEnvError(e, 'changeSigner')
        }

        try {
            providerStakeDefault = await tasks.getProviderStakeDefault()
        } catch (e) {
            throw new ProsopoEnvError(e, 'getProviderStakeDefault')
        }

        // try {
        //   await databaseAccounts.importDatabaseAccounts();
        // } catch (e) {
        //   throw new ProsopoEnvError(e, 'importDatabaseAccounts');
        // }
    })

    after(() => {
        process.exit()
    })

    /** Gets some static solved captchas and constructions captcha solutions from them
     *  Computes the request hash for these captchas and the dappUser and then stores the request hash in the mock db
     *  @return {CaptchaSolution[], string} captchaSolutions and requestHash
     */
    async function createMockCaptchaSolutionsAndRequestHash() {
        // There must exist a dappUser who can receive a captcha
        const dappUserAccount = await getUser(AccountKey.dappUsers)
        // There must exist a provider with a dataset for us to get a random dataset with solutions
        const providerAccount = await getUser(AccountKey.providersWithStakeAndDataset)
        // There must exist a dapp that is staked who can use the service
        const dappContractAccount = await getUser(AccountKey.dappsWithStake)
        const tasks = await changeSigner(providerAccount)
        const providerDetails = await tasks.getProviderDetails(accountAddress(providerAccount))
        //await sleep(132000)
        const solvedCaptchas = await mockEnv.db!.getRandomSolvedCaptchasFromSingleDataset(providerDetails.dataset_id, 2)
        await mockEnv.changeSigner(accountMnemonic(dappUserAccount))

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

        if ('storeDappUserPending' in mockEnv.db!) {
            await mockEnv.db.storeDappUserPending(
                hexHash(accountAddress(dappUserAccount)),
                requestHash,
                pendingRequestSalt
            )
        }

        return {
            dappUserAccount,
            captchaSolutions,
            requestHash,
            providerAccount,
            dappContractAccount,
            userSalt,
        }
    }

    async function changeSigner(account: Account): Promise<Tasks> {
        await mockEnv.changeSigner(accountMnemonic(account))

        return new Tasks(mockEnv)
    }

    it('Provider registration', async () => {
        const [providerMnemonic, providerAddress] = mockEnv.createAccountAndAddToKeyring() || ['', '']

        await sendFunds(mockEnv, providerAddress, 'Provider', 10000n * providerStakeDefault)

        const tasks = await changeSigner([providerMnemonic, providerAddress])

        const result: TransactionResponse = await tasks.providerRegister(
            PROVIDER.serviceOrigin + randomAsHex().slice(0, 8),
            PROVIDER.fee,
            PROVIDER.payee,
            providerAddress
        )

        expect(result.txHash!).to.not.be.empty
    })

    it('Provider update', async () => {
        try {
            const providerAccount = await getUser(AccountKey.providers)
            const tasks = await changeSigner(providerAccount)

            const value = 1000n * providerStakeDefault

            const result: TransactionResponse = await tasks.providerUpdate(
                PROVIDER.serviceOrigin + randomAsHex().slice(0, 8),
                PROVIDER.fee,
                PROVIDER.payee,
                accountAddress(providerAccount),
                value
            )

            const eventData = getEventsFromMethodName(result, 'providerUpdate')
            expect(eventData![0].args[0].toHuman()).to.equal(accountAddress(providerAccount))
        } catch (err) {
            throw new ProsopoEnvError(err, 'providerUpdate')
        }
    })

    it('Provider add dataset', async () => {
        const providerAccount = await getUser(AccountKey.providersWithStake)

        const tasks = await changeSigner(providerAccount)

        const captchaFilePath = path.resolve(__dirname, '../mocks/data/captchas.json')
        const result: TransactionResponse = await tasks.providerAddDatasetFromFile(captchaFilePath)
        const eventData = getEventsFromMethodName(result, 'providerAddDataset')

        expect(eventData![0].args[0].toHuman()).to.equal(accountAddress(providerAccount))
    })

    it('Inactive Provider cannot add dataset', async () => {
        const providerAccount = await getUser(AccountKey.providers)

        const tasks = await changeSigner(providerAccount)

        const captchaFilePath = path.resolve(__dirname, '../mocks/data/captchas.json')
        const datasetPromise = tasks.providerAddDatasetFromFile(captchaFilePath)

        datasetPromise.catch((e) => e.message.should.match('/ProviderInactive/'))
    })

    it('Provider approve', async () => {
        const { dappUserAccount, captchaSolutions, providerAccount, dappContractAccount } =
            await createMockCaptchaSolutionsAndRequestHash()

        const tasks = await changeSigner(dappUserAccount)

        const salt = randomAsHex()

        const tree = new CaptchaMerkleTree()

        const captchaSolutionsSalted = captchaSolutions.map((captcha) => ({
            ...captcha,
            salt: salt,
        }))
        const captchasHashed = captchaSolutionsSalted.map((captcha) => computeCaptchaSolutionHash(captcha))

        tree.build(captchasHashed)
        const commitmentId = tree.root!.hash

        const provider = await tasks.getProviderDetails(accountAddress(providerAccount))

        await tasks.dappUserCommit(
            accountAddress(dappContractAccount),
            provider.dataset_id,
            commitmentId,
            accountAddress(providerAccount)
        )

        const providerTasks = await changeSigner(providerAccount)

        const result = await providerTasks.providerApprove(commitmentId, 0)
        const events = getEventsFromMethodName(result, 'providerApprove')

        expect(events![0].args[0].toHuman()).to.equal(commitmentId)
    })

    it('Provider disapprove', async () => {
        const { dappUserAccount, captchaSolutions, providerAccount, dappContractAccount } =
            await createMockCaptchaSolutionsAndRequestHash()

        const tasks = await changeSigner(dappUserAccount)

        const salt = randomAsHex()

        const tree = new CaptchaMerkleTree()

        const captchaSolutionsSalted = captchaSolutions.map((captcha) => ({
            ...captcha,
            salt: salt,
        }))
        const captchasHashed = captchaSolutionsSalted.map((captcha) => computeCaptchaSolutionHash(captcha))

        tree.build(captchasHashed)
        const commitmentId = tree.root!.hash

        const provider = await tasks.getProviderDetails(accountAddress(providerAccount))

        await tasks.dappUserCommit(
            accountAddress(dappContractAccount),
            provider.dataset_id,
            commitmentId,
            accountAddress(providerAccount)
        )

        const providerTasks = await changeSigner(providerAccount)

        const result = await providerTasks.providerDisapprove(commitmentId)
        const events = getEventsFromMethodName(result, 'providerDisapprove')

        expect(events![0].args[0].toHuman()).to.equal(commitmentId)
    })

    it('Timestamps check', async () => {
        const salt = randomAsHex()

        const tree = new CaptchaMerkleTree()

        const { dappUserAccount, captchaSolutions, providerAccount, dappContractAccount } =
            await createMockCaptchaSolutionsAndRequestHash()

        const tasks = await changeSigner(dappUserAccount)

        const captchaSolutionsSalted = captchaSolutions.map((captcha) => ({
            ...captcha,
            salt: salt,
        }))
        const captchasHashed = captchaSolutionsSalted.map((captcha) => computeCaptchaSolutionHash(captcha))

        tree.build(captchasHashed)
        const commitmentId = tree.root!.hash

        const provider = await tasks.getProviderDetails(accountAddress(providerAccount))

        await tasks.dappUserCommit(
            accountAddress(dappContractAccount),
            provider.dataset_id,
            commitmentId,
            accountAddress(providerAccount)
        )

        const providerTasks = await changeSigner(providerAccount)

        const result = await providerTasks.providerApprove(commitmentId, 0)
        const events = getEventsFromMethodName(result, 'providerApprove')

        expect(events![0].args[0].toHuman()).to.equal(commitmentId)

        const commitment = await providerTasks.getCaptchaSolutionCommitment(commitmentId)

        // check the timestamp
        const completedAt = parseInt(commitment.completed_at.toString().replace(',', ''))

        expect(completedAt).to.be.above(0)

        // check how much time passed after successful completion
        const lastCorrectCaptcha = await providerTasks.getDappOperatorLastCorrectCaptcha(
            accountAddress(dappUserAccount)
        )

        expect(Number.parseInt(lastCorrectCaptcha.before_ms.toString())).to.be.above(0)
    })

    it('Provider details', async () => {
        try {
            const providerAccount = await getUser(AccountKey.providersWithStakeAndDataset)
            const tasks = await changeSigner(providerAccount)

            const result = await tasks.getProviderDetails(accountAddress(providerAccount))
            expect(result).to.have.a.property('status')
        } catch (err) {
            throw new ProsopoEnvError(err, 'providerDetails')
        }
    })

    it('Provider accounts', async () => {
        const providerAccount = await getUser(AccountKey.providersWithStakeAndDataset)

        const tasks = await changeSigner(providerAccount)

        const result = await tasks.getProviderAccounts()

        expect(result).to.be.an('array')
    })

    it('Dapp registration', async () => {
        const newAccount = mockEnv.createAccountAndAddToKeyring() || ['', '']

        const tasks = await changeSigner(newAccount)

        await sendFunds(mockEnv, accountAddress(newAccount), 'Dapp', 10000000n * providerStakeDefault)

        const result: TransactionResponse = await tasks.dappRegister(
            DAPP.serviceOrigin + randomAsHex().slice(0, 8),
            accountAddress(newAccount),
            accountAddress(newAccount)
        )

        expect(result.txHash).to.not.be.empty
    })

    it('Dapp is active', async () => {
        const dappAccount = await getUser(AccountKey.dappsWithStake)

        const tasks = await changeSigner(dappAccount)

        const result: any = await tasks.dappIsActive(accountAddress(dappAccount))

        expect(result).to.equal(true)
    })

    it('Dapp details', async () => {
        const dappAccount = await getUser(AccountKey.dapps)

        const tasks = await changeSigner(dappAccount)

        const result: any = await tasks.getDappDetails(accountAddress(dappAccount))

        expect(result).to.have.a.property('status')
    })

    it('Dapp fund', async () => {
        const dappAccount = await getUser(AccountKey.dappsWithStake)

        const tasks = await changeSigner(dappAccount)

        const value = 10

        const result: TransactionResponse = await tasks.dappFund(accountAddress(dappAccount), value)
        const events = getEventsFromMethodName(result, 'dappFund')
        const decoded = events![0].args.map((arg) => arg.toHuman())

        expect(decoded[0]).to.equal(accountAddress(dappAccount))
        const dappStruct = await tasks.getDappDetails(accountAddress(dappAccount))

        expect(events![0].args[1].toHuman()).to.equal(dappStruct.balance)
    })

    it('Dapp user commit', async () => {
        const { captchaSolutions, dappUserAccount, dappContractAccount } =
            await createMockCaptchaSolutionsAndRequestHash()

        const tasks = await changeSigner(dappUserAccount)

        const salt = randomAsHex()

        const tree = new CaptchaMerkleTree()

        const captchaSolutionsSalted = captchaSolutions.map((captcha) => ({
            ...captcha,
            salt: salt,
        }))

        const captchasHashed = captchaSolutionsSalted.map((captcha) => computeCaptchaSolutionHash(captcha))

        tree.build(captchasHashed)

        const commitmentId = tree.root!.hash

        const providerAccount = await getUser(AccountKey.providersWithStakeAndDataset)

        const provider = await tasks.getProviderDetails(accountAddress(providerAccount))

        const result: TransactionResponse = await tasks.dappUserCommit(
            accountAddress(dappContractAccount),
            provider.dataset_id,
            commitmentId,
            accountAddress(providerAccount)
        )

        if (!result) {
            throw new ProsopoEnvError(new Error('Result is null'))
        }

        const events = getEventsFromMethodName(result, 'dappUserCommit')

        expect(events![0].args[2].toHuman()).to.equal(accountAddress(dappContractAccount))
    })

    it('Dapp accounts', async () => {
        const providerAccount = await getUser(AccountKey.providers)

        const tasks = await changeSigner(providerAccount)

        const result = await tasks.getDappAccounts()

        expect(result).to.be.an('array')
    })

    it('Captchas are correctly formatted before being passed to the API layer', async () => {
        const dappUserAccount = await getUser(AccountKey.dappUsers)
        const providerAccount = await getUser(AccountKey.providersWithStakeAndDataset)

        const dappUserTasks = await changeSigner(dappUserAccount)
        const provider = await dappUserTasks.getProviderDetails(accountAddress(providerAccount))

        const captchas = await dappUserTasks.getCaptchaWithProof(provider.dataset_id, true, 1)

        expect(captchas[0]).to.have.nested.property('captcha.captchaId')
        expect(captchas[0]).to.have.nested.property('captcha.datasetId', provider.dataset_id)
        expect(captchas[0]).to.have.property('proof')
        expect(captchas[0]).to.not.have.property('solution')
        expect(captchas[0]).to.not.have.nested.property('captcha.solution')
    })

    it('Captcha proofs are returned if commitment found and solution is correct', async () => {
        try {
            // Construct a pending request hash between dappUserAccount, providerAccount and dappContractAccount
            const { captchaSolutions, requestHash, dappUserAccount, providerAccount, dappContractAccount, userSalt } =
                await createMockCaptchaSolutionsAndRequestHash()

            const dappUserTasks = await changeSigner(dappUserAccount)

            const tree = new CaptchaMerkleTree()
            const captchaSolutionsSalted = captchaSolutions
            const captchasHashed = captchaSolutionsSalted.map((captcha) => computeCaptchaSolutionHash(captcha))

            tree.build(captchasHashed)
            const commitmentId = tree.root!.hash

            const provider = await dappUserTasks.getProviderDetails(accountAddress(providerAccount))

            const dappUserCommitResponse = await dappUserTasks.dappUserCommit(
                accountAddress(dappContractAccount),
                provider.dataset_id,
                commitmentId,
                accountAddress(providerAccount)
            )

            // next part contains internal contract calls that must be run by provider
            const providerTasks = await changeSigner(providerAccount)
            const result: DappUserSolutionResult = await providerTasks.dappUserSolution(
                accountAddress(dappUserAccount),
                accountAddress(dappContractAccount),
                requestHash,
                JSON.parse(JSON.stringify(captchaSolutionsSalted)) as JSON,
                dappUserCommitResponse.blockHash as string,
                dappUserCommitResponse.result.txHash.toString()
            )

            expect(result.captchas.length).to.be.eq(2)
            const expectedProof = tree.proof(captchaSolutionsSalted[0].captchaId)
            const filteredResult = result.captchas.filter(
                (res) => res.captchaId == captchaSolutionsSalted[0].captchaId
            )[0]
            expect(filteredResult.proof).to.deep.eq(expectedProof)
            expect(filteredResult.captchaId).to.eq(captchaSolutionsSalted[0].captchaId)
        } catch (err) {
            // TODO: should this be localized?
            throw new ProsopoEnvError(err, 'Captcha proofs are returned if commitment found and solution is correct')
        }
    })

    // it('Dapp User sending an invalid captchas causes error', async () => {
    //     const { requestHash } = await createMockCaptchaSolutionsAndRequestHash();
    //
    //     await mockEnv.contractInterface!.changeSigner(provider.mnemonic as string);
    //     const providerTasks = new Tasks(mockEnv);
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
    // it('Dapp User sending solutions without committing to blockchain causes error', async () => {
    //     const { captchaSolutions, requestHash } = await createMockCaptchaSolutionsAndRequestHash();
    //
    //     await mockEnv.contractInterface!.changeSigner(provider.mnemonic as string);
    //     const providerTasks = new Tasks(mockEnv);
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
    // it('No proofs are returned if commitment found and solution is incorrect', async () => {
    //     const { captchaSolutions, requestHash } = await createMockCaptchaSolutionsAndRequestHash();
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
    //     await mockEnv.contractInterface!.changeSigner(dappUser.mnemonic);
    //     const dappUserTasks = new Tasks(mockEnv);
    //
    //     await dappUserTasks.dappUserCommit(
    //         dapp.contractAccount as string,
    //         datasetId as string,
    //         commitmentId,
    //         provider.address as string
    //     );
    //     // next part contains internal contract calls that must be run by provider
    //     await mockEnv.contractInterface!.changeSigner(provider.mnemonic as string);
    //     const providerTasks = new Tasks(mockEnv);
    //     const result = await providerTasks.dappUserSolution(
    //         dappUser.address,
    //         dapp.contractAccount as string,
    //         requestHash,
    //         JSON.parse(JSON.stringify(captchaSolutionsSalted)) as JSON
    //     );
    //
    //     expect(result!.length).to.be.eq(0);
    // });

    it('Validates the received captchas length', async () => {
        const providerAccount = await getUser(AccountKey.providersWithStakeAndDataset)

        const { captchaSolutions } = await createMockCaptchaSolutionsAndRequestHash()

        const providerTasks = await changeSigner(providerAccount)

        // All of the captchaIds present in the solutions should be in the database
        expect(async function () {
            await providerTasks.validateCaptchasLength(JSON.parse(JSON.stringify(captchaSolutions)) as JSON)
        }).to.not.throw()
    })

    it('Builds the tree and gets the commitment', async () => {
        const { captchaSolutions, dappUserAccount } = await createMockCaptchaSolutionsAndRequestHash()

        const dappAccount = await getUser(AccountKey.dappsWithStake)

        const tasks = await changeSigner(dappUserAccount)

        const initialTree = new CaptchaMerkleTree()
        const captchasHashed = captchaSolutions.map((captcha) => computeCaptchaSolutionHash(captcha))

        initialTree.build(captchasHashed)
        const initialCommitmentId = initialTree.root!.hash

        const providerAccount = await getUser(AccountKey.providersWithStakeAndDataset)

        const provider = await tasks.getProviderDetails(accountAddress(providerAccount))

        await tasks.dappUserCommit(
            accountAddress(dappAccount),
            provider.dataset_id,
            initialCommitmentId,
            accountAddress(providerAccount)
        )
        const { commitmentId, tree } = await tasks.buildTreeAndGetCommitmentId(captchaSolutions)

        expect(tree).to.deep.equal(initialTree)
        expect(commitmentId).to.equal(initialCommitmentId)
        const commitment = await tasks.getCaptchaSolutionCommitment(commitmentId)
        expect(commitment).to.not.be.undefined
    })

    it('BuildTreeAndGetCommitment throws if commitment does not exist', async () => {
        const { captchaSolutions, dappUserAccount } = await createMockCaptchaSolutionsAndRequestHash()

        const tasks = await changeSigner(dappUserAccount)

        const salt = randomAsHex()
        const captchaSolutionsSalted = captchaSolutions.map((captcha) => ({
            ...captcha,
            salt: salt,
        }))
        const commitmentPromise = tasks.buildTreeAndGetCommitmentId(captchaSolutionsSalted)

        commitmentPromise.catch((e) =>
            e.message.should.match(`/${i18n.t('CONTRACT.CAPTCHA_SOLUTION_COMMITMENT_DOES_NOT_EXIST')}/`)
        )
    })

    it('Validates the Dapp User Solution Request is Pending', async () => {
        const { dappUserAccount, captchaSolutions, providerAccount } = await createMockCaptchaSolutionsAndRequestHash()

        const tasks = await changeSigner(dappUserAccount)

        const pendingRequestSalt = randomAsHex()
        const captchaIds = captchaSolutions.map((c) => c.captchaId)

        const requestHash = computePendingRequestHash(captchaIds, accountAddress(dappUserAccount), pendingRequestSalt)

        await mockEnv.db!.storeDappUserPending(
            hexHash(accountAddress(dappUserAccount)),
            requestHash,
            pendingRequestSalt
        )
        const valid = await tasks.validateDappUserSolutionRequestIsPending(
            requestHash,
            accountAddress(dappUserAccount),
            captchaIds
        )

        expect(valid).to.be.true
    })

    it('Get random captchas and request hash', async () => {
        try {
            const dappUserAccount = await getUser(AccountKey.dappUsers)

            const dappAccount = await getUser(AccountKey.dappsWithStake)

            // there must be at least one provider in the contract and db
            const _unused = await getUser(AccountKey.providersWithStakeAndDataset)

            const dappUserTasks = await changeSigner(dappUserAccount)
            const solvedCaptchaCount = mockEnv.config.captchas.solved.count
            const unsolvedCaptchaCount = mockEnv.config.captchas.unsolved.count

            const { provider } = await dappUserTasks.getRandomProvider(
                accountAddress(dappUserAccount),
                accountAddress(dappAccount)
            )

            const { captchas, requestHash } = await dappUserTasks.getRandomCaptchasAndRequestHash(
                provider.dataset_id as string,
                hexHash(accountAddress(dappUserAccount))
            )

            expect(captchas.length).to.equal(solvedCaptchaCount + unsolvedCaptchaCount)
            const pendingRequest = mockEnv.db?.getDappUserPending(requestHash)

            expect(pendingRequest).to.not.be.null
        } catch (err) {
            throw new ProsopoEnvError(err, 'RandomCaptchasAndRequestHash')
        }
    })

    it('Validate provided captcha dataset', async () => {
        const dappAccount = await getUser(AccountKey.dappsWithStake)

        const tasks = await changeSigner(dappAccount)

        const res = await tasks.getRandomProvider(accountAddress(dappAccount), accountAddress(dappAccount))
        const blockNumberParsed = parseBlockNumber(res.block_number)
        const valid = await tasks
            .validateProviderWasRandomlyChosen(
                accountAddress(dappAccount),
                accountAddress(dappAccount),
                res.provider.dataset_id as string,
                blockNumberParsed
            )
            .then(() => true)
            .catch(() => false)

        expect(valid).to.be.true
    })

    it('Validate provided captcha dataset - fail', async () => {
        const providerAccount = await getUser(AccountKey.providers)

        const tasks = await changeSigner(providerAccount)

        const provider = await tasks.getProviderDetails(accountAddress(providerAccount))

        const captchaFilePath = path.resolve(__dirname, '../mocks/data/captchas.json')

        await tasks.providerUpdate(
            provider.service_origin as string,
            provider.fee as unknown as number,
            provider.payee,
            accountAddress(providerAccount),
            providerStakeDefault / 2n
        )

        const insuficientFundsTransaction = await tasks
            .providerAddDatasetFromFile(captchaFilePath)
            .then(() => false)
            .catch(() => true)

        expect(insuficientFundsTransaction).to.be.true

        await tasks.providerUpdate(
            provider.service_origin as string,
            provider.fee as unknown as number,
            provider.payee,
            accountAddress(providerAccount),
            providerStakeDefault
        )

        await tasks.providerAddDatasetFromFile(captchaFilePath)

        const dappAccount = await getUser(AccountKey.dappsWithStake)
        const dappUser = await getUser(AccountKey.dappUsers)

        const dappUserTasks = await changeSigner(dappUser)

        const res = await dappUserTasks.getRandomProvider(accountAddress(dappUser), accountAddress(dappAccount))
        const blockNumberParsed = parseBlockNumber(res.block_number)
        const valid = await dappUserTasks
            .validateProviderWasRandomlyChosen(
                accountAddress(dappUser),
                accountAddress(dappAccount),
                '0x1dc833d14a257f21967feddafb3b3876b75b3fc9b0a2d071f29da9bfebc84f5a',
                blockNumberParsed
            )
            .then(() => true)
            .catch(() => false)

        expect(valid).to.be.false
    })

    it('Provider unstake', async () => {
        const providerAccount = await getUser(AccountKey.providersWithStake)

        const tasks = await changeSigner(providerAccount)

        const value = 1

        const result: TransactionResponse = await tasks.providerUnstake(value)
        const events = getEventsFromMethodName(result, 'providerUnstake')

        expect(events![0].args[0].toHuman()).to.equal(accountAddress(providerAccount))
    })

    it('Provider deregister', async () => {
        const providerAccount = await getUser(AccountKey.providersWithStake)

        const tasks = await changeSigner(providerAccount)

        const result: TransactionResponse = await tasks.providerDeregister(accountAddress(providerAccount))
        const events = getEventsFromMethodName(result, 'providerDeregister')

        expect(events![0].args[0].toHuman()).to.equal(accountAddress(providerAccount))
    })

    it('Calculate captcha solution on the basis of Dapp users provided solutions', async () => {
        try {
            const providerAccount = await getUser(AccountKey.providersWithStakeAndDataset)
            const providerTasks = await changeSigner(providerAccount)
            //const provider = await providerTasks.getProviderDetails(accountAddress(providerAccount))

            const captchaFilePath = mockEnv.config.captchaSolutions.captchaFilePath
            const datasetBeforeCalculation = parseCaptchaDataset(loadJSONFile(captchaFilePath) as JSON)

            const solvedCaptchasCountBeforeCalculation = datasetBeforeCalculation.captchas.filter(
                (captcha) => 'solution' in captcha
            ).length

            const result = await providerTasks.calculateCaptchaSolutions()

            const datasetAfterCalculation = parseCaptchaDataset(loadJSONFile(captchaFilePath) as JSON)

            const solvedCaptchasCountAfterCalculation = datasetAfterCalculation.captchas.filter(
                (captcha) => 'solution' in captcha
            ).length

            expect(solvedCaptchasCountAfterCalculation - solvedCaptchasCountBeforeCalculation).to.equal(result)
        } catch (err) {
            throw new ProsopoEnvError(err, 'Calculate captcha solution on the basis of Dapp users provided solutions')
        }
    })
})
