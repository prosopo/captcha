import { DispatchError, Event } from '@polkadot/types/interfaces'
import { filterAndDecodeContractEvents, formatEvent, getDispatchError } from './helpers'
import { SignatureOptions } from '@polkadot/types/types'
import { ApiPromise, SubmittableResult } from '@polkadot/api'
import { SubmittableExtrinsic } from '@polkadot/api/types'
import { Logger } from '@prosopo/common'
import { oneUnit } from '../balances'
import { ProsopoContractApi } from './interface'
import { ProsopoContractError } from '../handlers'
/**
 * Batch commits an array of transactions to the contract
 * @param contract
 * @param extrinsics
 * @param logger
 */
export async function batch(
    contract: ProsopoContractApi,
    extrinsics: SubmittableExtrinsic<any>[],
    logger: Logger
): Promise<void> {
    // TODO use dryRun to get weight
    // const result = await contract.api.tx.utility.batchAll(txs).dryRun(contract.pair)
    // 2023-02-01 21:23:51        RPC-CORE: dryRun(extrinsic: Bytes, at?: BlockHash): ApplyExtrinsicResult:: -32601: RPC call is unsafe to be called externally
    //
    // ERROR  -32601: RPC call is unsafe to be called externally                                                            21:23:51
    //if (result.isOk) {

    const nonce = (await contract.api.rpc.system.accountNextIndex(contract.pair.address)).toNumber()
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
    const balance = await contract.api.query.system.account(contract.pair.address)
    const paymentInfo = await batchExtrinsic.paymentInfo(contract.pair)
    logger.info('Sender balance Before', balance.data.free.div(oneUnit(contract.api as ApiPromise)).toString(), 'UNIT')
    logger.info('Payment Info', paymentInfo.toHuman())
    console.log(JSON.stringify(batchExtrinsic.toHuman(), null, 2))
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve, reject) => {
        const unsub = await batchExtrinsic.signAndSend(contract.pair, options, async (result: SubmittableResult) => {
            logger.debug('DispatchInfo', result.dispatchInfo?.toHuman())

            const batchInterruptedEvent = result.events.filter((e) => e.event.method === 'BatchInterrupted')
            const tooManyCallsEvent = result.events.filter((e) => e.event.method === 'TooManyCalls')
            const extrinsicSuccess = result.events.filter((e) => e.event.method === 'ExtrinsicSuccess')
            if (tooManyCallsEvent.length > 0) {
                logger.error('Too many calls')
                const message = formatEvent(tooManyCallsEvent[0].event)
                reject(new ProsopoContractError(message))
            }

            if (batchInterruptedEvent.length > 0) {
                logger.error('Batch interrupted')
                const message = formatBatchInterruptedEvent(batchInterruptedEvent[0].event)
                reject(new ProsopoContractError(message))
            }

            if (result.status.isFinalized || result.status.isInBlock) {
                unsub()
                const events = filterAndDecodeContractEvents(result, contract.abi, logger)
                logger.debug('extrinsicSuccess', JSON.stringify(extrinsicSuccess[0].toHuman(), null, 4))
                logger.debug('block number', result.blockNumber?.toString())
                logger.debug('events', events)
                const balance = await contract.api.query.system.account(contract.pair.address)
                logger.info(
                    'Sender balance After',
                    balance.data.free.div(oneUnit(contract.api as ApiPromise)).toString(),
                    'UNIT'
                )
                resolve()
            } else if (result.isError) {
                unsub()
                reject(new ProsopoContractError(result.status.type))
            }
        })
    })
}

// Get the error from inside the batch interrupted event
function formatBatchInterruptedEvent({ data: [index, error] }: Event): string {
    return `error: ${index.toString()}: ${getDispatchError(error as DispatchError)}`
}
