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
	type IPAddress,
	type ISpamFilterRules,
	type ITrafficFilter,
	POW_SEPARATOR,
	type PoWChallengeId,
	type AudioEvent,
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
import type { AudioRenderSettings } from "@prosopo/audio-assets";
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
import { DecisionMachineRunner } from "../decisionMachine/decisionMachineRunner.js";
import {
	computeDnsAsymmetry,
	enrichDnsEvent,
	getIpInfoAsn,
} from "../dnsEvent/enrichDnsEvent.js";
import { computeFrictionlessScore } from "../frictionless/frictionlessTasksUtils.js";
import { checkPowSignature } from "../powCaptcha/powTasksUtils.js";
import { normaliseEmailForMatching } from "../spam/evaluateEmailSpamRules.js";
import {
	type RenderedAudioClip,
	renderAudioClip,
	resolveAudioRenderSettings,
} from "../audio/audioRenderer.js";
import {
	normaliseAudioAnswer,
	validateAudioSolution,
} from "./audioTasksUtils.js";

interface AudioCaptchaChallenge {
	challenge: PoWChallengeId;
	/** WAV data URI handed straight to the widget's `<audio>` element. */
	clip: string;
	/** How many characters the user must type. Safe to publish. */
	characterCount: number;
	/**
	 * The spoken transcript.
	 *
	 * The caller persists this on the challenge record and must not put
	 * it in a response. `GetAudioCaptchaResponse` has no field it could
	 * be assigned to, which is the structural half of that guarantee.
	 */
	answer: string;
	durationMs: number;
	providerSignature: string;
	requestedAtTimestamp: number;
}

export class AudioCaptchaManager extends CaptchaManager {
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
	 * @description Generates an Audio Captcha challenge for a given user and dapp
	 *
	 * @param {string} userAccount - user that is solving the captcha
	 * @param {string} dappAccount - dapp that is requesting the captcha
	 * @param origin - not currently used
	 * @param settings - resolved per-render tunables
	 */
	async getAudioCaptchaChallenge(
		userAccount: string,
		dappAccount: string,
		origin: string,
		settings?: AudioRenderSettings,
	): Promise<AudioCaptchaChallenge> {
		const requestedAtTimestamp = Date.now();

		// Create nonce for the challenge
		const nonce = Math.floor(Math.random() * 1000000);

		// Use timestamp, userAccount and dappAccount for the challenge id
		const challenge: PoWChallengeId = `${requestedAtTimestamp}___${userAccount}___${dappAccount}___${nonce}`;
		const challengeSignature = u8aToHex(this.pair.sign(stringToHex(challenge)));

		const rendered: RenderedAudioClip = renderAudioClip(
			settings ?? resolveAudioRenderSettings(),
		);

		return {
			challenge,
			clip: rendered.clip,
			characterCount: rendered.characterCount,
			answer: rendered.answer,
			durationMs: rendered.durationMs,
			providerSignature: challengeSignature,
			requestedAtTimestamp,
		};
	}

	/**
	 * @description Verifies a Audio Captcha solution for a given user and dapp
	 *
	 * @param {string} challenge - the challenge string
	 * @param {string} providerChallengeSignature - proof that the Provider provided the challenge
	 * @param {string} submittedAnswer - what the user typed
	 * @param {number} replays - how many times the clip was played
	 * @param {AudioEvent[]} audioEvents - playback / typing event trail
	 * @param {number} timeout - the time in milliseconds since the Provider was selected to provide the captcha
	 * @param {string} userTimestampSignature
	 * @param ipAddress
	 * @param headers
	 * @param behavioralData
	 */
	async verifyAudioCaptchaSolution(
		challenge: PoWChallengeId,
		providerChallengeSignature: string,
		submittedAnswer: string,
		replays: number,
		audioEvents: AudioEvent[],
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
			await this.db.getAudioCaptchaRecordByChallenge(challenge);

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

		// Single-use challenge: refuse re-submission. Unlike POW
		// (hash-bound), a five-digit answer is a 100,000-entry space that
		// falls to brute force in seconds if resubmission is allowed, so
		// each challenge must accept exactly one submission. This is also
		// what makes "wrong answer means a fresh challenge" the only
		// possible retry policy — the old clip is spent.
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
			await this.db.updateAudioCaptchaRecordResult(
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
					...(isBlockingCaptchaResult(CaptchaType.audio, badSaltResult) && {
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
			await this.db.updateAudioCaptchaRecordResult(
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
					...(isBlockingCaptchaResult(CaptchaType.audio, timeoutResult) && {
						blocked: true,
					}),
				});
			}
			return false;
		}

		const correct = validateAudioSolution(
			submittedAnswer,
			challengeRecord.answer,
		);

		let result: CaptchaResult = { status: CaptchaStatus.approved };
		if (!correct) {
			result = {
				status: CaptchaStatus.disapproved,
				reason: ResultReason.CAPTCHA_INVALID_SOLUTION,
			};
		}

		// Solved-counter writes: fire-and-forget, only on a correct answer.
		// Runs before any decision-machine veto.
		if (correct && this.usageCounters) {
			const dappAccount = at(challengeSplit, 2);
			this.usageCounters.incrManyAsync(
				dappAccount,
				buildAllWindowIncrements(
					"solved",
					CaptchaType.audio,
					ipAddress.address,
					userAccount,
				),
			);
		}

		// Persist the event trail and the submitted answer unconditionally,
		// so they survive even when the behavioural payload is absent or its
		// decryption fails (missing bundle, ciphertext / key mismatch). The
		// puzzle flow learned this the hard way: gating the event write on
		// decryption succeeding lost the trail on legitimate solves whose
		// bundle could not be resolved, AND tripped the "no-cache request
		// with no behavioural data" decision-machine rule.
		//
		// `submittedAnswer` is stored even when wrong — especially when
		// wrong. Systematic confusions ("users type 9 when 5 was spoken")
		// are a phoneme-table problem, and there is no way to see them
		// without keeping the incorrect answers.
		await this.db.updateAudioCaptchaRecord(challenge, {
			audioEvents,
			replays,
			submittedAnswer: normaliseAudioAnswer(submittedAnswer),
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

					await this.db.updateAudioCaptchaRecord(challenge, {
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
			await this.db.updateAudioCaptchaRecord(challenge, {
				clientMetaData: { hp: clientMetaData.hp },
			});
		}

		await this.db.updateAudioCaptchaRecordResult(
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
				...(isBlockingCaptchaResult(CaptchaType.audio, result) && {
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
	 * @description Verifies a Audio Captcha for a given user and dapp. This is called by the server to verify the user's solution
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
	async serverVerifyAudioCaptchaSolution(
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
			await this.db.getAudioCaptchaRecordByChallenge(challenge);

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
					failedFuncName: this.serverVerifyAudioCaptchaSolution.name,
					challenge,
				},
			});
		}

		if (challengeRecord.serverChecked) return notVerifiedResponse;

		const challengeDappAccount = challengeRecord.dappAccount;

		if (dappAccount !== challengeDappAccount) {
			throw new ProsopoEnvError("CAPTCHA.DAPP_USER_SOLUTION_NOT_FOUND", {
				context: {
					failedFuncName: this.serverVerifyAudioCaptchaSolution.name,
					dappAccount,
					challengeDappAccount,
				},
			});
		}

		// -- WARNING ---- WARNING ---- WARNING ---- WARNING ---- WARNING ---- WARNING ---- WARNING ---- WARNING --
		// Do not move this code down or put any other code before it. We want to drop out as early as possible if the
		// solution has already been checked by the server. Moving this code around could result in solutions being
		// re-usable.
		await this.db.updateAudioCaptchaRecord(challengeRecord.challenge, {
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
				CaptchaType.audio,
				disapprovedResult,
			);
			await this.db.updateAudioCaptchaRecord(challengeRecord.challenge, {
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
						msg: "User blocked by access policy in server audio verification",
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
						CaptchaType.audio,
						blockedResult,
					);
					await this.db.updateAudioCaptchaRecord(challengeRecord.challenge, {
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
					msg: "Failed to check user access policies in server audio verification",
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
						msg: "Spam email domain detected in server audio verification",
						data: { emailDomain },
					}));
					const spamResult = {
						status: CaptchaStatus.disapproved,
						reason: ResultReason.SPAM_EMAIL_DOMAIN,
					};
					await this.db.updateAudioCaptchaRecord(challengeRecord.challenge, {
						result: spamResult,
						...(isBlockingCaptchaResult(CaptchaType.audio, spamResult) && {
							blocked: true,
						}),
					});
					return notVerifiedResponse;
				}
			} catch (error) {
				logger.warn(() => ({
					msg: "Failed to check spam email domain in server audio verification",
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
							msg: "Email submission count exceeded in server audio verification",
							data: { priorCount, maxEmailSubmissionCount },
						}));
						const spamCountResult = {
							status: CaptchaStatus.disapproved,
							reason: ResultReason.SPAM_EMAIL_COUNT_EXCEEDED,
						};
						await this.db.updateAudioCaptchaRecord(challengeRecord.challenge, {
							result: spamCountResult,
							...(isBlockingCaptchaResult(
								CaptchaType.audio,
								spamCountResult,
							) && { blocked: true }),
						});
						return notVerifiedResponse;
					}
				} catch (error) {
					logger.warn(() => ({
						msg: "Failed to check email submission count in server audio verification",
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
					msg: "Traffic filter rejected request in audio verification",
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
					CaptchaType.audio,
					blockedResult,
				);
				await this.db.updateAudioCaptchaRecord(challengeRecord.challenge, {
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
			await this.db.updateAudioCaptchaRecord(challengeRecord.challenge, {
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

			await this.db.updateAudioCaptchaRecord(challengeRecord.challenge, {
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
						msg: "IP validation failed for audio captcha",
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
						CaptchaType.audio,
						ipFailResult,
					);
					await this.db.updateAudioCaptchaRecord(challengeRecord.challenge, {
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
				captchaType: CaptchaType.audio,
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
				audioEvents: challengeRecord.audioEvents,
				audioReplays: challengeRecord.replays,
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
					msg: "Decision machine denied audio captcha in server verification",
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
				const isBlocked = isBlockingCaptchaResult(CaptchaType.audio, dmResult);
				await this.db.updateAudioCaptchaRecord(challengeRecord.challenge, {
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
				msg: "Decision machine allowed audio captcha",
				data: {
					reason: decision.reason,
					score: decision.score,
					tags: decision.tags,
				},
			}));
		} catch (error) {
			logger.error(() => ({
				msg: "Failed to run decision machine in server audio verification",
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
