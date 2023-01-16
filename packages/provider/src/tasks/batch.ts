import { BatchCommitConfig, Database, UserCommitmentRecord } from '../types/index'
import { ProsopoContractApi, encodeStringArgs } from '@prosopo/contract'
import consola from 'consola'
import { SubmittableExtrinsic } from '@polkadot/api/promise/types'
import { ScheduledTaskNames, ScheduledTaskStatus } from '../types/scheduler'
import { randomAsHex } from '@polkadot/util-crypto'

export class BatchCommitter {
    contractApi: ProsopoContractApi

    db: Database

    batchCommitConfig: BatchCommitConfig

    logger: typeof consola
    constructor(
        batchCommitConfig: BatchCommitConfig,
        contractApi: ProsopoContractApi,
        db: Database,
        logger: typeof consola
    ) {
        this.contractApi = contractApi
        this.db = db
        this.batchCommitConfig = batchCommitConfig
        this.logger = logger
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
    async batchCommit(commitments: UserCommitmentRecord[]): Promise<void> {
        const txs: SubmittableExtrinsic[] = []
        const fragment = this.contractApi.getContractMethod('dappUserCommit')
        for (const commitment of commitments) {
            const args = [
                commitment.dappAccount,
                commitment.datasetId,
                commitment.commitmentId,
                this.contractApi.pair.address,
            ]

            const encodedArgs: Uint8Array[] = encodeStringArgs(this.contractApi.api.registry, fragment, args)
            const extrinsic = await this.contractApi.buildExtrinsic('dappUserCommit', encodedArgs)
            txs.push(extrinsic)
        }

        await this.contractApi.api.tx.utility.batchAll(txs).signAndSend(this.contractApi.pair, (result) => {
            if (result.status.isInBlock) {
                this.logger.info(`Batch committed at blockHash ${result.status.asInBlock}`)
            } else if (result.status.isFinalized) {
                this.logger.info(`Batch finalized at blockHash ${result.status.asFinalized}`)
            }
        })
    }

    async removeCommitmentsAndSolutions(): Promise<void> {
        await this.db.removeProcessedDappUserSolutions()
        await this.db.removeProcessedDappUserCommitments()
    }
}
