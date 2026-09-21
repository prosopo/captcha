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

import { PlacementEnum, type PlacementType } from "@prosopo/types";
import type { Component } from "../dom/component.js";
import { Teardown } from "../dom/component.js";
import { type StyleMap, applyStyles, createElement } from "../dom/element.js";

/**
 * The layer every challenge is presented on. Appended to `document.body` so a
 * host page's `overflow: hidden` or transformed ancestor cannot clip it.
 * `popup` centres the content over the page; `float` anchors it to the widget.
 */

/** Scrim behind the content. Image has never dimmed the page; puzzle always has. */
export type SurfaceScrim = "none" | "dim";

export interface ChallengeSurfaceProps {
	show: boolean;
	placement?: PlacementType;
	/** Element a floating challenge is positioned against. Without one, float falls back to popup. */
	anchor?: HTMLElement | null;
	scrim?: SurfaceScrim;
	/** Called on Escape, and on an outside click when floating. */
	onDismiss?: () => void;
	className?: string;
	/**
	 * Accessible name for the panel. Supplying one turns the panel into a modal
	 * dialog: it takes focus when it opens, keeps Tab inside itself while it is
	 * open, and hands focus back to whatever opened it on close. Challenges
	 * that have nothing focusable to offer leave it unset and stay inert.
	 */
	dialogLabel?: string;
}

export interface ChallengeSurfaceComponent
	extends Component<ChallengeSurfaceProps> {
	/** Where the challenge UI mounts. Lives in light DOM, under document.body. */
	readonly content: HTMLElement;
}

const FOCUSABLE_SELECTOR = [
	"a[href]",
	"button:not([disabled])",
	"input:not([disabled])",
	"select:not([disabled])",
	"textarea:not([disabled])",
	'[tabindex]:not([tabindex="-1"])',
].join(",");

const focusableWithin = (root: HTMLElement): HTMLElement[] =>
	Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));

const SURFACE_Z_INDEX = 2147483646;
const CONTENT_Z_INDEX = 2147483647;

const POPUP_EDGE_GAP_PX = 8;

const FLOAT_GAP_PX = 8;

export interface FloatPosition {
	top: number;
	left: number;
}

/**
 * Places the panel directly above the anchor, in document coordinates.
 *
 * Document coordinates rather than viewport ones, because the panel is
 * `position: absolute`: the page carries it while scrolling instead of the
 * panel being recomputed against a moving viewport, which is what made it
 * drift. Always above, never flipped, so the challenge does not jump to the
 * other side of the widget as the page moves.
 */
export const computeFloatPosition = (
	anchorRect: DOMRect,
	panelHeight: number,
	scrollX: number,
	scrollY: number,
): FloatPosition => ({
	// Clamped at the top of the document so a widget near the top of the page
	// cannot push the panel out of reach.
	top: Math.max(0, anchorRect.top + scrollY - panelHeight - FLOAT_GAP_PX),
	left: anchorRect.left + scrollX,
});

/**
 * Each branch below clears the other's declarations before writing its own, so
 * switching placement at runtime leaves nothing stale behind.
 *
 * The clears come first because `applyStyles` writes in key order and `inset`
 * is a shorthand: removing it after setting `top`/`left` takes those with it,
 * and setting it before clearing them undoes the sides it had just written.
 */
const floatLayerStyle = (show: boolean): StyleMap => ({
	inset: undefined,
	alignItems: undefined,
	justifyContent: undefined,
	minHeight: undefined,
	padding: undefined,
	boxSizing: undefined,
	backgroundColor: undefined,
	transition: undefined,
	// A zero-sized box at the document origin: it must not cover the page, and
	// only its content takes pointer events. Absolute with no positioned
	// ancestor resolves against the initial containing block, which is what
	// makes the child's coordinates document coordinates.
	position: "absolute",
	top: 0,
	left: 0,
	width: 0,
	height: 0,
	zIndex: SURFACE_Z_INDEX,
	display: show ? "block" : "none",
	pointerEvents: "none",
});

const popupLayerStyle = (show: boolean, scrim: SurfaceScrim): StyleMap => ({
	width: undefined,
	height: undefined,
	top: undefined,
	left: undefined,
	pointerEvents: undefined,
	position: "fixed",
	inset: 0,
	zIndex: SURFACE_Z_INDEX,
	display: show ? "flex" : "none",
	alignItems: "center",
	justifyContent: "center",
	// `dvh`, not `vh`: on iOS Safari `100vh` is the toolbar-retracted height,
	// which would make this box taller than the visible area and centre the
	// challenge underneath the bottom bar.
	minHeight: "100dvh",
	padding: `${POPUP_EDGE_GAP_PX}px`,
	boxSizing: "border-box",
	backgroundColor:
		"dim" === scrim && show ? "rgba(0, 0, 0, 0.4)" : "transparent",
	transition: "background-color 0.3s ease",
});

const floatContentStyle = (position: FloatPosition | null): StyleMap => ({
	maxWidth: undefined,
	maxHeight: undefined,
	overflowY: undefined,
	overscrollBehavior: undefined,
	boxSizing: undefined,
	position: "absolute",
	zIndex: CONTENT_Z_INDEX,
	pointerEvents: "auto",
	top: `${position?.top ?? 0}px`,
	left: `${position?.left ?? 0}px`,
	// Hidden until the first measurement so it does not flash at 0,0.
	visibility: position ? "visible" : "hidden",
});

const popupContentStyle = (): StyleMap => ({
	top: undefined,
	left: undefined,
	pointerEvents: undefined,
	visibility: undefined,
	// Centred as a flex item by the layer rather than by `top/left: 50%` and a
	// translate. An out-of-flow panel taller than the viewport overflows off
	// both edges and its top is unreachable; in flow it is bounded by
	// `maxHeight` and scrolls instead.
	position: "relative",
	zIndex: CONTENT_Z_INDEX,
	boxSizing: "border-box",
	maxWidth: "100%",
	maxHeight: "100%",
	overflowY: "auto",
	overscrollBehavior: "contain",
});

/**
 * Vanilla replacement for the `ChallengeSurface` React component.
 *
 * The React version leaned on effect dependency arrays to attach the resize,
 * keydown and pointerdown listeners only while the panel was open. Here the
 * listeners are attached and detached explicitly on every `update`, so a
 * surface that is hidden — or that stops floating — is not left holding
 * document-level handlers.
 */
export const mountChallengeSurface = (
	initialProps: ChallengeSurfaceProps,
): ChallengeSurfaceComponent => {
	const teardown = new Teardown();
	let props = initialProps;
	let floatPosition: FloatPosition | null = null;
	/** Teardown for the listeners that only exist while the panel is open. */
	let openTeardown: Teardown | null = null;
	let opener: HTMLElement | null = null;
	let dialogOpen = false;

	const content = createElement("div", {
		className: "prosopo-challenge-content",
	});

	const layer = createElement("div", { children: [content] });

	const isFloating = (): boolean =>
		PlacementEnum.float === props.placement && !!props.anchor;

	const reposition = () => {
		const anchor = props.anchor;
		if (!isFloating() || !anchor) {
			return;
		}
		const next = computeFloatPosition(
			anchor.getBoundingClientRect(),
			content.getBoundingClientRect().height,
			window.scrollX,
			window.scrollY,
		);
		if (
			floatPosition &&
			floatPosition.top === next.top &&
			floatPosition.left === next.left
		) {
			return;
		}
		floatPosition = next;
		applyStyles(content, floatContentStyle(floatPosition));
	};

	/**
	 * Focus is handed over on the closed-to-open transition and handed back on
	 * the open-to-closed one, never on a plain re-render: the listeners below
	 * are rebuilt on every update, and doing this alongside them would drag
	 * the user back into the panel each time a prop changed.
	 */
	const openDialogFocus = () => {
		if (dialogOpen) {
			return;
		}
		dialogOpen = true;
		opener =
			document.activeElement instanceof HTMLElement
				? document.activeElement
				: null;
		// The panel itself is the fallback so the dialog's name is still
		// announced when it holds nothing focusable.
		(focusableWithin(content)[0] ?? content).focus();
	};

	/**
	 * The panel is only ever focused as a stand-in for having nothing else to
	 * offer. Callers mount the surface and then fill it, so the challenge's own
	 * controls usually arrive an update later than the handover — this moves
	 * focus on to them when they do, and only while it is still parked on the
	 * panel, so a user who has since moved is left alone.
	 */
	const upgradeDialogFocus = () => {
		if (!dialogOpen || document.activeElement !== content) {
			return;
		}
		focusableWithin(content)[0]?.focus();
	};

	const closeDialogFocus = () => {
		if (!dialogOpen) {
			return;
		}
		dialogOpen = false;
		const previous = opener;
		opener = null;
		previous?.focus();
	};

	// Tabbing off either end wraps back inside. A modal hides the rest of the
	// page from assistive tech, so focus landing out there leaves the user
	// somewhere they have no way to perceive or get back from.
	const trapTab = (event: KeyboardEvent) => {
		if ("Tab" !== event.key) {
			return;
		}
		const focusable = focusableWithin(content);
		const first = focusable[0] ?? content;
		const last = focusable[focusable.length - 1] ?? content;
		const active = document.activeElement;
		const outside = !content.contains(active);

		if (event.shiftKey && (outside || active === first)) {
			event.preventDefault();
			last.focus();
		} else if (!event.shiftKey && (outside || active === last)) {
			event.preventDefault();
			first.focus();
		}
	};

	const openListeners = () => {
		const open = new Teardown();
		openTeardown = open;

		if (props.onDismiss) {
			const onDismiss = props.onDismiss;
			open.addEventListener(document, "keydown", (event: Event) => {
				if ("Escape" === (event as KeyboardEvent).key) {
					onDismiss();
				}
			});
		}

		if (isFloating()) {
			// No scroll listener: the coordinates are document-relative, so the
			// page scrolls the panel along with the widget on its own. Resize
			// still matters because it can reflow the anchor to a new place in
			// the page.
			open.addEventListener(window, "resize", reposition);

			if ("function" === typeof ResizeObserver) {
				const observer = new ResizeObserver(() => reposition());
				observer.observe(content);
				if (props.anchor) {
					observer.observe(props.anchor);
				}
				open.add(() => observer.disconnect());
			}

			if (props.onDismiss) {
				const onDismiss = props.onDismiss;
				open.addEventListener(document, "pointerdown", (event: Event) => {
					const target = (event as PointerEvent).target;
					if (!(target instanceof Node)) {
						return;
					}
					if (content.contains(target)) {
						return;
					}
					// The anchor's own click is what opens the panel.
					if (props.anchor?.contains(target)) {
						return;
					}
					onDismiss();
				});
			}
		}

		if (props.dialogLabel) {
			open.addEventListener(document, "keydown", (event: Event) => {
				trapTab(event as KeyboardEvent);
			});
		}
	};

	const render = () => {
		const floating = isFloating();

		layer.className = [
			"prosopo-challenge-surface",
			`prosopo-challenge-surface--${floating ? "float" : "popup"}`,
			props.className,
		]
			.filter(Boolean)
			.join(" ");

		applyStyles(
			layer,
			floating
				? floatLayerStyle(props.show)
				: popupLayerStyle(props.show, props.scrim ?? "none"),
		);

		if (props.dialogLabel) {
			content.setAttribute("role", "dialog");
			content.setAttribute("aria-modal", "true");
			content.setAttribute("aria-label", props.dialogLabel);
			content.setAttribute("tabindex", "-1");
		} else {
			content.removeAttribute("role");
			content.removeAttribute("aria-modal");
			content.removeAttribute("aria-label");
			content.removeAttribute("tabindex");
		}

		if (floating) {
			applyStyles(content, floatContentStyle(floatPosition));
		} else {
			floatPosition = null;
			applyStyles(content, popupContentStyle());
		}
	};

	/**
	 * Listeners are torn down and re-attached whenever the props they close
	 * over change, so the open state always reflects the latest `onDismiss`,
	 * `anchor` and `placement` — the job the React dependency arrays did.
	 */
	const syncListeners = () => {
		openTeardown?.run();
		openTeardown = null;

		if (!props.show) {
			closeDialogFocus();
			return;
		}

		openListeners();

		if (props.dialogLabel) {
			openDialogFocus();
			upgradeDialogFocus();
		} else {
			closeDialogFocus();
		}

		if (isFloating()) {
			reposition();
		}
	};

	render();
	document.body.appendChild(layer);
	syncListeners();

	teardown.add(() => {
		openTeardown?.run();
		openTeardown = null;
		closeDialogFocus();
	});

	return {
		content,
		update: (nextProps: ChallengeSurfaceProps) => {
			props = nextProps;
			render();
			syncListeners();
		},
		destroy: () => {
			teardown.run();
			layer.parentNode?.removeChild(layer);
		},
	};
};
