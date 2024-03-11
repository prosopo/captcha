import { LiteralParser } from "./LiteralParser.js"
import { nul } from "./NullParser.js"
import { Parser } from "./Parser.js"
import { undef } from "./UndefinedParser.js"
import { or } from "./UnionParser.js"

export class VoidParser extends Parser<void> {

    public override parse(value: unknown): void {
        // void === null or void === undefined
        const [ok, result] = or(undef(), nul()).tryParse(value)
        if (!ok) {
            throw new Error(`Expected void but got ${JSON.stringify(value, null, 2)}`)
        }
        return;
    }

    public override clone() {
        return new VoidParser()
    }
}

export const pVoid = () => new VoidParser()
export const voi = pVoid