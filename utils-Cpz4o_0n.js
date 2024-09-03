var ac = Object.defineProperty;
var fc = (t, e, n) => e in t ? ac(t, e, { enumerable: !0, configurable: !0, writable: !0, value: n }) : t[e] = n;
var re = (t, e, n) => fc(t, typeof e != "symbol" ? e + "" : e, n);
import { s as cc, w as Gm, r as ir, T as qm, u as Ym, p as Wm, q as Km, t as Jm, v as Qm, x as _m, l as uc, d as lc, b as dc, j as As, y as Wt, B as na, D as jn, z as sr, E as hc, a as R, F as pc, G as bt, A as te, S as mc } from "./index-DsnIPyZG.js";
function gc(t, e) {
  for (var n = 0; n < e.length; n++) {
    const r = e[n];
    if (typeof r != "string" && !Array.isArray(r)) {
      for (const i in r)
        if (i !== "default" && !(i in t)) {
          const s = Object.getOwnPropertyDescriptor(r, i);
          s && Object.defineProperty(t, i, s.get ? s : {
            enumerable: !0,
            get: () => r[i]
          });
        }
    }
  }
  return Object.freeze(Object.defineProperty(t, Symbol.toStringTag, { value: "Module" }));
}
const bc = (t) => {
  alert(t.message);
}, $m = (t, e, n) => Object.assign({
  onError: bc,
  onHuman: (r) => {
    t({ sendData: !e.sendData });
  },
  onExtensionNotFound: () => {
    alert("No extension found");
  },
  onFailed: () => {
    alert("Captcha challenge failed. Please try again"), t({ sendData: !e.sendData });
  },
  onExpired: () => {
    alert("Completed challenge has expired, please try again");
  },
  onChallengeExpired: () => {
    alert("Uncompleted challenge has expired, please try again");
  },
  onOpen: () => {
  },
  onClose: () => {
  }
}, n), eg = (t, e) => (n) => {
  Object.assign(t, n), e(n);
}, Kn = (t, e) => {
  const n = t(e), r = (s) => {
    n.current = s;
  };
  return [n.current, r];
}, tg = (t, e) => {
  const [n, r] = t(!1), [i, s] = t(0), [o, f] = t([]), [u, h] = Kn(e, void 0), [p, m] = t(!1), [O, L] = t(void 0), [N, x] = t(!1), [E, T] = t(void 0), [M, S] = t(void 0), [A, j] = Kn(e, void 0), [z, U] = Kn(e, void 0), [H, G] = Kn(e, void 0), [V, I] = t(!1);
  return [
    {
      isHuman: n,
      index: i,
      solutions: o,
      captchaApi: u,
      showModal: p,
      challenge: O,
      loading: N,
      account: E,
      dappAccount: M,
      submission: A,
      timeout: z,
      successfullChallengeTimeout: H,
      sendData: V
    },
    (B) => {
      B.account !== void 0 && T(B.account), B.isHuman !== void 0 && r(B.isHuman), B.index !== void 0 && s(B.index), B.solutions !== void 0 && f(B.solutions.slice()), B.captchaApi !== void 0 && h(B.captchaApi), B.showModal !== void 0 && m(B.showModal), B.challenge !== void 0 && L(B.challenge), B.loading !== void 0 && x(B.loading), B.showModal !== void 0 && m(B.showModal), B.dappAccount !== void 0 && S(B.dappAccount), B.submission !== void 0 && j(B.submission), B.timeout !== void 0 && U(B.timeout), B.successfullChallengeTimeout !== void 0 && G(B.timeout), B.sendData !== void 0 && I(B.sendData);
    }
  ];
};
function yc() {
  for (var t = arguments.length, e = new Array(t), n = 0; n < t; n++)
    e[n] = arguments[n];
  return cc(e);
}
const vc = yc`{
    &:before {
        content: '""';
        position: absolute;
        height: 100%;
        width: 100%;
    }
}`, wc = {
  width: "28px",
  height: "28px",
  top: "auto",
  left: "auto",
  opacity: "1",
  borderRadius: "12.5%",
  appearance: "none",
  cursor: "pointer",
  margin: "0",
  borderStyle: "solid",
  borderWidth: "1px"
}, js = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ", xc = () => Array.from({ length: 8 }, () => js[Math.floor(Math.random() * js.length)]).join(""), ng = ({ themeColor: t, onChange: e, checked: n, labelText: r }) => {
  const i = ir.useMemo(() => t === "light" ? uc : lc, [t]), s = {
    ...wc,
    border: `1px solid ${i.palette.background.contrastText}`
  }, [o, f] = ir.useState(!1), u = ir.useMemo(() => ({
    ...s,
    borderColor: o ? i.palette.background.contrastText : i.palette.grey[400],
    appearance: n ? "auto" : "none",
    flex: 1,
    margin: "15px"
  }), [o, i, n]), h = xc();
  return dc("span", { style: { display: "inline-flex" }, children: [As("input", { name: h, id: h, onMouseEnter: () => f(!0), onMouseLeave: () => f(!1), css: vc, type: "checkbox", "aria-live": "assertive", "aria-haspopup": "true", "aria-label": r, onChange: e, checked: n, style: u }), As("label", { css: {
    color: i.palette.background.contrastText,
    position: "relative",
    display: "flex",
    cursor: "pointer",
    userSelect: "none",
    top: "18px"
  }, htmlFor: h, children: r })] });
};
function Pc(t) {
  return t("return this");
}
const yn = typeof globalThis < "u" ? globalThis : typeof global < "u" ? global : typeof self < "u" ? self : typeof window < "u" ? window : Pc(Function);
function $i(t, e) {
  return typeof yn[t] > "u" ? e : yn[t];
}
let Oc = class {
  encode(e) {
    const n = e.length, r = new Uint8Array(n);
    for (let i = 0; i < n; i++)
      r[i] = e.charCodeAt(i);
    return r;
  }
};
const Nc = /* @__PURE__ */ $i("TextEncoder", Oc), Lc = new Nc();
function it(t) {
  return t ? Lc.encode(t.toString()) : new Uint8Array();
}
function ig(t) {
  return Wt(it(t));
}
class ra {
}
let ni, Hs = 0;
class Ec {
  constructor(e) {
    ni = e;
  }
  async signPayload(e) {
    const n = ++Hs;
    return {
      ...await ni("pub(extrinsic.sign)", e),
      id: n
    };
  }
  async signRaw(e) {
    const n = ++Hs;
    return {
      ...await ni("pub(bytes.sign)", e),
      id: n
    };
  }
}
let kc = class {
  constructor(e) {
    re(this, "__encoding");
    this.__encoding = e;
  }
  decode(e) {
    let n = "";
    for (let r = 0, i = e.length; r < i; r++)
      n += String.fromCharCode(e[r]);
    return n;
  }
};
const Tc = /* @__PURE__ */ $i("TextDecoder", kc);
function Ti(t) {
  return typeof t == "function";
}
function Mc() {
  return Number.NaN;
}
const ie = /* @__PURE__ */ $i("BigInt", Mc), lr = /* @__PURE__ */ ie(0), dr = /* @__PURE__ */ ie(1);
Number.MAX_SAFE_INTEGER;
const Rs = ie(256), Is = ie(256 * 256), Sc = ie("0x10000000000000000");
function Mi(t, { isLe: e = !0, isNegative: n = !1 } = {}) {
  e || (t = t.slice().reverse());
  const r = t.length;
  if (n && r && t[r - 1] & 128) {
    switch (r) {
      case 0:
        return ie(0);
      case 1:
        return ie((t[0] ^ 255) * -1 - 1);
      case 2:
        return ie((t[0] + (t[1] << 8) ^ 65535) * -1 - 1);
      case 4:
        return ie((t[0] + (t[1] << 8) + (t[2] << 16) + t[3] * 16777216 ^ 4294967295) * -1 - 1);
    }
    const s = new DataView(t.buffer, t.byteOffset);
    if (r === 8)
      return s.getBigInt64(0, !0);
    let o = ie(0);
    const f = r % 2;
    for (let u = r - 2; u >= f; u -= 2)
      o = o * Is + ie(s.getUint16(u, !0) ^ 65535);
    return f && (o = o * Rs + ie(t[0] ^ 255)), o * -dr - dr;
  }
  switch (r) {
    case 0:
      return ie(0);
    case 1:
      return ie(t[0]);
    case 2:
      return ie(t[0] + (t[1] << 8));
    case 4:
      return ie(t[0] + (t[1] << 8) + (t[2] << 16) + t[3] * 16777216);
  }
  const i = new DataView(t.buffer, t.byteOffset);
  switch (r) {
    case 8:
      return i.getBigUint64(0, !0);
    case 16:
      return i.getBigUint64(8, !0) * Sc + i.getBigUint64(0, !0);
    default: {
      let s = ie(0);
      const o = r % 2;
      for (let f = r - 2; f >= o; f -= 2)
        s = s * Is + ie(i.getUint16(f, !0));
      return o && (s = s * Rs + ie(t[0])), s;
    }
  }
}
const ri = "0123456789abcdef", hr = new Uint8Array(256), ia = new Uint8Array(256 * 256);
for (let t = 0, e = ri.length; t < e; t++)
  hr[ri[t].charCodeAt(0) | 0] = t | 0, t > 9 && (hr[ri[t].toUpperCase().charCodeAt(0) | 0] = t | 0);
for (let t = 0; t < 256; t++) {
  const e = t << 8;
  for (let n = 0; n < 256; n++)
    ia[e | n] = hr[t] << 4 | hr[n];
}
function pn(t, e = -1) {
  if (!t)
    return new Uint8Array();
  let n = t.startsWith("0x") ? 2 : 0;
  const r = Math.ceil((t.length - n) / 2), i = Math.ceil(e === -1 ? r : e / 8), s = new Uint8Array(i), o = i > r ? i - r : 0;
  for (let f = o; f < i; f++, n += 2)
    s[f] = ia[t.charCodeAt(n) << 8 | t.charCodeAt(n + 1)];
  return s;
}
function zc(t, { isLe: e = !1, isNegative: n = !1 } = {}) {
  return !t || t === "0x" ? ie(0) : Mi(pn(t), { isLe: e, isNegative: n });
}
var sa = { exports: {} };
(function(t) {
  (function(e, n) {
    function r(P, a) {
      if (!P) throw new Error(a || "Assertion failed");
    }
    function i(P, a) {
      P.super_ = a;
      var c = function() {
      };
      c.prototype = a.prototype, P.prototype = new c(), P.prototype.constructor = P;
    }
    function s(P, a, c) {
      if (s.isBN(P))
        return P;
      this.negative = 0, this.words = null, this.length = 0, this.red = null, P !== null && ((a === "le" || a === "be") && (c = a, a = 10), this._init(P || 0, a || 10, c || "be"));
    }
    typeof e == "object" ? e.exports = s : n.BN = s, s.BN = s, s.wordSize = 26;
    var o;
    try {
      typeof window < "u" && typeof window.Buffer < "u" ? o = window.Buffer : o = require("buffer").Buffer;
    } catch {
    }
    s.isBN = function(a) {
      return a instanceof s ? !0 : a !== null && typeof a == "object" && a.constructor.wordSize === s.wordSize && Array.isArray(a.words);
    }, s.max = function(a, c) {
      return a.cmp(c) > 0 ? a : c;
    }, s.min = function(a, c) {
      return a.cmp(c) < 0 ? a : c;
    }, s.prototype._init = function(a, c, d) {
      if (typeof a == "number")
        return this._initNumber(a, c, d);
      if (typeof a == "object")
        return this._initArray(a, c, d);
      c === "hex" && (c = 16), r(c === (c | 0) && c >= 2 && c <= 36), a = a.toString().replace(/\s+/g, "");
      var g = 0;
      a[0] === "-" && (g++, this.negative = 1), g < a.length && (c === 16 ? this._parseHex(a, g, d) : (this._parseBase(a, c, g), d === "le" && this._initArray(this.toArray(), c, d)));
    }, s.prototype._initNumber = function(a, c, d) {
      a < 0 && (this.negative = 1, a = -a), a < 67108864 ? (this.words = [a & 67108863], this.length = 1) : a < 4503599627370496 ? (this.words = [
        a & 67108863,
        a / 67108864 & 67108863
      ], this.length = 2) : (r(a < 9007199254740992), this.words = [
        a & 67108863,
        a / 67108864 & 67108863,
        1
      ], this.length = 3), d === "le" && this._initArray(this.toArray(), c, d);
    }, s.prototype._initArray = function(a, c, d) {
      if (r(typeof a.length == "number"), a.length <= 0)
        return this.words = [0], this.length = 1, this;
      this.length = Math.ceil(a.length / 3), this.words = new Array(this.length);
      for (var g = 0; g < this.length; g++)
        this.words[g] = 0;
      var b, w, k = 0;
      if (d === "be")
        for (g = a.length - 1, b = 0; g >= 0; g -= 3)
          w = a[g] | a[g - 1] << 8 | a[g - 2] << 16, this.words[b] |= w << k & 67108863, this.words[b + 1] = w >>> 26 - k & 67108863, k += 24, k >= 26 && (k -= 26, b++);
      else if (d === "le")
        for (g = 0, b = 0; g < a.length; g += 3)
          w = a[g] | a[g + 1] << 8 | a[g + 2] << 16, this.words[b] |= w << k & 67108863, this.words[b + 1] = w >>> 26 - k & 67108863, k += 24, k >= 26 && (k -= 26, b++);
      return this._strip();
    };
    function f(P, a) {
      var c = P.charCodeAt(a);
      if (c >= 48 && c <= 57)
        return c - 48;
      if (c >= 65 && c <= 70)
        return c - 55;
      if (c >= 97 && c <= 102)
        return c - 87;
      r(!1, "Invalid character in " + P);
    }
    function u(P, a, c) {
      var d = f(P, c);
      return c - 1 >= a && (d |= f(P, c - 1) << 4), d;
    }
    s.prototype._parseHex = function(a, c, d) {
      this.length = Math.ceil((a.length - c) / 6), this.words = new Array(this.length);
      for (var g = 0; g < this.length; g++)
        this.words[g] = 0;
      var b = 0, w = 0, k;
      if (d === "be")
        for (g = a.length - 1; g >= c; g -= 2)
          k = u(a, c, g) << b, this.words[w] |= k & 67108863, b >= 18 ? (b -= 18, w += 1, this.words[w] |= k >>> 26) : b += 8;
      else {
        var y = a.length - c;
        for (g = y % 2 === 0 ? c + 1 : c; g < a.length; g += 2)
          k = u(a, c, g) << b, this.words[w] |= k & 67108863, b >= 18 ? (b -= 18, w += 1, this.words[w] |= k >>> 26) : b += 8;
      }
      this._strip();
    };
    function h(P, a, c, d) {
      for (var g = 0, b = 0, w = Math.min(P.length, c), k = a; k < w; k++) {
        var y = P.charCodeAt(k) - 48;
        g *= d, y >= 49 ? b = y - 49 + 10 : y >= 17 ? b = y - 17 + 10 : b = y, r(y >= 0 && b < d, "Invalid character"), g += b;
      }
      return g;
    }
    s.prototype._parseBase = function(a, c, d) {
      this.words = [0], this.length = 1;
      for (var g = 0, b = 1; b <= 67108863; b *= c)
        g++;
      g--, b = b / c | 0;
      for (var w = a.length - d, k = w % g, y = Math.min(w, w - k) + d, l = 0, v = d; v < y; v += g)
        l = h(a, v, v + g, c), this.imuln(b), this.words[0] + l < 67108864 ? this.words[0] += l : this._iaddn(l);
      if (k !== 0) {
        var X = 1;
        for (l = h(a, v, a.length, c), v = 0; v < k; v++)
          X *= c;
        this.imuln(X), this.words[0] + l < 67108864 ? this.words[0] += l : this._iaddn(l);
      }
      this._strip();
    }, s.prototype.copy = function(a) {
      a.words = new Array(this.length);
      for (var c = 0; c < this.length; c++)
        a.words[c] = this.words[c];
      a.length = this.length, a.negative = this.negative, a.red = this.red;
    };
    function p(P, a) {
      P.words = a.words, P.length = a.length, P.negative = a.negative, P.red = a.red;
    }
    if (s.prototype._move = function(a) {
      p(a, this);
    }, s.prototype.clone = function() {
      var a = new s(null);
      return this.copy(a), a;
    }, s.prototype._expand = function(a) {
      for (; this.length < a; )
        this.words[this.length++] = 0;
      return this;
    }, s.prototype._strip = function() {
      for (; this.length > 1 && this.words[this.length - 1] === 0; )
        this.length--;
      return this._normSign();
    }, s.prototype._normSign = function() {
      return this.length === 1 && this.words[0] === 0 && (this.negative = 0), this;
    }, typeof Symbol < "u" && typeof Symbol.for == "function")
      try {
        s.prototype[Symbol.for("nodejs.util.inspect.custom")] = m;
      } catch {
        s.prototype.inspect = m;
      }
    else
      s.prototype.inspect = m;
    function m() {
      return (this.red ? "<BN-R: " : "<BN: ") + this.toString(16) + ">";
    }
    var O = [
      "",
      "0",
      "00",
      "000",
      "0000",
      "00000",
      "000000",
      "0000000",
      "00000000",
      "000000000",
      "0000000000",
      "00000000000",
      "000000000000",
      "0000000000000",
      "00000000000000",
      "000000000000000",
      "0000000000000000",
      "00000000000000000",
      "000000000000000000",
      "0000000000000000000",
      "00000000000000000000",
      "000000000000000000000",
      "0000000000000000000000",
      "00000000000000000000000",
      "000000000000000000000000",
      "0000000000000000000000000"
    ], L = [
      0,
      0,
      25,
      16,
      12,
      11,
      10,
      9,
      8,
      8,
      7,
      7,
      7,
      7,
      6,
      6,
      6,
      6,
      6,
      6,
      6,
      5,
      5,
      5,
      5,
      5,
      5,
      5,
      5,
      5,
      5,
      5,
      5,
      5,
      5,
      5,
      5
    ], N = [
      0,
      0,
      33554432,
      43046721,
      16777216,
      48828125,
      60466176,
      40353607,
      16777216,
      43046721,
      1e7,
      19487171,
      35831808,
      62748517,
      7529536,
      11390625,
      16777216,
      24137569,
      34012224,
      47045881,
      64e6,
      4084101,
      5153632,
      6436343,
      7962624,
      9765625,
      11881376,
      14348907,
      17210368,
      20511149,
      243e5,
      28629151,
      33554432,
      39135393,
      45435424,
      52521875,
      60466176
    ];
    s.prototype.toString = function(a, c) {
      a = a || 10, c = c | 0 || 1;
      var d;
      if (a === 16 || a === "hex") {
        d = "";
        for (var g = 0, b = 0, w = 0; w < this.length; w++) {
          var k = this.words[w], y = ((k << g | b) & 16777215).toString(16);
          b = k >>> 24 - g & 16777215, g += 2, g >= 26 && (g -= 26, w--), b !== 0 || w !== this.length - 1 ? d = O[6 - y.length] + y + d : d = y + d;
        }
        for (b !== 0 && (d = b.toString(16) + d); d.length % c !== 0; )
          d = "0" + d;
        return this.negative !== 0 && (d = "-" + d), d;
      }
      if (a === (a | 0) && a >= 2 && a <= 36) {
        var l = L[a], v = N[a];
        d = "";
        var X = this.clone();
        for (X.negative = 0; !X.isZero(); ) {
          var F = X.modrn(v).toString(a);
          X = X.idivn(v), X.isZero() ? d = F + d : d = O[l - F.length] + F + d;
        }
        for (this.isZero() && (d = "0" + d); d.length % c !== 0; )
          d = "0" + d;
        return this.negative !== 0 && (d = "-" + d), d;
      }
      r(!1, "Base should be between 2 and 36");
    }, s.prototype.toNumber = function() {
      var a = this.words[0];
      return this.length === 2 ? a += this.words[1] * 67108864 : this.length === 3 && this.words[2] === 1 ? a += 4503599627370496 + this.words[1] * 67108864 : this.length > 2 && r(!1, "Number can only safely store up to 53 bits"), this.negative !== 0 ? -a : a;
    }, s.prototype.toJSON = function() {
      return this.toString(16, 2);
    }, o && (s.prototype.toBuffer = function(a, c) {
      return this.toArrayLike(o, a, c);
    }), s.prototype.toArray = function(a, c) {
      return this.toArrayLike(Array, a, c);
    };
    var x = function(a, c) {
      return a.allocUnsafe ? a.allocUnsafe(c) : new a(c);
    };
    s.prototype.toArrayLike = function(a, c, d) {
      this._strip();
      var g = this.byteLength(), b = d || Math.max(1, g);
      r(g <= b, "byte array longer than desired length"), r(b > 0, "Requested array length <= 0");
      var w = x(a, b), k = c === "le" ? "LE" : "BE";
      return this["_toArrayLike" + k](w, g), w;
    }, s.prototype._toArrayLikeLE = function(a, c) {
      for (var d = 0, g = 0, b = 0, w = 0; b < this.length; b++) {
        var k = this.words[b] << w | g;
        a[d++] = k & 255, d < a.length && (a[d++] = k >> 8 & 255), d < a.length && (a[d++] = k >> 16 & 255), w === 6 ? (d < a.length && (a[d++] = k >> 24 & 255), g = 0, w = 0) : (g = k >>> 24, w += 2);
      }
      if (d < a.length)
        for (a[d++] = g; d < a.length; )
          a[d++] = 0;
    }, s.prototype._toArrayLikeBE = function(a, c) {
      for (var d = a.length - 1, g = 0, b = 0, w = 0; b < this.length; b++) {
        var k = this.words[b] << w | g;
        a[d--] = k & 255, d >= 0 && (a[d--] = k >> 8 & 255), d >= 0 && (a[d--] = k >> 16 & 255), w === 6 ? (d >= 0 && (a[d--] = k >> 24 & 255), g = 0, w = 0) : (g = k >>> 24, w += 2);
      }
      if (d >= 0)
        for (a[d--] = g; d >= 0; )
          a[d--] = 0;
    }, Math.clz32 ? s.prototype._countBits = function(a) {
      return 32 - Math.clz32(a);
    } : s.prototype._countBits = function(a) {
      var c = a, d = 0;
      return c >= 4096 && (d += 13, c >>>= 13), c >= 64 && (d += 7, c >>>= 7), c >= 8 && (d += 4, c >>>= 4), c >= 2 && (d += 2, c >>>= 2), d + c;
    }, s.prototype._zeroBits = function(a) {
      if (a === 0) return 26;
      var c = a, d = 0;
      return c & 8191 || (d += 13, c >>>= 13), c & 127 || (d += 7, c >>>= 7), c & 15 || (d += 4, c >>>= 4), c & 3 || (d += 2, c >>>= 2), c & 1 || d++, d;
    }, s.prototype.bitLength = function() {
      var a = this.words[this.length - 1], c = this._countBits(a);
      return (this.length - 1) * 26 + c;
    };
    function E(P) {
      for (var a = new Array(P.bitLength()), c = 0; c < a.length; c++) {
        var d = c / 26 | 0, g = c % 26;
        a[c] = P.words[d] >>> g & 1;
      }
      return a;
    }
    s.prototype.zeroBits = function() {
      if (this.isZero()) return 0;
      for (var a = 0, c = 0; c < this.length; c++) {
        var d = this._zeroBits(this.words[c]);
        if (a += d, d !== 26) break;
      }
      return a;
    }, s.prototype.byteLength = function() {
      return Math.ceil(this.bitLength() / 8);
    }, s.prototype.toTwos = function(a) {
      return this.negative !== 0 ? this.abs().inotn(a).iaddn(1) : this.clone();
    }, s.prototype.fromTwos = function(a) {
      return this.testn(a - 1) ? this.notn(a).iaddn(1).ineg() : this.clone();
    }, s.prototype.isNeg = function() {
      return this.negative !== 0;
    }, s.prototype.neg = function() {
      return this.clone().ineg();
    }, s.prototype.ineg = function() {
      return this.isZero() || (this.negative ^= 1), this;
    }, s.prototype.iuor = function(a) {
      for (; this.length < a.length; )
        this.words[this.length++] = 0;
      for (var c = 0; c < a.length; c++)
        this.words[c] = this.words[c] | a.words[c];
      return this._strip();
    }, s.prototype.ior = function(a) {
      return r((this.negative | a.negative) === 0), this.iuor(a);
    }, s.prototype.or = function(a) {
      return this.length > a.length ? this.clone().ior(a) : a.clone().ior(this);
    }, s.prototype.uor = function(a) {
      return this.length > a.length ? this.clone().iuor(a) : a.clone().iuor(this);
    }, s.prototype.iuand = function(a) {
      var c;
      this.length > a.length ? c = a : c = this;
      for (var d = 0; d < c.length; d++)
        this.words[d] = this.words[d] & a.words[d];
      return this.length = c.length, this._strip();
    }, s.prototype.iand = function(a) {
      return r((this.negative | a.negative) === 0), this.iuand(a);
    }, s.prototype.and = function(a) {
      return this.length > a.length ? this.clone().iand(a) : a.clone().iand(this);
    }, s.prototype.uand = function(a) {
      return this.length > a.length ? this.clone().iuand(a) : a.clone().iuand(this);
    }, s.prototype.iuxor = function(a) {
      var c, d;
      this.length > a.length ? (c = this, d = a) : (c = a, d = this);
      for (var g = 0; g < d.length; g++)
        this.words[g] = c.words[g] ^ d.words[g];
      if (this !== c)
        for (; g < c.length; g++)
          this.words[g] = c.words[g];
      return this.length = c.length, this._strip();
    }, s.prototype.ixor = function(a) {
      return r((this.negative | a.negative) === 0), this.iuxor(a);
    }, s.prototype.xor = function(a) {
      return this.length > a.length ? this.clone().ixor(a) : a.clone().ixor(this);
    }, s.prototype.uxor = function(a) {
      return this.length > a.length ? this.clone().iuxor(a) : a.clone().iuxor(this);
    }, s.prototype.inotn = function(a) {
      r(typeof a == "number" && a >= 0);
      var c = Math.ceil(a / 26) | 0, d = a % 26;
      this._expand(c), d > 0 && c--;
      for (var g = 0; g < c; g++)
        this.words[g] = ~this.words[g] & 67108863;
      return d > 0 && (this.words[g] = ~this.words[g] & 67108863 >> 26 - d), this._strip();
    }, s.prototype.notn = function(a) {
      return this.clone().inotn(a);
    }, s.prototype.setn = function(a, c) {
      r(typeof a == "number" && a >= 0);
      var d = a / 26 | 0, g = a % 26;
      return this._expand(d + 1), c ? this.words[d] = this.words[d] | 1 << g : this.words[d] = this.words[d] & ~(1 << g), this._strip();
    }, s.prototype.iadd = function(a) {
      var c;
      if (this.negative !== 0 && a.negative === 0)
        return this.negative = 0, c = this.isub(a), this.negative ^= 1, this._normSign();
      if (this.negative === 0 && a.negative !== 0)
        return a.negative = 0, c = this.isub(a), a.negative = 1, c._normSign();
      var d, g;
      this.length > a.length ? (d = this, g = a) : (d = a, g = this);
      for (var b = 0, w = 0; w < g.length; w++)
        c = (d.words[w] | 0) + (g.words[w] | 0) + b, this.words[w] = c & 67108863, b = c >>> 26;
      for (; b !== 0 && w < d.length; w++)
        c = (d.words[w] | 0) + b, this.words[w] = c & 67108863, b = c >>> 26;
      if (this.length = d.length, b !== 0)
        this.words[this.length] = b, this.length++;
      else if (d !== this)
        for (; w < d.length; w++)
          this.words[w] = d.words[w];
      return this;
    }, s.prototype.add = function(a) {
      var c;
      return a.negative !== 0 && this.negative === 0 ? (a.negative = 0, c = this.sub(a), a.negative ^= 1, c) : a.negative === 0 && this.negative !== 0 ? (this.negative = 0, c = a.sub(this), this.negative = 1, c) : this.length > a.length ? this.clone().iadd(a) : a.clone().iadd(this);
    }, s.prototype.isub = function(a) {
      if (a.negative !== 0) {
        a.negative = 0;
        var c = this.iadd(a);
        return a.negative = 1, c._normSign();
      } else if (this.negative !== 0)
        return this.negative = 0, this.iadd(a), this.negative = 1, this._normSign();
      var d = this.cmp(a);
      if (d === 0)
        return this.negative = 0, this.length = 1, this.words[0] = 0, this;
      var g, b;
      d > 0 ? (g = this, b = a) : (g = a, b = this);
      for (var w = 0, k = 0; k < b.length; k++)
        c = (g.words[k] | 0) - (b.words[k] | 0) + w, w = c >> 26, this.words[k] = c & 67108863;
      for (; w !== 0 && k < g.length; k++)
        c = (g.words[k] | 0) + w, w = c >> 26, this.words[k] = c & 67108863;
      if (w === 0 && k < g.length && g !== this)
        for (; k < g.length; k++)
          this.words[k] = g.words[k];
      return this.length = Math.max(this.length, k), g !== this && (this.negative = 1), this._strip();
    }, s.prototype.sub = function(a) {
      return this.clone().isub(a);
    };
    function T(P, a, c) {
      c.negative = a.negative ^ P.negative;
      var d = P.length + a.length | 0;
      c.length = d, d = d - 1 | 0;
      var g = P.words[0] | 0, b = a.words[0] | 0, w = g * b, k = w & 67108863, y = w / 67108864 | 0;
      c.words[0] = k;
      for (var l = 1; l < d; l++) {
        for (var v = y >>> 26, X = y & 67108863, F = Math.min(l, a.length - 1), C = Math.max(0, l - P.length + 1); C <= F; C++) {
          var $ = l - C | 0;
          g = P.words[$] | 0, b = a.words[C] | 0, w = g * b + X, v += w / 67108864 | 0, X = w & 67108863;
        }
        c.words[l] = X | 0, y = v | 0;
      }
      return y !== 0 ? c.words[l] = y | 0 : c.length--, c._strip();
    }
    var M = function(a, c, d) {
      var g = a.words, b = c.words, w = d.words, k = 0, y, l, v, X = g[0] | 0, F = X & 8191, C = X >>> 13, $ = g[1] | 0, Y = $ & 8191, K = $ >>> 13, Ye = g[2] | 0, J = Ye & 8191, Q = Ye >>> 13, tt = g[3] | 0, se = tt & 8191, ae = tt >>> 13, Yn = g[4] | 0, ge = Yn & 8191, be = Yn >>> 13, Nn = g[5] | 0, le = Nn & 8191, fe = Nn >>> 13, Ln = g[6] | 0, de = Ln & 8191, he = Ln >>> 13, En = g[7] | 0, pe = En & 8191, ye = En >>> 13, Wn = g[8] | 0, ve = Wn & 8191, we = Wn >>> 13, xs = g[9] | 0, Pe = xs & 8191, Oe = xs >>> 13, Ps = b[0] | 0, Ne = Ps & 8191, Le = Ps >>> 13, Os = b[1] | 0, Ee = Os & 8191, ke = Os >>> 13, Ns = b[2] | 0, Te = Ns & 8191, Me = Ns >>> 13, Ls = b[3] | 0, Se = Ls & 8191, ze = Ls >>> 13, Es = b[4] | 0, Ae = Es & 8191, je = Es >>> 13, ks = b[5] | 0, He = ks & 8191, Re = ks >>> 13, Ts = b[6] | 0, Ie = Ts & 8191, Ue = Ts >>> 13, Ms = b[7] | 0, Xe = Ms & 8191, De = Ms >>> 13, Ss = b[8] | 0, Be = Ss & 8191, Fe = Ss >>> 13, zs = b[9] | 0, Ce = zs & 8191, Ze = zs >>> 13;
      d.negative = a.negative ^ c.negative, d.length = 19, y = Math.imul(F, Ne), l = Math.imul(F, Le), l = l + Math.imul(C, Ne) | 0, v = Math.imul(C, Le);
      var Ur = (k + y | 0) + ((l & 8191) << 13) | 0;
      k = (v + (l >>> 13) | 0) + (Ur >>> 26) | 0, Ur &= 67108863, y = Math.imul(Y, Ne), l = Math.imul(Y, Le), l = l + Math.imul(K, Ne) | 0, v = Math.imul(K, Le), y = y + Math.imul(F, Ee) | 0, l = l + Math.imul(F, ke) | 0, l = l + Math.imul(C, Ee) | 0, v = v + Math.imul(C, ke) | 0;
      var Xr = (k + y | 0) + ((l & 8191) << 13) | 0;
      k = (v + (l >>> 13) | 0) + (Xr >>> 26) | 0, Xr &= 67108863, y = Math.imul(J, Ne), l = Math.imul(J, Le), l = l + Math.imul(Q, Ne) | 0, v = Math.imul(Q, Le), y = y + Math.imul(Y, Ee) | 0, l = l + Math.imul(Y, ke) | 0, l = l + Math.imul(K, Ee) | 0, v = v + Math.imul(K, ke) | 0, y = y + Math.imul(F, Te) | 0, l = l + Math.imul(F, Me) | 0, l = l + Math.imul(C, Te) | 0, v = v + Math.imul(C, Me) | 0;
      var Dr = (k + y | 0) + ((l & 8191) << 13) | 0;
      k = (v + (l >>> 13) | 0) + (Dr >>> 26) | 0, Dr &= 67108863, y = Math.imul(se, Ne), l = Math.imul(se, Le), l = l + Math.imul(ae, Ne) | 0, v = Math.imul(ae, Le), y = y + Math.imul(J, Ee) | 0, l = l + Math.imul(J, ke) | 0, l = l + Math.imul(Q, Ee) | 0, v = v + Math.imul(Q, ke) | 0, y = y + Math.imul(Y, Te) | 0, l = l + Math.imul(Y, Me) | 0, l = l + Math.imul(K, Te) | 0, v = v + Math.imul(K, Me) | 0, y = y + Math.imul(F, Se) | 0, l = l + Math.imul(F, ze) | 0, l = l + Math.imul(C, Se) | 0, v = v + Math.imul(C, ze) | 0;
      var Br = (k + y | 0) + ((l & 8191) << 13) | 0;
      k = (v + (l >>> 13) | 0) + (Br >>> 26) | 0, Br &= 67108863, y = Math.imul(ge, Ne), l = Math.imul(ge, Le), l = l + Math.imul(be, Ne) | 0, v = Math.imul(be, Le), y = y + Math.imul(se, Ee) | 0, l = l + Math.imul(se, ke) | 0, l = l + Math.imul(ae, Ee) | 0, v = v + Math.imul(ae, ke) | 0, y = y + Math.imul(J, Te) | 0, l = l + Math.imul(J, Me) | 0, l = l + Math.imul(Q, Te) | 0, v = v + Math.imul(Q, Me) | 0, y = y + Math.imul(Y, Se) | 0, l = l + Math.imul(Y, ze) | 0, l = l + Math.imul(K, Se) | 0, v = v + Math.imul(K, ze) | 0, y = y + Math.imul(F, Ae) | 0, l = l + Math.imul(F, je) | 0, l = l + Math.imul(C, Ae) | 0, v = v + Math.imul(C, je) | 0;
      var Fr = (k + y | 0) + ((l & 8191) << 13) | 0;
      k = (v + (l >>> 13) | 0) + (Fr >>> 26) | 0, Fr &= 67108863, y = Math.imul(le, Ne), l = Math.imul(le, Le), l = l + Math.imul(fe, Ne) | 0, v = Math.imul(fe, Le), y = y + Math.imul(ge, Ee) | 0, l = l + Math.imul(ge, ke) | 0, l = l + Math.imul(be, Ee) | 0, v = v + Math.imul(be, ke) | 0, y = y + Math.imul(se, Te) | 0, l = l + Math.imul(se, Me) | 0, l = l + Math.imul(ae, Te) | 0, v = v + Math.imul(ae, Me) | 0, y = y + Math.imul(J, Se) | 0, l = l + Math.imul(J, ze) | 0, l = l + Math.imul(Q, Se) | 0, v = v + Math.imul(Q, ze) | 0, y = y + Math.imul(Y, Ae) | 0, l = l + Math.imul(Y, je) | 0, l = l + Math.imul(K, Ae) | 0, v = v + Math.imul(K, je) | 0, y = y + Math.imul(F, He) | 0, l = l + Math.imul(F, Re) | 0, l = l + Math.imul(C, He) | 0, v = v + Math.imul(C, Re) | 0;
      var Cr = (k + y | 0) + ((l & 8191) << 13) | 0;
      k = (v + (l >>> 13) | 0) + (Cr >>> 26) | 0, Cr &= 67108863, y = Math.imul(de, Ne), l = Math.imul(de, Le), l = l + Math.imul(he, Ne) | 0, v = Math.imul(he, Le), y = y + Math.imul(le, Ee) | 0, l = l + Math.imul(le, ke) | 0, l = l + Math.imul(fe, Ee) | 0, v = v + Math.imul(fe, ke) | 0, y = y + Math.imul(ge, Te) | 0, l = l + Math.imul(ge, Me) | 0, l = l + Math.imul(be, Te) | 0, v = v + Math.imul(be, Me) | 0, y = y + Math.imul(se, Se) | 0, l = l + Math.imul(se, ze) | 0, l = l + Math.imul(ae, Se) | 0, v = v + Math.imul(ae, ze) | 0, y = y + Math.imul(J, Ae) | 0, l = l + Math.imul(J, je) | 0, l = l + Math.imul(Q, Ae) | 0, v = v + Math.imul(Q, je) | 0, y = y + Math.imul(Y, He) | 0, l = l + Math.imul(Y, Re) | 0, l = l + Math.imul(K, He) | 0, v = v + Math.imul(K, Re) | 0, y = y + Math.imul(F, Ie) | 0, l = l + Math.imul(F, Ue) | 0, l = l + Math.imul(C, Ie) | 0, v = v + Math.imul(C, Ue) | 0;
      var Zr = (k + y | 0) + ((l & 8191) << 13) | 0;
      k = (v + (l >>> 13) | 0) + (Zr >>> 26) | 0, Zr &= 67108863, y = Math.imul(pe, Ne), l = Math.imul(pe, Le), l = l + Math.imul(ye, Ne) | 0, v = Math.imul(ye, Le), y = y + Math.imul(de, Ee) | 0, l = l + Math.imul(de, ke) | 0, l = l + Math.imul(he, Ee) | 0, v = v + Math.imul(he, ke) | 0, y = y + Math.imul(le, Te) | 0, l = l + Math.imul(le, Me) | 0, l = l + Math.imul(fe, Te) | 0, v = v + Math.imul(fe, Me) | 0, y = y + Math.imul(ge, Se) | 0, l = l + Math.imul(ge, ze) | 0, l = l + Math.imul(be, Se) | 0, v = v + Math.imul(be, ze) | 0, y = y + Math.imul(se, Ae) | 0, l = l + Math.imul(se, je) | 0, l = l + Math.imul(ae, Ae) | 0, v = v + Math.imul(ae, je) | 0, y = y + Math.imul(J, He) | 0, l = l + Math.imul(J, Re) | 0, l = l + Math.imul(Q, He) | 0, v = v + Math.imul(Q, Re) | 0, y = y + Math.imul(Y, Ie) | 0, l = l + Math.imul(Y, Ue) | 0, l = l + Math.imul(K, Ie) | 0, v = v + Math.imul(K, Ue) | 0, y = y + Math.imul(F, Xe) | 0, l = l + Math.imul(F, De) | 0, l = l + Math.imul(C, Xe) | 0, v = v + Math.imul(C, De) | 0;
      var Vr = (k + y | 0) + ((l & 8191) << 13) | 0;
      k = (v + (l >>> 13) | 0) + (Vr >>> 26) | 0, Vr &= 67108863, y = Math.imul(ve, Ne), l = Math.imul(ve, Le), l = l + Math.imul(we, Ne) | 0, v = Math.imul(we, Le), y = y + Math.imul(pe, Ee) | 0, l = l + Math.imul(pe, ke) | 0, l = l + Math.imul(ye, Ee) | 0, v = v + Math.imul(ye, ke) | 0, y = y + Math.imul(de, Te) | 0, l = l + Math.imul(de, Me) | 0, l = l + Math.imul(he, Te) | 0, v = v + Math.imul(he, Me) | 0, y = y + Math.imul(le, Se) | 0, l = l + Math.imul(le, ze) | 0, l = l + Math.imul(fe, Se) | 0, v = v + Math.imul(fe, ze) | 0, y = y + Math.imul(ge, Ae) | 0, l = l + Math.imul(ge, je) | 0, l = l + Math.imul(be, Ae) | 0, v = v + Math.imul(be, je) | 0, y = y + Math.imul(se, He) | 0, l = l + Math.imul(se, Re) | 0, l = l + Math.imul(ae, He) | 0, v = v + Math.imul(ae, Re) | 0, y = y + Math.imul(J, Ie) | 0, l = l + Math.imul(J, Ue) | 0, l = l + Math.imul(Q, Ie) | 0, v = v + Math.imul(Q, Ue) | 0, y = y + Math.imul(Y, Xe) | 0, l = l + Math.imul(Y, De) | 0, l = l + Math.imul(K, Xe) | 0, v = v + Math.imul(K, De) | 0, y = y + Math.imul(F, Be) | 0, l = l + Math.imul(F, Fe) | 0, l = l + Math.imul(C, Be) | 0, v = v + Math.imul(C, Fe) | 0;
      var Gr = (k + y | 0) + ((l & 8191) << 13) | 0;
      k = (v + (l >>> 13) | 0) + (Gr >>> 26) | 0, Gr &= 67108863, y = Math.imul(Pe, Ne), l = Math.imul(Pe, Le), l = l + Math.imul(Oe, Ne) | 0, v = Math.imul(Oe, Le), y = y + Math.imul(ve, Ee) | 0, l = l + Math.imul(ve, ke) | 0, l = l + Math.imul(we, Ee) | 0, v = v + Math.imul(we, ke) | 0, y = y + Math.imul(pe, Te) | 0, l = l + Math.imul(pe, Me) | 0, l = l + Math.imul(ye, Te) | 0, v = v + Math.imul(ye, Me) | 0, y = y + Math.imul(de, Se) | 0, l = l + Math.imul(de, ze) | 0, l = l + Math.imul(he, Se) | 0, v = v + Math.imul(he, ze) | 0, y = y + Math.imul(le, Ae) | 0, l = l + Math.imul(le, je) | 0, l = l + Math.imul(fe, Ae) | 0, v = v + Math.imul(fe, je) | 0, y = y + Math.imul(ge, He) | 0, l = l + Math.imul(ge, Re) | 0, l = l + Math.imul(be, He) | 0, v = v + Math.imul(be, Re) | 0, y = y + Math.imul(se, Ie) | 0, l = l + Math.imul(se, Ue) | 0, l = l + Math.imul(ae, Ie) | 0, v = v + Math.imul(ae, Ue) | 0, y = y + Math.imul(J, Xe) | 0, l = l + Math.imul(J, De) | 0, l = l + Math.imul(Q, Xe) | 0, v = v + Math.imul(Q, De) | 0, y = y + Math.imul(Y, Be) | 0, l = l + Math.imul(Y, Fe) | 0, l = l + Math.imul(K, Be) | 0, v = v + Math.imul(K, Fe) | 0, y = y + Math.imul(F, Ce) | 0, l = l + Math.imul(F, Ze) | 0, l = l + Math.imul(C, Ce) | 0, v = v + Math.imul(C, Ze) | 0;
      var qr = (k + y | 0) + ((l & 8191) << 13) | 0;
      k = (v + (l >>> 13) | 0) + (qr >>> 26) | 0, qr &= 67108863, y = Math.imul(Pe, Ee), l = Math.imul(Pe, ke), l = l + Math.imul(Oe, Ee) | 0, v = Math.imul(Oe, ke), y = y + Math.imul(ve, Te) | 0, l = l + Math.imul(ve, Me) | 0, l = l + Math.imul(we, Te) | 0, v = v + Math.imul(we, Me) | 0, y = y + Math.imul(pe, Se) | 0, l = l + Math.imul(pe, ze) | 0, l = l + Math.imul(ye, Se) | 0, v = v + Math.imul(ye, ze) | 0, y = y + Math.imul(de, Ae) | 0, l = l + Math.imul(de, je) | 0, l = l + Math.imul(he, Ae) | 0, v = v + Math.imul(he, je) | 0, y = y + Math.imul(le, He) | 0, l = l + Math.imul(le, Re) | 0, l = l + Math.imul(fe, He) | 0, v = v + Math.imul(fe, Re) | 0, y = y + Math.imul(ge, Ie) | 0, l = l + Math.imul(ge, Ue) | 0, l = l + Math.imul(be, Ie) | 0, v = v + Math.imul(be, Ue) | 0, y = y + Math.imul(se, Xe) | 0, l = l + Math.imul(se, De) | 0, l = l + Math.imul(ae, Xe) | 0, v = v + Math.imul(ae, De) | 0, y = y + Math.imul(J, Be) | 0, l = l + Math.imul(J, Fe) | 0, l = l + Math.imul(Q, Be) | 0, v = v + Math.imul(Q, Fe) | 0, y = y + Math.imul(Y, Ce) | 0, l = l + Math.imul(Y, Ze) | 0, l = l + Math.imul(K, Ce) | 0, v = v + Math.imul(K, Ze) | 0;
      var Yr = (k + y | 0) + ((l & 8191) << 13) | 0;
      k = (v + (l >>> 13) | 0) + (Yr >>> 26) | 0, Yr &= 67108863, y = Math.imul(Pe, Te), l = Math.imul(Pe, Me), l = l + Math.imul(Oe, Te) | 0, v = Math.imul(Oe, Me), y = y + Math.imul(ve, Se) | 0, l = l + Math.imul(ve, ze) | 0, l = l + Math.imul(we, Se) | 0, v = v + Math.imul(we, ze) | 0, y = y + Math.imul(pe, Ae) | 0, l = l + Math.imul(pe, je) | 0, l = l + Math.imul(ye, Ae) | 0, v = v + Math.imul(ye, je) | 0, y = y + Math.imul(de, He) | 0, l = l + Math.imul(de, Re) | 0, l = l + Math.imul(he, He) | 0, v = v + Math.imul(he, Re) | 0, y = y + Math.imul(le, Ie) | 0, l = l + Math.imul(le, Ue) | 0, l = l + Math.imul(fe, Ie) | 0, v = v + Math.imul(fe, Ue) | 0, y = y + Math.imul(ge, Xe) | 0, l = l + Math.imul(ge, De) | 0, l = l + Math.imul(be, Xe) | 0, v = v + Math.imul(be, De) | 0, y = y + Math.imul(se, Be) | 0, l = l + Math.imul(se, Fe) | 0, l = l + Math.imul(ae, Be) | 0, v = v + Math.imul(ae, Fe) | 0, y = y + Math.imul(J, Ce) | 0, l = l + Math.imul(J, Ze) | 0, l = l + Math.imul(Q, Ce) | 0, v = v + Math.imul(Q, Ze) | 0;
      var Wr = (k + y | 0) + ((l & 8191) << 13) | 0;
      k = (v + (l >>> 13) | 0) + (Wr >>> 26) | 0, Wr &= 67108863, y = Math.imul(Pe, Se), l = Math.imul(Pe, ze), l = l + Math.imul(Oe, Se) | 0, v = Math.imul(Oe, ze), y = y + Math.imul(ve, Ae) | 0, l = l + Math.imul(ve, je) | 0, l = l + Math.imul(we, Ae) | 0, v = v + Math.imul(we, je) | 0, y = y + Math.imul(pe, He) | 0, l = l + Math.imul(pe, Re) | 0, l = l + Math.imul(ye, He) | 0, v = v + Math.imul(ye, Re) | 0, y = y + Math.imul(de, Ie) | 0, l = l + Math.imul(de, Ue) | 0, l = l + Math.imul(he, Ie) | 0, v = v + Math.imul(he, Ue) | 0, y = y + Math.imul(le, Xe) | 0, l = l + Math.imul(le, De) | 0, l = l + Math.imul(fe, Xe) | 0, v = v + Math.imul(fe, De) | 0, y = y + Math.imul(ge, Be) | 0, l = l + Math.imul(ge, Fe) | 0, l = l + Math.imul(be, Be) | 0, v = v + Math.imul(be, Fe) | 0, y = y + Math.imul(se, Ce) | 0, l = l + Math.imul(se, Ze) | 0, l = l + Math.imul(ae, Ce) | 0, v = v + Math.imul(ae, Ze) | 0;
      var Kr = (k + y | 0) + ((l & 8191) << 13) | 0;
      k = (v + (l >>> 13) | 0) + (Kr >>> 26) | 0, Kr &= 67108863, y = Math.imul(Pe, Ae), l = Math.imul(Pe, je), l = l + Math.imul(Oe, Ae) | 0, v = Math.imul(Oe, je), y = y + Math.imul(ve, He) | 0, l = l + Math.imul(ve, Re) | 0, l = l + Math.imul(we, He) | 0, v = v + Math.imul(we, Re) | 0, y = y + Math.imul(pe, Ie) | 0, l = l + Math.imul(pe, Ue) | 0, l = l + Math.imul(ye, Ie) | 0, v = v + Math.imul(ye, Ue) | 0, y = y + Math.imul(de, Xe) | 0, l = l + Math.imul(de, De) | 0, l = l + Math.imul(he, Xe) | 0, v = v + Math.imul(he, De) | 0, y = y + Math.imul(le, Be) | 0, l = l + Math.imul(le, Fe) | 0, l = l + Math.imul(fe, Be) | 0, v = v + Math.imul(fe, Fe) | 0, y = y + Math.imul(ge, Ce) | 0, l = l + Math.imul(ge, Ze) | 0, l = l + Math.imul(be, Ce) | 0, v = v + Math.imul(be, Ze) | 0;
      var Jr = (k + y | 0) + ((l & 8191) << 13) | 0;
      k = (v + (l >>> 13) | 0) + (Jr >>> 26) | 0, Jr &= 67108863, y = Math.imul(Pe, He), l = Math.imul(Pe, Re), l = l + Math.imul(Oe, He) | 0, v = Math.imul(Oe, Re), y = y + Math.imul(ve, Ie) | 0, l = l + Math.imul(ve, Ue) | 0, l = l + Math.imul(we, Ie) | 0, v = v + Math.imul(we, Ue) | 0, y = y + Math.imul(pe, Xe) | 0, l = l + Math.imul(pe, De) | 0, l = l + Math.imul(ye, Xe) | 0, v = v + Math.imul(ye, De) | 0, y = y + Math.imul(de, Be) | 0, l = l + Math.imul(de, Fe) | 0, l = l + Math.imul(he, Be) | 0, v = v + Math.imul(he, Fe) | 0, y = y + Math.imul(le, Ce) | 0, l = l + Math.imul(le, Ze) | 0, l = l + Math.imul(fe, Ce) | 0, v = v + Math.imul(fe, Ze) | 0;
      var Qr = (k + y | 0) + ((l & 8191) << 13) | 0;
      k = (v + (l >>> 13) | 0) + (Qr >>> 26) | 0, Qr &= 67108863, y = Math.imul(Pe, Ie), l = Math.imul(Pe, Ue), l = l + Math.imul(Oe, Ie) | 0, v = Math.imul(Oe, Ue), y = y + Math.imul(ve, Xe) | 0, l = l + Math.imul(ve, De) | 0, l = l + Math.imul(we, Xe) | 0, v = v + Math.imul(we, De) | 0, y = y + Math.imul(pe, Be) | 0, l = l + Math.imul(pe, Fe) | 0, l = l + Math.imul(ye, Be) | 0, v = v + Math.imul(ye, Fe) | 0, y = y + Math.imul(de, Ce) | 0, l = l + Math.imul(de, Ze) | 0, l = l + Math.imul(he, Ce) | 0, v = v + Math.imul(he, Ze) | 0;
      var _r = (k + y | 0) + ((l & 8191) << 13) | 0;
      k = (v + (l >>> 13) | 0) + (_r >>> 26) | 0, _r &= 67108863, y = Math.imul(Pe, Xe), l = Math.imul(Pe, De), l = l + Math.imul(Oe, Xe) | 0, v = Math.imul(Oe, De), y = y + Math.imul(ve, Be) | 0, l = l + Math.imul(ve, Fe) | 0, l = l + Math.imul(we, Be) | 0, v = v + Math.imul(we, Fe) | 0, y = y + Math.imul(pe, Ce) | 0, l = l + Math.imul(pe, Ze) | 0, l = l + Math.imul(ye, Ce) | 0, v = v + Math.imul(ye, Ze) | 0;
      var $r = (k + y | 0) + ((l & 8191) << 13) | 0;
      k = (v + (l >>> 13) | 0) + ($r >>> 26) | 0, $r &= 67108863, y = Math.imul(Pe, Be), l = Math.imul(Pe, Fe), l = l + Math.imul(Oe, Be) | 0, v = Math.imul(Oe, Fe), y = y + Math.imul(ve, Ce) | 0, l = l + Math.imul(ve, Ze) | 0, l = l + Math.imul(we, Ce) | 0, v = v + Math.imul(we, Ze) | 0;
      var ei = (k + y | 0) + ((l & 8191) << 13) | 0;
      k = (v + (l >>> 13) | 0) + (ei >>> 26) | 0, ei &= 67108863, y = Math.imul(Pe, Ce), l = Math.imul(Pe, Ze), l = l + Math.imul(Oe, Ce) | 0, v = Math.imul(Oe, Ze);
      var ti = (k + y | 0) + ((l & 8191) << 13) | 0;
      return k = (v + (l >>> 13) | 0) + (ti >>> 26) | 0, ti &= 67108863, w[0] = Ur, w[1] = Xr, w[2] = Dr, w[3] = Br, w[4] = Fr, w[5] = Cr, w[6] = Zr, w[7] = Vr, w[8] = Gr, w[9] = qr, w[10] = Yr, w[11] = Wr, w[12] = Kr, w[13] = Jr, w[14] = Qr, w[15] = _r, w[16] = $r, w[17] = ei, w[18] = ti, k !== 0 && (w[19] = k, d.length++), d;
    };
    Math.imul || (M = T);
    function S(P, a, c) {
      c.negative = a.negative ^ P.negative, c.length = P.length + a.length;
      for (var d = 0, g = 0, b = 0; b < c.length - 1; b++) {
        var w = g;
        g = 0;
        for (var k = d & 67108863, y = Math.min(b, a.length - 1), l = Math.max(0, b - P.length + 1); l <= y; l++) {
          var v = b - l, X = P.words[v] | 0, F = a.words[l] | 0, C = X * F, $ = C & 67108863;
          w = w + (C / 67108864 | 0) | 0, $ = $ + k | 0, k = $ & 67108863, w = w + ($ >>> 26) | 0, g += w >>> 26, w &= 67108863;
        }
        c.words[b] = k, d = w, w = g;
      }
      return d !== 0 ? c.words[b] = d : c.length--, c._strip();
    }
    function A(P, a, c) {
      return S(P, a, c);
    }
    s.prototype.mulTo = function(a, c) {
      var d, g = this.length + a.length;
      return this.length === 10 && a.length === 10 ? d = M(this, a, c) : g < 63 ? d = T(this, a, c) : g < 1024 ? d = S(this, a, c) : d = A(this, a, c), d;
    }, s.prototype.mul = function(a) {
      var c = new s(null);
      return c.words = new Array(this.length + a.length), this.mulTo(a, c);
    }, s.prototype.mulf = function(a) {
      var c = new s(null);
      return c.words = new Array(this.length + a.length), A(this, a, c);
    }, s.prototype.imul = function(a) {
      return this.clone().mulTo(a, this);
    }, s.prototype.imuln = function(a) {
      var c = a < 0;
      c && (a = -a), r(typeof a == "number"), r(a < 67108864);
      for (var d = 0, g = 0; g < this.length; g++) {
        var b = (this.words[g] | 0) * a, w = (b & 67108863) + (d & 67108863);
        d >>= 26, d += b / 67108864 | 0, d += w >>> 26, this.words[g] = w & 67108863;
      }
      return d !== 0 && (this.words[g] = d, this.length++), c ? this.ineg() : this;
    }, s.prototype.muln = function(a) {
      return this.clone().imuln(a);
    }, s.prototype.sqr = function() {
      return this.mul(this);
    }, s.prototype.isqr = function() {
      return this.imul(this.clone());
    }, s.prototype.pow = function(a) {
      var c = E(a);
      if (c.length === 0) return new s(1);
      for (var d = this, g = 0; g < c.length && c[g] === 0; g++, d = d.sqr())
        ;
      if (++g < c.length)
        for (var b = d.sqr(); g < c.length; g++, b = b.sqr())
          c[g] !== 0 && (d = d.mul(b));
      return d;
    }, s.prototype.iushln = function(a) {
      r(typeof a == "number" && a >= 0);
      var c = a % 26, d = (a - c) / 26, g = 67108863 >>> 26 - c << 26 - c, b;
      if (c !== 0) {
        var w = 0;
        for (b = 0; b < this.length; b++) {
          var k = this.words[b] & g, y = (this.words[b] | 0) - k << c;
          this.words[b] = y | w, w = k >>> 26 - c;
        }
        w && (this.words[b] = w, this.length++);
      }
      if (d !== 0) {
        for (b = this.length - 1; b >= 0; b--)
          this.words[b + d] = this.words[b];
        for (b = 0; b < d; b++)
          this.words[b] = 0;
        this.length += d;
      }
      return this._strip();
    }, s.prototype.ishln = function(a) {
      return r(this.negative === 0), this.iushln(a);
    }, s.prototype.iushrn = function(a, c, d) {
      r(typeof a == "number" && a >= 0);
      var g;
      c ? g = (c - c % 26) / 26 : g = 0;
      var b = a % 26, w = Math.min((a - b) / 26, this.length), k = 67108863 ^ 67108863 >>> b << b, y = d;
      if (g -= w, g = Math.max(0, g), y) {
        for (var l = 0; l < w; l++)
          y.words[l] = this.words[l];
        y.length = w;
      }
      if (w !== 0) if (this.length > w)
        for (this.length -= w, l = 0; l < this.length; l++)
          this.words[l] = this.words[l + w];
      else
        this.words[0] = 0, this.length = 1;
      var v = 0;
      for (l = this.length - 1; l >= 0 && (v !== 0 || l >= g); l--) {
        var X = this.words[l] | 0;
        this.words[l] = v << 26 - b | X >>> b, v = X & k;
      }
      return y && v !== 0 && (y.words[y.length++] = v), this.length === 0 && (this.words[0] = 0, this.length = 1), this._strip();
    }, s.prototype.ishrn = function(a, c, d) {
      return r(this.negative === 0), this.iushrn(a, c, d);
    }, s.prototype.shln = function(a) {
      return this.clone().ishln(a);
    }, s.prototype.ushln = function(a) {
      return this.clone().iushln(a);
    }, s.prototype.shrn = function(a) {
      return this.clone().ishrn(a);
    }, s.prototype.ushrn = function(a) {
      return this.clone().iushrn(a);
    }, s.prototype.testn = function(a) {
      r(typeof a == "number" && a >= 0);
      var c = a % 26, d = (a - c) / 26, g = 1 << c;
      if (this.length <= d) return !1;
      var b = this.words[d];
      return !!(b & g);
    }, s.prototype.imaskn = function(a) {
      r(typeof a == "number" && a >= 0);
      var c = a % 26, d = (a - c) / 26;
      if (r(this.negative === 0, "imaskn works only with positive numbers"), this.length <= d)
        return this;
      if (c !== 0 && d++, this.length = Math.min(d, this.length), c !== 0) {
        var g = 67108863 ^ 67108863 >>> c << c;
        this.words[this.length - 1] &= g;
      }
      return this._strip();
    }, s.prototype.maskn = function(a) {
      return this.clone().imaskn(a);
    }, s.prototype.iaddn = function(a) {
      return r(typeof a == "number"), r(a < 67108864), a < 0 ? this.isubn(-a) : this.negative !== 0 ? this.length === 1 && (this.words[0] | 0) <= a ? (this.words[0] = a - (this.words[0] | 0), this.negative = 0, this) : (this.negative = 0, this.isubn(a), this.negative = 1, this) : this._iaddn(a);
    }, s.prototype._iaddn = function(a) {
      this.words[0] += a;
      for (var c = 0; c < this.length && this.words[c] >= 67108864; c++)
        this.words[c] -= 67108864, c === this.length - 1 ? this.words[c + 1] = 1 : this.words[c + 1]++;
      return this.length = Math.max(this.length, c + 1), this;
    }, s.prototype.isubn = function(a) {
      if (r(typeof a == "number"), r(a < 67108864), a < 0) return this.iaddn(-a);
      if (this.negative !== 0)
        return this.negative = 0, this.iaddn(a), this.negative = 1, this;
      if (this.words[0] -= a, this.length === 1 && this.words[0] < 0)
        this.words[0] = -this.words[0], this.negative = 1;
      else
        for (var c = 0; c < this.length && this.words[c] < 0; c++)
          this.words[c] += 67108864, this.words[c + 1] -= 1;
      return this._strip();
    }, s.prototype.addn = function(a) {
      return this.clone().iaddn(a);
    }, s.prototype.subn = function(a) {
      return this.clone().isubn(a);
    }, s.prototype.iabs = function() {
      return this.negative = 0, this;
    }, s.prototype.abs = function() {
      return this.clone().iabs();
    }, s.prototype._ishlnsubmul = function(a, c, d) {
      var g = a.length + d, b;
      this._expand(g);
      var w, k = 0;
      for (b = 0; b < a.length; b++) {
        w = (this.words[b + d] | 0) + k;
        var y = (a.words[b] | 0) * c;
        w -= y & 67108863, k = (w >> 26) - (y / 67108864 | 0), this.words[b + d] = w & 67108863;
      }
      for (; b < this.length - d; b++)
        w = (this.words[b + d] | 0) + k, k = w >> 26, this.words[b + d] = w & 67108863;
      if (k === 0) return this._strip();
      for (r(k === -1), k = 0, b = 0; b < this.length; b++)
        w = -(this.words[b] | 0) + k, k = w >> 26, this.words[b] = w & 67108863;
      return this.negative = 1, this._strip();
    }, s.prototype._wordDiv = function(a, c) {
      var d = this.length - a.length, g = this.clone(), b = a, w = b.words[b.length - 1] | 0, k = this._countBits(w);
      d = 26 - k, d !== 0 && (b = b.ushln(d), g.iushln(d), w = b.words[b.length - 1] | 0);
      var y = g.length - b.length, l;
      if (c !== "mod") {
        l = new s(null), l.length = y + 1, l.words = new Array(l.length);
        for (var v = 0; v < l.length; v++)
          l.words[v] = 0;
      }
      var X = g.clone()._ishlnsubmul(b, 1, y);
      X.negative === 0 && (g = X, l && (l.words[y] = 1));
      for (var F = y - 1; F >= 0; F--) {
        var C = (g.words[b.length + F] | 0) * 67108864 + (g.words[b.length + F - 1] | 0);
        for (C = Math.min(C / w | 0, 67108863), g._ishlnsubmul(b, C, F); g.negative !== 0; )
          C--, g.negative = 0, g._ishlnsubmul(b, 1, F), g.isZero() || (g.negative ^= 1);
        l && (l.words[F] = C);
      }
      return l && l._strip(), g._strip(), c !== "div" && d !== 0 && g.iushrn(d), {
        div: l || null,
        mod: g
      };
    }, s.prototype.divmod = function(a, c, d) {
      if (r(!a.isZero()), this.isZero())
        return {
          div: new s(0),
          mod: new s(0)
        };
      var g, b, w;
      return this.negative !== 0 && a.negative === 0 ? (w = this.neg().divmod(a, c), c !== "mod" && (g = w.div.neg()), c !== "div" && (b = w.mod.neg(), d && b.negative !== 0 && b.iadd(a)), {
        div: g,
        mod: b
      }) : this.negative === 0 && a.negative !== 0 ? (w = this.divmod(a.neg(), c), c !== "mod" && (g = w.div.neg()), {
        div: g,
        mod: w.mod
      }) : this.negative & a.negative ? (w = this.neg().divmod(a.neg(), c), c !== "div" && (b = w.mod.neg(), d && b.negative !== 0 && b.isub(a)), {
        div: w.div,
        mod: b
      }) : a.length > this.length || this.cmp(a) < 0 ? {
        div: new s(0),
        mod: this
      } : a.length === 1 ? c === "div" ? {
        div: this.divn(a.words[0]),
        mod: null
      } : c === "mod" ? {
        div: null,
        mod: new s(this.modrn(a.words[0]))
      } : {
        div: this.divn(a.words[0]),
        mod: new s(this.modrn(a.words[0]))
      } : this._wordDiv(a, c);
    }, s.prototype.div = function(a) {
      return this.divmod(a, "div", !1).div;
    }, s.prototype.mod = function(a) {
      return this.divmod(a, "mod", !1).mod;
    }, s.prototype.umod = function(a) {
      return this.divmod(a, "mod", !0).mod;
    }, s.prototype.divRound = function(a) {
      var c = this.divmod(a);
      if (c.mod.isZero()) return c.div;
      var d = c.div.negative !== 0 ? c.mod.isub(a) : c.mod, g = a.ushrn(1), b = a.andln(1), w = d.cmp(g);
      return w < 0 || b === 1 && w === 0 ? c.div : c.div.negative !== 0 ? c.div.isubn(1) : c.div.iaddn(1);
    }, s.prototype.modrn = function(a) {
      var c = a < 0;
      c && (a = -a), r(a <= 67108863);
      for (var d = (1 << 26) % a, g = 0, b = this.length - 1; b >= 0; b--)
        g = (d * g + (this.words[b] | 0)) % a;
      return c ? -g : g;
    }, s.prototype.modn = function(a) {
      return this.modrn(a);
    }, s.prototype.idivn = function(a) {
      var c = a < 0;
      c && (a = -a), r(a <= 67108863);
      for (var d = 0, g = this.length - 1; g >= 0; g--) {
        var b = (this.words[g] | 0) + d * 67108864;
        this.words[g] = b / a | 0, d = b % a;
      }
      return this._strip(), c ? this.ineg() : this;
    }, s.prototype.divn = function(a) {
      return this.clone().idivn(a);
    }, s.prototype.egcd = function(a) {
      r(a.negative === 0), r(!a.isZero());
      var c = this, d = a.clone();
      c.negative !== 0 ? c = c.umod(a) : c = c.clone();
      for (var g = new s(1), b = new s(0), w = new s(0), k = new s(1), y = 0; c.isEven() && d.isEven(); )
        c.iushrn(1), d.iushrn(1), ++y;
      for (var l = d.clone(), v = c.clone(); !c.isZero(); ) {
        for (var X = 0, F = 1; !(c.words[0] & F) && X < 26; ++X, F <<= 1) ;
        if (X > 0)
          for (c.iushrn(X); X-- > 0; )
            (g.isOdd() || b.isOdd()) && (g.iadd(l), b.isub(v)), g.iushrn(1), b.iushrn(1);
        for (var C = 0, $ = 1; !(d.words[0] & $) && C < 26; ++C, $ <<= 1) ;
        if (C > 0)
          for (d.iushrn(C); C-- > 0; )
            (w.isOdd() || k.isOdd()) && (w.iadd(l), k.isub(v)), w.iushrn(1), k.iushrn(1);
        c.cmp(d) >= 0 ? (c.isub(d), g.isub(w), b.isub(k)) : (d.isub(c), w.isub(g), k.isub(b));
      }
      return {
        a: w,
        b: k,
        gcd: d.iushln(y)
      };
    }, s.prototype._invmp = function(a) {
      r(a.negative === 0), r(!a.isZero());
      var c = this, d = a.clone();
      c.negative !== 0 ? c = c.umod(a) : c = c.clone();
      for (var g = new s(1), b = new s(0), w = d.clone(); c.cmpn(1) > 0 && d.cmpn(1) > 0; ) {
        for (var k = 0, y = 1; !(c.words[0] & y) && k < 26; ++k, y <<= 1) ;
        if (k > 0)
          for (c.iushrn(k); k-- > 0; )
            g.isOdd() && g.iadd(w), g.iushrn(1);
        for (var l = 0, v = 1; !(d.words[0] & v) && l < 26; ++l, v <<= 1) ;
        if (l > 0)
          for (d.iushrn(l); l-- > 0; )
            b.isOdd() && b.iadd(w), b.iushrn(1);
        c.cmp(d) >= 0 ? (c.isub(d), g.isub(b)) : (d.isub(c), b.isub(g));
      }
      var X;
      return c.cmpn(1) === 0 ? X = g : X = b, X.cmpn(0) < 0 && X.iadd(a), X;
    }, s.prototype.gcd = function(a) {
      if (this.isZero()) return a.abs();
      if (a.isZero()) return this.abs();
      var c = this.clone(), d = a.clone();
      c.negative = 0, d.negative = 0;
      for (var g = 0; c.isEven() && d.isEven(); g++)
        c.iushrn(1), d.iushrn(1);
      do {
        for (; c.isEven(); )
          c.iushrn(1);
        for (; d.isEven(); )
          d.iushrn(1);
        var b = c.cmp(d);
        if (b < 0) {
          var w = c;
          c = d, d = w;
        } else if (b === 0 || d.cmpn(1) === 0)
          break;
        c.isub(d);
      } while (!0);
      return d.iushln(g);
    }, s.prototype.invm = function(a) {
      return this.egcd(a).a.umod(a);
    }, s.prototype.isEven = function() {
      return (this.words[0] & 1) === 0;
    }, s.prototype.isOdd = function() {
      return (this.words[0] & 1) === 1;
    }, s.prototype.andln = function(a) {
      return this.words[0] & a;
    }, s.prototype.bincn = function(a) {
      r(typeof a == "number");
      var c = a % 26, d = (a - c) / 26, g = 1 << c;
      if (this.length <= d)
        return this._expand(d + 1), this.words[d] |= g, this;
      for (var b = g, w = d; b !== 0 && w < this.length; w++) {
        var k = this.words[w] | 0;
        k += b, b = k >>> 26, k &= 67108863, this.words[w] = k;
      }
      return b !== 0 && (this.words[w] = b, this.length++), this;
    }, s.prototype.isZero = function() {
      return this.length === 1 && this.words[0] === 0;
    }, s.prototype.cmpn = function(a) {
      var c = a < 0;
      if (this.negative !== 0 && !c) return -1;
      if (this.negative === 0 && c) return 1;
      this._strip();
      var d;
      if (this.length > 1)
        d = 1;
      else {
        c && (a = -a), r(a <= 67108863, "Number is too big");
        var g = this.words[0] | 0;
        d = g === a ? 0 : g < a ? -1 : 1;
      }
      return this.negative !== 0 ? -d | 0 : d;
    }, s.prototype.cmp = function(a) {
      if (this.negative !== 0 && a.negative === 0) return -1;
      if (this.negative === 0 && a.negative !== 0) return 1;
      var c = this.ucmp(a);
      return this.negative !== 0 ? -c | 0 : c;
    }, s.prototype.ucmp = function(a) {
      if (this.length > a.length) return 1;
      if (this.length < a.length) return -1;
      for (var c = 0, d = this.length - 1; d >= 0; d--) {
        var g = this.words[d] | 0, b = a.words[d] | 0;
        if (g !== b) {
          g < b ? c = -1 : g > b && (c = 1);
          break;
        }
      }
      return c;
    }, s.prototype.gtn = function(a) {
      return this.cmpn(a) === 1;
    }, s.prototype.gt = function(a) {
      return this.cmp(a) === 1;
    }, s.prototype.gten = function(a) {
      return this.cmpn(a) >= 0;
    }, s.prototype.gte = function(a) {
      return this.cmp(a) >= 0;
    }, s.prototype.ltn = function(a) {
      return this.cmpn(a) === -1;
    }, s.prototype.lt = function(a) {
      return this.cmp(a) === -1;
    }, s.prototype.lten = function(a) {
      return this.cmpn(a) <= 0;
    }, s.prototype.lte = function(a) {
      return this.cmp(a) <= 0;
    }, s.prototype.eqn = function(a) {
      return this.cmpn(a) === 0;
    }, s.prototype.eq = function(a) {
      return this.cmp(a) === 0;
    }, s.red = function(a) {
      return new I(a);
    }, s.prototype.toRed = function(a) {
      return r(!this.red, "Already a number in reduction context"), r(this.negative === 0, "red works only with positives"), a.convertTo(this)._forceRed(a);
    }, s.prototype.fromRed = function() {
      return r(this.red, "fromRed works only with numbers in reduction context"), this.red.convertFrom(this);
    }, s.prototype._forceRed = function(a) {
      return this.red = a, this;
    }, s.prototype.forceRed = function(a) {
      return r(!this.red, "Already a number in reduction context"), this._forceRed(a);
    }, s.prototype.redAdd = function(a) {
      return r(this.red, "redAdd works only with red numbers"), this.red.add(this, a);
    }, s.prototype.redIAdd = function(a) {
      return r(this.red, "redIAdd works only with red numbers"), this.red.iadd(this, a);
    }, s.prototype.redSub = function(a) {
      return r(this.red, "redSub works only with red numbers"), this.red.sub(this, a);
    }, s.prototype.redISub = function(a) {
      return r(this.red, "redISub works only with red numbers"), this.red.isub(this, a);
    }, s.prototype.redShl = function(a) {
      return r(this.red, "redShl works only with red numbers"), this.red.shl(this, a);
    }, s.prototype.redMul = function(a) {
      return r(this.red, "redMul works only with red numbers"), this.red._verify2(this, a), this.red.mul(this, a);
    }, s.prototype.redIMul = function(a) {
      return r(this.red, "redMul works only with red numbers"), this.red._verify2(this, a), this.red.imul(this, a);
    }, s.prototype.redSqr = function() {
      return r(this.red, "redSqr works only with red numbers"), this.red._verify1(this), this.red.sqr(this);
    }, s.prototype.redISqr = function() {
      return r(this.red, "redISqr works only with red numbers"), this.red._verify1(this), this.red.isqr(this);
    }, s.prototype.redSqrt = function() {
      return r(this.red, "redSqrt works only with red numbers"), this.red._verify1(this), this.red.sqrt(this);
    }, s.prototype.redInvm = function() {
      return r(this.red, "redInvm works only with red numbers"), this.red._verify1(this), this.red.invm(this);
    }, s.prototype.redNeg = function() {
      return r(this.red, "redNeg works only with red numbers"), this.red._verify1(this), this.red.neg(this);
    }, s.prototype.redPow = function(a) {
      return r(this.red && !a.red, "redPow(normalNum)"), this.red._verify1(this), this.red.pow(this, a);
    };
    var j = {
      k256: null,
      p224: null,
      p192: null,
      p25519: null
    };
    function z(P, a) {
      this.name = P, this.p = new s(a, 16), this.n = this.p.bitLength(), this.k = new s(1).iushln(this.n).isub(this.p), this.tmp = this._tmp();
    }
    z.prototype._tmp = function() {
      var a = new s(null);
      return a.words = new Array(Math.ceil(this.n / 13)), a;
    }, z.prototype.ireduce = function(a) {
      var c = a, d;
      do
        this.split(c, this.tmp), c = this.imulK(c), c = c.iadd(this.tmp), d = c.bitLength();
      while (d > this.n);
      var g = d < this.n ? -1 : c.ucmp(this.p);
      return g === 0 ? (c.words[0] = 0, c.length = 1) : g > 0 ? c.isub(this.p) : c.strip !== void 0 ? c.strip() : c._strip(), c;
    }, z.prototype.split = function(a, c) {
      a.iushrn(this.n, 0, c);
    }, z.prototype.imulK = function(a) {
      return a.imul(this.k);
    };
    function U() {
      z.call(
        this,
        "k256",
        "ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff fffffffe fffffc2f"
      );
    }
    i(U, z), U.prototype.split = function(a, c) {
      for (var d = 4194303, g = Math.min(a.length, 9), b = 0; b < g; b++)
        c.words[b] = a.words[b];
      if (c.length = g, a.length <= 9) {
        a.words[0] = 0, a.length = 1;
        return;
      }
      var w = a.words[9];
      for (c.words[c.length++] = w & d, b = 10; b < a.length; b++) {
        var k = a.words[b] | 0;
        a.words[b - 10] = (k & d) << 4 | w >>> 22, w = k;
      }
      w >>>= 22, a.words[b - 10] = w, w === 0 && a.length > 10 ? a.length -= 10 : a.length -= 9;
    }, U.prototype.imulK = function(a) {
      a.words[a.length] = 0, a.words[a.length + 1] = 0, a.length += 2;
      for (var c = 0, d = 0; d < a.length; d++) {
        var g = a.words[d] | 0;
        c += g * 977, a.words[d] = c & 67108863, c = g * 64 + (c / 67108864 | 0);
      }
      return a.words[a.length - 1] === 0 && (a.length--, a.words[a.length - 1] === 0 && a.length--), a;
    };
    function H() {
      z.call(
        this,
        "p224",
        "ffffffff ffffffff ffffffff ffffffff 00000000 00000000 00000001"
      );
    }
    i(H, z);
    function G() {
      z.call(
        this,
        "p192",
        "ffffffff ffffffff ffffffff fffffffe ffffffff ffffffff"
      );
    }
    i(G, z);
    function V() {
      z.call(
        this,
        "25519",
        "7fffffffffffffff ffffffffffffffff ffffffffffffffff ffffffffffffffed"
      );
    }
    i(V, z), V.prototype.imulK = function(a) {
      for (var c = 0, d = 0; d < a.length; d++) {
        var g = (a.words[d] | 0) * 19 + c, b = g & 67108863;
        g >>>= 26, a.words[d] = b, c = g;
      }
      return c !== 0 && (a.words[a.length++] = c), a;
    }, s._prime = function(a) {
      if (j[a]) return j[a];
      var c;
      if (a === "k256")
        c = new U();
      else if (a === "p224")
        c = new H();
      else if (a === "p192")
        c = new G();
      else if (a === "p25519")
        c = new V();
      else
        throw new Error("Unknown prime " + a);
      return j[a] = c, c;
    };
    function I(P) {
      if (typeof P == "string") {
        var a = s._prime(P);
        this.m = a.p, this.prime = a;
      } else
        r(P.gtn(1), "modulus must be greater than 1"), this.m = P, this.prime = null;
    }
    I.prototype._verify1 = function(a) {
      r(a.negative === 0, "red works only with positives"), r(a.red, "red works only with red numbers");
    }, I.prototype._verify2 = function(a, c) {
      r((a.negative | c.negative) === 0, "red works only with positives"), r(
        a.red && a.red === c.red,
        "red works only with red numbers"
      );
    }, I.prototype.imod = function(a) {
      return this.prime ? this.prime.ireduce(a)._forceRed(this) : (p(a, a.umod(this.m)._forceRed(this)), a);
    }, I.prototype.neg = function(a) {
      return a.isZero() ? a.clone() : this.m.sub(a)._forceRed(this);
    }, I.prototype.add = function(a, c) {
      this._verify2(a, c);
      var d = a.add(c);
      return d.cmp(this.m) >= 0 && d.isub(this.m), d._forceRed(this);
    }, I.prototype.iadd = function(a, c) {
      this._verify2(a, c);
      var d = a.iadd(c);
      return d.cmp(this.m) >= 0 && d.isub(this.m), d;
    }, I.prototype.sub = function(a, c) {
      this._verify2(a, c);
      var d = a.sub(c);
      return d.cmpn(0) < 0 && d.iadd(this.m), d._forceRed(this);
    }, I.prototype.isub = function(a, c) {
      this._verify2(a, c);
      var d = a.isub(c);
      return d.cmpn(0) < 0 && d.iadd(this.m), d;
    }, I.prototype.shl = function(a, c) {
      return this._verify1(a), this.imod(a.ushln(c));
    }, I.prototype.imul = function(a, c) {
      return this._verify2(a, c), this.imod(a.imul(c));
    }, I.prototype.mul = function(a, c) {
      return this._verify2(a, c), this.imod(a.mul(c));
    }, I.prototype.isqr = function(a) {
      return this.imul(a, a.clone());
    }, I.prototype.sqr = function(a) {
      return this.mul(a, a);
    }, I.prototype.sqrt = function(a) {
      if (a.isZero()) return a.clone();
      var c = this.m.andln(3);
      if (r(c % 2 === 1), c === 3) {
        var d = this.m.add(new s(1)).iushrn(2);
        return this.pow(a, d);
      }
      for (var g = this.m.subn(1), b = 0; !g.isZero() && g.andln(1) === 0; )
        b++, g.iushrn(1);
      r(!g.isZero());
      var w = new s(1).toRed(this), k = w.redNeg(), y = this.m.subn(1).iushrn(1), l = this.m.bitLength();
      for (l = new s(2 * l * l).toRed(this); this.pow(l, y).cmp(k) !== 0; )
        l.redIAdd(k);
      for (var v = this.pow(l, g), X = this.pow(a, g.addn(1).iushrn(1)), F = this.pow(a, g), C = b; F.cmp(w) !== 0; ) {
        for (var $ = F, Y = 0; $.cmp(w) !== 0; Y++)
          $ = $.redSqr();
        r(Y < C);
        var K = this.pow(v, new s(1).iushln(C - Y - 1));
        X = X.redMul(K), v = K.redSqr(), F = F.redMul(v), C = Y;
      }
      return X;
    }, I.prototype.invm = function(a) {
      var c = a._invmp(this.m);
      return c.negative !== 0 ? (c.negative = 0, this.imod(c).redNeg()) : this.imod(c);
    }, I.prototype.pow = function(a, c) {
      if (c.isZero()) return new s(1).toRed(this);
      if (c.cmpn(1) === 0) return a.clone();
      var d = 4, g = new Array(1 << d);
      g[0] = new s(1).toRed(this), g[1] = a;
      for (var b = 2; b < g.length; b++)
        g[b] = this.mul(g[b - 1], a);
      var w = g[0], k = 0, y = 0, l = c.bitLength() % 26;
      for (l === 0 && (l = 26), b = c.length - 1; b >= 0; b--) {
        for (var v = c.words[b], X = l - 1; X >= 0; X--) {
          var F = v >> X & 1;
          if (w !== g[0] && (w = this.sqr(w)), F === 0 && k === 0) {
            y = 0;
            continue;
          }
          k <<= 1, k |= F, y++, !(y !== d && (b !== 0 || X !== 0)) && (w = this.mul(w, g[k]), y = 0, k = 0);
        }
        l = 26;
      }
      return w;
    }, I.prototype.convertTo = function(a) {
      var c = a.umod(this.m);
      return c === a ? c.clone() : c;
    }, I.prototype.convertFrom = function(a) {
      var c = a.clone();
      return c.red = null, c;
    }, s.mont = function(a) {
      return new B(a);
    };
    function B(P) {
      I.call(this, P), this.shift = this.m.bitLength(), this.shift % 26 !== 0 && (this.shift += 26 - this.shift % 26), this.r = new s(1).iushln(this.shift), this.r2 = this.imod(this.r.sqr()), this.rinv = this.r._invmp(this.m), this.minv = this.rinv.mul(this.r).isubn(1).div(this.m), this.minv = this.minv.umod(this.r), this.minv = this.r.sub(this.minv);
    }
    i(B, I), B.prototype.convertTo = function(a) {
      return this.imod(a.ushln(this.shift));
    }, B.prototype.convertFrom = function(a) {
      var c = this.imod(a.mul(this.rinv));
      return c.red = null, c;
    }, B.prototype.imul = function(a, c) {
      if (a.isZero() || c.isZero())
        return a.words[0] = 0, a.length = 1, a;
      var d = a.imul(c), g = d.maskn(this.shift).mul(this.minv).imaskn(this.shift).mul(this.m), b = d.isub(g).iushrn(this.shift), w = b;
      return b.cmp(this.m) >= 0 ? w = b.isub(this.m) : b.cmpn(0) < 0 && (w = b.iadd(this.m)), w._forceRed(this);
    }, B.prototype.mul = function(a, c) {
      if (a.isZero() || c.isZero()) return new s(0)._forceRed(this);
      var d = a.mul(c), g = d.maskn(this.shift).mul(this.minv).imaskn(this.shift).mul(this.m), b = d.isub(g).iushrn(this.shift), w = b;
      return b.cmp(this.m) >= 0 ? w = b.isub(this.m) : b.cmpn(0) < 0 && (w = b.iadd(this.m)), w._forceRed(this);
    }, B.prototype.invm = function(a) {
      var c = this.imod(a._invmp(this.m).mul(this.r2));
      return c._forceRed(this);
    };
  })(t, jn);
})(sa);
var Ac = sa.exports;
const ee = /* @__PURE__ */ na(Ac);
function oa(t) {
  return ee.isBN(t);
}
const aa = /^0x[\da-fA-F]+$/, jc = /^[\da-fA-F]+$/;
function Mt(t, e = -1, n) {
  return typeof t == "string" && (t === "0x" || aa.test(t)) && (e === -1 ? t.length % 2 === 0 : t.length === 2 + Math.ceil(e / 4));
}
function Hc(t) {
  return !!t && typeof t == "object";
}
function fa(...t) {
  return (e) => (Hc(e) || Ti(e)) && t.every((n) => Ti(e[n]));
}
const ca = /* @__PURE__ */ fa("toBigInt"), ua = /* @__PURE__ */ fa("toBn");
function Rc(t) {
  return typeof t == "bigint" ? t : t ? Mt(t) ? zc(t.toString()) : oa(t) ? ie(t.toString()) : ca(t) ? t.toBigInt() : ua(t) ? ie(t.toBn().toString()) : ie(t) : ie(0);
}
function Ic(t) {
  throw new Error('Could not dynamically require "' + t + '". Please configure the dynamicRequireTargets or/and ignoreDynamicRequires option of @rollup/plugin-commonjs appropriately for this require call to work.');
}
const $e = typeof ie == "function" && typeof ie.asIntN == "function", Uc = typeof yn.Buffer == "function" && typeof yn.Buffer.isBuffer == "function";
function Xc(t) {
  return Uc && !!t && Ti(t.readDoubleLE) && yn.Buffer.isBuffer(t);
}
function Kt(t) {
  return (t && t.constructor) === Uint8Array || t instanceof Uint8Array;
}
function W(t) {
  return Kt(t) ? Xc(t) ? new Uint8Array(t) : t : Mt(t) ? pn(t) : Array.isArray(t) ? new Uint8Array(t) : it(t);
}
function Qe(...t) {
  const e = t.length, n = new Array(e);
  let r = 0;
  for (let i = 0; i < e; i++)
    n[i] = W(t[i]), r += n[i].length;
  return Cn(n, r);
}
function Cn(t, e = 0) {
  const n = t.length;
  let r = 0;
  if (!e)
    for (let s = 0; s < n; s++)
      e += t[s].length;
  const i = new Uint8Array(e);
  for (let s = 0; s < n; s++)
    i.set(t[s], r), r += t[s].length;
  return i;
}
function la(t) {
  const e = t.length | 0;
  for (let n = 0; n < e; n++)
    if (t[n] | 0)
      return !1;
  return !0;
}
function Nt(t, e) {
  const n = W(t), r = W(e);
  if (n.length === r.length) {
    const i = new DataView(n.buffer, n.byteOffset), s = new DataView(r.buffer, r.byteOffset), o = n.length % 4 | 0, f = n.length - o | 0;
    for (let u = 0; u < f; u += 4)
      if (i.getUint32(u) !== s.getUint32(u))
        return !1;
    for (let u = f, h = n.length; u < h; u++)
      if (n[u] !== r[u])
        return !1;
    return !0;
  }
  return !1;
}
function Dc(t, e = -1, n = !1) {
  const r = Math.ceil(e / 8);
  if (e === -1 || t.length === r)
    return t;
  if (t.length > r)
    return t.subarray(0, r);
  const i = new Uint8Array(r);
  return i.set(t, n ? 0 : r - t.length), i;
}
function ii(t, { isLe: e = !0, isNegative: n = !1 } = {}) {
  e || (t = t.slice().reverse());
  const r = t.length;
  if (n && r && t[r - 1] & 128)
    switch (r) {
      case 0:
        return new ee(0);
      case 1:
        return new ee((t[0] ^ 255) * -1 - 1);
      case 2:
        return new ee((t[0] + (t[1] << 8) ^ 65535) * -1 - 1);
      case 3:
        return new ee((t[0] + (t[1] << 8) + (t[2] << 16) ^ 16777215) * -1 - 1);
      case 4:
        return new ee((t[0] + (t[1] << 8) + (t[2] << 16) + t[3] * 16777216 ^ 4294967295) * -1 - 1);
      case 5:
        return new ee(((t[0] + (t[1] << 8) + (t[2] << 16) + t[3] * 16777216 ^ 4294967295) + (t[4] ^ 255) * 4294967296) * -1 - 1);
      case 6:
        return new ee(((t[0] + (t[1] << 8) + (t[2] << 16) + t[3] * 16777216 ^ 4294967295) + (t[4] + (t[5] << 8) ^ 65535) * 4294967296) * -1 - 1);
      default:
        return new ee(t, "le").fromTwos(r * 8);
    }
  switch (r) {
    case 0:
      return new ee(0);
    case 1:
      return new ee(t[0]);
    case 2:
      return new ee(t[0] + (t[1] << 8));
    case 3:
      return new ee(t[0] + (t[1] << 8) + (t[2] << 16));
    case 4:
      return new ee(t[0] + (t[1] << 8) + (t[2] << 16) + t[3] * 16777216);
    case 5:
      return new ee(t[0] + (t[1] << 8) + (t[2] << 16) + (t[3] + (t[4] << 8)) * 16777216);
    case 6:
      return new ee(t[0] + (t[1] << 8) + (t[2] << 16) + (t[3] + (t[4] << 8) + (t[5] << 16)) * 16777216);
    default:
      return new ee(t, "le");
  }
}
const Bc = new Tc("utf-8");
function Us(t) {
  return t ? Bc.decode(t) : "";
}
const si = /* @__PURE__ */ W(`Ethereum Signed Message:
`), Rn = /* @__PURE__ */ W("<Bytes>"), In = /* @__PURE__ */ W("</Bytes>"), Fc = Rn.length + In.length;
function pr(t, e) {
  return t.length >= Fc && Nt(t.subarray(0, Rn.length), Rn) && Nt(t.slice(-In.length), In) || e && t.length >= si.length && Nt(t.subarray(0, si.length), si);
}
function Cc(t) {
  const e = W(t);
  return pr(e, !1) ? e.subarray(Rn.length, e.length - In.length) : e;
}
function Zc(t) {
  const e = W(t);
  return pr(e, !0) ? e : Cn([Rn, e, In]);
}
const Xs = ie(256), Vc = ie(255);
function Gc(t, e, n) {
  const r = [], i = n && t < lr;
  for (i && (t = (t + dr) * -dr); t !== lr; ) {
    const s = t % Xs, o = Number(i ? s ^ Vc : s);
    e ? r.push(o) : r.unshift(o), t = (t - s) / Xs;
  }
  return Uint8Array.from(r);
}
function qc(t, { bitLength: e = -1, isLe: n = !0, isNegative: r = !1 } = {}) {
  const i = Rc(t);
  if (i === lr)
    return e === -1 ? new Uint8Array(1) : new Uint8Array(Math.ceil((e || 0) / 8));
  const s = Gc(i, n, r);
  if (e === -1)
    return s;
  const o = Math.ceil((e || 0) / 8), f = new Uint8Array(o);
  return r && f.fill(255), f.set(s, n ? 0 : o - s.length), f;
}
function Yc(t) {
  if (!t || t === "0x")
    return "";
  if (aa.test(t))
    return t.substring(2);
  if (jc.test(t))
    return t;
  throw new Error(`Expected hex value to convert, found '${t}'`);
}
function Wc(t, { isLe: e = !1, isNegative: n = !1 } = {}) {
  if (!t || t === "0x")
    return new ee(0);
  const r = Yc(t), i = new ee(r, 16, e ? "le" : "be");
  return n ? i.fromTwos(r.length * 4) : i;
}
const Or = /* @__PURE__ */ new ee(1), Nr = /* @__PURE__ */ new ee(2), Ds = /* @__PURE__ */ new ee(1e9);
Ds.mul(Ds);
Number.MAX_SAFE_INTEGER;
function da(t) {
  return typeof t == "bigint";
}
function ha(t) {
  return t ? ee.isBN(t) ? t : Mt(t) ? Wc(t.toString()) : da(t) ? new ee(t.toString()) : ua(t) ? t.toBn() : ca(t) ? new ee(t.toBigInt().toString()) : new ee(t) : new ee(0);
}
const Kc = { bitLength: -1, isLe: !0, isNegative: !1 };
function ot(t, { bitLength: e = -1, isLe: n = !0, isNegative: r = !1 } = Kc) {
  const i = ha(t), s = Math.ceil(e === -1 ? i.bitLength() / 8 : (e || 0) / 8);
  if (!t)
    return e === -1 ? new Uint8Array(1) : new Uint8Array(s);
  const o = new Uint8Array(s), f = r ? i.toTwos(s * 8) : i;
  return o.set(f.toArray(n ? "le" : "be", s), 0), o;
}
const Jc = Nr.pow(new ee(6)).isub(Or), Qc = Nr.pow(new ee(14)).isub(Or), _c = Nr.pow(new ee(30)).isub(Or), $c = { bitLength: 16 }, eu = { bitLength: 32 };
function tu(t) {
  const e = ha(t);
  if (e.lte(Jc))
    return new Uint8Array([e.toNumber() << 2]);
  if (e.lte(Qc))
    return ot(e.shln(2).iadd(Or), $c);
  if (e.lte(_c))
    return ot(e.shln(2).iadd(Nr), eu);
  const n = ot(e);
  let r = n.length;
  for (; n[r - 1] === 0; )
    r--;
  if (r < 4)
    throw new Error("Invalid length, previous checks match anything less than 2^30");
  return Cn([
    // subtract 4 as minimum (also catered for in decoding)
    new Uint8Array([(r - 4 << 2) + 3]),
    n.subarray(0, r)
  ]);
}
function es(t) {
  return Cn([
    tu(t.length),
    t
  ]);
}
function nu(t) {
  return typeof t == "string" || t instanceof String;
}
function ru(t) {
  return typeof t == "number";
}
function Lr(t, ...e) {
  for (let n = 0, r = e.length; n < r; n++) {
    const i = e[n];
    if (i)
      if (typeof i.entries == "function")
        for (const [s, o] of i.entries())
          t[s] = o;
      else
        Object.assign(t, i);
  }
  return t;
}
const iu = yn.crypto;
function pa(t) {
  return iu.getRandomValues(t);
}
const or = { getRandomValues: pa }, su = { crypto: or };
class ou {
  constructor(e) {
    re(this, "__internal__bridge");
    /** @internal */
    re(this, "abort", () => {
      throw new Error("abort");
    });
    /** @internal */
    re(this, "__wbindgen_is_undefined", (e) => this.__internal__bridge.getObject(e) === void 0);
    /** @internal */
    re(this, "__wbindgen_throw", (e, n) => {
      throw new Error(this.__internal__bridge.getString(e, n));
    });
    /** @internal */
    re(this, "__wbg_self_1b7a39e3a92c949c", () => this.__internal__bridge.addObject(su));
    /** @internal */
    re(this, "__wbg_require_604837428532a733", (e, n) => {
      throw new Error(`Unable to require ${this.__internal__bridge.getString(e, n)}`);
    });
    /** @internal */
    re(this, "__wbg_crypto_968f1772287e2df0", (e) => this.__internal__bridge.addObject(or));
    /** @internal */
    re(this, "__wbg_getRandomValues_a3d34b4fee3c2869", (e) => this.__internal__bridge.addObject(or.getRandomValues));
    /** @internal */
    re(this, "__wbg_getRandomValues_f5e14ab7ac8e995d", (e, n, r) => {
      or.getRandomValues(this.__internal__bridge.getU8a(n, r));
    });
    /** @internal */
    re(this, "__wbg_randomFillSync_d5bd2d655fdf256a", (e, n, r) => {
      throw new Error("randomFillsync is not available");
    });
    /** @internal */
    re(this, "__wbindgen_object_drop_ref", (e) => {
      this.__internal__bridge.takeObject(e);
    });
    this.__internal__bridge = e;
  }
}
class au {
  constructor(e) {
    re(this, "__internal__createWasm");
    re(this, "__internal__heap");
    re(this, "__internal__wbg");
    re(this, "__internal__cachegetInt32");
    re(this, "__internal__cachegetUint8");
    re(this, "__internal__heapNext");
    re(this, "__internal__wasm");
    re(this, "__internal__wasmError");
    re(this, "__internal__wasmPromise");
    re(this, "__internal__type");
    this.__internal__createWasm = e, this.__internal__cachegetInt32 = null, this.__internal__cachegetUint8 = null, this.__internal__heap = new Array(32).fill(void 0).concat(void 0, null, !0, !1), this.__internal__heapNext = this.__internal__heap.length, this.__internal__type = "none", this.__internal__wasm = null, this.__internal__wasmError = null, this.__internal__wasmPromise = null, this.__internal__wbg = { ...new ou(this) };
  }
  /** @description Returns the init error */
  get error() {
    return this.__internal__wasmError;
  }
  /** @description Returns the init type */
  get type() {
    return this.__internal__type;
  }
  /** @description Returns the created wasm interface */
  get wasm() {
    return this.__internal__wasm;
  }
  /** @description Performs the wasm initialization */
  async init(e) {
    (!this.__internal__wasmPromise || e) && (this.__internal__wasmPromise = (e || this.__internal__createWasm)(this.__internal__wbg));
    const { error: n, type: r, wasm: i } = await this.__internal__wasmPromise;
    return this.__internal__type = r, this.__internal__wasm = i, this.__internal__wasmError = n, this.__internal__wasm;
  }
  /**
   * @internal
   * @description Gets an object from the heap
   */
  getObject(e) {
    return this.__internal__heap[e];
  }
  /**
   * @internal
   * @description Removes an object from the heap
   */
  dropObject(e) {
    e < 36 || (this.__internal__heap[e] = this.__internal__heapNext, this.__internal__heapNext = e);
  }
  /**
   * @internal
   * @description Retrieves and removes an object to the heap
   */
  takeObject(e) {
    const n = this.getObject(e);
    return this.dropObject(e), n;
  }
  /**
   * @internal
   * @description Adds an object to the heap
   */
  addObject(e) {
    this.__internal__heapNext === this.__internal__heap.length && this.__internal__heap.push(this.__internal__heap.length + 1);
    const n = this.__internal__heapNext;
    return this.__internal__heapNext = this.__internal__heap[n], this.__internal__heap[n] = e, n;
  }
  /**
   * @internal
   * @description Retrieve an Int32 in the WASM interface
   */
  getInt32() {
    return (this.__internal__cachegetInt32 === null || this.__internal__cachegetInt32.buffer !== this.__internal__wasm.memory.buffer) && (this.__internal__cachegetInt32 = new Int32Array(this.__internal__wasm.memory.buffer)), this.__internal__cachegetInt32;
  }
  /**
   * @internal
   * @description Retrieve an Uint8Array in the WASM interface
   */
  getUint8() {
    return (this.__internal__cachegetUint8 === null || this.__internal__cachegetUint8.buffer !== this.__internal__wasm.memory.buffer) && (this.__internal__cachegetUint8 = new Uint8Array(this.__internal__wasm.memory.buffer)), this.__internal__cachegetUint8;
  }
  /**
   * @internal
   * @description Retrieves an Uint8Array in the WASM interface
   */
  getU8a(e, n) {
    return this.getUint8().subarray(e / 1, e / 1 + n);
  }
  /**
   * @internal
   * @description Retrieves a string in the WASM interface
   */
  getString(e, n) {
    return Us(this.getU8a(e, n));
  }
  /**
   * @internal
   * @description Allocates an Uint8Array in the WASM interface
   */
  allocU8a(e) {
    const n = this.__internal__wasm.__wbindgen_malloc(e.length * 1);
    return this.getUint8().set(e, n / 1), [n, e.length];
  }
  /**
   * @internal
   * @description Allocates a string in the WASM interface
   */
  allocString(e) {
    return this.allocU8a(it(e));
  }
  /**
   * @internal
   * @description Retrieves an Uint8Array from the WASM interface
   */
  resultU8a() {
    const e = this.getInt32()[2], n = this.getInt32()[8 / 4 + 1], r = this.getU8a(e, n).slice();
    return this.__internal__wasm.__wbindgen_free(e, n * 1), r;
  }
  /**
   * @internal
   * @description Retrieve a string from the WASM interface
   */
  resultString() {
    return Us(this.resultU8a());
  }
}
function fu(t, e, n) {
  return async (r) => {
    const i = {
      error: null,
      type: "none",
      wasm: null
    };
    try {
      if (e != null && e.length) {
        if (typeof WebAssembly != "object" || typeof WebAssembly.instantiate != "function")
          throw new Error("WebAssembly is not available in your environment");
      } else throw new Error("No WebAssembly provided for initialization");
      const s = await WebAssembly.instantiate(e, { wbg: r });
      i.wasm = s.instance.exports, i.type = "wasm";
    } catch (s) {
      i.error = `FATAL: Unable to initialize @polkadot/wasm-${t}:: ${s.message}`, console.error(i.error);
    }
    return i;
  };
}
const Bs = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/", ma = new Array(256);
for (let t = 0, e = Bs.length; t < e; t++)
  ma[Bs.charCodeAt(t)] = t;
function cu(t, e) {
  let n = 0, r = 0, i = -1;
  for (let s = 0, o = e.length - 1; i !== o; s++)
    n = n << 6 | ma[t.charCodeAt(s)], (r += 6) >= 8 && (e[++i] = n >>> (r -= 8) & 255);
  return e;
}
const Pt = Uint8Array, nn = Uint16Array, Si = Uint32Array, uu = new Pt([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]), ga = new Pt([
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  1,
  1,
  1,
  1,
  2,
  2,
  2,
  2,
  3,
  3,
  3,
  3,
  4,
  4,
  4,
  4,
  5,
  5,
  5,
  5,
  0,
  /* unused */
  0,
  0,
  /* impossible */
  0
]), ba = new Pt([
  0,
  0,
  0,
  0,
  1,
  1,
  2,
  2,
  3,
  3,
  4,
  4,
  5,
  5,
  6,
  6,
  7,
  7,
  8,
  8,
  9,
  9,
  10,
  10,
  11,
  11,
  12,
  12,
  13,
  13,
  /* unused */
  0,
  0
]), ya = (t, e) => {
  const n = new nn(31);
  for (let i = 0; i < 31; ++i)
    n[i] = e += 1 << t[i - 1];
  const r = new Si(n[30]);
  for (let i = 1; i < 30; ++i)
    for (let s = n[i]; s < n[i + 1]; ++s)
      r[s] = s - n[i] << 5 | i;
  return [n, r];
}, [va, lu] = ya(ga, 2);
va[28] = 258, lu[258] = 28;
const [du] = ya(ba, 0), wa = new nn(32768);
for (let t = 0; t < 32768; ++t) {
  let e = (t & 43690) >>> 1 | (t & 21845) << 1;
  e = (e & 52428) >>> 2 | (e & 13107) << 2, e = (e & 61680) >>> 4 | (e & 3855) << 4, wa[t] = ((e & 65280) >>> 8 | (e & 255) << 8) >>> 1;
}
const Hn = (t, e, n) => {
  const r = t.length;
  let i = 0;
  const s = new nn(e);
  for (; i < r; ++i)
    t[i] && ++s[t[i] - 1];
  const o = new nn(e);
  for (i = 1; i < e; ++i)
    o[i] = o[i - 1] + s[i - 1] << 1;
  let f;
  {
    f = new nn(1 << e);
    const u = 15 - e;
    for (i = 0; i < r; ++i)
      if (t[i]) {
        const h = i << 4 | t[i], p = e - t[i];
        let m = o[t[i] - 1]++ << p;
        for (const O = m | (1 << p) - 1; m <= O; ++m)
          f[wa[m] >> u] = h;
      }
  }
  return f;
}, Zn = new Pt(288);
for (let t = 0; t < 144; ++t)
  Zn[t] = 8;
for (let t = 144; t < 256; ++t)
  Zn[t] = 9;
for (let t = 256; t < 280; ++t)
  Zn[t] = 7;
for (let t = 280; t < 288; ++t)
  Zn[t] = 8;
const xa = new Pt(32);
for (let t = 0; t < 32; ++t)
  xa[t] = 5;
const hu = Hn(Zn, 9), pu = Hn(xa, 5), dt = (t, e, n) => {
  const r = e >>> 3;
  return (t[r] | t[r + 1] << 8) >>> (e & 7) & n;
}, oi = (t, e) => {
  const n = e >>> 3;
  return (t[n] | t[n + 1] << 8 | t[n + 2] << 16) >>> (e & 7);
}, mu = (t) => (t >>> 3) + (t & 7 && 1), gu = (t, e, n) => {
  (n == null || n > t.length) && (n = t.length);
  const r = new (t instanceof nn ? nn : t instanceof Si ? Si : Pt)(n - e);
  return r.set(t.subarray(e, n)), r;
}, ai = (t) => {
  let e = t[0];
  for (let n = 1, r = t.length; n < r; ++n)
    t[n] > e && (e = t[n]);
  return e;
}, bu = (t, e, n) => {
  const r = !n || n.i;
  n || (n = {});
  const i = t.length, s = !e || !r;
  e || (e = new Pt(i * 3));
  const o = (x) => {
    let E = e.length;
    if (x > E) {
      const T = new Pt(Math.max(E << 1, x));
      T.set(e), e = T;
    }
  };
  let f = n.f || 0, u = n.p || 0, h = n.b || 0, p = n.l, m = n.d, O = n.m, L = n.n;
  if (f && !p)
    return e;
  const N = i << 3;
  do {
    if (!p) {
      n.f = f = dt(t, u, 1);
      const M = dt(t, u + 1, 3);
      if (u += 3, M)
        if (M == 1)
          p = hu, m = pu, O = 9, L = 5;
        else if (M == 2) {
          const S = dt(t, u, 31) + 257, A = dt(t, u + 10, 15) + 4, j = S + dt(t, u + 5, 31) + 1;
          u += 14;
          const z = new Pt(j), U = new Pt(19);
          for (let P = 0; P < A; ++P)
            U[uu[P]] = dt(t, u + P * 3, 7);
          u += A * 3;
          const H = ai(U), G = (1 << H) - 1;
          if (!r && u + j * (H + 7) > N)
            break;
          const V = Hn(U, H);
          for (let P = 0; P < j; ) {
            const a = V[dt(t, u, G)];
            u += a & 15;
            const c = a >>> 4;
            if (c < 16)
              z[P++] = c;
            else {
              let d = 0, g = 0;
              for (c == 16 ? (g = 3 + dt(t, u, 3), u += 2, d = z[P - 1]) : c == 17 ? (g = 3 + dt(t, u, 7), u += 3) : c == 18 && (g = 11 + dt(t, u, 127), u += 7); g--; )
                z[P++] = d;
            }
          }
          const I = z.subarray(0, S), B = z.subarray(S);
          O = ai(I), L = ai(B), p = Hn(I, O), m = Hn(B, L);
        } else
          throw "invalid block type";
      else {
        const S = mu(u) + 4, A = t[S - 4] | t[S - 3] << 8, j = S + A;
        if (j > i) {
          if (r)
            throw "unexpected EOF";
          break;
        }
        s && o(h + A), e.set(t.subarray(S, j), h), n.b = h += A, n.p = u = j << 3;
        continue;
      }
      if (u > N)
        throw "unexpected EOF";
    }
    s && o(h + 131072);
    const x = (1 << O) - 1, E = (1 << L) - 1, T = O + L + 18;
    for (; r || u + T < N; ) {
      const M = p[oi(t, u) & x], S = M >>> 4;
      if (u += M & 15, u > N)
        throw "unexpected EOF";
      if (!M)
        throw "invalid length/literal";
      if (S < 256)
        e[h++] = S;
      else if (S == 256) {
        p = void 0;
        break;
      } else {
        let A = S - 254;
        if (S > 264) {
          const G = S - 257, V = ga[G];
          A = dt(t, u, (1 << V) - 1) + va[G], u += V;
        }
        const j = m[oi(t, u) & E], z = j >>> 4;
        if (!j)
          throw "invalid distance";
        u += j & 15;
        let U = du[z];
        if (z > 3) {
          const G = ba[z];
          U += oi(t, u) & (1 << G) - 1, u += G;
        }
        if (u > N)
          throw "unexpected EOF";
        s && o(h + 131072);
        const H = h + A;
        for (; h < H; h += 4)
          e[h] = e[h - U], e[h + 1] = e[h + 1 - U], e[h + 2] = e[h + 2 - U], e[h + 3] = e[h + 3 - U];
        h = H;
      }
    }
    n.l = p, n.p = u, n.b = h, p && (f = 1, n.m = O, n.d = m, n.n = L);
  } while (!f);
  return h == e.length ? e : gu(e, 0, h);
}, yu = (t) => {
  if ((t[0] & 15) != 8 || t[0] >>> 4 > 7 || (t[0] << 8 | t[1]) % 31)
    throw "invalid zlib data";
  if (t[1] & 32)
    throw "invalid zlib data: preset dictionaries not supported";
};
function vu(t, e) {
  return bu((yu(t), t.subarray(2, -4)), e);
}
var wu = 171008, xu = 339468, Pu = "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";
const Ou = /* @__PURE__ */ vu(cu(Pu, new Uint8Array(wu)), new Uint8Array(xu)), Nu = /* @__PURE__ */ fu("crypto", Ou), D = new au(Nu);
async function Lu(t) {
  return D.init(t);
}
function oe(t) {
  return (...e) => {
    if (!D.wasm)
      throw new Error("The WASM interface has not been initialized. Ensure that you wait for the initialization Promise with waitReady() from @polkadot/wasm-crypto (or cryptoWaitReady() from @polkadot/util-crypto) before attempting to use WASM-only interfaces.");
    return t(D.wasm, ...e);
  };
}
const Eu = /* @__PURE__ */ oe((t, e) => (t.ext_bip39_to_entropy(8, ...D.allocString(e)), D.resultU8a())), ku = /* @__PURE__ */ oe((t, e, n) => (t.ext_bip39_to_mini_secret(8, ...D.allocString(e), ...D.allocString(n)), D.resultU8a())), Tu = /* @__PURE__ */ oe((t, e, n) => (t.ext_bip39_to_seed(8, ...D.allocString(e), ...D.allocString(n)), D.resultU8a())), Mu = /* @__PURE__ */ oe((t, e) => t.ext_bip39_validate(...D.allocString(e)) !== 0), Su = /* @__PURE__ */ oe((t, e) => (t.ext_ed_from_seed(8, ...D.allocU8a(e)), D.resultU8a())), zu = /* @__PURE__ */ oe((t, e, n, r) => (t.ext_ed_sign(8, ...D.allocU8a(e), ...D.allocU8a(n), ...D.allocU8a(r)), D.resultU8a())), Au = /* @__PURE__ */ oe((t, e, n, r) => t.ext_ed_verify(...D.allocU8a(e), ...D.allocU8a(n), ...D.allocU8a(r)) !== 0), ju = /* @__PURE__ */ oe((t, e) => (t.ext_secp_from_seed(8, ...D.allocU8a(e)), D.resultU8a())), Hu = /* @__PURE__ */ oe((t, e) => (t.ext_secp_pub_compress(8, ...D.allocU8a(e)), D.resultU8a())), Ru = /* @__PURE__ */ oe((t, e) => (t.ext_secp_pub_expand(8, ...D.allocU8a(e)), D.resultU8a())), Iu = /* @__PURE__ */ oe((t, e, n, r) => (t.ext_secp_recover(8, ...D.allocU8a(e), ...D.allocU8a(n), r), D.resultU8a())), Uu = /* @__PURE__ */ oe((t, e, n) => (t.ext_secp_sign(8, ...D.allocU8a(e), ...D.allocU8a(n)), D.resultU8a())), Xu = /* @__PURE__ */ oe((t, e, n) => (t.ext_sr_derive_keypair_hard(8, ...D.allocU8a(e), ...D.allocU8a(n)), D.resultU8a())), Du = /* @__PURE__ */ oe((t, e, n) => (t.ext_sr_derive_keypair_soft(8, ...D.allocU8a(e), ...D.allocU8a(n)), D.resultU8a())), Bu = /* @__PURE__ */ oe((t, e) => (t.ext_sr_from_seed(8, ...D.allocU8a(e)), D.resultU8a())), Fu = /* @__PURE__ */ oe((t, e, n, r) => (t.ext_sr_sign(8, ...D.allocU8a(e), ...D.allocU8a(n), ...D.allocU8a(r)), D.resultU8a())), Cu = /* @__PURE__ */ oe((t, e, n, r) => t.ext_sr_verify(...D.allocU8a(e), ...D.allocU8a(n), ...D.allocU8a(r)) !== 0), Zu = /* @__PURE__ */ oe((t, e, n, r, i) => (t.ext_vrf_sign(8, ...D.allocU8a(e), ...D.allocU8a(n), ...D.allocU8a(r), ...D.allocU8a(i)), D.resultU8a())), Vu = /* @__PURE__ */ oe((t, e, n, r, i, s) => t.ext_vrf_verify(...D.allocU8a(e), ...D.allocU8a(n), ...D.allocU8a(r), ...D.allocU8a(i), ...D.allocU8a(s)) !== 0), Gu = /* @__PURE__ */ oe((t, e, n, r) => (t.ext_blake2b(8, ...D.allocU8a(e), ...D.allocU8a(n), r), D.resultU8a())), qu = /* @__PURE__ */ oe((t, e, n) => (t.ext_hmac_sha256(8, ...D.allocU8a(e), ...D.allocU8a(n)), D.resultU8a())), Yu = /* @__PURE__ */ oe((t, e, n) => (t.ext_hmac_sha512(8, ...D.allocU8a(e), ...D.allocU8a(n)), D.resultU8a())), Wu = /* @__PURE__ */ oe((t, e) => (t.ext_keccak256(8, ...D.allocU8a(e)), D.resultU8a())), Ku = /* @__PURE__ */ oe((t, e) => (t.ext_keccak512(8, ...D.allocU8a(e)), D.resultU8a())), Ju = /* @__PURE__ */ oe((t, e, n, r) => (t.ext_pbkdf2(8, ...D.allocU8a(e), ...D.allocU8a(n), r), D.resultU8a())), Qu = /* @__PURE__ */ oe((t, e, n, r, i, s) => (t.ext_scrypt(8, ...D.allocU8a(e), ...D.allocU8a(n), r, i, s), D.resultU8a())), _u = /* @__PURE__ */ oe((t, e) => (t.ext_sha256(8, ...D.allocU8a(e)), D.resultU8a())), $u = /* @__PURE__ */ oe((t, e) => (t.ext_sha512(8, ...D.allocU8a(e)), D.resultU8a()));
function Je() {
  return !!D.wasm;
}
async function el() {
  try {
    return !!await Lu();
  } catch {
    return !1;
  }
}
function tl() {
  return el().then(() => {
    if (!Je())
      throw new Error("Unable to initialize @polkadot/util-crypto");
    return !0;
  }).catch(() => !1);
}
function Pa(t) {
  return t instanceof Uint8Array || t != null && typeof t == "object" && t.constructor.name === "Uint8Array";
}
// @__NO_SIDE_EFFECTS__
function Oa(...t) {
  const e = (s) => s, n = (s, o) => (f) => s(o(f)), r = t.map((s) => s.encode).reduceRight(n, e), i = t.map((s) => s.decode).reduce(n, e);
  return { encode: r, decode: i };
}
// @__NO_SIDE_EFFECTS__
function Na(t) {
  return {
    encode: (e) => {
      if (!Array.isArray(e) || e.length && typeof e[0] != "number")
        throw new Error("alphabet.encode input should be an array of numbers");
      return e.map((n) => {
        if (n < 0 || n >= t.length)
          throw new Error(`Digit index outside alphabet: ${n} (alphabet: ${t.length})`);
        return t[n];
      });
    },
    decode: (e) => {
      if (!Array.isArray(e) || e.length && typeof e[0] != "string")
        throw new Error("alphabet.decode input should be array of strings");
      return e.map((n) => {
        if (typeof n != "string")
          throw new Error(`alphabet.decode: not string element=${n}`);
        const r = t.indexOf(n);
        if (r === -1)
          throw new Error(`Unknown letter: "${n}". Allowed: ${t}`);
        return r;
      });
    }
  };
}
// @__NO_SIDE_EFFECTS__
function La(t = "") {
  if (typeof t != "string")
    throw new Error("join separator should be string");
  return {
    encode: (e) => {
      if (!Array.isArray(e) || e.length && typeof e[0] != "string")
        throw new Error("join.encode input should be array of strings");
      for (let n of e)
        if (typeof n != "string")
          throw new Error(`join.encode: non-string input=${n}`);
      return e.join(t);
    },
    decode: (e) => {
      if (typeof e != "string")
        throw new Error("join.decode input should be string");
      return e.split(t);
    }
  };
}
// @__NO_SIDE_EFFECTS__
function nl(t, e = "=") {
  if (typeof e != "string")
    throw new Error("padding chr should be string");
  return {
    encode(n) {
      if (!Array.isArray(n) || n.length && typeof n[0] != "string")
        throw new Error("padding.encode input should be array of strings");
      for (let r of n)
        if (typeof r != "string")
          throw new Error(`padding.encode: non-string input=${r}`);
      for (; n.length * t % 8; )
        n.push(e);
      return n;
    },
    decode(n) {
      if (!Array.isArray(n) || n.length && typeof n[0] != "string")
        throw new Error("padding.encode input should be array of strings");
      for (let i of n)
        if (typeof i != "string")
          throw new Error(`padding.decode: non-string input=${i}`);
      let r = n.length;
      if (r * t % 8)
        throw new Error("Invalid padding: string should have whole number of bytes");
      for (; r > 0 && n[r - 1] === e; r--)
        if (!((r - 1) * t % 8))
          throw new Error("Invalid padding: string has too much padding");
      return n.slice(0, r);
    }
  };
}
// @__NO_SIDE_EFFECTS__
function Fs(t, e, n) {
  if (e < 2)
    throw new Error(`convertRadix: wrong from=${e}, base cannot be less than 2`);
  if (n < 2)
    throw new Error(`convertRadix: wrong to=${n}, base cannot be less than 2`);
  if (!Array.isArray(t))
    throw new Error("convertRadix: data should be array");
  if (!t.length)
    return [];
  let r = 0;
  const i = [], s = Array.from(t);
  for (s.forEach((o) => {
    if (o < 0 || o >= e)
      throw new Error(`Wrong integer: ${o}`);
  }); ; ) {
    let o = 0, f = !0;
    for (let u = r; u < s.length; u++) {
      const h = s[u], p = e * o + h;
      if (!Number.isSafeInteger(p) || e * o / e !== o || p - h !== e * o)
        throw new Error("convertRadix: carry overflow");
      o = p % n;
      const m = Math.floor(p / n);
      if (s[u] = m, !Number.isSafeInteger(m) || m * n + o !== p)
        throw new Error("convertRadix: carry overflow");
      if (f)
        m ? f = !1 : r = u;
      else continue;
    }
    if (i.push(o), f)
      break;
  }
  for (let o = 0; o < t.length - 1 && t[o] === 0; o++)
    i.push(0);
  return i.reverse();
}
const Ea = /* @__NO_SIDE_EFFECTS__ */ (t, e) => e ? /* @__PURE__ */ Ea(e, t % e) : t, mr = /* @__NO_SIDE_EFFECTS__ */ (t, e) => t + (e - /* @__PURE__ */ Ea(t, e));
// @__NO_SIDE_EFFECTS__
function Cs(t, e, n, r) {
  if (!Array.isArray(t))
    throw new Error("convertRadix2: data should be array");
  if (e <= 0 || e > 32)
    throw new Error(`convertRadix2: wrong from=${e}`);
  if (n <= 0 || n > 32)
    throw new Error(`convertRadix2: wrong to=${n}`);
  if (/* @__PURE__ */ mr(e, n) > 32)
    throw new Error(`convertRadix2: carry overflow from=${e} to=${n} carryBits=${/* @__PURE__ */ mr(e, n)}`);
  let i = 0, s = 0;
  const o = 2 ** n - 1, f = [];
  for (const u of t) {
    if (u >= 2 ** e)
      throw new Error(`convertRadix2: invalid data word=${u} from=${e}`);
    if (i = i << e | u, s + e > 32)
      throw new Error(`convertRadix2: carry overflow pos=${s} from=${e}`);
    for (s += e; s >= n; s -= n)
      f.push((i >> s - n & o) >>> 0);
    i &= 2 ** s - 1;
  }
  if (i = i << n - s & o, !r && s >= e)
    throw new Error("Excess padding");
  if (!r && i)
    throw new Error(`Non-zero padding: ${i}`);
  return r && s > 0 && f.push(i >>> 0), f;
}
// @__NO_SIDE_EFFECTS__
function rl(t) {
  return {
    encode: (e) => {
      if (!Pa(e))
        throw new Error("radix.encode input should be Uint8Array");
      return /* @__PURE__ */ Fs(Array.from(e), 2 ** 8, t);
    },
    decode: (e) => {
      if (!Array.isArray(e) || e.length && typeof e[0] != "number")
        throw new Error("radix.decode input should be array of numbers");
      return Uint8Array.from(/* @__PURE__ */ Fs(e, t, 2 ** 8));
    }
  };
}
// @__NO_SIDE_EFFECTS__
function il(t, e = !1) {
  if (t <= 0 || t > 32)
    throw new Error("radix2: bits should be in (0..32]");
  if (/* @__PURE__ */ mr(8, t) > 32 || /* @__PURE__ */ mr(t, 8) > 32)
    throw new Error("radix2: carry overflow");
  return {
    encode: (n) => {
      if (!Pa(n))
        throw new Error("radix2.encode input should be Uint8Array");
      return /* @__PURE__ */ Cs(Array.from(n), 8, t, !e);
    },
    decode: (n) => {
      if (!Array.isArray(n) || n.length && typeof n[0] != "number")
        throw new Error("radix2.decode input should be array of numbers");
      return Uint8Array.from(/* @__PURE__ */ Cs(n, t, 8, e));
    }
  };
}
const sl = /* @__PURE__ */ Oa(/* @__PURE__ */ il(6), /* @__PURE__ */ Na("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"), /* @__PURE__ */ nl(6), /* @__PURE__ */ La("")), ol = (t) => /* @__PURE__ */ Oa(/* @__PURE__ */ rl(58), /* @__PURE__ */ Na(t), /* @__PURE__ */ La("")), al = /* @__PURE__ */ ol("123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz");
function ka({ coder: t, ipfs: e }, n) {
  return (r, i) => (n(r, i), t.decode(e && i ? r.substring(1) : r));
}
function Ta({ coder: t, ipfs: e }) {
  return (n, r) => {
    const i = t.encode(W(n));
    return e && r ? `${e}${i}` : i;
  };
}
function Ma({ chars: t, ipfs: e, type: n, withPadding: r }) {
  return (i, s) => {
    if (typeof i != "string")
      throw new Error(`Expected ${n} string input`);
    if (e && s && !i.startsWith(e))
      throw new Error(`Expected ipfs-compatible ${n} to start with '${e}'`);
    for (let o = s ? 1 : 0, f = i.length; o < f; o++)
      if (!t.includes(i[o])) if (r && i[o] === "=") {
        if (o !== f - 1) {
          if (i[o + 1] !== "=") throw new Error(`Invalid ${n} padding sequence "${i[o]}${i[o + 1]}" at index ${o}`);
        }
      } else
        throw new Error(`Invalid ${n} character "${i[o]}" (0x${i.charCodeAt(o).toString(16)}) at index ${o}`);
    return !0;
  };
}
const ts = {
  chars: "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz",
  coder: al,
  ipfs: "z",
  type: "base58"
}, fl = /* @__PURE__ */ Ma(ts), cl = /* @__PURE__ */ ka(ts, fl), ul = /* @__PURE__ */ Ta(ts);
function et(t) {
  if (!Number.isSafeInteger(t) || t < 0)
    throw new Error(`positive integer expected, not ${t}`);
}
function ll(t) {
  return t instanceof Uint8Array || t != null && typeof t == "object" && t.constructor.name === "Uint8Array";
}
function Er(t, ...e) {
  if (!ll(t))
    throw new Error("Uint8Array expected");
  if (e.length > 0 && !e.includes(t.length))
    throw new Error(`Uint8Array expected of length ${e}, not of length=${t.length}`);
}
function Sa(t) {
  if (typeof t != "function" || typeof t.create != "function")
    throw new Error("Hash should be wrapped by utils.wrapConstructor");
  et(t.outputLen), et(t.blockLen);
}
function Jt(t, e = !0) {
  if (t.destroyed)
    throw new Error("Hash instance has been destroyed");
  if (e && t.finished)
    throw new Error("Hash#digest() has already been called");
}
function ns(t, e) {
  Er(t);
  const n = e.outputLen;
  if (t.length < n)
    throw new Error(`digestInto() expects output buffer of length at least ${n}`);
}
const qt = (t) => new Uint32Array(t.buffer, t.byteOffset, Math.floor(t.byteLength / 4)), ar = (t) => new DataView(t.buffer, t.byteOffset, t.byteLength), yt = (t, e) => t << 32 - e | t >>> e, ne = (t, e) => t << e | t >>> 32 - e >>> 0, mt = new Uint8Array(new Uint32Array([287454020]).buffer)[0] === 68, za = (t) => t << 24 & 4278190080 | t << 8 & 16711680 | t >>> 8 & 65280 | t >>> 24 & 255, kt = mt ? (t) => t : (t) => za(t);
function xt(t) {
  for (let e = 0; e < t.length; e++)
    t[e] = za(t[e]);
}
function dl(t) {
  if (typeof t != "string")
    throw new Error(`utf8ToBytes expected string, got ${typeof t}`);
  return new Uint8Array(new TextEncoder().encode(t));
}
function ct(t) {
  return typeof t == "string" && (t = dl(t)), Er(t), t;
}
let kr = class {
  // Safe version that clones internal state
  clone() {
    return this._cloneInto();
  }
};
const hl = {}.toString;
function Aa(t, e) {
  if (e !== void 0 && hl.call(e) !== "[object Object]")
    throw new Error("Options should be object or undefined");
  return Object.assign(t, e);
}
function rs(t) {
  const e = (r) => t().update(ct(r)).digest(), n = t();
  return e.outputLen = n.outputLen, e.blockLen = n.blockLen, e.create = () => t(), e;
}
function pl(t) {
  const e = (r, i) => t(i).update(ct(r)).digest(), n = t({});
  return e.outputLen = n.outputLen, e.blockLen = n.blockLen, e.create = (r) => t(r), e;
}
function ml(t) {
  const e = (r, i) => t(i).update(ct(r)).digest(), n = t({});
  return e.outputLen = n.outputLen, e.blockLen = n.blockLen, e.create = (r) => t(r), e;
}
const gl = /* @__PURE__ */ new Uint8Array([
  0,
  1,
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  12,
  13,
  14,
  15,
  14,
  10,
  4,
  8,
  9,
  15,
  13,
  6,
  1,
  12,
  0,
  2,
  11,
  7,
  5,
  3,
  11,
  8,
  12,
  0,
  5,
  2,
  15,
  13,
  10,
  14,
  3,
  6,
  7,
  1,
  9,
  4,
  7,
  9,
  3,
  1,
  13,
  12,
  11,
  14,
  2,
  6,
  5,
  10,
  4,
  0,
  15,
  8,
  9,
  0,
  5,
  7,
  2,
  4,
  10,
  15,
  14,
  1,
  11,
  12,
  6,
  8,
  3,
  13,
  2,
  12,
  6,
  10,
  0,
  11,
  8,
  3,
  4,
  13,
  7,
  5,
  15,
  14,
  1,
  9,
  12,
  5,
  1,
  15,
  14,
  13,
  4,
  10,
  0,
  7,
  6,
  3,
  9,
  2,
  8,
  11,
  13,
  11,
  7,
  14,
  12,
  1,
  3,
  9,
  5,
  0,
  15,
  4,
  8,
  6,
  2,
  10,
  6,
  15,
  14,
  9,
  11,
  3,
  0,
  8,
  12,
  2,
  13,
  7,
  1,
  4,
  10,
  5,
  10,
  2,
  8,
  4,
  7,
  6,
  1,
  5,
  15,
  11,
  9,
  14,
  3,
  12,
  13,
  0,
  0,
  1,
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  12,
  13,
  14,
  15,
  14,
  10,
  4,
  8,
  9,
  15,
  13,
  6,
  1,
  12,
  0,
  2,
  11,
  7,
  5,
  3
]);
class bl extends kr {
  constructor(e, n, r = {}, i, s, o) {
    if (super(), this.blockLen = e, this.outputLen = n, this.length = 0, this.pos = 0, this.finished = !1, this.destroyed = !1, et(e), et(n), et(i), n < 0 || n > i)
      throw new Error("outputLen bigger than keyLen");
    if (r.key !== void 0 && (r.key.length < 1 || r.key.length > i))
      throw new Error(`key must be up 1..${i} byte long or undefined`);
    if (r.salt !== void 0 && r.salt.length !== s)
      throw new Error(`salt must be ${s} byte long or undefined`);
    if (r.personalization !== void 0 && r.personalization.length !== o)
      throw new Error(`personalization must be ${o} byte long or undefined`);
    this.buffer32 = qt(this.buffer = new Uint8Array(e));
  }
  update(e) {
    Jt(this);
    const { blockLen: n, buffer: r, buffer32: i } = this;
    e = ct(e);
    const s = e.length, o = e.byteOffset, f = e.buffer;
    for (let u = 0; u < s; ) {
      this.pos === n && (mt || xt(i), this.compress(i, 0, !1), mt || xt(i), this.pos = 0);
      const h = Math.min(n - this.pos, s - u), p = o + u;
      if (h === n && !(p % 4) && u + h < s) {
        const m = new Uint32Array(f, p, Math.floor((s - u) / 4));
        mt || xt(m);
        for (let O = 0; u + n < s; O += i.length, u += n)
          this.length += n, this.compress(m, O, !1);
        mt || xt(m);
        continue;
      }
      r.set(e.subarray(u, u + h), this.pos), this.pos += h, this.length += h, u += h;
    }
    return this;
  }
  digestInto(e) {
    Jt(this), ns(e, this);
    const { pos: n, buffer32: r } = this;
    this.finished = !0, this.buffer.subarray(n).fill(0), mt || xt(r), this.compress(r, 0, !0), mt || xt(r);
    const i = qt(e);
    this.get().forEach((s, o) => i[o] = kt(s));
  }
  digest() {
    const { buffer: e, outputLen: n } = this;
    this.digestInto(e);
    const r = e.slice(0, n);
    return this.destroy(), r;
  }
  _cloneInto(e) {
    const { buffer: n, length: r, finished: i, destroyed: s, outputLen: o, pos: f } = this;
    return e || (e = new this.constructor({ dkLen: o })), e.set(...this.get()), e.length = r, e.finished = i, e.destroyed = s, e.outputLen = o, e.buffer.set(n), e.pos = f, e;
  }
}
const Jn = /* @__PURE__ */ BigInt(2 ** 32 - 1), zi = /* @__PURE__ */ BigInt(32);
function ja(t, e = !1) {
  return e ? { h: Number(t & Jn), l: Number(t >> zi & Jn) } : { h: Number(t >> zi & Jn) | 0, l: Number(t & Jn) | 0 };
}
function Ha(t, e = !1) {
  let n = new Uint32Array(t.length), r = new Uint32Array(t.length);
  for (let i = 0; i < t.length; i++) {
    const { h: s, l: o } = ja(t[i], e);
    [n[i], r[i]] = [s, o];
  }
  return [n, r];
}
const yl = (t, e) => BigInt(t >>> 0) << zi | BigInt(e >>> 0), vl = (t, e, n) => t >>> n, wl = (t, e, n) => t << 32 - n | e >>> n, xl = (t, e, n) => t >>> n | e << 32 - n, Pl = (t, e, n) => t << 32 - n | e >>> n, Ol = (t, e, n) => t << 64 - n | e >>> n - 32, Nl = (t, e, n) => t >>> n - 32 | e << 64 - n, Ll = (t, e) => e, El = (t, e) => t, Ra = (t, e, n) => t << n | e >>> 32 - n, Ia = (t, e, n) => e << n | t >>> 32 - n, Ua = (t, e, n) => e << n - 32 | t >>> 64 - n, Xa = (t, e, n) => t << n - 32 | e >>> 64 - n;
function kl(t, e, n, r) {
  const i = (e >>> 0) + (r >>> 0);
  return { h: t + n + (i / 2 ** 32 | 0) | 0, l: i | 0 };
}
const Tl = (t, e, n) => (t >>> 0) + (e >>> 0) + (n >>> 0), Ml = (t, e, n, r) => e + n + r + (t / 2 ** 32 | 0) | 0, Sl = (t, e, n, r) => (t >>> 0) + (e >>> 0) + (n >>> 0) + (r >>> 0), zl = (t, e, n, r, i) => e + n + r + i + (t / 2 ** 32 | 0) | 0, Al = (t, e, n, r, i) => (t >>> 0) + (e >>> 0) + (n >>> 0) + (r >>> 0) + (i >>> 0), jl = (t, e, n, r, i, s) => e + n + r + i + s + (t / 2 ** 32 | 0) | 0, q = {
  fromBig: ja,
  split: Ha,
  toBig: yl,
  shrSH: vl,
  shrSL: wl,
  rotrSH: xl,
  rotrSL: Pl,
  rotrBH: Ol,
  rotrBL: Nl,
  rotr32H: Ll,
  rotr32L: El,
  rotlSH: Ra,
  rotlSL: Ia,
  rotlBH: Ua,
  rotlBL: Xa,
  add: kl,
  add3L: Tl,
  add3H: Ml,
  add4L: Sl,
  add4H: zl,
  add5H: jl,
  add5L: Al
}, Ge = /* @__PURE__ */ new Uint32Array([
  4089235720,
  1779033703,
  2227873595,
  3144134277,
  4271175723,
  1013904242,
  1595750129,
  2773480762,
  2917565137,
  1359893119,
  725511199,
  2600822924,
  4215389547,
  528734635,
  327033209,
  1541459225
]), Z = /* @__PURE__ */ new Uint32Array(32);
function jt(t, e, n, r, i, s) {
  const o = i[s], f = i[s + 1];
  let u = Z[2 * t], h = Z[2 * t + 1], p = Z[2 * e], m = Z[2 * e + 1], O = Z[2 * n], L = Z[2 * n + 1], N = Z[2 * r], x = Z[2 * r + 1], E = q.add3L(u, p, o);
  h = q.add3H(E, h, m, f), u = E | 0, { Dh: x, Dl: N } = { Dh: x ^ h, Dl: N ^ u }, { Dh: x, Dl: N } = { Dh: q.rotr32H(x, N), Dl: q.rotr32L(x, N) }, { h: L, l: O } = q.add(L, O, x, N), { Bh: m, Bl: p } = { Bh: m ^ L, Bl: p ^ O }, { Bh: m, Bl: p } = { Bh: q.rotrSH(m, p, 24), Bl: q.rotrSL(m, p, 24) }, Z[2 * t] = u, Z[2 * t + 1] = h, Z[2 * e] = p, Z[2 * e + 1] = m, Z[2 * n] = O, Z[2 * n + 1] = L, Z[2 * r] = N, Z[2 * r + 1] = x;
}
function Ht(t, e, n, r, i, s) {
  const o = i[s], f = i[s + 1];
  let u = Z[2 * t], h = Z[2 * t + 1], p = Z[2 * e], m = Z[2 * e + 1], O = Z[2 * n], L = Z[2 * n + 1], N = Z[2 * r], x = Z[2 * r + 1], E = q.add3L(u, p, o);
  h = q.add3H(E, h, m, f), u = E | 0, { Dh: x, Dl: N } = { Dh: x ^ h, Dl: N ^ u }, { Dh: x, Dl: N } = { Dh: q.rotrSH(x, N, 16), Dl: q.rotrSL(x, N, 16) }, { h: L, l: O } = q.add(L, O, x, N), { Bh: m, Bl: p } = { Bh: m ^ L, Bl: p ^ O }, { Bh: m, Bl: p } = { Bh: q.rotrBH(m, p, 63), Bl: q.rotrBL(m, p, 63) }, Z[2 * t] = u, Z[2 * t + 1] = h, Z[2 * e] = p, Z[2 * e + 1] = m, Z[2 * n] = O, Z[2 * n + 1] = L, Z[2 * r] = N, Z[2 * r + 1] = x;
}
class Hl extends bl {
  constructor(e = {}) {
    super(128, e.dkLen === void 0 ? 64 : e.dkLen, e, 64, 16, 16), this.v0l = Ge[0] | 0, this.v0h = Ge[1] | 0, this.v1l = Ge[2] | 0, this.v1h = Ge[3] | 0, this.v2l = Ge[4] | 0, this.v2h = Ge[5] | 0, this.v3l = Ge[6] | 0, this.v3h = Ge[7] | 0, this.v4l = Ge[8] | 0, this.v4h = Ge[9] | 0, this.v5l = Ge[10] | 0, this.v5h = Ge[11] | 0, this.v6l = Ge[12] | 0, this.v6h = Ge[13] | 0, this.v7l = Ge[14] | 0, this.v7h = Ge[15] | 0;
    const n = e.key ? e.key.length : 0;
    if (this.v0l ^= this.outputLen | n << 8 | 65536 | 1 << 24, e.salt) {
      const r = qt(ct(e.salt));
      this.v4l ^= kt(r[0]), this.v4h ^= kt(r[1]), this.v5l ^= kt(r[2]), this.v5h ^= kt(r[3]);
    }
    if (e.personalization) {
      const r = qt(ct(e.personalization));
      this.v6l ^= kt(r[0]), this.v6h ^= kt(r[1]), this.v7l ^= kt(r[2]), this.v7h ^= kt(r[3]);
    }
    if (e.key) {
      const r = new Uint8Array(this.blockLen);
      r.set(ct(e.key)), this.update(r);
    }
  }
  // prettier-ignore
  get() {
    let { v0l: e, v0h: n, v1l: r, v1h: i, v2l: s, v2h: o, v3l: f, v3h: u, v4l: h, v4h: p, v5l: m, v5h: O, v6l: L, v6h: N, v7l: x, v7h: E } = this;
    return [e, n, r, i, s, o, f, u, h, p, m, O, L, N, x, E];
  }
  // prettier-ignore
  set(e, n, r, i, s, o, f, u, h, p, m, O, L, N, x, E) {
    this.v0l = e | 0, this.v0h = n | 0, this.v1l = r | 0, this.v1h = i | 0, this.v2l = s | 0, this.v2h = o | 0, this.v3l = f | 0, this.v3h = u | 0, this.v4l = h | 0, this.v4h = p | 0, this.v5l = m | 0, this.v5h = O | 0, this.v6l = L | 0, this.v6h = N | 0, this.v7l = x | 0, this.v7h = E | 0;
  }
  compress(e, n, r) {
    this.get().forEach((u, h) => Z[h] = u), Z.set(Ge, 16);
    let { h: i, l: s } = q.fromBig(BigInt(this.length));
    Z[24] = Ge[8] ^ s, Z[25] = Ge[9] ^ i, r && (Z[28] = ~Z[28], Z[29] = ~Z[29]);
    let o = 0;
    const f = gl;
    for (let u = 0; u < 12; u++)
      jt(0, 4, 8, 12, e, n + 2 * f[o++]), Ht(0, 4, 8, 12, e, n + 2 * f[o++]), jt(1, 5, 9, 13, e, n + 2 * f[o++]), Ht(1, 5, 9, 13, e, n + 2 * f[o++]), jt(2, 6, 10, 14, e, n + 2 * f[o++]), Ht(2, 6, 10, 14, e, n + 2 * f[o++]), jt(3, 7, 11, 15, e, n + 2 * f[o++]), Ht(3, 7, 11, 15, e, n + 2 * f[o++]), jt(0, 5, 10, 15, e, n + 2 * f[o++]), Ht(0, 5, 10, 15, e, n + 2 * f[o++]), jt(1, 6, 11, 12, e, n + 2 * f[o++]), Ht(1, 6, 11, 12, e, n + 2 * f[o++]), jt(2, 7, 8, 13, e, n + 2 * f[o++]), Ht(2, 7, 8, 13, e, n + 2 * f[o++]), jt(3, 4, 9, 14, e, n + 2 * f[o++]), Ht(3, 4, 9, 14, e, n + 2 * f[o++]);
    this.v0l ^= Z[0] ^ Z[16], this.v0h ^= Z[1] ^ Z[17], this.v1l ^= Z[2] ^ Z[18], this.v1h ^= Z[3] ^ Z[19], this.v2l ^= Z[4] ^ Z[20], this.v2h ^= Z[5] ^ Z[21], this.v3l ^= Z[6] ^ Z[22], this.v3h ^= Z[7] ^ Z[23], this.v4l ^= Z[8] ^ Z[24], this.v4h ^= Z[9] ^ Z[25], this.v5l ^= Z[10] ^ Z[26], this.v5h ^= Z[11] ^ Z[27], this.v6l ^= Z[12] ^ Z[28], this.v6h ^= Z[13] ^ Z[29], this.v7l ^= Z[14] ^ Z[30], this.v7h ^= Z[15] ^ Z[31], Z.fill(0);
  }
  destroy() {
    this.destroyed = !0, this.buffer32.fill(0), this.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
  }
}
const Zs = /* @__PURE__ */ pl((t) => new Hl(t));
function Da(t) {
  return (...e) => Wt(t(...e));
}
function Rl(t, e) {
  return (n, r) => e(n, t, r);
}
function Ba(t, e) {
  return (n, r = 256, i) => {
    const s = W(n);
    return !$e || !i && Je() ? t[r](s) : e[r](s);
  };
}
function _t(t, e = 256, n, r) {
  const i = Math.ceil(e / 8), s = W(t);
  return !$e || !r && Je() ? Gu(s, W(n), i) : n ? Zs(s, { dkLen: i, key: n }) : Zs(s, { dkLen: i });
}
const Il = /* @__PURE__ */ Da(_t), Ul = it("SS58PRE");
function Fa(t) {
  return _t(Qe(Ul, t), 512);
}
function Xl(t) {
  const e = t[0] & 64 ? 2 : 1, n = e === 1 ? t[0] : (t[0] & 63) << 2 | t[1] >> 6 | (t[1] & 63) << 8, r = [34 + e, 35 + e].includes(t.length), i = t.length - (r ? 2 : 1), s = Fa(t.subarray(0, i));
  return [(t[0] & 128) === 0 && ![46, 47].includes(t[0]) && (r ? t[t.length - 2] === s[0] && t[t.length - 1] === s[1] : t[t.length - 1] === s[0]), i, e, n];
}
const Dl = [
  {
    prefix: 0,
    network: "polkadot",
    displayName: "Polkadot Relay Chain",
    symbols: [
      "DOT"
    ],
    decimals: [
      10
    ],
    standardAccount: "*25519",
    website: "https://polkadot.network"
  },
  {
    prefix: 1,
    network: "BareSr25519",
    displayName: "Bare 32-bit Schnorr/Ristretto (S/R 25519) public key.",
    symbols: [],
    decimals: [],
    standardAccount: "Sr25519",
    website: null
  },
  {
    prefix: 2,
    network: "kusama",
    displayName: "Kusama Relay Chain",
    symbols: [
      "KSM"
    ],
    decimals: [
      12
    ],
    standardAccount: "*25519",
    website: "https://kusama.network"
  },
  {
    prefix: 3,
    network: "BareEd25519",
    displayName: "Bare 32-bit Ed25519 public key.",
    symbols: [],
    decimals: [],
    standardAccount: "Ed25519",
    website: null
  },
  {
    prefix: 4,
    network: "katalchain",
    displayName: "Katal Chain",
    symbols: [],
    decimals: [],
    standardAccount: "*25519",
    website: null
  },
  {
    prefix: 5,
    network: "astar",
    displayName: "Astar Network",
    symbols: [
      "ASTR"
    ],
    decimals: [
      18
    ],
    standardAccount: "*25519",
    website: "https://astar.network"
  },
  {
    prefix: 6,
    network: "bifrost",
    displayName: "Bifrost",
    symbols: [
      "BNC"
    ],
    decimals: [
      12
    ],
    standardAccount: "*25519",
    website: "https://bifrost.finance/"
  },
  {
    prefix: 7,
    network: "edgeware",
    displayName: "Edgeware",
    symbols: [
      "EDG"
    ],
    decimals: [
      18
    ],
    standardAccount: "*25519",
    website: "https://edgewa.re"
  },
  {
    prefix: 8,
    network: "karura",
    displayName: "Karura",
    symbols: [
      "KAR"
    ],
    decimals: [
      12
    ],
    standardAccount: "*25519",
    website: "https://karura.network/"
  },
  {
    prefix: 9,
    network: "reynolds",
    displayName: "Laminar Reynolds Canary",
    symbols: [
      "REY"
    ],
    decimals: [
      18
    ],
    standardAccount: "*25519",
    website: "http://laminar.network/"
  },
  {
    prefix: 10,
    network: "acala",
    displayName: "Acala",
    symbols: [
      "ACA"
    ],
    decimals: [
      12
    ],
    standardAccount: "*25519",
    website: "https://acala.network/"
  },
  {
    prefix: 11,
    network: "laminar",
    displayName: "Laminar",
    symbols: [
      "LAMI"
    ],
    decimals: [
      18
    ],
    standardAccount: "*25519",
    website: "http://laminar.network/"
  },
  {
    prefix: 12,
    network: "polymesh",
    displayName: "Polymesh",
    symbols: [
      "POLYX"
    ],
    decimals: [
      6
    ],
    standardAccount: "*25519",
    website: "https://polymath.network/"
  },
  {
    prefix: 13,
    network: "integritee",
    displayName: "Integritee",
    symbols: [
      "TEER"
    ],
    decimals: [
      12
    ],
    standardAccount: "*25519",
    website: "https://integritee.network"
  },
  {
    prefix: 14,
    network: "totem",
    displayName: "Totem",
    symbols: [
      "TOTEM"
    ],
    decimals: [
      0
    ],
    standardAccount: "*25519",
    website: "https://totemaccounting.com"
  },
  {
    prefix: 15,
    network: "synesthesia",
    displayName: "Synesthesia",
    symbols: [
      "SYN"
    ],
    decimals: [
      12
    ],
    standardAccount: "*25519",
    website: "https://synesthesia.network/"
  },
  {
    prefix: 16,
    network: "kulupu",
    displayName: "Kulupu",
    symbols: [
      "KLP"
    ],
    decimals: [
      12
    ],
    standardAccount: "*25519",
    website: "https://kulupu.network/"
  },
  {
    prefix: 17,
    network: "dark",
    displayName: "Dark Mainnet",
    symbols: [],
    decimals: [],
    standardAccount: "*25519",
    website: null
  },
  {
    prefix: 18,
    network: "darwinia",
    displayName: "Darwinia Network",
    symbols: [
      "RING"
    ],
    decimals: [
      18
    ],
    standardAccount: "secp256k1",
    website: "https://darwinia.network"
  },
  {
    prefix: 19,
    network: "watr",
    displayName: "Watr Protocol",
    symbols: [
      "WATR"
    ],
    decimals: [
      18
    ],
    standardAccount: "*25519",
    website: "https://www.watr.org"
  },
  {
    prefix: 20,
    network: "stafi",
    displayName: "Stafi",
    symbols: [
      "FIS"
    ],
    decimals: [
      12
    ],
    standardAccount: "*25519",
    website: "https://stafi.io"
  },
  {
    prefix: 21,
    network: "karmachain",
    displayName: "Karmacoin",
    symbols: [
      "KCOIN"
    ],
    decimals: [
      6
    ],
    standardAccount: "*25519",
    website: "https://karmaco.in"
  },
  {
    prefix: 22,
    network: "dock-pos-mainnet",
    displayName: "Dock Mainnet",
    symbols: [
      "DCK"
    ],
    decimals: [
      6
    ],
    standardAccount: "*25519",
    website: "https://dock.io"
  },
  {
    prefix: 23,
    network: "shift",
    displayName: "ShiftNrg",
    symbols: [],
    decimals: [],
    standardAccount: "*25519",
    website: null
  },
  {
    prefix: 24,
    network: "zero",
    displayName: "ZERO",
    symbols: [
      "ZERO"
    ],
    decimals: [
      18
    ],
    standardAccount: "*25519",
    website: "https://zero.io"
  },
  {
    prefix: 25,
    network: "zero-alphaville",
    displayName: "ZERO Alphaville",
    symbols: [
      "ZERO"
    ],
    decimals: [
      18
    ],
    standardAccount: "*25519",
    website: "https://zero.io"
  },
  {
    prefix: 26,
    network: "jupiter",
    displayName: "Jupiter",
    symbols: [
      "jDOT"
    ],
    decimals: [
      10
    ],
    standardAccount: "*25519",
    website: "https://jupiter.patract.io"
  },
  {
    prefix: 27,
    network: "kabocha",
    displayName: "Kabocha",
    symbols: [
      "KAB"
    ],
    decimals: [
      12
    ],
    standardAccount: "*25519",
    website: "https://kabocha.network"
  },
  {
    prefix: 28,
    network: "subsocial",
    displayName: "Subsocial",
    symbols: [],
    decimals: [],
    standardAccount: "*25519",
    website: null
  },
  {
    prefix: 29,
    network: "cord",
    displayName: "CORD Network",
    symbols: [
      "DHI",
      "WAY"
    ],
    decimals: [
      12,
      12
    ],
    standardAccount: "*25519",
    website: "https://cord.network/"
  },
  {
    prefix: 30,
    network: "phala",
    displayName: "Phala Network",
    symbols: [
      "PHA"
    ],
    decimals: [
      12
    ],
    standardAccount: "*25519",
    website: "https://phala.network"
  },
  {
    prefix: 31,
    network: "litentry",
    displayName: "Litentry Network",
    symbols: [
      "LIT"
    ],
    decimals: [
      12
    ],
    standardAccount: "*25519",
    website: "https://litentry.com/"
  },
  {
    prefix: 32,
    network: "robonomics",
    displayName: "Robonomics",
    symbols: [
      "XRT"
    ],
    decimals: [
      9
    ],
    standardAccount: "*25519",
    website: "https://robonomics.network"
  },
  {
    prefix: 33,
    network: "datahighway",
    displayName: "DataHighway",
    symbols: [],
    decimals: [],
    standardAccount: "*25519",
    website: null
  },
  {
    prefix: 34,
    network: "ares",
    displayName: "Ares Protocol",
    symbols: [
      "ARES"
    ],
    decimals: [
      12
    ],
    standardAccount: "*25519",
    website: "https://www.aresprotocol.com/"
  },
  {
    prefix: 35,
    network: "vln",
    displayName: "Valiu Liquidity Network",
    symbols: [
      "USDv"
    ],
    decimals: [
      15
    ],
    standardAccount: "*25519",
    website: "https://valiu.com/"
  },
  {
    prefix: 36,
    network: "centrifuge",
    displayName: "Centrifuge Chain",
    symbols: [
      "CFG"
    ],
    decimals: [
      18
    ],
    standardAccount: "*25519",
    website: "https://centrifuge.io/"
  },
  {
    prefix: 37,
    network: "nodle",
    displayName: "Nodle Chain",
    symbols: [
      "NODL"
    ],
    decimals: [
      11
    ],
    standardAccount: "*25519",
    website: "https://nodle.io/"
  },
  {
    prefix: 38,
    network: "kilt",
    displayName: "KILT Spiritnet",
    symbols: [
      "KILT"
    ],
    decimals: [
      15
    ],
    standardAccount: "*25519",
    website: "https://kilt.io/"
  },
  {
    prefix: 39,
    network: "mathchain",
    displayName: "MathChain mainnet",
    symbols: [
      "MATH"
    ],
    decimals: [
      18
    ],
    standardAccount: "*25519",
    website: "https://mathwallet.org"
  },
  {
    prefix: 40,
    network: "mathchain-testnet",
    displayName: "MathChain testnet",
    symbols: [
      "MATH"
    ],
    decimals: [
      18
    ],
    standardAccount: "*25519",
    website: "https://mathwallet.org"
  },
  {
    prefix: 41,
    network: "polimec",
    displayName: "Polimec Protocol",
    symbols: [
      "PLMC"
    ],
    decimals: [
      10
    ],
    standardAccount: "*25519",
    website: "https://www.polimec.org/"
  },
  {
    prefix: 42,
    network: "substrate",
    displayName: "Substrate",
    symbols: [],
    decimals: [],
    standardAccount: "*25519",
    website: "https://substrate.io/"
  },
  {
    prefix: 43,
    network: "BareSecp256k1",
    displayName: "Bare 32-bit ECDSA SECP-256k1 public key.",
    symbols: [],
    decimals: [],
    standardAccount: "secp256k1",
    website: null
  },
  {
    prefix: 44,
    network: "chainx",
    displayName: "ChainX",
    symbols: [
      "PCX"
    ],
    decimals: [
      8
    ],
    standardAccount: "*25519",
    website: "https://chainx.org/"
  },
  {
    prefix: 45,
    network: "uniarts",
    displayName: "UniArts Network",
    symbols: [
      "UART",
      "UINK"
    ],
    decimals: [
      12,
      12
    ],
    standardAccount: "*25519",
    website: "https://uniarts.me"
  },
  {
    prefix: 46,
    network: "reserved46",
    displayName: "This prefix is reserved.",
    symbols: [],
    decimals: [],
    standardAccount: null,
    website: null
  },
  {
    prefix: 47,
    network: "reserved47",
    displayName: "This prefix is reserved.",
    symbols: [],
    decimals: [],
    standardAccount: null,
    website: null
  },
  {
    prefix: 48,
    network: "neatcoin",
    displayName: "Neatcoin Mainnet",
    symbols: [
      "NEAT"
    ],
    decimals: [
      12
    ],
    standardAccount: "*25519",
    website: "https://neatcoin.org"
  },
  {
    prefix: 49,
    network: "picasso",
    displayName: "Picasso",
    symbols: [
      "PICA"
    ],
    decimals: [
      12
    ],
    standardAccount: "*25519",
    website: "https://picasso.composable.finance"
  },
  {
    prefix: 50,
    network: "composable",
    displayName: "Composable Finance",
    symbols: [
      "LAYR"
    ],
    decimals: [
      12
    ],
    standardAccount: "*25519",
    website: "https://composable.finance"
  },
  {
    prefix: 51,
    network: "oak",
    displayName: "OAK Network",
    symbols: [
      "OAK",
      "TUR"
    ],
    decimals: [
      10,
      10
    ],
    standardAccount: "*25519",
    website: "https://oak.tech"
  },
  {
    prefix: 52,
    network: "KICO",
    displayName: "KICO",
    symbols: [
      "KICO"
    ],
    decimals: [
      14
    ],
    standardAccount: "*25519",
    website: "https://dico.io"
  },
  {
    prefix: 53,
    network: "DICO",
    displayName: "DICO",
    symbols: [
      "DICO"
    ],
    decimals: [
      14
    ],
    standardAccount: "*25519",
    website: "https://dico.io"
  },
  {
    prefix: 54,
    network: "cere",
    displayName: "Cere Network",
    symbols: [
      "CERE"
    ],
    decimals: [
      10
    ],
    standardAccount: "*25519",
    website: "https://cere.network"
  },
  {
    prefix: 55,
    network: "xxnetwork",
    displayName: "xx network",
    symbols: [
      "XX"
    ],
    decimals: [
      9
    ],
    standardAccount: "*25519",
    website: "https://xx.network"
  },
  {
    prefix: 56,
    network: "pendulum",
    displayName: "Pendulum chain",
    symbols: [
      "PEN"
    ],
    decimals: [
      12
    ],
    standardAccount: "*25519",
    website: "https://pendulumchain.org/"
  },
  {
    prefix: 57,
    network: "amplitude",
    displayName: "Amplitude chain",
    symbols: [
      "AMPE"
    ],
    decimals: [
      12
    ],
    standardAccount: "*25519",
    website: "https://pendulumchain.org/"
  },
  {
    prefix: 58,
    network: "eternal-civilization",
    displayName: "Eternal Civilization",
    symbols: [
      "ECC"
    ],
    decimals: [
      12
    ],
    standardAccount: "*25519",
    website: "http://www.ysknfr.cn/"
  },
  {
    prefix: 63,
    network: "hydradx",
    displayName: "Hydration",
    symbols: [
      "HDX"
    ],
    decimals: [
      12
    ],
    standardAccount: "*25519",
    website: "https://hydration.net"
  },
  {
    prefix: 65,
    network: "aventus",
    displayName: "Aventus Mainnet",
    symbols: [
      "AVT"
    ],
    decimals: [
      18
    ],
    standardAccount: "*25519",
    website: "https://aventus.io"
  },
  {
    prefix: 66,
    network: "crust",
    displayName: "Crust Network",
    symbols: [
      "CRU"
    ],
    decimals: [
      12
    ],
    standardAccount: "*25519",
    website: "https://crust.network"
  },
  {
    prefix: 67,
    network: "genshiro",
    displayName: "Genshiro Network",
    symbols: [
      "GENS",
      "EQD",
      "LPT0"
    ],
    decimals: [
      9,
      9,
      9
    ],
    standardAccount: "*25519",
    website: "https://genshiro.equilibrium.io"
  },
  {
    prefix: 68,
    network: "equilibrium",
    displayName: "Equilibrium Network",
    symbols: [
      "EQ"
    ],
    decimals: [
      9
    ],
    standardAccount: "*25519",
    website: "https://equilibrium.io"
  },
  {
    prefix: 69,
    network: "sora",
    displayName: "SORA Network",
    symbols: [
      "XOR"
    ],
    decimals: [
      18
    ],
    standardAccount: "*25519",
    website: "https://sora.org"
  },
  {
    prefix: 71,
    network: "p3d",
    displayName: "3DP network",
    symbols: [
      "P3D"
    ],
    decimals: [
      12
    ],
    standardAccount: "*25519",
    website: "https://3dpass.org"
  },
  {
    prefix: 72,
    network: "p3dt",
    displayName: "3DP test network",
    symbols: [
      "P3Dt"
    ],
    decimals: [
      12
    ],
    standardAccount: "*25519",
    website: "https://3dpass.org"
  },
  {
    prefix: 73,
    network: "zeitgeist",
    displayName: "Zeitgeist",
    symbols: [
      "ZTG"
    ],
    decimals: [
      10
    ],
    standardAccount: "*25519",
    website: "https://zeitgeist.pm"
  },
  {
    prefix: 77,
    network: "manta",
    displayName: "Manta network",
    symbols: [
      "MANTA"
    ],
    decimals: [
      18
    ],
    standardAccount: "*25519",
    website: "https://manta.network"
  },
  {
    prefix: 78,
    network: "calamari",
    displayName: "Calamari: Manta Canary Network",
    symbols: [
      "KMA"
    ],
    decimals: [
      12
    ],
    standardAccount: "*25519",
    website: "https://manta.network"
  },
  {
    prefix: 81,
    network: "sora_dot_para",
    displayName: "SORA Polkadot Parachain",
    symbols: [
      "XOR"
    ],
    decimals: [
      18
    ],
    standardAccount: "*25519",
    website: "https://sora.org"
  },
  {
    prefix: 88,
    network: "polkadex",
    displayName: "Polkadex Mainnet",
    symbols: [
      "PDEX"
    ],
    decimals: [
      12
    ],
    standardAccount: "*25519",
    website: "https://polkadex.trade"
  },
  {
    prefix: 89,
    network: "polkadexparachain",
    displayName: "Polkadex Parachain",
    symbols: [
      "PDEX"
    ],
    decimals: [
      12
    ],
    standardAccount: "*25519",
    website: "https://polkadex.trade"
  },
  {
    prefix: 90,
    network: "frequency",
    displayName: "Frequency",
    symbols: [
      "FRQCY"
    ],
    decimals: [
      8
    ],
    standardAccount: "*25519",
    website: "https://www.frequency.xyz"
  },
  {
    prefix: 92,
    network: "anmol",
    displayName: "Anmol Network",
    symbols: [
      "ANML"
    ],
    decimals: [
      18
    ],
    standardAccount: "*25519",
    website: "https://anmol.network/"
  },
  {
    prefix: 93,
    network: "fragnova",
    displayName: "Fragnova Network",
    symbols: [
      "NOVA"
    ],
    decimals: [
      12
    ],
    standardAccount: "*25519",
    website: "https://fragnova.com"
  },
  {
    prefix: 98,
    network: "polkasmith",
    displayName: "PolkaSmith Canary Network",
    symbols: [
      "PKS"
    ],
    decimals: [
      18
    ],
    standardAccount: "*25519",
    website: "https://polkafoundry.com"
  },
  {
    prefix: 99,
    network: "polkafoundry",
    displayName: "PolkaFoundry Network",
    symbols: [
      "PKF"
    ],
    decimals: [
      18
    ],
    standardAccount: "*25519",
    website: "https://polkafoundry.com"
  },
  {
    prefix: 100,
    network: "ibtida",
    displayName: "Anmol Network Ibtida Canary network",
    symbols: [
      "IANML"
    ],
    decimals: [
      18
    ],
    standardAccount: "*25519",
    website: "https://anmol.network/"
  },
  {
    prefix: 101,
    network: "origintrail-parachain",
    displayName: "OriginTrail Parachain",
    symbols: [
      "OTP"
    ],
    decimals: [
      12
    ],
    standardAccount: "*25519",
    website: "https://parachain.origintrail.io/"
  },
  {
    prefix: 105,
    network: "pontem-network",
    displayName: "Pontem Network",
    symbols: [
      "PONT"
    ],
    decimals: [
      10
    ],
    standardAccount: "*25519",
    website: "https://pontem.network"
  },
  {
    prefix: 110,
    network: "heiko",
    displayName: "Heiko",
    symbols: [
      "HKO"
    ],
    decimals: [
      12
    ],
    standardAccount: "*25519",
    website: "https://parallel.fi/"
  },
  {
    prefix: 113,
    network: "integritee-incognito",
    displayName: "Integritee Incognito",
    symbols: [],
    decimals: [],
    standardAccount: "*25519",
    website: "https://integritee.network"
  },
  {
    prefix: 117,
    network: "tinker",
    displayName: "Tinker",
    symbols: [
      "TNKR"
    ],
    decimals: [
      12
    ],
    standardAccount: "*25519",
    website: "https://invarch.network"
  },
  {
    prefix: 126,
    network: "joystream",
    displayName: "Joystream",
    symbols: [
      "JOY"
    ],
    decimals: [
      10
    ],
    standardAccount: "*25519",
    website: "https://www.joystream.org"
  },
  {
    prefix: 128,
    network: "clover",
    displayName: "Clover Finance",
    symbols: [
      "CLV"
    ],
    decimals: [
      18
    ],
    standardAccount: "*25519",
    website: "https://clover.finance"
  },
  {
    prefix: 129,
    network: "dorafactory-polkadot",
    displayName: "Dorafactory Polkadot Network",
    symbols: [
      "DORA"
    ],
    decimals: [
      12
    ],
    standardAccount: "*25519",
    website: "https://dorafactory.org"
  },
  {
    prefix: 131,
    network: "litmus",
    displayName: "Litmus Network",
    symbols: [
      "LIT"
    ],
    decimals: [
      12
    ],
    standardAccount: "*25519",
    website: "https://litentry.com/"
  },
  {
    prefix: 136,
    network: "altair",
    displayName: "Altair",
    symbols: [
      "AIR"
    ],
    decimals: [
      18
    ],
    standardAccount: "*25519",
    website: "https://centrifuge.io/"
  },
  {
    prefix: 137,
    network: "vara",
    displayName: "Vara Network",
    symbols: [
      "VARA"
    ],
    decimals: [
      12
    ],
    standardAccount: "*25519",
    website: "https://vara.network/"
  },
  {
    prefix: 172,
    network: "parallel",
    displayName: "Parallel",
    symbols: [
      "PARA"
    ],
    decimals: [
      12
    ],
    standardAccount: "*25519",
    website: "https://parallel.fi/"
  },
  {
    prefix: 252,
    network: "social-network",
    displayName: "Social Network",
    symbols: [
      "NET"
    ],
    decimals: [
      18
    ],
    standardAccount: "*25519",
    website: "https://social.network"
  },
  {
    prefix: 255,
    network: "quartz_mainnet",
    displayName: "QUARTZ by UNIQUE",
    symbols: [
      "QTZ"
    ],
    decimals: [
      18
    ],
    standardAccount: "*25519",
    website: "https://unique.network"
  },
  {
    prefix: 268,
    network: "pioneer_network",
    displayName: "Pioneer Network by Bit.Country",
    symbols: [
      "NEER"
    ],
    decimals: [
      18
    ],
    standardAccount: "*25519",
    website: "https://bit.country"
  },
  {
    prefix: 420,
    network: "sora_kusama_para",
    displayName: "SORA Kusama Parachain",
    symbols: [
      "XOR"
    ],
    decimals: [
      18
    ],
    standardAccount: "*25519",
    website: "https://sora.org"
  },
  {
    prefix: 440,
    network: "allfeat_network",
    displayName: "Allfeat Network",
    symbols: [
      "AFT"
    ],
    decimals: [
      12
    ],
    standardAccount: "*25519",
    website: "https://allfeat.network"
  },
  {
    prefix: 666,
    network: "metaquity_network",
    displayName: "Metaquity Network",
    symbols: [
      "MQTY"
    ],
    decimals: [
      18
    ],
    standardAccount: "*25519",
    website: "https://metaquity.xyz/"
  },
  {
    prefix: 777,
    network: "curio",
    displayName: "Curio",
    symbols: [
      "CGT"
    ],
    decimals: [
      18
    ],
    standardAccount: "*25519",
    website: "https://parachain.capitaldex.exchange/"
  },
  {
    prefix: 789,
    network: "geek",
    displayName: "GEEK Network",
    symbols: [
      "GEEK"
    ],
    decimals: [
      18
    ],
    standardAccount: "*25519",
    website: "https://geek.gl"
  },
  {
    prefix: 995,
    network: "ternoa",
    displayName: "Ternoa",
    symbols: [
      "CAPS"
    ],
    decimals: [
      18
    ],
    standardAccount: "*25519",
    website: "https://www.ternoa.network"
  },
  {
    prefix: 1110,
    network: "efinity",
    displayName: "Efinity",
    symbols: [
      "EFI"
    ],
    decimals: [
      18
    ],
    standardAccount: "*25519",
    website: "https://efinity.io/"
  },
  {
    prefix: 1221,
    network: "peaq",
    displayName: "Peaq Network",
    symbols: [
      "PEAQ"
    ],
    decimals: [
      18
    ],
    standardAccount: "Sr25519",
    website: "https://www.peaq.network/"
  },
  {
    prefix: 1222,
    network: "krest",
    displayName: "Krest Network",
    symbols: [
      "KREST"
    ],
    decimals: [
      18
    ],
    standardAccount: "Sr25519",
    website: "https://www.peaq.network/"
  },
  {
    prefix: 1284,
    network: "moonbeam",
    displayName: "Moonbeam",
    symbols: [
      "GLMR"
    ],
    decimals: [
      18
    ],
    standardAccount: "secp256k1",
    website: "https://moonbeam.network"
  },
  {
    prefix: 1285,
    network: "moonriver",
    displayName: "Moonriver",
    symbols: [
      "MOVR"
    ],
    decimals: [
      18
    ],
    standardAccount: "secp256k1",
    website: "https://moonbeam.network"
  },
  {
    prefix: 1328,
    network: "ajuna",
    displayName: "Ajuna Network",
    symbols: [
      "AJUN"
    ],
    decimals: [
      12
    ],
    standardAccount: "*25519",
    website: "https://ajuna.io"
  },
  {
    prefix: 1337,
    network: "bajun",
    displayName: "Bajun Network",
    symbols: [
      "BAJU"
    ],
    decimals: [
      12
    ],
    standardAccount: "*25519",
    website: "https://ajuna.io"
  },
  {
    prefix: 1516,
    network: "societal",
    displayName: "Societal",
    symbols: [
      "SCTL"
    ],
    decimals: [
      12
    ],
    standardAccount: "*25519",
    website: "https://www.sctl.xyz"
  },
  {
    prefix: 1985,
    network: "seals",
    displayName: "Seals Network",
    symbols: [
      "SEAL"
    ],
    decimals: [
      9
    ],
    standardAccount: "*25519",
    website: "https://seals.app"
  },
  {
    prefix: 2007,
    network: "kapex",
    displayName: "Kapex",
    symbols: [
      "KAPEX"
    ],
    decimals: [
      12
    ],
    standardAccount: "*25519",
    website: "https://totemaccounting.com"
  },
  {
    prefix: 2009,
    network: "cloudwalk_mainnet",
    displayName: "CloudWalk Network Mainnet",
    symbols: [
      "CWN"
    ],
    decimals: [
      18
    ],
    standardAccount: "*25519",
    website: "https://explorer.mainnet.cloudwalk.io"
  },
  {
    prefix: 2021,
    network: "logion",
    displayName: "logion network",
    symbols: [
      "LGNT"
    ],
    decimals: [
      18
    ],
    standardAccount: "*25519",
    website: "https://logion.network"
  },
  {
    prefix: 2024,
    network: "vow-chain",
    displayName: "Enigmatic Smile",
    symbols: [
      "VOW"
    ],
    decimals: [
      18
    ],
    standardAccount: "*25519",
    website: "https://www.vow.foundation/"
  },
  {
    prefix: 2032,
    network: "interlay",
    displayName: "Interlay",
    symbols: [
      "INTR"
    ],
    decimals: [
      10
    ],
    standardAccount: "*25519",
    website: "https://interlay.io/"
  },
  {
    prefix: 2092,
    network: "kintsugi",
    displayName: "Kintsugi",
    symbols: [
      "KINT"
    ],
    decimals: [
      12
    ],
    standardAccount: "*25519",
    website: "https://interlay.io/"
  },
  {
    prefix: 2106,
    network: "bitgreen",
    displayName: "Bitgreen",
    symbols: [
      "BBB"
    ],
    decimals: [
      18
    ],
    standardAccount: "*25519",
    website: "https://bitgreen.org/"
  },
  {
    prefix: 2112,
    network: "chainflip",
    displayName: "Chainflip",
    symbols: [
      "FLIP"
    ],
    decimals: [
      18
    ],
    standardAccount: "*25519",
    website: "https://chainflip.io/"
  },
  {
    prefix: 2199,
    network: "moonsama",
    displayName: "Moonsama",
    symbols: [
      "SAMA"
    ],
    decimals: [
      18
    ],
    standardAccount: "secp256k1",
    website: "https://moonsama.com"
  },
  {
    prefix: 2206,
    network: "ICE",
    displayName: "ICE Network",
    symbols: [
      "ICY"
    ],
    decimals: [
      18
    ],
    standardAccount: "*25519",
    website: "https://icenetwork.io"
  },
  {
    prefix: 2207,
    network: "SNOW",
    displayName: "SNOW: ICE Canary Network",
    symbols: [
      "ICZ"
    ],
    decimals: [
      18
    ],
    standardAccount: "*25519",
    website: "https://icenetwork.io"
  },
  {
    prefix: 2254,
    network: "subspace_testnet",
    displayName: "Subspace testnet",
    symbols: [
      "tSSC"
    ],
    decimals: [
      18
    ],
    standardAccount: "*25519",
    website: "https://subspace.network"
  },
  {
    prefix: 3333,
    network: "peerplays",
    displayName: "Peerplays",
    symbols: [
      "PPY"
    ],
    decimals: [
      18
    ],
    standardAccount: "secp256k1",
    website: "https://www.peerplays.com/"
  },
  {
    prefix: 4450,
    network: "g1",
    displayName: "Ğ1",
    symbols: [
      "G1"
    ],
    decimals: [
      2
    ],
    standardAccount: "*25519",
    website: "https://duniter.org"
  },
  {
    prefix: 5234,
    network: "humanode",
    displayName: "Humanode Network",
    symbols: [
      "HMND"
    ],
    decimals: [
      18
    ],
    standardAccount: "*25519",
    website: "https://humanode.io"
  },
  {
    prefix: 5845,
    network: "tangle",
    displayName: "Tangle Network",
    symbols: [
      "TNT"
    ],
    decimals: [
      18
    ],
    standardAccount: "*25519",
    website: "https://www.tangle.tools/"
  },
  {
    prefix: 6094,
    network: "subspace",
    displayName: "Subspace",
    symbols: [
      "SSC"
    ],
    decimals: [
      18
    ],
    standardAccount: "*25519",
    website: "https://subspace.network"
  },
  {
    prefix: 7007,
    network: "tidefi",
    displayName: "Tidefi",
    symbols: [
      "TDFY"
    ],
    decimals: [
      12
    ],
    standardAccount: "*25519",
    website: "https://tidefi.com"
  },
  {
    prefix: 7013,
    network: "gm",
    displayName: "GM",
    symbols: [
      "FREN",
      "GM",
      "GN"
    ],
    decimals: [
      12,
      0,
      0
    ],
    standardAccount: "*25519",
    website: "https://gmordie.com"
  },
  {
    prefix: 7306,
    network: "krigan",
    displayName: "Krigan Network",
    symbols: [
      "KRGN"
    ],
    decimals: [
      9
    ],
    standardAccount: "*25519",
    website: "https://krigan.network"
  },
  {
    prefix: 7391,
    network: "unique_mainnet",
    displayName: "Unique Network",
    symbols: [
      "UNQ"
    ],
    decimals: [
      18
    ],
    standardAccount: "*25519",
    website: "https://unique.network"
  },
  {
    prefix: 8866,
    network: "golden_gate",
    displayName: "Golden Gate",
    symbols: [
      "GGX"
    ],
    decimals: [
      18
    ],
    standardAccount: "*25519",
    website: "https://ggxchain.io/"
  },
  {
    prefix: 8883,
    network: "sapphire_mainnet",
    displayName: "Sapphire by Unique",
    symbols: [
      "QTZ"
    ],
    decimals: [
      18
    ],
    standardAccount: "*25519",
    website: "https://unique.network"
  },
  {
    prefix: 8886,
    network: "golden_gate_sydney",
    displayName: "Golden Gate Sydney",
    symbols: [
      "GGXT"
    ],
    decimals: [
      18
    ],
    standardAccount: "*25519",
    website: "https://ggxchain.io/"
  },
  {
    prefix: 9072,
    network: "hashed",
    displayName: "Hashed Network",
    symbols: [
      "HASH"
    ],
    decimals: [
      18
    ],
    standardAccount: "*25519",
    website: "https://hashed.network"
  },
  {
    prefix: 9807,
    network: "dentnet",
    displayName: "DENTNet",
    symbols: [
      "DENTX"
    ],
    decimals: [
      18
    ],
    standardAccount: "*25519",
    website: "https://www.dentnet.io"
  },
  {
    prefix: 9935,
    network: "t3rn",
    displayName: "t3rn",
    symbols: [
      "TRN"
    ],
    decimals: [
      12
    ],
    standardAccount: "*25519",
    website: "https://t3rn.io/"
  },
  {
    prefix: 10041,
    network: "basilisk",
    displayName: "Basilisk",
    symbols: [
      "BSX"
    ],
    decimals: [
      12
    ],
    standardAccount: "*25519",
    website: "https://bsx.fi"
  },
  {
    prefix: 11330,
    network: "cess-testnet",
    displayName: "CESS Testnet",
    symbols: [
      "TCESS"
    ],
    decimals: [
      18
    ],
    standardAccount: "*25519",
    website: "https://cess.cloud"
  },
  {
    prefix: 11331,
    network: "cess",
    displayName: "CESS",
    symbols: [
      "CESS"
    ],
    decimals: [
      18
    ],
    standardAccount: "*25519",
    website: "https://cess.cloud"
  },
  {
    prefix: 11486,
    network: "luhn",
    displayName: "Luhn Network",
    symbols: [
      "LUHN"
    ],
    decimals: [
      18
    ],
    standardAccount: "*25519",
    website: "https://luhn.network"
  },
  {
    prefix: 11820,
    network: "contextfree",
    displayName: "Automata ContextFree",
    symbols: [
      "CTX"
    ],
    decimals: [
      18
    ],
    standardAccount: "*25519",
    website: "https://ata.network"
  },
  {
    prefix: 12155,
    network: "impact",
    displayName: "Impact Protocol Network",
    symbols: [
      "BSTY"
    ],
    decimals: [
      18
    ],
    standardAccount: "*25519",
    website: "https://impactprotocol.network/"
  },
  {
    prefix: 12191,
    network: "nftmart",
    displayName: "NFTMart",
    symbols: [
      "NMT"
    ],
    decimals: [
      12
    ],
    standardAccount: "*25519",
    website: "https://nftmart.io"
  },
  {
    prefix: 12850,
    network: "analog-timechain",
    displayName: "Analog Timechain",
    symbols: [
      "ANLOG"
    ],
    decimals: [
      12
    ],
    standardAccount: "*25519",
    website: "https://analog.one"
  },
  {
    prefix: 13116,
    network: "bittensor",
    displayName: "Bittensor",
    symbols: [
      "TAO"
    ],
    decimals: [
      9
    ],
    standardAccount: "*25519",
    website: "https://bittensor.com"
  },
  {
    prefix: 14697,
    network: "goro",
    displayName: "GORO Network",
    symbols: [
      "GORO"
    ],
    decimals: [
      9
    ],
    standardAccount: "*25519",
    website: "https://goro.network"
  },
  {
    prefix: 14998,
    network: "mosaic-chain",
    displayName: "Mosaic Chain",
    symbols: [
      "MOS"
    ],
    decimals: [
      18
    ],
    standardAccount: "*25519",
    website: "https://mosaicchain.io"
  },
  {
    prefix: 29972,
    network: "mythos",
    displayName: "Mythos",
    symbols: [
      "MYTH"
    ],
    decimals: [
      18
    ],
    standardAccount: "secp256k1",
    website: "https://mythos.foundation"
  },
  {
    prefix: 8888,
    network: "xcavate",
    displayName: "Xcavate Protocol",
    symbols: [
      "XCAV"
    ],
    decimals: [
      12
    ],
    standardAccount: "*25519",
    website: "https://xcavate.io/"
  }
], Bl = {
  acala: [
    "0xfc41b9bd8ef8fe53d58c7ea67c794c7ec9a73daf05e6d54b14ff6342c99ba64c"
  ],
  ajuna: [
    "0xe358eb1d11b31255a286c12e44fe6780b7edb171d657905a97e39f71d9c6c3ee"
  ],
  "aleph-node": [
    "0x70255b4d28de0fc4e1a193d7e175ad1ccef431598211c55538f1018651a0344e"
  ],
  astar: [
    "0x9eb76c5184c4ab8679d2d5d819fdf90b9c001403e9e17da2e14b6d8aec4029c6"
  ],
  basilisk: [
    "0xa85cfb9b9fd4d622a5b28289a02347af987d8f73fa3108450e2b4a11c1ce5755"
  ],
  bifrost: [
    "0x262e1b2ad728475fd6fe88e62d34c200abe6fd693931ddad144059b1eb884e5b"
  ],
  "bifrost-kusama": [
    "0x9f28c6a68e0fc9646eff64935684f6eeeece527e37bbe1f213d22caa1d9d6bed"
  ],
  bittensor: [
    "0x2f0555cc76fc2840a25a6ea3b9637146806f1f44b090c175ffde2a7e5ab36c03"
  ],
  centrifuge: [
    "0xb3db41421702df9a7fcac62b53ffeac85f7853cc4e689e0b93aeb3db18c09d82",
    "0x67dddf2673b69e5f875f6f25277495834398eafd67f492e09f3f3345e003d1b5"
  ],
  cere: [
    "0x81443836a9a24caaa23f1241897d1235717535711d1d3fe24eae4fdc942c092c"
  ],
  composable: [
    "0xdaab8df776eb52ec604a5df5d388bb62a050a0aaec4556a64265b9d42755552d"
  ],
  darwinia: [
    "0xe71578b37a7c799b0ab4ee87ffa6f059a6b98f71f06fb8c84a8d88013a548ad6"
  ],
  "dock-mainnet": [
    "0x6bfe24dca2a3be10f22212678ac13a6446ec764103c0f3471c71609eac384aae",
    "0xf73467c6544aa68df2ee546b135f955c46b90fa627e9b5d7935f41061bb8a5a9"
  ],
  edgeware: [
    "0x742a2ca70c2fda6cee4f8df98d64c4c670a052d9568058982dad9d5a7a135c5b"
  ],
  enjin: [
    "0xd8761d3c88f26dc12875c00d3165f7d67243d56fc85b4cf19937601a7916e5a9"
  ],
  equilibrium: [
    "0x6f1a800de3daff7f5e037ddf66ab22ce03ab91874debeddb1086f5f7dbd48925"
  ],
  genshiro: [
    "0x9b8cefc0eb5c568b527998bdd76c184e2b76ae561be76e4667072230217ea243"
  ],
  hydradx: [
    "0xafdc188f45c71dacbaa0b62e16a91f726c7b8699a9748cdf715459de6b7f366d",
    // HydraDX Parachain
    "0xd2a620c27ec5cbc5621ff9a522689895074f7cca0d08e7134a7804e1a3ba86fc",
    // Snakenet Gen3-1
    "0x10af6e84234477d84dc572bac0789813b254aa490767ed06fb9591191d1073f9",
    // Snakenet Gen3
    "0x3d75507dd46301767e601265791da1d9cb47b6ebc94e87347b635e5bf58bd047",
    // Snakenet Gen2
    "0x0ed32bfcab4a83517fac88f2aa7cbc2f88d3ab93be9a12b6188a036bf8a943c2"
    // Snakenet Gen1
  ],
  "interlay-parachain": [
    "0xbf88efe70e9e0e916416e8bed61f2b45717f517d7f3523e33c7b001e5ffcbc72"
  ],
  karura: [
    "0xbaf5aabe40646d11f0ee8abbdc64f4a4b7674925cba08e4a05ff9ebed6e2126b"
  ],
  khala: [
    "0xd43540ba6d3eb4897c28a77d48cb5b729fea37603cbbfc7a86a73b72adb3be8d"
  ],
  kulupu: [
    "0xf7a99d3cb92853d00d5275c971c132c074636256583fee53b3bbe60d7b8769ba"
  ],
  kusama: [
    "0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe",
    // Kusama CC3,
    "0xe3777fa922cafbff200cadeaea1a76bd7898ad5b89f7848999058b50e715f636",
    // Kusama CC2
    "0x3fd7b9eb6a00376e5be61f01abb429ffb0b104be05eaff4d458da48fcd425baf"
    // Kusama CC1
  ],
  matrixchain: [
    "0x3af4ff48ec76d2efc8476730f423ac07e25ad48f5f4c9dc39c778b164d808615"
  ],
  nodle: [
    "0x97da7ede98d7bad4e36b4d734b6055425a3be036da2a332ea5a7037656427a21"
  ],
  origintrail: [
    "0xe7e0962324a3b86c83404dbea483f25fb5dab4c224791c81b756cfc948006174"
  ],
  p3d: [
    "0x6c5894837ad89b6d92b114a2fb3eafa8fe3d26a54848e3447015442cd6ef4e66"
  ],
  parallel: [
    "0xe61a41c53f5dcd0beb09df93b34402aada44cb05117b71059cce40a2723a4e97"
  ],
  pendulum: [
    "0x5d3c298622d5634ed019bf61ea4b71655030015bde9beb0d6a24743714462c86"
  ],
  phala: [
    "0x1bb969d85965e4bb5a651abbedf21a54b6b31a21f66b5401cc3f1e286268d736"
  ],
  picasso: [
    "0x6811a339673c9daa897944dcdac99c6e2939cc88245ed21951a0a3c9a2be75bc",
    "0xe8e7f0f4c4f5a00720b4821dbfddefea7490bcf0b19009961cc46957984e2c1c"
  ],
  polkadex: [
    "0x3920bcb4960a1eef5580cd5367ff3f430eef052774f78468852f7b9cb39f8a3c"
  ],
  polkadot: [
    "0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3"
  ],
  polymesh: [
    "0x6fbd74e5e1d0a61d52ccfe9d4adaed16dd3a7caa37c6bc4d0c2fa12e8b2f4063"
  ],
  quartz: [
    "0xcd4d732201ebe5d6b014edda071c4203e16867305332301dc8d092044b28e554"
  ],
  rococo: [
    "0x6408de7737c59c238890533af25896a2c20608d8b380bb01029acb392781063e",
    "0xaaf2cd1b74b5f726895921259421b534124726263982522174147046b8827897",
    "0x037f5f3c8e67b314062025fc886fcd6238ea25a4a9b45dce8d246815c9ebe770",
    "0xc196f81260cf1686172b47a79cf002120735d7cb0eb1474e8adce56618456fff",
    "0xf6e9983c37baf68846fedafe21e56718790e39fb1c582abc408b81bc7b208f9a",
    "0x5fce687da39305dfe682b117f0820b319348e8bb37eb16cf34acbf6a202de9d9",
    "0xe7c3d5edde7db964317cd9b51a3a059d7cd99f81bdbce14990047354334c9779",
    "0x1611e1dbf0405379b861e2e27daa90f480b2e6d3682414a80835a52e8cb8a215",
    "0x343442f12fa715489a8714e79a7b264ea88c0d5b8c66b684a7788a516032f6b9",
    "0x78bcd530c6b3a068bc17473cf5d2aff9c287102bed9af3ae3c41c33b9d6c6147",
    "0x47381ee0697153d64404fc578392c8fd5cba9073391908f46c888498415647bd",
    "0x19c0e4fa8ab75f5ac7865e0b8f74ff91eb9a100d336f423cd013a8befba40299"
  ],
  sora: [
    "0x7e4e32d0feafd4f9c9414b0be86373f9a1efa904809b683453a9af6856d38ad5"
  ],
  stafi: [
    "0x290a4149f09ea0e402c74c1c7e96ae4239588577fe78932f94f5404c68243d80"
  ],
  statemine: [
    "0x48239ef607d7928874027a43a67689209727dfb3d3dc5e5b03a39bdc2eda771a"
  ],
  statemint: [
    "0x68d56f15f85d3136970ec16946040bc1752654e906147f7e43e9d539d7c3de2f"
  ],
  subsocial: [
    "0x0bd72c1c305172e1275278aaeb3f161e02eccb7a819e63f62d47bd53a28189f8"
  ],
  ternoa: [
    "0x6859c81ca95ef624c9dfe4dc6e3381c33e5d6509e35e147092bfbc780f777c4e"
  ],
  unique: [
    "0x84322d9cddbf35088f1e54e9a85c967a41a56a4f43445768125e61af166c7d31"
  ],
  vtb: [
    "0x286bc8414c7000ce1d6ee6a834e29a54c1784814b76243eb77ed0b2c5573c60f",
    "0x7483b89572fb2bd687c7b9a93b242d0b237f9aba463aba07ec24503931038aaa"
  ],
  westend: [
    "0xe143f23803ac50e8f6f8e62695d1ce9e4e1d68aa36c1cd2cfd15340213f3423e"
  ],
  xxnetwork: [
    "0x50dd5d206917bf10502c68fb4d18a59fc8aa31586f4e8856b493e43544aa82aa"
  ],
  zeitgeist: [
    "0x1bf2a2ecb4a868de66ea8610f2ce7c8c43706561b6476031315f6640fe38e060"
  ]
}, Fl = {
  centrifuge: "polkadot",
  kusama: "polkadot",
  polkadot: "polkadot",
  sora: "polkadot",
  statemine: "polkadot",
  statemint: "polkadot",
  westmint: "polkadot"
}, Cl = {
  acala: 787,
  ajuna: 354,
  "aleph-node": 643,
  astar: 810,
  bifrost: 788,
  "bifrost-kusama": 788,
  centrifuge: 747,
  composable: 354,
  darwinia: 354,
  "dock-mainnet": 594,
  edgeware: 523,
  enjin: 1155,
  equilibrium: 99999997,
  genshiro: 99999996,
  hydradx: 354,
  "interlay-parachain": 354,
  karura: 686,
  khala: 434,
  kusama: 434,
  matrixchain: 1155,
  nodle: 1003,
  origintrail: 354,
  parallel: 354,
  pendulum: 354,
  phala: 354,
  picasso: 434,
  polkadex: 799,
  polkadot: 354,
  polymesh: 595,
  quartz: 631,
  sora: 617,
  stafi: 907,
  statemine: 434,
  // common-good on Kusama, shares derivation
  statemint: 354,
  // common-good on Polkadot, shares derivation
  ternoa: 995,
  unique: 661,
  vtb: 694,
  xxnetwork: 1955,
  zeitgeist: 354
}, Zl = {
  "": !0,
  // this is the default non-network entry
  "cess-testnet": !0,
  "dock-testnet": !0,
  jupiter: !0,
  "mathchain-testnet": !0,
  p3dt: !0,
  subspace_testnet: !0,
  "zero-alphaville": !0
}, Vs = [0, 2, 42], Vl = ["testnet"];
function Gl(t) {
  var i, s;
  const e = t.network || "", n = e.replace(/_/g, "-").split("-"), r = t;
  return r.slip44 = Cl[e], r.hasLedgerSupport = !!r.slip44, r.genesisHash = Bl[e] || [], r.icon = Fl[e] || "substrate", r.isTestnet = !!Zl[e] || Vl.includes(n[n.length - 1]), r.isIgnored = r.isTestnet || !(t.standardAccount && ((i = t.decimals) != null && i.length) && ((s = t.symbols) != null && s.length)) && t.prefix !== 42, r;
}
function ql(t) {
  return !t.isIgnored && !!t.network;
}
function Yl(t, e) {
  const n = Vs.includes(t.prefix), r = Vs.includes(e.prefix);
  return n === r ? n ? 0 : t.displayName.localeCompare(e.displayName) : n ? -1 : 1;
}
const Wl = Dl.map(Gl), Kl = Wl.filter(ql).sort(Yl), fr = {
  allowedDecodedLengths: [1, 2, 4, 8, 32, 33],
  // publicKey has prefix + 2 checksum bytes, short only prefix + 1 checksum byte
  allowedEncodedLengths: [3, 4, 6, 10, 35, 36, 37, 38],
  allowedPrefix: Kl.map(({ prefix: t }) => t),
  prefix: 42
};
function mn(t, e, n = -1) {
  if (!t)
    throw new Error("Invalid empty address passed");
  if (Kt(t) || Mt(t))
    return W(t);
  try {
    const r = cl(t);
    if (!fr.allowedEncodedLengths.includes(r.length))
      throw new Error("Invalid decoded address length");
    const [i, s, o, f] = Xl(r);
    if (!i && !e)
      throw new Error("Invalid decoded address checksum");
    if (n !== -1 && n !== f)
      throw new Error(`Expected ss58Format ${n}, received ${f}`);
    return r.slice(o, s);
  } catch (r) {
    throw new Error(`Decoding ${t}: ${r.message}`);
  }
}
const Gs = { isLe: !1 }, fi = { isLe: !0 }, Jl = { bitLength: 32, isLe: !1 }, ci = { bitLength: 32, isLe: !0 }, vn = { bitLength: 256, isLe: !1 }, Ql = { bitLength: 256, isLe: !0 }, _l = /^\d+$/, $l = 32;
class is {
  constructor() {
    re(this, "__internal__chainCode", new Uint8Array(32));
    re(this, "__internal__isHard", !1);
  }
  static from(e) {
    const n = new is(), [r, i] = e.startsWith("/") ? [e.substring(1), !0] : [e, !1];
    return n.soft(_l.test(r) ? new ee(r, 10) : r), i ? n.harden() : n;
  }
  get chainCode() {
    return this.__internal__chainCode;
  }
  get isHard() {
    return this.__internal__isHard;
  }
  get isSoft() {
    return !this.__internal__isHard;
  }
  hard(e) {
    return this.soft(e).harden();
  }
  harden() {
    return this.__internal__isHard = !0, this;
  }
  soft(e) {
    return ru(e) || oa(e) || da(e) ? this.soft(ot(e, Ql)) : Mt(e) ? this.soft(pn(e)) : nu(e) ? this.soft(es(it(e))) : e.length > $l ? this.soft(_t(e)) : (this.__internal__chainCode.fill(0), this.__internal__chainCode.set(e, 0), this);
  }
  soften() {
    return this.__internal__isHard = !1, this;
  }
}
const ed = /\/(\/?)([^/]+)/g;
function Ca(t) {
  const e = t.match(ed), n = [];
  let r = "";
  if (e) {
    r = e.join("");
    for (const i of e)
      n.push(is.from(i.substring(1)));
  }
  if (r !== t)
    throw new Error(`Re-constructed path "${r}" does not match input`);
  return {
    parts: e,
    path: n
  };
}
const td = /^(\w+( \w+)*)((\/\/?[^/]+)*)(\/\/\/(.*))?$/;
function nd(t) {
  const e = t.match(td);
  if (e === null)
    throw new Error("Unable to match provided value to a secret URI");
  const [, n, , r, , , i] = e, { path: s } = Ca(r);
  return {
    derivePath: r,
    password: i,
    path: s,
    phrase: n
  };
}
const rd = es(it("Secp256k1HDKD"));
function id(t, e) {
  if (!Kt(e) || e.length !== 32)
    throw new Error("Invalid chainCode passed to derive");
  return _t(Qe(rd, t, e), 256);
}
function qs(t) {
  if (!Number.isSafeInteger(t) || t < 0)
    throw new Error(`positive integer expected, not ${t}`);
}
function sd(t) {
  return t instanceof Uint8Array || t != null && typeof t == "object" && t.constructor.name === "Uint8Array";
}
function Tr(t, ...e) {
  if (!sd(t))
    throw new Error("Uint8Array expected");
  if (e.length > 0 && !e.includes(t.length))
    throw new Error(`Uint8Array expected of length ${e}, not of length=${t.length}`);
}
function od(t) {
  if (typeof t != "function" || typeof t.create != "function")
    throw new Error("Hash should be wrapped by utils.wrapConstructor");
  qs(t.outputLen), qs(t.blockLen);
}
function gr(t, e = !0) {
  if (t.destroyed)
    throw new Error("Hash instance has been destroyed");
  if (e && t.finished)
    throw new Error("Hash#digest() has already been called");
}
function ad(t, e) {
  Tr(t);
  const n = e.outputLen;
  if (t.length < n)
    throw new Error(`digestInto() expects output buffer of length at least ${n}`);
}
const ui = typeof globalThis == "object" && "crypto" in globalThis ? globalThis.crypto : void 0;
const li = (t) => new DataView(t.buffer, t.byteOffset, t.byteLength), vt = (t, e) => t << 32 - e | t >>> e;
function fd(t) {
  if (typeof t != "string")
    throw new Error(`utf8ToBytes expected string, got ${typeof t}`);
  return new Uint8Array(new TextEncoder().encode(t));
}
function ss(t) {
  return typeof t == "string" && (t = fd(t)), Tr(t), t;
}
function cd(...t) {
  let e = 0;
  for (let r = 0; r < t.length; r++) {
    const i = t[r];
    Tr(i), e += i.length;
  }
  const n = new Uint8Array(e);
  for (let r = 0, i = 0; r < t.length; r++) {
    const s = t[r];
    n.set(s, i), i += s.length;
  }
  return n;
}
class Za {
  // Safe version that clones internal state
  clone() {
    return this._cloneInto();
  }
}
function Va(t) {
  const e = (r) => t().update(ss(r)).digest(), n = t();
  return e.outputLen = n.outputLen, e.blockLen = n.blockLen, e.create = () => t(), e;
}
function Ga(t = 32) {
  if (ui && typeof ui.getRandomValues == "function")
    return ui.getRandomValues(new Uint8Array(t));
  throw new Error("crypto.getRandomValues must be defined");
}
function ud(t, e, n, r) {
  if (typeof t.setBigUint64 == "function")
    return t.setBigUint64(e, n, r);
  const i = BigInt(32), s = BigInt(4294967295), o = Number(n >> i & s), f = Number(n & s), u = r ? 4 : 0, h = r ? 0 : 4;
  t.setUint32(e + u, o, r), t.setUint32(e + h, f, r);
}
const ld = (t, e, n) => t & e ^ ~t & n, dd = (t, e, n) => t & e ^ t & n ^ e & n;
let qa = class extends Za {
  constructor(e, n, r, i) {
    super(), this.blockLen = e, this.outputLen = n, this.padOffset = r, this.isLE = i, this.finished = !1, this.length = 0, this.pos = 0, this.destroyed = !1, this.buffer = new Uint8Array(e), this.view = li(this.buffer);
  }
  update(e) {
    gr(this);
    const { view: n, buffer: r, blockLen: i } = this;
    e = ss(e);
    const s = e.length;
    for (let o = 0; o < s; ) {
      const f = Math.min(i - this.pos, s - o);
      if (f === i) {
        const u = li(e);
        for (; i <= s - o; o += i)
          this.process(u, o);
        continue;
      }
      r.set(e.subarray(o, o + f), this.pos), this.pos += f, o += f, this.pos === i && (this.process(n, 0), this.pos = 0);
    }
    return this.length += e.length, this.roundClean(), this;
  }
  digestInto(e) {
    gr(this), ad(e, this), this.finished = !0;
    const { buffer: n, view: r, blockLen: i, isLE: s } = this;
    let { pos: o } = this;
    n[o++] = 128, this.buffer.subarray(o).fill(0), this.padOffset > i - o && (this.process(r, 0), o = 0);
    for (let m = o; m < i; m++)
      n[m] = 0;
    ud(r, i - 8, BigInt(this.length * 8), s), this.process(r, 0);
    const f = li(e), u = this.outputLen;
    if (u % 4)
      throw new Error("_sha2: outputLen should be aligned to 32bit");
    const h = u / 4, p = this.get();
    if (h > p.length)
      throw new Error("_sha2: outputLen bigger than state");
    for (let m = 0; m < h; m++)
      f.setUint32(4 * m, p[m], s);
  }
  digest() {
    const { buffer: e, outputLen: n } = this;
    this.digestInto(e);
    const r = e.slice(0, n);
    return this.destroy(), r;
  }
  _cloneInto(e) {
    e || (e = new this.constructor()), e.set(...this.get());
    const { blockLen: n, buffer: r, length: i, finished: s, destroyed: o, pos: f } = this;
    return e.length = i, e.pos = f, e.finished = s, e.destroyed = o, i % n && e.buffer.set(r), e;
  }
};
const hd = /* @__PURE__ */ new Uint32Array([
  1116352408,
  1899447441,
  3049323471,
  3921009573,
  961987163,
  1508970993,
  2453635748,
  2870763221,
  3624381080,
  310598401,
  607225278,
  1426881987,
  1925078388,
  2162078206,
  2614888103,
  3248222580,
  3835390401,
  4022224774,
  264347078,
  604807628,
  770255983,
  1249150122,
  1555081692,
  1996064986,
  2554220882,
  2821834349,
  2952996808,
  3210313671,
  3336571891,
  3584528711,
  113926993,
  338241895,
  666307205,
  773529912,
  1294757372,
  1396182291,
  1695183700,
  1986661051,
  2177026350,
  2456956037,
  2730485921,
  2820302411,
  3259730800,
  3345764771,
  3516065817,
  3600352804,
  4094571909,
  275423344,
  430227734,
  506948616,
  659060556,
  883997877,
  958139571,
  1322822218,
  1537002063,
  1747873779,
  1955562222,
  2024104815,
  2227730452,
  2361852424,
  2428436474,
  2756734187,
  3204031479,
  3329325298
]), Rt = /* @__PURE__ */ new Uint32Array([
  1779033703,
  3144134277,
  1013904242,
  2773480762,
  1359893119,
  2600822924,
  528734635,
  1541459225
]), It = /* @__PURE__ */ new Uint32Array(64);
let pd = class extends qa {
  constructor() {
    super(64, 32, 8, !1), this.A = Rt[0] | 0, this.B = Rt[1] | 0, this.C = Rt[2] | 0, this.D = Rt[3] | 0, this.E = Rt[4] | 0, this.F = Rt[5] | 0, this.G = Rt[6] | 0, this.H = Rt[7] | 0;
  }
  get() {
    const { A: e, B: n, C: r, D: i, E: s, F: o, G: f, H: u } = this;
    return [e, n, r, i, s, o, f, u];
  }
  // prettier-ignore
  set(e, n, r, i, s, o, f, u) {
    this.A = e | 0, this.B = n | 0, this.C = r | 0, this.D = i | 0, this.E = s | 0, this.F = o | 0, this.G = f | 0, this.H = u | 0;
  }
  process(e, n) {
    for (let m = 0; m < 16; m++, n += 4)
      It[m] = e.getUint32(n, !1);
    for (let m = 16; m < 64; m++) {
      const O = It[m - 15], L = It[m - 2], N = vt(O, 7) ^ vt(O, 18) ^ O >>> 3, x = vt(L, 17) ^ vt(L, 19) ^ L >>> 10;
      It[m] = x + It[m - 7] + N + It[m - 16] | 0;
    }
    let { A: r, B: i, C: s, D: o, E: f, F: u, G: h, H: p } = this;
    for (let m = 0; m < 64; m++) {
      const O = vt(f, 6) ^ vt(f, 11) ^ vt(f, 25), L = p + O + ld(f, u, h) + hd[m] + It[m] | 0, x = (vt(r, 2) ^ vt(r, 13) ^ vt(r, 22)) + dd(r, i, s) | 0;
      p = h, h = u, u = f, f = o + L | 0, o = s, s = i, i = r, r = L + x | 0;
    }
    r = r + this.A | 0, i = i + this.B | 0, s = s + this.C | 0, o = o + this.D | 0, f = f + this.E | 0, u = u + this.F | 0, h = h + this.G | 0, p = p + this.H | 0, this.set(r, i, s, o, f, u, h, p);
  }
  roundClean() {
    It.fill(0);
  }
  destroy() {
    this.set(0, 0, 0, 0, 0, 0, 0, 0), this.buffer.fill(0);
  }
};
const md = /* @__PURE__ */ Va(() => new pd());
let Ya = class extends Za {
  constructor(e, n) {
    super(), this.finished = !1, this.destroyed = !1, od(e);
    const r = ss(n);
    if (this.iHash = e.create(), typeof this.iHash.update != "function")
      throw new Error("Expected instance of class which extends utils.Hash");
    this.blockLen = this.iHash.blockLen, this.outputLen = this.iHash.outputLen;
    const i = this.blockLen, s = new Uint8Array(i);
    s.set(r.length > i ? e.create().update(r).digest() : r);
    for (let o = 0; o < s.length; o++)
      s[o] ^= 54;
    this.iHash.update(s), this.oHash = e.create();
    for (let o = 0; o < s.length; o++)
      s[o] ^= 106;
    this.oHash.update(s), s.fill(0);
  }
  update(e) {
    return gr(this), this.iHash.update(e), this;
  }
  digestInto(e) {
    gr(this), Tr(e, this.outputLen), this.finished = !0, this.iHash.digestInto(e), this.oHash.update(e), this.oHash.digestInto(e), this.destroy();
  }
  digest() {
    const e = new Uint8Array(this.oHash.outputLen);
    return this.digestInto(e), e;
  }
  _cloneInto(e) {
    e || (e = Object.create(Object.getPrototypeOf(this), {}));
    const { oHash: n, iHash: r, finished: i, destroyed: s, blockLen: o, outputLen: f } = this;
    return e = e, e.finished = i, e.destroyed = s, e.blockLen = o, e.outputLen = f, e.oHash = n._cloneInto(e.oHash), e.iHash = r._cloneInto(e.iHash), e;
  }
  destroy() {
    this.destroyed = !0, this.oHash.destroy(), this.iHash.destroy();
  }
};
const Wa = (t, e, n) => new Ya(t, e).update(n).digest();
Wa.create = (t, e) => new Ya(t, e);
const os = /* @__PURE__ */ BigInt(0), Mr = /* @__PURE__ */ BigInt(1), gd = /* @__PURE__ */ BigInt(2);
function sn(t) {
  return t instanceof Uint8Array || t != null && typeof t == "object" && t.constructor.name === "Uint8Array";
}
function Vn(t) {
  if (!sn(t))
    throw new Error("Uint8Array expected");
}
function St(t, e) {
  if (typeof e != "boolean")
    throw new Error(`${t} must be valid boolean, got "${e}".`);
}
const bd = /* @__PURE__ */ Array.from({ length: 256 }, (t, e) => e.toString(16).padStart(2, "0"));
function on(t) {
  Vn(t);
  let e = "";
  for (let n = 0; n < t.length; n++)
    e += bd[t[n]];
  return e;
}
function Ka(t) {
  const e = t.toString(16);
  return e.length & 1 ? `0${e}` : e;
}
function as(t) {
  if (typeof t != "string")
    throw new Error("hex string expected, got " + typeof t);
  return BigInt(t === "" ? "0" : `0x${t}`);
}
const Et = { _0: 48, _9: 57, _A: 65, _F: 70, _a: 97, _f: 102 };
function Ys(t) {
  if (t >= Et._0 && t <= Et._9)
    return t - Et._0;
  if (t >= Et._A && t <= Et._F)
    return t - (Et._A - 10);
  if (t >= Et._a && t <= Et._f)
    return t - (Et._a - 10);
}
function wn(t) {
  if (typeof t != "string")
    throw new Error("hex string expected, got " + typeof t);
  const e = t.length, n = e / 2;
  if (e % 2)
    throw new Error("padded hex string expected, got unpadded hex of length " + e);
  const r = new Uint8Array(n);
  for (let i = 0, s = 0; i < n; i++, s += 2) {
    const o = Ys(t.charCodeAt(s)), f = Ys(t.charCodeAt(s + 1));
    if (o === void 0 || f === void 0) {
      const u = t[s] + t[s + 1];
      throw new Error('hex string expected, got non-hex character "' + u + '" at index ' + s);
    }
    r[i] = o * 16 + f;
  }
  return r;
}
function rn(t) {
  return as(on(t));
}
function gn(t) {
  return Vn(t), as(on(Uint8Array.from(t).reverse()));
}
function xn(t, e) {
  return wn(t.toString(16).padStart(e * 2, "0"));
}
function Un(t, e) {
  return xn(t, e).reverse();
}
function yd(t) {
  return wn(Ka(t));
}
function qe(t, e, n) {
  let r;
  if (typeof e == "string")
    try {
      r = wn(e);
    } catch (s) {
      throw new Error(`${t} must be valid hex string, got "${e}". Cause: ${s}`);
    }
  else if (sn(e))
    r = Uint8Array.from(e);
  else
    throw new Error(`${t} must be hex string or Uint8Array`);
  const i = r.length;
  if (typeof n == "number" && i !== n)
    throw new Error(`${t} expected ${n} bytes, got ${i}`);
  return r;
}
function an(...t) {
  let e = 0;
  for (let r = 0; r < t.length; r++) {
    const i = t[r];
    Vn(i), e += i.length;
  }
  const n = new Uint8Array(e);
  for (let r = 0, i = 0; r < t.length; r++) {
    const s = t[r];
    n.set(s, i), i += s.length;
  }
  return n;
}
function vd(t, e) {
  if (t.length !== e.length)
    return !1;
  let n = 0;
  for (let r = 0; r < t.length; r++)
    n |= t[r] ^ e[r];
  return n === 0;
}
function wd(t) {
  if (typeof t != "string")
    throw new Error(`utf8ToBytes expected string, got ${typeof t}`);
  return new Uint8Array(new TextEncoder().encode(t));
}
const di = (t) => typeof t == "bigint" && os <= t;
function Sr(t, e, n) {
  return di(t) && di(e) && di(n) && e <= t && t < n;
}
function ft(t, e, n, r) {
  if (!Sr(e, n, r))
    throw new Error(`expected valid ${t}: ${n} <= n < ${r}, got ${typeof e} ${e}`);
}
function xd(t) {
  let e;
  for (e = 0; t > os; t >>= Mr, e += 1)
    ;
  return e;
}
function Pd(t, e) {
  return t >> BigInt(e) & Mr;
}
function Od(t, e, n) {
  return t | (n ? Mr : os) << BigInt(e);
}
const fs = (t) => (gd << BigInt(t - 1)) - Mr, hi = (t) => new Uint8Array(t), Ws = (t) => Uint8Array.from(t);
function Ja(t, e, n) {
  if (typeof t != "number" || t < 2)
    throw new Error("hashLen must be a number");
  if (typeof e != "number" || e < 2)
    throw new Error("qByteLen must be a number");
  if (typeof n != "function")
    throw new Error("hmacFn must be a function");
  let r = hi(t), i = hi(t), s = 0;
  const o = () => {
    r.fill(1), i.fill(0), s = 0;
  }, f = (...m) => n(i, r, ...m), u = (m = hi()) => {
    i = f(Ws([0]), m), r = f(), m.length !== 0 && (i = f(Ws([1]), m), r = f());
  }, h = () => {
    if (s++ >= 1e3)
      throw new Error("drbg: tried 1000 values");
    let m = 0;
    const O = [];
    for (; m < e; ) {
      r = f();
      const L = r.slice();
      O.push(L), m += r.length;
    }
    return an(...O);
  };
  return (m, O) => {
    o(), u(m);
    let L;
    for (; !(L = O(h())); )
      u();
    return o(), L;
  };
}
const Nd = {
  bigint: (t) => typeof t == "bigint",
  function: (t) => typeof t == "function",
  boolean: (t) => typeof t == "boolean",
  string: (t) => typeof t == "string",
  stringOrUint8Array: (t) => typeof t == "string" || sn(t),
  isSafeInteger: (t) => Number.isSafeInteger(t),
  array: (t) => Array.isArray(t),
  field: (t, e) => e.Fp.isValid(t),
  hash: (t) => typeof t == "function" && Number.isSafeInteger(t.outputLen)
};
function On(t, e, n = {}) {
  const r = (i, s, o) => {
    const f = Nd[s];
    if (typeof f != "function")
      throw new Error(`Invalid validator "${s}", expected function`);
    const u = t[i];
    if (!(o && u === void 0) && !f(u, t))
      throw new Error(`Invalid param ${String(i)}=${u} (${typeof u}), expected ${s}`);
  };
  for (const [i, s] of Object.entries(e))
    r(i, s, !1);
  for (const [i, s] of Object.entries(n))
    r(i, s, !0);
  return t;
}
const Ld = () => {
  throw new Error("not implemented");
};
function Xn(t) {
  const e = /* @__PURE__ */ new WeakMap();
  return (n, ...r) => {
    const i = e.get(n);
    if (i !== void 0)
      return i;
    const s = t(n, ...r);
    return e.set(n, s), s;
  };
}
const Ed = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  aInRange: ft,
  abool: St,
  abytes: Vn,
  bitGet: Pd,
  bitLen: xd,
  bitMask: fs,
  bitSet: Od,
  bytesToHex: on,
  bytesToNumberBE: rn,
  bytesToNumberLE: gn,
  concatBytes: an,
  createHmacDrbg: Ja,
  ensureBytes: qe,
  equalBytes: vd,
  hexToBytes: wn,
  hexToNumber: as,
  inRange: Sr,
  isBytes: sn,
  memoized: Xn,
  notImplemented: Ld,
  numberToBytesBE: xn,
  numberToBytesLE: Un,
  numberToHexUnpadded: Ka,
  numberToVarBytesBE: yd,
  utf8ToBytes: wd,
  validateObject: On
}, Symbol.toStringTag, { value: "Module" }));
const Ke = BigInt(0), me = BigInt(1), en = BigInt(2), kd = BigInt(3), Ai = BigInt(4), Ks = BigInt(5), Js = BigInt(8);
BigInt(9);
BigInt(16);
function ue(t, e) {
  const n = t % e;
  return n >= Ke ? n : e + n;
}
function Td(t, e, n) {
  if (n <= Ke || e < Ke)
    throw new Error("Expected power/modulo > 0");
  if (n === me)
    return Ke;
  let r = me;
  for (; e > Ke; )
    e & me && (r = r * t % n), t = t * t % n, e >>= me;
  return r;
}
function xe(t, e, n) {
  let r = t;
  for (; e-- > Ke; )
    r *= r, r %= n;
  return r;
}
function ji(t, e) {
  if (t === Ke || e <= Ke)
    throw new Error(`invert: expected positive integers, got n=${t} mod=${e}`);
  let n = ue(t, e), r = e, i = Ke, s = me;
  for (; n !== Ke; ) {
    const f = r / n, u = r % n, h = i - s * f;
    r = n, n = u, i = s, s = h;
  }
  if (r !== me)
    throw new Error("invert: does not exist");
  return ue(i, e);
}
function Md(t) {
  const e = (t - me) / en;
  let n, r, i;
  for (n = t - me, r = 0; n % en === Ke; n /= en, r++)
    ;
  for (i = en; i < t && Td(i, e, t) !== t - me; i++)
    ;
  if (r === 1) {
    const o = (t + me) / Ai;
    return function(u, h) {
      const p = u.pow(h, o);
      if (!u.eql(u.sqr(p), h))
        throw new Error("Cannot find square root");
      return p;
    };
  }
  const s = (n + me) / en;
  return function(f, u) {
    if (f.pow(u, e) === f.neg(f.ONE))
      throw new Error("Cannot find square root");
    let h = r, p = f.pow(f.mul(f.ONE, i), n), m = f.pow(u, s), O = f.pow(u, n);
    for (; !f.eql(O, f.ONE); ) {
      if (f.eql(O, f.ZERO))
        return f.ZERO;
      let L = 1;
      for (let x = f.sqr(O); L < h && !f.eql(x, f.ONE); L++)
        x = f.sqr(x);
      const N = f.pow(p, me << BigInt(h - L - 1));
      p = f.sqr(N), m = f.mul(m, N), O = f.mul(O, p), h = L;
    }
    return m;
  };
}
function Sd(t) {
  if (t % Ai === kd) {
    const e = (t + me) / Ai;
    return function(r, i) {
      const s = r.pow(i, e);
      if (!r.eql(r.sqr(s), i))
        throw new Error("Cannot find square root");
      return s;
    };
  }
  if (t % Js === Ks) {
    const e = (t - Ks) / Js;
    return function(r, i) {
      const s = r.mul(i, en), o = r.pow(s, e), f = r.mul(i, o), u = r.mul(r.mul(f, en), o), h = r.mul(f, r.sub(u, r.ONE));
      if (!r.eql(r.sqr(h), i))
        throw new Error("Cannot find square root");
      return h;
    };
  }
  return Md(t);
}
const zd = (t, e) => (ue(t, e) & me) === me, Ad = [
  "create",
  "isValid",
  "is0",
  "neg",
  "inv",
  "sqrt",
  "sqr",
  "eql",
  "add",
  "sub",
  "mul",
  "pow",
  "div",
  "addN",
  "subN",
  "mulN",
  "sqrN"
];
function jd(t) {
  const e = {
    ORDER: "bigint",
    MASK: "bigint",
    BYTES: "isSafeInteger",
    BITS: "isSafeInteger"
  }, n = Ad.reduce((r, i) => (r[i] = "function", r), e);
  return On(t, n);
}
function Hd(t, e, n) {
  if (n < Ke)
    throw new Error("Expected power > 0");
  if (n === Ke)
    return t.ONE;
  if (n === me)
    return e;
  let r = t.ONE, i = e;
  for (; n > Ke; )
    n & me && (r = t.mul(r, i)), i = t.sqr(i), n >>= me;
  return r;
}
function Rd(t, e) {
  const n = new Array(e.length), r = e.reduce((s, o, f) => t.is0(o) ? s : (n[f] = s, t.mul(s, o)), t.ONE), i = t.inv(r);
  return e.reduceRight((s, o, f) => t.is0(o) ? s : (n[f] = t.mul(s, n[f]), t.mul(s, o)), i), n;
}
function Qa(t, e) {
  const n = e !== void 0 ? e : t.toString(2).length, r = Math.ceil(n / 8);
  return { nBitLength: n, nByteLength: r };
}
function _a(t, e, n = !1, r = {}) {
  if (t <= Ke)
    throw new Error(`Expected Field ORDER > 0, got ${t}`);
  const { nBitLength: i, nByteLength: s } = Qa(t, e);
  if (s > 2048)
    throw new Error("Field lengths over 2048 bytes are not supported");
  const o = Sd(t), f = Object.freeze({
    ORDER: t,
    BITS: i,
    BYTES: s,
    MASK: fs(i),
    ZERO: Ke,
    ONE: me,
    create: (u) => ue(u, t),
    isValid: (u) => {
      if (typeof u != "bigint")
        throw new Error(`Invalid field element: expected bigint, got ${typeof u}`);
      return Ke <= u && u < t;
    },
    is0: (u) => u === Ke,
    isOdd: (u) => (u & me) === me,
    neg: (u) => ue(-u, t),
    eql: (u, h) => u === h,
    sqr: (u) => ue(u * u, t),
    add: (u, h) => ue(u + h, t),
    sub: (u, h) => ue(u - h, t),
    mul: (u, h) => ue(u * h, t),
    pow: (u, h) => Hd(f, u, h),
    div: (u, h) => ue(u * ji(h, t), t),
    // Same as above, but doesn't normalize
    sqrN: (u) => u * u,
    addN: (u, h) => u + h,
    subN: (u, h) => u - h,
    mulN: (u, h) => u * h,
    inv: (u) => ji(u, t),
    sqrt: r.sqrt || ((u) => o(f, u)),
    invertBatch: (u) => Rd(f, u),
    // TODO: do we really need constant cmov?
    // We don't have const-time bigints anyway, so probably will be not very useful
    cmov: (u, h, p) => p ? h : u,
    toBytes: (u) => n ? Un(u, s) : xn(u, s),
    fromBytes: (u) => {
      if (u.length !== s)
        throw new Error(`Fp.fromBytes: expected ${s}, got ${u.length}`);
      return n ? gn(u) : rn(u);
    }
  });
  return Object.freeze(f);
}
function $a(t) {
  if (typeof t != "bigint")
    throw new Error("field order must be bigint");
  const e = t.toString(2).length;
  return Math.ceil(e / 8);
}
function ef(t) {
  const e = $a(t);
  return e + Math.ceil(e / 2);
}
function Id(t, e, n = !1) {
  const r = t.length, i = $a(e), s = ef(e);
  if (r < 16 || r < s || r > 1024)
    throw new Error(`expected ${s}-1024 bytes of input, got ${r}`);
  const o = n ? rn(t) : gn(t), f = ue(o, e - me) + me;
  return n ? Un(f, i) : xn(f, i);
}
const Ud = BigInt(0), pi = BigInt(1), mi = /* @__PURE__ */ new WeakMap(), Qs = /* @__PURE__ */ new WeakMap();
function tf(t, e) {
  const n = (s, o) => {
    const f = o.negate();
    return s ? f : o;
  }, r = (s) => {
    if (!Number.isSafeInteger(s) || s <= 0 || s > e)
      throw new Error(`Wrong window size=${s}, should be [1..${e}]`);
  }, i = (s) => {
    r(s);
    const o = Math.ceil(e / s) + 1, f = 2 ** (s - 1);
    return { windows: o, windowSize: f };
  };
  return {
    constTimeNegate: n,
    // non-const time multiplication ladder
    unsafeLadder(s, o) {
      let f = t.ZERO, u = s;
      for (; o > Ud; )
        o & pi && (f = f.add(u)), u = u.double(), o >>= pi;
      return f;
    },
    /**
     * Creates a wNAF precomputation window. Used for caching.
     * Default window size is set by `utils.precompute()` and is equal to 8.
     * Number of precomputed points depends on the curve size:
     * 2^(𝑊−1) * (Math.ceil(𝑛 / 𝑊) + 1), where:
     * - 𝑊 is the window size
     * - 𝑛 is the bitlength of the curve order.
     * For a 256-bit curve and window size 8, the number of precomputed points is 128 * 33 = 4224.
     * @returns precomputed point tables flattened to a single array
     */
    precomputeWindow(s, o) {
      const { windows: f, windowSize: u } = i(o), h = [];
      let p = s, m = p;
      for (let O = 0; O < f; O++) {
        m = p, h.push(m);
        for (let L = 1; L < u; L++)
          m = m.add(p), h.push(m);
        p = m.double();
      }
      return h;
    },
    /**
     * Implements ec multiplication using precomputed tables and w-ary non-adjacent form.
     * @param W window size
     * @param precomputes precomputed tables
     * @param n scalar (we don't check here, but should be less than curve order)
     * @returns real and fake (for const-time) points
     */
    wNAF(s, o, f) {
      const { windows: u, windowSize: h } = i(s);
      let p = t.ZERO, m = t.BASE;
      const O = BigInt(2 ** s - 1), L = 2 ** s, N = BigInt(s);
      for (let x = 0; x < u; x++) {
        const E = x * h;
        let T = Number(f & O);
        f >>= N, T > h && (T -= L, f += pi);
        const M = E, S = E + Math.abs(T) - 1, A = x % 2 !== 0, j = T < 0;
        T === 0 ? m = m.add(n(A, o[M])) : p = p.add(n(j, o[S]));
      }
      return { p, f: m };
    },
    wNAFCached(s, o, f) {
      const u = Qs.get(s) || 1;
      let h = mi.get(s);
      return h || (h = this.precomputeWindow(s, u), u !== 1 && mi.set(s, f(h))), this.wNAF(u, h, o);
    },
    // We calculate precomputes for elliptic curve point multiplication
    // using windowed method. This specifies window size and
    // stores precomputed values. Usually only base point would be precomputed.
    setWindowSize(s, o) {
      r(o), Qs.set(s, o), mi.delete(s);
    }
  };
}
function cs(t) {
  return jd(t.Fp), On(t, {
    n: "bigint",
    h: "bigint",
    Gx: "field",
    Gy: "field"
  }, {
    nBitLength: "isSafeInteger",
    nByteLength: "isSafeInteger"
  }), Object.freeze({
    ...Qa(t.n, t.nBitLength),
    ...t,
    p: t.Fp.ORDER
  });
}
function _s(t) {
  t.lowS !== void 0 && St("lowS", t.lowS), t.prehash !== void 0 && St("prehash", t.prehash);
}
function Xd(t) {
  const e = cs(t);
  On(e, {
    a: "field",
    b: "field"
  }, {
    allowedPrivateKeyLengths: "array",
    wrapPrivateKey: "boolean",
    isTorsionFree: "function",
    clearCofactor: "function",
    allowInfinityPoint: "boolean",
    fromBytes: "function",
    toBytes: "function"
  });
  const { endo: n, Fp: r, a: i } = e;
  if (n) {
    if (!r.eql(i, r.ZERO))
      throw new Error("Endomorphism can only be defined for Koblitz curves that have a=0");
    if (typeof n != "object" || typeof n.beta != "bigint" || typeof n.splitScalar != "function")
      throw new Error("Expected endomorphism with beta: bigint and splitScalar: function");
  }
  return Object.freeze({ ...e });
}
const { bytesToNumberBE: Dd, hexToBytes: Bd } = Ed, tn = {
  // asn.1 DER encoding utils
  Err: class extends Error {
    constructor(e = "") {
      super(e);
    }
  },
  _parseInt(t) {
    const { Err: e } = tn;
    if (t.length < 2 || t[0] !== 2)
      throw new e("Invalid signature integer tag");
    const n = t[1], r = t.subarray(2, n + 2);
    if (!n || r.length !== n)
      throw new e("Invalid signature integer: wrong length");
    if (r[0] & 128)
      throw new e("Invalid signature integer: negative");
    if (r[0] === 0 && !(r[1] & 128))
      throw new e("Invalid signature integer: unnecessary leading zero");
    return { d: Dd(r), l: t.subarray(n + 2) };
  },
  toSig(t) {
    const { Err: e } = tn, n = typeof t == "string" ? Bd(t) : t;
    Vn(n);
    let r = n.length;
    if (r < 2 || n[0] != 48)
      throw new e("Invalid signature tag");
    if (n[1] !== r - 2)
      throw new e("Invalid signature: incorrect length");
    const { d: i, l: s } = tn._parseInt(n.subarray(2)), { d: o, l: f } = tn._parseInt(s);
    if (f.length)
      throw new e("Invalid signature: left bytes after parsing");
    return { r: i, s: o };
  },
  hexFromSig(t) {
    const e = (h) => Number.parseInt(h[0], 16) & 8 ? "00" + h : h, n = (h) => {
      const p = h.toString(16);
      return p.length & 1 ? `0${p}` : p;
    }, r = e(n(t.s)), i = e(n(t.r)), s = r.length / 2, o = i.length / 2, f = n(s), u = n(o);
    return `30${n(o + s + 4)}02${u}${i}02${f}${r}`;
  }
}, Gt = BigInt(0), We = BigInt(1), lg = BigInt(2), $s = BigInt(3), dg = BigInt(4);
function Fd(t) {
  const e = Xd(t), { Fp: n } = e, r = e.toBytes || ((N, x, E) => {
    const T = x.toAffine();
    return an(Uint8Array.from([4]), n.toBytes(T.x), n.toBytes(T.y));
  }), i = e.fromBytes || ((N) => {
    const x = N.subarray(1), E = n.fromBytes(x.subarray(0, n.BYTES)), T = n.fromBytes(x.subarray(n.BYTES, 2 * n.BYTES));
    return { x: E, y: T };
  });
  function s(N) {
    const { a: x, b: E } = e, T = n.sqr(N), M = n.mul(T, N);
    return n.add(n.add(M, n.mul(N, x)), E);
  }
  if (!n.eql(n.sqr(e.Gy), s(e.Gx)))
    throw new Error("bad generator point: equation left != right");
  function o(N) {
    return Sr(N, We, e.n);
  }
  function f(N) {
    const { allowedPrivateKeyLengths: x, nByteLength: E, wrapPrivateKey: T, n: M } = e;
    if (x && typeof N != "bigint") {
      if (sn(N) && (N = on(N)), typeof N != "string" || !x.includes(N.length))
        throw new Error("Invalid key");
      N = N.padStart(E * 2, "0");
    }
    let S;
    try {
      S = typeof N == "bigint" ? N : rn(qe("private key", N, E));
    } catch {
      throw new Error(`private key must be ${E} bytes, hex or bigint, not ${typeof N}`);
    }
    return T && (S = ue(S, M)), ft("private key", S, We, M), S;
  }
  function u(N) {
    if (!(N instanceof m))
      throw new Error("ProjectivePoint expected");
  }
  const h = Xn((N, x) => {
    const { px: E, py: T, pz: M } = N;
    if (n.eql(M, n.ONE))
      return { x: E, y: T };
    const S = N.is0();
    x == null && (x = S ? n.ONE : n.inv(M));
    const A = n.mul(E, x), j = n.mul(T, x), z = n.mul(M, x);
    if (S)
      return { x: n.ZERO, y: n.ZERO };
    if (!n.eql(z, n.ONE))
      throw new Error("invZ was invalid");
    return { x: A, y: j };
  }), p = Xn((N) => {
    if (N.is0()) {
      if (e.allowInfinityPoint && !n.is0(N.py))
        return;
      throw new Error("bad point: ZERO");
    }
    const { x, y: E } = N.toAffine();
    if (!n.isValid(x) || !n.isValid(E))
      throw new Error("bad point: x or y not FE");
    const T = n.sqr(E), M = s(x);
    if (!n.eql(T, M))
      throw new Error("bad point: equation left != right");
    if (!N.isTorsionFree())
      throw new Error("bad point: not in prime-order subgroup");
    return !0;
  });
  class m {
    constructor(x, E, T) {
      if (this.px = x, this.py = E, this.pz = T, x == null || !n.isValid(x))
        throw new Error("x required");
      if (E == null || !n.isValid(E))
        throw new Error("y required");
      if (T == null || !n.isValid(T))
        throw new Error("z required");
      Object.freeze(this);
    }
    // Does not validate if the point is on-curve.
    // Use fromHex instead, or call assertValidity() later.
    static fromAffine(x) {
      const { x: E, y: T } = x || {};
      if (!x || !n.isValid(E) || !n.isValid(T))
        throw new Error("invalid affine point");
      if (x instanceof m)
        throw new Error("projective point not allowed");
      const M = (S) => n.eql(S, n.ZERO);
      return M(E) && M(T) ? m.ZERO : new m(E, T, n.ONE);
    }
    get x() {
      return this.toAffine().x;
    }
    get y() {
      return this.toAffine().y;
    }
    /**
     * Takes a bunch of Projective Points but executes only one
     * inversion on all of them. Inversion is very slow operation,
     * so this improves performance massively.
     * Optimization: converts a list of projective points to a list of identical points with Z=1.
     */
    static normalizeZ(x) {
      const E = n.invertBatch(x.map((T) => T.pz));
      return x.map((T, M) => T.toAffine(E[M])).map(m.fromAffine);
    }
    /**
     * Converts hash string or Uint8Array to Point.
     * @param hex short/long ECDSA hex
     */
    static fromHex(x) {
      const E = m.fromAffine(i(qe("pointHex", x)));
      return E.assertValidity(), E;
    }
    // Multiplies generator point by privateKey.
    static fromPrivateKey(x) {
      return m.BASE.multiply(f(x));
    }
    // "Private method", don't use it directly
    _setWindowSize(x) {
      L.setWindowSize(this, x);
    }
    // A point on curve is valid if it conforms to equation.
    assertValidity() {
      p(this);
    }
    hasEvenY() {
      const { y: x } = this.toAffine();
      if (n.isOdd)
        return !n.isOdd(x);
      throw new Error("Field doesn't support isOdd");
    }
    /**
     * Compare one point to another.
     */
    equals(x) {
      u(x);
      const { px: E, py: T, pz: M } = this, { px: S, py: A, pz: j } = x, z = n.eql(n.mul(E, j), n.mul(S, M)), U = n.eql(n.mul(T, j), n.mul(A, M));
      return z && U;
    }
    /**
     * Flips point to one corresponding to (x, -y) in Affine coordinates.
     */
    negate() {
      return new m(this.px, n.neg(this.py), this.pz);
    }
    // Renes-Costello-Batina exception-free doubling formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 3
    // Cost: 8M + 3S + 3*a + 2*b3 + 15add.
    double() {
      const { a: x, b: E } = e, T = n.mul(E, $s), { px: M, py: S, pz: A } = this;
      let j = n.ZERO, z = n.ZERO, U = n.ZERO, H = n.mul(M, M), G = n.mul(S, S), V = n.mul(A, A), I = n.mul(M, S);
      return I = n.add(I, I), U = n.mul(M, A), U = n.add(U, U), j = n.mul(x, U), z = n.mul(T, V), z = n.add(j, z), j = n.sub(G, z), z = n.add(G, z), z = n.mul(j, z), j = n.mul(I, j), U = n.mul(T, U), V = n.mul(x, V), I = n.sub(H, V), I = n.mul(x, I), I = n.add(I, U), U = n.add(H, H), H = n.add(U, H), H = n.add(H, V), H = n.mul(H, I), z = n.add(z, H), V = n.mul(S, A), V = n.add(V, V), H = n.mul(V, I), j = n.sub(j, H), U = n.mul(V, G), U = n.add(U, U), U = n.add(U, U), new m(j, z, U);
    }
    // Renes-Costello-Batina exception-free addition formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 1
    // Cost: 12M + 0S + 3*a + 3*b3 + 23add.
    add(x) {
      u(x);
      const { px: E, py: T, pz: M } = this, { px: S, py: A, pz: j } = x;
      let z = n.ZERO, U = n.ZERO, H = n.ZERO;
      const G = e.a, V = n.mul(e.b, $s);
      let I = n.mul(E, S), B = n.mul(T, A), P = n.mul(M, j), a = n.add(E, T), c = n.add(S, A);
      a = n.mul(a, c), c = n.add(I, B), a = n.sub(a, c), c = n.add(E, M);
      let d = n.add(S, j);
      return c = n.mul(c, d), d = n.add(I, P), c = n.sub(c, d), d = n.add(T, M), z = n.add(A, j), d = n.mul(d, z), z = n.add(B, P), d = n.sub(d, z), H = n.mul(G, c), z = n.mul(V, P), H = n.add(z, H), z = n.sub(B, H), H = n.add(B, H), U = n.mul(z, H), B = n.add(I, I), B = n.add(B, I), P = n.mul(G, P), c = n.mul(V, c), B = n.add(B, P), P = n.sub(I, P), P = n.mul(G, P), c = n.add(c, P), I = n.mul(B, c), U = n.add(U, I), I = n.mul(d, c), z = n.mul(a, z), z = n.sub(z, I), I = n.mul(a, B), H = n.mul(d, H), H = n.add(H, I), new m(z, U, H);
    }
    subtract(x) {
      return this.add(x.negate());
    }
    is0() {
      return this.equals(m.ZERO);
    }
    wNAF(x) {
      return L.wNAFCached(this, x, m.normalizeZ);
    }
    /**
     * Non-constant-time multiplication. Uses double-and-add algorithm.
     * It's faster, but should only be used when you don't care about
     * an exposed private key e.g. sig verification, which works over *public* keys.
     */
    multiplyUnsafe(x) {
      ft("scalar", x, Gt, e.n);
      const E = m.ZERO;
      if (x === Gt)
        return E;
      if (x === We)
        return this;
      const { endo: T } = e;
      if (!T)
        return L.unsafeLadder(this, x);
      let { k1neg: M, k1: S, k2neg: A, k2: j } = T.splitScalar(x), z = E, U = E, H = this;
      for (; S > Gt || j > Gt; )
        S & We && (z = z.add(H)), j & We && (U = U.add(H)), H = H.double(), S >>= We, j >>= We;
      return M && (z = z.negate()), A && (U = U.negate()), U = new m(n.mul(U.px, T.beta), U.py, U.pz), z.add(U);
    }
    /**
     * Constant time multiplication.
     * Uses wNAF method. Windowed method may be 10% faster,
     * but takes 2x longer to generate and consumes 2x memory.
     * Uses precomputes when available.
     * Uses endomorphism for Koblitz curves.
     * @param scalar by which the point would be multiplied
     * @returns New point
     */
    multiply(x) {
      const { endo: E, n: T } = e;
      ft("scalar", x, We, T);
      let M, S;
      if (E) {
        const { k1neg: A, k1: j, k2neg: z, k2: U } = E.splitScalar(x);
        let { p: H, f: G } = this.wNAF(j), { p: V, f: I } = this.wNAF(U);
        H = L.constTimeNegate(A, H), V = L.constTimeNegate(z, V), V = new m(n.mul(V.px, E.beta), V.py, V.pz), M = H.add(V), S = G.add(I);
      } else {
        const { p: A, f: j } = this.wNAF(x);
        M = A, S = j;
      }
      return m.normalizeZ([M, S])[0];
    }
    /**
     * Efficiently calculate `aP + bQ`. Unsafe, can expose private key, if used incorrectly.
     * Not using Strauss-Shamir trick: precomputation tables are faster.
     * The trick could be useful if both P and Q are not G (not in our case).
     * @returns non-zero affine point
     */
    multiplyAndAddUnsafe(x, E, T) {
      const M = m.BASE, S = (j, z) => z === Gt || z === We || !j.equals(M) ? j.multiplyUnsafe(z) : j.multiply(z), A = S(this, E).add(S(x, T));
      return A.is0() ? void 0 : A;
    }
    // Converts Projective point to affine (x, y) coordinates.
    // Can accept precomputed Z^-1 - for example, from invertBatch.
    // (x, y, z) ∋ (x=x/z, y=y/z)
    toAffine(x) {
      return h(this, x);
    }
    isTorsionFree() {
      const { h: x, isTorsionFree: E } = e;
      if (x === We)
        return !0;
      if (E)
        return E(m, this);
      throw new Error("isTorsionFree() has not been declared for the elliptic curve");
    }
    clearCofactor() {
      const { h: x, clearCofactor: E } = e;
      return x === We ? this : E ? E(m, this) : this.multiplyUnsafe(e.h);
    }
    toRawBytes(x = !0) {
      return St("isCompressed", x), this.assertValidity(), r(m, this, x);
    }
    toHex(x = !0) {
      return St("isCompressed", x), on(this.toRawBytes(x));
    }
  }
  m.BASE = new m(e.Gx, e.Gy, n.ONE), m.ZERO = new m(n.ZERO, n.ONE, n.ZERO);
  const O = e.nBitLength, L = tf(m, e.endo ? Math.ceil(O / 2) : O);
  return {
    CURVE: e,
    ProjectivePoint: m,
    normPrivateKeyToScalar: f,
    weierstrassEquation: s,
    isWithinCurveOrder: o
  };
}
function Cd(t) {
  const e = cs(t);
  return On(e, {
    hash: "hash",
    hmac: "function",
    randomBytes: "function"
  }, {
    bits2int: "function",
    bits2int_modN: "function",
    lowS: "boolean"
  }), Object.freeze({ lowS: !0, ...e });
}
function Zd(t) {
  const e = Cd(t), { Fp: n, n: r } = e, i = n.BYTES + 1, s = 2 * n.BYTES + 1;
  function o(a) {
    return ue(a, r);
  }
  function f(a) {
    return ji(a, r);
  }
  const { ProjectivePoint: u, normPrivateKeyToScalar: h, weierstrassEquation: p, isWithinCurveOrder: m } = Fd({
    ...e,
    toBytes(a, c, d) {
      const g = c.toAffine(), b = n.toBytes(g.x), w = an;
      return St("isCompressed", d), d ? w(Uint8Array.from([c.hasEvenY() ? 2 : 3]), b) : w(Uint8Array.from([4]), b, n.toBytes(g.y));
    },
    fromBytes(a) {
      const c = a.length, d = a[0], g = a.subarray(1);
      if (c === i && (d === 2 || d === 3)) {
        const b = rn(g);
        if (!Sr(b, We, n.ORDER))
          throw new Error("Point is not on curve");
        const w = p(b);
        let k;
        try {
          k = n.sqrt(w);
        } catch (v) {
          const X = v instanceof Error ? ": " + v.message : "";
          throw new Error("Point is not on curve" + X);
        }
        const y = (k & We) === We;
        return (d & 1) === 1 !== y && (k = n.neg(k)), { x: b, y: k };
      } else if (c === s && d === 4) {
        const b = n.fromBytes(g.subarray(0, n.BYTES)), w = n.fromBytes(g.subarray(n.BYTES, 2 * n.BYTES));
        return { x: b, y: w };
      } else
        throw new Error(`Point of length ${c} was invalid. Expected ${i} compressed bytes or ${s} uncompressed bytes`);
    }
  }), O = (a) => on(xn(a, e.nByteLength));
  function L(a) {
    const c = r >> We;
    return a > c;
  }
  function N(a) {
    return L(a) ? o(-a) : a;
  }
  const x = (a, c, d) => rn(a.slice(c, d));
  class E {
    constructor(c, d, g) {
      this.r = c, this.s = d, this.recovery = g, this.assertValidity();
    }
    // pair (bytes of r, bytes of s)
    static fromCompact(c) {
      const d = e.nByteLength;
      return c = qe("compactSignature", c, d * 2), new E(x(c, 0, d), x(c, d, 2 * d));
    }
    // DER encoded ECDSA signature
    // https://bitcoin.stackexchange.com/questions/57644/what-are-the-parts-of-a-bitcoin-transaction-input-script
    static fromDER(c) {
      const { r: d, s: g } = tn.toSig(qe("DER", c));
      return new E(d, g);
    }
    assertValidity() {
      ft("r", this.r, We, r), ft("s", this.s, We, r);
    }
    addRecoveryBit(c) {
      return new E(this.r, this.s, c);
    }
    recoverPublicKey(c) {
      const { r: d, s: g, recovery: b } = this, w = z(qe("msgHash", c));
      if (b == null || ![0, 1, 2, 3].includes(b))
        throw new Error("recovery id invalid");
      const k = b === 2 || b === 3 ? d + e.n : d;
      if (k >= n.ORDER)
        throw new Error("recovery id 2 or 3 invalid");
      const y = b & 1 ? "03" : "02", l = u.fromHex(y + O(k)), v = f(k), X = o(-w * v), F = o(g * v), C = u.BASE.multiplyAndAddUnsafe(l, X, F);
      if (!C)
        throw new Error("point at infinify");
      return C.assertValidity(), C;
    }
    // Signatures should be low-s, to prevent malleability.
    hasHighS() {
      return L(this.s);
    }
    normalizeS() {
      return this.hasHighS() ? new E(this.r, o(-this.s), this.recovery) : this;
    }
    // DER-encoded
    toDERRawBytes() {
      return wn(this.toDERHex());
    }
    toDERHex() {
      return tn.hexFromSig({ r: this.r, s: this.s });
    }
    // padded bytes of r, then padded bytes of s
    toCompactRawBytes() {
      return wn(this.toCompactHex());
    }
    toCompactHex() {
      return O(this.r) + O(this.s);
    }
  }
  const T = {
    isValidPrivateKey(a) {
      try {
        return h(a), !0;
      } catch {
        return !1;
      }
    },
    normPrivateKeyToScalar: h,
    /**
     * Produces cryptographically secure private key from random of size
     * (groupLen + ceil(groupLen / 2)) with modulo bias being negligible.
     */
    randomPrivateKey: () => {
      const a = ef(e.n);
      return Id(e.randomBytes(a), e.n);
    },
    /**
     * Creates precompute table for an arbitrary EC point. Makes point "cached".
     * Allows to massively speed-up `point.multiply(scalar)`.
     * @returns cached point
     * @example
     * const fast = utils.precompute(8, ProjectivePoint.fromHex(someonesPubKey));
     * fast.multiply(privKey); // much faster ECDH now
     */
    precompute(a = 8, c = u.BASE) {
      return c._setWindowSize(a), c.multiply(BigInt(3)), c;
    }
  };
  function M(a, c = !0) {
    return u.fromPrivateKey(a).toRawBytes(c);
  }
  function S(a) {
    const c = sn(a), d = typeof a == "string", g = (c || d) && a.length;
    return c ? g === i || g === s : d ? g === 2 * i || g === 2 * s : a instanceof u;
  }
  function A(a, c, d = !0) {
    if (S(a))
      throw new Error("first arg must be private key");
    if (!S(c))
      throw new Error("second arg must be public key");
    return u.fromHex(c).multiply(h(a)).toRawBytes(d);
  }
  const j = e.bits2int || function(a) {
    const c = rn(a), d = a.length * 8 - e.nBitLength;
    return d > 0 ? c >> BigInt(d) : c;
  }, z = e.bits2int_modN || function(a) {
    return o(j(a));
  }, U = fs(e.nBitLength);
  function H(a) {
    return ft(`num < 2^${e.nBitLength}`, a, Gt, U), xn(a, e.nByteLength);
  }
  function G(a, c, d = V) {
    if (["recovered", "canonical"].some((Y) => Y in d))
      throw new Error("sign() legacy options not supported");
    const { hash: g, randomBytes: b } = e;
    let { lowS: w, prehash: k, extraEntropy: y } = d;
    w == null && (w = !0), a = qe("msgHash", a), _s(d), k && (a = qe("prehashed msgHash", g(a)));
    const l = z(a), v = h(c), X = [H(v), H(l)];
    if (y != null && y !== !1) {
      const Y = y === !0 ? b(n.BYTES) : y;
      X.push(qe("extraEntropy", Y));
    }
    const F = an(...X), C = l;
    function $(Y) {
      const K = j(Y);
      if (!m(K))
        return;
      const Ye = f(K), J = u.BASE.multiply(K).toAffine(), Q = o(J.x);
      if (Q === Gt)
        return;
      const tt = o(Ye * o(C + Q * v));
      if (tt === Gt)
        return;
      let se = (J.x === Q ? 0 : 2) | Number(J.y & We), ae = tt;
      return w && L(tt) && (ae = N(tt), se ^= 1), new E(Q, ae, se);
    }
    return { seed: F, k2sig: $ };
  }
  const V = { lowS: e.lowS, prehash: !1 }, I = { lowS: e.lowS, prehash: !1 };
  function B(a, c, d = V) {
    const { seed: g, k2sig: b } = G(a, c, d), w = e;
    return Ja(w.hash.outputLen, w.nByteLength, w.hmac)(g, b);
  }
  u.BASE._setWindowSize(8);
  function P(a, c, d, g = I) {
    var J;
    const b = a;
    if (c = qe("msgHash", c), d = qe("publicKey", d), "strict" in g)
      throw new Error("options.strict was renamed to lowS");
    _s(g);
    const { lowS: w, prehash: k } = g;
    let y, l;
    try {
      if (typeof b == "string" || sn(b))
        try {
          y = E.fromDER(b);
        } catch (Q) {
          if (!(Q instanceof tn.Err))
            throw Q;
          y = E.fromCompact(b);
        }
      else if (typeof b == "object" && typeof b.r == "bigint" && typeof b.s == "bigint") {
        const { r: Q, s: tt } = b;
        y = new E(Q, tt);
      } else
        throw new Error("PARSE");
      l = u.fromHex(d);
    } catch (Q) {
      if (Q.message === "PARSE")
        throw new Error("signature must be Signature instance, Uint8Array or hex string");
      return !1;
    }
    if (w && y.hasHighS())
      return !1;
    k && (c = e.hash(c));
    const { r: v, s: X } = y, F = z(c), C = f(X), $ = o(F * C), Y = o(v * C), K = (J = u.BASE.multiplyAndAddUnsafe(l, $, Y)) == null ? void 0 : J.toAffine();
    return K ? o(K.x) === v : !1;
  }
  return {
    CURVE: e,
    getPublicKey: M,
    getSharedSecret: A,
    sign: B,
    verify: P,
    ProjectivePoint: u,
    Signature: E,
    utils: T
  };
}
function Vd(t) {
  return {
    hash: t,
    hmac: (e, ...n) => Wa(t, e, cd(...n)),
    randomBytes: Ga
  };
}
function Gd(t, e) {
  const n = (r) => Zd({ ...t, ...Vd(r) });
  return Object.freeze({ ...n(e), create: n });
}
const nf = BigInt("0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f"), eo = BigInt("0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141"), qd = BigInt(1), Hi = BigInt(2), to = (t, e) => (t + e / Hi) / e;
function Yd(t) {
  const e = nf, n = BigInt(3), r = BigInt(6), i = BigInt(11), s = BigInt(22), o = BigInt(23), f = BigInt(44), u = BigInt(88), h = t * t * t % e, p = h * h * t % e, m = xe(p, n, e) * p % e, O = xe(m, n, e) * p % e, L = xe(O, Hi, e) * h % e, N = xe(L, i, e) * L % e, x = xe(N, s, e) * N % e, E = xe(x, f, e) * x % e, T = xe(E, u, e) * E % e, M = xe(T, f, e) * x % e, S = xe(M, n, e) * p % e, A = xe(S, o, e) * N % e, j = xe(A, r, e) * h % e, z = xe(j, Hi, e);
  if (!Ri.eql(Ri.sqr(z), t))
    throw new Error("Cannot find square root");
  return z;
}
const Ri = _a(nf, void 0, void 0, { sqrt: Yd }), Gn = Gd({
  a: BigInt(0),
  // equation params: a, b
  b: BigInt(7),
  // Seem to be rigid: bitcointalk.org/index.php?topic=289795.msg3183975#msg3183975
  Fp: Ri,
  // Field's prime: 2n**256n - 2n**32n - 2n**9n - 2n**8n - 2n**7n - 2n**6n - 2n**4n - 1n
  n: eo,
  // Curve order, total count of valid points in the field
  // Base point (x, y) aka generator point
  Gx: BigInt("55066263022277343669578718895168534326250603453777594175500187360389116729240"),
  Gy: BigInt("32670510020758816978083085130507043184471273380659243275938904335757337482424"),
  h: BigInt(1),
  // Cofactor
  lowS: !0,
  // Allow only low-S signatures by default in sign() and verify()
  /**
   * secp256k1 belongs to Koblitz curves: it has efficiently computable endomorphism.
   * Endomorphism uses 2x less RAM, speeds up precomputation by 2x and ECDH / key recovery by 20%.
   * For precomputed wNAF it trades off 1/2 init time & 1/3 ram for 20% perf hit.
   * Explanation: https://gist.github.com/paulmillr/eb670806793e84df628a7c434a873066
   */
  endo: {
    beta: BigInt("0x7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee"),
    splitScalar: (t) => {
      const e = eo, n = BigInt("0x3086d221a7d46bcde86c90e49284eb15"), r = -qd * BigInt("0xe4437ed6010e88286f547fa90abfe4c3"), i = BigInt("0x114ca50f7a8e2f3f657c1108d9d44cfd8"), s = n, o = BigInt("0x100000000000000000000000000000000"), f = to(s * t, e), u = to(-r * t, e);
      let h = ue(t - f * n - u * i, e), p = ue(-f * r - u * s, e);
      const m = h > o, O = p > o;
      if (m && (h = e - h), O && (p = e - p), h > o || p > o)
        throw new Error("splitScalar: Endomorphism failed, k=" + t);
      return { k1neg: m, k1: h, k2neg: O, k2: p };
    }
  }
}, md);
BigInt(0);
function Pn(t, e) {
  if (t.length !== 32)
    throw new Error("Expected valid 32-byte private key as a seed");
  if (!$e || !e && Je()) {
    const n = ju(t), r = n.slice(32);
    if (la(r))
      throw new Error("Invalid publicKey generated from WASM interface");
    return {
      publicKey: r,
      secretKey: n.slice(0, 32)
    };
  }
  return {
    publicKey: Gn.getPublicKey(t, !0),
    secretKey: t
  };
}
function rf(t, e) {
  return (n, { chainCode: r, isHard: i }) => {
    if (!i)
      throw new Error("A soft key was found in the path and is not supported");
    return t(e(n.secretKey.subarray(0, 32), r));
  };
}
const no = /* @__PURE__ */ rf(Pn, id), Wd = es(it("Ed25519HDKD"));
function Kd(t, e) {
  if (!Kt(e) || e.length !== 32)
    throw new Error("Invalid chainCode passed to derive");
  return _t(Qe(Wd, t, e));
}
function zr(t = 32) {
  return pa(new Uint8Array(t));
}
const hg = /* @__PURE__ */ Da(zr), Qn = /* @__PURE__ */ BigInt(2 ** 32 - 1), Ii = /* @__PURE__ */ BigInt(32);
function sf(t, e = !1) {
  return e ? { h: Number(t & Qn), l: Number(t >> Ii & Qn) } : { h: Number(t >> Ii & Qn) | 0, l: Number(t & Qn) | 0 };
}
function Jd(t, e = !1) {
  let n = new Uint32Array(t.length), r = new Uint32Array(t.length);
  for (let i = 0; i < t.length; i++) {
    const { h: s, l: o } = sf(t[i], e);
    [n[i], r[i]] = [s, o];
  }
  return [n, r];
}
const Qd = (t, e) => BigInt(t >>> 0) << Ii | BigInt(e >>> 0), _d = (t, e, n) => t >>> n, $d = (t, e, n) => t << 32 - n | e >>> n, eh = (t, e, n) => t >>> n | e << 32 - n, th = (t, e, n) => t << 32 - n | e >>> n, nh = (t, e, n) => t << 64 - n | e >>> n - 32, rh = (t, e, n) => t >>> n - 32 | e << 64 - n, ih = (t, e) => e, sh = (t, e) => t, oh = (t, e, n) => t << n | e >>> 32 - n, ah = (t, e, n) => e << n | t >>> 32 - n, fh = (t, e, n) => e << n - 32 | t >>> 64 - n, ch = (t, e, n) => t << n - 32 | e >>> 64 - n;
function uh(t, e, n, r) {
  const i = (e >>> 0) + (r >>> 0);
  return { h: t + n + (i / 2 ** 32 | 0) | 0, l: i | 0 };
}
const lh = (t, e, n) => (t >>> 0) + (e >>> 0) + (n >>> 0), dh = (t, e, n, r) => e + n + r + (t / 2 ** 32 | 0) | 0, hh = (t, e, n, r) => (t >>> 0) + (e >>> 0) + (n >>> 0) + (r >>> 0), ph = (t, e, n, r, i) => e + n + r + i + (t / 2 ** 32 | 0) | 0, mh = (t, e, n, r, i) => (t >>> 0) + (e >>> 0) + (n >>> 0) + (r >>> 0) + (i >>> 0), gh = (t, e, n, r, i, s) => e + n + r + i + s + (t / 2 ** 32 | 0) | 0, _ = {
  fromBig: sf,
  split: Jd,
  toBig: Qd,
  shrSH: _d,
  shrSL: $d,
  rotrSH: eh,
  rotrSL: th,
  rotrBH: nh,
  rotrBL: rh,
  rotr32H: ih,
  rotr32L: sh,
  rotlSH: oh,
  rotlSL: ah,
  rotlBH: fh,
  rotlBL: ch,
  add: uh,
  add3L: lh,
  add3H: dh,
  add4L: hh,
  add4H: ph,
  add5H: gh,
  add5L: mh
}, [bh, yh] = _.split([
  "0x428a2f98d728ae22",
  "0x7137449123ef65cd",
  "0xb5c0fbcfec4d3b2f",
  "0xe9b5dba58189dbbc",
  "0x3956c25bf348b538",
  "0x59f111f1b605d019",
  "0x923f82a4af194f9b",
  "0xab1c5ed5da6d8118",
  "0xd807aa98a3030242",
  "0x12835b0145706fbe",
  "0x243185be4ee4b28c",
  "0x550c7dc3d5ffb4e2",
  "0x72be5d74f27b896f",
  "0x80deb1fe3b1696b1",
  "0x9bdc06a725c71235",
  "0xc19bf174cf692694",
  "0xe49b69c19ef14ad2",
  "0xefbe4786384f25e3",
  "0x0fc19dc68b8cd5b5",
  "0x240ca1cc77ac9c65",
  "0x2de92c6f592b0275",
  "0x4a7484aa6ea6e483",
  "0x5cb0a9dcbd41fbd4",
  "0x76f988da831153b5",
  "0x983e5152ee66dfab",
  "0xa831c66d2db43210",
  "0xb00327c898fb213f",
  "0xbf597fc7beef0ee4",
  "0xc6e00bf33da88fc2",
  "0xd5a79147930aa725",
  "0x06ca6351e003826f",
  "0x142929670a0e6e70",
  "0x27b70a8546d22ffc",
  "0x2e1b21385c26c926",
  "0x4d2c6dfc5ac42aed",
  "0x53380d139d95b3df",
  "0x650a73548baf63de",
  "0x766a0abb3c77b2a8",
  "0x81c2c92e47edaee6",
  "0x92722c851482353b",
  "0xa2bfe8a14cf10364",
  "0xa81a664bbc423001",
  "0xc24b8b70d0f89791",
  "0xc76c51a30654be30",
  "0xd192e819d6ef5218",
  "0xd69906245565a910",
  "0xf40e35855771202a",
  "0x106aa07032bbd1b8",
  "0x19a4c116b8d2d0c8",
  "0x1e376c085141ab53",
  "0x2748774cdf8eeb99",
  "0x34b0bcb5e19b48a8",
  "0x391c0cb3c5c95a63",
  "0x4ed8aa4ae3418acb",
  "0x5b9cca4f7763e373",
  "0x682e6ff3d6b2b8a3",
  "0x748f82ee5defb2fc",
  "0x78a5636f43172f60",
  "0x84c87814a1f0ab72",
  "0x8cc702081a6439ec",
  "0x90befffa23631e28",
  "0xa4506cebde82bde9",
  "0xbef9a3f7b2c67915",
  "0xc67178f2e372532b",
  "0xca273eceea26619c",
  "0xd186b8c721c0c207",
  "0xeada7dd6cde0eb1e",
  "0xf57d4f7fee6ed178",
  "0x06f067aa72176fba",
  "0x0a637dc5a2c898a6",
  "0x113f9804bef90dae",
  "0x1b710b35131c471b",
  "0x28db77f523047d84",
  "0x32caab7b40c72493",
  "0x3c9ebe0a15c9bebc",
  "0x431d67c49c100d4c",
  "0x4cc5d4becb3e42b6",
  "0x597f299cfc657e2a",
  "0x5fcb6fab3ad6faec",
  "0x6c44198c4a475817"
].map((t) => BigInt(t))), Ut = /* @__PURE__ */ new Uint32Array(80), Xt = /* @__PURE__ */ new Uint32Array(80);
let vh = class extends qa {
  constructor() {
    super(128, 64, 16, !1), this.Ah = 1779033703, this.Al = -205731576, this.Bh = -1150833019, this.Bl = -2067093701, this.Ch = 1013904242, this.Cl = -23791573, this.Dh = -1521486534, this.Dl = 1595750129, this.Eh = 1359893119, this.El = -1377402159, this.Fh = -1694144372, this.Fl = 725511199, this.Gh = 528734635, this.Gl = -79577749, this.Hh = 1541459225, this.Hl = 327033209;
  }
  // prettier-ignore
  get() {
    const { Ah: e, Al: n, Bh: r, Bl: i, Ch: s, Cl: o, Dh: f, Dl: u, Eh: h, El: p, Fh: m, Fl: O, Gh: L, Gl: N, Hh: x, Hl: E } = this;
    return [e, n, r, i, s, o, f, u, h, p, m, O, L, N, x, E];
  }
  // prettier-ignore
  set(e, n, r, i, s, o, f, u, h, p, m, O, L, N, x, E) {
    this.Ah = e | 0, this.Al = n | 0, this.Bh = r | 0, this.Bl = i | 0, this.Ch = s | 0, this.Cl = o | 0, this.Dh = f | 0, this.Dl = u | 0, this.Eh = h | 0, this.El = p | 0, this.Fh = m | 0, this.Fl = O | 0, this.Gh = L | 0, this.Gl = N | 0, this.Hh = x | 0, this.Hl = E | 0;
  }
  process(e, n) {
    for (let S = 0; S < 16; S++, n += 4)
      Ut[S] = e.getUint32(n), Xt[S] = e.getUint32(n += 4);
    for (let S = 16; S < 80; S++) {
      const A = Ut[S - 15] | 0, j = Xt[S - 15] | 0, z = _.rotrSH(A, j, 1) ^ _.rotrSH(A, j, 8) ^ _.shrSH(A, j, 7), U = _.rotrSL(A, j, 1) ^ _.rotrSL(A, j, 8) ^ _.shrSL(A, j, 7), H = Ut[S - 2] | 0, G = Xt[S - 2] | 0, V = _.rotrSH(H, G, 19) ^ _.rotrBH(H, G, 61) ^ _.shrSH(H, G, 6), I = _.rotrSL(H, G, 19) ^ _.rotrBL(H, G, 61) ^ _.shrSL(H, G, 6), B = _.add4L(U, I, Xt[S - 7], Xt[S - 16]), P = _.add4H(B, z, V, Ut[S - 7], Ut[S - 16]);
      Ut[S] = P | 0, Xt[S] = B | 0;
    }
    let { Ah: r, Al: i, Bh: s, Bl: o, Ch: f, Cl: u, Dh: h, Dl: p, Eh: m, El: O, Fh: L, Fl: N, Gh: x, Gl: E, Hh: T, Hl: M } = this;
    for (let S = 0; S < 80; S++) {
      const A = _.rotrSH(m, O, 14) ^ _.rotrSH(m, O, 18) ^ _.rotrBH(m, O, 41), j = _.rotrSL(m, O, 14) ^ _.rotrSL(m, O, 18) ^ _.rotrBL(m, O, 41), z = m & L ^ ~m & x, U = O & N ^ ~O & E, H = _.add5L(M, j, U, yh[S], Xt[S]), G = _.add5H(H, T, A, z, bh[S], Ut[S]), V = H | 0, I = _.rotrSH(r, i, 28) ^ _.rotrBH(r, i, 34) ^ _.rotrBH(r, i, 39), B = _.rotrSL(r, i, 28) ^ _.rotrBL(r, i, 34) ^ _.rotrBL(r, i, 39), P = r & s ^ r & f ^ s & f, a = i & o ^ i & u ^ o & u;
      T = x | 0, M = E | 0, x = L | 0, E = N | 0, L = m | 0, N = O | 0, { h: m, l: O } = _.add(h | 0, p | 0, G | 0, V | 0), h = f | 0, p = u | 0, f = s | 0, u = o | 0, s = r | 0, o = i | 0;
      const c = _.add3L(V, B, a);
      r = _.add3H(c, G, I, P), i = c | 0;
    }
    ({ h: r, l: i } = _.add(this.Ah | 0, this.Al | 0, r | 0, i | 0)), { h: s, l: o } = _.add(this.Bh | 0, this.Bl | 0, s | 0, o | 0), { h: f, l: u } = _.add(this.Ch | 0, this.Cl | 0, f | 0, u | 0), { h, l: p } = _.add(this.Dh | 0, this.Dl | 0, h | 0, p | 0), { h: m, l: O } = _.add(this.Eh | 0, this.El | 0, m | 0, O | 0), { h: L, l: N } = _.add(this.Fh | 0, this.Fl | 0, L | 0, N | 0), { h: x, l: E } = _.add(this.Gh | 0, this.Gl | 0, x | 0, E | 0), { h: T, l: M } = _.add(this.Hh | 0, this.Hl | 0, T | 0, M | 0), this.set(r, i, s, o, f, u, h, p, m, O, L, N, x, E, T, M);
  }
  roundClean() {
    Ut.fill(0), Xt.fill(0);
  }
  destroy() {
    this.buffer.fill(0), this.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
  }
};
const wh = /* @__PURE__ */ Va(() => new vh());
const ht = BigInt(0), rt = BigInt(1), _n = BigInt(2), xh = BigInt(8), Ph = { zip215: !0 };
function Oh(t) {
  const e = cs(t);
  return On(t, {
    hash: "function",
    a: "bigint",
    d: "bigint",
    randomBytes: "function"
  }, {
    adjustScalarBytes: "function",
    domain: "function",
    uvRatio: "function",
    mapToCurve: "function"
  }), Object.freeze({ ...e });
}
function Nh(t) {
  const e = Oh(t), { Fp: n, n: r, prehash: i, hash: s, randomBytes: o, nByteLength: f, h: u } = e, h = _n << BigInt(f * 8) - rt, p = n.create, m = e.uvRatio || ((c, d) => {
    try {
      return { isValid: !0, value: n.sqrt(c * n.inv(d)) };
    } catch {
      return { isValid: !1, value: ht };
    }
  }), O = e.adjustScalarBytes || ((c) => c), L = e.domain || ((c, d, g) => {
    if (St("phflag", g), d.length || g)
      throw new Error("Contexts/pre-hash are not supported");
    return c;
  });
  function N(c, d) {
    ft("coordinate " + c, d, ht, h);
  }
  function x(c) {
    if (!(c instanceof M))
      throw new Error("ExtendedPoint expected");
  }
  const E = Xn((c, d) => {
    const { ex: g, ey: b, ez: w } = c, k = c.is0();
    d == null && (d = k ? xh : n.inv(w));
    const y = p(g * d), l = p(b * d), v = p(w * d);
    if (k)
      return { x: ht, y: rt };
    if (v !== rt)
      throw new Error("invZ was invalid");
    return { x: y, y: l };
  }), T = Xn((c) => {
    const { a: d, d: g } = e;
    if (c.is0())
      throw new Error("bad point: ZERO");
    const { ex: b, ey: w, ez: k, et: y } = c, l = p(b * b), v = p(w * w), X = p(k * k), F = p(X * X), C = p(l * d), $ = p(X * p(C + v)), Y = p(F + p(g * p(l * v)));
    if ($ !== Y)
      throw new Error("bad point: equation left != right (1)");
    const K = p(b * w), Ye = p(k * y);
    if (K !== Ye)
      throw new Error("bad point: equation left != right (2)");
    return !0;
  });
  class M {
    constructor(d, g, b, w) {
      this.ex = d, this.ey = g, this.ez = b, this.et = w, N("x", d), N("y", g), N("z", b), N("t", w), Object.freeze(this);
    }
    get x() {
      return this.toAffine().x;
    }
    get y() {
      return this.toAffine().y;
    }
    static fromAffine(d) {
      if (d instanceof M)
        throw new Error("extended point not allowed");
      const { x: g, y: b } = d || {};
      return N("x", g), N("y", b), new M(g, b, rt, p(g * b));
    }
    static normalizeZ(d) {
      const g = n.invertBatch(d.map((b) => b.ez));
      return d.map((b, w) => b.toAffine(g[w])).map(M.fromAffine);
    }
    // "Private method", don't use it directly
    _setWindowSize(d) {
      j.setWindowSize(this, d);
    }
    // Not required for fromHex(), which always creates valid points.
    // Could be useful for fromAffine().
    assertValidity() {
      T(this);
    }
    // Compare one point to another.
    equals(d) {
      x(d);
      const { ex: g, ey: b, ez: w } = this, { ex: k, ey: y, ez: l } = d, v = p(g * l), X = p(k * w), F = p(b * l), C = p(y * w);
      return v === X && F === C;
    }
    is0() {
      return this.equals(M.ZERO);
    }
    negate() {
      return new M(p(-this.ex), this.ey, this.ez, p(-this.et));
    }
    // Fast algo for doubling Extended Point.
    // https://hyperelliptic.org/EFD/g1p/auto-twisted-extended.html#doubling-dbl-2008-hwcd
    // Cost: 4M + 4S + 1*a + 6add + 1*2.
    double() {
      const { a: d } = e, { ex: g, ey: b, ez: w } = this, k = p(g * g), y = p(b * b), l = p(_n * p(w * w)), v = p(d * k), X = g + b, F = p(p(X * X) - k - y), C = v + y, $ = C - l, Y = v - y, K = p(F * $), Ye = p(C * Y), J = p(F * Y), Q = p($ * C);
      return new M(K, Ye, Q, J);
    }
    // Fast algo for adding 2 Extended Points.
    // https://hyperelliptic.org/EFD/g1p/auto-twisted-extended.html#addition-add-2008-hwcd
    // Cost: 9M + 1*a + 1*d + 7add.
    add(d) {
      x(d);
      const { a: g, d: b } = e, { ex: w, ey: k, ez: y, et: l } = this, { ex: v, ey: X, ez: F, et: C } = d;
      if (g === BigInt(-1)) {
        const Nn = p((k - w) * (X + v)), le = p((k + w) * (X - v)), fe = p(le - Nn);
        if (fe === ht)
          return this.double();
        const Ln = p(y * _n * C), de = p(l * _n * F), he = de + Ln, En = le + Nn, pe = de - Ln, ye = p(he * fe), Wn = p(En * pe), ve = p(he * pe), we = p(fe * En);
        return new M(ye, Wn, we, ve);
      }
      const $ = p(w * v), Y = p(k * X), K = p(l * b * C), Ye = p(y * F), J = p((w + k) * (v + X) - $ - Y), Q = Ye - K, tt = Ye + K, se = p(Y - g * $), ae = p(J * Q), Yn = p(tt * se), ge = p(J * se), be = p(Q * tt);
      return new M(ae, Yn, be, ge);
    }
    subtract(d) {
      return this.add(d.negate());
    }
    wNAF(d) {
      return j.wNAFCached(this, d, M.normalizeZ);
    }
    // Constant-time multiplication.
    multiply(d) {
      const g = d;
      ft("scalar", g, rt, r);
      const { p: b, f: w } = this.wNAF(g);
      return M.normalizeZ([b, w])[0];
    }
    // Non-constant-time multiplication. Uses double-and-add algorithm.
    // It's faster, but should only be used when you don't care about
    // an exposed private key e.g. sig verification.
    // Does NOT allow scalars higher than CURVE.n.
    multiplyUnsafe(d) {
      const g = d;
      return ft("scalar", g, ht, r), g === ht ? A : this.equals(A) || g === rt ? this : this.equals(S) ? this.wNAF(g).p : j.unsafeLadder(this, g);
    }
    // Checks if point is of small order.
    // If you add something to small order point, you will have "dirty"
    // point with torsion component.
    // Multiplies point by cofactor and checks if the result is 0.
    isSmallOrder() {
      return this.multiplyUnsafe(u).is0();
    }
    // Multiplies point by curve order and checks if the result is 0.
    // Returns `false` is the point is dirty.
    isTorsionFree() {
      return j.unsafeLadder(this, r).is0();
    }
    // Converts Extended point to default (x, y) coordinates.
    // Can accept precomputed Z^-1 - for example, from invertBatch.
    toAffine(d) {
      return E(this, d);
    }
    clearCofactor() {
      const { h: d } = e;
      return d === rt ? this : this.multiplyUnsafe(d);
    }
    // Converts hash string or Uint8Array to Point.
    // Uses algo from RFC8032 5.1.3.
    static fromHex(d, g = !1) {
      const { d: b, a: w } = e, k = n.BYTES;
      d = qe("pointHex", d, k), St("zip215", g);
      const y = d.slice(), l = d[k - 1];
      y[k - 1] = l & -129;
      const v = gn(y), X = g ? h : n.ORDER;
      ft("pointHex.y", v, ht, X);
      const F = p(v * v), C = p(F - rt), $ = p(b * F - w);
      let { isValid: Y, value: K } = m(C, $);
      if (!Y)
        throw new Error("Point.fromHex: invalid y coordinate");
      const Ye = (K & rt) === rt, J = (l & 128) !== 0;
      if (!g && K === ht && J)
        throw new Error("Point.fromHex: x=0 and x_0=1");
      return J !== Ye && (K = p(-K)), M.fromAffine({ x: K, y: v });
    }
    static fromPrivateKey(d) {
      return H(d).point;
    }
    toRawBytes() {
      const { x: d, y: g } = this.toAffine(), b = Un(g, n.BYTES);
      return b[b.length - 1] |= d & rt ? 128 : 0, b;
    }
    toHex() {
      return on(this.toRawBytes());
    }
  }
  M.BASE = new M(e.Gx, e.Gy, rt, p(e.Gx * e.Gy)), M.ZERO = new M(ht, rt, rt, ht);
  const { BASE: S, ZERO: A } = M, j = tf(M, f * 8);
  function z(c) {
    return ue(c, r);
  }
  function U(c) {
    return z(gn(c));
  }
  function H(c) {
    const d = f;
    c = qe("private key", c, d);
    const g = qe("hashed private key", s(c), 2 * d), b = O(g.slice(0, d)), w = g.slice(d, 2 * d), k = U(b), y = S.multiply(k), l = y.toRawBytes();
    return { head: b, prefix: w, scalar: k, point: y, pointBytes: l };
  }
  function G(c) {
    return H(c).pointBytes;
  }
  function V(c = new Uint8Array(), ...d) {
    const g = an(...d);
    return U(s(L(g, qe("context", c), !!i)));
  }
  function I(c, d, g = {}) {
    c = qe("message", c), i && (c = i(c));
    const { prefix: b, scalar: w, pointBytes: k } = H(d), y = V(g.context, b, c), l = S.multiply(y).toRawBytes(), v = V(g.context, l, k, c), X = z(y + v * w);
    ft("signature.s", X, ht, r);
    const F = an(l, Un(X, n.BYTES));
    return qe("result", F, f * 2);
  }
  const B = Ph;
  function P(c, d, g, b = B) {
    const { context: w, zip215: k } = b, y = n.BYTES;
    c = qe("signature", c, 2 * y), d = qe("message", d), k !== void 0 && St("zip215", k), i && (d = i(d));
    const l = gn(c.slice(y, 2 * y));
    let v, X, F;
    try {
      v = M.fromHex(g, k), X = M.fromHex(c.slice(0, y), k), F = S.multiplyUnsafe(l);
    } catch {
      return !1;
    }
    if (!k && v.isSmallOrder())
      return !1;
    const C = V(w, X.toRawBytes(), v.toRawBytes(), d);
    return X.add(v.multiplyUnsafe(C)).subtract(F).clearCofactor().equals(M.ZERO);
  }
  return S._setWindowSize(8), {
    CURVE: e,
    getPublicKey: G,
    sign: I,
    verify: P,
    ExtendedPoint: M,
    utils: {
      getExtendedPublicKey: H,
      // ed25519 private keys are uniform 32b. No need to check for modulo bias, like in secp256k1.
      randomPrivateKey: () => o(n.BYTES),
      /**
       * We're doing scalar multiplication (used in getPublicKey etc) with precomputed BASE_POINT
       * values. This slows down first getPublicKey() by milliseconds (see Speed section),
       * but allows to speed-up subsequent getPublicKey() calls up to 20x.
       * @param windowSize 2, 4, 8, 16
       */
      precompute(c = 8, d = M.BASE) {
        return d._setWindowSize(c), d.multiply(BigInt(3)), d;
      }
    }
  };
}
const mg = BigInt(0), gg = BigInt(1);
const us = BigInt("57896044618658097711785492504343953926634992332820282019728792003956564819949"), ro = /* @__PURE__ */ BigInt("19681161376707505956807079304988542015446066515923890162744021073123829784752");
BigInt(0);
const Lh = BigInt(1), io = BigInt(2), bg = BigInt(3), Eh = BigInt(5), kh = BigInt(8);
function Th(t) {
  const e = BigInt(10), n = BigInt(20), r = BigInt(40), i = BigInt(80), s = us, f = t * t % s * t % s, u = xe(f, io, s) * f % s, h = xe(u, Lh, s) * t % s, p = xe(h, Eh, s) * h % s, m = xe(p, e, s) * p % s, O = xe(m, n, s) * m % s, L = xe(O, r, s) * O % s, N = xe(L, i, s) * L % s, x = xe(N, i, s) * L % s, E = xe(x, e, s) * p % s;
  return { pow_p_5_8: xe(E, io, s) * t % s, b2: f };
}
function Mh(t) {
  return t[0] &= 248, t[31] &= 127, t[31] |= 64, t;
}
function Sh(t, e) {
  const n = us, r = ue(e * e * e, n), i = ue(r * r * e, n), s = Th(t * i).pow_p_5_8;
  let o = ue(t * r * s, n);
  const f = ue(e * o * o, n), u = o, h = ue(o * ro, n), p = f === t, m = f === ue(-t, n), O = f === ue(-t * ro, n);
  return p && (o = u), (m || O) && (o = h), zd(o, n) && (o = ue(-o, n)), { isValid: p || m, value: o };
}
const zh = _a(us, void 0, !0), Ah = {
  // Param: a
  a: BigInt(-1),
  // Fp.create(-1) is proper; our way still works and is faster
  // d is equal to -121665/121666 over finite field.
  // Negative number is P - number, and division is invert(number, P)
  d: BigInt("37095705934669439343138083508754565189542113879843219016388785533085940283555"),
  // Finite field 𝔽p over which we'll do calculations; 2n**255n - 19n
  Fp: zh,
  // Subgroup order: how many points curve has
  // 2n**252n + 27742317777372353535851937790883648493n;
  n: BigInt("7237005577332262213973186563042994240857116359379907606001950938285454250989"),
  // Cofactor
  h: kh,
  // Base point (x, y) aka generator point
  Gx: BigInt("15112221349535400772501151409588531511454012693041857206046113283949847762202"),
  Gy: BigInt("46316835694926478169428394003475163141307993866256225615783033603165251855960"),
  hash: wh,
  randomBytes: Ga,
  adjustScalarBytes: Mh,
  // dom2
  // Ratio of u to v. Allows us to combine inversion and square root. Uses algo from RFC8032 5.1.3.
  // Constant-time, u/√v
  uvRatio: Sh
}, ls = Nh(Ah);
function ds(t, e) {
  if (!$e || !e && Je()) {
    const r = Su(t);
    return {
      publicKey: r.slice(32),
      secretKey: r.slice(0, 64)
    };
  }
  const n = ls.getPublicKey(t);
  return {
    publicKey: n,
    secretKey: Cn([t, n])
  };
}
function jh(t, { publicKey: e, secretKey: n }, r) {
  if (n) {
    if (!e)
      throw new Error("Expected a valid publicKey");
  } else throw new Error("Expected a valid secretKey");
  const i = W(t), s = n.subarray(0, 32);
  return !$e || !r && Je() ? zu(e, s, i) : ls.sign(i, s);
}
function of(t, e, n, r) {
  const i = W(t), s = W(n), o = W(e);
  if (s.length !== 32)
    throw new Error(`Invalid publicKey, received ${s.length}, expected 32`);
  if (o.length !== 64)
    throw new Error(`Invalid signature, received ${o.length} bytes, expected 64`);
  try {
    return !$e || !r && Je() ? Au(o, i, s) : ls.verify(o, i, s);
  } catch {
    return !1;
  }
}
const Hh = /* @__PURE__ */ rf(ds, Kd), Ui = 64, Rh = 32, gi = Ui + Rh;
function af(t) {
  const e = W(t);
  if (e.length !== gi)
    throw new Error(`Expected keypair with ${gi} bytes, found ${e.length}`);
  return {
    publicKey: e.slice(Ui, gi),
    secretKey: e.slice(0, Ui)
  };
}
function Ih({ publicKey: t, secretKey: e }) {
  return Qe(e, t).slice();
}
function ff(t) {
  return (e, n) => {
    if (!Kt(n) || n.length !== 32)
      throw new Error("Invalid chainCode passed to derive");
    return af(t(Ih(e), n));
  };
}
const Uh = /* @__PURE__ */ ff(Xu), Xh = /* @__PURE__ */ ff(Du);
function Dh(t, { chainCode: e, isSoft: n }) {
  return n ? Xh(t, e) : Uh(t, e);
}
const Bh = {
  ecdsa: no,
  ed25519: Hh,
  // FIXME This is Substrate-compatible, not Ethereum-compatible
  ethereum: no,
  sr25519: Dh
};
function cf(t, e, n) {
  const r = Bh[n];
  let i = t;
  for (const s of e)
    i = r(i, s);
  return i;
}
function uf(t) {
  const e = W(t);
  if (e.length !== 32)
    throw new Error(`Expected a seed matching 32 bytes, found ${e.length}`);
  return af(Bu(e));
}
function Fh(t, { publicKey: e, secretKey: n }) {
  if ((e == null ? void 0 : e.length) !== 32)
    throw new Error("Expected a valid publicKey, 32-bytes");
  if ((n == null ? void 0 : n.length) !== 64)
    throw new Error("Expected a valid secretKey, 64-bytes");
  return Fu(e, n, W(t));
}
function lf(t, e, n) {
  const r = W(n), i = W(e);
  if (r.length !== 32)
    throw new Error(`Invalid publicKey, received ${r.length} bytes, expected 32`);
  if (i.length !== 64)
    throw new Error(`Invalid signature, received ${i.length} bytes, expected 64`);
  return Cu(i, W(t), r);
}
const so = new Uint8Array();
function Ch(t, { secretKey: e }, n = so, r = so) {
  if ((e == null ? void 0 : e.length) !== 64)
    throw new Error("Invalid secretKey, expected 64-bytes");
  return Zu(e, W(n), W(t), W(r));
}
const oo = new Uint8Array();
function Zh(t, e, n, r = oo, i = oo) {
  const s = W(n), o = W(e);
  if (s.length !== 32)
    throw new Error("Invalid publicKey, expected 32-bytes");
  if (o.length !== 96)
    throw new Error("Invalid vrfSign output, expected 96 bytes");
  return Vu(s, W(r), W(t), W(i), o);
}
function Vh(t, e = fr.prefix) {
  const n = mn(t);
  if (e < 0 || e > 16383 || [46, 47].includes(e))
    throw new Error("Out of range ss58Format specified");
  if (!fr.allowedDecodedLengths.includes(n.length))
    throw new Error(`Expected a valid key to convert, with length ${fr.allowedDecodedLengths.join(", ")}`);
  const r = Qe(e < 64 ? [e] : [
    (e & 252) >> 2 | 64,
    e >> 8 | (e & 3) << 6
  ], n);
  return ul(Qe(r, Fa(r).subarray(0, [32, 33].includes(n.length) ? 2 : 1)));
}
const df = [], hf = [], pf = [], Gh = /* @__PURE__ */ BigInt(0), kn = /* @__PURE__ */ BigInt(1), qh = /* @__PURE__ */ BigInt(2), Yh = /* @__PURE__ */ BigInt(7), Wh = /* @__PURE__ */ BigInt(256), Kh = /* @__PURE__ */ BigInt(113);
for (let t = 0, e = kn, n = 1, r = 0; t < 24; t++) {
  [n, r] = [r, (2 * n + 3 * r) % 5], df.push(2 * (5 * r + n)), hf.push((t + 1) * (t + 2) / 2 % 64);
  let i = Gh;
  for (let s = 0; s < 7; s++)
    e = (e << kn ^ (e >> Yh) * Kh) % Wh, e & qh && (i ^= kn << (kn << /* @__PURE__ */ BigInt(s)) - kn);
  pf.push(i);
}
const [Jh, Qh] = /* @__PURE__ */ Ha(pf, !0), ao = (t, e, n) => n > 32 ? Ua(t, e, n) : Ra(t, e, n), fo = (t, e, n) => n > 32 ? Xa(t, e, n) : Ia(t, e, n);
function _h(t, e = 24) {
  const n = new Uint32Array(10);
  for (let r = 24 - e; r < 24; r++) {
    for (let o = 0; o < 10; o++)
      n[o] = t[o] ^ t[o + 10] ^ t[o + 20] ^ t[o + 30] ^ t[o + 40];
    for (let o = 0; o < 10; o += 2) {
      const f = (o + 8) % 10, u = (o + 2) % 10, h = n[u], p = n[u + 1], m = ao(h, p, 1) ^ n[f], O = fo(h, p, 1) ^ n[f + 1];
      for (let L = 0; L < 50; L += 10)
        t[o + L] ^= m, t[o + L + 1] ^= O;
    }
    let i = t[2], s = t[3];
    for (let o = 0; o < 24; o++) {
      const f = hf[o], u = ao(i, s, f), h = fo(i, s, f), p = df[o];
      i = t[p], s = t[p + 1], t[p] = u, t[p + 1] = h;
    }
    for (let o = 0; o < 50; o += 10) {
      for (let f = 0; f < 10; f++)
        n[f] = t[o + f];
      for (let f = 0; f < 10; f++)
        t[o + f] ^= ~n[(f + 2) % 10] & n[(f + 4) % 10];
    }
    t[0] ^= Jh[r], t[1] ^= Qh[r];
  }
  n.fill(0);
}
class Ar extends kr {
  // NOTE: we accept arguments in bytes instead of bits here.
  constructor(e, n, r, i = !1, s = 24) {
    if (super(), this.blockLen = e, this.suffix = n, this.outputLen = r, this.enableXOF = i, this.rounds = s, this.pos = 0, this.posOut = 0, this.finished = !1, this.destroyed = !1, et(r), 0 >= this.blockLen || this.blockLen >= 200)
      throw new Error("Sha3 supports only keccak-f1600 function");
    this.state = new Uint8Array(200), this.state32 = qt(this.state);
  }
  keccak() {
    mt || xt(this.state32), _h(this.state32, this.rounds), mt || xt(this.state32), this.posOut = 0, this.pos = 0;
  }
  update(e) {
    Jt(this);
    const { blockLen: n, state: r } = this;
    e = ct(e);
    const i = e.length;
    for (let s = 0; s < i; ) {
      const o = Math.min(n - this.pos, i - s);
      for (let f = 0; f < o; f++)
        r[this.pos++] ^= e[s++];
      this.pos === n && this.keccak();
    }
    return this;
  }
  finish() {
    if (this.finished)
      return;
    this.finished = !0;
    const { state: e, suffix: n, pos: r, blockLen: i } = this;
    e[r] ^= n, n & 128 && r === i - 1 && this.keccak(), e[i - 1] ^= 128, this.keccak();
  }
  writeInto(e) {
    Jt(this, !1), Er(e), this.finish();
    const n = this.state, { blockLen: r } = this;
    for (let i = 0, s = e.length; i < s; ) {
      this.posOut >= r && this.keccak();
      const o = Math.min(r - this.posOut, s - i);
      e.set(n.subarray(this.posOut, this.posOut + o), i), this.posOut += o, i += o;
    }
    return e;
  }
  xofInto(e) {
    if (!this.enableXOF)
      throw new Error("XOF is not possible for this instance");
    return this.writeInto(e);
  }
  xof(e) {
    return et(e), this.xofInto(new Uint8Array(e));
  }
  digestInto(e) {
    if (ns(e, this), this.finished)
      throw new Error("digest() was already called");
    return this.writeInto(e), this.destroy(), e;
  }
  digest() {
    return this.digestInto(new Uint8Array(this.outputLen));
  }
  destroy() {
    this.destroyed = !0, this.state.fill(0);
  }
  _cloneInto(e) {
    const { blockLen: n, suffix: r, outputLen: i, rounds: s, enableXOF: o } = this;
    return e || (e = new Ar(n, r, i, o, s)), e.state32.set(this.state32), e.pos = this.pos, e.posOut = this.posOut, e.finished = this.finished, e.rounds = s, e.suffix = r, e.outputLen = i, e.enableXOF = o, e.destroyed = this.destroyed, e;
  }
}
const $t = (t, e, n) => rs(() => new Ar(e, t, n));
224 / 8;
256 / 8;
384 / 8;
512 / 8;
224 / 8;
const $h = /* @__PURE__ */ $t(1, 136, 256 / 8);
384 / 8;
const e0 = /* @__PURE__ */ $t(1, 72, 512 / 8), mf = (t, e, n) => ml((r = {}) => new Ar(e, t, r.dkLen === void 0 ? n : r.dkLen, !0));
128 / 8;
256 / 8;
const jr = /* @__PURE__ */ Ba({ 256: Wu, 512: Ku }, { 256: $h, 512: e0 });
function Xi(t, e, n) {
  return t === "keccak" ? jr(e, void 0, n) : _t(e, void 0, void 0, n);
}
const hs = {
  chars: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",
  coder: sl,
  type: "base64",
  withPadding: !0
}, t0 = /* @__PURE__ */ Ma(hs), n0 = /* @__PURE__ */ ka(hs, t0), r0 = /* @__PURE__ */ Ta(hs);
function gf(t, e) {
  if (![33, 65].includes(t.length))
    throw new Error(`Invalid publicKey provided, received ${t.length} bytes input`);
  return t.length === 33 ? t : !$e || Je() ? Hu(t) : Gn.ProjectivePoint.fromHex(t).toRawBytes(!0);
}
function ps(t, e) {
  if (![33, 65].includes(t.length))
    throw new Error(`Invalid publicKey provided, received ${t.length} bytes input`);
  if (t.length === 65)
    return t.subarray(1);
  if (!$e || Je())
    return Ru(t).subarray(1);
  const { px: n, py: r } = Gn.ProjectivePoint.fromHex(t);
  return Qe(ot(n, vn), ot(r, vn));
}
function i0(t, e, n, r = "blake2", i) {
  const s = W(e).subarray(0, 64), o = W(t), f = !$e || Je() ? Iu(o, s, n) : Gn.Signature.fromCompact(s).addRecoveryBit(n).recoverPublicKey(o).toRawBytes();
  if (!f)
    throw new Error("Unable to recover publicKey from signature");
  return r === "keccak" ? ps(f) : gf(f);
}
function co(t, { secretKey: e }, n = "blake2", r) {
  if ((e == null ? void 0 : e.length) !== 32)
    throw new Error("Expected valid secp256k1 secretKey, 32-bytes");
  const i = Xi(n, t, r);
  if (!$e || Je())
    return Uu(i, e);
  const s = Gn.sign(i, e, { lowS: !0 });
  return Qe(ot(s.r, vn), ot(s.s, vn), new Uint8Array([s.recovery || 0]));
}
const bf = "ffffffff ffffffff ffffffff fffffffe baaedce6 af48a03b bfd25e8c d0364141".replace(/ /g, ""), bi = ie(`0x${bf}`), yi = new ee(bf, "hex");
function s0(t, e) {
  let n = Mi(e, Gs);
  if (n >= bi)
    throw new Error("Tweak parameter is out of range");
  if (n += Mi(t, Gs), n >= bi && (n -= bi), n === lr)
    throw new Error("Invalid resulting private key");
  return qc(n, vn);
}
function o0(t, e) {
  const n = new ee(e);
  if (n.cmp(yi) >= 0)
    throw new Error("Tweak parameter is out of range");
  if (n.iadd(new ee(t)), n.cmp(yi) >= 0 && n.isub(yi), n.isZero())
    throw new Error("Invalid resulting private key");
  return ot(n, vn);
}
function a0(t, e, n) {
  if (!Kt(t) || t.length !== 32)
    throw new Error("Expected seckey to be an Uint8Array with length 32");
  if (!Kt(e) || e.length !== 32)
    throw new Error("Expected tweak to be an Uint8Array with length 32");
  return !$e || n ? o0(t, e) : s0(t, e);
}
function f0(t, e, n, r = "blake2", i) {
  const s = W(e);
  if (s.length !== 65)
    throw new Error(`Expected signature with 65 bytes, ${s.length} found instead`);
  const o = i0(Xi(r, t), s, s[64], r), f = Xi(r, o, i), u = W(n);
  return Nt(o, u) || (r === "keccak" ? Nt(f.slice(-20), u.slice(-20)) : Nt(f, u));
}
function c0(t) {
  return [33, 65].includes(t.length) && (t = jr(ps(t))), t.slice(-20);
}
function yf(t) {
  if (!t)
    return "0x";
  const e = W(t);
  if (![20, 32, 33, 65].includes(e.length))
    throw new Error(`Invalid address or publicKey provided, received ${e.length} bytes input`);
  const n = Wt(c0(e), -1, !1), r = Wt(jr(n), -1, !1);
  let i = "";
  for (let s = 0; s < 40; s++)
    i = `${i}${parseInt(r[s], 16) > 7 ? n[s].toUpperCase() : n[s]}`;
  return `0x${i}`;
}
class vf extends kr {
  constructor(e, n) {
    super(), this.finished = !1, this.destroyed = !1, Sa(e);
    const r = ct(n);
    if (this.iHash = e.create(), typeof this.iHash.update != "function")
      throw new Error("Expected instance of class which extends utils.Hash");
    this.blockLen = this.iHash.blockLen, this.outputLen = this.iHash.outputLen;
    const i = this.blockLen, s = new Uint8Array(i);
    s.set(r.length > i ? e.create().update(r).digest() : r);
    for (let o = 0; o < s.length; o++)
      s[o] ^= 54;
    this.iHash.update(s), this.oHash = e.create();
    for (let o = 0; o < s.length; o++)
      s[o] ^= 106;
    this.oHash.update(s), s.fill(0);
  }
  update(e) {
    return Jt(this), this.iHash.update(e), this;
  }
  digestInto(e) {
    Jt(this), Er(e, this.outputLen), this.finished = !0, this.iHash.digestInto(e), this.oHash.update(e), this.oHash.digestInto(e), this.destroy();
  }
  digest() {
    const e = new Uint8Array(this.oHash.outputLen);
    return this.digestInto(e), e;
  }
  _cloneInto(e) {
    e || (e = Object.create(Object.getPrototypeOf(this), {}));
    const { oHash: n, iHash: r, finished: i, destroyed: s, blockLen: o, outputLen: f } = this;
    return e = e, e.finished = i, e.destroyed = s, e.blockLen = o, e.outputLen = f, e.oHash = n._cloneInto(e.oHash), e.iHash = r._cloneInto(e.iHash), e;
  }
  destroy() {
    this.destroyed = !0, this.oHash.destroy(), this.iHash.destroy();
  }
}
const ms = (t, e, n) => new vf(t, e).update(n).digest();
ms.create = (t, e) => new vf(t, e);
function u0(t, e, n, r) {
  if (typeof t.setBigUint64 == "function")
    return t.setBigUint64(e, n, r);
  const i = BigInt(32), s = BigInt(4294967295), o = Number(n >> i & s), f = Number(n & s), u = r ? 4 : 0, h = r ? 0 : 4;
  t.setUint32(e + u, o, r), t.setUint32(e + h, f, r);
}
const l0 = (t, e, n) => t & e ^ ~t & n, d0 = (t, e, n) => t & e ^ t & n ^ e & n;
class wf extends kr {
  constructor(e, n, r, i) {
    super(), this.blockLen = e, this.outputLen = n, this.padOffset = r, this.isLE = i, this.finished = !1, this.length = 0, this.pos = 0, this.destroyed = !1, this.buffer = new Uint8Array(e), this.view = ar(this.buffer);
  }
  update(e) {
    Jt(this);
    const { view: n, buffer: r, blockLen: i } = this;
    e = ct(e);
    const s = e.length;
    for (let o = 0; o < s; ) {
      const f = Math.min(i - this.pos, s - o);
      if (f === i) {
        const u = ar(e);
        for (; i <= s - o; o += i)
          this.process(u, o);
        continue;
      }
      r.set(e.subarray(o, o + f), this.pos), this.pos += f, o += f, this.pos === i && (this.process(n, 0), this.pos = 0);
    }
    return this.length += e.length, this.roundClean(), this;
  }
  digestInto(e) {
    Jt(this), ns(e, this), this.finished = !0;
    const { buffer: n, view: r, blockLen: i, isLE: s } = this;
    let { pos: o } = this;
    n[o++] = 128, this.buffer.subarray(o).fill(0), this.padOffset > i - o && (this.process(r, 0), o = 0);
    for (let m = o; m < i; m++)
      n[m] = 0;
    u0(r, i - 8, BigInt(this.length * 8), s), this.process(r, 0);
    const f = ar(e), u = this.outputLen;
    if (u % 4)
      throw new Error("_sha2: outputLen should be aligned to 32bit");
    const h = u / 4, p = this.get();
    if (h > p.length)
      throw new Error("_sha2: outputLen bigger than state");
    for (let m = 0; m < h; m++)
      f.setUint32(4 * m, p[m], s);
  }
  digest() {
    const { buffer: e, outputLen: n } = this;
    this.digestInto(e);
    const r = e.slice(0, n);
    return this.destroy(), r;
  }
  _cloneInto(e) {
    e || (e = new this.constructor()), e.set(...this.get());
    const { blockLen: n, buffer: r, length: i, finished: s, destroyed: o, pos: f } = this;
    return e.length = i, e.pos = f, e.finished = s, e.destroyed = o, i % n && e.buffer.set(r), e;
  }
}
const h0 = /* @__PURE__ */ new Uint32Array([
  1116352408,
  1899447441,
  3049323471,
  3921009573,
  961987163,
  1508970993,
  2453635748,
  2870763221,
  3624381080,
  310598401,
  607225278,
  1426881987,
  1925078388,
  2162078206,
  2614888103,
  3248222580,
  3835390401,
  4022224774,
  264347078,
  604807628,
  770255983,
  1249150122,
  1555081692,
  1996064986,
  2554220882,
  2821834349,
  2952996808,
  3210313671,
  3336571891,
  3584528711,
  113926993,
  338241895,
  666307205,
  773529912,
  1294757372,
  1396182291,
  1695183700,
  1986661051,
  2177026350,
  2456956037,
  2730485921,
  2820302411,
  3259730800,
  3345764771,
  3516065817,
  3600352804,
  4094571909,
  275423344,
  430227734,
  506948616,
  659060556,
  883997877,
  958139571,
  1322822218,
  1537002063,
  1747873779,
  1955562222,
  2024104815,
  2227730452,
  2361852424,
  2428436474,
  2756734187,
  3204031479,
  3329325298
]), Dt = /* @__PURE__ */ new Uint32Array([
  1779033703,
  3144134277,
  1013904242,
  2773480762,
  1359893119,
  2600822924,
  528734635,
  1541459225
]), Bt = /* @__PURE__ */ new Uint32Array(64);
class p0 extends wf {
  constructor() {
    super(64, 32, 8, !1), this.A = Dt[0] | 0, this.B = Dt[1] | 0, this.C = Dt[2] | 0, this.D = Dt[3] | 0, this.E = Dt[4] | 0, this.F = Dt[5] | 0, this.G = Dt[6] | 0, this.H = Dt[7] | 0;
  }
  get() {
    const { A: e, B: n, C: r, D: i, E: s, F: o, G: f, H: u } = this;
    return [e, n, r, i, s, o, f, u];
  }
  // prettier-ignore
  set(e, n, r, i, s, o, f, u) {
    this.A = e | 0, this.B = n | 0, this.C = r | 0, this.D = i | 0, this.E = s | 0, this.F = o | 0, this.G = f | 0, this.H = u | 0;
  }
  process(e, n) {
    for (let m = 0; m < 16; m++, n += 4)
      Bt[m] = e.getUint32(n, !1);
    for (let m = 16; m < 64; m++) {
      const O = Bt[m - 15], L = Bt[m - 2], N = yt(O, 7) ^ yt(O, 18) ^ O >>> 3, x = yt(L, 17) ^ yt(L, 19) ^ L >>> 10;
      Bt[m] = x + Bt[m - 7] + N + Bt[m - 16] | 0;
    }
    let { A: r, B: i, C: s, D: o, E: f, F: u, G: h, H: p } = this;
    for (let m = 0; m < 64; m++) {
      const O = yt(f, 6) ^ yt(f, 11) ^ yt(f, 25), L = p + O + l0(f, u, h) + h0[m] + Bt[m] | 0, x = (yt(r, 2) ^ yt(r, 13) ^ yt(r, 22)) + d0(r, i, s) | 0;
      p = h, h = u, u = f, f = o + L | 0, o = s, s = i, i = r, r = L + x | 0;
    }
    r = r + this.A | 0, i = i + this.B | 0, s = s + this.C | 0, o = o + this.D | 0, f = f + this.E | 0, u = u + this.F | 0, h = h + this.G | 0, p = p + this.H | 0, this.set(r, i, s, o, f, u, h, p);
  }
  roundClean() {
    Bt.fill(0);
  }
  destroy() {
    this.set(0, 0, 0, 0, 0, 0, 0, 0), this.buffer.fill(0);
  }
}
const Hr = /* @__PURE__ */ rs(() => new p0()), [m0, g0] = q.split([
  "0x428a2f98d728ae22",
  "0x7137449123ef65cd",
  "0xb5c0fbcfec4d3b2f",
  "0xe9b5dba58189dbbc",
  "0x3956c25bf348b538",
  "0x59f111f1b605d019",
  "0x923f82a4af194f9b",
  "0xab1c5ed5da6d8118",
  "0xd807aa98a3030242",
  "0x12835b0145706fbe",
  "0x243185be4ee4b28c",
  "0x550c7dc3d5ffb4e2",
  "0x72be5d74f27b896f",
  "0x80deb1fe3b1696b1",
  "0x9bdc06a725c71235",
  "0xc19bf174cf692694",
  "0xe49b69c19ef14ad2",
  "0xefbe4786384f25e3",
  "0x0fc19dc68b8cd5b5",
  "0x240ca1cc77ac9c65",
  "0x2de92c6f592b0275",
  "0x4a7484aa6ea6e483",
  "0x5cb0a9dcbd41fbd4",
  "0x76f988da831153b5",
  "0x983e5152ee66dfab",
  "0xa831c66d2db43210",
  "0xb00327c898fb213f",
  "0xbf597fc7beef0ee4",
  "0xc6e00bf33da88fc2",
  "0xd5a79147930aa725",
  "0x06ca6351e003826f",
  "0x142929670a0e6e70",
  "0x27b70a8546d22ffc",
  "0x2e1b21385c26c926",
  "0x4d2c6dfc5ac42aed",
  "0x53380d139d95b3df",
  "0x650a73548baf63de",
  "0x766a0abb3c77b2a8",
  "0x81c2c92e47edaee6",
  "0x92722c851482353b",
  "0xa2bfe8a14cf10364",
  "0xa81a664bbc423001",
  "0xc24b8b70d0f89791",
  "0xc76c51a30654be30",
  "0xd192e819d6ef5218",
  "0xd69906245565a910",
  "0xf40e35855771202a",
  "0x106aa07032bbd1b8",
  "0x19a4c116b8d2d0c8",
  "0x1e376c085141ab53",
  "0x2748774cdf8eeb99",
  "0x34b0bcb5e19b48a8",
  "0x391c0cb3c5c95a63",
  "0x4ed8aa4ae3418acb",
  "0x5b9cca4f7763e373",
  "0x682e6ff3d6b2b8a3",
  "0x748f82ee5defb2fc",
  "0x78a5636f43172f60",
  "0x84c87814a1f0ab72",
  "0x8cc702081a6439ec",
  "0x90befffa23631e28",
  "0xa4506cebde82bde9",
  "0xbef9a3f7b2c67915",
  "0xc67178f2e372532b",
  "0xca273eceea26619c",
  "0xd186b8c721c0c207",
  "0xeada7dd6cde0eb1e",
  "0xf57d4f7fee6ed178",
  "0x06f067aa72176fba",
  "0x0a637dc5a2c898a6",
  "0x113f9804bef90dae",
  "0x1b710b35131c471b",
  "0x28db77f523047d84",
  "0x32caab7b40c72493",
  "0x3c9ebe0a15c9bebc",
  "0x431d67c49c100d4c",
  "0x4cc5d4becb3e42b6",
  "0x597f299cfc657e2a",
  "0x5fcb6fab3ad6faec",
  "0x6c44198c4a475817"
].map((t) => BigInt(t))), Ft = /* @__PURE__ */ new Uint32Array(80), Ct = /* @__PURE__ */ new Uint32Array(80);
class b0 extends wf {
  constructor() {
    super(128, 64, 16, !1), this.Ah = 1779033703, this.Al = -205731576, this.Bh = -1150833019, this.Bl = -2067093701, this.Ch = 1013904242, this.Cl = -23791573, this.Dh = -1521486534, this.Dl = 1595750129, this.Eh = 1359893119, this.El = -1377402159, this.Fh = -1694144372, this.Fl = 725511199, this.Gh = 528734635, this.Gl = -79577749, this.Hh = 1541459225, this.Hl = 327033209;
  }
  // prettier-ignore
  get() {
    const { Ah: e, Al: n, Bh: r, Bl: i, Ch: s, Cl: o, Dh: f, Dl: u, Eh: h, El: p, Fh: m, Fl: O, Gh: L, Gl: N, Hh: x, Hl: E } = this;
    return [e, n, r, i, s, o, f, u, h, p, m, O, L, N, x, E];
  }
  // prettier-ignore
  set(e, n, r, i, s, o, f, u, h, p, m, O, L, N, x, E) {
    this.Ah = e | 0, this.Al = n | 0, this.Bh = r | 0, this.Bl = i | 0, this.Ch = s | 0, this.Cl = o | 0, this.Dh = f | 0, this.Dl = u | 0, this.Eh = h | 0, this.El = p | 0, this.Fh = m | 0, this.Fl = O | 0, this.Gh = L | 0, this.Gl = N | 0, this.Hh = x | 0, this.Hl = E | 0;
  }
  process(e, n) {
    for (let S = 0; S < 16; S++, n += 4)
      Ft[S] = e.getUint32(n), Ct[S] = e.getUint32(n += 4);
    for (let S = 16; S < 80; S++) {
      const A = Ft[S - 15] | 0, j = Ct[S - 15] | 0, z = q.rotrSH(A, j, 1) ^ q.rotrSH(A, j, 8) ^ q.shrSH(A, j, 7), U = q.rotrSL(A, j, 1) ^ q.rotrSL(A, j, 8) ^ q.shrSL(A, j, 7), H = Ft[S - 2] | 0, G = Ct[S - 2] | 0, V = q.rotrSH(H, G, 19) ^ q.rotrBH(H, G, 61) ^ q.shrSH(H, G, 6), I = q.rotrSL(H, G, 19) ^ q.rotrBL(H, G, 61) ^ q.shrSL(H, G, 6), B = q.add4L(U, I, Ct[S - 7], Ct[S - 16]), P = q.add4H(B, z, V, Ft[S - 7], Ft[S - 16]);
      Ft[S] = P | 0, Ct[S] = B | 0;
    }
    let { Ah: r, Al: i, Bh: s, Bl: o, Ch: f, Cl: u, Dh: h, Dl: p, Eh: m, El: O, Fh: L, Fl: N, Gh: x, Gl: E, Hh: T, Hl: M } = this;
    for (let S = 0; S < 80; S++) {
      const A = q.rotrSH(m, O, 14) ^ q.rotrSH(m, O, 18) ^ q.rotrBH(m, O, 41), j = q.rotrSL(m, O, 14) ^ q.rotrSL(m, O, 18) ^ q.rotrBL(m, O, 41), z = m & L ^ ~m & x, U = O & N ^ ~O & E, H = q.add5L(M, j, U, g0[S], Ct[S]), G = q.add5H(H, T, A, z, m0[S], Ft[S]), V = H | 0, I = q.rotrSH(r, i, 28) ^ q.rotrBH(r, i, 34) ^ q.rotrBH(r, i, 39), B = q.rotrSL(r, i, 28) ^ q.rotrBL(r, i, 34) ^ q.rotrBL(r, i, 39), P = r & s ^ r & f ^ s & f, a = i & o ^ i & u ^ o & u;
      T = x | 0, M = E | 0, x = L | 0, E = N | 0, L = m | 0, N = O | 0, { h: m, l: O } = q.add(h | 0, p | 0, G | 0, V | 0), h = f | 0, p = u | 0, f = s | 0, u = o | 0, s = r | 0, o = i | 0;
      const c = q.add3L(V, B, a);
      r = q.add3H(c, G, I, P), i = c | 0;
    }
    ({ h: r, l: i } = q.add(this.Ah | 0, this.Al | 0, r | 0, i | 0)), { h: s, l: o } = q.add(this.Bh | 0, this.Bl | 0, s | 0, o | 0), { h: f, l: u } = q.add(this.Ch | 0, this.Cl | 0, f | 0, u | 0), { h, l: p } = q.add(this.Dh | 0, this.Dl | 0, h | 0, p | 0), { h: m, l: O } = q.add(this.Eh | 0, this.El | 0, m | 0, O | 0), { h: L, l: N } = q.add(this.Fh | 0, this.Fl | 0, L | 0, N | 0), { h: x, l: E } = q.add(this.Gh | 0, this.Gl | 0, x | 0, E | 0), { h: T, l: M } = q.add(this.Hh | 0, this.Hl | 0, T | 0, M | 0), this.set(r, i, s, o, f, u, h, p, m, O, L, N, x, E, T, M);
  }
  roundClean() {
    Ft.fill(0), Ct.fill(0);
  }
  destroy() {
    this.buffer.fill(0), this.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
  }
}
const gs = /* @__PURE__ */ rs(() => new b0()), y0 = {
  256: Hr,
  512: gs
}, v0 = {
  256: qu,
  512: Yu
};
function xf(t, e, n = 256, r) {
  const i = W(t);
  return !$e || Je() ? v0[n](i, e) : ms(y0[n], i, e);
}
const bs = 2147483648;
function w0(t) {
  if (!t.startsWith("m/"))
    return !1;
  const e = t.split("/").slice(1);
  for (const n of e) {
    const r = /^\d+'?$/.test(n) ? parseInt(n.replace(/'$/, ""), 10) : Number.NaN;
    if (isNaN(r) || r >= bs || r < 0)
      return !1;
  }
  return !0;
}
const x0 = it("Bitcoin seed");
function Pf(t, e) {
  return {
    chainCode: e,
    publicKey: Pn(t).publicKey,
    secretKey: t
  };
}
function Of(t, e) {
  const n = ot(e, Jl), r = e >= bs ? Qe(new Uint8Array(1), t.secretKey, n) : Qe(t.publicKey, n);
  try {
    const i = xf(t.chainCode, r, 512);
    return Pf(a0(t.secretKey, i.slice(0, 32)), i.slice(32));
  } catch {
    return Of(t, e + 1);
  }
}
function P0(t, e = "") {
  const n = xf(x0, t, 512);
  let r = Pf(n.slice(0, 32), n.slice(32));
  if (!e || e === "m" || e === "M" || e === "m'" || e === "M'")
    return r;
  if (!w0(e))
    throw new Error("Invalid derivation path");
  const i = e.split("/").slice(1);
  for (const s of i)
    r = Of(r, parseInt(s, 10) + (s.length > 1 && s.endsWith("'") ? bs : 0));
  return r;
}
function O0(t, e, n, r) {
  Sa(t);
  const i = Aa({ dkLen: 32, asyncTick: 10 }, r), { c: s, dkLen: o, asyncTick: f } = i;
  if (et(s), et(o), et(f), s < 1)
    throw new Error("PBKDF2: iterations (c) should be >= 1");
  const u = ct(e), h = ct(n), p = new Uint8Array(o), m = ms.create(t, u), O = m._cloneInto().update(h);
  return { c: s, dkLen: o, asyncTick: f, DK: p, PRF: m, PRFSalt: O };
}
function N0(t, e, n, r, i) {
  return t.destroy(), e.destroy(), r && r.destroy(), i.fill(0), n;
}
function ys(t, e, n, r) {
  const { c: i, dkLen: s, DK: o, PRF: f, PRFSalt: u } = O0(t, e, n, r);
  let h;
  const p = new Uint8Array(4), m = ar(p), O = new Uint8Array(f.outputLen);
  for (let L = 1, N = 0; N < s; L++, N += f.outputLen) {
    const x = o.subarray(N, N + f.outputLen);
    m.setInt32(0, L, !1), (h = u._cloneInto(h)).update(p).digestInto(O), x.set(O.subarray(0, x.length));
    for (let E = 1; E < i; E++) {
      f._cloneInto(h).update(O).digestInto(O);
      for (let T = 0; T < x.length; T++)
        x[T] ^= O[T];
    }
  }
  return N0(f, u, o, h, O);
}
function Nf(t, e = zr(), n = 2048, r) {
  const i = W(t), s = W(e);
  return {
    password: !$e || Je() ? Ju(i, s, n) : ys(gs, i, s, { c: n, dkLen: 64 }),
    rounds: n,
    salt: e
  };
}
const L0 = /* @__PURE__ */ Ba({ 256: _u, 512: $u }, { 256: Hr, 512: gs }), E0 = /* @__PURE__ */ Rl(256, L0), Lf = "abandon|ability|able|about|above|absent|absorb|abstract|absurd|abuse|access|accident|account|accuse|achieve|acid|acoustic|acquire|across|act|action|actor|actress|actual|adapt|add|addict|address|adjust|admit|adult|advance|advice|aerobic|affair|afford|afraid|again|age|agent|agree|ahead|aim|air|airport|aisle|alarm|album|alcohol|alert|alien|all|alley|allow|almost|alone|alpha|already|also|alter|always|amateur|amazing|among|amount|amused|analyst|anchor|ancient|anger|angle|angry|animal|ankle|announce|annual|another|answer|antenna|antique|anxiety|any|apart|apology|appear|apple|approve|april|arch|arctic|area|arena|argue|arm|armed|armor|army|around|arrange|arrest|arrive|arrow|art|artefact|artist|artwork|ask|aspect|assault|asset|assist|assume|asthma|athlete|atom|attack|attend|attitude|attract|auction|audit|august|aunt|author|auto|autumn|average|avocado|avoid|awake|aware|away|awesome|awful|awkward|axis|baby|bachelor|bacon|badge|bag|balance|balcony|ball|bamboo|banana|banner|bar|barely|bargain|barrel|base|basic|basket|battle|beach|bean|beauty|because|become|beef|before|begin|behave|behind|believe|below|belt|bench|benefit|best|betray|better|between|beyond|bicycle|bid|bike|bind|biology|bird|birth|bitter|black|blade|blame|blanket|blast|bleak|bless|blind|blood|blossom|blouse|blue|blur|blush|board|boat|body|boil|bomb|bone|bonus|book|boost|border|boring|borrow|boss|bottom|bounce|box|boy|bracket|brain|brand|brass|brave|bread|breeze|brick|bridge|brief|bright|bring|brisk|broccoli|broken|bronze|broom|brother|brown|brush|bubble|buddy|budget|buffalo|build|bulb|bulk|bullet|bundle|bunker|burden|burger|burst|bus|business|busy|butter|buyer|buzz|cabbage|cabin|cable|cactus|cage|cake|call|calm|camera|camp|can|canal|cancel|candy|cannon|canoe|canvas|canyon|capable|capital|captain|car|carbon|card|cargo|carpet|carry|cart|case|cash|casino|castle|casual|cat|catalog|catch|category|cattle|caught|cause|caution|cave|ceiling|celery|cement|census|century|cereal|certain|chair|chalk|champion|change|chaos|chapter|charge|chase|chat|cheap|check|cheese|chef|cherry|chest|chicken|chief|child|chimney|choice|choose|chronic|chuckle|chunk|churn|cigar|cinnamon|circle|citizen|city|civil|claim|clap|clarify|claw|clay|clean|clerk|clever|click|client|cliff|climb|clinic|clip|clock|clog|close|cloth|cloud|clown|club|clump|cluster|clutch|coach|coast|coconut|code|coffee|coil|coin|collect|color|column|combine|come|comfort|comic|common|company|concert|conduct|confirm|congress|connect|consider|control|convince|cook|cool|copper|copy|coral|core|corn|correct|cost|cotton|couch|country|couple|course|cousin|cover|coyote|crack|cradle|craft|cram|crane|crash|crater|crawl|crazy|cream|credit|creek|crew|cricket|crime|crisp|critic|crop|cross|crouch|crowd|crucial|cruel|cruise|crumble|crunch|crush|cry|crystal|cube|culture|cup|cupboard|curious|current|curtain|curve|cushion|custom|cute|cycle|dad|damage|damp|dance|danger|daring|dash|daughter|dawn|day|deal|debate|debris|decade|december|decide|decline|decorate|decrease|deer|defense|define|defy|degree|delay|deliver|demand|demise|denial|dentist|deny|depart|depend|deposit|depth|deputy|derive|describe|desert|design|desk|despair|destroy|detail|detect|develop|device|devote|diagram|dial|diamond|diary|dice|diesel|diet|differ|digital|dignity|dilemma|dinner|dinosaur|direct|dirt|disagree|discover|disease|dish|dismiss|disorder|display|distance|divert|divide|divorce|dizzy|doctor|document|dog|doll|dolphin|domain|donate|donkey|donor|door|dose|double|dove|draft|dragon|drama|drastic|draw|dream|dress|drift|drill|drink|drip|drive|drop|drum|dry|duck|dumb|dune|during|dust|dutch|duty|dwarf|dynamic|eager|eagle|early|earn|earth|easily|east|easy|echo|ecology|economy|edge|edit|educate|effort|egg|eight|either|elbow|elder|electric|elegant|element|elephant|elevator|elite|else|embark|embody|embrace|emerge|emotion|employ|empower|empty|enable|enact|end|endless|endorse|enemy|energy|enforce|engage|engine|enhance|enjoy|enlist|enough|enrich|enroll|ensure|enter|entire|entry|envelope|episode|equal|equip|era|erase|erode|erosion|error|erupt|escape|essay|essence|estate|eternal|ethics|evidence|evil|evoke|evolve|exact|example|excess|exchange|excite|exclude|excuse|execute|exercise|exhaust|exhibit|exile|exist|exit|exotic|expand|expect|expire|explain|expose|express|extend|extra|eye|eyebrow|fabric|face|faculty|fade|faint|faith|fall|false|fame|family|famous|fan|fancy|fantasy|farm|fashion|fat|fatal|father|fatigue|fault|favorite|feature|february|federal|fee|feed|feel|female|fence|festival|fetch|fever|few|fiber|fiction|field|figure|file|film|filter|final|find|fine|finger|finish|fire|firm|first|fiscal|fish|fit|fitness|fix|flag|flame|flash|flat|flavor|flee|flight|flip|float|flock|floor|flower|fluid|flush|fly|foam|focus|fog|foil|fold|follow|food|foot|force|forest|forget|fork|fortune|forum|forward|fossil|foster|found|fox|fragile|frame|frequent|fresh|friend|fringe|frog|front|frost|frown|frozen|fruit|fuel|fun|funny|furnace|fury|future|gadget|gain|galaxy|gallery|game|gap|garage|garbage|garden|garlic|garment|gas|gasp|gate|gather|gauge|gaze|general|genius|genre|gentle|genuine|gesture|ghost|giant|gift|giggle|ginger|giraffe|girl|give|glad|glance|glare|glass|glide|glimpse|globe|gloom|glory|glove|glow|glue|goat|goddess|gold|good|goose|gorilla|gospel|gossip|govern|gown|grab|grace|grain|grant|grape|grass|gravity|great|green|grid|grief|grit|grocery|group|grow|grunt|guard|guess|guide|guilt|guitar|gun|gym|habit|hair|half|hammer|hamster|hand|happy|harbor|hard|harsh|harvest|hat|have|hawk|hazard|head|health|heart|heavy|hedgehog|height|hello|helmet|help|hen|hero|hidden|high|hill|hint|hip|hire|history|hobby|hockey|hold|hole|holiday|hollow|home|honey|hood|hope|horn|horror|horse|hospital|host|hotel|hour|hover|hub|huge|human|humble|humor|hundred|hungry|hunt|hurdle|hurry|hurt|husband|hybrid|ice|icon|idea|identify|idle|ignore|ill|illegal|illness|image|imitate|immense|immune|impact|impose|improve|impulse|inch|include|income|increase|index|indicate|indoor|industry|infant|inflict|inform|inhale|inherit|initial|inject|injury|inmate|inner|innocent|input|inquiry|insane|insect|inside|inspire|install|intact|interest|into|invest|invite|involve|iron|island|isolate|issue|item|ivory|jacket|jaguar|jar|jazz|jealous|jeans|jelly|jewel|job|join|joke|journey|joy|judge|juice|jump|jungle|junior|junk|just|kangaroo|keen|keep|ketchup|key|kick|kid|kidney|kind|kingdom|kiss|kit|kitchen|kite|kitten|kiwi|knee|knife|knock|know|lab|label|labor|ladder|lady|lake|lamp|language|laptop|large|later|latin|laugh|laundry|lava|law|lawn|lawsuit|layer|lazy|leader|leaf|learn|leave|lecture|left|leg|legal|legend|leisure|lemon|lend|length|lens|leopard|lesson|letter|level|liar|liberty|library|license|life|lift|light|like|limb|limit|link|lion|liquid|list|little|live|lizard|load|loan|lobster|local|lock|logic|lonely|long|loop|lottery|loud|lounge|love|loyal|lucky|luggage|lumber|lunar|lunch|luxury|lyrics|machine|mad|magic|magnet|maid|mail|main|major|make|mammal|man|manage|mandate|mango|mansion|manual|maple|marble|march|margin|marine|market|marriage|mask|mass|master|match|material|math|matrix|matter|maximum|maze|meadow|mean|measure|meat|mechanic|medal|media|melody|melt|member|memory|mention|menu|mercy|merge|merit|merry|mesh|message|metal|method|middle|midnight|milk|million|mimic|mind|minimum|minor|minute|miracle|mirror|misery|miss|mistake|mix|mixed|mixture|mobile|model|modify|mom|moment|monitor|monkey|monster|month|moon|moral|more|morning|mosquito|mother|motion|motor|mountain|mouse|move|movie|much|muffin|mule|multiply|muscle|museum|mushroom|music|must|mutual|myself|mystery|myth|naive|name|napkin|narrow|nasty|nation|nature|near|neck|need|negative|neglect|neither|nephew|nerve|nest|net|network|neutral|never|news|next|nice|night|noble|noise|nominee|noodle|normal|north|nose|notable|note|nothing|notice|novel|now|nuclear|number|nurse|nut|oak|obey|object|oblige|obscure|observe|obtain|obvious|occur|ocean|october|odor|off|offer|office|often|oil|okay|old|olive|olympic|omit|once|one|onion|online|only|open|opera|opinion|oppose|option|orange|orbit|orchard|order|ordinary|organ|orient|original|orphan|ostrich|other|outdoor|outer|output|outside|oval|oven|over|own|owner|oxygen|oyster|ozone|pact|paddle|page|pair|palace|palm|panda|panel|panic|panther|paper|parade|parent|park|parrot|party|pass|patch|path|patient|patrol|pattern|pause|pave|payment|peace|peanut|pear|peasant|pelican|pen|penalty|pencil|people|pepper|perfect|permit|person|pet|phone|photo|phrase|physical|piano|picnic|picture|piece|pig|pigeon|pill|pilot|pink|pioneer|pipe|pistol|pitch|pizza|place|planet|plastic|plate|play|please|pledge|pluck|plug|plunge|poem|poet|point|polar|pole|police|pond|pony|pool|popular|portion|position|possible|post|potato|pottery|poverty|powder|power|practice|praise|predict|prefer|prepare|present|pretty|prevent|price|pride|primary|print|priority|prison|private|prize|problem|process|produce|profit|program|project|promote|proof|property|prosper|protect|proud|provide|public|pudding|pull|pulp|pulse|pumpkin|punch|pupil|puppy|purchase|purity|purpose|purse|push|put|puzzle|pyramid|quality|quantum|quarter|question|quick|quit|quiz|quote|rabbit|raccoon|race|rack|radar|radio|rail|rain|raise|rally|ramp|ranch|random|range|rapid|rare|rate|rather|raven|raw|razor|ready|real|reason|rebel|rebuild|recall|receive|recipe|record|recycle|reduce|reflect|reform|refuse|region|regret|regular|reject|relax|release|relief|rely|remain|remember|remind|remove|render|renew|rent|reopen|repair|repeat|replace|report|require|rescue|resemble|resist|resource|response|result|retire|retreat|return|reunion|reveal|review|reward|rhythm|rib|ribbon|rice|rich|ride|ridge|rifle|right|rigid|ring|riot|ripple|risk|ritual|rival|river|road|roast|robot|robust|rocket|romance|roof|rookie|room|rose|rotate|rough|round|route|royal|rubber|rude|rug|rule|run|runway|rural|sad|saddle|sadness|safe|sail|salad|salmon|salon|salt|salute|same|sample|sand|satisfy|satoshi|sauce|sausage|save|say|scale|scan|scare|scatter|scene|scheme|school|science|scissors|scorpion|scout|scrap|screen|script|scrub|sea|search|season|seat|second|secret|section|security|seed|seek|segment|select|sell|seminar|senior|sense|sentence|series|service|session|settle|setup|seven|shadow|shaft|shallow|share|shed|shell|sheriff|shield|shift|shine|ship|shiver|shock|shoe|shoot|shop|short|shoulder|shove|shrimp|shrug|shuffle|shy|sibling|sick|side|siege|sight|sign|silent|silk|silly|silver|similar|simple|since|sing|siren|sister|situate|six|size|skate|sketch|ski|skill|skin|skirt|skull|slab|slam|sleep|slender|slice|slide|slight|slim|slogan|slot|slow|slush|small|smart|smile|smoke|smooth|snack|snake|snap|sniff|snow|soap|soccer|social|sock|soda|soft|solar|soldier|solid|solution|solve|someone|song|soon|sorry|sort|soul|sound|soup|source|south|space|spare|spatial|spawn|speak|special|speed|spell|spend|sphere|spice|spider|spike|spin|spirit|split|spoil|sponsor|spoon|sport|spot|spray|spread|spring|spy|square|squeeze|squirrel|stable|stadium|staff|stage|stairs|stamp|stand|start|state|stay|steak|steel|stem|step|stereo|stick|still|sting|stock|stomach|stone|stool|story|stove|strategy|street|strike|strong|struggle|student|stuff|stumble|style|subject|submit|subway|success|such|sudden|suffer|sugar|suggest|suit|summer|sun|sunny|sunset|super|supply|supreme|sure|surface|surge|surprise|surround|survey|suspect|sustain|swallow|swamp|swap|swarm|swear|sweet|swift|swim|swing|switch|sword|symbol|symptom|syrup|system|table|tackle|tag|tail|talent|talk|tank|tape|target|task|taste|tattoo|taxi|teach|team|tell|ten|tenant|tennis|tent|term|test|text|thank|that|theme|then|theory|there|they|thing|this|thought|three|thrive|throw|thumb|thunder|ticket|tide|tiger|tilt|timber|time|tiny|tip|tired|tissue|title|toast|tobacco|today|toddler|toe|together|toilet|token|tomato|tomorrow|tone|tongue|tonight|tool|tooth|top|topic|topple|torch|tornado|tortoise|toss|total|tourist|toward|tower|town|toy|track|trade|traffic|tragic|train|transfer|trap|trash|travel|tray|treat|tree|trend|trial|tribe|trick|trigger|trim|trip|trophy|trouble|truck|true|truly|trumpet|trust|truth|try|tube|tuition|tumble|tuna|tunnel|turkey|turn|turtle|twelve|twenty|twice|twin|twist|two|type|typical|ugly|umbrella|unable|unaware|uncle|uncover|under|undo|unfair|unfold|unhappy|uniform|unique|unit|universe|unknown|unlock|until|unusual|unveil|update|upgrade|uphold|upon|upper|upset|urban|urge|usage|use|used|useful|useless|usual|utility|vacant|vacuum|vague|valid|valley|valve|van|vanish|vapor|various|vast|vault|vehicle|velvet|vendor|venture|venue|verb|verify|version|very|vessel|veteran|viable|vibrant|vicious|victory|video|view|village|vintage|violin|virtual|virus|visa|visit|visual|vital|vivid|vocal|voice|void|volcano|volume|vote|voyage|wage|wagon|wait|walk|wall|walnut|want|warfare|warm|warrior|wash|wasp|waste|water|wave|way|wealth|weapon|wear|weasel|weather|web|wedding|weekend|weird|welcome|west|wet|whale|what|wheat|wheel|when|where|whip|whisper|wide|width|wife|wild|will|win|window|wine|wing|wink|winner|winter|wire|wisdom|wise|wish|witness|wolf|woman|wonder|wood|wool|word|work|world|worry|worth|wrap|wreck|wrestle|wrist|write|wrong|yard|year|yellow|you|young|youth|zebra|zero|zone|zoo".split("|"), uo = "Invalid mnemonic", Ef = "Invalid entropy", k0 = "Invalid mnemonic checksum";
function Di(t) {
  return (t || "").normalize("NFKD");
}
function kf(t) {
  return parseInt(t, 2);
}
function Tf(t) {
  return t.map((e) => e.toString(2).padStart(8, "0")).join("");
}
function Mf(t) {
  return Tf(Array.from(E0(t))).slice(0, t.length * 8 / 32);
}
function lo(t, e) {
  return Nf(it(Di(t)), it(`mnemonic${Di(e)}`)).password;
}
function Sf(t, e = Lf) {
  const n = Di(t).split(" ");
  if (n.length % 3 !== 0)
    throw new Error(uo);
  const r = n.map((p) => {
    const m = e.indexOf(p);
    if (m === -1)
      throw new Error(uo);
    return m.toString(2).padStart(11, "0");
  }).join(""), i = Math.floor(r.length / 33) * 32, s = r.slice(0, i), o = r.slice(i), f = s.match(/(.{1,8})/g), u = f == null ? void 0 : f.map(kf);
  if (!u || u.length % 4 !== 0 || u.length < 16 || u.length > 32)
    throw new Error(Ef);
  const h = W(u);
  if (Mf(h) !== o)
    throw new Error(k0);
  return h;
}
function T0(t, e = Lf) {
  if (t.length % 4 !== 0 || t.length < 16 || t.length > 32)
    throw new Error(Ef);
  const n = `${Tf(Array.from(t))}${Mf(t)}`.match(/(.{1,11})/g), r = n == null ? void 0 : n.map((i) => e[kf(i)]);
  if (!r || r.length < 12)
    throw new Error("Unable to map entropy to mnemonic");
  return r.join(" ");
}
function M0(t, e) {
  try {
    Sf(t, e);
  } catch {
    return !1;
  }
  return !0;
}
function S0(t, e, n) {
  return !$e || Je() ? Eu(t) : Sf(t, e);
}
function zf(t, e, n) {
  return !$e || Je() ? Mu(t) : M0(t, e);
}
function z0(t, e = "", n, r = 32) {
  if (zf(t)) {
    if (![32, 64].includes(r))
      throw new Error(`Invalid seed length ${r}, expected 32 or 64`);
  } else throw new Error("Invalid bip39 mnemonic specified");
  return r === 32 ? !$e || Je() ? Tu(t, e) : lo(t, e).subarray(0, 32) : lo(t, e);
}
function A0(t, e = "", n, r) {
  if (zf(t, n)) {
    if (Je())
      return ku(t, e);
  } else throw new Error("Invalid bip39 mnemonic specified");
  const i = S0(t, n), s = it(`mnemonic${e}`);
  return Nf(i, s).password.slice(0, 32);
}
function $n(t, e) {
  return t << e | t >>> 32 - e;
}
function fn(t, e) {
  let n = t[e + 3] & 255;
  return n = n << 8 | t[e + 2] & 255, n = n << 8 | t[e + 1] & 255, n << 8 | t[e + 0] & 255;
}
function vi(t, e, n) {
  for (let r = 0; r < 4; r++)
    t[e + r] = n & 255, n >>>= 8;
}
function j0(t, e, n, r, i) {
  let s = 0;
  for (let o = 0; o < i; o++)
    s |= t[e + o] ^ n[r + o];
  return (1 & s - 1 >>> 8) - 1;
}
function Bi(t, e, n, r, i) {
  const s = new Uint32Array(16), o = new Uint32Array(16), f = new Uint32Array(16), u = new Uint32Array(4);
  let h, p, m;
  for (h = 0; h < 4; h++)
    o[5 * h] = fn(r, 4 * h), o[1 + h] = fn(n, 4 * h), o[6 + h] = fn(e, 4 * h), o[11 + h] = fn(n, 16 + 4 * h);
  for (h = 0; h < 16; h++)
    f[h] = o[h];
  for (h = 0; h < 20; h++) {
    for (p = 0; p < 4; p++) {
      for (m = 0; m < 4; m++)
        u[m] = o[(5 * p + 4 * m) % 16];
      for (u[1] ^= $n(u[0] + u[3] | 0, 7), u[2] ^= $n(u[1] + u[0] | 0, 9), u[3] ^= $n(u[2] + u[1] | 0, 13), u[0] ^= $n(u[3] + u[2] | 0, 18), m = 0; m < 4; m++)
        s[4 * p + (p + m) % 4] = u[m];
    }
    for (m = 0; m < 16; m++)
      o[m] = s[m];
  }
  if (i) {
    for (h = 0; h < 16; h++)
      o[h] = o[h] + f[h] | 0;
    for (h = 0; h < 4; h++)
      o[5 * h] = o[5 * h] - fn(r, 4 * h) | 0, o[6 + h] = o[6 + h] - fn(e, 4 * h) | 0;
    for (h = 0; h < 4; h++)
      vi(t, 4 * h, o[5 * h]), vi(t, 16 + 4 * h, o[6 + h]);
  } else
    for (h = 0; h < 16; h++)
      vi(t, 4 * h, o[h] + f[h] | 0);
}
const Fi = new Uint8Array([101, 120, 112, 97, 110, 100, 32, 51, 50, 45, 98, 121, 116, 101, 32, 107]);
function H0(t, e, n, r, i, s, o) {
  const f = new Uint8Array(16), u = new Uint8Array(64);
  let h, p;
  if (!i)
    return 0;
  for (p = 0; p < 16; p++)
    f[p] = 0;
  for (p = 0; p < 8; p++)
    f[p] = s[p];
  for (; i >= 64; ) {
    for (Bi(u, f, o, Fi, !1), p = 0; p < 64; p++)
      t[e + p] = (n ? n[r + p] : 0) ^ u[p];
    for (h = 1, p = 8; p < 16; p++)
      h = h + (f[p] & 255) | 0, f[p] = h & 255, h >>>= 8;
    i -= 64, e += 64, n && (r += 64);
  }
  if (i > 0)
    for (Bi(u, f, o, Fi, !1), p = 0; p < i; p++)
      t[e + p] = (n ? n[r + p] : 0) ^ u[p];
  return 0;
}
function Ci(t, e, n, r, i, s, o) {
  const f = new Uint8Array(32);
  return Bi(f, s, o, Fi, !0), H0(t, e, n, r, i, s.subarray(16), f);
}
function wi(t, e) {
  let n = 0;
  for (let r = 0; r < 17; r++)
    n = n + (t[r] + e[r] | 0) | 0, t[r] = n & 255, n >>>= 8;
}
const R0 = new Uint32Array([5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 252]);
function Af(t, e, n, r, i, s) {
  let o, f, u;
  const h = new Uint32Array(17), p = new Uint32Array(17), m = new Uint32Array(17), O = new Uint32Array(17), L = new Uint32Array(17);
  for (f = 0; f < 17; f++)
    p[f] = m[f] = 0;
  for (f = 0; f < 16; f++)
    p[f] = s[f];
  for (p[3] &= 15, p[4] &= 252, p[7] &= 15, p[8] &= 252, p[11] &= 15, p[12] &= 252, p[15] &= 15; i > 0; ) {
    for (f = 0; f < 17; f++)
      O[f] = 0;
    for (f = 0; f < 16 && f < i; ++f)
      O[f] = n[r + f];
    for (O[f] = 1, r += f, i -= f, wi(m, O), o = 0; o < 17; o++)
      for (h[o] = 0, f = 0; f < 17; f++)
        h[o] = h[o] + m[f] * (f <= o ? p[o - f] : 320 * p[o + 17 - f] | 0) | 0 | 0;
    for (o = 0; o < 17; o++)
      m[o] = h[o];
    for (u = 0, f = 0; f < 16; f++)
      u = u + m[f] | 0, m[f] = u & 255, u >>>= 8;
    for (u = u + m[16] | 0, m[16] = u & 3, u = 5 * (u >>> 2) | 0, f = 0; f < 16; f++)
      u = u + m[f] | 0, m[f] = u & 255, u >>>= 8;
    u = u + m[16] | 0, m[16] = u;
  }
  for (f = 0; f < 17; f++)
    L[f] = m[f];
  wi(m, R0);
  const N = -(m[16] >>> 7) | 0;
  for (f = 0; f < 17; f++)
    m[f] ^= N & (L[f] ^ m[f]);
  for (f = 0; f < 16; f++)
    O[f] = s[f + 16];
  for (O[16] = 0, wi(m, O), f = 0; f < 16; f++)
    t[e + f] = m[f];
  return 0;
}
function I0(t, e, n, r, i, s) {
  const o = new Uint8Array(16);
  return Af(o, 0, n, r, i, s), j0(t, e, o, 0, 16);
}
function U0(t, e, n, r, i) {
  if (n < 32)
    return -1;
  Ci(t, 0, e, 0, n, r, i), Af(t, 16, t, 32, n - 32, t);
  for (let s = 0; s < 16; s++)
    t[s] = 0;
  return 0;
}
function X0(t, e, n, r, i) {
  const s = new Uint8Array(32);
  if (n < 32 || (Ci(s, 0, null, 0, 32, r, i), I0(e, 16, e, 32, n - 32, s) !== 0))
    return -1;
  Ci(t, 0, e, 0, n, r, i);
  for (let o = 0; o < 32; o++)
    t[o] = 0;
  return 0;
}
const D0 = 32, B0 = 24, Zi = 32, Vi = 16;
function jf(t, e) {
  if (t.length !== D0)
    throw new Error("bad key size");
  if (e.length !== B0)
    throw new Error("bad nonce size");
}
function Hf(...t) {
  for (let e = 0, n = t.length; e < n; e++)
    if (!(t[e] instanceof Uint8Array))
      throw new TypeError("unexpected type, use Uint8Array");
}
function F0(t, e, n) {
  Hf(t, e, n), jf(n, e);
  const r = new Uint8Array(Zi + t.length), i = new Uint8Array(r.length);
  for (let s = 0; s < t.length; s++)
    r[s + Zi] = t[s];
  return U0(i, r, r.length, e, n), i.subarray(Vi);
}
function C0(t, e, n) {
  Hf(t, e, n), jf(n, e);
  const r = new Uint8Array(Vi + t.length), i = new Uint8Array(r.length);
  for (let s = 0; s < t.length; s++)
    r[s + Vi] = t[s];
  return r.length < 32 || X0(i, r, r.length, e, n) !== 0 ? null : i.subarray(Zi);
}
function Z0(t, e, n) {
  return C0(t, e, n);
}
function V0(t, e, n = zr(24)) {
  return {
    encrypted: F0(t, n, e),
    nonce: n
  };
}
function ho(t, e, n, r, i, s) {
  let o = t[e++] ^ n[r++], f = t[e++] ^ n[r++], u = t[e++] ^ n[r++], h = t[e++] ^ n[r++], p = t[e++] ^ n[r++], m = t[e++] ^ n[r++], O = t[e++] ^ n[r++], L = t[e++] ^ n[r++], N = t[e++] ^ n[r++], x = t[e++] ^ n[r++], E = t[e++] ^ n[r++], T = t[e++] ^ n[r++], M = t[e++] ^ n[r++], S = t[e++] ^ n[r++], A = t[e++] ^ n[r++], j = t[e++] ^ n[r++], z = o, U = f, H = u, G = h, V = p, I = m, B = O, P = L, a = N, c = x, d = E, g = T, b = M, w = S, k = A, y = j;
  for (let l = 0; l < 8; l += 2)
    V ^= ne(z + b | 0, 7), a ^= ne(V + z | 0, 9), b ^= ne(a + V | 0, 13), z ^= ne(b + a | 0, 18), c ^= ne(I + U | 0, 7), w ^= ne(c + I | 0, 9), U ^= ne(w + c | 0, 13), I ^= ne(U + w | 0, 18), k ^= ne(d + B | 0, 7), H ^= ne(k + d | 0, 9), B ^= ne(H + k | 0, 13), d ^= ne(B + H | 0, 18), G ^= ne(y + g | 0, 7), P ^= ne(G + y | 0, 9), g ^= ne(P + G | 0, 13), y ^= ne(g + P | 0, 18), U ^= ne(z + G | 0, 7), H ^= ne(U + z | 0, 9), G ^= ne(H + U | 0, 13), z ^= ne(G + H | 0, 18), B ^= ne(I + V | 0, 7), P ^= ne(B + I | 0, 9), V ^= ne(P + B | 0, 13), I ^= ne(V + P | 0, 18), g ^= ne(d + c | 0, 7), a ^= ne(g + d | 0, 9), c ^= ne(a + g | 0, 13), d ^= ne(c + a | 0, 18), b ^= ne(y + k | 0, 7), w ^= ne(b + y | 0, 9), k ^= ne(w + b | 0, 13), y ^= ne(k + w | 0, 18);
  i[s++] = o + z | 0, i[s++] = f + U | 0, i[s++] = u + H | 0, i[s++] = h + G | 0, i[s++] = p + V | 0, i[s++] = m + I | 0, i[s++] = O + B | 0, i[s++] = L + P | 0, i[s++] = N + a | 0, i[s++] = x + c | 0, i[s++] = E + d | 0, i[s++] = T + g | 0, i[s++] = M + b | 0, i[s++] = S + w | 0, i[s++] = A + k | 0, i[s++] = j + y | 0;
}
function xi(t, e, n, r, i) {
  let s = r + 0, o = r + 16 * i;
  for (let f = 0; f < 16; f++)
    n[o + f] = t[e + (2 * i - 1) * 16 + f];
  for (let f = 0; f < i; f++, s += 16, e += 16)
    ho(n, o, t, e, n, s), f > 0 && (o += 16), ho(n, s, t, e += 16, n, o);
}
function G0(t, e, n) {
  const r = Aa({
    dkLen: 32,
    asyncTick: 10,
    maxmem: 1073742848
  }, n), { N: i, r: s, p: o, dkLen: f, asyncTick: u, maxmem: h, onProgress: p } = r;
  if (et(i), et(s), et(o), et(f), et(u), et(h), p !== void 0 && typeof p != "function")
    throw new Error("progressCb should be function");
  const m = 128 * s, O = m / 4;
  if (i <= 1 || i & i - 1 || i > 2 ** 32)
    throw new Error("Scrypt: N must be larger than 1, a power of 2, and less than 2^32");
  if (o < 0 || o > (2 ** 32 - 1) * 32 / m)
    throw new Error("Scrypt: p must be a positive integer less than or equal to ((2^32 - 1) * 32) / (128 * r)");
  if (f < 0 || f > (2 ** 32 - 1) * 32)
    throw new Error("Scrypt: dkLen should be positive integer less than or equal to (2^32 - 1) * 32");
  const L = m * (i + o);
  if (L > h)
    throw new Error(`Scrypt: parameters too large, ${L} (128 * r * (N + p)) > ${h} (maxmem)`);
  const N = ys(Hr, t, e, { c: 1, dkLen: m * o }), x = qt(N), E = qt(new Uint8Array(m * i)), T = qt(new Uint8Array(m));
  let M = () => {
  };
  if (p) {
    const S = 2 * i * o, A = Math.max(Math.floor(S / 1e4), 1);
    let j = 0;
    M = () => {
      j++, p && (!(j % A) || j === S) && p(j / S);
    };
  }
  return { N: i, r: s, p: o, dkLen: f, blockSize32: O, V: E, B32: x, B: N, tmp: T, blockMixCb: M, asyncTick: u };
}
function q0(t, e, n, r, i) {
  const s = ys(Hr, t, n, { c: 1, dkLen: e });
  return n.fill(0), r.fill(0), i.fill(0), s;
}
function Y0(t, e, n) {
  const { N: r, r: i, p: s, dkLen: o, blockSize32: f, V: u, B32: h, B: p, tmp: m, blockMixCb: O } = G0(t, e, n);
  mt || xt(h);
  for (let L = 0; L < s; L++) {
    const N = f * L;
    for (let x = 0; x < f; x++)
      u[x] = h[N + x];
    for (let x = 0, E = 0; x < r - 1; x++)
      xi(u, E, u, E += f, i), O();
    xi(u, (r - 1) * f, h, N, i), O();
    for (let x = 0; x < r; x++) {
      const E = h[N + f - 16] % r;
      for (let T = 0; T < f; T++)
        m[T] = h[N + T] ^ u[E * f + T];
      xi(m, 0, h, N, i), O();
    }
  }
  return mt || xt(h), q0(t, o, p, u, m);
}
const cr = {
  N: 32768,
  p: 1,
  r: 8
};
function Rf(t, e = zr(), n = cr, r) {
  const i = W(t);
  return {
    params: n,
    password: !$e || Je() ? Qu(i, e, Math.log2(n.N), n.r, n.p) : Y0(i, e, Lr({ dkLen: 64 }, n)),
    salt: e
  };
}
function W0(t) {
  const e = t.subarray(0, 32), n = ii(t.subarray(32, 36), fi).toNumber(), r = ii(t.subarray(36, 40), fi).toNumber(), i = ii(t.subarray(40, 44), fi).toNumber();
  if (n !== cr.N || r !== cr.p || i !== cr.r)
    throw new Error("Invalid injected scrypt params found");
  return { params: { N: n, p: r, r: i }, salt: e };
}
function K0(t, { N: e, p: n, r }) {
  return Qe(t, ot(e, ci), ot(n, ci), ot(r, ci));
}
const If = ["scrypt", "xsalsa20-poly1305"], J0 = ["none"], Q0 = "3", po = 24, _0 = 32 + 3 * 4;
function $0(t, e, n = If) {
  if (t) {
    if (n.includes("xsalsa20-poly1305") && !e)
      throw new Error("Password required to decode encrypted data");
  } else throw new Error("No encrypted data available to decode");
  let r = t;
  if (e) {
    let i;
    if (n.includes("scrypt")) {
      const { params: s, salt: o } = W0(t);
      i = Rf(e, o, s).password, t = t.subarray(_0);
    } else
      i = it(e);
    r = Z0(t.subarray(po), t.subarray(0, po), Dc(i, 256, !0));
  }
  if (!r)
    throw new Error("Unable to decode using the supplied passphrase");
  return r;
}
function ep(t, e, n) {
  return {
    encoded: r0(t),
    encoding: {
      content: e,
      type: n ? If : J0,
      version: Q0
    }
  };
}
const mo = (t) => (e, n, r) => f0(e, n, r, t), Uf = [
  ["ecdsa", mo("blake2")],
  ["ethereum", mo("keccak")]
], tp = [
  ["ed25519", of],
  ["sr25519", lf],
  ...Uf
], np = ["ed25519", "sr25519", "ecdsa"];
function Xf(t, { message: e, publicKey: n, signature: r }, i = tp) {
  return t.isValid = i.some(([s, o]) => {
    try {
      if (o(e, r, n))
        return t.crypto = s, !0;
    } catch {
    }
    return !1;
  }), t;
}
function rp(t, { message: e, publicKey: n, signature: r }) {
  if (![0, 1, 2].includes(r[0]))
    throw new Error(`Unknown crypto type, expected signature prefix [0..2], found ${r[0]}`);
  const i = np[r[0]] || "none";
  t.crypto = i;
  try {
    t.isValid = {
      ecdsa: () => Xf(t, { message: e, publicKey: n, signature: r.subarray(1) }, Uf).isValid,
      ed25519: () => of(e, r.subarray(1), n),
      none: () => {
        throw Error("no verify for `none` crypto type");
      },
      sr25519: () => lf(e, r.subarray(1), n)
    }[i]();
  } catch {
  }
  return t;
}
function ip(t) {
  return [0, 1, 2].includes(t[0]) && [65, 66].includes(t.length) ? rp : Xf;
}
function go(t, e, n) {
  const r = W(e);
  if (![64, 65, 66].includes(r.length))
    throw new Error(`Invalid signature length, expected [64..66] bytes, found ${r.length}`);
  const i = mn(n), s = { message: W(t), publicKey: i, signature: r }, o = { crypto: "none", isValid: !1, isWrapped: pr(s.message, !0), publicKey: i }, f = pr(s.message, !1), u = ip(r);
  return u(o, s), o.crypto !== "none" || o.isWrapped && !f ? o : (s.message = f ? Cc(s.message) : Zc(s.message), u(o, s));
}
const dn = new Uint8Array([161, 35, 3, 33, 0]), br = new Uint8Array([48, 83, 2, 1, 1, 48, 5, 6, 3, 43, 101, 112, 4, 34, 4, 32]), sp = 32, bo = 64, op = 32, Tn = br.length;
function ap(t, e, n) {
  const r = Array.isArray(n) || n === void 0 ? n : [n], i = $0(e, t, r), s = i.subarray(0, br.length);
  if (!Nt(s, br))
    throw new Error("Invalid Pkcs8 header found in body");
  let o = i.subarray(Tn, Tn + bo), f = Tn + bo, u = i.subarray(f, f + dn.length);
  if (!Nt(u, dn) && (f = Tn + op, o = i.subarray(Tn, f), u = i.subarray(f, f + dn.length), !Nt(u, dn)))
    throw new Error("Invalid Pkcs8 divider found in body");
  const h = f + dn.length;
  return {
    publicKey: i.subarray(h, h + sp),
    secretKey: o
  };
}
function fp({ publicKey: t, secretKey: e }, n) {
  if (!e)
    throw new Error("Expected a valid secretKey to be passed to encode");
  const r = Qe(br, e, dn, t);
  if (!n)
    return r;
  const { params: i, password: s, salt: o } = Rf(n), { encrypted: f, nonce: u } = V0(r, s.subarray(0, 32));
  return Qe(K0(o, i), u, f);
}
function cp(t, { address: e, meta: n }, r, i) {
  return Lr(ep(r, ["pkcs8", t], i), {
    address: e,
    meta: n
  });
}
const up = new Uint8Array(), lp = {
  ecdsa: Pn,
  ed25519: ds,
  ethereum: Pn,
  sr25519: uf
}, yo = {
  ecdsa: new Uint8Array([2]),
  ed25519: new Uint8Array([0]),
  ethereum: new Uint8Array([2]),
  sr25519: new Uint8Array([1])
}, vo = {
  ecdsa: (t, e) => co(t, e, "blake2"),
  ed25519: jh,
  ethereum: (t, e) => co(t, e, "keccak"),
  sr25519: Fh
}, er = {
  ecdsa: (t) => t.length > 32 ? _t(t) : t,
  ed25519: (t) => t,
  ethereum: (t) => t.length === 20 ? t : jr(ps(t)),
  sr25519: (t) => t
};
function Mn(t) {
  return !t || la(t);
}
function wo(t, e, n) {
  return _t(Qe(e || "", n || "", t));
}
function hn({ toSS58: t, type: e }, { publicKey: n, secretKey: r }, i = {}, s = null, o) {
  const f = (p, m) => {
    const O = ap(p, m || s, o);
    if (O.secretKey.length === 64)
      n = O.publicKey, r = O.secretKey;
    else {
      const L = lp[e](O.secretKey);
      n = L.publicKey, r = L.secretKey;
    }
  }, u = (p) => (Mn(r) && s && f(p, s), s = fp({ publicKey: n, secretKey: r }, p), o = void 0, s), h = () => {
    const p = er[e](n);
    return e === "ethereum" ? yf(p) : t(p);
  };
  return {
    get address() {
      return h();
    },
    get addressRaw() {
      const p = er[e](n);
      return e === "ethereum" ? p.slice(-20) : p;
    },
    get isLocked() {
      return Mn(r);
    },
    get meta() {
      return i;
    },
    get publicKey() {
      return n;
    },
    get type() {
      return e;
    },
    // eslint-disable-next-line sort-keys
    decodePkcs8: f,
    derive: (p, m) => {
      if (e === "ethereum")
        throw new Error("Unable to derive on this keypair");
      if (Mn(r))
        throw new Error("Cannot derive on a locked keypair");
      const { path: O } = Ca(p), L = cf({ publicKey: n, secretKey: r }, O, e);
      return hn({ toSS58: t, type: e }, L, m, null);
    },
    encodePkcs8: (p) => u(p),
    lock: () => {
      r = new Uint8Array();
    },
    setMeta: (p) => {
      i = Lr({}, i, p);
    },
    sign: (p, m = {}) => {
      if (Mn(r))
        throw new Error("Cannot sign with a locked key pair");
      return Qe(m.withType ? yo[e] : up, vo[e](W(p), { publicKey: n, secretKey: r }));
    },
    toJson: (p) => {
      const m = ["ecdsa", "ethereum"].includes(e) ? n.length === 20 ? Wt(n) : Wt(gf(n)) : h();
      return cp(e, { address: m, meta: i }, u(p), !!p);
    },
    unlock: (p) => f(p),
    verify: (p, m, O) => go(p, m, er[e](W(O))).isValid,
    vrfSign: (p, m, O) => {
      if (Mn(r))
        throw new Error("Cannot sign with a locked key pair");
      if (e === "sr25519")
        return Ch(p, { secretKey: r }, m, O);
      const L = vo[e](W(p), { publicKey: n, secretKey: r });
      return Qe(wo(L, m, O), L);
    },
    vrfVerify: (p, m, O, L, N) => e === "sr25519" ? Zh(p, m, n, L, N) : go(p, Qe(yo[e], m.subarray(32)), er[e](W(O))).isValid && Nt(m.subarray(0, 32), wo(m.subarray(32), L, N))
  };
}
const dp = "bottom drive obey lake curtain smoke basket hold race lonely fit walk";
class hp {
  constructor() {
    re(this, "__internal__map", {});
  }
  add(e) {
    return this.__internal__map[mn(e.address).toString()] = e, e;
  }
  all() {
    return Object.values(this.__internal__map);
  }
  get(e) {
    const n = this.__internal__map[mn(e).toString()];
    if (!n)
      throw new Error(`Unable to retrieve keypair '${Kt(e) || Mt(e) ? Wt(W(e)) : e}'`);
    return n;
  }
  remove(e) {
    delete this.__internal__map[mn(e).toString()];
  }
}
const Pi = {
  ecdsa: (t) => Pn(t),
  ed25519: (t) => ds(t),
  ethereum: (t) => Pn(t),
  sr25519: (t) => uf(t)
};
function pp({ publicKey: t }) {
  return t;
}
class mp {
  constructor(e = {}) {
    re(this, "__internal__pairs");
    re(this, "__internal__type");
    re(this, "__internal__ss58");
    re(this, "decodeAddress", mn);
    /**
     * @name encodeAddress
     * @description Encodes the input into an ss58 representation
     */
    re(this, "encodeAddress", (e, n) => this.type === "ethereum" ? yf(e) : Vh(e, n ?? this.__internal__ss58));
    if (e.type = e.type || "ed25519", !["ecdsa", "ethereum", "ed25519", "sr25519"].includes(e.type || "undefined"))
      throw new Error(`Expected a keyring type of either 'ed25519', 'sr25519', 'ethereum' or 'ecdsa', found '${e.type || "unknown"}`);
    this.__internal__pairs = new hp(), this.__internal__ss58 = e.ss58Format, this.__internal__type = e.type;
  }
  /**
   * @description retrieve the pairs (alias for getPairs)
   */
  get pairs() {
    return this.getPairs();
  }
  /**
   * @description retrieve the publicKeys (alias for getPublicKeys)
   */
  get publicKeys() {
    return this.getPublicKeys();
  }
  /**
   * @description Returns the type of the keyring, ed25519, sr25519 or ecdsa
   */
  get type() {
    return this.__internal__type;
  }
  /**
   * @name addPair
   * @summary Stores an account, given a keyring pair, as a Key/Value (public key, pair) in Keyring Pair Dictionary
   */
  addPair(e) {
    return this.__internal__pairs.add(e);
  }
  /**
   * @name addFromAddress
   * @summary Stores an account, given an account address, as a Key/Value (public key, pair) in Keyring Pair Dictionary
   * @description Allows user to explicitly provide separate inputs including account address or public key, and optionally
   * the associated account metadata, and the default encoded value as arguments (that may be obtained from the json file
   * of an account backup), and then generates a keyring pair from them that it passes to
   * `addPair` to stores in a keyring pair dictionary the public key of the generated pair as a key and the pair as the associated value.
   */
  addFromAddress(e, n = {}, r = null, i = this.type, s, o) {
    const f = this.decodeAddress(e, s);
    return this.addPair(hn({ toSS58: this.encodeAddress, type: i }, { publicKey: f, secretKey: new Uint8Array() }, n, r, o));
  }
  /**
   * @name addFromJson
   * @summary Stores an account, given JSON data, as a Key/Value (public key, pair) in Keyring Pair Dictionary
   * @description Allows user to provide a json object argument that contains account information (that may be obtained from the json file
   * of an account backup), and then generates a keyring pair from it that it passes to
   * `addPair` to stores in a keyring pair dictionary the public key of the generated pair as a key and the pair as the associated value.
   */
  addFromJson(e, n) {
    return this.addPair(this.createFromJson(e, n));
  }
  /**
   * @name addFromMnemonic
   * @summary Stores an account, given a mnemonic, as a Key/Value (public key, pair) in Keyring Pair Dictionary
   * @description Allows user to provide a mnemonic (seed phrase that is provided when account is originally created)
   * argument and a metadata argument that contains account information (that may be obtained from the json file
   * of an account backup), and then generates a keyring pair from it that it passes to
   * `addPair` to stores in a keyring pair dictionary the public key of the generated pair as a key and the pair as the associated value.
   */
  addFromMnemonic(e, n = {}, r = this.type) {
    return this.addFromUri(e, n, r);
  }
  /**
   * @name addFromPair
   * @summary Stores an account created from an explicit publicKey/secreteKey combination
   */
  addFromPair(e, n = {}, r = this.type) {
    return this.addPair(this.createFromPair(e, n, r));
  }
  /**
   * @name addFromSeed
   * @summary Stores an account, given seed data, as a Key/Value (public key, pair) in Keyring Pair Dictionary
   * @description Stores in a keyring pair dictionary the public key of the pair as a key and the pair as the associated value.
   * Allows user to provide the account seed as an argument, and then generates a keyring pair from it that it passes to
   * `addPair` to store in a keyring pair dictionary the public key of the generated pair as a key and the pair as the associated value.
   */
  addFromSeed(e, n = {}, r = this.type) {
    return this.addPair(hn({ toSS58: this.encodeAddress, type: r }, Pi[r](e), n, null));
  }
  /**
   * @name addFromUri
   * @summary Creates an account via an suri
   * @description Extracts the phrase, path and password from a SURI format for specifying secret keys `<secret>/<soft-key>//<hard-key>///<password>` (the `///password` may be omitted, and `/<soft-key>` and `//<hard-key>` maybe repeated and mixed). The secret can be a hex string, mnemonic phrase or a string (to be padded)
   */
  addFromUri(e, n = {}, r = this.type) {
    return this.addPair(this.createFromUri(e, n, r));
  }
  /**
   * @name createFromJson
   * @description Creates a pair from a JSON keyfile
   */
  createFromJson({ address: e, encoded: n, encoding: { content: r, type: i, version: s }, meta: o }, f) {
    if (s === "3" && r[0] !== "pkcs8")
      throw new Error(`Unable to decode non-pkcs8 type, [${r.join(",")}] found}`);
    const u = s === "0" || !Array.isArray(r) ? this.type : r[1], h = Array.isArray(i) ? i : [i];
    if (!["ed25519", "sr25519", "ecdsa", "ethereum"].includes(u))
      throw new Error(`Unknown crypto type ${u}`);
    const p = Mt(e) ? pn(e) : this.decodeAddress(e, f), m = Mt(n) ? pn(n) : n0(n);
    return hn({ toSS58: this.encodeAddress, type: u }, { publicKey: p, secretKey: new Uint8Array() }, o, m, h);
  }
  /**
   * @name createFromPair
   * @summary Creates a pair from an explicit publicKey/secreteKey combination
   */
  createFromPair(e, n = {}, r = this.type) {
    return hn({ toSS58: this.encodeAddress, type: r }, e, n, null);
  }
  /**
   * @name createFromUri
   * @summary Creates a Keypair from an suri
   * @description This creates a pair from the suri, but does not add it to the keyring
   */
  createFromUri(e, n = {}, r = this.type) {
    const i = e.startsWith("//") ? `${dp}${e}` : e, { derivePath: s, password: o, path: f, phrase: u } = nd(i);
    let h;
    const p = Mt(u, 256);
    if (p)
      h = pn(u);
    else {
      const O = u.split(" ");
      if ([12, 15, 18, 21, 24].includes(O.length))
        h = r === "ethereum" ? z0(u, "", !1, 64) : A0(u, o);
      else {
        if (u.length > 32)
          throw new Error("specified phrase is not a valid mnemonic and is invalid as a raw seed at > 32 bytes");
        h = it(u.padEnd(32));
      }
    }
    const m = r === "ethereum" ? p ? Pi[r](h) : P0(h, s.substring(1)) : cf(Pi[r](h), f, r);
    return hn({ toSS58: this.encodeAddress, type: r }, m, n, null);
  }
  /**
   * @name getPair
   * @summary Retrieves an account keyring pair from the Keyring Pair Dictionary, given an account address
   * @description Returns a keyring pair value from the keyring pair dictionary by performing
   * a key lookup using the provided account address or public key (after decoding it).
   */
  getPair(e) {
    return this.__internal__pairs.get(e);
  }
  /**
   * @name getPairs
   * @summary Retrieves all account keyring pairs from the Keyring Pair Dictionary
   * @description Returns an array list of all the keyring pair values that are stored in the keyring pair dictionary.
   */
  getPairs() {
    return this.__internal__pairs.all();
  }
  /**
   * @name getPublicKeys
   * @summary Retrieves Public Keys of all Keyring Pairs stored in the Keyring Pair Dictionary
   * @description Returns an array list of all the public keys associated with each of the keyring pair values that are stored in the keyring pair dictionary.
   */
  getPublicKeys() {
    return this.__internal__pairs.all().map(pp);
  }
  /**
   * @name removePair
   * @description Deletes the provided input address or public key from the stored Keyring Pair Dictionary.
   */
  removePair(e) {
    this.__internal__pairs.remove(e);
  }
  /**
   * @name setSS58Format;
   * @description Sets the ss58 format for the keyring
   */
  setSS58Format(e) {
    this.__internal__ss58 = e;
  }
  /**
   * @name toJson
   * @summary Returns a JSON object associated with the input argument that contains metadata assocated with an account
   * @description Returns a JSON object containing the metadata associated with an account
   * when valid address or public key and when the account passphrase is provided if the account secret
   * is not already unlocked and available in memory. Note that in [Polkadot-JS Apps](https://github.com/polkadot-js/apps) the user
   * may backup their account to a JSON file that contains this information.
   */
  toJson(e, n) {
    return this.__internal__pairs.get(e).toJson(n);
  }
}
function gt(t) {
  "@babel/helpers - typeof";
  return gt = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(e) {
    return typeof e;
  } : function(e) {
    return e && typeof Symbol == "function" && e.constructor === Symbol && e !== Symbol.prototype ? "symbol" : typeof e;
  }, gt(t);
}
function ut(t, e) {
  if (!(t instanceof e)) throw new TypeError("Cannot call a class as a function");
}
function gp(t, e) {
  if (gt(t) != "object" || !t) return t;
  var n = t[Symbol.toPrimitive];
  if (n !== void 0) {
    var r = n.call(t, e || "default");
    if (gt(r) != "object") return r;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return (e === "string" ? String : Number)(t);
}
function Df(t) {
  var e = gp(t, "string");
  return gt(e) == "symbol" ? e : e + "";
}
function xo(t, e) {
  for (var n = 0; n < e.length; n++) {
    var r = e[n];
    r.enumerable = r.enumerable || !1, r.configurable = !0, "value" in r && (r.writable = !0), Object.defineProperty(t, Df(r.key), r);
  }
}
function lt(t, e, n) {
  return e && xo(t.prototype, e), n && xo(t, n), Object.defineProperty(t, "prototype", {
    writable: !1
  }), t;
}
function Yt(t) {
  if (t === void 0) throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  return t;
}
function Gi(t, e) {
  return Gi = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function(n, r) {
    return n.__proto__ = r, n;
  }, Gi(t, e);
}
function Rr(t, e) {
  if (typeof e != "function" && e !== null) throw new TypeError("Super expression must either be null or a function");
  t.prototype = Object.create(e && e.prototype, {
    constructor: {
      value: t,
      writable: !0,
      configurable: !0
    }
  }), Object.defineProperty(t, "prototype", {
    writable: !1
  }), e && Gi(t, e);
}
function qn(t, e) {
  if (e && (gt(e) == "object" || typeof e == "function")) return e;
  if (e !== void 0) throw new TypeError("Derived constructors may only return object or undefined");
  return Yt(t);
}
function Lt(t) {
  return Lt = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function(e) {
    return e.__proto__ || Object.getPrototypeOf(e);
  }, Lt(t);
}
function At(t, e, n) {
  return (e = Df(e)) in t ? Object.defineProperty(t, e, {
    value: n,
    enumerable: !0,
    configurable: !0,
    writable: !0
  }) : t[e] = n, t;
}
function bp(t) {
  if (Array.isArray(t)) return t;
}
function yp(t) {
  if (typeof Symbol < "u" && t[Symbol.iterator] != null || t["@@iterator"] != null) return Array.from(t);
}
function Po(t, e) {
  (e == null || e > t.length) && (e = t.length);
  for (var n = 0, r = Array(e); n < e; n++) r[n] = t[n];
  return r;
}
function vp(t, e) {
  if (t) {
    if (typeof t == "string") return Po(t, e);
    var n = {}.toString.call(t).slice(8, -1);
    return n === "Object" && t.constructor && (n = t.constructor.name), n === "Map" || n === "Set" ? Array.from(t) : n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n) ? Po(t, e) : void 0;
  }
}
function wp() {
  throw new TypeError(`Invalid attempt to destructure non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`);
}
function xp(t) {
  return bp(t) || yp(t) || vp(t) || wp();
}
function Oo(t, e) {
  var n = Object.keys(t);
  if (Object.getOwnPropertySymbols) {
    var r = Object.getOwnPropertySymbols(t);
    e && (r = r.filter(function(i) {
      return Object.getOwnPropertyDescriptor(t, i).enumerable;
    })), n.push.apply(n, r);
  }
  return n;
}
function No(t) {
  for (var e = 1; e < arguments.length; e++) {
    var n = arguments[e] != null ? arguments[e] : {};
    e % 2 ? Oo(Object(n), !0).forEach(function(r) {
      At(t, r, n[r]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(t, Object.getOwnPropertyDescriptors(n)) : Oo(Object(n)).forEach(function(r) {
      Object.defineProperty(t, r, Object.getOwnPropertyDescriptor(n, r));
    });
  }
  return t;
}
var Pp = {
  type: "logger",
  log: function(e) {
    this.output("log", e);
  },
  warn: function(e) {
    this.output("warn", e);
  },
  error: function(e) {
    this.output("error", e);
  },
  output: function(e, n) {
    console && console[e] && console[e].apply(console, n);
  }
}, Op = function() {
  function t(e) {
    var n = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
    ut(this, t), this.init(e, n);
  }
  return lt(t, [{
    key: "init",
    value: function(n) {
      var r = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
      this.prefix = r.prefix || "i18next:", this.logger = n || Pp, this.options = r, this.debug = r.debug;
    }
  }, {
    key: "setDebug",
    value: function(n) {
      this.debug = n;
    }
  }, {
    key: "log",
    value: function() {
      for (var n = arguments.length, r = new Array(n), i = 0; i < n; i++)
        r[i] = arguments[i];
      return this.forward(r, "log", "", !0);
    }
  }, {
    key: "warn",
    value: function() {
      for (var n = arguments.length, r = new Array(n), i = 0; i < n; i++)
        r[i] = arguments[i];
      return this.forward(r, "warn", "", !0);
    }
  }, {
    key: "error",
    value: function() {
      for (var n = arguments.length, r = new Array(n), i = 0; i < n; i++)
        r[i] = arguments[i];
      return this.forward(r, "error", "");
    }
  }, {
    key: "deprecate",
    value: function() {
      for (var n = arguments.length, r = new Array(n), i = 0; i < n; i++)
        r[i] = arguments[i];
      return this.forward(r, "warn", "WARNING DEPRECATED: ", !0);
    }
  }, {
    key: "forward",
    value: function(n, r, i, s) {
      return s && !this.debug ? null : (typeof n[0] == "string" && (n[0] = "".concat(i).concat(this.prefix, " ").concat(n[0])), this.logger[r](n));
    }
  }, {
    key: "create",
    value: function(n) {
      return new t(this.logger, No(No({}, {
        prefix: "".concat(this.prefix, ":").concat(n, ":")
      }), this.options));
    }
  }, {
    key: "clone",
    value: function(n) {
      return n = n || this.options, n.prefix = n.prefix || this.prefix, new t(this.logger, n);
    }
  }]), t;
}(), Ot = new Op(), Qt = function() {
  function t() {
    ut(this, t), this.observers = {};
  }
  return lt(t, [{
    key: "on",
    value: function(n, r) {
      var i = this;
      return n.split(" ").forEach(function(s) {
        i.observers[s] = i.observers[s] || [], i.observers[s].push(r);
      }), this;
    }
  }, {
    key: "off",
    value: function(n, r) {
      if (this.observers[n]) {
        if (!r) {
          delete this.observers[n];
          return;
        }
        this.observers[n] = this.observers[n].filter(function(i) {
          return i !== r;
        });
      }
    }
  }, {
    key: "emit",
    value: function(n) {
      for (var r = arguments.length, i = new Array(r > 1 ? r - 1 : 0), s = 1; s < r; s++)
        i[s - 1] = arguments[s];
      if (this.observers[n]) {
        var o = [].concat(this.observers[n]);
        o.forEach(function(u) {
          u.apply(void 0, i);
        });
      }
      if (this.observers["*"]) {
        var f = [].concat(this.observers["*"]);
        f.forEach(function(u) {
          u.apply(u, [n].concat(i));
        });
      }
    }
  }]), t;
}();
function Sn() {
  var t, e, n = new Promise(function(r, i) {
    t = r, e = i;
  });
  return n.resolve = t, n.reject = e, n;
}
function Lo(t) {
  return t == null ? "" : "" + t;
}
function Np(t, e, n) {
  t.forEach(function(r) {
    e[r] && (n[r] = e[r]);
  });
}
function vs(t, e, n) {
  function r(f) {
    return f && f.indexOf("###") > -1 ? f.replace(/###/g, ".") : f;
  }
  function i() {
    return !t || typeof t == "string";
  }
  for (var s = typeof e != "string" ? [].concat(e) : e.split("."); s.length > 1; ) {
    if (i()) return {};
    var o = r(s.shift());
    !t[o] && n && (t[o] = new n()), Object.prototype.hasOwnProperty.call(t, o) ? t = t[o] : t = {};
  }
  return i() ? {} : {
    obj: t,
    k: r(s.shift())
  };
}
function Eo(t, e, n) {
  var r = vs(t, e, Object), i = r.obj, s = r.k;
  i[s] = n;
}
function Lp(t, e, n, r) {
  var i = vs(t, e, Object), s = i.obj, o = i.k;
  s[o] = s[o] || [], s[o].push(n);
}
function yr(t, e) {
  var n = vs(t, e), r = n.obj, i = n.k;
  if (r)
    return r[i];
}
function ko(t, e, n) {
  var r = yr(t, n);
  return r !== void 0 ? r : yr(e, n);
}
function Bf(t, e, n) {
  for (var r in e)
    r !== "__proto__" && r !== "constructor" && (r in t ? typeof t[r] == "string" || t[r] instanceof String || typeof e[r] == "string" || e[r] instanceof String ? n && (t[r] = e[r]) : Bf(t[r], e[r], n) : t[r] = e[r]);
  return t;
}
function cn(t) {
  return t.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}
var Ep = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
  "/": "&#x2F;"
};
function kp(t) {
  return typeof t == "string" ? t.replace(/[&<>"'\/]/g, function(e) {
    return Ep[e];
  }) : t;
}
var Ir = typeof window < "u" && window.navigator && typeof window.navigator.userAgentData > "u" && window.navigator.userAgent && window.navigator.userAgent.indexOf("MSIE") > -1, Tp = [" ", ",", "?", "!", ";"];
function Mp(t, e, n) {
  e = e || "", n = n || "";
  var r = Tp.filter(function(f) {
    return e.indexOf(f) < 0 && n.indexOf(f) < 0;
  });
  if (r.length === 0) return !0;
  var i = new RegExp("(".concat(r.map(function(f) {
    return f === "?" ? "\\?" : f;
  }).join("|"), ")")), s = !i.test(t);
  if (!s) {
    var o = t.indexOf(n);
    o > 0 && !i.test(t.substring(0, o)) && (s = !0);
  }
  return s;
}
function To(t, e) {
  var n = Object.keys(t);
  if (Object.getOwnPropertySymbols) {
    var r = Object.getOwnPropertySymbols(t);
    e && (r = r.filter(function(i) {
      return Object.getOwnPropertyDescriptor(t, i).enumerable;
    })), n.push.apply(n, r);
  }
  return n;
}
function tr(t) {
  for (var e = 1; e < arguments.length; e++) {
    var n = arguments[e] != null ? arguments[e] : {};
    e % 2 ? To(Object(n), !0).forEach(function(r) {
      At(t, r, n[r]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(t, Object.getOwnPropertyDescriptors(n)) : To(Object(n)).forEach(function(r) {
      Object.defineProperty(t, r, Object.getOwnPropertyDescriptor(n, r));
    });
  }
  return t;
}
function Sp(t) {
  var e = zp();
  return function() {
    var r = Lt(t), i;
    if (e) {
      var s = Lt(this).constructor;
      i = Reflect.construct(r, arguments, s);
    } else
      i = r.apply(this, arguments);
    return qn(this, i);
  };
}
function zp() {
  if (typeof Reflect > "u" || !Reflect.construct || Reflect.construct.sham) return !1;
  if (typeof Proxy == "function") return !0;
  try {
    return Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function() {
    })), !0;
  } catch {
    return !1;
  }
}
function Ff(t, e) {
  var n = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : ".";
  if (t) {
    if (t[e]) return t[e];
    for (var r = e.split(n), i = t, s = 0; s < r.length; ++s) {
      if (!i || typeof i[r[s]] == "string" && s + 1 < r.length)
        return;
      if (i[r[s]] === void 0) {
        for (var o = 2, f = r.slice(s, s + o).join(n), u = i[f]; u === void 0 && r.length > s + o; )
          o++, f = r.slice(s, s + o).join(n), u = i[f];
        if (u === void 0) return;
        if (u === null) return null;
        if (e.endsWith(f)) {
          if (typeof u == "string") return u;
          if (f && typeof u[f] == "string") return u[f];
        }
        var h = r.slice(s + o).join(n);
        return h ? Ff(u, h, n) : void 0;
      }
      i = i[r[s]];
    }
    return i;
  }
}
var Ap = function(t) {
  Rr(n, t);
  var e = Sp(n);
  function n(r) {
    var i, s = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {
      ns: ["translation"],
      defaultNS: "translation"
    };
    return ut(this, n), i = e.call(this), Ir && Qt.call(Yt(i)), i.data = r || {}, i.options = s, i.options.keySeparator === void 0 && (i.options.keySeparator = "."), i.options.ignoreJSONStructure === void 0 && (i.options.ignoreJSONStructure = !0), i;
  }
  return lt(n, [{
    key: "addNamespaces",
    value: function(i) {
      this.options.ns.indexOf(i) < 0 && this.options.ns.push(i);
    }
  }, {
    key: "removeNamespaces",
    value: function(i) {
      var s = this.options.ns.indexOf(i);
      s > -1 && this.options.ns.splice(s, 1);
    }
  }, {
    key: "getResource",
    value: function(i, s, o) {
      var f = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : {}, u = f.keySeparator !== void 0 ? f.keySeparator : this.options.keySeparator, h = f.ignoreJSONStructure !== void 0 ? f.ignoreJSONStructure : this.options.ignoreJSONStructure, p = [i, s];
      o && typeof o != "string" && (p = p.concat(o)), o && typeof o == "string" && (p = p.concat(u ? o.split(u) : o)), i.indexOf(".") > -1 && (p = i.split("."));
      var m = yr(this.data, p);
      return m || !h || typeof o != "string" ? m : Ff(this.data && this.data[i] && this.data[i][s], o, u);
    }
  }, {
    key: "addResource",
    value: function(i, s, o, f) {
      var u = arguments.length > 4 && arguments[4] !== void 0 ? arguments[4] : {
        silent: !1
      }, h = this.options.keySeparator;
      h === void 0 && (h = ".");
      var p = [i, s];
      o && (p = p.concat(h ? o.split(h) : o)), i.indexOf(".") > -1 && (p = i.split("."), f = s, s = p[1]), this.addNamespaces(s), Eo(this.data, p, f), u.silent || this.emit("added", i, s, o, f);
    }
  }, {
    key: "addResources",
    value: function(i, s, o) {
      var f = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : {
        silent: !1
      };
      for (var u in o)
        (typeof o[u] == "string" || Object.prototype.toString.apply(o[u]) === "[object Array]") && this.addResource(i, s, u, o[u], {
          silent: !0
        });
      f.silent || this.emit("added", i, s, o);
    }
  }, {
    key: "addResourceBundle",
    value: function(i, s, o, f, u) {
      var h = arguments.length > 5 && arguments[5] !== void 0 ? arguments[5] : {
        silent: !1
      }, p = [i, s];
      i.indexOf(".") > -1 && (p = i.split("."), f = o, o = s, s = p[1]), this.addNamespaces(s);
      var m = yr(this.data, p) || {};
      f ? Bf(m, o, u) : m = tr(tr({}, m), o), Eo(this.data, p, m), h.silent || this.emit("added", i, s, o);
    }
  }, {
    key: "removeResourceBundle",
    value: function(i, s) {
      this.hasResourceBundle(i, s) && delete this.data[i][s], this.removeNamespaces(s), this.emit("removed", i, s);
    }
  }, {
    key: "hasResourceBundle",
    value: function(i, s) {
      return this.getResource(i, s) !== void 0;
    }
  }, {
    key: "getResourceBundle",
    value: function(i, s) {
      return s || (s = this.options.defaultNS), this.options.compatibilityAPI === "v1" ? tr(tr({}, {}), this.getResource(i, s)) : this.getResource(i, s);
    }
  }, {
    key: "getDataByLanguage",
    value: function(i) {
      return this.data[i];
    }
  }, {
    key: "hasLanguageSomeTranslations",
    value: function(i) {
      var s = this.getDataByLanguage(i), o = s && Object.keys(s) || [];
      return !!o.find(function(f) {
        return s[f] && Object.keys(s[f]).length > 0;
      });
    }
  }, {
    key: "toJSON",
    value: function() {
      return this.data;
    }
  }]), n;
}(Qt), Cf = {
  processors: {},
  addPostProcessor: function(e) {
    this.processors[e.name] = e;
  },
  handle: function(e, n, r, i, s) {
    var o = this;
    return e.forEach(function(f) {
      o.processors[f] && (n = o.processors[f].process(n, r, i, s));
    }), n;
  }
};
function Mo(t, e) {
  var n = Object.keys(t);
  if (Object.getOwnPropertySymbols) {
    var r = Object.getOwnPropertySymbols(t);
    e && (r = r.filter(function(i) {
      return Object.getOwnPropertyDescriptor(t, i).enumerable;
    })), n.push.apply(n, r);
  }
  return n;
}
function nt(t) {
  for (var e = 1; e < arguments.length; e++) {
    var n = arguments[e] != null ? arguments[e] : {};
    e % 2 ? Mo(Object(n), !0).forEach(function(r) {
      At(t, r, n[r]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(t, Object.getOwnPropertyDescriptors(n)) : Mo(Object(n)).forEach(function(r) {
      Object.defineProperty(t, r, Object.getOwnPropertyDescriptor(n, r));
    });
  }
  return t;
}
function jp(t) {
  var e = Hp();
  return function() {
    var r = Lt(t), i;
    if (e) {
      var s = Lt(this).constructor;
      i = Reflect.construct(r, arguments, s);
    } else
      i = r.apply(this, arguments);
    return qn(this, i);
  };
}
function Hp() {
  if (typeof Reflect > "u" || !Reflect.construct || Reflect.construct.sham) return !1;
  if (typeof Proxy == "function") return !0;
  try {
    return Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function() {
    })), !0;
  } catch {
    return !1;
  }
}
var So = {}, zo = function(t) {
  Rr(n, t);
  var e = jp(n);
  function n(r) {
    var i, s = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
    return ut(this, n), i = e.call(this), Ir && Qt.call(Yt(i)), Np(["resourceStore", "languageUtils", "pluralResolver", "interpolator", "backendConnector", "i18nFormat", "utils"], r, Yt(i)), i.options = s, i.options.keySeparator === void 0 && (i.options.keySeparator = "."), i.logger = Ot.create("translator"), i;
  }
  return lt(n, [{
    key: "changeLanguage",
    value: function(i) {
      i && (this.language = i);
    }
  }, {
    key: "exists",
    value: function(i) {
      var s = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {
        interpolation: {}
      };
      if (i == null)
        return !1;
      var o = this.resolve(i, s);
      return o && o.res !== void 0;
    }
  }, {
    key: "extractFromKey",
    value: function(i, s) {
      var o = s.nsSeparator !== void 0 ? s.nsSeparator : this.options.nsSeparator;
      o === void 0 && (o = ":");
      var f = s.keySeparator !== void 0 ? s.keySeparator : this.options.keySeparator, u = s.ns || this.options.defaultNS || [], h = o && i.indexOf(o) > -1, p = !this.options.userDefinedKeySeparator && !s.keySeparator && !this.options.userDefinedNsSeparator && !s.nsSeparator && !Mp(i, o, f);
      if (h && !p) {
        var m = i.match(this.interpolator.nestingRegexp);
        if (m && m.length > 0)
          return {
            key: i,
            namespaces: u
          };
        var O = i.split(o);
        (o !== f || o === f && this.options.ns.indexOf(O[0]) > -1) && (u = O.shift()), i = O.join(f);
      }
      return typeof u == "string" && (u = [u]), {
        key: i,
        namespaces: u
      };
    }
  }, {
    key: "translate",
    value: function(i, s, o) {
      var f = this;
      if (gt(s) !== "object" && this.options.overloadTranslationOptionHandler && (s = this.options.overloadTranslationOptionHandler(arguments)), s || (s = {}), i == null) return "";
      Array.isArray(i) || (i = [String(i)]);
      var u = s.returnDetails !== void 0 ? s.returnDetails : this.options.returnDetails, h = s.keySeparator !== void 0 ? s.keySeparator : this.options.keySeparator, p = this.extractFromKey(i[i.length - 1], s), m = p.key, O = p.namespaces, L = O[O.length - 1], N = s.lng || this.language, x = s.appendNamespaceToCIMode || this.options.appendNamespaceToCIMode;
      if (N && N.toLowerCase() === "cimode") {
        if (x) {
          var E = s.nsSeparator || this.options.nsSeparator;
          return u ? (T.res = "".concat(L).concat(E).concat(m), T) : "".concat(L).concat(E).concat(m);
        }
        return u ? (T.res = m, T) : m;
      }
      var T = this.resolve(i, s), M = T && T.res, S = T && T.usedKey || m, A = T && T.exactUsedKey || m, j = Object.prototype.toString.apply(M), z = ["[object Number]", "[object Function]", "[object RegExp]"], U = s.joinArrays !== void 0 ? s.joinArrays : this.options.joinArrays, H = !this.i18nFormat || this.i18nFormat.handleAsObject, G = typeof M != "string" && typeof M != "boolean" && typeof M != "number";
      if (H && M && G && z.indexOf(j) < 0 && !(typeof U == "string" && j === "[object Array]")) {
        if (!s.returnObjects && !this.options.returnObjects) {
          this.options.returnedObjectHandler || this.logger.warn("accessing an object - but returnObjects options is not enabled!");
          var V = this.options.returnedObjectHandler ? this.options.returnedObjectHandler(S, M, nt(nt({}, s), {}, {
            ns: O
          })) : "key '".concat(m, " (").concat(this.language, ")' returned an object instead of string.");
          return u ? (T.res = V, T) : V;
        }
        if (h) {
          var I = j === "[object Array]", B = I ? [] : {}, P = I ? A : S;
          for (var a in M)
            if (Object.prototype.hasOwnProperty.call(M, a)) {
              var c = "".concat(P).concat(h).concat(a);
              B[a] = this.translate(c, nt(nt({}, s), {
                joinArrays: !1,
                ns: O
              })), B[a] === c && (B[a] = M[a]);
            }
          M = B;
        }
      } else if (H && typeof U == "string" && j === "[object Array]")
        M = M.join(U), M && (M = this.extendTranslation(M, i, s, o));
      else {
        var d = !1, g = !1, b = s.count !== void 0 && typeof s.count != "string", w = n.hasDefaultValue(s), k = b ? this.pluralResolver.getSuffix(N, s.count, s) : "", y = s["defaultValue".concat(k)] || s.defaultValue;
        !this.isValidLookup(M) && w && (d = !0, M = y), this.isValidLookup(M) || (g = !0, M = m);
        var l = s.missingKeyNoValueFallbackToKey || this.options.missingKeyNoValueFallbackToKey, v = l && g ? void 0 : M, X = w && y !== M && this.options.updateMissing;
        if (g || d || X) {
          if (this.logger.log(X ? "updateKey" : "missingKey", N, L, m, X ? y : M), h) {
            var F = this.resolve(m, nt(nt({}, s), {}, {
              keySeparator: !1
            }));
            F && F.res && this.logger.warn("Seems the loaded translations were in flat JSON format instead of nested. Either set keySeparator: false on init or make sure your translations are published in nested format.");
          }
          var C = [], $ = this.languageUtils.getFallbackCodes(this.options.fallbackLng, s.lng || this.language);
          if (this.options.saveMissingTo === "fallback" && $ && $[0])
            for (var Y = 0; Y < $.length; Y++)
              C.push($[Y]);
          else this.options.saveMissingTo === "all" ? C = this.languageUtils.toResolveHierarchy(s.lng || this.language) : C.push(s.lng || this.language);
          var K = function(J, Q, tt) {
            var se = w && tt !== M ? tt : v;
            f.options.missingKeyHandler ? f.options.missingKeyHandler(J, L, Q, se, X, s) : f.backendConnector && f.backendConnector.saveMissing && f.backendConnector.saveMissing(J, L, Q, se, X, s), f.emit("missingKey", J, L, Q, M);
          };
          this.options.saveMissing && (this.options.saveMissingPlurals && b ? C.forEach(function(Ye) {
            f.pluralResolver.getSuffixes(Ye, s).forEach(function(J) {
              K([Ye], m + J, s["defaultValue".concat(J)] || y);
            });
          }) : K(C, m, y));
        }
        M = this.extendTranslation(M, i, s, T, o), g && M === m && this.options.appendNamespaceToMissingKey && (M = "".concat(L, ":").concat(m)), (g || d) && this.options.parseMissingKeyHandler && (this.options.compatibilityAPI !== "v1" ? M = this.options.parseMissingKeyHandler(this.options.appendNamespaceToMissingKey ? "".concat(L, ":").concat(m) : m, d ? M : void 0) : M = this.options.parseMissingKeyHandler(M));
      }
      return u ? (T.res = M, T) : M;
    }
  }, {
    key: "extendTranslation",
    value: function(i, s, o, f, u) {
      var h = this;
      if (this.i18nFormat && this.i18nFormat.parse)
        i = this.i18nFormat.parse(i, nt(nt({}, this.options.interpolation.defaultVariables), o), f.usedLng, f.usedNS, f.usedKey, {
          resolved: f
        });
      else if (!o.skipInterpolation) {
        o.interpolation && this.interpolator.init(nt(nt({}, o), {
          interpolation: nt(nt({}, this.options.interpolation), o.interpolation)
        }));
        var p = typeof i == "string" && (o && o.interpolation && o.interpolation.skipOnVariables !== void 0 ? o.interpolation.skipOnVariables : this.options.interpolation.skipOnVariables), m;
        if (p) {
          var O = i.match(this.interpolator.nestingRegexp);
          m = O && O.length;
        }
        var L = o.replace && typeof o.replace != "string" ? o.replace : o;
        if (this.options.interpolation.defaultVariables && (L = nt(nt({}, this.options.interpolation.defaultVariables), L)), i = this.interpolator.interpolate(i, L, o.lng || this.language, o), p) {
          var N = i.match(this.interpolator.nestingRegexp), x = N && N.length;
          m < x && (o.nest = !1);
        }
        o.nest !== !1 && (i = this.interpolator.nest(i, function() {
          for (var M = arguments.length, S = new Array(M), A = 0; A < M; A++)
            S[A] = arguments[A];
          return u && u[0] === S[0] && !o.context ? (h.logger.warn("It seems you are nesting recursively key: ".concat(S[0], " in key: ").concat(s[0])), null) : h.translate.apply(h, S.concat([s]));
        }, o)), o.interpolation && this.interpolator.reset();
      }
      var E = o.postProcess || this.options.postProcess, T = typeof E == "string" ? [E] : E;
      return i != null && T && T.length && o.applyPostProcessor !== !1 && (i = Cf.handle(T, i, s, this.options && this.options.postProcessPassResolved ? nt({
        i18nResolved: f
      }, o) : o, this)), i;
    }
  }, {
    key: "resolve",
    value: function(i) {
      var s = this, o = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {}, f, u, h, p, m;
      return typeof i == "string" && (i = [i]), i.forEach(function(O) {
        if (!s.isValidLookup(f)) {
          var L = s.extractFromKey(O, o), N = L.key;
          u = N;
          var x = L.namespaces;
          s.options.fallbackNS && (x = x.concat(s.options.fallbackNS));
          var E = o.count !== void 0 && typeof o.count != "string", T = E && !o.ordinal && o.count === 0 && s.pluralResolver.shouldUseIntlApi(), M = o.context !== void 0 && (typeof o.context == "string" || typeof o.context == "number") && o.context !== "", S = o.lngs ? o.lngs : s.languageUtils.toResolveHierarchy(o.lng || s.language, o.fallbackLng);
          x.forEach(function(A) {
            s.isValidLookup(f) || (m = A, !So["".concat(S[0], "-").concat(A)] && s.utils && s.utils.hasLoadedNamespace && !s.utils.hasLoadedNamespace(m) && (So["".concat(S[0], "-").concat(A)] = !0, s.logger.warn('key "'.concat(u, '" for languages "').concat(S.join(", "), `" won't get resolved as namespace "`).concat(m, '" was not yet loaded'), "This means something IS WRONG in your setup. You access the t function before i18next.init / i18next.loadNamespace / i18next.changeLanguage was done. Wait for the callback or Promise to resolve before accessing it!!!")), S.forEach(function(j) {
              if (!s.isValidLookup(f)) {
                p = j;
                var z = [N];
                if (s.i18nFormat && s.i18nFormat.addLookupKeys)
                  s.i18nFormat.addLookupKeys(z, N, j, A, o);
                else {
                  var U;
                  E && (U = s.pluralResolver.getSuffix(j, o.count, o));
                  var H = "".concat(s.options.pluralSeparator, "zero");
                  if (E && (z.push(N + U), T && z.push(N + H)), M) {
                    var G = "".concat(N).concat(s.options.contextSeparator).concat(o.context);
                    z.push(G), E && (z.push(G + U), T && z.push(G + H));
                  }
                }
                for (var V; V = z.pop(); )
                  s.isValidLookup(f) || (h = V, f = s.getResource(j, A, V, o));
              }
            }));
          });
        }
      }), {
        res: f,
        usedKey: u,
        exactUsedKey: h,
        usedLng: p,
        usedNS: m
      };
    }
  }, {
    key: "isValidLookup",
    value: function(i) {
      return i !== void 0 && !(!this.options.returnNull && i === null) && !(!this.options.returnEmptyString && i === "");
    }
  }, {
    key: "getResource",
    value: function(i, s, o) {
      var f = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : {};
      return this.i18nFormat && this.i18nFormat.getResource ? this.i18nFormat.getResource(i, s, o, f) : this.resourceStore.getResource(i, s, o, f);
    }
  }], [{
    key: "hasDefaultValue",
    value: function(i) {
      var s = "defaultValue";
      for (var o in i)
        if (Object.prototype.hasOwnProperty.call(i, o) && s === o.substring(0, s.length) && i[o] !== void 0)
          return !0;
      return !1;
    }
  }]), n;
}(Qt);
function Oi(t) {
  return t.charAt(0).toUpperCase() + t.slice(1);
}
var Rp = function() {
  function t(e) {
    ut(this, t), this.options = e, this.supportedLngs = this.options.supportedLngs || !1, this.logger = Ot.create("languageUtils");
  }
  return lt(t, [{
    key: "getScriptPartFromCode",
    value: function(n) {
      if (!n || n.indexOf("-") < 0) return null;
      var r = n.split("-");
      return r.length === 2 || (r.pop(), r[r.length - 1].toLowerCase() === "x") ? null : this.formatLanguageCode(r.join("-"));
    }
  }, {
    key: "getLanguagePartFromCode",
    value: function(n) {
      if (!n || n.indexOf("-") < 0) return n;
      var r = n.split("-");
      return this.formatLanguageCode(r[0]);
    }
  }, {
    key: "formatLanguageCode",
    value: function(n) {
      if (typeof n == "string" && n.indexOf("-") > -1) {
        var r = ["hans", "hant", "latn", "cyrl", "cans", "mong", "arab"], i = n.split("-");
        return this.options.lowerCaseLng ? i = i.map(function(s) {
          return s.toLowerCase();
        }) : i.length === 2 ? (i[0] = i[0].toLowerCase(), i[1] = i[1].toUpperCase(), r.indexOf(i[1].toLowerCase()) > -1 && (i[1] = Oi(i[1].toLowerCase()))) : i.length === 3 && (i[0] = i[0].toLowerCase(), i[1].length === 2 && (i[1] = i[1].toUpperCase()), i[0] !== "sgn" && i[2].length === 2 && (i[2] = i[2].toUpperCase()), r.indexOf(i[1].toLowerCase()) > -1 && (i[1] = Oi(i[1].toLowerCase())), r.indexOf(i[2].toLowerCase()) > -1 && (i[2] = Oi(i[2].toLowerCase()))), i.join("-");
      }
      return this.options.cleanCode || this.options.lowerCaseLng ? n.toLowerCase() : n;
    }
  }, {
    key: "isSupportedCode",
    value: function(n) {
      return (this.options.load === "languageOnly" || this.options.nonExplicitSupportedLngs) && (n = this.getLanguagePartFromCode(n)), !this.supportedLngs || !this.supportedLngs.length || this.supportedLngs.indexOf(n) > -1;
    }
  }, {
    key: "getBestMatchFromCodes",
    value: function(n) {
      var r = this;
      if (!n) return null;
      var i;
      return n.forEach(function(s) {
        if (!i) {
          var o = r.formatLanguageCode(s);
          (!r.options.supportedLngs || r.isSupportedCode(o)) && (i = o);
        }
      }), !i && this.options.supportedLngs && n.forEach(function(s) {
        if (!i) {
          var o = r.getLanguagePartFromCode(s);
          if (r.isSupportedCode(o)) return i = o;
          i = r.options.supportedLngs.find(function(f) {
            if (f.indexOf(o) === 0) return f;
          });
        }
      }), i || (i = this.getFallbackCodes(this.options.fallbackLng)[0]), i;
    }
  }, {
    key: "getFallbackCodes",
    value: function(n, r) {
      if (!n) return [];
      if (typeof n == "function" && (n = n(r)), typeof n == "string" && (n = [n]), Object.prototype.toString.apply(n) === "[object Array]") return n;
      if (!r) return n.default || [];
      var i = n[r];
      return i || (i = n[this.getScriptPartFromCode(r)]), i || (i = n[this.formatLanguageCode(r)]), i || (i = n[this.getLanguagePartFromCode(r)]), i || (i = n.default), i || [];
    }
  }, {
    key: "toResolveHierarchy",
    value: function(n, r) {
      var i = this, s = this.getFallbackCodes(r || this.options.fallbackLng || [], n), o = [], f = function(h) {
        h && (i.isSupportedCode(h) ? o.push(h) : i.logger.warn("rejecting language code not found in supportedLngs: ".concat(h)));
      };
      return typeof n == "string" && n.indexOf("-") > -1 ? (this.options.load !== "languageOnly" && f(this.formatLanguageCode(n)), this.options.load !== "languageOnly" && this.options.load !== "currentOnly" && f(this.getScriptPartFromCode(n)), this.options.load !== "currentOnly" && f(this.getLanguagePartFromCode(n))) : typeof n == "string" && f(this.formatLanguageCode(n)), s.forEach(function(u) {
        o.indexOf(u) < 0 && f(i.formatLanguageCode(u));
      }), o;
    }
  }]), t;
}(), Ip = [{
  lngs: ["ach", "ak", "am", "arn", "br", "fil", "gun", "ln", "mfe", "mg", "mi", "oc", "pt", "pt-BR", "tg", "tl", "ti", "tr", "uz", "wa"],
  nr: [1, 2],
  fc: 1
}, {
  lngs: ["af", "an", "ast", "az", "bg", "bn", "ca", "da", "de", "dev", "el", "en", "eo", "es", "et", "eu", "fi", "fo", "fur", "fy", "gl", "gu", "ha", "hi", "hu", "hy", "ia", "it", "kk", "kn", "ku", "lb", "mai", "ml", "mn", "mr", "nah", "nap", "nb", "ne", "nl", "nn", "no", "nso", "pa", "pap", "pms", "ps", "pt-PT", "rm", "sco", "se", "si", "so", "son", "sq", "sv", "sw", "ta", "te", "tk", "ur", "yo"],
  nr: [1, 2],
  fc: 2
}, {
  lngs: ["ay", "bo", "cgg", "fa", "ht", "id", "ja", "jbo", "ka", "km", "ko", "ky", "lo", "ms", "sah", "su", "th", "tt", "ug", "vi", "wo", "zh"],
  nr: [1],
  fc: 3
}, {
  lngs: ["be", "bs", "cnr", "dz", "hr", "ru", "sr", "uk"],
  nr: [1, 2, 5],
  fc: 4
}, {
  lngs: ["ar"],
  nr: [0, 1, 2, 3, 11, 100],
  fc: 5
}, {
  lngs: ["cs", "sk"],
  nr: [1, 2, 5],
  fc: 6
}, {
  lngs: ["csb", "pl"],
  nr: [1, 2, 5],
  fc: 7
}, {
  lngs: ["cy"],
  nr: [1, 2, 3, 8],
  fc: 8
}, {
  lngs: ["fr"],
  nr: [1, 2],
  fc: 9
}, {
  lngs: ["ga"],
  nr: [1, 2, 3, 7, 11],
  fc: 10
}, {
  lngs: ["gd"],
  nr: [1, 2, 3, 20],
  fc: 11
}, {
  lngs: ["is"],
  nr: [1, 2],
  fc: 12
}, {
  lngs: ["jv"],
  nr: [0, 1],
  fc: 13
}, {
  lngs: ["kw"],
  nr: [1, 2, 3, 4],
  fc: 14
}, {
  lngs: ["lt"],
  nr: [1, 2, 10],
  fc: 15
}, {
  lngs: ["lv"],
  nr: [1, 2, 0],
  fc: 16
}, {
  lngs: ["mk"],
  nr: [1, 2],
  fc: 17
}, {
  lngs: ["mnk"],
  nr: [0, 1, 2],
  fc: 18
}, {
  lngs: ["mt"],
  nr: [1, 2, 11, 20],
  fc: 19
}, {
  lngs: ["or"],
  nr: [2, 1],
  fc: 2
}, {
  lngs: ["ro"],
  nr: [1, 2, 20],
  fc: 20
}, {
  lngs: ["sl"],
  nr: [5, 1, 2, 3],
  fc: 21
}, {
  lngs: ["he", "iw"],
  nr: [1, 2, 20, 21],
  fc: 22
}], Up = {
  1: function(e) {
    return +(e > 1);
  },
  2: function(e) {
    return +(e != 1);
  },
  3: function(e) {
    return 0;
  },
  4: function(e) {
    return e % 10 == 1 && e % 100 != 11 ? 0 : e % 10 >= 2 && e % 10 <= 4 && (e % 100 < 10 || e % 100 >= 20) ? 1 : 2;
  },
  5: function(e) {
    return e == 0 ? 0 : e == 1 ? 1 : e == 2 ? 2 : e % 100 >= 3 && e % 100 <= 10 ? 3 : e % 100 >= 11 ? 4 : 5;
  },
  6: function(e) {
    return e == 1 ? 0 : e >= 2 && e <= 4 ? 1 : 2;
  },
  7: function(e) {
    return e == 1 ? 0 : e % 10 >= 2 && e % 10 <= 4 && (e % 100 < 10 || e % 100 >= 20) ? 1 : 2;
  },
  8: function(e) {
    return e == 1 ? 0 : e == 2 ? 1 : e != 8 && e != 11 ? 2 : 3;
  },
  9: function(e) {
    return +(e >= 2);
  },
  10: function(e) {
    return e == 1 ? 0 : e == 2 ? 1 : e < 7 ? 2 : e < 11 ? 3 : 4;
  },
  11: function(e) {
    return e == 1 || e == 11 ? 0 : e == 2 || e == 12 ? 1 : e > 2 && e < 20 ? 2 : 3;
  },
  12: function(e) {
    return +(e % 10 != 1 || e % 100 == 11);
  },
  13: function(e) {
    return +(e !== 0);
  },
  14: function(e) {
    return e == 1 ? 0 : e == 2 ? 1 : e == 3 ? 2 : 3;
  },
  15: function(e) {
    return e % 10 == 1 && e % 100 != 11 ? 0 : e % 10 >= 2 && (e % 100 < 10 || e % 100 >= 20) ? 1 : 2;
  },
  16: function(e) {
    return e % 10 == 1 && e % 100 != 11 ? 0 : e !== 0 ? 1 : 2;
  },
  17: function(e) {
    return e == 1 || e % 10 == 1 && e % 100 != 11 ? 0 : 1;
  },
  18: function(e) {
    return e == 0 ? 0 : e == 1 ? 1 : 2;
  },
  19: function(e) {
    return e == 1 ? 0 : e == 0 || e % 100 > 1 && e % 100 < 11 ? 1 : e % 100 > 10 && e % 100 < 20 ? 2 : 3;
  },
  20: function(e) {
    return e == 1 ? 0 : e == 0 || e % 100 > 0 && e % 100 < 20 ? 1 : 2;
  },
  21: function(e) {
    return e % 100 == 1 ? 1 : e % 100 == 2 ? 2 : e % 100 == 3 || e % 100 == 4 ? 3 : 0;
  },
  22: function(e) {
    return e == 1 ? 0 : e == 2 ? 1 : (e < 0 || e > 10) && e % 10 == 0 ? 2 : 3;
  }
}, Xp = ["v1", "v2", "v3"], Ao = {
  zero: 0,
  one: 1,
  two: 2,
  few: 3,
  many: 4,
  other: 5
};
function Dp() {
  var t = {};
  return Ip.forEach(function(e) {
    e.lngs.forEach(function(n) {
      t[n] = {
        numbers: e.nr,
        plurals: Up[e.fc]
      };
    });
  }), t;
}
var Bp = function() {
  function t(e) {
    var n = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
    ut(this, t), this.languageUtils = e, this.options = n, this.logger = Ot.create("pluralResolver"), (!this.options.compatibilityJSON || this.options.compatibilityJSON === "v4") && (typeof Intl > "u" || !Intl.PluralRules) && (this.options.compatibilityJSON = "v3", this.logger.error("Your environment seems not to be Intl API compatible, use an Intl.PluralRules polyfill. Will fallback to the compatibilityJSON v3 format handling.")), this.rules = Dp();
  }
  return lt(t, [{
    key: "addRule",
    value: function(n, r) {
      this.rules[n] = r;
    }
  }, {
    key: "getRule",
    value: function(n) {
      var r = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
      if (this.shouldUseIntlApi())
        try {
          return new Intl.PluralRules(n, {
            type: r.ordinal ? "ordinal" : "cardinal"
          });
        } catch {
          return;
        }
      return this.rules[n] || this.rules[this.languageUtils.getLanguagePartFromCode(n)];
    }
  }, {
    key: "needsPlural",
    value: function(n) {
      var r = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {}, i = this.getRule(n, r);
      return this.shouldUseIntlApi() ? i && i.resolvedOptions().pluralCategories.length > 1 : i && i.numbers.length > 1;
    }
  }, {
    key: "getPluralFormsOfKey",
    value: function(n, r) {
      var i = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {};
      return this.getSuffixes(n, i).map(function(s) {
        return "".concat(r).concat(s);
      });
    }
  }, {
    key: "getSuffixes",
    value: function(n) {
      var r = this, i = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {}, s = this.getRule(n, i);
      return s ? this.shouldUseIntlApi() ? s.resolvedOptions().pluralCategories.sort(function(o, f) {
        return Ao[o] - Ao[f];
      }).map(function(o) {
        return "".concat(r.options.prepend).concat(o);
      }) : s.numbers.map(function(o) {
        return r.getSuffix(n, o, i);
      }) : [];
    }
  }, {
    key: "getSuffix",
    value: function(n, r) {
      var i = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {}, s = this.getRule(n, i);
      return s ? this.shouldUseIntlApi() ? "".concat(this.options.prepend).concat(s.select(r)) : this.getSuffixRetroCompatible(s, r) : (this.logger.warn("no plural rule found for: ".concat(n)), "");
    }
  }, {
    key: "getSuffixRetroCompatible",
    value: function(n, r) {
      var i = this, s = n.noAbs ? n.plurals(r) : n.plurals(Math.abs(r)), o = n.numbers[s];
      this.options.simplifyPluralSuffix && n.numbers.length === 2 && n.numbers[0] === 1 && (o === 2 ? o = "plural" : o === 1 && (o = ""));
      var f = function() {
        return i.options.prepend && o.toString() ? i.options.prepend + o.toString() : o.toString();
      };
      return this.options.compatibilityJSON === "v1" ? o === 1 ? "" : typeof o == "number" ? "_plural_".concat(o.toString()) : f() : this.options.compatibilityJSON === "v2" || this.options.simplifyPluralSuffix && n.numbers.length === 2 && n.numbers[0] === 1 ? f() : this.options.prepend && s.toString() ? this.options.prepend + s.toString() : s.toString();
    }
  }, {
    key: "shouldUseIntlApi",
    value: function() {
      return !Xp.includes(this.options.compatibilityJSON);
    }
  }]), t;
}();
function jo(t, e) {
  var n = Object.keys(t);
  if (Object.getOwnPropertySymbols) {
    var r = Object.getOwnPropertySymbols(t);
    e && (r = r.filter(function(i) {
      return Object.getOwnPropertyDescriptor(t, i).enumerable;
    })), n.push.apply(n, r);
  }
  return n;
}
function pt(t) {
  for (var e = 1; e < arguments.length; e++) {
    var n = arguments[e] != null ? arguments[e] : {};
    e % 2 ? jo(Object(n), !0).forEach(function(r) {
      At(t, r, n[r]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(t, Object.getOwnPropertyDescriptors(n)) : jo(Object(n)).forEach(function(r) {
      Object.defineProperty(t, r, Object.getOwnPropertyDescriptor(n, r));
    });
  }
  return t;
}
var Fp = function() {
  function t() {
    var e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
    ut(this, t), this.logger = Ot.create("interpolator"), this.options = e, this.format = e.interpolation && e.interpolation.format || function(n) {
      return n;
    }, this.init(e);
  }
  return lt(t, [{
    key: "init",
    value: function() {
      var n = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
      n.interpolation || (n.interpolation = {
        escapeValue: !0
      });
      var r = n.interpolation;
      this.escape = r.escape !== void 0 ? r.escape : kp, this.escapeValue = r.escapeValue !== void 0 ? r.escapeValue : !0, this.useRawValueToEscape = r.useRawValueToEscape !== void 0 ? r.useRawValueToEscape : !1, this.prefix = r.prefix ? cn(r.prefix) : r.prefixEscaped || "{{", this.suffix = r.suffix ? cn(r.suffix) : r.suffixEscaped || "}}", this.formatSeparator = r.formatSeparator ? r.formatSeparator : r.formatSeparator || ",", this.unescapePrefix = r.unescapeSuffix ? "" : r.unescapePrefix || "-", this.unescapeSuffix = this.unescapePrefix ? "" : r.unescapeSuffix || "", this.nestingPrefix = r.nestingPrefix ? cn(r.nestingPrefix) : r.nestingPrefixEscaped || cn("$t("), this.nestingSuffix = r.nestingSuffix ? cn(r.nestingSuffix) : r.nestingSuffixEscaped || cn(")"), this.nestingOptionsSeparator = r.nestingOptionsSeparator ? r.nestingOptionsSeparator : r.nestingOptionsSeparator || ",", this.maxReplaces = r.maxReplaces ? r.maxReplaces : 1e3, this.alwaysFormat = r.alwaysFormat !== void 0 ? r.alwaysFormat : !1, this.resetRegExp();
    }
  }, {
    key: "reset",
    value: function() {
      this.options && this.init(this.options);
    }
  }, {
    key: "resetRegExp",
    value: function() {
      var n = "".concat(this.prefix, "(.+?)").concat(this.suffix);
      this.regexp = new RegExp(n, "g");
      var r = "".concat(this.prefix).concat(this.unescapePrefix, "(.+?)").concat(this.unescapeSuffix).concat(this.suffix);
      this.regexpUnescape = new RegExp(r, "g");
      var i = "".concat(this.nestingPrefix, "(.+?)").concat(this.nestingSuffix);
      this.nestingRegexp = new RegExp(i, "g");
    }
  }, {
    key: "interpolate",
    value: function(n, r, i, s) {
      var o = this, f, u, h, p = this.options && this.options.interpolation && this.options.interpolation.defaultVariables || {};
      function m(E) {
        return E.replace(/\$/g, "$$$$");
      }
      var O = function(T) {
        if (T.indexOf(o.formatSeparator) < 0) {
          var M = ko(r, p, T);
          return o.alwaysFormat ? o.format(M, void 0, i, pt(pt(pt({}, s), r), {}, {
            interpolationkey: T
          })) : M;
        }
        var S = T.split(o.formatSeparator), A = S.shift().trim(), j = S.join(o.formatSeparator).trim();
        return o.format(ko(r, p, A), j, i, pt(pt(pt({}, s), r), {}, {
          interpolationkey: A
        }));
      };
      this.resetRegExp();
      var L = s && s.missingInterpolationHandler || this.options.missingInterpolationHandler, N = s && s.interpolation && s.interpolation.skipOnVariables !== void 0 ? s.interpolation.skipOnVariables : this.options.interpolation.skipOnVariables, x = [{
        regex: this.regexpUnescape,
        safeValue: function(T) {
          return m(T);
        }
      }, {
        regex: this.regexp,
        safeValue: function(T) {
          return o.escapeValue ? m(o.escape(T)) : m(T);
        }
      }];
      return x.forEach(function(E) {
        for (h = 0; f = E.regex.exec(n); ) {
          var T = f[1].trim();
          if (u = O(T), u === void 0)
            if (typeof L == "function") {
              var M = L(n, f, s);
              u = typeof M == "string" ? M : "";
            } else if (s && s.hasOwnProperty(T))
              u = "";
            else if (N) {
              u = f[0];
              continue;
            } else
              o.logger.warn("missed to pass in variable ".concat(T, " for interpolating ").concat(n)), u = "";
          else typeof u != "string" && !o.useRawValueToEscape && (u = Lo(u));
          var S = E.safeValue(u);
          if (n = n.replace(f[0], S), N ? (E.regex.lastIndex += u.length, E.regex.lastIndex -= f[0].length) : E.regex.lastIndex = 0, h++, h >= o.maxReplaces)
            break;
        }
      }), n;
    }
  }, {
    key: "nest",
    value: function(n, r) {
      var i = this, s = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {}, o, f, u = pt({}, s);
      u.applyPostProcessor = !1, delete u.defaultValue;
      function h(L, N) {
        var x = this.nestingOptionsSeparator;
        if (L.indexOf(x) < 0) return L;
        var E = L.split(new RegExp("".concat(x, "[ ]*{"))), T = "{".concat(E[1]);
        L = E[0], T = this.interpolate(T, u);
        var M = T.match(/'/g), S = T.match(/"/g);
        (M && M.length % 2 === 0 && !S || S.length % 2 !== 0) && (T = T.replace(/'/g, '"'));
        try {
          u = JSON.parse(T), N && (u = pt(pt({}, N), u));
        } catch (A) {
          return this.logger.warn("failed parsing options string in nesting for key ".concat(L), A), "".concat(L).concat(x).concat(T);
        }
        return delete u.defaultValue, L;
      }
      for (; o = this.nestingRegexp.exec(n); ) {
        var p = [], m = !1;
        if (o[0].indexOf(this.formatSeparator) !== -1 && !/{.*}/.test(o[1])) {
          var O = o[1].split(this.formatSeparator).map(function(L) {
            return L.trim();
          });
          o[1] = O.shift(), p = O, m = !0;
        }
        if (f = r(h.call(this, o[1].trim(), u), u), f && o[0] === n && typeof f != "string") return f;
        typeof f != "string" && (f = Lo(f)), f || (this.logger.warn("missed to resolve ".concat(o[1], " for nesting ").concat(n)), f = ""), m && (f = p.reduce(function(L, N) {
          return i.format(L, N, s.lng, pt(pt({}, s), {}, {
            interpolationkey: o[1].trim()
          }));
        }, f.trim())), n = n.replace(o[0], f), this.regexp.lastIndex = 0;
      }
      return n;
    }
  }]), t;
}();
function Ho(t, e) {
  var n = Object.keys(t);
  if (Object.getOwnPropertySymbols) {
    var r = Object.getOwnPropertySymbols(t);
    e && (r = r.filter(function(i) {
      return Object.getOwnPropertyDescriptor(t, i).enumerable;
    })), n.push.apply(n, r);
  }
  return n;
}
function Zt(t) {
  for (var e = 1; e < arguments.length; e++) {
    var n = arguments[e] != null ? arguments[e] : {};
    e % 2 ? Ho(Object(n), !0).forEach(function(r) {
      At(t, r, n[r]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(t, Object.getOwnPropertyDescriptors(n)) : Ho(Object(n)).forEach(function(r) {
      Object.defineProperty(t, r, Object.getOwnPropertyDescriptor(n, r));
    });
  }
  return t;
}
function Cp(t) {
  var e = t.toLowerCase().trim(), n = {};
  if (t.indexOf("(") > -1) {
    var r = t.split("(");
    e = r[0].toLowerCase().trim();
    var i = r[1].substring(0, r[1].length - 1);
    if (e === "currency" && i.indexOf(":") < 0)
      n.currency || (n.currency = i.trim());
    else if (e === "relativetime" && i.indexOf(":") < 0)
      n.range || (n.range = i.trim());
    else {
      var s = i.split(";");
      s.forEach(function(o) {
        if (o) {
          var f = o.split(":"), u = xp(f), h = u[0], p = u.slice(1), m = p.join(":").trim().replace(/^'+|'+$/g, "");
          n[h.trim()] || (n[h.trim()] = m), m === "false" && (n[h.trim()] = !1), m === "true" && (n[h.trim()] = !0), isNaN(m) || (n[h.trim()] = parseInt(m, 10));
        }
      });
    }
  }
  return {
    formatName: e,
    formatOptions: n
  };
}
function un(t) {
  var e = {};
  return function(r, i, s) {
    var o = i + JSON.stringify(s), f = e[o];
    return f || (f = t(i, s), e[o] = f), f(r);
  };
}
var Zp = function() {
  function t() {
    var e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
    ut(this, t), this.logger = Ot.create("formatter"), this.options = e, this.formats = {
      number: un(function(n, r) {
        var i = new Intl.NumberFormat(n, r);
        return function(s) {
          return i.format(s);
        };
      }),
      currency: un(function(n, r) {
        var i = new Intl.NumberFormat(n, Zt(Zt({}, r), {}, {
          style: "currency"
        }));
        return function(s) {
          return i.format(s);
        };
      }),
      datetime: un(function(n, r) {
        var i = new Intl.DateTimeFormat(n, Zt({}, r));
        return function(s) {
          return i.format(s);
        };
      }),
      relativetime: un(function(n, r) {
        var i = new Intl.RelativeTimeFormat(n, Zt({}, r));
        return function(s) {
          return i.format(s, r.range || "day");
        };
      }),
      list: un(function(n, r) {
        var i = new Intl.ListFormat(n, Zt({}, r));
        return function(s) {
          return i.format(s);
        };
      })
    }, this.init(e);
  }
  return lt(t, [{
    key: "init",
    value: function(n) {
      var r = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {
        interpolation: {}
      }, i = r.interpolation;
      this.formatSeparator = i.formatSeparator ? i.formatSeparator : i.formatSeparator || ",";
    }
  }, {
    key: "add",
    value: function(n, r) {
      this.formats[n.toLowerCase().trim()] = r;
    }
  }, {
    key: "addCached",
    value: function(n, r) {
      this.formats[n.toLowerCase().trim()] = un(r);
    }
  }, {
    key: "format",
    value: function(n, r, i, s) {
      var o = this, f = r.split(this.formatSeparator), u = f.reduce(function(h, p) {
        var m = Cp(p), O = m.formatName, L = m.formatOptions;
        if (o.formats[O]) {
          var N = h;
          try {
            var x = s && s.formatParams && s.formatParams[s.interpolationkey] || {}, E = x.locale || x.lng || s.locale || s.lng || i;
            N = o.formats[O](h, E, Zt(Zt(Zt({}, L), s), x));
          } catch (T) {
            o.logger.warn(T);
          }
          return N;
        } else
          o.logger.warn("there was no format function for ".concat(O));
        return h;
      }, n);
      return u;
    }
  }]), t;
}();
function Ro(t, e) {
  var n = Object.keys(t);
  if (Object.getOwnPropertySymbols) {
    var r = Object.getOwnPropertySymbols(t);
    e && (r = r.filter(function(i) {
      return Object.getOwnPropertyDescriptor(t, i).enumerable;
    })), n.push.apply(n, r);
  }
  return n;
}
function Io(t) {
  for (var e = 1; e < arguments.length; e++) {
    var n = arguments[e] != null ? arguments[e] : {};
    e % 2 ? Ro(Object(n), !0).forEach(function(r) {
      At(t, r, n[r]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(t, Object.getOwnPropertyDescriptors(n)) : Ro(Object(n)).forEach(function(r) {
      Object.defineProperty(t, r, Object.getOwnPropertyDescriptor(n, r));
    });
  }
  return t;
}
function Vp(t) {
  var e = Gp();
  return function() {
    var r = Lt(t), i;
    if (e) {
      var s = Lt(this).constructor;
      i = Reflect.construct(r, arguments, s);
    } else
      i = r.apply(this, arguments);
    return qn(this, i);
  };
}
function Gp() {
  if (typeof Reflect > "u" || !Reflect.construct || Reflect.construct.sham) return !1;
  if (typeof Proxy == "function") return !0;
  try {
    return Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function() {
    })), !0;
  } catch {
    return !1;
  }
}
function qp(t, e) {
  t.pending[e] !== void 0 && (delete t.pending[e], t.pendingCount--);
}
var Yp = function(t) {
  Rr(n, t);
  var e = Vp(n);
  function n(r, i, s) {
    var o, f = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : {};
    return ut(this, n), o = e.call(this), Ir && Qt.call(Yt(o)), o.backend = r, o.store = i, o.services = s, o.languageUtils = s.languageUtils, o.options = f, o.logger = Ot.create("backendConnector"), o.waitingReads = [], o.maxParallelReads = f.maxParallelReads || 10, o.readingCalls = 0, o.maxRetries = f.maxRetries >= 0 ? f.maxRetries : 5, o.retryTimeout = f.retryTimeout >= 1 ? f.retryTimeout : 350, o.state = {}, o.queue = [], o.backend && o.backend.init && o.backend.init(s, f.backend, f), o;
  }
  return lt(n, [{
    key: "queueLoad",
    value: function(i, s, o, f) {
      var u = this, h = {}, p = {}, m = {}, O = {};
      return i.forEach(function(L) {
        var N = !0;
        s.forEach(function(x) {
          var E = "".concat(L, "|").concat(x);
          !o.reload && u.store.hasResourceBundle(L, x) ? u.state[E] = 2 : u.state[E] < 0 || (u.state[E] === 1 ? p[E] === void 0 && (p[E] = !0) : (u.state[E] = 1, N = !1, p[E] === void 0 && (p[E] = !0), h[E] === void 0 && (h[E] = !0), O[x] === void 0 && (O[x] = !0)));
        }), N || (m[L] = !0);
      }), (Object.keys(h).length || Object.keys(p).length) && this.queue.push({
        pending: p,
        pendingCount: Object.keys(p).length,
        loaded: {},
        errors: [],
        callback: f
      }), {
        toLoad: Object.keys(h),
        pending: Object.keys(p),
        toLoadLanguages: Object.keys(m),
        toLoadNamespaces: Object.keys(O)
      };
    }
  }, {
    key: "loaded",
    value: function(i, s, o) {
      var f = i.split("|"), u = f[0], h = f[1];
      s && this.emit("failedLoading", u, h, s), o && this.store.addResourceBundle(u, h, o), this.state[i] = s ? -1 : 2;
      var p = {};
      this.queue.forEach(function(m) {
        Lp(m.loaded, [u], h), qp(m, i), s && m.errors.push(s), m.pendingCount === 0 && !m.done && (Object.keys(m.loaded).forEach(function(O) {
          p[O] || (p[O] = {});
          var L = m.loaded[O];
          L.length && L.forEach(function(N) {
            p[O][N] === void 0 && (p[O][N] = !0);
          });
        }), m.done = !0, m.errors.length ? m.callback(m.errors) : m.callback());
      }), this.emit("loaded", p), this.queue = this.queue.filter(function(m) {
        return !m.done;
      });
    }
  }, {
    key: "read",
    value: function(i, s, o) {
      var f = this, u = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : 0, h = arguments.length > 4 && arguments[4] !== void 0 ? arguments[4] : this.retryTimeout, p = arguments.length > 5 ? arguments[5] : void 0;
      if (!i.length) return p(null, {});
      if (this.readingCalls >= this.maxParallelReads) {
        this.waitingReads.push({
          lng: i,
          ns: s,
          fcName: o,
          tried: u,
          wait: h,
          callback: p
        });
        return;
      }
      return this.readingCalls++, this.backend[o](i, s, function(m, O) {
        if (f.readingCalls--, f.waitingReads.length > 0) {
          var L = f.waitingReads.shift();
          f.read(L.lng, L.ns, L.fcName, L.tried, L.wait, L.callback);
        }
        if (m && O && u < f.maxRetries) {
          setTimeout(function() {
            f.read.call(f, i, s, o, u + 1, h * 2, p);
          }, h);
          return;
        }
        p(m, O);
      });
    }
  }, {
    key: "prepareLoading",
    value: function(i, s) {
      var o = this, f = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {}, u = arguments.length > 3 ? arguments[3] : void 0;
      if (!this.backend)
        return this.logger.warn("No backend was added via i18next.use. Will not load resources."), u && u();
      typeof i == "string" && (i = this.languageUtils.toResolveHierarchy(i)), typeof s == "string" && (s = [s]);
      var h = this.queueLoad(i, s, f, u);
      if (!h.toLoad.length)
        return h.pending.length || u(), null;
      h.toLoad.forEach(function(p) {
        o.loadOne(p);
      });
    }
  }, {
    key: "load",
    value: function(i, s, o) {
      this.prepareLoading(i, s, {}, o);
    }
  }, {
    key: "reload",
    value: function(i, s, o) {
      this.prepareLoading(i, s, {
        reload: !0
      }, o);
    }
  }, {
    key: "loadOne",
    value: function(i) {
      var s = this, o = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : "", f = i.split("|"), u = f[0], h = f[1];
      this.read(u, h, "read", void 0, void 0, function(p, m) {
        p && s.logger.warn("".concat(o, "loading namespace ").concat(h, " for language ").concat(u, " failed"), p), !p && m && s.logger.log("".concat(o, "loaded namespace ").concat(h, " for language ").concat(u), m), s.loaded(i, p, m);
      });
    }
  }, {
    key: "saveMissing",
    value: function(i, s, o, f, u) {
      var h = arguments.length > 5 && arguments[5] !== void 0 ? arguments[5] : {};
      if (this.services.utils && this.services.utils.hasLoadedNamespace && !this.services.utils.hasLoadedNamespace(s)) {
        this.logger.warn('did not save key "'.concat(o, '" as the namespace "').concat(s, '" was not yet loaded'), "This means something IS WRONG in your setup. You access the t function before i18next.init / i18next.loadNamespace / i18next.changeLanguage was done. Wait for the callback or Promise to resolve before accessing it!!!");
        return;
      }
      o == null || o === "" || (this.backend && this.backend.create && this.backend.create(i, s, o, f, null, Io(Io({}, h), {}, {
        isUpdate: u
      })), !(!i || !i[0]) && this.store.addResource(i[0], s, o, f));
    }
  }]), n;
}(Qt);
function Wp() {
  return {
    debug: !1,
    initImmediate: !0,
    ns: ["translation"],
    defaultNS: ["translation"],
    fallbackLng: ["dev"],
    fallbackNS: !1,
    supportedLngs: !1,
    nonExplicitSupportedLngs: !1,
    load: "all",
    preload: !1,
    simplifyPluralSuffix: !0,
    keySeparator: ".",
    nsSeparator: ":",
    pluralSeparator: "_",
    contextSeparator: "_",
    partialBundledLanguages: !1,
    saveMissing: !1,
    updateMissing: !1,
    saveMissingTo: "fallback",
    saveMissingPlurals: !0,
    missingKeyHandler: !1,
    missingInterpolationHandler: !1,
    postProcess: !1,
    postProcessPassResolved: !1,
    returnNull: !0,
    returnEmptyString: !0,
    returnObjects: !1,
    joinArrays: !1,
    returnedObjectHandler: !1,
    parseMissingKeyHandler: !1,
    appendNamespaceToMissingKey: !1,
    appendNamespaceToCIMode: !1,
    overloadTranslationOptionHandler: function(e) {
      var n = {};
      if (gt(e[1]) === "object" && (n = e[1]), typeof e[1] == "string" && (n.defaultValue = e[1]), typeof e[2] == "string" && (n.tDescription = e[2]), gt(e[2]) === "object" || gt(e[3]) === "object") {
        var r = e[3] || e[2];
        Object.keys(r).forEach(function(i) {
          n[i] = r[i];
        });
      }
      return n;
    },
    interpolation: {
      escapeValue: !0,
      format: function(e, n, r, i) {
        return e;
      },
      prefix: "{{",
      suffix: "}}",
      formatSeparator: ",",
      unescapePrefix: "-",
      nestingPrefix: "$t(",
      nestingSuffix: ")",
      nestingOptionsSeparator: ",",
      maxReplaces: 1e3,
      skipOnVariables: !0
    }
  };
}
function Uo(t) {
  return typeof t.ns == "string" && (t.ns = [t.ns]), typeof t.fallbackLng == "string" && (t.fallbackLng = [t.fallbackLng]), typeof t.fallbackNS == "string" && (t.fallbackNS = [t.fallbackNS]), t.supportedLngs && t.supportedLngs.indexOf("cimode") < 0 && (t.supportedLngs = t.supportedLngs.concat(["cimode"])), t;
}
function Xo(t, e) {
  var n = Object.keys(t);
  if (Object.getOwnPropertySymbols) {
    var r = Object.getOwnPropertySymbols(t);
    e && (r = r.filter(function(i) {
      return Object.getOwnPropertyDescriptor(t, i).enumerable;
    })), n.push.apply(n, r);
  }
  return n;
}
function wt(t) {
  for (var e = 1; e < arguments.length; e++) {
    var n = arguments[e] != null ? arguments[e] : {};
    e % 2 ? Xo(Object(n), !0).forEach(function(r) {
      At(t, r, n[r]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(t, Object.getOwnPropertyDescriptors(n)) : Xo(Object(n)).forEach(function(r) {
      Object.defineProperty(t, r, Object.getOwnPropertyDescriptor(n, r));
    });
  }
  return t;
}
function Kp(t) {
  var e = Jp();
  return function() {
    var r = Lt(t), i;
    if (e) {
      var s = Lt(this).constructor;
      i = Reflect.construct(r, arguments, s);
    } else
      i = r.apply(this, arguments);
    return qn(this, i);
  };
}
function Jp() {
  if (typeof Reflect > "u" || !Reflect.construct || Reflect.construct.sham) return !1;
  if (typeof Proxy == "function") return !0;
  try {
    return Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function() {
    })), !0;
  } catch {
    return !1;
  }
}
function nr() {
}
function Qp(t) {
  var e = Object.getOwnPropertyNames(Object.getPrototypeOf(t));
  e.forEach(function(n) {
    typeof t[n] == "function" && (t[n] = t[n].bind(t));
  });
}
var vr = function(t) {
  Rr(n, t);
  var e = Kp(n);
  function n() {
    var r, i = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {}, s = arguments.length > 1 ? arguments[1] : void 0;
    if (ut(this, n), r = e.call(this), Ir && Qt.call(Yt(r)), r.options = Uo(i), r.services = {}, r.logger = Ot, r.modules = {
      external: []
    }, Qp(Yt(r)), s && !r.isInitialized && !i.isClone) {
      if (!r.options.initImmediate)
        return r.init(i, s), qn(r, Yt(r));
      setTimeout(function() {
        r.init(i, s);
      }, 0);
    }
    return r;
  }
  return lt(n, [{
    key: "init",
    value: function() {
      var i = this, s = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {}, o = arguments.length > 1 ? arguments[1] : void 0;
      typeof s == "function" && (o = s, s = {}), !s.defaultNS && s.defaultNS !== !1 && s.ns && (typeof s.ns == "string" ? s.defaultNS = s.ns : s.ns.indexOf("translation") < 0 && (s.defaultNS = s.ns[0]));
      var f = Wp();
      this.options = wt(wt(wt({}, f), this.options), Uo(s)), this.options.compatibilityAPI !== "v1" && (this.options.interpolation = wt(wt({}, f.interpolation), this.options.interpolation)), s.keySeparator !== void 0 && (this.options.userDefinedKeySeparator = s.keySeparator), s.nsSeparator !== void 0 && (this.options.userDefinedNsSeparator = s.nsSeparator);
      function u(T) {
        return T ? typeof T == "function" ? new T() : T : null;
      }
      if (!this.options.isClone) {
        this.modules.logger ? Ot.init(u(this.modules.logger), this.options) : Ot.init(null, this.options);
        var h;
        this.modules.formatter ? h = this.modules.formatter : typeof Intl < "u" && (h = Zp);
        var p = new Rp(this.options);
        this.store = new Ap(this.options.resources, this.options);
        var m = this.services;
        m.logger = Ot, m.resourceStore = this.store, m.languageUtils = p, m.pluralResolver = new Bp(p, {
          prepend: this.options.pluralSeparator,
          compatibilityJSON: this.options.compatibilityJSON,
          simplifyPluralSuffix: this.options.simplifyPluralSuffix
        }), h && (!this.options.interpolation.format || this.options.interpolation.format === f.interpolation.format) && (m.formatter = u(h), m.formatter.init(m, this.options), this.options.interpolation.format = m.formatter.format.bind(m.formatter)), m.interpolator = new Fp(this.options), m.utils = {
          hasLoadedNamespace: this.hasLoadedNamespace.bind(this)
        }, m.backendConnector = new Yp(u(this.modules.backend), m.resourceStore, m, this.options), m.backendConnector.on("*", function(T) {
          for (var M = arguments.length, S = new Array(M > 1 ? M - 1 : 0), A = 1; A < M; A++)
            S[A - 1] = arguments[A];
          i.emit.apply(i, [T].concat(S));
        }), this.modules.languageDetector && (m.languageDetector = u(this.modules.languageDetector), m.languageDetector.init(m, this.options.detection, this.options)), this.modules.i18nFormat && (m.i18nFormat = u(this.modules.i18nFormat), m.i18nFormat.init && m.i18nFormat.init(this)), this.translator = new zo(this.services, this.options), this.translator.on("*", function(T) {
          for (var M = arguments.length, S = new Array(M > 1 ? M - 1 : 0), A = 1; A < M; A++)
            S[A - 1] = arguments[A];
          i.emit.apply(i, [T].concat(S));
        }), this.modules.external.forEach(function(T) {
          T.init && T.init(i);
        });
      }
      if (this.format = this.options.interpolation.format, o || (o = nr), this.options.fallbackLng && !this.services.languageDetector && !this.options.lng) {
        var O = this.services.languageUtils.getFallbackCodes(this.options.fallbackLng);
        O.length > 0 && O[0] !== "dev" && (this.options.lng = O[0]);
      }
      !this.services.languageDetector && !this.options.lng && this.logger.warn("init: no languageDetector is used and no lng is defined");
      var L = ["getResource", "hasResourceBundle", "getResourceBundle", "getDataByLanguage"];
      L.forEach(function(T) {
        i[T] = function() {
          var M;
          return (M = i.store)[T].apply(M, arguments);
        };
      });
      var N = ["addResource", "addResources", "addResourceBundle", "removeResourceBundle"];
      N.forEach(function(T) {
        i[T] = function() {
          var M;
          return (M = i.store)[T].apply(M, arguments), i;
        };
      });
      var x = Sn(), E = function() {
        var M = function(A, j) {
          i.isInitialized && !i.initializedStoreOnce && i.logger.warn("init: i18next is already initialized. You should call init just once!"), i.isInitialized = !0, i.options.isClone || i.logger.log("initialized", i.options), i.emit("initialized", i.options), x.resolve(j), o(A, j);
        };
        if (i.languages && i.options.compatibilityAPI !== "v1" && !i.isInitialized) return M(null, i.t.bind(i));
        i.changeLanguage(i.options.lng, M);
      };
      return this.options.resources || !this.options.initImmediate ? E() : setTimeout(E, 0), x;
    }
  }, {
    key: "loadResources",
    value: function(i) {
      var s = this, o = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : nr, f = o, u = typeof i == "string" ? i : this.language;
      if (typeof i == "function" && (f = i), !this.options.resources || this.options.partialBundledLanguages) {
        if (u && u.toLowerCase() === "cimode") return f();
        var h = [], p = function(L) {
          if (L) {
            var N = s.services.languageUtils.toResolveHierarchy(L);
            N.forEach(function(x) {
              h.indexOf(x) < 0 && h.push(x);
            });
          }
        };
        if (u)
          p(u);
        else {
          var m = this.services.languageUtils.getFallbackCodes(this.options.fallbackLng);
          m.forEach(function(O) {
            return p(O);
          });
        }
        this.options.preload && this.options.preload.forEach(function(O) {
          return p(O);
        }), this.services.backendConnector.load(h, this.options.ns, function(O) {
          !O && !s.resolvedLanguage && s.language && s.setResolvedLanguage(s.language), f(O);
        });
      } else
        f(null);
    }
  }, {
    key: "reloadResources",
    value: function(i, s, o) {
      var f = Sn();
      return i || (i = this.languages), s || (s = this.options.ns), o || (o = nr), this.services.backendConnector.reload(i, s, function(u) {
        f.resolve(), o(u);
      }), f;
    }
  }, {
    key: "use",
    value: function(i) {
      if (!i) throw new Error("You are passing an undefined module! Please check the object you are passing to i18next.use()");
      if (!i.type) throw new Error("You are passing a wrong module! Please check the object you are passing to i18next.use()");
      return i.type === "backend" && (this.modules.backend = i), (i.type === "logger" || i.log && i.warn && i.error) && (this.modules.logger = i), i.type === "languageDetector" && (this.modules.languageDetector = i), i.type === "i18nFormat" && (this.modules.i18nFormat = i), i.type === "postProcessor" && Cf.addPostProcessor(i), i.type === "formatter" && (this.modules.formatter = i), i.type === "3rdParty" && this.modules.external.push(i), this;
    }
  }, {
    key: "setResolvedLanguage",
    value: function(i) {
      if (!(!i || !this.languages) && !(["cimode", "dev"].indexOf(i) > -1))
        for (var s = 0; s < this.languages.length; s++) {
          var o = this.languages[s];
          if (!(["cimode", "dev"].indexOf(o) > -1) && this.store.hasLanguageSomeTranslations(o)) {
            this.resolvedLanguage = o;
            break;
          }
        }
    }
  }, {
    key: "changeLanguage",
    value: function(i, s) {
      var o = this;
      this.isLanguageChangingTo = i;
      var f = Sn();
      this.emit("languageChanging", i);
      var u = function(O) {
        o.language = O, o.languages = o.services.languageUtils.toResolveHierarchy(O), o.resolvedLanguage = void 0, o.setResolvedLanguage(O);
      }, h = function(O, L) {
        L ? (u(L), o.translator.changeLanguage(L), o.isLanguageChangingTo = void 0, o.emit("languageChanged", L), o.logger.log("languageChanged", L)) : o.isLanguageChangingTo = void 0, f.resolve(function() {
          return o.t.apply(o, arguments);
        }), s && s(O, function() {
          return o.t.apply(o, arguments);
        });
      }, p = function(O) {
        !i && !O && o.services.languageDetector && (O = []);
        var L = typeof O == "string" ? O : o.services.languageUtils.getBestMatchFromCodes(O);
        L && (o.language || u(L), o.translator.language || o.translator.changeLanguage(L), o.services.languageDetector && o.services.languageDetector.cacheUserLanguage(L)), o.loadResources(L, function(N) {
          h(N, L);
        });
      };
      return !i && this.services.languageDetector && !this.services.languageDetector.async ? p(this.services.languageDetector.detect()) : !i && this.services.languageDetector && this.services.languageDetector.async ? this.services.languageDetector.detect(p) : p(i), f;
    }
  }, {
    key: "getFixedT",
    value: function(i, s, o) {
      var f = this, u = function h(p, m) {
        var O;
        if (gt(m) !== "object") {
          for (var L = arguments.length, N = new Array(L > 2 ? L - 2 : 0), x = 2; x < L; x++)
            N[x - 2] = arguments[x];
          O = f.options.overloadTranslationOptionHandler([p, m].concat(N));
        } else
          O = wt({}, m);
        O.lng = O.lng || h.lng, O.lngs = O.lngs || h.lngs, O.ns = O.ns || h.ns, O.keyPrefix = O.keyPrefix || o || h.keyPrefix;
        var E = f.options.keySeparator || ".", T = O.keyPrefix ? "".concat(O.keyPrefix).concat(E).concat(p) : p;
        return f.t(T, O);
      };
      return typeof i == "string" ? u.lng = i : u.lngs = i, u.ns = s, u.keyPrefix = o, u;
    }
  }, {
    key: "t",
    value: function() {
      var i;
      return this.translator && (i = this.translator).translate.apply(i, arguments);
    }
  }, {
    key: "exists",
    value: function() {
      var i;
      return this.translator && (i = this.translator).exists.apply(i, arguments);
    }
  }, {
    key: "setDefaultNamespace",
    value: function(i) {
      this.options.defaultNS = i;
    }
  }, {
    key: "hasLoadedNamespace",
    value: function(i) {
      var s = this, o = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
      if (!this.isInitialized)
        return this.logger.warn("hasLoadedNamespace: i18next was not initialized", this.languages), !1;
      if (!this.languages || !this.languages.length)
        return this.logger.warn("hasLoadedNamespace: i18n.languages were undefined or empty", this.languages), !1;
      var f = this.resolvedLanguage || this.languages[0], u = this.options ? this.options.fallbackLng : !1, h = this.languages[this.languages.length - 1];
      if (f.toLowerCase() === "cimode") return !0;
      var p = function(L, N) {
        var x = s.services.backendConnector.state["".concat(L, "|").concat(N)];
        return x === -1 || x === 2;
      };
      if (o.precheck) {
        var m = o.precheck(this, p);
        if (m !== void 0) return m;
      }
      return !!(this.hasResourceBundle(f, i) || !this.services.backendConnector.backend || this.options.resources && !this.options.partialBundledLanguages || p(f, i) && (!u || p(h, i)));
    }
  }, {
    key: "loadNamespaces",
    value: function(i, s) {
      var o = this, f = Sn();
      return this.options.ns ? (typeof i == "string" && (i = [i]), i.forEach(function(u) {
        o.options.ns.indexOf(u) < 0 && o.options.ns.push(u);
      }), this.loadResources(function(u) {
        f.resolve(), s && s(u);
      }), f) : (s && s(), Promise.resolve());
    }
  }, {
    key: "loadLanguages",
    value: function(i, s) {
      var o = Sn();
      typeof i == "string" && (i = [i]);
      var f = this.options.preload || [], u = i.filter(function(h) {
        return f.indexOf(h) < 0;
      });
      return u.length ? (this.options.preload = f.concat(u), this.loadResources(function(h) {
        o.resolve(), s && s(h);
      }), o) : (s && s(), Promise.resolve());
    }
  }, {
    key: "dir",
    value: function(i) {
      if (i || (i = this.resolvedLanguage || (this.languages && this.languages.length > 0 ? this.languages[0] : this.language)), !i) return "rtl";
      var s = ["ar", "shu", "sqr", "ssh", "xaa", "yhd", "yud", "aao", "abh", "abv", "acm", "acq", "acw", "acx", "acy", "adf", "ads", "aeb", "aec", "afb", "ajp", "apc", "apd", "arb", "arq", "ars", "ary", "arz", "auz", "avl", "ayh", "ayl", "ayn", "ayp", "bbz", "pga", "he", "iw", "ps", "pbt", "pbu", "pst", "prp", "prd", "ug", "ur", "ydd", "yds", "yih", "ji", "yi", "hbo", "men", "xmn", "fa", "jpr", "peo", "pes", "prs", "dv", "sam", "ckb"];
      return s.indexOf(this.services.languageUtils.getLanguagePartFromCode(i)) > -1 || i.toLowerCase().indexOf("-arab") > 1 ? "rtl" : "ltr";
    }
  }, {
    key: "cloneInstance",
    value: function() {
      var i = this, s = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {}, o = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : nr, f = wt(wt(wt({}, this.options), s), {
        isClone: !0
      }), u = new n(f);
      (s.debug !== void 0 || s.prefix !== void 0) && (u.logger = u.logger.clone(s));
      var h = ["store", "services", "language"];
      return h.forEach(function(p) {
        u[p] = i[p];
      }), u.services = wt({}, this.services), u.services.utils = {
        hasLoadedNamespace: u.hasLoadedNamespace.bind(u)
      }, u.translator = new zo(u.services, u.options), u.translator.on("*", function(p) {
        for (var m = arguments.length, O = new Array(m > 1 ? m - 1 : 0), L = 1; L < m; L++)
          O[L - 1] = arguments[L];
        u.emit.apply(u, [p].concat(O));
      }), u.init(f, o), u.translator.options = u.options, u.translator.backendConnector.services.utils = {
        hasLoadedNamespace: u.hasLoadedNamespace.bind(u)
      }, u;
    }
  }, {
    key: "toJSON",
    value: function() {
      return {
        options: this.options,
        store: this.store,
        language: this.language,
        languages: this.languages,
        resolvedLanguage: this.resolvedLanguage
      };
    }
  }]), n;
}(Qt);
At(vr, "createInstance", function() {
  var t = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {}, e = arguments.length > 1 ? arguments[1] : void 0;
  return new vr(t, e);
});
var Dn = vr.createInstance();
Dn.createInstance = vr.createInstance;
var Zf = [], _p = Zf.forEach, $p = Zf.slice;
function e1(t) {
  return _p.call($p.call(arguments, 1), function(e) {
    if (e)
      for (var n in e)
        t[n] === void 0 && (t[n] = e[n]);
  }), t;
}
var Do = /^[\u0009\u0020-\u007e\u0080-\u00ff]+$/, t1 = function(e, n, r) {
  var i = r || {};
  i.path = i.path || "/";
  var s = encodeURIComponent(n), o = "".concat(e, "=").concat(s);
  if (i.maxAge > 0) {
    var f = i.maxAge - 0;
    if (Number.isNaN(f)) throw new Error("maxAge should be a Number");
    o += "; Max-Age=".concat(Math.floor(f));
  }
  if (i.domain) {
    if (!Do.test(i.domain))
      throw new TypeError("option domain is invalid");
    o += "; Domain=".concat(i.domain);
  }
  if (i.path) {
    if (!Do.test(i.path))
      throw new TypeError("option path is invalid");
    o += "; Path=".concat(i.path);
  }
  if (i.expires) {
    if (typeof i.expires.toUTCString != "function")
      throw new TypeError("option expires is invalid");
    o += "; Expires=".concat(i.expires.toUTCString());
  }
  if (i.httpOnly && (o += "; HttpOnly"), i.secure && (o += "; Secure"), i.sameSite) {
    var u = typeof i.sameSite == "string" ? i.sameSite.toLowerCase() : i.sameSite;
    switch (u) {
      case !0:
        o += "; SameSite=Strict";
        break;
      case "lax":
        o += "; SameSite=Lax";
        break;
      case "strict":
        o += "; SameSite=Strict";
        break;
      case "none":
        o += "; SameSite=None";
        break;
      default:
        throw new TypeError("option sameSite is invalid");
    }
  }
  return o;
}, Bo = {
  create: function(e, n, r, i) {
    var s = arguments.length > 4 && arguments[4] !== void 0 ? arguments[4] : {
      path: "/",
      sameSite: "strict"
    };
    r && (s.expires = /* @__PURE__ */ new Date(), s.expires.setTime(s.expires.getTime() + r * 60 * 1e3)), i && (s.domain = i), document.cookie = t1(e, encodeURIComponent(n), s);
  },
  read: function(e) {
    for (var n = "".concat(e, "="), r = document.cookie.split(";"), i = 0; i < r.length; i++) {
      for (var s = r[i]; s.charAt(0) === " "; ) s = s.substring(1, s.length);
      if (s.indexOf(n) === 0) return s.substring(n.length, s.length);
    }
    return null;
  },
  remove: function(e) {
    this.create(e, "", -1);
  }
}, n1 = {
  name: "cookie",
  lookup: function(e) {
    var n;
    if (e.lookupCookie && typeof document < "u") {
      var r = Bo.read(e.lookupCookie);
      r && (n = r);
    }
    return n;
  },
  cacheUserLanguage: function(e, n) {
    n.lookupCookie && typeof document < "u" && Bo.create(n.lookupCookie, e, n.cookieMinutes, n.cookieDomain, n.cookieOptions);
  }
}, r1 = {
  name: "querystring",
  lookup: function(e) {
    var n;
    if (typeof window < "u") {
      var r = window.location.search;
      !window.location.search && window.location.hash && window.location.hash.indexOf("?") > -1 && (r = window.location.hash.substring(window.location.hash.indexOf("?")));
      for (var i = r.substring(1), s = i.split("&"), o = 0; o < s.length; o++) {
        var f = s[o].indexOf("=");
        if (f > 0) {
          var u = s[o].substring(0, f);
          u === e.lookupQuerystring && (n = s[o].substring(f + 1));
        }
      }
    }
    return n;
  }
}, zn = null, Fo = function() {
  if (zn !== null) return zn;
  try {
    zn = window !== "undefined" && window.localStorage !== null;
    var e = "i18next.translate.boo";
    window.localStorage.setItem(e, "foo"), window.localStorage.removeItem(e);
  } catch {
    zn = !1;
  }
  return zn;
}, i1 = {
  name: "localStorage",
  lookup: function(e) {
    var n;
    if (e.lookupLocalStorage && Fo()) {
      var r = window.localStorage.getItem(e.lookupLocalStorage);
      r && (n = r);
    }
    return n;
  },
  cacheUserLanguage: function(e, n) {
    n.lookupLocalStorage && Fo() && window.localStorage.setItem(n.lookupLocalStorage, e);
  }
}, An = null, Co = function() {
  if (An !== null) return An;
  try {
    An = window !== "undefined" && window.sessionStorage !== null;
    var e = "i18next.translate.boo";
    window.sessionStorage.setItem(e, "foo"), window.sessionStorage.removeItem(e);
  } catch {
    An = !1;
  }
  return An;
}, s1 = {
  name: "sessionStorage",
  lookup: function(e) {
    var n;
    if (e.lookupSessionStorage && Co()) {
      var r = window.sessionStorage.getItem(e.lookupSessionStorage);
      r && (n = r);
    }
    return n;
  },
  cacheUserLanguage: function(e, n) {
    n.lookupSessionStorage && Co() && window.sessionStorage.setItem(n.lookupSessionStorage, e);
  }
}, o1 = {
  name: "navigator",
  lookup: function(e) {
    var n = [];
    if (typeof navigator < "u") {
      if (navigator.languages)
        for (var r = 0; r < navigator.languages.length; r++)
          n.push(navigator.languages[r]);
      navigator.userLanguage && n.push(navigator.userLanguage), navigator.language && n.push(navigator.language);
    }
    return n.length > 0 ? n : void 0;
  }
}, a1 = {
  name: "htmlTag",
  lookup: function(e) {
    var n, r = e.htmlTag || (typeof document < "u" ? document.documentElement : null);
    return r && typeof r.getAttribute == "function" && (n = r.getAttribute("lang")), n;
  }
}, f1 = {
  name: "path",
  lookup: function(e) {
    var n;
    if (typeof window < "u") {
      var r = window.location.pathname.match(/\/([a-zA-Z-]*)/g);
      if (r instanceof Array)
        if (typeof e.lookupFromPathIndex == "number") {
          if (typeof r[e.lookupFromPathIndex] != "string")
            return;
          n = r[e.lookupFromPathIndex].replace("/", "");
        } else
          n = r[0].replace("/", "");
    }
    return n;
  }
}, c1 = {
  name: "subdomain",
  lookup: function(e) {
    var n = typeof e.lookupFromSubdomainIndex == "number" ? e.lookupFromSubdomainIndex + 1 : 1, r = typeof window < "u" && window.location && window.location.hostname && window.location.hostname.match(/^(\w{2,5})\.(([a-z0-9-]{1,63}\.[a-z]{2,6})|localhost)/i);
    if (r)
      return r[n];
  }
};
function u1() {
  return {
    order: ["querystring", "cookie", "localStorage", "sessionStorage", "navigator", "htmlTag"],
    lookupQuerystring: "lng",
    lookupCookie: "i18next",
    lookupLocalStorage: "i18nextLng",
    lookupSessionStorage: "i18nextLng",
    // cache user language
    caches: ["localStorage"],
    excludeCacheFor: ["cimode"],
    // cookieMinutes: 10,
    // cookieDomain: 'myDomain'
    convertDetectedLanguage: function(e) {
      return e;
    }
  };
}
var Vf = /* @__PURE__ */ function() {
  function t(e) {
    var n = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
    ut(this, t), this.type = "languageDetector", this.detectors = {}, this.init(e, n);
  }
  return lt(t, [{
    key: "init",
    value: function(n) {
      var r = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {}, i = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {};
      this.services = n || {
        languageUtils: {}
      }, this.options = e1(r, this.options || {}, u1()), typeof this.options.convertDetectedLanguage == "string" && this.options.convertDetectedLanguage.indexOf("15897") > -1 && (this.options.convertDetectedLanguage = function(s) {
        return s.replace("-", "_");
      }), this.options.lookupFromUrlIndex && (this.options.lookupFromPathIndex = this.options.lookupFromUrlIndex), this.i18nOptions = i, this.addDetector(n1), this.addDetector(r1), this.addDetector(i1), this.addDetector(s1), this.addDetector(o1), this.addDetector(a1), this.addDetector(f1), this.addDetector(c1);
    }
  }, {
    key: "addDetector",
    value: function(n) {
      return this.detectors[n.name] = n, this;
    }
  }, {
    key: "detect",
    value: function(n) {
      var r = this;
      n || (n = this.options.order);
      var i = [];
      return n.forEach(function(s) {
        if (r.detectors[s]) {
          var o = r.detectors[s].lookup(r.options);
          o && typeof o == "string" && (o = [o]), o && (i = i.concat(o));
        }
      }), i = i.map(function(s) {
        return r.options.convertDetectedLanguage(s);
      }), this.services.languageUtils.getBestMatchFromCodes ? i : i.length > 0 ? i[0] : null;
    }
  }, {
    key: "cacheUserLanguage",
    value: function(n, r) {
      var i = this;
      r || (r = this.options.caches), r && (this.options.excludeCacheFor && this.options.excludeCacheFor.indexOf(n) > -1 || r.forEach(function(s) {
        i.detectors[s] && i.detectors[s].cacheUserLanguage(n, i.options);
      }));
    }
  }]), t;
}();
Vf.type = "languageDetector";
function qi(t) {
  "@babel/helpers - typeof";
  return qi = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(e) {
    return typeof e;
  } : function(e) {
    return e && typeof Symbol == "function" && e.constructor === Symbol && e !== Symbol.prototype ? "symbol" : typeof e;
  }, qi(t);
}
var Gf = [], l1 = Gf.forEach, d1 = Gf.slice;
function Yi(t) {
  return l1.call(d1.call(arguments, 1), function(e) {
    if (e)
      for (var n in e)
        t[n] === void 0 && (t[n] = e[n]);
  }), t;
}
function qf() {
  return typeof XMLHttpRequest == "function" || (typeof XMLHttpRequest > "u" ? "undefined" : qi(XMLHttpRequest)) === "object";
}
function h1(t) {
  return !!t && typeof t.then == "function";
}
function p1(t) {
  return h1(t) ? t : Promise.resolve(t);
}
var Wi = { exports: {} }, rr = { exports: {} }, Zo;
function m1() {
  return Zo || (Zo = 1, function(t, e) {
    var n = typeof self < "u" ? self : jn, r = function() {
      function s() {
        this.fetch = !1, this.DOMException = n.DOMException;
      }
      return s.prototype = n, new s();
    }();
    (function(s) {
      (function(o) {
        var f = {
          searchParams: "URLSearchParams" in s,
          iterable: "Symbol" in s && "iterator" in Symbol,
          blob: "FileReader" in s && "Blob" in s && function() {
            try {
              return new Blob(), !0;
            } catch {
              return !1;
            }
          }(),
          formData: "FormData" in s,
          arrayBuffer: "ArrayBuffer" in s
        };
        function u(a) {
          return a && DataView.prototype.isPrototypeOf(a);
        }
        if (f.arrayBuffer)
          var h = [
            "[object Int8Array]",
            "[object Uint8Array]",
            "[object Uint8ClampedArray]",
            "[object Int16Array]",
            "[object Uint16Array]",
            "[object Int32Array]",
            "[object Uint32Array]",
            "[object Float32Array]",
            "[object Float64Array]"
          ], p = ArrayBuffer.isView || function(a) {
            return a && h.indexOf(Object.prototype.toString.call(a)) > -1;
          };
        function m(a) {
          if (typeof a != "string" && (a = String(a)), /[^a-z0-9\-#$%&'*+.^_`|~]/i.test(a))
            throw new TypeError("Invalid character in header field name");
          return a.toLowerCase();
        }
        function O(a) {
          return typeof a != "string" && (a = String(a)), a;
        }
        function L(a) {
          var c = {
            next: function() {
              var d = a.shift();
              return { done: d === void 0, value: d };
            }
          };
          return f.iterable && (c[Symbol.iterator] = function() {
            return c;
          }), c;
        }
        function N(a) {
          this.map = {}, a instanceof N ? a.forEach(function(c, d) {
            this.append(d, c);
          }, this) : Array.isArray(a) ? a.forEach(function(c) {
            this.append(c[0], c[1]);
          }, this) : a && Object.getOwnPropertyNames(a).forEach(function(c) {
            this.append(c, a[c]);
          }, this);
        }
        N.prototype.append = function(a, c) {
          a = m(a), c = O(c);
          var d = this.map[a];
          this.map[a] = d ? d + ", " + c : c;
        }, N.prototype.delete = function(a) {
          delete this.map[m(a)];
        }, N.prototype.get = function(a) {
          return a = m(a), this.has(a) ? this.map[a] : null;
        }, N.prototype.has = function(a) {
          return this.map.hasOwnProperty(m(a));
        }, N.prototype.set = function(a, c) {
          this.map[m(a)] = O(c);
        }, N.prototype.forEach = function(a, c) {
          for (var d in this.map)
            this.map.hasOwnProperty(d) && a.call(c, this.map[d], d, this);
        }, N.prototype.keys = function() {
          var a = [];
          return this.forEach(function(c, d) {
            a.push(d);
          }), L(a);
        }, N.prototype.values = function() {
          var a = [];
          return this.forEach(function(c) {
            a.push(c);
          }), L(a);
        }, N.prototype.entries = function() {
          var a = [];
          return this.forEach(function(c, d) {
            a.push([d, c]);
          }), L(a);
        }, f.iterable && (N.prototype[Symbol.iterator] = N.prototype.entries);
        function x(a) {
          if (a.bodyUsed)
            return Promise.reject(new TypeError("Already read"));
          a.bodyUsed = !0;
        }
        function E(a) {
          return new Promise(function(c, d) {
            a.onload = function() {
              c(a.result);
            }, a.onerror = function() {
              d(a.error);
            };
          });
        }
        function T(a) {
          var c = new FileReader(), d = E(c);
          return c.readAsArrayBuffer(a), d;
        }
        function M(a) {
          var c = new FileReader(), d = E(c);
          return c.readAsText(a), d;
        }
        function S(a) {
          for (var c = new Uint8Array(a), d = new Array(c.length), g = 0; g < c.length; g++)
            d[g] = String.fromCharCode(c[g]);
          return d.join("");
        }
        function A(a) {
          if (a.slice)
            return a.slice(0);
          var c = new Uint8Array(a.byteLength);
          return c.set(new Uint8Array(a)), c.buffer;
        }
        function j() {
          return this.bodyUsed = !1, this._initBody = function(a) {
            this._bodyInit = a, a ? typeof a == "string" ? this._bodyText = a : f.blob && Blob.prototype.isPrototypeOf(a) ? this._bodyBlob = a : f.formData && FormData.prototype.isPrototypeOf(a) ? this._bodyFormData = a : f.searchParams && URLSearchParams.prototype.isPrototypeOf(a) ? this._bodyText = a.toString() : f.arrayBuffer && f.blob && u(a) ? (this._bodyArrayBuffer = A(a.buffer), this._bodyInit = new Blob([this._bodyArrayBuffer])) : f.arrayBuffer && (ArrayBuffer.prototype.isPrototypeOf(a) || p(a)) ? this._bodyArrayBuffer = A(a) : this._bodyText = a = Object.prototype.toString.call(a) : this._bodyText = "", this.headers.get("content-type") || (typeof a == "string" ? this.headers.set("content-type", "text/plain;charset=UTF-8") : this._bodyBlob && this._bodyBlob.type ? this.headers.set("content-type", this._bodyBlob.type) : f.searchParams && URLSearchParams.prototype.isPrototypeOf(a) && this.headers.set("content-type", "application/x-www-form-urlencoded;charset=UTF-8"));
          }, f.blob && (this.blob = function() {
            var a = x(this);
            if (a)
              return a;
            if (this._bodyBlob)
              return Promise.resolve(this._bodyBlob);
            if (this._bodyArrayBuffer)
              return Promise.resolve(new Blob([this._bodyArrayBuffer]));
            if (this._bodyFormData)
              throw new Error("could not read FormData body as blob");
            return Promise.resolve(new Blob([this._bodyText]));
          }, this.arrayBuffer = function() {
            return this._bodyArrayBuffer ? x(this) || Promise.resolve(this._bodyArrayBuffer) : this.blob().then(T);
          }), this.text = function() {
            var a = x(this);
            if (a)
              return a;
            if (this._bodyBlob)
              return M(this._bodyBlob);
            if (this._bodyArrayBuffer)
              return Promise.resolve(S(this._bodyArrayBuffer));
            if (this._bodyFormData)
              throw new Error("could not read FormData body as text");
            return Promise.resolve(this._bodyText);
          }, f.formData && (this.formData = function() {
            return this.text().then(G);
          }), this.json = function() {
            return this.text().then(JSON.parse);
          }, this;
        }
        var z = ["DELETE", "GET", "HEAD", "OPTIONS", "POST", "PUT"];
        function U(a) {
          var c = a.toUpperCase();
          return z.indexOf(c) > -1 ? c : a;
        }
        function H(a, c) {
          c = c || {};
          var d = c.body;
          if (a instanceof H) {
            if (a.bodyUsed)
              throw new TypeError("Already read");
            this.url = a.url, this.credentials = a.credentials, c.headers || (this.headers = new N(a.headers)), this.method = a.method, this.mode = a.mode, this.signal = a.signal, !d && a._bodyInit != null && (d = a._bodyInit, a.bodyUsed = !0);
          } else
            this.url = String(a);
          if (this.credentials = c.credentials || this.credentials || "same-origin", (c.headers || !this.headers) && (this.headers = new N(c.headers)), this.method = U(c.method || this.method || "GET"), this.mode = c.mode || this.mode || null, this.signal = c.signal || this.signal, this.referrer = null, (this.method === "GET" || this.method === "HEAD") && d)
            throw new TypeError("Body not allowed for GET or HEAD requests");
          this._initBody(d);
        }
        H.prototype.clone = function() {
          return new H(this, { body: this._bodyInit });
        };
        function G(a) {
          var c = new FormData();
          return a.trim().split("&").forEach(function(d) {
            if (d) {
              var g = d.split("="), b = g.shift().replace(/\+/g, " "), w = g.join("=").replace(/\+/g, " ");
              c.append(decodeURIComponent(b), decodeURIComponent(w));
            }
          }), c;
        }
        function V(a) {
          var c = new N(), d = a.replace(/\r?\n[\t ]+/g, " ");
          return d.split(/\r?\n/).forEach(function(g) {
            var b = g.split(":"), w = b.shift().trim();
            if (w) {
              var k = b.join(":").trim();
              c.append(w, k);
            }
          }), c;
        }
        j.call(H.prototype);
        function I(a, c) {
          c || (c = {}), this.type = "default", this.status = c.status === void 0 ? 200 : c.status, this.ok = this.status >= 200 && this.status < 300, this.statusText = "statusText" in c ? c.statusText : "OK", this.headers = new N(c.headers), this.url = c.url || "", this._initBody(a);
        }
        j.call(I.prototype), I.prototype.clone = function() {
          return new I(this._bodyInit, {
            status: this.status,
            statusText: this.statusText,
            headers: new N(this.headers),
            url: this.url
          });
        }, I.error = function() {
          var a = new I(null, { status: 0, statusText: "" });
          return a.type = "error", a;
        };
        var B = [301, 302, 303, 307, 308];
        I.redirect = function(a, c) {
          if (B.indexOf(c) === -1)
            throw new RangeError("Invalid status code");
          return new I(null, { status: c, headers: { location: a } });
        }, o.DOMException = s.DOMException;
        try {
          new o.DOMException();
        } catch {
          o.DOMException = function(c, d) {
            this.message = c, this.name = d;
            var g = Error(c);
            this.stack = g.stack;
          }, o.DOMException.prototype = Object.create(Error.prototype), o.DOMException.prototype.constructor = o.DOMException;
        }
        function P(a, c) {
          return new Promise(function(d, g) {
            var b = new H(a, c);
            if (b.signal && b.signal.aborted)
              return g(new o.DOMException("Aborted", "AbortError"));
            var w = new XMLHttpRequest();
            function k() {
              w.abort();
            }
            w.onload = function() {
              var y = {
                status: w.status,
                statusText: w.statusText,
                headers: V(w.getAllResponseHeaders() || "")
              };
              y.url = "responseURL" in w ? w.responseURL : y.headers.get("X-Request-URL");
              var l = "response" in w ? w.response : w.responseText;
              d(new I(l, y));
            }, w.onerror = function() {
              g(new TypeError("Network request failed"));
            }, w.ontimeout = function() {
              g(new TypeError("Network request failed"));
            }, w.onabort = function() {
              g(new o.DOMException("Aborted", "AbortError"));
            }, w.open(b.method, b.url, !0), b.credentials === "include" ? w.withCredentials = !0 : b.credentials === "omit" && (w.withCredentials = !1), "responseType" in w && f.blob && (w.responseType = "blob"), b.headers.forEach(function(y, l) {
              w.setRequestHeader(l, y);
            }), b.signal && (b.signal.addEventListener("abort", k), w.onreadystatechange = function() {
              w.readyState === 4 && b.signal.removeEventListener("abort", k);
            }), w.send(typeof b._bodyInit > "u" ? null : b._bodyInit);
          });
        }
        return P.polyfill = !0, s.fetch || (s.fetch = P, s.Headers = N, s.Request = H, s.Response = I), o.Headers = N, o.Request = H, o.Response = I, o.fetch = P, Object.defineProperty(o, "__esModule", { value: !0 }), o;
      })({});
    })(r), r.fetch.ponyfill = !0, delete r.fetch.polyfill;
    var i = r;
    e = i.fetch, e.default = i.fetch, e.fetch = i.fetch, e.Headers = i.Headers, e.Request = i.Request, e.Response = i.Response, t.exports = e;
  }(rr, rr.exports)), rr.exports;
}
(function(t, e) {
  var n;
  if (typeof fetch == "function" && (typeof jn < "u" && jn.fetch ? n = jn.fetch : typeof window < "u" && window.fetch ? n = window.fetch : n = fetch), typeof Ic < "u" && (typeof window > "u" || typeof window.document > "u")) {
    var r = n || m1();
    r.default && (r = r.default), e.default = r, t.exports = e.default;
  }
})(Wi, Wi.exports);
var Yf = Wi.exports;
const Wf = /* @__PURE__ */ na(Yf), Vo = /* @__PURE__ */ gc({
  __proto__: null,
  default: Wf
}, [Yf]);
function wr(t) {
  "@babel/helpers - typeof";
  return wr = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(e) {
    return typeof e;
  } : function(e) {
    return e && typeof Symbol == "function" && e.constructor === Symbol && e !== Symbol.prototype ? "symbol" : typeof e;
  }, wr(t);
}
var zt;
typeof fetch == "function" && (typeof global < "u" && global.fetch ? zt = global.fetch : typeof window < "u" && window.fetch ? zt = window.fetch : zt = fetch);
var Bn;
qf() && (typeof global < "u" && global.XMLHttpRequest ? Bn = global.XMLHttpRequest : typeof window < "u" && window.XMLHttpRequest && (Bn = window.XMLHttpRequest));
var xr;
typeof ActiveXObject == "function" && (typeof global < "u" && global.ActiveXObject ? xr = global.ActiveXObject : typeof window < "u" && window.ActiveXObject && (xr = window.ActiveXObject));
!zt && Vo && !Bn && !xr && (zt = Wf || Vo);
typeof zt != "function" && (zt = void 0);
var Ki = function(e, n) {
  if (n && wr(n) === "object") {
    var r = "";
    for (var i in n)
      r += "&" + encodeURIComponent(i) + "=" + encodeURIComponent(n[i]);
    if (!r) return e;
    e = e + (e.indexOf("?") !== -1 ? "&" : "?") + r.slice(1);
  }
  return e;
}, Go = function(e, n, r) {
  zt(e, n).then(function(i) {
    if (!i.ok) return r(i.statusText || "Error", {
      status: i.status
    });
    i.text().then(function(s) {
      r(null, {
        status: i.status,
        data: s
      });
    }).catch(r);
  }).catch(r);
}, qo = !1, g1 = function(e, n, r, i) {
  e.queryStringParams && (n = Ki(n, e.queryStringParams));
  var s = Yi({}, typeof e.customHeaders == "function" ? e.customHeaders() : e.customHeaders);
  r && (s["Content-Type"] = "application/json");
  var o = typeof e.requestOptions == "function" ? e.requestOptions(r) : e.requestOptions, f = Yi({
    method: r ? "POST" : "GET",
    body: r ? e.stringify(r) : void 0,
    headers: s
  }, qo ? {} : o);
  try {
    Go(n, f, i);
  } catch (u) {
    if (!o || Object.keys(o).length === 0 || !u.message || u.message.indexOf("not implemented") < 0)
      return i(u);
    try {
      Object.keys(o).forEach(function(h) {
        delete f[h];
      }), Go(n, f, i), qo = !0;
    } catch (h) {
      i(h);
    }
  }
}, b1 = function(e, n, r, i) {
  r && wr(r) === "object" && (r = Ki("", r).slice(1)), e.queryStringParams && (n = Ki(n, e.queryStringParams));
  try {
    var s;
    Bn ? s = new Bn() : s = new xr("MSXML2.XMLHTTP.3.0"), s.open(r ? "POST" : "GET", n, 1), e.crossDomain || s.setRequestHeader("X-Requested-With", "XMLHttpRequest"), s.withCredentials = !!e.withCredentials, r && s.setRequestHeader("Content-Type", "application/x-www-form-urlencoded"), s.overrideMimeType && s.overrideMimeType("application/json");
    var o = e.customHeaders;
    if (o = typeof o == "function" ? o() : o, o)
      for (var f in o)
        s.setRequestHeader(f, o[f]);
    s.onreadystatechange = function() {
      s.readyState > 3 && i(s.status >= 400 ? s.statusText : null, {
        status: s.status,
        data: s.responseText
      });
    }, s.send(r);
  } catch (u) {
  }
}, y1 = function(e, n, r, i) {
  if (typeof r == "function" && (i = r, r = void 0), i = i || function() {
  }, zt)
    return g1(e, n, r, i);
  if (qf() || typeof ActiveXObject == "function")
    return b1(e, n, r, i);
  i(new Error("No fetch and no xhr implementation found!"));
};
function v1(t, e) {
  if (!(t instanceof e))
    throw new TypeError("Cannot call a class as a function");
}
function w1(t, e) {
  for (var n = 0; n < e.length; n++) {
    var r = e[n];
    r.enumerable = r.enumerable || !1, r.configurable = !0, "value" in r && (r.writable = !0), Object.defineProperty(t, r.key, r);
  }
}
function x1(t, e, n) {
  return e && w1(t.prototype, e), Object.defineProperty(t, "prototype", { writable: !1 }), t;
}
function P1(t, e, n) {
  return e in t ? Object.defineProperty(t, e, { value: n, enumerable: !0, configurable: !0, writable: !0 }) : t[e] = n, t;
}
var O1 = function() {
  return {
    loadPath: "/locales/{{lng}}/{{ns}}.json",
    addPath: "/locales/add/{{lng}}/{{ns}}",
    allowMultiLoading: !1,
    parse: function(n) {
      return JSON.parse(n);
    },
    stringify: JSON.stringify,
    parsePayload: function(n, r, i) {
      return P1({}, r, i || "");
    },
    request: y1,
    reloadInterval: typeof window < "u" ? !1 : 60 * 60 * 1e3,
    customHeaders: {},
    queryStringParams: {},
    crossDomain: !1,
    withCredentials: !1,
    overrideMimeType: !1,
    requestOptions: {
      mode: "cors",
      credentials: "same-origin",
      cache: "default"
    }
  };
}, Kf = function() {
  function t(e) {
    var n = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {}, r = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {};
    v1(this, t), this.services = e, this.options = n, this.allOptions = r, this.type = "backend", this.init(e, n, r);
  }
  return x1(t, [{
    key: "init",
    value: function(n) {
      var r = this, i = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {}, s = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {};
      this.services = n, this.options = Yi(i, this.options || {}, O1()), this.allOptions = s, this.services && this.options.reloadInterval && setInterval(function() {
        return r.reload();
      }, this.options.reloadInterval);
    }
  }, {
    key: "readMulti",
    value: function(n, r, i) {
      this._readAny(n, n, r, r, i);
    }
  }, {
    key: "read",
    value: function(n, r, i) {
      this._readAny([n], n, [r], r, i);
    }
  }, {
    key: "_readAny",
    value: function(n, r, i, s, o) {
      var f = this, u = this.options.loadPath;
      typeof this.options.loadPath == "function" && (u = this.options.loadPath(n, i)), u = p1(u), u.then(function(h) {
        if (!h) return o(null, {});
        var p = f.services.interpolator.interpolate(h, {
          lng: n.join("+"),
          ns: i.join("+")
        });
        f.loadUrl(p, o, r, s);
      });
    }
  }, {
    key: "loadUrl",
    value: function(n, r, i, s) {
      var o = this;
      this.options.request(this.options, n, void 0, function(f, u) {
        if (u && (u.status >= 500 && u.status < 600 || !u.status)) return r("failed loading " + n + "; status code: " + u.status, !0);
        if (u && u.status >= 400 && u.status < 500) return r("failed loading " + n + "; status code: " + u.status, !1);
        if (!u && f && f.message && f.message.indexOf("Failed to fetch") > -1) return r("failed loading " + n + ": " + f.message, !0);
        if (f) return r(f, !1);
        var h, p;
        try {
          typeof u.data == "string" ? h = o.options.parse(u.data, i, s) : h = u.data;
        } catch {
          p = "failed parsing " + n + " to json";
        }
        if (p) return r(p, !1);
        r(null, h);
      });
    }
  }, {
    key: "create",
    value: function(n, r, i, s, o) {
      var f = this;
      if (this.options.addPath) {
        typeof n == "string" && (n = [n]);
        var u = this.options.parsePayload(r, i, s), h = 0, p = [], m = [];
        n.forEach(function(O) {
          var L = f.options.addPath;
          typeof f.options.addPath == "function" && (L = f.options.addPath(O, r));
          var N = f.services.interpolator.interpolate(L, {
            lng: O,
            ns: r
          });
          f.options.request(f.options, N, u, function(x, E) {
            h += 1, p.push(x), m.push(E), h === n.length && o && o(p, m);
          });
        });
      }
    }
  }, {
    key: "reload",
    value: function() {
      var n = this, r = this.services, i = r.backendConnector, s = r.languageUtils, o = r.logger, f = i.language;
      if (!(f && f.toLowerCase() === "cimode")) {
        var u = [], h = function(m) {
          var O = s.toResolveHierarchy(m);
          O.forEach(function(L) {
            u.indexOf(L) < 0 && u.push(L);
          });
        };
        h(f), this.allOptions.preload && this.allOptions.preload.forEach(function(p) {
          return h(p);
        }), u.forEach(function(p) {
          n.allOptions.ns.forEach(function(m) {
            i.read(p, m, "read", null, null, function(O, L) {
              O && o.warn("loading namespace ".concat(m, " for language ").concat(p, " failed"), O), !O && L && o.log("loaded namespace ".concat(m, " for language ").concat(p), L), i.loaded("".concat(p, "|").concat(m), O, L);
            });
          });
        });
      }
    }
  }]), t;
}();
Kf.type = "backend";
const N1 = Kf;
var Jf = [], L1 = Jf.forEach, E1 = Jf.slice;
function k1(t) {
  return L1.call(E1.call(arguments, 1), function(e) {
    if (e)
      for (var n in e)
        t[n] === void 0 && (t[n] = e[n]);
  }), t;
}
var Yo = /^[\u0009\u0020-\u007e\u0080-\u00ff]+$/, T1 = function(e, n, r) {
  var i = r || {};
  i.path = i.path || "/";
  var s = encodeURIComponent(n), o = e + "=" + s;
  if (i.maxAge > 0) {
    var f = i.maxAge - 0;
    if (isNaN(f)) throw new Error("maxAge should be a Number");
    o += "; Max-Age=" + Math.floor(f);
  }
  if (i.domain) {
    if (!Yo.test(i.domain))
      throw new TypeError("option domain is invalid");
    o += "; Domain=" + i.domain;
  }
  if (i.path) {
    if (!Yo.test(i.path))
      throw new TypeError("option path is invalid");
    o += "; Path=" + i.path;
  }
  if (i.expires) {
    if (typeof i.expires.toUTCString != "function")
      throw new TypeError("option expires is invalid");
    o += "; Expires=" + i.expires.toUTCString();
  }
  if (i.httpOnly && (o += "; HttpOnly"), i.secure && (o += "; Secure"), i.sameSite) {
    var u = typeof i.sameSite == "string" ? i.sameSite.toLowerCase() : i.sameSite;
    switch (u) {
      case !0:
        o += "; SameSite=Strict";
        break;
      case "lax":
        o += "; SameSite=Lax";
        break;
      case "strict":
        o += "; SameSite=Strict";
        break;
      case "none":
        o += "; SameSite=None";
        break;
      default:
        throw new TypeError("option sameSite is invalid");
    }
  }
  return o;
};
const M1 = {
  name: "cookie",
  lookup: function(e, n, r) {
    var i;
    if (r.lookupCookie && typeof e < "u") {
      var s = r.getCookies(e);
      s && (i = s[r.lookupCookie]);
    }
    return i;
  },
  cacheUserLanguage: function(e, n, r) {
    var i = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : {};
    if (i.lookupCookie && e !== "undefined") {
      var s = i.cookieExpirationDate;
      s || (s = /* @__PURE__ */ new Date(), s.setFullYear(s.getFullYear() + 1));
      var o = {
        expires: s,
        domain: i.cookieDomain,
        path: i.cookiePath,
        httpOnly: !1,
        overwrite: !0,
        sameSite: i.cookieSameSite
      };
      i.cookieSecure && (o.secure = i.cookieSecure);
      var f = i.getHeader(n, "set-cookie") || i.getHeader(n, "Set-Cookie") || [];
      typeof f == "string" && (f = [f]), Array.isArray(f) || (f = []), f = f.filter(function(u) {
        return u.indexOf("".concat(i.lookupCookie, "=")) !== 0;
      }), f.push(T1(i.lookupCookie, r, o)), i.setHeader(n, "Set-Cookie", f.length === 1 ? f[0] : f);
    }
  }
}, S1 = {
  name: "querystring",
  lookup: function(e, n, r) {
    var i;
    if (r.lookupQuerystring !== void 0 && typeof e < "u" && (r.getQuery(e) && (i = r.getQuery(e)[r.lookupQuerystring]), !i && r.getUrl(e) && r.getUrl(e).indexOf("?"))) {
      var s = r.getUrl(e).substring(r.getUrl(e).indexOf("?"));
      if (typeof URLSearchParams < "u") {
        var o = new URLSearchParams(s);
        i = o.get(r.lookupQuerystring);
      } else {
        var f = s.indexOf("".concat(r.lookupQuerystring, "="));
        if (f > -1) {
          var u = s.substring(r.lookupQuerystring.length + 2);
          u.indexOf("&") < 0 ? i = u : i = u.substring(0, u.indexOf("&"));
        }
      }
    }
    return i;
  }
}, z1 = {
  name: "path",
  lookup: function(e, n, r) {
    var i;
    if (e === void 0)
      return i;
    if (r.lookupPath !== void 0 && e.params && (i = r.getParams(e)[r.lookupPath]), !i && typeof r.lookupFromPathIndex == "number" && r.getOriginalUrl(e)) {
      var s = r.getOriginalUrl(e).split("?")[0], o = s.split("/");
      o[0] === "" && o.shift(), o.length > r.lookupFromPathIndex && (i = o[r.lookupFromPathIndex]);
    }
    return i;
  }
};
var A1 = ["hans", "hant", "latn", "cyrl", "cans", "mong", "arab", "419"];
const j1 = {
  name: "header",
  lookup: function(e, n, r) {
    var i;
    if (typeof e < "u") {
      var s = r.getHeaders(e);
      if (!s) return i;
      var o = [], f = r.lookupHeader ? s[r.lookupHeader] : s["accept-language"];
      if (f) {
        var u = /(([a-z]{2,3})-?([A-Z]{2})?)\s*;?\s*(q=([0-9.]+))?/gi;
        if (f.indexOf("-") > 0) {
          var h = A1.find(function(T) {
            return f.toLowerCase().indexOf("-".concat(T)) > 0;
          });
          h && (u = /(([a-z]{2,3})-?([A-Z0-9]{2,4})?)\s*;?\s*(q=([0-9.]+))?/gi);
        }
        var p = [], m, O, L = r.lookupHeaderRegex || u;
        do
          if (O = L.exec(f), O) {
            var N = O[1], x = O[5] || "1", E = Number(x);
            N && !isNaN(E) && p.push({
              lng: N,
              q: E
            });
          }
        while (O);
        for (p.sort(function(T, M) {
          return M.q - T.q;
        }), m = 0; m < p.length; m++)
          o.push(p[m].lng);
        o.length && (i = o);
      }
    }
    return i;
  }
};
function Ji(t) {
  "@babel/helpers - typeof";
  return Ji = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(e) {
    return typeof e;
  } : function(e) {
    return e && typeof Symbol == "function" && e.constructor === Symbol && e !== Symbol.prototype ? "symbol" : typeof e;
  }, Ji(t);
}
const H1 = {
  name: "session",
  lookup: function(e, n, r) {
    var i;
    return r.lookupSession !== void 0 && Ji(e) && r.getSession(e) && (i = r.getSession(e)[r.lookupSession]), i;
  },
  cacheUserLanguage: function(e, n, r) {
    var i = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : {};
    i.lookupSession && e && i.getSession(e) && (i.getSession(e)[i.lookupSession] = r);
  }
};
var R1 = function(e) {
  if (e.path) return e.path;
  if (e.raw && e.raw.path) return e.raw.path;
  if (e.url) return e.url;
}, Qf = function(e) {
  if (e.url && e.url.href) return e.url.href;
  if (e.url) return e.url;
  if (e.raw && e.raw.url) return e.raw.url;
}, I1 = function(e, n) {
  if (e.url) {
    e.url = n;
    return;
  }
}, U1 = function(e) {
  return e.originalUrl ? e.originalUrl : e.raw && e.raw.originalUrl ? e.raw.originalUrl : Qf(e);
}, X1 = function(e) {
  if (e.query && typeof e.query.entries == "function" && typeof Object.fromEntries == "function" && typeof e.query[Symbol.iterator] == "function")
    return Object.fromEntries(e.query);
  if (e.query) return e.query;
  if (e.searchParams) return e.searchParams;
  if (e.raw && e.raw.query) return e.raw.query;
  if (e.ctx && e.ctx.queryParams) return e.ctx.queryParams;
  if (e.url && e.url.searchParams) return e.url.searchParams;
  var n = e.url || e.raw && e.raw.url;
  return n && n.indexOf("?") < 0 ? {} : {};
}, D1 = function(e) {
  return e.params ? e.params : e.raw && e.raw.params ? e.raw.params : e.ctx && e.ctx.params ? e.ctx.params : {};
}, bn = function(e) {
  if (e.headers) return e.headers;
}, B1 = function(e) {
  if (e.cookies) return e.cookies;
  if (bn(e)) {
    var n = {}, r = bn(e).cookie;
    return r && r.split(";").forEach(function(i) {
      var s = i.split("=");
      n[s.shift().trim()] = decodeURI(encodeURI(s.join("=")));
    }), n;
  }
}, F1 = function(e) {
  return e.ctx && typeof e.ctx.body == "function" ? e.ctx.body.bind(e.ctx) : e.ctx && e.ctx.body ? e.ctx.body : e.json ? e.json : e.body ? e.body : e.payload ? e.payload : e.request && e.request.body ? e.request.body : {};
}, C1 = function(e, n) {
  if (e.getHeader) return e.getHeader(n);
  if (e.headers) return e.headers[n];
  if (bn(e) && bn(e)[n]) return bn(e)[n];
}, _f = function(e, n, r) {
  if (!(e._headerSent || e.headersSent)) {
    if (typeof e.setHeader == "function") return e.setHeader(n, r);
    if (typeof e.header == "function") return e.header(n, r);
    if (e.responseHeaders && typeof e.responseHeaders.set == "function")
      return e.responseHeaders.set(n, r);
    if (e.headers && typeof e.headers.set == "function")
      return e.headers.set(n, r);
    if (typeof e.set == "function")
      return e.set(n, r);
  }
}, Z1 = function(e, n) {
  if (typeof e.contentType == "function") return e.contentType(n);
  if (typeof e.type == "function") return e.type(n);
  _f(e, "Content-Type", n);
}, V1 = function(e, n) {
  if (typeof e.status == "function") return e.status(n);
  if (e.status) return e.status = n;
}, G1 = function(e, n) {
  return typeof e.send == "function" ? e.send(n) : (e.request && e.response && e.app && (e.body = n), n);
}, q1 = function(e) {
  if (e.session) return e.session;
  if (e.raw && e.raw.session) return e.raw.session;
}, Y1 = function() {
  var e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
  return e.getPath = e.getPath || R1, e.getOriginalUrl = e.getOriginalUrl || U1, e.getUrl = e.getUrl || Qf, e.setUrl = e.setUrl || I1, e.getParams = e.getParams || D1, e.getSession = e.getSession || q1, e.getQuery = e.getQuery || X1, e.getCookies = e.getCookies || B1, e.getBody = e.getBody || F1, e.getHeaders = e.getHeaders || bn, e.getHeader = e.getHeader || C1, e.setHeader = e.setHeader || _f, e.setContentType = e.setContentType || Z1, e.setStatus = e.setStatus || V1, e.send = e.send || G1, e;
};
function Fn(t) {
  "@babel/helpers - typeof";
  return Fn = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(e) {
    return typeof e;
  } : function(e) {
    return e && typeof Symbol == "function" && e.constructor === Symbol && e !== Symbol.prototype ? "symbol" : typeof e;
  }, Fn(t);
}
function W1(t, e) {
  if (!(t instanceof e))
    throw new TypeError("Cannot call a class as a function");
}
function K1(t, e) {
  for (var n = 0; n < e.length; n++) {
    var r = e[n];
    r.enumerable = r.enumerable || !1, r.configurable = !0, "value" in r && (r.writable = !0), Object.defineProperty(t, Q1(r.key), r);
  }
}
function J1(t, e, n) {
  return e && K1(t.prototype, e), Object.defineProperty(t, "prototype", { writable: !1 }), t;
}
function Q1(t) {
  var e = _1(t, "string");
  return Fn(e) === "symbol" ? e : String(e);
}
function _1(t, e) {
  if (Fn(t) !== "object" || t === null) return t;
  var n = t[Symbol.toPrimitive];
  if (n !== void 0) {
    var r = n.call(t, e);
    if (Fn(r) !== "object") return r;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return String(t);
}
function $1() {
  return Y1({
    order: ["querystring", "cookie", "header"],
    lookupQuerystring: "lng",
    lookupCookie: "i18next",
    lookupSession: "lng",
    lookupFromPathIndex: 0,
    caches: !1,
    cookieSameSite: "strict",
    ignoreCase: !0,
    convertDetectedLanguage: function(e) {
      return e;
    }
  });
}
var $f = function() {
  function t(e) {
    var n = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {}, r = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {};
    W1(this, t), this.type = "languageDetector", this.detectors = {}, this.init(e, n, r);
  }
  return J1(t, [{
    key: "init",
    value: function(n) {
      var r = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {}, i = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {};
      this.services = n, this.options = k1(r, this.options || {}, $1()), this.allOptions = i, typeof this.options.convertDetectedLanguage == "string" && this.options.convertDetectedLanguage.indexOf("15897") > -1 && (this.options.convertDetectedLanguage = function(s) {
        return s.replace("-", "_");
      }), this.addDetector(M1), this.addDetector(S1), this.addDetector(z1), this.addDetector(j1), this.addDetector(H1);
    }
  }, {
    key: "addDetector",
    value: function(n) {
      this.detectors[n.name] = n;
    }
  }, {
    key: "detect",
    value: function(n, r, i) {
      var s = this;
      if (!(arguments.length < 2)) {
        i || (i = this.options.order);
        var o;
        if (i.forEach(function(u) {
          if (!(o || !s.detectors[u])) {
            var h = s.detectors[u].lookup(n, r, s.options);
            h && (Array.isArray(h) || (h = [h]), h = h.filter(function(p) {
              return p != null;
            }), h = h.map(function(p) {
              return s.options.convertDetectedLanguage(p);
            }), s.services.languageUtils.getBestMatchFromCodes ? (o = s.services.languageUtils.getBestMatchFromCodes(h), o && (s.options.ignoreCase ? h.map(function(p) {
              return p.toLowerCase();
            }).indexOf(o.toLowerCase()) < 0 && (o = void 0) : h.indexOf(o) < 0 && (o = void 0)), o && (n.i18nextLookupName = u)) : o = h.length > 0 ? h[0] : null);
          }
        }), !o) {
          var f = this.allOptions.fallbackLng;
          typeof f == "function" && (f = f()), typeof f == "string" && (f = [f]), f || (f = []), Object.prototype.toString.apply(f) === "[object Array]" ? o = f[0] : o = f[0] || f.default && f.default[0];
        }
        return o;
      }
    }
  }, {
    key: "cacheUserLanguage",
    value: function(n, r, i, s) {
      var o = this;
      arguments.length < 3 || (s || (s = this.options.caches), s && s.forEach(function(f) {
        o.detectors[f] && o.detectors[f].cacheUserLanguage && r.cachedUserLanguage !== i && (o.detectors[f].cacheUserLanguage(n, r, i, o.options), r.cachedUserLanguage = i);
      }));
    }
  }]), t;
}();
$f.type = "languageDetector";
var em = $f, tm = /&(?:amp|#38|lt|#60|gt|#62|apos|#39|quot|#34|nbsp|#160|copy|#169|reg|#174|hellip|#8230|#x2F|#47);/g, nm = {
  "&amp;": "&",
  "&#38;": "&",
  "&lt;": "<",
  "&#60;": "<",
  "&gt;": ">",
  "&#62;": ">",
  "&apos;": "'",
  "&#39;": "'",
  "&quot;": '"',
  "&#34;": '"',
  "&nbsp;": " ",
  "&#160;": " ",
  "&copy;": "©",
  "&#169;": "©",
  "&reg;": "®",
  "&#174;": "®",
  "&hellip;": "…",
  "&#8230;": "…",
  "&#x2F;": "/",
  "&#47;": "/"
}, rm = function(e) {
  return nm[e];
}, im = function(e) {
  return e.replace(tm, rm);
};
function Wo(t, e) {
  var n = Object.keys(t);
  if (Object.getOwnPropertySymbols) {
    var r = Object.getOwnPropertySymbols(t);
    e && (r = r.filter(function(i) {
      return Object.getOwnPropertyDescriptor(t, i).enumerable;
    })), n.push.apply(n, r);
  }
  return n;
}
function Ko(t) {
  for (var e = 1; e < arguments.length; e++) {
    var n = arguments[e] != null ? arguments[e] : {};
    e % 2 ? Wo(Object(n), !0).forEach(function(r) {
      At(t, r, n[r]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(t, Object.getOwnPropertyDescriptors(n)) : Wo(Object(n)).forEach(function(r) {
      Object.defineProperty(t, r, Object.getOwnPropertyDescriptor(n, r));
    });
  }
  return t;
}
var Qi = {
  bindI18n: "languageChanged",
  bindI18nStore: "",
  transEmptyNodeValue: "",
  transSupportBasicHtmlNodes: !0,
  transWrapTextNodes: "",
  transKeepBasicHtmlNodesFor: ["br", "strong", "i", "p"],
  useSuspense: !0,
  unescape: im
}, ec, yg = ir.createContext();
function sm() {
  var t = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
  Qi = Ko(Ko({}, Qi), t);
}
function vg() {
  return Qi;
}
var wg = function() {
  function t() {
    ut(this, t), this.usedNamespaces = {};
  }
  return lt(t, [{
    key: "addUsedNamespaces",
    value: function(n) {
      var r = this;
      n.forEach(function(i) {
        r.usedNamespaces[i] || (r.usedNamespaces[i] = !0);
      });
    }
  }, {
    key: "getUsedNamespaces",
    value: function() {
      return Object.keys(this.usedNamespaces);
    }
  }]), t;
}();
function om(t) {
  ec = t;
}
function xg() {
  return ec;
}
var am = {
  type: "3rdParty",
  init: function(e) {
    sm(e.options.react), om(e);
  }
};
const fm = {
  NO_POLKADOT_EXTENSION: "Polkadot extension not found"
}, cm = {
  SELECT_ALL: "Select all containing the following",
  IF_NONE_CLICK_NEXT: "If there are none, click Next",
  NEXT: "Next",
  SUBMIT: "Submit",
  CANCEL: "Cancel",
  SELECT_ACCOUNT: "Select account",
  NO_ACCOUNTS_FOUND: "No accounts found",
  ACCOUNT_NOT_FOUND: "Account not found",
  NO_EXTENSION_FOUND: "No extension found",
  EXTENSION_NOT_FOUND: "Extension not found",
  CANVAS: "Error with Captcha canvas"
}, um = {
  BAD_SURI: "Bad SURI",
  CANNOT_FIND_CONFIG_FILE: "prosopo.config.js / prosopo.config.ts cannot be found.",
  JSON_LOAD_FAILED: "Failed to load JSON file",
  CREATE_JSON_FILE_FAILED: "Failed to create JSON file",
  ASSERT_ERROR: "AssertionError",
  GENERATE_CAPTCHAS_JSON_FAILED: "Something went wrong while creating captchas json file",
  CALCULATE_CAPTCHA_SOLUTION: "Something went wrong while calculating captcha solutions",
  MNEMONIC_UNDEFINED: "Mnemonic Undefined. Please set the mnemonic in environment variables",
  NO_MNEMONIC_OR_SEED: "No mnemonic or seed provided",
  ASYNC_FACTORY_CREATE: "Use `create` factory method",
  CANT_FIND_KEYRINGPAIR: "Can't find the keyringpair for {{address}}",
  ENVIRONMENT_NOT_READY: "Environment not ready",
  INVALID_SIGNATURE: "Invalid signature",
  PAIR_TYPE_UNDEFINED: "Pair type undefined",
  NOT_IMPLEMENTED: "Not implemented",
  NO_PAIR_TYPE_OR_SS58_FORMAT: "No pair type or ss58 format provided",
  SITE_KEY_MISSING: "SITE KEY missing",
  ACCOUNT_NOT_FOUND: "Account not found"
}, lm = {
  INVALID_METHOD: "Invalid contract method",
  TX_ERROR: "Error making tx",
  QUERY_ERROR: "Error making query",
  INVALID_ADDRESS: "Failed to encode invalid address",
  INVALID_STORAGE_NAME: "Failed to find given storage name",
  CAPTCHA_SOLUTION_COMMITMENT_DOES_NOT_EXIST: "Captcha solution commitment does not exist",
  DAPP_NOT_ACTIVE: "Dapp is not active",
  CONTRACT_UNDEFINED: "Contract undefined",
  SIGNER_UNDEFINED: "Signer undefined",
  SIGNER_NOT_SUPPORTED: "Signer is not supported. Use connect instead, e.g. contract.connect(signer)",
  CANNOT_FIND_KEYPAIR: "Cannot find keypair",
  INVALID_TYPE: "Invalid type",
  INVALID_ABI: "Invalid ABI",
  NOT_HANDLED: "Not handled",
  INVALID_STORAGE_TYPE: "Invalid storage type",
  INTERRUPTED_EVENT: "Event interrupted",
  TOO_MANY_CALLS: "Too many calls",
  UNKNOWN_ERROR: "Unknown error",
  CHAIN_DECIMALS_UNDEFINED: "Chain decimals are not defined",
  INVALID_DATA_FORMAT: "Invalid data format",
  INVALID_BLOCKHASH: "Invalid blockhash",
  TX_QUEUE_ERROR: "Error in Transaction Queue",
  DISPATCH_ERROR: "Error dispatching transaction"
}, dm = {
  UNKNOWN_ENVIRONMENT: "Unknown environment requested",
  INVALID_CAPTCHA_NUMBER: "Please configure captchas configurations correctly",
  CONFIGURATIONS_LOAD_FAILED: "Prosopo configurations load failed",
  INVALID_LOG_LEVEL: "Invalid log level",
  INVALID_PACKAGE_DIR: "Invalid package directory"
}, hm = {
  DATASET_PARSE_ERROR: "Error parsing dataset",
  SOLUTION_PARSE_ERROR: "Error parsing dataset",
  HASH_ERROR: "Error hashing dataset",
  INVALID_DATASET_ID: "Invalid dataset id",
  DATASET_ID_UNDEFINED: "Dataset id undefined",
  NOT_ENOUGH_LABELS: "Not enough labels",
  NOT_ENOUGH_IMAGES: "Not enough images",
  CAPTCHAS_COUNT_LESS_THAN_CONFIGURED: "Number of captchas in dataset is less than configured number of captchas",
  SOLUTIONS_COUNT_LESS_THAN_CONFIGURED: "Number of solutions in dataset is less than configured number of solutions",
  DUPLICATE_IMAGE: "duplicate image detected",
  MERKLE_ERROR: "Error creating merkle tree"
}, pm = {
  CONNECT_ERROR: "Failed to connect",
  DATABASE_IMPORT_FAILED: "Failed to import database engine",
  DATABASE_UNDEFINED: "Database client is not connected",
  DATABASE_HOST_UNDEFINED: "Database host address is not defined",
  COLLECTION_UNDEFINED: "Database collection is not available",
  DATASET_LOAD_FAILED: "Data set load failed",
  DATASET_GET_FAILED: "Failed to get dataset",
  CAPTCHA_GET_FAILED: "Failed to get captcha",
  CAPTCHA_UPDATE_FAILED: "Failed to update captcha",
  IMAGE_GET_FAILED: "Failed to get image",
  NO_CAPTCHAS_FOUND: "No captcha matching datasetId",
  PENDING_RECORD_NOT_FOUND: "No pending record found",
  INVALID_HASH: "Invalid hash",
  SOLUTION_GET_FAILED: "Failed to get solution",
  DATASET_WITH_SOLUTIONS_GET_FAILED: "No datasets found with required number of solutions",
  SOLUTION_APPROVE_FAILED: "Failed to approve solution",
  SOLUTION_FLAG_FAILED: "Failed to flag solution as processed",
  TABLES_UNDEFINED: "Tables undefined",
  CONNECTION_UNDEFINED: "Connection undefined",
  COMMITMENT_FLAG_FAILED: "Failed to flag commitment as processed"
}, mm = {
  PARSE_ERROR: "Error parsing captcha",
  INVALID_CAPTCHA_ID: "Invalid captcha id",
  SOLUTION_HASH_ERROR: "Error hashing solution",
  INVALID_ITEM_FORMAT: "Only image and text item types allowed",
  INVALID_SOLUTION_TYPE: "Invalid solution type",
  INVALID_ITEM_HASH: "Invalid item hash",
  DIFFERENT_DATASET_IDS: "Dataset ids do not match",
  INVALID_BLOCK_NO: "Invalid block number",
  INVALID_TIMESTAMP: "Invalid timestamp",
  ID_MISMATCH: "captcha id mismatch",
  MISSING_ITEM_HASH: "missing item hash",
  INVALID_LEAF_HASH: "Invalid leaf hash",
  INVALID_CAPTCHA_CHALLENGE: "Invalid captcha challenge",
  INVALID_DATASET_CONTENT_ID: "Invalid dataset content id",
  DAPP_USER_SOLUTION_NOT_FOUND: "Dapp user solution not found",
  INVALID_PROVIDER_URL: "Invalid provider url",
  NO_CAPTCHA: "No captcha found",
  INVALID_TOKEN: "Invalid token",
  IP_ADDRESS_MISMATCH: "IP address mismatch",
  INVALID_SOLUTION: "Invalid solution"
}, gm = {
  BODY_UNDEFINED: "Body must be defined in API POST call",
  PARAMETER_UNDEFINED: "Parameters must be defined in API POST call",
  CAPTCHA_FAILED: "You answered one or more captchas incorrectly. Please try again",
  CAPTCHA_PENDING: "Captcha solutions submitted and awaiting approval",
  CAPTCHA_PASSED: "You correctly answered the captchas",
  BAD_REQUEST: "BadRequest",
  PAYMENT_INFO_NOT_FOUND: "Payment info not found for given block and transaction hashes",
  USER_VERIFIED: "User verified",
  USER_NOT_VERIFIED: "User not verified",
  USER_NOT_VERIFIED_TIME_EXPIRED: "User not verified. Captcha solution has expired.",
  USER_NOT_VERIFIED_NO_SOLUTION: "User not verified. No captcha solution found.",
  USER_ALREADY_VERIFIED: "This solution has already been verified. User should complete a new captcha.",
  UNKNOWN: "Unknown API error"
}, bm = {
  PARAMETER_ERROR: "Invalid parameter"
}, ym = {
  PROSOPO_SITE_KEY_MISSING: "PROSOPO_SITE_KEY is not set in .env file.",
  BALANCE_TOO_LOW: "{{mnemonic}} balance too low: {{balance}}",
  CAPTCHA_ID_MISSING: "Cannot find captcha data id",
  COMMITMENT_ID_MISSING: "Commitment id missing",
  PROVIDER_NOT_FOUND: "Provider not found",
  PROVIDER_NO_CAPTCHA: "No captchas returned from provider",
  CREATE_ACCOUNT_FAILED: "Could not create an account!",
  CREATE_ACCOUNT_FAILED_OUT_OF_FUNDS: "Could not create an account as there are no funds. Restart the substrate node.",
  NO_MOCK_ENV: "MockEnvironment not set up",
  ACCOUNT_TYPE_MISSING: "{{accountType}} not created by databasePopulator",
  FUNDING_FAILED: "Funding failed",
  MISSING_PROVIDER_PAIR: "Missing provider pair",
  NETWORK_NOT_FOUND: "Network not found",
  MISSING_ENV_VARIABLE: "Missing environment variable",
  GENERAL: "General Dev Error, see context",
  MISSING_SECRET_KEY: "Missing secret key",
  KEY_ERROR: "Key error",
  METHOD_NOT_IMPLEMENTED: "Method not implemented"
}, vm = {
  DIRECTORY_NOT_FOUND: "Directory not found",
  FILE_NOT_FOUND: "File not found",
  FILE_ALREADY_EXISTS: "File already exists",
  DIRECTORY_ALREADY_EXISTS: "Directory already exists",
  SAME_FILE: "Same file",
  INVALID_DIR_FORMAT: "Invalid directory format"
}, wm = {
  NO_STATE_PROVIDER: "useGlobalState must be used within a GlobalStateProvider"
}, tc = {
  ACCOUNT: fm,
  WIDGET: cm,
  GENERAL: um,
  CONTRACT: lm,
  CONFIG: dm,
  DATASET: hm,
  DATABASE: pm,
  CAPTCHA: mm,
  API: gm,
  CLI: bm,
  DEVELOPER: ym,
  FS: vm,
  PROGUI: wm
};
class ws extends Error {
  constructor(e, n) {
    const r = (n == null ? void 0 : n.logger) || Sm(), i = (n == null ? void 0 : n.logLevel) || "error";
    e instanceof Error ? (super(e.message), this.translationKey = n == null ? void 0 : n.translationKey, this.context = {
      ...n == null ? void 0 : n.context,
      ...n != null && n.translationKey ? { translationMessage: Dn.t(n.translationKey) } : {}
    }) : (super(Dn.t(e)), this.translationKey = e, this.context = n == null ? void 0 : n.context), n != null && n.silent || this.logError(r, i);
  }
  logError(e, n) {
    const r = `
*************** ERROR ***************
`, i = `Error Type: ${this.name}
`, s = JSON.stringify({ error: this.message, context: this.context }, null, 4), o = `${r}${i}${s}`;
    e[n](o);
  }
}
class ur extends ws {
  constructor(e, n) {
    const r = (n == null ? void 0 : n.name) || "ProsopoError", i = { ...n, name: r };
    super(e, i);
  }
}
class nc extends ws {
  constructor(e, n) {
    const r = (n == null ? void 0 : n.name) || "ProsopoEnvError", i = { ...n, name: r };
    super(e, i);
  }
}
class Pg extends ws {
  constructor(e, n) {
    const r = (n == null ? void 0 : n.name) || "ProsopoDatasetError", i = { ...n, name: r };
    super(e, i);
  }
}
function xm() {
  return !!(typeof window < "u" && window.document && window.document.createElement);
}
function rc(t) {
  return typeof t == "string" ? [] : Object.keys(t).reduce((e, n) => {
    const r = t[n];
    if (r === void 0)
      throw new ur("DEVELOPER.KEY_ERROR", {
        context: { error: `Undefined value for key ${n}` }
      });
    const i = rc(r);
    return e.concat(i.map((s) => `${n}.${s}`));
  }, []);
}
const Jo = sr.enum(rc(tc));
sr.record(Jo, sr.record(Jo, sr.string()));
const Qo = {
  debug: !1,
  fallbackLng: "en",
  resources: {
    en: {
      translation: tc
    }
  }
}, Pm = {
  react: {
    useSuspense: !1
  }
}, Om = {};
xm() ? Dn.use(Vf).use(am).init({ ...Qo, ...Pm }) : Dn.use(new N1(void 0, { reloadInterval: !1 })).use(em).init({ ...Qo, ...Om });
const Ve = {
  silent: Number.NEGATIVE_INFINITY,
  fatal: 0,
  error: 0,
  warn: 1,
  log: 2,
  info: 3,
  success: 3,
  fail: 3,
  ready: 3,
  start: 3,
  box: 3,
  debug: 4,
  trace: 5,
  verbose: Number.POSITIVE_INFINITY
}, _o = {
  // Silent
  silent: {
    level: -1
  },
  // Level 0
  fatal: {
    level: Ve.fatal
  },
  error: {
    level: Ve.error
  },
  // Level 1
  warn: {
    level: Ve.warn
  },
  // Level 2
  log: {
    level: Ve.log
  },
  // Level 3
  info: {
    level: Ve.info
  },
  success: {
    level: Ve.success
  },
  fail: {
    level: Ve.fail
  },
  ready: {
    level: Ve.info
  },
  start: {
    level: Ve.info
  },
  box: {
    level: Ve.info
  },
  // Level 4
  debug: {
    level: Ve.debug
  },
  // Level 5
  trace: {
    level: Ve.trace
  },
  // Verbose
  verbose: {
    level: Ve.verbose
  }
};
function Ni(t) {
  return t !== null && typeof t == "object";
}
function _i(t, e, n = ".", r) {
  if (!Ni(e))
    return _i(t, {}, n);
  const i = Object.assign({}, e);
  for (const s in t) {
    if (s === "__proto__" || s === "constructor")
      continue;
    const o = t[s];
    o != null && (Array.isArray(o) && Array.isArray(i[s]) ? i[s] = [...o, ...i[s]] : Ni(o) && Ni(i[s]) ? i[s] = _i(
      o,
      i[s],
      (n ? `${n}.` : "") + s.toString()
    ) : i[s] = o);
  }
  return i;
}
function Nm(t) {
  return (...e) => (
    // eslint-disable-next-line unicorn/no-array-reduce
    e.reduce((n, r) => _i(n, r, ""), {})
  );
}
const Lm = Nm();
function Em(t) {
  return Object.prototype.toString.call(t) === "[object Object]";
}
function km(t) {
  return !(!Em(t) || !t.message && !t.args || t.stack);
}
let Li = !1;
const $o = [];
class _e {
  constructor(e = {}) {
    const n = e.types || _o;
    this.options = Lm(
      {
        ...e,
        defaults: { ...e.defaults },
        level: Ei(e.level, n),
        reporters: [...e.reporters || []]
      },
      {
        types: _o,
        throttle: 1e3,
        throttleMin: 5,
        formatOptions: {
          date: !0,
          colors: !1,
          compact: !0
        }
      }
    );
    for (const r in n) {
      const i = {
        type: r,
        ...this.options.defaults,
        ...n[r]
      };
      this[r] = this._wrapLogFn(i), this[r].raw = this._wrapLogFn(
        i,
        !0
      );
    }
    this.options.mockFn && this.mockTypes(), this._lastLog = {};
  }
  get level() {
    return this.options.level;
  }
  set level(e) {
    this.options.level = Ei(
      e,
      this.options.types,
      this.options.level
    );
  }
  prompt(e, n) {
    if (!this.options.prompt)
      throw new Error("prompt is not supported!");
    return this.options.prompt(e, n);
  }
  create(e) {
    const n = new _e({
      ...this.options,
      ...e
    });
    return this._mockFn && n.mockTypes(this._mockFn), n;
  }
  withDefaults(e) {
    return this.create({
      ...this.options,
      defaults: {
        ...this.options.defaults,
        ...e
      }
    });
  }
  withTag(e) {
    return this.withDefaults({
      tag: this.options.defaults.tag ? this.options.defaults.tag + ":" + e : e
    });
  }
  addReporter(e) {
    return this.options.reporters.push(e), this;
  }
  removeReporter(e) {
    if (e) {
      const n = this.options.reporters.indexOf(e);
      if (n >= 0)
        return this.options.reporters.splice(n, 1);
    } else
      this.options.reporters.splice(0);
    return this;
  }
  setReporters(e) {
    return this.options.reporters = Array.isArray(e) ? e : [e], this;
  }
  wrapAll() {
    this.wrapConsole(), this.wrapStd();
  }
  restoreAll() {
    this.restoreConsole(), this.restoreStd();
  }
  wrapConsole() {
    for (const e in this.options.types)
      console["__" + e] || (console["__" + e] = console[e]), console[e] = this[e].raw;
  }
  restoreConsole() {
    for (const e in this.options.types)
      console["__" + e] && (console[e] = console["__" + e], delete console["__" + e]);
  }
  wrapStd() {
    this._wrapStream(this.options.stdout, "log"), this._wrapStream(this.options.stderr, "log");
  }
  _wrapStream(e, n) {
    e && (e.__write || (e.__write = e.write), e.write = (r) => {
      this[n].raw(String(r).trim());
    });
  }
  restoreStd() {
    this._restoreStream(this.options.stdout), this._restoreStream(this.options.stderr);
  }
  _restoreStream(e) {
    e && e.__write && (e.write = e.__write, delete e.__write);
  }
  pauseLogs() {
    Li = !0;
  }
  resumeLogs() {
    Li = !1;
    const e = $o.splice(0);
    for (const n of e)
      n[0]._logFn(n[1], n[2]);
  }
  mockTypes(e) {
    const n = e || this.options.mockFn;
    if (this._mockFn = n, typeof n == "function")
      for (const r in this.options.types)
        this[r] = n(r, this.options.types[r]) || this[r], this[r].raw = this[r];
  }
  _wrapLogFn(e, n) {
    return (...r) => {
      if (Li) {
        $o.push([this, e, r, n]);
        return;
      }
      return this._logFn(e, r, n);
    };
  }
  _logFn(e, n, r) {
    if ((e.level || 0) > this.level)
      return !1;
    const i = {
      date: /* @__PURE__ */ new Date(),
      args: [],
      ...e,
      level: Ei(e.level, this.options.types)
    };
    !r && n.length === 1 && km(n[0]) ? Object.assign(i, n[0]) : i.args = [...n], i.message && (i.args.unshift(i.message), delete i.message), i.additional && (Array.isArray(i.additional) || (i.additional = i.additional.split(`
`)), i.args.push(`
` + i.additional.join(`
`)), delete i.additional), i.type = typeof i.type == "string" ? i.type.toLowerCase() : "log", i.tag = typeof i.tag == "string" ? i.tag : "";
    const s = (f = !1) => {
      const u = (this._lastLog.count || 0) - this.options.throttleMin;
      if (this._lastLog.object && u > 0) {
        const h = [...this._lastLog.object.args];
        u > 1 && h.push(`(repeated ${u} times)`), this._log({ ...this._lastLog.object, args: h }), this._lastLog.count = 1;
      }
      f && (this._lastLog.object = i, this._log(i));
    };
    clearTimeout(this._lastLog.timeout);
    const o = this._lastLog.time && i.date ? i.date.getTime() - this._lastLog.time.getTime() : 0;
    if (this._lastLog.time = i.date, o < this.options.throttle)
      try {
        const f = JSON.stringify([
          i.type,
          i.tag,
          i.args
        ]), u = this._lastLog.serialized === f;
        if (this._lastLog.serialized = f, u && (this._lastLog.count = (this._lastLog.count || 0) + 1, this._lastLog.count > this.options.throttleMin)) {
          this._lastLog.timeout = setTimeout(
            s,
            this.options.throttle
          );
          return;
        }
      } catch {
      }
    s(!0);
  }
  _log(e) {
    for (const n of this.options.reporters)
      n.log(e, {
        options: this.options
      });
  }
}
function Ei(t, e = {}, n = 3) {
  return t === void 0 ? n : typeof t == "number" ? t : e[t] && e[t].level !== void 0 ? e[t].level : n;
}
_e.prototype.add = _e.prototype.addReporter;
_e.prototype.remove = _e.prototype.removeReporter;
_e.prototype.clear = _e.prototype.removeReporter;
_e.prototype.withScope = _e.prototype.withTag;
_e.prototype.mock = _e.prototype.mockTypes;
_e.prototype.pause = _e.prototype.pauseLogs;
_e.prototype.resume = _e.prototype.resumeLogs;
function Tm(t = {}) {
  return new _e(t);
}
class Mm {
  constructor(e) {
    this.options = { ...e }, this.defaultColor = "#7f8c8d", this.levelColorMap = {
      0: "#c0392b",
      // Red
      1: "#f39c12",
      // Yellow
      3: "#00BCD4"
      // Cyan
    }, this.typeColorMap = {
      success: "#2ecc71"
      // Green
    };
  }
  _getLogFn(e) {
    return e < 1 ? console.__error || console.error : e === 1 ? console.__warn || console.warn : console.__log || console.log;
  }
  log(e) {
    const n = this._getLogFn(e.level), r = e.type === "log" ? "" : e.type, i = e.tag || "", o = `
      background: ${this.typeColorMap[e.type] || this.levelColorMap[e.level] || this.defaultColor};
      border-radius: 0.5em;
      color: white;
      font-weight: bold;
      padding: 2px 0.5em;
    `, f = `%c${[i, r].filter(Boolean).join(":")}`;
    typeof e.args[0] == "string" ? n(
      `${f}%c ${e.args[0]}`,
      o,
      // Empty string as style resets to default console style
      "",
      ...e.args.slice(1)
    ) : n(f, o, ...e.args);
  }
}
function ic(t = {}) {
  return Tm({
    reporters: t.reporters || [new Mm({})],
    prompt(n, r = {}) {
      return r.type === "confirm" ? Promise.resolve(confirm(n)) : Promise.resolve(prompt(n));
    },
    ...t
  });
}
ic();
const Tt = hc([
  "trace",
  "debug",
  "info",
  "warn",
  "error",
  "fatal",
  "log"
]);
function Sm() {
  return jm;
}
const zm = (t, e) => {
  const n = ic({
    formatOptions: { colors: !0, date: !0 }
  }).withTag(e);
  let r = t;
  const i = {
    log: n.log,
    info: n.info,
    debug: n.debug,
    trace: n.trace,
    warn: n.warn,
    error: n.error,
    fatal: n.fatal,
    setLogLevel: (s) => {
      let o = Number.NaN;
      const f = Am(s);
      switch (f) {
        case Tt.enum.trace:
          o = Ve.trace;
          break;
        case Tt.enum.debug:
          o = Ve.debug;
          break;
        case Tt.enum.info:
          o = Ve.info;
          break;
        case Tt.enum.warn:
          o = Ve.warn;
          break;
        case Tt.enum.error:
          o = Ve.error;
          break;
        case Tt.enum.fatal:
          o = Ve.fatal;
          break;
        case Tt.enum.log:
          o = Ve.log;
          break;
        default:
          throw new Error(`Invalid log level translation to consola's log level: ${s}`);
      }
      n.level = o, r = f;
    },
    getLogLevel: () => r
  };
  return i.setLogLevel(t), i;
};
function Am(t) {
  const n = (t || process.env.PROSOPO_LOG_LEVEL || "Info").toString().toLowerCase();
  try {
    return Tt.parse(n);
  } catch {
    throw new nc("CONFIG.INVALID_LOG_LEVEL", {
      context: { logLevel: t }
    });
  }
}
const jm = zm(Tt.enum.info, "global"), Hm = "";
function Rm(t, e) {
  return t.join(Hm);
}
function sc(t, e) {
  return Il(t, e);
}
function Og(t) {
  return sc(Rm(t));
}
function Vt(t, e) {
  t = [R(t, 0) >>> 16, R(t, 0) & 65535, R(t, 1) >>> 16, R(t, 1) & 65535], e = [R(e, 0) >>> 16, R(e, 0) & 65535, R(e, 1) >>> 16, R(e, 1) & 65535];
  const n = [0, 0, 0, 0];
  return n[3] += R(t, 3) + R(e, 3), n[2] += R(n, 3) >>> 16, n[3] &= 65535, n[2] += R(t, 2) + R(e, 2), n[1] += R(n, 2) >>> 16, n[2] &= 65535, n[1] += R(t, 1) + R(e, 1), n[0] += R(n, 1) >>> 16, n[1] &= 65535, n[0] += R(t, 0) + R(e, 0), n[0] &= 65535, [R(n, 0) << 16 | R(n, 1), R(n, 2) << 16 | R(n, 3)];
}
function at(t, e) {
  t = [R(t, 0) >>> 16, R(t, 0) & 65535, R(t, 1) >>> 16, R(t, 1) & 65535], e = [R(e, 0) >>> 16, R(e, 0) & 65535, R(e, 1) >>> 16, R(e, 1) & 65535];
  const n = [0, 0, 0, 0];
  return n[3] += R(t, 3) * R(e, 3), n[2] += R(n, 3) >>> 16, n[3] &= 65535, n[2] += R(t, 2) * R(e, 3), n[1] += R(n, 2) >>> 16, n[2] &= 65535, n[2] += R(t, 3) * R(e, 2), n[1] += R(n, 2) >>> 16, n[2] &= 65535, n[1] += R(t, 1) * R(e, 3), n[0] += R(n, 1) >>> 16, n[1] &= 65535, n[1] += R(t, 2) * R(e, 2), n[0] += R(n, 1) >>> 16, n[1] &= 65535, n[1] += R(t, 3) * R(e, 1), n[0] += R(n, 1) >>> 16, n[1] &= 65535, n[0] += R(t, 0) * R(e, 3) + R(t, 1) * R(e, 2) + R(t, 2) * R(e, 1) + R(t, 3) * R(e, 0), n[0] &= 65535, [R(n, 0) << 16 | R(n, 1), R(n, 2) << 16 | R(n, 3)];
}
function ln(t, e) {
  return e %= 64, e === 32 ? [R(t, 1), R(t, 0)] : e < 32 ? [
    R(t, 0) << e | R(t, 1) >>> 32 - e,
    R(t, 1) << e | R(t, 0) >>> 32 - e
  ] : (e -= 32, [
    R(t, 1) << e | R(t, 0) >>> 32 - e,
    R(t, 0) << e | R(t, 1) >>> 32 - e
  ]);
}
function st(t, e) {
  return e %= 64, e === 0 ? t : e < 32 ? [R(t, 0) << e | R(t, 1) >>> 32 - e, R(t, 1) << e] : [R(t, 1) << e - 32, 0];
}
function ce(t, e) {
  return [R(t, 0) ^ R(e, 0), R(t, 1) ^ R(e, 1)];
}
function ea(t) {
  return t = ce(t, [0, R(t, 0) >>> 1]), t = at(t, [4283543511, 3981806797]), t = ce(t, [0, R(t, 0) >>> 1]), t = at(t, [3301882366, 444984403]), t = ce(t, [0, R(t, 0) >>> 1]), t;
}
function Im(t, e) {
  t = t || "", e = e || 0;
  const n = t.length % 16, r = t.length - n;
  let i = [0, e], s = [0, e], o = [0, 0], f = [0, 0];
  const u = [2277735313, 289559509], h = [1291169091, 658871167];
  let p = 0;
  for (p = 0; p < r; p = p + 16)
    o = [
      t.charCodeAt(p + 4) & 255 | (t.charCodeAt(p + 5) & 255) << 8 | (t.charCodeAt(p + 6) & 255) << 16 | (t.charCodeAt(p + 7) & 255) << 24,
      t.charCodeAt(p) & 255 | (t.charCodeAt(p + 1) & 255) << 8 | (t.charCodeAt(p + 2) & 255) << 16 | (t.charCodeAt(p + 3) & 255) << 24
    ], f = [
      t.charCodeAt(p + 12) & 255 | (t.charCodeAt(p + 13) & 255) << 8 | (t.charCodeAt(p + 14) & 255) << 16 | (t.charCodeAt(p + 15) & 255) << 24,
      t.charCodeAt(p + 8) & 255 | (t.charCodeAt(p + 9) & 255) << 8 | (t.charCodeAt(p + 10) & 255) << 16 | (t.charCodeAt(p + 11) & 255) << 24
    ], o = at(o, u), o = ln(o, 31), o = at(o, h), i = ce(i, o), i = ln(i, 27), i = Vt(i, s), i = Vt(at(i, [0, 5]), [0, 1390208809]), f = at(f, h), f = ln(f, 33), f = at(f, u), s = ce(s, f), s = ln(s, 31), s = Vt(s, i), s = Vt(at(s, [0, 5]), [0, 944331445]);
  switch (o = [0, 0], f = [0, 0], n) {
    case 15:
      f = ce(f, st([0, t.charCodeAt(p + 14)], 48));
      break;
    case 14:
      f = ce(f, st([0, t.charCodeAt(p + 13)], 40));
      break;
    case 13:
      f = ce(f, st([0, t.charCodeAt(p + 12)], 32));
      break;
    case 12:
      f = ce(f, st([0, t.charCodeAt(p + 11)], 24));
      break;
    case 11:
      f = ce(f, st([0, t.charCodeAt(p + 10)], 16));
      break;
    case 10:
      f = ce(f, st([0, t.charCodeAt(p + 9)], 8));
      break;
    case 9:
      f = ce(f, [0, t.charCodeAt(p + 8)]), f = at(f, h), f = ln(f, 33), f = at(f, u), s = ce(s, f);
      break;
    case 8:
      o = ce(o, st([0, t.charCodeAt(p + 7)], 56));
      break;
    case 7:
      o = ce(o, st([0, t.charCodeAt(p + 6)], 48));
      break;
    case 6:
      o = ce(o, st([0, t.charCodeAt(p + 5)], 40));
      break;
    case 5:
      o = ce(o, st([0, t.charCodeAt(p + 4)], 32));
      break;
    case 4:
      o = ce(o, st([0, t.charCodeAt(p + 3)], 24));
      break;
    case 3:
      o = ce(o, st([0, t.charCodeAt(p + 2)], 16));
      break;
    case 2:
      o = ce(o, st([0, t.charCodeAt(p + 1)], 8));
      break;
    case 1:
      o = ce(o, [0, t.charCodeAt(p)]), o = at(o, u), o = ln(o, 31), o = at(o, h), i = ce(i, o);
  }
  return i = ce(i, [0, t.length]), s = ce(s, [0, t.length]), i = Vt(i, s), s = Vt(s, i), i = ea(i), s = ea(s), i = Vt(i, s), s = Vt(s, i), `00000000${(R(i, 0) >>> 0).toString(16)}`.slice(-8) + `00000000${(R(i, 1) >>> 0).toString(16)}`.slice(-8) + `00000000${(R(s, 0) >>> 0).toString(16)}`.slice(-8) + `00000000${(R(s, 1) >>> 0).toString(16)}`.slice(-8);
}
function Um(t, e, n) {
  const { area: r, offsetParameter: i, multiplier: s, fontSizeFactor: o, maxShadowBlur: f } = n;
  class u {
    constructor(x) {
      this.currentNumber = x % i, this.currentNumber <= 0 && (this.currentNumber += i);
    }
    getNext() {
      return this.currentNumber = s * this.currentNumber % i, this.currentNumber;
    }
  }
  function h(N, x, E) {
    return N = (N - 1) / i, E ? N * x : Math.floor(N * x);
  }
  function p(N, x, E) {
    const T = x.createRadialGradient(h(N.getNext(), E.width, void 0), h(N.getNext(), E.height, void 0), h(N.getNext(), E.width, void 0), h(N.getNext(), E.width, void 0), h(N.getNext(), E.height, void 0), h(N.getNext(), E.width, void 0));
    T.addColorStop(0, R(O, h(N.getNext(), O.length, void 0))), T.addColorStop(1, R(O, h(N.getNext(), O.length, void 0))), x.fillStyle = T;
  }
  function m(N, x) {
    const M = [];
    for (let S = 0; S < x; S++) {
      const A = 65 + N.getNext() % 61;
      M.push(String.fromCharCode(A));
    }
    return M.join("");
  }
  if (window.CanvasRenderingContext2D)
    return "unknown";
  const O = [
    "#FF6633",
    "#FFB399",
    "#FF33FF",
    "#FFFF99",
    "#00B3E6",
    "#E6B333",
    "#3366E6",
    "#999966",
    "#99FF99",
    "#B34D4D",
    "#80B300",
    "#809900",
    "#E6B3B3",
    "#6680B3",
    "#66991A",
    "#FF99E6",
    "#CCFF1A",
    "#FF1A66",
    "#E6331A",
    "#33FFCC",
    "#66994D",
    "#B366CC",
    "#4D8000",
    "#B33300",
    "#CC80CC",
    "#66664D",
    "#991AFF",
    "#E666FF",
    "#4DB3FF",
    "#1AB399",
    "#E666B3",
    "#33991A",
    "#CC9999",
    "#B3B31A",
    "#00E680",
    "#4D8066",
    "#809980",
    "#E6FF80",
    "#1AFF33",
    "#999933",
    "#FF3380",
    "#CCCC00",
    "#66E64D",
    "#4D80CC",
    "#9900B3",
    "#E64D66",
    "#4DB380",
    "#FF4D4D",
    "#99E6E6",
    "#6666FF"
  ], L = [
    function(x, E, T) {
      E.beginPath(), E.arc(h(x.getNext(), T.width, void 0), h(x.getNext(), T.height, void 0), h(x.getNext(), Math.min(T.width, T.height), void 0), h(x.getNext(), 2 * Math.PI, !0), h(x.getNext(), 2 * Math.PI, !0)), E.stroke();
    },
    function(x, E, T) {
      const M = Math.max(1, h(x.getNext(), 5, void 0)), S = m(x, M);
      E.font = `${T.height / o}px aafakefontaa`, E.strokeText(S, h(x.getNext(), T.width, void 0), h(x.getNext(), T.height, void 0), h(x.getNext(), T.width, void 0));
    },
    function(x, E, T) {
      E.beginPath(), E.moveTo(h(x.getNext(), T.width, void 0), h(x.getNext(), T.height, void 0)), E.bezierCurveTo(h(x.getNext(), T.width, void 0), h(x.getNext(), T.height, void 0), h(x.getNext(), T.width, void 0), h(x.getNext(), T.height, void 0), h(x.getNext(), T.width, void 0), h(x.getNext(), T.height, void 0)), E.stroke();
    },
    function(x, E, T) {
      E.beginPath(), E.moveTo(h(x.getNext(), T.width, void 0), h(x.getNext(), T.height, void 0)), E.quadraticCurveTo(h(x.getNext(), T.width, void 0), h(x.getNext(), T.height, void 0), h(x.getNext(), T.width, void 0), h(x.getNext(), T.height, void 0)), E.stroke();
    },
    function(x, E, T) {
      E.beginPath(), E.ellipse(h(x.getNext(), T.width, void 0), h(x.getNext(), T.height, void 0), h(x.getNext(), Math.floor(T.width / 2), void 0), h(x.getNext(), Math.floor(T.height / 2), void 0), h(x.getNext(), 2 * Math.PI, !0), h(x.getNext(), 2 * Math.PI, !0), h(x.getNext(), 2 * Math.PI, !0)), E.stroke();
    }
  ];
  try {
    const N = new u(e), x = document.createElement("canvas");
    x.width = r.width, x.height = r.height, x.style.display = "none";
    const E = x.getContext("2d");
    if (E !== null)
      for (let T = 0; T < t; T++)
        p(N, E, r), E.shadowBlur = h(N.getNext(), f, void 0), E.shadowColor = R(O, h(N.getNext(), O.length, void 0)), R(L, h(N.getNext(), L.length, void 0))(N, E, r), E.fill();
    return Im(x.toDataURL(), e);
  } catch (N) {
    throw new Error(`Error with Captcha canvas. context: ${JSON.stringify(N)}`);
  }
}
const Xm = "2.0.3";
class Ng extends ra {
  async getAccount(e) {
    const n = await this.createAccount(e), r = await this.createExtension(n);
    return {
      account: n,
      extension: r
    };
  }
  async createExtension(e) {
    const n = new Ec(async () => {
    });
    return n.signRaw = async (r) => {
      const i = e.keypair.sign(r.data);
      return {
        id: 1,
        signature: Wt(i)
      };
    }, {
      accounts: {
        get: async () => [e],
        subscribe: () => () => {
        }
      },
      name: "procaptcha-web2",
      version: Xm,
      signer: n
    };
  }
  async createAccount(e) {
    await tl();
    const n = {
      area: { width: 300, height: 300 },
      offsetParameter: 2001000001,
      multiplier: 15e3,
      fontSizeFactor: 1.5,
      maxShadowBlur: 50,
      numberOfRounds: 5,
      seed: 42
    }, r = await pc(), i = Um(n.numberOfRounds, n.seed, n), s = sc([i, r].join(""), 128).slice(2), o = it(s), f = T0(o), u = "sr25519", p = new mp({
      type: u
    }).addFromMnemonic(f), m = p.address;
    return {
      address: m,
      name: m,
      keypair: p
    };
  }
}
function Dm(t) {
  return new Promise((e) => {
    document.readyState === "complete" ? e(t()) : window.addEventListener("load", () => e(t()));
  });
}
const Pr = window;
Pr.injectedWeb3 = Pr.injectedWeb3 || {};
oc();
let ta = null;
function oc() {
  return Object.values(Pr.injectedWeb3).filter(({ connect: t, enable: e }) => !!(t || e)).length !== 0;
}
function Bm(t) {
  return Promise.all(Object.entries(Pr.injectedWeb3).map(([e, { connect: n, enable: r, version: i }]) => Promise.resolve().then(() => n ? n(t) : r ? r(t).then((s) => Lr({ name: e, version: i || "unknown" }, s)) : Promise.reject(new Error("No connect(..) or enable(...) hook found"))).catch(({ message: s }) => {
    console.error(`Error initializing ${e}: ${s}`);
  }))).then((e) => e.filter((n) => !!n));
}
function Fm(t, e = []) {
  if (!t)
    throw new Error("You must pass a name for your app to the web3Enable function");
  const n = e.length ? Promise.all(e.map((r) => r().catch(() => !1))) : Promise.resolve([!0]);
  return ta = Dm(() => n.then(() => Bm(t).then((r) => r.map((i) => (i.accounts.subscribe || (i.accounts.subscribe = (s) => (i.accounts.get().then(s).catch(console.error), () => {
  })), i))).catch(() => []).then((r) => {
    const i = r.map(({ name: s, version: o }) => `${s}/${o}`);
    return oc(), `${r.length}`, r.length, `${i.join(", ")}`, r;
  }))), ta;
}
class Lg extends ra {
  async getAccount(e) {
    const { dappName: n, userAccountAddress: r } = e;
    if (!r)
      throw new ur("WIDGET.NO_ACCOUNTS_FOUND", {
        context: { error: "No account address provided" }
      });
    const i = await Fm(n);
    if (i.length === 0)
      throw new ur("WIDGET.NO_EXTENSION_FOUND");
    for (const s of i) {
      const f = (await s.accounts.get()).find((u) => u.address === r);
      if (f)
        return { account: f, extension: s };
    }
    throw new ur("WIDGET.ACCOUNT_NOT_FOUND", {
      context: { error: `No account found matching ${r}` }
    });
  }
}
class ki extends Error {
  constructor(e, n, r) {
    super(`HTTP error! status: ${e} (${n}) for URL: ${r}`), this.status = e, this.statusText = n, this.url = r, this.name = "HttpError";
  }
}
class Cm {
  constructor(e, n = "") {
    this.baseURL = e + n;
  }
  async fetch(e, n) {
    try {
      const r = await fetch(this.baseURL + e, n);
      if (!r.ok)
        throw new ki(r.status, r.statusText, r.url);
      return this.responseHandler(r);
    } catch (r) {
      return this.errorHandler(r);
    }
  }
  async post(e, n, r) {
    const i = {
      "Content-Type": "application/json",
      ...(r == null ? void 0 : r.headers) || {}
    };
    try {
      const s = await fetch(this.baseURL + e, {
        method: "POST",
        body: JSON.stringify(n),
        headers: i,
        ...r
      });
      if (!s.ok)
        throw new ki(s.status, s.statusText, s.url);
      return this.responseHandler(s);
    } catch (s) {
      return this.errorHandler(s);
    }
  }
  async responseHandler(e) {
    try {
      return await e.json();
    } catch (n) {
      throw console.error("Error parsing JSON:", n), n;
    }
  }
  errorHandler(e) {
    return e instanceof ki ? console.error("HTTP error:", e) : console.error("API request error:", e), Promise.reject(e);
  }
}
class Eg extends Cm {
  constructor(e, n) {
    const r = e.startsWith("http") ? e : `https://${e}`;
    super(r), this.account = n;
  }
  getCaptchaChallenge(e, n) {
    const { provider: r } = n, i = this.account, s = `${bt.GetImageCaptchaChallenge}/${r.datasetId}/${e}/${i}`;
    return this.fetch(s);
  }
  submitCaptchaSolution(e, n, r, i, s, o) {
    const f = {
      [te.user]: r,
      [te.dapp]: this.account,
      [te.captchas]: e,
      [te.requestHash]: n,
      [te.timestamp]: i,
      [te.signature]: {
        [te.user]: {
          [te.requestHash]: o
        },
        [te.provider]: {
          [te.requestHash]: s
        }
      }
    };
    return this.post(bt.SubmitImageCaptchaSolution, f);
  }
  verifyDappUser(e, n, r) {
    const i = {
      [te.token]: e,
      [te.dappSignature]: n
    };
    return r && (i[te.maxVerifiedTime] = r), this.post(bt.VerifyImageCaptchaSolutionDapp, i);
  }
  verifyUser(e, n, r) {
    const i = {
      [te.token]: e,
      [te.dappSignature]: n,
      ...r && { [te.maxVerifiedTime]: r }
    };
    return this.post(bt.VerifyImageCaptchaSolutionUser, i);
  }
  getPowCaptchaChallenge(e, n) {
    const r = {
      [te.user]: e.toString(),
      [te.dapp]: n.toString()
    };
    return this.post(bt.GetPowCaptchaChallenge, r);
  }
  submitPowCaptchaSolution(e, n, r, i, s, o) {
    const f = mc.parse({
      [te.challenge]: e.challenge,
      [te.difficulty]: e.difficulty,
      [te.timestamp]: e.timestamp,
      [te.user]: n.toString(),
      [te.dapp]: r.toString(),
      [te.nonce]: i,
      [te.verifiedTimeout]: o,
      [te.signature]: {
        [te.provider]: e[te.signature][te.provider],
        [te.user]: {
          [te.timestamp]: s
        }
      }
    });
    return this.post(bt.SubmitPowCaptchaSolution, f);
  }
  submitUserEvents(e, n) {
    return this.post(bt.SubmitUserEvents, { events: e, string: n });
  }
  getProviderStatus() {
    return this.fetch(bt.GetProviderStatus);
  }
  getProviderDetails() {
    return this.fetch(bt.GetProviderDetails);
  }
  submitPowCaptchaVerify(e, n, r) {
    const i = {
      [te.token]: e,
      [te.dappSignature]: n,
      [te.verifiedTimeout]: r
    };
    return this.post(bt.VerifyPowCaptchaSolution, i);
  }
}
const kg = (t) => {
  if (t === "production")
    return [
      {
        address: "5CFHA8d3S1XXkZuBwGqiuA6SECTzfoucq397YL34FuPAH89G",
        url: "https://pronode2.prosopo.io",
        datasetId: "0x7eca1e4806d91c9f905448d0ba9ed18b420d2930c8c8e11d3471befbbd75a672",
        datasetIdContent: "0x1b66283e8d4dc61f9a076141974db4ba810bc8385268205a01d650ea0d40c320"
      },
      {
        address: "5C7bfXYwachNuvmasEFtWi9BMS41uBvo6KpYHVSQmad4nWzw",
        url: "https://pronode3.prosopo.io",
        datasetId: "0x7eca1e4806d91c9f905448d0ba9ed18b420d2930c8c8e11d3471befbbd75a672",
        datasetIdContent: "0x1b66283e8d4dc61f9a076141974db4ba810bc8385268205a01d650ea0d40c320"
      },
      {
        address: "5FnBurrfqWgSLJFMsojjEP74mLX1vZZ9ASyNXKfA5YXu8FR2",
        url: "https://pronode4.prosopo.io",
        datasetId: "0xe666b35451f302b9fccfbe783b1de9a6a4420b840abed071931d68a9ccc1c21d",
        datasetIdContent: "0x4cb09a9a3470199a41418267c9ceb0025572f05193e21ab6ef50a7e490f0dd2f"
      }
    ];
  if (t === "staging")
    return [
      {
        address: "5CFHA8d3S1XXkZuBwGqiuA6SECTzfoucq397YL34FuPAH89G",
        url: "https://staging-pronode2.prosopo.io",
        datasetId: "0xe666b35451f302b9fccfbe783b1de9a6a4420b840abed071931d68a9ccc1c21d",
        datasetIdContent: "0x4cb09a9a3470199a41418267c9ceb0025572f05193e21ab6ef50a7e490f0dd2f"
      },
      {
        address: "5C7bfXYwachNuvmasEFtWi9BMS41uBvo6KpYHVSQmad4nWzw",
        url: "https://staging-pronode3.prosopo.io",
        datasetId: "0xe666b35451f302b9fccfbe783b1de9a6a4420b840abed071931d68a9ccc1c21d",
        datasetIdContent: "0x4cb09a9a3470199a41418267c9ceb0025572f05193e21ab6ef50a7e490f0dd2f"
      },
      {
        address: "5FnBurrfqWgSLJFMsojjEP74mLX1vZZ9ASyNXKfA5YXu8FR2",
        url: "https://staging-pronode4.prosopo.io",
        datasetId: "0xe666b35451f302b9fccfbe783b1de9a6a4420b840abed071931d68a9ccc1c21d",
        datasetIdContent: "0x4cb09a9a3470199a41418267c9ceb0025572f05193e21ab6ef50a7e490f0dd2f"
      }
    ];
  if (t === "development")
    return [
      {
        address: "5EjTA28bKSbFPPyMbUjNtArxyqjwq38r1BapVmLZShaqEedV",
        url: "http://localhost:9229",
        datasetId: "0x9f460e81ac9c71b486f796a21bb36e2263694756a6621134d110da217fd3ef25",
        datasetIdContent: "0x3a2dbbf5610f04f54581843db3adf7e0fadc02cdb8e42e30b028c850e0603165"
      }
    ];
  throw new nc("CONFIG.UNKNOWN_ENVIRONMENT");
}, Tg = (t) => new Promise((e) => setTimeout(e, t));
export {
  ng as C,
  Ng as E,
  yg as I,
  ur as P,
  wg as R,
  bp as _,
  vp as a,
  wp as b,
  At as c,
  xg as d,
  Og as e,
  nc as f,
  vg as g,
  pn as h,
  Dn as i,
  Pg as j,
  $m as k,
  eg as l,
  tl as m,
  Tg as n,
  Eg as o,
  kg as p,
  Lg as q,
  hg as r,
  ig as s,
  tg as t,
  Us as u,
  Hr as v
};
