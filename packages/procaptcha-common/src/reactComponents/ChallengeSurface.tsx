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
import React, {
	type CSSProperties,
	type ReactNode,
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { createPortal } from "react-dom";

/**
 * The single layer every challenge is presented on.
 *
 * Image and puzzle each grew their own full-viewport overlay — a scrim, a
 * z-index, a centring rule, duplicated with subtly different values. Adding a
 * second placement to both would have meant writing it twice, so the layer is
 * shared and the difference between "popup" and "float" lives in one place.
 *
 * Callers pass unpositioned content: the surface decides where it goes. Both
 * placements portal to `document.body` and position fixed, because a challenge
 * rendered in the widget's own flow gets clipped the moment a host page puts
 * the widget inside `overflow: hidden` — which is most of them.
 */

/** Scrim behind the content. Image has never dimmed the page; puzzle always has. */
export type SurfaceScrim = "none" | "dim";

interface ChallengeSurfaceProps {
	show: boolean;
	children: ReactNode;
	/** Defaults to popup, which is what every challenge did before placement existed. */
	placement?: PlacementType;
	/**
	 * The element a floating challenge is positioned against — normally the
	 * widget container. Float without an anchor has nothing to attach to, so
	 * the surface falls back to popup rather than rendering somewhere arbitrary.
	 */
	anchor?: HTMLElement | null;
	scrim?: SurfaceScrim;
	/** Escape, and (float only) a click outside the content. */
	onDismiss?: () => void;
	/**
	 * Lifts the popup content by half its own height on iOS.
	 *
	 * Carried over from the image captcha's modal, where it compensates for
	 * Safari's bottom bar overlapping a centred dialog. Opt-in rather than
	 * universal so migrating the puzzle onto this surface does not silently
	 * move it on iOS.
	 */
	popupIosLift?: boolean;
	/**
	 * Extra class on the layer element.
	 *
	 * Exists so the image modal can keep emitting `prosopo-modalOuter`, which
	 * has been in customers' stylesheets since long before this surface — a
	 * refactor should not silently retire a public styling hook.
	 */
	className?: string;
}

// One below the content, so the content always wins against the layer itself.
const SURFACE_Z_INDEX = 2147483646;
const CONTENT_Z_INDEX = 2147483647;

/**
 * The iOS lift, as a real stylesheet rule.
 *
 * `@supports (-webkit-touch-callout: none)` is an iOS-Safari sniff and cannot
 * be expressed as an inline style, so the transform for a lifted popup comes
 * entirely from here rather than being split between the two.
 */
const IOS_LIFT_STYLE_ID = "prosopo-challenge-surface-ios-lift";

const IOS_LIFT_CSS = `
.prosopo-challenge-content--ios-lift {
	transform: translate(-50%, -50%);
}
@supports (-webkit-touch-callout: none) {
	.prosopo-challenge-content--ios-lift {
		transform: translate(-50%, -100%);
	}
}
`;

/**
 * Adds the rule to the document head once per page.
 *
 * Rendering it as a `<style>` inside the surface would work, but the rule is
 * identical for every widget and its text would count towards the surface's
 * own `textContent` — which is what anything reading the challenge's text,
 * tests included, actually sees.
 */
const ensureIosLiftStyles = (): void => {
	if (typeof document === "undefined") return;
	if (document.getElementById(IOS_LIFT_STYLE_ID)) return;

	const style = document.createElement("style");
	style.id = IOS_LIFT_STYLE_ID;
	style.textContent = IOS_LIFT_CSS;
	document.head.appendChild(style);
};

/** Distance between a floating panel and the element it is anchored to. */
const FLOAT_GAP_PX = 8;
/** Keeps a floating panel off the exact edge of the viewport. */
const FLOAT_VIEWPORT_MARGIN_PX = 8;

interface FloatPosition {
	top: number;
	left: number;
}

/**
 * Places the panel below the anchor, flipping above it when there is more room
 * there, and clamps horizontally so it cannot hang off the viewport.
 *
 * Coordinates are viewport-relative because the panel is `position: fixed` —
 * which is also why this has to re-run on scroll rather than being computed
 * once at open time.
 */
const computeFloatPosition = (
	anchorRect: DOMRect,
	panelWidth: number,
	panelHeight: number,
	viewportWidth: number,
	viewportHeight: number,
): FloatPosition => {
	const spaceBelow = viewportHeight - anchorRect.bottom;
	const spaceAbove = anchorRect.top;
	const fitsBelow = spaceBelow >= panelHeight + FLOAT_GAP_PX;
	const flipAbove = !fitsBelow && spaceAbove > spaceBelow;

	const top = flipAbove
		? anchorRect.top - panelHeight - FLOAT_GAP_PX
		: anchorRect.bottom + FLOAT_GAP_PX;

	// Prefer left-aligning with the anchor; pull it back in if that overflows.
	const maxLeft = viewportWidth - panelWidth - FLOAT_VIEWPORT_MARGIN_PX;
	const left = Math.max(
		FLOAT_VIEWPORT_MARGIN_PX,
		Math.min(anchorRect.left, maxLeft),
	);

	// A panel taller than the viewport cannot be fully placed; pin it to the
	// top so its first row is reachable rather than letting it run off-screen.
	const maxTop = viewportHeight - panelHeight - FLOAT_VIEWPORT_MARGIN_PX;
	const clampedTop = Math.max(
		FLOAT_VIEWPORT_MARGIN_PX,
		Math.min(top, Math.max(FLOAT_VIEWPORT_MARGIN_PX, maxTop)),
	);

	return { top: clampedTop, left };
};

const ChallengeSurface = React.memo((props: ChallengeSurfaceProps) => {
	const {
		show,
		children,
		placement = PlacementEnum.popup,
		anchor,
		scrim = "none",
		onDismiss,
		popupIosLift = false,
		className,
	} = props;

	const contentRef = useRef<HTMLDivElement>(null);
	const [floatPosition, setFloatPosition] = useState<FloatPosition | null>(
		null,
	);

	// Float needs something to attach to. Without an anchor the honest fallback
	// is the centred popup, not a panel pinned to an arbitrary corner.
	const isFloating = placement === PlacementEnum.float && !!anchor;

	const reposition = useCallback(() => {
		if (!isFloating || !anchor || !contentRef.current) return;
		const panel = contentRef.current.getBoundingClientRect();
		setFloatPosition(
			computeFloatPosition(
				anchor.getBoundingClientRect(),
				panel.width,
				panel.height,
				window.innerWidth,
				window.innerHeight,
			),
		);
	}, [isFloating, anchor]);

	// Layout effect so the first paint already has the panel in place; a state
	// update in a passive effect would show it at 0,0 for a frame first.
	useLayoutEffect(() => {
		if (!show || !isFloating) {
			setFloatPosition(null);
			return;
		}
		reposition();
	}, [show, isFloating, reposition]);

	useEffect(() => {
		if (!show || !isFloating) return;

		// Capture phase: an ancestor that scrolls does not bubble its scroll
		// event, so a panel anchored to a widget inside a scrollable column
		// would drift away from it without this.
		window.addEventListener("scroll", reposition, true);
		window.addEventListener("resize", reposition);

		// The panel's own size changes as a challenge loads its content, and
		// the anchor can move without any scroll or resize at all.
		const observer =
			typeof ResizeObserver === "function"
				? new ResizeObserver(reposition)
				: null;
		if (observer && contentRef.current) observer.observe(contentRef.current);
		if (observer && anchor) observer.observe(anchor);

		return () => {
			window.removeEventListener("scroll", reposition, true);
			window.removeEventListener("resize", reposition);
			observer?.disconnect();
		};
	}, [show, isFloating, anchor, reposition]);

	useEffect(() => {
		if (!show || !onDismiss) return;

		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") onDismiss();
		};
		document.addEventListener("keydown", onKeyDown);
		return () => document.removeEventListener("keydown", onKeyDown);
	}, [show, onDismiss]);

	useEffect(() => {
		if (!show || !isFloating || !onDismiss) return;

		// Only float dismisses on an outside click. Popup has a scrim covering
		// the page, so "outside" is not reachable without going through it, and
		// the challenge's own cancel button is the way out.
		const onPointerDown = (event: PointerEvent) => {
			const target = event.target;
			if (!(target instanceof Node)) return;
			if (contentRef.current?.contains(target)) return;
			// Clicking the widget itself is what opened this; treating it as an
			// outside click would close and immediately reopen the panel.
			if (anchor?.contains(target)) return;
			onDismiss();
		};
		document.addEventListener("pointerdown", onPointerDown);
		return () => document.removeEventListener("pointerdown", onPointerDown);
	}, [show, isFloating, anchor, onDismiss]);

	useEffect(() => {
		if (popupIosLift && !isFloating) ensureIosLiftStyles();
	}, [popupIosLift, isFloating]);

	if (typeof document === "undefined") return null;

	const layerStyle: CSSProperties = isFloating
		? {
				// A float layer must not cover the page: it is sized to nothing and
				// only its content receives pointer events, so the host page stays
				// usable behind it. That is the whole difference from popup.
				position: "fixed",
				inset: 0,
				zIndex: SURFACE_Z_INDEX,
				display: show ? "block" : "none",
				pointerEvents: "none",
			}
		: {
				position: "fixed",
				inset: 0,
				zIndex: SURFACE_Z_INDEX,
				display: show ? "flex" : "none",
				alignItems: "center",
				justifyContent: "center",
				minHeight: "100vh",
				backgroundColor:
					scrim === "dim" && show ? "rgba(0, 0, 0, 0.4)" : "transparent",
				transition: "background-color 0.3s ease",
			};

	const contentStyle: CSSProperties = isFloating
		? {
				position: "fixed",
				zIndex: CONTENT_Z_INDEX,
				pointerEvents: "auto",
				top: `${floatPosition?.top ?? 0}px`,
				left: `${floatPosition?.left ?? 0}px`,
				// Until the first measurement lands the panel has no meaningful
				// position; showing it at 0,0 would flash it in the corner.
				visibility: floatPosition ? "visible" : "hidden",
			}
		: {
				position: "absolute",
				top: "50%",
				left: "50%",
				// Left unset when lifting so the stylesheet rule below owns the
				// transform; an inline value would out-specify the @supports block.
				transform: popupIosLift ? undefined : "translate(-50%, -50%)",
				zIndex: CONTENT_Z_INDEX,
				boxSizing: "border-box",
			};

	return createPortal(
		<div
			className={[
				"prosopo-challenge-surface",
				`prosopo-challenge-surface--${isFloating ? "float" : "popup"}`,
				className,
			]
				.filter(Boolean)
				.join(" ")}
			style={layerStyle}
		>
			<div
				ref={contentRef}
				className={
					popupIosLift && !isFloating
						? "prosopo-challenge-content prosopo-challenge-content--ios-lift"
						: "prosopo-challenge-content"
				}
				style={contentStyle}
			>
				{children}
			</div>
		</div>,
		document.body,
	);
});

ChallengeSurface.displayName = "ChallengeSurface";

export { ChallengeSurface, computeFloatPosition };
