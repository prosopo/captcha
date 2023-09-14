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
import { at, get, lodash, setSeedGlobal } from '@prosopo/util'
import { blake2AsHex } from '@polkadot/util-crypto'
import { checkDuplicates } from '../util.js'
import bcrypt from 'bcrypt'
import fs from 'fs'

export default async (args: Args, logger?: Logger) => {
    logger = logger || getLoggerDefault()

    logger.debug(args, 'generating...')

    const outFile: string = args.out
    const overwrite = args.overwrite || false
    if (!overwrite && fs.existsSync(outFile)) {
        throw new ProsopoEnvError(new Error(`Output file already exists: ${outFile}`), 'FS.FILE_ALREADY_EXISTS')
    }
    const labelledMapFile: string | undefined = args.labelled
    if (labelledMapFile && !fs.existsSync(labelledMapFile)) {
        throw new ProsopoEnvError(
            new Error(`Labelled map file does not exist: ${labelledMapFile}`),
            'FS.FILE_NOT_FOUND'
        )
    }
    const unlabelledMapFile: string | undefined = args.unlabelled
    if (unlabelledMapFile && !fs.existsSync(unlabelledMapFile)) {
        throw new ProsopoEnvError(
            new Error(`Unlabelled map file does not exist: ${unlabelledMapFile}`),
            'FS.FILE_NOT_FOUND'
        )
    }
    const labelsFile: string | undefined = args.labels
    const seed: number = args.seed || 0
    const size: number = args.size || 9
    const minCorrect: number = args.minCorrect || 1
    const saltRounds = 10
    const allowDuplicatesLabelled = args.allowDuplicatesLabelled || args.allowDuplicates || false
    const allowDuplicatesUnlabelled = args.allowDuplicatesUnlabelled || args.allowDuplicates || false
    const minIncorrect: number = Math.max(args.minIncorrect || 1, 1) // at least 1 incorrect image
    const minLabelled: number = minCorrect + minIncorrect // min incorrect + correct
    const maxLabelled: number = Math.min(args.maxLabelled || size, size) // at least 1 labelled image
    const count: number = args.count || 0

    // set the seed
    setSeedGlobal(seed)
    // get lodash (with seeded rng)
    const _ = lodash()

    // the captcha contains n images. Each of these images are either labelled, being correct or incorrect against the target, or unlabelled. To construct one of these captchas, we need to decide how many of the images should be labelled vs unlabelled, and then how many of the labelled images should be correct vs incorrect
    // in the traditional captcha, two rounds are produced, one with labelled images and the other with unlabelled images. This gives 18 images overall, 9 labels produced.
    // the parameters for generation can regulate how many labels are collected vs how much of a test the captcha posses. E.g. 18 images could have 16 unlabelled and 2 labelled, or 2 unlabelled and 16 labelled. The former is a better test of the user being human, but the latter is a better for maximising label collection.
    // if we focus on a single captcha round of 9 images, we must have at least 1 labelled correct image in the captcha for it to work, otherwise it's just a labelling phase, which normally isn't a problem but if we're treating these as tests for humanity too then we need some kind of test in there. (e.g. we abolish the labelled then unlabelled pattern of the challenge rounds in favour of mixing labelled and unlabelled data, but we then run a small chance of serving two completely unlabelled rounds if we don't set the min number of labelled images to 1 per captcha round)
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
        const arr = labelToImages[entry.label] || []
        arr.push(entry)
        labelToImages[entry.label] = arr
    }
    const targets = Object.keys(labelToImages)
    // load the labels from file
    // these are the labels that unlabelled data will be assigned to
    // note that these can be differen to the labels in the map file as the labelled data is independent of the unlabelled data in terms of labels
    const labels: string[] = []
    if (labelsFile && fs.existsSync(labelsFile)) {
        labels.push(...[...LabelsContainerSchema.parse(JSON.parse(fs.readFileSync(labelsFile, 'utf8'))).labels])
    } else {
        // else use the labels from the labelled data
        labels.push(...[...targets])
    }
    // generate n captchas
    const captchas: CaptchaWithoutId[] = []
    for (let i = 0; i < count; i++) {
        logger.info(`generating captcha ${i + 1} of ${count}`)

        if (targets.length <= 1) {
            throw new ProsopoEnvError(
                new Error(`not enough different labels in labelled data: ${labelledMapFile}`),
                'DATASET.NOT_ENOUGH_LABELS'
            )
        }

        // uniformly sample targets
        const target = at(targets, i % targets.length)
        const notTargets = targets.filter((t) => t !== target)
        // how many labelled images should be in the captcha?
        const nLabelled = _.random(minLabelled, maxLabelled)
        // how many correct labelled images should be in the captcha?
        const maxCorrect = nLabelled - minCorrect
        const nCorrect = _.random(minCorrect, maxCorrect)
        const nIncorrect = nLabelled - nCorrect
        const nUnlabelled = size - nLabelled

        const targetItems = get(labelToImages, target)
        const notTargetItems: Item[] = notTargets.map((notTarget) => get(labelToImages, notTarget)).flat()

        if (nUnlabelled > unlabelled.length) {
            throw new ProsopoEnvError(new Error(`not enough unlabelled data`), 'DATASET.NOT_ENOUGH_IMAGES')
        }
        if (nCorrect > targetItems.length) {
            throw new ProsopoEnvError(
                new Error(`not enough images for target (${target})`),
                'DATASET.NOT_ENOUGH_IMAGES'
            )
        }
        if (nIncorrect > notTargetItems.length) {
            throw new ProsopoEnvError(
                new Error(`not enough non-matching images for target (${target})`),
                'DATASET.NOT_ENOUGH_IMAGES'
            )
        }

        // get the correct items
        const correctItems: Item[] = _.sampleSize(targetItems, nCorrect)

        // get the incorrect items
        const incorrectItems: Item[] = _.sampleSize(notTargetItems, nIncorrect)

        // get the unlabelled items
        const unlabelledItems = new Set<Item>()
        while (unlabelledItems.size < size - nLabelled) {
            // get a random image from the unlabelled data
            const image = at(unlabelled, _.random(0, unlabelled.length - 1))
            unlabelledItems.add(image)
        }

        let items: Item[] = [...correctItems, ...incorrectItems, ...unlabelledItems]
        let indices: number[] = [...Array(items.length).keys()]
        indices = _.shuffle(indices)
        items = indices.map((i) => at(items, i))
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

        // the unlabelled indices were after the correct and incorrect
        const unlabelledIndices: RawSolution[] = indices
            .map((index, i) => {
                return {
                    pre: index, // the index of the item in the items array before shuffle
                    post: i, // the index of the item in the shuffled array
                }
            })
            .filter((item) => item.pre >= correctItems.length + incorrectItems.length) // keep all items that were in the first n slots of the original item array - these were the correct items
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
            unlabelled: unlabelledIndices,
        }
        captchas.push(captcha)
    }
    // write to file
    const output: Captchas = {
        captchas,
        format: CaptchaTypes.SelectAll,
    }

    // verify the output
    CaptchasContainerSchema.parse(output)

    fs.writeFileSync(outFile, JSON.stringify(output, null, 4))
}
