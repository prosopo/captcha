import { CliCommandAny } from './cliCommand.js'
import { Flatten } from './commands/flatten.js'
import { GenerateV1 } from './commands/generateV1.js'
import { GenerateV2 } from './commands/generateV2.js'
import { Get } from './commands/get.js'
import { Labels } from './commands/labels.js'
import { LogLevel, Loggable, getLogger } from '@prosopo/common'
import { Relocate } from './commands/relocate.js'
import { Resize } from './commands/resize.js'
import { hideBin } from 'yargs/helpers'
import esMain from 'es-main'
import yargs, { Argv } from 'yargs'

const dirname = process.cwd()
const logger = getLogger(LogLevel.enum.info, `${dirname}`)

export class Cli extends Loggable {
    #commands: CliCommandAny[]

    constructor(commands: CliCommandAny[]) {
        super()
        this.#commands = commands
        this.logger = logger
    }

    private config = () => {
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
                    await command.parseThenExec(argv)
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
                    throw new Error(`no command specified`)
                }
            )
        }
        y = y.demandCommand().strict().showHelpOnFail(false, 'Specify --help for available options')
        return y
    }

    public exec = async (args: string[] = process.argv.slice(2)) => {
        const config = this.config()
        this.logger.debug('parsing', args)
        await config.parse(args)
    }
}

const main = async () => {
    const commands: CliCommandAny[] = [
        new Flatten(),
        new GenerateV1(),
        new GenerateV2(),
        new Get(),
        new Labels(),
        new Relocate(),
        new Resize(),
    ]
    const cli = new Cli(commands)
    cli.logger.setLogLevel('debug')
    await cli.exec()
}

//if main process
if (esMain(import.meta)) {
    main()
        .then(() => {
            process.exit(0)
        })
        .catch((err) => {
            logger.error('error', err)
            process.exit(1)
        })
}
