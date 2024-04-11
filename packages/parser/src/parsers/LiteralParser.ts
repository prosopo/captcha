import { Validator } from "./Parser.js"
import { stringify } from "./utils.js"

export class LiteralParser<const T> extends Validator<{
    output: T
}> {
    constructor(readonly value: T) {
        super()
    }

    public override validate(value: unknown): T {
        if (value !== this.value) {
            throw new Error(`Expected ${stringify(this.value)} of type ${JSON.stringify(typeof this.value, null, 2)} but got ${stringify(value)} of type ${JSON.stringify(typeof value, null, 2)}`)
        }
        return value as T
    }

    public override clone() {
        return new LiteralParser<T>(this.value)
    }

    public override get name(): string {
        return `${String(this.value)}`
    }
}

export const pLiteral = <const T>(value: T) => new LiteralParser<T>(value)
export const literal = pLiteral
export const lit = pLiteral