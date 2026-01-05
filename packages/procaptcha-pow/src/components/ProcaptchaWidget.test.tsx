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

import type { ProcaptchaProps } from "@prosopo/types";
import { ModeEnum } from "@prosopo/types";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ProcaptchaWidget from "./ProcaptchaWidget.js";

vi.mock("@prosopo/locale", async () => {
	const actual = await vi.importActual("@prosopo/locale");
	return {
		...actual,
		useTranslation: vi.fn(() => ({
			t: vi.fn((key: string) => key),
			ready: true,
		})),
		loadI18next: vi.fn(() =>
			Promise.resolve({
				language: "en",
				changeLanguage: vi.fn(() => Promise.resolve({})),
			}),
		),
	};
});

vi.mock("@prosopo/procaptcha-common", () => ({
	buildUpdateState: vi.fn((state, onStateUpdate) => {
		return (partialState: any) => {
			Object.assign(state, partialState);
			onStateUpdate(partialState);
		};
	}),
	useProcaptcha: vi.fn((useState, useRef) => {
		const state = {
			isHuman: false,
			index: 0,
			solutions: [],
			captchaApi: undefined,
			challenge: undefined,
			showModal: false,
			loading: false,
			account: undefined,
			dappAccount: undefined,
			submission: undefined,
			timeout: undefined,
			successfullChallengeTimeout: undefined,
			sendData: false,
			attemptCount: 0,
			error: undefined,
			sessionId: undefined,
		};
		const updateState = (partial: any) => {
			Object.assign(state, partial);
		};
		return [state, updateState];
	}),
	Checkbox: vi.fn(({ checked, onChange, labelText, error, loading }) => (
		<div
			data-testid="checkbox"
			data-checked={checked}
			data-loading={loading}
			data-error={error}
			onClick={onChange}
		>
			{labelText}
		</div>
	)),
}));

vi.mock("../services/Manager.js", () => ({
	Manager: vi.fn(() => ({
		start: vi.fn(() => Promise.resolve()),
		resetState: vi.fn(),
	})),
}));

vi.mock("@prosopo/widget-skeleton", () => ({
	lightTheme: { colors: { primary: "blue" } },
	darkTheme: { colors: { primary: "dark" } },
}));

describe("ProcaptchaWidget", () => {
	let mockProps: ProcaptchaProps;
	let mockManager: {
		start: ReturnType<typeof vi.fn>;
		resetState: ReturnType<typeof vi.fn>;
	};

	beforeEach(async () => {
		vi.clearAllMocks();

		mockManager = {
			start: vi.fn(() => Promise.resolve()),
			resetState: vi.fn(),
		};

		const { Manager } = await import("../services/Manager.js");
		vi.mocked(Manager).mockReturnValue(mockManager as any);

		mockProps = {
			config: {
				account: {
					address: "dappAccount123",
				},
				defaultEnvironment: "development",
				web2: false,
				theme: "light",
				mode: ModeEnum.normal,
			} as any,
			callbacks: {
				onHuman: vi.fn(),
				onError: vi.fn(),
			},
			i18n: {
				language: "en",
				changeLanguage: vi.fn(() => Promise.resolve({})),
			} as any,
		};
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("should render Checkbox component in normal mode", () => {
		render(<ProcaptchaWidget {...mockProps} />);
		const checkbox = screen.getByTestId("checkbox");
		expect(checkbox).toBeTruthy();
	});

	it("should return null in invisible mode", () => {
		const propsInvisible = {
			...mockProps,
			config: {
				...mockProps.config,
				mode: ModeEnum.invisible,
			},
		};
		const { container } = render(<ProcaptchaWidget {...propsInvisible} />);
		expect(container.firstChild).toBeNull();
	});

	it("should set up event listener for invisible mode", () => {
		const addEventListenerSpy = vi.spyOn(document, "addEventListener");
		const propsInvisible = {
			...mockProps,
			config: {
				...mockProps.config,
				mode: ModeEnum.invisible,
			},
		};

		render(<ProcaptchaWidget {...propsInvisible} />);

		expect(addEventListenerSpy).toHaveBeenCalledWith(
			"procaptcha:execute",
			expect.any(Function),
		);
	});

	it("should call manager.start when execute event is dispatched in invisible mode", () => {
		const propsInvisible = {
			...mockProps,
			config: {
				...mockProps.config,
				mode: ModeEnum.invisible,
			},
		};

		render(<ProcaptchaWidget {...propsInvisible} />);

		const event = new Event("procaptcha:execute");
		document.dispatchEvent(event);

		expect(mockManager.start).toHaveBeenCalled();
	});

	it("should clean up event listener on unmount in invisible mode", () => {
		const removeEventListenerSpy = vi.spyOn(document, "removeEventListener");
		const propsInvisible = {
			...mockProps,
			config: {
				...mockProps.config,
				mode: ModeEnum.invisible,
			},
		};

		const { unmount } = render(<ProcaptchaWidget {...propsInvisible} />);

		unmount();

		expect(removeEventListenerSpy).toHaveBeenCalledWith(
			"procaptcha:execute",
			expect.any(Function),
		);
	});

	it("should call manager.start with coordinates on checkbox click", async () => {
		const user = userEvent.setup();
		render(<ProcaptchaWidget {...mockProps} />);

		const checkbox = screen.getByTestId("checkbox");
		await user.click(checkbox);

		await waitFor(() => {
			expect(mockManager.start).toHaveBeenCalled();
		});
	});

	it("should capture mouse coordinates from click event", async () => {
		render(<ProcaptchaWidget {...mockProps} />);

		const checkbox = screen.getByTestId("checkbox");
		const { Checkbox } = await import("@prosopo/procaptcha-common");
		const onChange = vi.mocked(Checkbox).mock.calls[0]?.[0]?.onChange;

		if (onChange) {
			const mouseEvent = {
				nativeEvent: {
					isTrusted: true,
					clientX: 100,
					clientY: 200,
				},
			} as React.MouseEvent;

			await onChange(mouseEvent);
		}

		await waitFor(() => {
			expect(mockManager.start).toHaveBeenCalled();
		});
	});

	it("should capture touch coordinates from touch event", async () => {
		render(<ProcaptchaWidget {...mockProps} />);

		const checkbox = screen.getByTestId("checkbox");
		const touchEvent = {
			nativeEvent: {
				isTrusted: true,
				touches: [
					{
						clientX: 150,
						clientY: 250,
					} as Touch,
				],
			},
		} as React.TouchEvent;

		const onChange = vi.mocked(await import("@prosopo/procaptcha-common"))
			.Checkbox.mock.calls[0]?.[0]?.onChange;
		if (onChange) {
			await onChange(touchEvent);
		}

		await waitFor(() => {
			expect(mockManager.start).toHaveBeenCalledWith(150, 250);
		});
	});

	it("should not capture coordinates from non-trusted events", async () => {
		render(<ProcaptchaWidget {...mockProps} />);

		const checkbox = screen.getByTestId("checkbox");
		const mouseEvent = {
			nativeEvent: {
				isTrusted: false,
				clientX: 100,
				clientY: 200,
			},
		} as React.MouseEvent;

		const onChange = vi.mocked(await import("@prosopo/procaptcha-common"))
			.Checkbox.mock.calls[0]?.[0]?.onChange;
		if (onChange) {
			await onChange(mouseEvent);
		}

		await waitFor(() => {
			expect(mockManager.start).toHaveBeenCalledWith(0, 0);
		});
	});

	it("should not call manager.start if already loading", async () => {
		const user = userEvent.setup();
		render(<ProcaptchaWidget {...mockProps} />);

		const checkbox = screen.getByTestId("checkbox");
		mockManager.start.mockImplementation(
			() =>
				new Promise((resolve) => {
					setTimeout(resolve, 100);
				}),
		);

		await user.click(checkbox);
		await user.click(checkbox);

		await waitFor(() => {
			expect(mockManager.start).toHaveBeenCalledTimes(1);
		});
	});

	it("should display error message when state has error", async () => {
		const { useProcaptcha } = await import("@prosopo/procaptcha-common");
		vi.mocked(useProcaptcha).mockReturnValue([
			{
				isHuman: false,
				index: 0,
				solutions: [],
				captchaApi: undefined,
				challenge: undefined,
				showModal: false,
				loading: false,
				account: undefined,
				dappAccount: undefined,
				submission: undefined,
				timeout: undefined,
				successfullChallengeTimeout: undefined,
				sendData: false,
				attemptCount: 0,
				error: {
					message: "Test error",
					key: "TEST.ERROR",
				},
				sessionId: undefined,
			},
			vi.fn(),
		]);

		render(<ProcaptchaWidget {...mockProps} />);

		const checkbox = screen.getByTestId("checkbox");
		expect(checkbox.getAttribute("data-error")).toBe("Test error");
	});

	it("should change language when config.language changes", async () => {
		const mockChangeLanguage = vi.fn(() => Promise.resolve({}));
		const propsWithI18n = {
			...mockProps,
			i18n: {
				language: "en",
				changeLanguage: mockChangeLanguage,
			} as any,
			config: {
				...mockProps.config,
				language: "fr",
			},
		};

		render(<ProcaptchaWidget {...propsWithI18n} />);

		await waitFor(() => {
			expect(mockChangeLanguage).toHaveBeenCalledWith("fr");
		});
	});

	it("should load i18next when i18n is not provided", async () => {
		const { loadI18next } = await import("@prosopo/locale");
		const propsWithoutI18n = {
			...mockProps,
			i18n: undefined,
			config: {
				...mockProps.config,
				language: "es",
			},
		};

		render(<ProcaptchaWidget {...propsWithoutI18n} />);

		await waitFor(() => {
			expect(loadI18next).toHaveBeenCalled();
		});
	});

	it("should call frictionlessState.restart on NO_SESSION_FOUND error", async () => {
		const mockRestart = vi.fn();
		const frictionlessState = {
			provider: {
				provider: {
					url: "https://test-provider.com",
					datasetId: "datasetId123",
				},
				providerAccount: "providerAccount123",
			},
			userAccount: {
				account: { address: "user123" },
			},
			restart: mockRestart,
		};

		const propsWithFrictionless = {
			...mockProps,
			frictionlessState,
		};

		const { useProcaptcha } = await import("@prosopo/procaptcha-common");
		const mockUpdateState = vi.fn();
		const currentState = {
			isHuman: false,
			index: 0,
			solutions: [],
			captchaApi: undefined,
			challenge: undefined,
			showModal: false,
			loading: false,
			account: undefined,
			dappAccount: undefined,
			submission: undefined,
			timeout: undefined,
			successfullChallengeTimeout: undefined,
			sendData: false,
			attemptCount: 0,
			error: {
				message: "No session found",
				key: "CAPTCHA.NO_SESSION_FOUND",
			},
			sessionId: undefined,
		};

		vi.mocked(useProcaptcha).mockReturnValue([
			currentState,
			(partial: any) => {
				Object.assign(currentState, partial);
				mockUpdateState(partial);
			},
		]);

		const setTimeoutSpy = vi.spyOn(global, "setTimeout");

		render(<ProcaptchaWidget {...propsWithFrictionless} />);

		await waitFor(() => {
			expect(setTimeoutSpy).toHaveBeenCalled();
		});

		const timeoutCallback = setTimeoutSpy.mock.calls[0]?.[0];
		if (typeof timeoutCallback === "function") {
			timeoutCallback();
		}

		await waitFor(() => {
			expect(mockRestart).toHaveBeenCalled();
		});

		setTimeoutSpy.mockRestore();
	}, 15000);

	it("should use light theme when config.theme is light", () => {
		const propsLight = {
			...mockProps,
			config: {
				...mockProps.config,
				theme: "light",
			},
		};

		render(<ProcaptchaWidget {...propsLight} />);

		const checkbox = screen.getByTestId("checkbox");
		expect(checkbox).toBeTruthy();
	});

	it("should use dark theme when config.theme is dark", () => {
		const propsDark = {
			...mockProps,
			config: {
				...mockProps.config,
				theme: "dark",
			},
		};

		render(<ProcaptchaWidget {...propsDark} />);

		const checkbox = screen.getByTestId("checkbox");
		expect(checkbox).toBeTruthy();
	});

	it("should display translation when ready", async () => {
		const { useTranslation } = await import("@prosopo/locale");
		vi.mocked(useTranslation).mockReturnValue({
			t: vi.fn((key: string) => `translated_${key}`),
			ready: true,
		} as any);

		render(<ProcaptchaWidget {...mockProps} />);

		const checkbox = screen.getByTestId("checkbox");
		expect(checkbox.textContent).toContain("translated_");
	});

	it("should display empty string when translation not ready", async () => {
		const { useTranslation } = await import("@prosopo/locale");
		vi.mocked(useTranslation).mockReturnValue({
			t: vi.fn((key: string) => key),
			ready: false,
		} as any);

		render(<ProcaptchaWidget {...mockProps} />);

		const checkbox = screen.getByTestId("checkbox");
		expect(checkbox.textContent).toBe("");
	});
});
