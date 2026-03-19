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
import { type LazyExoticComponent, Suspense, lazy } from "react";
import type { ReactElement } from "react";

type ProcaptchaPuzzleWidgetComponent = (
	props: ProcaptchaProps,
) => ReactElement | null;

const ProcaptchaPuzzleWidget: LazyExoticComponent<ProcaptchaPuzzleWidgetComponent> =
	lazy(async () => import("./ProcaptchaPuzzleWidget.js"));

export const ProcaptchaPuzzle = (props: ProcaptchaProps) => (
	<Suspense>
		<ProcaptchaPuzzleWidget
			config={props.config}
			callbacks={props.callbacks}
			frictionlessState={props.frictionlessState}
			i18n={props.i18n}
		/>
	</Suspense>
);
