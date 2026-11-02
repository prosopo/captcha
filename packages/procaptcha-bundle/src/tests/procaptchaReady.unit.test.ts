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

import { JSDOM } from "jsdom";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("procaptcha:ready event", () => {
	let dom: JSDOM;

	beforeEach(() => {
		dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
			url: "https://example.com",
		});
		// @ts-ignore
		global.document = dom.window.document;
		// @ts-ignore
		global.window = dom.window as unknown as Window & typeof globalThis;
	});

	afterEach(() => {
		Object.assign(global, { document: undefined, window: undefined });
	});

	it("should dispatch procaptcha:ready event when window.procaptcha is set", async () => {
		const readyEvent = new Promise<CustomEvent>((resolve) => {
			document.addEventListener("procaptcha:ready", (event: Event) =>
				resolve(event as CustomEvent),
			);
		});

		await import("../index.js");
		const customEvent = await readyEvent;

		expect(customEvent.detail).toBeDefined();
		expect(typeof customEvent.detail.timestamp).toBe("number");
		expect(customEvent.bubbles).toBe(true);
		expect(customEvent.cancelable).toBe(false);
		expect(window.procaptcha).toBeDefined();
		expect(window.procaptcha?.render).toBeDefined();
		expect(window.procaptcha?.ready).toBeDefined();
		expect(window.procaptcha?.reset).toBeDefined();
		expect(window.procaptcha?.execute).toBeDefined();
		expect(window.procaptcha?.start).toBeDefined();
	});
});
