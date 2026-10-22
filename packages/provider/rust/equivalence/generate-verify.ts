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

// Writes verify-vectors.json: the provider's real app, on a live environment (see
// live-harness.ts), answering dapp servers' PoW verify requests for seeded challenge records
// and sessions, across the checks verification runs (replay, timeouts, client sessions, access
// rules, spam lists and rules, the traffic filter, IP validation, DNS paths, scores, tiers),
// a stand-in provider for tokens another node issued, and the records and cached sessions it
// leaves. Each request carries the time it was sent, so the Rust can run at the same clock.
// Run on Node 24 with the live stores up.
import { writeFileSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo, Server } from "node:net";
import { fileURLToPath } from "node:url";
import { RedisWriteQueue } from "@prosopo/database";
import { getPair } from "@prosopo/keyring";
import {
	ALWAYS_FAIL_SITE_KEY,
	ALWAYS_PASS_SITE_KEY,
	CaptchaStatus,
	CaptchaType,
	type IPInfoResponse,
	type IUserDataSlim,
	POW_SEPARATOR,
	type PoWChallengeId,
	type Session,
	Tier,
	encodeProcaptchaOutput,
} from "@prosopo/types";
import { type AccessRuleEntry, accessRuleInput } from "@prosopo/user-access-policy";
import { u8aToHex } from "@prosopo/util";
import { startProviderApi } from "../../src/api/startProviderApi.js";
import { getCompositeIpAddress } from "../../src/compositeIpAddress.js";
import {
	MNEMONIC,
	type DnsTable,
	type IpapiTable,
	type Json,
	type Step,
	dumpDatabase,
	dumpRedisHashes,
	fakeDns,
	fakeIpapi,
	liveEnvironment,
	liveVariables,
	requestBytes,
	resetStores,
	send,
} from "./live-harness.js";

if (!process.version.startsWith("v24.")) {
	throw new Error(`this generator must run on Node 24 (the production runtime), not ${process.version}`);
}

process.env.NODE_ENV = "production";
delete process.env.MAINTENANCE_MODE;
const DATABASE = "equivalence_verify";
// The issuing provider a forwarded verify goes to; a fixed port, since tokens carry the URL.
const OTHER_PORT = 28123;
const OTHER_URL = `http://localhost:${OTHER_PORT}`;
const OTHER_ADDRESS = "5HGjWAeFDfFCWPsjFQdVV2Msvz2XtMktvgocEZcCj68kUMaw";
const SELF_URL = "https://pronode1.prosopo.io";

const pair = (uri: string) => getPair(uri);
const FREE = pair("//Alice");
const PRO = pair("//Bob");
const TRAFFIC = pair("//Charlie");
const STRICT = pair("//Dave");
const SESSIONS = pair("//Eve");
const UNREGISTERED = pair("//Ferdie");
const USER = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";
const BLOCKED_USER = "5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y";
const RESTRICTED_USER = "5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy";
const JA4 = "t13d1516h2_8daaf6152771_02713d6af862";
const JA4_BLOCKED = "t13d0000h2_000000000000_000000000000";

const location = (country: string, code: string, latitude: number, longitude: number) => ({ country, country_code: code, state: "S", city: `${code} City`, latitude, longitude, timezone: "UTC" });
const answer = (ip: string, code: string, latitude: number, longitude: number, flags: Record<string, boolean> = {}, extra: Record<string, Json> = {}): Json => ({
	ip,
	is_bogon: false,
	is_mobile: false,
	is_satellite: false,
	is_crawler: false,
	is_datacenter: false,
	is_tor: false,
	is_proxy: false,
	is_vpn: false,
	is_abuser: false,
	...flags,
	company: { name: "Example ISP", abuser_score: "0.0034 (Low)", domain: "example.net", type: "isp" },
	asn: { asn: 3320, org: "AS3320 Org", type: "isp", abuser_score: "0.0012 (Low)" },
	location: location(code === "DE" ? "Germany" : "Elsewhere", code, latitude, longitude),
	...extra,
});
const IPAPI: IpapiTable = {
	"203.0.113.7": answer("203.0.113.7", "DE", 52.52, 13.405),
	"203.0.113.8": answer("203.0.113.8", "DE", 52.5, 13.4),
	"198.51.100.20": answer("198.51.100.20", "AU", -33.87, 151.21),
	"198.51.100.30": answer("198.51.100.30", "NL", 52.37, 4.9, { is_vpn: true }),
	"198.51.100.40": answer("198.51.100.40", "US", 37.77, -122.42, { is_abuser: true }, { company: { name: "Bad", abuser_score: "0.9 (Very High)", domain: "bad.example", type: "hosting" } }),
	"192.0.2.53": answer("192.0.2.53", "US", 37.4, -122.08, { is_datacenter: true }, { company: { name: "Resolver Co", abuser_score: "0.001 (Low)", domain: "dns.example", type: "hosting" }, datacenter: { datacenter: "Resolver Co" } }),
	"192.0.2.77": answer("192.0.2.77", "DE", 52.52, 13.405),
	"192.0.2.54": answer("192.0.2.54", "US", 37.4, -122.08, { is_abuser: true }, { company: { name: "Peer Co", abuser_score: "0.4 (High)", domain: "peer.example", type: "isp" } }),
};
const DNS: DnsTable = { "clean.eqv.zz": {} };
const SPAM_LIST = ["spam-direct.zz"];

const recordHeaders = { "user-agent": "Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0", "accept-language": "en" };

await resetStores(DATABASE);
const ipapi = await fakeIpapi(IPAPI);
const dns = await fakeDns(DNS);
const providerList = JSON.stringify({
	other: { address: OTHER_ADDRESS, url: OTHER_URL, datasetId: "0x01", weight: 1 },
	self: { address: "{{SELF}}", url: SELF_URL, datasetId: "0x01", weight: 1 },
});
const selfAddress = getPair(MNEMONIC).address;
process.env.PROSOPO_PROVIDER_LIST = providerList.replace("{{SELF}}", selfAddress);
const variables = liveVariables(DATABASE, ipapi.url, { PROSOPO_DNS_SERVERS: JSON.stringify([dns.server]) });
const env = await liveEnvironment(variables);
if (env.pair?.address !== selfAddress) throw new Error("the provider pair is not the mnemonic's");
const db = env.getDb();

const forwarded: Json[] = [];
const other: Server = createServer((req: IncomingMessage, res: ServerResponse) => {
	let body = "";
	req.on("data", (chunk: Buffer) => {
		body += chunk.toString("utf8");
	});
	req.on("end", () => {
		const pick = (name: string) => (req.headers[name] as string | undefined) ?? null;
		forwarded.push({ method: req.method ?? "", path: req.url ?? "", siteKey: pick("prosopo-site-key"), user: pick("prosopo-user"), marker: pick("prosopo-verify-forwarded"), body: JSON.parse(body) as Json });
		res.writeHead(200, { "Content-Type": "application/json" });
		res.end(JSON.stringify({ status: "ok", verified: true, score: 0.25, forwardedBy: "issuer" }));
	});
});
await new Promise<void>((resolve) => other.listen(OTHER_PORT, "::", () => resolve()));

const ipValidationRules = {
	enabled: true,
	actions: { countryChangeAction: "reject", cityChangeAction: "allow", ispChangeAction: "allow", distanceExceedAction: "reject", abuseScoreExceedAction: "allow" },
	distanceThresholdKm: 1000,
	abuseScoreThreshold: 0.5,
	requireAllConditions: false,
	forceConsistentIp: false,
};
const base = { domains: ["example.com"], verifiedTimeout: 600000, solutionTimeout: 600000, captchaType: "pow" };
const records = [
	{ account: FREE.address, settings: { ...base }, tier: Tier.Free },
	{
		account: PRO.address,
		settings: {
			...base,
			spamEmailDomainCheckEnabled: true,
			storeMetadata: true,
			spamFilter: { enabled: true, emailRules: { enabled: true, normaliseGmail: true, useDefaultPatterns: true, customRegexBlocklist: ["^blocked"], maxEmailSubmissionCount: 1 } },
		},
		tier: Tier.Professional,
	},
	{
		account: TRAFFIC.address,
		settings: { ...base, trafficFilter: { vpn: { action: "block" }, datacenter: { action: "challenge", captchaType: "image" }, abuserScoreThreshold: 0.5 }, ipValidationRules },
		tier: Tier.Enterprise,
	},
	{ account: STRICT.address, settings: { ...base, verifiedTimeout: 1000 }, tier: Tier.Free },
	{ account: SESSIONS.address, settings: { ...base, disallowWebView: true }, tier: Tier.Professional },
] as unknown as IUserDataSlim[];
await db.updateClientRecords(records);
await db.bulkUpdateSpamEmailDomains(SPAM_LIST.map((domain) => ({ filter: { domain }, update: { domain } })), true);

const rules: unknown[] = [
	{ type: "block", userId: BLOCKED_USER, clientId: FREE.address, deferToVerify: true, description: "a deferred user block" },
	{ type: "restrict", userId: RESTRICTED_USER, deferToVerify: true, captchaType: "image", solvedImagesCount: 8 },
	{ type: "block", ip: "203.0.113.66", description: "a hard block" },
	{ type: "block", ja4Hash: JA4_BLOCKED, deferToVerify: true },
	{ type: "block", ip: "203.0.113.67", captchaType: "image" },
];
await db.getUserAccessRulesStorage().insertRules(rules.map((rule) => ({ rule: accessRuleInput.parse(rule) }) as AccessRuleEntry));

const ipInfoFor = async (ip: string): Promise<IPInfoResponse> => env.ipInfoService.lookup(ip);

type Seed = {
	name: string;
	dapp: string;
	user?: string;
	ip?: string;
	status?: CaptchaStatus;
	submitted?: "now" | "old" | "never";
	sessionId?: string;
	clientSessionId?: string;
	coords?: [number, number][][];
	serverChecked?: boolean;
	ja4?: string;
};
let nonce = 0;
const seedPow = async (seed: Seed): Promise<string> => {
	const user = seed.user ?? USER;
	const requestedAt = Date.now() - 5000 + nonce;
	nonce += 1;
	const challenge = `${requestedAt}${POW_SEPARATOR}${user}${POW_SEPARATOR}${seed.dapp}${POW_SEPARATOR}${nonce}` as PoWChallengeId;
	const ip = seed.ip ?? "203.0.113.7";
	await db.storePowCaptchaRecord(
		challenge,
		{ requestedAtTimestamp: requestedAt, userAccount: user, dappAccount: seed.dapp },
		4,
		"0xprovidersignature",
		getCompositeIpAddress(ip),
		recordHeaders,
		seed.ja4 ?? JA4,
		seed.sessionId,
		seed.serverChecked ?? false,
		false,
		undefined,
		await ipInfoFor(ip),
	);
	if (seed.submitted !== "never") {
		await db.updatePowCaptchaRecordResult(challenge, { status: seed.status ?? CaptchaStatus.approved }, seed.serverChecked ?? false, true, "0xusersignature", seed.coords);
	}
	const extra: Record<string, unknown> = {};
	if (seed.submitted === "old") extra.submittedAtTimestamp = new Date(Date.now() - 3_600_000);
	if (seed.clientSessionId) extra.clientMetaData = { clientSessionId: seed.clientSessionId };
	if (Object.keys(extra).length > 0) await db.updatePowCaptchaRecord(challenge, extra);
	return challenge;
};

const seedSession = async (sessionId: string, extra: Partial<Session> = {}): Promise<Session> => {
	const session = {
		sessionId,
		createdAt: new Date(Date.now() - 10000),
		token: `token-${sessionId}`,
		score: 0.3,
		threshold: 0.5,
		scoreComponents: { baseScore: 0.25, lScore: 0.05 },
		ipAddress: getCompositeIpAddress("203.0.113.7"),
		captchaType: CaptchaType.pow,
		webView: false,
		iFrame: false,
		decryptedHeadHash: `head-${sessionId}`,
		...extra,
	} as Session;
	await db.storeSessionRecord(session);
	return session;
};

await seedSession("s-plain");
await seedSession("s-dns", { dnsEvent: { receivedAt: new Date(Date.now() - 9000), peerIp: "192.0.2.54", resolverIp: "192.0.2.53", pathValid: false } } as Partial<Session>);
await seedSession("s-origin", { dnsEvent: { receivedAt: new Date(Date.now() - 9000), resolverIp: "192.0.2.53", pathValid: false }, d: { a: 1, b: 2 } } as Partial<Session>);
await seedSession("s-escalation", { originSessionId: "s-origin", isEscalation: true, d: { b: 3 }, scoreComponents: { baseScore: 0.1, timeout: 0.2 } } as Partial<Session>);
await seedSession("s-zero", { scoreComponents: { baseScore: 0 } } as Partial<Session>);
const queue = new RedisWriteQueue(db.getRedisConnection(), env.logger);
for (const sessionId of ["s-cached", "s-cached-fail"]) {
	const cached = await seedSession(sessionId);
	await queue.cacheSession(sessionId, cached as unknown as Record<string, unknown>);
}

const challenges: Record<string, string> = {};
const seeds: Seed[] = [
	{ name: "free", dapp: FREE.address },
	{ name: "free-session", dapp: FREE.address, sessionId: "s-plain" },
	{ name: "free-cached", dapp: FREE.address, sessionId: "s-cached" },
	{ name: "replayed", dapp: FREE.address },
	{ name: "checked", dapp: FREE.address, serverChecked: true, sessionId: "s-zero" },
	{ name: "pending", dapp: FREE.address, status: CaptchaStatus.pending },
	{ name: "disapproved", dapp: FREE.address, status: CaptchaStatus.disapproved },
	{ name: "unsubmitted", dapp: STRICT.address, submitted: "never" },
	{ name: "old", dapp: STRICT.address, submitted: "old" },
	{ name: "client-session", dapp: FREE.address, clientSessionId: "widget-session-1", sessionId: "s-cached-fail" },
	{ name: "client-session-ok", dapp: FREE.address, clientSessionId: "widget-session-2" },
	{ name: "deferred-user", dapp: FREE.address, user: BLOCKED_USER, sessionId: "s-zero" },
	{ name: "deferred-restrict", dapp: FREE.address, user: RESTRICTED_USER },
	{ name: "hard-ip", dapp: FREE.address, ip: "203.0.113.66", coords: [[[1, 2]], [[35, 4000]]] },
	{ name: "routing-ip", dapp: FREE.address, ip: "203.0.113.67" },
	{ name: "pow-ja4", dapp: FREE.address, ja4: JA4_BLOCKED },
	{ name: "pro", dapp: PRO.address, sessionId: "s-plain" },
	{ name: "pro-spam-domain", dapp: PRO.address },
	{ name: "pro-default-pattern", dapp: PRO.address },
	{ name: "pro-custom-pattern", dapp: PRO.address },
	{ name: "pro-email-ok", dapp: PRO.address },
	{ name: "pro-email-again", dapp: PRO.address },
	{ name: "pro-clean-domain", dapp: PRO.address },
	{ name: "traffic-vpn-record", dapp: TRAFFIC.address, ip: "198.51.100.30" },
	{ name: "traffic-vpn-current", dapp: TRAFFIC.address },
	{ name: "traffic-abuser", dapp: FREE.address, ip: "198.51.100.40" },
	{ name: "traffic-abuser-threshold", dapp: TRAFFIC.address, ip: "192.0.2.54" },
	{ name: "ip-far", dapp: TRAFFIC.address },
	{ name: "ip-near", dapp: TRAFFIC.address, sessionId: "s-dns" },
	{ name: "dns", dapp: SESSIONS.address, sessionId: "s-dns" },
	{ name: "escalation", dapp: SESSIONS.address, sessionId: "s-escalation" },
	{ name: "zero-score", dapp: SESSIONS.address, sessionId: "s-zero" },
	{ name: "forward", dapp: FREE.address },
	{ name: "forward-self", dapp: FREE.address },
	{ name: "forward-marked", dapp: FREE.address },
	{ name: "spanish", dapp: FREE.address },
	{ name: "mismatch", dapp: PRO.address },
];
for (const seed of seeds) challenges[seed.name] = await seedPow(seed);

type Kind = "puzzle" | "audio" | "iconOrder";
type InteractiveSeed = Seed & { kind: Kind };
const interactiveSeeds: InteractiveSeed[] = [
	{ name: "i-puzzle", kind: "puzzle", dapp: FREE.address },
	{ name: "i-puzzle-pro", kind: "puzzle", dapp: PRO.address, sessionId: "s-i-plain" },
	{ name: "i-puzzle-replayed", kind: "puzzle", dapp: FREE.address, sessionId: "s-i-replayed" },
	{ name: "i-puzzle-pending", kind: "puzzle", dapp: FREE.address, status: CaptchaStatus.pending },
	{ name: "i-puzzle-wrong", kind: "puzzle", dapp: FREE.address, status: CaptchaStatus.disapproved },
	{ name: "i-puzzle-old", kind: "puzzle", dapp: STRICT.address, submitted: "old", sessionId: "s-i-old" },
	{ name: "i-puzzle-client-session", kind: "puzzle", dapp: FREE.address, clientSessionId: "widget-i", sessionId: "s-i-client" },
	{ name: "i-audio-deferred", kind: "audio", dapp: FREE.address, user: BLOCKED_USER, sessionId: "s-i-deferred" },
	{ name: "i-audio-vpn", kind: "audio", dapp: TRAFFIC.address, ip: "198.51.100.30", sessionId: "s-i-vpn" },
	{ name: "i-audio-mismatch", kind: "audio", dapp: PRO.address },
	{ name: "i-icon-spam", kind: "iconOrder", dapp: PRO.address, sessionId: "s-i-spam" },
	{ name: "i-icon-rule", kind: "iconOrder", dapp: PRO.address },
	{ name: "i-icon-email", kind: "iconOrder", dapp: PRO.address },
	{ name: "i-icon-email-again", kind: "iconOrder", dapp: PRO.address, sessionId: "s-i-count" },
	{ name: "i-icon-far", kind: "iconOrder", dapp: TRAFFIC.address },
	{ name: "i-icon-dns", kind: "iconOrder", dapp: SESSIONS.address, sessionId: "s-i-dns" },
	{ name: "i-icon-escalation", kind: "iconOrder", dapp: SESSIONS.address, sessionId: "s-i-escalation" },
];
for (const sessionId of ["s-i-plain", "s-i-replayed", "s-i-old", "s-i-client", "s-i-deferred", "s-i-vpn", "s-i-spam", "s-i-count"]) await seedSession(sessionId);
await seedSession("s-i-dns", { dnsEvent: { receivedAt: new Date(Date.now() - 9000), peerIp: "192.0.2.54", resolverIp: "192.0.2.53", pathValid: false } } as Partial<Session>);
await seedSession("s-i-escalation", { originSessionId: "s-origin", isEscalation: true, scoreComponents: { baseScore: 0.15 } } as Partial<Session>);
const seedInteractive = async (seed: InteractiveSeed): Promise<string> => {
	const user = seed.user ?? USER;
	const requestedAt = Date.now() - 5000 + nonce;
	nonce += 1;
	const challenge = `${requestedAt}${POW_SEPARATOR}${user}${POW_SEPARATOR}${seed.dapp}${POW_SEPARATOR}${nonce}` as PoWChallengeId;
	const ip = seed.ip ?? "203.0.113.7";
	const components = { requestedAtTimestamp: requestedAt, userAccount: user, dappAccount: seed.dapp };
	const shared = ["0xprovidersignature", getCompositeIpAddress(ip), recordHeaders, "t13d1516h2_8daaf6152771_02713d6af862", seed.sessionId, await ipInfoFor(ip)] as const;
	const result = { status: seed.status ?? CaptchaStatus.approved };
	if (seed.kind === "puzzle") {
		await db.storePuzzleCaptchaRecord(challenge, components, 120, 40, 10, 40, 6, ...shared);
		if (seed.submitted !== "never") await db.updatePuzzleCaptchaRecordResult(challenge, result, false, true, "0xusersignature");
	} else if (seed.kind === "audio") {
		await db.storeAudioCaptchaRecord(challenge, components, "4817", ...shared);
		if (seed.submitted !== "never") await db.updateAudioCaptchaRecordResult(challenge, result, false, true, "0xusersignature");
	} else {
		await db.storeIconOrderCaptchaRecord(challenge, components, [{ x: 10, y: 20, size: 32, kind: "star" }], 8, ...shared);
		if (seed.submitted !== "never") await db.updateIconOrderCaptchaRecordResult(challenge, result, false, true, "0xusersignature");
	}
	const extra: Record<string, unknown> = {};
	if (seed.submitted === "old") extra.submittedAtTimestamp = new Date(Date.now() - 3_600_000);
	if (seed.clientSessionId) extra.clientMetaData = { clientSessionId: seed.clientSessionId };
	if (Object.keys(extra).length > 0) {
		if (seed.kind === "puzzle") await db.updatePuzzleCaptchaRecord(challenge, extra);
		else if (seed.kind === "audio") await db.updateAudioCaptchaRecord(challenge, extra);
		else await db.updateIconOrderCaptchaRecord(challenge, extra);
	}
	return challenge;
};
for (const seed of interactiveSeeds) challenges[seed.name] = await seedInteractive(seed);

type ImageSeed = Seed & { status?: CaptchaStatus; reason?: string; webView?: boolean };
const imageSeeds: ImageSeed[] = [
	{ name: "img", dapp: FREE.address },
	{ name: "img-pro", dapp: PRO.address, sessionId: "s-img-plain" },
	{ name: "img-replayed", dapp: FREE.address },
	{ name: "img-disapproved", dapp: PRO.address, status: CaptchaStatus.disapproved, reason: "CAPTCHA.INVALID_SOLUTION", sessionId: "s-img-disapproved" },
	{ name: "img-disapproved-free", dapp: FREE.address, status: CaptchaStatus.disapproved },
	{ name: "img-pending", dapp: PRO.address, status: CaptchaStatus.pending, sessionId: "s-img-pending" },
	{ name: "img-old", dapp: PRO.address, submitted: "old" },
	{ name: "img-unsubmitted", dapp: PRO.address, submitted: "never" },
	{ name: "img-max-time", dapp: FREE.address },
	{ name: "img-client-session", dapp: PRO.address, clientSessionId: "widget-img", sessionId: "s-img-client" },
	{ name: "img-deferred", dapp: FREE.address, user: BLOCKED_USER, sessionId: "s-img-deferred" },
	{ name: "img-ja4", dapp: FREE.address, ja4: JA4_BLOCKED },
	{ name: "img-spam", dapp: PRO.address },
	{ name: "img-rule", dapp: PRO.address },
	{ name: "img-vpn", dapp: TRAFFIC.address, ip: "198.51.100.30" },
	{ name: "img-far", dapp: TRAFFIC.address, sessionId: "s-img-far" },
	{ name: "img-webview", dapp: SESSIONS.address, sessionId: "s-img-webview" },
	{ name: "img-dns", dapp: SESSIONS.address, sessionId: "s-img-dns" },
	{ name: "img-forward", dapp: FREE.address },
];
for (const sessionId of ["s-img-plain", "s-img-disapproved", "s-img-pending", "s-img-client", "s-img-deferred", "s-img-far"]) await seedSession(sessionId);
await seedSession("s-img-webview", { webView: true } as Partial<Session>);
await seedSession("s-img-dns", { dnsEvent: { receivedAt: new Date(Date.now() - 9000), peerIp: "192.0.2.77", resolverIp: "192.0.2.53", pathValid: true } } as Partial<Session>);
const seedImage = async (seed: ImageSeed): Promise<string> => {
	nonce += 1;
	const id = `0x${nonce.toString(16).padStart(64, "0")}`;
	const ip = seed.ip ?? "203.0.113.7";
	const now = Date.now();
	await db.storeUserImageCaptchaSolution([{ captchaId: `0xcaptcha${nonce}`, captchaContentId: `0xcontent${nonce}`, salt: "0xsalt", solution: ["0xsolution"] }], {
		userAccount: seed.user ?? USER,
		dappAccount: seed.dapp,
		datasetId: "0xdataset",
		providerAccount: selfAddress,
		id,
		result: { status: seed.status ?? CaptchaStatus.approved, ...(seed.reason && { reason: seed.reason }) },
		userSignature: "0xusersignature",
		ipAddress: getCompositeIpAddress(ip),
		headers: recordHeaders,
		ja4: seed.ja4 ?? JA4,
		userSubmitted: seed.submitted !== "never",
		serverChecked: false,
		ipInfo: await ipInfoFor(ip),
		requestedAtTimestamp: new Date(now - 8000),
		...(seed.submitted !== "never" && { submittedAtTimestamp: new Date(seed.submitted === "old" ? now - 3_600_000 : now - 2000) }),
		...(seed.sessionId && { sessionId: seed.sessionId }),
		...(seed.clientSessionId && { clientMetaData: { clientSessionId: seed.clientSessionId } }),
		pending: false,
		salt: "0xsalt",
		requestHash: "0xrequesthash",
		deadlineTimestamp: new Date(now + 600000),
		threshold: 0.8,
	} as Parameters<typeof db.storeUserImageCaptchaSolution>[1]);
	return id;
};
const commitments: Record<string, string> = {};
for (const seed of imageSeeds) commitments[seed.name] = await seedImage(seed);

await seedSession("s-auth", { captchaType: CaptchaType.authenticated } as Partial<Session>);
await seedSession("s-auth-2", { captchaType: CaptchaType.authenticated } as Partial<Session>);
await seedSession("s-auth-family", { captchaType: CaptchaType.authenticated } as Partial<Session>);
await seedSession("s-auth-v6", { captchaType: CaptchaType.authenticated, ipAddress: getCompositeIpAddress("2001:db8::7") } as Partial<Session>);
await seedSession("s-auth-client", { captchaType: CaptchaType.authenticated, clientMetaData: { clientSessionId: "widget-auth" } } as Partial<Session>);

const database = await dumpDatabase(DATABASE);
const redis = await dumpRedisHashes();
const client = await db.getRedisConnection().getClient();
const cache: Json[] = [];
for (const key of (await client.keys("cache:session:*")).sort()) cache.push({ key, value: JSON.parse((await client.get(key)) ?? "null") as Json });

const signer = (dapp: string) => [FREE, PRO, TRAFFIC, STRICT, SESSIONS, UNREGISTERED].find((candidate) => candidate.address === dapp);
const token = (o: { dapp: string; user?: string; challenge?: string; commitmentId?: string; providerUrl?: string; timestamp?: string }) =>
	encodeProcaptchaOutput({
		dapp: o.dapp,
		user: o.user ?? USER,
		...(o.challenge !== undefined && { challenge: o.challenge }),
		...(o.commitmentId !== undefined && { commitmentId: o.commitmentId }),
		...(o.providerUrl !== undefined && { providerUrl: o.providerUrl }),
		timestamp: o.timestamp ?? "1700000000000",
		signature: { provider: { challenge: "0xprovider" }, user: { timestamp: "0xuser" } },
	});
const signed = (dapp: string, timestamp = "1700000000000") => u8aToHex((signer(dapp) ?? FREE).sign(timestamp));

const path = "/v1/prosopo/provider/client/pow/verify";
const json: [string, string] = ["Content-Type", "application/json"];
const verify = (body: Record<string, unknown>, headers: [string, string][] = [], at: string = path): Step => ({ method: "POST", path: at, headers: [json, ...headers], body: JSON.stringify(body) });
const interactivePath: Record<Kind, string> = {
	puzzle: "/v1/prosopo/provider/client/puzzle/verify",
	audio: "/v1/prosopo/provider/client/audio/verify",
	iconOrder: "/v1/prosopo/provider/client/icon-order/verify",
};
const ofInteractive = (name: string, extra: Record<string, unknown> = {}, headers: [string, string][] = [], tokenExtra: { providerUrl?: string } = {}): Step => {
	const seed = interactiveSeeds.find((candidate) => candidate.name === name) as InteractiveSeed;
	const body = { token: token({ dapp: seed.dapp, user: seed.user, challenge: challenges[name], ...tokenExtra }), dappSignature: signed(seed.dapp), ...extra };
	return { method: "POST", path: interactivePath[seed.kind], headers: [json, ...headers], body: JSON.stringify(body) };
};
const imagePath = "/v1/prosopo/provider/client/image/dapp/verify";
const ofImage = (name: string, extra: Record<string, unknown> = {}, headers: [string, string][] = [], tokenExtra: { providerUrl?: string } = {}): Step => {
	const seed = imageSeeds.find((candidate) => candidate.name === name) as ImageSeed;
	const body = { token: token({ dapp: seed.dapp, user: seed.user, commitmentId: commitments[name], timestamp: "1700000000001", ...tokenExtra }), dappSignature: signed(seed.dapp, "1700000000001"), ...extra };
	return { method: "POST", path: imagePath, headers: [json, ...headers], body: JSON.stringify(body) };
};
const authenticatedPath = "/v1/prosopo/provider/client/authenticated/verify";
const authenticated = (sessionId: string | undefined, extra: Record<string, unknown> = {}, headers: [string, string][] = [], tokenExtra: { providerUrl?: string; user?: string } = {}): Step => {
	const body = { token: token({ dapp: FREE.address, ...(sessionId !== undefined && { commitmentId: sessionId }), ...tokenExtra }), dappSignature: signed(FREE.address), ...extra };
	return { method: "POST", path: authenticatedPath, headers: [json, ...headers], body: JSON.stringify(body) };
};
const ofSeed = (name: string, extra: Record<string, unknown> = {}, headers: [string, string][] = [], tokenExtra: { providerUrl?: string; user?: string } = {}): Step => {
	const seed = seeds.find((candidate) => candidate.name === name) as Seed;
	return verify({ token: token({ dapp: seed.dapp, user: seed.user, challenge: challenges[name], ...tokenExtra }), dappSignature: signed(seed.dapp), ...extra }, headers);
};

const steps: Step[] = [
	ofSeed("free"),
	ofSeed("free-session"),
	ofSeed("free-cached"),
	ofSeed("replayed"),
	ofSeed("replayed"),
	ofSeed("checked"),
	ofSeed("pending"),
	ofSeed("disapproved"),
	ofSeed("unsubmitted"),
	ofSeed("old"),
	ofSeed("client-session", { clientSessionId: "someone-else" }),
	ofSeed("client-session-ok", { clientSessionId: "widget-session-2" }),
	ofSeed("deferred-user"),
	ofSeed("deferred-restrict"),
	ofSeed("hard-ip"),
	ofSeed("routing-ip"),
	ofSeed("pow-ja4"),
	ofSeed("pro"),
	ofSeed("pro-spam-domain", { email: "someone@spam-direct.zz" }),
	ofSeed("pro-default-pattern", { email: "a.b.c.d.e@example.com" }),
	ofSeed("pro-custom-pattern", { email: "blocked@example.com" }),
	ofSeed("pro-email-ok", { email: "Repeat+one@Example.com" }),
	ofSeed("pro-email-again", { email: "repeat+two@example.com" }),
	ofSeed("pro-clean-domain", { email: "someone@clean.eqv.zz" }),
	ofSeed("traffic-vpn-record"),
	ofSeed("traffic-vpn-current", { ip: "198.51.100.30" }),
	ofSeed("traffic-abuser"),
	ofSeed("traffic-abuser-threshold"),
	ofSeed("ip-far", { ip: "198.51.100.20" }),
	ofSeed("ip-near", { ip: "203.0.113.8" }),
	ofSeed("dns"),
	ofSeed("escalation"),
	ofSeed("zero-score"),
	ofSeed("forward", {}, [], { providerUrl: OTHER_URL }),
	ofSeed("forward", {}, [], { providerUrl: `${OTHER_URL}/` }),
	ofSeed("forward", {}, [], { providerUrl: `http://ipv4.localhost:${OTHER_PORT}` }),
	ofSeed("forward-self", {}, [], { providerUrl: SELF_URL }),
	ofSeed("forward-marked", {}, [["Prosopo-Verify-Forwarded", "true"]], { providerUrl: OTHER_URL }),
	ofSeed("forward-marked", {}, [], { providerUrl: "https://unknown.example" }),
	ofSeed("spanish", {}, [["Accept-Language", "es"]]),
	verify({ token: token({ dapp: FREE.address, challenge: challenges.mismatch }), dappSignature: signed(FREE.address) }),
	verify({ token: token({ dapp: PRO.address, challenge: challenges.mismatch }), dappSignature: signed(PRO.address) }),
	verify({ token: token({ dapp: FREE.address, challenge: `${Date.now()}${POW_SEPARATOR}${USER}${POW_SEPARATOR}${FREE.address}${POW_SEPARATOR}999` }), dappSignature: signed(FREE.address) }),
	verify({ token: token({ dapp: FREE.address }), dappSignature: signed(FREE.address) }),
	verify({ token: token({ dapp: FREE.address, challenge: "x" }), dappSignature: signed(PRO.address) }),
	verify({ token: token({ dapp: FREE.address, challenge: "x" }), dappSignature: "0xnothex" }),
	verify({ token: token({ dapp: UNREGISTERED.address, challenge: "x" }), dappSignature: signed(UNREGISTERED.address) }),
	verify({ token: token({ dapp: FREE.address, user: "not-an-address", challenge: "x" }), dappSignature: signed(FREE.address) }),
	verify({ token: token({ dapp: ALWAYS_PASS_SITE_KEY, challenge: "x" }), dappSignature: "0x00" }),
	verify({ token: token({ dapp: ALWAYS_FAIL_SITE_KEY, challenge: "x" }), dappSignature: "0x00" }),
	verify({ token: "0xdeadbeef", dappSignature: "0x00" }),
	verify({ token: token({ dapp: FREE.address, challenge: "x" }), dappSignature: "0x00", email: "not an email" }),
	verify({ dappSignature: "0x00" }),
	verify({ token: token({ dapp: FREE.address, challenge: "x" }) }),
	{ method: "POST", path: `${path}/`, headers: [json], body: JSON.stringify({ token: token({ dapp: ALWAYS_PASS_SITE_KEY }), dappSignature: "0x00" }) },
	{ method: "POST", path: path.toUpperCase(), headers: [json], body: JSON.stringify({ token: token({ dapp: ALWAYS_FAIL_SITE_KEY }), dappSignature: "0x00" }) },
	ofInteractive("i-puzzle"),
	ofInteractive("i-puzzle-pro"),
	ofInteractive("i-puzzle-replayed"),
	ofInteractive("i-puzzle-replayed"),
	ofInteractive("i-puzzle-pending"),
	ofInteractive("i-puzzle-wrong"),
	ofInteractive("i-puzzle-old"),
	ofInteractive("i-puzzle-client-session", { clientSessionId: "someone-else" }),
	ofInteractive("i-audio-deferred"),
	ofInteractive("i-audio-vpn"),
	{ ...verify({ token: token({ dapp: FREE.address, challenge: challenges["i-audio-mismatch"] }), dappSignature: signed(FREE.address) }), path: "/v1/prosopo/provider/client/audio/verify" },
	{ ...ofInteractive("i-audio-mismatch"), path: "/v1/prosopo/provider/client/puzzle/verify" },
	ofInteractive("i-audio-mismatch", {}, [["Accept-Language", "de"]]),
	ofInteractive("i-icon-spam", { email: "someone@spam-direct.zz" }),
	ofInteractive("i-icon-rule", { email: "blocked@example.com" }),
	ofInteractive("i-icon-email", { email: "count+one@example.com" }),
	ofInteractive("i-icon-email-again", { email: "Count+two@example.com" }),
	ofInteractive("i-icon-far", { ip: "198.51.100.20" }),
	ofInteractive("i-icon-dns"),
	ofInteractive("i-icon-escalation"),
	ofInteractive("i-puzzle", {}, [], { providerUrl: OTHER_URL }),
	{ method: "POST", path: "/v1/prosopo/provider/client/audio/verify", headers: [json], body: JSON.stringify({ token: token({ dapp: ALWAYS_FAIL_SITE_KEY }), dappSignature: "0x00" }) },
	{ method: "POST", path: "/v1/prosopo/provider/client/icon-order/verify", headers: [json], body: JSON.stringify({ dappSignature: "0x00" }) },
	ofImage("img"),
	ofImage("img-pro"),
	ofImage("img-replayed"),
	ofImage("img-replayed"),
	ofImage("img-disapproved"),
	ofImage("img-disapproved-free"),
	ofImage("img-pending"),
	ofImage("img-old"),
	ofImage("img-unsubmitted"),
	ofImage("img-max-time", { maxVerifiedTime: 0 }),
	ofImage("img-client-session", { clientSessionId: "someone-else" }),
	ofImage("img-deferred"),
	ofImage("img-ja4"),
	ofImage("img-spam", { email: "someone@spam-direct.zz" }),
	ofImage("img-rule", { email: "a.b.c.d.e@example.com" }),
	ofImage("img-vpn"),
	ofImage("img-far", { ip: "198.51.100.20" }),
	ofImage("img-webview"),
	ofImage("img-dns", { ip: "203.0.113.8" }),
	ofImage("img-forward", {}, [], { providerUrl: OTHER_URL }),
	verify({ token: token({ dapp: FREE.address }), dappSignature: signed(FREE.address) }, [], imagePath),
	verify({ token: token({ dapp: FREE.address, commitmentId: "0xunknown" }), dappSignature: signed(FREE.address) }, [], imagePath),
	verify({ token: token({ dapp: FREE.address, user: "not-an-address", commitmentId: "0x1" }), dappSignature: signed(FREE.address) }, [], imagePath),
	verify({ token: token({ dapp: UNREGISTERED.address, commitmentId: "0x1" }), dappSignature: signed(UNREGISTERED.address) }, [], imagePath),
	verify({ token: token({ dapp: FREE.address, commitmentId: "0x1" }), dappSignature: signed(PRO.address) }, [], imagePath),
	verify({ token: token({ dapp: FREE.address, commitmentId: "0x1" }), dappSignature: "0x00", maxVerifiedTime: "soon" }, [], imagePath),
	verify({ token: token({ dapp: FREE.address, commitmentId: "0x1" }), dappSignature: "0x00", email: "not an email" }, [], imagePath),
	verify({ token: "0xdeadbeef", dappSignature: "0x00" }, [], imagePath),
	verify({ token: token({ dapp: ALWAYS_PASS_SITE_KEY }), dappSignature: "0x00" }, [], imagePath),
	authenticated("s-auth", { ip: "203.0.113.7" }),
	authenticated("s-auth", { ip: "203.0.113.7" }),
	authenticated("s-auth-2"),
	authenticated("s-auth-2", { ip: "203.0.113.70" }),
	authenticated("s-auth-2", { ip: "not-an-ip" }),
	authenticated("s-auth-v6", { ip: "2001:db8::7" }),
	authenticated("s-auth-family", { ip: "::cb00:7107" }),
	authenticated("s-auth-client", { ip: "203.0.113.7", clientSessionId: "someone-else" }),
	authenticated("s-plain", { ip: "203.0.113.7" }),
	authenticated("s-missing", { ip: "203.0.113.7" }),
	authenticated(undefined, { ip: "203.0.113.7" }),
	authenticated("s-auth-client", { ip: "203.0.113.7" }, [["Accept-Language", "fr"]], { providerUrl: OTHER_URL }),
	authenticated("s-auth-client", { ip: "203.0.113.7" }, [], { user: "not-an-address" }),
	verify({ token: token({ dapp: ALWAYS_FAIL_SITE_KEY }), dappSignature: "0x00" }, [], authenticatedPath),
	verify({ dappSignature: "0x00" }, [], authenticatedPath),
	{ method: "GET", path, headers: [json] },
	{ method: "POST", path, headers: [["Content-Type", "text/plain"]], body: "token" },
];

const server: Server = await startProviderApi(env, false, 0);
const port = (server.address() as AddressInfo).port;
const exchanges: Json[] = [];
for (const step of steps) {
	const bytes = requestBytes(step);
	const at = Date.now();
	const response = await send(port, bytes);
	exchanges.push({ request: bytes.toString("base64"), response: response.toString("base64"), compare: step.compare !== false, at });
}
const metrics = (await send(port, requestBytes({ method: "GET", path: "/metrics" })))
	.toString("utf8")
	.split("\n")
	.filter((line) => line.startsWith("prosopo_captcha_verify"))
	.sort();
await new Promise<void>((resolve) => setTimeout(resolve, 1500));
const after = await dumpDatabase(DATABASE);
const counters: Json[] = [];
for (const key of (await client.keys("cnt:*")).sort()) counters.push({ key, value: await client.get(key) });
const cacheAfter: Json[] = [];
for (const key of (await client.keys("cache:session:*")).sort()) cacheAfter.push({ key, value: JSON.parse((await client.get(key)) ?? "null") as Json });
await client.quit();
await new Promise<void>((resolve) => server.close(() => resolve()));
await new Promise<void>((resolve) => other.close(() => resolve()));
await ipapi.close();
await dns.close();

writeFileSync(
	fileURLToPath(new URL("./verify-vectors.json", import.meta.url)),
	`${JSON.stringify({
		database: DATABASE,
		variables: { ...variables, PROSOPO_IPAPI_URL: "{{IPAPI_URL}}", PROSOPO_DNS_SERVERS: "{{DNS_SERVERS}}" },
		providerList,
		ipapi: IPAPI,
		dns: DNS,
		seed: database,
		redis,
		cache,
		exchanges,
		forwarded,
		metrics,
		after: {
			powcaptchas: after.powcaptchas,
			sessions: after.sessions,
			puzzlecaptchas: after.puzzlecaptchas,
			audiocaptchas: after.audiocaptchas,
			iconordercaptchas: after.iconordercaptchas,
			usercommitments: after.usercommitments,
		},
		counters,
		cacheAfter,
	})}\n`,
);
console.log(`wrote verify-vectors.json (${Object.keys(database).join(", ")} seeded, ${steps.length} requests, ${forwarded.length} forwarded)`);
process.exit(0);
