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

export const DEFAULT_FRICTIONLESS_THRESHOLD = 0.5;

/**
 * Image rounds served when the detector payload could not be decrypted.
 *
 * Deliberately short. A failed decrypt means we have no measurement of the
 * client — most often a benign cause (the session's Redis bundle binding
 * expired, the bundle left the pool on a rotation, a stale cached widget) — so
 * this is a "prove you're human quickly", not a punishment. Capped by the
 * sitekey's `imageMaxRounds` at the call site.
 */
export const DECRYPTION_FAILED_IMAGE_ROUNDS = 3;

export const getRoundsFromSimScore = (simScore: number): number => {
	if (simScore >= 0.9) return 0;
	if (simScore >= 0.8) return 3;
	if (simScore >= 0.7) return 4;
	if (simScore >= 0.6) return 6;
	if (simScore >= 0.5) return 7;
	return 8;
};
