// Copyright 2021-2024 Prosopo (UK) Ltd.
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
import type { ProsopoConfigOutput } from "@prosopo/types";

export const checkLangRules = (
	config: ProsopoConfigOutput,
	acceptLanguage: string,
): number => {
	const lConfig = config.lRules;
	let lScore = 0;
	if (lConfig) {
		const languages = acceptLanguage
			.split(",")
			.map((lang) => lang.trim().split(";")[0]);

		for (const lang of languages) {
			if (lang && lConfig[lang]) {
				lScore += lConfig[lang];
			}
		}
	}
	return lScore;
};
