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
// TODO merge this with duplicate file in dev package
import { AnyNumber } from '@polkadot/types-codec/types'
import { BN } from '@polkadot/util/bn'
import { ISubmittableResult } from '@polkadot/types/types'
import { ProsopoEnvError } from '@prosopo/common'
import { ProsopoEnvironment } from '@prosopo/types-env'
import { TransactionQueue } from '@prosopo/tx'
import { at } from '@prosopo/util'
import { dispatchErrorHandler, oneUnit } from '@prosopo/contract'

const devMnemonics = ['//Alice', '//Bob', '//Charlie', '//Dave', '//Eve', '//Ferdie']
let current = -1
const MAX_ACCOUNT_FUND = 10000 // 10000 UNIT

/** Cycle through the dev mnemonics so as not to deplete the funds too quickly
 */
function getNextMnemonic() {
    current = (current + 1) % devMnemonics.length

    return at(devMnemonics, current)
}

/** Send funds from one of the development accounts to another account. */
export async function sendFunds(
    env: ProsopoEnvironment,
    address: string,
    who: string,
    amount: AnyNumber,
    txQueue?: TransactionQueue
): Promise<void> {
    await env.getApi().isReady
    const mnemonic = getNextMnemonic()
    const pair = env.keyring.addFromMnemonic(mnemonic)
    const nonce = await env.getApi().rpc.system.accountNextIndex(pair.address)
    const {
        data: { free: previousFree },
    } = await env.getContractInterface().api.query.system.account(pair.address)
    if (previousFree.lt(new BN(amount.toString()))) {
        throw new ProsopoEnvError('DEVELOPER.BALANCE_TOO_LOW', {
            context: { mnemonic, previousFree: previousFree.toString(), amount: amount.toString() },
        })
    }

    const api = env.getContractInterface().api
    const unit = oneUnit(env.getApi())
    const unitAmount = new BN(amount.toString()).div(unit).toString()
    env.logger.debug(
        'Sending funds from`',
        pair.address,
        '`to`',
        address,
        '`Amount:`',
        unitAmount,
        '`UNIT. Free balance:`',
        previousFree.div(unit).toString(),
        '`UNIT'
    )
    let result: Promise<ISubmittableResult>
    if (!txQueue) {
        // eslint-disable-next-line no-async-promise-executor
        result = new Promise<ISubmittableResult>(async (resolve, reject) => {
            const unsub = await api.tx.balances
                .transferAllowDeath(address, amount)
                .signAndSend(pair, { nonce }, (result: ISubmittableResult) => {
                    if (result.status.isInBlock || result.status.isFinalized) {
                        result.events
                            .filter(({ event: { section } }: any): boolean => section === 'system')
                            .forEach((event) => {
                                const {
                                    event: { method },
                                } = event

                                if (method === 'ExtrinsicFailed') {
                                    unsub()
                                    reject(dispatchErrorHandler(api.registry, event))
                                }
                            })
                        unsub()
                        resolve(result)
                    } else if (result.isError) {
                        unsub()
                        reject(result)
                    }
                })
        })
    } else {
        result = new Promise((resolve, reject) => {
            try {
                const extrinsic = api.tx.balances.transferAllowDeath(address, amount)
                txQueue.add(
                    extrinsic,
                    (txResult: ISubmittableResult) => {
                        env.logger.info('In sendFunds call back')
                        resolve(txResult)
                    },
                    pair
                )
            } catch (e) {
                reject(e)
            }
        })
    }
    const submittableResult = await result

    if (submittableResult.isError) {
        throw new ProsopoEnvError('DEVELOPER.FUNDING_FAILED', {
            context: {
                error: submittableResult.dispatchError
                    ? submittableResult.dispatchError.toHuman()
                    : submittableResult.toHuman(),
            },
        })
    }
    if (submittableResult.status.isFuture) {
        env.logger.debug(who, 'sent amount', unitAmount, 'UNIT in FUTURE tx hash ', submittableResult.txHash.toHex())
    } else {
        env.logger.debug(who, 'sent amount', unitAmount, 'UNIT at tx hash ', submittableResult.status.asInBlock.toHex())
    }
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
    const unit = oneUnit(env.getApi())

    // We want to give each provider 100 * the required stake or 1 UNIT, whichever is greater, so that gas fees can be
    // refunded to the Dapp User from within the contract
    const stake100 = BN.max(
        providerStakeDefault.muln(stakeMultiplier || 100),
        env.getApi().consts.balances.existentialDeposit.toBn()
    )

    // We don't want to stake any more than MAX_ACCOUNT_FUND * existentialDeposit UNIT per provider as the test account
    // funds will be depleted too quickly
    const maxStake = env.getApi().consts.balances.existentialDeposit.toBn().muln(MAX_ACCOUNT_FUND)

    if (stake100.lt(maxStake)) {
        env.logger.debug('Setting stake amount to', stake100.div(unit).toString(), 'UNIT')
        return stake100
    }
    env.logger.debug('Setting stake amount to', maxStake.div(unit).toString(), 'UNIT')
    return maxStake
}

/**
 * Send funds to a test account, adding the max of 2 * stakeAmount or 1000 * the
 * existential deposit
 * @param env
 * @param stakeAmount
 */
export function getSendAmount(env: ProsopoEnvironment, stakeAmount: BN): BN {
    const unit = oneUnit(env.getApi())
    env.logger.debug('Stake amount', stakeAmount.div(unit).toNumber(), 'UNIT')
    let sendAmount = new BN(stakeAmount).muln(2)

    // Should result in each account receiving a minimum of existentialDeposit
    sendAmount = BN.max(sendAmount, env.getApi().consts.balances.existentialDeposit.muln(10000))
    env.logger.debug('Setting send amount to', sendAmount.div(unit).toNumber(), 'UNIT')
    return sendAmount
}
