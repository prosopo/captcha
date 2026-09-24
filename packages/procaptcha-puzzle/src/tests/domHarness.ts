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
 * A minimal mount/unmount harness. The suite deliberately drives real DOM
 * events rather than calling handlers directly, because every interactive
 * element in this package drops untrusted events — behaviour that only shows
 * up when a real event carries the flag.
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
 * jsdom marks everything it dispatches untrusted, and exposes `isTrusted` as a
 * non-configurable accessor onto its internal implementation object, so the
 * flag has to be set there rather than shadowed on the event. Anything the
 * components filter on untrusted events is untestable otherwise.
 */
const setTrusted = (event: Event, trusted: boolean): void => {
	for (const symbol of Object.getOwnPropertySymbols(event)) {
		const impl: unknown = Reflect.get(event, symbol);
		if (impl && typeof impl === "object" && "isTrusted" in impl) {
			// A plain assignment would not survive: dispatchEvent stamps
			// isTrusted back to false on the way in, so the flag is pinned with
			// an accessor that swallows the write.
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

/** Like `fire`, but hands back the event so a test can inspect what the
 * handler did to it — whether it prevented the default form submission, say. */
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

/**
 * Renders coalesce onto the microtask queue, so a state change is not visible
 * in the DOM until it has drained.
 */
export const settle = async (): Promise<void> => {
	// A macrotask turn, so a pending dynamic import resolves too — draining the
	// microtask queue alone is not enough for the code-split boundaries.
	await new Promise<void>((resolve: () => void) => setTimeout(resolve, 0));
	await Promise.resolve();
};
