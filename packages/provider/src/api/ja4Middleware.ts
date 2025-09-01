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

import type { IncomingHttpHeaders } from "node:http";
import { Readable } from "node:stream";
import { handleErrors } from "@prosopo/api-express-router";
import { type Logger, getLogger } from "@prosopo/common";
import type { ProviderEnvironment } from "@prosopo/types-env";
import { randomAsHex } from "@prosopo/util-crypto";
import type { NextFunction, Request, Response } from "express";
import {
	calculateJa4FromHelloData,
	readTlsClientHello,
} from "read-tls-client-hello";

export const DEFAULT_JA4 = "ja4";

export const getJA4 = async (headers: IncomingHttpHeaders, logger?: Logger) => {
	logger = logger || getLogger("info", import.meta.url);

	// Default JA4+ fingerprint for development
	if (process.env.NODE_ENV === "development") {
		return {
			ja4PlusFingerprint: `${DEFAULT_JA4}${randomAsHex().slice(28, 32)}`,
		};
	}

	try {
		// Validate headers and make sure they're strings
		const xTlsClientHello = (headers["x-tls-clienthello"] || "").toString();
		const xTlsVersion = (headers["x-tls-version"] || "")
			.toString()
			.toLowerCase();

		// Decode the base64 ClientHello message
		const clientHelloBuffer = Buffer.from(xTlsClientHello, "base64");

		// Debug: Check first few bytes
		logger.debug(() => ({
			msg: "ClientHello First Bytes:",
			data: { hex: clientHelloBuffer.subarray(0, 5).toString("hex") },
		}));

		// Check first byte after the initial 5
		if (clientHelloBuffer[5] !== 0x01) {
			logger.debug(() => ({
				msg: "Invalid ClientHello message: First byte is not 0x01",
			}));
			return { ja4PlusFingerprint: DEFAULT_JA4 };
		}

		logger.debug(() => ({
			msg: "Headers TLS Version:",
			data: { xTlsVersion },
		}));

		// Convert to Readable stream
		const readableStream = new Readable({
			read() {
				this.push(clientHelloBuffer);
			},
		});

		// Parse the TLS Client Hello
		const clientHello = await readTlsClientHello(readableStream);

		const ja4PlusFingerprint = calculateJa4FromHelloData(clientHello);

		return { ja4PlusFingerprint };
	} catch (e) {
		logger.error(() => ({
			msg: "Error generating JA4+ fingerprint:",
			err: e instanceof Error ? e : new Error(String(e)),
		}));
		return { ja4PlusFingerprint: DEFAULT_JA4 };
	}
};

export const ja4Middleware = (env: ProviderEnvironment) => {
	return async (req: Request, res: Response, next: NextFunction) => {
		try {
			req.logger.debug(() => ({ data: { url: req.url } }));
			const ja4 = await getJA4(req.headers, req.logger);

			req.ja4 = ja4.ja4PlusFingerprint || "";
			req.logger.with({
				ja4: req.ja4,
			});
			next();
		} catch (err) {
			return handleErrors(err as Error, req, res, next);
		}
	};
};
