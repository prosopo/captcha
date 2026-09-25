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

import type { Server } from "node:http";
import { AdminApiPaths, ClientApiPaths, PublicApiPaths } from "@prosopo/types";
import express, { type Request, type Response } from "express";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	ADMIN_DEADLINE_MS,
	CLIENT_DEADLINE_MS,
	DEADLINE_EXCEEDED_BODY,
	DEFAULT_DEADLINE_MS,
	DETECTOR_POOL_DEADLINE_MS,
	PUBLIC_DEADLINE_MS,
	VERIFY_DEADLINE_MS,
	providerRouteDeadlineMs,
	requestDeadline,
} from "../../../api/requestDeadline.js";

const DEADLINE_MS = 30;

const sleep = (ms: number): Promise<void> =>
	new Promise((resolve) => setTimeout(resolve, ms));

let server: Server | undefined;

const serve = async (app: express.Express): Promise<string> => {
	const listening = await new Promise<Server>((resolve) => {
		const s = app.listen(0, () => resolve(s));
	});
	server = listening;
	const address = listening.address();
	if (address === null || typeof address === "string") {
		throw new Error("server is not listening on a TCP port");
	}
	return `http://127.0.0.1:${address.port}`;
};

afterEach(async () => {
	await new Promise<void>((resolve) =>
		server ? server.close(() => resolve()) : resolve(),
	);
	server = undefined;
});

describe("providerRouteDeadlineMs", () => {
	it.each([
		[ClientApiPaths.VerifyPowCaptchaSolution, VERIFY_DEADLINE_MS],
		[ClientApiPaths.VerifyImageCaptchaSolutionDapp, VERIFY_DEADLINE_MS],
		[ClientApiPaths.VerifyPuzzleCaptchaSolution, VERIFY_DEADLINE_MS],
		[ClientApiPaths.VerifyAuthenticatedSession, VERIFY_DEADLINE_MS],
		[ClientApiPaths.GetPowCaptchaChallenge, CLIENT_DEADLINE_MS],
		[ClientApiPaths.SubmitUserEvents, CLIENT_DEADLINE_MS],
		[
			`${ClientApiPaths.GetImageCaptchaChallenge}/dataset/user/dapp`,
			CLIENT_DEADLINE_MS,
		],
		[AdminApiPaths.ReplaceDetectorPool, DETECTOR_POOL_DEADLINE_MS],
		[AdminApiPaths.SiteKeyRegister, ADMIN_DEADLINE_MS],
		[PublicApiPaths.Healthz, PUBLIC_DEADLINE_MS],
		[PublicApiPaths.Metrics, PUBLIC_DEADLINE_MS],
		["/v1/prosopo/user-access-policy/rules/insert", DEFAULT_DEADLINE_MS],
		["/unknown", DEFAULT_DEADLINE_MS],
	])("gives %s %i ms", (path: string, expected: number) => {
		expect(providerRouteDeadlineMs(path)).toBe(expected);
	});

	it("does not treat a path that merely shares a verify prefix as verify", () => {
		expect(
			providerRouteDeadlineMs(`${ClientApiPaths.VerifyPowCaptchaSolution}x`),
		).toBe(CLIENT_DEADLINE_MS);
	});

	it("keeps verify inside the client budget so callers see the 504 first", () => {
		expect(VERIFY_DEADLINE_MS).toBeLessThan(CLIENT_DEADLINE_MS);
	});
});

describe("requestDeadline", () => {
	it("answers 504 when the handler outlives the route's deadline", async () => {
		const onExceeded = vi.fn<(req: Request, deadlineMs: number) => void>();
		const app = express();
		app.use(requestDeadline(() => DEADLINE_MS, onExceeded));
		app.get("/slow", async (_req: Request, res: Response) => {
			await sleep(DEADLINE_MS * 3);
			res.json({ late: true });
		});
		const url = await serve(app);

		const response = await fetch(`${url}/slow`);

		expect(response.status).toBe(504);
		expect(await response.json()).toEqual(DEADLINE_EXCEEDED_BODY);
		expect(onExceeded).toHaveBeenCalledOnce();
		expect(onExceeded.mock.calls[0]?.[0].path).toBe("/slow");
		expect(onExceeded.mock.calls[0]?.[1]).toBe(DEADLINE_MS);
	});

	it("resolves the deadline per request from the path", async () => {
		const app = express();
		app.use(
			requestDeadline((req) => (req.path === "/tight" ? DEADLINE_MS : 1_000)),
		);
		const handler = async (_req: Request, res: Response): Promise<void> => {
			await sleep(DEADLINE_MS * 3);
			res.json({ ok: true });
		};
		app.get("/tight", handler);
		app.get("/loose", handler);
		const url = await serve(app);

		const [tight, loose] = await Promise.all([
			fetch(`${url}/tight`),
			fetch(`${url}/loose`),
		]);

		expect(tight.status).toBe(504);
		expect(loose.status).toBe(200);
	});

	it("leaves a response that beats the deadline alone", async () => {
		const onExceeded = vi.fn<(req: Request, deadlineMs: number) => void>();
		const app = express();
		app.use(requestDeadline(() => DEADLINE_MS, onExceeded));
		app.get("/fast", (_req: Request, res: Response) => {
			res.status(201).json({ ok: true });
		});
		const url = await serve(app);

		const response = await fetch(`${url}/fast`);
		await sleep(DEADLINE_MS * 2);

		expect(response.status).toBe(201);
		expect(await response.json()).toEqual({ ok: true });
		expect(onExceeded).not.toHaveBeenCalled();
	});

	it("drops the late reply instead of throwing from the handler", async () => {
		const lateReply = vi.fn<() => void>();
		const handlerError = vi.fn<(err: unknown) => void>();
		const app = express();
		app.use(requestDeadline(() => DEADLINE_MS));
		app.get("/slow", async (_req: Request, res: Response) => {
			await sleep(DEADLINE_MS * 2);
			try {
				res.status(200).json({ late: true });
				res.send("late");
				res.end();
				lateReply();
			} catch (err) {
				handlerError(err);
			}
		});
		const url = await serve(app);

		const response = await fetch(`${url}/slow`);
		await sleep(DEADLINE_MS * 3);

		expect(response.status).toBe(504);
		expect(lateReply).toHaveBeenCalledOnce();
		expect(handlerError).not.toHaveBeenCalled();
	});

	it("does not answer twice when the handler has already started streaming", async () => {
		const app = express();
		app.use(requestDeadline(() => DEADLINE_MS));
		app.get("/stream", async (_req: Request, res: Response) => {
			res.status(200).write("partial");
			await sleep(DEADLINE_MS * 2);
			res.end("-done");
		});
		const url = await serve(app);

		const response = await fetch(`${url}/stream`);

		expect(response.status).toBe(200);
		expect(await response.text()).toBe("partial-done");
	});
});
