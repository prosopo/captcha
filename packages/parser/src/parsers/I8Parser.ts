import { betweenNum } from "./BetweenNumber.js"
import { num } from "./NumberParser.js"
import { ValidateOptions, Validator } from "./Parser.js"
import { PipeValidator, pipe } from "./PipeValidator.js"
import { unknown } from "./UnknownParser.js"


export class I8Validator extends Validator<unknown, number> {
    public override validate(value: unknown, options?: ValidateOptions | undefined): number {
        return pipe([
            num(),
            betweenNum({
                min: -(2**8) + (2**8 / 2),
                max: 2**8 - (2**8 / 2) - 1,
            })
        ], this.name).validate(value, options)
    }

    public override clone() {
        return new I8Validator()
    }

    public override get name(): string {
        return `i8`
    }
}

export const pI8 = () => new I8Validator()
export const i8 = pI8

// export const pI8 = () => {
//     const pipeline = [
//         num(),
//         betweenNum({
//             min: -Math.pow(2, 8) + (Math.pow(2, 8) / 2),
//             max: Math.pow(2, 8) - (Math.pow(2, 8) / 2) - 1,
//         })
//     ] as const
//     type t1 = typeof pipeline
//     type t2 = () => t1
//     const a = pipe(pipeline, `i8`)
//     // class I8Validator extends PipeValidator<typeof pipeline> {
//     //     constructor() {
//     //         super(pipeline, `i8`)
//     //     }
//     // }    
//     // return new I8Validator()
// }
// export const i8 = pI8

// const fn = () => pipe([
//     num(),
//     betweenNum({
//         min: -Math.pow(2, 8) + (Math.pow(2, 8) / 2),
//         max: Math.pow(2, 8) - (Math.pow(2, 8) / 2) - 1,
//     })
// ], `i8`)
// export type I8Validator = ReturnType<typeof fn>
// const fn2: () => I8Validator = fn

// export const pI8: () => I8Validator = fn2
// export const i8: () => I8Validator = pI8
