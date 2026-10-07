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

/**
 * Drives real DOM events rather than calling handlers, because the checkbox
 * drops untrusted events and that only shows up on a real event.
 */
export interface Mounted {
	container: HTMLDivElement;
	unmount: () => void;
}

export const mount = (): Mounted => {
	const container = document.createElement("div");
	document.body.appendChild(container);
	return {
		container,
		unmount: () => {
			container.remove();
		},
	};
};

interface FireOptions {
	trusted?: boolean;
	clientX?: number;
	clientY?: number;
	touches?: { clientX: number; clientY: number }[];
	key?: string;
}

/**
 * jsdom marks every dispatched event untrusted through a non-configurable
 * accessor onto its implementation object, so the flag is set there.
 */
const setTrusted = (event: Event, trusted: boolean): void => {
	for (const symbol of Object.getOwnPropertySymbols(event)) {
		const impl: unknown = Reflect.get(event, symbol);
		if (impl && typeof impl === "object" && "isTrusted" in impl) {
			// dispatchEvent stamps isTrusted back to false, so swallow the write.
			Object.defineProperty(impl, "isTrusted", {
				configurable: true,
				get: () => trusted,
				set: () => undefined,
			});
			return;
		}
	}
	throw new Error("could not reach the jsdom event implementation");
};

const build = (type: string, options: FireOptions): Event => {
	if (undefined !== options.key) {
		return new KeyboardEvent(type, {
			bubbles: true,
			cancelable: true,
			key: options.key,
		});
	}
	return new MouseEvent(type, {
		bubbles: true,
		cancelable: true,
		clientX: options.clientX ?? 0,
		clientY: options.clientY ?? 0,
	});
};

/**
 * Dispatches a real event at the element. Touch points are plain objects:
 * jsdom has no Touch constructor.
 */
export const fire = (
	element: Element,
	type: string,
	options: FireOptions = {},
): void => {
	fireAndReturn(element, type, options);
};

/** Like `fire`, but returns the event so a test can inspect it. */
export const fireAndReturn = (
	element: Element,
	type: string,
	options: FireOptions = {},
): Event => {
	const event = build(type, options);
	setTrusted(event, options.trusted ?? true);
	if (options.touches) {
		Object.defineProperty(event, "touches", { value: options.touches });
	}
	element.dispatchEvent(event);
	return event;
};

/** Waits a macrotask, so queued renders and pending dynamic imports land. */
export const settle = async (): Promise<void> => {
	await new Promise<void>((resolve: () => void) => setTimeout(resolve, 0));
	await Promise.resolve();
};
