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

import type { SolveDeviceSignals } from "@prosopo/types";
import type { FrictionlessManager } from "../../../tasks/frictionless/frictionlessTasks.js";
import { solveDeviceSignals } from "../../../utils/devicePlatform.js";

/**
 * The device readings the widget gathered before asking for a challenge, so
 * the first challenge can be sized for the device rather than waiting for a
 * solve to report it. Read with the same bundle and format as at submit.
 * Anything that cannot be read leaves the session without readings.
 */
export const decryptIncomingSolveDevice = async (
	manager: Pick<
		FrictionlessManager,
		"resolveBundleByDetectorSession" | "decryptBehavioralData"
	>,
	encrypted: string | undefined,
	detectorSessionId: string | undefined,
): Promise<SolveDeviceSignals | undefined> => {
	if (!encrypted) return undefined;
	const bundle =
		await manager.resolveBundleByDetectorSession(detectorSessionId);
	const decrypted = await manager.decryptBehavioralData(encrypted, bundle);
	if (!decrypted) return undefined;
	return solveDeviceSignals({
		d: decrypted.deviceCapability,
		c2: decrypted.collector2,
	});
};
