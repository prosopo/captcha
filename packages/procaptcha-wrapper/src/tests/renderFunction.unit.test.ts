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
import {
	type RendererFunction,
	loadRenderFunction,
	loadScript,
} from "../render/renderFunction.js";

const SCRIPT_URL = "https://example.test/procaptcha.bundle.js";
const SCRIPT_ID = "procaptcha-script";

const noopRender: RendererFunction = async (): Promise<void> => {};

/** The most recently appended script tag, i.e. the one a load is waiting on. */
const lastScript = (): HTMLScriptElement => {
	const scripts = document.head.querySelectorAll("script");
	const script = scripts[scripts.length - 1];
	if (undefined === script) {
		throw new Error("no script tag was appended");
	}
	return script;
};

/**
 * jsdom never fetches, so nothing ever fires load/error by itself. Wait for the
 * tag to appear, then drive the outcome by hand.
 */
const settleScript = async (outcome: "load" | "error"): Promise<void> => {
	await Promise.resolve();
	lastScript().dispatchEvent(new Event(outcome));
};

afterEach(() => {
	document.head.innerHTML = "";
	document.body.innerHTML = "";
	window.procaptcha = undefined;
	vi.restoreAllMocks();
});

describe("loadScript", () => {
	it("appends a script tag carrying the requested src", async () => {
		const loading = loadScript(SCRIPT_URL);
		await settleScript("load");
		await loading;

		expect(lastScript().src).toBe(SCRIPT_URL);
	});

	it("applies the supplied attributes to the tag", async () => {
		const loading = loadScript(SCRIPT_URL, {
			id: SCRIPT_ID,
			type: "module",
			async: true,
			defer: true,
		});
		await settleScript("load");
		await loading;

		const script = lastScript();
		expect(script.id).toBe(SCRIPT_ID);
		expect(script.type).toBe("module");
		expect(script.async).toBe(true);
		expect(script.defer).toBe(true);
	});

	it("works with no attributes at all", async () => {
		const loading = loadScript(SCRIPT_URL);
		await settleScript("load");

		await expect(loading).resolves.toBeUndefined();
	});

	it("lets an attribute override the src", async () => {
		const loading = loadScript(SCRIPT_URL, {
			src: "https://example.test/other.js",
		});
		await settleScript("load");
		await loading;

		expect(lastScript().src).toBe("https://example.test/other.js");
	});

	it("appends the tag to document.head, not the body", async () => {
		const loading = loadScript(SCRIPT_URL);
		await settleScript("load");
		await loading;

		expect(document.head.querySelectorAll("script")).toHaveLength(1);
		expect(document.body.querySelectorAll("script")).toHaveLength(0);
	});

	it("rejects with an Error, not the raw DOM Event", async () => {
		const loading = loadScript(SCRIPT_URL);
		await settleScript("error");

		await expect(loading).rejects.toBeInstanceOf(Error);
	});

	it("names the failing url in the rejection message", async () => {
		const loading = loadScript(SCRIPT_URL);
		await settleScript("error");

		await expect(loading).rejects.toThrow(
			`Failed to load script: ${SCRIPT_URL}`,
		);
	});

	it("removes the failed tag so a retry leaves no duplicate id behind", async () => {
		const first = loadScript(SCRIPT_URL, { id: SCRIPT_ID });
		await settleScript("error");
		await expect(first).rejects.toThrow();

		expect(document.head.querySelectorAll("script")).toHaveLength(0);

		const second = loadScript(SCRIPT_URL, { id: SCRIPT_ID });
		await settleScript("load");
		await second;

		expect(document.querySelectorAll(`#${SCRIPT_ID}`)).toHaveLength(1);
	});

	it("stays pending until the script settles", async () => {
		let settled = false;
		const loading = loadScript(SCRIPT_URL).then(() => {
			settled = true;
		});

		await Promise.resolve();
		expect(settled).toBe(false);

		await settleScript("load");
		await loading;
		expect(settled).toBe(true);
	});

	it("accepts an empty url without throwing synchronously", async () => {
		const loading = loadScript("");
		await settleScript("load");

		await expect(loading).resolves.toBeUndefined();
	});
});

describe("loadRenderFunction", () => {
	it("returns the render function the script installed on window", async () => {
		const loading = loadRenderFunction(SCRIPT_URL, SCRIPT_ID);
		await Promise.resolve();
		window.procaptcha = { render: noopRender };
		lastScript().dispatchEvent(new Event("load"));

		await expect(loading).resolves.toBe(noopRender);
	});

	it("requests the script as a deferred async module with the given id", async () => {
		const loading = loadRenderFunction(SCRIPT_URL, SCRIPT_ID);
		await Promise.resolve();
		const script = lastScript();

		expect(script.src).toBe(SCRIPT_URL);
		expect(script.id).toBe(SCRIPT_ID);
		expect(script.type).toBe("module");
		expect(script.async).toBe(true);
		expect(script.defer).toBe(true);

		window.procaptcha = { render: noopRender };
		script.dispatchEvent(new Event("load"));
		await loading;
	});

	it("throws when the script loads but installs no procaptcha global", async () => {
		const loading = loadRenderFunction(SCRIPT_URL, SCRIPT_ID);
		await settleScript("load");

		await expect(loading).rejects.toThrow(
			"Render script does not contain the render function",
		);
	});

	it("throws when the global exists but carries no render function", async () => {
		const loading = loadRenderFunction(SCRIPT_URL, SCRIPT_ID);
		await Promise.resolve();
		// A partially-initialised global is indistinguishable from a stale one.
		window.procaptcha = { render: undefined } as unknown as {
			render: RendererFunction;
		};
		lastScript().dispatchEvent(new Event("load"));

		await expect(loading).rejects.toThrow(
			"Render script does not contain the render function",
		);
	});

	it("propagates the load failure rather than reporting a missing function", async () => {
		const loading = loadRenderFunction(SCRIPT_URL, SCRIPT_ID);
		await settleScript("error");

		await expect(loading).rejects.toThrow(
			`Failed to load script: ${SCRIPT_URL}`,
		);
	});

	it("does not check the global until the script has loaded", async () => {
		const loading = loadRenderFunction(SCRIPT_URL, SCRIPT_ID);
		await Promise.resolve();
		// Set late — after injection but before load — to prove the check is
		// deferred until the script has actually run.
		window.procaptcha = { render: noopRender };
		lastScript().dispatchEvent(new Event("load"));

		await expect(loading).resolves.toBe(noopRender);
	});

	it("returns a function that forwards its arguments to the loaded render", async () => {
		const render = vi.fn<RendererFunction>(async (): Promise<void> => {});
		const loading = loadRenderFunction(SCRIPT_URL, SCRIPT_ID);
		await Promise.resolve();
		window.procaptcha = { render };
		lastScript().dispatchEvent(new Event("load"));

		const loaded = await loading;
		const element = document.createElement("div");
		const options: ProcaptchaRenderOptions = { siteKey: "site-key" };
		await loaded(element, options);

		expect(render).toHaveBeenCalledWith(element, options);
	});
});
