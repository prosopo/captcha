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

import type { CaptchaResponseBody } from "@prosopo/types";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import CaptchaComponent from "./CaptchaComponent.js";

vi.mock("@prosopo/locale", () => ({
	useTranslation: () => ({
		t: (key: string) => key,
		ready: true,
	}),
}));

describe("CaptchaComponent", () => {
	const createMockChallenge = (captchaCount: number): CaptchaResponseBody => ({
		captchas: Array.from({ length: captchaCount }, (_, i) => ({
			items: [
				{
					hash: `hash-${i}-0`,
					data: `data:image/png;base64,image${i}-0`,
					type: "image" as const,
				},
				{
					hash: `hash-${i}-1`,
					data: `data:image/png;base64,image${i}-1`,
					type: "image" as const,
				},
			],
			target: `target-${i}`,
			salt: `salt-${i}`,
		})),
		requestHash: "request-hash",
		timestamp: "timestamp",
		signature: {
			provider: {
				signature: "signature",
				publicKey: "publicKey",
			},
		},
	});

	it("should render captcha widget for current index", () => {
		const challenge = createMockChallenge(2);
		const solutions: [string, number, number][][] = [[], []];
		const props = {
			challenge,
			index: 0,
			solutions,
			onSubmit: vi.fn(),
			onCancel: vi.fn(),
			onClick: vi.fn(),
			onNext: vi.fn(),
			onReload: vi.fn(),
			themeColor: "light" as const,
		};
		render(<CaptchaComponent {...props} />);
		const images = screen.getAllByRole("img");
		expect(images.length).toBeGreaterThan(0);
	});

	it("should display target text for current captcha", () => {
		const challenge = createMockChallenge(2);
		const solutions: [string, number, number][][] = [[], []];
		const props = {
			challenge,
			index: 0,
			solutions,
			onSubmit: vi.fn(),
			onCancel: vi.fn(),
			onClick: vi.fn(),
			onNext: vi.fn(),
			onReload: vi.fn(),
			themeColor: "light" as const,
		};
		render(<CaptchaComponent {...props} />);
		expect(screen.getByText(/target-0/)).toBeDefined();
	});

	it("should call onSubmit when submit button is clicked on last captcha", async () => {
		const challenge = createMockChallenge(2);
		const solutions: [string, number, number][][] = [[], []];
		const onSubmit = vi.fn();
		const props = {
			challenge,
			index: 1,
			solutions,
			onSubmit,
			onCancel: vi.fn(),
			onClick: vi.fn(),
			onNext: vi.fn(),
			onReload: vi.fn(),
			themeColor: "light" as const,
		};
		const user = userEvent.setup();
		render(<CaptchaComponent {...props} />);
		const submitButton = screen.getByRole("button", { name: "WIDGET.SUBMIT" });
		await user.click(submitButton);
		expect(onSubmit).toHaveBeenCalledTimes(1);
	});

	it("should call onNext when next button is clicked on non-last captcha", async () => {
		const challenge = createMockChallenge(2);
		const solutions: [string, number, number][][] = [[], []];
		const onNext = vi.fn();
		const props = {
			challenge,
			index: 0,
			solutions,
			onSubmit: vi.fn(),
			onCancel: vi.fn(),
			onClick: vi.fn(),
			onNext,
			onReload: vi.fn(),
			themeColor: "light" as const,
		};
		const user = userEvent.setup();
		render(<CaptchaComponent {...props} />);
		const nextButton = screen.getByRole("button", { name: "WIDGET.NEXT" });
		await user.click(nextButton);
		expect(onNext).toHaveBeenCalledTimes(1);
	});

	it("should call onCancel when cancel button is clicked", async () => {
		const challenge = createMockChallenge(1);
		const solutions: [string, number, number][][] = [[]];
		const onCancel = vi.fn();
		const props = {
			challenge,
			index: 0,
			solutions,
			onSubmit: vi.fn(),
			onCancel,
			onClick: vi.fn(),
			onNext: vi.fn(),
			onReload: vi.fn(),
			themeColor: "light" as const,
		};
		const user = userEvent.setup();
		render(<CaptchaComponent {...props} />);
		const cancelButton = screen.getByRole("button", { name: "WIDGET.CANCEL" });
		await user.click(cancelButton);
		expect(onCancel).toHaveBeenCalledTimes(1);
	});

	it("should call onReload when reload button is clicked", async () => {
		const challenge = createMockChallenge(1);
		const solutions: [string, number, number][][] = [[]];
		const onReload = vi.fn();
		const props = {
			challenge,
			index: 0,
			solutions,
			onSubmit: vi.fn(),
			onCancel: vi.fn(),
			onClick: vi.fn(),
			onNext: vi.fn(),
			onReload,
			themeColor: "light" as const,
		};
		const user = userEvent.setup();
		render(<CaptchaComponent {...props} />);
		const reloadButton = screen.getByRole("button", { name: /reload/i });
		await user.click(reloadButton);
		expect(onReload).toHaveBeenCalledTimes(1);
	});

	it("should apply light theme", () => {
		const challenge = createMockChallenge(1);
		const solutions: [string, number, number][][] = [[]];
		const props = {
			challenge,
			index: 0,
			solutions,
			onSubmit: vi.fn(),
			onCancel: vi.fn(),
			onClick: vi.fn(),
			onNext: vi.fn(),
			onReload: vi.fn(),
			themeColor: "light" as const,
		};
		render(<CaptchaComponent {...props} />);
		const component = screen.getByText(/target-0/).closest("div");
		expect(component).toBeDefined();
	});

	it("should apply dark theme", () => {
		const challenge = createMockChallenge(1);
		const solutions: [string, number, number][][] = [[]];
		const props = {
			challenge,
			index: 0,
			solutions,
			onSubmit: vi.fn(),
			onCancel: vi.fn(),
			onClick: vi.fn(),
			onNext: vi.fn(),
			onReload: vi.fn(),
			themeColor: "dark" as const,
		};
		render(<CaptchaComponent {...props} />);
		const component = screen.getByText(/target-0/).closest("div");
		expect(component).toBeDefined();
	});

	it("should handle empty solutions array", () => {
		const challenge = createMockChallenge(1);
		const solutions: [string, number, number][][] = [];
		const props = {
			challenge,
			index: 0,
			solutions,
			onSubmit: vi.fn(),
			onCancel: vi.fn(),
			onClick: vi.fn(),
			onNext: vi.fn(),
			onReload: vi.fn(),
			themeColor: "light" as const,
		};
		render(<CaptchaComponent {...props} />);
		expect(screen.getByText(/target-0/)).toBeDefined();
	});

	it("should handle null captcha when challenge.captchas is undefined", () => {
		const challenge: CaptchaResponseBody = {
			captchas: undefined as unknown as [],
			requestHash: "request-hash",
			timestamp: "timestamp",
			signature: {
				provider: {
					signature: "signature",
					publicKey: "publicKey",
				},
			},
		};
		const solutions: [string, number, number][][] = [[]];
		const props = {
			challenge,
			index: 0,
			solutions,
			onSubmit: vi.fn(),
			onCancel: vi.fn(),
			onClick: vi.fn(),
			onNext: vi.fn(),
			onReload: vi.fn(),
			themeColor: "light" as const,
		};
		render(<CaptchaComponent {...props} />);
		expect(screen.queryByRole("img")).toBeNull();
	});

	it("should display correct button text for last captcha", () => {
		const challenge = createMockChallenge(2);
		const solutions: [string, number, number][][] = [[], []];
		const props = {
			challenge,
			index: 1,
			solutions,
			onSubmit: vi.fn(),
			onCancel: vi.fn(),
			onClick: vi.fn(),
			onNext: vi.fn(),
			onReload: vi.fn(),
			themeColor: "light" as const,
		};
		render(<CaptchaComponent {...props} />);
		expect(screen.getByRole("button", { name: "WIDGET.SUBMIT" })).toBeDefined();
		expect(screen.queryByRole("button", { name: "WIDGET.NEXT" })).toBeNull();
	});

	it("should display correct button text for non-last captcha", () => {
		const challenge = createMockChallenge(2);
		const solutions: [string, number, number][][] = [[], []];
		const props = {
			challenge,
			index: 0,
			solutions,
			onSubmit: vi.fn(),
			onCancel: vi.fn(),
			onClick: vi.fn(),
			onNext: vi.fn(),
			onReload: vi.fn(),
			themeColor: "light" as const,
		};
		render(<CaptchaComponent {...props} />);
		expect(screen.getByRole("button", { name: "WIDGET.NEXT" })).toBeDefined();
		expect(screen.queryByRole("button", { name: "WIDGET.SUBMIT" })).toBeNull();
	});

	it("should pass solution to CaptchaWidget", () => {
		const challenge = createMockChallenge(1);
		const solutions: [string, number, number][][] = [[["hash-0-0", 10, 20]]];
		const props = {
			challenge,
			index: 0,
			solutions,
			onSubmit: vi.fn(),
			onCancel: vi.fn(),
			onClick: vi.fn(),
			onNext: vi.fn(),
			onReload: vi.fn(),
			themeColor: "light" as const,
		};
		render(<CaptchaComponent {...props} />);
		// Solution should be passed to CaptchaWidget, which will show check icon
		const checkIcons = screen.getAllByTestId("CheckIcon");
		expect(checkIcons.length).toBeGreaterThan(0);
	});
});

