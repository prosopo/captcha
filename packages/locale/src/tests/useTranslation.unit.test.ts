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
import type { UseTranslationOptions } from "react-i18next";
import { afterEach, describe, expect, test, vi } from "vitest";

// The hook is a thin wrapper: it forces the package's own i18next instance in
// rather than letting react-i18next pick up whichever instance a host app's
// provider happens to expose. React itself is never rendered here, so both
// react-i18next and the frontend initialiser are mocked.

type DefaultCall = [string, { i18n: i18n } & Record<string, unknown>];

const asI18n = (value: object): i18n => value as unknown as i18n;

const load = async (): Promise<{
	useTranslation: (options?: UseTranslationOptions<"translation">) => unknown;
	instance: i18n;
	calls: DefaultCall[];
	initCount: () => number;
}> => {
	vi.resetModules();

	const instance = asI18n({ name: "package instance" });
	const calls: DefaultCall[] = [];
	let initCalls = 0;

	vi.doMock("../i18nFrontend.js", () => ({
		default: (): i18n => {
			initCalls += 1;
			return instance;
		},
	}));
	vi.doMock("react-i18next", () => ({
		useTranslation: (
			namespace: string,
			options: { i18n: i18n } & Record<string, unknown>,
		): unknown => {
			calls.push([namespace, options]);
			return { t: (key: string): string => key, i18n: options.i18n };
		},
	}));

	const imported = await import("../useTranslation.js");
	return {
		useTranslation: imported.default,
		instance,
		calls,
		initCount: (): number => initCalls,
	};
};

afterEach(() => {
	vi.resetModules();
	vi.doUnmock("../i18nFrontend.js");
	vi.doUnmock("react-i18next");
});

describe("useTranslation", () => {
	test("always asks for the translation namespace", async () => {
		const { useTranslation, calls } = await load();
		useTranslation();
		expect(calls[0]?.[0]).toBe("translation");
	});

	test("injects the package's own i18next instance", async () => {
		// Without this, a host application that mounts its own I18nextProvider
		// would capture the widget's translations and render its keys instead.
		const { useTranslation, calls, instance } = await load();
		useTranslation();
		expect(calls[0]?.[1].i18n).toBe(instance);
	});

	test("initialises the frontend instance on use", async () => {
		const { useTranslation, initCount } = await load();
		useTranslation();
		expect(initCount()).toBe(1);
	});

	test("works with no options at all", async () => {
		const { useTranslation, calls } = await load();
		useTranslation();
		expect(calls[0]?.[1]).toEqual({ i18n: expect.anything() });
	});

	test("passes caller options through", async () => {
		const { useTranslation, calls } = await load();
		useTranslation({ nsMode: "fallback", useSuspense: false });
		expect(calls[0]?.[1]).toMatchObject({
			nsMode: "fallback",
			useSuspense: false,
		});
	});

	test("lets the caller override the instance, since options spread last", async () => {
		// Worth pinning: the spread order means a caller-supplied i18n wins.
		// That is useful for tests and storybooks, and dangerous by accident,
		// so it should not change silently.
		const { useTranslation, calls, instance } = await load();
		const other = asI18n({ name: "caller instance" });

		useTranslation({ i18n: other } as UseTranslationOptions<"translation">);

		expect(calls[0]?.[1].i18n).toBe(other);
		expect(calls[0]?.[1].i18n).not.toBe(instance);
	});

	test("returns whatever react-i18next returns", async () => {
		const { useTranslation } = await load();
		const result = useTranslation() as { t: (key: string) => string };
		expect(result.t("WIDGET.SUBMIT")).toBe("WIDGET.SUBMIT");
	});

	test("re-initialises on every call, matching hook semantics", async () => {
		// initializeI18n is idempotent, so calling it per render is safe; the
		// test exists so that stops being true loudly rather than quietly.
		const { useTranslation, initCount } = await load();
		useTranslation();
		useTranslation();
		expect(initCount()).toBe(2);
	});
});
