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
import type { AssetsResolver } from "@prosopo/types";
import type { ProviderEnvironment } from "@prosopo/types-env";
import type { AccessRulesStorage } from "@prosopo/user-access-policy";
import express, {
	type NextFunction,
	type Request,
	type RequestHandler,
	type Response,
} from "express";
import i18next from "i18next";
import {
	type Mock,
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

type TasksStub = {
	db: {
		getClientRecord: Mock<() => Promise<{ settings: object }>>;
	};
	imgCaptchaManager: {
		getPrioritisedAccessPolicies: Mock<() => Promise<[]>>;
		isValidRequest: Mock<() => Promise<{ valid: boolean }>>;
		getRandomCaptchasAndRequestHash: Mock<
			() => Promise<{ captchas: []; requestHash: string; timestamp: number }>
		>;
	};
};

const holder = vi.hoisted(
	(): {
		tasks: TasksStub | undefined;
		getSignedAssetsResolver: Mock<
			(clientIp?: string) => AssetsResolver | undefined
		>;
	} => ({
		tasks: undefined,
		getSignedAssetsResolver: vi.fn(
			(_clientIp?: string): AssetsResolver | undefined => undefined,
		),
	}),
);

vi.mock("../../../../api/admin/apiToggleMaintenanceModeEndpoint.js", () => ({
	getMaintenanceMode: (): boolean => false,
}));

vi.mock("../../../../api/captcha/sealedAssetsResolver.js", () => ({
	getSealedAssetsResolver: (): AssetsResolver | undefined => undefined,
}));

vi.mock("../../../../api/captcha/signedAssetsResolver.js", () => ({
	getSignedAssetsResolver: holder.getSignedAssetsResolver,
}));

vi.mock("../../../../tasks/index.js", () => ({
	Tasks: vi.fn().mockImplementation(function (): TasksStub | undefined {
		return holder.tasks;
	}),
}));

import getImageCaptchaChallenge from "../../../../api/captcha/getImageCaptchaChallenge.js";

const keyring = new Keyring({ type: "sr25519", ss58Format: 42 });
const dapp = keyring.addFromUri("//Alice").address;
const user = keyring.addFromUri("//Bob").address;

const logger = getLogger("fatal", "imageChallengeSignedAssetsIp.test");
const i18n = i18next.createInstance();
let baseUrl = "";
let server: ReturnType<ReturnType<typeof express>["listen"]> | undefined;

beforeAll(async () => {
	await i18n.init({ lng: "en", resources: {} });
	const env = {
		logger,
		datasetId: `0x${"ab".repeat(32)}`,
		config: { captchas: { solved: { count: 2 }, unsolved: { count: 0 } } },
	} as unknown as ProviderEnvironment;
	const app = express();
	app.use(express.json());
	app.use((req: Request, _res: Response, next: NextFunction) => {
		req.i18n = i18n;
		req.logger = logger;
		next();
	});
	const handler = getImageCaptchaChallenge(env, {} as AccessRulesStorage);
	const wrapped: RequestHandler = (req, res, next) => {
		handler(req, res, next).catch(next);
	};
	app.post("/image", wrapped);
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
	holder.getSignedAssetsResolver.mockClear();
	holder.tasks = {
		db: {
			getClientRecord: vi.fn(async () => ({ settings: {} })),
		},
		imgCaptchaManager: {
			getPrioritisedAccessPolicies: vi.fn(async (): Promise<[]> => []),
			isValidRequest: vi.fn(async () => ({ valid: true })),
			getRandomCaptchasAndRequestHash: vi.fn(async () => ({
				captchas: [] as [],
				requestHash: "0xrequesthash",
				timestamp: 0,
			})),
		},
	};
});

describe("image challenge signed asset URLs", () => {
	it("binds the URLs to the client's IP address as text", async () => {
		await fetch(`${baseUrl}/image`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ user, dapp }),
		});

		expect(holder.getSignedAssetsResolver).toHaveBeenCalledWith("127.0.0.1");
	});
});
