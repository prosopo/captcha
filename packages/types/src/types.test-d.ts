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
import { assertType, describe, expectTypeOf, it } from "vitest";
import {
	INPUT_LIMITS,
	boundedString,
	safeLine,
	safeText,
} from "./api/sanitise.js";
import { CaptchaType } from "./client/captchaType/captchaType.js";
import type {
	ClientSettingsSchema,
	IHoneypotSettings,
	ITrafficFilter,
	IUserSettings,
} from "./client/settings.js";
import {
	type TestSiteKeyMode,
	getTestSiteKeyMode,
} from "./client/testSiteKeys.js";
import type { PoWChallengeId } from "./datasets/captcha.js";
import { type CounterSpec, encodeCounterKey } from "./decisionMachine/index.js";
import {
	type ProcaptchaOutput,
	decodeProcaptchaOutput,
	encodeProcaptchaOutput,
} from "./procaptcha/token.js";

describe("sanitise types", () => {
	it("takes an optional numeric limit and returns a zod string schema", () => {
		expectTypeOf(boundedString).toBeCallableWith();
		expectTypeOf(boundedString).toBeCallableWith(10);
		expectTypeOf(safeText).toBeCallableWith();
		expectTypeOf(safeLine).toBeCallableWith();
		expectTypeOf(boundedString(1).parse("a")).toEqualTypeOf<string>();
		expectTypeOf(safeText(1).parse("a")).toEqualTypeOf<string>();
		expectTypeOf(safeLine(1).parse("a")).toEqualTypeOf<string>();
	});

	it("rejects a non-numeric limit", () => {
		// @ts-expect-error the limit is a character count
		assertType(boundedString("10"));
	});

	it("exposes the limits as literal numbers, so they can be compared at type level", () => {
		expectTypeOf(INPUT_LIMITS.TEXT).toExtend<number>();
		expectTypeOf(INPUT_LIMITS.TEXT).not.toEqualTypeOf<number>();
	});
});

describe("test site key types", () => {
	it("returns the mode or null, forcing callers to handle a normal key", () => {
		expectTypeOf(
			getTestSiteKeyMode,
		).returns.toEqualTypeOf<TestSiteKeyMode | null>();
	});

	it("takes a string site key", () => {
		expectTypeOf(getTestSiteKeyMode).toBeCallableWith("a");
		// @ts-expect-error a site key is always a string
		assertType(getTestSiteKeyMode(1));
	});
});

describe("counter key types", () => {
	it("takes a dapp, a spec and a value, in that order", () => {
		const spec: CounterSpec = {
			kind: "served",
			captchaType: CaptchaType.pow,
			dimension: "ip",
			window: "1h",
		};
		expectTypeOf(encodeCounterKey).toBeCallableWith("dapp", spec, "value");
		expectTypeOf(encodeCounterKey).returns.toEqualTypeOf<string>();
	});

	it("rejects an unknown window", () => {
		assertType<CounterSpec>({
			kind: "served",
			captchaType: CaptchaType.pow,
			dimension: "ip",
			// @ts-expect-error only the declared windows exist
			window: "2h",
		});
	});

	it("rejects an unknown dimension", () => {
		assertType<CounterSpec>({
			kind: "served",
			captchaType: CaptchaType.pow,
			// @ts-expect-error only the declared dimensions exist
			dimension: "asn",
			window: "1h",
		});
	});
});

describe("token types", () => {
	it("round trips a ProcaptchaOutput", () => {
		expectTypeOf(encodeProcaptchaOutput).returns.toEqualTypeOf<string>();
		expectTypeOf(
			decodeProcaptchaOutput,
		).returns.toEqualTypeOf<ProcaptchaOutput>();
	});

	it("requires the account, timestamp and signature fields", () => {
		// @ts-expect-error the signature envelope is mandatory
		assertType<ProcaptchaOutput>({ dapp: "d", user: "u", timestamp: "1" });
	});

	it("types the nonce as a number and the timestamp as a string", () => {
		expectTypeOf<ProcaptchaOutput["nonce"]>().toEqualTypeOf<
			number | undefined
		>();
		expectTypeOf<ProcaptchaOutput["timestamp"]>().toEqualTypeOf<string>();
	});
});

describe("settings types", () => {
	it("derives IUserSettings from the schema", () => {
		expectTypeOf<IUserSettings>().toEqualTypeOf<
			ReturnType<typeof ClientSettingsSchema.parse>
		>();
	});

	it("makes the defaulted fields non-optional on output", () => {
		expectTypeOf<IUserSettings["captchaType"]>().toEqualTypeOf<CaptchaType>();
		expectTypeOf<IUserSettings["powDifficulty"]>().toEqualTypeOf<number>();
		expectTypeOf<IUserSettings["domains"]>().toEqualTypeOf<string[]>();
	});

	it("keeps the genuinely optional fields optional", () => {
		expectTypeOf<IUserSettings["autoBanScoreThreshold"]>().toEqualTypeOf<
			number | undefined
		>();
		expectTypeOf<IUserSettings["honeypot"]>().toEqualTypeOf<
			IHoneypotSettings | undefined
		>();
		expectTypeOf<IUserSettings["trafficFilter"]>().toEqualTypeOf<
			ITrafficFilter | undefined
		>();
	});
});

describe("pow challenge id type", () => {
	it("accepts a separator delimited id", () => {
		assertType<PoWChallengeId>("1700000000000___user___dapp");
	});

	it("rejects a string with no separators", () => {
		// @ts-expect-error the id is a template literal
		assertType<PoWChallengeId>("nope");
	});
});
