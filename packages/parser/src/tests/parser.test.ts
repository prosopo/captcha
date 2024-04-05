import { describe, expect, test, it, expectTypeOf, assertType } from 'vitest'
import { str } from '../parsers/StringParser.js'

describe("parser", () => {
    it("should try to parse successfully", () => {
        const [ok, result] = str().isShape("hello")
        expect(ok).toBe(true)
        expect(result).toBe("hello")
    })

    it("should try to parse unsuccessfully", () => {
        const [ok, result] = str().isShape(123)
        expect(ok).toBe(false)
        expect(result).toBeInstanceOf(Error)
    })
})