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

// Ported from rust/equivalence/vectors.json, generated from the TS by rust/equivalence/generate.ts

use serde::Deserialize;
use sha2::{Digest, Sha256};

use crate::{
    best_pair_contrast, contrast_ratio, coverage_from_distance, create_notch_shape, create_prng,
    cut_notch, draw_palette, generate_background, hsl_to_rgb, jsmath, paint_decoy_piece,
    paint_decoys, piece_rim_geometry, relative_luminance, render_puzzle_to_rgba, simulate_vision,
    worst_case_contrast, NotchPlacement, PuzzleAssetsError, PuzzleGeometry, PuzzleRenderSettings,
    Rgb, RgbaImage, VISION_TYPES,
};

const VECTORS: &str = include_str!("equivalence/vectors.json");

/// IEEE-754 bits as big-endian hex.
type Bits = String;

fn f(bits: &str) -> f64 {
    f64::from_bits(u64::from_str_radix(bits, 16).expect("hex float bits"))
}

fn same(actual: f64, expected: &str, context: &str) {
    assert_eq!(
        actual.to_bits(),
        f(expected).to_bits(),
        "{context}: got {actual:e}, want {:e}",
        f(expected)
    );
}

fn seed(hex_seed: &str) -> Vec<u8> {
    hex::decode(hex_seed).expect("hex seed")
}

#[derive(Deserialize)]
struct ImageDigest {
    width: u32,
    height: u32,
    sha256: String,
}

fn check_image(image: &RgbaImage, expected: &ImageDigest, context: &str) {
    assert_eq!(
        (image.width, image.height),
        (expected.width, expected.height),
        "{context}: dimensions"
    );
    assert_eq!(
        hex::encode(Sha256::digest(&image.data)),
        expected.sha256,
        "{context}: pixels"
    );
}

#[derive(Deserialize)]
struct MathVectors {
    exp: Vec<(Bits, Bits)>,
    pow: Vec<(Bits, Bits, Bits)>,
    hypot: Vec<(Bits, Bits, Bits)>,
    round: Vec<(Bits, Bits)>,
}

#[derive(Deserialize)]
struct IntDraw {
    min: i64,
    max: i64,
    value: i64,
}

#[derive(Deserialize)]
struct RangeDraw {
    min: f64,
    max: f64,
    value: Bits,
}

#[derive(Deserialize)]
struct PickDraw {
    length: usize,
    index: usize,
}

#[derive(Deserialize)]
struct PrngVector {
    seed: String,
    uint32: Vec<u32>,
    next: Vec<Bits>,
    int: Vec<IntDraw>,
    range: Vec<RangeDraw>,
    pick: Vec<PickDraw>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct PrngError {
    seed_length: usize,
    message: String,
}

#[derive(Deserialize)]
struct HslVector {
    h: f64,
    s: f64,
    l: f64,
    rgb: [Bits; 3],
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ContrastVector {
    a: [f64; 3],
    b: [f64; 3],
    luminance_a: Bits,
    contrast: Bits,
    worst_case: Bits,
    simulated_a: Vec<[Bits; 3]>,
}

#[derive(Deserialize)]
struct BestPairVector {
    colours: Vec<[Bits; 3]>,
    best: Bits,
}

#[derive(Deserialize)]
struct RimGeometryVector {
    size: f64,
    plateau: Bits,
    width: Bits,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct PaletteVector {
    seed: String,
    count: usize,
    colours: Vec<[Bits; 3]>,
    next_after: Bits,
}

#[derive(Deserialize)]
struct ShapeSample {
    x: f64,
    y: f64,
    d: Bits,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ShapeVector {
    seed: String,
    size: u32,
    grid_sha256: String,
    samples: Vec<ShapeSample>,
    next_after: Bits,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct BackgroundVector {
    seed: String,
    width: u32,
    height: u32,
    image: ImageDigest,
    next_after: Bits,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Placement {
    target_x: f64,
    target_y: f64,
}

impl Placement {
    fn to_placement(&self) -> NotchPlacement {
        NotchPlacement {
            target_x: self.target_x,
            target_y: self.target_y,
        }
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct DecoyVector {
    background_seed: String,
    decoy_seed: String,
    width: u32,
    height: u32,
    target_count: f64,
    notch_size: u32,
    notch: Placement,
    edge_darkness: f64,
    body_brightness: f64,
    hole_darken: f64,
    image: ImageDigest,
    next_after: Bits,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct DecoyPieceVector {
    background_seed: String,
    decoy_seed: String,
    size: u32,
    cx: f64,
    cy: f64,
    edge_darkness: f64,
    body_brightness: f64,
    hole_darken: f64,
    image: ImageDigest,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct CutVector {
    seed: String,
    width: u32,
    height: u32,
    size: u32,
    placement: Placement,
    hole_darken: f64,
    background: ImageDigest,
    piece: ImageDigest,
    next_after: Bits,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Geometry {
    width: u32,
    height: u32,
    notch_size: u32,
    piece_size: Option<u32>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Settings {
    decoy_count: f64,
    decoy_edge_darkness: f64,
    decoy_body_brightness: f64,
    hole_darken: f64,
    decoy_hole_darken: f64,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RenderVector {
    background_seed: String,
    render_seed: String,
    geometry: Geometry,
    settings: Settings,
    placement: Placement,
    background: ImageDigest,
    piece: ImageDigest,
    piece_size: u32,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Vectors {
    math: MathVectors,
    prng: Vec<PrngVector>,
    prng_errors: Vec<PrngError>,
    pick_empty_error: String,
    hsl_to_rgb: Vec<HslVector>,
    contrast: Vec<ContrastVector>,
    best_pair: Vec<BestPairVector>,
    coverage: Vec<(Bits, Bits)>,
    rim_geometry: Vec<RimGeometryVector>,
    palettes: Vec<PaletteVector>,
    shapes: Vec<ShapeVector>,
    backgrounds: Vec<BackgroundVector>,
    decoys: Vec<DecoyVector>,
    decoy_pieces: Vec<DecoyPieceVector>,
    cuts: Vec<CutVector>,
    renders: Vec<RenderVector>,
}

fn vectors() -> Vectors {
    serde_json::from_str(VECTORS).expect("vectors.json parses")
}

fn rgb_of(channels: &[f64; 3]) -> Rgb {
    Rgb {
        r: channels[0],
        g: channels[1],
        b: channels[2],
    }
}

fn check_rgb(actual: &Rgb, expected: &[Bits; 3], context: &str) {
    same(actual.r, &expected[0], context);
    same(actual.g, &expected[1], context);
    same(actual.b, &expected[2], context);
}

fn background_for(seed_hex: &str, width: u32, height: u32) -> RgbaImage {
    let mut prng = create_prng(&seed(seed_hex)).expect("seed");
    generate_background(&mut prng, width, height)
}

#[test]
fn equivalence_js_math() {
    let v = vectors().math;
    for (x, want) in &v.exp {
        same(jsmath::exp(f(x)), want, &format!("exp({x})"));
    }
    for (x, y, want) in &v.pow {
        same(jsmath::pow(f(x), f(y)), want, &format!("pow({x}, {y})"));
    }
    for (a, b, want) in &v.hypot {
        same(jsmath::hypot(f(a), f(b)), want, &format!("hypot({a}, {b})"));
    }
    for (x, want) in &v.round {
        same(jsmath::round(f(x)), want, &format!("round({x})"));
    }
}

#[test]
fn equivalence_prng() {
    let v = vectors();
    for vector in &v.prng {
        let mut raw = create_prng(&seed(&vector.seed)).expect("seed");
        let uint32: Vec<u32> = (0..vector.uint32.len()).map(|_| raw.next_u32()).collect();
        assert_eq!(uint32, vector.uint32, "seed {}", vector.seed);

        let mut prng = create_prng(&seed(&vector.seed)).expect("seed");
        for want in &vector.next {
            same(prng.next(), want, &vector.seed);
        }
        for draw in &vector.int {
            assert_eq!(
                prng.int(draw.min, draw.max),
                draw.value,
                "seed {}",
                vector.seed
            );
        }
        for draw in &vector.range {
            same(prng.range(draw.min, draw.max), &draw.value, &vector.seed);
        }
        for draw in &vector.pick {
            let items: Vec<usize> = (0..draw.length).collect();
            assert_eq!(*prng.pick(&items).expect("non-empty"), draw.index);
        }
    }
    for error in &v.prng_errors {
        let result = create_prng(&vec![0u8; error.seed_length]);
        let err = result.expect_err("short seed rejected");
        assert_eq!(
            err,
            PuzzleAssetsError::SeedTooShort {
                len: error.seed_length
            }
        );
        assert_eq!(err.to_string(), error.message);
    }
    let mut prng = create_prng(&[0u8; 16]).expect("seed");
    let empty: [u32; 0] = [];
    let err = prng.pick(&empty).expect_err("empty pick rejected");
    assert_eq!(err, PuzzleAssetsError::EmptyPick);
    assert_eq!(err.to_string(), v.pick_empty_error);
}

#[test]
fn equivalence_colour() {
    let v = vectors();
    for vector in &v.hsl_to_rgb {
        let context = format!("hsl({}, {}, {})", vector.h, vector.s, vector.l);
        check_rgb(
            &hsl_to_rgb(vector.h, vector.s, vector.l),
            &vector.rgb,
            &context,
        );
    }
    for vector in &v.contrast {
        let (a, b) = (rgb_of(&vector.a), rgb_of(&vector.b));
        let context = format!("{:?} vs {:?}", vector.a, vector.b);
        same(relative_luminance(&a), &vector.luminance_a, &context);
        same(contrast_ratio(&a, &b), &vector.contrast, &context);
        same(worst_case_contrast(&a, &b), &vector.worst_case, &context);
        for (vision, want) in VISION_TYPES.iter().zip(&vector.simulated_a) {
            check_rgb(&simulate_vision(&a, *vision), want, &context);
        }
    }
    for vector in &v.best_pair {
        let colours: Vec<Rgb> = vector
            .colours
            .iter()
            .map(|c| Rgb {
                r: f(&c[0]),
                g: f(&c[1]),
                b: f(&c[2]),
            })
            .collect();
        same(best_pair_contrast(&colours), &vector.best, "best pair");
    }
    for vector in &v.palettes {
        let mut prng = create_prng(&seed(&vector.seed)).expect("seed");
        let colours = draw_palette(&mut prng, vector.count);
        assert_eq!(colours.len(), vector.colours.len());
        for (colour, want) in colours.iter().zip(&vector.colours) {
            check_rgb(colour, want, &vector.seed);
        }
        same(prng.next(), &vector.next_after, &vector.seed);
    }
}

#[test]
fn equivalence_shapes() {
    let v = vectors();
    for (d, want) in &v.coverage {
        same(coverage_from_distance(f(d)), want, d);
    }
    for vector in &v.rim_geometry {
        let rim = piece_rim_geometry(vector.size);
        same(rim.plateau, &vector.plateau, "plateau");
        same(rim.width, &vector.width, "width");
    }
    for vector in &v.shapes {
        let mut prng = create_prng(&seed(&vector.seed)).expect("seed");
        let shape = create_notch_shape(&mut prng, vector.size);
        let mut grid = Vec::with_capacity((vector.size * vector.size * 8) as usize);
        for y in 0..vector.size {
            for x in 0..vector.size {
                grid.extend_from_slice(&shape.distance(f64::from(x), f64::from(y)).to_le_bytes());
            }
        }
        assert_eq!(
            hex::encode(Sha256::digest(&grid)),
            vector.grid_sha256,
            "shape {} size {}",
            vector.seed,
            vector.size
        );
        for sample in &vector.samples {
            same(shape.distance(sample.x, sample.y), &sample.d, &vector.seed);
        }
        same(prng.next(), &vector.next_after, &vector.seed);
    }
}

#[test]
fn equivalence_backgrounds() {
    for vector in &vectors().backgrounds {
        let mut prng = create_prng(&seed(&vector.seed)).expect("seed");
        let image = generate_background(&mut prng, vector.width, vector.height);
        let context = format!("{} {}x{}", vector.seed, vector.width, vector.height);
        check_image(&image, &vector.image, &context);
        same(prng.next(), &vector.next_after, &context);
    }
}

#[test]
fn equivalence_decoys() {
    let v = vectors();
    for vector in &v.decoys {
        let mut background = background_for(&vector.background_seed, vector.width, vector.height);
        let mut prng = create_prng(&seed(&vector.decoy_seed)).expect("seed");
        paint_decoys(
            &mut background,
            &mut prng,
            vector.target_count,
            vector.notch_size,
            &vector.notch.to_placement(),
            vector.edge_darkness,
            vector.body_brightness,
            vector.hole_darken,
        );
        check_image(&background, &vector.image, &vector.decoy_seed);
        same(prng.next(), &vector.next_after, &vector.decoy_seed);
    }
    for vector in &v.decoy_pieces {
        let mut background = background_for(&vector.background_seed, 300, 200);
        let mut prng = create_prng(&seed(&vector.decoy_seed)).expect("seed");
        paint_decoy_piece(
            &mut background,
            &mut prng,
            vector.size,
            vector.cx,
            vector.cy,
            vector.edge_darkness,
            vector.body_brightness,
            vector.hole_darken,
        );
        check_image(&background, &vector.image, &vector.decoy_seed);
    }
}

#[test]
fn equivalence_cuts() {
    for vector in &vectors().cuts {
        let mut prng = create_prng(&seed(&vector.seed)).expect("seed");
        let mut background = generate_background(&mut prng, vector.width, vector.height);
        let shape = create_notch_shape(&mut prng, vector.size);
        let piece = cut_notch(
            &mut prng,
            &mut background,
            &shape,
            vector.size,
            &vector.placement.to_placement(),
            vector.hole_darken,
        );
        let context = format!("{} size {}", vector.seed, vector.size);
        check_image(&background, &vector.background, &context);
        check_image(&piece, &vector.piece, &context);
        same(prng.next(), &vector.next_after, &context);
    }
}

#[test]
fn equivalence_renders() {
    for vector in &vectors().renders {
        let geometry = PuzzleGeometry {
            width: vector.geometry.width,
            height: vector.geometry.height,
            notch_size: vector.geometry.notch_size,
            piece_size: vector.geometry.piece_size,
        };
        let settings = PuzzleRenderSettings {
            decoy_count: vector.settings.decoy_count,
            decoy_edge_darkness: vector.settings.decoy_edge_darkness,
            decoy_body_brightness: vector.settings.decoy_body_brightness,
            hole_darken: vector.settings.hole_darken,
            decoy_hole_darken: vector.settings.decoy_hole_darken,
        };
        let background = background_for(&vector.background_seed, geometry.width, geometry.height);
        let rendered = render_puzzle_to_rgba(
            background,
            &vector.placement.to_placement(),
            &geometry,
            &settings,
            Some(seed(&vector.render_seed)),
        )
        .expect("render");
        let context = format!("{} / {}", vector.background_seed, vector.render_seed);
        check_image(&rendered.background, &vector.background, &context);
        check_image(&rendered.piece, &vector.piece, &context);
        assert_eq!(rendered.piece_size, vector.piece_size, "{context}");
        assert_eq!(rendered.seed, seed(&vector.render_seed));
    }
}
