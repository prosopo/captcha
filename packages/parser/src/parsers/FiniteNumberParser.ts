import { NumberParser, num } from "./NumberParser.js"
import { Validator } from "./Parser.js"
import { TypeofParser } from "./TypeofParser.js"

export class FiniteNumber extends Validator<unknown, number> {

    public override validate(value: unknown): number {
        const v = num().validate(value)
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