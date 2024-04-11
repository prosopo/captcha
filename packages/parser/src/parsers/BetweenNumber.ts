import { Validator } from "./Parser.js";

export type Options = {
    min?: number
    max?: number
    minInclusive?: boolean
    maxInclusive?: boolean
}

export class BetweenNumber extends Validator<number, number> {

    constructor(public options: Options) {
        super()
    }

    public override validate(value: number): number {
        if (this.options.min !== undefined) {
            if(this.options.minInclusive) {
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
            if(this.options.maxInclusive) {
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
                if(this.options.maxInclusive) {
                    return `<=${this.options.max}`
                } else {
                    return `<${this.options.max}`
                }
            }
        } else {
            if (this.options.max === undefined) {
                if(this.options.minInclusive) {
                    return `>=${this.options.min}`
                } else {
                    return `>${this.options.min}`
                }
            } else {
                if(this.options.minInclusive) {
                    if(this.options.maxInclusive) {
                        return `${this.options.min}<=x<=${this.options.max}`
                    } else {
                        return `${this.options.min}<=x<${this.options.max}`
                    }
                } else {
                    if (this.options.maxInclusive) {
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