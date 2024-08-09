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
import type { KeyringPair } from "@polkadot/keyring/types";
import { hexToU8a, stringToHex, u8aToHex } from "@polkadot/util";
import { randomAsHex, signatureVerify } from "@polkadot/util-crypto";
import { type Logger, ProsopoEnvError } from "@prosopo/common";
import {
	compareCaptchaSolutions,
	computePendingRequestHash,
	parseAndSortCaptchaSolutions,
} from "@prosopo/datasets";
import {
	type Captcha,
	type CaptchaSolution,
	CaptchaStatus,
	type PendingCaptchaRequest,
} from "@prosopo/types";
import type { Database, UserCommitmentRecord } from "@prosopo/types-database";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ImgCaptchaManager } from "../../../../tasks/imgCaptcha/imgCaptchaTasks.js";
import { shuffleArray } from "../../../../util.js";

// Mock dependencies
vi.mock("@prosopo/datasets", () => ({
	computePendingRequestHash: vi.fn(),
	compareCaptchaSolutions: vi.fn(),
	parseAndSortCaptchaSolutions: vi.fn(),
}));
vi.mock("@polkadot/util-crypto", () => ({
	randomAsHex: vi.fn(),
	signatureVerify: vi.fn(),
}));
vi.mock("@polkadot/util", () => ({
	u8aToHex: vi.fn(),
	stringToHex: vi.fn(),
}));
vi.mock("../../../../util.js", () => ({
	shuffleArray: vi.fn(),
}));
vi.mock("../../../../tasks/imgCaptcha/imgCaptchaTasksUtils.js", () => ({
	buildTreeAndGetCommitmentId: vi.fn(),
}));

describe("ImgCaptchaManager", () => {
	let db: Database;
	let pair: KeyringPair;
	let logger: Logger; // biome-ignore lint/suspicious/noExplicitAny: TODO fix
	let captchaConfig: any;
	let imgCaptchaManager: ImgCaptchaManager;

	beforeEach(() => {
		db = {
			getRandomCaptcha: vi.fn(),
			getDatasetDetails: vi.fn(),
			storeDappUserPending: vi.fn(),
			getDappUserPending: vi.fn(),
			updateDappUserPendingStatus: vi.fn(),
			storeDappUserSolution: vi.fn(),
			approveDappUserCommitment: vi.fn(),
			getCaptchaById: vi.fn(),
			getDappUserCommitmentById: vi.fn(),
			getDappUserCommitmentByAccount: vi.fn(),
		} as unknown as Database;

		pair = {
			sign: vi.fn(),
			address: "testAddress",
		} as unknown as KeyringPair;

		logger = {
			info: vi.fn(),
			error: vi.fn(),
		} as unknown as Logger;

		captchaConfig = {
			solved: { count: 5 },
			unsolved: { count: 5 },
		};

		imgCaptchaManager = new ImgCaptchaManager(db, pair, logger, captchaConfig);

		vi.clearAllMocks();
	});

	describe("getCaptchaWithProof", () => {
		it("should get captcha with proof", async () => {
			const datasetId = "datasetId";
			const size = 3;
			const solved = true;
			const captchaDocs = [
				{
					captchaId: "captcha1",
					solution: "solution1",
					question: "question1",
					options: ["option1"],
					datasetId,
				},
			] as unknown as Captcha[];

			// biome-ignore lint/suspicious/noExplicitAny: TODO fix
			(db.getRandomCaptcha as any).mockResolvedValue(captchaDocs);

			const result = await imgCaptchaManager.getCaptchaWithProof(
				datasetId,
				solved,
				size,
			);

			expect(result).toEqual(captchaDocs);
			expect(db.getRandomCaptcha).toHaveBeenCalledWith(solved, datasetId, size);
		});

		it("should throw an error if get captcha with proof fails", async () => {
			const datasetId = "datasetId";
			const size = 3;
			const solved = true;
			// biome-ignore lint/suspicious/noExplicitAny: TODO fix
			(db.getRandomCaptcha as any).mockResolvedValue(null);

			await expect(
				imgCaptchaManager.getCaptchaWithProof(datasetId, solved, size),
			).rejects.toThrow(
				new ProsopoEnvError("DATABASE.CAPTCHA_GET_FAILED", {
					context: {
						failedFuncName: "getCaptchaWithProof",
						datasetId,
						solved,
						size,
					},
				}),
			);
		});
	});

	describe("getRandomCaptchasAndRequestHash", () => {
		it("should get random captchas and request hash", async () => {
			const datasetId = "datasetId";
			const userAccount = "userAccount";
			const dataset = { datasetId, captchas: [] };

			// biome-ignore lint/suspicious/noExplicitAny: TODO fix
			(db.getDatasetDetails as any).mockResolvedValue(dataset); // biome-ignore lint/suspicious/noExplicitAny: TODO fix
			(db.getRandomCaptcha as any).mockResolvedValue([]); // biome-ignore lint/suspicious/noExplicitAny: TODO fix
			(randomAsHex as any).mockReturnValue("randomSalt"); // biome-ignore lint/suspicious/noExplicitAny: TODO fix
			(computePendingRequestHash as any).mockReturnValue("computedHash"); // biome-ignore lint/suspicious/noExplicitAny: TODO fix
			(pair.sign as any).mockReturnValue("signedTimestamp"); // biome-ignore lint/suspicious/noExplicitAny: TODO fix
			(u8aToHex as any).mockReturnValue("hexSignedTime"); // biome-ignore lint/suspicious/noExplicitAny: TODO fix
			(shuffleArray as any).mockReturnValue([]);

			const result = await imgCaptchaManager.getRandomCaptchasAndRequestHash(
				datasetId,
				userAccount,
			);

			expect(result).toEqual({
				captchas: [],
				requestHash: "computedHash",
				timestamp: expect.any(String),
				signedTimestamp: "hexSignedTime",
			});
		});

		it("should throw an error if dataset details are not found", async () => {
			const datasetId = "datasetId";
			const userAccount = "userAccount";
			// biome-ignore lint/suspicious/noExplicitAny: TODO fix
			(db.getDatasetDetails as any).mockResolvedValue(null);

			await expect(
				imgCaptchaManager.getRandomCaptchasAndRequestHash(
					datasetId,
					userAccount,
				),
			).rejects.toThrow(
				new ProsopoEnvError("DATABASE.DATASET_GET_FAILED", {
					context: {
						failedFuncName: "getRandomCaptchasAndRequestHash",
						dataset: null,
						datasetId,
					},
				}),
			);
		});
	});

	it("should validate received captchas against stored captchas", async () => {
		const captchas = [
			{ captchaId: "captcha1", solution: "solution1", salt: "salt1" },
		] as unknown as CaptchaSolution[];
		const storedCaptchas = [
			{
				captchaId: "captcha1",
				solution: "solution1",
				question: "question1",
				options: ["option1"],
				datasetId: "dataset1",
			},
		] as unknown as Captcha[];
		// biome-ignore lint/suspicious/noExplicitAny: TODO fix
		(parseAndSortCaptchaSolutions as any).mockReturnValue(captchas); // biome-ignore lint/suspicious/noExplicitAny: TODO fix
		(db.getCaptchaById as any).mockResolvedValue(storedCaptchas);

		const result =
			await imgCaptchaManager.validateReceivedCaptchasAgainstStoredCaptchas(
				captchas,
			);

		expect(result).toEqual({
			storedCaptchas,
			receivedCaptchas: captchas,
			captchaIds: ["captcha1"],
		});
	});

	it("should throw an error if received captchas length does not match stored captchas", async () => {
		const captchas = [
			{ captchaId: "captcha1", solution: "solution1", salt: "salt1" },
		] as unknown as CaptchaSolution[];
		// biome-ignore lint/suspicious/noExplicitAny: TODO fix
		(parseAndSortCaptchaSolutions as any).mockReturnValue(captchas); // biome-ignore lint/suspicious/noExplicitAny: TODO fix
		(db.getCaptchaById as any).mockResolvedValue([]);

		await expect(
			imgCaptchaManager.validateReceivedCaptchasAgainstStoredCaptchas(captchas),
		).rejects.toThrow(
			new ProsopoEnvError("CAPTCHA.INVALID_CAPTCHA_ID", {
				context: {
					failedFuncName: "validateReceivedCaptchasAgainstStoredCaptchas",
					captchas,
				},
			}),
		);
	});

	it("should validate dapp user solution request is pending", async () => {
		const requestHash = "requestHash";
		const timestamp = Date.now() + 10000;
		const pendingRecord = {
			requestHash: "requestHash",
			userAccount: "userAccount",
			datasetId: "datasetId",
			salt: "salt",
			deadlineTimestamp: timestamp,
			currentBlockNumber: 0,
		} as unknown as PendingCaptchaRequest;
		const userAccount = "userAccount";
		const captchaIds = ["captcha1"];
		// biome-ignore lint/suspicious/noExplicitAny: TODO fix
		(computePendingRequestHash as any).mockReturnValue("requestHash");

		const result =
			await imgCaptchaManager.validateDappUserSolutionRequestIsPending(
				requestHash,
				pendingRecord,
				userAccount,
				captchaIds,
			);

		expect(result).toBe(true);
	});

	it("should return false if deadline has expired", async () => {
		const requestHash = "requestHash";
		const timestamp = Date.now() - 10000;
		const pendingRecord = {
			requestHash: "requestHash",
			userAccount: "userAccount",
			datasetId: "datasetId",
			salt: "salt",
			deadlineTimestamp: timestamp,
			currentBlockNumber: 0,
		} as unknown as PendingCaptchaRequest;
		const userAccount = "userAccount";
		const captchaIds = ["captcha1"];

		const result =
			await imgCaptchaManager.validateDappUserSolutionRequestIsPending(
				requestHash,
				pendingRecord,
				userAccount,
				captchaIds,
			);

		expect(result).toBe(false);
		expect(logger.info).toHaveBeenCalledWith(
			"Deadline for responding to captcha has expired",
		);
	});

	it("should get dapp user commitment by ID", async () => {
		const commitmentId = "commitmentId";
		const dappUserCommitment: UserCommitmentRecord = {
			id: "commitmentId",
			userAccount: "userAccount",
			dappContract: "dappContract",
			providerAccount: "providerAccount",
			datasetId: "datasetId",
			status: CaptchaStatus.approved,
			userSignature: [],
			requestedAt: 0,
			completedAt: 0,
			processed: false,
			batched: false,
			stored: false,
			requestedAtTimestamp: 0,
		};
		// biome-ignore lint/suspicious/noExplicitAny: TODO fix
		(db.getDappUserCommitmentById as any).mockResolvedValue(dappUserCommitment);

		const result =
			await imgCaptchaManager.getDappUserCommitmentById(commitmentId);

		expect(result).toEqual(dappUserCommitment);
	});

	it("should throw an error if dapp user commitment is not found by ID", async () => {
		const commitmentId = "commitmentId";
		// biome-ignore lint/suspicious/noExplicitAny: TODO fix
		(db.getDappUserCommitmentById as any).mockResolvedValue(null);

		await expect(
			imgCaptchaManager.getDappUserCommitmentById(commitmentId),
		).rejects.toThrow(
			new ProsopoEnvError("CAPTCHA.DAPP_USER_SOLUTION_NOT_FOUND", {
				context: {
					failedFuncName: "getDappUserCommitmentById",
					commitmentId: commitmentId,
				},
			}),
		);
	});

	it("should get dapp user commitment by account", async () => {
		const userAccount = "userAccount";
		const dappUserCommitments: UserCommitmentRecord[] = [
			{
				id: "commitmentId",
				userAccount: "userAccount",
				dappContract: "dappContract",
				providerAccount: "providerAccount",
				datasetId: "datasetId",
				status: CaptchaStatus.approved,
				userSignature: [],
				requestedAt: 0,
				completedAt: 0,
				processed: false,
				batched: false,
				stored: false,
				requestedAtTimestamp: 0,
			},
		];
		// biome-ignore lint/suspicious/noExplicitAny: TODO fix
		(db.getDappUserCommitmentByAccount as any).mockResolvedValue(
			dappUserCommitments,
		);

		const result =
			await imgCaptchaManager.getDappUserCommitmentByAccount(userAccount);

		expect(result).toEqual(dappUserCommitments[0]);
	});

	it("should return undefined if no approved dapp user commitment is found by account", async () => {
		const userAccount = "userAccount";
		const dappUserCommitments: UserCommitmentRecord[] = [];
		// biome-ignore lint/suspicious/noExplicitAny: TODO fix
		(db.getDappUserCommitmentByAccount as any).mockResolvedValue(
			dappUserCommitments,
		);

		const result =
			await imgCaptchaManager.getDappUserCommitmentByAccount(userAccount);

		expect(result).toBeUndefined();
	});
});
