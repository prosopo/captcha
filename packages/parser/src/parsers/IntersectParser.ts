import { Validator } from "./Parser.js"

export class IntersectValidator<const T extends Validator<unknown, unknown>[]> extends Validator<unknown, unknown> {
    constructor(private _validators: T) {
        super()
        this._validators = this.validators
    }

    get validators() {
        return this._validators.map(v => v.clone()) as unknown as T
    }

    public override validate(value: unknown): unknown {
        let result = value as unknown
        // validate in turn
        for (const validator of this.validators) {
            // TODO value must satisfy all validators
            // TODO do multiple passes to ensure that the value is still valid after each validator, as value may be modified
            result = validator.validate(result)
        }
        return result
    }

    public override clone() {
        return new IntersectValidator(this._validators)
    }

    public override get name(): string {
        return this.validators.map(v => v.name).join(" & ")
    }
}


export const pIntersect = <const T extends Validator<unknown, unknown>[]>(validators: T) => new IntersectValidator<T>(validators)
export const intersect = pIntersect
export const intersection = pIntersect
export const pAnd = <T extends Validator<unknown, unknown>, U extends Validator<unknown, unknown>>(a: T, b: U) => pIntersect([a, b])
export const and = pAnd