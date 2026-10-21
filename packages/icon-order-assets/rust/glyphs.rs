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

use std::fmt;
use std::str::FromStr;

/// Shapes must stay distinguishable from each other under rotation, or the
/// legend becomes ambiguous; hence no plain line and only one ring.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum GlyphKind {
    Ring,
    Spiral,
    Chevron,
    Bolt,
    Cross,
    Triangle,
    Star,
    Wave,
    Square,
    Arc,
}

/// In the TS enum's declaration order, which `placeIcons` shuffles from, so
/// the order is part of the layout.
pub const GLYPH_KINDS: [GlyphKind; 10] = [
    GlyphKind::Ring,
    GlyphKind::Spiral,
    GlyphKind::Chevron,
    GlyphKind::Bolt,
    GlyphKind::Cross,
    GlyphKind::Triangle,
    GlyphKind::Star,
    GlyphKind::Wave,
    GlyphKind::Square,
    GlyphKind::Arc,
];

impl GlyphKind {
    /// The TS enum value, as stored in the database.
    pub fn as_str(self) -> &'static str {
        match self {
            GlyphKind::Ring => "ring",
            GlyphKind::Spiral => "spiral",
            GlyphKind::Chevron => "chevron",
            GlyphKind::Bolt => "bolt",
            GlyphKind::Cross => "cross",
            GlyphKind::Triangle => "triangle",
            GlyphKind::Star => "star",
            GlyphKind::Wave => "wave",
            GlyphKind::Square => "square",
            GlyphKind::Arc => "arc",
        }
    }
}

impl fmt::Display for GlyphKind {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.as_str())
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct UnknownGlyphKind(pub String);

impl fmt::Display for UnknownGlyphKind {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "icon-order-assets: no path for glyph \"{}\"", self.0)
    }
}

impl std::error::Error for UnknownGlyphKind {}

impl FromStr for GlyphKind {
    type Err = UnknownGlyphKind;

    fn from_str(value: &str) -> Result<Self, Self::Err> {
        GLYPH_KINDS
            .into_iter()
            .find(|kind| kind.as_str() == value)
            .ok_or_else(|| UnknownGlyphKind(value.to_owned()))
    }
}

/// Stroked path data in a 100x100 box centred on (50, 50).
pub fn glyph_path(kind: GlyphKind) -> &'static str {
    match kind {
        GlyphKind::Ring => "M 14 50 A 36 36 0 1 0 86 50 A 36 36 0 1 0 14 50",
        GlyphKind::Spiral => "M 50 12 A 38 38 0 1 1 12 50 A 28 28 0 1 1 68 50 A 18 18 0 1 1 32 50",
        GlyphKind::Chevron => "M 22 20 L 54 50 L 22 80 M 48 20 L 80 50 L 48 80",
        GlyphKind::Bolt => "M 26 12 L 62 40 L 38 54 L 74 88",
        GlyphKind::Cross => "M 20 20 L 80 80 M 80 20 L 20 80",
        GlyphKind::Triangle => "M 50 14 L 86 82 L 14 82 Z",
        GlyphKind::Star => "M 50 12 L 59.4 37.1 L 86.1 38.2 L 65.2 54.9 L 72.3 80.6 L 50 66 L 27.7 80.6 L 34.8 54.9 L 13.9 38.2 L 40.6 37.1 Z",
        GlyphKind::Wave => "M 12 62 Q 31 22 50 62 T 88 62",
        GlyphKind::Square => "M 20 20 H 80 V 80 H 20 Z",
        GlyphKind::Arc => "M 14 72 A 40 40 0 0 1 86 72",
    }
}
