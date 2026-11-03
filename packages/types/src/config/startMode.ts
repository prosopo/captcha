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

export enum StartModeEnum {
	auto = "auto",
	manual = "manual",
}

export type StartMode = StartModeEnum;

export const StartModes: readonly StartMode[] = [
	StartModeEnum.auto,
	StartModeEnum.manual,
];

// A plain guard rather than a zod enum: this module is read by the widget
// before it renders, and a zod schema for two strings would put the whole of
// zod on that path.
export const isStartMode = (value: string): value is StartMode =>
	(StartModes as readonly string[]).includes(value);

export const PROCAPTCHA_START_EVENT = "procaptcha:start";

export interface ProcaptchaStartEventDetail {
	element?: Element;
}
