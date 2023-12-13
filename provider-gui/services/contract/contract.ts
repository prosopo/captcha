import { ProviderEnvironment } from '@prosopo/env'
import { Tasks } from '@prosopo/provider'
import { defaultConfig } from '@prosopo/cli'

export const getContractApi = async (account: string) => {
    const env = new ProviderEnvironment(defaultConfig())
    const tasks = new Tasks(env)
    return (await tasks.contract.query.getProvider(account)).value.unwrap().unwrap()
}
