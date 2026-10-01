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

import {
	type AudioRenderSettings,
	DEFAULT_RENDER_SETTINGS,
	type RenderedAudioChallenge,
	toDataUri,
} from "@prosopo/audio-assets";
import type { IAudioSettings } from "@prosopo/types";
import {
	getAudioChallengeBuffer,
	initAudioChallengeBuffer,
} from "./audioBuffer.js";

export interface RenderedAudioClip {
	/** WAV data URI. */
	clip: string;
	characterCount: number;
	/** The transcript: persist it, never put it in a response. */
	answer: string;
	durationMs: number;
}

/** Layers partial overrides onto the asset defaults; later sources win. */
export const resolveAudioRenderSettings = (
	...overrides: (IAudioSettings | undefined)[]
): AudioRenderSettings => {
	let resolved: AudioRenderSettings = { ...DEFAULT_RENDER_SETTINGS };
	for (const override of overrides) {
		resolved = {
			digitCount: override?.digitCount ?? resolved.digitCount,
			noiseSnrDb: override?.noiseSnrDb ?? resolved.noiseSnrDb,
			babbleGain: override?.babbleGain ?? resolved.babbleGain,
			babbleVoices: override?.babbleVoices ?? resolved.babbleVoices,
			reverbMix: override?.reverbMix ?? resolved.reverbMix,
			gapMs: override?.gapMs ?? resolved.gapMs,
		};
	}
	return resolved;
};

/**
 * Takes one challenge from the process-wide buffer, created on first use so a
 * provider that never serves audio pays nothing for it.
 */
export const renderAudioClip = (
	settings: AudioRenderSettings,
): RenderedAudioClip => {
	const buffer = getAudioChallengeBuffer() ?? initAudioChallengeBuffer();
	const challenge: RenderedAudioChallenge = buffer.take(settings);

	return {
		clip: toDataUri(challenge.wav),
		characterCount: challenge.answer.length,
		answer: challenge.answer,
		durationMs: challenge.durationMs,
	};
};
