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

import { type WidgetMountFn, lazyMount } from "@prosopo/procaptcha-common";
import type { ProcaptchaIconOrderHandle } from "./procaptchaWidget.js";

export type { ProcaptchaIconOrderHandle };

export type ProcaptchaIconOrderMountFn =
	WidgetMountFn<ProcaptchaIconOrderHandle>;

export const loadProcaptchaIconOrder =
	async (): Promise<ProcaptchaIconOrderMountFn> =>
		(await import("./procaptchaWidget.js")).mountProcaptchaIconOrderWidget;

export const mountProcaptchaIconOrder: ProcaptchaIconOrderMountFn = lazyMount(
	loadProcaptchaIconOrder,
);
