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

import type { Ti18n } from "@prosopo/locale";
import type { ProcaptchaProps } from "@prosopo/types";
import { type ReactElement, act, createElement } from "react";
import { type Root, createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import * as entrypoint from "../index.js";
import { config } from "./managerHarness.js";

/**
 * The outer component exists only to lazy-load the widget and hand it the props
 * it was given, so what is worth pinning down is that nothing is dropped on the
 * way through — a wrapper that names props one at a time silently loses the
 * ones added later.
 */
const mocks = vi.hoisted(() => ({
	received: [] as ProcaptchaProps[],
}));

vi.mock("../components/ProcaptchaWidget.js", async () => {
	const { createElement: create } = await import("react");
	return {
		default: (props: ProcaptchaProps) => {
			mocks.received.push(props);
			return create("div", { "data-testid": "widget" });
		},
	};
});

let container: HTMLDivElement;
let root: Root;

const props = (overrides: Partial<ProcaptchaProps> = {}): ProcaptchaProps => ({
	config: config(),
	callbacks: {},
	i18n: undefined as unknown as Ti18n,
	...overrides,
});

const render = async (widgetProps: ProcaptchaProps): Promise<void> => {
	await act(async () => {
		root.render(
			createElement(
				entrypoint.ProcaptchaIconOrder,
				widgetProps,
			) as ReactElement,
		);
	});
};

beforeEach(() => {
	mocks.received.length = 0;
	container = document.createElement("div");
	document.body.appendChild(container);
	act(() => {
		root = createRoot(container);
	});
});

afterEach(() => {
	act(() => {
		root.unmount();
	});
	container.remove();
});

describe("ProcaptchaIconOrder", () => {
	test("renders the widget once it has loaded", async () => {
		await render(props());
		expect(container.querySelector('[data-testid="widget"]')).not.toBeNull();
	});

	test("passes on the props the widget needs but never names", async () => {
		const onSessionInvalidated = vi.fn<(x?: number, y?: number) => void>();
		await render(
			props({
				autoStart: true,
				startCoords: { x: 1, y: 2 },
				onSessionInvalidated,
			}),
		);
		expect(mocks.received[0]).toMatchObject({
			autoStart: true,
			startCoords: { x: 1, y: 2 },
			onSessionInvalidated,
		});
	});

	test("passes on the props it does name, too", async () => {
		const callbacks = { onHuman: vi.fn<(token: string) => void>() };
		await render(props({ callbacks }));
		expect(mocks.received[0]?.callbacks).toBe(callbacks);
		expect(mocks.received[0]?.config).toEqual(config());
	});

	test("mounts one widget per render, not one per prop change", async () => {
		await render(props());
		await render(props({ autoStart: true }));
		expect(container.querySelectorAll('[data-testid="widget"]')).toHaveLength(
			1,
		);
	});
});

describe("the package entrypoint", () => {
	test("exports the wrapper a consumer mounts", () => {
		// The inner ProcaptchaWidget is a default export, which `export *` does
		// not re-export: consumers get the lazy-loading wrapper only, which is
		// the one that works outside a bundler that can code-split.
		expect(typeof entrypoint.ProcaptchaIconOrder).toBe("function");
		expect(Object.keys(entrypoint)).toEqual(["ProcaptchaIconOrder"]);
	});
});
