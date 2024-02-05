import { Parser } from "./Parser.js";
import { ExtendPropOptions, Prop, PropOptions } from "./prop.js";

export class OptionalParser<T extends Parser<U> & Prop<P>, U, P extends PropOptions> extends Parser<U | undefined> implements Prop<ExtendPropOptions<P, {
    optional: true
}>> {
    constructor(private parser: T) {
        super()
        this.propOptions = {
            ...this.parser.propOptions,
            optional: true
        }
    }

    propOptions: ExtendPropOptions<P, {
        optional: true
    }>;

    public override parse(value: unknown): U | undefined {
        if (value === undefined) {
            return undefined
        }
        return this.parser.parse(value)
    }

    public override clone() {
        return new OptionalParser<T, U, P>(this.parser)
    }

    optional: true = true;
}

export const pOptional = <T extends Parser<U> & Prop<P>, U, P extends PropOptions>(parser: T) => new OptionalParser<T, U, P>(parser)
export const opt = pOptional