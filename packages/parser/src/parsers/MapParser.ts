import { inst } from "./InstanceParser.js"
import { Validator, Shape, InferOutput } from "./Parser.js"

export class MapParser<T extends Validator<unknown, unknown>, U extends Validator<unknown, unknown>> extends Validator<unknown, Map<InferOutput<T>, InferOutput<U>>> {
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

    public override validate(value: unknown): Map<InferOutput<T>, InferOutput<U>> {
        const valueMap = inst(Map).validate(value)
        const result = new Map<InferOutput<T>, InferOutput<U>>()
        for (const [key, value] of valueMap) {
            // parse every key and value to ensure they are of the correct type
            result.set(this._keyParser.validate(key) as InferOutput<T>, this._valueParser.validate(value) as InferOutput<U>)
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

export const pMap = <T extends Validator<unknown, unknown>, U extends Validator<unknown, unknown>>(keyParser: T, valueParser: U) => new MapParser<T, U>(keyParser, valueParser)
export const map = pMap
export const kv = pMap