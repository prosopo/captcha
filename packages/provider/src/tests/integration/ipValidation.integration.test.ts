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

import { datasetWithSolutionHashes } from "@prosopo/datasets";
import {
	generateMnemonic,
	getDefaultProviders,
	getPair,
} from "@prosopo/keyring";
import {
	ApiParams,
	type CaptchaRequestBodyType,
	CaptchaType,
	ClientApiPaths,
	type GetFrictionlessCaptchaChallengeRequestBodyOutput,
	type GetPowCaptchaChallengeRequestBodyTypeOutput,
	type KeyringPair,
} from "@prosopo/types";
import { at } from "@prosopo/util";
import { randomAsHex } from "@prosopo/util-crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { registerSiteKey } from "./registerSitekey.js";

const baseUrl = "http://localhost:9229";
const solutions = datasetWithSolutionHashes;

describe("IP Validation Integration Tests", () => {
	let siteKeyPair: KeyringPair;
	let siteKeyMnemonic: string;
	let siteKey: string;
	let userPair: KeyringPair;
	let userMnemonic: string;
	let userId: string;
	const adminPair = at(getDefaultProviders(), 0).pair;

	beforeEach(async () => {
		// Create a new site key to avoid conflicts with other tests
		[siteKeyMnemonic, siteKey] = await generateMnemonic();
		siteKeyPair = getPair(siteKeyMnemonic);
		await registerSiteKey(siteKey, CaptchaType.frictionless, adminPair);
		[userMnemonic, userId] = await generateMnemonic();
		userPair = getPair(userMnemonic);
	});

	describe("Frictionless captcha with IP validation", () => {
		it("should allow image captcha request from same IP after frictionless flow", async () => {
			const origin = "http://localhost";
			const initialIP = "127.0.0.1";

			// Step 1: Get frictionless captcha
			const getFrictionlessCaptchaUrl = `${baseUrl}${ClientApiPaths.GetFrictionlessCaptchaChallenge}`;
			const getFrictionlessCaptchaBody: GetFrictionlessCaptchaChallengeRequestBodyOutput =
				{
					[ApiParams.dapp]: siteKey,
					[ApiParams.token]: randomAsHex(16),
					[ApiParams.user]: userId,
				};

			const responseFrictionless = await fetch(getFrictionlessCaptchaUrl, {
				method: "POST",
				body: JSON.stringify(getFrictionlessCaptchaBody),
				headers: {
					"Content-Type": "application/json",
					Origin: origin,
					"Prosopo-Site-Key": siteKey,
					"Prosopo-User": userId,
					"User-Agent": randomAsHex(16),
					"X-Forwarded-For": initialIP,
				},
			});

			expect(responseFrictionless.status).toBe(200);
			const dataFrictionless = await responseFrictionless.json();
			expect(dataFrictionless).toHaveProperty("sessionId");

			// Step 2: Request image captcha from same IP
			const getImageCaptchaURL = `${baseUrl}${ClientApiPaths.GetImageCaptchaChallenge}`;
			const getImgCaptchaBody: CaptchaRequestBodyType = {
				[ApiParams.dapp]: siteKey,
				[ApiParams.user]: userId,
				[ApiParams.datasetId]: solutions.datasetId,
				[ApiParams.sessionId]: dataFrictionless.sessionId,
			};

			const responseImage = await fetch(getImageCaptchaURL, {
				method: "POST",
				body: JSON.stringify(getImgCaptchaBody),
				headers: {
					"Content-Type": "application/json",
					Origin: origin,
					"Prosopo-Site-Key": siteKey,
					"Prosopo-User": userId,
					"X-Forwarded-For": initialIP, // Same IP
				},
			});

			expect(responseImage.status).toBe(200);
			const dataImage = await responseImage.json();
			expect(dataImage).toHaveProperty("captchas");
		});
	});
});
