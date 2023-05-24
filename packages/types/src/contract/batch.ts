import { SubmittableExtrinsic } from '@polkadot/api/types'
import { BN } from '@polkadot/util'
import { ArgumentTypes } from './typechain/captcha/types-arguments'

export interface ExtrinsicBatch {
    extrinsics: SubmittableExtrinsic<'promise'>[]
    ids: ArgumentTypes.Hash[]
    totalFee: BN
    totalRefTime: BN
    totalProofSize: BN
}
