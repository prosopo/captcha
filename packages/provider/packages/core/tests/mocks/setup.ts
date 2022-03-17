// Copyright (C) 2021-2022 Prosopo (UK) Ltd.
// This file is part of provider <https://github.com/prosopo-io/provider>.
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
// along with provider.  If not, see <http://www.gnu.org/licenses/>.
import { Tasks } from '../../src/tasks/tasks'
import { hexHash } from '../../src/util'
import { blake2AsHex, decodeAddress } from '@polkadot/util-crypto'
import { CaptchaMerkleTree } from '../../src/merkle'
import { computeCaptchaSolutionHash, convertCaptchaToCaptchaSolution } from '../../src/captcha'
import { Hash } from '@polkadot/types/interfaces'
import { TestAccount, TestDapp, TestProvider } from './accounts'
import { getEventsFromMethodName } from '@prosopo/contract';

export async function displayBalance (env, address, who) {
    const balance = await env.contractInterface.network.api.query.system.account(address)
    console.log(who, ' Balance: ', balance.data.free.toHuman())
    return balance
}

export async function sendFunds (env, address, who, amount): Promise<void> {
    await env.contractInterface.network.api.isReady
    const balance = await env.contractInterface.network.api.query.system.account(address)
    const signerAddresses: string[] = await env.contractInterface.network.getAddresses()
    const Alice = signerAddresses[0]
    const alicePair = env.contractInterface.network.keyring.getPair(Alice)
    const AliceBalance = await env.contractInterface.network.api.query.system.account(alicePair.address)
    if (AliceBalance < amount) {
        throw new Error(`Alice balance too low: , ${AliceBalance}`)
    }
    const api = env.contractInterface.network.api
    if (balance.data.free.isEmpty) {
        await env.contractInterface.patract.buildTx(
            api.registry,
            api.tx.balances.transfer(address, amount),
            alicePair.address // from
        )
    }
}

export async function setupProvider (env, provider: TestProvider): Promise<Hash> {
    await env.contractInterface.changeSigner(provider.mnemonic)
    const tasks = new Tasks(env)
    console.log('   - providerRegister')
    await tasks.providerRegister(hexHash(provider.serviceOrigin), provider.fee, provider.payee, provider.address)
    console.log('   - providerStake')
    await tasks.providerUpdate(hexHash(provider.serviceOrigin), provider.fee, provider.payee, provider.address, provider.stake)
    console.log('   - providerAddDataset')
    const datasetResult = await tasks.providerAddDataset(provider.datasetFile)
    const events = getEventsFromMethodName(datasetResult, 'providerAddDataset')
    // @ts-ignore
    return events[0].args[1] as Hash
}

export async function setupDapp (env, dapp: TestDapp): Promise<void> {
    const tasks = new Tasks(env)
    await env.contractInterface.changeSigner(dapp.mnemonic)
    console.log('   - dappRegister')
    await tasks.dappRegister(hexHash(dapp.serviceOrigin), dapp.contractAccount, blake2AsHex(decodeAddress(dapp.optionalOwner)))
    console.log('   - dappFund')
    await tasks.dappFund(dapp.contractAccount, dapp.fundAmount)
}

export async function setupDappUser (env, dappUser: TestAccount, provider: TestProvider, dapp: TestDapp): Promise<string | undefined> {
    await env.contractInterface.changeSigner(dappUser.mnemonic)

    // This section is doing everything that the ProCaptcha repo will eventually be doing in the client browser
    //   1. Get captcha JSON
    //   2. Add solution
    //   3. Send merkle tree solution to Blockchain
    //   4. Send clear solution to Provider
    const tasks = new Tasks(env)
    console.log('   - getCaptchaWithProof')
    const providerOnChain = await tasks.getProviderDetails(provider.address)
    if (providerOnChain) {
        const solved = await tasks.getCaptchaWithProof(providerOnChain.captcha_dataset_id.toString(), true, 1)
        const unsolved = await tasks.getCaptchaWithProof(providerOnChain.captcha_dataset_id.toString(), false, 1)
        solved[0].captcha.solution = [2, 3, 4]
        unsolved[0].captcha.solution = [1]
        solved[0].captcha.salt = '0xuser1'
        unsolved[0].captcha.salt = '0xuser2'
        const tree = new CaptchaMerkleTree()
        const captchas = [solved[0].captcha, unsolved[0].captcha]
        const captchaSols = captchas.map(captcha => convertCaptchaToCaptchaSolution(captcha))
        const captchaSolHashes = captchaSols.map(computeCaptchaSolutionHash)
        tree.build(captchaSolHashes)
        await env.contractInterface.changeSigner(dappUser.mnemonic)
        const captchaData = await tasks.getCaptchaData(providerOnChain.captcha_dataset_id.toString())
        if (captchaData.merkle_tree_root.toString() !== providerOnChain.captcha_dataset_id.toString()) {
            throw new Error(`Cannot find captcha data id: ${providerOnChain.captcha_dataset_id.toString()}`)
        }
        const commitmentId = tree.root?.hash
        console.log('   - dappUserCommit')
        if (typeof (commitmentId) === 'string') {
            console.log('   -   Contract Account: ', dapp.contractAccount)
            console.log('   -   Captcha Dataset ID: ', providerOnChain.captcha_dataset_id)
            console.log('   -   Solution Root Hash: ', commitmentId)
            console.log('   -   Provider Address: ', provider.address)
            console.log('   -   Captchas: ', captchas)
            await tasks.dappUserCommit(dapp.contractAccount, providerOnChain.captcha_dataset_id.toString(), commitmentId, provider.address)
            const commitment = await tasks.getCaptchaSolutionCommitment(commitmentId)
        } else {
            throw new Error('commitmentId missing')
        }
        return commitmentId
    } else {
        throw new Error('Provider not found')
    }
}

export async function approveOrDisapproveCommitment (env, solutionHash: string, approve: boolean, provider: TestProvider) {
    const tasks = new Tasks(env)
    // This stage would take place on the Provider node after checking the solution was correct
    // We need to assume that the Provider has access to the Dapp User's merkle tree root or can construct it from the
    // raw data that was sent to them
    await env.contractInterface.changeSigner(provider.mnemonic)
    if (approve) {
        console.log('   -   Approving commitment')
        await tasks.providerApprove(solutionHash, 100)
    } else {
        console.log('   -   Disapproving commitment')
        await tasks.providerDisapprove(solutionHash)
    }
}
