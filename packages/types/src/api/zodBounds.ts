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

import { z } from "zod";

export type BoundedString = { path: string; schema: z.ZodString; max: number };

export type ZodBoundsReport = {
	unbounded: string[];
	strings: BoundedString[];
};

const FIXED_FORMATS = new Set([
	"uuid",
	"cuid",
	"cuid2",
	"ulid",
	"datetime",
	"date",
	"time",
	"ip",
	"cidr",
	"length",
]);

const stringMax = (schema: z.ZodString): number | undefined => {
	let max: number | undefined;
	for (const check of schema._def.checks) {
		if (check.kind === "max" || check.kind === "length") {
			max = Math.min(max ?? check.value, check.value);
		}
	}
	return max;
};

const hasFixedFormat = (schema: z.ZodString): boolean =>
	schema._def.checks.some((check) => FIXED_FORMATS.has(check.kind));

const arrayIsBounded = (schema: z.ZodArray<z.ZodTypeAny>): boolean =>
	schema._def.maxLength !== null || schema._def.exactLength !== null;

const setIsBounded = (schema: z.ZodSet): boolean =>
	schema._def.maxSize !== null;

// `isFinite` is true for `.int()` alone, which still accepts 1e300.
const numberIsBounded = (schema: z.ZodNumber): boolean =>
	schema._def.checks.some((check) => check.kind === "max");

/**
 * Walks a zod schema and reports every string, array, set, number and record
 * reachable from it that has no upper bound. A record counts as bounded when
 * it is wrapped in a refinement, which is how `hasAtMostKeys` is applied; its
 * keys are not checked, since their count is what that refinement caps.
 */
export const findZodBounds = (
	root: z.ZodTypeAny,
	rootPath = "",
): ZodBoundsReport => {
	const report: ZodBoundsReport = { unbounded: [], strings: [] };
	const seen = new Set<z.ZodTypeAny>();
	const visit = (
		schema: z.ZodTypeAny,
		path: string,
		refined: boolean,
	): void => {
		if (seen.has(schema)) return;
		seen.add(schema);
		if (schema instanceof z.ZodString) {
			const max = stringMax(schema);
			if (max !== undefined) report.strings.push({ path, schema, max });
			else if (!hasFixedFormat(schema)) report.unbounded.push(`${path}:string`);
		} else if (schema instanceof z.ZodNumber) {
			if (!numberIsBounded(schema)) report.unbounded.push(`${path}:number`);
		} else if (schema instanceof z.ZodArray) {
			if (!arrayIsBounded(schema)) report.unbounded.push(`${path}:array`);
			visit(schema.element, `${path}[]`, false);
		} else if (schema instanceof z.ZodSet) {
			if (!setIsBounded(schema)) report.unbounded.push(`${path}:set`);
			visit(schema._def.valueType, `${path}[]`, false);
		} else if (schema instanceof z.ZodRecord || schema instanceof z.ZodMap) {
			if (!refined) report.unbounded.push(`${path}:record`);
			visit(schema._def.valueType, `${path}<value>`, false);
		} else if (schema instanceof z.ZodObject) {
			for (const [key, value] of Object.entries<z.ZodTypeAny>(schema.shape)) {
				visit(value, path ? `${path}.${key}` : key, false);
			}
			visit(schema._def.catchall, `${path}.*`, false);
		} else if (schema instanceof z.ZodEffects) {
			visit(
				schema._def.schema,
				path,
				refined || schema._def.effect.type === "refinement",
			);
		} else if (
			schema instanceof z.ZodOptional ||
			schema instanceof z.ZodNullable ||
			schema instanceof z.ZodDefault ||
			schema instanceof z.ZodCatch ||
			schema instanceof z.ZodReadonly
		) {
			visit(schema._def.innerType, path, refined);
		} else if (schema instanceof z.ZodBranded) {
			visit(schema._def.type, path, refined);
		} else if (schema instanceof z.ZodLazy) {
			visit(schema.schema, path, refined);
		} else if (schema instanceof z.ZodPipeline) {
			visit(schema._def.in, path, refined);
		} else if (
			schema instanceof z.ZodUnion ||
			schema instanceof z.ZodDiscriminatedUnion
		) {
			schema.options.forEach((option: z.ZodTypeAny, index: number) =>
				visit(option, `${path}|${index}`, refined),
			);
		} else if (schema instanceof z.ZodIntersection) {
			visit(schema._def.left, path, refined);
			visit(schema._def.right, path, refined);
		} else if (schema instanceof z.ZodTuple) {
			schema.items.forEach((item: z.ZodTypeAny, index: number) =>
				visit(item, `${path}[${index}]`, false),
			);
			if (schema._def.rest) visit(schema._def.rest, `${path}[...]`, false);
		} else if (schema instanceof z.ZodPromise) {
			visit(schema._def.type, path, false);
		}
	};
	visit(root, rootPath, false);
	return report;
};

const isTooBig = (schema: z.ZodString, value: string): boolean => {
	const result = schema.safeParse(value);
	return (
		!result.success &&
		result.error.issues.some((issue) => issue.code === "too_big")
	);
};

/**
 * Paths of strings that reject a value at their limit, or accept one a
 * character over it.
 */
export const stringLimitViolations = (strings: BoundedString[]): string[] =>
	strings.flatMap(({ path, schema, max }) => [
		...(isTooBig(schema, "a".repeat(max)) ? [`${path} rejects ${max}`] : []),
		...(isTooBig(schema, "a".repeat(max + 1))
			? []
			: [`${path} accepts ${max + 1}`]),
	]);

/** Every zod schema exported by a module, keyed by export name. */
export const zodExports = (
	module: Record<string, unknown>,
): [string, z.ZodTypeAny][] =>
	Object.entries(module).filter(
		(entry): entry is [string, z.ZodTypeAny] => entry[1] instanceof z.ZodType,
	);
