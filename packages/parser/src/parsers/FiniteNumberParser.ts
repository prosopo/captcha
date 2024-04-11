import { NumberParser, num } from "./NumberParser.js"
import { Validator } from "./Parser.js"
import { TypeofParser } from "./TypeofParser.js"

export class FiniteNumber extends Validator<number, number> {

    public override validate(value: number): number {
        if (!Number.isFinite(value)) {
            throw new Error(`Expected a finite number, but got ${value}`)
        }
        return value
    }

    public override clone() {
        return new FiniteNumber()
    }

    public override get name(): string {
        return `finite`
    }
}

export const pFiniteNumber = () => new FiniteNumber()
export const finiteNumber = pFiniteNumber
export const finiteNum = pFiniteNumber
export const finite = pFiniteNumber