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

import type { IncomingHttpHeaders } from "node:http";
import { getLogger } from "@prosopo/logger";
import type { ProcaptchaOutput } from "@prosopo/types";
import { type Mock, vi } from "vitest";
import type { ApiRequest, ApiResponse, RouterDeps } from "../api.js";
import type { JA4Record, JA4Store } from "../db.js";
import { TEST_ACCOUNT, TEST_DAPP } from "../verify.js";

/** A decoded token with the fields the mock inspects, and nothing else set. */
export const createOutput = (
	overrides: Partial<ProcaptchaOutput> = {},
): ProcaptchaOutput => ({
	user: TEST_ACCOUNT,
	dapp: TEST_DAPP,
	timestamp: "1717171717",
	signature: {
		provider: { challenge: undefined, requestHash: undefined },
		user: { timestamp: undefined, requestHash: undefined },
	},
	...overrides,
});

/** A body that VerifySolutionBody accepts. */
export const createBody = (
	overrides: Record<string, unknown> = {},
): Record<string, unknown> => ({
	token: "0xdeadbeef",
	dappSignature: "0xsignature",
	...overrides,
});

export interface DatabaseMock extends JA4Store {
	connect: Mock<() => Promise<void>>;
	close: Mock<() => Promise<void>>;
	addOrUpdateJA4Record: Mock<JA4Store["addOrUpdateJA4Record"]>;
}

/** A stand-in for the database, implementing the whole JA4Store interface. */
export const createDatabaseMock = (): DatabaseMock => ({
	connect: vi.fn<() => Promise<void>>(async () => undefined),
	close: vi.fn<() => Promise<void>>(async () => undefined),
	addOrUpdateJA4Record: vi.fn<JA4Store["addOrUpdateJA4Record"]>(
		async (): Promise<JA4Record | null> => null,
	),
});

export interface DepsMock {
	deps: RouterDeps;
	database: DatabaseMock;
	getJA4: Mock<
		(headers: IncomingHttpHeaders) => Promise<{ ja4PlusFingerprint: string }>
	>;
	decodeToken: Mock<(token: string) => ProcaptchaOutput>;
}

export const createDeps = (overrides: Partial<RouterDeps> = {}): DepsMock => {
	const database = createDatabaseMock();
	const getJA4 = vi.fn<
		(headers: IncomingHttpHeaders) => Promise<{ ja4PlusFingerprint: string }>
	>(async () => ({
		ja4PlusFingerprint: "t13d1516h2_8daaf6152771_b0da82dd1658",
	}));
	const decodeToken = vi.fn<(token: string) => ProcaptchaOutput>(() =>
		createOutput(),
	);
	return {
		database,
		getJA4,
		decodeToken,
		deps: {
			db: database,
			getJA4,
			decodeToken,
			logger: getLogger("fatal", "provider-mock:test"),
			...overrides,
		},
	};
};

export interface ResponseMock {
	res: ApiResponse;
	json: Mock<(body: object) => unknown>;
	status: Mock<(code: number) => { send: (body: string) => unknown }>;
	send: Mock<(body: string) => unknown>;
}

export const createResponse = (): ResponseMock => {
	const json = vi.fn<(body: object) => unknown>(() => undefined);
	const send = vi.fn<(body: string) => unknown>(() => undefined);
	const status = vi.fn<(code: number) => { send: (body: string) => unknown }>(
		() => ({ send }),
	);
	return { res: { json, status }, json, status, send };
};

export const createRequest = (
	overrides: Partial<ApiRequest> = {},
): ApiRequest => ({
	body: createBody(),
	headers: { "user-agent": "Mozilla/5.0" },
	t: (key: string): string => `translated:${key}`,
	...overrides,
});
