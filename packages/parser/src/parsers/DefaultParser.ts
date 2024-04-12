import { ValidateOptions, Validator } from "./Parser.js"

export class DefaultValidator<I, O> extends Validator<I, O> {
    constructor(private _validator: Validator<I, O>, private _fn: () => O) {
        super()
        this._validator = this._validator.clone() // defensive clone
    }

    public override validate(value: I, options?: ValidateOptions | undefined): O {
        if (value === undefined) {
            return this._fn()
        }
        return this._validator.validate(value, options)
    }

    public override clone() {
        return new DefaultValidator(this._validator, this._fn)
    }

    public override get name(): string {
        return `${this._validator.name} = ${this._fn()}`
    }

    public get validator() {
        return this._validator.clone()
    }
}

export const pDefault = <I, O>(validator: Validator<I, O>, fn: () => O) => new DefaultValidator(validator, fn)
export const def = pDefault
export const defaultTo = pDefault