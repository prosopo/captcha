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

//! V8's `base::ieee754::{exp, cos, tanh}` (its fdlibm port), transcribed
//! operation for operation; V8 13.6 (Node 24) still uses them. Neither glibc nor
//! the `libm` crate agrees with them in the last place on every input (glibc's
//! `cos` differs on ~3% of the arguments the synthesiser uses, `libm::cos` on
//! ~1%, `libm::tanh` on ~6%), and the PCM is compared bit for bit.
//!
//! `exp` is copied from `prosopo-puzzle-assets`, which keeps its copy
//! crate-private.

#![allow(
    clippy::approx_constant,
    clippy::excessive_precision,
    clippy::unreadable_literal
)]

fn high(x: f64) -> i32 {
    (x.to_bits() >> 32) as u32 as i32
}

fn low(x: f64) -> u32 {
    x.to_bits() as u32
}

fn from_words(hi: i32, lo: u32) -> f64 {
    f64::from_bits((u64::from(hi as u32) << 32) | u64::from(lo))
}

pub(crate) fn exp(x: f64) -> f64 {
    const ONE: f64 = 1.0;
    const HALF: [f64; 2] = [0.5, -0.5];
    const O_THRESHOLD: f64 = 7.09782712893383973096e+02;
    const U_THRESHOLD: f64 = -7.45133219101941108420e+02;
    const LN2_HI: [f64; 2] = [6.93147180369123816490e-01, -6.93147180369123816490e-01];
    const LN2_LO: [f64; 2] = [1.90821492927058770002e-10, -1.90821492927058770002e-10];
    const INVLN2: f64 = 1.44269504088896338700e+00;
    const P1: f64 = 1.66666666666666019037e-01;
    const P2: f64 = -2.77777777770155933842e-03;
    const P3: f64 = 6.61375632143793436117e-05;
    const P4: f64 = -1.65339022054652515390e-06;
    const P5: f64 = 4.13813679705723846039e-08;
    const E: f64 = 2.718281828459045;
    const HUGE: f64 = 1.0e+300;
    const TWOM1000: f64 = 9.33263618503218878990e-302;
    const TWO1023: f64 = 8.988465674311579539e307;

    let mut x = x;
    let mut hi = 0.0;
    let mut lo = 0.0;
    let mut k: i32 = 0;

    let mut hx = high(x) as u32;
    let xsb = ((hx >> 31) & 1) as usize;
    hx &= 0x7FFF_FFFF;

    if hx >= 0x4086_2E42 {
        if hx >= 0x7FF0_0000 {
            if ((hx & 0xF_FFFF) | low(x)) != 0 {
                return x + x;
            }
            return if xsb == 0 { x } else { 0.0 };
        }
        if x > O_THRESHOLD {
            return HUGE * HUGE;
        }
        if x < U_THRESHOLD {
            return TWOM1000 * TWOM1000;
        }
    }

    if hx > 0x3FD6_2E42 {
        if hx < 0x3FF0_A2B2 {
            // V8 special-cases exp(1) because the reduction below gets the
            // last bit of E wrong.
            if x == 1.0 {
                return E;
            }
            hi = x - LN2_HI[xsb];
            lo = LN2_LO[xsb];
            k = 1 - xsb as i32 - xsb as i32;
        } else {
            k = (INVLN2 * x + HALF[xsb]) as i32;
            let t = f64::from(k);
            hi = x - t * LN2_HI[0];
            lo = t * LN2_LO[0];
        }
        x = hi - lo;
    } else if hx < 0x3E30_0000 {
        if HUGE + x > ONE {
            return ONE + x;
        }
    } else {
        k = 0;
    }

    let t = x * x;
    let twopk = if k >= -1021 {
        from_words(0x3FF0_0000_i32.wrapping_add(((k as u32) << 20) as i32), 0)
    } else {
        from_words(
            0x3FF0_0000_i32.wrapping_add((((k + 1000) as u32) << 20) as i32),
            0,
        )
    };
    let c = x - t * (P1 + t * (P2 + t * (P3 + t * (P4 + t * P5))));
    if k == 0 {
        return ONE - ((x * c) / (c - 2.0) - x);
    }
    let y = ONE - ((lo - (x * c) / (2.0 - c)) - hi);
    if k >= -1021 {
        if k == 1024 {
            return y * 2.0 * TWO1023;
        }
        return y * twopk;
    }
    y * twopk * TWOM1000
}

const NPIO2_HW: [i32; 32] = [
    0x3FF921FB, 0x400921FB, 0x4012D97C, 0x401921FB, 0x401F6A7A, 0x4022D97C, 0x4025FDBB, 0x402921FB,
    0x402C463A, 0x402F6A7A, 0x4031475C, 0x4032D97C, 0x40346B9C, 0x4035FDBB, 0x40378FDB, 0x403921FB,
    0x403AB41B, 0x403C463A, 0x403DD85A, 0x403F6A7A, 0x40407E4C, 0x4041475C, 0x4042106C, 0x4042D97C,
    0x4043A28C, 0x40446B9C, 0x404534AC, 0x4045FDBB, 0x4046C6CB, 0x40478FDB, 0x404858EB, 0x404921FB,
];

/// `__ieee754_rem_pio2`: `x` reduced modulo pi/2 as a head/tail pair, with
/// the quadrant. `None` above 2^19 * pi/2, where fdlibm needs the
/// multi-precision `__kernel_rem_pio2`.
fn rem_pio2(x: f64) -> Option<(i32, f64, f64)> {
    const INVPIO2: f64 = 6.36619772367581382433e-01;
    const PIO2_1: f64 = 1.57079632673412561417e+00;
    const PIO2_1T: f64 = 6.07710050650619224932e-11;
    const PIO2_2: f64 = 6.07710050630396597660e-11;
    const PIO2_2T: f64 = 2.02226624879595063154e-21;
    const PIO2_3: f64 = 2.02226624871116645580e-21;
    const PIO2_3T: f64 = 8.47842766036889956997e-32;

    let hx = high(x);
    let ix = hx & 0x7fff_ffff;
    if ix <= 0x3fe9_21fb {
        return Some((0, x, 0.0));
    }
    if ix < 0x4002_d97c {
        let (sign, n) = if hx > 0 { (1.0, 1) } else { (-1.0, -1) };
        let mut z = x - sign * PIO2_1;
        let tail = if ix != 0x3ff9_21fb {
            PIO2_1T
        } else {
            z -= sign * PIO2_2;
            PIO2_2T
        };
        let y0 = z - sign * tail;
        return Some((n, y0, (z - y0) - sign * tail));
    }
    if ix > 0x4139_21fb {
        return None;
    }

    let t = x.abs();
    let n = (t * INVPIO2 + 0.5) as i32;
    let fnn = f64::from(n);
    let mut r = t - fnn * PIO2_1;
    let mut w = fnn * PIO2_1T;
    let mut y0 = r - w;
    if !(n < 32 && ix != NPIO2_HW[(n - 1) as usize]) {
        let j = ix >> 20;
        let mut i = j - ((high(y0) >> 20) & 0x7ff);
        if i > 16 {
            let t = r;
            w = fnn * PIO2_2;
            r = t - w;
            w = fnn * PIO2_2T - ((t - r) - w);
            y0 = r - w;
            i = j - ((high(y0) >> 20) & 0x7ff);
            if i > 49 {
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
        Some((-n, -y0, -y1))
    } else {
        Some((n, y0, y1))
    }
}

/// fdlibm 5.3's `__kernel_cos`, which V8 kept; the FreeBSD/musl rewrite rounds
/// differently.
fn kernel_cos(x: f64, y: f64) -> f64 {
    const C1: f64 = 4.16666666666666019037e-02;
    const C2: f64 = -1.38888888888741095749e-03;
    const C3: f64 = 2.48015872894767294178e-05;
    const C4: f64 = -2.75573143513906633035e-07;
    const C5: f64 = 2.08757232129817482790e-09;
    const C6: f64 = -1.13596475577881948265e-11;

    let ix = high(x) & 0x7fff_ffff;
    if ix < 0x3e40_0000 && x as i32 == 0 {
        return 1.0;
    }
    let z = x * x;
    let r = z * (C1 + z * (C2 + z * (C3 + z * (C4 + z * (C5 + z * C6)))));
    if ix < 0x3fd3_3333 {
        return 1.0 - (0.5 * z - (z * r - x * y));
    }
    let qx = if ix > 0x3fe9_0000 {
        0.28125
    } else {
        from_words(ix - 0x0020_0000, 0)
    };
    let iz = 0.5 * z - qx;
    let a = 1.0 - qx;
    a - (iz - (z * r - x * y))
}

/// `__kernel_sin` with `iy == 1`, the only form `cos` calls.
fn kernel_sin(x: f64, y: f64) -> f64 {
    const S1: f64 = -1.66666666666666324348e-01;
    const S2: f64 = 8.33333333332248946124e-03;
    const S3: f64 = -1.98412698298579493134e-04;
    const S4: f64 = 2.75573137070700676789e-06;
    const S5: f64 = -2.50507602534068634195e-08;
    const S6: f64 = 1.58969099521155010221e-10;

    let ix = high(x) & 0x7fff_ffff;
    if ix < 0x3e40_0000 && x as i32 == 0 {
        return x;
    }
    let z = x * x;
    let v = z * x;
    let r = S2 + z * (S3 + z * (S4 + z * (S5 + z * S6)));
    x - ((z * (0.5 * y - v * r) - y) - v * S1)
}

/// Every argument the synthesiser produces is below pi in magnitude. Past
/// 2^19 * pi/2 this falls back to `libm::cos`, whose large-argument reduction
/// is the same fdlibm algorithm but whose kernel is not, so it may differ from
/// V8 in the last place there.
// `x - x` is fdlibm's NaN for an infinite or NaN argument; it yields the
// CPU's default NaN, as V8's does.
#[allow(clippy::eq_op)]
pub(crate) fn cos(x: f64) -> f64 {
    let ix = high(x) & 0x7fff_ffff;
    if ix <= 0x3fe9_21fb {
        return kernel_cos(x, 0.0);
    }
    if ix >= 0x7ff0_0000 {
        return x - x;
    }
    match rem_pio2(x) {
        Some((n, y0, y1)) => match n & 3 {
            0 => kernel_cos(y0, y1),
            1 => -kernel_sin(y0, y1),
            2 => -kernel_cos(y0, y1),
            _ => kernel_sin(y0, y1),
        },
        None => libm::cos(x),
    }
}

/// `libm::expm1` is the same FreeBSD fdlibm routine V8 ports.
pub(crate) fn tanh(x: f64) -> f64 {
    const TINY: f64 = 1.0e-300;
    const HUGE: f64 = 1.0e300;

    let jx = high(x);
    let ix = jx & 0x7fff_ffff;
    if ix >= 0x7ff0_0000 {
        return if jx >= 0 {
            1.0 / x + 1.0
        } else {
            1.0 / x - 1.0
        };
    }
    let z = if ix < 0x4036_0000 {
        if ix < 0x3e30_0000 && HUGE + x > 1.0 {
            return x;
        }
        if ix >= 0x3ff0_0000 {
            let t = libm::expm1(2.0 * x.abs());
            1.0 - 2.0 / (t + 2.0)
        } else {
            let t = libm::expm1(-2.0 * x.abs());
            -t / (t + 2.0)
        }
    } else {
        1.0 - TINY
    };
    if jx >= 0 {
        z
    } else {
        -z
    }
}
