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
import { Ja4ParseError, calculateJa4 } from "../../../api/ja4.js";

// ── Test helpers ─────────────────────────────────────────────────────────────

/** Build a minimal but valid TLS ClientHello record for testing. */
function buildClientHello(
	tlsVersion: number,
	cipherSuites: number[],
	extensions: Array<{ id: number; data: Buffer }>,
): Buffer {
	// ClientHello body
	const body = Buffer.allocUnsafe(0);
	const parts: Buffer[] = [];

	// client_version (2)
	const ver = Buffer.allocUnsafe(2);
	ver.writeUInt16BE(tlsVersion, 0);
	parts.push(ver);

	// client_random (32)
	parts.push(Buffer.alloc(32, 0xaa));

	// session_id_len (1) — no session id
	parts.push(Buffer.from([0]));

	// cipher_suites
	const csLen = Buffer.allocUnsafe(2);
	csLen.writeUInt16BE(cipherSuites.length * 2, 0);
	parts.push(csLen);
	for (const cs of cipherSuites) {
		const b = Buffer.allocUnsafe(2);
		b.writeUInt16BE(cs, 0);
		parts.push(b);
	}

	// compression_methods: 1 byte length + 1 null method
	parts.push(Buffer.from([1, 0]));

	// extensions
	const extBufs: Buffer[] = [];
	for (const ext of extensions) {
		const hdr = Buffer.allocUnsafe(4);
		hdr.writeUInt16BE(ext.id, 0);
		hdr.writeUInt16BE(ext.data.length, 2);
		extBufs.push(hdr, ext.data);
	}
	const extBody = Buffer.concat(extBufs);
	const extLen = Buffer.allocUnsafe(2);
	extLen.writeUInt16BE(extBody.length, 0);
	parts.push(extLen, extBody);

	const helloBody = Buffer.concat(parts);

	// Handshake header: type(1) + length(3)
	const hsHdr = Buffer.allocUnsafe(4);
	hsHdr[0] = 0x01;
	hsHdr[1] = (helloBody.length >> 16) & 0xff;
	hsHdr[2] = (helloBody.length >> 8) & 0xff;
	hsHdr[3] = helloBody.length & 0xff;

	const handshake = Buffer.concat([hsHdr, helloBody]);

	// TLS record header: type(1) + version(2) + length(2)
	const recHdr = Buffer.allocUnsafe(5);
	recHdr[0] = 0x16;
	recHdr.writeUInt16BE(0x0301, 1);
	recHdr.writeUInt16BE(handshake.length, 3);

	return Buffer.concat([recHdr, handshake]);
}

function buildSniExtension(hostname: string): Buffer {
	const name = Buffer.from(hostname, "ascii");
	const buf = Buffer.allocUnsafe(2 + 1 + 2 + name.length);
	buf.writeUInt16BE(1 + 2 + name.length, 0); // list length
	buf[2] = 0; // host_name type
	buf.writeUInt16BE(name.length, 3);
	name.copy(buf, 5);
	return buf;
}

function buildAlpnExtension(protocols: string[]): Buffer {
	const protos = Buffer.concat(
		protocols.map((p) => {
			const b = Buffer.from(p, "ascii");
			return Buffer.concat([Buffer.from([b.length]), b]);
		}),
	);
	const buf = Buffer.allocUnsafe(2 + protos.length);
	buf.writeUInt16BE(protos.length, 0);
	protos.copy(buf, 2);
	return buf;
}

function buildSupportedVersionsExtension(versions: number[]): Buffer {
	const buf = Buffer.allocUnsafe(1 + versions.length * 2);
	buf[0] = versions.length * 2;
	for (const [i, v] of versions.entries()) {
		buf.writeUInt16BE(v, 1 + i * 2);
	}
	return buf;
}

function buildSigAlgsExtension(algs: number[]): Buffer {
	const buf = Buffer.allocUnsafe(2 + algs.length * 2);
	buf.writeUInt16BE(algs.length * 2, 0);
	for (const [i, v] of algs.entries()) {
		buf.writeUInt16BE(v, 2 + i * 2);
	}
	return buf;
}

// ── Error handling ────────────────────────────────────────────────────────────

describe("calculateJa4 — error handling", () => {
	it("throws on input shorter than 9 bytes", () => {
		expect(() => calculateJa4(Buffer.from([0x16, 0x03, 0x01]))).toThrow(
			Ja4ParseError,
		);
	});

	it("throws on wrong record type", () => {
		const record = buildClientHello(0x0303, [0x1301], []);
		record[0] = 0x17; // Application Data
		expect(() => calculateJa4(record)).toThrow(Ja4ParseError);
	});

	it("throws on wrong handshake message type", () => {
		const record = buildClientHello(0x0303, [0x1301], []);
		record[5] = 0x02; // ServerHello
		expect(() => calculateJa4(record)).toThrow(Ja4ParseError);
	});

	it("throws on odd cipher suite length", () => {
		// Manually craft a record with cipherSuitesLen = 3 (odd)
		const record = buildClientHello(0x0303, [0x1301], []);
		// cipherSuitesLen is 2 bytes at offset 5+4+2+32+1 = 44
		// 5 (rec hdr) + 4 (hs hdr) + 2 (version) + 32 (random) + 1 (session_id_len) = 44
		record.writeUInt16BE(3, 44);
		expect(() => calculateJa4(record)).toThrow(Ja4ParseError);
	});
});

// ── Fingerprint correctness ───────────────────────────────────────────────────

describe("calculateJa4 — fingerprint format", () => {
	it("returns three underscore-separated parts of correct length", () => {
		const record = buildClientHello(0x0303, [0x1301, 0xc02f], []);
		const fp = calculateJa4(record);
		const parts = fp.split("_");
		expect(parts).toHaveLength(3);
		expect(parts[0]).toHaveLength(10);
		expect(parts[1]).toHaveLength(12);
		expect(parts[2]).toHaveLength(12);
		expect(parts[1]).toMatch(/^[0-9a-f]+$/);
		expect(parts[2]).toMatch(/^[0-9a-f]+$/);
	});

	it("starts with 't' for TLS", () => {
		const fp = calculateJa4(buildClientHello(0x0303, [0x1301], []));
		expect(fp[0]).toBe("t");
	});

	it("is deterministic for the same input", () => {
		const record = buildClientHello(0x0303, [0x1301, 0x1302, 0xc02f], []);
		expect(calculateJa4(record)).toBe(calculateJa4(record));
	});
});

describe("calculateJa4 — TLS version", () => {
	it("produces t12 for TLS 1.2 client version with no supported_versions ext", () => {
		const fp = calculateJa4(buildClientHello(0x0303, [0xc02f], []));
		expect(fp.slice(1, 3)).toBe("12");
	});

	it("produces t13 when supported_versions extension advertises TLS 1.3", () => {
		const svExt = buildSupportedVersionsExtension([0x0304]);
		const fp = calculateJa4(
			buildClientHello(0x0303, [0x1301], [{ id: 0x002b, data: svExt }]),
		);
		expect(fp.slice(1, 3)).toBe("13");
	});

	it("produces t12 when supported_versions only lists TLS 1.2", () => {
		const svExt = buildSupportedVersionsExtension([0x0303]);
		const fp = calculateJa4(
			buildClientHello(0x0303, [0x1301], [{ id: 0x002b, data: svExt }]),
		);
		expect(fp.slice(1, 3)).toBe("12");
	});

	it("picks the highest non-GREASE version from supported_versions", () => {
		// GREASE 0x0a0a + TLS 1.3 0x0304 → should select 0x0304
		const svExt = buildSupportedVersionsExtension([0x0a0a, 0x0304]);
		const fp = calculateJa4(
			buildClientHello(0x0303, [0x1301], [{ id: 0x002b, data: svExt }]),
		);
		expect(fp.slice(1, 3)).toBe("13");
	});
});

describe("calculateJa4 — SNI flag", () => {
	it("sets 'd' when SNI extension is present", () => {
		const sni = buildSniExtension("example.com");
		const fp = calculateJa4(
			buildClientHello(0x0303, [0xc02f], [{ id: 0x0000, data: sni }]),
		);
		expect(fp[3]).toBe("d");
	});

	it("sets 'i' when no SNI extension", () => {
		const fp = calculateJa4(buildClientHello(0x0303, [0xc02f], []));
		expect(fp[3]).toBe("i");
	});
});

describe("calculateJa4 — counts", () => {
	it("cipher count excludes GREASE", () => {
		// 1 GREASE + 2 real ciphers → count should be "02"
		const fp = calculateJa4(
			buildClientHello(0x0303, [0x0a0a, 0x1301, 0x1302], []),
		);
		expect(fp.slice(4, 6)).toBe("02");
	});

	it("extension count excludes GREASE", () => {
		// 1 GREASE ext + 1 real ext → count "01"
		const sni = buildSniExtension("example.com");
		const fakeGreaseData = Buffer.alloc(0);
		const fp = calculateJa4(
			buildClientHello(
				0x0303,
				[0xc02f],
				[
					{ id: 0x0a0a, data: fakeGreaseData },
					{ id: 0x0000, data: sni },
				],
			),
		);
		expect(fp.slice(6, 8)).toBe("01");
	});
});

describe("calculateJa4 — ALPN", () => {
	it("uses '00' when no ALPN extension", () => {
		const fp = calculateJa4(buildClientHello(0x0303, [0xc02f], []));
		expect(fp.slice(8, 10)).toBe("00");
	});

	it("uses first and last char of first ALPN protocol", () => {
		const alpn = buildAlpnExtension(["h2"]);
		const fp = calculateJa4(
			buildClientHello(0x0303, [0xc02f], [{ id: 0x0010, data: alpn }]),
		);
		expect(fp.slice(8, 10)).toBe("h2");
	});

	it("uses 'h1' for http/1.1", () => {
		const alpn = buildAlpnExtension(["http/1.1"]);
		const fp = calculateJa4(
			buildClientHello(0x0303, [0xc02f], [{ id: 0x0010, data: alpn }]),
		);
		expect(fp.slice(8, 10)).toBe("h1");
	});

	it("uses '0' for last when single-byte ALPN protocol", () => {
		const proto = Buffer.from([0x01, 0x68]); // length=1, 'h'
		const outer = Buffer.allocUnsafe(2 + proto.length);
		outer.writeUInt16BE(proto.length, 0);
		proto.copy(outer, 2);
		const fp = calculateJa4(
			buildClientHello(0x0303, [0xc02f], [{ id: 0x0010, data: outer }]),
		);
		expect(fp.slice(8, 10)).toBe("h0");
	});
});

describe("calculateJa4 — cipher hash", () => {
	it("GREASE ciphers do not affect cipher hash", () => {
		const withGrease = buildClientHello(0x0303, [0x0a0a, 0x1301, 0x1302], []);
		const withoutGrease = buildClientHello(0x0303, [0x1301, 0x1302], []);
		const fpWith = calculateJa4(withGrease).split("_")[1];
		const fpWithout = calculateJa4(withoutGrease).split("_")[1];
		expect(fpWith).toBe(fpWithout);
	});
});

describe("calculateJa4 — extension hash", () => {
	it("SNI and ALPN excluded from extension hash", () => {
		const sni = buildSniExtension("example.com");
		const alpn = buildAlpnExtension(["h2"]);
		const sigAlgs = buildSigAlgsExtension([0x0403]);

		const withSniAlpn = calculateJa4(
			buildClientHello(
				0x0303,
				[0x1301],
				[
					{ id: 0x0000, data: sni },
					{ id: 0x0010, data: alpn },
					{ id: 0x000d, data: sigAlgs },
				],
			),
		).split("_")[2];

		const withoutSniAlpn = calculateJa4(
			buildClientHello(0x0303, [0x1301], [{ id: 0x000d, data: sigAlgs }]),
		).split("_")[2];

		expect(withSniAlpn).toBe(withoutSniAlpn);
	});
});
