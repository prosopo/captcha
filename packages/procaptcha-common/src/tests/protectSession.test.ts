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

import { INPUT_LIMITS } from "@prosopo/types";
import { afterEach, describe, expect, it } from "vitest";
import { getProtectJti, resolveClientSessionId } from "../protectSession.js";

const JTI = "bumblebee-0f1e2d3c-4b5a-6978-8796-a5b4c3d2e1f0";
const JWT = "eyJhbGciOiJzcjI1NTE5In0.eyJqdGkiOiJ4In0.c2lnbmF0dXJl";

const setCookie = (value: string): void => {
	document.cookie = `prosopo_session=${value}; path=/`;
};

const clearCookie = (): void => {
	document.cookie = "prosopo_session=; path=/; max-age=0";
};

const setGlobal = (value: unknown): void => {
	Reflect.set(window, "prosopo_protect", value);
};

afterEach(() => {
	Reflect.deleteProperty(window, "prosopo_protect");
	clearCookie();
});

describe("getProtectJti", () => {
	it("returns undefined when the site does not run Protect", () => {
		expect(getProtectJti()).toBeUndefined();
	});

	it("reads the jti from the Protect global", () => {
		setGlobal({ version: "0.1.0", jti: JTI, ready: true });

		expect(getProtectJti()).toBe(JTI);
	});

	it("falls back to the session cookie when the global has no jti yet", () => {
		setGlobal({ version: "0.1.0", ready: false });
		setCookie(`${JTI}|${JWT}`);

		expect(getProtectJti()).toBe(JTI);
	});

	it("never returns the jwt half of the cookie", () => {
		setCookie(`${JTI}|${JWT}`);

		const jti = getProtectJti();

		expect(jti).toBe(JTI);
		expect(jti).not.toContain(JWT);
	});

	it("reads a cookie that carries the jti alone", () => {
		setCookie(JTI);

		expect(getProtectJti()).toBe(JTI);
	});

	it("ignores an empty jti in the cookie", () => {
		setCookie(`|${JWT}`);

		expect(getProtectJti()).toBeUndefined();
	});

	it("ignores other cookies whose name merely ends in the same suffix", () => {
		document.cookie = `not_prosopo_session=${JTI}; path=/`;

		expect(getProtectJti()).toBeUndefined();

		document.cookie = "not_prosopo_session=; path=/; max-age=0";
	});

	// The provider caps clientSessionId at INPUT_LIMITS.ID and rejects the whole
	// solution body when it is longer, so an oversized value has to be dropped
	// here rather than failing the solve.
	it("ignores a jti longer than the provider accepts", () => {
		setGlobal({ jti: "a".repeat(INPUT_LIMITS.ID + 1) });

		expect(getProtectJti()).toBeUndefined();
	});

	it("accepts a jti exactly at the limit", () => {
		const atLimit = "a".repeat(INPUT_LIMITS.ID);
		setGlobal({ jti: atLimit });

		expect(getProtectJti()).toBe(atLimit);
	});

	it("ignores a jti containing characters an id cannot have", () => {
		setGlobal({ jti: "bumblebee-<script>" });

		expect(getProtectJti()).toBeUndefined();
	});

	it("ignores a non-string jti", () => {
		setGlobal({ jti: 42 });

		expect(getProtectJti()).toBeUndefined();
	});

	it("survives a page that defines the global as a throwing getter", () => {
		Object.defineProperty(window, "prosopo_protect", {
			configurable: true,
			get: () => {
				throw new Error("nope");
			},
		});

		expect(getProtectJti()).toBeUndefined();
	});
});

describe("resolveClientSessionId", () => {
	it("prefers the session id the site rendered the widget with", () => {
		setGlobal({ jti: JTI });

		expect(resolveClientSessionId("site-session-1")).toBe("site-session-1");
	});

	it("falls back to Protect when the site rendered no session id", () => {
		setGlobal({ jti: JTI });

		expect(resolveClientSessionId(undefined)).toBe(JTI);
	});

	it("treats an empty site session id as none", () => {
		setGlobal({ jti: JTI });

		expect(resolveClientSessionId("")).toBe(JTI);
	});

	it("returns undefined when neither is available", () => {
		expect(resolveClientSessionId(undefined)).toBeUndefined();
	});
});
