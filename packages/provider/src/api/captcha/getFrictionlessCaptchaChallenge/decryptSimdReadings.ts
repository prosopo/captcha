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

import type { SimdReadings } from "@prosopo/types";
import type { FrictionlessManager } from "../../../tasks/frictionless/frictionlessTasks.js";

export const decryptIncomingSimdReadings = async (
	manager: FrictionlessManager,
	encrypted: string | undefined,
	detectorSessionId: string | undefined,
): Promise<SimdReadings | undefined> => {
	if (!encrypted) return undefined;
	// The detector lives only in provider pool bundles; resolve this session's
	// bundle from its detectorSessionId binding and decrypt with it (no key pool).
	const bundle =
		await manager.resolveBundleByDetectorSession(detectorSessionId);
	const decrypted = await manager.decryptSimdReadings(encrypted, bundle);
	if (!decrypted) return undefined;
	// Drop the inner replay-protection timestamp; not part of the persisted readings.
	const { timestamp: _ignored, ...readings } = decrypted;
	return readings;
};
