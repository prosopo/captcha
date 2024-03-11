import { boundNum } from "./BoundNumberParser.js"
import { NumberParser, num } from "./NumberParser.js"
import { Parser } from "./Parser.js"
import { TypeofParser } from "./TypeofParser.js"

const max = BigInt(Math.pow(2, 128) - 1)
export const pU128 = () => boundNum(0, max)
export const u128 = pU128