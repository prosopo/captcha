import { NumberParser, num } from "./NumberParser.js"
import { Parser } from "./Parser.js"
import { TypeofParser } from "./TypeofParser.js"

export class FiniteNumber extends Parser<number> {

    public override shape(value: unknown): number {
        const v = num().shape(value)
        if (!Number.isFinite(v)) {
            throw new Error(`Expected a finite number, but got ${v}`)
        }
        return v
    }

    public override clone() {
        return new FiniteNumber()
    }

    public override get name(): string {
        return `number(finite)`
    }
}

export const pFiniteNumber = () => new FiniteNumber()
export const finiteNumber = pFiniteNumber
export const finiteNum = pFiniteNumber