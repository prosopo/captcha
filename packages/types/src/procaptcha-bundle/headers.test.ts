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
import { normaliseBundleOrigin, normaliseBundleVersion } from "./headers.js";

describe("normaliseBundleVersion", () => {
	it("keeps release numbers and dev", () => {
		expect(normaliseBundleVersion("3.9.6")).toBe("3.9.6");
		expect(normaliseBundleVersion(" 3.9.6-rc.1 ")).toBe("3.9.6-rc.1");
		expect(normaliseBundleVersion("dev")).toBe("dev");
	});

	it("drops anything else", () => {
		expect(normaliseBundleVersion(undefined)).toBeUndefined();
		expect(normaliseBundleVersion("")).toBeUndefined();
		expect(normaliseBundleVersion("latest")).toBeUndefined();
		expect(normaliseBundleVersion("3.9")).toBeUndefined();
		expect(normaliseBundleVersion("3.9.6\r\nx: 1")).toBeUndefined();
	});
});

describe("normaliseBundleOrigin", () => {
	it("reduces a URL to its http(s) origin", () => {
		expect(normaliseBundleOrigin("https://js.prosopo.io")).toBe(
			"https://js.prosopo.io",
		);
		expect(normaliseBundleOrigin("https://example.com/assets/x.js?a=1")).toBe(
			"https://example.com",
		);
	});

	it("drops non-http, malformed and oversized values", () => {
		expect(normaliseBundleOrigin(undefined)).toBeUndefined();
		expect(normaliseBundleOrigin("not a url")).toBeUndefined();
		expect(normaliseBundleOrigin("file:///tmp/x.js")).toBeUndefined();
		expect(
			normaliseBundleOrigin(`https://${"a".repeat(300)}.com`),
		).toBeUndefined();
	});
});
