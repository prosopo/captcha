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
	ApiPaths,
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
		ApiPaths.VerifyImageCaptchaSolutionDapp,
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

		// Base64-encoded Client Hello message
		const base64ClientHello = req.headers["x-tls-clienthello"];

		if (!base64ClientHello || typeof base64ClientHello !== "string") {
			console.error("No valid Client Hello message found.");
			process.exit(1);
		}

		// Decode the base64-encoded Client Hello
		const clientHelloBuffer = Buffer.from(base64ClientHello, "base64");

		// Convert Buffer to Readable stream
		const clientHelloStream = new Readable();
		clientHelloStream.push(clientHelloBuffer);
		clientHelloStream.push(null);

		// Parse the Client Hello message
		const clientHello = await readTlsClientHello(clientHelloStream);

		if (!clientHello) {
			console.error("Failed to parse the Client Hello message.");
			process.exit(1);
		}

		// Extract necessary fields from the parsed Client Hello
		const { version, cipherSuites, extensions, alpnProtocols, sni } =
			clientHello;

		// Determine the transport protocol (assuming TCP for this example)
		const transport = "t";

		// TLS version
		const tlsVersion =
			version === 0x0303 ? "12" : version === 0x0304 ? "13" : "unknown";

		// SNI existence
		const sniIndicator = sni ? "d" : "i";

		// Number of cipher suites (excluding GREASE values)
		const validCipherSuites = cipherSuites.filter(
			(cs) => (cs & 0x0f0f) !== 0x0a0a,
		);
		const cipherCount = validCipherSuites.length;

		// Number of extensions (excluding GREASE values)
		const validExtensions = extensions.filter(
			(ext) => (ext.type & 0x0f0f) !== 0x0a0a,
		);
		const extensionCount = validExtensions.length;

		// ALPN protocol (first and last character of the first protocol)
		const alpn =
			alpnProtocols && alpnProtocols.length > 0 ? alpnProtocols[0] : "";
		const alpnLabel = alpn ? `${alpn[0]}${alpn[alpn.length - 1]}` : "00";

		// Hash of sorted cipher suites
		const sortedCiphers = validCipherSuites
			.map((cs) => cs.toString(16).padStart(4, "0"))
			.sort()
			.join(",");
		const cipherHash = createHash("sha256")
			.update(sortedCiphers)
			.digest("hex")
			.slice(0, 12);

		// Hash of sorted extensions
		const sortedExtensions = validExtensions
			.map((ext) => ext.type.toString(16).padStart(4, "0"))
			.sort()
			.join(",");
		const extensionHash = createHash("sha256")
			.update(sortedExtensions)
			.digest("hex")
			.slice(0, 12);

		// Construct the JA4 fingerprint
		const ja4Fingerprint = `${transport}${tlsVersion}${sniIndicator}${cipherCount}${extensionCount}${alpnLabel}_${cipherHash}_${extensionHash}`;

		console.log("JA4 Fingerprint:", ja4Fingerprint);
		res.send("Hello World!");
	});

	return router;
}
