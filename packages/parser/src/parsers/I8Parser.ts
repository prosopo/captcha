import { betweenNum } from "./BetweenNumber.js"
import { num } from "./NumberParser.js"
import { pipe } from "./PipeValidator.js"

export const pI8 = () => pipe([
    num(),
    betweenNum({
        min: -Math.pow(2, 8) + (Math.pow(2, 8) / 2),
        max: Math.pow(2, 8) - (Math.pow(2, 8) / 2) - 1,
    })
], `i8`)
export const i8 = pI8

const a = i8()
type b = ReturnType<typeof a.validate>
type c = Parameters<typeof a.validate>[0]