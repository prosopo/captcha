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

//! Server-side imagery and grading for the ordered-icon captcha: a seeded
//! layout of distinct glyphs, an SVG collage background rasterised with resvg,
//! the legend strip, and click grading. Port of `@prosopo/icon-order-assets`;
//! layouts, SVG markup and grading are identical to the TS for the same seeds,
//! while rasterised pixels differ slightly from librsvg at antialiased edges.

mod background;
mod compose;
mod fdlibm;
mod glyphs;
mod jsmath;
mod place;
mod shuffle;
mod types;

#[cfg(test)]
mod equivalence;
#[cfg(test)]
mod tests;

use std::fmt;

use prosopo_puzzle_assets::{
    create_prng, create_seed, encode_background, encode_piece, PuzzleAssetsError,
};

pub use background::collage_markup;
pub use compose::{composite_icons, render_legend};
pub use glyphs::{glyph_path, GlyphKind, UnknownGlyphKind, GLYPH_KINDS};
pub use place::{place_icons, IconLayout};
pub use shuffle::shuffle;
pub use types::{
    Click, IconOrderGeometry, IconOrderRenderSettings, IconPlacement, IconTargetGeometry,
    RenderedIconOrder,
};

#[derive(Clone, Debug, PartialEq)]
pub enum IconOrderAssetsError {
    TooManyGlyphs {
        requested: usize,
        available: usize,
    },
    TargetUnplaceable {
        /// Zero-based; the message counts from one, as the TS does.
        index: usize,
        target_count: usize,
        geometry: IconOrderGeometry,
    },
    /// usvg rejected the markup or the canvas could not be allocated (sharp's
    /// errors in the TS).
    Rasterise(String),
    Puzzle(PuzzleAssetsError),
}

impl fmt::Display for IconOrderAssetsError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            IconOrderAssetsError::TooManyGlyphs {
                requested,
                available,
            } => write!(
                f,
                "icon-order-assets: asked for {requested} distinct glyphs but only {available} exist"
            ),
            IconOrderAssetsError::TargetUnplaceable {
                index,
                target_count,
                geometry,
            } => write!(
                f,
                "icon-order-assets: could not place target icon {} of {target_count} in a {}x{} frame at size {}",
                index + 1,
                geometry.width,
                geometry.height,
                jsmath::to_js_string(geometry.icon_size)
            ),
            IconOrderAssetsError::Rasterise(message) => {
                write!(f, "icon-order-assets: rasterise failed: {message}")
            }
            IconOrderAssetsError::Puzzle(error) => error.fmt(f),
        }
    }
}

impl std::error::Error for IconOrderAssetsError {}

impl From<PuzzleAssetsError> for IconOrderAssetsError {
    fn from(error: PuzzleAssetsError) -> Self {
        IconOrderAssetsError::Puzzle(error)
    }
}

/// Matches the widget's frame; stored targets and graded clicks use these pixels.
pub const DEFAULT_GEOMETRY: IconOrderGeometry = IconOrderGeometry {
    width: 300,
    height: 200,
    icon_size: 38.0,
};

/// `target_count` and `decoy_count` must match the defaults in @prosopo/types.
pub const DEFAULT_RENDER_SETTINGS: IconOrderRenderSettings = IconOrderRenderSettings {
    target_count: 3,
    decoy_count: 4,
    stroke_width: 3.0,
    icon_opacity: 0.92,
    halo_opacity: 0.7,
    background_clutter: 8.0,
};

/// Fixed because the widget lays the legend out against its own header.
pub const LEGEND_ICON_SIZE: u32 = 26;

/// The background is drawn fresh per call and never reused: two layouts on the
/// same background could be diffed to read both answers. The returned
/// `targets` are the answer and must never be serialised into a response.
/// `seed` defaults to a fresh one (the TS always draws a fresh one).
pub fn render_icon_order(
    geometry: &IconOrderGeometry,
    settings: &IconOrderRenderSettings,
    seed: Option<Vec<u8>>,
) -> Result<RenderedIconOrder, IconOrderAssetsError> {
    let seed = seed.unwrap_or_else(create_seed);
    let mut prng = create_prng(&seed)?;
    let IconLayout { targets, decoys } = place_icons(
        &mut prng,
        geometry,
        settings.target_count,
        settings.decoy_count,
    )?;
    let icons: Vec<IconPlacement> = targets.iter().chain(&decoys).copied().collect();
    let composited = composite_icons(&mut prng, &icons, geometry, settings)?;
    let legend = render_legend(&targets, LEGEND_ICON_SIZE, settings)?;

    Ok(RenderedIconOrder {
        background: encode_background(&composited)?,
        legend: encode_piece(&legend)?,
        legend_icon_size: LEGEND_ICON_SIZE,
        targets,
        seed,
    })
}

/// Click i must land on target i, within `tolerance` times that icon's size.
pub fn grade_clicks(targets: &[IconTargetGeometry], clicks: &[Click], tolerance: f64) -> bool {
    if clicks.len() != targets.len() {
        return false;
    }
    targets.iter().zip(clicks).all(|(target, click)| {
        jsmath::hypot(click.x - target.x, click.y - target.y) <= tolerance * target.size
    })
}
