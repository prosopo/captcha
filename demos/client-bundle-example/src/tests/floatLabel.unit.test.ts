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

// @vitest-environment jsdom

// src/index.ts is a self-executing float-label script: it hides the label of
// any wrapper whose input is focused or non-empty. It runs at import time, so
// each test seeds the DOM first and then imports it with a fresh module registry.

import {
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

const WRAPPER = "mui-textfield--float-label";
const HIDDEN = "label-hidden";

const seed = (markup: string): void => {
	document.body.innerHTML = markup;
};

const wrapper = (inner: string): string =>
	`<div class="${WRAPPER}">${inner}</div>`;

// The script is a side-effecting IIFE that runs exactly once per module
// evaluation, and vitest will not re-evaluate it per test. So it is imported
// once with document.readyState pinned to "loading": that makes it register a
// DOMContentLoaded listener instead of running immediately, and each test then
// dispatches that event to run the script against its own freshly seeded DOM.
// (floatLabelReady.unit.test.ts covers the already-loaded branch.)
beforeAll(async () => {
	vi.spyOn(document, "readyState", "get").mockReturnValue("loading");
	await import("../index.js");
});

const load = (): void => {
	document.dispatchEvent(new Event("DOMContentLoaded"));
};

beforeEach(() => {
	vi.useFakeTimers();
	document.body.innerHTML = "";
});

afterEach(() => {
	vi.useRealTimers();
});

describe("float label script", () => {
	it("hides the label of a pre-filled input", async () => {
		seed(wrapper('<label>Email</label><input value="a@test.com" />'));

		load();

		expect(document.querySelector(`.${WRAPPER}`)?.classList).toContain(HIDDEN);
	});

	it("leaves the label visible for an empty input", async () => {
		seed(wrapper("<label>Email</label><input />"));

		load();

		expect(document.querySelector(`.${WRAPPER}`)?.classList).not.toContain(
			HIDDEN,
		);
	});

	it("treats a whitespace-only value as empty", async () => {
		seed(wrapper('<label>Email</label><input value="   " />'));

		load();

		expect(document.querySelector(`.${WRAPPER}`)?.classList).not.toContain(
			HIDDEN,
		);
	});

	it("hides the label once the input receives a value", async () => {
		seed(wrapper("<label>Email</label><input />"));
		load();
		const input = document.querySelector("input");
		if (!input) throw new Error("input missing");

		input.value = "typed";
		input.dispatchEvent(new Event("input", { bubbles: true }));

		expect(document.querySelector(`.${WRAPPER}`)?.classList).toContain(HIDDEN);
	});

	it("restores the label when the value is cleared", async () => {
		seed(wrapper('<label>Email</label><input value="typed" />'));
		load();
		const input = document.querySelector("input");
		if (!input) throw new Error("input missing");

		input.value = "";
		input.dispatchEvent(new Event("input", { bubbles: true }));

		expect(document.querySelector(`.${WRAPPER}`)?.classList).not.toContain(
			HIDDEN,
		);
	});

	it("hides the label for a checked checkbox", async () => {
		seed(wrapper('<label>Agree</label><input type="checkbox" checked />'));

		load();

		expect(document.querySelector(`.${WRAPPER}`)?.classList).toContain(HIDDEN);
	});

	it("leaves the label visible for an unchecked checkbox", async () => {
		seed(wrapper('<label>Agree</label><input type="checkbox" />'));

		load();

		expect(document.querySelector(`.${WRAPPER}`)?.classList).not.toContain(
			HIDDEN,
		);
	});

	it("copies the label text into aria-label for screen readers", async () => {
		seed(wrapper("<label>  Email  </label><input />"));

		load();

		expect(document.querySelector("input")?.getAttribute("aria-label")).toBe(
			"Email",
		);
	});

	it("does not overwrite an explicit aria-label", async () => {
		seed(wrapper('<label>Email</label><input aria-label="Your email" />'));

		load();

		expect(document.querySelector("input")?.getAttribute("aria-label")).toBe(
			"Your email",
		);
	});

	it("also drives a textarea", async () => {
		seed(wrapper("<label>Notes</label><textarea>filled</textarea>"));

		load();

		expect(document.querySelector(`.${WRAPPER}`)?.classList).toContain(HIDDEN);
	});

	it("does nothing when there are no wrappers", async () => {
		seed("<div><input /></div>");

		expect(() => load()).not.toThrow();
	});

	it("tolerates a wrapper with no label", async () => {
		seed(wrapper("<input />"));

		expect(() => load()).not.toThrow();
	});

	it("polls for autofill and stops after roughly three seconds", async () => {
		seed(wrapper('<label>Email</label><input value="" />'));
		load();
		const input = document.querySelector("input");
		if (!input) throw new Error("input missing");
		const spy = vi.spyOn(input, "dispatchEvent");

		// the browser fills the field without emitting an event; the poll picks it up
		input.value = "autofilled@test.com";
		vi.advanceTimersByTime(250);

		expect(document.querySelector(`.${WRAPPER}`)?.classList).toContain(HIDDEN);

		// 12 checks at 250ms, then the interval clears itself
		vi.advanceTimersByTime(10_000);
		expect(spy.mock.calls.length).toBeLessThanOrEqual(12);
	});
});
