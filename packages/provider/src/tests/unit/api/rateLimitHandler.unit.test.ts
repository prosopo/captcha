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

import { type Logger, getLogger } from "@prosopo/logger";
import type { NextFunction, Request, Response } from "express";
import type { Options } from "express-rate-limit";
import { describe, expect, it, vi } from "vitest";
import { rateLimitHandler } from "../../../api/rateLimitHandler.js";

const limiterOptions = { statusCode: 429 } as Options;

describe("rateLimitHandler", () => {
	it("answers with a RATE_LIMITED error and logs the path, ip and site key", () => {
		const logger: Logger = getLogger("debug", "rateLimitHandler.test");
		const warn = vi.spyOn(logger, "warn").mockImplementation(() => undefined);
		const status = vi.fn().mockReturnThis();
		const json = vi.fn();
		const res: Pick<Response, "status" | "json"> = { status, json };
		const req: Pick<Request, "ip" | "headers"> = {
			ip: "203.0.113.1",
			headers: { "prosopo-site-key": "site" },
		};
		const next: NextFunction = vi.fn();

		rateLimitHandler(logger, "/v1/prosopo/provider/client/captcha/pow")(
			req as Request,
			res as Response,
			next,
			limiterOptions,
		);

		expect(status).toHaveBeenCalledWith(429);
		expect(json).toHaveBeenCalledWith({
			error: {
				code: "RATE_LIMITED",
				errorId: "RATE_LIMITED:PROV-93",
				status: 429,
				message: "Too many requests",
			},
		});
		expect(next).not.toHaveBeenCalled();
		const record = warn.mock.calls[0]?.[0];
		expect(typeof record === "function" ? record() : record).toEqual({
			msg: "Rate limit exceeded",
			data: {
				path: "/v1/prosopo/provider/client/captcha/pow",
				ip: "203.0.113.1",
				siteKey: "site",
			},
		});
	});
});
