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
	type MutableRef,
	type RetryCoords,
	consumeRetryMountProps,
	handleSessionInvalidated,
} from "../sessionInvalidatedRecovery.js";

const ref = <T>(initial: T): MutableRef<T> => ({ current: initial });

describe("handleSessionInvalidated", () => {
	it("records both coords and signals a restart on the first fire", () => {
		const firedRef = ref(false);
		const coordsRef = ref<RetryCoords | null>(null);

		const result = handleSessionInvalidated(120, 340, firedRef, coordsRef);

		expect(result).toEqual({ shouldRestart: true });
		expect(firedRef.current).toBe(true);
		expect(coordsRef.current).toEqual({ x: 120, y: 340 });
	});

	it("treats (0, 0) as 'no coords' — that's the autoStart / untrusted-event default, not a real click", () => {
		const firedRef = ref(false);
		const coordsRef = ref<RetryCoords | null>(null);

		const result = handleSessionInvalidated(0, 0, firedRef, coordsRef);

		expect(result).toEqual({ shouldRestart: true });
		expect(coordsRef.current).toBeNull();
	});

	it("carries a real click even if only one axis is at the origin", () => {
		const firedRef = ref(false);
		const coordsRef = ref<RetryCoords | null>(null);

		handleSessionInvalidated(0, 340, firedRef, coordsRef);

		expect(coordsRef.current).toEqual({ x: 0, y: 340 });
	});

	it("stores no coords when x or y is undefined (autoStart / non-trusted event)", () => {
		const firedRef = ref(false);
		const coordsRef = ref<RetryCoords | null>(null);

		const result = handleSessionInvalidated(
			undefined,
			undefined,
			firedRef,
			coordsRef,
		);

		expect(result).toEqual({ shouldRestart: true });
		expect(firedRef.current).toBe(true);
		expect(coordsRef.current).toBeNull();
	});

	it("stores no coords when only one axis is present — never emit NaN into the salt", () => {
		const firedRef = ref(false);
		const coordsRef = ref<RetryCoords | null>(null);

		handleSessionInvalidated(120, undefined, firedRef, coordsRef);

		expect(coordsRef.current).toBeNull();
	});

	it("is one-shot per outer widget lifetime — a second call is a no-op", () => {
		const firedRef = ref(false);
		const coordsRef = ref<RetryCoords | null>(null);

		handleSessionInvalidated(100, 200, firedRef, coordsRef);
		const second = handleSessionInvalidated(500, 600, firedRef, coordsRef);

		expect(second).toEqual({ shouldRestart: false });
		// The second call must not overwrite the first attempt's coords.
		expect(coordsRef.current).toEqual({ x: 100, y: 200 });
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
