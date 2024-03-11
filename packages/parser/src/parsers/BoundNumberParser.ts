import { finiteNum } from "./FiniteNumberParser.js"
import { NumberParser, num } from "./NumberParser.js"
import { Parser } from "./Parser.js"
import { TypeofParser } from "./TypeofParser.js"
import { Ctor } from "./utils.js"

export class BoundNumber extends Parser<number> {

    constructor(public min?: number, public max?: number) {
        super()
    }

    public override parse(value: unknown): number {
        const v = finiteNum().parse(value)
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
}

export const pBoundNumber = (...args: ConstructorParameters<Ctor<BoundNumber>>) => new BoundNumber(...args)
export const boundNumber = pBoundNumber
export const boundNum = pBoundNumber