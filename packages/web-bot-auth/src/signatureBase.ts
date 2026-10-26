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

// RFC 9421 §2.3 signature base construction — the string that was signed.
// Web Bot Auth pins the covered-components set to {@authority,
// signature-agent}; the general HTTP Message Signatures spec allows many
// more (@method, @path, @query, content-digest, etc.) but we only implement
// the ones the profile actually uses. Extend the switch when adding
// support for new components.

export type SignatureBaseInput = {
	// Value for `@authority` — RFC 9421 §2.2.4: the request authority
	// (host + optional port), lowercased.
	authority: string;
	// Verbatim `Signature-Agent` header string, quotes intact
	// (`"https://chatgpt.com"` or `g="https://agent.bot.goog"`).
	// The signer signed the header value; we sign what they signed.
	signatureAgent: string;
};

export const buildSignatureBase = (
	coveredComponents: string[],
	values: SignatureBaseInput,
	signatureParamsSerialised: string,
): string => {
	const lines: string[] = [];
	for (const component of coveredComponents) {
		switch (component) {
			case "@authority":
				lines.push(`"@authority": ${values.authority}`);
				break;
			case "signature-agent":
				lines.push(`"signature-agent": ${values.signatureAgent}`);
				break;
			default:
				throw new Error(
					`unsupported covered component "${component}" for Web Bot Auth`,
				);
		}
	}
	lines.push(`"@signature-params": ${signatureParamsSerialised}`);
	return lines.join("\n");
};
