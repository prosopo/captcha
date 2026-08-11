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
 * Every entry point that mounts a widget must start the detector prefetch.
 * `render()` did not, so pages using the explicit API (and any page loading
 * the bundle via dynamic import, where implicit render never runs) fell back
 * to assigning a detector inline on the widget's critical path.
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
	pickIpMode: vi.fn((flags: { ipv4?: boolean; ipv6?: boolean } | undefined) =>
		flags?.ipv4 ? "ipv4" : undefined,
	),
}));

vi.mock("../util/widgetFactory.js", () => ({
	WidgetFactory: vi.fn(function () {
		return { createWidgets: mocks.createWidgets };
	}),
}));

const { render } = await import("../index.js");

const SITE_KEY = "5CcNvLUdiXFpzKDMjThGLSK9rhWHA1H4EF3zrgkpkjAdqmuP";

// The prefetch is fire-and-forget behind two dynamic imports, so it lands a
// few microtasks after render() resolves.
const renderAndFlush = async (
	options: Parameters<typeof render>[1],
): Promise<void> => {
	await render(document.createElement("div"), options);
	await new Promise((resolve) => setTimeout(resolve, 0));
};

beforeEach(() => {
	vi.clearAllMocks();
	mocks.createWidgets.mockResolvedValue([] as Root[]);
});

describe("render", () => {
	it("starts the detector prefetch", async () => {
		await renderAndFlush({ siteKey: SITE_KEY });

		expect(mocks.prefetchDetector).toHaveBeenCalledWith(
			expect.anything(),
			undefined,
			SITE_KEY,
		);
	});

	it("passes the ip-mode preference through to the prefetch", async () => {
		await renderAndFlush({ siteKey: SITE_KEY, ipv4: true });

		expect(mocks.prefetchDetector).toHaveBeenCalledWith(
			expect.anything(),
			"ipv4",
			SITE_KEY,
		);
	});

	it("does not prefetch without a site key", async () => {
		await renderAndFlush({ siteKey: "" });

		expect(mocks.prefetchDetector).not.toHaveBeenCalled();
	});
});
