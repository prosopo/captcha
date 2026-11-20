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

import { Keyring } from "@prosopo/keyring";
import { getLogger } from "@prosopo/logger";
import {
	type CaptchaTimeoutSettings,
	CaptchaType,
	type ChallengeCaptchaType,
} from "@prosopo/types";
import type { ClientRecord } from "@prosopo/types-database";
import type { ProviderEnvironment } from "@prosopo/types-env";
import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import type { AugmentedRequest } from "../../../../express.js";
import type { InteractiveSubmissionOutcome } from "../../../../tasks/interactiveCaptcha/interactiveCaptchaManager.js";

type SiteSettings = CaptchaTimeoutSettings;

const holder = vi.hoisted((): { settings: SiteSettings | undefined } => ({
	settings: undefined,
}));

vi.mock("../../../../api/admin/apiToggleMaintenanceModeEndpoint.js", () => ({
	getMaintenanceMode: (): boolean => false,
}));

vi.mock("../../../../tasks/tasks.js", () => ({
	Tasks: vi.fn().mockImplementation(function () {
		return {
			db: {
				getClientRecord: async (): Promise<{ settings: SiteSettings }> => ({
					settings: holder.settings ?? {
						solutionTimeout: 60_000,
						verifiedTimeout: 120_000,
					},
				}),
			},
		};
	}),
}));

import { interactiveSolutionHandler } from "../../../../api/captcha/interactiveCaptchaSolution.js";

type Body = { dapp: string; user: string };

const keyring = new Keyring({ type: "sr25519", ss58Format: 42 });
const body: Body = {
	dapp: keyring.addFromUri("//Alice").address,
	user: keyring.addFromUri("//Bob").address,
};

const submitWindowFor = async (
	captchaType: ChallengeCaptchaType,
	settings: SiteSettings,
): Promise<number> => {
	holder.settings = settings;
	const verify = vi.fn(
		async (
			_tasks: unknown,
			_body: Body,
			_submitWindowMs: number,
			_req: Request & AugmentedRequest,
			_clientRecord: ClientRecord,
		): Promise<InteractiveSubmissionOutcome> => ({ verified: true }),
	);
	const handler = interactiveSolutionHandler<Body>({} as ProviderEnvironment, {
		label: captchaType,
		captchaType,
		parse: (raw) => raw as Body,
		verify,
	});
	const req = {
		body,
		logger: getLogger("fatal", "interactiveSolutionTimeout.test"),
	} as Request & AugmentedRequest;
	const res = { json: vi.fn() } as Partial<Response> as Response;
	const next: NextFunction = vi.fn();
	await handler(req, res, next);
	expect(next).not.toHaveBeenCalled();
	const window = verify.mock.calls[0]?.[2];
	if (window === undefined) throw new Error("verify was not called");
	return window;
};

describe("interactive submit window", () => {
	const site: SiteSettings = {
		solutionTimeout: 60_000,
		verifiedTimeout: 120_000,
		captchaTimeouts: {
			iconOrder: { solutionTimeout: 25_000 },
			puzzle: { solutionTimeout: 15_000 },
		},
	};

	it.each<[ChallengeCaptchaType, number]>([
		[CaptchaType.iconOrder, 25_000],
		[CaptchaType.puzzle, 15_000],
		[CaptchaType.audio, 60_000],
	])("gives %s a %d ms window", async (captchaType, expected) => {
		expect(await submitWindowFor(captchaType, site)).toBe(expected);
	});

	it("falls back to verifiedTimeout for a record without solutionTimeout", async () => {
		expect(
			await submitWindowFor(CaptchaType.puzzle, { verifiedTimeout: 90_000 }),
		).toBe(90_000);
	});
});
