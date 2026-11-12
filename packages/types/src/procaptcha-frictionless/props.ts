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
import type { ProcaptchaClientConfigOutput } from "../config/config.js";
import type {
	BehavioralData,
	ClickEventPoint,
	MouseMovementPoint,
	PackedBehavioralData,
	ScrollEventPoint,
	TouchEventPoint,
} from "../procaptcha/behavioral.js";
import type { Account } from "../procaptcha/manager.js";
import type {
	FrictionlessRestart,
	ProcaptchaProps,
	RefreshSwitchTarget,
} from "../procaptcha/props.js";
import type {
	GetFrictionlessCaptchaResponse,
	ProviderSelectRetryContext,
	RandomProvider,
} from "../provider/api.js";

// Generic behavioral data collectors for analytics
export type BotDetectionFunctionResult = GetFrictionlessCaptchaResponse & {
	provider: RandomProvider;
	userAccount: Account;
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
	behaviorCollector4?: {
		start: () => void;
		stop: () => void;
		getData: () => ScrollEventPoint[];
		clear: () => void;
	};
	deviceCapability?: string;
	encryptBehavioralData?: (data: string) => Promise<string>;
	packBehavioralData?: (data: BehavioralData) => PackedBehavioralData;
	getSimdReadings?: (timeoutMs?: number) => Promise<string | undefined>;
};

export type BotDetectionFunction = (
	config: ProcaptchaClientConfigOutput,
	container: HTMLElement | undefined,
	restartFn: () => void,
	// Present when the frictionless flow is being retried after an error, so the
	// detection can re-select a random provider instead of re-using the
	// DNS-routed one that just failed. Absent on the initial attempt.
	retryContext?: ProviderSelectRetryContext,
	// The sessionId the user refreshed away from, when this run replaces a
	// challenge they asked to swap. Forwarded to the provider as `refreshOf`.
	refreshOf?: string,
	// The challenge type the user asked the replacement to switch to.
	switchTo?: RefreshSwitchTarget,
	// This widget's slot among the page's widgets for the same site key.
	widgetSlot?: number,
	// The puzzle challenge the user just answered wrongly, when this run mints
	// its replacement. Forwarded to the provider as `retryOf`.
	retryOf?: string,
) => Promise<BotDetectionFunctionResult>;

/**
 * The props for the Procaptcha Frictionless component.
 */
export interface ProcaptchaFrictionlessProps extends ProcaptchaProps {
	i18n: Ti18n;
	restart: FrictionlessRestart;
	detectBot?: BotDetectionFunction;
	detectBotConfig?: ProcaptchaClientConfigOutput;
}
