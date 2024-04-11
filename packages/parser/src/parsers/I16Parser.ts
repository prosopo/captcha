import { betweenNum } from "./BetweenNumber.js"
import { num } from "./NumberParser.js"
import { pipe } from "./PipeValidator.js"

export const pI16 = () => pipe([
    num(),
    betweenNum({
        min: -Math.pow(2, 16) + (Math.pow(2, 16) / 2),
        max: Math.pow(2, 16) - (Math.pow(2, 16) / 2) - 1,
    })
], `i16`)
export const i16 = pI16

const a = i16()
type b = ReturnType<typeof a.validate>
type c = Parameters<typeof a.validate>[0]