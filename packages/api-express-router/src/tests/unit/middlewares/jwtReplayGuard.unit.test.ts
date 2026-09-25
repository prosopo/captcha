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

import { describe, expect, test } from "vitest";
import { createMemoryJwtReplayGuard } from "../../../middlewares/jwtReplayGuard.js";

describe("createMemoryJwtReplayGuard", () => {
	test("accepts an id once and refuses it until it expires", () => {
		let now = 1000;
		const guard = createMemoryJwtReplayGuard(10, () => now);
		expect(guard.claim("a", 1300)).toBe(true);
		expect(guard.claim("a", 1300)).toBe(false);
		now = 1301;
		expect(guard.claim("a", 1600)).toBe(true);
	});

	test("tracks ids independently", () => {
		const guard = createMemoryJwtReplayGuard(10, () => 0);
		expect(guard.claim("a", 100)).toBe(true);
		expect(guard.claim("b", 100)).toBe(true);
		expect(guard.claim("b", 100)).toBe(false);
	});

	test("drops expired entries before evicting live ones when full", () => {
		let now = 0;
		const guard = createMemoryJwtReplayGuard(2, () => now);
		guard.claim("short", 10);
		guard.claim("long", 1000);
		now = 20;
		expect(guard.claim("new", 1000)).toBe(true);
		expect(guard.claim("long", 1000)).toBe(false);
	});

	test("evicts the oldest live entry rather than growing past the cap", () => {
		const guard = createMemoryJwtReplayGuard(2, () => 0);
		guard.claim("a", 100);
		guard.claim("b", 100);
		guard.claim("c", 100);
		expect(guard.claim("a", 100)).toBe(true);
		expect(guard.claim("c", 100)).toBe(false);
	});
});
