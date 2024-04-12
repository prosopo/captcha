import { BigIntParser } from "./BigIntParser.js"
import { bool } from "./BooleanParser.js"
import { NeverParser } from "./NeverParser.js"
import { NumberParser, num } from "./NumberParser.js"
import { InferOutput, ValidateOptions, Validator } from "./Parser.js"
import { StringParser, str } from "./StringParser.js"

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

export type Args<T> = T extends readonly [] ? [] : T extends readonly [infer U] ? [InferOutput<U>] : T extends readonly [infer U, ...infer R] ? [InferOutput<U>, ...Args<R>] : never
const x1 = [str(), bool(), num()] as const
type x2 = typeof x1
type x3 = Args<x2>
export type Return<T> = InferOutput<T>
export type Fn<I, O, V> = InferOutput<V> extends never ? (...args: Args<I>) => Return<O> : (...args: [...Args<I>, ...InferOutput<V>[]]) => Return<O>
type y1 = Fn<x2, StringParser, BigIntParser>
type y2 = Fn<x2, StringParser, undefined>
type y3 = InferOutput<undefined>
type y4 = InferOutput<BigIntParser>
type y5 = bigint extends never ? 1 : 2

export class FunctionValidator<const I extends Validator<unknown, unknown>[], O extends Validator<unknown, unknown>, V extends Validator<unknown, unknown> | undefined> extends Validator<unknown, Fn<I, O, V>> {
    constructor(private _args: I, private _returnType: O, private _varargs?: V) {
        super()
        this._args = this.args // defensive clone
        // TODO fix
        // this._returnType = this.returnType.clone() // defensive clone
        // this._varargs = this.varargs.clone() // defensive clone
    }

    get args(): I {
        return this._args.map(v => v.clone()) as I
    }

    get returnType(): O {
        return this._returnType.clone() as O
    }

    get varargs() {
        if (this._varargs === undefined) {
            return undefined
        }
        return this._varargs.clone() as V
    }

    public override validate(value: unknown, options?: ValidateOptions): Fn<I, O, V> {
        return ((...args: unknown[]) => {
            if (this._varargs === undefined) {
                // no varargs, so expect exact number of args
                if (args.length !== this.args.length) {
                    throw new Error(`Expected ${this.args.length} arguments, got ${args.length}`)
                }
            }
            // first n args are required
            for (let i = 0; i < this._args.length; i++) {
                const validator = this.args[i]
                if (validator === undefined) {
                    throw new Error(`this should never happen`)
                }
                args[i] = validator.validate(args[i], options)
            }
            // varargs are optional
            if (this._varargs !== undefined) {
                for (let i = this.args.length; i < args.length; i++) {
                    if (this._varargs === undefined) {
                        throw new Error(`this should never happen`)   
                    }
                    args[i] = this._varargs.validate(args[i], options)
                }
            }
            return this.returnType.validate(value, options)
        }) as unknown as Fn<I, O, V>
    }

    public override clone() {
        return new FunctionValidator(this.args, this.returnType, this.varargs)
    }

    public override get name(): string {
        const varargsStr = this._varargs === undefined ? "" : `, ...${this._varargs.name}`
        return `(${this.args.map(v => v.name).join(", ")}${varargsStr}) => ${this.returnType.name}`
    }
}

export const fn = <const I extends Validator<unknown, unknown>[], O extends Validator<unknown, unknown>, V extends Validator<unknown, unknown> | undefined>(args: I, returnType: O, varargs?: V) => new FunctionValidator<I, O, V>(args, returnType, varargs)

const a1 = fn([str(), num(), bool()], str())
type a2 = ReturnType<typeof a1.validate>
const a3 = fn([str(), num(), bool()], str(), str())
type a4 = ReturnType<typeof a3.validate>
const a5 = fn([], str())
type a6 = ReturnType<typeof a5.validate>
const a7 = fn([], str(), bool())
type a8 = ReturnType<typeof a7.validate>
const a8 = a3.validate(null)(`hello`, 1, true, 'a', 'b', 'c')