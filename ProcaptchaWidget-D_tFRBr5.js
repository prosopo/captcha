import { A as ApiParams, e as encodeProcaptchaOutput, a as at, P as ProcaptchaConfigSchema, r as reactExports, j as jsx, W as WIDGET_MAX_WIDTH, C as ContainerDiv, c as WidthBasedStylesDiv, b as jsxs, f as WIDGET_DIMENSIONS, g as WIDGET_PADDING, h as WIDGET_BORDER, i as WIDGET_BORDER_RADIUS, k as WIDGET_INNER_HEIGHT, L as LoadingSpinner, m as WIDGET_URL, n as WIDGET_URL_TEXT, o as Logo, l as lightTheme, d as darkTheme } from "./index-D92Zqeu_.js";
import { v as sha256, k as getDefaultEvents, E as ExtensionWeb2, p as ExtensionWeb3, n as sleep, f as ProsopoEnvError, o as ProviderApi, s as stringToHex, q as loadBalancer, l as buildUpdateState, t as useProcaptcha, C as Checkbox } from "./utils-C0jPHaGp.js";
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
  const getNetwork = (config) => {
    const network = config.networks[config.defaultNetwork];
    if (!network) {
      throw new ProsopoEnvError("DEVELOPER.NETWORK_NOT_FOUND", {
        context: {
          error: `No network found for environment ${config.defaultEnvironment}`
        }
      });
    }
    return network;
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
        context: { error: "Account address has not been set for web3 mode" }
      });
    }
    const getRandomProviderResponse = getRandomActiveProvider();
    const events2 = getDefaultEvents(onStateUpdate, state, callbacks);
    const providerUrl = getRandomProviderResponse.provider.url;
    const providerApi = new ProviderApi(getNetwork(getConfig()), providerUrl, getDappAccount());
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
        [ApiParams.blockNumber]: getRandomProviderResponse.blockNumber,
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
  };
  const getRandomActiveProvider = () => {
    const randomIntBetween = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);
    const environment = getConfig().defaultEnvironment;
    const PROVIDERS = loadBalancer(environment);
    const randomProvderObj = at(PROVIDERS, randomIntBetween(0, PROVIDERS.length - 1));
    return {
      providerAccount: randomProvderObj.address,
      provider: {
        url: randomProvderObj.url,
        datasetId: randomProvderObj.datasetId,
        datasetIdContent: randomProvderObj.datasetIdContent
      },
      blockNumber: 0
    };
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