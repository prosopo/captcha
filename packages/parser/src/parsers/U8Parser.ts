import { boundNum } from "./BoundNumber.js"
import { NumberParser, num } from "./NumberParser.js"
import { Parser } from "./Parser.js"
import { TypeofParser } from "./TypeofParser.js"

const max = Math.pow(2, 8) - 1
export const pU8 = () => boundNum(0, max)
export const u8 = pU8