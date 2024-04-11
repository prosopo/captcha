import { ValidatorConfig, Validator } from "./Parser.js";


class B1 {

}

class B2 extends B1 {

}

class A1<T extends {
    input: unknown
    output: B1
}> extends Validator<T> {
    public override validate(value: T["input"]): T["output"] {
        return null!
    }

    public override clone(): Validator<T> {
        return null!
    }

    public override get name(): string {
        return null!
    }
}

class A2 extends A1<{
    input: unknown,
    output: B2
}> {
    public override validate(value: unknown): B2 {
        return null!
    }
}

const c = new A2()
type d = ReturnType<typeof c.validate>