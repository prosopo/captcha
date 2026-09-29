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
import type { Ti18n } from "../types.js";

// The module keeps a singleton, so every test re-imports it under a fresh
// registry. `fetch`, `localStorage`, `navigator.languages` and `document.cookie`
// are the module's four inputs and are all stubbed per test.

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

	test("prefers a cookie over the browser", async () => {
		const harness = await load({
			catalogues: { es: {}, en: {} },
			cookie: "es",
			stored: "de",
			languages: ["it"],
		});

		expect((await initialised(harness)).language).toBe("es");
	});

	test("prefers stored over the browser", async () => {
		const harness = await load({
			catalogues: { de: {}, en: {} },
			stored: "de",
			languages: ["it"],
		});

		expect((await initialised(harness)).language).toBe("de");
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

	test("remembers the language in both cookie and storage", async () => {
		// Kept from the i18next language detector: a visitor who has picked a
		// language keeps it across pages that embed the widget.
		const harness = await load({ catalogues: { fr: {}, en: {} } });

		await initialised(harness, "fr");

		expect(harness.stored().i18nextLng).toBe("fr");
		expect(harness.cookie()).toContain("i18next=fr");
	});
});

describe("fetching catalogues", () => {
	test("loads the active language from the directory the module came from", async () => {
		const harness = await load({ catalogues: { fr: {}, en: {} } });

		await initialised(harness, "fr");

		expect(
			harness.requested.some((url) =>
				url.endsWith("/locales/fr/translation.json"),
			),
		).toBe(true);
	});

	test("loads English alongside it, for keys a translation is missing", async () => {
		const harness = await load({ catalogues: { fr: {}, en: {} } });

		await initialised(harness, "fr");

		expect(harness.requested).toHaveLength(2);
		expect(
			harness.requested.some((url) =>
				url.endsWith("/locales/en/translation.json"),
			),
		).toBe(true);
	});

	test("fetches once when the active language is already English", async () => {
		const harness = await load({ catalogues: { en: {} } });

		await initialised(harness, "en");

		expect(harness.requested).toHaveLength(1);
	});
});

describe("translating", () => {
	test("reads a nested key by its dotted path", async () => {
		const harness = await load({
			catalogues: { en: { WIDGET: { I_AM_HUMAN: "I am human" } } },
		});

		expect((await initialised(harness)).t("WIDGET.I_AM_HUMAN")).toBe(
			"I am human",
		);
	});

	test("substitutes interpolation values", async () => {
		const harness = await load({
			catalogues: { en: { POSITION: "{{x}} across, {{y}} down" } },
		});

		expect((await initialised(harness)).t("POSITION", { x: 10, y: 20 })).toBe(
			"10 across, 20 down",
		);
	});

	test("falls back to English when the translation lacks the key", async () => {
		const harness = await load({
			catalogues: { fr: { KEPT: "gardé" }, en: { KEPT: "kept", ONLY: "only" } },
		});
		const i18n = await initialised(harness, "fr");

		expect(i18n.t("KEPT")).toBe("gardé");
		expect(i18n.t("ONLY")).toBe("only");
	});

	test("falls back to the caller's default when no catalogue has the key", async () => {
		const harness = await load({ catalogues: { en: {} } });

		expect(
			(await initialised(harness)).t("WIDGET.CHECKING", {
				defaultValue: "Checking that you are human",
			}),
		).toBe("Checking that you are human");
	});

	test("interpolates the default too", async () => {
		const harness = await load({ catalogues: { en: {} } });

		expect(
			(await initialised(harness)).t("POSITION", {
				defaultValue: "{{x}} across",
				x: 7,
			}),
		).toBe("7 across");
	});

	test("falls back to the key when there is no default either", async () => {
		const harness = await load({ catalogues: { en: {} } });

		expect((await initialised(harness)).t("WIDGET.MISSING")).toBe(
			"WIDGET.MISSING",
		);
	});

	test("leaves a placeholder alone when no value was supplied for it", async () => {
		const harness = await load({
			catalogues: { en: { GREET: "hello {{name}}" } },
		});

		expect((await initialised(harness)).t("GREET", { other: 1 })).toBe(
			"hello {{name}}",
		);
	});
});

describe("when the catalogue cannot be fetched", () => {
	test("still initialises, so the widget renders untranslated", async () => {
		// Untranslated beats absent: a widget whose label never arrives is a
		// widget the visitor cannot use.
		const harness = await load({ catalogues: {}, fetchFails: true });

		const i18n = await initialised(harness);

		expect(i18n.isInitialized).toBe(true);
		expect(i18n.t("WIDGET.CHECKING", { defaultValue: "Checking" })).toBe(
			"Checking",
		);
	});

	test("reports the namespace as loaded so callers stop waiting", async () => {
		const harness = await load({ catalogues: {}, fetchFails: true });

		expect((await initialised(harness)).hasLoadedNamespace("translation")).toBe(
			true,
		);
	});
});

describe("switching language", () => {
	test("loads the new catalogue and translates against it", async () => {
		const harness = await load({
			catalogues: { en: { YES: "yes" }, de: { YES: "ja" } },
		});
		const i18n = await initialised(harness, "en");

		await i18n.changeLanguage("de");

		expect(i18n.language).toBe("de");
		expect(i18n.t("YES")).toBe("ja");
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
		const harness = await load({ catalogues: { en: {} } });
		const first = await initialised(harness);
		const before = harness.requested.length;

		const second = harness.initializeI18n();

		expect(second).toBe(first);
		expect(harness.requested).toHaveLength(before);
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
		harness = await load({ never: true });
	});

	test("reports itself uninitialised", () => {
		expect(harness.initializeI18n().isInitialized).toBe(false);
	});

	test("reports the namespace as not loaded", () => {
		expect(harness.initializeI18n().hasLoadedNamespace("translation")).toBe(
			false,
		);
	});
});
