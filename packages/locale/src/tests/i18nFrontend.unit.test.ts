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

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import widgetEn from "../locales/en/widget.json" with { type: "json" };
import type { Ti18n } from "../types.js";

// The module keeps a singleton, so every test re-imports it under a fresh
// registry. `fetch` and `navigator.languages` are the module's inputs;
// `localStorage` and `document.cookie` are stubbed to prove it leaves them alone.

type Catalogues = Record<string, Record<string, unknown>>;

interface Harness {
	initializeI18n: (callback?: (value: Ti18n) => void, lng?: string) => Ti18n;
	/** Every URL passed to fetch, in call order. */
	requested: string[];
	cookie: () => string;
	stored: () => Record<string, string>;
}

const load = async (options: {
	catalogues?: Catalogues;
	languages?: string[];
	cookie?: string;
	stored?: string;
	fetchFails?: boolean;
	never?: boolean;
}): Promise<Harness> => {
	vi.resetModules();

	const requested: string[] = [];
	const store: Record<string, string> = options.stored
		? { i18nextLng: options.stored }
		: {};
	let cookie = options.cookie ? `i18next=${options.cookie}` : "";

	vi.stubGlobal(
		"fetch",
		vi.fn(async (url: string): Promise<Response> => {
			requested.push(url);
			if (options.never) {
				return new Promise<Response>(() => undefined);
			}
			if (options.fetchFails) {
				throw new Error("network down");
			}
			const language = url.split("/").at(-2) ?? "";
			const body = options.catalogues?.[language];
			return {
				ok: body !== undefined,
				json: async (): Promise<unknown> => body,
			} as Response;
		}),
	);
	vi.stubGlobal("localStorage", {
		getItem: (key: string): string | null => store[key] ?? null,
		setItem: (key: string, value: string): void => {
			store[key] = value;
		},
	});
	vi.stubGlobal("navigator", { languages: options.languages ?? ["en"] });
	vi.stubGlobal("document", {
		get cookie(): string {
			return cookie;
		},
		set cookie(value: string) {
			cookie = value;
		},
	});

	const imported = await import("../i18nFrontend.js");
	return {
		initializeI18n: imported.default,
		requested,
		cookie: (): string => cookie,
		stored: (): Record<string, string> => store,
	};
};

/** Resolves with the instance the init callback hands back. */
const initialised = async (harness: Harness, lng?: string): Promise<Ti18n> =>
	new Promise<Ti18n>((resolve) => {
		harness.initializeI18n(resolve, lng);
	});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.resetModules();
});

describe("choosing a language", () => {
	test("uses the language the caller asked for", async () => {
		// The site owner's `data-language` is the single source of truth: reading
		// the browser first would render a flash of the wrong language.
		const harness = await load({
			catalogues: { fr: {}, en: {} },
			languages: ["de"],
		});

		const i18n = await initialised(harness, "fr");

		expect(i18n.language).toBe("fr");
	});

	test("falls back to the browser when nothing is remembered", async () => {
		const harness = await load({
			catalogues: { it: {}, en: {} },
			languages: ["it"],
		});

		expect((await initialised(harness)).language).toBe("it");
	});

	test("resolves a regional tag to its base language", async () => {
		// Browsers report en-GB, pt-PT and so on; only the base languages (plus
		// the handful of regional catalogues) are shipped.
		const harness = await load({
			catalogues: { en: {} },
			languages: ["de-AT"],
		});

		expect((await initialised(harness)).language).toBe("de");
	});

	test("ignores a language with no catalogue", async () => {
		const harness = await load({ catalogues: { en: {} }, languages: ["xx"] });

		expect((await initialised(harness)).language).toBe("en");
	});

	test("ignores a language the host page stored in cookie or storage", async () => {
		// The i18next cookie and `i18nextLng` key belong to the host site's own
		// i18n, not to the visitor's choice of widget language.
		const harness = await load({
			catalogues: { es: {}, de: {}, it: {}, en: {} },
			cookie: "es",
			stored: "de",
			languages: ["it"],
		});

		expect((await initialised(harness)).language).toBe("it");
	});

	test("writes nothing to cookie or storage", async () => {
		const harness = await load({ catalogues: { fr: {}, de: {}, en: {} } });

		const i18n = await initialised(harness, "fr");
		await i18n.changeLanguage("de");

		expect(harness.stored()).toEqual({});
		expect(harness.cookie()).toBe("");
	});

	test("takes the first browser language with a catalogue", async () => {
		const harness = await load({
			catalogues: { it: {}, en: {} },
			languages: ["xx", "it-IT", "fr"],
		});

		expect((await initialised(harness)).language).toBe("it");
	});

	test("takes the first supported code from a comma list", async () => {
		const harness = await load({
			catalogues: { tr: {}, en: {} },
			languages: ["de"],
		});

		expect((await initialised(harness, "xx, tr-TR, fr")).language).toBe("tr");
	});

	test("falls back to the browser when no requested code is supported", async () => {
		const harness = await load({
			catalogues: { de: {}, en: {} },
			languages: ["de"],
		});

		expect((await initialised(harness, "xx")).language).toBe("de");
	});

	test("reads Norwegian Bokmål as Norwegian", async () => {
		const harness = await load({
			catalogues: { no: {}, en: {} },
			languages: ["nb-NO"],
		});

		expect((await initialised(harness)).language).toBe("no");
	});
});

describe("fetching catalogues", () => {
	test("loads only the active language's widget namespace, from the module's directory", async () => {
		// Image labels and server-only text live in other namespaces the
		// browser never needs: the provider translates the labels itself.
		const harness = await load({ catalogues: { fr: {} } });

		await initialised(harness, "fr");

		expect(harness.requested).toHaveLength(1);
		expect(harness.requested[0]).toMatch(/\/locales\/fr\/widget\.json$/);
	});

	test("does not fetch English, which is bundled", async () => {
		const harness = await load({ catalogues: { en: {} } });

		await initialised(harness, "en");

		expect(harness.requested).toEqual([]);
	});
});

describe("translating", () => {
	test("reads a nested key by its dotted path", async () => {
		const harness = await load({
			catalogues: { fr: { WIDGET: { I_AM_HUMAN: "Je suis humain" } } },
		});

		expect((await initialised(harness, "fr")).t("WIDGET.I_AM_HUMAN")).toBe(
			"Je suis humain",
		);
	});

	test("has English text with no fetch at all", async () => {
		const harness = await load({ fetchFails: true });

		expect((await initialised(harness, "en")).t("WIDGET.I_AM_HUMAN")).toBe(
			widgetEn.WIDGET.I_AM_HUMAN,
		);
	});

	test("substitutes interpolation values", async () => {
		const harness = await load({
			catalogues: {
				fr: { WIDGET: { PUZZLE: { POSITION: "{{x}} across, {{y}} down" } } },
			},
		});

		expect(
			(await initialised(harness, "fr")).t("WIDGET.PUZZLE.POSITION", {
				x: 10,
				y: 20,
			}),
		).toBe("10 across, 20 down");
	});

	test("falls back to English when the translation lacks the key", async () => {
		const harness = await load({
			catalogues: {
				fr: { WIDGET: { SUBMIT: "gardé" } },
			},
		});
		const i18n = await initialised(harness, "fr");

		expect(i18n.t("WIDGET.SUBMIT")).toBe("gardé");
		expect(i18n.t("WIDGET.CANCEL")).toBe(widgetEn.WIDGET.CANCEL);
	});

	// A server-only key: no widget catalogue, English included, has its text.
	test("falls back to the caller's default when no catalogue has the key", async () => {
		const harness = await load({ catalogues: { en: {} } });

		expect(
			(await initialised(harness)).t("DATABASE.UNKNOWN", {
				defaultValue: "Checking that you are human",
			}),
		).toBe("Checking that you are human");
	});

	test("interpolates the default too", async () => {
		const harness = await load({ catalogues: { en: {} } });

		expect(
			(await initialised(harness)).t("DATABASE.UNKNOWN", {
				defaultValue: "{{x}} across",
				x: 7,
			}),
		).toBe("7 across");
	});

	test("falls back to the key when there is no default either", async () => {
		const harness = await load({ catalogues: { en: {} } });

		expect((await initialised(harness)).t("DATABASE.UNKNOWN")).toBe(
			"DATABASE.UNKNOWN",
		);
	});

	test("leaves a placeholder alone when no value was supplied for it", async () => {
		const harness = await load({
			catalogues: { fr: { WIDGET: { SUBMIT: "hello {{name}}" } } },
		});

		expect(
			(await initialised(harness, "fr")).t("WIDGET.SUBMIT", { other: 1 }),
		).toBe("hello {{name}}");
	});
});

describe("when the catalogue cannot be fetched", () => {
	test("still initialises, so the widget renders untranslated", async () => {
		// Untranslated beats absent: a widget whose label never arrives is a
		// widget the visitor cannot use.
		const harness = await load({ catalogues: {}, fetchFails: true });

		const i18n = await initialised(harness, "fr");

		expect(i18n.isInitialized).toBe(true);
		expect(i18n.t("WIDGET.CHECKING")).toBe(widgetEn.WIDGET.CHECKING);
	});

	test("reports the namespace as loaded so callers stop waiting", async () => {
		const harness = await load({ catalogues: {}, fetchFails: true });

		expect(
			(await initialised(harness, "fr")).hasLoadedNamespace("widget"),
		).toBe(true);
	});

	test("never reports a namespace the browser does not load", async () => {
		const harness = await load({ catalogues: { fr: {} } });
		const i18n = await initialised(harness, "fr");

		expect(i18n.hasLoadedNamespace("target")).toBe(false);
		expect(i18n.hasLoadedNamespace("translation")).toBe(false);
	});
});

describe("switching language", () => {
	test("loads the new catalogue and translates against it", async () => {
		const harness = await load({
			catalogues: {
				de: { WIDGET: { SUBMIT: "ja" } },
			},
		});
		const i18n = await initialised(harness, "en");

		await i18n.changeLanguage("de");

		expect(i18n.language).toBe("de");
		expect(i18n.t("WIDGET.SUBMIT")).toBe("ja");
	});

	test("notifies subscribers", async () => {
		const harness = await load({ catalogues: { en: {}, de: {} } });
		const i18n = await initialised(harness, "en");
		const listener = vi.fn();
		i18n.on("languageChanged", listener);

		await i18n.changeLanguage("de");

		expect(listener).toHaveBeenCalled();
	});

	test("does nothing when the language is already active", async () => {
		const harness = await load({ catalogues: { en: {} } });
		const i18n = await initialised(harness, "en");
		const before = harness.requested.length;

		await i18n.changeLanguage("en");

		expect(harness.requested).toHaveLength(before);
	});

	test("unsubscribed listeners stop being called", async () => {
		const harness = await load({ catalogues: { en: {}, de: {} } });
		const i18n = await initialised(harness, "en");
		const listener = vi.fn();
		i18n.on("languageChanged", listener);
		i18n.off("languageChanged", listener);

		await i18n.changeLanguage("de");

		expect(listener).not.toHaveBeenCalled();
	});
});

describe("the singleton", () => {
	test("a second call reuses the instance rather than refetching", async () => {
		// Every widget on the page shares one catalogue fetch.
		const harness = await load({ catalogues: { fr: {} } });
		const first = await initialised(harness, "fr");

		const second = harness.initializeI18n();

		expect(second).toBe(first);
		expect(harness.requested).toHaveLength(1);
	});

	test("a second call still fires its callback", async () => {
		// The one-shot callback is only armed on first init, so without this
		// loadI18next() would never settle for the second widget.
		const harness = await load({ catalogues: { en: {} } });
		await initialised(harness);

		const callback = vi.fn();
		harness.initializeI18n(callback);

		expect(callback).toHaveBeenCalledTimes(1);
	});
});

describe("before the catalogue arrives", () => {
	let harness: Harness;

	beforeEach(async () => {
		harness = await load({ never: true, languages: ["fr"] });
	});

	test("reports itself uninitialised", () => {
		expect(harness.initializeI18n().isInitialized).toBe(false);
	});

	test("reports the namespace as not loaded", () => {
		expect(harness.initializeI18n().hasLoadedNamespace("widget")).toBe(false);
	});
});
