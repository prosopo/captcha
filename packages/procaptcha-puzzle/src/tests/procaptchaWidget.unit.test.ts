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
import type { Component } from "@prosopo/procaptcha-common";
import {
	type GetPuzzleCaptchaResponse,
	ModeEnum,
	type ProcaptchaProps,
	type ProcaptchaState,
	type PuzzleEvent,
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
	type ProcaptchaPuzzleHandle,
	mountProcaptchaPuzzleWidget,
} from "../components/procaptchaWidget.js";
import type { PuzzleCanvasProps } from "../components/puzzleCanvas.js";
import { type Mounted, fire, mount, settle } from "./domHarness.js";
import { challengeResponse, config, frictionless } from "./managerHarness.js";

/**
 * The widget owns the phase machine — checkbox, dragging, submitting — and the
 * wiring between the manager and the canvas. Both of those collaborators are
 * stubbed so each test drives one transition at a time.
 */
const mocks = vi.hoisted(() => {
	const start =
		vi.fn<
			(x?: number, y?: number) => Promise<GetPuzzleCaptchaResponse | undefined>
		>();
	const submitSolution =
		vi.fn<(x: number, y: number, events: PuzzleEvent[]) => Promise<boolean>>();
	const resetState = vi.fn<() => void>();
	const constructions: {
		updateState: (next: Partial<ProcaptchaState>) => void;
		getHoneypotValue?: () => string | undefined;
	}[] = [];
	const loadI18next = vi.fn<(a?: boolean, b?: string) => Promise<unknown>>();
	const canvasProps: { current: PuzzleCanvasProps | undefined } = {
		current: undefined,
	};
	const translationsReady = { current: true };
	return {
		translationsReady,
		start,
		submitSolution,
		resetState,
		constructions,
		loadI18next,
		canvasProps,
	};
});

vi.mock("../services/Manager.js", () => ({
	Manager: (
		_config: unknown,
		_state: ProcaptchaState,
		updateState: (next: Partial<ProcaptchaState>) => void,
		_callbacks: unknown,
		_frictionlessState: unknown,
		getHoneypotValue?: () => string | undefined,
	) => {
		mocks.constructions.push({ updateState, getHoneypotValue });
		return {
			start: mocks.start,
			submitSolution: mocks.submitSolution,
			resetState: mocks.resetState,
		};
	},
}));

// The canvas has its own suite; here it is reduced to a probe so a test can
// read the props the widget hands it and fire the completion callback without
// simulating a drag.
vi.mock("../components/puzzleCanvas.js", () => ({
	mountPuzzleCanvas: (
		container: HTMLElement,
		canvasProps: PuzzleCanvasProps,
	): Component<PuzzleCanvasProps> => {
		mocks.canvasProps.current = canvasProps;
		const element = document.createElement("div");
		element.setAttribute("data-cy", "canvas-stub");
		container.appendChild(element);
		return {
			update: (next: PuzzleCanvasProps) => {
				mocks.canvasProps.current = next;
			},
			destroy: () => {
				element.remove();
				mocks.canvasProps.current = undefined;
			},
		};
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
let widget: ProcaptchaPuzzleHandle | undefined;

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
	widget = mountProcaptchaPuzzleWidget(mounted.container, widgetProps);
};

const destroy = (): void => {
	widget?.destroy();
	widget = undefined;
};

beforeEach(() => {
	vi.clearAllMocks();
	mocks.constructions.length = 0;
	mocks.translationsReady.current = true;
	mocks.canvasProps.current = undefined;
	mocks.start.mockResolvedValue(challengeResponse());
	mocks.submitSolution.mockResolvedValue(true);
	mocks.loadI18next.mockResolvedValue(undefined);
	widget = undefined;
	mounted = mount();
});

afterEach(() => {
	destroy();
	mounted.unmount();
	vi.useRealTimers();
	vi.restoreAllMocks();
});

const checkbox = (): HTMLInputElement => {
	const element = mounted.container.querySelector<HTMLInputElement>(
		'input[type="checkbox"]',
	);
	if (!element) throw new Error("expected a checkbox to be rendered");
	return element;
};

const canvas = (): Element | null =>
	mounted.container.querySelector('[data-cy="canvas-stub"]');

const spinner = (): Element | null =>
	mounted.container.querySelector('[aria-label="Loading spinner"]');

const honeypotInput = (): HTMLInputElement => {
	const element = document.querySelector<HTMLInputElement>(
		'input[name="email_confirm"]',
	);
	if (!element) throw new Error("expected a honeypot to be rendered");
	return element;
};

interface ClickOptions {
	trusted?: boolean;
	clientX?: number;
	clientY?: number;
	touches?: { clientX: number; clientY: number }[];
}

/** Click the real checkbox with the browser event a user would produce. */
const click = async (options: ClickOptions = {}): Promise<void> => {
	fire(checkbox(), "click", options);
	await settle();
};

/**
 * Start a solve without waiting for it to settle, for the tests that hold the
 * manager's promise open.
 */
const clickWithoutWaiting = (): void => {
	fire(checkbox(), "click");
};

/** Fire the canvas completion callback the way a finished drag would. */
const complete = async (
	x = 200,
	y = 80,
	events: PuzzleEvent[] = [{ x: 200, y: 80, t: 5 }],
): Promise<void> => {
	await mocks.canvasProps.current?.onComplete(x, y, events);
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

	test("no puzzle is shown until a challenge has been fetched", () => {
		render(props());
		expect(canvas()).toBeNull();
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

	test("the label is left empty while the translations load", () => {
		mocks.translationsReady.current = false;
		render(props());
		expect(checkbox().getAttribute("aria-label")).toBe("");
	});

	test("the widget builds exactly one manager", async () => {
		// The React version rebuilt the manager on every render and kept the
		// first through a ref, which is what lost the checkbox click coordinates
		// before the ref was introduced. There is one manager per mount now.
		render(props());
		await click();
		expect(mocks.constructions).toHaveLength(1);
	});
});

describe("language", () => {
	test("nothing is loaded when no language is configured", () => {
		render(props());
		expect(mocks.loadI18next).not.toHaveBeenCalled();
	});

	test("a configured language boots i18next with it", () => {
		render(props({ config: config({ language: "fr" }) }));
		expect(mocks.loadI18next).toHaveBeenCalledWith(false, "fr");
	});

	test("an injected i18n on another language is switched over", () => {
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

	test("an injected i18n already on that language is left alone", () => {
		const changeLanguage = vi.fn<(l: string) => void>();
		render(
			props({
				config: config({ language: "fr" }),
				i18n: i18nStub("fr", changeLanguage),
			}),
		);
		expect(changeLanguage).not.toHaveBeenCalled();
	});
});

describe("starting from the checkbox", () => {
	test("a click starts the solve and opens the puzzle", async () => {
		render(props());
		await click({ clientX: 12, clientY: 34 });
		expect(mocks.start).toHaveBeenCalledWith(12, 34);
		expect(canvas()).not.toBeNull();
		expect(mocks.canvasProps.current).toMatchObject({
			originX: challengeResponse().originX,
			targetY: challengeResponse().targetY,
			submitting: false,
			showRetry: false,
		});
	});

	test("a synthetic click never reaches the manager", async () => {
		// The checkbox drops untrusted events before the widget sees them, so an
		// automated solver cannot open a puzzle at all.
		render(props());
		await click({ trusted: false, clientX: 12, clientY: 34 });
		expect(mocks.start).not.toHaveBeenCalled();
	});

	test("a tap reports the coordinates of the first touch", async () => {
		render(props());
		await click({ touches: [{ clientX: 7, clientY: 9 }] });
		expect(mocks.start).toHaveBeenCalledWith(7, 9);
	});

	test("a touch event with no touches falls back to the pointer", async () => {
		render(props());
		await click({ touches: [] });
		expect(mocks.start).toHaveBeenCalledWith(0, 0);
	});

	test("a second click while the first is in flight is ignored", async () => {
		let release: (challenge: GetPuzzleCaptchaResponse) => void = () => {
			// replaced synchronously by the promise executor below
		};
		mocks.start.mockReturnValue(
			new Promise<GetPuzzleCaptchaResponse>(
				(resolve: (challenge: GetPuzzleCaptchaResponse) => void) => {
					release = resolve;
				},
			),
		);
		render(props());
		// Not awaited: the handler cannot settle until the challenge is
		// released, and awaiting it here would deadlock the test.
		clickWithoutWaiting();
		clickWithoutWaiting();
		expect(mocks.start).toHaveBeenCalledTimes(1);
		release(challengeResponse());
		await settle();
	});

	test("the checkbox shows a spinner while the solve is loading", async () => {
		let release: (challenge: GetPuzzleCaptchaResponse) => void = () => {
			// replaced synchronously by the promise executor below
		};
		mocks.start.mockReturnValue(
			new Promise<GetPuzzleCaptchaResponse>(
				(resolve: (challenge: GetPuzzleCaptchaResponse) => void) => {
					release = resolve;
				},
			),
		);
		render(props());
		clickWithoutWaiting();
		await settle();
		expect(spinner()).not.toBeNull();
		release(challengeResponse());
		await settle();
		expect(spinner()).toBeNull();
	});

	test("a start that yields no challenge leaves the checkbox in place", async () => {
		mocks.start.mockResolvedValue(undefined);
		render(props());
		await click();
		expect(canvas()).toBeNull();
		expect(spinner()).toBeNull();
	});

	test("a start that throws returns the user to a usable checkbox", async () => {
		const onError = vi.fn<(error: Error) => void>();
		mocks.start.mockRejectedValue(new Error("provider down"));
		render(props({ callbacks: { onError } }));
		await click();
		// Without the guard the spinner would stay up for good: nothing awaits
		// the checkbox handler, so the rejection escapes as an unhandled one.
		expect(spinner()).toBeNull();
		expect(onError).toHaveBeenCalledWith(expect.any(Error));
	});

	test("a start that throws without an error callback is still recoverable", async () => {
		mocks.start.mockRejectedValue(new Error("provider down"));
		render(props());
		await click();
		expect(spinner()).toBeNull();
	});
});

describe("autoStart", () => {
	test("fetches a challenge and opens the puzzle without a click", async () => {
		render(props({ autoStart: true, startCoords: { x: 5, y: 6 } }));
		await settle();
		expect(mocks.start).toHaveBeenCalledWith(5, 6);
		expect(canvas()).not.toBeNull();
	});

	test("starts at the origin when no coordinates were handed over", async () => {
		render(props({ autoStart: true }));
		await settle();
		expect(mocks.start).toHaveBeenCalledWith(0, 0);
	});

	test("a failed autoStart leaves the checkbox usable", async () => {
		mocks.start.mockRejectedValue(new Error("nope"));
		render(props({ autoStart: true }));
		await settle();
		expect(canvas()).toBeNull();
		expect(spinner()).toBeNull();
	});

	test("no autoStart means no solve until the user acts", () => {
		render(props());
		expect(mocks.start).not.toHaveBeenCalled();
	});
});

describe("finishing the drag", () => {
	const openPuzzle = async (
		widgetProps: ProcaptchaProps = props(),
	): Promise<void> => {
		render(widgetProps);
		await click();
	};

	test("submits the drop position and the trail the canvas gathered", async () => {
		await openPuzzle();
		const events: PuzzleEvent[] = [{ x: 1, y: 2, t: 3 }];
		await complete(150, 60, events);
		expect(mocks.submitSolution).toHaveBeenCalledWith(150, 60, events);
	});

	test("a verified solution closes the puzzle", async () => {
		await openPuzzle();
		await complete();
		expect(canvas()).toBeNull();
		expect(spinner()).toBeNull();
	});

	test("a rejected solution asks for another go on a fresh challenge", async () => {
		mocks.submitSolution.mockResolvedValue(false);
		const retryChallenge = challengeResponse({ originX: 40, targetX: 250 });
		mocks.start
			.mockResolvedValueOnce(challengeResponse())
			.mockResolvedValue(retryChallenge);
		await openPuzzle();
		await complete();
		expect(canvas()).not.toBeNull();
		expect(mocks.canvasProps.current).toMatchObject({
			showRetry: true,
			originX: 40,
			targetX: 250,
			submitting: false,
		});
	});

	test("a rejected solution with no replacement challenge closes the puzzle", async () => {
		mocks.submitSolution.mockResolvedValue(false);
		mocks.start
			.mockResolvedValueOnce(challengeResponse())
			.mockResolvedValue(undefined);
		await openPuzzle();
		await complete();
		expect(canvas()).toBeNull();
	});

	test("a rejected solution whose retry throws closes the puzzle", async () => {
		mocks.submitSolution.mockResolvedValue(false);
		mocks.start
			.mockResolvedValueOnce(challengeResponse())
			.mockRejectedValue(new Error("provider down"));
		await openPuzzle();
		await complete();
		expect(canvas()).toBeNull();
	});

	test("a submit that throws is reported and treated as a failure", async () => {
		const onError = vi.fn<(error: Error) => void>();
		mocks.submitSolution.mockRejectedValue(new Error("boom"));
		await openPuzzle(props({ callbacks: { onError } }));
		await complete();
		expect(onError).toHaveBeenCalledWith(expect.any(Error));
		// Failure, so the widget asks for a new challenge rather than passing
		// the user through on an error.
		expect(mocks.start).toHaveBeenCalledTimes(2);
	});

	test("a submit that throws a non-error still reaches the callback", async () => {
		const onError = vi.fn<(error: Error) => void>();
		mocks.submitSolution.mockRejectedValue("just a string");
		await openPuzzle(props({ callbacks: { onError } }));
		await complete();
		expect(onError).toHaveBeenCalledWith(expect.any(Error));
	});

	test("the puzzle is frozen while the solution is in flight", async () => {
		let release: (verified: boolean) => void = () => {
			// replaced synchronously by the promise executor below
		};
		mocks.submitSolution.mockReturnValue(
			new Promise<boolean>((resolve: (verified: boolean) => void) => {
				release = resolve;
			}),
		);
		await openPuzzle();
		// Not awaited: the handler cannot settle until the verdict is released.
		void mocks.canvasProps.current?.onComplete(200, 80, []);
		await settle();
		expect(mocks.canvasProps.current?.submitting).toBe(true);
		expect(spinner()).not.toBeNull();
		release(true);
		await settle();
	});
});

describe("invisible mode", () => {
	const execute = async (): Promise<void> => {
		document.dispatchEvent(new Event("procaptcha:execute"));
		await settle();
	};

	test("an execute event fetches a challenge and opens the puzzle", async () => {
		render(props({ config: config({ mode: ModeEnum.invisible }) }));
		await execute();
		expect(mocks.start).toHaveBeenCalledTimes(1);
		expect(canvas()).not.toBeNull();
	});

	test("a visible widget ignores the execute event entirely", async () => {
		render(props());
		await execute();
		expect(mocks.start).not.toHaveBeenCalled();
	});

	test("an execute that yields no challenge shows no puzzle", async () => {
		mocks.start.mockResolvedValue(undefined);
		render(props({ config: config({ mode: ModeEnum.invisible }) }));
		await execute();
		expect(canvas()).toBeNull();
	});

	test("an execute that throws is reported to the host page", async () => {
		const onError = vi.fn<(error: Error) => void>();
		mocks.start.mockRejectedValue(new Error("provider down"));
		render(
			props({
				config: config({ mode: ModeEnum.invisible }),
				callbacks: { onError },
			}),
		);
		await execute();
		expect(onError).toHaveBeenCalledWith(expect.any(Error));
	});

	test("an execute that throws a non-error is still reported", async () => {
		const onError = vi.fn<(error: Error) => void>();
		mocks.start.mockRejectedValue("just a string");
		render(
			props({
				config: config({ mode: ModeEnum.invisible }),
				callbacks: { onError },
			}),
		);
		await execute();
		expect(onError).toHaveBeenCalledWith(expect.any(Error));
	});

	test("the listener is dropped when the widget is destroyed", async () => {
		render(props({ config: config({ mode: ModeEnum.invisible }) }));
		destroy();
		await execute();
		expect(mocks.start).not.toHaveBeenCalled();
	});
});

describe("an invalidated session", () => {
	const invalidate = async (
		key = "CAPTCHA.NO_SESSION_FOUND",
		message = "session gone",
	): Promise<void> => {
		mocks.constructions[0]?.updateState({ error: { message, key } });
		await settle();
	};

	test("the error is shown on the checkbox and the puzzle is torn down", async () => {
		render(props());
		await click();
		await invalidate("API.UNKNOWN_ERROR", "something broke");
		expect(mounted.container.textContent).toContain("something broke");
		expect(canvas()).toBeNull();
		expect(spinner()).toBeNull();
	});

	test("the host is told to re-mint, with the coordinates of the original click", async () => {
		const onSessionInvalidated = vi.fn<(x?: number, y?: number) => void>();
		render(props({ onSessionInvalidated }));
		await click({ clientX: 12, clientY: 34 });
		await invalidate();
		expect(onSessionInvalidated).toHaveBeenCalledWith(12, 34);
	});

	test("the host is told only once, however many errors arrive", async () => {
		const onSessionInvalidated = vi.fn<(x?: number, y?: number) => void>();
		render(props({ onSessionInvalidated }));
		await click();
		await invalidate("CAPTCHA.NO_SESSION_FOUND", "gone");
		await invalidate("CAPTCHA.NO_SESSION_FOUND", "gone again");
		expect(onSessionInvalidated).toHaveBeenCalledTimes(1);
	});

	test("with no host handler the frictionless session restarts instead", async () => {
		const restart = vi.fn<() => void>();
		render(props({ frictionlessState: frictionless({ restart }) }));
		await invalidate();
		expect(restart).not.toHaveBeenCalled();
		await new Promise<void>((resolve: () => void) => setTimeout(resolve, 150));
		expect(restart).toHaveBeenCalledTimes(1);
	});

	test("a restart pending at destroy is cancelled", async () => {
		const restart = vi.fn<() => void>();
		render(props({ frictionlessState: frictionless({ restart }) }));
		await invalidate();
		destroy();
		await new Promise<void>((resolve: () => void) => setTimeout(resolve, 200));
		expect(restart).not.toHaveBeenCalled();
	});

	test("a lost session with nothing to recover it is simply surfaced", async () => {
		render(props());
		await invalidate();
		expect(mounted.container.textContent).toContain("session gone");
	});

	test("no coordinates are reported when the session was never clicked into", async () => {
		const onSessionInvalidated = vi.fn<(x?: number, y?: number) => void>();
		render(props({ onSessionInvalidated }));
		await invalidate();
		expect(onSessionInvalidated).toHaveBeenCalledWith(undefined, undefined);
	});
});
