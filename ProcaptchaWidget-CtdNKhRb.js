import { A as o, e as O, a as H, P as L, r as v, j as n, W as U, C as j, c as M, b as y, f as B, g as F, h as K, i as V, k as X, L as Y, m as $, n as q, o as z, l as J, d as Q } from "./index-DvT5XLGE.js";
import { v as Z, k as _, E as ee, p as te, n as ne, f as w, o as oe, s as ae, q as re, l as k, t as se, C as ce } from "./utils-nH-g73b2.js";
const ie = (s, e) => {
  let r = 0;
  const d = "0".repeat(e);
  for (; ; ) {
    const p = new TextEncoder().encode(r + s);
    if (le(Z(p)).startsWith(d))
      return r;
    r += 1;
  }
}, le = (s) => Array.from(s).map((e) => e.toString(16).padStart(2, "0")).join(""), de = (s, e, r, d) => {
  const p = _(r, e, d), u = () => ({
    showModal: !1,
    loading: !1,
    index: 0,
    challenge: void 0,
    solutions: void 0,
    isHuman: !1,
    captchaApi: void 0,
    account: void 0
  }), T = () => {
    window.clearTimeout(e.timeout), a({ timeout: void 0 });
  }, b = () => {
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
    T(), b(), a(u());
  }, P = () => {
    const t = i().captchas.pow.solutionTimeout, c = setTimeout(() => {
      a({ isHuman: !1 }), p.onExpired();
    }, t);
    a({ successfullChallengeTimeout: c });
  }, W = async () => {
    var S;
    if (e.loading || e.isHuman)
      return;
    I(), a({
      loading: !0
    });
    const t = i(), c = t.web2 ? new ee() : new te(), h = t.userAccountAddress || (await c.getAccount(t)).account.address;
    if (a({
      account: { account: { address: h } }
    }), a({ dappAccount: t.account.address }), await ne(100), !t.web2 && !t.userAccountAddress)
      throw new w("GENERAL.ACCOUNT_NOT_FOUND", {
        context: { error: "Account address has not been set for web3 mode" }
      });
    const f = G(), x = _(r, e, d), A = f.provider.url, D = new oe(E(i()), A, l()), m = await D.getPowCaptchaChallenge(h, l()), N = ie(m.challenge, m.difficulty), C = (S = (await c.getAccount(i())).extension) == null ? void 0 : S.signer;
    if (!C || !C.signRaw)
      throw new w("GENERAL.CANT_FIND_KEYRINGPAIR", {
        context: {
          error: "Signer is not defined, cannot sign message to prove account ownership"
        }
      });
    const R = await C.signRaw({
      address: h,
      data: ae(m[o.timestamp].toString()),
      type: "bytes"
    });
    (await D.submitPowCaptchaSolution(m, g().account.account.address, l(), N, R.signature.toString(), t.captchas.pow.verifiedTimeout))[o.verified] && (a({
      isHuman: !0,
      loading: !1
    }), x.onHuman(O({
      [o.providerUrl]: A,
      [o.user]: g().account.account.address,
      [o.dapp]: l(),
      [o.challenge]: m.challenge,
      [o.blockNumber]: f.blockNumber,
      [o.nonce]: N,
      [o.timestamp]: m.timestamp,
      [o.signature]: {
        [o.provider]: m.signature.provider,
        [o.user]: {
          [o.timestamp]: R.signature.toString()
        }
      }
    })), P());
  }, G = () => {
    const t = (x, A) => Math.floor(Math.random() * (A - x + 1) + x), c = i().defaultEnvironment, h = re(c), f = H(h, t(0, h.length - 1));
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
}, pe = (s) => {
  const e = s.config, r = e.theme === "light" ? "light" : "dark", d = s.config.theme === "light" ? J : Q, p = s.callbacks || {}, [u, T] = se(v.useState, v.useRef), b = k(u, T), i = v.useRef(de(e, u, b, p)), E = v.useRef(null);
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
  }, []), n("div", { ref: E, children: n("div", { style: {
    maxWidth: U,
    maxHeight: "100%",
    overflowX: "auto"
  }, children: n(j, { children: n(M, { children: y("div", { style: B, "data-cy": "button-human", children: [" ", y("div", { style: {
    padding: F,
    border: K,
    backgroundColor: d.palette.background.default,
    borderColor: d.palette.grey[300],
    borderRadius: V,
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    justifyContent: "space-between",
    minHeight: `${X}px`,
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
  }, children: n("div", { style: { flex: 1 }, children: u.loading ? n(Y, { themeColor: r, "aria-label": "Loading spinner" }) : n(ce, { checked: u.isHuman, onChange: i.current.start, themeColor: r, labelText: "I am human", "aria-label": "human checkbox" }) }) }) }) }) }), n("div", { style: { display: "inline-flex", flexDirection: "column" }, children: n("a", { href: $, target: "_blank", "aria-label": q, rel: "noreferrer", children: n("div", { style: { flex: 1 }, children: n(z, { themeColor: r, "aria-label": "Prosopo logo" }) }) }) })] })] }) }) }) }) });
};
export {
  pe as default
};
