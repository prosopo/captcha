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
import { number, object } from "zod";

export const PENALTY_OLD_TIMESTAMP_DEFAULT = 0.2;
export const PENALTY_ACCESS_RULE_DEFAULT = 0.5;
export const FrictionlessPenalties = object({
	PENALTY_OLD_TIMESTAMP: number()
		.positive()
		.optional()
		.default(PENALTY_OLD_TIMESTAMP_DEFAULT),
	PENALTY_ACCESS_RULE: number()
		.positive()
		.optional()
		.default(PENALTY_ACCESS_RULE_DEFAULT),
});
