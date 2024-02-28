import { LogLevel, Logger, getLogger } from '@prosopo/common'
import { getPrivateKey, getPublicKey } from './process.env.js'
import { main } from '../lib/getDapps.js'

export default (cmdArgs?: { logger?: Logger }) => {
    const logger = cmdArgs?.logger || getLogger(LogLevel.enum.info, 'flux.cli.deploy')

    return {
        command: 'getDapps',
        describe: 'Get dapp details',
        handler: async () => {
            try {
                const privateKey = getPrivateKey()
                const publicKey = getPublicKey()
                const dapps = await main(publicKey, privateKey)
                logger.info(JSON.stringify(dapps, null, 2))
            } catch (err) {
                logger.error(err)
            }
        },
        middlewares: [],
    }
}
