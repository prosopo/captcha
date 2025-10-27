// Copyright 2021-2025 Prosopo (UK) Ltd.
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
import type {
	FrictionlessTokenId,
	IProviderDatabase,
	ScoreComponents,
} from "@prosopo/types-database";

export const computeFrictionlessScore = (
	scoreComponents:
		| {
				[key: string]: number;
		  }
		| ScoreComponents,
): number => {
	return Number(
		Math.min(
			1,
			Object.values(scoreComponents)
				.filter((x) => x !== undefined)
				.reduce((acc, val) => acc + val, 0),
		).toFixed(2),
	);
};

export const timestampDecayFunction = (timestamp: number): number => {
	const max = new Date().getTime();
	if (max - timestamp > 3600000) {
		return 12;
	}
	const min = 1000;
	const age = max - timestamp;
	const decay = Math.log10(2000) / max;
	const bigScore = max * (1 - (1 - Math.exp(decay * age) ** 24));

	return Math.max(
		2,
		Math.round(
			((Math.log(bigScore) - Math.log(min)) / (Math.log(max) - Math.log(min))) *
				2.5,
		),
	);
};
