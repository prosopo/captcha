import { ProsopoServer } from './server.js'
export { ProsopoServer } from './server.js'
export { getServerConfig } from './config.js'
import { ProsopoServerConfigOutput } from '@prosopo/types'
import { PublicAccountNetwork, getPublicProsopoPair } from './publicProsopoPair.js'
export const PublicProsopoServer = async (
    config: ProsopoServerConfigOutput,
    publicAccountNetwork: PublicAccountNetwork
) => {
    const publicProsopoPair = await getPublicProsopoPair(publicAccountNetwork)

    return new ProsopoServer(publicProsopoPair, config)
}
