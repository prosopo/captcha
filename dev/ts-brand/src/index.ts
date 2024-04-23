export type Ctor<T> = new (...args: any[]) => T
// resolve intersection types
// eslint-disable-next-line
export type Resolve<T> = T extends Function ? T : { [K in keyof T]: T[K] }

export const brandKey = Symbol('brand')

export type Brand<T, U> = Resolve<
    T & {
        [brandKey]: U
    }
>

export type Unbrand<T> = T extends Brand<infer U, any> ? U : T

export const brandClass = <T, const U>(ctor: Ctor<T>, name: U) => {
    return ctor as Ctor<Brand<T, typeof name>>
}

export const unbrandClass = <T>(ctor: Ctor<T>) => {
    return ctor as Ctor<Unbrand<T>>
}

export const brand = <T, const U>(value: T, name: U) => {
    return value as Brand<T, typeof name>
}

export const unbrand = <T>(value: T) => {
    return value as Unbrand<T>
}

export const getBrand = <T>(value: T) => {
    return (value as any)[brandKey] || ''
}
