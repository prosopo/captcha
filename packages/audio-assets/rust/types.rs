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

/// Mono audio, samples in [-1, 1]. Quantised to 16-bit only once, at encode.
#[derive(Clone, Debug, PartialEq)]
pub struct AudioBuffer {
    pub samples: Vec<f32>,
    pub sample_rate: u32,
}

/// `Mixed` is a voiced fricative (/z/, /v/): buzz plus turbulence.
/// `Silence` is a stop closure; without it a /t/ reads as a click.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Excitation {
    Voiced,
    Unvoiced,
    Mixed,
    Silence,
}

/// Formants are steady-state targets; the synthesiser glides between
/// consecutive segments, because the formant transition into a consonant
/// carries most of its identity.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Phoneme {
    /// Debug label only; never sent to the client.
    pub id: &'static str,
    pub excitation: Excitation,
    /// [F1, F2, F3] in Hz. Ignored for `Unvoiced` and `Silence`.
    pub formants: [f64; 3],
    pub bandwidths: [f64; 3],
    /// At normal speaking rate.
    pub duration_ms: f64,
    pub voice_gain: f64,
    pub noise_gain: f64,
    pub noise_centre_hz: f64,
    pub noise_bandwidth_hz: f64,
    /// Skip the glide into this segment; smoothing a stop burst destroys it.
    pub abrupt: bool,
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Utterance<'a> {
    /// The single character the user must type.
    pub answer: &'a str,
    pub phonemes: &'a [Phoneme],
}

/// Resolved values; bounds are enforced in `@prosopo/types` client settings.
/// `f64` throughout, as in the TS, so unvalidated values render the same way.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct AudioRenderSettings {
    pub digit_count: f64,
    /// Against the additive noise bed. Lowering it hurts listeners more than bots.
    pub noise_snr_db: f64,
    /// Background babble of other digit names, relative to the foreground. 0 disables.
    pub babble_gain: f64,
    pub babble_voices: f64,
    pub reverb_mix: f64,
    /// Before jitter.
    pub gap_ms: f64,
}

#[derive(Clone, Debug, PartialEq)]
pub struct RenderedAudioChallenge {
    /// RIFF/WAVE, 16-bit PCM mono.
    pub wav: Vec<u8>,
    /// The spoken digits. Must never leave the provider.
    pub answer: String,
    pub duration_ms: f64,
}
