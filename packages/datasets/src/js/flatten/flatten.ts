import { blake2b } from '@noble/hashes/blake2b'
import { u8aToHex } from '@polkadot/util'
import fs from 'fs'

export interface Args {
    data: string // path to the data directory
    output: string // path to put the output directory + map file
    overwrite?: boolean // overwrite the output directory if it already exists
}

export default async (args: Args) => {
    console.log('flattening...')

    const dataDir: string = args.data
    if (!fs.existsSync(dataDir)) {
        throw new Error(`Data directory does not exist: ${dataDir}`)
    }
    const outputFile: string = args.output
    const overwrite = args.overwrite || false
    if (!overwrite && fs.existsSync(outputFile)) {
        throw new Error(`Output directory already exists: ${outputFile}`)
    }

    // find the labels (these should be subdirectories of the data directory)
    const labels: string[] = fs
        .readdirSync(dataDir, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name)

    // create the output directory
    const imageDir = `${outputFile}/images`
    fs.mkdirSync(imageDir, { recursive: true })
    // start the map file (which is an array of objects)
    const mapFile = `${outputFile}/map.json`
    fs.writeFileSync(mapFile, '[\n')

    // for each label
    let first = true;
    for (const label of labels) {
        // find all the images
        const images: string[] = fs.readdirSync(`${dataDir}/${label}`)
        // for each image
        for (const image of images) {
            if (!first) {
                // prepend a comma if not the first line
                fs.appendFileSync(mapFile, ',')
                first = false
            }
            // copy the image to the output directory
            const extension = image.split('.').pop()
            // read file to bytes
            const content = fs.readFileSync(`${dataDir}/${label}/${image}`)
            // hash based on the content of the image + the label to uniquely identify the image
            const hash = blake2b(content + label)
            const hex = u8aToHex(hash)
            const name = `${hex}.${extension}`
            fs.copyFileSync(`${dataDir}/${label}/${image}`, `${imageDir}/${name}`)
            // add the image to the map file
            const entry = {
                data: name,
                label,
            }
            fs.appendFileSync(mapFile, `${JSON.stringify(entry)}\n`)
        }
    }

    fs.appendFileSync(mapFile, ']\n')

    // check json is valid
    JSON.parse(fs.readFileSync(mapFile, 'utf8'))
}
