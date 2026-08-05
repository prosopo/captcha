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
	type GetPuzzleCaptchaResponse,
	ModeEnum,
	type ProcaptchaProps,
	type ProcaptchaState,
	type PuzzleEvent,
} from "@prosopo/types";
import { type ReactElement, act, createElement } from "react";
import { type Root, createRoot } from "react-dom/client";
import {
	type Mock,
	afterEach,
	beforeEach,
	describe,
	expect,
	test,
	vi,
} from "vitest";
import Procaptcha from "../components/ProcaptchaWidget.js";
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
	const checkboxProps: {
		current:
			| {
					checked: boolean;
					loading: boolean;
					labelText: string;
					error?: string;
					onChange: (event: { nativeEvent: unknown }) => Promise<void>;
			  }
			| undefined;
	} = { current: undefined };
	const canvasProps: {
		current:
			| {
					originX: number;
					originY: number;
					background: string;
					piece: string;
					pieceSize: number;
					showRetry: boolean;
					submitting: boolean;
					onComplete: (
						x: number,
						y: number,
						events: PuzzleEvent[],
					) => Promise<void> | void;
			  }
			| undefined;
	} = { current: undefined };
	const honeypotQuestions: string[] = [];
	const translationsReady = { current: true };
	return {
		translationsReady,
		start,
		submitSolution,
		resetState,
		constructions,
		loadI18next,
		checkboxProps,
		canvasProps,
		honeypotQuestions,
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
vi.mock("../components/PuzzleCanvas.js", async () => {
	const { createElement: create } = await import("react");
	interface CanvasStubProps {
		originX: number;
		originY: number;
		background: string;
		piece: string;
		pieceSize: number;
		showRetry: boolean;
		submitting: boolean;
		onComplete: (
			x: number,
			y: number,
			events: PuzzleEvent[],
		) => Promise<void> | void;
	}
	const PuzzleCanvas = (canvasProps: CanvasStubProps) => {
		mocks.canvasProps.current = canvasProps;
		return create("div", { "data-cy": "canvas-stub" });
	};
	return { PuzzleCanvas };
});

// The checkbox and the honeypot are procaptcha-common's, and tested there. The
// stubs keep their contract — a change callback and a forwarded input ref —
// while letting a test drive the exact browser event the widget branches on,
// which jsdom cannot produce (it marks every dispatched event untrusted, and
// the real checkbox drops those before the widget ever sees them).
vi.mock("@prosopo/procaptcha-common", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("@prosopo/procaptcha-common")>();
	const { createElement: create, forwardRef } = await import("react");
	interface CheckboxStubProps {
		checked: boolean;
		loading: boolean;
		labelText: string;
		error?: string;
		onChange: (event: { nativeEvent: unknown }) => Promise<void>;
	}
	const Checkbox = (checkboxProps: CheckboxStubProps) => {
		mocks.checkboxProps.current = checkboxProps;
		return create("input", {
			type: "checkbox",
			readOnly: true,
			checked: checkboxProps.checked,
			"aria-label": checkboxProps.labelText,
			"data-error": checkboxProps.error,
			"data-loading": String(checkboxProps.loading),
		});
	};
	const Honeypot = forwardRef<HTMLInputElement, { encodedQuestion: string }>(
		({ encodedQuestion }, ref) => {
			mocks.honeypotQuestions.push(encodedQuestion);
			return create("input", { type: "text", ref, name: "honeypot" });
		},
	);
	return { ...actual, Checkbox, Honeypot };
});

vi.mock("@prosopo/locale", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@prosopo/locale")>();
	return {
		...actual,
		loadI18next: mocks.loadI18next,
		useTranslation: () => ({
			t: (key: string) => key,
			ready: mocks.translationsReady.current,
		}),
	};
});

let container: HTMLDivElement;
let root: Root;

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
	act(() => {
		root.render(createElement(Procaptcha, widgetProps) as ReactElement);
	});
};

beforeEach(() => {
	vi.clearAllMocks();
	mocks.constructions.length = 0;
	mocks.honeypotQuestions.length = 0;
	mocks.translationsReady.current = true;
	mocks.checkboxProps.current = undefined;
	mocks.canvasProps.current = undefined;
	mocks.start.mockResolvedValue(challengeResponse());
	mocks.submitSolution.mockResolvedValue(true);
	mocks.loadI18next.mockResolvedValue(undefined);
	container = document.createElement("div");
	document.body.appendChild(container);
	act(() => {
		root = createRoot(container);
	});
});

afterEach(() => {
	act(() => {
		root.unmount();
	});
	container.remove();
	// React schedules through timers, so a suite that leaves them faked makes
	// every later render land after its assertions.
	vi.useRealTimers();
	vi.restoreAllMocks();
});

const checkbox = (): HTMLInputElement => {
	const element = container.querySelector<HTMLInputElement>(
		'input[type="checkbox"]',
	);
	if (!element) throw new Error("expected a checkbox to be rendered");
	return element;
};

const canvas = (): Element | null =>
	container.querySelector('[data-cy="canvas-stub"]');

const honeypotInput = (): HTMLInputElement => {
	const element = container.querySelector<HTMLInputElement>(
		'input[name="honeypot"]',
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

/** Hand the widget the browser event a click on the checkbox would produce. */
const click = async (options: ClickOptions = {}): Promise<void> => {
	const nativeEvent = {
		isTrusted: options.trusted ?? true,
		clientX: options.clientX ?? 0,
		clientY: options.clientY ?? 0,
		...(options.touches ? { touches: options.touches } : {}),
	};
	await act(async () => {
		await mocks.checkboxProps.current?.onChange({ nativeEvent });
	});
};

/**
 * Start a solve without waiting for it to settle, for the tests that hold the
 * manager's promise open.
 */
const clickWithoutWaiting = (): void => {
	act(() => {
		void mocks.checkboxProps.current?.onChange({
			nativeEvent: { isTrusted: true, clientX: 0, clientY: 0 },
		});
	});
};

/** Fire the canvas completion callback the way a finished drag would. */
const complete = async (
	x = 200,
	y = 80,
	events: PuzzleEvent[] = [{ x: 200, y: 80, t: 5 }],
): Promise<void> => {
	await act(async () => {
		await mocks.canvasProps.current?.onComplete(x, y, events);
	});
};

describe("what the widget renders", () => {
	test("a visible widget shows a checkbox", () => {
		render(props());
		expect(checkbox()).toBeDefined();
	});

	test("an invisible widget shows no checkbox at all", () => {
		render(props({ config: config({ mode: ModeEnum.invisible }) }));
		expect(container.querySelector('input[type="checkbox"]')).toBeNull();
	});

	test("no puzzle is shown until a challenge has been fetched", () => {
		render(props());
		expect(canvas()).toBeNull();
	});

	test("a session with a honeypot question renders the honeypot", () => {
		render(props({ frictionlessState: frictionless({ hp: "question" }) }));
		expect(honeypotInput()).toBeDefined();
		expect(mocks.honeypotQuestions.at(-1)).toBe("question");
	});

	test("a session without one renders no bait at all", () => {
		render(props({ frictionlessState: frictionless() }));
		expect(container.querySelector('input[name="honeypot"]')).toBeNull();
	});

	test("the manager can read the honeypot input the widget rendered", () => {
		render(props({ frictionlessState: frictionless({ hp: "question" }) }));
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
		expect(mocks.checkboxProps.current?.labelText).toBe("WIDGET.I_AM_HUMAN");
	});

	test("the label is left empty while the translations load", () => {
		mocks.translationsReady.current = false;
		render(props());
		expect(mocks.checkboxProps.current?.labelText).toBe("");
	});

	test("the widget keeps the manager it started with across re-renders", () => {
		// `useRef(Manager(...))` re-evaluates the argument on every render, so
		// extra managers are constructed and thrown away; what matters is that
		// the widget still listens to the first one.
		render(props());
		render(props());
		act(() => {
			mocks.constructions[0]?.updateState({
				error: {
					message: "from the original manager",
					key: "API.UNKNOWN_ERROR",
				},
			});
		});
		expect(mocks.checkboxProps.current?.error).toBe(
			"from the original manager",
		);
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
			piece: challengeResponse().piece,
			submitting: false,
			showRetry: false,
		});
	});

	test("an untrusted click starts a solve but carries no coordinates", async () => {
		render(props());
		await click({ trusted: false, clientX: 12, clientY: 34 });
		expect(mocks.start).toHaveBeenCalledWith(0, 0);
	});

	test("a tap reports the coordinates of the first touch", async () => {
		render(props());
		await click({ touches: [{ clientX: 7, clientY: 9 }] });
		expect(mocks.start).toHaveBeenCalledWith(7, 9);
	});

	test("a touch event with no touches falls back to the origin", async () => {
		render(props());
		await click({ touches: [] });
		expect(mocks.start).toHaveBeenCalledWith(0, 0);
	});

	test("a second click while the first is in flight is ignored", async () => {
		let release: (challenge: GetPuzzleCaptchaResponse) => void = () => {
			// replaced synchronously by the promise executor below
		};
		mocks.start.mockReturnValue(
			new Promise<GetPuzzleCaptchaResponse>((resolve) => {
				release = resolve;
			}),
		);
		render(props());
		// Not awaited: the handler cannot settle until the challenge is
		// released, and awaiting it here would deadlock the test.
		clickWithoutWaiting();
		clickWithoutWaiting();
		expect(mocks.start).toHaveBeenCalledTimes(1);
		await act(async () => {
			release(challengeResponse());
		});
	});

	test("the checkbox shows a spinner while the solve is loading", async () => {
		let release: (challenge: GetPuzzleCaptchaResponse) => void = () => {
			// replaced synchronously by the promise executor below
		};
		mocks.start.mockReturnValue(
			new Promise<GetPuzzleCaptchaResponse>((resolve) => {
				release = resolve;
			}),
		);
		render(props());
		clickWithoutWaiting();
		expect(mocks.checkboxProps.current?.loading).toBe(true);
		await act(async () => {
			release(challengeResponse());
		});
		expect(mocks.checkboxProps.current?.loading).toBe(false);
	});

	test("a start that yields no challenge leaves the checkbox in place", async () => {
		mocks.start.mockResolvedValue(undefined);
		render(props());
		await click();
		expect(canvas()).toBeNull();
		expect(mocks.checkboxProps.current?.loading).toBe(false);
	});

	test("a start that throws returns the user to a usable checkbox", async () => {
		const onError = vi.fn<(error: Error) => void>();
		mocks.start.mockRejectedValue(new Error("provider down"));
		render(props({ callbacks: { onError } }));
		await click();
		// Without the guard the spinner would stay up for good: nothing awaits
		// the checkbox handler, so the rejection escapes as an unhandled one.
		expect(mocks.checkboxProps.current?.loading).toBe(false);
		expect(onError).toHaveBeenCalledWith(expect.any(Error));
	});

	test("a start that throws without an error callback is still recoverable", async () => {
		mocks.start.mockRejectedValue(new Error("provider down"));
		render(props());
		await click();
		expect(mocks.checkboxProps.current?.loading).toBe(false);
	});
});

describe("autoStart", () => {
	test("fetches a challenge and opens the puzzle without a click", async () => {
		await act(async () => {
			root.render(
				createElement(
					Procaptcha,
					props({ autoStart: true, startCoords: { x: 5, y: 6 } }),
				) as ReactElement,
			);
		});
		expect(mocks.start).toHaveBeenCalledWith(5, 6);
		expect(canvas()).not.toBeNull();
	});

	test("starts at the origin when no coordinates were handed over", async () => {
		await act(async () => {
			root.render(
				createElement(Procaptcha, props({ autoStart: true })) as ReactElement,
			);
		});
		expect(mocks.start).toHaveBeenCalledWith(0, 0);
	});

	test("a failed autoStart leaves the checkbox usable", async () => {
		mocks.start.mockRejectedValue(new Error("nope"));
		await act(async () => {
			root.render(
				createElement(Procaptcha, props({ autoStart: true })) as ReactElement,
			);
		});
		expect(canvas()).toBeNull();
		expect(mocks.checkboxProps.current?.loading).toBe(false);
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
		expect(mocks.checkboxProps.current?.loading).toBe(false);
	});

	test("a rejected solution asks for another go on a fresh challenge", async () => {
		mocks.submitSolution.mockResolvedValue(false);
		const retryChallenge = challengeResponse({
			originX: 40,
			piece: "data:image/webp;base64,cmV0cnk=",
		});
		mocks.start
			.mockResolvedValueOnce(challengeResponse())
			.mockResolvedValue(retryChallenge);
		await openPuzzle();
		await complete();
		expect(canvas()).not.toBeNull();
		expect(mocks.canvasProps.current).toMatchObject({
			showRetry: true,
			originX: 40,
			piece: "data:image/webp;base64,cmV0cnk=",
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
			new Promise<boolean>((resolve) => {
				release = resolve;
			}),
		);
		await openPuzzle();
		// Not awaited: the handler cannot settle until the verdict is released.
		act(() => {
			void mocks.canvasProps.current?.onComplete(200, 80, []);
		});
		expect(mocks.canvasProps.current?.submitting).toBe(true);
		expect(mocks.checkboxProps.current?.loading).toBe(true);
		await act(async () => {
			release(true);
		});
	});
});

describe("invisible mode", () => {
	const execute = async (): Promise<void> => {
		await act(async () => {
			document.dispatchEvent(new Event("procaptcha:execute"));
			await Promise.resolve();
		});
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

	test("the listener is dropped when the widget unmounts", async () => {
		render(props({ config: config({ mode: ModeEnum.invisible }) }));
		act(() => {
			root.unmount();
		});
		act(() => {
			root = createRoot(container);
		});
		await execute();
		expect(mocks.start).not.toHaveBeenCalled();
	});
});

describe("an invalidated session", () => {
	const invalidate = (
		key = "CAPTCHA.NO_SESSION_FOUND",
		message = "session gone",
	): void => {
		act(() => {
			mocks.constructions[0]?.updateState({ error: { message, key } });
		});
	};

	test("the error is shown on the checkbox and the puzzle is torn down", async () => {
		render(props());
		await click();
		invalidate("API.UNKNOWN_ERROR", "something broke");
		expect(mocks.checkboxProps.current?.error).toBe("something broke");
		expect(canvas()).toBeNull();
		expect(mocks.checkboxProps.current?.loading).toBe(false);
	});

	test("the host is told to re-mint, with the coordinates of the original click", async () => {
		const onSessionInvalidated = vi.fn<(x?: number, y?: number) => void>();
		render(props({ onSessionInvalidated }));
		await click({ clientX: 12, clientY: 34 });
		invalidate();
		expect(onSessionInvalidated).toHaveBeenCalledWith(12, 34);
	});

	test("the host is told only once, however many errors arrive", async () => {
		const onSessionInvalidated = vi.fn<(x?: number, y?: number) => void>();
		render(props({ onSessionInvalidated }));
		await click();
		invalidate("CAPTCHA.NO_SESSION_FOUND", "gone");
		invalidate("CAPTCHA.NO_SESSION_FOUND", "gone again");
		expect(onSessionInvalidated).toHaveBeenCalledTimes(1);
	});

	test("with no host handler the frictionless session restarts instead", async () => {
		vi.useFakeTimers();
		const restart = vi.fn<() => void>();
		render(props({ frictionlessState: frictionless({ restart }) }));
		invalidate();
		expect(restart).not.toHaveBeenCalled();
		await act(async () => {
			await vi.advanceTimersByTimeAsync(100);
		});
		expect(restart).toHaveBeenCalledTimes(1);
		vi.useRealTimers();
	});

	test("a restart pending at unmount is cancelled", async () => {
		vi.useFakeTimers();
		const restart = vi.fn<() => void>();
		render(props({ frictionlessState: frictionless({ restart }) }));
		invalidate();
		act(() => {
			root.unmount();
		});
		await act(async () => {
			await vi.advanceTimersByTimeAsync(200);
		});
		expect(restart).not.toHaveBeenCalled();
		act(() => {
			root = createRoot(container);
		});
		vi.useRealTimers();
	});

	test("a lost session with nothing to recover it is simply surfaced", async () => {
		render(props());
		invalidate();
		expect(mocks.checkboxProps.current?.error).toBe("session gone");
	});

	test("no coordinates are reported when the session was never clicked into", () => {
		const onSessionInvalidated = vi.fn<(x?: number, y?: number) => void>();
		render(props({ onSessionInvalidated }));
		invalidate();
		expect(onSessionInvalidated).toHaveBeenCalledWith(undefined, undefined);
	});
});
