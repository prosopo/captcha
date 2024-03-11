import { boundNum } from "./BoundNumberParser.js"
import { NumberParser, num } from "./NumberParser.js"
import { Parser } from "./Parser.js"
import { TypeofParser } from "./TypeofParser.js"

const max = BigInt(Math.pow(2, 64) - 1)
export const pU64 = () => boundNum(0, max)
export const u64 = pU64