// Copyright 2021-2024 Prosopo (UK) Ltd.
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
import { stringToU8a, u8aToHex } from "@polkadot/util";
import { generateMnemonic, getPairAsync } from "@prosopo/contract";
import { datasetWithSolutionHashes } from "@prosopo/datasets";
import {
	ApiParams,
	ApiPaths,
	type Captcha,
	type CaptchaRequestBodyType,
	CaptchaRequestBodyTypeOutput,
	type CaptchaResponseBody,
	type CaptchaSolutionBodyType,
	type CaptchaSolutionResponse,
	IUserSettings,
	type TGetImageCaptchaChallengeURL,
} from "@prosopo/types";
import fetch from "node-fetch";
import { beforeAll, describe, expect, it } from "vitest";
import { dummyUserAccount } from "./mocks/solvedTestCaptchas.js";
import { registerSiteKey } from "./registerSitekey.js";

const solutions = datasetWithSolutionHashes;
const baseUrl = "http://localhost:9229";
const dappAccount = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";
const userAccount = "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty";

describe("Image Captcha Integration Tests", () => {
	describe("GetImageCaptchaChallenge", () => {
		beforeAll(async () => {
			await registerSiteKey(dappAccount);
		});

		it("should supply an image captcha challenge to a Dapp User", async () => {
			const origin = "http://localhost";
			const getImageCaptchaURL = `${baseUrl}${ApiPaths.GetImageCaptchaChallenge}`;
			const getImgCaptchaBody: CaptchaRequestBodyType = {
				[ApiParams.dapp]: dappAccount,
				[ApiParams.user]: userAccount,
				[ApiParams.datasetId]: solutions.datasetId,
			};

			const response = await fetch(getImageCaptchaURL, {
				method: "POST",
				body: JSON.stringify(getImgCaptchaBody),
				headers: {
					"Content-Type": "application/json",
					Origin: origin,
					"Prosopo-Site-Key": dappAccount,
					"Prosopo-User": userAccount,
				},
			});

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data).toHaveProperty("captchas");
		});

		it("should not supply an image captcha challenge to a Dapp User if the site key is not registered", async () => {
			const origin = "http://localhost";
			const [_mnemonic, unregisteredAccount] = await generateMnemonic();
			const getImageCaptchaURL = `${baseUrl}${ApiPaths.GetImageCaptchaChallenge}`;
			const body: CaptchaRequestBodyType = {
				[ApiParams.dapp]: unregisteredAccount,
				[ApiParams.user]: userAccount,
				[ApiParams.datasetId]: solutions.datasetId,
			};

			const response = await fetch(getImageCaptchaURL, {
				method: "POST",
				body: JSON.stringify(body),
				headers: {
					"Content-Type": "application/json",
					Origin: origin,
					"Prosopo-Site-Key": unregisteredAccount,
					"Prosopo-User": userAccount,
				},
			});

			expect(response.status).toBe(400);
			const data = (await response.json()) as CaptchaResponseBody;
			expect(data).toHaveProperty("error");
			expect(data.error?.message).toBe("Site key not registered");
		});

		it("should not supply an image captcha challenge to a Dapp User if an invalid site key is provided", async () => {
			const invalidSiteKey = "junk";
			const origin = "http://localhost";
			const getImageCaptchaURL = `${baseUrl}${ApiPaths.GetImageCaptchaChallenge}`;
			const body: CaptchaRequestBodyType = {
				[ApiParams.dapp]: invalidSiteKey,
				[ApiParams.user]: userAccount,
				[ApiParams.datasetId]: solutions.datasetId,
			};

			const response = await fetch(getImageCaptchaURL, {
				method: "POST",
				body: JSON.stringify(body),
				headers: {
					"Content-Type": "application/json",
					Origin: origin,
					"Prosopo-Site-Key": invalidSiteKey,
					"Prosopo-User": userAccount,
				},
			});

			expect(response.status).toBe(400);
			const data = (await response.json()) as CaptchaResponseBody;
			expect(data).toHaveProperty("error");
			expect(data.error?.message).toBe("Invalid site key");
		});

		it("should fail if datasetID is incorrect", async () => {
			const datasetId = "thewrongdsetId";
			const origin = "http://localhost";
			const getImageCaptchaURL = `${baseUrl}${ApiPaths.GetImageCaptchaChallenge}`;
			const body: CaptchaRequestBodyType = {
				[ApiParams.dapp]: dappAccount,
				[ApiParams.user]: userAccount,
				[ApiParams.datasetId]: datasetId,
			};
			const response = await fetch(getImageCaptchaURL, {
				method: "POST",
				body: JSON.stringify(body),
				headers: {
					"Content-Type": "application/json",
					Origin: origin,
					"Prosopo-Site-Key": dappAccount,
					"Prosopo-User": userAccount,
				},
			});

			expect(response.status).toBe(500);
		});
	});
	describe("SubmitImageCaptchaSolution", () => {
		it("should verify a correctly completed image captcha as true", async () => {
			const pair = await getPairAsync(
				dummyUserAccount.seed,
				undefined,
				"sr25519",
				42,
			);

			const userAccount = dummyUserAccount.address;
			const origin = "http://localhost";
			const getImageCaptchaURL = `${baseUrl}${ApiPaths.GetImageCaptchaChallenge}`;
			const getImgCaptchaBody: CaptchaRequestBodyType = {
				[ApiParams.dapp]: dappAccount,
				[ApiParams.user]: userAccount,
				[ApiParams.datasetId]: solutions.datasetId,
			};
			const response = await fetch(getImageCaptchaURL, {
				method: "POST",
				body: JSON.stringify(getImgCaptchaBody),
				headers: {
					"Content-Type": "application/json",
					Origin: origin,
					"Prosopo-Site-Key": dappAccount,
					"Prosopo-User": userAccount,
				},
			});

			expect(response.status).toBe(200);

			const data = (await response.json()) as CaptchaResponseBody;

			const solvedCaptchas = datasetWithSolutionHashes.captchas.map(
				(captcha) => ({
					captchaContentId: captcha.captchaContentId,
					solution: captcha.solution
						? captcha.solution.map((s) => s.toString())
						: captcha.solution,
					salt: captcha.salt,
				}),
			);

			const temp = data.captchas.map((captcha) => {
				const solvedCaptcha = solvedCaptchas.find(
					(solvedCaptcha) =>
						solvedCaptcha.captchaContentId === captcha.captchaContentId,
				);
				if (!solvedCaptcha || !solvedCaptcha.solution) {
					throw new Error("wtf?");
				}

				return {
					captchaContentId: captcha.captchaContentId,
					captchaId: captcha.captchaId,
					salt: solvedCaptcha.salt,
					solution: solvedCaptcha.solution,
				};
			});

			const solveImgCaptchaBody: CaptchaSolutionBodyType = {
				[ApiParams.captchas]: temp,
				[ApiParams.dapp]: dappAccount,
				[ApiParams.requestHash]: data.requestHash,
				[ApiParams.signature]: {
					[ApiParams.user]: {
						[ApiParams.timestamp]: u8aToHex(
							pair.sign(stringToU8a(data.timestamp)),
						),
					},
					[ApiParams.provider]: data[ApiParams.signature][ApiParams.provider],
				},
				[ApiParams.timestamp]: data.timestamp,
				[ApiParams.user]: userAccount,
			};

			const solveThatCaptcha = await fetch(
				`${baseUrl}${ApiPaths.SubmitImageCaptchaSolution}`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Origin: origin,
						"Prosopo-Site-Key": dappAccount,
						"Prosopo-User": userAccount,
					},
					body: JSON.stringify(solveImgCaptchaBody),
				},
			);
			const jsonRes = await solveThatCaptcha.json();

			const res = jsonRes as CaptchaSolutionResponse;
			expect(res.status).toBe("You correctly answered the captchas");
		});
	});
});
