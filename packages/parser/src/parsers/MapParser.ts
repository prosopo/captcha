import { inst } from "./InstanceParser.js"
import { Parser, Shape } from "./Parser.js"

export class MapParser<T extends Parser<any>, U extends Parser<any>> extends Parser<Map<Shape<T>, Shape<U>>> {
    constructor(readonly keyParser: T, readonly valueParser: U) {
        super()
    }

    public override parse(value: unknown): Map<Shape<T>, Shape<U>> {
        const valueMap = inst(Map).parse(value)
        const result = new Map<Shape<T>, Shape<U>>()
        for (const [key, value] of valueMap) {
            // parse every key and value to ensure they are of the correct type
            result.set(this.keyParser.parse(key), this.valueParser.parse(value))
        }
        return result
    }

    public override clone() {
        return new MapParser<T, U>(this.keyParser, this.valueParser)
    }
}

export const pMap = <T extends Parser<any>, U extends Parser<any>>(keyParser: T, valueParser: U) => new MapParser<T, U>(keyParser, valueParser)
export const map = pMap
export const kv = pMap