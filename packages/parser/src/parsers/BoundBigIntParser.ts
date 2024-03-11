import { bi } from "./BigIntParser.js"
import { finiteNum } from "./FiniteNumberParser.js"
import { NumberParser, num } from "./NumberParser.js"
import { Parser } from "./Parser.js"
import { TypeofParser } from "./TypeofParser.js"
import { Ctor } from "./utils.js"

const maxBi = BigInt(Math.pow(2, 64))

export class BoundBigInt extends Parser<bigint> {

    constructor(public min: bigint = 0n, public max: bigint = maxBi) {
        super()
    }

    public override parse(value: unknown): bigint {
        const v = bi().parse(value)
        if (v < this.min || v > this.max) {
            throw new Error(`Expected a number between ${this.min} and ${this.max}, but got ${v}`)
        }
        return v
    }

    public override clone() {
        return new BoundBigInt()
    }
}

export const pBoundBigInt = (...args: ConstructorParameters<Ctor<BoundBigInt>>) => new BoundBigInt(...args)
export const boundBigInt = pBoundBigInt