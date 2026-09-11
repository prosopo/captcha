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

import { DEFAULT_MAX_TIMESTAMP_AGE } from "@prosopo/types";
import { describe, expect, it } from "vitest";
import { DETECTOR_BUNDLE_TTL_SECONDS } from "../../redisCache.js";

describe("DETECTOR_BUNDLE_TTL_SECONDS", () => {
	// The binding holds the only key that can read a detector payload. If it
	// expires first, the frictionless flow still accepts the payload and then
	// fails to decrypt it, costing the caller a challenge for nothing. Held as
	// two independent numbers these drifted to 60s against a 10 minute window.
	it("covers the whole window in which a payload is still accepted", () => {
		expect(DETECTOR_BUNDLE_TTL_SECONDS * 1000).toBe(DEFAULT_MAX_TIMESTAMP_AGE);
	});

	it("is a whole number of seconds, as Redis EX requires", () => {
		expect(Number.isInteger(DETECTOR_BUNDLE_TTL_SECONDS)).toBe(true);
		expect(DETECTOR_BUNDLE_TTL_SECONDS).toBeGreaterThan(0);
	});
});
