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

import { type TranslateFn, isTargetKey } from "@prosopo/locale";
import type { Logger } from "@prosopo/logger";

/**
 * The image label to show the user, in their language. A dataset can carry a
 * label the catalogue has no entry for yet; i18next would then return the raw
 * `TARGET.<label>` key, so the English label is shown instead and the gap is
 * logged for someone to add the translation.
 */
export const localiseTarget = (
	t: TranslateFn,
	target: string,
	logger: Logger,
): string => {
	if (isTargetKey(target)) {
		return t(`TARGET.${target}`);
	}
	logger.warn(() => ({
		msg: "Captcha target has no translation key",
		data: { target },
	}));
	return target;
};
