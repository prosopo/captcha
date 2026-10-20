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

//! Procedural mesh-gradient background, matching `background.ts` pixel for
//! pixel: same draw order, same f64 arithmetic in the same order.

use crate::jsmath;
use crate::palette::{draw_palette, Rgb};
use crate::prng::Prng;
use crate::types::RgbaImage;

struct MeshPoint {
    x: f64,
    y: f64,
    colour: Rgb,
    sigma: f64,
}

struct Blob {
    x: f64,
    y: f64,
    sigma: f64,
    colour: Rgb,
    alpha: f64,
}

/// Film grain, which doubles as a noise floor an edge detector has to clear to
/// find the notch boundary.
const GRAIN_AMPLITUDE: f64 = 5.0;

const VIGNETTE_STRENGTH: f64 = 0.16;

/// `clamp255` followed by the implicit `Uint8Array` store of an integral value.
pub(crate) fn clamp_to_byte(v: f64) -> u8 {
    if v < 0.0 {
        0
    } else if v > 255.0 {
        255
    } else {
        v as u8
    }
}

/// Gaussian-weighted blend of the control points; a local falloff, because
/// inverse-distance weighting collapses the frame to the palette mean.
fn mesh_colour_at(points: &[MeshPoint], x: f64, y: f64) -> Rgb {
    let mut w_sum = 0.0;
    let mut r = 0.0;
    let mut g = 0.0;
    let mut b = 0.0;
    for point in points {
        let dx = x - point.x;
        let dy = y - point.y;
        let w = jsmath::exp(-(dx * dx + dy * dy) / (2.0 * point.sigma * point.sigma));
        w_sum += w;
        r += point.colour.r * w;
        g += point.colour.g * w;
        b += point.colour.b * w;
    }
    // Every point can be far away near a corner; fall back to the nearest.
    if w_sum < 1e-6 {
        let mut best = &points[0];
        let mut best_d = f64::INFINITY;
        for point in points {
            let d = jsmath::pow(x - point.x, 2.0) + jsmath::pow(y - point.y, 2.0);
            if d < best_d {
                best_d = d;
                best = point;
            }
        }
        return best.colour;
    }
    Rgb {
        r: r / w_sum,
        g: g / w_sum,
        b: b / w_sum,
    }
}

/// Synthesise a background. Deterministic in `prng`.
pub fn generate_background(prng: &mut Prng, width: u32, height: u32) -> RgbaImage {
    let point_count = prng.int(4, 6) as usize;
    // Drawn to length: a prefix of a longer draw would cover only part of the
    // hue band and leave the mesh monotone.
    let palette = draw_palette(prng, point_count);
    let blob_palette = draw_palette(prng, 3);

    let w = f64::from(width);
    let h = f64::from(height);
    let min_dimension = jsmath::min(w, h);
    let mut points = Vec::with_capacity(point_count);
    for colour in palette {
        let x = prng.range(-0.15, 1.15) * w;
        let y = prng.range(-0.15, 1.15) * h;
        let sigma = prng.range(0.26, 0.48) * min_dimension;
        points.push(MeshPoint {
            x,
            y,
            colour,
            sigma,
        });
    }

    let blob_count = prng.int(2, 4) as usize;
    let mut blobs = Vec::with_capacity(blob_count);
    for i in 0..blob_count {
        let colour = blob_palette[i % blob_palette.len()];
        let x = prng.range(0.1, 0.9) * w;
        let y = prng.range(0.1, 0.9) * h;
        let sigma = prng.range(0.18, 0.38) * min_dimension;
        let alpha = prng.range(0.16, 0.32);
        blobs.push(Blob {
            x,
            y,
            sigma,
            colour,
            alpha,
        });
    }

    let (width_px, height_px) = (width as usize, height as usize);
    let mut data = vec![0u8; width_px * height_px * 4];
    let cx = w / 2.0;
    let cy = h / 2.0;
    let max_radius = (cx * cx + cy * cy).sqrt();

    for y in 0..height_px {
        let yf = y as f64;
        for x in 0..width_px {
            let xf = x as f64;
            let base = mesh_colour_at(&points, xf, yf);
            let mut r = base.r;
            let mut g = base.g;
            let mut b = base.b;

            for blob in &blobs {
                let dx = xf - blob.x;
                let dy = yf - blob.y;
                let a = blob.alpha
                    * jsmath::exp(-(dx * dx + dy * dy) / (2.0 * blob.sigma * blob.sigma));
                r += (blob.colour.r - r) * a;
                g += (blob.colour.g - g) * a;
                b += (blob.colour.b - b) * a;
            }

            let dxc = xf - cx;
            let dyc = yf - cy;
            let vignette =
                1.0 - VIGNETTE_STRENGTH * ((dxc * dxc + dyc * dyc) / (max_radius * max_radius));
            r *= vignette;
            g *= vignette;
            b *= vignette;

            let grain = (prng.next() - 0.5) * 2.0 * GRAIN_AMPLITUDE;

            let i = (y * width_px + x) * 4;
            data[i] = clamp_to_byte(jsmath::round(r + grain));
            data[i + 1] = clamp_to_byte(jsmath::round(g + grain));
            data[i + 2] = clamp_to_byte(jsmath::round(b + grain));
            data[i + 3] = 255;
        }
    }

    RgbaImage {
        data,
        width,
        height,
    }
}
