import { Parser } from "./Parser.js"

export class UndefinedParser extends Parser<undefined> {
    public override parse(value: unknown): undefined {
        if (value !== undefined) {
            throw new Error(`Expected undefined but got ${JSON.stringify(value)} of type ${JSON.stringify(typeof value)}`)
        }
        return value
    }

    public override clone() {
        return new UndefinedParser()
    }
}

export const pUndefined = () => new UndefinedParser()
export const undef = pUndefined