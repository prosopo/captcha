import { a as at, P as ProcaptchaConfigSchema, c as css, r as reactExports, l as lightTheme, d as darkTheme, j as jsx, b as jsxs, L as LoadingSpinner } from "./index-44028d25.js";
import { s as sha256, P as ProsopoError, a as ProsopoEnvError, W as WsProvider, S as Signer, u as u8aToHex, h as hexHash, b as stringToU8a, e as entropyToMnemonic, A as ApiPromise, K as Keyring, c as encodeAddress, d as decodeAddress, l as load, f as hashComponents, w as wrapQuery, t as trimProviderUrl, g as ProviderApi, i as ProsopoCaptchaContract, C as ContractAbi } from "./interface-f5c868f9.js";
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
function x64Add(m, n) {
  m = [at(m, 0) >>> 16, at(m, 0) & 65535, at(m, 1) >>> 16, at(m, 1) & 65535];
  n = [at(n, 0) >>> 16, at(n, 0) & 65535, at(n, 1) >>> 16, at(n, 1) & 65535];
  const o = [0, 0, 0, 0];
  o[3] += at(m, 3) + at(n, 3);
  o[2] += at(o, 3) >>> 16;
  o[3] &= 65535;
  o[2] += at(m, 2) + at(n, 2);
  o[1] += at(o, 2) >>> 16;
  o[2] &= 65535;
  o[1] += at(m, 1) + at(n, 1);
  o[0] += at(o, 1) >>> 16;
  o[1] &= 65535;
  o[0] += at(m, 0) + at(n, 0);
  o[0] &= 65535;
  return [at(o, 0) << 16 | at(o, 1), at(o, 2) << 16 | at(o, 3)];
}
function x64Multiply(m, n) {
  m = [at(m, 0) >>> 16, at(m, 0) & 65535, at(m, 1) >>> 16, at(m, 1) & 65535];
  n = [at(n, 0) >>> 16, at(n, 0) & 65535, at(n, 1) >>> 16, at(n, 1) & 65535];
  const o = [0, 0, 0, 0];
  o[3] += at(m, 3) * at(n, 3);
  o[2] += at(o, 3) >>> 16;
  o[3] &= 65535;
  o[2] += at(m, 2) * at(n, 3);
  o[1] += at(o, 2) >>> 16;
  o[2] &= 65535;
  o[2] += at(m, 3) * at(n, 2);
  o[1] += at(o, 2) >>> 16;
  o[2] &= 65535;
  o[1] += at(m, 1) * at(n, 3);
  o[0] += at(o, 1) >>> 16;
  o[1] &= 65535;
  o[1] += at(m, 2) * at(n, 2);
  o[0] += at(o, 1) >>> 16;
  o[1] &= 65535;
  o[1] += at(m, 3) * at(n, 1);
  o[0] += at(o, 1) >>> 16;
  o[1] &= 65535;
  o[0] += at(m, 0) * at(n, 3) + at(m, 1) * at(n, 2) + at(m, 2) * at(n, 1) + at(m, 3) * at(n, 0);
  o[0] &= 65535;
  return [at(o, 0) << 16 | at(o, 1), at(o, 2) << 16 | at(o, 3)];
}
function x64Rotl(m, n) {
  n %= 64;
  if (n === 32) {
    return [at(m, 1), at(m, 0)];
  } else if (n < 32) {
    return [at(m, 0) << n | at(m, 1) >>> 32 - n, at(m, 1) << n | at(m, 0) >>> 32 - n];
  } else {
    n -= 32;
    return [at(m, 1) << n | at(m, 0) >>> 32 - n, at(m, 0) << n | at(m, 1) >>> 32 - n];
  }
}
function x64LeftShift(m, n) {
  n %= 64;
  if (n === 0) {
    return m;
  } else if (n < 32) {
    return [at(m, 0) << n | at(m, 1) >>> 32 - n, at(m, 1) << n];
  } else {
    return [at(m, 1) << n - 32, 0];
  }
}
function x64Xor(m, n) {
  return [at(m, 0) ^ at(n, 0), at(m, 1) ^ at(n, 1)];
}
function x64Fmix(h) {
  h = x64Xor(h, [0, at(h, 0) >>> 1]);
  h = x64Multiply(h, [4283543511, 3981806797]);
  h = x64Xor(h, [0, at(h, 0) >>> 1]);
  h = x64Multiply(h, [3301882366, 444984403]);
  h = x64Xor(h, [0, at(h, 0) >>> 1]);
  return h;
}
function x64hash128(key, seed) {
  key = key || "";
  seed = seed || 0;
  const remainder = key.length % 16;
  const bytes = key.length - remainder;
  let h1 = [0, seed];
  let h2 = [0, seed];
  let k1 = [0, 0];
  let k2 = [0, 0];
  const c1 = [2277735313, 289559509];
  const c2 = [1291169091, 658871167];
  let i = 0;
  for (i = 0; i < bytes; i = i + 16) {
    k1 = [
      key.charCodeAt(i + 4) & 255 | (key.charCodeAt(i + 5) & 255) << 8 | (key.charCodeAt(i + 6) & 255) << 16 | (key.charCodeAt(i + 7) & 255) << 24,
      key.charCodeAt(i) & 255 | (key.charCodeAt(i + 1) & 255) << 8 | (key.charCodeAt(i + 2) & 255) << 16 | (key.charCodeAt(i + 3) & 255) << 24
    ];
    k2 = [
      key.charCodeAt(i + 12) & 255 | (key.charCodeAt(i + 13) & 255) << 8 | (key.charCodeAt(i + 14) & 255) << 16 | (key.charCodeAt(i + 15) & 255) << 24,
      key.charCodeAt(i + 8) & 255 | (key.charCodeAt(i + 9) & 255) << 8 | (key.charCodeAt(i + 10) & 255) << 16 | (key.charCodeAt(i + 11) & 255) << 24
    ];
    k1 = x64Multiply(k1, c1);
    k1 = x64Rotl(k1, 31);
    k1 = x64Multiply(k1, c2);
    h1 = x64Xor(h1, k1);
    h1 = x64Rotl(h1, 27);
    h1 = x64Add(h1, h2);
    h1 = x64Add(x64Multiply(h1, [0, 5]), [0, 1390208809]);
    k2 = x64Multiply(k2, c2);
    k2 = x64Rotl(k2, 33);
    k2 = x64Multiply(k2, c1);
    h2 = x64Xor(h2, k2);
    h2 = x64Rotl(h2, 31);
    h2 = x64Add(h2, h1);
    h2 = x64Add(x64Multiply(h2, [0, 5]), [0, 944331445]);
  }
  k1 = [0, 0];
  k2 = [0, 0];
  switch (remainder) {
    case 15:
      k2 = x64Xor(k2, x64LeftShift([0, key.charCodeAt(i + 14)], 48));
      break;
    case 14:
      k2 = x64Xor(k2, x64LeftShift([0, key.charCodeAt(i + 13)], 40));
      break;
    case 13:
      k2 = x64Xor(k2, x64LeftShift([0, key.charCodeAt(i + 12)], 32));
      break;
    case 12:
      k2 = x64Xor(k2, x64LeftShift([0, key.charCodeAt(i + 11)], 24));
      break;
    case 11:
      k2 = x64Xor(k2, x64LeftShift([0, key.charCodeAt(i + 10)], 16));
      break;
    case 10:
      k2 = x64Xor(k2, x64LeftShift([0, key.charCodeAt(i + 9)], 8));
      break;
    case 9:
      k2 = x64Xor(k2, [0, key.charCodeAt(i + 8)]);
      k2 = x64Multiply(k2, c2);
      k2 = x64Rotl(k2, 33);
      k2 = x64Multiply(k2, c1);
      h2 = x64Xor(h2, k2);
      break;
    case 8:
      k1 = x64Xor(k1, x64LeftShift([0, key.charCodeAt(i + 7)], 56));
      break;
    case 7:
      k1 = x64Xor(k1, x64LeftShift([0, key.charCodeAt(i + 6)], 48));
      break;
    case 6:
      k1 = x64Xor(k1, x64LeftShift([0, key.charCodeAt(i + 5)], 40));
      break;
    case 5:
      k1 = x64Xor(k1, x64LeftShift([0, key.charCodeAt(i + 4)], 32));
      break;
    case 4:
      k1 = x64Xor(k1, x64LeftShift([0, key.charCodeAt(i + 3)], 24));
      break;
    case 3:
      k1 = x64Xor(k1, x64LeftShift([0, key.charCodeAt(i + 2)], 16));
      break;
    case 2:
      k1 = x64Xor(k1, x64LeftShift([0, key.charCodeAt(i + 1)], 8));
      break;
    case 1:
      k1 = x64Xor(k1, [0, key.charCodeAt(i)]);
      k1 = x64Multiply(k1, c1);
      k1 = x64Rotl(k1, 31);
      k1 = x64Multiply(k1, c2);
      h1 = x64Xor(h1, k1);
  }
  h1 = x64Xor(h1, [0, key.length]);
  h2 = x64Xor(h2, [0, key.length]);
  h1 = x64Add(h1, h2);
  h2 = x64Add(h2, h1);
  h1 = x64Fmix(h1);
  h2 = x64Fmix(h2);
  h1 = x64Add(h1, h2);
  h2 = x64Add(h2, h1);
  return ("00000000" + (at(h1, 0) >>> 0).toString(16)).slice(-8) + ("00000000" + (at(h1, 1) >>> 0).toString(16)).slice(-8) + ("00000000" + (at(h2, 0) >>> 0).toString(16)).slice(-8) + ("00000000" + (at(h2, 1) >>> 0).toString(16)).slice(-8);
}
function picassoCanvas(roundNumber, seed, params) {
  const { area, offsetParameter, multiplier, fontSizeFactor, maxShadowBlur } = params;
  class Prng {
    constructor(seed2) {
      this.currentNumber = seed2 % offsetParameter;
      if (this.currentNumber <= 0) {
        this.currentNumber += offsetParameter;
      }
    }
    getNext() {
      this.currentNumber = multiplier * this.currentNumber % offsetParameter;
      return this.currentNumber;
    }
  }
  function adaptRandomNumberToContext(randomNumber, maxBound, floatAllowed) {
    randomNumber = (randomNumber - 1) / offsetParameter;
    if (floatAllowed) {
      return randomNumber * maxBound;
    }
    return Math.floor(randomNumber * maxBound);
  }
  function addRandomCanvasGradient(prng, context, area2) {
    const canvasGradient = context.createRadialGradient(adaptRandomNumberToContext(prng.getNext(), area2.width, void 0), adaptRandomNumberToContext(prng.getNext(), area2.height, void 0), adaptRandomNumberToContext(prng.getNext(), area2.width, void 0), adaptRandomNumberToContext(prng.getNext(), area2.width, void 0), adaptRandomNumberToContext(prng.getNext(), area2.height, void 0), adaptRandomNumberToContext(prng.getNext(), area2.width, void 0));
    canvasGradient.addColorStop(0, at(colors, adaptRandomNumberToContext(prng.getNext(), colors.length, void 0)));
    canvasGradient.addColorStop(1, at(colors, adaptRandomNumberToContext(prng.getNext(), colors.length, void 0)));
    context.fillStyle = canvasGradient;
  }
  function generateRandomWord(prng, wordLength) {
    const minAscii = 65;
    const maxAscii = 126;
    const wordGenerated = [];
    for (let i = 0; i < wordLength; i++) {
      const asciiCode = minAscii + prng.getNext() % (maxAscii - minAscii);
      wordGenerated.push(String.fromCharCode(asciiCode));
    }
    return wordGenerated.join("");
  }
  if (window.CanvasRenderingContext2D) {
    return "unknown";
  }
  const colors = [
    "#FF6633",
    "#FFB399",
    "#FF33FF",
    "#FFFF99",
    "#00B3E6",
    "#E6B333",
    "#3366E6",
    "#999966",
    "#99FF99",
    "#B34D4D",
    "#80B300",
    "#809900",
    "#E6B3B3",
    "#6680B3",
    "#66991A",
    "#FF99E6",
    "#CCFF1A",
    "#FF1A66",
    "#E6331A",
    "#33FFCC",
    "#66994D",
    "#B366CC",
    "#4D8000",
    "#B33300",
    "#CC80CC",
    "#66664D",
    "#991AFF",
    "#E666FF",
    "#4DB3FF",
    "#1AB399",
    "#E666B3",
    "#33991A",
    "#CC9999",
    "#B3B31A",
    "#00E680",
    "#4D8066",
    "#809980",
    "#E6FF80",
    "#1AFF33",
    "#999933",
    "#FF3380",
    "#CCCC00",
    "#66E64D",
    "#4D80CC",
    "#9900B3",
    "#E64D66",
    "#4DB380",
    "#FF4D4D",
    "#99E6E6",
    "#6666FF"
  ];
  const primitives = [
    function arc(prng, context, area2) {
      context.beginPath();
      context.arc(adaptRandomNumberToContext(prng.getNext(), area2.width, void 0), adaptRandomNumberToContext(prng.getNext(), area2.height, void 0), adaptRandomNumberToContext(prng.getNext(), Math.min(area2.width, area2.height), void 0), adaptRandomNumberToContext(prng.getNext(), 2 * Math.PI, true), adaptRandomNumberToContext(prng.getNext(), 2 * Math.PI, true));
      context.stroke();
    },
    function text(prng, context, area2) {
      const wordLength = Math.max(1, adaptRandomNumberToContext(prng.getNext(), 5, void 0));
      const textToStroke = generateRandomWord(prng, wordLength);
      context.font = `${area2.height / fontSizeFactor}px aafakefontaa`;
      context.strokeText(textToStroke, adaptRandomNumberToContext(prng.getNext(), area2.width, void 0), adaptRandomNumberToContext(prng.getNext(), area2.height, void 0), adaptRandomNumberToContext(prng.getNext(), area2.width, void 0));
    },
    function bezierCurve(prng, context, area2) {
      context.beginPath();
      context.moveTo(adaptRandomNumberToContext(prng.getNext(), area2.width, void 0), adaptRandomNumberToContext(prng.getNext(), area2.height, void 0));
      context.bezierCurveTo(adaptRandomNumberToContext(prng.getNext(), area2.width, void 0), adaptRandomNumberToContext(prng.getNext(), area2.height, void 0), adaptRandomNumberToContext(prng.getNext(), area2.width, void 0), adaptRandomNumberToContext(prng.getNext(), area2.height, void 0), adaptRandomNumberToContext(prng.getNext(), area2.width, void 0), adaptRandomNumberToContext(prng.getNext(), area2.height, void 0));
      context.stroke();
    },
    function quadraticCurve(prng, context, area2) {
      context.beginPath();
      context.moveTo(adaptRandomNumberToContext(prng.getNext(), area2.width, void 0), adaptRandomNumberToContext(prng.getNext(), area2.height, void 0));
      context.quadraticCurveTo(adaptRandomNumberToContext(prng.getNext(), area2.width, void 0), adaptRandomNumberToContext(prng.getNext(), area2.height, void 0), adaptRandomNumberToContext(prng.getNext(), area2.width, void 0), adaptRandomNumberToContext(prng.getNext(), area2.height, void 0));
      context.stroke();
    },
    function ellipse(prng, context, area2) {
      context.beginPath();
      context.ellipse(adaptRandomNumberToContext(prng.getNext(), area2.width, void 0), adaptRandomNumberToContext(prng.getNext(), area2.height, void 0), adaptRandomNumberToContext(prng.getNext(), Math.floor(area2.width / 2), void 0), adaptRandomNumberToContext(prng.getNext(), Math.floor(area2.height / 2), void 0), adaptRandomNumberToContext(prng.getNext(), 2 * Math.PI, true), adaptRandomNumberToContext(prng.getNext(), 2 * Math.PI, true), adaptRandomNumberToContext(prng.getNext(), 2 * Math.PI, true));
      context.stroke();
    }
  ];
  try {
    const prng = new Prng(seed);
    const canvasElt = document.createElement("canvas");
    canvasElt.width = area.width;
    canvasElt.height = area.height;
    canvasElt.style.display = "none";
    const context = canvasElt.getContext("2d");
    if (context !== null) {
      for (let i = 0; i < roundNumber; i++) {
        addRandomCanvasGradient(prng, context, area);
        context.shadowBlur = adaptRandomNumberToContext(prng.getNext(), maxShadowBlur, void 0);
        context.shadowColor = at(colors, adaptRandomNumberToContext(prng.getNext(), colors.length, void 0));
        const randomPrimitive = at(primitives, adaptRandomNumberToContext(prng.getNext(), primitives.length, void 0));
        randomPrimitive(prng, context, area);
        context.fill();
      }
    }
    return x64hash128(canvasElt.toDataURL(), seed);
  } catch (error) {
    throw new ProsopoError("WIDGET.CANVAS", { context: { error } });
  }
}
class Extension {
}
class ExtWeb2 extends Extension {
  constructor() {
    super(...arguments);
    this.getNetwork = (config) => {
      const network = config.networks[config.defaultNetwork];
      if (!network) {
        throw new ProsopoEnvError("DEVELOPER.NETWORK_NOT_FOUND", {
          context: { error: `No network found for environment ${config.defaultEnvironment}` }
        });
      }
      return network;
    };
  }
  async getAccount(config) {
    const network = this.getNetwork(config);
    const wsProvider = new WsProvider(network.endpoint);
    const account = await this.createAccount(wsProvider);
    const extension = await this.createExtension(account);
    return {
      account,
      extension
    };
  }
  async createExtension(account) {
    const signer = new Signer(async () => {
      return;
    });
    signer.signRaw = async (payload) => {
      const signature = account.keypair.sign(payload.data);
      return {
        id: 1,
        signature: u8aToHex(signature)
      };
    };
    return {
      accounts: {
        get: async () => {
          return [account];
        },
        subscribe: () => {
          return () => {
            return;
          };
        }
      },
      name: "procaptcha-web2",
      version: "0.1.11",
      signer
    };
  }
  async createAccount(wsProvider) {
    const params = {
      area: { width: 300, height: 300 },
      offsetParameter: 2001000001,
      multiplier: 15e3,
      fontSizeFactor: 1.5,
      maxShadowBlur: 50,
      numberOfRounds: 5,
      seed: 42
    };
    const browserEntropy = await this.getFingerprint();
    const canvasEntropy = picassoCanvas(params.numberOfRounds, params.seed, params);
    const entropy = hexHash([canvasEntropy, browserEntropy].join(""), 128).slice(2);
    const u8Entropy = stringToU8a(entropy);
    const mnemonic = entropyToMnemonic(u8Entropy);
    const api = await ApiPromise.create({ provider: wsProvider, initWasm: false });
    const type = "ed25519";
    const keyring = new Keyring({ type, ss58Format: api.registry.chainSS58 });
    const keypair = keyring.addFromMnemonic(mnemonic);
    const address = keypair.address.length === 42 ? keypair.address : encodeAddress(decodeAddress(keypair.address), api.registry.chainSS58);
    return {
      address,
      type,
      name: address,
      keypair
    };
  }
  async getFingerprint() {
    const fpPromise = load();
    const fp = await fpPromise;
    const result = await fp.get();
    const { screenFrame, ...componentsReduced } = result.components;
    return hashComponents(componentsReduced);
  }
}
const Manager = async (configInput) => {
  const getConfig = () => {
    const config2 = {
      userAccountAddress: "",
      ...configInput
    };
    return ProcaptchaConfigSchema.parse(config2);
  };
  const getNetwork = (config2) => {
    const network = config2.networks[config2.defaultNetwork];
    if (!network) {
      throw new ProsopoEnvError("DEVELOPER.NETWORK_NOT_FOUND", {
        context: { error: `No network found for environment ${config2.defaultEnvironment}` }
      });
    }
    return network;
  };
  const loadContract = async () => {
    const network = getNetwork(getConfig());
    const api = await ApiPromise.create({ provider: new WsProvider(network.endpoint), initWasm: false });
    const type = "sr25519";
    const keyring = new Keyring({ type, ss58Format: api.registry.chainSS58 });
    return new ProsopoCaptchaContract(api, JSON.parse(ContractAbi), network.contract.address, "prosopo", 0, keyring.addFromAddress(getConfig().account.address || ""));
  };
  const config = getConfig();
  if (!config.web2 && !config.userAccountAddress) {
    throw new ProsopoEnvError("GENERAL.ACCOUNT_NOT_FOUND", {
      context: { error: "Account address has not been set for web3 mode" }
    });
  }
  const ext = new ExtWeb2();
  const account = await ext.getAccount(config);
  const contract = await loadContract();
  const getRandomProviderResponse = await wrapQuery(contract.query.getRandomActiveProvider, contract.query)(account.account.address, configInput.account.address || "");
  const providerUrl = trimProviderUrl(getRandomProviderResponse.provider.url.toString());
  const providerApi = new ProviderApi(getNetwork(getConfig()), providerUrl, configInput.account.address || "");
  const challenge = await providerApi.getPowCaptchaChallenge(account.account.address, configInput.account.address || "");
  console.log("challenge", challenge);
  console.log("challenge", challenge.challenge);
  console.log("challenge", challenge.difficulty);
  const solution = solvePoW(challenge.challenge, challenge.difficulty);
  console.log("solution", solution);
  const verifiedSolution = await providerApi.submitPowCaptchaSolution(challenge, account.account.address, configInput.account.address || "", getRandomProviderResponse, solution);
  return verifiedSolution;
};
const checkboxBefore = css`{
  &:before {
    content: '""';
    position: absolute;
    height: 100%;
    width: 100%;
  }
}`;
const baseStyle = {
  width: "2.2em",
  height: "2.2em",
  top: "auto",
  left: "auto",
  opacity: "1",
  borderRadius: "12.5%",
  appearance: "none",
  cursor: "pointer",
  margin: "0",
  borderStyle: "solid",
  borderWidth: "1px"
};
const Checkbox = ({ themeColor, onChange, checked }) => {
  const theme = reactExports.useMemo(() => themeColor === "light" ? lightTheme : darkTheme, [themeColor]);
  const checkboxStyleBase = {
    ...baseStyle,
    border: `1px solid ${theme.palette.background.contrastText}`
  };
  const [hover, setHover] = reactExports.useState(false);
  const checkboxStyle = reactExports.useMemo(() => {
    return {
      ...checkboxStyleBase,
      borderColor: hover ? theme.palette.background.contrastText : theme.palette.grey[400],
      appearance: checked ? "auto" : "none"
    };
  }, [hover, theme, checked]);
  return jsx("input", { onMouseEnter: () => setHover(true), onMouseLeave: () => setHover(false), css: checkboxBefore, type: "checkbox", "aria-live": "assertive", "aria-haspopup": "true", onChange, checked, style: checkboxStyle });
};
const Checkbox$1 = Checkbox;
const logoStyle = css`
    align-items: center;
    justify-content: flex-end;
    display: flex;
    padding: 8px;

    @media (max-width: 245px) {
        &:nth-of-type(1),
        &:nth-of-type(2) {
            display: none;
        } /* Both logos hidden */
    }

    @media (min-width: 245px) and (max-width: 400px) {
        &:nth-of-type(1) {
            display: flex;
        } /* logoWithText */
        &:nth-of-type(2) {
            display: none;
        } /* logoWithoutText */
    }

    @media (min-width: 401px) {
        &:nth-of-type(1) {
            display: none;
        } /* logoWithText */
        &:nth-of-type(2) {
            display: flex;
        } /* logoWithoutText */
    }
`;
const Procaptcha = (props) => {
  const [checked, setChecked] = reactExports.useState(false);
  const [loading, setLoading] = reactExports.useState(false);
  const darkMode = props.config.theme;
  const styleWidth = { maxWidth: "400px", minWidth: "200px", margin: "8px" };
  const themeColor = darkMode ? "light" : "dark";
  const theme = reactExports.useMemo(() => darkMode === "light" ? lightTheme : darkTheme, [darkMode]);
  const handlePowCaptcha = async () => {
    setLoading(true);
    Manager(props.config).then((verified) => {
      if (verified.verified) {
        console.log("verified");
        setChecked(true);
      }
      setLoading(false);
    });
  };
  return jsx("div", { children: jsx("div", { style: { maxWidth: "100%", maxHeight: "100%", overflowX: "auto" }, children: jsxs("div", { style: styleWidth, "data-cy": "button-human", children: [" ", jsxs("div", { style: {
    padding: "8px",
    border: "1px solid",
    backgroundColor: theme.palette.background.default,
    borderColor: theme.palette.grey[300],
    borderRadius: "8px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap"
  }, children: [jsx("div", { style: { display: "flex", flexDirection: "column" }, children: jsxs("div", { style: {
    display: "flex",
    justifyContent: "flex-start",
    alignItems: "center",
    flexWrap: "wrap"
  }, children: [jsx("div", { style: {
    height: "50px",
    width: "50px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
    verticalAlign: "middle"
  }, children: jsx("div", { style: {
    display: "flex"
  }, children: jsx("div", { style: { flex: 1 }, children: loading ? jsx(LoadingSpinner, { themeColor }) : jsx(Checkbox$1, { checked, onChange: handlePowCaptcha, themeColor: props.config.theme || "light" }) }) }) }), jsx("div", { style: { padding: 1 }, children: jsx("span", { style: { color: theme.palette.background.contrastText, paddingLeft: "4px" }, children: "I am a human" }) })] }) }), jsx("div", { children: jsx("a", { href: "https://www.prosopo.io/#features?ref=accounts.prosopo.io&utm_campaign=widget&utm_medium=checkbox", target: "_blank", "aria-label": "Visit prosopo.io to learn more about the service and its accessibility options.", children: jsx("div", { children: jsxs("div", { children: [jsx("div", { css: logoStyle, dangerouslySetInnerHTML: {
    __html: darkMode === "light" ? logoWithoutTextBlack : logoWithoutTextWhite
  } }), jsx("div", { css: logoStyle, dangerouslySetInnerHTML: {
    __html: darkMode === "light" ? logoWithTextBlack : logoWithTextWhite
  } })] }) }) }) })] })] }) }) });
};
const logoWithTextBlack = '<svg id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2062.63 468.67" height="35px" width="140px"><defs><style>.cls-1{fill:#1d1d1b;}</style></defs><title>Prosopo Logo Black</title><path class="cls-1" d="M335.55,1825.19A147.75,147.75,0,0,1,483.3,1972.94h50.5c0-109.49-88.76-198.25-198.25-198.25v50.5Z" transform="translate(-215.73 -1774.69)"/><path class="cls-1" d="M269.36,1891.39A147.74,147.74,0,0,1,417.1,2039.13h50.5c0-109.49-88.75-198.24-198.24-198.24v50.5Z" transform="translate(-215.73 -1774.69)"/><path class="cls-1" d="M414,2157.17a147.75,147.75,0,0,1-147.74-147.74h-50.5c0,109.49,88.75,198.24,198.24,198.24v-50.5Z" transform="translate(-215.73 -1774.69)"/><path class="cls-1" d="M480.17,2091a147.74,147.74,0,0,1-147.74-147.75H281.92c0,109.49,88.76,198.25,198.25,198.25V2091Z" transform="translate(-215.73 -1774.69)"/><path class="cls-1" d="M862.8,2017.5q-27.39,22.86-78.25,22.86h-65v112.19H654.82v-312h134q46.32,0,73.86,24.13t27.55,74.72Q890.2,1994.64,862.8,2017.5ZM813,1905.1q-12.37-10.36-34.7-10.38H719.59v91.87h58.75q22.32,0,34.7-11.22t12.39-35.56Q825.43,1915.48,813,1905.1Z" transform="translate(-215.73 -1774.69)"/><path class="cls-1" d="M1045.69,1916.42c.78.08,2.51.19,5.19.32v61.81c-3.81-.42-7.2-.71-10.16-.85s-5.36-.21-7.2-.21q-36.4,0-48.89,23.71-7,13.33-7,41.06v110.29H916.89V1921.82h57.58V1962q14-23.07,24.34-31.54,16.94-14.18,44-14.18C1044,1916.32,1044.92,1916.35,1045.69,1916.42Z" transform="translate(-215.73 -1774.69)"/><path class="cls-1" d="M1265.64,2124.32q-29.21,36.06-88.69,36.06t-88.69-36.06Q1059,2088.26,1059,2037.5q0-49.9,29.22-86.5t88.69-36.59q59.47,0,88.69,36.59t29.21,86.5Q1294.85,2088.26,1265.64,2124.32ZM1217.38,2091q14.17-18.81,14.18-53.48t-14.18-53.37q-14.19-18.7-40.64-18.71T1136,1984.13q-14.29,18.72-14.29,53.37T1136,2091q14.28,18.81,40.75,18.81T1217.38,2091Z" transform="translate(-215.73 -1774.69)"/><path class="cls-1" d="M1371.81,2078.88q1.92,16.1,8.29,22.87,11.28,12.06,41.7,12.06,17.85,0,28.39-5.29t10.53-15.88a17.12,17.12,0,0,0-8.48-15.45q-8.49-5.28-63.12-18.2-39.33-9.73-55.41-24.35-16.08-14.39-16.09-41.49,0-32,25.14-54.93t70.75-23q43.26,0,70.53,17.25t31.29,59.59H1455q-1.27-11.64-6.58-18.42-10-12.27-34-12.28-19.74,0-28.13,6.14t-8.38,14.4c0,6.91,3,11.93,8.92,15q8.89,4.89,63,16.73,36,8.46,54.05,25.61,17.77,17.35,17.78,43.39,0,34.3-25.56,56t-79,21.7q-54.51,0-80.49-23t-26-58.53Z" transform="translate(-215.73 -1774.69)"/><path class="cls-1" d="M1745.54,2124.32q-29.22,36.06-88.7,36.06t-88.69-36.06q-29.2-36.06-29.21-86.82,0-49.9,29.21-86.5t88.69-36.59q59.49,0,88.7,36.59t29.21,86.5Q1774.75,2088.26,1745.54,2124.32ZM1697.27,2091q14.19-18.81,14.19-53.48t-14.19-53.37q-14.18-18.7-40.64-18.71t-40.75,18.71q-14.28,18.72-14.28,53.37t14.28,53.48q14.3,18.81,40.75,18.81T1697.27,2091Z" transform="translate(-215.73 -1774.69)"/><path class="cls-1" d="M1992.75,1946.59q28.24,29.84,28.23,87.63,0,61-27.58,92.93t-71.06,32q-27.69,0-46-13.76-10-7.62-19.6-22.23v120.24H1797V1921.82h57.79v34.08q9.79-15,20.88-23.71,20.23-15.43,48.15-15.45Q1964.53,1916.74,1992.75,1946.59Zm-46.3,43.39q-12.3-20.52-39.88-20.53-33.15,0-45.54,31.11-6.43,16.51-6.42,41.92,0,40.21,21.58,56.51,12.82,9.53,30.37,9.53,25.45,0,38.83-19.48t13.36-51.86Q1958.75,2010.51,1946.45,1990Z" transform="translate(-215.73 -1774.69)"/><path class="cls-1" d="M2249.14,2124.32q-29.2,36.06-88.69,36.06t-88.69-36.06q-29.22-36.06-29.21-86.82,0-49.9,29.21-86.5t88.69-36.59q59.49,0,88.69,36.59t29.22,86.5Q2278.36,2088.26,2249.14,2124.32ZM2200.88,2091q14.19-18.81,14.18-53.48t-14.18-53.37q-14.18-18.7-40.64-18.71t-40.75,18.71q-14.28,18.72-14.29,53.37t14.29,53.48q14.3,18.81,40.75,18.81T2200.88,2091Z" transform="translate(-215.73 -1774.69)"/></svg>';
const logoWithTextWhite = '<svg id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2062.63 468.67" height="35px" width="140px"><defs><style>.cls-1{fill:#fff;}</style></defs><title>Prosopo Logo Black</title><path class="cls-1" d="M335.55,1825.19A147.75,147.75,0,0,1,483.3,1972.94h50.5c0-109.49-88.76-198.25-198.25-198.25v50.5Z" transform="translate(-215.73 -1774.69)"/><path class="cls-1" d="M269.36,1891.39A147.74,147.74,0,0,1,417.1,2039.13h50.5c0-109.49-88.75-198.24-198.24-198.24v50.5Z" transform="translate(-215.73 -1774.69)"/><path class="cls-1" d="M414,2157.17a147.75,147.75,0,0,1-147.74-147.74h-50.5c0,109.49,88.75,198.24,198.24,198.24v-50.5Z" transform="translate(-215.73 -1774.69)"/><path class="cls-1" d="M480.17,2091a147.74,147.74,0,0,1-147.74-147.75H281.92c0,109.49,88.76,198.25,198.25,198.25V2091Z" transform="translate(-215.73 -1774.69)"/><path class="cls-1" d="M862.8,2017.5q-27.39,22.86-78.25,22.86h-65v112.19H654.82v-312h134q46.32,0,73.86,24.13t27.55,74.72Q890.2,1994.64,862.8,2017.5ZM813,1905.1q-12.37-10.36-34.7-10.38H719.59v91.87h58.75q22.32,0,34.7-11.22t12.39-35.56Q825.43,1915.48,813,1905.1Z" transform="translate(-215.73 -1774.69)"/><path class="cls-1" d="M1045.69,1916.42c.78.08,2.51.19,5.19.32v61.81c-3.81-.42-7.2-.71-10.16-.85s-5.36-.21-7.2-.21q-36.4,0-48.89,23.71-7,13.33-7,41.06v110.29H916.89V1921.82h57.58V1962q14-23.07,24.34-31.54,16.94-14.18,44-14.18C1044,1916.32,1044.92,1916.35,1045.69,1916.42Z" transform="translate(-215.73 -1774.69)"/><path class="cls-1" d="M1265.64,2124.32q-29.21,36.06-88.69,36.06t-88.69-36.06Q1059,2088.26,1059,2037.5q0-49.9,29.22-86.5t88.69-36.59q59.47,0,88.69,36.59t29.21,86.5Q1294.85,2088.26,1265.64,2124.32ZM1217.38,2091q14.17-18.81,14.18-53.48t-14.18-53.37q-14.19-18.7-40.64-18.71T1136,1984.13q-14.29,18.72-14.29,53.37T1136,2091q14.28,18.81,40.75,18.81T1217.38,2091Z" transform="translate(-215.73 -1774.69)"/><path class="cls-1" d="M1371.81,2078.88q1.92,16.1,8.29,22.87,11.28,12.06,41.7,12.06,17.85,0,28.39-5.29t10.53-15.88a17.12,17.12,0,0,0-8.48-15.45q-8.49-5.28-63.12-18.2-39.33-9.73-55.41-24.35-16.08-14.39-16.09-41.49,0-32,25.14-54.93t70.75-23q43.26,0,70.53,17.25t31.29,59.59H1455q-1.27-11.64-6.58-18.42-10-12.27-34-12.28-19.74,0-28.13,6.14t-8.38,14.4c0,6.91,3,11.93,8.92,15q8.89,4.89,63,16.73,36,8.46,54.05,25.61,17.77,17.35,17.78,43.39,0,34.3-25.56,56t-79,21.7q-54.51,0-80.49-23t-26-58.53Z" transform="translate(-215.73 -1774.69)"/><path class="cls-1" d="M1745.54,2124.32q-29.22,36.06-88.7,36.06t-88.69-36.06q-29.2-36.06-29.21-86.82,0-49.9,29.21-86.5t88.69-36.59q59.49,0,88.7,36.59t29.21,86.5Q1774.75,2088.26,1745.54,2124.32ZM1697.27,2091q14.19-18.81,14.19-53.48t-14.19-53.37q-14.18-18.7-40.64-18.71t-40.75,18.71q-14.28,18.72-14.28,53.37t14.28,53.48q14.3,18.81,40.75,18.81T1697.27,2091Z" transform="translate(-215.73 -1774.69)"/><path class="cls-1" d="M1992.75,1946.59q28.24,29.84,28.23,87.63,0,61-27.58,92.93t-71.06,32q-27.69,0-46-13.76-10-7.62-19.6-22.23v120.24H1797V1921.82h57.79v34.08q9.79-15,20.88-23.71,20.23-15.43,48.15-15.45Q1964.53,1916.74,1992.75,1946.59Zm-46.3,43.39q-12.3-20.52-39.88-20.53-33.15,0-45.54,31.11-6.43,16.51-6.42,41.92,0,40.21,21.58,56.51,12.82,9.53,30.37,9.53,25.45,0,38.83-19.48t13.36-51.86Q1958.75,2010.51,1946.45,1990Z" transform="translate(-215.73 -1774.69)"/><path class="cls-1" d="M2249.14,2124.32q-29.2,36.06-88.69,36.06t-88.69-36.06q-29.22-36.06-29.21-86.82,0-49.9,29.21-86.5t88.69-36.59q59.49,0,88.69,36.59t29.22,86.5Q2278.36,2088.26,2249.14,2124.32ZM2200.88,2091q14.19-18.81,14.18-53.48t-14.18-53.37q-14.18-18.7-40.64-18.71t-40.75,18.71q-14.28,18.72-14.29,53.37t14.29,53.48q14.3,18.81,40.75,18.81T2200.88,2091Z" transform="translate(-215.73 -1774.69)"/></svg>';
const logoWithoutTextWhite = '<svg id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 348" height="35px"><path id="Vector" d="M95.7053 40.2707C127.005 40.2707 157.022 52.6841 179.154 74.78C201.286 96.8759 213.719 126.844 213.719 158.093H254.056C254.056 70.7808 183.16 -4.57764e-05 95.7053 -4.57764e-05V40.2707Z" fill="#fff"/><path id="Vector_2" d="M42.8365 93.0614C58.3333 93.0614 73.6784 96.1087 87.9955 102.029C102.313 107.95 115.322 116.628 126.279 127.568C137.237 138.508 145.93 151.496 151.86 165.79C157.79 180.084 160.843 195.404 160.843 210.875H201.179C201.179 123.564 130.291 52.7906 42.8365 52.7906V93.0614Z" fill="#fff"/><path id="Vector_3" d="M158.367 305.005C127.07 305.003 97.056 292.59 74.926 270.496C52.796 248.402 40.3626 218.437 40.3604 187.191H0.0239563C0.0239563 274.503 70.9123 345.276 158.367 345.276V305.005Z" fill="#fff"/><path id="Vector_4" d="M211.219 252.239C195.722 252.239 180.376 249.191 166.059 243.27C151.741 237.349 138.732 228.67 127.774 217.729C116.816 206.788 108.123 193.799 102.194 179.505C96.2637 165.21 93.2121 149.889 93.2132 134.417H52.8687C52.8687 221.729 123.765 292.509 211.219 292.509V252.239Z" fill="#fff"/></g><defs><clipPath id="clip0_1_2"><rect width="254" height="345" fill="white"/></clipPath></defs></svg>';
const logoWithoutTextBlack = '<svg id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 348" height="35px"><path id="Vector" d="M95.7053 40.2707C127.005 40.2707 157.022 52.6841 179.154 74.78C201.286 96.8759 213.719 126.844 213.719 158.093H254.056C254.056 70.7808 183.16 -4.57764e-05 95.7053 -4.57764e-05V40.2707Z" fill="#000000"/><path id="Vector_2" d="M42.8365 93.0614C58.3333 93.0614 73.6784 96.1087 87.9955 102.029C102.313 107.95 115.322 116.628 126.279 127.568C137.237 138.508 145.93 151.496 151.86 165.79C157.79 180.084 160.843 195.404 160.843 210.875H201.179C201.179 123.564 130.291 52.7906 42.8365 52.7906V93.0614Z" fill="#000000"/><path id="Vector_3" d="M158.367 305.005C127.07 305.003 97.056 292.59 74.926 270.496C52.796 248.402 40.3626 218.437 40.3604 187.191H0.0239563C0.0239563 274.503 70.9123 345.276 158.367 345.276V305.005Z" fill="#000000"/><path id="Vector_4" d="M211.219 252.239C195.722 252.239 180.376 249.191 166.059 243.27C151.741 237.349 138.732 228.67 127.774 217.729C116.816 206.788 108.123 193.799 102.194 179.505C96.2637 165.21 93.2121 149.889 93.2132 134.417H52.8687C52.8687 221.729 123.765 292.509 211.219 292.509V252.239Z" fill="#000000"/></g><defs><clipPath id="clip0_1_2"><rect width="254" height="345" fill="white"/></clipPath></defs></svg>';
export {
  Procaptcha as default
};
