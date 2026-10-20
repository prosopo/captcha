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

//! Cutting the notch out of the background and building the matching piece.

use crate::background::clamp_to_byte;
use crate::contrast::relative_luminance;
use crate::jsmath;
use crate::notch::{coverage_from_distance, NotchShape};
use crate::palette::Rgb;
use crate::prng::Prng;
use crate::types::{NotchPlacement, RgbaImage};

/// Per-pixel noise on the piece. Not decoration: an exact copy of the
/// background would let an attacker find the target by cross-correlation.
const PIECE_NOISE: f64 = 7.0;
const PIECE_BRIGHTNESS_RANGE: (f64, f64) = (-8.0, 8.0);

/// Disturbance ring outside the cut, in px, so an edge detector cannot lock
/// onto a clean discontinuity along the seam. Tapers to zero at its outer edge.
const SEAM_NOISE_RADIUS: i64 = 3;
/// Peak seam noise, close to the background grain so it does not read as a halo.
const SEAM_NOISE: f64 = 4.0;

const HOLE_INNER_SHADOW: f64 = 0.45;

/// Subtle brightness rise just inside the silhouette so the piece reads as raised.
const PIECE_EDGE_LIGHT: f64 = 8.0;

/// Rim band as a fraction of the piece size: a fixed pixel count is a tidy
/// outline on a large piece and most of the surface of a small one.
const PIECE_RIM_PLATEAU_RATIO: f64 = 0.03;
const PIECE_RIM_WIDTH_RATIO: f64 = 0.065;
const PIECE_RIM_MIN_PLATEAU: f64 = 1.0;
const PIECE_RIM_MIN_WIDTH: f64 = 2.2;

/// WCAG ratio the rim aims for against the piece body. A luminance step, not a
/// hue, so it survives greyscale and every dichromacy.
const PIECE_RIM_TARGET_CONTRAST: f64 = 1.5;

/// Past roughly this the rim reads as a stroke drawn around a sticker.
const PIECE_RIM_MAX_STEP: f64 = 72.0;

/// Above this relative luminance the piece gets a dark rim instead of a light one.
const PIECE_RIM_DIRECTION_THRESHOLD: f64 = 0.4;

/// Smallest rim step; anything less reads as no rim at all.
const PIECE_RIM_MIN_STEP: f64 = 24.0;

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct PieceRimGeometry {
    pub plateau: f64,
    pub width: f64,
}

/// Rim geometry for a piece of `size` px.
pub fn piece_rim_geometry(size: f64) -> PieceRimGeometry {
    let plateau = jsmath::max(PIECE_RIM_MIN_PLATEAU, size * PIECE_RIM_PLATEAU_RATIO);
    PieceRimGeometry {
        plateau,
        width: jsmath::max(
            jsmath::max(PIECE_RIM_MIN_WIDTH, size * PIECE_RIM_WIDTH_RATIO),
            plateau + 1.0,
        ),
    }
}

/// `None` outside the frame: the piece is clipped there, not edge-clamped.
fn sample_background(image: &RgbaImage, x: i64, y: i64) -> Option<[u8; 3]> {
    if x < 0 || y < 0 || x >= i64::from(image.width) || y >= i64::from(image.height) {
        return None;
    }
    let i = (y as usize * image.width as usize + x as usize) * 4;
    Some([image.data[i], image.data[i + 1], image.data[i + 2]])
}

/// 1 on the plateau, tapering linearly to 0 at the full width inside.
fn rim_profile(d: f64, plateau: f64, width: f64) -> f64 {
    if d <= -width {
        return 0.0;
    }
    if d >= -plateau {
        return 1.0;
    }
    (d + width) / (width - plateau)
}

fn byte_for_luminance(luminance: f64) -> f64 {
    255.0 * jsmath::pow(jsmath::max(0.0, jsmath::min(1.0, luminance)), 1.0 / 2.2)
}

/// Signed rim offset: steps away from the mean luminance of the pixels the
/// piece is cut from, sized to reach [`PIECE_RIM_TARGET_CONTRAST`].
fn piece_rim_delta(
    background: &RgbaImage,
    shape: &NotchShape,
    size: u32,
    left: i64,
    top: i64,
) -> f64 {
    let mut total = 0.0;
    let mut counted = 0u32;
    // Every fourth pixel on each axis settles a mean of a few thousand pixels,
    // and this runs per challenge on the request path.
    for ly in (0..size).step_by(4) {
        for lx in (0..size).step_by(4) {
            if coverage_from_distance(shape.distance(f64::from(lx), f64::from(ly))) <= 0.0 {
                continue;
            }
            let Some([r, g, b]) =
                sample_background(background, left + i64::from(lx), top + i64::from(ly))
            else {
                continue;
            };
            total += relative_luminance(&Rgb {
                r: f64::from(r),
                g: f64::from(g),
                b: f64::from(b),
            });
            counted += 1;
        }
    }
    if counted == 0 {
        return PIECE_RIM_MAX_STEP;
    }

    let piece_luminance = total / f64::from(counted);
    let lighten = piece_luminance <= PIECE_RIM_DIRECTION_THRESHOLD;
    // WCAG: ratio = (lighter + 0.05) / (darker + 0.05), solved for the other side.
    let target = if lighten {
        PIECE_RIM_TARGET_CONTRAST * (piece_luminance + 0.05) - 0.05
    } else {
        (piece_luminance + 0.05) / PIECE_RIM_TARGET_CONTRAST - 0.05
    };
    let delta = byte_for_luminance(target) - byte_for_luminance(piece_luminance);
    let capped = jsmath::max(-PIECE_RIM_MAX_STEP, jsmath::min(PIECE_RIM_MAX_STEP, delta));
    if capped.abs() < PIECE_RIM_MIN_STEP {
        return if lighten {
            PIECE_RIM_MIN_STEP
        } else {
            -PIECE_RIM_MIN_STEP
        };
    }
    capped
}

/// Cut the notch out of `background` (in place) and return the matching piece,
/// `size` x `size` on transparency.
pub fn cut_notch(
    prng: &mut Prng,
    background: &mut RgbaImage,
    shape: &NotchShape,
    size: u32,
    placement: &NotchPlacement,
    hole_darken: f64,
) -> RgbaImage {
    let half = f64::from(size) / 2.0;
    let left = jsmath::round(placement.target_x - half) as i64;
    let top = jsmath::round(placement.target_y - half) as i64;

    let side = size as usize;
    let mut piece = vec![0u8; side * side * 4];
    let brightness = prng.range(PIECE_BRIGHTNESS_RANGE.0, PIECE_BRIGHTNESS_RANGE.1);

    // Decided before any pixel is written, from the pixels the piece is made of.
    let rim_step = piece_rim_delta(background, shape, size, left, top);
    let rim = piece_rim_geometry(f64::from(size));

    for ly in 0..size {
        for lx in 0..size {
            let d = shape.distance(f64::from(lx), f64::from(ly));
            let coverage = coverage_from_distance(d);
            let pi = (ly as usize * side + lx as usize) * 4;
            if coverage <= 0.0 {
                continue;
            }
            // Off-frame overhang stays transparent rather than smearing the edge.
            let Some([r, g, b]) =
                sample_background(background, left + i64::from(lx), top + i64::from(ly))
            else {
                continue;
            };

            let edge_light = if d > -2.0 {
                PIECE_EDGE_LIGHT * (1.0 + d / 2.0)
            } else {
                0.0
            };
            let rim_delta = rim_step * rim_profile(d, rim.plateau, rim.width);
            let noise = (prng.next() - 0.5) * 2.0 * PIECE_NOISE;
            let delta = brightness + edge_light + rim_delta + noise;

            piece[pi] = clamp_to_byte(jsmath::round(f64::from(r) + delta));
            piece[pi + 1] = clamp_to_byte(jsmath::round(f64::from(g) + delta));
            piece[pi + 2] = clamp_to_byte(jsmath::round(f64::from(b) + delta));
            piece[pi + 3] = clamp_to_byte(jsmath::round(coverage * 255.0));
        }
    }

    let width = i64::from(background.width);
    let height = i64::from(background.height);
    let extent = i64::from(size) + SEAM_NOISE_RADIUS;
    for ly in -SEAM_NOISE_RADIUS..extent {
        for lx in -SEAM_NOISE_RADIUS..extent {
            let x = left + lx;
            let y = top + ly;
            if x < 0 || y < 0 || x >= width || y >= height {
                continue;
            }
            let bi = (y as usize * background.width as usize + x as usize) * 4;
            let d = shape.distance(lx as f64, ly as f64);
            let coverage = coverage_from_distance(d);

            if coverage > 0.0 {
                // Deeper near the edges, so the hole has an inner shadow rather
                // than reading as a flat grey patch.
                let edge = if d > -3.0 {
                    HOLE_INNER_SHADOW * (1.0 + d / 3.0)
                } else {
                    0.0
                };
                let factor = hole_darken * (1.0 - edge);
                for channel in &mut background.data[bi..bi + 3] {
                    let v = f64::from(*channel);
                    *channel =
                        clamp_to_byte(jsmath::round(v * (1.0 - coverage) + v * factor * coverage));
                }
            } else if d < SEAM_NOISE_RADIUS as f64 {
                let falloff = 1.0 - d / SEAM_NOISE_RADIUS as f64;
                let noise = (prng.next() - 0.5) * 2.0 * SEAM_NOISE * falloff;
                for channel in &mut background.data[bi..bi + 3] {
                    *channel = clamp_to_byte(jsmath::round(f64::from(*channel) + noise));
                }
            }
        }
    }

    // No baked drop shadow: the client applies one in CSS, and the two
    // together read as a border.
    RgbaImage {
        data: piece,
        width: size,
        height: size,
    }
}
