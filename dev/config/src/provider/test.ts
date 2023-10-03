import { DatabaseTypes, EnvironmentTypesSchema, NetworkNamesSchema, ProsopoConfigSchema } from '@prosopo/types'
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
    })
}
