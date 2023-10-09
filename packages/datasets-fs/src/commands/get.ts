import { InputArgsSchema, InputCliBuilder } from '../utils/input.js'
import { lodash } from '@prosopo/util'
import { z } from 'zod'
import fs from 'fs'
import { get } from '@prosopo/util'

export const ArgsSchema = InputArgsSchema.extend({})
export type ArgsSchemaType = typeof ArgsSchema
export type Args = z.infer<ArgsSchemaType>
export class Get extends InputCliBuilder<ArgsSchemaType> {
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

    public override async run(args: Args) {
        await super.run(args)

        const traverse = async (data: any) => {
            if (data instanceof Array) {
                for (let i = 0; i < data.length; i++) {
                    data[i] = await traverse(data[i])
                }
            } else if (data instanceof Object) {
                for (const key of Object.keys(data)) {
                    if (key == 'data') {
                        const value = get(data, key)
                        const url = z.string().parse(value)
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
    }

    public override getDescription(): string {
        return 'Test a GET request at image URLs'
    }
}
