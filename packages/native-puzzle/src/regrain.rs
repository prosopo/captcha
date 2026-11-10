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

//! Port of `regrain` in puzzle-assets' `presentation.ts`. One noise draw per
//! pixel, shared by its three channels, in the same order as the JS, so the
//! output matches it byte for byte.

use crate::palette::js_round;
use crate::prng::Prng;

const GRAIN_AMPLITUDE: f64 = 5.0;

fn clamp255(v: f64) -> u8 {
    if v < 0.0 {
        0
    } else if v > 255.0 {
        255
    } else {
        v as u8
    }
}

/// Index pairs of Paeth's median-of-nine network; the median ends in slot 4.
const MEDIAN9_NETWORK: [(usize, usize); 19] = [
    (1, 2),
    (4, 5),
    (7, 8),
    (0, 1),
    (3, 4),
    (6, 7),
    (1, 2),
    (4, 5),
    (7, 8),
    (0, 3),
    (5, 8),
    (4, 7),
    (3, 6),
    (1, 4),
    (2, 5),
    (4, 7),
    (4, 2),
    (6, 4),
    (4, 2),
];

fn median9(mut p: [u8; 9]) -> u8 {
    for (a, b) in MEDIAN9_NETWORK {
        let (lo, hi) = (p[a].min(p[b]), p[a].max(p[b]));
        p[a] = lo;
        p[b] = hi;
    }
    p[4]
}

/// Replace the grain in an RGBA image in place: a 3x3 per-channel median
/// with edges clamped, plus fresh uniform noise. Alpha is left alone.
pub fn regrain(data: &mut [u8], width: usize, height: usize, prng: &mut Prng) {
    let source = data.to_vec();
    let row = |y: isize| (y.clamp(0, height as isize - 1) as usize) * width * 4;
    let column = |x: isize| (x.clamp(0, width as isize - 1) as usize) * 4;
    for y in 0..height {
        let rows = [row(y as isize - 1), row(y as isize), row(y as isize + 1)];
        for x in 0..width {
            let columns = [
                column(x as isize - 1),
                column(x as isize),
                column(x as isize + 1),
            ];
            let i = (y * width + x) * 4;
            let noise = (prng.next() - 0.5) * 2.0 * GRAIN_AMPLITUDE;
            for c in 0..3 {
                let mut window = [0u8; 9];
                let mut w = 0;
                for r in rows {
                    for k in columns {
                        window[w] = source[r + k + c];
                        w += 1;
                    }
                }
                data[i + c] = clamp255(js_round(f64::from(median9(window)) + noise));
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{median9, regrain};

    #[test]
    fn median_network_matches_a_sort() {
        let mut state = 12345u32;
        for _ in 0..10_000 {
            let mut p = [0u8; 9];
            for v in &mut p {
                state = state.wrapping_mul(1_103_515_245).wrapping_add(12345);
                *v = (state >> 16) as u8;
            }
            let mut sorted = p;
            sorted.sort_unstable();
            assert_eq!(median9(p), sorted[4]);
        }
    }
    use crate::prng::Prng;

    #[test]
    fn leaves_alpha_and_size_alone() {
        let mut data = vec![128u8; 5 * 4 * 4];
        for px in data.chunks_mut(4) {
            px[3] = 77;
        }
        regrain(&mut data, 5, 4, &mut Prng::new(&[3u8; 16]));
        assert_eq!(data.len(), 80);
        assert!(data.chunks(4).all(|px| px[3] == 77));
    }

    #[test]
    fn keeps_a_flat_image_within_the_grain() {
        let mut data = vec![100u8; 6 * 6 * 4];
        regrain(&mut data, 6, 6, &mut Prng::new(&[9u8; 16]));
        assert!(data
            .chunks(4)
            .all(|px| px[..3].iter().all(|&v| (95..=105).contains(&v))));
    }
}
