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

#[cfg(test)]
mod properties {
    use super::*;
    use proptest::prelude::*;

    fn seed() -> impl Strategy<Value = Vec<u8>> {
        prop::collection::vec(any::<u8>(), prng::SEED_BYTES..prng::SEED_BYTES + 8)
    }

    #[test]
    fn js_round_matches_math_round_where_adding_a_half_rounds() {
        assert_eq!(palette::js_round(0.49999999999999994), 0.0);
        assert_eq!(palette::js_round(4503599627370497.0), 4503599627370497.0);
        assert_eq!(palette::js_round(-2.5), -2.0);
        assert_eq!(palette::js_round(2.5), 3.0);
    }

    proptest! {
        #[test]
        fn js_round_lands_within_half_rounding_ties_up(v in -1e300f64..1e300) {
            let rounded = palette::js_round(v);
            prop_assert_eq!(rounded, rounded.floor());
            let diff = rounded - v;
            prop_assert!(diff > -0.5 && diff <= 0.5, "{v} -> {rounded}");
        }

        #[test]
        fn prng_draws_stay_in_range(seed in seed(), min in -1000i32..1000, span in 0i32..1000, len in 1usize..1000) {
            let mut prng = prng::Prng::new(&seed);
            for _ in 0..32 {
                let n = prng.next();
                prop_assert!((0.0..1.0).contains(&n));
                let i = prng.int(min, min + span);
                prop_assert!((min..=min + span).contains(&i));
                prop_assert!(prng.pick_index(len) < len);
            }
        }

        #[test]
        fn background_is_one_opaque_pixel_per_cell_and_reproducible(
            seed in seed(),
            width in 1usize..24,
            height in 1usize..24,
        ) {
            let first = background::generate_background(&mut prng::Prng::new(&seed), width, height);
            let again = background::generate_background(&mut prng::Prng::new(&seed), width, height);
            prop_assert_eq!(first.len(), width * height * 4);
            prop_assert!(first.chunks(4).all(|pixel| pixel[3] == 255));
            prop_assert_eq!(&first, &again);
            let separable =
                background::generate_background_separable(&mut prng::Prng::new(&seed), width, height);
            prop_assert_eq!(separable.len(), first.len());
        }
    }
}
