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

#[macro_use]
extern crate napi_derive;

mod background;
mod palette;
mod prng;

use napi::bindgen_prelude::{Buffer, Error, Result, Status};

/// Synthesise a puzzle background, byte-identical to `generateBackground`
/// from @prosopo/puzzle-assets for the same seed.
///
/// Returns straight (non-premultiplied) RGBA, row-major, 4 bytes per pixel —
/// the `RgbaImage.data` layout the caller hands to sharp.
#[napi(js_name = "generateBackground")]
pub fn generate_background(seed: Buffer, width: u32, height: u32) -> Result<Buffer> {
    let seed: &[u8] = seed.as_ref();
    if seed.len() < prng::SEED_BYTES {
        return Err(Error::new(
            Status::InvalidArg,
            format!(
                "native-puzzle: seed must be at least {} bytes, got {}",
                prng::SEED_BYTES,
                seed.len()
            ),
        ));
    }
    if width == 0 || height == 0 {
        return Err(Error::new(
            Status::InvalidArg,
            "native-puzzle: width and height must be non-zero".to_owned(),
        ));
    }

    let mut prng = prng::Prng::new(seed);
    let data = background::generate_background(&mut prng, width as usize, height as usize);
    Ok(data.into())
}

/// As `generateBackground`, but evaluating each Gaussian field as a product of
/// its two axes. Same picture, a fraction of the exponentials — and not
/// bit-identical to the JS, so it trades the exact differential test for
/// speed. Exported to be measured, not yet to be shipped.
#[napi(js_name = "generateBackgroundSeparable")]
pub fn generate_background_separable(seed: Buffer, width: u32, height: u32) -> Result<Buffer> {
    let seed: &[u8] = seed.as_ref();
    if seed.len() < prng::SEED_BYTES {
        return Err(Error::new(
            Status::InvalidArg,
            format!(
                "native-puzzle: seed must be at least {} bytes, got {}",
                prng::SEED_BYTES,
                seed.len()
            ),
        ));
    }
    if width == 0 || height == 0 {
        return Err(Error::new(
            Status::InvalidArg,
            "native-puzzle: width and height must be non-zero".to_owned(),
        ));
    }

    let mut prng = prng::Prng::new(seed);
    let data =
        background::generate_background_separable(&mut prng, width as usize, height as usize);
    Ok(data.into())
}
