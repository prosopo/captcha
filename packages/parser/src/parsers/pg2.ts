import { Validator } from "./Parser.js"


class A extends Validator<{
    input: string
    output: number
}> {
    public override validate(value: string): number {
        return parseInt(value)
    }

    public override clone() {
        return new A()
    }

    public override get name(): string {
        return "hello"
    }
}

const b = new A()
type c = ReturnType<typeof b.validate>
type c1 = Parameters<typeof b.validate>
const d = b.validate("123")
type e = typeof b

class A2 extends Validator<{
    output: number
}> {
    public override validate(value: unknown): number {
        return parseInt(String(value))
    }

    public override clone() {
        return new A2()
    }

    public override get name(): string {
        return "hello"
    }
}

const b2 = new A2()
type c2 = ReturnType<typeof b2.validate>
type c3 = Parameters<typeof b2.validate>