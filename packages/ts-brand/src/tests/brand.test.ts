import { describe, test, it, expect } from 'vitest'
import { Brand } from '../index.js'

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

        
    })
})

// const fn = (a: A) => {
//     console.log('do something with A')
// }

// const obj: B = {
//     x: 1,
//     y: true,
//     z: 'hello'
// }

// fn(obj) 

//     })
// })


// class Dog {
//     constructor(public name: string) {}
// }


// const DogBranded = addBrand(Dog, 'Dog')

// const dog = new DogBranded('Spot') // ok

// export type DogExported = typeof DogBranded
