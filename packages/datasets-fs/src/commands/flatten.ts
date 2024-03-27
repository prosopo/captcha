import fs from 'node:fs'
import { blake2b } from '@noble/hashes/blake2b'
import { u8aToHex } from '@polkadot/util/u8a'
import { ProsopoDatasetError } from '@prosopo/common'
import { CaptchaItemTypes, type Data, DataSchema, type LabelledItem } from '@prosopo/types'
import { at } from '@prosopo/util'
import { lodash } from '@prosopo/util/lodash'
import cliProgress from 'cli-progress'
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
import { InputOutputArgsSchema, InputOutputCliCommand } from '../utils/inputOutput.js'

export const ArgsSchema = InputOutputArgsSchema.extend({
    allowDuplicates: z.boolean().optional(),
})
export type ArgsSchemaType = typeof ArgsSchema
export type Args = z.infer<ArgsSchemaType>

export class Flatten extends InputOutputCliCommand<ArgsSchemaType> {
    public override getArgSchema() {
        return ArgsSchema
    }

    public override getDescription(): string {
        return 'Restructure a directory containing directories for each image classification into a single directory with a file containing the labels'
    }

    public override getOptions() {
        return lodash().merge(super.getOptions(), {
            input: {
                description: 'Path to the data directory containing subdirectories for each image classification',
            },
            output: {
                description: 'Where to put the output file containing the labels and single directory of images',
            },
            allowDuplicates: {
                boolean: true,
                description: 'If true, allow duplicates in the data',
            },
        })
    }

    public override async _run(args: Args) {
        this.logger.debug('flatten run')
        await super._run(args)

        const dataDir = args.input
        const outDir = args.output

        // find the labels (these should be subdirectories of the data directory)
        this.logger.info('reading data')
        const labels: string[] = fs
            .readdirSync(dataDir, { withFileTypes: true })
            .filter((dirent) => dirent.isDirectory())
            .map((dirent) => dirent.name)
            .sort()
        const imagesByLabel: string[][] = labels.map((label) => fs.readdirSync(`${dataDir}/${label}`))

        // create the output directory
        const imageDir = `${outDir}/images`
        fs.mkdirSync(imageDir, { recursive: true })

        const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic)

        // for each label
        const items: LabelledItem[] = []
        bar.start(
            imagesByLabel.reduce((acc, images) => acc + images.length, 0),
            0
        )
        labels.forEach((label, i) => {
            const images: string[] = at(imagesByLabel, i)
            // for each image
            for (const image of images) {
                bar.increment()
                // this.logger.log(`flattening ${label}/${image}`)
                // copy the image to the output directory
                const extension = image.split('.').pop()
                // read file to bytes
                const content = fs.readFileSync(`${dataDir}/${label}/${image}`)
                // hash based on the content of the image
                const hash = blake2b(content)
                const hex = u8aToHex(hash)
                const name = `${hex}.${extension}`
                if (fs.existsSync(`${imageDir}/${name}`)) {
                    for (const item of items) {
                        if (item.hash === hex) {
                            this.logger.log(`\ndupe: ${label}/${image}`)
                            this.logger.log('item hash', item.hash)
                            this.logger.log('item label', item.label)
                        }
                    }
                    if (!args.allowDuplicates) {
                        throw new ProsopoDatasetError('DATASET.DUPLICATE_IMAGE', {
                            context: { image: `${label}/${image}` },
                        })
                    }
                }
                fs.copyFileSync(`${dataDir}/${label}/${image}`, `${imageDir}/${name}`)
                const filePath = fs.realpathSync(`${imageDir}/${name}`)
                // add the image to the map file
                const entry: LabelledItem = {
                    data: filePath,
                    type: CaptchaItemTypes.Image,
                    label,
                    hash: hex,
                }
                items.push(entry)
            }
        })
        bar.stop()

        const data: Data = {
            items,
        }

        // verify data
        this.logger.info('verifying data')
        DataSchema.parse(data)

        // write map file
        this.logger.info('writing data')
        fs.writeFileSync(`${outDir}/data.json`, JSON.stringify(data, null, 4))
    }
}
