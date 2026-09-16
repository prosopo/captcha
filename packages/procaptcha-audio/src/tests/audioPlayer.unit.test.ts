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
import type { AudioEvent } from "@prosopo/types";
import { type Theme, lightTheme } from "@prosopo/widget-skeleton";
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
import { AudioPlayer } from "../components/AudioPlayer.js";
import { CLIP_URI } from "./managerHarness.js";

/**
 * The player is the only piece of the audio flow the user touches: it owns
 * playback, the answer field, and the replay/keystroke telemetry the provider
 * scores. Every test drives real DOM events against a real render rather than
 * calling the handlers directly.
 *
 * Accessibility assertions are first-class here rather than nice-to-have. This
 * widget exists so a user who cannot complete a visual challenge has a route
 * that works; a regression that drops the live region or the input label costs
 * exactly those users and nobody else, so nothing else would catch it.
 */

const OTHER_CLIP_URI = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10";

interface PlayerProps {
	clip: string;
	characterCount: number;
	onComplete: Mock<
		(answer: string, replays: number, audioEvents: AudioEvent[]) => void
	>;
	showRetry: boolean;
	submitting: boolean;
	theme: Theme;
	t: Ti18n["t"];
}

let container: HTMLDivElement;
let root: Root;
let onComplete: Mock<
	(answer: string, replays: number, audioEvents: AudioEvent[]) => void
>;

/** Echoes the key back so assertions name the string the user would hear read out. */
const translate = ((key: string) => key) as unknown as Ti18n["t"];

const props = (overrides: Partial<PlayerProps> = {}): PlayerProps => ({
	clip: CLIP_URI,
	characterCount: 5,
	onComplete,
	showRetry: false,
	submitting: false,
	theme: lightTheme,
	t: translate,
	...overrides,
});

const render = (playerProps: PlayerProps): void => {
	act(() => {
		root.render(createElement(AudioPlayer, playerProps) as ReactElement);
	});
};

const find = <T extends HTMLElement>(selector: string): T => {
	const element = container.querySelector<T>(selector);
	if (!element) throw new Error(`expected ${selector} to be rendered`);
	return element;
};

const clip = (): HTMLAudioElement =>
	find<HTMLAudioElement>('[data-cy="prosopo-audio-clip"]');
const playButton = (): HTMLButtonElement =>
	find<HTMLButtonElement>('[data-cy="prosopo-audio-play"]');
const submitButton = (): HTMLButtonElement =>
	find<HTMLButtonElement>('[data-cy="prosopo-audio-submit"]');
const answerInput = (): HTMLInputElement =>
	find<HTMLInputElement>('[data-cy="prosopo-audio-answer"]');
const liveRegion = (): HTMLElement => find('[aria-live="polite"]');

const click = (element: HTMLElement): void => {
	act(() => {
		element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
	});
};

/**
 * Types into the controlled input the way React expects: setting `value`
 * directly bypasses React's value tracker and the change event is ignored.
 */
const type = (value: string): void => {
	const input = answerInput();
	const setter = Object.getOwnPropertyDescriptor(
		HTMLInputElement.prototype,
		"value",
	)?.set;
	act(() => {
		setter?.call(input, value);
		input.dispatchEvent(new Event("input", { bubbles: true }));
	});
};

const pressEnter = (): void => {
	act(() => {
		answerInput().dispatchEvent(
			new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
		);
	});
};

/** Resolves the play() promise the component chained onto. */
const settle = async (): Promise<void> => {
	await act(async () => {
		await Promise.resolve();
	});
};

let play: Mock<() => Promise<void>>;

beforeEach(() => {
	vi.clearAllMocks();
	onComplete = vi.fn();
	play = vi.fn<() => Promise<void>>();
	play.mockResolvedValue(undefined);
	Object.defineProperty(HTMLMediaElement.prototype, "play", {
		configurable: true,
		writable: true,
		value: play,
	});
	// The component reveals itself on the next frame; without a synchronous
	// rAF every test would assert against the pre-transition render.
	vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
		cb(0);
		return 0;
	});
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
	vi.restoreAllMocks();
});

describe("what it renders", () => {
	test("asks for the number of characters the challenge carries", () => {
		render(props({ characterCount: 6 }));
		expect(container.textContent).toContain("WIDGET.AUDIO_INSTRUCTIONS");
	});

	test("loads the clip it was handed", () => {
		render(props());
		expect(clip().getAttribute("src")).toBe(CLIP_URI);
	});

	test("suppresses the browser's own controls, which can offer a download", () => {
		render(props());
		// A native control bar offers a download in several browsers, which
		// would hand the clip over as a file.
		expect(clip().hasAttribute("controls")).toBe(false);
	});

	test("labels the input so a screen reader says what to type", () => {
		render(props());
		expect(answerInput().getAttribute("aria-label")).toBe(
			"WIDGET.AUDIO_INPUT_LABEL",
		);
	});

	test("names the dialog region so it is announced as its own thing", () => {
		render(props());
		expect(
			container.querySelector('[aria-label="WIDGET.AUDIO_CHALLENGE_LABEL"]'),
		).not.toBeNull();
	});

	test("carries a polite live region rather than an interrupting one", () => {
		render(props());
		// Feedback, not an emergency: assertive would cut across the user
		// mid-word while they are typing the answer.
		expect(liveRegion().getAttribute("aria-live")).toBe("polite");
	});

	test("keeps the field free of autofill, which would offer the last answer", () => {
		render(props());
		expect(answerInput().getAttribute("autocomplete")).toBe("off");
	});

	test("takes the numeric keypad without the number-input behaviour", () => {
		render(props());
		// `type="number"` strips leading zeros, and a spoken answer can start
		// with one.
		expect(answerInput().getAttribute("type")).toBe("text");
		expect(answerInput().getAttribute("inputmode")).toBe("numeric");
	});

	test("allows slack for separators without letting the field run away", () => {
		render(props({ characterCount: 5 }));
		expect(answerInput().maxLength).toBe(10);
	});

	test("focuses the input, so a keyboard user lands on the work", () => {
		render(props());
		expect(document.activeElement).toBe(answerInput());
	});
});

describe("playback", () => {
	test("never autoplays — the user presses play", () => {
		render(props());
		expect(play).not.toHaveBeenCalled();
	});

	test("plays the clip when asked", async () => {
		render(props());
		click(playButton());
		await settle();
		expect(play).toHaveBeenCalledTimes(1);
		expect(liveRegion().textContent).toBe("WIDGET.AUDIO_PLAYING");
	});

	test("restarts from the beginning on a replay", async () => {
		render(props());
		click(playButton());
		await settle();
		clip().currentTime = 2;
		click(playButton());
		await settle();
		expect(clip().currentTime).toBe(0);
	});

	test("says so when the browser refuses to play", async () => {
		play.mockRejectedValue(new Error("blocked"));
		render(props());
		click(playButton());
		await settle();
		// The one widget where a user cannot fall back to looking at it, so a
		// silent failure is indistinguishable from a broken challenge.
		expect(liveRegion().textContent).toBe("WIDGET.AUDIO_PLAYBACK_FAILED");
	});

	test("announces the clip finishing", async () => {
		render(props());
		click(playButton());
		await settle();
		act(() => {
			clip().dispatchEvent(new Event("ended"));
		});
		expect(liveRegion().textContent).toBe("WIDGET.AUDIO_FINISHED");
	});
});

describe("answering", () => {
	test("will not submit an empty answer", () => {
		render(props());
		expect(submitButton().disabled).toBe(true);
		click(submitButton());
		expect(onComplete).not.toHaveBeenCalled();
	});

	test("submits what the user typed", () => {
		render(props());
		type("96475");
		click(submitButton());
		expect(onComplete).toHaveBeenCalledWith("96475", 0, expect.any(Array));
	});

	test("submits on Enter, so the answer can be finished from the keyboard", () => {
		render(props());
		type("96475");
		pressEnter();
		expect(onComplete).toHaveBeenCalledWith("96475", 0, expect.any(Array));
	});

	test("passes separators through for the provider to normalise", () => {
		render(props());
		type("9 6 4 7 5");
		click(submitButton());
		expect(onComplete).toHaveBeenCalledWith("9 6 4 7 5", 0, expect.any(Array));
	});

	test("reports the replays, not the plays", async () => {
		render(props());
		click(playButton());
		await settle();
		click(playButton());
		await settle();
		click(playButton());
		await settle();
		type("96475");
		click(submitButton());
		// Heard it three times: the first is the play, the other two replays.
		expect(onComplete).toHaveBeenCalledWith("96475", 2, expect.any(Array));
	});

	test("reports the playback and keystroke trail", async () => {
		render(props());
		click(playButton());
		await settle();
		type("9");
		type("96");
		click(submitButton());
		const events = onComplete.mock.calls[0]?.[2];
		if (!events) throw new Error("expected an event trail");
		expect(events.map((event) => event.kind)).toEqual(["play", "key", "key"]);
		expect(events.every((event) => event.t >= 0)).toBe(true);
	});

	test("does not resubmit while a submission is in flight", () => {
		render(props());
		type("96475");
		render(props({ submitting: true }));
		click(submitButton());
		expect(onComplete).not.toHaveBeenCalled();
		expect(answerInput().disabled).toBe(true);
	});
});

describe("a wrong answer", () => {
	test("says so, where a screen reader will hear it", () => {
		render(props());
		render(props({ showRetry: true }));
		// The visual shake is invisible to a screen-reader user, so the live
		// region is the only feedback they get that the answer was rejected.
		expect(liveRegion().textContent).toBe("WIDGET.AUDIO_INCORRECT");
	});

	test("clears the typed answer when a fresh clip arrives", () => {
		render(props());
		type("11111");
		render(props({ clip: OTHER_CLIP_URI, showRetry: true }));
		expect(answerInput().value).toBe("");
	});

	test("starts the replay count over, so telemetry is per challenge", async () => {
		render(props());
		click(playButton());
		await settle();
		click(playButton());
		await settle();
		render(props({ clip: OTHER_CLIP_URI, showRetry: true }));
		click(playButton());
		await settle();
		type("96475");
		click(submitButton());
		// A retry that inherited the previous count would report telemetry
		// from a challenge the user has already failed.
		expect(onComplete).toHaveBeenCalledWith("96475", 0, expect.any(Array));
	});

	test("stops the outgoing clip rather than letting it play over the new one", () => {
		const pause = vi.fn<() => void>();
		Object.defineProperty(HTMLMediaElement.prototype, "pause", {
			configurable: true,
			writable: true,
			value: pause,
		});
		render(props());
		render(props({ clip: OTHER_CLIP_URI, showRetry: true }));
		expect(pause).toHaveBeenCalled();
	});
});
