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

//! Port of `contrast.ts`. Only the palette retry reads it, but the threshold
//! decides how many PRNG draws a palette consumes, so the arithmetic must
//! match the JS to the bit.

use crate::palette::{js_round, Rgb};

fn to_linear(channel: f64) -> f64 {
    let c = channel / 255.0;
    if c <= 0.040_45 {
        c / 12.92
    } else {
        ((c + 0.055) / 1.055).powf(2.4)
    }
}

fn from_linear(value: f64) -> f64 {
    let c = if value <= 0.003_130_8 {
        value * 12.92
    } else {
        1.055 * value.powf(1.0 / 2.4) - 0.055
    };
    js_round(c * 255.0).clamp(0.0, 255.0)
}

fn relative_luminance(colour: &Rgb) -> f64 {
    0.2126 * to_linear(colour.r) + 0.7152 * to_linear(colour.g) + 0.0722 * to_linear(colour.b)
}

fn contrast_ratio(a: &Rgb, b: &Rgb) -> f64 {
    let la = relative_luminance(a);
    let lb = relative_luminance(b);
    (la.max(lb) + 0.05) / (la.min(lb) + 0.05)
}

const DICHROMACY_MATRICES: [[f64; 9]; 3] = [
    // protanopia
    [
        0.152_86, 1.175_79, -0.328_65, 0.114_75, 0.854_26, 0.030_99, -0.003_86, -0.005_34, 1.009_2,
    ],
    // deuteranopia
    [
        0.367_7, 0.861_22, -0.228_92, 0.280_39, 0.672_01, 0.047_6, -0.011_8, 0.041_64, 0.970_16,
    ],
    // tritanopia
    [
        1.255_28, -0.076_57, -0.178_71, -0.078_33, 0.930_87, 0.147_46, 0.004_91, 0.221_4, 0.773_09,
    ],
];

fn simulate(colour: &Rgb, m: &[f64; 9]) -> Rgb {
    let r = to_linear(colour.r);
    let g = to_linear(colour.g);
    let b = to_linear(colour.b);
    Rgb {
        r: from_linear(m[0] * r + m[1] * g + m[2] * b),
        g: from_linear(m[3] * r + m[4] * g + m[5] * b),
        b: from_linear(m[6] * r + m[7] * g + m[8] * b),
    }
}

fn worst_case_contrast(a: &Rgb, b: &Rgb) -> f64 {
    DICHROMACY_MATRICES
        .iter()
        .map(|m| contrast_ratio(&simulate(a, m), &simulate(b, m)))
        .fold(contrast_ratio(a, b), f64::min)
}

pub fn best_pair_contrast(colours: &[Rgb]) -> f64 {
    let mut best = 1.0;
    for (i, a) in colours.iter().enumerate() {
        for b in &colours[i + 1..] {
            best = f64::max(best, worst_case_contrast(a, b));
        }
    }
    best
}

#[cfg(test)]
mod tests {
    use super::*;

    const BLACK: Rgb = Rgb {
        r: 0.0,
        g: 0.0,
        b: 0.0,
    };
    const WHITE: Rgb = Rgb {
        r: 255.0,
        g: 255.0,
        b: 255.0,
    };
    const RED: Rgb = Rgb {
        r: 200.0,
        g: 60.0,
        b: 40.0,
    };
    const GREEN: Rgb = Rgb {
        r: 90.0,
        g: 140.0,
        b: 40.0,
    };

    #[test]
    fn black_on_white_is_the_maximum_ratio() {
        assert!((contrast_ratio(&BLACK, &WHITE) - 21.0).abs() < 1e-9);
    }

    #[test]
    fn one_colour_has_no_contrast() {
        assert_eq!(best_pair_contrast(&[RED, RED, RED]), 1.0);
        assert_eq!(best_pair_contrast(&[RED]), 1.0);
    }

    #[test]
    fn worst_case_is_never_better_than_normal_vision() {
        assert!(worst_case_contrast(&RED, &GREEN) <= contrast_ratio(&RED, &GREEN));
    }

    #[test]
    fn best_pair_is_the_widest_pair() {
        assert!(
            (best_pair_contrast(&[RED, BLACK, WHITE]) - worst_case_contrast(&BLACK, &WHITE)).abs()
                < 1e-12
        );
    }
}
