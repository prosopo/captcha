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
import { type WidgetHandle, lazyMount } from "../dom/lazyMount.js";
import { type Mounted, mount } from "./domHarness.js";

let mounted: Mounted;

beforeEach(() => {
	mounted = mount();
});

afterEach(() => {
	mounted.unmount();
});

const props = {} as ProcaptchaProps;

const settle = (): Promise<void> =>
	new Promise<void>((resolve: () => void) => setTimeout(resolve, 0));

const widget = () => {
	const destroy = vi.fn<() => void>();
	const mountWidget = vi.fn<
		(container: HTMLElement, props: ProcaptchaProps) => WidgetHandle
	>(() => ({ destroy }));
	return { destroy, mountWidget };
};

describe("lazyMount", () => {
	test("mounts the loaded widget into the container with the props given", async () => {
		const { mountWidget } = widget();
		lazyMount(async () => mountWidget)(mounted.container, props);
		await settle();
		expect(mountWidget).toHaveBeenCalledWith(mounted.container, props);
	});

	test("destroys the loaded widget", async () => {
		const { destroy, mountWidget } = widget();
		const handle = lazyMount(async () => mountWidget)(mounted.container, props);
		await settle();
		handle.destroy();
		expect(destroy).toHaveBeenCalledTimes(1);
	});

	test("never mounts a widget destroyed while still loading", async () => {
		const { mountWidget } = widget();
		const handle = lazyMount(async () => mountWidget)(mounted.container, props);
		handle.destroy();
		await settle();
		expect(mountWidget).not.toHaveBeenCalled();
	});
});
