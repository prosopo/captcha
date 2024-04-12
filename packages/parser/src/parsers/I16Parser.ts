import { betweenNum } from "./BetweenNumber.js"
import { num } from "./NumberParser.js"
import { Validator, ValidateOptions } from "./Parser.js"
import { pipe } from "./PipeValidator.js"

export class I16Validator extends Validator<unknown, number> {
    public override validate(value: unknown, options?: ValidateOptions | undefined): number {
        return pipe([
            num(),
            betweenNum({
                min: -(2**16) + (2**16 / 2),
                max: 2**16 - (2**16 / 2) - 1,
            })
        ], this.name).validate(value, options)
    }

    public override clone() {
        return new I16Validator()
    }

    public override get name(): string {
        return `i16`
    }
}

export const pI16 = () => new I16Validator()
export const i16 = pI16