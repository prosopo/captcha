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
	PROCAPTCHA_START_EVENT,
	type ProcaptchaClientConfigOutput,
	type ProcaptchaFrictionlessProps,
	type ProcaptchaProps,
	type ProcaptchaStartEventDetail,
	type RandomProvider,
	StartModeEnum,
} from "@prosopo/types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type InnerWidget = "pow" | "image" | "puzzle";

const mocks = vi.hoisted(() => {
	const mounts: {
		widget: "pow" | "image" | "puzzle";
		props: ProcaptchaProps;
	}[] = [];
	const stub =
		(widget: "pow" | "image" | "puzzle") =>
		(container: HTMLElement, props: ProcaptchaProps) => {
			mounts.push({ widget, props });
			const element = container.ownerDocument.createElement("div");
			element.setAttribute("data-widget", widget);
			container.appendChild(element);
			return { destroy: () => element.remove() };
		};
	return { mounts, stub };
});

vi.mock("@prosopo/procaptcha-pow", () => ({
	mountProcaptchaPowWidget: mocks.stub("pow"),
}));
vi.mock("@prosopo/procaptcha-react", () => ({
	mountProcaptchaImageWidget: mocks.stub("image"),
}));
vi.mock("@prosopo/procaptcha-puzzle", () => ({
	mountProcaptchaPuzzleWidget: mocks.stub("puzzle"),
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

const SITE_KEY = "5siteKey";
const SESSION_ID = "provider-session";

const config = (
	overrides: Partial<ProcaptchaClientConfigOutput> = {},
): ProcaptchaClientConfigOutput =>
	({
		account: { address: SITE_KEY },
		userAccountAddress: "",
		web2: true,
		theme: "light",
		mode: ModeEnum.visible,
		startMode: StartModeEnum.manual,
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
		sessionId: SESSION_ID,
		provider: { provider: { url: "https://provider.test" } } as RandomProvider,
		userAccount: { account: { address: "5FakeUserAccountAddress" } } as Account,
	}) as unknown as BotDetectionFunctionResult;

const detectBotResolving = () =>
	vi.fn<BotDetectionFunction>().mockResolvedValue(detectionResult());

let host: HTMLDivElement;
let widget: { destroy: () => void } | undefined;

const settle = async (): Promise<void> => {
	await new Promise<void>((resolve: () => void) => setTimeout(resolve, 0));
	await Promise.resolve();
};

interface MountOptions {
	config?: ProcaptchaClientConfigOutput;
	detectBot?: ReturnType<typeof detectBotResolving>;
	container?: HTMLElement;
}

const mountWrapper = async (
	options: MountOptions = {},
): Promise<ReturnType<typeof detectBotResolving>> => {
	const detectBot = options.detectBot ?? detectBotResolving();
	const props: ProcaptchaFrictionlessProps = {
		config: options.config ?? config(),
		callbacks: {},
		restart: vi.fn(),
		i18n: i18nStub,
		detectBot,
		container: options.container,
	};
	widget = mountProcaptchaFrictionless(host, props);
	await settle();
	return detectBot;
};

const checkbox = (): HTMLInputElement => {
	const element = host.querySelector<HTMLInputElement>(
		'[data-cy="captcha-checkbox"]',
	);
	if (!element) throw new Error("expected the checkbox to be on the page");
	return element;
};

const spinner = (): Element | null => host.querySelector('[role="status"]');

const lastMountOf = (target: InnerWidget) => {
	const mount = mocks.mounts.filter((m) => m.widget === target).at(-1);
	if (!mount) throw new Error(`expected the ${target} widget to have mounted`);
	return mount;
};

// jsdom exposes `isTrusted` as a non-configurable accessor on its internal
// implementation object, so the flag has to be pinned there.
const setTrusted = (event: Event, trusted: boolean): void => {
	for (const symbol of Object.getOwnPropertySymbols(event)) {
		const impl: unknown = Reflect.get(event, symbol);
		if (impl && typeof impl === "object" && "isTrusted" in impl) {
			Object.defineProperty(impl, "isTrusted", {
				configurable: true,
				get: () => trusted,
				set: () => undefined,
			});
			return;
		}
	}
	throw new Error("could not reach the jsdom event implementation");
};

interface ClickOptions {
	trusted?: boolean;
	clientX?: number;
	clientY?: number;
}

const click = async (
	element: Element,
	options: ClickOptions = {},
): Promise<void> => {
	const event = new MouseEvent("click", {
		bubbles: true,
		cancelable: true,
		clientX: options.clientX ?? 0,
		clientY: options.clientY ?? 0,
	});
	setTrusted(event, options.trusted ?? true);
	element.dispatchEvent(event);
	await settle();
};

const dispatchStart = async (
	detail?: ProcaptchaStartEventDetail,
): Promise<void> => {
	document.dispatchEvent(
		new CustomEvent<ProcaptchaStartEventDetail>(PROCAPTCHA_START_EVENT, {
			detail,
			bubbles: true,
		}),
	);
	await settle();
};

const dispatchExecute = async (): Promise<void> => {
	document.dispatchEvent(new CustomEvent("procaptcha:execute"));
	await settle();
};

beforeEach(() => {
	mocks.mounts.length = 0;
	widget = undefined;
	host = document.createElement("div");
	document.body.appendChild(host);
});

afterEach(() => {
	widget?.destroy();
	widget = undefined;
	host.remove();
	vi.clearAllMocks();
});

describe("manual start mode", () => {
	it("mounts a live checkbox without running detection", async () => {
		const detectBot = await mountWrapper();

		expect(detectBot).not.toHaveBeenCalled();
		expect(mocks.mounts).toHaveLength(0);
		expect(checkbox().disabled).toBe(false);
		expect(spinner()).toBeNull();
	});

	it("still runs detection on mount in auto mode", async () => {
		const detectBot = await mountWrapper({
			config: config({ startMode: StartModeEnum.auto }),
		});

		expect(detectBot).toHaveBeenCalledTimes(1);
		expect(lastMountOf("image").props.autoStart).toBe(false);
	});

	it("defaults to auto when no start mode is given", async () => {
		const detectBot = await mountWrapper({
			config: config({ startMode: undefined }),
		});

		expect(detectBot).toHaveBeenCalledTimes(1);
	});

	describe("started by the site", () => {
		it("runs detection on procaptcha:start and leaves the widget waiting for a click", async () => {
			const detectBot = await mountWrapper();

			await dispatchStart();

			expect(detectBot).toHaveBeenCalledTimes(1);
			const mount = lastMountOf("image").props;
			expect(mount.autoStart).toBe(false);
			expect(mount.startCoords).toBeUndefined();
			expect(mount.frictionlessState?.sessionId).toBe(SESSION_ID);
		});

		it("honours an event addressed to its own element", async () => {
			const widgetElement = document.createElement("div");
			const container = document.createElement("div");
			widgetElement.appendChild(container);
			const detectBot = await mountWrapper({ container });

			await dispatchStart({ element: widgetElement });

			expect(detectBot).toHaveBeenCalledTimes(1);
		});

		it("ignores an event addressed to another widget's element", async () => {
			const container = document.createElement("div");
			document.createElement("div").appendChild(container);
			const detectBot = await mountWrapper({ container });

			await dispatchStart({ element: document.createElement("div") });

			expect(detectBot).not.toHaveBeenCalled();
			expect(checkbox().disabled).toBe(false);
		});

		it("receives every event when mounted without a container", async () => {
			const detectBot = await mountWrapper();

			await dispatchStart({ element: document.createElement("div") });

			expect(detectBot).toHaveBeenCalledTimes(1);
		});

		it("opens the challenge straight away on procaptcha:execute", async () => {
			const detectBot = await mountWrapper({
				config: config({ mode: ModeEnum.invisible }),
			});

			await dispatchExecute();

			expect(detectBot).toHaveBeenCalledTimes(1);
			expect(lastMountOf("image").props.autoStart).toBe(true);
		});

		it("ignores the events once started", async () => {
			const detectBot = await mountWrapper();

			await dispatchStart();
			await dispatchStart();
			await dispatchExecute();

			expect(detectBot).toHaveBeenCalledTimes(1);
			expect(mocks.mounts).toHaveLength(1);
		});

		it("does not react to the events in auto mode", async () => {
			const detectBot = await mountWrapper({
				config: config({ startMode: StartModeEnum.auto }),
			});
			expect(detectBot).toHaveBeenCalledTimes(1);

			await dispatchStart();

			expect(detectBot).toHaveBeenCalledTimes(1);
		});
	});

	describe("started by the user", () => {
		it("runs detection on a checkbox click and opens the challenge where the user clicked", async () => {
			const detectBot = await mountWrapper();

			await click(checkbox(), { clientX: 11, clientY: 22 });

			expect(detectBot).toHaveBeenCalledTimes(1);
			const mount = lastMountOf("image").props;
			expect(mount.autoStart).toBe(true);
			expect(mount.startCoords).toEqual({ x: 11, y: 22 });
		});

		it("opens the challenge after a keyboard activation with no position", async () => {
			const detectBot = await mountWrapper();

			await click(checkbox());

			expect(detectBot).toHaveBeenCalledTimes(1);
			const mount = lastMountOf("image").props;
			expect(mount.autoStart).toBe(true);
			expect(mount.startCoords).toBeUndefined();
		});

		it("shows the spinner while the deferred flow runs", async () => {
			let finish: ((result: BotDetectionFunctionResult) => void) | undefined;
			const detectBot = vi.fn<BotDetectionFunction>().mockImplementation(
				() =>
					new Promise<BotDetectionFunctionResult>((resolve) => {
						finish = resolve;
					}),
			);
			await mountWrapper({ detectBot });

			await click(checkbox(), { clientX: 1, clientY: 1 });

			expect(spinner()).not.toBeNull();
			expect(mocks.mounts).toHaveLength(0);

			finish?.(detectionResult());
			await settle();

			expect(spinner()).toBeNull();
			expect(lastMountOf("image").props.autoStart).toBe(true);
		});

		it("ignores a synthetic click", async () => {
			const detectBot = await mountWrapper();

			await click(checkbox(), { trusted: false, clientX: 1, clientY: 1 });

			expect(detectBot).not.toHaveBeenCalled();
		});

		it("starts once even if the site also asks", async () => {
			const detectBot = await mountWrapper();

			await click(checkbox(), { clientX: 3, clientY: 4 });
			await dispatchStart();

			expect(detectBot).toHaveBeenCalledTimes(1);
			expect(mocks.mounts).toHaveLength(1);
			expect(lastMountOf("image").props.startCoords).toEqual({ x: 3, y: 4 });
		});
	});
});
