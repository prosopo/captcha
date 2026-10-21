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

//! Obfuscation on top of the clean speech. Past a low threshold each extra dB
//! of noise costs a human far more than a bot, and audio users are mostly
//! people the visual challenge failed, so defaults favour intelligibility.
//! Babble is the exception worth keeping: overlapping speech is a
//! source-separation problem, which humans are unusually good at.

use prosopo_puzzle_assets::Prng;

use crate::jsmath;
use crate::levels::{normalise, rms};
use crate::types::AudioBuffer;

const REVERB_COMB_DELAYS_MS: [f64; 4] = [29.7, 37.1, 41.1, 43.7];
const REVERB_COMB_FEEDBACK: f64 = 0.72;
const REVERB_ALLPASS_DELAYS_MS: [f64; 2] = [5.0, 1.7];
const REVERB_ALLPASS_FEEDBACK: f64 = 0.5;
const SOFT_CLIP_DRIVE: f64 = 1.2;
const OUTPUT_PEAK: f64 = 0.92;

/// Adds `source` into `target` from `offset`; anything past the end is dropped.
pub fn mix_into(target: &mut [f32], source: &[f32], offset: f64, gain: f64) {
    let start = jsmath::max(0.0, offset.floor());
    let count = jsmath::min(source.len() as f64, target.len() as f64 - start);
    let count = jsmath::count_below(count);
    if count == 0 {
        return;
    }
    let start = start as usize;
    for (slot, &value) in target[start..start + count].iter_mut().zip(source) {
        *slot = (f64::from(*slot) + f64::from(value) * gain) as f32;
    }
}

/// Pink-ish noise at `snr_db` below the signal's RMS. Pink rather than white
/// because white noise spends its energy above the formants and masks little.
pub fn add_noise_bed(buffer: &mut AudioBuffer, prng: &mut Prng, snr_db: f64) {
    let signal_rms = rms(&buffer.samples);
    if signal_rms == 0.0 {
        return;
    }

    let target_rms = signal_rms / jsmath::pow(10.0, snr_db / 20.0);

    // Paul Kellet's economy pink-noise filter (~1/f).
    let mut b0 = 0.0_f64;
    let mut b1 = 0.0_f64;
    let mut b2 = 0.0_f64;
    let mut noise = vec![0.0_f32; buffer.samples.len()];
    for slot in noise.iter_mut() {
        let white = prng.next() * 2.0 - 1.0;
        b0 = 0.99765 * b0 + white * 0.099;
        b1 = 0.963 * b1 + white * 0.2965;
        b2 = 0.57 * b2 + white * 1.0526;
        *slot = ((b0 + b1 + b2 + white * 0.1848) * 0.2) as f32;
    }

    let noise_rms = rms(&noise);
    if noise_rms == 0.0 {
        return;
    }
    mix_into(&mut buffer.samples, &noise, 0.0, target_rms / noise_rms);
}

fn delay_samples(delay_ms: f64, sample_rate: f64) -> usize {
    jsmath::max(1.0, jsmath::round((delay_ms / 1000.0) * sample_rate)) as usize
}

/// Schroeder reverb: parallel combs into series allpasses. Its purpose is to
/// smear onsets, which otherwise make it easy to chop the clip into
/// one-digit segments and classify each in isolation.
pub fn add_reverb(buffer: &mut AudioBuffer, mix: f64) {
    if mix <= 0.0 {
        return;
    }

    let sample_rate = f64::from(buffer.sample_rate);
    let samples = &mut buffer.samples;
    let mut wet = vec![0.0_f32; samples.len()];
    let comb_count = REVERB_COMB_DELAYS_MS.len() as f64;

    for delay_ms in REVERB_COMB_DELAYS_MS {
        let delay = delay_samples(delay_ms, sample_rate);
        let mut line = vec![0.0_f32; delay];
        let mut index = 0;
        for (wet_sample, &dry) in wet.iter_mut().zip(samples.iter()) {
            let delayed = f64::from(line[index]);
            *wet_sample = (f64::from(*wet_sample) + delayed / comb_count) as f32;
            line[index] = (f64::from(dry) + delayed * REVERB_COMB_FEEDBACK) as f32;
            index = (index + 1) % delay;
        }
    }

    for delay_ms in REVERB_ALLPASS_DELAYS_MS {
        let delay = delay_samples(delay_ms, sample_rate);
        let mut line = vec![0.0_f32; delay];
        let mut index = 0;
        for wet_sample in wet.iter_mut() {
            let input = f64::from(*wet_sample);
            let delayed = f64::from(line[index]);
            line[index] = (input + delayed * REVERB_ALLPASS_FEEDBACK) as f32;
            *wet_sample = (-input * REVERB_ALLPASS_FEEDBACK + delayed) as f32;
            index = (index + 1) % delay;
        }
    }

    for (sample, &wet_sample) in samples.iter_mut().zip(wet.iter()) {
        *sample = (f64::from(*sample) * (1.0 - mix) + f64::from(wet_sample) * mix) as f32;
    }
}

/// tanh soft clip, then normalise: hard clipping at 16-bit conversion is
/// audibly nasty and a distinctive artefact.
pub fn finalise(buffer: &mut AudioBuffer) {
    for sample in buffer.samples.iter_mut() {
        *sample = jsmath::tanh(f64::from(*sample) * SOFT_CLIP_DRIVE) as f32;
    }
    normalise(&mut buffer.samples, OUTPUT_PEAK);
}
