import { bool } from "./BooleanParser.js";
import { num } from "./NumberParser.js";
import { SchemaHandler, obj } from "./ObjectParser.js";
import { opt } from "./OptionalParser.js";
import { IsOptional, IsReadonly, Shape } from "./Parser.js";
import { ro } from "./ReadonlyParser.js";
import { str } from "./StringParser.js";


const a1 = obj({
    a: str(),
    b: num(),
    c: bool(),
    d: obj({
        e: str(),
        f: num(),
        y1: opt(bool()),
        y2: ro(bool()),
        y3: ro(opt(bool())),
    }),
    x1: opt(bool()),
    x2: ro(bool()),
    x3: ro(opt(bool())),
})
type a2 = ReturnType<typeof a1.parse>
const a3 = a1.parse({ a: "a", b: 1, c: true, d: { e: "e", f: 2, y2: true }, x2: true })
console.log(a3)

const b1 = opt(str())
type b2 = IsOptional<typeof b1>
const b3 = str()
type b4 = IsOptional<typeof b3>
const b5 = ro(str())
type b6 = IsOptional<typeof b5>
const b7 = ro(opt(str()))
type b8 = IsOptional<typeof b7>

const c1 = ro(str())
type c2 = IsReadonly<typeof c1>
const c3 = str()
type c4 = IsReadonly<typeof c3>
const c5 = opt(str())
type c6 = IsReadonly<typeof c5>
const c7 = opt(ro(str()))
type c8 = IsReadonly<typeof c7>

const d1 = new SchemaHandler({
    a: str(),
    b: num(),
    c: bool(),
    d: obj({
        e: str(),
        f: num(),
    }),
})
const d2 = d1.pick({
    a: true,
    d: {
        e: true,
    }
})
const d3 = d1.omit({
    a: true,
    d: {
        e: true,
    }
})

const e1 = obj({
    a: str(),
    b: num(),
    c: bool(),
    d: obj({
        e: str(),
        f: num(),
    }),
})
const e2 = e1.pick({
    a: true,
    d: {
        e: true,
    }
})
type e3 = ReturnType<typeof e2.parse>
const e4 = e1.omit({
    a: true,
    d: {
        e: true,
    }
})
type e5 = ReturnType<typeof e4.parse>
const e6 = e1.extend({
    g: bool(),
})
type e7 = ReturnType<typeof e6.parse>