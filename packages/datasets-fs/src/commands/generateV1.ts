import fs from 'node:fs'
import { blake2AsHex } from '@polkadot/util-crypto/blake2'
import { ProsopoDatasetError, ProsopoEnvError } from '@prosopo/common'
import {
    CaptchaTypes,
    type CaptchaWithoutId,
    type Captchas,
    CaptchasContainerSchema,
    type Item,
    type RawSolution,
} from '@prosopo/types'
import { at, get } from '@prosopo/util'
import { lodash } from '@prosopo/util/lodash'
import bcrypt from 'bcrypt'
import cliProgress from 'cli-progress'
import * as z from 'zod'
import { Generate, ArgsSchema as GenerateArgsSchema } from './generate.js'

export const ArgsSchema = GenerateArgsSchema.extend({
    solved: z.number().optional(),
    unsolved: z.number().optional(),
    minCorrect: z.number().optional(),
    maxCorrect: z.number().optional(),
})
export type ArgsSchemaType = typeof ArgsSchema
export type Args = z.infer<ArgsSchemaType>

export class GenerateV1 extends Generate<ArgsSchemaType> {
    public override getArgSchema() {
        return ArgsSchema
    }

    public override getDescription(): string {
        return 'Generate distinct captchas producing captcha challenges comprising 2 rounds, one labelled and one unlabelled'
    }

    public override getOptions() {
        return lodash().merge(super.getOptions(), {
            solved: {
                description: 'Number of captchas to generate that are solved',
                number: true,
            },
            unsolved: {
                description: 'Number of captchas to generate that are unsolved',
                number: true,
            },
            minCorrect: {
                description: 'Minimum number of target images in each captcha',
                number: true,
            },
            maxCorrect: {
                description: 'Maximum number of target images in each captcha',
                number: true,
            },
        })
    }

    private generateSolved(
        solved: number,
        size: number,
        minCorrect: number,
        maxCorrect: number,
        bar: cliProgress.SingleBar
    ) {
        const _ = lodash()
        // generate n solved captchas
        const solvedCaptchas: CaptchaWithoutId[] = []
        for (let i = 0; i < solved; i++) {
            // update the current value in your application..
            bar.increment()

            if (this.targets.length <= 1) {
                throw new ProsopoDatasetError(new Error('not enough different labels in labelled data'), {
                    translationKey: 'DATASET.NOT_ENOUGH_LABELS',
                })
            }

            // uniformly sample targets
            const target = at(this.targets, i % this.targets.length)
            const notTargets = this.targets.filter((t) => t !== target)

            // how many correct items should be in the captcha?
            const nCorrect = _.random(minCorrect, maxCorrect)
            // how many incorrect items should be in the captcha?
            const nIncorrect = size - nCorrect

            const targetItems: Item[] = get(this.labelToImages, target)
            const notTargetItems: Item[] = notTargets.flatMap((notTarget) => get(this.labelToImages, notTarget))

            if (targetItems.length < nCorrect) {
                throw new ProsopoEnvError(new Error(`not enough images for target (${target})`), {
                    translationKey: 'DATASET.NOT_ENOUGH_IMAGES',
                })
            }
            if (notTargetItems.length < nIncorrect) {
                throw new ProsopoDatasetError(new Error(`not enough non-matching images for target (${target})`), {
                    translationKey: 'DATASET.NOT_ENOUGH_IMAGES',
                })
            }

            // get the correct items
            const correctItems: Item[] = _.sampleSize(targetItems, nCorrect)

            // get the incorrect items
            const incorrectItems: Item[] = _.sampleSize(notTargetItems, nIncorrect)

            let items: Item[] = [...correctItems, ...incorrectItems]
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

            const salt = blake2AsHex(bcrypt.genSaltSync(this.saltRounds))
            // create the captcha
            const captcha: CaptchaWithoutId = {
                salt,
                target,
                items,
                solution,
            }
            solvedCaptchas.push(captcha)
        }
        return solvedCaptchas
    }

    private generateUnsolved(unsolved: number, size: number, bar: cliProgress.SingleBar) {
        const _ = lodash()
        // this.logger.info(`Generating ${unsolved} unsolved captchas...`)
        // create a new progress bar instance and use shades_classic theme
        // generate n unsolved captchas
        const unsolvedCaptchas: CaptchaWithoutId[] = []
        for (let i = 0; i < unsolved; i++) {
            bar.increment()
            if (this.unlabelled.length <= size) {
                throw new ProsopoDatasetError(new Error('unlabelled map file does not contain enough data'), {
                    translationKey: 'DATASET.NOT_ENOUGH_IMAGES',
                })
            }
            // pick a random label to be the target
            // note that these are potentially different to the labelled data labels
            if (this.labels.length <= 0) {
                throw new ProsopoDatasetError(new Error('no labels found for unlabelled data'), {
                    translationKey: 'DATASET.NOT_ENOUGH_LABELS',
                })
            }
            const index = _.random(0, this.labels.length - 1)
            const target = at(this.labels, index)
            // randomly pick images from the unlabelled data
            const itemSet: Item[] = _.sampleSize(this.unlabelled, size)
            // shuffle the items
            let items: Item[] = [...itemSet]
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
            const salt = blake2AsHex(bcrypt.genSaltSync(this.saltRounds))
            // create the captcha
            const captcha: CaptchaWithoutId = {
                salt,
                target,
                items,
            }
            unsolvedCaptchas.push(captcha)
        }
        return unsolvedCaptchas
    }

    public override async _run(args: Args) {
        await super._run(args)

        const outFile: string = args.output

        // get lodash (with seeded rng)
        const _ = lodash()

        const size: number = args.size || 9
        const minCorrect: number = args.minCorrect || 1
        const maxCorrect: number = args.maxCorrect || size - 1
        const solved: number = args.solved || 0
        const unsolved: number = args.unsolved || 0

        // create a new progress bar instance and use shades_classic theme
        const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic)

        // this.logger.info(`Generating ${solved} solved captchas...`)
        bar.start(solved + unsolved, 0)
        const solvedCaptchas = this.generateSolved(solved, size, minCorrect, maxCorrect, bar)
        const unsolvedCaptchas = this.generateUnsolved(unsolved, size, bar)
        bar.stop()
        // write to file
        const output: Captchas = {
            captchas: [...solvedCaptchas, ...unsolvedCaptchas],
            format: CaptchaTypes.SelectAll,
        }

        // verify the output
        CaptchasContainerSchema.parse(output)

        fs.mkdirSync(args.output.split('/').slice(0, -1).join('/'), {
            recursive: true,
        })
        fs.writeFileSync(outFile, JSON.stringify(output, null, 4))
    }
}
