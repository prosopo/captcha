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
import { ProsopoDBError } from "@prosopo/common";
import { Keyring } from "@prosopo/keyring";
import { getLogger } from "@prosopo/logger";
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
		getDatasetDetails: Mock<(datasetId: string) => Promise<object>>;
	};
};

const PAST_DATASET_CHECK = "past the dataset check";
const KNOWN_DATASET =
	"0x9f460e81ac9c71b486f796a21bb36e2263694756a6621134d4d1fc7a5c5eb1d4";
const UNKNOWN_DATASET = `0x${"ab".repeat(32)}`;

const holder = vi.hoisted((): { tasks: TasksStub | undefined } => ({
	tasks: undefined,
}));

vi.mock("../../../../api/admin/apiToggleMaintenanceModeEndpoint.js", () => ({
	getMaintenanceMode: (): boolean => false,
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

const logger = getLogger("fatal", "imageChallengeClientDatasetId.test");
const i18n = i18next.createInstance();
let baseUrl = "";
let server: ReturnType<ReturnType<typeof express>["listen"]> | undefined;

beforeAll(async () => {
	await i18n.init({ lng: "en", resources: {} });
	const env = { logger, datasetId: KNOWN_DATASET } as ProviderEnvironment;
	// The handler reads config only after the dataset check, so a request
	// that gets past it surfaces as a 500.
	Object.defineProperty(env, "config", {
		get: (): never => {
			throw new Error(PAST_DATASET_CHECK);
		},
	});
	const app = express();
	app.use(express.json());
	app.use((req: Request, _res: Response, next: NextFunction) => {
		req.i18n = { t: i18n.t };
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
	holder.tasks = {
		db: {
			getClientRecord: vi.fn(async () => ({ settings: {} })),
			getDatasetDetails: vi.fn(async (datasetId: string) => {
				if (datasetId === KNOWN_DATASET) {
					return { datasetId };
				}
				throw new ProsopoDBError("DATABASE.DATASET_GET_FAILED", {
					context: { datasetId },
					silent: true,
				});
			}),
		},
	};
});

const post = async (
	datasetId: unknown,
): Promise<{ status: number; text: string }> => {
	const res = await fetch(`${baseUrl}/image`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ user, dapp, datasetId }),
	});
	return { status: res.status, text: await res.text() };
};

describe("image challenge with a client-supplied datasetId", () => {
	it("rejects a well-formed but unknown datasetId with 400", async () => {
		const { status, text } = await post(UNKNOWN_DATASET);
		expect(status).toBe(400);
		expect(text).toContain("DATABASE.DATASET_GET_FAILED");
		expect(text).not.toContain(UNKNOWN_DATASET);
	});

	it("rejects a non-hex datasetId with 400", async () => {
		const { status } = await post("not-a-dataset");
		expect(status).toBe(400);
	});

	it("rejects a byte-array datasetId with 400", async () => {
		const { status } = await post([1, 2, 3]);
		expect(status).toBe(400);
	});

	it("still reports a database fault as 500", async () => {
		holder.tasks?.db.getDatasetDetails.mockRejectedValueOnce(
			new Error("connection reset"),
		);
		const { status } = await post(UNKNOWN_DATASET);
		expect(status).toBe(500);
	});

	it("lets a known datasetId through the check", async () => {
		const { status } = await post(KNOWN_DATASET);
		expect(holder.tasks?.db.getDatasetDetails).toHaveBeenCalledWith(
			KNOWN_DATASET,
		);
		expect(status).toBe(500);
	});

	it("does not look up the dataset when the client omits it", async () => {
		const { status } = await post(undefined);
		expect(holder.tasks?.db.getDatasetDetails).not.toHaveBeenCalled();
		expect(status).toBe(500);
	});
});
