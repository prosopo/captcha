import { boundNum } from "./BoundNumberParser.js"
import { InstanceParser } from "./InstanceParser.js"
import { NumberParser, num } from "./NumberParser.js"
import { Shaper } from "./Parser.js"
import { TypeofParser } from "./TypeofParser.js"
import { Ctor, InferTypeFromCtor } from "./utils.js"

export class U8ArrayParser extends InstanceParser<Ctor<Uint8Array>> {
}

export const pU8Array = () => new U8ArrayParser(Uint8Array)
export const u8Array = pU8Array
export const u8a = pU8Array
export const u8Arr = pU8Array