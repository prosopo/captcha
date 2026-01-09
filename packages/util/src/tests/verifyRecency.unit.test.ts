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
import { describe, expect, it } from "vitest";
import { verifyRecency } from "../verifyRecency.js";

describe("verifyRecency", () => {
	it("returns true when challenge is recent", () => {
		const now = Date.now();
		const challenge = `${now}___data`;
		expect(verifyRecency(challenge, 10000)).toBe(true);
	});

	it("returns false when challenge is too old", () => {
		const oldTime = Date.now() - 20000;
		const challenge = `${oldTime}___data`;
		expect(verifyRecency(challenge, 10000)).toBe(false);
	});

	it("returns true when challenge is exactly at the limit", () => {
		const now = Date.now();
		const challenge = `${now}___data`;
		expect(verifyRecency(challenge, 0)).toBe(true);
	});

	it("returns false when challenge has no timestamp", () => {
		const challenge = "___data";
		expect(verifyRecency(challenge, 10000)).toBe(false);
	});

	it("returns false when challenge is empty", () => {
		expect(verifyRecency("", 10000)).toBe(false);
	});

	it("handles edge case with very large maxVerifiedTime", () => {
		const oldTime = Date.now() - 1000000;
		const challenge = `${oldTime}___data`;
		expect(verifyRecency(challenge, 2000000)).toBe(true);
	});
});
