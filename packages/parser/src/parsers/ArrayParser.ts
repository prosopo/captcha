import { Parser, Shape } from "./Parser.js"

export class ArrayParser<T extends Parser<any>> extends Parser<Shape<T>[]> {

    constructor(readonly parser: T) {
        super()
    }

    public override parse(value: unknown): Shape<T>[] {
        if (value === null) {
            throw new Error(`Expected array but got null`)
        }
        if (!Array.isArray(value)) {
            throw new Error(`Expected array but got ${JSON.stringify(value)} of type ${JSON.stringify(typeof value)}`)
        }
        // value is definitely an array
        const valueArray = value as unknown[]
        for (let i = 0; i < valueArray.length; i++) {
            // parse each element
            valueArray[i] = this.parser.parse(valueArray[i])
        }
        return value as Shape<T>[]
    }

    public override clone() {
        return new ArrayParser<T>(this.parser)
    }
}

export const pArray = <T extends Parser<any>>(parser: T) => new ArrayParser<T>(parser)
export const arr = pArray
export const list = pArray
export const array = pArray