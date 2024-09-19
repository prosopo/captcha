import { z as P, P as b, a as u, b as I, c as D, e as ie, A as x, d as q, r as A, l as L, f as M, j as s, g as C, R as se, i as ce, W as le, C as de, h as he, k as pe, m as ue, n as ge, o as fe, p as me, L as xe, q as Ce, s as be, t as Ae } from "./index-Ck7UqzKB.js";
import { u as ye, h as we, a as j, s as X, g as Te, p as F, b as Ee, c as Ie, d as Se, e as ve, r as Ne, P as He, E as De, f as Re, i as Y, j as _e, C as Pe } from "./utils-9IQXYrRR.js";
function ke(t) {
  return ye(we(t));
}
const Le = (t) => Array.isArray(t) && t !== null, k = new Array(256), J = new Array(256 * 256);
for (let t = 0; t < 256; t++)
  k[t] = t.toString(16).padStart(2, "0");
for (let t = 0; t < 256; t++) {
  const e = t << 8;
  for (let o = 0; o < 256; o++)
    J[e | o] = k[t] + k[o];
}
function U(t, e) {
  const o = t.length % 2 | 0, r = t.length - o | 0;
  for (let n = 0; n < r; n += 2)
    e += J[t[n] << 8 | t[n + 1]];
  return o && (e += k[t[r] | 0]), e;
}
function Me(t, e = -1, o = !0) {
  const r = o ? "0x" : "";
  if (!(t != null && t.length))
    return r;
  if (e > 0) {
    const n = Math.ceil(e / 8);
    if (t.length > n)
      return `${U(t.subarray(0, n / 2), r)}…${U(t.subarray(t.length - n / 2), "")}`;
  }
  return U(t, r);
}
const Oe = (t) => Le(t) ? Me(new Uint8Array(t)) : t.toString(), Z = P.object({
  account: P.string().optional(),
  blockNumber: P.number().optional(),
  providerUrl: P.string().optional()
});
function Ge(t) {
  return j([
    t.captchaId,
    t.captchaContentId,
    [...t.solution].sort(),
    t.salt
  ]);
}
class K {
  constructor(e) {
    this.hash = e, this.parent = null;
  }
}
class We {
  constructor() {
    this.leaves = [], this.layers = [];
  }
  getRoot() {
    if (this.root === void 0)
      throw new b("DATASET.MERKLE_ERROR", {
        context: {
          error: "root undefined",
          failedFuncName: this.getRoot.name
        }
      });
    return this.root;
  }
  build(e) {
    this.layers.length && (this.layers = []);
    const o = [];
    for (const r of e) {
      const n = new K(r);
      this.leaves.push(n), o.push(n.hash);
    }
    this.layers.push(o), this.root = this.buildMerkleTree(this.leaves)[0];
  }
  buildMerkleTree(e) {
    const o = e.length;
    if (o === 1)
      return e;
    const r = [];
    let n = 0;
    const a = [];
    for (; n < o; ) {
      const c = e[n];
      if (c === void 0)
        throw new b("DEVELOPER.GENERAL", {
          context: { error: "leftChild undefined" }
        });
      const d = n + 1 < o ? u(e, n + 1) : c, i = this.createParent(c, d);
      a.push(i.hash), r.push(i), n += 2;
    }
    return this.layers.push(a), this.buildMerkleTree(r);
  }
  createParent(e, o) {
    const r = new K(j([e.hash, o.hash]));
    return e.parent = r.hash, o.parent = r.hash, r;
  }
  proof(e) {
    const o = [];
    let r = 0;
    for (; r < this.layers.length - 1; ) {
      const a = this.layers[r];
      if (a === void 0)
        throw new b("DATASET.MERKLE_ERROR", {
          context: {
            error: "layer undefined",
            failedFuncName: this.proof.name,
            layerNum: r
          }
        });
      const c = a.indexOf(e);
      let d = c % 2 && c > 0 ? c - 1 : c + 1;
      d > a.length - 1 && (d = c);
      const i = [e], g = u(a, d);
      d > c ? i.push(g) : i.unshift(g), o.push([u(i, 0), u(i, 1)]), r += 1, e = j(i);
    }
    const n = u(this.layers, this.layers.length - 1);
    return [...o, [u(n, 0)]];
  }
}
class Ue {
  constructor(e, o, r, n, a) {
    this.userAccount = e, this.provider = o, this.providerApi = r, this._web2 = n, this.dappAccount = a;
  }
  get web2() {
    return this._web2;
  }
  async getCaptchaChallenge() {
    try {
      const e = await this.providerApi.getCaptchaChallenge(this.userAccount, this.provider);
      for (const o of e.captchas)
        for (const r of o.items)
          r.data && (r.data = r.data.replace(/^http(s)*:\/\//, "//"));
      return e;
    } catch (e) {
      throw new I("CAPTCHA.INVALID_CAPTCHA_CHALLENGE", {
        context: { error: e }
      });
    }
  }
  async submitCaptchaSolution(e, o, r, n, a) {
    const c = new We(), d = r.map((h) => Ge(h));
    if (c.build(d), !c.root)
      throw new D("CAPTCHA.INVALID_CAPTCHA_CHALLENGE", {
        context: { error: "Merkle tree root is undefined" }
      });
    const i = c.root.hash, g = void 0;
    let y;
    try {
      y = await this.providerApi.submitCaptchaSolution(r, o, this.userAccount, n, a, e);
    } catch (h) {
      throw new D("CAPTCHA.INVALID_CAPTCHA_CHALLENGE", {
        context: { error: h }
      });
    }
    return [y, i, g];
  }
}
const Q = "@prosopo/procaptcha";
function z() {
  return Z.parse(JSON.parse(ke(localStorage.getItem(Q) || "0x7b7d")));
}
function ee(t) {
  localStorage.setItem(Q, X(JSON.stringify(Z.parse(t))));
}
function Be(t) {
  ee({ ...z(), account: t });
}
function je() {
  return z().account || null;
}
const B = {
  setAccount: Be,
  getAccount: je,
  setProcaptchaStorage: ee,
  getProcaptchaStorage: z
}, $e = () => ({
  showModal: !1,
  loading: !1,
  index: 0,
  challenge: void 0,
  solutions: void 0,
  isHuman: !1,
  captchaApi: void 0,
  account: void 0
});
function ze(t, e, o, r) {
  const n = Te(o, e, r), a = Ee(e, o), c = () => {
    const l = {
      userAccountAddress: "",
      ...t
    };
    return e.account && (l.userAccountAddress = e.account.account.address), q.parse(l);
  }, d = async () => {
    n.onOpen(), await F(async () => {
      if (e.loading || e.isHuman)
        return;
      await Ie(), R(), a({ loading: !0 }), a({
        attemptCount: e.attemptCount ? e.attemptCount + 1 : 1
      });
      const l = c();
      a({ dappAccount: l.account.address }), await Se(100);
      const p = await te(), f = await ve(c()), m = f.provider.url, N = await v(m), W = new Ue(p.account.address, f, N, l.web2, l.account.address || "");
      a({ captchaApi: W });
      const T = await W.getCaptchaChallenge();
      if (T.captchas.length <= 0)
        throw new D("DEVELOPER.PROVIDER_NO_CAPTCHA");
      const _ = T.captchas.map((S) => S.timeLimitMs || l.captchas.image.challengeTimeout).reduce((S, E) => S + E), H = setTimeout(() => {
        n.onChallengeExpired(), a({ isHuman: !1, showModal: !1, loading: !1 });
      }, _);
      a({
        index: 0,
        solutions: T.captchas.map(() => []),
        challenge: T,
        showModal: !0,
        timeout: H
      });
    }, d, R, e.attemptCount, 10);
  }, i = async () => {
    await F(async () => {
      if (w(), !e.challenge)
        throw new b("CAPTCHA.NO_CAPTCHA", {
          context: { error: "Cannot submit, no Captcha found in state" }
        });
      a({ showModal: !1 });
      const l = e.challenge, p = Ne(), f = e.challenge.captchas.map((E, ae) => {
        const re = u(e.solutions, ae);
        return {
          captchaId: E.captchaId,
          captchaContentId: E.captchaContentId,
          salt: p,
          solution: re
        };
      }), m = G(), N = oe(m).signer;
      if (!u(l.captchas, 0).datasetId)
        throw new D("CAPTCHA.INVALID_CAPTCHA_ID", {
          context: { error: "No datasetId set for challenge" }
        });
      const T = e.captchaApi;
      if (!T)
        throw new b("CAPTCHA.INVALID_TOKEN", {
          context: { error: "No Captcha API found in state" }
        });
      if (!N || !N.signRaw)
        throw new I("GENERAL.CANT_FIND_KEYRINGPAIR", {
          context: {
            error: "Signer is not defined, cannot sign message to prove account ownership"
          }
        });
      const _ = await N.signRaw({
        address: m.account.address,
        data: X(l.requestHash),
        type: "bytes"
      }), H = await T.submitCaptchaSolution(_.signature, l.requestHash, f, l.timestamp, l.signature.provider.requestHash), S = H[0].verified;
      if (S || n.onFailed(), a({
        submission: H,
        isHuman: S,
        loading: !1
      }), e.isHuman) {
        const E = T.provider.provider.url;
        B.setProcaptchaStorage({
          ...B.getProcaptchaStorage(),
          providerUrl: E
        }), n.onHuman(ie({
          [x.providerUrl]: E,
          [x.user]: m.account.address,
          [x.dapp]: ne(),
          [x.commitmentId]: Oe(H[1]),
          [x.timestamp]: l.timestamp,
          [x.signature]: {
            [x.provider]: {
              [x.requestHash]: l.signature.provider.requestHash
            },
            [x.user]: {
              [x.requestHash]: _.signature
            }
          }
        })), O();
      }
    }, d, R, e.attemptCount, 10);
  }, g = async () => {
    w(), R(), n.onClose();
  }, y = (l) => {
    if (!e.challenge)
      throw new b("CAPTCHA.NO_CAPTCHA", {
        context: { error: "Cannot select, no Captcha found in state" }
      });
    if (e.index >= e.challenge.captchas.length || e.index < 0)
      throw new b("CAPTCHA.NO_CAPTCHA", {
        context: {
          error: "Cannot select, index is out of range for this Captcha"
        }
      });
    const p = e.index, f = e.solutions, m = u(f, p);
    m.includes(l) ? m.splice(m.indexOf(l), 1) : m.push(l), a({ solutions: f });
  }, h = () => {
    if (!e.challenge)
      throw new b("CAPTCHA.NO_CAPTCHA", {
        context: { error: "Cannot select, no Captcha found in state" }
      });
    if (e.index + 1 >= e.challenge.captchas.length)
      throw new b("CAPTCHA.NO_CAPTCHA", {
        context: {
          error: "Cannot select, index is out of range for this Captcha"
        }
      });
    a({ index: e.index + 1 });
  }, v = async (l) => {
    const p = c();
    if (!p.account.address)
      throw new I("GENERAL.SITE_KEY_MISSING");
    return new He(l, p.account.address);
  }, w = () => {
    window.clearTimeout(e.timeout), a({ timeout: void 0 });
  }, O = () => {
    const l = t.captchas.image.solutionTimeout, p = setTimeout(() => {
      a({ isHuman: !1 }), n.onExpired();
    }, l);
    a({ successfullChallengeTimeout: p });
  }, R = () => {
    w(), a($e());
  }, te = async () => {
    const l = c();
    if (!l.web2 && !l.userAccountAddress)
      throw new I("GENERAL.ACCOUNT_NOT_FOUND", {
        context: { error: "Account address has not been set for web3 mode" }
      });
    const f = await (l.web2 ? new De() : new Re()).getAccount(l);
    return B.setAccount(f.account.address), a({ account: f }), G();
  }, G = () => {
    if (!e.account)
      throw new I("GENERAL.ACCOUNT_NOT_FOUND", {
        context: { error: "Account not loaded" }
      });
    return e.account;
  }, ne = () => {
    if (!e.dappAccount)
      throw new I("GENERAL.SITE_KEY_MISSING");
    return e.dappAccount;
  }, oe = (l) => {
    const p = l || G();
    if (!p.extension)
      throw new I("ACCOUNT.NO_POLKADOT_EXTENSION", {
        context: { error: "Extension not loaded" }
      });
    return p.extension;
  };
  return {
    start: d,
    cancel: g,
    submit: i,
    select: y,
    nextRound: h
  };
}
const Fe = (t) => {
  if (!t.hash)
    throw new D("CAPTCHA.MISSING_ITEM_HASH", {
      context: { item: t }
    });
  return t.hash;
}, Ke = ({ challenge: t, solution: e, onClick: o, themeColor: r }) => {
  const n = t.items, a = A.useMemo(() => r === "light" ? L : M, [r]), c = "ontouchstart" in window, d = `${a.spacing.unit}px`, i = `${a.spacing.half}px`, g = {
    0: {
      paddingLeft: 0,
      paddingRight: i,
      paddingTop: i,
      paddingBottom: i
    },
    1: {
      paddingLeft: i,
      paddingRight: i,
      paddingTop: i,
      paddingBottom: i
    },
    2: {
      paddingLeft: i,
      paddingRight: 0,
      paddingTop: i,
      paddingBottom: i
    }
  }, y = {
    0: { paddingTop: d },
    2: { paddingBottom: d }
  };
  return s("div", { style: {
    paddingRight: 0.5,
    paddingBottom: 0.5,
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap"
  }, children: n.map((h, v) => {
    const w = Fe(h), O = {
      ...g[v % 3],
      ...y[Math.floor(v / 3)],
      flexGrow: 1,
      flexBasis: "33.3333%",
      boxSizing: "border-box"
    };
    return s("div", { style: O, children: C("div", { style: {
      cursor: "pointer",
      height: "100%",
      width: "100%",
      border: 1,
      borderStyle: "solid",
      borderColor: a.palette.grey[300]
    }, onClick: c ? void 0 : () => o(w), onTouchStart: c ? () => o(w) : void 0, children: [s("div", { children: s("img", { style: {
      width: "100%",
      backgroundColor: a.palette.grey[300],
      opacity: e.includes(w) && c ? "50%" : "100%",
      display: "block",
      objectFit: "contain",
      aspectRatio: "1/1",
      height: "auto"
    }, src: h.data, alt: `Captcha image ${v + 1}` }) }), s("div", { style: {
      position: "relative",
      width: "100%",
      height: "100%",
      top: "-100%",
      visibility: e.includes(w) ? "visible" : "hidden",
      transition: "opacity 225ms cubic-bezier(0.4, 0, 0.2, 1) 0ms",
      opacity: 1
    }, children: s("div", { style: {
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
    }, children: s("svg", { style: {
      backgroundColor: "transparent",
      display: "block",
      width: "35%",
      height: "35%",
      transition: "fill 200ms cubic-bezier(0.4, 0, 0.2, 1) 0ms",
      userSelect: "none",
      fill: "currentcolor"
    }, focusable: "false", color: "#fff", "aria-hidden": "true", viewBox: "0 0 24 24", "data-testid": "CheckIcon", "aria-label": "Check icon", children: s("path", { d: "M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" }) }) }) })] }) }, h.hash);
  }) });
};
function Ve(t = {}) {
  return Object.keys(t).reduce((e, o) => ({ ...e, [`data-${o}`]: t[o] }), {});
}
function $({ general: t, dev: e }) {
  return {
    ...Ve(t)
  };
}
const qe = {
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
}, V = ({ themeColor: t, buttonType: e, text: o, onClick: r }) => {
  const n = A.useMemo(() => t === "light" ? L : M, [t]), [a, c] = A.useState(!1), d = A.useMemo(() => {
    const i = {
      ...qe,
      color: a ? n.palette.primary.contrastText : n.palette.background.contrastText
    };
    return e === "cancel" ? {
      ...i,
      backgroundColor: a ? n.palette.grey[600] : "transparent"
    } : {
      ...i,
      backgroundColor: a ? n.palette.primary.main : n.palette.background.default
    };
  }, [e, a, n]);
  return s("button", { ...$({ dev: { cy: `button-${e}` } }), onMouseEnter: () => c(!0), onMouseLeave: () => c(!1), style: d, onClick: (i) => {
    i.preventDefault(), r();
  }, "aria-label": o, children: o });
}, Xe = ({ challenge: t, index: e, solutions: o, onSubmit: r, onCancel: n, onClick: a, onNext: c, themeColor: d }) => {
  const { t: i } = Y(), g = t.captchas ? u(t.captchas, e) : null, y = o ? u(o, e) : [], h = A.useMemo(() => d === "light" ? L : M, [d]);
  return s(A.Suspense, { fallback: s("div", { children: "Loading..." }), children: s("div", { style: {
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
    padding: `${h.spacing.unit}px`,
    backgroundColor: h.palette.background.default
  }, children: C("div", { style: {
    backgroundColor: h.palette.background.default,
    display: "flex",
    flexDirection: "column",
    minWidth: "300px"
  }, children: [s("div", { style: {
    display: "flex",
    alignItems: "center",
    width: "100%"
  }, children: s("div", { style: {
    backgroundColor: h.palette.primary.main,
    width: "100%"
  }, children: C("div", { style: {
    paddingLeft: `${h.spacing.half}px`,
    paddingRight: `${h.spacing.half}px`
  }, children: [C("p", { style: {
    color: "#ffffff",
    fontWeight: 700,
    lineHeight: 1.5
  }, children: [i("WIDGET.SELECT_ALL"), ":", " ", s("span", { children: `${i(u(t.captchas, e).target)} ` })] }), s("p", { style: {
    color: "#ffffff",
    fontWeight: 500,
    lineHeight: 0.8,
    fontSize: "0.8rem"
  }, children: i("WIDGET.IF_NONE_CLICK_NEXT") })] }) }) }), s("div", { ...$({ dev: { cy: `captcha-${e}` } }), children: g && s(Ke, { challenge: g, solution: y, onClick: a, themeColor: d }) }), s("div", { style: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%"
  }, ...$({ dev: { cy: "dots-captcha" } }) }), s("div", { style: {
    padding: `0 ${h.spacing}px`,
    display: "flex",
    width: "100%"
  } }), C("div", { style: {
    padding: `0 ${h.spacing}px`,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    lineHeight: 1.75
  }, children: [s(V, { themeColor: d, buttonType: "cancel", onClick: n, text: i("WIDGET.CANCEL"), "aria-label": i("WIDGET.CANCEL") }), s(V, { themeColor: d, buttonType: "next", text: e < t.captchas.length - 1 ? i("WIDGET.NEXT") : i("WIDGET.SUBMIT"), onClick: e < t.captchas.length - 1 ? c : r, "aria-label": e < t.captchas.length - 1 ? i("WIDGET.NEXT") : i("WIDGET.SUBMIT"), "data-cy": "button-next" })] })] }) }) });
}, Ye = se.memo((t, e) => {
  const { show: o, children: r } = t, a = {
    position: "fixed",
    zIndex: 2147483646,
    inset: 0,
    display: o ? "block" : "none"
  }, c = {
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
  return C("div", { className: "prosopo-modalOuter", style: a, children: [s("div", { className: "prosopo-modalBackground", style: c }), s("div", { className: "prosopo-modalInner", style: d, children: r })] });
}), Qe = (t) => {
  const { t: e } = Y(), o = q.parse(t.config), r = t.callbacks || {}, [n, a] = _e(A.useState, A.useRef), c = ze(o, n, a, r), d = t.config.theme === "light" ? "light" : "dark", i = t.config.theme === "light" ? L : M;
  return A.useEffect(() => {
    o.language && ce.changeLanguage(o.language);
  }, [o.language]), s("div", { children: C("div", { style: {
    maxWidth: le,
    maxHeight: "100%",
    overflowX: "auto"
  }, children: [s(Ye, { show: n.showModal, children: n.challenge ? s(Xe, { challenge: n.challenge, index: n.index, solutions: n.solutions, onSubmit: c.submit, onCancel: c.cancel, onClick: c.select, onNext: c.nextRound, themeColor: o.theme ?? "light" }) : s("div", { children: "No challenge set." }) }), s(de, { children: s(he, { children: C("div", { style: pe, "data-cy": "button-human", children: [" ", C("div", { style: {
    padding: ue,
    border: ge,
    backgroundColor: i.palette.background.default,
    borderColor: i.palette.grey[300],
    borderRadius: fe,
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    justifyContent: "space-between",
    minHeight: `${me}px`,
    overflow: "hidden"
  }, children: [s("div", { style: { display: "inline-flex", flexDirection: "column" }, children: s("div", { style: {
    alignItems: "center",
    flex: 1
  }, children: C("div", { style: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
    verticalAlign: "middle"
  }, children: [s("div", { style: {
    display: n.loading ? "none" : "flex"
  }, children: s(Pe, { themeColor: d, onChange: c.start, checked: n.isHuman, labelText: e("WIDGET.I_AM_HUMAN"), "aria-label": "human checkbox" }) }), s("div", { style: {
    display: n.loading ? "flex" : "none"
  }, children: s("div", { style: { display: "inline-flex" }, children: s(xe, { themeColor: d, "aria-label": "Loading spinner" }) }) })] }) }) }), s("div", { style: { display: "inline-flex", flexDirection: "column" }, children: s("a", { href: Ce, target: "_blank", "aria-label": be, rel: "noreferrer", children: s("div", { style: { flex: 1 }, children: s(Ae, { themeColor: d, "aria-label": "Prosopo logo" }) }) }) })] })] }) }) })] }) });
};
export {
  Qe as default
};
