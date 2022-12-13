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
import { BigNumber, DefinitionKeys, buildTx, getEventsFromMethodName, stringToHexPadded } from '@prosopo/contract'
import { hexHash } from '@prosopo/datasets'
import { ProsopoEnvError } from '@prosopo/common'
import { IDappAccount, IProviderAccount } from '../types/accounts'
import { Tasks } from './tasks'
import { createType } from '@polkadot/types'
import { ProsopoEnvironment } from '../types/index'

export async function generateMnemonic(keyring?: Keyring): Promise<[string, string]> {
    if (!keyring) {
        keyring = new Keyring({ type: 'sr25519' })
    }
    await cryptoWaitReady()
    const mnemonic = mnemonicGenerate()
    const account = keyring.addFromMnemonic(mnemonic)
    return [mnemonic, account.address]
}

export async function displayBalance(env, address, who) {
    const logger = env.logger
    const balance = await env.contractInterface.api.query.system.account(address)
    logger.info(who, ' Balance: ', balance.data.free.toHuman())
    return balance
}

const mnemonic = ['//Alice', '//Bob', '//Charlie', '//Dave', '//Eve', '//Ferdie']
let current = -1

function getNextMnemonic() {
    current = (current + 1) % mnemonic.length

    return mnemonic[current]
}

export async function sendFunds(
    env: ProsopoEnvironment,
    address: string,
    who: string,
    amount: BigNumber
): Promise<void> {
    await env.contractInterface.api.isReady
    const mnemonic = getNextMnemonic()
    const pair = env.keyring.addFromMnemonic(mnemonic)
    // @ts-ignore
    const {
        // @ts-ignore
        data: { free: previousFree },
    } = await env.contractInterface.api.query.system.account(pair.address)
    if (previousFree < amount) {
        throw new ProsopoEnvError('DEVELOPER.BALANCE_TOO_LOW', undefined, {
            mnemonic,
            previousFree,
        })
    }

    const api = env.contractInterface.api
    await buildTx(
        api.registry,
        api.tx.balances.transfer(address, amount),
        pair // from
    )
}

export async function setupProvider(env, provider: IProviderAccount): Promise<Hash> {
    await env.changeSigner(provider.mnemonic)
    const logger = env.logger
    const tasks = new Tasks(env)
    const payeeKey: DefinitionKeys = 'ProsopoPayee'
    logger.info('   - providerRegister')
    await tasks.contractApi.providerRegister(
        stringToHexPadded(provider.serviceOrigin),
        provider.fee,
        createType(env.api.registry, payeeKey, provider.payee),
        provider.address
    )
    logger.info('   - providerStake')
    await tasks.contractApi.providerUpdate(
        stringToHexPadded(provider.serviceOrigin),
        provider.fee,
        createType(env.api.registry, payeeKey, provider.payee),
        provider.address,
        provider.stake
    )
    logger.info('   - providerAddDataset')
    const datasetResult = await tasks.providerAddDatasetFromFile(provider.datasetFile)
    const events = getEventsFromMethodName(datasetResult, 'providerAddDataset')
    return events[0].args[1] as Hash
}

export async function setupDapp(env, dapp: IDappAccount): Promise<void> {
    const tasks = new Tasks(env)
    const logger = env.logger
    await env.changeSigner(dapp.mnemonic)
    logger.info('   - dappRegister')
    await tasks.contractApi.dappRegister(
        hexHash(dapp.serviceOrigin),
        dapp.contractAccount,
        blake2AsHex(decodeAddress(dapp.optionalOwner))
    )
    logger.info('   - dappFund')
    await tasks.contractApi.dappFund(dapp.contractAccount, dapp.fundAmount)
}

// export async function setupDappUser(
//     env,
//     dappUser: IUserAccount,
//     provider: IProviderAccount,
//     dapp: IDappAccount
// ): Promise<string | undefined> {
//     await env.changeSigner(dappUser.mnemonic)
//
//     // This section is doing everything that the ProCaptcha repo will eventually be doing in the client browser
//     //   1. Get captcha JSON
//     //   2. Add solution
//     //   3. Send merkle tree solution to Blockchain
//     //   4. Send clear solution to Provider
//     const tasks = new Tasks(env)
//     const logger = env.logger
//     logger.info('   - getCaptchaWithProof')
//     const providerOnChain = await tasks.contractApi.getProviderDetails(provider.address)
//     if (providerOnChain) {
//         const solved = await tasks.contractApi.getCaptchaWithProof(providerOnChain.dataset_id.toString(), true, 1)
//         const unsolved = await tasks.contractApi.getCaptchaWithProof(providerOnChain.dataset_id.toString(), false, 1)
//         solved[0].captcha.solution = matchItemsToSolutions([2, 3, 4], solved[0].captcha.items)
//         unsolved[0].captcha.solution = matchItemsToSolutions([1], unsolved[0].captcha.items)
//         solved[0].captcha.salt = '0xuser1'
//         unsolved[0].captcha.salt = '0xuser2'
//         const tree = new CaptchaMerkleTree()
//         const captchas = [solved[0].captcha, unsolved[0].captcha]
//         const captchaSols = captchas.map((captcha) => convertCaptchaToCaptchaSolution(captcha))
//         const captchaSolHashes = captchaSols.map((captcha, i) => {
//             captchas[i].items = calculateItemHashes(captchas[i].items)
//
//             return computeCaptchaSolutionHash(captcha)
//         })
//         tree.build(captchaSolHashes)
//         await env.changeSigner(dappUser.mnemonic)
//         const captchaData = await tasks.contractApi.getCaptchaData(providerOnChain.dataset_id.toString())
//         if (captchaData.merkle_tree_root.toString() !== providerOnChain.dataset_id.toString()) {
//             throw new ProsopoEnvError(
//                 'DEVELOPER.CAPTCHA_ID_MISSING',
//                 setupDappUser.name,
//                 {},
//                 providerOnChain.dataset_id.toString()
//             )
//         }
//         const commitmentId = tree.root?.hash
//         logger.info('   - dappUserCommit')
//         if (typeof commitmentId === 'string') {
//             logger.info('   -   Contract Account: ', dapp.contractAccount)
//             logger.info('   -   Captcha Dataset ID: ', providerOnChain.dataset_id)
//             logger.info('   -   Solution Root Hash: ', commitmentId)
//             logger.info('   -   Provider Address: ', provider.address)
//             logger.info('   -   Captchas: ', captchas)
//             await tasks.contractApi.dappUserCommit(dapp.contractAccount, providerOnChain.dataset_id, commitmentId, provider.address)
//             const commitment = await tasks.contractApi.getCaptchaSolutionCommitment(commitmentId)
//         } else {
//             throw new ProsopoEnvError('DEVELOPER.COMMITMENT_ID_MISSING')
//         }
//         return commitmentId
//     } else {
//         throw new ProsopoEnvError('DEVELOPER.PROVIDER_NOT_FOUND')
//     }
// }

export async function approveOrDisapproveCommitment(
    env,
    solutionHash: string,
    approve: boolean,
    provider: IProviderAccount
) {
    const tasks = new Tasks(env)
    const logger = env.logger
    // This stage would take place on the Provider node after checking the solution was correct
    // We need to assume that the Provider has access to the Dapp User's merkle tree root or can construct it from the
    // raw data that was sent to them
    await env.changeSigner(provider.mnemonic)
    if (approve) {
        logger.info('   -   Approving commitment')
        await tasks.contractApi.providerApprove(solutionHash, 100)
    } else {
        logger.info('   -   Disapproving commitment')
        await tasks.contractApi.providerDisapprove(solutionHash)
    }
}
