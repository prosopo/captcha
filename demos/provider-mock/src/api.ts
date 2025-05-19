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
import { Readable } from "node:stream";
import { ProsopoApiError } from "@prosopo/common";
import {
	ClientApiPaths,
	VerifySolutionBody,
	decodeProcaptchaOutput,
} from "@prosopo/types";
import type { VerifySolutionBodyTypeOutput } from "@prosopo/types";
import express, { type Router } from "express";
import { readTlsClientHello } from "read-tls-client-hello";

/**
 * Returns a router connected to the database which can interact with the Proposo protocol
 *
 * @return {Router} - A middleware router that can interact with the Prosopo protocol
 */
export function prosopoRouter(): Router {
	const router = express.Router();

	/**
	 * Verifies a user's solution as being approved or not
	 *
	 * @param {string} userAccount - Dapp User id
	 * @param {string} commitmentId - The captcha solution to look up
	 */
	router.post(
		ClientApiPaths.VerifyImageCaptchaSolutionDapp,
		async (req, res, next) => {
			let body: VerifySolutionBodyTypeOutput;
			try {
				body = VerifySolutionBody.parse(req.body);
			} catch (err) {
				return next(
					new ProsopoApiError("CAPTCHA.PARSE_ERROR", {
						context: { error: err, code: 400 },
						logLevel: "info",
					}),
				);
			}
			try {
				const { token } = body;
				const { user, dapp, commitmentId } = decodeProcaptchaOutput(token);
				const testCommitmentId = "0x123456789test";
				const testAccount = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";
				const testDapp = "5C4hrfjw9DjXZTzV3MwzrrAr9P1MJhSrvWGWqi1eSuyUpnhM";
				let statusMessage = "API.USER_NOT_VERIFIED";
				let approved = false;
				if (
					(user && user === testAccount) ||
					(commitmentId && commitmentId === testCommitmentId) ||
					(dapp && dapp === testDapp)
				) {
					approved = true;
					statusMessage = "API.USER_VERIFIED";
					return res.json({
						status: req.t(statusMessage),
						verified: approved,
						commitmentId: testCommitmentId,
					});
				}

				return res.json({
					status: req.t(statusMessage),
					verified: false,
				});
			} catch (err) {
				return next(
					new ProsopoApiError("API.UNKNOWN", {
						context: { error: err, code: 500 },
					}),
				);
			}
		},
	);

	router.get("/test", async (req, res) => {
		console.log(req.headers);
		console.log(req.rawHeaders);

		// Extract headers
		const headers = req.headers;

		// Validate headers
		if (
			!headers["x-tls-clienthello"] ||
			!headers["x-tls-version"] ||
			!headers["x-tls-server-name"]
		) {
			console.error("Missing required headers.");
			return res.status(400).send("Missing required headers.");
		}

		// make sure the client hello message is a string
		if (
			typeof headers["x-tls-clienthello"] !== "string" ||
			typeof headers["x-tls-version"] !== "string" ||
			typeof headers["x-tls-server-name"] !== "string"
		) {
			console.error("Client Hello message is not a string.");
			return res.status(400).send("Client Hello message is not a string.");
		}

		try {
			// Decode the base64 ClientHello message
			const clientHelloBuffer = Buffer.from(
				headers["x-tls-clienthello"],
				"base64",
			);

			// Debug: Check first few bytes
			console.log(
				"ClientHello First Bytes:",
				clientHelloBuffer.slice(0, 5).toString("hex"),
			);

			// Check first byte after the initial 5
			if (clientHelloBuffer[5] !== 0x01) {
				return { error: "Invalid ClientHello message: First byte is not 0x01" };
			}

			// Determine TLS version
			const tlsVersionMap: Record<string, Buffer> = {
				"tls1.3": Buffer.from([0x03, 0x04]),
				"tls1.2": Buffer.from([0x03, 0x03]),
				"tls1.1": Buffer.from([0x03, 0x02]),
				"tls1.0": Buffer.from([0x03, 0x01]),
			};

			console.log(
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

			console.log("Parsed TLS Client Hello:", clientHello);

			// Extract details
			const { alpnProtocols } = clientHello;

			const [_tlsVersion, cipherSuites, extensions] =
				clientHello.fingerprintData;

			console.log("TLS Version:", _tlsVersion);
			console.log("Cipher Suites:", cipherSuites);
			console.log("Extensions:", extensions);

			// Determine the transport protocol
			const transport = "t"; // Assuming TCP

			if (tlsVersion.readUInt16BE(0) !== _tlsVersion) {
				console.warn(
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
			console.log("Sorted Extensions:", sortedExtensions);
			const extensionHash = createHash("sha256")
				.update(sortedExtensions)
				.digest("hex")
				.slice(0, 12);

			// Construct the JA4+ fingerprint
			const ja4PlusFingerprint = `${transport}${tlsVersion}${sniIndicator}${cipherCount}${extensionCount}${alpnLabel}_${cipherHash}_${extensionHash}`;

			return res.json({ ja4PlusFingerprint });
		} catch (e) {
			console.error("Error parsing ClientHello:", e);
			return res.status(500).send("Error parsing ClientHello.");
		}
	});

	return router;
}
