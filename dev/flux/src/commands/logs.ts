import * as z from 'zod'
import { ArgumentsCamelCase, Argv } from 'yargs'
import { LogLevel, Logger, getLogger } from '@prosopo/common'
import { consoleTableWithWrapping } from '@prosopo/util'
import { getPrivateKey, getPublicKey } from './process.env.js'
import { main } from '../lib/logs.js'
import fs from 'fs'
import path from 'path'

const fluxAuthArgs = z.object({
    app: z.string(),
    ip: z.string().optional(),
    file: z.string().optional(),
})

const writeLogs = (file: string, result: { url: string; logs: string }[]) => {
    const filePath = path.resolve(file)
    // delete the file if it exists
    fs.unlink(file, function (err) {
        if (err) return console.log(err)
        console.log('file deleted successfully')
    })
    // write logs as individual lines to a file
    fs.appendFileSync(filePath, `host, log\n`)
    Object.values(result).map(({ url, logs }) => {
        const paddedURL = url.padEnd(32, ' ')
        logs.split('\\n').map((log) => fs.appendFileSync(filePath, `${paddedURL}, ${log}\n`))
    })
}

export default (cmdArgs?: { logger?: Logger }) => {
    const logger = cmdArgs?.logger || getLogger(LogLevel.enum.info, 'flux.cli.auth')

    return {
        command: 'logs',
        describe: 'Output the last `n` lines of logs from a Flux Node',
        builder: (yargs: Argv) =>
            yargs
                .option('app', {
                    type: 'string' as const,
                    demandOption: false,
                    desc: 'Name of the app to authenticate with. Authentication is done with api.runonflux.io by default.',
                } as const)
                .option('ip', {
                    type: 'string' as const,
                    demandOption: false,
                    desc: 'IP address of Flux node to authenticate with',
                } as const)
                .option('file', {
                    type: 'string' as const,
                    demandOption: false,
                    desc: 'Write the logs to a file',
                } as const),

        handler: async (argv: ArgumentsCamelCase) => {
            try {
                const privateKey = getPrivateKey()
                const publicKey = getPublicKey()
                const parsedArgs = fluxAuthArgs.parse(argv)
                const result = await main(publicKey, privateKey, parsedArgs.app, parsedArgs.ip)
                consoleTableWithWrapping(result)
                if (parsedArgs.file) {
                    writeLogs(parsedArgs.file, result)
                }
            } catch (err) {
                logger.error(err)
            }
        },
        middlewares: [],
    }
}
