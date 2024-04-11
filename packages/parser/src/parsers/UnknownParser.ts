import { Validator } from "./Parser.js"

export class UnknownParser extends Validator<{
    output: unknown
}> {

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

    public override get name(): string {
        return `unknown`
    }
}

export const pUnknown = () => new UnknownParser()
export const unknown = pUnknown