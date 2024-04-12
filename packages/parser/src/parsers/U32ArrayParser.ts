import { boundNum } from "./BoundNumberParser.js"
import { InstanceParser } from "./InstanceParser.js"
import { NumberParser, num } from "./NumberParser.js"
import { Validator } from "./Parser.js"
import { TypeofParser } from "./TypeofParser.js"
import { Ctor, InferTypeFromCtor } from "./utils.js"

export class U32ArrayParser extends InstanceParser<Ctor<Uint32Array>> {
    
    constructor() {
        super(Uint32Array)
    }

    public override get name(): string {
        return "u32[]"
    }
}

export const pU32Array = () => new U32ArrayParser()
export const u32Array = pU32Array
export const u32a = pU32Array
export const u32Arr = pU32Array