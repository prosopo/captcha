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

import type { ProviderEnvironment } from "@prosopo/env";
import { getLogger, parseLogLevel } from "@prosopo/logger";
import type { NextFunction, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";

const getHeaderValue = (
	req: Request,
	headerName: string,
): string | undefined => {
	if (headerName in req.headers && req.headers[headerName]) {
		return req.headers[headerName].toString();
	}
	return undefined;
};

const HEALTH_CHECK_PATHS = new Set(["/healthz", "/health", "/readyz"]);

export function requestLoggerMiddleware(env: ProviderEnvironment) {
	return (req: Request, res: Response, next: NextFunction) => {
		// Honour an inbound `x-request-id` (Caddy/upstream proxy assigns one and
		// we want the same value to link Caddy access logs to Node app logs).
		// Fall back to `e-<uuid>` when the upstream didn't set one.
		const requestId =
			(req.headers["x-request-id"] as string) || `e-${uuidv4()}`;
		const user = getHeaderValue(req, "prosopo-user");
		const siteKey = getHeaderValue(req, "prosopo-site-key");
		const sessionId = req.body?.sessionId ? req.body.sessionId : undefined;

		const logger = getLogger(
			parseLogLevel(env.config.logLevel),
			"provider:request",
		).with({
			requestId,
			...(user ? { user } : {}),
			...(siteKey ? { siteKey } : {}),
			...(sessionId ? { sessionId } : {}),
		});

		req.logger = logger;
		req.requestId = requestId;

		// Mirror the requestId back to the client so downstream systems can
		// correlate their own logs to ours.
		res.setHeader("x-request-id", requestId);

		// Skip request/response envelope logging for high-volume health probes
		// so they don't drown out useful captcha-endpoint entries.
		if (HEALTH_CHECK_PATHS.has(req.path)) {
			next();
			return;
		}

		// Emit a single request-received line so every endpoint has an entry
		// log in OpenObserve even when the handler itself doesn't log. Kept at
		// info level; drop to debug if the volume becomes a problem.
		const startNs = process.hrtime.bigint();
		logger.info(() => ({
			msg: "Request received",
			data: {
				method: req.method,
				path: req.path,
			},
		}));

		// Log a response-finished line. `finish` fires when the response was
		// sent successfully; `close` fires when the client disconnects before
		// the response was fully sent. Guard against both firing (once() would
		// only cover a single event source).
		let finished = false;
		const emitFinish = (outcome: "finish" | "close") => {
			if (finished) return;
			finished = true;
			const durationMs = Number(process.hrtime.bigint() - startNs) / 1e6;
			logger.info(() => ({
				msg: "Response sent",
				data: {
					method: req.method,
					path: req.path,
					status: res.statusCode,
					durationMs,
					outcome,
				},
			}));
		};
		res.on("finish", () => emitFinish("finish"));
		res.on("close", () => emitFinish("close"));

		next();
	};
}
