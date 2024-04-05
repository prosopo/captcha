import { boundNum } from "./BoundNumberParser.js"
import { custom, redefine } from "./CustomParser.js"
import { NumberParser, num } from "./NumberParser.js"
import { Shaper } from "./Parser.js"
import { TypeofParser } from "./TypeofParser.js"

const min = -Math.pow(2, 8) + (Math.pow(2, 8) / 2)
const max = Math.pow(2, 8) - (Math.pow(2, 8) / 2) - 1
export const pI8 = redefine(() => boundNum(min, max), "i8")
export const i8 = pI8