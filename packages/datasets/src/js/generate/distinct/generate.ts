import { Args } from './args'
import {
    CaptchaItemTypes,
    CaptchaTypes,
    CaptchaWithoutId,
    Captchas,
    Item,
    LabelledItem,
    RawSolution,
} from '@prosopo/types'
import { checkDuplicates, itemLookupByData, prefixHost } from '../util'
import bcrypt from 'bcrypt'
import fs from 'fs'
import seedrandom from 'seedrandom'

export default async (args: Args) => {
    const outputFile: string = args.output
    const overwrite = args.overwrite || false
    if (!overwrite && fs.existsSync(outputFile)) {
        throw new Error(`Output file already exists: ${outputFile}`)
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
    const labelled: LabelledItem[] = labelledMapFile ? JSON.parse(fs.readFileSync(labelledMapFile, 'utf8')) : []
    const unlabelled: Item[] = unlabelledMapFile ? JSON.parse(fs.readFileSync(unlabelledMapFile, 'utf8')) : []

    // add prefixes to the data
    if (prefixHost) {
        for (const arr of [labelled, unlabelled]) {
            for (const [index, item] of arr.entries()) {
                item.data = prefixHost(hostPrefix, item.data)
                arr[index] = item
            }
        }
    }

    // check for duplicates
    checkDuplicates(labelled, unlabelled, {
        allowDuplicatesLabelled,
        allowDuplicatesUnlabelled,
    })

    // concat labelled and unlabelled in a type safe way
    const allItems: (Item | LabelledItem)[] = [...labelled, ...unlabelled]
    // create a lookup by data field
    const itemLookup = itemLookupByData(allItems)

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
        labels.push(...[...targets])
    }

    // generate n solved captchas
    const solvedCaptchas: CaptchaWithoutId[] = []
    for (let i = 0; i < solved; i++) {
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
            correctItems.add(image.data)
        }
        // get the incorrect items
        const incorrectItems = new Set<string>()
        while (incorrectItems.size < incorrect) {
            // get a random image from the target
            const index = uint32() % notTargets.length
            const notTarget = notTargets[index]
            const imgs = labelToImages[notTarget]
            const image = imgs[uint32() % imgs.length]
            incorrectItems.add(image.data)
        }
        const items: Item[] = []
        // add the correct items
        for (const itemData of correctItems) {
            items.push({
                type: CaptchaItemTypes.Image,
                data: itemData,
                hash: itemLookup[itemData].hash,
            })
        }
        // add the incorrect items
        for (const itemData of incorrectItems) {
            items.push({
                type: CaptchaItemTypes.Image,
                data: itemData,
                hash: itemLookup[itemData].hash,
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
        const itemDataArr = new Set<string>()
        while (itemDataArr.size < size) {
            const itemData = unlabelled[uint32() % unlabelled.length].data
            itemDataArr.add(itemData)
        }
        const items: Item[] = []
        // add the items
        for (const itemData of itemDataArr) {
            items.push({
                type: CaptchaItemTypes.Image,
                data: itemData,
                hash: itemLookup[itemData].hash,
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
