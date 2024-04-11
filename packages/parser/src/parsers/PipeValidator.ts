import { InferInput, InferOutput, Validator } from "./Parser.js";
import { First, Last } from "./utils.js";

export type Pipe<T> = T extends [] ? never : T extends readonly [Validator<unknown, unknown>] ? T : T extends readonly [Validator<unknown, infer O>, ...infer R] ? (R extends readonly [Validator<infer I, unknown>] ? (O extends I ? T : never) : (Pipe<R> extends never ? never : T)) : never
export type PipeInput<T> = InferInput<First<Pipe<T>>>
export type PipeOutput<T> = InferOutput<Last<Pipe<T>>>

export class PipeValidator<const T extends readonly Validator<any, any>[]> extends Validator<PipeInput<T>, PipeOutput<T>> {
    constructor(private _validators: T, private _name?: string) {
        super()
        this._validators = this.validators
    }

    get validators() {
        return this._validators.map(v => v.clone()) as unknown as T
    }

    public override validate(value: PipeInput<T>): PipeOutput<T> {
        let result = value as any
        // validate in turn
        for (const validator of this.validators) {
            result = validator.validate(result)
        }
        return result
    }

    public override clone() {
        return new PipeValidator(this._validators)
    }

    public override get name(): string {
        return this._name ?? this.validators.map(v => v.name).join(" -> ")
    }
}

export const pPipe = <const T extends readonly Validator<any, any>[]>(validators: T, name?: string) => new PipeValidator<T>(validators, name)
export const pipe = pPipe
