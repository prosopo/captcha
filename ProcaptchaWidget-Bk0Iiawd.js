import { r as m, z, a as C, e as he, A as v, P as se, l as U, d as $, j as d, b as A, R as fe, W as ge, C as me, c as be, f as xe, g as ye, h as Ce, i as we, k as Ae, L as ve, m as Te, n as Ie, o as Ee } from "./index-DvT5XLGE.js";
import { u as Se, h as Ne, _ as Pe, a as ke, b as Oe, I as De, R as Re, g as Le, c as _e, d as He, i as Me, e as J, P as T, f as S, j as H, s as ce, k as We, l as Ge, m as je, n as ze, r as Be, o as Ue, E as $e, p as Fe, q as Ke, t as Ve, C as Xe } from "./utils-nH-g73b2.js";
function Ye(t) {
  return Se(Ne(t));
}
function Je() {
  if (console && console.warn) {
    for (var t, e = arguments.length, n = new Array(e), o = 0; o < e; o++)
      n[o] = arguments[o];
    typeof n[0] == "string" && (n[0] = "react-i18next:: ".concat(n[0])), (t = console).warn.apply(t, n);
  }
}
var te = {};
function q() {
  for (var t = arguments.length, e = new Array(t), n = 0; n < t; n++)
    e[n] = arguments[n];
  typeof e[0] == "string" && te[e[0]] || (typeof e[0] == "string" && (te[e[0]] = /* @__PURE__ */ new Date()), Je.apply(void 0, e));
}
function ne(t, e, n) {
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
function qe(t, e) {
  var n = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {}, o = e.languages[0], a = e.options ? e.options.fallbackLng : !1, r = e.languages[e.languages.length - 1];
  if (o.toLowerCase() === "cimode") return !0;
  var i = function(s, h) {
    var b = e.services.backendConnector.state["".concat(s, "|").concat(h)];
    return b === -1 || b === 2;
  };
  return n.bindI18n && n.bindI18n.indexOf("languageChanging") > -1 && e.services.backendConnector.backend && e.isLanguageChangingTo && !i(e.isLanguageChangingTo, t) ? !1 : !!(e.hasResourceBundle(o, t) || !e.services.backendConnector.backend || e.options.resources && !e.options.partialBundledLanguages || i(o, t) && (!a || i(r, t)));
}
function Ze(t, e) {
  var n = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {};
  if (!e.languages || !e.languages.length)
    return q("i18n.languages were undefined or empty", e.languages), !0;
  var o = e.options.ignoreJSONStructure !== void 0;
  return o ? e.hasLoadedNamespace(t, {
    precheck: function(r, i) {
      if (n.bindI18n && n.bindI18n.indexOf("languageChanging") > -1 && r.services.backendConnector.backend && r.isLanguageChangingTo && !i(r.isLanguageChangingTo, t)) return !1;
    }
  }) : qe(t, e, n);
}
function Qe(t, e) {
  var n = t == null ? null : typeof Symbol < "u" && t[Symbol.iterator] || t["@@iterator"];
  if (n != null) {
    var o, a, r, i, l = [], s = !0, h = !1;
    try {
      if (r = (n = n.call(t)).next, e !== 0) for (; !(s = (o = r.call(n)).done) && (l.push(o.value), l.length !== e); s = !0) ;
    } catch (b) {
      h = !0, a = b;
    } finally {
      try {
        if (!s && n.return != null && (i = n.return(), Object(i) !== i)) return;
      } finally {
        if (h) throw a;
      }
    }
    return l;
  }
}
function et(t, e) {
  return Pe(t) || Qe(t, e) || ke(t, e) || Oe();
}
function oe(t, e) {
  var n = Object.keys(t);
  if (Object.getOwnPropertySymbols) {
    var o = Object.getOwnPropertySymbols(t);
    e && (o = o.filter(function(a) {
      return Object.getOwnPropertyDescriptor(t, a).enumerable;
    })), n.push.apply(n, o);
  }
  return n;
}
function V(t) {
  for (var e = 1; e < arguments.length; e++) {
    var n = arguments[e] != null ? arguments[e] : {};
    e % 2 ? oe(Object(n), !0).forEach(function(o) {
      _e(t, o, n[o]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(t, Object.getOwnPropertyDescriptors(n)) : oe(Object(n)).forEach(function(o) {
      Object.defineProperty(t, o, Object.getOwnPropertyDescriptor(n, o));
    });
  }
  return t;
}
var tt = function(e, n) {
  var o = m.useRef();
  return m.useEffect(function() {
    o.current = e;
  }, [e, n]), o.current;
};
function nt(t) {
  var e = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {}, n = e.i18n, o = m.useContext(De) || {}, a = o.i18n, r = n || a || He();
  if (r && !r.reportNamespaces && (r.reportNamespaces = new Re()), !r) {
    q("You will need to pass in an i18next instance by using initReactI18next");
    var i = function(u) {
      return Array.isArray(u) ? u[u.length - 1] : u;
    }, l = [i, {}, !1];
    return l.t = i, l.i18n = {}, l.ready = !1, l;
  }
  r.options.react && r.options.react.wait !== void 0 && q("It seems you are still using the old wait option, you may migrate to the new useSuspense behaviour.");
  var s = V(V(V({}, Le()), r.options.react), e), h = s.useSuspense, b = s.keyPrefix, p = t;
  p = typeof p == "string" ? [p] : p || ["translation"], r.reportNamespaces.addUsedNamespaces && r.reportNamespaces.addUsedNamespaces(p);
  var f = (r.isInitialized || r.initializedStoreOnce) && p.every(function(c) {
    return Ze(c, r, s);
  });
  function y() {
    return r.getFixedT(null, s.nsMode === "fallback" ? p : p[0], b);
  }
  var w = m.useState(y), O = et(w, 2), M = O[0], N = O[1], L = p.join(), D = tt(L), I = m.useRef(!0);
  m.useEffect(function() {
    var c = s.bindI18n, u = s.bindI18nStore;
    I.current = !0, !f && !h && ne(r, p, function() {
      I.current && N(y);
    }), f && D && D !== L && I.current && N(y);
    function g() {
      I.current && N(y);
    }
    return c && r && r.on(c, g), u && r && r.store.on(u, g), function() {
      I.current = !1, c && r && c.split(" ").forEach(function(x) {
        return r.off(x, g);
      }), u && r && u.split(" ").forEach(function(x) {
        return r.store.off(x, g);
      });
    };
  }, [r, L]);
  var W = m.useRef(!0);
  m.useEffect(function() {
    I.current && !W.current && N(y), W.current = !1;
  }, [r, b]);
  var P = [M, r, f];
  if (P.t = M, P.i18n = r, P.ready = f, f || !f && !h) return P;
  throw new Promise(function(c) {
    ne(r, p, function() {
      c();
    });
  });
}
function ot(t) {
  return nt("translation", { i18n: Me, ...t });
}
const rt = (t) => Array.isArray(t) && t !== null, B = new Array(256), le = new Array(256 * 256);
for (let t = 0; t < 256; t++)
  B[t] = t.toString(16).padStart(2, "0");
for (let t = 0; t < 256; t++) {
  const e = t << 8;
  for (let n = 0; n < 256; n++)
    le[e | n] = B[t] + B[n];
}
function X(t, e) {
  const n = t.length % 2 | 0, o = t.length - n | 0;
  for (let a = 0; a < o; a += 2)
    e += le[t[a] << 8 | t[a + 1]];
  return n && (e += B[t[o] | 0]), e;
}
function at(t, e = -1, n = !0) {
  const o = n ? "0x" : "";
  if (!(t != null && t.length))
    return o;
  if (e > 0) {
    const a = Math.ceil(e / 8);
    if (t.length > a)
      return `${X(t.subarray(0, a / 2), o)}…${X(t.subarray(t.length - a / 2), "")}`;
  }
  return X(t, o);
}
const it = (t) => rt(t) ? at(new Uint8Array(t)) : t.toString(), de = z.object({
  account: z.string().optional(),
  blockNumber: z.number().optional(),
  providerUrl: z.string().optional()
});
function st(t) {
  return J([
    t.captchaId,
    t.captchaContentId,
    [...t.solution].sort(),
    t.salt
  ]);
}
class re {
  constructor(e) {
    this.hash = e, this.parent = null;
  }
}
class ct {
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
      const a = new re(o);
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
      const l = a + 1 < n ? C(e, a + 1) : i, s = this.createParent(i, l);
      r.push(s.hash), o.push(s), a += 2;
    }
    return this.layers.push(r), this.buildMerkleTree(o);
  }
  createParent(e, n) {
    const o = new re(J([e.hash, n.hash]));
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
      let l = i % 2 && i > 0 ? i - 1 : i + 1;
      l > r.length - 1 && (l = i);
      const s = [e], h = C(r, l);
      l > i ? s.push(h) : s.unshift(h), n.push([C(s, 0), C(s, 1)]), o += 1, e = J(s);
    }
    const a = C(this.layers, this.layers.length - 1);
    return [...n, [C(a, 0)]];
  }
}
class lt {
  constructor(e, n, o, a, r, i) {
    this.userAccount = e, this.contract = n, this.provider = o, this.providerApi = a, this._web2 = r, this.dappAccount = i;
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
      throw new S("CAPTCHA.INVALID_CAPTCHA_CHALLENGE", {
        context: { error: e }
      });
    }
  }
  async submitCaptchaSolution(e, n, o, a, r, i) {
    const l = new ct(), s = o.map((w) => st(w));
    if (l.build(s), !l.root)
      throw new H("CAPTCHA.INVALID_CAPTCHA_CHALLENGE", {
        context: { error: "Merkle tree root is undefined" }
      });
    const h = l.root.hash, b = void 0;
    let p;
    if (!e || !e.signRaw)
      throw new S("GENERAL.CANT_FIND_KEYRINGPAIR", {
        context: {
          error: "Signer is not defined, cannot sign message to prove account ownership"
        }
      });
    let f;
    p = (await e.signRaw({
      address: this.userAccount,
      data: ce(n),
      type: "bytes"
    })).signature;
    try {
      f = await this.providerApi.submitCaptchaSolution(o, n, this.userAccount, a, r, i, p);
    } catch (w) {
      throw new H("CAPTCHA.INVALID_CAPTCHA_CHALLENGE", {
        context: { error: w }
      });
    }
    return [f, h, b];
  }
}
const ue = "@prosopo/procaptcha";
function Q() {
  return de.parse(JSON.parse(Ye(localStorage.getItem(ue) || "0x7b7d")));
}
function pe(t) {
  localStorage.setItem(ue, ce(JSON.stringify(de.parse(t))));
}
function dt(t) {
  pe({ ...Q(), account: t });
}
function ut() {
  return Q().account || null;
}
const Y = {
  setAccount: dt,
  getAccount: ut,
  setProcaptchaStorage: pe,
  getProcaptchaStorage: Q
}, pt = () => ({
  showModal: !1,
  loading: !1,
  index: 0,
  challenge: void 0,
  solutions: void 0,
  isHuman: !1,
  captchaApi: void 0,
  account: void 0
}), ae = (t) => {
  const e = t.networks[t.defaultNetwork];
  if (!e)
    throw new S("DEVELOPER.NETWORK_NOT_FOUND", {
      context: {
        error: `No network found for environment ${t.defaultEnvironment}`
      }
    });
  return e;
}, ht = (t) => {
  const e = (a, r) => Math.floor(Math.random() * (r - a + 1) + a), n = Ke(t.defaultEnvironment), o = C(n, e(0, n.length - 1));
  return {
    providerAccount: o.address,
    provider: {
      url: o.url,
      datasetId: o.datasetId,
      datasetIdContent: o.datasetIdContent
    },
    blockNumber: 0
  };
};
function ft(t, e, n, o) {
  const a = We(n, e, o), r = (c) => {
    const u = c instanceof Error ? c : new Error(String(c));
    a.onError(u);
  }, i = Ge(e, n), l = () => {
    const c = {
      userAccountAddress: "",
      ...t
    };
    return e.account && (c.userAccountAddress = e.account.account.address), se.parse(c);
  }, s = async (c) => {
    try {
      await c();
    } catch (u) {
      console.error(u), r(u), i({ isHuman: !1, showModal: !1, loading: !1 });
    }
  }, h = async () => {
    a.onOpen(), await s(async () => {
      if (e.loading || e.isHuman)
        return;
      await je(), N(), i({ loading: !0 });
      const c = l();
      i({ dappAccount: c.account.address }), await ze(100);
      const u = await L(), g = ae(c).contract.address, x = ht(l()), G = x.blockNumber, F = x.provider.url, ee = await w(F), R = new lt(u.account.address, g, x, ee, c.web2, c.account.address || "");
      i({ captchaApi: R });
      const E = await R.getCaptchaChallenge();
      if (E.captchas.length <= 0)
        throw new H("DEVELOPER.PROVIDER_NO_CAPTCHA");
      const j = E.captchas.map((_) => _.timeLimitMs || c.captchas.image.challengeTimeout).reduce((_, K) => _ + K), k = setTimeout(() => {
        a.onChallengeExpired(), i({ isHuman: !1, showModal: !1, loading: !1 });
      }, j);
      i({
        index: 0,
        solutions: E.captchas.map(() => []),
        challenge: E,
        showModal: !0,
        timeout: k,
        blockNumber: G
      });
    });
  }, b = async () => {
    await s(async () => {
      if (O(), !e.challenge)
        throw new T("CAPTCHA.NO_CAPTCHA", {
          context: { error: "Cannot submit, no Captcha found in state" }
        });
      i({ showModal: !1 });
      const c = e.challenge, u = Be(), g = e.challenge.captchas.map((k, _) => {
        const K = C(e.solutions, _);
        return {
          captchaId: k.captchaId,
          captchaContentId: k.captchaContentId,
          salt: u,
          solution: K
        };
      }), x = D(), G = W(), F = P(x).signer;
      if (!C(c.captchas, 0).datasetId)
        throw new H("CAPTCHA.INVALID_CAPTCHA_ID", {
          context: { error: "No datasetId set for challenge" }
        });
      const R = e.captchaApi;
      if (!R)
        throw new T("CAPTCHA.INVALID_TOKEN", {
          context: { error: "No Captcha API found in state" }
        });
      const E = await R.submitCaptchaSolution(F, c.requestHash, g, u, c.timestamp, c.signature.provider.timestamp), j = E[0].verified;
      if (j || a.onFailed(), i({
        submission: E,
        isHuman: j,
        loading: !1
      }), e.isHuman) {
        const k = R.provider.provider.url;
        Y.setProcaptchaStorage({
          ...Y.getProcaptchaStorage(),
          providerUrl: k,
          blockNumber: G
        }), a.onHuman(he({
          [v.providerUrl]: k,
          [v.user]: x.account.address,
          [v.dapp]: I(),
          [v.commitmentId]: it(E[1]),
          [v.blockNumber]: G,
          [v.timestamp]: c.timestamp,
          [v.signature]: {
            [v.provider]: {
              [v.timestamp]: c.signature.provider.timestamp
            }
          }
        })), M();
      }
    });
  }, p = async () => {
    O(), N(), a.onClose();
  }, f = (c) => {
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
    const u = e.index, g = e.solutions, x = C(g, u);
    x.includes(c) ? x.splice(x.indexOf(c), 1) : x.push(c), i({ solutions: g });
  }, y = () => {
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
  }, w = async (c) => {
    const u = l(), g = ae(u);
    if (!u.account.address)
      throw new S("GENERAL.SITE_KEY_MISSING");
    return new Ue(g, c, u.account.address);
  }, O = () => {
    window.clearTimeout(e.timeout), i({ timeout: void 0 });
  }, M = () => {
    const c = t.captchas.image.solutionTimeout, u = setTimeout(() => {
      i({ isHuman: !1 }), a.onExpired();
    }, c);
    i({ successfullChallengeTimeout: u });
  }, N = () => {
    O(), i(pt());
  }, L = async () => {
    const c = l();
    if (!c.web2 && !c.userAccountAddress)
      throw new S("GENERAL.ACCOUNT_NOT_FOUND", {
        context: { error: "Account address has not been set for web3 mode" }
      });
    const g = await (c.web2 ? new $e() : new Fe()).getAccount(c);
    return Y.setAccount(g.account.address), i({ account: g }), D();
  }, D = () => {
    if (!e.account)
      throw new S("GENERAL.ACCOUNT_NOT_FOUND", {
        context: { error: "Account not loaded" }
      });
    return e.account;
  }, I = () => {
    if (!e.dappAccount)
      throw new S("GENERAL.SITE_KEY_MISSING");
    return e.dappAccount;
  }, W = () => e.blockNumber || 0, P = (c) => {
    const u = c || D();
    if (!u.extension)
      throw new S("ACCOUNT.NO_POLKADOT_EXTENSION", {
        context: { error: "Extension not loaded" }
      });
    return u.extension;
  };
  return {
    start: h,
    cancel: p,
    submit: b,
    select: f,
    nextRound: y
  };
}
const gt = (t) => {
  if (!t.hash)
    throw new H("CAPTCHA.MISSING_ITEM_HASH", {
      context: { item: t }
    });
  return t.hash;
}, mt = ({ challenge: t, solution: e, onClick: n, themeColor: o }) => {
  const a = t.items, r = m.useMemo(() => o === "light" ? U : $, [o]), i = "ontouchstart" in window, l = `${r.spacing.unit}px`, s = `${r.spacing.half}px`, h = {
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
  }, b = {
    0: { paddingTop: l },
    2: { paddingBottom: l }
  };
  return d("div", { style: {
    paddingRight: 0.5,
    paddingBottom: 0.5,
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap"
  }, children: a.map((p, f) => {
    const y = gt(p), w = {
      ...h[f % 3],
      ...b[Math.floor(f / 3)],
      flexGrow: 1,
      flexBasis: "33.3333%",
      boxSizing: "border-box"
    };
    return d("div", { style: w, children: A("div", { style: {
      cursor: "pointer",
      height: "100%",
      width: "100%",
      border: 1,
      borderStyle: "solid",
      borderColor: r.palette.grey[300]
    }, onClick: i ? void 0 : () => n(y), onTouchStart: i ? () => n(y) : void 0, children: [d("div", { children: d("img", { style: {
      width: "100%",
      backgroundColor: r.palette.grey[300],
      opacity: e.includes(y) && i ? "50%" : "100%",
      display: "block",
      objectFit: "contain",
      aspectRatio: "1/1",
      height: "auto"
    }, src: p.data, alt: `Captcha image ${f + 1}` }) }), d("div", { style: {
      position: "relative",
      width: "100%",
      height: "100%",
      top: "-100%",
      visibility: e.includes(y) ? "visible" : "hidden",
      transition: "opacity 225ms cubic-bezier(0.4, 0, 0.2, 1) 0ms",
      opacity: 1
    }, children: d("div", { style: {
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
    }, children: d("svg", { style: {
      backgroundColor: "transparent",
      display: "block",
      width: "35%",
      height: "35%",
      transition: "fill 200ms cubic-bezier(0.4, 0, 0.2, 1) 0ms",
      userSelect: "none",
      fill: "currentcolor"
    }, focusable: "false", color: "#fff", "aria-hidden": "true", viewBox: "0 0 24 24", "data-testid": "CheckIcon", "aria-label": "Check icon", children: d("path", { d: "M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" }) }) }) })] }) }, p.hash);
  }) });
};
function bt(t = {}) {
  return Object.keys(t).reduce((e, n) => ({ ...e, [`data-${n}`]: t[n] }), {});
}
function Z({ general: t, dev: e }) {
  return {
    ...bt(t)
  };
}
const xt = {
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
}, ie = ({ themeColor: t, buttonType: e, text: n, onClick: o }) => {
  const a = m.useMemo(() => t === "light" ? U : $, [t]), [r, i] = m.useState(!1), l = m.useMemo(() => {
    const s = {
      ...xt,
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
  return d("button", { ...Z({ dev: { cy: `button-${e}` } }), onMouseEnter: () => i(!0), onMouseLeave: () => i(!1), style: l, onClick: (s) => {
    s.preventDefault(), o();
  }, "aria-label": n, children: n });
}, yt = ({ challenge: t, index: e, solutions: n, onSubmit: o, onCancel: a, onClick: r, onNext: i, themeColor: l }) => {
  const { t: s } = ot(), h = t.captchas ? C(t.captchas, e) : null, b = n ? C(n, e) : [], p = m.useMemo(() => l === "light" ? U : $, [l]);
  return d(m.Suspense, { fallback: d("div", { children: "Loading..." }), children: d("div", { style: {
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
    padding: `${p.spacing.unit}px`,
    backgroundColor: p.palette.background.default
  }, children: A("div", { style: {
    backgroundColor: p.palette.background.default,
    display: "flex",
    flexDirection: "column",
    minWidth: "300px"
  }, children: [d("div", { style: {
    display: "flex",
    alignItems: "center",
    width: "100%"
  }, children: d("div", { style: {
    backgroundColor: p.palette.primary.main,
    width: "100%"
  }, children: A("div", { style: {
    paddingLeft: `${p.spacing.half}px`,
    paddingRight: `${p.spacing.half}px`
  }, children: [A("p", { style: {
    color: "#ffffff",
    fontWeight: 700,
    lineHeight: 1.5
  }, children: [s("WIDGET.SELECT_ALL"), ":", " ", d("span", { style: { textTransform: "capitalize" }, children: `${C(t.captchas, e).target}` })] }), d("p", { style: {
    color: "#ffffff",
    fontWeight: 500,
    lineHeight: 0.8,
    fontSize: "0.8rem"
  }, children: s("WIDGET.IF_NONE_CLICK_NEXT") })] }) }) }), d("div", { ...Z({ dev: { cy: `captcha-${e}` } }), children: h && d(mt, { challenge: h, solution: b, onClick: r, themeColor: l }) }), d("div", { style: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%"
  }, ...Z({ dev: { cy: "dots-captcha" } }) }), d("div", { style: {
    padding: `0 ${p.spacing}px`,
    display: "flex",
    width: "100%"
  } }), A("div", { style: {
    padding: `0 ${p.spacing}px`,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    lineHeight: 1.75
  }, children: [d(ie, { themeColor: l, buttonType: "cancel", onClick: a, text: s("WIDGET.CANCEL"), "aria-label": s("WIDGET.CANCEL") }), d(ie, { themeColor: l, buttonType: "next", text: e < t.captchas.length - 1 ? s("WIDGET.NEXT") : s("WIDGET.SUBMIT"), onClick: e < t.captchas.length - 1 ? i : o, "aria-label": e < t.captchas.length - 1 ? s("WIDGET.NEXT") : s("WIDGET.SUBMIT"), "data-cy": "button-next" })] })] }) }) });
}, Ct = fe.memo((t, e) => {
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
  }, l = {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "400px",
    backgroundColor: "transparent",
    border: "none",
    boxShadow: "rgba(0, 0, 0, 0.2) 0px 11px 15px -7px, rgba(0, 0, 0, 0.14) 0px 24px 38px 3px, rgba(0, 0, 0, 0.12) 0px 9px 46px 8px,"
  };
  return A("div", { className: "modalOuter", style: r, children: [d("div", { className: "modalBackground", style: i }), d("div", { className: "modalInner", style: l, children: o })] });
}), vt = (t) => {
  const e = se.parse(t.config), n = t.callbacks || {}, [o, a] = Ve(m.useState, m.useRef), r = ft(e, o, a, n), i = t.config.theme === "light" ? "light" : "dark", l = t.config.theme === "light" ? U : $;
  return d("div", { children: A("div", { style: {
    maxWidth: ge,
    maxHeight: "100%",
    overflowX: "auto"
  }, children: [d(Ct, { show: o.showModal, children: o.challenge ? d(yt, { challenge: o.challenge, index: o.index, solutions: o.solutions, onSubmit: r.submit, onCancel: r.cancel, onClick: r.select, onNext: r.nextRound, themeColor: e.theme ?? "light" }) : d("div", { children: "No challenge set." }) }), d(me, { children: d(be, { children: A("div", { style: xe, "data-cy": "button-human", children: [" ", A("div", { style: {
    padding: ye,
    border: Ce,
    backgroundColor: l.palette.background.default,
    borderColor: l.palette.grey[300],
    borderRadius: we,
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    justifyContent: "space-between",
    minHeight: `${Ae}px`,
    overflow: "hidden"
  }, children: [d("div", { style: { display: "inline-flex", flexDirection: "column" }, children: d("div", { style: {
    alignItems: "center",
    flex: 1
  }, children: A("div", { style: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
    verticalAlign: "middle"
  }, children: [d("div", { style: {
    display: o.loading ? "none" : "flex"
  }, children: d(Xe, { themeColor: i, onChange: r.start, checked: o.isHuman, labelText: "I am human", "aria-label": "human checkbox" }) }), d("div", { style: {
    display: o.loading ? "flex" : "none"
  }, children: d("div", { style: { display: "inline-flex" }, children: d(ve, { themeColor: i, "aria-label": "Loading spinner" }) }) })] }) }) }), d("div", { style: { display: "inline-flex", flexDirection: "column" }, children: d("a", { href: Te, target: "_blank", "aria-label": Ie, rel: "noreferrer", children: d("div", { style: { flex: 1 }, children: d(Ee, { themeColor: i, "aria-label": "Prosopo logo" }) }) }) })] })] }) }) })] }) });
};
export {
  vt as default
};
