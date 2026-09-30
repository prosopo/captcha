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
import { describe, expect, it } from "vitest";
import { ApiParams } from "../api/params.js";
import { InputMethod } from "../datasets/captcha.js";
import {
	CaptchaSolutionBody,
	type ProviderDetails,
	providerDetailsSchema,
} from "./api.js";

describe("providerDetailsSchema", () => {
	const redis: ProviderDetails["redis"] = [
		{ actor: "General", isReady: true, awaitingTimeSeconds: 0 },
	];

	it("accepts a host", () => {
		const parsed = providerDetailsSchema.parse({
			version: "1.0.0",
			message: "Provider online",
			host: "provider.example.com",
			redis,
		});

		expect(parsed.host).toBe("provider.example.com");
	});

	it("accepts a payload without a host, so a node that has not been upgraded still validates", () => {
		const parsed = providerDetailsSchema.parse({
			version: "1.0.0",
			message: "Provider online",
			redis,
		});

		expect(parsed.host).toBeUndefined();
	});

	it("rejects a non-string host", () => {
		const result = providerDetailsSchema.safeParse({
			version: "1.0.0",
			message: "Provider online",
			host: 1,
			redis,
		});

		expect(result.success).toBe(false);
	});
});

describe("CaptchaSolutionBody input methods", () => {
	const body = (inputMethods?: string[]) => ({
		[ApiParams.user]: "user",
		[ApiParams.dapp]: "dapp",
		[ApiParams.captchas]: [
			{
				captchaId: "id",
				captchaContentId: "cid",
				solution: ["0xa"],
				salt: "0x00",
				...(inputMethods && { inputMethods }),
			},
		],
		[ApiParams.requestHash]: "hash",
		[ApiParams.timestamp]: "1",
		[ApiParams.signature]: {
			[ApiParams.user]: { [ApiParams.timestamp]: "sig" },
			[ApiParams.provider]: { [ApiParams.requestHash]: "sig" },
		},
	});

	it("accepts a submission from a widget that does not send input methods", () => {
		expect(CaptchaSolutionBody.safeParse(body()).success).toBe(true);
	});

	it("keeps the input methods the widget sends", () => {
		const parsed = CaptchaSolutionBody.parse(
			body([InputMethod.pointer, InputMethod.keyboard]),
		);
		expect(parsed[ApiParams.captchas][0]?.inputMethods).toEqual([
			InputMethod.pointer,
			InputMethod.keyboard,
		]);
	});

	it("rejects an unknown input method", () => {
		expect(CaptchaSolutionBody.safeParse(body(["stylus"])).success).toBe(false);
	});

	it("bounds how many input methods one captcha may carry", () => {
		const tooMany: string[] = Array.from(
			{ length: 10_000 },
			() => InputMethod.pointer,
		);
		expect(CaptchaSolutionBody.safeParse(body(tooMany)).success).toBe(false);
	});
});
