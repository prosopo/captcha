import { Args } from './args'
import { CaptchaTypes, CaptchaWithoutId, Captchas, Item, LabelledItem, RawSolution } from '@prosopo/types'
import { checkDuplicates } from '../util'
import bcrypt from 'bcrypt'
import fs from 'fs'
import seedrandom from 'seedrandom'

export default async (args: Args) => {
    const outFile: string = args.out
    const overwrite = args.overwrite || false
    if (!overwrite && fs.existsSync(outFile)) {
        throw new Error(`output file already exists: ${outFile}`)
    }
    const labelledMapFile: string | undefined = args.labelled
    if (labelledMapFile && !fs.existsSync(labelledMapFile)) {
        throw new Error(`labelled map file does not exist: ${labelledMapFile}`)
    }
    const unlabelledMapFile: string | undefined = args.unlabelled
    if (unlabelledMapFile && !fs.existsSync(unlabelledMapFile)) {
        throw new Error(`unlabelled map file does not exist: ${unlabelledMapFile}`)
    }

    const labelsFile: string | undefined = args.labels
    const seed: number = args.seed || 0
    const size: number = args.size || 9
    const minCorrect: number = args.minCorrect || 0
    const maxCorrect: number = args.maxCorrect || size
    const solved: number = args.solved || 1
    const unsolved: number = args.unsolved || 1
    const random = seedrandom(seed.toString())
    const saltRounds = 10
    const allowDuplicatesLabelled = args.allowDuplicatesLabelled || args.allowDuplicates || false
    const allowDuplicatesUnlabelled = args.allowDuplicatesUnlabelled || args.allowDuplicates || false

    const uint32 = () => Math.abs(random.int32())

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
    // note that these can be different to the labels in the map file as the labelled data is independent of the unlabelled data in terms of labels
    const labels: string[] = []
    if (labelsFile && fs.existsSync(labelsFile)) {
        labels.push(...[...JSON.parse(fs.readFileSync(labelsFile, 'utf8'))])
    } else {
        // else default to the labels in the labelled data
        labels.push(...[...targets])
    }

    // generate n solved captchas
    const solvedCaptchas: CaptchaWithoutId[] = []
    for (let i = 0; i < solved; i++) {
        console.log(`generating solved captcha ${i}`)
        if (labelled.length <= size) {
            throw new Error(`labelled map file does not contain enough data: ${labelledMapFile}`)
        }
        if (targets.length <= 0) {
            throw new Error(`not enough different labels in labelled data: ${labelledMapFile}`)
        }
        // uniformly sample targets
        const target = targets[i % targets.length]
        const notTargets = targets.filter((t) => t !== target)
        if (notTargets.length <= 0) {
            throw new Error(`not enough different labels in labelled data: ${labelledMapFile}`)
        }
        // how many correct items should be in the captcha?
        const correct = (uint32() % (maxCorrect - minCorrect + 1)) + minCorrect
        // how many incorrect items should be in the captcha?
        const incorrect = size - correct
        // get the correct items
        const correctItems = new Set<Item>()
        while (correctItems.size < correct) {
            // get a random image from the target
            const image = labelToImages[target][uint32() % labelToImages[target].length]
            correctItems.add(image)
        }
        // get the incorrect items
        const incorrectItems = new Set<Item>()
        while (incorrectItems.size < incorrect) {
            // get a random image from the target
            const index = uint32() % notTargets.length
            const notTarget = notTargets[index]
            const imgs = labelToImages[notTarget]
            const image = imgs[uint32() % imgs.length]
            incorrectItems.add(image)
        }
        const items: Item[] = [...correctItems, ...incorrectItems]

        // shuffle the items
        for (let i = 0; i < items.length; i++) {
            const j = uint32() % items.length
            const tmp = items[i]
            items[i] = items[j]
            items[j] = tmp
        }

        // get the solution
        const solution: RawSolution[] = [...Array(items.length).keys()].filter((i) => correctItems.has(items[i]))

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
            throw new Error(`unlabelled map file does not contain enough data: ${unlabelledMapFile}`)
        }
        // pick a random label to be the target
        // note that these are potentially different to the labelled data labels
        if (labels.length <= 0) {
            throw new Error(`no labels found for unlabelled data: ${labelsFile}`)
        }
        const index = uint32() % labels.length
        const target = labels[index]
        // randomly pick images from the unlabelled data
        const itemSet = new Set<Item>()
        while (itemSet.size < size) {
            const item = unlabelled[uint32() % unlabelled.length]
            itemSet.add(item)
        }
        const items: Item[] = [...itemSet]

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
    fs.writeFileSync(outFile, JSON.stringify(output, null, 4))
}
