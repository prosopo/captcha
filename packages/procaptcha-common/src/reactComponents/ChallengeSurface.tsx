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
	className?: string;
	/**
	 * Accessible name for the panel. Supplying one turns the panel into a modal
	 * dialog: it takes focus when it opens, keeps Tab inside itself while it is
	 * open, and hands focus back to whatever opened it on close. Challenges
	 * that have nothing focusable to offer leave it unset and stay inert.
	 */
	dialogLabel?: string;
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

const useIsomorphicLayoutEffect =
	typeof window === "undefined" ? useEffect : useLayoutEffect;

interface FloatPosition {
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
const computeFloatPosition = (
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

const ChallengeSurface = React.memo((props: ChallengeSurfaceProps) => {
	const {
		show,
		children,
		placement = PlacementEnum.popup,
		anchor,
		scrim = "none",
		onDismiss,
		className,
		dialogLabel,
	} = props;

	const contentRef = useRef<HTMLDivElement>(null);
	const [floatPosition, setFloatPosition] = useState<FloatPosition | null>(
		null,
	);

	const isFloating = placement === PlacementEnum.float && !!anchor;

	const reposition = useCallback(() => {
		if (!isFloating || !anchor || !contentRef.current) return;
		const panel = contentRef.current.getBoundingClientRect();
		const next = computeFloatPosition(
			anchor.getBoundingClientRect(),
			panel.height,
			window.scrollX,
			window.scrollY,
		);
		// Reflow and panel-size changes fire more often than the panel actually
		// moves; keeping the previous object when nothing changed avoids a
		// needless re-render.
		setFloatPosition((current) =>
			current && current.top === next.top && current.left === next.left
				? current
				: next,
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

		// No scroll listener: the coordinates are document-relative, so the page
		// scrolls the panel along with the widget on its own. Resize still
		// matters because it can reflow the anchor to a new place in the page.
		window.addEventListener("resize", reposition);

		const observer =
			typeof ResizeObserver === "function"
				? new ResizeObserver(reposition)
				: null;
		if (observer && contentRef.current) observer.observe(contentRef.current);
		if (observer && anchor) observer.observe(anchor);

		return () => {
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
		if (!show || !dialogLabel) return;

		const content = contentRef.current;
		if (!content) return;

		const opener =
			document.activeElement instanceof HTMLElement
				? document.activeElement
				: null;
		// The panel itself is the fallback so the dialog's name is still
		// announced when it holds nothing focusable.
		(focusableWithin(content)[0] ?? content).focus();

		return () => opener?.focus();
	}, [show, dialogLabel]);

	useEffect(() => {
		if (!show || !dialogLabel) return;

		// Tabbing off either end wraps back inside. A modal hides the rest of
		// the page from assistive tech, so focus landing out there leaves the
		// user somewhere they have no way to perceive or get back from.
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key !== "Tab") return;
			const content = contentRef.current;
			if (!content) return;

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

		document.addEventListener("keydown", onKeyDown);
		return () => document.removeEventListener("keydown", onKeyDown);
	}, [show, dialogLabel]);

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

	if (typeof document === "undefined") return null;

	const layerStyle: CSSProperties = isFloating
		? {
				// A zero-sized box at the document origin: it must not cover the
				// page, and only its content takes pointer events. Absolute with
				// no positioned ancestor resolves against the initial containing
				// block, which is what makes the child's coordinates document
				// coordinates.
				position: "absolute",
				top: 0,
				left: 0,
				width: 0,
				height: 0,
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
				// `dvh`, not `vh`: on iOS Safari `100vh` is the toolbar-retracted
				// height, which would make this box taller than the visible area and
				// centre the challenge underneath the bottom bar.
				minHeight: "100dvh",
				padding: `${POPUP_EDGE_GAP_PX}px`,
				boxSizing: "border-box",
				backgroundColor:
					scrim === "dim" && show ? "rgba(0, 0, 0, 0.4)" : "transparent",
				transition: "background-color 0.3s ease",
			};

	const contentStyle: CSSProperties = isFloating
		? {
				position: "absolute",
				zIndex: CONTENT_Z_INDEX,
				pointerEvents: "auto",
				top: `${floatPosition?.top ?? 0}px`,
				left: `${floatPosition?.left ?? 0}px`,
				// Hidden until the first measurement so it does not flash at 0,0.
				visibility: floatPosition ? "visible" : "hidden",
			}
		: {
				// Centred as a flex item by the layer rather than by
				// `top/left: 50%` and a translate. An out-of-flow panel taller than
				// the viewport overflows off both edges and its top is unreachable;
				// in flow it is bounded by `maxHeight` and scrolls instead.
				position: "relative",
				zIndex: CONTENT_Z_INDEX,
				boxSizing: "border-box",
				maxWidth: "100%",
				maxHeight: "100%",
				overflowY: "auto",
				overscrollBehavior: "contain",
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
			{/* biome-ignore lint/a11y/useSemanticElements: <dialog> brings its own
			    top-layer and backdrop, which would fight the portal's own
			    stacking and the float placement computed above. */}
			<div
				ref={contentRef}
				className="prosopo-challenge-content"
				style={contentStyle}
				role={dialogLabel ? "dialog" : undefined}
				aria-modal={dialogLabel ? true : undefined}
				aria-label={dialogLabel}
				tabIndex={dialogLabel ? -1 : undefined}
			>
				{children}
			</div>
		</div>,
		document.body,
	);
});

ChallengeSurface.displayName = "ChallengeSurface";

export { ChallengeSurface, computeFloatPosition };
