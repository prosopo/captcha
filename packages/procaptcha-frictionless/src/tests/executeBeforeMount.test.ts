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

import type { Ti18n } from "@prosopo/locale";
import {
	type Account,
	type BotDetectionFunction,
	type BotDetectionFunctionResult,
	CaptchaType,
	ModeEnum,
	type ProcaptchaClientConfigOutput,
	type ProcaptchaProps,
	type RandomProvider,
	StartModeEnum,
} from "@prosopo/types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const EXECUTE_EVENT = "procaptcha:execute";

const mocks = vi.hoisted(() => {
	const executes: ("container" | "document")[] = [];
	// Listens the way the real inner widgets do: on the container in either
	// mode, and on document only when invisible.
	const listeningWidget = (host: HTMLElement, props: ProcaptchaProps) => {
		const { container } = props;
		const invisible = "invisible" === props.config.mode;
		const onContainer = () => executes.push("container");
		const onDocument = () => executes.push("document");
		container?.addEventListener(EXECUTE_EVENT, onContainer);
		if (invisible) document.addEventListener(EXECUTE_EVENT, onDocument);
		const element = host.ownerDocument.createElement("div");
		element.setAttribute("data-widget", "image");
		host.appendChild(element);
		return {
			destroy: () => {
				container?.removeEventListener(EXECUTE_EVENT, onContainer);
				if (invisible) document.removeEventListener(EXECUTE_EVENT, onDocument);
				element.remove();
			},
		};
	};
	return { executes, listeningWidget };
});

vi.mock("@prosopo/procaptcha-react", () => ({
	mountProcaptchaImageWidget: mocks.listeningWidget,
}));
vi.mock("@prosopo/procaptcha-pow", () => ({
	mountProcaptchaPowWidget: mocks.listeningWidget,
}));
vi.mock("@prosopo/procaptcha-puzzle", () => ({
	mountProcaptchaPuzzleWidget: mocks.listeningWidget,
}));

// jsdom serves the suite over http, so the widget's own HTTPS guard would
// short-circuit every test before detection ran.
vi.mock("@prosopo/procaptcha-common", async (importOriginal) => ({
	...(await importOriginal<typeof import("@prosopo/procaptcha-common")>()),
	isSecureBrowserContext: () => true,
}));

const { mountProcaptchaFrictionless } = await import(
	"../procaptchaFrictionless.js"
);

const config = (
	overrides: Partial<ProcaptchaClientConfigOutput> = {},
): ProcaptchaClientConfigOutput =>
	({
		account: { address: "5siteKey" },
		userAccountAddress: "",
		web2: true,
		theme: "light",
		mode: ModeEnum.invisible,
		startMode: StartModeEnum.auto,
		...overrides,
	}) as unknown as ProcaptchaClientConfigOutput;

const i18nStub = {
	isInitialized: true,
	language: "en",
	t: (key: string) => key,
	changeLanguage: vi.fn(),
} as unknown as Ti18n;

const detectionResult = (): BotDetectionFunctionResult =>
	({
		status: "ok",
		captchaType: CaptchaType.image,
		sessionId: "provider-session",
		provider: { provider: { url: "https://provider.test" } } as RandomProvider,
		userAccount: { account: { address: "5FakeUserAccountAddress" } } as Account,
	}) as unknown as BotDetectionFunctionResult;

const settle = async (): Promise<void> => {
	await new Promise<void>((resolve: () => void) => setTimeout(resolve, 0));
	await Promise.resolve();
};

interface HeldDetection {
	detectBot: ReturnType<typeof vi.fn<BotDetectionFunction>>;
	finish: () => Promise<void>;
}

const heldDetection = (): HeldDetection => {
	let resolve: ((result: BotDetectionFunctionResult) => void) | undefined;
	const detectBot = vi.fn<BotDetectionFunction>().mockImplementation(
		() =>
			new Promise<BotDetectionFunctionResult>((r) => {
				resolve = r;
			}),
	);
	const finish = async () => {
		resolve?.(detectionResult());
		await settle();
	};
	return { detectBot, finish };
};

let host: HTMLDivElement;
let container: HTMLDivElement;
let widget: { destroy: () => void } | undefined;

const mountWrapper = async (
	detectBot: BotDetectionFunction,
	overrides: Partial<ProcaptchaClientConfigOutput> = {},
): Promise<void> => {
	widget = mountProcaptchaFrictionless(host, {
		config: config(overrides),
		callbacks: {},
		restart: vi.fn(),
		i18n: i18nStub,
		detectBot,
		container,
	});
	await settle();
};

const dispatch = async (target: EventTarget): Promise<void> => {
	target.dispatchEvent(new CustomEvent(EXECUTE_EVENT));
	await settle();
};

beforeEach(() => {
	mocks.executes.length = 0;
	widget = undefined;
	host = document.createElement("div");
	container = document.createElement("div");
	document.body.append(host, container);
});

afterEach(() => {
	widget?.destroy();
	widget = undefined;
	host.remove();
	container.remove();
	vi.clearAllMocks();
});

describe("execute() before the inner widget is listening", () => {
	it("replays a bare execute() once the invisible widget mounts", async () => {
		const { detectBot, finish } = heldDetection();
		await mountWrapper(detectBot);

		await dispatch(document);
		expect(mocks.executes).toEqual([]);

		await finish();

		expect(mocks.executes).toEqual(["container"]);
	});

	it("replays a targeted execute() in visible mode", async () => {
		const { detectBot, finish } = heldDetection();
		await mountWrapper(detectBot, { mode: ModeEnum.visible });

		await dispatch(container);
		await finish();

		expect(mocks.executes).toEqual(["container"]);
	});

	it("replays repeated early calls only once", async () => {
		const { detectBot, finish } = heldDetection();
		await mountWrapper(detectBot);

		await dispatch(document);
		await dispatch(document);
		await finish();

		expect(mocks.executes).toEqual(["container"]);
	});

	it("does not start the widget when execute() was never called", async () => {
		const { detectBot, finish } = heldDetection();
		await mountWrapper(detectBot);

		await finish();

		expect(mocks.executes).toEqual([]);
	});

	it("leaves an execute() after mount to the widget alone", async () => {
		const { detectBot, finish } = heldDetection();
		await mountWrapper(detectBot);
		await finish();

		await dispatch(document);

		expect(mocks.executes).toEqual(["document"]);
	});

	it("ignores a bare execute() in visible mode, as the widgets do", async () => {
		const { detectBot, finish } = heldDetection();
		await mountWrapper(detectBot, { mode: ModeEnum.visible });

		await dispatch(document);
		await finish();

		expect(mocks.executes).toEqual([]);
	});
});
