import { ApiPromise } from '@polkadot/api'
import { BN } from '@polkadot/util'

export function oneUnit(api: ApiPromise): BN {
    const chainDecimals = new BN(api.registry.chainDecimals[0])
    return new BN((10 ** chainDecimals.toNumber()).toString())
}
