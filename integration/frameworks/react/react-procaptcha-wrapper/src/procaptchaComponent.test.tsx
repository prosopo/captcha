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

import { renderProcaptcha } from "@prosopo/procaptcha-wrapper";
import type { ProcaptchaRenderOptions } from "@prosopo/procaptcha-wrapper";
import { type Root, createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProcaptchaComponent } from "./procaptchaComponent.js";

vi.mock("@prosopo/procaptcha-wrapper", () => ({
	renderProcaptcha: vi.fn(),
}));

describe("ProcaptchaComponent", () => {
	const mockRenderProcaptcha = vi.mocked(renderProcaptcha);
	let container: HTMLDivElement;
	let root: Root;

	beforeEach(() => {
		container = document.createElement("div");
		document.body.appendChild(container);
		root = createRoot(container);
		vi.clearAllMocks();
	});

	afterEach(() => {
		root.unmount();
		document.body.removeChild(container);
		vi.clearAllMocks();
	});

	it("renders a div element", async () => {
		const props: ProcaptchaRenderOptions & {
			htmlAttributes: Record<string, unknown>;
		} = {
			siteKey: "test-site-key",
			htmlAttributes: {},
		};

		root.render(<ProcaptchaComponent {...props} />);

		await vi.waitFor(() => {
			const div = container.querySelector("div");
			expect(div).toBeTruthy();
		});
	});

	it("calls renderProcaptcha with correct element and options when element is mounted", async () => {
		const props: ProcaptchaRenderOptions & {
			htmlAttributes: Record<string, unknown>;
		} = {
			siteKey: "test-site-key",
			htmlAttributes: {},
		};

		root.render(<ProcaptchaComponent {...props} />);

		await vi.waitFor(() => {
			expect(mockRenderProcaptcha).toHaveBeenCalledTimes(1);
		});

		const div = container.querySelector("div");
		expect(div).toBeTruthy();
		expect(mockRenderProcaptcha).toHaveBeenCalledWith(div, props);
	});

	it("applies htmlAttributes to the div element", async () => {
		const props: ProcaptchaRenderOptions & {
			htmlAttributes: Record<string, unknown>;
		} = {
			siteKey: "test-site-key",
			htmlAttributes: {
				id: "test-id",
				className: "test-class",
				"data-testid": "test-element",
			},
		};

		root.render(<ProcaptchaComponent {...props} />);

		await vi.waitFor(() => {
			const div = container.querySelector("div");
			expect(div).toBeTruthy();
			expect(div?.getAttribute("id")).toBe("test-id");
			expect(div?.getAttribute("class")).toBe("test-class");
			expect(div?.getAttribute("data-testid")).toBe("test-element");
		});
	});

	it("handles empty htmlAttributes object", async () => {
		const props: ProcaptchaRenderOptions & {
			htmlAttributes: Record<string, unknown>;
		} = {
			siteKey: "test-site-key",
			htmlAttributes: {},
		};

		root.render(<ProcaptchaComponent {...props} />);

		await vi.waitFor(() => {
			const div = container.querySelector("div");
			expect(div).toBeTruthy();
			expect(mockRenderProcaptcha).toHaveBeenCalledTimes(1);
		});
	});

	it("calls renderProcaptcha with all ProcaptchaRenderOptions properties", async () => {
		const props: ProcaptchaRenderOptions & {
			htmlAttributes: Record<string, unknown>;
		} = {
			siteKey: "test-site-key",
			theme: "dark",
			captchaType: "pow",
			language: "en",
			size: "invisible",
			web3: true,
			userAccountAddress: "0x1234567890abcdef",
			htmlAttributes: {},
		};

		root.render(<ProcaptchaComponent {...props} />);

		await vi.waitFor(() => {
			expect(mockRenderProcaptcha).toHaveBeenCalledTimes(1);
		});

		const callArgs = mockRenderProcaptcha.mock.calls[0];
		expect(callArgs[1]).toMatchObject({
			siteKey: "test-site-key",
			theme: "dark",
			captchaType: "pow",
			language: "en",
			size: "invisible",
			web3: true,
			userAccountAddress: "0x1234567890abcdef",
		});
	});

	it("calls renderProcaptcha with callback functions", async () => {
		const callback = vi.fn();
		const props: ProcaptchaRenderOptions & {
			htmlAttributes: Record<string, unknown>;
		} = {
			siteKey: "test-site-key",
			callback,
			"expired-callback": callback,
			"error-callback": callback,
			htmlAttributes: {},
		};

		root.render(<ProcaptchaComponent {...props} />);

		await vi.waitFor(() => {
			expect(mockRenderProcaptcha).toHaveBeenCalledTimes(1);
		});

		const callArgs = mockRenderProcaptcha.mock.calls[0];
		expect(callArgs[1].callback).toBe(callback);
		expect(callArgs[1]["expired-callback"]).toBe(callback);
		expect(callArgs[1]["error-callback"]).toBe(callback);
	});

	it("calls renderProcaptcha with string callbacks", async () => {
		const props: ProcaptchaRenderOptions & {
			htmlAttributes: Record<string, unknown>;
		} = {
			siteKey: "test-site-key",
			callback: "onSuccess",
			"expired-callback": "onExpired",
			htmlAttributes: {},
		};

		root.render(<ProcaptchaComponent {...props} />);

		await vi.waitFor(() => {
			expect(mockRenderProcaptcha).toHaveBeenCalledTimes(1);
		});

		const callArgs = mockRenderProcaptcha.mock.calls[0];
		expect(callArgs[1].callback).toBe("onSuccess");
		expect(callArgs[1]["expired-callback"]).toBe("onExpired");
	});

	it("re-calls renderProcaptcha when properties change", async () => {
		const initialProps: ProcaptchaRenderOptions & {
			htmlAttributes: Record<string, unknown>;
		} = {
			siteKey: "test-site-key",
			htmlAttributes: {},
		};

		root.render(<ProcaptchaComponent {...initialProps} />);

		await vi.waitFor(() => {
			expect(mockRenderProcaptcha).toHaveBeenCalledTimes(1);
		});

		const updatedProps: ProcaptchaRenderOptions & {
			htmlAttributes: Record<string, unknown>;
		} = {
			siteKey: "updated-site-key",
			theme: "dark",
			htmlAttributes: {},
		};

		root.render(<ProcaptchaComponent {...updatedProps} />);

		await vi.waitFor(() => {
			expect(mockRenderProcaptcha).toHaveBeenCalledTimes(2);
		});

		expect(mockRenderProcaptcha.mock.calls[1][1]).toMatchObject({
			siteKey: "updated-site-key",
			theme: "dark",
		});
	});

	it("calls renderProcaptcha when element is mounted", async () => {
		const props: ProcaptchaRenderOptions & {
			htmlAttributes: Record<string, unknown>;
		} = {
			siteKey: "test-site-key",
			htmlAttributes: {},
		};

		root.render(<ProcaptchaComponent {...props} />);

		await vi.waitFor(() => {
			expect(mockRenderProcaptcha).toHaveBeenCalled();
		});
	});

	it("handles minimal required props", async () => {
		const props: ProcaptchaRenderOptions & {
			htmlAttributes: Record<string, unknown>;
		} = {
			siteKey: "minimal-key",
			htmlAttributes: {},
		};

		root.render(<ProcaptchaComponent {...props} />);

		await vi.waitFor(() => {
			expect(mockRenderProcaptcha).toHaveBeenCalledTimes(1);
		});

		const callArgs = mockRenderProcaptcha.mock.calls[0];
		expect(callArgs[1].siteKey).toBe("minimal-key");
	});

	it("handles all optional ProcaptchaRenderOptions", async () => {
		const props: ProcaptchaRenderOptions & {
			htmlAttributes: Record<string, unknown>;
		} = {
			siteKey: "test-site-key",
			theme: "light",
			captchaType: "frictionless",
			callback: "testCallback",
			"challenge-valid-length": "300",
			"chalexpired-callback": "chalExpired",
			"expired-callback": "expired",
			"open-callback": "open",
			"close-callback": "close",
			"error-callback": "error",
			"failed-callback": "failed",
			"reset-callback": "reset",
			language: "en",
			size: "invisible",
			web3: false,
			userAccountAddress: "0xabcdef",
			htmlAttributes: {},
		};

		root.render(<ProcaptchaComponent {...props} />);

		await vi.waitFor(() => {
			expect(mockRenderProcaptcha).toHaveBeenCalledTimes(1);
		});

		const callArgs = mockRenderProcaptcha.mock.calls[0];
		expect(callArgs[1]).toMatchObject({
			siteKey: "test-site-key",
			theme: "light",
			captchaType: "frictionless",
			callback: "testCallback",
			"challenge-valid-length": "300",
			"chalexpired-callback": "chalExpired",
			"expired-callback": "expired",
			"open-callback": "open",
			"close-callback": "close",
			"error-callback": "error",
			"failed-callback": "failed",
			"reset-callback": "reset",
			language: "en",
			size: "invisible",
			web3: false,
			userAccountAddress: "0xabcdef",
		});
	});

	it("applies multiple htmlAttributes correctly", async () => {
		const props: ProcaptchaRenderOptions & {
			htmlAttributes: Record<string, unknown>;
		} = {
			siteKey: "test-site-key",
			htmlAttributes: {
				id: "my-id",
				className: "my-class",
				style: { color: "red" },
				"aria-label": "Procaptcha component",
				"data-custom": "custom-value",
			},
		};

		root.render(<ProcaptchaComponent {...props} />);

		await vi.waitFor(() => {
			const div = container.querySelector("div");
			expect(div).toBeTruthy();
			expect(div?.getAttribute("id")).toBe("my-id");
			expect(div?.getAttribute("class")).toBe("my-class");
			expect(div?.getAttribute("aria-label")).toBe("Procaptcha component");
			expect(div?.getAttribute("data-custom")).toBe("custom-value");
		});
	});
});
