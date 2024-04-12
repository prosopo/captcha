import { InferArrayInput, InferArrayOutput, InferInput, InferOutput, Validator } from "./Parser.js"
import { Eq, EqArray, EqMany, First } from "./utils.js"


export type UnionInput<T> = EqMany<InferArrayInput<T>> extends true ? InferInput<First<T>> : never
type a1 = UnionInput<[Validator<string, unknown>, Validator<number, unknown>]>
type a2 = UnionInput<[Validator<string, unknown>, Validator<string, unknown>]>
type a3 = UnionInput<[Validator<string, unknown>, Validator<string, unknown>, Validator<string, unknown>]>
type a4 = UnionInput<[Validator<string, unknown>]>
type a5 = UnionInput<[]>
export type UnionOutput<T> = T extends [Validator<unknown, infer A>, ...infer B] ? A | UnionOutput<B> : never
type b1 = UnionOutput<[Validator<unknown, number>, Validator<unknown, string>, Validator<unknown, boolean>]>
type b2 = UnionOutput<[Validator<unknown, number>, Validator<unknown, string>]>
type b3 = UnionOutput<[Validator<unknown, number>]>
type b4 = UnionOutput<[]>
type b5 = UnionOutput<[Validator<unknown, number>, Validator<unknown, number>]>

export class UnionParser<const T extends Validator<unknown, unknown>[]> extends Validator<UnionInput<T>, UnionOutput<T>> {

    constructor(private _parsers: T) {
        super()
        this._parsers = this.parsers // defensive clone
    }

    get parsers() {
        return this._parsers.map(parser => parser.clone()) as T
    }

    public override validate(value: unknown): UnionOutput<T> {
        // this shouldn't happen because the output of a union is never if the array of validators is empty
        if(this._parsers.length == 0) throw new Error("No parsers provided to union, cannot parse value")
        const errors: unknown[] = []
        for (const parser of this._parsers) {
            // attempt to validate with each parser
            try {
                return parser.validate(value) as UnionOutput<T>
            } catch (error) {
                errors.push(error)
            }
        }
        throw new Error(`Expected one of the following types but got ${JSON.stringify(value, null, 2)} of type ${JSON.stringify(typeof value, null, 2)}: ${errors.map(error => String(error) ).join("\n")}`)
    }

    public override clone() {
        return new UnionParser<T>(this._parsers)
    }

    public override get name(): string {
        return `${this._parsers.map(parser => parser.name).join(" | ")}`
    }
}

export const pUnion = <const T extends Validator<unknown, unknown>[]>(parsers: T) => new UnionParser<T>(parsers)
export const union = pUnion
export const pOr = <T extends Validator<unknown, unknown>, U extends Validator<unknown, unknown>>(parser1: T, parser2: U) => new UnionParser([parser1, parser2])
export const or = pOr
