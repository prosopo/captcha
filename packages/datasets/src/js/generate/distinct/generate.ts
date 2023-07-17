import { Args } from './args'
import {
    CaptchaItemSchema,
    CaptchaTypes,
    CaptchaWithoutId,
    Captchas,
    Item,
    LabelledItem,
    LabelledItemSchema,
    RawSolution,
} from '@prosopo/types'
import { checkDuplicates } from '../util'
import { consola } from 'consola'
import Rng from '../../rng'
import bcrypt from 'bcrypt'
import fs from 'fs'
import z from 'zod'

export default async (args: Args) => {
    consola.log(args, 'generating...')

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
    const solved: number = args.solved || 0
    const unsolved: number = args.unsolved || 0
    const rng = new Rng({ seed })
    const saltRounds = 10
    const allowDuplicatesLabelled = args.allowDuplicatesLabelled || args.allowDuplicates || false
    const allowDuplicatesUnlabelled = args.allowDuplicatesUnlabelled || args.allowDuplicates || false
    // load the map to get the labelled and unlabelled data
    const labelled: LabelledItem[] = labelledMapFile
        ? LabelledItemSchema.passthrough()
              .array()
              .parse(JSON.parse(fs.readFileSync(labelledMapFile, 'utf8')))
        : []
    const unlabelled: Item[] = unlabelledMapFile
        ? CaptchaItemSchema.passthrough()
              .array()
              .parse(JSON.parse(fs.readFileSync(unlabelledMapFile, 'utf8')))
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
        labels.push(
            ...[
                ...z
                    .string()
                    .array()
                    .parse(JSON.parse(fs.readFileSync(labelsFile, 'utf8'))),
            ]
        )
    } else {
        // else default to the labels in the labelled data
        labels.push(...[...targets])
    }
    // generate n solved captchas
    const solvedCaptchas: CaptchaWithoutId[] = []
    for (let i = 0; i < solved; i++) {
        consola.log(`generating solved captcha ${i + 1} of ${solved}`)

        if (targets.length <= 1) {
            throw new Error(`not enough different labels in labelled data: ${labelledMapFile}`)
        }

        // uniformly sample targets
        const target = targets[i % targets.length]
        const notTargets = targets.filter((t) => t !== target)

        // how many correct items should be in the captcha?
        const nCorrect = rng.index(maxCorrect, { maxInclusive: true })
        // how many incorrect items should be in the captcha?
        const nIncorrect = size - nCorrect

        const targetItems: Item[] = labelToImages[target]
        const notTargetItems: Item[] = notTargets.map((notTarget) => labelToImages[notTarget]).flat()

        if (targetItems.length < nCorrect) {
            throw new Error(`not enough images for target (${target})`)
        }
        if (notTargetItems.length < nIncorrect) {
            throw new Error(`not enough non-matching images for target (${target})`)
        }

        // get the correct items
        const correctItems: Item[] = rng.choice(targetItems, {
            n: nCorrect,
            withReplacement: false,
        }).choices

        // get the incorrect items
        const incorrectItems: Item[] = rng.choice(notTargetItems, {
            n: nIncorrect,
            withReplacement: false,
        }).choices

        let items: Item[] = [...correctItems, ...incorrectItems]
        const indices: number[] = [...Array(items.length).keys()]
        rng.shuffle(indices)
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
        consola.log(`generating unsolved captcha ${i + 1} of ${unsolved}`)
        if (unlabelled.length <= size) {
            throw new Error(`unlabelled map file does not contain enough data: ${unlabelledMapFile}`)
        }
        // pick a rng label to be the target
        // note that these are potentially different to the labelled data labels
        if (labels.length <= 0) {
            throw new Error(`no labels found for unlabelled data: ${labelsFile}`)
        }
        const index = rng.index(labels.length)
        const target = labels[index]
        // rngly pick images from the unlabelled data
        const itemSet: Item[] = rng.choice(unlabelled, {
            n: size,
            withReplacement: false,
        }).choices
        // shuffle the items
        let items: Item[] = [...itemSet]
        const indices: number[] = [...Array(items.length).keys()]
        rng.shuffle(indices)
        items = indices.map((i) => items[i])
        items = items.map((item) => {
            return {
                data: item.data,
                hash: item.hash,
                type: item.type,
            }
        })
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
