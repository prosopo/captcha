import { SubmittableExtrinsic } from '@polkadot/api/types'
import { BN } from '@polkadot/util'

export interface ExtrinsicBatch {
    extrinsics: SubmittableExtrinsic<'promise'>[]
    ids: string[]
    totalFee: BN
    totalRefTime: BN
    totalProofSize: BN
}
