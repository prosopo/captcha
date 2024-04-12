import { ValidateOptions, Validator } from "./Parser.js";

export type Options<I, O> = {
    name: string
    /**
     * Transform a value, optionally converting to a new type.
     * 
     * E.g. an lowercase validator would transform a string to lowercase, refining the value but maintaining the type.
     * E.g. an int validator would transform a string to an integer using parseInt(), converting the value to a new type entirely.
     * 
     * @param value value to transform
     * @returns transformed value
     */
    transform: (value: I) => O
}

/**
 * A validator that transforms a value using a custom function.
 * 
 * T is the input type, U is the output type. By default, T and U are the same, i.e. transform does not change the type.
 */
export class CustomValidator<I, O> extends Validator<I, O> {

    constructor(private _options: Options<I, O>) {
        super()
    }

    get options() {
        return { ...this._options }
    }

    public override validate(value: I, options?: ValidateOptions | undefined): O {
        try {
            return this._options.transform(value)
        } catch (error) {
            throw new Error(`Failed to transform value: ${error instanceof Error ? error.message : error}`)
        }
    }

    public override clone(): Validator<I, O> {
        return new CustomValidator<I, O>(this.options)
    }

    public override get name(): string {
        return this._options.name
    }
}

export const pCustom = <I, O>(...args: ConstructorParameters<typeof CustomValidator<I, O>>) => {
    return new CustomValidator<I, O>(...args)
}
export const custom = pCustom
export const transform = pCustom