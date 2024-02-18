import { Parser } from "./Parser.js"


export class BigIntParser extends Parser<bigint> {
    public override parse(value: unknown): bigint {
        if (typeof value !== "bigint") {
            throw new Error(`Expected a bigint but got ${JSON.stringify(value)} of type ${JSON.stringify(typeof value)}`)
        }
        return value
    }

    public override clone() {
        return new BigIntParser()
    }
}

export const pBigint = () => new BigIntParser()
export const bi = pBigint