import { Args } from './args.js'
import { CaptchaItemTypes, Data, DataSchema, LabelledItem } from '@prosopo/types'
import { Logger, ProsopoEnvError, getLoggerDefault } from '@prosopo/common'
import { blake2b } from '@noble/hashes/blake2b'
import { u8aToHex } from '@polkadot/util'
import fs from 'fs'

export default async (args: Args, logger?: Logger) => {
    logger = logger || getLoggerDefault()

    logger.debug(args, 'flattening...')

    const dataDir: string = args.data
    if (!fs.existsSync(dataDir)) {
        throw new ProsopoEnvError(new Error(`data directory does not exist: ${dataDir}`), 'FS.DIRECTORY_NOT_FOUND')
    }
    const outDir: string = args.out
    const overwrite = args.overwrite || false
    if (!overwrite && fs.existsSync(outDir)) {
        throw new ProsopoEnvError(
            new Error(`output directory already exists: ${outDir}`),
            'FS.DIRECTORY_ALREADY_EXISTS'
        )
    }

    // find the labels (these should be subdirectories of the data directory)
    const labels: string[] = fs
        .readdirSync(dataDir, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name)

    // create the output directory
    const imageDir = `${outDir}/images`
    fs.mkdirSync(imageDir, { recursive: true })

    // for each label
    const items: LabelledItem[] = []
    for (const label of labels) {
        // find all the images
        const images: string[] = fs.readdirSync(`${dataDir}/${label}`)
        // for each image
        for (const image of images) {
            logger.log(`flattening ${label}/${image}`)
            // copy the image to the output directory
            const extension = image.split('.').pop()
            // read file to bytes
            const content = fs.readFileSync(`${dataDir}/${label}/${image}`)
            // hash based on the content of the image
            const hash = blake2b(content)
            const hex = u8aToHex(hash)
            const name = `${hex}.${extension}`
            if (fs.existsSync(`${imageDir}/${name}`)) {
                logger.log(`duplicate image: ${label}/${image} -> ${name}`)
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
    }

    const data: Data = {
        items,
    }

    // verify data
    DataSchema.parse(data)

    // write map file
    fs.writeFileSync(`${outDir}/data.json`, JSON.stringify(data, null, 4))
}
