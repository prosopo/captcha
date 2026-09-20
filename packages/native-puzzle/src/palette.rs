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

//! Port of `palette.ts`. The palette table and the draw order are the parts
//! that must not drift: both feed the shared PRNG stream.

use crate::prng::Prng;

#[derive(Clone, Copy)]
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

const PALETTES: [PaletteSpec; 6] = [
    // dusk violet
    PaletteSpec { hue: 268.0, spread: 46.0, saturation: (0.55, 0.78), lightness: (0.4, 0.7) },
    // prosopo blue
    PaletteSpec { hue: 212.0, spread: 42.0, saturation: (0.58, 0.8), lightness: (0.4, 0.7) },
    // teal drift
    PaletteSpec { hue: 178.0, spread: 44.0, saturation: (0.5, 0.72), lightness: (0.38, 0.68) },
    // warm sand
    PaletteSpec { hue: 32.0, spread: 38.0, saturation: (0.58, 0.8), lightness: (0.45, 0.72) },
    // rose quartz
    PaletteSpec { hue: 338.0, spread: 40.0, saturation: (0.52, 0.74), lightness: (0.45, 0.72) },
    // moss
    PaletteSpec { hue: 138.0, spread: 42.0, saturation: (0.46, 0.66), lightness: (0.38, 0.66) },
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
fn hsl_to_rgb(h: f64, s: f64, l: f64) -> Rgb {
    let h_norm = (((h % 360.0) + 360.0) % 360.0) / 360.0;
    if s == 0.0 {
        let v = js_round(l * 255.0);
        return Rgb { r: v, g: v, b: v };
    }
    let q = if l < 0.5 { l * (1.0 + s) } else { l + s - l * s };
    let p = 2.0 * l - q;
    Rgb {
        r: js_round(hue_to_channel(p, q, h_norm + 1.0 / 3.0) * 255.0),
        g: js_round(hue_to_channel(p, q, h_norm) * 255.0),
        b: js_round(hue_to_channel(p, q, h_norm - 1.0 / 3.0) * 255.0),
    }
}

/// `Math.round` rounds a tie towards +Infinity; Rust's `f64::round` rounds it
/// away from zero. The two disagree only on exact negative halves, which the
/// channel maths here cannot produce — but the rest of the port reuses this,
/// and there a negative tie is reachable.
pub fn js_round(v: f64) -> f64 {
    (v + 0.5).floor()
}

/// Port of `drawPalette`. Consumes, per colour: hue jitter, saturation,
/// lightness — plus the palette pick, base-hue jitter and direction draw up
/// front.
pub fn draw_palette(prng: &mut Prng, count: usize) -> Vec<Rgb> {
    let spec = &PALETTES[prng.pick_index(PALETTES.len())];
    let base_hue = spec.hue + prng.range(-20.0, 20.0);
    let direction: f64 = if prng.next() < 0.5 { -1.0 } else { 1.0 };
    let mut colours = Vec::with_capacity(count);
    for i in 0..count {
        let t = if count == 1 {
            0.5
        } else {
            i as f64 / (count - 1) as f64
        };
        let hue = base_hue + direction * (t - 0.5) * 2.0 * spec.spread + prng.range(-6.0, 6.0);
        let saturation = prng.range(spec.saturation.0, spec.saturation.1);
        let pole = i % 2 != 0;
        let (centre, sign) = if pole {
            (spec.lightness.1, -1.0)
        } else {
            (spec.lightness.0, 1.0)
        };
        let lightness = centre + prng.range(-0.04, 0.04) * sign;
        colours.push(hsl_to_rgb(hue, saturation, lightness));
    }
    colours
}
