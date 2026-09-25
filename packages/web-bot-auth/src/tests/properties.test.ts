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

import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { decodeBase64, decodeBase64Url } from "../base64.js";
import { type JwksFetch, verifyWebBotAuth } from "../index.js";
import { parseSignatureAgentHeader } from "../parseSignatureAgent.js";
import { parseSignature, parseSignatureInput } from "../structuredFields.js";

const headerText = fc.oneof(
	fc.string(),
	fc.string({ unit: "binary" }),
	fc
		.array(fc.constantFrom('"', "=", ";", ",", "(", ")", " ", ":", "sig1", "a"))
		.map((parts) => parts.join("")),
);

const noJwks: JwksFetch = async () => {
	throw new Error("no network in tests");
};

describe("web-bot-auth parsers, arbitrary input", () => {
	it("parseSignatureAgentHeader never throws", () => {
		fc.assert(
			fc.property(
				fc.oneof(
					headerText,
					headerText.map((s) => `"https://${s}"`),
					headerText.map((s) => `sig1="http://${s}"`),
				),
				(raw) => {
					parseSignatureAgentHeader(raw);
				},
			),
		);
	});

	it("rejects a quoted agent url that is not a valid url", () => {
		expect(parseSignatureAgentHeader('"https://a b"')).toBeNull();
		expect(parseSignatureAgentHeader('sig1="https://[::1"')).toBeNull();
	});

	it("parseSignatureInput and parseSignature return null or a value, never throw", () => {
		fc.assert(
			fc.property(headerText, headerText, (input, label) => {
				parseSignatureInput(input);
				parseSignature(input, label);
			}),
		);
	});

	it("decodeBase64Url round-trips any bytes", () => {
		fc.assert(
			fc.property(fc.uint8Array(), (bytes) => {
				const url = Buffer.from(bytes)
					.toString("base64")
					.replace(/\+/g, "-")
					.replace(/\//g, "_")
					.replace(/=+$/, "");
				expect(decodeBase64Url(url)).toEqual(bytes);
				expect(decodeBase64(Buffer.from(bytes).toString("base64"))).toEqual(
					bytes,
				);
			}),
		);
	});

	it("verifyWebBotAuth resolves to a result for any headers", async () => {
		await fc.assert(
			fc.asyncProperty(
				fc.oneof(
					headerText,
					headerText.map((s) => `"https://${s}"`),
				),
				headerText,
				headerText,
				fc.string(),
				async (agent, input, signature, url) => {
					const result = await verifyWebBotAuth(
						{
							method: "GET",
							url,
							headers: {
								"signature-agent": agent,
								"signature-input": input,
								signature,
							},
						},
						{ fetch: noJwks },
					);
					expect(result.verified).toBe(false);
				},
			),
		);
	});
});
