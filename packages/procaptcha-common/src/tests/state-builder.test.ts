// Copyright 2021-2025 Prosopo (UK) Ltd.
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
import { buildUpdateState, useProcaptcha } from "../state/builder.js";

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

	describe("useProcaptcha", () => {
		it("should initialize with default state values", () => {
			const useState = vi.fn((defaultValue) => [defaultValue, vi.fn()]);
			const useRef = vi.fn((defaultValue) => ({ current: defaultValue }));

			// biome-ignore lint/suspicious/noExplicitAny: Mock useState/useRef functions
			const [state, updateFn] = useProcaptcha(useState as any, useRef as any);

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
			expect(typeof updateFn).toBe("function");
		});

		it("should call appropriate setters when updating state", () => {
			// biome-ignore lint/suspicious/noExplicitAny: Mock setter functions
			const setters: Record<string, any> = {};

			const useState = vi.fn((defaultValue) => {
				// Create a unique key based on the type and value to track different state variables
				const key =
					typeof defaultValue === "boolean"
						? `boolean-${defaultValue}`
						: typeof defaultValue === "number"
							? `number-${defaultValue}`
							: Array.isArray(defaultValue)
								? "array"
								: "other";

				if (!setters[key]) {
					setters[key] = vi.fn();
				}
				return [defaultValue, setters[key]];
			});

			const useRef = vi.fn((defaultValue) => ({ current: defaultValue }));

			// biome-ignore lint/suspicious/noExplicitAny: Mock useState/useRef functions
			const [state, updateFn] = useProcaptcha(useState as any, useRef as any);

			updateFn({
				isHuman: true,
				index: 5,
				loading: true,
				attemptCount: 3,
			});

			// Check that setters were called
			// isHuman setter (boolean-false)
			expect(setters["boolean-false"]).toHaveBeenCalledWith(true);
			// index and attemptCount setters (both number-0)
			expect(setters["number-0"]).toHaveBeenCalledWith(5);
			expect(setters["number-0"]).toHaveBeenCalledWith(3);
		});

		it("should handle solutions array correctly with slice", () => {
			const setSolutions = vi.fn();
			// biome-ignore lint/suspicious/noExplicitAny: Mock solutions array
			let solutionsValue: any[] = [];

			const useState = vi.fn((defaultValue) => {
				if (Array.isArray(defaultValue)) {
					return [
						solutionsValue,
						// biome-ignore lint/suspicious/noExplicitAny: Mock setter function
						(newValue: any) => {
							solutionsValue = newValue;
							setSolutions(newValue);
						},
					];
				}
				return [defaultValue, vi.fn()];
			});

			const useRef = vi.fn((defaultValue) => ({ current: defaultValue }));

			// biome-ignore lint/suspicious/noExplicitAny: Mock useState/useRef functions
			const [state, updateFn] = useProcaptcha(useState as any, useRef as any);

			const newSolutions: [string, number, number][][] = [[["test", 1, 2]]];
			updateFn({ solutions: newSolutions });

			expect(setSolutions).toHaveBeenCalled();
			// Verify that slice was called by checking that we got a new array reference
			const callArg = setSolutions.mock.calls[0][0];
			expect(callArg).not.toBe(newSolutions);
			expect(callArg).toEqual(newSolutions);
		});

		it("should not call setters for undefined values in partial update", () => {
			const setIsHuman = vi.fn();
			const setIndex = vi.fn();

			// biome-ignore lint/suspicious/noExplicitAny: Mock setter tracking
			let isHumanSetter: any;
			// biome-ignore lint/suspicious/noExplicitAny: Mock setter tracking
			let indexSetter: any;

			const useState = vi.fn((defaultValue) => {
				if (defaultValue === false) {
					isHumanSetter = setIsHuman;
					return [false, setIsHuman];
				}
				if (defaultValue === 0) {
					indexSetter = setIndex;
					return [0, setIndex];
				}
				return [defaultValue, vi.fn()];
			});

			const useRef = vi.fn((defaultValue) => ({ current: defaultValue }));

			// biome-ignore lint/suspicious/noExplicitAny: Mock useState/useRef functions
			const [state, updateFn] = useProcaptcha(useState as any, useRef as any);

			updateFn({ isHuman: true });

			expect(setIsHuman).toHaveBeenCalledWith(true);
			expect(setIndex).not.toHaveBeenCalled();
		});

		it("should handle error state update", () => {
			const setError = vi.fn();

			const useState = vi.fn((defaultValue) => {
				if (defaultValue === undefined && setError.mock.calls.length === 0) {
					return [undefined, setError];
				}
				return [defaultValue, vi.fn()];
			});

			const useRef = vi.fn((defaultValue) => ({ current: defaultValue }));

			// biome-ignore lint/suspicious/noExplicitAny: Mock useState/useRef functions
			const [state, updateFn] = useProcaptcha(useState as any, useRef as any);

			const errorObj = { message: "Test error", key: "testKey" };
			updateFn({ error: errorObj });

			expect(setError).toHaveBeenCalledWith(errorObj);
		});
	});
});
