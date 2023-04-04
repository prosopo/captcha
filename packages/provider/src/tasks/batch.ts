import { BatchCommitConfig, Database, UserCommitmentRecord } from '../types/index'
import { ProsopoContractApi, ProsopoContractError, encodeStringArgs } from '@prosopo/contract'
import consola from 'consola'
import { ScheduledTaskNames, ScheduledTaskStatus } from '../types/scheduler'
import { randomAsHex } from '@polkadot/util-crypto'
import { DispatchError, Event, Hash } from '@polkadot/types/interfaces'
import { ApiTypes, SubmittableExtrinsic } from '@polkadot/api/types'
import { ApiPromise, SubmittableResult } from '@polkadot/api'
import { SignatureOptions } from '@polkadot/types/types'
import { BN } from '@polkadot/util'
import { oneUnit } from '../util'
import { DecodedEvent } from '@polkadot/api-contract/types'
import { Bytes } from '@polkadot/types-codec'

const BN_TEN_THOUSAND = new BN(10_000)

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
        const { extrinsics, commitmentIds } = await this.createCommitmentTxs(commitments)
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
        const batchExtrinsic = this.contractApi.api.tx.utility.batchAll(extrinsics)
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
                    this.logger.debug('DispatchInfo', result.dispatchInfo?.toHuman())
                    if (result.dispatchError) {
                        this.logger.error('DispatchError')
                        reject(new ProsopoContractError(result.dispatchError))
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
                        this.logger.debug(
                            'Events',
                            events.map((e) => e.event.identifier)
                        )
                        resolve(commitmentIds)
                    } else if (result.isError) {
                        unsub()

                        reject(new ProsopoContractError(result.status.type))
                    }
                }
            )
        })
    }

    async createCommitmentTxs(
        commitments
    ): Promise<{ extrinsics: SubmittableExtrinsic<any>[]; commitmentIds: string[] }> {
        const txs: SubmittableExtrinsic<any>[] = []
        const contractMethodName = 'dappUserCommit'
        const fragment = this.contractApi.abi.findMessage(contractMethodName)
        const batchedCommitmentIds: string[] = []
        const utilityConstants = await this.contractApi.api.consts.utility
        let totalRefTime = new BN(0)
        let totalProofSize = new BN(0)
        const maxBlockWeight = this.contractApi.api.consts.system.blockWeights.maxBlock
        //let totalEncodedLength = 0
        this.logger.debug('utilityConstants.batchedCallsLimit', utilityConstants.batchedCallsLimit.toNumber())
        this.logger.debug('ss58Format', this.contractApi.api.registry.chainSS58)
        for (const commitment of commitments) {
            const args = [
                commitment.dappAccount, // contract account
                commitment.datasetId,
                commitment.commitmentId,
                this.contractApi.pair.address,
                commitment.userAccount,
                commitment.approved ? 'Approved' : 'Disapproved',
            ]
            this.logger.debug('Provider Address', this.contractApi.pair.address)
            const encodedArgs: Uint8Array[] = encodeStringArgs(this.contractApi.abi, fragment, args)
            this.logger.debug(`Commitment:`, args)
            const { extrinsic, options } = await this.contractApi.buildExtrinsic('dappUserCommit', encodedArgs)
            const paymentInfo = await extrinsic.paymentInfo(this.contractApi.pair)
            this.logger.debug(`${contractMethodName} paymentInfo:`, paymentInfo.toHuman())
            //totalEncodedLength += extrinsic.encodedLength
            totalRefTime = totalRefTime.add(
                this.contractApi.api.registry.createType('WeightV2', options.gasLimit).refTime.toBn()
            )
            totalProofSize = totalProofSize.add(
                this.contractApi.api.registry.createType('WeightV2', options.gasLimit).proofSize.toBn()
            )
            // Check if we have a maximum number of transactions that we can successfully submit in a block
            if (
                totalRefTime.mul(BN_TEN_THOUSAND).div(maxBlockWeight.refTime.toBn()).toNumber() / 100 >
                this.batchCommitConfig.maxBatchExtrinsicPercentage
            ) {
                this.logger.warn('Max batch extrinsic percentage reached')
                break
            } else {
                batchedCommitmentIds.push(commitment.commitmentId)
                txs.push(extrinsic)
            }
        }
        this.logger.info(`${txs.length} transactions will be batched`)
        this.logger.debug('totalRefTime:', totalRefTime.toString())
        this.logger.debug('totalProofSize:', totalProofSize.toString())
        return { extrinsics: txs, commitmentIds: batchedCommitmentIds }
    }

    async removeCommitmentsAndSolutions(commitmentIds: string[]): Promise<void> {
        const removeSolutionsResult = await this.db.removeProcessedDappUserSolutions(commitmentIds)
        const removeCommitmentsResult = await this.db.removeProcessedDappUserCommitments(commitmentIds)
        this.logger.info('Deleted user solutions', removeSolutionsResult)
        this.logger.info('Deleted user commitments', removeCommitmentsResult)
    }
}
