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
import { escapeTagValue } from "#policy/redis/reader/redisTagValue.js";

describe("escapeTagValue", () => {
	it("leaves letters, digits and underscores alone", () => {
		expect(
			escapeTagValue("5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"),
		).toBe("5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY");
		expect(escapeTagValue("t13d_abc")).toBe("t13d_abc");
	});

	it("escapes ASCII punctuation and whitespace", () => {
		expect(escapeTagValue('{"lat":1.5}')).toBe('\\{\\"lat\\"\\:1\\.5\\}');
		expect(escapeTagValue("a b\tc")).toBe("a\\ b\\\tc");
		expect(escapeTagValue("x\\y")).toBe("x\\\\y");
		expect(escapeTagValue("-?`'/")).toBe("\\-\\?\\`\\'\\/");
	});

	it("does not escape non-ASCII characters", () => {
		expect(escapeTagValue("é😀")).toBe("é😀");
	});
});
