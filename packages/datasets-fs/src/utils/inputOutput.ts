import { CliBuilder } from '../cliBuilder.js'
import { ProsopoEnvError } from '@prosopo/common'
import { z } from 'zod'
import fs from 'fs'

export const InputOutputArgsSchema = z.object({
    input: z.string(),
    output: z.string(),
    overwrite: z.boolean().optional(),
})

export type InputOutputArgs = z.infer<typeof InputOutputArgsSchema>

export abstract class InputOutputCliBuilder<T extends typeof InputOutputArgsSchema> extends CliBuilder<T> {
    public getOptions() {
        return {
            input: {
                string: true,
                alias: 'in',
                demand: true,
                description: 'The input path',
            },
            output: {
                alias: 'out',
                string: true,
                demand: true,
                description: 'The output path',
            },
            overwrite: {
                string: true,
                description: 'Overwrite files in the output path if they already exist',
            },
        }
    }

    protected override run(args: InputOutputArgs): Promise<void> {
        this.logger.debug(args, 'setting up IO...')

        // input cannot equal output, otherwise we have issues with overwriting things / doing checks for duplicate files if stuff already exists in the destination
        if (args.input === args.output) {
            throw new ProsopoEnvError(new Error('output path must be different to input path'), 'FS.SAME_FILE')
        }

        // input must exist
        if (!fs.existsSync(args.input)) {
            throw new ProsopoEnvError(new Error(`input path does not exist: ${args.input}`), 'FS.FILE_NOT_FOUND')
        }

        // output must not exist, unless overwrite is true
        if (fs.existsSync(args.output)) {
            if (args.overwrite) {
                // if overwrite is true, delete the output directory
                this.logger.info('cleaning output directory...')
                fs.rmSync(args.output, { recursive: true })
            } else {
                throw new ProsopoEnvError(
                    new Error(`output path already exists: ${args.output}`),
                    'FS.FILE_ALREADY_EXISTS'
                )
            }
        }

        return Promise.resolve()
    }
}
