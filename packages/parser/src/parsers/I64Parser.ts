import { boundBi } from "./BoundBigIntParser.js"
import { boundNum } from "./BoundNumberParser.js"
import { NumberParser, num } from "./NumberParser.js"
import { Parser } from "./Parser.js"
import { TypeofParser } from "./TypeofParser.js"

const min = BigInt(-Math.pow(2, 64)) + BigInt(Math.pow(2, 64) / 2)
const max = BigInt(Math.pow(2, 64)) - BigInt(Math.pow(2, 64) / 2) - 1n
export const pI64 = () => boundBi(min, max)
export const i64 = pI64