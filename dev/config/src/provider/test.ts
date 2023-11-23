import {
    DatabaseTypes,
    EnvironmentTypesSchema,
    NetworkNamesSchema,
    NetworkPairTypeSchema,
    ProsopoConfigSchema,
} from '@prosopo/types'
import { getLogLevel } from '@prosopo/common'

const logLevel = getLogLevel()
export default function getTestConfig() {
    return ProsopoConfigSchema.parse({
        logLevel,
        defaultEnvironment: EnvironmentTypesSchema.Values.development,
        defaultNetwork: NetworkNamesSchema.Values.development,
        account: {
            password: '',
            address: '',
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
                    address: process.env.PROSOPO_CONTRACT_ADDRESS || '',
                    name: 'prosopo',
                },
                pairType: NetworkPairTypeSchema.parse('sr25519'),
                ss58Format: 42,
            },
        },
    })
}
