import type { ProsopoNetworksSchemaInput } from '../config/index.js'
import { NetworkNamesSchema, NetworkPairTypeSchema } from '../config/network.js'

const pairTypeSr25519 = NetworkPairTypeSchema.parse('sr25519')

const getContractAddress = (defaultAddress?: string) => {
    return process.env.PROSOPO_CONTRACT_ADDRESS ? process.env.PROSOPO_CONTRACT_ADDRESS : defaultAddress || ''
}

export default (): ProsopoNetworksSchemaInput => {
    return {
        [NetworkNamesSchema.Values.development]: {
            endpoint: process.env.PROSOPO_SUBSTRATE_ENDPOINT || 'ws://127.0.0.1:9944',
            contract: {
                name: 'captcha',
                address: getContractAddress('CONTRACT_NOT_DEPLOYED'),
            },
            pairType: pairTypeSr25519,
            ss58Format: 42,
        },
        [NetworkNamesSchema.Values.rococo]: {
            endpoint: process.env.PROSOPO_SUBSTRATE_ENDPOINT || 'wss://rococo-contracts-rpc.polkadot.io:443',
            contract: {
                name: 'captcha',
                address: getContractAddress('5HiVWQhJrysNcFNEWf2crArKht16zrhro3FcekVWocyQjx5u'),
            },
            pairType: pairTypeSr25519,
            ss58Format: 42,
        },
        [NetworkNamesSchema.Values.shiden]: {
            endpoint: process.env.PROSOPO_SUBSTRATE_ENDPOINT || 'wss://shiden.public.blastapi.io',
            contract: {
                address: getContractAddress('XpRox5bNg6YV8BHafsuHQ3b8i7gSq3GKPeYLA1b8EZwrDb3'),
                name: 'captcha',
            },
            pairType: pairTypeSr25519,
            ss58Format: 5,
        },
    }
}
