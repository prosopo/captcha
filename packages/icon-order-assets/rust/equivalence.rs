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

use std::collections::BTreeSet;
use std::sync::OnceLock;

use base64::Engine;
use prosopo_puzzle_assets::{create_prng, Prng, RgbaImage};
use serde::Deserialize;
use serde_json::Value;
use sha2::{Digest, Sha256};

use crate::compose::{add_grain, frame_svg, legend_svg, rasterise};
use crate::{
    collage_markup, grade_clicks, jsmath, place_icons, shuffle, Click, GlyphKind, IconLayout,
    IconOrderAssetsError, IconOrderGeometry, IconOrderRenderSettings, IconPlacement,
    IconTargetGeometry, GLYPH_KINDS, LEGEND_ICON_SIZE,
};

const VECTORS: &str = include_str!("equivalence/vectors.json");

const SECTIONS: [&str; 10] = [
    "numberFormat",
    "trig",
    "hypot",
    "glyphs",
    "shuffle",
    "collage",
    "place",
    "placeDigests",
    "frames",
    "grade",
];

/// resvg and librsvg compute antialiasing coverage differently, and round
/// opacity blending differently by a level or two, so rasterised pixels are
/// compared to the recorded librsvg output within bounds rather than exactly.
/// Measured worst cases: frame max 37, 10.93% beyond rounding, mean 0.493;
/// legend max 37, 17.39% beyond rounding, mean 0.787. A misplaced or
/// miscoloured shape would push the maximum towards 255 and the mean well up.
struct RasterTolerance {
    max_channel: u8,
    max_beyond_rounding_fraction: f64,
    max_mean_channel: f64,
}

/// A difference this small is blending rounding, not coverage.
const ROUNDING_DIFF: u8 = 2;

const FRAME_TOLERANCE: RasterTolerance = RasterTolerance {
    max_channel: 40,
    max_beyond_rounding_fraction: 0.12,
    max_mean_channel: 0.6,
};

/// The legend strip is small and mostly glyph edges, so far more of its
/// pixels are antialiased than the frame's.
const LEGEND_TOLERANCE: RasterTolerance = RasterTolerance {
    max_channel: 40,
    max_beyond_rounding_fraction: 0.19,
    max_mean_channel: 0.9,
};

/// IEEE-754 bits of an f64 as big-endian hex.
type Bits = String;

fn f(bits: &str) -> f64 {
    f64::from_bits(u64::from_str_radix(bits, 16).expect("hex float bits"))
}

fn same(actual: f64, expected: &str, context: &str) {
    // JS cannot observe a NaN's sign or payload, and the one V8's DataView
    // writes depends on the CPU's default NaN, so any NaN matches any NaN.
    if f(expected).is_nan() {
        assert!(actual.is_nan(), "{context}: got {actual:e}, want NaN");
        return;
    }
    assert_eq!(
        actual.to_bits(),
        f(expected).to_bits(),
        "{context}: got {actual:e}, want {:e}",
        f(expected)
    );
}

fn seeded(hex_seed: &str) -> Prng {
    create_prng(&hex::decode(hex_seed).expect("hex seed")).expect("16-byte seed")
}

/// `seedAt` in generate.ts.
fn seed_at(i: u32) -> Vec<u8> {
    let words: [u32; 4] = [
        (u64::from(i) * 2_654_435_761) as u32,
        (u64::from(i) * 40_503 + 7) as u32,
        i ^ 0x9e37_79b9,
        (u64::from(i) * 97 + 13) as u32,
    ];
    words.iter().flat_map(|w: &u32| w.to_le_bytes()).collect()
}

fn sha256_hex(bytes: &[u8]) -> String {
    hex::encode(Sha256::digest(bytes))
}

fn kind(name: &str) -> GlyphKind {
    name.parse().unwrap_or_else(|e| panic!("{e}"))
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
struct GeometryVector {
    width: u32,
    height: u32,
    icon_size: Bits,
}

impl GeometryVector {
    fn geometry(&self) -> IconOrderGeometry {
        IconOrderGeometry {
            width: self.width,
            height: self.height,
            icon_size: f(&self.icon_size),
        }
    }
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
struct SettingsVector {
    target_count: usize,
    decoy_count: usize,
    stroke_width: Bits,
    icon_opacity: Bits,
    halo_opacity: Bits,
    background_clutter: Bits,
}

impl SettingsVector {
    fn settings(&self) -> IconOrderRenderSettings {
        IconOrderRenderSettings {
            target_count: self.target_count,
            decoy_count: self.decoy_count,
            stroke_width: f(&self.stroke_width),
            icon_opacity: f(&self.icon_opacity),
            halo_opacity: f(&self.halo_opacity),
            background_clutter: f(&self.background_clutter),
        }
    }
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
struct PlacementVector {
    x: Bits,
    y: Bits,
    kind: String,
    rotation: Bits,
    hue: Bits,
    size: Bits,
}

fn check_placement(actual: &IconPlacement, expected: &PlacementVector, context: &str) {
    assert_eq!(actual.kind.as_str(), expected.kind, "{context}: kind");
    same(actual.x, &expected.x, &format!("{context}: x"));
    same(actual.y, &expected.y, &format!("{context}: y"));
    same(
        actual.rotation,
        &expected.rotation,
        &format!("{context}: rotation"),
    );
    same(actual.hue, &expected.hue, &format!("{context}: hue"));
    same(actual.size, &expected.size, &format!("{context}: size"));
}

fn check_placements(actual: &[IconPlacement], expected: &[PlacementVector], context: &str) {
    assert_eq!(actual.len(), expected.len(), "{context}: count");
    for (i, (a, e)) in actual.iter().zip(expected).enumerate() {
        check_placement(a, e, &format!("{context}[{i}]"));
    }
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct GlyphVectors {
    kinds: Vec<String>,
    paths: Vec<String>,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
struct ShuffleVector {
    seed: String,
    length: usize,
    order: Vec<usize>,
    next_after: Bits,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
struct CollageVector {
    seed: String,
    width: u32,
    height: u32,
    clutter: Bits,
    sha256: String,
    length: usize,
    markup: Option<String>,
    next_after: Bits,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
struct PlaceVector {
    seed: String,
    geometry: GeometryVector,
    target_count: usize,
    decoy_count: usize,
    targets: Option<Vec<PlacementVector>>,
    decoys: Option<Vec<PlacementVector>>,
    error: Option<String>,
    next_after: Bits,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
struct PlaceDigestVector {
    geometry: GeometryVector,
    target_count: usize,
    decoy_count: usize,
    seeds: u32,
    failures: u32,
    sha256: String,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct RasterVector {
    frame: String,
    legend: String,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
struct FrameVector {
    seed: String,
    geometry: GeometryVector,
    settings: SettingsVector,
    target_kinds: Vec<String>,
    svg_sha256: String,
    svg_length: usize,
    svg: Option<String>,
    legend_width: u32,
    legend_svg_sha256: String,
    legend_svg_length: usize,
    legend_svg: Option<String>,
    composite_sha256: String,
    next_after: Bits,
    raster: Option<RasterVector>,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct TargetVector {
    x: Bits,
    y: Bits,
    size: Bits,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct ClickVector {
    x: Bits,
    y: Bits,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct GradeVector {
    targets: Vec<TargetVector>,
    clicks: Vec<ClickVector>,
    tolerance: Bits,
    result: bool,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
struct Vectors {
    number_format: Vec<(Bits, String)>,
    trig: Vec<(Bits, Bits, Bits)>,
    hypot: Vec<(Bits, Bits, Bits)>,
    glyphs: GlyphVectors,
    shuffle: Vec<ShuffleVector>,
    collage: Vec<CollageVector>,
    place: Vec<PlaceVector>,
    place_digests: Vec<PlaceDigestVector>,
    frames: Vec<FrameVector>,
    grade: Vec<GradeVector>,
}

fn vectors() -> &'static Vectors {
    static PARSED: OnceLock<Vectors> = OnceLock::new();
    PARSED.get_or_init(|| serde_json::from_str(VECTORS).expect("vectors.json parses"))
}

fn non_empty<T>(cases: &[T], name: &str) {
    assert!(!cases.is_empty(), "section {name} has no cases");
}

#[test]
fn equivalence_sections() {
    let raw: serde_json::Map<String, Value> =
        serde_json::from_str(VECTORS).expect("vectors.json parses");
    let in_file: BTreeSet<&str> = raw.keys().map(String::as_str).collect();
    let replayed: BTreeSet<&str> = SECTIONS.into_iter().collect();
    assert_eq!(in_file, replayed);

    let v: &Vectors = vectors();
    non_empty(&v.number_format, "numberFormat");
    non_empty(&v.trig, "trig");
    non_empty(&v.hypot, "hypot");
    non_empty(&v.glyphs.kinds, "glyphs.kinds");
    non_empty(&v.glyphs.paths, "glyphs.paths");
    non_empty(&v.shuffle, "shuffle");
    non_empty(&v.collage, "collage");
    non_empty(&v.place, "place");
    non_empty(&v.place_digests, "placeDigests");
    non_empty(&v.frames, "frames");
    non_empty(&v.grade, "grade");

    assert!(v.place.iter().any(|c: &PlaceVector| c.error.is_some()));
    assert!(v.place.iter().any(|c: &PlaceVector| c.error.is_none()));
    assert!(v.frames.iter().any(|c: &FrameVector| c.raster.is_some()));
    assert!(v.grade.iter().any(|c: &GradeVector| c.result));
    assert!(v.grade.iter().any(|c: &GradeVector| !c.result));
}

#[test]
fn equivalence_number_format() {
    for (input, expected) in &vectors().number_format {
        assert_eq!(jsmath::to_js_string(f(input)), *expected, "String({input})");
    }
}

#[test]
fn equivalence_trig() {
    for (input, cos, sin) in &vectors().trig {
        let x: f64 = f(input);
        same(jsmath::cos(x), cos, &format!("cos({x:e})"));
        same(jsmath::sin(x), sin, &format!("sin({x:e})"));
    }
}

#[test]
fn equivalence_hypot() {
    for (a, b, expected) in &vectors().hypot {
        same(
            jsmath::hypot(f(a), f(b)),
            expected,
            &format!("hypot({:e}, {:e})", f(a), f(b)),
        );
    }
}

#[test]
fn equivalence_glyphs() {
    let glyphs: &GlyphVectors = &vectors().glyphs;
    let kinds: Vec<&str> = GLYPH_KINDS.iter().map(|k: &GlyphKind| k.as_str()).collect();
    assert_eq!(kinds, glyphs.kinds);
    assert_eq!(glyphs.kinds.len(), glyphs.paths.len());
    for (name, path) in glyphs.kinds.iter().zip(&glyphs.paths) {
        assert_eq!(crate::glyph_path(kind(name)), path, "glyph {name}");
    }
}

#[test]
fn equivalence_shuffle() {
    for (i, case) in vectors().shuffle.iter().enumerate() {
        let context: String = format!("shuffle[{i}] length {}", case.length);
        let mut prng: Prng = seeded(&case.seed);
        let items: Vec<usize> = (0..case.length).collect();
        assert_eq!(shuffle(&mut prng, &items), case.order, "{context}: order");
        same(
            prng.next(),
            &case.next_after,
            &format!("{context}: next draw"),
        );
    }
}

#[test]
fn equivalence_collage() {
    for (i, case) in vectors().collage.iter().enumerate() {
        let context: String = format!(
            "collage[{i}] {}x{} clutter {:e}",
            case.width,
            case.height,
            f(&case.clutter)
        );
        let geometry: IconOrderGeometry = IconOrderGeometry {
            width: case.width,
            height: case.height,
            icon_size: 38.0,
        };
        let mut prng: Prng = seeded(&case.seed);
        let markup: String = collage_markup(&mut prng, &geometry, f(&case.clutter));
        if let Some(expected) = &case.markup {
            assert_eq!(&markup, expected, "{context}: markup");
        }
        assert_eq!(markup.len(), case.length, "{context}: length");
        assert_eq!(
            sha256_hex(markup.as_bytes()),
            case.sha256,
            "{context}: sha256"
        );
        same(
            prng.next(),
            &case.next_after,
            &format!("{context}: next draw"),
        );
    }
}

#[test]
fn equivalence_place() {
    for (i, case) in vectors().place.iter().enumerate() {
        let geometry: IconOrderGeometry = case.geometry.geometry();
        let context: String = format!(
            "place[{i}] {geometry:?} {}+{}",
            case.target_count, case.decoy_count
        );
        let mut prng: Prng = seeded(&case.seed);
        let result: Result<IconLayout, IconOrderAssetsError> =
            place_icons(&mut prng, &geometry, case.target_count, case.decoy_count);
        match (&result, &case.error) {
            (Ok(layout), None) => {
                let targets: &[PlacementVector] = case.targets.as_deref().expect("targets");
                let decoys: &[PlacementVector] = case.decoys.as_deref().expect("decoys");
                check_placements(&layout.targets, targets, &format!("{context}: targets"));
                check_placements(&layout.decoys, decoys, &format!("{context}: decoys"));
            }
            (Err(error), Some(message)) => {
                assert!(case.targets.is_none() && case.decoys.is_none());
                assert_eq!(&error.to_string(), message, "{context}: error");
            }
            (actual, expected) => panic!("{context}: got {actual:?}, want error {expected:?}"),
        }
        same(
            prng.next(),
            &case.next_after,
            &format!("{context}: next draw"),
        );
    }
}

fn placement_bytes(placement: &IconPlacement) -> Vec<u8> {
    let index: usize = GLYPH_KINDS
        .iter()
        .position(|k: &GlyphKind| *k == placement.kind)
        .expect("known kind");
    [
        placement.x,
        placement.y,
        placement.rotation,
        placement.hue,
        placement.size,
    ]
    .iter()
    .flat_map(|v: &f64| v.to_le_bytes())
    .chain([index as u8])
    .collect()
}

#[test]
fn equivalence_seed_at_matches_generator() {
    for (c, case) in vectors().place.iter().enumerate() {
        let i: u32 = 1000 + (c as u32 / 2) * 10 + c as u32 % 2;
        assert_eq!(hex::encode(seed_at(i)), case.seed, "seedAt({i})");
    }
}

#[test]
fn equivalence_place_digests() {
    for (c, case) in vectors().place_digests.iter().enumerate() {
        let geometry: IconOrderGeometry = case.geometry.geometry();
        let mut hash: Sha256 = Sha256::new();
        let mut failures: u32 = 0;
        for i in 0..case.seeds {
            let mut prng: Prng = create_prng(&seed_at(10_000 + i)).expect("seed");
            match place_icons(&mut prng, &geometry, case.target_count, case.decoy_count) {
                Ok(layout) => {
                    for placement in &layout.targets {
                        hash.update(placement_bytes(placement));
                    }
                    hash.update([0xff]);
                    for placement in &layout.decoys {
                        hash.update(placement_bytes(placement));
                    }
                }
                Err(error) => {
                    failures += 1;
                    hash.update([0xee]);
                    hash.update(error.to_string().as_bytes());
                }
            }
            hash.update(prng.next().to_le_bytes());
            hash.update([0xfe]);
        }
        let context: String = format!(
            "placeDigests[{c}] {geometry:?} {}+{}",
            case.target_count, case.decoy_count
        );
        assert_eq!(failures, case.failures, "{context}: failures");
        assert_eq!(
            hex::encode(hash.finalize()),
            case.sha256,
            "{context}: digest"
        );
    }
}

fn decode_png(base64_png: &str) -> RgbaImage {
    let bytes: Vec<u8> = base64::engine::general_purpose::STANDARD
        .decode(base64_png)
        .expect("base64 png");
    let mut reader = png::Decoder::new(bytes.as_slice())
        .read_info()
        .expect("png header");
    let mut data: Vec<u8> = vec![0; reader.output_buffer_size()];
    let info: png::OutputInfo = reader.next_frame(&mut data).expect("png frame");
    assert_eq!(info.color_type, png::ColorType::Rgba);
    assert_eq!(info.bit_depth, png::BitDepth::Eight);
    data.truncate(info.buffer_size());
    RgbaImage {
        data,
        width: info.width,
        height: info.height,
    }
}

struct PixelDiff {
    max_channel: u8,
    beyond_rounding_fraction: f64,
    mean_channel: f64,
}

fn premultiplied(pixel: &[u8; 4]) -> [u8; 4] {
    let alpha: u32 = u32::from(pixel[3]);
    let scale = |c: u8| -> u8 { ((u32::from(c) * alpha + 127) / 255) as u8 };
    [scale(pixel[0]), scale(pixel[1]), scale(pixel[2]), pixel[3]]
}

/// Compared premultiplied, because an antialiased edge pixel with alpha near
/// zero has an arbitrary straight colour that contributes nothing visible.
fn pixel_diff(actual: &RgbaImage, expected: &RgbaImage) -> PixelDiff {
    assert_eq!(
        (actual.width, actual.height),
        (expected.width, expected.height)
    );
    let mut max_channel: u8 = 0;
    let mut beyond_rounding: usize = 0;
    let mut total: u64 = 0;
    for (a, e) in actual
        .data
        .as_chunks::<4>()
        .0
        .iter()
        .zip(expected.data.as_chunks::<4>().0)
    {
        let (a, e): ([u8; 4], [u8; 4]) = (premultiplied(a), premultiplied(e));
        let diffs: [u8; 4] = [0, 1, 2, 3].map(|c: usize| a[c].abs_diff(e[c]));
        let worst: u8 = diffs.into_iter().max().unwrap_or(0);
        total += diffs.iter().map(|d: &u8| u64::from(*d)).sum::<u64>();
        max_channel = max_channel.max(worst);
        if worst > ROUNDING_DIFF {
            beyond_rounding += 1;
        }
    }
    PixelDiff {
        max_channel,
        beyond_rounding_fraction: beyond_rounding as f64 / (actual.data.len() / 4) as f64,
        mean_channel: total as f64 / actual.data.len() as f64,
    }
}

fn check_raster(
    actual: &RgbaImage,
    expected: &RgbaImage,
    tolerance: &RasterTolerance,
    context: &str,
) {
    let diff: PixelDiff = pixel_diff(actual, expected);
    eprintln!(
        "{context}: max channel diff {}, pixels beyond rounding {:.2}%, mean channel diff {:.3}",
        diff.max_channel,
        diff.beyond_rounding_fraction * 100.0,
        diff.mean_channel
    );
    assert!(
        diff.max_channel <= tolerance.max_channel
            && diff.beyond_rounding_fraction <= tolerance.max_beyond_rounding_fraction
            && diff.mean_channel <= tolerance.max_mean_channel,
        "{context}: max channel diff {}, beyond rounding {}, mean {}",
        diff.max_channel,
        diff.beyond_rounding_fraction,
        diff.mean_channel
    );
}

/// Replays `compositeIcons` and `renderLegend` step by step. The markup, the
/// draws and the grain are exact; the rasterised pixels come from resvg, not
/// librsvg, so they are compared to the recorded librsvg output within the
/// tolerance above, and the grain is checked exactly by applying it to the
/// recorded librsvg raster.
#[test]
fn equivalence_frames() {
    for (n, case) in vectors().frames.iter().enumerate() {
        let geometry: IconOrderGeometry = case.geometry.geometry();
        let settings: IconOrderRenderSettings = case.settings.settings();
        let context: String = format!("frames[{n}] {settings:?}");
        let mut prng: Prng = seeded(&case.seed);
        let layout: IconLayout = place_icons(
            &mut prng,
            &geometry,
            settings.target_count,
            settings.decoy_count,
        )
        .unwrap_or_else(|e: IconOrderAssetsError| panic!("{context}: {e}"));
        let kinds: Vec<&str> = layout
            .targets
            .iter()
            .map(|t: &IconPlacement| t.kind.as_str())
            .collect();
        assert_eq!(kinds, case.target_kinds, "{context}: target kinds");

        let icons: Vec<IconPlacement> = layout
            .targets
            .iter()
            .chain(&layout.decoys)
            .copied()
            .collect();
        let svg: String = frame_svg(&mut prng, &icons, &geometry, &settings);
        if let Some(expected) = &case.svg {
            assert_eq!(&svg, expected, "{context}: svg");
        }
        assert_eq!(svg.len(), case.svg_length, "{context}: svg length");
        assert_eq!(
            sha256_hex(svg.as_bytes()),
            case.svg_sha256,
            "{context}: svg"
        );

        let (legend, legend_width): (String, u32) =
            legend_svg(&layout.targets, LEGEND_ICON_SIZE, &settings);
        assert_eq!(legend_width, case.legend_width, "{context}: legend width");
        if let Some(expected) = &case.legend_svg {
            assert_eq!(&legend, expected, "{context}: legend svg");
        }
        assert_eq!(
            legend.len(),
            case.legend_svg_length,
            "{context}: legend svg length"
        );
        assert_eq!(
            sha256_hex(legend.as_bytes()),
            case.legend_svg_sha256,
            "{context}: legend svg"
        );

        let grain_start: Prng = prng.clone();
        let frame: RgbaImage = rasterise(&svg, geometry.width, geometry.height)
            .unwrap_or_else(|e: IconOrderAssetsError| panic!("{context}: {e}"));
        let composite: RgbaImage = add_grain(&mut prng, frame.clone());
        assert_eq!(
            (composite.width, composite.height),
            (geometry.width, geometry.height)
        );
        same(
            prng.next(),
            &case.next_after,
            &format!("{context}: next draw"),
        );
        let legend_image: RgbaImage = rasterise(&legend, legend_width, LEGEND_ICON_SIZE)
            .unwrap_or_else(|e: IconOrderAssetsError| panic!("{context}: {e}"));

        if let Some(raster) = &case.raster {
            let ts_frame: RgbaImage = decode_png(&raster.frame);
            let ts_legend: RgbaImage = decode_png(&raster.legend);
            check_raster(
                &frame,
                &ts_frame,
                &FRAME_TOLERANCE,
                &format!("{context}: frame"),
            );
            check_raster(
                &legend_image,
                &ts_legend,
                &LEGEND_TOLERANCE,
                &format!("{context}: legend"),
            );
            let ts_composite: RgbaImage = add_grain(&mut grain_start.clone(), ts_frame);
            assert_eq!(
                sha256_hex(&ts_composite.data),
                case.composite_sha256,
                "{context}: grain over the librsvg raster"
            );
        }
    }
}

#[test]
fn equivalence_grade() {
    for (i, case) in vectors().grade.iter().enumerate() {
        let targets: Vec<IconTargetGeometry> = case
            .targets
            .iter()
            .map(|t: &TargetVector| IconTargetGeometry {
                x: f(&t.x),
                y: f(&t.y),
                size: f(&t.size),
            })
            .collect();
        let clicks: Vec<Click> = case
            .clicks
            .iter()
            .map(|c: &ClickVector| Click {
                x: f(&c.x),
                y: f(&c.y),
            })
            .collect();
        assert_eq!(
            grade_clicks(&targets, &clicks, f(&case.tolerance)),
            case.result,
            "grade[{i}] {targets:?} {clicks:?} tolerance {:e}",
            f(&case.tolerance)
        );
    }
}
