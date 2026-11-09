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

import { defineApiRoute } from "@prosopo/api-route";
import express, {
	type NextFunction,
	type Request,
	type Response,
} from "express";
import { describe, expect, test } from "vitest";
import { z } from "zod";
import { registerApiRoute } from "../../registerApiRoute.js";

type Layer = {
	route?: { path: string; stack: { method: string }[] };
};

const routeOf = (router: express.Router): Layer["route"] =>
	(router.stack as Layer[])[0]?.route;

const noop = (_req: Request, _res: Response, next: NextFunction): void =>
	next();

describe("registerApiRoute", () => {
	test.each(["get", "post", "put", "patch", "delete"] as const)(
		"mounts a %s contract on its path with its method",
		(method) => {
			const router = express.Router();
			registerApiRoute(
				router,
				defineApiRoute({
					path: "/thing",
					method,
					requestSchema: undefined,
					responseSchema: undefined,
				}),
				noop,
			);
			expect(routeOf(router)?.path).toBe("/thing");
			expect(routeOf(router)?.stack.map((layer) => layer.method)).toEqual([
				method,
			]);
		},
	);

	test("keeps every handler, in order", () => {
		const router = express.Router();
		const first = (_req: Request, _res: Response, next: NextFunction): void =>
			next();
		const second = (_req: Request, res: Response): void => {
			res.end();
		};
		registerApiRoute(
			router,
			defineApiRoute({
				path: "/thing",
				method: "post",
				requestSchema: z.object({ id: z.string() }),
				responseSchema: undefined,
			}),
			first,
			second,
		);
		expect(routeOf(router)?.stack).toHaveLength(2);
	});

	test("returns the router so registrations can chain", () => {
		const router = express.Router();
		expect(
			registerApiRoute(
				router,
				defineApiRoute({
					path: "/thing",
					method: "get",
					requestSchema: undefined,
					responseSchema: undefined,
				}),
				noop,
			),
		).toBe(router);
	});
});
