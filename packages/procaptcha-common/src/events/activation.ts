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

import { InputMethod } from "@prosopo/types";

/** Where and how the user activated a control. */
export interface Activation {
	x: number;
	y: number;
	inputMethod: InputMethod;
}

const KEYBOARD_ACTIVATION: Activation = {
	x: 0,
	y: 0,
	inputMethod: InputMethod.keyboard,
};

/**
 * Where and how a control was activated, read from the activating event.
 *
 * Enter or Space on a `<button>` fires a click whose `detail` (the pointer
 * press count) is 0 and whose position is (0, 0) — measured in Chromium and
 * Firefox. A control that only carries the button role gets the keydown
 * itself. Either way there is no pointer position, so a keyboard activation
 * always reports (0, 0).
 *
 * A mouse click, a tap and a pen press all report a press count of at least 1
 * and their position.
 */
export const activationOf = (
	event: MouseEvent | KeyboardEvent | TouchEvent,
): Activation => {
	if ("key" in event) {
		return KEYBOARD_ACTIVATION;
	}
	if ("clientX" in event) {
		return event.detail === 0
			? KEYBOARD_ACTIVATION
			: {
					x: event.clientX,
					y: event.clientY,
					inputMethod: InputMethod.pointer,
				};
	}
	const touch = event.changedTouches[0];
	return {
		x: touch?.clientX ?? 0,
		y: touch?.clientY ?? 0,
		inputMethod: InputMethod.pointer,
	};
};
