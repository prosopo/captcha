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

//! Luminance arithmetic under normal vision and the three dichromacies. The
//! palette retry reads it, and the threshold decides how many PRNG draws a
//! palette consumes, so it must match the TS to the bit.

use crate::jsmath;
use crate::palette::Rgb;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum VisionType {
    Normal,
    Protanopia,
    Deuteranopia,
    Tritanopia,
}

impl VisionType {
    pub fn as_str(self) -> &'static str {
        match self {
            VisionType::Normal => "normal",
            VisionType::Protanopia => "protanopia",
            VisionType::Deuteranopia => "deuteranopia",
            VisionType::Tritanopia => "tritanopia",
        }
    }
}

pub const VISION_TYPES: [VisionType; 4] = [
    VisionType::Normal,
    VisionType::Protanopia,
    VisionType::Deuteranopia,
    VisionType::Tritanopia,
];

fn to_linear(channel: f64) -> f64 {
    let c = channel / 255.0;
    if c <= 0.040_45 {
        c / 12.92
    } else {
        jsmath::pow((c + 0.055) / 1.055, 2.4)
    }
}

fn from_linear(value: f64) -> f64 {
    let c = if value <= 0.003_130_8 {
        value * 12.92
    } else {
        1.055 * jsmath::pow(value, 1.0 / 2.4) - 0.055
    };
    jsmath::min(255.0, jsmath::max(0.0, jsmath::round(c * 255.0)))
}

/// WCAG relative luminance, in [0, 1], on linearised channels.
pub fn relative_luminance(colour: &Rgb) -> f64 {
    0.2126 * to_linear(colour.r) + 0.7152 * to_linear(colour.g) + 0.0722 * to_linear(colour.b)
}

/// WCAG contrast ratio, in [1, 21].
pub fn contrast_ratio(a: &Rgb, b: &Rgb) -> f64 {
    let la = relative_luminance(a);
    let lb = relative_luminance(b);
    let lighter = jsmath::max(la, lb);
    let darker = jsmath::min(la, lb);
    (lighter + 0.05) / (darker + 0.05)
}

/// Viénot–Brettel–Mollon projections, applied to linear light.
fn dichromacy_matrix(vision: VisionType) -> Option<[f64; 9]> {
    match vision {
        VisionType::Normal => None,
        VisionType::Protanopia => Some([
            0.152_86, 1.175_79, -0.328_65, 0.114_75, 0.854_26, 0.030_99, -0.003_86, -0.005_34,
            1.009_2,
        ]),
        VisionType::Deuteranopia => Some([
            0.367_7, 0.861_22, -0.228_92, 0.280_39, 0.672_01, 0.047_6, -0.011_8, 0.041_64, 0.970_16,
        ]),
        VisionType::Tritanopia => Some([
            1.255_28, -0.076_57, -0.178_71, -0.078_33, 0.930_87, 0.147_46, 0.004_91, 0.221_4,
            0.773_09,
        ]),
    }
}

/// What `colour` looks like to someone with `vision`; identity for normal.
pub fn simulate_vision(colour: &Rgb, vision: VisionType) -> Rgb {
    let Some(m) = dichromacy_matrix(vision) else {
        return *colour;
    };
    let r = to_linear(colour.r);
    let g = to_linear(colour.g);
    let b = to_linear(colour.b);
    Rgb {
        r: from_linear(m[0] * r + m[1] * g + m[2] * b),
        g: from_linear(m[3] * r + m[4] * g + m[5] * b),
        b: from_linear(m[6] * r + m[7] * g + m[8] * b),
    }
}

/// The lowest contrast ratio between `a` and `b` across every vision type.
pub fn worst_case_contrast(a: &Rgb, b: &Rgb) -> f64 {
    let mut worst = f64::INFINITY;
    for vision in VISION_TYPES {
        let ratio = contrast_ratio(&simulate_vision(a, vision), &simulate_vision(b, vision));
        if ratio < worst {
            worst = ratio;
        }
    }
    worst
}

/// The widest worst-case separation any pair in `colours` achieves.
pub fn best_pair_contrast(colours: &[Rgb]) -> f64 {
    let mut best = 1.0;
    for (i, a) in colours.iter().enumerate() {
        for b in &colours[i + 1..] {
            let ratio = worst_case_contrast(a, b);
            if ratio > best {
                best = ratio;
            }
        }
    }
    best
}
