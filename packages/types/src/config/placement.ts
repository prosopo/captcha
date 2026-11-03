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

/** Where a challenge opens. Distinct from `Mode`, which is whether the widget is visible. */
export enum PlacementEnum {
	/** Centred over the page. The default, and the only behaviour before this option existed. */
	popup = "popup",
	/** Anchored to the widget with the page usable behind it. */
	float = "float",
}

export type PlacementType = PlacementEnum;

export const Placements: readonly PlacementType[] = [
	PlacementEnum.popup,
	PlacementEnum.float,
];

// A plain guard rather than a zod enum: the widget reads this before it
// renders, and a zod schema for two strings would put the whole of zod on that
// path.
export const isPlacement = (value: string): value is PlacementType =>
	(Placements as readonly string[]).includes(value);

/** An invisible widget has nothing to anchor to, so float resolves to popup. */
export const resolvePlacement = (
	placement: PlacementType | undefined,
	isInvisibleWidget: boolean,
): PlacementType =>
	placement === PlacementEnum.float && !isInvisibleWidget
		? PlacementEnum.float
		: PlacementEnum.popup;
