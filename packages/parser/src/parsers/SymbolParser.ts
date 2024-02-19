import { Parser } from "./Parser.js"

export class SymbolParser extends Parser<Symbol> {
    public override parse(value: unknown): Symbol {
        if (typeof value !== "symbol") {
            throw new Error(`Expected Symbol but got ${JSON.stringify(value)} of type ${JSON.stringify(typeof value)}`)
        }
        return value
    }

    public override clone() {
        return new SymbolParser()
    }
}

export const pSymbol = () => new SymbolParser()
export const sym = pSymbol