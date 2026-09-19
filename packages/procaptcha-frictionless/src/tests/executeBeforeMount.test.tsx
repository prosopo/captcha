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
	type ProcaptchaClientConfigInput,
	type ProcaptchaProps,
	type RandomProvider,
	StartModeEnum,
} from "@prosopo/types";
import { type ReactElement, act, createElement, useEffect } from "react";
import { type Root, createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

declare global {
	var IS_REACT_ACT_ENVIRONMENT: boolean;
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const EXECUTE_EVENT = "procaptcha:execute";

const mocks = vi.hoisted(() => ({
	executes: [] as ("container" | "document")[],
}));

// Listens the way the real inner widgets do: on the container in either
// mode, and on document only when invisible.
const ListeningWidget = (props: ProcaptchaProps) => {
	const { container } = props;
	const invisible = props.config.mode === "invisible";
	useEffect(() => {
		const onContainer = () => mocks.executes.push("container");
		const onDocument = () => mocks.executes.push("document");
		container?.addEventListener(EXECUTE_EVENT, onContainer);
		if (invisible) document.addEventListener(EXECUTE_EVENT, onDocument);
		return () => {
			container?.removeEventListener(EXECUTE_EVENT, onContainer);
			if (invisible) document.removeEventListener(EXECUTE_EVENT, onDocument);
		};
	}, [container, invisible]);
	return createElement("div", { "data-widget": "image" });
};

vi.mock("@prosopo/procaptcha-react", () => ({ Procaptcha: ListeningWidget }));
vi.mock("@prosopo/procaptcha-pow", () => ({ ProcaptchaPow: ListeningWidget }));
vi.mock("@prosopo/procaptcha-puzzle", () => ({
	ProcaptchaPuzzle: ListeningWidget,
}));

vi.mock("@prosopo/procaptcha-common", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("@prosopo/procaptcha-common")>();
	return { ...actual, isSecureBrowserContext: () => true };
});

const { ProcaptchaFrictionless } = await import("../ProcaptchaFrictionless.js");

const config = (
	overrides: Partial<ProcaptchaClientConfigInput> = {},
): ProcaptchaClientConfigInput => ({
	account: { address: "5siteKey" },
	userAccountAddress: "",
	web2: true,
	mode: ModeEnum.invisible,
	startMode: StartModeEnum.auto,
	...overrides,
});

const i18nStub = {
	isInitialized: true,
	language: "en",
	t: (key: string) => key,
	changeLanguage: vi.fn(),
} as unknown as Ti18n;

const detectionResult = (): BotDetectionFunctionResult => ({
	status: "ok",
	captchaType: CaptchaType.image,
	sessionId: "provider-session",
	provider: { provider: { url: "https://provider.test" } } as RandomProvider,
	userAccount: { account: { address: "5FakeUserAccountAddress" } } as Account,
});

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
		await act(async () => {
			resolve?.(detectionResult());
		});
	};
	return { detectBot, finish };
};

let host: HTMLDivElement;
let container: HTMLDivElement;
let root: Root;

const mountWrapper = async (
	detectBot: BotDetectionFunction,
	overrides: Partial<ProcaptchaClientConfigInput> = {},
): Promise<void> => {
	await act(async () => {
		root.render(
			createElement(ProcaptchaFrictionless, {
				config: config(overrides),
				callbacks: {},
				restart: vi.fn(),
				i18n: i18nStub,
				detectBot,
				container,
			}) as ReactElement,
		);
	});
};

const dispatch = async (target: EventTarget): Promise<void> => {
	await act(async () => {
		target.dispatchEvent(new CustomEvent(EXECUTE_EVENT));
	});
};

beforeEach(() => {
	mocks.executes.length = 0;
	host = document.createElement("div");
	container = document.createElement("div");
	document.body.append(host, container);
	act(() => {
		root = createRoot(host);
	});
});

afterEach(() => {
	act(() => {
		root.unmount();
	});
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
