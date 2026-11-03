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
import {
	type SignatureBaseInput,
	buildSignatureBase,
} from "../signatureBase.js";
import { parseSignatureInput } from "../structuredFields.js";

const coveredBy = (params: string) =>
	parseSignatureInput(`sig1=${params}`)?.coveredComponents ?? [];

const VALUES: SignatureBaseInput = {
	authority: "example.com",
	method: "POST",
	targetUri: "https://example.com/v1/thing",
	path: "/v1/thing",
	signatureAgent: '"https://chatgpt.com"',
};

describe("buildSignatureBase", () => {
	it("builds the RFC 9421 base for @authority + signature-agent", () => {
		const params =
			'("@authority" "signature-agent");created=1735689600;expires=1735693200;keyid="abc";alg="ed25519";tag="web-bot-auth"';
		expect(buildSignatureBase(coveredBy(params), VALUES, params)).toBe(
			[
				'"@authority": example.com',
				'"signature-agent": "https://chatgpt.com"',
				`"@signature-params": ${params}`,
			].join("\n"),
		);
	});

	it("includes @method, @target-uri and @path", () => {
		const params = '("@target-uri" "@method" "@path");keyid="k"';
		expect(buildSignatureBase(coveredBy(params), VALUES, params)).toBe(
			[
				'"@target-uri": https://example.com/v1/thing',
				'"@method": POST',
				'"@path": /v1/thing',
				`"@signature-params": ${params}`,
			].join("\n"),
		);
	});

	it("preserves the covered-component order the signer chose", () => {
		const params = '("signature-agent" "@authority");keyid="k"';
		const base = buildSignatureBase(
			coveredBy(params),
			{ ...VALUES, signatureAgent: 'g="https://agent.bot.goog"' },
			params,
		);
		expect(base.split("\n")[0]).toBe(
			'"signature-agent": g="https://agent.bot.goog"',
		);
	});

	it("covers only the keyed member of a dictionary signature-agent", () => {
		const params = '("signature-agent";key="g");keyid="k"';
		const base = buildSignatureBase(
			coveredBy(params),
			{
				...VALUES,
				signatureAgent: 'a="https://other.example", g="https://agent.bot.goog"',
			},
			params,
		);
		expect(base.split("\n")[0]).toBe(
			'"signature-agent";key="g": "https://agent.bot.goog"',
		);
	});

	it("throws when the keyed member is missing", () => {
		const params = '("signature-agent";key="x");keyid="k"';
		expect(() => buildSignatureBase(coveredBy(params), VALUES, params)).toThrow(
			/no member "x"/,
		);
	});

	it("throws on an unsupported covered component", () => {
		const params = '("@query");keyid="k"';
		expect(() => buildSignatureBase(coveredBy(params), VALUES, params)).toThrow(
			/unsupported covered component/,
		);
	});
});
