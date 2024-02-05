import { bool } from "./BooleanParser.js";
import { num } from "./NumberParser.js";
import { obj } from "./ObjectParser.js";
import { opt } from "./OptionalParser.js";
import { Shape } from "./Parser.js";
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
const a3 = a1.parse({ a: "a", b: 1, c: true, d: { e: "e", f: 2 } })
console.log(a3)

const b1 = str()
type b2 = ReturnType<typeof b1.parse>
type b3 = Shape<typeof b1>