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
import { getDefaultEvents } from "@prosopo/procaptcha-common";
import {
	type ProcaptchaFrictionlessHandle,
	mountProcaptchaFrictionless,
} from "@prosopo/procaptcha-frictionless";
import type {
	ProcaptchaCallbacks,
	ProcaptchaClientConfigInput,
} from "@prosopo/types";

export interface BundleCaptchaProps {
	config: ProcaptchaClientConfigInput;
	callbacks: ProcaptchaCallbacks;
	i18n: Ti18n;
	container: HTMLElement;
}

export interface BundleCaptchaHandle {
	destroy(): void;
}

// Universal captcha mount used by the script-tag bundle. Wraps
// ProcaptchaFrictionless with a restart hook so a "no session" error can fully
// tear down and re-mount the underlying widget. The server decides which
// concrete challenge type to render via the /frictionless endpoint — the
// wrapper itself is type-agnostic.
//
// The React version drove the remount by bumping a `key`; here the teardown is
// explicit. It has to be: nothing reconciles the modal portal, the honeypot in
// light DOM or the document-level listeners for us, so `restart` destroys the
// current instance before mounting a fresh one.
export const mountBundleCaptcha = (
	target: HTMLElement,
	props: BundleCaptchaProps,
): BundleCaptchaHandle => {
	const { config, callbacks, i18n, container } = props;

	let current: ProcaptchaFrictionlessHandle | undefined;
	let destroyed = false;

	const mount = () => {
		if (destroyed) {
			return;
		}
		current = mountProcaptchaFrictionless(target, {
			config,
			callbacks: getDefaultEvents(callbacks),
			restart,
			i18n,
			container,
		});
	};

	function restart(): void {
		current?.destroy();
		current = undefined;
		mount();
	}

	mount();

	return {
		destroy: () => {
			destroyed = true;
			current?.destroy();
			current = undefined;
		},
	};
};
