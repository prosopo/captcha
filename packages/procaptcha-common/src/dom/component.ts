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
 * The contract every widget component implements in place of a React element.
 *
 * `destroy` takes the place of an unmount effect: it must detach whatever the
 * component appended (including anything it portalled into light DOM) and drop
 * every listener it registered. Nothing reconciles for us, so a component that
 * forgets to clean up leaks across the frictionless restart path — which
 * remounts the whole widget on a `CAPTCHA.NO_SESSION_FOUND`.
 */
export interface Component<P = void> {
	update(props: P): void;
	destroy(): void;
}

/** A component with no updatable props — mount and tear down only. */
export type StaticComponent = Component<void>;

/**
 * Collects teardown callbacks so a component's `destroy` is a single call
 * regardless of how many listeners/timers/nodes it accumulated.
 */
export class Teardown {
	private readonly callbacks: (() => void)[] = [];

	public add(callback: () => void): void {
		this.callbacks.push(callback);
	}

	public addEventListener<T extends EventTarget>(
		target: T,
		type: string,
		listener: EventListenerOrEventListenerObject,
		options?: AddEventListenerOptions,
	): void {
		target.addEventListener(type, listener, options);
		this.add(() => target.removeEventListener(type, listener, options));
	}

	public run(): void {
		// Reverse order so teardown unwinds the way setup wound up.
		for (const callback of this.callbacks.splice(0).reverse()) {
			callback();
		}
	}
}
