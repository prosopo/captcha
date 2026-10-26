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

import { MAX_WIDGET_SLOT } from "@prosopo/types";

// The provider hands every /frictionless call from the same user, IP and site
// key the same live session, and a session is used up by the first challenge
// it issues. Without a slot, a second widget on the page is handed a session
// the first one has already spent. Slots are the lowest free index rather than
// random so a reloaded page asks for the same slots and still reuses its
// sessions. Widgets past the cap share the last slot, as every widget did
// before slots existed.
const claimedSlots = new Map<string, Set<number>>();

export const claimWidgetSlot = (siteKey: string): number => {
	const claimed = claimedSlots.get(siteKey) ?? new Set<number>();
	claimedSlots.set(siteKey, claimed);
	for (let slot = 0; slot < MAX_WIDGET_SLOT; slot++) {
		if (!claimed.has(slot)) {
			claimed.add(slot);
			return slot;
		}
	}
	return MAX_WIDGET_SLOT;
};

export const releaseWidgetSlot = (siteKey: string, slot: number): void => {
	const claimed = claimedSlots.get(siteKey);
	if (!claimed) return;
	claimed.delete(slot);
	if (claimed.size === 0) claimedSlots.delete(siteKey);
};
