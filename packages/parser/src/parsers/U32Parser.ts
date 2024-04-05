import { boundNum } from "./BoundNumberParser.js"
import { redefine } from "./CustomParser.js"
import { NumberParser, num } from "./NumberParser.js"
import { Shaper } from "./Parser.js"
import { TypeofParser } from "./TypeofParser.js"

const max = Math.pow(2, 32) - 1
export const pU32 = redefine(() => boundNum(0, max), "u32")
export const u32 = pU32