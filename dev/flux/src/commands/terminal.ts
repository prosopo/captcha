import * as z from 'zod'
import { ArgumentsCamelCase, Argv } from 'yargs'
import { LogLevel, Logger, getLogger } from '@prosopo/common'
import { getPrivateKey, getPublicKey } from './process.env.js'
import { main } from '../lib/terminal.js'

const fluxAuthArgs = z.object({
    app: z.string(),
    ip: z.string().optional(),
})

export default (cmdArgs?: { logger?: Logger }) => {
    const logger = cmdArgs?.logger || getLogger(LogLevel.enum.info, 'flux.cli.auth')

    return {
        command: 'terminal',
        describe: 'Start a terminal to a Flux Node',
        builder: (yargs: Argv) =>
            yargs
                .option('app', {
                    type: 'string' as const,
                    demandOption: false,
                    desc: 'Name of the app to authenticate with',
                } as const)
                .option('ip', {
                    type: 'string' as const,
                    demandOption: false,
                    desc: 'IP address of Flux machine to authenticate with',
                } as const),
        handler: async (argv: ArgumentsCamelCase) => {
            try {
                const privateKey = getPrivateKey()
                const publicKey = getPublicKey()
                const parsedArgs = fluxAuthArgs.parse(argv)
                const result = await main(publicKey, privateKey, parsedArgs.app, parsedArgs.ip)
                console.log(result)
            } catch (err) {
                logger.error(err)
            }
        },
        middlewares: [],
    }
}
