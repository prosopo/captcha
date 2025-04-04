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

import getBotScoreFromPayload from "./decodePayload.js";

export const getBotScore = async (
	payload: string,
	privateKeyString?: string,
) => {
	const result = (await getBotScoreFromPayload(payload, privateKeyString)) as {
		score: number;
		timestamp: number;
	};
	const baseBotScore: number = result.score;
	const timestamp: number = result.timestamp;

	if (baseBotScore === undefined) {
		return { baseBotScore: 1, timestamp: 0 };
	}

	return { baseBotScore, timestamp };
};
