import { inst } from "./InstanceParser.js"
import { Shaper } from "./Parser.js"
import { stringify } from "./utils.js"

// ts enums are a simple mapping from string to number
// they also have a reverse mapping from number to string IFF the enum values are not specified
// e.g. enum Foo { A, B, C } is converted to {
//    A: 0,
//    B: 1,
//    C: 2,
//    "0": "A",
//    "1": "B",
//    "2": "C"
// }
// a string enum of Bar { A = "A", B = "B", C = "C" } is converted to {
//    A: "A",
//    B: "B",
//    C: "C"
// }
// a non-matching string enum of Baz { A = "x", B = "y", C = "z" } is converted to {
//    A: "x",
//    B: "y",
//    C: "z",
// }
// note how the values of the enum are reverse mapped as strings, e.g. in Foo the value 0 is mapped to "A", but 0 is a string, "0", not a number.
// note how reverse mapping only occurs if the enum values are not specified.
// note that enum members can only have string names.
// note that if one enum value has a value, all must.
// note that enum values of string or number can be mixed, e.g. Qux { A = "x", B = 2, C = 3, D = "y" } is converted to {
//    A: "x",
//    B: 2,
//    C: 3,
//    D: "y",
//    "x": "A",
//    "2": "B",
//    "3": "C",
//    "y": "D"
// }
export class NativeEnumParser<T> extends Shaper<T[keyof T]> {
    // store a list of the variants
    readonly variants: readonly T[keyof T][]

    constructor(readonly nativeEnum: T) {
        super()
        const nativeEnumObj = inst(Object).shape(nativeEnum)
        // iterate over the enum key/value mapping (which is just an obj under the hood)
        const result: T[keyof T][] = []
        for (const [key, enumValue] of Object.entries(nativeEnumObj)) {
            // if the key is numeric, ignore it. This is a reverse mapping. E.g. given enum Foo { A, B, C }, the enum becomes {
            //    A: 0,
            //    B: 1,
            //    C: 2,
            //    "0": "A",
            //    "1": "B",
            //    "2": "C"
            // }
            // under the hood. We don't want to allow a value matching the reverse mapping through, e.g. reject values of 'A', 'B', or 'C', accept values of 0, 1, or 2.
            // we can detect this by checking if the key is numeric.
            if (!Number.isNaN(parseInt(key))) {
                // and skip if so
                continue
            }
            // otherwise, add the enum value to the result
            result.push(enumValue)
        }
        this.variants = result
    }

    public override shape(value: unknown): T[keyof T] {
        for (const variant of this.variants) {
            if (variant === value) {
                return variant
            }
        }
        throw new Error(`Expected one of ${JSON.stringify(this.variants, null, 2)} but got ${stringify(value)} of type ${JSON.stringify(typeof value, null, 2)}`)
    }

    public override clone() {
        return new NativeEnumParser<T>(this.nativeEnum)
    }

    public override get name(): string {
        return `${this.variants.map(v => String(v)).join(" | ")}`
    }
}

export const pNativeEnum = <T>(variants: T) => new NativeEnumParser<T>(variants)
export const nen = pNativeEnum
export const natEnum = pNativeEnum