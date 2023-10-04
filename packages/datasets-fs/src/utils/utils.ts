import { Logger, ProsopoEnvError, getLoggerDefault } from '@prosopo/common'
import { z } from 'zod'
import fs from 'fs'

export const argsSchema = z.object({
    data: z.string(),
    out: z.string(),
    overwrite: z.boolean().optional(),
})

export type Args = z.infer<typeof argsSchema>

export const setup = async (args: Args, logger?: Logger) => {
    logger = logger || getLoggerDefault()

    logger.debug(args, 'setting up...')

    // input cannot equal output, otherwise we have issues with overwriting things / doing checks for duplicate files if stuff already exists in the destination
    if (args.in === args.out) {
        throw new ProsopoEnvError(new Error('output path must be different to input path'), 'FS.SAME_FILE')
    }

    // input must exist
    if (!fs.existsSync(args.in)) {
        throw new ProsopoEnvError(new Error(`input path does not exist: ${args.in}`), 'FS.FILE_NOT_FOUND')
    }

    // output must not exist, unless overwrite is true
    if (fs.existsSync(args.out)) {
        if (args.overwrite) {
            // if overwrite is true, delete the output directory
            logger.info('cleaning output directory...')
            fs.rmSync(args.out, { recursive: true })
        } else {
            throw new ProsopoEnvError(new Error(`output path already exists: ${args.out}`), 'FS.FILE_ALREADY_EXISTS')
        }
    }
}
