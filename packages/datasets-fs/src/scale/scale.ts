import { Args } from './args.js'
import { Data, DataSchema, Item } from '@prosopo/types'
import { Logger, ProsopoEnvError, getLoggerDefault } from '@prosopo/common'
import { blake2b } from '@noble/hashes/blake2b'
import { u8aToHex } from '@polkadot/util'
import fs from 'fs'
import sharp from 'sharp'

export default async (args: Args, logger?: Logger) => {
    logger = logger || getLoggerDefault()

    logger.debug(args, 'scaling...')

    const size = args.size
    const square = args.square ?? false

    const mapFile: string = args.data
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
    const inputItems: Item[] = DataSchema.parse(JSON.parse(fs.readFileSync(mapFile, 'utf8'))).items

    // for each item
    const outputItems: Item[] = []
    for (const inputItem of inputItems) {
        logger.log(`scaling ${inputItem.data}`)
        // read the file
        const img = fs.readFileSync(inputItem.data)
        // resize the image
        const resized = await sharp(img)
            .resize({
                width: size,
                height: size,
                fit: square ? 'fill' : 'inside',
            })
            .png()
        const tmpFilePath = `/tmp/tmp.png`
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
