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
	type BotDetectionFunction,
	type BotDetectionFunctionResult,
	CaptchaType,
	type ProcaptchaClientConfigOutput,
	type ProcaptchaFrictionlessProps,
	type ProcaptchaProps,
} from "@prosopo/types";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

/**
 * The orchestrator decides which solver to mount, tears the previous one down,
 * and owns the recovery paths. Each solver package is stubbed to a probe so a
 * test can read the props it was handed and assert the mount/unmount ordering
 * that used to come free from the reconciler.
 */
const mocks = vi.hoisted(() => {
	const mounted: { solver: string; props: ProcaptchaProps }[] = [];
	const destroyed: string[] = [];
	const probe =
		(solver: string) => (container: HTMLElement, props: ProcaptchaProps) => {
			mounted.push({ solver, props });
			const element = container.ownerDocument.createElement("div");
			element.setAttribute("data-solver", solver);
			container.appendChild(element);
			return {
				destroy: () => {
					element.remove();
					destroyed.push(solver);
				},
			};
		};
	return { mounted, destroyed, probe };
});

// jsdom serves the suite over http, so the widget's own HTTPS guard would
// short-circuit every test before detection ran.
vi.mock("@prosopo/procaptcha-common", async (importOriginal) => ({
	...(await importOriginal<typeof import("@prosopo/procaptcha-common")>()),
	isSecureBrowserContext: () => true,
}));

vi.mock("@prosopo/procaptcha-react", () => ({
	mountProcaptchaImageWidget: mocks.probe("image"),
}));
vi.mock("@prosopo/procaptcha-puzzle", () => ({
	mountProcaptchaPuzzleWidget: mocks.probe("puzzle"),
}));
vi.mock("@prosopo/procaptcha-pow", () => ({
	mountProcaptchaPowWidget: mocks.probe("pow"),
}));

const { mountProcaptchaFrictionless } = await import(
	"../procaptchaFrictionless.js"
);

const SITE_KEY = "5CcNvLUdiXFpzKDMjThGLSK9rhWHA1H4EF3zrgkpkjAdqmuP";

const config = (): ProcaptchaClientConfigOutput =>
	({
		account: { address: SITE_KEY },
		defaultEnvironment: "staging",
		mode: "visible",
		theme: "light",
	}) as unknown as ProcaptchaClientConfigOutput;

const i18n = (): Ti18n =>
	({
		isInitialized: true,
		t: (key: string) => key,
		language: "en",
		changeLanguage: () => Promise.resolve(),
	}) as unknown as Ti18n;

const detection = (
	captchaType: CaptchaType,
	overrides: Partial<BotDetectionFunctionResult> = {},
): BotDetectionFunctionResult =>
	({
		captchaType,
		sessionId: "session-1",
		provider: { providerAccount: "acc", provider: { url: "https://p.one" } },
		userAccount: { account: { address: "user" } },
		...overrides,
	}) as unknown as BotDetectionFunctionResult;

let container: HTMLDivElement;
let widget: { destroy: () => void } | undefined;

const props = (
	detectBot: BotDetectionFunction,
	overrides: Partial<ProcaptchaFrictionlessProps> = {},
): ProcaptchaFrictionlessProps => ({
	config: config(),
	callbacks: {},
	i18n: i18n(),
	restart: () => undefined,
	detectBot,
	...overrides,
});

const settle = async (): Promise<void> => {
	await new Promise<void>((resolve: () => void) => setTimeout(resolve, 0));
	await Promise.resolve();
};

const solvers = (): string[] =>
	Array.from(container.querySelectorAll("[data-solver]")).map(
		(element: Element) => element.getAttribute("data-solver") ?? "",
	);

beforeEach(() => {
	mocks.mounted.length = 0;
	mocks.destroyed.length = 0;
	widget = undefined;
	container = document.createElement("div");
	document.body.appendChild(container);
});

afterEach(() => {
	widget?.destroy();
	widget = undefined;
	container.remove();
});

describe("choosing a solver", () => {
	test("mounts the image widget when the provider asks for one", async () => {
		widget = mountProcaptchaFrictionless(
			container,
			props(() => Promise.resolve(detection(CaptchaType.image))),
		);
		await settle();
		expect(solvers()).toEqual(["image"]);
	});

	test("mounts the puzzle widget when the provider asks for one", async () => {
		widget = mountProcaptchaFrictionless(
			container,
			props(() => Promise.resolve(detection(CaptchaType.puzzle))),
		);
		await settle();
		expect(solvers()).toEqual(["puzzle"]);
	});

	test("falls through to PoW for anything else", async () => {
		widget = mountProcaptchaFrictionless(
			container,
			props(() => Promise.resolve(detection(CaptchaType.pow))),
		);
		await settle();
		expect(solvers()).toEqual(["pow"]);
	});

	test("hands the solver the session the frictionless call minted", async () => {
		widget = mountProcaptchaFrictionless(
			container,
			props(() => Promise.resolve(detection(CaptchaType.image))),
		);
		await settle();
		expect(mocks.mounted[0]?.props.frictionlessState).toMatchObject({
			sessionId: "session-1",
		});
	});

	test("only PoW is given an escalation handler", async () => {
		widget = mountProcaptchaFrictionless(
			container,
			props(() => Promise.resolve(detection(CaptchaType.pow))),
		);
		await settle();
		expect(mocks.mounted[0]?.props.onEscalate).toBeTypeOf("function");
	});
});

describe("the loading placeholder", () => {
	test("shows a checkbox before detection resolves", () => {
		widget = mountProcaptchaFrictionless(
			container,
			props(() => new Promise<BotDetectionFunctionResult>(() => undefined)),
		);
		// The spinner is the checkbox's loading state; either way there must be
		// something widget-shaped on the page while the round trip is in flight.
		expect(container.querySelector('[aria-label="Loading spinner"]')).not.toBe(
			null,
		);
	});

	test("is replaced by the solver, not left behind it", async () => {
		widget = mountProcaptchaFrictionless(
			container,
			props(() => Promise.resolve(detection(CaptchaType.image))),
		);
		await settle();
		expect(
			container.querySelector('[aria-label="Loading spinner"]'),
		).toBeNull();
		expect(solvers()).toEqual(["image"]);
	});

	test("shows the detection error instead of a solver", async () => {
		const onError = vi.fn<(error: Error) => void>();
		widget = mountProcaptchaFrictionless(
			container,
			props(
				() =>
					Promise.resolve(
						detection(CaptchaType.image, {
							error: { message: "no capacity", key: "API.UNKNOWN_ERROR" },
						} as Partial<BotDetectionFunctionResult>),
					),
				{ callbacks: { onError } },
			),
		);
		await settle();
		expect(solvers()).toEqual([]);
		expect(container.textContent).toContain("no capacity");
		expect(onError).toHaveBeenCalledWith(expect.any(Error));
	});
});

describe("escalating from PoW", () => {
	test("swaps PoW for the escalated solver rather than stacking them", async () => {
		// Nothing reconciles this for us: without the explicit teardown the page
		// ends up with two live widgets, two modals and two sets of document
		// listeners.
		widget = mountProcaptchaFrictionless(
			container,
			props(() => Promise.resolve(detection(CaptchaType.pow))),
		);
		await settle();

		mocks.mounted[0]?.props.onEscalate?.(CaptchaType.image, "session-2", {
			x: 4,
			y: 5,
		});
		await settle();

		expect(solvers()).toEqual(["image"]);
		expect(mocks.destroyed).toContain("pow");
	});

	test("carries the new session and the original click into the escalation", async () => {
		widget = mountProcaptchaFrictionless(
			container,
			props(() => Promise.resolve(detection(CaptchaType.pow))),
		);
		await settle();

		mocks.mounted[0]?.props.onEscalate?.(CaptchaType.image, "session-2", {
			x: 4,
			y: 5,
		});
		await settle();

		expect(mocks.mounted[1]?.props).toMatchObject({
			autoStart: true,
			startCoords: { x: 4, y: 5 },
		});
		expect(mocks.mounted[1]?.props.frictionlessState).toMatchObject({
			sessionId: "session-2",
		});
	});
});

describe("recovering an invalidated session", () => {
	test("re-runs detection and remounts with the preserved coordinates", async () => {
		const detectBot = vi
			.fn<BotDetectionFunction>()
			.mockResolvedValueOnce(detection(CaptchaType.image))
			.mockResolvedValue(
				detection(CaptchaType.image, {
					sessionId: "session-2",
				} as Partial<BotDetectionFunctionResult>),
			);
		widget = mountProcaptchaFrictionless(container, props(detectBot));
		await settle();

		mocks.mounted[0]?.props.onSessionInvalidated?.(11, 22);
		await settle();

		expect(detectBot).toHaveBeenCalledTimes(2);
		expect(solvers()).toEqual(["image"]);
		expect(mocks.mounted[1]?.props).toMatchObject({
			autoStart: true,
			startCoords: { x: 11, y: 22 },
		});
	});

	test("recovers once only, so a persistently broken session cannot loop", async () => {
		const detectBot = vi
			.fn<BotDetectionFunction>()
			.mockResolvedValue(detection(CaptchaType.image));
		widget = mountProcaptchaFrictionless(container, props(detectBot));
		await settle();

		mocks.mounted[0]?.props.onSessionInvalidated?.(11, 22);
		await settle();
		mocks.mounted[1]?.props.onSessionInvalidated?.(11, 22);
		await settle();

		expect(detectBot).toHaveBeenCalledTimes(2);
	});
});

describe("tearing down", () => {
	test("takes the mounted solver with it", async () => {
		widget = mountProcaptchaFrictionless(
			container,
			props(() => Promise.resolve(detection(CaptchaType.image))),
		);
		await settle();
		widget.destroy();
		widget = undefined;
		expect(mocks.destroyed).toContain("image");
		expect(container.querySelector("[data-solver]")).toBeNull();
	});

	test("does not mount a solver that resolves after destroy", async () => {
		let release: (result: BotDetectionFunctionResult) => void = () => undefined;
		widget = mountProcaptchaFrictionless(
			container,
			props(
				() =>
					new Promise<BotDetectionFunctionResult>(
						(resolve: (result: BotDetectionFunctionResult) => void) => {
							release = resolve;
						},
					),
			),
		);
		widget.destroy();
		widget = undefined;
		release(detection(CaptchaType.image));
		await settle();
		expect(mocks.mounted).toHaveLength(0);
	});
});
