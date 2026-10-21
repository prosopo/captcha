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

// Ported from rust/equivalence/vectors.json, generated from the TS by rust/equivalence/generate.ts

use std::collections::BTreeSet;
use std::sync::OnceLock;

use serde::Deserialize;
use serde_json::Value;
use sha2::{Digest, Sha256};

use crate::{
    add_noise_bed, add_reverb, create_prng, encode_wav, finalise, jsmath, mix_into, normalise,
    random_voice, render_audio_challenge_with_seed, rms, synthesise_utterance, to_data_uri,
    AudioAssetsError, AudioBuffer, AudioRenderSettings, Phoneme, Prng, RenderedAudioChallenge,
    Utterance, Voice, ANSWER_ALPHABET, DEFAULT_RENDER_SETTINGS, DIGITS, SAMPLE_RATE,
};

const VECTORS: &str = include_str!("equivalence/vectors.json");

const SECTIONS: [&str; 11] = [
    "answerAlphabet",
    "defaultRenderSettings",
    "math",
    "phonemes",
    "digits",
    "noiseBed",
    "bufferOps",
    "encode",
    "encodeErrors",
    "renders",
    "renderErrors",
];

/// IEEE-754 bits of an f64 as big-endian hex.
type Bits = String;

type UnaryCase = (Bits, Bits);

type UnaryCheck<'a> = (&'a str, &'a [UnaryCase], fn(f64) -> f64);

fn f(bits: &str) -> f64 {
    f64::from_bits(u64::from_str_radix(bits, 16).expect("hex float bits"))
}

fn same(actual: f64, expected: &str, context: &str) {
    // JS cannot observe a NaN's sign or payload, and the one V8's DataView
    // writes depends on the CPU's default NaN, so any NaN matches any NaN.
    if f(expected).is_nan() {
        assert!(actual.is_nan(), "{context}: got {actual:e}, want NaN");
        return;
    }
    assert_eq!(
        actual.to_bits(),
        f(expected).to_bits(),
        "{context}: got {actual:e}, want {:e}",
        f(expected)
    );
}

fn seeded(hex_seed: &str) -> Prng {
    create_prng(&hex::decode(hex_seed).expect("hex seed")).expect("16-byte seed")
}

fn f32_bytes(samples: &[f32]) -> Vec<u8> {
    samples.iter().flat_map(|s: &f32| s.to_le_bytes()).collect()
}

fn f32s(hex_samples: &str) -> Vec<f32> {
    hex::decode(hex_samples)
        .expect("hex samples")
        .as_chunks::<4>()
        .0
        .iter()
        .map(|b: &[u8; 4]| f32::from_le_bytes(*b))
        .collect()
}

fn sha256_hex(bytes: &[u8]) -> String {
    hex::encode(Sha256::digest(bytes))
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct PcmDigest {
    length: usize,
    sha256: String,
    rms: Bits,
    head: String,
}

fn check_pcm(samples: &[f32], expected: &PcmDigest, context: &str) {
    assert_eq!(samples.len(), expected.length, "{context}: length");
    let head: &[f32] = &samples[..samples.len().min(8)];
    assert_eq!(
        hex::encode(f32_bytes(head)),
        expected.head,
        "{context}: head"
    );
    same(rms(samples), &expected.rms, &format!("{context}: rms"));
    assert_eq!(
        sha256_hex(&f32_bytes(samples)),
        expected.sha256,
        "{context}: pcm"
    );
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct MathVectors {
    cos: Vec<UnaryCase>,
    tanh: Vec<UnaryCase>,
    exp: Vec<UnaryCase>,
    pow10: Vec<UnaryCase>,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
struct VoiceBits {
    f0_hz: Bits,
    f0_drift_ratio: Bits,
    formant_scale: Bits,
    rate: Bits,
    tilt_corner_hz: Bits,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
struct PhonemeVector {
    seed: String,
    digit: usize,
    phonemes: Vec<usize>,
    sample_rate: u32,
    voice: VoiceBits,
    pcm: PcmDigest,
    next_after: Bits,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
struct DigitVector {
    seed: String,
    digit: usize,
    sample_rate: u32,
    pcm: PcmDigest,
    next_after: Bits,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
struct NoiseBedVector {
    input: String,
    seed: String,
    snr_db: Bits,
    pcm: PcmDigest,
    next_after: Bits,
}

#[derive(Deserialize, Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord)]
#[serde(rename_all = "camelCase")]
enum BufferOp {
    Reverb,
    Finalise,
    Normalise,
    MixInto,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
struct BufferOpVector {
    op: BufferOp,
    input: String,
    sample_rate: u32,
    param: Bits,
    source: String,
    offset: Bits,
    pcm: PcmDigest,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
struct EncodeVector {
    samples: String,
    sample_rate: u32,
    wav: String,
    data_uri: String,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
struct EncodeErrorVector {
    sample_rate: u32,
    message: String,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
struct SettingsBits {
    digit_count: Bits,
    noise_snr_db: Bits,
    babble_gain: Bits,
    babble_voices: Bits,
    reverb_mix: Bits,
    gap_ms: Bits,
}

impl SettingsBits {
    fn settings(&self) -> AudioRenderSettings {
        AudioRenderSettings {
            digit_count: f(&self.digit_count),
            noise_snr_db: f(&self.noise_snr_db),
            babble_gain: f(&self.babble_gain),
            babble_voices: f(&self.babble_voices),
            reverb_mix: f(&self.reverb_mix),
            gap_ms: f(&self.gap_ms),
        }
    }
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
struct RenderVector {
    seed: String,
    settings: SettingsBits,
    sample_rate: u32,
    answer: String,
    duration_ms: Bits,
    wav_length: usize,
    wav_sha256: String,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
struct RenderErrorVector {
    seed: String,
    settings: SettingsBits,
    sample_rate: u32,
    message: String,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
struct Vectors {
    answer_alphabet: String,
    default_render_settings: SettingsBits,
    math: MathVectors,
    phonemes: Vec<PhonemeVector>,
    digits: Vec<DigitVector>,
    noise_bed: Vec<NoiseBedVector>,
    buffer_ops: Vec<BufferOpVector>,
    encode: Vec<EncodeVector>,
    encode_errors: Vec<EncodeErrorVector>,
    renders: Vec<RenderVector>,
    render_errors: Vec<RenderErrorVector>,
}

fn vectors() -> &'static Vectors {
    static PARSED: OnceLock<Vectors> = OnceLock::new();
    PARSED.get_or_init(|| serde_json::from_str(VECTORS).expect("vectors.json parses"))
}

fn non_empty<T>(cases: &[T], name: &str) {
    assert!(!cases.is_empty(), "section {name} has no cases");
}

#[test]
fn equivalence_sections() {
    let raw: serde_json::Map<String, Value> =
        serde_json::from_str(VECTORS).expect("vectors.json parses");
    let in_file: BTreeSet<&str> = raw.keys().map(String::as_str).collect();
    let replayed: BTreeSet<&str> = SECTIONS.into_iter().collect();
    assert_eq!(in_file, replayed);

    let v: &Vectors = vectors();
    assert!(!v.answer_alphabet.is_empty());
    non_empty(&v.math.cos, "math.cos");
    non_empty(&v.math.tanh, "math.tanh");
    non_empty(&v.math.exp, "math.exp");
    non_empty(&v.math.pow10, "math.pow10");
    non_empty(&v.phonemes, "phonemes");
    non_empty(&v.digits, "digits");
    non_empty(&v.noise_bed, "noiseBed");
    non_empty(&v.buffer_ops, "bufferOps");
    non_empty(&v.encode, "encode");
    non_empty(&v.encode_errors, "encodeErrors");
    non_empty(&v.renders, "renders");
    non_empty(&v.render_errors, "renderErrors");

    let ops: BTreeSet<BufferOp> = v.buffer_ops.iter().map(|c: &BufferOpVector| c.op).collect();
    assert_eq!(
        ops,
        BTreeSet::from([
            BufferOp::Reverb,
            BufferOp::Finalise,
            BufferOp::Normalise,
            BufferOp::MixInto
        ])
    );
}

#[test]
fn equivalence_constants() {
    let v: &Vectors = vectors();
    assert_eq!(ANSWER_ALPHABET, v.answer_alphabet);
    let s: &SettingsBits = &v.default_render_settings;
    same(
        DEFAULT_RENDER_SETTINGS.digit_count,
        &s.digit_count,
        "digitCount",
    );
    same(
        DEFAULT_RENDER_SETTINGS.noise_snr_db,
        &s.noise_snr_db,
        "noiseSnrDb",
    );
    same(
        DEFAULT_RENDER_SETTINGS.babble_gain,
        &s.babble_gain,
        "babbleGain",
    );
    same(
        DEFAULT_RENDER_SETTINGS.babble_voices,
        &s.babble_voices,
        "babbleVoices",
    );
    same(
        DEFAULT_RENDER_SETTINGS.reverb_mix,
        &s.reverb_mix,
        "reverbMix",
    );
    same(DEFAULT_RENDER_SETTINGS.gap_ms, &s.gap_ms, "gapMs");
}

#[test]
fn equivalence_js_math() {
    let math: &MathVectors = &vectors().math;
    let unary: [UnaryCheck<'_>; 4] = [
        ("cos", &math.cos, jsmath::cos),
        ("tanh", &math.tanh, jsmath::tanh),
        ("exp", &math.exp, jsmath::exp),
        ("pow10", &math.pow10, |x: f64| jsmath::pow(10.0, x)),
    ];
    for (name, cases, function) in unary {
        for (input, output) in cases {
            same(
                function(f(input)),
                output,
                &format!("{name}({:e})", f(input)),
            );
        }
    }
}

fn check_voice(voice: &Voice, expected: &VoiceBits, context: &str) {
    same(voice.f0_hz, &expected.f0_hz, &format!("{context}: f0Hz"));
    same(
        voice.f0_drift_ratio,
        &expected.f0_drift_ratio,
        &format!("{context}: f0DriftRatio"),
    );
    same(
        voice.formant_scale,
        &expected.formant_scale,
        &format!("{context}: formantScale"),
    );
    same(voice.rate, &expected.rate, &format!("{context}: rate"));
    same(
        voice.tilt_corner_hz,
        &expected.tilt_corner_hz,
        &format!("{context}: tiltCornerHz"),
    );
}

#[test]
fn equivalence_phonemes() {
    for (i, case) in vectors().phonemes.iter().enumerate() {
        let context: String = format!(
            "phonemes[{i}] digit {} span {:?}",
            case.digit, case.phonemes
        );
        let digit: &Utterance<'static> = &DIGITS[case.digit];
        let span: Vec<Phoneme> = case
            .phonemes
            .iter()
            .map(|&p: &usize| digit.phonemes[p])
            .collect();
        let utterance: Utterance<'_> = Utterance {
            answer: digit.answer,
            phonemes: &span,
        };
        let mut prng: Prng = seeded(&case.seed);
        let voice: Voice = random_voice(&mut prng);
        check_voice(&voice, &case.voice, &context);
        let buffer: AudioBuffer =
            synthesise_utterance(&utterance, &voice, &mut prng, case.sample_rate);
        assert_eq!(
            buffer.sample_rate, case.sample_rate,
            "{context}: sample rate"
        );
        check_pcm(&buffer.samples, &case.pcm, &context);
        same(
            prng.next(),
            &case.next_after,
            &format!("{context}: next draw"),
        );
    }
}

#[test]
fn equivalence_digits() {
    for (i, case) in vectors().digits.iter().enumerate() {
        let context: String = format!(
            "digits[{i}] digit {} at {} Hz",
            case.digit, case.sample_rate
        );
        let mut prng: Prng = seeded(&case.seed);
        let voice: Voice = random_voice(&mut prng);
        let buffer: AudioBuffer =
            synthesise_utterance(&DIGITS[case.digit], &voice, &mut prng, case.sample_rate);
        check_pcm(&buffer.samples, &case.pcm, &context);
        same(
            prng.next(),
            &case.next_after,
            &format!("{context}: next draw"),
        );
    }
}

#[test]
fn equivalence_noise_bed() {
    for (i, case) in vectors().noise_bed.iter().enumerate() {
        let context: String = format!("noiseBed[{i}] snr {:e}", f(&case.snr_db));
        let mut prng: Prng = seeded(&case.seed);
        let mut buffer: AudioBuffer = AudioBuffer {
            samples: f32s(&case.input),
            sample_rate: SAMPLE_RATE,
        };
        add_noise_bed(&mut buffer, &mut prng, f(&case.snr_db));
        check_pcm(&buffer.samples, &case.pcm, &context);
        same(
            prng.next(),
            &case.next_after,
            &format!("{context}: next draw"),
        );
    }
}

#[test]
fn equivalence_buffer_ops() {
    for (i, case) in vectors().buffer_ops.iter().enumerate() {
        let context: String = format!(
            "bufferOps[{i}] {:?} param {:e} offset {:e} at {} Hz",
            case.op,
            f(&case.param),
            f(&case.offset),
            case.sample_rate
        );
        let mut buffer: AudioBuffer = AudioBuffer {
            samples: f32s(&case.input),
            sample_rate: case.sample_rate,
        };
        match case.op {
            BufferOp::Reverb => add_reverb(&mut buffer, f(&case.param)),
            BufferOp::Finalise => finalise(&mut buffer),
            BufferOp::Normalise => normalise(&mut buffer.samples, f(&case.param)),
            BufferOp::MixInto => mix_into(
                &mut buffer.samples,
                &f32s(&case.source),
                f(&case.offset),
                f(&case.param),
            ),
        }
        check_pcm(&buffer.samples, &case.pcm, &context);
    }
}

#[test]
fn equivalence_encode() {
    for (i, case) in vectors().encode.iter().enumerate() {
        let context: String = format!("encode[{i}] at {} Hz", case.sample_rate);
        let wav: Vec<u8> = encode_wav(&AudioBuffer {
            samples: f32s(&case.samples),
            sample_rate: case.sample_rate,
        })
        .unwrap_or_else(|e: AudioAssetsError| panic!("{context}: {e}"));
        assert_eq!(hex::encode(&wav), case.wav, "{context}: wav");
        assert_eq!(to_data_uri(&wav), case.data_uri, "{context}: data uri");
    }
}

#[test]
fn equivalence_encode_errors() {
    for case in &vectors().encode_errors {
        let error: AudioAssetsError = encode_wav(&AudioBuffer {
            samples: Vec::new(),
            sample_rate: case.sample_rate,
        })
        .expect_err("TS throws");
        assert_eq!(
            error.to_string(),
            case.message,
            "encode at {} Hz",
            case.sample_rate
        );
    }
}

#[test]
fn equivalence_renders() {
    for (i, case) in vectors().renders.iter().enumerate() {
        let settings: AudioRenderSettings = case.settings.settings();
        let context: String = format!("renders[{i}] {settings:?} at {} Hz", case.sample_rate);
        let seed: Vec<u8> = hex::decode(&case.seed).expect("hex seed");
        let challenge: RenderedAudioChallenge =
            render_audio_challenge_with_seed(&settings, case.sample_rate, &seed)
                .unwrap_or_else(|e: AudioAssetsError| panic!("{context}: {e}"));
        assert_eq!(challenge.answer, case.answer, "{context}: answer");
        same(
            challenge.duration_ms,
            &case.duration_ms,
            &format!("{context}: durationMs"),
        );
        assert_eq!(
            challenge.wav.len(),
            case.wav_length,
            "{context}: wav length"
        );
        assert_eq!(
            sha256_hex(&challenge.wav),
            case.wav_sha256,
            "{context}: wav"
        );
    }
}

#[test]
fn equivalence_render_errors() {
    for (i, case) in vectors().render_errors.iter().enumerate() {
        let settings: AudioRenderSettings = case.settings.settings();
        let seed: Vec<u8> = hex::decode(&case.seed).expect("hex seed");
        let error: AudioAssetsError =
            render_audio_challenge_with_seed(&settings, case.sample_rate, &seed)
                .expect_err("TS throws");
        assert_eq!(
            error.to_string(),
            case.message,
            "renderErrors[{i}] {settings:?}"
        );
    }
}
