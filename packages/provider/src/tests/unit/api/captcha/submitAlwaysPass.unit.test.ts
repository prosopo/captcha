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
import type { AddressInfo } from "node:net";
import { handleErrors } from "@prosopo/api-express-router";
import { Keyring } from "@prosopo/keyring";
import { getLogger } from "@prosopo/logger";
import {
	type CaptchaIdAndProof,
	type CaptchaSolutionEscalation,
	CaptchaType,
	type KeyringPair,
} from "@prosopo/types";
import type { ProviderEnvironment } from "@prosopo/types-env";
import express, {
	type NextFunction,
	type Request,
	type RequestHandler,
	type Response,
} from "express";
import i18next from "i18next";
import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import type { AugmentedRequest } from "../../../../express.js";

type Outcome = {
	verified: boolean;
	escalation?: CaptchaSolutionEscalation;
};

type TasksStub = {
	db: {
		getClientRecord: () => Promise<{
			account: string;
			settings: { alwaysPass?: boolean };
		}>;
		getPowCaptchaRecordByChallenge: () => Promise<undefined>;
	};
	powCaptchaManager: {
		setPostPowContext: () => void;
		verifyPowCaptchaSolution: () => Promise<{
			verified: boolean;
			routingOutput?: { captchaType: CaptchaType };
		}>;
	};
	imgCaptchaManager: {
		dappUserSolution: () => Promise<
			Outcome & { captchas: CaptchaIdAndProof[] }
		>;
	};
	puzzleCaptchaManager: { verifyPuzzleCaptchaSolution: () => Promise<Outcome> };
	iconOrderCaptchaManager: {
		verifyIconOrderCaptchaSolution: () => Promise<Outcome>;
	};
};

const state = vi.hoisted(
	(): {
		alwaysPass: boolean;
		outcome: { verified: boolean; escalation?: CaptchaSolutionEscalation };
		tasks: unknown;
	} => ({
		alwaysPass: false,
		outcome: { verified: false },
		tasks: undefined,
	}),
);

vi.mock("../../../../api/admin/apiToggleMaintenanceModeEndpoint.js", () => ({
	getMaintenanceMode: (): boolean => false,
}));

vi.mock("../../../../tasks/tasks.js", () => ({
	Tasks: vi.fn().mockImplementation(function (): unknown {
		return state.tasks;
	}),
}));

import submitIconOrderCaptchaSolution from "../../../../api/captcha/submitIconOrderCaptchaSolution.js";
import submitImageCaptchaSolution from "../../../../api/captcha/submitImageCaptchaSolution.js";
import submitPoWCaptchaSolution from "../../../../api/captcha/submitPoWCaptchaSolution.js";
import submitPuzzleCaptchaSolution from "../../../../api/captcha/submitPuzzleCaptchaSolution.js";

const keyring = new Keyring({ type: "sr25519", ss58Format: 42 });
const dappPair: KeyringPair = keyring.addFromUri("//Alice");
const userPair: KeyringPair = keyring.addFromUri("//Bob");

const logger = getLogger("fatal", "submitAlwaysPass.test");
const i18n = i18next.createInstance();
let baseUrl = "";
let server: ReturnType<ReturnType<typeof express>["listen"]> | undefined;

const escalation: CaptchaSolutionEscalation = {
	captchaType: CaptchaType.image,
	sessionId: "session-1",
};

const getPowCaptchaRecordByChallenge = vi.fn(async () => undefined);

const tasks: TasksStub = {
	db: {
		getClientRecord: async () => ({
			account: dappPair.address,
			settings: { alwaysPass: state.alwaysPass },
		}),
		getPowCaptchaRecordByChallenge,
	},
	powCaptchaManager: {
		setPostPowContext: () => undefined,
		verifyPowCaptchaSolution: async () => ({
			verified: state.outcome.verified,
			...(state.outcome.escalation && {
				routingOutput: { captchaType: state.outcome.escalation.captchaType },
			}),
		}),
	},
	imgCaptchaManager: {
		dappUserSolution: async () => ({
			...state.outcome,
			captchas: [
				{
					captchaId: "captcha-1",
					proof: state.outcome.verified ? [["leaf", "root"]] : [[]],
				},
			],
		}),
	},
	puzzleCaptchaManager: {
		verifyPuzzleCaptchaSolution: async () => state.outcome,
	},
	iconOrderCaptchaManager: {
		verifyIconOrderCaptchaSolution: async () => state.outcome,
	},
};

beforeAll(async () => {
	await i18n.init({ lng: "en", resources: {} });
	state.tasks = tasks;
	const env = { logger } as ProviderEnvironment;
	const app = express();
	app.use(express.json());
	app.use((req: Request, _res: Response, next: NextFunction) => {
		req.i18n = i18n;
		req.logger = logger;
		next();
	});
	const mount = (
		path: string,
		handler: (
			req: Request & AugmentedRequest,
			res: Response,
			next: NextFunction,
		) => Promise<unknown>,
	): void => {
		const wrapped: RequestHandler = (req, res, next) => {
			handler(req, res, next).catch(next);
		};
		app.post(path, wrapped);
	};
	mount("/image", submitImageCaptchaSolution(env));
	mount("/pow", submitPoWCaptchaSolution(env));
	mount("/puzzle", submitPuzzleCaptchaSolution(env));
	mount("/iconOrder", submitIconOrderCaptchaSolution(env));
	app.use(handleErrors);
	await new Promise<void>((resolve) => {
		server = app.listen(0, "127.0.0.1", () => resolve());
	});
	const address = server?.address() as AddressInfo;
	baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
	await new Promise<void>((resolve) => server?.close(() => resolve()));
});

beforeEach(() => {
	getPowCaptchaRecordByChallenge.mockClear();
});

type Route = "image" | "pow" | "puzzle" | "iconOrder";

const timestamp = Date.now().toString();
const challenge = `${timestamp}___${userPair.address}___${dappPair.address}___42`;
const signature = {
	user: { timestamp: "0x01" },
	provider: { challenge: "0x02" },
};

const body = (route: Route): object => {
	const common = { user: userPair.address, dapp: dappPair.address };
	switch (route) {
		case "image":
			return {
				...common,
				captchas: [],
				requestHash: "0xabc123",
				timestamp,
				signature: {
					user: { timestamp: "0x01" },
					provider: { requestHash: "0x02" },
				},
			};
		case "pow":
			return { ...common, challenge, difficulty: 1, nonce: 1, signature };
		case "puzzle":
			return {
				...common,
				challenge,
				finalX: 1,
				finalY: 1,
				puzzleEvents: [],
				signature,
			};
		case "iconOrder":
			return {
				...common,
				challenge,
				clicks: [],
				iconOrderEvents: [],
				signature,
			};
	}
};

const submit = async (
	route: Route,
	outcome: Outcome,
	alwaysPass: boolean,
): Promise<Record<string, unknown>> => {
	state.outcome = outcome;
	state.alwaysPass = alwaysPass;
	const res = await fetch(`${baseUrl}/${route}`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(body(route)),
	});
	expect(res.status).toBe(200);
	return (await res.json()) as Record<string, unknown>;
};

const routes: Route[] = ["image", "pow", "puzzle", "iconOrder"];

describe("submit routes on an alwaysPass site key", () => {
	for (const route of routes) {
		it(`${route}: a wrong answer gets the same response as a right one`, async () => {
			const wrong = await submit(route, { verified: false }, true);
			const right = await submit(route, { verified: true }, true);
			expect(wrong.verified).toBe(true);
			expect(wrong).toEqual(right);
		});

		it(`${route}: an escalation is not sent`, async () => {
			const escalated = await submit(
				route,
				{ verified: route === "pow", escalation },
				true,
			);
			const right = await submit(route, { verified: true }, true);
			expect(escalated).toEqual(right);
			expect(escalated).not.toHaveProperty("escalation");
		});

		it(`${route}: the flag off still reports a wrong answer`, async () => {
			const wrong = await submit(route, { verified: false }, false);
			expect(wrong.verified).toBe(false);
		});
	}

	it("pow: no escalation is minted for an alwaysPass key", async () => {
		await submit("pow", { verified: true, escalation }, true);
		expect(getPowCaptchaRecordByChallenge).not.toHaveBeenCalled();
	});

	it("pow: escalation still runs with the flag off", async () => {
		await submit("pow", { verified: true, escalation }, false);
		expect(getPowCaptchaRecordByChallenge).toHaveBeenCalledOnce();
	});
});
