import { betweenBi } from "./BetweenBigInt.js"
import { bi } from "./BigIntParser.js"
import { ValidateOptions, Validator } from "./Parser.js"
import { pipe } from "./PipeValidator.js"

export class U64Validator extends Validator<unknown, bigint> {
    public override validate(value: unknown, options?: ValidateOptions | undefined): bigint {
        return pipe([
            bi(),
            betweenBi({
                min: 0n,
                max: 2n**64n - 1n,
            })
        ], this.name).validate(value, options)
    }

    public override clone() {
        return new U64Validator()
    }

    public override get name(): string {
        return `u64`
    }
}

export const pU64 = () => new U64Validator()
export const u64 = pU64