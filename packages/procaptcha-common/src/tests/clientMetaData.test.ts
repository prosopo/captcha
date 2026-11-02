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

import { afterEach, describe, expect, it } from "vitest";
import { buildClientMetaData } from "../clientMetaData.js";

const PROTECT_JTI = "bumblebee-0f1e2d3c-4b5a-6978-8796-a5b4c3d2e1f0";

const runProtect = (): void => {
	Reflect.set(window, "prosopo_protect", { jti: PROTECT_JTI, ready: true });
};

afterEach(() => {
	Reflect.deleteProperty(window, "prosopo_protect");
});

describe("buildClientMetaData", () => {
	it("returns undefined when the widget has nothing to report", () => {
		expect(buildClientMetaData(undefined, undefined)).toBeUndefined();
	});

	it("returns undefined for empty strings rather than an empty object", () => {
		expect(buildClientMetaData("", "")).toBeUndefined();
	});

	it("reports the honeypot value alone", () => {
		expect(buildClientMetaData("bot-typed-this", undefined)).toEqual({
			hp: "bot-typed-this",
		});
	});

	it("reports the client session id alone", () => {
		expect(buildClientMetaData(undefined, "jti-1")).toEqual({
			clientSessionId: "jti-1",
		});
	});

	it("reports both when both are present", () => {
		expect(buildClientMetaData("trap", "jti-1")).toEqual({
			hp: "trap",
			clientSessionId: "jti-1",
		});
	});

	it("falls back to Protect's session id when the site rendered none", () => {
		runProtect();

		expect(buildClientMetaData(undefined, undefined)).toEqual({
			clientSessionId: PROTECT_JTI,
		});
	});

	it("leaves the site's own session id alone when Protect is also present", () => {
		runProtect();

		expect(buildClientMetaData(undefined, "site-session-1")).toEqual({
			clientSessionId: "site-session-1",
		});
	});
});
