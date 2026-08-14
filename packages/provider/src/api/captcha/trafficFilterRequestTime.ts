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
	type GetFrictionlessCaptchaResponse,
	type IPInfoResponse,
	type ITrafficFilter,
} from "@prosopo/types";
import type { ClientRecord } from "@prosopo/types-database";
import type { Response } from "express";
import type { FrictionlessManager } from "../../tasks/frictionless/frictionlessTasks.js";
import {
	type ResolvedChallengePolicy,
	checkTrafficFilter,
	resolveChallengePolicy,
} from "../../tasks/spam/checkTrafficFilter.js";

export type RequestTimeTrafficVerdict =
	| { kind: "pass" }
	| {
			kind: "challenge";
			// The strictest captcha type across matched challenge policies, or
			// undefined if no matched policy specified one.
			captchaType: CaptchaType | undefined;
			powDifficulty?: number;
			solvedImagesCount?: number;
			puzzleTolerance?: number;
			sourceCategories: ResolvedChallengePolicy["sourceCategories"];
	  };

/**
 * Evaluate the site's `trafficFilter` against the current request's IP info
 * at challenge-request time. Only `challenge` matches contribute at this
 * point — a matched `challenge` policy hands back an override bundle for
 * the caller to fold into its captcha-type + parameter selection. `block`
 * matches are deliberately ignored here; the enforcement of block policies
 * is deferred to submit / verify time (via `resolveTrafficFilterCheck` in
 * PoW / image / puzzle task classes) so that blocked users still receive a
 * captcha and produce a billable interaction. Removing this deferral
 * previously turned every blocked request into a request-time 401, which
 * the widget mis-handled into an INCORRECT_CAPTCHA_TYPE cascade — see
 * `evaluateFrictionlessResult` in `@prosopo/procaptcha-frictionless`.
 */
export const applyTrafficFilterAtRequestTime = (
	ipInfo: IPInfoResponse | undefined,
	trafficFilter: Partial<ITrafficFilter> | undefined,
	logger?: Logger,
): RequestTimeTrafficVerdict => {
	if (!trafficFilter) return { kind: "pass" };

	// No abuser default here — the default only makes sense at submit-time
	// where an unconfigured site should still block abusive IPs. At
	// request-time we consult only what the operator explicitly configured
	// as `challenge`, and let submit-time enforce every `block` (defaulted
	// or otherwise).
	const result = checkTrafficFilter(ipInfo, trafficFilter);

	const resolved = resolveChallengePolicy(result.matches);
	if (!resolved) return { kind: "pass" };

	logger?.info(() => ({
		msg: "Traffic filter applied challenge overrides",
		data: {
			categories: resolved.sourceCategories,
			captchaType: resolved.captchaType,
			powDifficulty: resolved.powDifficulty,
			solvedImagesCount: resolved.solvedImagesCount,
			puzzleTolerance: resolved.puzzleTolerance,
		},
	}));

	return {
		kind: "challenge",
		captchaType: resolved.captchaType,
		powDifficulty: resolved.powDifficulty,
		solvedImagesCount: resolved.solvedImagesCount,
		puzzleTolerance: resolved.puzzleTolerance,
		sourceCategories: resolved.sourceCategories,
	};
};

export type FrictionlessTrafficFilterOutcome =
	| { handled: false }
	| { handled: true; response: Response };

export type FrictionlessTrafficFilterInput = {
	verdict: RequestTimeTrafficVerdict;
	frictionlessManager: FrictionlessManager;
	clientRecord: ClientRecord;
	userSitekeyIpHash: string;
	dapp: string;
	ipInfo: IPInfoResponse | undefined;
	flatHeaders: Record<string, string>;
	logger: Logger;
};

/**
 * Frictionless-flow companion to `applyTrafficFilterAtRequestTime`. When the
 * verdict is `challenge` and names a concrete captchaType, dispatch to the
 * matching `send{Image,Pow,Puzzle}Captcha` helper with the resolved
 * parameter overrides. Otherwise returns `{ handled: false }` so the
 * caller falls through to the normal decision machine. Block matches are
 * not represented in the verdict at all — they're enforced at submit /
 * verify time (see the comment on `applyTrafficFilterAtRequestTime`).
 */
export const handleFrictionlessTrafficFilter = async (
	input: FrictionlessTrafficFilterInput,
	res: Response,
): Promise<FrictionlessTrafficFilterOutcome> => {
	const { verdict } = input;
	if (verdict.kind === "pass") return { handled: false };

	const baseParams = {
		userSitekeyIpHash: input.userSitekeyIpHash,
		siteKey: input.dapp,
		ipInfo: input.ipInfo,
		headers: input.flatHeaders,
	};

	const logDispatch = (captchaType: CaptchaType): void => {
		input.logger.info(() => ({
			msg: "Frictionless decision",
			data: {
				decision: "traffic_filter",
				captchaType,
				categories: verdict.sourceCategories,
			},
		}));
	};

	let response: GetFrictionlessCaptchaResponse | undefined;
	if (verdict.captchaType === CaptchaType.image) {
		logDispatch(CaptchaType.image);
		response = await input.frictionlessManager.sendImageCaptcha({
			...baseParams,
			solvedImagesCount: verdict.solvedImagesCount
				? Math.min(
						verdict.solvedImagesCount,
						input.clientRecord.settings.imageMaxRounds,
					)
				: input.clientRecord.settings.imageMaxRounds,
		});
	} else if (verdict.captchaType === CaptchaType.pow) {
		logDispatch(CaptchaType.pow);
		response = await input.frictionlessManager.sendPowCaptcha({
			...baseParams,
			...(verdict.powDifficulty !== undefined && {
				powDifficulty: verdict.powDifficulty,
			}),
		});
	} else if (verdict.captchaType === CaptchaType.puzzle) {
		logDispatch(CaptchaType.puzzle);
		response = await input.frictionlessManager.sendPuzzleCaptcha(baseParams);
	}

	if (response) {
		return { handled: true, response: res.json(response) };
	}

	// Challenge policy did not name a concrete captchaType — fall through
	// so the normal decision machine chooses. Parameter overrides that hit
	// this fall-through path (powDifficulty / solvedImagesCount /
	// puzzleTolerance without captchaType) apply through the direct
	// endpoints via `applyTrafficFilterAtRequestTime`, not here.
	return { handled: false };
};
