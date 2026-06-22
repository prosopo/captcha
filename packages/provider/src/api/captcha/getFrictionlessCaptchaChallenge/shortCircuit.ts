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
};

// Builds the session params used by the bypass paths (configured captcha type
// and empty-pool fallback). Score 0 — these paths do not run bot detection, so
// the session is created as a plain challenge rather than a scored one.
const buildBypassSessionParams = (input: ShortCircuitInput) => ({
	token: input.token,
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
 * Fallback when the detector bundle pool is initialised but empty (empty pool
 * dir / all bundles failed to load). Without a bundle the provider cannot run
 * frictionless detection, so it degrades to serving a real PoW challenge rather
 * than failing the request.
 *
 * Returns null (proceed with the normal detection path) when:
 *   - the pool was never initialised (`null`) — the pool feature is not active
 *     on this provider, so the legacy key-pool decryption path is used; or
 *   - the pool has at least one bundle.
 */
export const runEmptyDetectorPoolPowFallback = async (
	input: ShortCircuitInput,
	res: Response,
): Promise<Response | null> => {
	const pool = getDetectorBundlePool();
	if (!pool || pool.size() > 0) {
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
