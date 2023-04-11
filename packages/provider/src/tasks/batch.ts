import { BatchCommitConfig, Database, UserCommitmentRecord } from '../types/index'
import { ProsopoContractApi, ProsopoContractError } from '@prosopo/contract'
import { ScheduledTaskNames, ScheduledTaskStatus } from '../types/scheduler'
import { randomAsHex } from '@polkadot/util-crypto'
import { DispatchError, Event } from '@polkadot/types/interfaces'
import { ApiPromise, SubmittableResult } from '@polkadot/api'
import { SignatureOptions } from '@polkadot/types/types'
import { oneUnit } from '../util'
import { DecodedEvent } from '@polkadot/api-contract/types'
import { Bytes } from '@polkadot/types-codec'
import { commitmentExtrinsicBatcher } from '../batch/commitments'
import { Logger } from '@prosopo/common'

export class BatchCommitter {
    contractApi: ProsopoContractApi
    db: Database
    batchCommitConfig: BatchCommitConfig
    logger: Logger
    private nonce: bigint
    constructor(
        batchCommitConfig: BatchCommitConfig,
        contractApi: ProsopoContractApi,
        db: Database,
        concurrent: number,
        startNonce: bigint,
        logger: Logger
    ) {
        this.contractApi = contractApi
        this.db = db
        this.batchCommitConfig = batchCommitConfig
        this.logger = logger
        this.nonce = startNonce
    }
    async runBatch(): Promise<void> {
        //if time since last commit > batchCommitInterval
        const lastTime = await this.db.getLastBatchCommitTime()
        // create a task id
        const taskId = randomAsHex(32)
        if (Date.now() - lastTime > this.batchCommitConfig.interval) {
            try {
                // update last commit time
                await this.db.storeScheduledTaskStatus(
                    taskId,
                    ScheduledTaskNames.BatchCommitment,
                    ScheduledTaskStatus.Running
                )
                //get commitments
                const commitments = await this.getCommitments()
                if (commitments.length > 0) {
                    this.logger.info(`Found ${commitments.length} commitments to commit`)
                    //commit
                    const commitmentIds = await this.batchCommit(commitments)
                    //remove commitments
                    await this.removeCommitmentsAndSolutions(commitmentIds)
                    // update last commit time and store the commitmentIds that were batched
                    await this.db.storeScheduledTaskStatus(
                        taskId,
                        ScheduledTaskNames.BatchCommitment,
                        ScheduledTaskStatus.Completed,
                        {
                            data: {
                                commitmentIds: commitments
                                    .filter((commitment) => commitmentIds.indexOf(commitment.commitmentId) > -1)
                                    .map((c) => c.commitmentId),
                            },
                        }
                    )
                }
            } catch (e) {
                this.logger.error(e)
                await this.db.storeScheduledTaskStatus(
                    taskId,
                    ScheduledTaskNames.BatchCommitment,
                    ScheduledTaskStatus.Failed,
                    {
                        error: JSON.stringify(e),
                    }
                )
            }
        }
    }

    async getCommitments(): Promise<UserCommitmentRecord[]> {
        // get commitments that have already been used to generate a solution
        return await this.db.getProcessedDappUserCommitments()
    }

    // Get the error from inside the batch interrupted event
    batchInterrupted({ data: [index, error] }: Event): string | null {
        return `error: ${index.toString()}: ${this.getDispatchError(error as DispatchError)}`
    }

    getDispatchError(dispatchError: DispatchError): string {
        let message: string = dispatchError.type

        if (dispatchError.isModule) {
            try {
                const mod = dispatchError.asModule
                const error = dispatchError.registry.findMetaError(mod)

                message = `${error.section}.${error.name}`
            } catch (error) {
                // swallow
            }
        } else if (dispatchError.isToken) {
            message = `${dispatchError.type}.${dispatchError.asToken.type}`
        }

        return message
    }

    /**
     * Batch commits a list of commitment records to the contract
     * @param commitments
     */
    async batchCommit(commitments: UserCommitmentRecord[]): Promise<string[]> {
        const commitmentBuilder = new commitmentExtrinsicBatcher(this.contractApi, this.logger, this.batchCommitConfig)
        const { extrinsics, commitmentIds } = await commitmentBuilder.createExtrinsics(commitments)
        this.logger.debug('commitmentIds', commitmentIds)

        // TODO use dryRun to get weight
        // const result = await this.contractApi.api.tx.utility.batchAll(txs).dryRun(this.contractApi.pair)
        // 2023-02-01 21:23:51        RPC-CORE: dryRun(extrinsic: Bytes, at?: BlockHash): ApplyExtrinsicResult:: -32601: RPC call is unsafe to be called externally
        //
        // ERROR  -32601: RPC call is unsafe to be called externally                                                            21:23:51
        //if (result.isOk) {

        const nonce = (await this.contractApi.api.rpc.system.accountNextIndex(this.contractApi.pair.address)).toNumber()
        const genesisHash = await this.contractApi.api.rpc.chain.getBlockHash(0)
        const blockHash = await this.contractApi.api.rpc.chain.getBlockHash()
        const runtimeVersion = await this.contractApi.api.rpc.state.getRuntimeVersion(blockHash)

        const options: SignatureOptions = {
            nonce: nonce,
            tip: 0,
            genesisHash,
            blockHash,
            runtimeVersion,
        }

        const batchExtrinsic = this.contractApi.api.tx.utility.batch(extrinsics)
        const balance = await this.contractApi.api.query.system.account(this.contractApi.pair.address)
        const paymentInfo = await batchExtrinsic.paymentInfo(this.contractApi.pair)
        this.logger.info(
            'Sender balance',
            balance.data.free.div(oneUnit(this.contractApi.api as ApiPromise)).toString(),
            'UNIT'
        )
        this.logger.info('Payment Info', paymentInfo.toHuman())
        // eslint-disable-next-line no-async-promise-executor
        return new Promise(async (resolve, reject) => {
            const unsub = await batchExtrinsic.signAndSend(
                this.contractApi.pair,
                options,
                (result: SubmittableResult) => {
                    this.logger.debug('batchExtrinsic DispatchInfo', result.dispatchInfo?.toHuman())

                    const batchInterruptedEvent = result.events.filter((e) => e.event.method === 'BatchInterrupted')
                    const tooManyCalls = result.events.filter((e) => e.event.method === 'TooManyCalls')
                    if (tooManyCalls.length > 0) {
                        this.logger.error('Too many calls')
                        const error = tooManyCalls[0].event
                        const message = `${error.section}.${error.method}${
                            'docs' in error
                                ? Array.isArray(error.docs)
                                    ? `(${error.docs.join('')})`
                                    : error.docs || ''
                                : ''
                        }`
                        reject(new ProsopoContractError(message))
                    }

                    if (batchInterruptedEvent.length > 0) {
                        this.logger.error('Batch interrupted')
                        reject(this.batchInterrupted(batchInterruptedEvent[0].event))
                    }

                    if (result.status.isFinalized || result.status.isInBlock) {
                        unsub()
                        const events = result.events
                            .filter(
                                (e) =>
                                    e.event.section === 'contracts' &&
                                    ['ContractEmitted', 'ContractExecution'].indexOf(e.event.method) > -1
                            )
                            .map((eventRec): DecodedEvent | null => {
                                const {
                                    event: {
                                        data: [, data],
                                    },
                                } = eventRec
                                try {
                                    return this.contractApi.abi.decodeEvent(data as Bytes)
                                } catch (error) {
                                    this.logger.error(`Unable to decode contract event: ${(error as Error).message}`)
                                    this.logger.error(eventRec.event.toHuman())

                                    return null
                                }
                            })
                            .filter((decoded): decoded is DecodedEvent => !!decoded)

                        resolve(commitmentIds)
                    } else if (result.isError) {
                        unsub()

                        reject(new ProsopoContractError(result.status.type))
                    }
                }
            )
        })
    }

    async removeCommitmentsAndSolutions(commitmentIds: string[]): Promise<void> {
        const removeSolutionsResult = await this.db.removeProcessedDappUserSolutions(commitmentIds)
        const removeCommitmentsResult = await this.db.removeProcessedDappUserCommitments(commitmentIds)
        this.logger.info('Deleted user solutions', removeSolutionsResult)
        this.logger.info('Deleted user commitments', removeCommitmentsResult)
    }
}
