// import { C } from "vitest/dist/reporters-P7C2ytIv.js"
// import { InstanceParser } from "./InstanceParser.js"
// import { Validator, ValidatorConfig } from "./Parser.js"
// import { Ctor } from "./utils.js"

// export class DefaultParser<Config extends ValidatorConfig> extends Validator<Config> {
//     constructor(private _parser: Validator<Config>, public defaultFn: () => Config["output"]) {
//         super()
//         this._parser = this._parser.clone()
//     }

//     get parser() {
//         return this._parser.clone()
//     }

//     public override validate(value: unknown): Config["output"] {
//         // call fn to get default value if value is missing
//         if (value === undefined) {
//             return this.defaultFn()
//         }
//         return this._parser.validate(value)
//     }

//     public override clone() {
//         return new DefaultParser<Config>(this.parser, this.defaultFn)
//     }

//     public override get name(): string {
//         return `${this.parser.name} = ${this.defaultFn()}`
//     }
// }

// export const pDefault = <Config extends ValidatorConfig>(parser: Validator<Config>, defaultFn: () => Config["output"]) => new DefaultParser<Config>(parser, defaultFn)
// export const def = pDefault
// export const defaultTo = pDefault
// export const defaulted = pDefault