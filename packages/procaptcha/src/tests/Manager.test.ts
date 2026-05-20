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

import type {
	Account,
	CaptchaResponseBody,
	FrictionlessState,
	ProcaptchaClientConfigOutput,
	ProcaptchaState,
	RandomProvider,
} from "@prosopo/types";
import { EnvironmentTypesSchema } from "@prosopo/types";
import { beforeEach, describe, expect, it, vi } from "vitest";

// providerRetry is responsible for invoking `currentFn` (the async body of start())
// and handling its retry semantics. The reload bug under test is about *whether*
// start is invoked at all, not about start's own internal behavior, so we replace
// providerRetry with a passthrough that simply records the call.
const providerRetryMock = vi.fn(
	async (currentFn: () => Promise<void>) => {
		// swallow currentFn errors so unmocked network code doesn't crash the test
		try {
			await currentFn();
		} catch {
			// intentionally ignored - we only assert that start() was triggered
		}
	},
);

vi.mock("@prosopo/procaptcha-common", async () => {
	const actual =
		await vi.importActual<typeof import("@prosopo/procaptcha-common")>(
			"@prosopo/procaptcha-common",
		);
	return {
		...actual,
		providerRetry: providerRetryMock,
	};
});

const buildConfig = (): ProcaptchaClientConfigOutput =>
	({
		account: { address: "test-dapp-address" },
		userAccountAddress: "",
		web2: true,
		defaultEnvironment: EnvironmentTypesSchema.enum.development,
		captchas: {
			image: { challengeTimeout: 60_000, solutionTimeout: 60_000 },
		},
		theme: "light",
		mode: "default",
	}) as unknown as ProcaptchaClientConfigOutput;

const mockChallenge = (): CaptchaResponseBody =>
	({
		captchas: [
			{
				captchaId: "cap-1",
				captchaContentId: "content-1",
				datasetId: "dataset-1",
				items: [],
				target: "select all",
				timeLimitMs: 60_000,
			},
		],
		requestHash: "req-hash",
		timestamp: `${Date.now()}`,
		signature: { provider: { requestHash: "req-hash-sig" } },
	}) as unknown as CaptchaResponseBody;

const buildInitialState = (
	overrides: Partial<ProcaptchaState> = {},
): ProcaptchaState => ({
	isHuman: false,
	index: 0,
	solutions: [],
	captchaApi: undefined,
	showModal: true,
	challenge: mockChallenge(),
	loading: false,
	account: undefined,
	dappAccount: undefined,
	submission: undefined,
	timeout: undefined,
	successfullChallengeTimeout: undefined,
	sendData: false,
	attemptCount: 1,
	error: undefined,
	sessionId: undefined,
	...overrides,
});

const buildFrictionlessState = (): FrictionlessState => ({
	provider: {
		provider: { url: "https://provider.test" },
	} as unknown as RandomProvider,
	userAccount: {
		account: { address: "frictionless-user", meta: { source: "" } },
	} as unknown as Account,
	restart: vi.fn(),
	sessionId: "session-123",
});

describe("Manager.reload", () => {
	beforeEach(() => {
		providerRetryMock.mockClear();
	});

	it("fires the onReload event", async () => {
		const { Manager } = await import("../modules/Manager.js");
		const onReload = vi.fn();

		const manager = Manager(
			buildConfig(),
			buildInitialState(),
			vi.fn(),
			{ onReload },
		);

		await manager.reload();

		expect(onReload).toHaveBeenCalledTimes(1);
	});

	it("invokes start() to load a new challenge", async () => {
		const { Manager } = await import("../modules/Manager.js");
		const onOpen = vi.fn();

		const manager = Manager(
			buildConfig(),
			buildInitialState(),
			vi.fn(),
			{ onOpen },
		);

		await manager.reload();

		// start() fires onOpen before delegating to providerRetry
		expect(onOpen).toHaveBeenCalledTimes(1);
		// providerRetry was invoked, i.e. start() proceeded past its loading guard
		expect(providerRetryMock).toHaveBeenCalledTimes(1);
	});

	it("does NOT invoke frictionlessState.restart (keeps the modal open)", async () => {
		const { Manager } = await import("../modules/Manager.js");
		const frictionlessState = buildFrictionlessState();

		const manager = Manager(
			buildConfig(),
			buildInitialState(),
			vi.fn(),
			{},
			frictionlessState,
		);

		await manager.reload();

		expect(frictionlessState.restart).not.toHaveBeenCalled();
	});

	it("does not close the modal during reload (showModal stays true)", async () => {
		const { Manager } = await import("../modules/Manager.js");
		const onStateUpdate = vi.fn();
		const state = buildInitialState({ showModal: true });

		const manager = Manager(buildConfig(), state, onStateUpdate, {});

		await manager.reload();

		// no update should explicitly set showModal to false during reload itself
		const closingUpdate = onStateUpdate.mock.calls.find(
			([next]) => next.showModal === false,
		);
		expect(closingUpdate).toBeUndefined();
	});

	it("clears the active challenge timeout", async () => {
		const { Manager } = await import("../modules/Manager.js");
		const clearTimeoutSpy = vi.spyOn(window, "clearTimeout");
		const existingTimeout = setTimeout(() => {}, 999_999);
		const state = buildInitialState({ timeout: existingTimeout });

		const manager = Manager(buildConfig(), state, vi.fn(), {});

		await manager.reload();

		expect(clearTimeoutSpy).toHaveBeenCalled();

		clearTimeoutSpy.mockRestore();
		clearTimeout(existingTimeout);
	});

	it("ensures loading is reset so start() proceeds even if previously loading", async () => {
		const { Manager } = await import("../modules/Manager.js");
		const onOpen = vi.fn();
		const onStateUpdate = vi.fn();
		const state = buildInitialState({ loading: true });

		const manager = Manager(buildConfig(), state, onStateUpdate, { onOpen });

		await manager.reload();

		// loading was reset to false before start() was triggered
		const loadingResetCall = onStateUpdate.mock.calls.find(
			([next]) => next.loading === false,
		);
		expect(loadingResetCall).toBeDefined();
		// start() proceeded past the loading guard
		expect(onOpen).toHaveBeenCalledTimes(1);
		expect(providerRetryMock).toHaveBeenCalledTimes(1);
	});
});
