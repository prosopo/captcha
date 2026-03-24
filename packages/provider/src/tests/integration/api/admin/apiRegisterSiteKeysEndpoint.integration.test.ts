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

import { ApiEndpointResponseStatus } from "@prosopo/api-route";
import type { Logger } from "@prosopo/common";
import {
	CaptchaType,
	ClientSettingsSchema,
	ContextType,
	type ProsopoConfigOutput,
	Tier,
	contextAwareThresholdDefault,
} from "@prosopo/types";
import type { ClientRecord, IProviderDatabase } from "@prosopo/types-database";
import { describe, expect, it, vi } from "vitest";
import { ApiRegisterSiteKeysEndpoint } from "../../../../api/admin/apiRegisterSiteKeysEndpoint.js";
import { ClientTaskManager } from "../../../../tasks/client/clientTasks.js";

describe("apiRegisterSiteKeysEndpoint", () => {
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

	const registerSiteKeys = (
		db: IProviderDatabase,
		records: Array<Partial<ClientRecord>>,
	) =>
		new ApiRegisterSiteKeysEndpoint(
			new ClientTaskManager(mockConfig, mockLogger, db),
		).processRequest(
			records.map((record) => ({
				siteKey: record.account || "",
				tier: record.tier || Tier.Free,
				settings: record.settings,
			})),
		);

	const defaultSettings = ClientSettingsSchema.parse({
		captchaType: CaptchaType.frictionless,
		domains: ["example.com"],
		frictionlessThreshold: 0.5,
		imageThreshold: 0.5,
		imageMaxRounds: 3,
		powDifficulty: 1,
		disallowWebView: false,
		contextAware: {
			enabled: false,
			contexts: {
				default: {
					type: ContextType.Default,
					threshold: contextAwareThresholdDefault,
				},
			},
		},
	});

	it("should register or update multiple site keys", async () => {
		const records: Array<Partial<ClientRecord>> = [
			{
				account: "5EjTA28bKSbFPPyMbUjNtArxyqjwq38r1BapVmLZShaqEedV",
				tier: Tier.Free,
				settings: defaultSettings,
			},
			{
				account: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
				tier: Tier.Professional,
				settings: defaultSettings,
			},
		];
		const db = getMockDb();

		const endpointResponse = await registerSiteKeys(db, records);

		expect(db.updateClientRecords).toHaveBeenCalledTimes(1);
		expect(db.updateClientRecords).toHaveBeenCalledWith(
			records.map((r) => ({
				account: r.account,
				tier: r.tier,
				settings: r.settings,
			})),
		);

		expect(endpointResponse).toEqual({
			status: ApiEndpointResponseStatus.SUCCESS,
		});
	});

	it("should register a single site key in a batch", async () => {
		const records: Array<Partial<ClientRecord>> = [
			{
				account: "5EjTA28bKSbFPPyMbUjNtArxyqjwq38r1BapVmLZShaqEedV",
				tier: Tier.Free,
				settings: defaultSettings,
			},
		];
		const db = getMockDb();

		const endpointResponse = await registerSiteKeys(db, records);

		expect(db.updateClientRecords).toHaveBeenCalledTimes(1);
		expect(endpointResponse).toEqual({
			status: ApiEndpointResponseStatus.SUCCESS,
		});
	});

	it("should throw an api error if any site key is invalid", async () => {
		const records: Array<Partial<ClientRecord>> = [
			{
				account: "5EjTA28bKSbFPPyMbUjNtArxyqjwq38r1BapVmLZShaqEedV",
				tier: Tier.Free,
				settings: defaultSettings,
			},
			{
				account: "invalidAccount",
				tier: Tier.Free,
				settings: defaultSettings,
			},
		];
		const db = getMockDb();

		const registerPromise = registerSiteKeys(db, records);

		await expect(registerPromise).rejects.toThrowError("API.INVALID_SITE_KEY");
	});

	it("should not call updateClientRecords if a site key is invalid", async () => {
		const records: Array<Partial<ClientRecord>> = [
			{
				account: "invalidAccount",
				tier: Tier.Free,
				settings: defaultSettings,
			},
		];
		const db = getMockDb();

		await expect(registerSiteKeys(db, records)).rejects.toThrowError(
			"API.INVALID_SITE_KEY",
		);
		expect(db.updateClientRecords).not.toHaveBeenCalled();
	});
});
