import { KeypairType } from '@polkadot/util-crypto/types'
import { getPair } from '@prosopo/common'

export const getPublicProsopoPair = async () => {
    const pairType = 'sr25519' as KeypairType
    const ss58Format = 42
    const prosopoSharedAccountSecret = 'open poet tennis test nice immune scorpion flag cement surge effort canal'

    return await getPair(pairType, ss58Format, prosopoSharedAccountSecret)
}
