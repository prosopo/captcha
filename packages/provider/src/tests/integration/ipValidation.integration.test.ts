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
	type KeyringPair,
} from "@prosopo/types";
import { at } from "@prosopo/util";
import { randomAsHex } from "@prosopo/util-crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { registerSiteKey } from "./registerSitekey.js";
import { testFetch } from "./testUtils.js";

// Use environment variables from config - matches server config in prosopo.config.ts
const apiBaseUrl = process.env.PROSOPO_API_BASE_URL || "https://localhost";
const apiPort = process.env.PROSOPO_API_PORT || "9229";
const baseUrl = `${apiBaseUrl}:${apiPort}`;
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
			const origin = "https://localhost";
			const initialIP = "127.0.0.1";

			// Step 1: Get frictionless captcha
			const getFrictionlessCaptchaUrl = `${baseUrl}${ClientApiPaths.GetFrictionlessCaptchaChallenge}`;
			const getFrictionlessCaptchaBody: GetFrictionlessCaptchaChallengeRequestBodyOutput =
				{
					[ApiParams.dapp]: siteKey,
					[ApiParams.token]: randomAsHex(16),
					[ApiParams.user]: userId,
					[ApiParams.headHash]: randomAsHex(16),
				};

			const responseFrictionless = await testFetch(getFrictionlessCaptchaUrl, {
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
			console.log("Frictionless response:", dataFrictionless);
			expect(dataFrictionless).toHaveProperty("sessionId");
			expect(dataFrictionless).toHaveProperty("captchaType");

			// The test expects an image captcha to be returned from the frictionless flow
			// because the timestamp will be 0 (very old) when decryption fails
			expect(dataFrictionless.captchaType).toBe(CaptchaType.image);

			// Step 2: Request image captcha from same IP
			const getImageCaptchaURL = `${baseUrl}${ClientApiPaths.GetImageCaptchaChallenge}`;
			const getImgCaptchaBody: CaptchaRequestBodyType = {
				[ApiParams.dapp]: siteKey,
				[ApiParams.user]: userId,
				[ApiParams.datasetId]: solutions.datasetId,
				[ApiParams.sessionId]: dataFrictionless.sessionId,
			};

			const responseImage = await testFetch(getImageCaptchaURL, {
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
