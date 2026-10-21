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

// Generated from the Rust in packages/types/rust by `PROSOPO_WRITE_TS=1 cargo test -p prosopo-types
// generated_typescript_is_current`. Do not edit: change the Rust and generate it again.

export enum ApiParams {
	datasetId = "datasetId",
	user = "user",
	dapp = "dapp",
	provider = "provider",
	blockNumber = "blockNumber",
	requestHash = "requestHash",
	captchas = "captchas",
	commitmentId = "commitmentId",
	proof = "proof",
	dappSignature = "dappSignature",
	dappUserSignature = "dappUserSignature",
	providerUrl = "providerUrl",
	procaptchaResponse = "procaptcha-response",
	verifiedTimeout = "verifiedTimeout",
	maxVerifiedTime = "maxVerifiedTime",
	verified = "verified",
	status = "status",
	challenge = "challenge",
	difficulty = "difficulty",
	nonce = "nonce",
	timeouts = "timeouts",
	token = "token",
	secret = "secret",
	timestamp = "timestamp",
	signature = "signature",
	language = "language",
	error = "error",
	siteKey = "siteKey",
	siteKeys = "siteKeys",
	captchaType = "captchaType",
	sessionId = "sessionId",
	settings = "settings",
	domains = "domains",
	frictionlessThreshold = "frictionlessThreshold",
	powDifficulty = "powDifficulty",
	score = "score",
	tier = "tier",
	detectorKey = "detectorKey",
	detectorSessionId = "detectorSessionId",
	bundleId = "bundleId",
	detectorScript = "detectorScript",
	useProviderBundle = "useProviderBundle",
	clientUrl = "clientUrl",
	assetOrigin = "assetOrigin",
	ip = "ip",
	expirationInSeconds = "expirationInSeconds",
	enabled = "enabled",
	headHash = "headHash",
	behavioralData = "behavioralData",
	simdReadings = "simdReadings",
	currentUrl = "currentUrl",
	iframeUrl = "iframeUrl",
	decisionMachineScope = "decisionMachineScope",
	decisionMachineRuntime = "decisionMachineRuntime",
	decisionMachineSource = "decisionMachineSource",
	decisionMachineLanguage = "decisionMachineLanguage",
	decisionMachineName = "decisionMachineName",
	decisionMachineVersion = "decisionMachineVersion",
	decisionMachineCaptchaType = "decisionMachineCaptchaType",
	decisionMachineKind = "decisionMachineKind",
	salt = "salt",
	email = "email",
	targetX = "targetX",
	targetY = "targetY",
	originX = "originX",
	originY = "originY",
	finalX = "finalX",
	finalY = "finalY",
	puzzleEvents = "puzzleEvents",
	tolerance = "tolerance",
	background = "background",
	piece = "piece",
	pieceSize = "pieceSize",
	legend = "legend",
	legendIconSize = "legendIconSize",
	clicks = "clicks",
	iconOrderEvents = "iconOrderEvents",
	mode = "mode",
	reason = "reason",
	escalation = "escalation",
	hp = "hp",
	clientMetaData = "clientMetaData",
	/**
	 * Site-owner-supplied session identifier (Protect's JTI, or any per-user
	 * session id the site already holds). Handed to the widget at render time
	 * and handed back on verify so the provider can confirm the session that
	 * solved the captcha is the session being verified. Deliberately distinct
	 * from `sessionId`, which is the provider's own frictionless session.
	 */
	clientSessionId = "clientSessionId",
	refreshOf = "refreshOf",
	switchToImage = "switchToImage",
	imageSwitchAvailable = "imageSwitchAvailable",
	honeypot = "honeypot",
	fingerprintProof = "fingerprintProof",
	clip = "clip",
	answer = "answer",
	audioEvents = "audioEvents",
	replays = "replays",
	characterCount = "characterCount",
}

export enum CaptchaType {
	image = "image",
	pow = "pow",
	frictionless = "frictionless",
	puzzle = "puzzle",
	audio = "audio",
	iconOrder = "iconOrder",
	/**
	 * Web Bot Auth verified — no user-facing challenge. Issued only by the
	 * frictionless flow when the request carried a valid Ed25519 signature
	 * per RFC 9421 / draft-meunier-web-bot-auth AND no operator-authored
	 * Block/Restrict rule matched the verified Signature-Agent URL. The
	 * widget renders a "Verified agent" badge and auto-submits the token.
	 * The captcha record carries `webBotAuthAgent` + `clientIp` so the
	 * verify path can enforce IP binding.
	 */
	authenticated = "authenticated",
}

/**
 * Context type — the bucket a session's head hash is averaged into, and the
 * key a context-aware entropy record is stored under.
 *
 * The device family crossed with whether the page is running inside a
 * webview. Both dimensions move the DOM independently: a phone renders
 * different markup from a desktop, and an in-app webview injects and
 * suppresses different things again from the same device's real browser.
 */
export enum ContextType {
	Desktop = "desktop",
	DesktopWebview = "desktop-webview",
	Mobile = "mobile",
	MobileWebview = "mobile-webview",
	Tablet = "tablet",
	TabletWebview = "tablet-webview",
}

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
 * Encoding used when serialising the honeypot question into the rendered
 * hidden input. Humans don't see the field; bots that auto-fill text inputs
 * receive an encoded string they can't trivially decode.
 */
export enum EncodingType {
	morse = "morse",
	semaphore = "semaphore",
}

export enum IPValidationAction {
	Allow = "allow",
	Reject = "reject",
	Flag = "flag",
}

export enum TrafficFilterAction {
	Block = "block",
	Challenge = "challenge",
}

export enum TestSiteKeyMode {
	Pass = "pass",
	Fail = "fail",
}

/** `Tier`, stored on the account. */
export enum Tier {
	Free = "free",
	Professional = "professional",
	Enterprise = "enterprise",
}

export enum ModeEnum {
	visible = "visible",
	invisible = "invisible",
}

export enum CaptchaTypes {
	SelectAll = "SelectAll",
}

export enum CaptchaItemTypes {
	Text = "text",
	Image = "image",
}

export enum CaptchaStates {
	Solved = "solved",
	Unsolved = "unsolved",
}

/**
 * How a selection was made: a tile, or the checkbox tick that opened the
 * challenge. Keyboard activation has no pointer position, so its coordinates
 * are always (0, 0) and say nothing about who made the selection.
 */
export enum InputMethod {
	pointer = "pointer",
	keyboard = "keyboard",
}

export enum CaptchaStatus {
	pending = "Pending",
	approved = "Approved",
	disapproved = "Disapproved",
}

export enum StoredStatusNames {
	notStored = "notStored",
	userSubmitted = "userSubmitted",
	serverChecked = "serverChecked",
	stored = "stored",
}

export enum GovernanceStatus {
	active = "Active",
	inactive = "Inactive",
}

export enum DappPayee {
	provider = "Provider",
	dapp = "Dapp",
	any = "Any",
}

export enum DecisionMachineRuntime {
	Node = "node",
}

export enum DecisionMachineKind {
	Routing = "routing",
	Decision = "decision",
}

/**
 * Decision machine scope defines the specificity level of an artifact.
 * Only ONE artifact is selected per request based on scope priority.
 *
 * Current scopes (priority order):
 * - Dapp: Custom decision machine for a specific dapp (highest priority)
 * - Global: Default decision machine applied to all dapps (fallback)
 *
 * Future extensibility: Additional scopes can be added for device type
 * (mobile/desktop/app), geographic region, user tier, etc. New scopes
 * would be evaluated in priority order to maintain single-artifact execution.
 */
export enum DecisionMachineScope {
	Global = "global",
	Dapp = "dapp",
}

export enum DecisionMachineLanguage {
	JavaScript = "js",
	TypeScript = "ts",
}

export enum DecisionMachineDecision {
	Allow = "allow",
	Deny = "deny",
}

export enum ClientApiPaths {
	GetImageCaptchaChallenge = "/v1/prosopo/provider/client/captcha/image",
	GetPowCaptchaChallenge = "/v1/prosopo/provider/client/captcha/pow",
	GetFrictionlessCaptchaChallenge = "/v1/prosopo/provider/client/captcha/frictionless",
	SubmitImageCaptchaSolution = "/v1/prosopo/provider/client/solution",
	SubmitPowCaptchaSolution = "/v1/prosopo/provider/client/pow/solution",
	VerifyPowCaptchaSolution = "/v1/prosopo/provider/client/pow/verify",
	VerifyImageCaptchaSolutionDapp = "/v1/prosopo/provider/client/image/dapp/verify",
	GetPuzzleCaptchaChallenge = "/v1/prosopo/provider/client/captcha/puzzle",
	SubmitPuzzleCaptchaSolution = "/v1/prosopo/provider/client/puzzle/solution",
	VerifyPuzzleCaptchaSolution = "/v1/prosopo/provider/client/puzzle/verify",
	GetAudioCaptchaChallenge = "/v1/prosopo/provider/client/captcha/audio",
	SubmitAudioCaptchaSolution = "/v1/prosopo/provider/client/audio/solution",
	VerifyAudioCaptchaSolution = "/v1/prosopo/provider/client/audio/verify",
	GetIconOrderCaptchaChallenge = "/v1/prosopo/provider/client/captcha/icon-order",
	SubmitIconOrderCaptchaSolution = "/v1/prosopo/provider/client/icon-order/solution",
	VerifyIconOrderCaptchaSolution = "/v1/prosopo/provider/client/icon-order/verify",
	/**
	 * Verify path for Web Bot Auth authenticated sessions. Only accepts tokens
	 * minted with captchaType=authenticated. Requires the operator to forward
	 * the client IP so the session's `ipAddress` binding can be enforced;
	 * a leaked authenticated token cannot be replayed from a different IP.
	 */
	VerifyAuthenticatedSession = "/v1/prosopo/provider/client/authenticated/verify",
	GetProviderStatus = "/v1/prosopo/provider/client/status",
	SubmitUserEvents = "/v1/prosopo/provider/client/events",
	CheckSpamEmail = "/v1/prosopo/provider/client/spam/email",
	/**
	 * Assigns a precomputed detector bundle for this session and returns its
	 * obfuscated script inline (or signals the bundled fallback when no pool).
	 */
	AssignDetectorBundle = "/v1/prosopo/provider/client/detector/assign",
}

export enum PublicApiPaths {
	Healthz = "/healthz",
	GetProviderDetails = "/v1/prosopo/provider/public/details",
	Metrics = "/metrics",
}

export enum AdminApiPaths {
	SiteKeyRegister = "/v1/prosopo/provider/admin/sitekey/register",
	SiteKeysRegister = "/v1/prosopo/provider/admin/sitekeys/register",
	ToggleMaintenanceMode = "/v1/prosopo/provider/admin/maintenance/toggle",
	UpdateDecisionMachine = "/v1/prosopo/provider/admin/decision-machine/update",
	GetAllDecisionMachines = "/v1/prosopo/provider/admin/decision-machine/get-all",
	GetDecisionMachine = "/v1/prosopo/provider/admin/decision-machine/get",
	RemoveDecisionMachine = "/v1/prosopo/provider/admin/decision-machine/remove",
	RemoveAllDecisionMachines = "/v1/prosopo/provider/admin/decision-machine/remove-all",
	ClearAllCounters = "/v1/prosopo/provider/admin/counters/clear-all",
	SiteKeyRemove = "/v1/prosopo/provider/admin/sitekey/remove",
	SiteKeysRemove = "/v1/prosopo/provider/admin/sitekeys/remove",
	/** Receives batched DNS observation events from the dns sidecar. */
	DnsEvent = "/v1/prosopo/provider/admin/dns/event",
	/**
	 * Hot-swaps the in-memory detector bundle pool (emergency push channel,
	 * avoids a redeploy to rotate the pool).
	 */
	ReplaceDetectorPool = "/v1/prosopo/provider/admin/detector/pool/replace",
	/**
	 * Read a single session's current state from both Redis and Mongo.
	 * Test / diagnostic surface only — used by the cypress consistency
	 * suite to assert Redis and Mongo agree on captchaType at each stage
	 * of a captcha flow. Not called from any client code path.
	 */
	GetSession = "/v1/prosopo/provider/admin/session/get",
}

export enum BlockRuleType {
	ipAddress = "ipAddress",
	userAccount = "userAccount",
}

export enum IpAddressType {
	v4 = "v4",
	v6 = "v6",
}

/**
 * Internal classification labels applied by superadmins from the audit page to
 * build supervised ML training sets. Stored directly on the captcha record
 * (see {@link StoredCaptcha.label}); not part of the captcha verification flow.
 */
export enum CaptchaLabel {
	human = "human",
	bot = "bot",
	suspicious = "suspicious",
	unknown = "unknown",
}

/**
 * Stage at which the catcher's SIMD readings first reached the provider.
 * Tracked once on the Session record (first hop wins) so analytics can see
 * when in the user's journey the CPU fingerprint became available.
 */
export enum SimdReadingsStage {
	frictionless = "frictionless",
	challenge = "challenge",
	submit = "submit",
}

/**
 * Reason persisted at `session.reason` to record why a particular captcha
 * type was chosen for a user (the "selection reason"). Emitted by the
 * frictionless flow in @prosopo/provider; centralised here so the portal,
 * audit tooling, and tests can reference the same values without depending
 * on the server-side provider package.
 */
export enum FrictionlessReason {
	USER_ACCESS_POLICY = "USER_ACCESS_POLICY",
	ACCESS_POLICY_BLOCK = "ACCESS_POLICY_BLOCK",
	USER_AGENT_MISMATCH = "USER_AGENT_MISMATCH",
	OLD_TIMESTAMP = "OLD_TIMESTAMP",
	BOT_SCORE_ABOVE_THRESHOLD = "BOT_SCORE_ABOVE_THRESHOLD",
	/**
	 * Score landed in the middle band of the frictionless ladder: past the
	 * point where a silent PoW pass is warranted, but short of the image
	 * rung, so the user gets a puzzle instead.
	 */
	BOT_SCORE_PUZZLE_BAND = "BOT_SCORE_PUZZLE_BAND",
	WEBVIEW_DETECTED = "WEBVIEW_DETECTED",
	AUTO_BAN_SCORE = "AUTO_BAN_SCORE",
	FINGERPRINT_PROOF_INVALID = "FINGERPRINT_PROOF_INVALID",
	MISSING_CURRENT_URL = "MISSING_CURRENT_URL",
	/**
	 * A verified PoW solve arrived without click coordinates encoded in its
	 * salt. Every current widget embeds the checkbox click position, so absent
	 * coords mean the solve didn't come through the official widget path; such
	 * solves are escalated to an image captcha rather than approved outright
	 * (see verifyPowCaptchaSolution in @prosopo/provider).
	 */
	MISSING_COORDINATES = "MISSING_COORDINATES",
	/**
	 * The address that asked for a PoW challenge is not the address that
	 * solved it. A challenge is short-lived and bound to one session, so the
	 * honest explanations are narrow — a mobile handoff mid-solve — while
	 * handing the challenge to a second host is the cheap way to farm the work
	 * out. Escalated to an image captcha rather than denied: a real network
	 * change should cost a picture, not a rejection. Judged on the network part
	 * only — the v6 /64 and the v4 /24 — since the host bits are reassigned by
	 * design on both (see isSameIpOrigin).
	 */
	IP_CHANGED = "IP_CHANGED",
	/**
	 * The detector payload could not be decrypted: no bundle resolved for the
	 * session (expired/missing Redis binding, bundle no longer in the pool), or
	 * the ciphertext did not open with the bundle's keys. Distinct from a high
	 * bot score — we learned nothing about this client, rather than learning
	 * something bad — so it gets its own short image challenge instead of
	 * falling through to the old-timestamp path, which used to catch it by
	 * accident via the synthetic `timestamp = 0`.
	 */
	DECRYPTION_FAILED = "DECRYPTION_FAILED",
	/** The client sent no detector token, so nothing was measured about it. */
	MISSING_TOKEN = "MISSING_TOKEN",
	/** A token arrived without its accompanying head hash. */
	MISSING_HEAD_HASH = "MISSING_HEAD_HASH",
	/**
	 * The user kept refreshing the puzzle, so the replacement is an image
	 * challenge instead. Only ever this direction, and only where the site
	 * has image enabled (see switchTypeAfterRefreshes in @prosopo/provider).
	 */
	PUZZLE_REFRESH_LIMIT = "PUZZLE_REFRESH_LIMIT",
	/** The user asked to swap the puzzle for an image challenge. */
	PUZZLE_USER_SWITCH = "PUZZLE_USER_SWITCH",
}

/**
 * Reason persisted at `result.reason` to record the outcome of a captcha
 * verification. Provider task code previously inlined these as string
 * literals — the enum lifts the canonical set into one place so callers
 * can type-check what they emit and the portal can render a known list.
 *
 * Values intentionally match the translation keys used to render messages
 * to the user, so the enum doubles as a typed bridge between server-side
 * outcomes and the locale package.
 */
export enum ResultReason {
	CAPTCHA_PASSED = "API.CAPTCHA_PASSED",
	CAPTCHA_FAILED = "API.CAPTCHA_FAILED",
	ABUSER_BLOCKED = "API.ABUSER_BLOCKED",
	ACCESS_POLICY_BLOCK = "API.ACCESS_POLICY_BLOCK",
	/**
	 * The dapp server verified with a `clientSessionId` that does not match the
	 * one the widget was rendered with (or the solve carries none at all). Stops
	 * a token earned in one session being replayed against another.
	 */
	CLIENT_SESSION_MISMATCH = "API.CLIENT_SESSION_MISMATCH",
	CRAWLER_BLOCKED = "API.CRAWLER_BLOCKED",
	DATACENTER_BLOCKED = "API.DATACENTER_BLOCKED",
	FAILED_IP_VALIDATION = "API.FAILED_IP_VALIDATION",
	INCORRECT_CAPTCHA_TYPE = "API.INCORRECT_CAPTCHA_TYPE",
	MOBILE_BLOCKED = "API.MOBILE_BLOCKED",
	PROXY_BLOCKED = "API.PROXY_BLOCKED",
	SATELLITE_BLOCKED = "API.SATELLITE_BLOCKED",
	SPAM_EMAIL_DOMAIN = "API.SPAM_EMAIL_DOMAIN",
	SPAM_EMAIL_RULE = "API.SPAM_EMAIL_RULE",
	SPAM_EMAIL_COUNT_EXCEEDED = "API.SPAM_EMAIL_COUNT_EXCEEDED",
	TIMESTAMP_TOO_OLD = "API.TIMESTAMP_TOO_OLD",
	TOO_MANY_LOCALHOST = "API.TOO_MANY_LOCALHOST",
	TOR_BLOCKED = "API.TOR_BLOCKED",
	VPN_BLOCKED = "API.VPN_BLOCKED",
	CAPTCHA_INVALID_SALT = "CAPTCHA.INVALID_SALT",
	CAPTCHA_INVALID_SOLUTION = "CAPTCHA.INVALID_SOLUTION",
	CAPTCHA_INVALID_TIMESTAMP = "CAPTCHA.INVALID_TIMESTAMP",
	CAPTCHA_NO_SESSION_FOUND = "CAPTCHA.NO_SESSION_FOUND",
	CAPTCHA_DECISION_MACHINE_DENIED = "CAPTCHA.DECISION_MACHINE_DENIED",
	DISALLOWED_WEBVIEW = "API.DISALLOWED_WEBVIEW",
	USER_NOT_VERIFIED = "API.USER_NOT_VERIFIED",
	USER_VERIFIED = "API.USER_VERIFIED",
	EMAIL_INVALID = "EMAIL_INVALID",
	EMAIL_MATCHED_CUSTOM_PATTERN = "EMAIL_MATCHED_CUSTOM_PATTERN",
	EMAIL_MATCHED_DEFAULT_PATTERN = "EMAIL_MATCHED_DEFAULT_PATTERN",
	EMAIL_TOO_MANY_DOTS = "EMAIL_TOO_MANY_DOTS",
}

export enum ScheduledTaskNames {
	BatchCommitment = "BatchCommitment",
	CalculateSolution = "CalculateSolution",
	StoreCommitmentsExternal = "StoreCommitmentsExternal",
	GetClientList = "GetClientList",
	SetClientEntropy = "SetClientEntropy",
	UpdateSpamEmailDomains = "UpdateSpamEmailDomains",
}

export enum ScheduledTaskStatus {
	Pending = "Pending",
	Running = "Running",
	Completed = "Completed",
	Failed = "Failed",
}

export const INPUT_LIMITS = {
	/** Identifiers, keys, slugs (accounts, site keys, dataset ids, …). */
	ID: 256,
	/** Names, labels, titles. */
	NAME: 256,
	/** Email addresses (treated as opaque strings — no format validation). */
	EMAIL: 320,
	/** URLs. */
	URL: 2048,
	/** General short freetext. Default for `boundedString` / `safeText`. */
	TEXT: 16384,
	/** Longer freetext: messages, descriptions, decision-machine source. */
	LONG_TEXT: 65536,
	/** Tokens, signatures, base64 payloads, behavioural/simd readings. */
	TOKEN: 131072,
} as const;

/** The timeframe in which a user must complete an image captcha (1 minute) */
export const DEFAULT_IMAGE_CAPTCHA_TIMEOUT = 60000;
/** The timeframe in which an image captcha solution remains valid on the page before timing out (2 minutes) */
export const DEFAULT_IMAGE_CAPTCHA_SOLUTION_TIMEOUT = 120000;
/** The timeframe in which an image captcha solution must be verified within (3 minutes) */
export const DEFAULT_IMAGE_CAPTCHA_VERIFIED_TIMEOUT = 180000;
/** The time in milliseconds that a cached, verified, image captcha solution is valid for (15 minutes) */
export const DEFAULT_IMAGE_MAX_VERIFIED_TIME_CACHED = 900000;
/** The timeframe in which a pow captcha solution remains valid on the page before timing out (1 minute) */
export const DEFAULT_POW_CAPTCHA_SOLUTION_TIMEOUT = 60000;
/** The timeframe in which a pow captcha must be completed and verified (2 minutes) */
export const DEFAULT_POW_CAPTCHA_VERIFIED_TIMEOUT = 120000;
/** The time in milliseconds that a Provider cached, verified, pow captcha solution is valid for (3 minutes) */
export const DEFAULT_POW_CAPTCHA_CACHED_TIMEOUT = 180000;
/** The timeframe in which a puzzle captcha solution remains valid on the page before timing out (1 minute) */
export const DEFAULT_PUZZLE_CAPTCHA_SOLUTION_TIMEOUT = 60000;
/** The timeframe in which a puzzle captcha must be completed and verified (2 minutes) */
export const DEFAULT_PUZZLE_CAPTCHA_VERIFIED_TIMEOUT = 120000;
/** The time in milliseconds that a Provider cached, verified, puzzle captcha solution is valid for (3 minutes) */
export const DEFAULT_PUZZLE_CAPTCHA_CACHED_TIMEOUT = 180000;
/** The timeframe in which an audio captcha solution remains valid on the page before timing out (1 minute) */
export const DEFAULT_AUDIO_CAPTCHA_SOLUTION_TIMEOUT = 60000;
/** The timeframe in which an audio captcha must be completed and verified (2 minutes) */
export const DEFAULT_AUDIO_CAPTCHA_VERIFIED_TIMEOUT = 120000;
/** The time in milliseconds that a Provider cached, verified, audio captcha solution is valid for (3 minutes) */
export const DEFAULT_AUDIO_CAPTCHA_CACHED_TIMEOUT = 180000;
/**
 * Double the puzzle's solution window, since finding and clicking several
 * icons takes longer than one drag; the other windows keep the puzzle's
 * multiples of it.
 */
export const DEFAULT_ICON_ORDER_CAPTCHA_SOLUTION_TIMEOUT = 120000;
export const DEFAULT_ICON_ORDER_CAPTCHA_VERIFIED_TIMEOUT = 240000;
export const DEFAULT_ICON_ORDER_CAPTCHA_CACHED_TIMEOUT = 360000;
/**
 * The time in milliseconds since the last correct captcha recorded in the contract (15 minutes), after which point, the
 * user will be required to complete another captcha
 */
export const DEFAULT_MAX_VERIFIED_TIME_CONTRACT = 900000;
/**
 * How old a detector payload may be before the frictionless flow penalises it
 * as stale (10 minutes). This is the window in which a payload is still worth
 * reading, so it is also the window in which the provider must keep the key
 * that reads it — see `DETECTOR_BUNDLE_TTL_SECONDS`, which is derived from this
 * rather than set independently. A binding shorter than this makes the provider
 * accept payloads it has already thrown away the means to decrypt.
 */
export const DEFAULT_MAX_TIMESTAMP_AGE = 600000;
/** How long @prosopo/server waits for a provider to answer a verify call (10 seconds) */
export const DEFAULT_PROVIDER_REQUEST_TIMEOUT_MS = 10000;
