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

import type { RedisClientType } from "redis";
import { describe, expect, it, vi } from "vitest";
import { searchRedisKeysBounded } from "#policy/redis/reader/redisAggregate.js";

// Match the search-side reply shape produced by
// `@redis/search`'s `SEARCH_NOCONTENT.transformReply` — a flat
// `[total, key1, key2, ...]` collapsed into `{ total, documents }`.
// This shape is the whole point of switching the split-query path to
// NOCONTENT: unlike the aggregate + LOAD @__key path it can't hit the
// null-tuple crash in `transformTuplesReply` that fires against
// field:ja4Hash probes in prod.
type SearchNoContentReply = { total: number; documents: string[] };

type FakeSearchClient = {
	ft: {
		searchNoContent: (
			index: string,
			query: string,
			options: { DIALECT?: number; LIMIT?: { from: number; size: number } },
		) => Promise<SearchNoContentReply>;
	};
};

const makeClient = (reply: SearchNoContentReply): FakeSearchClient => ({
	ft: {
		searchNoContent: vi.fn().mockResolvedValue(reply),
	},
});

describe("searchRedisKeysBounded", () => {
	it("returns the flat documents list from FT.SEARCH NOCONTENT", async () => {
		const client = makeClient({
			total: 3,
			documents: ["access_rule:a", "access_rule:b", "access_rule:c"],
		});

		// The caller uses a bounded max — 500 in production.
		const keys = await searchRedisKeysBounded(
			client as unknown as RedisClientType,
			"@type:{block} @ja4Hash:{t13d_probe}",
			500,
		);

		expect(keys).toEqual(["access_rule:a", "access_rule:b", "access_rule:c"]);
	});

	it("passes the caller's cap through as the FT.SEARCH LIMIT size", async () => {
		const searchNoContent = vi
			.fn()
			.mockResolvedValue({ total: 0, documents: [] });
		const client = {
			ft: { searchNoContent },
		} as unknown as RedisClientType;

		await searchRedisKeysBounded(client, "@ja4Hash:{x}", 500);

		expect(searchNoContent).toHaveBeenCalledTimes(1);
		const call = searchNoContent.mock.calls[0];
		expect(call).toBeDefined();
		const options = call?.[2] as {
			DIALECT?: number;
			LIMIT?: { from: number; size: number };
		};
		expect(options.LIMIT).toEqual({ from: 0, size: 500 });
		// DIALECT 2 is required by the ismissing() clauses the split
		// query builder emits.
		expect(options.DIALECT).toBe(2);
	});

	it("returns an empty list when the search matches nothing", async () => {
		const client = makeClient({ total: 0, documents: [] });

		const keys = await searchRedisKeysBounded(
			client as unknown as RedisClientType,
			"@ja4Hash:{never_indexed}",
			500,
		);

		expect(keys).toEqual([]);
	});

	// Regression: the aggregate + LOAD path this helper replaces throws
	//   TypeError: Cannot read properties of null (reading 'length')
	// when the RediSearch coordinator returns a `null` result row (seen
	// continuously on field:ja4Hash probes in prod, thousands per hour).
	// The NOCONTENT reply carries no nested tuples, so a well-formed
	// reply — even with an unexpected trailing null in the raw wire array
	// — cannot reach the tuples decoder at all. Assert we return the
	// documents list as-is without introspecting individual entries.
	it("does not iterate individual document tuples (null-safe reply shape)", async () => {
		// Simulate a bare-string documents array — the shape produced by
		// SEARCH_NOCONTENT. Every entry is a string key; there are no
		// per-doc tuples for a `.length` lookup to trip over.
		const client = makeClient({
			total: 2,
			documents: ["access_rule:one", "access_rule:two"],
		});

		await expect(
			searchRedisKeysBounded(
				client as unknown as RedisClientType,
				"@ja4Hash:{t13d2013h2_a09f3c656075_7f0f34a4126d}",
				500,
			),
		).resolves.toEqual(["access_rule:one", "access_rule:two"]);
	});
});
