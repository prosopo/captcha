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
import type { handle } from "i18next-http-middleware";
import { afterEach, describe, expect, test, vi } from "vitest";

type HandleOptions = NonNullable<Parameters<typeof handle>[1]>;
type Handler = ReturnType<typeof handle>;

const asI18n = (value: object): i18n => value as unknown as i18n;

interface Harness {
	instance: i18n;
	handleCalls: [i18n, HandleOptions | undefined][];
	handler: Handler;
}

const load = async (options: {
	loadRejects?: boolean;
}): Promise<{
	i18nMiddleware: (opts: HandleOptions) => Promise<Handler>;
	harness: Harness;
}> => {
	vi.resetModules();

	const instance = asI18n({ name: "the singleton" });
	const handleCalls: [i18n, HandleOptions | undefined][] = [];
	const handler = ((): void => {}) as unknown as Handler;

	vi.doMock("i18next-http-middleware", () => ({
		handle: (i18next: i18n, opts?: HandleOptions): Handler => {
			handleCalls.push([i18next, opts]);
			return handler;
		},
	}));
	vi.doMock("../loadI18next.js", () => ({
		default: async (): Promise<i18n> => {
			if (options.loadRejects) {
				throw new Error("i18n failed to load");
			}
			return instance;
		},
	}));

	const imported = await import("../i18nMiddleware.js");
	return {
		i18nMiddleware: imported.default,
		harness: { instance, handleCalls, handler },
	};
};

afterEach(() => {
	vi.resetModules();
	vi.doUnmock("i18next-http-middleware");
	vi.doUnmock("../loadI18next.js");
});

describe("i18nMiddleware", () => {
	test("builds the handler from the loaded i18next instance", async () => {
		const { i18nMiddleware, harness } = await load({});

		const handler = await i18nMiddleware({});

		expect(harness.handleCalls).toHaveLength(1);
		expect(harness.handleCalls[0]?.[0]).toBe(harness.instance);
		expect(handler).toBe(harness.handler);
	});

	test("forwards the caller's options", async () => {
		const { i18nMiddleware, harness } = await load({});
		const options: HandleOptions = { ignoreRoutes: ["/healthz"] };

		await i18nMiddleware(options);

		expect(harness.handleCalls[0]?.[1]).toEqual({ ignoreRoutes: ["/healthz"] });
	});

	test("copies the options rather than passing the caller's object through", async () => {
		// handle() keeps the object for the lifetime of the process, so sharing
		// it would let a later mutation by the caller silently change routing.
		const { i18nMiddleware, harness } = await load({});
		const options: HandleOptions = { ignoreRoutes: ["/healthz"] };

		await i18nMiddleware(options);

		expect(harness.handleCalls[0]?.[1]).not.toBe(options);
	});

	test("accepts an empty options object", async () => {
		const { i18nMiddleware, harness } = await load({});
		await i18nMiddleware({});
		expect(harness.handleCalls[0]?.[1]).toEqual({});
	});

	test("always requests the backend instance", async () => {
		// Middleware only ever runs on the server; asking for the frontend
		// instance would pull in the browser detector and http backend.
		const loadSpy = vi.fn(async (): Promise<i18n> => asI18n({}));
		vi.resetModules();
		vi.doMock("i18next-http-middleware", () => ({
			handle: (): Handler => ((): void => {}) as unknown as Handler,
		}));
		vi.doMock("../loadI18next.js", () => ({ default: loadSpy }));

		const imported = await import("../i18nMiddleware.js");
		await imported.default({});

		expect(loadSpy).toHaveBeenCalledWith(true);
	});

	test("propagates a failure to load i18next instead of returning a broken handler", async () => {
		// The caller mounts whatever this resolves to. Swallowing the error
		// would mount a handler over an uninitialised i18next and fail on the
		// first request instead of at boot.
		const { i18nMiddleware } = await load({ loadRejects: true });

		await expect(i18nMiddleware({})).rejects.toThrow("i18n failed to load");
	});

	test("returns a fresh handler per call", async () => {
		const { i18nMiddleware, harness } = await load({});

		await i18nMiddleware({});
		await i18nMiddleware({ ignoreRoutes: ["/x"] });

		expect(harness.handleCalls).toHaveLength(2);
	});
});
