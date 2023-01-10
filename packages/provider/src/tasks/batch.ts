import { BatchCommitConfig, Database, UserCommitmentRecord } from '../types/index'
import { ProsopoContractApi } from '@prosopo/contract'
import consola from 'consola'
import { SubmittableExtrinsic } from '@polkadot/api/promise/types'

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
        if (Date.now() - lastTime > this.batchCommitConfig.interval) {
            //get commitments
            const commitments = await this.getCommitments()
            console.log('commitments', commitments)
            if (commitments.length > 0) {
                //commit
                await this.batchCommit(commitments)
                //remove commitments
                await this.removeCommitments()
            }
        }
    }

    async getCommitments(): Promise<UserCommitmentRecord[]> {
        return await this.db.getProcessedDappUserCommitments()
    }

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
            //TODO check if the commitments are already on chain using dry-run queries
            const options = this.contractApi.getOptions()
            const encodedArgs = fragment.toU8a(args)
            const extrinsic = this.contractApi.tx['dappUserCommit'](options, ...encodedArgs)
            txs.push(extrinsic)
        }
        // const txs = [
        //     // this.contractApi.api.tx.balances.transfer(addrBob, 12345),
        //     // this.contractApi.api.tx.balances.transfer(addrEve, 12345),
        //     // this.contractApi.api.tx.staking.unbond(12345),
        // ]
        //console.log(this.contractApi.api)
        console.log(this.contractApi.api.tx)
        console.log(this.contractApi.api.tx.utility)
        console.log(this.contractApi.api.tx.utility.batch)
        await this.contractApi.api.tx.utility.batch(txs).signAndSend(this.contractApi.pair, (result) => {
            if (result.status.isInBlock) {
                this.logger.info(`Batch committed at blockHash ${result.status.asInBlock}`)
            } else if (result.status.isFinalized) {
                this.logger.info(`Batch finalized at blockHash ${result.status.asFinalized}`)
            }
        })
    }

    async removeCommitments(): Promise<void> {
        await this.db.removeProcessedDappUserSolutions()
    }
}
