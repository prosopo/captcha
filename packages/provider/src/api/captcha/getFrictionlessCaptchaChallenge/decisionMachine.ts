import {
	CaptchaType,
	type IPInfoResponse,
	type RequestHeaders,
	type ScoreComponents,
	clampImageRounds,
	resolveImageRoundsBounds,
} from "@prosopo/types";
import type { ClientRecord } from "@prosopo/types-database";
import type { ProviderEnvironment } from "@prosopo/types-env";
import type { NextFunction, Request, Response } from "express";
import type { AugmentedRequest } from "../../../express.js";
import {
	FrictionlessManager,
	FrictionlessReason,
} from "../../../tasks/frictionless/frictionlessTasks.js";
import { timestampDecayFunction } from "../../../tasks/frictionless/frictionlessTasksUtils.js";
import type { Tasks } from "../../../tasks/index.js";
import { hashUserAgent } from "../../../utils/hashUserAgent.js";
import { recordFrictionlessDecision } from "../../metrics.js";
import {
	DECRYPTION_FAILED_IMAGE_ROUNDS,
	MISSING_HEAD_HASH_IMAGE_ROUNDS,
	MISSING_TOKEN_IMAGE_ROUNDS,
	getRoundsFromTriggeredDetectors,
} from "./constants.js";
import { attachHoneypot } from "./honeypotResponse.js";

export type DecisionMachineInput = {
	tasks: Tasks;
	env: ProviderEnvironment;
	clientRecord: ClientRecord;
	dapp: string;
	user: string;
	userSitekeyIpHash: string;
	flatHeaders: RequestHeaders;
	ipInfo: IPInfoResponse | undefined;
	timestamp: number;
	decryptionFailed: boolean;
	userAgent: string | undefined;
	userId: string | undefined;
	webView: boolean;
	decryptedHeadHash: string;
	baseBotScore: number;
	botScore: number;
	scoreComponents: ScoreComponents;
	token: string;
	// As received from the client, before decryption — the gates below read
	// these to tell "sent nothing" apart from "sent something we can't open".
	headHash: string;
	// Lower rung of the score ladder: at or below this, the session passes
	// frictionlessly to PoW.
	botThreshold: number;
	// Upper rung: at or above this the session gets an image captcha. Scores
	// strictly between the two rungs get a puzzle. Collapsing the two onto the
	// same value removes the middle band.
	botImageThreshold: number;
	// Signals that fired for this session. Sizes the image challenge — more
	// corroborating signals, more rounds.
	triggeredDetectors: number[] | undefined;
	// Sanitised page URL the widget reported (origin + path, no query /
	// fragment / credentials). Undefined when the client didn't report a
	// usable page URL — see the missing-currentUrl gate below.
	currentUrl: string | undefined;
	// Sanitised iframe URL when the widget was embedded (origin + path only).
	// Undefined when the widget was the top frame — not gated in the machine;
	// forwarded to the routing machine's raw signals for analytics.
	iframeUrl: string | undefined;
};

type ExpressHandle = {
	req: Request & AugmentedRequest;
	res: Response;
	next: NextFunction;
};

// Post-validation pipeline: payload presence → decrypt → UA → context →
// webview → timestamp → host → score → default-pow. Runs after the access-rule
// ladder in the handler. Always terminates the request.
export const runDecisionMachine = async (
	input: DecisionMachineInput,
	handle: ExpressHandle,
): Promise<unknown> => {
	const {
		tasks,
		env,
		clientRecord,
		dapp,
		userSitekeyIpHash,
		flatHeaders,
		ipInfo,
	} = input;
	const { req, res } = handle;
	let { botScore, scoreComponents } = input;

	// An absent payload is never a pass. A client that ran no detector — for any
	// reason, self-reported or not — has told us nothing about itself, so it
	// solves an image captcha. Only the provider itself can skip detection
	// (maintenance mode, empty bundle pool), and both do so before this point.
	if (!input.token) {
		req.logger.info(() => ({
			msg: "Frictionless decision",
			data: {
				decision: "missing_token",
				captchaType: CaptchaType.image,
			},
		}));
		recordFrictionlessDecision("missing_token");
		attachHoneypot(res, clientRecord);
		return res.json(
			await tasks.frictionlessManager.sendImageCaptcha({
				solvedImagesCount: clampImageRounds(
					MISSING_TOKEN_IMAGE_ROUNDS,
					clientRecord.settings,
				),
				userSitekeyIpHash,
				reason: FrictionlessReason.MISSING_TOKEN,
				siteKey: dapp,
				ipInfo,
				headers: flatHeaders,
			}),
		);
	}

	if (!input.headHash) {
		req.logger.info(() => ({
			msg: "Frictionless decision",
			data: {
				decision: "missing_head_hash",
				captchaType: CaptchaType.image,
			},
		}));
		recordFrictionlessDecision("missing_head_hash");
		attachHoneypot(res, clientRecord);
		return res.json(
			await tasks.frictionlessManager.sendImageCaptcha({
				solvedImagesCount: clampImageRounds(
					MISSING_HEAD_HASH_IMAGE_ROUNDS,
					clientRecord.settings,
				),
				userSitekeyIpHash,
				reason: FrictionlessReason.MISSING_HEAD_HASH,
				siteKey: dapp,
				ipInfo,
				headers: flatHeaders,
			}),
		);
	}

	// A payload we couldn't decrypt tells us nothing about the client — it is
	// not evidence of a bot, it is absence of evidence. Handle it explicitly and
	// first, before any check that reads a decrypted field.
	//
	// This has to precede the user-agent check specifically. `decryptPayload`
	// leaves `userAgent` and `userId` undefined on failure, so the comparison
	// below is a real hash against `undefined` — it can never match, and every
	// undecryptable session was being reported as USER_AGENT_MISMATCH and sized
	// by `timestampDecayFunction`'s decryption-failed arm (6 rounds). Behind
	// that sat two more accidents waiting on the synthetic `baseBotScore = 1` /
	// `timestamp = 0`: a hard 401 on any sitekey with `autoBanScoreThreshold`
	// set, and the old-timestamp branch. None of the three was meant for this.
	if (input.decryptionFailed) {
		req.logger.info(() => ({
			msg: "Frictionless decision",
			data: {
				decision: "decryption_failed",
				captchaType: CaptchaType.image,
			},
		}));
		recordFrictionlessDecision("decryption_failed");
		attachHoneypot(res, clientRecord);
		return res.json(
			await tasks.frictionlessManager.sendImageCaptcha({
				solvedImagesCount: clampImageRounds(
					DECRYPTION_FAILED_IMAGE_ROUNDS,
					clientRecord.settings,
				),
				userSitekeyIpHash,
				reason: FrictionlessReason.DECRYPTION_FAILED,
				siteKey: dapp,
				ipInfo,
				headers: flatHeaders,
			}),
		);
	}

	const userAgentMismatchResponse = await runUserAgentMismatchCheck(
		input,
		handle,
	);
	if (userAgentMismatchResponse) return userAgentMismatchResponse;

	// Accumulate all score penalties before evaluating autoBan so the
	// threshold compares against the full sum.
	const webViewTripped =
		clientRecord.settings.disallowWebView === true && input.webView === true;
	if (webViewTripped) {
		tasks.logger.info(() => ({ msg: "WebView detected" }));
		const scoreUpdate = tasks.frictionlessManager.scoreIncreaseWebView(
			input.baseBotScore,
			botScore,
			scoreComponents,
		);
		botScore = scoreUpdate.score;
		scoreComponents = scoreUpdate.scoreComponents;
		tasks.frictionlessManager.updateScore(botScore, scoreComponents);
	}

	const timestampTripped = FrictionlessManager.timestampTooOld(input.timestamp);
	if (timestampTripped) {
		const scoreUpdate = tasks.frictionlessManager.scoreIncreaseTimestamp(
			input.timestamp,
			input.baseBotScore,
			botScore,
			scoreComponents,
		);
		botScore = scoreUpdate.score;
		scoreComponents = scoreUpdate.scoreComponents;
		tasks.frictionlessManager.updateScore(botScore, scoreComponents);
	}

	const autoBanThreshold = clientRecord.settings.autoBanScoreThreshold;
	if (autoBanThreshold !== undefined && Number(botScore) >= autoBanThreshold) {
		req.logger.info(() => ({
			msg: "Frictionless decision",
			data: {
				decision: "auto_ban_score",
				botScore,
				autoBanThreshold,
				token: input.token,
			},
		}));
		recordFrictionlessDecision("auto_ban_score");
		await tasks.frictionlessManager.registerBlockedSession({
			solvedImagesCount: resolveImageRoundsBounds(clientRecord.settings).max,
			userSitekeyIpHash,
			reason: FrictionlessReason.AUTO_BAN_SCORE,
			siteKey: dapp,
			ipInfo,
			headers: flatHeaders,
		});
		return res.status(401).json({ error: "Unauthorized" });
	}

	if (webViewTripped) {
		req.logger.info(() => ({
			msg: "Frictionless decision",
			data: {
				decision: "webview_detected",
				captchaType: CaptchaType.image,
			},
		}));
		recordFrictionlessDecision("webview_detected");
		attachHoneypot(res, clientRecord);
		return res.json(
			await tasks.frictionlessManager.sendImageCaptcha({
				solvedImagesCount: clampImageRounds(
					env.config.captchas.solved.count * 2,
					clientRecord.settings,
				),
				userSitekeyIpHash,
				reason: FrictionlessReason.WEBVIEW_DETECTED,
				siteKey: dapp,
				ipInfo,
				headers: flatHeaders,
			}),
		);
	}

	if (timestampTripped) {
		req.logger.info(() => ({
			msg: "Frictionless decision",
			data: {
				decision: "timestamp_too_old",
				captchaType: CaptchaType.image,
			},
		}));
		recordFrictionlessDecision("timestamp_too_old");
		attachHoneypot(res, clientRecord);
		return res.json(
			await tasks.frictionlessManager.sendImageCaptcha({
				solvedImagesCount: clampImageRounds(
					timestampDecayFunction(
						input.timestamp,
						clientRecord.settings.imageMaxRounds,
					),
					clientRecord.settings,
				),
				userSitekeyIpHash,
				reason: FrictionlessReason.OLD_TIMESTAMP,
				siteKey: dapp,
				ipInfo,
				headers: flatHeaders,
			}),
		);
	}

	// Rounds an image challenge would carry from here on: the sitekey's
	// baseline plus one per signal that fired, clamped into its bounds.
	// Computed once because the puzzle band uses it too — a puzzle session
	// downgrades to image when this provider can't render puzzles, and the
	// downgraded session should be sized like the image challenge it became.
	const scoredImageRounds = clampImageRounds(
		getRoundsFromTriggeredDetectors(
			env.config.captchas.solved.count,
			input.triggeredDetectors,
		),
		clientRecord.settings,
	);

	// Middle rung of the ladder: "not clean enough for a silent PoW" is split
	// in two, so merely suspicious sessions drag a puzzle and only the ones
	// past the upper rung are handed an image captcha. A sitekey that puts
	// both rungs on the same value collapses the band and keeps the original
	// two outcomes.
	const botImageThreshold = input.botImageThreshold;
	if (
		botImageThreshold > input.botThreshold &&
		Number(botScore) > input.botThreshold &&
		Number(botScore) < botImageThreshold
	) {
		req.logger.info(() => ({
			msg: "Frictionless decision",
			data: {
				decision: "bot_score_puzzle_band",
				captchaType: CaptchaType.puzzle,
				botScore,
				botThreshold: input.botThreshold,
				botImageThreshold,
				token: input.token,
			},
		}));
		recordFrictionlessDecision("bot_score_puzzle_band");
		attachHoneypot(res, clientRecord);
		return res.json(
			await tasks.frictionlessManager.sendPuzzleCaptcha({
				// Only read if the puzzle renderer is unavailable and the
				// session is downgraded to image on the way out.
				solvedImagesCount: scoredImageRounds,
				userSitekeyIpHash,
				reason: FrictionlessReason.BOT_SCORE_PUZZLE_BAND,
				siteKey: dapp,
				ipInfo,
				headers: flatHeaders,
			}),
		);
	}

	if (Number(botScore) > input.botThreshold) {
		req.logger.info(() => ({
			msg: "Bot score is greater than threshold",
			data: {
				botScore,
				botThreshold: input.botThreshold,
				token: input.token,
			},
		}));
		req.logger.info(() => ({
			msg: "Frictionless decision",
			data: {
				decision: "bot_score_above_threshold",
				captchaType: CaptchaType.image,
				solvedImagesCount: scoredImageRounds,
				triggeredDetectorCount: input.triggeredDetectors?.length ?? 0,
			},
		}));
		recordFrictionlessDecision("bot_score_above_threshold");
		attachHoneypot(res, clientRecord);
		return res.json(
			await tasks.frictionlessManager.sendImageCaptcha({
				solvedImagesCount: scoredImageRounds,
				userSitekeyIpHash,
				reason: FrictionlessReason.BOT_SCORE_ABOVE_THRESHOLD,
				siteKey: dapp,
				ipInfo,
				headers: flatHeaders,
			}),
		);
	}

	// Checked last, just before the PoW fallthrough: a request that reported
	// no usable page URL gets an image captcha rather than a frictionless pass.
	if (!input.currentUrl) {
		req.logger.info(() => ({
			msg: "Frictionless decision",
			data: {
				decision: "missing_current_url",
				captchaType: CaptchaType.image,
				token: input.token,
			},
		}));
		recordFrictionlessDecision("missing_current_url");
		attachHoneypot(res, clientRecord);
		return res.json(
			await tasks.frictionlessManager.sendImageCaptcha({
				solvedImagesCount: clampImageRounds(
					env.config.captchas.solved.count,
					clientRecord.settings,
				),
				userSitekeyIpHash,
				reason: FrictionlessReason.MISSING_CURRENT_URL,
				siteKey: dapp,
				ipInfo,
				headers: flatHeaders,
			}),
		);
	}

	req.logger.info(() => ({
		msg: "Frictionless decision",
		data: {
			decision: "default_pow",
			captchaType: CaptchaType.pow,
		},
	}));
	recordFrictionlessDecision("default_pow");
	attachHoneypot(res, clientRecord);
	return res.json(
		await tasks.frictionlessManager.sendPowCaptcha({
			userSitekeyIpHash,
			siteKey: dapp,
			ipInfo,
			headers: flatHeaders,
		}),
	);
};

const runUserAgentMismatchCheck = async (
	input: DecisionMachineInput,
	handle: ExpressHandle,
): Promise<Response | null> => {
	const { req, res } = handle;
	const headersUserAgent = req.headers["user-agent"];
	const headersProsopoUser = req.headers["prosopo-user"];
	const hashedHeadersUserAgent = headersUserAgent
		? hashUserAgent(headersUserAgent)
		: "";

	if (
		hashedHeadersUserAgent === input.userAgent &&
		headersProsopoUser === input.userId
	) {
		return null;
	}

	req.logger.info(() => ({
		msg: "User agent or user id does not match",
		data: {
			headersUserAgent,
			hashedHeadersUserAgent,
			userAgent: input.userAgent,
			headersProsopoUser,
			userId: input.userId,
		},
	}));

	req.logger.info(() => ({
		msg: "Frictionless decision",
		data: {
			decision: "user_agent_mismatch",
			captchaType: CaptchaType.image,
		},
	}));
	recordFrictionlessDecision("user_agent_mismatch");
	attachHoneypot(res, input.clientRecord);
	return res.json(
		await input.tasks.frictionlessManager.sendImageCaptcha({
			solvedImagesCount: clampImageRounds(
				timestampDecayFunction(
					input.timestamp,
					input.clientRecord.settings.imageMaxRounds,
				),
				input.clientRecord.settings,
			),
			userSitekeyIpHash: input.userSitekeyIpHash,
			reason: FrictionlessReason.USER_AGENT_MISMATCH,
			siteKey: input.dapp,
			ipInfo: input.ipInfo,
			headers: input.flatHeaders,
		}),
	);
};
