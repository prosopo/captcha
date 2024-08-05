// Copyright 2021-2024 Prosopo (UK) Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import * as z from 'zod'
import { CaptchaTypes, type CaptchaWithoutId, type Captchas, CaptchasContainerSchema, type Item, type RawSolution } from '@prosopo/types'
import { Generate, ArgsSchema as GenerateArgsSchema } from './generate.js'
import { ProsopoDatasetError } from '@prosopo/common'
import { at, get } from '@prosopo/util'
import { blake2AsHex } from '@polkadot/util-crypto/blake2'
import { lodash } from '@prosopo/util/lodash'
import bcrypt from 'bcrypt'
import cliProgress from 'cli-progress'
import fs from 'fs'

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
    #size = 0
    #minCorrect = 0
    #saltRounds = 10
    #allowDuplicatesLabelled = false
    #allowDuplicatesUnlabelled = false
    #minIncorrect = 0
    #minLabelled = 0
    #maxLabelled = 0
    #count = 0
    #nCorrect = 0
    #nIncorrect = 0
    #nLabelled = 0
    #nUnlabelled = 0
    #target = ''
    #targets: string[] = []
    #targetItems: Item[] = []
    #notTargetItems: Item[] = []

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

    private setupTarget(i: number) {
        const _ = lodash()
        if (this.targets.length <= 1) {
            throw new ProsopoDatasetError(new Error(`not enough different labels in labelled data`), {
                translationKey: 'DATASET.NOT_ENOUGH_LABELS',
            })
        }

        // uniformly sample targets
        const target = at(this.targets, i % this.targets.length)
        const notTargets = this.targets.filter((t) => t !== target)
        // how many labelled images should be in the captcha?
        const nLabelled = _.random(this.#minLabelled, this.#maxLabelled)
        // how many correct labelled images should be in the captcha?
        const maxCorrect = nLabelled - this.#minCorrect
        const nCorrect = _.random(this.#minCorrect, maxCorrect)
        const nIncorrect = nLabelled - nCorrect
        const nUnlabelled = this.#size - nLabelled

        const targetItems = get(this.labelToImages, target)
        const notTargetItems: Item[] = notTargets.flatMap((notTarget) => get(this.labelToImages, notTarget))

        if (nUnlabelled > this.unlabelled.length) {
            throw new ProsopoDatasetError(new Error(`not enough unlabelled data`), {
                translationKey: 'DATASET.NOT_ENOUGH_IMAGES',
            })
        }
        if (nCorrect > targetItems.length) {
            throw new ProsopoDatasetError(new Error(`not enough images for target (${target})`), {
                translationKey: 'DATASET.NOT_ENOUGH_IMAGES',
            })
        }
        if (nIncorrect > notTargetItems.length) {
            throw new ProsopoDatasetError(new Error(`not enough non-matching images for target (${target})`), {
                translationKey: 'DATASET.NOT_ENOUGH_IMAGES',
            })
        }

        this.#nCorrect = nCorrect
        this.#nIncorrect = nIncorrect
        this.#nLabelled = nLabelled
        this.#nUnlabelled = nUnlabelled
        this.#target = target
        this.#targets = notTargets
        this.#targetItems = targetItems
        this.#notTargetItems = notTargetItems
    }

    public override async _run(args: Args) {
        await super._run(args)

        const outFile: string = args.output

        // get lodash (with seeded rng)
        const _ = lodash()

        this.#size = args.size || 9
        this.#minCorrect = args.minCorrect || 1
        this.#saltRounds = 10
        this.#allowDuplicatesLabelled = args.allowDuplicatesLabelled || args.allowDuplicates || false
        this.#allowDuplicatesUnlabelled = args.allowDuplicatesUnlabelled || args.allowDuplicates || false
        this.#minIncorrect = Math.max(args.minIncorrect || 1, 1) // at least 1 incorrect image
        this.#minLabelled = this.#minCorrect + this.#minIncorrect // min incorrect + correct
        this.#maxLabelled = Math.min(args.maxLabelled || this.#size, this.#size) // at least 1 labelled image
        this.#count = args.count || 0

        // the captcha contains n images. Each of these images are either labelled, being correct or incorrect against the target, or unlabelled. To construct one of these captchas, we need to decide how many of the images should be labelled vs unlabelled, and then how many of the labelled images should be correct vs incorrect
        // in the traditional captcha, two rounds are produced, one with labelled images and the other with unlabelled images. This gives 18 images overall, 9 labels produced.
        // the parameters for generation can regulate how many labels are collected vs how much of a test the captcha posses. E.g. 18 images could have 16 unlabelled and 2 labelled, or 2 unlabelled and 16 labelled. The former is a better test of the user being human, but the latter is a better for maximising label collection.
        // if we focus on a single captcha round of 9 images, we must have at least 1 labelled correct image in the captcha for it to work, otherwise it's just a labelling phase, which normally isn't a problem but if we're treating these as tests for humanity too then we need some kind of test in there. (e.g. we abolish the labelled then unlabelled pattern of the challenge rounds in favour of mixing labelled and unlabelled data, but we then run a small chance of serving two completely unlabelled rounds if we don't set the min number of labelled images to 1 per captcha round)

        const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic)
        bar.start(this.#count, 0)

        // generate n captchas
        const captchas: CaptchaWithoutId[] = []
        for (let i = 0; i < this.#count; i++) {
            bar.increment()
            // this.logger.info(`generating captcha ${i + 1} of ${count}`)
            this.setupTarget(i)

            // get the correct items
            const correctItems: Item[] = _.sampleSize(this.#targetItems, this.#nCorrect)

            // get the incorrect items
            const incorrectItems: Item[] = _.sampleSize(this.#notTargetItems, this.#nIncorrect)

            // get the unlabelled items
            const unlabelledItems = new Set<Item>()
            while (unlabelledItems.size < this.#size - this.#nLabelled) {
                // get a random image from the unlabelled data
                const image = at(this.unlabelled, _.random(0, this.unlabelled.length - 1))
                unlabelledItems.add(image)
            }

            const itemsConcat: Item[] = [...correctItems, ...incorrectItems, ...unlabelledItems]
            let indices: number[] = [...Array(itemsConcat.length).keys()]
            indices = _.shuffle(indices)
            const items = indices
                .map((i) => at(itemsConcat, i))
                .map((item) => {
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

            const salt = blake2AsHex(bcrypt.genSaltSync(this.#saltRounds))
            // create the captcha
            const captcha: CaptchaWithoutId = {
                salt,
                target: this.#target,
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
        this.logger.info('verifying data')
        CaptchasContainerSchema.parse(output)

        this.logger.info(`writing data`)
        fs.mkdirSync(args.output.split('/').slice(0, -1).join('/'), { recursive: true })
        fs.writeFileSync(outFile, JSON.stringify(output, null, 4))
    }
}
