// Copyright 2021-2025 Prosopo (UK) Ltd.
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

import { ApiEndpointResponseStatus } from "@prosopo/api-route";
import type { Logger } from "@prosopo/common";
import { CaptchaType, type ProsopoConfigOutput, Tier } from "@prosopo/types";
import type { ClientRecord, IProviderDatabase } from "@prosopo/types-database";
import { describe, expect, it, vi } from "vitest";
import { ApiRegisterSiteKeyEndpoint } from "../../../../api/admin/apiRegisterSiteKeyEndpoint.js";
import { ClientTaskManager } from "../../../../tasks/client/clientTasks.js";

describe("apiRegisterSiteKeyEndpoint", () => {
	const mockConfig = {} as unknown as ProsopoConfigOutput;

	const mockLogger = new Proxy(
		{},
		{
			get: () => () => {},
		},
	) as Logger;

	const getMockDb = () =>
		({
			updateClientRecords: vi.fn(),
		}) as unknown as IProviderDatabase;

	const registerSiteKey = (
		db: IProviderDatabase,
		record: Partial<ClientRecord>,
	) =>
		new ApiRegisterSiteKeyEndpoint(
			new ClientTaskManager(mockConfig, mockLogger, db),
		).processRequest({
			siteKey: record.account || "",
			tier: record.tier || Tier.Free,
			settings: record.settings,
		});

	it("should register or update site key", async () => {
		const record: Partial<ClientRecord> = {
			// random, but valid account.
			account: "5EjTA28bKSbFPPyMbUjNtArxyqjwq38r1BapVmLZShaqEedV",
			tier: Tier.Free,
			settings: {
				captchaType: CaptchaType.frictionless,
				domains: [],
				frictionlessThreshold: 0.5,
				imageThreshold: 0.5,
				powDifficulty: 0.5,
				disallowWebView: false,
			},
		};
		const db = getMockDb();

		const endpointResponse = await registerSiteKey(db, record);

		expect(db.updateClientRecords).toHaveBeenCalledTimes(1);
		expect(db.updateClientRecords).toHaveBeenCalledWith([
			record as ClientRecord,
		]);

		expect(endpointResponse).toEqual({
			status: ApiEndpointResponseStatus.SUCCESS,
		});
	});

	it("should throw an api error for an invalid site key", async () => {
		const record: Partial<ClientRecord> = {
			account: "invalidAccount",
			tier: Tier.Free,
			settings: {
				captchaType: CaptchaType.frictionless,
				domains: [],
				frictionlessThreshold: 0.5,
				imageThreshold: 0.5,
				powDifficulty: 0.5,
				disallowWebView: false,
			},
		};
		const db = getMockDb();

		const registerPromise = registerSiteKey(db, record);

		await expect(registerPromise).rejects.toThrowError("API.INVALID_SITE_KEY");
	});
});
