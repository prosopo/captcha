import fs from 'node:fs'
import { ProsopoDatasetError } from '@prosopo/common'
import {
    DataSchema,
    type Item,
    LabelledDataSchema,
    type LabelledItem,
    LabelsContainerSchema,
} from '@prosopo/types'
import { lodash, setSeedGlobal } from '@prosopo/util/lodash'
import * as z from 'zod'
import { OutputArgsSchema, OutputCliCommand } from '../utils/output.js'

export const ArgsSchema = OutputArgsSchema.extend({
    labels: z.string().optional(),
    labelled: z.string().optional(),
    unlabelled: z.string().optional(),
    seed: z.number(),
    size: z.number().optional(),
    overwrite: z.boolean().optional(),
    allowDuplicates: z.boolean().optional(),
    allowDuplicatesLabelled: z.boolean().optional(),
    allowDuplicatesUnlabelled: z.boolean().optional(),
})
export type ArgsSchemaType = typeof ArgsSchema
export type Args = z.infer<ArgsSchemaType>

export abstract class Generate<
    T extends ArgsSchemaType,
> extends OutputCliCommand<T> {
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
                demand: true,
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
                description:
                    'If true, allow duplicates in the data (labelled and unlabelled)',
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

    public override async _check(args: Args) {
        // if specified, check files exist
        const labelledMapFile: string | undefined = args.labelled
        if (labelledMapFile && !fs.existsSync(labelledMapFile)) {
            throw new ProsopoDatasetError(
                new Error(
                    `labelled map file does not exist: ${labelledMapFile}`
                ),
                {
                    translationKey: 'FS.FILE_NOT_FOUND',
                }
            )
        }
        const unlabelledMapFile: string | undefined = args.unlabelled
        if (unlabelledMapFile && !fs.existsSync(unlabelledMapFile)) {
            throw new ProsopoDatasetError(
                new Error(
                    `unlabelled map file does not exist: ${unlabelledMapFile}`
                ),
                {
                    translationKey: 'FS.FILE_NOT_FOUND',
                }
            )
        }
        this.labelledMapFile = labelledMapFile || ''
        this.unlabelledMapFile = unlabelledMapFile || ''
    }

    labelled: LabelledItem[] = []
    unlabelled: Item[] = []
    labels: string[] = []
    labelledMapFile = ''
    unlabelledMapFile = ''
    labelToImages: { [label: string]: Item[] } = {}
    targets: string[] = []
    saltRounds = 10

    private loadData(args: Args) {
        const allowDuplicatesLabelled =
            args.allowDuplicatesLabelled || args.allowDuplicates || false
        const allowDuplicatesUnlabelled =
            args.allowDuplicatesUnlabelled || args.allowDuplicates || false

        // load the map to get the labelled and unlabelled data
        this.labelled = this.labelledMapFile
            ? LabelledDataSchema.parse(
                  JSON.parse(fs.readFileSync(this.labelledMapFile, 'utf8'))
              ).items
            : []
        this.unlabelled = this.unlabelledMapFile
            ? DataSchema.parse(
                  JSON.parse(fs.readFileSync(this.unlabelledMapFile, 'utf8'))
              ).items
            : []

        // check for duplicates
        checkDuplicates(this.labelled, this.unlabelled, {
            allowDuplicatesLabelled,
            allowDuplicatesUnlabelled,
        })

        // split the labelled data by label
        this.labelToImages = {}
        for (const entry of this.labelled) {
            const arr = this.labelToImages[entry.label] || []
            arr.push(entry)
            this.labelToImages[entry.label] = arr
        }
        this.targets = Object.keys(this.labelToImages)
    }

    private loadLabels(args: Args) {
        // load the labels from file
        // these are the labels that unlabelled data will be assigned to
        // note that these can be different to the labels in the map file as the labelled data is independent of the unlabelled data in terms of labels
        this.labels = []
        if (args.labels && fs.existsSync(args.labels)) {
            this.labels.push(
                ...[
                    ...LabelsContainerSchema.parse(
                        JSON.parse(fs.readFileSync(args.labels, 'utf8'))
                    ).labels,
                ]
            )
        } else {
            // else default to the labels in the labelled data
            this.labels.push(...[...this.targets])
        }
    }

    public override async _run(args: Args) {
        await super._run(args)
        // set the seed
        setSeedGlobal(args.seed || 0)
        // get lodash (with seeded rng)
        const _ = lodash()

        this.loadData(args)

        this.loadLabels(args)
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
    if (!options.allowDuplicatesLabelled)
        addAllUnique(all, labelled, 'labelled')
    if (!options.allowDuplicatesUnlabelled)
        addAllUnique(all, unlabelled, 'unlabelled')
}

const addAllUnique = (all: Set<string>, entries: Item[], dataType: string) => {
    for (const entry of entries) {
        addUnique(all, entry, dataType)
    }
}

const addUnique = (all: Set<string>, entry: Item, dataType: string) => {
    if (all.has(entry.data)) {
        throw new ProsopoDatasetError('DATASET.DUPLICATE_IMAGE', {
            context: {
                error: `Duplicate data entry in ${dataType} data: ${JSON.stringify(
                    entry
                )}`,
            },
        })
    }
    all.add(entry.data)
}
