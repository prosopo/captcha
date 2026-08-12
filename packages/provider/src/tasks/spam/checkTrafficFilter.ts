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

// A category is "active" (participates in evaluation) when the operator has
// configured any policy for it — block or challenge. Both intents signal
// that the operator treats the category as suspicious.
const isActive = (policy: ITrafficCategoryPolicy | undefined): boolean =>
	policy !== undefined;

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

const push = (
	matches: TrafficFilterMatch[],
	category: TrafficCategory,
	policy: ITrafficCategoryPolicy | undefined,
): void => {
	if (policy) matches.push({ category, policy });
};

const evaluateIpInfo = (
	ipInfo: IPInfoResponse | undefined,
	trafficFilter: Partial<ITrafficFilter>,
	isDnsExtra = false,
): TrafficFilterMatch[] => {
	const matches: TrafficFilterMatch[] = [];
	if (!ipInfo || !ipInfo.isValid) return matches;

	if (isActive(trafficFilter.vpn) && ipInfo.isVPN) {
		push(matches, "vpn", trafficFilter.vpn);
	}

	if (isActive(trafficFilter.proxy) && ipInfo.isProxy) {
		push(matches, "proxy", trafficFilter.proxy);
	}

	if (isActive(trafficFilter.tor) && ipInfo.isTor) {
		push(matches, "tor", trafficFilter.tor);
	}

	if (isActive(trafficFilter.abuser) && ipInfo.isAbuser) {
		const threshold =
			trafficFilter.abuserScoreThreshold ??
			trafficFilterAbuserScoreThresholdDefault;
		const maxScore = Math.max(
			ipInfo.abuserScore ?? 0,
			ipInfo.companyAbuserScore ?? 0,
		);
		if (maxScore >= threshold) {
			push(matches, "abuser", trafficFilter.abuser);
		}
	}

	const datacenterSuppressedByCategory =
		(ipInfo.isVPN && !isActive(trafficFilter.vpn)) ||
		(ipInfo.isProxy && !isActive(trafficFilter.proxy)) ||
		(ipInfo.isTor && !isActive(trafficFilter.tor)) ||
		(ipInfo.isCrawler && !isActive(trafficFilter.crawler));

	if (isActive(trafficFilter.datacenter) && ipInfo.isDatacenter) {
		if (isDatacenterDenylisted(ipInfo, trafficFilter.datacenterNameDenylist)) {
			push(matches, "datacenter", trafficFilter.datacenter);
		} else if (
			ipInfo.providerType !== "isp" &&
			!datacenterSuppressedByCategory &&
			!isDatacenterAllowlisted(ipInfo, trafficFilter.datacenterNameAllowlist)
		) {
			push(matches, "datacenter", trafficFilter.datacenter);
		}
	}

	if (isActive(trafficFilter.mobile) && ipInfo.isMobile) {
		push(matches, "mobile", trafficFilter.mobile);
	}

	if (isActive(trafficFilter.satellite) && ipInfo.isSatellite) {
		push(matches, "satellite", trafficFilter.satellite);
	}

	// Public DNS resolvers share IP space with search crawlers.
	if (!isDnsExtra && isActive(trafficFilter.crawler) && ipInfo.isCrawler) {
		push(matches, "crawler", trafficFilter.crawler);
	}

	return matches;
};

/**
 * Evaluate trafficFilter against the request's IPs and return every category
 * that matched (with the operator's policy for that category). Each match
 * carries the policy `action` — `block` fires at submit time; `challenge`
 * fires at request time to override captcha type + params.
 *
 * Cross-category rule: the datacenter category is suppressed when the IP
 * carries a more specific category the operator has not configured — VPN,
 * proxy, Tor, or crawler. All four legitimately sit on datacenter
 * infrastructure, so "datacenter" (a scraping rule) shouldn't catch them
 * out the back door.
 *
 * Extras-only rule: the crawler check is skipped on DNS extras. Public
 * DNS resolvers share IP space with search crawlers.
 *
 * The datacenter rule also honours `datacenterNameAllowlist`: consumer
 * relays route through datacenter ranges and are reported as
 * `is_datacenter=true` by upstream but the exiting users are real humans.
 *
 * The datacenter rule also short-circuits when upstream classifies the
 * provider as an ISP (`providerType === "isp"`). Consumer ISPs are
 * sometimes flagged `is_datacenter=true` upstream, but the ranges behind
 * those ASNs carry ordinary end-users.
 *
 * The ISP short-circuit and the allowlist are both overridden by
 * `datacenterNameDenylist`.
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
};

const rankCaptchaType = (t: CaptchaType | undefined): number =>
	t === undefined ? 0 : (CAPTCHA_TYPE_RANK[t] ?? 0);

export type ResolvedChallengePolicy = {
	captchaType?: CaptchaType;
	powDifficulty?: number;
	solvedImagesCount?: number;
	puzzleTolerance?: number;
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
		if (rankCaptchaType(m.policy.captchaType) > rankCaptchaType(winningCaptchaType)) {
			winningCaptchaType = m.policy.captchaType;
		}
	}

	let powDifficulty: number | undefined;
	let solvedImagesCount: number | undefined;
	let puzzleTolerance: number | undefined;
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
	}

	return {
		captchaType: winningCaptchaType,
		powDifficulty,
		solvedImagesCount,
		puzzleTolerance,
		sourceCategories: challenges.map((m) => m.category),
	};
};
