import { LiteralParser } from "./LiteralParser.js"
import { nul } from "./NullParser.js"
import { Validator } from "./Parser.js"
import { undef } from "./UndefinedParser.js"
import { or } from "./UnionParser.js"
import { run, stringify } from "./utils.js"

export class VoidParser extends Validator<void> {

    public override validate(value: unknown): void {
        // void === null or void === undefined
        const { ok, result } = run(() => or(undef(), nul()).validate(value))
        if (!ok) {
            throw new Error(`Expected void but got ${stringify(value)}`)
        }
        return;
    }

    public override clone() {
        return new VoidParser()
    }
}

export const pVoid = () => new VoidParser()
export const voi = pVoid