import { inst } from "./InstanceParser.js"
import { Validator, Shape } from "./Parser.js"

export class MapParser<T extends Validator<any>, U extends Validator<any>> extends Validator<{
    output: Map<Shape<T>, Shape<U>>
}> {
    constructor(private _keyParser: T, private _valueParser: U) {
        super()
        this._keyParser = this.keyParser // clone parser
        this._valueParser = this.valueParser // clone parser
    }

    get keyParser() {
        return this._keyParser.clone() as T
    }

    get valueParser() {
        return this._valueParser.clone() as U
    }

    public override validate(value: unknown): Map<Shape<T>, Shape<U>> {
        const valueMap = inst(Map).validate(value)
        const result = new Map<Shape<T>, Shape<U>>()
        for (const [key, value] of valueMap) {
            // parse every key and value to ensure they are of the correct type
            result.set(this._keyParser.validate(key), this._valueParser.validate(value))
        }
        return result
    }

    public override clone() {
        return new MapParser<T, U>(this._keyParser, this._valueParser)
    }

    public override get name(): string {
        return `Map<${this._keyParser.name}, ${this._valueParser.name}>`
    }
}

export const pMap = <T extends Validator<any>, U extends Validator<any>>(keyParser: T, valueParser: U) => new MapParser<T, U>(keyParser, valueParser)
export const map = pMap
export const kv = pMap