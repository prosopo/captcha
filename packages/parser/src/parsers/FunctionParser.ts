import { InferOutput, ValidateOptions, Validator } from "./Parser.js"

// // enables parsing at function entry and exit points. I.e. validate the args of a fn and/or the return value of a fn
// export class FunctionParser<T extends Validator<any>[], U> {

//     // if there are no args / you do not want to parse the args, then set args to null
//     // if there is no return value / you do not want to parse the return value, then set returnType to null
//     // both default to null, representing () => void
//     constructor(readonly args: T | null = null, readonly returnType: Validator<U> | null = null) {

//     }


// }

// type UnpackParserArray<T> = T extends [Validator<infer A>, ...infer B] ? [A, ...UnpackParserArray<B>] : []
// type UnpackReturnType<T> = T extends Validator<infer U> ? U : never
// type ToFn<T extends Validator<any>[], U = void> = (...args: UnpackParserArray<T>) => U

// type a1 = ToFn<[Validator<string>, Validator<number>]>
// type a2 = ToFn<[], string>

// export const pFunction = <T, U>() => new FunctionParser<T, U>()
// export const fn = pFunction

// TODO finish this off

export type Args<T> = T extends [] ? [] : T extends [Validator<infer I, unknown>] ? [I] : T extends [Validator<infer I, unknown>, ...infer R] ? [I, ...Args<R>] : never
type a = Args<[Validator<string, unknown>, Validator<number, unknown>]>
type b = Args<[]>
type c = Args<[Validator<string, unknown>]>
type d = Args<[Validator<string, unknown>, Validator<number, unknown>, Validator<boolean, unknown>]>
export type Return<T> = InferOutput<T>
export type Fn<I, O> = Args<I> extends [] ? (...args: Args<I>) => Return<O> : never

export class FunctionValidator<const I extends Validator<unknown, unknown>[], O extends Validator<unknown, unknown>> extends Validator<unknown, Fn<I, O>> {
    constructor(private _args: I, private _returnType: O) {
        super()
        this._args = this.args // defensive clone
    }

    get args() {
        return this._args.map(v => v.clone()) as I
    }

    get returnType() {
        return this._returnType.clone()
    }

    public override validate(value: unknown, options?: ValidateOptions): Fn<I, O> {
        return ((...args: unknown[]) => {
            if (args.length !== this.args.length) {
                throw new Error(`Expected ${this.args.length} arguments, got ${args.length}`)
            }
            for (let i = 0; i < args.length; i++) {
                const validator = this.args[i]
                if (validator === undefined) {
                    throw new Error(`this should never happen`)
                }
                args[i] = validator.validate(args[i], options)
            }
            return this.returnType.validate(value, options)
        }) as unknown as Fn<I, O>
    }

    public override clone() {
        return new FunctionValidator(this.args, this.returnType)
    }

    public override get name(): string {
        return `(${this.args.map(v => v.name).join(", ")}) => ${this.returnType.name}`
    }
}

export const pFunction = <const I extends Validator<unknown, unknown>[], O extends Validator<unknown, unknown>>(args: I, returnType: O) => new FunctionValidator<I, O>(args, returnType)