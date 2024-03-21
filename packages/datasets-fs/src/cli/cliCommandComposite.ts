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
import * as z from 'zod'
import { CliCommand, CliCommandAny } from './cliCommand.js'
import { Options } from 'yargs'

export abstract class CliCommandComposite<T extends z.ZodTypeAny> extends CliCommand<T> {
    #commands: CliCommandAny[] = []

    public getCommands() {
        return this.#commands
    }

    constructor(commands: CliCommandAny[]) {
        super()
        // take a copy of the array to avoid leakage
        this.#commands = [...commands]
    }

    public override getOptions(): { [key: string]: Options } {
        // merge options in turn from each command. Command order matters, latter commands will overwrite earlier ones
        return this.#commands.reduce((prev, command) => {
            return { ...prev, ...command.getOptions() }
        }, {})
    }

    public override _run(args: z.TypeOf<T>): Promise<void> {
        return this.#commands.reduce(async (prev, command) => {
            await prev
            await command._run(args)
        }, Promise.resolve())
    }

    public override _check(args: z.TypeOf<T>): Promise<void> {
        return this.#commands.reduce(async (prev, command) => {
            await prev
            await command._check(args)
        }, Promise.resolve())
    }
}
