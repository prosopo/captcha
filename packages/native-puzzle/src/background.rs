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

//! Port of `background.ts`. Arithmetic is kept in the same order and the same
//! f64 precision as the TypeScript so the two agree pixel for pixel on a
//! shared seed — the property the differential test rests on.

use crate::palette::{draw_palette, js_round, Rgb};
use crate::prng::Prng;

const GRAIN_AMPLITUDE: f64 = 5.0;
const VIGNETTE_STRENGTH: f64 = 0.16;

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

fn clamp255(v: f64) -> u8 {
    if v < 0.0 {
        0
    } else if v > 255.0 {
        255
    } else {
        v as u8
    }
}

fn mesh_colour_at(points: &[MeshPoint], x: f64, y: f64) -> Rgb {
    let mut w_sum = 0.0;
    let mut r = 0.0;
    let mut g = 0.0;
    let mut b = 0.0;
    for point in points {
        let dx = x - point.x;
        let dy = y - point.y;
        let w = (-(dx * dx + dy * dy) / (2.0 * point.sigma * point.sigma)).exp();
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
            let d = (x - point.x).powi(2) + (y - point.y).powi(2);
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

pub fn generate_background(prng: &mut Prng, width: usize, height: usize) -> Vec<u8> {
    let point_count = prng.int(4, 6) as usize;
    let palette = draw_palette(prng, point_count);
    let blob_palette = draw_palette(prng, 3);

    let min_dimension = width.min(height) as f64;
    let mut points = Vec::with_capacity(point_count);
    for colour in palette.iter().take(point_count) {
        let x = prng.range(-0.15, 1.15) * width as f64;
        let y = prng.range(-0.15, 1.15) * height as f64;
        let sigma = prng.range(0.26, 0.48) * min_dimension;
        points.push(MeshPoint {
            x,
            y,
            colour: *colour,
            sigma,
        });
    }

    let blob_count = prng.int(2, 4) as usize;
    let mut blobs = Vec::with_capacity(blob_count);
    for i in 0..blob_count {
        let colour = blob_palette[i % blob_palette.len()];
        let x = prng.range(0.1, 0.9) * width as f64;
        let y = prng.range(0.1, 0.9) * height as f64;
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

    let mut data = vec![0u8; width * height * 4];
    let cx = width as f64 / 2.0;
    let cy = height as f64 / 2.0;
    let max_radius = (cx * cx + cy * cy).sqrt();

    for y in 0..height {
        let yf = y as f64;
        for x in 0..width {
            let xf = x as f64;
            let base = mesh_colour_at(&points, xf, yf);
            let mut r = base.r;
            let mut g = base.g;
            let mut b = base.b;

            for blob in &blobs {
                let dx = xf - blob.x;
                let dy = yf - blob.y;
                let a = blob.alpha
                    * (-(dx * dx + dy * dy) / (2.0 * blob.sigma * blob.sigma)).exp();
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

            let i = (y * width + x) * 4;
            data[i] = clamp255(js_round(r + grain));
            data[i + 1] = clamp255(js_round(g + grain));
            data[i + 2] = clamp255(js_round(b + grain));
            data[i + 3] = 255;
        }
    }

    data
}

/// Separable variant of the same picture.
///
/// `exp(-(dx²+dy²)/2σ²)` factorises into `exp(-dx²/2σ²) · exp(-dy²/2σ²)`, so
/// each field needs `width + height` exponentials rather than one per pixel —
/// about 4.5k calls instead of 500k at the default geometry.
///
/// Not bit-identical to the JS: `exp(a+b)` and `exp(a)·exp(b)` differ in the
/// last place or two. The visible delta is measured in the benchmark.
pub fn generate_background_separable(prng: &mut Prng, width: usize, height: usize) -> Vec<u8> {
    let point_count = prng.int(4, 6) as usize;
    let palette = draw_palette(prng, point_count);
    let blob_palette = draw_palette(prng, 3);

    let min_dimension = width.min(height) as f64;
    let mut points = Vec::with_capacity(point_count);
    for colour in palette.iter().take(point_count) {
        let x = prng.range(-0.15, 1.15) * width as f64;
        let y = prng.range(-0.15, 1.15) * height as f64;
        let sigma = prng.range(0.26, 0.48) * min_dimension;
        points.push(MeshPoint { x, y, colour: *colour, sigma });
    }

    let blob_count = prng.int(2, 4) as usize;
    let mut blobs = Vec::with_capacity(blob_count);
    for i in 0..blob_count {
        let colour = blob_palette[i % blob_palette.len()];
        let x = prng.range(0.1, 0.9) * width as f64;
        let y = prng.range(0.1, 0.9) * height as f64;
        let sigma = prng.range(0.18, 0.38) * min_dimension;
        let alpha = prng.range(0.16, 0.32);
        blobs.push(Blob { x, y, sigma, colour, alpha });
    }

    // axis[field][coord] = exp(-(coord - centre)² / 2σ²)
    let axis = |centres: &[(f64, f64)], n: usize| -> Vec<Vec<f64>> {
        centres
            .iter()
            .map(|(centre, sigma)| {
                let denom = 2.0 * sigma * sigma;
                (0..n)
                    .map(|c| {
                        let d = c as f64 - centre;
                        (-(d * d) / denom).exp()
                    })
                    .collect()
            })
            .collect()
    };

    let point_xy: Vec<(f64, f64)> = points.iter().map(|p| (p.x, p.sigma)).collect();
    let point_yx: Vec<(f64, f64)> = points.iter().map(|p| (p.y, p.sigma)).collect();
    let blob_xy: Vec<(f64, f64)> = blobs.iter().map(|b| (b.x, b.sigma)).collect();
    let blob_yx: Vec<(f64, f64)> = blobs.iter().map(|b| (b.y, b.sigma)).collect();
    let px = axis(&point_xy, width);
    let py = axis(&point_yx, height);
    let bx = axis(&blob_xy, width);
    let by = axis(&blob_yx, height);

    let mut data = vec![0u8; width * height * 4];
    let cx = width as f64 / 2.0;
    let cy = height as f64 / 2.0;
    let max_radius = (cx * cx + cy * cy).sqrt();

    for y in 0..height {
        let yf = y as f64;
        for x in 0..width {
            let xf = x as f64;

            let mut w_sum = 0.0;
            let mut r = 0.0;
            let mut g = 0.0;
            let mut b = 0.0;
            for (k, point) in points.iter().enumerate() {
                let w = px[k][x] * py[k][y];
                w_sum += w;
                r += point.colour.r * w;
                g += point.colour.g * w;
                b += point.colour.b * w;
            }
            if w_sum < 1e-6 {
                let mut best = &points[0];
                let mut best_d = f64::INFINITY;
                for point in &points {
                    let d = (xf - point.x).powi(2) + (yf - point.y).powi(2);
                    if d < best_d {
                        best_d = d;
                        best = point;
                    }
                }
                r = best.colour.r;
                g = best.colour.g;
                b = best.colour.b;
            } else {
                r /= w_sum;
                g /= w_sum;
                b /= w_sum;
            }

            for (k, blob) in blobs.iter().enumerate() {
                let a = blob.alpha * (bx[k][x] * by[k][y]);
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

            let i = (y * width + x) * 4;
            data[i] = clamp255(js_round(r + grain));
            data[i + 1] = clamp255(js_round(g + grain));
            data[i + 2] = clamp255(js_round(b + grain));
            data[i + 3] = 255;
        }
    }

    data
}
