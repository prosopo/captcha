import { boundNum } from "./BoundNumberParser.js"
import { InstanceParser } from "./InstanceParser.js"
import { NumberParser, num } from "./NumberParser.js"
import { Validator } from "./Parser.js"
import { TypeofParser } from "./TypeofParser.js"
import { Ctor, InferTypeFromCtor } from "./utils.js"

export class U16ArrayParser extends InstanceParser<Ctor<Uint16Array>> {
}

export const pU16Array = () => new U16ArrayParser(Uint16Array)
export const u16Array = pU16Array
export const u16a = pU16Array
export const u16Arr = pU16Array