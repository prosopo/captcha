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
import { handleErrors } from "@prosopo/api-express-router";
import { type Logger, getLoggerDefault } from "@prosopo/common";
import type { ProviderEnvironment } from "@prosopo/types-env";
import type { NextFunction, Request, Response } from "express";
import { readTlsClientHello } from "read-tls-client-hello";

const DEFAULT_JA4 = "ja4";

const getJA4 = async (headers: IncomingHttpHeaders, logger?: Logger) => {
	logger = logger || getLoggerDefault();

	// Default JA4+ fingerprint for development
	if (process.env.NODE_ENV === "development") {
		return { ja4PlusFingerprint: DEFAULT_JA4 };
	}

	try {
		// Validate headers and make sure they're strings
		const xTlsClientHello = (headers["x-tls-clienthello"] || "").toString();
		const xTlsVersion = (headers["x-tls-version"] || "")
			.toString()
			.toLowerCase();
		const xTlsServerName = (headers["x-tls-server-name"] || "").toString();

		// Decode the base64 ClientHello message
		const clientHelloBuffer = Buffer.from(xTlsClientHello, "base64");

		// Debug: Check first few bytes
		logger.debug(
			"ClientHello First Bytes:",
			clientHelloBuffer.subarray(0, 5).toString("hex"),
		);

		// Check first byte after the initial 5
		if (clientHelloBuffer[5] !== 0x01) {
			logger.warn("Invalid ClientHello message: First byte is not 0x01");
			return { ja4PlusFingerprint: DEFAULT_JA4 };
		}

		logger.debug("Headers TLS Version:", xTlsVersion);

		//`tls1.3` becomes `13` etc.
		const tlsVersion = xTlsVersion.replace(/(tls)|\./g, "");

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

		// _tlsVersion is not used, as we already have the TLS version from the headers. The tlsVersion reported by the
		// `clientHello` object is also not accurate.
		const [_tlsVersion, cipherSuites, extensions] = clientHello.fingerprintData;

		// Determine the transport protocol
		const transport = "t"; // Assuming TCP

		// Check if SNI is present
		const sniIndicator = xTlsServerName ? "d" : "i";

		// Count valid cipher suites (excluding GREASE values)
		const validCipherSuites = cipherSuites.filter(
			(cs: number) => (cs & 0x0f0f) !== 0x0a0a,
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
		return { ja4PlusFingerprint: DEFAULT_JA4 };
	}
};

export const ja4Middleware = (env: ProviderEnvironment) => {
	return async (req: Request, res: Response, next: NextFunction) => {
		try {
			const ja4 = await getJA4(req.headers, req.logger);

			req.ja4 = ja4.ja4PlusFingerprint || "";
			next();
		} catch (err) {
			return handleErrors(err as Error, req, res, next);
		}
	};
};
