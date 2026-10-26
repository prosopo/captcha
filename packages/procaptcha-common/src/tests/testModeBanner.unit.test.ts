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

import {
	ALWAYS_FAIL_SITE_KEY,
	ALWAYS_PASS_SITE_KEY,
	TestSiteKeyMode,
	getTestSiteKeyMode,
} from "@prosopo/types";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
	type TestModeBannerProps,
	mountTestModeBanner,
} from "../components/testModeBanner.js";
import type { StaticComponent } from "../dom/component.js";
import { type Mounted, mount } from "./domHarness.js";

/**
 * This is the safeguard that stops an always-pass CI key reaching production
 * unnoticed, so the two things that matter are that it shows up loudly for a
 * test key and stays completely out of the way for a real one.
 */

const REAL_SITE_KEY = "5CcNvLUdiXFpzKDMjThGLSK9rhWHA1H4EF3zrgkpkjAdqmuP";

let mounted: Mounted;
let banner: StaticComponent | undefined;

const render = (siteKey: string): void => {
	const props: TestModeBannerProps = { siteKey };
	banner = mountTestModeBanner(mounted.container, props);
};

const rendered = (): HTMLElement | null =>
	mounted.container.querySelector('[data-cy="test-mode-banner"]');

beforeEach(() => {
	mounted = mount();
	banner = undefined;
	vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

afterEach(() => {
	banner?.destroy();
	mounted.unmount();
	vi.restoreAllMocks();
});

describe("a normal site key", () => {
	test("renders nothing at all", () => {
		render(REAL_SITE_KEY);
		expect(mounted.container.childNodes).toHaveLength(0);
	});

	test("logs no warning", () => {
		render(REAL_SITE_KEY);
		expect(console.warn).not.toHaveBeenCalled();
	});

	test("returns a handle that is safe to update and destroy", () => {
		render(REAL_SITE_KEY);
		expect(() => {
			banner?.update();
			banner?.destroy();
		}).not.toThrow();
	});

	test("renders nothing for an empty site key", () => {
		// The widget passes `?? ""` when no account address is configured.
		render("");
		expect(mounted.container.childNodes).toHaveLength(0);
	});
});

describe("an always-pass test key", () => {
	const siteKey = ALWAYS_PASS_SITE_KEY;

	test("is recognised as a test key", () => {
		expect(getTestSiteKeyMode(siteKey)).toBe(TestSiteKeyMode.Pass);
	});

	test("renders an alert naming the behaviour", () => {
		render(siteKey);
		expect(rendered()?.getAttribute("role")).toBe("alert");
		expect(rendered()?.textContent).toContain("ALWAYS PASSES");
		expect(rendered()?.textContent).toContain("Do not use in production");
	});

	test("also warns on the console, for a headless deploy", () => {
		render(siteKey);
		expect(console.warn).toHaveBeenCalledTimes(1);
		expect(vi.mocked(console.warn).mock.calls[0]?.[0]).toContain("PASSES");
	});
});

describe("an always-fail test key", () => {
	const siteKey = ALWAYS_FAIL_SITE_KEY;

	test("renders an alert naming the behaviour", () => {
		render(siteKey);
		expect(rendered()?.textContent).toContain("ALWAYS FAILS");
	});

	test("warns on the console", () => {
		render(siteKey);
		expect(vi.mocked(console.warn).mock.calls[0]?.[0]).toContain("FAILS");
	});
});

describe("tearing down", () => {
	test("removes the banner", () => {
		render(ALWAYS_PASS_SITE_KEY);
		banner?.destroy();
		banner = undefined;
		expect(rendered()).toBeNull();
	});

	test("tolerates being destroyed twice", () => {
		render(ALWAYS_PASS_SITE_KEY);
		banner?.destroy();
		expect(() => banner?.destroy()).not.toThrow();
		banner = undefined;
	});
});
