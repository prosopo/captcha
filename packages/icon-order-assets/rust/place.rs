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

use prosopo_puzzle_assets::Prng;

use crate::glyphs::{GlyphKind, GLYPH_KINDS};
use crate::jsmath;
use crate::shuffle::shuffle;
use crate::types::{IconOrderGeometry, IconPlacement};
use crate::IconOrderAssetsError;

/// Minimum centre-to-centre distance, as a multiple of the larger icon's size,
/// so a click cannot land on two icons at once.
const MIN_SEPARATION: f64 = 1.15;

/// Keep whole icons inside the frame; a clipped glyph is unidentifiable.
const EDGE_MARGIN: f64 = 0.55;

const MAX_ATTEMPTS_PER_ICON: usize = 60;

const SIZE_JITTER: (f64, f64) = (0.85, 1.15);

#[derive(Clone, Debug, PartialEq)]
pub struct IconLayout {
    /// The icons the user must click, in the order the legend will show.
    pub targets: Vec<IconPlacement>,
    /// Distractors: on the frame, absent from the legend.
    pub decoys: Vec<IconPlacement>,
}

fn far_enough(x: f64, y: f64, size: f64, placed: &[IconPlacement]) -> bool {
    placed.iter().all(|other| {
        let need = MIN_SEPARATION * jsmath::max(size, other.size);
        jsmath::hypot(x - other.x, y - other.y) >= need
    })
}

/// The legend identifies a target by its shape, so every icon on the frame,
/// target or decoy, must be a distinct glyph; hence one deck for both.
fn draw_kinds(prng: &mut Prng, count: usize) -> Result<Vec<GlyphKind>, IconOrderAssetsError> {
    if count > GLYPH_KINDS.len() {
        return Err(IconOrderAssetsError::TooManyGlyphs {
            requested: count,
            available: GLYPH_KINDS.len(),
        });
    }
    let mut kinds = shuffle(prng, &GLYPH_KINDS);
    kinds.truncate(count);
    Ok(kinds)
}

fn try_place(
    prng: &mut Prng,
    geometry: &IconOrderGeometry,
    kind: GlyphKind,
    placed: &[IconPlacement],
) -> Option<IconPlacement> {
    let size = geometry.icon_size * prng.range(SIZE_JITTER.0, SIZE_JITTER.1);
    let margin = size * EDGE_MARGIN;
    for _ in 0..MAX_ATTEMPTS_PER_ICON {
        let x = prng.range(margin, f64::from(geometry.width) - margin);
        let y = prng.range(margin, f64::from(geometry.height) - margin);
        if !far_enough(x, y, size, placed) {
            continue;
        }
        return Some(IconPlacement {
            x,
            y,
            kind,
            rotation: prng.range(0.0, 360.0),
            hue: prng.range(0.0, 360.0),
            size,
        });
    }
    None
}

/// Targets are mandatory, since a frame missing one is unsolvable, so failing
/// to place one is an error. Decoys are best-effort and are dropped when the
/// frame is too crowded.
pub fn place_icons(
    prng: &mut Prng,
    geometry: &IconOrderGeometry,
    target_count: usize,
    decoy_count: usize,
) -> Result<IconLayout, IconOrderAssetsError> {
    let kinds = draw_kinds(prng, target_count + decoy_count)?;
    let mut placed: Vec<IconPlacement> = Vec::with_capacity(kinds.len());
    let mut targets: Vec<IconPlacement> = Vec::with_capacity(target_count);
    let mut decoys: Vec<IconPlacement> = Vec::with_capacity(decoy_count);

    for (index, kind) in kinds.into_iter().enumerate() {
        let is_target = index < target_count;
        let Some(placement) = try_place(prng, geometry, kind, &placed) else {
            if is_target {
                return Err(IconOrderAssetsError::TargetUnplaceable {
                    index,
                    target_count,
                    geometry: *geometry,
                });
            }
            continue;
        };
        placed.push(placement);
        if is_target {
            targets.push(placement);
        } else {
            decoys.push(placement);
        }
    }

    Ok(IconLayout { targets, decoys })
}
