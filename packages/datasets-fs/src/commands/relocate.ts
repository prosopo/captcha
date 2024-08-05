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
import { InputOutputArgsSchema, InputOutputCliCommand } from '../utils/inputOutput.js'
import { get } from '@prosopo/util'
import { lodash } from '@prosopo/util/lodash'
import fs from 'fs'

export const ArgsSchema = InputOutputArgsSchema.extend({
    from: z.string(),
    to: z.string(),
})
export type ArgsSchemaType = typeof ArgsSchema
export type Args = z.infer<ArgsSchemaType>

export class Relocate extends InputOutputCliCommand<ArgsSchemaType> {
    public override getArgSchema() {
        return ArgsSchema
    }

    public override getOptions() {
        return lodash().merge(super.getOptions(), {
            input: {
                description: 'A json file containing a list of objects with (at least) a url',
            },
            output: {
                description: 'Where to write the new json file containing the new urls',
            },
            from: {
                string: true,
                demand: true,
                description: 'The string to replace in the urls',
            },
            to: {
                description: 'The string to substitute in the urls',
                string: true,
                demand: true,
            },
        })
    }

    public override async _run(args: Args) {
        await super._run(args)

        const replace = (data: unknown, from: string, to: string) => {
            if (Array.isArray(data)) {
                for (let i = 0; i < data.length; i++) {
                    data[i] = replace(data[i], from, to)
                }
            } else if (typeof data === 'object') {
                const obj = data as {
                    [key: string]: unknown
                }
                for (const key of Object.keys(obj)) {
                    if (key === 'data') {
                        const value = get(obj, key)
                        if (typeof value === 'string') {
                            if (value.startsWith(from)) {
                                this.logger.debug('replacing', value)
                                obj[key] = to + value.slice(from.length)
                                this.logger.debug('replaced', obj[key])
                            }
                        }
                    } else {
                        obj[key] = replace(obj[key], from, to)
                    }
                }
            }
            return data
        }

        const file: string = args.input
        this.logger.log(`relocating data in ${file} from ${args.from} to ${args.to}`)
        // read the file
        let data = JSON.parse(fs.readFileSync(file, 'utf8'))
        // replace the urls by recursively traversing the data
        data = replace(data, args.from, args.to)
        // write the file
        fs.mkdirSync(args.output.split('/').slice(0, -1).join('/'), { recursive: true })
        fs.writeFileSync(args.output, JSON.stringify(data, null, 4))
    }

    public override getDescription(): string {
        return 'Relocate urls in a JSON file using string substitution'
    }
}
