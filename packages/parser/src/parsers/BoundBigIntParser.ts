import { bi } from "./BigIntParser.js"
import { finiteNum } from "./FiniteNumberParser.js"
import { NumberParser, num } from "./NumberParser.js"
import { Validator } from "./Parser.js"
import { TypeofParser } from "./TypeofParser.js"
import { Ctor } from "./utils.js"

export class BoundBigInt extends Validator<{
    output: bigint
}> {

    constructor(public min?: bigint, public max?: bigint) {
        super()
    }

    public override validate(value: unknown): bigint {
        const v = bi().validate(value)
        if (this.min !== undefined) {
            if (v < this.min) {
                throw new Error(`Expected a bigint greater than or equal to ${this.min}, but got ${v}`)
            }
        }
        if (this.max !== undefined) {
            if (v > this.max) {
                throw new Error(`Expected a bigint less than or equal to ${this.max}, but got ${v}`)
            }
        }
        return v
    }

    public override clone() {
        return new BoundBigInt()
    }

    public override get name(): string {
        if (this.min === undefined) {
            if (this.max === undefined) {
                return `bigint`
            }
            return `bigint(<=${this.max})`
        } else {
            if (this.max === undefined) {
                return `bigint(>=${this.min})`
            }
            return `bigint(${this.min}-${this.max})`
        }
    }
}

export const pBoundBigInt = (...args: ConstructorParameters<Ctor<BoundBigInt>>) => new BoundBigInt(...args)
export const boundBigInt = pBoundBigInt
export const boundBi = pBoundBigInt