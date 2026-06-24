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
import { DEFAULT_FRICTIONLESS_THRESHOLD } from "./constants.js";
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
	sessionMode: ModeEnum | undefined;
	userSitekeyIpHash: string;
	requestId: string | undefined;
	logger: Logger;
	// Set when the client reported it had no provider detector bundle to run
	// (no pool, assign failed, or blob load failed). The detector lives only on
	// providers, so this means no detection happened ⇒ serve PoW.
	detectorUnavailable: boolean;
};

// Builds the session params used by the bypass paths (configured captcha type
// and empty-pool fallback). Score 0 — these paths do not run bot detection, so
// the session is created as a plain challenge rather than a scored one.
const buildBypassSessionParams = (input: ShortCircuitInput) => ({
	// The bypass paths create a session without a decryption token. When the
	// client had no detector to run (detectorUnavailable) it sends an empty
	// token, but `sendCaptcha` requires a truthy token, and the session needs a
	// unique value for dedup — so synthesise one when absent.
	token: input.token || `nodetector-${uuidv4()}`,
	score: 0,
	threshold:
		input.clientRecord.settings?.frictionlessThreshold ??
		DEFAULT_FRICTIONLESS_THRESHOLD,
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
});

/**
 * Universal "no detector ⇒ PoW" fallback. The detector lives only in the
 * provider-served pool bundles; when none is available for this request there
 * is no way to run (or decrypt) frictionless detection, so the provider serves
 * a real PoW challenge rather than the request failing or silently passing.
 *
 * Fires when EITHER:
 *   - the pool is empty (missing dir, empty dir, or all bundles failed to
 *     load) — no provider has a bundle to assign; or
 *   - the client reported `detectorUnavailable` (it couldn't fetch/run a
 *     bundle this session) — even if the pool itself is populated.
 *
 * Returns null (proceed with normal scored detection) only when the pool has at
 * least one bundle AND the client ran one.
 */
export const runNoDetectorPowFallback = async (
	input: ShortCircuitInput,
	res: Response,
): Promise<Response | null> => {
	const pool = getDetectorBundlePool();
	const poolEmpty = !pool || pool.size() === 0;
	if (!poolEmpty && !input.detectorUnavailable) {
		return null;
	}

	const reason = poolEmpty
		? "empty_detector_pool_pow_fallback"
		: "client_detector_unavailable_pow_fallback";
	// DEBUG(detector-pool): remove.
	input.logger.info(() => ({
		msg: `[POOL-DEBUG] no detector available (${poolEmpty ? "pool EMPTY" : "client reported detectorUnavailable"}) → serving a real PoW challenge`,
	}));
	input.logger.warn(() => ({
		msg: "Frictionless decision",
		data: {
			requestId: input.requestId,
			decision: reason,
			captchaType: CaptchaType.pow,
		},
	}));

	attachHoneypot(res, input.clientRecord);
	return res.json(
		await input.tasks.frictionlessManager.sendPowCaptcha(
			buildBypassSessionParams(input),
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

	const sessionParams = buildBypassSessionParams(input);

	input.logger.info(() => ({
		msg: "Frictionless decision",
		data: {
			requestId: input.requestId,
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
