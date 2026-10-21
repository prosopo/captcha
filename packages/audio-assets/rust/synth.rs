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

//! Klatt-style source-filter speech synthesiser. Procedural rather than a
//! recorded corpus: a finite corpus can be collected and matched against, a
//! continuous parameter space cannot.

use std::f64::consts::PI;

use prosopo_puzzle_assets::Prng;

use crate::jsmath;
use crate::levels::{normalise, rms};
use crate::types::{AudioBuffer, Excitation, Phoneme, Utterance};

/// Not 8 kHz: /s/, /f/ and /θ/ live at 4-8 kHz and are what separate six,
/// five and three.
pub const SAMPLE_RATE: u32 = 16000;

const NYQUIST_GUARD_HZ: f64 = 100.0;
const MIN_FORMANT_BANDWIDTH_HZ: f64 = 10.0;
const MIN_NOISE_BANDWIDTH_HZ: f64 = 100.0;
const LEVEL_RAMP_SECONDS: f64 = 0.004;
const EDGE_FADE_SECONDS: f64 = 0.008;
const WORD_PEAK: f64 = 0.9;
const SILENT_RMS: f64 = 1e-9;
const GLOTTAL_OPEN_QUOTIENT: f64 = 0.6;
const GLOTTAL_SPEED_QUOTIENT: f64 = 0.35;

/// Drawn per speaker so the same digit never renders identically twice.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Voice {
    pub f0_hz: f64,
    /// Peak-to-peak intonation fall across a word, as a fraction of f0.
    pub f0_drift_ratio: f64,
    /// Stands in for vocal-tract length: ~0.85 a large adult male, ~1.25 a child.
    pub formant_scale: f64,
    /// Duration multiplier; higher is slower.
    pub rate: f64,
    /// One-pole low-pass on the glottal source; lower is breathier. Kept above
    /// F3 so it shades voice quality without deciding the spectrum.
    pub tilt_corner_hz: f64,
}

pub fn random_voice(prng: &mut Prng) -> Voice {
    Voice {
        f0_hz: prng.range(85.0, 210.0),
        f0_drift_ratio: prng.range(0.04, 0.16),
        formant_scale: prng.range(0.86, 1.22),
        rate: prng.range(0.82, 1.24),
        tilt_corner_hz: prng.range(4500.0, 8000.0),
    }
}

/// Two-pole formant resonator, normalised to unity DC gain so a cascade stays
/// bounded.
struct Resonator {
    sample_rate: f64,
    y1: f64,
    y2: f64,
    a: f64,
    b: f64,
    c: f64,
}

impl Resonator {
    fn new(sample_rate: f64) -> Self {
        Resonator {
            sample_rate,
            y1: 0.0,
            y2: 0.0,
            a: 1.0,
            b: 0.0,
            c: 0.0,
        }
    }

    fn set_target(&mut self, freq_hz: f64, bandwidth_hz: f64) {
        // A pole above Nyquist folds back as a whistle at the wrong frequency.
        let f = jsmath::min(
            jsmath::max(freq_hz, 1.0),
            self.sample_rate / 2.0 - NYQUIST_GUARD_HZ,
        );
        let bw = jsmath::max(bandwidth_hz, MIN_FORMANT_BANDWIDTH_HZ);
        let r = jsmath::exp((-PI * bw) / self.sample_rate);
        let theta = (2.0 * PI * f) / self.sample_rate;
        self.b = 2.0 * r * jsmath::cos(theta);
        self.c = -(r * r);
        self.a = 1.0 - self.b - self.c;
    }

    fn process(&mut self, x: f64) -> f64 {
        let y = self.a * x + self.b * self.y1 + self.c * self.y2;
        self.y2 = self.y1;
        self.y1 = y;
        y
    }
}

struct OnePoleLowPass {
    alpha: f64,
    y: f64,
}

impl OnePoleLowPass {
    fn new(sample_rate: f64, cutoff_hz: f64) -> Self {
        let dt = 1.0 / sample_rate;
        let rc = 1.0 / (2.0 * PI * cutoff_hz);
        OnePoleLowPass {
            alpha: dt / (rc + dt),
            y: 0.0,
        }
    }

    fn process(&mut self, x: f64) -> f64 {
        self.y += self.alpha * (x - self.y);
        self.y
    }
}

/// Lip radiation, a +6 dB/octave differentiator. Without it the glottal
/// pulse's DC and steep rolloff bury F2 and F3, which are what tell vowels
/// apart.
struct Radiation {
    previous: f64,
}

impl Radiation {
    fn process(&mut self, x: f64) -> f64 {
        let y = x - self.previous;
        self.previous = x;
        y
    }
}

/// Rosenberg glottal pulse; a bare impulse train through the formants sounds
/// like a buzzer.
struct GlottalSource {
    sample_rate: f64,
    rise: f64,
    fall: f64,
    phase: f64,
}

impl GlottalSource {
    fn new(sample_rate: f64) -> Self {
        GlottalSource {
            sample_rate,
            rise: GLOTTAL_OPEN_QUOTIENT * (1.0 - GLOTTAL_SPEED_QUOTIENT),
            fall: GLOTTAL_OPEN_QUOTIENT * GLOTTAL_SPEED_QUOTIENT,
            phase: 0.0,
        }
    }

    fn process(&mut self, f0_hz: f64) -> f64 {
        self.phase += f0_hz / self.sample_rate;
        if self.phase >= 1.0 {
            self.phase -= 1.0;
        }

        if self.phase < self.rise {
            return 0.5 * (1.0 - jsmath::cos((PI * self.phase) / self.rise));
        }
        if self.phase < GLOTTAL_OPEN_QUOTIENT {
            return jsmath::cos((PI / 2.0) * ((self.phase - self.rise) / self.fall));
        }
        0.0
    }
}

fn lerp(from: f64, to: f64, t: f64) -> f64 {
    from + (to - from) * t
}

struct Frame {
    formants: [f64; 3],
    bandwidths: [f64; 3],
    voice_gain: f64,
    noise_gain: f64,
    noise_centre_hz: f64,
    noise_bandwidth_hz: f64,
    silent: bool,
}

struct Segment {
    start: usize,
    end: usize,
    /// Relative RMS from the phoneme table, not the filter output: the formant
    /// cascade's peak gain would otherwise make vowels far hotter than
    /// fricatives, and per-word normalisation would then bury the fricatives
    /// that identify six, seven and three.
    target_level: f64,
}

fn is_blendable(previous: &Phoneme, current: &Phoneme) -> bool {
    !current.abrupt
        && !previous.abrupt
        && previous.excitation != Excitation::Silence
        && current.excitation != Excitation::Silence
}

fn build_frames(
    phonemes: &[Phoneme],
    voice: &Voice,
    sample_rate: f64,
) -> (Vec<Frame>, Vec<Segment>) {
    let mut frames: Vec<Frame> = Vec::new();
    let mut segments: Vec<Segment> = Vec::new();

    let scaled = |p: &Phoneme| -> [f64; 3] { p.formants.map(|f| f * voice.formant_scale) };

    let mut previous: Option<&Phoneme> = None;
    for current in phonemes {
        let length_samples = jsmath::max(
            1.0,
            jsmath::round((current.duration_ms * voice.rate * sample_rate) / 1000.0),
        );
        let length = jsmath::count_below(length_samples);

        let from = match previous {
            Some(previous) if is_blendable(previous, current) => previous,
            _ => current,
        };
        let blend_samples = if std::ptr::eq(from, current) {
            0.0
        } else {
            (length_samples / 3.0).floor()
        };
        let source = scaled(from);
        let target = scaled(current);

        segments.push(Segment {
            start: frames.len(),
            end: frames.len() + length,
            target_level: if current.excitation == Excitation::Silence {
                0.0
            } else {
                jsmath::max(current.voice_gain, current.noise_gain)
            },
        });

        for n in 0..length {
            let t = if blend_samples > 0.0 {
                jsmath::min(1.0, n as f64 / blend_samples)
            } else {
                1.0
            };
            frames.push(Frame {
                formants: [0, 1, 2].map(|k| lerp(source[k], target[k], t)),
                bandwidths: [0, 1, 2].map(|k| lerp(from.bandwidths[k], current.bandwidths[k], t)),
                voice_gain: lerp(from.voice_gain, current.voice_gain, t),
                noise_gain: lerp(from.noise_gain, current.noise_gain, t),
                // Not interpolated: gliding /s/ into /f/ through the bands
                // between is not a sound any vocal tract makes.
                noise_centre_hz: current.noise_centre_hz,
                noise_bandwidth_hz: current.noise_bandwidth_hz,
                silent: current.excitation == Excitation::Silence,
            });
        }
        previous = Some(current);
    }

    (frames, segments)
}

/// Rescale each segment to its target level, ramping the gain across
/// boundaries: a gain step clicks, and a click at every phoneme boundary is a
/// free segmentation cue for an attacker.
fn apply_segment_levels(samples: &mut [f32], segments: &[Segment], sample_rate: f64) {
    let ramp_length = jsmath::max(1.0, jsmath::round(sample_rate * LEVEL_RAMP_SECONDS));

    let gains: Vec<f64> = segments
        .iter()
        .map(|segment| {
            if segment.target_level <= 0.0 {
                return 0.0;
            }
            let level = rms(&samples[segment.start..segment.end]);
            if level < SILENT_RMS {
                0.0
            } else {
                segment.target_level / level
            }
        })
        .collect();

    let mut track = vec![0.0_f32; samples.len()];
    for (segment, &gain) in segments.iter().zip(gains.iter()) {
        track[segment.start..segment.end].fill(gain as f32);
    }
    for i in 1..segments.len() {
        let segment = &segments[i];
        let gain = gains[i];
        let previous_gain = gains[i - 1];
        let length = jsmath::min(ramp_length, (segment.end - segment.start) as f64);
        for n in 0..jsmath::count_below(length) {
            let index = segment.start + n;
            if index >= track.len() {
                break;
            }
            let t = 0.5 * (1.0 - jsmath::cos((PI * n as f64) / length));
            track[index] = (previous_gain + (gain - previous_gain) * t) as f32;
        }
    }

    for (sample, &gain) in samples.iter_mut().zip(track.iter()) {
        *sample = (f64::from(*sample) * f64::from(gain)) as f32;
    }
}

/// Raised-cosine fade in and out, in place.
fn apply_edge_fade(samples: &mut [f32], fade_length: f64) {
    let length = jsmath::min(fade_length, (samples.len() / 2) as f64);
    let len = samples.len();
    for n in 0..jsmath::count_below(length) {
        let gain = 0.5 * (1.0 - jsmath::cos((PI * n as f64) / length));
        let tail = len - 1 - n;
        samples[n] = (f64::from(samples[n]) * gain) as f32;
        samples[tail] = (f64::from(samples[tail]) * gain) as f32;
    }
}

pub fn synthesise_utterance(
    utterance: &Utterance<'_>,
    voice: &Voice,
    prng: &mut Prng,
    sample_rate: u32,
) -> AudioBuffer {
    let rate = f64::from(sample_rate);
    let (frames, segments) = build_frames(utterance.phonemes, voice, rate);
    let mut out = vec![0.0_f32; frames.len()];

    let mut formant_filters = [
        Resonator::new(rate),
        Resonator::new(rate),
        Resonator::new(rate),
    ];
    let mut noise_filter = Resonator::new(rate);
    let mut glottis = GlottalSource::new(rate);
    let mut radiation = Radiation { previous: 0.0 };
    let mut tilt = OnePoleLowPass::new(rate, voice.tilt_corner_hz);

    // A dead-flat F0 sounds robotic and is a trivially detectable regularity.
    let f0_start = voice.f0_hz * (1.0 + voice.f0_drift_ratio / 2.0);
    let f0_end = voice.f0_hz * (1.0 - voice.f0_drift_ratio / 2.0);
    let jitter_depth = prng.range(0.004, 0.02);

    let last = frames.len().saturating_sub(1) as f64;
    for (n, frame) in frames.iter().enumerate() {
        if frame.silent {
            continue;
        }

        let progress = if frames.len() > 1 {
            n as f64 / last
        } else {
            0.0
        };
        let f0 = lerp(f0_start, f0_end, progress) * (1.0 + jitter_depth * (prng.next() - 0.5));

        let mut sample = 0.0_f64;

        if frame.voice_gain > 0.0 {
            let mut voiced = tilt.process(glottis.process(f0));
            for (k, filter) in formant_filters.iter_mut().enumerate() {
                filter.set_target(frame.formants[k], frame.bandwidths[k]);
                voiced = filter.process(voiced);
            }
            sample += voiced * frame.voice_gain;
        }

        if frame.noise_gain > 0.0 {
            noise_filter.set_target(
                frame.noise_centre_hz,
                jsmath::max(frame.noise_bandwidth_hz, MIN_NOISE_BANDWIDTH_HZ),
            );
            let noise = prng.next() * 2.0 - 1.0;
            sample += noise_filter.process(noise) * frame.noise_gain;
        }

        // Turbulence leaves the mouth the same way voicing does.
        out[n] = radiation.process(sample) as f32;
    }

    apply_segment_levels(&mut out, &segments, rate);
    // An unfaded word edge clicks, and hands an attacker a sharp onset to
    // segment on.
    apply_edge_fade(&mut out, jsmath::round(rate * EDGE_FADE_SECONDS));
    normalise(&mut out, WORD_PEAK);

    AudioBuffer {
        samples: out,
        sample_rate,
    }
}
