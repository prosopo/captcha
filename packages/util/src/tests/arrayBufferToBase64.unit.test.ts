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
import { describe, expect, test } from "vitest";
import { arrayBufferToBase64 } from "../arrayBufferToBase64.js";

const bufferOf = (bytes: number[]): ArrayBuffer => new Uint8Array(bytes).buffer;

describe("arrayBufferToBase64", () => {
	test("encodes ascii bytes", () => {
		expect(arrayBufferToBase64(bufferOf([0x66, 0x6f, 0x6f]))).toBe("Zm9v");
	});

	test("encodes an empty buffer", () => {
		expect(arrayBufferToBase64(new ArrayBuffer(0))).toBe("");
	});

	test("pads lengths that are not a multiple of three", () => {
		expect(arrayBufferToBase64(bufferOf([0x66]))).toBe("Zg==");
		expect(arrayBufferToBase64(bufferOf([0x66, 0x6f]))).toBe("Zm8=");
	});

	test("encodes bytes above the ascii range", () => {
		// btoa throws on code points > 0xff, so the per-byte masking matters for
		// the binary key material this helper is actually used on.
		expect(arrayBufferToBase64(bufferOf([0x00, 0x80, 0xff]))).toBe("AID/");
	});

	test("round-trips arbitrary binary data", () => {
		const bytes: number[] = Array.from({ length: 256 }, (_, i) => i);
		const decoded: string = atob(arrayBufferToBase64(bufferOf(bytes)));
		expect(Array.from(decoded, (c: string) => c.charCodeAt(0))).toEqual(bytes);
	});
});
