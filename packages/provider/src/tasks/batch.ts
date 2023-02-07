import { BatchCommitConfig, Database, UserCommitmentRecord } from '../types/index'
import {
    ProsopoContractApi,
    ProsopoContractError,
    TransactionResponse,
    decodeEvents,
    encodeStringArgs,
} from '@prosopo/contract'
import consola from 'consola'
import { ScheduledTaskNames, ScheduledTaskStatus } from '../types/scheduler'
import { randomAsHex } from '@polkadot/util-crypto'
import { DispatchError, Hash } from '@polkadot/types/interfaces'
import { ApiTypes, SubmittableExtrinsic } from '@polkadot/api/types'
import { SubmittableResult } from '@polkadot/api'
import { BN } from '@polkadot/util'

export class BatchCommitter {
    contractApi: ProsopoContractApi

    db: Database

    batchCommitConfig: BatchCommitConfig

    logger: typeof consola
    readonly maxConcurrent: number
    readonly cbErr: (xts: Array<SubmittableExtrinsic<ApiTypes, SubmittableResult>>) => void
    private running: number
    private dispatched: bigint
    private nonce: bigint
    private dispatchHashes: Array<[Hash, bigint]>
    constructor(
        batchCommitConfig: BatchCommitConfig,
        contractApi: ProsopoContractApi,
        db: Database,
        concurrent: number,
        startNonce: bigint,
        logger: typeof consola,
        cbErr?: (xts: Array<SubmittableExtrinsic<ApiTypes, SubmittableResult>>) => void
    ) {
        if (cbErr !== undefined) {
            this.cbErr = cbErr
        } else {
            this.cbErr = (xts: Array<SubmittableExtrinsic<ApiTypes, SubmittableResult>>) => {
                xts.map((xt) => {
                    logger.error(xt.toHuman())
                })
            }
        }
        this.contractApi = contractApi
        this.db = db
        this.batchCommitConfig = batchCommitConfig
        this.logger = logger
        this.running = 0
        this.dispatchHashes = []
        this.dispatched = BigInt(0)
        this.maxConcurrent = concurrent
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
                    //commit
                    await this.batchCommit(commitments)
                    //remove commitments
                    await this.removeCommitmentsAndSolutions()
                    // update last commit time
                    await this.db.storeScheduledTaskStatus(
                        taskId,
                        ScheduledTaskNames.BatchCommitment,
                        ScheduledTaskStatus.Completed,
                        {
                            data: commitments.map((c) => c.commitmentId),
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
        return await this.db.getProcessedDappUserCommitments()
    }

    /**
     * Batch commits a list of commitment records to the contract
     * @param commitments
     */
    async batchCommit(commitments: UserCommitmentRecord[]): Promise<TransactionResponse> {
        const txs: SubmittableExtrinsic<any>[] = []
        const fragment = this.contractApi.getContractMethod('dappUserCommit')
        for (const commitment of commitments) {
            const args = [
                commitment.dappAccount,
                commitment.datasetId,
                commitment.commitmentId,
                this.contractApi.pair.address,
                commitment.userAccount,
                commitment.approved ? 'Approved' : 'Disapproved',
            ]
            const encodedArgs: Uint8Array[] = encodeStringArgs(this.contractApi.abi, fragment, args)
            const extrinsic = await this.contractApi.buildExtrinsic('dappUserCommit', encodedArgs)

            txs.push(extrinsic)
        }

        // const result = await this.contractApi.api.tx.utility.batchAll(txs).dryRun(this.contractApi.pair)
        // 2023-02-01 21:23:51        RPC-CORE: dryRun(extrinsic: Bytes, at?: BlockHash): ApplyExtrinsicResult:: -32601: RPC call is unsafe to be called externally
        //
        // ERROR  -32601: RPC call is unsafe to be called externally                                                            21:23:51

        //if (result.isOk) {
        // eslint-disable-next-line no-async-promise-executor
        return new Promise(async (resolve, reject) => {
            const unsub = await this.contractApi.api.tx.utility
                .batchAll(txs)
                .signAndSend(this.contractApi.pair, (result: SubmittableResult) => {
                    const actionStatus = {
                        from: this.contractApi.pair.address.toString(),
                    } as Partial<TransactionResponse>
                    if (result.status.isInBlock) {
                        actionStatus.blockHash = result.status.asInBlock.toHex()
                    }

                    if (result.status.isFinalized || result.status.isInBlock) {
                        result.events
                            .filter(({ event: { section } }: any): boolean => section === 'system')
                            .forEach((event): void => {
                                const {
                                    event: { method },
                                } = event

                                if (method === 'ExtrinsicFailed') {
                                    const dispatchError = event.event.data[0] as DispatchError
                                    let message: string = dispatchError.type

                                    if (dispatchError.isModule) {
                                        try {
                                            const mod = dispatchError.asModule
                                            console.log(mod.toHuman())
                                            const error = this.contractApi.api.registry.findMetaError(
                                                new Uint8Array([
                                                    mod.index.toNumber(),
                                                    new BN(mod.error.slice(0, 4)).toNumber(),
                                                ])
                                            )
                                            console.log(JSON.stringify(error))
                                            message = `${error.section}.${error.name}${
                                                Array.isArray(error.docs)
                                                    ? `(${error.docs.join('')})`
                                                    : error.docs || ''
                                            }`
                                        } catch (error) {
                                            // swallow
                                        }
                                    }

                                    reject(new ProsopoContractError(message))
                                } else if (method === 'ExtrinsicSuccess') {
                                    actionStatus.result = result
                                    if ('events' in result) {
                                        actionStatus.events = decodeEvents(
                                            this.contractApi.api.createType('AccountId', this.contractApi.pair.address),
                                            result,
                                            this.contractApi.abi
                                        )
                                    }
                                }
                            })
                        unsub()
                        resolve(actionStatus as TransactionResponse)
                    } else if (result.isError) {
                        console.log('error sending batch')
                        unsub()
                        reject(new ProsopoContractError(result.status.type))
                    }
                })
        })
        // } else {
        //     throw new ProsopoContractError(result.asErr.toString())
        //     process.exit()
        // }
    }

    async removeCommitmentsAndSolutions(): Promise<void> {
        const deleteSolutionsResult = await this.db.removeProcessedDappUserSolutions()
        const deleteCommitmentsResult = await this.db.removeProcessedDappUserCommitments()
        this.logger.info('Deleted user solutions', deleteSolutionsResult)
        this.logger.info('Deleted user commitments', deleteCommitmentsResult)
    }

    async nextNonce(): Promise<bigint> {
        const tmp = this.nonce
        this.nonce = tmp + BigInt(1)
        return tmp
    }

    async returnNonce(activeNonce: bigint): Promise<boolean> {
        if (this.nonce === activeNonce + BigInt(1)) {
            this.nonce = activeNonce
            return true
        } else {
            return Promise.reject(
                'Nonce has already progressed. Account out of sync with dispatcher. Need to abort or inject xt with nonce: ' +
                    activeNonce +
                    ' in order to progress.'
            )
        }
    }

    async batchDispatch(xts: Array<SubmittableExtrinsic<ApiTypes, SubmittableResult>>): Promise<void> {
        while (this.running >= this.maxConcurrent) {
            await new Promise((r) => setTimeout(r, 6000))
        }
        this.dispatched += BigInt(1)
        this.running += 1

        const send = async (): Promise<void> => {
            const activeNonce = await this.nextNonce()
            const unsub = await this.contractApi.api.tx.utility
                .batchAll(xts)
                .signAndSend(this.contractApi.pair, { nonce: activeNonce }, ({ status, events }) => {
                    if (status.isInBlock) {
                        events.forEach(({ event: { data, method, section }, phase }) => {
                            if (method === 'ExtrinsicSuccess') {
                                console.log(status.asInBlock, phase.asApplyExtrinsic.toBigInt())
                                this.dispatchHashes.push([status.asInBlock, phase.asApplyExtrinsic.toBigInt()])
                            } else if (method === 'ExtrinsicFailed') {
                                this.dispatchHashes.push([status.asInBlock, phase.asApplyExtrinsic.toBigInt()])
                                this.cbErr(xts)
                            }
                        })

                        this.running -= 1
                    } else if (status.isFinalized) {
                        console.log('tx finalized', status.asFinalized.toString())
                        // @ts-ignore
                        unsub(events)
                    }
                })
                .catch(async (err) => {
                    this.running -= 1
                    this.dispatched -= BigInt(1)
                    this.cbErr(xts)
                    await this.returnNonce(activeNonce).catch((err) => console.log(err))
                    console.log(err)
                })
        }

        await send()
    }
}
