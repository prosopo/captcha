import { arr } from "./ArrayParser.js";
import { Pipe, PipeInput, PipeOutput, pipe } from "./PipeValidator.js";
import { Validator } from "./Parser.js";
import { str } from "./StringParser.js";
import { str2num } from "./StringToNumber.js";


const a1 = arr(str())
type a2 = ReturnType<typeof a1.validate>
type a3 = Parameters<typeof a1.validate>

const c1 = [str(), str2num()] as [Validator<string, string>, Validator<string, number>]
type c2 = typeof c1
type c3 = Pipe<c2>
type c4 = PipeInput<c2>
type c5 = PipeOutput<c2>
const b1 = pipe(c1)
type b2 = ReturnType<typeof b1.validate>
type b3 = Parameters<typeof b1.validate>[0]


type a = [Validator<string, number>, Validator<number, boolean>, Validator<boolean, bigint>]
type b = Pipe<a>
type c = [Validator<string, number>, Validator<number, boolean>, Validator<boolean, bigint>, Validator<bigint, string>, Validator<string, number>]
type d = Pipe<c>
type e = Pipe<[]>
type f = Pipe<[Validator<string, number>]>
type g = PipeInput<a>
type h = PipeOutput<a>
type i = PipeInput<c>
type j = PipeOutput<c>
type k = PipeInput<[]>
type l = PipeOutput<[]>
type m = PipeInput<[Validator<string, number>]>
type n = PipeOutput<[Validator<string, number>]> 
type o = [Validator<string, string>, Validator<string, number>]
type p = Pipe<o>