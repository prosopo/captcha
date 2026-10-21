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

use prosopo_puzzle_assets::{hsl_to_rgb, Prng, RgbaImage};
use resvg::{tiny_skia, usvg};

use crate::background::{collage_markup, r2};
use crate::glyphs::glyph_path;
use crate::jsmath::{self, to_js_string as num};
use crate::shuffle::shuffle;
use crate::types::{IconOrderGeometry, IconOrderRenderSettings, IconPlacement};
use crate::IconOrderAssetsError;

/// Glyph path data is authored in this box; see glyphs.rs.
const GLYPH_BOX: f64 = 100.0;

/// Width of the dark outline stroke relative to the bright one. Narrower and
/// icons vanish over light regions; wider and the halo becomes the strongest
/// edge in the frame, which is what a solver looks for.
const HALO_WIDTH_MULTIPLE: f64 = 2.4;

const HALO_COLOUR: &str = "rgb(12,14,22)";

const LEGEND_CHIP_COLOUR: &str = "rgb(24,27,38)";
const LEGEND_GAP: u32 = 6;
const LEGEND_GLYPH_INSET: f64 = 0.62;

/// Noise over the flat vector fills, so region boundaries are not perfectly
/// clean input for an edge detector.
const GRAIN_AMPLITUDE: f64 = 6.0;

fn stroke_colour(hue: f64) -> String {
    let colour = hsl_to_rgb(hue, 0.86, 0.64);
    format!(
        "rgb({},{},{})",
        num(colour.r),
        num(colour.g),
        num(colour.b)
    )
}

/// Converts a frame-pixel stroke width into glyph-box units, so line weight
/// does not vary with (and so leak) the icon's size.
fn stroke_units(width_px: f64, size: f64) -> f64 {
    (width_px * GLYPH_BOX) / size
}

fn glyph_markup(
    placement: &IconPlacement,
    settings: &IconOrderRenderSettings,
    rotation_override: Option<f64>,
) -> String {
    let scale = placement.size / GLYPH_BOX;
    let rotation = rotation_override.unwrap_or(placement.rotation);
    let inner = stroke_units(settings.stroke_width, placement.size);
    let halo = inner * HALO_WIDTH_MULTIPLE;
    let path = glyph_path(placement.kind);
    let offset = num(-GLYPH_BOX / 2.0);
    let transform = format!(
        "translate({} {}) rotate({}) scale({}) translate({offset} {offset})",
        r2(placement.x),
        r2(placement.y),
        r2(rotation),
        r2(scale),
    );
    format!(
        "<g transform=\"{transform}\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\">\
         <path d=\"{path}\" stroke=\"{HALO_COLOUR}\" stroke-opacity=\"{}\" stroke-width=\"{}\"/>\
         <path d=\"{path}\" stroke=\"{}\" stroke-opacity=\"{}\" stroke-width=\"{}\"/>\
         </g>",
        r2(settings.halo_opacity),
        r2(halo),
        stroke_colour(placement.hue),
        r2(settings.icon_opacity),
        r2(inner),
    )
}

fn svg_document(width: u32, height: u32, body: &str) -> String {
    format!(
        "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"{width}\" height=\"{height}\" viewBox=\"0 0 {width} {height}\">{body}</svg>"
    )
}

/// The SVG `compositeIcons` hands to sharp. Consumes the shuffle and collage
/// draws from `prng`, leaving it where the grain starts.
pub(crate) fn frame_svg(
    prng: &mut Prng,
    icons: &[IconPlacement],
    geometry: &IconOrderGeometry,
    settings: &IconOrderRenderSettings,
) -> String {
    let body: String = shuffle(prng, icons)
        .iter()
        .map(|placement| glyph_markup(placement, settings, None))
        .collect();
    // One document, so the icons antialias against the background they sit on.
    let collage = collage_markup(prng, geometry, settings.background_clutter);
    svg_document(geometry.width, geometry.height, &(collage + &body))
}

/// The SVG `renderLegend` hands to sharp, and its width.
pub(crate) fn legend_svg(
    targets: &[IconPlacement],
    legend_icon_size: u32,
    settings: &IconOrderRenderSettings,
) -> (String, u32) {
    let size = f64::from(legend_icon_size);
    let step = legend_icon_size + LEGEND_GAP;
    let width = match targets.len() as u32 {
        0 => legend_icon_size,
        count => legend_icon_size.max(count * step - LEGEND_GAP),
    };
    let radius = size / 2.0;
    let body: String = targets
        .iter()
        .enumerate()
        .map(|(index, target)| {
            let cx = index as f64 * f64::from(step) + radius;
            let chip = format!(
                "<circle cx=\"{}\" cy=\"{}\" r=\"{}\" fill=\"{LEGEND_CHIP_COLOUR}\"/>",
                r2(cx),
                r2(radius),
                r2(radius),
            );
            let glyph = glyph_markup(
                &IconPlacement {
                    x: cx,
                    y: radius,
                    size: size * LEGEND_GLYPH_INSET,
                    ..*target
                },
                settings,
                Some(0.0),
            );
            chip + &glyph
        })
        .collect();
    (svg_document(width, legend_icon_size, &body), width)
}

/// Draws an SVG document into straight RGBA. resvg stands in for sharp's
/// librsvg: geometry is the same, but antialiased edge pixels differ slightly.
pub(crate) fn rasterise(
    svg: &str,
    width: u32,
    height: u32,
) -> Result<RgbaImage, IconOrderAssetsError> {
    let tree = usvg::Tree::from_str(svg, &usvg::Options::default())
        .map_err(|error| IconOrderAssetsError::Rasterise(error.to_string()))?;
    let mut pixmap = tiny_skia::Pixmap::new(width, height).ok_or_else(|| {
        IconOrderAssetsError::Rasterise(format!("cannot allocate a {width}x{height} canvas"))
    })?;
    resvg::render(&tree, tiny_skia::Transform::identity(), &mut pixmap.as_mut());
    let data = pixmap
        .pixels()
        .iter()
        .flat_map(|pixel| {
            let colour = pixel.demultiply();
            [colour.red(), colour.green(), colour.blue(), colour.alpha()]
        })
        .collect();
    Ok(RgbaImage {
        data,
        width,
        height,
    })
}

pub(crate) fn add_grain(prng: &mut Prng, mut image: RgbaImage) -> RgbaImage {
    for pixel in image.data.as_chunks_mut::<4>().0 {
        let noise = jsmath::round((prng.next() - 0.5) * 2.0 * GRAIN_AMPLITUDE);
        for channel in &mut pixel[..3] {
            *channel = (f64::from(*channel) + noise).clamp(0.0, 255.0) as u8;
        }
    }
    image
}

/// Draw order is shuffled here because callers hold targets and decoys as
/// separate lists, and concatenating them would paint every target on top
/// wherever icons overlap — a tell that needs no shape recognition.
pub fn composite_icons(
    prng: &mut Prng,
    icons: &[IconPlacement],
    geometry: &IconOrderGeometry,
    settings: &IconOrderRenderSettings,
) -> Result<RgbaImage, IconOrderAssetsError> {
    let svg = frame_svg(prng, icons, geometry, settings);
    let image = rasterise(&svg, geometry.width, geometry.height)?;
    Ok(add_grain(prng, image))
}

/// Legend glyphs are drawn upright whatever their rotation on the frame, so a
/// template-matching solver is not handed a rotation-aligned crib. The hue is
/// kept: it helps a human and a solver already has it from the pixels.
pub fn render_legend(
    targets: &[IconPlacement],
    legend_icon_size: u32,
    settings: &IconOrderRenderSettings,
) -> Result<RgbaImage, IconOrderAssetsError> {
    let (svg, width) = legend_svg(targets, legend_icon_size, settings);
    rasterise(&svg, width, legend_icon_size)
}
