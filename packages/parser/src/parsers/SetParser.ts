import { inst } from "./InstanceParser.js"
import { Validator, Shape } from "./Parser.js"

export class SetParser<T extends Validator<any>> extends Validator<Set<Shape<T>>> {
    constructor(private _parser: T) {
        super()
        this._parser = this.parser // clone parser
    }

    get parser() {
        return this._parser.clone() as T
    }

    public override shape(value: unknown): Set<Shape<T>> {
        const valueSet = inst(Set).shape(value)
        const result = new Set<Shape<T>>()
        for (const value of valueSet) {
            // parse every value to ensure they are of the correct type
            result.add(this._parser.shape(value))
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

export const pSet = <T extends Validator<any>>(parser: T) => new SetParser(parser)
export const set = pSet