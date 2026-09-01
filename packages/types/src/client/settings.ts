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
import { array, boolean, number, object, type output, string, z } from "zod";
import {
	DEFAULT_POW_CAPTCHA_SOLUTION_TIMEOUT,
	DEFAULT_POW_CAPTCHA_VERIFIED_TIMEOUT,
} from "../config/timeouts.js";
import { CaptchaType } from "./captchaType/captchaType.js";
import { CaptchaTypeSpec } from "./captchaType/captchaTypeSpec.js";

export const captchaTypeDefault = CaptchaType.frictionless;
export const domainsDefault: string[] = [];

/**
 * Lower rung of the frictionless score ladder: at or below this a session
 * passes silently to PoW, above it the user is asked to drag a puzzle.
 *
 * Same value `frictionlessThreshold` carried when it was a bare number, so
 * moving to the ladder is a shape change and not a routing change — nobody
 * who passes frictionlessly today stops passing.
 */
export const frictionlessPuzzleThresholdDefault = 0.5;

/**
 * Upper rung: at or above this the user gets an image captcha instead.
 *
 * Deliberately allowed above 1 by the schema, unlike the lower rung: the
 * score compared against it is a total that server-side penalties add to,
 * and it is expected to exceed 1.
 */
export const frictionlessImageThresholdDefault = 1.0;

export const powDifficultyDefault = 4;
export const imageThresholdDefault = 0.8;
export const imageMaxRoundsDefault = 32;
// Floor on image rounds. Matches the floor that was previously only
// hard-coded (the provider's `captchas.solved.count` default and the
// `Math.max(2, …)` inside `timestampDecayFunction`), so leaving it unset
// preserves existing behaviour.
export const imageMinRoundsDefault = 2;
export const contextAwareThresholdDefault = 0.7;
export const puzzleToleranceDefault = 15;

// Puzzle render defaults, mirrored from `packages/puzzle-assets`'s
// `DEFAULT_RENDER_SETTINGS`. Kept here so the schema layer owns the
// authoritative bounds and defaults; the renderer just receives resolved
// values from the provider.
export const puzzleDecoyCountDefault = 5;
export const puzzleDecoyEdgeDarknessDefault = 20;
export const puzzleDecoyBodyBrightnessDefault = 4;
export const puzzleHoleDarkenDefault = 0.55;
// Multiplier on decoy pixels, mirroring `holeDarken` for the real cut.
// Lower = darker decoys. Kept looser than `holeDarken` so the real hole is
// still the deepest region on the frame; too close and humans can't tell,
// too far and a solver keys on brightness alone.
export const puzzleDecoyHoleDarkenDefault = 0.7;
// Piece size as a fraction of the background width. The provider draws a
// fresh value from [min, max] per challenge so a solver can't hard-code
// the expected silhouette scale. Defaults preserve the historical 44px
// minimum (44/300 ≈ 0.147) and open the top end to 90% of the frame; a
// piece is allowed to overhang the background — the cut is clipped.
export const puzzlePieceScaleMinDefault = 0.15;
export const puzzlePieceScaleMaxDefault = 0.45;

// Icon-order render defaults, mirrored from `packages/icon-order-assets`'s
// `DEFAULT_RENDER_SETTINGS`, on the same principle as the puzzle defaults
// above: the schema layer owns the authoritative bounds and the renderer
// just receives resolved values.
export const iconOrderTargetCountDefault = 3;
export const iconOrderDecoyCountDefault = 4;
export const iconOrderStrokeWidthDefault = 3;
export const iconOrderIconOpacityDefault = 0.92;
export const iconOrderHaloOpacityDefault = 0.55;
// Hit radius as a multiple of the clicked icon's own size, NOT in pixels
// like `puzzleTolerance`. The renderer jitters each icon's size, so a fixed
// pixel radius would make the small end of that range disproportionately
// harder to hit than the large end; scaling with the icon keeps every target
// on a frame equally forgiving. 0.75 means a click anywhere within three
// quarters of an icon's width of its centre counts.
export const iconOrderToleranceDefault = 0.75;

// Field-level schemas hoisted so `TrafficFilterSchema` per-category
// challenge policies validate captcha parameters with the same bounds as
// the site-wide defaults on `ClientSettingsSchema`. Do not redefine these
// bounds elsewhere — reuse the hoisted schemas.
export const powDifficultyFieldSchema = number().positive().min(1).max(10);
export const imageThresholdFieldSchema = number().min(0).max(1);

/**
 * The frictionless score ladder. Two rungs cutting the score line into three
 * bands: PoW at or below the puzzle rung, puzzle between the two, image at or
 * above the image rung.
 *
 * This replaces the bare `frictionlessThreshold: number`, which could only
 * express "pass or image". A number is still accepted on the way in and lifted
 * into the puzzle rung — see the preprocess below — because documents written
 * before the migration are still out there, and a settings blob that fails to
 * parse would take the whole site down rather than degrade.
 */
export const FrictionlessThresholdSchema = z.preprocess(
	(raw) =>
		typeof raw === "number" ? { frictionlessPuzzleThreshold: raw } : raw,
	object({
		frictionlessPuzzleThreshold: number()
			.min(0)
			.max(1)
			.optional()
			.default(frictionlessPuzzleThresholdDefault),
		// Not capped at 1, unlike the rung below it — see the default's note.
		frictionlessImageThreshold: number()
			.min(0)
			.optional()
			.default(frictionlessImageThresholdDefault),
	}).refine(
		(t) => t.frictionlessImageThreshold >= t.frictionlessPuzzleThreshold,
		{
			message:
				"frictionlessImageThreshold must be >= frictionlessPuzzleThreshold — the image band sits above the puzzle band",
			path: ["frictionlessImageThreshold"],
		},
	),
);

export type IFrictionlessThreshold = output<typeof FrictionlessThresholdSchema>;

/** The ladder every site gets when it has never configured one. */
export const frictionlessThresholdDefault: IFrictionlessThreshold = {
	frictionlessPuzzleThreshold: frictionlessPuzzleThresholdDefault,
	frictionlessImageThreshold: frictionlessImageThresholdDefault,
};

/**
 * Which challenge types the frictionless flow may serve on this site.
 *
 * PoW is deliberately absent and is always available: it is the terminal
 * fallback of the decision machine and the only type with no interaction
 * requirement, so a site with both of these off still has a way to challenge.
 *
 * This is a hard constraint on OUTPUT, not a hint. A site with `image: false`
 * must never be served an image captcha by any path — score ladder, access
 * policy, traffic filter, routing machine, detector rule or escalation. See
 * `coerceToEnabledCaptchaType` in the provider, which is applied at the two
 * points a session's captchaType is decided.
 *
 * Expressing "no image" here rather than as an unreachable
 * `frictionlessImageThreshold` keeps the intent explicit: the rung is a score
 * boundary, and a site that wants image off should not have to encode that as
 * a threshold nobody can reach.
 */
export const FrictionlessTypesSchema = object({
	image: boolean().optional().default(true),
	puzzle: boolean().optional().default(true),
	// Defaults on, like the other two: the flag only bites once something
	// explicitly selects icon-order (a site-wide `captchaType`, a Restrict
	// rule, a traffic-filter policy or a routing machine). Defaulting it off
	// would silently coerce away a type the operator had just asked for.
	iconOrder: boolean().optional().default(true),
});

export type IFrictionlessTypes = output<typeof FrictionlessTypesSchema>;

export const frictionlessTypesDefault: IFrictionlessTypes = {
	image: true,
	puzzle: true,
	iconOrder: true,
};

/**
 * Read a stored `frictionlessTypes` into a complete set.
 *
 * Tolerates `undefined` (a client record written before the field existed)
 * and a partial object, so a provider handed an older settings blob keeps
 * serving every type rather than silently narrowing to PoW.
 */
export const resolveFrictionlessTypes = (
	configured: Partial<IFrictionlessTypes> | undefined | null,
): IFrictionlessTypes => ({
	image: configured?.image ?? frictionlessTypesDefault.image,
	puzzle: configured?.puzzle ?? frictionlessTypesDefault.puzzle,
	iconOrder: configured?.iconOrder ?? frictionlessTypesDefault.iconOrder,
});

/**
 * Read a stored `frictionlessThreshold` into a complete ladder.
 *
 * The single place that knows how to interpret the pre-ladder shape. Records
 * are migrated in the background rather than in lockstep with the deploy, so
 * both the provider and the portal API can be handed a bare number; it means
 * what it always meant, the puzzle rung, and the image rung falls back to its
 * default. The image rung is never allowed below the puzzle rung, which would
 * otherwise invert the ladder and puzzle the worst traffic.
 */
export const resolveFrictionlessThreshold = (
	configured: IFrictionlessThreshold | number | null | undefined,
): IFrictionlessThreshold => {
	const raw: Partial<IFrictionlessThreshold> =
		typeof configured === "number"
			? { frictionlessPuzzleThreshold: configured }
			: (configured ?? {});
	const frictionlessPuzzleThreshold =
		raw.frictionlessPuzzleThreshold ?? frictionlessPuzzleThresholdDefault;
	return {
		frictionlessPuzzleThreshold,
		frictionlessImageThreshold: Math.max(
			frictionlessPuzzleThreshold,
			raw.frictionlessImageThreshold ?? frictionlessImageThresholdDefault,
		),
	};
};
export const imageMaxRoundsFieldSchema = number().int().min(2);
// Deliberately looser than the max at the bottom end: a site may want to
// serve a single round, but no site may cap itself below 2. `min <= max` is
// enforced across the pair on `ClientSettingsSchema`.
export const imageMinRoundsFieldSchema = number().int().min(1);
export const puzzleToleranceFieldSchema = number().int().min(5).max(1000);
export const puzzleDecoyCountFieldSchema = number().int().min(0).max(200);
export const puzzleDecoyEdgeDarknessFieldSchema = number().int().min(0).max(40);
export const puzzleDecoyBodyBrightnessFieldSchema = number()
	.int()
	.min(-20)
	.max(20);
export const puzzleHoleDarkenFieldSchema = number().min(0).max(1);
export const puzzleDecoyHoleDarkenFieldSchema = number().min(0).max(1);
// Bounds are wider than the defaults so operators can pin the piece to a
// fixed size (min == max) or explore the full frame. Cross-field
// `min <= max` is enforced on the containing object schema.
export const puzzlePieceScaleFieldSchema = number().min(0.05).max(0.95);
export const PuzzlePieceScaleSchema = object({
	min: puzzlePieceScaleFieldSchema
		.optional()
		.default(puzzlePieceScaleMinDefault),
	max: puzzlePieceScaleFieldSchema
		.optional()
		.default(puzzlePieceScaleMaxDefault),
}).refine((v) => v.min <= v.max, {
	message: "puzzle piece scale min must be <= max",
});

/**
 * Per-render tunables for the puzzle captcha. Every field is optional so
 * operators can override a subset from the portal without having to
 * restate the defaults. The provider merges these on top of the asset
 * package's `DEFAULT_RENDER_SETTINGS` before calling the renderer.
 */
export const PuzzleSettingsSchema = object({
	decoyCount: puzzleDecoyCountFieldSchema.optional(),
	decoyEdgeDarkness: puzzleDecoyEdgeDarknessFieldSchema.optional(),
	decoyBodyBrightness: puzzleDecoyBodyBrightnessFieldSchema.optional(),
	decoyHoleDarken: puzzleDecoyHoleDarkenFieldSchema.optional(),
	holeDarken: puzzleHoleDarkenFieldSchema.optional(),
	pieceScale: PuzzlePieceScaleSchema.optional(),
});

export type IPuzzleSettings = output<typeof PuzzleSettingsSchema>;

// Ten distinct glyphs exist, and every icon on a frame must be a distinct
// glyph so the legend is unambiguous — see `placeIcons`. That vocabulary
// size is therefore the hard ceiling on targets plus decoys, enforced across
// the pair by the refine on `IconOrderSettingsSchema`.
export const ICON_ORDER_GLYPH_VOCABULARY = 10;

export const iconOrderTargetCountFieldSchema = number().int().min(2).max(6);
export const iconOrderDecoyCountFieldSchema = number()
	.int()
	.min(0)
	.max(ICON_ORDER_GLYPH_VOCABULARY - 2);
export const iconOrderStrokeWidthFieldSchema = number().min(1).max(10);
export const iconOrderIconOpacityFieldSchema = number().min(0.1).max(1);
export const iconOrderHaloOpacityFieldSchema = number().min(0).max(1);
// Wider at the top than any real site needs, for the same reason as
// `puzzleToleranceFieldSchema`: end-to-end tests raise it until a scripted
// click anywhere near an icon passes.
export const iconOrderToleranceFieldSchema = number().min(0.1).max(20);

/**
 * Per-render tunables for the icon-order captcha. Every field is optional so
 * operators can override a subset from the portal without restating the
 * defaults; the provider merges these on top of the asset package's
 * `DEFAULT_RENDER_SETTINGS` before calling the renderer.
 *
 * The cross-field check rejects a targets+decoys total the glyph vocabulary
 * cannot supply. Without it the combination parses, and the renderer throws
 * per request at challenge time — a config error that only shows up as
 * production 500s.
 */
export const IconOrderSettingsSchema = object({
	targetCount: iconOrderTargetCountFieldSchema.optional(),
	decoyCount: iconOrderDecoyCountFieldSchema.optional(),
	strokeWidth: iconOrderStrokeWidthFieldSchema.optional(),
	iconOpacity: iconOrderIconOpacityFieldSchema.optional(),
	haloOpacity: iconOrderHaloOpacityFieldSchema.optional(),
}).refine(
	(v) =>
		(v.targetCount ?? iconOrderTargetCountDefault) +
			(v.decoyCount ?? iconOrderDecoyCountDefault) <=
		ICON_ORDER_GLYPH_VOCABULARY,
	{
		message: `icon-order targetCount + decoyCount must be <= ${ICON_ORDER_GLYPH_VOCABULARY}, the number of distinct glyphs available`,
	},
);

export type IIconOrderSettings = output<typeof IconOrderSettingsSchema>;

// IP Validation Rules
export enum IPValidationAction {
	Allow = "allow",
	Reject = "reject",
	Flag = "flag",
}

export type IPValidateCondition = {
	met: boolean;
	action: IPValidationAction;
	message: string;
};

export const IPValidationActionSchema = z.nativeEnum(IPValidationAction);

// IP Validation defaults
export const countryChangeActionDefault = IPValidationAction.Allow;
export const cityChangeActionDefault = IPValidationAction.Allow;
export const ispChangeActionDefault = IPValidationAction.Allow;
export const distanceThresholdKmDefault = 1000;
export const abuseScoreThresholdDefault = 0.005;
export const distanceExceedActionDefault = IPValidationAction.Reject;
export const abuseScoreThresholdExceedActionDefault = IPValidationAction.Reject;
export const requireAllConditionsDefault = false;

const IPValidationSchema = object({
	actions: object({
		countryChangeAction: IPValidationActionSchema.optional(),
		cityChangeAction: IPValidationActionSchema.optional(),
		ispChangeAction: IPValidationActionSchema.optional(),
		distanceExceedAction: IPValidationActionSchema.optional(),
		abuseScoreExceedAction: IPValidationActionSchema.optional(),
	}).partial(), // all optional, so you can just override what you need

	distanceThresholdKm: number().positive().optional(),
	abuseScoreThreshold: number().positive().optional(),
	requireAllConditions: boolean().optional(),
});

export const IPValidationRulesSchema = object({
	enabled: boolean().optional().default(false),
	actions: object({
		countryChangeAction: IPValidationActionSchema.optional().default(
			countryChangeActionDefault,
		),
		cityChangeAction: IPValidationActionSchema.optional().default(
			cityChangeActionDefault,
		),
		ispChangeAction: IPValidationActionSchema.optional().default(
			ispChangeActionDefault,
		),
		distanceExceedAction: IPValidationActionSchema.optional().default(
			distanceExceedActionDefault,
		),
		abuseScoreExceedAction: IPValidationActionSchema.optional().default(
			abuseScoreThresholdExceedActionDefault,
		),
	}),
	distanceThresholdKm: number()
		.positive()
		.optional()
		.default(distanceThresholdKmDefault),
	abuseScoreThreshold: number()
		.positive()
		.optional()
		.default(abuseScoreThresholdDefault),
	requireAllConditions: z
		.boolean()
		.optional()
		.default(requireAllConditionsDefault),
	// overrides are now lightweight, not recursive
	countryOverrides: z.record(string(), IPValidationSchema).optional(),
	forceConsistentIp: boolean().optional().default(false),
});

/**
 * The device families a context-aware baseline is held per.
 *
 * Coarse on purpose. A site's `<head>` differs most between a phone-width
 * responsive render, a tablet render and a desktop render; finer splits
 * (vendor, OS version) fracture the sample without changing the DOM.
 */
export enum DeviceType {
	Desktop = "desktop",
	Mobile = "mobile",
	Tablet = "tablet",
}

/**
 * Context type — the bucket a session's head hash is averaged into, and the
 * key a context-aware entropy record is stored under.
 *
 * The device family crossed with whether the page is running inside a
 * webview. Both dimensions move the DOM independently: a phone renders
 * different markup from a desktop, and an in-app webview injects and
 * suppresses different things again from the same device's real browser.
 *
 * `Default` and `Webview` are the pre-device-type keys. They are retained so
 * settings already stored against them keep parsing, and are expanded into
 * their device families by `expandContexts` — nothing downstream of settings
 * parsing should branch on them. See `isLegacyContextType`.
 */
export enum ContextType {
	/** @deprecated Legacy pre-device-type key: every non-webview device. */
	Default = "default",
	/** @deprecated Legacy pre-device-type key: every webview device. */
	Webview = "webview",
	Desktop = "desktop",
	DesktopWebview = "desktop-webview",
	Mobile = "mobile",
	MobileWebview = "mobile-webview",
	Tablet = "tablet",
	TabletWebview = "tablet-webview",
}

// Zod schema for context type
export const ContextTypeSchema = z.nativeEnum(ContextType);

/** The two keys that predate device-type contexts. */
export const legacyContextTypes = [
	ContextType.Default,
	ContextType.Webview,
] as const;

export type LegacyContextType = (typeof legacyContextTypes)[number];

export const isLegacyContextType = (
	contextType: ContextType,
): contextType is LegacyContextType =>
	contextType === ContextType.Default || contextType === ContextType.Webview;

/** Every device-type context, in a stable order. */
export const deviceContextTypes = [
	ContextType.Desktop,
	ContextType.DesktopWebview,
	ContextType.Mobile,
	ContextType.MobileWebview,
	ContextType.Tablet,
	ContextType.TabletWebview,
] as const;

const contextTypeByDevice: Record<
	DeviceType,
	{ browser: ContextType; webview: ContextType }
> = {
	[DeviceType.Desktop]: {
		browser: ContextType.Desktop,
		webview: ContextType.DesktopWebview,
	},
	[DeviceType.Mobile]: {
		browser: ContextType.Mobile,
		webview: ContextType.MobileWebview,
	},
	[DeviceType.Tablet]: {
		browser: ContextType.Tablet,
		webview: ContextType.TabletWebview,
	},
};

/** The context a (device family, webview) pair belongs to. */
export const contextTypeFor = (
	deviceType: DeviceType,
	webView: boolean,
): ContextType =>
	webView
		? contextTypeByDevice[deviceType].webview
		: contextTypeByDevice[deviceType].browser;

// Tablets are tested before phones because both tablet shapes collide with
// the phone patterns: an iPad's UA carries a `Mobile/<build>` token, and an
// Android tablet is exactly "Android without Mobile", which the bare
// "Android" phone signal would otherwise claim.
//
// Known gap: an iPadOS 13+ Safari in its default desktop mode identifies as a
// Mac, with no iPad token at all, and lands in Desktop. Nothing in a UA
// distinguishes it from a real Mac, so it is left there deliberately — both
// the decision machine and the sweep make the same call, which is what
// matters for the lookup to line up.
const TABLET_PATTERN =
	/\b(iPad|Tablet|PlayBook|Silk)\b|Android(?!.*\bMobile\b)/i;
const MOBILE_PATTERN =
	/\b(Mobi|Mobile|iPhone|iPod|Windows Phone|IEMobile|BlackBerry|BB10|Opera Mini)\b/i;

/**
 * Classify a raw user-agent string into a device family.
 *
 * Deliberately hand-rolled rather than delegating to ua-parser-js: this
 * module is imported by the browser widget bundles, and the entropy sweep on
 * the server has to bucket sessions *identically* or it writes baselines the
 * decision machine will never look up. One shared function with no runtime
 * dependency is what keeps the two sides in lockstep.
 *
 * An absent or unrecognised UA is Desktop — the largest population, and the
 * conservative landing spot for a bucket we can't identify.
 *
 * Note this reads a claimed UA. A spoofed one buckets the session by the
 * claim, which is fine here: the head hash is compared against the baseline
 * for whatever the client says it is, so a desktop harness claiming to be a
 * phone is measured against real phones and stands out rather than blending
 * into desktop traffic.
 */
export const deviceTypeFromUserAgent = (userAgent?: string): DeviceType => {
	if (!userAgent) return DeviceType.Desktop;
	if (TABLET_PATTERN.test(userAgent)) return DeviceType.Tablet;
	if (MOBILE_PATTERN.test(userAgent)) return DeviceType.Mobile;
	return DeviceType.Desktop;
};

/** The context a session belongs to, from its UA and webview flag. */
export const contextTypeFromSession = (
	userAgent: string | undefined,
	webView: boolean,
): ContextType => contextTypeFor(deviceTypeFromUserAgent(userAgent), webView);

// Individual context configuration
export const ContextConfigSchema = z.object({
	type: ContextTypeSchema,
	threshold: number()
		.min(Number((contextAwareThresholdDefault - 0.2).toFixed(2)))
		.max(Number((contextAwareThresholdDefault + 0.2).toFixed(2)))
		.optional()
		.default(contextAwareThresholdDefault),
});

export type IContextConfig = z.infer<typeof ContextConfigSchema>;

const ContextsSchema = z.record(ContextTypeSchema, ContextConfigSchema);

export type IContexts = z.infer<typeof ContextsSchema>;

/**
 * Resolve a stored `contexts` map to device-type contexts only.
 *
 * A legacy `default` entry configures every non-webview device family and a
 * legacy `webview` entry configures every webview family, both at the
 * threshold they were saved with. An explicit device-type entry always wins
 * over the legacy entry that would otherwise cover it, so a customer can
 * tighten one family without restating the rest.
 *
 * Everything downstream — the decision machine's lookup, the entropy sweep,
 * the portal — deals only in the six device contexts this returns.
 */
export const expandContexts = (
	contexts: IContexts | undefined,
): Partial<Record<ContextType, IContextConfig>> => {
	const expanded: Partial<Record<ContextType, IContextConfig>> = {};
	if (!contexts) return expanded;

	const legacy = contexts as Partial<Record<ContextType, IContextConfig>>;

	for (const deviceType of Object.values(DeviceType)) {
		for (const webView of [false, true]) {
			const contextType = contextTypeFor(deviceType, webView);
			const legacyConfig =
				legacy[webView ? ContextType.Webview : ContextType.Default];
			const config = legacy[contextType] ?? legacyConfig;
			if (config) {
				expanded[contextType] = {
					type: contextType,
					threshold: config.threshold,
				};
			}
		}
	}

	return expanded;
};

const ContextAwareSchema = object({
	enabled: boolean().optional().default(false),
	contexts: ContextsSchema,
});

export type IContextAware = z.infer<typeof ContextAwareSchema>;

// Spam filter rules
export const maxLocalPartDotsDefault = 2;

const MAX_REGEX_PATTERN_LENGTH = 256;
const MAX_CUSTOM_REGEX_PATTERNS = 50;

// Patterns that enable catastrophic backtracking or uncontrolled execution
const DANGEROUS_REGEX_TOKENS = /(\(\?[<!=])|(\(\?P[<])|(\(\?\{)|(\{[\d,]{4,})/;

const safeRegexPattern = string()
	.max(MAX_REGEX_PATTERN_LENGTH)
	.refine(
		(raw) => {
			try {
				new RegExp(raw, "i");
				return true;
			} catch {
				return false;
			}
		},
		{ message: "Invalid regular expression syntax" },
	)
	.refine((raw) => !DANGEROUS_REGEX_TOKENS.test(raw), {
		message:
			"Pattern uses disallowed features (lookahead, lookbehind, or large quantifiers)",
	});

export const EmailSpamRulesSchema = object({
	enabled: boolean().optional().default(false),
	maxLocalPartDots: number().int().min(0).optional(),
	normaliseGmail: boolean().optional().default(false),
	useDefaultPatterns: boolean().optional().default(false),
	customRegexBlocklist: array(safeRegexPattern)
		.max(MAX_CUSTOM_REGEX_PATTERNS)
		.optional()
		.default([]),
	// Maximum number of previously server-checked captchas that may carry the
	// same normalised email (dots collapsed for gmail, `+tag` stripped
	// everywhere) before further submissions from that address are rejected.
	// Requires `storeMetadata` to be on so the normalised email is persisted
	// alongside each verified commitment. Undefined disables the check.
	maxEmailSubmissionCount: number().int().min(1).optional(),
});

export const SpamFilterRulesSchema = object({
	enabled: boolean().optional().default(false),
	emailRules: EmailSpamRulesSchema.optional(),
});

export const trafficFilterAbuserScoreThresholdDefault = 0.5;

// Operators almost always want the datacenter category to catch
// scraping/automation traffic but not legitimate consumer relays that exit
// from datacenter IPs. Entries match case-insensitively against
// `datacenterName`, `providerName`, or `asnOrganization` — upstream
// populates `datacenter.datacenter` only for curated named ranges, so the
// providerName / asnOrganization fallback is needed to reach generic CDN
// and cloud-provider IPs.
const MAX_DATACENTER_ALLOWLIST_ENTRIES = 50;
const MAX_DATACENTER_ALLOWLIST_ENTRY_LENGTH = 128;

export enum TrafficFilterAction {
	Block = "block",
	Challenge = "challenge",
}

export const TrafficFilterActionSchema = z.nativeEnum(TrafficFilterAction);

// Per-category policy. When `action === "challenge"`, the optional captcha
// fields override the site-wide `ClientSettingsSchema` defaults for that
// request (same override semantics as `AccessPolicy`). Field validators
// are reused verbatim from the site-wide settings so bounds stay in sync.
export const TrafficCategoryPolicySchema = object({
	action: TrafficFilterActionSchema,
	captchaType: CaptchaTypeSpec.optional(),
	powDifficulty: powDifficultyFieldSchema.optional(),
	solvedImagesCount: imageMaxRoundsFieldSchema.optional(),
	puzzleTolerance: puzzleToleranceFieldSchema.optional(),
	// Per-category overrides for puzzle rendering. Individual fields on
	// the nested object are themselves optional, so a category can
	// override, say, just `decoyCount` without restating the rest.
	puzzle: PuzzleSettingsSchema.optional(),
	iconOrderTolerance: iconOrderToleranceFieldSchema.optional(),
	// Per-category overrides for icon-order rendering, same semantics as
	// `puzzle` above.
	iconOrder: IconOrderSettingsSchema.optional(),
});

export type ITrafficCategoryPolicy = output<typeof TrafficCategoryPolicySchema>;

export const TrafficFilterSchema = object({
	vpn: TrafficCategoryPolicySchema.optional(),
	proxy: TrafficCategoryPolicySchema.optional(),
	tor: TrafficCategoryPolicySchema.optional(),
	abuser: TrafficCategoryPolicySchema.optional(),
	abuserScoreThreshold: number()
		.min(0)
		.max(1)
		.optional()
		.default(trafficFilterAbuserScoreThresholdDefault),
	datacenter: TrafficCategoryPolicySchema.optional(),
	datacenterNameAllowlist: array(
		string().min(1).max(MAX_DATACENTER_ALLOWLIST_ENTRY_LENGTH),
	)
		.max(MAX_DATACENTER_ALLOWLIST_ENTRIES)
		.optional(),
	// Counterpart to `datacenterNameAllowlist`: any entry here forces the
	// datacenter rule for a matching name, overriding both the
	// `providerType === "isp"` bypass and any allowlist entry for the same
	// name. Useful for named providers that upstream classifies as ISP but
	// operators want treated as datacenter (for example IP-leasing platforms
	// whose ranges sit on carrier ASNs but exit as proxy pools). Same
	// case-insensitive, whitespace-trimmed matching as the allowlist and the
	// same three name sources (`datacenterName`, `providerName`,
	// `asnOrganization`).
	datacenterNameDenylist: array(
		string().min(1).max(MAX_DATACENTER_ALLOWLIST_ENTRY_LENGTH),
	)
		.max(MAX_DATACENTER_ALLOWLIST_ENTRIES)
		.optional(),
	// When the catcher confirmed `dnsEvent.pathValid === true`, skip the
	// datacenter / VPN / proxy / Tor evaluation on the DNS peer + resolver
	// IPs. Default on: without this, users on public DoH resolvers or ISP
	// shared anycast resolvers (whose resolver IPs are necessarily
	// datacenter or high-abuser) trip the rule despite the visitor being
	// a real user on a real network.
	skipExtrasOnValidDnsPath: boolean().optional().default(true),
	mobile: TrafficCategoryPolicySchema.optional(),
	satellite: TrafficCategoryPolicySchema.optional(),
	crawler: TrafficCategoryPolicySchema.optional(),
});

export type IEmailSpamRules = output<typeof EmailSpamRulesSchema>;
export type ISpamFilterRules = output<typeof SpamFilterRulesSchema>;
export type ITrafficFilter = output<typeof TrafficFilterSchema>;

// Encoding used when serialising the honeypot question into the rendered
// hidden input. Humans don't see the field; bots that auto-fill text inputs
// receive an encoded string they can't trivially decode.
export enum EncodingType {
	morse = "morse",
	semaphore = "semaphore",
}

export const EncodingTypeSchema = z.nativeEnum(EncodingType);

export const honeypotEncodingTypeDefault = EncodingType.morse;

export const HoneypotSettingsSchema = object({
	enabled: boolean().optional().default(false),
	question: string().optional(),
	encodingType: EncodingTypeSchema.optional().default(
		honeypotEncodingTypeDefault,
	),
});

export type IHoneypotSettings = output<typeof HoneypotSettingsSchema>;

export const ClientSettingsSchema = object({
	captchaType: CaptchaTypeSpec.optional().default(captchaTypeDefault),
	domains: array(string()).min(1),
	// Maximum ms between user submission and the dapp's /verify call.
	verifiedTimeout: number()
		.int()
		.min(1000)
		.max(600000)
		.optional()
		.default(DEFAULT_POW_CAPTCHA_VERIFIED_TIMEOUT),
	// Maximum ms between challenge issuance and the user's submission to
	// /pow/solution or /puzzle/solution. Bounds how long the user has to
	// solve the challenge before the submission is rejected as stale.
	// Distinct from `verifiedTimeout` (which gates submission → /verify).
	solutionTimeout: number()
		.int()
		.min(1000)
		.max(600000)
		.optional()
		.default(DEFAULT_POW_CAPTCHA_SOLUTION_TIMEOUT),
	// The score ladder. Was a bare number meaning "above this, image captcha";
	// now an object carrying both rungs so the flow can put the middle band on
	// a puzzle. A legacy number is lifted into the puzzle rung on parse.
	frictionlessThreshold: FrictionlessThresholdSchema.optional().default(
		frictionlessThresholdDefault,
	),
	// Which challenge types the ladder may actually serve. Independent of the
	// rungs above: the rungs say where the score boundaries sit, this says
	// which outcomes are permitted at all.
	frictionlessTypes: FrictionlessTypesSchema.optional().default(
		frictionlessTypesDefault,
	),
	powDifficulty: powDifficultyFieldSchema
		.optional()
		.default(powDifficultyDefault),
	imageThreshold: imageThresholdFieldSchema
		.optional()
		.default(imageThresholdDefault),
	imageMaxRounds: imageMaxRoundsFieldSchema
		.optional()
		.default(imageMaxRoundsDefault),
	// Floor on the same count. Every round-count source in the provider —
	// access-policy rules, traffic-filter categories, routing machines, the
	// staleness curve — is clamped into [imageMinRounds, imageMaxRounds], so
	// this pair is how a site overrides its rules rather than the other way
	// round. See `clampImageRounds`.
	imageMinRounds: imageMinRoundsFieldSchema
		.optional()
		.default(imageMinRoundsDefault),
	// Detector score at or above which the frictionless flow blocks the
	// request outright instead of issuing a challenge. Undefined disables.
	autoBanScoreThreshold: number().min(0).optional(),
	// Tolerance in pixels between the release point and the puzzle target
	// centre (Euclidean distance). Default 15 matches what real solvers
	// actually hit. The ceiling is deliberately larger than the puzzle
	// canvas diagonal (~360 px on a 300×200 canvas) so end-to-end tests
	// can raise it high enough that a scripted release anywhere on the
	// canvas passes. Real sites should never need more than a few tens.
	puzzleTolerance: puzzleToleranceFieldSchema
		.optional()
		.default(puzzleToleranceDefault),
	// Site-wide puzzle render settings. Fields not set here fall back to
	// the asset package's defaults. Traffic-filter category policies may
	// further override any of these on a per-request basis.
	puzzle: PuzzleSettingsSchema.optional(),
	// Hit radius for an icon-order click, as a multiple of the clicked
	// icon's own size. See `iconOrderToleranceDefault` for why this is
	// relative where `puzzleTolerance` is absolute.
	iconOrderTolerance: iconOrderToleranceFieldSchema
		.optional()
		.default(iconOrderToleranceDefault),
	// Site-wide icon-order render settings. Fields not set here fall back
	// to the asset package's defaults; traffic-filter category policies may
	// further override any of them per request.
	iconOrder: IconOrderSettingsSchema.optional(),
	ipValidationRules: IPValidationRulesSchema.optional(),
	// The trailing `.optional()` that used to sit after `.default(false)` made
	// the default unreachable, so this parsed to `undefined` rather than
	// `false`. Both are falsy, so no consumer changed behaviour, but the
	// declared output type said `boolean` while the value was missing.
	disallowWebView: boolean().optional().default(false),
	contextAware: ContextAwareSchema.optional(),
	spamEmailDomainCheckEnabled: boolean().optional(),
	spamFilter: SpamFilterRulesSchema.optional(),
	trafficFilter: TrafficFilterSchema.optional(),
	// When true, the provider persists the metadata (`email`, ...) that
	// dapp servers attach to `/verify` requests on the captcha record.
	// Off by default — opt in to enable downstream analysis (e.g. judging
	// whether the submitted emails are mostly spam).
	storeMetadata: boolean().optional(),
	honeypot: HoneypotSettingsSchema.optional(),
}).refine((v) => v.imageMinRounds <= v.imageMaxRounds, {
	message: "imageMinRounds must be <= imageMaxRounds",
	path: ["imageMinRounds"],
});

export type IUserSettings = output<typeof ClientSettingsSchema>;

/**
 * The subset of a client record's settings that bounds how many image rounds
 * a challenge may carry. Accepts a whole `IUserSettings` — every call site
 * has one — but is stated narrowly so tests and rule code can pass a literal.
 */
export interface ImageRoundsBounds {
	imageMinRounds?: number;
	imageMaxRounds?: number;
}

export interface ResolvedImageRounds {
	min: number;
	max: number;
}

/**
 * Resolve a client record's image-round bounds, filling in defaults for
 * records written before either field existed.
 *
 * The `min <= max` invariant is enforced by `ClientSettingsSchema`, but only
 * on write: a record stored before `imageMinRounds` existed can end up with a
 * min above its max the moment an operator lowers the max. The cap wins in
 * that case — a site that asked for at most N rounds never gets more.
 */
export const resolveImageRoundsBounds = (
	bounds: ImageRoundsBounds,
): ResolvedImageRounds => {
	const max = bounds.imageMaxRounds ?? imageMaxRoundsDefault;
	return {
		min: Math.min(bounds.imageMinRounds ?? imageMinRoundsDefault, max),
		max,
	};
};

/**
 * Clamp a requested image-round count into the site's configured bounds.
 *
 * This is the single place the site settings win over every other source of a
 * round count — access-policy rules, traffic-filter categories, routing
 * machines, and the provider's own heuristics all pass through it.
 */
export const clampImageRounds = (
	requested: number,
	bounds: ImageRoundsBounds,
): number => {
	const { min, max } = resolveImageRoundsBounds(bounds);
	// A non-finite request is a bug upstream, not a signal about the user.
	// Fall back to the floor rather than propagating NaN into the session
	// record or handing a real user the maximum.
	if (!Number.isFinite(requested)) return min;
	return Math.min(Math.max(Math.round(requested), min), max);
};
export type IIPValidationRules = output<typeof IPValidationRulesSchema>;
export type IIPValidation = output<typeof IPValidationSchema>;
