import { LiteralParser } from "./LiteralParser.js"
import { nul } from "./NullParser.js"
import { Parser } from "./Parser.js"
import { undef } from "./UndefinedParser.js"
import { or } from "./UnionParser.js"

export class VoidParser extends Parser<void> {

    public override parse(value: unknown): void {
        // void === null or void === undefined
        or(undef(), nul()).tryParse(value).unwrapOrError(() => new Error(`Expected undefined or null, but got ${JSON.stringify(value, null, 2)} of type ${typeof JSON.stringify(value, null, 2)}`))
    }

    public override clone() {
        return new VoidParser()
    }
}

export const pVoid = () => new VoidParser()
export const voi = pVoid