import consola, { LogLevel } from 'consola'
import path from 'path'
import yargs from 'yargs'
import builder from '../buildScripts/esbuild'
const rootDir = path.resolve('.')

export async function processArgs(args) {
    const parsed = await yargs.option('logLevel', {
        describe: 'set log level',
        choices: Object.keys(LogLevel),
    }).argv

    const logger = consola.create({ level: LogLevel[parsed.logLevel || 'Info'] })

    yargs
        .usage('Usage: $0 [global options] <command> [options]')

        .command({
            command: 'build',
            describe: 'Build one or more packages in the workspace',
            builder: (yargs) =>
                yargs.option('packages', {
                    type: 'array',
                    demand: true,
                }),
            handler: async (argv) => {
                console.log('Building...')
                await builder(argv.packages)
            },
        })

    await yargs.parse()
}
processArgs(process.argv.slice(2))
    .then(() => {
        process.exit(0)
    })
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
