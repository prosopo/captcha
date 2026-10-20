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

//! Encoding. libwebp is driven directly rather than through libvips, so the
//! bytes differ from sharp's output while the pixels going in are identical
//! (MIGRATION.md §4.7).

use base64::Engine;
use webp::{Encoder, WebPConfig};

use crate::types::RgbaImage;
use crate::PuzzleAssetsError;

/// High on purpose: chroma subsampling and ringing around the cut are exactly
/// what an attacker could key on, and below 95 the ringing around the decoy
/// silhouettes is visible.
const BACKGROUND_QUALITY: f32 = 95.0;

/// sharp's `effort`, which it passes to libwebp as `method`.
const EFFORT: i32 = 4;

/// sharp's default `quality`, which libwebp reads as compression effort when
/// encoding losslessly.
const LOSSLESS_QUALITY: f32 = 80.0;

fn check_dimensions(image: &RgbaImage) -> Result<(), PuzzleAssetsError> {
    let expected = image.width as usize * image.height as usize * 4;
    if image.data.len() != expected {
        return Err(PuzzleAssetsError::Encode(format!(
            "expected {expected} bytes of RGBA for {}x{}, got {}",
            image.width,
            image.height,
            image.data.len()
        )));
    }
    Ok(())
}

fn encode_webp(
    image: &RgbaImage,
    lossless: bool,
    quality: f32,
) -> Result<Vec<u8>, PuzzleAssetsError> {
    check_dimensions(image)?;
    let mut config = WebPConfig::new()
        .map_err(|()| PuzzleAssetsError::Encode("libwebp config init failed".to_owned()))?;
    config.lossless = i32::from(lossless);
    config.quality = quality;
    config.method = EFFORT;
    config.alpha_quality = 100;
    // Keep RGB under alpha 0 so lossless really is lossless: the piece has
    // edge pixels whose coverage rounds to alpha 0 but still carry colour.
    config.exact = i32::from(lossless);
    Encoder::from_rgba(&image.data, image.width, image.height)
        .encode_advanced(&config)
        .map(|memory| memory.to_vec())
        .map_err(|error| PuzzleAssetsError::Encode(format!("{error:?}")))
}

/// Lossy WebP at q95.
pub fn encode_background(image: &RgbaImage) -> Result<Vec<u8>, PuzzleAssetsError> {
    encode_webp(image, false, BACKGROUND_QUALITY)
}

/// Lossless WebP: lossy ringing around the alpha edge reads as wavy edges even
/// at high quality, and lossless costs only a couple of KB on a small sprite.
pub fn encode_piece(image: &RgbaImage) -> Result<Vec<u8>, PuzzleAssetsError> {
    encode_webp(image, true, LOSSLESS_QUALITY)
}

/// PNG, for previews only.
pub fn encode_png(image: &RgbaImage) -> Result<Vec<u8>, PuzzleAssetsError> {
    check_dimensions(image)?;
    let mut out = Vec::new();
    let mut encoder = png::Encoder::new(&mut out, image.width, image.height);
    encoder.set_color(png::ColorType::Rgba);
    encoder.set_depth(png::BitDepth::Eight);
    let to_error = |error: png::EncodingError| PuzzleAssetsError::Encode(error.to_string());
    let mut writer = encoder.write_header().map_err(to_error)?;
    writer.write_image_data(&image.data).map_err(to_error)?;
    writer.finish().map_err(to_error)?;
    Ok(out)
}

pub fn to_data_uri(webp: &[u8]) -> String {
    format!(
        "data:image/webp;base64,{}",
        base64::engine::general_purpose::STANDARD.encode(webp)
    )
}
