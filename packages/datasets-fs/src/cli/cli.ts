// Copyright 2021-2024 Prosopo (UK) Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import type { CliCommandAny } from './cliCommand.js'
import { LogLevel, Loggable, ProsopoCliError, getLogger } from '@prosopo/common'
import { hideBin } from 'yargs/helpers'
import yargs, { type Argv } from 'yargs'

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
            // biome-ignore lint/suspicious/noExplicitAny: TODO fix
            .middleware((argv: any) => {
                this.logger.setLogLevel(argv.logLevel)
            }, true)

        for(const command of this.#commands) {

            y = y.command({
                command: command.getCommandName(),
                describe: command.getDescription(),
                builder: command.getOptions(),
                // biome-ignore lint/suspicious/noExplicitAny: TODO fix
                handler: async (argv: any) => {
                    this.logger.debug(`running ${command.getCommandName()}}`)
                    const args = await command.parse(argv)
                    await command.exec(args)
                },
            })
        }
        
        if (!this.#commands.find((c) => c.getCommandName() === '$0')) {
            // no default command
            y = y.command(
                '$0',
                'default command',
                (y: Argv) => y,
                () => {
                    throw new ProsopoCliError('CLI.PARAMETER_ERROR', { context: { error: "no command specified" } })
                }
            )
        }
        y = y.demandCommand().strict().showHelpOnFail(false, 'Specify --help for available options')
        return y
    }

    public async exec(args: string[] = process.argv.slice(2)) {
        const config = this.config()
        this.logger.debug('parsing', args)
        await config.parse(args)
    }
}
