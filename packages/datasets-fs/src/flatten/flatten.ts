import { Args } from './args'
import { CaptchaItemTypes, LabelledItem } from '@prosopo/types'
import { blake2b } from '@noble/hashes/blake2b'
import { consola } from 'consola'
import { u8aToHex } from '@polkadot/util'
import fs from 'fs'

export default async (args: Args) => {
    consola.log(args, 'flattening...')

    const dataDir: string = args.data
    if (!fs.existsSync(dataDir)) {
        throw new Error(`data directory does not exist: ${dataDir}`)
    }
    const outDir: string = args.out
    const overwrite = args.overwrite || false
    if (!overwrite && fs.existsSync(outDir)) {
        throw new Error(`output directory already exists: ${outDir}`)
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
            consola.log(`flattening ${label}/${image}`)
            // copy the image to the output directory
            const extension = image.split('.').pop()
            // read file to bytes
            const content = fs.readFileSync(`${dataDir}/${label}/${image}`)
            // hash based on the content of the image
            const hash = blake2b(content)
            const hex = u8aToHex(hash)
            const name = `${hex}.${extension}`
            if (fs.existsSync(`${imageDir}/${name}`)) {
                consola.log(`duplicate image: ${label}/${image} -> ${name}`)
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

    // write map file
    fs.writeFileSync(`${outDir}/images.json`, JSON.stringify(items, null, 4))
}
