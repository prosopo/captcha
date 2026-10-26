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

import { createHash } from "node:crypto";
// Micro-benchmark: native (Rust) vs JS calculateJa4.
// Run: node packages/native-ja4/bench.mjs
import { createRequire } from "node:module";
import { performance } from "node:perf_hooks";

const require = createRequire(import.meta.url);
const native = require("./index.js");

// Pure-JS reference implementation (copy of the pre-Rust ja4.ts core).
const RECORD_HEADER_LENGTH = 5;
const HANDSHAKE_HEADER_LENGTH = 4;
const HANDSHAKE_RECORD_TYPE = 0x16;
const HANDSHAKE_MESSAGE_TYPE = 0x01;
const EXT_SERVER_NAME = 0x0000;
const EXT_SIGNATURE_ALGORITHMS = 0x000d;
const EXT_ALPN = 0x0010;
const EXT_SUPPORTED_VERSIONS = 0x002b;

const isGrease = (id) => (id & 0x0f0f) === 0x0a0a && id >> 8 === (id & 0xff);
const hash12 = (input) =>
	createHash("sha256").update(input).digest("hex").slice(0, 12);
const formatIdList = (ids) =>
	ids.map((id) => id.toString(16).padStart(4, "0")).join(",");
function alpnChar(b) {
	if ((b >= 48 && b <= 57) || (b >= 65 && b <= 90) || (b >= 97 && b <= 122))
		return String.fromCharCode(b);
	return b.toString(16).padStart(2, "0");
}
function tlsVersionStr(v) {
	return { 769: "10", 770: "11", 771: "12", 772: "13" }[v] ?? "00";
}

function calculateJa4Js(data) {
	let offset = 0;
	if (data.length < RECORD_HEADER_LENGTH + HANDSHAKE_HEADER_LENGTH)
		throw new Error("too short");
	if (data.readUInt8(offset++) !== HANDSHAKE_RECORD_TYPE)
		throw new Error("bad record");
	offset += 2;
	const recordLen = data.readUInt16BE(offset);
	offset += 2;
	if (data.length < RECORD_HEADER_LENGTH + recordLen) throw new Error("len");
	data = data.subarray(0, RECORD_HEADER_LENGTH + recordLen);
	if (data.readUInt8(offset++) !== HANDSHAKE_MESSAGE_TYPE)
		throw new Error("hs");
	const msgLen = data.readUIntBE(offset, 3);
	offset += 3;
	data = data.subarray(0, offset + msgLen);
	let clientVersion = data.readUInt16BE(offset);
	offset += 2;
	offset += 32;
	const sessionIdLen = data.readUInt8(offset++);
	offset += sessionIdLen;
	const cipherSuitesLen = data.readUInt16BE(offset);
	offset += 2;
	const cipherSuites = [];
	for (let i = 0; i < cipherSuitesLen; i += 2)
		cipherSuites.push(data.readUInt16BE(offset + i));
	offset += cipherSuitesLen;
	const compressionLen = data.readUInt8(offset++);
	offset += compressionLen;
	const extensionsLen = data.readUInt16BE(offset);
	offset += 2;
	const extIds = [];
	const sigAlgorithms = [];
	const alpnProtocols = [];
	let extOffset = offset;
	const extEnd = offset + extensionsLen;
	while (extOffset + 4 <= extEnd) {
		const extId = data.readUInt16BE(extOffset);
		extOffset += 2;
		const extLen = data.readUInt16BE(extOffset);
		extOffset += 2;
		if (extOffset + extLen > extEnd) break;
		const extData = data.subarray(extOffset, extOffset + extLen);
		extOffset += extLen;
		extIds.push(extId);
		if (extId === EXT_SUPPORTED_VERSIONS && extData.length >= 1) {
			const listLen = extData.readUInt8(0);
			let best = 0;
			for (let i = 1; i + 1 < extData.length && i + 1 <= listLen; i += 2) {
				const v = extData.readUInt16BE(i);
				if (!isGrease(v) && v > best) best = v;
			}
			if (best > 0) clientVersion = best;
		} else if (extId === EXT_SIGNATURE_ALGORITHMS && extData.length >= 2) {
			const algLen = extData.readUInt16BE(0);
			for (let i = 2; i + 1 < extData.length && i + 1 < algLen + 2; i += 2) {
				const alg = extData.readUInt16BE(i);
				if (!isGrease(alg)) sigAlgorithms.push(alg);
			}
		} else if (extId === EXT_ALPN && extData.length >= 2) {
			const listLen = extData.readUInt16BE(0);
			const listEnd = Math.min(extData.length, 2 + listLen);
			let alpnOff = 2;
			while (alpnOff < listEnd) {
				const protoLen = extData.readUInt8(alpnOff);
				alpnOff += 1;
				if (alpnOff + protoLen > listEnd) break;
				alpnProtocols.push(extData.subarray(alpnOff, alpnOff + protoLen));
				alpnOff += protoLen;
			}
		}
	}
	const versionStr = tlsVersionStr(clientVersion);
	const sni = extIds.includes(EXT_SERVER_NAME) ? "d" : "i";
	const firstAlpn = alpnProtocols[0];
	const alpnFirst =
		firstAlpn && firstAlpn.length > 0 ? alpnChar(firstAlpn.readUInt8(0)) : "0";
	const alpnLast =
		firstAlpn && firstAlpn.length > 1
			? alpnChar(firstAlpn.readUInt8(firstAlpn.length - 1))
			: "0";
	const nonGreaseCiphers = cipherSuites.filter((c) => !isGrease(c));
	const nonGreaseExts = extIds.filter((e) => !isGrease(e));
	const cipherCount = Math.min(99, nonGreaseCiphers.length)
		.toString()
		.padStart(2, "0");
	const extCount = Math.min(99, nonGreaseExts.length)
		.toString()
		.padStart(2, "0");
	const first = `t${versionStr}${sni}${cipherCount}${extCount}${alpnFirst}${alpnLast}`;
	const sortedCiphers = [...nonGreaseCiphers].sort((a, b) => a - b);
	const cipherHash = hash12(formatIdList(sortedCiphers));
	const filteredExts = nonGreaseExts.filter(
		(e) => e !== EXT_SERVER_NAME && e !== EXT_ALPN,
	);
	const sortedExts = [...filteredExts].sort((a, b) => a - b);
	const extStr = formatIdList(sortedExts);
	const sigStr = formatIdList(sigAlgorithms);
	const extHash = hash12(sigStr.length > 0 ? `${extStr}_${sigStr}` : extStr);
	return `${first}_${cipherHash}_${extHash}`;
}

// Build a realistic Chrome-like TLS 1.3 ClientHello (many ciphers + extensions).
function chromeLikeHello() {
	const ciphers = [
		0x0a0a, 0x1301, 0x1302, 0x1303, 0xc02b, 0xc02f, 0xc02c, 0xc030, 0xcca9,
		0xcca8, 0xc013, 0xc014, 0x009c, 0x009d, 0x002f, 0x0035,
	];
	const sni = Buffer.concat([
		Buffer.from([0x00, 0x0e, 0x00, 0x00, 0x0b]),
		Buffer.from("example.com"),
	]);
	const alpn = Buffer.concat([
		Buffer.from([0x00, 0x0c]),
		Buffer.from([0x02]),
		Buffer.from("h2"),
		Buffer.from([0x08]),
		Buffer.from("http/1.1"),
	]);
	const sv = Buffer.from([
		0x08, 0x0a, 0x0a, 0x03, 0x04, 0x03, 0x03, 0x03, 0x02,
	]);
	const sigAlgs = Buffer.from([
		0x00, 0x0e, 0x04, 0x03, 0x08, 0x04, 0x04, 0x01, 0x05, 0x03, 0x08, 0x05,
		0x05, 0x01, 0x08, 0x06,
	]);
	const exts = [
		{ id: 0x0000, data: sni },
		{ id: 0x0017, data: Buffer.alloc(0) },
		{ id: 0xff01, data: Buffer.from([0x00]) },
		{
			id: 0x000a,
			data: Buffer.from([
				0x00, 0x08, 0x0a, 0x0a, 0x00, 0x1d, 0x00, 0x17, 0x00, 0x18,
			]),
		},
		{ id: 0x000b, data: Buffer.from([0x01, 0x00]) },
		{ id: 0x0010, data: alpn },
		{ id: 0x0005, data: Buffer.from([0x01, 0x00, 0x00, 0x00, 0x00]) },
		{ id: 0x000d, data: sigAlgs },
		{ id: 0x0012, data: Buffer.alloc(0) },
		{
			id: 0x0033,
			data: Buffer.from(
				[0x00, 0x26, 0x00, 0x24, 0x00, 0x1d, 0x00, 0x20].concat(
					new Array(32).fill(0xab),
				),
			),
		},
		{ id: 0x002d, data: Buffer.from([0x02, 0x01, 0x01]) },
		{ id: 0x002b, data: sv },
		{ id: 0x001b, data: Buffer.from([0x02, 0x00, 0x02]) },
		{ id: 0x001c, data: Buffer.from([0x40, 0x01]) },
		{ id: 0x0a0a, data: Buffer.from([0x00]) },
		{ id: 0x0015, data: Buffer.alloc(126) },
	];
	const parts = [];
	const ver = Buffer.alloc(2);
	ver.writeUInt16BE(0x0303, 0);
	parts.push(ver);
	parts.push(Buffer.alloc(32, 0xaa));
	parts.push(Buffer.from([0]));
	const cs = Buffer.alloc(2);
	cs.writeUInt16BE(ciphers.length * 2, 0);
	parts.push(cs);
	for (const c of ciphers) {
		const b = Buffer.alloc(2);
		b.writeUInt16BE(c, 0);
		parts.push(b);
	}
	parts.push(Buffer.from([1, 0]));
	const eb = [];
	for (const e of exts) {
		const h = Buffer.alloc(4);
		h.writeUInt16BE(e.id, 0);
		h.writeUInt16BE(e.data.length, 2);
		eb.push(h, e.data);
	}
	const extBody = Buffer.concat(eb);
	const el = Buffer.alloc(2);
	el.writeUInt16BE(extBody.length, 0);
	parts.push(el, extBody);
	const body = Buffer.concat(parts);
	const hs = Buffer.alloc(4);
	hs[0] = 0x01;
	hs[1] = (body.length >> 16) & 0xff;
	hs[2] = (body.length >> 8) & 0xff;
	hs[3] = body.length & 0xff;
	const handshake = Buffer.concat([hs, body]);
	const rh = Buffer.alloc(5);
	rh[0] = 0x16;
	rh.writeUInt16BE(0x0301, 1);
	rh.writeUInt16BE(handshake.length, 3);
	return Buffer.concat([rh, handshake]);
}

const hello = chromeLikeHello();
console.log(`ClientHello size: ${hello.length} bytes`);
console.log(`JS  fingerprint: ${calculateJa4Js(hello)}`);
console.log(`RS  fingerprint: ${native.calculateJa4(hello)}`);

if (calculateJa4Js(hello) !== native.calculateJa4(hello)) {
	console.error("PARITY MISMATCH!");
	process.exit(1);
}

const N = 100_000;

function bench(label, fn) {
	// warmup
	for (let i = 0; i < 1000; i++) fn(hello);
	const start = performance.now();
	for (let i = 0; i < N; i++) fn(hello);
	const elapsed = performance.now() - start;
	const nsPerOp = (elapsed * 1e6) / N;
	const opsPerSec = (N / elapsed) * 1000;
	console.log(
		`${label.padEnd(10)} ${elapsed.toFixed(1).padStart(8)} ms   ${nsPerOp.toFixed(0).padStart(6)} ns/op   ${opsPerSec.toFixed(0).padStart(10)} ops/s`,
	);
	return elapsed;
}

console.log(`\nIterations: ${N.toLocaleString()}`);
const jsMs = bench("JS", calculateJa4Js);
const rsMs = bench("Rust napi", native.calculateJa4);
console.log(`\nSpeedup: ${(jsMs / rsMs).toFixed(2)}x`);
