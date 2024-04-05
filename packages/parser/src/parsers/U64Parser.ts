import { boundBi } from "./BoundBigIntParser.js"
import { boundNum } from "./BoundNumberParser.js"
import { redefine } from "./CustomParser.js"
import { NumberParser, num } from "./NumberParser.js"
import { Validator } from "./Parser.js"
import { TypeofParser } from "./TypeofParser.js"

const max = BigInt(2) ** BigInt(64) - BigInt(1)
export const pU64 = redefine(() => boundBi(0, max), "u64")
export const u64 = pU64