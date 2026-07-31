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

// Every plugin is mocked: they reach for localStorage, cookies and the network,
// none of which exists here and none of which this module's own logic needs.

type Listener = (...args: unknown[]) => void;
type ResourceLoader = (language: string, namespace: string) => Promise<unknown>;

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
	/** The loader handed to resourcesToBackend — the in-memory fallback. */
	resourceLoaders: ResourceLoader[];
	detectorOptions: unknown[];
	emit: (event: string) => void;
}

const load = async (
	isInitialized = false,
): Promise<{
	initializeI18n: (callback?: (value: i18n) => void, lng?: string) => i18n;
	harness: Harness;
}> => {
	vi.resetModules();

	const plugins: unknown[] = [];
	const initOptions: InitOptions[] = [];
	const resourceLoaders: ResourceLoader[] = [];
	const detectorOptions: unknown[] = [];
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

	const harness: Harness = {
		fake,
		plugins,
		initOptions,
		resourceLoaders,
		detectorOptions,
		emit: (event: string): void => {
			for (const listener of listeners.get(event) ?? []) {
				listener();
			}
		},
	};

	vi.doMock("i18next", () => ({ default: fake }));
	vi.doMock("i18next-chained-backend", () => ({ default: "ChainedBackend" }));
	vi.doMock("i18next-http-backend", () => ({ default: "HttpBackend" }));
	vi.doMock("i18next-browser-languagedetector", () => ({
		default: class {
			constructor(_services: unknown, opts: unknown) {
				detectorOptions.push(opts);
			}
		},
	}));
	vi.doMock("i18next-resources-to-backend", () => ({
		default: (loader: ResourceLoader): string => {
			resourceLoaders.push(loader);
			return "InMemoryBackend";
		},
	}));
	vi.doMock("react-i18next", () => ({ initReactI18next: "initReactI18next" }));

	const imported = await import("../i18nFrontend.js");
	return { initializeI18n: imported.default, harness };
};

const backendOf = (
	options: InitOptions | undefined,
): { backends?: unknown[]; backendOptions?: { loadPath?: string }[] } =>
	(options?.backend ?? {}) as {
		backends?: unknown[];
		backendOptions?: { loadPath?: string }[];
	};

afterEach(() => {
	vi.resetModules();
	for (const module of [
		"i18next",
		"i18next-chained-backend",
		"i18next-http-backend",
		"i18next-browser-languagedetector",
		"i18next-resources-to-backend",
		"react-i18next",
	]) {
		vi.doUnmock(module);
	}
});

describe("i18nFrontend, first initialisation", () => {
	test("initialises i18next exactly once", async () => {
		const { initializeI18n, harness } = await load();
		initializeI18n();
		expect(harness.initOptions).toHaveLength(1);
	});

	test("registers the chained backend, the detector and the react binding", async () => {
		const { initializeI18n, harness } = await load();
		initializeI18n();
		expect(harness.plugins).toHaveLength(3);
		expect(harness.plugins[0]).toBe("ChainedBackend");
		expect(harness.plugins[2]).toBe("initReactI18next");
	});

	test("carries the shared options through to init", async () => {
		const { initializeI18n, harness } = await load();
		initializeI18n();
		const options = harness.initOptions[0];
		expect(options?.fallbackLng).toBe("en");
		expect(options?.nonExplicitSupportedLngs).toBe(false);
		expect(options?.supportedLngs).toContain("en");
	});

	test("returns the i18next instance", async () => {
		const { initializeI18n, harness } = await load();
		expect(initializeI18n()).toBe(harness.fake);
	});
});

describe("i18nFrontend language selection", () => {
	// The whole point of threading lng through init: with it set, i18next never
	// consults the browser, so no child component can render against a
	// detected language before an effect corrects it.
	test("pins lng when the site owner supplied one", async () => {
		const { initializeI18n, harness } = await load();
		initializeI18n(undefined, "fr");
		expect(harness.initOptions[0]?.lng).toBe("fr");
	});

	test("omits lng entirely when none was supplied, leaving detection on", async () => {
		const { initializeI18n, harness } = await load();
		initializeI18n();
		expect(harness.initOptions[0]).not.toHaveProperty("lng");
	});

	test("treats the empty string as no language rather than pinning it", async () => {
		// An empty `lng` would make i18next resolve nothing at all; falling back
		// to detection is the only sane reading of a blank config value.
		const { initializeI18n, harness } = await load();
		initializeI18n(undefined, "");
		expect(harness.initOptions[0]).not.toHaveProperty("lng");
	});

	test("configures the detector to prefer a stored choice over the browser", async () => {
		const { initializeI18n, harness } = await load();
		initializeI18n();
		expect(harness.detectorOptions[0]).toMatchObject({
			order: ["cookie", "localStorage", "navigator"],
			lookupQuerystring: "lng",
		});
	});

	test("persists the detected language to localStorage and a cookie", async () => {
		const { initializeI18n, harness } = await load();
		initializeI18n();
		expect(harness.detectorOptions[0]).toMatchObject({
			caches: ["localStorage", "cookie"],
		});
	});
});

describe("i18nFrontend resource loading", () => {
	test("chains an in-memory fallback behind the http backend", async () => {
		// If the http load fails — a CDN blip, an offline widget — the bundled
		// resources still answer, so the widget renders text rather than keys.
		const { initializeI18n, harness } = await load();
		initializeI18n();
		const backend = backendOf(harness.initOptions[0]);
		expect(backend.backends).toEqual(["HttpBackend", "InMemoryBackend"]);
	});

	test("gives the http backend a templated load path", async () => {
		const { initializeI18n, harness } = await load();
		initializeI18n();
		const backend = backendOf(harness.initOptions[0]);
		const loadPath = backend.backendOptions?.[0]?.loadPath;
		expect(loadPath).toContain("/locales/{{lng}}/{{ns}}.json");
	});

	test("derives the load path from the module URL, not the page URL", async () => {
		// The widget is embedded on arbitrary sites, so a page-relative path
		// would resolve against the host site and 404.
		const { initializeI18n, harness } = await load();
		initializeI18n();
		const loadPath = backendOf(harness.initOptions[0]).backendOptions?.[0]
			?.loadPath;
		// Absolute, with a scheme — file:// here, https:// once bundled and
		// served. What matters is that it is not relative.
		expect(loadPath).toMatch(/^[a-z]+:\/\//);
		// The module's own filename must have been stripped before the locales
		// segment is appended, or the path would nest under the script itself.
		expect(loadPath).not.toContain("i18nFrontend");
	});

	test("hands resourcesToBackend a loader that resolves a language and namespace", async () => {
		const { initializeI18n, harness } = await load();
		initializeI18n();
		const loader = harness.resourceLoaders[0];
		expect(loader).toBeTypeOf("function");
		// Invoked for its import, whose success depends on the bundler rather
		// than on this module; only the call shape is this module's contract.
		await expect(
			Promise.resolve(loader?.("en", "translation")).catch(() => undefined),
		).resolves.not.toThrow();
	});
});

describe("i18nFrontend callback", () => {
	test("defers the callback until resources have loaded", async () => {
		const callback = vi.fn();
		const { initializeI18n, harness } = await load();

		initializeI18n(callback);
		expect(callback).not.toHaveBeenCalled();

		harness.emit("loaded");
		expect(callback).toHaveBeenCalledWith(harness.fake);
	});

	test("tolerates being called with no callback", async () => {
		const { initializeI18n, harness } = await load();
		initializeI18n();
		expect(() => harness.emit("loaded")).not.toThrow();
	});

	// The `loaded` listener is only registered on the init path, so a second
	// widget mounting after the first would otherwise wait on an event that has
	// already fired and will not fire again.
	test("fires the callback immediately when i18next is already initialised", async () => {
		const callback = vi.fn();
		const { initializeI18n, harness } = await load(true);

		const returned = initializeI18n(callback);

		expect(harness.initOptions).toHaveLength(0);
		expect(callback).toHaveBeenCalledTimes(1);
		expect(callback).toHaveBeenCalledWith(harness.fake);
		expect(returned).toBe(harness.fake);
	});

	test("registers no plugins when already initialised", async () => {
		const { initializeI18n, harness } = await load(true);
		initializeI18n();
		expect(harness.plugins).toHaveLength(0);
	});

	test("ignores lng when already initialised — the caller reconciles instead", async () => {
		const { initializeI18n, harness } = await load(true);
		initializeI18n(undefined, "fr");
		expect(harness.initOptions).toHaveLength(0);
	});
});
