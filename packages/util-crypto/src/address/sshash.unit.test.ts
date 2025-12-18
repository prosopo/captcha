// Copyright 2021-2025 Prosopo (UK) Ltd.
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

import { describe, expect, expectTypeOf, it } from "vitest";
import { sshash } from "./sshash.js";

describe("sshash", (): void => {
	it("returns a Uint8Array", (): void => {
		const key = new Uint8Array([1, 2, 3, 4, 5]);
		const result = sshash(key);
		expect(result).toBeInstanceOf(Uint8Array);
	});

	it("returns a 64-byte (512-bit) hash", (): void => {
		const key = new Uint8Array([1, 2, 3, 4, 5]);
		const result = sshash(key);
		// blake2 512-bit hash = 64 bytes
		expect(result).toHaveLength(64);
	});

	it("returns different hashes for different keys", (): void => {
		const key1 = new Uint8Array([1, 2, 3, 4, 5]);
		const key2 = new Uint8Array([5, 4, 3, 2, 1]);
		const hash1 = sshash(key1);
		const hash2 = sshash(key2);
		expect(hash1).not.toEqual(hash2);
	});

	it("returns the same hash for the same key", (): void => {
		const key = new Uint8Array([1, 2, 3, 4, 5]);
		const hash1 = sshash(key);
		const hash2 = sshash(key);
		expect(hash1).toEqual(hash2);
	});

	it("works with empty key", (): void => {
		const key = new Uint8Array(0);
		const result = sshash(key);
		expect(result).toBeInstanceOf(Uint8Array);
		expect(result).toHaveLength(64);
	});

	it("works with 32-byte key", (): void => {
		const key = new Uint8Array(32).fill(0x42);
		const result = sshash(key);
		expect(result).toBeInstanceOf(Uint8Array);
		expect(result).toHaveLength(64);
	});

	it("works with large key", (): void => {
		const key = new Uint8Array(1000).fill(0xff);
		const result = sshash(key);
		expect(result).toBeInstanceOf(Uint8Array);
		expect(result).toHaveLength(64);
	});

	it("produces consistent output for sequential bytes", (): void => {
		const key = new Uint8Array(10);
		for (let i = 0; i < 10; i++) {
			key[i] = i;
		}
		const hash1 = sshash(key);
		const hash2 = sshash(key);
		expect(hash1).toEqual(hash2);
	});
});

describe("sshash types", (): void => {
	it("accepts Uint8Array parameter", (): void => {
		expectTypeOf(sshash).parameter(0).toEqualTypeOf<Uint8Array>();
	});

	it("returns Uint8Array", (): void => {
		const result = sshash(new Uint8Array([1, 2, 3]));
		expectTypeOf(result).toEqualTypeOf<Uint8Array>();
		expectTypeOf(result).not.toBeAny();
	});
});
