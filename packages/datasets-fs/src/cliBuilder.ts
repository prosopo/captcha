import { Loggable } from '@prosopo/common'
import { kebabCase } from 'lodash'
import { Options } from 'yargs'
import { z } from 'zod'

export abstract class CliBuilder<T extends z.ZodTypeAny> extends Loggable {
    // get the options for the CLI
    public abstract getOptions(): {
        [key: string]: Options
    }

    // get the schema for the args to this command
    public abstract getArgSchema(): T

    // parse args using the schema
    public parse(args: unknown): z.infer<T> {
        const argsSchema = this.getArgSchema()
        return argsSchema.parse(args)
    }

    public parseThenExec(args: unknown): Promise<void> {
        return this.exec(this.parse(args))
    }

    // run any checks before the main run function. This function should have no side effects, i.e. not write to disk. It's purely for conducting checks / setting up
    protected preRun(args: z.infer<T>): Promise<void> {
        return Promise.resolve()
    }

    // the main run function. This should be the function that does the work
    protected abstract run(args: z.infer<T>): Promise<void>

    // run any checks after the main run function. This should teardown anything that was setup in preRun, if necessary
    protected postRun(args: z.infer<T>): Promise<void> {
        return Promise.resolve()
    }

    // exec is a public facing function that should be called by the CLI. It will run the preRun, run, and postRun functions in order
    public async exec(args: z.infer<T>): Promise<void> {
        await this.preRun(args)
        await this.run(args)
        await this.postRun(args)
    }

    public getCommandName(): string {
        return kebabCase(this.constructor.name)
    }
}
