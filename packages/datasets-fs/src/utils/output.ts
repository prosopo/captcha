import { CliCommand } from '../cli/cliCommand.js'
import { ProsopoEnvError } from '@prosopo/common'
import { boolean, object, string, infer as zInfer } from 'zod'
import { lodash } from '@prosopo/util/lodash'
import fs from 'fs'

export const OutputArgsSchema = object({
    output: string(),
    overwrite: boolean().optional(),
})

export type OutputArgs = zInfer<typeof OutputArgsSchema>

export class OutputCliCommand<T extends typeof OutputArgsSchema> extends CliCommand<T> {
    #outputExists = false

    public outputExists() {
        return this.#outputExists
    }

    public override getArgSchema(): T {
        throw new Error('Method not implemented.')
    }
    public override getDescription(): string {
        throw new Error('Method not implemented.')
    }
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

    public override async _check(args: OutputArgs) {
        this.logger.debug('Output _check')
        await super._check(args)

        // record whether output already exists
        this.#outputExists = fs.existsSync(args.output)

        // output must not exist, unless overwrite is true
        if (this.outputExists()) {
            if (!args.overwrite) {
                throw new ProsopoEnvError(
                    new Error(`output path already exists: ${args.output}`),
                    'FS.FILE_ALREADY_EXISTS'
                )
            }
        }
    }

    public override async _run(args: OutputArgs) {
        this.logger.debug('Output run')
        await super._run(args)
        if (args.overwrite && this.outputExists()) {
            // if overwrite is true, delete the output directory
            this.logger.info('cleaning output directory...')
            fs.rmSync(args.output, { recursive: true })
        }
    }
}
