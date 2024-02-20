import { inst } from "./InstanceParser.js"
import { Parser, Shape } from "./Parser.js"

export class ArrayParser<T extends Parser<any>> extends Parser<Shape<T>[]> {

    constructor(readonly parser: T, readonly length: number = -1) {
        super()
    }

    public override parse(value: unknown): Shape<T>[] {
        // value is definitely an array
        const valueArray = inst(Array).parse(value)
        if (this.length >= 0) {
            // then expecting fixed length array
            if (valueArray.length !== this.length) {
                throw new Error(`Expected array with ${this.length} elements but got ${valueArray.length} elements`)
            }
        }
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

export const pArray = <T extends Parser<any>>(parser: T, length: number = -1) => new ArrayParser<T>(parser)
export const arr = pArray
export const list = pArray
export const array = pArray