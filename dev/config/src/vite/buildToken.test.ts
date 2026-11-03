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
import { buildToken } from "./buildToken.js";

describe("buildToken", () => {
	it("is the same on every build of the same version", () => {
		expect(buildToken("honeypot", 4, "1.0.0", {})).toBe(
			buildToken("honeypot", 4, "1.0.0", {}),
		);
	});

	it("is hex of the requested length", () => {
		expect(buildToken("honeypot", 4, "1.0.0", {})).toMatch(/^[0-9a-f]{8}$/);
	});

	it("differs between names", () => {
		expect(buildToken("honeypot", 4, "1.0.0", {})).not.toBe(
			buildToken("shared", 4, "1.0.0", {}),
		);
	});

	it("differs between versions", () => {
		expect(buildToken("honeypot", 4, "1.0.0", {})).not.toBe(
			buildToken("honeypot", 4, "1.0.1", {}),
		);
	});

	it("uses PROSOPO_BUILD_SEED over the version", () => {
		expect(
			buildToken("honeypot", 4, "1.0.0", { PROSOPO_BUILD_SEED: "x" }),
		).toBe(buildToken("honeypot", 4, "9.9.9", { PROSOPO_BUILD_SEED: "x" }));
	});

	it("differs between keys", () => {
		expect(
			buildToken("honeypot", 4, "1.0.0", { PROSOPO_BUILD_TOKEN_KEY: "a" }),
		).not.toBe(
			buildToken("honeypot", 4, "1.0.0", { PROSOPO_BUILD_TOKEN_KEY: "b" }),
		);
	});
});
