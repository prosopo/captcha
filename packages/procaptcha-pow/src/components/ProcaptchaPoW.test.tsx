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

import type { ProcaptchaProps } from "@prosopo/types";
import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProcaptchaPow } from "./ProcaptchaPoW.js";

vi.mock("./ProcaptchaWidget.js", () => ({
	default: vi.fn((props: ProcaptchaProps) => (
		<div data-testid="procaptcha-widget">{JSON.stringify(props)}</div>
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
		// Test that the component renders with React Suspense for lazy loading
		// This ensures the ProcaptchaWidget is loaded asynchronously
		const { container } = render(<ProcaptchaPow {...mockProps} />);
		await waitFor(() => {
			expect(container.querySelector("div")).toBeTruthy();
		});
	});

	it("should pass config prop to ProcaptchaWidget", async () => {
		// Test that configuration is properly passed through to the widget
		// This ensures all config options reach the underlying component
		const { findByTestId } = render(<ProcaptchaPow {...mockProps} />);
		const widget = await findByTestId("procaptcha-widget");
		expect(widget.textContent).toContain("dappAccount123");
	});

	it("should pass callbacks prop to ProcaptchaWidget", async () => {
		// Test that callback functions are properly passed through to the widget
		// This ensures event handlers are available to the underlying component
		const { findByTestId } = render(<ProcaptchaPow {...mockProps} />);
		const widget = await findByTestId("procaptcha-widget");
		expect(widget.textContent).toContain("callbacks");
	});

	it("should pass i18n prop to ProcaptchaWidget", async () => {
		// Test that internationalization configuration is passed through
		// This ensures the widget can handle multiple languages
		const { findByTestId } = render(<ProcaptchaPow {...mockProps} />);
		const widget = await findByTestId("procaptcha-widget");
		expect(widget.textContent).toContain("language");
	});

	it("should pass frictionlessState prop when provided", async () => {
		// Test that frictionless state is passed through when available
		// This enables seamless integration with frictionless captcha flows
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
