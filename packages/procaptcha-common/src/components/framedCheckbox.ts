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

import { type Component, Teardown } from "../dom/component.js";
import { applyStyles } from "../dom/element.js";
import type { Activation } from "../events/activation.js";
import { noteInputMethod, watchInputMethod } from "../events/inputModality.js";
import { type CheckboxProps, mountCheckbox } from "./checkbox.js";

/** The page the bundle ships beside its chunks to host the checkbox. */
export const CHECKBOX_FRAME_FILE = "checkbox-frame.html";

/**
 * How long the widget waits for the frame before mounting the checkbox in the
 * page instead. A site whose CSP refuses the frame, or a frame that cannot
 * load, must still get a working checkbox.
 */
export const FRAME_READY_TIMEOUT_MS = 3000;

const FRAME_WIDTH_PX = 300;
const FRAME_HEIGHT_PX = 58;

/** Everything the frame needs to draw the checkbox. Functions do not cross. */
export type CheckboxFrameProps = Omit<CheckboxProps, "onChange">;

export type CheckboxFrameParentMessage =
	| { pf: string; t: "props"; props: CheckboxFrameProps }
	| { pf: string; t: "offset"; left: number; top: number };

/** A touch the frame forwards, already in the page's coordinates. */
export type ForwardedTouch = {
	x: number;
	y: number;
	id: number;
	force?: number;
	rx?: number;
	ry?: number;
	rot?: number;
};

/**
 * Input inside the frame never reaches the page's own behaviour collection, so
 * the frame forwards it in page coordinates.
 */
export type CheckboxFrameInputMessage = {
	pf: string;
	t: "input";
	type: string;
	x?: number;
	y?: number;
	button?: number;
	ctrlKey?: boolean;
	shiftKey?: boolean;
	altKey?: boolean;
	touches?: ForwardedTouch[];
	changed?: ForwardedTouch[];
};

export type CheckboxFrameMessage =
	| { pf: string; t: "ready" }
	| { pf: string; t: "size"; w: number; h: number }
	| { pf: string; t: "drawn" }
	| ({ pf: string; t: "activate" } & Activation)
	| { pf: string; t: "pointer"; type: string; pointerType: string }
	| CheckboxFrameInputMessage;

const createNonce = (): string =>
	Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte: number) =>
		byte.toString(16).padStart(2, "0"),
	).join("");

const frameProps = ({
	onChange: _,
	...rest
}: CheckboxProps): CheckboxFrameProps => rest;

/**
 * The checkbox, drawn by a page of ours in an iframe.
 *
 * The frame is cross-site with the embedding page, so a pointer reaching the
 * box crosses into another renderer process, and the frame — not the page —
 * receives the click. It reports the activation back over postMessage, from
 * a trusted event in its own document. Messages are only accepted from this
 * frame's window, at the frame's origin, carrying the nonce it was given.
 *
 * The frame takes a moment to load and draw, so the checkbox is drawn in the
 * page straight away and the frame loads invisibly on top of it. The two swap
 * once the frame reports it has painted the checkbox; until then,
 * and for good if the frame never arrives, the in-page checkbox is the one in
 * use.
 */
export const mountFramedCheckbox = (
	container: HTMLElement,
	initialProps: CheckboxProps,
	frameUrl: URL,
): Component<CheckboxProps> => {
	const teardown = new Teardown();
	let props = initialProps;
	let ready = false;
	let shown = false;
	watchInputMethod();

	const host = document.createElement("div");
	applyStyles(host, { position: "relative" });
	container.appendChild(host);
	teardown.add(() => host.remove());

	let standIn: Component<CheckboxProps> | undefined = mountCheckbox(
		host,
		props,
	);
	teardown.add(() => standIn?.destroy());

	const nonce = createNonce();
	const src = new URL(frameUrl.href);
	src.hash = `n=${nonce}`;

	const frame = document.createElement("iframe");
	frame.src = src.href;
	frame.title = props.labelText;
	frame.setAttribute("scrolling", "no");
	applyStyles(frame, {
		border: "0",
		display: "block",
		position: "absolute",
		top: "0",
		left: "0",
		width: `${FRAME_WIDTH_PX}px`,
		height: `${FRAME_HEIGHT_PX}px`,
		background: "transparent",
		colorScheme: props.theme.palette.mode,
		opacity: "0",
		pointerEvents: "none",
	});
	host.appendChild(frame);

	const dropFrame = (): void => {
		if (!shown) {
			frame.remove();
		}
	};
	const timer = setTimeout(dropFrame, FRAME_READY_TIMEOUT_MS);
	teardown.add(() => clearTimeout(timer));
	teardown.addEventListener(frame, "error", dropFrame);

	// The frame adds its own position on the page to the input it forwards.
	const postOffset = (): void => {
		const rect = frame.getBoundingClientRect();
		const message: CheckboxFrameParentMessage = {
			pf: nonce,
			t: "offset",
			left: rect.left,
			top: rect.top,
		};
		frame.contentWindow?.postMessage(message, src.origin);
	};
	let offsetQueued = false;
	const queueOffset = (): void => {
		if (offsetQueued || !ready) {
			return;
		}
		offsetQueued = true;
		requestAnimationFrame(() => {
			offsetQueued = false;
			postOffset();
		});
	};
	const viewportChange: AddEventListenerOptions = {
		capture: true,
		passive: true,
	};
	teardown.addEventListener(window, "scroll", queueOffset, viewportChange);
	teardown.addEventListener(window, "resize", queueOffset, viewportChange);

	const showFrame = (): void => {
		shown = true;
		clearTimeout(timer);
		applyStyles(frame, {
			position: "static",
			opacity: "1",
			pointerEvents: "auto",
		});
		standIn?.destroy();
		standIn = undefined;
		postOffset();
	};

	const postProps = (): void => {
		const message: CheckboxFrameParentMessage = {
			pf: nonce,
			t: "props",
			props: frameProps(props),
		};
		frame.contentWindow?.postMessage(message, src.origin);
	};

	const activate = ({ x, y, inputMethod }: Activation): void => {
		noteInputMethod(inputMethod);
		// (0, 0) means the activation had no position, which a keyboard press
		// never does; it stays (0, 0) rather than becoming the frame's corner.
		if (0 === x && 0 === y) {
			void props.onChange({ x, y, inputMethod });
			return;
		}
		const rect = frame.getBoundingClientRect();
		void props.onChange({ x: rect.left + x, y: rect.top + y, inputMethod });
	};

	teardown.addEventListener(window, "message", (event: Event) => {
		const message = event as MessageEvent<CheckboxFrameMessage>;
		if (
			message.source !== frame.contentWindow ||
			message.origin !== src.origin ||
			message.data?.pf !== nonce ||
			!frame.isConnected
		) {
			return;
		}
		const data = message.data;
		if ("ready" === data.t) {
			ready = true;
			postOffset();
			postProps();
		} else if ("size" === data.t) {
			frame.style.width = `${data.w}px`;
			frame.style.height = `${data.h}px`;
		} else if ("drawn" === data.t && !shown) {
			showFrame();
		} else if ("activate" === data.t && shown) {
			activate(data);
		}
	});

	return {
		update(next: CheckboxProps): void {
			props = next;
			standIn?.update(next);
			frame.title = next.labelText;
			frame.style.colorScheme = next.theme.palette.mode;
			if (ready) {
				postProps();
			}
		},
		destroy(): void {
			teardown.run();
		},
	};
};

const MOUSE_INPUT = [
	"mousemove",
	"mousedown",
	"mouseup",
	"click",
	"dblclick",
	"contextmenu",
] as const;

const TOUCH_INPUT = [
	"touchstart",
	"touchmove",
	"touchend",
	"touchcancel",
] as const;

const POINTER_EVENTS = [
	"pointerover",
	"pointerout",
	"pointerleave",
	"pointerdown",
	"pointerup",
] as const;

/** Where the frame's messages may go: the page that embeds it, if it can tell. */
const parentOrigin = (): string => {
	const ancestor = location.ancestorOrigins?.[0];
	if (ancestor) {
		return ancestor;
	}
	try {
		return new URL(document.referrer).origin;
	} catch {
		return "*";
	}
};

/**
 * Runs inside the frame page. Draws the checkbox the page describes, tells the
 * page when it is activated and how big it is, and passes on the pointer
 * events it sees so the page can check that the pointer really crossed in.
 */
export const runCheckboxFrame = (): void => {
	const nonce = new URLSearchParams(location.hash.slice(1)).get("n");
	if (!nonce || window.parent === window) {
		return;
	}
	const target = parentOrigin();
	const post = (message: CheckboxFrameMessage): void => {
		window.parent.postMessage(message, target);
	};

	let checkbox: Component<CheckboxProps> | undefined;
	let offset = { left: 0, top: 0 };

	// The frame page lays its body out inline-block, so the body's box is the
	// checkbox's size rather than the frame's.
	const postSize = (): void => {
		const { width, height } = document.body.getBoundingClientRect();
		post({ pf: nonce, t: "size", w: Math.ceil(width), h: Math.ceil(height) });
	};

	addEventListener(
		"message",
		(event: MessageEvent<CheckboxFrameParentMessage>) => {
			if (event.source !== window.parent || event.data?.pf !== nonce) {
				return;
			}
			if ("offset" === event.data.t) {
				offset = { left: event.data.left, top: event.data.top };
				return;
			}
			if ("props" !== event.data.t) {
				return;
			}
			// Without a matching color-scheme Chrome paints the frame's canvas
			// opaque, a white box on a dark page.
			document.documentElement.style.colorScheme =
				event.data.props.theme.palette.mode;
			const props: CheckboxProps = {
				...event.data.props,
				onChange: (activation: Activation) =>
					post({ pf: nonce, t: "activate", ...activation }),
			};
			if (checkbox) {
				checkbox.update(props);
			} else {
				checkbox = mountCheckbox(document.body, props);
				if ("undefined" !== typeof ResizeObserver) {
					new ResizeObserver(postSize).observe(document.body);
				}
				// The second frame callback runs after the first paint, so the
				// page never swaps to a frame that has not drawn yet.
				requestAnimationFrame(() =>
					requestAnimationFrame(() => post({ pf: nonce, t: "drawn" })),
				);
			}
			postSize();
		},
	);

	for (const type of POINTER_EVENTS) {
		addEventListener(
			type,
			(event: PointerEvent) => {
				if (event.isTrusted) {
					post({
						pf: nonce,
						t: "pointer",
						type,
						pointerType: event.pointerType,
					});
				}
			},
			{ capture: true, passive: true },
		);
	}

	const forwardTouch = (touch: Touch): ForwardedTouch => ({
		x: touch.clientX + offset.left,
		y: touch.clientY + offset.top,
		id: touch.identifier,
		force: touch.force,
		rx: touch.radiusX,
		ry: touch.radiusY,
		rot: touch.rotationAngle,
	});
	for (const type of MOUSE_INPUT) {
		addEventListener(
			type,
			(event: MouseEvent) => {
				if (event.isTrusted) {
					post({
						pf: nonce,
						t: "input",
						type,
						x: event.clientX + offset.left,
						y: event.clientY + offset.top,
						button: event.button,
						ctrlKey: event.ctrlKey,
						shiftKey: event.shiftKey,
						altKey: event.altKey,
					});
				}
			},
			{ capture: true, passive: true },
		);
	}
	for (const type of TOUCH_INPUT) {
		addEventListener(
			type,
			(event: TouchEvent) => {
				if (event.isTrusted) {
					post({
						pf: nonce,
						t: "input",
						type,
						touches: Array.from(event.touches, forwardTouch),
						changed: Array.from(event.changedTouches, forwardTouch),
					});
				}
			},
			{ capture: true, passive: true },
		);
	}

	post({ pf: nonce, t: "ready" });
};
