import { Validator } from "./Parser.js"

export class UnknownParser extends Validator<unknown> {

    constructor() {
        super()
    }

    public override validate(value: unknown): unknown {
        // no-op parser
        return value
    }

    public override clone() {
        return new UnknownParser()
    }
}

export const pUnknown = () => new UnknownParser()
export const unknown = pUnknown