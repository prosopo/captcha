import { ProsopoServer } from './server.js'
export { ProsopoServer } from './server.js'
export { getServerConfig } from './config.js'
import { ProsopoServerConfigOutput } from '@prosopo/types'
import { getPairAsync } from '@prosopo/contract'
export const PublicProsopoServer = async (config: ProsopoServerConfigOutput) => {
    const pair = await getPairAsync(config.networks[config.defaultNetwork], undefined, config.account.address)
    return new ProsopoServer(pair, config)
}
