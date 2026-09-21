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

import { describe, expect, it } from "vitest";
import {
	MAX_SESSION_INVALIDATED_RETRIES,
	type MutableRef,
	type RetryCoords,
	consumeRetryMountProps,
	handleSessionInvalidated,
	normaliseRetryCoords,
} from "../sessionInvalidatedRecovery.js";

const ref = <T>(initial: T): MutableRef<T> => ({ current: initial });

describe("handleSessionInvalidated", () => {
	it("records both coords and signals a restart on the first fire", () => {
		const attemptsRef = ref(0);
		const coordsRef = ref<RetryCoords | null>(null);

		const result = handleSessionInvalidated(120, 340, attemptsRef, coordsRef);

		expect(result).toEqual({ shouldRestart: true, exhausted: false });
		expect(attemptsRef.current).toBe(1);
		expect(coordsRef.current).toEqual({ x: 120, y: 340 });
	});

	it("treats (0, 0) as 'no coords' — that's the autoStart / untrusted-event default, not a real click", () => {
		const attemptsRef = ref(0);
		const coordsRef = ref<RetryCoords | null>(null);

		const result = handleSessionInvalidated(0, 0, attemptsRef, coordsRef);

		expect(result).toEqual({ shouldRestart: true, exhausted: false });
		expect(coordsRef.current).toBeNull();
	});

	it("carries a real click even if only one axis is at the origin", () => {
		const attemptsRef = ref(0);
		const coordsRef = ref<RetryCoords | null>(null);

		handleSessionInvalidated(0, 340, attemptsRef, coordsRef);

		expect(coordsRef.current).toEqual({ x: 0, y: 340 });
	});

	it("stores no coords when x or y is undefined (autoStart / non-trusted event)", () => {
		const attemptsRef = ref(0);
		const coordsRef = ref<RetryCoords | null>(null);

		const result = handleSessionInvalidated(
			undefined,
			undefined,
			attemptsRef,
			coordsRef,
		);

		expect(result).toEqual({ shouldRestart: true, exhausted: false });
		expect(attemptsRef.current).toBe(1);
		expect(coordsRef.current).toBeNull();
	});

	it("stores no coords when only one axis is present — never emit NaN into the salt", () => {
		const attemptsRef = ref(0);
		const coordsRef = ref<RetryCoords | null>(null);

		handleSessionInvalidated(120, undefined, attemptsRef, coordsRef);

		expect(coordsRef.current).toBeNull();
	});

	it("keeps re-minting up to the retry budget — a reload press is a legitimate new session", () => {
		const attemptsRef = ref(0);
		const coordsRef = ref<RetryCoords | null>(null);

		for (let i = 0; i < MAX_SESSION_INVALIDATED_RETRIES; i++) {
			expect(
				handleSessionInvalidated(100 + i, 200 + i, attemptsRef, coordsRef),
			).toEqual({ shouldRestart: true, exhausted: false });
		}

		expect(attemptsRef.current).toBe(MAX_SESSION_INVALIDATED_RETRIES);
	});

	it("reports exhausted once the budget is spent so the caller can fall over visibly", () => {
		const attemptsRef = ref(MAX_SESSION_INVALIDATED_RETRIES);
		const coordsRef = ref<RetryCoords | null>({ x: 100, y: 200 });

		const result = handleSessionInvalidated(500, 600, attemptsRef, coordsRef);

		expect(result).toEqual({ shouldRestart: false, exhausted: true });
		// An exhausted call must not overwrite the pending attempt's coords.
		expect(coordsRef.current).toEqual({ x: 100, y: 200 });
		expect(attemptsRef.current).toBe(MAX_SESSION_INVALIDATED_RETRIES);
	});

	it("honours a caller-supplied budget", () => {
		const attemptsRef = ref(0);
		const coordsRef = ref<RetryCoords | null>(null);

		expect(handleSessionInvalidated(1, 2, attemptsRef, coordsRef, 1)).toEqual({
			shouldRestart: true,
			exhausted: false,
		});
		expect(handleSessionInvalidated(3, 4, attemptsRef, coordsRef, 1)).toEqual({
			shouldRestart: false,
			exhausted: true,
		});
	});
});

describe("consumeRetryMountProps", () => {
	it("returns pending retry coords and forces autoStart", () => {
		const coordsRef = ref<RetryCoords | null>({ x: 42, y: 99 });

		const mount = consumeRetryMountProps(coordsRef, false);

		expect(mount).toEqual({
			autoStart: true,
			startCoords: { x: 42, y: 99 },
		});
	});

	it("clears the coords ref so a subsequent render doesn't re-inject stale values", () => {
		const coordsRef = ref<RetryCoords | null>({ x: 42, y: 99 });

		consumeRetryMountProps(coordsRef, false);

		expect(coordsRef.current).toBeNull();
	});

	it("propagates escalationAutoStart when no retry is pending (post-PoW escalation path)", () => {
		const coordsRef = ref<RetryCoords | null>(null);

		const mount = consumeRetryMountProps(coordsRef, true);

		expect(mount).toEqual({ autoStart: true, startCoords: undefined });
	});

	it("returns autoStart=false, startCoords=undefined for the initial checkbox mount", () => {
		const coordsRef = ref<RetryCoords | null>(null);

		const mount = consumeRetryMountProps(coordsRef, false);

		expect(mount).toEqual({ autoStart: false, startCoords: undefined });
	});
});

describe("normaliseRetryCoords", () => {
	it("keeps a real click", () => {
		expect(normaliseRetryCoords(120, 340)).toEqual({ x: 120, y: 340 });
	});

	it("keeps a click that sits on one axis", () => {
		expect(normaliseRetryCoords(0, 340)).toEqual({ x: 0, y: 340 });
	});

	it("drops (0, 0) — the autoStart / untrusted-event default, not a click", () => {
		expect(normaliseRetryCoords(0, 0)).toBeNull();
	});

	it("drops a half-pair rather than letting NaN reach the salt", () => {
		expect(normaliseRetryCoords(120, undefined)).toBeNull();
		expect(normaliseRetryCoords(undefined, 340)).toBeNull();
	});

	it("drops a missing pair", () => {
		expect(normaliseRetryCoords(undefined, undefined)).toBeNull();
	});
});
