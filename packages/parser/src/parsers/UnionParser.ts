import { pNumber } from "./NumberParser.js"
import { BaseParser, Parser } from "./Parser.js"
import { pString } from "./StringParser.js"


// export class UnionParser<T, U> extends BaseParser<T | U> {

//     constructor(private left: Parser<T>, private right: Parser<U>) {
//         super()
//     }

//     parse(value: unknown): T | U {
//         // must match one of the two parsers
//         try {
//             return this.left.parse(value)
//         } catch (leftError) {
//             try {
//                 return this.right.parse(value)
//             } catch (rightError) {
//                 throw new Error(`Expected ${JSON.stringify(typeof this.left.shape)} or ${JSON.stringify(typeof this.right.shape)} but got ${JSON.stringify(value)} of type ${JSON.stringify(typeof value)}`)
//             }
//         }
//     }

// }

export type ParserShapeUnion<T> = T extends Parser<infer U>[] ? U : never

export class UnionParser<T extends Parser<unknown>[], U extends ParserShapeUnion<T>> extends BaseParser<U> {
    constructor(private parsers: T) {
        super()
    }

    override parse(value: unknown): U {
        // must match one of the parsers
        const errors = []
        for (const parser of this.parsers) {
            try {
                return parser.parse(value) as unknown as U
            } catch (error) {
                errors.push(error)
            }
        }
        throw new Error(`${JSON.stringify(value)} of type ${JSON.stringify(typeof value)} did not match any of the expected types: ${errors.join(', ')}`)
    }
}

export const pUnion = <T extends Parser<unknown>[], U extends ParserShapeUnion<T>>(parsers: T) => new UnionParser<T, U>(parsers)
