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

// Ported from src/tests/iconOrderAssets.unit.test.ts

use std::collections::HashSet;

use prosopo_puzzle_assets::{create_prng, Prng, RgbaImage};

use crate::{
    composite_icons, glyph_path, grade_clicks, place_icons, render_icon_order, Click, GlyphKind,
    IconLayout, IconOrderAssetsError, IconOrderGeometry, IconOrderRenderSettings, IconPlacement,
    IconTargetGeometry, RenderedIconOrder, DEFAULT_GEOMETRY, DEFAULT_RENDER_SETTINGS, GLYPH_KINDS,
    LEGEND_ICON_SIZE,
};

fn seeded(byte: u8) -> Prng {
    create_prng(&[byte; 16]).expect("16-byte seed")
}

fn target(x: f64, y: f64, size: f64) -> IconTargetGeometry {
    IconTargetGeometry { x, y, size }
}

fn click(x: f64, y: f64) -> Click {
    Click { x, y }
}

fn all_icons(layout: &IconLayout) -> Vec<IconPlacement> {
    layout
        .targets
        .iter()
        .chain(&layout.decoys)
        .copied()
        .collect()
}

fn webp_size(webp: &[u8]) -> (u32, u32) {
    let decoded: webp::WebPImage = webp::Decoder::new(webp).decode().expect("webp decodes");
    (decoded.width(), decoded.height())
}

mod glyphs {
    use super::*;

    #[test]
    fn has_path_data_for_every_kind_in_the_vocabulary() {
        for kind in GLYPH_KINDS {
            assert!(!glyph_path(kind).is_empty(), "{kind}");
        }
    }

    #[test]
    fn exposes_every_enum_member_as_a_kind() {
        let every_variant = |kind: GlyphKind| -> GlyphKind {
            match kind {
                GlyphKind::Ring
                | GlyphKind::Spiral
                | GlyphKind::Chevron
                | GlyphKind::Bolt
                | GlyphKind::Cross
                | GlyphKind::Triangle
                | GlyphKind::Star
                | GlyphKind::Wave
                | GlyphKind::Square
                | GlyphKind::Arc => kind,
            }
        };
        let mut names: Vec<&str> = GLYPH_KINDS
            .into_iter()
            .map(|kind: GlyphKind| every_variant(kind).as_str())
            .collect();
        names.sort_unstable();
        assert_eq!(
            names,
            vec![
                "arc", "bolt", "chevron", "cross", "ring", "spiral", "square", "star", "triangle",
                "wave"
            ]
        );
        for name in names {
            assert_eq!(
                name.parse::<GlyphKind>().expect("known kind").as_str(),
                name
            );
        }
    }
}

mod place_icons {
    use super::*;

    #[test]
    fn returns_the_requested_number_of_targets_and_decoys() {
        let layout: IconLayout =
            place_icons(&mut seeded(7), &DEFAULT_GEOMETRY, 3, 4).expect("places");
        assert_eq!(layout.targets.len(), 3);
        assert_eq!(layout.decoys.len(), 4);
    }

    #[test]
    fn gives_every_icon_on_the_frame_a_distinct_glyph_so_the_legend_is_unambiguous() {
        let layout: IconLayout =
            place_icons(&mut seeded(11), &DEFAULT_GEOMETRY, 3, 5).expect("places");
        let kinds: Vec<GlyphKind> = all_icons(&layout)
            .iter()
            .map(|icon: &IconPlacement| icon.kind)
            .collect();
        let distinct: HashSet<GlyphKind> = kinds.iter().copied().collect();
        assert_eq!(distinct.len(), kinds.len());
    }

    #[test]
    fn keeps_whole_icons_inside_the_frame() {
        let layout: IconLayout =
            place_icons(&mut seeded(3), &DEFAULT_GEOMETRY, 3, 4).expect("places");
        for icon in all_icons(&layout) {
            assert!(icon.x >= 0.0);
            assert!(icon.y >= 0.0);
            assert!(icon.x <= f64::from(DEFAULT_GEOMETRY.width));
            assert!(icon.y <= f64::from(DEFAULT_GEOMETRY.height));
        }
    }

    #[test]
    fn separates_icons_so_no_click_can_fall_inside_two_hit_radii() {
        let layout: IconLayout =
            place_icons(&mut seeded(23), &DEFAULT_GEOMETRY, 3, 4).expect("places");
        let icons: Vec<IconPlacement> = all_icons(&layout);
        for (i, a) in icons.iter().enumerate() {
            for b in &icons[i + 1..] {
                assert!((a.x - b.x).hypot(a.y - b.y) >= 1.15 * a.size.max(b.size));
            }
        }
    }

    #[test]
    fn throws_rather_than_shortening_the_answer_when_a_target_cannot_be_placed() {
        let cramped: IconOrderGeometry = IconOrderGeometry {
            width: 60,
            height: 60,
            icon_size: 50.0,
        };
        let error: IconOrderAssetsError =
            place_icons(&mut seeded(5), &cramped, 3, 0).expect_err("cannot place");
        assert!(
            error.to_string().contains("could not place target icon"),
            "{error}"
        );
    }

    #[test]
    fn drops_decoys_rather_than_failing_when_the_frame_is_crowded() {
        let cramped: IconOrderGeometry = IconOrderGeometry {
            width: 120,
            height: 90,
            icon_size: 34.0,
        };
        let layout: IconLayout = place_icons(&mut seeded(9), &cramped, 2, 6).expect("places");
        assert_eq!(layout.targets.len(), 2);
        assert!(layout.decoys.len() < 6);
    }

    #[test]
    fn refuses_to_ask_for_more_distinct_glyphs_than_exist() {
        let error: IconOrderAssetsError =
            place_icons(&mut seeded(1), &DEFAULT_GEOMETRY, 3, GLYPH_KINDS.len())
                .expect_err("too many glyphs");
        let message: String = error.to_string();
        let count: &str = message
            .split_once("only ")
            .and_then(|(_, rest): (&str, &str)| rest.strip_suffix(" exist"))
            .unwrap_or_else(|| panic!("{message}"));
        assert!(
            !count.is_empty() && count.chars().all(|c: char| c.is_ascii_digit()),
            "{message}"
        );
    }
}

mod grade_clicks {
    use super::*;

    const TOLERANCE: f64 = 0.6;

    fn targets() -> [IconTargetGeometry; 3] {
        [
            target(50.0, 50.0, 40.0),
            target(150.0, 60.0, 40.0),
            target(240.0, 150.0, 40.0),
        ]
    }

    #[test]
    fn accepts_exact_clicks_in_the_right_order() {
        let clicks: [Click; 3] = [click(50.0, 50.0), click(150.0, 60.0), click(240.0, 150.0)];
        assert!(grade_clicks(&targets(), &clicks, TOLERANCE));
    }

    #[test]
    fn accepts_clicks_inside_the_hit_radius() {
        let clicks: [Click; 3] = [click(58.0, 55.0), click(143.0, 66.0), click(246.0, 143.0)];
        assert!(grade_clicks(&targets(), &clicks, TOLERANCE));
    }

    #[test]
    fn rejects_the_right_icons_clicked_in_the_wrong_order() {
        let clicks: [Click; 3] = [click(150.0, 60.0), click(50.0, 50.0), click(240.0, 150.0)];
        assert!(!grade_clicks(&targets(), &clicks, TOLERANCE));
    }

    #[test]
    fn rejects_a_click_outside_the_hit_radius() {
        let clicks: [Click; 3] = [click(50.0, 50.0), click(150.0, 60.0), click(240.0, 190.0)];
        assert!(!grade_clicks(&targets(), &clicks, TOLERANCE));
    }

    #[test]
    fn rejects_too_few_and_too_many_clicks() {
        let too_few: [Click; 2] = [click(50.0, 50.0), click(150.0, 60.0)];
        assert!(!grade_clicks(&targets(), &too_few, TOLERANCE));
        let too_many: [Click; 4] = [
            click(50.0, 50.0),
            click(150.0, 60.0),
            click(240.0, 150.0),
            click(240.0, 150.0),
        ];
        assert!(!grade_clicks(&targets(), &too_many, TOLERANCE));
    }

    #[test]
    fn scales_the_hit_radius_with_the_icon_so_jittered_sizes_are_equally_hittable() {
        let small: [IconTargetGeometry; 1] = [target(100.0, 100.0, 20.0)];
        let large: [IconTargetGeometry; 1] = [target(100.0, 100.0, 60.0)];
        let clicks: [Click; 1] = [click(118.0, 100.0)];
        assert!(!grade_clicks(&small, &clicks, 0.6));
        assert!(grade_clicks(&large, &clicks, 0.6));
    }
}

mod the_collage_background {
    use super::*;

    fn edge_energy(image: &RgbaImage) -> f64 {
        let width: usize = image.width as usize;
        let mut total: u64 = 0;
        let mut count: u64 = 0;
        for row in image.data.chunks_exact(width * 4) {
            let pixels: &[[u8; 4]] = row.as_chunks::<4>().0;
            for (prev, pixel) in pixels.iter().zip(&pixels[1..]) {
                for c in 0..3 {
                    total += u64::from(pixel[c].abs_diff(prev[c]));
                    count += 1;
                }
            }
        }
        total as f64 / count as f64
    }

    fn frame_at(background_clutter: f64) -> RgbaImage {
        let settings: IconOrderRenderSettings = IconOrderRenderSettings {
            background_clutter,
            ..DEFAULT_RENDER_SETTINGS
        };
        composite_icons(&mut seeded(7), &[], &DEFAULT_GEOMETRY, &settings).expect("composites")
    }

    #[test]
    fn puts_more_edges_on_the_frame_as_clutter_rises() {
        assert!(edge_energy(&frame_at(20.0)) > edge_energy(&frame_at(0.0)));
    }

    #[test]
    fn still_renders_at_zero_clutter_as_the_operator_escape_hatch() {
        let settings: IconOrderRenderSettings = IconOrderRenderSettings {
            background_clutter: 0.0,
            ..DEFAULT_RENDER_SETTINGS
        };
        let challenge: RenderedIconOrder =
            render_icon_order(&DEFAULT_GEOMETRY, &settings, None).expect("renders");
        assert_eq!(webp_size(&challenge.background).0, DEFAULT_GEOMETRY.width);
        assert_eq!(
            challenge.targets.len(),
            DEFAULT_RENDER_SETTINGS.target_count
        );
    }
}

mod render_icon_order {
    use super::*;

    #[test]
    fn renders_a_frame_and_a_legend_sized_to_the_target_count() {
        let challenge: RenderedIconOrder =
            render_icon_order(&DEFAULT_GEOMETRY, &DEFAULT_RENDER_SETTINGS, None).expect("renders");

        assert_eq!(
            webp_size(&challenge.background),
            (DEFAULT_GEOMETRY.width, DEFAULT_GEOMETRY.height)
        );

        let (legend_width, legend_height): (u32, u32) = webp_size(&challenge.legend);
        assert_eq!(legend_height, LEGEND_ICON_SIZE);
        assert_eq!(
            legend_width,
            DEFAULT_RENDER_SETTINGS.target_count as u32 * (LEGEND_ICON_SIZE + 6) - 6
        );

        assert_eq!(
            challenge.targets.len(),
            DEFAULT_RENDER_SETTINGS.target_count
        );
        assert_eq!(challenge.legend_icon_size, LEGEND_ICON_SIZE);
    }

    #[test]
    fn produces_a_different_frame_every_call_so_a_background_is_never_reused() {
        let a: RenderedIconOrder =
            render_icon_order(&DEFAULT_GEOMETRY, &DEFAULT_RENDER_SETTINGS, None).expect("renders");
        let b: RenderedIconOrder =
            render_icon_order(&DEFAULT_GEOMETRY, &DEFAULT_RENDER_SETTINGS, None).expect("renders");
        assert_ne!(a.background, b.background);
    }

    #[test]
    fn honours_the_target_and_decoy_counts_it_is_given() {
        let settings: IconOrderRenderSettings = IconOrderRenderSettings {
            target_count: 4,
            decoy_count: 2,
            ..DEFAULT_RENDER_SETTINGS
        };
        let challenge: RenderedIconOrder =
            render_icon_order(&DEFAULT_GEOMETRY, &settings, None).expect("renders");
        assert_eq!(challenge.targets.len(), 4);
        assert_eq!(
            webp_size(&challenge.legend).0,
            4 * (LEGEND_ICON_SIZE + 6) - 6
        );
    }
}
