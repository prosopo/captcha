import { Parser, Shape } from "./Parser.js"
import { ExtendPropOptions, Prop, PropOptions } from "./prop.js";

export class ReadonlyParser<T extends Parser<U> & Prop<P>, U, P extends PropOptions> extends Parser<U> implements Prop<ExtendPropOptions<P, {
    readonly: true
}>> {
    constructor(private parser: T) {
        super()
        this.propOptions = {
            ...this.parser.propOptions,
            readonly: true
        }
    }

    propOptions: ExtendPropOptions<P, {
        readonly: true
    }>;

    public override parse(value: unknown): U {
        return this.parser.parse(value)
    }

    public override clone() {
        return ro<T, U, P>(this.parser)
    }

}

export const pReadonly = <T extends Parser<U> & Prop<P>, U, P extends PropOptions>(parser: T) => new ReadonlyParser<T, U, P>(parser)
export const ro = pReadonly