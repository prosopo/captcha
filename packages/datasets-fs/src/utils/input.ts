import { CliCommand } from '../cli/cliCommand.js'
import { ProsopoEnvError } from '@prosopo/common'
import { z } from 'zod'
import fs from 'fs'

export const InputArgsSchema = z.object({
    input: z.string(),
})

export type InputArgs = z.infer<typeof InputArgsSchema>

export class InputCliCommand<T extends typeof InputArgsSchema> extends CliCommand<T> {
    public override getArgSchema(): T {
        throw new Error('Method not implemented.')
    }
    public override getDescription(): string {
        throw new Error('Method not implemented.')
    }
    public override getOptions() {
        return {
            input: {
                string: true,
                alias: 'in',
                demand: true,
                description: 'The input path',
            },
        }
    }

    public override async _check(args: InputArgs) {
        this.logger.debug('input _check')
        await super._check(args)
        // input must exist
        if (!fs.existsSync(args.input)) {
            throw new ProsopoEnvError(new Error(`input path does not exist: ${args.input}`), 'FS.FILE_NOT_FOUND')
        }
    }
}
