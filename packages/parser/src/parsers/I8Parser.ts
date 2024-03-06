import { boundNum } from "./BoundNumber.js"
import { NumberParser, num } from "./NumberParser.js"
import { Parser } from "./Parser.js"
import { TypeofParser } from "./TypeofParser.js"

const min = -Math.pow(2, 8) + (Math.pow(2, 8) / 2)
const max = Math.pow(2, 8) - (Math.pow(2, 8) / 2)
export const pI8 = () => boundNum(min, max)
export const i8 = pI8