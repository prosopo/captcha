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
import { describe, expect, it, vi } from "vitest";
import { buildUpdateState } from "../state/builder.js";
import {
	createProcaptchaState,
	createRenderScheduler,
} from "../state/store.js";

describe("state/builder", () => {
	describe("buildUpdateState", () => {
		it("should mutate state and call onStateUpdate with partial state", () => {
			const state: ProcaptchaState = {
				isHuman: false,
				index: 0,
				solutions: [],
				captchaApi: undefined,
				showModal: false,
				challenge: undefined,
				loading: false,
				account: undefined,
				dappAccount: undefined,
				submission: undefined,
				timeout: undefined,
				successfullChallengeTimeout: undefined,
				sendData: false,
				attemptCount: 0,
				error: undefined,
				sessionId: undefined,
			};

			const onStateUpdate = vi.fn();
			const updateState = buildUpdateState(state, onStateUpdate);

			const partialState = { isHuman: true, attemptCount: 1 };
			updateState(partialState);

			expect(state.isHuman).toBe(true);
			expect(state.attemptCount).toBe(1);
			expect(onStateUpdate).toHaveBeenCalledWith(partialState);
		});

		it("should handle multiple property updates in order", () => {
			const state: ProcaptchaState = {
				isHuman: false,
				index: 0,
				solutions: [],
				captchaApi: undefined,
				showModal: false,
				challenge: undefined,
				loading: false,
				account: undefined,
				dappAccount: undefined,
				submission: undefined,
				timeout: undefined,
				successfullChallengeTimeout: undefined,
				sendData: false,
				attemptCount: 0,
				error: undefined,
				sessionId: undefined,
			};

			const onStateUpdate = vi.fn();
			const updateState = buildUpdateState(state, onStateUpdate);

			updateState({ loading: true, index: 5, showModal: true });

			expect(state.loading).toBe(true);
			expect(state.index).toBe(5);
			expect(state.showModal).toBe(true);
		});

		it("should update error state correctly", () => {
			const state: ProcaptchaState = {
				isHuman: false,
				index: 0,
				solutions: [],
				captchaApi: undefined,
				showModal: false,
				challenge: undefined,
				loading: false,
				account: undefined,
				dappAccount: undefined,
				submission: undefined,
				timeout: undefined,
				successfullChallengeTimeout: undefined,
				sendData: false,
				attemptCount: 0,
				error: undefined,
				sessionId: undefined,
			};

			const onStateUpdate = vi.fn();
			const updateState = buildUpdateState(state, onStateUpdate);

			const errorObj = { message: "Test error", key: "test" };
			updateState({ error: errorObj });

			expect(state.error).toEqual(errorObj);
			expect(onStateUpdate).toHaveBeenCalledWith({ error: errorObj });
		});
	});

	describe("createProcaptchaState", () => {
		it("should initialize with default state values", () => {
			const { state } = createProcaptchaState();

			expect(state.isHuman).toBe(false);
			expect(state.index).toBe(0);
			expect(state.solutions).toEqual([]);
			expect(state.showModal).toBe(false);
			expect(state.loading).toBe(false);
			expect(state.sendData).toBe(false);
			expect(state.attemptCount).toBe(0);
			expect(state.account).toBeUndefined();
			expect(state.captchaApi).toBeUndefined();
			expect(state.challenge).toBeUndefined();
			expect(state.error).toBeUndefined();
		});

		it("should assign the partial update onto the live state object", () => {
			const { state, update } = createProcaptchaState();

			update({ isHuman: true, index: 5, loading: true, attemptCount: 3 });

			expect(state.isHuman).toBe(true);
			expect(state.index).toBe(5);
			expect(state.loading).toBe(true);
			expect(state.attemptCount).toBe(3);
		});

		it("should notify subscribers with only the changed keys", () => {
			const { update, subscribe } = createProcaptchaState();
			const listener = vi.fn();
			subscribe(listener);

			update({ isHuman: true });

			expect(listener).toHaveBeenCalledWith({ isHuman: true });
		});

		it("should stop notifying after unsubscribe", () => {
			const { update, subscribe } = createProcaptchaState();
			const listener = vi.fn();
			const unsubscribe = subscribe(listener);

			unsubscribe();
			update({ isHuman: true });

			expect(listener).not.toHaveBeenCalled();
		});

		it("should leave untouched keys alone on a partial update", () => {
			const { state, update } = createProcaptchaState();

			update({ isHuman: true });

			expect(state.isHuman).toBe(true);
			expect(state.index).toBe(0);
		});

		it("should handle error state update", () => {
			const { state, update } = createProcaptchaState();
			const errorObj = { message: "Test error", key: "testKey" };

			update({ error: errorObj });

			expect(state.error).toEqual(errorObj);
		});
	});

	describe("createRenderScheduler", () => {
		it("should coalesce repeat schedules into one render", async () => {
			const render = vi.fn();
			const scheduler = createRenderScheduler(render);

			scheduler.schedule();
			scheduler.schedule();
			scheduler.schedule();
			expect(render).not.toHaveBeenCalled();

			await Promise.resolve();
			expect(render).toHaveBeenCalledTimes(1);
		});

		it("should render synchronously on flush", () => {
			const render = vi.fn();
			const scheduler = createRenderScheduler(render);

			scheduler.schedule();
			scheduler.flush();

			expect(render).toHaveBeenCalledTimes(1);
		});

		it("should not render after cancel", async () => {
			const render = vi.fn();
			const scheduler = createRenderScheduler(render);

			scheduler.schedule();
			scheduler.cancel();
			await Promise.resolve();

			expect(render).not.toHaveBeenCalled();
		});
	});
});
