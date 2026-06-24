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
import { ProcaptchaFrictionless } from "@prosopo/procaptcha-frictionless";
import type {
	ProcaptchaCallbacks,
	ProcaptchaClientConfigInput,
} from "@prosopo/types";
import { useState } from "react";

interface BundleCaptchaProps {
	config: ProcaptchaClientConfigInput;
	callbacks: ProcaptchaCallbacks;
	i18n: Ti18n;
	container: HTMLElement;
}

// Universal captcha mount used by the script-tag bundle. Wraps
// ProcaptchaFrictionless with a `key`-driven restart hook so a "no session"
// error can fully unmount and remount the underlying widget. The server
// decides which concrete challenge type to render via the /frictionless
// endpoint — the wrapper itself is type-agnostic.
const BundleCaptcha = (props: BundleCaptchaProps) => {
	const { config, callbacks, i18n, container } = props;

	const [componentKey, setComponentKey] = useState(0);

	const restart = () => {
		setComponentKey((prevKey) => prevKey + 1);
	};

	return (
		<ProcaptchaFrictionless
			key={componentKey}
			config={config}
			callbacks={getDefaultEvents(callbacks)}
			restart={restart}
			i18n={i18n}
			container={container}
		/>
	);
};

export { BundleCaptcha };
