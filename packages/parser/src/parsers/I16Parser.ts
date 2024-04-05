import { boundNum } from "./BoundNumberParser.js"
import { redefine } from "./CustomParser.js"
import { NumberParser, num } from "./NumberParser.js"
import { Shaper } from "./Parser.js"
import { TypeofParser } from "./TypeofParser.js"

const min = -Math.pow(2, 16) + (Math.pow(2, 16) / 2)
const max = Math.pow(2, 16) - (Math.pow(2, 16) / 2) - 1
export const pI16 = redefine(() => boundNum(min, max), "i16")
export const i16 = pI16