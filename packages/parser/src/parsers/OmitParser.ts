import { BaseParser, Parser } from "./Parser.js"
import { OmitMask } from "./utils.js"


export class OmitParser<T, U> extends BaseParser<OmitMask<T, U>> {

    constructor(private target: T, private mask: U) {
        super()
    }

    parse(value: unknown): OmitMask<T, U> {
        // TODO
        return null!
    }

}

const a = {
    a: 1,
    b: true,
    c: 'hello',
    d: {
        e: 1,
        f: true,
        g: 'hello',
    }
}
const b = {
    a: true,
    d: {
        e: true,
    }
}
const c = new OmitParser(a, b)
const d = c.parse(a)
type t = typeof d