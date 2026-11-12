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
import type { ProcaptchaWidgetHandle } from "./procaptchaWidget.js";

export type { ProcaptchaWidgetHandle };

/**
 * Mount function for the image captcha, resolved through a dynamic import so
 * the widget's own code stays out of whatever chunk the caller lives in. This
 * replaces the `lazy()` + `<Suspense>` pair that used to do the code splitting.
 */
export type ProcaptchaMountFn = (
	container: HTMLElement,
	props: ProcaptchaProps,
) => ProcaptchaWidgetHandle;

export const loadProcaptcha = async (): Promise<ProcaptchaMountFn> =>
	(await import("./procaptchaWidget.js")).mountProcaptchaImageWidget;

/**
 * Mount without awaiting the chunk. Nothing renders until the import lands,
 * matching `<Suspense>` with no fallback; destroying before then cancels the
 * mount rather than leaving an orphan behind.
 */
export const mountProcaptcha = (
	container: HTMLElement,
	props: ProcaptchaProps,
): ProcaptchaWidgetHandle => {
	let destroyed = false;
	let inner: ProcaptchaWidgetHandle | undefined;

	void loadProcaptcha().then((mount: ProcaptchaMountFn) => {
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
