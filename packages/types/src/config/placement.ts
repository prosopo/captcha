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

/** Where a challenge opens. Distinct from `Mode`, which is whether the widget is visible. */
export enum PlacementEnum {
	/** Centred over the page. The default, and the only behaviour before this option existed. */
	popup = "popup",
	/** Anchored to the widget with the page usable behind it. */
	float = "float",
}

export const Placement = zEnum([PlacementEnum.popup, PlacementEnum.float]);

export type PlacementType = zInfer<typeof Placement>;

/** An invisible widget has nothing to anchor to, so float resolves to popup. */
export const resolvePlacement = (
	placement: PlacementType | undefined,
	isInvisibleWidget: boolean,
): PlacementType =>
	placement === PlacementEnum.float && !isInvisibleWidget
		? PlacementEnum.float
		: PlacementEnum.popup;
