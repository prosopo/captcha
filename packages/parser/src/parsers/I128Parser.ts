import { betweenBigInt } from "./BetweenBigInt.js"
import { bi } from "./BigIntParser.js"
import { num } from "./NumberParser.js"
import { pipe } from "./PipeValidator.js"

export const pI128 = () => pipe([
    bi(),
    betweenBigInt({
        min: -(2n**128n) + (2n**128n) / 2n,
        max: (2n**128n) - (2n**128n) / 2n - 1n,
    })
], `i128`)
export const i128 = pI128

const a = i128()
type b = ReturnType<typeof a.validate>
type c = Parameters<typeof a.validate>[0]