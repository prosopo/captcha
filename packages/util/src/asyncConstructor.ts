export type Constructor<T> = new (...args: any[]) => T

// Construct a new instance of a class by calling its constructor and then calling its async constructor method.
// The asyncConstructor() method takes the same parameters as the constructor to avoid having to hold temporary values between constructor and asyncConstructor invocation.
export async function anew<
    T extends {
        // Asynchronously initialise an object
        ctor(...args: ConstructorParameters<Constructor<T>>): Promise<void>
    },
>(Clas: Constructor<T>, ...args: ConstructorParameters<Constructor<T>>) {
    // construct instance via normal constructor (non-async)
    const inst = new Clas(...args)
    // call async constructor with the same args as the normal ctor
    await inst.ctor(...args)
    return inst
}
