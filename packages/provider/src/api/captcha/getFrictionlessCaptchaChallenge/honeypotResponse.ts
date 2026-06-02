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

import { ApiParams, type GetFrictionlessCaptchaResponse } from "@prosopo/types";
import type { ClientRecord } from "@prosopo/types-database";
import { encodeHoneypotQuestion } from "../../../utils/honeypot/encoders.js";
import { getRandomPhrase } from "../../../utils/honeypot/phraseBank.js";

/**
 * Mutates `response` to include the encoded honeypot question (`hp`) when
 * the client's settings have honeypot enabled. If no custom question is
 * configured, falls back to a random phrase from the bank; if the bank is
 * empty, returns the response unchanged.
 */
export const attachHoneypot = (
	response: GetFrictionlessCaptchaResponse,
	clientRecord: Pick<ClientRecord, "settings">,
): GetFrictionlessCaptchaResponse => {
	const cfg = clientRecord.settings?.honeypot;
	if (!cfg?.enabled) return response;
	const question = cfg.question ?? getRandomPhrase();
	if (!question) return response;
	response[ApiParams.hp] = encodeHoneypotQuestion(question, cfg.encodingType);
	return response;
};
