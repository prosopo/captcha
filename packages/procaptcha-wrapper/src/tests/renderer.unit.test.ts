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

import type { ProcaptchaRenderOptions } from "@prosopo/types";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { RendererFunction } from "../render/renderFunction.js";
import {
	type LoadRenderFunction,
	type RendererSettings,
	createRenderer,
} from "../render/renderer.js";

const SETTINGS: RendererSettings = {
	scriptUrl: "https://example.test/procaptcha.bundle.js",
	scriptId: "procaptcha-script",
};

const options = (siteKey = "site-key"): ProcaptchaRenderOptions => ({
	siteKey,
});

/** A load that resolves to a spy render, counting how often it was invoked. */
const stubLoad = (
	render: RendererFunction,
): { load: LoadRenderFunction; calls: () => number } => {
	let calls = 0;
	const load: LoadRenderFunction = async (): Promise<RendererFunction> => {
		calls += 1;
		return render;
	};
	return { load, calls: () => calls };
};

/** A load whose resolution the test controls, for concurrency assertions. */
const deferredLoad = (): {
	load: LoadRenderFunction;
	resolve: (render: RendererFunction) => void;
	reject: (error: Error) => void;
	calls: () => number;
} => {
	let calls = 0;
	let resolveFn: (render: RendererFunction) => void = () => {};
	let rejectFn: (error: Error) => void = () => {};
	const load: LoadRenderFunction = (): Promise<RendererFunction> => {
		calls += 1;
		return new Promise<RendererFunction>((resolve, reject) => {
			resolveFn = resolve;
			rejectFn = reject;
		});
	};
	return {
		load,
		resolve: (render: RendererFunction): void => {
			resolveFn(render);
		},
		reject: (error: Error): void => {
			rejectFn(error);
		},
		calls: () => calls,
	};
};

afterEach(() => {
	document.head.innerHTML = "";
	document.body.innerHTML = "";
	window.procaptcha = undefined;
	vi.restoreAllMocks();
});

describe("createRenderer", () => {
	it("renders into the given element with the given options", async () => {
		const render = vi.fn<RendererFunction>(async (): Promise<void> => {});
		const { load } = stubLoad(render);
		const element = document.createElement("div");

		await createRenderer(SETTINGS, load)(element, options());

		expect(render).toHaveBeenCalledTimes(1);
		expect(render.mock.calls[0]?.[0]).toBe(element);
	});

	it("passes the configured script url and id to the loader", async () => {
		const load = vi.fn<LoadRenderFunction>(
			async (): Promise<RendererFunction> => async (): Promise<void> => {},
		);

		await createRenderer(SETTINGS, load)(
			document.createElement("div"),
			options(),
		);

		expect(load).toHaveBeenCalledWith(SETTINGS.scriptUrl, SETTINGS.scriptId);
	});

	it("loads the script only once across repeated renders", async () => {
		const { load, calls } = stubLoad(async (): Promise<void> => {});
		const renderer = createRenderer(SETTINGS, load);

		await renderer(document.createElement("div"), options());
		await renderer(document.createElement("div"), options());
		await renderer(document.createElement("div"), options());

		expect(calls()).toBe(1);
	});

	it("loads only once when renders overlap", async () => {
		// Caching the resolved function rather than the in-flight promise would
		// let both calls miss the cache and inject a second script tag.
		const deferred = deferredLoad();
		const renderer = createRenderer(SETTINGS, deferred.load);

		const first = renderer(document.createElement("div"), options());
		const second = renderer(document.createElement("div"), options());
		await Promise.resolve();

		expect(deferred.calls()).toBe(1);

		deferred.resolve(async (): Promise<void> => {});
		await Promise.all([first, second]);
		expect(deferred.calls()).toBe(1);
	});

	it("renders every overlapping call once the script arrives", async () => {
		const render = vi.fn<RendererFunction>(async (): Promise<void> => {});
		const deferred = deferredLoad();
		const renderer = createRenderer(SETTINGS, deferred.load);

		const pending = [
			renderer(document.createElement("div"), options()),
			renderer(document.createElement("div"), options()),
		];
		deferred.resolve(render);
		await Promise.all(pending);

		expect(render).toHaveBeenCalledTimes(2);
	});

	it("clones the options so the render function cannot mutate the caller's object", async () => {
		// React and friends freeze props; the wrapper must hand over a writable copy.
		const supplied = options();
		const render: RendererFunction = async (
			_element: HTMLElement,
			received: ProcaptchaRenderOptions,
		): Promise<void> => {
			Object.assign(received, { siteKey: "mutated" });
		};
		const { load } = stubLoad(render);

		await createRenderer(SETTINGS, load)(
			document.createElement("div"),
			supplied,
		);

		expect(supplied.siteKey).toBe("site-key");
	});

	it("passes an extensible copy even when the caller's options are frozen", async () => {
		const supplied = Object.freeze(options());
		const render: RendererFunction = async (
			_element: HTMLElement,
			received: ProcaptchaRenderOptions,
		): Promise<void> => {
			Object.assign(received, { siteKey: "mutated" });
		};
		const { load } = stubLoad(render);

		await expect(
			createRenderer(SETTINGS, load)(document.createElement("div"), supplied),
		).resolves.toBeUndefined();
	});

	it("forwards the option values on the copy it makes", async () => {
		const render = vi.fn<RendererFunction>(async (): Promise<void> => {});
		const { load } = stubLoad(render);

		await createRenderer(SETTINGS, load)(
			document.createElement("div"),
			options("abc"),
		);

		expect(render.mock.calls[0]?.[1]).toEqual({ siteKey: "abc" });
	});

	it("gives each render its own copy of the options", async () => {
		const seen: ProcaptchaRenderOptions[] = [];
		const render: RendererFunction = async (
			_element: HTMLElement,
			received: ProcaptchaRenderOptions,
		): Promise<void> => {
			seen.push(received);
		};
		const { load } = stubLoad(render);
		const renderer = createRenderer(SETTINGS, load);
		const supplied = options();

		await renderer(document.createElement("div"), supplied);
		await renderer(document.createElement("div"), supplied);

		expect(seen[0]).not.toBe(seen[1]);
	});

	it("propagates a load failure to the caller", async () => {
		const load: LoadRenderFunction = async (): Promise<RendererFunction> => {
			throw new Error("network down");
		};

		await expect(
			createRenderer(SETTINGS, load)(document.createElement("div"), options()),
		).rejects.toThrow("network down");
	});

	it("retries the load after a failure rather than caching the rejection", async () => {
		let calls = 0;
		const render = vi.fn<RendererFunction>(async (): Promise<void> => {});
		const load: LoadRenderFunction = async (): Promise<RendererFunction> => {
			calls += 1;
			if (1 === calls) {
				throw new Error("network down");
			}
			return render;
		};
		const renderer = createRenderer(SETTINGS, load);

		await expect(
			renderer(document.createElement("div"), options()),
		).rejects.toThrow("network down");
		await renderer(document.createElement("div"), options());

		expect(calls).toBe(2);
		expect(render).toHaveBeenCalledTimes(1);
	});

	it("fails every overlapping render when the shared load fails", async () => {
		const deferred = deferredLoad();
		const renderer = createRenderer(SETTINGS, deferred.load);

		const first = renderer(document.createElement("div"), options());
		const second = renderer(document.createElement("div"), options());
		deferred.reject(new Error("network down"));

		await expect(first).rejects.toThrow("network down");
		await expect(second).rejects.toThrow("network down");
		expect(deferred.calls()).toBe(1);
	});

	it("propagates an error thrown by the render function itself", async () => {
		const { load } = stubLoad(async (): Promise<void> => {
			throw new Error("render blew up");
		});

		await expect(
			createRenderer(SETTINGS, load)(document.createElement("div"), options()),
		).rejects.toThrow("render blew up");
	});

	it("keeps the loaded script cached after a render failure", async () => {
		// The script loaded fine; only the render call failed. Reloading it would
		// inject a duplicate tag for a fault that has nothing to do with loading.
		let calls = 0;
		let shouldThrow = true;
		const load: LoadRenderFunction = async (): Promise<RendererFunction> => {
			calls += 1;
			return async (): Promise<void> => {
				if (shouldThrow) {
					throw new Error("render blew up");
				}
			};
		};
		const renderer = createRenderer(SETTINGS, load);

		await expect(
			renderer(document.createElement("div"), options()),
		).rejects.toThrow("render blew up");
		shouldThrow = false;
		await renderer(document.createElement("div"), options());

		expect(calls).toBe(1);
	});

	it("keeps separate renderers independent", async () => {
		const a = stubLoad(async (): Promise<void> => {});
		const b = stubLoad(async (): Promise<void> => {});

		await createRenderer(SETTINGS, a.load)(
			document.createElement("div"),
			options(),
		);
		await createRenderer(SETTINGS, b.load)(
			document.createElement("div"),
			options(),
		);

		expect(a.calls()).toBe(1);
		expect(b.calls()).toBe(1);
	});

	it("renders into a detached element without touching the document", async () => {
		const render = vi.fn<RendererFunction>(async (): Promise<void> => {});
		const { load } = stubLoad(render);
		const detached = document.createElement("div");

		await createRenderer(SETTINGS, load)(detached, options());

		expect(render).toHaveBeenCalledTimes(1);
		expect(document.body.contains(detached)).toBe(false);
	});

	it("defaults to the real loader when none is injected", async () => {
		const renderer = createRenderer(SETTINGS);
		const rendering = renderer(document.createElement("div"), options());
		await Promise.resolve();

		// The default path goes through the DOM loader, so a tag must appear.
		const script = document.head.querySelector("script");
		expect(script?.src).toBe(SETTINGS.scriptUrl);

		script?.dispatchEvent(new Event("error"));
		await expect(rendering).rejects.toThrow("Failed to load script");
	});
});
