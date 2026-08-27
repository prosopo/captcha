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

import { ChallengeSurface } from "@prosopo/procaptcha-common";
import type { PlacementType } from "@prosopo/types";
import React from "react";

type ModalProps = {
	show: boolean;
	children: React.ReactNode;
	placement?: PlacementType;
	anchor?: HTMLElement | null;
	onDismiss?: () => void;
};

/**
 * The image captcha's dialog frame.
 *
 * The scrim, z-index and positioning it used to own now live in
 * `ChallengeSurface`, shared with the puzzle overlay, so a placement is
 * implemented once rather than per challenge type. What is left here is the
 * frame itself: the width cap and corner radius that make it a dialog.
 *
 * `popupIosLift` preserves the iOS-only upward shift this modal has always
 * applied — Safari's bottom bar otherwise overlaps a centred dialog.
 */
const ModalComponent = React.memo((props: ModalProps) => {
	const { show, children, placement, anchor, onDismiss } = props;

	return (
		<ChallengeSurface
			show={show}
			placement={placement}
			anchor={anchor}
			onDismiss={onDismiss}
			scrim="none"
			popupIosLift
			className="prosopo-modalOuter"
		>
			<div
				className="prosopo-modalInner"
				style={{
					maxWidth: "500px",
					backgroundColor: "transparent",
					border: "none",
					borderRadius: "28px",
					alignSelf: "center",
					// Shadowless — the dialog separates from the page via its own
					// surface role, not a drop shadow.
					boxSizing: "border-box",
				}}
			>
				{children}
			</div>
		</ChallengeSurface>
	);
});

ModalComponent.displayName = "ModalComponent";

export default ModalComponent;
