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
import type { AnyNumber } from '@polkadot/types-codec/types'
import type { ApiPromise } from '@polkadot/api'
import { BN } from '@polkadot/util'
import type { ISubmittableResult } from '@polkadot/types/types'
import type { Index } from '@polkadot/types/interfaces'
import type { KeyringPair } from '@polkadot/keyring/types'
import { LogLevel, getLogger } from '@prosopo/common'
import { getBalance, oneUnit } from './balances/index.js'
import { getDispatchError } from './getDispatchError.js'

const log = getLogger(LogLevel.enum.info, 'tx.sendFunds')

export const send = async (
    api: ApiPromise,
    toAddress: string,
    amount: AnyNumber,
    fromPair: KeyringPair,
    nonce?: Index
) => {
    if (!nonce) {
        nonce = await api.rpc.system.accountNextIndex(fromPair.address)
    }
    await api.isReady
    const unit = oneUnit(api)
    const unitAmount = new BN(amount.toString()).div(unit).toString()
    const balance = await getBalance(api, fromPair.address)
    log.debug(
        'Sending funds from',
        fromPair.address,
        'to',
        toAddress,
        'Amount:',
        unitAmount,
        'UNIT. Free balance:',
        balance.div(unit).toString(),
        'UNIT'
    )
    // eslint-disable-next-line no-async-promise-executor
    return new Promise<ISubmittableResult>(async (resolve, reject) => {
        const unsub = await api.tx.balances
            .transferAllowDeath(toAddress, amount)
            .signAndSend(fromPair, { nonce }, (result: ISubmittableResult) => {
                if (result.status.isInBlock || result.status.isFinalized) {
                    result.events
                        .filter(({ event: { section } }: any): boolean => section === 'system')
                        .forEach((event): void => {
                            const {
                                event: { method },
                            } = event

                            if (method === 'ExtrinsicFailed') {
                                unsub()
                                reject(event)
                            }
                        })
                    unsub()
                    resolve(result)
                } else if (result.isError) {
                    unsub()
                    reject(result)
                } else if (result.dispatchError) {
                    reject(getDispatchError(result.dispatchError))
                }
            })
    })
}
