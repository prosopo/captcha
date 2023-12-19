import { ArrayParser } from "./parsers/ArrayParser.js"
import { BooleanParser } from "./parsers/BooleanParser.js"
import { EnumParser, EnumVariant } from "./parsers/EnumParser.js"
import { EnumParser2 } from "./parsers/EnumParser2.js"
import { NativeEnumParser } from "./parsers/NativeEnumParser.js"
import { NumberParser } from "./parsers/NumberParser.js"
import { ObjectParser } from "./parsers/ObjectParser.js"
import { Parseable } from "./parsers/Parseable.js"
import { Parser } from "./parsers/Parser.js"
import { StringParser } from "./parsers/StringParser.js"
import { ParserArrayToShape, UnionParser } from "./parsers/UnionParser.js"


const p = {
    string() {
        return new StringParser()
    },
    number() {
        return new NumberParser()
    },
    boolean() {
        return new BooleanParser()
    },
    object<T extends {}>(schema: Parseable<T>) {
        return new ObjectParser<T>(schema)
    },
    array<T>(schema: Parser<T>) {
        return new ArrayParser<T>(schema)
    },
    enum<U extends EnumVariant, T extends Readonly<U[]>>(values: T) {
        return new EnumParser<U, T>(values)
    },
    enum2<const U extends number | string | symbol, const T extends readonly U[]>(values: T) {
        return new EnumParser2<U, T>(values)
    },
    union<T extends ReadonlyArray<Parser<unknown>>, U extends ParserArrayToShape<T>>(arr: T) {
        return new UnionParser<T, U>(arr)
    },
}

enum Abcdef {
    a = 'a',
    b = 'b',
    c = 'c',
    d = 3,
    e = 4,
    f = 5,
}
type q27 = typeof Abcdef
type q28 = typeof Abcdef.a
const q29 = new NativeEnumParser(Abcdef)

const z1 = p.enum(['a', 'b', 'c'])
const z3 = new EnumParser<'a' | 'b' | 'c', ['a' | 'b' | 'c', ...('a' | 'b' | 'c')[]]>(['a', 'b', 'c'])
// const z3 = new EnumParser<'a'|'b'|'c',[('a'|'b'|'c'), ...('a'|'b'|'c')[]]>(['a', 'b', 'c'])
const z2 = z1.parse('a')
const z4 = z3.parse('a')

const x2Schema = p.object({
    a: p.string(),
    b: p.number(),
    c: p.boolean(),
    d: p.object({
        e: p.string(),
        f: p.number(),
        g: p.boolean(),
    }),
    h: p.array(p.string()),
    i: p.array(p.number()),
    j: p.array(p.boolean()),
    k: p.array(
        p.object({
            l: p.string(),
            m: p.number(),
            n: p.boolean(),
        })
    ),
    o: p.enum(['a', 'b', 'c']),
})

const x2 = x2Schema.parse({
    a: 'hello',
    b: 1,
    c: true,
    d: {
        e: 'goodbye',
        f: 2,
        g: false,
    },
})

console.log('x2', x2)
