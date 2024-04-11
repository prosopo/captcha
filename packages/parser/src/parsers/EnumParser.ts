import { Validator } from "./Parser.js"
import { stringify } from "./utils.js"

export type Variant<T extends readonly any[]> = T extends readonly [infer A, ...infer B] ? A | Variant<B> : never

export class EnumParser<const T extends readonly any[]> extends Validator<unknown, Variant<T>> {

    constructor(readonly variants: T) {
        super()
    }

    public override validate(value: unknown): Variant<T> {
        for (const variant of this.variants) {
            if (variant === value) {
                return variant
            }
        }
        throw new Error(`Expected one of ${JSON.stringify(this.variants, null, 2)} but got ${stringify(value)} of type ${JSON.stringify(typeof value, null, 2)}`)
    }

    public override clone() {
        return new EnumParser<T>(this.variants)
    }

    public override get name(): string {
        return `${this.variants.map(v => String(v)).join(" | ")}`
    }
}

export const pEnum = <T extends readonly any[]>(variants: T) => new EnumParser<T>(variants)
export const en = pEnum
