import type { ContractPromise } from '@polkadot/api-contract/promise'
// Copyright 2021-2023 Prosopo (UK) Ltd.
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
import type { ApiPromise } from '@polkadot/api/promise/Api'
import type { SubmittableResult } from '@polkadot/api/submittable'
import type { SubmittableExtrinsic } from '@polkadot/api/types'
import type { DispatchError, Event } from '@polkadot/types/interfaces'
import type { IKeyringPair, SignatureOptions } from '@polkadot/types/types'
import { type Logger, ProsopoContractError } from '@prosopo/common'
import { at } from '@prosopo/util'
import { oneUnit } from '../balances/index.js'
import { filterAndDecodeContractEvents, formatEvent, getDispatchError } from './helpers.js'

/**
 * Batch commits an array of transactions to the contract
 * @param contract
 * @param pair
 * @param extrinsics
 * @param logger
 */
export async function batch(
    contract: ContractPromise,
    pair: IKeyringPair,
    extrinsics: SubmittableExtrinsic<any>[],
    logger: Logger
): Promise<void> {
    // TODO use dryRun to get weight
    // const result = await contract.api.tx.utility.batchAll(txs).dryRun(contract.pair)
    // 2023-02-01 21:23:51        RPC-CORE: dryRun(extrinsic: Bytes, at?: BlockHash): ApplyExtrinsicResult:: -32601: RPC call is unsafe to be called externally
    //
    // ERROR  -32601: RPC call is unsafe to be called externally                                                            21:23:51
    //if (result.isOk) {

    const nonce = (await contract.api.rpc.system.accountNextIndex(pair.address)).toNumber()
    const genesisHash = await contract.api.rpc.chain.getBlockHash(0)
    const blockHash = await contract.api.rpc.chain.getBlockHash()
    const runtimeVersion = await contract.api.rpc.state.getRuntimeVersion(blockHash)

    const options: SignatureOptions = {
        nonce: nonce,
        tip: 0,
        genesisHash,
        blockHash,
        runtimeVersion,
    }
    const batchExtrinsic = contract.api.tx.utility.batch(extrinsics)
    const balance = await contract.api.query.system.account(pair.address)
    const paymentInfo = await batchExtrinsic.paymentInfo(pair)
    logger.info('Sender balance Before', balance.data.free.div(oneUnit(contract.api as ApiPromise)).toString(), 'UNIT')
    logger.info('Payment Info', paymentInfo.toHuman())
    // eslint-disable-next-line no-async-promise-executor
    return await new Promise(async (resolve, reject) => {
        const unsub = await batchExtrinsic.signAndSend(pair, options, async (result: SubmittableResult) => {
            //logger.debug('DispatchInfo', result.dispatchInfo?.toHuman())

            const batchInterruptedEvent = result.events.filter((e) => e.event.method === 'BatchInterrupted')
            const tooManyCallsEvent = result.events.filter((e) => e.event.method === 'TooManyCalls')
            const extrinsicSuccess = result.events.filter((e) => e.event.method === 'ExtrinsicSuccess')
            if (tooManyCallsEvent.length > 0) {
                logger.error('Too many calls')
                const item = at(tooManyCallsEvent, 0)
                const message = formatEvent(item.event)
                reject(
                    new ProsopoContractError('CONTRACT.TOO_MANY_CALLS', {
                        context: { message },
                    })
                )
            }

            if (batchInterruptedEvent.length > 0) {
                logger.error('Batch interrupted')
                const item = at(batchInterruptedEvent, 0)
                const message = formatBatchInterruptedEvent(item.event)
                reject(
                    new ProsopoContractError('CONTRACT.INTERRUPTED_EVENT', {
                        context: { message },
                    })
                )
            }

            if (result.status.isFinalized || result.status.isInBlock) {
                unsub()
                const events = filterAndDecodeContractEvents(result, contract.abi, logger)
                const item = at(extrinsicSuccess, 0)
                logger.debug('extrinsicSuccess', JSON.stringify(item.toHuman(), null, 4))
                logger.debug('block number', result.blockNumber?.toString())
                logger.debug('events', events)
                const balance = await contract.api.query.system.account(pair.address)
                logger.info(
                    'Sender balance After',
                    balance.data.free.div(oneUnit(contract.api as ApiPromise)).toString(),
                    'UNIT'
                )
                resolve()
            } else if (result.isError) {
                unsub()
                reject(
                    new ProsopoContractError('CONTRACT.TX_ERROR', {
                        context: { resultType: result.status.type },
                        logger,
                    })
                )
            }
        })
    })
}

// Get the error from inside the batch interrupted event
function formatBatchInterruptedEvent({ data: [index, error] }: Event): string {
    const err = index === undefined ? 'unknown' : index.toString()
    return `error: ${err}: ${getDispatchError(error as DispatchError)}`
}
