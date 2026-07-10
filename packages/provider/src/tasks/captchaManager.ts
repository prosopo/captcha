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

import type { RedisWriteQueue } from "@prosopo/database";
import type { TranslationKey } from "@prosopo/locale";
import { type Logger, getLogger } from "@prosopo/logger";
import {
	ApiParams,
	type CaptchaType,
	type EnrichedDnsEvent,
	type IPInfoResponse,
	type ITrafficFilter,
	type KeyringPair,
	type ProsopoConfigOutput,
	type RequestHeaders,
	ResultReason,
	type Session,
	type SimdReadingsStage,
	Tier,
	type UserCommitment,
} from "@prosopo/types";
import type {
	ClientRecord,
	IProviderDatabase,
	IUserDataSlim,
	PoWCaptchaRecord,
	PuzzleCaptchaRecord,
} from "@prosopo/types-database";
import type { ProviderEnvironment } from "@prosopo/types-env";
import {
	type AccessPolicy,
	AccessPolicyType,
	type AccessRulesStorage,
	type UserScope,
	type UserScopeRecord,
} from "@prosopo/user-access-policy";
import {
	getPrioritisedAccessRule,
	getRequestUserScope,
} from "../api/blacklistRequestInspector.js";
import { getIpAddressFromComposite } from "../compositeIpAddress.js";
import type { BehavioralDataResult } from "./detection/decodeBehavior.js";
import type { SimdReadingsResult } from "./detection/decodeSimd.js";
import { extraIpInfosFromEnrichedDnsEvent } from "./dnsEvent/enrichDnsEvent.js";
import { checkSpamEmail as checkSpamEmailFn } from "./spam/checkSpamEmail.js";
import {
	type TrafficCheckResult,
	checkTrafficFilter,
} from "./spam/checkTrafficFilter.js";

/**
 * Finds a hard block policy from access policies.
 *
 * A hard block is either:
 *   (a) A Block policy with no captchaType (the historical "block all
 *       challenge types" case).
 *   (b) A Block policy with `deferToVerify: true` — request-time
 *       middleware skips these, so verify-time is the only place they
 *       can reject the commitment.
 *   (c) A Restrict policy with `deferToVerify: true` — the frictionless
 *       flow serves the rule's captchaType/solvedImagesCount normally
 *       (imposing the compute burden of the challenge), then verify
 *       marks the commitment disapproved regardless of solve outcome.
 *       Used by PROXY_POOL_TLS_NARROW to force a solving farm to burn
 *       8 image rounds per session while still failing verify — bots
 *       solve at 100% so we can't stop them by demanding correctness,
 *       only by wasting their compute.
 *
 * Policies with captchaType and without `deferToVerify` are pure routing
 * rules — they pick which challenge type to serve, not whether to reject.
 */
const findHardBlockPolicy = (
	accessPolicies: AccessPolicy[],
): AccessPolicy | undefined => {
	return accessPolicies.find((policy) => {
		if (policy.deferToVerify === true) {
			return true;
		}
		return policy.type === AccessPolicyType.Block && !policy.captchaType;
	});
};

export class CaptchaManager {
	pair: KeyringPair;
	db: IProviderDatabase;
	config: ProsopoConfigOutput;
	logger: Logger;
	writeQueue: RedisWriteQueue | null;

	constructor(
		db: IProviderDatabase,
		pair: KeyringPair,
		config: ProsopoConfigOutput,
		logger?: Logger,
		writeQueue?: RedisWriteQueue | null,
	) {
		this.pair = pair;
		this.db = db;
		this.config = config;
		this.logger = logger || getLogger("info", "provider:captcha-manager");
		this.writeQueue = writeQueue ?? null;
	}

	/**
	 * Update a session record with cache-first / write-behind semantics:
	 * the Redis cache patch is awaited (so the in-request view of the
	 * session is up-to-date for any subsequent fast-path read), and the
	 * Mongo write is fire-and-forget so the response isn't gated on a
	 * round-trip to Mongo. Matches the `RedisWriteQueue` design where
	 * Redis is the source of truth for the in-flight request and Mongo is
	 * eventually consistent.
	 *
	 * Prefer this over `this.db.updateSessionRecord` in any in-request
	 * handler.
	 */
	public async updateSessionRecordWithCache(
		sessionId: string,
		updates: Partial<Session>,
		streamToCentral?: boolean,
	): Promise<void> {
		// Cache first — this is what the rest of the request sees.
		if (this.writeQueue) {
			await this.writeQueue.patchCachedSession(
				sessionId,
				updates as unknown as Record<string, unknown>,
			);
		}
		// Mongo write happens in the background. Errors are logged but the
		// response has already been served on the strength of the cache.
		this.scheduleMongoSessionUpdate(sessionId, updates, streamToCentral);
	}

	/**
	 * Decrypt with the active detector keys and strip the throwaway
	 * `timestamp` field. Returns `undefined` when no key decrypts.
	 */
	public async decryptSimdReadingsForAttach(
		simdReadingsCiphertext: string,
	): Promise<NonNullable<Session["simdReadings"]> | undefined> {
		const decryptKeys = [
			...(await this.getDetectorKeys()),
			process.env.BOT_DECRYPTION_KEY,
		];
		const decrypted = await this.decryptSimdReadings(
			simdReadingsCiphertext,
			decryptKeys,
		);
		if (!decrypted) return undefined;
		const { timestamp: _ignored, ...readings } = decrypted;
		return readings;
	}

	/** Decrypt + first-hop-wins attach. No-op on decrypt failure. */
	public async decryptAndAttachSimdReadingsIfAbsent(
		sessionId: string,
		simdReadingsCiphertext: string,
		stage: SimdReadingsStage,
	): Promise<void> {
		const readings = await this.decryptSimdReadingsForAttach(
			simdReadingsCiphertext,
		);
		if (!readings) return;
		await this.recordSessionSimdReadingsIfAbsentWithCache(
			sessionId,
			readings,
			stage,
		);
	}

	/**
	 * First-hop-wins SIMD attach with cache-first / Mongo-deferred
	 * semantics — mirrors `updateSessionRecordWithCache`.
	 */
	public async recordSessionSimdReadingsIfAbsentWithCache(
		sessionId: string,
		readings: NonNullable<Session["simdReadings"]>,
		stage: SimdReadingsStage,
	): Promise<void> {
		if (this.writeQueue) {
			await this.writeQueue.patchCachedSimdReadingsIfAbsent(
				sessionId,
				readings as unknown as Record<string, unknown>,
				stage,
			);
		}
		this.scheduleMongoSimdReadingsUpdate(sessionId, readings, stage);
	}

	/**
	 * Fire-and-forget Mongo session update. Public so non-Task handlers
	 * (e.g. challenge GETs) can keep request response latency off the
	 * Mongo critical path while still ensuring eventual persistence.
	 */
	public scheduleMongoSessionUpdate(
		sessionId: string,
		updates: Partial<Session>,
		streamToCentral?: boolean,
	): void {
		// Wrap in Promise.resolve so a mocked db method that returns
		// undefined (rather than a resolved promise) doesn't blow up the
		// .catch chain. Production always returns a promise.
		Promise.resolve(
			streamToCentral === undefined
				? this.db.updateSessionRecord(sessionId, updates)
				: this.db.updateSessionRecord(sessionId, updates, streamToCentral),
		).catch((err) => {
			this.logger.warn(() => ({
				err,
				msg: "Background Mongo session update failed",
				data: { sessionId },
			}));
		});
	}

	/**
	 * Fire-and-forget Mongo SIMD-readings update. Public for the same
	 * reason as `scheduleMongoSessionUpdate`.
	 */
	public scheduleMongoSimdReadingsUpdate(
		sessionId: string,
		readings: NonNullable<Session["simdReadings"]>,
		stage: SimdReadingsStage,
	): void {
		Promise.resolve(
			this.db.recordSessionSimdReadingsIfAbsent(sessionId, readings, stage),
		).catch((err) => {
			this.logger.warn(() => ({
				err,
				msg: "Background Mongo SIMD-readings update failed",
				data: { sessionId, stage },
			}));
		});
	}

	async validateSessionIP(
		sessionRecord: Session,
		currentIP: string,
		env: ProviderEnvironment,
	): Promise<{ valid: boolean; reason?: TranslationKey }> {
		// Session record now contains IP address directly
		// No validation needed as the session already has all required info
		return { valid: true };
	}

	async isValidRequest(
		clientSettings: ClientRecord | IUserDataSlim,
		requestedCaptchaType: CaptchaType,
		env: ProviderEnvironment,
		sessionId?: string,
		userAccessPolicy?: AccessPolicy,
		currentIP?: string,
	): Promise<{
		valid: boolean;
		reason?: TranslationKey;
		sessionId?: string;
		type: CaptchaType;
		powDifficulty?: number;
		solvedImagesCount?: number;
		// The session's stored ipInfo (if a sessionId was provided and
		// resolved). Callers may use this for routing / scope logic
		// without re-reading the session record.
		ipInfo?: IPInfoResponse;
	}> {
		this.logger.debug(() => ({
			msg: "Validating request",
			data: {
				captchaType: requestedCaptchaType,
				sessionId,
			},
		}));

		// User Access Policies override default behaviour
		if (
			userAccessPolicy &&
			userAccessPolicy.captchaType !== requestedCaptchaType
		) {
			this.logger.warn(() => ({
				msg: "Invalid captcha type for user access policy",
				data: {
					account: clientSettings.account,
					captchaType: userAccessPolicy.captchaType,
				},
			}));
			return {
				valid: false,
				reason: ResultReason.INCORRECT_CAPTCHA_TYPE,
				type: requestedCaptchaType,
			};
		}
		// Session ID
		// All client flows now go through the unified /frictionless entry point,
		// so a sessionId may accompany any configured captchaType (frictionless
		// runs the decision machine; image/pow/puzzle short-circuit). We trust
		// the session record's captchaType as the source of truth.
		if (sessionId) {
			// Look up the cache record before consuming the session so we
			// can invalidate the hash → sessionId mapping even when the DB
			// record is already gone. Without this, the failure path leaks
			// the hash mapping for the remainder of its 1-hour TTL.
			const cachedBeforeRemove = this.writeQueue
				? await this.writeQueue.getCachedSession(sessionId)
				: null;

			// Invalidate the cached session up front so a concurrent
			// /frictionless can't keep resurrecting it via the hash → sessionId
			// pointer while we wait on the Mongo round-trip.
			const cachedHash =
				typeof cachedBeforeRemove?.userSitekeyIpHash === "string"
					? cachedBeforeRemove.userSitekeyIpHash
					: undefined;
			await Promise.all([
				this.writeQueue?.invalidateCachedSession(sessionId),
				cachedHash
					? this.writeQueue?.invalidateCachedSessionByHash(cachedHash)
					: Promise.resolve(),
			]);

			let sessionRecord = await this.db.checkAndRemoveSession(sessionId);
			let resolvedSessionId = sessionId;
			if (!sessionRecord && this.writeQueue) {
				// Origin session was consumed (or never existed). Before
				// returning NO_SESSION_FOUND, check whether a post-PoW
				// escalation minted a follow-up session for this origin.
				// `buildEscalation` in submitPoWCaptchaSolution.ts writes
				// this mapping when the routing machine returns image or
				// puzzle from postPow. Real-world widgets and dapps that
				// don't fully wire `onEscalate` keep calling /captcha/*
				// with the original sessionId — without this fallback they
				// see CAPTCHA.NO_SESSION_FOUND and the user lands on the
				// FAQ page.
				const escalationSessionId =
					await this.writeQueue.getCachedSessionEscalation(sessionId);
				if (escalationSessionId && escalationSessionId !== sessionId) {
					// Peek (read-only) at the escalation session before
					// consuming. If its captchaType doesn't match what the
					// widget is asking for, leave the session intact so a
					// subsequent /captcha/{escalationType} call carrying
					// the escalation sessionId (returned in the PoW-submit
					// envelope) can still succeed. Consuming here on
					// mismatch would surface INCORRECT_CAPTCHA_TYPE *and*
					// destroy the only remaining route to recovery.
					const peekedEscalationRecord =
						await this.db.getSessionRecordBySessionId(escalationSessionId);
					if (peekedEscalationRecord) {
						this.logger.info(() => ({
							msg: "Resolving origin sessionId to escalation",
							data: {
								account: clientSettings.account,
								originSessionId: sessionId,
								escalationSessionId,
								escalationCaptchaType: peekedEscalationRecord.captchaType,
								requestedCaptchaType,
							},
						}));
						if (peekedEscalationRecord.captchaType === requestedCaptchaType) {
							const consumedEscalationRecord =
								await this.db.checkAndRemoveSession(escalationSessionId);
							if (consumedEscalationRecord) {
								sessionRecord = consumedEscalationRecord;
								resolvedSessionId = escalationSessionId;
							}
						} else {
							// Type mismatch: do NOT consume the escalation
							// session, drop the pointer, and surface
							// INCORRECT_CAPTCHA_TYPE directly. A widget
							// that knows how to follow the PoW-submit
							// escalation envelope can still reach
							// `escalationSessionId` via the correct
							// /captcha/{type} endpoint.
							this.logger.warn(() => ({
								msg: "Escalation captcha type does not match requested type",
								data: {
									account: clientSettings.account,
									originSessionId: sessionId,
									escalationSessionId,
									escalationCaptchaType: peekedEscalationRecord.captchaType,
									requestedCaptchaType,
								},
							}));
							await this.writeQueue.invalidateCachedSessionEscalation(
								sessionId,
							);
							return {
								valid: false,
								reason: ResultReason.INCORRECT_CAPTCHA_TYPE,
								type: requestedCaptchaType,
							};
						}
					}
					// The escalation mapping is single-use: once we've
					// followed it (or tried to and the escalation session
					// is gone), drop the pointer so subsequent retries
					// don't keep chasing a dead reference.
					await this.writeQueue.invalidateCachedSessionEscalation(sessionId);
				}
			}
			if (!sessionRecord) {
				this.logger.warn(() => ({
					msg: "No session found",
					data: {
						account: clientSettings.account,
						sessionId: sessionId,
					},
				}));
				// DB and cache have drifted (e.g. cache outlived the DB
				// record, or Mongo was dropped while Redis kept the entry).
				// Without this, the hash → sessionId mapping keeps resolving
				// and /frictionless keeps "Reusing existing session" →
				// /captcha/* keeps failing in an infinite loop.
				if (this.writeQueue) {
					const cachedHash =
						typeof cachedBeforeRemove?.userSitekeyIpHash === "string"
							? cachedBeforeRemove.userSitekeyIpHash
							: undefined;
					await Promise.all([
						this.writeQueue.invalidateCachedSession(sessionId),
						cachedHash
							? this.writeQueue.invalidateCachedSessionByHash(cachedHash)
							: Promise.resolve(),
					]);
				}
				return {
					valid: false,
					reason: ResultReason.CAPTCHA_NO_SESSION_FOUND,
					type: requestedCaptchaType,
				};
			}
			// From here on, `sessionId` (the variable) tracks whichever
			// sessionId we actually resolved against. Subsequent cache
			// invalidations and downstream consumers should use that, not
			// the originally requested id — otherwise the escalation
			// session's own cache entries leak past the consume.
			sessionId = resolvedSessionId;

			// Invalidate the Redis session cache so that subsequent
			// requests do not receive this now-deleted sessionId from
			// the stale cache. Both the sessionId cache and the
			// hash → sessionId mapping must be invalidated, awaited so
			// no concurrent write (e.g. solution-submit `patchCachedSession`)
			// can re-populate the entry between consume and response.
			if (this.writeQueue) {
				await Promise.all([
					this.writeQueue.invalidateCachedSession(sessionId),
					sessionRecord.userSitekeyIpHash
						? this.writeQueue.invalidateCachedSessionByHash(
								sessionRecord.userSitekeyIpHash,
							)
						: Promise.resolve(),
				]);
			}

			// Validate IP address if currentIP is provided
			if (currentIP) {
				const ipValidation = await this.validateSessionIP(
					sessionRecord,
					currentIP,
					env,
				);
				if (!ipValidation.valid) {
					return {
						valid: false,
						reason: ipValidation.reason,
						type: requestedCaptchaType,
					};
				}
			}

			// Check the captcha type of the session is the same as the requested captcha type
			if (sessionRecord.captchaType !== requestedCaptchaType) {
				this.logger.warn(() => ({
					msg: "Session captcha type does not match requested type",
					data: {
						account: clientSettings.account,
						sessionId: sessionId,
						sessionCaptchaType: sessionRecord.captchaType,
						requestedCaptchaType,
					},
				}));
				return {
					valid: false,
					reason: ResultReason.INCORRECT_CAPTCHA_TYPE,
					type: requestedCaptchaType,
				};
			}

			return {
				valid: true,
				sessionId: sessionRecord.sessionId,
				type: requestedCaptchaType,
				...(sessionRecord.powDifficulty && {
					powDifficulty: sessionRecord.powDifficulty,
				}),
				...(sessionRecord.solvedImagesCount && {
					solvedImagesCount: sessionRecord.solvedImagesCount,
				}),
				ipInfo: sessionRecord.ipInfo,
			};
		}

		// No Session ID

		// To pass here a user must be requesting the captchaType that is stored on the client's settings.
		// - If `captchaType` is `image` and there is no `sessionId` then `clientSettings?.settings?.captchaType,` must be set to `image`
		// - If `captchaType` is `pow` and there is no `sessionId` then `clientSettings?.settings?.captchaType,` must be set to `pow`
		// - If `captchaType` is `frictionless` and there is no `sessionId` then `clientSettings?.settings?.captchaType,` must be set to `frictionless`
		if (clientSettings?.settings?.captchaType !== requestedCaptchaType) {
			this.logger.warn(() => ({
				msg: `Invalid ${requestedCaptchaType} request`,
				data: {
					account: clientSettings.account,
					requestedCaptchaType: requestedCaptchaType,
					settingsCaptchaType: clientSettings?.settings?.captchaType,
				},
			}));
			return {
				valid: false,
				reason: ResultReason.INCORRECT_CAPTCHA_TYPE,
				type: requestedCaptchaType,
			};
		}

		return { valid: true, type: requestedCaptchaType };
	}

	getVerificationResponse(
		verified: boolean,
		clientRecord: ClientRecord,
		translateFn: (key: string) => string,
		score?: number,
		reason?: string,
	) {
		return {
			status: translateFn(
				verified ? "API.USER_VERIFIED" : "API.USER_NOT_VERIFIED",
			),
			[ApiParams.verified]: verified,
			...(CaptchaManager.canClientSeeScore(clientRecord.tier, score) && {
				[ApiParams.score]: score,
			}),
			...(!verified &&
				clientRecord.tier !== Tier.Free &&
				reason && {
					[ApiParams.reason]: reason,
				}),
		};
	}

	async getPrioritisedAccessPolicies(
		userAccessRulesStorage: AccessRulesStorage,
		clientId: string,
		userScope: UserScope | UserScopeRecord,
		options?: {
			blockOnly?: boolean;
			// When a caller has an Express request in scope (e.g. the
			// verify handler), passing it here shares the per-request memo
			// with the block middleware — a duplicate lookup within one
			// request collapses to zero extra Redis round-trips.
			requestMemoHost?: object;
		},
	) {
		return getPrioritisedAccessRule(
			userAccessRulesStorage,
			userScope,
			clientId,
			options,
		);
	}

	async getDetectorKeys(): Promise<string[]> {
		return await this.db.getDetectorKeys();
	}

	/**
	 * Decrypt the catcher's WASM SIMD CPU fingerprint readings via the
	 * obfuscated `decodeSimd.js` bundle (source lives in the private
	 * @prosopo/catcher repo). Mirrors `decryptBehavioralData`: tries each
	 * detector key in turn (loaded by the caller, with the env-var key as
	 * fallback). Returns null when no key works so the caller can drop
	 * the field rather than fail the whole request.
	 */
	async decryptSimdReadings(
		encryptedData: string,
		decryptKeys: (string | undefined)[],
	): Promise<SimdReadingsResult | null> {
		const decryptSimdReadings = (await import("./detection/decodeSimd.js"))
			.default;

		const validKeys = decryptKeys.filter((k) => k);
		if (validKeys.length === 0) {
			this.logger?.error(() => ({
				msg: "No decryption keys provided for SIMD readings",
			}));
			return null;
		}

		for (const [keyIndex, key] of validKeys.entries()) {
			try {
				return await decryptSimdReadings(encryptedData, key);
			} catch (err) {
				this.logger?.debug(() => ({
					msg: "Failed to decrypt SIMD readings with key, trying next",
					data: {
						keyIndex: keyIndex + 1,
						totalKeys: validKeys.length,
						err,
					},
				}));
			}
		}

		this.logger?.warn(() => ({
			msg: "Failed to decrypt SIMD readings with all available keys",
			data: { totalKeysAttempted: validKeys.length },
		}));
		return null;
	}

	async decryptBehavioralData(
		encryptedData: string,
		decryptKeys: (string | undefined)[],
	): Promise<BehavioralDataResult | null> {
		const decryptBehavioralData = (
			await import("./detection/decodeBehavior.js")
		).default;

		const validKeys = decryptKeys.filter((k) => k);

		if (validKeys.length === 0) {
			this.logger?.error(() => ({
				msg: "No decryption keys provided for behavioral data",
			}));
			return null;
		}

		// Try each key until one succeeds
		for (const [keyIndex, key] of validKeys.entries()) {
			try {
				this.logger?.debug(() => ({
					msg: "Attempting to decrypt behavioral data",
					data: {
						keyIndex: keyIndex + 1,
						totalKeys: validKeys.length,
					},
				}));

				// Decrypt behavioral data - returns unpacked format: {collector1, collector2, collector3, deviceCapability, timestamp}
				const result = await decryptBehavioralData(encryptedData, key);

				this.logger?.info(() => ({
					msg: "Behavioral data decrypted successfully",
					data: {
						keyIndex: keyIndex + 1,
						c1Length: result.collector1?.length || 0,
						c2Length: result.collector2?.length || 0,
						c3Length: result.collector3?.length || 0,
						deviceCapability: result.deviceCapability,
					},
				}));

				return result;
			} catch (error) {
				this.logger?.debug(() => ({
					msg: "Failed to decrypt with key, trying next",
					data: {
						keyIndex: keyIndex + 1,
						totalKeys: validKeys.length,
						err: error,
					},
				}));
				// Continue to next key
			}
		}

		// All keys failed
		this.logger?.error(() => ({
			msg: "Failed to decrypt behavioral data with all available keys",
			data: {
				totalKeysAttempted: validKeys.length,
			},
		}));

		return null;
	}

	/**
	 * Checks if a user should be hard blocked based on access policies
	 * Only checks for Block policies without captchaType
	 *
	 * @returns The blocking policy if user should be blocked, undefined otherwise
	 */
	async checkForHardBlock(
		userAccessRulesStorage: AccessRulesStorage,
		challengeRecord: PoWCaptchaRecord | PuzzleCaptchaRecord | UserCommitment,
		userAccount: string,
		headers: RequestHeaders,
		coords?: [number, number][][],
		countryCode?: string,
		asn?: number,
	): Promise<AccessPolicy | undefined> {
		// Get headHash from session record if available
		let headHash: string | undefined;
		if (challengeRecord.sessionId) {
			const sessionRecord = await this.db.getSessionRecordBySessionId(
				challengeRecord.sessionId,
			);
			headHash = sessionRecord?.decryptedHeadHash;
		}

		// Serialize coords to string for querying
		const coordsString = coords ? JSON.stringify(coords) : undefined;

		const ipAddressRecord = getIpAddressFromComposite(
			challengeRecord.ipAddress,
		);

		const userScope = getRequestUserScope(
			headers,
			challengeRecord.ja4,
			ipAddressRecord.address,
			userAccount,
			headHash,
			coordsString,
			countryCode,
			asn,
		);

		const accessPolicies = await this.getPrioritisedAccessPolicies(
			userAccessRulesStorage,
			challengeRecord.dappAccount,
			userScope,
			// Hard-block lookup only — restrict the Redis-side candidate
			// pool to Block rules so the SERVER_SIDE_RANK_TOP_N cap can't
			// crowd a hard-block out of the top-N with Restrict or
			// routing-Block (captchaType-scoped) entries.
			{ blockOnly: true },
		);

		return findHardBlockPolicy(accessPolicies);
	}

	/**
	 * Checks if the provided email address has a domain in the spam email domain list.
	 * Returns true if the email domain is spam (i.e. should be blocked), false otherwise.
	 * Handles formats: user@domain.com, @domain.com, domain.com
	 */
	async checkSpamEmail(email: string): Promise<boolean> {
		return checkSpamEmailFn(email, this.db, this.config, this.logger);
	}

	/**
	 * Resolves the IP info to feed to `checkTrafficFilter` and runs the check.
	 *
	 * - The captcha record already carries the IPInfoResponse from request
	 *   time (ipInfoMiddleware → storeXxxRecord), so by default we reuse it
	 *   instead of hitting the sidecar again.
	 * - If the dapp's server passed up the end user's current IP via the
	 *   verify call, look that up fresh — it's the "now" IP for filtering
	 *   and may differ from the IP that originally requested the captcha.
	 * - When the session carries a `dnsEvent`, its `peerIp` and `resolverIp`
	 *   are enriched and passed alongside the primary IP.
	 * - `blockAbuser` defaults to true so abusive networks are always
	 *   blocked even when the site hasn't configured a trafficFilter.
	 * - Returns `{ isBlocked: false }` if every filter flag is off, without
	 *   consulting the payload at all.
	 *
	 * Callers handle the "blocked" branch themselves (each verify path
	 * updates record / session state differently); this helper just returns
	 * the verdict.
	 */
	async resolveTrafficFilterCheck(
		env: ProviderEnvironment,
		recordIpInfo: IPInfoResponse | undefined,
		trafficFilter: Partial<ITrafficFilter> | undefined,
		currentIp?: string,
		enrichedDnsEvent?: EnrichedDnsEvent,
	): Promise<TrafficCheckResult> {
		const effective = { blockAbuser: true, ...trafficFilter };
		const hasAny = Object.values(effective).some((v) => v);
		if (!hasAny) {
			return { isBlocked: false };
		}

		const ipInfo = currentIp
			? await env.ipInfoService.lookup(currentIp)
			: recordIpInfo;

		return checkTrafficFilter(
			ipInfo,
			effective,
			extraIpInfosFromEnrichedDnsEvent(enrichedDnsEvent),
			enrichedDnsEvent?.pathValid,
		);
	}

	static canClientSeeScore(tier: Tier, score?: number) {
		return score && tier && tier !== Tier.Free;
	}
}
