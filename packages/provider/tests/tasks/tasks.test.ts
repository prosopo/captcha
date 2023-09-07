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
import { AccountKey } from '../dataUtils/DatabaseAccounts.js'
import {
    ArgumentTypes,
    CaptchaSolution,
    CaptchaStatus,
    Commit,
    DappPayee,
    DappUserSolutionResult,
} from '@prosopo/types'
import { BN, stringToHex, stringToU8a, u8aToHex } from '@polkadot/util'
import { CaptchaMerkleTree, computeCaptchaSolutionHash, computePendingRequestHash } from '@prosopo/datasets'
import { ContractDeployer, ProsopoContractError, getBlockNumber, getDispatchError, wrapQuery } from '@prosopo/contract'
import { DappAbiJSON, DappWasm } from '../dataUtils/dapp-example-contract/loadFiles.js'
import { EventRecord } from '@polkadot/types/interfaces'
import { KeypairType } from '@polkadot/util-crypto/types'
import { MockEnvironment } from '@prosopo/env'
import { PROVIDER, accountAddress, accountContract, accountMnemonic, getSignedTasks } from '../accounts.js'
import { ProsopoEnvError, getPair, hexHash, i18n } from '@prosopo/common'
import { ReturnNumber } from '@727-ventures/typechain-types'
import { ViteTestContext } from '@prosopo/env/mockenv.js'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { captchaData } from '../data/captchas.js'
import { createType } from '@polkadot/types'
import { getSendAmount, getStakeAmount, sendFunds } from '../dataUtils/funds.js'
import { getUser } from '../getUser.js'
import { parseBlockNumber } from '../../src/index.js'
import { randomAsHex, signatureVerify } from '@polkadot/util-crypto'
import { testConfig } from '@prosopo/config'

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function sleep(timeout) {
    await delay(timeout)
}

const PROVIDER_PAYEE = ArgumentTypes.Payee.dapp
declare module 'vitest' {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    export interface TestContext extends ViteTestContext {}
}

describe.sequential('CONTRACT TASKS', async function (): Promise<void> {
    beforeEach(async function (context) {
        context.ss58Format = 42
        context.pairType = 'sr25519' as KeypairType
        const alicePair = await getPair(context.pairType, context.ss58Format, '//Alice')
        console.log(testConfig)
        context.env = new MockEnvironment(alicePair, testConfig)
        try {
            await context.env.isReady()
        } catch (e) {
            throw new ProsopoEnvError(e, 'isReady')
        }
        const promiseStakeDefault: Promise<ReturnNumber> = wrapQuery(
            context.env.contractInterface.query.getProviderStakeThreshold,
            context.env.contractInterface.query
        )()
        context.providerStakeThreshold = new BN((await promiseStakeDefault).toNumber())
    })

    afterEach(async (context): Promise<void> => {
        if (context.env && 'db' in context.env) await context.env.db?.close()
    })

    /** Gets some static solved captchas and constructions captcha solutions from them
     *  Computes the request hash for these captchas and the dappUser and then stores the request hash in the mock db
     *  @return {CaptchaSolution[], string} captchaSolutions and requestHash
     */
    async function createMockCaptchaSolutionsAndRequestHash(env, pairType, ss58Format) {
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

        const blockNumber = (await getBlockNumber(env.api)).toNumber()

        if ('storeDappUserPending' in env.db!) {
            await env.db.storeDappUserPending(
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

        return {
            dappUserAccount,
            captchaSolutions,
            requestHash,
            providerAccount,
            dappContractAccount,
            userSalt,
            userSignature,
            blockNumber,
        }
    }

    test('Provider registration', async function ({ env, providerStakeThreshold }) {
        const [providerMnemonic, providerAddress] = env.createAccountAndAddToKeyring() || ['', '']
        const tasks = await getSignedTasks(env, [providerMnemonic, providerAddress])
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
        console.log(JSON.stringify(result.error, null, 4))
        expect(result?.error).to.be.undefined
    }, 8000)

    test('Provider update', async ({ env }): Promise<void> => {
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
    }, 8000)

    test('Provider add dataset', async ({ env }): Promise<void> => {
        const providerAccount = await getUser(env, AccountKey.providersWithStake)

        const tasks = await getSignedTasks(env, providerAccount)

        await tasks.providerSetDatasetFromFile(JSON.parse(JSON.stringify(captchaData)))
    }, 8000)

    test('Provider add dataset with too few captchas will fail', async ({ env }): Promise<void> => {
        const providerAccount = await getUser(env, AccountKey.providersWithStake)

        const tasks = await getSignedTasks(env, providerAccount)

        // copy captchaData and remove all but one captcha
        const dataset = { ...captchaData }
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

        const dataset = { ...captchaData }
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
            await tasks.providerSetDatasetFromFile(JSON.parse(JSON.stringify(captchaData)))
        } catch (e) {
            expect(e).to.match(/ProviderInactive/)
        }
    })

    test('Provider approve', async ({ env, pairType, ss58Format }): Promise<void> => {
        const { dappUserAccount, captchaSolutions, providerAccount, dappContractAccount, userSignature } =
            await createMockCaptchaSolutionsAndRequestHash(env, pairType, ss58Format)
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
        const completedAt = (await env.api.rpc.chain.getBlock()).block.header.number.toNumber()
        const requestedAt = completedAt - 1
        const providerTasks = await getSignedTasks(env, providerAccount)
        const commit = {
            dappContract: accountContract(dappContractAccount),
            datasetId: provider.datasetId,
            id: commitmentId,
            providerAccount: accountAddress(providerAccount),
            userAccount: accountAddress(dappUserAccount),
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

    test('Provider disapprove', async ({ env, pairType, ss58Format }): Promise<void> => {
        const { dappUserAccount, captchaSolutions, providerAccount, dappContractAccount, userSignature } =
            await createMockCaptchaSolutionsAndRequestHash(env, pairType, ss58Format)

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

        const completedAt = (await env.api.rpc.chain.getBlock()).block.header.number.toNumber()
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
            userSignaturePart1: [...userSignature.slice(0, userSignature.length / 2)],
            userSignaturePart2: [...userSignature.slice(userSignature.length / 2)],
        })
    })

    test('Timestamps check', async ({ env, pairType, ss58Format }): Promise<void> => {
        const salt = randomAsHex()

        const tree = new CaptchaMerkleTree()

        const { dappUserAccount, captchaSolutions, providerAccount, dappContractAccount, userSignature } =
            await createMockCaptchaSolutionsAndRequestHash(env, pairType, ss58Format)

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

        const completedAt = (await env.api.rpc.chain.getBlock()).block.header.number.toNumber()
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
            userSignaturePart1: [...userSignature.slice(0, userSignature.length / 2)],
            userSignaturePart2: [...userSignature.slice(userSignature.length / 2)],
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
            throw new ProsopoEnvError(err, 'providerDetails')
        }
    })

    test('Provider accounts', async ({ env }): Promise<void> => {
        const providerAccount = await getUser(env, AccountKey.providersWithStakeAndDataset)

        const tasks = await getSignedTasks(env, providerAccount)

        const result = (await tasks.contract.query.getAllProviderAccounts()).value.unwrap().unwrap()

        expect(result).to.be.an('array')
    })

    test('Dapp registration', async ({ env, providerStakeThreshold }): Promise<void> => {
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

    test('Dapp fund', async ({ env }): Promise<void> => {
        const dappAccount = await getUser(env, AccountKey.dappsWithStake)
        const tasks = await getSignedTasks(env, dappAccount)
        const value = createType(env.contractInterface.abi.registry, 'u128', '10')
        const dappContractAddress = accountContract(dappAccount)
        const dappBefore = (await tasks.contract.query.getDapp(dappContractAddress)).value.unwrap().unwrap()
        const result = (await tasks.contract.tx.dappFund(dappContractAddress, { value })).result
        expect(result?.isError).to.be.false
        const dappAfter = (await tasks.contract.query.getDapp(dappContractAddress)).value.unwrap().unwrap()
        expect(dappBefore.balance.toNumber() + value.toNumber()).to.equal(dappAfter.balance.toNumber())
    })

    //TODO reinstate when https://github.com/polkadot-js/api/issues/5410 is resolved

    // it.only('Dapp accounts', async ({env}): Promise<void> => {
    //     const account = await getUser(env, AccountKey.dapps)
    //
    //     const tasks = await changeSigner(env,  account)
    //
    //     const result = await tasks.contractApi.getDappAccounts()
    //     console.log(result)
    //
    //     expect(result).to.be.an('array')
    // })

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

    test('Captcha proofs are returned if commitment found and solution is correct', async ({
        env,
        pairType,
        ss58Format,
    }): Promise<void> => {
        // Construct a pending request hash between dappUserAccount, providerAccount and dappContractAccount
        const { captchaSolutions, requestHash, dappUserAccount, providerAccount, dappContractAccount, userSignature } =
            await createMockCaptchaSolutionsAndRequestHash(env, pairType, ss58Format)

        const dappUserTasks = await getSignedTasks(env, dappUserAccount)

        const tree = new CaptchaMerkleTree()
        const captchaSolutionsSalted = captchaSolutions
        const captchasHashed = captchaSolutionsSalted.map((captcha) => computeCaptchaSolutionHash(captcha))

        tree.build(captchasHashed)
        const commitmentId = tree.root!.hash

        const provider = (await dappUserTasks.contract.query.getProvider(accountAddress(providerAccount))).value
            .unwrap()
            .unwrap()

        const completedAt = (await env.api.rpc.chain.getBlock()).block.header.number.toNumber()
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
            userSignaturePart1: [...userSignature.slice(0, userSignature.length / 2)],
            userSignaturePart2: [...userSignature.slice(userSignature.length / 2)],
        })

        const commitment = (await providerTasks.contract.query.getCommit(commitmentId)).value.unwrap().unwrap()

        // next part contains internal contract calls that must be run by provider
        await env.api.rpc.chain.getBlockHash(commitment.completedAt)
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

    // test('Dapp User sending an invalid captchas causes error', async ({env}): Promise<void> => {
    //     const { requestHash } = await createMockCaptchaSolutionsAndRequestHash( env, pairType, ss58Format );
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
    // test('Dapp User sending solutions without committing to blockchain causes error', async ({env}): Promise<void> => {
    //     const { captchaSolutions, requestHash } = await createMockCaptchaSolutionsAndRequestHash( env, pairType, ss58Format );
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
    //     await env.contractInterface!.changeSigner(env,  dappUser.mnemonic);
    //     const dappUserTasks = new Tasks(env);
    //
    //     await ,dappUserTasks.contractApi.dappUserCommtest(
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

    test('Validates the received captchas length', async ({ env, pairType, ss58Format }): Promise<void> => {
        const providerAccount = await getUser(env, AccountKey.providersWithStakeAndDataset)

        const { captchaSolutions } = await createMockCaptchaSolutionsAndRequestHash(env, pairType, ss58Format)

        const providerTasks = await getSignedTasks(env, providerAccount)

        // All of the captchaIds present in the solutions should be in the database
        expect(async function () {
            await providerTasks.validateReceivedCaptchasAgainstStoredCaptchas(captchaSolutions)
        }).to.not.throw()
    })

    test('Builds the tree and gets the commitment', async ({ env, pairType, ss58Format }): Promise<void> => {
        try {
            const { captchaSolutions, dappUserAccount, userSignature } = await createMockCaptchaSolutionsAndRequestHash(
                env,
                pairType,
                ss58Format
            )

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
            const completedAt = (await env.api.rpc.chain.getBlock()).block.header.number.toNumber()
            const requestedAt = completedAt - 1
            const commit = {
                dappContract: accountContract(dappAccount),
                datasetId: provider.datasetId.toString(),
                id: initialCommitmentId,
                providerAccount: accountAddress(providerAccount),
                userAccount: accountAddress(dappUserAccount),
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

    test('BuildTreeAndGetCommitment throws if commitment does not exist', async ({
        env,
        pairType,
        ss58Format,
    }): Promise<void> => {
        const { captchaSolutions, dappUserAccount } = await createMockCaptchaSolutionsAndRequestHash(
            env,
            pairType,
            ss58Format
        )

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

    test('Validates the Dapp User Solution Request is Pending', async ({
        env,
        pairType,
        ss58Format,
    }): Promise<void> => {
        const { dappUserAccount, captchaSolutions, blockNumber } = await createMockCaptchaSolutionsAndRequestHash(
            env,
            pairType,
            ss58Format
        )

        const tasks = await getSignedTasks(env, dappUserAccount)

        const pendingRequestSalt = randomAsHex()
        const captchaIds = captchaSolutions.map((c) => c.captchaId)

        const requestHash = computePendingRequestHash(captchaIds, accountAddress(dappUserAccount), pendingRequestSalt)

        await env.db!.storeDappUserPending(
            hexHash(accountAddress(dappUserAccount)),
            requestHash,
            pendingRequestSalt,
            99999999999999,
            blockNumber
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
            const dappAccount = await getUser(env, AccountKey.dappsWithStake)
            // there must be at least one provider in the contract and db
            await getUser(env, AccountKey.providersWithStakeAndDataset)

            const dappUserTasks = await getSignedTasks(env, dappUserAccount)
            const solvedCaptchaCount = env.config.captchas.solved.count
            const unsolvedCaptchaCount = env.config.captchas.unsolved.count
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

    test('Provider deregister', async ({ env }): Promise<void> => {
        const providerAccount = await getUser(env, AccountKey.providersWithStake)

        const tasks = await getSignedTasks(env, providerAccount)
        const isError = (await tasks.contract.tx.providerDeregister()).result?.isError
        expect(isError).to.be.false
    })

    // TODO find out what is making this fail occasionally
    // test('Calculate captcha solution on the basis of Dapp users provided solutions', async ({env}): Promise<void> => {
    //     const providerAccount = await getUser(env, AccountKey.providersWithStakeAndDataset)
    //     const providerTasks = await getSignedTasks(env, providerAccount)
    //     const providerDetails = await providerTasks.contractApi.getProvider(accountAddress(providerAccount))
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
    //         const providerDetailsNew = await providerTasks.contractApi.getProvider(
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
