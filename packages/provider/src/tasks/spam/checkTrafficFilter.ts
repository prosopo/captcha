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
	harshestPolicy,
	isStricterCaptchaType,
} from "@prosopo/captcha-severity";
import {
	type CaptchaType,
	type IAudioSettings,
	type IIconOrderSettings,
	type IPInfoResponse,
	type IPInfoResult,
	type IPuzzleSettings,
	type ITrafficCategoryException,
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

// Match a name list against `datacenterName`, `providerName`
// (`company.name`), and `asnOrganization` — case-insensitive, whitespace
// trimmed. The upstream ipapi only populates `datacenter.datacenter` for
// curated named ranges, so falling back to providerName and asnOrganization
// lets the lists also catch generic CDN / cloud-provider IPs that come
// back with `is_datacenter: true` but no datacenter name.
const matchesNameList = (
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

const PRIVATE_RELAY_NAMES: ReadonlyArray<string> = ["iCloud Private Relay"];

export const isPrivateRelay = (ipInfo: IPInfoResult): boolean =>
	matchesNameList(ipInfo, PRIVATE_RELAY_NAMES);

// Sites saved before the lists moved onto every category keep theirs in the
// top-level datacenter fields.
const nameAllowlist = (
	trafficFilter: Partial<ITrafficFilter>,
	category: TrafficCategory,
): ReadonlyArray<string> => [
	...(trafficFilter[category]?.nameAllowlist ?? []),
	...((category === "datacenter" && trafficFilter.datacenterNameAllowlist) ||
		[]),
];

const nameDenylist = (
	trafficFilter: Partial<ITrafficFilter>,
	category: TrafficCategory,
): ReadonlyArray<string> => [
	...(trafficFilter[category]?.nameDenylist ?? []),
	...((category === "datacenter" && trafficFilter.datacenterNameDenylist) ||
		[]),
];

export const isNameAllowlisted = (
	ipInfo: IPInfoResult,
	trafficFilter: Partial<ITrafficFilter>,
	category: TrafficCategory,
): boolean => matchesNameList(ipInfo, nameAllowlist(trafficFilter, category));

export const isNameDenylisted = (
	ipInfo: IPInfoResult,
	trafficFilter: Partial<ITrafficFilter>,
	category: TrafficCategory,
): boolean => matchesNameList(ipInfo, nameDenylist(trafficFilter, category));

// A relay egress IP is a partner CDN node shared by many Apple users, so its
// flags describe the node, not the visitor — and ipapi.is marks some relay
// ranges as VPN as well as datacenter. Relay egress is always hosting, so the
// name alone is not trusted. Nothing about relay makes an IP a Tor exit, so
// exempting Tor could only hide a real one.
const isPrivateRelayExempt = (
	ipInfo: IPInfoResult,
	category: TrafficCategory,
): boolean =>
	category !== "tor" && ipInfo.isDatacenter && isPrivateRelay(ipInfo);

/**
 * Whether a category the IP is flagged with applies to it. The same rules
 * hold for every category: the denylist keeps the IP in, overriding the
 * category's own qualifier and any allowlist entry; otherwise the qualifier
 * must hold and the IP must not be on the allowlist or be relay egress.
 */
export const categoryApplies = (
	ipInfo: IPInfoResult,
	trafficFilter: Partial<ITrafficFilter>,
	category: TrafficCategory,
	qualifies = true,
): boolean => {
	if (isNameDenylisted(ipInfo, trafficFilter, category)) return true;
	if (!qualifies) return false;
	if (isPrivateRelayExempt(ipInfo, category)) return false;
	return !isNameAllowlisted(ipInfo, trafficFilter, category);
};

// Consumer ISPs are sometimes flagged datacenter when their edge is
// co-located, so the datacenter flag only qualifies on a non-ISP provider.
// Shared with `computeDnsAsymmetry` so its datacenter signal follows the
// same rules.
export const isEffectivelyDatacenter = (
	ipInfo: IPInfoResult,
	trafficFilter: Partial<ITrafficFilter>,
): boolean =>
	ipInfo.isDatacenter &&
	categoryApplies(
		ipInfo,
		trafficFilter,
		"datacenter",
		ipInfo.providerType !== "isp",
	);

const maxAbuserScore = (ipInfo: IPInfoResult): number =>
	Math.max(ipInfo.abuserScore ?? 0, ipInfo.companyAbuserScore ?? 0);

const exceptionApplies = (
	exception: ITrafficCategoryException,
	ipInfo: IPInfoResult,
	marketCountries: ReadonlyArray<string>,
): boolean => {
	const countryCode = ipInfo.countryCode?.trim().toUpperCase();
	if (
		exception.countries &&
		!(countryCode && exception.countries.includes(countryCode))
	) {
		return false;
	}
	if (exception.inMarket !== undefined) {
		if (!countryCode || marketCountries.length === 0) return false;
		if (marketCountries.includes(countryCode) !== exception.inMarket) {
			return false;
		}
	}
	if (
		exception.mobile !== undefined &&
		Boolean(ipInfo.isMobile) !== exception.mobile
	) {
		return false;
	}
	return (
		exception.minAbuserScore === undefined ||
		maxAbuserScore(ipInfo) >= exception.minAbuserScore
	);
};

const policyForIp = (
	policy: ITrafficCategoryPolicy,
	ipInfo: IPInfoResult,
	marketCountries: ReadonlyArray<string>,
): ITrafficCategoryPolicy => {
	const exception = harshestPolicy(
		(policy.exceptions ?? []).filter((candidate) =>
			exceptionApplies(candidate, ipInfo, marketCountries),
		),
		(candidate) => candidate.action === TrafficFilterAction.Block,
	);
	if (!exception) return policy;
	const { countries, inMarket, minAbuserScore, mobile, ...exceptionPolicy } =
		exception;
	return exceptionPolicy;
};

// The first flag, in precedence order, whose category applies owns the IP.
// Only that category's policy is consulted; lower flags are ignored, even
// when active. An IP that's fundamentally a Tor exit or a VPN is that
// category first — upstream flagging it as datacenter/abuser/etc. is
// downstream categorisation the top flag already captures. So if the
// operator hasn't configured a policy for the owning flag, the IP passes.
//
// A flag whose category does not apply (see `categoryApplies`) does not own
// the IP and evaluation falls through to the next flag.
const evaluateIpInfo = (
	ipInfo: IPInfoResponse | undefined,
	trafficFilter: Partial<ITrafficFilter>,
	isDnsExtra = false,
): TrafficFilterMatch[] => {
	if (!ipInfo || !ipInfo.isValid) return [];

	const abuserScoreThreshold =
		trafficFilter.abuserScoreThreshold ??
		trafficFilterAbuserScoreThresholdDefault;
	const flags: ReadonlyArray<[TrafficCategory, boolean, boolean]> = [
		["tor", ipInfo.isTor, true],
		["vpn", ipInfo.isVPN, true],
		["proxy", ipInfo.isProxy, true],
		["datacenter", ipInfo.isDatacenter, ipInfo.providerType !== "isp"],
		["abuser", ipInfo.isAbuser, maxAbuserScore(ipInfo) >= abuserScoreThreshold],
		// Public DNS resolvers share IP space with search crawlers.
		["crawler", ipInfo.isCrawler, !isDnsExtra],
		["satellite", ipInfo.isSatellite, true],
		["mobile", ipInfo.isMobile, true],
	];

	const owner = flags.find(
		([category, flagged, qualifies]) =>
			flagged && categoryApplies(ipInfo, trafficFilter, category, qualifies),
	);
	if (!owner) return [];
	const [category] = owner;
	const policy = trafficFilter[category];
	if (!policy) return [];
	const marketCountries = trafficFilter.marketCountries ?? [];
	return [{ category, policy: policyForIp(policy, ipInfo, marketCountries) }];
};

/**
 * Evaluate trafficFilter against the request's IPs and return every category
 * that matched (with the operator's policy for that category). Each match
 * carries the policy `action` — `block` fires at submit time; `challenge`
 * fires at request time to override captcha type + params.
 *
 * Per-IP precedence: within a single IP, the highest-precedence flag whose
 * category applies wins and is the only category that emits a match. Order
 * (highest first): Tor, VPN, proxy, datacenter, abuser, crawler, satellite,
 * mobile. If the operator hasn't configured a policy for that flag, the IP
 * passes cleanly — lower flags are not consulted. So an IP that's flagged
 * as both VPN and proxy is only acted on if the operator has a VPN policy.
 *
 * Exceptions: once a category owns the IP, its `exceptions` whose conditions
 * (country, in or out of the account's market, minimum abuser score) the IP
 * meets replace the category's policy. When several match, the harshest wins
 * by the same ranking the access rules use, so their order does not matter:
 * e.g. proxies blocked, but challenged in the market unless their abuser
 * score is high.
 *
 * Whether a flagged category applies is decided the same way for every
 * category. Its `nameDenylist` keeps the IP in. Otherwise the category's
 * qualifier must hold — datacenter needs a non-ISP provider, abuser needs
 * `abuserScore` (or `companyAbuserScore`) at or above `abuserScoreThreshold`,
 * crawler is skipped on DNS extras because public DNS resolvers share IP
 * space with search crawlers — and the IP must be neither on the category's
 * `nameAllowlist` nor iCloud Private Relay egress (exempt from every
 * category but Tor). A category that does not apply falls through to the
 * next flag.
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

/** A lower tolerance is a smaller hit radius, so the strictest is the minimum. */
const strictestTolerance = (
	current: number | undefined,
	next: number | undefined,
): number | undefined =>
	next === undefined || current === undefined
		? (next ?? current)
		: Math.min(current, next);

// Precedence for combining multiple `challenge` matches on the same
// request. `block` outranks any challenge (short-circuited earlier in
// `checkTrafficFilter`); among captcha types, image outranks puzzle
// outranks pow — a stricter check is monotonically preferred so the
// operator's hardest configured policy wins. The ordering comes from
// `@prosopo/captcha-severity`, shared with the access rules' `ruleHarshness`
// and with downstream routing consumers.

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
	audioSettings?: IAudioSettings;
	iconOrderTolerance?: number;
	iconOrderSettings?: IIconOrderSettings;
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
		if (isStricterCaptchaType(m.policy.captchaType, winningCaptchaType)) {
			winningCaptchaType = m.policy.captchaType;
		}
	}

	let powDifficulty: number | undefined;
	let solvedImagesCount: number | undefined;
	let puzzleTolerance: number | undefined;
	let puzzleSettings: IPuzzleSettings | undefined;
	let audioSettings: IAudioSettings | undefined;
	let iconOrderTolerance: number | undefined;
	let iconOrderSettings: IIconOrderSettings | undefined;
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
		puzzleTolerance = strictestTolerance(
			puzzleTolerance,
			m.policy.puzzleTolerance,
		);
		// Per-field merge across categories: last-writer-wins on any sub-
		// field that is set. If no category sets a given puzzle field, the
		// combined object leaves it undefined and the downstream resolver
		// falls back to clientSettings then the asset-package default.
		if (m.policy.puzzle) {
			puzzleSettings = { ...(puzzleSettings ?? {}), ...m.policy.puzzle };
		}
		if (m.policy.audio) {
			audioSettings = { ...(audioSettings ?? {}), ...m.policy.audio };
		}
		iconOrderTolerance = strictestTolerance(
			iconOrderTolerance,
			m.policy.iconOrderTolerance,
		);
		if (m.policy.iconOrder) {
			iconOrderSettings = {
				...(iconOrderSettings ?? {}),
				...m.policy.iconOrder,
			};
		}
	}

	return {
		captchaType: winningCaptchaType,
		powDifficulty,
		solvedImagesCount,
		puzzleTolerance,
		puzzleSettings,
		audioSettings,
		iconOrderTolerance,
		iconOrderSettings,
		sourceCategories: challenges.map((m) => m.category),
	};
};

/**
 * Largest `padBytes` across all matched categories, block or challenge. A
 * blocked category still resolves to a deferred challenge at request time, so
 * padding it burns the caller's bandwidth on the way to being blocked.
 */
export const resolvePadBytes = (
	matches: TrafficFilterMatch[],
): number | undefined => {
	let padBytes: number | undefined;
	for (const m of matches) {
		if (m.policy.padBytes !== undefined) {
			padBytes =
				padBytes === undefined
					? m.policy.padBytes
					: Math.max(padBytes, m.policy.padBytes);
		}
	}
	return padBytes;
};
