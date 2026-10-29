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

import type { IPInfoResponse, ScoreComponents } from "@prosopo/types";

export type IpDetectorRiskOutcome = {
	score: number;
	scoreComponents: ScoreComponents;
	detectorRisk: number | undefined;
};

export const detectorRiskOf = (
	ipInfo: IPInfoResponse | undefined,
): number | undefined => (ipInfo?.isValid ? ipInfo.detectorRisk : undefined);

// The addition is capped at 1, but a score already above 1 from penalties is
// never pulled down to it.
export const applyIpDetectorRisk = (
	score: number,
	scoreComponents: ScoreComponents,
	ipInfo: IPInfoResponse | undefined,
	weight: number,
): IpDetectorRiskOutcome => {
	const detectorRisk = detectorRiskOf(ipInfo);
	if (!(weight > 0) || detectorRisk === undefined) {
		return { score, scoreComponents, detectorRisk };
	}
	const effectiveScore = Math.max(
		score,
		Math.min(1, score + weight * detectorRisk),
	);
	const added = effectiveScore - score;
	if (added <= 0) {
		return { score, scoreComponents, detectorRisk };
	}
	return {
		score: effectiveScore,
		scoreComponents: { ...scoreComponents, ipDetectorRisk: added },
		detectorRisk,
	};
};
