import { Parser } from "./Parser.js"

export class NeverParser extends Parser<never> {
    public override parse(value: unknown): never {
        throw new Error(`Expected never but got ${JSON.stringify(value)} of type ${JSON.stringify(typeof value)}`)
    }

    public override clone() {
        return new NeverParser()
    }
}

export const pNever = () => new NeverParser()
export const never = pNever