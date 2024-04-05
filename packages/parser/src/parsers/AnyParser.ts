import { Parser } from "./Parser.js"

export class AnyParser extends Parser<any> {

    constructor() {
        super()
    }

    public override shape(value: unknown): any {
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