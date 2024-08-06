// Copyright 2021-2024 Prosopo (UK) Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// biome-ignore lint/suspicious/noExplicitAny: has to be any type to represent any ctor
export type Ctor<T> = new (...args: any[]) => T
// resolve intersection types
// biome-ignore lint/complexity/noBannedTypes: this is a hack to resolve types, so ignore
export type Resolve<T> = T extends Function ? T : { [K in keyof T]: T[K] }

export const brandKey = Symbol('brand')

export type Brand<T, U> = Resolve<
    T & {
        [brandKey]: U
    }
>

// biome-ignore lint/suspicious/noExplicitAny: casting to any to access the brand key if it exists
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
    // biome-ignore lint/suspicious/noExplicitAny: casting to any to access the brand key if it exists
    return (value as any)[brandKey] || ''
}
