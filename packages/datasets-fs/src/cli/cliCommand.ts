import * as z from 'zod'
import { Loggable } from '@prosopo/common'
import { Options } from 'yargs'
import { kebabCase } from '@prosopo/util'

export abstract class CliCommand<T extends z.ZodTypeAny> extends Loggable {
    // get the options for the CLI
    public getOptions(): {
        [key: string]: Options
    } {
        return {}
    }

    // get the schema for the args to this command
    public abstract getArgSchema(): T

    // parse args using the schema
    // use this when you have an args object but not sure if it's in the right format / contains the correct fields, e.g. args from cmdline
    public async parse(args: unknown): Promise<z.infer<T>> {
        const argsSchema = this.getArgSchema()
        const parsed = await argsSchema.parse(args)
        this.logger.debug('parsed args:', parsed)
        return parsed
    }

    // run any checks before the main run function. This function should have no side effects, i.e. not write to disk. It's purely for conducting checks / setting up
    public async _check(args: z.infer<T>) {
        this.logger.debug('runChecks')
    }

    // the main run function. This should be the function that does the work
    public async _run(args: z.infer<T>) {
        this.logger.debug('run')
    }

    // exec is a public facing function that should be called by the CLI. It will run the preRun, run, and postRun functions in order
    public async exec(args: z.infer<T>) {
        this.logger.debug('exec')
        // run any checks
        await this._check(args)
        // then run the command
        await this._run(args)
    }

    public getCommandName() {
        return kebabCase(this.constructor.name)
    }

    public abstract getDescription(): string
}

export type CliCommandAny = CliCommand<z.ZodTypeAny>
