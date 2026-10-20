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

//! Procedural imagery for the slider puzzle captcha: a seeded mesh-gradient
//! background, decoy silhouettes, and the notch cut that yields the piece.
//! Port of `@prosopo/puzzle-assets`; pixels are identical to the TS for the
//! same seeds and inputs.

mod background;
mod compose;
mod contrast;
mod decoys;
mod encode;
mod fdlibm;
mod jsmath;
mod notch;
mod palette;
mod prng;
mod types;

#[cfg(test)]
mod equivalence;
#[cfg(test)]
mod tests;

use std::fmt;

pub use background::generate_background;
pub use compose::{cut_notch, piece_rim_geometry, PieceRimGeometry};
pub use contrast::{
    best_pair_contrast, contrast_ratio, relative_luminance, simulate_vision, worst_case_contrast,
    VisionType, VISION_TYPES,
};
pub use decoys::{paint_decoy_piece, paint_decoys};
pub use encode::{encode_background, encode_piece, encode_png, to_data_uri};
pub use notch::{coverage_from_distance, create_notch_shape, NotchShape};
pub use palette::{draw_palette, hsl_to_rgb, Rgb, MIN_PALETTE_CONTRAST};
pub use prng::{create_prng, create_seed, Prng, SEED_BYTES};
pub use types::{
    NotchPlacement, PuzzleGeometry, PuzzleRenderSettings, RenderedPuzzle, RenderedPuzzleRgba,
    RgbaImage,
};

/// The errors the TS throws, plus encoder failures (sharp's in the TS).
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum PuzzleAssetsError {
    SeedTooShort { len: usize },
    EmptyPick,
    Encode(String),
}

impl fmt::Display for PuzzleAssetsError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            PuzzleAssetsError::SeedTooShort { len } => write!(
                f,
                "puzzle-assets: seed must be at least {SEED_BYTES} bytes, got {len}"
            ),
            PuzzleAssetsError::EmptyPick => {
                f.write_str("puzzle-assets: cannot pick from an empty list")
            }
            PuzzleAssetsError::Encode(message) => {
                write!(f, "puzzle-assets: encode failed: {message}")
            }
        }
    }
}

impl std::error::Error for PuzzleAssetsError {}

/// Matches the widget's container, so the generator and the provider agree on
/// geometry without restating it.
pub const DEFAULT_GEOMETRY: PuzzleGeometry = PuzzleGeometry {
    width: 300,
    height: 200,
    notch_size: 44,
    piece_size: None,
};

/// Defaults for the per-render tunables, overridable per client and per
/// traffic category.
pub const DEFAULT_RENDER_SETTINGS: PuzzleRenderSettings = PuzzleRenderSettings {
    decoy_count: 5.0,
    decoy_edge_darkness: 20.0,
    decoy_body_brightness: 4.0,
    hole_darken: 0.55,
    decoy_hole_darken: 0.7,
};

/// A fresh background. Single-use by contract: serving one background with two
/// notch positions lets an attacker diff the composites and read both targets.
pub fn create_background(
    geometry: &PuzzleGeometry,
    seed: &[u8],
) -> Result<RgbaImage, PuzzleAssetsError> {
    let mut prng = create_prng(seed)?;
    Ok(generate_background(
        &mut prng,
        geometry.width,
        geometry.height,
    ))
}

/// `renderPuzzleToRgba` in `browser.ts`: decoys, then the cut, without encoding.
/// `seed` defaults to a fresh one, which is returned for the captcha record.
pub fn render_puzzle_to_rgba(
    mut background: RgbaImage,
    placement: &NotchPlacement,
    geometry: &PuzzleGeometry,
    settings: &PuzzleRenderSettings,
    seed: Option<Vec<u8>>,
) -> Result<RenderedPuzzleRgba, PuzzleAssetsError> {
    let seed = seed.unwrap_or_else(create_seed);
    let mut prng = create_prng(&seed)?;
    let piece_size = geometry.piece_size.unwrap_or(geometry.notch_size);
    // Decoys first, at the real piece's size, so the real cut sits on top of
    // any overlap and scale does not give the target away.
    paint_decoys(
        &mut background,
        &mut prng,
        settings.decoy_count,
        piece_size,
        placement,
        settings.decoy_edge_darkness,
        settings.decoy_body_brightness,
        settings.decoy_hole_darken,
    );
    let shape = create_notch_shape(&mut prng, piece_size);
    let piece = cut_notch(
        &mut prng,
        &mut background,
        &shape,
        piece_size,
        placement,
        settings.hole_darken,
    );
    Ok(RenderedPuzzleRgba {
        background,
        piece,
        piece_size,
        seed,
    })
}

/// Cut a notch at `placement` and encode both halves. Consumes `background`.
pub fn render_puzzle(
    background: RgbaImage,
    placement: &NotchPlacement,
    geometry: &PuzzleGeometry,
    settings: &PuzzleRenderSettings,
    seed: Option<Vec<u8>>,
) -> Result<RenderedPuzzle, PuzzleAssetsError> {
    let rendered = render_puzzle_to_rgba(background, placement, geometry, settings, seed)?;
    Ok(RenderedPuzzle {
        background: encode_background(&rendered.background)?,
        piece: encode_piece(&rendered.piece)?,
        piece_size: rendered.piece_size,
        seed: rendered.seed,
    })
}

/// Generate, cut and encode in one call. Both seeds are needed to replay a
/// served challenge; each defaults to a fresh one.
pub fn create_puzzle(
    placement: &NotchPlacement,
    geometry: &PuzzleGeometry,
    settings: &PuzzleRenderSettings,
    background_seed: Option<Vec<u8>>,
    render_seed: Option<Vec<u8>>,
) -> Result<RenderedPuzzle, PuzzleAssetsError> {
    let background_seed = background_seed.unwrap_or_else(create_seed);
    let background = create_background(geometry, &background_seed)?;
    render_puzzle(background, placement, geometry, settings, render_seed)
}
