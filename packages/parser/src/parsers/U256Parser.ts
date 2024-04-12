import { betweenBi } from "./BetweenBigInt.js"
import { bi } from "./BigIntParser.js"
import { ValidateOptions, Validator } from "./Parser.js"
import { pipe } from "./PipeValidator.js"

export class U256Validator extends Validator<unknown, bigint> {
    public override validate(value: unknown, options?: ValidateOptions | undefined): bigint {
        return pipe([
            bi(),
            betweenBi({
                min: 0n,
                max: 2n**256n - 1n,
            })
        ], this.name).validate(value, options)
    }

    public override clone() {
        return new U256Validator()
    }

    public override get name(): string {
        return `u256`
    }
}

export const pU256 = () => new U256Validator()
export const u256 = pU256