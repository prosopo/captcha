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

import {
	type CSSProperties,
	forwardRef,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
} from "react";
import { createPortal } from "react-dom";

interface HoneypotProps {
	encodedQuestion: string;
}

const offscreenStyle: CSSProperties = {
	position: "absolute",
	left: "-9999px",
	top: "-9999px",
	width: "1px",
	height: "1px",
	overflow: "hidden",
	opacity: 0,
};

// Server wraps morse/semaphore in base64 (utf-8) for the wire. Strip the
// base64 layer here so the rendered label is the raw morse/semaphore an agent
// can recognise and engage with.
const decodeBase64Utf8 = (b64: string): string => {
	const binary = atob(b64);
	const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
	return new TextDecoder().decode(bytes);
};

// Locate the dapp's enclosing <form> by stepping out of the widget's shadow
// root into light DOM, then walking up via closest(). Returns null when the
// widget isn't embedded inside a form.
const findAncestorForm = (anchor: Element): HTMLFormElement | null => {
	const root = anchor.getRootNode();
	const lightDomEntry = root instanceof ShadowRoot ? root.host : anchor;
	return lightDomEntry instanceof Element
		? lightDomEntry.closest("form")
		: null;
};

// Honeypot must live in light DOM, not in the widget's shadow root: if it
// rendered there a bot would have to traverse `.shadowRoot` to reach it, and
// @prosopo/catcher patches that getter to detect (and restart on) automated
// access — wiping the value the bot just wrote before it can submit.
//
// Within light DOM we prefer the enclosing <form> so bots scraping
// `form.querySelectorAll('input')` discover the bait naturally; document.body
// is the fallback for widgets mounted outside any form.
//
// The decoded question is rendered as the input's <label>, not as its value.
// Naive form-fillers leave the empty input alone — no signal, no false
// positives. Agents that read the DOM as a prompt may decode the label and
// write an answer into the empty field; that response rides up as
// clientMetaData.hp.
export const Honeypot = forwardRef<HTMLInputElement, HoneypotProps>(
	({ encodedQuestion }, ref) => {
		const id = useId();
		// Opaque non-existent form id. Setting `form="..."` on an input with a
		// value that doesn't match any form's id disassociates the input from
		// every form: the browser excludes it from the parent form's submission
		// set and from `form.elements`, while leaving it discoverable via
		// `form.querySelectorAll('input')`. Built from useId so it's unique per
		// Honeypot instance and guaranteed not to collide with the input's own id.
		const detachedFormId = `${id}-d`;
		const question = useMemo(
			() => decodeBase64Utf8(encodedQuestion),
			[encodedQuestion],
		);
		const anchorRef = useRef<HTMLSpanElement>(null);
		const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

		useEffect(() => {
			const anchor = anchorRef.current;
			if (!anchor) return;
			setPortalTarget(findAncestorForm(anchor) ?? document.body);
		}, []);

		if (typeof document === "undefined") return null;

		// Transient anchor while we resolve the portal target. Sits in the React
		// tree (inside the shadow root) just long enough for the effect above to
		// walk out to light DOM and find the form.
		if (!portalTarget) {
			return (
				<span ref={anchorRef} aria-hidden="true" style={{ display: "none" }} />
			);
		}

		// Input is nested inside the label (implicit association) instead of
		// htmlFor-linked — biome's noLabelWithoutControl rule only recognises
		// the descendant form of association at static-analysis time.
		return createPortal(
			<div aria-hidden="true" style={offscreenStyle}>
				<label>
					{question}
					<input
						ref={ref}
						id={id}
						form={detachedFormId}
						type="text"
						name="email_confirm"
						defaultValue=""
						tabIndex={-1}
						autoComplete="off"
						aria-hidden="true"
					/>
				</label>
			</div>,
			portalTarget,
		);
	},
);

Honeypot.displayName = "Honeypot";
