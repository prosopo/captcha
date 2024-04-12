import { betweenBi } from "./BetweenBigInt.js"
import { bi } from "./BigIntParser.js"
import { ValidateOptions, Validator } from "./Parser.js"
import { pipe } from "./PipeValidator.js"

export class U128Validator extends Validator<unknown, bigint> {
    public override validate(value: unknown, options?: ValidateOptions | undefined): bigint {
        return pipe([
            bi(),
            betweenBi({
                min: 0n,
                max: 2n**128n - 1n,
            })
        ], this.name).validate(value, options)
    }

    public override clone() {
        return new U128Validator()
    }

    public override get name(): string {
        return `u128`
    }
}

export const pU128 = () => new U128Validator()
export const u128 = pU128