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

import type {
	BackendModule,
	InitOptions,
	NewableModule,
	ReadCallback,
	i18n,
} from "i18next";
import { LanguageDetector } from "i18next-http-middleware";
import { afterEach, describe, expect, test, vi } from "vitest";

// i18next is a mutable singleton and the module under test configures it as a
// side effect of the first call. Both are mocked so each test starts from a
// known `isInitialized` state without a real filesystem backend.

type InitCallback = (error: unknown) => void;

// The real class: the module under test only hands it to i18next.use().
const detector: LanguageDetector = new LanguageDetector(null, {});

class FakeFsBackend implements BackendModule {
	static type = "backend" as const;
	type = "backend" as const;
	init(): void {}
	read(_language: string, _namespace: string, callback: ReadCallback): void {
		callback(null, {});
	}
}

interface FakeI18n {
	isInitialized: boolean;
	use: (plugin: unknown) => FakeI18n;
	init: (options: InitOptions, callback?: InitCallback) => FakeI18n;
	on: (event: string, listener: () => void) => void;
}

interface Harness {
	fake: FakeI18n;
	plugins: unknown[];
	initOptions: InitOptions[];
	listeners: Map<string, Array<() => void>>;
	emit: (event: string) => void;
	/** What i18next does once it has read every namespace file. */
	finishInit: (error?: unknown) => void;
}

const makeHarness = (isInitialized: boolean): Harness => {
	const plugins: unknown[] = [];
	const initOptions: InitOptions[] = [];
	const listeners = new Map<string, Array<() => void>>();
	const initCallbacks: InitCallback[] = [];

	const fake: FakeI18n = {
		isInitialized,
		use: (plugin: unknown): FakeI18n => {
			plugins.push(plugin);
			return fake;
		},
		init: (options: InitOptions, callback?: InitCallback): FakeI18n => {
			initOptions.push(options);
			if (callback) {
				initCallbacks.push(callback);
			}
			return fake;
		},
		on: (event: string, listener: () => void): void => {
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
		finishInit: (error?: unknown): void => {
			for (const callback of initCallbacks) {
				callback(error);
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
	fsBackend: (loaded?: unknown) => NewableModule<BackendModule>;
	harness: Harness;
}> => {
	vi.resetModules();
	const harness = makeHarness(options.isInitialized ?? false);

	vi.doMock("i18next", () => ({ default: harness.fake }));
	vi.doMock("i18next-fs-backend/cjs", () => ({ default: FakeFsBackend }));
	vi.doMock(
		"../requestLanguageDetector.js",
		(): typeof import("../requestLanguageDetector.js") => ({
			createRequestLanguageDetector: (): LanguageDetector => detector,
		}),
	);
	vi.doMock("../util.js", () => ({
		isServerSide: (): boolean => options.serverSide ?? true,
		isClientSide: (): boolean => !(options.serverSide ?? true),
	}));

	const imported = await import("../i18nBackend.js");
	return {
		initializeI18n: imported.default,
		fsBackend: imported.fsBackend,
		harness,
	};
};

afterEach(() => {
	vi.resetModules();
	vi.doUnmock("i18next");
	vi.doUnmock("i18next-fs-backend/cjs");
	vi.doUnmock("../requestLanguageDetector.js");
	vi.doUnmock("../util.js");
});

describe("i18nBackend on a server, not yet initialised", () => {
	test("initialises i18next exactly once", async () => {
		const { initializeI18n, harness } = await load({});
		initializeI18n();
		expect(harness.initOptions).toHaveLength(1);
	});

	test("registers the filesystem backend and the request language detector", async () => {
		// The detector is what makes Accept-Language work; losing it would
		// silently serve every request in the fallback language.
		const { initializeI18n, harness } = await load({});
		initializeI18n();
		expect(harness.plugins).toEqual([FakeFsBackend, detector]);
	});

	test("carries the shared options through to init", async () => {
		const { initializeI18n, harness } = await load({});
		initializeI18n();
		const options = harness.initOptions[0];
		expect(options?.fallbackLng).toBe("en");
		expect(options?.supportedLngs).toContain("en");
		expect(options?.nonExplicitSupportedLngs).toBe(false);
	});

	test("loads all three namespaces, server text by default", async () => {
		const { initializeI18n, harness } = await load({});
		initializeI18n();
		const options = harness.initOptions[0];
		expect(options?.ns).toEqual(["translation", "widget", "target"]);
		expect(options?.defaultNS).toBe("translation");
		// A key such as WIDGET.X or TARGET.owl resolves without a namespace.
		expect(options?.fallbackNS).toEqual(["widget", "target"]);
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

	test("defers the callback until init has read every namespace", async () => {
		const callback = vi.fn();
		const { initializeI18n, harness } = await load({});

		initializeI18n(callback);
		expect(callback).not.toHaveBeenCalled();

		harness.finishInit();
		expect(callback).toHaveBeenCalledTimes(1);
	});

	test("ignores `loaded`, which fires per batch and before init completes", async () => {
		// With three namespaces the first `loaded` arrives while `widget` and
		// `target` are still being read (i18nBackendFiles.unit.test.ts).
		const callback = vi.fn();
		const { initializeI18n, harness } = await load({});

		initializeI18n(callback);
		harness.emit("loaded");
		expect(callback).not.toHaveBeenCalled();
		harness.finishInit();
		harness.emit("loaded");
		expect(callback).toHaveBeenCalledTimes(1);
	});

	test("still calls back when a file failed to load", async () => {
		// i18next falls back to English or the key; a server that never
		// finishes booting is worse.
		const callback = vi.fn();
		const { initializeI18n, harness } = await load({});

		initializeI18n(callback);
		harness.finishInit(new Error("ENOENT"));
		expect(callback).toHaveBeenCalledWith(harness.fake);
	});

	test("hands the i18next instance to the callback", async () => {
		const callback = vi.fn();
		const { initializeI18n, harness } = await load({});
		initializeI18n(callback);
		harness.finishInit();
		expect(callback).toHaveBeenCalledWith(harness.fake);
	});

	test("returns the i18next instance", async () => {
		const { initializeI18n, harness } = await load({});
		expect(initializeI18n()).toBe(harness.fake);
	});

	test("tolerates being called with no callback at all", async () => {
		const { initializeI18n, harness } = await load({});
		initializeI18n();
		expect(() => harness.finishInit()).not.toThrow();
	});
});

describe("fsBackend", () => {
	test("returns the backend class the CJS entry exports", async () => {
		const { fsBackend } = await load({});
		expect(fsBackend()).toBe(FakeFsBackend);
	});

	test.each([
		["null", null],
		["a module namespace", { default: FakeFsBackend }],
		["a function that is not a backend", (): void => {}],
		[
			"a function of another module type",
			Object.assign((): void => {}, { type: "logger" }),
		],
	])("rejects %s", async (_name: string, loaded: unknown) => {
		const { fsBackend } = await load({});
		expect(() => fsBackend(loaded)).toThrow(
			"i18next-fs-backend/cjs did not export a backend class",
		);
	});
});

// Both of these skip initialisation. The init callback only exists on the
// init path, so without an explicit callback here the caller
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
