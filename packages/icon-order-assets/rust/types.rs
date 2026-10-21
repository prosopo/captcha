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

use crate::glyphs::GlyphKind;

/// Widget-coupled; every stored coordinate is in these background pixels.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct IconOrderGeometry {
    pub width: u32,
    pub height: u32,
    /// Bounding box of one icon, in px.
    pub icon_size: f64,
}

/// SECURITY: a target's placement is the answer and must never reach the widget.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct IconPlacement {
    /// Centre of the icon, in background pixels.
    pub x: f64,
    pub y: f64,
    pub kind: GlyphKind,
    /// Degrees, clockwise.
    pub rotation: f64,
    /// Stroke hue in degrees; the halo is always dark.
    pub hue: f64,
    /// Bounding box of this icon, in px.
    pub size: f64,
}

#[derive(Clone, Debug, PartialEq)]
pub struct RenderedIconOrder {
    /// Frame with every icon (targets and decoys) composited, WebP.
    pub background: Vec<u8>,
    /// The target icons in click order, WebP.
    pub legend: Vec<u8>,
    /// Height of the legend strip in px.
    pub legend_icon_size: u32,
    /// The answer, in click order. Must never reach a response body.
    pub targets: Vec<IconPlacement>,
    /// Replays the render; the TS draws it internally and does not return it.
    pub seed: Vec<u8>,
}

/// Per-render tunables; the provider layers operator overrides onto the defaults.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct IconOrderRenderSettings {
    /// How many icons the user must click, in order.
    pub target_count: usize,
    /// Icons on the frame that are not in the legend.
    pub decoy_count: usize,
    /// Bright inner stroke width, in px at the icon's own scale.
    pub stroke_width: f64,
    /// Opacity of the bright inner stroke, 0..1.
    pub icon_opacity: f64,
    /// Opacity of the dark outline under each icon, 0..1.
    pub halo_opacity: f64,
    /// Scales the number of every kind of background collage element.
    pub background_clutter: f64,
}

/// Structural so stored targets, which drop rotation and hue, can be graded.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct IconTargetGeometry {
    pub x: f64,
    pub y: f64,
    pub size: f64,
}

impl From<&IconPlacement> for IconTargetGeometry {
    fn from(placement: &IconPlacement) -> Self {
        IconTargetGeometry {
            x: placement.x,
            y: placement.y,
            size: placement.size,
        }
    }
}

/// A click on the frame, in background pixels.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Click {
    pub x: f64,
    pub y: f64,
}
