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

export interface WidgetHandle {
	destroy(): void;
}

export type WidgetMountFn<H extends WidgetHandle = WidgetHandle> = (
	container: HTMLElement,
	props: ProcaptchaProps,
) => H;

/**
 * Wraps a dynamically imported widget so it lands in its own chunk. A destroy
 * that arrives before the chunk has loaded cancels the mount, otherwise the
 * widget would appear later as an orphan nothing holds a handle to.
 */
export const lazyMount =
	<H extends WidgetHandle>(
		load: () => Promise<WidgetMountFn<H>>,
	): WidgetMountFn =>
	(container: HTMLElement, props: ProcaptchaProps): WidgetHandle => {
		let destroyed = false;
		let inner: H | undefined;

		void load().then((mount: WidgetMountFn<H>) => {
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
