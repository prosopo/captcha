import * as z from 'zod'
import { ArgumentsCamelCase, Argv } from 'yargs'
import { FLUX_URL, getAuth, getIndividualFluxAppDetails } from '../lib/auth.js'
import { LogLevel, Logger, getLogger } from '@prosopo/common'
import { getPrivateKey, getPublicKey } from './process.env.js'
const fluxGetDappArgs = z.object({
    app: z.string(),
    nodes: z.boolean().optional(),
})
export default (cmdArgs?: { logger?: Logger }) => {
    const logger = cmdArgs?.logger || getLogger(LogLevel.enum.info, 'flux.cli.getDapp')

    return {
        command: 'getDapp',
        describe: 'Get dapp details',
        builder: (yargs: Argv) =>
            yargs
                .option('app', {
                    type: 'string' as const,
                    demandOption: false,
                    desc: 'Name of the dapp to get the details of',
                } as const)
                .option('--nodes', {
                    type: 'boolean' as const,
                    demandOption: false,
                    desc: 'Return node details only',
                } as const),
        handler: async (argv: ArgumentsCamelCase) => {
            try {
                const privateKey = getPrivateKey()
                const publicKey = getPublicKey()
                const { signature, loginPhrase } = await getAuth(privateKey, FLUX_URL)
                const parsedArgs = fluxGetDappArgs.parse(argv)
                const dapp = await getIndividualFluxAppDetails(parsedArgs.app, publicKey, signature, loginPhrase)
                if (parsedArgs.nodes) {
                    logger.info(dapp.nodes)
                    return
                }
                logger.info(JSON.stringify(dapp, null, 2))
            } catch (err) {
                logger.error(err)
            }
        },
        middlewares: [],
    }
}
