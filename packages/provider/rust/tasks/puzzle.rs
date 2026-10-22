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

//! tasks/puzzle: the render-settings layering and piece size of puzzleRenderer.ts, the
//! stratified sampler (stratifiedSampler.ts) and the pre-generated background buffer
//! (backgroundBuffer.ts with nativeBackground.ts), and getFrictionlessCaptchaChallenge's
//! `isPuzzleImageSwitchAvailable`.

use prosopo_captcha_severity::MIN_DECOY_HOLE_DARKEN_MARGIN;
use prosopo_puzzle_assets::{create_background, PuzzleGeometry, PuzzleRenderSettings, RgbaImage, DEFAULT_GEOMETRY, DEFAULT_RENDER_SETTINGS};
use prosopo_types::settings::{is_puzzle_image_switch_enabled, AllowedTypes, resolve_allowed_captcha_types, PUZZLE_PIECE_SCALE_MAX_DEFAULT, PUZZLE_PIECE_SCALE_MIN_DEFAULT};
use rand_core::{OsRng, RngCore};
use serde_json::{json, Map, Value};
use std::sync::{Arc, Mutex, Weak};
use std::time::Duration;

/// A field of an override that is there, as `override.field !== undefined` reads it.
fn defined(over: &Value, key: &str) -> Option<f64> {
    over.get(key).and_then(Value::as_f64)
}

/// `resolvePuzzleRenderSettings`: each override layered onto the asset defaults, then the
/// decoys' hole kept at least `MIN_DECOY_HOLE_DARKEN_MARGIN` lighter than the real one.
pub fn resolve_puzzle_render_settings(overrides: &[Option<&Value>]) -> PuzzleRenderSettings {
    let mut resolved: PuzzleRenderSettings = DEFAULT_RENDER_SETTINGS;
    for over in overrides.iter().flatten() {
        resolved.decoy_count = defined(over, "decoyCount").unwrap_or(resolved.decoy_count);
        resolved.decoy_edge_darkness = defined(over, "decoyEdgeDarkness").unwrap_or(resolved.decoy_edge_darkness);
        resolved.decoy_body_brightness = defined(over, "decoyBodyBrightness").unwrap_or(resolved.decoy_body_brightness);
        resolved.hole_darken = defined(over, "holeDarken").unwrap_or(resolved.hole_darken);
        resolved.decoy_hole_darken = defined(over, "decoyHoleDarken").unwrap_or(resolved.decoy_hole_darken);
    }
    let floor: f64 = resolved.hole_darken + MIN_DECOY_HOLE_DARKEN_MARGIN;
    if resolved.decoy_hole_darken < floor {
        resolved.decoy_hole_darken = floor.min(1.0);
    }
    resolved
}

/// A piece-scale range: the fraction of the frame's width a piece spans.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct ScaleRange {
    pub min: f64,
    pub max: f64,
}

/// `resolvePuzzlePieceScaleRange`: the overrides' `pieceScale` bounds over the defaults, `min`
/// pulled down to `max` should an override invert them.
pub fn resolve_puzzle_piece_scale_range(overrides: &[Option<&Value>]) -> ScaleRange {
    let mut range: ScaleRange = ScaleRange { min: PUZZLE_PIECE_SCALE_MIN_DEFAULT, max: PUZZLE_PIECE_SCALE_MAX_DEFAULT };
    for over in overrides.iter().flatten() {
        let Some(scale) = over.get("pieceScale") else {
            continue;
        };
        range.min = defined(scale, "min").unwrap_or(range.min);
        range.max = defined(scale, "max").unwrap_or(range.max);
    }
    if range.min > range.max {
        range.min = range.max;
    }
    range
}

/// `resolveSiteAllowedCaptchaTypes`: the types a site may be served, its own
/// `frictionlessTypes` counting only on a frictionless site.
pub fn resolve_site_allowed_captcha_types(settings: Option<&Value>) -> AllowedTypes {
    let get = |key: &str| settings.and_then(|settings| settings.get(key));
    let mut site: Map<String, Value> = Map::new();
    if let Some(flags) = get("captchaTypeFeatureFlags") {
        site.insert("captchaTypeFeatureFlags".to_string(), flags.clone());
    }
    let captcha_type: Option<&str> = get("captchaType").and_then(Value::as_str).filter(|kind| !kind.is_empty());
    if captcha_type.is_none_or(|kind| kind == "frictionless") {
        if let Some(types) = get("frictionlessTypes") {
            site.insert("frictionlessTypes".to_string(), types.clone());
        }
    }
    resolve_allowed_captcha_types(Some(&Value::Object(site)))
}

/// `isPuzzleImageSwitchAvailable`: the widget flag is on and the site may be served image
/// challenges.
pub fn is_puzzle_image_switch_available(settings: Option<&Value>) -> bool {
    is_puzzle_image_switch_enabled(settings.and_then(|settings| settings.get("widgetFeatureFlags")))
        && resolve_site_allowed_captcha_types(settings).image
}

/// The randomness the stratified sampler draws: a uniform float from six random bytes, and a
/// uniform integer below a bound (`crypto.randomInt`).
pub trait SamplerRandom: Send + Sync {
    fn unit_float(&self) -> f64;
    fn below(&self, bound: u32) -> u32;
}

/// `crypto.randomBytes` and `crypto.randomInt`.
pub struct OsSamplerRandom;

impl SamplerRandom for OsSamplerRandom {
    fn unit_float(&self) -> f64 {
        let mut bytes: [u8; 8] = [0; 8];
        OsRng.fill_bytes(&mut bytes[2..]);
        u64::from_be_bytes(bytes) as f64 / (1u64 << 48) as f64
    }

    fn below(&self, bound: u32) -> u32 {
        loop {
            let mut bytes: [u8; 4] = [0; 4];
            OsRng.fill_bytes(&mut bytes);
            let drawn: u32 = u32::from_be_bytes(bytes);
            let limit: u32 = u32::MAX - u32::MAX % bound;
            if drawn < limit {
                return drawn % bound;
            }
        }
    }
}

pub const STRATIFIED_BUCKETS: usize = 8;

struct SamplerState {
    order: Vec<usize>,
    cursor: usize,
}

/// `createStratifiedSampler`: every run of `buckets` draws visits each bucket once, alternating
/// the low and high halves, so even a short burst spreads across the range.
pub struct StratifiedSampler {
    buckets: usize,
    state: Mutex<SamplerState>,
    random: Arc<dyn SamplerRandom>,
}

impl StratifiedSampler {
    pub fn new(buckets: usize, random: Arc<dyn SamplerRandom>) -> StratifiedSampler {
        let buckets: usize = if buckets > 0 && buckets.is_multiple_of(2) { buckets } else { STRATIFIED_BUCKETS };
        StratifiedSampler { buckets, state: Mutex::new(SamplerState { order: Vec::new(), cursor: 0 }), random }
    }

    fn shuffled(&self, mut items: Vec<usize>) -> Vec<usize> {
        for i in (1..items.len()).rev() {
            let j: usize = self.random.below(i as u32 + 1) as usize;
            items.swap(i, j);
        }
        items
    }

    fn build_order(&self) -> Vec<usize> {
        let half: usize = self.buckets >> 1;
        let low: Vec<usize> = self.shuffled((0..half).collect());
        let high: Vec<usize> = self.shuffled((half..self.buckets).collect());
        let (first, second) = if self.random.below(2) == 0 { (low, high) } else { (high, low) };
        first.into_iter().zip(second).flat_map(|(a, b)| [a, b]).collect()
    }

    /// `sample(min, max)`: `min` itself unless `max > min`.
    pub fn sample(&self, min: f64, max: f64) -> f64 {
        if max.partial_cmp(&min) != Some(std::cmp::Ordering::Greater) {
            return min;
        }
        let mut state = self.state.lock().unwrap_or_else(|poisoned| poisoned.into_inner());
        if state.cursor >= state.order.len() {
            state.order = self.build_order();
            state.cursor = 0;
        }
        let bucket: usize = state.order[state.cursor];
        state.cursor += 1;
        drop(state);
        let u: f64 = (bucket as f64 + self.random.unit_float()) / self.buckets as f64;
        min + u * (max - min)
    }
}

/// `samplePuzzlePieceSize`: a piece size in whole pixels, at least one.
pub fn sample_puzzle_piece_size(sampler: &StratifiedSampler, range: ScaleRange) -> u32 {
    let scale: f64 = sampler.sample(range.min, range.max);
    let size: f64 = (f64::from(DEFAULT_GEOMETRY.width) * scale + 0.5).floor();
    size.max(1.0) as u32
}

/// `SeededBackground`.
#[derive(Debug, Clone)]
pub struct SeededBackground {
    pub image: RgbaImage,
    pub seed: Vec<u8>,
}

/// Draws a background seed, as `createSeed` does.
pub type BackgroundSeeds = Arc<dyn Fn() -> Vec<u8> + Send + Sync>;

pub const DEFAULT_CAPACITY: usize = 16;
pub const DEFAULT_REFILL_INTERVAL_MS: u64 = 250;
pub const DEFAULT_REFILL_BATCH: usize = 4;

/// `PuzzleBufferOptions`.
#[derive(Clone, Copy, Debug)]
pub struct PuzzleBufferOptions {
    pub capacity: usize,
    pub refill_interval_ms: u64,
    pub refill_batch: usize,
    pub geometry: PuzzleGeometry,
}

impl Default for PuzzleBufferOptions {
    fn default() -> Self {
        Self { capacity: DEFAULT_CAPACITY, refill_interval_ms: DEFAULT_REFILL_INTERVAL_MS, refill_batch: DEFAULT_REFILL_BATCH, geometry: DEFAULT_GEOMETRY }
    }
}

/// `createPuzzleBackgroundBuffer`: backgrounds made ahead, each served once.
pub struct PuzzleBackgroundBuffer {
    ready: Mutex<Vec<SeededBackground>>,
    starved: Mutex<usize>,
    options: PuzzleBufferOptions,
    seeds: BackgroundSeeds,
    timer: Mutex<Option<tokio::task::JoinHandle<()>>>,
}

impl PuzzleBackgroundBuffer {
    pub fn create(options: PuzzleBufferOptions, seeds: BackgroundSeeds) -> Result<Arc<PuzzleBackgroundBuffer>, String> {
        let buffer: Arc<PuzzleBackgroundBuffer> = Arc::new(PuzzleBackgroundBuffer {
            ready: Mutex::new(Vec::new()),
            starved: Mutex::new(0),
            options,
            seeds,
            timer: Mutex::new(None),
        });
        buffer.top_up(options.capacity)?;
        if let Ok(runtime) = tokio::runtime::Handle::try_current() {
            let weak: Weak<PuzzleBackgroundBuffer> = Arc::downgrade(&buffer);
            let interval: Duration = Duration::from_millis(options.refill_interval_ms.max(1));
            let handle = runtime.spawn(async move {
                let mut ticks = tokio::time::interval_at(tokio::time::Instant::now() + interval, interval);
                loop {
                    ticks.tick().await;
                    let Some(buffer) = weak.upgrade() else {
                        return;
                    };
                    let _ = tokio::task::spawn_blocking(move || buffer.top_up(buffer.options.refill_batch)).await;
                }
            });
            *buffer.timer.lock().unwrap_or_else(|poisoned| poisoned.into_inner()) = Some(handle);
        }
        Ok(buffer)
    }

    /// `createBackgroundNative`.
    fn make(&self) -> Result<SeededBackground, String> {
        let seed: Vec<u8> = (self.seeds)();
        let image: RgbaImage = create_background(&self.options.geometry, &seed).map_err(|error| error.to_string())?;
        Ok(SeededBackground { image, seed })
    }

    fn top_up(&self, limit: usize) -> Result<(), String> {
        for _ in 0..limit {
            if self.depth() >= self.options.capacity {
                break;
            }
            let background: SeededBackground = self.make()?;
            self.ready.lock().unwrap_or_else(|poisoned| poisoned.into_inner()).push(background);
        }
        Ok(())
    }

    /// `take`: the most recently made background, or one made now (counted) when none is ready.
    pub fn take(&self) -> Result<SeededBackground, String> {
        if let Some(background) = self.ready.lock().unwrap_or_else(|poisoned| poisoned.into_inner()).pop() {
            return Ok(background);
        }
        *self.starved.lock().unwrap_or_else(|poisoned| poisoned.into_inner()) += 1;
        self.make()
    }

    pub fn depth(&self) -> usize {
        self.ready.lock().unwrap_or_else(|poisoned| poisoned.into_inner()).len()
    }

    pub fn starvations(&self) -> usize {
        *self.starved.lock().unwrap_or_else(|poisoned| poisoned.into_inner())
    }

    pub fn stop(&self) {
        if let Some(handle) = self.timer.lock().unwrap_or_else(|poisoned| poisoned.into_inner()).take() {
            handle.abort();
        }
    }
}

impl Drop for PuzzleBackgroundBuffer {
    fn drop(&mut self) {
        self.stop();
    }
}

/// The render settings as the challenge record stores them, in the order the TS writes them.
pub fn stored_render_settings(settings: &PuzzleRenderSettings) -> Value {
    json!({
        "decoyCount": settings.decoy_count,
        "decoyEdgeDarkness": settings.decoy_edge_darkness,
        "decoyBodyBrightness": settings.decoy_body_brightness,
        "holeDarken": settings.hole_darken,
        "decoyHoleDarken": settings.decoy_hole_darken,
    })
}

#[cfg(test)]
mod tests {
    //! tests/unit/tasks/puzzle/backgroundBuffer.unit.test.ts, and the vectors of
    //! generate-puzzle.ts for the deterministic parts.
    use super::*;
    use crate::mobile_signals::{derive_mobile_verdict, MobileSignals};
    use std::collections::HashSet;

    fn buffer(capacity: usize, refill_interval_ms: u64) -> Arc<PuzzleBackgroundBuffer> {
        let options: PuzzleBufferOptions = PuzzleBufferOptions { capacity, refill_interval_ms, ..PuzzleBufferOptions::default() };
        PuzzleBackgroundBuffer::create(options, Arc::new(prosopo_puzzle_assets::create_seed)).expect("primes")
    }

    #[tokio::test]
    async fn primes_to_capacity_so_the_first_request_pays_nothing() {
        let buffer = buffer(4, 1_000_000);
        assert_eq!(buffer.depth(), 4);
        assert_eq!(buffer.starvations(), 0);
    }

    #[tokio::test]
    async fn never_hands_the_same_background_out_twice() {
        let buffer = buffer(4, 1_000_000);
        let mut seen: HashSet<Vec<u8>> = HashSet::new();
        for _ in 0..8 {
            assert!(seen.insert(buffer.take().expect("a background").seed));
        }
    }

    #[tokio::test]
    async fn drains_as_it_is_consumed() {
        let buffer = buffer(3, 1_000_000);
        buffer.take().expect("a background");
        assert_eq!(buffer.depth(), 2);
        buffer.take().expect("a background");
        assert_eq!(buffer.depth(), 1);
    }

    #[tokio::test]
    async fn still_serves_a_background_when_it_has_run_dry_and_counts_the_starvation() {
        let buffer = buffer(1, 1_000_000);
        buffer.take().expect("a background");
        let dry: SeededBackground = buffer.take().expect("a background");
        assert_eq!(dry.image.data.len(), (DEFAULT_GEOMETRY.width * DEFAULT_GEOMETRY.height * 4) as usize);
        assert_eq!(buffer.starvations(), 1);
    }

    #[tokio::test]
    async fn serves_the_background_its_seed_produces() {
        let buffer = buffer(1, 1_000_000);
        let taken: SeededBackground = buffer.take().expect("a background");
        assert_eq!(create_background(&DEFAULT_GEOMETRY, &taken.seed).expect("renders"), taken.image);
    }

    /// A sampler whose draws are scripted.
    struct Scripted {
        floats: Mutex<Vec<f64>>,
        ints: Mutex<Vec<u32>>,
    }

    impl SamplerRandom for Scripted {
        fn unit_float(&self) -> f64 {
            self.floats.lock().expect("lock").remove(0)
        }

        fn below(&self, bound: u32) -> u32 {
            let drawn: u32 = self.ints.lock().expect("lock").remove(0);
            assert!(drawn < bound);
            drawn
        }
    }

    #[test]
    fn interleaves_the_halves_and_visits_every_bucket_per_round() {
        let scripted: Arc<Scripted> = Arc::new(Scripted { floats: Mutex::new(vec![0.5; 8]), ints: Mutex::new(vec![0, 0, 0, 0, 0, 0, 1]) });
        let sampler: StratifiedSampler = StratifiedSampler::new(8, scripted);
        let buckets: Vec<f64> = (0..8).map(|_| (sampler.sample(0.0, 8.0) - 0.5).round()).collect();
        let mut sorted: Vec<f64> = buckets.clone();
        sorted.sort_by(f64::total_cmp);
        assert_eq!(sorted, [0.0, 1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0]);
        for pair in buckets.chunks(2) {
            assert!((pair[0] < 4.0) != (pair[1] < 4.0), "{buckets:?}");
        }
    }

    #[test]
    fn returns_min_for_an_empty_range() {
        let sampler: StratifiedSampler = StratifiedSampler::new(8, Arc::new(OsSamplerRandom));
        assert_eq!(sampler.sample(0.3, 0.3), 0.3);
        assert_eq!(sampler.sample(0.3, 0.1), 0.3);
    }

    #[test]
    fn sizes_a_piece_in_whole_pixels_within_the_range() {
        let sampler: StratifiedSampler = StratifiedSampler::new(8, Arc::new(OsSamplerRandom));
        for _ in 0..64 {
            let size: u32 = sample_puzzle_piece_size(&sampler, ScaleRange { min: 0.15, max: 0.45 });
            assert!((45..=135).contains(&size), "{size}");
        }
        assert_eq!(sample_puzzle_piece_size(&sampler, ScaleRange { min: 0.0, max: 0.0 }), 1);
    }

    #[test]
    fn rounds_a_piece_size_half_up() {
        let sampler: StratifiedSampler = StratifiedSampler::new(8, Arc::new(OsSamplerRandom));
        assert_eq!(sample_puzzle_piece_size(&sampler, ScaleRange { min: 0.1517, max: 0.1517 }), 46);
        assert_eq!(sample_puzzle_piece_size(&sampler, ScaleRange { min: 0.1515, max: 0.1515 }), 45);
    }

    #[tokio::test]
    async fn tops_back_up_on_its_timer_without_overfilling() {
        let buffer = buffer(2, 5);
        buffer.take().expect("a background");
        buffer.take().expect("a background");
        tokio::time::sleep(Duration::from_millis(200)).await;
        assert_eq!(buffer.depth(), 2);
        assert_eq!(buffer.starvations(), 0);
    }

    fn vectors() -> Value {
        serde_json::from_str(include_str!("../equivalence/puzzle-vectors.json")).expect("puzzle-vectors.json parses")
    }

    #[test]
    fn equivalence_derives_the_mobile_verdict_as_the_ts_does() {
        let vectors: Value = vectors();
        let cases: &Vec<Value> = vectors["mobile"].as_array().expect("cases");
        assert!(cases.len() > 3000);
        for case in cases {
            let signals: &Value = &case["signals"];
            let headers: Option<bson::Document> = signals.get("headers").map(|headers| bson::serialize_to_document(headers).expect("a document"));
            let verdict = derive_mobile_verdict(&MobileSignals {
                user_agent: signals["userAgent"].as_str(),
                headers: headers.as_ref(),
                carrier_network: signals["carrierNetwork"].as_bool(),
                tcp_mss: signals["tcpMss"].as_f64(),
                web_view: signals["webView"].as_bool(),
                device_capability: signals["deviceCapability"].as_str(),
                touch_event_count: signals["touchEventCount"].as_f64(),
            });
            let expected: &Value = &case["verdict"];
            assert_eq!(json!(verdict.is_mobile), expected["isMobile"], "{signals}");
            assert_eq!(json!(verdict.corroborated), expected["corroborated"], "{signals}");
            assert_eq!(Some(verdict.score), expected["score"].as_f64(), "{signals}");
            assert_eq!(json!(verdict.evidence), expected["evidence"], "{signals}");
        }
    }

    #[test]
    fn equivalence_resolves_puzzle_render_settings_and_scale_as_the_ts_does() {
        let vectors: Value = vectors();
        let present = |value: &Value| -> Option<Value> { (!value.is_null()).then(|| value.clone()) };
        for case in vectors["render"].as_array().expect("cases") {
            let (site, routed) = (present(&case["site"]), present(&case["routed"]));
            let resolved: PuzzleRenderSettings = resolve_puzzle_render_settings(&[site.as_ref(), routed.as_ref()]);
            let stored: Value = stored_render_settings(&resolved);
            for key in ["decoyCount", "decoyEdgeDarkness", "decoyBodyBrightness", "holeDarken", "decoyHoleDarken"] {
                assert_eq!(stored[key].as_f64(), case["resolved"][key].as_f64(), "{key} for {case}");
            }
        }
        for case in vectors["scale"].as_array().expect("cases") {
            let (site, routed) = (present(&case["site"]), present(&case["routed"]));
            let range: ScaleRange = resolve_puzzle_piece_scale_range(&[site.as_ref(), routed.as_ref()]);
            assert_eq!(Some(range.min), case["resolved"]["min"].as_f64(), "{case}");
            assert_eq!(Some(range.max), case["resolved"]["max"].as_f64(), "{case}");
        }
    }

    #[test]
    fn equivalence_offers_the_image_switch_as_the_ts_does() {
        for case in vectors()["imageSwitch"].as_array().expect("cases") {
            assert_eq!(json!(is_puzzle_image_switch_available(Some(&case["settings"]))), case["available"], "{case}");
        }
    }
}
