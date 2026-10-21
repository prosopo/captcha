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

//! English digit names. Formants are Peterson & Barney adult-male vowel
//! measurements, rounded; the synthesiser scales them per speaker.
//!
//! Letters are excluded: the E-set (B, C, D, E, G, P, T, V, Z) differs only
//! by a short onset and collapses under noise.

use crate::types::{Excitation, Phoneme, Utterance};

const STOP_BURST_MS: f64 = 18.0;
const VOICED_FRICATIVE_VOICE_GAIN: f64 = 0.45;
const NASAL_VOICE_GAIN: f64 = 0.5;
const APPROXIMANT_VOICE_GAIN: f64 = 0.85;

const SEGMENT_DEFAULTS: Phoneme = Phoneme {
    id: "",
    excitation: Excitation::Voiced,
    formants: [0.0, 0.0, 0.0],
    bandwidths: [80.0, 110.0, 160.0],
    duration_ms: 0.0,
    voice_gain: 1.0,
    noise_gain: 0.0,
    noise_centre_hz: 0.0,
    noise_bandwidth_hz: 0.0,
    abrupt: false,
};

const fn vowel(id: &'static str, f1: f64, f2: f64, f3: f64, duration_ms: f64) -> Phoneme {
    Phoneme {
        id,
        excitation: Excitation::Voiced,
        formants: [f1, f2, f3],
        duration_ms,
        ..SEGMENT_DEFAULTS
    }
}

const fn fricative(
    id: &'static str,
    centre_hz: f64,
    bandwidth_hz: f64,
    gain: f64,
    duration_ms: f64,
) -> Phoneme {
    Phoneme {
        id,
        excitation: Excitation::Unvoiced,
        formants: [0.0, 0.0, 0.0],
        duration_ms,
        voice_gain: 0.0,
        noise_gain: gain,
        noise_centre_hz: centre_hz,
        noise_bandwidth_hz: bandwidth_hz,
        ..SEGMENT_DEFAULTS
    }
}

#[allow(clippy::too_many_arguments)]
const fn voiced_fricative(
    id: &'static str,
    f1: f64,
    f2: f64,
    f3: f64,
    centre_hz: f64,
    bandwidth_hz: f64,
    gain: f64,
    duration_ms: f64,
) -> Phoneme {
    Phoneme {
        id,
        excitation: Excitation::Mixed,
        formants: [f1, f2, f3],
        duration_ms,
        voice_gain: VOICED_FRICATIVE_VOICE_GAIN,
        noise_gain: gain,
        noise_centre_hz: centre_hz,
        noise_bandwidth_hz: bandwidth_hz,
        ..SEGMENT_DEFAULTS
    }
}

const fn nasal(id: &'static str, f1: f64, f2: f64, f3: f64, duration_ms: f64) -> Phoneme {
    Phoneme {
        id,
        excitation: Excitation::Voiced,
        formants: [f1, f2, f3],
        bandwidths: [180.0, 250.0, 320.0],
        duration_ms,
        voice_gain: NASAL_VOICE_GAIN,
        ..SEGMENT_DEFAULTS
    }
}

const fn closure(id: &'static str, duration_ms: f64) -> Phoneme {
    Phoneme {
        id,
        excitation: Excitation::Silence,
        formants: [0.0, 0.0, 0.0],
        duration_ms,
        voice_gain: 0.0,
        ..SEGMENT_DEFAULTS
    }
}

const fn burst(id: &'static str, centre_hz: f64, bandwidth_hz: f64, gain: f64) -> Phoneme {
    Phoneme {
        id,
        excitation: Excitation::Unvoiced,
        formants: [0.0, 0.0, 0.0],
        duration_ms: STOP_BURST_MS,
        voice_gain: 0.0,
        noise_gain: gain,
        noise_centre_hz: centre_hz,
        noise_bandwidth_hz: bandwidth_hz,
        abrupt: true,
        ..SEGMENT_DEFAULTS
    }
}

const IY: Phoneme = vowel("IY", 270.0, 2290.0, 3010.0, 150.0);
const IH: Phoneme = vowel("IH", 390.0, 1990.0, 2550.0, 95.0);
const EH: Phoneme = vowel("EH", 530.0, 1840.0, 2480.0, 110.0);
const AH: Phoneme = vowel("AH", 640.0, 1190.0, 2390.0, 105.0);
const AA: Phoneme = vowel("AA", 730.0, 1090.0, 2440.0, 140.0);
const AO: Phoneme = vowel("AO", 570.0, 840.0, 2410.0, 150.0);
const UW: Phoneme = vowel("UW", 300.0, 870.0, 2240.0, 140.0);
const OW_OFF: Phoneme = vowel("OW^", 330.0, 900.0, 2300.0, 90.0);

// /r/ is identified almost entirely by its low F3.
const R: Phoneme = Phoneme {
    voice_gain: APPROXIMANT_VOICE_GAIN,
    ..vowel("R", 490.0, 1350.0, 1690.0, 85.0)
};
const W: Phoneme = Phoneme {
    voice_gain: APPROXIMANT_VOICE_GAIN,
    ..vowel("W", 300.0, 610.0, 2200.0, 70.0)
};

const N: Phoneme = nasal("N", 250.0, 1750.0, 2600.0, 90.0);

const S: Phoneme = fricative("S", 5800.0, 3200.0, 0.5, 130.0);
const F: Phoneme = fricative("F", 4200.0, 5000.0, 0.24, 120.0);
const TH: Phoneme = fricative("TH", 5200.0, 5600.0, 0.2, 110.0);
const Z: Phoneme = voiced_fricative("Z", 300.0, 1600.0, 2500.0, 5200.0, 3000.0, 0.3, 110.0);
const V: Phoneme = voiced_fricative("V", 320.0, 1100.0, 2400.0, 4000.0, 4600.0, 0.16, 95.0);

const T_CLOSURE: Phoneme = closure("T-", 45.0);
const T_BURST: Phoneme = burst("T+", 3800.0, 3400.0, 0.55);
const K_CLOSURE: Phoneme = closure("K-", 45.0);
const K_BURST: Phoneme = burst("K+", 2100.0, 2200.0, 0.5);

// Diphthongs are two segments; the synthesiser's formant glide joins them.
const AY_OFF: Phoneme = Phoneme {
    duration_ms: 110.0,
    ..IY
};
const EY_OFF: Phoneme = Phoneme {
    duration_ms: 105.0,
    ..IY
};

/// "zero", not "oh": a lone vowel with no consonant anchor is the first thing
/// lost to noise.
pub static DIGITS: [Utterance<'static>; 10] = [
    Utterance {
        answer: "0",
        phonemes: &[Z, IH, R, AO, OW_OFF],
    },
    Utterance {
        answer: "1",
        phonemes: &[W, AH, N],
    },
    Utterance {
        answer: "2",
        phonemes: &[T_CLOSURE, T_BURST, UW],
    },
    Utterance {
        answer: "3",
        phonemes: &[TH, R, IY],
    },
    Utterance {
        answer: "4",
        phonemes: &[F, AO, R],
    },
    Utterance {
        answer: "5",
        phonemes: &[F, AA, AY_OFF, V],
    },
    Utterance {
        answer: "6",
        phonemes: &[S, IH, K_CLOSURE, K_BURST, S],
    },
    Utterance {
        answer: "7",
        phonemes: &[S, EH, V, AH, N],
    },
    Utterance {
        answer: "8",
        phonemes: &[EH, EY_OFF, T_CLOSURE, T_BURST],
    },
    Utterance {
        answer: "9",
        phonemes: &[N, AA, AY_OFF, N],
    },
];

pub const ANSWER_ALPHABET: &str = "0123456789";
