import { boundBi } from "./BoundBigIntParser.js"
import { boundNum } from "./BoundNumberParser.js"
import { redefine } from "./CustomParser.js"
import { NumberParser, num } from "./NumberParser.js"
import { Shaper } from "./Parser.js"
import { TypeofParser } from "./TypeofParser.js"

const max = BigInt(2) ** BigInt(128) - BigInt(1)
export const pU128 = redefine(() => boundBi(0, max), "u128")
export const u128 = pU128