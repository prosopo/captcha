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
import type { Translator } from "../translator.js";

// The translator is a thin wrapper: it forces the package's own i18next
// instance in rather than letting a host app's provider decide, and exposes the
// three events that used to drive a React re-render. i18next itself is mocked
// so the tests observe the wiring rather than i18next's own behaviour.

interface FakeI18n {
	readonly instance: i18n;
	readonly handlers: Map<string, Set<() => void>>;
	isInitialized: boolean;
	loadedNamespaces: string[];
	translations: Record<string, string>;
}

const fakeI18n = (): FakeI18n => {
	const handlers = new Map<string, Set<() => void>>();
	const fake: FakeI18n = {
		handlers,
		isInitialized: true,
		loadedNamespaces: ["translation"],
		translations: {},
		instance: {
			t: (key: string): string => fake.translations[key] ?? key,
			get isInitialized(): boolean {
				return fake.isInitialized;
			},
			hasLoadedNamespace: (namespace: string): boolean =>
				fake.loadedNamespaces.includes(namespace),
			on: (event: string, listener: () => void): void => {
				const existing = handlers.get(event) ?? new Set<() => void>();
				existing.add(listener);
				handlers.set(event, existing);
			},
			off: (event: string, listener: () => void): void => {
				handlers.get(event)?.delete(listener);
			},
		} as unknown as i18n,
	};
	return fake;
};

const emit = (fake: FakeI18n, event: string): void => {
	for (const listener of fake.handlers.get(event) ?? []) {
		listener();
	}
};

const load = async (): Promise<{
	createTranslator: (existing?: i18n) => Translator;
	packageInstance: i18n;
	initCount: () => number;
}> => {
	vi.resetModules();

	const packageInstance = fakeI18n().instance;
	let initCalls = 0;

	vi.doMock("../i18nFrontend.js", () => ({
		default: (): i18n => {
			initCalls += 1;
			return packageInstance;
		},
	}));

	const imported = await import("../translator.js");
	return {
		createTranslator: imported.createTranslator,
		packageInstance,
		initCount: (): number => initCalls,
	};
};

afterEach(() => {
	vi.resetModules();
	vi.doUnmock("../i18nFrontend.js");
});

describe("which i18next instance the translator talks to", () => {
	test("initialises the package's own instance when given none", async () => {
		// Without this, a host application running its own i18next would capture
		// the widget's translations and render its keys instead.
		const { createTranslator, packageInstance, initCount } = await load();

		const translator = createTranslator();

		expect(translator.i18n).toBe(packageInstance);
		expect(initCount()).toBe(1);
	});

	test("adopts an instance the caller already has", async () => {
		// The bundle loads i18next once and hands the same instance to every
		// widget on the page, so a second init would be wasted work.
		const { createTranslator, initCount } = await load();
		const existing = fakeI18n().instance;

		const translator = createTranslator(existing);

		expect(translator.i18n).toBe(existing);
		expect(initCount()).toBe(0);
	});
});

describe("translating", () => {
	test("delegates to the instance", async () => {
		const { createTranslator } = await load();
		const fake = fakeI18n();
		fake.translations = { "WIDGET.SUBMIT": "Submit" };

		expect(createTranslator(fake.instance).t("WIDGET.SUBMIT")).toBe("Submit");
	});

	test("reads the instance at call time, not at creation time", async () => {
		// A language switch mutates the instance in place; a translator that
		// cached `t` would keep serving the previous language.
		const { createTranslator } = await load();
		const fake = fakeI18n();
		const translator = createTranslator(fake.instance);

		fake.translations = { "WIDGET.SUBMIT": "Envoyer" };

		expect(translator.t("WIDGET.SUBMIT")).toBe("Envoyer");
	});
});

describe("readiness", () => {
	test("is ready once the instance has loaded the translation namespace", async () => {
		const { createTranslator } = await load();
		const fake = fakeI18n();

		expect(createTranslator(fake.instance).isReady()).toBe(true);
	});

	test("is not ready before initialisation", async () => {
		const { createTranslator } = await load();
		const fake = fakeI18n();
		fake.isInitialized = false;

		expect(createTranslator(fake.instance).isReady()).toBe(false);
	});

	test("is not ready while the namespace is still loading", async () => {
		// Widgets render an empty label until this flips, rather than flashing a
		// raw translation key at the user.
		const { createTranslator } = await load();
		const fake = fakeI18n();
		fake.loadedNamespaces = [];

		expect(createTranslator(fake.instance).isReady()).toBe(false);
	});
});

describe("subscribing", () => {
	test.each(["initialized", "loaded", "languageChanged"])(
		"notifies the listener on %s",
		async (event: string) => {
			const { createTranslator } = await load();
			const fake = fakeI18n();
			const listener = vi.fn<() => void>();

			createTranslator(fake.instance).subscribe(listener);
			emit(fake, event);

			expect(listener).toHaveBeenCalledTimes(1);
		},
	);

	test("stops notifying once unsubscribed", async () => {
		// Widgets unsubscribe on destroy; a leaked listener would keep a torn-down
		// widget alive for the lifetime of the page.
		const { createTranslator } = await load();
		const fake = fakeI18n();
		const listener = vi.fn<() => void>();

		const unsubscribe = createTranslator(fake.instance).subscribe(listener);
		unsubscribe();
		emit(fake, "languageChanged");

		expect(listener).not.toHaveBeenCalled();
	});

	test("keeps independent subscriptions apart", async () => {
		const { createTranslator } = await load();
		const fake = fakeI18n();
		const first = vi.fn<() => void>();
		const second = vi.fn<() => void>();
		const translator = createTranslator(fake.instance);

		const unsubscribeFirst = translator.subscribe(first);
		translator.subscribe(second);
		unsubscribeFirst();
		emit(fake, "loaded");

		expect(first).not.toHaveBeenCalled();
		expect(second).toHaveBeenCalledTimes(1);
	});
});
