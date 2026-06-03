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

import type { ClientRecord } from "@prosopo/types-database";
import type { Response } from "express";
import { encodeHoneypotQuestion } from "../../../utils/honeypot/encoders.js";
import { getRandomPhrase } from "../../../utils/honeypot/phraseBank.js";

// Header carrying the encoded honeypot question. Deliberately named to look
// like generic observability metadata; bots that filter "hp"-shaped fields
// on the JSON body won't grep this. The browser only exposes it to the
// widget because it's whitelisted in `Access-Control-Expose-Headers`.
export const HONEYPOT_HEADER = "x-prosopo-meta";

/**
 * Sets the honeypot header on the response when the client has honeypot
 * enabled. Header value is base64-wrapped morse/semaphore so an inspector
 * doesn't immediately recognise the encoding shape. Falls back to a random
 * phrase from the bank when no custom question is configured; no-op when
 * the bank is empty or honeypot is disabled.
 */
export const attachHoneypot = (
	res: Response,
	clientRecord: Pick<ClientRecord, "settings">,
): void => {
	const cfg = clientRecord.settings?.honeypot;
	if (!cfg?.enabled) return;
	const question = cfg.question ?? getRandomPhrase();
	if (!question) return;
	res.setHeader(
		HONEYPOT_HEADER,
		encodeHoneypotQuestion(question, cfg.encodingType),
	);
};
