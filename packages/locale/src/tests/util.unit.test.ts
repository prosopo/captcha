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

import { afterEach, describe, expect, test } from "vitest";
import { isClientSide, isServerSide } from "../util.js";

// The detection reads `window` off the global object, so each test installs a
// fake and the teardown removes it. Reflect.deleteProperty rather than
// `delete globalThis.window` keeps TypeScript happy about an optional global.
type FakeWindow = {
	document?: { createElement?: unknown };
};

const setWindow = (value: FakeWindow | undefined): void => {
	if (value === undefined) {
		Reflect.deleteProperty(globalThis, "window");
		return;
	}
	Object.defineProperty(globalThis, "window", {
		value,
		configurable: true,
		writable: true,
	});
};

afterEach(() => {
	setWindow(undefined);
});

describe("isClientSide", () => {
	test("is false under plain node, where there is no window at all", () => {
		expect(isClientSide()).toBe(false);
	});

	test("is true when window exposes document.createElement", () => {
		setWindow({ document: { createElement: (): void => {} } });
		expect(isClientSide()).toBe(true);
	});

	// The three guards are checked in order and each one has to be able to
	// veto on its own, otherwise a half-built environment (jsdom teardown, a
	// server-side-rendering shim that stubs `window` but not `document`) would
	// be misread as a browser and the frontend i18n path would be selected on
	// a server.
	test("is false when window exists but has no document", () => {
		setWindow({});
		expect(isClientSide()).toBe(false);
	});

	test("is false when document exists but has no createElement", () => {
		setWindow({ document: {} });
		expect(isClientSide()).toBe(false);
	});

	test("is false when createElement is present but undefined", () => {
		setWindow({ document: { createElement: undefined } });
		expect(isClientSide()).toBe(false);
	});

	test("returns a real boolean, not the truthy function itself", () => {
		const createElement = (): void => {};
		setWindow({ document: { createElement } });
		const result: boolean = isClientSide();
		expect(result).toBe(true);
		expect(typeof result).toBe("boolean");
	});
});

describe("isServerSide", () => {
	test("is true under plain node", () => {
		expect(isServerSide()).toBe(true);
	});

	test("is false in a browser-like environment", () => {
		setWindow({ document: { createElement: (): void => {} } });
		expect(isServerSide()).toBe(false);
	});

	test("is always the exact negation of isClientSide", () => {
		const environments: (FakeWindow | undefined)[] = [
			undefined,
			{},
			{ document: {} },
			{ document: { createElement: (): void => {} } },
		];
		for (const environment of environments) {
			setWindow(environment);
			expect(isServerSide()).toBe(!isClientSide());
		}
	});
});
