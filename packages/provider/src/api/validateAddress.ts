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

import { type ErrorCode, ProsopoError } from "@prosopo/common";
import { validateAddress } from "@prosopo/util-crypto";

export const validateSiteKey = (siteKey: string) =>
	validateAddr(siteKey, "SITE_KEY_INVALID");

export const validateAddr = (
	address: string,
	code: ErrorCode = "INVALID_REQUEST",
) => {
	let valid = false;
	let cause: unknown;
	try {
		valid = validateAddress(address, false, 42);
	} catch (err) {
		cause = err;
	}
	if (!valid)
		throw new ProsopoError({
			code,
			errorSite: "PROV-35",
			cause,
			context: { siteKey: address },
		});
};
