import { A as ApiParams, e as encodeProcaptchaOutput, P as ProcaptchaConfigSchema, r as reactExports, j as jsx, W as WIDGET_MAX_WIDTH, C as ContainerDiv, c as WidthBasedStylesDiv, b as jsxs, f as WIDGET_DIMENSIONS, g as WIDGET_PADDING, h as WIDGET_BORDER, i as WIDGET_BORDER_RADIUS, k as WIDGET_INNER_HEIGHT, L as LoadingSpinner, m as WIDGET_URL, n as WIDGET_URL_TEXT, o as Logo, l as lightTheme, d as darkTheme } from "./index-WMDHY9Wb.js";
import { w as sha256, k as getDefaultEvents, p as providerRetry, l as buildUpdateState, n as sleep, f as ProsopoEnvError, o as getRandomActiveProvider, q as ProviderApi, E as ExtensionWeb2, t as ExtensionWeb3, v as useProcaptcha, C as Checkbox } from "./utils-C294xC_X.js";
const solvePoW = (data, difficulty) => {
  let nonce = 0;
  const prefix = "0".repeat(difficulty);
  while (true) {
    const message = new TextEncoder().encode(nonce + data);
    const hashHex = bufferToHex(sha256(message));
    if (hashHex.startsWith(prefix)) {
      return nonce;
    }
    nonce += 1;
  }
};
const bufferToHex = (buffer) => Array.from(buffer).map((byte) => byte.toString(16).padStart(2, "0")).join("");
const U8 = new Array(256);
const U16 = new Array(256 * 256);
for (let n = 0; n < 256; n++) {
  U8[n] = n.toString(16).padStart(2, "0");
}
for (let i = 0; i < 256; i++) {
  const s = i << 8;
  for (let j = 0; j < 256; j++) {
    U16[s | j] = U8[i] + U8[j];
  }
}
function hex(value, result) {
  const mod = value.length % 2 | 0;
  const length = value.length - mod | 0;
  for (let i = 0; i < length; i += 2) {
    result += U16[value[i] << 8 | value[i + 1]];
  }
  if (mod) {
    result += U8[value[length] | 0];
  }
  return result;
}
function u8aToHex(value, bitLength = -1, isPrefixed = true) {
  const empty = isPrefixed ? "0x" : "";
  if (!(value == null ? void 0 : value.length)) {
    return empty;
  } else if (bitLength > 0) {
    const length = Math.ceil(bitLength / 8);
    if (value.length > length) {
      return `${hex(value.subarray(0, length / 2), empty)}…${hex(value.subarray(value.length - length / 2), "")}`;
    }
  }
  return hex(value, empty);
}
function evaluateThis(fn) {
  return fn("return this");
}
const xglobal = typeof globalThis !== "undefined" ? globalThis : typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : evaluateThis(Function);
function extractGlobal(name, fallback) {
  return typeof xglobal[name] === "undefined" ? fallback : xglobal[name];
}
let TextEncoder$2 = class TextEncoder2 {
  encode(value) {
    const count = value.length;
    const u8a = new Uint8Array(count);
    for (let i = 0; i < count; i++) {
      u8a[i] = value.charCodeAt(i);
    }
    return u8a;
  }
};
const TextEncoder$1 = /* @__PURE__ */ extractGlobal("TextEncoder", TextEncoder$2);
const encoder = new TextEncoder$1();
function stringToU8a(value) {
  return value ? encoder.encode(value.toString()) : new Uint8Array();
}
function stringToHex(value) {
  return u8aToHex(stringToU8a(value));
}
const Manager = (configInput, state, onStateUpdate, callbacks) => {
  const events = getDefaultEvents(onStateUpdate, state, callbacks);
  const defaultState = () => {
    return {
      showModal: false,
      loading: false,
      index: 0,
      challenge: void 0,
      solutions: void 0,
      isHuman: false,
      captchaApi: void 0,
      account: void 0
    };
  };
  const clearTimeout = () => {
    window.clearTimeout(state.timeout);
    updateState({ timeout: void 0 });
  };
  const clearSuccessfulChallengeTimeout = () => {
    window.clearTimeout(state.successfullChallengeTimeout);
    updateState({ successfullChallengeTimeout: void 0 });
  };
  const getConfig = () => {
    const config = {
      userAccountAddress: "",
      ...configInput
    };
    if (state.account) {
      config.userAccountAddress = state.account.account.address;
    }
    return ProcaptchaConfigSchema.parse(config);
  };
  const getAccount = () => {
    if (!state.account) {
      throw new ProsopoEnvError("GENERAL.ACCOUNT_NOT_FOUND", {
        context: { error: "Account not loaded" }
      });
    }
    const account = state.account;
    return { account };
  };
  const getDappAccount = () => {
    if (!state.dappAccount) {
      throw new ProsopoEnvError("GENERAL.SITE_KEY_MISSING");
    }
    const dappAccount = state.dappAccount;
    return dappAccount;
  };
  const updateState = buildUpdateState(state, onStateUpdate);
  const resetState = () => {
    clearTimeout();
    clearSuccessfulChallengeTimeout();
    updateState(defaultState());
  };
  const setValidChallengeTimeout = () => {
    const timeMillis = getConfig().captchas.pow.solutionTimeout;
    const successfullChallengeTimeout = setTimeout(() => {
      updateState({ isHuman: false });
      events.onExpired();
    }, timeMillis);
    updateState({ successfullChallengeTimeout });
  };
  const start = async () => {
    await providerRetry(async () => {
      var _a;
      if (state.loading) {
        return;
      }
      if (state.isHuman) {
        return;
      }
      resetState();
      updateState({
        loading: true
      });
      updateState({ attemptCount: state.attemptCount + 1 });
      const config = getConfig();
      const ext = config.web2 ? new ExtensionWeb2() : new ExtensionWeb3();
      const userAccount = config.userAccountAddress || (await ext.getAccount(config)).account.address;
      updateState({
        account: { account: { address: userAccount } }
      });
      updateState({ dappAccount: config.account.address });
      await sleep(100);
      if (!config.web2 && !config.userAccountAddress) {
        throw new ProsopoEnvError("GENERAL.ACCOUNT_NOT_FOUND", {
          context: {
            error: "Account address has not been set for web3 mode"
          }
        });
      }
      const getRandomProviderResponse = await getRandomActiveProvider(getConfig());
      const events2 = getDefaultEvents(onStateUpdate, state, callbacks);
      const providerUrl = getRandomProviderResponse.provider.url;
      const providerApi = new ProviderApi(providerUrl, getDappAccount());
      const challenge = await providerApi.getPowCaptchaChallenge(userAccount, getDappAccount());
      const solution = solvePoW(challenge.challenge, challenge.difficulty);
      const user = await ext.getAccount(getConfig());
      const signer = (_a = user.extension) == null ? void 0 : _a.signer;
      if (!signer || !signer.signRaw) {
        throw new ProsopoEnvError("GENERAL.CANT_FIND_KEYRINGPAIR", {
          context: {
            error: "Signer is not defined, cannot sign message to prove account ownership"
          }
        });
      }
      const userTimestampSignature = await signer.signRaw({
        address: userAccount,
        data: stringToHex(challenge[ApiParams.timestamp].toString()),
        type: "bytes"
      });
      const verifiedSolution = await providerApi.submitPowCaptchaSolution(challenge, getAccount().account.account.address, getDappAccount(), solution, userTimestampSignature.signature.toString(), config.captchas.pow.verifiedTimeout);
      if (verifiedSolution[ApiParams.verified]) {
        updateState({
          isHuman: true,
          loading: false
        });
        events2.onHuman(encodeProcaptchaOutput({
          [ApiParams.providerUrl]: providerUrl,
          [ApiParams.user]: getAccount().account.account.address,
          [ApiParams.dapp]: getDappAccount(),
          [ApiParams.challenge]: challenge.challenge,
          [ApiParams.nonce]: solution,
          [ApiParams.timestamp]: challenge.timestamp,
          [ApiParams.signature]: {
            [ApiParams.provider]: challenge.signature.provider,
            [ApiParams.user]: {
              [ApiParams.timestamp]: userTimestampSignature.signature.toString()
            }
          }
        }));
        setValidChallengeTimeout();
      }
    }, start, resetState, state.attemptCount, 10);
  };
  return {
    start,
    resetState
  };
};
const Procaptcha = (props) => {
  const config = props.config;
  const themeColor = config.theme === "light" ? "light" : "dark";
  const theme = props.config.theme === "light" ? lightTheme : darkTheme;
  const callbacks = props.callbacks || {};
  const [state, _updateState] = useProcaptcha(reactExports.useState, reactExports.useRef);
  const updateState = buildUpdateState(state, _updateState);
  const manager = reactExports.useRef(Manager(config, state, updateState, callbacks));
  const captchaRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    const element = captchaRef.current;
    if (!element)
      return;
    const form = element.closest("form");
    if (!form)
      return;
    const handleSubmit = () => {
      manager.current.resetState();
    };
    form.addEventListener("submit", handleSubmit);
    return () => {
      form.removeEventListener("submit", handleSubmit);
    };
  }, []);
  return jsx("div", { ref: captchaRef, children: jsx("div", { style: {
    maxWidth: WIDGET_MAX_WIDTH,
    maxHeight: "100%",
    overflowX: "auto"
  }, children: jsx(ContainerDiv, { children: jsx(WidthBasedStylesDiv, { children: jsxs("div", { style: WIDGET_DIMENSIONS, "data-cy": "button-human", children: [" ", jsxs("div", { style: {
    padding: WIDGET_PADDING,
    border: WIDGET_BORDER,
    backgroundColor: theme.palette.background.default,
    borderColor: theme.palette.grey[300],
    borderRadius: WIDGET_BORDER_RADIUS,
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    justifyContent: "space-between",
    minHeight: `${WIDGET_INNER_HEIGHT}px`,
    overflow: "hidden"
  }, children: [jsx("div", { style: { display: "inline-flex", flexDirection: "column" }, children: jsx("div", { style: {
    display: "flex",
    justifyContent: "flex-start",
    alignItems: "center",
    flexWrap: "wrap"
  }, children: jsx("div", { style: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
    verticalAlign: "middle"
  }, children: jsx("div", { style: {
    display: "flex"
  }, children: jsx("div", { style: { flex: 1 }, children: state.loading ? jsx(LoadingSpinner, { themeColor, "aria-label": "Loading spinner" }) : jsx(Checkbox, { checked: state.isHuman, onChange: manager.current.start, themeColor, labelText: "I am human", "aria-label": "human checkbox" }) }) }) }) }) }), jsx("div", { style: { display: "inline-flex", flexDirection: "column" }, children: jsx("a", { href: WIDGET_URL, target: "_blank", "aria-label": WIDGET_URL_TEXT, rel: "noreferrer", children: jsx("div", { style: { flex: 1 }, children: jsx(Logo, { themeColor, "aria-label": "Prosopo logo" }) }) }) })] })] }) }) }) }) });
};
export {
  Procaptcha as default
};
