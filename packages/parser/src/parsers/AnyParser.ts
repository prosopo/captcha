import { Parser } from "./Parser.js"

export class AnyParser extends Parser<any> {

    constructor() {
        super()
    }

    public override parse(value: unknown): any {
        // no-op parser
        return value
    }

    public override clone() {
        return new AnyParser()
    }
}

export const pAny = () => new AnyParser()
export const any = pAny