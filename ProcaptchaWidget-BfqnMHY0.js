import { A as a, e as H, a as L, P as O, r as w, j as n, W as k, C as j, c as M, b as R, f as U, g as B, h as F, i as X, k as K, L as V, m as Y, n as q, o as $, l as z, d as J } from "./index-DU1XrpZS.js";
import { v as Q, k as _, n as Z, f as E, o as ee, s as te, p as ne, l as N, E as oe, q as ae, t as se, C as re } from "./utils-C4GbA2iF.js";
const ce = (r, e) => {
  let s = 0;
  const c = "0".repeat(e);
  for (; ; ) {
    const p = new TextEncoder().encode(s + r);
    if (ie(Q(p)).startsWith(c))
      return s;
    s += 1;
  }
}, ie = (r) => Array.from(r).map((e) => e.toString(16).padStart(2, "0")).join(""), le = (r, e, s, c) => {
  const p = _(s, e, c), i = () => ({
    showModal: !1,
    loading: !1,
    index: 0,
    challenge: void 0,
    solutions: void 0,
    isHuman: !1,
    captchaApi: void 0,
    account: void 0
  }), T = () => {
    window.clearTimeout(e.timeout), o({ timeout: void 0 });
  }, b = () => {
    window.clearTimeout(e.successfullChallengeTimeout), o({ successfullChallengeTimeout: void 0 });
  }, l = () => {
    const t = {
      userAccountAddress: "",
      ...r
    };
    return e.account && (t.userAccountAddress = e.account.account.address), O.parse(t);
  }, g = () => {
    if (!e.account)
      throw new E("GENERAL.ACCOUNT_NOT_FOUND", {
        context: { error: "Account not loaded" }
      });
    return { account: e.account };
  }, d = () => {
    if (!e.dappAccount)
      throw new E("GENERAL.SITE_KEY_MISSING");
    return e.dappAccount;
  }, o = N(e, s), v = () => {
    T(), b(), o(i());
  }, P = () => {
    const t = l().captchas.pow.solutionTimeout, f = setTimeout(() => {
      o({ isHuman: !1 }), p.onExpired();
    }, t);
    o({ successfullChallengeTimeout: f });
  }, W = async () => {
    var D;
    if (e.loading || e.isHuman)
      return;
    v(), o({
      loading: !0
    });
    const t = l(), f = t.web2 ? new oe() : new ae(), h = t.userAccountAddress || (await f.getAccount(t)).account.address;
    if (o({
      account: { account: { address: h } }
    }), o({ dappAccount: t.account.address }), await Z(100), !t.web2 && !t.userAccountAddress)
      throw new E("GENERAL.ACCOUNT_NOT_FOUND", {
        context: { error: "Account address has not been set for web3 mode" }
      });
    const m = G(), A = _(s, e, c), x = m.provider.url, I = new ee(x, d()), u = await I.getPowCaptchaChallenge(h, d()), S = ce(u.challenge, u.difficulty), C = (D = (await f.getAccount(l())).extension) == null ? void 0 : D.signer;
    if (!C || !C.signRaw)
      throw new E("GENERAL.CANT_FIND_KEYRINGPAIR", {
        context: {
          error: "Signer is not defined, cannot sign message to prove account ownership"
        }
      });
    const y = await C.signRaw({
      address: h,
      data: te(u[a.timestamp].toString()),
      type: "bytes"
    });
    (await I.submitPowCaptchaSolution(u, g().account.account.address, d(), S, y.signature.toString(), t.captchas.pow.verifiedTimeout))[a.verified] && (o({
      isHuman: !0,
      loading: !1
    }), A.onHuman(H({
      [a.providerUrl]: x,
      [a.user]: g().account.account.address,
      [a.dapp]: d(),
      [a.challenge]: u.challenge,
      [a.nonce]: S,
      [a.timestamp]: u.timestamp,
      [a.signature]: {
        [a.provider]: u.signature.provider,
        [a.user]: {
          [a.timestamp]: y.signature.toString()
        }
      }
    })), P());
  }, G = () => {
    const t = (A, x) => Math.floor(Math.random() * (x - A + 1) + A), f = l().defaultEnvironment, h = ne(f), m = L(h, t(0, h.length - 1));
    return {
      providerAccount: m.address,
      provider: {
        url: m.url,
        datasetId: m.datasetId,
        datasetIdContent: m.datasetIdContent
      }
    };
  };
  return {
    start: W,
    resetState: v
  };
}, me = (r) => {
  const e = r.config, s = e.theme === "light" ? "light" : "dark", c = r.config.theme === "light" ? z : J, p = r.callbacks || {}, [i, T] = se(w.useState, w.useRef), b = N(i, T), l = w.useRef(le(e, i, b, p)), g = w.useRef(null);
  return w.useEffect(() => {
    const d = g.current;
    if (!d)
      return;
    const o = d.closest("form");
    if (!o)
      return;
    const v = () => {
      l.current.resetState();
    };
    return o.addEventListener("submit", v), () => {
      o.removeEventListener("submit", v);
    };
  }, []), n("div", { ref: g, children: n("div", { style: {
    maxWidth: k,
    maxHeight: "100%",
    overflowX: "auto"
  }, children: n(j, { children: n(M, { children: R("div", { style: U, "data-cy": "button-human", children: [" ", R("div", { style: {
    padding: B,
    border: F,
    backgroundColor: c.palette.background.default,
    borderColor: c.palette.grey[300],
    borderRadius: X,
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    justifyContent: "space-between",
    minHeight: `${K}px`,
    overflow: "hidden"
  }, children: [n("div", { style: { display: "inline-flex", flexDirection: "column" }, children: n("div", { style: {
    display: "flex",
    justifyContent: "flex-start",
    alignItems: "center",
    flexWrap: "wrap"
  }, children: n("div", { style: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
    verticalAlign: "middle"
  }, children: n("div", { style: {
    display: "flex"
  }, children: n("div", { style: { flex: 1 }, children: i.loading ? n(V, { themeColor: s, "aria-label": "Loading spinner" }) : n(re, { checked: i.isHuman, onChange: l.current.start, themeColor: s, labelText: "I am human", "aria-label": "human checkbox" }) }) }) }) }) }), n("div", { style: { display: "inline-flex", flexDirection: "column" }, children: n("a", { href: Y, target: "_blank", "aria-label": q, rel: "noreferrer", children: n("div", { style: { flex: 1 }, children: n($, { themeColor: s, "aria-label": "Prosopo logo" }) }) }) })] })] }) }) }) }) });
};
export {
  me as default
};
