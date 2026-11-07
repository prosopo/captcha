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

import type { IIpInfoService } from "@prosopo/ipinfo";
import { ClientApiPaths, type IPInfoResponse } from "@prosopo/types";
import type { ProviderEnvironment } from "@prosopo/types-env";
import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { ipInfoMiddleware } from "../../../api/ipInfoMiddleware.js";
import { getServerVerifyPaths } from "../../../api/startProviderApi.js";

const lookupResult: IPInfoResponse = {
	isValid: false,
	error: "stubbed",
	ip: "81.2.69.160",
};

const envWithLookup = (lookup: IIpInfoService["lookup"]): ProviderEnvironment =>
	({
		ipInfoService: { isAvailable: () => true, lookup },
	}) as unknown as ProviderEnvironment;

const requestTo = (path: string): Request =>
	({ path, ip: "81.2.69.160" }) as unknown as Request;

describe("ipInfoMiddleware", () => {
	it("looks up the caller's ip", async () => {
		const lookup = vi.fn<IIpInfoService["lookup"]>(async () => lookupResult);
		const next: NextFunction = vi.fn();
		const req = requestTo(ClientApiPaths.GetPowCaptchaChallenge);

		await ipInfoMiddleware(envWithLookup(lookup))(req, {} as Response, next);

		expect(lookup).toHaveBeenCalledWith("81.2.69.160");
		expect(req.ipInfo).toEqual(lookupResult);
		expect(next).toHaveBeenCalledOnce();
	});

	it("skips the lookup on the paths it is told to skip", async () => {
		const lookup = vi.fn<IIpInfoService["lookup"]>(async () => lookupResult);
		const next: NextFunction = vi.fn();
		const req = requestTo(ClientApiPaths.VerifyPowCaptchaSolution);

		await ipInfoMiddleware(
			envWithLookup(lookup),
			new Set(getServerVerifyPaths()),
		)(req, {} as Response, next);

		expect(lookup).not.toHaveBeenCalled();
		expect(req.ipInfo).toBeUndefined();
		expect(next).toHaveBeenCalledOnce();
	});
});

describe("getServerVerifyPaths", () => {
	it("covers every server-side verify route and nothing the widget calls", () => {
		expect(new Set(getServerVerifyPaths())).toEqual(
			new Set([
				ClientApiPaths.VerifyPowCaptchaSolution,
				ClientApiPaths.VerifyImageCaptchaSolutionDapp,
				ClientApiPaths.VerifyPuzzleCaptchaSolution,
				ClientApiPaths.VerifyAudioCaptchaSolution,
				ClientApiPaths.VerifyIconOrderCaptchaSolution,
				ClientApiPaths.VerifyAuthenticatedSession,
				ClientApiPaths.SiteVerify,
			]),
		);
	});
});
