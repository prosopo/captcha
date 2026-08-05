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
	ModeEnum,
	type ProcaptchaProps,
	type ProcaptchaState,
} from "@prosopo/types";
import {
	type Mock,
	afterEach,
	beforeEach,
	describe,
	expect,
	test,
	vi,
} from "vitest";
import {
	type ProcaptchaPowHandle,
	mountProcaptchaPowWidget,
} from "../components/procaptchaWidget.js";
import { type Mounted, fire, mount, settle } from "./domHarness.js";
import { config, frictionless } from "./managerHarness.js";

/**
 * The widget is a thin shell over the manager: these tests cover the wiring it
 * owns — when a solve is triggered, what coordinates it carries, and what it
 * does with an invalidated session — with the manager itself stubbed out.
 */
const mocks = vi.hoisted(() => {
	const start = vi.fn<(x?: number, y?: number) => Promise<void>>();
	const resetState = vi.fn<() => void>();
	const constructions: {
		updateState: (next: Partial<ProcaptchaState>) => void;
		getHoneypotValue?: () => string | undefined;
	}[] = [];
	const loadI18next = vi.fn<(a?: boolean, b?: string) => Promise<unknown>>();
	const translationsReady = { current: true };
	return {
		translationsReady,
		start,
		resetState,
		constructions,
		loadI18next,
	};
});

vi.mock("../services/Manager.js", () => ({
	Manager: (
		_config: unknown,
		_state: ProcaptchaState,
		updateState: (next: Partial<ProcaptchaState>) => void,
		_callbacks: unknown,
		_frictionlessState: unknown,
		_onEscalate: unknown,
		getHoneypotValue?: () => string | undefined,
	) => {
		mocks.constructions.push({ updateState, getHoneypotValue });
		return { start: mocks.start, resetState: mocks.resetState };
	},
}));

vi.mock("@prosopo/locale", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@prosopo/locale")>();
	return {
		...actual,
		loadI18next: mocks.loadI18next,
		createTranslator: () => ({
			t: (key: string) => key,
			isReady: () => mocks.translationsReady.current,
			subscribe: () => () => undefined,
			i18n: undefined,
		}),
	};
});

let mounted: Mounted;
let widget: ProcaptchaPowHandle | undefined;

const i18nStub = (
	language: string,
	changeLanguage: Mock<(l: string) => void>,
) => ({ language, changeLanguage }) as unknown as Ti18n;

const props = (overrides: Partial<ProcaptchaProps> = {}): ProcaptchaProps => ({
	config: config(),
	callbacks: {},
	i18n: undefined as unknown as Ti18n,
	...overrides,
});

const render = (widgetProps: ProcaptchaProps): void => {
	widget = mountProcaptchaPowWidget(mounted.container, widgetProps);
};

beforeEach(() => {
	vi.clearAllMocks();
	mocks.constructions.length = 0;
	mocks.translationsReady.current = true;
	mocks.start.mockResolvedValue(undefined);
	mocks.loadI18next.mockResolvedValue(undefined);
	widget = undefined;
	mounted = mount();
});

afterEach(() => {
	widget?.destroy();
	widget = undefined;
	mounted.unmount();
	vi.restoreAllMocks();
});

const checkbox = (): HTMLInputElement => {
	const element = mounted.container.querySelector<HTMLInputElement>(
		'input[type="checkbox"]',
	);
	if (!element) throw new Error("expected a checkbox to be rendered");
	return element;
};

const honeypotInput = (): HTMLInputElement => {
	const element = document.querySelector<HTMLInputElement>(
		'input[name="email_confirm"]',
	);
	if (!element) throw new Error("expected a honeypot to be rendered");
	return element;
};

const spinner = (): Element | null =>
	mounted.container.querySelector('[aria-label="Loading spinner"]');

interface ClickOptions {
	trusted?: boolean;
	clientX?: number;
	clientY?: number;
	touches?: { clientX: number; clientY: number }[];
}

/** Click the real checkbox with the browser event a user would produce. */
const click = (options: ClickOptions = {}): void => {
	fire(checkbox(), "click", options);
};

const setState = async (next: Partial<ProcaptchaState>): Promise<void> => {
	mocks.constructions[0]?.updateState(next);
	await settle();
};

describe("what the widget renders", () => {
	test("a visible widget shows a checkbox", () => {
		render(props());
		expect(checkbox()).toBeDefined();
	});

	test("an invisible widget shows no checkbox at all", () => {
		render(props({ config: config({ mode: ModeEnum.invisible }) }));
		expect(
			mounted.container.querySelector('input[type="checkbox"]'),
		).toBeNull();
	});

	test("a session with a honeypot question renders the honeypot", () => {
		render(
			props({ frictionlessState: frictionless({ hp: btoa("question") }) }),
		);
		expect(honeypotInput()).toBeDefined();
		expect(document.body.textContent).toContain("question");
	});

	test("a session without one renders no bait at all", () => {
		render(props({ frictionlessState: frictionless() }));
		expect(document.querySelector('input[name="email_confirm"]')).toBeNull();
	});

	test("an invisible widget still renders the honeypot, as bait", () => {
		render(
			props({
				config: config({ mode: ModeEnum.invisible }),
				frictionlessState: frictionless({ hp: btoa("question") }),
			}),
		);
		expect(honeypotInput()).toBeDefined();
	});

	test("the manager can read the honeypot input the widget rendered", () => {
		render(
			props({ frictionlessState: frictionless({ hp: btoa("question") }) }),
		);
		honeypotInput().value = "bot@example.com";
		expect(mocks.constructions[0]?.getHoneypotValue?.()).toBe(
			"bot@example.com",
		);
	});

	test("a dark-themed widget still renders its checkbox", () => {
		render(props({ config: config({ theme: "dark" }) }));
		expect(checkbox()).toBeDefined();
	});

	test("the checkbox is labelled once the translations are ready", () => {
		render(props());
		expect(checkbox().getAttribute("aria-label")).toBe("WIDGET.I_AM_HUMAN");
	});

	test("the checkbox is left unlabelled until the translations load", () => {
		// A key like WIDGET.I_AM_HUMAN rendered raw is worse than no label.
		mocks.translationsReady.current = false;
		render(props());
		expect(checkbox().getAttribute("aria-label")).toBe("");
	});

	test("a page that registered no callbacks still renders", () => {
		// Consumers reach this component from plain JavaScript, where the prop
		// can simply be absent.
		render(
			props({
				callbacks: undefined as unknown as ProcaptchaProps["callbacks"],
			}),
		);
		expect(checkbox()).toBeDefined();
	});

	test("the checkbox shows the current error", async () => {
		render(props());
		await setState({
			error: { message: "no session", key: "API.UNKNOWN_ERROR" },
		});
		expect(mounted.container.textContent).toContain("no session");
	});

	test("an unfilled honeypot reads as nothing, not as an empty answer", () => {
		render(
			props({ frictionlessState: frictionless({ hp: btoa("question") }) }),
		);
		expect(mocks.constructions[0]?.getHoneypotValue?.()).toBeUndefined();
	});

	test("with no honeypot rendered the reader still answers safely", () => {
		render(props());
		expect(mocks.constructions[0]?.getHoneypotValue?.()).toBeUndefined();
	});

	test("the honeypot leaves the page with the widget", () => {
		render(
			props({ frictionlessState: frictionless({ hp: btoa("question") }) }),
		);
		widget?.destroy();
		widget = undefined;
		expect(document.querySelector('input[name="email_confirm"]')).toBeNull();
	});
});

describe("starting a solve", () => {
	test("a click starts the manager with the coordinates of the click", () => {
		render(props());
		click({ clientX: 12, clientY: 34 });
		expect(mocks.start).toHaveBeenCalledWith(12, 34);
	});

	test("a tap is read from the touch that produced it", () => {
		render(props());
		click({ touches: [{ clientX: 7, clientY: 9 }] });
		expect(mocks.start).toHaveBeenCalledWith(7, 9);
	});

	test("a tap with no touches falls back to the pointer coordinates", () => {
		render(props());
		click({ touches: [], clientX: 3, clientY: 4 });
		expect(mocks.start).toHaveBeenCalledWith(3, 4);
	});

	test("a synthetic click never reaches the manager", () => {
		// The checkbox drops untrusted events before the widget sees them, so an
		// automated solver cannot start a session at all. The widget's own
		// isTrusted guard on the coordinates is defence in depth behind it.
		render(props());
		click({ trusted: false, clientX: 12, clientY: 34 });
		expect(mocks.start).not.toHaveBeenCalled();
	});

	test("a keyboard activation is treated as the origin", () => {
		render(props());
		fire(checkbox(), "keydown", { key: "Enter" });
		expect(mocks.start).toHaveBeenCalledWith(0, 0);
	});

	test("the checkbox shows a spinner for as long as the solve runs", async () => {
		let release = (): void => undefined;
		mocks.start.mockImplementation(
			() =>
				new Promise<void>((resolve: () => void) => {
					release = () => resolve();
				}),
		);
		render(props());
		click();
		await settle();
		expect(spinner()).not.toBeNull();
		release();
		await settle();
		expect(spinner()).toBeNull();
	});

	test("a solve that rejects still clears the spinner", async () => {
		// Nothing else would: the promise is not awaited by the caller, so the
		// rejection used to escape unhandled with the spinner still turning.
		vi.spyOn(console, "error").mockImplementation(() => undefined);
		mocks.start.mockRejectedValue(new Error("provider down"));
		render(props({ autoStart: true }));
		await settle();
		expect(spinner()).toBeNull();
	});

	test("a click whose solve rejects clears the spinner too", async () => {
		vi.spyOn(console, "error").mockImplementation(() => undefined);
		mocks.start.mockRejectedValue(new Error("provider down"));
		render(props());
		click({ clientX: 1, clientY: 2 });
		await settle();
		expect(spinner()).toBeNull();
	});

	test("a second click while the first solve is running is ignored", async () => {
		let release = (): void => undefined;
		mocks.start.mockImplementation(
			() =>
				new Promise<void>((resolve: () => void) => {
					release = () => resolve();
				}),
		);
		render(props());
		click();
		click();
		expect(mocks.start).toHaveBeenCalledTimes(1);
		release();
		await settle();
	});

	test("an autoStart widget solves without waiting for a click", () => {
		render(props({ autoStart: true }));
		expect(mocks.start).toHaveBeenCalledWith(0, 0);
	});

	test("an autoStart widget resumes with the coordinates it was handed", () => {
		render(props({ autoStart: true, startCoords: { x: 5, y: 6 } }));
		expect(mocks.start).toHaveBeenCalledWith(5, 6);
	});

	test("a widget that was not asked to autoStart stays idle", () => {
		render(props());
		expect(mocks.start).not.toHaveBeenCalled();
	});
});

describe("the invisible-mode execute event", () => {
	const execute = (): void => {
		document.dispatchEvent(new Event("procaptcha:execute"));
	};

	test("starts a solve", () => {
		render(props({ config: config({ mode: ModeEnum.invisible }) }));
		execute();
		expect(mocks.start).toHaveBeenCalledTimes(1);
	});

	test("is ignored by a visible widget", () => {
		render(props());
		execute();
		expect(mocks.start).not.toHaveBeenCalled();
	});

	test("stops being listened for once the widget is gone", () => {
		render(props({ config: config({ mode: ModeEnum.invisible }) }));
		widget?.destroy();
		widget = undefined;
		execute();
		expect(mocks.start).not.toHaveBeenCalled();
	});

	test("a manager that throws on start does not take the page down with it", () => {
		vi.spyOn(console, "error").mockImplementation(() => undefined);
		mocks.start.mockImplementation(() => {
			throw new Error("no provider");
		});
		render(props({ config: config({ mode: ModeEnum.invisible }) }));
		expect(execute).not.toThrow();
	});

	test("a solve that rejects is reported rather than left unhandled", async () => {
		const reported = vi
			.spyOn(console, "error")
			.mockImplementation(() => undefined);
		mocks.start.mockRejectedValue(new Error("no provider"));
		render(props({ config: config({ mode: ModeEnum.invisible }) }));
		execute();
		await settle();
		expect(reported).toHaveBeenCalled();
	});
});

describe("an invalidated session", () => {
	const fail = async (key: string): Promise<void> => {
		await setState({ error: { message: "boom", key } });
	};

	test("is handed to the recovery-aware parent, with the original click", async () => {
		const onSessionInvalidated = vi.fn<(x?: number, y?: number) => void>();
		render(props({ onSessionInvalidated }));
		click({ clientX: 9, clientY: 8 });
		await fail("CAPTCHA.NO_SESSION_FOUND");
		expect(onSessionInvalidated).toHaveBeenCalledWith(9, 8);
	});

	test("is escalated once only, so a failing retry cannot loop", async () => {
		const onSessionInvalidated = vi.fn<(x?: number, y?: number) => void>();
		const restart = vi.fn<() => void>();
		render(
			props({
				onSessionInvalidated,
				frictionlessState: frictionless({ restart }),
			}),
		);
		await fail("CAPTCHA.NO_SESSION_FOUND");
		await setState({ error: undefined });
		await fail("CAPTCHA.NO_SESSION_FOUND");
		expect(onSessionInvalidated).toHaveBeenCalledTimes(1);
		await new Promise<void>((resolve: () => void) => setTimeout(resolve, 150));
		expect(restart).toHaveBeenCalledTimes(1);
	});

	test("without a recovery-aware parent the frictionless session restarts", async () => {
		const restart = vi.fn<() => void>();
		render(props({ frictionlessState: frictionless({ restart }) }));
		await fail("CAPTCHA.NO_SESSION_FOUND");
		expect(restart).not.toHaveBeenCalled();
		await new Promise<void>((resolve: () => void) => setTimeout(resolve, 150));
		expect(restart).toHaveBeenCalledTimes(1);
	});

	test("any other error is left for the widget to display", async () => {
		const onSessionInvalidated = vi.fn<(x?: number, y?: number) => void>();
		const restart = vi.fn<() => void>();
		render(
			props({
				onSessionInvalidated,
				frictionlessState: frictionless({ restart }),
			}),
		);
		await fail("API.UNKNOWN_ERROR");
		expect(onSessionInvalidated).not.toHaveBeenCalled();
		expect(restart).not.toHaveBeenCalled();
	});

	test("an error with nowhere to escalate to is simply shown", async () => {
		render(props());
		await expect(fail("CAPTCHA.NO_SESSION_FOUND")).resolves.toBeUndefined();
	});
});

describe("language", () => {
	test("a configured language with no i18n instance boots one", () => {
		render(props({ config: config({ language: "fr" }) }));
		expect(mocks.loadI18next).toHaveBeenCalledWith(false, "fr");
	});

	test("an existing i18n instance is switched rather than re-booted", () => {
		const changeLanguage = vi.fn<(l: string) => void>();
		render(
			props({
				config: config({ language: "fr" }),
				i18n: i18nStub("en", changeLanguage),
			}),
		);
		expect(changeLanguage).toHaveBeenCalledWith("fr");
		expect(mocks.loadI18next).not.toHaveBeenCalled();
	});

	test("an instance already in the right language is left alone", () => {
		const changeLanguage = vi.fn<(l: string) => void>();
		render(
			props({
				config: config({ language: "fr" }),
				i18n: i18nStub("fr", changeLanguage),
			}),
		);
		expect(changeLanguage).not.toHaveBeenCalled();
	});

	test("no configured language means the page's own choice stands", () => {
		const changeLanguage = vi.fn<(l: string) => void>();
		render(props({ i18n: i18nStub("en", changeLanguage) }));
		expect(changeLanguage).not.toHaveBeenCalled();
		expect(mocks.loadI18next).not.toHaveBeenCalled();
	});
});
