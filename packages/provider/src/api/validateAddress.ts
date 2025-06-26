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

import { type Logger, ProsopoApiError } from "@prosopo/common";
import type { TranslationKey } from "@prosopo/locale";
import { validateAddress } from "@prosopo/util-crypto";

export const validateSiteKey = (siteKey: string, logger?: Logger) => {
	return validateAddr(siteKey, "API.INVALID_SITE_KEY", logger);
};

export const validateAddr = (
	address: string,
	translationKey: TranslationKey = "CONTRACT.INVALID_ADDRESS",
	logger?: Logger,
) => {
	if (!validateAddress(address, false, 42)) {
		throw new ProsopoApiError(translationKey, {
			context: { code: 400, siteKey: address },
			logger,
		});
	}
};
