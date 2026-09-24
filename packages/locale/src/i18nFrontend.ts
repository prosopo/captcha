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

import { flatten } from "@prosopo/util";
import { i18nSharedOptions } from "./i18SharedOptions.js";
import type { I18nEvent, Ti18n, TranslateOptions } from "./types.js";

const NAMESPACE = "translation";
const FALLBACK_LANGUAGE = i18nSharedOptions.fallbackLng;
const STORAGE_KEY = "i18nextLng";
const COOKIE_KEY = "i18next";
const COOKIE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

/**
 * How long to wait for a catalogue before rendering untranslated.
 *
 * A widget with no text is worse than a widget in English: every caller
 * supplies a `defaultValue`, and `t()` falls back to the key otherwise, so a
 * catalogue that never arrives degrades rather than blocks.
 */
const CATALOGUE_FETCH_TIMEOUT_MS = 10_000;

type Catalogue = Record<string, string>;

const SUPPORTED_LANGUAGES: readonly string[] = i18nSharedOptions.supportedLngs;

/**
 * Locale JSON sits next to the bundle that asked for it. The widget is embedded
 * by third parties and cannot know a base URL, but it does know where its own
 * module was served from.
 */
const catalogueUrl = (language: string): string => {
	const moduleUrl = import.meta.url;
	const directory = moduleUrl.slice(0, moduleUrl.lastIndexOf("/"));
	return `${directory}/locales/${language}/${NAMESPACE}.json`;
};

/**
 * `en-GB` is not in the catalogue list but `en` is, so a regional tag resolves
 * to its base language rather than falling all the way back to English.
 */
const resolveLanguage = (candidate: string | undefined): string | undefined => {
	if (!candidate) {
		return undefined;
	}
	if (SUPPORTED_LANGUAGES.includes(candidate)) {
		return candidate;
	}
	const base = candidate.split("-")[0];
	return base && SUPPORTED_LANGUAGES.includes(base) ? base : undefined;
};

const readCookie = (): string | undefined => {
	try {
		const match = document.cookie.match(
			new RegExp(`(?:^|; )${COOKIE_KEY}=([^;]*)`),
		);
		return match?.[1] ? decodeURIComponent(match[1]) : undefined;
	} catch {
		return undefined;
	}
};

const readStorage = (): string | undefined => {
	try {
		return localStorage.getItem(STORAGE_KEY) ?? undefined;
	} catch {
		return undefined;
	}
};

const navigatorLanguages = (): readonly string[] => {
	try {
		return navigator.languages?.length
			? navigator.languages
			: [navigator.language];
	} catch {
		return [];
	}
};

/**
 * Cookie and localStorage are both written, matching what the widget did when
 * i18next-browser-languagedetector handled this, so a visitor's choice survives
 * across pages that embed the widget. Either store can throw in a sandboxed
 * iframe or with third-party storage blocked; neither is load-bearing.
 */
const cacheLanguage = (language: string): void => {
	try {
		localStorage.setItem(STORAGE_KEY, language);
	} catch {
		// storage unavailable — the language is still active for this page
	}
	try {
		document.cookie = `${COOKIE_KEY}=${encodeURIComponent(language)};max-age=${COOKIE_MAX_AGE_SECONDS};path=/`;
	} catch {
		// cookies unavailable — as above
	}
};

const detectLanguage = (): string => {
	const candidates = [readCookie(), readStorage(), ...navigatorLanguages()];
	for (const candidate of candidates) {
		const resolved = resolveLanguage(candidate);
		if (resolved) {
			return resolved;
		}
	}
	return FALLBACK_LANGUAGE;
};

const fetchCatalogue = async (language: string): Promise<Catalogue> => {
	const controller = new AbortController();
	const timer = setTimeout(
		() => controller.abort(),
		CATALOGUE_FETCH_TIMEOUT_MS,
	);
	try {
		const response = await fetch(catalogueUrl(language), {
			signal: controller.signal,
		});
		if (!response.ok) {
			return {};
		}
		const body: unknown = await response.json();
		return typeof body === "object" && body !== null ? flatten(body) : {};
	} catch {
		return {};
	} finally {
		clearTimeout(timer);
	}
};

const interpolate = (template: string, options?: TranslateOptions): string =>
	options
		? template.replace(/\{\{(\w+)\}\}/g, (placeholder, name: string) =>
				name in options ? String(options[name]) : placeholder,
			)
		: template;

interface BrowserI18n extends Ti18n {
	/** Resolves once the active language's catalogue has been fetched. */
	ready(): Promise<BrowserI18n>;
}

const createBrowserI18n = (requested?: string): BrowserI18n => {
	const catalogues = new Map<string, Catalogue>();
	const listeners = new Map<I18nEvent, Set<() => void>>();
	let language = resolveLanguage(requested) ?? detectLanguage();
	let initialised = false;

	const emit = (event: I18nEvent): void => {
		for (const listener of listeners.get(event) ?? []) {
			listener();
		}
	};

	/**
	 * The fallback catalogue is fetched alongside the active one so a key
	 * missing from a translation still renders English rather than its key —
	 * the same key-level fallback i18next gave us via `fallbackLng`.
	 */
	const loadCatalogues = async (target: string): Promise<void> => {
		const wanted = [...new Set([target, FALLBACK_LANGUAGE])].filter(
			(candidate) => !catalogues.has(candidate),
		);
		await Promise.all(
			wanted.map(async (candidate) => {
				catalogues.set(candidate, await fetchCatalogue(candidate));
			}),
		);
	};

	const lookup = (candidate: string, key: string): string | undefined =>
		catalogues.get(candidate)?.[key];

	cacheLanguage(language);
	const loading = loadCatalogues(language).then(() => {
		initialised = true;
		emit("initialized");
		emit("loaded");
	});

	const instance: BrowserI18n = {
		get language(): string {
			return language;
		},
		get isInitialized(): boolean {
			return initialised;
		},
		t: (key: string, options?: TranslateOptions): string =>
			interpolate(
				lookup(language, key) ??
					lookup(FALLBACK_LANGUAGE, key) ??
					options?.defaultValue ??
					key,
				options,
			),
		hasLoadedNamespace: (namespace: string): boolean =>
			namespace === NAMESPACE && catalogues.has(language),
		changeLanguage: async (next: string): Promise<BrowserI18n> => {
			const resolved = resolveLanguage(next) ?? FALLBACK_LANGUAGE;
			if (resolved !== language) {
				language = resolved;
				cacheLanguage(resolved);
				await loadCatalogues(resolved);
				emit("loaded");
				emit("languageChanged");
			}
			return instance;
		},
		on: (event: I18nEvent, listener: () => void): void => {
			const existing = listeners.get(event) ?? new Set<() => void>();
			existing.add(listener);
			listeners.set(event, existing);
		},
		off: (event: I18nEvent, listener: () => void): void => {
			listeners.get(event)?.delete(listener);
		},
		ready: async (): Promise<BrowserI18n> => {
			await loading;
			return instance;
		},
	};

	return instance;
};

/**
 * The widget owns this instance. A host page running its own i18n must not be
 * able to capture the widget's translations, and every widget on the page
 * shares one catalogue fetch.
 */
let instance: BrowserI18n | undefined;

export function initializeI18n(
	i18nLoadedCallback?: (value: Ti18n) => void,
	lng?: string,
): Ti18n {
	if (!instance) {
		// Passing `lng` here rather than calling changeLanguage() afterwards is
		// what stops the widget rendering a flash of the browser's language
		// before the site owner's choice is applied.
		const created = createBrowserI18n(lng);
		instance = created;
		void created.ready().then(() => i18nLoadedCallback?.(created));
	} else {
		// Already built (a second widget on the page, or createTranslator() got
		// here first). The callback is only armed in the branch above, so it has
		// to fire here or loadI18next() never settles.
		i18nLoadedCallback?.(instance);
	}
	return instance;
}

export default initializeI18n;
