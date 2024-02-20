import { Parser } from "./Parser.js"

export class TypeofParser<T, U extends string> extends Parser<T> {

    constructor(readonly typeName: U) {
        super()
    }

    public override parse(value: unknown): T {
        if (typeof value !== this.typeName) {
            throw new Error(`Expected ${this.typeName} but got ${JSON.stringify(value, null, 2)} of type ${JSON.stringify(typeof value, null, 2)}`)
        }
        return value as T
    }

    public override clone() {
        return new TypeofParser<T, U>(this.typeName)
    }
}

export const pTypeof = <T, U extends string>(typeName: U) => new TypeofParser<T, U>(typeName)
export const ofType = pTypeof