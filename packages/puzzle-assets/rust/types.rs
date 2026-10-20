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

/// Straight (non-premultiplied) RGBA, row-major, 4 bytes per pixel.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct RgbaImage {
    pub data: Vec<u8>,
    pub width: u32,
    pub height: u32,
}

/// Where the notch was cut, in background pixel coordinates (centre point).
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct NotchPlacement {
    pub target_x: f64,
    pub target_y: f64,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct RenderedPuzzle {
    /// Background with the notch cut into it, WebP.
    pub background: Vec<u8>,
    /// The draggable piece on transparency, WebP.
    pub piece: Vec<u8>,
    pub piece_size: u32,
    /// The seed that drove decoy placement and the notch cut; see the secrecy
    /// note in `prng.rs` before putting it anywhere but the captcha record.
    pub seed: Vec<u8>,
}

/// `RenderedPuzzleRgba` in `browser.ts`: the render before encoding.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct RenderedPuzzleRgba {
    pub background: RgbaImage,
    pub piece: RgbaImage,
    pub piece_size: u32,
    pub seed: Vec<u8>,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct PuzzleGeometry {
    pub width: u32,
    pub height: u32,
    /// Bounding box of the decoy notches, in px.
    pub notch_size: u32,
    /// Bounding box of the real piece, in px; `notch_size` when unset. May
    /// exceed the background, in which case the cut is clipped at the edge.
    pub piece_size: Option<u32>,
}

/// Per-render tunables, already bounded upstream by the client settings schema.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct PuzzleRenderSettings {
    pub decoy_count: f64,
    pub decoy_edge_darkness: f64,
    pub decoy_body_brightness: f64,
    pub hole_darken: f64,
    pub decoy_hole_darken: f64,
}
