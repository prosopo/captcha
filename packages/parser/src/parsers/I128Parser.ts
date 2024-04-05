import { boundBi } from "./BoundBigIntParser.js"
import { boundNum } from "./BoundNumberParser.js"
import { redefine } from "./CustomParser.js"
import { NumberParser, num } from "./NumberParser.js"
import { Shaper } from "./Parser.js"
import { TypeofParser } from "./TypeofParser.js"

const min = BigInt(-Math.pow(2, 128)) + BigInt(Math.pow(2, 128) / 2)
const max = BigInt(Math.pow(2, 128)) - BigInt(Math.pow(2, 128) / 2) - 1n
export const pI128 = redefine(() => boundBi(min, max), "i128")
export const i128 = pI128