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
import type { Manager as ManagerType } from "@prosopo/procaptcha";
import {
	ModeEnum,
	type ProcaptchaProps,
	type ProcaptchaState,
	type ProcaptchaStateUpdateFn,
} from "@prosopo/types";
import { lightTheme } from "@prosopo/widget-skeleton";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
	type ProcaptchaWidgetHandle,
	mountProcaptchaImageWidget,
} from "../components/procaptchaWidget.js";
import { challengeResponse, config, frictionless } from "./harness.js";
import { type Mounted, asRgb, fire, mount, settle } from "./render.js";

type ManagerApi = ReturnType<typeof ManagerType>;

// Everything the widget does to the outside world goes through the manager,
// so the suite owns it: the spies record what the user's actions asked for,
// and `update` is the manager's own channel back into the widget's state.
const start = vi.fn<ManagerApi["start"]>(() => Promise.resolve());
const cancel = vi.fn<ManagerApi["cancel"]>();
const submit = vi.fn<ManagerApi["submit"]>(() => Promise.resolve());
const select = vi.fn<ManagerApi["select"]>();
const nextRound = vi.fn<ManagerApi["nextRound"]>();
const reload = vi.fn<ManagerApi["reload"]>(() => Promise.resolve());

let update: ProcaptchaStateUpdateFn | undefined;
let readHoneypot: (() => string | undefined) | undefined;
const managerArgs: Parameters<typeof ManagerType>[] = [];

vi.mock("@prosopo/procaptcha", () => ({
	Manager: (...args: Parameters<typeof ManagerType>): ManagerApi => {
		managerArgs.push(args);
		update = args[2];
		readHoneypot = args[5];
		return { start, cancel, submit, select, nextRound, reload };
	},
}));

const changeLanguage = vi.fn<(language: string) => Promise<void>>(() =>
	Promise.resolve(),
);
const loadI18next = vi.fn<(sync: boolean, language?: string) => Promise<void>>(
	() => Promise.resolve(),
);

vi.mock("@prosopo/locale", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@prosopo/locale")>();
	return {
		...actual,
		createTranslator: () => ({
			t: (key: string) => key,
			isReady: () => true,
			subscribe: () => () => undefined,
			i18n: undefined,
		}),
		loadI18next: (sync: boolean, language?: string) =>
			loadI18next(sync, language),
	};
});

let mounted: Mounted;
let widget: ProcaptchaWidgetHandle | undefined;

const i18n = (language: string): Ti18n =>
	({ language, changeLanguage }) as unknown as Ti18n;

const render = (overrides: Partial<ProcaptchaProps> = {}): void => {
	widget = mountProcaptchaImageWidget(mounted.container, {
		config: config(),
		callbacks: {},
		i18n: undefined as unknown as Ti18n,
		...overrides,
	});
};

/**
 * A challenge as the manager delivers it: the solution slots are opened at the
 * same time, so the component always has one per round.
 */
const openChallenge = (): Partial<ProcaptchaState> => ({
	challenge: challengeResponse(),
	solutions: [[]],
});

/**
 * Pushes state at the widget the way the manager would, then lets the render
 * that the change queued actually run.
 */
const setState = async (next: Partial<ProcaptchaState>): Promise<void> => {
	update?.(next);
	await settle();
};

const checkbox = (): HTMLInputElement => {
	const element = mounted.container.querySelector<HTMLInputElement>(
		'[data-cy="captcha-checkbox"]',
	);
	if (!element) throw new Error("expected the checkbox to be rendered");
	return element;
};

const spinner = (): Element | null =>
	mounted.container.querySelector('[aria-label="Loading spinner"]');

const modalText = (): string =>
	document.querySelector(".prosopo-modalOuter")?.textContent ?? "";

beforeEach(() => {
	vi.clearAllMocks();
	managerArgs.length = 0;
	update = undefined;
	readHoneypot = undefined;
	widget = undefined;
	start.mockImplementation(() => Promise.resolve());
	mounted = mount();
});

afterEach(() => {
	widget?.destroy();
	widget = undefined;
	mounted.unmount();
	vi.useRealTimers();
});

describe("what the user sees at rest", () => {
	test("shows the checkbox for a visible widget", () => {
		render();
		expect(checkbox()).toBeDefined();
	});

	test("labels the checkbox with the translated prompt", () => {
		render();
		expect(checkbox().getAttribute("aria-label")).toBe("WIDGET.I_AM_HUMAN");
	});

	test("keeps the modal closed until there is something to show", () => {
		render();
		const outer = document.querySelector<HTMLElement>(".prosopo-modalOuter");
		expect(outer?.style.display).toBe("none");
	});

	test("says so when the modal opens with no challenge", async () => {
		// A blank modal reads as a broken widget; the message at least tells the
		// user (and a support ticket) what state it is in.
		render();
		await setState({ showModal: true });
		expect(modalText()).toContain("No challenge set.");
	});

	test("shows no honeypot unless the provider asked for one", () => {
		render();
		expect(document.querySelector("input[type='text']")).toBeNull();
	});

	test("warns when configured with a reserved test site key", () => {
		render({ config: config({ account: { address: "0" } }) });
		expect(
			mounted.container.querySelector('[data-cy="test-mode-banner"]'),
		).toBeDefined();
	});
});

describe("invisible mode", () => {
	const invisible = (): Partial<ProcaptchaProps> => ({
		config: config({ mode: ModeEnum.invisible }),
	});

	test("renders no checkbox for the user to click", () => {
		render(invisible());
		expect(
			mounted.container.querySelector('[data-cy="captcha-checkbox"]'),
		).toBeNull();
	});

	test("renders no widget chrome at all", () => {
		// Invisible means invisible: a wrapper with a border or banner would
		// still take up space on the host page.
		render(invisible());
		expect(mounted.container.querySelector(".image-captcha")).toBeNull();
	});

	test("stays silent rather than announcing a missing challenge", async () => {
		render(invisible());
		await setState({ showModal: true });
		expect(modalText()).toBe("");
	});

	test("still shows the challenge when one arrives", async () => {
		render(invisible());
		await setState({ showModal: true, ...openChallenge() });
		expect(modalText()).toContain("WIDGET.SELECT_ALL");
	});
});

describe("the honeypot", () => {
	test("is rendered when the frictionless flow supplies a question", () => {
		render({ frictionlessState: frictionless({ hp: btoa("dit dah") }) });
		expect(document.body.textContent).toContain("dit dah");
	});

	test("gives the manager a way to read whatever a bot typed", () => {
		render({ frictionlessState: frictionless({ hp: btoa("dit dah") }) });
		const input = document.querySelector<HTMLInputElement>(
			"input:not([data-cy='captcha-checkbox'])",
		);
		if (!input) throw new Error("expected the honeypot input");
		input.value = "answered";
		expect(readHoneypot?.()).toBe("answered");
	});

	test("reads as undefined while the honeypot is untouched", () => {
		// An empty string would look like a submitted answer on the wire.
		render({ frictionlessState: frictionless({ hp: btoa("dit dah") }) });
		expect(readHoneypot?.()).toBeUndefined();
	});

	test("reads as undefined when there is no honeypot at all", () => {
		render();
		expect(readHoneypot?.()).toBeUndefined();
	});

	test("is removed from the page when the widget is destroyed", () => {
		// Nothing reconciles a portal for us; a leaked bait input would keep
		// accumulating on the host page across frictionless restarts.
		render({ frictionlessState: frictionless({ hp: btoa("dit dah") }) });
		widget?.destroy();
		widget = undefined;
		expect(document.body.textContent).not.toContain("dit dah");
	});
});

describe("clicking the checkbox", () => {
	test("starts the challenge where the user clicked", () => {
		render();
		fire(checkbox(), "click", { clientX: 11, clientY: 22 });
		expect(start).toHaveBeenCalledWith(11, 22);
	});

	test("ignores a synthetic click", () => {
		// A scripted click is an automated solver, not a user.
		render();
		fire(checkbox(), "click", { trusted: false });
		expect(start).not.toHaveBeenCalled();
	});

	test("only starts once while a start is still in flight", async () => {
		let finish: (() => void) | undefined;
		start.mockImplementation(
			() =>
				new Promise<void>((resolve: () => void) => {
					finish = resolve;
				}),
		);
		render();
		fire(checkbox(), "click", { clientX: 1, clientY: 1 });
		await settle();
		// The checkbox is swapped for a spinner while loading, so a second
		// click cannot even reach it — the guard covers the race where it can.
		expect(spinner()).not.toBeNull();
		expect(start).toHaveBeenCalledTimes(1);
		finish?.();
	});

	test("shows the checkbox again once the start resolves", async () => {
		render();
		fire(checkbox(), "click");
		await settle();
		expect(checkbox()).toBeDefined();
	});

	test("shows the checkbox again when the start fails", async () => {
		// A failed start still has to give the user their click back, otherwise
		// the widget spins forever.
		start.mockImplementation(() => Promise.reject(new Error("network down")));
		const consoleError = vi
			.spyOn(console, "error")
			.mockImplementation(() => undefined);
		render();
		fire(checkbox(), "click");
		await settle();
		expect(spinner()).toBeNull();
		consoleError.mockRestore();
	});

	test("reflects a verified user as a ticked box", async () => {
		render();
		await setState({ isHuman: true });
		expect(checkbox().checked).toBe(true);
	});
});

describe("the challenge", () => {
	const withChallenge = async (): Promise<void> => {
		render();
		await setState({ showModal: true, ...openChallenge() });
	};

	test("wires the grid to the manager's select", async () => {
		await withChallenge();
		const image = document.querySelector(".prosopo-modalOuter img");
		if (!image) throw new Error("expected a captcha image");
		fire(image, "click", { clientX: 3, clientY: 4 });
		expect(select).toHaveBeenCalledWith("hash-1", 3, 4);
	});

	test("wires cancel to the manager", async () => {
		await withChallenge();
		const cancelButton = document.querySelector(
			'.prosopo-modalOuter button[aria-label="WIDGET.CANCEL"]',
		);
		if (!cancelButton) throw new Error("expected a cancel button");
		fire(cancelButton, "click");
		expect(cancel).toHaveBeenCalledTimes(1);
	});

	test("wires submit to the manager on the last round", async () => {
		await withChallenge();
		const submitButton = document.querySelector(
			'.prosopo-modalOuter button[aria-label="WIDGET.SUBMIT"]',
		);
		if (!submitButton) throw new Error("expected a submit button");
		fire(submitButton, "click");
		expect(submit).toHaveBeenCalledTimes(1);
	});

	test("takes the modal with it when the widget is destroyed", () => {
		render();
		widget?.destroy();
		widget = undefined;
		expect(document.querySelector(".prosopo-modalOuter")).toBeNull();
	});
});

describe("recovering from an error", () => {
	test("stops the spinner so the user can try again", async () => {
		render();
		fire(checkbox(), "click");
		await setState({ error: { message: "boom", key: "CAPTCHA.UNKNOWN" } });
		expect(spinner()).toBeNull();
	});

	test("shows the error text against the checkbox", async () => {
		render();
		await setState({ error: { message: "boom", key: "CAPTCHA.UNKNOWN" } });
		expect(mounted.container.textContent).toContain("boom");
	});

	test("asks the host to re-mint an invalidated session", async () => {
		const onSessionInvalidated = vi.fn<(x?: number, y?: number) => void>();
		render({ onSessionInvalidated });
		fire(checkbox(), "click", { clientX: 7, clientY: 8 });
		await setState({
			error: { message: "gone", key: "CAPTCHA.NO_SESSION_FOUND" },
		});
		// The coords of the click the user already made, so the retry still
		// reports where the user actually entered the flow.
		expect(onSessionInvalidated).toHaveBeenCalledWith(7, 8);
	});

	test("asks only once, however often the error re-renders", async () => {
		const onSessionInvalidated = vi.fn<(x?: number, y?: number) => void>();
		render({ onSessionInvalidated });
		await setState({
			error: { message: "gone", key: "CAPTCHA.NO_SESSION_FOUND" },
		});
		await setState({
			error: { message: "gone again", key: "CAPTCHA.NO_SESSION_FOUND" },
		});
		expect(onSessionInvalidated).toHaveBeenCalledTimes(1);
	});

	test("reports no coordinates when the user never clicked", async () => {
		const onSessionInvalidated = vi.fn<(x?: number, y?: number) => void>();
		render({ onSessionInvalidated });
		await setState({
			error: { message: "gone", key: "CAPTCHA.NO_SESSION_FOUND" },
		});
		expect(onSessionInvalidated).toHaveBeenCalledWith(undefined, undefined);
	});

	test("falls back to restarting the frictionless flow", async () => {
		const restart = vi.fn<() => void>();
		render({ frictionlessState: frictionless({ restart }) });
		await setState({
			error: { message: "gone", key: "CAPTCHA.NO_SESSION_FOUND" },
		});
		expect(restart).not.toHaveBeenCalled();
		await new Promise<void>((resolve: () => void) => setTimeout(resolve, 150));
		expect(restart).toHaveBeenCalledTimes(1);
	});

	test("leaves an ordinary error to the host, restarting nothing", async () => {
		const restart = vi.fn<() => void>();
		render({ frictionlessState: frictionless({ restart }) });
		await setState({ error: { message: "boom", key: "CAPTCHA.UNKNOWN" } });
		await new Promise<void>((resolve: () => void) => setTimeout(resolve, 150));
		expect(restart).not.toHaveBeenCalled();
	});
});

describe("starting without a click", () => {
	test("does nothing on mount by default", () => {
		render();
		expect(start).not.toHaveBeenCalled();
	});

	test("starts on mount when the host asked it to", () => {
		render({ autoStart: true });
		expect(start).toHaveBeenCalledWith(0, 0);
	});

	test("resumes at the coordinates the user already clicked", () => {
		render({ autoStart: true, startCoords: { x: 5, y: 6 } });
		expect(start).toHaveBeenCalledWith(5, 6);
	});

	test("remembers those coordinates for a session re-mint", async () => {
		const onSessionInvalidated = vi.fn<(x?: number, y?: number) => void>();
		render({
			autoStart: true,
			startCoords: { x: 5, y: 6 },
			onSessionInvalidated,
		});
		await setState({
			error: { message: "gone", key: "CAPTCHA.NO_SESSION_FOUND" },
		});
		expect(onSessionInvalidated).toHaveBeenCalledWith(5, 6);
	});

	test("clears the spinner when an auto start fails", async () => {
		start.mockImplementation(() => Promise.reject(new Error("network down")));
		render({ autoStart: true });
		await settle();
		expect(spinner()).toBeNull();
	});
});

describe("the execute event", () => {
	const execute = (): void => {
		document.dispatchEvent(new Event("procaptcha:execute"));
	};

	test("opens the modal", async () => {
		render();
		execute();
		await settle();
		expect(
			document.querySelector<HTMLElement>(".prosopo-modalOuter")?.style.display,
		).toBe("flex");
	});

	test("fetches a challenge when there is none", () => {
		render();
		execute();
		expect(start).toHaveBeenCalledTimes(1);
	});

	test("does not re-fetch when a challenge is already open", async () => {
		render();
		await setState(openChallenge());
		execute();
		expect(start).not.toHaveBeenCalled();
	});

	test("survives a manager that throws on start", () => {
		// The event comes from the host page's execute() call; throwing back
		// into it would surface as an unhandled error in the consumer's code.
		start.mockImplementation(() => {
			throw new Error("no provider");
		});
		const consoleError = vi
			.spyOn(console, "error")
			.mockImplementation(() => undefined);
		render();
		expect(() => execute()).not.toThrow();
		expect(consoleError).toHaveBeenCalled();
		consoleError.mockRestore();
	});

	test("stops listening once the widget is gone", () => {
		render();
		widget?.destroy();
		widget = undefined;
		execute();
		expect(start).not.toHaveBeenCalled();
	});
});

describe("language", () => {
	test("leaves i18n alone when the site pins no language", () => {
		render();
		expect(loadI18next).not.toHaveBeenCalled();
		expect(changeLanguage).not.toHaveBeenCalled();
	});

	test("switches a supplied i18n instance to the configured language", () => {
		render({ config: config({ language: "fr" }), i18n: i18n("en") });
		expect(changeLanguage).toHaveBeenCalledWith("fr");
	});

	test("leaves a matching i18n instance alone", () => {
		// Changing to the language it is already on remounts every string for
		// nothing.
		render({ config: config({ language: "fr" }), i18n: i18n("fr") });
		expect(changeLanguage).not.toHaveBeenCalled();
	});

	test("boots i18n itself for a direct consumer", () => {
		// No WidgetFactory in this path, so the language has to be handed to
		// loadI18next rather than left to browser detection.
		render({ config: config({ language: "de" }) });
		expect(loadI18next).toHaveBeenCalledWith(false, "de");
	});
});

describe("theming", () => {
	test("passes the manager the parsed config, not the raw props", () => {
		render({ config: config({ theme: "dark" }) });
		expect(managerArgs[0]?.[0].theme).toBe("dark");
	});

	test("defaults an unthemed widget to the light palette", async () => {
		render();
		await setState({ showModal: true, ...openChallenge() });
		const panel = document.querySelector<HTMLElement>(
			".prosopo-modalInner > div",
		);
		// The challenge panel is the M3 dialog container, so it takes
		// surfaceContainerHigh rather than the flat surface behind the widget.
		expect(panel?.style.backgroundColor).toBe(
			asRgb(lightTheme.palette.background.default),
		);
	});
});

describe("the manager itself", () => {
	test("is built once, so the click coordinates survive a re-render", async () => {
		// Rebuilding it loses the (x, y) captured on start, which is why every
		// image captcha session used to submit (0, 0).
		render();
		await setState({ isHuman: true });
		expect(managerArgs).toHaveLength(1);
		fire(checkbox(), "click", { clientX: 9, clientY: 9 });
		expect(start).toHaveBeenCalledWith(9, 9);
	});

	test("is given the frictionless state so it can reuse the session", () => {
		const frictionlessState = frictionless();
		render({ frictionlessState });
		expect(managerArgs[0]?.[4]).toBe(frictionlessState);
	});

	test("is given the host's callbacks", () => {
		const callbacks: ProcaptchaProps["callbacks"] = { onHuman: vi.fn() };
		render({ callbacks });
		expect(managerArgs[0]?.[3]).toBe(callbacks);
	});

	test("is given an empty callback set when the host passes none", () => {
		render({ callbacks: undefined as unknown as ProcaptchaProps["callbacks"] });
		expect(managerArgs[0]?.[3]).toEqual({});
	});
});
