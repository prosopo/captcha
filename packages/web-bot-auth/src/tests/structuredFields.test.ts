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
import { parseSignature, parseSignatureInput } from "../structuredFields.js";

describe("parseSignatureInput", () => {
	it("parses a Web Bot Auth Signature-Input header", () => {
		const header =
			'sig1=("@authority" "signature-agent");created=1735689600;expires=1735693200;keyid="abc";alg="ed25519";tag="web-bot-auth"';
		const entry = parseSignatureInput(header);
		expect(entry).not.toBeNull();
		expect(entry?.label).toBe("sig1");
		expect(entry?.coveredComponents).toEqual([
			"@authority",
			"signature-agent",
		]);
		expect(entry?.params.created).toBe(1735689600);
		expect(entry?.params.expires).toBe(1735693200);
		expect(entry?.params.keyid).toBe("abc");
		expect(entry?.params.alg).toBe("ed25519");
		expect(entry?.params.tag).toBe("web-bot-auth");
		// serialisedValue keeps the "(...);..." substring verbatim so the
		// signature-base @signature-params line reproduces it exactly.
		expect(entry?.serialisedValue).toBe(
			'("@authority" "signature-agent");created=1735689600;expires=1735693200;keyid="abc";alg="ed25519";tag="web-bot-auth"',
		);
	});

	it("returns null on a header with no `=`", () => {
		expect(parseSignatureInput("garbage")).toBeNull();
	});

	it("returns null when the value isn't an inner list", () => {
		expect(parseSignatureInput('sig1="not-a-list"')).toBeNull();
	});

	it("tolerates unquoted alg tokens (RFC 8941 tokens)", () => {
		const header = 'sig1=("@authority");keyid="k";alg=ed25519';
		expect(parseSignatureInput(header)?.params.alg).toBe("ed25519");
	});

	it("handles an empty inner list", () => {
		expect(parseSignatureInput('sig1=();keyid="k"')?.coveredComponents).toEqual(
			[],
		);
	});
});

describe("parseSignature", () => {
	it("decodes the base64 byte-sequence for the matching label", () => {
		// 3 bytes: 0x01 0x02 0x03 → base64 "AQID"
		const bytes = parseSignature("sig1=:AQID:", "sig1");
		expect(bytes).toEqual(new Uint8Array([1, 2, 3]));
	});

	it("returns null when the label doesn't match", () => {
		expect(parseSignature("sig1=:AQID:", "sig2")).toBeNull();
	});

	it("returns null when the value isn't wrapped in colons", () => {
		expect(parseSignature('sig1="AQID"', "sig1")).toBeNull();
	});

	it("returns null on invalid base64", () => {
		expect(parseSignature("sig1=:not_valid_base64!!!:", "sig1")).toBeNull();
	});
});
