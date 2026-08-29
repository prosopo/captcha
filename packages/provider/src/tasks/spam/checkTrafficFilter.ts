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

import {
	CaptchaType,
	type IPInfoResponse,
	type IPInfoResult,
	type IPuzzleSettings,
	type ITrafficCategoryPolicy,
	type ITrafficFilter,
	ResultReason,
	TrafficFilterAction,
	trafficFilterAbuserScoreThresholdDefault,
} from "@prosopo/types";

export type TrafficBlockReason =
	| ResultReason.VPN_BLOCKED
	| ResultReason.PROXY_BLOCKED
	| ResultReason.TOR_BLOCKED
	| ResultReason.ABUSER_BLOCKED
	| ResultReason.DATACENTER_BLOCKED
	| ResultReason.MOBILE_BLOCKED
	| ResultReason.SATELLITE_BLOCKED
	| ResultReason.CRAWLER_BLOCKED;

export type TrafficCategory =
	| "vpn"
	| "proxy"
	| "tor"
	| "abuser"
	| "datacenter"
	| "mobile"
	| "satellite"
	| "crawler";

export const TRAFFIC_CATEGORIES: readonly TrafficCategory[] = [
	"vpn",
	"proxy",
	"tor",
	"abuser",
	"datacenter",
	"mobile",
	"satellite",
	"crawler",
] as const;

const CATEGORY_TO_REASON: Record<TrafficCategory, TrafficBlockReason> = {
	vpn: ResultReason.VPN_BLOCKED,
	proxy: ResultReason.PROXY_BLOCKED,
	tor: ResultReason.TOR_BLOCKED,
	abuser: ResultReason.ABUSER_BLOCKED,
	datacenter: ResultReason.DATACENTER_BLOCKED,
	mobile: ResultReason.MOBILE_BLOCKED,
	satellite: ResultReason.SATELLITE_BLOCKED,
	crawler: ResultReason.CRAWLER_BLOCKED,
};

export type TrafficFilterMatch = {
	category: TrafficCategory;
	policy: ITrafficCategoryPolicy;
};

export type TrafficCheckResult =
	| { isBlocked: false; matches: TrafficFilterMatch[] }
	| {
			isBlocked: true;
			reason: TrafficBlockReason;
			matches: TrafficFilterMatch[];
	  };

export const categoryToReason = (
	category: TrafficCategory,
): TrafficBlockReason => CATEGORY_TO_REASON[category];

// Match the allowlist / denylist against `datacenterName`, `providerName`
// (`company.name`), and `asnOrganization` — case-insensitive, whitespace
// trimmed. The upstream ipapi only populates `datacenter.datacenter` for
// curated named ranges, so falling back to providerName and asnOrganization
// lets the lists also catch generic CDN / cloud-provider IPs that come
// back with `is_datacenter: true` but no datacenter name.
const matchesDatacenterNameList = (
	ipInfo: IPInfoResult,
	list: ReadonlyArray<string> | undefined,
): boolean => {
	if (!list || list.length === 0) {
		return false;
	}
	const candidates: string[] = [];
	for (const value of [
		ipInfo.datacenterName,
		ipInfo.providerName,
		ipInfo.asnOrganization,
	]) {
		if (typeof value !== "string") continue;
		const trimmed = value.trim().toLowerCase();
		if (trimmed) candidates.push(trimmed);
	}
	if (candidates.length === 0) {
		return false;
	}
	const normalisedList = list.map((entry) => entry.trim().toLowerCase());
	return candidates.some((c) => normalisedList.includes(c));
};

export const isDatacenterAllowlisted = (
	ipInfo: IPInfoResult,
	allowlist: ReadonlyArray<string> | undefined,
): boolean => matchesDatacenterNameList(ipInfo, allowlist);

// Counterpart to `isDatacenterAllowlisted`. When the datacenter rule is
// active and the IP's name matches an entry in `datacenterNameDenylist`,
// the rule fires regardless of the `providerType === "isp"` suppression
// and regardless of any allowlist entry for the same name. Denylist wins
// so operators can opt named providers back into the rule that would
// otherwise be exempted by the ISP heuristic.
export const isDatacenterDenylisted = (
	ipInfo: IPInfoResult,
	denylist: ReadonlyArray<string> | undefined,
): boolean => matchesDatacenterNameList(ipInfo, denylist);

// True when the IP's datacenter flag survives its qualifiers:
// `datacenterNameDenylist` forces a match; otherwise the IP must not be
// classified `providerType === "isp"` and must not be on
// `datacenterNameAllowlist`. Used by the datacenter step of the per-IP
// precedence chain in `evaluateIpInfo`, and mirrored by
// `computeDnsAsymmetry` to gate its datacenter signal on the same rules.
export const isEffectivelyDatacenter = (
	ipInfo: IPInfoResult,
	trafficFilter: Partial<ITrafficFilter>,
): boolean => {
	if (!ipInfo.isDatacenter) return false;
	if (isDatacenterDenylisted(ipInfo, trafficFilter.datacenterNameDenylist)) {
		return true;
	}
	return (
		ipInfo.providerType !== "isp" &&
		!isDatacenterAllowlisted(ipInfo, trafficFilter.datacenterNameAllowlist)
	);
};

const push = (
	matches: TrafficFilterMatch[],
	category: TrafficCategory,
	policy: ITrafficCategoryPolicy | undefined,
): void => {
	if (policy) matches.push({ category, policy });
};

// Highest-precedence flag set on the IP wins. Only that category's policy
// is consulted; lower-precedence flags on the same IP are ignored, even
// when active. An IP that's fundamentally a Tor exit or a VPN is that
// category first — upstream flagging it as datacenter/abuser/etc. is
// downstream categorisation the top flag already captures. So if the
// operator hasn't configured a policy for the top flag, the IP passes.
//
// A few flags carry qualifying conditions that reject the flag itself:
// abuser with score below threshold, datacenter with providerType='isp'
// (and no denylist match, no allowlist bypass), crawler on DNS extras.
// When those conditions disqualify the flag, evaluation falls through to
// the next flag — the IP is not really that category.
const evaluateIpInfo = (
	ipInfo: IPInfoResponse | undefined,
	trafficFilter: Partial<ITrafficFilter>,
	isDnsExtra = false,
): TrafficFilterMatch[] => {
	const matches: TrafficFilterMatch[] = [];
	if (!ipInfo || !ipInfo.isValid) return matches;

	if (ipInfo.isTor) {
		push(matches, "tor", trafficFilter.tor);
		return matches;
	}

	if (ipInfo.isVPN) {
		push(matches, "vpn", trafficFilter.vpn);
		return matches;
	}

	if (ipInfo.isProxy) {
		push(matches, "proxy", trafficFilter.proxy);
		return matches;
	}

	if (isEffectivelyDatacenter(ipInfo, trafficFilter)) {
		push(matches, "datacenter", trafficFilter.datacenter);
		return matches;
	}

	if (ipInfo.isAbuser) {
		const threshold =
			trafficFilter.abuserScoreThreshold ??
			trafficFilterAbuserScoreThresholdDefault;
		const maxScore = Math.max(
			ipInfo.abuserScore ?? 0,
			ipInfo.companyAbuserScore ?? 0,
		);
		if (maxScore >= threshold) {
			push(matches, "abuser", trafficFilter.abuser);
			return matches;
		}
	}

	// Public DNS resolvers share IP space with search crawlers.
	if (ipInfo.isCrawler && !isDnsExtra) {
		push(matches, "crawler", trafficFilter.crawler);
		return matches;
	}

	if (ipInfo.isSatellite) {
		push(matches, "satellite", trafficFilter.satellite);
		return matches;
	}

	if (ipInfo.isMobile) {
		push(matches, "mobile", trafficFilter.mobile);
		return matches;
	}

	return matches;
};

/**
 * Evaluate trafficFilter against the request's IPs and return every category
 * that matched (with the operator's policy for that category). Each match
 * carries the policy `action` — `block` fires at submit time; `challenge`
 * fires at request time to override captcha type + params.
 *
 * Per-IP precedence: within a single IP, the highest-precedence flag set on
 * that IP wins and is the only category that emits a match. Order (highest
 * first): Tor, VPN, proxy, datacenter, abuser, crawler, satellite, mobile.
 * If the operator hasn't configured a policy for that top flag, the IP
 * passes cleanly — lower flags are not consulted. So an IP that's flagged
 * as both VPN and proxy is only acted on if the operator has a VPN policy.
 *
 * Qualifying conditions: a flag that fails its qualifier does not "own"
 * the IP and evaluation falls through to the next flag. The abuser flag
 * needs `abuserScore` (or `companyAbuserScore`) at or above
 * `abuserScoreThreshold`; the datacenter flag needs the IP to not be an
 * ISP (`providerType !== "isp"`) or to be on `datacenterNameDenylist`,
 * and to not be on `datacenterNameAllowlist`; the crawler flag is skipped
 * on DNS extras because public DNS resolvers share IP space with search
 * crawlers.
 *
 * Datacenter name lists: `datacenterNameAllowlist` lets operators opt named
 * consumer relays (e.g. iCloud Private Relay) out of the datacenter rule;
 * `datacenterNameDenylist` opts named providers back in even when the ISP
 * heuristic would exempt them.
 *
 * When `trafficFilter.skipExtrasOnValidDnsPath` is on and the catcher
 * confirmed the DNS path matched the connection path (`pathValid: true`),
 * the extras evaluation is skipped.
 *
 * The `isBlocked` verdict is set when at least one match has
 * `action === "block"`, with `reason` naming that category. Callers that
 * only care about challenges can inspect `matches` directly and use
 * `resolveChallengePolicy` to combine them.
 */
export const checkTrafficFilter = (
	ipInfo: IPInfoResponse | undefined,
	trafficFilter: Partial<ITrafficFilter>,
	extraIpInfos?: ReadonlyArray<IPInfoResponse | undefined>,
	dnsPathValid?: boolean,
): TrafficCheckResult => {
	const matches: TrafficFilterMatch[] = [];
	matches.push(...evaluateIpInfo(ipInfo, trafficFilter));

	const skipExtras =
		trafficFilter.skipExtrasOnValidDnsPath && dnsPathValid === true;
	if (!skipExtras) {
		for (const extra of extraIpInfos ?? []) {
			matches.push(...evaluateIpInfo(extra, trafficFilter, true));
		}
	}

	const firstBlock = matches.find(
		(m) => m.policy.action === TrafficFilterAction.Block,
	);
	if (firstBlock) {
		return {
			isBlocked: true,
			reason: categoryToReason(firstBlock.category),
			matches,
		};
	}

	return { isBlocked: false, matches };
};

// Precedence for combining multiple `challenge` matches on the same
// request. `block` outranks any challenge (short-circuited earlier in
// `checkTrafficFilter`); among captcha types, image outranks puzzle
// outranks pow — a stricter check is monotonically preferred so the
// operator's hardest configured policy wins.
const CAPTCHA_TYPE_RANK: Record<CaptchaType, number> = {
	[CaptchaType.image]: 4,
	[CaptchaType.puzzle]: 3,
	[CaptchaType.pow]: 2,
	[CaptchaType.frictionless]: 1,
	// authenticated is Web Bot Auth pass-through, never a challenge outcome
	// selected by traffic filtering — include for enum totality only.
	[CaptchaType.authenticated]: 0,
};

const rankCaptchaType = (t: CaptchaType | undefined): number =>
	t === undefined ? 0 : (CAPTCHA_TYPE_RANK[t] ?? 0);

export type ResolvedChallengePolicy = {
	captchaType?: CaptchaType;
	powDifficulty?: number;
	solvedImagesCount?: number;
	puzzleTolerance?: number;
	// Merged puzzle render overrides across all matched challenge
	// categories: later categories overwrite earlier ones on a per-field
	// basis, so partial overrides on separate categories compose. Empty
	// object means "no policy specified any puzzle setting"; undefined
	// means no challenge matches at all (already short-circuited above).
	puzzleSettings?: IPuzzleSettings;
	// Categories whose policies contributed to the resolved combination.
	sourceCategories: TrafficCategory[];
};

/**
 * Combine the `challenge` matches into a single effective policy: pick the
 * strictest captcha type, then take the hardest params (max difficulty,
 * max image count, min puzzle tolerance). `block` matches are ignored —
 * callers should short-circuit on the top-level `isBlocked` verdict
 * first. Returns undefined when there are no challenge matches.
 */
export const resolveChallengePolicy = (
	matches: TrafficFilterMatch[],
): ResolvedChallengePolicy | undefined => {
	const challenges = matches.filter(
		(m) => m.policy.action === TrafficFilterAction.Challenge,
	);
	if (challenges.length === 0) return undefined;

	let winningCaptchaType: CaptchaType | undefined;
	for (const m of challenges) {
		if (
			rankCaptchaType(m.policy.captchaType) >
			rankCaptchaType(winningCaptchaType)
		) {
			winningCaptchaType = m.policy.captchaType;
		}
	}

	let powDifficulty: number | undefined;
	let solvedImagesCount: number | undefined;
	let puzzleTolerance: number | undefined;
	let puzzleSettings: IPuzzleSettings | undefined;
	for (const m of challenges) {
		if (m.policy.powDifficulty !== undefined) {
			powDifficulty =
				powDifficulty === undefined
					? m.policy.powDifficulty
					: Math.max(powDifficulty, m.policy.powDifficulty);
		}
		if (m.policy.solvedImagesCount !== undefined) {
			solvedImagesCount =
				solvedImagesCount === undefined
					? m.policy.solvedImagesCount
					: Math.max(solvedImagesCount, m.policy.solvedImagesCount);
		}
		if (m.policy.puzzleTolerance !== undefined) {
			puzzleTolerance =
				puzzleTolerance === undefined
					? m.policy.puzzleTolerance
					: Math.min(puzzleTolerance, m.policy.puzzleTolerance);
		}
		// Per-field merge across categories: last-writer-wins on any sub-
		// field that is set. If no category sets a given puzzle field, the
		// combined object leaves it undefined and the downstream resolver
		// falls back to clientSettings then the asset-package default.
		if (m.policy.puzzle) {
			puzzleSettings = { ...(puzzleSettings ?? {}), ...m.policy.puzzle };
		}
	}

	return {
		captchaType: winningCaptchaType,
		powDifficulty,
		solvedImagesCount,
		puzzleTolerance,
		puzzleSettings,
		sourceCategories: challenges.map((m) => m.category),
	};
};
