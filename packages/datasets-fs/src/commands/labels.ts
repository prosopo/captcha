import { InputOutputArgsSchema as InputOutputArgsSchema, InputOutputCliBuilder } from '../utils/inputOutput.js'
import { LabelledDataSchema, LabelledItem } from '@prosopo/types'
import { ProsopoEnvError } from '@prosopo/common'
import { lodash } from '@prosopo/util'
import { z } from 'zod'
import fs from 'fs'

export const ArgsSchema = InputOutputArgsSchema.extend({})
export type ArgsSchemaType = typeof ArgsSchema
export type Args = z.infer<ArgsSchemaType>

export class Labels extends InputOutputCliBuilder<ArgsSchemaType> {
    public override getArgSchema() {
        return ArgsSchema
    }

    public override getOptions() {
        return lodash().merge(super.getOptions(), {
            input: {
                description: 'JSON file containing labelled data',
            },
            output: {
                description: 'Where to put the JSON file containing labels',
            },
        })
    }

    public override async run(args: Args) {
        await super.run(args)

        const file = args.input
        if (!fs.existsSync(file)) {
            throw new ProsopoEnvError(new Error(`file does not exist: ${file}`), 'FS.FILE_NOT_FOUND')
        }

        const labelled: LabelledItem[] = file
            ? LabelledDataSchema.parse(JSON.parse(fs.readFileSync(file, 'utf8'))).items
            : []

        const labels = new Set<string>()
        for (const item of labelled) {
            labels.add(item.label)
        }
        const labelArray = Array.from(labels)
        labelArray.sort()

        fs.writeFileSync(args.output, JSON.stringify({ labels: labelArray }, null, 4))
    }
}
