import { Args } from './args.js'
import { LabelledDataSchema, LabelledItem } from '@prosopo/types'
import { Logger, ProsopoEnvError, getLoggerDefault } from '@prosopo/common'
import fs from 'fs'

export default async (args: Args, logger?: Logger) => {
    logger = logger || getLoggerDefault()

    logger.debug(args, 'reading labels...')

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
    logger.log(JSON.stringify({ labels: labelArray }, null, 4))
}
