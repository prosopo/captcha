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

/** @jsxImportSource @emotion/react */

import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import Modal from "../components/Modal.js";
import { type Mounted, mount } from "./render.js";

let mounted: Mounted;

const render = (
	show: boolean,
	children: ReactNode = <p>challenge</p>,
): void => {
	mounted.render(<Modal show={show}>{children}</Modal>);
};

const outer = (): HTMLElement => {
	const element = document.querySelector<HTMLElement>(".prosopo-modalOuter");
	if (!element) throw new Error("expected the modal to be rendered");
	return element;
};

beforeEach(() => {
	mounted = mount();
});

afterEach(() => {
	mounted.unmount();
});

describe("where the modal renders", () => {
	test("attaches itself to the document body, not to the widget", () => {
		// A consumer's stacking or overflow rules would otherwise clip or hide
		// the challenge, which is why this is a portal in the first place.
		render(true);
		expect(outer().parentElement).toBe(document.body);
		expect(mounted.container.querySelector(".prosopo-modalOuter")).toBeNull();
	});

	test("renders its children inside the inner panel", () => {
		render(true);
		const inner = outer().querySelector(".prosopo-modalInner");
		expect(inner?.textContent).toBe("challenge");
	});

	test("renders an empty panel when there is nothing to show", () => {
		render(true, null);
		expect(outer().querySelector(".prosopo-modalInner")?.textContent).toBe("");
	});

	test("is removed from the body when the widget unmounts", () => {
		render(true);
		mounted.unmount();
		expect(document.querySelector(".prosopo-modalOuter")).toBeNull();
		mounted = mount();
	});
});

describe("showing and hiding", () => {
	test("a shown modal lays its contents out", () => {
		render(true);
		expect(outer().style.display).toBe("flex");
	});

	test("a hidden modal stays in the DOM but is not displayed", () => {
		// The children keep their state — the challenge is not re-fetched when
		// the modal is reopened.
		render(false);
		expect(outer().style.display).toBe("none");
		expect(outer().textContent).toBe("challenge");
	});

	test("toggling show flips the display without remounting", () => {
		render(false);
		const before = outer();
		render(true);
		expect(outer()).toBe(before);
		expect(outer().style.display).toBe("flex");
	});
});

describe("stacking", () => {
	test("sits above everything a host page is likely to stack", () => {
		render(true);
		expect(outer().style.zIndex).toBe("2147483646");
	});

	test("covers the viewport so the page behind cannot be clicked", () => {
		render(true);
		expect(outer().style.position).toBe("fixed");
		expect(outer().style.minHeight).toBe("100vh");
	});
});
