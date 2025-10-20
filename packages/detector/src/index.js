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
      const hex = "4c5330744c5331435255644a5469425156554a4d53554d675330565a4c5330744c53304b54556c4a516b6c71515535435a32747861477470527a6c334d454a425555564751554650513046524f45464e53556c435132644c51304652525545774f43744e5458466b64446b7a533167785a30357355455261526770304e33704f616b307751584e7755556f72556c5533523268684e323079646e5133566e6458617a4236646a68485958564e5556563663484a4454545a3157476f32643078795a306c6b5747316d5a6e644855305654436d64504c3231545546703451314d7a56453152546b4e6e4f55314a6546683552544a306130313454576c355756643061486c754f546c7759315a46556d46304b315534576c4a586332784d4b316477574574764f476b4b4b316c5763304a55646a686b64334a6f624655355a6d564f526d743161326376634552425a3035564d45704a61336c6a565649795656704a516c6434535535355156706964484577595651325447784e56324e4661677077536b6c6853554a4b5a576c4b4b3141775257396852336c48566d316d61555231576b68454d7a46585245354254486c304e46513555544e35596b4d77614442596347737a656b6c5355456c51646a45794e465630436c566f5247316c59334a506547786b574374714f4649795a45687552303956546a5a6852316c344e6c5134576b68316147707255304e4b643274475a6973345a6c4a456131524a4e324e3056455a685a30785852544d4b6431464a524546525155494b4c5330744c533146546b51675546564354456c4449457446575330744c53307443673d3d";
      let key = "";
      for (let i = 0; i < hex.length; i += 2) {
        key += String.fromCharCode(Number.parseInt(hex.substr(i, 2), 16) ^ 0);
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
    const widths = Array.from(
      { length: 3 },
      () => testCanvas.measureText(pub).width
    );
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
  BrowserKind2["Facebook"] = "facebook";
  BrowserKind2["Firefox"] = "firefox";
  BrowserKind2["Instagram"] = "instagram";
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
  for (let i = 0; i < Array.from(array).length; i++)
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
  if (strIncludes(userAgent, "edga/")) {
    return BrowserKind.Edge;
  }
  if (strIncludes(userAgent, "edgios")) {
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
  if (strIncludes(userAgent, "crios")) {
    return BrowserKind.Chrome;
  }
  if (strIncludes(userAgent, "safari")) {
    return BrowserKind.Safari;
  }
  return BrowserKind.Unknown;
}
const versionStringToNumber = (version) => {
  const versionParts = version.split(".");
  try {
    if (versionParts.length > 1) {
      return Number.parseInt(versionParts[0]);
    }
  } catch (e) {
    return 0;
  }
  return 0;
};
function getBrowserVersion() {
  const userAgent = navigator.userAgent.toLowerCase();
  const browserKind = getBrowserKind();
  let match;
  switch (browserKind) {
    case BrowserKind.Edge:
      match = userAgent.match(/(?:edg|edga|edgios)\/(\d+(\.\d+)?)/i);
      break;
    case BrowserKind.IE:
      match = userAgent.match(/(?:msie |rv:)(\d+(\.\d+)?)/i);
      break;
    case BrowserKind.WeChat:
      match = userAgent.match(/micromessenger\/(\d+(\.\d+)?)/i);
      break;
    case BrowserKind.Facebook:
      match = userAgent.match(/(?:fban|fbav|fbios)\/(\d+(\.\d+)?)/i);
      break;
    case BrowserKind.Firefox:
      match = userAgent.match(/(?:firefox|fxios)\/(\d+(\.\d+)?)/i);
      break;
    case BrowserKind.Instagram:
      match = userAgent.match(/instagram\/(\d+(\.\d+)?)/i);
      break;
    case BrowserKind.Opera:
      match = userAgent.match(/(?:opera|opr)\/(\d+(\.\d+)?)/i);
      break;
    case BrowserKind.Chrome:
      match = userAgent.match(/(?:chrome|crios)\/(\d+(\.\d+)?)/i);
      break;
    case BrowserKind.Safari:
      match = userAgent.match(/version\/(\d+(\.\d+)?)/i);
      break;
    default:
      return 0;
  }
  if (match && match.length > 1) {
    return versionStringToNumber(match[1]);
  }
  return 0;
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
    isItGecko && /android/i.test(navigator.appVersion),
    "getDigitalGoodsService" in w
  ]) >= 2;
}
function isAndroidWebView() {
  return isAndroid() && countTruthy(["openDatabase" in window, "android" in window]) >= 1;
}
function isWebView() {
  return isAndroidWebView();
}
function inIframe() {
  if (window !== window.top) {
    return true;
  }
  return false;
}
function getDocumentFocus() {
  if (document.hasFocus === void 0) {
    return false;
  }
  return document.hasFocus();
}
const supportsCaretPositionFromPoint = () => typeof document.caretPositionFromPoint === "function";
const detectCaretPositionFromPoint = () => {
  const browserEngineKind = getBrowserEngineKind();
  if (browserEngineKind !== BrowserEngineKind.Chromium) {
    return 0;
  }
  const browserVersion = getBrowserVersion();
  const browserKind = getBrowserKind();
  const shouldHaveDetectCaretPositionFromPoint = browserKind === BrowserKind.Chrome && browserEngineKind === BrowserEngineKind.Chromium && browserVersion >= 128;
  if (supportsCaretPositionFromPoint() && !shouldHaveDetectCaretPositionFromPoint) {
    return 1;
  }
  if (!supportsCaretPositionFromPoint() && shouldHaveDetectCaretPositionFromPoint) {
    return 1;
  }
  return 0;
};
const caretDetectors = [detectCaretPositionFromPoint];
const detectCdpErrorTrace = () => {
  let cdpDetected = false;
  const e = new Error();
  Object.defineProperty(e, "stack", {
    get() {
      cdpDetected = true;
    }
  });
  console.debug(e);
  return cdpDetected ? 0.5 : 0;
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
const supportsFontSizeAdjust = () => CSS?.supports("font-size-adjust", "0.545");
const detectFontSizeAdjust = () => {
  const browserEngineKind = getBrowserEngineKind();
  const browserVersion = getBrowserVersion();
  const browserKind = getBrowserKind();
  let shouldHaveFontSizeAdjust = false;
  switch (browserKind) {
    case BrowserKind.Chrome:
    case BrowserKind.Edge:
    case BrowserKind.Opera:
      if (browserEngineKind === BrowserEngineKind.Chromium && browserVersion >= 127) {
        shouldHaveFontSizeAdjust = true;
      }
      break;
    case BrowserKind.Firefox:
      if (browserVersion >= 3) {
        shouldHaveFontSizeAdjust = true;
      }
      break;
    case BrowserKind.Safari:
      if (browserVersion >= 16.4) {
        shouldHaveFontSizeAdjust = true;
      }
      break;
  }
  const detectedSupport = supportsFontSizeAdjust();
  if (detectedSupport !== shouldHaveFontSizeAdjust) {
    return 1;
  }
  return 0;
};
const fontsDetectors = [detectFlagEmojis, detectFontSizeAdjust];
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
let tried = false;
const detectPlatformSetManually = async () => {
  if (tried) return 0;
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
const navigatorDetectors = [
  detectMimeTypesConsistent,
  detectProductSub,
  detectPlatformSetManually
];
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
    return iframe.contentWindow ? 0.5 : 0;
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
const getWindowAI = () => {
  if (window.ai === void 0) {
    throw new Error("window.ai is undefined");
  }
  return window.ai.toString();
};
const detectAI = () => {
  const browserEngineKind = getBrowserEngineKind();
  const browserVersion = getBrowserVersion();
  const browserKind = getBrowserKind();
  const shouldHaveWindowAI = browserKind === BrowserKind.Chrome && browserEngineKind === BrowserEngineKind.Chromium && browserVersion === 127;
  try {
    getWindowAI();
    if (!shouldHaveWindowAI) {
      return 1;
    }
  } catch (error) {
    if (shouldHaveWindowAI) {
      return 1;
    }
  }
  return 0;
};
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
  detectWindowExternal,
  detectAI
];
const workerDetectors = [];
const detectors = [
  ...agentDetectors,
  ...appVersionDetectors,
  ...audioDetectors,
  ...behaviourDetectors,
  ...canvasDetectors,
  ...caretDetectors,
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
    const hex = "4e5132764e51334150576648566b40535457484f51574f65513254584e5132764e51324956576e4853696e73535737415830767a6345767250786e314f4748405757544553574452533244504d47444c51576e415330664e53324450505747754d41764c565a4469664669785133657a5832377157475063506572324c31724d63693275535a4c7557576d70576e573150306a6a4c30327b666c5331546c665a6378403466686a4a5b5a544c57545434614a48465656583355456d3066327a7b58326e695545336f586c664a57325456416f66524e3033565744723653334f785447335056694c6c4d57334867446a37505648326332333656556e3755546632634a6e774d566e755b335844576f443249335736556e485a61307a4f49336675554776744d45694949336e556132485766686a696631486d60445737586f544d506f76336330617461475040583237544f47724863316e6854544b7b54547248536e6636515737375354726b664a47755b54533056457a4c54304c446365727551696e6a5157484958556e494933437550553b6a50316e4a546f336f6357503355696a474f78445a50473740564a6e324c44533757564c375b694f756346405b6145717867696e5157476e536668477b4c445432416e546d5045336e5b31485267457a69554176734d444b7b58476a7750323b545668586a50336e364c6e533655696a336345727057324c4966307645586b7136586e4847633350484c304c325447586a58327a5a50564f49663344485047445053574b494e5132764e513344566953655744544156476e464b477644555132764e51327641653f3f";
    let key = "";
    for (let i = 0; i < hex.length; i += 2) {
      key += String.fromCharCode(Number.parseInt(hex.substr(i, 2), 16) ^ 2);
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
const TRIG_TRANSFORM_SCALE = 5;
const TRIG_TRANSFORM_SHIFT = 5;
const EXP_TRANSFORM_SCALE = 3;
const EXP_TRANSFORM_SHIFT = 9;
const POLY_TRANSFORM_A = 0.4810746943632438;
const POLY_TRANSFORM_B = 2;
const POLY_TRANSFORM_C = 3;
const LOG_TRANSFORM_SCALE = 1.4375116780948651;
const LOG_TRANSFORM_SHIFT = 2;
const LOG_TRANSFORM_BASE = 3;
const HYP_TRANSFORM_SCALE = 1.721141314981387;
const HYP_TRANSFORM_SHIFT = 1;
const TRANSFORM_CREATORS_INDEX = 4;
const PAYLOAD_DELIMITER = "|";
async function hashUserAgent(userAgent) {
  const encoder = new TextEncoder();
  const data = encoder.encode(userAgent);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return hashHex.substring(0, 32);
}
function createTrigTransform() {
  const scale = TRIG_TRANSFORM_SCALE;
  const shift = TRIG_TRANSFORM_SHIFT;
  return {
    name: "TrigTransform",
    encrypt: (value) => {
      const scaled = value * Math.PI - Math.PI / 2;
      const sinValue = Math.sin(scaled);
      return sinValue * scale + shift;
    },
    decrypt: (encryptedValue) => {
      const sinValue = (encryptedValue - shift) / scale;
      const clampedSin = Math.max(-1, Math.min(1, sinValue));
      const scaled = Math.asin(clampedSin) + Math.PI / 2;
      return scaled / Math.PI;
    }
  };
}
function createExpTransform() {
  const scale = EXP_TRANSFORM_SCALE;
  const shift = EXP_TRANSFORM_SHIFT;
  return {
    name: "ExpTransform",
    encrypt: (value) => {
      const expValue = Math.exp(value * 2 - 1);
      return expValue * scale + shift;
    },
    decrypt: (encryptedValue) => {
      const expValue = Math.max(1e-3, (encryptedValue - shift) / scale);
      const normalized = (Math.log(expValue) + 1) / 2;
      return Math.max(0, Math.min(1, normalized));
    }
  };
}
function createPolyTransform() {
  const a = POLY_TRANSFORM_A;
  const b = POLY_TRANSFORM_B;
  const c = POLY_TRANSFORM_C;
  return {
    name: "PolyTransform",
    encrypt: (value) => {
      const polyValue = a * value ** 2 + b * value + c;
      return polyValue;
    },
    decrypt: (encryptedValue) => {
      const discriminant = b ** 2 - 4 * a * (c - encryptedValue);
      if (discriminant < 0) return 0;
      const value = (-b + Math.sqrt(discriminant)) / (2 * a);
      return Math.max(0, Math.min(1, value));
    }
  };
}
function createLogTransform() {
  const scale = LOG_TRANSFORM_SCALE;
  const shift = LOG_TRANSFORM_SHIFT;
  const base = LOG_TRANSFORM_BASE;
  return {
    name: "LogTransform",
    encrypt: (value) => {
      const logValue = Math.log(value + 0.1) / Math.log(base);
      return logValue * scale + shift;
    },
    decrypt: (encryptedValue) => {
      const logValue = (encryptedValue - shift) / scale;
      const value = base ** logValue - 0.1;
      return Math.max(0, Math.min(1, value));
    }
  };
}
function createHypTransform() {
  const scale = HYP_TRANSFORM_SCALE;
  const shift = HYP_TRANSFORM_SHIFT;
  return {
    name: "HypTransform",
    encrypt: (value) => {
      const normalized = value * 2 - 1;
      const tanhValue = Math.tanh(normalized);
      return tanhValue * scale + shift;
    },
    decrypt: (encryptedValue) => {
      const tanhValue = (encryptedValue - shift) / scale;
      const clampedTanh = Math.max(-0.999, Math.min(0.999, tanhValue));
      const normalized = Math.atanh(clampedTanh);
      const value = (normalized + 1) / 2;
      return Math.max(0, Math.min(1, value));
    }
  };
}
const TRANSFORM_CREATORS = [
  createTrigTransform,
  createExpTransform,
  createPolyTransform,
  createLogTransform,
  createHypTransform
];
const generatePayload = async (score, userId, webView, iFrame) => {
  const currentTime = Date.now();
  const encryptionTransform = TRANSFORM_CREATORS[TRANSFORM_CREATORS_INDEX];
  const encryptedScore = encryptionTransform().encrypt(score);
  const randomNumberU8a = window.crypto.getRandomValues(new Uint8Array(10));
  const randomNumber = randomNumberU8a.reduce((a, b) => a + b, 0);
  const userAgent = navigator.userAgent;
  const hashedUserAgent = await hashUserAgent(userAgent);
  const stringRescaledPayload = encryptedScore.toString();
  const stringPayload = `${userId}${PAYLOAD_DELIMITER}${stringRescaledPayload}${PAYLOAD_DELIMITER}${hashedUserAgent}${PAYLOAD_DELIMITER}${webView ? 1 : 0}${PAYLOAD_DELIMITER}${iFrame ? 1 : 0}`;
  return [currentTime, stringPayload, randomNumber];
};
const setupShadowDomDetection = (container, restart) => {
  let shadowDomInteractionDetected = false;
  const onShadowDomDetected = (message) => {
    shadowDomInteractionDetected = true;
    const stack = Error().stack?.toString();
    const badScripts = "UtilityScript.evaluate\uD83Dpptr:$eval".split("\uD83D");
    if (badScripts.some((b) => stack?.includes(b))) {
      restart();
    }
    const badTraces = [
      // catch small anonymous traces - avoids catching Visual Website Optimizer but needs refinement
      (stack2) => stack2.includes("<anonymous>") && stack2.split("at ").length <= 4
    ];
    if (badTraces.some((f) => f(stack || ""))) {
      restart();
    }
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
  return [
    () => {
      container.removeEventListener("click", shadowClickHandler, true);
    },
    shadowDomInteractionDetected
  ];
};
const monitorAttachShadowCalls = (onShadowDomDetected) => {
  try {
    const originalAttachShadow = Element.prototype.attachShadow;
    if (!window.__attachShadowDetectionInstalled) {
      Element.prototype.attachShadow = function(...args) {
        onShadowDomDetected(
          `attachShadow called on ${this.tagName || "unknown"} element`
        );
        return originalAttachShadow.apply(this, args);
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
            onShadowDomDetected(
              `shadowRoot accessed on ${this.tagName || "unknown"} element`
            );
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
const detect = async (env, randomProviderSelectorFn, container, restart, account) => {
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
  const webView = isWebView();
  const ifFrame = inIframe();
  let token;
  let provider;
  try {
    const [currentTime, scorePayload, providerSelectEntropy] = await generatePayload(score, account, webView, ifFrame);
    provider = await randomProviderSelectorFn(env, providerSelectEntropy);
    token = await encryptData(
      JSON.stringify([currentTime, scorePayload, providerSelectEntropy])
    );
  } catch (e) {
    token = "";
  }
  return { token, provider, shadowDomCleanup: cleanupShadowDetection };
};
export {
  detect as default
};
