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

export const getObjectEntries = <ObjectType extends object>(
	object: ObjectType,
): [keyof ObjectType, ObjectType[keyof ObjectType]][] =>
	Object.entries(object) as [keyof ObjectType, ObjectType[keyof ObjectType]][];

export const createObjectFromEntries = <ObjectType extends object>(
	entries: [keyof ObjectType, ObjectType[keyof ObjectType]][],
): ObjectType => Object.fromEntries(entries) as ObjectType;

type ObjectFromIterableOptions<ItemType, KeyType, ValueType = ItemType> = {
	getKey: (item: ItemType, index: number) => KeyType;
	getValue?: (item: ItemType, key: KeyType) => ValueType;
	mergeValues?: (
		origin: ValueType,
		latest: ValueType,
		key: KeyType,
	) => ValueType;
};

export const createObjectFromIterable = <
	ItemType,
	KeyType extends string,
	ValueType = ItemType,
>(
	records: Iterable<ItemType>,
	options: ObjectFromIterableOptions<ItemType, KeyType, ValueType>,
): Record<KeyType, ValueType> => {
	const { getKey, getValue, mergeValues } = options;
	const object: Record<KeyType, ValueType> = {} as Record<KeyType, ValueType>;

	let index = 0;

	const resolveValue = (key: KeyType, value: ValueType): ValueType => {
		if (mergeValues && key in object) {
			return mergeValues(object[key], value, key);
		}

		return value;
	};

	for (const item of records) {
		const key = getKey(item, index++);
		const value = getValue
			? getValue(item, key)
			: (item as unknown as ValueType);

		object[key] = resolveValue(key, value);
	}

	return object;
};

export const mergeObjects = <ObjectType extends object>(
	objects: ObjectType[],
	mergeValues: (
		origin: ObjectType[keyof ObjectType],
		latest: ObjectType[keyof ObjectType],
		key: keyof ObjectType,
	) => ObjectType[keyof ObjectType],
): ObjectType =>
	objects.reduce<ObjectType>((aggregation, object) => {
		const entries = getObjectEntries(object);

		for (const [key, record] of entries) {
			const originRecord = aggregation[key];

			aggregation[key] =
				undefined === originRecord
					? record
					: mergeValues(originRecord, record, key);
		}

		return aggregation;
	}, {} as ObjectType);

export const sumNumericObjects = <ObjectType extends Record<string, number>>(
	objects: ObjectType[],
): ObjectType =>
	mergeObjects(
		objects,
		(origin, latest) => (origin + latest) as ObjectType[keyof ObjectType],
	);

export const filterObjectEntries = <ObjectType extends object>(
	object: ObjectType,
	predicate: (
		value: ObjectType[keyof ObjectType],
		key: keyof ObjectType,
	) => boolean,
): ObjectType =>
	createObjectFromEntries(
		getObjectEntries(object).filter(([key, value]) => predicate(value, key)),
	);

export const countObjectEntries = (object: object) =>
	Object.keys(object).length;
