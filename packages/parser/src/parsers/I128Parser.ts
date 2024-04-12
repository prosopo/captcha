import { betweenBi, betweenBigInt } from "./BetweenBigInt.js"
import { bi } from "./BigIntParser.js"
import { num } from "./NumberParser.js"
import { ValidateOptions, Validator } from "./Parser.js"
import { pipe } from "./PipeValidator.js"


export class I128Validator extends Validator<unknown, bigint> {
    public override validate(value: unknown, options?: ValidateOptions | undefined): bigint {
        return pipe([
            bi(),
            betweenBi({
                min: -(2n**128n) + (2n**128n / 2n),
                max: 2n**128n - (2n**128n / 2n) - 1n,
            })
        ], this.name).validate(value, options)
    }

    public override clone() {
        return new I128Validator()
    }

    public override get name(): string {
        return `i128`
    }
}

export const pI128 = () => new I128Validator()
export const i128 = pI128