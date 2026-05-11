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

import type { Logger } from "@prosopo/common";
import type {
	CaptchaType,
	CounterSpec,
	RequestHeaders,
	RoutingMachineBaseline,
	RoutingMachineInput,
	RoutingMachineInputBase,
	RoutingMachineOutput,
	RoutingMachinePlatform,
	RoutingMachineRawSignals,
} from "@prosopo/types";
import type {
	CounterIncrement,
	UsageCounters,
} from "../../util/usageCounters.js";
import type { DecisionMachineRunner } from "../decisionMachine/decisionMachineRunner.js";

export interface RoutingContext {
	dappAccount: string;
	userAccount: string;
	ip: string;
	countryCode?: string;
	score: number;
	platform: RoutingMachinePlatform;
	raw: RoutingMachineRawSignals;
}

/**
 * Look up the configured routing machine for this dapp (falling back to global),
 * pre-fetch any counters it declares, run it, and return the chosen captcha
 * type. Returns the supplied baseline on any failure (no machine, machine
 * throws/times out, output fails validation, Redis unavailable).
 */
export const applyRouter = async (
	runner: DecisionMachineRunner,
	counters: UsageCounters | null,
	baseline: RoutingMachineBaseline,
	ctx: RoutingContext,
	logger: Logger,
): Promise<RoutingMachineOutput> => {
	try {
		const partial: RoutingMachineInputBase = {
			phase: "route",
			dappAccount: ctx.dappAccount,
			userAccount: ctx.userAccount,
			ip: ctx.ip,
			countryCode: ctx.countryCode,
			baseline,
			score: ctx.score,
			platform: ctx.platform,
			raw: ctx.raw,
		};

		const specs = await runner.getRequiredCounters(partial, logger);
		let counterMap: Record<string, number> = {};
		if (specs.length > 0) {
			if (!counters) {
				logger.warn(() => ({
					msg: "Routing machine requires counters but UsageCounters is unavailable; falling back to baseline",
					data: { dappAccount: ctx.dappAccount },
				}));
				return baseline;
			}
			const reads = specsToReads(specs, ctx);
			const fetched = await counters.batchGet(ctx.dappAccount, reads);
			if (!fetched) {
				logger.warn(() => ({
					msg: "Counter batch fetch failed; falling back to baseline",
					data: { dappAccount: ctx.dappAccount },
				}));
				return baseline;
			}
			counterMap = fetched;
		}

		const input: RoutingMachineInput = { ...partial, counters: counterMap };
		const output = await runner.route(input, logger);
		return output ?? baseline;
	} catch (error) {
		logger.error(() => ({
			msg: "applyRouter threw, falling back to baseline",
			err: error,
			data: { dappAccount: ctx.dappAccount },
		}));
		return baseline;
	}
};

/**
 * Map machine-declared CounterSpecs onto the values that the provider knows
 * how to read (IP and userAccount). Specs whose dimension we cannot resolve
 * are silently skipped.
 */
const specsToReads = (
	specs: CounterSpec[],
	ctx: RoutingContext,
): CounterIncrement[] => {
	const out: CounterIncrement[] = [];
	for (const spec of specs) {
		const value =
			spec.dimension === "ip"
				? ctx.ip
				: spec.dimension === "userAccount"
					? ctx.userAccount
					: undefined;
		if (value === undefined) continue;
		out.push({ spec, value });
	}
	return out;
};

/**
 * Helper used by both the request response path (served) and the verify path
 * (solved) to derive a stable counter context from a session record's worth of
 * data.
 */
export const buildRoutingContext = (input: {
	dappAccount: string;
	userAccount: string;
	ip: string;
	countryCode?: string;
	score: number;
	platform: RoutingMachinePlatform;
	headers: RequestHeaders;
	userAgent: string;
	ja4?: string;
	behavioralDataPacked?: RoutingMachineRawSignals["behavioralDataPacked"];
}): RoutingContext => ({
	dappAccount: input.dappAccount,
	userAccount: input.userAccount,
	ip: input.ip,
	countryCode: input.countryCode,
	score: input.score,
	platform: input.platform,
	raw: {
		headers: input.headers,
		userAgent: input.userAgent,
		ja4: input.ja4,
		behavioralDataPacked: input.behavioralDataPacked,
	},
});

/**
 * Convenience wrapper so callers don't have to know how to compose a baseline
 * from an arbitrary CaptchaType when they want a no-router path to take.
 */
export const baselineOf = (
	captchaType: CaptchaType.image | CaptchaType.pow | CaptchaType.puzzle,
	params: { solvedImagesCount?: number; powDifficulty?: number } = {},
): RoutingMachineBaseline => ({
	captchaType,
	solvedImagesCount: params.solvedImagesCount,
	powDifficulty: params.powDifficulty,
});
