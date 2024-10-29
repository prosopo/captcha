// Copyright 2021-2024 Prosopo (UK) Ltd.
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

import type { ProcaptchaClientConfigInput } from "../config/index.js";
import type { RandomProvider } from "../provider/api.js";
import type { Account, ProcaptchaCallbacks } from "./manager.js";

export type FrictionlessState = {
	provider: RandomProvider;
	userAccount: Account;
	sessionId?: string;
};

/**
 * The props for the Procaptcha component.
 */
export interface ProcaptchaProps {
	// the configuration for procaptcha
	config: ProcaptchaClientConfigInput;
	// optional set of callbacks for various captcha events
	callbacks?: Partial<ProcaptchaCallbacks>;
	frictionlessState?: FrictionlessState;
}
