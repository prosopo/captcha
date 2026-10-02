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

import { EnvironmentTypesSchema } from "@prosopo/types";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	clearPrefetchedDetectors,
	prefetchDetector,
	takePrefetchedDetector,
} from "../detectorPrefetch.js";

const ENV = EnvironmentTypesSchema.enum.development;
const SITE_KEY = "5siteKeyAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

const take = (): Promise<unknown> | undefined =>
	takePrefetchedDetector(ENV, undefined, SITE_KEY);

afterEach(() => {
	clearPrefetchedDetectors();
	vi.useRealTimers();
	vi.restoreAllMocks();
});

describe("detector prefetch sharing", () => {
	it("hands the same assignment to every widget that claims it", async () => {
		// A page mounting one widget per form used to cost one provider
		// resolve + assign per widget, because the entry was removed on the
		// first claim. Eight widgets on a property page meant eight assign
		// calls per page view.
		prefetchDetector(ENV, undefined, SITE_KEY);
		const claims = [take(), take(), take(), take()];
		expect(claims.every((c) => c !== undefined)).toBe(true);
		expect(new Set(claims).size).toBe(1);
	});

	it("stops handing out an assignment once it has failed", async () => {
		// The delete-on-claim this replaces existed to stop a later widget
		// inheriting a pin that had already failed; that guarantee is kept by
		// dropping the entry on rejection instead.
		prefetchDetector(ENV, undefined, SITE_KEY);
		const claimed = take();
		expect(claimed).toBeDefined();
		await claimed?.catch(() => undefined);
		expect(take()).toBeUndefined();
	});

	it("does not hand out a stale pin", () => {
		vi.useFakeTimers();
		prefetchDetector(ENV, undefined, SITE_KEY);
		expect(take()).toBeDefined();
		vi.advanceTimersByTime(61_000);
		expect(take()).toBeUndefined();
	});

	it("keeps assignments for different site keys apart", () => {
		prefetchDetector(ENV, undefined, SITE_KEY);
		expect(takePrefetchedDetector(ENV, undefined, "other-key")).toBeUndefined();
	});
});
