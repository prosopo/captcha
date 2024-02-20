import { Parser } from "./Parser.js"
import { TypeofParser } from "./TypeofParser.js"

export class SymbolParser extends TypeofParser<Symbol, "symbol"> {
    constructor() {
        super("symbol")
    }

    public override clone() {
        return new SymbolParser()
    }
}

export const pSymbol = () => new SymbolParser()
export const sym = pSymbol