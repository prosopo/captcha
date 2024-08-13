import { A as o, e as G, a as H, P as L, r as v, j as n, C as U, W as j, b as D, c as M, f as B, g as F, h as K, i as V, L as X, k as Y, m as $, n as q, l as z, d as J } from "./index-jr-ls0GZ.js";
import { v as Q, k as _, E as Z, p as ee, n as te, f as w, o as ne, s as oe, q as ae, l as k, t as re, C as se } from "./utils-CHbJaqXT.js";
const ce = (s, e) => {
  let r = 0;
  const d = "0".repeat(e);
  for (; ; ) {
    const p = new TextEncoder().encode(r + s);
    if (ie(Q(p)).startsWith(d))
      return r;
    r += 1;
  }
}, ie = (s) => Array.from(s).map((e) => e.toString(16).padStart(2, "0")).join(""), le = (s, e, r, d) => {
  const p = _(r, e, d), u = () => ({
    showModal: !1,
    loading: !1,
    index: 0,
    challenge: void 0,
    solutions: void 0,
    isHuman: !1,
    captchaApi: void 0,
    account: void 0
  }), b = () => {
    window.clearTimeout(e.timeout), a({ timeout: void 0 });
  }, T = () => {
    window.clearTimeout(e.successfullChallengeTimeout), a({ successfullChallengeTimeout: void 0 });
  }, i = () => {
    const t = {
      userAccountAddress: "",
      ...s
    };
    return e.account && (t.userAccountAddress = e.account.account.address), L.parse(t);
  }, E = (t) => {
    const c = t.networks[t.defaultNetwork];
    if (!c)
      throw new w("DEVELOPER.NETWORK_NOT_FOUND", {
        context: {
          error: `No network found for environment ${t.defaultEnvironment}`
        }
      });
    return c;
  }, g = () => {
    if (!e.account)
      throw new w("GENERAL.ACCOUNT_NOT_FOUND", {
        context: { error: "Account not loaded" }
      });
    return { account: e.account };
  }, l = () => {
    if (!e.dappAccount)
      throw new w("GENERAL.SITE_KEY_MISSING");
    return e.dappAccount;
  }, a = k(e, r), I = () => {
    b(), T(), a(u());
  }, P = () => {
    const t = i().captchas.pow.solutionTimeout, c = setTimeout(() => {
      a({ isHuman: !1 }), p.onExpired();
    }, t);
    a({ successfullChallengeTimeout: c });
  }, W = async () => {
    var y;
    if (e.loading || e.isHuman)
      return;
    I(), a({
      loading: !0
    });
    const t = i(), c = t.web2 ? new Z() : new ee(), h = t.userAccountAddress || (await c.getAccount(t)).account.address;
    if (a({
      account: { account: { address: h } }
    }), a({ dappAccount: t.account.address }), await te(100), !t.web2 && !t.userAccountAddress)
      throw new w("GENERAL.ACCOUNT_NOT_FOUND", {
        context: { error: "Account address has not been set for web3 mode" }
      });
    const f = O(), x = _(r, e, d), A = f.provider.url, N = new ne(E(i()), A, l()), m = await N.getPowCaptchaChallenge(h, l()), R = ce(m.challenge, m.difficulty), C = (y = (await c.getAccount(i())).extension) == null ? void 0 : y.signer;
    if (!C || !C.signRaw)
      throw new w("GENERAL.CANT_FIND_KEYRINGPAIR", {
        context: {
          error: "Signer is not defined, cannot sign message to prove account ownership"
        }
      });
    const S = await C.signRaw({
      address: h,
      data: oe(m[o.timestamp].toString()),
      type: "bytes"
    });
    (await N.submitPowCaptchaSolution(m, g().account.account.address, l(), R, S.signature.toString(), t.captchas.pow.verifiedTimeout))[o.verified] && (a({
      isHuman: !0,
      loading: !1
    }), x.onHuman(G({
      [o.providerUrl]: A,
      [o.user]: g().account.account.address,
      [o.dapp]: l(),
      [o.challenge]: m.challenge,
      [o.blockNumber]: f.blockNumber,
      [o.nonce]: R,
      [o.timestamp]: m.timestamp,
      [o.signature]: {
        [o.provider]: m.signature.provider,
        [o.user]: {
          [o.timestamp]: S.signature.toString()
        }
      }
    })), P());
  }, O = () => {
    const t = (x, A) => Math.floor(Math.random() * (A - x + 1) + x), c = i().defaultEnvironment, h = ae(c), f = H(h, t(0, h.length - 1));
    return {
      providerAccount: f.address,
      provider: {
        url: f.url,
        datasetId: f.datasetId,
        datasetIdContent: f.datasetIdContent
      },
      blockNumber: 0
    };
  };
  return {
    start: W,
    resetState: I
  };
}, he = (s) => {
  const e = s.config, r = e.theme === "light" ? "light" : "dark", d = s.config.theme === "light" ? z : J, p = s.callbacks || {}, [u, b] = re(v.useState, v.useRef), T = k(u, b), i = v.useRef(le(e, u, T, p)), E = v.useRef(null);
  return v.useEffect(() => {
    const g = E.current;
    if (!g)
      return;
    const l = g.closest("form");
    if (!l)
      return;
    const a = () => {
      i.current.resetState();
    };
    return l.addEventListener("submit", a), () => {
      l.removeEventListener("submit", a);
    };
  }, []), n("div", { ref: E, children: n("div", { style: { maxWidth: "100%", maxHeight: "100%", overflowX: "auto" }, children: n(U, { children: n(j, { children: D("div", { style: M, "data-cy": "button-human", children: [" ", D("div", { style: {
    padding: B,
    border: F,
    backgroundColor: d.palette.background.default,
    borderColor: d.palette.grey[300],
    borderRadius: K,
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    justifyContent: "space-between",
    minHeight: `${V}px`,
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
  }, children: n("div", { style: { flex: 1 }, children: u.loading ? n(X, { themeColor: r, "aria-label": "Loading spinner" }) : n(se, { checked: u.isHuman, onChange: i.current.start, themeColor: r, labelText: "I am human", "aria-label": "human checkbox" }) }) }) }) }) }), n("div", { style: { display: "inline-flex", flexDirection: "column" }, children: n("a", { href: Y, target: "_blank", "aria-label": $, rel: "noreferrer", children: n("div", { style: { flex: 1 }, children: n(q, { themeColor: r, "aria-label": "Prosopo logo" }) }) }) })] })] }) }) }) }) });
};
export {
  he as default
};
