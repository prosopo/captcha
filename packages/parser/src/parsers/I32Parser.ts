import { betweenNum } from "./BetweenNumber.js"
import { num } from "./NumberParser.js"
import { pipe } from "./PipeValidator.js"

const fn = () => pipe([
    num(),
    betweenNum({
        min: -Math.pow(2, 32) + (Math.pow(2, 32) / 2),
        max: Math.pow(2, 32) - (Math.pow(2, 32) / 2) - 1,
    })
], `i32`)
export type I32Validator = ReturnType<typeof fn>
export const pI32: () => I32Validator = fn
export const i32 = pI32

const a = i32()
type b = ReturnType<typeof a.validate>
type c = Parameters<typeof a.validate>[0]
