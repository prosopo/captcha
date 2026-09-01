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

import type { Logger } from "@prosopo/logger";
import {
	CaptchaType,
	type IPInfoResponse,
	type ModeEnum,
	type RequestHeaders,
	type ScoreComponents,
} from "@prosopo/types";
import type { ClientRecord } from "@prosopo/types-database";
import type { ProviderEnvironment } from "@prosopo/types-env";
import type { Response } from "express";
import { v4 as uuidv4 } from "uuid";
import type { getCompositeIpAddress } from "../../../compositeIpAddress.js";
import { getDetectorBundlePool } from "../../../tasks/detection/bundlePool.js";
import type { Tasks } from "../../../tasks/index.js";
import { resolveScoreLadder } from "./constants.js";
import { attachHoneypot } from "./honeypotResponse.js";

export type ShortCircuitInput = {
	tasks: Tasks;
	env: ProviderEnvironment;
	clientRecord: ClientRecord;
	token: string;
	dapp: string;
	ipAddress: ReturnType<typeof getCompositeIpAddress>;
	ipInfo: IPInfoResponse | undefined;
	flatHeaders: RequestHeaders;
	sessionMode: ModeEnum;
	userSitekeyIpHash: string;
	requestId: string | undefined;
	logger: Logger;
	// Client's detector-session id from the request body. When present, the
	// bypass paths resolve the assigned bundleId via Redis and promote it
	// onto the session so SIMD / BDP attach at later hops (challenge GET,
	// solution submit) can find the right keypair. Without this, sessions on
	// configured-captchaType sitekeys (pow / image / puzzle) had no bundleId
	// and every attach silently dropped the payload.
	detectorSessionId?: string;
	tcpToChelloUs?: number;
	chelloToHandshakeUs?: number;
};

// Builds the session params used by the bypass paths (configured captcha type
// and empty-pool fallback). Score 0 — these paths do not run bot detection, so
// the session is created as a plain challenge rather than a scored one.
//
// `bundleId` is resolved from the client's detectorSessionId (Redis binding
// short-TTL) when the client actually ran a detector. Configured-captchaType
// sitekeys still get a detector assigned by /detector/assign because the
// widget doesn't know upstream that the sitekey is short-circuited — so the
// binding is usually there. Empty-pool fallback has no binding to resolve,
// so bundleId stays undefined and the attach path continues to no-op.
const buildBypassSessionParams = async (input: ShortCircuitInput) => {
	const bundleId = input.detectorSessionId
		? (
				await input.tasks.frictionlessManager.resolveBundleByDetectorSession(
					input.detectorSessionId,
				)
			)?.bundleId
		: undefined;
	return {
		// `sendCaptcha` requires a truthy token and dedup needs a unique value, so
		// synthesise one when the client had no detector to produce it.
		token: input.token || `nodetector-${uuidv4()}`,
		score: 0,
		// `Session.threshold` keeps its original meaning — the rung a silent
		// pass has to stay under — so it records the puzzle rung, not the
		// image one.
		threshold: resolveScoreLadder(
			input.clientRecord.settings?.frictionlessThreshold,
		).botThreshold,
		scoreComponents: { baseScore: 0 } as ScoreComponents,
		ipAddress: input.ipAddress,
		webView: false,
		iFrame: false,
		decryptedHeadHash: "",
		siteKey: input.dapp,
		ipInfo: input.ipInfo,
		headers: input.flatHeaders,
		mode: input.sessionMode,
		userSitekeyIpHash: input.userSitekeyIpHash,
		...(bundleId && { bundleId }),
		...(input.tcpToChelloUs !== undefined && {
			tcpToChelloUs: input.tcpToChelloUs,
		}),
		...(input.chelloToHandshakeUs !== undefined && {
			chelloToHandshakeUs: input.chelloToHandshakeUs,
		}),
	};
};

/**
 * Empty-pool PoW fallback. The detector lives only in the provider-served pool
 * bundles; when this provider has none to assign (missing dir, empty dir, or
 * all bundles failed to load) no client could have run detection, so it serves
 * a real PoW challenge rather than failing the request.
 *
 * This is a provider-side condition only. Nothing a client sends — an empty
 * token included — can reach this path; a client that ran no detector is
 * handled by the decision machine's missing-token gate.
 */
export const runEmptyDetectorPoolPowFallback = async (
	input: ShortCircuitInput,
	res: Response,
): Promise<Response | null> => {
	const pool = getDetectorBundlePool();
	if (pool && pool.size() > 0) {
		return null;
	}

	input.logger.warn(() => ({
		msg: "Frictionless decision",
		data: {
			requestId: input.requestId,
			decision: "empty_detector_pool_pow_fallback",
			captchaType: CaptchaType.pow,
		},
	}));

	attachHoneypot(res, input.clientRecord);
	return res.json(
		await input.tasks.frictionlessManager.sendPowCaptcha(
			await buildBypassSessionParams(input),
		),
	);
};

// Bypasses the bot-detection decision machine when the sitekey is configured
// for a concrete captcha type. Returns null for fully-frictionless sitekeys.
export const runConfiguredCaptchaTypeShortCircuit = async (
	input: ShortCircuitInput,
	res: Response,
): Promise<Response | null> => {
	const configuredType = input.clientRecord.settings?.captchaType;
	if (!configuredType || configuredType === CaptchaType.frictionless) {
		return null;
	}

	const sessionParams = await buildBypassSessionParams(input);

	input.logger.info(() => ({
		msg: "Frictionless decision",
		data: {
			decision: "configured_captcha_type",
			captchaType: configuredType,
		},
	}));

	attachHoneypot(res, input.clientRecord);
	switch (configuredType) {
		case CaptchaType.image:
			return res.json(
				await input.tasks.frictionlessManager.sendImageCaptcha({
					...sessionParams,
					solvedImagesCount: Math.min(
						input.env.config.captchas.solved.count,
						input.clientRecord.settings.imageMaxRounds,
					),
				}),
			);
		case CaptchaType.pow:
			return res.json(
				await input.tasks.frictionlessManager.sendPowCaptcha(sessionParams),
			);
		case CaptchaType.puzzle:
			return res.json(
				await input.tasks.frictionlessManager.sendPuzzleCaptcha(sessionParams),
			);
		default:
			throw new Error(
				`Unhandled configured captchaType in /frictionless short-circuit: ${configuredType}`,
			);
	}
};
