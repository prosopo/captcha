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

import { AdminApiPaths, ClientApiPaths, PublicApiPaths } from "@prosopo/types";
import type { NextFunction, Request, RequestHandler, Response } from "express";

export const DEADLINE_EXCEEDED_BODY = { error: "request timed out" };

// Verify is called server-to-server from a customer's form handler, which is
// itself waiting on it, so it gets the tightest budget.
export const VERIFY_DEADLINE_MS = 10_000;
export const CLIENT_DEADLINE_MS = 15_000;
export const PUBLIC_DEADLINE_MS = 5_000;
export const ADMIN_DEADLINE_MS = 60_000;
// Rebuilds the whole in-memory detector pool (~86 MB for 100 bundles).
export const DETECTOR_POOL_DEADLINE_MS = 300_000;
export const DEFAULT_DEADLINE_MS = 30_000;

const VERIFY_PATHS: readonly string[] = [
	ClientApiPaths.VerifyPowCaptchaSolution,
	ClientApiPaths.VerifyImageCaptchaSolutionDapp,
	ClientApiPaths.VerifyPuzzleCaptchaSolution,
	ClientApiPaths.VerifyAuthenticatedSession,
];
const CLIENT_PREFIX = "/v1/prosopo/provider/client/";
const ADMIN_PREFIX = "/v1/prosopo/provider/admin/";
const PUBLIC_PATHS: readonly string[] = Object.values(PublicApiPaths);

const matches = (path: string, route: string): boolean =>
	path === route || path.startsWith(`${route}/`);

export const providerRouteDeadlineMs = (path: string): number => {
	if (VERIFY_PATHS.some((route) => matches(path, route))) {
		return VERIFY_DEADLINE_MS;
	}
	if (path.startsWith(CLIENT_PREFIX)) {
		return CLIENT_DEADLINE_MS;
	}
	if (matches(path, AdminApiPaths.ReplaceDetectorPool)) {
		return DETECTOR_POOL_DEADLINE_MS;
	}
	if (path.startsWith(ADMIN_PREFIX)) {
		return ADMIN_DEADLINE_MS;
	}
	if (PUBLIC_PATHS.includes(path)) {
		return PUBLIC_DEADLINE_MS;
	}
	return DEFAULT_DEADLINE_MS;
};

// Answers 504 once the route's deadline passes without a response. The
// handler keeps running, so its eventual reply is dropped rather than thrown:
// under express 4 a throw from an async handler's catch block is an unhandled
// rejection.
export const requestDeadline =
	(
		deadlineMs: (req: Request) => number,
		onExceeded?: (req: Request, deadlineMs: number) => void,
	): RequestHandler =>
	(req: Request, res: Response, next: NextFunction): void => {
		const ms = deadlineMs(req);
		const timer = setTimeout(() => {
			if (res.headersSent) {
				return;
			}
			onExceeded?.(req, ms);
			res.status(504).json(DEADLINE_EXCEEDED_BODY);
			const dropped = (): Response => res;
			res.json = dropped;
			res.send = dropped;
			res.end = dropped;
		}, ms);
		const clear = (): void => clearTimeout(timer);
		res.on("finish", clear);
		res.on("close", clear);
		next();
	};
