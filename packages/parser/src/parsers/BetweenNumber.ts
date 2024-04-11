import { finite } from "./FiniteNumberParser.js";
import { Validator } from "./Parser.js";

export type Options = {
    min?: number
    max?: number
    minExclusive?: boolean
    maxExclusive?: boolean
    allowInfinite?: boolean
}

export class BetweenNumber extends Validator<number, number> {

    constructor(public options: Options) {
        super()
    }

    public override validate(value: number): number {
        // NaN and Inf's cause issues with comparisons
        // reject them by default
        if (!this.options.allowInfinite) {
            value = finite().validate(value)
        }
        if (this.options.min !== undefined) {
            if(!this.options.minExclusive) {
                if(value < this.options.min) {
                    throw new Error(`Value ${value} is less than the minimum ${this.options.min}`)
                }
            } else {
                if(value <= this.options.min) {
                    throw new Error(`Value ${value} is less than or equal to the minimum ${this.options.min}`)
                }
            }
        }
        if (this.options.max !== undefined) {
            if(!this.options.maxExclusive) {
                if(value > this.options.max) {
                    throw new Error(`Value ${value} is greater than the maximum ${this.options.max}`)
                }
            } else {
                if(value >= this.options.max) {
                    throw new Error(`Value ${value} is greater than or equal to the maximum ${this.options.max}`)
                }
            }
        }
        return value
    }

    public override clone(): BetweenNumber {
        return new BetweenNumber({...this.options})
    }

    public override get name(): string {
        if(this.options.min === undefined) {
            if(this.options.max === undefined) {
                return ``
            } else {
                if(!this.options.maxExclusive) {
                    return `<=${this.options.max}`
                } else {
                    return `<${this.options.max}`
                }
            }
        } else {
            if (this.options.max === undefined) {
                if(!this.options.minExclusive) {
                    return `>=${this.options.min}`
                } else {
                    return `>${this.options.min}`
                }
            } else {
                if(!this.options.minExclusive) {
                    if(!this.options.maxExclusive) {
                        return `${this.options.min}<=x<=${this.options.max}`
                    } else {
                        return `${this.options.min}<=x<${this.options.max}`
                    }
                } else {
                    if (!this.options.maxExclusive) {
                        return `${this.options.min}<x<=${this.options.max}`
                    } else {
                        return `${this.options.min}<x<${this.options.max}`
                    }
                }
            }
        }
    }
}

export const pBetweenNumber = (options: Options) => new BetweenNumber(options)
export const betweenNumber = pBetweenNumber
export const betweenNum = pBetweenNumber