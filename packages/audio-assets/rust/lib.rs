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

//! Procedural speech for the audio captcha: a formant synthesiser speaking
//! digit names, babble, reverb and a noise bed, encoded as 16-bit PCM WAV.
//! Port of `@prosopo/audio-assets`; for the same seed and settings the WAV is
//! byte-identical to the TS.

mod distort;
mod encode;
mod fdlibm;
mod jsmath;
mod levels;
mod phonemes;
mod synth;
mod types;

#[cfg(test)]
mod equivalence;
#[cfg(test)]
mod tests;

use std::fmt;

pub use distort::{add_noise_bed, add_reverb, finalise, mix_into};
pub use encode::{encode_wav, to_data_uri};
pub use levels::{normalise, rms};
pub use phonemes::{ANSWER_ALPHABET, DIGITS};
pub use prosopo_puzzle_assets::{create_prng, create_seed, Prng, PuzzleAssetsError};
pub use synth::{random_voice, synthesise_utterance, Voice, SAMPLE_RATE};
pub use types::{
    AudioBuffer, AudioRenderSettings, Excitation, Phoneme, RenderedAudioChallenge, Utterance,
};

/// The errors the TS throws: the PRNG's, and the `RangeError`s from typed
/// array and `Buffer` writes that unvalidated settings can trigger.
#[derive(Clone, Debug, PartialEq)]
pub enum AudioAssetsError {
    Prng(PuzzleAssetsError),
    InvalidTypedArrayLength(f64),
    /// `ERR_OUT_OF_RANGE` from a `Buffer#writeUInt32LE` header field.
    OutOfRange { received: u64 },
}

/// Node's `addNumericalSeparator`, which it applies past 2^32.
fn with_numerical_separators(value: u64) -> String {
    let digits = value.to_string();
    if value <= 1 << 32 {
        return digits;
    }
    let mut groups: Vec<&str> = Vec::new();
    let mut end = digits.len();
    while end >= 4 {
        groups.push(&digits[end - 3..end]);
        end -= 3;
    }
    groups.push(&digits[..end]);
    groups.reverse();
    groups.join("_")
}

impl fmt::Display for AudioAssetsError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            AudioAssetsError::Prng(error) => error.fmt(f),
            AudioAssetsError::InvalidTypedArrayLength(length) => write!(
                f,
                "Invalid typed array length: {}",
                jsmath::number_to_string(*length)
            ),
            AudioAssetsError::OutOfRange { received } => write!(
                f,
                "The value of \"value\" is out of range. It must be >= 0 and <= 4294967295. Received {}",
                with_numerical_separators(*received)
            ),
        }
    }
}

impl std::error::Error for AudioAssetsError {}

impl From<PuzzleAssetsError> for AudioAssetsError {
    fn from(error: PuzzleAssetsError) -> Self {
        AudioAssetsError::Prng(error)
    }
}

/// Must match the `audio*Default` constants in `@prosopo/types` client settings.
pub const DEFAULT_RENDER_SETTINGS: AudioRenderSettings = AudioRenderSettings {
    digit_count: 5.0,
    noise_snr_db: 14.0,
    babble_gain: 0.16,
    babble_voices: 2.0,
    reverb_mix: 0.12,
    gap_ms: 220.0,
};

const LEAD_IN_MS: f64 = 250.0;
const LEAD_OUT_MS: f64 = 350.0;
const GAP_JITTER_RATIO: f64 = 0.4;
const MAX_GAP_JITTER_MS: f64 = 360.0;
const BABBLE_MAX_START_MS: f64 = 400.0;
const BABBLE_MAX_PAUSE_MS: f64 = 500.0;

fn ms_to_samples(ms: f64, sample_rate: f64) -> f64 {
    jsmath::round((ms / 1000.0) * sample_rate)
}

/// `prng.int` with the TS's float arithmetic, so non-integer and NaN bounds
/// draw and land where they do in the TS.
fn int_between(prng: &mut Prng, min: f64, max: f64) -> f64 {
    min + (prng.next() * (max - min + 1.0)).floor()
}

fn float32_array(length: f64) -> Result<Vec<f32>, AudioAssetsError> {
    jsmath::to_index(length)
        .map(|length| vec![0.0_f32; length])
        .ok_or(AudioAssetsError::InvalidTypedArrayLength(length))
}

/// Repeats allowed: forbidding them would let a solver narrow the last digit
/// from the others.
fn choose_answer(
    prng: &mut Prng,
    count: f64,
) -> Result<Vec<&'static Utterance<'static>>, AudioAssetsError> {
    (0..jsmath::to_length(count))
        .map(|_| prng.pick(&DIGITS).map_err(AudioAssetsError::from))
        .collect()
}

/// Other digit names by other speakers, from the answer's own alphabet, so
/// transcribing everything audible yields a longer string with no marker for
/// which digits were the foreground ones.
fn render_babble(
    prng: &mut Prng,
    length_samples: usize,
    sample_rate: u32,
    voices: f64,
) -> Result<Vec<f32>, AudioAssetsError> {
    let rate = f64::from(sample_rate);
    let mut track = vec![0.0_f32; length_samples];
    let max_start = ms_to_samples(BABBLE_MAX_START_MS, rate);
    let max_pause = ms_to_samples(BABBLE_MAX_PAUSE_MS, rate);

    for _ in 0..jsmath::count_below(voices) {
        let base = random_voice(prng);
        let formant_scale = prng.range(0.8, 1.3);
        let voice = Voice {
            formant_scale,
            rate: prng.range(0.75, 1.35),
            ..base
        };

        let mut cursor = int_between(prng, 0.0, max_start);
        while cursor < length_samples as f64 {
            let digit = prng.pick(&DIGITS)?;
            let word = synthesise_utterance(digit, &voice, prng, sample_rate);
            let gain = prng.range(0.6, 1.0);
            mix_into(&mut track, &word.samples, cursor, gain);
            cursor += word.samples.len() as f64 + int_between(prng, 0.0, max_pause);
        }
    }

    Ok(track)
}

/// `renderAudioChallenge` with a fresh seed from the system CSPRNG. The
/// returned answer must stay on the challenge record and never reach the
/// client.
pub fn render_audio_challenge(
    settings: &AudioRenderSettings,
    sample_rate: u32,
) -> Result<RenderedAudioChallenge, AudioAssetsError> {
    render_audio_challenge_with_seed(settings, sample_rate, &create_seed())
}

/// `renderAudioChallenge` with its seed injected, so a render can be
/// reproduced. The seed is as sensitive as the answer.
pub fn render_audio_challenge_with_seed(
    settings: &AudioRenderSettings,
    sample_rate: u32,
    seed: &[u8],
) -> Result<RenderedAudioChallenge, AudioAssetsError> {
    let rate = f64::from(sample_rate);
    let mut prng = create_prng(seed)?;

    let utterances = choose_answer(&mut prng, settings.digit_count)?;
    let answer: String = utterances.iter().map(|u| u.answer).collect();

    // One foreground voice, so the clip sounds like one person reading a number.
    let voice = random_voice(&mut prng);
    let words: Vec<AudioBuffer> = utterances
        .iter()
        .map(|u| synthesise_utterance(u, &voice, &mut prng, sample_rate))
        .collect();

    let gap_samples = ms_to_samples(settings.gap_ms, rate);
    let lead_in = ms_to_samples(LEAD_IN_MS, rate);
    let lead_out = ms_to_samples(LEAD_OUT_MS, rate);
    let max_jitter = ms_to_samples(
        jsmath::min(settings.gap_ms * GAP_JITTER_RATIO, MAX_GAP_JITTER_MS),
        rate,
    );

    let spoken = words
        .iter()
        .fold(0.0, |total, w| total + w.samples.len() as f64);
    let word_count = words.len() as f64;
    let total_samples = lead_in
        + spoken
        + gap_samples * jsmath::max(0.0, word_count - 1.0)
        + max_jitter * word_count
        + lead_out;

    let mut buffer = AudioBuffer {
        samples: float32_array(total_samples)?,
        sample_rate,
    };

    let mut cursor = lead_in;
    for word in &words {
        mix_into(&mut buffer.samples, &word.samples, cursor, 1.0);
        // A constant gap is a segmentation grid: find one boundary and the
        // rest follow.
        cursor += word.samples.len() as f64
            + gap_samples
            + int_between(&mut prng, -(max_jitter / 2.0).floor(), max_jitter);
    }

    if settings.babble_gain > 0.0 && settings.babble_voices > 0.0 {
        let babble = render_babble(
            &mut prng,
            buffer.samples.len(),
            sample_rate,
            settings.babble_voices,
        )?;
        mix_into(&mut buffer.samples, &babble, 0.0, settings.babble_gain);
    }

    add_reverb(&mut buffer, settings.reverb_mix);
    add_noise_bed(&mut buffer, &mut prng, settings.noise_snr_db);
    finalise(&mut buffer);

    Ok(RenderedAudioChallenge {
        wav: encode_wav(&buffer)?,
        answer,
        duration_ms: jsmath::round((total_samples / rate) * 1000.0),
    })
}
