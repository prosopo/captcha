// Copyright 2021-2026 Prosopo (UK) Ltd.
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
const DEFAULT_DOM_CAPABILITIES = {
  requiresWindow: true,
  requiresDOM: true,
  requiresCanvas: false,
  workerSafe: false
};
const WORKER_SAFE_CAPABILITIES = {
  requiresWindow: false,
  requiresDOM: false,
  requiresCanvas: false,
  workerSafe: true
};
const CANVAS_CAPABILITIES = {
  requiresWindow: true,
  requiresDOM: true,
  requiresCanvas: true,
  workerSafe: false
};
class DetectorEnvironmentBase {
  constructor() {
    this.browserExpectations = [];
    this.latestScope = {};
    this.getLatestScope = () => this.latestScope;
  }
  async getCurrentScope() {
    try {
      const scope = await this.resolveScope();
      this.latestScope.scope = scope;
      return scope;
    } catch (error) {
      if (error) {
        this.latestScope.error = error;
      }
      throw error;
    }
  }
}
class ScoreDetectorBase {
  async detectScore() {
    this.detectedScore = this.calcScore().catch(() => this.scoreWhenFailed);
    return this.detectedScore;
  }
  /**
   * Sync method that immediately returns a score Promise.
   *
   * Unlike the awaited resolved number, it guarantees that
   * scoreDetection is run only once, even if this method is called once again,
   * before the score is resolved.
   */
  getDetectedScore() {
    if (void 0 === this.detectedScore) {
      return this.detectScore();
    }
    return this.detectedScore;
  }
}
const getUserAgent = () => navigator.userAgent;
const headlessUserAgents = [
  "Selenium",
  "WebDriver",
  "PhantomJS",
  "HeadlessChrome",
  "Cypress",
  "WebdriverIO",
  "Scrapy",
  "python-requests"
];
const createRegexpFromList = (list) => {
  return list.map((item) => new RegExp(item, "i"));
};
const automationUserAgents = createRegexpFromList(headlessUserAgents);
class AutomationUserAgentEnvironment extends DetectorEnvironmentBase {
  async resolveScope() {
    return {
      userAgent: getUserAgent()
    };
  }
}
class AutomationUserAgentDetector extends ScoreDetectorBase {
  constructor() {
    super(...arguments);
    this.name = "detectAutomationUserAgent";
    this.capabilities = WORKER_SAFE_CAPABILITIES;
    this.scoreWhenFailed = 0;
    this.environment = new AutomationUserAgentEnvironment();
  }
  async calcScore() {
    const { userAgent } = await this.environment.getCurrentScope();
    return automationUserAgents.some((pattern) => pattern.test(userAgent)) ? 1 : 0;
  }
}
const detectAutomationUserAgent = new AutomationUserAgentDetector();
const agentDetectors = [detectAutomationUserAgent];
const getAppVersion = () => {
  const appVersion = navigator.appVersion;
  if (appVersion == void 0) {
    return "";
  }
  return appVersion;
};
const headlessUserAgentNames = [
  "headless",
  "electron",
  "slimerjs",
  "phantomjs",
  "selenium",
  "puppeteer",
  "webdriver"
];
class AppVersionEnvironment extends DetectorEnvironmentBase {
  async resolveScope() {
    return {
      appVersion: getAppVersion()
    };
  }
}
class AppVersionDetector extends ScoreDetectorBase {
  constructor() {
    super(...arguments);
    this.name = "detectAppVersion";
    this.capabilities = WORKER_SAFE_CAPABILITIES;
    this.scoreWhenFailed = 0.1;
    this.environment = new AppVersionEnvironment();
  }
  async calcScore() {
    const { appVersion } = await this.environment.getCurrentScope();
    const lowerCaseVersion = appVersion.toLowerCase();
    const createRegex2 = (pattern) => new RegExp(pattern, "i");
    if (headlessUserAgentNames.some((regex) => createRegex2(regex).test(lowerCaseVersion))) {
      return 1;
    }
    const chromeVersion = lowerCaseVersion.match(/chrome\/(\d+)/i);
    if (chromeVersion && Number.parseInt(chromeVersion[1]) < 90)
      return 0.1;
    const firefoxVersion = lowerCaseVersion.match(/firefox\/(\d+)/i);
    if (firefoxVersion && Number.parseInt(firefoxVersion[1]) < 80)
      return 0.1;
    return 0;
  }
}
const detectAppVersion = new AppVersionDetector();
const appVersionDetectors = [detectAppVersion];
const audioDetectors = [];
const behaviourDetectors = [
  // detectClickNoMove,
  // detectCoordinateLeak
];
class CanvasMeasureTextPatchEnvironment extends DetectorEnvironmentBase {
  async resolveScope() {
    return {};
  }
}
class CanvasMeasureTextPatchDetector extends ScoreDetectorBase {
  constructor() {
    super(...arguments);
    this.name = "detectCanvasMeasureTextPatch";
    this.capabilities = CANVAS_CAPABILITIES;
    this.scoreWhenFailed = 0.05;
    this.environment = new CanvasMeasureTextPatchEnvironment();
  }
  // detectCanvasMeasureTextPatch.ts
  async calcScore() {
    let suspicionScore = 0;
    try {
      const originalMeasureText = CanvasRenderingContext2D.prototype.measureText;
      const testCanvas = document.createElement("canvas").getContext("2d");
      if (!testCanvas)
        return 0;
      const pub = (() => {
        const h = "bfa781c58226bbabf8c8b995a9a9d699b445ab69784353ab5551514f4bc5545d57446de4583c175b54f94343622166235f4784255de0434d2a7550be4a77dd716f3b4e752314613e791682515e61466fe95d5a3e79569a411daf62755a7b70b166612763715f666d4b7f6a6f6a0c927b6ca4700523070c1b10111a290589167a742d062f1a7c050b1ca61d05cc1761c10038e0182ee3043552212daa0a6f6d35271b12243c0535c3001e00301e6229050b333cd1261be31d18ac3d25ce24041e1732bf05215b2602071528172f4c533b3a142cb145d7f6f6e2c3bff1de67d1e6adc7c9cfd9d937e9c073c0d831d4ea65f1a640d3def8cdcd65fdc0f8ccf694dfd6b2c8f5ebf496eef7f38ff7d57eeb9939ec9881e69ccae4d9dde1e507fbe5c4d7f1dbeffdb4f9ffbae3d049e1e89be7f41de697f0a9880a80ae09a1ae0ba5a558f888a092941397fd89aa860a9f9a9db783878fbef8858cd39cebf2b89ae68beb67beb577d8a9848088d189a82bb6bf8c81b06bbdab0181bb68bbc20d9ec0c5979908bb87adbacbd7bbbf7ba192b0a78f25ad6bcd4c31db504caf4435af645fff6638c5593cac7a77835a57075b21fd7726ea4c26d1764d625c516d7f44b0532f52524eb44d4f9e7549996b4d3b6c19737361fa601e184a58d4765e4b6b5fb97f4eb2597eb6616fcc770e4d5e51556770486a2ca72d72ac1401992d1cc410248b107ff9281b4d7802bd00055364169a370c273927090434e50b1df8083065172e4e0937b5372a94313c4b061f4e313d6f05253e0a39b40616413c177b013b83123307272c053b4adc371366183bf5384be431c5dbe9f2bee6d278d7c859c9e6a4e5dee3d8d48de5c3adddfc20fea3e4c6c25dcca4fdf2cdf8f1acbdceacceacf200fde532fbcfe4f5c8d5d5f212f6d299e09a2efee9eee7dde5e2dc73fcca46d084578cff0ce6d68df3ffe3d8fa4cffe8e7f288828f8ef299f692b5933e84a2efa5a150a8a6f49f8901abbd5fb58b7581e6d9e4be4581e80593a0919584c2b5b2528a9a56b3af5fafd7e6959e0683d8e0af99268a87cb859d118bb77182c36ea4a7b0cd8060a4b02b89b95ea1ab95958afe9d44d66630184d5c66476827634da247703d59444257438e6b7c936146d74a6dfb2c7fed4662c75762634c598125555a4e112f6768427161eb63747d767db56061eb677f5c1d5a8d6363e9007470675f806451d6627e166f79306f790f517adf7605fc3504f91417fb75325d0b1bd9793e9b082b8a7073", s = 243, g = 2;
        const bytes = [];
        let j = 0;
        for (let i = 0; i < h.length; i += 2) {
          if (j > 0 && j % (g + 1) === g) {
            j++;
            continue;
          }
          bytes.push(parseInt(h.substr(i, 2), 16) ^ (s + bytes.length) % 256);
          j++;
        }
        return new TextDecoder().decode(new Uint8Array(bytes));
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
  }
}
const detectCanvasMeasureTextPatch = new CanvasMeasureTextPatchDetector();
const canvasDetectors = [detectCanvasMeasureTextPatch];
var State;
(function(State2) {
  State2[State2["Success"] = 0] = "Success";
  State2[State2["Undefined"] = -1] = "Undefined";
  State2[State2["NotFunction"] = -2] = "NotFunction";
  State2[State2["UnexpectedBehaviour"] = -3] = "UnexpectedBehaviour";
  State2[State2["Null"] = -4] = "Null";
})(State || (State = {}));
const automationKeyValues = [
  ["Awesomium", "awesomium"],
  ["Cef", "cef"],
  ["CefSharp", "cefsharp"],
  ["CoachJS", "coachjs"],
  ["Electron", "electron"],
  ["FMiner", "fminer"],
  ["Geb", "geb"],
  ["NightmareJS", "nightmarejs"],
  ["Phantomas", "phantomas"],
  ["PhantomJS", "phantomjs"],
  ["Rhino", "rhino"],
  ["Selenium", "selenium"],
  ["Sequentum", "sequentum"],
  ["SlimerJS", "slimerjs"],
  ["WebDriverIO", "webdriverio"],
  ["WebDriver", "webdriver"],
  ["HeadlessChrome", "headless_chrome"],
  ["Unknown", "unknown"]
];
const BotKind = automationKeyValues.reduce((acc, [key, value]) => {
  acc[key] = value;
  return acc;
}, {});
const getBotKind = (key) => {
  return BotKind[key];
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
var BrowserEngineKind;
(function(BrowserEngineKind2) {
  BrowserEngineKind2["Unknown"] = "unknown";
  BrowserEngineKind2["Chromium"] = "chromium";
  BrowserEngineKind2["Gecko"] = "gecko";
  BrowserEngineKind2["Webkit"] = "webkit";
})(BrowserEngineKind || (BrowserEngineKind = {}));
var BrowserKind;
(function(BrowserKind2) {
  BrowserKind2["Unknown"] = "unknown";
  BrowserKind2["Brave"] = "brave";
  BrowserKind2["Chrome"] = "chrome";
  BrowserKind2["Facebook"] = "facebook";
  BrowserKind2["Firefox"] = "firefox";
  BrowserKind2["Instagram"] = "instagram";
  BrowserKind2["Opera"] = "opera";
  BrowserKind2["Safari"] = "safari";
  BrowserKind2["SamsungInternet"] = "samsung_internet";
  BrowserKind2["IE"] = "internet_explorer";
  BrowserKind2["WeChat"] = "wechat";
  BrowserKind2["Edge"] = "edge";
})(BrowserKind || (BrowserKind = {}));
function arrayIncludes(arr, value) {
  return arr.indexOf(value) !== -1;
}
function strIncludes(str, value) {
  return str.indexOf(value) !== -1;
}
function arrayFind(array, callback) {
  if ("find" in array)
    return array.find(callback);
  for (let i = 0; i < Array.from(array).length; i++)
    if (callback(array[i], i, array))
      return array[i];
  return void 0;
}
function getObjectProps(obj) {
  return Object.getOwnPropertyNames(obj);
}
function includes(arr, ...keys) {
  for (const key of keys) {
    if (typeof key === "string") {
      if (arrayIncludes(arr, key))
        return true;
    } else {
      const match = arrayFind(arr, (value) => key.test(value));
      if (match != null)
        return true;
    }
  }
  return false;
}
function countTruthy(values) {
  return values.reduce((sum, value) => sum + (value ? 1 : 0), 0);
}
let _cachedBrowserEngineKind = null;
let _cachedBrowserKind = null;
let _cachedBrowserVersion = null;
let _cachedWebView = null;
let _cachedIframe = null;
function getBrowserEngineKind() {
  if (_cachedBrowserEngineKind !== null) {
    return _cachedBrowserEngineKind;
  }
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
    _cachedBrowserEngineKind = BrowserEngineKind.Chromium;
    return _cachedBrowserEngineKind;
  }
  if (countTruthy([
    "ApplePayError" in w,
    "CSSPrimitiveValue" in w,
    "Counter" in w,
    n.vendor.indexOf("Apple") === 0,
    "getStorageUpdates" in n,
    "WebKitMediaKeys" in w
  ]) >= 4) {
    _cachedBrowserEngineKind = BrowserEngineKind.Webkit;
    return _cachedBrowserEngineKind;
  }
  if (countTruthy([
    "buildID" in navigator,
    "MozAppearance" in (document.documentElement?.style ?? {}),
    "onmozfullscreenchange" in w,
    "mozInnerScreenX" in w,
    "CSSMozDocumentRule" in w,
    "CanvasCaptureMediaStream" in w
  ]) >= 4) {
    _cachedBrowserEngineKind = BrowserEngineKind.Gecko;
    return _cachedBrowserEngineKind;
  }
  _cachedBrowserEngineKind = BrowserEngineKind.Unknown;
  return _cachedBrowserEngineKind;
}
function getBrowserKind(ua) {
  if (_cachedBrowserKind !== null && true) {
    return _cachedBrowserKind;
  }
  const userAgent = navigator.userAgent?.toLowerCase();
  const brands = navigator.userAgentData?.brands || [{ brand: "" }];
  const brave = navigator.brave || null;
  if (brands.length > 0 && strIncludes(brands[0].brand.toLowerCase(), "brave") || brave && strIncludes(userAgent, "chrome")) {
    _cachedBrowserKind = BrowserKind.Brave;
    return _cachedBrowserKind;
  }
  if (strIncludes(userAgent, "edg/")) {
    _cachedBrowserKind = BrowserKind.Edge;
    return _cachedBrowserKind;
  }
  if (strIncludes(userAgent, "edga/")) {
    _cachedBrowserKind = BrowserKind.Edge;
    return _cachedBrowserKind;
  }
  if (strIncludes(userAgent, "edgios")) {
    _cachedBrowserKind = BrowserKind.Edge;
    return _cachedBrowserKind;
  }
  if (strIncludes(userAgent, "trident") || strIncludes(userAgent, "msie")) {
    _cachedBrowserKind = BrowserKind.IE;
    return _cachedBrowserKind;
  }
  if (strIncludes(userAgent, "wechat")) {
    _cachedBrowserKind = BrowserKind.WeChat;
    return _cachedBrowserKind;
  }
  if (strIncludes(userAgent, "firefox")) {
    _cachedBrowserKind = BrowserKind.Firefox;
    return _cachedBrowserKind;
  }
  if (strIncludes(userAgent, "opera") || strIncludes(userAgent, "opr")) {
    _cachedBrowserKind = BrowserKind.Opera;
    return _cachedBrowserKind;
  }
  if (strIncludes(userAgent, "chrome") && strIncludes(userAgent, "samsung")) {
    _cachedBrowserKind = BrowserKind.SamsungInternet;
    return _cachedBrowserKind;
  }
  if (strIncludes(userAgent, "chrome")) {
    _cachedBrowserKind = BrowserKind.Chrome;
    return _cachedBrowserKind;
  }
  if (strIncludes(userAgent, "crios")) {
    _cachedBrowserKind = BrowserKind.Safari;
    return _cachedBrowserKind;
  }
  if (strIncludes(userAgent, "safari")) {
    _cachedBrowserKind = BrowserKind.Safari;
    return _cachedBrowserKind;
  }
  if (strIncludes(userAgent, "iphone")) {
    _cachedBrowserKind = BrowserKind.Safari;
    return _cachedBrowserKind;
  }
  if (strIncludes(userAgent, "ipad")) {
    _cachedBrowserKind = BrowserKind.Safari;
    return _cachedBrowserKind;
  }
  _cachedBrowserKind = BrowserKind.Unknown;
  return _cachedBrowserKind;
}
const versionStringToParts = (version, keepMinor) => {
  if (!version)
    return { major: 0, minor: 0 };
  const normalized = version.replace(/_/g, ".");
  const parts = normalized.split(".");
  const major = Number.parseInt(parts[0], 10);
  const minor = parts.length > 1 ? Number.parseInt(parts[1], 10) : 0;
  return Number.isNaN(major) ? { major: 0, minor: 0 } : keepMinor ? { major, minor } : { major, minor: 0 };
};
const BROWSER_VERSION_PATTERNS = {
  edge: "(?:edg|edga|edgios)\\/(\\d+(\\.\\d+)?)",
  ie: "(?:msie |rv:)(\\d+(\\.\\d+)?)",
  wechat: "micromessenger\\/(\\d+(\\.\\d+)?)",
  facebook: "(?:fban|fbav|fbios)\\/(\\d+(\\.\\d+)?)",
  firefox: "(?:firefox|fxios)\\/(\\d+(\\.\\d+)?)",
  instagram: "instagram\\/(\\d+(\\.\\d+)?)",
  opera: "(?:opera|opr)\\/(\\d+(\\.\\d+)?)",
  chrome: "(?:chrome|crios)\\/(\\d+(\\.\\d+)?)",
  safari1: "version\\/(\\d+(\\.\\d+)?)",
  safari2: "(?:iphone|ipad).*os (\\d+(_\\d+)?)"
};
const createRegex = (str) => new RegExp(str, "i");
function getBrowserVersion(ua) {
  if (_cachedBrowserVersion !== null && true) {
    return _cachedBrowserVersion;
  }
  const userAgent = navigator.userAgent.toLowerCase();
  const browserKind = getBrowserKind();
  let match;
  let keepMinor = false;
  switch (browserKind) {
    case BrowserKind.Edge:
      match = userAgent.match(createRegex(BROWSER_VERSION_PATTERNS.edge));
      break;
    case BrowserKind.IE:
      match = userAgent.match(createRegex(BROWSER_VERSION_PATTERNS.ie));
      break;
    case BrowserKind.WeChat:
      match = userAgent.match(createRegex(BROWSER_VERSION_PATTERNS.wechat));
      break;
    case BrowserKind.Facebook:
      match = userAgent.match(createRegex(BROWSER_VERSION_PATTERNS.facebook));
      break;
    case BrowserKind.Firefox:
      match = userAgent.match(createRegex(BROWSER_VERSION_PATTERNS.firefox));
      break;
    case BrowserKind.Instagram:
      match = userAgent.match(createRegex(BROWSER_VERSION_PATTERNS.instagram));
      break;
    case BrowserKind.Opera:
      match = userAgent.match(createRegex(BROWSER_VERSION_PATTERNS.opera));
      break;
    case BrowserKind.Brave:
    case BrowserKind.SamsungInternet:
    case BrowserKind.Chrome:
      match = userAgent.match(createRegex(BROWSER_VERSION_PATTERNS.chrome));
      break;
    case BrowserKind.Safari:
      match = userAgent.match(createRegex(BROWSER_VERSION_PATTERNS.safari1)) || userAgent.match(createRegex(BROWSER_VERSION_PATTERNS.safari2));
      keepMinor = true;
      break;
    default:
      match = null;
      break;
  }
  if (match && match.length > 1) {
    _cachedBrowserVersion = versionStringToParts(match[1], keepMinor);
    return _cachedBrowserVersion;
  }
  _cachedBrowserVersion = { major: 0, minor: 0 };
  return _cachedBrowserVersion;
}
function isAndroid() {
  const browserEngineKind = getBrowserEngineKind();
  const isItChromium = browserEngineKind === BrowserEngineKind.Chromium;
  const isItGecko = browserEngineKind === BrowserEngineKind.Gecko;
  if (!isItChromium && !isItGecko)
    return false;
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
  return isAndroid() && countTruthy(["openDatabase" in window, "android" in window]) >= 1 && !isViaBrowser();
}
function isIOSWebView() {
  return !isDesktopWebKit() && getBrowserEngineKind() === BrowserEngineKind.Webkit && countTruthy([!("SchemaDataExtractor" in window), !("browser" in window)]) >= 1;
}
function isWebView() {
  if (_cachedWebView !== null) {
    return _cachedWebView;
  }
  _cachedWebView = isAndroidWebView() || isIOSWebView();
  return _cachedWebView;
}
function isViaBrowser() {
  return countTruthy([
    "__VIA_AUTO_FILL" in window,
    "android" in window,
    "via" in window,
    "via-blob-test" in window,
    "via-dl1" in window,
    "via-fake-notification" in window,
    "via-fake-print" in window,
    "via-fake-vibrate" in window,
    "via_gm" in window
  ]) > 4;
}
function isDesktopWebKit() {
  const w = window;
  const { HTMLElement, Document } = w;
  return countTruthy([
    "safari" in w,
    // Always false in Karma and BrowserStack Automate
    !("ongestureend" in w),
    !("TouchEvent" in w),
    !("orientation" in w),
    HTMLElement && !("autocapitalize" in HTMLElement.prototype),
    Document && "pointerLockElement" in Document.prototype
  ]) >= 4;
}
function inIframe() {
  if (_cachedIframe !== null) {
    return _cachedIframe;
  }
  if (window !== window.top) {
    _cachedIframe = true;
    return _cachedIframe;
  }
  _cachedIframe = false;
  return _cachedIframe;
}
function getDocumentFocus() {
  if (document.hasFocus === void 0) {
    return false;
  }
  return document.hasFocus();
}
const isChromeLike$1 = (browserKind) => {
  return browserKind === BrowserKind.Chrome || browserKind === BrowserKind.Edge || browserKind === BrowserKind.Brave || // browserKind === BrowserKind.Opera || can't put opera here until we use the Chrome version instead of the Opera version for detecting capabilities
  browserKind === BrowserKind.SamsungInternet;
};
const supportsCaretPositionFromPoint = () => typeof document.caretPositionFromPoint === "function";
class CaretPositionFromPointEnvironment extends DetectorEnvironmentBase {
  constructor() {
    super(...arguments);
    this.browserExpectations = [
      {
        browser: {
          name: BrowserKind.Chrome,
          version: "128.0.6534.0"
        },
        scope: {
          supportsCaretPositionFromPoint: false
        }
      },
      {
        browser: {
          name: BrowserKind.Chrome,
          // caniuse mistakenly reports from 128 https://caniuse.com/?search=caretPositionFromPoint
          version: "129.0.6614.0"
        },
        scope: {
          supportsCaretPositionFromPoint: true
        }
      }
    ];
  }
  async resolveScope() {
    return {
      supportsCaretPositionFromPoint: supportsCaretPositionFromPoint()
    };
  }
}
class CaretPositionFromPointDetector extends ScoreDetectorBase {
  constructor() {
    super(...arguments);
    this.name = "detectCaretPositionFromPoint";
    this.capabilities = DEFAULT_DOM_CAPABILITIES;
    this.scoreWhenFailed = 0;
    this.environment = new CaretPositionFromPointEnvironment();
  }
  async calcScore() {
    const browserEngineKind = getBrowserEngineKind();
    if (browserEngineKind !== BrowserEngineKind.Chromium) {
      return 0;
    }
    const browserVersion = getBrowserVersion();
    const browserKind = getBrowserKind();
    const { supportsCaretPositionFromPoint: supportsCaret } = await this.environment.getCurrentScope();
    const androidDevice = isAndroid();
    const isChrome = isChromeLike$1(browserKind) && browserEngineKind === BrowserEngineKind.Chromium;
    const isOpera = browserKind === BrowserKind.Opera;
    const shouldHaveDetectCaretPositionFromPoint = isChrome && browserVersion.major >= 128 || isOpera && browserVersion.major >= 114 || isOpera && browserVersion.major >= 85 && androidDevice;
    const shouldNotHaveDetectCaretPositionFromPoint = isChrome && browserVersion.major < 128 || isOpera && browserVersion.major < 114 && !androidDevice || isOpera && browserVersion.major < 85 && androidDevice;
    if (supportsCaret && shouldNotHaveDetectCaretPositionFromPoint) {
      return 1;
    }
    if (!supportsCaret && shouldHaveDetectCaretPositionFromPoint) {
      return 1;
    }
    return 0;
  }
}
const detectCaretPositionFromPoint = new CaretPositionFromPointDetector();
const caretDetectors = [detectCaretPositionFromPoint];
const cdpDetectors = [];
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
class ErrorTraceEnvironment extends DetectorEnvironmentBase {
  async resolveScope() {
    return {};
  }
}
class ErrorTraceDetector extends ScoreDetectorBase {
  constructor() {
    super(...arguments);
    this.name = "detectErrorTrace";
    this.capabilities = DEFAULT_DOM_CAPABILITIES;
    this.scoreWhenFailed = 0;
    this.environment = new ErrorTraceEnvironment();
  }
  async calcScore() {
    const errorTrace = getErrorTrace();
    const phantomJSUserAgent = "PhantomJS";
    const phantomJSRegex = new RegExp(phantomJSUserAgent, "i");
    if (phantomJSRegex.test(errorTrace))
      return 1;
    return 0;
  }
}
const detectErrorTrace = new ErrorTraceDetector();
const errorDetectors = [detectErrorTrace];
const supportsCssIfFunction = () => CSS?.supports("color", "if(style(--test: red): blue; else: green)");
class CssIfFunctionEnvironment extends DetectorEnvironmentBase {
  constructor() {
    super(...arguments);
    this.browserExpectations = [
      {
        browser: {
          name: BrowserKind.Chrome,
          version: "137.0.7104.0"
        },
        scope: {
          cssIfFunction: false
        }
      },
      {
        browser: {
          name: BrowserKind.Chrome,
          // caiuse mistakenly reports from 137 https://caniuse.com/css-if
          version: "138.0.7152.0"
        },
        scope: {
          cssIfFunction: true
        }
      }
    ];
  }
  async resolveScope() {
    return {
      cssIfFunction: supportsCssIfFunction()
    };
  }
}
class CssIfFunctionDetector extends ScoreDetectorBase {
  constructor() {
    super(...arguments);
    this.name = "detectCssIfFunction";
    this.capabilities = CANVAS_CAPABILITIES;
    this.scoreWhenFailed = 0;
    this.environment = new CssIfFunctionEnvironment();
  }
  /**
   * Detects mismatches between the expected and actual CSS `if()` function support.
   * Uses reverse detection: if unsupported browser shows support, likely spoofed.
   * Returns:
   *  - `0`: expected and detected support match
   *  - `1`: mismatch (either false positive or false negative)
   *
   * Based on Chrome 137 release notes and compatibility matrix:
   * - Chrome 137+, Edge 137+: Supported
   * - Opera 123+: Supported (Opera uses independent versioning scheme)
   * - Firefox, Safari: Not supported (version_added: false)
   * - Android variants mirror their desktop counterparts
   */
  async calcScore() {
    const browserKind = getBrowserKind();
    const browserVersion = getBrowserVersion();
    const androidDevice = isAndroid();
    const { cssIfFunction } = await this.environment.getCurrentScope();
    let shouldSupportCssIf = false;
    switch (browserKind) {
      case BrowserKind.Chrome:
      case BrowserKind.Brave:
      case BrowserKind.Edge:
      case BrowserKind.SamsungInternet:
        if (browserVersion.major >= 137) {
          shouldSupportCssIf = true;
        }
        break;
      case BrowserKind.Opera:
        if (browserVersion.major >= 121 && !androidDevice) {
          shouldSupportCssIf = true;
        }
        if (browserVersion.major >= 90 && androidDevice) {
          shouldSupportCssIf = true;
        }
        break;
      case BrowserKind.Firefox:
      case BrowserKind.Safari:
        shouldSupportCssIf = false;
        break;
      default:
        shouldSupportCssIf = false;
        break;
    }
    return cssIfFunction !== shouldSupportCssIf ? 1 : 0;
  }
}
const detectCssIfFunction = new CssIfFunctionDetector();
const supportsCssReadingFlow = () => CSS?.supports("reading-flow", "flex-visual") || CSS?.supports("reading-order", "1");
class CssReadingFlowEnvironment extends DetectorEnvironmentBase {
  constructor() {
    super(...arguments);
    this.browserExpectations = [
      {
        browser: {
          name: BrowserKind.Chrome,
          version: "133.0.6835.0"
        },
        scope: {
          cssReadingFlow: false
        }
      },
      {
        browser: {
          name: BrowserKind.Chrome,
          // caniuse mistakenly reports from 137 https://caniuse.com/wf-reading-flow
          version: "134.0.6944.0"
        },
        scope: {
          cssReadingFlow: true
        }
      }
    ];
  }
  async resolveScope() {
    return {
      cssReadingFlow: supportsCssReadingFlow()
    };
  }
}
class CssReadingFlowDetector extends ScoreDetectorBase {
  constructor() {
    super(...arguments);
    this.name = "detectCssReadingFlow";
    this.capabilities = CANVAS_CAPABILITIES;
    this.scoreWhenFailed = 0;
    this.environment = new CssReadingFlowEnvironment();
  }
  /**
   * Detects mismatches between the expected and actual CSS reading-flow properties support.
   * Returns:
   *  - `0`: expected and detected support match
   *  - `1`: mismatch (either false positive or false negative)
   *
   * Based on Chrome 137 release notes:
   * - Chrome 137+, Edge 137+: Supported
   * - Opera 123+: Supported (Opera uses independent versioning scheme)
   * - Firefox, Safari: Not supported (too new, implementation pending)
   */
  async calcScore() {
    const browserKind = getBrowserKind();
    const browserVersion = getBrowserVersion();
    const { cssReadingFlow } = await this.environment.getCurrentScope();
    const androidDevice = isAndroid();
    let shouldSupportReadingFlow = false;
    switch (browserKind) {
      case BrowserKind.Chrome:
      case BrowserKind.Brave:
      case BrowserKind.Edge:
      case BrowserKind.SamsungInternet:
        if (browserVersion.major >= 137) {
          shouldSupportReadingFlow = true;
        }
        break;
      case BrowserKind.Opera:
        if (browserVersion.major >= 121 && !androidDevice) {
          shouldSupportReadingFlow = true;
        }
        if (browserVersion.major >= 90 && androidDevice) {
          shouldSupportReadingFlow = true;
        }
        break;
      case BrowserKind.Firefox:
      case BrowserKind.Safari:
        shouldSupportReadingFlow = false;
        break;
      default:
        shouldSupportReadingFlow = false;
        break;
    }
    return cssReadingFlow !== shouldSupportReadingFlow ? 1 : 0;
  }
}
const detectCssReadingFlow = new CssReadingFlowDetector();
const getDoesBrowserSupportFlagEmojis = () => {
  const canvas = document.createElement("canvas");
  canvas.height = 1;
  canvas.width = 1;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return false;
  }
  ctx.fillStyle = "transparent";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.font = `${canvas.height}px sans-serif`;
  const flagEmoji = "🇺🇸";
  ctx.fillStyle = "black";
  ctx.fillText(flagEmoji, 0, canvas.height);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  for (let i = 0; i < imageData.length; i += 4) {
    if (imageData[i + 3] === 0) {
      continue;
    }
    const isBlack = imageData[i] < 10 && imageData[i + 1] < 10 && imageData[i + 2] < 10;
    if (!isBlack) {
      return true;
    }
  }
  return false;
};
const isChromeLike = () => {
  const ua = navigator.userAgent;
  return /Chrome|Chromium/.test(ua);
};
class FlagEmojisEnvironment extends DetectorEnvironmentBase {
  async resolveScope() {
    let supportsFlagEmojis = false;
    try {
      supportsFlagEmojis = getDoesBrowserSupportFlagEmojis();
    } catch (error) {
    }
    return {
      supportsFlagEmojis
    };
  }
}
class FlagEmojisDetector extends ScoreDetectorBase {
  constructor() {
    super(...arguments);
    this.name = "detectFlagEmojis";
    this.capabilities = CANVAS_CAPABILITIES;
    this.scoreWhenFailed = 0;
    this.environment = new FlagEmojisEnvironment();
  }
  async calcScore() {
    const { supportsFlagEmojis } = await this.environment.getCurrentScope();
    if (navigator.platform.startsWith("Win") && isChromeLike() && supportsFlagEmojis) {
      return 0.4;
    }
    if (navigator.userAgent.includes("Windows") && isChromeLike() && supportsFlagEmojis) {
      return 0.4;
    }
    return 0;
  }
}
const detectFlagEmojis = new FlagEmojisDetector();
const supportsFontSizeAdjust = () => CSS?.supports("font-size-adjust", "0.545");
class FontSizeAdjustEnvironment extends DetectorEnvironmentBase {
  constructor() {
    super(...arguments);
    this.browserExpectations = [
      {
        browser: {
          name: BrowserKind.Chrome,
          version: "127.0.6483.0"
        },
        scope: {
          supportsFontSizeAdjust: false
        }
      },
      {
        browser: {
          name: BrowserKind.Chrome,
          // caniuse mistakenly reports from 127 https://caniuse.com/?search=font-size-adjust
          version: "128.0.6534.0"
        },
        scope: {
          supportsFontSizeAdjust: true
        }
      }
    ];
  }
  async resolveScope() {
    return {
      supportsFontSizeAdjust: supportsFontSizeAdjust()
    };
  }
}
class FontSizeAdjustDetector extends ScoreDetectorBase {
  constructor() {
    super(...arguments);
    this.name = "detectFontSizeAdjust";
    this.capabilities = CANVAS_CAPABILITIES;
    this.scoreWhenFailed = 0;
    this.environment = new FontSizeAdjustEnvironment();
  }
  /**
   * Detects mismatches between the expected and actual `font-size-adjust` support.
   * Returns:
   *  - `0`: expected and detected support match
   *  - `1`: mismatch (either false positive or false negative)
   *
   * This is used as a consistency check for CSS property support detection.
   */
  async calcScore() {
    getBrowserEngineKind();
    const browserVersion = getBrowserVersion();
    const browserKind = getBrowserKind();
    const { supportsFontSizeAdjust: detectedSupport } = await this.environment.getCurrentScope();
    const androidDevice = isAndroid();
    let shouldHaveFontSizeAdjust = false;
    switch (browserKind) {
      case BrowserKind.Chrome:
      case BrowserKind.Brave:
      case BrowserKind.SamsungInternet:
      case BrowserKind.Edge:
        if (browserVersion.major >= 127) {
          shouldHaveFontSizeAdjust = true;
        }
        break;
      case BrowserKind.Opera:
        if (browserVersion.major >= 113 && !androidDevice) {
          shouldHaveFontSizeAdjust = true;
        }
        if (browserVersion.major >= 84 && androidDevice) {
          shouldHaveFontSizeAdjust = true;
        }
        break;
      case BrowserKind.Firefox:
        if (browserVersion.major >= 3) {
          shouldHaveFontSizeAdjust = true;
        }
        break;
      case BrowserKind.Safari:
        if (browserVersion.major >= 16 && browserVersion.minor >= 4 || browserVersion.major > 16) {
          shouldHaveFontSizeAdjust = true;
        }
        break;
    }
    if (detectedSupport !== shouldHaveFontSizeAdjust) {
      return 1;
    }
    return 0;
  }
}
const detectFontSizeAdjust = new FontSizeAdjustDetector();
const supportsOffsetPathShape = () => CSS?.supports("offset-path", "shape(from 0 0, line to 10px 10px)");
class OffsetPathShapeEnvironment extends DetectorEnvironmentBase {
  constructor() {
    super(...arguments);
    this.browserExpectations = [
      {
        browser: {
          name: BrowserKind.Chrome,
          version: "137.0.7104.0"
        },
        scope: {
          supportsOffsetPathShape: false
        }
      },
      {
        browser: {
          name: BrowserKind.Chrome,
          version: "138.0.7152.0"
        },
        scope: {
          supportsOffsetPathShape: true
        }
      }
    ];
  }
  async resolveScope() {
    return {
      supportsOffsetPathShape: supportsOffsetPathShape()
    };
  }
}
class OffsetPathShapeDetector extends ScoreDetectorBase {
  constructor() {
    super(...arguments);
    this.name = "detectOffsetPathShape";
    this.capabilities = CANVAS_CAPABILITIES;
    this.scoreWhenFailed = 0;
    this.environment = new OffsetPathShapeEnvironment();
  }
  /**
   * Detects mismatches between the expected and actual offset-path shape() support.
   * Returns:
   *  - `0`: expected and detected support match
   *  - `1`: mismatch (either false positive or false negative)
   *
   * Based on Chrome 137 release notes:
   * - Chrome 137+, Edge 137+: Supported
   * - Opera 123+: Supported (Opera uses independent versioning scheme)
   * - Firefox: Limited support (check implementation status)
   * - Safari: Not supported
   */
  async calcScore() {
    const browserKind = getBrowserKind();
    const browserVersion = getBrowserVersion();
    const { supportsOffsetPathShape: detectedSupport } = await this.environment.getCurrentScope();
    const androidDevice = isAndroid();
    let shouldSupportOffsetPathShape = true;
    switch (browserKind) {
      case BrowserKind.Brave:
      case BrowserKind.Chrome:
      case BrowserKind.Edge:
        if (browserVersion.major < 135) {
          shouldSupportOffsetPathShape = false;
        }
        break;
      case BrowserKind.SamsungInternet:
        shouldSupportOffsetPathShape = false;
        break;
      case BrowserKind.Opera:
        if (browserVersion.major < 120 && !androidDevice) {
          shouldSupportOffsetPathShape = false;
        }
        if (browserVersion.major < 89 && androidDevice) {
          shouldSupportOffsetPathShape = false;
        }
        break;
      case BrowserKind.Firefox:
        if (browserVersion.major < 148) {
          shouldSupportOffsetPathShape = false;
        }
        break;
      case BrowserKind.Safari:
        if (browserVersion.major < 18 || browserVersion.major === 18 && browserVersion.minor < 4) {
          shouldSupportOffsetPathShape = false;
        }
        break;
      default:
        shouldSupportOffsetPathShape = true;
        break;
    }
    return detectedSupport !== shouldSupportOffsetPathShape ? 1 : 0;
  }
}
const detectOffsetPathShape = new OffsetPathShapeDetector();
const supportsViewTransitionMatchElement = () => CSS?.supports("view-transition-name", "match-element");
class ViewTransitionMatchElementEnvironment extends DetectorEnvironmentBase {
  constructor() {
    super(...arguments);
    this.browserExpectations = [
      {
        browser: {
          name: BrowserKind.Chrome,
          version: "137.0.7104.0"
        },
        scope: {
          supportsViewTransitionMatchElement: false
        }
      },
      {
        browser: {
          name: BrowserKind.Chrome,
          // caniuse mistakenly reports from 137 https://caniuse.com/mdn-css_properties_view-transition-name_match-element
          version: "138.0.7152.0"
        },
        scope: {
          supportsViewTransitionMatchElement: true
        }
      }
    ];
  }
  async resolveScope() {
    return {
      supportsViewTransitionMatchElement: supportsViewTransitionMatchElement()
    };
  }
}
class ViewTransitionMatchElementDetector extends ScoreDetectorBase {
  constructor() {
    super(...arguments);
    this.name = "detectViewTransitionMatchElement";
    this.capabilities = CANVAS_CAPABILITIES;
    this.scoreWhenFailed = 0;
    this.environment = new ViewTransitionMatchElementEnvironment();
  }
  /**
   * Detects mismatches between the expected and actual view-transition-name: match-element support.
   * Returns:
   *  - `0`: expected and detected support match
   *  - `1`: mismatch (either false positive or false negative)
   *
   * Based on Chrome 137 release notes:
   * - Chrome 137+, Edge 137+: Supported
   * - Opera 123+: Supported (Opera uses independent versioning scheme)
   * - Firefox, Safari: Not supported (view transitions are Chrome-specific currently)
   */
  async calcScore() {
    const browserKind = getBrowserKind();
    const browserVersion = getBrowserVersion();
    const { supportsViewTransitionMatchElement: detectedSupport } = await this.environment.getCurrentScope();
    const androidDevice = isAndroid();
    let shouldSupportViewTransition = true;
    switch (browserKind) {
      case BrowserKind.Chrome:
      case BrowserKind.Brave:
      case BrowserKind.Edge:
      case BrowserKind.SamsungInternet:
        if (browserVersion.major < 137) {
          shouldSupportViewTransition = false;
        }
        break;
      case BrowserKind.Opera:
        if (browserVersion.major < 121 && !androidDevice) {
          shouldSupportViewTransition = false;
        }
        if (browserVersion.major < 90 && androidDevice) {
          shouldSupportViewTransition = false;
        }
        break;
      case BrowserKind.Firefox:
        if (browserVersion.major < 144) {
          shouldSupportViewTransition = false;
        }
        break;
      case BrowserKind.Safari:
        if (browserVersion.major < 18)
          shouldSupportViewTransition = false;
        break;
      default:
        shouldSupportViewTransition = true;
        break;
    }
    return detectedSupport !== shouldSupportViewTransition ? 1 : 0;
  }
}
const detectViewTransitionMatchElement = new ViewTransitionMatchElementDetector();
const fontsDetectors = [
  detectCssIfFunction,
  detectCssReadingFlow,
  detectFlagEmojis,
  detectFontSizeAdjust,
  detectOffsetPathShape,
  detectViewTransitionMatchElement
];
const getEvalLength = () => {
  return eval.toString().length;
};
class EvalLengthInconsistencyEnvironment extends DetectorEnvironmentBase {
  async resolveScope() {
    return {};
  }
}
class EvalLengthInconsistencyDetector extends ScoreDetectorBase {
  constructor() {
    super(...arguments);
    this.name = "detectEvalLengthInconsistency";
    this.capabilities = WORKER_SAFE_CAPABILITIES;
    this.scoreWhenFailed = 0.1;
    this.environment = new EvalLengthInconsistencyEnvironment();
  }
  async calcScore() {
    const browserKind = getBrowserKind();
    const browserEngineKind = getBrowserEngineKind();
    const evalLength = getEvalLength();
    if (browserEngineKind === BrowserEngineKind.Unknown)
      return 0.1;
    const inconsistentWebkitGecko = evalLength === 37 && !arrayIncludes([BrowserEngineKind.Webkit, BrowserEngineKind.Gecko], browserEngineKind);
    const inconsistentIE = evalLength === 39 && !arrayIncludes([BrowserKind.IE], browserKind);
    const inconsistentChromium = evalLength === 33 && !arrayIncludes([BrowserEngineKind.Chromium], browserEngineKind);
    const inconsistent = inconsistentWebkitGecko || inconsistentIE || inconsistentChromium;
    return inconsistent ? 1 : 0;
  }
}
const detectEvalLengthInconsistency = new EvalLengthInconsistencyDetector();
const getFunctionBind = () => {
  if (Function.prototype.bind === void 0) {
    throw new Error("Function.prototype.bind is undefined");
  }
  return Function.prototype.bind.toString();
};
class FunctionBindEnvironment extends DetectorEnvironmentBase {
  async resolveScope() {
    return {};
  }
}
class FunctionBindDetector extends ScoreDetectorBase {
  constructor() {
    super(...arguments);
    this.name = "detectFunctionBind";
    this.capabilities = WORKER_SAFE_CAPABILITIES;
    this.scoreWhenFailed = 1;
    this.environment = new FunctionBindEnvironment();
  }
  async calcScore() {
    getFunctionBind();
    return 0;
  }
}
const detectFunctionBind = new FunctionBindDetector();
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
class PluginsArrayEnvironment extends DetectorEnvironmentBase {
  async resolveScope() {
    return {};
  }
}
class PluginsArrayDetector extends ScoreDetectorBase {
  constructor() {
    super(...arguments);
    this.name = "detectPluginsArray";
    this.capabilities = WORKER_SAFE_CAPABILITIES;
    this.scoreWhenFailed = 0;
    this.environment = new PluginsArrayEnvironment();
  }
  async calcScore() {
    const pluginsArray = getPluginsArray();
    if (!pluginsArray)
      return 1;
    return 0;
  }
}
const detectPluginsArray = new PluginsArrayDetector();
const getPluginsLength = () => {
  if (navigator.plugins === void 0) {
    throw new Error("navigator.plugins is undefined");
  }
  if (navigator.plugins.length === void 0) {
    throw new Error("navigator.plugins.length is undefined");
  }
  return navigator.plugins.length;
};
class PluginsLengthInconsistencyEnvironment extends DetectorEnvironmentBase {
  async resolveScope() {
    return {};
  }
}
class PluginsLengthInconsistencyDetector extends ScoreDetectorBase {
  constructor() {
    super(...arguments);
    this.name = "detectPluginsLengthInconsistency";
    this.capabilities = WORKER_SAFE_CAPABILITIES;
    this.scoreWhenFailed = 0;
    this.environment = new PluginsLengthInconsistencyEnvironment();
  }
  async calcScore() {
    const pluginsLength = getPluginsLength();
    const android = isAndroid();
    const browserKind = getBrowserKind();
    const browserEngineKind = getBrowserEngineKind();
    if (!isChromeLike$1(browserKind) || android || browserEngineKind !== BrowserEngineKind.Chromium)
      return 0;
    if (pluginsLength === 0)
      return 1;
    return 0;
  }
}
const detectPluginsLengthInconsistency = new PluginsLengthInconsistencyDetector();
const getRTT = () => {
  if (navigator.connection === void 0) {
    throw new BotdError(State.Undefined, "navigator.connection is undefined");
  }
  if (navigator.connection.rtt === void 0) {
    throw new BotdError(State.Undefined, "navigator.connection.rtt is undefined");
  }
  return navigator.connection.rtt;
};
class RttEnvironment extends DetectorEnvironmentBase {
  async resolveScope() {
    return {};
  }
}
class RttDetector extends ScoreDetectorBase {
  constructor() {
    super(...arguments);
    this.name = "detectRTT";
    this.capabilities = WORKER_SAFE_CAPABILITIES;
    this.scoreWhenFailed = 0;
    this.environment = new RttEnvironment();
  }
  async calcScore() {
    const rtt = getRTT();
    const android = isAndroid();
    if (android)
      return 0;
    if (rtt === 0)
      return 0.2;
    return 0;
  }
}
const detectRTT = new RttDetector();
const getWindowSize = () => ({
  outerWidth: window.outerWidth,
  outerHeight: window.outerHeight,
  innerWidth: window.innerWidth,
  innerHeight: window.innerHeight
});
class WindowSizeEnvironment extends DetectorEnvironmentBase {
  async resolveScope() {
    return {
      windowSize: getWindowSize(),
      documentFocus: getDocumentFocus()
    };
  }
}
class WindowSizeDetector extends ScoreDetectorBase {
  constructor() {
    super(...arguments);
    this.name = "detectWindowSize";
    this.capabilities = DEFAULT_DOM_CAPABILITIES;
    this.scoreWhenFailed = 0;
    this.environment = new WindowSizeEnvironment();
  }
  async calcScore() {
    const { windowSize, documentFocus } = await this.environment.getCurrentScope();
    const { outerWidth, outerHeight } = windowSize;
    if (!documentFocus)
      return 0;
    if (outerWidth === 0 && outerHeight === 0)
      return 1;
    return 0;
  }
}
const detectWindowSize = new WindowSizeDetector();
const headlessDetectors = [
  detectPluginsArray,
  detectPluginsLengthInconsistency,
  detectRTT,
  detectWindowSize
];
const incognitoDetectors = [];
const getLanguages = () => {
  const n = navigator;
  const result = [];
  const language = n.language || n.userLanguage || n.browserLanguage || n.systemLanguage;
  if (language !== void 0) {
    result.push([language]);
  }
  if (Array.isArray(n.languages)) {
    try {
      const browserEngine = getBrowserEngineKind();
      const browserVersion = getBrowserVersion();
      const isChromium86OrNewer = browserEngine === BrowserEngineKind.Chromium && browserVersion.major >= 86;
      if (!isChromium86OrNewer) {
        result.push(n.languages);
      }
    } catch (error) {
      result.push(n.languages);
    }
  } else if (typeof n.languages === "string") {
    const languages = n.languages;
    if (languages) {
      result.push(languages.split(","));
    }
  }
  return result;
};
class LanguageEnvironment extends DetectorEnvironmentBase {
  async resolveScope() {
    return {
      languages: getLanguages()
    };
  }
}
class LanguageDetector extends ScoreDetectorBase {
  constructor() {
    super(...arguments);
    this.name = "detectLanguage";
    this.capabilities = WORKER_SAFE_CAPABILITIES;
    this.scoreWhenFailed = 0.1;
    this.environment = new LanguageEnvironment();
  }
  async calcScore() {
    const { languages } = await this.environment.getCurrentScope();
    if (languages.length === 0) {
      return 1;
    }
    return 0;
  }
}
const detectLanguage = new LanguageDetector();
const languageDetectors = [detectLanguage];
const areMimeTypesConsistent = () => {
  if (navigator.mimeTypes === void 0) {
    throw new BotdError(State.Undefined, "navigator.mimeTypes is undefined");
  }
  const { mimeTypes } = navigator;
  let isConsistent = Object.getPrototypeOf(mimeTypes) === MimeTypeArray.prototype;
  for (let i = 0; i < mimeTypes.length; i++) {
    isConsistent && (isConsistent = Object.getPrototypeOf(mimeTypes[i]) === MimeType.prototype);
  }
  return isConsistent;
};
class MimeTypesConsistentEnvironment extends DetectorEnvironmentBase {
  async resolveScope() {
    return {
      areMimeTypesConsistent: areMimeTypesConsistent()
    };
  }
}
class MimeTypesConsistentDetector extends ScoreDetectorBase {
  constructor() {
    super(...arguments);
    this.name = "detectMimeTypesConsistent";
    this.capabilities = WORKER_SAFE_CAPABILITIES;
    this.scoreWhenFailed = 0;
    this.environment = new MimeTypesConsistentEnvironment();
  }
  async calcScore() {
    const { areMimeTypesConsistent: areMimeTypesConsistent2 } = await this.environment.getCurrentScope();
    if (!areMimeTypesConsistent2)
      return 1;
    return 0;
  }
}
const detectMimeTypesConsistent = new MimeTypesConsistentDetector();
class PlatformSetManuallyEnvironment extends DetectorEnvironmentBase {
  async resolveScope() {
    return {};
  }
}
class PlatformSetManuallyDetector extends ScoreDetectorBase {
  constructor() {
    super(...arguments);
    this.name = "detectPlatformSetManually";
    this.capabilities = WORKER_SAFE_CAPABILITIES;
    this.scoreWhenFailed = 1;
    this.environment = new PlatformSetManuallyEnvironment();
  }
  async calcScore() {
    await delay(50);
    const platform = navigator.platform || "unknown";
    Object.defineProperty(navigator, "platform", {
      get: () => platform
    });
    return 0;
  }
}
const detectPlatformSetManually = new PlatformSetManuallyDetector();
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const getProductSub = () => {
  const { productSub } = navigator;
  if (productSub === void 0) {
    throw new Error("navigator.productSub is undefined");
  }
  return productSub;
};
class ProductSubEnvironment extends DetectorEnvironmentBase {
  async resolveScope() {
    return {
      productSub: getProductSub()
    };
  }
}
class ProductSubDetector extends ScoreDetectorBase {
  constructor() {
    super(...arguments);
    this.name = "detectProductSub";
    this.capabilities = WORKER_SAFE_CAPABILITIES;
    this.scoreWhenFailed = 0;
    this.environment = new ProductSubEnvironment();
  }
  async calcScore() {
    const { productSub } = await this.environment.getCurrentScope();
    const browserKind = getBrowserKind();
    if ((isChromeLike$1(browserKind) || browserKind === BrowserKind.Safari || browserKind === BrowserKind.Opera || browserKind === BrowserKind.WeChat) && productSub !== "20030107")
      return 1;
    return 0;
  }
}
const detectProductSub = new ProductSubDetector();
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
class NotificationPermissionsEnvironment extends DetectorEnvironmentBase {
  async resolveScope() {
    return {
      notificationPermissions: await getNotificationPermissions()
    };
  }
}
class NotificationPermissionsDetector extends ScoreDetectorBase {
  constructor() {
    super(...arguments);
    this.name = "detectNotificationPermissions";
    this.capabilities = DEFAULT_DOM_CAPABILITIES;
    this.scoreWhenFailed = 0;
    this.environment = new NotificationPermissionsEnvironment();
  }
  async calcScore() {
    const { notificationPermissions } = await this.environment.getCurrentScope();
    const browserKind = getBrowserKind();
    if (!isChromeLike$1(browserKind))
      return 0;
    if (notificationPermissions && browserKind !== BrowserKind.SamsungInternet) {
      return 1;
    }
    return 0;
  }
}
const detectNotificationPermissions = new NotificationPermissionsDetector();
const notificationDetectors = [
  detectNotificationPermissions
];
const resistanceDetectors = [];
const instanceId = String.fromCharCode(Math.random() * 26 + 97) + Math.random().toString(36).slice(-7);
const detectIframeProxyFn = () => {
  try {
    const iframe = document.createElement("iframe");
    iframe.srcdoc = instanceId;
    return iframe.contentWindow ? 0.5 : 0;
  } catch (err) {
    return 0.2;
  }
};
const detectHighChromeIndexFn = () => {
  const key = "chrome";
  const highIndexRange = -50;
  return Object.keys(window).slice(highIndexRange).includes(key) && Object.getOwnPropertyNames(window).slice(highIndexRange).includes(key) && !window.Opr ? 0.5 : 0;
};
const detectBadChromeRuntimeFn = () => {
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
const detectTempProfileFn = () => {
  return navigator.userAgent.includes("chrome_user_data_") ? 0.2 : 0;
};
const detectStealthFn = () => {
  const iframeScore = detectIframeProxyFn();
  const chromeIndexScore = detectHighChromeIndexFn();
  const runtimeScore = detectBadChromeRuntimeFn();
  const tempProfileScore = detectTempProfileFn();
  return Math.max(iframeScore, chromeIndexScore, runtimeScore, tempProfileScore);
};
class StealthEnvironment extends DetectorEnvironmentBase {
  async resolveScope() {
    return {};
  }
}
class StealthDetector extends ScoreDetectorBase {
  constructor() {
    super(...arguments);
    this.name = "detectStealth";
    this.capabilities = DEFAULT_DOM_CAPABILITIES;
    this.scoreWhenFailed = 0;
    this.environment = new StealthEnvironment();
  }
  async calcScore() {
    return detectStealthFn();
  }
}
class IframeProxyDetector extends ScoreDetectorBase {
  constructor() {
    super(...arguments);
    this.name = "detectIframeProxy";
    this.capabilities = DEFAULT_DOM_CAPABILITIES;
    this.scoreWhenFailed = 0;
    this.environment = new StealthEnvironment();
  }
  async calcScore() {
    return detectIframeProxyFn();
  }
}
class TempProfileDetector extends ScoreDetectorBase {
  constructor() {
    super(...arguments);
    this.name = "detectTempProfile";
    this.capabilities = DEFAULT_DOM_CAPABILITIES;
    this.scoreWhenFailed = 0;
    this.environment = new StealthEnvironment();
  }
  async calcScore() {
    return detectTempProfileFn();
  }
}
class HighChromeIndexDetector extends ScoreDetectorBase {
  constructor() {
    super(...arguments);
    this.name = "detectHighChromeIndex";
    this.capabilities = DEFAULT_DOM_CAPABILITIES;
    this.scoreWhenFailed = 0;
    this.environment = new StealthEnvironment();
  }
  async calcScore() {
    return detectHighChromeIndexFn();
  }
}
class BadChromeRuntimeDetector extends ScoreDetectorBase {
  constructor() {
    super(...arguments);
    this.name = "detectBadChromeRuntime";
    this.capabilities = DEFAULT_DOM_CAPABILITIES;
    this.scoreWhenFailed = 0;
    this.environment = new StealthEnvironment();
  }
  async calcScore() {
    return detectBadChromeRuntimeFn();
  }
}
new StealthDetector();
const detectIframeProxy = new IframeProxyDetector();
const detectTempProfile = new TempProfileDetector();
const detectHighChromeIndex = new HighChromeIndexDetector();
const detectBadChromeRuntime = new BadChromeRuntimeDetector();
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
    throw new BotdError(State.NotFunction, "HTMLCanvasElement.getContext is not a function");
  }
  const webGLContext = canvasElement.getContext("webgl");
  if (webGLContext === null) {
    throw new BotdError(State.Null, "WebGLRenderingContext is null");
  }
  if (typeof webGLContext.getParameter !== "function") {
    throw new BotdError(State.NotFunction, "WebGLRenderingContext.getParameter is not a function");
  }
  const vendor = webGLContext.getParameter(webGLContext.VENDOR);
  const renderer = webGLContext.getParameter(webGLContext.RENDERER);
  return { vendor, renderer };
};
class WebGLEnvironment extends DetectorEnvironmentBase {
  async resolveScope() {
    return {
      webGL: getWebGL()
    };
  }
}
class WebGLDetector extends ScoreDetectorBase {
  constructor() {
    super(...arguments);
    this.name = "detectWebGL";
    this.capabilities = CANVAS_CAPABILITIES;
    this.scoreWhenFailed = 0.1;
    this.environment = new WebGLEnvironment();
  }
  async calcScore() {
    const { vendor, renderer } = (await this.environment.getCurrentScope()).webGL;
    if (vendor === "Brian Paul" && renderer === "Mesa OffScreen") {
      return 1;
    }
    return 0;
  }
}
const detectWebGL = new WebGLDetector();
const webGlDetectors = [detectWebGL];
const getWebDriver = () => {
  if (navigator.webdriver === void 0) {
    throw new BotdError(State.Undefined, "navigator.webdriver is undefined");
  }
  return navigator.webdriver;
};
class WebDriverEnvironment extends DetectorEnvironmentBase {
  async resolveScope() {
    return {
      supportsWebdriver: getWebDriver()
    };
  }
}
class WebDriverDetector extends ScoreDetectorBase {
  constructor() {
    super(...arguments);
    this.name = "detectWebDriver";
    this.capabilities = WORKER_SAFE_CAPABILITIES;
    this.scoreWhenFailed = 0;
    this.environment = new WebDriverEnvironment();
  }
  async calcScore() {
    const { supportsWebdriver } = await this.environment.getCurrentScope();
    if (supportsWebdriver)
      return 1;
    return 0;
  }
}
const detectWebDriver = new WebDriverDetector();
const webdriverDetectors = [detectWebDriver];
const supportsLocalAiSummarizer = () => {
  return void 0 !== window.Summarizer;
};
class AiEnvironment extends DetectorEnvironmentBase {
  constructor() {
    super(...arguments);
    this.browserExpectations = [
      {
        browser: {
          name: BrowserKind.Chrome,
          version: "139.0.7205.0"
        },
        scope: {
          supportsWindowAi: false,
          isSecureContext: true
        }
      },
      {
        browser: {
          name: BrowserKind.Chrome,
          // https://chromestatus.com/feature/5193953788559360
          version: "140.0.7259.0"
        },
        scope: {
          supportsWindowAi: true,
          isSecureContext: true
        }
      }
    ];
  }
  async resolveScope() {
    return {
      supportsWindowAi: supportsLocalAiSummarizer(),
      isSecureContext: window.isSecureContext
    };
  }
}
class AiDetector extends ScoreDetectorBase {
  constructor() {
    super(...arguments);
    this.name = "detectAI";
    this.capabilities = DEFAULT_DOM_CAPABILITIES;
    this.scoreWhenFailed = 0;
    this.environment = new AiEnvironment();
  }
  async calcScore() {
    const browserKind = getBrowserKind();
    const browserVersion = getBrowserVersion();
    const browserIsAndroid = isAndroid();
    const { supportsWindowAi, isSecureContext } = await this.environment.getCurrentScope();
    let shouldSupportAi = false;
    switch (browserKind) {
      case BrowserKind.Chrome:
        if (!browserIsAndroid && browserVersion.major >= 138) {
          shouldSupportAi = isSecureContext;
        }
        break;
      case BrowserKind.Edge:
        if (!browserIsAndroid && browserVersion.major >= 138) {
          shouldSupportAi = isSecureContext;
        }
        break;
      case BrowserKind.Brave:
      case BrowserKind.SamsungInternet:
        shouldSupportAi = false;
        break;
      case BrowserKind.Opera:
        if (!browserIsAndroid && browserVersion.major >= 122) {
          shouldSupportAi = isSecureContext;
        }
        break;
      case BrowserKind.Firefox:
      case BrowserKind.Safari:
        shouldSupportAi = false;
        break;
      default:
        shouldSupportAi = false;
        break;
    }
    return supportsWindowAi !== shouldSupportAi ? 1 : 0;
  }
}
const detectAI = new AiDetector();
const getDistinctiveProperties = () => {
  const distinctivePropsList = {
    [getBotKind("Awesomium")]: {
      window: ["awesomium"]
    },
    [getBotKind("Cef")]: {
      window: ["RunPerfTest"]
    },
    [getBotKind("CefSharp")]: {
      window: ["CefSharp"]
    },
    [getBotKind("CoachJS")]: {
      window: ["emit"]
    },
    [getBotKind("FMiner")]: {
      window: ["fmget_targets"]
    },
    [getBotKind("Geb")]: {
      window: ["geb"]
    },
    [getBotKind("NightmareJS")]: {
      window: ["__nightmare", "nightmare"]
    },
    [getBotKind("Phantomas")]: {
      window: ["__phantomas"]
    },
    [getBotKind("PhantomJS")]: {
      window: ["callPhantom", "_phantom"]
    },
    [getBotKind("Rhino")]: {
      window: ["spawn"]
    },
    [getBotKind("Selenium")]: {
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
    [getBotKind("WebDriverIO")]: {
      window: ["wdioElectron"]
    },
    [getBotKind("WebDriver")]: {
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
    [getBotKind("HeadlessChrome")]: {
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
class DistinctivePropertiesEnvironment extends DetectorEnvironmentBase {
  async resolveScope() {
    return {
      distinctiveProperties: getDistinctiveProperties()
    };
  }
}
class DistinctivePropertiesDetector extends ScoreDetectorBase {
  constructor() {
    super(...arguments);
    this.name = "detectDistinctiveProperties";
    this.capabilities = DEFAULT_DOM_CAPABILITIES;
    this.scoreWhenFailed = 0;
    this.environment = new DistinctivePropertiesEnvironment();
  }
  async calcScore() {
    const { distinctiveProperties } = await this.environment.getCurrentScope();
    const value = distinctiveProperties;
    let bot;
    for (bot in value)
      if (value[bot])
        return 1;
    return 0;
  }
}
const detectDistinctiveProperties = new DistinctivePropertiesDetector();
const getDocumentElementKeys = () => {
  if (document.documentElement === void 0) {
    throw new Error("document.documentElement is undefined");
  }
  const { documentElement } = document;
  if (typeof documentElement.getAttributeNames !== "function") {
    throw new Error("document.documentElement.getAttributeNames is not a function");
  }
  return documentElement.getAttributeNames();
};
class DocumentAttributesEnvironment extends DetectorEnvironmentBase {
  async resolveScope() {
    return {
      documentElementKeys: getDocumentElementKeys()
    };
  }
}
class DocumentAttributesDetector extends ScoreDetectorBase {
  constructor() {
    super(...arguments);
    this.name = "detectDocumentAttributes";
    this.capabilities = DEFAULT_DOM_CAPABILITIES;
    this.scoreWhenFailed = 0;
    this.environment = new DocumentAttributesEnvironment();
  }
  async calcScore() {
    const { documentElementKeys } = await this.environment.getCurrentScope();
    if (includes(documentElementKeys, "selenium", "webdriver", "driver")) {
      return 1;
    }
    return 0;
  }
}
const detectDocumentAttributes = new DocumentAttributesDetector();
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
class ProcessEnvironment extends DetectorEnvironmentBase {
  async resolveScope() {
    let process = {};
    try {
      process = getProcess();
    } catch (error) {
    }
    return {
      process
    };
  }
}
class ProcessDetector extends ScoreDetectorBase {
  constructor() {
    super(...arguments);
    this.name = "detectProcess";
    this.capabilities = DEFAULT_DOM_CAPABILITIES;
    this.scoreWhenFailed = 0;
    this.environment = new ProcessEnvironment();
  }
  async calcScore() {
    const { process } = await this.environment.getCurrentScope();
    if (
      // Use process.type === "renderer" to detect Electron
      process.type === "renderer" || process.versions?.electron != null
    ) {
      return 1;
    }
    return 0;
  }
}
const detectProcess = new ProcessDetector();
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
class WindowExternalEnvironment extends DetectorEnvironmentBase {
  async resolveScope() {
    return {
      windowExternal: getWindowExternal()
    };
  }
}
class WindowExternalDetector extends ScoreDetectorBase {
  constructor() {
    super(...arguments);
    this.name = "detectWindowExternal";
    this.capabilities = DEFAULT_DOM_CAPABILITIES;
    this.scoreWhenFailed = 0;
    this.environment = new WindowExternalEnvironment();
  }
  async calcScore() {
    const { windowExternal } = await this.environment.getCurrentScope();
    if (/Sequentum/i.test(windowExternal))
      return 1;
    return 0;
  }
}
const detectWindowExternal = new WindowExternalDetector();
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
  ...languageDetectors,
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
function filterDetectors(detectors2, filter) {
  return detectors2.filter((detector) => filter(detector.capabilities));
}
function getWorkerSafeDetectors() {
  return filterDetectors(detectors, (caps) => caps.workerSafe);
}
function getMainThreadDetectors() {
  return filterDetectors(detectors, (caps) => !caps.workerSafe);
}
function encodeTriggeredBitfield(triggeredIndices, detectorCount) {
  const byteCount = Math.ceil(detectorCount / 8);
  const bytes = new Uint8Array(byteCount);
  for (const idx of triggeredIndices) {
    if (idx >= 0 && idx < detectorCount) {
      bytes[Math.floor(idx / 8)] |= 1 << idx % 8;
    }
  }
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}
const botScore = async () => {
  try {
    const { default: getBotScoreWorkerManager2 } = await Promise.resolve().then(() => BotScoreWorkerManager$1);
    const workerManager = getBotScoreWorkerManager2();
    const { workerScores, mainThreadScores } = await workerManager.calculateBotScore();
    const scores = [...workerScores, ...mainThreadScores];
    const workerSafeList = getWorkerSafeDetectors();
    const mainThreadList = getMainThreadDetectors();
    const triggeredIndices = [];
    for (let i = 0; i < workerScores.length && i < workerSafeList.length; i++) {
      if (workerScores[i] > 0) {
        const canonicalIndex = detectors.indexOf(workerSafeList[i]);
        if (canonicalIndex >= 0)
          triggeredIndices.push(canonicalIndex);
      }
    }
    for (let i = 0; i < mainThreadScores.length && i < mainThreadList.length; i++) {
      if (mainThreadScores[i] > 0) {
        const canonicalIndex = detectors.indexOf(mainThreadList[i]);
        if (canonicalIndex >= 0)
          triggeredIndices.push(canonicalIndex);
      }
    }
    return { scores, triggeredIndices };
  } catch (error) {
    console.warn("Worker-based bot score calculation failed, falling back to main thread:", error);
    const allScores = await Promise.all(detectors.map(async (detector) => detector.getDetectedScore()));
    const triggeredIndices = allScores.map((score, index) => score > 0 ? index : -1).filter((index) => index >= 0);
    return { scores: allScores, triggeredIndices };
  }
};
const botScoreWorkerSafe = async () => {
  const workerSafeDetectors = getWorkerSafeDetectors();
  return Promise.all(workerSafeDetectors.map(async (detector) => detector.getDetectedScore()));
};
const botScoreMainThread = async () => {
  const mainThreadDetectors = getMainThreadDetectors();
  return Promise.all(mainThreadDetectors.map(async (detector) => detector.getDetectedScore()));
};
const hasTouchSupport = () => {
  return "ontouchstart" in window || navigator.maxTouchPoints > 0 ? "mobile" : "desktop";
};
const MAGIC = [0, 97, 115, 109];
const VERSION = [1, 0, 0, 0];
const TYPE_I32 = 127;
const TYPE_V128 = 123;
const TYPE_FUNC = 96;
const BLOCKTYPE_EMPTY = 64;
const OP_BLOCK = 2;
const OP_LOOP = 3;
const OP_BR = 12;
const OP_BR_IF = 13;
const OP_END = 11;
const OP_LOCAL_GET = 32;
const OP_LOCAL_SET = 33;
const OP_I32_CONST = 65;
const OP_I32_ADD = 106;
const OP_I32_GE_S = 78;
const SIMD_PREFIX = 253;
const SIMD_V128_CONST = 12;
const SIMD_I32X4_EXTRACT_LANE = 27;
const uleb128 = (n) => {
  const out = [];
  let x = n >>> 0;
  do {
    let b = x & 127;
    x = x >>> 7;
    if (x !== 0)
      b |= 128;
    out.push(b);
  } while (x !== 0);
  return out;
};
const section = (id, body) => [
  id,
  ...uleb128(body.length),
  ...body
];
const encodeName = (s) => {
  const bytes = new TextEncoder().encode(s);
  return [...uleb128(bytes.length), ...bytes];
};
const simdOp = (opcode) => [SIMD_PREFIX, ...uleb128(opcode)];
const v128Const = (bytes) => {
  if (bytes.length !== 16) {
    throw new Error("v128.const requires exactly 16 bytes");
  }
  return [SIMD_PREFIX, SIMD_V128_CONST, ...Array.from(bytes)];
};
const buildSimdLoopModule = (op) => {
  const typeSection = section(1, [
    1,
    TYPE_FUNC,
    1,
    TYPE_I32,
    // params
    1,
    TYPE_I32
    // results
  ]);
  const funcSection = section(3, [1, 0]);
  const exportSection = section(7, [
    1,
    ...encodeName("run"),
    0,
    0
    // kind func, index 0
  ]);
  const localDecls = [
    2,
    // two distinct local groups
    1,
    TYPE_I32,
    1,
    TYPE_V128
  ];
  const body = [
    ...localDecls,
    // acc = v128(init)
    ...v128Const(op.init),
    OP_LOCAL_SET,
    2,
    // block
    OP_BLOCK,
    BLOCKTYPE_EMPTY,
    // loop
    OP_LOOP,
    BLOCKTYPE_EMPTY,
    // if (i >= iters) br_if 1
    OP_LOCAL_GET,
    1,
    OP_LOCAL_GET,
    0,
    OP_I32_GE_S,
    OP_BR_IF,
    1,
    // acc = simd_op(acc, step)
    OP_LOCAL_GET,
    2,
    ...v128Const(op.step),
    ...simdOp(op.opcode),
    OP_LOCAL_SET,
    2,
    // i = i + 1
    OP_LOCAL_GET,
    1,
    OP_I32_CONST,
    1,
    OP_I32_ADD,
    OP_LOCAL_SET,
    1,
    // br 0 (continue loop)
    OP_BR,
    0,
    OP_END,
    // end loop
    OP_END,
    // end block
    // extract lane 0 (as i32 bit pattern) so the result is observable
    OP_LOCAL_GET,
    2,
    SIMD_PREFIX,
    SIMD_I32X4_EXTRACT_LANE,
    0,
    OP_END
    // end function
  ];
  const codeSection = section(10, [1, ...uleb128(body.length), ...body]);
  return new Uint8Array([
    ...MAGIC,
    ...VERSION,
    ...typeSection,
    ...funcSection,
    ...exportSection,
    ...codeSection
  ]);
};
const buildShuffleLoopModule = (init, step, indices) => {
  if (indices.length !== 16) {
    throw new Error("i8x16.shuffle requires 16 lane indices");
  }
  const typeSection = section(1, [1, TYPE_FUNC, 1, TYPE_I32, 1, TYPE_I32]);
  const funcSection = section(3, [1, 0]);
  const exportSection = section(7, [1, ...encodeName("run"), 0, 0]);
  const localDecls = [2, 1, TYPE_I32, 1, TYPE_V128];
  const body = [
    ...localDecls,
    ...v128Const(init),
    OP_LOCAL_SET,
    2,
    OP_BLOCK,
    BLOCKTYPE_EMPTY,
    OP_LOOP,
    BLOCKTYPE_EMPTY,
    OP_LOCAL_GET,
    1,
    OP_LOCAL_GET,
    0,
    OP_I32_GE_S,
    OP_BR_IF,
    1,
    // acc = i8x16.shuffle(acc, step, indices)
    OP_LOCAL_GET,
    2,
    ...v128Const(step),
    SIMD_PREFIX,
    13,
    // i8x16.shuffle
    ...Array.from(indices),
    OP_LOCAL_SET,
    2,
    OP_LOCAL_GET,
    1,
    OP_I32_CONST,
    1,
    OP_I32_ADD,
    OP_LOCAL_SET,
    1,
    OP_BR,
    0,
    OP_END,
    OP_END,
    OP_LOCAL_GET,
    2,
    SIMD_PREFIX,
    SIMD_I32X4_EXTRACT_LANE,
    0,
    OP_END
  ];
  const codeSection = section(10, [1, ...uleb128(body.length), ...body]);
  return new Uint8Array([
    ...MAGIC,
    ...VERSION,
    ...typeSection,
    ...funcSection,
    ...exportSection,
    ...codeSection
  ]);
};
const f32x4Bytes = (a, b, c, d) => {
  const buf = new ArrayBuffer(16);
  const view = new DataView(buf);
  view.setFloat32(0, a, true);
  view.setFloat32(4, b, true);
  view.setFloat32(8, c, true);
  view.setFloat32(12, d, true);
  return new Uint8Array(buf);
};
const i32x4Bytes = (a, b, c, d) => {
  const buf = new ArrayBuffer(16);
  const view = new DataView(buf);
  view.setInt32(0, a | 0, true);
  view.setInt32(4, b | 0, true);
  view.setInt32(8, c | 0, true);
  view.setInt32(12, d | 0, true);
  return new Uint8Array(buf);
};
const i16x8Bytes = (a, b, c, d, e, f, g, h) => {
  const buf = new ArrayBuffer(16);
  const view = new DataView(buf);
  view.setInt16(0, a, true);
  view.setInt16(2, b, true);
  view.setInt16(4, c, true);
  view.setInt16(6, d, true);
  view.setInt16(8, e, true);
  view.setInt16(10, f, true);
  view.setInt16(12, g, true);
  view.setInt16(14, h, true);
  return new Uint8Array(buf);
};
const buildSimdProbeModule = () => {
  const typeSection = section(1, [1, TYPE_FUNC, 0, 0]);
  const funcSection = section(3, [1, 0]);
  const exportSection = section(7, [1, ...encodeName("p"), 0, 0]);
  const zeros = new Uint8Array(16);
  const body = [
    0,
    // no locals
    ...v128Const(zeros),
    26,
    // drop
    OP_END
  ];
  const codeSection = section(10, [1, ...uleb128(body.length), ...body]);
  return new Uint8Array([
    ...MAGIC,
    ...VERSION,
    ...typeSection,
    ...funcSection,
    ...exportSection,
    ...codeSection
  ]);
};
const OPCODE_V128_XOR = 81;
const OPCODE_I16X8_MUL = 149;
const OPCODE_I32X4_ADD = 174;
const OPCODE_I32X4_MUL = 181;
const OPCODE_F32X4_ADD = 228;
const OPCODE_F32X4_MUL = 230;
const OPCODE_F32X4_DIV = 231;
const v128BinaryOp = (name, category, spec) => ({
  name,
  category,
  buildModule: () => buildSimdLoopModule(spec)
});
const SHUFFLE_INDICES = new Uint8Array([
  15,
  1,
  14,
  2,
  13,
  3,
  12,
  4,
  11,
  5,
  10,
  6,
  9,
  7,
  8,
  0
]);
const SIMD_BENCHMARKS = [
  v128BinaryOp("f32x4_add", "FP", {
    opcode: OPCODE_F32X4_ADD,
    init: f32x4Bytes(1.1, 2.2, 3.3, 4.4),
    step: f32x4Bytes(1e-4, -1e-4, 2e-4, -2e-4)
  }),
  v128BinaryOp("f32x4_mul", "FP", {
    opcode: OPCODE_F32X4_MUL,
    init: f32x4Bytes(1.000001, 1.000002, 0.999999, 0.999998),
    step: f32x4Bytes(1.0000001, 0.9999999, 1.0000002, 0.9999998)
  }),
  v128BinaryOp("f32x4_div", "FP", {
    opcode: OPCODE_F32X4_DIV,
    init: f32x4Bytes(1, 2, 3, 4),
    step: f32x4Bytes(1.0000001, 0.9999999, 1.0000002, 0.9999998)
  }),
  v128BinaryOp("i32x4_add", "INT", {
    opcode: OPCODE_I32X4_ADD,
    init: i32x4Bytes(1, 2, 3, 4),
    step: i32x4Bytes(7, -3, 11, -5)
  }),
  v128BinaryOp("i32x4_mul", "INT", {
    opcode: OPCODE_I32X4_MUL,
    init: i32x4Bytes(1, 1, 1, 1),
    step: i32x4Bytes(3, 5, 7, 11)
  }),
  v128BinaryOp("i16x8_mul", "INT", {
    opcode: OPCODE_I16X8_MUL,
    init: i16x8Bytes(1, 1, 1, 1, 1, 1, 1, 1),
    step: i16x8Bytes(3, 5, 7, 11, 13, 17, 19, 23)
  }),
  v128BinaryOp("v128_xor", "BIT", {
    opcode: OPCODE_V128_XOR,
    init: i32x4Bytes(1431655765, 2863311530, 858993459, 3435973836),
    step: i32x4Bytes(305419896, 2596069104, 252645135, 4042322160)
  }),
  {
    name: "i8x16_shuffle",
    category: "PERM",
    buildModule: () => buildShuffleLoopModule(i32x4Bytes(16909060, 84281096, 151653132, 219025168), i32x4Bytes(286397204, 353769240, 421141276, 488513312), SHUFFLE_INDICES)
  }
];
const SCHEMA_VERSION = 1;
const DEFAULTS = {
  targetMsPerRun: 15,
  runsPerOp: 3,
  budgetMs: 600
};
const median = (xs) => {
  if (xs.length === 0)
    return 0;
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = sorted.length >>> 1;
  if (sorted.length % 2 === 0)
    return (sorted[mid - 1] + sorted[mid]) / 2;
  return sorted[mid];
};
const estimateTimerResolution = () => {
  let best = Number.POSITIVE_INFINITY;
  let t0 = performance.now();
  for (let i = 0; i < 20; i++) {
    let t1 = performance.now();
    while (t1 === t0)
      t1 = performance.now();
    const delta = t1 - t0;
    if (delta > 0 && delta < best)
      best = delta;
    t0 = t1;
  }
  return Number.isFinite(best) ? best : 0;
};
const isSimdSupported = () => {
  if (typeof WebAssembly === "undefined")
    return false;
  if (typeof WebAssembly.validate !== "function")
    return false;
  try {
    return WebAssembly.validate(buildSimdProbeModule());
  } catch {
    return false;
  }
};
const instantiateRun = async (bytes) => {
  const { instance: instance2 } = await WebAssembly.instantiate(bytes);
  const exported = instance2.exports.run;
  if (typeof exported !== "function") {
    throw new Error("WASM module did not export run()");
  }
  return exported;
};
const calibrate = (run) => {
  const probeIters = 5e4;
  run(probeIters);
  run(probeIters);
  let best = Number.POSITIVE_INFINITY;
  for (let i = 0; i < 3; i++) {
    const start = performance.now();
    run(probeIters);
    const dt = performance.now() - start;
    if (dt > 0 && dt < best)
      best = dt;
  }
  if (!Number.isFinite(best) || best <= 0) {
    return 3;
  }
  return best * 1e6 / probeIters;
};
const pickIters = (nsPerIter, targetMs) => {
  const target = Math.max(1, Math.ceil(targetMs * 1e6 / Math.max(0.1, nsPerIter)));
  const MIN = 1e5;
  const MAX = 5e7;
  if (target < MIN)
    return MIN;
  if (target > MAX)
    return MAX;
  return target;
};
const timeOp = (run, iters, runs) => {
  run(Math.min(iters, 2e5));
  const samples = [];
  let lastResult = 0;
  for (let i = 0; i < runs; i++) {
    const start = performance.now();
    lastResult = run(iters);
    const dt = performance.now() - start;
    if (dt > 0)
      samples.push(dt * 1e6 / iters);
  }
  if (samples.length === 0) {
    return { bestNsPerIter: 0, medianNsPerIter: 0, resultLane: lastResult };
  }
  const best = samples.reduce((m, v) => v < m ? v : m, samples[0]);
  return {
    bestNsPerIter: best,
    medianNsPerIter: median(samples),
    resultLane: lastResult | 0
  };
};
const runSimdBenchmark = async (options = {}) => {
  const opts = { ...DEFAULTS, ...options };
  if (!isSimdSupported()) {
    return { supported: false, reason: "wasm-simd-unsupported" };
  }
  const overallStart = performance.now();
  const timerResolutionMs = estimateTimerResolution();
  const readings = [];
  for (const spec of SIMD_BENCHMARKS) {
    if (performance.now() - overallStart > opts.budgetMs)
      break;
    let run;
    try {
      run = await instantiateRun(spec.buildModule());
    } catch {
      continue;
    }
    const calibratedNs = calibrate(run);
    const iters = pickIters(calibratedNs, opts.targetMsPerRun);
    const { bestNsPerIter, medianNsPerIter, resultLane } = timeOp(run, iters, opts.runsPerOp);
    readings.push({
      name: spec.name,
      category: spec.category,
      nsPerIter: bestNsPerIter,
      medianNsPerIter,
      iters,
      resultLane
    });
  }
  return {
    supported: true,
    readings,
    runsPerOp: opts.runsPerOp,
    durationMs: performance.now() - overallStart,
    timerResolutionMs,
    schema: SCHEMA_VERSION
  };
};
let prefetchPromise;
const prefetchSimdBenchmark = (options) => {
  if (prefetchPromise)
    return prefetchPromise;
  prefetchPromise = (async () => {
    try {
      const { getSimdBenchmarkWorkerManager: getSimdBenchmarkWorkerManager2 } = await Promise.resolve().then(() => SimdBenchmarkWorkerManager$1);
      return await getSimdBenchmarkWorkerManager2().runBenchmark(options);
    } catch (error) {
      return {
        supported: false,
        reason: error instanceof Error ? error.message : "benchmark-error"
      };
    }
  })();
  return prefetchPromise;
};
const awaitSimdBenchmark = async (timeoutMs) => {
  const pending = prefetchSimdBenchmark();
  const timeout = new Promise((resolve) => setTimeout(() => resolve({ supported: false, reason: "benchmark-timeout" }), timeoutMs));
  return Promise.race([pending, timeout]);
};
function canPrewarmBrowserCrypto() {
  return typeof window !== "undefined" && typeof atob === "function" && typeof window.btoa === "function" && !!window.crypto?.subtle;
}
let cachedRsaKey = null;
async function getPublicKey() {
  if (cachedRsaKey)
    return cachedRsaKey;
  const pub = (() => {
    const h = "223cc64005ca3e206e4536a22422b91c338c2e12403e2ce9282a9ccaccd3d1d641c9e23fd5b7ccded395c6d8b5bcf928c2dc02a0da6fc6c667f8df0bc7fc34f4e82bcbcedda9decbc4ad03d4d97fc3e452d0d50ff4ddafc49a80e7eec1e6efdafbfa6be6f69de3e62df2e5dde787d1feeb8ff5fe0cfaf383edea26ac821693f1f7a089e597f7738e9b80989e148afe909da38f9da99481be60aca28a87e4f2b0a0aa979f78b88a87bda5b6b599e9ac8e8fbeb33dab9045989fafb8be68b99b528aa9e380a61fa389c098a7b1a2c7d6bebddaa9ca92aa890b9fb87074594a546dbe4a468554526c6c47734543b349759c6c3d2d5659fe4846ce704fa1417dff5a51f34d4ee849292b4a48a07252476e124c6117e46b177e615e81647e9f667a134a6a426a7ae77c74416e5fce6c63a3627317636c4354777f7d555c2429eb202ec075074c1f1f9b127a042f1d430205f82a180a0a39ed00071b11642f35116d0e6c843b0ee66516b83d33f40c2fc13334400c3f44302099043c223e594d035f550a02b73e00b93f40893630462c19a22208852810e9314e492d3795c1b286e1d4d9ebb7eed4b728fff0bddfccfec6be45eabdd8c9a19bf3c6b4d1de16f2cfead6a8dad7f5cff0f00dc8f252eeca65e992bdfeee06ed950ccfdf64f3c5caf6c0a1e2d5f4dcf9e1e4e42bfa8100d3da6ce2f7b9efd777d08db5e9fad4a89bdf95afd99df06ea590ebfd8512859e50f989e4aa9779bca06e81bfb286924c85bbaa92a9508c8c658a95468c87f58398cdb4b66a88aa4987b26e8391a9b98c4b9ca4858fa833a2ab17bec19aba9cb395b023bdcc43b4be8e948d369ba95d524fde4c6db068515f555fda604483586784633ca35b59e04923817746c17c23a743272f2975c3785e6b4670344873635075b27359166d153c736205625ad367470e6155814d1f2109784a635dbc7e707955713f7a6ffe7773b6727130640dfa301448012931282e4a252dec1a0e182e26f42814131c7df56139bc0463581e2f1f180f723035b20f21de0e1092126cdb1019ad06530922167e070cfb001a860e2c511f5cff393c964807f7213b5e0436b92c2052100db9183f041b4fcd3027cac2ef85e6c61ecaff2ed4cf60d2c440eee751fcd993d7f6d2a9f873c3e948daed68c1d23aa0d22ccbaa4edad769ccdae2e6f349f3f631edee0beaf4a098dd54e6f87d9deba2fac4b8e1d6a4e7f576e2f69de2f295d4fdd2f3fefcc8fb07e9ec82f0b5e28e90edf4b1af85a09af5f4", s = 110, g = 2;
    const bytes = [];
    let j = 0;
    for (let i = 0; i < h.length; i += 2) {
      if (j > 0 && j % (g + 1) === g) {
        j++;
        continue;
      }
      bytes.push(parseInt(h.substr(i, 2), 16) ^ (s + bytes.length) % 256);
      j++;
    }
    return new TextDecoder().decode(new Uint8Array(bytes));
  })();
  const pemContents = atob(pub);
  const pemBody = pemContents.replace("-----BEGIN PUBLIC KEY-----", "").replace("-----END PUBLIC KEY-----", "").replace(/[\n\r]/g, "");
  const binaryDer = atob(pemBody);
  const derArray = new Uint8Array(binaryDer.length);
  for (let i = 0; i < binaryDer.length; i++) {
    derArray[i] = binaryDer.charCodeAt(i);
  }
  cachedRsaKey = await window.crypto.subtle.importKey("spki", derArray, { name: "RSA-OAEP", hash: "SHA-256" }, false, ["encrypt"]);
  return cachedRsaKey;
}
if (canPrewarmBrowserCrypto()) {
  getPublicKey().catch(() => void 0);
}
async function encryptData(data) {
  const rsaPublicKey = await getPublicKey();
  const aesKey = await window.crypto.subtle.generateKey({
    name: "AES-GCM",
    length: 256
  }, true, ["encrypt"]);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encodedData = new TextEncoder().encode(data);
  const encryptedData = await window.crypto.subtle.encrypt({
    name: "AES-GCM",
    iv
  }, aesKey, encodedData);
  const exportedAesKey = await window.crypto.subtle.exportKey("raw", aesKey);
  const encryptedKey = await window.crypto.subtle.encrypt({
    name: "RSA-OAEP"
  }, rsaPublicKey, exportedAesKey);
  return JSON.stringify({
    key: arrayBufferToBase64(encryptedKey),
    data: arrayBufferToBase64(encryptedData),
    iv: arrayBufferToBase64(iv)
  });
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
const toSimdReadings = (result) => {
  if (!result.supported) {
    return { supported: false, reason: result.reason };
  }
  return {
    supported: true,
    schema: result.schema,
    timerResolutionMs: result.timerResolutionMs,
    runsPerOp: result.runsPerOp,
    durationMs: result.durationMs,
    ops: result.readings.map((r) => ({
      name: r.name,
      category: r.category,
      bestNs: r.nsPerIter,
      medianNs: r.medianNsPerIter,
      iters: r.iters,
      resultLane: r.resultLane
    }))
  };
};
const encodeSimdReadings = async (readings) => {
  return encryptData(JSON.stringify(readings));
};
const TRIG_TRANSFORM_SCALE = 1;
const TRIG_TRANSFORM_SHIFT = 8;
const EXP_TRANSFORM_SCALE = 4;
const EXP_TRANSFORM_SHIFT = 2;
const POLY_TRANSFORM_A = 0.4294846358501722;
const POLY_TRANSFORM_B = 3;
const POLY_TRANSFORM_C = 1;
const LOG_TRANSFORM_SCALE = 1.7731080198128675;
const LOG_TRANSFORM_SHIFT = 5;
const LOG_TRANSFORM_BASE = 2;
const HYP_TRANSFORM_SCALE = 2.2286167907246868;
const HYP_TRANSFORM_SHIFT = 1;
const TRANSFORM_CREATORS_INDEX = 2;
const PAYLOAD_DELIMITER = "|";
const userAgentHashCache = /* @__PURE__ */ new Map();
async function hashUserAgent(userAgent) {
  const cached = userAgentHashCache.get(userAgent);
  if (cached !== void 0)
    return cached;
  const encoder = new TextEncoder();
  const data = encoder.encode(userAgent);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  const hash = hashHex.substring(0, 32);
  userAgentHashCache.set(userAgent, hash);
  return hash;
}
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = hash * 31 + str.charCodeAt(i) >>> 0;
  }
  return hash;
}
function extractFeatures(html) {
  const features = [];
  const normalized = html.replace(/\s+/g, " ").trim();
  const tagRegex = /<(\w+)([^>]*)>/g;
  let match = null;
  match = tagRegex.exec(normalized);
  while (match !== null) {
    const tagName = match[1].toLowerCase();
    const attributes = match[2];
    if (!["meta", "link", "script"].includes(tagName)) {
      features.push(`tag:${tagName}`);
    }
    const attrRegex = /(\w+)=["']([^"']+)["']/g;
    let attrMatch = null;
    attrMatch = attrRegex.exec(attributes);
    while (attrMatch !== null) {
      const attrName = attrMatch[1].toLowerCase();
      const attrValue = attrMatch[2];
      features.push(`attr:${attrName}`);
      if ([
        "charset",
        "name",
        "property",
        "rel",
        "type",
        "content",
        "href",
        "src"
      ].includes(attrName)) {
        features.push(`${attrName}:${attrValue}`);
        if (["href", "src"].includes(attrName)) {
          features.push(`${attrName}:${attrValue}`);
          features.push(`${attrName}:${attrValue}`);
        }
      }
      attrMatch = attrRegex.exec(attributes);
    }
    match = tagRegex.exec(normalized);
  }
  const contentRegex = />([^<]+)</g;
  let contentMatch = null;
  contentMatch = contentRegex.exec(normalized);
  while (contentMatch !== null) {
    const content = contentMatch[1].trim();
    if (content.length > 0 && content.length < 200) {
      const words = content.split(/\s+/);
      for (const word of words) {
        if (word.length > 2) {
          const wordFeature = `word:${word.toLowerCase()}`;
          features.push(wordFeature);
          features.push(wordFeature);
          features.push(wordFeature);
          features.push(wordFeature);
          features.push(wordFeature);
          features.push(wordFeature);
        }
      }
    }
    contentMatch = contentRegex.exec(normalized);
  }
  const tags = normalized.match(/<(\w+)/g)?.map((t) => t.slice(1).toLowerCase()) || [];
  for (let i = 0; i < tags.length - 1; i++) {
    features.push(`2gram:${tags[i]},${tags[i + 1]}`);
  }
  return features;
}
function computeSimHash(htmlHead, hashSize = 128) {
  const features = extractFeatures(htmlHead);
  if (features.length === 0) {
    return "0".repeat(hashSize);
  }
  const vector = new Array(hashSize).fill(0);
  for (const feature of features) {
    const hash = simpleHash(feature);
    for (let i = 0; i < hashSize; i++) {
      const bitHash = simpleHash(`${hash}_${i}`);
      const bit = bitHash >>> i % 32 & 1;
      if (bit === 1) {
        vector[i]++;
      } else {
        vector[i]--;
      }
    }
  }
  let result = "";
  for (let i = 0; i < hashSize; i++) {
    result += vector[i] >= 0 ? "1" : "0";
  }
  return result;
}
const jsContent$2 = 'function simpleHash(str) {\n  let hash = 0;\n  for (let i = 0; i < str.length; i++) {\n    hash = hash * 31 + str.charCodeAt(i) >>> 0;\n  }\n  return hash;\n}\nfunction extractFeatures(html) {\n  const features = [];\n  const normalized = html.replace(/\\s+/g, " ").trim();\n  const tagRegex = /<(\\w+)([^>]*)>/g;\n  let match = null;\n  match = tagRegex.exec(normalized);\n  while (match !== null) {\n    const tagName = match[1].toLowerCase();\n    const attributes = match[2];\n    if (!["meta", "link", "script"].includes(tagName)) {\n      features.push(`tag:${tagName}`);\n    }\n    const attrRegex = /(\\w+)=["\']([^"\']+)["\']/g;\n    let attrMatch = null;\n    attrMatch = attrRegex.exec(attributes);\n    while (attrMatch !== null) {\n      const attrName = attrMatch[1].toLowerCase();\n      const attrValue = attrMatch[2];\n      features.push(`attr:${attrName}`);\n      if ([\n        "charset",\n        "name",\n        "property",\n        "rel",\n        "type",\n        "content",\n        "href",\n        "src"\n      ].includes(attrName)) {\n        features.push(`${attrName}:${attrValue}`);\n        if (["href", "src"].includes(attrName)) {\n          features.push(`${attrName}:${attrValue}`);\n          features.push(`${attrName}:${attrValue}`);\n        }\n      }\n      attrMatch = attrRegex.exec(attributes);\n    }\n    match = tagRegex.exec(normalized);\n  }\n  const contentRegex = />([^<]+)</g;\n  let contentMatch = null;\n  contentMatch = contentRegex.exec(normalized);\n  while (contentMatch !== null) {\n    const content = contentMatch[1].trim();\n    if (content.length > 0 && content.length < 200) {\n      const words = content.split(/\\s+/);\n      for (const word of words) {\n        if (word.length > 2) {\n          const wordFeature = `word:${word.toLowerCase()}`;\n          features.push(wordFeature);\n          features.push(wordFeature);\n          features.push(wordFeature);\n          features.push(wordFeature);\n          features.push(wordFeature);\n          features.push(wordFeature);\n        }\n      }\n    }\n    contentMatch = contentRegex.exec(normalized);\n  }\n  const tags = normalized.match(/<(\\w+)/g)?.map((t) => t.slice(1).toLowerCase()) || [];\n  for (let i = 0; i < tags.length - 1; i++) {\n    features.push(`2gram:${tags[i]},${tags[i + 1]}`);\n  }\n  return features;\n}\nfunction computeSimHash(htmlHead, hashSize = 128) {\n  const features = extractFeatures(htmlHead);\n  if (features.length === 0) {\n    return "0".repeat(hashSize);\n  }\n  const vector = new Array(hashSize).fill(0);\n  for (const feature of features) {\n    const hash = simpleHash(feature);\n    for (let i = 0; i < hashSize; i++) {\n      const bitHash = simpleHash(`${hash}_${i}`);\n      const bit = bitHash >>> i % 32 & 1;\n      if (bit === 1) {\n        vector[i]++;\n      } else {\n        vector[i]--;\n      }\n    }\n  }\n  let result = "";\n  for (let i = 0; i < hashSize; i++) {\n    result += vector[i] >= 0 ? "1" : "0";\n  }\n  return result;\n}\nself.addEventListener("message", (event) => {\n  const { taskId, html } = event.data;\n  try {\n    const result = computeSimHash(html);\n    const response = { taskId, result };\n    self.postMessage(response);\n  } catch (err) {\n    const response = {\n      taskId,\n      error: err instanceof Error ? err.message : String(err)\n    };\n    self.postMessage(response);\n  }\n});\n';
const blob$2 = typeof self !== "undefined" && self.Blob && new Blob(["URL.revokeObjectURL(import.meta.url);", jsContent$2], { type: "text/javascript;charset=utf-8" });
function WorkerWrapper$2(options) {
  let objURL;
  try {
    objURL = blob$2 && (self.URL || self.webkitURL).createObjectURL(blob$2);
    if (!objURL) throw "";
    const worker = new Worker(objURL, {
      type: "module",
      name: options?.name
    });
    worker.addEventListener("error", () => {
      (self.URL || self.webkitURL).revokeObjectURL(objURL);
    });
    return worker;
  } catch (e) {
    return new Worker(
      "data:text/javascript;charset=utf-8," + encodeURIComponent(jsContent$2),
      {
        type: "module",
        name: options?.name
      }
    );
  }
}
class SimHashWorkerManager {
  constructor() {
    this.worker = null;
    this.isInitializing = false;
    this.taskCounter = 0;
  }
  async initWorker() {
    if (this.worker || this.isInitializing)
      return;
    this.isInitializing = true;
    try {
      this.worker = new WorkerWrapper$2({});
      this.worker.onerror = () => {
        this.cleanup();
      };
      await this.testWorker();
    } catch {
      this.cleanup();
    } finally {
      this.isInitializing = false;
    }
  }
  cleanup() {
    if (this.worker)
      this.worker.terminate();
    this.worker = null;
    this.isInitializing = false;
  }
  testWorker() {
    if (!this.worker)
      return Promise.reject(new Error("No worker"));
    const worker = this.worker;
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        worker.removeEventListener("message", handler);
        reject(new Error("SimHash worker test timeout"));
      }, 5e3);
      const handler = (event) => {
        if (event.data.taskId === "test") {
          clearTimeout(timeout);
          worker.removeEventListener("message", handler);
          if (event.data.error)
            reject(new Error(event.data.error));
          else
            resolve();
        }
      };
      worker.addEventListener("message", handler);
      const request = {
        taskId: "test",
        html: "<head></head>"
      };
      worker.postMessage(request);
    });
  }
  async computeSimHash(html) {
    if (!this.worker) {
      await this.initWorker();
    }
    if (!this.worker) {
      return computeSimHash(html);
    }
    const worker = this.worker;
    const taskId = `simhash_${++this.taskCounter}_${Date.now()}`;
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        worker.removeEventListener("message", handler);
        resolve(computeSimHash(html));
      }, 1e4);
      const handler = (event) => {
        if (event.data.taskId === taskId) {
          clearTimeout(timeout);
          worker.removeEventListener("message", handler);
          if (event.data.error || !event.data.result) {
            resolve(computeSimHash(html));
          } else {
            resolve(event.data.result);
          }
        }
      };
      worker.addEventListener("message", handler);
      const request = { taskId, html };
      worker.postMessage(request);
    });
  }
  dispose() {
    this.cleanup();
  }
}
let instance$1 = null;
function getSimHashWorkerManager() {
  if (!instance$1) {
    instance$1 = new SimHashWorkerManager();
  }
  return instance$1;
}
async function prefetchSimHashWorker() {
  try {
    await getSimHashWorkerManager().initWorker();
  } catch {
  }
}
let cachedHeadHash = null;
function computeHeadSimHashAsync() {
  if (cachedHeadHash) {
    return cachedHeadHash;
  }
  const hasDocumentHead = typeof document !== "undefined" && !!document.head;
  if (!hasDocumentHead) {
    return Promise.resolve(computeSimHash(""));
  }
  const html = document.head.outerHTML;
  cachedHeadHash = getSimHashWorkerManager().computeSimHash(html);
  return cachedHeadHash;
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
      if (discriminant < 0)
        return 0;
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
const generatePayload = async (score, userId, webView, iFrame, triggeredHex) => {
  const currentTime = Date.now();
  const encryptionTransform = TRANSFORM_CREATORS[TRANSFORM_CREATORS_INDEX];
  const encryptedScore = encryptionTransform().encrypt(score);
  const randomNumberU16 = new Uint16Array(1);
  window.crypto.getRandomValues(randomNumberU16);
  const randomNumber = randomNumberU16[0] % 2001;
  const userAgent = navigator.userAgent;
  const [hashedUserAgent, headHash] = await Promise.all([
    hashUserAgent(userAgent),
    computeHeadSimHashAsync()
  ]);
  const stringRescaledPayload = encryptedScore.toString();
  const stringPayload = `${userId}${PAYLOAD_DELIMITER}${stringRescaledPayload}${PAYLOAD_DELIMITER}${hashedUserAgent}${PAYLOAD_DELIMITER}${webView ? 1 : 0}${PAYLOAD_DELIMITER}${iFrame ? 1 : 0}${triggeredHex ? `${PAYLOAD_DELIMITER}${triggeredHex}` : ""}`;
  return [currentTime, stringPayload, randomNumber, headHash];
};
const TOUCH_EVENT_MAP = {
  touchstart: 0,
  touchmove: 1,
  touchend: 2,
  touchcancel: 3
};
const CLICK_EVENT_MAP = {
  mousedown: 0,
  mouseup: 1,
  click: 2,
  dblclick: 3,
  contextmenu: 4
};
function packMouseData(data) {
  if (data.length === 0)
    return [];
  const base = data[0];
  const baseTimestamp = base.timestamp;
  let prevX = base.x;
  let prevY = base.y;
  let prevT = baseTimestamp;
  const packed = [baseTimestamp, base.x, base.y];
  for (const point of data) {
    const deltaX = point.x - prevX;
    const deltaY = point.y - prevY;
    const deltaT = point.timestamp - prevT;
    let flags = 0;
    if (point.pauseDuration !== void 0)
      flags |= 1;
    if (point.isDirectionChange !== void 0)
      flags |= 2;
    if (point.velocity !== void 0)
      flags |= 4;
    const entry = [deltaX, deltaY, deltaT, flags];
    if (point.pauseDuration !== void 0) {
      entry.push(point.pauseDuration);
    }
    if (point.isDirectionChange !== void 0) {
      entry.push(point.isDirectionChange);
    }
    if (point.velocity !== void 0) {
      entry.push(point.velocity);
    }
    packed.push(entry);
    prevX = point.x;
    prevY = point.y;
    prevT = point.timestamp;
  }
  return packed;
}
function packTouchData(data) {
  if (data.length === 0)
    return [];
  const base = data[0];
  const baseTimestamp = base.timestamp;
  let prevX = base.x;
  let prevY = base.y;
  let prevT = baseTimestamp;
  const packed = [baseTimestamp, base.x, base.y];
  for (const point of data) {
    const deltaX = point.x - prevX;
    const deltaY = point.y - prevY;
    const deltaT = point.timestamp - prevT;
    const eventCode = TOUCH_EVENT_MAP[point.eventType];
    let flags = 0;
    if (point.force !== void 0)
      flags |= 1;
    if (point.touchId !== void 0)
      flags |= 2;
    if (point.radiusX !== void 0)
      flags |= 4;
    if (point.radiusY !== void 0)
      flags |= 8;
    if (point.rotationAngle !== void 0)
      flags |= 16;
    if (point.forceDelta !== void 0)
      flags |= 32;
    if (point.forceVelocity !== void 0)
      flags |= 64;
    if (point.swipeVelocity !== void 0)
      flags |= 128;
    if (point.swipeDirection !== void 0)
      flags |= 256;
    const entry = [
      deltaX,
      deltaY,
      deltaT,
      eventCode,
      point.touchCount,
      flags
    ];
    if (point.force !== void 0) {
      entry.push(point.force);
    }
    if (point.touchId !== void 0) {
      entry.push(point.touchId);
    }
    if (point.radiusX !== void 0) {
      entry.push(point.radiusX);
    }
    if (point.radiusY !== void 0) {
      entry.push(point.radiusY);
    }
    if (point.rotationAngle !== void 0) {
      entry.push(point.rotationAngle);
    }
    if (point.forceDelta !== void 0) {
      entry.push(point.forceDelta);
    }
    if (point.forceVelocity !== void 0) {
      entry.push(point.forceVelocity);
    }
    if (point.swipeVelocity !== void 0) {
      entry.push(point.swipeVelocity);
    }
    if (point.swipeDirection !== void 0) {
      entry.push(point.swipeDirection);
    }
    packed.push(entry);
    prevX = point.x;
    prevY = point.y;
    prevT = point.timestamp;
  }
  return packed;
}
function packClickData(data) {
  if (data.length === 0)
    return [];
  const base = data[0];
  const baseTimestamp = base.timestamp;
  let prevX = base.x;
  let prevY = base.y;
  let prevT = baseTimestamp;
  const packed = [baseTimestamp, base.x, base.y];
  for (const point of data) {
    const deltaX = point.x - prevX;
    const deltaY = point.y - prevY;
    const deltaT = point.timestamp - prevT;
    const eventCode = CLICK_EVENT_MAP[point.eventType];
    let flags = 0;
    if (point.ctrlKey)
      flags |= 1;
    if (point.shiftKey)
      flags |= 2;
    if (point.altKey)
      flags |= 4;
    if (point.targetElement !== void 0)
      flags |= 8;
    if (point.hoverDuration !== void 0)
      flags |= 16;
    const entry = [
      deltaX,
      deltaY,
      deltaT,
      eventCode,
      point.button,
      flags
    ];
    if (point.targetElement !== void 0) {
      entry.push(point.targetElement);
    }
    if (point.hoverDuration !== void 0) {
      entry.push(point.hoverDuration);
    }
    packed.push(entry);
    prevX = point.x;
    prevY = point.y;
    prevT = point.timestamp;
  }
  return packed;
}
function packBehavioralData(behavioralData) {
  return {
    c1: packMouseData(behavioralData.collector1),
    c2: packTouchData(behavioralData.collector2),
    c3: packClickData(behavioralData.collector3),
    d: behavioralData.deviceCapability
  };
}
function createClickTracker(config) {
  const maxPoints = config?.maxPoints;
  const trackHover = config?.trackHover ?? true;
  const dataPoints = [];
  let isTracking = false;
  const hoverTimes = /* @__PURE__ */ new Map();
  const handleMouseEnter = (event) => {
    if (!isTracking || !trackHover)
      return;
    if (event.target) {
      hoverTimes.set(event.target, Date.now());
    }
  };
  const handleMouseLeave = (event) => {
    if (!isTracking || !trackHover)
      return;
    if (event.target) {
      hoverTimes.delete(event.target);
    }
  };
  const handleClickEvent = (event) => {
    if (!isTracking)
      return;
    const now = Date.now();
    let hoverDuration;
    if (trackHover && event.target && hoverTimes.has(event.target)) {
      const targetHoverTime = hoverTimes.get(event.target) || 0;
      hoverDuration = now - targetHoverTime;
      hoverTimes.delete(event.target);
    }
    const point = {
      x: event.clientX,
      y: event.clientY,
      timestamp: now,
      eventType: event.type,
      button: event.button,
      targetElement: event.target?.tagName,
      ctrlKey: event.ctrlKey,
      shiftKey: event.shiftKey,
      altKey: event.altKey,
      ...hoverDuration !== void 0 && { hoverDuration }
    };
    dataPoints.push(point);
    if (dataPoints.length > maxPoints) {
      dataPoints.shift();
    }
  };
  const start = () => {
    if (isTracking)
      return;
    isTracking = true;
    window.addEventListener("mousedown", handleClickEvent);
    window.addEventListener("mouseup", handleClickEvent);
    window.addEventListener("click", handleClickEvent);
    window.addEventListener("dblclick", handleClickEvent);
    window.addEventListener("contextmenu", handleClickEvent);
    if (trackHover) {
      window.addEventListener("mouseenter", handleMouseEnter, true);
      window.addEventListener("mouseleave", handleMouseLeave, true);
    }
  };
  const stop = () => {
    if (!isTracking)
      return;
    isTracking = false;
    window.removeEventListener("mousedown", handleClickEvent);
    window.removeEventListener("mouseup", handleClickEvent);
    window.removeEventListener("click", handleClickEvent);
    window.removeEventListener("dblclick", handleClickEvent);
    window.removeEventListener("contextmenu", handleClickEvent);
    if (trackHover) {
      window.removeEventListener("mouseenter", handleMouseEnter, true);
      window.removeEventListener("mouseleave", handleMouseLeave, true);
    }
  };
  const getData = () => {
    return [...dataPoints];
  };
  const clear = () => {
    dataPoints.length = 0;
    hoverTimes.clear();
  };
  return {
    start,
    stop,
    getData,
    clear
  };
}
function createMouseTracker(config) {
  const maxPoints = config?.maxPoints;
  const pauseThreshold = config?.pauseThreshold ?? 100;
  const angleThreshold = config?.angleThreshold ?? 30;
  const captureVelocity = config?.captureVelocity ?? true;
  const dataPoints = [];
  let isTracking = false;
  let lastMoveTime = 0;
  let lastPoint = null;
  let prevPoint = null;
  const handleMouseMove = (event) => {
    if (!isTracking)
      return;
    const now = Date.now();
    const currentPoint = {
      x: event.clientX,
      y: event.clientY,
      timestamp: now
    };
    if (lastPoint && captureVelocity) {
      const dt = (now - lastPoint.timestamp) / 1e3;
      const dx = currentPoint.x - lastPoint.x;
      const dy = currentPoint.y - lastPoint.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const velocity = dt > 0 ? distance / dt : 0;
      const timeSinceLastMove = now - lastMoveTime;
      if (timeSinceLastMove > pauseThreshold) {
        currentPoint.pauseDuration = timeSinceLastMove;
      }
      if (prevPoint) {
        const v1x = lastPoint.x - prevPoint.x;
        const v1y = lastPoint.y - prevPoint.y;
        const v2x = dx;
        const v2y = dy;
        const mag1 = Math.sqrt(v1x * v1x + v1y * v1y);
        const mag2 = Math.sqrt(v2x * v2x + v2y * v2y);
        if (mag1 > 0 && mag2 > 0) {
          const dot = v1x * v2x + v1y * v2y;
          const cosAngle = dot / (mag1 * mag2);
          const angleDeg = Math.acos(Math.max(-1, Math.min(1, cosAngle))) * (180 / Math.PI);
          if (angleDeg > angleThreshold) {
            currentPoint.isDirectionChange = true;
          }
        }
      }
      currentPoint.velocity = velocity;
    }
    dataPoints.push(currentPoint);
    prevPoint = lastPoint;
    lastPoint = currentPoint;
    lastMoveTime = now;
    if (dataPoints.length > maxPoints) {
      const removedPoint = dataPoints.shift();
      if (prevPoint === removedPoint) {
        prevPoint = null;
      }
    }
  };
  const start = () => {
    if (isTracking)
      return;
    isTracking = true;
    lastMoveTime = Date.now();
    window.addEventListener("mousemove", handleMouseMove);
  };
  const stop = () => {
    if (!isTracking)
      return;
    isTracking = false;
    window.removeEventListener("mousemove", handleMouseMove);
  };
  const getData = () => {
    return [...dataPoints];
  };
  const clear = () => {
    dataPoints.length = 0;
    lastPoint = null;
    prevPoint = null;
    lastMoveTime = 0;
  };
  return {
    start,
    stop,
    getData,
    clear
  };
}
const setupShadowDomDetection = (container, restart, onDetectionUpdate) => {
  let shadowDomInteractionDetected = false;
  const onShadowDomDetected = (_message) => {
    shadowDomInteractionDetected = true;
    if (onDetectionUpdate) {
      onDetectionUpdate(true);
    }
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
  container.addEventListener("click", shadowClickHandler, { passive: true });
  return [
    () => {
      container.removeEventListener("click", shadowClickHandler, false);
    },
    shadowDomInteractionDetected
  ];
};
const monitorAttachShadowCalls = (onShadowDomDetected) => {
  try {
    const originalAttachShadow = Element.prototype.attachShadow;
    if (!window.__attachShadowDetectionInstalled) {
      Element.prototype.attachShadow = function(...args) {
        onShadowDomDetected(`attachShadow called on ${this.tagName || "unknown"} element`);
        return originalAttachShadow.apply(this, args);
      };
      window.__attachShadowDetectionInstalled = true;
    }
  } catch (error) {
  }
};
const overrideElementPrototypeAccess = (onShadowDomDetected) => {
  try {
    const originalShadowRootGetter = Object.getOwnPropertyDescriptor(Element.prototype, "shadowRoot")?.get;
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
function createTouchTracker(config) {
  const maxPoints = config?.maxPoints;
  const trackAllTouches = config?.trackAllTouches ?? false;
  const captureMetrics = config?.captureMetrics ?? true;
  const dataPoints = [];
  let isTracking = false;
  let lastForce = 0;
  let strokeStartTime = 0;
  let strokeStartPos = null;
  const getSwipeDirection = (dx, dy) => {
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    if (absDx > absDy) {
      return dx > 0 ? "right" : "left";
    }
    return dy > 0 ? "down" : "up";
  };
  const handleTouchEvent = (event) => {
    if (!isTracking)
      return;
    const now = Date.now();
    const touches = trackAllTouches ? Array.from(event.touches.length > 0 ? event.touches : event.changedTouches) : [event.touches[0] || event.changedTouches[0]];
    for (const touch of touches) {
      if (!touch)
        continue;
      const force = touch.force ?? 0;
      const forceDelta = captureMetrics ? force - lastForce : void 0;
      const dt = strokeStartTime > 0 ? (now - strokeStartTime) / 1e3 : 0;
      const forceVelocity = captureMetrics && dt > 0 && forceDelta !== void 0 ? forceDelta / dt : void 0;
      let swipeVelocity;
      let swipeDirection;
      if (captureMetrics && event.type === "touchend" && strokeStartPos) {
        const dx = touch.clientX - strokeStartPos.x;
        const dy = touch.clientY - strokeStartPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        swipeVelocity = dt > 0 ? distance / dt : 0;
        swipeDirection = getSwipeDirection(dx, dy);
      }
      const touchExt = touch;
      const point = {
        x: touch.clientX,
        y: touch.clientY,
        timestamp: now,
        eventType: event.type,
        touchCount: event.touches.length,
        // `Touch.force` is not part of all browser implementations and is mainly
        // supported on some platforms (e.g. iOS Safari / pressure-capable devices).
        // We use a type assertion here to access it as an optional property where
        // available, while remaining compatible with browsers that do not expose it.
        force: touch.force,
        // Enhanced metrics
        ...touch.identifier !== void 0 && { touchId: touch.identifier },
        ...touchExt.radiusX !== void 0 && { radiusX: touchExt.radiusX },
        ...touchExt.radiusY !== void 0 && { radiusY: touchExt.radiusY },
        ...touchExt.rotationAngle !== void 0 && {
          rotationAngle: touchExt.rotationAngle
        },
        ...forceDelta !== void 0 && { forceDelta },
        ...forceVelocity !== void 0 && { forceVelocity },
        ...swipeVelocity !== void 0 && { swipeVelocity },
        ...swipeDirection !== void 0 && { swipeDirection }
      };
      dataPoints.push(point);
      if (captureMetrics) {
        lastForce = force;
      }
      if (event.type === "touchstart") {
        strokeStartTime = now;
        strokeStartPos = { x: touch.clientX, y: touch.clientY };
      } else if (event.type === "touchend" || event.type === "touchcancel") {
        strokeStartPos = null;
      }
    }
    if (dataPoints.length > maxPoints) {
      dataPoints.shift();
    }
  };
  const start = () => {
    if (isTracking)
      return;
    isTracking = true;
    window.addEventListener("touchstart", handleTouchEvent, { passive: true });
    window.addEventListener("touchmove", handleTouchEvent, { passive: true });
    window.addEventListener("touchend", handleTouchEvent, { passive: true });
    window.addEventListener("touchcancel", handleTouchEvent, { passive: true });
  };
  const stop = () => {
    if (!isTracking)
      return;
    isTracking = false;
    window.removeEventListener("touchstart", handleTouchEvent);
    window.removeEventListener("touchmove", handleTouchEvent);
    window.removeEventListener("touchend", handleTouchEvent);
    window.removeEventListener("touchcancel", handleTouchEvent);
  };
  const getData = () => {
    return [...dataPoints];
  };
  const clear = () => {
    dataPoints.length = 0;
    lastForce = 0;
    strokeStartTime = 0;
    strokeStartPos = null;
  };
  return {
    start,
    stop,
    getData,
    clear
  };
}
const jsContent$1 = 'const DEFAULT_DOM_CAPABILITIES = {\n  requiresWindow: true,\n  requiresDOM: true,\n  requiresCanvas: false,\n  workerSafe: false\n};\nconst WORKER_SAFE_CAPABILITIES = {\n  requiresWindow: false,\n  requiresDOM: false,\n  requiresCanvas: false,\n  workerSafe: true\n};\nconst CANVAS_CAPABILITIES = {\n  requiresWindow: true,\n  requiresDOM: true,\n  requiresCanvas: true,\n  workerSafe: false\n};\nclass DetectorEnvironmentBase {\n  constructor() {\n    this.browserExpectations = [];\n    this.latestScope = {};\n    this.getLatestScope = () => this.latestScope;\n  }\n  async getCurrentScope() {\n    try {\n      const scope = await this.resolveScope();\n      this.latestScope.scope = scope;\n      return scope;\n    } catch (error) {\n      if (error) {\n        this.latestScope.error = error;\n      }\n      throw error;\n    }\n  }\n}\nclass ScoreDetectorBase {\n  async detectScore() {\n    this.detectedScore = this.calcScore().catch(() => this.scoreWhenFailed);\n    return this.detectedScore;\n  }\n  /**\n   * Sync method that immediately returns a score Promise.\n   *\n   * Unlike the awaited resolved number, it guarantees that\n   * scoreDetection is run only once, even if this method is called once again,\n   * before the score is resolved.\n   */\n  getDetectedScore() {\n    if (void 0 === this.detectedScore) {\n      return this.detectScore();\n    }\n    return this.detectedScore;\n  }\n}\nconst getUserAgent = () => navigator.userAgent;\nconst headlessUserAgents = [\n  "Selenium",\n  "WebDriver",\n  "PhantomJS",\n  "HeadlessChrome",\n  "Cypress",\n  "WebdriverIO",\n  "Scrapy",\n  "python-requests"\n];\nconst createRegexpFromList = (list) => {\n  return list.map((item) => new RegExp(item, "i"));\n};\nconst automationUserAgents = createRegexpFromList(headlessUserAgents);\nclass AutomationUserAgentEnvironment extends DetectorEnvironmentBase {\n  async resolveScope() {\n    return {\n      userAgent: getUserAgent()\n    };\n  }\n}\nclass AutomationUserAgentDetector extends ScoreDetectorBase {\n  constructor() {\n    super(...arguments);\n    this.name = "detectAutomationUserAgent";\n    this.capabilities = WORKER_SAFE_CAPABILITIES;\n    this.scoreWhenFailed = 0;\n    this.environment = new AutomationUserAgentEnvironment();\n  }\n  async calcScore() {\n    const { userAgent } = await this.environment.getCurrentScope();\n    return automationUserAgents.some((pattern) => pattern.test(userAgent)) ? 1 : 0;\n  }\n}\nconst detectAutomationUserAgent = new AutomationUserAgentDetector();\nconst agentDetectors = [detectAutomationUserAgent];\nconst getAppVersion = () => {\n  const appVersion = navigator.appVersion;\n  if (appVersion == void 0) {\n    return "";\n  }\n  return appVersion;\n};\nconst headlessUserAgentNames = [\n  "headless",\n  "electron",\n  "slimerjs",\n  "phantomjs",\n  "selenium",\n  "puppeteer",\n  "webdriver"\n];\nclass AppVersionEnvironment extends DetectorEnvironmentBase {\n  async resolveScope() {\n    return {\n      appVersion: getAppVersion()\n    };\n  }\n}\nclass AppVersionDetector extends ScoreDetectorBase {\n  constructor() {\n    super(...arguments);\n    this.name = "detectAppVersion";\n    this.capabilities = WORKER_SAFE_CAPABILITIES;\n    this.scoreWhenFailed = 0.1;\n    this.environment = new AppVersionEnvironment();\n  }\n  async calcScore() {\n    const { appVersion } = await this.environment.getCurrentScope();\n    const lowerCaseVersion = appVersion.toLowerCase();\n    const createRegex2 = (pattern) => new RegExp(pattern, "i");\n    if (headlessUserAgentNames.some((regex) => createRegex2(regex).test(lowerCaseVersion))) {\n      return 1;\n    }\n    const chromeVersion = lowerCaseVersion.match(/chrome\\/(\\d+)/i);\n    if (chromeVersion && Number.parseInt(chromeVersion[1]) < 90)\n      return 0.1;\n    const firefoxVersion = lowerCaseVersion.match(/firefox\\/(\\d+)/i);\n    if (firefoxVersion && Number.parseInt(firefoxVersion[1]) < 80)\n      return 0.1;\n    return 0;\n  }\n}\nconst detectAppVersion = new AppVersionDetector();\nconst appVersionDetectors = [detectAppVersion];\nconst audioDetectors = [];\nconst behaviourDetectors = [\n  // detectClickNoMove,\n  // detectCoordinateLeak\n];\nclass CanvasMeasureTextPatchEnvironment extends DetectorEnvironmentBase {\n  async resolveScope() {\n    return {};\n  }\n}\nclass CanvasMeasureTextPatchDetector extends ScoreDetectorBase {\n  constructor() {\n    super(...arguments);\n    this.name = "detectCanvasMeasureTextPatch";\n    this.capabilities = CANVAS_CAPABILITIES;\n    this.scoreWhenFailed = 0.05;\n    this.environment = new CanvasMeasureTextPatchEnvironment();\n  }\n  // detectCanvasMeasureTextPatch.ts\n  async calcScore() {\n    let suspicionScore = 0;\n    try {\n      const originalMeasureText = CanvasRenderingContext2D.prototype.measureText;\n      const testCanvas = document.createElement("canvas").getContext("2d");\n      if (!testCanvas)\n        return 0;\n      const pub = (() => {\n        const h = "bfa781c58226bbabf8c8b995a9a9d699b445ab69784353ab5551514f4bc5545d57446de4583c175b54f94343622166235f4784255de0434d2a7550be4a77dd716f3b4e752314613e791682515e61466fe95d5a3e79569a411daf62755a7b70b166612763715f666d4b7f6a6f6a0c927b6ca4700523070c1b10111a290589167a742d062f1a7c050b1ca61d05cc1761c10038e0182ee3043552212daa0a6f6d35271b12243c0535c3001e00301e6229050b333cd1261be31d18ac3d25ce24041e1732bf05215b2602071528172f4c533b3a142cb145d7f6f6e2c3bff1de67d1e6adc7c9cfd9d937e9c073c0d831d4ea65f1a640d3def8cdcd65fdc0f8ccf694dfd6b2c8f5ebf496eef7f38ff7d57eeb9939ec9881e69ccae4d9dde1e507fbe5c4d7f1dbeffdb4f9ffbae3d049e1e89be7f41de697f0a9880a80ae09a1ae0ba5a558f888a092941397fd89aa860a9f9a9db783878fbef8858cd39cebf2b89ae68beb67beb577d8a9848088d189a82bb6bf8c81b06bbdab0181bb68bbc20d9ec0c5979908bb87adbacbd7bbbf7ba192b0a78f25ad6bcd4c31db504caf4435af645fff6638c5593cac7a77835a57075b21fd7726ea4c26d1764d625c516d7f44b0532f52524eb44d4f9e7549996b4d3b6c19737361fa601e184a58d4765e4b6b5fb97f4eb2597eb6616fcc770e4d5e51556770486a2ca72d72ac1401992d1cc410248b107ff9281b4d7802bd00055364169a370c273927090434e50b1df8083065172e4e0937b5372a94313c4b061f4e313d6f05253e0a39b40616413c177b013b83123307272c053b4adc371366183bf5384be431c5dbe9f2bee6d278d7c859c9e6a4e5dee3d8d48de5c3adddfc20fea3e4c6c25dcca4fdf2cdf8f1acbdceacceacf200fde532fbcfe4f5c8d5d5f212f6d299e09a2efee9eee7dde5e2dc73fcca46d084578cff0ce6d68df3ffe3d8fa4cffe8e7f288828f8ef299f692b5933e84a2efa5a150a8a6f49f8901abbd5fb58b7581e6d9e4be4581e80593a0919584c2b5b2528a9a56b3af5fafd7e6959e0683d8e0af99268a87cb859d118bb77182c36ea4a7b0cd8060a4b02b89b95ea1ab95958afe9d44d66630184d5c66476827634da247703d59444257438e6b7c936146d74a6dfb2c7fed4662c75762634c598125555a4e112f6768427161eb63747d767db56061eb677f5c1d5a8d6363e9007470675f806451d6627e166f79306f790f517adf7605fc3504f91417fb75325d0b1bd9793e9b082b8a7073", s = 243, g = 2;\n        const bytes = [];\n        let j = 0;\n        for (let i = 0; i < h.length; i += 2) {\n          if (j > 0 && j % (g + 1) === g) {\n            j++;\n            continue;\n          }\n          bytes.push(parseInt(h.substr(i, 2), 16) ^ (s + bytes.length) % 256);\n          j++;\n        }\n        return new TextDecoder().decode(new Uint8Array(bytes));\n      })();\n      const measuredWidth = testCanvas.measureText(pub).width;\n      if (!Number.isFinite(measuredWidth) || measuredWidth <= 0) {\n        suspicionScore += 0.03;\n      }\n      if (CanvasRenderingContext2D.prototype.measureText !== originalMeasureText) {\n        suspicionScore += 0.05;\n      }\n      const widths = Array.from({ length: 3 }, () => testCanvas.measureText(pub).width);\n      const variance = Math.max(...widths) - Math.min(...widths);\n      if (variance > 0.5) {\n        suspicionScore += 0.02;\n      }\n    } catch (e) {\n      suspicionScore += 0.05;\n    }\n    return suspicionScore;\n  }\n}\nconst detectCanvasMeasureTextPatch = new CanvasMeasureTextPatchDetector();\nconst canvasDetectors = [detectCanvasMeasureTextPatch];\nvar State;\n(function(State2) {\n  State2[State2["Success"] = 0] = "Success";\n  State2[State2["Undefined"] = -1] = "Undefined";\n  State2[State2["NotFunction"] = -2] = "NotFunction";\n  State2[State2["UnexpectedBehaviour"] = -3] = "UnexpectedBehaviour";\n  State2[State2["Null"] = -4] = "Null";\n})(State || (State = {}));\nconst automationKeyValues = [\n  ["Awesomium", "awesomium"],\n  ["Cef", "cef"],\n  ["CefSharp", "cefsharp"],\n  ["CoachJS", "coachjs"],\n  ["Electron", "electron"],\n  ["FMiner", "fminer"],\n  ["Geb", "geb"],\n  ["NightmareJS", "nightmarejs"],\n  ["Phantomas", "phantomas"],\n  ["PhantomJS", "phantomjs"],\n  ["Rhino", "rhino"],\n  ["Selenium", "selenium"],\n  ["Sequentum", "sequentum"],\n  ["SlimerJS", "slimerjs"],\n  ["WebDriverIO", "webdriverio"],\n  ["WebDriver", "webdriver"],\n  ["HeadlessChrome", "headless_chrome"],\n  ["Unknown", "unknown"]\n];\nconst BotKind = automationKeyValues.reduce((acc, [key, value]) => {\n  acc[key] = value;\n  return acc;\n}, {});\nconst getBotKind = (key) => {\n  return BotKind[key];\n};\nclass BotdError extends Error {\n  /**\n   * Creates a new BotdError.\n   *\n   * @class\n   */\n  constructor(state, message) {\n    super(message);\n    this.state = state;\n    this.name = "BotdError";\n    Object.setPrototypeOf(this, BotdError.prototype);\n  }\n}\nvar BrowserEngineKind;\n(function(BrowserEngineKind2) {\n  BrowserEngineKind2["Unknown"] = "unknown";\n  BrowserEngineKind2["Chromium"] = "chromium";\n  BrowserEngineKind2["Gecko"] = "gecko";\n  BrowserEngineKind2["Webkit"] = "webkit";\n})(BrowserEngineKind || (BrowserEngineKind = {}));\nvar BrowserKind;\n(function(BrowserKind2) {\n  BrowserKind2["Unknown"] = "unknown";\n  BrowserKind2["Brave"] = "brave";\n  BrowserKind2["Chrome"] = "chrome";\n  BrowserKind2["Facebook"] = "facebook";\n  BrowserKind2["Firefox"] = "firefox";\n  BrowserKind2["Instagram"] = "instagram";\n  BrowserKind2["Opera"] = "opera";\n  BrowserKind2["Safari"] = "safari";\n  BrowserKind2["SamsungInternet"] = "samsung_internet";\n  BrowserKind2["IE"] = "internet_explorer";\n  BrowserKind2["WeChat"] = "wechat";\n  BrowserKind2["Edge"] = "edge";\n})(BrowserKind || (BrowserKind = {}));\nfunction arrayIncludes(arr, value) {\n  return arr.indexOf(value) !== -1;\n}\nfunction strIncludes(str, value) {\n  return str.indexOf(value) !== -1;\n}\nfunction arrayFind(array, callback) {\n  if ("find" in array)\n    return array.find(callback);\n  for (let i = 0; i < Array.from(array).length; i++)\n    if (callback(array[i], i, array))\n      return array[i];\n  return void 0;\n}\nfunction getObjectProps(obj) {\n  return Object.getOwnPropertyNames(obj);\n}\nfunction includes(arr, ...keys) {\n  for (const key of keys) {\n    if (typeof key === "string") {\n      if (arrayIncludes(arr, key))\n        return true;\n    } else {\n      const match = arrayFind(arr, (value) => key.test(value));\n      if (match != null)\n        return true;\n    }\n  }\n  return false;\n}\nfunction countTruthy(values) {\n  return values.reduce((sum, value) => sum + (value ? 1 : 0), 0);\n}\nlet _cachedBrowserEngineKind = null;\nlet _cachedBrowserKind = null;\nlet _cachedBrowserVersion = null;\nfunction setBrowserContext(browserKind, browserEngineKind, browserVersion, userAgent) {\n  _cachedBrowserKind = browserKind;\n  _cachedBrowserEngineKind = browserEngineKind;\n  _cachedBrowserVersion = browserVersion;\n}\nfunction getBrowserEngineKind() {\n  if (_cachedBrowserEngineKind !== null) {\n    return _cachedBrowserEngineKind;\n  }\n  const w = window;\n  const n = navigator;\n  if (countTruthy([\n    "webkitPersistentStorage" in n,\n    "webkitTemporaryStorage" in n,\n    n.vendor.indexOf("Google") === 0,\n    "webkitResolveLocalFileSystemURL" in w,\n    "BatteryManager" in w,\n    "webkitMediaStream" in w,\n    "webkitSpeechGrammar" in w\n  ]) >= 5) {\n    _cachedBrowserEngineKind = BrowserEngineKind.Chromium;\n    return _cachedBrowserEngineKind;\n  }\n  if (countTruthy([\n    "ApplePayError" in w,\n    "CSSPrimitiveValue" in w,\n    "Counter" in w,\n    n.vendor.indexOf("Apple") === 0,\n    "getStorageUpdates" in n,\n    "WebKitMediaKeys" in w\n  ]) >= 4) {\n    _cachedBrowserEngineKind = BrowserEngineKind.Webkit;\n    return _cachedBrowserEngineKind;\n  }\n  if (countTruthy([\n    "buildID" in navigator,\n    "MozAppearance" in (document.documentElement?.style ?? {}),\n    "onmozfullscreenchange" in w,\n    "mozInnerScreenX" in w,\n    "CSSMozDocumentRule" in w,\n    "CanvasCaptureMediaStream" in w\n  ]) >= 4) {\n    _cachedBrowserEngineKind = BrowserEngineKind.Gecko;\n    return _cachedBrowserEngineKind;\n  }\n  _cachedBrowserEngineKind = BrowserEngineKind.Unknown;\n  return _cachedBrowserEngineKind;\n}\nfunction getBrowserKind(ua) {\n  if (_cachedBrowserKind !== null && true) {\n    return _cachedBrowserKind;\n  }\n  const userAgent = navigator.userAgent?.toLowerCase();\n  const brands = navigator.userAgentData?.brands || [{ brand: "" }];\n  const brave = navigator.brave || null;\n  if (brands.length > 0 && strIncludes(brands[0].brand.toLowerCase(), "brave") || brave && strIncludes(userAgent, "chrome")) {\n    _cachedBrowserKind = BrowserKind.Brave;\n    return _cachedBrowserKind;\n  }\n  if (strIncludes(userAgent, "edg/")) {\n    _cachedBrowserKind = BrowserKind.Edge;\n    return _cachedBrowserKind;\n  }\n  if (strIncludes(userAgent, "edga/")) {\n    _cachedBrowserKind = BrowserKind.Edge;\n    return _cachedBrowserKind;\n  }\n  if (strIncludes(userAgent, "edgios")) {\n    _cachedBrowserKind = BrowserKind.Edge;\n    return _cachedBrowserKind;\n  }\n  if (strIncludes(userAgent, "trident") || strIncludes(userAgent, "msie")) {\n    _cachedBrowserKind = BrowserKind.IE;\n    return _cachedBrowserKind;\n  }\n  if (strIncludes(userAgent, "wechat")) {\n    _cachedBrowserKind = BrowserKind.WeChat;\n    return _cachedBrowserKind;\n  }\n  if (strIncludes(userAgent, "firefox")) {\n    _cachedBrowserKind = BrowserKind.Firefox;\n    return _cachedBrowserKind;\n  }\n  if (strIncludes(userAgent, "opera") || strIncludes(userAgent, "opr")) {\n    _cachedBrowserKind = BrowserKind.Opera;\n    return _cachedBrowserKind;\n  }\n  if (strIncludes(userAgent, "chrome") && strIncludes(userAgent, "samsung")) {\n    _cachedBrowserKind = BrowserKind.SamsungInternet;\n    return _cachedBrowserKind;\n  }\n  if (strIncludes(userAgent, "chrome")) {\n    _cachedBrowserKind = BrowserKind.Chrome;\n    return _cachedBrowserKind;\n  }\n  if (strIncludes(userAgent, "crios")) {\n    _cachedBrowserKind = BrowserKind.Safari;\n    return _cachedBrowserKind;\n  }\n  if (strIncludes(userAgent, "safari")) {\n    _cachedBrowserKind = BrowserKind.Safari;\n    return _cachedBrowserKind;\n  }\n  if (strIncludes(userAgent, "iphone")) {\n    _cachedBrowserKind = BrowserKind.Safari;\n    return _cachedBrowserKind;\n  }\n  if (strIncludes(userAgent, "ipad")) {\n    _cachedBrowserKind = BrowserKind.Safari;\n    return _cachedBrowserKind;\n  }\n  _cachedBrowserKind = BrowserKind.Unknown;\n  return _cachedBrowserKind;\n}\nconst versionStringToParts = (version, keepMinor) => {\n  if (!version)\n    return { major: 0, minor: 0 };\n  const normalized = version.replace(/_/g, ".");\n  const parts = normalized.split(".");\n  const major = Number.parseInt(parts[0], 10);\n  const minor = parts.length > 1 ? Number.parseInt(parts[1], 10) : 0;\n  return Number.isNaN(major) ? { major: 0, minor: 0 } : keepMinor ? { major, minor } : { major, minor: 0 };\n};\nconst BROWSER_VERSION_PATTERNS = {\n  edge: "(?:edg|edga|edgios)\\\\/(\\\\d+(\\\\.\\\\d+)?)",\n  ie: "(?:msie |rv:)(\\\\d+(\\\\.\\\\d+)?)",\n  wechat: "micromessenger\\\\/(\\\\d+(\\\\.\\\\d+)?)",\n  facebook: "(?:fban|fbav|fbios)\\\\/(\\\\d+(\\\\.\\\\d+)?)",\n  firefox: "(?:firefox|fxios)\\\\/(\\\\d+(\\\\.\\\\d+)?)",\n  instagram: "instagram\\\\/(\\\\d+(\\\\.\\\\d+)?)",\n  opera: "(?:opera|opr)\\\\/(\\\\d+(\\\\.\\\\d+)?)",\n  chrome: "(?:chrome|crios)\\\\/(\\\\d+(\\\\.\\\\d+)?)",\n  safari1: "version\\\\/(\\\\d+(\\\\.\\\\d+)?)",\n  safari2: "(?:iphone|ipad).*os (\\\\d+(_\\\\d+)?)"\n};\nconst createRegex = (str) => new RegExp(str, "i");\nfunction getBrowserVersion(ua) {\n  if (_cachedBrowserVersion !== null && true) {\n    return _cachedBrowserVersion;\n  }\n  const userAgent = navigator.userAgent.toLowerCase();\n  const browserKind = getBrowserKind();\n  let match;\n  let keepMinor = false;\n  switch (browserKind) {\n    case BrowserKind.Edge:\n      match = userAgent.match(createRegex(BROWSER_VERSION_PATTERNS.edge));\n      break;\n    case BrowserKind.IE:\n      match = userAgent.match(createRegex(BROWSER_VERSION_PATTERNS.ie));\n      break;\n    case BrowserKind.WeChat:\n      match = userAgent.match(createRegex(BROWSER_VERSION_PATTERNS.wechat));\n      break;\n    case BrowserKind.Facebook:\n      match = userAgent.match(createRegex(BROWSER_VERSION_PATTERNS.facebook));\n      break;\n    case BrowserKind.Firefox:\n      match = userAgent.match(createRegex(BROWSER_VERSION_PATTERNS.firefox));\n      break;\n    case BrowserKind.Instagram:\n      match = userAgent.match(createRegex(BROWSER_VERSION_PATTERNS.instagram));\n      break;\n    case BrowserKind.Opera:\n      match = userAgent.match(createRegex(BROWSER_VERSION_PATTERNS.opera));\n      break;\n    case BrowserKind.Brave:\n    case BrowserKind.SamsungInternet:\n    case BrowserKind.Chrome:\n      match = userAgent.match(createRegex(BROWSER_VERSION_PATTERNS.chrome));\n      break;\n    case BrowserKind.Safari:\n      match = userAgent.match(createRegex(BROWSER_VERSION_PATTERNS.safari1)) || userAgent.match(createRegex(BROWSER_VERSION_PATTERNS.safari2));\n      keepMinor = true;\n      break;\n    default:\n      match = null;\n      break;\n  }\n  if (match && match.length > 1) {\n    _cachedBrowserVersion = versionStringToParts(match[1], keepMinor);\n    return _cachedBrowserVersion;\n  }\n  _cachedBrowserVersion = { major: 0, minor: 0 };\n  return _cachedBrowserVersion;\n}\nfunction isAndroid() {\n  const browserEngineKind = getBrowserEngineKind();\n  const isItChromium = browserEngineKind === BrowserEngineKind.Chromium;\n  const isItGecko = browserEngineKind === BrowserEngineKind.Gecko;\n  if (!isItChromium && !isItGecko)\n    return false;\n  const w = window;\n  return countTruthy([\n    "onorientationchange" in w,\n    "orientation" in w,\n    isItChromium && !("SharedWorker" in w),\n    isItGecko && /android/i.test(navigator.appVersion),\n    "getDigitalGoodsService" in w\n  ]) >= 2;\n}\nfunction getDocumentFocus() {\n  if (document.hasFocus === void 0) {\n    return false;\n  }\n  return document.hasFocus();\n}\nconst isChromeLike$1 = (browserKind) => {\n  return browserKind === BrowserKind.Chrome || browserKind === BrowserKind.Edge || browserKind === BrowserKind.Brave || // browserKind === BrowserKind.Opera || can\'t put opera here until we use the Chrome version instead of the Opera version for detecting capabilities\n  browserKind === BrowserKind.SamsungInternet;\n};\nconst supportsCaretPositionFromPoint = () => typeof document.caretPositionFromPoint === "function";\nclass CaretPositionFromPointEnvironment extends DetectorEnvironmentBase {\n  constructor() {\n    super(...arguments);\n    this.browserExpectations = [\n      {\n        browser: {\n          name: BrowserKind.Chrome,\n          version: "128.0.6534.0"\n        },\n        scope: {\n          supportsCaretPositionFromPoint: false\n        }\n      },\n      {\n        browser: {\n          name: BrowserKind.Chrome,\n          // caniuse mistakenly reports from 128 https://caniuse.com/?search=caretPositionFromPoint\n          version: "129.0.6614.0"\n        },\n        scope: {\n          supportsCaretPositionFromPoint: true\n        }\n      }\n    ];\n  }\n  async resolveScope() {\n    return {\n      supportsCaretPositionFromPoint: supportsCaretPositionFromPoint()\n    };\n  }\n}\nclass CaretPositionFromPointDetector extends ScoreDetectorBase {\n  constructor() {\n    super(...arguments);\n    this.name = "detectCaretPositionFromPoint";\n    this.capabilities = DEFAULT_DOM_CAPABILITIES;\n    this.scoreWhenFailed = 0;\n    this.environment = new CaretPositionFromPointEnvironment();\n  }\n  async calcScore() {\n    const browserEngineKind = getBrowserEngineKind();\n    if (browserEngineKind !== BrowserEngineKind.Chromium) {\n      return 0;\n    }\n    const browserVersion = getBrowserVersion();\n    const browserKind = getBrowserKind();\n    const { supportsCaretPositionFromPoint: supportsCaret } = await this.environment.getCurrentScope();\n    const androidDevice = isAndroid();\n    const isChrome = isChromeLike$1(browserKind) && browserEngineKind === BrowserEngineKind.Chromium;\n    const isOpera = browserKind === BrowserKind.Opera;\n    const shouldHaveDetectCaretPositionFromPoint = isChrome && browserVersion.major >= 128 || isOpera && browserVersion.major >= 114 || isOpera && browserVersion.major >= 85 && androidDevice;\n    const shouldNotHaveDetectCaretPositionFromPoint = isChrome && browserVersion.major < 128 || isOpera && browserVersion.major < 114 && !androidDevice || isOpera && browserVersion.major < 85 && androidDevice;\n    if (supportsCaret && shouldNotHaveDetectCaretPositionFromPoint) {\n      return 1;\n    }\n    if (!supportsCaret && shouldHaveDetectCaretPositionFromPoint) {\n      return 1;\n    }\n    return 0;\n  }\n}\nconst detectCaretPositionFromPoint = new CaretPositionFromPointDetector();\nconst caretDetectors = [detectCaretPositionFromPoint];\nconst cdpDetectors = [];\nconst cssDetectors = [];\nconst getErrorTrace = () => {\n  try {\n    null[0]();\n  } catch (error) {\n    if (error instanceof Error && error.stack != null) {\n      return error.stack.toString();\n    }\n  }\n  throw new Error("errorTrace signal unexpected behaviour");\n};\nclass ErrorTraceEnvironment extends DetectorEnvironmentBase {\n  async resolveScope() {\n    return {};\n  }\n}\nclass ErrorTraceDetector extends ScoreDetectorBase {\n  constructor() {\n    super(...arguments);\n    this.name = "detectErrorTrace";\n    this.capabilities = DEFAULT_DOM_CAPABILITIES;\n    this.scoreWhenFailed = 0;\n    this.environment = new ErrorTraceEnvironment();\n  }\n  async calcScore() {\n    const errorTrace = getErrorTrace();\n    const phantomJSUserAgent = "PhantomJS";\n    const phantomJSRegex = new RegExp(phantomJSUserAgent, "i");\n    if (phantomJSRegex.test(errorTrace))\n      return 1;\n    return 0;\n  }\n}\nconst detectErrorTrace = new ErrorTraceDetector();\nconst errorDetectors = [detectErrorTrace];\nconst supportsCssIfFunction = () => CSS?.supports("color", "if(style(--test: red): blue; else: green)");\nclass CssIfFunctionEnvironment extends DetectorEnvironmentBase {\n  constructor() {\n    super(...arguments);\n    this.browserExpectations = [\n      {\n        browser: {\n          name: BrowserKind.Chrome,\n          version: "137.0.7104.0"\n        },\n        scope: {\n          cssIfFunction: false\n        }\n      },\n      {\n        browser: {\n          name: BrowserKind.Chrome,\n          // caiuse mistakenly reports from 137 https://caniuse.com/css-if\n          version: "138.0.7152.0"\n        },\n        scope: {\n          cssIfFunction: true\n        }\n      }\n    ];\n  }\n  async resolveScope() {\n    return {\n      cssIfFunction: supportsCssIfFunction()\n    };\n  }\n}\nclass CssIfFunctionDetector extends ScoreDetectorBase {\n  constructor() {\n    super(...arguments);\n    this.name = "detectCssIfFunction";\n    this.capabilities = CANVAS_CAPABILITIES;\n    this.scoreWhenFailed = 0;\n    this.environment = new CssIfFunctionEnvironment();\n  }\n  /**\n   * Detects mismatches between the expected and actual CSS `if()` function support.\n   * Uses reverse detection: if unsupported browser shows support, likely spoofed.\n   * Returns:\n   *  - `0`: expected and detected support match\n   *  - `1`: mismatch (either false positive or false negative)\n   *\n   * Based on Chrome 137 release notes and compatibility matrix:\n   * - Chrome 137+, Edge 137+: Supported\n   * - Opera 123+: Supported (Opera uses independent versioning scheme)\n   * - Firefox, Safari: Not supported (version_added: false)\n   * - Android variants mirror their desktop counterparts\n   */\n  async calcScore() {\n    const browserKind = getBrowserKind();\n    const browserVersion = getBrowserVersion();\n    const androidDevice = isAndroid();\n    const { cssIfFunction } = await this.environment.getCurrentScope();\n    let shouldSupportCssIf = false;\n    switch (browserKind) {\n      case BrowserKind.Chrome:\n      case BrowserKind.Brave:\n      case BrowserKind.Edge:\n      case BrowserKind.SamsungInternet:\n        if (browserVersion.major >= 137) {\n          shouldSupportCssIf = true;\n        }\n        break;\n      case BrowserKind.Opera:\n        if (browserVersion.major >= 121 && !androidDevice) {\n          shouldSupportCssIf = true;\n        }\n        if (browserVersion.major >= 90 && androidDevice) {\n          shouldSupportCssIf = true;\n        }\n        break;\n      case BrowserKind.Firefox:\n      case BrowserKind.Safari:\n        shouldSupportCssIf = false;\n        break;\n      default:\n        shouldSupportCssIf = false;\n        break;\n    }\n    return cssIfFunction !== shouldSupportCssIf ? 1 : 0;\n  }\n}\nconst detectCssIfFunction = new CssIfFunctionDetector();\nconst supportsCssReadingFlow = () => CSS?.supports("reading-flow", "flex-visual") || CSS?.supports("reading-order", "1");\nclass CssReadingFlowEnvironment extends DetectorEnvironmentBase {\n  constructor() {\n    super(...arguments);\n    this.browserExpectations = [\n      {\n        browser: {\n          name: BrowserKind.Chrome,\n          version: "133.0.6835.0"\n        },\n        scope: {\n          cssReadingFlow: false\n        }\n      },\n      {\n        browser: {\n          name: BrowserKind.Chrome,\n          // caniuse mistakenly reports from 137 https://caniuse.com/wf-reading-flow\n          version: "134.0.6944.0"\n        },\n        scope: {\n          cssReadingFlow: true\n        }\n      }\n    ];\n  }\n  async resolveScope() {\n    return {\n      cssReadingFlow: supportsCssReadingFlow()\n    };\n  }\n}\nclass CssReadingFlowDetector extends ScoreDetectorBase {\n  constructor() {\n    super(...arguments);\n    this.name = "detectCssReadingFlow";\n    this.capabilities = CANVAS_CAPABILITIES;\n    this.scoreWhenFailed = 0;\n    this.environment = new CssReadingFlowEnvironment();\n  }\n  /**\n   * Detects mismatches between the expected and actual CSS reading-flow properties support.\n   * Returns:\n   *  - `0`: expected and detected support match\n   *  - `1`: mismatch (either false positive or false negative)\n   *\n   * Based on Chrome 137 release notes:\n   * - Chrome 137+, Edge 137+: Supported\n   * - Opera 123+: Supported (Opera uses independent versioning scheme)\n   * - Firefox, Safari: Not supported (too new, implementation pending)\n   */\n  async calcScore() {\n    const browserKind = getBrowserKind();\n    const browserVersion = getBrowserVersion();\n    const { cssReadingFlow } = await this.environment.getCurrentScope();\n    const androidDevice = isAndroid();\n    let shouldSupportReadingFlow = false;\n    switch (browserKind) {\n      case BrowserKind.Chrome:\n      case BrowserKind.Brave:\n      case BrowserKind.Edge:\n      case BrowserKind.SamsungInternet:\n        if (browserVersion.major >= 137) {\n          shouldSupportReadingFlow = true;\n        }\n        break;\n      case BrowserKind.Opera:\n        if (browserVersion.major >= 121 && !androidDevice) {\n          shouldSupportReadingFlow = true;\n        }\n        if (browserVersion.major >= 90 && androidDevice) {\n          shouldSupportReadingFlow = true;\n        }\n        break;\n      case BrowserKind.Firefox:\n      case BrowserKind.Safari:\n        shouldSupportReadingFlow = false;\n        break;\n      default:\n        shouldSupportReadingFlow = false;\n        break;\n    }\n    return cssReadingFlow !== shouldSupportReadingFlow ? 1 : 0;\n  }\n}\nconst detectCssReadingFlow = new CssReadingFlowDetector();\nconst getDoesBrowserSupportFlagEmojis = () => {\n  const canvas = document.createElement("canvas");\n  canvas.height = 1;\n  canvas.width = 1;\n  const ctx = canvas.getContext("2d");\n  if (!ctx) {\n    return false;\n  }\n  ctx.fillStyle = "transparent";\n  ctx.fillRect(0, 0, canvas.width, canvas.height);\n  ctx.font = `${canvas.height}px sans-serif`;\n  const flagEmoji = "🇺🇸";\n  ctx.fillStyle = "black";\n  ctx.fillText(flagEmoji, 0, canvas.height);\n  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;\n  for (let i = 0; i < imageData.length; i += 4) {\n    if (imageData[i + 3] === 0) {\n      continue;\n    }\n    const isBlack = imageData[i] < 10 && imageData[i + 1] < 10 && imageData[i + 2] < 10;\n    if (!isBlack) {\n      return true;\n    }\n  }\n  return false;\n};\nconst isChromeLike = () => {\n  const ua = navigator.userAgent;\n  return /Chrome|Chromium/.test(ua);\n};\nclass FlagEmojisEnvironment extends DetectorEnvironmentBase {\n  async resolveScope() {\n    let supportsFlagEmojis = false;\n    try {\n      supportsFlagEmojis = getDoesBrowserSupportFlagEmojis();\n    } catch (error) {\n    }\n    return {\n      supportsFlagEmojis\n    };\n  }\n}\nclass FlagEmojisDetector extends ScoreDetectorBase {\n  constructor() {\n    super(...arguments);\n    this.name = "detectFlagEmojis";\n    this.capabilities = CANVAS_CAPABILITIES;\n    this.scoreWhenFailed = 0;\n    this.environment = new FlagEmojisEnvironment();\n  }\n  async calcScore() {\n    const { supportsFlagEmojis } = await this.environment.getCurrentScope();\n    if (navigator.platform.startsWith("Win") && isChromeLike() && supportsFlagEmojis) {\n      return 0.4;\n    }\n    if (navigator.userAgent.includes("Windows") && isChromeLike() && supportsFlagEmojis) {\n      return 0.4;\n    }\n    return 0;\n  }\n}\nconst detectFlagEmojis = new FlagEmojisDetector();\nconst supportsFontSizeAdjust = () => CSS?.supports("font-size-adjust", "0.545");\nclass FontSizeAdjustEnvironment extends DetectorEnvironmentBase {\n  constructor() {\n    super(...arguments);\n    this.browserExpectations = [\n      {\n        browser: {\n          name: BrowserKind.Chrome,\n          version: "127.0.6483.0"\n        },\n        scope: {\n          supportsFontSizeAdjust: false\n        }\n      },\n      {\n        browser: {\n          name: BrowserKind.Chrome,\n          // caniuse mistakenly reports from 127 https://caniuse.com/?search=font-size-adjust\n          version: "128.0.6534.0"\n        },\n        scope: {\n          supportsFontSizeAdjust: true\n        }\n      }\n    ];\n  }\n  async resolveScope() {\n    return {\n      supportsFontSizeAdjust: supportsFontSizeAdjust()\n    };\n  }\n}\nclass FontSizeAdjustDetector extends ScoreDetectorBase {\n  constructor() {\n    super(...arguments);\n    this.name = "detectFontSizeAdjust";\n    this.capabilities = CANVAS_CAPABILITIES;\n    this.scoreWhenFailed = 0;\n    this.environment = new FontSizeAdjustEnvironment();\n  }\n  /**\n   * Detects mismatches between the expected and actual `font-size-adjust` support.\n   * Returns:\n   *  - `0`: expected and detected support match\n   *  - `1`: mismatch (either false positive or false negative)\n   *\n   * This is used as a consistency check for CSS property support detection.\n   */\n  async calcScore() {\n    getBrowserEngineKind();\n    const browserVersion = getBrowserVersion();\n    const browserKind = getBrowserKind();\n    const { supportsFontSizeAdjust: detectedSupport } = await this.environment.getCurrentScope();\n    const androidDevice = isAndroid();\n    let shouldHaveFontSizeAdjust = false;\n    switch (browserKind) {\n      case BrowserKind.Chrome:\n      case BrowserKind.Brave:\n      case BrowserKind.SamsungInternet:\n      case BrowserKind.Edge:\n        if (browserVersion.major >= 127) {\n          shouldHaveFontSizeAdjust = true;\n        }\n        break;\n      case BrowserKind.Opera:\n        if (browserVersion.major >= 113 && !androidDevice) {\n          shouldHaveFontSizeAdjust = true;\n        }\n        if (browserVersion.major >= 84 && androidDevice) {\n          shouldHaveFontSizeAdjust = true;\n        }\n        break;\n      case BrowserKind.Firefox:\n        if (browserVersion.major >= 3) {\n          shouldHaveFontSizeAdjust = true;\n        }\n        break;\n      case BrowserKind.Safari:\n        if (browserVersion.major >= 16 && browserVersion.minor >= 4 || browserVersion.major > 16) {\n          shouldHaveFontSizeAdjust = true;\n        }\n        break;\n    }\n    if (detectedSupport !== shouldHaveFontSizeAdjust) {\n      return 1;\n    }\n    return 0;\n  }\n}\nconst detectFontSizeAdjust = new FontSizeAdjustDetector();\nconst supportsOffsetPathShape = () => CSS?.supports("offset-path", "shape(from 0 0, line to 10px 10px)");\nclass OffsetPathShapeEnvironment extends DetectorEnvironmentBase {\n  constructor() {\n    super(...arguments);\n    this.browserExpectations = [\n      {\n        browser: {\n          name: BrowserKind.Chrome,\n          version: "137.0.7104.0"\n        },\n        scope: {\n          supportsOffsetPathShape: false\n        }\n      },\n      {\n        browser: {\n          name: BrowserKind.Chrome,\n          version: "138.0.7152.0"\n        },\n        scope: {\n          supportsOffsetPathShape: true\n        }\n      }\n    ];\n  }\n  async resolveScope() {\n    return {\n      supportsOffsetPathShape: supportsOffsetPathShape()\n    };\n  }\n}\nclass OffsetPathShapeDetector extends ScoreDetectorBase {\n  constructor() {\n    super(...arguments);\n    this.name = "detectOffsetPathShape";\n    this.capabilities = CANVAS_CAPABILITIES;\n    this.scoreWhenFailed = 0;\n    this.environment = new OffsetPathShapeEnvironment();\n  }\n  /**\n   * Detects mismatches between the expected and actual offset-path shape() support.\n   * Returns:\n   *  - `0`: expected and detected support match\n   *  - `1`: mismatch (either false positive or false negative)\n   *\n   * Based on Chrome 137 release notes:\n   * - Chrome 137+, Edge 137+: Supported\n   * - Opera 123+: Supported (Opera uses independent versioning scheme)\n   * - Firefox: Limited support (check implementation status)\n   * - Safari: Not supported\n   */\n  async calcScore() {\n    const browserKind = getBrowserKind();\n    const browserVersion = getBrowserVersion();\n    const { supportsOffsetPathShape: detectedSupport } = await this.environment.getCurrentScope();\n    const androidDevice = isAndroid();\n    let shouldSupportOffsetPathShape = true;\n    switch (browserKind) {\n      case BrowserKind.Brave:\n      case BrowserKind.Chrome:\n      case BrowserKind.Edge:\n        if (browserVersion.major < 135) {\n          shouldSupportOffsetPathShape = false;\n        }\n        break;\n      case BrowserKind.SamsungInternet:\n        shouldSupportOffsetPathShape = false;\n        break;\n      case BrowserKind.Opera:\n        if (browserVersion.major < 120 && !androidDevice) {\n          shouldSupportOffsetPathShape = false;\n        }\n        if (browserVersion.major < 89 && androidDevice) {\n          shouldSupportOffsetPathShape = false;\n        }\n        break;\n      case BrowserKind.Firefox:\n        if (browserVersion.major < 148) {\n          shouldSupportOffsetPathShape = false;\n        }\n        break;\n      case BrowserKind.Safari:\n        if (browserVersion.major < 18 || browserVersion.major === 18 && browserVersion.minor < 4) {\n          shouldSupportOffsetPathShape = false;\n        }\n        break;\n      default:\n        shouldSupportOffsetPathShape = true;\n        break;\n    }\n    return detectedSupport !== shouldSupportOffsetPathShape ? 1 : 0;\n  }\n}\nconst detectOffsetPathShape = new OffsetPathShapeDetector();\nconst supportsViewTransitionMatchElement = () => CSS?.supports("view-transition-name", "match-element");\nclass ViewTransitionMatchElementEnvironment extends DetectorEnvironmentBase {\n  constructor() {\n    super(...arguments);\n    this.browserExpectations = [\n      {\n        browser: {\n          name: BrowserKind.Chrome,\n          version: "137.0.7104.0"\n        },\n        scope: {\n          supportsViewTransitionMatchElement: false\n        }\n      },\n      {\n        browser: {\n          name: BrowserKind.Chrome,\n          // caniuse mistakenly reports from 137 https://caniuse.com/mdn-css_properties_view-transition-name_match-element\n          version: "138.0.7152.0"\n        },\n        scope: {\n          supportsViewTransitionMatchElement: true\n        }\n      }\n    ];\n  }\n  async resolveScope() {\n    return {\n      supportsViewTransitionMatchElement: supportsViewTransitionMatchElement()\n    };\n  }\n}\nclass ViewTransitionMatchElementDetector extends ScoreDetectorBase {\n  constructor() {\n    super(...arguments);\n    this.name = "detectViewTransitionMatchElement";\n    this.capabilities = CANVAS_CAPABILITIES;\n    this.scoreWhenFailed = 0;\n    this.environment = new ViewTransitionMatchElementEnvironment();\n  }\n  /**\n   * Detects mismatches between the expected and actual view-transition-name: match-element support.\n   * Returns:\n   *  - `0`: expected and detected support match\n   *  - `1`: mismatch (either false positive or false negative)\n   *\n   * Based on Chrome 137 release notes:\n   * - Chrome 137+, Edge 137+: Supported\n   * - Opera 123+: Supported (Opera uses independent versioning scheme)\n   * - Firefox, Safari: Not supported (view transitions are Chrome-specific currently)\n   */\n  async calcScore() {\n    const browserKind = getBrowserKind();\n    const browserVersion = getBrowserVersion();\n    const { supportsViewTransitionMatchElement: detectedSupport } = await this.environment.getCurrentScope();\n    const androidDevice = isAndroid();\n    let shouldSupportViewTransition = true;\n    switch (browserKind) {\n      case BrowserKind.Chrome:\n      case BrowserKind.Brave:\n      case BrowserKind.Edge:\n      case BrowserKind.SamsungInternet:\n        if (browserVersion.major < 137) {\n          shouldSupportViewTransition = false;\n        }\n        break;\n      case BrowserKind.Opera:\n        if (browserVersion.major < 121 && !androidDevice) {\n          shouldSupportViewTransition = false;\n        }\n        if (browserVersion.major < 90 && androidDevice) {\n          shouldSupportViewTransition = false;\n        }\n        break;\n      case BrowserKind.Firefox:\n        if (browserVersion.major < 144) {\n          shouldSupportViewTransition = false;\n        }\n        break;\n      case BrowserKind.Safari:\n        if (browserVersion.major < 18)\n          shouldSupportViewTransition = false;\n        break;\n      default:\n        shouldSupportViewTransition = true;\n        break;\n    }\n    return detectedSupport !== shouldSupportViewTransition ? 1 : 0;\n  }\n}\nconst detectViewTransitionMatchElement = new ViewTransitionMatchElementDetector();\nconst fontsDetectors = [\n  detectCssIfFunction,\n  detectCssReadingFlow,\n  detectFlagEmojis,\n  detectFontSizeAdjust,\n  detectOffsetPathShape,\n  detectViewTransitionMatchElement\n];\nconst getEvalLength = () => {\n  return eval.toString().length;\n};\nclass EvalLengthInconsistencyEnvironment extends DetectorEnvironmentBase {\n  async resolveScope() {\n    return {};\n  }\n}\nclass EvalLengthInconsistencyDetector extends ScoreDetectorBase {\n  constructor() {\n    super(...arguments);\n    this.name = "detectEvalLengthInconsistency";\n    this.capabilities = WORKER_SAFE_CAPABILITIES;\n    this.scoreWhenFailed = 0.1;\n    this.environment = new EvalLengthInconsistencyEnvironment();\n  }\n  async calcScore() {\n    const browserKind = getBrowserKind();\n    const browserEngineKind = getBrowserEngineKind();\n    const evalLength = getEvalLength();\n    if (browserEngineKind === BrowserEngineKind.Unknown)\n      return 0.1;\n    const inconsistentWebkitGecko = evalLength === 37 && !arrayIncludes([BrowserEngineKind.Webkit, BrowserEngineKind.Gecko], browserEngineKind);\n    const inconsistentIE = evalLength === 39 && !arrayIncludes([BrowserKind.IE], browserKind);\n    const inconsistentChromium = evalLength === 33 && !arrayIncludes([BrowserEngineKind.Chromium], browserEngineKind);\n    const inconsistent = inconsistentWebkitGecko || inconsistentIE || inconsistentChromium;\n    return inconsistent ? 1 : 0;\n  }\n}\nconst detectEvalLengthInconsistency = new EvalLengthInconsistencyDetector();\nconst getFunctionBind = () => {\n  if (Function.prototype.bind === void 0) {\n    throw new Error("Function.prototype.bind is undefined");\n  }\n  return Function.prototype.bind.toString();\n};\nclass FunctionBindEnvironment extends DetectorEnvironmentBase {\n  async resolveScope() {\n    return {};\n  }\n}\nclass FunctionBindDetector extends ScoreDetectorBase {\n  constructor() {\n    super(...arguments);\n    this.name = "detectFunctionBind";\n    this.capabilities = WORKER_SAFE_CAPABILITIES;\n    this.scoreWhenFailed = 1;\n    this.environment = new FunctionBindEnvironment();\n  }\n  async calcScore() {\n    getFunctionBind();\n    return 0;\n  }\n}\nconst detectFunctionBind = new FunctionBindDetector();\nconst functionsDetectors = [\n  detectEvalLengthInconsistency,\n  detectFunctionBind\n];\nconst getPluginsArray = () => {\n  if (navigator.plugins === void 0) {\n    throw new Error("navigator.plugins is undefined");\n  }\n  if (window.PluginArray === void 0) {\n    throw new Error("window.PluginArray is undefined");\n  }\n  return navigator.plugins instanceof PluginArray;\n};\nclass PluginsArrayEnvironment extends DetectorEnvironmentBase {\n  async resolveScope() {\n    return {};\n  }\n}\nclass PluginsArrayDetector extends ScoreDetectorBase {\n  constructor() {\n    super(...arguments);\n    this.name = "detectPluginsArray";\n    this.capabilities = WORKER_SAFE_CAPABILITIES;\n    this.scoreWhenFailed = 0;\n    this.environment = new PluginsArrayEnvironment();\n  }\n  async calcScore() {\n    const pluginsArray = getPluginsArray();\n    if (!pluginsArray)\n      return 1;\n    return 0;\n  }\n}\nconst detectPluginsArray = new PluginsArrayDetector();\nconst getPluginsLength = () => {\n  if (navigator.plugins === void 0) {\n    throw new Error("navigator.plugins is undefined");\n  }\n  if (navigator.plugins.length === void 0) {\n    throw new Error("navigator.plugins.length is undefined");\n  }\n  return navigator.plugins.length;\n};\nclass PluginsLengthInconsistencyEnvironment extends DetectorEnvironmentBase {\n  async resolveScope() {\n    return {};\n  }\n}\nclass PluginsLengthInconsistencyDetector extends ScoreDetectorBase {\n  constructor() {\n    super(...arguments);\n    this.name = "detectPluginsLengthInconsistency";\n    this.capabilities = WORKER_SAFE_CAPABILITIES;\n    this.scoreWhenFailed = 0;\n    this.environment = new PluginsLengthInconsistencyEnvironment();\n  }\n  async calcScore() {\n    const pluginsLength = getPluginsLength();\n    const android = isAndroid();\n    const browserKind = getBrowserKind();\n    const browserEngineKind = getBrowserEngineKind();\n    if (!isChromeLike$1(browserKind) || android || browserEngineKind !== BrowserEngineKind.Chromium)\n      return 0;\n    if (pluginsLength === 0)\n      return 1;\n    return 0;\n  }\n}\nconst detectPluginsLengthInconsistency = new PluginsLengthInconsistencyDetector();\nconst getRTT = () => {\n  if (navigator.connection === void 0) {\n    throw new BotdError(State.Undefined, "navigator.connection is undefined");\n  }\n  if (navigator.connection.rtt === void 0) {\n    throw new BotdError(State.Undefined, "navigator.connection.rtt is undefined");\n  }\n  return navigator.connection.rtt;\n};\nclass RttEnvironment extends DetectorEnvironmentBase {\n  async resolveScope() {\n    return {};\n  }\n}\nclass RttDetector extends ScoreDetectorBase {\n  constructor() {\n    super(...arguments);\n    this.name = "detectRTT";\n    this.capabilities = WORKER_SAFE_CAPABILITIES;\n    this.scoreWhenFailed = 0;\n    this.environment = new RttEnvironment();\n  }\n  async calcScore() {\n    const rtt = getRTT();\n    const android = isAndroid();\n    if (android)\n      return 0;\n    if (rtt === 0)\n      return 0.2;\n    return 0;\n  }\n}\nconst detectRTT = new RttDetector();\nconst getWindowSize = () => ({\n  outerWidth: window.outerWidth,\n  outerHeight: window.outerHeight,\n  innerWidth: window.innerWidth,\n  innerHeight: window.innerHeight\n});\nclass WindowSizeEnvironment extends DetectorEnvironmentBase {\n  async resolveScope() {\n    return {\n      windowSize: getWindowSize(),\n      documentFocus: getDocumentFocus()\n    };\n  }\n}\nclass WindowSizeDetector extends ScoreDetectorBase {\n  constructor() {\n    super(...arguments);\n    this.name = "detectWindowSize";\n    this.capabilities = DEFAULT_DOM_CAPABILITIES;\n    this.scoreWhenFailed = 0;\n    this.environment = new WindowSizeEnvironment();\n  }\n  async calcScore() {\n    const { windowSize, documentFocus } = await this.environment.getCurrentScope();\n    const { outerWidth, outerHeight } = windowSize;\n    if (!documentFocus)\n      return 0;\n    if (outerWidth === 0 && outerHeight === 0)\n      return 1;\n    return 0;\n  }\n}\nconst detectWindowSize = new WindowSizeDetector();\nconst headlessDetectors = [\n  detectPluginsArray,\n  detectPluginsLengthInconsistency,\n  detectRTT,\n  detectWindowSize\n];\nconst incognitoDetectors = [];\nconst getLanguages = () => {\n  const n = navigator;\n  const result = [];\n  const language = n.language || n.userLanguage || n.browserLanguage || n.systemLanguage;\n  if (language !== void 0) {\n    result.push([language]);\n  }\n  if (Array.isArray(n.languages)) {\n    try {\n      const browserEngine = getBrowserEngineKind();\n      const browserVersion = getBrowserVersion();\n      const isChromium86OrNewer = browserEngine === BrowserEngineKind.Chromium && browserVersion.major >= 86;\n      if (!isChromium86OrNewer) {\n        result.push(n.languages);\n      }\n    } catch (error) {\n      result.push(n.languages);\n    }\n  } else if (typeof n.languages === "string") {\n    const languages = n.languages;\n    if (languages) {\n      result.push(languages.split(","));\n    }\n  }\n  return result;\n};\nclass LanguageEnvironment extends DetectorEnvironmentBase {\n  async resolveScope() {\n    return {\n      languages: getLanguages()\n    };\n  }\n}\nclass LanguageDetector extends ScoreDetectorBase {\n  constructor() {\n    super(...arguments);\n    this.name = "detectLanguage";\n    this.capabilities = WORKER_SAFE_CAPABILITIES;\n    this.scoreWhenFailed = 0.1;\n    this.environment = new LanguageEnvironment();\n  }\n  async calcScore() {\n    const { languages } = await this.environment.getCurrentScope();\n    if (languages.length === 0) {\n      return 1;\n    }\n    return 0;\n  }\n}\nconst detectLanguage = new LanguageDetector();\nconst languageDetectors = [detectLanguage];\nconst areMimeTypesConsistent = () => {\n  if (navigator.mimeTypes === void 0) {\n    throw new BotdError(State.Undefined, "navigator.mimeTypes is undefined");\n  }\n  const { mimeTypes } = navigator;\n  let isConsistent = Object.getPrototypeOf(mimeTypes) === MimeTypeArray.prototype;\n  for (let i = 0; i < mimeTypes.length; i++) {\n    isConsistent && (isConsistent = Object.getPrototypeOf(mimeTypes[i]) === MimeType.prototype);\n  }\n  return isConsistent;\n};\nclass MimeTypesConsistentEnvironment extends DetectorEnvironmentBase {\n  async resolveScope() {\n    return {\n      areMimeTypesConsistent: areMimeTypesConsistent()\n    };\n  }\n}\nclass MimeTypesConsistentDetector extends ScoreDetectorBase {\n  constructor() {\n    super(...arguments);\n    this.name = "detectMimeTypesConsistent";\n    this.capabilities = WORKER_SAFE_CAPABILITIES;\n    this.scoreWhenFailed = 0;\n    this.environment = new MimeTypesConsistentEnvironment();\n  }\n  async calcScore() {\n    const { areMimeTypesConsistent: areMimeTypesConsistent2 } = await this.environment.getCurrentScope();\n    if (!areMimeTypesConsistent2)\n      return 1;\n    return 0;\n  }\n}\nconst detectMimeTypesConsistent = new MimeTypesConsistentDetector();\nclass PlatformSetManuallyEnvironment extends DetectorEnvironmentBase {\n  async resolveScope() {\n    return {};\n  }\n}\nclass PlatformSetManuallyDetector extends ScoreDetectorBase {\n  constructor() {\n    super(...arguments);\n    this.name = "detectPlatformSetManually";\n    this.capabilities = WORKER_SAFE_CAPABILITIES;\n    this.scoreWhenFailed = 1;\n    this.environment = new PlatformSetManuallyEnvironment();\n  }\n  async calcScore() {\n    await delay(50);\n    const platform = navigator.platform || "unknown";\n    Object.defineProperty(navigator, "platform", {\n      get: () => platform\n    });\n    return 0;\n  }\n}\nconst detectPlatformSetManually = new PlatformSetManuallyDetector();\nconst delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));\nconst getProductSub = () => {\n  const { productSub } = navigator;\n  if (productSub === void 0) {\n    throw new Error("navigator.productSub is undefined");\n  }\n  return productSub;\n};\nclass ProductSubEnvironment extends DetectorEnvironmentBase {\n  async resolveScope() {\n    return {\n      productSub: getProductSub()\n    };\n  }\n}\nclass ProductSubDetector extends ScoreDetectorBase {\n  constructor() {\n    super(...arguments);\n    this.name = "detectProductSub";\n    this.capabilities = WORKER_SAFE_CAPABILITIES;\n    this.scoreWhenFailed = 0;\n    this.environment = new ProductSubEnvironment();\n  }\n  async calcScore() {\n    const { productSub } = await this.environment.getCurrentScope();\n    const browserKind = getBrowserKind();\n    if ((isChromeLike$1(browserKind) || browserKind === BrowserKind.Safari || browserKind === BrowserKind.Opera || browserKind === BrowserKind.WeChat) && productSub !== "20030107")\n      return 1;\n    return 0;\n  }\n}\nconst detectProductSub = new ProductSubDetector();\nconst navigatorDetectors = [\n  detectMimeTypesConsistent,\n  detectProductSub,\n  detectPlatformSetManually\n];\nconst getNotificationPermissions = async () => {\n  if (window.Notification === void 0) {\n    throw new Error("window.Notification is undefined");\n  }\n  if (navigator.permissions === void 0) {\n    throw new Error("navigator.permissions is undefined");\n  }\n  const { permissions } = navigator;\n  if (typeof permissions.query !== "function") {\n    throw new Error("navigator.permissions.query is not a function");\n  }\n  try {\n    const permissionStatus = await permissions.query({ name: "notifications" });\n    return window.Notification.permission === "denied" && permissionStatus.state === "prompt";\n  } catch (e) {\n    throw new Error("notificationPermissions signal unexpected behaviour");\n  }\n};\nclass NotificationPermissionsEnvironment extends DetectorEnvironmentBase {\n  async resolveScope() {\n    return {\n      notificationPermissions: await getNotificationPermissions()\n    };\n  }\n}\nclass NotificationPermissionsDetector extends ScoreDetectorBase {\n  constructor() {\n    super(...arguments);\n    this.name = "detectNotificationPermissions";\n    this.capabilities = DEFAULT_DOM_CAPABILITIES;\n    this.scoreWhenFailed = 0;\n    this.environment = new NotificationPermissionsEnvironment();\n  }\n  async calcScore() {\n    const { notificationPermissions } = await this.environment.getCurrentScope();\n    const browserKind = getBrowserKind();\n    if (!isChromeLike$1(browserKind))\n      return 0;\n    if (notificationPermissions && browserKind !== BrowserKind.SamsungInternet) {\n      return 1;\n    }\n    return 0;\n  }\n}\nconst detectNotificationPermissions = new NotificationPermissionsDetector();\nconst notificationDetectors = [\n  detectNotificationPermissions\n];\nconst resistanceDetectors = [];\nconst instanceId = String.fromCharCode(Math.random() * 26 + 97) + Math.random().toString(36).slice(-7);\nconst detectIframeProxyFn = () => {\n  try {\n    const iframe = document.createElement("iframe");\n    iframe.srcdoc = instanceId;\n    return iframe.contentWindow ? 0.5 : 0;\n  } catch (err) {\n    return 0.2;\n  }\n};\nconst detectHighChromeIndexFn = () => {\n  const key = "chrome";\n  const highIndexRange = -50;\n  return Object.keys(window).slice(highIndexRange).includes(key) && Object.getOwnPropertyNames(window).slice(highIndexRange).includes(key) && !window.Opr ? 0.5 : 0;\n};\nconst detectBadChromeRuntimeFn = () => {\n  if (!("chrome" in window && "runtime" in chrome)) {\n    return 0;\n  }\n  try {\n    if ("prototype" in chrome.runtime.sendMessage || "prototype" in chrome.runtime.connect) {\n      return 0.5;\n    }\n    new chrome.runtime.sendMessage();\n    new chrome.runtime.connect();\n    return 0.5;\n  } catch (err) {\n    return err.constructor.name !== "TypeError" ? 0.5 : 0;\n  }\n};\nconst detectTempProfileFn = () => {\n  return navigator.userAgent.includes("chrome_user_data_") ? 0.2 : 0;\n};\nconst detectStealthFn = () => {\n  const iframeScore = detectIframeProxyFn();\n  const chromeIndexScore = detectHighChromeIndexFn();\n  const runtimeScore = detectBadChromeRuntimeFn();\n  const tempProfileScore = detectTempProfileFn();\n  return Math.max(iframeScore, chromeIndexScore, runtimeScore, tempProfileScore);\n};\nclass StealthEnvironment extends DetectorEnvironmentBase {\n  async resolveScope() {\n    return {};\n  }\n}\nclass StealthDetector extends ScoreDetectorBase {\n  constructor() {\n    super(...arguments);\n    this.name = "detectStealth";\n    this.capabilities = DEFAULT_DOM_CAPABILITIES;\n    this.scoreWhenFailed = 0;\n    this.environment = new StealthEnvironment();\n  }\n  async calcScore() {\n    return detectStealthFn();\n  }\n}\nclass IframeProxyDetector extends ScoreDetectorBase {\n  constructor() {\n    super(...arguments);\n    this.name = "detectIframeProxy";\n    this.capabilities = DEFAULT_DOM_CAPABILITIES;\n    this.scoreWhenFailed = 0;\n    this.environment = new StealthEnvironment();\n  }\n  async calcScore() {\n    return detectIframeProxyFn();\n  }\n}\nclass TempProfileDetector extends ScoreDetectorBase {\n  constructor() {\n    super(...arguments);\n    this.name = "detectTempProfile";\n    this.capabilities = DEFAULT_DOM_CAPABILITIES;\n    this.scoreWhenFailed = 0;\n    this.environment = new StealthEnvironment();\n  }\n  async calcScore() {\n    return detectTempProfileFn();\n  }\n}\nclass HighChromeIndexDetector extends ScoreDetectorBase {\n  constructor() {\n    super(...arguments);\n    this.name = "detectHighChromeIndex";\n    this.capabilities = DEFAULT_DOM_CAPABILITIES;\n    this.scoreWhenFailed = 0;\n    this.environment = new StealthEnvironment();\n  }\n  async calcScore() {\n    return detectHighChromeIndexFn();\n  }\n}\nclass BadChromeRuntimeDetector extends ScoreDetectorBase {\n  constructor() {\n    super(...arguments);\n    this.name = "detectBadChromeRuntime";\n    this.capabilities = DEFAULT_DOM_CAPABILITIES;\n    this.scoreWhenFailed = 0;\n    this.environment = new StealthEnvironment();\n  }\n  async calcScore() {\n    return detectBadChromeRuntimeFn();\n  }\n}\nnew StealthDetector();\nconst detectIframeProxy = new IframeProxyDetector();\nconst detectTempProfile = new TempProfileDetector();\nconst detectHighChromeIndex = new HighChromeIndexDetector();\nconst detectBadChromeRuntime = new BadChromeRuntimeDetector();\nconst stealthDetectors = [\n  detectIframeProxy,\n  detectHighChromeIndex,\n  detectBadChromeRuntime,\n  detectTempProfile\n];\nconst timezoneDetectors = [];\nconst getWebGL = () => {\n  const canvasElement = document.createElement("canvas");\n  if (typeof canvasElement.getContext !== "function") {\n    throw new BotdError(State.NotFunction, "HTMLCanvasElement.getContext is not a function");\n  }\n  const webGLContext = canvasElement.getContext("webgl");\n  if (webGLContext === null) {\n    throw new BotdError(State.Null, "WebGLRenderingContext is null");\n  }\n  if (typeof webGLContext.getParameter !== "function") {\n    throw new BotdError(State.NotFunction, "WebGLRenderingContext.getParameter is not a function");\n  }\n  const vendor = webGLContext.getParameter(webGLContext.VENDOR);\n  const renderer = webGLContext.getParameter(webGLContext.RENDERER);\n  return { vendor, renderer };\n};\nclass WebGLEnvironment extends DetectorEnvironmentBase {\n  async resolveScope() {\n    return {\n      webGL: getWebGL()\n    };\n  }\n}\nclass WebGLDetector extends ScoreDetectorBase {\n  constructor() {\n    super(...arguments);\n    this.name = "detectWebGL";\n    this.capabilities = CANVAS_CAPABILITIES;\n    this.scoreWhenFailed = 0.1;\n    this.environment = new WebGLEnvironment();\n  }\n  async calcScore() {\n    const { vendor, renderer } = (await this.environment.getCurrentScope()).webGL;\n    if (vendor === "Brian Paul" && renderer === "Mesa OffScreen") {\n      return 1;\n    }\n    return 0;\n  }\n}\nconst detectWebGL = new WebGLDetector();\nconst webGlDetectors = [detectWebGL];\nconst getWebDriver = () => {\n  if (navigator.webdriver === void 0) {\n    throw new BotdError(State.Undefined, "navigator.webdriver is undefined");\n  }\n  return navigator.webdriver;\n};\nclass WebDriverEnvironment extends DetectorEnvironmentBase {\n  async resolveScope() {\n    return {\n      supportsWebdriver: getWebDriver()\n    };\n  }\n}\nclass WebDriverDetector extends ScoreDetectorBase {\n  constructor() {\n    super(...arguments);\n    this.name = "detectWebDriver";\n    this.capabilities = WORKER_SAFE_CAPABILITIES;\n    this.scoreWhenFailed = 0;\n    this.environment = new WebDriverEnvironment();\n  }\n  async calcScore() {\n    const { supportsWebdriver } = await this.environment.getCurrentScope();\n    if (supportsWebdriver)\n      return 1;\n    return 0;\n  }\n}\nconst detectWebDriver = new WebDriverDetector();\nconst webdriverDetectors = [detectWebDriver];\nconst supportsLocalAiSummarizer = () => {\n  return void 0 !== window.Summarizer;\n};\nclass AiEnvironment extends DetectorEnvironmentBase {\n  constructor() {\n    super(...arguments);\n    this.browserExpectations = [\n      {\n        browser: {\n          name: BrowserKind.Chrome,\n          version: "139.0.7205.0"\n        },\n        scope: {\n          supportsWindowAi: false,\n          isSecureContext: true\n        }\n      },\n      {\n        browser: {\n          name: BrowserKind.Chrome,\n          // https://chromestatus.com/feature/5193953788559360\n          version: "140.0.7259.0"\n        },\n        scope: {\n          supportsWindowAi: true,\n          isSecureContext: true\n        }\n      }\n    ];\n  }\n  async resolveScope() {\n    return {\n      supportsWindowAi: supportsLocalAiSummarizer(),\n      isSecureContext: window.isSecureContext\n    };\n  }\n}\nclass AiDetector extends ScoreDetectorBase {\n  constructor() {\n    super(...arguments);\n    this.name = "detectAI";\n    this.capabilities = DEFAULT_DOM_CAPABILITIES;\n    this.scoreWhenFailed = 0;\n    this.environment = new AiEnvironment();\n  }\n  async calcScore() {\n    const browserKind = getBrowserKind();\n    const browserVersion = getBrowserVersion();\n    const browserIsAndroid = isAndroid();\n    const { supportsWindowAi, isSecureContext } = await this.environment.getCurrentScope();\n    let shouldSupportAi = false;\n    switch (browserKind) {\n      case BrowserKind.Chrome:\n        if (!browserIsAndroid && browserVersion.major >= 138) {\n          shouldSupportAi = isSecureContext;\n        }\n        break;\n      case BrowserKind.Edge:\n        if (!browserIsAndroid && browserVersion.major >= 138) {\n          shouldSupportAi = isSecureContext;\n        }\n        break;\n      case BrowserKind.Brave:\n      case BrowserKind.SamsungInternet:\n        shouldSupportAi = false;\n        break;\n      case BrowserKind.Opera:\n        if (!browserIsAndroid && browserVersion.major >= 122) {\n          shouldSupportAi = isSecureContext;\n        }\n        break;\n      case BrowserKind.Firefox:\n      case BrowserKind.Safari:\n        shouldSupportAi = false;\n        break;\n      default:\n        shouldSupportAi = false;\n        break;\n    }\n    return supportsWindowAi !== shouldSupportAi ? 1 : 0;\n  }\n}\nconst detectAI = new AiDetector();\nconst getDistinctiveProperties = () => {\n  const distinctivePropsList = {\n    [getBotKind("Awesomium")]: {\n      window: ["awesomium"]\n    },\n    [getBotKind("Cef")]: {\n      window: ["RunPerfTest"]\n    },\n    [getBotKind("CefSharp")]: {\n      window: ["CefSharp"]\n    },\n    [getBotKind("CoachJS")]: {\n      window: ["emit"]\n    },\n    [getBotKind("FMiner")]: {\n      window: ["fmget_targets"]\n    },\n    [getBotKind("Geb")]: {\n      window: ["geb"]\n    },\n    [getBotKind("NightmareJS")]: {\n      window: ["__nightmare", "nightmare"]\n    },\n    [getBotKind("Phantomas")]: {\n      window: ["__phantomas"]\n    },\n    [getBotKind("PhantomJS")]: {\n      window: ["callPhantom", "_phantom"]\n    },\n    [getBotKind("Rhino")]: {\n      window: ["spawn"]\n    },\n    [getBotKind("Selenium")]: {\n      window: [\n        "_Selenium_IDE_Recorder",\n        "_selenium",\n        "calledSelenium",\n        /^([a-z]){3}_.*_(Array|Promise|Symbol)$/\n      ],\n      document: [\n        "__selenium_evaluate",\n        "selenium-evaluate",\n        "__selenium_unwrapped"\n      ]\n    },\n    [getBotKind("WebDriverIO")]: {\n      window: ["wdioElectron"]\n    },\n    [getBotKind("WebDriver")]: {\n      window: [\n        "webdriver",\n        "__webdriverFunc",\n        "__lastWatirAlert",\n        "__lastWatirConfirm",\n        "__lastWatirPrompt",\n        "_WEBDRIVER_ELEM_CACHE",\n        "ChromeDriverw"\n      ],\n      document: [\n        "__webdriver_script_fn",\n        "__driver_evaluate",\n        "__webdriver_evaluate",\n        "__fxdriver_evaluate",\n        "__driver_unwrapped",\n        "__webdriver_unwrapped",\n        "__fxdriver_unwrapped",\n        "__webdriver_script_fn",\n        "__webdriver_script_func",\n        "__webdriver_script_function",\n        "$cdc_asdjflasutopfhvcZLmcf",\n        "$cdc_asdjflasutopfhvcZLmcfl_",\n        "$chrome_asyncScriptInfo",\n        "__$webdriverAsyncExecutor"\n      ]\n    },\n    [getBotKind("HeadlessChrome")]: {\n      window: ["domAutomation", "domAutomationController"]\n    }\n  };\n  let botName;\n  const result = {};\n  const windowProps = getObjectProps(window);\n  let documentProps = [];\n  if (window.document !== void 0)\n    documentProps = getObjectProps(window.document);\n  for (botName in distinctivePropsList) {\n    const props = distinctivePropsList[botName];\n    if (props !== void 0) {\n      const windowContains = props.window === void 0 ? false : includes(windowProps, ...props.window);\n      const documentContains = props.document === void 0 || !documentProps.length ? false : includes(documentProps, ...props.document);\n      result[botName] = windowContains || documentContains;\n    }\n  }\n  return result;\n};\nclass DistinctivePropertiesEnvironment extends DetectorEnvironmentBase {\n  async resolveScope() {\n    return {\n      distinctiveProperties: getDistinctiveProperties()\n    };\n  }\n}\nclass DistinctivePropertiesDetector extends ScoreDetectorBase {\n  constructor() {\n    super(...arguments);\n    this.name = "detectDistinctiveProperties";\n    this.capabilities = DEFAULT_DOM_CAPABILITIES;\n    this.scoreWhenFailed = 0;\n    this.environment = new DistinctivePropertiesEnvironment();\n  }\n  async calcScore() {\n    const { distinctiveProperties } = await this.environment.getCurrentScope();\n    const value = distinctiveProperties;\n    let bot;\n    for (bot in value)\n      if (value[bot])\n        return 1;\n    return 0;\n  }\n}\nconst detectDistinctiveProperties = new DistinctivePropertiesDetector();\nconst getDocumentElementKeys = () => {\n  if (document.documentElement === void 0) {\n    throw new Error("document.documentElement is undefined");\n  }\n  const { documentElement } = document;\n  if (typeof documentElement.getAttributeNames !== "function") {\n    throw new Error("document.documentElement.getAttributeNames is not a function");\n  }\n  return documentElement.getAttributeNames();\n};\nclass DocumentAttributesEnvironment extends DetectorEnvironmentBase {\n  async resolveScope() {\n    return {\n      documentElementKeys: getDocumentElementKeys()\n    };\n  }\n}\nclass DocumentAttributesDetector extends ScoreDetectorBase {\n  constructor() {\n    super(...arguments);\n    this.name = "detectDocumentAttributes";\n    this.capabilities = DEFAULT_DOM_CAPABILITIES;\n    this.scoreWhenFailed = 0;\n    this.environment = new DocumentAttributesEnvironment();\n  }\n  async calcScore() {\n    const { documentElementKeys } = await this.environment.getCurrentScope();\n    if (includes(documentElementKeys, "selenium", "webdriver", "driver")) {\n      return 1;\n    }\n    return 0;\n  }\n}\nconst detectDocumentAttributes = new DocumentAttributesDetector();\nconst getProcess = () => {\n  const { process } = window;\n  const errorPrefix = "window.process is";\n  if (process === void 0) {\n    throw new Error(`${errorPrefix} undefined`);\n  }\n  if (process && typeof process !== "object") {\n    throw new Error(`${errorPrefix} not an object`);\n  }\n  return process;\n};\nclass ProcessEnvironment extends DetectorEnvironmentBase {\n  async resolveScope() {\n    let process = {};\n    try {\n      process = getProcess();\n    } catch (error) {\n    }\n    return {\n      process\n    };\n  }\n}\nclass ProcessDetector extends ScoreDetectorBase {\n  constructor() {\n    super(...arguments);\n    this.name = "detectProcess";\n    this.capabilities = DEFAULT_DOM_CAPABILITIES;\n    this.scoreWhenFailed = 0;\n    this.environment = new ProcessEnvironment();\n  }\n  async calcScore() {\n    const { process } = await this.environment.getCurrentScope();\n    if (\n      // Use process.type === "renderer" to detect Electron\n      process.type === "renderer" || process.versions?.electron != null\n    ) {\n      return 1;\n    }\n    return 0;\n  }\n}\nconst detectProcess = new ProcessDetector();\nconst getWindowExternal = () => {\n  if (window.external === void 0) {\n    throw new Error("window.external is undefined");\n  }\n  const { external } = window;\n  if (typeof external.toString !== "function") {\n    throw new Error("window.external.toString is not a function");\n  }\n  return external.toString();\n};\nclass WindowExternalEnvironment extends DetectorEnvironmentBase {\n  async resolveScope() {\n    return {\n      windowExternal: getWindowExternal()\n    };\n  }\n}\nclass WindowExternalDetector extends ScoreDetectorBase {\n  constructor() {\n    super(...arguments);\n    this.name = "detectWindowExternal";\n    this.capabilities = DEFAULT_DOM_CAPABILITIES;\n    this.scoreWhenFailed = 0;\n    this.environment = new WindowExternalEnvironment();\n  }\n  async calcScore() {\n    const { windowExternal } = await this.environment.getCurrentScope();\n    if (/Sequentum/i.test(windowExternal))\n      return 1;\n    return 0;\n  }\n}\nconst detectWindowExternal = new WindowExternalDetector();\nconst windowDetectors = [\n  detectDistinctiveProperties,\n  detectDocumentAttributes,\n  detectProcess,\n  detectWindowExternal,\n  detectAI\n];\nconst workerDetectors = [];\nconst detectors = [\n  ...agentDetectors,\n  ...appVersionDetectors,\n  ...audioDetectors,\n  ...behaviourDetectors,\n  ...canvasDetectors,\n  ...caretDetectors,\n  ...cdpDetectors,\n  ...cssDetectors,\n  ...errorDetectors,\n  ...fontsDetectors,\n  ...functionsDetectors,\n  ...headlessDetectors,\n  ...incognitoDetectors,\n  ...languageDetectors,\n  ...navigatorDetectors,\n  ...notificationDetectors,\n  ...resistanceDetectors,\n  ...stealthDetectors,\n  ...timezoneDetectors,\n  ...webdriverDetectors,\n  ...webGlDetectors,\n  ...windowDetectors,\n  ...workerDetectors\n];\nfunction filterDetectors(detectors2, filter) {\n  return detectors2.filter((detector) => filter(detector.capabilities));\n}\nfunction getWorkerSafeDetectors() {\n  return filterDetectors(detectors, (caps) => caps.workerSafe);\n}\nconst botScoreWorkerSafe = async () => {\n  const workerSafeDetectors = getWorkerSafeDetectors();\n  return Promise.all(workerSafeDetectors.map(async (detector) => detector.getDetectedScore()));\n};\nself.addEventListener("message", async (event) => {\n  const { taskId, task, browserContext } = event.data;\n  try {\n    let result;\n    switch (task) {\n      case "calculateBotScore":\n        setBrowserContext(browserContext.browserKind, browserContext.browserEngineKind, browserContext.browserVersion, browserContext.userAgent);\n        result = await botScoreWorkerSafe();\n        break;\n      default:\n        throw new Error(`Unknown task: ${task}`);\n    }\n    const response = { taskId, result };\n    self.postMessage(response);\n  } catch (error) {\n    const response = {\n      taskId,\n      error: error instanceof Error ? error.message : "Unknown error"\n    };\n    self.postMessage(response);\n  }\n});\n';
const blob$1 = typeof self !== "undefined" && self.Blob && new Blob(["URL.revokeObjectURL(import.meta.url);", jsContent$1], { type: "text/javascript;charset=utf-8" });
function WorkerWrapper$1(options) {
  let objURL;
  try {
    objURL = blob$1 && (self.URL || self.webkitURL).createObjectURL(blob$1);
    if (!objURL) throw "";
    const worker = new Worker(objURL, {
      type: "module",
      name: options?.name
    });
    worker.addEventListener("error", () => {
      (self.URL || self.webkitURL).revokeObjectURL(objURL);
    });
    return worker;
  } catch (e) {
    return new Worker(
      "data:text/javascript;charset=utf-8," + encodeURIComponent(jsContent$1),
      {
        type: "module",
        name: options?.name
      }
    );
  }
}
class BotScoreWorkerManager {
  constructor() {
    this.worker = null;
    this.isInitializing = false;
    this.taskCounter = 0;
  }
  /**
   * Calculate bot score using Web Worker if available, fallback to main thread
   */
  async calculateBotScore() {
    try {
      const workerScorePromise = this.runWorkerSafeDetectors();
      const mainThreadScorePromise = botScoreMainThread();
      const [workerScores, mainThreadScores] = await Promise.all([
        workerScorePromise,
        mainThreadScorePromise
      ]);
      return { workerScores, mainThreadScores };
    } catch (error) {
      return { workerScores: [], mainThreadScores: [] };
    }
  }
  /**
   * Run worker-safe detectors either in Web Worker or fallback to main thread
   */
  async runWorkerSafeDetectors() {
    try {
      await this.initWorker();
      if (this.worker) {
        return this.sendWorkerTask("calculateBotScore");
      }
    } catch (error) {
      console.warn("Worker failed, falling back to main thread for worker-safe detectors:", error);
    }
    return botScoreWorkerSafe();
  }
  /**
   * Initialize the Web Worker (public so it can be pre-warmed externally)
   */
  async initWorker() {
    if (this.worker || this.isInitializing) {
      return;
    }
    this.isInitializing = true;
    try {
      this.worker = new WorkerWrapper$1({});
      this.worker.onerror = (e) => {
        this.cleanup();
      };
      await this.testWorker();
    } catch (error) {
      this.cleanup();
    }
  }
  /**
   * Clean up blob URL and reset initialization state
   */
  cleanup() {
    this.isInitializing = false;
    this.worker = null;
  }
  /**
   * Test if the worker is functioning
   */
  async testWorker() {
    if (!this.worker) {
      throw new Error("No worker available");
    }
    const worker = this.worker;
    const browserContext = {
      browserKind: getBrowserKind(),
      browserEngineKind: getBrowserEngineKind(),
      browserVersion: getBrowserVersion(),
      userAgent: navigator.userAgent
    };
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Worker test timeout"));
      }, 5e3);
      const testHandler = (event) => {
        const { taskId, error } = event.data;
        if (taskId === "test") {
          clearTimeout(timeout);
          worker.removeEventListener("message", testHandler);
          if (error) {
            reject(new Error(error));
          } else {
            resolve();
          }
        }
      };
      worker.addEventListener("message", testHandler);
      worker.postMessage({
        taskId: "test",
        task: "calculateBotScore",
        browserContext
      });
    });
  }
  /**
   * Send a task to the worker and wait for the result
   */
  async sendWorkerTask(task) {
    if (!this.worker) {
      throw new Error("Worker not available");
    }
    const taskId = `task_${++this.taskCounter}_${Date.now()}`;
    const browserContext = {
      browserKind: getBrowserKind(),
      browserEngineKind: getBrowserEngineKind(),
      browserVersion: getBrowserVersion(),
      userAgent: navigator.userAgent
    };
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error("Worker not available"));
        return;
      }
      const timeout = setTimeout(() => {
        reject(new Error(`Worker task ${task} timeout`));
      }, 1e4);
      const messageHandler = (event) => {
        const { taskId: responseTaskId, result, error } = event.data;
        if (responseTaskId === taskId) {
          clearTimeout(timeout);
          this.worker?.removeEventListener("message", messageHandler);
          if (error) {
            reject(new Error(error));
          } else if (result) {
            resolve(result);
          } else {
            reject(new Error("No result received"));
          }
        }
      };
      this.worker.addEventListener("message", messageHandler);
      const request = { taskId, task, browserContext };
      this.worker.postMessage(request);
    });
  }
  /**
   * Clean up the worker and blob URL
   */
  dispose() {
    if (this.worker) {
      this.worker.terminate();
    }
    this.cleanup();
  }
}
let botScoreWorkerManager = null;
function getBotScoreWorkerManager() {
  if (!botScoreWorkerManager) {
    botScoreWorkerManager = new BotScoreWorkerManager();
  }
  return botScoreWorkerManager;
}
async function prefetchBotScoreWorker() {
  try {
    const manager = getBotScoreWorkerManager();
    await manager.initWorker();
  } catch {
  }
}
const BotScoreWorkerManager$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: getBotScoreWorkerManager,
  prefetchBotScoreWorker
}, Symbol.toStringTag, { value: "Module" }));
let encryptedHeadHashAtLoad = null;
if (document !== void 0) {
  prefetchBotScoreWorker().catch(() => void 0);
  prefetchSimHashWorker().catch(() => void 0);
  const headHashPromise = computeHeadSimHashAsync();
  headHashPromise.catch(() => void 0);
  if (canPrewarmBrowserCrypto()) {
    encryptedHeadHashAtLoad = headHashPromise.then((h) => encryptData(h)).catch(() => "");
  }
}
const yieldToMain = () => {
  if ("scheduler" in globalThis && typeof globalThis.scheduler?.yield === "function") {
    return globalThis.scheduler.yield();
  }
  return new Promise((resolve) => setTimeout(resolve, 0));
};
const detect = async (env, randomProviderSelectorFn, container, restart, accountGenerator) => {
  let cleanupShadowDetection = () => {
  };
  const shadowDomState = { interactionDetected: false };
  await yieldToMain();
  const mouseTracker = createMouseTracker({ maxPoints: 50 });
  const touchTracker = createTouchTracker({ maxPoints: 50 });
  const clickTracker = createClickTracker({ maxPoints: 50 });
  mouseTracker.start();
  touchTracker.start();
  clickTracker.start();
  const deviceType = hasTouchSupport();
  await yieldToMain();
  const setupShadowDetection = async () => {
    if (container) {
      await yieldToMain();
      const [cleanup, detected] = setupShadowDomDetection(
        container,
        restart,
        // Callback to update the shadow DOM state when detection occurs
        (detectedState) => {
          shadowDomState.interactionDetected = detectedState;
        }
      );
      cleanupShadowDetection = cleanup;
      shadowDomState.interactionDetected = detected;
    }
  };
  const shadowDetectionPromise = setupShadowDetection();
  await yieldToMain();
  const [botScoreResult, userAccount] = await Promise.all([
    botScore(),
    accountGenerator()
  ]);
  await Promise.race([
    shadowDetectionPromise,
    new Promise((resolve) => setTimeout(resolve, 50))
  ]);
  await yieldToMain();
  const shadowDomPenalty = shadowDomState.interactionDetected ? 1 : 0;
  const noise = Math.random() * 0.3;
  const score = Math.min(botScoreResult.scores.reduce((sum, value) => sum + value, 0) + noise + shadowDomPenalty, 1);
  const triggeredHex = encodeTriggeredBitfield(botScoreResult.triggeredIndices, botScoreResult.scores.length);
  const webView = isWebView();
  const ifFrame = inIframe();
  let token;
  let encryptHeadHash;
  let provider;
  await yieldToMain();
  try {
    const [currentTime, scorePayload, providerSelectEntropy, headHash] = await generatePayload(score, userAccount.account.address, webView, ifFrame, triggeredHex);
    const headHashEncryptPromise = encryptedHeadHashAtLoad?.then((pre) => pre === "" ? encryptData(headHash) : pre) ?? encryptData(headHash);
    const [resolvedProvider, resolvedToken, resolvedHeadHash] = await Promise.all([
      randomProviderSelectorFn(env, providerSelectEntropy),
      encryptData(JSON.stringify([currentTime, scorePayload, providerSelectEntropy])),
      headHashEncryptPromise
    ]);
    provider = resolvedProvider;
    token = resolvedToken;
    encryptHeadHash = resolvedHeadHash;
  } catch (e) {
    token = "";
    encryptHeadHash = "";
  }
  let encodedSimd;
  const getSimdReadings = async (timeoutMs = 1e3) => {
    if (encodedSimd)
      return encodedSimd;
    try {
      const result = await awaitSimdBenchmark(timeoutMs);
      if (!result.supported)
        return void 0;
      encodedSimd = await encodeSimdReadings(toSimdReadings(result));
      return encodedSimd;
    } catch {
      return void 0;
    }
  };
  return {
    token,
    provider,
    shadowDomCleanup: cleanupShadowDetection,
    encryptHeadHash,
    mouseTracker,
    touchTracker,
    clickTracker,
    hasTouchSupport: deviceType,
    encryptBehavioralData: encryptData,
    packBehavioralData,
    userAccount,
    getSimdReadings
  };
};
const jsContent = 'const MAGIC = [0, 97, 115, 109];\nconst VERSION = [1, 0, 0, 0];\nconst TYPE_I32 = 127;\nconst TYPE_V128 = 123;\nconst TYPE_FUNC = 96;\nconst BLOCKTYPE_EMPTY = 64;\nconst OP_BLOCK = 2;\nconst OP_LOOP = 3;\nconst OP_BR = 12;\nconst OP_BR_IF = 13;\nconst OP_END = 11;\nconst OP_LOCAL_GET = 32;\nconst OP_LOCAL_SET = 33;\nconst OP_I32_CONST = 65;\nconst OP_I32_ADD = 106;\nconst OP_I32_GE_S = 78;\nconst SIMD_PREFIX = 253;\nconst SIMD_V128_CONST = 12;\nconst SIMD_I32X4_EXTRACT_LANE = 27;\nconst uleb128 = (n) => {\n  const out = [];\n  let x = n >>> 0;\n  do {\n    let b = x & 127;\n    x = x >>> 7;\n    if (x !== 0)\n      b |= 128;\n    out.push(b);\n  } while (x !== 0);\n  return out;\n};\nconst section = (id, body) => [\n  id,\n  ...uleb128(body.length),\n  ...body\n];\nconst encodeName = (s) => {\n  const bytes = new TextEncoder().encode(s);\n  return [...uleb128(bytes.length), ...bytes];\n};\nconst simdOp = (opcode) => [SIMD_PREFIX, ...uleb128(opcode)];\nconst v128Const = (bytes) => {\n  if (bytes.length !== 16) {\n    throw new Error("v128.const requires exactly 16 bytes");\n  }\n  return [SIMD_PREFIX, SIMD_V128_CONST, ...Array.from(bytes)];\n};\nconst buildSimdLoopModule = (op) => {\n  const typeSection = section(1, [\n    1,\n    TYPE_FUNC,\n    1,\n    TYPE_I32,\n    // params\n    1,\n    TYPE_I32\n    // results\n  ]);\n  const funcSection = section(3, [1, 0]);\n  const exportSection = section(7, [\n    1,\n    ...encodeName("run"),\n    0,\n    0\n    // kind func, index 0\n  ]);\n  const localDecls = [\n    2,\n    // two distinct local groups\n    1,\n    TYPE_I32,\n    1,\n    TYPE_V128\n  ];\n  const body = [\n    ...localDecls,\n    // acc = v128(init)\n    ...v128Const(op.init),\n    OP_LOCAL_SET,\n    2,\n    // block\n    OP_BLOCK,\n    BLOCKTYPE_EMPTY,\n    // loop\n    OP_LOOP,\n    BLOCKTYPE_EMPTY,\n    // if (i >= iters) br_if 1\n    OP_LOCAL_GET,\n    1,\n    OP_LOCAL_GET,\n    0,\n    OP_I32_GE_S,\n    OP_BR_IF,\n    1,\n    // acc = simd_op(acc, step)\n    OP_LOCAL_GET,\n    2,\n    ...v128Const(op.step),\n    ...simdOp(op.opcode),\n    OP_LOCAL_SET,\n    2,\n    // i = i + 1\n    OP_LOCAL_GET,\n    1,\n    OP_I32_CONST,\n    1,\n    OP_I32_ADD,\n    OP_LOCAL_SET,\n    1,\n    // br 0 (continue loop)\n    OP_BR,\n    0,\n    OP_END,\n    // end loop\n    OP_END,\n    // end block\n    // extract lane 0 (as i32 bit pattern) so the result is observable\n    OP_LOCAL_GET,\n    2,\n    SIMD_PREFIX,\n    SIMD_I32X4_EXTRACT_LANE,\n    0,\n    OP_END\n    // end function\n  ];\n  const codeSection = section(10, [1, ...uleb128(body.length), ...body]);\n  return new Uint8Array([\n    ...MAGIC,\n    ...VERSION,\n    ...typeSection,\n    ...funcSection,\n    ...exportSection,\n    ...codeSection\n  ]);\n};\nconst buildShuffleLoopModule = (init, step, indices) => {\n  if (indices.length !== 16) {\n    throw new Error("i8x16.shuffle requires 16 lane indices");\n  }\n  const typeSection = section(1, [1, TYPE_FUNC, 1, TYPE_I32, 1, TYPE_I32]);\n  const funcSection = section(3, [1, 0]);\n  const exportSection = section(7, [1, ...encodeName("run"), 0, 0]);\n  const localDecls = [2, 1, TYPE_I32, 1, TYPE_V128];\n  const body = [\n    ...localDecls,\n    ...v128Const(init),\n    OP_LOCAL_SET,\n    2,\n    OP_BLOCK,\n    BLOCKTYPE_EMPTY,\n    OP_LOOP,\n    BLOCKTYPE_EMPTY,\n    OP_LOCAL_GET,\n    1,\n    OP_LOCAL_GET,\n    0,\n    OP_I32_GE_S,\n    OP_BR_IF,\n    1,\n    // acc = i8x16.shuffle(acc, step, indices)\n    OP_LOCAL_GET,\n    2,\n    ...v128Const(step),\n    SIMD_PREFIX,\n    13,\n    // i8x16.shuffle\n    ...Array.from(indices),\n    OP_LOCAL_SET,\n    2,\n    OP_LOCAL_GET,\n    1,\n    OP_I32_CONST,\n    1,\n    OP_I32_ADD,\n    OP_LOCAL_SET,\n    1,\n    OP_BR,\n    0,\n    OP_END,\n    OP_END,\n    OP_LOCAL_GET,\n    2,\n    SIMD_PREFIX,\n    SIMD_I32X4_EXTRACT_LANE,\n    0,\n    OP_END\n  ];\n  const codeSection = section(10, [1, ...uleb128(body.length), ...body]);\n  return new Uint8Array([\n    ...MAGIC,\n    ...VERSION,\n    ...typeSection,\n    ...funcSection,\n    ...exportSection,\n    ...codeSection\n  ]);\n};\nconst f32x4Bytes = (a, b, c, d) => {\n  const buf = new ArrayBuffer(16);\n  const view = new DataView(buf);\n  view.setFloat32(0, a, true);\n  view.setFloat32(4, b, true);\n  view.setFloat32(8, c, true);\n  view.setFloat32(12, d, true);\n  return new Uint8Array(buf);\n};\nconst i32x4Bytes = (a, b, c, d) => {\n  const buf = new ArrayBuffer(16);\n  const view = new DataView(buf);\n  view.setInt32(0, a | 0, true);\n  view.setInt32(4, b | 0, true);\n  view.setInt32(8, c | 0, true);\n  view.setInt32(12, d | 0, true);\n  return new Uint8Array(buf);\n};\nconst i16x8Bytes = (a, b, c, d, e, f, g, h) => {\n  const buf = new ArrayBuffer(16);\n  const view = new DataView(buf);\n  view.setInt16(0, a, true);\n  view.setInt16(2, b, true);\n  view.setInt16(4, c, true);\n  view.setInt16(6, d, true);\n  view.setInt16(8, e, true);\n  view.setInt16(10, f, true);\n  view.setInt16(12, g, true);\n  view.setInt16(14, h, true);\n  return new Uint8Array(buf);\n};\nconst buildSimdProbeModule = () => {\n  const typeSection = section(1, [1, TYPE_FUNC, 0, 0]);\n  const funcSection = section(3, [1, 0]);\n  const exportSection = section(7, [1, ...encodeName("p"), 0, 0]);\n  const zeros = new Uint8Array(16);\n  const body = [\n    0,\n    // no locals\n    ...v128Const(zeros),\n    26,\n    // drop\n    OP_END\n  ];\n  const codeSection = section(10, [1, ...uleb128(body.length), ...body]);\n  return new Uint8Array([\n    ...MAGIC,\n    ...VERSION,\n    ...typeSection,\n    ...funcSection,\n    ...exportSection,\n    ...codeSection\n  ]);\n};\nconst OPCODE_V128_XOR = 81;\nconst OPCODE_I16X8_MUL = 149;\nconst OPCODE_I32X4_ADD = 174;\nconst OPCODE_I32X4_MUL = 181;\nconst OPCODE_F32X4_ADD = 228;\nconst OPCODE_F32X4_MUL = 230;\nconst OPCODE_F32X4_DIV = 231;\nconst v128BinaryOp = (name, category, spec) => ({\n  name,\n  category,\n  buildModule: () => buildSimdLoopModule(spec)\n});\nconst SHUFFLE_INDICES = new Uint8Array([\n  15,\n  1,\n  14,\n  2,\n  13,\n  3,\n  12,\n  4,\n  11,\n  5,\n  10,\n  6,\n  9,\n  7,\n  8,\n  0\n]);\nconst SIMD_BENCHMARKS = [\n  v128BinaryOp("f32x4_add", "FP", {\n    opcode: OPCODE_F32X4_ADD,\n    init: f32x4Bytes(1.1, 2.2, 3.3, 4.4),\n    step: f32x4Bytes(1e-4, -1e-4, 2e-4, -2e-4)\n  }),\n  v128BinaryOp("f32x4_mul", "FP", {\n    opcode: OPCODE_F32X4_MUL,\n    init: f32x4Bytes(1.000001, 1.000002, 0.999999, 0.999998),\n    step: f32x4Bytes(1.0000001, 0.9999999, 1.0000002, 0.9999998)\n  }),\n  v128BinaryOp("f32x4_div", "FP", {\n    opcode: OPCODE_F32X4_DIV,\n    init: f32x4Bytes(1, 2, 3, 4),\n    step: f32x4Bytes(1.0000001, 0.9999999, 1.0000002, 0.9999998)\n  }),\n  v128BinaryOp("i32x4_add", "INT", {\n    opcode: OPCODE_I32X4_ADD,\n    init: i32x4Bytes(1, 2, 3, 4),\n    step: i32x4Bytes(7, -3, 11, -5)\n  }),\n  v128BinaryOp("i32x4_mul", "INT", {\n    opcode: OPCODE_I32X4_MUL,\n    init: i32x4Bytes(1, 1, 1, 1),\n    step: i32x4Bytes(3, 5, 7, 11)\n  }),\n  v128BinaryOp("i16x8_mul", "INT", {\n    opcode: OPCODE_I16X8_MUL,\n    init: i16x8Bytes(1, 1, 1, 1, 1, 1, 1, 1),\n    step: i16x8Bytes(3, 5, 7, 11, 13, 17, 19, 23)\n  }),\n  v128BinaryOp("v128_xor", "BIT", {\n    opcode: OPCODE_V128_XOR,\n    init: i32x4Bytes(1431655765, 2863311530, 858993459, 3435973836),\n    step: i32x4Bytes(305419896, 2596069104, 252645135, 4042322160)\n  }),\n  {\n    name: "i8x16_shuffle",\n    category: "PERM",\n    buildModule: () => buildShuffleLoopModule(i32x4Bytes(16909060, 84281096, 151653132, 219025168), i32x4Bytes(286397204, 353769240, 421141276, 488513312), SHUFFLE_INDICES)\n  }\n];\nconst SCHEMA_VERSION = 1;\nconst DEFAULTS = {\n  targetMsPerRun: 15,\n  runsPerOp: 3,\n  budgetMs: 600\n};\nconst median = (xs) => {\n  if (xs.length === 0)\n    return 0;\n  const sorted = [...xs].sort((a, b) => a - b);\n  const mid = sorted.length >>> 1;\n  if (sorted.length % 2 === 0)\n    return (sorted[mid - 1] + sorted[mid]) / 2;\n  return sorted[mid];\n};\nconst estimateTimerResolution = () => {\n  let best = Number.POSITIVE_INFINITY;\n  let t0 = performance.now();\n  for (let i = 0; i < 20; i++) {\n    let t1 = performance.now();\n    while (t1 === t0)\n      t1 = performance.now();\n    const delta = t1 - t0;\n    if (delta > 0 && delta < best)\n      best = delta;\n    t0 = t1;\n  }\n  return Number.isFinite(best) ? best : 0;\n};\nconst isSimdSupported = () => {\n  if (typeof WebAssembly === "undefined")\n    return false;\n  if (typeof WebAssembly.validate !== "function")\n    return false;\n  try {\n    return WebAssembly.validate(buildSimdProbeModule());\n  } catch {\n    return false;\n  }\n};\nconst instantiateRun = async (bytes) => {\n  const { instance } = await WebAssembly.instantiate(bytes);\n  const exported = instance.exports.run;\n  if (typeof exported !== "function") {\n    throw new Error("WASM module did not export run()");\n  }\n  return exported;\n};\nconst calibrate = (run) => {\n  const probeIters = 5e4;\n  run(probeIters);\n  run(probeIters);\n  let best = Number.POSITIVE_INFINITY;\n  for (let i = 0; i < 3; i++) {\n    const start = performance.now();\n    run(probeIters);\n    const dt = performance.now() - start;\n    if (dt > 0 && dt < best)\n      best = dt;\n  }\n  if (!Number.isFinite(best) || best <= 0) {\n    return 3;\n  }\n  return best * 1e6 / probeIters;\n};\nconst pickIters = (nsPerIter, targetMs) => {\n  const target = Math.max(1, Math.ceil(targetMs * 1e6 / Math.max(0.1, nsPerIter)));\n  const MIN = 1e5;\n  const MAX = 5e7;\n  if (target < MIN)\n    return MIN;\n  if (target > MAX)\n    return MAX;\n  return target;\n};\nconst timeOp = (run, iters, runs) => {\n  run(Math.min(iters, 2e5));\n  const samples = [];\n  let lastResult = 0;\n  for (let i = 0; i < runs; i++) {\n    const start = performance.now();\n    lastResult = run(iters);\n    const dt = performance.now() - start;\n    if (dt > 0)\n      samples.push(dt * 1e6 / iters);\n  }\n  if (samples.length === 0) {\n    return { bestNsPerIter: 0, medianNsPerIter: 0, resultLane: lastResult };\n  }\n  const best = samples.reduce((m, v) => v < m ? v : m, samples[0]);\n  return {\n    bestNsPerIter: best,\n    medianNsPerIter: median(samples),\n    resultLane: lastResult | 0\n  };\n};\nconst runSimdBenchmark = async (options = {}) => {\n  const opts = { ...DEFAULTS, ...options };\n  if (!isSimdSupported()) {\n    return { supported: false, reason: "wasm-simd-unsupported" };\n  }\n  const overallStart = performance.now();\n  const timerResolutionMs = estimateTimerResolution();\n  const readings = [];\n  for (const spec of SIMD_BENCHMARKS) {\n    if (performance.now() - overallStart > opts.budgetMs)\n      break;\n    let run;\n    try {\n      run = await instantiateRun(spec.buildModule());\n    } catch {\n      continue;\n    }\n    const calibratedNs = calibrate(run);\n    const iters = pickIters(calibratedNs, opts.targetMsPerRun);\n    const { bestNsPerIter, medianNsPerIter, resultLane } = timeOp(run, iters, opts.runsPerOp);\n    readings.push({\n      name: spec.name,\n      category: spec.category,\n      nsPerIter: bestNsPerIter,\n      medianNsPerIter,\n      iters,\n      resultLane\n    });\n  }\n  return {\n    supported: true,\n    readings,\n    runsPerOp: opts.runsPerOp,\n    durationMs: performance.now() - overallStart,\n    timerResolutionMs,\n    schema: SCHEMA_VERSION\n  };\n};\nself.addEventListener("message", async (event) => {\n  const { taskId, test, options } = event.data;\n  if (test) {\n    const response = {\n      taskId,\n      result: { supported: false, reason: "test" }\n    };\n    self.postMessage(response);\n    return;\n  }\n  try {\n    const result = await runSimdBenchmark(options);\n    const response = { taskId, result };\n    self.postMessage(response);\n  } catch (err) {\n    const response = {\n      taskId,\n      error: err instanceof Error ? err.message : String(err)\n    };\n    self.postMessage(response);\n  }\n});\n';
const blob = typeof self !== "undefined" && self.Blob && new Blob(["URL.revokeObjectURL(import.meta.url);", jsContent], { type: "text/javascript;charset=utf-8" });
function WorkerWrapper(options) {
  let objURL;
  try {
    objURL = blob && (self.URL || self.webkitURL).createObjectURL(blob);
    if (!objURL) throw "";
    const worker = new Worker(objURL, {
      type: "module",
      name: options?.name
    });
    worker.addEventListener("error", () => {
      (self.URL || self.webkitURL).revokeObjectURL(objURL);
    });
    return worker;
  } catch (e) {
    return new Worker(
      "data:text/javascript;charset=utf-8," + encodeURIComponent(jsContent),
      {
        type: "module",
        name: options?.name
      }
    );
  }
}
class SimdBenchmarkWorkerManager {
  constructor() {
    this.worker = null;
    this.isInitializing = false;
    this.cachedResult = null;
    this.taskCounter = 0;
  }
  async initWorker() {
    if (this.worker || this.isInitializing)
      return;
    this.isInitializing = true;
    try {
      this.worker = new WorkerWrapper({});
      this.worker.onerror = () => {
        this.cleanup();
      };
      await this.testWorker();
    } catch {
      this.cleanup();
    } finally {
      this.isInitializing = false;
    }
  }
  cleanup() {
    if (this.worker)
      this.worker.terminate();
    this.worker = null;
    this.isInitializing = false;
  }
  testWorker() {
    if (!this.worker)
      return Promise.reject(new Error("No worker"));
    const worker = this.worker;
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        worker.removeEventListener("message", handler);
        reject(new Error("SIMD worker test timeout"));
      }, 5e3);
      const handler = (event) => {
        if (event.data.taskId === "test") {
          clearTimeout(timeout);
          worker.removeEventListener("message", handler);
          if (event.data.error)
            reject(new Error(event.data.error));
          else
            resolve();
        }
      };
      worker.addEventListener("message", handler);
      const request = { taskId: "test", test: true };
      worker.postMessage(request);
    });
  }
  /**
   * Run the benchmark in the worker. Memoised — subsequent calls return
   * the cached promise. Falls back to main-thread execution if the
   * worker can't be initialised or hits an error / timeout.
   */
  runBenchmark(options) {
    if (this.cachedResult)
      return this.cachedResult;
    this.cachedResult = this.dispatch(options);
    return this.cachedResult;
  }
  async dispatch(options) {
    if (!this.worker) {
      await this.initWorker();
    }
    const worker = this.worker;
    if (!worker) {
      try {
        return await runSimdBenchmark(options);
      } catch (err) {
        return {
          supported: false,
          reason: err instanceof Error ? err.message : "benchmark-error"
        };
      }
    }
    const taskId = `simd_${++this.taskCounter}_${Date.now()}`;
    return new Promise((resolve) => {
      const timeoutMs = 3e4;
      const timeout = setTimeout(() => {
        worker.removeEventListener("message", handler);
        runSimdBenchmark(options).then(resolve).catch(() => resolve({ supported: false, reason: "benchmark-error" }));
      }, timeoutMs);
      const handler = (event) => {
        if (event.data.taskId !== taskId)
          return;
        clearTimeout(timeout);
        worker.removeEventListener("message", handler);
        if (event.data.result) {
          resolve(event.data.result);
        } else {
          resolve({
            supported: false,
            reason: event.data.error ?? "benchmark-error"
          });
        }
      };
      worker.addEventListener("message", handler);
      const request = { taskId, options };
      worker.postMessage(request);
    });
  }
  dispose() {
    this.cleanup();
  }
}
let instance = null;
function getSimdBenchmarkWorkerManager() {
  if (!instance) {
    instance = new SimdBenchmarkWorkerManager();
  }
  return instance;
}
const SimdBenchmarkWorkerManager$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  getSimdBenchmarkWorkerManager
}, Symbol.toStringTag, { value: "Module" }));
export {
  detect as default,
  encryptData
};
