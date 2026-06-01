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

import type { Logger } from "@prosopo/logger";
import { TestSiteKeyMode, getTestSiteKeyMode } from "@prosopo/types";

// True when the site key is one of the reserved CI test keys. Used by the
// challenge issuer and domain middleware, which only need to know that a key is
// reserved (both PASS and FAIL keys serve an invisible PoW challenge) rather
// than its forced verdict.
export const isReservedTestSiteKey = (siteKey: string): boolean =>
	getTestSiteKeyMode(siteKey) !== null;

// Resolve the forced `verified` value for a reserved CI test site key, or null
// for any normal site key. Honoured before the registered-key and signature
// checks so the keys work in every environment with no DB record and no secret.
// See @prosopo/types getTestSiteKeyMode for the security rationale.
export const resolveTestSiteKeyVerdict = (
	siteKey: string,
	logger?: Logger,
): boolean | null => {
	const mode: TestSiteKeyMode | null = getTestSiteKeyMode(siteKey);
	if (mode === null) {
		return null;
	}
	logger?.warn(() => ({
		msg: "Reserved TEST site key - forcing deterministic captcha verdict",
		data: { siteKey, mode },
	}));
	return mode === TestSiteKeyMode.Pass;
};
