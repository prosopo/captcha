import { boundNum } from "./BoundNumberParser.js"
import { redefine } from "./CustomParser.js"
import { NumberParser, num } from "./NumberParser.js"
import { Validator } from "./Parser.js"
import { TypeofParser } from "./TypeofParser.js"

const min = -Math.pow(2, 32) + (Math.pow(2, 32) / 2)
const max = Math.pow(2, 32) - (Math.pow(2, 32) / 2) - 1
export const pI32 = redefine(() => boundNum(min, max), "i32")
export const i32 = pI32