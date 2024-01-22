import { BaseParser } from "./Parser.js";

export type Ctor<T> = new (...args: any[]) => T
export type InferTypeFromCtor<T extends Ctor<unknown>> = T extends Ctor<infer U> ? U : never

export class InstanceParser<T extends Ctor<unknown>, U extends InferTypeFromCtor<T>> extends BaseParser<U> {
    constructor(private clas: T) {
        super()
    }

    parse(value: unknown): U {
        if (!(value instanceof this.clas)) {
            throw new Error(`Expected instance of ${JSON.stringify(this.clas)} but got ${JSON.stringify(value)} of type ${JSON.stringify(typeof value)}`)
        }
        return value as U
    }

}

export const pInstance = <T extends Ctor<unknown>>(clas: T) => new InstanceParser(clas)