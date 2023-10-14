import { NetworkNamesSchema, NetworkPairTypeSchema } from '../config/network.js'
import { ProsopoEnvError } from '@prosopo/common'
import { ProsopoNetworksSchemaInput } from '../config/index.js'
const pairTypeSr25519 = NetworkPairTypeSchema.parse('sr25519')

const getContractAddress = (defaultAddress?: string) => {
    const address =
        process.env.PROTOCOL_CONTRACT_ADDRESS ||
        process.env.PROSOPO_CONTRACT_ADDRESS ||
        process.env.REACT_APP_PROSOPO_CONTRACT_ADDRESS ||
        defaultAddress
    if (!address) {
        throw new ProsopoEnvError('CONTRACT.CONTRACT_UNDEFINED', undefined, undefined, process.env)
    }
    return address
}

export default (): ProsopoNetworksSchemaInput => {
    return {
        [NetworkNamesSchema.Values.development]: {
            endpoint:
                process.env.REACT_APP_SUBSTRATE_ENDPOINT || process.env.SUBSTRATE_NODE_URL || 'ws://127.0.0.1:9944',
            contract: {
                name: 'captcha',
                address: getContractAddress(),
            },
            pairType: pairTypeSr25519,
            ss58Format: 42,
        },
        [NetworkNamesSchema.Values.rococo]: {
            endpoint:
                process.env.REACT_APP_SUBSTRATE_ENDPOINT ||
                process.env.SUBSTRATE_NODE_URL ||
                'wss://rococo-contracts-rpc.polkadot.io:443',
            contract: {
                name: 'captcha',
                address: getContractAddress('5HiVWQhJrysNcFNEWf2crArKht16zrhro3FcekVWocyQjx5u'),
            },
            pairType: pairTypeSr25519,
            ss58Format: 42,
        },
        [NetworkNamesSchema.Values.shiden]: {
            endpoint:
                process.env.REACT_APP_SUBSTRATE_ENDPOINT ||
                process.env.SUBSTRATE_NODE_URL ||
                'wss://shiden.public.blastapi.io',
            contract: {
                address: getContractAddress('XpRox5bNg6YV8BHafsuHQ3b8i7gSq3GKPeYLA1b8EZwrDb3'),
                name: 'captcha',
            },
            pairType: pairTypeSr25519,
            ss58Format: 5,
        },
    }
}
