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

import { createHash } from "node:crypto";
import type { IncomingHttpHeaders } from "node:http";
import { Readable } from "node:stream";
import { type Logger, getLoggerDefault } from "@prosopo/common";
import { readTlsClientHello } from "read-tls-client-hello";

export const getJA4 = async (headers: IncomingHttpHeaders, logger?: Logger) => {
	logger = logger || getLoggerDefault();

	// Validate headers
	if (
		!headers["x-tls-clienthello"] ||
		!headers["x-tls-version"] ||
		!headers["x-tls-server-name"]
	) {
		logger.error("Missing required headers.");
		return { error: "Missing required headers." };
	}

	// make sure the client hello message is a string
	if (
		typeof headers["x-tls-clienthello"] !== "string" ||
		typeof headers["x-tls-version"] !== "string" ||
		typeof headers["x-tls-server-name"] !== "string"
	) {
		logger.error("Client Hello message is not a string.");
		return { error: "Client Hello message is not a string." };
	}

	try {
		// Decode the base64 ClientHello message
		const clientHelloBuffer = Buffer.from(
			headers["x-tls-clienthello"],
			"base64",
		);

		// Debug: Check first few bytes
		logger.debug(
			"ClientHello First Bytes:",
			clientHelloBuffer.slice(0, 5).toString("hex"),
		);

		// Check first byte after the initial 5
		if (clientHelloBuffer[5] !== 0x01) {
			throw new Error("Invalid ClientHello message: First byte is not 0x01");
		}

		// Determine TLS version
		const tlsVersionMap: Record<string, Buffer> = {
			"tls1.3": Buffer.from([0x03, 0x04]),
			"tls1.2": Buffer.from([0x03, 0x03]),
			"tls1.1": Buffer.from([0x03, 0x02]),
			"tls1.0": Buffer.from([0x03, 0x01]),
		};

		logger.debug(
			"Headers TLS Version:",
			headers["x-tls-version"].toLowerCase(),
		);

		const tlsVersion =
			tlsVersionMap[headers["x-tls-version"].toLowerCase()] ||
			Buffer.from([0x03, 0x03]);

		// Convert to Readable stream
		const readableStream = new Readable({
			read() {
				this.push(clientHelloBuffer);
			},
		});

		// Parse the TLS Client Hello
		const clientHello = await readTlsClientHello(readableStream);

		// Extract details
		const { alpnProtocols } = clientHello;

		const [_tlsVersion, cipherSuites, extensions] = clientHello.fingerprintData;

		// Determine the transport protocol
		const transport = "t"; // Assuming TCP

		if (tlsVersion.readUInt16BE(0) !== _tlsVersion) {
			logger.warn(
				"TLS version mismatch.",
				tlsVersion.readUInt16BE(0),
				_tlsVersion,
			);
		}

		// Check if SNI is present
		const sniIndicator = headers["x-tls-server-name"] ? "d" : "i";

		// Count valid cipher suites (excluding GREASE values)
		const validCipherSuites = cipherSuites.filter(
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			(cs: any) => (cs & 0x0f0f) !== 0x0a0a,
		);
		const cipherCount = validCipherSuites.length;

		// Count valid extensions (excluding GREASE values)
		// ext & 0x0f0f extracts the last 4 bits of each byte in ext.
		// The condition removes GREASE values (0x0a0a), which TLS uses for robustness testing.
		// If ext & 0x0f0f !== 0x0a0a, the extension is valid.
		const validExtensions = extensions.filter(
			(ext: number) => (ext & 0x0f0f) !== 0x0a0a,
		);
		const extensionCount = validExtensions.length;

		// ALPN protocol (first and last character of first protocol)
		const alpn = alpnProtocols?.length ? alpnProtocols[0] : "";
		const alpnLabel = alpn ? `${alpn[0]}${alpn[alpn.length - 1]}` : "00";

		// Hash of sorted cipher suites
		const sortedCiphers = validCipherSuites
			.map((cs: number) => cs.toString(16).padStart(4, "0"))
			.sort()
			.join(",");
		const cipherHash = createHash("sha256")
			.update(sortedCiphers)
			.digest("hex")
			.slice(0, 12);

		// Hash of sorted extensions
		const sortedExtensions = extensions
			.map((ext) => ext.toString(16).padStart(4, "0"))
			.sort()
			.join(",");
		const extensionHash = createHash("sha256")
			.update(sortedExtensions)
			.digest("hex")
			.slice(0, 12);

		// Construct the JA4+ fingerprint
		const ja4PlusFingerprint = `${transport}${tlsVersion}${sniIndicator}${cipherCount}${extensionCount}${alpnLabel}_${cipherHash}_${extensionHash}`;

		return { ja4PlusFingerprint };
	} catch (e) {
		logger.error("Error generating JA4+ fingerprint:", e);
		return { error: "Error generating JA4+ fingerprint." };
	}
};
