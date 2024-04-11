import { Validator } from "./Parser.js"

export class AnyParser extends Validator<any> {

    constructor() {
        super()
    }

    public override validate(value: unknown): any {
        // no-op parser
        return value
    }

    public override clone() {
        return new AnyParser()
    }

    public override get name(): string {
        return `any`
    }
}

export const pAny = () => new AnyParser()
export const any = pAny