import { EnvironmentTypes, NetworkNames, ProsopoBasicConfigSchema } from '@prosopo/types'
import { getLogLevel } from '@prosopo/common'

const logLevel = getLogLevel()
export const getConfig = (environment: EnvironmentTypes, network: NetworkNames) => {
    return ProsopoBasicConfigSchema.parse({
        logLevel,
        defaultEnvironment: environment,
        defaultNetwork: network,
        account: {
            password: '',
            address: 'currentAccount',
        },
    })
}
