import { Validator } from "./Parser.js"
import { Refiner } from "./Refiner.js"

export type Options<T, U = T> = {
    name?: string
    /**
     * Transform a value, optionally converting to a new type.
     * 
     * E.g. an lowercase validator would transform a string to lowercase, refining the value but maintaining the type.
     * E.g. an int validator would transform a string to an integer using parseInt(), converting the value to a new type entirely.
     * 
     * @param value value to transform
     * @returns transformed value
     */
    transform: (value: T) => U
}

/**
 * A validator that transforms a value using a custom function.
 */
export class CustomValidator<T, U = T> extends Validator<U> {

    constructor(private _validator: Validator<T>, private _options: Options<T, U>) {
        super()
    }

    get validator() {
        return this._validator.clone()
    }

    public override validate(value: unknown): U {
        const validated = this._validator.validate(value)
        try {
            return this._options.transform(validated)
        } catch (error) {
            throw new Error(`Failed to transform value: ${error instanceof Error ? error.message : error}`)
        }
    }

    public override clone() {
        return new CustomValidator<T, U>(this._validator, { ...this._options })
    }

    public override get name(): string {
        return this._validator.name
    }
}

export const pCustom = <T, U = T>(validator: Validator<T>, options: Options<T, U>) {
    return new CustomValidator<T, U>(validator, options)
}
export const custom = pCustom
export const transform = pCustom
export const extend = pCustom