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

//! A hard-edged collage rather than a smooth gradient: on a gradient every icon
//! stroke is the strongest local edge, so an edge detector finds them all at
//! once.

use std::f64::consts::PI;

use prosopo_puzzle_assets::{hsl_to_rgb, Prng};

use crate::jsmath::{self, to_js_string as num};
use crate::types::IconOrderGeometry;

pub(crate) fn round(value: f64) -> f64 {
    jsmath::round(value * 100.0) / 100.0
}

/// `round`, formatted as the TS template literal prints it.
pub(crate) fn r2(value: f64) -> String {
    num(round(value))
}

pub(crate) fn rgb(hue: f64, saturation: f64, lightness: f64) -> String {
    let colour = hsl_to_rgb(hue, saturation, lightness);
    format!(
        "rgb({},{},{})",
        num(colour.r),
        num(colour.g),
        num(colour.b)
    )
}

/// Iterates `0..count` the way `for (let i = 0; i < count; i++)` does for a
/// non-integer or NaN `count`.
fn up_to(count: f64) -> impl Iterator<Item = usize> {
    (0..).take_while(move |i| (*i as f64) < count)
}

fn panels(prng: &mut Prng, geometry: &IconOrderGeometry, hues: &[f64], count: f64) -> Vec<String> {
    let width = f64::from(geometry.width);
    let height = f64::from(geometry.height);
    let mut out = Vec::new();
    for i in up_to(count) {
        let hue = hues[i % hues.len()];
        // Dark, near-white or mid bands, so the frame is not one uniform tone.
        let tone = prng.next();
        let (saturation, lightness) = if tone < 0.2 {
            ((0.3, 0.6), (0.12, 0.24))
        } else if tone < 0.35 {
            ((0.1, 0.3), (0.82, 0.93))
        } else {
            ((0.55, 0.9), (0.4, 0.65))
        };
        let s = prng.range(saturation.0, saturation.1);
        let l = prng.range(lightness.0, lightness.1);
        let fill = rgb(hue, s, l);
        let cx = prng.range(-0.1, 1.1) * width;
        let cy = prng.range(-0.1, 1.1) * height;
        match prng.int(0, 2) {
            0 => {
                // Oversized so it reads as a region boundary, not a floating rectangle.
                let w = prng.range(0.45, 1.1) * width;
                let h = prng.range(0.3, 0.8) * height;
                let rotation = prng.range(0.0, 180.0);
                out.push(format!(
                    "<rect x=\"{}\" y=\"{}\" width=\"{}\" height=\"{}\" fill=\"{fill}\" transform=\"rotate({} {} {})\"/>",
                    r2(cx - w / 2.0),
                    r2(cy - h / 2.0),
                    r2(w),
                    r2(h),
                    r2(rotation),
                    r2(cx),
                    r2(cy),
                ));
            }
            1 => {
                let r = prng.range(0.25, 0.6) * width;
                out.push(format!(
                    "<circle cx=\"{}\" cy=\"{}\" r=\"{}\" fill=\"{fill}\"/>",
                    r2(cx),
                    r2(cy),
                    r2(r),
                ));
            }
            _ => {
                // A wedge, which an arc detector confuses with the ring and arc glyphs.
                let r = prng.range(0.35, 0.8) * width;
                let a = prng.range(0.0, PI * 2.0);
                let x1 = cx + r * jsmath::cos(a);
                let y1 = cy + r * jsmath::sin(a);
                let x2 = cx + r * jsmath::cos(a + PI / 2.0);
                let y2 = cy + r * jsmath::sin(a + PI / 2.0);
                out.push(format!(
                    "<path d=\"M {} {} L {} {} A {} {} 0 0 1 {} {} Z\" fill=\"{fill}\"/>",
                    r2(cx),
                    r2(cy),
                    r2(x1),
                    r2(y1),
                    r2(r),
                    r2(r),
                    r2(x2),
                    r2(y2),
                ));
            }
        }
    }
    out
}

/// Concentric rings: many icon-sized closed curves from one element.
fn ripples(prng: &mut Prng, geometry: &IconOrderGeometry, hue: f64) -> Vec<String> {
    let cx = prng.range(0.0, 1.0) * f64::from(geometry.width);
    let cy = prng.range(0.0, 1.0) * f64::from(geometry.height);
    let rings = prng.int(5, 9);
    let gap = prng.range(9.0, 16.0);
    let s = prng.range(0.45, 0.8);
    let l = prng.range(0.4, 0.7);
    let stroke = rgb(hue, s, l);
    let width = prng.range(2.0, 5.0);
    (1..=rings)
        .map(|i| {
            format!(
                "<circle cx=\"{}\" cy=\"{}\" r=\"{}\" fill=\"none\" stroke=\"{stroke}\" stroke-width=\"{}\" stroke-opacity=\"0.85\"/>",
                r2(cx),
                r2(cy),
                r2(i as f64 * gap),
                r2(width),
            )
        })
        .collect()
}

/// Opaque near-black or near-white bars, for edges as strong as an icon stroke.
fn bars(prng: &mut Prng, geometry: &IconOrderGeometry, count: f64) -> Vec<String> {
    let width = f64::from(geometry.width);
    let height = f64::from(geometry.height);
    let diagonal = jsmath::hypot(width, height);
    let mut out = Vec::new();
    for _ in up_to(count) {
        let cx = prng.range(0.0, 1.0) * width;
        let cy = prng.range(0.0, 1.0) * height;
        let thickness = prng.range(7.0, 20.0);
        let fill = if prng.next() < 0.7 {
            "rgb(16,16,22)"
        } else {
            "rgb(240,236,225)"
        };
        let rotation = prng.range(0.0, 180.0);
        out.push(format!(
            "<rect x=\"{}\" y=\"{}\" width=\"{}\" height=\"{}\" fill=\"{fill}\" transform=\"rotate({} {} {})\"/>",
            r2(cx - diagonal),
            r2(cy - thickness / 2.0),
            r2(diagonal * 2.0),
            r2(thickness),
            r2(rotation),
            r2(cx),
            r2(cy),
        ));
    }
    out
}

pub fn collage_markup(prng: &mut Prng, geometry: &IconOrderGeometry, clutter: f64) -> String {
    // Complementary and triadic jumps rather than an analogous band, so
    // neighbouring regions contrast enough for icon strokes to hide against.
    let base_hue = prng.range(0.0, 360.0);
    let offsets = [
        (150.0, 210.0),
        (100.0, 140.0),
        (-40.0, 40.0),
        (220.0, 260.0),
    ];
    let mut hues = vec![base_hue];
    for (min, max) in offsets {
        hues.push(base_hue + prng.range(min, max));
    }
    for hue in &mut hues {
        *hue = ((*hue % 360.0) + 360.0) % 360.0;
    }

    let mut parts: Vec<String> = vec![format!(
        "<rect width=\"{}\" height=\"{}\" fill=\"{}\"/>",
        geometry.width,
        geometry.height,
        rgb(base_hue, 0.5, 0.4)
    )];
    parts.extend(panels(
        prng,
        geometry,
        &hues,
        jsmath::max(2.0, jsmath::round(clutter * 0.6)),
    ));

    let ripple_families = jsmath::max(1.0, jsmath::round(clutter * 0.25));
    for i in up_to(ripple_families) {
        let hue = hues[(i + 1) % hues.len()];
        parts.extend(ripples(prng, geometry, hue));
    }

    parts.extend(bars(
        prng,
        geometry,
        jsmath::max(1.0, jsmath::round(clutter * 0.3)),
    ));
    parts.concat()
}
