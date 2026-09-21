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
import type { ProcaptchaPowHandle } from "./procaptchaWidget.js";

export type { ProcaptchaPowHandle };

export type ProcaptchaPowMountFn = (
	container: HTMLElement,
	props: ProcaptchaProps,
) => ProcaptchaPowHandle;

/**
 * Dynamic import so the PoW widget lands in its own chunk, replacing the
 * `lazy()` + `<Suspense>` pair that used to provide the split.
 */
export const loadProcaptchaPow = async (): Promise<ProcaptchaPowMountFn> =>
	(await import("./procaptchaWidget.js")).mountProcaptchaPowWidget;

export const mountProcaptchaPow = (
	container: HTMLElement,
	props: ProcaptchaProps,
): ProcaptchaPowHandle => {
	let destroyed = false;
	let inner: ProcaptchaPowHandle | undefined;

	void loadProcaptchaPow().then((mount: ProcaptchaPowMountFn) => {
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
