import { betweenBigInt } from "./BetweenBigInt.js"
import { bi } from "./BigIntParser.js"
import { num } from "./NumberParser.js"
import { pipe } from "./PipeValidator.js"

export const pI64 = () => pipe([
    bi(),
    betweenBigInt({
        min: -(2n**64n) + (2n**64n) / 2n,
        max: (2n**64n) - (2n**64n) / 2n - 1n,
    })
], `i64`)
export const i64 = pI64

const a = i64()
type b = ReturnType<typeof a.validate>
type c = Parameters<typeof a.validate>[0]