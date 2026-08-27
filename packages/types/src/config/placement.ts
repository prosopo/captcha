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

import type { infer as zInfer } from "zod";
import { enum as zEnum } from "zod";

/**
 * Where a challenge opens.
 *
 * Distinct from `Mode`, which says whether the *widget* is visible. The two
 * combine: an invisible widget still has to put its challenge somewhere, and a
 * visible one can present its challenge either way.
 *
 * `popup` is the default because it is what every challenge did before this
 * option existed — adding a placement must not move any existing customer's
 * widget.
 */
export enum PlacementEnum {
	/** Centred over the page, above a scrim. */
	popup = "popup",
	/**
	 * Anchored to the widget, page still usable behind it. Requires something
	 * to anchor to, so an invisible widget falls back to `popup`.
	 */
	float = "float",
}

export const Placement = zEnum([PlacementEnum.popup, PlacementEnum.float]);

export type PlacementType = zInfer<typeof Placement>;

/**
 * Float needs an on-page anchor, and an invisible widget renders no checkbox to
 * anchor to. Resolving that here means every widget agrees on the outcome
 * instead of each one deciding, and the demo can show the same result.
 */
export const resolvePlacement = (
	placement: PlacementType | undefined,
	isInvisibleWidget: boolean,
): PlacementType =>
	placement === PlacementEnum.float && !isInvisibleWidget
		? PlacementEnum.float
		: PlacementEnum.popup;
