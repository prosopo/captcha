import { boundNum } from "./BoundNumberParser.js"
import { NumberParser, num } from "./NumberParser.js"
import { Parser } from "./Parser.js"
import { TypeofParser } from "./TypeofParser.js"

const min = BigInt(-Math.pow(2, 128)) + BigInt(Math.pow(2, 128) / 2)
const max = BigInt(Math.pow(2, 128)) - BigInt(Math.pow(2, 128) / 2)
export const pI128 = () => boundNum(min, max)
export const i128 = pI128