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

import { stringToHex, u8aToHex } from "@polkadot/util";
import { type Logger, ProsopoEnvError } from "@prosopo/common";
import {
	compareCaptchaSolutions,
	computePendingRequestHash,
	parseAndSortCaptchaSolutions,
} from "@prosopo/datasets";
import {
	ApiParams,
	type BehavioralDataPacked,
	type Captcha,
	type CaptchaSolution,
	CaptchaStatus,
	CaptchaType,
	DEFAULT_IMAGE_CAPTCHA_TIMEOUT,
	type DappUserSolutionResult,
	DecisionMachineDecision,
	type DecisionMachineInput,
	type Hash,
	type IPAddress,
	type ISpamFilterRules,
	type ITrafficFilter,
	type ImageVerificationResponse,
	type KeyringPair,
	type PendingImageCaptchaRequest,
	type ProsopoCaptchaCountConfigSchemaOutput,
	type ProsopoConfigOutput,
	type RequestHeaders,
	type UserCommitment,
} from "@prosopo/types";
import type { ClientRecord, IProviderDatabase } from "@prosopo/types-database";
import type { ProviderEnvironment } from "@prosopo/types-env";
import type { AccessRulesStorage } from "@prosopo/user-access-policy";
import { at, extractData } from "@prosopo/util";
import { randomAsHex, signatureVerify } from "@prosopo/util-crypto";
import {
	getCompositeIpAddress,
	getIpAddressFromComposite,
} from "../../compositeIpAddress.js";
import { constructPairList, containsIdenticalPairs } from "../../pairs.js";
import { checkLangRules } from "../../rules/lang.js";
import { deepValidateIpAddress, shuffleArray } from "../../util.js";
import { CaptchaManager } from "../captchaManager.js";
import { DecisionMachineRunner } from "../decisionMachine/decisionMachineRunner.js";
import { FrictionlessReason } from "../frictionless/frictionlessTasks.js";
import { computeFrictionlessScore } from "../frictionless/frictionlessTasksUtils.js";
import { checkTrafficFilter } from "../spam/checkTrafficFilter.js";
import { evaluateEmailSpamRules } from "../spam/evaluateEmailSpamRules.js";
import { buildTreeAndGetCommitmentId } from "./imgCaptchaTasksUtils.js";

export class ImgCaptchaManager extends CaptchaManager {
	private decisionMachineRunner: DecisionMachineRunner;

	constructor(
		db: IProviderDatabase,
		pair: KeyringPair,
		config: ProsopoConfigOutput,
		logger?: Logger,
	) {
		super(db, pair, config, logger);
		this.config = config;
		this.decisionMachineRunner = new DecisionMachineRunner(db);
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
		datasetId: Hash,
		userAccount: string,
		ipAddress: IPAddress,
		captchaConfig: ProsopoCaptchaCountConfigSchemaOutput,
		threshold: number,
		sessionId?: string,
		countryCode?: string,
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
			Math.trunc(captchaConfig.unsolved.count),
		);
		const solvedCount: number = Math.abs(
			Math.trunc(captchaConfig.solved.count),
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
		const deadlineDate = new Date(timeLimit + currentTime);

		await this.db.storePendingImageCommitment(
			userAccount,
			requestHash,
			salt,
			deadlineDate,
			new Date(currentTime),
			getCompositeIpAddress(ipAddress),
			threshold,
			sessionId,
			countryCode,
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
	 * @param userTimestampSignature
	 * @param timestamp
	 * @param providerRequestHashSignature
	 * @param ipAddress
	 * @param headers
	 * @param ja4
	 * @param behavioralData
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
		ipAddress: IPAddress,
		headers: RequestHeaders,
		ja4: string,
		behavioralData?: string,
	): Promise<DappUserSolutionResult> {
		// check that the signature is valid (i.e. the user has signed the request hash with their private key, proving they own their account)
		const verification = signatureVerify(
			stringToHex(timestamp.toString()),
			userTimestampSignature,
			userAccount,
		);
		if (!verification.isValid) {
			// the signature is not valid, so the user is not the owner of the account. May have given a false account address with good reputation in an attempt to impersonate
			const err = new ProsopoEnvError("GENERAL.INVALID_SIGNATURE", {
				context: { failedFuncName: this.dappUserSolution.name, userAccount },
			});
			this.logger.info(() => ({
				err,
				msg: "Invalid user timestamp signature",
			}));
			throw err;
		}

		// check that the requestHash signature is valid and signed by the provider
		const providerRequestHashSignatureVerify = signatureVerify(
			stringToHex(requestHash.toString()),
			providerRequestHashSignature,
			this.pair.address,
		);

		if (!providerRequestHashSignatureVerify.isValid) {
			// the signature is not valid, so the user is not the owner of the account. May have given a false account address with good reputation in an attempt to impersonate
			const err = new ProsopoEnvError("GENERAL.INVALID_SIGNATURE", {
				context: {
					failedFuncName: this.dappUserSolution.name,
					userAccount,
					error: "requestHash signature is invalid",
				},
			});
			this.logger.info(() => ({
				err,
				msg: "Invalid provider requestHash signature",
			}));
			throw err;
		}

		let response: DappUserSolutionResult = {
			captchas: [],
			verified: false,
		};

		const pendingRecord = await this.db.getPendingImageCommitment(requestHash);

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

			const flat = receivedCaptchas.map((c) => extractData(c.salt));
			const pairs = flat.map((list) => constructPairList(list));

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
			await this.db.updatePendingImageCommitmentStatus(requestHash);

			// Get countryCode from session if available, otherwise use fallback
			let countryCode: string | undefined;
			if (pendingRecord.sessionId) {
				const sessionRecord = await this.db.getSessionRecordBySessionId(
					pendingRecord.sessionId,
				);
				countryCode = sessionRecord?.countryCode;
			}

			// Process behavioral data if provided
			let behavioralDataPacked: BehavioralDataPacked | undefined;
			let deviceCapability: string | undefined;
			if (behavioralData) {
				try {
					// Get decryption keys: detector keys from DB first, then env var as fallback
					const decryptKeys = [
						// Process DB keys first, then env var key last as env key will likely be invalid
						...(await this.getDetectorKeys()),
						process.env.BOT_DECRYPTION_KEY,
					];

					// Decrypt the behavioral data (returns unpacked format)
					const decryptedData = await this.decryptBehavioralData(
						behavioralData,
						decryptKeys,
					);

					if (decryptedData) {
						// Log behavioral analytics using unpacked data counts
						this.logger?.info(() => ({
							msg: "Behavioral analysis completed",
							data: {
								userAccount,
								dappAccount,
								requestHash,
								mouseEventsCount: decryptedData.collector1?.length || 0,
								touchEventsCount: decryptedData.collector2?.length || 0,
								clickEventsCount: decryptedData.collector3?.length || 0,
								deviceCapability: decryptedData.deviceCapability,
							},
						}));

						// Convert to packed format for storage
						behavioralDataPacked = {
							c1: decryptedData.collector1 || [],
							c2: decryptedData.collector2 || [],
							c3: decryptedData.collector3 || [],
							d: decryptedData.deviceCapability,
						};

						deviceCapability = decryptedData.deviceCapability;
					}
				} catch (error) {
					this.logger?.error(() => ({
						msg: "Failed to process behavioral data",
						err: error,
					}));
					// Don't fail the captcha if behavioral analysis fails
				}
			}

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
				requestedAtTimestamp: new Date(timestamp),
				ipAddress: getCompositeIpAddress(ipAddress),
				headers,
				sessionId: pendingRecord.sessionId,
				ja4,
				countryCode,
				pending: false,
				salt: pendingRecord.salt,
				requestHash: pendingRecord[ApiParams.requestHash],
				threshold: pendingRecord.threshold,
				deadlineTimestamp: pendingRecord.deadlineTimestamp,
				...(behavioralDataPacked && { behavioralDataPacked }),
				...(deviceCapability && { deviceCapability }),
			};
			await this.db.storeUserImageCaptchaSolution(receivedCaptchas, commit);

			const solutionRecords = await Promise.all(
				storedCaptchas.map(async (captcha) => {
					const solutionRecord = await this.db.getSolutionByCaptchaId(
						captcha.captchaId,
					);
					if (!solutionRecord) {
						throw new ProsopoEnvError("CAPTCHA.SOLUTION_NOT_FOUND", {
							context: { failedFuncName: this.dappUserSolution.name },
						});
					}
					return solutionRecord;
				}),
			);

			const totalImages = storedCaptchas[0]?.items.length || 0;

			if (containsIdenticalPairs(pairs) && process.env.NODE_ENV !== "test") {
				// Write commitment disapproval and session update in parallel
				const writePromises: Promise<void>[] = [
					this.db.disapproveDappUserCommitment(
						commitmentId,
						"CAPTCHA.INVALID_SOLUTION",
						pairs,
					),
				];
				if (pendingRecord.sessionId) {
					writePromises.push(
						this.db.updateSessionRecord(pendingRecord.sessionId, {
							userSubmitted: true,
							result: {
								status: CaptchaStatus.disapproved,
								reason: "CAPTCHA.INVALID_SOLUTION",
							},
						}),
					);
				}
				await Promise.all(writePromises);
				response = {
					captchas: captchaIds.map((id) => ({
						captchaId: id,
						proof: [[]],
					})),
					verified: false,
				};
				return response;
			}

			if (
				compareCaptchaSolutions(
					receivedCaptchas,
					solutionRecords,
					totalImages,
					pendingRecord.threshold,
				)
			) {
				response = {
					captchas: captchaIds.map((id) => ({
						captchaId: id,
						proof: tree.proof(id),
					})),
					verified: true,
				};
				// Write commitment approval and session update in parallel
				const writePromises: Promise<void>[] = [
					this.db.approveDappUserCommitment(commitmentId, pairs),
				];
				if (pendingRecord.sessionId) {
					writePromises.push(
						this.db.updateSessionRecord(pendingRecord.sessionId, {
							userSubmitted: true,
							result: { status: CaptchaStatus.approved },
						}),
					);
				}
				await Promise.all(writePromises);
			} else {
				// Write commitment disapproval and session update in parallel
				const writePromises: Promise<void>[] = [
					this.db.disapproveDappUserCommitment(
						commitmentId,
						"CAPTCHA.INVALID_SOLUTION",
						pairs,
					),
				];
				if (pendingRecord.sessionId) {
					writePromises.push(
						this.db.updateSessionRecord(pendingRecord.sessionId, {
							userSubmitted: true,
							result: {
								status: CaptchaStatus.disapproved,
								reason: "CAPTCHA.INVALID_SOLUTION",
							},
						}),
					);
				}
				await Promise.all(writePromises);
				response = {
					captchas: captchaIds.map((id) => ({
						captchaId: id,
						proof: [[]],
					})),
					verified: false,
				};
			}
		} else {
			this.logger.info(() => ({
				msg: "Request hash not found",
			}));
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
	 * @param {PendingImageCaptchaRequest} pendingRecord
	 * @param {string} userAccount
	 * @param {string[]} captchaIds
	 */
	async validateDappUserSolutionRequestIsPending(
		requestHash: string,
		pendingRecord: PendingImageCaptchaRequest,
		userAccount: string,
		captchaIds: string[],
	): Promise<boolean> {
		const currentTime = new Date();
		// only proceed if there is a pending record
		if (!pendingRecord) {
			this.logger.info(() => ({
				msg: "No pending record found",
			}));
			return false;
		}

		if (pendingRecord.deadlineTimestamp < currentTime) {
			// deadline for responding to the captcha has expired
			this.logger.info(() => ({
				msg: "Deadline for responding to captcha has expired",
			}));
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
		env: ProviderEnvironment,
		maxVerifiedTime?: number,
		ip?: string,
		disallowWebView?: boolean,
		contextAwareEnabled = false,
		userAccessRulesStorage?: AccessRulesStorage,
		email?: string,
		spamEmailDomainCheckingEnabled = false,
		spamFilter?: ISpamFilterRules,
		trafficFilter?: ITrafficFilter,
	): Promise<ImageVerificationResponse> {
		const solution = await (commitmentId
			? this.getDappUserCommitmentById(commitmentId)
			: this.getDappUserCommitmentByAccount(user, dapp));

		// No solution exists
		if (!solution) {
			this.logger.debug(() => ({
				msg: "Not verified - no solution found",
			}));
			return {
				status: "API.USER_NOT_VERIFIED_NO_SOLUTION",
				verified: false,
			};
		}

		// -- WARNING ---- WARNING ---- WARNING ---- WARNING ---- WARNING ---- WARNING ---- WARNING ---- WARNING --
		// Do not move this code down or put any other code before it. We want to drop out as early as possible if the
		// solution has already been checked by the server. Moving this code around could result in solutions being
		// re-usable.
		if (solution.serverChecked) {
			return {
				status: "API.USER_ALREADY_VERIFIED",
				verified: false,
			};
		}

		await this.db.markDappUserCommitmentsChecked([solution.id]);
		// -- END WARNING --

		// A solution exists but is disapproved
		if (solution.result.status === CaptchaStatus.disapproved) {
			return {
				status: solution.result.reason || "API.USER_NOT_VERIFIED",
				verified: false,
			};
		}

		maxVerifiedTime = maxVerifiedTime || 60 * 1000; // Default to 1 minute

		// Check if solution was completed recently
		const currentTime = Date.now();
		const timeSinceCompletion =
			currentTime - solution.requestedAtTimestamp.getTime();

		// A solution exists but has timed out
		if (timeSinceCompletion > maxVerifiedTime) {
			this.logger.debug(() => ({
				msg: "Not verified - timed out",
			}));
			return {
				status: "API.USER_NOT_VERIFIED_TIME_EXPIRED",
				verified: false,
			};
		}

		// Accumulate commitment updates in memory to batch writes.
		// Instead of writing after each check, we collect all updates and
		// perform a single batch write at the end.
		const commitmentUpdates: Partial<UserCommitment> = {};
		let failStatus: string | undefined;

		// Check user access policies for hard blocks
		if (userAccessRulesStorage) {
			try {
				const blockPolicy = await this.checkForHardBlock(
					userAccessRulesStorage,
					solution,
					solution.userAccount,
					solution.headers,
					solution.coords,
					solution.countryCode,
				);

				if (blockPolicy) {
					this.logger.info(() => ({
						msg: "User blocked by access policy in server image verification",
						data: {
							userAccount: solution.userAccount,
							dappAccount: solution.dappAccount,
							policy: blockPolicy,
						},
					}));
					commitmentUpdates.result = {
						status: CaptchaStatus.disapproved,
						reason: "API.ACCESS_POLICY_BLOCK" as const,
					};
					failStatus = "API.ACCESS_POLICY_BLOCK";
				}
			} catch (error) {
				this.logger.warn(() => ({
					msg: "Failed to check user access policies in server Image verification",
					error,
				}));
			}
		}

		// Check email domain against spam list if email is provided
		if (!failStatus && email && spamEmailDomainCheckingEnabled) {
			try {
				const isSpam = await this.checkSpamEmail(email);
				if (isSpam) {
					const emailDomain = email.split("@")[1] || "unknown";
					this.logger.info(() => ({
						msg: "Spam email domain detected in server image verification",
						data: { commitmentId, dapp, emailDomain },
					}));
					commitmentUpdates.result = {
						status: CaptchaStatus.disapproved,
						reason: "API.SPAM_EMAIL_DOMAIN",
					};
					failStatus = "API.SPAM_EMAIL_DOMAIN";
				}
			} catch (error) {
				this.logger.warn(() => ({
					msg: "Failed to check spam email domain in server image verification",
					error,
				}));
			}
		}

		// Spam filter: configurable per-site email pattern rules
		if (
			!failStatus &&
			spamFilter?.enabled &&
			spamFilter.emailRules?.enabled &&
			email
		) {
			const result = evaluateEmailSpamRules(email, spamFilter.emailRules);
			if (result.isSpam) {
				this.logger.info(() => ({
					msg: "Spam filter rejected email in image verification",
					data: { commitmentId, dapp, reason: result.reason },
				}));
				commitmentUpdates.result = {
					status: CaptchaStatus.disapproved,
					reason: "API.SPAM_EMAIL_RULE",
				};
				failStatus = "API.SPAM_EMAIL_RULE";
			}
		}

		// Traffic filter: block VPN/proxy/Tor/abuser etc.
		// blockAbuser defaults to true so abusive networks are always blocked
		if (!failStatus) {
			const effectiveTrafficFilter = { blockAbuser: true, ...trafficFilter };
			// if at least one true
			const hasTrafficFilter = Object.values(effectiveTrafficFilter).some(
				(v) => v,
			);
			if (ip && hasTrafficFilter) {
				const check = await checkTrafficFilter(
					ip,
					effectiveTrafficFilter,
					env.ipInfoService,
					this.logger,
				);
				if (check.isBlocked) {
					this.logger.info(() => ({
						msg: "Traffic filter rejected request",
						data: { commitmentId, dapp, ip, reason: check.reason },
					}));
					commitmentUpdates.result = {
						status: CaptchaStatus.disapproved,
						reason: check.reason,
					};
					failStatus = check.reason;
				}
			}
		}

		// IP validation: accumulate providedIp update
		if (ip) {
			const solutionIpAddress = getIpAddressFromComposite(solution.ipAddress);
			// Get client settings for IP validation rules
			const clientRecord = await this.db.getClientRecord(dapp);

			const ipValidationRules = clientRecord?.settings?.ipValidationRules;

			// Accumulate providedIp instead of writing immediately
			commitmentUpdates.providedIp = getCompositeIpAddress(ip);

			if (!failStatus && ipValidationRules?.enabled === true) {
				const ipValidation = await deepValidateIpAddress(
					ip,
					solutionIpAddress,
					this.logger,
					env.ipInfoService,
					ipValidationRules,
				);

				if (!ipValidation.isValid) {
					this.logger.error(() => ({
						msg: "IP validation failed for image captcha",
						data: {
							ip,
							solutionIp: solutionIpAddress.address,
							error: ipValidation.errorMessage,
							distanceKm: ipValidation.distanceKm,
						},
					}));
					failStatus = "API.FAILED_IP_VALIDATION";
				}
			}
		}

		let isApproved =
			!failStatus && solution.result.status === CaptchaStatus.approved;
		let failureStatus = failStatus || "API.USER_NOT_VERIFIED";

		let score: number | undefined;
		if (solution.sessionId) {
			const sessionRecord = await this.db.getSessionRecordBySessionId(
				solution.sessionId,
			);
			if (sessionRecord) {
				score = computeFrictionlessScore(sessionRecord?.scoreComponents);
				this.logger.info(() => ({
					data: {
						scoreComponents: sessionRecord?.scoreComponents,
						score: score,
					},
				}));

				if (
					disallowWebView === true &&
					(sessionRecord.scoreComponents.webView || 0) > 0
				) {
					this.logger.info(() => ({
						msg: "Disallowing webview access - user not verified",
					}));
					return {
						status: "API.DISALLOWED_WEBVIEW",
						verified: false,
					};
				}
				if (
					contextAwareEnabled &&
					sessionRecord.reason ===
						FrictionlessReason.CONTEXT_AWARE_VALIDATION_FAILED
				) {
					this.logger.info(() => ({
						msg: "Context aware validation failed",
					}));
					//return { status: "API.USER_NOT_VERIFIED", verified: false };
				}
			}
		}

		// Decision machine evaluation (only if still approved)
		if (isApproved) {
			const decisionInput: DecisionMachineInput = {
				userAccount: solution.userAccount,
				dappAccount: solution.dappAccount,
				captchaResult: "passed",
				headers: solution.headers,
				captchaType: CaptchaType.image,
				countryCode: solution.countryCode,
			};

			try {
				const decision = await this.decisionMachineRunner.decide(
					decisionInput,
					this.logger,
				);
				if (decision.decision === DecisionMachineDecision.Deny) {
					const dmReason = decision.reason || "CAPTCHA.DECISION_MACHINE_DENIED";
					this.logger?.info(() => ({
						msg: "Decision machine denied user verification",
						data: {
							commitmentId,
							reason: decision.reason,
						},
					}));
					commitmentUpdates.result = {
						status: CaptchaStatus.disapproved,
						reason: dmReason,
					};
					isApproved = false;
					failureStatus = dmReason;
				}
			} catch (error) {
				this.logger?.error(() => ({
					msg: "Failed to process decision machine",
					err: error,
				}));
			}
		}

		// Batch writes: separate non-streaming updates from streaming result writes.
		// - providedIp uses updateDappUserCommitment (no central streaming)
		// - approve/disapprove use dedicated methods that trigger centralStreamer
		const writePromises: Promise<void>[] = [];

		// Write providedIp if accumulated (non-streaming field)
		if (commitmentUpdates.providedIp) {
			writePromises.push(
				this.db.updateDappUserCommitment(solution.id, {
					providedIp: commitmentUpdates.providedIp,
				}),
			);
		}

		// Write result via the streaming-aware methods
		if (commitmentId) {
			if (isApproved) {
				writePromises.push(
					this.db.approveDappUserCommitment(commitmentId),
				);
			} else if (commitmentUpdates.result) {
				writePromises.push(
					this.db.disapproveDappUserCommitment(
						commitmentId,
						commitmentUpdates.result.reason,
					),
				);
			}
		}

		// Update session with final server verification result (different collection)
		const finalResult = isApproved
			? { status: CaptchaStatus.approved as const }
			: commitmentUpdates.result || {
					status: CaptchaStatus.disapproved as const,
					reason: failureStatus,
				};

		if (solution.sessionId) {
			writePromises.push(
				this.db.updateSessionRecord(
					solution.sessionId,
					{
						serverChecked: true,
						result: finalResult,
					},
					true,
				),
			);
		}

		if (writePromises.length > 0) {
			await Promise.all(writePromises);
		}

		return {
			status: isApproved ? "API.USER_VERIFIED" : failureStatus,
			verified: isApproved,
			commitmentId: solution.id.toString(),
			...(score && { score }),
		};
	}

	checkLangRules(acceptLanguage: string): number {
		return checkLangRules(this.config, acceptLanguage);
	}

	override getVerificationResponse(
		verified: boolean,
		clientRecord: ClientRecord,
		translateFn: (key: string) => string,
		score?: number,
		commitmentId?: Hash,
		reason?: string,
	): ImageVerificationResponse {
		return {
			...super.getVerificationResponse(
				verified,
				clientRecord,
				translateFn,
				score,
				reason,
			),
			...(commitmentId && {
				[ApiParams.commitmentId]: commitmentId,
			}),
		};
	}
}
