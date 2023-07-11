import scale from "./scale.js"

export default {
    command: "scale",
    describe: "Scale images down to a given size",
    builder: (yargs: any) => {
        return yargs
            .option("size", {
                type: "number",
                demand: true,
                description: "The dimension (height/width) of the scaled image. If the image is not square, the other dimension will be scaled to maintain the aspect ratio.",
            })
            .option("output", {
                type: "string",
                demand: true,
                description: "Where to put the output file containing the scaled images",
            })
    },
    handler: (argv: any) => {
        scale(argv)
    },
}