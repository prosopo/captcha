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

import { u8aToHex } from "@prosopo/util";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { CaptchaType } from "../client/captchaType/captchaType.js";
import {
	IpAddressType,
	parseMongooseCompositeIpAddress,
} from "../provider/database.js";
import {
	type ProcaptchaOutput,
	ProcaptchaTokenCodecV1,
	decodeProcaptchaOutput,
	encodeProcaptchaOutput,
} from "./token.js";

const text = fc.string({ unit: "grapheme" });
const nonEmpty = fc.string({ unit: "grapheme", minLength: 1 });

const output: fc.Arbitrary<ProcaptchaOutput> = fc.record(
	{
		commitmentId: text,
		providerUrl: text,
		dapp: text,
		user: text,
		challenge: text,
		nonce: fc.nat({ max: 2 ** 32 - 1 }),
		timestamp: text,
		signature: fc.record(
			{
				provider: fc.record(
					{ challenge: nonEmpty, requestHash: nonEmpty },
					{ requiredKeys: [] },
				),
				user: fc.record(
					{ timestamp: nonEmpty, requestHash: nonEmpty },
					{ requiredKeys: [] },
				),
			},
			{ requiredKeys: ["provider", "user"] },
		),
		captchaType: fc.constantFrom(...Object.values(CaptchaType)),
	},
	{ requiredKeys: ["dapp", "user", "timestamp", "signature"] },
);

const withoutUndefined = (value: unknown): unknown =>
	JSON.parse(JSON.stringify(value));

describe("procaptcha token", () => {
	it("decode inverts encode", () => {
		fc.assert(
			fc.property(output, (out) => {
				expect(
					withoutUndefined(decodeProcaptchaOutput(encodeProcaptchaOutput(out))),
				).toEqual(withoutUndefined(out));
			}),
		);
	});

	it("still decodes tokens minted with the v1 layout", () => {
		fc.assert(
			fc.property(output, (out) => {
				const { captchaType, ...v1 } = out;
				const token = u8aToHex(
					ProcaptchaTokenCodecV1.enc({
						commitmentId: v1.commitmentId,
						providerUrl: v1.providerUrl,
						dapp: v1.dapp,
						user: v1.user,
						challenge: v1.challenge,
						nonce: v1.nonce,
						timestamp: v1.timestamp,
						signature: {
							provider: {
								challenge: v1.signature.provider.challenge,
								requestHash: v1.signature.provider.requestHash,
							},
							user: {
								timestamp: v1.signature.user.timestamp,
								requestHash: v1.signature.user.requestHash,
							},
						},
					}),
				);
				expect(withoutUndefined(decodeProcaptchaOutput(token))).toEqual(
					withoutUndefined(v1),
				);
			}),
		);
	});

	it("rejects arbitrary bytes by throwing an Error, never by hanging", () => {
		fc.assert(
			fc.property(fc.uint8Array({ maxLength: 256 }), (bytes) => {
				try {
					decodeProcaptchaOutput(u8aToHex(bytes));
				} catch (e) {
					expect(e).toBeInstanceOf(Error);
				}
			}),
		);
	});
});

describe("parseMongooseCompositeIpAddress", () => {
	it("recovers the stored 128-bit halves", () => {
		fc.assert(
			fc.property(
				fc.bigInt({ min: 0n, max: 2n ** 64n - 1n }),
				fc.option(fc.bigInt({ min: 0n, max: 2n ** 64n - 1n }), {
					nil: undefined,
				}),
				(lower, upper) => {
					const parsed = parseMongooseCompositeIpAddress({
						lower: { $numberDecimal: lower.toString() },
						upper:
							upper === undefined
								? undefined
								: { $numberDecimal: upper.toString() },
						type: upper === undefined ? IpAddressType.v4 : IpAddressType.v6,
					});
					expect(parsed.lower).toBe(lower);
					expect(parsed.upper).toBe(upper);
				},
			),
		);
	});
});
