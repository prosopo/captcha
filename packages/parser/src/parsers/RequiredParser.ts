import { Parser } from "./Parser.js"
import { ExtendPropOptions, Prop, PropOptions } from "./prop.js"

export class RequiredParser<T extends Parser<U> & Prop<P>, U, P extends PropOptions> extends Parser<Exclude<U, undefined>> implements Prop<ExtendPropOptions<P, {
    optional: false
}>> {
    constructor(private parser: T) {
        super()
        this.propOptions = {
            ...this.parser.propOptions,
            optional: false
        }
    }

    public override parse(value: unknown): Exclude<U, undefined> {
        if (value === undefined) {
            throw new Error(`Expected a value but got undefined`)
        }
        return this.parser.parse(value) as Exclude<U, undefined>
    }

    public override clone() {
        return new RequiredParser<T, U, P>(this.parser)
    }

    propOptions: ExtendPropOptions<P, {
        optional: false
    }>;
}

export const pRequired = <T extends Parser<U> & Prop<P>, U, P extends PropOptions>(parser: T) => new RequiredParser<T, U, P>(parser)
export const req = pRequired