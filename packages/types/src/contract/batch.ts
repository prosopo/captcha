import { ArgumentTypes } from './typechain/captcha/types-arguments'
import { BN } from '@polkadot/util'
import { SubmittableExtrinsic } from '@polkadot/api/types'

export interface ExtrinsicBatch {
    extrinsics: SubmittableExtrinsic<'promise'>[]
    ids: ArgumentTypes.Hash[]
    totalFee: BN
    totalRefTime: BN
    totalProofSize: BN
}
