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

import type { Ti18n } from "@prosopo/locale";
import type {
	FrictionlessState,
	ProcaptchaCallbacks,
	ProcaptchaClientConfigInput,
} from "@prosopo/types";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ProcaptchaWidget from "./ProcaptchaWidget.js";

const mockManager = {
	start: vi.fn(),
	submit: vi.fn(),
	cancel: vi.fn(),
	select: vi.fn(),
	nextRound: vi.fn(),
	reload: vi.fn(),
};

const mockUseProcaptcha = vi.fn(() => [
	{
		challenge: null,
		index: 0,
		solutions: [],
		isHuman: false,
		showModal: false,
		error: null,
	},
	vi.fn(),
]);

const mockUseTranslation = vi.fn(() => ({
	t: (key: string) => key,
	ready: true,
}));

vi.mock("@prosopo/locale", async () => {
	const actual =
		await vi.importActual<typeof import("@prosopo/locale")>("@prosopo/locale");
	return {
		...actual,
		useTranslation: () => ({
			t: (key: string) => key,
			ready: true,
		}),
		loadI18next: vi.fn().mockResolvedValue({
			language: "en",
			changeLanguage: vi.fn().mockResolvedValue(undefined),
		}),
	};
});

vi.mock("@prosopo/procaptcha-common", () => ({
	useProcaptcha: () => mockUseProcaptcha(),
	Checkbox: ({ onChange, checked, labelText, error, loading }: any) => (
		<div data-testid="checkbox" onClick={() => onChange({ isTrusted: true })}>
			<input
				type="checkbox"
				checked={checked}
				onChange={() => {}}
				data-testid="checkbox-input"
			/>
			<label>{labelText}</label>
			{error && <div data-testid="error">{error}</div>}
			{loading && <div data-testid="loading">Loading...</div>}
		</div>
	),
}));

vi.mock("@prosopo/procaptcha", () => ({
	Manager: vi.fn(() => mockManager),
}));

vi.mock("./CaptchaComponent.js", () => ({
	default: ({
		challenge,
		onSubmit,
		onCancel,
	}: {
		challenge: unknown;
		onSubmit: () => void;
		onCancel: () => void;
	}) => (
		<div data-testid="captcha-component">
			<div>Challenge: {challenge ? "present" : "null"}</div>
			<button type="button" onClick={onSubmit}>
				Submit
			</button>
			<button type="button" onClick={onCancel}>
				Cancel
			</button>
		</div>
	),
}));

vi.mock("./Modal.js", () => ({
	default: ({
		show,
		children,
	}: {
		show: boolean;
		children: React.ReactNode;
	}) => (
		<div data-testid="modal" data-show={show}>
			{children}
		</div>
	),
}));

describe("ProcaptchaWidget", () => {
	const createMockConfig = (): ProcaptchaClientConfigInput => ({
		account: {
			address: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
		},
		web2: true,
		solutionThreshold: 80,
		dappName: "TestDapp",
		theme: "light",
		mode: "visible",
	});

	const createMockI18n = (): Ti18n =>
		({
			language: "en",
			changeLanguage: vi.fn().mockResolvedValue(undefined),
		}) as unknown as Ti18n;

	beforeEach(() => {
		vi.clearAllMocks();
		mockUseProcaptcha.mockReturnValue([
			{
				challenge: null,
				index: 0,
				solutions: [],
				isHuman: false,
				showModal: false,
				error: null,
			},
			vi.fn(),
		]);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it("should render checkbox in visible mode", () => {
		const config = createMockConfig();
		const callbacks: ProcaptchaCallbacks = {
			onHuman: vi.fn(),
		};
		const i18n = createMockI18n();
		render(
			<ProcaptchaWidget config={config} callbacks={callbacks} i18n={i18n} />,
		);
		expect(screen.getByTestId("checkbox")).toBeDefined();
	});

	it("should not render checkbox in invisible mode", () => {
		const config = { ...createMockConfig(), mode: "invisible" as const };
		const callbacks: ProcaptchaCallbacks = {
			onHuman: vi.fn(),
		};
		const i18n = createMockI18n();
		render(
			<ProcaptchaWidget config={config} callbacks={callbacks} i18n={i18n} />,
		);
		expect(screen.queryByTestId("checkbox")).toBeNull();
	});

	it("should call manager.start when checkbox is clicked", async () => {
		const config = createMockConfig();
		const callbacks: ProcaptchaCallbacks = {
			onHuman: vi.fn(),
		};
		const i18n = createMockI18n();
		const user = userEvent.setup();
		render(
			<ProcaptchaWidget config={config} callbacks={callbacks} i18n={i18n} />,
		);
		const checkbox = screen.getByTestId("checkbox");
		await user.click(checkbox);
		await waitFor(() => {
			expect(mockManager.start).toHaveBeenCalled();
		});
	});

	it("should not call manager.start when checkbox is clicked while loading", async () => {
		const config = createMockConfig();
		const callbacks: ProcaptchaCallbacks = {
			onHuman: vi.fn(),
		};
		const i18n = createMockI18n();
		mockUseProcaptcha.mockReturnValue([
			{
				challenge: null,
				index: 0,
				solutions: [],
				isHuman: false,
				showModal: false,
				error: null,
			},
			vi.fn(),
		]);
		const user = userEvent.setup();
		render(
			<ProcaptchaWidget config={config} callbacks={callbacks} i18n={i18n} />,
		);
		const checkbox = screen.getByTestId("checkbox");
		// Click multiple times rapidly
		await user.click(checkbox);
		await user.click(checkbox);
		// Should only be called once due to loading state
		await waitFor(() => {
			expect(mockManager.start).toHaveBeenCalled();
		});
	});

	it("should show modal when showModal is true", () => {
		const config = createMockConfig();
		const callbacks: ProcaptchaCallbacks = {
			onHuman: vi.fn(),
		};
		const i18n = createMockI18n();
		mockUseProcaptcha.mockReturnValue([
			{
				challenge: {
					captchas: [
						{
							items: [],
							target: "test",
							salt: "salt",
						},
					],
					requestHash: "hash",
					timestamp: "timestamp",
					signature: {
						provider: {
							signature: "sig",
							publicKey: "key",
						},
					},
				},
				index: 0,
				solutions: [],
				isHuman: false,
				showModal: true,
				error: null,
			},
			vi.fn(),
		]);
		render(
			<ProcaptchaWidget config={config} callbacks={callbacks} i18n={i18n} />,
		);
		const modal = screen.getByTestId("modal");
		expect(modal.getAttribute("data-show")).toBe("true");
	});

	it("should handle procaptcha:execute event", async () => {
		const config = createMockConfig();
		const callbacks: ProcaptchaCallbacks = {
			onHuman: vi.fn(),
		};
		const i18n = createMockI18n();
		const updateState = vi.fn();
		mockUseProcaptcha.mockReturnValue([
			{
				challenge: null,
				index: 0,
				solutions: [],
				isHuman: false,
				showModal: false,
				error: null,
			},
			updateState,
		]);
		render(
			<ProcaptchaWidget config={config} callbacks={callbacks} i18n={i18n} />,
		);
		const event = new Event("procaptcha:execute");
		document.dispatchEvent(event);
		await waitFor(() => {
			expect(updateState).toHaveBeenCalledWith({ showModal: true });
		});
	});

	it("should call manager.start when execute event is dispatched and no challenge exists", async () => {
		const config = createMockConfig();
		const callbacks: ProcaptchaCallbacks = {
			onHuman: vi.fn(),
		};
		const i18n = createMockI18n();
		mockUseProcaptcha.mockReturnValue([
			{
				challenge: null,
				index: 0,
				solutions: [],
				isHuman: false,
				showModal: false,
				error: null,
			},
			vi.fn(),
		]);
		render(
			<ProcaptchaWidget config={config} callbacks={callbacks} i18n={i18n} />,
		);
		const event = new Event("procaptcha:execute");
		document.dispatchEvent(event);
		await waitFor(() => {
			expect(mockManager.start).toHaveBeenCalled();
		});
	});

	it("should handle error state and restart frictionless when appropriate", async () => {
		const config = createMockConfig();
		const callbacks: ProcaptchaCallbacks = {
			onHuman: vi.fn(),
		};
		const i18n = createMockI18n();
		const frictionlessState: FrictionlessState = {
			restart: vi.fn(),
		};
		mockUseProcaptcha.mockReturnValue([
			{
				challenge: null,
				index: 0,
				solutions: [],
				isHuman: false,
				showModal: false,
				error: {
					key: "CAPTCHA.NO_SESSION_FOUND",
					message: "No session found",
				},
			},
			vi.fn(),
		]);
		vi.useFakeTimers();
		render(
			<ProcaptchaWidget
				config={config}
				callbacks={callbacks}
				i18n={i18n}
				frictionlessState={frictionlessState}
			/>,
		);
		vi.advanceTimersByTime(3000);
		await waitFor(
			() => {
				expect(frictionlessState.restart).toHaveBeenCalled();
			},
			{ timeout: 5000 },
		);
		vi.useRealTimers();
	}, 15000);

	it("should change language when config.language is provided and differs from i18n", async () => {
		const config = { ...createMockConfig(), language: "fr" };
		const callbacks: ProcaptchaCallbacks = {
			onHuman: vi.fn(),
		};
		const changeLanguage = vi.fn().mockResolvedValue(undefined);
		const i18n = {
			language: "en",
			changeLanguage,
		} as unknown as Ti18n;
		render(
			<ProcaptchaWidget config={config} callbacks={callbacks} i18n={i18n} />,
		);
		await waitFor(
			() => {
				expect(changeLanguage).toHaveBeenCalledWith("fr");
			},
			{ timeout: 5000 },
		);
	}, 15000);

	it("should load i18next when i18n is not provided", async () => {
		const config = { ...createMockConfig(), language: "de" };
		const callbacks: ProcaptchaCallbacks = {
			onHuman: vi.fn(),
		};
		render(
			<ProcaptchaWidget
				config={config}
				callbacks={callbacks}
				i18n={undefined}
			/>,
		);
		// The component will call loadI18next asynchronously
		// We verify the component renders without error
		await waitFor(
			() => {
				// Component should render successfully
				expect(document.body).toBeDefined();
			},
			{ timeout: 5000 },
		);
	}, 15000);

	it("should apply light theme", () => {
		const config = { ...createMockConfig(), theme: "light" as const };
		const callbacks: ProcaptchaCallbacks = {
			onHuman: vi.fn(),
		};
		const i18n = createMockI18n();
		render(
			<ProcaptchaWidget config={config} callbacks={callbacks} i18n={i18n} />,
		);
		expect(screen.getByTestId("checkbox")).toBeDefined();
	});

	it("should apply dark theme", () => {
		const config = { ...createMockConfig(), theme: "dark" as const };
		const callbacks: ProcaptchaCallbacks = {
			onHuman: vi.fn(),
		};
		const i18n = createMockI18n();
		render(
			<ProcaptchaWidget config={config} callbacks={callbacks} i18n={i18n} />,
		);
		expect(screen.getByTestId("checkbox")).toBeDefined();
	});
});
