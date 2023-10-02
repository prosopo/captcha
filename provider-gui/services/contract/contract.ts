import { ProviderEnvironment } from '@prosopo/env'
import { Tasks } from '@prosopo/provider'
import { defaultConfig, getPairType, getSs58Format } from '@prosopo/cli'
import { getPair } from '@prosopo/env'

export const getContractApi = async (account: string) => {
    // Todo: spread the default env, add in the stuff we require for gui
    const pair = await getPair(getSs58Format(), getPairType(), 'account')
    const env = new ProviderEnvironment(pair, defaultConfig())
    const tasks = new Tasks(env)
    return (await tasks.contract.query.getProvider(account)).value.unwrap().unwrap()
}
