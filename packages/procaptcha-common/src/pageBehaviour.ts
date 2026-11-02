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

import type {
	ClickEventPoint,
	MouseMovementPoint,
	ScrollEventPoint,
	TouchEventPoint,
} from "@prosopo/types";

/**
 * Buffer sizes match the detector's own trackers, so merging never sends
 * more than a solve already could.
 */
export const PAGE_BEHAVIOUR_LIMITS = {
	mouse: 1000,
	touch: 500,
	press: 200,
	scroll: 500,
} as const;

export interface PageBehaviour {
	mouse: MouseMovementPoint[];
	touch: TouchEventPoint[];
	press: ClickEventPoint[];
	scroll: ScrollEventPoint[];
}

interface PageBehaviourCapture {
	behaviour: PageBehaviour;
	stop: () => void;
}

const PRESS_EVENTS = [
	"mousedown",
	"mouseup",
	"click",
	"dblclick",
	"contextmenu",
] as const;

const TOUCH_EVENTS = [
	"touchstart",
	"touchmove",
	"touchend",
	"touchcancel",
] as const;

const LISTENER_OPTIONS = { capture: true, passive: true } as const;

// Keyed on the global so every chunk that bundles its own copy of this module
// sees the one capture the page started.
const CAPTURE_KEY = Symbol.for("prosopo.pageBehaviour");

type CaptureHost = typeof globalThis & {
	[CAPTURE_KEY]?: PageBehaviourCapture;
};

const captureHost: CaptureHost = globalThis;

const pushCapped = <T>(points: T[], point: T, limit: number): void => {
	points.push(point);
	if (points.length > limit) {
		points.shift();
	}
};

/**
 * Records what the visitor does on the page from the moment the script
 * loads. The detector's trackers only start once a widget renders, and a
 * site may render it late, for example only when Buy is pressed, after the
 * visitor has scrolled the listing, and a quick tap on the checkbox can land
 * before detection finishes. Without this, that whole journey is missing
 * from the solve.
 */
export const startPageBehaviourCapture = (): void => {
	if (captureHost[CAPTURE_KEY] || typeof window === "undefined") {
		return;
	}
	const behaviour: PageBehaviour = {
		mouse: [],
		touch: [],
		press: [],
		scroll: [],
	};

	const onMouseMove = (event: MouseEvent): void => {
		pushCapped(
			behaviour.mouse,
			{ x: event.clientX, y: event.clientY, timestamp: Date.now() },
			PAGE_BEHAVIOUR_LIMITS.mouse,
		);
	};

	const onPress = (event: MouseEvent): void => {
		pushCapped(
			behaviour.press,
			{
				x: event.clientX,
				y: event.clientY,
				timestamp: Date.now(),
				eventType: event.type as ClickEventPoint["eventType"],
				button: event.button,
				targetElement:
					event.target instanceof Element ? event.target.tagName : undefined,
				ctrlKey: event.ctrlKey,
				shiftKey: event.shiftKey,
				altKey: event.altKey,
			},
			PAGE_BEHAVIOUR_LIMITS.press,
		);
	};

	const onTouch = (event: TouchEvent): void => {
		const touch = event.touches[0] ?? event.changedTouches[0];
		if (!touch) {
			return;
		}
		pushCapped(
			behaviour.touch,
			{
				x: touch.clientX,
				y: touch.clientY,
				timestamp: Date.now(),
				eventType: event.type as TouchEventPoint["eventType"],
				touchCount: event.touches.length,
				force: touch.force,
				touchId: touch.identifier,
				radiusX: touch.radiusX,
				radiusY: touch.radiusY,
				rotationAngle: touch.rotationAngle,
			},
			PAGE_BEHAVIOUR_LIMITS.touch,
		);
	};

	const onScroll = (event: Event): void => {
		const target = event.target;
		const offsets =
			target instanceof Element
				? { x: target.scrollLeft, y: target.scrollTop }
				: { x: window.scrollX, y: window.scrollY };
		pushCapped(
			behaviour.scroll,
			{ ...offsets, timestamp: Date.now() },
			PAGE_BEHAVIOUR_LIMITS.scroll,
		);
	};

	window.addEventListener("mousemove", onMouseMove, LISTENER_OPTIONS);
	for (const type of PRESS_EVENTS) {
		window.addEventListener(type, onPress, LISTENER_OPTIONS);
	}
	for (const type of TOUCH_EVENTS) {
		window.addEventListener(type, onTouch, LISTENER_OPTIONS);
	}
	window.addEventListener("scroll", onScroll, LISTENER_OPTIONS);

	captureHost[CAPTURE_KEY] = {
		behaviour,
		stop: () => {
			window.removeEventListener("mousemove", onMouseMove, LISTENER_OPTIONS);
			for (const type of PRESS_EVENTS) {
				window.removeEventListener(type, onPress, LISTENER_OPTIONS);
			}
			for (const type of TOUCH_EVENTS) {
				window.removeEventListener(type, onTouch, LISTENER_OPTIONS);
			}
			window.removeEventListener("scroll", onScroll, LISTENER_OPTIONS);
		},
	};
};

/**
 * Stops recording once the detector's trackers are running; what was
 * captured stays available to every later solve on the page.
 */
export const stopPageBehaviourCapture = (): void => {
	captureHost[CAPTURE_KEY]?.stop();
};

export const getPageBehaviour = (): PageBehaviour | undefined =>
	captureHost[CAPTURE_KEY]?.behaviour;

type BehaviourPoint = {
	x: number;
	y: number;
	timestamp: number;
	eventType?: string;
};

const pointKey = (point: BehaviourPoint): string =>
	`${point.timestamp}|${point.x}|${point.y}|${point.eventType ?? ""}`;

/**
 * Puts the page's early events in front of the detector's, in time order.
 * Both may have recorded the same event while their windows overlap; the
 * detector's copy wins because it carries the derived fields.
 */
export const mergeBehaviourPoints = <T extends BehaviourPoint>(
	early: readonly T[],
	tracked: readonly T[],
	limit: number,
): T[] => {
	const trackedKeys = new Set(tracked.map(pointKey));
	return [
		...early.filter((point) => !trackedKeys.has(pointKey(point))),
		...tracked,
	]
		.sort((a, b) => a.timestamp - b.timestamp)
		.slice(-limit);
};
