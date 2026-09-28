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

import type { ProcaptchaProps } from "@prosopo/types";
import type { ProcaptchaPuzzleHandle } from "./procaptchaWidget.js";

export type { ProcaptchaPuzzleHandle };

export type ProcaptchaPuzzleMountFn = (
	container: HTMLElement,
	props: ProcaptchaProps,
) => ProcaptchaPuzzleHandle;

/**
 * Dynamic import so the puzzle widget lands in its own chunk, replacing the
 * `lazy()` + `<Suspense>` pair that used to provide the split.
 */
export const loadProcaptchaPuzzle =
	async (): Promise<ProcaptchaPuzzleMountFn> =>
		(await import("./procaptchaWidget.js")).mountProcaptchaPuzzleWidget;

export const mountProcaptchaPuzzle = (
	container: HTMLElement,
	props: ProcaptchaProps,
): ProcaptchaPuzzleHandle => {
	let destroyed = false;
	let inner: ProcaptchaPuzzleHandle | undefined;

	void loadProcaptchaPuzzle().then((mount: ProcaptchaPuzzleMountFn) => {
		if (destroyed) {
			return;
		}
		inner = mount(container, props);
	});

	return {
		destroy: () => {
			destroyed = true;
			inner?.destroy();
			inner = undefined;
		},
	};
};
