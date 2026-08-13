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
import { describe, expect, test, vi } from "vitest";
import {
	createProcaptchaState,
	createRenderScheduler,
	defaultProcaptchaState,
} from "../state/store.js";

/**
 * The store replaces `useProcaptcha`. Managers capture `state` by reference and
 * mutate it, so the identity of that object — and the order keys are assigned
 * in — are part of the contract, not implementation detail.
 */

const drain = async (): Promise<void> => {
	await Promise.resolve();
	await Promise.resolve();
};

describe("defaultProcaptchaState", () => {
	test("starts unsolved, unloaded and error-free", () => {
		const state = defaultProcaptchaState();
		expect(state.isHuman).toBe(false);
		expect(state.loading).toBe(false);
		expect(state.showModal).toBe(false);
		expect(state.error).toBeUndefined();
	});

	test("hands out a fresh object each call", () => {
		// Two widgets on a page must not share a solutions array.
		const first = defaultProcaptchaState();
		const second = defaultProcaptchaState();
		expect(first).not.toBe(second);
		expect(first.solutions).not.toBe(second.solutions);
	});
});

describe("createProcaptchaState", () => {
	test("exposes a state object that updates in place", () => {
		// The Manager holds this reference for its whole lifetime; replacing the
		// object would leave it writing to a detached copy.
		const store = createProcaptchaState();
		const captured = store.state;

		store.update({ isHuman: true });

		expect(captured).toBe(store.state);
		expect(captured.isHuman).toBe(true);
	});

	test("leaves keys the update did not mention alone", () => {
		const store = createProcaptchaState();
		store.update({ isHuman: true });
		store.update({ loading: true });
		expect(store.state.isHuman).toBe(true);
	});

	test("assigns in the order the caller wrote the keys", () => {
		// The Managers' `defaultState()` relies on it — modal off before loading
		// off, and so on.
		const store = createProcaptchaState();
		const seen: string[] = [];
		const probe = {} as Partial<ProcaptchaState>;
		for (const key of ["showModal", "loading"] as const) {
			Object.defineProperty(probe, key, {
				enumerable: true,
				get: () => {
					seen.push(key);
					return false;
				},
			});
		}

		store.update(probe);

		expect(seen).toEqual(["showModal", "loading"]);
	});

	test("notifies a subscriber with just the changed keys", () => {
		const store = createProcaptchaState();
		const listener = vi.fn<(changed: Partial<ProcaptchaState>) => void>();
		store.subscribe(listener);

		store.update({ loading: true });

		expect(listener).toHaveBeenCalledWith({ loading: true });
	});

	test("notifies every subscriber", () => {
		const store = createProcaptchaState();
		const first = vi.fn<(changed: Partial<ProcaptchaState>) => void>();
		const second = vi.fn<(changed: Partial<ProcaptchaState>) => void>();
		store.subscribe(first);
		store.subscribe(second);

		store.update({ loading: true });

		expect(first).toHaveBeenCalledTimes(1);
		expect(second).toHaveBeenCalledTimes(1);
	});

	test("stops notifying once unsubscribed", () => {
		const store = createProcaptchaState();
		const listener = vi.fn<(changed: Partial<ProcaptchaState>) => void>();
		const unsubscribe = store.subscribe(listener);

		unsubscribe();
		store.update({ loading: true });

		expect(listener).not.toHaveBeenCalled();
	});

	test("survives a subscriber unsubscribing mid-notification", () => {
		// A widget destroyed by a callback fired from its own state change would
		// otherwise mutate the set being iterated.
		const store = createProcaptchaState();
		const second = vi.fn<(changed: Partial<ProcaptchaState>) => void>();
		const unsubscribeSecond = store.subscribe(second);
		store.subscribe(() => unsubscribeSecond());

		expect(() => store.update({ loading: true })).not.toThrow();
	});

	test("state is applied before subscribers run", () => {
		// Subscribers re-render off `store.state`, not off the payload.
		const store = createProcaptchaState();
		let seen: boolean | undefined;
		store.subscribe(() => {
			seen = store.state.isHuman;
		});

		store.update({ isHuman: true });

		expect(seen).toBe(true);
	});
});

describe("createRenderScheduler", () => {
	test("does not render synchronously", () => {
		const render = vi.fn<() => void>();
		createRenderScheduler(render).schedule();
		expect(render).not.toHaveBeenCalled();
	});

	test("renders once the microtask queue drains", async () => {
		const render = vi.fn<() => void>();
		createRenderScheduler(render).schedule();
		await drain();
		expect(render).toHaveBeenCalledTimes(1);
	});

	test("coalesces a burst of updates into one render", async () => {
		// Managers issue several updateState calls per logical transition; one
		// render each would rebuild the DOM repeatedly for a single change.
		const render = vi.fn<() => void>();
		const scheduler = createRenderScheduler(render);

		scheduler.schedule();
		scheduler.schedule();
		scheduler.schedule();
		await drain();

		expect(render).toHaveBeenCalledTimes(1);
	});

	test("renders again for a later, separate update", async () => {
		const render = vi.fn<() => void>();
		const scheduler = createRenderScheduler(render);

		scheduler.schedule();
		await drain();
		scheduler.schedule();
		await drain();

		expect(render).toHaveBeenCalledTimes(2);
	});

	test("flush renders a pending update immediately", () => {
		const render = vi.fn<() => void>();
		const scheduler = createRenderScheduler(render);

		scheduler.schedule();
		scheduler.flush();

		expect(render).toHaveBeenCalledTimes(1);
	});

	test("flush does nothing when no render is pending", () => {
		const render = vi.fn<() => void>();
		createRenderScheduler(render).flush();
		expect(render).not.toHaveBeenCalled();
	});

	test("a flushed update does not render a second time", async () => {
		const render = vi.fn<() => void>();
		const scheduler = createRenderScheduler(render);

		scheduler.schedule();
		scheduler.flush();
		await drain();

		expect(render).toHaveBeenCalledTimes(1);
	});

	test("cancel drops a queued render", async () => {
		// Without this a render scheduled just before `destroy` would run against
		// components that have already been torn down.
		const render = vi.fn<() => void>();
		const scheduler = createRenderScheduler(render);

		scheduler.schedule();
		scheduler.cancel();
		await drain();

		expect(render).not.toHaveBeenCalled();
	});

	test("cancel is permanent", async () => {
		const render = vi.fn<() => void>();
		const scheduler = createRenderScheduler(render);

		scheduler.cancel();
		scheduler.schedule();
		await drain();
		scheduler.flush();

		expect(render).not.toHaveBeenCalled();
	});
});
