import { boundNum } from "./BoundNumberParser.js"
import { InstanceParser } from "./InstanceParser.js"
import { NumberParser, num } from "./NumberParser.js"
import { Validator } from "./Parser.js"
import { TypeofParser } from "./TypeofParser.js"
import { Ctor, InferTypeFromCtor } from "./utils.js"

export class I32ArrayParser extends InstanceParser<Ctor<Int32Array>> {

    public override get name(): string {
        return "i32[]"
    }
}

export const pI32Array = () => new I32ArrayParser(Int32Array)
export const i32Array = pI32Array
export const i32a = pI32Array
export const i32Arr = pI32Array