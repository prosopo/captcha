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

// How mongoose itself sees a schema, for the Rust's description of the same schema to be checked
// against (`schema_description.rs`). Shared by every generator that proves a Rust schema.

import type { Schema, SchemaType } from "mongoose";

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

export type ArrayType = SchemaType & { embeddedSchemaType: SchemaType };
export type NestedSchemaType = SchemaType & { schema: Schema };
export type MapType = SchemaType & { $__schemaType: SchemaType };

const kindOf = (type: SchemaType): string => {
	if ((type as unknown as { $isMongooseDocumentArray?: boolean }).$isMongooseDocumentArray) return "DocumentArray";
	if (type.instance === "Array") return `Array<${kindOf((type as ArrayType).embeddedSchemaType)}>`;
	return type.instance;
};

// A schema's top-level keys, nested paths and every path with its kind, constraints, when its
// default applies and, for a subdocument, its own schema.
export const describe = (schema: Schema): Json => {
	const paths: Json[] = Object.entries(schema.paths).map(([path, type]): Json => {
		const options = type.options as { min?: number; max?: number; expires?: number | string; unique?: boolean; index?: unknown };
		const defaultValue: unknown = (type as unknown as { defaultValue: unknown }).defaultValue;
		const timing: string =
			defaultValue === undefined
				? "none"
				: typeof defaultValue === "function"
					? (defaultValue as { $runBeforeSetters?: boolean }).$runBeforeSetters
						? "before"
						: "after"
					: "value";
		const element: SchemaType | undefined =
			type.instance === "Array" ? (type as ArrayType).embeddedSchemaType : type.instance === "Map" ? (type as MapType).$__schemaType : undefined;
		const enumValues: string[] =
			(type as unknown as { enumValues?: string[] }).enumValues ?? (element as unknown as { enumValues?: string[] } | undefined)?.enumValues ?? [];
		const subschema: Schema | undefined = (type as Partial<NestedSchemaType>).schema ?? (element as Partial<NestedSchemaType> | undefined)?.schema;
		return {
			path,
			kind: kindOf(type),
			...(type.isRequired === undefined ? {} : { required: type.isRequired }),
			enumValues: enumValues.length > 0 ? enumValues : null,
			min: options.min ?? null,
			max: options.max ?? null,
			default: timing,
			// mongoose turns `expires` into the TTL index's seconds, parsing a timespan such as "7d".
			expires: (type as unknown as { _index?: { expireAfterSeconds?: number } })._index?.expireAfterSeconds ?? options.expires ?? null,
			unique: options.unique ?? null,
			schema: subschema ? describe(subschema) : null,
		};
	});
	return {
		tree: Object.keys((schema as unknown as { tree: Record<string, unknown> }).tree),
		nested: Object.keys((schema as unknown as { nested: Record<string, boolean> }).nested),
		timestamps: Boolean(schema.options.timestamps),
		paths,
	};
};
