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

import type { ProcaptchaState, ProcaptchaStateUpdateFn } from "@prosopo/types";

export type ProcaptchaStateListener = (
	changed: Partial<ProcaptchaState>,
) => void;

export interface ProcaptchaStateHandle {
	/**
	 * The live state object. Managers capture this by reference and mutate it
	 * through `buildUpdateState`, so readers always see the current values —
	 * there is no snapshot to go stale, which is what the React `useRef`-held
	 * Manager was working around.
	 */
	readonly state: ProcaptchaState;
	readonly update: ProcaptchaStateUpdateFn;
	subscribe(listener: ProcaptchaStateListener): () => void;
}

export const defaultProcaptchaState = (): ProcaptchaState => ({
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
});

/**
 * Vanilla replacement for the `useProcaptcha` hook. One mutable state object
 * plus a listener list, in place of sixteen `useState`/`useRef` pairs that were
 * only ever read back through the same mutated object.
 *
 * `update` both assigns and notifies. Managers wrap it in `buildUpdateState`,
 * which assigns as well — the second assignment is a no-op, and keeping it here
 * means callers that hold the raw update function (the `procaptcha:execute`
 * handlers) still mutate state rather than only signalling.
 */
export const createProcaptchaState = (): ProcaptchaStateHandle => {
	const state = defaultProcaptchaState();
	const listeners = new Set<ProcaptchaStateListener>();

	const update: ProcaptchaStateUpdateFn = (
		nextState: Partial<ProcaptchaState>,
	) => {
		// Assign in the order the caller wrote the keys — `defaultState()` in the
		// Managers relies on it (modal off before loading off, etc.).
		Object.assign(state, nextState);
		for (const listener of [...listeners]) {
			listener(nextState);
		}
	};

	return {
		state,
		update,
		subscribe: (listener: ProcaptchaStateListener): (() => void) => {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
	};
};

export interface RenderScheduler {
	/** Queue a render on the microtask queue, coalescing repeat calls. */
	schedule(): void;
	/** Run a queued render now, if one is pending. */
	flush(): void;
	/** Drop any queued render — call from `destroy`. */
	cancel(): void;
}

/**
 * Managers issue several `updateState` calls in a row (loading, then attempt
 * count, then session id, ...). Rendering on each one would rebuild the DOM
 * repeatedly for a single logical transition, so renders coalesce onto a
 * microtask — the same batching React gave us for free.
 */
export const createRenderScheduler = (render: () => void): RenderScheduler => {
	let queued = false;
	let cancelled = false;

	const run = () => {
		if (!queued || cancelled) {
			return;
		}
		queued = false;
		render();
	};

	return {
		schedule: () => {
			if (queued || cancelled) {
				return;
			}
			queued = true;
			queueMicrotask(run);
		},
		flush: run,
		cancel: () => {
			cancelled = true;
			queued = false;
		},
	};
};
