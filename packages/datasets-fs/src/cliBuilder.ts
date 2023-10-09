import { Loggable } from '@prosopo/common'
import { kebabCase } from 'lodash'
import { Options } from 'yargs'
import { z } from 'zod'

export abstract class CliBuilder<T extends z.ZodTypeAny> extends Loggable {
    public abstract getOptions(): {
        [key: string]: Options
    }

    public abstract getArgSchema(): T

    public parse(args: unknown): z.infer<T> {
        const argsSchema = this.getArgSchema()
        return argsSchema.parse(args)
    }

    public parseThenExec(args: unknown): Promise<void> {
        return this.exec(this.parse(args))
    }

    protected preRun(args: z.infer<T>): Promise<void> {
        return Promise.resolve()
    }

    protected abstract run(args: z.infer<T>): Promise<void>

    protected postRun(args: z.infer<T>): Promise<void> {
        return Promise.resolve()
    }

    public async exec(args: z.infer<T>): Promise<void> {
        await this.preRun(args)
        await this.run(args)
        await this.postRun(args)
    }

    public getCommandName(): string {
        return kebabCase(this.constructor.name)
    }
}
