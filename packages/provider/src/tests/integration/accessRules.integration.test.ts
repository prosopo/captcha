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
import { generateMnemonic, getPair } from "@prosopo/keyring";
import {
	ApiParams,
	type CaptchaRequestBodyType,
	CaptchaType,
	ClientApiPaths,
	type KeyringPair,
} from "@prosopo/types";
import { randomAsHex } from "@prosopo/util-crypto";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { registerSiteKey } from "./registerSitekey.js";
import {
	removeAllUserAccessPolicies,
	userAccessPolicy,
} from "./userAccessPolicy.js";

const baseUrl = "http://localhost:9229";
const solutions = datasetWithSolutionHashes;

describe("Access Rules Integration Tests", () => {
	const adminPair: KeyringPair = getPair(
		"puppy cream effort carbon despair leg pyramid cotton endorse immense drill peasant",
	);
	let siteKeyPair: KeyringPair;
	let siteKeyMnemonic: string;
	let siteKey: string;
	let userPair: KeyringPair;
	let userMnemonic: string;
	let userId: string;

	beforeEach(async () => {
		const responses = await removeAllUserAccessPolicies(adminPair);
		expect(responses.every((response) => response.status === "SUCCESS")).toBe(
			true,
		);
		// Create a new site key to avoid conflicts with other tests
		[siteKeyMnemonic, siteKey] = await generateMnemonic();
		siteKeyPair = getPair(siteKeyMnemonic);
		await registerSiteKey(siteKey, CaptchaType.image);
		[userMnemonic, userId] = await generateMnemonic();
		userPair = getPair(userMnemonic);
	});

	it("should pass", async () => {
		expect(true).toBe(true);
	});

	it("should return a 401 for a blocked user", async () => {
		await userAccessPolicy(adminPair, {
			block: true, // block
			userId,
			description: "Blocked user test",
		});
		const origin = "http://localhost";
		const getImageCaptchaURL = `${baseUrl}${ClientApiPaths.GetImageCaptchaChallenge}`;
		const getImgCaptchaBody: CaptchaRequestBodyType = {
			[ApiParams.dapp]: siteKey,
			[ApiParams.user]: userId,
			[ApiParams.datasetId]: solutions.datasetId,
		};

		const response = await fetch(getImageCaptchaURL, {
			method: "POST",
			body: JSON.stringify(getImgCaptchaBody),
			headers: {
				"Content-Type": "application/json",
				Origin: origin,
				"Prosopo-Site-Key": siteKey,
				"Prosopo-User": userId,
				"User-Agent": randomAsHex(16),
			},
		});

		expect(response.status).toBe(401);
	});
	it("should return a 200 for a non-blocked user", async () => {
		const origin = "http://localhost";
		const getImageCaptchaURL = `${baseUrl}${ClientApiPaths.GetImageCaptchaChallenge}`;
		const getImgCaptchaBody: CaptchaRequestBodyType = {
			[ApiParams.dapp]: siteKey,
			[ApiParams.user]: userId,
			[ApiParams.datasetId]: solutions.datasetId,
		};

		console.log("userId", userId);
		const response = await fetch(getImageCaptchaURL, {
			method: "POST",
			body: JSON.stringify(getImgCaptchaBody),
			headers: {
				"Content-Type": "application/json",
				Origin: origin,
				"Prosopo-Site-Key": siteKey,
				"Prosopo-User": userId,
				"User-Agent": randomAsHex(16),
			},
		});

		expect(response.status).toBe(200);
	});
	it("should return a 200 when a rule expires immediately", async () => {
		await userAccessPolicy(adminPair, {
			block: true, // block
			userId,
			description: "Blocked user test",
			expiration: 1, // expire immediately
		});
		const origin = "http://localhost";
		const getImageCaptchaURL = `${baseUrl}${ClientApiPaths.GetImageCaptchaChallenge}`;
		const getImgCaptchaBody: CaptchaRequestBodyType = {
			[ApiParams.dapp]: siteKey,
			[ApiParams.user]: userId,
			[ApiParams.datasetId]: solutions.datasetId,
		};

		const response = await fetch(getImageCaptchaURL, {
			method: "POST",
			body: JSON.stringify(getImgCaptchaBody),
			headers: {
				"Content-Type": "application/json",
				Origin: origin,
				"Prosopo-Site-Key": siteKey,
				"Prosopo-User": userId,
				"User-Agent": randomAsHex(16),
			},
		});

		expect(response.status).toBe(200);
	});
	it("should return a 401 when a user agent is blocked", async () => {
		const badUserAgent = "bad-user-agent";
		await userAccessPolicy(adminPair, {
			block: true, // block
			userAgent: badUserAgent,
			description: "Blocked user agent test",
		});
		const origin = "http://localhost";
		const getImageCaptchaURL = `${baseUrl}${ClientApiPaths.GetImageCaptchaChallenge}`;
		const getImgCaptchaBody: CaptchaRequestBodyType = {
			[ApiParams.dapp]: siteKey,
			[ApiParams.user]: userId,
			[ApiParams.datasetId]: solutions.datasetId,
		};

		const response = await fetch(getImageCaptchaURL, {
			method: "POST",
			body: JSON.stringify(getImgCaptchaBody),
			headers: {
				"Content-Type": "application/json",
				Origin: origin,
				"Prosopo-Site-Key": siteKey,
				"Prosopo-User": userId,
				"User-Agent": badUserAgent,
			},
		});

		expect(response.status).toBe(401);
	});
	it("should return 200 when user is blocked for a different client but not the calling client", async () => {
		const [_otherSiteKeyMnemonic, otherSiteKey] = await generateMnemonic();
		await registerSiteKey(otherSiteKey, CaptchaType.image);

		console.log(`Blocking user ${userId} for site key: ${otherSiteKey}`);
		await userAccessPolicy(adminPair, {
			block: true, // block
			userId: userId,
			client: otherSiteKey,
			description: "Blocked user for other site key test",
		});
		const origin = "http://localhost";
		const getImageCaptchaURL = `${baseUrl}${ClientApiPaths.GetImageCaptchaChallenge}`;
		const getImgCaptchaBody: CaptchaRequestBodyType = {
			[ApiParams.dapp]: siteKey,
			[ApiParams.user]: userId,
			[ApiParams.datasetId]: solutions.datasetId,
		};

		const response = await fetch(getImageCaptchaURL, {
			method: "POST",
			body: JSON.stringify(getImgCaptchaBody),
			headers: {
				"Content-Type": "application/json",
				Origin: origin,
				"Prosopo-Site-Key": siteKey,
				"Prosopo-User": userId,
				"User-Agent": randomAsHex(16),
			},
		});

		expect(response.status).toBe(200);
	});
});
