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

import { afterEach, describe, expect, test, vi } from "vitest";
import type { TrustableEvent } from "../events/trust.js";

/**
 * Every interactive element in the widget funnels through this gate: a
 * synthetic event is precisely how a bot drives a page, so honouring one hands
 * the captcha over. The build-time allowance exists only so the firefox cypress
 * leg can click at all, and must fold away everywhere else.
 */

const ALLOWANCE = "__PROSOPO_ALLOW_UNTRUSTED_EVENTS__";

const event = (isTrusted: boolean): TrustableEvent => ({ isTrusted });

/**
 * The allowance is a bundler `define` constant, not a global read — the module
 * has to be re-imported for a different value to take effect, and the identifier
 * must be genuinely absent to reproduce a build that never defined it.
 */
const load = async (
	allowance?: boolean,
): Promise<(candidate: TrustableEvent) => boolean> => {
	vi.resetModules();
	const scope = globalThis as Record<string, unknown>;
	if (undefined === allowance) {
		delete scope[ALLOWANCE];
	} else {
		scope[ALLOWANCE] = allowance;
	}
	return (await import("../events/trust.js")).isEventTrusted;
};

afterEach(() => {
	delete (globalThis as Record<string, unknown>)[ALLOWANCE];
	vi.resetModules();
});

describe("isEventTrusted", () => {
	test("accepts a trusted event", async () => {
		const isEventTrusted = await load();
		expect(isEventTrusted(event(true))).toBe(true);
	});

	test("rejects a synthetic event in a build with no allowance", async () => {
		// The identifier is undeclared in such a build, so the read must be
		// guarded rather than throwing a ReferenceError.
		const isEventTrusted = await load();
		expect(isEventTrusted(event(false))).toBe(false);
	});

	test("rejects a synthetic event when the allowance is pinned false", async () => {
		// Production builds pin the constant to false and the branch folds away.
		const isEventTrusted = await load(false);
		expect(isEventTrusted(event(false))).toBe(false);
	});

	test("accepts a synthetic event when the allowance is on", async () => {
		// The firefox cypress leg: cypress can only dispatch trusted input over
		// the chrome devtools protocol, which is chromium-only.
		const isEventTrusted = await load(true);
		expect(isEventTrusted(event(false))).toBe(true);
	});

	test("still accepts a trusted event when the allowance is on", async () => {
		const isEventTrusted = await load(true);
		expect(isEventTrusted(event(true))).toBe(true);
	});

	test("accepts a real DOM event dispatched by the browser path", async () => {
		// Real events expose isTrusted as an accessor rather than an own property,
		// so the check must read it the way the DOM exposes it.
		const isEventTrusted = await load();
		expect(isEventTrusted(new MouseEvent("click"))).toBe(false);
	});
});
