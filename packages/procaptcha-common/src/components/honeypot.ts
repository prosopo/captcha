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

import type { Component } from "../dom/component.js";
import { type StyleMap, createElement } from "../dom/element.js";

export interface HoneypotProps {
	encodedQuestion: string;
}

export interface HoneypotComponent extends Component<HoneypotProps> {
	/** Live value of the bait input, read at solution-submit time. */
	getValue(): string | undefined;
}

const offscreenStyle: StyleMap = {
	position: "absolute",
	left: "-9999px",
	top: "-9999px",
	width: "1px",
	height: "1px",
	overflow: "hidden",
	opacity: 0,
};

let honeypotInstanceCount = 0;

// Server wraps morse/semaphore in base64 (utf-8) for the wire. Strip the
// base64 layer here so the rendered label is the raw morse/semaphore an agent
// can recognise and engage with.
const decodeBase64Utf8 = (b64: string): string => {
	const binary = atob(b64);
	const bytes = Uint8Array.from(binary, (c: string) => c.charCodeAt(0));
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
export const mountHoneypot = (
	container: HTMLElement,
	initialProps: HoneypotProps,
): HoneypotComponent => {
	honeypotInstanceCount += 1;
	const id = `prosopo-hp-${honeypotInstanceCount}`;
	// Opaque non-existent form id. Setting `form="..."` on an input with a
	// value that doesn't match any form's id disassociates the input from
	// every form: the browser excludes it from the parent form's submission
	// set and from `form.elements`, while leaving it discoverable via
	// `form.querySelectorAll('input')`.
	const detachedFormId = `${id}-d`;

	const input = createElement("input", {
		attributes: {
			id,
			form: detachedFormId,
			type: "text",
			name: "email_confirm",
			value: "",
			tabindex: -1,
			autocomplete: "off",
			"aria-hidden": "true",
		},
	});

	// Input is nested inside the label (implicit association) instead of
	// htmlFor-linked — biome's noLabelWithoutControl rule only recognises
	// the descendant form of association at static-analysis time.
	const label = createElement("label", {
		text: decodeBase64Utf8(initialProps.encodedQuestion),
		children: [input],
	});

	const bait = createElement("div", {
		style: offscreenStyle,
		attributes: { "aria-hidden": "true" },
		children: [label],
	});

	// The anchor stays in the widget's own tree purely so we can walk out of the
	// shadow root to find the dapp's form; the bait itself is portalled.
	const anchor = createElement("span", {
		style: { display: "none" },
		attributes: { "aria-hidden": "true" },
	});
	container.appendChild(anchor);

	const portalTarget = findAncestorForm(anchor) ?? document.body;
	// The anchor has served its purpose; drop it so the widget's own tree looks
	// the same as it did when React unmounted the transient anchor on portal.
	anchor.parentNode?.removeChild(anchor);
	portalTarget.appendChild(bait);

	return {
		update: (nextProps: HoneypotProps) => {
			const question = decodeBase64Utf8(nextProps.encodedQuestion);
			if (label.firstChild instanceof Text) {
				label.firstChild.textContent = question;
			}
		},
		getValue: () => input.value || undefined,
		destroy: () => {
			bait.parentNode?.removeChild(bait);
			anchor.parentNode?.removeChild(anchor);
		},
	};
};
