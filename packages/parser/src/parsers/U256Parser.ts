import { boundNum } from "./BoundNumber.js"
import { NumberParser, num } from "./NumberParser.js"
import { Parser } from "./Parser.js"
import { TypeofParser } from "./TypeofParser.js"

const max = BigInt(Math.pow(2, 256) - 1)
export const pU256 = () => boundNum(0, max)
export const u256 = pU256