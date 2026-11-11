import { ProsopoError, isProsopoError, isSevereError } from "@prosopo/common";
import { summariseFingerprintProof } from "@prosopo/fingerprint/summary";
import {
	CaptchaType,
	type IFrictionlessTypes,
	type PowCaptchaSolutionEscalation,
	type PowCaptchaSolutionResponse,
	SubmitPowCaptchaSolutionBody,
	type SubmitPowCaptchaSolutionBodyTypeOutput,
	isInteractiveCaptchaType,
} from "@prosopo/types";
import type { ProviderEnvironment } from "@prosopo/types-env";
import { getIPAddress } from "@prosopo/util";
import type { NextFunction, Request, Response } from "express";
import type { AugmentedRequest } from "../../express.js";
import { Tasks } from "../../tasks/tasks.js";
import type { DeviceVerdict } from "../../utils/devicePlatform.js";
import { getMaintenanceMode } from "../admin/apiToggleMaintenanceModeEndpoint.js";
import type { RawTlsSignals } from "../rawTlsSignalsMiddleware.js";
import { summariseRequestBody } from "../requestBodySummary.js";
import { resolveTestSiteKeyVerdict } from "../testSiteKey.js";
import { validateAddr, validateSiteKey } from "../validateAddress.js";
import {
	escalationConnectionSignals,
	escalationSiteConstraints,
	mintEscalation,
} from "./escalation.js";
import { buildPostSolveRoutingContext } from "./postSolveRoutingContext.js";

export default (env: ProviderEnvironment) =>
	async (
		req: Request & AugmentedRequest,
		res: Response,
		next: NextFunction,
	) => {
		// Maintenance-mode short-circuit must run before `new Tasks(env, ...)`
		// because the Tasks constructor calls `env.getDb()`, which throws when
		// `env.db` is undefined (the maintenance-mode case).
		if (getMaintenanceMode()) {
			req.logger.info(() => ({
				msg: "Maintenance mode active - returning verified",
			}));
			const response: PowCaptchaSolutionResponse = {
				status: "ok",
				verified: true,
			};
			return res.json(response);
		}

		let parsed: SubmitPowCaptchaSolutionBodyTypeOutput;
		const tasks = new Tasks(env, req.logger);

		try {
			parsed = SubmitPowCaptchaSolutionBody.parse(req.body);
		} catch (err) {
			return next(
				new ProsopoError({
					code: "INVALID_REQUEST",
					errorSite: "PROV-27",
					message: "Error parsing captcha",
					cause: err,
					context: { body: summariseRequestBody(req) },
				}),
			);
		}

		const {
			challenge,
			signature,
			nonce,
			dapp,
			user,
			behavioralData,
			salt,
			simdReadings,
			clientMetaData,
			fingerprintProof,
		} = parsed;

		validateSiteKey(dapp);
		validateAddr(user);

		// Reserved CI test site keys force a deterministic verdict before any DB
		// lookup, so they work in every environment without a registered record.
		const testVerdict = resolveTestSiteKeyVerdict(dapp, req.logger);
		if (testVerdict !== null) {
			const response: PowCaptchaSolutionResponse = {
				status: "ok",
				verified: testVerdict,
			};
			return res.json(response);
		}

		try {
			const clientRecord = await tasks.db.getClientRecord(dapp);

			if (!clientRecord) {
				return next(
					new ProsopoError({
						code: "SITE_KEY_NOT_REGISTERED",
						errorSite: "PROV-28",
						context: { siteKey: dapp },
					}),
				);
			}

			// Summarised once here and handed to both the routing context and the
			// record write, so the machine and the stored record cannot disagree
			// about what a proof disclosed, and a 7.8KB proof is parsed and
			// Merkle-checked once per submission rather than twice.
			const fingerprintSummary = summariseFingerprintProof(fingerprintProof);
			// Observability for the proof-of-fingerprint flow: the validation
			// itself runs inside the closed-source routing machine (no logger), so
			// log here at the provider boundary whether a proof arrived.
			req.logger.info(() => ({
				msg: fingerprintProof
					? "fingerprintProof detected"
					: "no fingerprintProof on PoW submission",
				data: {
					fingerprintProofPresent: fingerprintProof !== undefined,
					fingerprintProofBytes: fingerprintProof?.length ?? 0,
					fingerprintSummarised: fingerprintSummary !== undefined,
					challenge,
				},
			}));

			tasks.powCaptchaManager.setPostPowContext(
				buildPostSolveRoutingContext(req, clientRecord, {
					fingerprintProof,
					fingerprintSummary,
				}),
			);

			// `solutionTimeout` gates issuance → submit; falls back to
			// `verifiedTimeout` for records that pre-date the field, since
			// historically that value covered both windows. Mongoose `default`
			// doesn't fire on reads, so the runtime value can be undefined
			// even though the parsed schema type says `number`.
			const persistedSolutionTimeout = clientRecord.settings.solutionTimeout as
				| number
				| undefined;
			const submitWindowMs: number =
				persistedSolutionTimeout ?? clientRecord.settings.verifiedTimeout;
			const result = await tasks.powCaptchaManager.verifyPowCaptchaSolution({
				challenge,
				providerChallengeSignature: signature.provider.challenge,
				nonce,
				timeout: submitWindowMs,
				userTimestampSignature: signature.user.timestamp,
				ipAddress: getIPAddress(req.ip || ""),
				behavioralData,
				salt,
				simdReadings,
				clientMetaData,
				fingerprintSummary,
			});

			// Surface the routing machine's post-PoW decision (escalation +
			// selection reason, e.g. FINGERPRINT_PROOF_INVALID) at the provider
			// boundary so the fingerprint outcome is visible in provider logs.
			if (result.routingOutput) {
				req.logger.info(() => ({
					msg: "post-PoW routing decision",
					data: {
						routedCaptchaType: result.routingOutput?.captchaType,
						routingReason: result.routingOutput?.reason,
						challenge,
					},
				}));
			}

			const escalation = await buildEscalation({
				tasks,
				result,
				challenge,
				perConnectionSignals: escalationConnectionSignals(req),
				siteConstraints: escalationSiteConstraints(clientRecord),
			});
			const response: PowCaptchaSolutionResponse = {
				status: "ok",
				// On escalation the user is not done — they still need to clear
				// the follow-up interactive challenge before we hand them a token.
				verified: escalation ? false : result.verified,
				...(escalation && { escalation }),
			};
			return res.json(response);
		} catch (err) {
			if (isProsopoError(err) && !isSevereError(err)) return next(err);
			req.logger.error(() => ({
				err,
				body: summariseRequestBody(req),
				msg: "Error in PoW captcha solution submission",
			}));
			return next(
				new ProsopoError({
					code: "UNEXPECTED",
					errorSite: "PROV-29",
					message: "BadRequest",
					cause: err,
					context: { siteKey: req.body.dapp },
				}),
			);
		}
	};

/**
 * Escalate a verified PoW solve the routing machine sent on to an interactive
 * challenge. Returns undefined when the router kept the user on PoW.
 *
 * Exported for unit testing only — the handler above is the production entry
 * point.
 */
export const buildEscalation = async ({
	tasks,
	result,
	challenge,
	perConnectionSignals,
	siteConstraints,
}: {
	tasks: Tasks;
	result: {
		verified: boolean;
		routingOutput?: { captchaType: CaptchaType };
		device?: DeviceVerdict;
	};
	challenge: string;
	// Per-connection signals (TLS handshake timings + raw TCP handshake
	// signals) come from the CURRENT PoW-submit request, not from
	// `originSession` — those values belong to a different TCP connection
	// made during the earlier frictionless request.
	perConnectionSignals?: RawTlsSignals & {
		tcpToChelloUs?: number;
		chelloToHandshakeUs?: number;
	};
	// Site constraints on what an escalation may serve. Threaded from the
	// handler, which already holds the client record, rather than re-read
	// here. An absent `allowedCaptchaTypes` falls back to the default flags and
	// preferences, and an absent `imageMaxRounds` to the schema default, so the
	// round count is bounded either way.
	siteConstraints?: {
		allowedCaptchaTypes?: IFrictionlessTypes;
		imageMaxRounds?: number;
		puzzleMaxDifficulty?: number;
	};
}): Promise<PowCaptchaSolutionEscalation | undefined> => {
	if (!result.verified || !result.routingOutput) return undefined;
	if (!isInteractiveCaptchaType(result.routingOutput.captchaType)) {
		return undefined;
	}

	const powRecord = await tasks.db.getPowCaptchaRecordByChallenge(challenge);
	if (!powRecord?.sessionId) return undefined;

	return mintEscalation({
		tasks,
		routingOutput: result.routingOutput,
		origin: {
			sessionId: powRecord.sessionId,
			dappAccount: powRecord.dappAccount,
			captchaType: CaptchaType.pow,
			behavioralDataPacked: powRecord.behavioralDataPacked,
			fingerprintSummary: powRecord.fingerprintSummary,
		},
		device: result.device,
		perConnectionSignals,
		siteConstraints,
	});
};
