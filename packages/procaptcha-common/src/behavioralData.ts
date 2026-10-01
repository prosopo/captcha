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

import type { BehavioralData, FrictionlessState } from "@prosopo/types";

export type BehavioralDataSource = Pick<
	FrictionlessState,
	| "behaviorCollector1"
	| "behaviorCollector2"
	| "behaviorCollector3"
	| "behaviorCollector4"
	| "deviceCapability"
	| "encryptBehavioralData"
	| "packBehavioralData"
>;

/**
 * Packs and encrypts whatever the frictionless behaviour collectors gathered,
 * for attaching to a solution. Undefined when there is nothing to send or
 * encryption fails: behavioural data must never stop a solve going through.
 */
export const encryptBehavioralDataForSubmit = async (
	frictionlessState: BehavioralDataSource | undefined,
): Promise<string | undefined> => {
	if (
		!frictionlessState?.encryptBehavioralData ||
		!(
			frictionlessState.behaviorCollector1 ||
			frictionlessState.behaviorCollector2 ||
			frictionlessState.behaviorCollector3 ||
			frictionlessState.behaviorCollector4
		)
	) {
		return undefined;
	}
	try {
		const behavioralData: BehavioralData = {
			collector1: frictionlessState.behaviorCollector1?.getData() || [],
			collector2: frictionlessState.behaviorCollector2?.getData() || [],
			collector3: frictionlessState.behaviorCollector3?.getData() || [],
			collector4: frictionlessState.behaviorCollector4?.getData() || [],
			deviceCapability: frictionlessState.deviceCapability || "unknown",
		};
		const dataToEncrypt = frictionlessState.packBehavioralData
			? frictionlessState.packBehavioralData(behavioralData)
			: behavioralData;
		return await frictionlessState.encryptBehavioralData(
			JSON.stringify(dataToEncrypt),
		);
	} catch {
		return undefined;
	}
};
