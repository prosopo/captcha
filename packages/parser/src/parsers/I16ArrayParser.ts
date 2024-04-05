import { boundNum } from "./BoundNumberParser.js"
import { InstanceParser } from "./InstanceParser.js"
import { NumberParser, num } from "./NumberParser.js"
import { Validator } from "./Parser.js"
import { TypeofParser } from "./TypeofParser.js"
import { Ctor, InferTypeFromCtor } from "./utils.js"

export class I16ArrayParser extends InstanceParser<Ctor<Int16Array>> {

    public override get name(): string {
        return "i16[]"
    }
}

export const pI16Array = () => new I16ArrayParser(Int16Array)
export const i16Array = pI16Array
export const i16a = pI16Array
export const i16Arr = pI16Array