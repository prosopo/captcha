import { BatchCommitConfig, Database, UserCommitmentRecord } from '../types/index'
import { ProsopoContractApi, ProsopoContractError, encodeStringArgs } from '@prosopo/contract'
import consola from 'consola'
import { ScheduledTaskNames, ScheduledTaskStatus } from '../types/scheduler'
import { randomAsHex } from '@polkadot/util-crypto'
import { Hash } from '@polkadot/types/interfaces'
import { ApiTypes, SubmittableExtrinsic } from '@polkadot/api/types'
import { SubmittableResult } from '@polkadot/api'
import { SignatureOptions } from '@polkadot/types/types'
import { BN } from '@polkadot/util'

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
        return await this.db.getProcessedDappUserCommitments()
    }

    /**
     * Batch commits a list of commitment records to the contract
     * @param commitments
     */
    async batchCommit(commitments: UserCommitmentRecord[]): Promise<string[]> {
        const txs: SubmittableExtrinsic<any>[] = []
        const fragment = this.contractApi.getContractMethod('dappUserCommit')
        let totalRefTime = new BN(0)
        const maxBlockWeight = this.contractApi.api.consts.system.blockWeights.maxBlock
        const batchedCommitmentIds: string[] = []
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
            const { extrinsic, options } = await this.contractApi.buildExtrinsic('dappUserCommit', encodedArgs)
            totalRefTime = totalRefTime.add(
                this.contractApi.api.registry.createType('WeightV2', options.gasLimit).refTime.toBn()
            )
            // Check if we have a maximum number of transactions that we can successfully submit in a block
            if (
                totalRefTime.mul(BN_TEN_THOUSAND).div(maxBlockWeight.refTime.toBn()).toNumber() / 100 >
                this.batchCommitConfig.maxBatchExtrinsicPercentage
            ) {
                // Break out of the loop so that we can submit the transactions. Additional batch processes will pickup the
                // remaining commitments
                break
            } else {
                batchedCommitmentIds.push(commitment.commitmentId)
                txs.push(extrinsic)
            }
        }
        // TODO use dryRun to get weight
        // const result = await this.contractApi.api.tx.utility.batchAll(txs).dryRun(this.contractApi.pair)
        // 2023-02-01 21:23:51        RPC-CORE: dryRun(extrinsic: Bytes, at?: BlockHash): ApplyExtrinsicResult:: -32601: RPC call is unsafe to be called externally
        //
        // ERROR  -32601: RPC call is unsafe to be called externally                                                            21:23:51
        // TODO use weight.v1Weight.mul(BN_TEN_THOUSAND).div(maxBlockWeight).toNumber() / 100 to get percentage of max
        //   block weight. If > 50% then divide the txs into smaller batches (extrinsics can only be x% of a block)
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
        const batchExtrinsic = this.contractApi.api.tx.utility.batchAll(txs)

        const batchExtrinsicSigned = batchExtrinsic.sign(this.contractApi.pair, options)
        this.logger.info('signed batch extrinsic encodedLength', batchExtrinsicSigned.encodedLength)
        // eslint-disable-next-line no-async-promise-executor
        return new Promise(async (resolve, reject) => {
            const unsub = await batchExtrinsic.signAndSend(this.contractApi.pair, (result: SubmittableResult) => {
                if (result.status.isFinalized || result.status.isInBlock) {
                    unsub()
                    resolve(batchedCommitmentIds)
                } else if (result.isError) {
                    unsub()
                    reject(new ProsopoContractError(result.status.type))
                }
            })
        })
    }

    async removeCommitmentsAndSolutions(commitmentIds: string[]): Promise<void> {
        const removeSolutionsResult = await this.db.removeProcessedDappUserSolutions(commitmentIds)
        const removeCommitmentsResult = await this.db.removeProcessedDappUserCommitments(commitmentIds)
        this.logger.info('Deleted user solutions', removeSolutionsResult)
        this.logger.info('Deleted user commitments', removeCommitmentsResult)
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
