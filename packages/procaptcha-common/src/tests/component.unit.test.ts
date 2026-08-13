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

import { describe, expect, test, vi } from "vitest";
import { Teardown } from "../dom/component.js";

/**
 * Nothing reconciles for us, so `Teardown` is the only thing standing between
 * the frictionless restart path — which remounts the whole widget on a
 * `CAPTCHA.NO_SESSION_FOUND` — and a listener leak that grows per restart.
 */

describe("Teardown", () => {
	test("runs a registered callback", () => {
		const teardown = new Teardown();
		const callback = vi.fn<() => void>();
		teardown.add(callback);
		teardown.run();
		expect(callback).toHaveBeenCalledTimes(1);
	});

	test("unwinds in reverse registration order", () => {
		// Setup nests (style, then nodes, then listeners on those nodes), so
		// teardown has to unwind the way it wound up.
		const order: string[] = [];
		const teardown = new Teardown();
		teardown.add(() => order.push("first"));
		teardown.add(() => order.push("second"));
		teardown.run();
		expect(order).toEqual(["second", "first"]);
	});

	test("does not run a callback twice across repeat runs", () => {
		// `destroy` is called from more than one path (the widget's own teardown
		// and its parent's), so a second run must be inert.
		const teardown = new Teardown();
		const callback = vi.fn<() => void>();
		teardown.add(callback);
		teardown.run();
		teardown.run();
		expect(callback).toHaveBeenCalledTimes(1);
	});

	test("removes a listener it added", () => {
		const teardown = new Teardown();
		const target = document.createElement("div");
		const listener = vi.fn<() => void>();

		teardown.addEventListener(target, "click", listener);
		target.dispatchEvent(new MouseEvent("click"));
		expect(listener).toHaveBeenCalledTimes(1);

		teardown.run();
		target.dispatchEvent(new MouseEvent("click"));
		expect(listener).toHaveBeenCalledTimes(1);
	});

	test("removes a listener registered with options", () => {
		// removeEventListener only matches when the capture flag matches, so the
		// options have to be carried through to the disposer.
		const teardown = new Teardown();
		const target = document.createElement("div");
		const child = target.appendChild(document.createElement("span"));
		const listener = vi.fn<() => void>();

		teardown.addEventListener(target, "click", listener, { capture: true });
		teardown.run();
		child.dispatchEvent(new MouseEvent("click", { bubbles: true }));

		expect(listener).not.toHaveBeenCalled();
	});

	test("registers listeners on any event target, not just elements", () => {
		// The puzzle canvas tracks the drag on `document`; the widgets listen for
		// `procaptcha:execute` there too.
		const teardown = new Teardown();
		const listener = vi.fn<() => void>();

		teardown.addEventListener(document, "procaptcha:test", listener);
		document.dispatchEvent(new CustomEvent("procaptcha:test"));
		teardown.run();
		document.dispatchEvent(new CustomEvent("procaptcha:test"));

		expect(listener).toHaveBeenCalledTimes(1);
	});

	test("runs every callback even when they were added out of band", () => {
		const teardown = new Teardown();
		const first = vi.fn<() => void>();
		const second = vi.fn<() => void>();
		teardown.add(first);
		teardown.add(second);
		teardown.run();
		expect(first).toHaveBeenCalledTimes(1);
		expect(second).toHaveBeenCalledTimes(1);
	});
});
