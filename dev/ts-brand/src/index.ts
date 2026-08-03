// Copyright 2021-2026 Prosopo (UK) Ltd.
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
export type Ctor<T> = new (...args: any[]) => T;
// resolve intersection types
// biome-ignore lint/complexity/noBannedTypes: this is a hack to resolve types, so ignore
export type Resolve<T> = T extends Function ? T : { [K in keyof T]: T[K] };

export const brandKey = Symbol("brand");

// Note: Resolve maps a primitive intersection into a plain object carrying the
// primitive's methods, so a branded primitive does not satisfy its own base
// type — `Brand<string, "X">` cannot be passed where a `string` is wanted
// without going through unbrand() first. See brand.test-d.ts, which pins this
// down. Making Brand conditional on the base type fixes it, but Unbrand infers
// through Brand and stops resolving once it becomes conditional, so the two
// have to be reworked together.
export type Brand<T, U> = Resolve<
	T & {
		[brandKey]: U;
	}
>;

// biome-ignore lint/suspicious/noExplicitAny: casting to any to access the brand key if it exists
export type Unbrand<T> = T extends Brand<infer U, any> ? U : T;

export const brandClass = <T, const U>(ctor: Ctor<T>, name: U) => {
	return ctor as Ctor<Brand<T, typeof name>>;
};

export const unbrandClass = <T>(ctor: Ctor<T>) => {
	return ctor as Ctor<Unbrand<T>>;
};

export const brand = <T, const U>(value: T, name: U) => {
	return value as Brand<T, typeof name>;
};

export const unbrand = <T>(value: T) => {
	return value as Unbrand<T>;
};

// The brand a value carries, or "" for an unbranded one. Inferring the tag
// rather than returning `any` is what makes the result worth asserting on: an
// `any` return silently satisfies every expectation a caller writes about it.
export type BrandOf<T> = T extends { [brandKey]: infer U } ? U : "";

export const getBrand = <T>(value: T): BrandOf<T> => {
	return ((value as { [brandKey]?: BrandOf<T> })[brandKey] || "") as BrandOf<T>;
};
