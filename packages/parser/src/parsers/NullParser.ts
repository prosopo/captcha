import { Parser } from "./Parser.js"

export class NullParser extends Parser<null> {
    public override parse(value: unknown): null {
        if (value !== null) {
            throw new Error(`Expected null but got ${JSON.stringify(value)} of type ${JSON.stringify(typeof value)}`)
        }
        return value
    }

    public override clone() {
        return new NullParser()
    }
}

export const pNull = () => new NullParser()
export const nul = pNull