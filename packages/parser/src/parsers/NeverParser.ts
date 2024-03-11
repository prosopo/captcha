import { Parser } from "./Parser.js"
import { stringify } from "./utils.js"

export class NeverParser extends Parser<never> {
    public override parse(value: unknown): never {
        throw new Error(`Expected never but got ${stringify(value)} of type ${JSON.stringify(typeof value, null, 2)}`)
    }

    public override clone() {
        return new NeverParser()
    }
}

export const pNever = () => new NeverParser()
export const never = pNever