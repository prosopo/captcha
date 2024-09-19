import { b as v, A as s, e as H, d as P, r as h, i as L, j as t, W as k, C as O, h as U, g as R, k as j, m as M, n as B, o as F, p as X, L as K, q as Y, s as q, t as V, l as $, f as z } from "./index-Ck7UqzKB.js";
import { k as J, g as _, p as Q, b as N, d as Z, e as ee, P as te, s as ne, E as ae, f as oe, i as se, j as re, C as ce } from "./utils-9IQXYrRR.js";
const ie = (r, e) => {
  let a = 0;
  const c = "0".repeat(e);
  for (; ; ) {
    const d = new TextEncoder().encode(a + r);
    if (le(J(d)).startsWith(c))
      return a;
    a += 1;
  }
}, le = (r) => Array.from(r).map((e) => e.toString(16).padStart(2, "0")).join(""), ue = (r, e, a, c) => {
  const d = _(a, e, c), m = () => ({
    showModal: !1,
    loading: !1,
    index: 0,
    challenge: void 0,
    solutions: void 0,
    isHuman: !1,
    captchaApi: void 0,
    account: void 0
  }), f = () => {
    window.clearTimeout(e.timeout), o({ timeout: void 0 });
  }, x = () => {
    window.clearTimeout(e.successfullChallengeTimeout), o({ successfullChallengeTimeout: void 0 });
  }, g = () => {
    const n = {
      userAccountAddress: "",
      ...r
    };
    return e.account && (n.userAccountAddress = e.account.account.address), P.parse(n);
  }, p = () => {
    if (!e.account)
      throw new v("GENERAL.ACCOUNT_NOT_FOUND", {
        context: { error: "Account not loaded" }
      });
    return { account: e.account };
  }, i = () => {
    if (!e.dappAccount)
      throw new v("GENERAL.SITE_KEY_MISSING");
    return e.dappAccount;
  }, o = N(e, a), l = () => {
    f(), x(), o(m());
  }, w = () => {
    const n = g().captchas.pow.solutionTimeout, A = setTimeout(() => {
      o({ isHuman: !1 }), d.onExpired();
    }, n);
    o({ successfullChallengeTimeout: A });
  }, C = async () => {
    await Q(async () => {
      var I;
      if (e.loading || e.isHuman)
        return;
      l(), o({
        loading: !0
      }), o({ attemptCount: e.attemptCount + 1 });
      const n = g(), A = n.web2 ? new ae() : new oe(), E = n.userAccountAddress || (await A.getAccount(n)).account.address;
      if (o({
        account: { account: { address: E } }
      }), o({ dappAccount: n.account.address }), await Z(100), !n.web2 && !n.userAccountAddress)
        throw new v("GENERAL.ACCOUNT_NOT_FOUND", {
          context: {
            error: "Account address has not been set for web3 mode"
          }
        });
      const W = await ee(g()), G = _(a, e, c), b = W.provider.url, y = new te(b, i()), u = await y.getPowCaptchaChallenge(E, i()), S = ie(u.challenge, u.difficulty), T = (I = (await A.getAccount(g())).extension) == null ? void 0 : I.signer;
      if (!T || !T.signRaw)
        throw new v("GENERAL.CANT_FIND_KEYRINGPAIR", {
          context: {
            error: "Signer is not defined, cannot sign message to prove account ownership"
          }
        });
      const D = await T.signRaw({
        address: E,
        data: ne(u[s.timestamp].toString()),
        type: "bytes"
      });
      (await y.submitPowCaptchaSolution(u, p().account.account.address, i(), S, D.signature.toString(), n.captchas.pow.verifiedTimeout))[s.verified] && (o({
        isHuman: !0,
        loading: !1
      }), G.onHuman(H({
        [s.providerUrl]: b,
        [s.user]: p().account.account.address,
        [s.dapp]: i(),
        [s.challenge]: u.challenge,
        [s.nonce]: S,
        [s.timestamp]: u.timestamp,
        [s.signature]: {
          [s.provider]: u.signature.provider,
          [s.user]: {
            [s.timestamp]: D.signature.toString()
          }
        }
      })), w());
    }, C, l, e.attemptCount, 10);
  };
  return {
    start: C,
    resetState: l
  };
}, he = (r) => {
  const { t: e } = se(), a = r.config, c = a.theme === "light" ? "light" : "dark", d = r.config.theme === "light" ? $ : z, m = r.callbacks || {}, [f, x] = re(h.useState, h.useRef), g = N(f, x), p = h.useRef(ue(a, f, g, m)), i = h.useRef(null);
  return h.useEffect(() => {
    const o = i.current;
    if (!o)
      return;
    const l = o.closest("form");
    if (!l)
      return;
    const w = () => {
      p.current.resetState();
    };
    return l.addEventListener("submit", w), a.language && L.changeLanguage(a.language), () => {
      l.removeEventListener("submit", w);
    };
  }, [a.language]), t("div", { ref: i, children: t("div", { style: {
    maxWidth: k,
    maxHeight: "100%",
    overflowX: "auto"
  }, children: t(O, { children: t(U, { children: R("div", { style: j, "data-cy": "button-human", children: [" ", R("div", { style: {
    padding: M,
    border: B,
    backgroundColor: d.palette.background.default,
    borderColor: d.palette.grey[300],
    borderRadius: F,
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    justifyContent: "space-between",
    minHeight: `${X}px`,
    overflow: "hidden"
  }, children: [t("div", { style: { display: "inline-flex", flexDirection: "column" }, children: t("div", { style: {
    display: "flex",
    justifyContent: "flex-start",
    alignItems: "center",
    flexWrap: "wrap"
  }, children: t("div", { style: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
    verticalAlign: "middle"
  }, children: t("div", { style: {
    display: "flex"
  }, children: t("div", { style: { flex: 1 }, children: f.loading ? t(K, { themeColor: c, "aria-label": "Loading spinner" }) : t(ce, { checked: f.isHuman, onChange: p.current.start, themeColor: c, labelText: e("WIDGET.I_AM_HUMAN"), "aria-label": "human checkbox" }) }) }) }) }) }), t("div", { style: { display: "inline-flex", flexDirection: "column" }, children: t("a", { href: Y, target: "_blank", "aria-label": q, rel: "noreferrer", children: t("div", { style: { flex: 1 }, children: t(V, { themeColor: c, "aria-label": "Prosopo logo" }) }) }) })] })] }) }) }) }) });
};
export {
  he as default
};
