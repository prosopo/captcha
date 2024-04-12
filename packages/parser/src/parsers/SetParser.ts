import { inst } from "./InstanceParser.js"
import { Validator, Shape, InferInput, InferOutput } from "./Parser.js"

export class SetParser<T extends Validator<unknown, unknown>> extends Validator<unknown, Set<InferOutput<T>>> {
    constructor(private _parser: T) {
        super()
        this._parser = this.parser // clone parser
    }

    get parser() {
        return this._parser.clone() as T
    }

    public override validate(value: unknown): Set<InferOutput<T>> {
        const valueSet = inst(Set).validate(value)
        const result = new Set<InferOutput<T>>()
        for (const value of valueSet) {
            // validate every value to ensure they are of the correct type
            const validated = this._parser.validate(value) as InferOutput<T>
            result.add(validated)
        }
        return result
    }

    public override clone() {
        return new SetParser<T>(this._parser)
    }

    public override get name(): string {
        return `Set<${this._parser.name}>`
    }
}

export const pSet = <T extends Validator<unknown, unknown>>(parser: T) => new SetParser(parser)
export const set = pSet