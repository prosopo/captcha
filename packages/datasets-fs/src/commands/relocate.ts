import { InputOutputArgsSchema as InputOutputArgsSchema, InputOutputCliBuilder } from '../utils/inputOutput.js'
import { get, lodash } from '@prosopo/util'
import { z } from 'zod'
import fs from 'fs'

export const ArgsSchema = InputOutputArgsSchema.extend({
    from: z.string(),
    to: z.string(),
})
export type ArgsSchemaType = typeof ArgsSchema
export type Args = z.infer<ArgsSchemaType>

export class Relocate extends InputOutputCliBuilder<ArgsSchemaType> {
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

    public override async run(args: Args) {
        await super.run(args)

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
                        if (value instanceof String) {
                            if (value.startsWith(from)) {
                                obj[key] = to + value.slice(from.length)
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
        fs.writeFileSync(args.output, JSON.stringify(data, null, 4))
    }

    public override getDescription(): string {
        return 'Relocate urls in a JSON file using string substitution'
    }
}
