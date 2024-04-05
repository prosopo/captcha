import { BooleanParser, bool } from "./BooleanParser.js"
import { never } from "./NeverParser.js"
import { NumberParser, num } from "./NumberParser.js"
import { Parser, Shape } from "./Parser.js"
import { StringParser, str } from "./StringParser.js"

export type UnionParserArray<T> = T extends [Parser<infer A>, ...infer B] ? A | UnionParserArray<B> : never

export class UnionParser<const T extends Parser<any>[]> extends Parser<UnionParserArray<T>> {

    constructor(private _parsers: T) {
        super()
        this._parsers = this.parsers // clone parsers
    }

    get parsers() {
        return this._parsers.map(parser => parser.clone()) as T
    }

    public override shape(value: unknown): UnionParserArray<T> {
        if(this._parsers.length == 0) throw new Error("No parsers provided to union, cannot parse value")
        const errors: unknown[] = []
        for (const parser of this._parsers) {
            try {
                return parser.shape(value)
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
        return `(${this._parsers.map(parser => parser.name).join(" | ")})`
    }
}

export const pUnion = <const T extends Parser<any>[]>(parsers: T) => new UnionParser<T>(parsers)
export const union = pUnion
export const pOr = <T extends Parser<any>, U extends Parser<any>>(parser1: T, parser2: U) => new UnionParser([parser1, parser2])
export const or = pOr
