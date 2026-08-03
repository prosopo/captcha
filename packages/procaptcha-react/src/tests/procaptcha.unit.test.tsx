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
import type { ReactElement } from "react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import Procaptcha from "../components/Procaptcha.js";
import { config } from "./harness.js";
import { type Mounted, mount } from "./render.js";

// The widget is code-split behind React.lazy, so the point of this component
// is the boundary, not the widget: the stub records the props that made it
// across and lets the test control when the chunk "arrives".
const seen: ProcaptchaProps[] = [];

vi.mock("../components/ProcaptchaWidget.js", () => ({
	default: (props: ProcaptchaProps): ReactElement => {
		seen.push(props);
		return <div data-cy="widget-stub">widget</div>;
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

/** React.lazy resolves its import in a microtask, so a render is not visible
 * until the queue has drained. */
const settle = async (): Promise<void> => {
	await act(async () => {
		await Promise.resolve();
	});
};

beforeEach(() => {
	seen.length = 0;
	mounted = mount();
});

afterEach(() => {
	mounted.unmount();
});

describe("the lazy boundary", () => {
	test("renders the widget once the chunk arrives", async () => {
		// Suspense has no fallback on purpose: a placeholder would flash a
		// second widget-sized box into the host page before the real one lands,
		// so there is nothing to assert until the chunk resolves.
		mounted.render(<Procaptcha {...props()} />);
		await settle();
		expect(
			mounted.container.querySelector('[data-cy="widget-stub"]'),
		).not.toBeNull();
	});

	test("hands the widget every prop it was given", async () => {
		const callbacks: ProcaptchaProps["callbacks"] = { onHuman: vi.fn() };
		const given = props({ callbacks, autoStart: true });
		mounted.render(<Procaptcha {...given} />);
		await settle();
		expect(seen[0]).toMatchObject({
			callbacks,
			autoStart: true,
			config: given.config,
		});
	});

	test("does not add props of its own", async () => {
		const given = props();
		mounted.render(<Procaptcha {...given} />);
		await settle();
		expect(Object.keys(seen[0] ?? {}).sort()).toEqual(
			Object.keys(given).sort(),
		);
	});
});
