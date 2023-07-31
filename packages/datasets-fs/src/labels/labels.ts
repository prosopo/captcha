import { Args } from './args'
import { LabelledDataSchema, LabelledItem } from '@prosopo/types'
import { ProsopoEnvError } from '@prosopo/common'
import { consola } from 'consola'
import fs from 'fs'

export default async (args: Args) => {
    consola.log(args, 'reading labels...')

    const file = args.data
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
    consola.log(JSON.stringify(labelArray, null, 4))
}
