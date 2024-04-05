import { boundBi } from "./BoundBigIntParser.js"
import { boundNum } from "./BoundNumberParser.js"
import { redefine } from "./CustomParser.js"
import { NumberParser, num } from "./NumberParser.js"
import { Shaper } from "./Parser.js"
import { TypeofParser } from "./TypeofParser.js"

const max = BigInt(2) ** BigInt(256) - BigInt(1)
export const pU256 = redefine(() => boundBi(0, max), "u256")
export const u256 = pU256