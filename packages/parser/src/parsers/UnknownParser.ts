import { Parser } from "./Parser.js"

export class UnknownParser extends Parser<unknown> {

    constructor() {
        super()
    }

    public override shape(value: unknown): unknown {
        // no-op parser
        return value
    }

    public override clone() {
        return new UnknownParser()
    }
}

export const pUnknown = () => new UnknownParser()
export const unknown = pUnknown