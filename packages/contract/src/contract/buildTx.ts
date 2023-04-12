// Copyright (C) 2021-2022 Prosopo (UK) Ltd.
// This file is part of contract <https://github.com/prosopo/contract>.
//
// contract is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// contract is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with contract. If not, see <http://www.gnu.org/licenses/>.
import { SubmittableResult } from '@polkadot/api'
import type { SignerOptions } from '@polkadot/api/types'
import { SubmittableExtrinsic } from '@polkadot/api/types'
import type { Registry } from '@polkadot/types/types'
import { TransactionResponse } from '@prosopo/types'
import { KeyringPair } from '@polkadot/keyring/types'

export async function buildTx(
    registry: Registry,
    extrinsic: SubmittableExtrinsic<'promise'>,
    pair: KeyringPair,
    options?: Partial<SignerOptions>
): Promise<TransactionResponse> {
    const signerAddress = pair.address || pair

    return new Promise((resolve, reject) => {
        const actionStatus = {
            from: signerAddress.toString(),
            txHash: extrinsic.hash.toHex(),
        } as Partial<TransactionResponse>

        extrinsic
            .signAndSend(
                pair,
                {
                    ...options,
                },
                (result: SubmittableResult) => {
                    if (result.status.isInBlock) {
                        actionStatus.blockHash = result.status.asInBlock.toHex()
                    }

                    if (result.status.isFinalized || result.status.isInBlock) {
                        result.events
                            .filter(({ event: { section } }: any): boolean => section === 'system')
                            .forEach((event: any): void => {
                                const {
                                    event: { data, method },
                                } = event

                                if (method === 'ExtrinsicFailed') {
                                    const [dispatchError] = data
                                    let message = dispatchError.type

                                    if (dispatchError.isModule) {
                                        try {
                                            const mod = dispatchError.asModule
                                            const error = registry.findMetaError(
                                                new Uint8Array([mod.index.toNumber(), mod.error.toNumber()])
                                            )
                                            message = `${error.section}.${error.name}${
                                                Array.isArray(error.docs)
                                                    ? `(${error.docs.join('')})`
                                                    : error.docs || ''
                                            }`
                                        } catch (error) {
                                            // swallow
                                        }
                                    }

                                    actionStatus.error = {
                                        message,
                                    }

                                    reject(actionStatus)
                                } else if (method === 'ExtrinsicSuccess') {
                                    actionStatus.result = result
                                    resolve(actionStatus as TransactionResponse)
                                }
                            })
                    } else if (result.isError) {
                        actionStatus.error = {
                            data: result,
                        }
                        actionStatus.events = undefined

                        reject(actionStatus)
                    }
                }
            )
            .catch((error: any) => {
                actionStatus.error = {
                    message: error.message,
                }

                reject(actionStatus)
            })
    })
}
