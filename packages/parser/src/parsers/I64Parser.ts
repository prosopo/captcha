import { boundBi } from "./BoundBigIntParser.js"
import { boundNum } from "./BoundNumberParser.js"
import { redefine } from "./CustomParser.js"
import { NumberParser, num } from "./NumberParser.js"
import { Shaper } from "./Parser.js"
import { TypeofParser } from "./TypeofParser.js"

const min = BigInt(-Math.pow(2, 64)) + BigInt(Math.pow(2, 64) / 2)
const max = BigInt(Math.pow(2, 64)) - BigInt(Math.pow(2, 64) / 2) - 1n
export const pI64 = redefine(() => boundBi(min, max), "i64")
export const i64 = pI64