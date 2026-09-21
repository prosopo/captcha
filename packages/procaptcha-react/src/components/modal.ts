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
	type ChallengeSurfaceComponent,
	applyStyles,
	createElement,
	mountChallengeSurface,
} from "@prosopo/procaptcha-common";
import type { Component } from "@prosopo/procaptcha-common";
import type { PlacementType } from "@prosopo/types";

export interface ModalProps {
	show: boolean;
	placement?: PlacementType;
	anchor?: HTMLElement | null;
	onDismiss?: () => void;
	dialogLabel?: string;
}

export interface ModalComponent extends Component<ModalProps> {
	/** Where the challenge UI mounts. Lives in light DOM, under document.body. */
	readonly content: HTMLElement;
}

/**
 * The image captcha's dialog frame; positioning lives in `ChallengeSurface`.
 */
export const mountModal = (initialProps: ModalProps): ModalComponent => {
	const inner = createElement("div", { className: "prosopo-modalInner" });

	applyStyles(inner, {
		maxWidth: "500px",
		maxHeight: "100%",
		backgroundColor: "transparent",
		border: "none",
		borderRadius: "28px",
		alignSelf: "center",
		boxSizing: "border-box",
	});

	const surfaceProps = (props: ModalProps) => ({
		show: props.show,
		placement: props.placement,
		anchor: props.anchor,
		onDismiss: props.onDismiss,
		scrim: "none" as const,
		className: "prosopo-modalOuter",
		dialogLabel: props.dialogLabel,
	});

	const surface: ChallengeSurfaceComponent = mountChallengeSurface(
		surfaceProps(initialProps),
	);
	surface.content.appendChild(inner);

	return {
		content: inner,
		update: (props: ModalProps) => surface.update(surfaceProps(props)),
		destroy: () => surface.destroy(),
	};
};
