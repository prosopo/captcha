# Brand your TypeScript types!

See our [tutorial](https://prosopo.io/articles/typescript-branding/) for more info on what branding is and why you'd want to use it.

## Nominal types example
```ts
type A = {
    x: number,
    y: boolean,
    z: string,
}

type B = {
    x: number,
    y: boolean,
    z: string,
}
```
Type `A` and `B` are equal in the eyes of TypeScript.
```ts

const fn = (a: A) => {
    console.log('do something with A')
}

const obj: B = {
    x: 1,
    y: true,
    z: 'hello'
}

fn(obj) // absolutely fine, even though fn accepts types of A and obj is of type B!
```

Let's brand `A`
```ts

type ABranded = Brand<A, 'A'> // {
//     x: number;
//     y: boolean;
//     z: string;
// } & {
//     [brandKey]: "A";
// }

```

```ts

const fn = (a: ABranded) => {
    console.log('do something with A')
}

const obj: B = {
    x: 1,
    y: true,
    z: 'hello'
}

fn(obj) // Now this doesn't work, cannot accept any type other than ABranded!
```

Now the function only accepts a set type.

## Mapped type example
Using `ABranded` from before, we can do conditional typing.

```ts

type IsA<T> = T extends ABranded ? true : false

type x = IsA<ABranded> // true
type y = IsA<B> // false

```
Obviously this is a simple example, but branding enables conditional typing. This would be impossible using regular types in TypeScript, because type `B` is seen as equal to type `A`. [Read our blog post for a more detailed explanation](https://prosopo.io/articles/typescript-mapped-type-magic/).

## Classes & Instances
You can brand instances of a class or the class itself (which will produce branded instances).
```ts
class Dog {
    constructor(public name: string) {}
}

const DogBranded = brandClass(Dog, 'Dog') // adds the 'Dog' brand, making a new type

const dog = new DogBranded('Spot') // ok, of type DogBranded
```
Conditional typing can now be done using classes.

Or to brand an instance:
```ts
const dogBranded = brand(new Dog(), 'Dog') of type Dog & { [brandKey]: 'Dog' }
```

## Unbranding
Simply do the inverse to get back to the original type.
```ts

const DogUnbranded = unbrandClass(DogBranded) // same as the Dog class

const dog = new DogUnbranded('Spot') // ok, of type Dog

```
Or to unbrand an instance:
```ts
const dogUnbranded = unbrand(dog) // of type Dog
```

## Get brand
Given a unknown branded value
```ts
const b = getBrand(dog) // b is 'Dog'
```

No brand set:
```ts
const b = getBrand(someValue) // b is '' - i.e. no brand
```
