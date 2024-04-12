import { betweenNum } from "./BetweenNumber.js"
import { num } from "./NumberParser.js"
import { Validator, ValidateOptions } from "./Parser.js"
import { pipe } from "./PipeValidator.js"

export class I32Validator extends Validator<unknown, number> {
    public override validate(value: unknown, options?: ValidateOptions | undefined): number {
        return pipe([
            num(),
            betweenNum({
                min: -(2**32) + (2**32 / 2),
                max: 2**32 - (2**32 / 2) - 1,
            })
        ], this.name).validate(value, options)
    }

    public override clone() {
        return new I32Validator()
    }

    public override get name(): string {
        return `i32`
    }
}

export const pI32 = () => new I32Validator()
export const i32 = pI32
