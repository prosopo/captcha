import { Args } from './args'
import { CaptchaTypes, CaptchaWithoutId, Item, LabelledItem, RawSolution } from '@prosopo/types'
import { checkDuplicates } from '../util'
import bcrypt from 'bcrypt'
import fs from 'fs'
import seedrandom from 'seedrandom'

export interface CaptchaUnion extends CaptchaWithoutId {
    unlabelled: RawSolution[]
}

export interface Captchas {
    captchas: CaptchaUnion[]
    format: CaptchaTypes
}

export default async (args: Args) => {
    const outFile: string = args.out
    const overwrite = args.overwrite || false
    if (!overwrite && fs.existsSync(outFile)) {
        throw new Error(`Output file already exists: ${outFile}`)
    }
    const labelledMapFile: string | undefined = args.labelled
    if (labelledMapFile && !fs.existsSync(labelledMapFile)) {
        throw new Error(`Labelled map file does not exist: ${labelledMapFile}`)
    }
    const unlabelledMapFile: string | undefined = args.unlabelled
    if (unlabelledMapFile && !fs.existsSync(unlabelledMapFile)) {
        throw new Error(`Unlabelled map file does not exist: ${unlabelledMapFile}`)
    }

    const labelsFile: string | undefined = args.labels
    const seed: number = args.seed || 0
    const size: number = args.size || 9
    const minCorrect: number = args.minCorrect || 0
    const random = seedrandom(seed.toString())
    const saltRounds = 10
    const allowDuplicatesLabelled = args.allowDuplicatesLabelled || args.allowDuplicates || false
    const allowDuplicatesUnlabelled = args.allowDuplicatesUnlabelled || args.allowDuplicates || false

    const uint32 = () => Math.abs(random.int32())

    const minIncorrect: number = Math.max(args.minIncorrect || 1, 1) // at least 1 incorrect image
    const minLabelled: number = minCorrect + minIncorrect // min incorrect + correct
    const maxLabelled: number = Math.min(args.maxLabelled || size, size) // at least 1 labelled image
    const count: number = args.count || 0

    // the captcha contains n images. Each of these images are either labelled, being correct or incorrect against the target, or unlabelled. To construct one of these captchas, we need to decide how many of the images should be labelled vs unlabelled, and then how many of the labelled images should be correct vs incorrect
    // in the traditional captcha, two rounds are produced, one with labelled images and the other with unlabelled images. This gives 18 images overall, 9 labels produced.
    // the parameters for generation can regulate how many labels are collected vs how much of a test the captcha posses. E.g. 18 images could have 16 unlabelled and 2 labelled, or 2 unlabelled and 16 labelled. The former is a better test of the user being human, but the latter is a better for maximising label collection.
    // if we focus on a single captcha round of 9 images, we must have at least 1 labelled correct image in the captcha for it to work, otherwise it's just a labelling phase, which normally isn't a problem but if we're treating these as tests for humanity too then we need some kind of test in there. (e.g. we abolish the labelled then unlabelled pattern of the challenge rounds in favour of mixing labelled and unlabelled data, but we then run a small chance of serving two completely unlabelled rounds if we don't set the min number of labelled images to 1 per captcha round)

    // load the map to get the labelled and unlabelled data
    const labelled: LabelledItem[] = labelledMapFile ? JSON.parse(fs.readFileSync(labelledMapFile, 'utf8')) : []
    const unlabelled: Item[] = unlabelledMapFile ? JSON.parse(fs.readFileSync(unlabelledMapFile, 'utf8')) : []

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
    // note that these can be differen to the labels in the map file as the labelled data is independent of the unlabelled data in terms of labels
    const labels: string[] = []
    if (labelsFile && fs.existsSync(labelsFile)) {
        labels.push(...[...JSON.parse(fs.readFileSync(labelsFile, 'utf8'))])
    } else {
        // else use the labels from the labelled data
        labels.push(...[...targets])
    }

    // generate n captchas
    const captchas: CaptchaUnion[] = []
    for (let i = 0; i < count; i++) {
        // uniformly sample targets
        const target = targets[i % targets.length]
        const notTargets = targets.filter((t) => t !== target)
        // how many labelled images should be in the captcha?
        const nLabelled = (uint32() % (maxLabelled - minLabelled + 1)) + minLabelled
        // how many correct labelled images should be in the captcha?
        const maxCorrect = nLabelled - minCorrect
        const nCorrect = (uint32() % (maxCorrect - minCorrect + 1)) + minCorrect
        const nIncorrect = nLabelled - nCorrect

        // get the correct items
        const correctItems = new Set<Item>()
        while (correctItems.size < nCorrect) {
            // get a random image from the target
            const image = labelToImages[target][uint32() % labelToImages[target].length]
            correctItems.add(image)
        }

        // get the incorrect items
        const incorrectItems = new Set<Item>()
        while (incorrectItems.size < nIncorrect) {
            // get a random image from the target
            const notTarget = notTargets[uint32() % notTargets.length]
            const image = labelToImages[notTarget][uint32() % labelToImages[notTarget].length]
            incorrectItems.add(image)
        }

        // get the unlabelled items
        const unlabelledItems = new Set<Item>()
        while (unlabelledItems.size < size - nLabelled) {
            // get a random image from the unlabelled data
            const image = unlabelled[uint32() % unlabelled.length]
            unlabelledItems.add(image)
        }

        const items: Item[] = [...correctItems, ...incorrectItems, ...unlabelledItems].map((item) => {
            return {
                data: item.data,
                hash: item.hash,
                type: item.type,
            }
        })

        // shuffle the items
        for (let i = 0; i < items.length; i++) {
            const j = uint32() % items.length
            const tmp = items[i]
            items[i] = items[j]
            items[j] = tmp
        }

        // get the solutions
        const correctData = new Set<string>([...correctItems].map((item) => item.data))
        const solution: RawSolution[] = [...Array(items.length).keys()].filter((i) => correctData.has(items[i].data))

        const unlabelledData = new Set<string>([...unlabelledItems].map((item) => item.data))
        const unlabelledIndices = [...Array(items.length).keys()].filter((i) => unlabelledData.has(items[i].data))

        const salt = bcrypt.genSaltSync(saltRounds)
        // create the captcha
        const captcha: CaptchaUnion = {
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
    fs.writeFileSync(outFile, JSON.stringify(output, null, 4))
}
