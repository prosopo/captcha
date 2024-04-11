import { arr } from "./ArrayParser.js";
import { str } from "./StringParser.js";


const a1 = arr(str())
type a2 = ReturnType<typeof a1.validate>
type a3 = Parameters<typeof a1.validate>