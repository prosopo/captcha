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
	type CaptchaResponseBody,
	CaptchaType,
	ClientApiPaths,
	DEFAULT_SOLVED_COUNT,
	type GetFrictionlessCaptchaChallengeRequestBodyOutput,
	type GetPowCaptchaChallengeRequestBodyTypeOutput,
	type GetPowCaptchaResponse,
	type KeyringPair,
} from "@prosopo/types";
import { at } from "@prosopo/util";
import { randomAsHex } from "@prosopo/util-crypto";
import { beforeEach, describe, expect, it } from "vitest";
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

	describe("Site keys registered for image captcha", () => {
		let siteKeyPair: KeyringPair;
		let siteKeyMnemonic: string;
		let siteKey: string;
		let userPair: KeyringPair;
		let userMnemonic: string;
		let userId: string;
		const adminPair = at(getDefaultProviders(), 0).pair;
		beforeEach(async () => {
			const responses = await removeAllUserAccessPolicies(adminPair);
			expect(responses.every((response) => response.status === "SUCCESS")).toBe(
				true,
			);
			// Create a new site key to avoid conflicts with other tests
			[siteKeyMnemonic, siteKey] = await generateMnemonic();
			siteKeyPair = getPair(siteKeyMnemonic);
			await registerSiteKey(siteKey, CaptchaType.image, adminPair);
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
			const data = await response.json();
			expect(data.captchas).toBeUndefined();
		});
		it("should return a 200 for a non-blocked user", async () => {
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
			const data = (await response.json()) as CaptchaResponseBody;
			expect(data[ApiParams.status]).toBe("ok");
			expect(data.captchas.length).toBe(DEFAULT_SOLVED_COUNT);
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
			await registerSiteKey(otherSiteKey, CaptchaType.image, adminPair);

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

		it("should return the correct number of rounds of image captcha for a user with an image captcha access rule", async () => {
			const rounds = 6;
			await userAccessPolicy(adminPair, {
				solved: 6,
				userId,
				description: "Image captcha rounds test",
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
			const data = await response.json();
			expect(data.captchas.length).toBe(rounds);
		});
	});
	// TODO Reintroduce when we can do secure selection in the frictionless flow
	// describe("Site keys registered for frictionless captcha", () => {
	// 	let siteKeyPair: KeyringPair;
	// 	let siteKeyMnemonic: string;
	// 	let siteKey: string;
	// 	let userPair: KeyringPair;
	// 	let userMnemonic: string;
	// 	let userId: string;
	// 	const adminPair = at(getDefaultProviders(), 0).pair;
	// 	beforeEach(async () => {
	// 		const responses = await removeAllUserAccessPolicies(adminPair);
	// 		expect(responses.every((response) => response.status === "SUCCESS")).toBe(
	// 			true,
	// 		);
	// 		// Create a new site key to avoid conflicts with other tests
	// 		[siteKeyMnemonic, siteKey] = await generateMnemonic();
	// 		siteKeyPair = getPair(siteKeyMnemonic);
	// 		await registerSiteKey(siteKey, CaptchaType.frictionless, adminPair);
	// 		[userMnemonic, userId] = await generateMnemonic();
	// 		userPair = getPair(userMnemonic);
	// 	});
	//
	// 	it("should return a 401 for a blocked user", async () => {
	// 		await userAccessPolicy(adminPair, {
	// 			block: true, // block
	// 			userId,
	// 			description: "Blocked user test",
	// 		});
	// 		const origin = "http://localhost";
	// 		const getFrictionlessCaptchaUrl = `${baseUrl}${ClientApiPaths.GetFrictionlessCaptchaChallenge}`;
	// 		const getFrictionlessCaptchaBody: GetFrictionlessCaptchaChallengeRequestBodyOutput =
	// 			{
	// 				[ApiParams.dapp]: siteKey,
	// 				[ApiParams.token]: randomAsHex(16),
	// 				[ApiParams.user]: userId,
	// 			};
	// 		const response = await fetch(getFrictionlessCaptchaUrl, {
	// 			method: "POST",
	// 			body: JSON.stringify(getFrictionlessCaptchaBody),
	// 			headers: {
	// 				"Content-Type": "application/json",
	// 				Origin: origin,
	// 				"Prosopo-Site-Key": siteKey,
	// 				"Prosopo-User": userId,
	// 				"User-Agent": randomAsHex(16),
	// 			},
	// 		});
	//
	// 		expect(response.status).toBe(401);
	// 	});
	//
	// 	it("should return the correct captcha type for a user with an image captcha access rule", async () => {
	// 		const rounds = 6;
	// 		await userAccessPolicy(adminPair, {
	// 			solved: 6,
	// 			userId,
	// 			description: "Image captcha rounds test",
	// 		});
	// 		const origin = "http://localhost";
	// 		const getFrictionlessCaptchaUrl = `${baseUrl}${ClientApiPaths.GetFrictionlessCaptchaChallenge}`;
	// 		const getFrictionlessCaptchaBody: GetFrictionlessCaptchaChallengeRequestBodyOutput =
	// 			{
	// 				[ApiParams.dapp]: siteKey,
	// 				[ApiParams.token]: randomAsHex(16),
	// 				[ApiParams.user]: userId,
	// 			};
	// 		const responseFrictionless = await fetch(getFrictionlessCaptchaUrl, {
	// 			method: "POST",
	// 			body: JSON.stringify(getFrictionlessCaptchaBody),
	// 			headers: {
	// 				"Content-Type": "application/json",
	// 				Origin: origin,
	// 				"Prosopo-Site-Key": siteKey,
	// 				"Prosopo-User": userId,
	// 				"User-Agent": randomAsHex(16),
	// 			},
	// 		});
	// 		expect(responseFrictionless.status).toBe(200);
	// 		const dataFrictionless = await responseFrictionless.json();
	// 		expect(dataFrictionless.captchaType).toBe(CaptchaType.image);
	//
	// 		const getImageCaptchaURL = `${baseUrl}${ClientApiPaths.GetImageCaptchaChallenge}`;
	// 		const getImgCaptchaBody: CaptchaRequestBodyType = {
	// 			[ApiParams.dapp]: siteKey,
	// 			[ApiParams.user]: userId,
	// 			[ApiParams.datasetId]: solutions.datasetId,
	// 			[ApiParams.sessionId]: dataFrictionless.sessionId,
	// 		};
	// 		const responseImage = await fetch(getImageCaptchaURL, {
	// 			method: "POST",
	// 			body: JSON.stringify(getImgCaptchaBody),
	// 			headers: {
	// 				"Content-Type": "application/json",
	// 				Origin: origin,
	// 				"Prosopo-Site-Key": siteKey,
	// 				"Prosopo-User": userId,
	// 				"User-Agent": randomAsHex(16),
	// 			},
	// 		});
	// 		expect(responseImage.status).toBe(200);
	// 		const data = await responseImage.json();
	// 		expect(data.captchas.length).toBe(rounds);
	// 	});
	// 	it("should return the correct captcha type for a user with a pow captcha access rule", async () => {
	// 		const difficulty = 6;
	// 		await userAccessPolicy(adminPair, {
	// 			userId,
	// 			description: "PoW captcha 2 difficulty test",
	// 			captchaType: CaptchaType.pow,
	// 			powDifficulty: difficulty,
	// 		});
	// 		const origin = "http://localhost";
	// 		const getFrictionlessCaptchaUrl = `${baseUrl}${ClientApiPaths.GetFrictionlessCaptchaChallenge}`;
	// 		const getFrictionlessCaptchaBody: GetFrictionlessCaptchaChallengeRequestBodyOutput =
	// 			{
	// 				[ApiParams.dapp]: siteKey,
	// 				[ApiParams.token]: randomAsHex(16),
	// 				[ApiParams.user]: userId,
	// 			};
	// 		const responseFrictionless = await fetch(getFrictionlessCaptchaUrl, {
	// 			method: "POST",
	// 			body: JSON.stringify(getFrictionlessCaptchaBody),
	// 			headers: {
	// 				"Content-Type": "application/json",
	// 				Origin: origin,
	// 				"Prosopo-Site-Key": siteKey,
	// 				"Prosopo-User": userId,
	// 				"User-Agent": randomAsHex(16),
	// 			},
	// 		});
	// 		expect(responseFrictionless.status).toBe(200);
	// 		const dataFrictionless = await responseFrictionless.json();
	// 		expect(dataFrictionless.captchaType).toBe(CaptchaType.pow);
	//
	// 		const getPoWCaptchaUrl = `${baseUrl}${ClientApiPaths.GetPowCaptchaChallenge}`;
	// 		const getPoWCaptchaBody: GetPowCaptchaChallengeRequestBodyTypeOutput = {
	// 			[ApiParams.dapp]: siteKey,
	// 			[ApiParams.user]: userId,
	// 			[ApiParams.sessionId]: dataFrictionless.sessionId,
	// 		};
	// 		const responsePoW = await fetch(getPoWCaptchaUrl, {
	// 			method: "POST",
	// 			body: JSON.stringify(getPoWCaptchaBody),
	// 			headers: {
	// 				"Content-Type": "application/json",
	// 				Origin: origin,
	// 				"Prosopo-Site-Key": siteKey,
	// 				"Prosopo-User": userId,
	// 				"User-Agent": randomAsHex(16),
	// 			},
	// 		});
	// 		expect(responsePoW.status).toBe(200);
	// 		const data: GetPowCaptchaResponse = await responsePoW.json();
	// 		expect(data.difficulty).toBe(difficulty);
	// 	});
	// 	it("should not return an image captcha for a user with a pow captcha access rule", async () => {
	// 		const difficulty = 6;
	// 		await userAccessPolicy(adminPair, {
	// 			userId,
	// 			description: "PoW captcha 2 difficulty test",
	// 			captchaType: CaptchaType.pow,
	// 			powDifficulty: difficulty,
	// 		});
	// 		const origin = "http://localhost";
	// 		const getFrictionlessCaptchaUrl = `${baseUrl}${ClientApiPaths.GetFrictionlessCaptchaChallenge}`;
	// 		const getFrictionlessCaptchaBody: GetFrictionlessCaptchaChallengeRequestBodyOutput =
	// 			{
	// 				[ApiParams.dapp]: siteKey,
	// 				[ApiParams.token]: randomAsHex(16),
	// 				[ApiParams.user]: userId,
	// 			};
	// 		const responseFrictionless = await fetch(getFrictionlessCaptchaUrl, {
	// 			method: "POST",
	// 			body: JSON.stringify(getFrictionlessCaptchaBody),
	// 			headers: {
	// 				"Content-Type": "application/json",
	// 				Origin: origin,
	// 				"Prosopo-Site-Key": siteKey,
	// 				"Prosopo-User": userId,
	// 				"User-Agent": randomAsHex(16),
	// 			},
	// 		});
	// 		expect(responseFrictionless.status).toBe(200);
	// 		const dataFrictionless = await responseFrictionless.json();
	// 		expect(dataFrictionless.captchaType).toBe(CaptchaType.pow);
	//
	// 		const getImageCaptchaURL = `${baseUrl}${ClientApiPaths.GetImageCaptchaChallenge}`;
	// 		const getImgCaptchaBody: CaptchaRequestBodyType = {
	// 			[ApiParams.dapp]: siteKey,
	// 			[ApiParams.user]: userId,
	// 			[ApiParams.datasetId]: solutions.datasetId,
	// 			[ApiParams.sessionId]: dataFrictionless.sessionId,
	// 		};
	// 		const responseImage = await fetch(getImageCaptchaURL, {
	// 			method: "POST",
	// 			body: JSON.stringify(getImgCaptchaBody),
	// 			headers: {
	// 				"Content-Type": "application/json",
	// 				Origin: origin,
	// 				"Prosopo-Site-Key": siteKey,
	// 				"Prosopo-User": userId,
	// 				"User-Agent": randomAsHex(16),
	// 			},
	// 		});
	// 		expect(responseImage.status).toBe(400);
	// 	});
	// 	it("should not return a pow captcha for a user with an image captcha access rule", async () => {
	// 		await userAccessPolicy(adminPair, {
	// 			userId,
	// 			description: "Image captcha rounds test",
	// 			captchaType: CaptchaType.image,
	// 			solved: 12,
	// 		});
	// 		const origin = "http://localhost";
	// 		const getFrictionlessCaptchaUrl = `${baseUrl}${ClientApiPaths.GetFrictionlessCaptchaChallenge}`;
	// 		const getFrictionlessCaptchaBody: GetFrictionlessCaptchaChallengeRequestBodyOutput =
	// 			{
	// 				[ApiParams.dapp]: siteKey,
	// 				[ApiParams.token]: randomAsHex(16),
	// 				[ApiParams.user]: userId,
	// 			};
	// 		const responseFrictionless = await fetch(getFrictionlessCaptchaUrl, {
	// 			method: "POST",
	// 			body: JSON.stringify(getFrictionlessCaptchaBody),
	// 			headers: {
	// 				"Content-Type": "application/json",
	// 				Origin: origin,
	// 				"Prosopo-Site-Key": siteKey,
	// 				"Prosopo-User": userId,
	// 				"User-Agent": randomAsHex(16),
	// 			},
	// 		});
	// 		expect(responseFrictionless.status).toBe(200);
	// 		const dataFrictionless = await responseFrictionless.json();
	// 		expect(dataFrictionless.captchaType).toBe(CaptchaType.image);
	//
	// 		const getPoWCaptchaUrl = `${baseUrl}${ClientApiPaths.GetPowCaptchaChallenge}`;
	// 		const getPoWCaptchaBody: GetPowCaptchaChallengeRequestBodyTypeOutput = {
	// 			[ApiParams.dapp]: siteKey,
	// 			[ApiParams.user]: userId,
	// 			[ApiParams.sessionId]: dataFrictionless.sessionId,
	// 		};
	// 		const responsePoW = await fetch(getPoWCaptchaUrl, {
	// 			method: "POST",
	// 			body: JSON.stringify(getPoWCaptchaBody),
	// 			headers: {
	// 				"Content-Type": "application/json",
	// 				Origin: origin,
	// 				"Prosopo-Site-Key": siteKey,
	// 				"Prosopo-User": userId,
	// 				"User-Agent": randomAsHex(16),
	// 			},
	// 		});
	// 		expect(responsePoW.status).toBe(400);
	// 	});
	// });
	describe("Site keys registered for pow captcha", () => {
		let siteKeyPair: KeyringPair;
		let siteKeyMnemonic: string;
		let siteKey: string;
		let userPair: KeyringPair;
		let userMnemonic: string;
		let userId: string;
		const adminPair = at(getDefaultProviders(), 0).pair;
		beforeEach(async () => {
			const responses = await removeAllUserAccessPolicies(adminPair);
			expect(responses.every((response) => response.status === "SUCCESS")).toBe(
				true,
			);
			// Create a new site key to avoid conflicts with other tests
			[siteKeyMnemonic, siteKey] = await generateMnemonic();
			siteKeyPair = getPair(siteKeyMnemonic);
			await registerSiteKey(siteKey, CaptchaType.pow, adminPair);
			[userMnemonic, userId] = await generateMnemonic();
			userPair = getPair(userMnemonic);
		});

		it("should return a 401 for a blocked user", async () => {
			await userAccessPolicy(adminPair, {
				block: true, // block
				userId,
				description: "Blocked user test",
			});
			const origin = "http://localhost";

			const getPoWCaptchaUrl = `${baseUrl}${ClientApiPaths.GetPowCaptchaChallenge}`;
			const getPoWCaptchaBody: GetPowCaptchaChallengeRequestBodyTypeOutput = {
				[ApiParams.dapp]: siteKey,
				[ApiParams.user]: userId,
			};
			const response = await fetch(getPoWCaptchaUrl, {
				method: "POST",
				body: JSON.stringify(getPoWCaptchaBody),
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

		it("should return the correct captcha type for a user with a pow captcha access rule", async () => {
			const difficulty = 6;
			await userAccessPolicy(adminPair, {
				userId,
				description: "PoW captcha 2 difficulty test",
				captchaType: CaptchaType.pow,
				powDifficulty: difficulty,
			});
			const origin = "http://localhost";

			const getPoWCaptchaUrl = `${baseUrl}${ClientApiPaths.GetPowCaptchaChallenge}`;
			const getPoWCaptchaBody: GetPowCaptchaChallengeRequestBodyTypeOutput = {
				[ApiParams.dapp]: siteKey,
				[ApiParams.user]: userId,
			};
			const responsePoW = await fetch(getPoWCaptchaUrl, {
				method: "POST",
				body: JSON.stringify(getPoWCaptchaBody),
				headers: {
					"Content-Type": "application/json",
					Origin: origin,
					"Prosopo-Site-Key": siteKey,
					"Prosopo-User": userId,
					"User-Agent": randomAsHex(16),
				},
			});
			expect(responsePoW.status).toBe(200);
			const data: GetPowCaptchaResponse = await responsePoW.json();
			expect(data.difficulty).toBe(difficulty);
		});
		it("should not return an image captcha for a user with a pow captcha access rule", async () => {
			const difficulty = 6;
			await userAccessPolicy(adminPair, {
				userId,
				description: "PoW captcha 2 difficulty test",
				captchaType: CaptchaType.pow,
				powDifficulty: difficulty,
			});
			const origin = "http://localhost";

			const getImageCaptchaURL = `${baseUrl}${ClientApiPaths.GetImageCaptchaChallenge}`;
			const getImgCaptchaBody: CaptchaRequestBodyType = {
				[ApiParams.dapp]: siteKey,
				[ApiParams.user]: userId,
				[ApiParams.datasetId]: solutions.datasetId,
			};
			const responseImage = await fetch(getImageCaptchaURL, {
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
			expect(responseImage.status).toBe(400);
		});
		it("should return a 400 when a user requests a frictionless captcha, the site key is registered for pow captcha, and an image captcha access rule is set", async () => {
			await userAccessPolicy(adminPair, {
				userId,
				description: "Image captcha rounds test",
				captchaType: CaptchaType.image,
				solved: 12,
			});
			const origin = "http://localhost";
			const getFrictionlessCaptchaUrl = `${baseUrl}${ClientApiPaths.GetFrictionlessCaptchaChallenge}`;
			const getFrictionlessCaptchaBody: GetFrictionlessCaptchaChallengeRequestBodyOutput =
				{
					[ApiParams.dapp]: siteKey,
					[ApiParams.token]: randomAsHex(16),
					[ApiParams.user]: userId,
				};
			const response = await fetch(getFrictionlessCaptchaUrl, {
				method: "POST",
				body: JSON.stringify(getFrictionlessCaptchaBody),
				headers: {
					"Content-Type": "application/json",
					Origin: origin,
					"Prosopo-Site-Key": siteKey,
					"Prosopo-User": userId,
					"User-Agent": randomAsHex(16),
				},
			});
			expect(response.status).toBe(400);
		});
		it("should return a 400 when a user requests a frictionless captcha and the site key is registered for pow captcha, and no access rule is set", async () => {
			const origin = "http://localhost";
			const getFrictionlessCaptchaUrl = `${baseUrl}${ClientApiPaths.GetFrictionlessCaptchaChallenge}`;
			const getFrictionlessCaptchaBody: GetFrictionlessCaptchaChallengeRequestBodyOutput =
				{
					[ApiParams.dapp]: siteKey,
					[ApiParams.token]: randomAsHex(16),
					[ApiParams.user]: userId,
				};
			const response = await fetch(getFrictionlessCaptchaUrl, {
				method: "POST",
				body: JSON.stringify(getFrictionlessCaptchaBody),
				headers: {
					"Content-Type": "application/json",
					Origin: origin,
					"Prosopo-Site-Key": siteKey,
					"Prosopo-User": userId,
					"User-Agent": randomAsHex(16),
				},
			});
			const data = await response.json();
			expect(response.status).toBe(400);
		});
	});
});
