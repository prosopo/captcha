// Copyright 2021-2022 Prosopo (UK) Ltd.
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
import { Keyring } from '@polkadot/keyring'
import { Hash } from '@polkadot/types/interfaces'
import { blake2AsHex, cryptoWaitReady, decodeAddress, mnemonicGenerate } from '@polkadot/util-crypto'
import {
    BigNumber,
    buildTx,
    calculateItemHashes,
    CaptchaMerkleTree,
    computeCaptchaSolutionHash,
    convertCaptchaToCaptchaSolution,
    getEventsFromMethodName,
    hexHash,
    matchItemsToSolutions,
    ProsopoEnvError
} from '@prosopo/contract'
import { IDappAccount, IProviderAccount, IUserAccount } from '../types/accounts'
import { Tasks } from './tasks'

export async function generateMnemonic(keyring?: Keyring): Promise<[string, string]> {
    if (!keyring) {
        keyring = new Keyring({ type: 'sr25519' });
    }
    await cryptoWaitReady();
    const mnemonic = mnemonicGenerate();
    const account = keyring.addFromMnemonic(mnemonic);
    return [mnemonic, account.address];
}

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
        throw new ProsopoEnvError(`${mnemonic} balance too low: ${balance}`);
    }

    const api = env.contractInterface.network.api;
    await buildTx(
        api.registry,
        api.tx.balances.transfer(address, amount),
        pair.address, // from
        { signer: env.network.signer }
    );
}


export async function setupProvider(env, provider: IProviderAccount): Promise<Hash> {
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

export async function setupDapp(env, dapp: IDappAccount): Promise<void> {
    const tasks = new Tasks(env)
    const logger = env.logger;
    await env.contractInterface.changeSigner(dapp.mnemonic)
    logger.info('   - dappRegister')
    await tasks.dappRegister(hexHash(dapp.serviceOrigin), dapp.contractAccount, blake2AsHex(decodeAddress(dapp.optionalOwner)))
    logger.info('   - dappFund')
    await tasks.dappFund(dapp.contractAccount, dapp.fundAmount)
}

export async function setupDappUser(env, dappUser: IUserAccount, provider: IProviderAccount, dapp: IDappAccount): Promise<string | undefined> {
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
        const captchaSolHashes = captchaSols.map(({ solution, ...rest }, i) => {
            captchas[i].items = calculateItemHashes(captchas[i].items);

            return computeCaptchaSolutionHash({
                ...rest,
                solution: matchItemsToSolutions(solution, calculateItemHashes(captchas[i].items)),
            });
        });
        tree.build(captchaSolHashes)
        await env.contractInterface.changeSigner(dappUser.mnemonic)
        const captchaData = await tasks.getCaptchaData(providerOnChain.captcha_dataset_id.toString())
        if (captchaData.merkle_tree_root.toString() !== providerOnChain.captcha_dataset_id.toString()) {
            throw new ProsopoEnvError(`Cannot find captcha data id`, setupDappUser.name, providerOnChain.captcha_dataset_id.toString())
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
            throw new ProsopoEnvError('commitmentId missing')
        }
        return commitmentId
    } else {
        throw new ProsopoEnvError('Provider not found')
    }
}

export async function approveOrDisapproveCommitment(env, solutionHash: string, approve: boolean, provider: IProviderAccount) {
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
