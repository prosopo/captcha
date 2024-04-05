import { Validator } from "./Parser.js"
import { TypeofParser } from "./TypeofParser.js"


export class BigIntParser extends TypeofParser<bigint, 'bigint'> {
    constructor() {
        super("bigint")
    }

    public override clone() {
        return new BigIntParser()
    }
}

export const pBigint = () => new BigIntParser()
export const bi = pBigint
export const bigint = pBigint