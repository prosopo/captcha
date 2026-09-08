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

import { ProsopoApiError, ProsopoEnvError } from "@prosopo/common";
import type { Logger } from "@prosopo/logger";
import type { KeyringPair, ProsopoConfigOutput } from "@prosopo/types";
import {
	type DecisionMachineCaptchaType,
	DecisionMachineDecision,
	type DecisionMachineInput,
} from "@prosopo/types";
import {
	type CaptchaResult,
	CaptchaStatus,
	type ISpamFilterRules,
	type ITrafficFilter,
	POW_SEPARATOR,
	type PoWChallengeId,
	type RequestHeaders,
	ResultReason,
	isBlockingCaptchaResult,
} from "@prosopo/types";
import type { IProviderDatabase } from "@prosopo/types-database";
import type { ProviderEnvironment } from "@prosopo/types-env";
import {
	type AccessRulesStorage,
	describeMatchedRule,
} from "@prosopo/user-access-policy";
import {
	getCompositeIpAddress,
	getIpAddressFromComposite,
} from "../../compositeIpAddress.js";
import { deepValidateIpAddress } from "../../util.js";
import type { UsageCounters } from "../../util/usageCounters.js";
import { isClientSessionMismatch } from "../../utils/clientMetaData.js";
import { deriveTrafficPolicies } from "../../utils/devicePlatform.js";
import { CaptchaManager } from "../captchaManager.js";
import { DecisionMachineRunner } from "../decisionMachine/decisionMachineRunner.js";
import {
	computeDnsAsymmetry,
	enrichDnsEvent,
	getIpInfoAsn,
} from "../dnsEvent/enrichDnsEvent.js";
import { computeFrictionlessScore } from "../frictionless/frictionlessTasksUtils.js";
import { normaliseEmailForMatching } from "../spam/evaluateEmailSpamRules.js";

/**
 * The fields `serverVerifyInteractiveCaptchaSolution` reads off a captcha
 * record. Every interactive captcha record satisfies this structurally — it is
 * the `StoredCaptcha` surface plus the challenge identity — so the base can
 * work against it without knowing which collection the record came from.
 */
export interface InteractiveCaptchaRecordView {
	challenge: PoWChallengeId;
	userAccount: string;
	dappAccount: string;
	result: CaptchaResult;
	serverChecked: boolean;
	userSubmitted: boolean;
	submittedAtTimestamp?: Date;
	sessionId?: string;
	headers: RequestHeaders;
	ipAddress: Parameters<typeof getIpAddressFromComposite>[0];
	ja4: string;
	ipInfo?: DecisionMachineInput["ipInfo"];
	coords?: [number, number][][];
	behavioralDataPacked?: DecisionMachineInput["behavioralDataPacked"];
	deviceCapability?: string;
	clientMetaData?: { clientSessionId?: string };
}

/**
 * Fields the base writes back onto a captcha record. Deliberately narrow: the
 * shared pipeline only ever records a verdict and the provenance around it,
 * so a subclass's own answer fields are not reachable from here.
 */
export interface InteractiveCaptchaRecordUpdate {
	result?: CaptchaResult;
	blocked?: boolean;
	serverChecked?: boolean;
	lastUpdatedTimestamp?: Date;
	providedIp?: ReturnType<typeof getCompositeIpAddress>;
	metadata?: { email?: string; emailNormalised?: string };
}

/**
 * Shared behaviour for the interactive captcha types — the ones a human
 * actually solves on screen (puzzle, icon-order) as opposed to PoW.
 *
 * They differ only in what the challenge looks like and how a solution is
 * graded. Everything after grading — the server-side verify gate — is
 * identical, and lives here so a change to the block classification, the
 * decision-machine contract or the session bookkeeping lands on every type at
 * once instead of on whichever one the author happened to be editing.
 */
export abstract class InteractiveCaptchaManager extends CaptchaManager {
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

	/**
	 * Stamped onto results and handed to the decision machine. Narrowed to
	 * the concrete types a decision machine can be written against —
	 * `frictionless` is a routing stage, never a solved challenge.
	 */
	protected abstract readonly captchaType: DecisionMachineCaptchaType;

	/** Human-readable type name, used only in log messages. */
	protected abstract readonly logLabel: string;

	protected abstract getRecordByChallenge(
		challenge: string,
	): Promise<InteractiveCaptchaRecordView | null>;

	protected abstract updateRecord(
		challenge: PoWChallengeId,
		updates: InteractiveCaptchaRecordUpdate,
	): Promise<void>;

	/**
	 * The per-type interaction trail handed to the decision machine — the
	 * drag for a puzzle, the click sequence for icon-order. Returned as a
	 * partial `DecisionMachineInput` so each type names its own field.
	 */
	protected abstract decisionMachineEventFields(
		record: InteractiveCaptchaRecordView,
	): Partial<DecisionMachineInput>;

	/**
	 * Server-side verification shared by every interactive captcha type.
	 *
	 * This is the post-solve gate the site's server calls: the widget has
	 * already been told it passed, and this decides whether the token it holds
	 * is honoured. Everything here is type-agnostic — replay and recency
	 * checks, client-session correlation, access policies, spam rules, traffic
	 * filter, IP validation and the decision machine — which is why it lives
	 * on the base rather than being restated per type. The subclass supplies
	 * the four things that genuinely differ: which collection to read and
	 * write, which CaptchaType to stamp, and which event trail to hand the
	 * decision machine.
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
	protected async serverVerifyInteractiveCaptchaSolution(
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
		await this.updateRecord(challengeRecord.challenge, {
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
				this.captchaType,
				disapprovedResult,
			);
			await this.updateRecord(challengeRecord.challenge, {
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
			const mismatchResult = {
				status: CaptchaStatus.disapproved,
				reason: ResultReason.CLIENT_SESSION_MISMATCH,
			};
			const isBlocked = isBlockingCaptchaResult(
				this.captchaType,
				mismatchResult,
			);
			await this.updateRecord(challengeRecord.challenge, {
				result: mismatchResult,
				...(isBlocked && { blocked: true }),
			});
			if (challengeRecord.sessionId) {
				await this.updateSessionRecordWithCache(challengeRecord.sessionId, {
					serverChecked: true,
					result: mismatchResult,
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
						msg: `User blocked by access policy in server ${this.logLabel} verification`,
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
						this.captchaType,
						blockedResult,
					);
					await this.updateRecord(challengeRecord.challenge, {
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
					const spamResult = {
						status: CaptchaStatus.disapproved,
						reason: ResultReason.SPAM_EMAIL_DOMAIN,
					};
					await this.updateRecord(challengeRecord.challenge, {
						result: spamResult,
						...(isBlockingCaptchaResult(this.captchaType, spamResult) && {
							blocked: true,
						}),
					});
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
						const spamCountResult = {
							status: CaptchaStatus.disapproved,
							reason: ResultReason.SPAM_EMAIL_COUNT_EXCEEDED,
						};
						await this.updateRecord(challengeRecord.challenge, {
							result: spamCountResult,
							...(isBlockingCaptchaResult(
								this.captchaType,
								spamCountResult,
							) && { blocked: true }),
						});
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
				const blockedResult = {
					status: CaptchaStatus.disapproved,
					reason: check.reason,
				};
				const isBlocked = isBlockingCaptchaResult(
					this.captchaType,
					blockedResult,
				);
				await this.updateRecord(challengeRecord.challenge, {
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
					const ipFailResult = {
						status: CaptchaStatus.disapproved,
						reason: ResultReason.FAILED_IP_VALIDATION,
					};
					const isBlocked = isBlockingCaptchaResult(
						this.captchaType,
						ipFailResult,
					);
					await this.updateRecord(challengeRecord.challenge, {
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
				frictionlessReason: sessionRecord?.reason,
				ruleType: sessionRecord?.ruleType,
				webView: sessionRecord?.webView,
				iFrame: sessionRecord?.iFrame,
				coords: challengeRecord.coords,
				...this.decisionMachineEventFields(challengeRecord),
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
				const dmResult = {
					status: CaptchaStatus.disapproved,
					reason: (decision.reason ||
						ResultReason.CAPTCHA_DECISION_MACHINE_DENIED) as ResultReason,
				};
				const isBlocked = isBlockingCaptchaResult(this.captchaType, dmResult);
				await this.updateRecord(challengeRecord.challenge, {
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
}
