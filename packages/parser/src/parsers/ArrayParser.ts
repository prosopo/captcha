import { inst } from "./InstanceParser.js"
import { InferOutput, Validator } from "./Parser.js"

export class ArrayParser<T extends Validator<any, any>> extends Validator<unknown, InferOutput<T>[]> {

    constructor(private _parser: T, readonly length: number = -1) {
        super()
        this._parser = this.parser // clone parser
    }

    get parser() {
        return this._parser.clone() as T
    }

    public override validate(value: unknown): InferOutput<T>[] {
        // value is definitely an array
        let valueArray = inst(Array).validate(value)
        if (this.length >= 0) {
            // then expecting fixed length array
            if (valueArray.length !== this.length) {
                throw new Error(`Expected array with ${this.length} elements but got ${valueArray.length} elements`)
            }
        }
        for (let i = 0; i < valueArray.length; i++) {
            // parse each element
            valueArray[i] = this._parser.validate(valueArray[i])
        }
        return value as InferOutput<T>[]
    }

    public override clone() {
        return new ArrayParser<T>(this._parser)
    }

    public override get name(): string {
        return `${this._parser.name}[]`
    }
}

export const pArray = <T extends Validator<any, any>>(parser: T, length: number = -1) => new ArrayParser<T>(parser)
export const arr = pArray
export const list = pArray
export const array = pArray