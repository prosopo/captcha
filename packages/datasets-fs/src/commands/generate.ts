import { Item, LabelledItem } from '@prosopo/types'
import { InputOutputArgsSchema as InputOutputArgsSchema, InputOutputCliCommand } from '../utils/inputOutput.js'
import { lodash } from '@prosopo/util'
import { z } from 'zod'
import { OutputArgsSchema, OutputCliCommand } from '../utils/output.js'

export const ArgsSchema = OutputArgsSchema.extend({
    labels: z.string().optional(),
    labelled: z.string().optional(),
    unlabelled: z.string().optional(),
    seed: z.number().optional(),
    size: z.number().optional(),
    overwrite: z.boolean().optional(),
    allowDuplicates: z.boolean().optional(),
    allowDuplicatesLabelled: z.boolean().optional(),
    allowDuplicatesUnlabelled: z.boolean().optional(),
})
export type ArgsSchemaType = typeof ArgsSchema
export type Args = z.infer<ArgsSchemaType>

export abstract class Generate<T extends ArgsSchemaType> extends OutputCliCommand<T> {
    public override getOptions() {
        return lodash().merge(super.getOptions(), {
            output: {
                description: 'Where to write the captchas JSON file',
            },
            labelled: {
                string: true,
                demand: true,
                description: 'Path to JSON file containing labelled data',
            },
            unlabelled: {
                string: true,
                demand: true,
                description: 'Path to JSON file containing unlabelled data',
            },
            seed: {
                number: true,
                description: 'Seed for random number generator',
            },
            size: {
                number: true,
                description: 'Number of images in each captcha',
            },
            labels: {
                string: true,
                description:
                    'Path to JSON file containing labels which unlabelled data will be assigned to. If not given, labels will be deduced from the labelled data.',
            },
            allowDuplicates: {
                boolean: true,
                description: 'If true, allow duplicates in the data (labelled and unlabelled)',
            },
            allowDuplicatesLabelled: {
                boolean: true,
                description: 'If true, allow duplicates in the labelled data',
            },
            allowDuplicatesUnlabelled: {
                boolean: true,
                description: 'If true, allow duplicates in the unlabelled data',
            },
        })
    }
}

export const checkDuplicates = (
    labelled: LabelledItem[],
    unlabelled: Item[],
    options: {
        allowDuplicatesLabelled?: boolean
        allowDuplicatesUnlabelled?: boolean
    }
) => {
    // check for duplicates
    const all = new Set<string>()
    if (!options.allowDuplicatesLabelled) {
        for (const entry of labelled) {
            if (all.has(entry.data)) {
                throw new Error(`Duplicate data entry in labelled data: ${JSON.stringify(entry)}`)
            }
            all.add(entry.data)
        }
    }
    if (!options.allowDuplicatesUnlabelled) {
        for (const entry of unlabelled) {
            if (all.has(entry.data)) {
                throw new Error(`Duplicate data entry in unlabelled data: ${JSON.stringify(entry)}`)
            }
        }
    }
}
