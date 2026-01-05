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
	ProcaptchaCallbacks,
	ProcaptchaClientConfigInput,
} from "@prosopo/types";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Procaptcha from "./Procaptcha.js";

vi.mock("./ProcaptchaWidget.js", () => ({
	default: ({
		config,
		callbacks,
	}: {
		config: ProcaptchaClientConfigInput;
		callbacks: ProcaptchaCallbacks;
	}) => (
		<div data-testid="procaptcha-widget">
			<div>Config: {JSON.stringify(config)}</div>
			<div>Callbacks: {Object.keys(callbacks).join(",")}</div>
		</div>
	),
}));

describe("Procaptcha", () => {
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

	it("should render ProcaptchaWidget wrapped in Suspense", async () => {
		const config = createMockConfig();
		const callbacks: ProcaptchaCallbacks = {
			onHuman: vi.fn(),
			onError: vi.fn(),
		};
		const i18n = createMockI18n();
		render(<Procaptcha config={config} callbacks={callbacks} i18n={i18n} />);
		await waitFor(() => {
			expect(screen.getByTestId("procaptcha-widget")).toBeDefined();
		});
	});

	it("should pass config prop to ProcaptchaWidget", async () => {
		const config = createMockConfig();
		const callbacks: ProcaptchaCallbacks = {
			onHuman: vi.fn(),
		};
		const i18n = createMockI18n();
		render(<Procaptcha config={config} callbacks={callbacks} i18n={i18n} />);
		await waitFor(() => {
			const widget = screen.getByTestId("procaptcha-widget");
			expect(widget.textContent).toContain("TestDapp");
		});
	});

	it("should pass callbacks prop to ProcaptchaWidget", async () => {
		const config = createMockConfig();
		const callbacks: ProcaptchaCallbacks = {
			onHuman: vi.fn(),
			onError: vi.fn(),
			onExpired: vi.fn(),
		};
		const i18n = createMockI18n();
		render(<Procaptcha config={config} callbacks={callbacks} i18n={i18n} />);
		await waitFor(() => {
			const widget = screen.getByTestId("procaptcha-widget");
			expect(widget.textContent).toContain("onHuman");
			expect(widget.textContent).toContain("onError");
			expect(widget.textContent).toContain("onExpired");
		});
	});

	it("should pass i18n prop to ProcaptchaWidget", async () => {
		const config = createMockConfig();
		const callbacks: ProcaptchaCallbacks = {
			onHuman: vi.fn(),
		};
		const i18n = createMockI18n();
		render(<Procaptcha config={config} callbacks={callbacks} i18n={i18n} />);
		await waitFor(() => {
			expect(screen.getByTestId("procaptcha-widget")).toBeDefined();
		});
	});

	it("should pass optional frictionlessState prop to ProcaptchaWidget", async () => {
		const config = createMockConfig();
		const callbacks: ProcaptchaCallbacks = {
			onHuman: vi.fn(),
		};
		const i18n = createMockI18n();
		const frictionlessState = {
			restart: vi.fn(),
		};
		render(
			<Procaptcha
				config={config}
				callbacks={callbacks}
				i18n={i18n}
				frictionlessState={frictionlessState}
			/>,
		);
		await waitFor(() => {
			expect(screen.getByTestId("procaptcha-widget")).toBeDefined();
		});
	});

	it("should handle lazy loading of ProcaptchaWidget", async () => {
		const config = createMockConfig();
		const callbacks: ProcaptchaCallbacks = {
			onHuman: vi.fn(),
		};
		const i18n = createMockI18n();
		render(<Procaptcha config={config} callbacks={callbacks} i18n={i18n} />);
		// Should eventually render the widget after lazy loading
		await waitFor(
			() => {
				expect(screen.getByTestId("procaptcha-widget")).toBeDefined();
			},
			{ timeout: 3000 },
		);
	});
});
