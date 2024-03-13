import fs from 'node:fs'
import { ProsopoDatasetError } from '@prosopo/common'
import { LabelledDataSchema, type LabelledItem } from '@prosopo/types'
import { lodash } from '@prosopo/util/lodash'
import type * as z from 'zod'
import { InputOutputArgsSchema, InputOutputCliCommand } from '../utils/inputOutput.js'

export const ArgsSchema = InputOutputArgsSchema.extend({})
export type ArgsSchemaType = typeof ArgsSchema
export type Args = z.infer<ArgsSchemaType>

export class Labels extends InputOutputCliCommand<ArgsSchemaType> {
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

    public override async _run(args: Args) {
        await super._run(args)

        const file = args.input
        if (!fs.existsSync(file)) {
            throw new ProsopoDatasetError(new Error(`file does not exist: ${file}`), {
                translationKey: 'FS.FILE_NOT_FOUND',
            })
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

        fs.mkdirSync(args.output.split('/').slice(0, -1).join('/'), {
            recursive: true,
        })
        fs.writeFileSync(args.output, JSON.stringify({ labels: labelArray }, null, 4))
    }

    public override getDescription(): string {
        return 'get all labels from some data'
    }
}
