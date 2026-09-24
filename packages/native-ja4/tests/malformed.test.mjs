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

import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { describe, it } from "node:test";

const { calculateJa4 } = createRequire(import.meta.url)("../index.js");

const buildClientHello = (extensionsBlock) => {
	const body = Buffer.concat([
		Buffer.from([0x03, 0x03]), // client_version
		Buffer.alloc(32, 0xaa), // random
		Buffer.from([0]), // session id
		Buffer.from([0x00, 0x02, 0x13, 0x01]), // one cipher suite
		Buffer.from([1, 0]), // compression methods
		Buffer.from([extensionsBlock.length >> 8, extensionsBlock.length & 0xff]),
		extensionsBlock,
	]);
	const handshake = Buffer.concat([
		Buffer.from([0x01, 0, body.length >> 8, body.length & 0xff]),
		body,
	]);
	return Buffer.concat([
		Buffer.from([
			0x16,
			0x03,
			0x01,
			handshake.length >> 8,
			handshake.length & 0xff,
		]),
		handshake,
	]);
};

describe("calculateJa4 on malformed ClientHellos", () => {
	it("computes a fingerprint for a well-formed hello", () => {
		const hello = buildClientHello(
			Buffer.from([0x00, 0x0a, 0x00, 0x04, 0x00, 0x02, 0x00, 0x1d]),
		);
		assert.match(calculateJa4(hello), /^t12i01/);
	});

	// Each of these panicked inside prosopo-ja4 and aborted the process.
	const cases = {
		"extension length past the end of the block": Buffer.from([
			0x00, 0x0a, 0xff, 0xff, 0x00, 0x1d,
		]),
		"extension header truncated to one byte": Buffer.from([0x00]),
		"extension header truncated to three bytes": Buffer.from([
			0x00, 0x0a, 0x00,
		]),
	};
	for (const [name, block] of Object.entries(cases)) {
		it(`throws rather than aborting: ${name}`, () => {
			assert.throws(() => calculateJa4(buildClientHello(block)));
		});
	}
});
