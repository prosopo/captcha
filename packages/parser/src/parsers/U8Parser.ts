import { betweenBi } from "./BetweenBigInt.js"
import { betweenNum } from "./BetweenNumber.js"
import { bi } from "./BigIntParser.js"
import { num } from "./NumberParser.js"
import { ValidateOptions, Validator } from "./Parser.js"
import { pipe } from "./PipeValidator.js"

export class U8Validator extends Validator<unknown, number> {
    public override validate(value: unknown, options?: ValidateOptions | undefined): number {
        return pipe([
            num(),
            betweenNum({
                min: 0,
                max: 2**8 - 1,
            })
        ], this.name).validate(value, options)
    }

    public override clone() {
        return new U8Validator()
    }

    public override get name(): string {
        return `u8`
    }
}

export const pU8 = () => new U8Validator()
export const u8 = pU8