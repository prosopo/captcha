import fs from 'node:fs'
import { ProsopoDatasetError, ProsopoError } from '@prosopo/common'
import * as z from 'zod'
import { CliCommand } from '../cli/cliCommand.js'

export const InputArgsSchema = z.object({
    input: z.string(),
})

export type InputArgs = z.infer<typeof InputArgsSchema>

export class InputCliCommand<
    T extends typeof InputArgsSchema,
> extends CliCommand<T> {
    public override getArgSchema(): T {
        throw new ProsopoError('DEVELOPER.METHOD_NOT_IMPLEMENTED')
    }
    public override getDescription(): string {
        throw new ProsopoError('DEVELOPER.METHOD_NOT_IMPLEMENTED')
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
            throw new ProsopoDatasetError(
                new Error(`input path does not exist: ${args.input}`),
                {
                    translationKey: 'FS.FILE_NOT_FOUND',
                }
            )
        }
    }
}
