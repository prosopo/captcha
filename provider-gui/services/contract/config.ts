import {
    DatabaseTypes,
    EnvironmentTypes,
    NetworkNames,
    NetworkPairTypeSchema,
    ProsopoConfigSchema,
} from '@prosopo/types'
import { getLogLevel } from '@prosopo/common'

const logLevel = getLogLevel()
export const getConfig = (environment: EnvironmentTypes, network: NetworkNames) => {
    return ProsopoConfigSchema.parse({
        logLevel,
        defaultEnvironment: environment,
        defaultNetwork: network,
        account: {
            password: '',
            address: 'currentAccount',
        },
        database: {
            development: { type: DatabaseTypes.enum.mongoMemory, endpoint: '', dbname: 'prosopo_test', authSource: '' },
        },
        server: {
            baseURL: 'http://localhost',
            port: 9229,
            fileServePaths: '[]',
        },
        networks: {
            development: {
                endpoint: 'ws://localhost:9944',
                contract: {
                    address: process.env.PROSOPO_CONTRACT_ADDRESS || '5HiVWQhJrysNcFNEWf2crArKht16zrhro3FcekVWocyQjx5u',
                    name: 'prosopo',
                },
                pairType: NetworkPairTypeSchema.parse('sr25519'),
                ss58Format: 42,
            },
            rococo: {
                endpoint: 'wss://rococo-contracts-rpc.polkadot.io:443',
                contract: {
                    address: process.env.PROSOPO_CONTRACT_ADDRESS || '5HiVWQhJrysNcFNEWf2crArKht16zrhro3FcekVWocyQjx5u',
                    name: 'prosopo',
                },
                pairType: NetworkPairTypeSchema.parse('sr25519'),
                ss58Format: 42,
            },
        },
    })
}
