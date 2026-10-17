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
import { stringToHex } from "@polkadot/util";
import { handleErrors } from "@prosopo/api-express-router";
import { Keyring } from "@prosopo/keyring";
import { getLogger } from "@prosopo/logger";
import type { KeyringPair, ProsopoConfigOutput } from "@prosopo/types";
import type { IProviderDatabase } from "@prosopo/types-database";
import type { ProviderEnvironment } from "@prosopo/types-env";
import { u8aToHex } from "@prosopo/util";
import express, {
	type NextFunction,
	type Request,
	type RequestHandler,
	type Response,
} from "express";
import i18next from "i18next";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { AugmentedRequest } from "../../../../express.js";

type TasksStub = {
	db: {
		getClientRecord: () => Promise<{ settings: { verifiedTimeout: number } }>;
	};
	imgCaptchaManager: unknown;
	powCaptchaManager: unknown;
	puzzleCaptchaManager: unknown;
};

const holder = vi.hoisted((): { tasks: TasksStub | undefined } => ({
	tasks: undefined,
}));

vi.mock("../../../../api/admin/apiToggleMaintenanceModeEndpoint.js", () => ({
	getMaintenanceMode: (): boolean => false,
}));

vi.mock("../../../../tasks/tasks.js", () => ({
	Tasks: vi.fn().mockImplementation(function (): TasksStub | undefined {
		return holder.tasks;
	}),
}));

import submitImageCaptchaSolution from "../../../../api/captcha/submitImageCaptchaSolution.js";
import submitPoWCaptchaSolution from "../../../../api/captcha/submitPoWCaptchaSolution.js";
import submitPuzzleCaptchaSolution from "../../../../api/captcha/submitPuzzleCaptchaSolution.js";
import { ImgCaptchaManager } from "../../../../tasks/imgCaptcha/imgCaptchaTasks.js";
import { PowCaptchaManager } from "../../../../tasks/powCaptcha/powTasks.js";
import { PuzzleCaptchaManager } from "../../../../tasks/puzzleCaptcha/puzzleTasks.js";

const DB_REACHED = "database reached";

// Every database call throws, so a request that gets past both signature
// checks surfaces as a 500 and marks the control case.
const unreachableDb = new Proxy({} as IProviderDatabase, {
	get: (): (() => never) => () => {
		throw new Error(DB_REACHED);
	},
});

const keyring = new Keyring({ type: "sr25519", ss58Format: 42 });
const dappPair: KeyringPair = keyring.addFromUri("//Alice");
const userPair: KeyringPair = keyring.addFromUri("//Bob");
const providerPair: KeyringPair = keyring.addFromUri("//Charlie");
const sign = (pair: KeyringPair, message: string): string =>
	u8aToHex(pair.sign(stringToHex(message)));

const logger = getLogger("fatal", "submitSolutionBadSignature.test");
const i18n = i18next.createInstance();
let baseUrl = "";
let server: ReturnType<ReturnType<typeof express>["listen"]> | undefined;

beforeAll(async () => {
	await i18n.init({ lng: "en", resources: {} });
	const config = {} as ProsopoConfigOutput;
	holder.tasks = {
		db: {
			getClientRecord: async () => ({ settings: { verifiedTimeout: 60_000 } }),
		},
		imgCaptchaManager: new ImgCaptchaManager(
			unreachableDb,
			providerPair,
			config,
			logger,
		),
		powCaptchaManager: new PowCaptchaManager(
			unreachableDb,
			providerPair,
			config,
			logger,
		),
		puzzleCaptchaManager: new PuzzleCaptchaManager(
			unreachableDb,
			providerPair,
			config,
			logger,
		),
	};

	const env = { logger } as ProviderEnvironment;
	const app = express();
	app.use(express.json());
	app.use((req: Request, _res: Response, next: NextFunction) => {
		req.i18n = { t: i18n.t };
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

type Signatures = { user: string; provider: string };

const timestamp = Date.now().toString();
const challenge = `${timestamp}___${userPair.address}___${dappPair.address}___42`;
const requestHash = "0xabc123";

const validSignatures = (route: Route): Signatures => ({
	user: sign(userPair, timestamp),
	provider: sign(providerPair, route === "image" ? requestHash : challenge),
});

type Route = "image" | "pow" | "puzzle";

const body = (route: Route, signatures: Signatures): object => {
	const common = { user: userPair.address, dapp: dappPair.address };
	if (route === "image") {
		return {
			...common,
			captchas: [],
			requestHash,
			timestamp,
			signature: {
				user: { timestamp: signatures.user },
				provider: { requestHash: signatures.provider },
			},
		};
	}
	const signature = {
		user: { timestamp: signatures.user },
		provider: { challenge: signatures.provider },
	};
	if (route === "pow") {
		return { ...common, challenge, difficulty: 1, nonce: 1, signature };
	}
	return {
		...common,
		challenge,
		finalX: 1,
		finalY: 1,
		puzzleEvents: [],
		signature,
	};
};

const post = async (
	route: Route,
	signatures: Signatures,
): Promise<{ status: number; text: string }> => {
	const res = await fetch(`${baseUrl}/${route}`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(body(route, signatures)),
	});
	return { status: res.status, text: await res.text() };
};

const badSignatures: [string, string][] = [
	["empty", ""],
	["not hex", "0xzz"],
	["wrong length", "0x00"],
	["valid shape, wrong signer", `0x${"11".repeat(64)}`],
];

const routes: Route[] = ["image", "pow", "puzzle"];

describe("solution submit routes reject a bad signature as a client error", () => {
	for (const route of routes) {
		for (const [label, bad] of badSignatures) {
			it(`${route}: user signature ${label} -> 400`, async () => {
				const signatures = { ...validSignatures(route), user: bad };
				const { status, text } = await post(route, signatures);
				expect(status).toBe(400);
				expect(text).toContain("GENERAL.INVALID_SIGNATURE");
			});

			it(`${route}: provider signature ${label} -> 400`, async () => {
				const signatures = { ...validSignatures(route), provider: bad };
				const { status, text } = await post(route, signatures);
				expect(status).toBe(400);
				expect(text).toContain("GENERAL.INVALID_SIGNATURE");
			});
		}

		it(`${route}: valid signatures still reach the database`, async () => {
			const { status } = await post(route, validSignatures(route));
			expect(status).toBe(500);
		});
	}
});
