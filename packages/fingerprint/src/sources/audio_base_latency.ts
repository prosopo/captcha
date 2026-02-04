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
import { isAndroid, isWebKit } from "../utils/browser";

export enum SpecialFingerprint {
	/** The browser doesn't support AudioContext or baseLatency */
	NotSupported = -1,
	/** Entropy source is disabled because of console warnings */
	Disabled = -2,
	/** Weird case where `baseLatency` is not a float number but `Infinity` instead */
	NotFinite = -3,
}

export default function getAudioContextBaseLatency(): number {
	// The signal emits warning in Chrome and Firefox, therefore it is enabled on Safari where it doesn't produce warning
	// and on Android where it's less visible
	const isAllowedPlatform = isAndroid() || isWebKit();
	if (!isAllowedPlatform) {
		return SpecialFingerprint.Disabled;
	}

	if (!window.AudioContext) {
		return SpecialFingerprint.NotSupported;
	}

	const latency = new AudioContext().baseLatency;

	if (latency === null || latency === undefined) {
		return SpecialFingerprint.NotSupported;
	}

	if (!Number.isFinite(latency)) {
		return SpecialFingerprint.NotFinite;
	}

	return latency;
}
