import { describe, expect, test, it } from 'vitest'


describe("String", () => {
    it("should parse a string", () => {
        expect("hello").toEqual("hello");
    });
});