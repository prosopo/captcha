import { describe, test, it, expect, expectTypeOf } from 'vitest'
import { Brand, brand, brandField, getBrand, unbrand } from '../index.js'

export type IfEquals<X, Y, A = X, B = never> =
  (<T>() => T extends X ? 1 : 2) extends
  (<T>() => T extends Y ? 1 : 2) ? A : B;

describe("brand", () => {
    test("type branding", () => {
        type A = Brand<{
            c: true
        }, 'A'>

        type B = Brand<{
            c: true
        }, 'B'>

        type C<T> = T extends A ? true : false

        type a = C<A>
        type b = C<B>
        
        // expect the types to be true/false appropriately
        const c: b = false
        const d: a = true

        // expect the types to be unequal
        type e = IfEquals<A, B, true, false>
        const f: e = false // expect false
    })

    test('branding classes', () => {
        class A {
            constructor(public x: number) {}
        }

        const ABranded = brand(A, 'A')

        const aBrandedInst = new ABranded(1)

        expectTypeOf(aBrandedInst).toMatchTypeOf<{
            x: number,
        }>()

        expectTypeOf(aBrandedInst).toMatchTypeOf<Brand<A, 'A'>>()
    })

    test('get brand', () => {
        class A {
            constructor(public x: number) {}
        }

        const ABranded = brand(A, 'A')

        const aBrandedInst = new ABranded(1)

        const brand2 = getBrand(aBrandedInst)

        expect(brand2).toBe('A')
        expectTypeOf(brand2).toMatchTypeOf<'A'>()
    })

    test('get brand - no brand', () => {
        class A {
            constructor(public x: number) {}
        }

        const a = new A(1)

        const brand2 = getBrand(a)

        expect(brand2).toBe('')
        expectTypeOf(brand2).toMatchTypeOf<''>()
    })

    test('unbrand', () => {
        class A {
            constructor(public x: number) {}
        }

        const ABranded = brand(A, 'A')

        const aBrandedInst = new ABranded(1)

        const a = unbrand(aBrandedInst)

        expect(getBrand(a)).toBe('')
        expectTypeOf(a).toMatchTypeOf<A>()
    })

    test('branded classes are not equal', () => {
        class A {
            constructor(public x: number) {}
        }

        const ABranded = brand(A, 'A')
        const BBranded = brand(A, 'B')

        const a = new ABranded(1)
        const b = new BBranded(1)
        
        expect(a[brandField]).toBe('A')
        expect(a[brandField]).toBe('B')

        expectTypeOf(a).not.toEqualTypeOf(b)
        type c = IfEquals<typeof a, typeof b, true, false>
        const d: c = false // should not be equal
    })
})

