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

//! The jigsaw silhouette as a signed distance field sampled per pixel, which
//! gives anti-aliased edges for free. Variety lives inside the jigsaw grammar:
//! each edge independently gets a tab, a blank or nothing, and the knob
//! position, radius and corner rounding all vary, so there is no fixed outline
//! to template-match against.

use crate::jsmath;
use crate::prng::Prng;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum EdgeKind {
    Flat,
    Tab,
    Blank,
}

/// Unit outward normal and unit along-edge direction for a side
/// (0 top, 1 right, 2 bottom, 3 left).
fn side_axes(side: usize) -> ([f64; 2], [f64; 2]) {
    match side {
        0 => ([0.0, -1.0], [1.0, 0.0]),
        1 => ([1.0, 0.0], [0.0, 1.0]),
        2 => ([0.0, 1.0], [-1.0, 0.0]),
        _ => ([-1.0, 0.0], [0.0, -1.0]),
    }
}

fn rounded_box_distance(px: f64, py: f64, half: f64, radius: f64) -> f64 {
    let qx = px.abs() - half + radius;
    let qy = py.abs() - half + radius;
    let outside = jsmath::hypot(jsmath::max(qx, 0.0), jsmath::max(qy, 0.0));
    let inside = jsmath::min(jsmath::max(qx, qy), 0.0);
    outside + inside - radius
}

#[derive(Clone, Debug)]
struct Knob {
    kind: EdgeKind,
    cx: f64,
    cy: f64,
    radius: f64,
}

/// Two or three knobbed edges, at least one of them a tab: fewer reads as a
/// plain square, more as a cross, and only blanks as a damaged square.
fn choose_edges(prng: &mut Prng) -> [EdgeKind; 4] {
    let count = prng.int(2, 3) as usize;
    let mut sides = [0usize, 1, 2, 3];
    for i in (1..sides.len()).rev() {
        let j = prng.int(0, i as i64) as usize;
        sides.swap(i, j);
    }

    let mut edges = [EdgeKind::Flat; 4];
    let chosen = &sides[..count];
    for &side in chosen {
        edges[side] = if prng.next() < 0.55 {
            EdgeKind::Tab
        } else {
            EdgeKind::Blank
        };
    }
    if !chosen.iter().any(|&side| edges[side] == EdgeKind::Tab) {
        edges[chosen[0]] = EdgeKind::Tab;
    }
    edges
}

/// Margin between the silhouette and its bounding box: one pixel for the
/// anti-aliasing band plus slack, so a tab is never clipped flat.
const BOX_MARGIN: f64 = 1.5;

/// One jigsaw piece in a `size` x `size` box.
#[derive(Clone, Debug)]
pub struct NotchShape {
    size: f64,
    body_half: f64,
    corner_radius: f64,
    knobs: Vec<Knob>,
}

impl NotchShape {
    /// Signed distance in px: negative inside the shape, positive outside.
    pub fn distance(&self, lx: f64, ly: f64) -> f64 {
        let px = lx - self.size / 2.0;
        let py = ly - self.size / 2.0;

        let mut d = rounded_box_distance(px, py, self.body_half, self.corner_radius);

        // Tabs before blanks, so a blank can bite into a tab the way a real
        // interlocking edge does.
        for knob in self.knobs.iter().filter(|k| k.kind == EdgeKind::Tab) {
            d = jsmath::min(d, jsmath::hypot(px - knob.cx, py - knob.cy) - knob.radius);
        }
        for knob in self.knobs.iter().filter(|k| k.kind == EdgeKind::Blank) {
            d = jsmath::max(
                d,
                -(jsmath::hypot(px - knob.cx, py - knob.cy) - knob.radius),
            );
        }
        d
    }
}

/// Build one jigsaw piece, scaled down only if a drawn tab would overflow the
/// bounding box.
pub fn create_notch_shape(prng: &mut Prng, size: u32) -> NotchShape {
    let size = f64::from(size);
    let knob_radius = size * prng.range(0.13, 0.17);
    let nominal_half = size / 2.0 - knob_radius * 1.05;
    let edges = choose_edges(prng);
    let mut knobs = Vec::new();
    let mut corner_radius = nominal_half * prng.range(0.14, 0.3);
    let mut body_half = nominal_half;

    for (side, &kind) in edges.iter().enumerate() {
        if kind == EdgeKind::Flat {
            continue;
        }
        let (normal, along) = side_axes(side);
        let radius = knob_radius * prng.range(0.88, 1.12);
        // A tab centred outside the edge sticks out; a blank centred just
        // inside reads as a socket.
        let offset = if kind == EdgeKind::Tab {
            radius * 0.52
        } else {
            -radius * 0.42
        };
        // Clear of the corners, where the disc would merge with the rounding.
        let slide_limit = jsmath::max(0.0, body_half - radius - corner_radius * 0.6);
        let slide = prng.range(-slide_limit, slide_limit) * 0.6;

        knobs.push(Knob {
            kind,
            cx: normal[0] * (body_half + offset) + along[0] * slide,
            cy: normal[1] * (body_half + offset) + along[1] * slide,
            radius,
        });
    }

    let mut max_extent = body_half;
    for knob in knobs.iter().filter(|k| k.kind == EdgeKind::Tab) {
        max_extent = jsmath::max(
            jsmath::max(max_extent, knob.cx.abs() + knob.radius),
            knob.cy.abs() + knob.radius,
        );
    }
    let limit = size / 2.0 - BOX_MARGIN;
    if max_extent > limit {
        let scale = limit / max_extent;
        body_half *= scale;
        corner_radius *= scale;
        for knob in &mut knobs {
            knob.cx *= scale;
            knob.cy *= scale;
            knob.radius *= scale;
        }
    }

    NotchShape {
        size,
        body_half,
        corner_radius,
        knobs,
    }
}

/// Anti-aliased coverage in [0, 1]: a smoothstep over a one-pixel band
/// centred on the boundary.
pub fn coverage_from_distance(distance: f64) -> f64 {
    let t = 0.5 - distance;
    if t <= 0.0 {
        return 0.0;
    }
    if t >= 1.0 {
        return 1.0;
    }
    t * t * (3.0 - 2.0 * t)
}
