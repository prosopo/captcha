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

import { u8aToHex } from "@polkadot/util";
import { type Logger, ProsopoEnvError, getLogger } from "@prosopo/common";
import {
	computePendingRequestHash,
	parseAndSortCaptchaSolutions,
} from "@prosopo/datasets";
import type { KeyringPair } from "@prosopo/types";
import {
	type Captcha,
	type CaptchaSolution,
	CaptchaStatus,
	type RequestHeaders,
} from "@prosopo/types";
import type {
	IProviderDatabase,
	PendingCaptchaRequest,
	UserCommitment,
} from "@prosopo/types-database";
import { getIPAddress, getIPAddressFromBigInt } from "@prosopo/util";
import { randomAsHex } from "@prosopo/util-crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ImgCaptchaManager } from "../../../../tasks/imgCaptcha/imgCaptchaTasks.js";
import { shuffleArray } from "../../../../util.js";

const loggerOuter = getLogger("info", import.meta.url);

// Mock dependencies
vi.mock("@prosopo/datasets", () => ({
	computePendingRequestHash: vi.fn(),
	compareCaptchaSolutions: vi.fn(),
	parseAndSortCaptchaSolutions: vi.fn(),
}));
vi.mock("@prosopo/util-crypto", () => ({
	randomAsHex: vi.fn(),
	signatureVerify: vi.fn(),
}));
vi.mock("@polkadot/util", () => ({
	u8aToHex: vi.fn(),
	stringToHex: vi.fn(),
}));
vi.mock("../../../../util.js", async (importOriginal) => {
	return {
		...(await importOriginal<typeof import("../../../../util.js")>()),
		shuffleArray: vi.fn(),
	};
});
vi.mock("../../../../tasks/imgCaptcha/imgCaptchaTasksUtils.js", () => ({
	buildTreeAndGetCommitmentId: vi.fn(),
}));

const mockCaptchas = [
	{
		captchaId: "captcha1",
		solution: "solution1",
		question: "question1",
		options: ["option1"],
		datasetId: "datasetId",
		solved: true,
	},
	{
		captchaId: "captcha2",
		solution: "solution2",
		question: "question2",
		options: ["option2"],
		datasetId: "datasetId",
		solved: true,
	},
	{
		captchaId: "captcha3",
		solution: "solution3",
		question: "question3",
		options: ["option3"],
		datasetId: "datasetId",
		solved: true,
	},
	{
		captchaId: "captcha4",
		solution: "solution4",
		question: "question4",
		options: ["option4"],
		datasetId: "datasetId",
		solved: true,
	},
	{
		captchaId: "captcha5",
		solution: "solution5",
		question: "question5",
		options: ["option5"],
		datasetId: "datasetId",
		solved: true,
	},
	{
		captchaId: "captcha6",
		solution: "solution6",
		question: "question6",
		options: ["option6"],
		datasetId: "datasetId",
		solved: false,
	},
	{
		captchaId: "captcha7",
		solution: "solution7",
		question: "question7",
		options: ["option7"],
		datasetId: "datasetId",
		solved: false,
	},
	{
		captchaId: "captcha8",
		solution: "solution8",
		question: "question8",
		options: ["option8"],
		datasetId: "datasetId",
		solved: false,
	},
	{
		captchaId: "captcha9",
		solution: "solution9",
		question: "question9",
		options: ["option9"],
		datasetId: "datasetId",
		solved: false,
	},
] as unknown as Captcha[];

describe("ImgCaptchaManager", () => {
	let db: IProviderDatabase;
	let pair: KeyringPair;
	let logger: Logger; // biome-ignore lint/suspicious/noExplicitAny: TODO fix
	let captchaConfig: any;
	let imgCaptchaManager: ImgCaptchaManager;

	beforeEach(() => {
		db = {
			getRandomCaptcha: vi.fn(
				(solved: boolean, datasetId: string, size: number) => {
					console.log("solved", solved, "datasetId", datasetId, "size", size);
					return mockCaptchas
						.filter(
							(captcha) =>
								captcha.solved === solved && captcha.datasetId === datasetId,
						)
						.splice(0, size);
				},
			),
			getDatasetDetails: vi.fn(),
			storePendingImageCommitment: vi.fn(),
			getPendingImageCommitment: vi.fn(),
			updatePendingImageCommitmentStatus: vi.fn(),
			storeDappUserSolution: vi.fn(),
			approveDappUserCommitment: vi.fn(),
			getCaptchaById: vi.fn(),
			getDappUserCommitmentById: vi.fn(),
			getDappUserCommitmentByAccount: vi.fn(),
		} as unknown as IProviderDatabase;

		pair = {
			sign: vi.fn(),
			address: "testAddress",
		} as unknown as KeyringPair;

		const mockLogger = {
			debug: vi.fn().mockImplementation(loggerOuter.debug.bind(loggerOuter)),
			log: vi.fn().mockImplementation(loggerOuter.log.bind(loggerOuter)),
			info: vi.fn().mockImplementation(loggerOuter.info.bind(loggerOuter)),
			error: vi.fn().mockImplementation(loggerOuter.error.bind(loggerOuter)),
			trace: vi.fn().mockImplementation(loggerOuter.trace.bind(loggerOuter)),
			fatal: vi.fn().mockImplementation(loggerOuter.fatal.bind(loggerOuter)),
			warn: vi.fn().mockImplementation(loggerOuter.warn.bind(loggerOuter)),
		} as unknown as Logger;
		logger = mockLogger;

		captchaConfig = {
			solved: { count: 5 },
			unsolved: { count: 4 },
		};

		imgCaptchaManager = new ImgCaptchaManager(db, pair, captchaConfig, logger);

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

		it("should getCaptchaWithProof of specific size", async () => {
			const datasetId = "datasetId";
			const size = 3;

			const solvedResult = await imgCaptchaManager.getCaptchaWithProof(
				datasetId,
				true,
				size,
			);

			expect(solvedResult.length).toBe(size);

			const unsolvedResult = await imgCaptchaManager.getCaptchaWithProof(
				datasetId,
				false,
				size,
			);

			expect(unsolvedResult.length).toBe(size);
		});
	});

	describe("getRandomCaptchasAndRequestHash", () => {
		it("should get random captchas and request hash", async () => {
			const datasetId = "datasetId";
			const userAccount = "userAccount";
			const dataset = { datasetId, captchas: [] };
			const ipAddress = getIPAddress("1.1.1.1");
			const headers: RequestHeaders = { a: "1", b: "2", c: "3" };
			// biome-ignore lint/suspicious/noExplicitAny: TODO fix
			(db.getDatasetDetails as any).mockResolvedValue(dataset); // biome-ignore lint/suspicious/noExplicitAny: TODO fix
			(db.getRandomCaptcha as any).mockResolvedValue([]); // biome-ignore lint/suspicious/noExplicitAny: TODO fix
			(randomAsHex as any).mockReturnValue("randomSalt"); // biome-ignore lint/suspicious/noExplicitAny: TODO fix
			(computePendingRequestHash as any).mockReturnValue("computedHash"); // biome-ignore lint/suspicious/noExplicitAny: TODO fix
			(pair.sign as any).mockReturnValue("hexSignedRequestHash"); // biome-ignore lint/suspicious/noExplicitAny: TODO fix
			(u8aToHex as any).mockReturnValue("hexSignedRequestHash"); // biome-ignore lint/suspicious/noExplicitAny: TODO fix
			(shuffleArray as any).mockReturnValue([]);

			const result = await imgCaptchaManager.getRandomCaptchasAndRequestHash(
				datasetId,
				userAccount,
				ipAddress,
				captchaConfig,
				0.8,
			);

			expect(result).toEqual({
				captchas: [],
				requestHash: "computedHash",
				timestamp: expect.any(Number),
				signedRequestHash: "hexSignedRequestHash",
			});
		});

		it("should throw an error if dataset details are not found", async () => {
			const datasetId = "datasetId";
			const userAccount = "userAccount";
			const ipAddress = getIPAddress("1.1.1.1");
			const headers: RequestHeaders = { a: "1", b: "2", c: "3" };

			// biome-ignore lint/suspicious/noExplicitAny: TODO fix
			(db.getDatasetDetails as any).mockResolvedValue(null);

			await expect(
				imgCaptchaManager.getRandomCaptchasAndRequestHash(
					datasetId,
					userAccount,
					ipAddress,
					{ solved: { count: 1 }, unsolved: { count: 1 } },
					0.8,
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

		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		const logFn = (logger.info as any).mock.calls[0][0];
		const logObj = logFn();
		expect(logObj).toMatchObject({
			msg: "Deadline for responding to captcha has expired",
		});
	});

	it("should get dapp user commitment by ID", async () => {
		const commitmentId = "commitmentId";
		const dappUserCommitment: UserCommitment = {
			id: "commitmentId",
			userAccount: "userAccount",
			dappAccount: "dappAccount",
			providerAccount: "providerAccount",
			datasetId: "datasetId",
			result: { status: CaptchaStatus.approved },
			userSignature: "",
			userSubmitted: true,
			serverChecked: false,
			requestedAtTimestamp: 0,
			ipAddress: getIPAddress("1.1.1.1").bigInt(),
			headers: { a: "1", b: "2", c: "3" },
			ja4: "ja4",
			lastUpdatedTimestamp: Date.now(),
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
		const dappAccount = "dappAccount";
		const dappUserCommitments: UserCommitment[] = [
			{
				id: "commitmentId",
				userAccount,
				dappAccount,
				providerAccount: "providerAccount",
				datasetId: "datasetId",
				result: { status: CaptchaStatus.approved },
				userSignature: "",
				userSubmitted: true,
				serverChecked: false,
				requestedAtTimestamp: 0,
				ipAddress: getIPAddress("1.1.1.1").bigInt(),
				headers: { a: "1", b: "2", c: "3" },
				ja4: "ja4",
				lastUpdatedTimestamp: Date.now(),
			},
		];
		// biome-ignore lint/suspicious/noExplicitAny: TODO fix
		(db.getDappUserCommitmentByAccount as any).mockResolvedValue(
			dappUserCommitments,
		);

		const result = await imgCaptchaManager.getDappUserCommitmentByAccount(
			userAccount,
			dappAccount,
		);

		expect(result).toEqual(dappUserCommitments[0]);
	});

	it("should return undefined if no approved dapp user commitment is found by account", async () => {
		const userAccount = "userAccount";
		const dappAccount = "dappAccount";
		const dappUserCommitments: UserCommitment[] = [];
		// biome-ignore lint/suspicious/noExplicitAny: TODO fix
		(db.getDappUserCommitmentByAccount as any).mockResolvedValue(
			dappUserCommitments,
		);

		const result = await imgCaptchaManager.getDappUserCommitmentByAccount(
			userAccount,
			dappAccount,
		);

		expect(result).toBeUndefined();
	});

	it("should fail the user if an ip is passed up and it does not match the ip address stored in the commitment", async () => {
		const userAccount = "userAccount";
		const dappAccount = "dappAccount";
		const ipAddress = "1.1.1.1";
		const dappUserCommitment: UserCommitment = {
			id: "commitmentId",
			userAccount,
			dappAccount,
			providerAccount: "providerAccount",
			datasetId: "datasetId",
			result: { status: CaptchaStatus.approved },
			userSignature: "",
			userSubmitted: true,
			serverChecked: false,
			requestedAtTimestamp: 0,
			ipAddress: getIPAddress("8.8.8.8").bigInt(),
			headers: { a: "1", b: "2", c: "3" },
			ja4: "ja4",
		};

		// biome-ignore lint/suspicious/noExplicitAny: TODO fix
		(db.getDappUserCommitmentById as any).mockResolvedValue(dappUserCommitment);

		const verifyResult = await imgCaptchaManager.verifyImageCaptchaSolution(
			userAccount,
			dappAccount,
			"commitmentId",
			undefined,
			ipAddress,
		);
		expect(verifyResult.verified).toBe(false);

		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		const logFn = (logger.debug as any).mock.calls[1][0];
		const logObj = logFn();
		expect(logObj).toMatchObject({
			msg: "IP address mismatch",
			data: {
				ip: "1.1.1.1",
				solutionIp: "8.8.8.8",
			},
		});
	});
});
