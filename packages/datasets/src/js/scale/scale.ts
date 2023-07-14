import { Args } from './args'
import { blake2b } from '@noble/hashes/blake2b'
import { u8aToHex } from '@polkadot/util'
import { z } from 'zod'
import fs from 'fs'
import sharp from 'sharp'

const inputItemSchema = z.object({
    data: z.string(),
})
const inputItemsSchema = inputItemSchema.passthrough().array()
type InputItem = z.infer<typeof inputItemSchema>
type InputItems = z.infer<typeof inputItemsSchema>

const outputItemSchema = inputItemSchema.extend({
    hash: z.string(),
})
const outputItemsSchema = z.array(outputItemSchema)
type OutputItem = z.infer<typeof outputItemSchema>
type OutputItems = z.infer<typeof outputItemsSchema>

export default async (args: Args) => {
    const mapFile: string = args.map
    if (!fs.existsSync(mapFile)) {
        throw new Error(`Map file does not exist: ${mapFile}`)
    }
    const outDir: string = args.out
    const overwrite = args.overwrite || false
    if (!overwrite && fs.existsSync(outDir)) {
        throw new Error(`Output directory already exists: ${outDir}`)
    }

    // create the output directory
    const imgDir = `${outDir}/images`
    fs.mkdirSync(imgDir, { recursive: true })

    // read the map file
    const json: unknown = JSON.parse(fs.readFileSync(mapFile, 'utf8'))
    const inputItems: InputItem[] = inputItemsSchema.parse(json)

    // for each item
    const outputItems: OutputItem[] = []
    for (const inputItem of inputItems) {
        // read the file
        const img = fs.readFileSync(inputItem.data)
        // resize the image
        const resized = await sharp(img).resize(128).png()
        const tmpFilePath = `${imgDir}/tmp.png`
        await resized.toFile(tmpFilePath)
        // read the resized image
        const resizedImg = fs.readFileSync(tmpFilePath)
        // hash the image
        const hash = blake2b(resizedImg)
        const hex = u8aToHex(hash)
        // move the image
        const finalFilePath = `${imgDir}/${hex}.png`
        fs.renameSync(tmpFilePath, finalFilePath)

        // add the item to the output
        const outputItem: OutputItem = {
            ...inputItem,
            hash: hex,
            data: fs.realpathSync(finalFilePath),
        }
        outputItems.push(outputItem)
    }

    // write the map file
    const outputMapFile = `${outDir}/map.json`
    fs.writeFileSync(outputMapFile, JSON.stringify(outputItems, null, 4))
}
