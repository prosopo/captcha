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

import { expect, it } from "vitest";

// Reusable projection-contract test.
//
// We keep hitting the same class of bug (see #3107, #3116): a mongoose
// projection lists N fields, a downstream consumer reads M fields off
// the returned record, and if any field in M is not in N it arrives as
// `undefined` at the consumer. TypeScript doesn't catch this because the
// return type is the full record — not the projected subset. The
// consumer then silently no-ops (guard rules), trips the wrong branch
// (validation), or fails schema validation at insert time
// (`buildEscalation` re-persisting escalation sessions).
//
// This helper pins the (projection method, consumer) pair as a contract.
// Every field the consumer reads is enumerated in `consumerReads`; the
// test inserts a fully-populated fixture, fetches via the method under
// test, and asserts every consumer-read field survives the projection.
// Any future projection narrowing that drops a read field fails the
// assertion with a message that points straight at the missing field.
//
// The manifest is manually maintained — but it's the ONE thing that has
// to move together with the projection, and having it live next to the
// test means reviewers can eyeball it against the consumer's field
// accesses. If a consumer starts reading a new field, add it here;
// forgetting to do so is exactly the class of bug we're guarding.

/** Contract description for a single projected fetch method. */
export interface ProjectionContract<TRecord extends object> {
	/** Human-readable name for the test description. */
	readonly name: string;
	/**
	 * Async setup: insert a fully-populated fixture and return the value
	 * that will be passed to `fetch` (typically the fixture itself, so
	 * `fetch` can key by id/challenge/sessionId/etc).
	 */
	readonly insert: () => Promise<TRecord>;
	/**
	 * Fetch under the projection. Returns the record, undefined/null on
	 * miss, or an array (first element is asserted).
	 */
	readonly fetch: (
		fixture: TRecord,
	) => Promise<TRecord | TRecord[] | null | undefined>;
	/**
	 * Every field the downstream consumer reads off the returned record.
	 * Enumerate exhaustively — this array IS the contract. If a
	 * consumer starts reading a new field and this list is not updated,
	 * the drift check silently no-ops on the new field. Reviewers must
	 * eyeball this list against the consumer's `.field` accesses.
	 */
	readonly consumerReads: readonly (keyof TRecord)[];
	/**
	 * Optional consumer name for clearer assertion failures
	 * (e.g. "verifyImageCaptchaSolution").
	 */
	readonly consumerName?: string;
}

/**
 * Register a projection-contract test. Insert the fixture, fetch via
 * the projected method, and assert every field the consumer reads is
 * defined on the returned record. Fails with a targeted message that
 * names the missing field and the consumer.
 *
 * Call inside a `describe` block so `beforeAll`/`afterAll` around
 * MongoMemory + `TestProviderDatabase` are shared across contracts.
 */
export const testProjectionContract = <TRecord extends object>(
	contract: ProjectionContract<TRecord>,
): void => {
	it(`projection contract: ${contract.name} returns every field its consumer reads`, async () => {
		const fixture = await contract.insert();
		const result = await contract.fetch(fixture);
		const record = Array.isArray(result) ? result[0] : result;
		if (!record) {
			throw new Error(
				`[${contract.name}] fetch returned no record — check that the fixture was inserted and the fetch filter matches`,
			);
		}
		const consumer = contract.consumerName ?? "the consumer";
		const missing: string[] = [];
		for (const field of contract.consumerReads) {
			if (record[field] === undefined) {
				missing.push(String(field));
			}
		}
		expect(
			missing,
			`[${contract.name}] ${consumer} reads ${missing.length === 1 ? "a field" : "fields"} that the projection stripped: ${missing.join(", ")}. Add ${missing.length === 1 ? "it" : "them"} to the projection.`,
		).toEqual([]);
	});
};
