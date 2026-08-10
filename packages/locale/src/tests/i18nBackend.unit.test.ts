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

import type { InitOptions, i18n } from "i18next";
import { afterEach, describe, expect, test, vi } from "vitest";

// i18next is a mutable singleton and the module under test configures it as a
// side effect of the first call. Both are mocked so each test starts from a
// known `isInitialized` state without a real filesystem backend.

type Listener = (...args: unknown[]) => void;

interface FakeI18n {
	isInitialized: boolean;
	use: (plugin: unknown) => FakeI18n;
	init: (options: InitOptions) => FakeI18n;
	on: (event: string, listener: Listener) => void;
}

interface Harness {
	fake: FakeI18n;
	plugins: unknown[];
	initOptions: InitOptions[];
	listeners: Map<string, Listener[]>;
	emit: (event: string) => void;
}

const makeHarness = (isInitialized: boolean): Harness => {
	const plugins: unknown[] = [];
	const initOptions: InitOptions[] = [];
	const listeners = new Map<string, Listener[]>();

	const fake: FakeI18n = {
		isInitialized,
		use: (plugin: unknown): FakeI18n => {
			plugins.push(plugin);
			return fake;
		},
		init: (options: InitOptions): FakeI18n => {
			initOptions.push(options);
			return fake;
		},
		on: (event: string, listener: Listener): void => {
			listeners.set(event, [...(listeners.get(event) ?? []), listener]);
		},
	};

	return {
		fake,
		plugins,
		initOptions,
		listeners,
		emit: (event: string): void => {
			for (const listener of listeners.get(event) ?? []) {
				listener();
			}
		},
	};
};

/**
 * Load the module under a fresh registry with i18next, the filesystem backend
 * and the side detection all mocked.
 */
const load = async (options: {
	isInitialized?: boolean;
	serverSide?: boolean;
}): Promise<{
	initializeI18n: (callback?: (value: i18n) => void) => i18n;
	harness: Harness;
}> => {
	vi.resetModules();
	const harness = makeHarness(options.isInitialized ?? false);

	vi.doMock("i18next", () => ({ default: harness.fake }));
	vi.doMock("i18next-fs-backend/cjs", () => ({ default: "FSBackend" }));
	vi.doMock("i18next-http-middleware", () => ({
		LanguageDetector: class {
			options: unknown;
			constructor(_services: unknown, opts: unknown) {
				this.options = opts;
			}
		},
	}));
	vi.doMock("../util.js", () => ({
		isServerSide: (): boolean => options.serverSide ?? true,
		isClientSide: (): boolean => !(options.serverSide ?? true),
	}));

	const imported = await import("../i18nBackend.js");
	return { initializeI18n: imported.default, harness };
};

afterEach(() => {
	vi.resetModules();
	vi.doUnmock("i18next");
	vi.doUnmock("i18next-fs-backend/cjs");
	vi.doUnmock("i18next-http-middleware");
	vi.doUnmock("../util.js");
});

describe("i18nBackend on a server, not yet initialised", () => {
	test("initialises i18next exactly once", async () => {
		const { initializeI18n, harness } = await load({});
		initializeI18n();
		expect(harness.initOptions).toHaveLength(1);
	});

	test("registers the filesystem backend and the header language detector", async () => {
		// The detector is what makes Accept-Language work; losing it would
		// silently serve every request in the fallback language.
		const { initializeI18n, harness } = await load({});
		initializeI18n();
		expect(harness.plugins).toHaveLength(2);
		expect(harness.plugins[0]).toBe("FSBackend");
	});

	test("carries the shared options through to init", async () => {
		const { initializeI18n, harness } = await load({});
		initializeI18n();
		const options = harness.initOptions[0];
		expect(options?.fallbackLng).toBe("en");
		expect(options?.supportedLngs).toContain("en");
		expect(options?.nonExplicitSupportedLngs).toBe(false);
	});

	test("declares the translation namespace", async () => {
		const { initializeI18n, harness } = await load({});
		initializeI18n();
		expect(harness.initOptions[0]?.ns).toEqual(["translation"]);
	});

	test("points the backend at a filesystem path, not a file:// URL", async () => {
		// i18next-fs-backend reads with node:fs, which cannot open a file://
		// URL — the module strips the scheme for exactly this reason.
		const { initializeI18n, harness } = await load({});
		initializeI18n();
		const backend = harness.initOptions[0]?.backend as
			| { loadPath?: string }
			| undefined;
		expect(backend?.loadPath).toBeDefined();
		expect(backend?.loadPath).not.toContain("file://");
		expect(backend?.loadPath).toContain("/locales/{{lng}}/{{ns}}.json");
	});

	test("defers the callback until resources have loaded", async () => {
		const callback = vi.fn();
		const { initializeI18n, harness } = await load({});

		initializeI18n(callback);
		expect(callback).not.toHaveBeenCalled();

		harness.emit("loaded");
		expect(callback).toHaveBeenCalledTimes(1);
	});

	test("fires the callback once, however often `loaded` is emitted", async () => {
		// i18next emits `loaded` per namespace and again after changeLanguage,
		// so an unguarded listener would repeat whatever side effect the caller
		// attached to it.
		const callback = vi.fn();
		const { initializeI18n, harness } = await load({});

		initializeI18n(callback);
		harness.emit("loaded");
		harness.emit("loaded");
		harness.emit("loaded");
		expect(callback).toHaveBeenCalledTimes(1);
	});

	test("hands the i18next instance to the callback", async () => {
		const callback = vi.fn();
		const { initializeI18n, harness } = await load({});
		initializeI18n(callback);
		harness.emit("loaded");
		expect(callback).toHaveBeenCalledWith(harness.fake);
	});

	test("returns the i18next instance", async () => {
		const { initializeI18n, harness } = await load({});
		expect(initializeI18n()).toBe(harness.fake);
	});

	test("tolerates being called with no callback at all", async () => {
		const { initializeI18n, harness } = await load({});
		initializeI18n();
		expect(() => harness.emit("loaded")).not.toThrow();
	});
});

// Both of these skip initialisation. The `loaded` listener is only registered
// on the init path, so without an explicit callback here the caller
// (loadI18next) would wait forever for an event that is never coming.
describe("i18nBackend when there is nothing to initialise", () => {
	test("fires the callback immediately when i18next is already up", async () => {
		const callback = vi.fn();
		const { initializeI18n, harness } = await load({ isInitialized: true });

		const returned = initializeI18n(callback);

		expect(harness.initOptions).toHaveLength(0);
		expect(callback).toHaveBeenCalledTimes(1);
		expect(callback).toHaveBeenCalledWith(harness.fake);
		expect(returned).toBe(harness.fake);
	});

	test("fires the callback immediately when running client side", async () => {
		// The filesystem backend cannot work in a browser, so initialisation is
		// correctly skipped — but the caller still has to be released.
		const callback = vi.fn();
		const { initializeI18n, harness } = await load({ serverSide: false });

		const returned = initializeI18n(callback);

		expect(harness.initOptions).toHaveLength(0);
		expect(callback).toHaveBeenCalledTimes(1);
		expect(returned).toBe(harness.fake);
	});

	test("registers no plugins when initialisation is skipped", async () => {
		const { initializeI18n, harness } = await load({ isInitialized: true });
		initializeI18n();
		expect(harness.plugins).toHaveLength(0);
	});

	test("tolerates no callback when initialisation is skipped", async () => {
		const { initializeI18n } = await load({ isInitialized: true });
		expect(() => initializeI18n()).not.toThrow();
	});
});
