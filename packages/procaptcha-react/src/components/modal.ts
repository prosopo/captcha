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

import { applyStyles, createElement } from "@prosopo/procaptcha-common";
import type { Component } from "@prosopo/procaptcha-common";

export interface ModalProps {
	show: boolean;
}

export interface ModalComponent extends Component<ModalProps> {
	/** Where the challenge UI mounts. Lives in light DOM, under document.body. */
	readonly content: HTMLElement;
}

/**
 * Full-viewport backdrop appended straight to `document.body`, replacing the
 * React portal that used to do the same.
 *
 * The inner element carries `prosopo-modalInner` and no styling of its own.
 * That matches what shipped: the Emotion rules for it were emitted into the
 * widget's Emotion cache, whose container is the checkbox shadow root, so they
 * never applied to an element portalled out into light DOM. Centering has
 * always come from the outer flex box below.
 */
export const mountModal = (initialProps: ModalProps): ModalComponent => {
	const content = createElement("div", { className: "prosopo-modalInner" });

	const outer = createElement("div", {
		className: "prosopo-modalOuter",
		children: [content],
	});

	const render = (props: ModalProps) => {
		applyStyles(outer, {
			position: "fixed",
			zIndex: 2147483646,
			inset: 0,
			display: props.show ? "flex" : "none",
			alignItems: "center",
			justifyContent: "center",
			minHeight: "100vh",
		});
	};

	render(initialProps);
	document.body.appendChild(outer);

	return {
		content,
		update: render,
		destroy: () => {
			outer.parentNode?.removeChild(outer);
		},
	};
};
