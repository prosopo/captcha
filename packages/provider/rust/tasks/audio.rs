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

//! tasks/audio: the pre-rendered audio challenge buffer (audioBuffer.ts) and the settings and
//! clip helpers of audioRenderer.ts.
//!
//! Single use is a security property: a clip served twice is a labelled (audio, answer) pair,
//! so `take` removes what it returns.

use prosopo_audio_assets::{AudioRenderSettings, RenderedAudioChallenge, DEFAULT_RENDER_SETTINGS};
use serde_json::Value;
use std::sync::{Arc, Mutex, Weak};
use std::time::Duration;

/// Renders one challenge with the given settings.
pub type AudioRenderer = Arc<dyn Fn(&AudioRenderSettings) -> Result<RenderedAudioChallenge, String> + Send + Sync>;

pub const DEFAULT_CAPACITY: usize = 8;
pub const DEFAULT_REFILL_INTERVAL_MS: u64 = 500;
pub const DEFAULT_REFILL_BATCH: usize = 2;
pub const DEFAULT_MAX_VARIANTS: usize = 8;

/// `AudioBufferOptions`.
#[derive(Clone, Copy, Debug)]
pub struct AudioBufferOptions {
    pub capacity: usize,
    pub refill_interval_ms: u64,
    pub refill_batch: usize,
    pub max_variants: usize,
    pub prime_settings: AudioRenderSettings,
}

impl Default for AudioBufferOptions {
    fn default() -> Self {
        Self {
            capacity: DEFAULT_CAPACITY,
            refill_interval_ms: DEFAULT_REFILL_INTERVAL_MS,
            refill_batch: DEFAULT_REFILL_BATCH,
            max_variants: DEFAULT_MAX_VARIANTS,
            prime_settings: DEFAULT_RENDER_SETTINGS,
        }
    }
}

/// The variant key: the settings in a fixed field order, joined as JS joins numbers.
fn settings_key(settings: &AudioRenderSettings) -> String {
    [settings.digit_count, settings.noise_snr_db, settings.babble_gain, settings.babble_voices, settings.reverb_mix, settings.gap_ms]
        .iter()
        .map(|number| prosopo_util::number_to_string(*number))
        .collect::<Vec<String>>()
        .join(":")
}

struct Variant {
    key: String,
    settings: AudioRenderSettings,
    ready: Vec<RenderedAudioChallenge>,
}

struct BufferState {
    /// Least recently used first.
    variants: Vec<Variant>,
    starved: usize,
}

/// `createAudioChallengeBuffer`'s buffer.
pub struct AudioChallengeBuffer {
    state: Mutex<BufferState>,
    options: AudioBufferOptions,
    render: AudioRenderer,
    timer: Mutex<Option<tokio::task::JoinHandle<()>>>,
}

impl AudioChallengeBuffer {
    /// `createAudioChallengeBuffer`: primed with `capacity` challenges at once, then topped up
    /// every `refill_interval_ms` by up to `refill_batch` per variant.
    pub fn create(options: AudioBufferOptions, render: AudioRenderer) -> Result<Arc<AudioChallengeBuffer>, String> {
        let buffer: Arc<AudioChallengeBuffer> = Arc::new(AudioChallengeBuffer {
            state: Mutex::new(BufferState { variants: Vec::new(), starved: 0 }),
            options,
            render,
            timer: Mutex::new(None),
        });
        {
            let mut state = buffer.lock();
            buffer.touch(&mut state, &options.prime_settings);
            buffer.top_up(&mut state, options.capacity)?;
        }
        if let Ok(runtime) = tokio::runtime::Handle::try_current() {
            let weak: Weak<AudioChallengeBuffer> = Arc::downgrade(&buffer);
            let interval: Duration = Duration::from_millis(options.refill_interval_ms.max(1));
            let handle = runtime.spawn(async move {
                let mut ticks = tokio::time::interval_at(tokio::time::Instant::now() + interval, interval);
                loop {
                    ticks.tick().await;
                    let Some(buffer) = weak.upgrade() else {
                        return;
                    };
                    let _ = tokio::task::spawn_blocking(move || {
                        let mut state = buffer.lock();
                        let _ = buffer.top_up(&mut state, buffer.options.refill_batch);
                    })
                    .await;
                }
            });
            *buffer.timer.lock().unwrap_or_else(|poisoned| poisoned.into_inner()) = Some(handle);
        }
        Ok(buffer)
    }

    fn lock(&self) -> std::sync::MutexGuard<'_, BufferState> {
        self.state.lock().unwrap_or_else(|poisoned| poisoned.into_inner())
    }

    /// `touch`: the variant for these settings, moved to most recently used, the least recently
    /// used evicted past `max_variants`.
    fn touch(&self, state: &mut BufferState, settings: &AudioRenderSettings) -> usize {
        let key: String = settings_key(settings);
        if let Some(index) = state.variants.iter().position(|variant| variant.key == key) {
            let variant: Variant = state.variants.remove(index);
            state.variants.push(variant);
        } else {
            state.variants.push(Variant { key, settings: *settings, ready: Vec::new() });
            while state.variants.len() > self.options.max_variants {
                state.variants.remove(0);
            }
        }
        state.variants.len() - 1
    }

    fn top_up(&self, state: &mut BufferState, limit: usize) -> Result<(), String> {
        for variant in &mut state.variants {
            let mut rendered: usize = 0;
            while rendered < limit && variant.ready.len() < self.options.capacity {
                variant.ready.push((self.render)(&variant.settings)?);
                rendered += 1;
            }
        }
        Ok(())
    }

    /// `take`: the most recently rendered ready challenge for these settings, or one rendered
    /// now (counted as a starvation) when none is ready.
    pub fn take(&self, settings: &AudioRenderSettings) -> Result<RenderedAudioChallenge, String> {
        let mut state = self.lock();
        let index: usize = self.touch(&mut state, settings);
        if let Some(challenge) = state.variants.get_mut(index).and_then(|variant| variant.ready.pop()) {
            return Ok(challenge);
        }
        state.starved += 1;
        drop(state);
        (self.render)(settings)
    }

    pub fn depth(&self) -> usize {
        self.lock().variants.iter().map(|variant| variant.ready.len()).sum()
    }

    pub fn starvations(&self) -> usize {
        self.lock().starved
    }

    pub fn stop(&self) {
        if let Some(handle) = self.timer.lock().unwrap_or_else(|poisoned| poisoned.into_inner()).take() {
            handle.abort();
        }
    }
}

impl Drop for AudioChallengeBuffer {
    fn drop(&mut self) {
        self.stop();
    }
}

/// A number override as `x ?? y` reads it: present unless absent or null.
fn nullish_number(value: Option<&Value>) -> Option<f64> {
    value.filter(|value| !value.is_null()).and_then(Value::as_f64)
}

/// `resolveAudioRenderSettings`: each override layered onto the asset defaults, field by field,
/// later ones winning.
pub fn resolve_audio_render_settings(overrides: &[Option<&Value>]) -> AudioRenderSettings {
    let mut resolved: AudioRenderSettings = DEFAULT_RENDER_SETTINGS;
    for over in overrides {
        let field = |key: &str| nullish_number(over.and_then(|over| over.get(key)));
        resolved = AudioRenderSettings {
            digit_count: field("digitCount").unwrap_or(resolved.digit_count),
            noise_snr_db: field("noiseSnrDb").unwrap_or(resolved.noise_snr_db),
            babble_gain: field("babbleGain").unwrap_or(resolved.babble_gain),
            babble_voices: field("babbleVoices").unwrap_or(resolved.babble_voices),
            reverb_mix: field("reverbMix").unwrap_or(resolved.reverb_mix),
            gap_ms: field("gapMs").unwrap_or(resolved.gap_ms),
        };
    }
    resolved
}

/// `RenderedAudioClip`.
pub struct RenderedAudioClip {
    /// WAV data URI.
    pub clip: String,
    pub character_count: usize,
    /// The transcript: stored, never answered.
    pub answer: String,
    pub duration_ms: f64,
}

/// `renderAudioClip`: one challenge taken from the buffer.
pub fn render_audio_clip(buffer: &AudioChallengeBuffer, settings: &AudioRenderSettings) -> Result<RenderedAudioClip, String> {
    let challenge: RenderedAudioChallenge = buffer.take(settings)?;
    Ok(RenderedAudioClip {
        clip: prosopo_audio_assets::to_data_uri(&challenge.wav),
        character_count: challenge.answer.encode_utf16().count(),
        answer: challenge.answer,
        duration_ms: challenge.duration_ms,
    })
}

#[cfg(test)]
mod tests {
    //! tests/unit/tasks/audio/audioBuffer.unit.test.ts, against the real renderer.
    use super::*;
    use prosopo_audio_assets::{render_audio_challenge, SAMPLE_RATE};
    use serde_json::json;
    use std::collections::HashSet;

    fn fast_settings() -> AudioRenderSettings {
        AudioRenderSettings { digit_count: 3.0, babble_voices: 0.0, babble_gain: 0.0, reverb_mix: 0.0, ..DEFAULT_RENDER_SETTINGS }
    }

    fn renderer() -> AudioRenderer {
        Arc::new(|settings: &AudioRenderSettings| render_audio_challenge(settings, SAMPLE_RATE).map_err(|error| error.to_string()))
    }

    fn buffer(capacity: usize, refill_interval_ms: u64, max_variants: usize) -> Arc<AudioChallengeBuffer> {
        let options: AudioBufferOptions = AudioBufferOptions { capacity, refill_interval_ms, max_variants, prime_settings: fast_settings(), ..AudioBufferOptions::default() };
        AudioChallengeBuffer::create(options, renderer()).expect("primes")
    }

    #[tokio::test]
    async fn primes_synchronously_so_the_first_take_does_not_pay_for_synthesis() {
        let buffer = buffer(3, DEFAULT_REFILL_INTERVAL_MS, DEFAULT_MAX_VARIANTS);
        assert_eq!(buffer.depth(), 3);
        assert_eq!(buffer.starvations(), 0);
    }

    #[tokio::test]
    async fn never_hands_out_the_same_challenge_twice() {
        let buffer = buffer(6, DEFAULT_REFILL_INTERVAL_MS, DEFAULT_MAX_VARIANTS);
        let mut seen: HashSet<Vec<u8>> = HashSet::new();
        for _ in 0..12 {
            assert!(seen.insert(buffer.take(&fast_settings()).expect("a challenge").wav));
        }
        assert_eq!(seen.len(), 12);
    }

    #[tokio::test]
    async fn serves_inline_rather_than_failing_once_drained_and_counts_it() {
        let buffer = buffer(2, 1_000_000, DEFAULT_MAX_VARIANTS);
        assert_eq!(buffer.depth(), 2);
        buffer.take(&fast_settings()).expect("a challenge");
        buffer.take(&fast_settings()).expect("a challenge");
        assert_eq!(buffer.depth(), 0);
        assert_eq!(buffer.starvations(), 0);
        let drained: RenderedAudioChallenge = buffer.take(&fast_settings()).expect("a challenge");
        assert_eq!(drained.answer.len(), 3);
        assert!(drained.wav.len() > 44);
        assert_eq!(buffer.starvations(), 1);
    }

    #[tokio::test]
    async fn takes_honour_the_requested_settings_not_the_primed_ones() {
        let buffer = buffer(1, 1_000_000, DEFAULT_MAX_VARIANTS);
        let other: AudioRenderSettings = AudioRenderSettings { digit_count: 6.0, ..fast_settings() };
        assert_eq!(buffer.take(&other).expect("a challenge").answer.len(), 6);
        assert_eq!(buffer.take(&fast_settings()).expect("a challenge").answer.len(), 3);
    }

    #[tokio::test]
    async fn caps_the_number_of_settings_variants_it_will_hold() {
        let buffer = buffer(1, 1_000_000, 2);
        for digit_count in [3.0, 4.0, 5.0, 6.0, 7.0, 8.0] {
            buffer.take(&AudioRenderSettings { digit_count, ..fast_settings() }).expect("a challenge");
        }
        assert!(buffer.depth() <= 2);
    }

    #[tokio::test]
    async fn stop_halts_refilling() {
        let buffer = buffer(1, 1, DEFAULT_MAX_VARIANTS);
        buffer.stop();
        buffer.take(&fast_settings()).expect("a challenge");
        tokio::time::sleep(Duration::from_millis(20)).await;
        assert_eq!(buffer.depth(), 0);
    }

    #[tokio::test]
    async fn refills_in_the_background() {
        let buffer = buffer(2, 5, DEFAULT_MAX_VARIANTS);
        buffer.take(&fast_settings()).expect("a challenge");
        buffer.take(&fast_settings()).expect("a challenge");
        for _ in 0..200 {
            if buffer.depth() == 2 {
                break;
            }
            tokio::time::sleep(Duration::from_millis(10)).await;
        }
        assert_eq!(buffer.depth(), 2);
    }

    /// rust/equivalence/audio-settings-vectors.json, written by generate-challenge.ts from
    /// audioRenderer.ts's `resolveAudioRenderSettings`.
    #[test]
    fn equivalence_resolves_audio_render_settings_as_the_ts_does() {
        let vectors: Value = serde_json::from_str(include_str!("../equivalence/audio-settings-vectors.json")).expect("vectors parse");
        let cases: &Vec<Value> = vectors.as_array().expect("cases");
        assert!(cases.len() > 30);
        for case in cases {
            let site: Option<&Value> = Some(&case["site"]).filter(|value| !value.is_null());
            let other: Option<&Value> = Some(&case["other"]).filter(|value| !value.is_null());
            let resolved: AudioRenderSettings = resolve_audio_render_settings(&[site, other]);
            let expected = |key: &str| case["resolved"][key].as_f64();
            assert_eq!(Some(resolved.digit_count), expected("digitCount"), "{case}");
            assert_eq!(Some(resolved.noise_snr_db), expected("noiseSnrDb"), "{case}");
            assert_eq!(Some(resolved.babble_gain), expected("babbleGain"), "{case}");
            assert_eq!(Some(resolved.babble_voices), expected("babbleVoices"), "{case}");
            assert_eq!(Some(resolved.reverb_mix), expected("reverbMix"), "{case}");
            assert_eq!(Some(resolved.gap_ms), expected("gapMs"), "{case}");
        }
    }

    #[test]
    fn returns_the_asset_defaults_when_given_nothing() {
        assert_eq!(resolve_audio_render_settings(&[]), DEFAULT_RENDER_SETTINGS);
    }

    #[test]
    fn ignores_absent_sources_and_absent_fields() {
        assert_eq!(resolve_audio_render_settings(&[None, Some(&json!({}))]), DEFAULT_RENDER_SETTINGS);
        assert_eq!(resolve_audio_render_settings(&[Some(&json!({ "digitCount": null }))]), DEFAULT_RENDER_SETTINGS);
    }

    #[test]
    fn later_sources_win_field_by_field() {
        let first: Value = json!({ "digitCount": 6, "noiseSnrDb": 20 });
        let second: Value = json!({ "noiseSnrDb": 9 });
        let resolved: AudioRenderSettings = resolve_audio_render_settings(&[Some(&first), Some(&second)]);
        assert_eq!(resolved.digit_count, 6.0);
        assert_eq!(resolved.noise_snr_db, 9.0);
        assert_eq!(resolved.babble_gain, DEFAULT_RENDER_SETTINGS.babble_gain);
        assert_eq!(resolved.gap_ms, DEFAULT_RENDER_SETTINGS.gap_ms);
    }
}
