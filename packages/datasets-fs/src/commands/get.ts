import fs from 'node:fs'
import { get } from '@prosopo/util'
import { lodash } from '@prosopo/util/lodash'
import cliProgress from 'cli-progress'
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
import { InputArgsSchema, InputCliCommand } from '../utils/input.js'

export const ArgsSchema = InputArgsSchema.extend({})
export type ArgsSchemaType = typeof ArgsSchema
export type Args = z.infer<ArgsSchemaType>
export class Get extends InputCliCommand<ArgsSchemaType> {
    public override getArgSchema() {
        return ArgsSchema
    }

    public override getOptions() {
        return lodash().merge(super.getOptions(), {
            input: {
                description: 'JSON file containing urls under a "data" key',
            },
        })
    }

    public override async _run(args: Args) {
        await super._run(args)
        const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic)

        const list: string[] = []
        const traverse = async (data: any) => {
            if (Array.isArray(data)) {
                for (let i = 0; i < data.length; i++) {
                    data[i] = await traverse(data[i])
                }
            } else if (data instanceof Object) {
                for (const key of Object.keys(data)) {
                    if (key === 'data') {
                        const value = get(data, key)
                        const url = z.string().parse(value)
                        list.push(url)
                    } else {
                        await traverse(get(data, key))
                    }
                }
            }
            return data
        }

        const file = args.input

        // read the map file
        const data: any = JSON.parse(fs.readFileSync(file, 'utf8'))
        await traverse(data)

        bar.start(list.length, 0)
        for (const url of list) {
            bar.increment()
            if (url.startsWith('http')) {
                try {
                    const response = await fetch(url)
                    if (!response.ok) {
                        this.logger.error(`GET ${url} ${response.status} ${response.statusText}`)
                    } else {
                        this.logger.log(`GET ${url} OK`)
                    }
                } catch (err) {
                    this.logger.error(err)
                }
            } else {
                // resolve locally
                try {
                    fs.readFileSync(url)
                    this.logger.log(`GET ${url} OK`)
                } catch (err) {
                    this.logger.error(`GET ${url} ${err}`)
                }
            }
        }
        bar.stop()
    }

    public override getDescription(): string {
        return 'Test a GET request at image URLs'
    }
}
