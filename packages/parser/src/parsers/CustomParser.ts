import { Validator } from "./Parser.js"
import { Refiner } from "./Refiner.js"

export type Options<T> = {
    validator: Validator<T>
    name?: string
    refiner?: Refiner<T>
}

export class CustomParser<T> extends Validator<T> {
    private _validator: Validator<T>
    private _name?: string
    private _refiner?: Refiner<T>

    constructor(private options: Options<T>) {
        super()
        this._name = options.name
        this._validator = options.validator
        this._refiner = options.refiner

        this._validator = this.validator // defensive clone
        this._refiner = this.refiner // defensive clone
    }

    public get validator(): Validator<T> {
        return this.options.validator.clone() // defensive clone
    }

    public get refiner(): Refiner<T> | undefined {
        return this.options.refiner?.clone() // defensive clone
    }

    public override shape(value: unknown): T {
        return this.options.validator.shape(value)
    }

    public override get name(): string {
        if (this.options.name !== undefined) {
            return this.options.name
        }
        const refinerName = this.options.refiner ? `(${this.options.refiner.name})` : ''
        return `${this.options.validator.name}${refinerName}`
    }

    public override clone(): CustomParser<T> {
        return new CustomParser({
            validator: this.validator,
            name: this.options.name,
            refiner: this.refiner
        })
    }
}

export const pCustom = <T>(options: Options<T>) => new CustomParser<T>(options)
export const custom = pCustom
export const extend = pCustom