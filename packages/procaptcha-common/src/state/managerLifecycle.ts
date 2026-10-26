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

export interface ManagerLifecycle {
	/** Clears the challenge and solution-expiry timers, and drops them from state. */
	clearTimers(): void;
	/** Calls `onExpired` once a solved challenge's token has lapsed, unless disposed first. */
	expireSolutionAfter(timeoutMs: number, onExpired: () => void): void;
	/**
	 * Stops both timers without firing any event. Left running after the
	 * widget is torn down they would fire onExpired/onReset later, clearing the
	 * replacement widget's token from the form.
	 */
	dispose(): void;
	/** A solve still in flight can land after dispose, so callers check this too. */
	isDisposed(): boolean;
}

export const createManagerLifecycle = (
	state: ProcaptchaState,
	updateState: (nextState: Partial<ProcaptchaState>) => void,
): ManagerLifecycle => {
	let disposed = false;

	return {
		clearTimers: () => {
			window.clearTimeout(Number(state.timeout));
			updateState({ timeout: undefined });
			window.clearTimeout(Number(state.successfullChallengeTimeout));
			updateState({ successfullChallengeTimeout: undefined });
		},
		expireSolutionAfter: (timeoutMs: number, onExpired: () => void) => {
			const successfullChallengeTimeout = setTimeout(() => {
				if (disposed) return;
				onExpired();
			}, timeoutMs);
			updateState({ successfullChallengeTimeout });
		},
		dispose: () => {
			disposed = true;
			window.clearTimeout(Number(state.timeout));
			window.clearTimeout(Number(state.successfullChallengeTimeout));
		},
		isDisposed: () => disposed,
	};
};
