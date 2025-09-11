// Copyright 2021-2025 Prosopo (UK) Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
// @ts-nocheck
const getUserAgent = () => navigator.userAgent;
const automationUserAgents = [
  /Selenium/i,
  /WebDriver/i,
  /PhantomJS/i,
  /HeadlessChrome/i,
  /Cypress/i,
  /WebdriverIO/i,
  /Scrapy/i,
  /python-requests/i
];
const detectAutomationUserAgent = () => automationUserAgents.some((pattern) => pattern.test(getUserAgent())) ? 1 : 0;
const agentDetectors = [detectAutomationUserAgent];
const getAppVersion = () => {
  const appVersion = navigator.appVersion;
  if (appVersion == void 0) {
    return "";
  }
  return appVersion;
};
const detectAppVersion = () => {
  try {
    const lowerCaseVersion = getAppVersion().toLowerCase();
    if (/headless/i.test(lowerCaseVersion) || /electron/i.test(lowerCaseVersion) || /slimerjs/i.test(lowerCaseVersion) || /phantomjs/i.test(lowerCaseVersion) || /selenium/i.test(lowerCaseVersion) || /puppeteer/i.test(lowerCaseVersion) || /webdriver/i.test(lowerCaseVersion))
      return 1;
    const chromeVersion = lowerCaseVersion.match(/chrome\/(\d+)/i);
    if (chromeVersion && Number.parseInt(chromeVersion[1]) < 90) return 0.1;
    const firefoxVersion = lowerCaseVersion.match(/firefox\/(\d+)/i);
    if (firefoxVersion && Number.parseInt(firefoxVersion[1]) < 80) return 0.1;
    return 0;
  } catch (error) {
    return 0.1;
  }
};
const appVersionDetectors = [detectAppVersion];
const audioDetectors = [];
const behaviourDetectors = [
  // detectClickNoMove,
  // detectCoordinateLeak
];
const detectCanvasMeasureTextPatch = async () => {
  let suspicionScore = 0;
  try {
    const originalMeasureText = CanvasRenderingContext2D.prototype.measureText;
    const testCanvas = document.createElement("canvas").getContext("2d");
    if (!testCanvas) return 0;
    const pub = (() => {
      let hex = "4e5132764e51334150576648566b40535457484f51574f65513254584e5132764e51324956576e4853696e73535737415830767a6345767250786e314f4748405757544553574452533244504d47444c51576e415330664e5332445050574474584533364c3258504e336e4056574836666c6a7051315374566572565b3233304e324833586c504467686674586f50735b6f504d4c466a7861694b78506958446154406d61686a4156334b3256556a74505a5b74615a4c314f6c584a51564433565a504a554a5034537b766c5844444641684431584a405a516f724a61574c5856695845536b3b446744486f5b5653324e784c74666f477a5633507358336e755155506b4d456d32586f4c46636f6e504d46484a606f6e6f4f68667557564c6863337272544757496156406a4c6f76694c6f7a4c635748336147583357445069606844445b314f78674a407a666c4b375155374e4e325840676f4c75576948486655507353314c4953785478636f33566054725866564f74616f33364f537234505a6a7556576a5351576d3250686a4b537858636768577b63697a324c56584a4f6f6a4161553770565a506b605643305031484b666e407a635a6e5356456e31585658345b6f5875503150696669546954784078416f665149305057586e6a5667454b706354405461306a7258554c51545a6e444f413b4d61334845603344705154483154455841583166694c5a693653556e695851766856785877546c4c37664665325032587757573249554a66485047445053574b494e5132764e513344566953655744544156476e464b477644555132764e51327641653f3f";
      let key = "";
      for (let i = 0; i < hex.length; i += 2) {
        key += String.fromCharCode(parseInt(hex.substr(i, 2), 16) ^ 2);
      }
      return key;
    })();
    const measuredWidth = testCanvas.measureText(pub).width;
    if (!Number.isFinite(measuredWidth) || measuredWidth <= 0) {
      suspicionScore += 0.03;
    }
    if (CanvasRenderingContext2D.prototype.measureText !== originalMeasureText) {
      suspicionScore += 0.05;
    }
    const widths = Array.from({ length: 3 }, () => testCanvas.measureText(pub).width);
    const variance = Math.max(...widths) - Math.min(...widths);
    if (variance > 0.5) {
      suspicionScore += 0.02;
    }
  } catch (e) {
    suspicionScore += 0.05;
  }
  return suspicionScore;
};
const canvasDetectors = [detectCanvasMeasureTextPatch];
const detectCdpErrorTrace = () => {
  let cdpDetected = false;
  const e = new Error();
  Object.defineProperty(e, "stack", {
    get() {
      cdpDetected = true;
    }
  });
  console.debug(e);
  return cdpDetected ? 0.2 : 0;
};
const cdpDetectors = [detectCdpErrorTrace];
const cssDetectors = [];
const getErrorTrace = () => {
  try {
    null[0]();
  } catch (error) {
    if (error instanceof Error && error.stack != null) {
      return error.stack.toString();
    }
  }
  throw new Error("errorTrace signal unexpected behaviour");
};
const detectErrorTrace = () => {
  try {
    const errorTrace = getErrorTrace();
    if (/PhantomJS/i.test(errorTrace)) return 1;
  } catch (error) {
    return 0;
  }
  return 0;
};
const errorDetectors = [detectErrorTrace];
const getDoesBrowserSupportFlagEmojis = () => {
  const canvas = document.createElement("canvas");
  canvas.height = 1;
  canvas.width = 1;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return false;
  }
  ctx.font = `${canvas.height}px sans-serif`;
  const flagEmoji = "🇺🇸";
  ctx.fillText(flagEmoji, 0, canvas.height);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  for (let i = 0; i < imageData.length; i += 4) {
    if (imageData[i + 3] === 0) {
      continue;
    }
    if (imageData[i] !== imageData[i + 1] || imageData[i] !== imageData[i + 2]) {
      return true;
    }
  }
  return false;
};
const isChromeLike = () => {
  const ua = navigator.userAgent;
  return /Chrome|Chromium/.test(ua);
};
const detectFlagEmojis = () => {
  try {
    const supportsFlagEmojis = getDoesBrowserSupportFlagEmojis();
    if (navigator.platform.startsWith("Win") && isChromeLike() && supportsFlagEmojis) {
      return 0.4;
    }
    if (navigator.userAgent.includes("Windows") && isChromeLike() && supportsFlagEmojis) {
      return 0.4;
    }
    return 0;
  } catch (e) {
    return 0;
  }
};
const fontsDetectors = [detectFlagEmojis];
var State = /* @__PURE__ */ ((State2) => {
  State2[State2["Success"] = 0] = "Success";
  State2[State2["Undefined"] = -1] = "Undefined";
  State2[State2["NotFunction"] = -2] = "NotFunction";
  State2[State2["UnexpectedBehaviour"] = -3] = "UnexpectedBehaviour";
  State2[State2["Null"] = -4] = "Null";
  return State2;
})(State || {});
const BotKind = {
  // Object is used instead of Typescript enum to avoid emitting IIFE which might be affected by further tree-shaking.
  // See example of compiled enums https://stackoverflow.com/q/47363996)
  Awesomium: "awesomium",
  Cef: "cef",
  CefSharp: "cefsharp",
  CoachJS: "coachjs",
  FMiner: "fminer",
  Geb: "geb",
  NightmareJS: "nightmarejs",
  Phantomas: "phantomas",
  PhantomJS: "phantomjs",
  Rhino: "rhino",
  Selenium: "selenium",
  WebDriverIO: "webdriverio",
  WebDriver: "webdriver",
  HeadlessChrome: "headless_chrome"
};
class BotdError extends Error {
  /**
   * Creates a new BotdError.
   *
   * @class
   */
  constructor(state, message) {
    super(message);
    this.state = state;
    this.name = "BotdError";
    Object.setPrototypeOf(this, BotdError.prototype);
  }
}
var BrowserEngineKind = /* @__PURE__ */ ((BrowserEngineKind2) => {
  BrowserEngineKind2["Unknown"] = "unknown";
  BrowserEngineKind2["Chromium"] = "chromium";
  BrowserEngineKind2["Gecko"] = "gecko";
  BrowserEngineKind2["Webkit"] = "webkit";
  return BrowserEngineKind2;
})(BrowserEngineKind || {});
var BrowserKind = /* @__PURE__ */ ((BrowserKind2) => {
  BrowserKind2["Unknown"] = "unknown";
  BrowserKind2["Chrome"] = "chrome";
  BrowserKind2["Firefox"] = "firefox";
  BrowserKind2["Opera"] = "opera";
  BrowserKind2["Safari"] = "safari";
  BrowserKind2["IE"] = "internet_explorer";
  BrowserKind2["WeChat"] = "wechat";
  BrowserKind2["Edge"] = "edge";
  return BrowserKind2;
})(BrowserKind || {});
function arrayIncludes(arr, value) {
  return arr.indexOf(value) !== -1;
}
function strIncludes(str, value) {
  return str.indexOf(value) !== -1;
}
function arrayFind(array, callback) {
  if ("find" in array) return array.find(callback);
  for (let i = 0; i < array.length; i++)
    if (callback(array[i], i, array)) return array[i];
  return void 0;
}
function getObjectProps(obj) {
  return Object.getOwnPropertyNames(obj);
}
function includes(arr, ...keys) {
  for (const key of keys) {
    if (typeof key === "string") {
      if (arrayIncludes(arr, key)) return true;
    } else {
      const match = arrayFind(arr, (value) => key.test(value));
      if (match != null) return true;
    }
  }
  return false;
}
function countTruthy(values) {
  return values.reduce((sum, value) => sum + (value ? 1 : 0), 0);
}
function getBrowserEngineKind() {
  const w = window;
  const n = navigator;
  if (countTruthy([
    "webkitPersistentStorage" in n,
    "webkitTemporaryStorage" in n,
    n.vendor.indexOf("Google") === 0,
    "webkitResolveLocalFileSystemURL" in w,
    "BatteryManager" in w,
    "webkitMediaStream" in w,
    "webkitSpeechGrammar" in w
  ]) >= 5) {
    return BrowserEngineKind.Chromium;
  }
  if (countTruthy([
    "ApplePayError" in w,
    "CSSPrimitiveValue" in w,
    "Counter" in w,
    n.vendor.indexOf("Apple") === 0,
    "getStorageUpdates" in n,
    "WebKitMediaKeys" in w
  ]) >= 4) {
    return BrowserEngineKind.Webkit;
  }
  if (countTruthy([
    "buildID" in navigator,
    "MozAppearance" in (document.documentElement?.style ?? {}),
    "onmozfullscreenchange" in w,
    "mozInnerScreenX" in w,
    "CSSMozDocumentRule" in w,
    "CanvasCaptureMediaStream" in w
  ]) >= 4) {
    return BrowserEngineKind.Gecko;
  }
  return BrowserEngineKind.Unknown;
}
function getBrowserKind() {
  const userAgent = navigator.userAgent?.toLowerCase();
  if (strIncludes(userAgent, "edg/")) {
    return BrowserKind.Edge;
  }
  if (strIncludes(userAgent, "trident") || strIncludes(userAgent, "msie")) {
    return BrowserKind.IE;
  }
  if (strIncludes(userAgent, "wechat")) {
    return BrowserKind.WeChat;
  }
  if (strIncludes(userAgent, "firefox")) {
    return BrowserKind.Firefox;
  }
  if (strIncludes(userAgent, "opera") || strIncludes(userAgent, "opr")) {
    return BrowserKind.Opera;
  }
  if (strIncludes(userAgent, "chrome")) {
    return BrowserKind.Chrome;
  }
  if (strIncludes(userAgent, "safari")) {
    return BrowserKind.Safari;
  }
  return BrowserKind.Unknown;
}
function isAndroid() {
  const browserEngineKind = getBrowserEngineKind();
  const isItChromium = browserEngineKind === BrowserEngineKind.Chromium;
  const isItGecko = browserEngineKind === BrowserEngineKind.Gecko;
  if (!isItChromium && !isItGecko) return false;
  const w = window;
  return countTruthy([
    "onorientationchange" in w,
    "orientation" in w,
    isItChromium && !("SharedWorker" in w),
    isItGecko && /android/i.test(navigator.appVersion)
  ]) >= 2;
}
function getDocumentFocus() {
  if (document.hasFocus === void 0) {
    return false;
  }
  return document.hasFocus();
}
const getEvalLength = () => {
  return eval.toString().length;
};
const detectEvalLengthInconsistency = () => {
  try {
    const browserKind = getBrowserKind();
    const browserEngineKind = getBrowserEngineKind();
    const evalLength = getEvalLength();
    if (browserEngineKind === BrowserEngineKind.Unknown) return 0.1;
    const inconsistentWebkitGecko = evalLength === 37 && !arrayIncludes(
      [BrowserEngineKind.Webkit, BrowserEngineKind.Gecko],
      browserEngineKind
    );
    const inconsistentIE = evalLength === 39 && !arrayIncludes([BrowserKind.IE], browserKind);
    const inconsistentChromium = evalLength === 33 && !arrayIncludes([BrowserEngineKind.Chromium], browserEngineKind);
    const inconsistent = inconsistentWebkitGecko || inconsistentIE || inconsistentChromium;
    return inconsistent ? 1 : 0;
  } catch (e) {
    return 0.1;
  }
};
const getFunctionBind = () => {
  if (Function.prototype.bind === void 0) {
    throw new Error("Function.prototype.bind is undefined");
  }
  return Function.prototype.bind.toString();
};
function detectFunctionBind() {
  try {
    getFunctionBind();
    return 0;
  } catch (e) {
    return 1;
  }
}
const functionsDetectors = [
  detectEvalLengthInconsistency,
  detectFunctionBind
];
const getPluginsArray = () => {
  if (navigator.plugins === void 0) {
    throw new Error("navigator.plugins is undefined");
  }
  if (window.PluginArray === void 0) {
    throw new Error("window.PluginArray is undefined");
  }
  return navigator.plugins instanceof PluginArray;
};
const detectPluginsArray = () => {
  try {
    const pluginsArray = getPluginsArray();
    if (!pluginsArray)
      return 1;
    return 0;
  } catch (e) {
    return 0;
  }
};
const getPluginsLength = () => {
  if (navigator.plugins === void 0) {
    throw new Error("navigator.plugins is undefined");
  }
  if (navigator.plugins.length === void 0) {
    throw new Error("navigator.plugins.length is undefined");
  }
  return navigator.plugins.length;
};
const detectPluginsLengthInconsistency = () => {
  try {
    const pluginsLength = getPluginsLength();
    const android = isAndroid();
    const browserKind = getBrowserKind();
    const browserEngineKind = getBrowserEngineKind();
    if (browserKind !== BrowserKind.Chrome || android || browserEngineKind !== BrowserEngineKind.Chromium)
      return 0;
    if (pluginsLength === 0) return 1;
    return 0;
  } catch (e) {
    return 0;
  }
};
const getRTT = () => {
  if (navigator.connection === void 0) {
    throw new BotdError(State.Undefined, "navigator.connection is undefined");
  }
  if (navigator.connection.rtt === void 0) {
    throw new BotdError(
      State.Undefined,
      "navigator.connection.rtt is undefined"
    );
  }
  return navigator.connection.rtt;
};
const detectRTT = () => {
  try {
    const rtt = getRTT();
    const android = isAndroid();
    if (android) return 0;
    if (rtt === 0) return 0.2;
    return 0;
  } catch (e) {
    return 0;
  }
};
const getWindowSize = () => ({
  outerWidth: window.outerWidth,
  outerHeight: window.outerHeight,
  innerWidth: window.innerWidth,
  innerHeight: window.innerHeight
});
function detectWindowSize() {
  try {
    const windowSize = getWindowSize();
    const documentFocus = getDocumentFocus();
    const { outerWidth, outerHeight } = windowSize;
    if (!documentFocus) return 0;
    if (outerWidth === 0 && outerHeight === 0) return 1;
    return 0;
  } catch (error) {
    return 0;
  }
}
const headlessDetectors = [
  detectPluginsArray,
  detectPluginsLengthInconsistency,
  detectRTT,
  detectWindowSize
];
const incognitoDetectors = [];
const areMimeTypesConsistent = () => {
  if (navigator.mimeTypes === void 0) {
    throw new BotdError(State.Undefined, "navigator.mimeTypes is undefined");
  }
  const { mimeTypes } = navigator;
  let isConsistent = Object.getPrototypeOf(mimeTypes) === MimeTypeArray.prototype;
  for (let i = 0; i < mimeTypes.length; i++) {
    isConsistent &&= Object.getPrototypeOf(mimeTypes[i]) === MimeType.prototype;
  }
  return isConsistent;
};
const detectMimeTypesConsistent = () => {
  try {
    const mimeTypesConsistent = areMimeTypesConsistent();
    if (!mimeTypesConsistent) return 1;
    return 0;
  } catch (error) {
    return 0;
  }
};
const getProductSub = () => {
  const { productSub } = navigator;
  if (productSub === void 0) {
    throw new Error("navigator.productSub is undefined");
  }
  return productSub;
};
const detectProductSub = () => {
  try {
    const productSub = getProductSub();
    const browserKind = getBrowserKind();
    if ((browserKind === BrowserKind.Chrome || browserKind === BrowserKind.Safari || browserKind === BrowserKind.Opera || browserKind === BrowserKind.WeChat) && productSub !== "20030107")
      return 1;
    return 0;
  } catch (error) {
    return 0;
  }
};
let tried = false;
const detectPlatformSetManually = async () => {
  if (tried)
    return 0;
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        tried = true;
        const platform = navigator.platform || "unknown";
        Object.defineProperty(navigator, "platform", {
          get: () => platform
          // try to set to original value
        });
        resolve(0);
      } catch (error) {
        resolve(1);
      }
    }, 50);
  });
};
const navigatorDetectors = [detectMimeTypesConsistent, detectProductSub, detectPlatformSetManually];
const getNotificationPermissions = async () => {
  if (window.Notification === void 0) {
    throw new Error("window.Notification is undefined");
  }
  if (navigator.permissions === void 0) {
    throw new Error("navigator.permissions is undefined");
  }
  const { permissions } = navigator;
  if (typeof permissions.query !== "function") {
    throw new Error("navigator.permissions.query is not a function");
  }
  try {
    const permissionStatus = await permissions.query({ name: "notifications" });
    return window.Notification.permission === "denied" && permissionStatus.state === "prompt";
  } catch (e) {
    throw new Error("notificationPermissions signal unexpected behaviour");
  }
};
const detectNotificationPermissions = async () => {
  try {
    const notificationsPermissions = await getNotificationPermissions();
    const browserKind = getBrowserKind();
    if (browserKind !== BrowserKind.Chrome) return 0;
    if (notificationsPermissions) {
      return 1;
    }
    return 0;
  } catch (e) {
    return 0;
  }
};
const notificationDetectors = [detectNotificationPermissions];
const resistanceDetectors = [];
const instanceId = String.fromCharCode(Math.random() * 26 + 97) + Math.random().toString(36).slice(-7);
const detectIframeProxy = () => {
  try {
    const iframe = document.createElement("iframe");
    iframe.srcdoc = instanceId;
    return !!iframe.contentWindow ? 0.5 : 0;
  } catch (err) {
    return 0.2;
  }
};
const detectHighChromeIndex = () => {
  const key = "chrome";
  const highIndexRange = -50;
  return Object.keys(window).slice(highIndexRange).includes(key) && Object.getOwnPropertyNames(window).slice(highIndexRange).includes(key) ? 0.5 : 0;
};
const detectBadChromeRuntime = () => {
  if (!("chrome" in window && "runtime" in chrome)) {
    return 0;
  }
  try {
    if ("prototype" in chrome.runtime.sendMessage || "prototype" in chrome.runtime.connect) {
      return 0.5;
    }
    new chrome.runtime.sendMessage();
    new chrome.runtime.connect();
    return 0.5;
  } catch (err) {
    return err.constructor.name !== "TypeError" ? 0.5 : 0;
  }
};
const detectTempProfile = () => {
  return navigator.userAgent.includes("chrome_user_data_") ? 0.2 : 0;
};
const stealthDetectors = [
  detectIframeProxy,
  detectHighChromeIndex,
  detectBadChromeRuntime,
  detectTempProfile
];
const timezoneDetectors = [];
const getWebGL = () => {
  const canvasElement = document.createElement("canvas");
  if (typeof canvasElement.getContext !== "function") {
    throw new BotdError(
      State.NotFunction,
      "HTMLCanvasElement.getContext is not a function"
    );
  }
  const webGLContext = canvasElement.getContext("webgl");
  if (webGLContext === null) {
    throw new BotdError(State.Null, "WebGLRenderingContext is null");
  }
  if (typeof webGLContext.getParameter !== "function") {
    throw new BotdError(
      State.NotFunction,
      "WebGLRenderingContext.getParameter is not a function"
    );
  }
  const vendor = webGLContext.getParameter(webGLContext.VENDOR);
  const renderer = webGLContext.getParameter(webGLContext.RENDERER);
  return { vendor, renderer };
};
const detectWebGL = () => {
  try {
    const { vendor, renderer } = getWebGL();
    if (vendor === "Brian Paul" && renderer === "Mesa OffScreen") {
      return 1;
    }
    return 0;
  } catch (error) {
    return 0.1;
  }
};
const webGlDetectors = [detectWebGL];
const getWebDriver = () => {
  if (navigator.webdriver === void 0) {
    throw new BotdError(State.Undefined, "navigator.webdriver is undefined");
  }
  return navigator.webdriver;
};
const detectWebDriver = () => {
  try {
    const webDriver = getWebDriver();
    if (webDriver) return 1;
    return 0;
  } catch (error) {
    return 0;
  }
};
const webdriverDetectors = [detectWebDriver];
const getDistinctiveProperties = () => {
  const distinctivePropsList = {
    [BotKind.Awesomium]: {
      window: ["awesomium"]
    },
    [BotKind.Cef]: {
      window: ["RunPerfTest"]
    },
    [BotKind.CefSharp]: {
      window: ["CefSharp"]
    },
    [BotKind.CoachJS]: {
      window: ["emit"]
    },
    [BotKind.FMiner]: {
      window: ["fmget_targets"]
    },
    [BotKind.Geb]: {
      window: ["geb"]
    },
    [BotKind.NightmareJS]: {
      window: ["__nightmare", "nightmare"]
    },
    [BotKind.Phantomas]: {
      window: ["__phantomas"]
    },
    [BotKind.PhantomJS]: {
      window: ["callPhantom", "_phantom"]
    },
    [BotKind.Rhino]: {
      window: ["spawn"]
    },
    [BotKind.Selenium]: {
      window: [
        "_Selenium_IDE_Recorder",
        "_selenium",
        "calledSelenium",
        /^([a-z]){3}_.*_(Array|Promise|Symbol)$/
      ],
      document: [
        "__selenium_evaluate",
        "selenium-evaluate",
        "__selenium_unwrapped"
      ]
    },
    [BotKind.WebDriverIO]: {
      window: ["wdioElectron"]
    },
    [BotKind.WebDriver]: {
      window: [
        "webdriver",
        "__webdriverFunc",
        "__lastWatirAlert",
        "__lastWatirConfirm",
        "__lastWatirPrompt",
        "_WEBDRIVER_ELEM_CACHE",
        "ChromeDriverw"
      ],
      document: [
        "__webdriver_script_fn",
        "__driver_evaluate",
        "__webdriver_evaluate",
        "__fxdriver_evaluate",
        "__driver_unwrapped",
        "__webdriver_unwrapped",
        "__fxdriver_unwrapped",
        "__webdriver_script_fn",
        "__webdriver_script_func",
        "__webdriver_script_function",
        "$cdc_asdjflasutopfhvcZLmcf",
        "$cdc_asdjflasutopfhvcZLmcfl_",
        "$chrome_asyncScriptInfo",
        "__$webdriverAsyncExecutor"
      ]
    },
    [BotKind.HeadlessChrome]: {
      window: ["domAutomation", "domAutomationController"]
    }
  };
  let botName;
  const result = {};
  const windowProps = getObjectProps(window);
  let documentProps = [];
  if (window.document !== void 0)
    documentProps = getObjectProps(window.document);
  for (botName in distinctivePropsList) {
    const props = distinctivePropsList[botName];
    if (props !== void 0) {
      const windowContains = props.window === void 0 ? false : includes(windowProps, ...props.window);
      const documentContains = props.document === void 0 || !documentProps.length ? false : includes(documentProps, ...props.document);
      result[botName] = windowContains || documentContains;
    }
  }
  return result;
};
const detectDistinctiveProperties = () => {
  try {
    const distinctiveProperties = getDistinctiveProperties();
    const value = distinctiveProperties;
    let bot;
    for (bot in value) if (value[bot]) return 1;
  } catch (error) {
    return 0;
  }
  return 0;
};
const getDocumentElementKeys = () => {
  if (document.documentElement === void 0) {
    throw new Error("document.documentElement is undefined");
  }
  const { documentElement } = document;
  if (typeof documentElement.getAttributeNames !== "function") {
    throw new Error(
      "document.documentElement.getAttributeNames is not a function"
    );
  }
  return documentElement.getAttributeNames();
};
const detectDocumentAttributes = () => {
  try {
    const documentElementKeys = getDocumentElementKeys();
    if (includes(documentElementKeys, "selenium", "webdriver", "driver")) {
      return 1;
    }
  } catch (error) {
    return 0;
  }
  return 0;
};
const getProcess = () => {
  const { process } = window;
  const errorPrefix = "window.process is";
  if (process === void 0) {
    throw new Error(`${errorPrefix} undefined`);
  }
  if (process && typeof process !== "object") {
    throw new Error(`${errorPrefix} not an object`);
  }
  return process;
};
const detectProcess = () => {
  try {
    const process = getProcess();
    if (
      // Use process.type === "renderer" to detect Electron
      process.type === "renderer" || process.versions?.electron != null
    )
      return 1;
  } catch (error) {
    return 0;
  }
  return 0;
};
const getWindowExternal = () => {
  if (window.external === void 0) {
    throw new Error("window.external is undefined");
  }
  const { external } = window;
  if (typeof external.toString !== "function") {
    throw new Error("window.external.toString is not a function");
  }
  return external.toString();
};
const detectWindowExternal = () => {
  try {
    const windowExternal = getWindowExternal();
    if (/Sequentum/i.test(windowExternal)) return 1;
  } catch (error) {
    return 0;
  }
  return 0;
};
const windowDetectors = [
  detectDistinctiveProperties,
  detectDocumentAttributes,
  detectProcess,
  detectWindowExternal
];
const workerDetectors = [];
const detectors = [
  ...agentDetectors,
  ...appVersionDetectors,
  ...audioDetectors,
  ...behaviourDetectors,
  ...canvasDetectors,
  ...cdpDetectors,
  ...cssDetectors,
  ...errorDetectors,
  ...fontsDetectors,
  ...functionsDetectors,
  ...headlessDetectors,
  ...incognitoDetectors,
  ...navigatorDetectors,
  ...notificationDetectors,
  ...resistanceDetectors,
  ...stealthDetectors,
  ...timezoneDetectors,
  ...webdriverDetectors,
  ...webGlDetectors,
  ...windowDetectors,
  ...workerDetectors
];
const botScore = async () => Promise.all(
  detectors.map(async (detector) => {
    const result = detector();
    if (typeof result === "number") {
      return result;
    }
    return await result;
  })
);
async function encryptData(data) {
  const pub = (() => {
    let hex = "4d5231754d5230425354654b5568435057544b4c52544c665231575b4d5231754d52314a55546d4b506a6d70505434425b33757960467571537b6d324c444b435454574650544751503147534e44474f52546d425033654d50314753535447775b4630354f315b534d306d4355544b35656f69735232507755667155583130334d314b305b6f5347646b65775b6c5370586c534e4f45697b626a487b536a5b476257436e626b694255304831555669775359587762594f324c6f5b495255473055595349564953375078756f5b474745426b47325b494359526c714962544f5b556a5b465068384764474b6c585550314d7b4f77656c4479553053705b306d76525653684e466e315b6c4f45606c6d534e454b49636c6d6c4c6b657654554f6b603071715744544a625543694f6c756a4f6c794f60544b3062445b305447536a636b474758324c7b64494379656f48345256344d4d315b43646c4f76546a4b4b6556537050324f4a507b577b606c30556357715b65554c77626c30354c507137535969765554695052546e31536b6948507b5b60646b5478606a79314f555b494c6c694262563473555953686355403353324b48656d437960596d5055466d325b555b37586c5b765332536a656a576a577b437b426c65524a3353545b6d69556446487360574357623369715b564f5257596d474c42384e62304b466330477352574b3257465b425b32656a4f596a3550566d6a5b52756b557b5b74576f4f346545663153315b745454314a5649654b534447535054484a4d5231754d523047556a50665447574255446d4548447547565231754d52317542663c3c";
    let key = "";
    for (let i = 0; i < hex.length; i += 2) {
      key += String.fromCharCode(parseInt(hex.substr(i, 2), 16) ^ 1);
    }
    return key;
  })();
  const pemContents = atob(pub);
  const pemBody = pemContents.replace("-----BEGIN PUBLIC KEY-----", "").replace("-----END PUBLIC KEY-----", "").replace(/[\n\r]/g, "");
  const binaryDer = atob(pemBody);
  const derArray = new Uint8Array(binaryDer.length);
  for (let i = 0; i < binaryDer.length; i++) {
    derArray[i] = binaryDer.charCodeAt(i);
  }
  const importedKey = await window.crypto.subtle.importKey(
    "spki",
    derArray,
    {
      name: "RSA-OAEP",
      hash: "SHA-256"
    },
    false,
    ["encrypt"]
  );
  const encodedData = new TextEncoder().encode(data);
  const encrypted = await window.crypto.subtle.encrypt(
    {
      name: "RSA-OAEP"
    },
    importedKey,
    encodedData
  );
  return arrayBufferToBase64(encrypted);
}
function arrayBufferToBase64(arrayBuffer) {
  let binary = "";
  const bytes = new Uint8Array(arrayBuffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}
const generatePayload = (score) => {
  const currentTime = Date.now();
  const timestampEntropy = Number(currentTime.toString().slice(-3));
  const unscaledPayload = timestampEntropy + score;
  const scaledPayload = unscaledPayload / 999 * Math.PI - Math.PI / 2;
  const sinPayload = Math.sin(scaledPayload);
  const rescaledPayload = sinPayload * 1e3;
  const randomNumberU8a = window.crypto.getRandomValues(new Uint8Array(10));
  const randomNumber = randomNumberU8a.reduce(
    (a, b) => a + b,
    0
  );
  return [currentTime, rescaledPayload, randomNumber];
};
const setupShadowDomDetection = (container, restart) => {
  let shadowDomInteractionDetected = false;
  const onShadowDomDetected = (message) => {
    shadowDomInteractionDetected = true;
    restart();
  };
  overrideElementPrototypeAccess(onShadowDomDetected);
  monitorAttachShadowCalls(onShadowDomDetected);
  const shadowClickHandler = (e) => {
    try {
      const target = e.target;
      const root = target?.getRootNode();
      if (root instanceof ShadowRoot) {
        onShadowDomDetected();
      }
    } catch (error) {
    }
  };
  container.addEventListener("click", shadowClickHandler, true);
  return [() => {
    container.removeEventListener("click", shadowClickHandler, true);
  }, shadowDomInteractionDetected];
};
const monitorAttachShadowCalls = (onShadowDomDetected) => {
  try {
    const originalAttachShadow = Element.prototype.attachShadow;
    if (!window.__attachShadowDetectionInstalled) {
      Element.prototype.attachShadow = function(...args) {
        try {
          onShadowDomDetected(`attachShadow called on ${this.tagName || "unknown"} element`);
          return originalAttachShadow.apply(this, args);
        } catch (error) {
          throw error;
        }
      };
      window.__attachShadowDetectionInstalled = true;
    }
  } catch (error) {
  }
};
const overrideElementPrototypeAccess = (onShadowDomDetected) => {
  try {
    const originalShadowRootGetter = Object.getOwnPropertyDescriptor(
      Element.prototype,
      "shadowRoot"
    )?.get;
    if (originalShadowRootGetter && !window.__shadowRootDetectionInstalled) {
      Object.defineProperty(Element.prototype, "shadowRoot", {
        get: function() {
          try {
            onShadowDomDetected(`shadowRoot accessed on ${this.tagName || "unknown"} element`);
            return originalShadowRootGetter.call(this);
          } catch (error) {
            return null;
          }
        },
        configurable: true
      });
      window.__shadowRootDetectionInstalled = true;
    }
  } catch (error) {
  }
};
const detect = async (env, randomProviderSelectorFn, container, restart) => {
  let cleanupShadowDetection = () => {
  };
  let shadowDomInteractionDetected = false;
  if (container) {
    [cleanupShadowDetection, shadowDomInteractionDetected] = setupShadowDomDetection(container, restart);
  }
  const scores = await botScore();
  const shadowDomPenalty = shadowDomInteractionDetected ? 1 : 0;
  const noise = Math.random() * 0.3;
  const score = Math.min(
    scores.reduce((sum, value) => sum + value, 0) + noise + shadowDomPenalty,
    1
  );
  let token;
  let provider;
  try {
    const [payload1, payload2, providerSelectEntropy] = generatePayload(score);
    provider = await randomProviderSelectorFn(env, providerSelectEntropy);
    token = await encryptData(JSON.stringify([payload1, payload2, providerSelectEntropy]));
  } catch (e) {
    token = "";
  }
  return { token, provider, shadowDomCleanup: cleanupShadowDetection };
};
export {
  detect as default
};
