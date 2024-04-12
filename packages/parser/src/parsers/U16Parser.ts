import { betweenBi } from "./BetweenBigInt.js"
import { betweenNum } from "./BetweenNumber.js"
import { bi } from "./BigIntParser.js"
import { num } from "./NumberParser.js"
import { ValidateOptions, Validator } from "./Parser.js"
import { pipe } from "./PipeValidator.js"

export class U16Validator extends Validator<unknown, number> {
    public override validate(value: unknown, options?: ValidateOptions | undefined): number {
        return pipe([
            num(),
            betweenNum({
                min: 0,
                max: 2**16 - 1,
            })
        ], this.name).validate(value, options)
    }

    public override clone() {
        return new U16Validator()
    }

    public override get name(): string {
        return `u16`
    }
}

export const pU16 = () => new U16Validator()
export const u16 = pU16