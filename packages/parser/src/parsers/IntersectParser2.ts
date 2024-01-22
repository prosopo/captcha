import { ParserShapeIntersect } from "./IntersectParser.js"
import { pNumber } from "./NumberParser.js"
import { ObjectParser } from "./ObjectParser.js"
import { Parser, BaseParser } from "./Parser.js"
import { pString } from "./StringParser.js"

export class IntersectParser2<const T extends Parser<unknown>[]> implements BaseParser<ParserShapeIntersect<T>> {
    public constructor(private parsers: T) {}

    parse(value: unknown): ParserShapeIntersect<T> {
        return null!
    }   
}
export const pIntersect2 = <const T extends Parser<unknown>[]>(parsers: T) => new IntersectParser2(parsers)


const o = new ObjectParser({ a: pString() })
const p = new ObjectParser({ b: pNumber() })
const v = new IntersectParser2([o, p])
type w = ReturnType<typeof v.parse>
const x = pIntersect2([o, p])
type y = ReturnType<typeof x.parse>