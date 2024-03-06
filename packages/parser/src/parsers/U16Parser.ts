import { boundNum } from "./BoundNumber.js"
import { NumberParser, num } from "./NumberParser.js"
import { Parser } from "./Parser.js"
import { TypeofParser } from "./TypeofParser.js"

const max = Math.pow(2, 16) - 1
export const pU16 = () => boundNum(0, max)
export const u16 = pU16