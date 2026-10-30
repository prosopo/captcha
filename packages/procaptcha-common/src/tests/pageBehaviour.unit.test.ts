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

import type { ClickEventPoint, MouseMovementPoint } from "@prosopo/types";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
	type PageBehaviour,
	getPageBehaviour,
	mergeBehaviourPoints,
	startPageBehaviourCapture,
	stopPageBehaviourCapture,
} from "../pageBehaviour.js";

const captureHost: Record<symbol, unknown> = globalThis as unknown as Record<
	symbol,
	unknown
>;

const resetCapture = (): void => {
	stopPageBehaviourCapture();
	delete captureHost[Symbol.for("prosopo.pageBehaviour")];
};

const captured = (): PageBehaviour => {
	const behaviour = getPageBehaviour();
	if (!behaviour) throw new Error("capture not started");
	return behaviour;
};

/**
 * jsdom has no Touch or TouchEvent, so the event is built by hand with only
 * the properties the handler reads.
 */
const dispatchTouch = (target: EventTarget, type: string, x: number): void => {
	const touch = { clientX: x, clientY: 2, identifier: 1, force: 0.4 };
	const event = new Event(type, { bubbles: true });
	Object.defineProperties(event, {
		touches: { value: type === "touchend" ? [] : [touch] },
		changedTouches: { value: [touch] },
	});
	target.dispatchEvent(event);
};

beforeEach(() => {
	resetCapture();
	vi.useFakeTimers();
	vi.setSystemTime(1000);
});

afterEach(() => {
	resetCapture();
	vi.useRealTimers();
	document.body.replaceChildren();
});

describe("startPageBehaviourCapture", () => {
	test("records nothing before it is started", () => {
		window.dispatchEvent(new MouseEvent("mousemove"));
		expect(getPageBehaviour()).toBeUndefined();
	});

	test("records mouse, press, touch and scroll once started", () => {
		startPageBehaviourCapture();
		window.dispatchEvent(
			new MouseEvent("mousemove", { clientX: 3, clientY: 4 }),
		);
		window.dispatchEvent(new MouseEvent("click", { clientX: 3, clientY: 4 }));
		dispatchTouch(window, "touchstart", 7);
		dispatchTouch(window, "touchend", 7);
		window.dispatchEvent(new Event("scroll"));
		const behaviour = captured();
		expect(behaviour.mouse).toEqual([{ x: 3, y: 4, timestamp: 1000 }]);
		expect(behaviour.press.map((point) => point.eventType)).toEqual(["click"]);
		expect(behaviour.touch.map((point) => point.eventType)).toEqual([
			"touchstart",
			"touchend",
		]);
		expect(behaviour.touch[0]?.force).toBe(0.4);
		expect(behaviour.scroll).toHaveLength(1);
	});

	test("records a tap the page stops before it reaches window", () => {
		startPageBehaviourCapture();
		const element = document.createElement("div");
		for (const type of ["touchstart", "touchend", "click"]) {
			element.addEventListener(type, (event: Event) => event.stopPropagation());
		}
		document.body.appendChild(element);
		dispatchTouch(element, "touchstart", 5);
		dispatchTouch(element, "touchend", 5);
		element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
		expect(captured().touch).toHaveLength(2);
		expect(captured().press).toHaveLength(1);
	});

	test("starts once per page, so a second call keeps the first buffer", () => {
		startPageBehaviourCapture();
		window.dispatchEvent(new MouseEvent("mousemove"));
		const first = getPageBehaviour();
		startPageBehaviourCapture();
		window.dispatchEvent(new MouseEvent("mousemove"));
		expect(getPageBehaviour()).toBe(first);
		expect(captured().mouse).toHaveLength(2);
	});

	test("stops recording but keeps what it captured", () => {
		startPageBehaviourCapture();
		window.dispatchEvent(new MouseEvent("mousemove"));
		stopPageBehaviourCapture();
		window.dispatchEvent(new MouseEvent("mousemove"));
		expect(captured().mouse).toHaveLength(1);
	});

	test("keeps only the most recent mouse points", () => {
		startPageBehaviourCapture();
		for (let i = 0; i < 1005; i++) {
			window.dispatchEvent(new MouseEvent("mousemove", { clientX: i }));
		}
		const mouse = captured().mouse;
		expect(mouse).toHaveLength(1000);
		expect(mouse[0]?.x).toBe(5);
	});
});

describe("mergeBehaviourPoints", () => {
	const press = (
		timestamp: number,
		eventType: ClickEventPoint["eventType"],
		targetElement?: string,
	): ClickEventPoint => ({
		x: 1,
		y: 1,
		timestamp,
		eventType,
		button: 0,
		targetElement,
	});

	test("puts early events in front of the tracked ones, in time order", () => {
		const early: MouseMovementPoint[] = [
			{ x: 1, y: 1, timestamp: 10 },
			{ x: 2, y: 2, timestamp: 20 },
		];
		const tracked: MouseMovementPoint[] = [{ x: 3, y: 3, timestamp: 30 }];
		expect(
			mergeBehaviourPoints(early, tracked, 10).map((point) => point.timestamp),
		).toEqual([10, 20, 30]);
	});

	test("keeps the tracked copy of an event both recorded", () => {
		const merged = mergeBehaviourPoints(
			[press(10, "mousedown"), press(20, "click")],
			[press(20, "click", "DIV")],
			10,
		);
		expect(merged).toEqual([press(10, "mousedown"), press(20, "click", "DIV")]);
	});

	test("keeps two different events that share a timestamp", () => {
		const merged = mergeBehaviourPoints(
			[press(20, "mouseup")],
			[press(20, "click")],
			10,
		);
		expect(merged.map((point) => point.eventType)).toEqual([
			"mouseup",
			"click",
		]);
	});

	test("keeps only the most recent points over the limit", () => {
		const early: MouseMovementPoint[] = [
			{ x: 1, y: 1, timestamp: 10 },
			{ x: 2, y: 2, timestamp: 20 },
		];
		const tracked: MouseMovementPoint[] = [{ x: 3, y: 3, timestamp: 30 }];
		expect(
			mergeBehaviourPoints(early, tracked, 2).map((point) => point.timestamp),
		).toEqual([20, 30]);
	});
});
