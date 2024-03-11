import { boundNum } from "./BoundNumberParser.js"
import { NumberParser, num } from "./NumberParser.js"
import { Parser } from "./Parser.js"
import { TypeofParser } from "./TypeofParser.js"

const min = -Math.pow(2, 32) + (Math.pow(2, 32) / 2)
const max = Math.pow(2, 32) - (Math.pow(2, 32) / 2)
export const pI32 = () => boundNum(min, max)
export const i32 = pI32