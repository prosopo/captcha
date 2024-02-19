import { Parser } from "./Parser.js"
import { Ctor, InferTypeFromCtor } from "./utils.js"

export class InstanceParser<T extends Ctor<unknown>> extends Parser<InferTypeFromCtor<T>> {
    constructor(private clas: T) {
        super()
    }

    parse(value: unknown): InferTypeFromCtor<T> {
        if (!(value instanceof this.clas)) {
            throw new Error(`Expected instance of ${JSON.stringify(this.clas)} but got ${JSON.stringify(value)} of type ${JSON.stringify(typeof value)}`)
        }
        return value as InferTypeFromCtor<T>
    }

    clone() {
        return new InstanceParser<T>(this.clas)
    }
}

export const pInstance = <T extends Ctor<unknown>>(clas: T) => new InstanceParser<T>(clas)
export const inst = pInstance
