import { BN } from '@polkadot/util'
import { WeightV2 } from '@polkadot/types/interfaces'

export interface UseWeight {
    executionTime: number
    isEmpty: boolean
    isValid: boolean
    isWeightV2: boolean
    megaGas: BN
    megaRefTime: BN
    proofSize: BN
    percentage: number
    weight: BN
    weightV2: WeightV2
}
