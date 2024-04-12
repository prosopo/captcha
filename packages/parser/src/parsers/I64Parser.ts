import { betweenBi, betweenBigInt } from "./BetweenBigInt.js"
import { betweenNum } from "./BetweenNumber.js"
import { bi } from "./BigIntParser.js"
import { num } from "./NumberParser.js"
import { Validator, ValidateOptions } from "./Parser.js"
import { pipe } from "./PipeValidator.js"

export class I64Validator extends Validator<unknown, bigint> {
    public override validate(value: unknown, options?: ValidateOptions | undefined): bigint {
        return pipe([
            bi(),
            betweenBi({
                min: -(2n**64n) + (2n**64n / 2n),
                max: 2n**64n - (2n**64n / 2n) - 1n,
            })
        ], this.name).validate(value, options)
    }

    public override clone() {
        return new I64Validator()
    }

    public override get name(): string {
        return `i64`
    }
}

export const pI64 = () => new I64Validator()
export const i64 = pI64