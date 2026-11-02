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

// RFC 9421 §2.5 signature base construction — the string that was signed.
// Only the components Web Bot Auth signers cover are implemented: OpenAI
// signs @authority, @method and signature-agent; Google signs @target-uri,
// @method and signature-agent;key="g". Anything else throws, which the
// verifier reports as a bad signature.

import {
	type CoveredComponent,
	getDictionaryMember,
} from "./structuredFields.js";

export type SignatureBaseInput = {
	// RFC 9421 §2.2.3: host and optional port, lowercased.
	authority: string;
	method: string;
	// The full request URI the signer targeted, verbatim.
	targetUri: string;
	path: string;
	// Verbatim `Signature-Agent` header, quotes intact.
	signatureAgent: string;
};

const signatureAgentValue = (
	component: CoveredComponent,
	header: string,
): string => {
	const key = component.params.key;
	if (key === undefined) return header;
	if (typeof key !== "string") {
		throw new Error(`invalid key parameter on "${component.name}"`);
	}
	const member = getDictionaryMember(header, key);
	if (member === null) {
		throw new Error(`"${component.name}" has no member "${key}"`);
	}
	return member;
};

const componentValue = (
	component: CoveredComponent,
	values: SignatureBaseInput,
): string => {
	switch (component.name) {
		case "@authority":
			return values.authority;
		case "@method":
			return values.method;
		case "@target-uri":
			return values.targetUri;
		case "@path":
			return values.path;
		case "signature-agent":
			return signatureAgentValue(component, values.signatureAgent);
		default:
			throw new Error(
				`unsupported covered component "${component.name}" for Web Bot Auth`,
			);
	}
};

export const buildSignatureBase = (
	coveredComponents: CoveredComponent[],
	values: SignatureBaseInput,
	signatureParamsSerialised: string,
): string =>
	[
		...coveredComponents.map(
			(component) =>
				`${component.identifier}: ${componentValue(component, values)}`,
		),
		`"@signature-params": ${signatureParamsSerialised}`,
	].join("\n");
