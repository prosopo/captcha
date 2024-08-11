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
// Taken from @polkadot/apps/packages/react-hooks/src/useBlockInterval.ts and
// modified to work in nodeJS environment

// Copyright 2017-2023 @polkadot/react-hooks authors & contributors
// SPDX-License-Identifier: Apache-2.0

// Some chains incorrectly use these, i.e. it is set to values such as 0 or even 2
// Use a low minimum validity threshold to check these against
import type { ApiPromise } from "@polkadot/api/promise/Api";
import { BN, BN_THOUSAND, BN_TWO, bnMin } from "@polkadot/util/bn";

export const A_DAY = new BN(24 * 60 * 60 * 1000);
const THRESHOLD = BN_THOUSAND.div(BN_TWO);
const DEFAULT_TIME = new BN(6_000);

export function calcInterval(api: ApiPromise): BN {
	return bnMin(
		A_DAY,
		// Babe, e.g. Relay chains (Substrate defaults)
		api.consts
			? api.consts.babe?.expectedBlockTime ||
					// POW, eg. Kulupu
					api.consts.difficulty?.targetBlockTime ||
					// Subspace
					api.consts.subspace?.expectedBlockTime ||
					// Check against threshold to determine value validity
					(api.consts.timestamp?.minimumPeriod.gte(THRESHOLD)
						? // Default minimum period config
							api.consts.timestamp.minimumPeriod.mul(BN_TWO)
						: api.query.parachainSystem
							? // default guess for a parachain
								DEFAULT_TIME.mul(BN_TWO)
							: // default guess for others
								DEFAULT_TIME)
			: DEFAULT_TIME,
	);
}
