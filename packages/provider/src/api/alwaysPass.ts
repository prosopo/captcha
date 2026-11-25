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
import type { CaptchaType } from "@prosopo/types";
import type { ClientRecord } from "@prosopo/types-database";
import type { Response } from "express";
import type { VerifySource } from "./metrics.js";

// Call only once the site key is trusted: after the dapp signature on verify,
// or on submit, where the key is the one the challenge was issued for.
export const forceAlwaysPass = ({
	clientRecord,
	logger,
	stage,
	captchaType,
	realVerdict,
}: {
	clientRecord: Pick<ClientRecord, "account" | "settings">;
	logger: Logger;
	stage: "submit" | "verify";
	captchaType: CaptchaType;
	realVerdict: boolean;
}): boolean => {
	if (clientRecord.settings?.alwaysPass !== true) return false;
	logger.info(() => ({
		msg: "alwaysPass site key - forcing approval",
		data: {
			siteKey: clientRecord.account,
			stage,
			captchaType,
			realVerdict,
		},
	}));
	return true;
};

export const markAlwaysPassVerify = (res: Response): void => {
	const source: VerifySource = "always_pass";
	res.locals.verifySource = source;
};
