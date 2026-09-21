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

// The layout plugin leaves empty placeholders that the other plugins fill, so
// each plugin still works on its own when the layout is not there.

export type DemoSlot = "placement" | "toolbar" | "events" | "code";

export const slotMarkup = (slot: DemoSlot): string =>
	`<div data-demo-slot="${slot}"></div>`;

export const fillSlot = (
	html: string,
	slot: DemoSlot,
	content: string,
): string | undefined => {
	const marker = slotMarkup(slot);
	return html.includes(marker)
		? html.replace(marker, () => content)
		: undefined;
};
