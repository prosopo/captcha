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

// Ported from src/tests/audioAssets.unit.test.ts

use std::collections::HashSet;
use std::f64::consts::PI;

use base64::Engine;

use crate::{
    add_noise_bed, create_prng, create_seed, encode_wav, random_voice, render_audio_challenge, rms,
    synthesise_utterance, to_data_uri, AudioBuffer, AudioRenderSettings, RenderedAudioChallenge,
    ANSWER_ALPHABET, DEFAULT_RENDER_SETTINGS, DIGITS, SAMPLE_RATE,
};

fn clean_settings() -> AudioRenderSettings {
    AudioRenderSettings {
        noise_snr_db: 60.0,
        babble_gain: 0.0,
        babble_voices: 0.0,
        reverb_mix: 0.0,
        ..DEFAULT_RENDER_SETTINGS
    }
}

fn render(settings: &AudioRenderSettings) -> RenderedAudioChallenge {
    render_audio_challenge(settings, SAMPLE_RATE).expect("render")
}

fn read_u16(wav: &[u8], offset: usize) -> u16 {
    u16::from_le_bytes([wav[offset], wav[offset + 1]])
}

fn read_u32(wav: &[u8], offset: usize) -> u32 {
    u32::from_le_bytes([
        wav[offset],
        wav[offset + 1],
        wav[offset + 2],
        wav[offset + 3],
    ])
}

fn decode_wav(wav: &[u8]) -> Vec<f32> {
    let data_bytes = read_u32(wav, 40) as usize;
    (0..data_bytes / 2)
        .map(|n| {
            let value = i16::from_le_bytes([wav[44 + n * 2], wav[45 + n * 2]]);
            (f64::from(value) / 32767.0) as f32
        })
        .collect()
}

fn first_digit_samples(seed: &[u8]) -> Vec<f32> {
    let mut prng = create_prng(seed).expect("seed");
    let voice = random_voice(&mut prng);
    synthesise_utterance(&DIGITS[0], &voice, &mut prng, SAMPLE_RATE).samples
}

mod phoneme_table {
    use super::*;

    #[test]
    fn covers_every_decimal_digit_exactly_once() {
        let mut answers: Vec<&str> = DIGITS.iter().map(|d| d.answer).collect();
        answers.sort();
        assert_eq!(
            answers,
            vec!["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]
        );
        let unique: HashSet<&str> = answers.iter().copied().collect();
        assert_eq!(unique.len(), DIGITS.len());
    }

    #[test]
    fn every_digit_has_at_least_one_phoneme_and_a_positive_duration() {
        for digit in &DIGITS {
            assert!(!digit.phonemes.is_empty());
            let total: f64 = digit.phonemes.iter().map(|p| p.duration_ms).sum();
            assert!(total > 0.0);
        }
    }

    #[test]
    fn answer_alphabet_matches_the_table() {
        for digit in &DIGITS {
            assert!(ANSWER_ALPHABET.contains(digit.answer));
        }
        assert_eq!(ANSWER_ALPHABET.len(), DIGITS.len());
        let joined: String = DIGITS.iter().map(|d| d.answer).collect();
        assert_eq!(ANSWER_ALPHABET, joined);
    }
}

mod synthesise_utterance {
    use super::*;

    #[test]
    fn produces_audible_finite_in_range_samples() {
        let mut prng = create_prng(&create_seed()).expect("seed");
        let voice = random_voice(&mut prng);
        for digit in &DIGITS {
            let buffer = synthesise_utterance(digit, &voice, &mut prng, SAMPLE_RATE);
            assert_eq!(buffer.sample_rate, SAMPLE_RATE);
            assert!(!buffer.samples.is_empty());
            for &sample in &buffer.samples {
                assert!(sample.is_finite());
                assert!(f64::from(sample).abs() <= 1.0001);
            }
            assert!(rms(&buffer.samples) > 0.01);
        }
    }

    #[test]
    fn digit_durations_sit_in_a_plausible_speech_range() {
        let mut prng = create_prng(&create_seed()).expect("seed");
        let voice = random_voice(&mut prng);
        for digit in &DIGITS {
            let buffer = synthesise_utterance(digit, &voice, &mut prng, SAMPLE_RATE);
            let ms = (buffer.samples.len() as f64 / f64::from(SAMPLE_RATE)) * 1000.0;
            assert!(ms > 120.0);
            assert!(ms < 900.0);
        }
    }

    #[test]
    fn the_same_seed_reproduces_the_same_audio() {
        let seed = create_seed();
        assert_eq!(first_digit_samples(&seed), first_digit_samples(&seed));
    }

    #[test]
    fn different_seeds_produce_different_audio() {
        assert_ne!(
            first_digit_samples(&create_seed()),
            first_digit_samples(&create_seed())
        );
    }

    #[test]
    fn starts_and_ends_near_silence_so_there_is_no_click() {
        let mut prng = create_prng(&create_seed()).expect("seed");
        let voice = random_voice(&mut prng);
        let samples = synthesise_utterance(&DIGITS[5], &voice, &mut prng, SAMPLE_RATE).samples;
        let first = samples.first().copied().unwrap_or(1.0);
        let last = samples.last().copied().unwrap_or(1.0);
        assert!(f64::from(first).abs() < 0.02);
        assert!(f64::from(last).abs() < 0.02);
    }
}

mod render_audio_challenge {
    use super::*;

    #[test]
    fn answer_length_matches_digit_count_and_uses_only_the_alphabet() {
        for digit_count in [3.0, 5.0, 8.0] {
            let challenge = render(&AudioRenderSettings {
                digit_count,
                ..clean_settings()
            });
            assert_eq!(challenge.answer.chars().count(), digit_count as usize);
            for character in challenge.answer.chars() {
                assert!(ANSWER_ALPHABET.contains(character));
            }
        }
    }

    #[test]
    fn emits_a_valid_riff_wave_header_the_reported_length_agrees_with() {
        let challenge = render(&clean_settings());
        let wav = &challenge.wav;

        assert_eq!(&wav[0..4], b"RIFF");
        assert_eq!(&wav[8..12], b"WAVE");
        assert_eq!(&wav[12..16], b"fmt ");
        assert_eq!(read_u16(wav, 20), 1);
        assert_eq!(read_u16(wav, 22), 1);
        assert_eq!(read_u32(wav, 24), SAMPLE_RATE);
        assert_eq!(read_u16(wav, 34), 16);
        assert_eq!(&wav[36..40], b"data");

        let data_bytes = read_u32(wav, 40) as usize;
        assert_eq!(wav.len(), 44 + data_bytes);
        assert_eq!(read_u32(wav, 4) as usize, 36 + data_bytes);

        let duration_ms = (data_bytes as f64 / 2.0 / f64::from(SAMPLE_RATE)) * 1000.0;
        assert!((duration_ms - challenge.duration_ms).abs() < 2.0);
    }

    #[test]
    fn clip_is_long_enough_to_hold_every_digit_but_stays_reasonable() {
        let challenge = render(&AudioRenderSettings {
            digit_count: 5.0,
            ..clean_settings()
        });
        assert!(challenge.duration_ms > 1500.0);
        assert!(challenge.duration_ms < 12000.0);
    }

    #[test]
    fn consecutive_challenges_differ_in_both_answer_and_audio() {
        let mut answers: HashSet<String> = HashSet::new();
        let mut digests: HashSet<String> = HashSet::new();
        for _ in 0..12 {
            let challenge = render(&clean_settings());
            answers.insert(challenge.answer);
            let encoded = base64::engine::general_purpose::STANDARD.encode(&challenge.wav);
            digests.insert(encoded[..256].to_owned());
        }
        assert!(answers.len() > 1);
        assert_eq!(digests.len(), 12);
    }

    #[test]
    fn does_not_clip_no_sample_is_pinned_at_the_rail() {
        let challenge = render(&DEFAULT_RENDER_SETTINGS);
        let samples = decode_wav(&challenge.wav);
        let pinned = samples
            .iter()
            .filter(|&&s| f64::from(s).abs() >= 0.999)
            .count();
        assert!((pinned as f64) < samples.len() as f64 * 0.001);
    }

    #[test]
    fn babble_adds_energy_without_swamping_the_foreground() {
        let without_babble = render(&AudioRenderSettings {
            digit_count: 4.0,
            ..clean_settings()
        });
        let with_babble = render(&AudioRenderSettings {
            digit_count: 4.0,
            babble_gain: 0.2,
            babble_voices: 2.0,
            ..clean_settings()
        });
        // Both are peak-normalised, so compare RMS.
        assert!(rms(&decode_wav(&with_babble.wav)) > rms(&decode_wav(&without_babble.wav)) * 0.5);
    }
}

mod add_noise_bed {
    use super::*;

    #[test]
    fn hits_the_requested_snr() {
        for snr_db in [6.0, 14.0, 24.0] {
            let mut prng = create_prng(&create_seed()).expect("seed");
            let signal: Vec<f32> = (0..SAMPLE_RATE)
                .map(|n| {
                    (0.5 * ((2.0 * PI * 440.0 * f64::from(n)) / f64::from(SAMPLE_RATE)).sin())
                        as f32
                })
                .collect();
            let clean = signal.clone();
            let before = rms(&clean);

            let mut buffer = AudioBuffer {
                samples: signal,
                sample_rate: SAMPLE_RATE,
            };
            add_noise_bed(&mut buffer, &mut prng, snr_db);

            // Difference, not power subtraction: over a finite window pink
            // noise correlates with the sine, which made that estimate flaky.
            let noise: Vec<f32> = buffer
                .samples
                .iter()
                .zip(clean.iter())
                .map(|(&noisy, &dry)| (f64::from(noisy) - f64::from(dry)) as f32)
                .collect();

            let measured = 20.0 * (before / rms(&noise)).log10();
            assert!((measured - snr_db).abs() < 0.5);
        }
    }

    #[test]
    fn leaves_silence_alone_rather_than_dividing_by_zero() {
        let mut prng = create_prng(&create_seed()).expect("seed");
        let mut buffer = AudioBuffer {
            samples: vec![0.0; 1000],
            sample_rate: SAMPLE_RATE,
        };
        add_noise_bed(&mut buffer, &mut prng, 10.0);
        assert_eq!(rms(&buffer.samples), 0.0);
    }
}

mod encode_wav {
    use super::*;

    #[test]
    fn round_trips_samples_within_16_bit_quantisation_error() {
        let samples: Vec<f32> = vec![0.0, 0.5, -0.5, 0.999, -0.999];
        let decoded = decode_wav(
            &encode_wav(&AudioBuffer {
                samples: samples.clone(),
                sample_rate: SAMPLE_RATE,
            })
            .expect("encode"),
        );
        for (&got, &want) in decoded.iter().zip(samples.iter()) {
            assert!((f64::from(got) - f64::from(want)).abs() < 1.0 / 32767.0);
        }
    }

    #[test]
    fn saturates_out_of_range_samples_instead_of_wrapping() {
        let decoded = decode_wav(
            &encode_wav(&AudioBuffer {
                samples: vec![2.0, -2.0],
                sample_rate: SAMPLE_RATE,
            })
            .expect("encode"),
        );
        assert!(decoded[0] > 0.99);
        assert!(decoded[1] < -0.99);
    }

    #[test]
    fn to_data_uri_produces_a_playable_audio_wav_uri() {
        let challenge = render(&AudioRenderSettings {
            digit_count: 2.0,
            ..clean_settings()
        });
        let uri = to_data_uri(&challenge.wav);
        assert!(uri.starts_with("data:audio/wav;base64,"));
        let payload = uri.split(',').nth(1).unwrap_or("");
        let decoded = base64::engine::general_purpose::STANDARD
            .decode(payload)
            .expect("base64");
        assert_eq!(decoded, challenge.wav);
    }
}

mod errors {
    use crate::{
        create_prng, encode_wav, render_audio_challenge_with_seed, AudioAssetsError, AudioBuffer,
        PuzzleAssetsError, DEFAULT_RENDER_SETTINGS, SAMPLE_RATE,
    };

    #[test]
    fn short_seed_is_rejected_with_the_prng_message() {
        let error =
            render_audio_challenge_with_seed(&DEFAULT_RENDER_SETTINGS, SAMPLE_RATE, &[0; 15])
                .expect_err("short seed");
        assert_eq!(
            error,
            AudioAssetsError::Prng(PuzzleAssetsError::SeedTooShort { len: 15 })
        );
        assert_eq!(
            error.to_string(),
            "puzzle-assets: seed must be at least 16 bytes, got 15"
        );
        assert!(create_prng(&[0; 16]).is_ok());
    }

    #[test]
    fn header_overflow_reports_node_out_of_range_message() {
        let at_limit = encode_wav(&AudioBuffer {
            samples: Vec::new(),
            sample_rate: 1 << 31,
        })
        .expect_err("byte rate overflows");
        assert_eq!(
            at_limit.to_string(),
            "The value of \"value\" is out of range. It must be >= 0 and <= 4294967295. Received 4294967296"
        );
        let past_limit = encode_wav(&AudioBuffer {
            samples: Vec::new(),
            sample_rate: (1 << 31) + 1,
        })
        .expect_err("byte rate overflows");
        assert_eq!(
            past_limit.to_string(),
            "The value of \"value\" is out of range. It must be >= 0 and <= 4294967295. Received 4_294_967_298"
        );
    }

    #[test]
    fn negative_length_reports_the_typed_array_range_error() {
        assert_eq!(
            AudioAssetsError::InvalidTypedArrayLength(-5.0).to_string(),
            "Invalid typed array length: -5"
        );
        assert_eq!(
            AudioAssetsError::InvalidTypedArrayLength(f64::INFINITY).to_string(),
            "Invalid typed array length: Infinity"
        );
    }
}
