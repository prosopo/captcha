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
import {
	ApiParams,
	type BehavioralDataPacked,
	type CaptchaResult,
	CaptchaStatus,
	type ClientMetaData,
	type DecisionMachineCaptchaType,
	DecisionMachineDecision,
	type DecisionMachineInput,
	type IPAddress,
	type ISpamFilterRules,
	type ITrafficFilter,
	type InteractiveCaptchaStored,
	type KeyringPair,
	POW_SEPARATOR,
	type PoWChallengeId,
	type ProsopoConfigOutput,
	ResultReason,
	type Session,
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
import { rawTlsSignalsFromRecord } from "../../api/rawTlsSignalsMiddleware.js";
import {
	getCompositeIpAddress,
	getIpAddressFromComposite,
} from "../../compositeIpAddress.js";
import { deepValidateIpAddress } from "../../util.js";
import {
	type UsageCounters,
	buildAllWindowIncrements,
} from "../../util/usageCounters.js";
import {
	isClientSessionMismatch,
	toStoredClientMetaData,
} from "../../utils/clientMetaData.js";
import { deriveTrafficPolicies } from "../../utils/devicePlatform.js";
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

/** Fields the shared pipeline writes back onto a captcha record. */
export type InteractiveCaptchaRecordUpdate = Partial<
	Pick<
		InteractiveCaptchaStored,
		| "result"
		| "blocked"
		| "serverChecked"
		| "lastUpdatedTimestamp"
		| "providedIp"
		| "metadata"
		| "behavioralDataPacked"
		| "deviceCapability"
		| "clientMetaData"
	>
>;

export interface MintedChallenge {
	challenge: PoWChallengeId;
	providerSignature: string;
	requestedAtTimestamp: number;
}

/** A user's submission, plus the two steps that differ by captcha type. */
export interface InteractiveSubmission<TRecord> {
	challenge: PoWChallengeId;
	providerChallengeSignature: string;
	/** Milliseconds allowed between issuing the challenge and this submission. */
	timeout: number;
	userTimestampSignature: string;
	ipAddress: IPAddress;
	behavioralData?: string;
	salt?: string;
	simdReadings?: string;
	clientMetaData?: ClientMetaData;
	isCorrect: (record: TRecord) => boolean;
	/** Persists the raw interaction trail, whatever the verdict. */
	persistInteraction: () => Promise<void>;
}

/**
 * Shared pipeline for the captcha types a human solves on screen (puzzle,
 * icon-order). Subclasses supply the record accessors and grading; minting,
 * submission bookkeeping and server verification live here.
 */
export abstract class InteractiveCaptchaManager<
	TRecord extends InteractiveCaptchaStored,
> extends CaptchaManager {
	POW_SEPARATOR: string;
	protected decisionMachineRunner: DecisionMachineRunner;
	protected readonly usageCounters: UsageCounters | null;

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

	protected abstract readonly captchaType: DecisionMachineCaptchaType;

	/** Type name used in log messages. */
	protected abstract readonly logLabel: string;

	protected abstract getRecordByChallenge(
		challenge: string,
	): Promise<TRecord | null>;

	protected abstract updateRecord(
		challenge: PoWChallengeId,
		updates: InteractiveCaptchaRecordUpdate,
	): Promise<void>;

	/** Records the verdict of a user's submission. */
	protected abstract updateSubmissionResult(
		challenge: PoWChallengeId,
		result: CaptchaResult,
		userSignature: string,
		coords: [number, number][][] | undefined,
	): Promise<void>;

	/** Takes the single submission a challenge allows; false if already taken. */
	protected abstract claimSubmission(record: TRecord): Promise<boolean>;

	/**
	 * Mark the record server-checked only if it isn't already, returning
	 * whether this caller made that transition.
	 */
	protected abstract markRecordChecked(
		challenge: PoWChallengeId,
	): Promise<boolean>;

	/** The per-type interaction trail handed to the decision machine. */
	protected abstract decisionMachineEventFields(
		record: TRecord,
	): Partial<DecisionMachineInput>;

	protected mintChallenge(
		userAccount: string,
		dappAccount: string,
	): MintedChallenge {
		const requestedAtTimestamp = Date.now();
		const nonce = Math.floor(Math.random() * 1000000);
		const challenge: PoWChallengeId = `${requestedAtTimestamp}___${userAccount}___${dappAccount}___${nonce}`;
		const providerSignature = u8aToHex(this.pair.sign(stringToHex(challenge)));
		return { challenge, providerSignature, requestedAtTimestamp };
	}

	/**
	 * Grades a user's submission and records the outcome on the captcha and
	 * session records. Returns whether the solution was correct.
	 */
	protected async submitInteractiveCaptchaSolution(
		submission: InteractiveSubmission<TRecord>,
	): Promise<boolean> {
		const { challenge, userTimestampSignature, behavioralData, simdReadings } =
			submission;
		// Check signatures before doing DB reads to avoid unnecessary network connections
		checkPowSignature(
			challenge,
			submission.providerChallengeSignature,
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

		const challengeRecord = await this.getRecordByChallenge(challenge);

		if (!challengeRecord) {
			this.logger.debug(() => ({
				msg: `No record of this challenge: ${challenge}`,
			}));
			return false;
		}

		const { coords, saltDecodeError } = this.decodeSaltCoords(submission.salt);

		// Single-use: the answer space is small enough to brute-force if a
		// challenge accepted repeated guesses.
		if (!(await this.claimSubmission(challengeRecord))) {
			this.logger.debug(() => ({
				msg: `Challenge already submitted: ${challenge}`,
			}));
			return false;
		}

		if (saltDecodeError) {
			await this.recordSubmissionResult(
				challengeRecord,
				{
					status: CaptchaStatus.disapproved,
					reason: ResultReason.CAPTCHA_INVALID_SALT,
				},
				userTimestampSignature,
				undefined,
			);
			return false;
		}

		if (!verifyRecency(challenge, submission.timeout)) {
			await this.recordSubmissionResult(
				challengeRecord,
				{
					status: CaptchaStatus.disapproved,
					reason: ResultReason.CAPTCHA_INVALID_TIMESTAMP,
				},
				userTimestampSignature,
				coords,
			);
			return false;
		}

		const correct = submission.isCorrect(challengeRecord);
		const result: CaptchaResult = correct
			? { status: CaptchaStatus.approved }
			: {
					status: CaptchaStatus.disapproved,
					reason: ResultReason.CAPTCHA_INVALID_SOLUTION,
				};

		// Solved-counter writes: fire-and-forget, only on a correct solve.
		// Runs before any decision-machine veto.
		if (correct && this.usageCounters) {
			this.usageCounters.incrManyAsync(
				at(challengeSplit, 2),
				buildAllWindowIncrements(
					"solved",
					this.captchaType,
					submission.ipAddress.address,
					userAccount,
				),
			);
		}

		// Unconditional, so the trail survives when the behavioural payload is
		// missing or fails to decrypt; the decision machine reads it either way.
		await submission.persistInteraction();

		const decodedPayloads = await this.decodeSubmissionPayloads(
			challengeRecord.sessionId,
			{ behavioural: behavioralData, simd: simdReadings },
		);

		if (behavioralData) {
			try {
				const decryptedData = decodedPayloads.behavioural;

				if (decryptedData) {
					this.logger?.info(() => ({
						msg: "Behavioral analysis completed",
						data: {
							userAccount,
							dappAccount: at(challengeSplit, 2),
							challenge,
							mouseEventsCount: decryptedData.collector1?.length || 0,
							touchEventsCount: decryptedData.collector2?.length || 0,
							clickEventsCount: decryptedData.collector3?.length || 0,
							scrollEventsCount: decryptedData.collector4?.length || 0,
							deviceCapability: decryptedData.deviceCapability,
							captchaResult: correct ? "passed" : "failed",
						},
					}));

					const packedData: BehavioralDataPacked = {
						c1: decryptedData.collector1 || [],
						c2: decryptedData.collector2 || [],
						c3: decryptedData.collector3 || [],
						c4: decryptedData.collector4 || [],
						d: decryptedData.deviceCapability,
					};

					await this.updateRecord(challenge, {
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

		const storedClientMetaData = toStoredClientMetaData(
			submission.clientMetaData,
		);
		if (storedClientMetaData) {
			await this.updateRecord(challenge, {
				clientMetaData: storedClientMetaData,
			});
		}

		await this.recordSubmissionResult(
			challengeRecord,
			result,
			userTimestampSignature,
			coords,
			storedClientMetaData,
		);

		if (challengeRecord.sessionId && decodedPayloads.simd) {
			await this.recordSessionSimdReadingsIfAbsentWithCache(
				challengeRecord.sessionId,
				decodedPayloads.simd,
				SimdReadingsStage.submit,
			);
		}

		return correct;
	}

	/** Invalid salt disapproves the submission rather than being ignored. */
	private decodeSaltCoords(salt: string | undefined): {
		coords?: [number, number][][];
		saltDecodeError?: unknown;
	} {
		if (!salt) {
			return {};
		}
		try {
			const extractedData = extractData(salt);
			if (extractedData.length < 2) {
				return {};
			}
			const coords: [number, number][][] = [
				[[extractedData[0], extractedData[1]] as [number, number]],
			];
			assertCoordsSafe(coords, "coords");
			return { coords };
		} catch (error) {
			this.logger.warn(() => ({
				msg: "Failed to extract coordinates from salt",
				error,
				salt,
			}));
			return { saltDecodeError: error };
		}
	}

	private async recordSubmissionResult(
		challengeRecord: TRecord,
		result: CaptchaResult,
		userSignature: string,
		coords: [number, number][][] | undefined,
		clientMetaData?: ClientMetaData,
	): Promise<void> {
		await this.updateSubmissionResult(
			challengeRecord.challenge,
			result,
			userSignature,
			coords,
		);
		if (challengeRecord.sessionId) {
			await this.updateSessionRecordWithCache(challengeRecord.sessionId, {
				userSubmitted: true,
				result,
				...(isBlockingCaptchaResult(this.captchaType, result) && {
					blocked: true,
				}),
				// Mirrored so the session carries the clientSessionId that the
				// verify call correlates against.
				...(clientMetaData && { clientMetaData }),
			});
		}
	}

	/**
	 * The post-solve gate the site's server calls: decides whether the token
	 * the widget was given is honoured.
	 *
	 * @param dappAccount - the dapp that is requesting the captcha
	 * @param challenge - the challenge string
	 * @param timeout - milliseconds allowed between submit and verify
	 * @param env - provider environment
	 * @param ip - optional IP address for validation
	 * @param userAccessRulesStorage - storage for querying user access policies
	 * @param email
	 * @param spamEmailDomainCheckingEnabled
	 * @param spamFilter
	 * @param trafficFilter
	 * @param storeMetadata - when true, persists the dapp-server-provided
	 *   `email` on the captcha record for spam-rate analysis.
	 * @param clientSessionId - the session id the site rendered the widget
	 *   with. When supplied, the solve must carry the same value in its
	 *   `clientMetaData` or it is disapproved.
	 */
	async serverVerifyInteractiveCaptchaSolution(
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
		clientSessionId?: string,
	): Promise<{ verified: boolean; score?: number; sessionId?: string }> {
		// Shared by every not-verified exit; sessionId is stamped on below
		// once the record is loaded, so each exit needn't repeat it.
		const notVerifiedResponse: {
			verified: false;
			sessionId?: string;
		} = { verified: false };

		// Bind the challenge/dappAccount context once so every log line in this
		// method carries it without repeating the fields in each `data` block.
		const logger = this.logger.with({ challenge, dappAccount });

		const challengeRecord = await this.getRecordByChallenge(challenge);

		if (!challengeRecord) {
			logger.debug(() => ({
				msg: `No record of this challenge: ${challenge}`,
			}));

			return notVerifiedResponse;
		}

		notVerifiedResponse.sessionId = challengeRecord.sessionId;

		if (challengeRecord.result.status !== CaptchaStatus.approved) {
			throw new ProsopoApiError("CAPTCHA.INVALID_SOLUTION", {
				context: {
					code: 400,
					failedFuncName: this.serverVerifyInteractiveCaptchaSolution.name,
					challenge,
				},
			});
		}

		if (challengeRecord.serverChecked) return notVerifiedResponse;

		const challengeDappAccount = challengeRecord.dappAccount;

		if (dappAccount !== challengeDappAccount) {
			throw new ProsopoEnvError("CAPTCHA.DAPP_USER_SOLUTION_NOT_FOUND", {
				context: {
					failedFuncName: this.serverVerifyInteractiveCaptchaSolution.name,
					dappAccount,
					challengeDappAccount,
				},
			});
		}

		// -- WARNING ---- WARNING ---- WARNING ---- WARNING ---- WARNING ---- WARNING ---- WARNING ---- WARNING --
		// Do not move this code down or put any other code before it. We want to drop out as early as possible if the
		// solution has already been checked by the server. Moving this code around could result in solutions being
		// re-usable.
		// The claim is conditional on the record not being checked yet, so of
		// several concurrent verifies of one token only one gets past here.
		const claimed = await this.markRecordChecked(challengeRecord.challenge);
		if (!claimed) return notVerifiedResponse;
		// -- END WARNING --

		const submittedAt = challengeRecord.submittedAtTimestamp;
		const submitToVerifyMs =
			submittedAt instanceof Date
				? Date.now() - submittedAt.getTime()
				: Number.POSITIVE_INFINITY;
		if (submitToVerifyMs > timeout) {
			await this.disapproveVerification(
				challengeRecord,
				ResultReason.TIMESTAMP_TOO_OLD,
			);
			return notVerifiedResponse;
		}

		// The site rendered the widget with a session id, so the solve has to
		// carry the same one — otherwise the token was earned in a different
		// session (or outside the widget entirely) and is being replayed here.
		// Cheap and purely local, so it runs before any I/O-bound check.
		if (
			isClientSessionMismatch(
				clientSessionId,
				challengeRecord.clientMetaData?.clientSessionId,
			)
		) {
			logger.info(() => ({
				msg: `Client session mismatch in server ${this.logLabel} verification`,
				data: {
					hasRecordedClientSessionId: Boolean(
						challengeRecord.clientMetaData?.clientSessionId,
					),
				},
			}));
			await this.disapproveVerification(
				challengeRecord,
				ResultReason.CLIENT_SESSION_MISMATCH,
			);
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
						msg: `User blocked by access policy in server ${this.logLabel} verification`,
						data: {
							userAccount: challengeRecord.userAccount,
							policy: blockPolicy,
						},
					}));
					await this.disapproveVerification(
						challengeRecord,
						ResultReason.ACCESS_POLICY_BLOCK,
						{
							// Name the rule behind the ACCESS_POLICY_BLOCK on the
							// audit row. This path is where `deferToVerify` rules
							// land, which is precisely where "why was I rejected?"
							// is least obvious.
							matchedRule: describeMatchedRule(blockPolicy),
						},
					);
					return notVerifiedResponse;
				}
			} catch (error) {
				logger.warn(() => ({
					msg: `Failed to check user access policies in server ${this.logLabel} verification`,
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
						msg: `Spam email domain detected in server ${this.logLabel} verification`,
						data: { emailDomain },
					}));
					await this.disapproveVerification(
						challengeRecord,
						ResultReason.SPAM_EMAIL_DOMAIN,
						null,
					);
					return notVerifiedResponse;
				}
			} catch (error) {
				logger.warn(() => ({
					msg: `Failed to check spam email domain in server ${this.logLabel} verification`,
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
							msg: `Email submission count exceeded in server ${this.logLabel} verification`,
							data: { priorCount, maxEmailSubmissionCount },
						}));
						await this.disapproveVerification(
							challengeRecord,
							ResultReason.SPAM_EMAIL_COUNT_EXCEEDED,
							null,
						);
						return notVerifiedResponse;
					}
				} catch (error) {
					logger.warn(() => ({
						msg: `Failed to check email submission count in server ${this.logLabel} verification`,
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
					msg: `Traffic filter rejected request in ${this.logLabel} verification`,
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
				await this.disapproveVerification(challengeRecord, check.reason);
				return notVerifiedResponse;
			}
		}

		// Persist dapp-server-provided metadata when the site opts in.
		// Gated purely by `storeMetadata`; `emailNormalised` piggybacks on
		// the same write so the per-email submission-count check has an
		// indexed field to query against.
		if (storeMetadata && email) {
			await this.updateRecord(challengeRecord.challenge, {
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

			await this.updateRecord(challengeRecord.challenge, {
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
						msg: `IP validation failed for ${this.logLabel} captcha`,
						data: {
							ip,
							challengeIp: challengeIpAddress.address,
							error: ipValidation.errorMessage,
							distanceKm: ipValidation.distanceKm,
						},
					}));
					await this.disapproveVerification(
						challengeRecord,
						ResultReason.FAILED_IP_VALIDATION,
					);
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
				captchaType: this.captchaType,
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
				// Everything the detector reported for this session.
				d: sessionRecord?.d,
				frictionlessReason: sessionRecord?.reason,
				ruleType: sessionRecord?.ruleType,
				webView: sessionRecord?.webView,
				iFrame: sessionRecord?.iFrame,
				currentUrl: sessionRecord?.currentUrl,
				iframeUrl: sessionRecord?.iframeUrl,
				coords: challengeRecord.coords,
				...this.decisionMachineEventFields(challengeRecord),
				// tcp-probe fields — see powTasks.ts for the reasoning.
				...rawTlsSignalsFromRecord(sessionRecord),
				// Which egress categories this site blocks. Gates the
				// egress-sensitive TCP-stack deny rules — a VPN
				// concentrator legitimately terminates the handshake, so
				// on a site that accepts VPN users the observed stack
				// says nothing about the client.
				trafficPolicies: deriveTrafficPolicies(trafficFilter),
			};

			const decision = await this.decisionMachineRunner.decide(
				decisionInput,
				logger,
			);

			if (decision.decision === DecisionMachineDecision.Deny) {
				logger.info(() => ({
					msg: `Decision machine denied ${this.logLabel} captcha in server verification`,
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
				await this.disapproveVerification(
					challengeRecord,
					(decision.reason ||
						ResultReason.CAPTCHA_DECISION_MACHINE_DENIED) as ResultReason,
				);
				return notVerifiedResponse;
			}

			logger.debug(() => ({
				msg: `Decision machine allowed ${this.logLabel} captcha`,
				data: {
					reason: decision.reason,
					score: decision.score,
					tags: decision.tags,
				},
			}));
		} catch (error) {
			logger.error(() => ({
				msg: `Failed to run decision machine in server ${this.logLabel} verification`,
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

		return {
			verified: true,
			...(score ? { score } : {}),
			...(challengeRecord.sessionId && {
				sessionId: challengeRecord.sessionId,
			}),
		};
	}

	/**
	 * Records a server-verification rejection on the captcha record and, unless
	 * `session` is null, on the linked session.
	 */
	private async disapproveVerification(
		challengeRecord: TRecord,
		reason: ResultReason,
		session: Pick<Session, "matchedRule"> | null = {},
	): Promise<void> {
		const result: CaptchaResult = { status: CaptchaStatus.disapproved, reason };
		const isBlocked = isBlockingCaptchaResult(this.captchaType, result);
		await this.updateRecord(challengeRecord.challenge, {
			result,
			...(isBlocked && { blocked: true }),
		});
		if (session && challengeRecord.sessionId) {
			await this.updateSessionRecordWithCache(challengeRecord.sessionId, {
				serverChecked: true,
				result,
				...(isBlocked && { blocked: true }),
				...session,
			});
		}
	}
}
