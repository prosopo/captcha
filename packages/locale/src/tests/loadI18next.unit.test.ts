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

import type { i18n } from "i18next";
import { afterEach, describe, expect, test, vi } from "vitest";

// loadI18next keeps a module-level singleton, so every test re-imports it
// under a fresh registry. The two i18n implementations are mocked out: they
// pull in i18next, its plugins and the filesystem, none of which this module's
// own logic depends on.

/** The slice of the i18next instance loadI18next actually touches. */
interface FakeI18n {
	language: string;
	changeLanguage: (lng: string) => Promise<unknown>;
}

/** One cast, confined here, so the mocked module keeps the real signature. */
const asI18n = (fake: FakeI18n): i18n => fake as unknown as i18n;

type InitializeI18n = (
	callback?: (instance: i18n) => void,
	lng?: string,
) => i18n;

interface Harness {
	instance: FakeI18n;
	initialize: ReturnType<typeof vi.fn<InitializeI18n>>;
}

/**
 * Install a mock for one of the two i18n implementations.
 *
 * `resolveWith` decides when the init callback fires — immediately (the
 * "resources already loaded" case), asynchronously (the normal `loaded` event),
 * or never (initialisation that stalls).
 */
const install = (
	module: "../i18nBackend.js" | "../i18nFrontend.js",
	options: {
		language?: string;
		fire?: "sync" | "async" | "never";
		changeLanguage?: (lng: string) => Promise<unknown>;
	} = {},
): Harness => {
	const instance: FakeI18n = {
		language: options.language ?? "en",
		changeLanguage:
			options.changeLanguage ??
			(async (lng: string): Promise<unknown> => {
				instance.language = lng;
				return undefined;
			}),
	};

	const initialize = vi.fn<InitializeI18n>((callback) => {
		const fire = options.fire ?? "async";
		if (fire === "sync") {
			callback?.(asI18n(instance));
		} else if (fire === "async") {
			queueMicrotask(() => callback?.(asI18n(instance)));
		}
		return asI18n(instance);
	});

	vi.doMock(module, () => ({ default: initialize }));
	return { instance, initialize };
};

const loadModule = async (): Promise<
	(backend: boolean, lng?: string) => Promise<i18n>
> => {
	const imported = await import("../loadI18next.js");
	return imported.default;
};

afterEach(() => {
	vi.useRealTimers();
	vi.resetModules();
	vi.doUnmock("../i18nBackend.js");
	vi.doUnmock("../i18nFrontend.js");
	vi.restoreAllMocks();
});

describe("loadI18next, backend", () => {
	test("initialises once and resolves with the instance", async () => {
		const { instance, initialize } = install("../i18nBackend.js");
		const loadI18next = await loadModule();

		const resolved = await loadI18next(true);

		expect(initialize).toHaveBeenCalledTimes(1);
		expect(resolved).toBe(asI18n(instance));
	});

	test("resolves from the callback, not from the return value", async () => {
		// The distinction matters: the return value is available synchronously
		// but the resources are not. Resolving early would hand back an
		// instance that cannot translate anything yet.
		const { initialize } = install("../i18nBackend.js", { fire: "never" });
		const loadI18next = await loadModule();

		let settled = false;
		void loadI18next(true).then(() => {
			settled = true;
		});
		// Long enough for the dynamic import to resolve and init to be called;
		// the promise still must not settle, because the callback never fires.
		await new Promise((resolve) => setTimeout(resolve, 20));

		expect(initialize).toHaveBeenCalledTimes(1);
		expect(settled).toBe(false);
	});

	test("reuses the singleton on a second call without re-initialising", async () => {
		const { instance, initialize } = install("../i18nBackend.js");
		const loadI18next = await loadModule();

		const first = await loadI18next(true);
		const second = await loadI18next(true);

		expect(initialize).toHaveBeenCalledTimes(1);
		expect(second).toBe(first);
		expect(second).toBe(asI18n(instance));
	});

	test("ignores lng on the backend path — the server detects per request", async () => {
		// Server-side language comes from the Accept-Language header via the
		// middleware's detector, so pinning one language at init would be wrong.
		const { instance, initialize } = install("../i18nBackend.js", {
			language: "en",
		});
		const loadI18next = await loadModule();

		await loadI18next(true, "fr");

		expect(initialize.mock.calls[0]?.[1]).toBeUndefined();
		expect(instance.language).toBe("en");
	});

	test("rejects, rather than hanging, when the module fails to load", async () => {
		// A synchronous try/catch cannot see a rejected dynamic import. Without
		// an explicit .catch the promise would stay pending forever and hang
		// the server bootstrap that awaits it.
		vi.doMock("../i18nBackend.js", () => {
			throw new Error("backend module blew up");
		});
		const loadI18next = await loadModule();

		// The assertion is that it settles at all. vitest rewraps a failing mock
		// factory in its own error, so the message is not ours to match on — the
		// behaviour under test is rejection instead of an indefinite hang.
		await expect(loadI18next(true)).rejects.toThrow();
	});
});

describe("loadI18next, frontend", () => {
	test("initialises once and resolves with the instance", async () => {
		const { instance, initialize } = install("../i18nFrontend.js");
		const loadI18next = await loadModule();

		const resolved = await loadI18next(false);

		expect(initialize).toHaveBeenCalledTimes(1);
		expect(resolved).toBe(asI18n(instance));
	});

	test("passes lng straight into init so browser detection is skipped", async () => {
		const { initialize } = install("../i18nFrontend.js", { language: "fr" });
		const loadI18next = await loadModule();

		await loadI18next(false, "fr");

		expect(initialize.mock.calls[0]?.[1]).toBe("fr");
	});

	test("does not call changeLanguage when init already produced the target", async () => {
		// Passing lng at init means the resources are already the right ones;
		// a redundant changeLanguage would trigger a second load and a visible
		// re-render.
		const changeLanguage = vi.fn(async (): Promise<unknown> => undefined);
		install("../i18nFrontend.js", { language: "fr", changeLanguage });
		const loadI18next = await loadModule();

		await loadI18next(false, "fr");

		expect(changeLanguage).not.toHaveBeenCalled();
	});

	test("does not call changeLanguage when no language was requested", async () => {
		const changeLanguage = vi.fn(async (): Promise<unknown> => undefined);
		install("../i18nFrontend.js", { language: "de", changeLanguage });
		const loadI18next = await loadModule();

		await loadI18next(false);

		expect(changeLanguage).not.toHaveBeenCalled();
	});

	test("reconciles when init settled on a different language", async () => {
		const changeLanguage = vi.fn(async (): Promise<unknown> => undefined);
		install("../i18nFrontend.js", { language: "en", changeLanguage });
		const loadI18next = await loadModule();

		await loadI18next(false, "fr");

		expect(changeLanguage).toHaveBeenCalledWith("fr");
	});

	test("reconciles a pre-existing singleton before resolving", async () => {
		// The second widget on a page asks for a different language. Resolving
		// without reconciling would render a flash of the first widget's
		// language.
		const { instance, initialize } = install("../i18nFrontend.js", {
			language: "en",
		});
		const loadI18next = await loadModule();

		await loadI18next(false);
		const second = await loadI18next(false, "fr");

		expect(initialize).toHaveBeenCalledTimes(1);
		expect(instance.language).toBe("fr");
		expect(second).toBe(asI18n(instance));
	});

	test("resolves the cached singleton unchanged when lng is omitted", async () => {
		const changeLanguage = vi.fn(async (): Promise<unknown> => undefined);
		install("../i18nFrontend.js", { language: "de", changeLanguage });
		const loadI18next = await loadModule();

		await loadI18next(false);
		await loadI18next(false);

		expect(changeLanguage).not.toHaveBeenCalled();
	});

	test("rejects, rather than hanging, when the module fails to load", async () => {
		vi.doMock("../i18nFrontend.js", () => {
			throw new Error("frontend module blew up");
		});
		const loadI18next = await loadModule();

		// See the backend equivalent: rejection, not the message, is the point.
		await expect(loadI18next(false)).rejects.toThrow();
	});

	test("rejects when changeLanguage fails during first-load reconciliation", async () => {
		// changeLanguage hits the network for the target resources, so it can
		// genuinely fail. The caller has to learn about it instead of waiting.
		install("../i18nFrontend.js", {
			language: "en",
			changeLanguage: async (): Promise<unknown> => {
				throw new Error("resource fetch failed");
			},
		});
		const loadI18next = await loadModule();

		await expect(loadI18next(false, "fr")).rejects.toThrow(
			"resource fetch failed",
		);
	});

	test("rejects when changeLanguage fails while reconciling the singleton", async () => {
		let failing = false;
		install("../i18nFrontend.js", {
			language: "en",
			changeLanguage: async (): Promise<unknown> => {
				if (failing) {
					throw new Error("resource fetch failed");
				}
				return undefined;
			},
		});
		const loadI18next = await loadModule();

		await loadI18next(false);
		failing = true;

		await expect(loadI18next(false, "fr")).rejects.toThrow(
			"resource fetch failed",
		);
	});
});

describe("loadI18next, timeout", () => {
	// Resolution is event-driven, and events are not guaranteed. Nothing above
	// this module times it out: cli.ts calls it with a bare .then, so a pending
	// promise there is a boot hang with no log line to explain it.

	test("resolves with the degraded instance when `loaded` never fires", async () => {
		// Resolve rather than reject: i18next renders the key itself for a
		// missing resource, so the widget still appears, untranslated. A
		// rejection is unhandled at both call sites and loses the widget
		// entirely.
		vi.useFakeTimers();
		const { instance } = install("../i18nBackend.js", { fire: "never" });
		const loadI18next = await loadModule();
		const { I18N_LOAD_TIMEOUT_MS } = await import("../loadI18next.js");

		const pending = loadI18next(true);
		await vi.advanceTimersByTimeAsync(I18N_LOAD_TIMEOUT_MS);

		await expect(pending).resolves.toBe(asI18n(instance));
	});

	test("does not fire early — the instance is not handed back before the deadline", async () => {
		vi.useFakeTimers();
		install("../i18nBackend.js", { fire: "never" });
		const loadI18next = await loadModule();
		const { I18N_LOAD_TIMEOUT_MS } = await import("../loadI18next.js");

		let settled = false;
		void loadI18next(true).then(() => {
			settled = true;
		});
		await vi.advanceTimersByTimeAsync(I18N_LOAD_TIMEOUT_MS - 1);

		expect(settled).toBe(false);
	});

	test("rejects on timeout when no instance was ever created", async () => {
		// Nothing to degrade to, so there is no resolution that would be honest.
		// Rejecting at least surfaces the failure instead of hanging.
		vi.useFakeTimers();
		vi.doMock("../i18nBackend.js", () => new Promise<never>(() => undefined));
		const loadI18next = await loadModule();
		const { I18N_LOAD_TIMEOUT_MS } = await import("../loadI18next.js");

		// Assert before advancing: the handler has to be attached when the timer
		// fires, or the rejection surfaces as an unhandled one.
		const assertion = expect(loadI18next(true)).rejects.toThrow(
			/did not load within/,
		);
		await vi.advanceTimersByTimeAsync(I18N_LOAD_TIMEOUT_MS);
		await assertion;
	});

	test("a normal load clears the timer, so a late event cannot re-settle it", async () => {
		// i18next emits `loaded` per namespace and again after changeLanguage.
		// Without the one-shot latch a later emission would call resolve again
		// and leave the timer armed.
		vi.useFakeTimers();
		let fire: ((instance: i18n) => void) | undefined;
		const instance: FakeI18n = {
			language: "en",
			changeLanguage: async (): Promise<unknown> => undefined,
		};
		const initialize = vi.fn<InitializeI18n>((callback) => {
			fire = callback;
			return asI18n(instance);
		});
		vi.doMock("../i18nBackend.js", () => ({ default: initialize }));
		const loadI18next = await loadModule();
		const { I18N_LOAD_TIMEOUT_MS } = await import("../loadI18next.js");

		const pending = loadI18next(true);
		await vi.advanceTimersByTimeAsync(0);
		fire?.(asI18n(instance));
		await expect(pending).resolves.toBe(asI18n(instance));

		// A second emission after the deadline must be inert.
		fire?.(asI18n(instance));
		await vi.advanceTimersByTimeAsync(I18N_LOAD_TIMEOUT_MS * 2);
		await expect(pending).resolves.toBe(asI18n(instance));
	});

	test("a failure arriving after the timeout cannot turn a resolved promise into a rejection", async () => {
		// The frontend path can still fail late: the init callback fires, and the
		// changeLanguage it triggers rejects, long after the deadline handed back
		// the degraded instance. Calling reject then would produce an unhandled
		// rejection on an already-settled promise.
		vi.useFakeTimers();
		let fire: ((instance: i18n) => void) | undefined;
		const instance: FakeI18n = {
			language: "en",
			changeLanguage: async (): Promise<unknown> => {
				throw new Error("resource fetch failed");
			},
		};
		const initialize = vi.fn<InitializeI18n>((callback) => {
			fire = callback;
			return asI18n(instance);
		});
		vi.doMock("../i18nFrontend.js", () => ({ default: initialize }));
		const loadI18next = await loadModule();
		const { I18N_LOAD_TIMEOUT_MS } = await import("../loadI18next.js");

		const pending = loadI18next(false, "fr");
		await vi.advanceTimersByTimeAsync(I18N_LOAD_TIMEOUT_MS);
		await expect(pending).resolves.toBe(asI18n(instance));

		fire?.(asI18n(instance));
		await vi.advanceTimersByTimeAsync(0);
		await expect(pending).resolves.toBe(asI18n(instance));
	});

	test("the deadline is long enough not to trip a healthy cold start", async () => {
		const { I18N_LOAD_TIMEOUT_MS } = await import("../loadI18next.js");
		expect(I18N_LOAD_TIMEOUT_MS).toBeGreaterThanOrEqual(5_000);
	});
});

describe("loadI18next, singleton shared across both paths", () => {
	// One module-level instance serves both entry points. A frontend caller
	// arriving after a backend caller gets the backend instance and never
	// initialises the frontend one. That is deliberate — there is only ever one
	// i18next — but it means the *first* caller decides the configuration.
	test("a frontend call after a backend call reuses the backend instance", async () => {
		const backend = install("../i18nBackend.js", { language: "en" });
		const frontend = install("../i18nFrontend.js", { language: "de" });
		const loadI18next = await loadModule();

		const first = await loadI18next(true);
		const second = await loadI18next(false);

		expect(backend.initialize).toHaveBeenCalledTimes(1);
		expect(frontend.initialize).not.toHaveBeenCalled();
		expect(second).toBe(first);
	});

	test("the later caller's language still wins via reconciliation", async () => {
		const backend = install("../i18nBackend.js", { language: "en" });
		install("../i18nFrontend.js");
		const loadI18next = await loadModule();

		await loadI18next(true);
		await loadI18next(false, "fr");

		expect(backend.instance.language).toBe("fr");
	});
});
