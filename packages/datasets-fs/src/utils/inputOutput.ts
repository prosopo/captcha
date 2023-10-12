import { InputArgsSchema, InputCliCommand } from './input.js'
import { ProsopoEnvError } from '@prosopo/common'
import { lodash } from '@prosopo/util'
import { z } from 'zod'
import fs from 'fs'
import { OutputArgsSchema, OutputCliCommand } from './output.js'
import { CliCommand } from '../cli/cliCommand.js'
import { CliCommandComposite } from '../cli/cliCommandComposite.js'

export const InputOutputArgsSchema = InputArgsSchema.merge(OutputArgsSchema)

export type InputOutputArgs = z.infer<typeof InputOutputArgsSchema>

export abstract class InputOutputCliCommand<T extends typeof InputOutputArgsSchema> extends CliCommandComposite<T> {

    constructor() {
        super([new InputCliCommand<T>(), new OutputCliCommand<T>()])
    }
}
