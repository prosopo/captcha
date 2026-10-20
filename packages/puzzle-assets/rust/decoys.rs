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

//! Decoys: shallow indented jigsaw silhouettes scattered over the background so
//! a solver looking for "a jigsaw-shaped region" has many candidates. Edge and
//! body amplitudes come from [`PuzzleRenderSettings`](crate::PuzzleRenderSettings)
//! so operators can tune the confusion level per client.

use crate::background::clamp_to_byte;
use crate::jsmath;
use crate::notch::{coverage_from_distance, create_notch_shape};
use crate::prng::Prng;
use crate::types::{NotchPlacement, RgbaImage};

/// Minimum centre-to-centre distance from the real notch, in notch sizes. Zero:
/// the cut runs after decoy paint, so the real hole still wins visually.
const NOTCH_CLEARANCE: f64 = 0.0;

/// Placement retries per decoy before giving up on that slot.
const PLACEMENT_ATTEMPTS: u32 = 8;

/// Mirrors `HOLE_INNER_SHADOW` in `compose.rs`, smaller so decoys read as
/// shallower cuts than the real hole.
const DECOY_INNER_SHADOW: f64 = 0.35;

/// ±30% around the configured count, so a solver cannot key on "exactly N
/// jigsaw regions".
const COUNT_JITTER: f64 = 0.3;

/// Composite one decoy centred on `(cx, cy)`, clipped at the frame edge.
#[allow(clippy::too_many_arguments)]
pub fn paint_decoy_piece(
    background: &mut RgbaImage,
    prng: &mut Prng,
    size: u32,
    cx: f64,
    cy: f64,
    edge_darkness: f64,
    body_brightness: f64,
    hole_darken: f64,
) {
    let shape = create_notch_shape(prng, size);
    let half = f64::from(size) / 2.0;
    let left = jsmath::round(cx - half);
    let top = jsmath::round(cy - half);
    let width = f64::from(background.width);
    let height = f64::from(background.height);

    for ly in 0..size {
        for lx in 0..size {
            let (lxf, lyf) = (f64::from(lx), f64::from(ly));
            let x = left + lxf;
            let y = top + lyf;
            if x < 0.0 || y < 0.0 || x >= width || y >= height {
                continue;
            }
            let d = shape.distance(lxf, lyf);
            let coverage = coverage_from_distance(d);
            if coverage <= 0.0 {
                continue;
            }

            let bi = (y as usize * background.width as usize + x as usize) * 4;
            let r = f64::from(background.data[bi]);
            let g = f64::from(background.data[bi + 1]);
            let b = f64::from(background.data[bi + 2]);

            // Multiplicative darken with an inner shadow, matching the real
            // cut, so the real hole is not the only deep region on the frame.
            let edge = if d > -3.0 {
                DECOY_INNER_SHADOW * (1.0 + d / 3.0)
            } else {
                0.0
            };
            let factor = hole_darken * (1.0 - edge);
            let dr = r * factor;
            let dg = g * factor;
            let db = b * factor;

            let edge_dark = if d > -3.0 {
                edge_darkness * (1.0 + d / 3.0)
            } else {
                0.0
            };
            let delta = body_brightness - edge_dark;

            let mix_r = r * (1.0 - coverage) + dr * coverage;
            let mix_g = g * (1.0 - coverage) + dg * coverage;
            let mix_b = b * (1.0 - coverage) + db * coverage;

            background.data[bi] = clamp_to_byte(jsmath::round(mix_r + delta * coverage));
            background.data[bi + 1] = clamp_to_byte(jsmath::round(mix_g + delta * coverage));
            background.data[bi + 2] = clamp_to_byte(jsmath::round(mix_b + delta * coverage));
        }
    }
}

/// Paint roughly `target_count` decoys anywhere on the frame. A slot that
/// cannot be placed within [`PLACEMENT_ATTEMPTS`] is silently dropped.
#[allow(clippy::too_many_arguments)]
pub fn paint_decoys(
    background: &mut RgbaImage,
    prng: &mut Prng,
    target_count: f64,
    notch_size: u32,
    notch: &NotchPlacement,
    edge_darkness: f64,
    body_brightness: f64,
    hole_darken: f64,
) {
    if target_count <= 0.0 {
        return;
    }

    let jitter = 1.0 + prng.range(-COUNT_JITTER, COUNT_JITTER);
    let count = jsmath::max(0.0, jsmath::round(target_count * jitter));
    if count == 0.0 {
        return;
    }

    let notch_clearance_sq = jsmath::pow(f64::from(notch_size) * NOTCH_CLEARANCE, 2.0);
    // Centres may sit anywhere on the frame; overhang is clipped by
    // `paint_decoy_piece`, matching the real piece.
    let max_x = f64::from(background.width);
    let max_y = f64::from(background.height);

    let mut i = 0.0;
    while i < count {
        for _ in 0..PLACEMENT_ATTEMPTS {
            let cx = prng.range(0.0, max_x);
            let cy = prng.range(0.0, max_y);
            let dx = cx - notch.target_x;
            let dy = cy - notch.target_y;
            if dx * dx + dy * dy < notch_clearance_sq {
                continue;
            }
            paint_decoy_piece(
                background,
                prng,
                notch_size,
                cx,
                cy,
                edge_darkness,
                body_brightness,
                hole_darken,
            );
            break;
        }
        i += 1.0;
    }
}
