import { Args } from './args'
import { CaptchaItemSchema, Data, DataSchema, Item } from '@prosopo/types'
import { ProsopoEnvError } from '@prosopo/common'
import { blake2b } from '@noble/hashes/blake2b'
import { consola } from 'consola'
import { u8aToHex } from '@polkadot/util'
import fs from 'fs'
import sharp from 'sharp'

export default async (args: Args) => {
    consola.log(args, 'scaling...')

    const mapFile: string = args.images
    if (!fs.existsSync(mapFile)) {
        throw new ProsopoEnvError(new Error(`Map file does not exist: ${mapFile}`), 'FS.FILE_NOT_FOUND')
    }
    const outDir: string = args.out
    const overwrite = args.overwrite || false
    if (!overwrite && fs.existsSync(outDir)) {
        throw new ProsopoEnvError(new Error(`Output directory already exists: ${outDir}`), 'FS.FILE_NOT_FOUND')
    }

    // create the output directory
    const imgDir = `${outDir}/images`
    fs.mkdirSync(imgDir, { recursive: true })

    // read the map file
    const inputItems: Item[] = CaptchaItemSchema.array().parse(JSON.parse(fs.readFileSync(mapFile, 'utf8')))

    // for each item
    const outputItems: Item[] = []
    for (const inputItem of inputItems) {
        consola.log(`scaling ${inputItem.data}`)
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
        const outputItem: Item = {
            ...inputItem,
            hash: hex,
            data: fs.realpathSync(finalFilePath),
        }
        outputItems.push(outputItem)
    }

    // write the map file
    const outputMapFile = `${outDir}/map.json`

    const data: Data = {
        items: outputItems,
    }

    // verify the output
    DataSchema.parse(data)

    fs.writeFileSync(outputMapFile, JSON.stringify(outputItems, null, 4))
}
