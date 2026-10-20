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

// Ported from src/tests/puzzleAssets.unit.test.ts

use crate::{
    coverage_from_distance, create_background, create_notch_shape, create_prng, create_seed,
    cut_notch, generate_background, paint_decoy_piece, paint_decoys, render_puzzle, NotchPlacement,
    PuzzleGeometry, PuzzleRenderSettings, RgbaImage, DEFAULT_GEOMETRY, DEFAULT_RENDER_SETTINGS,
};

const SEED_A: &[u8] = b"0123456789abcdef";
const SEED_B: &[u8] = b"fedcba9876543210";

fn background(seed: &[u8], width: u32, height: u32) -> RgbaImage {
    generate_background(&mut create_prng(seed).unwrap(), width, height)
}

fn fresh_background(geometry: &PuzzleGeometry) -> RgbaImage {
    create_background(geometry, &create_seed()).unwrap()
}

fn luma(image: &RgbaImage, pixel: usize) -> f64 {
    let o = pixel * 4;
    0.299 * f64::from(image.data[o])
        + 0.587 * f64::from(image.data[o + 1])
        + 0.114 * f64::from(image.data[o + 2])
}

fn mean_luma(image: &RgbaImage) -> f64 {
    let pixels = (image.width * image.height) as usize;
    let total: f64 = (0..pixels).map(|i| luma(image, i)).sum();
    total / pixels as f64
}

fn placement(target_x: f64, target_y: f64) -> NotchPlacement {
    NotchPlacement { target_x, target_y }
}

mod prng {
    use super::*;

    #[test]
    fn is_deterministic_for_a_given_seed() {
        let mut a = create_prng(SEED_A).unwrap();
        let mut b = create_prng(SEED_A).unwrap();
        let draw_a = [a.next(), a.next(), a.next()];
        let draw_b = [b.next(), b.next(), b.next()];
        assert_eq!(draw_a, draw_b);
    }

    #[test]
    fn diverges_for_different_seeds() {
        let mut a = create_prng(SEED_A).unwrap();
        let mut b = create_prng(SEED_B).unwrap();
        assert_ne!(a.next(), b.next());
    }

    #[test]
    fn stays_within_bounds() {
        let mut prng = create_prng(SEED_A).unwrap();
        for _ in 0..500 {
            let v = prng.next();
            assert!((0.0..1.0).contains(&v));
            let n = prng.int(3, 7);
            assert!((3..=7).contains(&n));
        }
    }

    #[test]
    fn rejects_a_seed_shorter_than_128_bits() {
        let err = create_prng(&[0u8; 8]).unwrap_err();
        assert!(err.to_string().contains("seed must be at least"));
    }

    #[test]
    fn issues_128_bit_seeds() {
        assert_eq!(create_seed().len(), 16);
        assert_ne!(create_seed(), create_seed());
    }
}

mod generate_background {
    use super::*;

    #[test]
    fn fills_every_pixel_opaque() {
        let image = background(SEED_A, 60, 40);
        assert_eq!(image.data.len(), 60 * 40 * 4);
        for i in 0..60 * 40 {
            assert_eq!(image.data[i * 4 + 3], 255);
        }
    }

    #[test]
    fn is_reproducible_from_its_seed() {
        assert_eq!(background(SEED_A, 60, 40), background(SEED_A, 60, 40));
    }

    #[test]
    fn produces_a_different_picture_for_a_different_seed() {
        assert_ne!(
            background(SEED_A, 60, 40).data,
            background(SEED_B, 60, 40).data
        );
    }

    #[test]
    fn is_not_a_flat_wash() {
        let image = background(SEED_A, 300, 200);
        let mut min = 255.0_f64;
        let mut max = 0.0_f64;
        for i in 0..(image.width * image.height) as usize {
            let l = luma(&image, i);
            min = min.min(l);
            max = max.max(l);
        }
        assert!(max - min > 25.0);
    }
}

mod cut_notch {
    use super::*;

    const PLACEMENT: NotchPlacement = NotchPlacement {
        target_x: 200.0,
        target_y: 100.0,
    };

    #[test]
    fn darkens_the_hole_and_leaves_the_rest_of_the_frame_alone() {
        let geometry = DEFAULT_GEOMETRY;
        let mut prng = create_prng(SEED_A).unwrap();
        let original = background(SEED_A, geometry.width, geometry.height);
        let mut working = background(SEED_A, geometry.width, geometry.height);
        let shape = create_notch_shape(&mut prng, geometry.notch_size);
        let piece = cut_notch(
            &mut prng,
            &mut working,
            &shape,
            geometry.notch_size,
            &PLACEMENT,
            DEFAULT_RENDER_SETTINGS.hole_darken,
        );

        let centre = (100 * geometry.width as usize + 200) * 4;
        assert!(working.data[centre] < original.data[centre]);

        let far = (10 * geometry.width as usize + 10) * 4;
        assert_eq!(working.data[far], original.data[far]);

        assert_eq!(piece.width, geometry.notch_size);
        assert_eq!(piece.height, geometry.notch_size);
    }

    #[test]
    fn makes_the_piece_opaque_inside_the_shape_and_transparent_at_the_corners() {
        let geometry = DEFAULT_GEOMETRY;
        let size = geometry.notch_size as usize;
        let mut prng = create_prng(SEED_A).unwrap();
        let mut bg = fresh_background(&geometry);
        let shape = create_notch_shape(&mut prng, geometry.notch_size);
        let piece = cut_notch(
            &mut prng,
            &mut bg,
            &shape,
            geometry.notch_size,
            &PLACEMENT,
            DEFAULT_RENDER_SETTINGS.hole_darken,
        );

        let half = size / 2;
        assert_eq!(piece.data[(half * size + half) * 4 + 3], 255);
        assert!(piece.data[3] < 128);
    }

    #[test]
    fn clips_the_piece_to_transparent_where_the_placement_overhangs_the_frame() {
        let geometry = DEFAULT_GEOMETRY;
        let size = i64::from(geometry.notch_size);
        let mut prng = create_prng(SEED_A).unwrap();
        let mut bg = fresh_background(&geometry);
        let shape = create_notch_shape(&mut prng, geometry.notch_size);
        let overhang = placement(f64::from(geometry.width), 0.0);
        let piece = cut_notch(
            &mut prng,
            &mut bg,
            &shape,
            geometry.notch_size,
            &overhang,
            DEFAULT_RENDER_SETTINGS.hole_darken,
        );

        let half = size as f64 / 2.0;
        let left = (overhang.target_x - half).round() as i64;
        let top = (overhang.target_y - half).round() as i64;
        let mut out_of_frame_opaque = 0;
        for ly in 0..size {
            for lx in 0..size {
                let bx = left + lx;
                let by = top + ly;
                let in_frame = bx >= 0
                    && by >= 0
                    && bx < i64::from(geometry.width)
                    && by < i64::from(geometry.height);
                if in_frame {
                    continue;
                }
                if piece.data[((ly * size + lx) * 4 + 3) as usize] != 0 {
                    out_of_frame_opaque += 1;
                }
            }
        }
        assert_eq!(out_of_frame_opaque, 0);
    }

    #[test]
    fn does_not_reproduce_the_background_pixel_exactly_in_the_piece() {
        let geometry = DEFAULT_GEOMETRY;
        let size = geometry.notch_size as usize;
        let mut prng = create_prng(SEED_A).unwrap();
        let reference = background(SEED_A, geometry.width, geometry.height);
        let mut working = background(SEED_A, geometry.width, geometry.height);
        let shape = create_notch_shape(&mut prng, geometry.notch_size);
        let piece = cut_notch(
            &mut prng,
            &mut working,
            &shape,
            geometry.notch_size,
            &PLACEMENT,
            DEFAULT_RENDER_SETTINGS.hole_darken,
        );

        let half = size as f64 / 2.0;
        let left = (PLACEMENT.target_x - half).round() as usize;
        let top = (PLACEMENT.target_y - half).round() as usize;
        let mut identical = 0;
        let mut compared = 0;
        for ly in 0..size {
            for lx in 0..size {
                let pi = (ly * size + lx) * 4;
                if piece.data[pi + 3] < 255 {
                    continue;
                }
                let bi = ((top + ly) * geometry.width as usize + (left + lx)) * 4;
                compared += 1;
                if piece.data[pi] == reference.data[bi] {
                    identical += 1;
                }
            }
        }
        assert!(compared > 100);
        assert!(f64::from(identical) / f64::from(compared) < 0.5);
    }
}

mod render_puzzle {
    use super::*;

    #[test]
    fn encodes_both_halves_as_webp() {
        let rendered = render_puzzle(
            fresh_background(&DEFAULT_GEOMETRY),
            &placement(200.0, 100.0),
            &DEFAULT_GEOMETRY,
            &DEFAULT_RENDER_SETTINGS,
            None,
        )
        .unwrap();
        assert_eq!(&rendered.background[0..4], b"RIFF");
        assert_eq!(&rendered.background[8..12], b"WEBP");
        assert_eq!(&rendered.piece[8..12], b"WEBP");
        assert_eq!(rendered.piece_size, DEFAULT_GEOMETRY.notch_size);
    }

    #[test]
    fn honors_a_piece_size_override_independently_of_notch_size() {
        let geometry = PuzzleGeometry {
            piece_size: Some(180),
            ..DEFAULT_GEOMETRY
        };
        let rendered = render_puzzle(
            fresh_background(&DEFAULT_GEOMETRY),
            &placement(150.0, 100.0),
            &geometry,
            &DEFAULT_RENDER_SETTINGS,
            None,
        )
        .unwrap();
        assert_eq!(rendered.piece_size, 180);
    }

    #[test]
    fn stays_small_enough_to_inline_as_a_data_uri() {
        let rendered = render_puzzle(
            fresh_background(&DEFAULT_GEOMETRY),
            &placement(200.0, 100.0),
            &DEFAULT_GEOMETRY,
            &DEFAULT_RENDER_SETTINGS,
            None,
        )
        .unwrap();
        let base64_bytes =
            rendered.background.len().div_ceil(3) * 4 + rendered.piece.len().div_ceil(3) * 4;
        assert!(base64_bytes < 120_000);
    }
}

mod coverage_from_distance {
    use super::*;

    #[test]
    fn is_1_well_inside_0_well_outside_and_partial_on_the_boundary() {
        assert_eq!(coverage_from_distance(-5.0), 1.0);
        assert_eq!(coverage_from_distance(5.0), 0.0);
        let edge = coverage_from_distance(0.0);
        assert!(edge > 0.0 && edge < 1.0);
    }
}

mod background_brightness {
    use super::*;

    #[test]
    fn keeps_a_usable_mid_range_so_the_piece_stays_visible() {
        for seed in [SEED_A, SEED_B] {
            let l = mean_luma(&background(seed, 300, 200));
            assert!(l > 60.0 && l < 215.0);
        }
    }
}

mod paint_decoys {
    use super::*;

    const NOTCH: NotchPlacement = NotchPlacement {
        target_x: 220.0,
        target_y: 140.0,
    };
    const S: PuzzleRenderSettings = DEFAULT_RENDER_SETTINGS;

    fn paint(bg: &mut RgbaImage, seed: &[u8], count: f64) {
        paint_decoys(
            bg,
            &mut create_prng(seed).unwrap(),
            count,
            DEFAULT_GEOMETRY.notch_size,
            &NOTCH,
            S.decoy_edge_darkness,
            S.decoy_body_brightness,
            S.decoy_hole_darken,
        );
    }

    #[test]
    fn is_a_no_op_for_count_at_most_zero() {
        let mut bg = background(SEED_A, 300, 200);
        let before = bg.data.clone();
        paint(&mut bg, SEED_A, 0.0);
        assert_eq!(bg.data, before);
    }

    #[test]
    fn mutates_the_background_when_count_is_positive() {
        let mut bg = background(SEED_A, 300, 200);
        let before = bg.data.clone();
        paint(&mut bg, SEED_B, 3.0);
        assert_ne!(bg.data, before);
    }

    #[test]
    fn is_deterministic_for_a_given_prng_seed() {
        let mut bg1 = background(SEED_A, 300, 200);
        let mut bg2 = background(SEED_A, 300, 200);
        paint(&mut bg1, SEED_B, 3.0);
        paint(&mut bg2, SEED_B, 3.0);
        assert_eq!(bg1.data, bg2.data);
    }

    #[test]
    fn blackens_the_decoy_interior_when_hole_darken_is_zero() {
        let mut bg = background(SEED_A, 300, 200);
        let (cx, cy) = (150usize, 100usize);
        paint_decoy_piece(
            &mut bg,
            &mut create_prng(SEED_B).unwrap(),
            DEFAULT_GEOMETRY.notch_size,
            cx as f64,
            cy as f64,
            0.0,
            0.0,
            0.0,
        );
        let i = (cy * bg.width as usize + cx) * 4;
        assert_eq!(&bg.data[i..i + 3], &[0, 0, 0]);
    }
}

mod render_puzzle_with_decoys {
    use super::*;

    #[test]
    fn still_returns_a_matching_piece_when_decoys_are_present() {
        let rendered = render_puzzle(
            fresh_background(&DEFAULT_GEOMETRY),
            &placement(150.0, 100.0),
            &DEFAULT_GEOMETRY,
            &PuzzleRenderSettings {
                decoy_count: 3.0,
                ..DEFAULT_RENDER_SETTINGS
            },
            None,
        )
        .unwrap();
        assert!(!rendered.background.is_empty());
        assert!(!rendered.piece.is_empty());
        assert_eq!(rendered.piece_size, DEFAULT_GEOMETRY.notch_size);
    }

    #[test]
    fn honors_decoy_count_0_end_to_end() {
        let rendered = render_puzzle(
            fresh_background(&DEFAULT_GEOMETRY),
            &placement(150.0, 100.0),
            &DEFAULT_GEOMETRY,
            &PuzzleRenderSettings {
                decoy_count: 0.0,
                ..DEFAULT_RENDER_SETTINGS
            },
            None,
        )
        .unwrap();
        assert!(!rendered.background.is_empty());
    }
}
