// Copyright 2021-2025 Prosopo (UK) Ltd.
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

// syntax sugar
export type Keys<Type> = Partial<Record<keyof Type, unknown>>;

// see the usage example below
export type AllKeys<Type> = Record<keyof Type, unknown>;

export type AllEnumValues<Type extends string | number> =
    Record<Type, unknown>;

/*
By default, "satisfies Type" allows optional properties to be missing.
But there are cases when we need to enforce it, e.g. mastering Zod or Redis schemas

type MyType = {
  required: string;
  optional?: string;
};

// default incomplete safety: optional property is not enforced, and removed property is left.
export const myType: ZodType<MyType> = z.object({
    required: z.string(),
    oldRemovedProperty: z.string()
});
// the missing optional property can lead to tricky "data-lost" bugs,
// as TS won't complain when we pass it to other functions expecting MyType

// typesafe, won't compile
export const schema: ZodType<Type> = z.object({
    required: z.string(),
    oldRemovedProperty: z.string(),
} satisfies AllKeys<MyType>);
*/
