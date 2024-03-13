import type * as z from 'zod'
import { CliCommandComposite } from '../cli/cliCommandComposite.js'
import { InputArgsSchema, InputCliCommand } from './input.js'
import { OutputArgsSchema, OutputCliCommand } from './output.js'

export const InputOutputArgsSchema = InputArgsSchema.merge(OutputArgsSchema)

export type InputOutputArgs = z.infer<typeof InputOutputArgsSchema>

export abstract class InputOutputCliCommand<
    T extends typeof InputOutputArgsSchema,
> extends CliCommandComposite<T> {
    constructor() {
        super([new InputCliCommand<T>(), new OutputCliCommand<T>()])
    }
}
