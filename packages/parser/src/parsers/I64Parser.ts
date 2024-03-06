import { boundNum } from "./BoundNumber.js"
import { NumberParser, num } from "./NumberParser.js"
import { Parser } from "./Parser.js"
import { TypeofParser } from "./TypeofParser.js"

const min = BigInt(-Math.pow(2, 64)) + BigInt(Math.pow(2, 64) / 2)
const max = BigInt(Math.pow(2, 64)) - BigInt(Math.pow(2, 64) / 2)
export const pI64 = () => boundNum(min, max)
export const i64 = pI64