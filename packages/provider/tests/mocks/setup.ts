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
import { Hash } from '@polkadot/types/interfaces'
import { blake2AsHex, decodeAddress } from '@polkadot/util-crypto'
import { BigNumber, buildTx, CaptchaMerkleTree, computeCaptchaSolutionHash, convertCaptchaToCaptchaSolution, getEventsFromMethodName, hexHash } from '@prosopo/contract'
import { Tasks } from '../../src/tasks/tasks'
import { TestAccount, TestDapp, TestProvider } from './accounts'

export async function displayBalance(env, address, who) {
    const logger = env.logger;
    const balance = await env.contractInterface.network.api.query.system.account(address)
    logger.info(who, ' Balance: ', balance.data.free.toHuman())
    return balance
}

const mnemonic = ['//Alice', '//Bob', '//Charlie', '//Dave', '//Eve', '//Ferdie'];
let current = -1;

function getNextMnemonic() {
    current = (current + 1) % mnemonic.length;

    return mnemonic[current];
}

export async function sendFunds(env, address, who, amount: BigNumber): Promise<void> {
    await env.contractInterface.network.api.isReady;
    const mnemonic = getNextMnemonic();
    const pair = env.contractInterface.network.keyring.addFromMnemonic(mnemonic);
    const balance = await env.contractInterface.network.api.query.system.account(pair.address);

    if (balance < amount) {
        throw new Error(`${mnemonic} balance too low: ${balance}`);
    }

    const api = env.contractInterface.network.api;
    await buildTx(
        api.registry,
        api.tx.balances.transfer(address, amount),
        pair.address, // from
        { signer: env.network.signer }
    );
}

// TODO: fund as in setupDapp? set env default value. // sendFunds
export async function setupProvider(env, provider: TestProvider): Promise<Hash> {
    await env.contractInterface.changeSigner(provider.mnemonic)
    const logger = env.logger;
    const tasks = new Tasks(env)
    logger.info('   - providerRegister')
    await tasks.providerRegister(hexHash(provider.serviceOrigin), provider.fee, provider.payee, provider.address)
    logger.info('   - providerStake')
    await tasks.providerUpdate(hexHash(provider.serviceOrigin), provider.fee, provider.payee, provider.address, provider.stake)
    logger.info('   - providerAddDataset')
    const datasetResult = await tasks.providerAddDataset(provider.datasetFile)
    const events = getEventsFromMethodName(datasetResult, 'providerAddDataset')
    // @ts-ignore
    return events[0].args[1] as Hash
}

export async function setupDapp(env, dapp: TestDapp): Promise<void> {
    const tasks = new Tasks(env)
    const logger = env.logger;
    await env.contractInterface.changeSigner(dapp.mnemonic)
    logger.info('   - dappRegister')
    await tasks.dappRegister(hexHash(dapp.serviceOrigin), dapp.contractAccount, blake2AsHex(decodeAddress(dapp.optionalOwner)))
    logger.info('   - dappFund')
    await tasks.dappFund(dapp.contractAccount, dapp.fundAmount)
}

export async function setupDappUser(env, dappUser: TestAccount, provider: TestProvider, dapp: TestDapp): Promise<string | undefined> {
    await env.contractInterface.changeSigner(dappUser.mnemonic)

    // This section is doing everything that the ProCaptcha repo will eventually be doing in the client browser
    //   1. Get captcha JSON
    //   2. Add solution
    //   3. Send merkle tree solution to Blockchain
    //   4. Send clear solution to Provider
    const tasks = new Tasks(env)
    const logger = env.logger;
    logger.info('   - getCaptchaWithProof')
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
        logger.info('   - dappUserCommit')
        if (typeof (commitmentId) === 'string') {
            logger.info('   -   Contract Account: ', dapp.contractAccount)
            logger.info('   -   Captcha Dataset ID: ', providerOnChain.captcha_dataset_id)
            logger.info('   -   Solution Root Hash: ', commitmentId)
            logger.info('   -   Provider Address: ', provider.address)
            logger.info('   -   Captchas: ', captchas)
            await tasks.dappUserCommit(dapp.contractAccount, providerOnChain.captcha_dataset_id, commitmentId, provider.address)
            const commitment = await tasks.getCaptchaSolutionCommitment(commitmentId)
        } else {
            throw new Error('commitmentId missing')
        }
        return commitmentId
    } else {
        throw new Error('Provider not found')
    }
}

export async function approveOrDisapproveCommitment(env, solutionHash: string, approve: boolean, provider: TestProvider) {
    const tasks = new Tasks(env)
    const logger = env.logger;
    // This stage would take place on the Provider node after checking the solution was correct
    // We need to assume that the Provider has access to the Dapp User's merkle tree root or can construct it from the
    // raw data that was sent to them
    await env.contractInterface.changeSigner(provider.mnemonic)
    if (approve) {
        logger.info('   -   Approving commitment')
        await tasks.providerApprove(solutionHash, 100)
    } else {
        logger.info('   -   Disapproving commitment')
        await tasks.providerDisapprove(solutionHash)
    }
}
