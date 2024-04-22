export type Ctor<T> = new (...args: any[]) => T
// resolve intersection types
export type Resolve<T> = T extends Function ? T : { [K in keyof T]: T[K] };

export const brandField = Symbol('brand')

export type Brand<T, U> = Resolve<T & {
    [brandField]: U
}>

export type Unbrand<T> = T extends Brand<infer U, any> ? U : never

export const brand = <T, const U>(ctor: Ctor<T>, name: U) => {
    return ctor as Ctor<Brand<T, typeof name>>
}

export const unbrand = <T>(value: T) => {
    return value as Unbrand<T>
}

export const getBrand = <T>(value: T) => {
    return (value as any)[brandField] || ''
}