import { Loggable } from '@prosopo/common'
import { Options } from 'yargs'
import { kebabCase } from '@prosopo/util'
import { z } from 'zod'

export abstract class CliCommand<T extends z.ZodTypeAny> extends Loggable {
    // get the options for the CLI
    public abstract getOptions(): {
        [key: string]: Options
    }

    // get the schema for the args to this command
    public abstract getArgSchema(): T

    // parse args using the schema
    public async parse(args: unknown): Promise<z.infer<T>> {
        const argsSchema = this.getArgSchema()
        const parsed = await argsSchema.parse(args)
        this.logger.debug('parsed args:', parsed)
        return parsed
    }

    public async parseThenExec(args: unknown) {
        await this.exec(await this.parse(args))
    }

    // run any checks before the main run function. This function should have no side effects, i.e. not write to disk. It's purely for conducting checks / setting up
    protected async preRun(args: z.infer<T>) {
        this.logger.debug('preRun')
    }

    // the main run function. This should be the function that does the work
    protected async run(args: z.infer<T>) {
        this.logger.debug('run')
    }

    // run any checks after the main run function. This should teardown anything that was setup in preRun, if necessary
    protected async postRun(args: z.infer<T>) {
        this.logger.debug('postRun')
    }

    // exec is a public facing function that should be called by the CLI. It will run the preRun, run, and postRun functions in order
    public async exec(args: z.infer<T>) {
        this.logger.debug('exec')
        await this.preRun(args)
        await this.run(args)
        await this.postRun(args)
    }

    public getCommandName() {
        return kebabCase(this.constructor.name)
    }

    public abstract getDescription(): string
}

export type CliCommandAny = CliCommand<z.ZodTypeAny>
