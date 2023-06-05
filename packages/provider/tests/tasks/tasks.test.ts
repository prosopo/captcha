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
import { AccountKey } from '../dataUtils/DatabaseAccounts'
import {
    ArgumentTypes,
    CaptchaSolution,
    CaptchaStatus,
    DappUserSolutionResult,
    ProsopoConfigSchema,
} from '@prosopo/types'
import { BN, stringToHex, stringToU8a, u8aToHex } from '@polkadot/util'
import { CaptchaMerkleTree, computeCaptchaSolutionHash, computePendingRequestHash } from '@prosopo/datasets'
import { ContractDeployer } from '@prosopo/contract'
import { DappAbiJSON, DappWasm } from '../dataUtils/dapp-example-contract/loadFiles'
import { DappPayee } from '@prosopo/types'
import { EventRecord } from '@polkadot/types/interfaces'
import { KeypairType } from '@polkadot/util-crypto/types'
import { MockEnvironment } from '@prosopo/env'
import { PROVIDER, accountAddress, accountContract, accountMnemonic, getSignedTasks } from '../accounts'
import { ProsopoContractError } from '@prosopo/contract'
import { ProsopoEnvError, getPair, hexHash, i18n } from '@prosopo/common'
import { captchaData } from '../data/captchas'
import { createType } from '@polkadot/types'
import { getDispatchError } from '@prosopo/contract'
import { getSendAmount, getStakeAmount, sendFunds } from '../dataUtils/funds'
import { getUser } from '../getUser'
import { parseBlockNumber } from '../../src/index'
import { randomAsHex, signatureVerify } from '@polkadot/util-crypto'
import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'

chai.should()
chai.use(chaiAsPromised)
const expect = chai.expect

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function sleep(timeout) {
    await delay(timeout)
}

const PROVIDER_PAYEE = ArgumentTypes.Payee.dapp

describe('CONTRACT TASKS', async function (): Promise<void> {
    let providerStakeThreshold: BN
    let env: MockEnvironment
    let pairType: KeypairType
    let ss58Format: number

    beforeEach(async function () {
        ss58Format = 42
        pairType = 'sr25519' as KeypairType
        const alicePair = await getPair(pairType, ss58Format, '//Alice')
        const config = ProsopoConfigSchema.parse(JSON.parse(process.env.config ? process.env.config : '{}'))
        env = new MockEnvironment(alicePair, config)
        try {
            await env.isReady()
        } catch (e) {
            throw new ProsopoEnvError(e, 'isReady')
        }
    })

    afterEach(async (): Promise<void> => {
        await env.db?.close()
    })

    /** Gets some static solved captchas and constructions captcha solutions from them
     *  Computes the request hash for these captchas and the dappUser and then stores the request hash in the mock db
     *  @return {CaptchaSolution[], string} captchaSolutions and requestHash
     */
    async function createMockCaptchaSolutionsAndRequestHash() {
        // There must exist a dappUser who can receive a captcha
        const dappUserAccount = await getUser(env, AccountKey.dappUsers)
        // There must exist a provider with a dataset for us to get a random dataset with solutions
        const providerAccount = await getUser(env, AccountKey.providersWithStakeAndDataset)
        // There must exist a dapp that is staked who can use the service
        const dappContractAccount = await getUser(env, AccountKey.dappsWithStake)
        const tasks = await getSignedTasks(env, providerAccount)
        const providerDetails = (await tasks.contract.query.getProviderDetails(accountAddress(providerAccount))).value
            .unwrap()
            .unwrap()
        //await sleep(132000)
        const solvedCaptchas = await env.db!.getRandomSolvedCaptchasFromSingleDataset(
            providerDetails.datasetId.toString(),
            2
        )
        const pair = await getPair(pairType, ss58Format, accountMnemonic(dappUserAccount))
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

        if ('storeDappUserPending' in env.db!) {
            await env.db.storeDappUserPending(
                hexHash(accountAddress(dappUserAccount)),
                requestHash,
                pendingRequestSalt,
                99999999999999
            )
        }
        const signer = env.keyring.addFromMnemonic(accountMnemonic(dappUserAccount))
        const userSignature = signer.sign(stringToHex(requestHash))
        signatureVerify(stringToHex(requestHash), userSignature, accountAddress(dappUserAccount))

        return {
            dappUserAccount,
            captchaSolutions,
            requestHash,
            providerAccount,
            dappContractAccount,
            userSalt,
            userSignature,
        }
    }

    it('Provider registration', async function () {
        const [providerMnemonic, providerAddress] = env.createAccountAndAddToKeyring() || ['', '']
        const tasks = await getSignedTasks(env, [providerMnemonic, providerAddress])
        providerStakeThreshold = new BN(
            (await tasks.contract.query.getProviderStakeThreshold()).value.unwrap().toNumber()
        )
        const stakeAmount = getStakeAmount(env, providerStakeThreshold)
        const sendAmount = getSendAmount(env, stakeAmount)
        await sendFunds(env, providerAddress, 'ProsopoPayee', sendAmount)

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
        expect(result?.error).to.be.undefined
    })

    it('Provider update', async (): Promise<void> => {
        const providerAccount = await getUser(env, AccountKey.providers)
        const tasks = await getSignedTasks(env, providerAccount)

        const value = new BN((await tasks.contract.query.getProviderStakeThreshold()).value.unwrap().toNumber())
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
            throw new ProsopoContractError(dispatchError)
        }
        expect(result?.isError).to.be.false
    })

    it('Provider add dataset', async (): Promise<void> => {
        const providerAccount = await getUser(env, AccountKey.providersWithStake)

        const tasks = await getSignedTasks(env, providerAccount)

        await tasks.providerSetDatasetFromFile(JSON.parse(JSON.stringify(captchaData)))
    })

    it('Inactive Provider cannot add dataset', async (): Promise<void> => {
        const providerAccount = await getUser(env, AccountKey.providers)

        const tasks = await getSignedTasks(env, providerAccount)

        const datasetPromise = tasks.providerSetDatasetFromFile(JSON.parse(JSON.stringify(captchaData)))

        datasetPromise.catch((e) => {
            console.log(e)
            e.message.should.match('/ProviderInactive/')
        })
    })

    it('Provider approve', async (): Promise<void> => {
        const { dappUserAccount, captchaSolutions, providerAccount, dappContractAccount, userSignature } =
            await createMockCaptchaSolutionsAndRequestHash()
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

        const provider = (await tasks.contract.query.getProviderDetails(accountAddress(providerAccount))).value
            .unwrap()
            .unwrap()
        const completedAt = (await env.api.rpc.chain.getBlock()).block.header.number.toNumber()
        const requestedAt = completedAt - 1
        const providerTasks = await getSignedTasks(env, providerAccount)
        const commit = {
            dapp: accountContract(dappContractAccount),
            datasetId: provider.datasetId,
            id: commitmentId,
            provider: accountAddress(providerAccount),
            user: accountAddress(dappUserAccount),
            status: CaptchaStatus.approved,
            requestedAt,
            completedAt,
            userSignaturePart1: [...userSignature.slice(0, userSignature.length / 2)],
            userSignaturePart2: [...userSignature.slice(userSignature.length / 2)],
        }
        const queryResult = await providerTasks.contract.query.providerCommit(commit)
        if (queryResult.value.err) {
            throw new Error(queryResult.value.err)
        }
        const result = await providerTasks.contract.tx.providerCommit(commit)
        if (result.result?.isError && result.result?.dispatchError) {
            const dispatchError = getDispatchError(result.result?.dispatchError)
            throw new ProsopoContractError(dispatchError)
        }
        expect(result.result?.isError).to.be.false
        if (result.error) {
            throw new ProsopoContractError(result.error.message)
        }
    })

    it('Provider disapprove', async (): Promise<void> => {
        const { dappUserAccount, captchaSolutions, providerAccount, dappContractAccount, userSignature } =
            await createMockCaptchaSolutionsAndRequestHash()

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

        const provider = (await tasks.contract.query.getProviderDetails(accountAddress(providerAccount))).value
            .unwrap()
            .unwrap()

        const completedAt = (await env.api.rpc.chain.getBlock()).block.header.number.toNumber()
        const requestedAt = completedAt - 1
        const providerTasks = await getSignedTasks(env, providerAccount)
        await providerTasks.contract.tx.providerCommit({
            dapp: accountContract(dappContractAccount),
            datasetId: provider.datasetId.toString(),
            id: commitmentId,
            provider: accountAddress(providerAccount),
            user: accountAddress(dappUserAccount),
            status: CaptchaStatus.disapproved,
            requestedAt,
            completedAt,
            userSignaturePart1: [...userSignature.slice(0, userSignature.length / 2)],
            userSignaturePart2: [...userSignature.slice(userSignature.length / 2)],
        })
    })

    it('Timestamps check', async (): Promise<void> => {
        const salt = randomAsHex()

        const tree = new CaptchaMerkleTree()

        const { dappUserAccount, captchaSolutions, providerAccount, dappContractAccount, userSignature } =
            await createMockCaptchaSolutionsAndRequestHash()

        const tasks = await getSignedTasks(env, dappUserAccount)

        const captchaSolutionsSalted = captchaSolutions.map((captcha) => ({
            ...captcha,
            salt: salt,
        }))
        const captchasHashed = captchaSolutionsSalted.map((captcha) => computeCaptchaSolutionHash(captcha))

        tree.build(captchasHashed)
        const commitmentId = tree.root!.hash

        const provider = (await tasks.contract.query.getProviderDetails(accountAddress(providerAccount))).value
            .unwrap()
            .unwrap()

        const completedAt = (await env.api.rpc.chain.getBlock()).block.header.number.toNumber()
        const requestedAt = completedAt - 1
        const providerTasks = await getSignedTasks(env, providerAccount)
        await providerTasks.contract.tx.providerCommit({
            dapp: accountContract(dappContractAccount),
            datasetId: provider.datasetId.toString(),
            id: commitmentId,
            provider: accountAddress(providerAccount),
            user: accountAddress(dappUserAccount),
            status: CaptchaStatus.approved,
            completedAt,
            requestedAt,
            userSignaturePart1: [...userSignature.slice(0, userSignature.length / 2)],
            userSignaturePart2: [...userSignature.slice(userSignature.length / 2)],
        })

        const commitment = (await providerTasks.contract.query.getCaptchaSolutionCommitment(commitmentId)).value
            .unwrap()
            .unwrap()

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

    it('Provider details', async (): Promise<void> => {
        try {
            const providerAccount = await getUser(env, AccountKey.providersWithStakeAndDataset)
            const tasks = await getSignedTasks(env, providerAccount)

            const result = (await tasks.contract.query.getProviderDetails(accountAddress(providerAccount))).value
                .unwrap()
                .unwrap()
            expect(result).to.have.a.property('status')
        } catch (err) {
            throw new ProsopoEnvError(err, 'providerDetails')
        }
    })

    it('Provider accounts', async (): Promise<void> => {
        const providerAccount = await getUser(env, AccountKey.providersWithStakeAndDataset)

        const tasks = await getSignedTasks(env, providerAccount)

        const result = (await tasks.contract.query.getAllProviderIds()).value.unwrap().unwrap()

        expect(result).to.be.an('array')
    })

    it('Dapp registration', async (): Promise<void> => {
        const newAccount = env.createAccountAndAddToKeyring() || ['', '']

        const tasks = await getSignedTasks(env, newAccount)
        const stakeAmount = getStakeAmount(env, providerStakeThreshold)
        const sendAmount = getSendAmount(env, stakeAmount)
        await sendFunds(env, accountAddress(newAccount), 'Dapp', sendAmount)
        const dappParams = ['1000000000000000000', 1000, env.contractInterface.address, 65, 1000000]

        const deployer = new ContractDeployer(
            env.api,
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
        const contractAddress = instantiateEvent?.event.data['contract'].toString()
        const result = (await tasks.contract.tx.dappRegister(contractAddress, DappPayee.dapp)).result
        expect(result?.isError).to.be.false
        const dapp = (await tasks.contract.query.getDappDetails(contractAddress)).value.unwrap().unwrap()
        expect(dapp.owner).to.equal(accountAddress(newAccount))
    })

    it('Dapp is active', async (): Promise<void> => {
        const dappAccount = await getUser(env, AccountKey.dappsWithStake)

        const tasks = await getSignedTasks(env, dappAccount)

        const result: any = await tasks.dappIsActive(accountContract(dappAccount))

        expect(result).to.equal(true)
    })

    it('Dapp details', async (): Promise<void> => {
        const dappAccount = await getUser(env, AccountKey.dapps)

        const tasks = await getSignedTasks(env, dappAccount)

        const result: any = (await tasks.contract.query.getDappDetails(accountContract(dappAccount))).value
            .unwrap()
            .unwrap()

        expect(result).to.have.a.property('status')
    })

    it('Dapp fund', async (): Promise<void> => {
        const dappAccount = await getUser(env, AccountKey.dappsWithStake)
        const tasks = await getSignedTasks(env, dappAccount)
        const value = createType(env.contractInterface.abi.registry, 'u128', '10')
        const dappContractAddress = accountContract(dappAccount)
        const dappBefore = (await tasks.contract.query.getDappDetails(dappContractAddress)).value.unwrap().unwrap()
        const result = (await tasks.contract.tx.dappFund(dappContractAddress, { value })).result
        expect(result?.isError).to.be.false
        const dappAfter = (await tasks.contract.query.getDappDetails(dappContractAddress)).value.unwrap().unwrap()
        expect(dappBefore.balance.toNumber() + value.toNumber()).to.equal(dappAfter.balance.toNumber())
    })

    //TODO reinstate when https://github.com/polkadot-js/api/issues/5410 is resolved

    // it.only('Dapp accounts', async (): Promise<void> => {
    //     const account = await getUser(env, AccountKey.dapps)
    //
    //     const tasks = await changeSigner(env,  account)
    //
    //     const result = await tasks.contractApi.getDappAccounts()
    //     console.log(result)
    //
    //     expect(result).to.be.an('array')
    // })

    it('Captchas are correctly formatted before being passed to the API layer', async (): Promise<void> => {
        const dappUserAccount = await getUser(env, AccountKey.dappUsers)
        const providerAccount = await getUser(env, AccountKey.providersWithStakeAndDataset)

        const dappUserTasks = await getSignedTasks(env, dappUserAccount)
        const provider = (await dappUserTasks.contract.query.getProviderDetails(accountAddress(providerAccount))).value
            .unwrap()
            .unwrap()

        const captchas = await dappUserTasks.getCaptchaWithProof(provider.datasetId.toString(), true, 1)

        expect(captchas[0]).to.have.nested.property('captcha.captchaId')
        expect(captchas[0]).to.have.nested.property('captcha.datasetId', provider.datasetId.toString())
        expect(captchas[0]).to.have.property('proof')
        expect(captchas[0]).to.not.have.property('solution')
        expect(captchas[0]).to.not.have.nested.property('captcha.solution')
    })

    it('Captcha proofs are returned if commitment found and solution is correct', async (): Promise<void> => {
        // Construct a pending request hash between dappUserAccount, providerAccount and dappContractAccount
        const { captchaSolutions, requestHash, dappUserAccount, providerAccount, dappContractAccount, userSignature } =
            await createMockCaptchaSolutionsAndRequestHash()

        const dappUserTasks = await getSignedTasks(env, dappUserAccount)

        const tree = new CaptchaMerkleTree()
        const captchaSolutionsSalted = captchaSolutions
        const captchasHashed = captchaSolutionsSalted.map((captcha) => computeCaptchaSolutionHash(captcha))

        tree.build(captchasHashed)
        const commitmentId = tree.root!.hash

        const provider = (await dappUserTasks.contract.query.getProviderDetails(accountAddress(providerAccount))).value
            .unwrap()
            .unwrap()

        const completedAt = (await env.api.rpc.chain.getBlock()).block.header.number.toNumber()
        const requestedAt = completedAt - 1
        // next part contains internal contract calls that must be run by provider
        const providerTasks = await getSignedTasks(env, providerAccount)
        await providerTasks.contract.tx.providerCommit({
            dapp: accountContract(dappContractAccount),
            datasetId: provider.datasetId.toString(),
            id: commitmentId,
            provider: accountAddress(providerAccount),
            user: accountAddress(dappUserAccount),
            status: CaptchaStatus.approved,
            completedAt,
            requestedAt,
            userSignaturePart1: [...userSignature.slice(0, userSignature.length / 2)],
            userSignaturePart2: [...userSignature.slice(userSignature.length / 2)],
        })

        const commitment = (await providerTasks.contract.query.getCaptchaSolutionCommitment(commitmentId)).value
            .unwrap()
            .unwrap()

        // next part contains internal contract calls that must be run by provider
        const blockHash = await env.api.rpc.chain.getBlockHash(commitment.completedAt)
        const result: DappUserSolutionResult = await providerTasks.dappUserSolution(
            accountAddress(dappUserAccount),
            accountContract(dappContractAccount),
            requestHash,
            JSON.parse(JSON.stringify(captchaSolutionsSalted)),
            u8aToHex(userSignature)
        )
        expect(result.captchas.length).to.be.eq(2)
        const expectedProof = tree.proof(captchaSolutionsSalted[0].captchaId)
        const filteredResult = result.captchas.filter((res) => res.captchaId == captchaSolutionsSalted[0].captchaId)[0]
        expect(filteredResult.proof).to.deep.eq(expectedProof)
        expect(filteredResult.captchaId).to.eq(captchaSolutionsSalted[0].captchaId)
    })

    // it('Dapp User sending an invalid captchas causes error', async (): Promise<void> => {
    //     const { requestHash } = await createMockCaptchaSolutionsAndRequestHash();
    //
    //     await env.contractInterface!.changeSigner(env,  provider.mnemonic as string);
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
    // it('Dapp User sending solutions without committing to blockchain causes error', async (): Promise<void> => {
    //     const { captchaSolutions, requestHash } = await createMockCaptchaSolutionsAndRequestHash();
    //
    //     await env.contractInterface!.changeSigner(env,  provider.mnemonic as string);
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
    // it('No proofs are returned if commitment found and solution is incorrect', async (): Promise<void> => {
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
    //     await env.contractInterface!.changeSigner(env,  dappUser.mnemonic);
    //     const dappUserTasks = new Tasks(env);
    //
    //     await ,dappUserTasks.contractApi.dappUserCommit(
    //         dapp.contractAccount as string,
    //         datasetId as string,
    //         commitmentId,
    //         provider.address as string
    //     );
    //     // next part contains internal contract calls that must be run by provider
    //     await env.contractInterface!.changeSigner(env,  provider.mnemonic as string);
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

    it('Validates the received captchas length', async (): Promise<void> => {
        const providerAccount = await getUser(env, AccountKey.providersWithStakeAndDataset)

        const { captchaSolutions } = await createMockCaptchaSolutionsAndRequestHash()

        const providerTasks = await getSignedTasks(env, providerAccount)

        // All of the captchaIds present in the solutions should be in the database
        expect(async function () {
            await providerTasks.validateReceivedCaptchasAgainstStoredCaptchas(captchaSolutions)
        }).to.not.throw()
    })

    it('Builds the tree and gets the commitment', async (): Promise<void> => {
        try {
            const { captchaSolutions, dappUserAccount, userSignature } =
                await createMockCaptchaSolutionsAndRequestHash()

            const dappAccount = await getUser(env, AccountKey.dappsWithStake)

            const tasks = await getSignedTasks(env, dappUserAccount)

            const initialTree = new CaptchaMerkleTree()
            const captchasHashed = captchaSolutions.map((captcha) => computeCaptchaSolutionHash(captcha))

            initialTree.build(captchasHashed)
            const initialCommitmentId = initialTree.root!.hash

            const providerAccount = await getUser(env, AccountKey.providersWithStakeAndDataset)

            const provider = (await tasks.contract.query.getProviderDetails(accountAddress(providerAccount))).value
                .unwrap()
                .unwrap()
            const providerTasks = await getSignedTasks(env, providerAccount)
            const completedAt = (await env.api.rpc.chain.getBlock()).block.header.number.toNumber()
            const requestedAt = completedAt - 1
            const commit = {
                dapp: accountContract(dappAccount),
                datasetId: provider.datasetId.toString(),
                id: initialCommitmentId,
                provider: accountAddress(providerAccount),
                user: accountAddress(dappUserAccount),
                status: CaptchaStatus.approved,
                completedAt,
                requestedAt,
                userSignaturePart1: [...userSignature.slice(0, userSignature.length / 2)],
                userSignaturePart2: [...userSignature.slice(userSignature.length / 2)],
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
            const commitment = (await tasks.contract.query.getCaptchaSolutionCommitment(commitmentId)).value
                .unwrap()
                .unwrap()
            expect(commitment).to.not.be.undefined
        } catch (e) {
            console.log(e)
            throw e
        }
    })

    it('BuildTreeAndGetCommitment throws if commitment does not exist', async (): Promise<void> => {
        const { captchaSolutions, dappUserAccount } = await createMockCaptchaSolutionsAndRequestHash()

        const tasks = await getSignedTasks(env, dappUserAccount)

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

    it('Validates the Dapp User Solution Request is Pending', async (): Promise<void> => {
        const { dappUserAccount, captchaSolutions, providerAccount } = await createMockCaptchaSolutionsAndRequestHash()

        const tasks = await getSignedTasks(env, dappUserAccount)

        const pendingRequestSalt = randomAsHex()
        const captchaIds = captchaSolutions.map((c) => c.captchaId)

        const requestHash = computePendingRequestHash(captchaIds, accountAddress(dappUserAccount), pendingRequestSalt)

        await env.db!.storeDappUserPending(
            hexHash(accountAddress(dappUserAccount)),
            requestHash,
            pendingRequestSalt,
            99999999999999
        )
        const pendingRecord = await env.db!.getDappUserPending(requestHash)
        const valid = await tasks.validateDappUserSolutionRequestIsPending(
            requestHash,
            pendingRecord,
            accountAddress(dappUserAccount),
            captchaIds
        )

        expect(valid).to.be.true
    })

    it('Get random captchas and request hash', async (): Promise<void> => {
        try {
            // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
            // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
            // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
            // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
            // NOTE this test can fail if the contract contains Providers that
            // are not present in the database
            // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
            // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
            // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
            // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
            const dappUserAccount = await getUser(env, AccountKey.dappUsers)

            const dappAccount = await getUser(env, AccountKey.dappsWithStake)

            // there must be at least one provider in the contract and db
            const _unused = await getUser(env, AccountKey.providersWithStakeAndDataset)

            const dappUserTasks = await getSignedTasks(env, dappUserAccount)
            const solvedCaptchaCount = env.config.captchas.solved.count
            const unsolvedCaptchaCount = env.config.captchas.unsolved.count

            console.log(
                'userAccount',
                accountAddress(dappUserAccount),
                'dappContractAccount',
                accountContract(dappAccount)
            )
            const { provider } = (
                await dappUserTasks.contract.query.getRandomActiveProvider(
                    accountAddress(dappUserAccount),
                    accountContract(dappAccount)
                )
            ).value
                .unwrap()
                .unwrap()
            const { captchas, requestHash } = await dappUserTasks.getRandomCaptchasAndRequestHash(
                provider.datasetId.toString(),
                hexHash(accountAddress(dappUserAccount))
            )

            expect(captchas.length).to.equal(solvedCaptchaCount + unsolvedCaptchaCount)
            const pendingRequest = env.db?.getDappUserPending(requestHash)

            expect(pendingRequest).to.not.be.null
        } catch (err) {
            throw new ProsopoEnvError(err, 'RandomCaptchasAndRequestHash')
        }
    })

    it('Validate provided captcha dataset', async (): Promise<void> => {
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

    it('Validate provided captcha dataset - fail', async (): Promise<void> => {
        const providerAccount = await getUser(env, AccountKey.providers)

        const tasks = await getSignedTasks(env, providerAccount)

        let provider = (await tasks.contract.query.getProviderDetails(accountAddress(providerAccount))).value
            .unwrap()
            .unwrap()

        const resultProviderUpdate1 = (
            await tasks.contract.tx.providerUpdate(provider.url, provider.fee as unknown as number, PROVIDER_PAYEE, {
                value: 0,
            })
        ).result
        expect(resultProviderUpdate1?.isError).to.be.false
        provider = (await tasks.contract.query.getProviderDetails(accountAddress(providerAccount))).value
            .unwrap()
            .unwrap()
        expect(provider.status).to.equal('Inactive')
        const resultproviderUpdate2 = (
            await tasks.contract.tx.providerUpdate(provider.url, provider.fee as unknown as number, PROVIDER_PAYEE, {
                value: providerStakeThreshold,
            })
        ).result
        expect(resultproviderUpdate2?.isError).to.be.false

        await tasks.providerSetDatasetFromFile(JSON.parse(JSON.stringify(captchaData)))

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

    it('Provider deregister', async (): Promise<void> => {
        const providerAccount = await getUser(env, AccountKey.providersWithStake)

        const tasks = await getSignedTasks(env, providerAccount)
        const isError = (await tasks.contract.tx.providerDeregister()).result?.isError
        expect(isError).to.be.false
    })

    // TODO find out what is making this fail occasionally
    // it('Calculate captcha solution on the basis of Dapp users provided solutions', async (): Promise<void> => {
    //     const providerAccount = await getUser(env, AccountKey.providersWithStakeAndDataset)
    //     const providerTasks = await getSignedTasks(env, providerAccount)
    //     const providerDetails = await providerTasks.contractApi.getProviderDetails(accountAddress(providerAccount))
    //     const dappAccount = await getUser(env, AccountKey.dapps)
    //
    //     const randomCaptchasResult = await providerTasks.db.getRandomCaptcha(false, providerDetails.datasetId)
    //     if (randomCaptchasResult) {
    //         const unsolvedCaptcha = randomCaptchasResult[0]
    //         const solution = [
    //             unsolvedCaptcha.items[0].hash || '',
    //             unsolvedCaptcha.items[2].hash || '',
    //             unsolvedCaptcha.items[3].hash || '',
    //         ]
    //         const captchaSolution: CaptchaSolution = { ...unsolvedCaptcha, solution, salt: 'blah' }
    //         const commitments: string[] = []
    //         for (let count = 0; count < 10; count++) {
    //             const commitmentId = hexHash(`test${count}`)
    //             commitments.push(commitmentId)
    //             await providerTasks.db.storeDappUserSolution(
    //                 [captchaSolution],
    //                 commitmentId,
    //                 randomAsHex(),
    //                 accountContract(dappAccount),
    //                 providerDetails.datasetId.toString()
    //             )
    //             const userSolutions = await providerTasks.db.getDappUserSolutionById(commitmentId)
    //             expect(userSolutions).to.be.not.empty
    //         }
    //
    //         const result = await providerTasks.calculateCaptchaSolutions()
    //         expect(result).to.equal(1)
    //
    //         for (const commitment of commitments) {
    //             const userSolution = await providerTasks.db.getDappUserSolutionById(commitment)
    //             expect(userSolution?.processed).to.be.true
    //         }
    //
    //         const providerDetailsNew = await providerTasks.contractApi.getProviderDetails(
    //             accountAddress(providerAccount)
    //         )
    //
    //         const captchas = await providerTasks.db.getAllCaptchasByDatasetId(providerDetailsNew.datasetId.toString())
    //         expect(captchas?.every((captcha) => captcha.datasetId === providerDetailsNew.datasetId.toString())).to.be
    //             .true
    //
    //         expect(providerDetails.datasetId).to.not.equal(providerDetailsNew.datasetId)
    //
    //         expect(Promise.resolve(providerTasks.db.getCaptchaById([unsolvedCaptcha.captchaId]))).to.be.rejected.then(
    //             (error) => {
    //                 expect(error.message).to.equal('Failed to get captcha')
    //             }
    //         )
    //     } else {
    //         throw new ProsopoEnvError('DATABASE.CAPTCHA_GET_FAILED')
    //     }
    // })
})
