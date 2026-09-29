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

import type { ProcaptchaProps } from "@prosopo/types";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { mountProcaptcha } from "../components/procaptcha.js";
import type { ProcaptchaWidgetHandle } from "../components/procaptchaWidget.js";
import { config } from "./harness.js";
import { type Mounted, mount, settle } from "./render.js";

// The widget is code-split behind a dynamic import, so the point of this module
// is the boundary, not the widget: the stub records the props that made it
// across and lets the test control when the chunk "arrives".
const seen: ProcaptchaProps[] = [];
const destroyed = vi.fn<() => void>();

vi.mock("../components/procaptchaWidget.js", () => ({
	mountProcaptchaImageWidget: (
		container: HTMLElement,
		props: ProcaptchaProps,
	): ProcaptchaWidgetHandle => {
		seen.push(props);
		const element = document.createElement("div");
		element.setAttribute("data-cy", "widget-stub");
		element.textContent = "widget";
		container.appendChild(element);
		return {
			destroy: () => {
				element.remove();
				destroyed();
			},
		};
	},
}));

let mounted: Mounted;

const props = (overrides: Partial<ProcaptchaProps> = {}): ProcaptchaProps => ({
	config: config(),
	callbacks: {},
	// The i18n instance is opaque to this component; it only forwards it.
	i18n: undefined as unknown as ProcaptchaProps["i18n"],
	...overrides,
});

beforeEach(() => {
	seen.length = 0;
	vi.clearAllMocks();
	mounted = mount();
});

afterEach(() => {
	mounted.unmount();
});

describe("the lazy boundary", () => {
	test("renders the widget once the chunk arrives", async () => {
		// Nothing renders in the meantime on purpose: a placeholder would flash a
		// second widget-sized box into the host page before the real one lands,
		// so there is nothing to assert until the chunk resolves.
		const handle = mountProcaptcha(mounted.container, props());
		expect(
			mounted.container.querySelector('[data-cy="widget-stub"]'),
		).toBeNull();
		await settle();
		expect(
			mounted.container.querySelector('[data-cy="widget-stub"]'),
		).not.toBeNull();
		handle.destroy();
	});

	test("hands the widget every prop it was given", async () => {
		const callbacks: ProcaptchaProps["callbacks"] = { onHuman: vi.fn() };
		const given = props({ callbacks, autoStart: true });
		const handle = mountProcaptcha(mounted.container, given);
		await settle();
		expect(seen[0]).toMatchObject({
			callbacks,
			autoStart: true,
			config: given.config,
		});
		handle.destroy();
	});

	test("does not add props of its own", async () => {
		const given = props();
		const handle = mountProcaptcha(mounted.container, given);
		await settle();
		expect(Object.keys(seen[0] ?? {}).sort()).toEqual(
			Object.keys(given).sort(),
		);
		handle.destroy();
	});

	test("tears the widget down when destroyed after the chunk lands", async () => {
		const handle = mountProcaptcha(mounted.container, props());
		await settle();
		handle.destroy();
		expect(destroyed).toHaveBeenCalledTimes(1);
		expect(
			mounted.container.querySelector('[data-cy="widget-stub"]'),
		).toBeNull();
	});

	test("cancels the mount when destroyed before the chunk lands", async () => {
		// Otherwise a widget that was torn down mid-load reappears as an orphan
		// that nothing holds a handle to.
		const handle = mountProcaptcha(mounted.container, props());
		handle.destroy();
		await settle();
		expect(seen).toHaveLength(0);
		expect(
			mounted.container.querySelector('[data-cy="widget-stub"]'),
		).toBeNull();
	});
});
