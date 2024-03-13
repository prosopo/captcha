import { LogLevel, Loggable, ProsopoCliError, getLogger } from '@prosopo/common'
import yargs, { type Argv } from 'yargs'
import { hideBin } from 'yargs/helpers'
import type { CliCommandAny } from './cliCommand.js'

const dirname = process.cwd()
const logger = getLogger(LogLevel.enum.info, `${dirname}`)

export class Cli extends Loggable {
    #commands: CliCommandAny[]

    constructor(commands: CliCommandAny[]) {
        super()
        this.#commands = commands
        this.logger = logger
    }

    private config() {
        let y = yargs(hideBin(process.argv))
            .option('log-level', {
                type: 'string',
                choices: Object.values(LogLevel.options),
                default: LogLevel.enum.info,
                description: 'The log level',
            })
            .middleware((argv: any) => {
                this.logger.setLogLevel(argv.logLevel)
            }, true)
        this.#commands.forEach((command) => {
            y = y.command({
                command: command.getCommandName(),
                describe: command.getDescription(),
                builder: command.getOptions(),
                handler: async (argv: any) => {
                    this.logger.debug(`running ${command.getCommandName()}}`)
                    const args = await command.parse(argv)
                    await command.exec(args)
                },
            })
        })
        if (!this.#commands.find((c) => c.getCommandName() === '$0')) {
            // no default command
            y = y.command(
                '$0',
                'default command',
                (y: Argv) => y,
                (argv: any) => {
                    throw new ProsopoCliError('CLI.PARAMETER_ERROR', {
                        context: { error: 'no command specified' },
                    })
                }
            )
        }
        y = y
            .demandCommand()
            .strict()
            .showHelpOnFail(false, 'Specify --help for available options')
        return y
    }

    public async exec(args: string[] = process.argv.slice(2)) {
        const config = this.config()
        this.logger.debug('parsing', args)
        await config.parse(args)
    }
}
