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
import { DefinitionKeys, getEventsFromMethodName, stringToHexPadded } from '@prosopo/contract'
import { hexHash } from '@prosopo/datasets'
import { ProsopoEnvError } from '@prosopo/common'
import { IDappAccount, IProviderAccount } from '../types/accounts'
import { Tasks } from './tasks'
import { createType } from '@polkadot/types'
import { ProsopoEnvironment } from '../types/index'
import { AnyNumber } from '@polkadot/types-codec/types'
import { BN } from '@polkadot/util'

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
const MAX_ACCOUNT_FUND = 10 // 10 UNIT

function getNextMnemonic() {
    current = (current + 1) % mnemonic.length

    return mnemonic[current]
}

export async function sendFunds(
    env: ProsopoEnvironment,
    address: string,
    who: string,
    amount: AnyNumber
): Promise<void> {
    await env.api.isReady
    const mnemonic = getNextMnemonic()
    const pair = env.keyring.addFromMnemonic(mnemonic)
    const {
        // @ts-ignore
        data: { free: previousFree },
    } = await env.contractInterface.api.query.system.account(pair.address)
    if (previousFree.lt(amount)) {
        throw new ProsopoEnvError('DEVELOPER.BALANCE_TOO_LOW', undefined, {
            mnemonic,
            previousFree,
        })
    }

    const api = env.contractInterface.api

    await api.tx.balances.transfer(address, amount).signAndSend(pair)
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
        createType(env.contractInterface.abi.registry, payeeKey, provider.payee),
        provider.address
    )
    logger.info('   - providerStake')
    await tasks.contractApi.providerUpdate(
        stringToHexPadded(provider.serviceOrigin),
        provider.fee,
        createType(env.contractInterface.abi.registry, payeeKey, provider.payee),
        provider.address,
        provider.stake
    )
    logger.info('   - providerAddDataset')
    const datasetResult = await tasks.providerAddDatasetFromFile(provider.datasetFile)
    const events = getEventsFromMethodName(datasetResult, 'ProviderAddDataset')
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

/**
 * Takes the  providerStakeDefault and works out if multiplying it by 100 or
 * stakeMultiplier is greater than the maxStake. If it is, it returns the maxStake
 * If chain decimals = 12, 1 UNIT = 1e12
 * @param env
 * @param providerStakeDefault
 * @param stakeMultiplier
 */
export function getStakeAmount(env: ProsopoEnvironment, providerStakeDefault: BN, stakeMultiplier?: number): BN {
    const chainDecimals = new BN(env.api.registry.chainDecimals[0])

    const unit = new BN(10 ** chainDecimals.toNumber())

    // We want to give each provider 100 * the required stake or 1 UNIT, whichever is greater, so that gas fees can be
    // refunded to the Dapp User from within the contract
    const stake100 = BN.max(providerStakeDefault.muln(stakeMultiplier || 100), unit)

    // We don't want to stake any more than MAX_ACCOUNT_FUND UNIT per provider as the test account funds will be depleted too quickly
    const maxStake = unit.muln(MAX_ACCOUNT_FUND)

    if (stake100.lt(maxStake)) {
        env.logger.debug('Setting stake amount to', stake100.div(unit).toNumber(), 'UNIT')
        return providerStakeDefault.mul(stake100)
    }
    env.logger.debug('Setting stake amount to', maxStake.div(unit).toNumber(), 'UNIT')
    return maxStake
}

/**
 * Send funds to a test account, adding one more unit than the amount to be staked
 * @param env
 * @param stakeAmount
 */
export function getSendAmount(env: ProsopoEnvironment, stakeAmount: BN): BN {
    const chainDecimals = new BN(env.api.registry.chainDecimals[0])

    const unit = new BN(10 ** chainDecimals.toNumber())
    const sendAmount = new BN(stakeAmount).muln(2).add(unit.muln(MAX_ACCOUNT_FUND))
    // Should result in each account receiving a minimum of MAX_ACCOUNT_FUND UNIT
    env.logger.debug('Setting send amount to', sendAmount.div(unit).toString(), 'UNIT')
    return sendAmount
}
