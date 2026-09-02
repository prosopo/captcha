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

import { getWindowCallback } from "@prosopo/procaptcha-common";
import type { EnvironmentTypes, ProcaptchaRenderOptions } from "@prosopo/types";
import { at } from "@prosopo/util";
import type { Root } from "react-dom/client";
import { extractParams, getProcaptchaScript } from "./util/config.js";
import { type CreatedWidget, WidgetFactory } from "./util/widgetFactory.js";
import { WidgetThemeResolver } from "./util/widgetThemeResolver.js";

const BUNDLE_NAMES = ["procaptcha.bundle.iife.js", "procaptcha.bundle.js"];

/**
 * Everything needed to rebuild a widget in place.
 *
 * Previously only the React `Root` was retained, which made `reset()` a
 * one-way operation: unmounting tore out the React tree but the widget
 * skeleton (created imperatively by `createWidgetSkeleton`, not by React)
 * stayed in the DOM, leaving a container with a logo and no checkbox. There
 * was no record of which element or render options produced it, so nothing
 * could put it back. Keeping the descriptor alongside the root is what lets
 * `reset()` remount rather than just destroy.
 */
interface WidgetEntry {
	root: Root;
	element: Element;
	/** The element the widget listens on; a targeted execute() is dispatched here. */
	target: HTMLElement;
	renderOptions: ProcaptchaRenderOptions;
	isWeb2: boolean;
	invisible: boolean;
	unbindTrigger?: () => void;
}

const procaptchaWidgets = new Map<string, WidgetEntry>();

let widgetIdCounter = 0;
const nextWidgetId = (): string => `procaptcha-widget-${widgetIdCounter++}`;

const registerWidgets = (
	widgets: CreatedWidget[],
	elements: Element[],
	renderOptions: ProcaptchaRenderOptions,
	isWeb2: boolean,
	invisible: boolean,
): string[] =>
	widgets.map(({ root, container }, index) => {
		const id = nextWidgetId();
		procaptchaWidgets.set(id, {
			root,
			element: at(elements, index),
			target: container,
			renderOptions,
			isWeb2,
			invisible,
		});
		return id;
	});

const widgetFactory = new WidgetFactory(new WidgetThemeResolver());

/**
 * Kick off provider resolution + detector assignment without blocking render.
 *
 * Loaded via dynamic import on purpose: it pulls in the provider selector and
 * the provider API client, and importing those statically would push them into
 * the entry chunk and delay first paint. Firing the import here starts that
 * download in parallel with the widget's own chunks rather than after them.
 *
 * Fire-and-forget by design — a failed prefetch is indistinguishable from no
 * prefetch, and the detection path falls back to resolving a provider itself.
 */
const startDetectorPrefetch = (
	siteKey: string | null,
	flags: { ipv4?: boolean; ipv6?: boolean },
): void => {
	if (!siteKey) return;
	void Promise.all([
		import("@prosopo/procaptcha-frictionless"),
		import("@prosopo/procaptcha-common"),
	])
		.then(([frictionless, common]) => {
			frictionless.prefetchDetector(
				process.env.PROSOPO_DEFAULT_ENVIRONMENT as EnvironmentTypes,
				common.pickIpMode(flags),
				siteKey,
			);
		})
		.catch(() => undefined);
};

// Define a custom event name for procaptcha execution
const PROCAPTCHA_EXECUTE_EVENT = "procaptcha:execute";

// Define a custom event name for procaptcha ready
const PROCAPTCHA_READY_EVENT = "procaptcha:ready";

// Implicit render for targeting all elements with class 'procaptcha'
const implicitRender = async () => {
	// Get elements with class 'procaptcha', not including buttons
	const elements: Element[] = Array.from(
		document.getElementsByClassName("procaptcha"),
	).filter((element) => element.tagName.toLowerCase() !== "button");

	// Set siteKey from renderOptions or from the first element's data-sitekey attribute
	if (elements.length) {
		const firstElement = at(elements, 0);
		const siteKey = firstElement.getAttribute("data-sitekey");
		const web3 = firstElement.getAttribute("data-web3");
		const ipv4 = firstElement.getAttribute("data-ipv4") === "true";
		const ipv6 = firstElement.getAttribute("data-ipv6") === "true";
		if (!siteKey) {
			console.error("No site key found");
			return;
		}

		// Everything the detector assignment needs is known right here: the site
		// key and IP-mode flags come off the DOM, the environment is a build-time
		// constant. Start it now so the round-trip overlaps the widget's own
		// dynamic-import chain instead of queueing behind it —
		// `customDetectBot` claims the in-flight promise when it eventually runs.
		startDetectorPrefetch(siteKey, { ipv4, ipv6 });

		const implicitRenderOptions: ProcaptchaRenderOptions = {
			siteKey: siteKey,
			ipv4,
			ipv6,
		};

		const widgets = await widgetFactory.createWidgets(
			elements,
			implicitRenderOptions,
			!(web3 === "true"),
		);

		const ids = registerWidgets(
			widgets,
			elements,
			implicitRenderOptions,
			!(web3 === "true"),
			false,
		);

		// `data-placement` is read per element by the renderer; `data-bind` is
		// wired here because the trigger lives outside the widget.
		ids.forEach((id, index) => {
			const selector = at(elements, index).getAttribute("data-bind");
			if (selector) bindTrigger(id, selector);
		});
	}

	// Check for invisible mode indicators (procaptcha class on buttons)
	const invisibleButtons = Array.from(
		document.getElementsByClassName("procaptcha"),
	).filter((button) => button.tagName.toLowerCase() === "button");

	if (invisibleButtons.length) {
		for (const button of invisibleButtons) {
			const siteKey = button.getAttribute("data-sitekey") || "";
			const callback = button.getAttribute("data-callback") || "";
			const ipv4 = button.getAttribute("data-ipv4") === "true";
			const ipv6 = button.getAttribute("data-ipv6") === "true";

			startDetectorPrefetch(siteKey, { ipv4, ipv6 });

			const buttonRenderOptions: ProcaptchaRenderOptions = {
				siteKey: siteKey,
				callback: callback,
				ipv4,
				ipv6,
			};

			const widgets = await widgetFactory.createWidgets(
				[button],
				buttonRenderOptions,
				true,
				true,
			);

			const [id] = registerWidgets(
				widgets,
				[button],
				buttonRenderOptions,
				true,
				true,
			);

			// Add click event listener to the button
			button.addEventListener("click", async (event) => {
				event.preventDefault();
				execute(id);
			});
		}
	}
};

// Explicit render for targeting specific elements
/**
 * Renders a widget into `element` and returns its id, which `reset()` and
 * `remove()` accept to target this widget alone. Previously this returned
 * nothing, so callers had no handle on an individual widget and the only
 * available reset was all-or-nothing.
 *
 * Returns undefined when no widget was created, rather than throwing — the
 * factory legitimately yields nothing for an element it cannot mount into.
 */
export const render = async (
	element: Element,
	renderOptions: ProcaptchaRenderOptions,
): Promise<string | undefined> => {
	startDetectorPrefetch(renderOptions.siteKey, renderOptions);

	const hasInvisibleSize =
		Object.prototype.hasOwnProperty.call(renderOptions, "size") &&
		renderOptions.size === "invisible";

	const isWeb2 = !renderOptions.web3;
	const invisible =
		hasInvisibleSize || element.tagName.toLowerCase() === "button";

	const widgets = await widgetFactory.createWidgets(
		[element],
		renderOptions,
		isWeb2,
		invisible,
	);

	const ids = registerWidgets(
		widgets,
		[element],
		renderOptions,
		isWeb2,
		invisible,
	);

	// Deliberately not `at()`: it throws on an empty array before it consults
	// `optional`, and zero roots is a legitimate outcome here.
	const id = ids[0];
	if (id && renderOptions.bind) bindTrigger(id, renderOptions.bind);

	return id;
};

export default function ready(fn: () => void) {
	if (document && document.readyState !== "loading") {
		console.log("document.readyState ready!");
		fn();
	} else {
		console.log("DOMContentLoaded listener!");
		document.addEventListener("DOMContentLoaded", () => {
			console.log("DOMContentLoaded fired");
			console.log(window);
			fn();
		});
	}
}

/**
 * Starts verification. With no id the event goes to `document` and every
 * widget responds; with an id (as returned by `render()`) only that widget
 * runs.
 */
export const execute = (widgetId?: string) => {
	const targeted =
		undefined === widgetId ? undefined : procaptchaWidgets.get(widgetId);

	if (undefined !== widgetId && !targeted) {
		console.error(`No Procaptcha widget found with id ${widgetId}`);
		return;
	}

	const containers = targeted ? [targeted.element] : findProcaptchaContainers();

	if (containers.length === 0) {
		console.error("No Procaptcha containers found for execution");
		return;
	}

	// Dispatch a custom event to notify React components to show the modal or perform silent verification
	const executeEvent = new CustomEvent(PROCAPTCHA_EXECUTE_EVENT, {
		detail: {
			containerId: containers[0]?.id || "procaptcha-container",
			containerCount: containers.length,
			timestamp: Date.now(),
		},
		// A targeted event must not bubble to document, where every widget listens.
		bubbles: !targeted,
		cancelable: true,
	});

	if (targeted) {
		targeted.target.dispatchEvent(executeEvent);
		return;
	}

	// Dispatch the event on the document
	document.dispatchEvent(executeEvent);
};

/**
 * Wires the host-page element matching `selector` to trigger one widget. The
 * click's default is prevented so a submit button does not post the form
 * before a token exists.
 */
const bindTrigger = (widgetId: string, selector: string): void => {
	const entry = procaptchaWidgets.get(widgetId);
	const trigger = document.querySelector(selector);
	if (!entry || !trigger) {
		console.error(`Procaptcha: no element matches bind selector ${selector}`);
		return;
	}

	const onClick = (event: Event) => {
		event.preventDefault();
		execute(widgetId);
	};

	trigger.addEventListener("click", onClick);
	entry.unbindTrigger = () => trigger.removeEventListener("click", onClick);
};

function findProcaptchaContainers(): Element[] {
	const containers: Element[] = [];

	// Strategy 1: Look for elements with data-size="invisible"
	const invisibleContainers = Array.from(
		document.querySelectorAll('[data-size="invisible"]'),
	);
	containers.push(...invisibleContainers);

	// Strategy 2: Look for elements with specific IDs
	const idContainers = Array.from(
		document.querySelectorAll(
			'#procaptcha-container, [id$="-procaptcha-container"]',
		),
	);

	// Strategy 3: Look for elements with class 'p-procaptcha'
	const classContainers = Array.from(
		document.getElementsByClassName("p-procaptcha"),
	);
	containers.push(...classContainers);

	for (const container of idContainers) {
		if (!containers.includes(container)) {
			containers.push(container);
		}
	}

	return containers;
}

// extend the global Window interface to include the procaptcha object
declare global {
	interface Window {
		procaptcha: {
			ready: typeof ready;
			render: typeof render;
			reset: typeof reset;
			remove: typeof remove;
			execute: typeof execute;
		};
	}
}

const start = () => {
	// onLoadUrlCallback defines the name of the callback function to be called when the script is loaded
	// onRenderExplicit takes values of either explicit or implicit
	const { onloadUrlCallback, renderExplicit } = extractParams(BUNDLE_NAMES);
	let readyCalled = false;

	// Render the Procaptcha component implicitly if renderExplicit is not set to explicit
	if (renderExplicit !== "explicit") {
		getProcaptchaScript(BUNDLE_NAMES)?.addEventListener("load", () => {
			ready(implicitRender);
			readyCalled = true;
		});
		// or if the document has already loaded, call the implicit render function
		if (document.readyState === "complete" && !readyCalled) {
			ready(implicitRender);
		}
	}

	if (onloadUrlCallback) {
		// Add event listener to the script tag to call the callback function when the script is loaded
		getProcaptchaScript(BUNDLE_NAMES)?.addEventListener("load", () => {
			const onloadCallback = getWindowCallback(onloadUrlCallback);
			ready(onloadCallback);
		});

		// or if the document has already loaded, call the callback function
		if (document.readyState === "complete" && !readyCalled) {
			const onloadCallback = getWindowCallback(onloadUrlCallback);
			ready(onloadCallback);
		}
	}
};

/**
 * Returns a widget to its unsolved state, ready to be solved again. Pass a
 * widget id to reset one widget, or omit it to reset every widget on the page.
 *
 * This remounts rather than merely unmounting. The previous implementation
 * unmounted every root and then called `start()`, which only re-renders when
 * the page uses implicit rendering — and even then only via the
 * `document.readyState` fallback, because the script's `load` event has long
 * since fired. On an explicitly-rendered page nothing came back at all: the
 * skeleton stayed in the DOM with no checkbox inside it, and no fresh captcha
 * request was ever made. Rebuilding from the stored descriptor makes reset
 * behave the same way on both paths.
 *
 * `start()` is deliberately not called here any more. It re-renders implicit
 * widgets, which would double up with the remount below, and it attaches
 * another `load` listener to the script tag on every call.
 */
export const reset = async (widgetId?: string): Promise<void> => {
	const ids: string[] =
		undefined === widgetId ? Array.from(procaptchaWidgets.keys()) : [widgetId];

	for (const id of ids) {
		const current = procaptchaWidgets.get(id);
		if (!current) continue;

		current.root.unmount();

		const [widget] = await widgetFactory.createWidgets(
			[current.element],
			current.renderOptions,
			current.isWeb2,
			current.invisible,
		);

		if (widget) {
			procaptchaWidgets.set(id, {
				...current,
				root: widget.root,
				target: widget.container,
			});
		} else {
			procaptchaWidgets.delete(id);
		}
	}
};

/**
 * Tears a widget down without putting it back — the behaviour `reset()` used
 * to have by accident on explicitly-rendered pages, kept as an explicit
 * operation for callers that genuinely want the widget gone (a closing modal,
 * an SPA route change).
 */
export const remove = (widgetId?: string): void => {
	const ids =
		undefined === widgetId ? Array.from(procaptchaWidgets.keys()) : [widgetId];

	for (const id of ids) {
		const entry = procaptchaWidgets.get(id);
		if (!entry) continue;
		entry.unbindTrigger?.();
		entry.root.unmount();
		entry.element.innerHTML = "";
		procaptchaWidgets.delete(id);
	}
};

// set the procaptcha attribute on the window
window.procaptcha = { ready, render, reset, remove, execute };

// Dispatch a custom event to notify that window.procaptcha is ready
const procaptchaReadyEvent = new CustomEvent(PROCAPTCHA_READY_EVENT, {
	detail: {
		timestamp: Date.now(),
	},
	bubbles: true,
	cancelable: false,
});
document.dispatchEvent(procaptchaReadyEvent);

start();
