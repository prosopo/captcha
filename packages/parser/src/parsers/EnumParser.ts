import { at } from "@prosopo/util";
import { BaseParser } from "./Parser.js";

export class EnumParser<const T> extends BaseParser<T> {
    constructor(readonly variants: readonly T[]) {
        super()
    }

    parse(value: unknown): T {
        if (!this.variants.includes(value as T)) {
            throw new Error(`Expected one of ${JSON.stringify(this.variants)} but got ${JSON.stringify(value)} of type ${JSON.stringify(typeof value)}`)
        }
        return value as T
    }

}


export const pEnum = <const T>(variants: readonly T[]) => new EnumParser(variants)


// Attempted to make this variadic, but I don't think it's a good idea anymore. Leaving this here for now. Decision was that variadic args become more difficult to deal with regarding typing that an array of variants which is already typed

// type Element<T> = T extends readonly (infer U)[] ? U : never
// export function pEnum<const T>(variants: T): EnumParser<Element<T>>
// export function pEnum<const T>(...variants: T[]): EnumParser<T>
// export function pEnum<const T>(...variants: T[]): unknown {
//     // variants is either [["a", "b", "c"]] (non-variadic call) or ["a", "b", "c"] (variadic call)
//     if (variants.length === 1) {
//         // non-variadic call, so unpack the wrapping array to give ["a", "b", "c"]
//         const el = at(variants, 0)
//         return new EnumParser<T>(el as unknown as T[])
//     }
//     // variadic call, so just pass the array of variants through
//     return new EnumParser<T>(variants)
//     // TODO add some checks, this is a bit hacky
// }