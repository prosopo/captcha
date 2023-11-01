import { ProviderEnvironment } from '@prosopo/env'
import { Tasks } from '@prosopo/provider'
import { defaultConfig } from '@prosopo/cli'

export const getContractApi = async (account: string) => {
    // Todo: spread the default env, add in the stuff we require for gui
    const env = new ProviderEnvironment(defaultConfig())
    const tasks = new Tasks(env)
    return (await tasks.contract.query.getProvider(account)).value.unwrap().unwrap()
}

// export const getAllProviders = async () => {
//     const env = new ProviderEnvironment(defaultConfig())
//     const tasks = new Tasks(env)
//     return (await tasks.contract.query.getAllProviders()).value.unwrap()
// }
