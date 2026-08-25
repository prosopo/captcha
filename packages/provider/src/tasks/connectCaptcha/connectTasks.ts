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
import { ProsopoApiError, ProsopoEnvError } from "@prosopo/common";
import type { Logger } from "@prosopo/logger";
import type { KeyringPair, ProsopoConfigOutput } from "@prosopo/types";
import {
	CaptchaType,
	DecisionMachineDecision,
	type DecisionMachineInput,
} from "@prosopo/types";
import {
	ApiParams,
	type BehavioralDataPacked,
	type CaptchaResult,
	CaptchaStatus,
	type ClientMetaData,
	type ConnectEvent,
	type IPAddress,
	type ISpamFilterRules,
	type ITrafficFilter,
	POW_SEPARATOR,
	type PoWChallengeId,
	type RequestHeaders,
	ResultReason,
	SimdReadingsStage,
	isBlockingCaptchaResult,
} from "@prosopo/types";
import type { IProviderDatabase } from "@prosopo/types-database";
import type { ProviderEnvironment } from "@prosopo/types-env";
import {
	type AccessRulesStorage,
	describeMatchedRule,
} from "@prosopo/user-access-policy";
import {
	assertCoordsSafe,
	at,
	extractData,
	verifyRecency,
} from "@prosopo/util";
import {
	getCompositeIpAddress,
	getIpAddressFromComposite,
} from "../../compositeIpAddress.js";
import { deepValidateIpAddress } from "../../util.js";
import {
	type UsageCounters,
	buildAllWindowIncrements,
} from "../../util/usageCounters.js";
import { CaptchaManager } from "../captchaManager.js";
import {
	type ResolvedConnectSettings,
	generateConnectBoard,
} from "../connect/connectGenerator.js";
import { DecisionMachineRunner } from "../decisionMachine/decisionMachineRunner.js";
import {
	computeDnsAsymmetry,
	enrichDnsEvent,
	getIpInfoAsn,
} from "../dnsEvent/enrichDnsEvent.js";
import { computeFrictionlessScore } from "../frictionless/frictionlessTasksUtils.js";
import { checkPowSignature } from "../powCaptcha/powTasksUtils.js";
import { normaliseEmailForMatching } from "../spam/evaluateEmailSpamRules.js";
import { validateConnectSolution } from "./connectTasksUtils.js";

interface ConnectCaptchaChallenge {
	challenge: PoWChallengeId;
	/** Serialised board, one character per cell. */
	board: string;
	boardSize: number;
	lineLength: number;
	solutionSourceIndex: number;
	solutionTargetIndex: number;
	/** How many distinct icons the board uses; the renderer needs it. */
	iconCount: number;
	providerSignature: string;
	requestedAtTimestamp: number;
}

export class ConnectCaptchaManager extends CaptchaManager {
	POW_SEPARATOR: string;
	private decisionMachineRunner: DecisionMachineRunner;
	private readonly usageCounters: UsageCounters | null;

	constructor(
		db: IProviderDatabase,
		pair: KeyringPair,
		config: ProsopoConfigOutput,
		logger?: Logger,
		usageCounters?: UsageCounters | null,
	) {
		super(db, pair, config, logger);
		this.POW_SEPARATOR = POW_SEPARATOR;
		this.decisionMachineRunner = new DecisionMachineRunner(db);
		this.usageCounters = usageCounters ?? null;
	}

	/**
	 * @description Generates a Connect Captcha challenge for a given user and dapp
	 *
	 * @param {string} userAccount - user that is solving the captcha
	 * @param {string} dappAccount - dapp that is requesting the captcha
	 * @param origin - not currently used
	 * @param settings - resolved board geometry and layout tunables
	 */
	async getConnectCaptchaChallenge(
		userAccount: string,
		dappAccount: string,
		origin: string,
		settings: ResolvedConnectSettings,
	): Promise<ConnectCaptchaChallenge> {
		const requestedAtTimestamp = Date.now();

		// Create nonce for the challenge
		const nonce = Math.floor(Math.random() * 1000000);

		// Use blockhash, userAccount and dappAccount for string for challenge
		const challenge: PoWChallengeId = `${requestedAtTimestamp}___${userAccount}___${dappAccount}___${nonce}`;
		const challengeSignature = u8aToHex(this.pair.sign(stringToHex(challenge)));

		const layout = generateConnectBoard(settings);

		return {
			challenge,
			board: layout.board,
			boardSize: layout.boardSize,
			lineLength: layout.lineLength,
			solutionSourceIndex: layout.solutionSourceIndex,
			solutionTargetIndex: layout.solutionTargetIndex,
			iconCount: layout.iconCount,
			providerSignature: challengeSignature,
			requestedAtTimestamp,
		};
	}

	/**
	 * @description Verifies a Connect Captcha solution for a given user and dapp
	 *
	 * @param {string} challenge - the challenge string
	 * @param {string} providerChallengeSignature - proof that the Provider provided the challenge
	 * @param {number} sourceIndex - board cell the user picked a tile up from
	 * @param {number} targetIndex - empty board cell the user dropped it on
	 * @param {ConnectEvent[]} connectEvents - the drag event trail
	 * @param {number} timeout - the time in milliseconds since the Provider was selected to provide the captcha
	 * @param {string} userTimestampSignature
	 * @param ipAddress
	 * @param headers
	 * @param behavioralData
	 */
	async verifyConnectCaptchaSolution(
		challenge: PoWChallengeId,
		providerChallengeSignature: string,
		sourceIndex: number,
		targetIndex: number,
		connectEvents: ConnectEvent[],
		timeout: number,
		userTimestampSignature: string,
		ipAddress: IPAddress,
		headers: RequestHeaders,
		behavioralData?: string,
		salt?: string,
		simdReadings?: string,
		clientMetaData?: ClientMetaData,
	): Promise<boolean> {
		// Check signatures before doing DB reads to avoid unnecessary network connections
		checkPowSignature(
			challenge,
			providerChallengeSignature,
			this.pair.address,
			ApiParams.challenge,
		);

		const challengeSplit = challenge.split(this.POW_SEPARATOR);
		const timestamp = Number.parseInt(at(challengeSplit, 0));
		const userAccount = at(challengeSplit, 1);

		checkPowSignature(
			timestamp.toString(),
			userTimestampSignature,
			userAccount,
			ApiParams.timestamp,
		);

		const challengeRecord =
			await this.db.getConnectCaptchaRecordByChallenge(challenge);

		if (!challengeRecord) {
			this.logger.debug(() => ({
				msg: `No record of this challenge: ${challenge}`,
			}));
			// no record of this challenge
			return false;
		}

		// Extract coordinates from salt if provided — mirrors the POW
		// flow. Invalid salt input disapproves the request.
		let coords: [number, number][][] | undefined;
		let saltDecodeError: unknown;
		if (salt) {
			try {
				const extractedData = extractData(salt);
				if (extractedData.length >= 2) {
					const built: [number, number][][] = [
						[[extractedData[0], extractedData[1]] as [number, number]],
					];
					assertCoordsSafe(built, "coords");
					coords = built;
				}
			} catch (error) {
				saltDecodeError = error;
				this.logger.warn(() => ({
					msg: "Failed to extract coordinates from salt",
					error,
					salt,
				}));
			}
		}

		// Single-use challenge: refuse re-submission. Unlike POW (hash-bound),
		// the connect answer space is tiny — a board has at most a few hundred
		// (source, target) pairs — so each challenge must accept exactly one
		// submission or it could simply be enumerated.
		if (challengeRecord.userSubmitted) {
			this.logger.debug(() => ({
				msg: `Challenge already submitted: ${challenge}`,
			}));
			return false;
		}

		if (saltDecodeError) {
			const badSaltResult = {
				status: CaptchaStatus.disapproved,
				reason: ResultReason.CAPTCHA_INVALID_SALT,
			};
			await this.db.updateConnectCaptchaRecordResult(
				challenge,
				badSaltResult,
				false, // serverChecked
				true, // userSubmitted
				userTimestampSignature,
				undefined, // never persist the bad coords
			);
			if (challengeRecord.sessionId) {
				await this.updateSessionRecordWithCache(challengeRecord.sessionId, {
					userSubmitted: true,
					result: badSaltResult,
					// Stamp `blocked=true` so downstream aggregations (portal
					// Overview, audit search, etc.) can key off a single
					// field. See `isBlockingCaptchaResult`.
					...(isBlockingCaptchaResult(CaptchaType.connect, badSaltResult) && {
						blocked: true,
					}),
				});
			}
			return false;
		}

		if (!verifyRecency(challenge, timeout)) {
			const timeoutResult = {
				status: CaptchaStatus.disapproved,
				reason: ResultReason.CAPTCHA_INVALID_TIMESTAMP,
			};
			await this.db.updateConnectCaptchaRecordResult(
				challenge,
				timeoutResult,
				false, //serverchecked
				true, // usersubmitted
				userTimestampSignature,
				coords,
			);
			if (challengeRecord.sessionId) {
				await this.updateSessionRecordWithCache(challengeRecord.sessionId, {
					userSubmitted: true,
					result: timeoutResult,
					...(isBlockingCaptchaResult(CaptchaType.connect, timeoutResult) && {
						blocked: true,
					}),
				});
			}
			return false;
		}

		const correct = validateConnectSolution(
			challengeRecord.board,
			challengeRecord.boardSize,
			challengeRecord.lineLength,
			sourceIndex,
			targetIndex,
		);

		let result: CaptchaResult = { status: CaptchaStatus.approved };
		if (!correct) {
			result = {
				status: CaptchaStatus.disapproved,
				reason: ResultReason.CAPTCHA_INVALID_SOLUTION,
			};
		}

		// Solved-counter writes: fire-and-forget, only on a correct move.
		// Runs before any decision-machine veto.
		if (correct && this.usageCounters) {
			const dappAccount = at(challengeSplit, 2);
			this.usageCounters.incrManyAsync(
				dappAccount,
				buildAllWindowIncrements(
					"solved",
					CaptchaType.connect,
					ipAddress.address,
					userAccount,
				),
			);
		}

		// Persist the drag trail and the submitted move unconditionally so the
		// raw record survives even when the behavioural payload is absent or
		// its decryption fails (missing bundle, ciphertext / key mismatch,
		// etc.) — see the matching note on the puzzle flow, where gating this
		// write on decryption lost the trail for legitimate solves AND tripped
		// the "no-cache request with no behavioural data" DM rule.
		await this.db.updateConnectCaptchaRecord(challenge, {
			connectEvents,
			submittedSourceIndex: sourceIndex,
			submittedTargetIndex: targetIndex,
		});

		// Process behavioral data if provided
		if (behavioralData) {
			try {
				// The behavioural payload was encrypted by this session's detector
				// pool bundle; resolve it from the bundleId promoted onto the
				// session record (no key pool — the detector lives only on
				// providers).
				const bundle = await this.resolveBundleBySessionId(
					challengeRecord.sessionId,
				);

				// Decrypt the behavioral data (returns unpacked format)
				const decryptedData = await this.decryptBehavioralData(
					behavioralData,
					bundle,
				);

				if (decryptedData) {
					const dappAccount = at(challengeSplit, 2);
					// Log behavioral analytics using unpacked data counts
					this.logger?.info(() => ({
						msg: "Behavioral analysis completed",
						data: {
							userAccount,
							dappAccount,
							challenge,
							mouseEventsCount: decryptedData.collector1?.length || 0,
							touchEventsCount: decryptedData.collector2?.length || 0,
							clickEventsCount: decryptedData.collector3?.length || 0,
							deviceCapability: decryptedData.deviceCapability,
							captchaResult: correct ? "passed" : "failed",
						},
					}));

					// Convert to packed format for storage
					const packedData: BehavioralDataPacked = {
						c1: decryptedData.collector1 || [],
						c2: decryptedData.collector2 || [],
						c3: decryptedData.collector3 || [],
						d: decryptedData.deviceCapability,
					};

					await this.db.updateConnectCaptchaRecord(challenge, {
						behavioralDataPacked: packedData,
						deviceCapability: decryptedData.deviceCapability,
					});
				}
			} catch (error) {
				this.logger?.error(() => ({
					msg: "Failed to process behavioral data",
					err: error,
				}));
				// Don't fail the captcha if behavioral analysis fails
			}
		}

		if (clientMetaData?.hp) {
			await this.db.updateConnectCaptchaRecord(challenge, {
				clientMetaData: { hp: clientMetaData.hp },
			});
		}

		await this.db.updateConnectCaptchaRecordResult(
			challenge,
			result,
			false,
			true,
			userTimestampSignature,
			coords,
		);

		// Update the session record with submission result
		if (challengeRecord.sessionId) {
			const linkedSessionId = challengeRecord.sessionId;
			await this.updateSessionRecordWithCache(linkedSessionId, {
				userSubmitted: true,
				result,
				...(isBlockingCaptchaResult(CaptchaType.connect, result) && {
					blocked: true,
				}),
			});
			if (simdReadings) {
				await this.decryptAndAttachSimdReadingsIfAbsent(
					linkedSessionId,
					simdReadings,
					SimdReadingsStage.submit,
				);
			}
		}

		return correct;
	}

	/**
	 * @description Verifies a Connect Captcha for a given user and dapp. This is called by the server to verify the user's solution
	 * and update the record in the database to show that the user has solved the captcha
	 *
	 * @param {string} dappAccount - the dapp that is requesting the captcha
	 * @param {string} challenge - the challenge string
	 * @param {number} timeout - the time in milliseconds since the Provider was selected to provide the captcha
	 * @param env - provider environment
	 * @param ip - optional IP address for validation
	 * @param userAccessRulesStorage - storage for querying user access policies
	 * @param email
	 * @param spamEmailDomainCheckingEnabled
	 * @param spamFilter
	 * @param trafficFilter
	 * @param storeMetadata - when true, persists the dapp-server-provided
	 *   `email` on the captcha record for spam-rate analysis.
	 */
	async serverVerifyConnectCaptchaSolution(
		dappAccount: string,
		challenge: string,
		timeout: number,
		env: ProviderEnvironment,
		ip?: string,
		userAccessRulesStorage?: AccessRulesStorage,
		email?: string,
		spamEmailDomainCheckingEnabled = false,
		spamFilter?: ISpamFilterRules,
		trafficFilter?: ITrafficFilter,
		storeMetadata = false,
	): Promise<{ verified: boolean; score?: number }> {
		const notVerifiedResponse = { verified: false };

		// Bind the challenge/dappAccount context once so every log line in this
		// method carries it without repeating the fields in each `data` block.
		const logger = this.logger.with({ challenge, dappAccount });

		const challengeRecord =
			await this.db.getConnectCaptchaRecordByChallenge(challenge);

		if (!challengeRecord) {
			logger.debug(() => ({
				msg: `No record of this challenge: ${challenge}`,
			}));

			return notVerifiedResponse;
		}

		if (challengeRecord.result.status !== CaptchaStatus.approved) {
			throw new ProsopoApiError("CAPTCHA.INVALID_SOLUTION", {
				context: {
					code: 400,
					failedFuncName: this.serverVerifyConnectCaptchaSolution.name,
					challenge,
				},
			});
		}

		if (challengeRecord.serverChecked) return notVerifiedResponse;

		const challengeDappAccount = challengeRecord.dappAccount;

		if (dappAccount !== challengeDappAccount) {
			throw new ProsopoEnvError("CAPTCHA.DAPP_USER_SOLUTION_NOT_FOUND", {
				context: {
					failedFuncName: this.serverVerifyConnectCaptchaSolution.name,
					dappAccount,
					challengeDappAccount,
				},
			});
		}

		// -- WARNING ---- WARNING ---- WARNING ---- WARNING ---- WARNING ---- WARNING ---- WARNING ---- WARNING --
		// Do not move this code down or put any other code before it. We want to drop out as early as possible if the
		// solution has already been checked by the server. Moving this code around could result in solutions being
		// re-usable.
		await this.db.updateConnectCaptchaRecord(challengeRecord.challenge, {
			serverChecked: true,
			lastUpdatedTimestamp: new Date(),
		});
		// -- END WARNING --

		const submittedAt = challengeRecord.submittedAtTimestamp;
		const submitToVerifyMs =
			submittedAt instanceof Date
				? Date.now() - submittedAt.getTime()
				: Number.POSITIVE_INFINITY;
		if (submitToVerifyMs > timeout) {
			const disapprovedResult = {
				status: CaptchaStatus.disapproved,
				reason: ResultReason.TIMESTAMP_TOO_OLD,
			};
			const isBlocked = isBlockingCaptchaResult(
				CaptchaType.connect,
				disapprovedResult,
			);
			await this.db.updateConnectCaptchaRecord(challengeRecord.challenge, {
				result: disapprovedResult,
				...(isBlocked && { blocked: true }),
			});
			if (challengeRecord.sessionId) {
				await this.updateSessionRecordWithCache(challengeRecord.sessionId, {
					serverChecked: true,
					result: disapprovedResult,
					...(isBlocked && { blocked: true }),
				});
			}
			return notVerifiedResponse;
		}

		// Check user access policies for hard blocks
		if (userAccessRulesStorage) {
			try {
				const blockPolicy = await this.checkForHardBlock(
					userAccessRulesStorage,
					challengeRecord,
					challengeRecord.userAccount,
					challengeRecord.headers,
					challengeRecord.coords,
					challengeRecord.ipInfo?.isValid
						? challengeRecord.ipInfo.countryCode
						: undefined,
					challengeRecord.ipInfo?.isValid
						? challengeRecord.ipInfo.asnNumber
						: undefined,
				);

				if (blockPolicy) {
					logger.info(() => ({
						msg: "User blocked by access policy in server connect verification",
						data: {
							userAccount: challengeRecord.userAccount,
							policy: blockPolicy,
						},
					}));
					const blockedResult = {
						status: CaptchaStatus.disapproved,
						reason: ResultReason.ACCESS_POLICY_BLOCK,
					};
					const isBlocked = isBlockingCaptchaResult(
						CaptchaType.connect,
						blockedResult,
					);
					await this.db.updateConnectCaptchaRecord(challengeRecord.challenge, {
						result: blockedResult,
						...(isBlocked && { blocked: true }),
					});
					if (challengeRecord.sessionId) {
						await this.updateSessionRecordWithCache(challengeRecord.sessionId, {
							serverChecked: true,
							result: blockedResult,
							...(isBlocked && { blocked: true }),
							// Name the rule behind the ACCESS_POLICY_BLOCK on the
							// audit row. This path is where `deferToVerify` rules
							// land, which is precisely where "why was I rejected?"
							// is least obvious.
							matchedRule: describeMatchedRule(blockPolicy),
						});
					}
					return notVerifiedResponse;
				}
			} catch (error) {
				logger.warn(() => ({
					msg: "Failed to check user access policies in server connect verification",
					error,
				}));
			}
		}

		// Check email domain against spam list if email is provided
		if (email && spamEmailDomainCheckingEnabled) {
			try {
				const isSpam = await this.checkSpamEmail(email);
				if (isSpam) {
					const emailDomain = email.split("@")[1] || "unknown";
					logger.info(() => ({
						msg: "Spam email domain detected in server connect verification",
						data: { emailDomain },
					}));
					const spamResult = {
						status: CaptchaStatus.disapproved,
						reason: ResultReason.SPAM_EMAIL_DOMAIN,
					};
					await this.db.updateConnectCaptchaRecord(challengeRecord.challenge, {
						result: spamResult,
						...(isBlockingCaptchaResult(CaptchaType.connect, spamResult) && {
							blocked: true,
						}),
					});
					return notVerifiedResponse;
				}
			} catch (error) {
				logger.warn(() => ({
					msg: "Failed to check spam email domain in server connect verification",
					error,
				}));
			}
		}

		// Per-email submission-count check — see `imgCaptchaTasks` for the
		// full rationale. Runs before the metadata write below so the
		// count reflects PRIOR verified submissions only.
		const maxEmailSubmissionCount =
			spamFilter?.enabled && spamFilter.emailRules?.enabled
				? spamFilter.emailRules.maxEmailSubmissionCount
				: undefined;
		let emailNormalised: string | undefined;
		if (maxEmailSubmissionCount !== undefined && email && storeMetadata) {
			emailNormalised = normaliseEmailForMatching(email);
			if (emailNormalised) {
				try {
					const priorCount = await this.db.countCommitmentsByNormalisedEmail(
						dappAccount,
						emailNormalised,
					);
					if (priorCount >= maxEmailSubmissionCount) {
						logger.info(() => ({
							msg: "Email submission count exceeded in server connect verification",
							data: { priorCount, maxEmailSubmissionCount },
						}));
						const spamCountResult = {
							status: CaptchaStatus.disapproved,
							reason: ResultReason.SPAM_EMAIL_COUNT_EXCEEDED,
						};
						await this.db.updateConnectCaptchaRecord(
							challengeRecord.challenge,
							{
								result: spamCountResult,
								...(isBlockingCaptchaResult(
									CaptchaType.connect,
									spamCountResult,
								) && { blocked: true }),
							},
						);
						return notVerifiedResponse;
					}
				} catch (error) {
					logger.warn(() => ({
						msg: "Failed to check email submission count in server connect verification",
						error,
					}));
				}
			}
		}

		const sessionRecord = challengeRecord.sessionId
			? await this.getSessionRecordWithOriginFallback(challengeRecord.sessionId)
			: undefined;

		const enrichedDnsEvent = await enrichDnsEvent(
			sessionRecord?.dnsEvent,
			env.ipInfoService,
			ip ?? challengeRecord.ipInfo?.ip,
		);

		{
			const check = await this.resolveTrafficFilterCheck(
				env,
				challengeRecord.ipInfo,
				trafficFilter,
				ip,
				enrichedDnsEvent,
			);
			if (check.isBlocked) {
				logger.info(() => ({
					msg: "Traffic filter rejected request in connect verification",
					data: {
						ip,
						reason: check.reason,
						dnsPeerIp: enrichedDnsEvent?.peerIp,
						dnsResolverIp: enrichedDnsEvent?.resolverIp,
						dnsPeerAsn: getIpInfoAsn(enrichedDnsEvent?.peerIpInfo),
						dnsResolverAsn: getIpInfoAsn(enrichedDnsEvent?.resolverIpInfo),
						dnsPathValid: enrichedDnsEvent?.pathValid,
					},
				}));
				const blockedResult = {
					status: CaptchaStatus.disapproved,
					reason: check.reason,
				};
				const isBlocked = isBlockingCaptchaResult(
					CaptchaType.connect,
					blockedResult,
				);
				await this.db.updateConnectCaptchaRecord(challengeRecord.challenge, {
					result: blockedResult,
					...(isBlocked && { blocked: true }),
				});
				if (challengeRecord.sessionId) {
					await this.updateSessionRecordWithCache(challengeRecord.sessionId, {
						serverChecked: true,
						result: blockedResult,
						...(isBlocked && { blocked: true }),
					});
				}
				return notVerifiedResponse;
			}
		}

		// Persist dapp-server-provided metadata when the site opts in.
		// Gated purely by `storeMetadata`; `emailNormalised` piggybacks on
		// the same write so the per-email submission-count check has an
		// indexed field to query against.
		if (storeMetadata && email) {
			await this.db.updateConnectCaptchaRecord(challengeRecord.challenge, {
				metadata: {
					email,
					emailNormalised: emailNormalised ?? normaliseEmailForMatching(email),
				},
			});
		}

		if (ip) {
			const challengeIpAddress = getIpAddressFromComposite(
				challengeRecord.ipAddress,
			);

			// Get client settings for IP validation rules
			const clientRecord = await this.db.getClientRecord(dappAccount);
			const ipValidationRules = clientRecord?.settings?.ipValidationRules;

			await this.db.updateConnectCaptchaRecord(challengeRecord.challenge, {
				providedIp: getCompositeIpAddress(ip),
			});

			if (ipValidationRules?.enabled === true) {
				const ipValidation = await deepValidateIpAddress(
					ip,
					challengeIpAddress,
					logger,
					env.ipInfoService,
					ipValidationRules,
					enrichedDnsEvent?.peerIp,
				);

				if (!ipValidation.isValid) {
					logger.error(() => ({
						msg: "IP validation failed for connect captcha",
						data: {
							ip,
							challengeIp: challengeIpAddress.address,
							error: ipValidation.errorMessage,
							distanceKm: ipValidation.distanceKm,
						},
					}));
					const ipFailResult = {
						status: CaptchaStatus.disapproved,
						reason: ResultReason.FAILED_IP_VALIDATION,
					};
					const isBlocked = isBlockingCaptchaResult(
						CaptchaType.connect,
						ipFailResult,
					);
					await this.db.updateConnectCaptchaRecord(challengeRecord.challenge, {
						result: ipFailResult,
						...(isBlocked && { blocked: true }),
					});
					if (challengeRecord.sessionId) {
						await this.updateSessionRecordWithCache(challengeRecord.sessionId, {
							serverChecked: true,
							result: ipFailResult,
							...(isBlocked && { blocked: true }),
						});
					}
					return notVerifiedResponse;
				}
			}
		}

		let score: number | undefined;
		if (sessionRecord) {
			const dnsAsymmetry = computeDnsAsymmetry(
				enrichedDnsEvent,
				challengeRecord.ipInfo,
				trafficFilter,
			);
			if (dnsAsymmetry > 0) {
				sessionRecord.scoreComponents = {
					...sessionRecord.scoreComponents,
					dnsAsymmetry,
				};
			}
			score = computeFrictionlessScore(sessionRecord?.scoreComponents);
			logger.info(() => ({
				data: {
					scoreComponents: { ...(sessionRecord?.scoreComponents || {}) },
					score,
					dnsPeerAsn: getIpInfoAsn(enrichedDnsEvent?.peerIpInfo),
					dnsResolverAsn: getIpInfoAsn(enrichedDnsEvent?.resolverIpInfo),
				},
			}));
		}

		// We know solution is correct by this point. Run decision machine evaluation to process additional checks.
		try {
			const decisionInput: DecisionMachineInput = {
				userAccount: challengeRecord.userAccount,
				dappAccount: challengeRecord.dappAccount,
				captchaResult: "passed",
				headers: challengeRecord.headers,
				captchaType: CaptchaType.connect,
				behavioralDataPacked: challengeRecord.behavioralDataPacked,
				deviceCapability: challengeRecord.deviceCapability,
				countryCode: challengeRecord.ipInfo?.isValid
					? challengeRecord.ipInfo.countryCode
					: undefined,
				ipInfo: challengeRecord.ipInfo,
				dnsEvent: enrichedDnsEvent,
				score,
				threshold: sessionRecord?.threshold,
				scoreComponents: sessionRecord?.scoreComponents,
				decryptedHeadHash: sessionRecord?.decryptedHeadHash,
				userSitekeyIpHash: sessionRecord?.userSitekeyIpHash,
				simdReadings: sessionRecord?.simdReadings,
				frictionlessReason: sessionRecord?.reason,
				ruleType: sessionRecord?.ruleType,
				webView: sessionRecord?.webView,
				iFrame: sessionRecord?.iFrame,
				coords: challengeRecord.coords,
				connectEvents: challengeRecord.connectEvents,
				// tcp-probe fields — see powTasks.ts for the reasoning.
				synNs: sessionRecord?.synNs,
				synackNs: sessionRecord?.synackNs,
				ackNs: sessionRecord?.ackNs,
				observedTtl: sessionRecord?.observedTtl,
				tcpMss: sessionRecord?.tcpMss,
				tcpWscale: sessionRecord?.tcpWscale,
				tcpOptsFlags: sessionRecord?.tcpOptsFlags,
				tcpOptsOrder: sessionRecord?.tcpOptsOrder,
				tcpWindow: sessionRecord?.tcpWindow,
			};

			const decision = await this.decisionMachineRunner.decide(
				decisionInput,
				logger,
			);

			if (decision.decision === DecisionMachineDecision.Deny) {
				logger.info(() => ({
					msg: "Decision machine denied connect captcha in server verification",
					data: {
						userAccount: challengeRecord.userAccount,
						reason: decision.reason,
						score: decision.score,
						tags: decision.tags,
					},
				}));

				// Decision machines are operator-authored JS — their `reason`
				// is just `string | undefined`. Cast to `ResultReason` at the
				// boundary so the strict types on `CaptchaResult` hold.
				const dmResult = {
					status: CaptchaStatus.disapproved,
					reason: (decision.reason ||
						ResultReason.CAPTCHA_DECISION_MACHINE_DENIED) as ResultReason,
				};
				const isBlocked = isBlockingCaptchaResult(
					CaptchaType.connect,
					dmResult,
				);
				await this.db.updateConnectCaptchaRecord(challengeRecord.challenge, {
					result: dmResult,
					...(isBlocked && { blocked: true }),
				});
				if (challengeRecord.sessionId) {
					await this.updateSessionRecordWithCache(challengeRecord.sessionId, {
						serverChecked: true,
						result: dmResult,
						...(isBlocked && { blocked: true }),
					});
				}
				return notVerifiedResponse;
			}

			logger.debug(() => ({
				msg: "Decision machine allowed connect captcha",
				data: {
					reason: decision.reason,
					score: decision.score,
					tags: decision.tags,
				},
			}));
		} catch (error) {
			logger.error(() => ({
				msg: "Failed to run decision machine in server connect verification",
				err: error,
			}));
			// Don't fail the captcha if decision machine fails - default to allow
		}

		// Server verification passed — update session as approved and serverChecked
		if (challengeRecord.sessionId) {
			await this.updateSessionRecordWithCache(challengeRecord.sessionId, {
				serverChecked: true,
				result: { status: CaptchaStatus.approved },
			});
		}

		return { verified: true, ...(score ? { score } : {}) };
	}
}
