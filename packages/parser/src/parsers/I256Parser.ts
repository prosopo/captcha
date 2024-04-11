import { betweenBigInt } from "./BetweenBigInt.js"
import { bi } from "./BigIntParser.js"
import { num } from "./NumberParser.js"
import { pipe } from "./PipeValidator.js"

export const pI256 = () => pipe([
    bi(),
    betweenBigInt({
        min: -(2n**256n) + (2n**256n) / 2n,
        max: (2n**256n) - (2n**256n) / 2n - 1n,
    })
], `i256`)
export const i256 = pI256

const a = i256()
type b = ReturnType<typeof a.validate>
type c = Parameters<typeof a.validate>[0]