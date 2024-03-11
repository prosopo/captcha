import { boundBi } from "./BoundBigIntParser.js"
import { boundNum } from "./BoundNumberParser.js"
import { NumberParser, num } from "./NumberParser.js"
import { Parser } from "./Parser.js"
import { TypeofParser } from "./TypeofParser.js"

const max = BigInt(2) ** BigInt(64) - BigInt(1)
export const pU64 = () => boundBi(0, max)
export const u64 = pU64