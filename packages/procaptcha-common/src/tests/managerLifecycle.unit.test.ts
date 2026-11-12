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

import type { ProcaptchaState } from "@prosopo/types";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { createManagerLifecycle } from "../state/managerLifecycle.js";
import { createSpentSessionGuard } from "../state/spentSession.js";
import { defaultProcaptchaState } from "../state/store.js";

describe("createManagerLifecycle", () => {
	let state: ProcaptchaState;
	const updates: Partial<ProcaptchaState>[] = [];
	const updateState = (next: Partial<ProcaptchaState>): void => {
		Object.assign(state, next);
		updates.push(next);
	};

	beforeEach(() => {
		vi.useFakeTimers();
		state = defaultProcaptchaState();
		updates.length = 0;
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	test("expires a solution after the timeout", () => {
		const onExpired = vi.fn<() => void>();
		createManagerLifecycle(state, updateState).expireSolutionAfter(
			1000,
			onExpired,
		);
		expect(state.successfullChallengeTimeout).toBeDefined();
		vi.advanceTimersByTime(1000);
		expect(onExpired).toHaveBeenCalledTimes(1);
	});

	test("clearing the timers cancels the expiry and drops it from state", () => {
		const onExpired = vi.fn<() => void>();
		const lifecycle = createManagerLifecycle(state, updateState);
		lifecycle.expireSolutionAfter(1000, onExpired);
		lifecycle.clearTimers();
		vi.advanceTimersByTime(1000);
		expect(onExpired).not.toHaveBeenCalled();
		expect(updates.slice(-2)).toEqual([
			{ timeout: undefined },
			{ successfullChallengeTimeout: undefined },
		]);
	});

	test("disposing cancels the expiry without touching state", () => {
		const onExpired = vi.fn<() => void>();
		const lifecycle = createManagerLifecycle(state, updateState);
		lifecycle.expireSolutionAfter(1000, onExpired);
		const updatesBefore = updates.length;
		lifecycle.dispose();
		vi.advanceTimersByTime(1000);
		expect(onExpired).not.toHaveBeenCalled();
		expect(updates).toHaveLength(updatesBefore);
		expect(lifecycle.isDisposed()).toBe(true);
	});

	test("an expiry scheduled after dispose never fires", () => {
		const onExpired = vi.fn<() => void>();
		const lifecycle = createManagerLifecycle(state, updateState);
		lifecycle.dispose();
		lifecycle.expireSolutionAfter(1000, onExpired);
		vi.advanceTimersByTime(1000);
		expect(onExpired).not.toHaveBeenCalled();
	});
});

describe("createSpentSessionGuard", () => {
	test("reports a session spent once marked", () => {
		const guard = createSpentSessionGuard();
		expect(guard.isSpent("a")).toBe(false);
		guard.markSpent("a");
		expect(guard.isSpent("a")).toBe(true);
		expect(guard.isSpent("b")).toBe(false);
	});

	test("never treats a missing session as spent", () => {
		const guard = createSpentSessionGuard();
		guard.markSpent(undefined);
		expect(guard.isSpent(undefined)).toBe(false);
	});
});
