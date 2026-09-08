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

// Portable base64 / base64url decoders that work in Node 18+ and browsers
// without pulling a dep. Ed25519 JWK `x` fields ship base64url; the
// Signature header ships plain base64 wrapped in colons.

const padTo4 = (s: string): string => {
	const pad = (4 - (s.length % 4)) % 4;
	return s + "=".repeat(pad);
};

const binaryToBytes = (bin: string): Uint8Array => {
	const bytes = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
	return bytes;
};

export const decodeBase64 = (input: string): Uint8Array => {
	// `atob` throws on invalid characters; callers turn that into a
	// verification failure rather than a thrown error crossing the boundary.
	return binaryToBytes(atob(input));
};

export const decodeBase64Url = (input: string): Uint8Array => {
	const b64 = padTo4(input.replace(/-/g, "+").replace(/_/g, "/"));
	return binaryToBytes(atob(b64));
};
