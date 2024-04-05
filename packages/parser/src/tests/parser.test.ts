import { describe, expect, test, it, expectTypeOf, assertType } from 'vitest'
import { str } from '../parsers/StringParser.js'
import { run } from '../parsers/utils.js'

describe("parser", () => {
    it("should try to parse successfully", () => {
        const {ok, result} = run(() => str().shape("hello"))
        expect(ok).toBe(true)
        expect(result).toBe("hello")
    })

    it("should try to parse unsuccessfully", () => {
        const {ok, result} = run(() => str().shape(123))
        expect(ok).toBe(false)
        expect(result).toBeInstanceOf(Error)
    })
})