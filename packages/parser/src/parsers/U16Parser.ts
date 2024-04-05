import { boundNum } from "./BoundNumberParser.js"
import { redefine } from "./CustomParser.js"
import { NumberParser, num } from "./NumberParser.js"
import { Validator } from "./Parser.js"
import { TypeofParser } from "./TypeofParser.js"

const max = Math.pow(2, 16) - 1
export const pU16 = redefine(() => boundNum(0, max), "u16")
export const u16 = pU16