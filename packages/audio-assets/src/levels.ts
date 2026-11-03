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

export const rms = (samples: Float32Array): number => {
	if (samples.length === 0) return 0;
	let total = 0;
	for (const value of samples) {
		total += value * value;
	}
	return Math.sqrt(total / samples.length);
};

/** Scale in place so the loudest sample sits at `peak`. No-op on silence. */
export const normalise = (samples: Float32Array, peak: number): void => {
	let max = 0;
	for (const value of samples) {
		max = Math.max(max, Math.abs(value));
	}
	if (max === 0) return;
	const gain = peak / max;
	for (let n = 0; n < samples.length; n++) {
		samples[n] = (samples[n] ?? 0) * gain;
	}
};
