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

import type { Root } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CreatedWidget } from "../util/widgetFactory.js";

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

// Like the real factory, the widget lives in a child of the host element and
// listens there, so a targeted event must be dispatched on that child.
const createWidgetsLikeTheFactory = async (
	hosts: Element[],
): Promise<CreatedWidget[]> =>
	hosts.map((host) => {
		const container = document.createElement("div");
		host.appendChild(container);
		return { root: makeRoot(), container };
	});

const listenLikeAWidget = (
	host: Element,
): { calls: () => number; stop: () => void } => {
	const handler = vi.fn();
	const target = host.firstElementChild;
	if (!target) throw new Error("expected the factory to mount a container");
	document.addEventListener(EXECUTE_EVENT, handler);
	target.addEventListener(EXECUTE_EVENT, handler);
	return {
		calls: () => handler.mock.calls.length,
		stop: () => {
			document.removeEventListener(EXECUTE_EVENT, handler);
			target.removeEventListener(EXECUTE_EVENT, handler);
		},
	};
};

beforeEach(async () => {
	vi.clearAllMocks();
	await remove();
	document.body.innerHTML = "";
	mocks.createWidgets.mockImplementation(createWidgetsLikeTheFactory);
});

describe("execute targeting", () => {
	it("reaches every widget when called with no id", async () => {
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
		const button = document.createElement("button");
		button.id = "gone";
		const element = document.createElement("div");
		document.body.append(button, element);

		await render(element, { siteKey: SITE_KEY, bind: "#gone" });
		await remove();

		const error = vi
			.spyOn(console, "error")
			.mockImplementation(() => undefined);
		button.click();

		expect(error).not.toHaveBeenCalled();
		error.mockRestore();
	});

	it("reports a selector that matches nothing and still renders", async () => {
		const error = vi
			.spyOn(console, "error")
			.mockImplementation(() => undefined);
		const element = document.createElement("div");
		document.body.appendChild(element);

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
