import { finiteNum } from "./FiniteNumber.js"
import { NumberParser, num } from "./NumberParser.js"
import { Parser } from "./Parser.js"
import { TypeofParser } from "./TypeofParser.js"
import { Ctor } from "./utils.js"

export class BoundNumber extends Parser<number> {

    constructor(public min: number = Number.MIN_SAFE_INTEGER, public max: number = Number.MAX_SAFE_INTEGER) {
        super()
    }

    public override parse(value: unknown): number {
        const v = finiteNum().parse(value)
        if (v < this.min || v > this.max) {
            throw new Error(`Expected a number between ${this.min} and ${this.max}, but got ${v}`)
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