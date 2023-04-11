import { ProsopoContractApi, encodeStringArgs } from '@prosopo/contract'
import { oneUnit } from '../util'
import { BN } from '@polkadot/util'
import { BatchCommitConfig } from '../types/index'
import { ApiPromise } from '@polkadot/api'
import { SubmittableExtrinsic } from '@polkadot/api/types'
import { Logger } from '@prosopo/common'

const BN_TEN_THOUSAND = new BN(10_000)
const CONTRACT_METHOD_NAME = 'dappUserCommit'
export class commitmentExtrinsicBatcher {
    constructor(
        private readonly contract: ProsopoContractApi,
        private readonly logger: Logger,
        private readonly batchCommitConfig: BatchCommitConfig
    ) {
        this.logger = logger.withScope('commitmentExtrinsicBatcher')
        this.contract = contract
        this.batchCommitConfig = batchCommitConfig
        return
    }

    async createExtrinsics(commitments): Promise<{ extrinsics: SubmittableExtrinsic<any>[]; commitmentIds: string[] }> {
        const txs: SubmittableExtrinsic<any>[] = []
        const fragment = this.contract.abi.findMessage(CONTRACT_METHOD_NAME)
        const batchedCommitmentIds: string[] = []
        let totalRefTime = new BN(0)
        let totalProofSize = new BN(0)
        let totalFee = new BN(0)
        const maxBlockWeight = this.contract.api.consts.system.blockWeights.maxBlock

        for (const commitment of commitments) {
            const args = [
                commitment.dappAccount, // contract account
                commitment.datasetId,
                commitment.commitmentId,
                this.contract.pair.address,
                commitment.userAccount,
                commitment.approved ? 'Approved' : 'Disapproved',
            ]
            this.logger.debug('Provider Address', this.contract.pair.address)
            const encodedArgs: Uint8Array[] = encodeStringArgs(this.contract.abi, fragment, args)
            this.logger.debug(`Commitment:`, args)
            const { extrinsic, options } = await this.contract.buildExtrinsic('dappUserCommit', encodedArgs)
            const paymentInfo = await extrinsic.paymentInfo(this.contract.pair)

            console.log(JSON.stringify(this.contract.api.consts.transactionPayment))
            console.log(await this.contract.api.derive.contracts.fees())
            process.exit(0)
            this.logger.debug(`${CONTRACT_METHOD_NAME} paymentInfo:`, paymentInfo.toHuman())
            //totalEncodedLength += extrinsic.encodedLength
            totalRefTime = totalRefTime.add(
                this.contract.api.registry.createType('WeightV2', options.gasLimit).refTime.toBn()
            )
            totalProofSize = totalProofSize.add(
                this.contract.api.registry.createType('WeightV2', options.gasLimit).proofSize.toBn()
            )
            totalFee = totalFee.add(paymentInfo.partialFee.toBn())
            const extrinsicTooHigh =
                totalRefTime.mul(BN_TEN_THOUSAND).div(maxBlockWeight.refTime.toBn()).toNumber() / 100 >
                this.batchCommitConfig.maxBatchExtrinsicPercentage
            console.log(
                'Free balance',
                (await this.contract.api.query.system.account(this.contract.pair.address)).data.free
                    .toBn()
                    .div(oneUnit(this.contract.api as ApiPromise))
                    .toString()
            )
            console.log('Total Fee', totalFee.div(oneUnit(this.contract.api as ApiPromise)).toString())
            const feeTooHigh = totalFee.gt(
                (await this.contract.api.query.system.account(this.contract.pair.address)).data.free.toBn()
            )

            // Check if we have a maximum number of transactions that we can successfully submit in a block or if the
            // total fee is more than the provider has left in their account
            if (extrinsicTooHigh || feeTooHigh) {
                const msg = extrinsicTooHigh ? 'Max batch extrinsic percentage reached' : 'Fee too high'
                this.logger.warn(msg)
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
}
