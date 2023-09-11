import { Args } from './args.js'
import {
    CaptchaTypes,
    CaptchaWithoutId,
    Captchas,
    CaptchasContainerSchema,
    DataSchema,
    Item,
    LabelledDataSchema,
    LabelledItem,
    LabelsContainerSchema,
    RawSolution,
} from '@prosopo/types'
import { Logger, ProsopoEnvError, getLoggerDefault } from '@prosopo/common'
import { blake2AsHex } from '@polkadot/util-crypto'
import { checkDuplicates } from '../util.js'
import { lodash, setSeedGlobal } from '@prosopo/util'
import bcrypt from 'bcrypt'
import cliProgress from 'cli-progress'
import fs from 'fs'

export default async (args: Args, logger?: Logger) => {
    logger = logger || getLoggerDefault()

    logger.debug(args, 'generating...')

    const outFile: string = args.out
    const overwrite = args.overwrite || false
    if (!overwrite && fs.existsSync(outFile)) {
        throw new ProsopoEnvError(new Error(`output file already exists: ${outFile}`), 'FS.FILE_ALREADY_EXISTS')
    }
    const labelledMapFile: string | undefined = args.labelled
    if (labelledMapFile && !fs.existsSync(labelledMapFile)) {
        throw new ProsopoEnvError(
            new Error(`labelled map file does not exist: ${labelledMapFile}`),
            'FS.FILE_NOT_FOUND'
        )
    }
    const unlabelledMapFile: string | undefined = args.unlabelled
    if (unlabelledMapFile && !fs.existsSync(unlabelledMapFile)) {
        throw new ProsopoEnvError(
            new Error(`unlabelled map file does not exist: ${unlabelledMapFile}`),
            'FS.FILE_NOT_FOUND'
        )
    }
    const labelsFile: string | undefined = args.labels
    const seed: number = args.seed || 0
    const size: number = args.size || 9
    const minCorrect: number = args.minCorrect || 1
    const maxCorrect: number = args.maxCorrect || size - 1
    const solved: number = args.solved || 0
    const unsolved: number = args.unsolved || 0
    const saltRounds = 10
    const allowDuplicatesLabelled = args.allowDuplicatesLabelled || args.allowDuplicates || false
    const allowDuplicatesUnlabelled = args.allowDuplicatesUnlabelled || args.allowDuplicates || false

    // set the seed
    setSeedGlobal(seed)
    // get lodash (with seeded rng)
    const _ = lodash()

    // load the map to get the labelled and unlabelled data
    const labelled: LabelledItem[] = labelledMapFile
        ? LabelledDataSchema.parse(JSON.parse(fs.readFileSync(labelledMapFile, 'utf8'))).items
        : []
    const unlabelled: Item[] = unlabelledMapFile
        ? DataSchema.parse(JSON.parse(fs.readFileSync(unlabelledMapFile, 'utf8'))).items
        : []

    // check for duplicates
    checkDuplicates(labelled, unlabelled, {
        allowDuplicatesLabelled,
        allowDuplicatesUnlabelled,
    })

    // split the labelled data by label
    const labelToImages: { [label: string]: Item[] } = {}
    for (const entry of labelled) {
        labelToImages[entry.label] = labelToImages[entry.label] || []
        labelToImages[entry.label].push(entry)
    }
    const targets = Object.keys(labelToImages)

    // load the labels from file
    // these are the labels that unlabelled data will be assigned to
    // note that these can be different to the labels in the map file as the labelled data is independent of the unlabelled data in terms of labels
    const labels: string[] = []
    if (labelsFile && fs.existsSync(labelsFile)) {
        labels.push(...[...LabelsContainerSchema.parse(JSON.parse(fs.readFileSync(labelsFile, 'utf8'))).labels])
    } else {
        // else default to the labels in the labelled data
        labels.push(...[...targets])
    }

    // generate n solved captchas
    const solvedCaptchas: CaptchaWithoutId[] = []
    // create a new progress bar instance and use shades_classic theme
    const barSolved = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic)

    logger.info(`Generating ${solved} solved captchas...`)
    barSolved.start(solved, 0)
    for (let i = 0; i < solved; i++) {
        // update the current value in your application..
        barSolved.update(i + 1)

        if (targets.length <= 1) {
            throw new ProsopoEnvError(
                new Error(`not enough different labels in labelled data: ${labelledMapFile}`),
                'DATASET.NOT_ENOUGH_LABELS'
            )
        }

        // uniformly sample targets
        const target = targets[i % targets.length]
        const notTargets = targets.filter((t) => t !== target)

        // how many correct items should be in the captcha?
        const nCorrect = _.random(minCorrect, maxCorrect)
        // how many incorrect items should be in the captcha?
        const nIncorrect = size - nCorrect

        const targetItems: Item[] = labelToImages[target]
        const notTargetItems: Item[] = notTargets.map((notTarget) => labelToImages[notTarget]).flat()

        if (targetItems.length < nCorrect) {
            throw new ProsopoEnvError(
                new Error(`not enough images for target (${target})`),
                'DATASET.NOT_ENOUGH_IMAGES'
            )
        }
        if (notTargetItems.length < nIncorrect) {
            throw new ProsopoEnvError(
                new Error(`not enough non-matching images for target (${target})`),
                'DATASET.NOT_ENOUGH_IMAGES'
            )
        }

        // get the correct items
        const correctItems: Item[] = _.sampleSize(targetItems, nCorrect)

        // get the incorrect items
        const incorrectItems: Item[] = _.sampleSize(notTargetItems, nIncorrect)

        let items: Item[] = [...correctItems, ...incorrectItems]
        let indices: number[] = [...Array(items.length).keys()]
        indices = _.shuffle(indices)
        items = indices.map((i) => items[i])
        items = items.map((item) => {
            return {
                data: item.data,
                hash: item.hash,
                type: item.type,
            }
        })

        // the first n indices are the correct items
        const solution: RawSolution[] = indices
            .map((index, i) => {
                return {
                    pre: index, // the index of the item in the items array before shuffle
                    post: i, // the index of the item in the shuffled array
                }
            })
            .filter((item) => item.pre < correctItems.length) // keep all items that were in the first n slots of the original item array - these were the correct items
            .map((item) => {
                return item.post // return the index in the shuffled array
            })

        const salt = blake2AsHex(bcrypt.genSaltSync(saltRounds))
        // create the captcha
        const captcha: CaptchaWithoutId = {
            salt,
            target,
            items,
            solution,
        }
        solvedCaptchas.push(captcha)
    }
    barSolved.stop()
    logger.info(`Generating ${unsolved} unsolved captchas...`)
    // create a new progress bar instance and use shades_classic theme
    const barUnsolved = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic)
    barUnsolved.start(unsolved, 0)
    // generate n unsolved captchas
    const unsolvedCaptchas: CaptchaWithoutId[] = []
    for (let i = 0; i < unsolved; i++) {
        barUnsolved.update(i + 1)
        if (unlabelled.length <= size) {
            throw new ProsopoEnvError(
                new Error(`unlabelled map file does not contain enough data: ${unlabelledMapFile}`),
                'DATASET.NOT_ENOUGH_IMAGES'
            )
        }
        // pick a random label to be the target
        // note that these are potentially different to the labelled data labels
        if (labels.length <= 0) {
            throw new ProsopoEnvError(
                new Error(`no labels found for unlabelled data: ${labelsFile}`),
                'DATASET.NOT_ENOUGH_LABELS'
            )
        }
        const index = _.random(0, labels.length - 1)
        const target = labels[index]
        // randomly pick images from the unlabelled data
        const itemSet: Item[] = _.sampleSize(unlabelled, size)
        // shuffle the items
        let items: Item[] = [...itemSet]
        let indices: number[] = [...Array(items.length).keys()]
        indices = _.shuffle(indices)
        items = indices.map((i) => items[i])
        items = items.map((item) => {
            return {
                data: item.data,
                hash: item.hash,
                type: item.type,
            }
        })
        const salt = blake2AsHex(bcrypt.genSaltSync(saltRounds))
        // create the captcha
        const captcha: CaptchaWithoutId = {
            salt,
            target,
            items,
        }
        unsolvedCaptchas.push(captcha)
    }
    barUnsolved.stop()
    // write to file
    const output: Captchas = {
        captchas: [...solvedCaptchas, ...unsolvedCaptchas],
        format: CaptchaTypes.SelectAll,
    }

    // verify the output
    CaptchasContainerSchema.parse(output)

    fs.writeFileSync(outFile, JSON.stringify(output, null, 4))
}
