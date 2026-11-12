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

import { afterEach, beforeEach, describe, expect, test } from "vitest";
import {
	type HoneypotComponent,
	type HoneypotProps,
	mountHoneypot,
} from "../components/honeypot.js";
import { type Mounted, mount } from "./domHarness.js";

/**
 * The honeypot only works if it is discoverable the way a bot looks for inputs
 * and invisible the way a person experiences the page. Both halves are load
 * bearing: rendering it inside the widget's shadow root would put it behind
 * the `shadowRoot` getter that @prosopo/catcher watches, and letting it join
 * the dapp's submission set would corrupt the host's own form data.
 */

const encode = (text: string): string =>
	Buffer.from(text, "utf8").toString("base64");

let mounted: Mounted;
let honeypot: HoneypotComponent | undefined;

const props = (question = "-- .- -.--"): HoneypotProps => ({
	encodedQuestion: encode(question),
});

const bait = (): HTMLInputElement => {
	const element = document.querySelector<HTMLInputElement>(
		'input[name="email_confirm"]',
	);
	if (!element) throw new Error("expected the bait input to be rendered");
	return element;
};

beforeEach(() => {
	mounted = mount();
	honeypot = undefined;
});

afterEach(() => {
	honeypot?.destroy();
	mounted.unmount();
});

describe("where the bait lives", () => {
	test("renders into document.body when the widget is not inside a form", () => {
		honeypot = mountHoneypot(mounted.container, props());
		expect(mounted.container.contains(bait())).toBe(false);
		expect(document.body.contains(bait())).toBe(true);
	});

	test("prefers the dapp's enclosing form", () => {
		// Bots scraping `form.querySelectorAll('input')` should meet the bait
		// naturally, alongside the fields they came for.
		const form = document.body.appendChild(document.createElement("form"));
		const host = form.appendChild(document.createElement("div"));

		honeypot = mountHoneypot(host, props());

		expect(form.contains(bait())).toBe(true);
		form.remove();
	});

	test("leaves nothing of its own behind in the widget's tree", () => {
		// The anchor exists only to walk out of the shadow root.
		honeypot = mountHoneypot(mounted.container, props());
		expect(mounted.container.childNodes).toHaveLength(0);
	});
});

describe("what the bait looks like", () => {
	test("decodes the question into the label", () => {
		// The server base64-wraps the morse/semaphore for the wire; an agent
		// reading the DOM as a prompt needs the raw form.
		honeypot = mountHoneypot(mounted.container, props("... --- ..."));
		expect(bait().closest("label")?.textContent).toContain("... --- ...");
	});

	test("leaves the input itself empty", () => {
		// A pre-filled value would be a signal a naive form-filler could echo, so
		// only a deliberate answer counts.
		honeypot = mountHoneypot(mounted.container, props());
		expect(bait().value).toBe("");
	});

	test("names the field like a real one", () => {
		honeypot = mountHoneypot(mounted.container, props());
		expect(bait().getAttribute("name")).toBe("email_confirm");
		expect(bait().getAttribute("type")).toBe("text");
	});

	test("keeps itself out of the keyboard order and the accessibility tree", () => {
		honeypot = mountHoneypot(mounted.container, props());
		expect(bait().getAttribute("tabindex")).toBe("-1");
		expect(bait().getAttribute("autocomplete")).toBe("off");
		expect(bait().closest("div")?.getAttribute("aria-hidden")).toBe("true");
	});

	test("positions the bait off-screen rather than hiding it outright", () => {
		// display:none / hidden are the first things a bot filters out.
		const wrapper = (): HTMLElement => {
			const element = bait().closest("div");
			if (!element) throw new Error("expected an offscreen wrapper");
			return element as HTMLElement;
		};
		honeypot = mountHoneypot(mounted.container, props());
		expect(wrapper().style.position).toBe("absolute");
		expect(wrapper().style.left).toBe("-9999px");
		expect(wrapper().style.display).not.toBe("none");
	});

	test("points at a form that does not exist, so it never submits", () => {
		// A non-matching `form` id disassociates the input from every form: the
		// browser excludes it from the parent's submission set while leaving it
		// discoverable via querySelectorAll.
		const form = document.body.appendChild(document.createElement("form"));
		form.id = "real-form";
		const host = form.appendChild(document.createElement("div"));

		honeypot = mountHoneypot(host, props());

		const detached = bait().getAttribute("form");
		expect(detached).toBeTruthy();
		expect(document.getElementById(detached ?? "")).toBeNull();
		form.remove();
	});

	test("gives each instance its own ids", () => {
		// Two widgets on a page must not collide on the label association.
		const second = mount();
		honeypot = mountHoneypot(mounted.container, props());
		const other = mountHoneypot(second.container, props());

		const ids = Array.from(
			document.querySelectorAll('input[name="email_confirm"]'),
		).map((input: Element) => input.id);
		expect(new Set(ids).size).toBe(ids.length);

		other.destroy();
		second.unmount();
	});
});

describe("reading the answer back", () => {
	test("reports undefined while the field is untouched", () => {
		// An empty answer is no signal at all, and must not read as one.
		honeypot = mountHoneypot(mounted.container, props());
		expect(honeypot.getValue()).toBeUndefined();
	});

	test("reports whatever was typed into it", () => {
		honeypot = mountHoneypot(mounted.container, props());
		bait().value = "sos";
		expect(honeypot.getValue()).toBe("sos");
	});

	test("reads live, so a late answer still counts", () => {
		// The value is read at solution-submit time, long after mount.
		honeypot = mountHoneypot(mounted.container, props());
		expect(honeypot.getValue()).toBeUndefined();
		bait().value = "later";
		expect(honeypot.getValue()).toBe("later");
	});
});

describe("updating", () => {
	test("swaps in a newly decoded question", () => {
		honeypot = mountHoneypot(mounted.container, props("first"));
		honeypot.update(props("second"));
		expect(bait().closest("label")?.textContent).toContain("second");
	});

	test("keeps the answer already typed in", () => {
		honeypot = mountHoneypot(mounted.container, props("first"));
		bait().value = "typed";
		honeypot.update(props("second"));
		expect(honeypot.getValue()).toBe("typed");
	});
});

describe("tearing down", () => {
	test("removes the bait from light DOM", () => {
		honeypot = mountHoneypot(mounted.container, props());
		honeypot.destroy();
		honeypot = undefined;
		expect(document.querySelector('input[name="email_confirm"]')).toBeNull();
	});

	test("tolerates being destroyed twice", () => {
		const component = mountHoneypot(mounted.container, props());
		component.destroy();
		expect(() => component.destroy()).not.toThrow();
	});
});
