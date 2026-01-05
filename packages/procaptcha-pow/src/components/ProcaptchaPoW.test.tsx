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

import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import type { ProcaptchaProps } from "@prosopo/types";
import { ProcaptchaPow } from "./ProcaptchaPoW.js";

vi.mock("./ProcaptchaWidget.js", () => ({
	default: vi.fn((props: ProcaptchaProps) => (
		<div data-testid="procaptcha-widget">
			{JSON.stringify(props)}
		</div>
	)),
}));

describe("ProcaptchaPoW", () => {
	let mockProps: ProcaptchaProps;

	beforeEach(() => {
		mockProps = {
			config: {
				account: {
					address: "dappAccount123",
				},
				defaultEnvironment: "development",
				web2: false,
				theme: "light",
			} as any,
			callbacks: {
				onHuman: vi.fn(),
				onError: vi.fn(),
			},
			i18n: {
				language: "en",
				changeLanguage: vi.fn(),
			} as any,
		};
	});

	it("should render Suspense wrapper", async () => {
		const { container } = render(<ProcaptchaPow {...mockProps} />);
		await waitFor(() => {
			expect(container.querySelector("div")).toBeTruthy();
		});
	});

	it("should pass config prop to ProcaptchaWidget", async () => {
		const { findByTestId } = render(<ProcaptchaPow {...mockProps} />);
		const widget = await findByTestId("procaptcha-widget");
		expect(widget.textContent).toContain("dappAccount123");
	});

	it("should pass callbacks prop to ProcaptchaWidget", async () => {
		const { findByTestId } = render(<ProcaptchaPow {...mockProps} />);
		const widget = await findByTestId("procaptcha-widget");
		expect(widget.textContent).toContain("callbacks");
	});

	it("should pass i18n prop to ProcaptchaWidget", async () => {
		const { findByTestId } = render(<ProcaptchaPow {...mockProps} />);
		const widget = await findByTestId("procaptcha-widget");
		expect(widget.textContent).toContain("language");
	});

	it("should pass frictionlessState prop when provided", async () => {
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
			restart: vi.fn(),
		};

		const propsWithFrictionless = {
			...mockProps,
			frictionlessState,
		};

		const { findByTestId } = render(
			<ProcaptchaPow {...propsWithFrictionless} />,
		);
		const widget = await findByTestId("procaptcha-widget");
		expect(widget.textContent).toContain("frictionlessState");
	});
});

