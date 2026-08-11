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

import { darkTheme, lightTheme } from "@prosopo/widget-skeleton";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import CaptchaComponent from "../components/CaptchaComponent.js";
import { captcha, challengeResponse } from "./harness.js";
import { type Mounted, asRgb, fire, mount } from "./render.js";

// Translations are the locale package's job; keys stand in for copy here so
// the assertions name the string the widget asked for.
vi.mock("@prosopo/locale", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@prosopo/locale")>();
	return { ...actual, useTranslation: () => ({ t: (key: string) => key }) };
});

let mounted: Mounted;
const onSubmit = vi.fn<() => void>();
const onCancel = vi.fn<() => void>();
const onClick = vi.fn<(hash: string, x?: number, y?: number) => void>();
const onNext = vi.fn<() => void>();
const onReload = vi.fn<() => void>();

const twoRoundChallenge = () =>
	challengeResponse({
		captchas: [
			captcha({ target: "bus" }),
			captcha({ captchaId: "captcha-id-2", target: "train" }),
		],
	});

const render = (
	props: {
		challenge?: ReturnType<typeof challengeResponse>;
		index?: number;
		solutions?: [string, number, number][][];
		themeColor?: "light" | "dark";
	} = {},
): void => {
	mounted.render(
		<CaptchaComponent
			challenge={props.challenge ?? challengeResponse()}
			index={props.index ?? 0}
			solutions={props.solutions ?? [[]]}
			onSubmit={onSubmit}
			onCancel={onCancel}
			onClick={onClick}
			onNext={onNext}
			onReload={onReload}
			themeColor={props.themeColor ?? "light"}
		/>,
	);
};

const buttonLabelled = (label: string): HTMLButtonElement => {
	const button = mounted.container.querySelector<HTMLButtonElement>(
		`button[aria-label="${label}"]`,
	);
	if (!button) throw new Error(`expected a button labelled ${label}`);
	return button;
};

const text = (): string => mounted.container.textContent ?? "";

beforeEach(() => {
	vi.clearAllMocks();
	mounted = mount();
});

afterEach(() => {
	mounted.unmount();
});

describe("the prompt", () => {
	test("names what the user has to pick out", () => {
		render();
		expect(text()).toContain("WIDGET.SELECT_ALL");
		expect(text()).toContain("bus");
	});

	test("tells the user what to do when nothing matches", () => {
		render();
		expect(text()).toContain("WIDGET.IF_NONE_CLICK_NEXT");
	});

	test("shows the target of the round being displayed, not the first", () => {
		render({ challenge: twoRoundChallenge(), index: 1, solutions: [[], []] });
		expect(text()).toContain("train");
	});
});

describe("the grid", () => {
	test("renders the images of the current round", () => {
		render();
		expect(mounted.container.querySelectorAll("img")).toHaveLength(2);
	});

	test("passes clicks straight through with their coordinates", () => {
		render();
		const image = mounted.container.querySelector("img");
		if (!image) throw new Error("expected an image");
		fire(image, "click", { clientX: 8, clientY: 9 });
		expect(onClick).toHaveBeenCalledWith("hash-1", 8, 9);
	});

	test("marks the images already selected for this round", () => {
		render({ solutions: [[["hash-1", 0, 0]]] });
		const overlay = mounted.container.querySelector("svg")?.parentElement;
		expect(overlay?.style.visibility).toBe("visible");
	});

	test("carries the test hook naming the round on screen", () => {
		render({ challenge: twoRoundChallenge(), index: 1, solutions: [[], []] });
		expect(
			mounted.container.querySelector('[data-cy="captcha-1"]'),
		).not.toBeNull();
	});

	test("refuses a round the challenge does not have", () => {
		// Without noWrap the index would wrap and quietly show a different
		// round's images, which the user's answers would then be scored against.
		expect(() => render({ index: 5 })).toThrow(/larger than array length/);
	});

	test("refuses a round with no solution slot", () => {
		expect(() => render({ solutions: [] })).toThrow();
	});
});

describe("the controls", () => {
	test("offers cancel, reload and a forward action", () => {
		render();
		expect(mounted.container.querySelectorAll("button")).toHaveLength(3);
	});

	test("cancelling tells the manager to close the challenge", () => {
		render();
		fire(buttonLabelled("WIDGET.CANCEL"), "click");
		expect(onCancel).toHaveBeenCalledTimes(1);
	});

	test("reloading asks for a fresh challenge", () => {
		render();
		const reload = mounted.container.querySelectorAll("button")[1];
		if (!reload) throw new Error("expected a reload button");
		fire(reload, "click");
		expect(onReload).toHaveBeenCalledTimes(1);
	});

	test("the last round submits rather than advancing", () => {
		render();
		expect(buttonLabelled("WIDGET.SUBMIT")).toBeDefined();
		fire(buttonLabelled("WIDGET.SUBMIT"), "click");
		expect(onSubmit).toHaveBeenCalledTimes(1);
		expect(onNext).not.toHaveBeenCalled();
	});

	test("an earlier round advances rather than submitting", () => {
		render({ challenge: twoRoundChallenge(), index: 0, solutions: [[], []] });
		fire(buttonLabelled("WIDGET.NEXT"), "click");
		expect(onNext).toHaveBeenCalledTimes(1);
		expect(onSubmit).not.toHaveBeenCalled();
	});

	test("the final round of a multi-round challenge submits", () => {
		render({ challenge: twoRoundChallenge(), index: 1, solutions: [[], []] });
		expect(buttonLabelled("WIDGET.SUBMIT")).toBeDefined();
	});

	test("a synthetic click on cancel is ignored", () => {
		render();
		fire(buttonLabelled("WIDGET.CANCEL"), "click", { trusted: false });
		expect(onCancel).not.toHaveBeenCalled();
	});
});

describe("theming", () => {
	test("uses the light palette for the panel", () => {
		render({ themeColor: "light" });
		const panel = mounted.container.firstElementChild;
		expect((panel as HTMLElement)?.style.backgroundColor).toBe(
			asRgb(lightTheme.palette.background.default),
		);
	});

	test("uses the dark palette for the panel", () => {
		render({ themeColor: "dark" });
		const panel = mounted.container.firstElementChild;
		expect((panel as HTMLElement)?.style.backgroundColor).toBe(
			asRgb(darkTheme.palette.background.default),
		);
	});

	test("passes the theme down to the buttons", () => {
		// The cancel button is an M3 text button, so the theme shows up in its
		// label colour rather than in a border.
		render({ themeColor: "dark" });
		expect(buttonLabelled("WIDGET.CANCEL").style.color).toBe(
			asRgb(darkTheme.palette.primary.main),
		);
	});
});
