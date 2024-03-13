import type { Options } from 'yargs'
import type * as z from 'zod'
import { CliCommand, type CliCommandAny } from './cliCommand.js'

export abstract class CliCommandComposite<
    T extends z.ZodTypeAny,
> extends CliCommand<T> {
    #commands: CliCommandAny[] = []

    public getCommands() {
        return this.#commands
    }

    constructor(commands: CliCommandAny[]) {
        super()
        // take a copy of the array to avoid leakage
        this.#commands = [...commands]
    }

    public override getOptions(): { [key: string]: Options } {
        // merge options in turn from each command. Command order matters, latter commands will overwrite earlier ones
        return this.#commands.reduce((prev, command) => {
            return { ...prev, ...command.getOptions() }
        }, {})
    }

    public override _run(args: z.TypeOf<T>): Promise<void> {
        return this.#commands.reduce(async (prev, command) => {
            await prev
            await command._run(args)
        }, Promise.resolve())
    }

    public override _check(args: z.TypeOf<T>): Promise<void> {
        return this.#commands.reduce(async (prev, command) => {
            await prev
            await command._check(args)
        }, Promise.resolve())
    }
}
