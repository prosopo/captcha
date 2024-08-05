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
import { CliCommand } from '../cli/cliCommand.js'
import { ProsopoEnvError, ProsopoError } from '@prosopo/common'
import { boolean, object, string, type infer as zInfer } from 'zod'
import { lodash } from '@prosopo/util/lodash'
import fs from 'fs'

export const OutputArgsSchema = object({
    output: string(),
    overwrite: boolean().optional(),
})

export type OutputArgs = zInfer<typeof OutputArgsSchema>

export class OutputCliCommand<T extends typeof OutputArgsSchema> extends CliCommand<T> {
    #outputExists = false

    public outputExists() {
        return this.#outputExists
    }

    public override getArgSchema(): T {
        throw new ProsopoError('DEVELOPER.METHOD_NOT_IMPLEMENTED')
    }
    public override getDescription(): string {
        throw new ProsopoError('DEVELOPER.METHOD_NOT_IMPLEMENTED')
    }
    public override getOptions() {
        return lodash().merge(super.getOptions(), {
            output: {
                alias: 'out',
                string: true,
                demand: true,
                description: 'The output path',
            },
            overwrite: {
                boolean: true,
                description: 'Overwrite files in the output path if they already exist',
            },
        })
    }

    public override async _check(args: OutputArgs) {
        this.logger.debug('Output _check')
        await super._check(args)

        // record whether output already exists
        this.#outputExists = fs.existsSync(args.output)

        // output must not exist, unless overwrite is true
        if (this.outputExists()) {
            if (!args.overwrite) {
                throw new ProsopoEnvError(new Error(`output path already exists: ${args.output}`), {
                    translationKey: 'FS.FILE_ALREADY_EXISTS',
                })
            }
        }
    }

    public override async _run(args: OutputArgs) {
        this.logger.debug('Output run')
        await super._run(args)
        if (args.overwrite && this.outputExists()) {
            // if overwrite is true, delete the output directory
            this.logger.info('cleaning output directory...')
            fs.rmSync(args.output, { recursive: true })
        }
    }
}
