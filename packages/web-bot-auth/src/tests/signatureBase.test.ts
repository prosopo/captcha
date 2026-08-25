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
import { buildSignatureBase } from "../signatureBase.js";

describe("buildSignatureBase", () => {
	it("builds the RFC 9421 base for @authority + signature-agent", () => {
		const params =
			'("@authority" "signature-agent");created=1735689600;expires=1735693200;keyid="abc";alg="ed25519";tag="web-bot-auth"';
		const base = buildSignatureBase(
			["@authority", "signature-agent"],
			{
				authority: "example.com",
				signatureAgent: '"https://chatgpt.com"',
			},
			params,
		);
		expect(base).toBe(
			[
				'"@authority": example.com',
				'"signature-agent": "https://chatgpt.com"',
				`"@signature-params": ${params}`,
			].join("\n"),
		);
	});

	it("preserves the covered-component order the signer chose", () => {
		const params = '("signature-agent" "@authority");keyid="k"';
		const base = buildSignatureBase(
			["signature-agent", "@authority"],
			{
				authority: "example.com",
				signatureAgent: 'g="https://agent.bot.goog"',
			},
			params,
		);
		const first = base.split("\n")[0];
		expect(first).toBe(
			'"signature-agent": g="https://agent.bot.goog"',
		);
	});

	it("throws on an unsupported covered component", () => {
		expect(() =>
			buildSignatureBase(
				["@method"],
				{ authority: "example.com", signatureAgent: '""' },
				"()",
			),
		).toThrow(/unsupported covered component/);
	});
});
