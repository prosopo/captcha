import { describe, expect, test, it, expectTypeOf, assertType } from 'vitest'
import { str } from '../parsers/StringParser.js'

describe("parser", () => {
    it("should try to parse successfully", () => {
        str().tryParse("hello").unwrap()
        expect(() => str().tryParse(1).unwrap()).toThrow()
    })

    it("should try to parse unsuccessfully", () => {
        expect(() => str().tryParse(1).unwrap()).toThrow()
        str().tryParse(1).unwrapError()
    })
})