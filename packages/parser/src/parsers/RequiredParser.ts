// import { BaseParser, ParseOptions, Parser } from "./Parser.js"

// class RequiredParser<T> extends BaseParser<Required<T>> {
//     constructor(private parser: Parser<T>) {
//         super()
//     }

//     override _parse(value: unknown, options?: ParseOptions): Required<T> {
//         // TODO enforce fields being present, i.e. opposite of extra keys
//         const parsed = this.parser.parse(value, options) as Required<T>
//         this.validate(parsed)
//         return parsed
//     }

//     override validate(value: Required<T>): void {
//         super.validate(value)
//         this.parser.validate(value)
//     }
// }

// export const pRequired = <T>(parser: Parser<T>): Parser<Required<T>> => new RequiredParser(parser)