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

const RECORD_HEADER_LENGTH = 5;
const HANDSHAKE_HEADER_LENGTH = 4;
const HANDSHAKE_RECORD_TYPE = 0x16;
const HANDSHAKE_MESSAGE_TYPE = 0x01;

const EXT_SERVER_NAME = 0x0000;
const EXT_SIGNATURE_ALGORITHMS = 0x000d;
const EXT_ALPN = 0x0010;
const EXT_SUPPORTED_VERSIONS = 0x002b;

// GREASE values match the pattern 0x?a?a (RFC 8701).
function isGrease(id: number): boolean {
	return (id & 0x0f0f) === 0x0a0a;
}

function hash12(input: string): string {
	return createHash("sha256").update(input).digest("hex").slice(0, 12);
}

function formatIdList(ids: number[]): string {
	return ids.map((id) => id.toString(16).padStart(4, "0")).join(",");
}

// Per spec: alphanumeric bytes pass through, all others become 2-char lowercase hex.
function alpnChar(b: number): string {
	if (
		(b >= 0x30 && b <= 0x39) || // 0-9
		(b >= 0x41 && b <= 0x5a) || // A-Z
		(b >= 0x61 && b <= 0x7a) // a-z
	) {
		return String.fromCharCode(b);
	}
	return b.toString(16).padStart(2, "0");
}

// Return (first, last) JA4 ALPN chars for a raw protocol byte slice.
// A missing position (empty or single-byte slice) returns "0".
function alpnFirstLast(protocol: Buffer): [string, string] {
	const first = protocol.length > 0 ? alpnChar(protocol.readUInt8(0)) : "0";
	const last =
		protocol.length > 1
			? alpnChar(protocol.readUInt8(protocol.length - 1))
			: "0";
	return [first, last];
}

function tlsVersionStr(version: number): string {
	switch (version) {
		case 0x0301:
			return "10";
		case 0x0302:
			return "11";
		case 0x0303:
			return "12";
		case 0x0304:
			return "13";
		default:
			return "00";
	}
}

export class Ja4ParseError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "Ja4ParseError";
	}
}

/**
 * Compute a JA4 TLS fingerprint from raw ClientHello bytes.
 *
 * Expects the full TLS record:
 *   5-byte record header  (content_type + version + record_len)
 *   4-byte handshake header (msg_type + msg_len)
 *   ClientHello body
 *
 * Throws Ja4ParseError for structural failures in the TLS record or handshake
 * header (wrong record type, wrong message type, declared lengths exceeding the
 * buffer, odd cipher-suite length).
 *
 * Extension-level malformation (truncated extension body, malformed SNI/ALPN
 * entries) is handled defensively: parsing stops at the first bad entry and
 * a fingerprint is produced from whatever was successfully parsed. This matches
 * the Rust reference implementation and avoids turning extension parse errors
 * into connection-fingerprinting failures.
 */
export function calculateJa4(data: Buffer): string {
	let offset = 0;

	if (data.length < RECORD_HEADER_LENGTH + HANDSHAKE_HEADER_LENGTH) {
		throw new Ja4ParseError("ClientHello too short");
	}

	// TLS record header
	const recordType = data.readUInt8(offset);
	offset += 1;
	if (recordType !== HANDSHAKE_RECORD_TYPE) {
		throw new Ja4ParseError(
			`Invalid record type: 0x${recordType.toString(16)}`,
		);
	}
	offset += 2; // record-layer protocol version (not used for fingerprinting)
	const recordLen = data.readUInt16BE(offset);
	offset += 2;

	if (data.length < RECORD_HEADER_LENGTH + recordLen) {
		throw new Ja4ParseError("Record length exceeds buffer");
	}
	// Slice to the record boundary so subsequent parsing cannot bleed into
	// bytes beyond this TLS record (e.g. a concatenated second record).
	data = data.subarray(0, RECORD_HEADER_LENGTH + recordLen);

	// Handshake header
	const msgType = data.readUInt8(offset);
	offset += 1;
	if (msgType !== HANDSHAKE_MESSAGE_TYPE) {
		throw new Ja4ParseError(
			`Not a ClientHello: handshake type 0x${msgType.toString(16)}`,
		);
	}
	const msgLen = data.readUIntBE(offset, 3);
	offset += 3;
	if (data.length - offset < msgLen) {
		throw new Ja4ParseError("Handshake message length exceeds record");
	}

	// ClientHello body: version(2) + random(32) + session_id_len(1)
	if (data.length - offset < 35) {
		throw new Ja4ParseError("ClientHello body too short");
	}

	let clientVersion = data.readUInt16BE(offset);
	offset += 2;
	offset += 32; // client random

	const sessionIdLen = data.readUInt8(offset);
	offset += 1;
	if (data.length - offset < sessionIdLen) {
		throw new Ja4ParseError("Truncated at session ID");
	}
	offset += sessionIdLen;

	if (data.length - offset < 2) {
		throw new Ja4ParseError("Truncated at cipher suites length");
	}
	const cipherSuitesLen = data.readUInt16BE(offset);
	offset += 2;

	if (data.length - offset < cipherSuitesLen) {
		throw new Ja4ParseError("Truncated at cipher suites");
	}
	if (cipherSuitesLen % 2 !== 0) {
		throw new Ja4ParseError("Cipher suites length is not a multiple of 2");
	}
	const cipherSuites: number[] = [];
	for (let i = 0; i < cipherSuitesLen; i += 2) {
		cipherSuites.push(data.readUInt16BE(offset + i));
	}
	offset += cipherSuitesLen;

	if (data.length - offset < 1) {
		throw new Ja4ParseError("Truncated at compression methods");
	}
	const compressionLen = data.readUInt8(offset);
	offset += 1;
	if (data.length - offset < compressionLen) {
		throw new Ja4ParseError("Truncated at compression methods data");
	}
	offset += compressionLen;

	if (data.length - offset < 2) {
		throw new Ja4ParseError("Truncated at extensions length");
	}
	const extensionsLen = data.readUInt16BE(offset);
	offset += 2;

	if (data.length - offset < extensionsLen) {
		throw new Ja4ParseError("Truncated at extensions");
	}

	const extIds: number[] = [];
	const sigAlgorithms: number[] = [];
	const serverNames: string[] = [];
	const alpnProtocols: Buffer[] = [];

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

		if (extId === EXT_SUPPORTED_VERSIONS) {
			// 1-byte list length, then 2-byte version entries.
			// Pick the highest non-GREASE version.
			if (extData.length >= 1) {
				const listLen = extData.readUInt8(0);
				let best = 0;
				for (let i = 1; i + 1 < extData.length && i + 1 <= listLen; i += 2) {
					const v = extData.readUInt16BE(i);
					if (!isGrease(v) && v > best) best = v;
				}
				if (best > 0) clientVersion = best;
			}
		} else if (extId === EXT_SIGNATURE_ALGORITHMS) {
			// 2-byte list length, then 2-byte algorithm entries (order preserved).
			if (extData.length >= 2) {
				const algLen = extData.readUInt16BE(0);
				for (let i = 2; i + 1 < extData.length && i < algLen + 2; i += 2) {
					const alg = extData.readUInt16BE(i);
					if (!isGrease(alg)) sigAlgorithms.push(alg);
				}
			}
		} else if (extId === EXT_SERVER_NAME) {
			// 2-byte list length, entries: type(1) + name_len(2) + name bytes.
			// Only type 0 (host_name) is used.
			if (extData.length >= 2) {
				let sniOff = 2;
				while (sniOff + 3 <= extData.length) {
					const nameType = extData.readUInt8(sniOff);
					sniOff += 1;
					const nameLen = extData.readUInt16BE(sniOff);
					sniOff += 2;
					if (sniOff + nameLen > extData.length) break;
					if (nameType === 0) {
						serverNames.push(
							extData.subarray(sniOff, sniOff + nameLen).toString("utf8"),
						);
					}
					sniOff += nameLen;
				}
			}
		} else if (extId === EXT_ALPN) {
			// 2-byte total length, then length-prefixed raw protocol byte strings.
			if (extData.length >= 2) {
				let alpnOff = 2;
				while (alpnOff < extData.length) {
					const protoLen = extData.readUInt8(alpnOff);
					alpnOff += 1;
					if (alpnOff + protoLen > extData.length) break;
					alpnProtocols.push(extData.subarray(alpnOff, alpnOff + protoLen));
					alpnOff += protoLen;
				}
			}
		}
	}

	// Build fingerprint
	const versionStr = tlsVersionStr(clientVersion);
	const sni = serverNames.length > 0 ? "d" : "i";
	const [alpnFirst, alpnLast] =
		alpnProtocols.length > 0 ? alpnFirstLast(alpnProtocols[0]) : ["0", "0"];

	const nonGreaseCiphers = cipherSuites.filter((c) => !isGrease(c));
	const nonGreaseExts = extIds.filter((e) => !isGrease(e));

	const cipherCount = Math.min(99, nonGreaseCiphers.length)
		.toString()
		.padStart(2, "0");
	const extCount = Math.min(99, nonGreaseExts.length)
		.toString()
		.padStart(2, "0");

	const firstChunk = `t${versionStr}${sni}${cipherCount}${extCount}${alpnFirst}${alpnLast}`;

	// Cipher hash: sort non-GREASE ciphers numerically, comma-separated hex.
	const sortedCiphers = [...nonGreaseCiphers].sort((a, b) => a - b);
	const cipherHash = hash12(formatIdList(sortedCiphers));

	// Extension hash: sort non-GREASE extensions (excluding SNI and ALPN),
	// then append signature algorithms (order preserved) separated by '_'.
	const filteredExts = nonGreaseExts.filter(
		(e) => e !== EXT_SERVER_NAME && e !== EXT_ALPN,
	);
	const sortedExts = [...filteredExts].sort((a, b) => a - b);
	const extStr = formatIdList(sortedExts);
	const sigAlgStr = formatIdList(sigAlgorithms);
	const extHashInput = sigAlgStr.length > 0 ? `${extStr}_${sigAlgStr}` : extStr;
	const extHash = hash12(extHashInput);

	return `${firstChunk}_${cipherHash}_${extHash}`;
}
