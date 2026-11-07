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

/**
 * Buffer.from(text, "base64" | "base64url" | "hex") skips or stops at invalid
 * characters, so corrupt input quietly decodes to the wrong bytes. These check
 * the whole input first and return a Result. Node only, as they return Buffer.
 */

import { type Result, err, ok } from "@prosopo/result";

export type DecodeEncoding = "base64" | "base64url" | "hex";

export class DecodeError extends Error {
	readonly encoding: DecodeEncoding;

	constructor(encoding: DecodeEncoding) {
		// The input is left out as it is often a key or token.
		super(`input is not valid ${encoding}`);
		this.name = "DecodeError";
		this.encoding = encoding;
	}
}

export type DecodeResult = Result<Buffer, DecodeError>;

const BASE64 = /^[A-Za-z0-9+/]*={0,2}$/;
const BASE64URL = /^[A-Za-z0-9_-]*={0,2}$/;
const HEX = /^(?:[0-9a-fA-F]{2})*$/;

/** Padding is optional, but what is there must be the right amount. */
const hasValidBase64Length = (input: string): boolean => {
	const data = input.replace(/=+$/, "");
	if (data.length % 4 === 1) {
		return false;
	}
	return data.length === input.length || input.length % 4 === 0;
};

const decodeBase64Like = (
	input: string,
	encoding: "base64" | "base64url",
	alphabet: RegExp,
): DecodeResult =>
	alphabet.test(input) && hasValidBase64Length(input)
		? ok(Buffer.from(input, encoding))
		: err(new DecodeError(encoding));

export const decodeBase64 = (input: string): DecodeResult =>
	decodeBase64Like(input, "base64", BASE64);

export const decodeBase64Url = (input: string): DecodeResult =>
	decodeBase64Like(input, "base64url", BASE64URL);

export const decodeHex = (input: string): DecodeResult =>
	HEX.test(input) ? ok(Buffer.from(input, "hex")) : err(new DecodeError("hex"));
