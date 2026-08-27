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
 * Binding a host-page button to one widget, and the targeted `execute()` that
 * makes it possible.
 *
 * A bare `execute()` has always fired every widget on the page, because the
 * event goes to `document` and each widget listens there. Two bound buttons on
 * one page therefore need targeting, or pressing either one runs both widgets.
 */

import type { Root } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	prefetchDetector: vi.fn(),
	createWidgets: vi.fn(),
}));

vi.mock("@prosopo/procaptcha-frictionless", () => ({
	prefetchDetector: mocks.prefetchDetector,
}));

vi.mock("@prosopo/procaptcha-common", () => ({
	getWindowCallback: vi.fn(),
	pickIpMode: vi.fn(() => undefined),
}));

vi.mock("../util/widgetFactory.js", () => ({
	WidgetFactory: vi.fn(function () {
		return { createWidgets: mocks.createWidgets };
	}),
}));

const { render, remove, execute } = await import("../index.js");

const SITE_KEY = "5CcNvLUdiXFpzKDMjThGLSK9rhWHA1H4EF3zrgkpkjAdqmuP";
const EXECUTE_EVENT = "procaptcha:execute";

const makeRoot = (): Root =>
	({ unmount: vi.fn(), render: vi.fn() }) as unknown as Root;

/** Mirrors what a widget does: listen on document and on its own element. */
const listenLikeAWidget = (
	element: Element,
): { calls: () => number; stop: () => void } => {
	const handler = vi.fn();
	document.addEventListener(EXECUTE_EVENT, handler);
	element.addEventListener(EXECUTE_EVENT, handler);
	return {
		calls: () => handler.mock.calls.length,
		stop: () => {
			document.removeEventListener(EXECUTE_EVENT, handler);
			element.removeEventListener(EXECUTE_EVENT, handler);
		},
	};
};

beforeEach(async () => {
	vi.clearAllMocks();
	await remove();
	document.body.innerHTML = "";
	mocks.createWidgets.mockResolvedValue([makeRoot()]);
});

describe("execute targeting", () => {
	it("reaches every widget when called with no id", async () => {
		// The untargeted path finds containers by selector rather than from the
		// widget registry, so these need a shape it recognises.
		const first = document.createElement("div");
		first.className = "p-procaptcha";
		const second = document.createElement("div");
		second.className = "p-procaptcha";
		document.body.append(first, second);
		await render(first, { siteKey: SITE_KEY });
		await render(second, { siteKey: SITE_KEY });

		const a = listenLikeAWidget(first);
		const b = listenLikeAWidget(second);
		execute();

		// The long-standing behaviour: one call, every widget responds.
		expect(a.calls()).toBe(1);
		expect(b.calls()).toBe(1);
		a.stop();
		b.stop();
	});

	it("reaches only the named widget when given an id", async () => {
		const first = document.createElement("div");
		const second = document.createElement("div");
		document.body.append(first, second);
		const firstId = await render(first, { siteKey: SITE_KEY });
		await render(second, { siteKey: SITE_KEY });

		const a = listenLikeAWidget(first);
		const b = listenLikeAWidget(second);
		execute(firstId);

		expect(a.calls()).toBe(1);
		expect(b.calls()).toBe(0);
		a.stop();
		b.stop();
	});

	it("does not bubble a targeted event up to document", async () => {
		// If it bubbled, the document listener every widget keeps would fire and
		// the targeting would achieve nothing.
		const element = document.createElement("div");
		document.body.appendChild(element);
		const widgetId = await render(element, { siteKey: SITE_KEY });

		const documentOnly = vi.fn();
		document.addEventListener(EXECUTE_EVENT, documentOnly);
		execute(widgetId);

		expect(documentOnly).not.toHaveBeenCalled();
		document.removeEventListener(EXECUTE_EVENT, documentOnly);
	});

	it("reports an unknown id rather than firing every widget", async () => {
		const element = document.createElement("div");
		document.body.appendChild(element);
		await render(element, { siteKey: SITE_KEY });

		const error = vi
			.spyOn(console, "error")
			.mockImplementation(() => undefined);
		const listener = listenLikeAWidget(element);
		execute("procaptcha-widget-does-not-exist");

		expect(listener.calls()).toBe(0);
		expect(error).toHaveBeenCalled();
		listener.stop();
		error.mockRestore();
	});
});

describe("bind", () => {
	it("runs only the bound widget when its button is clicked", async () => {
		const button = document.createElement("button");
		button.id = "pay";
		const bound = document.createElement("div");
		const other = document.createElement("div");
		document.body.append(button, bound, other);

		await render(bound, { siteKey: SITE_KEY, bind: "#pay" });
		await render(other, { siteKey: SITE_KEY });

		const a = listenLikeAWidget(bound);
		const b = listenLikeAWidget(other);
		button.click();

		expect(a.calls()).toBe(1);
		expect(b.calls()).toBe(0);
		a.stop();
		b.stop();
	});

	it("stops the button's default action", async () => {
		// The host page submits on its verified callback; letting the default
		// through would post the form before a token exists.
		const form = document.createElement("form");
		const button = document.createElement("button");
		button.id = "submit-it";
		button.type = "submit";
		form.appendChild(button);
		const element = document.createElement("div");
		document.body.append(form, element);

		await render(element, { siteKey: SITE_KEY, bind: "#submit-it" });

		const event = new MouseEvent("click", {
			bubbles: true,
			cancelable: true,
		});
		button.dispatchEvent(event);

		expect(event.defaultPrevented).toBe(true);
	});

	it("detaches the listener when the widget is removed", async () => {
		// A button still calling execute() for a removed widget would target an
		// id that no longer resolves, logging an error on every click.
		const button = document.createElement("button");
		button.id = "gone";
		const element = document.createElement("div");
		document.body.append(button, element);

		await render(element, { siteKey: SITE_KEY, bind: "#gone" });
		await remove();

		const error = vi
			.spyOn(console, "error")
			.mockImplementation(() => undefined);
		const listener = listenLikeAWidget(element);
		button.click();

		expect(listener.calls()).toBe(0);
		expect(error).not.toHaveBeenCalled();
		listener.stop();
		error.mockRestore();
	});

	it("reports a selector that matches nothing", async () => {
		const error = vi
			.spyOn(console, "error")
			.mockImplementation(() => undefined);
		const element = document.createElement("div");
		document.body.appendChild(element);

		// The widget still renders — a bad selector should not cost the page its
		// captcha, only its button binding.
		const widgetId = await render(element, {
			siteKey: SITE_KEY,
			bind: "#nothing-here",
		});

		expect(widgetId).toBeTruthy();
		expect(error).toHaveBeenCalledWith(
			expect.stringContaining("#nothing-here"),
		);
		error.mockRestore();
	});
});
