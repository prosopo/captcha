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

//! Analogous-hue palettes. The table, the draw order and the contrast retry all
//! feed the shared PRNG stream, so none of them may drift from `palette.ts`.

use crate::contrast::best_pair_contrast;
use crate::jsmath;
use crate::prng::Prng;

/// Channels in 0-255. Not necessarily integers: mesh colours are blends.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Rgb {
    pub r: f64,
    pub g: f64,
    pub b: f64,
}

struct PaletteSpec {
    hue: f64,
    spread: f64,
    saturation: (f64, f64),
    lightness: (f64, f64),
}

const fn spec(hue: f64, spread: f64, saturation: (f64, f64), lightness: (f64, f64)) -> PaletteSpec {
    PaletteSpec {
        hue,
        spread,
        saturation,
        lightness,
    }
}

const PALETTES: [PaletteSpec; 6] = [
    // dusk violet
    spec(268.0, 46.0, (0.55, 0.78), (0.4, 0.7)),
    // prosopo blue
    spec(212.0, 42.0, (0.58, 0.8), (0.4, 0.7)),
    // teal drift
    spec(178.0, 44.0, (0.5, 0.72), (0.38, 0.68)),
    // warm sand
    spec(32.0, 38.0, (0.58, 0.8), (0.45, 0.72)),
    // rose quartz
    spec(338.0, 40.0, (0.52, 0.74), (0.45, 0.72)),
    // moss
    spec(138.0, 42.0, (0.46, 0.66), (0.38, 0.66)),
];

fn hue_to_channel(p: f64, q: f64, t_raw: f64) -> f64 {
    let mut t = t_raw;
    if t < 0.0 {
        t += 1.0;
    }
    if t > 1.0 {
        t -= 1.0;
    }
    if t < 1.0 / 6.0 {
        return p + (q - p) * 6.0 * t;
    }
    if t < 1.0 / 2.0 {
        return q;
    }
    if t < 2.0 / 3.0 {
        return p + (q - p) * (2.0 / 3.0 - t) * 6.0;
    }
    p
}

/// `h` in degrees, `s` and `l` in [0, 1].
pub fn hsl_to_rgb(h: f64, s: f64, l: f64) -> Rgb {
    let h_norm = (((h % 360.0) + 360.0) % 360.0) / 360.0;
    if s == 0.0 {
        let v = jsmath::round(l * 255.0);
        return Rgb { r: v, g: v, b: v };
    }
    let q = if l < 0.5 {
        l * (1.0 + s)
    } else {
        l + s - l * s
    };
    let p = 2.0 * l - q;
    Rgb {
        r: jsmath::round(hue_to_channel(p, q, h_norm + 1.0 / 3.0) * 255.0),
        g: jsmath::round(hue_to_channel(p, q, h_norm) * 255.0),
        b: jsmath::round(hue_to_channel(p, q, h_norm - 1.0 / 3.0) * 255.0),
    }
}

/// The worst-case contrast ratio the palette's widest pair must reach, across
/// normal vision and all three dichromacies. A floor on the range a background
/// spans, not on every pair.
pub const MIN_PALETTE_CONTRAST: f64 = 1.6;

/// How many times to redraw before widening the lightness band instead.
const MAX_PALETTE_ATTEMPTS: u32 = 6;

fn draw_once(prng: &mut Prng, count: usize, spec: &PaletteSpec, lightness_boost: f64) -> Vec<Rgb> {
    let base_hue = spec.hue + prng.range(-20.0, 20.0);
    let direction = if prng.next() < 0.5 { -1.0 } else { 1.0 };
    let low = jsmath::max(0.08, spec.lightness.0 - lightness_boost);
    let high = jsmath::min(0.92, spec.lightness.1 + lightness_boost);
    let mut colours = Vec::with_capacity(count);
    for i in 0..count {
        let t = if count == 1 {
            0.5
        } else {
            i as f64 / (count - 1) as f64
        };
        let hue = base_hue + direction * (t - 0.5) * 2.0 * spec.spread + prng.range(-6.0, 6.0);
        let saturation = prng.range(spec.saturation.0, spec.saturation.1);
        // Alternate towards each end of the lightness range so adjacent fields
        // contrast instead of averaging out.
        let lower_pole = i % 2 == 0;
        let base = if lower_pole { low } else { high };
        let lightness = base + prng.range(-0.04, 0.04) * if lower_pole { 1.0 } else { -1.0 };
        colours.push(hsl_to_rgb(hue, saturation, lightness));
    }
    colours
}

/// Draw `count` harmonious colours, redrawing with a widening lightness band
/// until the palette clears [`MIN_PALETTE_CONTRAST`].
pub fn draw_palette(prng: &mut Prng, count: usize) -> Vec<Rgb> {
    let spec = prng
        .pick(&PALETTES)
        .expect("PALETTES is a non-empty constant");
    let mut last = draw_once(prng, count, spec, 0.0);
    for attempt in 1..=MAX_PALETTE_ATTEMPTS {
        if best_pair_contrast(&last) >= MIN_PALETTE_CONTRAST {
            return last;
        }
        last = draw_once(prng, count, spec, f64::from(attempt) * 0.07);
    }
    last
}
