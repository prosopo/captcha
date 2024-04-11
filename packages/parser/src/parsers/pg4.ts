import { A } from "vitest/dist/reporters-P7C2ytIv.js";
import { arr } from "./ArrayParser.js";
import { Validator, ValidatorConfig } from "./Parser.js";
import { str } from "./StringParser.js";


const a1 = arr(str());
type a2 = ReturnType<typeof a1.validate>
type a3 = Parameters<typeof a1.validate>
type a7 = typeof a1
type a8 = a7 extends Validator<infer T> ? T : never
type a9 = a8 extends ValidatorConfig<infer I, infer O> ? I : never
const a4 = str()
type a5 = ReturnType<typeof a4.validate>
type a6 = Parameters<typeof a4.validate>

type Config<T> = {
    output: T
}

type InferConfig<T> = T extends A<infer U> ? U extends Config<infer V> ? V : never : never

abstract class A<T extends Config<any>> {
    abstract validate(value: unknown): T["output"]
}

class B extends A<{
    output: string
}> {
    validate(value: unknown): string {
        return "hello"
    }
}

class C<T extends A<any>> extends A<{
    output: InferConfig<T>
}> {
    constructor(private _parser: T) {
        super()
    }

    validate(value: unknown): InferConfig<T> {
        return null!
    }
}

const d1 = new B()
const d2 = new C<B>(d1)
type d3 = ReturnType<typeof d2.validate>
type d4 = Parameters<typeof d2.validate>
