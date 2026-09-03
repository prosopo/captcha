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
 * The layer every challenge is presented on. Portals to `document.body` so a
 * host page's `overflow: hidden` or transformed ancestor cannot clip it.
 * `popup` centres the content over the page; `float` anchors it to the widget.
 */

/** Scrim behind the content. Image has never dimmed the page; puzzle always has. */
export type SurfaceScrim = "none" | "dim";

interface ChallengeSurfaceProps {
	show: boolean;
	children: ReactNode;
	placement?: PlacementType;
	/** Element a floating challenge is positioned against. Without one, float falls back to popup. */
	anchor?: HTMLElement | null;
	scrim?: SurfaceScrim;
	/** Called on Escape, and on an outside click when floating. */
	onDismiss?: () => void;
	/** Lifts the popup content on iOS, where Safari's bottom bar overlaps a centred dialog. */
	popupIosLift?: boolean;
	className?: string;
}

const SURFACE_Z_INDEX = 2147483646;
const CONTENT_Z_INDEX = 2147483647;

// `@supports` cannot be expressed inline, so the iOS lift is a stylesheet rule.
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

const ensureIosLiftStyles = (): void => {
	if (typeof document === "undefined") return;
	if (document.getElementById(IOS_LIFT_STYLE_ID)) return;

	const style = document.createElement("style");
	style.id = IOS_LIFT_STYLE_ID;
	style.textContent = IOS_LIFT_CSS;
	document.head.appendChild(style);
};

const FLOAT_GAP_PX = 8;
const FLOAT_VIEWPORT_MARGIN_PX = 8;

const useIsomorphicLayoutEffect =
	typeof window === "undefined" ? useEffect : useLayoutEffect;

interface FloatPosition {
	top: number;
	left: number;
}

/**
 * Places the panel below the anchor, flipping above when there is more room
 * there, and clamps it inside the viewport. Coordinates are viewport-relative
 * because the panel is `position: fixed`.
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

	const maxLeft = viewportWidth - panelWidth - FLOAT_VIEWPORT_MARGIN_PX;
	const left = Math.max(
		FLOAT_VIEWPORT_MARGIN_PX,
		Math.min(anchorRect.left, maxLeft),
	);

	// A panel taller than the viewport is pinned to the top so its first row is reachable.
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

	// Layout effect so the first paint already has the panel in place.
	useIsomorphicLayoutEffect(() => {
		if (!show || !isFloating) {
			setFloatPosition(null);
			return;
		}
		reposition();
	}, [show, isFloating, reposition]);

	useEffect(() => {
		if (!show || !isFloating) return;

		// Capture phase: a scrolling ancestor's scroll event does not bubble.
		window.addEventListener("scroll", reposition, true);
		window.addEventListener("resize", reposition);

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

		const onPointerDown = (event: PointerEvent) => {
			const target = event.target;
			if (!(target instanceof Node)) return;
			if (contentRef.current?.contains(target)) return;
			// The anchor's own click is what opens the panel.
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
				// The float layer must not cover the page: only its content takes pointer events.
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
				// Hidden until the first measurement so it does not flash at 0,0.
				visibility: floatPosition ? "visible" : "hidden",
			}
		: {
				position: "absolute",
				top: "50%",
				left: "50%",
				// When lifting, the stylesheet rule owns the transform.
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
