import { boundNum } from "./BoundNumberParser.js"
import { InstanceParser } from "./InstanceParser.js"
import { NumberParser, num } from "./NumberParser.js"
import { Validator } from "./Parser.js"
import { TypeofParser } from "./TypeofParser.js"
import { Ctor, InferTypeFromCtor } from "./utils.js"

export class U8ArrayParser extends InstanceParser<Ctor<Uint8Array>> {
    
    constructor() {
        super(Uint8Array)
    }

    public override get name(): string {
        return "u8[]"
    }
}

export const pU8Array = () => new U8ArrayParser()
export const u8Array = pU8Array
export const u8a = pU8Array
export const u8Arr = pU8Array