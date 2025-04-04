// Copyright 2021-2025 Prosopo (UK) Ltd.
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

import type { ProcaptchaCallbacks, ProcaptchaProps } from "@prosopo/types";
import { type LazyExoticComponent, Suspense, lazy } from "react";
import type { ReactElement } from "react";

// Define the function signature more precisely
type ProcaptchaWidgetComponent = (
	props: ProcaptchaProps,
) => ReactElement | null;

// Lazy load the widget with the correct type signature
const ProcaptchaWidget: LazyExoticComponent<ProcaptchaWidgetComponent> = lazy(
	async () => import("./ProcaptchaWidget.js"),
);

export const ProcaptchaPow = (props: ProcaptchaProps) => (
	<Suspense>
		<ProcaptchaWidget
			config={props.config}
			callbacks={props.callbacks}
			frictionlessState={props.frictionlessState}
			i18n={props.i18n}
		/>
	</Suspense>
);
