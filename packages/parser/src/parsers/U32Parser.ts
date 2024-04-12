import { betweenBi } from "./BetweenBigInt.js"
import { betweenNum } from "./BetweenNumber.js"
import { bi } from "./BigIntParser.js"
import { num } from "./NumberParser.js"
import { ValidateOptions, Validator } from "./Parser.js"
import { pipe } from "./PipeValidator.js"

export class U32Validator extends Validator<unknown, number> {
    public override validate(value: unknown, options?: ValidateOptions | undefined): number {
        return pipe([
            num(),
            betweenNum({
                min: 0,
                max: 2**32 - 1,
            })
        ], this.name).validate(value, options)
    }

    public override clone() {
        return new U32Validator()
    }

    public override get name(): string {
        return `u32`
    }
}

export const pU32 = () => new U32Validator()
export const u32 = pU32