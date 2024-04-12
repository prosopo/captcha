import { betweenBi, betweenBigInt } from "./BetweenBigInt.js"
import { bi } from "./BigIntParser.js"
import { num } from "./NumberParser.js"
import { ValidateOptions, Validator } from "./Parser.js"
import { pipe } from "./PipeValidator.js"

export class I256Validator extends Validator<unknown, bigint> {
    public override validate(value: unknown, options?: ValidateOptions | undefined): bigint {
        return pipe([
            bi(),
            betweenBi({
                min: -(2n**256n) + (2n**256n / 2n),
                max: 2n**256n - (2n**256n / 2n) - 1n,
            })
        ], this.name).validate(value, options)
    }

    public override clone() {
        return new I256Validator()
    }

    public override get name(): string {
        return `i256`
    }
}

export const pI256 = () => new I256Validator()
export const i256 = pI256