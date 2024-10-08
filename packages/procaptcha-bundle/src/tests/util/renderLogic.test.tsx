// Copyright 2021-2024 Prosopo (UK) Ltd.
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

import { ProcaptchaPow } from "@prosopo/procaptcha-pow";
import { ProcaptchaConfigSchema, type ProcaptchaProps } from "@prosopo/types";
import { type DOMWindow, JSDOM } from "jsdom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderLogic } from "../../util/renderLogic.js";

interface TestContext {
	document?: Document;
	window?: DOMWindow;
}

vi.mock("@prosopo/detector", async () => {
	return {
		isBot: async () => {
			return { isBot: true };
		},
	};
});

vi.mock("@polkadot/extension-dapp", async () => {
	return {
		web3Enable: async () => {
			return [];
		},
	};
});

vi.mock(
	"@prosopo/procaptcha-pow",
	async () => {
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		return {
			ProcaptchaPow: vi.fn((props: ProcaptchaProps) => {
				return (
					// @ts-ignore
					<div config={props.config} callbacks={props.callbacks}>
						ProcaptchaPow
					</div>
				);
			}),
		};
	},
	//{ spy: true },
);

vi.mock("@prosopo/procaptcha-frictionless", async () => {
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	return {
		ProcaptchaFrictionless: vi.fn((props: ProcaptchaProps) => {
			return (
				// @ts-ignore
				<div config={props.config} callbacks={props.callbacks}>
					ProcaptchaFrictionless
				</div>
			);
		}),
	};
});

describe("Config utility functions", () => {
	let dom: JSDOM;
	let self: DOMWindow;

	beforeEach<TestContext>((context) => {
		dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
			url: "https://example.com",
		});
		context.document = dom.window.document;
		context.window = dom.window;
		// @ts-ignore
		global.window = dom.window;
		global.document = dom.window.document;
		vi.clearAllMocks();
	});

	afterEach<TestContext>((context) => {
		context.document = undefined;
		context.window = undefined;
		vi.clearAllMocks();
	});

	it<TestContext>("renders the correct captcha type", async (ctx) => {
		// @ts-ignore
		const script = ctx.document.createElement("script");
		script.src = "https://example.com/procaptcha.js";
		document.body.appendChild(script);

		expect(ctx.window).toBeDefined();

		if (!ctx.window) {
			expect(true).toBe(false);
			return;
		}

		const config = ProcaptchaConfigSchema.parse({
			account: { address: "1234" },
		});

		renderLogic([script], config, {
			siteKey: "1234",
			captchaType: "pow",
		});

		await vi.waitFor(() => {
			expect(ProcaptchaPow).toHaveBeenCalledTimes(1);
		});
	});

	it<TestContext>("user callbacks should be set when defined on the window and pulled in via data attributes", async (ctx) => {
		// @ts-ignore
		const script = ctx.document.createElement("script");
		script.src = "https://example.com/procaptcha.js";
		// @ts-ignore
		script["data-callback"] = "onHuman";
		// @ts-ignore
		script["data-chalexpired-callback"] = "onChallengeExpired";
		// @ts-ignore
		script["data-expired-callback"] = "onExpired";
		// @ts-ignore
		script["data-error-callback"] = "onError";
		// @ts-ignore
		script["data-close-callback"] = "onClose";
		// @ts-ignore
		script["data-open-callback"] = "onOpen";
		// @ts-ignore
		script["data-failed-callback"] = "onFailed";
		document.body.appendChild(script);

		const onHuman = () => console.log("onHuman");
		const onChallengeExpired = () => console.log("onChallengeExpired");
		const onExpired = () => console.log("onExpired");
		const onError = () => console.log("onError");
		const onClose = () => console.log("onClose");
		const onOpen = () => console.log("onOpen");
		const onFailed = () => console.log("onFailed");

		expect(ctx.window).toBeDefined();

		if (!ctx.window) {
			expect(true).toBe(false);
			return;
		}

		ctx.window.onHuman = onHuman;
		ctx.window.onChallengeExpired = onChallengeExpired;
		ctx.window.onExpired = onExpired;
		ctx.window.onError = onError;
		ctx.window.onClose = onClose;
		ctx.window.onOpen = onOpen;
		ctx.window.onFailed = onFailed;

		const callbacks = {
			onHuman,
			onChallengeExpired,
			onExpired,
			onError,
			onClose,
			onOpen,
			onFailed,
		};

		const config = ProcaptchaConfigSchema.parse({
			account: { address: "1234" },
		});

		renderLogic([script], config, {
			siteKey: "1234",
			captchaType: "pow",
		});

		// override <ProcaptchaPow config={config} callbacks={callbacks} />, in renderLogic.tsx and check that the callbacks
		// are set correctly
		await vi.waitFor(() => {
			expect(ProcaptchaPow).toHaveBeenCalledTimes(1);
			// hack to get mock calls
			const call = ProcaptchaPow.mock.calls[0];
			const props = { config, callbacks };
			// TODO update when expect(ProcaptchaPow).toHaveBeenCalledWith is working with deep equality
			expect(JSON.stringify(call[0])).to.equal(JSON.stringify(props));
		});
	});
});
