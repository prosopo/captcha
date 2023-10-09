import { CliCommand } from '../cliCommand.js'
import { ProsopoEnvError } from '@prosopo/common'
import { z } from 'zod'
import fs from 'fs'

export const InputArgsSchema = z.object({
    input: z.string(),
})

export type InputArgs = z.infer<typeof InputArgsSchema>

export abstract class InputCliCommand<T extends typeof InputArgsSchema> extends CliCommand<T> {
    public getOptions() {
        return {
            input: {
                string: true,
                alias: 'in',
                demand: true,
                description: 'The input path',
            },
        }
    }

    protected override preRun(args: InputArgs): Promise<void> {
        // input must exist
        if (!fs.existsSync(args.input)) {
            throw new ProsopoEnvError(new Error(`input path does not exist: ${args.input}`), 'FS.FILE_NOT_FOUND')
        }

        return Promise.resolve()
    }
}
