import { KeypairType } from '@polkadot/util-crypto/types'
import { getPair } from '@prosopo/env'

export type PublicAccountNetwork = 'rococo'

export const getPublicProsopoPair = async (network: PublicAccountNetwork) => {
    const accountNetworkMap = {
        rococo: 'open poet tennis test nice immune scorpion flag cement surge effort canal', // Prosopo rococo shared public account
    }

    const pairType = 'sr25519' as KeypairType
    const ss58Format = 42
    const prosopoSharedAccountSecret = accountNetworkMap[network]

    return await getPair(prosopoSharedAccountSecret, pairType, ss58Format)
}
