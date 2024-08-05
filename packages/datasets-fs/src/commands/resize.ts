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
import { type Data, DataSchema, type Item } from '@prosopo/types'
import { InputOutputArgsSchema, InputOutputCliCommand } from '../utils/inputOutput.js'
import { ProsopoDatasetError, ProsopoEnvError } from '@prosopo/common'
import { blake2b } from '@noble/hashes/blake2b'
import { lodash } from '@prosopo/util/lodash'
import { u8aToHex } from '@polkadot/util/u8a'
import cliProgress from 'cli-progress'
import fs from 'node:fs'
import sharp from 'sharp'

export const ArgsSchema = InputOutputArgsSchema.extend({
    size: z.number(),
    square: z.boolean().optional(),
})
export type ArgsSchemaType = typeof ArgsSchema
export type Args = z.infer<ArgsSchemaType>

export class Resize extends InputOutputCliCommand<ArgsSchemaType> {
    public override getArgSchema() {
        return ArgsSchema
    }

    public override getOptions() {
        return lodash().merge(super.getOptions(), {
            input: {
                description: 'JSON file containing a list of objects with (at least) a url',
            },
            output: {
                description:
                    'Where to put the output directory containing the map file and single directory of images. The map file will contain the new urls of the scaled images, new hashes and pass through any other information, e.g. labels.',
            },
            size: {
                number: true,
                description:
                    'The dimension (height/width) of the scaled image. If the image is not square, the other dimension will be scaled to maintain the aspect ratio.',
            },
            square: {
                boolean: true,
                description:
                    'If true, the image will be cropped to a square before scaling. If false, the image will be scaled to the given size, maintaining the aspect ratio.',
            },
        })
    }

    public override async _run(args: Args) {
        await super._run(args)

        const size = args.size
        const square = args.square ?? false

        const mapFile: string = args.input
        if (!fs.existsSync(mapFile)) {
            throw new ProsopoDatasetError(new Error(`Map file does not exist: ${mapFile}`), {
                translationKey: 'FS.FILE_NOT_FOUND',
            })
        }
        const outDir: string = args.output
        const overwrite = args.overwrite || false
        if (!overwrite && fs.existsSync(outDir)) {
            throw new ProsopoEnvError(new Error(`Output directory already exists: ${outDir}`), {
                translationKey: 'FS.FILE_NOT_FOUND',
            })
        }

        // create the output directory
        const imgDir = `${outDir}/images`
        fs.mkdirSync(imgDir, { recursive: true })

        // read the map file
        const inputItems: Item[] = DataSchema.parse(JSON.parse(fs.readFileSync(mapFile, 'utf8'))).items

        // for each item
        const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic)
        bar.start(inputItems.length, 0)
        const outputItems: Item[] = []
        for (const inputItem of inputItems) {
            bar.increment()
            // this.logger.log(`resizing ${inputItem.data}`)
            // read the file
            const img = fs.readFileSync(inputItem.data)
            // resize the image
            const resized = await sharp(img)
                .resize({
                    width: size,
                    height: size,
                    fit: square ? 'cover' : 'inside',
                })
                .removeAlpha() // remove the alpha channel
                .toColorspace('srgb') // 8-bits per channel
                .jpeg({
                    quality: 75,
                    chromaSubsampling: '4:2:0',
                    optimiseCoding: true,
                    trellisQuantisation: true,
                    overshootDeringing: true,
                    optimizeScans: true,
                    quantisationTable: 3,
                    force: true,
                })
            const tmpFilePath = `${imgDir}/tmp.jpg`
            await resized.toFile(tmpFilePath)
            // read the resized image
            const resizedImg = fs.readFileSync(tmpFilePath)
            // hash the image
            const hash = blake2b(resizedImg)
            const hex = u8aToHex(hash)
            // move the image
            const finalFilePath = `${imgDir}/${hex}.jpg`
            fs.renameSync(tmpFilePath, finalFilePath)

            // add the item to the output
            const outputItem: Item = {
                ...inputItem,
                hash: hex,
                data: fs.realpathSync(finalFilePath),
            }
            outputItems.push(outputItem)
        }
        bar.stop()

        // write the map file
        const outputMapFile = `${outDir}/data.json`

        const data: Data = {
            items: outputItems,
        }

        // verify the output
        this.logger.info('verifying data')
        DataSchema.parse(data)

        this.logger.info("writing data")
        fs.mkdirSync(args.output.split('/').slice(0, -1).join('/'), { recursive: true })
        fs.writeFileSync(outputMapFile, JSON.stringify(data, null, 4))
    }

    public override getDescription(): string {
        return 'Resize images to a given size'
    }
}
