import { Parser } from "./Parser.js"

export type UnionParserArray<T> = T extends [Parser<infer A>, ...infer B] ? A | UnionParserArray<B> : never

export class OrParser<T extends Parser<any>[]> extends Parser<UnionParserArray<T>> {

    constructor(readonly parsers: T) {
        super()
    }

    public override parse(value: unknown): UnionParserArray<T> {
        const errors: unknown[] = []
        for (const parser of this.parsers) {
            try {
                return parser.parse(value)
            } catch (error) {
                errors.push(error)
            }
        }
        throw new Error(`Expected one of the following types but got ${JSON.stringify(value)} of type ${JSON.stringify(typeof value)}: ${errors.map(error => String(error) ).join("\n")}`)
    }

    public override clone() {
        return new OrParser<T>(this.parsers)
    }
}

export const pOr = <T extends Parser<any>[]>(parsers: T) => new OrParser<T>(parsers)
export const or = pOr
export const union = pOr