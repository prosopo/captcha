import { Validator } from "./Parser.js"
import { Ctor, InferTypeFromCtor, stringify } from "./utils.js"

export class InstanceParser<T extends Ctor<unknown>> extends Validator<InferTypeFromCtor<T>> {
    constructor(readonly clas: T) {
        super()
    }

    shape(value: unknown): InferTypeFromCtor<T> {
        if (value === null) {
            throw new Error(`Expected instance of ${JSON.stringify(this.clas)} but got null`)
        }
        if (!(value instanceof this.clas)) {
            throw new Error(`Expected instance of ${JSON.stringify(this.clas, null, 2)} but got ${stringify(value)} of type ${JSON.stringify(typeof value, null, 2)}`)
        }
        return value as InferTypeFromCtor<T>
    }

    clone() {
        return new InstanceParser<T>(this.clas)
    }

    public override get name(): string {
        return this.clas.name
    }
}

export const pInstance = <T extends Ctor<unknown>>(clas: T) => new InstanceParser<T>(clas)
export const inst = pInstance
