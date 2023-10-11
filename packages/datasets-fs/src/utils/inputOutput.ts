import { InputArgsSchema, InputCliCommand } from './input.js'
import { ProsopoEnvError } from '@prosopo/common'
import { lodash } from '@prosopo/util'
import { z } from 'zod'
import fs from 'fs'

export const OutputArgsSchema = z.object({
    output: z.string(),
    overwrite: z.boolean().optional(),
})

export type OutputArgs = z.infer<typeof OutputArgsSchema>

export const InputOutputArgsSchema = InputArgsSchema.merge(OutputArgsSchema)

export type InputOutputArgs = z.infer<typeof InputOutputArgsSchema>

export abstract class InputOutputCliCommand<T extends typeof InputOutputArgsSchema> extends InputCliCommand<T> {
    public override getOptions() {
        return lodash().merge(super.getOptions(), {
            output: {
                alias: 'out',
                string: true,
                demand: true,
                description: 'The output path',
            },
            overwrite: {
                boolean: true,
                description: 'Overwrite files in the output path if they already exist',
            },
        })
    }

    protected override async preRun(args: InputOutputArgs) {
        this.logger.debug('inputoutput prerun')
        await super.preRun(args)
        // input cannot equal output, otherwise we have issues with overwriting things / doing checks for duplicate files if stuff already exists in the destination
        if (args.input === args.output) {
            throw new ProsopoEnvError(new Error('output path must be different to input path'), 'FS.SAME_FILE')
        }

        // output must not exist, unless overwrite is true
        if (fs.existsSync(args.output)) {
            if (!args.overwrite) {
                throw new ProsopoEnvError(
                    new Error(`output path already exists: ${args.output}`),
                    'FS.FILE_ALREADY_EXISTS'
                )
            }
        }
    }

    protected override async run(args: InputOutputArgs) {
        this.logger.debug('inputoutput run')
        await super.run(args)
        if (args.overwrite) {
            // if overwrite is true, delete the output directory
            this.logger.info('cleaning output directory...')
            fs.rmSync(args.output, { recursive: true })
        }
    }
}
