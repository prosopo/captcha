import { ProsopoServer } from './server.js'
export { ProsopoServer } from './server.js'
export { getServerConfig } from './config.js'
import { getPairAsync } from '@prosopo/contract'
import type { ProsopoServerConfigOutput } from '@prosopo/types'
export const PublicProsopoServer = async (config: ProsopoServerConfigOutput) => {
    // if site key is '' then it will burn address
    const pair = await getPairAsync(config.networks[config.defaultNetwork], undefined, config.account.address)
    return new ProsopoServer(config, pair)
}
