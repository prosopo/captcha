import { ArgumentsCamelCase, Argv } from 'yargs'
import { Logger } from '@prosopo/common'
import { argsSchema } from './args.js'
import scale from './scale.js'

export default (cmdArgs?: { logger?: Logger }) => {
    return {
        command: 'scale',
        describe: 'Scale images down to a given size',
        builder: (yargs: Argv) => {
            return yargs
                .option('data', {
                    type: 'string',
                    demand: true,
                    description: 'JSON file containing a list of objects with (at least) a url',
                })
                .option('out', {
                    type: 'string',
                    demand: true,
                    description:
                        'Where to put the output directory containing the map file and single directory of images. The map file will contain the new urls of the scaled images, new hashes and pass through any other information, e.g. labels.',
                })
                .option('overwrite', {
                    type: 'boolean',
                    description: 'Overwrite the output if it already exists',
                })
                .option('size', {
                    type: 'number',
                    demand: true,
                    description:
                        'The dimension (height/width) of the scaled image. If the image is not square, the other dimension will be scaled to maintain the aspect ratio.',
                })
                .option('square', {
                    type: 'boolean',
                    description:
                        'If true, the image will be cropped to a square before scaling. If false, the image will be scaled to the given size, maintaining the aspect ratio.',
                })
        },
        handler: async (argv: ArgumentsCamelCase) => {
            await scale(argsSchema.parse(argv), cmdArgs?.logger)
        },
    }
}
