import fs from "fs";
import { blake2b } from '@noble/hashes/blake2b';
import sharp from "sharp";

export interface Args {
    input: string, // path to the input directory + map file
    output: string, // path to put the output directory + map file
    size?: number, // size of the output images
}

export default async (args: Args) => {
    // const inputDir: string = args.input
    // const outputDir: string = args.output
    // const size: number = args.size || 128;

    // const inputMapFile = `${inputDir}/map.json`
    // const outputMapFile = `${outputDir}/map.json`

    // const inputImageDir = `${inputDir}/images`
    // const outputImageDir = `${outputDir}/images`

    // // for each image in the input
    // const inputMap = JSON.parse(fs.readFileSync(inputMapFile, "utf8"))
    // for(const inputEntry of inputMap) {
    //     const name = inputEntry.name
    //     const label = inputEntry.label
    //     // copy the image to the output directory
    //     const content = fs.readFileSync(`${inputImageDir}/${name}`)
    //     // resize the image
    //     sharp(content).resize()
    // }
    
    // // find the labels (these should be subdirectories of the data directory)
    // const labels: string[] = fs.readdirSync(dataDir, { withFileTypes: true })
    // .filter(dirent => dirent.isDirectory())
    // .map(dirent => dirent.name)

    // // create the output directory
    // const imageDir = `${outputFile}/images`
    // fs.mkdirSync(imageDir, { recursive: true })
    // // start the map file (which is an array of objects)
    // const mapFile = `${outputFile}/map.json`
    // fs.writeFileSync(mapFile, "[\n")

    // // for each label
    // for(const label of labels) {
    //     // find all the images
    //     const images: string[] = fs.readdirSync(`${dataDir}/${label}`)
    //     // for each image
    //     for(const image of images) {
    //         // copy the image to the output directory
    //         const extension = image.split(".").pop()
    //         // read file to bytes
    //         const content = fs.readFileSync(`${dataDir}/${label}/${image}`)
    //         // hash based on the content of the image + the label to uniquely identify the image
    //         const hash = blake2b(content + label)
    //         const name = `${hash}.${extension}`
    //         fs.copyFileSync(`${dataDir}/${label}/${image}`, `${imageDir}/${name}`)
    //         // add the image to the map file
    //         const entry = {
    //             name,
    //             label,
    //         }
    //         fs.appendFileSync(mapFile, `${JSON.stringify(entry)},\n`)
    //     }
    // }

    // fs.appendFileSync(mapFile, "]\n")
}

const names: string[] = ["4k", "2k", "1080p", "720p"]

for(const name of names) {
    const imgPath = `/home/geopro/bench/${name}.jpg`
    const img = fs.readFileSync(imgPath)

    console.time("sharp")
    const img2 = sharp(img).resize(128).png()
    process.stdout.write(`${name} - `)
    console.timeEnd("sharp")

    img2.toFile(`/home/geopro/bench/${name}-128.png`)
}