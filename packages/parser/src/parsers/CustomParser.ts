import { Validator } from "./Parser.js"


export class CustomParser<T> extends Validator<T> {
    constructor(private readonly fn: (value: unknown) => T, private readonly _name: string) {
        super()
    }

    public override shape(value: unknown): T {
        return this.fn(value)
    }

    public override get name(): string {
        return this._name
    }

    public override clone() {
        return new CustomParser(this.fn, this._name)
    }
}

export const custom = <T>(fn: (value: unknown) => T, name: string): Validator<T> => {
    return new CustomParser<T>(fn, name);
}
export const define = custom
export const redefine = <T>(create: () => Validator<T>, name: string): () => Validator<T> => {
    return () => {
        const p = create()
        return custom((value: unknown) => p.shape(value), name)
    }
}