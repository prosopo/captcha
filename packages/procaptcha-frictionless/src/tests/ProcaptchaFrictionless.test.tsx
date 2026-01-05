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

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@prosopo/locale", async () => {
	const actual =
		await vi.importActual<typeof import("@prosopo/locale")>("@prosopo/locale");
	return {
		...actual,
		loadI18next: vi.fn(),
	};
});

vi.mock("@prosopo/procaptcha-common", () => ({
	Checkbox: vi.fn(() => null),
	getDefaultEvents: vi.fn(),
	providerRetry: vi.fn(),
}));

vi.mock("@prosopo/procaptcha-pow", () => ({
	ProcaptchaPow: vi.fn(() => null),
}));

vi.mock("@prosopo/procaptcha-react", () => ({
	Procaptcha: vi.fn(() => null),
}));

vi.mock("@prosopo/widget-skeleton", () => ({
	darkTheme: {},
	lightTheme: {},
}));

vi.mock("../customDetectBot.js", () => ({
	default: vi.fn(),
}));

import { loadI18next } from "@prosopo/locale";
import { getDefaultEvents } from "@prosopo/procaptcha-common";
import { ProcaptchaFrictionless } from "../ProcaptchaFrictionless.jsx";

describe("ProcaptchaFrictionless", () => {
	const mockConfig = {
		account: {
			address: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
		},
		defaultEnvironment: "development",
		theme: "light" as const,
		mode: "normal" as const,
		web2: true,
	};

	const mockCallbacks = {
		onSuccess: vi.fn(),
		onError: vi.fn(),
		onReset: vi.fn(),
	};

	const mockI18n = {
		language: "en",
		isInitialized: true,
		t: vi.fn((key: string) => key),
		changeLanguage: vi.fn().mockResolvedValue(undefined),
	};

	const mockRestart = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(loadI18next).mockResolvedValue(mockI18n as never);
		vi.mocked(getDefaultEvents).mockReturnValue({
			onSuccess: mockCallbacks.onSuccess,
			onError: mockCallbacks.onError,
			onReset: mockCallbacks.onReset,
		} as never);
	});

	// Note: React component tests require React Testing Library for proper rendering
	// These tests verify the component exports and types are correct
	it("should export ProcaptchaFrictionless component", () => {
		expect(ProcaptchaFrictionless).toBeDefined();
		expect(typeof ProcaptchaFrictionless).toBe("function");
	});
});
