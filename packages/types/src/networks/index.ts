import { NetworkNamesSchema } from '../config/config.js'
export default {
    [NetworkNamesSchema.Values.development]: {
        endpoint: process.env.SUBSTRATE_NODE_URL || 'ws://127.0.0.1:9944',
        contract: {
            name: 'captcha',
            address: process.env.PROSOPO_CONTRACT_ADDRESS || process.env.REACT_APP_PROSOPO_CONTRACT_ADDRESS || '',
        },
        pairType: 'sr25519',
        ss58Format: 42,
    },
    [NetworkNamesSchema.Values.rococo]: {
        endpoint: process.env.SUBSTRATE_NODE_URL || 'wss://rococo-contracts-rpc.polkadot.io:443',
        contract: {
            name: 'captcha',
            address:
                process.env.PROSOPO_CONTRACT_ADDRESS ||
                process.env.REACT_APP_PROSOPO_CONTRACT_ADDRESS ||
                '5HiVWQhJrysNcFNEWf2crArKht16zrhro3FcekVWocyQjx5u',
        },
        pairType: 'sr25519',
        ss58Format: 42,
    },
    [NetworkNamesSchema.Values.shiden]: {
        endpoint: process.env.SUBSTRATE_NODE_URL || 'wss://shiden.public.blastapi.io',
        contract: {
            address:
                process.env.PROSOPO_CONTRACT_ADDRESS ||
                process.env.REACT_APP_PROSOPO_CONTRACT_ADDRESS ||
                'XpRox5bNg6YV8BHafsuHQ3b8i7gSq3GKPeYLA1b8EZwrDb3',
            name: 'prosopo',
        },
        pairType: 'sr25519',
        ss58Format: 5,
    },
} as Network
