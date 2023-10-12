import { ProsopoServer } from './server.js'
export { ProsopoServer } from './server.js'
export { getServerConfig } from './config.js'
import { ProsopoServerConfigOutput } from '@prosopo/types'
import { getPair } from '@prosopo/env'
export const PublicProsopoServer = async (config: ProsopoServerConfigOutput) => {
    const pair = await getPair(config.networks[config.defaultNetwork], undefined, config.account.address)
    return new ProsopoServer(pair, config)
}
