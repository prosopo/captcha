import { at, get } from "@prosopo/util"
import { inst } from "./InstanceParser.js"
import { Validator, InferArrayInput, InferArrayOutput } from "./Parser.js"


export class TupleValidator<const T extends Validator<unknown, unknown>[]> extends Validator<InferArrayInput<T>, InferArrayOutput<T>> {

    constructor(private _validators: T) {
        super()
        this._validators = this.validators // defensive clone
    }

    get validators() {
        return this._validators.map(validator => validator.clone()) as T
    }

    public override validate(value: unknown): InferArrayOutput<T> {
        const valueArray = inst(Array).validate(value)
        if (valueArray.length !== this._validators.length) {
            throw new Error(`Expected tuple with ${this._validators.length} elements but got ${valueArray.length} elements`)
        }
        for (let i = 0; i < valueArray.length; i++) {
            // parse each element
            const validator = at(this._validators, i)
            valueArray[i] = validator.validate(valueArray[i])
        }
        return value as InferArrayOutput<T>
    }

    public override clone() {
        return new TupleValidator<T>(this._validators)
    }

    public override get name(): string {
        return `[${this._validators.map(validator => validator.name).join(", ")}]`
    }
}

export const pTuple = <const T extends Validator<unknown, unknown>[]>(validators: T) => new TupleValidator<T>(validators)
export const tuple = pTuple
export const tup = pTuple
