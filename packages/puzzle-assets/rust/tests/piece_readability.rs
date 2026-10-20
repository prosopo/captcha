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

// Ported from src/tests/pieceReadability.unit.test.ts

use std::collections::HashSet;

use crate::{
    best_pair_contrast, contrast_ratio, coverage_from_distance, create_notch_shape, create_prng,
    cut_notch, draw_palette, generate_background, piece_rim_geometry, relative_luminance,
    simulate_vision, NotchPlacement, NotchShape, Rgb, RgbaImage, VisionType, MIN_PALETTE_CONTRAST,
    VISION_TYPES,
};

/// A sweep, not an example: enough seeds to catch a one-in-fifty failure.
const SEEDS: u32 = 400;

fn seed_at(i: u32) -> Vec<u8> {
    let i = u64::from(i);
    let mut seed = Vec::with_capacity(16);
    seed.extend_from_slice(&((i * 2_654_435_761) as u32).to_le_bytes());
    seed.extend_from_slice(&((i * 40_503 + 7) as u32).to_le_bytes());
    seed.extend_from_slice(&((i as u32) ^ 0x9e37_79b9).to_le_bytes());
    seed.extend_from_slice(&((i * 97 + 13) as u32).to_le_bytes());
    seed
}

fn rgb(r: f64, g: f64, b: f64) -> Rgb {
    Rgb { r, g, b }
}

fn hue_of(colour: &Rgb) -> f64 {
    let r = colour.r / 255.0;
    let g = colour.g / 255.0;
    let b = colour.b / 255.0;
    let max = r.max(g).max(b);
    let min = r.min(g).min(b);
    let span = max - min;
    if span == 0.0 {
        return 0.0;
    }
    let hue = if max == r {
        ((g - b) / span) % 6.0
    } else if max == g {
        (b - r) / span + 2.0
    } else {
        (r - g) / span + 4.0
    };
    (((hue * 60.0) % 360.0) + 360.0) % 360.0
}

fn hue_gap(a: f64, b: f64) -> f64 {
    let raw = (a - b).abs() % 360.0;
    if raw > 180.0 {
        360.0 - raw
    } else {
        raw
    }
}

mod colour_vision_arithmetic {
    use super::*;

    #[test]
    fn gives_black_and_white_the_full_wcag_range() {
        let ratio = contrast_ratio(&rgb(0.0, 0.0, 0.0), &rgb(255.0, 255.0, 255.0));
        assert!((ratio - 21.0).abs() < 0.05);
    }

    #[test]
    fn gives_a_colour_against_itself_the_floor_of_1() {
        assert_eq!(
            contrast_ratio(&rgb(90.0, 120.0, 200.0), &rgb(90.0, 120.0, 200.0)),
            1.0
        );
    }

    #[test]
    fn weights_green_above_red_above_blue_on_linear_light() {
        let red = relative_luminance(&rgb(255.0, 0.0, 0.0));
        let green = relative_luminance(&rgb(0.0, 255.0, 0.0));
        let blue = relative_luminance(&rgb(0.0, 0.0, 255.0));
        assert!(green > red);
        assert!(red > blue);
        assert!(relative_luminance(&rgb(128.0, 128.0, 128.0)) < 0.3);
    }

    #[test]
    fn leaves_colours_alone_for_normal_vision() {
        let colour = rgb(12.0, 200.0, 77.0);
        assert_eq!(simulate_vision(&colour, VisionType::Normal), colour);
    }

    /// Hue converges for protanopes and deuteranopes while brightness stays
    /// apart, which is why the cues are luminance-based.
    #[test]
    fn collapses_red_against_green_onto_one_hue_for_protanopia_and_deuteranopia() {
        let red = rgb(200.0, 60.0, 60.0);
        let green = rgb(60.0, 200.0, 60.0);
        assert!(hue_gap(hue_of(&red), hue_of(&green)) > 100.0);
        for vision in [VisionType::Protanopia, VisionType::Deuteranopia] {
            let gap = hue_gap(
                hue_of(&simulate_vision(&red, vision)),
                hue_of(&simulate_vision(&green, vision)),
            );
            assert!(gap < 20.0, "{}", vision.as_str());
        }
    }

    #[test]
    fn leaves_red_against_green_apart_for_tritanopia() {
        let red = rgb(200.0, 60.0, 60.0);
        let green = rgb(60.0, 200.0, 60.0);
        assert!(
            hue_gap(
                hue_of(&simulate_vision(&red, VisionType::Tritanopia)),
                hue_of(&simulate_vision(&green, VisionType::Tritanopia)),
            ) > 90.0
        );
    }

    #[test]
    fn keeps_a_grey_ramp_distinguishable_for_every_vision_type() {
        for vision in VISION_TYPES {
            let dark = simulate_vision(&rgb(40.0, 40.0, 40.0), vision);
            let light = simulate_vision(&rgb(215.0, 215.0, 215.0), vision);
            assert!(contrast_ratio(&dark, &light) > 5.0);
        }
    }
}

mod generated_palettes_swept_over_seeds {
    use super::*;

    #[test]
    fn always_spans_the_contrast_floor_under_every_vision_type() {
        let mut failures: Vec<String> = Vec::new();
        for i in 0..SEEDS {
            let colours = draw_palette(&mut create_prng(&seed_at(i)).unwrap(), 5);
            let worst = best_pair_contrast(&colours);
            if worst < MIN_PALETTE_CONTRAST {
                failures.push(format!("seed {i}: {worst:.3}"));
            }
        }
        assert_eq!(failures, Vec::<String>::new());
    }

    #[test]
    fn holds_the_floor_for_every_palette_size_the_renderer_asks_for() {
        for count in [2usize, 3, 4, 5, 6, 8] {
            for i in 0..40 {
                let seed = seed_at(i + count as u32 * 1000);
                let colours = draw_palette(&mut create_prng(&seed).unwrap(), count);
                assert!(
                    best_pair_contrast(&colours) >= MIN_PALETTE_CONTRAST,
                    "count {count}, seed {i}"
                );
            }
        }
    }

    #[test]
    fn still_produces_a_range_of_palettes_rather_than_clamping_to_the_floor() {
        let mut spans = HashSet::new();
        for i in 0..SEEDS {
            let colours = draw_palette(&mut create_prng(&seed_at(i)).unwrap(), 5);
            spans.insert(format!("{:.1}", best_pair_contrast(&colours)));
        }
        assert!(spans.len() > 4);
    }

    #[test]
    fn is_still_reproducible_from_its_seed() {
        assert_eq!(
            draw_palette(&mut create_prng(&seed_at(7)).unwrap(), 5),
            draw_palette(&mut create_prng(&seed_at(7)).unwrap(), 5)
        );
    }
}

/// How many times the boundary crosses a circle concentric with the body: a
/// crude but measurable proxy for "has protrusions".
fn protrusion_arcs(shape: &NotchShape, size: u32, radius_fraction: f64) -> u32 {
    let cx = f64::from(size) / 2.0;
    let cy = f64::from(size) / 2.0;
    let radius = (f64::from(size) / 2.0) * radius_fraction;
    let steps = 720;
    let mut arcs = 0;
    let mut previously_inside = false;
    let mut first_inside: Option<bool> = None;
    for i in 0..steps {
        let angle = (f64::from(i) / f64::from(steps)) * std::f64::consts::PI * 2.0;
        let inside = shape.distance(cx + radius * angle.cos(), cy + radius * angle.sin()) < 0.0;
        if first_inside.is_none() {
            first_inside = Some(inside);
        } else if inside && !previously_inside {
            arcs += 1;
        }
        previously_inside = inside;
    }
    // Close the loop, so an arc straddling angle 0 is counted once.
    if first_inside == Some(true) && previously_inside {
        arcs += 1;
    }
    arcs
}

fn covered_fraction(shape: &NotchShape, size: u32) -> f64 {
    let mut covered = 0.0;
    for y in 0..size {
        for x in 0..size {
            covered += coverage_from_distance(shape.distance(f64::from(x), f64::from(y)));
        }
    }
    covered / f64::from(size * size)
}

fn shape_at(i: u32, size: u32) -> NotchShape {
    create_notch_shape(&mut create_prng(&seed_at(i)).unwrap(), size)
}

mod the_silhouette_swept_over_seeds {
    use super::*;

    const SIZE: u32 = 64;

    #[test]
    fn always_has_protruding_tabs() {
        let without_tabs: Vec<u32> = (0..SEEDS)
            .filter(|&i| protrusion_arcs(&shape_at(i, SIZE), SIZE, 0.92) < 1)
            .collect();
        assert_eq!(without_tabs, Vec::<u32>::new());
    }

    #[test]
    fn still_varies_per_challenge() {
        let mut signatures = HashSet::new();
        for i in 0..SEEDS {
            let shape = shape_at(i, SIZE);
            signatures.insert(format!(
                "{:.3}:{}:{}",
                covered_fraction(&shape, SIZE),
                protrusion_arcs(&shape, SIZE, 0.92),
                protrusion_arcs(&shape, SIZE, 0.78)
            ));
        }
        assert!(signatures.len() as f64 > f64::from(SEEDS) * 0.8);
    }

    #[test]
    fn stays_inside_its_bounding_box() {
        let edge = f64::from(SIZE - 1);
        for i in 0..60 {
            let shape = shape_at(i, SIZE);
            for t in 0..SIZE {
                let t = f64::from(t);
                for (x, y) in [(t, 0.0), (t, edge), (0.0, t), (edge, t)] {
                    assert!(shape.distance(x, y) > 0.0, "seed {i} at ({x},{y})");
                }
            }
        }
    }

    #[test]
    fn covers_a_usable_fraction_of_its_box() {
        for i in 0..SEEDS {
            let covered = covered_fraction(&shape_at(i, SIZE), SIZE);
            assert!(covered > 0.18, "seed {i}");
            assert!(covered < 0.6, "seed {i}");
        }
    }

    #[test]
    fn varies_how_much_of_the_box_it_fills() {
        let buckets: HashSet<String> = (0..SEEDS)
            .map(|i| format!("{:.2}", covered_fraction(&shape_at(i, SIZE), SIZE)))
            .collect();
        assert!(buckets.len() > 10);
    }

    #[test]
    fn is_reproducible_from_its_seed() {
        let a = shape_at(3, SIZE);
        let b = shape_at(3, SIZE);
        for t in (0..SIZE).step_by(3) {
            let t = f64::from(t);
            assert_eq!(a.distance(t, t).to_bits(), b.distance(t, t).to_bits());
        }
    }
}

struct RimAndCore {
    rim: f64,
    core: f64,
}

/// Mean luminance of the rim plateau and of the interior, on fully opaque
/// pixels only, using the renderer's own rim geometry.
fn rim_and_core(piece: &RgbaImage, shape: &NotchShape) -> RimAndCore {
    let band = piece_rim_geometry(f64::from(piece.width));
    let (mut rim_total, mut rim_count) = (0.0, 0u32);
    let (mut core_total, mut core_count) = (0.0, 0u32);
    for y in 0..piece.height {
        for x in 0..piece.width {
            let o = ((y * piece.width + x) * 4) as usize;
            if piece.data[o + 3] < 250 {
                continue;
            }
            let luma = relative_luminance(&rgb(
                f64::from(piece.data[o]),
                f64::from(piece.data[o + 1]),
                f64::from(piece.data[o + 2]),
            ));
            let d = shape.distance(f64::from(x), f64::from(y));
            if d > -band.plateau && d < -0.5 {
                rim_total += luma;
                rim_count += 1;
            } else if d < -band.width - 2.0 {
                core_total += luma;
                core_count += 1;
            }
        }
    }
    RimAndCore {
        rim: if rim_count == 0 {
            0.0
        } else {
            rim_total / f64::from(rim_count)
        },
        core: if core_count == 0 {
            0.0
        } else {
            core_total / f64::from(core_count)
        },
    }
}

fn ratio(m: &RimAndCore) -> f64 {
    (m.rim.max(m.core) + 0.05) / (m.rim.min(m.core) + 0.05)
}

mod the_pieces_separation_cue_swept_over_seeds {
    use super::*;

    const SIZE: u32 = 64;
    const TARGET: NotchPlacement = NotchPlacement {
        target_x: 120.0,
        target_y: 80.0,
    };

    fn cut_at(i: u32) -> (RgbaImage, NotchShape) {
        let mut prng = create_prng(&seed_at(i)).unwrap();
        let mut background = generate_background(&mut prng, 240, 160);
        let shape = create_notch_shape(&mut prng, SIZE);
        let piece = cut_notch(&mut prng, &mut background, &shape, SIZE, &TARGET, 0.55);
        (piece, shape)
    }

    #[test]
    fn always_separates_the_rim_from_the_body_by_a_visible_luminance_step() {
        let mut failures: Vec<String> = Vec::new();
        for i in 0..120 {
            let (piece, shape) = cut_at(i);
            let r = ratio(&rim_and_core(&piece, &shape));
            if r < 1.25 {
                failures.push(format!("seed {i}: {r:.3}"));
            }
        }
        assert_eq!(failures, Vec::<String>::new());
    }

    #[test]
    fn steps_away_from_the_piece_rather_than_in_a_fixed_direction() {
        let mut lighter_rim = 0;
        let mut darker_rim = 0;
        for i in 0..120 {
            let (piece, shape) = cut_at(i + 5_000);
            let m = rim_and_core(&piece, &shape);
            if m.rim > m.core {
                lighter_rim += 1;
            } else {
                darker_rim += 1;
            }
        }
        assert!(lighter_rim > 0);
        assert!(darker_rim > 0);
    }

    #[test]
    fn survives_being_reduced_to_greyscale() {
        for i in 0..40 {
            let (piece, shape) = cut_at(i + 9_000);
            let mut grey = piece.clone();
            for px in grey.data.as_chunks_mut::<4>().0 {
                let v = (0.2126 * f64::from(px[0])
                    + 0.7152 * f64::from(px[1])
                    + 0.0722 * f64::from(px[2]))
                .round() as u8;
                px[0] = v;
                px[1] = v;
                px[2] = v;
            }
            let colour_ratio = ratio(&rim_and_core(&piece, &shape));
            let mono_ratio = ratio(&rim_and_core(&grey, &shape));
            assert!(mono_ratio > 1.2, "seed {i}");
            assert!((mono_ratio - colour_ratio).abs() < 0.2, "seed {i}");
        }
    }

    #[test]
    fn keeps_the_cue_for_every_dichromacy() {
        for i in 0..40 {
            let (piece, shape) = cut_at(i + 11_000);
            let m = rim_and_core(&piece, &shape);
            let to_grey = |luminance: f64| {
                let v = (255.0 * luminance.powf(1.0 / 2.2)).round();
                rgb(v, v, v)
            };
            for vision in VISION_TYPES {
                let r = contrast_ratio(
                    &simulate_vision(&to_grey(m.rim), vision),
                    &simulate_vision(&to_grey(m.core), vision),
                );
                assert!(r > 1.2, "seed {i}, {}", vision.as_str());
            }
        }
    }
}
