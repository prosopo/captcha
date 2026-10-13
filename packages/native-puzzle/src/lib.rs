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

/// Largest width or height accepted. The output is `width * height * 4` bytes,
/// so an unchecked `u32` pair could ask for exabytes, or overflow the size
/// calculation and panic, which aborts the whole Node process. 4096x4096 is
/// 64 MiB, far above any real puzzle.
pub const MAX_DIMENSION: u32 = 4096;

fn check_inputs(seed_len: usize, width: u32, height: u32) -> std::result::Result<(), String> {
    if seed_len < prng::SEED_BYTES {
        return Err(format!(
            "native-puzzle: seed must be at least {} bytes, got {}",
            prng::SEED_BYTES,
            seed_len
        ));
    }
    if width == 0 || height == 0 {
        return Err("native-puzzle: width and height must be non-zero".to_owned());
    }
    if width > MAX_DIMENSION || height > MAX_DIMENSION {
        return Err(format!(
            "native-puzzle: width and height must be at most {MAX_DIMENSION}, got {width}x{height}"
        ));
    }
    Ok(())
}

/// Synthesise a puzzle background, byte-identical to `generateBackground`
/// from @prosopo/puzzle-assets for the same seed.
///
/// Returns straight (non-premultiplied) RGBA, row-major, 4 bytes per pixel —
/// the `RgbaImage.data` layout the caller hands to sharp.
#[napi(js_name = "generateBackground", catch_unwind)]
pub fn generate_background(seed: Buffer, width: u32, height: u32) -> Result<Buffer> {
    let seed: &[u8] = seed.as_ref();
    check_inputs(seed.len(), width, height).map_err(|msg| Error::new(Status::InvalidArg, msg))?;

    let mut prng = prng::Prng::new(seed);
    let data = background::generate_background(&mut prng, width as usize, height as usize);
    Ok(data.into())
}

/// As `generateBackground`, but evaluating each Gaussian field as a product of
/// its two axes. Same picture, a fraction of the exponentials — and not
/// bit-identical to the JS, so it trades the exact differential test for
/// speed. Exported to be measured, not yet to be shipped.
#[napi(js_name = "generateBackgroundSeparable", catch_unwind)]
pub fn generate_background_separable(seed: Buffer, width: u32, height: u32) -> Result<Buffer> {
    let seed: &[u8] = seed.as_ref();
    check_inputs(seed.len(), width, height).map_err(|msg| Error::new(Status::InvalidArg, msg))?;

    let mut prng = prng::Prng::new(seed);
    let data =
        background::generate_background_separable(&mut prng, width as usize, height as usize);
    Ok(data.into())
}

#[cfg(test)]
mod tests {
    use super::{check_inputs, MAX_DIMENSION};
    use crate::prng::SEED_BYTES;

    #[test]
    fn accepts_the_largest_allowed_size() {
        assert!(check_inputs(SEED_BYTES, MAX_DIMENSION, MAX_DIMENSION).is_ok());
        assert!(check_inputs(SEED_BYTES, 300, 200).is_ok());
    }

    #[test]
    fn rejects_oversized_dimensions() {
        assert!(check_inputs(SEED_BYTES, MAX_DIMENSION + 1, 1).is_err());
        assert!(check_inputs(SEED_BYTES, 1, MAX_DIMENSION + 1).is_err());
        assert!(check_inputs(SEED_BYTES, u32::MAX, u32::MAX).is_err());
    }

    #[test]
    fn rejects_zero_dimensions_and_short_seeds() {
        assert!(check_inputs(SEED_BYTES, 0, 1).is_err());
        assert!(check_inputs(SEED_BYTES - 1, 1, 1).is_err());
    }
}
