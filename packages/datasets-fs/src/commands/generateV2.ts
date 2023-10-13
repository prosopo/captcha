import { CaptchaTypes, CaptchaWithoutId, Captchas, CaptchasContainerSchema, Item, RawSolution } from '@prosopo/types'
import { Generate, ArgsSchema as GenerateArgsSchema } from './generate.js'
import { ProsopoEnvError } from '@prosopo/common'
import { at, get, lodash } from '@prosopo/util'
import { blake2AsHex } from '@polkadot/util-crypto'
import { z } from 'zod'
import bcrypt from 'bcrypt'
import fs from 'fs'
import cliProgress from 'cli-progress'

export const ArgsSchema = GenerateArgsSchema.extend({
    minCorrect: z.number().optional(),
    minIncorrect: z.number().optional(),
    minLabelled: z.number().optional(),
    maxLabelled: z.number().optional(),
    count: z.number().optional(),
})
export type ArgsSchemaType = typeof ArgsSchema
export type Args = z.infer<ArgsSchemaType>

export class GenerateV2 extends Generate<ArgsSchemaType> {
    public override getArgSchema() {
        return ArgsSchema
    }

    public override getDescription(): string {
        return 'Generate distinct captchas producing captcha challenges comprising one or more rounds, mixing labelled and unlabelled data into a single round'
    }

    public override getOptions() {
        return lodash().merge(super.getOptions(), {
            count: {
                number: true,
                description: 'Number of captchas to generate',
            },
            minCorrect: {
                number: true,
                description: 'Minimum number of correct images in each captcha',
            },
            minIncorrect: {
                number: true,
                description: 'Minimum number of incorrect images in each captcha',
            },
            minLabelled: {
                number: true,
                description: 'Minimum number of labelled images in each captcha',
            },
            maxLabelled: {
                number: true,
                description: 'Maximum number of labelled images in each captcha',
            },
        })
    }

    public override async _run(args: Args) {
        await super._run(args)

        const outFile: string = args.output

        // get lodash (with seeded rng)
        const _ = lodash()

        const labelsFile: string | undefined = args.labels
        const size: number = args.size || 9
        const minCorrect: number = args.minCorrect || 1
        const saltRounds = 10
        const allowDuplicatesLabelled = args.allowDuplicatesLabelled || args.allowDuplicates || false
        const allowDuplicatesUnlabelled = args.allowDuplicatesUnlabelled || args.allowDuplicates || false
        const minIncorrect: number = Math.max(args.minIncorrect || 1, 1) // at least 1 incorrect image
        const minLabelled: number = minCorrect + minIncorrect // min incorrect + correct
        const maxLabelled: number = Math.min(args.maxLabelled || size, size) // at least 1 labelled image
        const count: number = args.count || 0

        // the captcha contains n images. Each of these images are either labelled, being correct or incorrect against the target, or unlabelled. To construct one of these captchas, we need to decide how many of the images should be labelled vs unlabelled, and then how many of the labelled images should be correct vs incorrect
        // in the traditional captcha, two rounds are produced, one with labelled images and the other with unlabelled images. This gives 18 images overall, 9 labels produced.
        // the parameters for generation can regulate how many labels are collected vs how much of a test the captcha posses. E.g. 18 images could have 16 unlabelled and 2 labelled, or 2 unlabelled and 16 labelled. The former is a better test of the user being human, but the latter is a better for maximising label collection.
        // if we focus on a single captcha round of 9 images, we must have at least 1 labelled correct image in the captcha for it to work, otherwise it's just a labelling phase, which normally isn't a problem but if we're treating these as tests for humanity too then we need some kind of test in there. (e.g. we abolish the labelled then unlabelled pattern of the challenge rounds in favour of mixing labelled and unlabelled data, but we then run a small chance of serving two completely unlabelled rounds if we don't set the min number of labelled images to 1 per captcha round)

        const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic)
        bar.start(count, 0)

        // generate n captchas
        const captchas: CaptchaWithoutId[] = []
        for (let i = 0; i < count; i++) {
            bar.increment()
            // this.logger.info(`generating captcha ${i + 1} of ${count}`)

            if (this.targets.length <= 1) {
                throw new ProsopoEnvError(
                    new Error(`not enough different labels in labelled data`),
                    'DATASET.NOT_ENOUGH_LABELS'
                )
            }

            // uniformly sample targets
            const target = at(this.targets, i % this.targets.length)
            const notTargets = this.targets.filter((t) => t !== target)
            // how many labelled images should be in the captcha?
            const nLabelled = _.random(minLabelled, maxLabelled)
            // how many correct labelled images should be in the captcha?
            const maxCorrect = nLabelled - minCorrect
            const nCorrect = _.random(minCorrect, maxCorrect)
            const nIncorrect = nLabelled - nCorrect
            const nUnlabelled = size - nLabelled

            const targetItems = get(this.labelToImages, target)
            const notTargetItems: Item[] = notTargets.map((notTarget) => get(this.labelToImages, notTarget)).flat()

            if (nUnlabelled > this.unlabelled.length) {
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
                const image = at(this.unlabelled, _.random(0, this.unlabelled.length - 1))
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
        bar.stop()

        // write to file
        const output: Captchas = {
            captchas,
            format: CaptchaTypes.SelectAll,
        }

        // verify the output
        this.logger.info('verifying output')
        CaptchasContainerSchema.parse(output)

        this.logger.info(`writing output`)
        fs.mkdirSync(args.output.split('/').slice(0, -1).join('/'), { recursive: true })
        fs.writeFileSync(outFile, JSON.stringify(output, null, 4))
    }
}
