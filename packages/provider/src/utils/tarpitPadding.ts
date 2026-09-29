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
import { randomBytes } from "node:crypto";
import { MAX_PAD_BYTES } from "@prosopo/types";
import type { NextFunction, Request, Response } from "express";

const POOL = randomBytes(Math.ceil((MAX_PAD_BYTES * 3) / 4)).toString("base64");

const clampPadBytes = (padBytes: number | undefined): number =>
	padBytes && padBytes > 0 ? Math.min(Math.floor(padBytes), MAX_PAD_BYTES) : 0;

const streamWithPad = (res: Response, body: object, n: number): Response => {
	const offset = Math.floor(Math.random() * (POOL.length - n + 1));
	// Fields of the real body without its braces, so the pad can be written
	// as the first member of a fresh object. `""` for `{}`, which would
	// otherwise splice a trailing comma in and emit invalid JSON.
	const fields = JSON.stringify(body).slice(1, -1);
	res.setHeader("content-type", "application/json; charset=utf-8");
	res.write('{"pad":"');
	res.write(POOL.slice(offset, offset + n));
	res.write(fields ? `",${fields}}` : '"}');
	return res.end();
};

const isPlainObject = (body: unknown): body is object =>
	typeof body === "object" && body !== null && !Array.isArray(body);

export const padResponseMiddleware = (
	_req: Request,
	res: Response,
	next: NextFunction,
): void => {
	const originalJson = res.json.bind(res);
	res.json = (body: object): Response => {
		const n = clampPadBytes(res.locals.padBytes);
		// A non-object body has no member list to splice the pad into. Every
		// challenge issuance response is an object, so this is a guard against
		// corrupting some future response rather than a live case.
		return n === 0 || !isPlainObject(body)
			? originalJson(body)
			: streamWithPad(res, body, n);
	};
	next();
};
