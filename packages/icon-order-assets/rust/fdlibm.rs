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

//! V8's `base::ieee754::sin` and `cos` (its fdlibm port, as of V8 12.4),
//! transcribed operation for operation. glibc and the `libm` crate both
//! disagree with V8 in the last place on a few percent of inputs, which is
//! enough to move a rounded wedge coordinate in the collage markup.

#![allow(
    clippy::approx_constant,
    clippy::eq_op,
    clippy::excessive_precision,
    clippy::unreadable_literal
)]

fn high(x: f64) -> i32 {
    (x.to_bits() >> 32) as u32 as i32
}

fn from_words(hi: i32, lo: u32) -> f64 {
    f64::from_bits((u64::from(hi as u32) << 32) | u64::from(lo))
}

fn kernel_cos(x: f64, y: f64) -> f64 {
    const ONE: f64 = 1.0;
    const C1: f64 = 4.16666666666666019037e-02;
    const C2: f64 = -1.38888888888741095749e-03;
    const C3: f64 = 2.48015872894767294178e-05;
    const C4: f64 = -2.75573143513906633035e-07;
    const C5: f64 = 2.08757232129817482790e-09;
    const C6: f64 = -1.13596475577881948265e-11;
    let ix = high(x) & 0x7FFF_FFFF;
    if ix < 0x3E40_0000 && (x as i32) == 0 {
        return ONE;
    }
    let z = x * x;
    let r = z * (C1 + z * (C2 + z * (C3 + z * (C4 + z * (C5 + z * C6)))));
    if ix < 0x3FD3_3333 {
        return ONE - (0.5 * z - (z * r - x * y));
    }
    let qx = if ix > 0x3FE9_0000 {
        0.28125
    } else {
        from_words(ix - 0x0020_0000, 0)
    };
    let iz = 0.5 * z - qx;
    let a = ONE - qx;
    a - (iz - (z * r - x * y))
}

fn kernel_sin(x: f64, y: f64, iy: i32) -> f64 {
    const HALF: f64 = 5.00000000000000000000e-01;
    const S1: f64 = -1.66666666666666324348e-01;
    const S2: f64 = 8.33333333332248946124e-03;
    const S3: f64 = -1.98412698298579493134e-04;
    const S4: f64 = 2.75573137070700676789e-06;
    const S5: f64 = -2.50507602534068634195e-08;
    const S6: f64 = 1.58969099521155010221e-10;
    let ix = high(x) & 0x7FFF_FFFF;
    if ix < 0x3E40_0000 && (x as i32) == 0 {
        return x;
    }
    let z = x * x;
    let v = z * x;
    let r = S2 + z * (S3 + z * (S4 + z * (S5 + z * S6)));
    if iy == 0 {
        x + v * (S1 + z * r)
    } else {
        x - ((z * (HALF * y - v * r) - y) - v * S1)
    }
}

/// High word of n * pi/2, the `npio2_hw` table in fdlibm.
fn npio2_hw(n: i32) -> i32 {
    high(f64::from(n) * std::f64::consts::FRAC_PI_2)
}

/// `__ieee754_rem_pio2` for |x| up to 2^19 * pi/2; `None` beyond that, where
/// fdlibm switches to `__kernel_rem_pio2`.
fn rem_pio2(x: f64) -> Option<(i32, f64, f64)> {
    const HALF: f64 = 0.5;
    const INVPIO2: f64 = 6.36619772367581382433e-01;
    const PIO2_1: f64 = 1.57079632673412561417e+00;
    const PIO2_1T: f64 = 6.07710050650619224932e-11;
    const PIO2_2: f64 = 6.07710050630396597660e-11;
    const PIO2_2T: f64 = 2.02226624879595063154e-21;
    const PIO2_3: f64 = 2.02226624871116645580e-21;
    const PIO2_3T: f64 = 8.47842766036889956997e-32;
    let hx = high(x);
    let ix = hx & 0x7FFF_FFFF;
    if ix <= 0x3FE9_21FB {
        return Some((0, x, 0.0));
    }
    if ix < 0x4002_D97C {
        let (n, sign) = if hx > 0 { (1, 1.0) } else { (-1, -1.0) };
        let mut z = x - sign * PIO2_1;
        let tail = if ix != 0x3FF9_21FB {
            PIO2_1T
        } else {
            z -= sign * PIO2_2;
            PIO2_2T
        };
        let y0 = z - sign * tail;
        let y1 = (z - y0) - sign * tail;
        return Some((n, y0, y1));
    }
    if ix > 0x4139_21FB {
        return None;
    }
    let t = x.abs();
    let n = (t * INVPIO2 + HALF) as i32;
    let fnn = f64::from(n);
    let mut r = t - fnn * PIO2_1;
    let mut w = fnn * PIO2_1T;
    let mut y0 = r - w;
    if !(n < 32 && ix != npio2_hw(n)) {
        let j = ix >> 20;
        if j - ((high(y0) >> 20) & 0x7FF) > 16 {
            let t = r;
            w = fnn * PIO2_2;
            r = t - w;
            w = fnn * PIO2_2T - ((t - r) - w);
            y0 = r - w;
            if j - ((high(y0) >> 20) & 0x7FF) > 49 {
                let t = r;
                w = fnn * PIO2_3;
                r = t - w;
                w = fnn * PIO2_3T - ((t - r) - w);
                y0 = r - w;
            }
        }
    }
    let y1 = (r - y0) - w;
    if hx < 0 {
        return Some((-n, -y0, -y1));
    }
    Some((n, y0, y1))
}

/// `Math.sin`. Arguments beyond 2^19 * pi/2 fall back to the `libm` crate and
/// may differ from V8 in the last place; the collage only passes [0, 2.5 pi).
pub(crate) fn sin(x: f64) -> f64 {
    let ix = high(x) & 0x7FFF_FFFF;
    if ix <= 0x3FE9_21FB {
        return kernel_sin(x, 0.0, 0);
    }
    if ix >= 0x7FF0_0000 {
        return x - x;
    }
    let Some((n, y0, y1)) = rem_pio2(x) else {
        return libm::sin(x);
    };
    match n & 3 {
        0 => kernel_sin(y0, y1, 1),
        1 => kernel_cos(y0, y1),
        2 => -kernel_sin(y0, y1, 1),
        _ => -kernel_cos(y0, y1),
    }
}

/// `Math.cos`; see [`sin`].
pub(crate) fn cos(x: f64) -> f64 {
    let ix = high(x) & 0x7FFF_FFFF;
    if ix <= 0x3FE9_21FB {
        return kernel_cos(x, 0.0);
    }
    if ix >= 0x7FF0_0000 {
        return x - x;
    }
    let Some((n, y0, y1)) = rem_pio2(x) else {
        return libm::cos(x);
    };
    match n & 3 {
        0 => kernel_cos(y0, y1),
        1 => -kernel_sin(y0, y1, 1),
        2 => -kernel_cos(y0, y1),
        _ => kernel_sin(y0, y1, 1),
    }
}
