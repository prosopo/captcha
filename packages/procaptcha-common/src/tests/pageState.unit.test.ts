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

/**
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	type PageTracker,
	diffPage,
	installPageTracker,
	snapshotPage,
} from "./pageState.js";

const noop = (): void => undefined;

describe("installPageTracker", () => {
	let tracker: PageTracker;

	beforeEach(() => {
		tracker = installPageTracker();
	});

	afterEach(() => {
		tracker.uninstall();
	});

	it("counts listeners on window, document and body until they are removed", () => {
		const onScroll = (): void => undefined;
		window.addEventListener("scroll", onScroll);
		document.addEventListener("click", noop);
		document.addEventListener("click", noop, true);
		document.body.addEventListener("keydown", noop);

		expect(tracker.listeners()).toEqual([
			"body:keydown",
			"document:click",
			"document:click",
			"window:scroll",
		]);

		window.removeEventListener("scroll", onScroll);
		document.removeEventListener("click", noop);
		document.removeEventListener("click", noop, true);
		document.body.removeEventListener("keydown", noop);

		expect(tracker.listeners()).toEqual([]);
	});

	it("ignores listeners on other elements", () => {
		const div = document.createElement("div");
		div.addEventListener("click", noop);

		expect(tracker.listeners()).toEqual([]);
	});

	it("does not go negative on removing a listener it never saw", () => {
		document.removeEventListener("click", noop);
		document.addEventListener("click", noop);

		expect(tracker.listeners()).toEqual(["document:click"]);
		document.removeEventListener("click", noop);
	});

	it("counts live intervals", () => {
		const id = window.setInterval(noop, 1000);
		expect(tracker.intervals()).toBe(1);

		window.clearInterval(id);
		expect(tracker.intervals()).toBe(0);
	});

	it("puts the native methods back on uninstall", () => {
		const tracked = EventTarget.prototype.addEventListener;
		tracker.uninstall();

		expect(EventTarget.prototype.addEventListener).not.toBe(tracked);
		document.addEventListener("click", noop);
		expect(tracker.listeners()).toEqual([]);
		document.removeEventListener("click", noop);
	});
});

describe("diffPage", () => {
	let tracker: PageTracker;
	const nativeFetch = window.fetch;

	beforeEach(() => {
		document.head.innerHTML = "";
		document.body.innerHTML = "";
		localStorage.clear();
		sessionStorage.clear();
		tracker = installPageTracker();
	});

	afterEach(() => {
		tracker.uninstall();
		window.fetch = nativeFetch;
		Reflect.deleteProperty(window, "hostileGlobal");
		document.documentElement.removeAttribute("data-mutated");
		document.cookie = "tracked=; expires=Thu, 01 Jan 1970 00:00:00 GMT";
	});

	it("reports nothing for an untouched page", () => {
		expect(diffPage(snapshotPage(tracker), snapshotPage(tracker))).toEqual([]);
	});

	it("reports each kind of change a script can make", () => {
		const before = snapshotPage(tracker);

		Reflect.set(window, "hostileGlobal", 1);
		window.fetch = (): Promise<Response> => Promise.resolve(new Response());
		document.documentElement.setAttribute("data-mutated", "yes");
		const style = document.createElement("style");
		style.id = "injected";
		document.head.appendChild(style);
		document.body.appendChild(document.createElement("iframe"));
		document.cookie = "tracked=1";
		localStorage.setItem("seen", "1");
		sessionStorage.setItem("tab", "1");
		document.addEventListener("submit", noop);
		const interval = window.setInterval(noop, 1000);

		expect(diffPage(before, snapshotPage(tracker))).toEqual([
			"+global hostileGlobal",
			"~builtin fetch",
			"+html-attr data-mutated=yes",
			"+node body>iframe",
			"+node head>style#injected",
			"+cookie tracked",
			"+storage localStorage:seen",
			"+storage sessionStorage:tab",
			"+listener document:submit",
			"~intervals 0->1",
		]);

		window.clearInterval(interval);
		document.removeEventListener("submit", noop);
	});

	it("reports what a script removed", () => {
		const existing = document.createElement("div");
		existing.id = "host-root";
		document.body.appendChild(existing);
		const before = snapshotPage(tracker);

		existing.remove();

		expect(diffPage(before, snapshotPage(tracker))).toEqual([
			"-node body>div#host-root",
		]);
	});
});
