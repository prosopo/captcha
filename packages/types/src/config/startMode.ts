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

import type { infer as zInfer } from "zod";
import { enum as zEnum } from "zod";

/**
 * When the widget starts the frictionless flow (bot detection, behavioural
 * collectors and the `/frictionless` round-trip that picks a challenge).
 *
 * - `auto` (default): as soon as the widget mounts.
 * - `manual`: the widget renders its checkbox straight away, at its final
 *   size, but does nothing else until the site calls
 *   `window.procaptcha.start()` (or dispatches a `procaptcha:start` event),
 *   or the end user clicks the checkbox. In the latter case the click is
 *   carried through to the challenge the provider picks, so the user never
 *   has to click twice.
 */
export enum StartModeEnum {
	auto = "auto",
	manual = "manual",
}

export const StartModeSchema = zEnum([
	StartModeEnum.auto,
	StartModeEnum.manual,
]);
export type StartMode = zInfer<typeof StartModeSchema>;

/**
 * DOM event that starts a widget rendered with `startMode: "manual"`.
 * Dispatched on `document`; `detail.element`, when present, restricts the
 * event to the widget rendered into that element.
 */
export const PROCAPTCHA_START_EVENT = "procaptcha:start";

export interface ProcaptchaStartEventDetail {
	element?: Element;
}
