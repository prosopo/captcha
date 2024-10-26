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
import { stringToHex, u8aToHex } from "@polkadot/util";
import { randomAsHex, signatureVerify } from "@polkadot/util-crypto";
import { type Logger, ProsopoEnvError } from "@prosopo/common";
import {
	compareCaptchaSolutions,
	computePendingRequestHash,
	parseAndSortCaptchaSolutions,
} from "@prosopo/datasets";
import {
	type Captcha,
	type CaptchaConfig,
	type CaptchaSolution,
	CaptchaStatus,
	DEFAULT_IMAGE_CAPTCHA_TIMEOUT,
	type DappUserSolutionResult,
	type Hash,
	type ImageVerificationResponse,
	type PendingCaptchaRequest,
	type RequestHeaders,
} from "@prosopo/types";
import type {
	IProviderDatabase,
	UserCommitment,
} from "@prosopo/types-database";
import { at } from "@prosopo/util";
import { shuffleArray } from "../../util.js";
import { buildTreeAndGetCommitmentId } from "./imgCaptchaTasksUtils.js";
import {Address4, Address6} from "ip-address";

export class ImgCaptchaManager {
	db: IProviderDatabase;
	pair: KeyringPair;
	logger: Logger;
	captchaConfig: CaptchaConfig;

	constructor(
		db: IProviderDatabase,
		pair: KeyringPair,
		logger: Logger,
		captchaConfig: CaptchaConfig,
	) {
		this.db = db;
		this.pair = pair;
		this.logger = logger;
		this.captchaConfig = captchaConfig;
	}

	async getCaptchaWithProof(
		datasetId: Hash,
		solved: boolean,
		size: number,
	): Promise<Captcha[]> {
		const captchaDocs = await this.db.getRandomCaptcha(solved, datasetId, size);
		if (!captchaDocs) {
			throw new ProsopoEnvError("DATABASE.CAPTCHA_GET_FAILED", {
				context: {
					failedFuncName: this.getCaptchaWithProof.name,
					datasetId,
					solved,
					size,
				},
			});
		}

		return captchaDocs;
	}

	async getRandomCaptchasAndRequestHash(
		datasetId: string,
		userAccount: string,
		ipAddress: Address4 | Address6,
		headers: RequestHeaders,
	): Promise<{
		captchas: Captcha[];
		requestHash: string;
		timestamp: number;
		signedRequestHash: string;
	}> {
		const dataset = await this.db.getDatasetDetails(datasetId);
		if (!dataset) {
			throw new ProsopoEnvError("DATABASE.DATASET_GET_FAILED", {
				context: {
					failedFuncName: this.getRandomCaptchasAndRequestHash.name,
					dataset,
					datasetId,
				},
			});
		}

		const unsolvedCount: number = Math.abs(
			Math.trunc(this.captchaConfig.unsolved.count),
		);
		const solvedCount: number = Math.abs(
			Math.trunc(this.captchaConfig.solved.count),
		);

		if (!solvedCount) {
			throw new ProsopoEnvError("CONFIG.INVALID_CAPTCHA_NUMBER");
		}

		const solved = await this.getCaptchaWithProof(datasetId, true, solvedCount);
		let unsolved: Captcha[] = [];
		if (unsolvedCount) {
			unsolved = await this.getCaptchaWithProof(
				datasetId,
				false,
				unsolvedCount,
			);
		}
		const captchas: Captcha[] = shuffleArray([...solved, ...unsolved]);
		const salt = randomAsHex();

		const requestHash = computePendingRequestHash(
			captchas.map((c) => c.captchaId),
			userAccount,
			salt,
		);

		const currentTime = Date.now();
		const signedRequestHash = u8aToHex(
			this.pair.sign(stringToHex(requestHash)),
		);

		const timeLimit = captchas
			// if 2 captchas with 30s time limit, this will add to 1 minute (30s * 2)
			.map((captcha) => captcha.timeLimitMs || DEFAULT_IMAGE_CAPTCHA_TIMEOUT)
			.reduce((a, b) => a + b, 0);
		const deadlineTs = timeLimit + currentTime;
		const currentBlockNumber = 0; //TEMP
		await this.db.storeDappUserPending(
			userAccount,
			requestHash,
			salt,
			deadlineTs,
			currentTime,
			ipAddress.bigInt(),
			headers,
		);
		return {
			captchas,
			requestHash,
			timestamp: currentTime,
			signedRequestHash,
		};
	}

	/**
	 * Validate and store the text captcha solution(s) from the Dapp User in a web2 environment
	 * @param {string} userAccount
	 * @param {string} dappAccount
	 * @param {string} requestHash
	 * @param {JSON} captchas
	 * @param {string} userRequestHashSignature
	 * @param timestamp
	 * @param providerRequestHashSignature
	 * @param ipAddress
	 * @param headers
	 * @return {Promise<DappUserSolutionResult>} result containing the contract event
	 */
	async dappUserSolution(
		userAccount: string,
		dappAccount: string,
		requestHash: string,
		captchas: CaptchaSolution[],
		userTimestampSignature: string, // the signature to indicate ownership of account
		timestamp: number,
		providerRequestHashSignature: string,
		ipAddress: BigInt,
		headers: RequestHeaders,
	): Promise<DappUserSolutionResult> {
		// check that the signature is valid (i.e. the user has signed the request hash with their private key, proving they own their account)
		const verification = signatureVerify(
			stringToHex(timestamp.toString()),
			userTimestampSignature,
			userAccount,
		);
		if (!verification.isValid) {
			// the signature is not valid, so the user is not the owner of the account. May have given a false account address with good reputation in an attempt to impersonate
			this.logger.info("Invalid user timestamp signature");
			throw new ProsopoEnvError("GENERAL.INVALID_SIGNATURE", {
				context: { failedFuncName: this.dappUserSolution.name, userAccount },
			});
		}

		// check that the requestHash signature is valid and signed by the provider
		const providerRequestHashSignatureVerify = signatureVerify(
			stringToHex(requestHash.toString()),
			providerRequestHashSignature,
			this.pair.address,
		);

		if (!providerRequestHashSignatureVerify.isValid) {
			this.logger.info("Invalid provider requestHash signature");
			// the signature is not valid, so the user is not the owner of the account. May have given a false account address with good reputation in an attempt to impersonate
			throw new ProsopoEnvError("GENERAL.INVALID_SIGNATURE", {
				context: {
					failedFuncName: this.dappUserSolution.name,
					userAccount,
					error: "requestHash signature is invalid",
				},
			});
		}

		let response: DappUserSolutionResult = {
			captchas: [],
			verified: false,
		};

		const pendingRecord = await this.db.getDappUserPending(requestHash);

		const unverifiedCaptchaIds = captchas.map((captcha) => captcha.captchaId);
		const pendingRequest = await this.validateDappUserSolutionRequestIsPending(
			requestHash,
			pendingRecord,
			userAccount,
			unverifiedCaptchaIds,
		);
		if (pendingRequest) {
			const { storedCaptchas, receivedCaptchas, captchaIds } =
				await this.validateReceivedCaptchasAgainstStoredCaptchas(captchas);

			const { tree, commitmentId } =
				buildTreeAndGetCommitmentId(receivedCaptchas);

			const datasetId = at(storedCaptchas, 0).datasetId;

			if (!datasetId) {
				throw new ProsopoEnvError("CAPTCHA.ID_MISMATCH", {
					context: { failedFuncName: this.dappUserSolution.name },
				});
			}

			// Only do stuff if the request is in the local DB
			// prevent this request hash from being used twice
			await this.db.updateDappUserPendingStatus(requestHash);
			const commit: UserCommitment = {
				id: commitmentId,
				userAccount: userAccount,
				dappAccount,
				providerAccount: this.pair.address,
				datasetId,
				result: { status: CaptchaStatus.pending },
				userSignature: userTimestampSignature,
				userSubmitted: true,
				serverChecked: false,
				requestedAtTimestamp: timestamp,
				ipAddress,
				headers,
			};
			await this.db.storeDappUserSolution(receivedCaptchas, commit);

			if (compareCaptchaSolutions(receivedCaptchas, storedCaptchas)) {
				response = {
					captchas: captchaIds.map((id) => ({
						captchaId: id,
						proof: tree.proof(id),
					})),
					verified: true,
				};
				await this.db.approveDappUserCommitment(commitmentId);
			} else {
				await this.db.disapproveDappUserCommitment(
					commitmentId,
					"CAPTCHA.INVALID_SOLUTION",
				);
				response = {
					captchas: captchaIds.map((id) => ({
						captchaId: id,
						proof: [[]],
					})),
					verified: false,
				};
			}
		} else {
			this.logger.info("Request hash not found");
		}
		return response;
	}

	/**
	 * Validate length of received captchas array matches length of captchas found in database
	 * Validate that the datasetId is the same for all captchas and is equal to the datasetId on the stored captchas
	 */
	async validateReceivedCaptchasAgainstStoredCaptchas(
		captchas: CaptchaSolution[],
	): Promise<{
		storedCaptchas: Captcha[];
		receivedCaptchas: CaptchaSolution[];
		captchaIds: string[];
	}> {
		const receivedCaptchas = parseAndSortCaptchaSolutions(captchas);
		const captchaIds = receivedCaptchas.map((captcha) => captcha.captchaId);
		const storedCaptchas = await this.db.getCaptchaById(captchaIds);
		if (!storedCaptchas || receivedCaptchas.length !== storedCaptchas.length) {
			throw new ProsopoEnvError("CAPTCHA.INVALID_CAPTCHA_ID", {
				context: {
					failedFuncName:
						this.validateReceivedCaptchasAgainstStoredCaptchas.name,

					captchas,
				},
			});
		}
		if (
			!storedCaptchas.every(
				(captcha) => captcha.datasetId === at(storedCaptchas, 0).datasetId,
			)
		) {
			throw new ProsopoEnvError("CAPTCHA.DIFFERENT_DATASET_IDS", {
				context: {
					failedFuncName:
						this.validateReceivedCaptchasAgainstStoredCaptchas.name,
					captchas,
				},
			});
		}
		return { storedCaptchas, receivedCaptchas, captchaIds };
	}

	/**
	 * Validate that a Dapp User is responding to their own pending captcha request
	 * @param {string} requestHash
	 * @param {PendingCaptchaRequest} pendingRecord
	 * @param {string} userAccount
	 * @param {string[]} captchaIds
	 */
	async validateDappUserSolutionRequestIsPending(
		requestHash: string,
		pendingRecord: PendingCaptchaRequest,
		userAccount: string,
		captchaIds: string[],
	): Promise<boolean> {
		const currentTime = Date.now();
		// only proceed if there is a pending record
		if (!pendingRecord) {
			this.logger.info("No pending record found");
			return false;
		}

		if (pendingRecord.deadlineTimestamp < currentTime) {
			// deadline for responding to the captcha has expired
			this.logger.info("Deadline for responding to captcha has expired");
			return false;
		}
		if (pendingRecord) {
			const pendingHashComputed = computePendingRequestHash(
				captchaIds,
				userAccount,
				pendingRecord.salt,
			);
			return requestHash === pendingHashComputed;
		}
		return false;
	}

	/*
	 * Get dapp user solution from database
	 */
	async getDappUserCommitmentById(
		commitmentId: string,
	): Promise<UserCommitment> {
		const dappUserSolution =
			await this.db.getDappUserCommitmentById(commitmentId);
		if (!dappUserSolution) {
			throw new ProsopoEnvError("CAPTCHA.DAPP_USER_SOLUTION_NOT_FOUND", {
				context: {
					failedFuncName: this.getDappUserCommitmentById.name,
					commitmentId: commitmentId,
				},
			});
		}
		return dappUserSolution;
	}

	/* Check if dapp user has verified solution in cache */
	async getDappUserCommitmentByAccount(
		userAccount: string,
		dappAccount: string,
	): Promise<UserCommitment | undefined> {
		const dappUserSolutions = await this.db.getDappUserCommitmentByAccount(
			userAccount,
			dappAccount,
		);
		if (dappUserSolutions.length > 0) {
			for (const dappUserSolution of dappUserSolutions) {
				if (dappUserSolution.result.status === CaptchaStatus.approved) {
					return dappUserSolution;
				}
			}
		}
		return undefined;
	}

	async verifyImageCaptchaSolution(
		user: string,
		dapp: string,
		commitmentId: string | undefined,
		maxVerifiedTime?: number,
	): Promise<ImageVerificationResponse> {
		const solution = await (commitmentId
			? this.getDappUserCommitmentById(commitmentId)
			: this.getDappUserCommitmentByAccount(user, dapp));

		// No solution exists
		if (!solution) {
			this.logger.debug("Not verified - no solution found");
			return { status: "API.USER_NOT_VERIFIED_NO_SOLUTION", verified: false };
		}

		if (solution.serverChecked) {
			return { status: "API.USER_ALREADY_VERIFIED", verified: false };
		}
		// Mark solution as checked
		await this.db.markDappUserCommitmentsChecked([solution.id]);

		// A solution exists but is disapproved
		if (solution.result.status === CaptchaStatus.disapproved) {
			return { status: "API.USER_NOT_VERIFIED", verified: false };
		}

		maxVerifiedTime = maxVerifiedTime || 60 * 1000; // Default to 1 minute

		// Check if solution was completed recently
		if (maxVerifiedTime) {
			const currentTime = Date.now();
			const timeSinceCompletion = currentTime - solution.requestedAtTimestamp;

			// A solution exists but has timed out
			if (timeSinceCompletion > maxVerifiedTime) {
				this.logger.debug("Not verified - timed out");
				return {
					status: "API.USER_NOT_VERIFIED_TIME_EXPIRED",
					verified: false,
				};
			}
		}

		const isApproved = solution.result.status === CaptchaStatus.approved;
		return {
			status: isApproved ? "API.USER_VERIFIED" : "API.USER_NOT_VERIFIED",
			verified: isApproved,
			commitmentId: solution.id.toString(),
		};
	}
}
