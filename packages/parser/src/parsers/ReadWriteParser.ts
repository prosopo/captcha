import { Parser } from "./Parser.js";
import { Prop, PropOptions, ExtendPropOptions } from "./prop.js";

export class ReadWriteParser<T extends Parser<U> & Prop<P>, U, P extends PropOptions> extends Parser<U> implements Prop<ExtendPropOptions<P, {
    readonly: false
}>> {
    constructor(private parser: T) {
        super()
        this.propOptions = {
            ...this.parser.propOptions,
            readonly: false
        }
    }

    public override parse(value: unknown): U {
        return this.parser.parse(value)
    }

    public override clone() {
        return new ReadWriteParser<T, U, P>(this.parser)
    }

    propOptions: ExtendPropOptions<P, {
        readonly: false
    }>;
}

export const pReadWrite = <T extends Parser<U> & Prop<P>, U, P extends PropOptions>(parser: T) => new ReadWriteParser<T, U, P>(parser)
export const rw = pReadWrite
