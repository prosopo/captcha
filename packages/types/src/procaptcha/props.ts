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
import type { ProcaptchaClientConfigInput } from "../config/index.js";
import type { RandomProvider } from "../provider/api.js";
import type {
	BehavioralData,
	ClickEventPoint,
	MouseMovementPoint,
	PackedBehavioralData,
	TouchEventPoint,
} from "./behavioral.js";
import type { Account, Callbacks } from "./manager.js";

// Generic behavioral data collectors for analytics
export type FrictionlessState = {
	provider: RandomProvider;
	userAccount: Account;
	restart: () => void;
	sessionId?: string;
	behaviorCollector1?: {
		start: () => void;
		stop: () => void;
		getData: () => MouseMovementPoint[];
		clear: () => void;
	};
	behaviorCollector2?: {
		start: () => void;
		stop: () => void;
		getData: () => TouchEventPoint[];
		clear: () => void;
	};
	behaviorCollector3?: {
		start: () => void;
		stop: () => void;
		getData: () => ClickEventPoint[];
		clear: () => void;
	};
	deviceCapability?: string;
	encryptBehavioralData?: (data: string) => Promise<string>;
	packBehavioralData?: (data: BehavioralData) => PackedBehavioralData;
};

export type ProcaptchaCallbacks = Partial<Callbacks>;

/**
 * The props for the Procaptcha component.
 */
export interface ProcaptchaProps {
	// the configuration for procaptcha
	config: ProcaptchaClientConfigInput;
	callbacks: ProcaptchaCallbacks;
	i18n: Ti18n;
	frictionlessState?: FrictionlessState;
	// display an error message
	errorMessage?: string;
	container?: HTMLElement;
}
