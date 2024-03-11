import { boundNum } from "./BoundNumberParser.js"
import { NumberParser, num } from "./NumberParser.js"
import { Parser } from "./Parser.js"
import { TypeofParser } from "./TypeofParser.js"

const min = -Math.pow(2, 16) + (Math.pow(2, 16) / 2)
const max = Math.pow(2, 16) - (Math.pow(2, 16) / 2) - 1
export const pI16 = () => boundNum(min, max)
export const i16 = pI16