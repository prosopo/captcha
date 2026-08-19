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
	AdminApiPaths,
	ApiParams,
	CaptchaType,
	ClientApiPaths,
	type ClientMetaData,
	DecisionMachineKind,
	DecisionMachineLanguage,
	DecisionMachineRuntime,
	DecisionMachineScope,
	type GetPowCaptchaResponse,
	type GetPuzzleCaptchaResponse,
	type IUserSettings,
	ModeEnum,
	PublicApiPaths,
	type RandomProvider,
	type RemoveSitekeysBodyTypeOutput,
	type StoredEvents,
	Tier,
} from "@prosopo/types";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { HttpError } from "../api/HttpError.js";
import ProviderApi, { VERIFY_FORWARDED_HEADER } from "../api/ProviderApi.js";
import {
	BASE_URL,
	CHALLENGE,
	type FetchStub,
	SITE_KEY,
	USER,
	stubFetch,
} from "./apiHarness.js";

let fetchStub: FetchStub;

const api = (): ProviderApi => new ProviderApi(BASE_URL, SITE_KEY);

const randomProvider: RandomProvider = {
	providerAccount: "5provider",
	provider: {
		url: BASE_URL,
		datasetId: "0xdataset",
		datasetIdContent: "0xcontent",
	},
} as unknown as RandomProvider;

const powChallenge: GetPowCaptchaResponse = {
	status: "ok",
	[ApiParams.challenge]: CHALLENGE,
	[ApiParams.difficulty]: 4,
	[ApiParams.timestamp]: "1753900000000",
	[ApiParams.signature]: {
		[ApiParams.provider]: { [ApiParams.challenge]: "0xproviderchallengesig" },
	},
};

const puzzleChallenge: GetPuzzleCaptchaResponse = {
	status: "ok",
	[ApiParams.challenge]: CHALLENGE,
	[ApiParams.background]: "data:image/webp;base64,UklGRg==",
	[ApiParams.piece]: "data:image/webp;base64,UklGRg==",
	[ApiParams.pieceSize]: 44,
	[ApiParams.originX]: 1,
	[ApiParams.originY]: 2,
	[ApiParams.timestamp]: "1753900000000",
	[ApiParams.signature]: {
		[ApiParams.provider]: { [ApiParams.challenge]: "0xproviderchallengesig" },
	},
};

const clientMetaData: ClientMetaData = {
	widgetHeight: 1,
	widgetWidth: 2,
} as unknown as ClientMetaData;

const body = (): Record<string, unknown> =>
	fetchStub.last().body as Record<string, unknown>;

beforeEach(() => {
	fetchStub = stubFetch();
	vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
	fetchStub.restore();
	vi.restoreAllMocks();
});

describe("identifying headers", () => {
	test("every client call names the site key, so the provider can scope it", async () => {
		await api().getCaptchaChallenge(USER, randomProvider);
		expect(fetchStub.last().headers["Prosopo-Site-Key"]).toBe(SITE_KEY);
		expect(fetchStub.last().headers["Prosopo-User"]).toBe(USER);
	});

	test("calls with no user still carry the site key", async () => {
		await api().submitUserEvents(
			{ events: [] } as unknown as StoredEvents,
			"s",
		);
		expect(fetchStub.last().headers["Prosopo-Site-Key"]).toBe(SITE_KEY);
		expect(fetchStub.last().headers["Prosopo-User"]).toBeUndefined();
	});
});

describe("getCaptchaChallenge", () => {
	test("posts the site key and user to the image challenge path", async () => {
		await api().getCaptchaChallenge(USER, randomProvider);
		expect(fetchStub.last().url).toBe(
			`${BASE_URL}${ClientApiPaths.GetImageCaptchaChallenge}`,
		);
		expect(body()).toEqual({
			[ApiParams.dapp]: SITE_KEY,
			[ApiParams.user]: USER,
		});
	});

	test("omits the optional fields when they are absent", async () => {
		await api().getCaptchaChallenge(USER, randomProvider, undefined, undefined);
		expect(body()[ApiParams.sessionId]).toBeUndefined();
		expect(body()[ApiParams.simdReadings]).toBeUndefined();
	});

	test("includes the session id and simd readings when given", async () => {
		await api().getCaptchaChallenge(
			USER,
			randomProvider,
			"session",
			"readings",
		);
		expect(body()[ApiParams.sessionId]).toBe("session");
		expect(body()[ApiParams.simdReadings]).toBe("readings");
	});

	test("an empty session id is treated as absent", async () => {
		// Empty strings come from callers that always pass the field; they carry
		// no server-side session, so they must not be sent or deduped on.
		await api().getCaptchaChallenge(USER, randomProvider, "", "");
		expect(body()[ApiParams.sessionId]).toBeUndefined();
		expect(body()[ApiParams.simdReadings]).toBeUndefined();
	});

	test("returns the provider's body", async () => {
		fetchStub.respond({ captchas: [] });
		await expect(
			api().getCaptchaChallenge(USER, randomProvider),
		).resolves.toEqual({ captchas: [] });
	});

	test("propagates a transport failure", async () => {
		fetchStub.fail(new Error("offline"));
		await expect(
			api().getCaptchaChallenge(USER, randomProvider),
		).rejects.toThrow("offline");
	});
});

describe("in-flight de-duplication of challenge fetches", () => {
	test("a second call with the same session id joins the first request", async () => {
		const deferred = fetchStub.defer();
		const client = api();
		const first = client.getPowCaptchaChallenge(USER, SITE_KEY, "session");
		const second = client.getPowCaptchaChallenge(USER, SITE_KEY, "session");
		expect(fetchStub.requests).toHaveLength(1);
		deferred.resolve(powChallenge);
		expect(await first).toEqual(await second);
	});

	test("different session ids are separate requests", async () => {
		const client = api();
		await Promise.all([
			client.getPowCaptchaChallenge(USER, SITE_KEY, "a"),
			client.getPowCaptchaChallenge(USER, SITE_KEY, "b"),
		]);
		expect(fetchStub.requests).toHaveLength(2);
	});

	test("the same session id on a different path is a separate request", async () => {
		const client = api();
		await Promise.all([
			client.getPowCaptchaChallenge(USER, SITE_KEY, "session"),
			client.getPuzzleCaptchaChallenge(USER, SITE_KEY, "session"),
		]);
		expect(fetchStub.requests).toHaveLength(2);
	});

	test("calls without a session id are never deduped", async () => {
		const client = api();
		await Promise.all([
			client.getPowCaptchaChallenge(USER, SITE_KEY),
			client.getPowCaptchaChallenge(USER, SITE_KEY),
		]);
		expect(fetchStub.requests).toHaveLength(2);
	});

	test("a retry after the first call settles starts a fresh request", async () => {
		// Only in-flight calls share; caching a settled result would mask a
		// genuine retry after a network error.
		const client = api();
		await client.getPowCaptchaChallenge(USER, SITE_KEY, "session");
		await client.getPowCaptchaChallenge(USER, SITE_KEY, "session");
		expect(fetchStub.requests).toHaveLength(2);
	});

	test("a failed call is dropped from the in-flight map, so a retry can proceed", async () => {
		const client = api();
		fetchStub.fail(new Error("offline"));
		await expect(
			client.getPowCaptchaChallenge(USER, SITE_KEY, "session"),
		).rejects.toThrow("offline");
		fetchStub.respond(powChallenge);
		await expect(
			client.getPowCaptchaChallenge(USER, SITE_KEY, "session"),
		).resolves.toEqual(powChallenge);
		expect(fetchStub.requests).toHaveLength(2);
	});

	test("both joined callers see the same failure", async () => {
		const deferred = fetchStub.defer();
		const client = api();
		const first = client.getPowCaptchaChallenge(USER, SITE_KEY, "session");
		const second = client.getPowCaptchaChallenge(USER, SITE_KEY, "session");
		deferred.reject(new Error("offline"));
		await expect(first).rejects.toThrow("offline");
		await expect(second).rejects.toThrow("offline");
	});

	test("two clients do not share an in-flight map", async () => {
		// The map is per-instance; separate widgets talking to the same
		// provider are separate sessions from the map's point of view.
		const first = api().getPowCaptchaChallenge(USER, SITE_KEY, "session");
		const second = api().getPowCaptchaChallenge(USER, SITE_KEY, "session");
		expect(fetchStub.requests).toHaveLength(2);
		await Promise.all([first, second]);
	});

	test("image challenges dedupe on their own path too", async () => {
		fetchStub.defer();
		const client = api();
		void client.getCaptchaChallenge(USER, randomProvider, "session");
		void client.getCaptchaChallenge(USER, randomProvider, "session");
		expect(fetchStub.requests).toHaveLength(1);
	});
});

describe("submitCaptchaSolution", () => {
	const submit = (
		behavioralData?: string,
		simdReadings?: string,
		meta?: ClientMetaData,
	) =>
		api().submitCaptchaSolution(
			[],
			"0xrequesthash",
			USER,
			"1753900000000",
			"0xproviderhashsig",
			"0xusertimestampsig",
			behavioralData,
			simdReadings,
			meta,
		);

	test("posts the solution with both signatures", async () => {
		await submit();
		expect(fetchStub.last().url).toBe(
			`${BASE_URL}${ClientApiPaths.SubmitImageCaptchaSolution}`,
		);
		expect(body()).toEqual({
			[ApiParams.user]: USER,
			[ApiParams.dapp]: SITE_KEY,
			[ApiParams.captchas]: [],
			[ApiParams.requestHash]: "0xrequesthash",
			[ApiParams.timestamp]: "1753900000000",
			[ApiParams.signature]: {
				[ApiParams.user]: { [ApiParams.timestamp]: "0xusertimestampsig" },
				[ApiParams.provider]: { [ApiParams.requestHash]: "0xproviderhashsig" },
			},
		});
	});

	test("an empty solution list is still submitted, not short-circuited", async () => {
		await submit();
		expect(body()[ApiParams.captchas]).toEqual([]);
	});

	test("attaches the optional telemetry when present", async () => {
		await submit("behaviour", "readings", clientMetaData);
		expect(body()[ApiParams.behavioralData]).toBe("behaviour");
		expect(body()[ApiParams.simdReadings]).toBe("readings");
		expect(body()[ApiParams.clientMetaData]).toEqual(clientMetaData);
	});

	test("empty telemetry strings are omitted rather than sent blank", async () => {
		await submit("", "");
		expect(ApiParams.behavioralData in body()).toBe(false);
		expect(ApiParams.simdReadings in body()).toBe(false);
	});
});

describe("verifyDappUser", () => {
	test("posts the token, signature and ip", async () => {
		await api().verifyDappUser("token", "0xsig", USER, undefined, "1.2.3.4");
		expect(fetchStub.last().url).toBe(
			`${BASE_URL}${ClientApiPaths.VerifyImageCaptchaSolutionDapp}`,
		);
		expect(body()).toEqual({
			[ApiParams.token]: "token",
			[ApiParams.dappSignature]: "0xsig",
			[ApiParams.ip]: "1.2.3.4",
		});
	});

	test("includes maxVerifiedTime and email when given", async () => {
		await api().verifyDappUser(
			"token",
			"0xsig",
			USER,
			60_000,
			"1.2.3.4",
			"user@example.com",
		);
		expect(body()[ApiParams.maxVerifiedTime]).toBe(60_000);
		expect(body()[ApiParams.email]).toBe("user@example.com");
	});

	test("a zero maxVerifiedTime is dropped, so the provider applies its default", async () => {
		await api().verifyDappUser("token", "0xsig", USER, 0);
		expect(ApiParams.maxVerifiedTime in body()).toBe(false);
	});

	test("an omitted ip is sent as undefined rather than a placeholder", async () => {
		await api().verifyDappUser("token", "0xsig", USER);
		expect(ApiParams.ip in body()).toBe(false);
	});
});

describe("pow challenge and solution", () => {
	test("requests a challenge for the user and site key", async () => {
		await api().getPowCaptchaChallenge(USER, SITE_KEY);
		expect(fetchStub.last().url).toBe(
			`${BASE_URL}${ClientApiPaths.GetPowCaptchaChallenge}`,
		);
		expect(body()).toEqual({
			[ApiParams.user]: USER,
			[ApiParams.dapp]: SITE_KEY,
		});
	});

	test("submits the nonce with the provider's challenge signature", async () => {
		await api().submitPowCaptchaSolution(
			powChallenge,
			USER,
			SITE_KEY,
			42,
			"0xusertimestampsig",
		);
		expect(fetchStub.last().url).toBe(
			`${BASE_URL}${ClientApiPaths.SubmitPowCaptchaSolution}`,
		);
		expect(body()).toMatchObject({
			[ApiParams.challenge]: CHALLENGE,
			[ApiParams.difficulty]: 4,
			[ApiParams.nonce]: 42,
			[ApiParams.user]: USER,
			[ApiParams.dapp]: SITE_KEY,
			[ApiParams.signature]: {
				[ApiParams.provider]: {
					[ApiParams.challenge]: "0xproviderchallengesig",
				},
				[ApiParams.user]: { [ApiParams.timestamp]: "0xusertimestampsig" },
			},
		});
	});

	test("passes simd readings on the challenge request when present", async () => {
		await api().getPowCaptchaChallenge(USER, SITE_KEY, undefined, "readings");
		expect(body()[ApiParams.simdReadings]).toBe("readings");
	});

	test("a nonce of zero is submitted, not treated as missing", async () => {
		await api().submitPowCaptchaSolution(powChallenge, USER, SITE_KEY, 0, "s");
		expect(body()[ApiParams.nonce]).toBe(0);
	});

	test("attaches the optional proof fields when present", async () => {
		await api().submitPowCaptchaSolution(
			powChallenge,
			USER,
			SITE_KEY,
			1,
			"s",
			"behaviour",
			"salt",
			"readings",
			clientMetaData,
			"proof",
		);
		expect(body()).toMatchObject({
			[ApiParams.behavioralData]: "behaviour",
			[ApiParams.salt]: "salt",
			[ApiParams.simdReadings]: "readings",
			[ApiParams.fingerprintProof]: "proof",
		});
	});

	test("the schema strips anything it does not declare", async () => {
		// The body is parsed before sending, so a field the provider's schema
		// does not accept never reaches the wire.
		await api().submitPowCaptchaSolution(powChallenge, USER, SITE_KEY, 1, "s");
		expect(ApiParams.timestamp in body()).toBe(false);
	});

	test("a malformed challenge is rejected before any request is made", async () => {
		const bad: GetPowCaptchaResponse = {
			...powChallenge,
			[ApiParams.challenge]:
				"not-a-challenge" as GetPowCaptchaResponse["challenge"],
		};
		expect(() =>
			api().submitPowCaptchaSolution(bad, USER, SITE_KEY, 1, "s"),
		).toThrow();
		expect(fetchStub.requests).toHaveLength(0);
	});
});

describe("puzzle challenge and solution", () => {
	test("requests a puzzle challenge", async () => {
		await api().getPuzzleCaptchaChallenge(
			USER,
			SITE_KEY,
			"session",
			"readings",
		);
		expect(fetchStub.last().url).toBe(
			`${BASE_URL}${ClientApiPaths.GetPuzzleCaptchaChallenge}`,
		);
		expect(body()).toEqual({
			[ApiParams.user]: USER,
			[ApiParams.dapp]: SITE_KEY,
			[ApiParams.sessionId]: "session",
			[ApiParams.simdReadings]: "readings",
		});
	});

	test("submits the final position and the drag trail", async () => {
		await api().submitPuzzleCaptchaSolution(
			puzzleChallenge,
			USER,
			SITE_KEY,
			11,
			22,
			[{ x: 1, y: 2, t: 3 }],
			"0xusertimestampsig",
		);
		expect(fetchStub.last().url).toBe(
			`${BASE_URL}${ClientApiPaths.SubmitPuzzleCaptchaSolution}`,
		);
		expect(body()).toMatchObject({
			[ApiParams.finalX]: 11,
			[ApiParams.finalY]: 22,
			[ApiParams.puzzleEvents]: [{ x: 1, y: 2, t: 3 }],
		});
	});

	test("an empty event trail is submitted, and the provider decides", async () => {
		await api().submitPuzzleCaptchaSolution(
			puzzleChallenge,
			USER,
			SITE_KEY,
			0,
			0,
			[],
			"s",
		);
		expect(body()[ApiParams.puzzleEvents]).toEqual([]);
	});

	test("attaches the optional puzzle telemetry when present", async () => {
		await api().submitPuzzleCaptchaSolution(
			puzzleChallenge,
			USER,
			SITE_KEY,
			1,
			2,
			[],
			"s",
			"behaviour",
			"salt",
			"readings",
			clientMetaData,
		);
		expect(body()).toMatchObject({
			[ApiParams.behavioralData]: "behaviour",
			[ApiParams.salt]: "salt",
			[ApiParams.simdReadings]: "readings",
		});
		// The metadata schema strips anything it does not declare, so the
		// field is present but carries only the declared keys.
		expect(body()[ApiParams.clientMetaData]).toBeDefined();
	});

	test("verifies a puzzle token, with the email only when supplied", async () => {
		await api().submitPuzzleCaptchaVerify("token", "0xsig", USER, "1.2.3.4");
		expect(fetchStub.last().url).toBe(
			`${BASE_URL}${ClientApiPaths.VerifyPuzzleCaptchaSolution}`,
		);
		expect(ApiParams.email in body()).toBe(false);
		await api().submitPuzzleCaptchaVerify(
			"token",
			"0xsig",
			USER,
			"1.2.3.4",
			"user@example.com",
		);
		expect(body()[ApiParams.email]).toBe("user@example.com");
	});
});

describe("getFrictionlessCaptcha", () => {
	const frictionlessBody = { status: "ok", [ApiParams.captchaType]: "pow" };

	test("posts the token and head hash", async () => {
		fetchStub.respond(frictionlessBody);
		await api().getFrictionlessCaptcha("token", "0xhead", SITE_KEY, USER);
		expect(fetchStub.last().url).toBe(
			`${BASE_URL}${ClientApiPaths.GetFrictionlessCaptchaChallenge}`,
		);
		expect(body()).toEqual({
			[ApiParams.token]: "token",
			[ApiParams.headHash]: "0xhead",
			[ApiParams.dapp]: SITE_KEY,
			[ApiParams.user]: USER,
		});
	});

	test("includes the optional context when supplied", async () => {
		fetchStub.respond(frictionlessBody);
		await api().getFrictionlessCaptcha(
			"token",
			"0xhead",
			SITE_KEY,
			USER,
			ModeEnum.invisible,
			"readings",
			undefined, // detectorSessionId
			"https://site.example/page",
			"https://iframe.example",
		);
		expect(body()).toMatchObject({
			[ApiParams.mode]: ModeEnum.invisible,
			[ApiParams.simdReadings]: "readings",
			[ApiParams.currentUrl]: "https://site.example/page",
			[ApiParams.iframeUrl]: "https://iframe.example",
		});
	});

	test("moves the honeypot from the meta header onto the response", async () => {
		fetchStub.respond(frictionlessBody, {
			status: 200,
			headers: {
				"content-type": "application/json",
				"x-prosopo-meta": "encoded-honeypot",
			},
		});
		const response = await api().getFrictionlessCaptcha(
			"token",
			"0xhead",
			SITE_KEY,
			USER,
		);
		expect(response[ApiParams.hp]).toBe("encoded-honeypot");
	});

	test("leaves the body untouched when there is no meta header", async () => {
		fetchStub.respond(frictionlessBody);
		const response = await api().getFrictionlessCaptcha(
			"token",
			"0xhead",
			SITE_KEY,
			USER,
		);
		expect(ApiParams.hp in response).toBe(false);
	});

	test("an empty meta header is treated as absent", async () => {
		fetchStub.respond(frictionlessBody, {
			status: 200,
			headers: { "content-type": "application/json", "x-prosopo-meta": "" },
		});
		const response = await api().getFrictionlessCaptcha(
			"token",
			"0xhead",
			SITE_KEY,
			USER,
		);
		expect(response[ApiParams.hp]).toBeUndefined();
	});

	test("is not deduped: a frictionless call always reaches the provider", async () => {
		// It carries no sessionId — the session is what it hands back.
		const client = api();
		fetchStub.respond(frictionlessBody);
		await Promise.all([
			client.getFrictionlessCaptcha("token", "0xhead", SITE_KEY, USER),
			client.getFrictionlessCaptcha("token", "0xhead", SITE_KEY, USER),
		]);
		expect(fetchStub.requests).toHaveLength(2);
	});

	test("propagates a transport failure", async () => {
		fetchStub.respond("nope", { status: 500, headers: {} });
		await expect(
			api().getFrictionlessCaptcha("token", "0xhead", SITE_KEY, USER),
		).rejects.toBeInstanceOf(HttpError);
	});
});

describe("status and details", () => {
	test("reads the provider status", async () => {
		fetchStub.respond({ status: "ok" });
		await api().getProviderStatus();
		expect(fetchStub.last().url).toBe(
			`${BASE_URL}${ClientApiPaths.GetProviderStatus}`,
		);
		expect(fetchStub.last().init?.method).toBeUndefined();
	});

	test("reads the public provider details", async () => {
		await api().getProviderDetails();
		expect(fetchStub.last().url).toBe(
			`${BASE_URL}${PublicApiPaths.GetProviderDetails}`,
		);
	});

	test("submits user events", async () => {
		const events = { events: [] } as unknown as StoredEvents;
		await api().submitUserEvents(events, "0xstring");
		expect(fetchStub.last().url).toBe(
			`${BASE_URL}${ClientApiPaths.SubmitUserEvents}`,
		);
		expect(body()).toEqual({ events, string: "0xstring" });
	});
});

describe("forwardVerify", () => {
	test("marks the request as forwarded so the receiver does not forward again", async () => {
		await api().forwardVerify(
			ClientApiPaths.VerifyPowCaptchaSolution,
			{ [ApiParams.token]: "token" },
			USER,
		);
		expect(fetchStub.last().url).toBe(
			`${BASE_URL}${ClientApiPaths.VerifyPowCaptchaSolution}`,
		);
		expect(fetchStub.last().headers[VERIFY_FORWARDED_HEADER]).toBe("true");
	});

	test("the marker header is lowercase, to match express's normalised keys", () => {
		expect(VERIFY_FORWARDED_HEADER).toBe(VERIFY_FORWARDED_HEADER.toLowerCase());
	});

	test("forwards the body verbatim", async () => {
		const forwarded = { [ApiParams.token]: "token", extra: "kept" };
		await api().forwardVerify(
			ClientApiPaths.VerifyImageCaptchaSolutionDapp,
			forwarded,
			USER,
		);
		expect(body()).toEqual(forwarded);
	});
});

describe("submitPowCaptchaVerify", () => {
	test("posts the token and signature", async () => {
		await api().submitPowCaptchaVerify("token", "0xsig", USER, "1.2.3.4");
		expect(fetchStub.last().url).toBe(
			`${BASE_URL}${ClientApiPaths.VerifyPowCaptchaSolution}`,
		);
		expect(body()).toEqual({
			[ApiParams.token]: "token",
			[ApiParams.dappSignature]: "0xsig",
			[ApiParams.ip]: "1.2.3.4",
		});
	});

	test("adds the email only when one is supplied", async () => {
		await api().submitPowCaptchaVerify("token", "0xsig", USER);
		expect(ApiParams.email in body()).toBe(false);
		await api().submitPowCaptchaVerify(
			"token",
			"0xsig",
			USER,
			undefined,
			"user@example.com",
		);
		expect(body()[ApiParams.email]).toBe("user@example.com");
	});
});

describe("the admin endpoints", () => {
	const JWT = "jwt-token";
	const settings: IUserSettings = {
		captchaType: CaptchaType.pow,
		domains: ["example.com"],
		frictionlessThreshold: 0.5,
		powDifficulty: 4,
	} as unknown as IUserSettings;

	const auth = (): Record<string, string> => fetchStub.last().headers;

	test("every admin call is bearer-authorised and site-key scoped", async () => {
		await api().registerSiteKey(SITE_KEY, Tier.Free, settings, JWT);
		expect(auth().Authorization).toBe(`Bearer ${JWT}`);
		expect(auth()["Prosopo-Site-Key"]).toBe(SITE_KEY);
	});

	test("registers one site key", async () => {
		await api().registerSiteKey(SITE_KEY, Tier.Free, settings, JWT);
		expect(fetchStub.last().url).toBe(
			`${BASE_URL}${AdminApiPaths.SiteKeyRegister}`,
		);
		expect(body()).toEqual({ siteKey: SITE_KEY, tier: Tier.Free, settings });
	});

	test("registers a batch of site keys verbatim", async () => {
		const batch = [{ siteKey: SITE_KEY, tier: Tier.Free, settings }];
		await api().registerSiteKeys(batch, JWT);
		expect(fetchStub.last().url).toBe(
			`${BASE_URL}${AdminApiPaths.SiteKeysRegister}`,
		);
		expect(body()).toEqual(batch);
	});

	test("removes one site key", async () => {
		await api().removeSiteKey(SITE_KEY, JWT);
		expect(fetchStub.last().url).toBe(
			`${BASE_URL}${AdminApiPaths.SiteKeyRemove}`,
		);
		expect(body()).toEqual({ siteKey: SITE_KEY });
	});

	test("removes a batch of site keys", async () => {
		await api().removeSiteKeys([{ siteKey: SITE_KEY }], JWT);
		expect(fetchStub.last().url).toBe(
			`${BASE_URL}${AdminApiPaths.SiteKeysRemove}`,
		);
		expect(body()).toEqual([{ siteKey: SITE_KEY }]);
	});

	test("an invalid removal batch never leaves the client", async () => {
		expect(() =>
			api().removeSiteKeys(
				[{ siteKey: 1 }] as unknown as RemoveSitekeysBodyTypeOutput,
				JWT,
			),
		).toThrow();
		expect(fetchStub.requests).toHaveLength(0);
	});

	test("updates a decision machine with its full descriptor", async () => {
		await api().updateDecisionMachine(
			DecisionMachineScope.Dapp,
			DecisionMachineRuntime.Node,
			"export default () => true",
			JWT,
			SITE_KEY,
			DecisionMachineLanguage.JavaScript,
			"machine",
			"1.0.0",
			CaptchaType.pow,
			DecisionMachineKind.Decision,
		);
		expect(fetchStub.last().url).toBe(
			`${BASE_URL}${AdminApiPaths.UpdateDecisionMachine}`,
		);
		expect(body()).toMatchObject({
			[ApiParams.decisionMachineScope]: DecisionMachineScope.Dapp,
			[ApiParams.decisionMachineRuntime]: DecisionMachineRuntime.Node,
			[ApiParams.decisionMachineSource]: "export default () => true",
			[ApiParams.dapp]: SITE_KEY,
		});
	});

	test("reads all decision machines with an empty body", async () => {
		await api().getAllDecisionMachines(JWT);
		expect(fetchStub.last().url).toBe(
			`${BASE_URL}${AdminApiPaths.GetAllDecisionMachines}`,
		);
		expect(body()).toEqual({});
	});

	test("reads one decision machine by id", async () => {
		await api().getDecisionMachine("machine-id", JWT);
		expect(fetchStub.last().url).toBe(
			`${BASE_URL}${AdminApiPaths.GetDecisionMachine}`,
		);
		expect(body()).toEqual({ id: "machine-id" });
	});

	test("removes one decision machine by id", async () => {
		await api().removeDecisionMachine("machine-id", JWT);
		expect(fetchStub.last().url).toBe(
			`${BASE_URL}${AdminApiPaths.RemoveDecisionMachine}`,
		);
		expect(body()).toEqual({ id: "machine-id" });
	});

	test("removes all decision machines", async () => {
		await api().removeAllDecisionMachines(JWT);
		expect(fetchStub.last().url).toBe(
			`${BASE_URL}${AdminApiPaths.RemoveAllDecisionMachines}`,
		);
		expect(body()).toEqual({});
	});

	test("clears counters, optionally for a single site key", async () => {
		await api().clearAllCounters(JWT);
		expect(fetchStub.last().url).toBe(
			`${BASE_URL}${AdminApiPaths.ClearAllCounters}`,
		);
		await api().clearAllCounters(JWT, SITE_KEY);
		expect(body()).toMatchObject({ [ApiParams.dapp]: SITE_KEY });
	});

	test("toggles maintenance mode with a signed timestamp instead of a JWT", async () => {
		await api().toggleMaintenanceMode(true, "1753900000000", "0xsig");
		expect(fetchStub.last().url).toBe(
			`${BASE_URL}${AdminApiPaths.ToggleMaintenanceMode}`,
		);
		expect(body()).toEqual({ enabled: true });
		expect(fetchStub.last().headers.timestamp).toBe("1753900000000");
		expect(fetchStub.last().headers.signature).toBe("0xsig");
		expect(fetchStub.last().headers.Authorization).toBeUndefined();
	});

	test("disabling maintenance mode is sent as false, not omitted", async () => {
		await api().toggleMaintenanceMode(false, "1753900000000", "0xsig");
		expect(body()).toEqual({ enabled: false });
	});

	test("an admin failure surfaces as an HttpError", async () => {
		fetchStub.respond("forbidden", { status: 403, headers: {} });
		await expect(api().getAllDecisionMachines(JWT)).rejects.toBeInstanceOf(
			HttpError,
		);
	});
});
