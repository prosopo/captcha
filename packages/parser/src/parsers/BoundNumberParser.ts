import { finiteNum } from "./FiniteNumberParser.js"
import { NumberParser, num } from "./NumberParser.js"
import { Validator } from "./Parser.js"
import { TypeofParser } from "./TypeofParser.js"
import { Ctor } from "./utils.js"

export class BoundNumber extends Validator<unknown, number> {

    constructor(public min?: number, public max?: number) {
        super()
    }

    public override validate(value: unknown): number {
        const v = finiteNum().validate(value)
        if (this.min !== undefined) {
            if (v < this.min) {
                throw new Error(`Expected a number greater than or equal to ${this.min}, but got ${v}`)
            }
        }
        if (this.max !== undefined) {
            if (v > this.max) {
                throw new Error(`Expected a number less than or equal to ${this.max}, but got ${v}`)
            }
        }
        return v
    }

    public override clone() {
        return new BoundNumber()
    }

    public override get name(): string {
        if (this.min === undefined) {
            if (this.max === undefined) {
                return "number"
            }
            return `number(<=${this.max})`
        } else {
            if (this.max === undefined) {
                return `number(>=${this.min})`
            }
            return `number(${this.min}<=x<=${this.max})`
        }
    }
}

export const pBoundNumber = (...args: ConstructorParameters<Ctor<BoundNumber>>) => new BoundNumber(...args)
export const boundNumber = pBoundNumber
export const boundNum = pBoundNumber