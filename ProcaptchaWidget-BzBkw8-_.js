import { r as m, z as j, a as b, e as ue, A as w, P as oe, l as B, d as U, j as l, b as A, R as pe, W as he, C as fe, c as ge, f as me, g as xe, h as be, i as ye, k as Ce, L as we, m as Ae, n as ve, o as Te } from "./index-DsnIPyZG.js";
import { u as Ie, h as Ee, _ as Se, a as Ne, b as Pe, I as De, R as Oe, g as He, c as Re, d as Le, i as _e, e as q, P as T, f as P, j as k, s as re, k as ke, l as Me, m as We, n as Ge, r as je, o as ze, p as Be, E as Ue, q as $e, t as Fe, C as Ke } from "./utils-Cpz4o_0n.js";
function Ve(t) {
  return Ie(Ee(t));
}
function qe() {
  if (console && console.warn) {
    for (var t, e = arguments.length, n = new Array(e), o = 0; o < e; o++)
      n[o] = arguments[o];
    typeof n[0] == "string" && (n[0] = "react-i18next:: ".concat(n[0])), (t = console).warn.apply(t, n);
  }
}
var Z = {};
function X() {
  for (var t = arguments.length, e = new Array(t), n = 0; n < t; n++)
    e[n] = arguments[n];
  typeof e[0] == "string" && Z[e[0]] || (typeof e[0] == "string" && (Z[e[0]] = /* @__PURE__ */ new Date()), qe.apply(void 0, e));
}
function Q(t, e, n) {
  t.loadNamespaces(e, function() {
    if (t.isInitialized)
      n();
    else {
      var o = function a() {
        setTimeout(function() {
          t.off("initialized", a);
        }, 0), n();
      };
      t.on("initialized", o);
    }
  });
}
function Xe(t, e) {
  var n = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {}, o = e.languages[0], a = e.options ? e.options.fallbackLng : !1, r = e.languages[e.languages.length - 1];
  if (o.toLowerCase() === "cimode") return !0;
  var i = function(s, f) {
    var g = e.services.backendConnector.state["".concat(s, "|").concat(f)];
    return g === -1 || g === 2;
  };
  return n.bindI18n && n.bindI18n.indexOf("languageChanging") > -1 && e.services.backendConnector.backend && e.isLanguageChangingTo && !i(e.isLanguageChangingTo, t) ? !1 : !!(e.hasResourceBundle(o, t) || !e.services.backendConnector.backend || e.options.resources && !e.options.partialBundledLanguages || i(o, t) && (!a || i(r, t)));
}
function Ye(t, e) {
  var n = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {};
  if (!e.languages || !e.languages.length)
    return X("i18n.languages were undefined or empty", e.languages), !0;
  var o = e.options.ignoreJSONStructure !== void 0;
  return o ? e.hasLoadedNamespace(t, {
    precheck: function(r, i) {
      if (n.bindI18n && n.bindI18n.indexOf("languageChanging") > -1 && r.services.backendConnector.backend && r.isLanguageChangingTo && !i(r.isLanguageChangingTo, t)) return !1;
    }
  }) : Xe(t, e, n);
}
function Je(t, e) {
  var n = t == null ? null : typeof Symbol < "u" && t[Symbol.iterator] || t["@@iterator"];
  if (n != null) {
    var o, a, r, i, d = [], s = !0, f = !1;
    try {
      if (r = (n = n.call(t)).next, e !== 0) for (; !(s = (o = r.call(n)).done) && (d.push(o.value), d.length !== e); s = !0) ;
    } catch (g) {
      f = !0, a = g;
    } finally {
      try {
        if (!s && n.return != null && (i = n.return(), Object(i) !== i)) return;
      } finally {
        if (f) throw a;
      }
    }
    return d;
  }
}
function Ze(t, e) {
  return Se(t) || Je(t, e) || Ne(t, e) || Pe();
}
function ee(t, e) {
  var n = Object.keys(t);
  if (Object.getOwnPropertySymbols) {
    var o = Object.getOwnPropertySymbols(t);
    e && (o = o.filter(function(a) {
      return Object.getOwnPropertyDescriptor(t, a).enumerable;
    })), n.push.apply(n, o);
  }
  return n;
}
function F(t) {
  for (var e = 1; e < arguments.length; e++) {
    var n = arguments[e] != null ? arguments[e] : {};
    e % 2 ? ee(Object(n), !0).forEach(function(o) {
      Re(t, o, n[o]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(t, Object.getOwnPropertyDescriptors(n)) : ee(Object(n)).forEach(function(o) {
      Object.defineProperty(t, o, Object.getOwnPropertyDescriptor(n, o));
    });
  }
  return t;
}
var Qe = function(e, n) {
  var o = m.useRef();
  return m.useEffect(function() {
    o.current = e;
  }, [e, n]), o.current;
};
function et(t) {
  var e = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {}, n = e.i18n, o = m.useContext(De) || {}, a = o.i18n, r = n || a || Le();
  if (r && !r.reportNamespaces && (r.reportNamespaces = new Oe()), !r) {
    X("You will need to pass in an i18next instance by using initReactI18next");
    var i = function(h) {
      return Array.isArray(h) ? h[h.length - 1] : h;
    }, d = [i, {}, !1];
    return d.t = i, d.i18n = {}, d.ready = !1, d;
  }
  r.options.react && r.options.react.wait !== void 0 && X("It seems you are still using the old wait option, you may migrate to the new useSuspense behaviour.");
  var s = F(F(F({}, He()), r.options.react), e), f = s.useSuspense, g = s.keyPrefix, u = t;
  u = typeof u == "string" ? [u] : u || ["translation"], r.reportNamespaces.addUsedNamespaces && r.reportNamespaces.addUsedNamespaces(u);
  var y = (r.isInitialized || r.initializedStoreOnce) && u.every(function(p) {
    return Ye(p, r, s);
  });
  function C() {
    return r.getFixedT(null, s.nsMode === "fallback" ? u : u[0], g);
  }
  var R = m.useState(C), D = Ze(R, 2), M = D[0], S = D[1], L = u.join(), O = Qe(L), I = m.useRef(!0);
  m.useEffect(function() {
    var p = s.bindI18n, h = s.bindI18nStore;
    I.current = !0, !y && !f && Q(r, u, function() {
      I.current && S(C);
    }), y && O && O !== L && I.current && S(C);
    function x() {
      I.current && S(C);
    }
    return p && r && r.on(p, x), h && r && r.store.on(h, x), function() {
      I.current = !1, p && r && p.split(" ").forEach(function(v) {
        return r.off(v, x);
      }), h && r && h.split(" ").forEach(function(v) {
        return r.store.off(v, x);
      });
    };
  }, [r, L]);
  var W = m.useRef(!0);
  m.useEffect(function() {
    I.current && !W.current && S(C), W.current = !1;
  }, [r, g]);
  var c = [M, r, y];
  if (c.t = M, c.i18n = r, c.ready = y, y || !y && !f) return c;
  throw new Promise(function(p) {
    Q(r, u, function() {
      p();
    });
  });
}
function tt(t) {
  return et("translation", { i18n: _e, ...t });
}
const nt = (t) => Array.isArray(t) && t !== null, z = new Array(256), ae = new Array(256 * 256);
for (let t = 0; t < 256; t++)
  z[t] = t.toString(16).padStart(2, "0");
for (let t = 0; t < 256; t++) {
  const e = t << 8;
  for (let n = 0; n < 256; n++)
    ae[e | n] = z[t] + z[n];
}
function K(t, e) {
  const n = t.length % 2 | 0, o = t.length - n | 0;
  for (let a = 0; a < o; a += 2)
    e += ae[t[a] << 8 | t[a + 1]];
  return n && (e += z[t[o] | 0]), e;
}
function ot(t, e = -1, n = !0) {
  const o = n ? "0x" : "";
  if (!(t != null && t.length))
    return o;
  if (e > 0) {
    const a = Math.ceil(e / 8);
    if (t.length > a)
      return `${K(t.subarray(0, a / 2), o)}…${K(t.subarray(t.length - a / 2), "")}`;
  }
  return K(t, o);
}
const rt = (t) => nt(t) ? ot(new Uint8Array(t)) : t.toString(), ie = j.object({
  account: j.string().optional(),
  blockNumber: j.number().optional(),
  providerUrl: j.string().optional()
});
function at(t) {
  return q([
    t.captchaId,
    t.captchaContentId,
    [...t.solution].sort(),
    t.salt
  ]);
}
class te {
  constructor(e) {
    this.hash = e, this.parent = null;
  }
}
class it {
  constructor() {
    this.leaves = [], this.layers = [];
  }
  getRoot() {
    if (this.root === void 0)
      throw new T("DATASET.MERKLE_ERROR", {
        context: {
          error: "root undefined",
          failedFuncName: this.getRoot.name
        }
      });
    return this.root;
  }
  build(e) {
    this.layers.length && (this.layers = []);
    const n = [];
    for (const o of e) {
      const a = new te(o);
      this.leaves.push(a), n.push(a.hash);
    }
    this.layers.push(n), this.root = this.buildMerkleTree(this.leaves)[0];
  }
  buildMerkleTree(e) {
    const n = e.length;
    if (n === 1)
      return e;
    const o = [];
    let a = 0;
    const r = [];
    for (; a < n; ) {
      const i = e[a];
      if (i === void 0)
        throw new T("DEVELOPER.GENERAL", {
          context: { error: "leftChild undefined" }
        });
      const d = a + 1 < n ? b(e, a + 1) : i, s = this.createParent(i, d);
      r.push(s.hash), o.push(s), a += 2;
    }
    return this.layers.push(r), this.buildMerkleTree(o);
  }
  createParent(e, n) {
    const o = new te(q([e.hash, n.hash]));
    return e.parent = o.hash, n.parent = o.hash, o;
  }
  proof(e) {
    const n = [];
    let o = 0;
    for (; o < this.layers.length - 1; ) {
      const r = this.layers[o];
      if (r === void 0)
        throw new T("DATASET.MERKLE_ERROR", {
          context: {
            error: "layer undefined",
            failedFuncName: this.proof.name,
            layerNum: o
          }
        });
      const i = r.indexOf(e);
      let d = i % 2 && i > 0 ? i - 1 : i + 1;
      d > r.length - 1 && (d = i);
      const s = [e], f = b(r, d);
      d > i ? s.push(f) : s.unshift(f), n.push([b(s, 0), b(s, 1)]), o += 1, e = q(s);
    }
    const a = b(this.layers, this.layers.length - 1);
    return [...n, [b(a, 0)]];
  }
}
class st {
  constructor(e, n, o, a, r) {
    this.userAccount = e, this.provider = n, this.providerApi = o, this._web2 = a, this.dappAccount = r;
  }
  get web2() {
    return this._web2;
  }
  async getCaptchaChallenge() {
    try {
      const e = await this.providerApi.getCaptchaChallenge(this.userAccount, this.provider);
      for (const n of e.captchas)
        for (const o of n.items)
          o.data && (o.data = o.data.replace(/^http(s)*:\/\//, "//"));
      return e;
    } catch (e) {
      throw new P("CAPTCHA.INVALID_CAPTCHA_CHALLENGE", {
        context: { error: e }
      });
    }
  }
  async submitCaptchaSolution(e, n, o, a, r) {
    const i = new it(), d = o.map((u) => at(u));
    if (i.build(d), !i.root)
      throw new k("CAPTCHA.INVALID_CAPTCHA_CHALLENGE", {
        context: { error: "Merkle tree root is undefined" }
      });
    const s = i.root.hash, f = void 0;
    let g;
    try {
      g = await this.providerApi.submitCaptchaSolution(o, n, this.userAccount, a, r, e);
    } catch (u) {
      throw new k("CAPTCHA.INVALID_CAPTCHA_CHALLENGE", {
        context: { error: u }
      });
    }
    return [g, s, f];
  }
}
const se = "@prosopo/procaptcha";
function J() {
  return ie.parse(JSON.parse(Ve(localStorage.getItem(se) || "0x7b7d")));
}
function ce(t) {
  localStorage.setItem(se, re(JSON.stringify(ie.parse(t))));
}
function ct(t) {
  ce({ ...J(), account: t });
}
function lt() {
  return J().account || null;
}
const V = {
  setAccount: ct,
  getAccount: lt,
  setProcaptchaStorage: ce,
  getProcaptchaStorage: J
}, dt = () => ({
  showModal: !1,
  loading: !1,
  index: 0,
  challenge: void 0,
  solutions: void 0,
  isHuman: !1,
  captchaApi: void 0,
  account: void 0
}), ut = (t) => {
  const e = (a, r) => Math.floor(Math.random() * (r - a + 1) + a), n = Be(t.defaultEnvironment), o = b(n, e(0, n.length - 1));
  return {
    providerAccount: o.address,
    provider: {
      url: o.url,
      datasetId: o.datasetId,
      datasetIdContent: o.datasetIdContent
    }
  };
};
function pt(t, e, n, o) {
  const a = ke(n, e, o), r = (c) => {
    const p = c instanceof Error ? c : new Error(String(c));
    a.onError(p);
  }, i = Me(e, n), d = () => {
    const c = {
      userAccountAddress: "",
      ...t
    };
    return e.account && (c.userAccountAddress = e.account.account.address), oe.parse(c);
  }, s = async (c) => {
    try {
      await c();
    } catch (p) {
      console.error(p), r(p), i({ isHuman: !1, showModal: !1, loading: !1 });
    }
  }, f = async () => {
    a.onOpen(), await s(async () => {
      if (e.loading || e.isHuman)
        return;
      await We(), S(), i({ loading: !0 });
      const c = d();
      i({ dappAccount: c.account.address }), await Ge(100);
      const p = await L(), h = ut(d()), x = h.provider.url, v = await R(x), $ = new st(p.account.address, h, v, c.web2, c.account.address || "");
      i({ captchaApi: $ });
      const E = await $.getCaptchaChallenge();
      if (E.captchas.length <= 0)
        throw new k("DEVELOPER.PROVIDER_NO_CAPTCHA");
      const G = E.captchas.map((H) => H.timeLimitMs || c.captchas.image.challengeTimeout).reduce((H, N) => H + N), _ = setTimeout(() => {
        a.onChallengeExpired(), i({ isHuman: !1, showModal: !1, loading: !1 });
      }, G);
      i({
        index: 0,
        solutions: E.captchas.map(() => []),
        challenge: E,
        showModal: !0,
        timeout: _
      });
    });
  }, g = async () => {
    await s(async () => {
      if (D(), !e.challenge)
        throw new T("CAPTCHA.NO_CAPTCHA", {
          context: { error: "Cannot submit, no Captcha found in state" }
        });
      i({ showModal: !1 });
      const c = e.challenge, p = je(), h = e.challenge.captchas.map((N, le) => {
        const de = b(e.solutions, le);
        return {
          captchaId: N.captchaId,
          captchaContentId: N.captchaContentId,
          salt: p,
          solution: de
        };
      }), x = O(), v = W(x).signer;
      if (!b(c.captchas, 0).datasetId)
        throw new k("CAPTCHA.INVALID_CAPTCHA_ID", {
          context: { error: "No datasetId set for challenge" }
        });
      const E = e.captchaApi;
      if (!E)
        throw new T("CAPTCHA.INVALID_TOKEN", {
          context: { error: "No Captcha API found in state" }
        });
      if (!v || !v.signRaw)
        throw new P("GENERAL.CANT_FIND_KEYRINGPAIR", {
          context: {
            error: "Signer is not defined, cannot sign message to prove account ownership"
          }
        });
      const G = await v.signRaw({
        address: x.account.address,
        data: re(c.requestHash),
        type: "bytes"
      }), _ = await E.submitCaptchaSolution(G.signature, c.requestHash, h, c.timestamp, c.signature.provider.requestHash), H = _[0].verified;
      if (H || a.onFailed(), i({
        submission: _,
        isHuman: H,
        loading: !1
      }), e.isHuman) {
        const N = E.provider.provider.url;
        V.setProcaptchaStorage({
          ...V.getProcaptchaStorage(),
          providerUrl: N
        }), a.onHuman(ue({
          [w.providerUrl]: N,
          [w.user]: x.account.address,
          [w.dapp]: I(),
          [w.commitmentId]: rt(_[1]),
          [w.timestamp]: c.timestamp,
          [w.signature]: {
            [w.provider]: {
              [w.requestHash]: c.signature.provider.requestHash
            },
            [w.user]: {
              [w.requestHash]: G.signature
            }
          }
        })), M();
      }
    });
  }, u = async () => {
    D(), S(), a.onClose();
  }, y = (c) => {
    if (!e.challenge)
      throw new T("CAPTCHA.NO_CAPTCHA", {
        context: { error: "Cannot select, no Captcha found in state" }
      });
    if (e.index >= e.challenge.captchas.length || e.index < 0)
      throw new T("CAPTCHA.NO_CAPTCHA", {
        context: {
          error: "Cannot select, index is out of range for this Captcha"
        }
      });
    const p = e.index, h = e.solutions, x = b(h, p);
    x.includes(c) ? x.splice(x.indexOf(c), 1) : x.push(c), i({ solutions: h });
  }, C = () => {
    if (!e.challenge)
      throw new T("CAPTCHA.NO_CAPTCHA", {
        context: { error: "Cannot select, no Captcha found in state" }
      });
    if (e.index + 1 >= e.challenge.captchas.length)
      throw new T("CAPTCHA.NO_CAPTCHA", {
        context: {
          error: "Cannot select, index is out of range for this Captcha"
        }
      });
    i({ index: e.index + 1 });
  }, R = async (c) => {
    const p = d();
    if (!p.account.address)
      throw new P("GENERAL.SITE_KEY_MISSING");
    return new ze(c, p.account.address);
  }, D = () => {
    window.clearTimeout(e.timeout), i({ timeout: void 0 });
  }, M = () => {
    const c = t.captchas.image.solutionTimeout, p = setTimeout(() => {
      i({ isHuman: !1 }), a.onExpired();
    }, c);
    i({ successfullChallengeTimeout: p });
  }, S = () => {
    D(), i(dt());
  }, L = async () => {
    const c = d();
    if (!c.web2 && !c.userAccountAddress)
      throw new P("GENERAL.ACCOUNT_NOT_FOUND", {
        context: { error: "Account address has not been set for web3 mode" }
      });
    const h = await (c.web2 ? new Ue() : new $e()).getAccount(c);
    return V.setAccount(h.account.address), i({ account: h }), O();
  }, O = () => {
    if (!e.account)
      throw new P("GENERAL.ACCOUNT_NOT_FOUND", {
        context: { error: "Account not loaded" }
      });
    return e.account;
  }, I = () => {
    if (!e.dappAccount)
      throw new P("GENERAL.SITE_KEY_MISSING");
    return e.dappAccount;
  }, W = (c) => {
    const p = c || O();
    if (!p.extension)
      throw new P("ACCOUNT.NO_POLKADOT_EXTENSION", {
        context: { error: "Extension not loaded" }
      });
    return p.extension;
  };
  return {
    start: f,
    cancel: u,
    submit: g,
    select: y,
    nextRound: C
  };
}
const ht = (t) => {
  if (!t.hash)
    throw new k("CAPTCHA.MISSING_ITEM_HASH", {
      context: { item: t }
    });
  return t.hash;
}, ft = ({ challenge: t, solution: e, onClick: n, themeColor: o }) => {
  const a = t.items, r = m.useMemo(() => o === "light" ? B : U, [o]), i = "ontouchstart" in window, d = `${r.spacing.unit}px`, s = `${r.spacing.half}px`, f = {
    0: {
      paddingLeft: 0,
      paddingRight: s,
      paddingTop: s,
      paddingBottom: s
    },
    1: {
      paddingLeft: s,
      paddingRight: s,
      paddingTop: s,
      paddingBottom: s
    },
    2: {
      paddingLeft: s,
      paddingRight: 0,
      paddingTop: s,
      paddingBottom: s
    }
  }, g = {
    0: { paddingTop: d },
    2: { paddingBottom: d }
  };
  return l("div", { style: {
    paddingRight: 0.5,
    paddingBottom: 0.5,
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap"
  }, children: a.map((u, y) => {
    const C = ht(u), R = {
      ...f[y % 3],
      ...g[Math.floor(y / 3)],
      flexGrow: 1,
      flexBasis: "33.3333%",
      boxSizing: "border-box"
    };
    return l("div", { style: R, children: A("div", { style: {
      cursor: "pointer",
      height: "100%",
      width: "100%",
      border: 1,
      borderStyle: "solid",
      borderColor: r.palette.grey[300]
    }, onClick: i ? void 0 : () => n(C), onTouchStart: i ? () => n(C) : void 0, children: [l("div", { children: l("img", { style: {
      width: "100%",
      backgroundColor: r.palette.grey[300],
      opacity: e.includes(C) && i ? "50%" : "100%",
      display: "block",
      objectFit: "contain",
      aspectRatio: "1/1",
      height: "auto"
    }, src: u.data, alt: `Captcha image ${y + 1}` }) }), l("div", { style: {
      position: "relative",
      width: "100%",
      height: "100%",
      top: "-100%",
      visibility: e.includes(C) ? "visible" : "hidden",
      transition: "opacity 225ms cubic-bezier(0.4, 0, 0.2, 1) 0ms",
      opacity: 1
    }, children: l("div", { style: {
      position: "absolute",
      top: 0,
      left: 0,
      bottom: 0,
      right: 0,
      height: "100%",
      width: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(0,0,0,0.5)"
    }, children: l("svg", { style: {
      backgroundColor: "transparent",
      display: "block",
      width: "35%",
      height: "35%",
      transition: "fill 200ms cubic-bezier(0.4, 0, 0.2, 1) 0ms",
      userSelect: "none",
      fill: "currentcolor"
    }, focusable: "false", color: "#fff", "aria-hidden": "true", viewBox: "0 0 24 24", "data-testid": "CheckIcon", "aria-label": "Check icon", children: l("path", { d: "M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" }) }) }) })] }) }, u.hash);
  }) });
};
function gt(t = {}) {
  return Object.keys(t).reduce((e, n) => ({ ...e, [`data-${n}`]: t[n] }), {});
}
function Y({ general: t, dev: e }) {
  return {
    ...gt(t)
  };
}
const mt = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  position: "relative",
  boxSizing: "border-box",
  outline: "0px",
  border: "0px",
  margin: "0px",
  cursor: "pointer",
  userSelect: "none",
  verticalAlign: "middle",
  appearance: void 0,
  textDecoration: "none",
  fontWeight: "500",
  fontSize: "0.875rem",
  lineHeight: "1.75",
  letterSpacing: "0.02857em",
  textTransform: "uppercase",
  minWidth: "64px",
  padding: "6px 16px",
  borderRadius: "4px",
  transition: "background-color 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms, box-shadow 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms, border-color 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms, color 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms",
  color: "rgb(0, 0, 0)",
  backgroundColor: "#ffffff",
  boxShadow: "rgba(0, 0, 0, 0.2) 0px 3px 1px -2px, rgba(0, 0, 0, 0.14) 0px 2px 2px 0px, rgba(0, 0, 0, 0.12) 0px 1px 5px 0px"
}, ne = ({ themeColor: t, buttonType: e, text: n, onClick: o }) => {
  const a = m.useMemo(() => t === "light" ? B : U, [t]), [r, i] = m.useState(!1), d = m.useMemo(() => {
    const s = {
      ...mt,
      color: r ? a.palette.primary.contrastText : a.palette.background.contrastText
    };
    return e === "cancel" ? {
      ...s,
      backgroundColor: r ? a.palette.grey[600] : "transparent"
    } : {
      ...s,
      backgroundColor: r ? a.palette.primary.main : a.palette.background.default
    };
  }, [e, r, a]);
  return l("button", { ...Y({ dev: { cy: `button-${e}` } }), onMouseEnter: () => i(!0), onMouseLeave: () => i(!1), style: d, onClick: (s) => {
    s.preventDefault(), o();
  }, "aria-label": n, children: n });
}, xt = ({ challenge: t, index: e, solutions: n, onSubmit: o, onCancel: a, onClick: r, onNext: i, themeColor: d }) => {
  const { t: s } = tt(), f = t.captchas ? b(t.captchas, e) : null, g = n ? b(n, e) : [], u = m.useMemo(() => d === "light" ? B : U, [d]);
  return l(m.Suspense, { fallback: l("div", { children: "Loading..." }), children: l("div", { style: {
    overflowX: "auto",
    overflowY: "auto",
    width: "100%",
    maxWidth: "500px",
    maxHeight: "100%",
    display: "flex",
    flexDirection: "column",
    border: "1px solid #dddddd",
    boxShadow: "rgba(255, 255, 255, 0.2) 0px 0px 4px",
    borderRadius: "4px",
    padding: `${u.spacing.unit}px`,
    backgroundColor: u.palette.background.default
  }, children: A("div", { style: {
    backgroundColor: u.palette.background.default,
    display: "flex",
    flexDirection: "column",
    minWidth: "300px"
  }, children: [l("div", { style: {
    display: "flex",
    alignItems: "center",
    width: "100%"
  }, children: l("div", { style: {
    backgroundColor: u.palette.primary.main,
    width: "100%"
  }, children: A("div", { style: {
    paddingLeft: `${u.spacing.half}px`,
    paddingRight: `${u.spacing.half}px`
  }, children: [A("p", { style: {
    color: "#ffffff",
    fontWeight: 700,
    lineHeight: 1.5
  }, children: [s("WIDGET.SELECT_ALL"), ":", " ", l("span", { style: { textTransform: "capitalize" }, children: `${b(t.captchas, e).target}` })] }), l("p", { style: {
    color: "#ffffff",
    fontWeight: 500,
    lineHeight: 0.8,
    fontSize: "0.8rem"
  }, children: s("WIDGET.IF_NONE_CLICK_NEXT") })] }) }) }), l("div", { ...Y({ dev: { cy: `captcha-${e}` } }), children: f && l(ft, { challenge: f, solution: g, onClick: r, themeColor: d }) }), l("div", { style: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%"
  }, ...Y({ dev: { cy: "dots-captcha" } }) }), l("div", { style: {
    padding: `0 ${u.spacing}px`,
    display: "flex",
    width: "100%"
  } }), A("div", { style: {
    padding: `0 ${u.spacing}px`,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    lineHeight: 1.75
  }, children: [l(ne, { themeColor: d, buttonType: "cancel", onClick: a, text: s("WIDGET.CANCEL"), "aria-label": s("WIDGET.CANCEL") }), l(ne, { themeColor: d, buttonType: "next", text: e < t.captchas.length - 1 ? s("WIDGET.NEXT") : s("WIDGET.SUBMIT"), onClick: e < t.captchas.length - 1 ? i : o, "aria-label": e < t.captchas.length - 1 ? s("WIDGET.NEXT") : s("WIDGET.SUBMIT"), "data-cy": "button-next" })] })] }) }) });
}, bt = pe.memo((t, e) => {
  const { show: n, children: o } = t, r = {
    position: "fixed",
    zIndex: 2147483646,
    inset: 0,
    display: n ? "block" : "none"
  }, i = {
    position: "fixed",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    right: 0,
    bottom: 0,
    top: 0,
    left: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    zIndex: -1
  }, d = {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "400px",
    backgroundColor: "transparent",
    border: "none",
    boxShadow: "rgba(0, 0, 0, 0.2) 0px 11px 15px -7px, rgba(0, 0, 0, 0.14) 0px 24px 38px 3px, rgba(0, 0, 0, 0.12) 0px 9px 46px 8px,"
  };
  return A("div", { className: "modalOuter", style: r, children: [l("div", { className: "modalBackground", style: i }), l("div", { className: "modalInner", style: d, children: o })] });
}), wt = (t) => {
  const e = oe.parse(t.config), n = t.callbacks || {}, [o, a] = Fe(m.useState, m.useRef), r = pt(e, o, a, n), i = t.config.theme === "light" ? "light" : "dark", d = t.config.theme === "light" ? B : U;
  return l("div", { children: A("div", { style: {
    maxWidth: he,
    maxHeight: "100%",
    overflowX: "auto"
  }, children: [l(bt, { show: o.showModal, children: o.challenge ? l(xt, { challenge: o.challenge, index: o.index, solutions: o.solutions, onSubmit: r.submit, onCancel: r.cancel, onClick: r.select, onNext: r.nextRound, themeColor: e.theme ?? "light" }) : l("div", { children: "No challenge set." }) }), l(fe, { children: l(ge, { children: A("div", { style: me, "data-cy": "button-human", children: [" ", A("div", { style: {
    padding: xe,
    border: be,
    backgroundColor: d.palette.background.default,
    borderColor: d.palette.grey[300],
    borderRadius: ye,
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    justifyContent: "space-between",
    minHeight: `${Ce}px`,
    overflow: "hidden"
  }, children: [l("div", { style: { display: "inline-flex", flexDirection: "column" }, children: l("div", { style: {
    alignItems: "center",
    flex: 1
  }, children: A("div", { style: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
    verticalAlign: "middle"
  }, children: [l("div", { style: {
    display: o.loading ? "none" : "flex"
  }, children: l(Ke, { themeColor: i, onChange: r.start, checked: o.isHuman, labelText: "I am human", "aria-label": "human checkbox" }) }), l("div", { style: {
    display: o.loading ? "flex" : "none"
  }, children: l("div", { style: { display: "inline-flex" }, children: l(we, { themeColor: i, "aria-label": "Loading spinner" }) }) })] }) }) }), l("div", { style: { display: "inline-flex", flexDirection: "column" }, children: l("a", { href: Ae, target: "_blank", "aria-label": ve, rel: "noreferrer", children: l("div", { style: { flex: 1 }, children: l(Te, { themeColor: i, "aria-label": "Prosopo logo" }) }) }) })] })] }) }) })] }) });
};
export {
  wt as default
};
