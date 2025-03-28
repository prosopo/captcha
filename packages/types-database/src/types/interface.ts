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
import type { CaptchaResult } from "@prosopo/types";
import type { IDatabase } from "./mongo.js";
import type {
	ClientRecord,
	DetectorSchema,
	FrictionlessToken,
	FrictionlessTokenId,
	PoWCaptchaRecord,
	PoWCaptchaStored,
	ScheduledTaskRecord,
	SessionRecord,
	SliderCaptchaRecord,
	SliderCaptchaStored,
} from "./provider.js";

export interface IProviderDatabase extends IDatabase {
	// Slider Captcha methods
	storeSliderCaptchaRecord(sliderCaptcha: SliderCaptchaStored): Promise<void>;
	getSliderCaptchaRecordById(id: string): Promise<SliderCaptchaRecord | null>;
	updateSliderCaptchaRecord(
		id: string,
		result: CaptchaResult,
		serverChecked?: boolean,
		userSubmitted?: boolean,
		position?: number,
		solveTime?: number,
		userSignature?: string,
	): Promise<void>;
	markSliderCaptchaChecked(id: string): Promise<void>;
	getSessionRecordBySessionId(sessionId: string): Promise<SessionRecord | null>;
} 