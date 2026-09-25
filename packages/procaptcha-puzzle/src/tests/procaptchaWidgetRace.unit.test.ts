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

/**
 * @vitest-environment jsdom
 */

import type { Ti18n } from "@prosopo/locale";
import type { CheckboxProps, Component } from "@prosopo/procaptcha-common";
import {
	ApiParams,
	type GetPuzzleCaptchaResponse,
	ProcaptchaConfigSchema,
	type ProcaptchaProps,
} from "@prosopo/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PuzzleCanvasProps } from "../components/puzzleCanvas.js";
import type { Manager } from "../services/Manager.js";

type PuzzleManager = ReturnType<typeof Manager>;

const mocks = vi.hoisted(() => ({
	start: vi.fn(),
	submitSolution: vi.fn(),
	checkboxProps: [] as CheckboxProps[],
	canvasProps: [] as PuzzleCanvasProps[],
}));

vi.mock("../services/Manager.js", () => ({
	Manager: (): PuzzleManager => ({
		start: mocks.start,
		submitSolution: mocks.submitSolution,
		resetState: vi.fn(),
	}),
}));

vi.mock("../components/puzzleCanvas.js", () => ({
	mountPuzzleCanvas: (
		props: PuzzleCanvasProps,
	): Component<PuzzleCanvasProps> => {
		mocks.canvasProps.push(props);
		return {
			update: (next: PuzzleCanvasProps) => {
				mocks.canvasProps.push(next);
			},
			destroy: vi.fn(),
		};
	},
}));

vi.mock("@prosopo/procaptcha-common", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("@prosopo/procaptcha-common")>();
	return {
		...actual,
		mountCheckbox: (
			_root: HTMLElement,
			props: CheckboxProps,
		): Component<CheckboxProps> => {
			mocks.checkboxProps.push(props);
			return {
				update: (next: CheckboxProps) => {
					mocks.checkboxProps.push(next);
				},
				destroy: vi.fn(),
			};
		},
	};
});

const { mountProcaptchaPuzzleWidget } = await import(
	"../components/procaptchaWidget.js"
);

const challenge = (id: string): GetPuzzleCaptchaResponse => ({
	[ApiParams.status]: "ok",
	[ApiParams.challenge]: `1___${id}___dapp`,
	[ApiParams.background]: `background-${id}`,
	[ApiParams.piece]: `piece-${id}`,
	[ApiParams.pieceSize]: 40,
	[ApiParams.originX]: 10,
	[ApiParams.originY]: 10,
	[ApiParams.timestamp]: "1",
	[ApiParams.signature]: {
		[ApiParams.provider]: { [ApiParams.challenge]: id },
	},
});

type Deferred<T> = { promise: Promise<T>; resolve: (value: T) => void };

const deferred = <T>(): Deferred<T> => {
	let resolve: (value: T) => void = () => undefined;
	const promise = new Promise<T>((r) => {
		resolve = r;
	});
	return { promise, resolve };
};

const flush = async (): Promise<void> => {
	for (let i = 0; i < 5; i++) await Promise.resolve();
};

const latest = <T>(items: T[]): T => {
	const item = items[items.length - 1];
	if (undefined === item) throw new Error("nothing rendered yet");
	return item;
};

const click = (): Promise<void> =>
	latest(mocks.checkboxProps).onChange(new MouseEvent("click"));

const i18n: Ti18n = {
	language: "en",
	isInitialized: true,
	t: (key: string): string => key,
	changeLanguage: (): Promise<void> => Promise.resolve(),
	hasLoadedNamespace: (): boolean => true,
	on: (): void => undefined,
	off: (): void => undefined,
};

const mount = (): void => {
	const props: ProcaptchaProps = {
		config: ProcaptchaConfigSchema.parse({
			account: { address: "5C4hrfjw9DjXZTzV3MwzrrAr9P1MJhSrvWGWqi1eSuyUpnhM" },
		}),
		callbacks: {},
		i18n,
	};
	mountProcaptchaPuzzleWidget(document.createElement("div"), props);
};

beforeEach(() => {
	vi.clearAllMocks();
	mocks.checkboxProps.length = 0;
	mocks.canvasProps.length = 0;
});

describe("puzzle widget, out-of-order results", () => {
	it("does not reopen a puzzle the user dismissed while the answer was being checked", async () => {
		mount();
		mocks.start.mockResolvedValueOnce(challenge("a"));
		await click();
		await flush();
		const submitted = deferred<boolean>();
		mocks.submitSolution.mockReturnValueOnce(submitted.promise);
		mocks.start.mockResolvedValue(challenge("b"));

		latest(mocks.canvasProps).onComplete(1, 1, []);
		await flush();
		latest(mocks.canvasProps).onDismiss?.();
		await flush();
		const canvasRendersAfterDismiss = mocks.canvasProps.length;
		submitted.resolve(false);
		await flush();

		expect(mocks.canvasProps.length).toBe(canvasRendersAfterDismiss);
		expect(mocks.start).toHaveBeenCalledTimes(1);
		expect(latest(mocks.checkboxProps).loading).toBe(false);
	});

	it("shows the newer challenge when an older retry lands after it", async () => {
		mount();
		mocks.start.mockResolvedValueOnce(challenge("a"));
		await click();
		await flush();
		const retry = deferred<GetPuzzleCaptchaResponse | undefined>();
		mocks.submitSolution.mockResolvedValueOnce(false);
		mocks.start.mockReturnValueOnce(retry.promise);

		latest(mocks.canvasProps).onComplete(1, 1, []);
		await flush();
		latest(mocks.canvasProps).onDismiss?.();
		await flush();
		mocks.start.mockResolvedValueOnce(challenge("c"));
		await click();
		await flush();
		retry.resolve(challenge("b"));
		await flush();

		expect(latest(mocks.canvasProps).background).toBe("background-c");
	});
});
