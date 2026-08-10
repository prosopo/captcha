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

import type { IncomingHttpHeaders } from "node:http";
import { handleErrors } from "@prosopo/api-express-router";
import { type Logger, getLogger } from "@prosopo/logger";
import type { ProviderEnvironment } from "@prosopo/types-env";
import type { NextFunction, Request, Response } from "express";

// Header names forwarded by the chaddy Caddy plugin per-TLS-connection.
// Both are server-observed microsecond deltas across the TLS handshake
// lifecycle. Elevated values indicate the client's ClientHello traversed
// a proxy chain before reaching Caddy — the CH bytes only reach the
// terminating TCP stack after every hop, so the deltas inflate with the
// full client-to-exit RTT rather than just the last-mile RTT.
const HEADER_TCP_TO_CHELLO = "x-tls-tcp-to-chello-us";
const HEADER_CHELLO_TO_HANDSHAKE = "x-tls-chello-to-handshake-us";

export interface HandshakeTiming {
	tcpToChelloUs?: number;
	chelloToHandshakeUs?: number;
}

const parseTimingHeader = (
	raw: string | string[] | undefined,
	logger: Logger,
	headerName: string,
): number | undefined => {
	if (raw === undefined) {
		return undefined;
	}
	const value = Array.isArray(raw) ? raw[0] : raw;
	if (value === undefined) {
		return undefined;
	}
	const parsed = Number.parseInt(value, 10);
	if (Number.isNaN(parsed) || parsed < 0) {
		logger.debug(() => ({
			msg: "Ignoring malformed handshake timing header",
			data: { header: headerName, raw: value },
		}));
		return undefined;
	}
	return parsed;
};

export const getHandshakeTiming = (
	headers: IncomingHttpHeaders,
	logger?: Logger,
): HandshakeTiming => {
	const log = logger ?? getLogger("info", "provider:handshake-timing");
	return {
		tcpToChelloUs: parseTimingHeader(
			headers[HEADER_TCP_TO_CHELLO],
			log,
			HEADER_TCP_TO_CHELLO,
		),
		chelloToHandshakeUs: parseTimingHeader(
			headers[HEADER_CHELLO_TO_HANDSHAKE],
			log,
			HEADER_CHELLO_TO_HANDSHAKE,
		),
	};
};

// env kept in the signature for parity with the other provider middlewares
// (ja4Middleware, ipInfoMiddleware). Currently unused but reserved so future
// per-tenant configuration can hook in without changing the startProviderApi
// wiring.
export const handshakeTimingMiddleware = (env: ProviderEnvironment) => {
	return async (req: Request, res: Response, next: NextFunction) => {
		try {
			const timing = getHandshakeTiming(req.headers, req.logger);
			if (timing.tcpToChelloUs !== undefined) {
				req.tcpToChelloUs = timing.tcpToChelloUs;
			}
			if (timing.chelloToHandshakeUs !== undefined) {
				req.chelloToHandshakeUs = timing.chelloToHandshakeUs;
			}
			if (
				timing.tcpToChelloUs !== undefined ||
				timing.chelloToHandshakeUs !== undefined
			) {
				req.logger = req.logger.with(
					{
						tcpToChelloUs: timing.tcpToChelloUs,
						chelloToHandshakeUs: timing.chelloToHandshakeUs,
					},
					"handshakeTiming",
				);
			}
			next();
		} catch (err) {
			return handleErrors(err as Error, req, res, next);
		}
	};
};
