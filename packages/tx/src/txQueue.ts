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
/* The following class takes extrinsics and submits them to the chain with a higher nonce than the previously submitted
 * extrinsic. This is to avoid the situation where an extrinsic is submitted, but not yet completed, and then another
 * extrinsic is submitted with the same nonce. This causes the second extrinsic to fail. Extrinsics are generated
 * using code such as:
 * ```
 *      const extrinsic: SubmittableExtrinsic = await api.tx.balances.transfer(recipient, 123)`
 * ```
 * A nonce is applied to the extrinsic when it is signed and sent:
 * ```
 *      const unsub = await extrinsic.signAndSend(pair, { nonce }, async (result: SubmittableResult) => {
 * ```
 * The job of the queue is to keep track of the nonce and submit extrinsics with a higher nonce than the previously
 * submitted extrinsic, even if the previously submitted extrinsics have not yet been processed.
 *
 * The queue is used in the following way:
 * ```
 *      const queue = new TransactionQueue()
 *      const extrinsic1 = await api.tx.balances.transfer(recipient, 123)
 *      const extrinsic2 = await api.tx.balances.transfer(recipient, 123)
 *      queue.add(extrinsic1, callback)
 *      queue.add(extrinsic2, callback)
 * ```
 * When an extrinsic is finalised, the callback is called. The callback is passed the result of the extrinsic, which will
 * be a ContractSubmittableResult. If the queue is currently submitting a transaction, the callback will not be called
 * until the transaction has been submitted. The transaction will be submitted later by the queue.
 */
import type { ApiPromise } from '@polkadot/api/promise/Api'
import type { ISubmittableResult } from '@polkadot/types/types'
import type { KeyringPair } from '@polkadot/keyring/types'
import { type LogLevel, type Logger, ProsopoContractError, ProsopoTxQueueError, getLogLevel, getLogger } from '@prosopo/common'
import type { SubmittableExtrinsic } from '@polkadot/api/types'
import type { SubmittableResult } from '@polkadot/api/submittable'
import { getDispatchError } from './getDispatchError.js'

type TxCallbackFn = (result: ISubmittableResult) => void

type QueueItem = {
    method: string
    extrinsic: SubmittableExtrinsic<'promise'>
    callback: TxCallbackFn
    pair?: KeyringPair
}

export class TransactionQueue {
    private api: ApiPromise
    private queue: Array<QueueItem> = []
    private nonce = 0
    private submitted = 0
    private busy = false
    private pair: KeyringPair
    private logger: Logger
    private running: boolean
    constructor(api: ApiPromise, pair: KeyringPair, logLevel?: LogLevel) {
        this.api = api
        this.pair = pair
        this.queue = []
        this.nonce = 0
        this.busy = false
        this.submitted = 0
        this.logger = getLogger(getLogLevel(logLevel), 'TransactionQueue')
        this.running = false
    }

    /**
     * Adds an extrinsic to the queue. The extrinsic will be submitted to the chain with a nonce that is higher than the
     * previously submitted extrinsic.
     * @param extrinsic
     * @param callback
     * @param pair
     * @param method
     */
    public add(
        extrinsic: SubmittableExtrinsic<'promise'>,
        callback: (result: SubmittableResult) => void,
        pair?: KeyringPair,
        method?: string
    ): Promise<unknown> {
        try {
            this.queue.push({ method: method || extrinsic.method.method.toString(), extrinsic, callback, pair })
            this.running = true
            return this.submit()
        } catch (e) {
            throw new ProsopoTxQueueError(new Error('CONTRACT.TX_QUEUE_ERROR'), {
                context: { error: e, logLevel: this.logger.getLogLevel() },
            })
        }
    }

    /**
     * Runs the next extrinsic in the queue to the chain.
     */
    private async submit() {
        try {
            this.logger.debug(`TxQueue state: ${this.queue.length} items in the queue`)

            if (this.queue.length === 0) {
                this.logger.debug('TxQueue empty')
                this.running = false
                // if the queue is empty, do nothing
                return undefined
            }

            if (this.busy) {
                this.logger.debug('TxQueue busy')
                // if busy, wait for the next extrinsic to be added to the queue
                return undefined
            }

            // Set the queue status to busy
            this.busy = true

            // Get the next item in the queue
            const queueItem = this.queue.shift()

            if (queueItem) {
                this.logger.debug('Submitting item', queueItem.method)
                const { method, extrinsic, callback, pair } = queueItem

                // eslint-disable-next-line no-async-promise-executor
                return new Promise(async (resolve, reject) => {
                    // use either the optional pair supplied with the queue item or the default pair
                    const submittingPair = pair || this.pair

                    // take the nonce from the chain for the submitting pair
                    this.nonce = -1

                    this.logger.debug('Nonce:', this.nonce)
                    const unsub = await extrinsic.signAndSend(
                        submittingPair,
                        { nonce: -1 },
                        async (result: SubmittableResult) => {
                            // TODO handle contract reverted by creating a new ContractSubmittableResult from the result
                            if (result.status.isInBlock || result.status.isFinalized) {
                                // run the callback for this extrinsic
                                this.logger.debug('Running user callback')
                                resolve(callback(result))

                                // unsubscribe from this extrinsic
                                unsub()

                                // run the next extrinsic in the queue
                                this.logger.debug('Running next extrinsic in queue')
                                this.busy = false
                                this.submitted++
                                await this.submit()
                            } else if (result.status.isUsurped) {
                                // This shouldn't happen as it means we've submitted a nonce with too low a value
                                this.logger.debug(`Transaction was usurped.`)
                                reject(
                                    new ProsopoTxQueueError(new Error('CONTRACT.TX_QUEUE_ERROR'), {
                                        logLevel: this.logger.getLogLevel(),
                                        context: { method, result: JSON.stringify(result) },
                                    })
                                )
                            } else if (result.status.isInvalid) {
                                await this.add(extrinsic, callback, pair, method)
                                this.logger.debug('Resubmitted invalid transaction')
                                this.busy = false
                                this.logger.debug('Running next extrinsic in queue')
                                // unsubscribe from this extrinsic
                                unsub()
                                await this.submit()
                            } else if (result.status.isFuture) {
                                // This shouldn't happen as it means we've submitted a nonce with too high a value
                                this.logger.debug(`Transaction is scheduled for a future block.`)
                                reject(
                                    new ProsopoTxQueueError(new Error('CONTRACT.TX_QUEUE_ERROR'), {
                                        logLevel: this.logger.getLogLevel(),
                                        context: { method, result },
                                    })
                                )
                            } else if (result.dispatchError) {
                                const error = getDispatchError(result.dispatchError)
                                this.logger.error('Transaction failed with dispatch error:', error)
                                reject(
                                    new ProsopoContractError('CONTRACT.DISPATCH_ERROR', {
                                        context: {
                                            method,
                                            error,
                                            extrinsic: extrinsic,
                                        },
                                        logLevel: this.logger.getLogLevel(),
                                    })
                                )
                                unsub()
                            }
                        }
                    )
                })
            } else {
                this.logger.debug('TxQueue empty')
                this.running = false
                this.busy = false
                return undefined
            }
        } catch (error) {
            throw new ProsopoTxQueueError(new Error('CONTRACT.TX_QUEUE_ERROR'), {
                context: { error },
                logLevel: this.logger.getLogLevel(),
            })
        }
    }
}
