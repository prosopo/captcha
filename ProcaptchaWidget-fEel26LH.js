import { z, a as at, A as ApiParams, e as encodeProcaptchaOutput, P as ProcaptchaConfigSchema, r as reactExports, l as lightTheme, d as darkTheme, j as jsx, b as jsxs, R as React, i as instance, W as WIDGET_MAX_WIDTH, C as ContainerDiv, c as WidthBasedStylesDiv, f as WIDGET_DIMENSIONS, g as WIDGET_PADDING, h as WIDGET_BORDER, k as WIDGET_BORDER_RADIUS, m as WIDGET_INNER_HEIGHT, L as LoadingSpinner, n as WIDGET_URL, o as WIDGET_URL_TEXT, p as Logo } from "./index-Dy2zRU-i.js";
import { u as u8aToString, h as hexToU8a, a as hexHashArray, P as ProsopoError, b as ProsopoEnvError, c as ProsopoDatasetError, s as stringToHex, g as getDefaultEvents, p as providerRetry, d as buildUpdateState, e as cryptoWaitReady, f as sleep, i as getRandomActiveProvider, r as randomAsHex, j as ProviderApi, E as ExtensionWeb2, k as ExtensionWeb3, l as useTranslation, m as useProcaptcha, C as Checkbox } from "./utils-y5cXAMsc.js";
function hexToString(_value) {
  return u8aToString(hexToU8a(_value));
}
const isArray = (value) => {
  return Array.isArray(value) && value !== null;
};
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
  }
  if (bitLength > 0) {
    const length = Math.ceil(bitLength / 8);
    if (value.length > length) {
      return `${hex(value.subarray(0, length / 2), empty)}…${hex(value.subarray(value.length - length / 2), "")}`;
    }
  }
  return hex(value, empty);
}
const hashToHex = (hash) => {
  if (isArray(hash)) {
    return u8aToHex(new Uint8Array(hash));
  }
  return hash.toString();
};
const ProsopoLocalStorageSchema = z.object({
  account: z.string().optional(),
  blockNumber: z.number().optional(),
  providerUrl: z.string().optional()
});
function computeCaptchaSolutionHash(captcha) {
  return hexHashArray([
    captcha.captchaId,
    captcha.captchaContentId,
    [...captcha.solution].sort(),
    captcha.salt
  ]);
}
class MerkleNode {
  constructor(hash) {
    this.hash = hash;
    this.parent = null;
  }
}
class CaptchaMerkleTree {
  constructor() {
    this.leaves = [];
    this.layers = [];
  }
  getRoot() {
    if (this.root === void 0) {
      throw new ProsopoError("DATASET.MERKLE_ERROR", {
        context: {
          error: "root undefined",
          failedFuncName: this.getRoot.name
        }
      });
    }
    return this.root;
  }
  build(leaves) {
    if (this.layers.length) {
      this.layers = [];
    }
    const layerZero = [];
    for (const leaf of leaves) {
      const node = new MerkleNode(leaf);
      this.leaves.push(node);
      layerZero.push(node.hash);
    }
    this.layers.push(layerZero);
    this.root = this.buildMerkleTree(this.leaves)[0];
  }
  buildMerkleTree(leaves) {
    const numLeaves = leaves.length;
    if (numLeaves === 1) {
      return leaves;
    }
    const parents = [];
    let leafIndex = 0;
    const newLayer = [];
    while (leafIndex < numLeaves) {
      const leftChild = leaves[leafIndex];
      if (leftChild === void 0) {
        throw new ProsopoError("DEVELOPER.GENERAL", {
          context: { error: "leftChild undefined" }
        });
      }
      const rightChild = leafIndex + 1 < numLeaves ? at(leaves, leafIndex + 1) : leftChild;
      const parentNode = this.createParent(leftChild, rightChild);
      newLayer.push(parentNode.hash);
      parents.push(parentNode);
      leafIndex += 2;
    }
    this.layers.push(newLayer);
    return this.buildMerkleTree(parents);
  }
  createParent(leftChild, rightChild) {
    const parent = new MerkleNode(hexHashArray([leftChild.hash, rightChild.hash]));
    leftChild.parent = parent.hash;
    rightChild.parent = parent.hash;
    return parent;
  }
  proof(leafHash) {
    const proofTree = [];
    let layerNum = 0;
    while (layerNum < this.layers.length - 1) {
      const layer = this.layers[layerNum];
      if (layer === void 0) {
        throw new ProsopoError("DATASET.MERKLE_ERROR", {
          context: {
            error: "layer undefined",
            failedFuncName: this.proof.name,
            layerNum
          }
        });
      }
      const leafIndex = layer.indexOf(leafHash);
      let partnerIndex = leafIndex % 2 && leafIndex > 0 ? leafIndex - 1 : leafIndex + 1;
      if (partnerIndex > layer.length - 1) {
        partnerIndex = leafIndex;
      }
      const pair = [leafHash];
      const partner = at(layer, partnerIndex);
      if (partnerIndex > leafIndex) {
        pair.push(partner);
      } else {
        pair.unshift(partner);
      }
      proofTree.push([at(pair, 0), at(pair, 1)]);
      layerNum += 1;
      leafHash = hexHashArray(pair);
    }
    const last = at(this.layers, this.layers.length - 1);
    return [...proofTree, [at(last, 0)]];
  }
}
class ProsopoCaptchaApi {
  constructor(userAccount, provider, providerApi, web2, dappAccount) {
    this.userAccount = userAccount;
    this.provider = provider;
    this.providerApi = providerApi;
    this._web2 = web2;
    this.dappAccount = dappAccount;
  }
  get web2() {
    return this._web2;
  }
  async getCaptchaChallenge() {
    try {
      const captchaChallenge = await this.providerApi.getCaptchaChallenge(this.userAccount, this.provider);
      if (captchaChallenge[ApiParams.error]) {
        return captchaChallenge;
      }
      for (const captcha of captchaChallenge.captchas) {
        for (const item of captcha.items) {
          if (item.data) {
            item.data = item.data.replace(/^http(s)*:\/\//, "//");
          }
        }
      }
      return captchaChallenge;
    } catch (error) {
      throw new ProsopoEnvError("CAPTCHA.INVALID_CAPTCHA_CHALLENGE", {
        context: { error }
      });
    }
  }
  async submitCaptchaSolution(userRequestHashSignature, requestHash, solutions, timestamp, providerRequestHashSignature) {
    const tree = new CaptchaMerkleTree();
    const captchasHashed = solutions.map((captcha) => computeCaptchaSolutionHash(captcha));
    tree.build(captchasHashed);
    if (!tree.root) {
      throw new ProsopoDatasetError("CAPTCHA.INVALID_CAPTCHA_CHALLENGE", {
        context: { error: "Merkle tree root is undefined" }
      });
    }
    const commitmentId = tree.root.hash;
    const tx = void 0;
    let result;
    try {
      result = await this.providerApi.submitCaptchaSolution(solutions, requestHash, this.userAccount, timestamp, providerRequestHashSignature, userRequestHashSignature);
    } catch (error) {
      throw new ProsopoDatasetError("CAPTCHA.INVALID_CAPTCHA_CHALLENGE", {
        context: { error }
      });
    }
    return [result, commitmentId, tx];
  }
}
const PROCAPTCHA_STORAGE_KEY = "@prosopo/procaptcha";
function getProcaptchaStorage() {
  return ProsopoLocalStorageSchema.parse(JSON.parse(hexToString(localStorage.getItem(PROCAPTCHA_STORAGE_KEY) || "0x7b7d")));
}
function setProcaptchaStorage(storage2) {
  localStorage.setItem(PROCAPTCHA_STORAGE_KEY, stringToHex(JSON.stringify(ProsopoLocalStorageSchema.parse(storage2))));
}
function setAccount(account) {
  setProcaptchaStorage({ ...getProcaptchaStorage(), account });
}
function getAccount() {
  return getProcaptchaStorage().account || null;
}
const storage = {
  setAccount,
  getAccount,
  setProcaptchaStorage,
  getProcaptchaStorage
};
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
function Manager(configOptional, state, onStateUpdate, callbacks) {
  const events = getDefaultEvents(onStateUpdate, state, callbacks);
  const updateState = buildUpdateState(state, onStateUpdate);
  const getConfig = () => {
    const config = {
      userAccountAddress: "",
      ...configOptional
    };
    if (state.account) {
      config.userAccountAddress = state.account.account.address;
    }
    return ProcaptchaConfigSchema.parse(config);
  };
  const start = async () => {
    events.onOpen();
    await providerRetry(async () => {
      if (state.loading) {
        return;
      }
      if (state.isHuman) {
        return;
      }
      await cryptoWaitReady();
      resetState();
      updateState({ loading: true });
      updateState({
        attemptCount: state.attemptCount ? state.attemptCount + 1 : 1
      });
      const config = getConfig();
      updateState({ dappAccount: config.account.address });
      await sleep(100);
      const account = await loadAccount();
      const getRandomProviderResponse = await getRandomActiveProvider(getConfig());
      const providerUrl = getRandomProviderResponse.provider.url;
      const providerApi = await loadProviderApi(providerUrl);
      const captchaApi = new ProsopoCaptchaApi(account.account.address, getRandomProviderResponse, providerApi, config.web2, config.account.address || "");
      updateState({ captchaApi });
      const challenge = await captchaApi.getCaptchaChallenge();
      if (challenge.error) {
        updateState({
          loading: false,
          error: challenge.error
        });
      } else {
        if (challenge.captchas.length <= 0) {
          throw new ProsopoDatasetError("DEVELOPER.PROVIDER_NO_CAPTCHA");
        }
        const timeMillis = challenge.captchas.map((captcha) => captcha.timeLimitMs || config.captchas.image.challengeTimeout).reduce((a, b) => a + b);
        const timeout = setTimeout(() => {
          events.onChallengeExpired();
          updateState({ isHuman: false, showModal: false, loading: false });
        }, timeMillis);
        updateState({
          index: 0,
          solutions: challenge.captchas.map(() => []),
          challenge,
          showModal: true,
          timeout
        });
      }
    }, start, resetState, state.attemptCount, 10);
  };
  const submit = async () => {
    await providerRetry(async () => {
      clearTimeout();
      if (!state.challenge) {
        throw new ProsopoError("CAPTCHA.NO_CAPTCHA", {
          context: { error: "Cannot submit, no Captcha found in state" }
        });
      }
      updateState({ showModal: false });
      const challenge = state.challenge;
      const salt = randomAsHex();
      const captchaSolution = state.challenge.captchas.map((captcha, index) => {
        const solution = at(state.solutions, index);
        return {
          captchaId: captcha.captchaId,
          captchaContentId: captcha.captchaContentId,
          salt,
          solution
        };
      });
      const account = getAccount2();
      const signer = getExtension(account).signer;
      const first = at(challenge.captchas, 0);
      if (!first.datasetId) {
        throw new ProsopoDatasetError("CAPTCHA.INVALID_CAPTCHA_ID", {
          context: { error: "No datasetId set for challenge" }
        });
      }
      const captchaApi = state.captchaApi;
      if (!captchaApi) {
        throw new ProsopoError("CAPTCHA.INVALID_TOKEN", {
          context: { error: "No Captcha API found in state" }
        });
      }
      if (!signer || !signer.signRaw) {
        throw new ProsopoEnvError("GENERAL.CANT_FIND_KEYRINGPAIR", {
          context: {
            error: "Signer is not defined, cannot sign message to prove account ownership"
          }
        });
      }
      const userRequestHashSignature = await signer.signRaw({
        address: account.account.address,
        data: stringToHex(challenge.requestHash),
        type: "bytes"
      });
      const submission = await captchaApi.submitCaptchaSolution(userRequestHashSignature.signature, challenge.requestHash, captchaSolution, challenge.timestamp, challenge.signature.provider.requestHash);
      const isHuman = submission[0].verified;
      if (!isHuman) {
        events.onFailed();
      }
      updateState({
        submission,
        isHuman,
        loading: false
      });
      if (state.isHuman) {
        const providerUrl = captchaApi.provider.provider.url;
        storage.setProcaptchaStorage({
          ...storage.getProcaptchaStorage(),
          providerUrl
        });
        events.onHuman(encodeProcaptchaOutput({
          [ApiParams.providerUrl]: providerUrl,
          [ApiParams.user]: account.account.address,
          [ApiParams.dapp]: getDappAccount(),
          [ApiParams.commitmentId]: hashToHex(submission[1]),
          [ApiParams.timestamp]: challenge.timestamp,
          [ApiParams.signature]: {
            [ApiParams.provider]: {
              [ApiParams.requestHash]: challenge.signature.provider.requestHash
            },
            [ApiParams.user]: {
              [ApiParams.requestHash]: userRequestHashSignature.signature
            }
          }
        }));
        setValidChallengeTimeout();
      }
    }, start, resetState, state.attemptCount, 10);
  };
  const cancel = async () => {
    clearTimeout();
    resetState();
    events.onClose();
  };
  const select = (hash) => {
    if (!state.challenge) {
      throw new ProsopoError("CAPTCHA.NO_CAPTCHA", {
        context: { error: "Cannot select, no Captcha found in state" }
      });
    }
    if (state.index >= state.challenge.captchas.length || state.index < 0) {
      throw new ProsopoError("CAPTCHA.NO_CAPTCHA", {
        context: {
          error: "Cannot select, index is out of range for this Captcha"
        }
      });
    }
    const index = state.index;
    const solutions = state.solutions;
    const solution = at(solutions, index);
    if (solution.includes(hash)) {
      solution.splice(solution.indexOf(hash), 1);
    } else {
      solution.push(hash);
    }
    updateState({ solutions });
  };
  const nextRound = () => {
    if (!state.challenge) {
      throw new ProsopoError("CAPTCHA.NO_CAPTCHA", {
        context: { error: "Cannot select, no Captcha found in state" }
      });
    }
    if (state.index + 1 >= state.challenge.captchas.length) {
      throw new ProsopoError("CAPTCHA.NO_CAPTCHA", {
        context: {
          error: "Cannot select, index is out of range for this Captcha"
        }
      });
    }
    updateState({ index: state.index + 1 });
  };
  const loadProviderApi = async (providerUrl) => {
    const config = getConfig();
    if (!config.account.address) {
      throw new ProsopoEnvError("GENERAL.SITE_KEY_MISSING");
    }
    return new ProviderApi(providerUrl, config.account.address);
  };
  const clearTimeout = () => {
    window.clearTimeout(state.timeout);
    updateState({ timeout: void 0 });
  };
  const setValidChallengeTimeout = () => {
    const timeMillis = configOptional.captchas.image.solutionTimeout;
    const successfullChallengeTimeout = setTimeout(() => {
      updateState({ isHuman: false });
      events.onExpired();
    }, timeMillis);
    updateState({ successfullChallengeTimeout });
  };
  const resetState = () => {
    clearTimeout();
    updateState(defaultState());
  };
  const loadAccount = async () => {
    const config = getConfig();
    if (!config.web2 && !config.userAccountAddress) {
      throw new ProsopoEnvError("GENERAL.ACCOUNT_NOT_FOUND", {
        context: { error: "Account address has not been set for web3 mode" }
      });
    }
    const ext = config.web2 ? new ExtensionWeb2() : new ExtensionWeb3();
    const account = await ext.getAccount(config);
    storage.setAccount(account.account.address);
    updateState({ account });
    return getAccount2();
  };
  const getAccount2 = () => {
    if (!state.account) {
      throw new ProsopoEnvError("GENERAL.ACCOUNT_NOT_FOUND", {
        context: { error: "Account not loaded" }
      });
    }
    const account = state.account;
    return account;
  };
  const getDappAccount = () => {
    if (!state.dappAccount) {
      throw new ProsopoEnvError("GENERAL.SITE_KEY_MISSING");
    }
    const dappAccount = state.dappAccount;
    return dappAccount;
  };
  const getExtension = (possiblyAccount) => {
    const account = possiblyAccount || getAccount2();
    if (!account.extension) {
      throw new ProsopoEnvError("ACCOUNT.NO_POLKADOT_EXTENSION", {
        context: { error: "Extension not loaded" }
      });
    }
    return account.extension;
  };
  return {
    start,
    cancel,
    submit,
    select,
    nextRound
  };
}
const getHash = (item) => {
  if (!item.hash) {
    throw new ProsopoDatasetError("CAPTCHA.MISSING_ITEM_HASH", {
      context: { item }
    });
  }
  return item.hash;
};
const CaptchaWidget = ({ challenge, solution, onClick, themeColor }) => {
  const items = challenge.items;
  const theme = reactExports.useMemo(() => themeColor === "light" ? lightTheme : darkTheme, [themeColor]);
  const isTouchDevice = "ontouchstart" in window;
  const fullSpacing = `${theme.spacing.unit}px`;
  const halfSpacing = `${theme.spacing.half}px`;
  const paddingForImageColumns = {
    0: {
      paddingLeft: 0,
      paddingRight: halfSpacing,
      paddingTop: halfSpacing,
      paddingBottom: halfSpacing
    },
    1: {
      paddingLeft: halfSpacing,
      paddingRight: halfSpacing,
      paddingTop: halfSpacing,
      paddingBottom: halfSpacing
    },
    2: {
      paddingLeft: halfSpacing,
      paddingRight: 0,
      paddingTop: halfSpacing,
      paddingBottom: halfSpacing
    }
  };
  const paddingForImageRows = {
    0: { paddingTop: fullSpacing },
    2: { paddingBottom: fullSpacing }
  };
  return jsx("div", { style: {
    paddingRight: 0.5,
    paddingBottom: 0.5,
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap"
  }, children: items.map((item, index) => {
    const hash = getHash(item);
    const imageStyle = {
      ...paddingForImageColumns[index % 3],
      ...paddingForImageRows[Math.floor(index / 3)],
      flexGrow: 1,
      flexBasis: "33.3333%",
      boxSizing: "border-box"
    };
    return jsx("div", { style: imageStyle, children: jsxs("div", { style: {
      cursor: "pointer",
      height: "100%",
      width: "100%",
      border: 1,
      borderStyle: "solid",
      borderColor: theme.palette.grey[300]
    }, onClick: isTouchDevice ? void 0 : () => onClick(hash), onTouchStart: isTouchDevice ? () => onClick(hash) : void 0, children: [jsx("div", { children: jsx("img", { style: {
      width: "100%",
      backgroundColor: theme.palette.grey[300],
      opacity: solution.includes(hash) && isTouchDevice ? "50%" : "100%",
      display: "block",
      objectFit: "contain",
      aspectRatio: "1/1",
      height: "auto"
    }, src: item.data, alt: `Captcha image ${index + 1}` }) }), jsx("div", { style: {
      position: "relative",
      width: "100%",
      height: "100%",
      top: "-100%",
      visibility: solution.includes(hash) ? "visible" : "hidden",
      transition: "opacity 225ms cubic-bezier(0.4, 0, 0.2, 1) 0ms",
      opacity: 1
    }, children: jsx("div", { style: {
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
    }, children: jsx("svg", { style: {
      backgroundColor: "transparent",
      display: "block",
      width: "35%",
      height: "35%",
      transition: "fill 200ms cubic-bezier(0.4, 0, 0.2, 1) 0ms",
      userSelect: "none",
      fill: "currentcolor"
    }, focusable: "false", color: "#fff", "aria-hidden": "true", viewBox: "0 0 24 24", "data-testid": "CheckIcon", "aria-label": "Check icon", children: jsx("path", { d: "M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" }) }) }) })] }) }, item.hash);
  }) });
};
function renameKeysForDataAttr(data = {}) {
  return Object.keys(data).reduce((prev, curr) => ({ ...prev, [`data-${curr}`]: data[curr] }), {});
}
function addDataAttr({ general, dev }) {
  return {
    ...renameKeysForDataAttr(general),
    ...renameKeysForDataAttr(dev)
  };
}
const buttonStyleBase = {
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
};
const Button = ({ themeColor, buttonType, text, onClick }) => {
  const theme = reactExports.useMemo(() => themeColor === "light" ? lightTheme : darkTheme, [themeColor]);
  const [hover, setHover] = reactExports.useState(false);
  const buttonStyle = reactExports.useMemo(() => {
    const baseStyle = {
      ...buttonStyleBase,
      color: hover ? theme.palette.primary.contrastText : theme.palette.background.contrastText
    };
    if (buttonType === "cancel") {
      return {
        ...baseStyle,
        backgroundColor: hover ? theme.palette.grey[600] : "transparent"
      };
    }
    return {
      ...baseStyle,
      backgroundColor: hover ? theme.palette.primary.main : theme.palette.background.default
    };
  }, [buttonType, hover, theme]);
  return jsx("button", { ...addDataAttr({ dev: { cy: `button-${buttonType}` } }), onMouseEnter: () => setHover(true), onMouseLeave: () => setHover(false), style: buttonStyle, onClick: (e) => {
    e.preventDefault();
    onClick();
  }, "aria-label": text, children: text });
};
const CaptchaComponent = ({ challenge, index, solutions, onSubmit, onCancel, onClick, onNext, themeColor }) => {
  const { t } = useTranslation();
  const captcha = challenge.captchas ? at(challenge.captchas, index) : null;
  const solution = solutions ? at(solutions, index) : [];
  const theme = reactExports.useMemo(() => themeColor === "light" ? lightTheme : darkTheme, [themeColor]);
  return jsx(reactExports.Suspense, { fallback: jsx("div", { children: "Loading..." }), children: jsx("div", { style: {
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
    padding: `${theme.spacing.unit}px`,
    backgroundColor: theme.palette.background.default
  }, children: jsxs("div", { style: {
    backgroundColor: theme.palette.background.default,
    display: "flex",
    flexDirection: "column",
    minWidth: "300px"
  }, children: [jsx("div", { style: {
    display: "flex",
    alignItems: "center",
    width: "100%"
  }, children: jsx("div", { style: {
    backgroundColor: theme.palette.primary.main,
    width: "100%"
  }, children: jsxs("div", { style: {
    paddingLeft: `${theme.spacing.half}px`,
    paddingRight: `${theme.spacing.half}px`
  }, children: [jsxs("p", { style: {
    color: "#ffffff",
    fontWeight: 700,
    lineHeight: 1.5
  }, children: [t("WIDGET.SELECT_ALL"), ":", " ", jsx("span", { children: `${t(at(challenge.captchas, index).target)} ` })] }), jsx("p", { style: {
    color: "#ffffff",
    fontWeight: 500,
    lineHeight: 0.8,
    fontSize: "0.8rem"
  }, children: t("WIDGET.IF_NONE_CLICK_NEXT") })] }) }) }), jsx("div", { ...addDataAttr({ dev: { cy: `captcha-${index}` } }), children: captcha && jsx(CaptchaWidget, { challenge: captcha, solution, onClick, themeColor }) }), jsx("div", { style: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%"
  }, ...addDataAttr({ dev: { cy: "dots-captcha" } }) }), jsx("div", { style: {
    padding: `0 ${theme.spacing}px`,
    display: "flex",
    width: "100%"
  } }), jsxs("div", { style: {
    padding: `0 ${theme.spacing}px`,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    lineHeight: 1.75
  }, children: [jsx(Button, { themeColor, buttonType: "cancel", onClick: onCancel, text: t("WIDGET.CANCEL"), "aria-label": t("WIDGET.CANCEL") }), jsx(Button, { themeColor, buttonType: "next", text: index < challenge.captchas.length - 1 ? t("WIDGET.NEXT") : t("WIDGET.SUBMIT"), onClick: index < challenge.captchas.length - 1 ? onNext : onSubmit, "aria-label": index < challenge.captchas.length - 1 ? t("WIDGET.NEXT") : t("WIDGET.SUBMIT"), "data-cy": "button-next" })] })] }) }) });
};
const ModalComponent = React.memo((props, nextProps) => {
  const { show, children } = props;
  const display = show ? "block" : "none";
  const ModalOuterDivCss = {
    position: "fixed",
    zIndex: 2147483646,
    inset: 0,
    display
  };
  const ModalBackgroundCSS = {
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
  };
  const ModalInnerDivCSS = {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "400px",
    backgroundColor: "transparent",
    border: "none",
    boxShadow: "rgba(0, 0, 0, 0.2) 0px 11px 15px -7px, rgba(0, 0, 0, 0.14) 0px 24px 38px 3px, rgba(0, 0, 0, 0.12) 0px 9px 46px 8px,"
  };
  return jsxs("div", { className: "prosopo-modalOuter", style: ModalOuterDivCss, children: [jsx("div", { className: "prosopo-modalBackground", style: ModalBackgroundCSS }), jsx("div", { className: "prosopo-modalInner", style: ModalInnerDivCSS, children })] });
});
const ProcaptchaWidget = (props) => {
  const { t } = useTranslation();
  const config = ProcaptchaConfigSchema.parse(props.config);
  const callbacks = props.callbacks || {};
  const [state, updateState] = useProcaptcha(reactExports.useState, reactExports.useRef);
  const manager = Manager(config, state, updateState, callbacks);
  const themeColor = props.config.theme === "light" ? "light" : "dark";
  const theme = props.config.theme === "light" ? lightTheme : darkTheme;
  reactExports.useEffect(() => {
    if (config.language) {
      instance.changeLanguage(config.language);
    }
  }, [config.language]);
  return jsx("div", { children: jsxs("div", { style: {
    maxWidth: WIDGET_MAX_WIDTH,
    maxHeight: "100%",
    overflowX: "auto"
  }, children: [jsx(ModalComponent, { show: state.showModal, children: state.challenge ? jsx(CaptchaComponent, { challenge: state.challenge, index: state.index, solutions: state.solutions, onSubmit: manager.submit, onCancel: manager.cancel, onClick: manager.select, onNext: manager.nextRound, themeColor: config.theme ?? "light" }) : jsx("div", { children: "No challenge set." }) }), jsx(ContainerDiv, { children: jsx(WidthBasedStylesDiv, { children: jsxs("div", { style: WIDGET_DIMENSIONS, "data-cy": "button-human", children: [" ", jsxs("div", { style: {
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
    alignItems: "center",
    flex: 1
  }, children: jsxs("div", { style: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
    verticalAlign: "middle"
  }, children: [jsx("div", { style: {
    display: !state.loading && !state.error ? "flex" : "none"
  }, children: jsx(Checkbox, { themeColor, onChange: manager.start, checked: state.isHuman, labelText: t("WIDGET.I_AM_HUMAN"), error: state.error, "aria-label": "human checkbox" }) }), jsx("div", { style: {
    display: state.loading ? "flex" : "none"
  }, children: jsx("div", { style: { display: "inline-flex" }, children: jsx(LoadingSpinner, { themeColor, "aria-label": "Loading spinner" }) }) })] }) }) }), jsx("div", { style: { display: "inline-flex", flexDirection: "column" }, children: jsx("a", { href: WIDGET_URL, target: "_blank", "aria-label": WIDGET_URL_TEXT, rel: "noreferrer", children: jsx("div", { style: { flex: 1 }, children: jsx(Logo, { themeColor, "aria-label": "Prosopo logo" }) }) }) })] })] }) }) })] }) });
};
export {
  ProcaptchaWidget as default
};
