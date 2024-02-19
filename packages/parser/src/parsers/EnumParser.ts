import { Parser } from "./Parser.js"

export type Variant<T extends readonly any[]> = T extends readonly [infer A, ...infer B] ? A | Variant<B> : never

export class EnumParser<const T extends readonly any[]> extends Parser<Variant<T>> {

    constructor(readonly variants: T) {
        super()
    }

    public override parse(value: unknown): Variant<T> {
        for (const variant of this.variants) {
            if (variant === value) {
                return variant
            }
        }
        throw new Error(`Expected one of ${JSON.stringify(this.variants)} but got ${JSON.stringify(value)} of type ${typeof value}`)
    }

    public override clone() {
        return new EnumParser<T>(this.variants)
    }
}

export const pEnum = <T extends readonly any[]>(variants: T) => new EnumParser<T>(variants)
export const en = pEnum
