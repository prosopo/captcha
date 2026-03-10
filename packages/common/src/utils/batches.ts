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

export const chunkIntoBatches = <Item>(
	items: Item[],
	chunkSize: number,
): Item[][] =>
	Array.from({ length: Math.ceil(items.length / chunkSize) }, (_, index) =>
		items.slice(index * chunkSize, (index + 1) * chunkSize),
	);

export type ExecuteBatches<Batch, Response> = (
	batches: readonly Batch[],
	handler: (batch: Batch, index: number) => Promise<Response>,
) => Promise<Response[]>;

export const executeBatchesSequentially = (async <Batch, Response>(
	batches: readonly Batch[],
	handler: (batch: Batch, index: number) => Promise<Response>,
): Promise<Response[]> => {
	const results: Response[] = [];

	for (const item of batches) {
		const result = await handler(item, results.length);

		results.push(result);
	}

	return results;
}) satisfies ExecuteBatches<unknown, unknown>;

export const executeBatchesInParallel = (async <Batch, Response>(
	batches: readonly Batch[],
	handler: (batch: Batch, index: number) => Promise<Response>,
): Promise<Response[]> =>
	Promise.all(batches.map(handler))) satisfies ExecuteBatches<unknown, unknown>;
