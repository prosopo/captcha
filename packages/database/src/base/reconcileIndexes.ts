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
import type {
	CreateIndexesOptions,
	IndexDescription,
	IndexDescriptionInfo,
	IndexDirection,
	IndexSpecification,
} from "mongodb";
import type { IndexDefinition, IndexOptions, Model } from "mongoose";

type IndexedModel = Pick<
	Model<unknown>,
	"collection" | "diffIndexes" | "listIndexes"
>;

export interface ReconcileIndexesOptions {
	/**
	 * Drop every index the schema does not declare. Only safe on a collection
	 * the schema owns outright: a shared collection carries indexes other
	 * code creates by hand, and those would be lost.
	 */
	dropUndeclared?: boolean;
	/** Indexes to drop by name even when `dropUndeclared` is off. */
	obsolete?: readonly string[];
	/**
	 * Indexes to keep on top of the schema's, for queries only some callers
	 * run. One counts as present when any index has its key, whatever its
	 * name or options.
	 */
	extra?: readonly IndexDescription[];
	/** Report what would change without touching the collection. */
	dryRun?: boolean;
}

export interface IndexFailure {
	name: string;
	error: string;
}

export interface IndexReconciliation {
	collection: string;
	dropped: string[];
	created: string[];
	/** Dropped indexes put back because their replacement failed to build. */
	restored: string[];
	failed: IndexFailure[];
}

type IndexKey = IndexDescriptionInfo["key"];

interface WantedIndex {
	name: string;
	key: IndexDefinition;
	options: IndexOptions;
}

// Mongo's own default naming (`field_dir` pairs joined by `_`), so a declared
// index without an explicit name can be matched against the live one by name.
export const defaultIndexName = (
	key: Readonly<Record<string, unknown>>,
): string =>
	Object.entries(key)
		.map(([field, direction]) => `${field}_${direction}`)
		.join("_");

// Mongoose accepts word aliases for sort direction that the driver does not.
const toDriverKey = (key: IndexDefinition): Record<string, IndexDirection> =>
	Object.fromEntries(
		Object.entries(key).map(([field, direction]) => [
			field,
			direction === "ascending" || direction === "asc"
				? 1
				: direction === "descending" || direction === "desc"
					? -1
					: direction,
		]),
	);

const keyOf = (index: IndexDescription): Record<string, IndexDirection> =>
	index.key instanceof Map ? Object.fromEntries(index.key) : index.key;

const sameKey = (
	a: Readonly<Record<string, unknown>>,
	b: Readonly<Record<string, unknown>>,
): boolean => {
	const left = Object.entries(a);
	const right = Object.entries(b);
	return (
		left.length === right.length &&
		left.every(
			([field, direction], i) =>
				right[i]?.[0] === field && String(right[i]?.[1]) === String(direction),
		)
	);
};

const listIndexesOrEmpty = async (
	model: IndexedModel,
): Promise<IndexDescriptionInfo[]> => {
	try {
		return await model.listIndexes();
	} catch (err) {
		if ((err as { codeName?: string }).codeName === "NamespaceNotFound") {
			return [];
		}
		throw err;
	}
};

// Mongoose lets `unique` carry a custom duplicate-key message; the driver only takes the flag.
const toDriverOptions = ({
	name,
	options: { unique, ...options },
}: WantedIndex): CreateIndexesOptions => ({
	...options,
	...(unique !== undefined && {
		unique: Array.isArray(unique) ? unique[0] : unique,
	}),
	name,
});

const errorMessage = (err: unknown): string =>
	err instanceof Error ? err.message : String(err);

const specOf = (
	index: IndexDescriptionInfo,
): { key: IndexSpecification; options: CreateIndexesOptions } => {
	const {
		key,
		v: _v,
		ns: _ns,
		...options
	} = index as IndexDescriptionInfo & {
		ns?: string;
	};
	return { key, options };
};

/**
 * Brings a collection's indexes in line with its schema without the window of
 * a drop-everything-then-rebuild. Indexes that already match are left alone;
 * an existing index that clashes with a declared one (same name or same key,
 * different key or options) is dropped and rebuilt, because `createIndex`
 * refuses to change an index in place and mongoose's autoIndex only logs that
 * refusal. If a rebuild fails (e.g. a new unique index meets duplicates) the
 * index it replaced is restored, so a failed run never leaves a collection
 * with less than it started with.
 */
export const reconcileIndexes = async (
	model: IndexedModel,
	options: ReconcileIndexesOptions = {},
): Promise<IndexReconciliation> => {
	const result: IndexReconciliation = {
		collection: model.collection.collectionName,
		dropped: [],
		created: [],
		restored: [],
		failed: [],
	};

	const existing = await listIndexesOrEmpty(model);
	const diff = await model.diffIndexes({ indexOptionsToCreate: true });
	const toCreate: [IndexDefinition, IndexOptions][] = diff.toCreate;
	const undeclared: string[] = diff.toDrop;
	const wanted: WantedIndex[] = toCreate.map(([key, indexOptions]) => ({
		key,
		options: indexOptions,
		name: indexOptions.name ?? defaultIndexName(key),
	}));

	const extra = options.extra ?? [];
	const isExtra = (index: IndexDescriptionInfo): boolean =>
		extra.some((e) => sameKey(keyOf(e), index.key));
	const missingExtra = extra.filter(
		(e) =>
			!existing.some((index) => sameKey(keyOf(e), index.key)) &&
			!wanted.some((w) => sameKey(keyOf(e), w.key)),
	);

	const obsolete = new Set(options.obsolete ?? []);
	const clashes = (index: IndexDescriptionInfo, w: WantedIndex): boolean =>
		w.name === index.name || sameKey(w.key, index.key);
	const toDrop = existing.filter(
		(index) =>
			index.name !== undefined &&
			undeclared.includes(index.name) &&
			!isExtra(index) &&
			(options.dropUndeclared ||
				obsolete.has(index.name) ||
				wanted.some((w) => clashes(index, w))),
	);
	const extraName = (e: IndexDescription): string =>
		e.name ?? defaultIndexName(keyOf(e));

	if (options.dryRun) {
		result.dropped = toDrop.map((index) => index.name ?? "");
		result.created = [
			...wanted.map((w) => w.name),
			...missingExtra.map(extraName),
		];
		return result;
	}

	for (const index of toDrop) {
		const name = index.name ?? "";
		await model.collection.dropIndex(name);
		result.dropped.push(name);
	}

	for (const w of wanted) {
		try {
			await model.collection.createIndex(
				toDriverKey(w.key),
				toDriverOptions(w),
			);
			result.created.push(w.name);
		} catch (err) {
			result.failed.push({ name: w.name, error: errorMessage(err) });
			for (const replaced of toDrop.filter((index) => clashes(index, w))) {
				const { key, options: replacedOptions } = specOf(replaced);
				try {
					await model.collection.createIndex(key, replacedOptions);
					result.restored.push(replaced.name ?? "");
				} catch (restoreErr) {
					result.failed.push({
						name: replaced.name ?? "",
						error: `restore failed: ${errorMessage(restoreErr)}`,
					});
				}
			}
		}
	}

	for (const e of missingExtra) {
		try {
			await model.collection.createIndexes([e]);
			result.created.push(extraName(e));
		} catch (err) {
			result.failed.push({ name: extraName(e), error: errorMessage(err) });
		}
	}

	return result;
};
