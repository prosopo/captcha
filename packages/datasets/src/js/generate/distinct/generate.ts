import {
    CaptchaItemTypes,
    CaptchaTypes,
    CaptchaWithoutId,
    Captchas,
    Item,
    LabelledItem,
    RawSolution,
} from '@prosopo/types'
import bcrypt from 'bcrypt'
import fs from 'fs'
import seedrandom from 'seedrandom'

export interface Args {
    labels: string // path to the labels file
    output: string // path to the output file
    labelled: string // path to the file containing map of image urls to labels
    unlabelled: string // path to the file containing list of unlabelled image urls
    minCorrect?: number // minimum number of target images in each captcha
    maxCorrect?: number // maximum number of target images in each captcha
    seed?: number // seed for the random number generator
    size?: number // number of images in each captcha
    solved?: number // number of captchas to generate that are solved
    unsolved?: number // number of captchas to generate that are unsolved
    overwrite?: boolean // overwrite the output file if it already exists
    hostPrefix?: string // prefix to add to the start of each image url
    allowDuplicates?: boolean // allow duplicates in the data (labelled and unlabelled)
    allowDuplicatesLabelled?: boolean // allow duplicates in the labelled data
    allowDuplicatesUnlabelled?: boolean // allow duplicates in the unlabelled data
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

export default async (args: Args) => {
    const outputFile: string = args.output
    const overwrite = args.overwrite || false
    if (!overwrite && fs.existsSync(outputFile)) {
        throw new Error(`Output file already exists: ${outputFile}`)
    }
    const labelledMapFile: string = args.labelled
    if (!fs.existsSync(labelledMapFile)) {
        throw new Error(`Labelled map file does not exist: ${labelledMapFile}`)
    }
    const unlabelledMapFile: string = args.unlabelled
    if (!fs.existsSync(unlabelledMapFile)) {
        throw new Error(`Unlabelled map file does not exist: ${unlabelledMapFile}`)
    }
    console.log(args)

    const labelsFile: string = args.labels
    const seed: number = args.seed || 0
    const size: number = args.size || 9
    const minCorrect: number = args.minCorrect || 0
    const maxCorrect: number = args.maxCorrect || size
    const solved: number = args.solved || 1
    const unsolved: number = args.unsolved || 1
    const hostPrefix: string = args.hostPrefix || ''
    const random = seedrandom(seed.toString())
    const saltRounds = 10
    const allowDuplicatesLabelled = args.allowDuplicatesLabelled || args.allowDuplicates || false
    const allowDuplicatesUnlabelled = args.allowDuplicatesUnlabelled || args.allowDuplicates || false

    const uint32 = () => Math.abs(random.int32())

    // load the map to get the labelled and unlabelled data
    const labelled: LabelledItem[] = JSON.parse(fs.readFileSync(labelledMapFile, 'utf8'))
    const unlabelled: Item[] = JSON.parse(fs.readFileSync(unlabelledMapFile, 'utf8'))

    // check for duplicates
    checkDuplicates(labelled, unlabelled, {
        allowDuplicatesLabelled,
        allowDuplicatesUnlabelled,
    })

    // split the labelled data by label
    const labelToImages: { [label: string]: string[] } = {}
    for (const entry of labelled) {
        labelToImages[entry.label] = labelToImages[entry.label] || []
        labelToImages[entry.label].push(entry.data)
    }
    const targets = Object.keys(labelToImages)

    // load the labels from file
    // these are the labels that unlabelled data will be assigned to
    // note that these can be differen to the labels in the map file as the labelled data is independent of the unlabelled data in terms of labels
    const labels: string[] = []
    if (fs.existsSync(labelsFile)) {
        labels.push(...[...JSON.parse(fs.readFileSync(labelsFile, 'utf8'))])
    } else {
        labels.push(...[...targets])
    }

    // generate n solved captchas
    const solvedCaptchas: CaptchaWithoutId[] = []
    for (let i = 0; i < solved; i++) {
        console.log(`generating solved captcha ${i}`)
        if (labelled.length <= size) {
            throw new Error(`Labelled map file does not contain enough data: ${labelledMapFile}`)
        }
        if (targets.length <= 0) {
            throw new Error(`Not enough different labels in labelled data: ${labelledMapFile}`)
        }
        // uniformly sample targets
        const target = targets[i % targets.length]
        const notTargets = targets.filter((t) => t !== target)
        if (notTargets.length <= 0) {
            throw new Error(`Not enough different labels in labelled data: ${labelledMapFile}`)
        }
        // how many correct items should be in the captcha?
        const correct = (uint32() % (maxCorrect - minCorrect + 1)) + minCorrect
        // how many incorrect items should be in the captcha?
        const incorrect = size - correct
        // get the correct items
        const correctItems = new Set<string>()
        while (correctItems.size < correct) {
            // get a random image from the target
            const image = labelToImages[target][uint32() % labelToImages[target].length]
            correctItems.add(image)
        }
        // get the incorrect items
        const incorrectItems = new Set<string>()
        while (incorrectItems.size < incorrect) {
            // get a random image from the target
            const index = uint32() % notTargets.length
            const notTarget = notTargets[index]
            const imgs = labelToImages[notTarget]
            const image = imgs[uint32() % imgs.length]
            incorrectItems.add(image)
        }
        const items: Item[] = []
        // add the correct items
        for (const item of correctItems) {
            items.push({
                type: CaptchaItemTypes.Image,
                data: prefixHost(hostPrefix, item),
            })
        }
        // add the incorrect items
        for (const item of incorrectItems) {
            items.push({
                type: CaptchaItemTypes.Image,
                data: prefixHost(hostPrefix, item),
            })
        }

        // shuffle the items
        for (let i = 0; i < items.length; i++) {
            const j = uint32() % items.length
            const tmp = items[i]
            items[i] = items[j]
            items[j] = tmp
        }

        // get the solution
        const solution: RawSolution[] = [...Array(items.length).keys()].filter((i) => correctItems.has(items[i].data))

        const salt = bcrypt.genSaltSync(saltRounds)
        // create the captcha
        const captcha: CaptchaWithoutId = {
            salt,
            target,
            items,
            solution,
        }
        solvedCaptchas.push(captcha)
    }

    // generate n unsolved captchas
    const unsolvedCaptchas: CaptchaWithoutId[] = []
    for (let i = 0; i < unsolved; i++) {
        console.log(`generating unsolved captcha ${i}`)
        if (unlabelled.length <= size) {
            throw new Error(`Unlabelled map file does not contain enough data: ${unlabelledMapFile}`)
        }
        // pick a random label to be the target
        // note that these are potentially different to the labelled data labels
        if (labels.length <= 0) {
            throw new Error(`Labels file is empty: ${labelsFile}`)
        }
        const index = uint32() % labels.length
        const target = labels[index]
        // randomly pick images from the unlabelled data
        const imgs = new Set<string>()
        while (imgs.size < size) {
            const img = unlabelled[uint32() % unlabelled.length].data
            imgs.add(img)
        }
        const items: Item[] = []
        // add the items
        for (const img of imgs) {
            items.push({
                type: CaptchaItemTypes.Image,
                data: prefixHost(hostPrefix, img),
            })
        }
        // shuffle the items
        for (let i = 0; i < items.length; i++) {
            const j = uint32() % items.length
            const tmp = items[i]
            items[i] = items[j]
            items[j] = tmp
        }

        const salt = bcrypt.genSaltSync(saltRounds)
        // create the captcha
        const captcha: CaptchaWithoutId = {
            salt,
            target,
            items,
        }
        unsolvedCaptchas.push(captcha)
    }

    // write to file
    const output: Captchas = {
        captchas: [...solvedCaptchas, ...unsolvedCaptchas],
        format: CaptchaTypes.SelectAll,
    }
    fs.writeFileSync(outputFile, JSON.stringify(output))
}

function prefixHost(hostPrefix: string, item: string): string {
    return `${hostPrefix}${hostPrefix.endsWith('/') ? '' : '/'}${item}`
}
