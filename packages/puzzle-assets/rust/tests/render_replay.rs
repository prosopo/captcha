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

// Ported from src/tests/renderReplay.unit.test.ts

use crate::{
    create_background, render_puzzle, NotchPlacement, PuzzleGeometry, PuzzleRenderSettings,
    RenderedPuzzle, DEFAULT_GEOMETRY, DEFAULT_RENDER_SETTINGS,
};

fn hex_seed(hex_seed: &str) -> Vec<u8> {
    hex::decode(hex_seed).unwrap()
}

fn background_seed() -> Vec<u8> {
    hex_seed("00112233445566778899aabbccddeeff")
}

fn render_seed() -> Vec<u8> {
    hex_seed("ffeeddccbbaa99887766554433221100")
}

const PLACEMENT: NotchPlacement = NotchPlacement {
    target_x: 191.0,
    target_y: 77.0,
};

#[derive(Default)]
struct Overrides {
    background_seed: Option<Vec<u8>>,
    render_seed: Option<Vec<u8>>,
    placement: Option<NotchPlacement>,
    geometry: Option<PuzzleGeometry>,
    settings: Option<PuzzleRenderSettings>,
}

fn render(overrides: Overrides) -> RenderedPuzzle {
    let geometry = overrides.geometry.unwrap_or(DEFAULT_GEOMETRY);
    render_puzzle(
        create_background(
            &geometry,
            &overrides.background_seed.unwrap_or_else(background_seed),
        )
        .unwrap(),
        &overrides.placement.unwrap_or(PLACEMENT),
        &geometry,
        &overrides.settings.unwrap_or(DEFAULT_RENDER_SETTINGS),
        Some(overrides.render_seed.unwrap_or_else(render_seed)),
    )
    .unwrap()
}

#[test]
fn reproduces_the_same_imagery_from_the_same_stored_inputs() {
    let served = render(Overrides::default());
    let replayed = render(Overrides::default());
    assert_eq!(replayed.background, served.background);
    assert_eq!(replayed.piece, served.piece);
    assert_eq!(replayed.piece_size, served.piece_size);
}

#[test]
fn returns_the_render_seed_it_was_given_so_the_record_can_store_it() {
    assert_eq!(render(Overrides::default()).seed, render_seed());
}

#[test]
fn mints_a_fresh_render_seed_when_none_is_supplied() {
    let draw = || {
        render_puzzle(
            create_background(&DEFAULT_GEOMETRY, &background_seed()).unwrap(),
            &PLACEMENT,
            &DEFAULT_GEOMETRY,
            &DEFAULT_RENDER_SETTINGS,
            None,
        )
        .unwrap()
    };
    let first = draw();
    let second = draw();
    assert_ne!(first.seed, second.seed);
    assert_ne!(first.background, second.background);
}

#[test]
fn changes_the_imagery_when_only_the_background_seed_differs() {
    let served = render(Overrides::default());
    let other = render(Overrides {
        background_seed: Some(hex_seed("0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f")),
        ..Overrides::default()
    });
    assert_ne!(other.background, served.background);
}

#[test]
fn changes_the_imagery_when_only_the_render_seed_differs() {
    let served = render(Overrides::default());
    let other = render(Overrides {
        render_seed: Some(hex_seed("0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f")),
        ..Overrides::default()
    });
    assert_ne!(other.background, served.background);
}

#[test]
fn changes_the_imagery_when_only_the_piece_size_differs() {
    let served = render(Overrides::default());
    let other = render(Overrides {
        geometry: Some(PuzzleGeometry {
            piece_size: Some(61),
            ..DEFAULT_GEOMETRY
        }),
        ..Overrides::default()
    });
    assert_ne!(other.piece_size, served.piece_size);
    assert_ne!(other.piece, served.piece);
}

#[test]
fn changes_the_imagery_when_only_the_notch_placement_differs() {
    let served = render(Overrides::default());
    let other = render(Overrides {
        placement: Some(NotchPlacement {
            target_x: PLACEMENT.target_x + 30.0,
            target_y: PLACEMENT.target_y,
        }),
        ..Overrides::default()
    });
    assert_ne!(other.background, served.background);
}

fn assert_setting_changes_imagery(settings: PuzzleRenderSettings) {
    let served = render(Overrides::default());
    let other = render(Overrides {
        settings: Some(settings),
        ..Overrides::default()
    });
    assert_ne!(other.background, served.background);
}

#[test]
fn changes_the_imagery_when_only_decoy_count_differs() {
    assert_setting_changes_imagery(PuzzleRenderSettings {
        decoy_count: DEFAULT_RENDER_SETTINGS.decoy_count + 3.0,
        ..DEFAULT_RENDER_SETTINGS
    });
}

#[test]
fn changes_the_imagery_when_only_decoy_edge_darkness_differs() {
    assert_setting_changes_imagery(PuzzleRenderSettings {
        decoy_edge_darkness: 90.0,
        ..DEFAULT_RENDER_SETTINGS
    });
}

#[test]
fn changes_the_imagery_when_only_decoy_body_brightness_differs() {
    assert_setting_changes_imagery(PuzzleRenderSettings {
        decoy_body_brightness: 40.0,
        ..DEFAULT_RENDER_SETTINGS
    });
}

#[test]
fn changes_the_imagery_when_only_hole_darken_differs() {
    assert_setting_changes_imagery(PuzzleRenderSettings {
        hole_darken: 0.2,
        ..DEFAULT_RENDER_SETTINGS
    });
}

#[test]
fn changes_the_imagery_when_only_decoy_hole_darken_differs() {
    assert_setting_changes_imagery(PuzzleRenderSettings {
        decoy_hole_darken: 0.95,
        ..DEFAULT_RENDER_SETTINGS
    });
}
