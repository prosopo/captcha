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
import { toInt } from "../utils/data";

export type TouchSupport = {
	maxTouchPoints: number;
	/** The success or failure of creating a TouchEvent */
	touchEvent: boolean;
	/** The availability of the "ontouchstart" property */
	touchStart: boolean;
};

/**
 * This is a crude and primitive touch screen detection. It's not possible to currently reliably detect the availability
 * of a touch screen with a JS, without actually subscribing to a touch event.
 *
 * @see http://www.stucox.com/blog/you-cant-detect-a-touchscreen/
 * @see https://github.com/Modernizr/Modernizr/issues/548
 */
export default function getTouchSupport(): TouchSupport {
	const n = navigator;

	let maxTouchPoints = 0;
	let touchEvent: boolean;
	if (n.maxTouchPoints !== undefined) {
		maxTouchPoints = toInt(n.maxTouchPoints);
	} else if (n.msMaxTouchPoints !== undefined) {
		maxTouchPoints = n.msMaxTouchPoints;
	}
	try {
		document.createEvent("TouchEvent");
		touchEvent = true;
	} catch {
		touchEvent = false;
	}
	const touchStart = "ontouchstart" in window;
	return {
		maxTouchPoints,
		touchEvent,
		touchStart,
	};
}
