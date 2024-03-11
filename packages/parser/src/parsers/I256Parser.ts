import { boundBi } from "./BoundBigIntParser.js"
import { boundNum } from "./BoundNumberParser.js"
import { NumberParser, num } from "./NumberParser.js"
import { Parser } from "./Parser.js"
import { TypeofParser } from "./TypeofParser.js"

const min = BigInt(-Math.pow(2, 256)) + BigInt(Math.pow(2, 256) / 2)
const max = BigInt(Math.pow(2, 256)) - BigInt(Math.pow(2, 256) / 2)
export const pI256 = () => boundBi(min, max)
export const i256 = pI256