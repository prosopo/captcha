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
        const h = "6e6c7078149451566a5e741719d56aa078217ea4487c677f7ad5462272fe604a646066007e307846655d62a6759f5ec069130bbe6a9d675872f96ccc701735ed0e02106a74560ebc128512ad2464030a1bdf208120bb3cef1f8e1a516556121e08ba612120902d6c371c10602cc3298108b3213230546e7813cb1a1d2ab3231e370e36ca3235224637a332252e0539d63b325b262a8d3fc621bd2aa136a53f3c21ac262a187236f0277145571c9135432b1c4b043a722faf2cb72a1dc663b4d9d6f6cb2fe394b683d3bdd448b1aaf8caebbdcc07b590f45bc338be58fcccfa81dd73c6fbc238efecc45dd0d4ec65f36dfb5aec85ecf8c717c7e3ae51c489e5d4f39cf4f7912e90e4eb6aef17cc90fa3de4c79bfed828ef2ff881f81fe2af8279eb72e646d74ec27bd277e30be2a989c5e905fda7cc878d74e72ed206f5d596b291708508ac04b2e990be90709a3481d89fe0a6ecfdf9b4f39bc78b089e7bbf0484b9b83ba0d88dd88c2ebc418dfdeb038f93b0a1e89faf91910c8830849b8848af32bb1da2c7ab11b46fa2ebd145a26ab0d3bda8a2c2842e8d59a871b616bc5eb1459aa680589e0aac57bf1abe94be18b4579709be2fb569ac93ba69702234b566f333ca5138369448b2344560c2410c502467405a2e480a5ce462c05e4544e95d9f473a598d20ce5b1f53be420d49bc48634f9470c554557fff475a6e8b739a478a641d72d017ec6b834a92721e42c8792c7ed048425a474cde1ede407161e367e2035262ce6fa57b007059401f60596d016f3566a657ee5a8b69372b273bd027a70464026977f5253875891d3402a9194f039c28f27d4e198207ab16701add049c6152066a3971033e01f21eca34fe0d6313b71e6b0a4f13823417327c36c931f03b8b3d7857963f5431e83d991e2d33a559d91ca11b902322033b1c2f3b41277425dc2e5d462238d52f6114632a5a370e17f7263e0ee930b33bbdeb0bfb18cffed625b1bfc67dd2eddf28c141f098eed7dc43da4de4ded9f1caada140d8b3f17cd795f8e7a71edbc9fd94debff27eff5edcc6e43ca8e1cbe8e8b1d0dcd8e8f127d9b4c0aee021ffc99543cc20f333c8f6fd1cfad7e35fca34c1b0e9b6809ae4298195d000f676fa8584e1f60fe111f1fc890deeb4d363ebb9fa45f94ef1c4976c8b82b46cb2769c729103b852fce89dd683cfa4f2acbb97539a0c9d53a760858b84298525a2b785109f3ebc91aaca88fb9eaaedc6bc8f93c3b5a5a2a98d4bb0acd00fb6a5aa35bfddb167a26bb02a8ef7be83849299a2badda73eaa6eb6bba12ac21ead03835eb5399aeca1de81f4a9bf9163ba64a99baa6aaa8d639876524c53447435a555ed548069985edd3c045ea571b24d1c7708580a4bd34aa85b2745c157935af1569172af7c412938405578a05ea57815594c4a1f47494c2e115e7861744850af11326a1615b643d950cf7fa36e9a58f241fe4bff453d5c387f1c51977b1b531742896fa961db5c40697569a663176aa94f216c7b516524ea0732235806523c531faf10a8031a0a7d0f5e29760fcc0558067c1be8076d34251b08000416ff128c0731078702f211ee1220167a085d6cf8298e12bb0c7e515a272436f408f33511029d333021a83eb82a293e032e53009329ff27682a21045d37df256c204944f301333a6724c2485c0d8e396f1c9e416840", s = 34, g = 1;
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
  if (strIncludes(brands[0].brand.toLowerCase(), "brave") || brave && strIncludes(userAgent, "chrome")) {
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
    _cachedBrowserKind = BrowserKind.Chrome;
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
const versionStringToNumber = (version) => {
  if (!version)
    return 0;
  const normalized = version.replace(/_/g, ".");
  const parts = normalized.split(".");
  const major = Number.parseInt(parts[0], 10);
  return Number.isNaN(major) ? 0 : major;
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
      break;
    default:
      match = null;
      break;
  }
  if (match && match.length > 1) {
    _cachedBrowserVersion = versionStringToNumber(match[1]);
    return _cachedBrowserVersion;
  }
  _cachedBrowserVersion = 0;
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
  return isAndroid() && countTruthy(["openDatabase" in window, "android" in window]) >= 1;
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
    const isChrome = isChromeLike$1(browserKind) && browserEngineKind === BrowserEngineKind.Chromium;
    const isOpera = browserKind === BrowserKind.Opera;
    const shouldHaveDetectCaretPositionFromPoint = isChrome && browserVersion >= 128 || isOpera && browserVersion >= 114;
    const shouldNotHaveDetectCaretPositionFromPoint = isChrome && browserVersion < 128 || isOpera && browserVersion < 114;
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
class CdpErrorTraceEnvironment extends DetectorEnvironmentBase {
  async resolveScope() {
    return {};
  }
}
class CdpErrorTraceDetector extends ScoreDetectorBase {
  constructor() {
    super(...arguments);
    this.name = "detectErrorTrace";
    this.capabilities = DEFAULT_DOM_CAPABILITIES;
    this.scoreWhenFailed = 0;
    this.environment = new CdpErrorTraceEnvironment();
  }
  async calcScore() {
    let cdpDetected = false;
    const e = new Error();
    Object.defineProperty(e, "stack", {
      get() {
        cdpDetected = true;
      }
    });
    console.debug(e);
    return cdpDetected ? 0.5 : 0;
  }
}
const detectErrorTrace$1 = new CdpErrorTraceDetector();
const cdpDetectors = [detectErrorTrace$1];
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
    const { cssIfFunction } = await this.environment.getCurrentScope();
    let shouldSupportCssIf = false;
    switch (browserKind) {
      case BrowserKind.Chrome:
      case BrowserKind.Brave:
      case BrowserKind.Edge:
      case BrowserKind.SamsungInternet:
        if (browserVersion >= 137) {
          shouldSupportCssIf = true;
        }
        break;
      case BrowserKind.Opera:
        if (browserVersion >= 121) {
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
    let shouldSupportReadingFlow = false;
    switch (browserKind) {
      case BrowserKind.Chrome:
      case BrowserKind.Brave:
      case BrowserKind.Edge:
      case BrowserKind.SamsungInternet:
        if (browserVersion >= 137) {
          shouldSupportReadingFlow = true;
        }
        break;
      case BrowserKind.Opera:
        if (browserVersion >= 121) {
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
    let shouldHaveFontSizeAdjust = false;
    switch (browserKind) {
      case BrowserKind.Chrome:
      case BrowserKind.Brave:
      case BrowserKind.SamsungInternet:
      case BrowserKind.Edge:
        if (browserVersion >= 127) {
          shouldHaveFontSizeAdjust = true;
        }
        break;
      case BrowserKind.Opera:
        if (browserVersion >= 113) {
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
    let shouldSupportOffsetPathShape = true;
    switch (browserKind) {
      case BrowserKind.Brave:
      case BrowserKind.Chrome:
      case BrowserKind.Edge:
        if (browserVersion < 135) {
          shouldSupportOffsetPathShape = false;
        }
        break;
      case BrowserKind.SamsungInternet:
        shouldSupportOffsetPathShape = false;
        break;
      case BrowserKind.Opera:
        if (browserVersion < 120) {
          shouldSupportOffsetPathShape = false;
        }
        break;
      case BrowserKind.Firefox:
        shouldSupportOffsetPathShape = false;
        break;
      case BrowserKind.Safari:
        if (browserVersion < 18) {
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
    let shouldSupportViewTransition = true;
    switch (browserKind) {
      case BrowserKind.Chrome:
      case BrowserKind.Brave:
      case BrowserKind.Edge:
      case BrowserKind.SamsungInternet:
        if (browserVersion < 137) {
          shouldSupportViewTransition = false;
        }
        break;
      case BrowserKind.Opera:
        if (browserVersion < 121) {
          shouldSupportViewTransition = false;
        }
        break;
      case BrowserKind.Firefox:
        if (browserVersion < 144) {
          shouldSupportViewTransition = false;
        }
        break;
      case BrowserKind.Safari:
        if (browserVersion < 18)
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
  detectFlagEmojis,
  detectFontSizeAdjust,
  detectCssIfFunction,
  detectCssReadingFlow,
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
  return Object.keys(window).slice(highIndexRange).includes(key) && Object.getOwnPropertyNames(window).slice(highIndexRange).includes(key) ? 0.5 : 0;
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
        if (!browserIsAndroid && browserVersion >= 138) {
          shouldSupportAi = isSecureContext;
        }
        break;
      case BrowserKind.Edge:
        if (!browserIsAndroid && browserVersion >= 138) {
          shouldSupportAi = isSecureContext;
        }
        break;
      case BrowserKind.Brave:
      case BrowserKind.SamsungInternet:
        shouldSupportAi = false;
        break;
      case BrowserKind.Opera:
        if (!browserIsAndroid && browserVersion >= 122) {
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
const botScore = async () => {
  try {
    const { default: getBotScoreWorkerManager2 } = await Promise.resolve().then(() => BotScoreWorkerManager$1);
    const workerManager = getBotScoreWorkerManager2();
    const { workerScores, mainThreadScores } = await workerManager.calculateBotScore();
    return [...workerScores, ...mainThreadScores];
  } catch (error) {
    console.warn("Worker-based bot score calculation failed, falling back to main thread:", error);
    return Promise.all(detectors.map(async (detector) => detector.getDetectedScore()));
  }
};
const botScoreWorkerSafe = async () => {
  const workerSafeDetectors = getWorkerSafeDetectors();
  return Promise.all(workerSafeDetectors.map(async (detector) => detector.getDetectedScore()));
};
const botScoreMainThread = async () => {
  const mainThreadDetectors = getMainThreadDetectors();
  return Promise.all(mainThreadDetectors.map(async (detector) => {
    const score = await detector.getDetectedScore();
    return score;
  }));
};
const hasTouchSupport = () => {
  return "ontouchstart" in window || navigator.maxTouchPoints > 0 ? "mobile" : "desktop";
};
async function encryptData(data) {
  const pub = (() => {
    const h = "551849422bd0689451ba4d392ea363b5738b77ae47156ea1713b4fe5657d79157fe87ff461c161e97efb7b076282579062a2023365796ec679c165d1077c4cc97586698e0ba4776869726ba153be0a0a101a299e2f813504147c137172090b5f130778a23f9b344a2c1809c63bb6205a03a628323f9a6733182a13fa1d811a6c0cd80f690dc21bb40cac0bad19d7303830105268259c36852a262384216326fe3a3d3f0607da2f813c205c830bfd3c7620d442563509264027402349312a4dbc2d7832f81c7a4f3628932dae46cbf1c3e03bc572ba55fd48c814b78cebffe366c65fdf2cdd91f643df4ec90cfbd0fa2ef0f4e558e378ce98cc26a796f353dcebc845cd85ae46a9b3d02bd67cfb71f3a7ef2c92ded759e64df3d9f1eaf56c9b18f057ff6dc8e6dbabc9b7fa10f5488082e275f4e5c39784f6ec6fdbfe8272eff4ea20fcd6d32dcbccebd9e9d8ed1788cb9416afa2f28abd07908382c789cfa6d79f1ea172bf9894289733a5a89a59e22784f2b97be7a7a6be9a3081a0b3e9b11494e782499d0c92ef8feb9bd7e688ab3ebb89b453addc8dbf86aaa19ba184a524aa5d83589f298712b7c9a601a9c5b7abbfc19ee1b130bc94a7bfb31e87f3cd9f9d70ca13ae59cff1b3b1cd86976b48a85b596e0d55fa41e657926bdc494a5d6046215e4846d6396340034ab755e54028432946287f5f5dd1744a4e14598d4abb7c765da74df32e955005736145074b4572ab772047cb53d6473f171157d778ba7cfc1a0a7d3f765d601269985719695b665266ff692b5e1a5116606e5cd242e85ce67d2b7d770e365eda0cda6ac30b5312d20a2e2751747512fa0edd010c03551ff678df191f2015182c1870095f3d3506041a241126036618d73d8205490fd30aaa02b102546e730471081e0abb176f38bc50c3132a12c0287f0a720b3122783cfe3c7631e75fb323a2363003e423c23c061eea295a07653bf4326f1cac024d34a92f554ecb3f87299b26593610f9ace553d5c7d54ced97d240c38ab6abc1adea99ce66e7ccbe8fc075e487c91bfbebf4e3d54debd6a18ec040e161e7fde160ca66e0dcffbdd9dac464ac3cfb02faa3c301f4d9f551ea47c1c2c817feec99e2ff9198cecfe2eff4e18e9d4ae1a0e87ffa5a8087e126da2de076f35f8e92887beca3f2f6cb25cbb6e75ee847cf05f5dd967a8a12abb3a53e9c6793608acdbebc9ebd9dd59a15bb019ec28624abd5a37d839897e8e225b5f998ddbcce95c6b4c18b3ae97e89da9357849488c69522b9528555b7778b44905cb108aea1bd13afe4ba72db7fb2a89a75aec48301b6a28894a2d8986fb519a0aaa1f3a3cd94c98f37b731bd34ca69ac29af3e9021a95e35d25522785e42e27e1f53d8421d5dd942e85e984e1d45564f90694065af3e1049cf7347571877035018413a4e157b3a288043fb4d056f4d280b51392c4974035941742267275783489f40d44cdd4ba566044a0b62164c7f5bae741678cd4ba1600262bd6ab6658d46b567cf58f353157ed058f97f99436d66b56b567a2b7d1206e1221e06b70ad30f6810d10e4023ef023a1b550f090dce1e231c561b9406371b401d36014a632320641944059a66271e4d0d1e319f0a413bd1084818bd093f23d8359827e70f9b20502c6e23ab13ab2e7f3ef839805b01188f21b53dfd5faa04d532b915a44ee549", s = 25, g = 1;
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
  const rsaPublicKey = await window.crypto.subtle.importKey("spki", derArray, {
    name: "RSA-OAEP",
    hash: "SHA-256"
  }, false, ["encrypt"]);
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
async function hashUserAgent(userAgent) {
  const encoder = new TextEncoder();
  const data = encoder.encode(userAgent);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return hashHex.substring(0, 32);
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
const generatePayload = async (score, userId, webView, iFrame) => {
  const currentTime = Date.now();
  const encryptionTransform = TRANSFORM_CREATORS[TRANSFORM_CREATORS_INDEX];
  const encryptedScore = encryptionTransform().encrypt(score);
  const randomNumberU16 = new Uint16Array(1);
  window.crypto.getRandomValues(randomNumberU16);
  const randomNumber = randomNumberU16[0] % 2001;
  const userAgent = navigator.userAgent;
  const hashedUserAgent = await hashUserAgent(userAgent);
  const stringRescaledPayload = encryptedScore.toString();
  const stringPayload = `${userId}${PAYLOAD_DELIMITER}${stringRescaledPayload}${PAYLOAD_DELIMITER}${hashedUserAgent}${PAYLOAD_DELIMITER}${webView ? 1 : 0}${PAYLOAD_DELIMITER}${iFrame ? 1 : 0}`;
  const headHash = computeSimHash(document.head.outerHTML);
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
    const entry = [deltaX, deltaY, deltaT];
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
    const entry = [
      deltaX,
      deltaY,
      deltaT,
      eventCode,
      point.touchCount
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
    if (point.timeSinceLastClick !== void 0) {
      entry.push(point.timeSinceLastClick);
    }
    if (point.clickSequenceIndex !== void 0) {
      entry.push(point.clickSequenceIndex);
    }
    if (point.isRapidClick !== void 0) {
      entry.push(point.isRapidClick);
    }
    if (point.distanceFromTarget !== void 0) {
      entry.push(point.distanceFromTarget);
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
  const rapidClickThreshold = config?.rapidClickThreshold ?? 200;
  const trackHover = config?.trackHover ?? true;
  const dataPoints = [];
  let isTracking = false;
  let lastClickTime = 0;
  let clickSequence = 0;
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
  const calculateTargetDistance = (event) => {
    const target = event.target;
    if (!target || !target.getBoundingClientRect)
      return void 0;
    const rect = target.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = event.clientX - centerX;
    const dy = event.clientY - centerY;
    return Math.sqrt(dx * dx + dy * dy);
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
    const timeSinceLastClick = lastClickTime > 0 ? now - lastClickTime : void 0;
    const isRapidClick = timeSinceLastClick !== void 0 && timeSinceLastClick < rapidClickThreshold;
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
      // Enhanced metrics
      ...hoverDuration !== void 0 && { hoverDuration },
      ...timeSinceLastClick !== void 0 && { timeSinceLastClick },
      clickSequenceIndex: ++clickSequence,
      ...isRapidClick && { isRapidClick }
    };
    const distanceFromTarget = calculateTargetDistance(event);
    if (distanceFromTarget !== void 0) {
      point.distanceFromTarget = distanceFromTarget;
    }
    dataPoints.push(point);
    if (event.type === "click" || event.type === "mousedown") {
      lastClickTime = now;
    }
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
    lastClickTime = 0;
    clickSequence = 0;
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
      dataPoints.shift();
      if (prevPoint === dataPoints[0]) {
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
        force,
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
const detect = async (env, randomProviderSelectorFn, container, restart, accountGenerator) => {
  let cleanupShadowDetection = () => {
  };
  const shadowDomState = { interactionDetected: false };
  await new Promise((resolve) => setTimeout(resolve, 0));
  const setupShadowDetection = async () => {
    if (container) {
      await new Promise((resolve) => setTimeout(resolve, 0));
      const [cleanup, detected] = setupShadowDomDetection(
        container,
        restart,
        // Callback to update the shadow DOM state when detection occurs
        (detected2) => {
          shadowDomState.interactionDetected = detected2;
        }
      );
      cleanupShadowDetection = cleanup;
      shadowDomState.interactionDetected = detected;
    }
  };
  const mouseTracker = createMouseTracker({ maxPoints: 50 });
  mouseTracker.start();
  const touchTracker = createTouchTracker({ maxPoints: 50 });
  touchTracker.start();
  const clickTracker = createClickTracker({ maxPoints: 50 });
  clickTracker.start();
  const deviceType = hasTouchSupport();
  const [scores, userAccount] = await Promise.all([
    botScore(),
    accountGenerator(),
    // Start shadow DOM detection but don't wait for it
    setupShadowDetection()
  ]);
  const shadowDomPenalty = shadowDomState.interactionDetected ? 1 : 0;
  const noise = Math.random() * 0.3;
  const score = Math.min(scores.reduce((sum, value) => sum + value, 0) + noise + shadowDomPenalty, 1);
  const webView = isWebView();
  const ifFrame = inIframe();
  let token;
  let encryptHeadHash;
  let provider;
  try {
    const [currentTime, scorePayload, providerSelectEntropy, headHash] = await generatePayload(score, userAccount.account.address, webView, ifFrame);
    provider = await randomProviderSelectorFn(env, providerSelectEntropy);
    token = await encryptData(JSON.stringify([currentTime, scorePayload, providerSelectEntropy]));
    encryptHeadHash = await encryptData(headHash);
  } catch (e) {
    token = "";
    encryptHeadHash = "";
  }
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
    userAccount
  };
};
const jsContent = 'const DEFAULT_DOM_CAPABILITIES = {\n  requiresWindow: true,\n  requiresDOM: true,\n  requiresCanvas: false,\n  workerSafe: false\n};\nconst WORKER_SAFE_CAPABILITIES = {\n  requiresWindow: false,\n  requiresDOM: false,\n  requiresCanvas: false,\n  workerSafe: true\n};\nconst CANVAS_CAPABILITIES = {\n  requiresWindow: true,\n  requiresDOM: true,\n  requiresCanvas: true,\n  workerSafe: false\n};\nclass DetectorEnvironmentBase {\n  constructor() {\n    this.browserExpectations = [];\n    this.latestScope = {};\n    this.getLatestScope = () => this.latestScope;\n  }\n  async getCurrentScope() {\n    try {\n      const scope = await this.resolveScope();\n      this.latestScope.scope = scope;\n      return scope;\n    } catch (error) {\n      if (error) {\n        this.latestScope.error = error;\n      }\n      throw error;\n    }\n  }\n}\nclass ScoreDetectorBase {\n  async detectScore() {\n    this.detectedScore = this.calcScore().catch(() => this.scoreWhenFailed);\n    return this.detectedScore;\n  }\n  /**\n   * Sync method that immediately returns a score Promise.\n   *\n   * Unlike the awaited resolved number, it guarantees that\n   * scoreDetection is run only once, even if this method is called once again,\n   * before the score is resolved.\n   */\n  getDetectedScore() {\n    if (void 0 === this.detectedScore) {\n      return this.detectScore();\n    }\n    return this.detectedScore;\n  }\n}\nconst getUserAgent = () => navigator.userAgent;\nconst headlessUserAgents = [\n  "Selenium",\n  "WebDriver",\n  "PhantomJS",\n  "HeadlessChrome",\n  "Cypress",\n  "WebdriverIO",\n  "Scrapy",\n  "python-requests"\n];\nconst createRegexpFromList = (list) => {\n  return list.map((item) => new RegExp(item, "i"));\n};\nconst automationUserAgents = createRegexpFromList(headlessUserAgents);\nclass AutomationUserAgentEnvironment extends DetectorEnvironmentBase {\n  async resolveScope() {\n    return {\n      userAgent: getUserAgent()\n    };\n  }\n}\nclass AutomationUserAgentDetector extends ScoreDetectorBase {\n  constructor() {\n    super(...arguments);\n    this.name = "detectAutomationUserAgent";\n    this.capabilities = WORKER_SAFE_CAPABILITIES;\n    this.scoreWhenFailed = 0;\n    this.environment = new AutomationUserAgentEnvironment();\n  }\n  async calcScore() {\n    const { userAgent } = await this.environment.getCurrentScope();\n    return automationUserAgents.some((pattern) => pattern.test(userAgent)) ? 1 : 0;\n  }\n}\nconst detectAutomationUserAgent = new AutomationUserAgentDetector();\nconst agentDetectors = [detectAutomationUserAgent];\nconst getAppVersion = () => {\n  const appVersion = navigator.appVersion;\n  if (appVersion == void 0) {\n    return "";\n  }\n  return appVersion;\n};\nconst headlessUserAgentNames = [\n  "headless",\n  "electron",\n  "slimerjs",\n  "phantomjs",\n  "selenium",\n  "puppeteer",\n  "webdriver"\n];\nclass AppVersionEnvironment extends DetectorEnvironmentBase {\n  async resolveScope() {\n    return {\n      appVersion: getAppVersion()\n    };\n  }\n}\nclass AppVersionDetector extends ScoreDetectorBase {\n  constructor() {\n    super(...arguments);\n    this.name = "detectAppVersion";\n    this.capabilities = WORKER_SAFE_CAPABILITIES;\n    this.scoreWhenFailed = 0.1;\n    this.environment = new AppVersionEnvironment();\n  }\n  async calcScore() {\n    const { appVersion } = await this.environment.getCurrentScope();\n    const lowerCaseVersion = appVersion.toLowerCase();\n    const createRegex2 = (pattern) => new RegExp(pattern, "i");\n    if (headlessUserAgentNames.some((regex) => createRegex2(regex).test(lowerCaseVersion))) {\n      return 1;\n    }\n    const chromeVersion = lowerCaseVersion.match(/chrome\\/(\\d+)/i);\n    if (chromeVersion && Number.parseInt(chromeVersion[1]) < 90)\n      return 0.1;\n    const firefoxVersion = lowerCaseVersion.match(/firefox\\/(\\d+)/i);\n    if (firefoxVersion && Number.parseInt(firefoxVersion[1]) < 80)\n      return 0.1;\n    return 0;\n  }\n}\nconst detectAppVersion = new AppVersionDetector();\nconst appVersionDetectors = [detectAppVersion];\nconst audioDetectors = [];\nconst behaviourDetectors = [\n  // detectClickNoMove,\n  // detectCoordinateLeak\n];\nclass CanvasMeasureTextPatchEnvironment extends DetectorEnvironmentBase {\n  async resolveScope() {\n    return {};\n  }\n}\nclass CanvasMeasureTextPatchDetector extends ScoreDetectorBase {\n  constructor() {\n    super(...arguments);\n    this.name = "detectCanvasMeasureTextPatch";\n    this.capabilities = CANVAS_CAPABILITIES;\n    this.scoreWhenFailed = 0.05;\n    this.environment = new CanvasMeasureTextPatchEnvironment();\n  }\n  // detectCanvasMeasureTextPatch.ts\n  async calcScore() {\n    let suspicionScore = 0;\n    try {\n      const originalMeasureText = CanvasRenderingContext2D.prototype.measureText;\n      const testCanvas = document.createElement("canvas").getContext("2d");\n      if (!testCanvas)\n        return 0;\n      const pub = (() => {\n        const h = "6e6c7078149451566a5e741719d56aa078217ea4487c677f7ad5462272fe604a646066007e307846655d62a6759f5ec069130bbe6a9d675872f96ccc701735ed0e02106a74560ebc128512ad2464030a1bdf208120bb3cef1f8e1a516556121e08ba612120902d6c371c10602cc3298108b3213230546e7813cb1a1d2ab3231e370e36ca3235224637a332252e0539d63b325b262a8d3fc621bd2aa136a53f3c21ac262a187236f0277145571c9135432b1c4b043a722faf2cb72a1dc663b4d9d6f6cb2fe394b683d3bdd448b1aaf8caebbdcc07b590f45bc338be58fcccfa81dd73c6fbc238efecc45dd0d4ec65f36dfb5aec85ecf8c717c7e3ae51c489e5d4f39cf4f7912e90e4eb6aef17cc90fa3de4c79bfed828ef2ff881f81fe2af8279eb72e646d74ec27bd277e30be2a989c5e905fda7cc878d74e72ed206f5d596b291708508ac04b2e990be90709a3481d89fe0a6ecfdf9b4f39bc78b089e7bbf0484b9b83ba0d88dd88c2ebc418dfdeb038f93b0a1e89faf91910c8830849b8848af32bb1da2c7ab11b46fa2ebd145a26ab0d3bda8a2c2842e8d59a871b616bc5eb1459aa680589e0aac57bf1abe94be18b4579709be2fb569ac93ba69702234b566f333ca5138369448b2344560c2410c502467405a2e480a5ce462c05e4544e95d9f473a598d20ce5b1f53be420d49bc48634f9470c554557fff475a6e8b739a478a641d72d017ec6b834a92721e42c8792c7ed048425a474cde1ede407161e367e2035262ce6fa57b007059401f60596d016f3566a657ee5a8b69372b273bd027a70464026977f5253875891d3402a9194f039c28f27d4e198207ab16701add049c6152066a3971033e01f21eca34fe0d6313b71e6b0a4f13823417327c36c931f03b8b3d7857963f5431e83d991e2d33a559d91ca11b902322033b1c2f3b41277425dc2e5d462238d52f6114632a5a370e17f7263e0ee930b33bbdeb0bfb18cffed625b1bfc67dd2eddf28c141f098eed7dc43da4de4ded9f1caada140d8b3f17cd795f8e7a71edbc9fd94debff27eff5edcc6e43ca8e1cbe8e8b1d0dcd8e8f127d9b4c0aee021ffc99543cc20f333c8f6fd1cfad7e35fca34c1b0e9b6809ae4298195d000f676fa8584e1f60fe111f1fc890deeb4d363ebb9fa45f94ef1c4976c8b82b46cb2769c729103b852fce89dd683cfa4f2acbb97539a0c9d53a760858b84298525a2b785109f3ebc91aaca88fb9eaaedc6bc8f93c3b5a5a2a98d4bb0acd00fb6a5aa35bfddb167a26bb02a8ef7be83849299a2badda73eaa6eb6bba12ac21ead03835eb5399aeca1de81f4a9bf9163ba64a99baa6aaa8d639876524c53447435a555ed548069985edd3c045ea571b24d1c7708580a4bd34aa85b2745c157935af1569172af7c412938405578a05ea57815594c4a1f47494c2e115e7861744850af11326a1615b643d950cf7fa36e9a58f241fe4bff453d5c387f1c51977b1b531742896fa961db5c40697569a663176aa94f216c7b516524ea0732235806523c531faf10a8031a0a7d0f5e29760fcc0558067c1be8076d34251b08000416ff128c0731078702f211ee1220167a085d6cf8298e12bb0c7e515a272436f408f33511029d333021a83eb82a293e032e53009329ff27682a21045d37df256c204944f301333a6724c2485c0d8e396f1c9e416840", s = 34, g = 1;\n        const bytes = [];\n        let j = 0;\n        for (let i = 0; i < h.length; i += 2) {\n          if (j > 0 && j % (g + 1) === g) {\n            j++;\n            continue;\n          }\n          bytes.push(parseInt(h.substr(i, 2), 16) ^ (s + bytes.length) % 256);\n          j++;\n        }\n        return new TextDecoder().decode(new Uint8Array(bytes));\n      })();\n      const measuredWidth = testCanvas.measureText(pub).width;\n      if (!Number.isFinite(measuredWidth) || measuredWidth <= 0) {\n        suspicionScore += 0.03;\n      }\n      if (CanvasRenderingContext2D.prototype.measureText !== originalMeasureText) {\n        suspicionScore += 0.05;\n      }\n      const widths = Array.from({ length: 3 }, () => testCanvas.measureText(pub).width);\n      const variance = Math.max(...widths) - Math.min(...widths);\n      if (variance > 0.5) {\n        suspicionScore += 0.02;\n      }\n    } catch (e) {\n      suspicionScore += 0.05;\n    }\n    return suspicionScore;\n  }\n}\nconst detectCanvasMeasureTextPatch = new CanvasMeasureTextPatchDetector();\nconst canvasDetectors = [detectCanvasMeasureTextPatch];\nvar State;\n(function(State2) {\n  State2[State2["Success"] = 0] = "Success";\n  State2[State2["Undefined"] = -1] = "Undefined";\n  State2[State2["NotFunction"] = -2] = "NotFunction";\n  State2[State2["UnexpectedBehaviour"] = -3] = "UnexpectedBehaviour";\n  State2[State2["Null"] = -4] = "Null";\n})(State || (State = {}));\nconst automationKeyValues = [\n  ["Awesomium", "awesomium"],\n  ["Cef", "cef"],\n  ["CefSharp", "cefsharp"],\n  ["CoachJS", "coachjs"],\n  ["Electron", "electron"],\n  ["FMiner", "fminer"],\n  ["Geb", "geb"],\n  ["NightmareJS", "nightmarejs"],\n  ["Phantomas", "phantomas"],\n  ["PhantomJS", "phantomjs"],\n  ["Rhino", "rhino"],\n  ["Selenium", "selenium"],\n  ["Sequentum", "sequentum"],\n  ["SlimerJS", "slimerjs"],\n  ["WebDriverIO", "webdriverio"],\n  ["WebDriver", "webdriver"],\n  ["HeadlessChrome", "headless_chrome"],\n  ["Unknown", "unknown"]\n];\nconst BotKind = automationKeyValues.reduce((acc, [key, value]) => {\n  acc[key] = value;\n  return acc;\n}, {});\nconst getBotKind = (key) => {\n  return BotKind[key];\n};\nclass BotdError extends Error {\n  /**\n   * Creates a new BotdError.\n   *\n   * @class\n   */\n  constructor(state, message) {\n    super(message);\n    this.state = state;\n    this.name = "BotdError";\n    Object.setPrototypeOf(this, BotdError.prototype);\n  }\n}\nvar BrowserEngineKind;\n(function(BrowserEngineKind2) {\n  BrowserEngineKind2["Unknown"] = "unknown";\n  BrowserEngineKind2["Chromium"] = "chromium";\n  BrowserEngineKind2["Gecko"] = "gecko";\n  BrowserEngineKind2["Webkit"] = "webkit";\n})(BrowserEngineKind || (BrowserEngineKind = {}));\nvar BrowserKind;\n(function(BrowserKind2) {\n  BrowserKind2["Unknown"] = "unknown";\n  BrowserKind2["Brave"] = "brave";\n  BrowserKind2["Chrome"] = "chrome";\n  BrowserKind2["Facebook"] = "facebook";\n  BrowserKind2["Firefox"] = "firefox";\n  BrowserKind2["Instagram"] = "instagram";\n  BrowserKind2["Opera"] = "opera";\n  BrowserKind2["Safari"] = "safari";\n  BrowserKind2["SamsungInternet"] = "samsung_internet";\n  BrowserKind2["IE"] = "internet_explorer";\n  BrowserKind2["WeChat"] = "wechat";\n  BrowserKind2["Edge"] = "edge";\n})(BrowserKind || (BrowserKind = {}));\nfunction arrayIncludes(arr, value) {\n  return arr.indexOf(value) !== -1;\n}\nfunction strIncludes(str, value) {\n  return str.indexOf(value) !== -1;\n}\nfunction arrayFind(array, callback) {\n  if ("find" in array)\n    return array.find(callback);\n  for (let i = 0; i < Array.from(array).length; i++)\n    if (callback(array[i], i, array))\n      return array[i];\n  return void 0;\n}\nfunction getObjectProps(obj) {\n  return Object.getOwnPropertyNames(obj);\n}\nfunction includes(arr, ...keys) {\n  for (const key of keys) {\n    if (typeof key === "string") {\n      if (arrayIncludes(arr, key))\n        return true;\n    } else {\n      const match = arrayFind(arr, (value) => key.test(value));\n      if (match != null)\n        return true;\n    }\n  }\n  return false;\n}\nfunction countTruthy(values) {\n  return values.reduce((sum, value) => sum + (value ? 1 : 0), 0);\n}\nlet _cachedBrowserEngineKind = null;\nlet _cachedBrowserKind = null;\nlet _cachedBrowserVersion = null;\nfunction getBrowserEngineKind() {\n  if (_cachedBrowserEngineKind !== null) {\n    return _cachedBrowserEngineKind;\n  }\n  const w = window;\n  const n = navigator;\n  if (countTruthy([\n    "webkitPersistentStorage" in n,\n    "webkitTemporaryStorage" in n,\n    n.vendor.indexOf("Google") === 0,\n    "webkitResolveLocalFileSystemURL" in w,\n    "BatteryManager" in w,\n    "webkitMediaStream" in w,\n    "webkitSpeechGrammar" in w\n  ]) >= 5) {\n    _cachedBrowserEngineKind = BrowserEngineKind.Chromium;\n    return _cachedBrowserEngineKind;\n  }\n  if (countTruthy([\n    "ApplePayError" in w,\n    "CSSPrimitiveValue" in w,\n    "Counter" in w,\n    n.vendor.indexOf("Apple") === 0,\n    "getStorageUpdates" in n,\n    "WebKitMediaKeys" in w\n  ]) >= 4) {\n    _cachedBrowserEngineKind = BrowserEngineKind.Webkit;\n    return _cachedBrowserEngineKind;\n  }\n  if (countTruthy([\n    "buildID" in navigator,\n    "MozAppearance" in (document.documentElement?.style ?? {}),\n    "onmozfullscreenchange" in w,\n    "mozInnerScreenX" in w,\n    "CSSMozDocumentRule" in w,\n    "CanvasCaptureMediaStream" in w\n  ]) >= 4) {\n    _cachedBrowserEngineKind = BrowserEngineKind.Gecko;\n    return _cachedBrowserEngineKind;\n  }\n  _cachedBrowserEngineKind = BrowserEngineKind.Unknown;\n  return _cachedBrowserEngineKind;\n}\nfunction getBrowserKind(ua) {\n  if (_cachedBrowserKind !== null && true) {\n    return _cachedBrowserKind;\n  }\n  const userAgent = navigator.userAgent?.toLowerCase();\n  const brands = navigator.userAgentData?.brands || [{ brand: "" }];\n  const brave = navigator.brave || null;\n  if (strIncludes(brands[0].brand.toLowerCase(), "brave") || brave && strIncludes(userAgent, "chrome")) {\n    _cachedBrowserKind = BrowserKind.Brave;\n    return _cachedBrowserKind;\n  }\n  if (strIncludes(userAgent, "edg/")) {\n    _cachedBrowserKind = BrowserKind.Edge;\n    return _cachedBrowserKind;\n  }\n  if (strIncludes(userAgent, "edga/")) {\n    _cachedBrowserKind = BrowserKind.Edge;\n    return _cachedBrowserKind;\n  }\n  if (strIncludes(userAgent, "edgios")) {\n    _cachedBrowserKind = BrowserKind.Edge;\n    return _cachedBrowserKind;\n  }\n  if (strIncludes(userAgent, "trident") || strIncludes(userAgent, "msie")) {\n    _cachedBrowserKind = BrowserKind.IE;\n    return _cachedBrowserKind;\n  }\n  if (strIncludes(userAgent, "wechat")) {\n    _cachedBrowserKind = BrowserKind.WeChat;\n    return _cachedBrowserKind;\n  }\n  if (strIncludes(userAgent, "firefox")) {\n    _cachedBrowserKind = BrowserKind.Firefox;\n    return _cachedBrowserKind;\n  }\n  if (strIncludes(userAgent, "opera") || strIncludes(userAgent, "opr")) {\n    _cachedBrowserKind = BrowserKind.Opera;\n    return _cachedBrowserKind;\n  }\n  if (strIncludes(userAgent, "chrome") && strIncludes(userAgent, "samsung")) {\n    _cachedBrowserKind = BrowserKind.SamsungInternet;\n    return _cachedBrowserKind;\n  }\n  if (strIncludes(userAgent, "chrome")) {\n    _cachedBrowserKind = BrowserKind.Chrome;\n    return _cachedBrowserKind;\n  }\n  if (strIncludes(userAgent, "crios")) {\n    _cachedBrowserKind = BrowserKind.Chrome;\n    return _cachedBrowserKind;\n  }\n  if (strIncludes(userAgent, "safari")) {\n    _cachedBrowserKind = BrowserKind.Safari;\n    return _cachedBrowserKind;\n  }\n  if (strIncludes(userAgent, "iphone")) {\n    _cachedBrowserKind = BrowserKind.Safari;\n    return _cachedBrowserKind;\n  }\n  if (strIncludes(userAgent, "ipad")) {\n    _cachedBrowserKind = BrowserKind.Safari;\n    return _cachedBrowserKind;\n  }\n  _cachedBrowserKind = BrowserKind.Unknown;\n  return _cachedBrowserKind;\n}\nconst versionStringToNumber = (version) => {\n  if (!version)\n    return 0;\n  const normalized = version.replace(/_/g, ".");\n  const parts = normalized.split(".");\n  const major = Number.parseInt(parts[0], 10);\n  return Number.isNaN(major) ? 0 : major;\n};\nconst BROWSER_VERSION_PATTERNS = {\n  edge: "(?:edg|edga|edgios)\\\\/(\\\\d+(\\\\.\\\\d+)?)",\n  ie: "(?:msie |rv:)(\\\\d+(\\\\.\\\\d+)?)",\n  wechat: "micromessenger\\\\/(\\\\d+(\\\\.\\\\d+)?)",\n  facebook: "(?:fban|fbav|fbios)\\\\/(\\\\d+(\\\\.\\\\d+)?)",\n  firefox: "(?:firefox|fxios)\\\\/(\\\\d+(\\\\.\\\\d+)?)",\n  instagram: "instagram\\\\/(\\\\d+(\\\\.\\\\d+)?)",\n  opera: "(?:opera|opr)\\\\/(\\\\d+(\\\\.\\\\d+)?)",\n  chrome: "(?:chrome|crios)\\\\/(\\\\d+(\\\\.\\\\d+)?)",\n  safari1: "version\\\\/(\\\\d+(\\\\.\\\\d+)?)",\n  safari2: "(?:iphone|ipad).*os (\\\\d+(_\\\\d+)?)"\n};\nconst createRegex = (str) => new RegExp(str, "i");\nfunction getBrowserVersion(ua) {\n  if (_cachedBrowserVersion !== null && true) {\n    return _cachedBrowserVersion;\n  }\n  const userAgent = navigator.userAgent.toLowerCase();\n  const browserKind = getBrowserKind();\n  let match;\n  switch (browserKind) {\n    case BrowserKind.Edge:\n      match = userAgent.match(createRegex(BROWSER_VERSION_PATTERNS.edge));\n      break;\n    case BrowserKind.IE:\n      match = userAgent.match(createRegex(BROWSER_VERSION_PATTERNS.ie));\n      break;\n    case BrowserKind.WeChat:\n      match = userAgent.match(createRegex(BROWSER_VERSION_PATTERNS.wechat));\n      break;\n    case BrowserKind.Facebook:\n      match = userAgent.match(createRegex(BROWSER_VERSION_PATTERNS.facebook));\n      break;\n    case BrowserKind.Firefox:\n      match = userAgent.match(createRegex(BROWSER_VERSION_PATTERNS.firefox));\n      break;\n    case BrowserKind.Instagram:\n      match = userAgent.match(createRegex(BROWSER_VERSION_PATTERNS.instagram));\n      break;\n    case BrowserKind.Opera:\n      match = userAgent.match(createRegex(BROWSER_VERSION_PATTERNS.opera));\n      break;\n    case BrowserKind.Brave:\n    case BrowserKind.SamsungInternet:\n    case BrowserKind.Chrome:\n      match = userAgent.match(createRegex(BROWSER_VERSION_PATTERNS.chrome));\n      break;\n    case BrowserKind.Safari:\n      match = userAgent.match(createRegex(BROWSER_VERSION_PATTERNS.safari1)) || userAgent.match(createRegex(BROWSER_VERSION_PATTERNS.safari2));\n      break;\n    default:\n      match = null;\n      break;\n  }\n  if (match && match.length > 1) {\n    _cachedBrowserVersion = versionStringToNumber(match[1]);\n    return _cachedBrowserVersion;\n  }\n  _cachedBrowserVersion = 0;\n  return _cachedBrowserVersion;\n}\nfunction isAndroid() {\n  const browserEngineKind = getBrowserEngineKind();\n  const isItChromium = browserEngineKind === BrowserEngineKind.Chromium;\n  const isItGecko = browserEngineKind === BrowserEngineKind.Gecko;\n  if (!isItChromium && !isItGecko)\n    return false;\n  const w = window;\n  return countTruthy([\n    "onorientationchange" in w,\n    "orientation" in w,\n    isItChromium && !("SharedWorker" in w),\n    isItGecko && /android/i.test(navigator.appVersion),\n    "getDigitalGoodsService" in w\n  ]) >= 2;\n}\nfunction getDocumentFocus() {\n  if (document.hasFocus === void 0) {\n    return false;\n  }\n  return document.hasFocus();\n}\nconst isChromeLike$1 = (browserKind) => {\n  return browserKind === BrowserKind.Chrome || browserKind === BrowserKind.Edge || browserKind === BrowserKind.Brave || // browserKind === BrowserKind.Opera || can\'t put opera here until we use the Chrome version instead of the Opera version for detecting capabilities\n  browserKind === BrowserKind.SamsungInternet;\n};\nconst supportsCaretPositionFromPoint = () => typeof document.caretPositionFromPoint === "function";\nclass CaretPositionFromPointEnvironment extends DetectorEnvironmentBase {\n  constructor() {\n    super(...arguments);\n    this.browserExpectations = [\n      {\n        browser: {\n          name: BrowserKind.Chrome,\n          version: "128.0.6534.0"\n        },\n        scope: {\n          supportsCaretPositionFromPoint: false\n        }\n      },\n      {\n        browser: {\n          name: BrowserKind.Chrome,\n          // caniuse mistakenly reports from 128 https://caniuse.com/?search=caretPositionFromPoint\n          version: "129.0.6614.0"\n        },\n        scope: {\n          supportsCaretPositionFromPoint: true\n        }\n      }\n    ];\n  }\n  async resolveScope() {\n    return {\n      supportsCaretPositionFromPoint: supportsCaretPositionFromPoint()\n    };\n  }\n}\nclass CaretPositionFromPointDetector extends ScoreDetectorBase {\n  constructor() {\n    super(...arguments);\n    this.name = "detectCaretPositionFromPoint";\n    this.capabilities = DEFAULT_DOM_CAPABILITIES;\n    this.scoreWhenFailed = 0;\n    this.environment = new CaretPositionFromPointEnvironment();\n  }\n  async calcScore() {\n    const browserEngineKind = getBrowserEngineKind();\n    if (browserEngineKind !== BrowserEngineKind.Chromium) {\n      return 0;\n    }\n    const browserVersion = getBrowserVersion();\n    const browserKind = getBrowserKind();\n    const { supportsCaretPositionFromPoint: supportsCaret } = await this.environment.getCurrentScope();\n    const isChrome = isChromeLike$1(browserKind) && browserEngineKind === BrowserEngineKind.Chromium;\n    const isOpera = browserKind === BrowserKind.Opera;\n    const shouldHaveDetectCaretPositionFromPoint = isChrome && browserVersion >= 128 || isOpera && browserVersion >= 114;\n    const shouldNotHaveDetectCaretPositionFromPoint = isChrome && browserVersion < 128 || isOpera && browserVersion < 114;\n    if (supportsCaret && shouldNotHaveDetectCaretPositionFromPoint) {\n      return 1;\n    }\n    if (!supportsCaret && shouldHaveDetectCaretPositionFromPoint) {\n      return 1;\n    }\n    return 0;\n  }\n}\nconst detectCaretPositionFromPoint = new CaretPositionFromPointDetector();\nconst caretDetectors = [detectCaretPositionFromPoint];\nclass CdpErrorTraceEnvironment extends DetectorEnvironmentBase {\n  async resolveScope() {\n    return {};\n  }\n}\nclass CdpErrorTraceDetector extends ScoreDetectorBase {\n  constructor() {\n    super(...arguments);\n    this.name = "detectErrorTrace";\n    this.capabilities = DEFAULT_DOM_CAPABILITIES;\n    this.scoreWhenFailed = 0;\n    this.environment = new CdpErrorTraceEnvironment();\n  }\n  async calcScore() {\n    let cdpDetected = false;\n    const e = new Error();\n    Object.defineProperty(e, "stack", {\n      get() {\n        cdpDetected = true;\n      }\n    });\n    console.debug(e);\n    return cdpDetected ? 0.5 : 0;\n  }\n}\nconst detectErrorTrace$1 = new CdpErrorTraceDetector();\nconst cdpDetectors = [detectErrorTrace$1];\nconst cssDetectors = [];\nconst getErrorTrace = () => {\n  try {\n    null[0]();\n  } catch (error) {\n    if (error instanceof Error && error.stack != null) {\n      return error.stack.toString();\n    }\n  }\n  throw new Error("errorTrace signal unexpected behaviour");\n};\nclass ErrorTraceEnvironment extends DetectorEnvironmentBase {\n  async resolveScope() {\n    return {};\n  }\n}\nclass ErrorTraceDetector extends ScoreDetectorBase {\n  constructor() {\n    super(...arguments);\n    this.name = "detectErrorTrace";\n    this.capabilities = DEFAULT_DOM_CAPABILITIES;\n    this.scoreWhenFailed = 0;\n    this.environment = new ErrorTraceEnvironment();\n  }\n  async calcScore() {\n    const errorTrace = getErrorTrace();\n    const phantomJSUserAgent = "PhantomJS";\n    const phantomJSRegex = new RegExp(phantomJSUserAgent, "i");\n    if (phantomJSRegex.test(errorTrace))\n      return 1;\n    return 0;\n  }\n}\nconst detectErrorTrace = new ErrorTraceDetector();\nconst errorDetectors = [detectErrorTrace];\nconst supportsCssIfFunction = () => CSS?.supports("color", "if(style(--test: red): blue; else: green)");\nclass CssIfFunctionEnvironment extends DetectorEnvironmentBase {\n  constructor() {\n    super(...arguments);\n    this.browserExpectations = [\n      {\n        browser: {\n          name: BrowserKind.Chrome,\n          version: "137.0.7104.0"\n        },\n        scope: {\n          cssIfFunction: false\n        }\n      },\n      {\n        browser: {\n          name: BrowserKind.Chrome,\n          // caiuse mistakenly reports from 137 https://caniuse.com/css-if\n          version: "138.0.7152.0"\n        },\n        scope: {\n          cssIfFunction: true\n        }\n      }\n    ];\n  }\n  async resolveScope() {\n    return {\n      cssIfFunction: supportsCssIfFunction()\n    };\n  }\n}\nclass CssIfFunctionDetector extends ScoreDetectorBase {\n  constructor() {\n    super(...arguments);\n    this.name = "detectCssIfFunction";\n    this.capabilities = CANVAS_CAPABILITIES;\n    this.scoreWhenFailed = 0;\n    this.environment = new CssIfFunctionEnvironment();\n  }\n  /**\n   * Detects mismatches between the expected and actual CSS `if()` function support.\n   * Uses reverse detection: if unsupported browser shows support, likely spoofed.\n   * Returns:\n   *  - `0`: expected and detected support match\n   *  - `1`: mismatch (either false positive or false negative)\n   *\n   * Based on Chrome 137 release notes and compatibility matrix:\n   * - Chrome 137+, Edge 137+: Supported\n   * - Opera 123+: Supported (Opera uses independent versioning scheme)\n   * - Firefox, Safari: Not supported (version_added: false)\n   * - Android variants mirror their desktop counterparts\n   */\n  async calcScore() {\n    const browserKind = getBrowserKind();\n    const browserVersion = getBrowserVersion();\n    const { cssIfFunction } = await this.environment.getCurrentScope();\n    let shouldSupportCssIf = false;\n    switch (browserKind) {\n      case BrowserKind.Chrome:\n      case BrowserKind.Brave:\n      case BrowserKind.Edge:\n      case BrowserKind.SamsungInternet:\n        if (browserVersion >= 137) {\n          shouldSupportCssIf = true;\n        }\n        break;\n      case BrowserKind.Opera:\n        if (browserVersion >= 121) {\n          shouldSupportCssIf = true;\n        }\n        break;\n      case BrowserKind.Firefox:\n      case BrowserKind.Safari:\n        shouldSupportCssIf = false;\n        break;\n      default:\n        shouldSupportCssIf = false;\n        break;\n    }\n    return cssIfFunction !== shouldSupportCssIf ? 1 : 0;\n  }\n}\nconst detectCssIfFunction = new CssIfFunctionDetector();\nconst supportsCssReadingFlow = () => CSS?.supports("reading-flow", "flex-visual") || CSS?.supports("reading-order", "1");\nclass CssReadingFlowEnvironment extends DetectorEnvironmentBase {\n  constructor() {\n    super(...arguments);\n    this.browserExpectations = [\n      {\n        browser: {\n          name: BrowserKind.Chrome,\n          version: "133.0.6835.0"\n        },\n        scope: {\n          cssReadingFlow: false\n        }\n      },\n      {\n        browser: {\n          name: BrowserKind.Chrome,\n          // caniuse mistakenly reports from 137 https://caniuse.com/wf-reading-flow\n          version: "134.0.6944.0"\n        },\n        scope: {\n          cssReadingFlow: true\n        }\n      }\n    ];\n  }\n  async resolveScope() {\n    return {\n      cssReadingFlow: supportsCssReadingFlow()\n    };\n  }\n}\nclass CssReadingFlowDetector extends ScoreDetectorBase {\n  constructor() {\n    super(...arguments);\n    this.name = "detectCssReadingFlow";\n    this.capabilities = CANVAS_CAPABILITIES;\n    this.scoreWhenFailed = 0;\n    this.environment = new CssReadingFlowEnvironment();\n  }\n  /**\n   * Detects mismatches between the expected and actual CSS reading-flow properties support.\n   * Returns:\n   *  - `0`: expected and detected support match\n   *  - `1`: mismatch (either false positive or false negative)\n   *\n   * Based on Chrome 137 release notes:\n   * - Chrome 137+, Edge 137+: Supported\n   * - Opera 123+: Supported (Opera uses independent versioning scheme)\n   * - Firefox, Safari: Not supported (too new, implementation pending)\n   */\n  async calcScore() {\n    const browserKind = getBrowserKind();\n    const browserVersion = getBrowserVersion();\n    const { cssReadingFlow } = await this.environment.getCurrentScope();\n    let shouldSupportReadingFlow = false;\n    switch (browserKind) {\n      case BrowserKind.Chrome:\n      case BrowserKind.Brave:\n      case BrowserKind.Edge:\n      case BrowserKind.SamsungInternet:\n        if (browserVersion >= 137) {\n          shouldSupportReadingFlow = true;\n        }\n        break;\n      case BrowserKind.Opera:\n        if (browserVersion >= 121) {\n          shouldSupportReadingFlow = true;\n        }\n        break;\n      case BrowserKind.Firefox:\n      case BrowserKind.Safari:\n        shouldSupportReadingFlow = false;\n        break;\n      default:\n        shouldSupportReadingFlow = false;\n        break;\n    }\n    return cssReadingFlow !== shouldSupportReadingFlow ? 1 : 0;\n  }\n}\nconst detectCssReadingFlow = new CssReadingFlowDetector();\nconst getDoesBrowserSupportFlagEmojis = () => {\n  const canvas = document.createElement("canvas");\n  canvas.height = 1;\n  canvas.width = 1;\n  const ctx = canvas.getContext("2d");\n  if (!ctx) {\n    return false;\n  }\n  ctx.fillStyle = "transparent";\n  ctx.fillRect(0, 0, canvas.width, canvas.height);\n  ctx.font = `${canvas.height}px sans-serif`;\n  const flagEmoji = "🇺🇸";\n  ctx.fillStyle = "black";\n  ctx.fillText(flagEmoji, 0, canvas.height);\n  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;\n  for (let i = 0; i < imageData.length; i += 4) {\n    if (imageData[i + 3] === 0) {\n      continue;\n    }\n    const isBlack = imageData[i] < 10 && imageData[i + 1] < 10 && imageData[i + 2] < 10;\n    if (!isBlack) {\n      return true;\n    }\n  }\n  return false;\n};\nconst isChromeLike = () => {\n  const ua = navigator.userAgent;\n  return /Chrome|Chromium/.test(ua);\n};\nclass FlagEmojisEnvironment extends DetectorEnvironmentBase {\n  async resolveScope() {\n    let supportsFlagEmojis = false;\n    try {\n      supportsFlagEmojis = getDoesBrowserSupportFlagEmojis();\n    } catch (error) {\n    }\n    return {\n      supportsFlagEmojis\n    };\n  }\n}\nclass FlagEmojisDetector extends ScoreDetectorBase {\n  constructor() {\n    super(...arguments);\n    this.name = "detectFlagEmojis";\n    this.capabilities = CANVAS_CAPABILITIES;\n    this.scoreWhenFailed = 0;\n    this.environment = new FlagEmojisEnvironment();\n  }\n  async calcScore() {\n    const { supportsFlagEmojis } = await this.environment.getCurrentScope();\n    if (navigator.platform.startsWith("Win") && isChromeLike() && supportsFlagEmojis) {\n      return 0.4;\n    }\n    if (navigator.userAgent.includes("Windows") && isChromeLike() && supportsFlagEmojis) {\n      return 0.4;\n    }\n    return 0;\n  }\n}\nconst detectFlagEmojis = new FlagEmojisDetector();\nconst supportsFontSizeAdjust = () => CSS?.supports("font-size-adjust", "0.545");\nclass FontSizeAdjustEnvironment extends DetectorEnvironmentBase {\n  constructor() {\n    super(...arguments);\n    this.browserExpectations = [\n      {\n        browser: {\n          name: BrowserKind.Chrome,\n          version: "127.0.6483.0"\n        },\n        scope: {\n          supportsFontSizeAdjust: false\n        }\n      },\n      {\n        browser: {\n          name: BrowserKind.Chrome,\n          // caniuse mistakenly reports from 127 https://caniuse.com/?search=font-size-adjust\n          version: "128.0.6534.0"\n        },\n        scope: {\n          supportsFontSizeAdjust: true\n        }\n      }\n    ];\n  }\n  async resolveScope() {\n    return {\n      supportsFontSizeAdjust: supportsFontSizeAdjust()\n    };\n  }\n}\nclass FontSizeAdjustDetector extends ScoreDetectorBase {\n  constructor() {\n    super(...arguments);\n    this.name = "detectFontSizeAdjust";\n    this.capabilities = CANVAS_CAPABILITIES;\n    this.scoreWhenFailed = 0;\n    this.environment = new FontSizeAdjustEnvironment();\n  }\n  /**\n   * Detects mismatches between the expected and actual `font-size-adjust` support.\n   * Returns:\n   *  - `0`: expected and detected support match\n   *  - `1`: mismatch (either false positive or false negative)\n   *\n   * This is used as a consistency check for CSS property support detection.\n   */\n  async calcScore() {\n    getBrowserEngineKind();\n    const browserVersion = getBrowserVersion();\n    const browserKind = getBrowserKind();\n    const { supportsFontSizeAdjust: detectedSupport } = await this.environment.getCurrentScope();\n    let shouldHaveFontSizeAdjust = false;\n    switch (browserKind) {\n      case BrowserKind.Chrome:\n      case BrowserKind.Brave:\n      case BrowserKind.SamsungInternet:\n      case BrowserKind.Edge:\n        if (browserVersion >= 127) {\n          shouldHaveFontSizeAdjust = true;\n        }\n        break;\n      case BrowserKind.Opera:\n        if (browserVersion >= 113) {\n          shouldHaveFontSizeAdjust = true;\n        }\n        break;\n      case BrowserKind.Firefox:\n        if (browserVersion >= 3) {\n          shouldHaveFontSizeAdjust = true;\n        }\n        break;\n      case BrowserKind.Safari:\n        if (browserVersion >= 16.4) {\n          shouldHaveFontSizeAdjust = true;\n        }\n        break;\n    }\n    if (detectedSupport !== shouldHaveFontSizeAdjust) {\n      return 1;\n    }\n    return 0;\n  }\n}\nconst detectFontSizeAdjust = new FontSizeAdjustDetector();\nconst supportsOffsetPathShape = () => CSS?.supports("offset-path", "shape(from 0 0, line to 10px 10px)");\nclass OffsetPathShapeEnvironment extends DetectorEnvironmentBase {\n  constructor() {\n    super(...arguments);\n    this.browserExpectations = [\n      {\n        browser: {\n          name: BrowserKind.Chrome,\n          version: "137.0.7104.0"\n        },\n        scope: {\n          supportsOffsetPathShape: false\n        }\n      },\n      {\n        browser: {\n          name: BrowserKind.Chrome,\n          version: "138.0.7152.0"\n        },\n        scope: {\n          supportsOffsetPathShape: true\n        }\n      }\n    ];\n  }\n  async resolveScope() {\n    return {\n      supportsOffsetPathShape: supportsOffsetPathShape()\n    };\n  }\n}\nclass OffsetPathShapeDetector extends ScoreDetectorBase {\n  constructor() {\n    super(...arguments);\n    this.name = "detectOffsetPathShape";\n    this.capabilities = CANVAS_CAPABILITIES;\n    this.scoreWhenFailed = 0;\n    this.environment = new OffsetPathShapeEnvironment();\n  }\n  /**\n   * Detects mismatches between the expected and actual offset-path shape() support.\n   * Returns:\n   *  - `0`: expected and detected support match\n   *  - `1`: mismatch (either false positive or false negative)\n   *\n   * Based on Chrome 137 release notes:\n   * - Chrome 137+, Edge 137+: Supported\n   * - Opera 123+: Supported (Opera uses independent versioning scheme)\n   * - Firefox: Limited support (check implementation status)\n   * - Safari: Not supported\n   */\n  async calcScore() {\n    const browserKind = getBrowserKind();\n    const browserVersion = getBrowserVersion();\n    const { supportsOffsetPathShape: detectedSupport } = await this.environment.getCurrentScope();\n    let shouldSupportOffsetPathShape = true;\n    switch (browserKind) {\n      case BrowserKind.Brave:\n      case BrowserKind.Chrome:\n      case BrowserKind.Edge:\n        if (browserVersion < 135) {\n          shouldSupportOffsetPathShape = false;\n        }\n        break;\n      case BrowserKind.SamsungInternet:\n        shouldSupportOffsetPathShape = false;\n        break;\n      case BrowserKind.Opera:\n        if (browserVersion < 120) {\n          shouldSupportOffsetPathShape = false;\n        }\n        break;\n      case BrowserKind.Firefox:\n        shouldSupportOffsetPathShape = false;\n        break;\n      case BrowserKind.Safari:\n        if (browserVersion < 18) {\n          shouldSupportOffsetPathShape = false;\n        }\n        break;\n      default:\n        shouldSupportOffsetPathShape = true;\n        break;\n    }\n    return detectedSupport !== shouldSupportOffsetPathShape ? 1 : 0;\n  }\n}\nconst detectOffsetPathShape = new OffsetPathShapeDetector();\nconst supportsViewTransitionMatchElement = () => CSS?.supports("view-transition-name", "match-element");\nclass ViewTransitionMatchElementEnvironment extends DetectorEnvironmentBase {\n  constructor() {\n    super(...arguments);\n    this.browserExpectations = [\n      {\n        browser: {\n          name: BrowserKind.Chrome,\n          version: "137.0.7104.0"\n        },\n        scope: {\n          supportsViewTransitionMatchElement: false\n        }\n      },\n      {\n        browser: {\n          name: BrowserKind.Chrome,\n          // caniuse mistakenly reports from 137 https://caniuse.com/mdn-css_properties_view-transition-name_match-element\n          version: "138.0.7152.0"\n        },\n        scope: {\n          supportsViewTransitionMatchElement: true\n        }\n      }\n    ];\n  }\n  async resolveScope() {\n    return {\n      supportsViewTransitionMatchElement: supportsViewTransitionMatchElement()\n    };\n  }\n}\nclass ViewTransitionMatchElementDetector extends ScoreDetectorBase {\n  constructor() {\n    super(...arguments);\n    this.name = "detectViewTransitionMatchElement";\n    this.capabilities = CANVAS_CAPABILITIES;\n    this.scoreWhenFailed = 0;\n    this.environment = new ViewTransitionMatchElementEnvironment();\n  }\n  /**\n   * Detects mismatches between the expected and actual view-transition-name: match-element support.\n   * Returns:\n   *  - `0`: expected and detected support match\n   *  - `1`: mismatch (either false positive or false negative)\n   *\n   * Based on Chrome 137 release notes:\n   * - Chrome 137+, Edge 137+: Supported\n   * - Opera 123+: Supported (Opera uses independent versioning scheme)\n   * - Firefox, Safari: Not supported (view transitions are Chrome-specific currently)\n   */\n  async calcScore() {\n    const browserKind = getBrowserKind();\n    const browserVersion = getBrowserVersion();\n    const { supportsViewTransitionMatchElement: detectedSupport } = await this.environment.getCurrentScope();\n    let shouldSupportViewTransition = true;\n    switch (browserKind) {\n      case BrowserKind.Chrome:\n      case BrowserKind.Brave:\n      case BrowserKind.Edge:\n      case BrowserKind.SamsungInternet:\n        if (browserVersion < 137) {\n          shouldSupportViewTransition = false;\n        }\n        break;\n      case BrowserKind.Opera:\n        if (browserVersion < 121) {\n          shouldSupportViewTransition = false;\n        }\n        break;\n      case BrowserKind.Firefox:\n        if (browserVersion < 144) {\n          shouldSupportViewTransition = false;\n        }\n        break;\n      case BrowserKind.Safari:\n        if (browserVersion < 18)\n          shouldSupportViewTransition = false;\n        break;\n      default:\n        shouldSupportViewTransition = true;\n        break;\n    }\n    return detectedSupport !== shouldSupportViewTransition ? 1 : 0;\n  }\n}\nconst detectViewTransitionMatchElement = new ViewTransitionMatchElementDetector();\nconst fontsDetectors = [\n  detectFlagEmojis,\n  detectFontSizeAdjust,\n  detectCssIfFunction,\n  detectCssReadingFlow,\n  detectOffsetPathShape,\n  detectViewTransitionMatchElement\n];\nconst getEvalLength = () => {\n  return eval.toString().length;\n};\nclass EvalLengthInconsistencyEnvironment extends DetectorEnvironmentBase {\n  async resolveScope() {\n    return {};\n  }\n}\nclass EvalLengthInconsistencyDetector extends ScoreDetectorBase {\n  constructor() {\n    super(...arguments);\n    this.name = "detectEvalLengthInconsistency";\n    this.capabilities = WORKER_SAFE_CAPABILITIES;\n    this.scoreWhenFailed = 0.1;\n    this.environment = new EvalLengthInconsistencyEnvironment();\n  }\n  async calcScore() {\n    const browserKind = getBrowserKind();\n    const browserEngineKind = getBrowserEngineKind();\n    const evalLength = getEvalLength();\n    if (browserEngineKind === BrowserEngineKind.Unknown)\n      return 0.1;\n    const inconsistentWebkitGecko = evalLength === 37 && !arrayIncludes([BrowserEngineKind.Webkit, BrowserEngineKind.Gecko], browserEngineKind);\n    const inconsistentIE = evalLength === 39 && !arrayIncludes([BrowserKind.IE], browserKind);\n    const inconsistentChromium = evalLength === 33 && !arrayIncludes([BrowserEngineKind.Chromium], browserEngineKind);\n    const inconsistent = inconsistentWebkitGecko || inconsistentIE || inconsistentChromium;\n    return inconsistent ? 1 : 0;\n  }\n}\nconst detectEvalLengthInconsistency = new EvalLengthInconsistencyDetector();\nconst getFunctionBind = () => {\n  if (Function.prototype.bind === void 0) {\n    throw new Error("Function.prototype.bind is undefined");\n  }\n  return Function.prototype.bind.toString();\n};\nclass FunctionBindEnvironment extends DetectorEnvironmentBase {\n  async resolveScope() {\n    return {};\n  }\n}\nclass FunctionBindDetector extends ScoreDetectorBase {\n  constructor() {\n    super(...arguments);\n    this.name = "detectFunctionBind";\n    this.capabilities = WORKER_SAFE_CAPABILITIES;\n    this.scoreWhenFailed = 1;\n    this.environment = new FunctionBindEnvironment();\n  }\n  async calcScore() {\n    getFunctionBind();\n    return 0;\n  }\n}\nconst detectFunctionBind = new FunctionBindDetector();\nconst functionsDetectors = [\n  detectEvalLengthInconsistency,\n  detectFunctionBind\n];\nconst getPluginsArray = () => {\n  if (navigator.plugins === void 0) {\n    throw new Error("navigator.plugins is undefined");\n  }\n  if (window.PluginArray === void 0) {\n    throw new Error("window.PluginArray is undefined");\n  }\n  return navigator.plugins instanceof PluginArray;\n};\nclass PluginsArrayEnvironment extends DetectorEnvironmentBase {\n  async resolveScope() {\n    return {};\n  }\n}\nclass PluginsArrayDetector extends ScoreDetectorBase {\n  constructor() {\n    super(...arguments);\n    this.name = "detectPluginsArray";\n    this.capabilities = WORKER_SAFE_CAPABILITIES;\n    this.scoreWhenFailed = 0;\n    this.environment = new PluginsArrayEnvironment();\n  }\n  async calcScore() {\n    const pluginsArray = getPluginsArray();\n    if (!pluginsArray)\n      return 1;\n    return 0;\n  }\n}\nconst detectPluginsArray = new PluginsArrayDetector();\nconst getPluginsLength = () => {\n  if (navigator.plugins === void 0) {\n    throw new Error("navigator.plugins is undefined");\n  }\n  if (navigator.plugins.length === void 0) {\n    throw new Error("navigator.plugins.length is undefined");\n  }\n  return navigator.plugins.length;\n};\nclass PluginsLengthInconsistencyEnvironment extends DetectorEnvironmentBase {\n  async resolveScope() {\n    return {};\n  }\n}\nclass PluginsLengthInconsistencyDetector extends ScoreDetectorBase {\n  constructor() {\n    super(...arguments);\n    this.name = "detectPluginsLengthInconsistency";\n    this.capabilities = WORKER_SAFE_CAPABILITIES;\n    this.scoreWhenFailed = 0;\n    this.environment = new PluginsLengthInconsistencyEnvironment();\n  }\n  async calcScore() {\n    const pluginsLength = getPluginsLength();\n    const android = isAndroid();\n    const browserKind = getBrowserKind();\n    const browserEngineKind = getBrowserEngineKind();\n    if (!isChromeLike$1(browserKind) || android || browserEngineKind !== BrowserEngineKind.Chromium)\n      return 0;\n    if (pluginsLength === 0)\n      return 1;\n    return 0;\n  }\n}\nconst detectPluginsLengthInconsistency = new PluginsLengthInconsistencyDetector();\nconst getRTT = () => {\n  if (navigator.connection === void 0) {\n    throw new BotdError(State.Undefined, "navigator.connection is undefined");\n  }\n  if (navigator.connection.rtt === void 0) {\n    throw new BotdError(State.Undefined, "navigator.connection.rtt is undefined");\n  }\n  return navigator.connection.rtt;\n};\nclass RttEnvironment extends DetectorEnvironmentBase {\n  async resolveScope() {\n    return {};\n  }\n}\nclass RttDetector extends ScoreDetectorBase {\n  constructor() {\n    super(...arguments);\n    this.name = "detectRTT";\n    this.capabilities = WORKER_SAFE_CAPABILITIES;\n    this.scoreWhenFailed = 0;\n    this.environment = new RttEnvironment();\n  }\n  async calcScore() {\n    const rtt = getRTT();\n    const android = isAndroid();\n    if (android)\n      return 0;\n    if (rtt === 0)\n      return 0.2;\n    return 0;\n  }\n}\nconst detectRTT = new RttDetector();\nconst getWindowSize = () => ({\n  outerWidth: window.outerWidth,\n  outerHeight: window.outerHeight,\n  innerWidth: window.innerWidth,\n  innerHeight: window.innerHeight\n});\nclass WindowSizeEnvironment extends DetectorEnvironmentBase {\n  async resolveScope() {\n    return {\n      windowSize: getWindowSize(),\n      documentFocus: getDocumentFocus()\n    };\n  }\n}\nclass WindowSizeDetector extends ScoreDetectorBase {\n  constructor() {\n    super(...arguments);\n    this.name = "detectWindowSize";\n    this.capabilities = DEFAULT_DOM_CAPABILITIES;\n    this.scoreWhenFailed = 0;\n    this.environment = new WindowSizeEnvironment();\n  }\n  async calcScore() {\n    const { windowSize, documentFocus } = await this.environment.getCurrentScope();\n    const { outerWidth, outerHeight } = windowSize;\n    if (!documentFocus)\n      return 0;\n    if (outerWidth === 0 && outerHeight === 0)\n      return 1;\n    return 0;\n  }\n}\nconst detectWindowSize = new WindowSizeDetector();\nconst headlessDetectors = [\n  detectPluginsArray,\n  detectPluginsLengthInconsistency,\n  detectRTT,\n  detectWindowSize\n];\nconst incognitoDetectors = [];\nconst areMimeTypesConsistent = () => {\n  if (navigator.mimeTypes === void 0) {\n    throw new BotdError(State.Undefined, "navigator.mimeTypes is undefined");\n  }\n  const { mimeTypes } = navigator;\n  let isConsistent = Object.getPrototypeOf(mimeTypes) === MimeTypeArray.prototype;\n  for (let i = 0; i < mimeTypes.length; i++) {\n    isConsistent && (isConsistent = Object.getPrototypeOf(mimeTypes[i]) === MimeType.prototype);\n  }\n  return isConsistent;\n};\nclass MimeTypesConsistentEnvironment extends DetectorEnvironmentBase {\n  async resolveScope() {\n    return {\n      areMimeTypesConsistent: areMimeTypesConsistent()\n    };\n  }\n}\nclass MimeTypesConsistentDetector extends ScoreDetectorBase {\n  constructor() {\n    super(...arguments);\n    this.name = "detectMimeTypesConsistent";\n    this.capabilities = WORKER_SAFE_CAPABILITIES;\n    this.scoreWhenFailed = 0;\n    this.environment = new MimeTypesConsistentEnvironment();\n  }\n  async calcScore() {\n    const { areMimeTypesConsistent: areMimeTypesConsistent2 } = await this.environment.getCurrentScope();\n    if (!areMimeTypesConsistent2)\n      return 1;\n    return 0;\n  }\n}\nconst detectMimeTypesConsistent = new MimeTypesConsistentDetector();\nclass PlatformSetManuallyEnvironment extends DetectorEnvironmentBase {\n  async resolveScope() {\n    return {};\n  }\n}\nclass PlatformSetManuallyDetector extends ScoreDetectorBase {\n  constructor() {\n    super(...arguments);\n    this.name = "detectPlatformSetManually";\n    this.capabilities = WORKER_SAFE_CAPABILITIES;\n    this.scoreWhenFailed = 1;\n    this.environment = new PlatformSetManuallyEnvironment();\n  }\n  async calcScore() {\n    await delay(50);\n    const platform = navigator.platform || "unknown";\n    Object.defineProperty(navigator, "platform", {\n      get: () => platform\n    });\n    return 0;\n  }\n}\nconst detectPlatformSetManually = new PlatformSetManuallyDetector();\nconst delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));\nconst getProductSub = () => {\n  const { productSub } = navigator;\n  if (productSub === void 0) {\n    throw new Error("navigator.productSub is undefined");\n  }\n  return productSub;\n};\nclass ProductSubEnvironment extends DetectorEnvironmentBase {\n  async resolveScope() {\n    return {\n      productSub: getProductSub()\n    };\n  }\n}\nclass ProductSubDetector extends ScoreDetectorBase {\n  constructor() {\n    super(...arguments);\n    this.name = "detectProductSub";\n    this.capabilities = WORKER_SAFE_CAPABILITIES;\n    this.scoreWhenFailed = 0;\n    this.environment = new ProductSubEnvironment();\n  }\n  async calcScore() {\n    const { productSub } = await this.environment.getCurrentScope();\n    const browserKind = getBrowserKind();\n    if ((isChromeLike$1(browserKind) || browserKind === BrowserKind.Safari || browserKind === BrowserKind.Opera || browserKind === BrowserKind.WeChat) && productSub !== "20030107")\n      return 1;\n    return 0;\n  }\n}\nconst detectProductSub = new ProductSubDetector();\nconst navigatorDetectors = [\n  detectMimeTypesConsistent,\n  detectProductSub,\n  detectPlatformSetManually\n];\nconst getNotificationPermissions = async () => {\n  if (window.Notification === void 0) {\n    throw new Error("window.Notification is undefined");\n  }\n  if (navigator.permissions === void 0) {\n    throw new Error("navigator.permissions is undefined");\n  }\n  const { permissions } = navigator;\n  if (typeof permissions.query !== "function") {\n    throw new Error("navigator.permissions.query is not a function");\n  }\n  try {\n    const permissionStatus = await permissions.query({ name: "notifications" });\n    return window.Notification.permission === "denied" && permissionStatus.state === "prompt";\n  } catch (e) {\n    throw new Error("notificationPermissions signal unexpected behaviour");\n  }\n};\nclass NotificationPermissionsEnvironment extends DetectorEnvironmentBase {\n  async resolveScope() {\n    return {\n      notificationPermissions: await getNotificationPermissions()\n    };\n  }\n}\nclass NotificationPermissionsDetector extends ScoreDetectorBase {\n  constructor() {\n    super(...arguments);\n    this.name = "detectNotificationPermissions";\n    this.capabilities = DEFAULT_DOM_CAPABILITIES;\n    this.scoreWhenFailed = 0;\n    this.environment = new NotificationPermissionsEnvironment();\n  }\n  async calcScore() {\n    const { notificationPermissions } = await this.environment.getCurrentScope();\n    const browserKind = getBrowserKind();\n    if (!isChromeLike$1(browserKind))\n      return 0;\n    if (notificationPermissions && browserKind !== BrowserKind.SamsungInternet) {\n      return 1;\n    }\n    return 0;\n  }\n}\nconst detectNotificationPermissions = new NotificationPermissionsDetector();\nconst notificationDetectors = [\n  detectNotificationPermissions\n];\nconst resistanceDetectors = [];\nconst instanceId = String.fromCharCode(Math.random() * 26 + 97) + Math.random().toString(36).slice(-7);\nconst detectIframeProxyFn = () => {\n  try {\n    const iframe = document.createElement("iframe");\n    iframe.srcdoc = instanceId;\n    return iframe.contentWindow ? 0.5 : 0;\n  } catch (err) {\n    return 0.2;\n  }\n};\nconst detectHighChromeIndexFn = () => {\n  const key = "chrome";\n  const highIndexRange = -50;\n  return Object.keys(window).slice(highIndexRange).includes(key) && Object.getOwnPropertyNames(window).slice(highIndexRange).includes(key) ? 0.5 : 0;\n};\nconst detectBadChromeRuntimeFn = () => {\n  if (!("chrome" in window && "runtime" in chrome)) {\n    return 0;\n  }\n  try {\n    if ("prototype" in chrome.runtime.sendMessage || "prototype" in chrome.runtime.connect) {\n      return 0.5;\n    }\n    new chrome.runtime.sendMessage();\n    new chrome.runtime.connect();\n    return 0.5;\n  } catch (err) {\n    return err.constructor.name !== "TypeError" ? 0.5 : 0;\n  }\n};\nconst detectTempProfileFn = () => {\n  return navigator.userAgent.includes("chrome_user_data_") ? 0.2 : 0;\n};\nconst detectStealthFn = () => {\n  const iframeScore = detectIframeProxyFn();\n  const chromeIndexScore = detectHighChromeIndexFn();\n  const runtimeScore = detectBadChromeRuntimeFn();\n  const tempProfileScore = detectTempProfileFn();\n  return Math.max(iframeScore, chromeIndexScore, runtimeScore, tempProfileScore);\n};\nclass StealthEnvironment extends DetectorEnvironmentBase {\n  async resolveScope() {\n    return {};\n  }\n}\nclass StealthDetector extends ScoreDetectorBase {\n  constructor() {\n    super(...arguments);\n    this.name = "detectStealth";\n    this.capabilities = DEFAULT_DOM_CAPABILITIES;\n    this.scoreWhenFailed = 0;\n    this.environment = new StealthEnvironment();\n  }\n  async calcScore() {\n    return detectStealthFn();\n  }\n}\nclass IframeProxyDetector extends ScoreDetectorBase {\n  constructor() {\n    super(...arguments);\n    this.name = "detectIframeProxy";\n    this.capabilities = DEFAULT_DOM_CAPABILITIES;\n    this.scoreWhenFailed = 0;\n    this.environment = new StealthEnvironment();\n  }\n  async calcScore() {\n    return detectIframeProxyFn();\n  }\n}\nclass TempProfileDetector extends ScoreDetectorBase {\n  constructor() {\n    super(...arguments);\n    this.name = "detectTempProfile";\n    this.capabilities = DEFAULT_DOM_CAPABILITIES;\n    this.scoreWhenFailed = 0;\n    this.environment = new StealthEnvironment();\n  }\n  async calcScore() {\n    return detectTempProfileFn();\n  }\n}\nclass HighChromeIndexDetector extends ScoreDetectorBase {\n  constructor() {\n    super(...arguments);\n    this.name = "detectHighChromeIndex";\n    this.capabilities = DEFAULT_DOM_CAPABILITIES;\n    this.scoreWhenFailed = 0;\n    this.environment = new StealthEnvironment();\n  }\n  async calcScore() {\n    return detectHighChromeIndexFn();\n  }\n}\nclass BadChromeRuntimeDetector extends ScoreDetectorBase {\n  constructor() {\n    super(...arguments);\n    this.name = "detectBadChromeRuntime";\n    this.capabilities = DEFAULT_DOM_CAPABILITIES;\n    this.scoreWhenFailed = 0;\n    this.environment = new StealthEnvironment();\n  }\n  async calcScore() {\n    return detectBadChromeRuntimeFn();\n  }\n}\nnew StealthDetector();\nconst detectIframeProxy = new IframeProxyDetector();\nconst detectTempProfile = new TempProfileDetector();\nconst detectHighChromeIndex = new HighChromeIndexDetector();\nconst detectBadChromeRuntime = new BadChromeRuntimeDetector();\nconst stealthDetectors = [\n  detectIframeProxy,\n  detectHighChromeIndex,\n  detectBadChromeRuntime,\n  detectTempProfile\n];\nconst timezoneDetectors = [];\nconst getWebGL = () => {\n  const canvasElement = document.createElement("canvas");\n  if (typeof canvasElement.getContext !== "function") {\n    throw new BotdError(State.NotFunction, "HTMLCanvasElement.getContext is not a function");\n  }\n  const webGLContext = canvasElement.getContext("webgl");\n  if (webGLContext === null) {\n    throw new BotdError(State.Null, "WebGLRenderingContext is null");\n  }\n  if (typeof webGLContext.getParameter !== "function") {\n    throw new BotdError(State.NotFunction, "WebGLRenderingContext.getParameter is not a function");\n  }\n  const vendor = webGLContext.getParameter(webGLContext.VENDOR);\n  const renderer = webGLContext.getParameter(webGLContext.RENDERER);\n  return { vendor, renderer };\n};\nclass WebGLEnvironment extends DetectorEnvironmentBase {\n  async resolveScope() {\n    return {\n      webGL: getWebGL()\n    };\n  }\n}\nclass WebGLDetector extends ScoreDetectorBase {\n  constructor() {\n    super(...arguments);\n    this.name = "detectWebGL";\n    this.capabilities = CANVAS_CAPABILITIES;\n    this.scoreWhenFailed = 0.1;\n    this.environment = new WebGLEnvironment();\n  }\n  async calcScore() {\n    const { vendor, renderer } = (await this.environment.getCurrentScope()).webGL;\n    if (vendor === "Brian Paul" && renderer === "Mesa OffScreen") {\n      return 1;\n    }\n    return 0;\n  }\n}\nconst detectWebGL = new WebGLDetector();\nconst webGlDetectors = [detectWebGL];\nconst getWebDriver = () => {\n  if (navigator.webdriver === void 0) {\n    throw new BotdError(State.Undefined, "navigator.webdriver is undefined");\n  }\n  return navigator.webdriver;\n};\nclass WebDriverEnvironment extends DetectorEnvironmentBase {\n  async resolveScope() {\n    return {\n      supportsWebdriver: getWebDriver()\n    };\n  }\n}\nclass WebDriverDetector extends ScoreDetectorBase {\n  constructor() {\n    super(...arguments);\n    this.name = "detectWebDriver";\n    this.capabilities = WORKER_SAFE_CAPABILITIES;\n    this.scoreWhenFailed = 0;\n    this.environment = new WebDriverEnvironment();\n  }\n  async calcScore() {\n    const { supportsWebdriver } = await this.environment.getCurrentScope();\n    if (supportsWebdriver)\n      return 1;\n    return 0;\n  }\n}\nconst detectWebDriver = new WebDriverDetector();\nconst webdriverDetectors = [detectWebDriver];\nconst supportsLocalAiSummarizer = () => {\n  return void 0 !== window.Summarizer;\n};\nclass AiEnvironment extends DetectorEnvironmentBase {\n  constructor() {\n    super(...arguments);\n    this.browserExpectations = [\n      {\n        browser: {\n          name: BrowserKind.Chrome,\n          version: "139.0.7205.0"\n        },\n        scope: {\n          supportsWindowAi: false,\n          isSecureContext: true\n        }\n      },\n      {\n        browser: {\n          name: BrowserKind.Chrome,\n          // https://chromestatus.com/feature/5193953788559360\n          version: "140.0.7259.0"\n        },\n        scope: {\n          supportsWindowAi: true,\n          isSecureContext: true\n        }\n      }\n    ];\n  }\n  async resolveScope() {\n    return {\n      supportsWindowAi: supportsLocalAiSummarizer(),\n      isSecureContext: window.isSecureContext\n    };\n  }\n}\nclass AiDetector extends ScoreDetectorBase {\n  constructor() {\n    super(...arguments);\n    this.name = "detectAI";\n    this.capabilities = DEFAULT_DOM_CAPABILITIES;\n    this.scoreWhenFailed = 0;\n    this.environment = new AiEnvironment();\n  }\n  async calcScore() {\n    const browserKind = getBrowserKind();\n    const browserVersion = getBrowserVersion();\n    const browserIsAndroid = isAndroid();\n    const { supportsWindowAi, isSecureContext } = await this.environment.getCurrentScope();\n    let shouldSupportAi = false;\n    switch (browserKind) {\n      case BrowserKind.Chrome:\n        if (!browserIsAndroid && browserVersion >= 138) {\n          shouldSupportAi = isSecureContext;\n        }\n        break;\n      case BrowserKind.Edge:\n        if (!browserIsAndroid && browserVersion >= 138) {\n          shouldSupportAi = isSecureContext;\n        }\n        break;\n      case BrowserKind.Brave:\n      case BrowserKind.SamsungInternet:\n        shouldSupportAi = false;\n        break;\n      case BrowserKind.Opera:\n        if (!browserIsAndroid && browserVersion >= 122) {\n          shouldSupportAi = isSecureContext;\n        }\n        break;\n      case BrowserKind.Firefox:\n      case BrowserKind.Safari:\n        shouldSupportAi = false;\n        break;\n      default:\n        shouldSupportAi = false;\n        break;\n    }\n    return supportsWindowAi !== shouldSupportAi ? 1 : 0;\n  }\n}\nconst detectAI = new AiDetector();\nconst getDistinctiveProperties = () => {\n  const distinctivePropsList = {\n    [getBotKind("Awesomium")]: {\n      window: ["awesomium"]\n    },\n    [getBotKind("Cef")]: {\n      window: ["RunPerfTest"]\n    },\n    [getBotKind("CefSharp")]: {\n      window: ["CefSharp"]\n    },\n    [getBotKind("CoachJS")]: {\n      window: ["emit"]\n    },\n    [getBotKind("FMiner")]: {\n      window: ["fmget_targets"]\n    },\n    [getBotKind("Geb")]: {\n      window: ["geb"]\n    },\n    [getBotKind("NightmareJS")]: {\n      window: ["__nightmare", "nightmare"]\n    },\n    [getBotKind("Phantomas")]: {\n      window: ["__phantomas"]\n    },\n    [getBotKind("PhantomJS")]: {\n      window: ["callPhantom", "_phantom"]\n    },\n    [getBotKind("Rhino")]: {\n      window: ["spawn"]\n    },\n    [getBotKind("Selenium")]: {\n      window: [\n        "_Selenium_IDE_Recorder",\n        "_selenium",\n        "calledSelenium",\n        /^([a-z]){3}_.*_(Array|Promise|Symbol)$/\n      ],\n      document: [\n        "__selenium_evaluate",\n        "selenium-evaluate",\n        "__selenium_unwrapped"\n      ]\n    },\n    [getBotKind("WebDriverIO")]: {\n      window: ["wdioElectron"]\n    },\n    [getBotKind("WebDriver")]: {\n      window: [\n        "webdriver",\n        "__webdriverFunc",\n        "__lastWatirAlert",\n        "__lastWatirConfirm",\n        "__lastWatirPrompt",\n        "_WEBDRIVER_ELEM_CACHE",\n        "ChromeDriverw"\n      ],\n      document: [\n        "__webdriver_script_fn",\n        "__driver_evaluate",\n        "__webdriver_evaluate",\n        "__fxdriver_evaluate",\n        "__driver_unwrapped",\n        "__webdriver_unwrapped",\n        "__fxdriver_unwrapped",\n        "__webdriver_script_fn",\n        "__webdriver_script_func",\n        "__webdriver_script_function",\n        "$cdc_asdjflasutopfhvcZLmcf",\n        "$cdc_asdjflasutopfhvcZLmcfl_",\n        "$chrome_asyncScriptInfo",\n        "__$webdriverAsyncExecutor"\n      ]\n    },\n    [getBotKind("HeadlessChrome")]: {\n      window: ["domAutomation", "domAutomationController"]\n    }\n  };\n  let botName;\n  const result = {};\n  const windowProps = getObjectProps(window);\n  let documentProps = [];\n  if (window.document !== void 0)\n    documentProps = getObjectProps(window.document);\n  for (botName in distinctivePropsList) {\n    const props = distinctivePropsList[botName];\n    if (props !== void 0) {\n      const windowContains = props.window === void 0 ? false : includes(windowProps, ...props.window);\n      const documentContains = props.document === void 0 || !documentProps.length ? false : includes(documentProps, ...props.document);\n      result[botName] = windowContains || documentContains;\n    }\n  }\n  return result;\n};\nclass DistinctivePropertiesEnvironment extends DetectorEnvironmentBase {\n  async resolveScope() {\n    return {\n      distinctiveProperties: getDistinctiveProperties()\n    };\n  }\n}\nclass DistinctivePropertiesDetector extends ScoreDetectorBase {\n  constructor() {\n    super(...arguments);\n    this.name = "detectDistinctiveProperties";\n    this.capabilities = DEFAULT_DOM_CAPABILITIES;\n    this.scoreWhenFailed = 0;\n    this.environment = new DistinctivePropertiesEnvironment();\n  }\n  async calcScore() {\n    const { distinctiveProperties } = await this.environment.getCurrentScope();\n    const value = distinctiveProperties;\n    let bot;\n    for (bot in value)\n      if (value[bot])\n        return 1;\n    return 0;\n  }\n}\nconst detectDistinctiveProperties = new DistinctivePropertiesDetector();\nconst getDocumentElementKeys = () => {\n  if (document.documentElement === void 0) {\n    throw new Error("document.documentElement is undefined");\n  }\n  const { documentElement } = document;\n  if (typeof documentElement.getAttributeNames !== "function") {\n    throw new Error("document.documentElement.getAttributeNames is not a function");\n  }\n  return documentElement.getAttributeNames();\n};\nclass DocumentAttributesEnvironment extends DetectorEnvironmentBase {\n  async resolveScope() {\n    return {\n      documentElementKeys: getDocumentElementKeys()\n    };\n  }\n}\nclass DocumentAttributesDetector extends ScoreDetectorBase {\n  constructor() {\n    super(...arguments);\n    this.name = "detectDocumentAttributes";\n    this.capabilities = DEFAULT_DOM_CAPABILITIES;\n    this.scoreWhenFailed = 0;\n    this.environment = new DocumentAttributesEnvironment();\n  }\n  async calcScore() {\n    const { documentElementKeys } = await this.environment.getCurrentScope();\n    if (includes(documentElementKeys, "selenium", "webdriver", "driver")) {\n      return 1;\n    }\n    return 0;\n  }\n}\nconst detectDocumentAttributes = new DocumentAttributesDetector();\nconst getProcess = () => {\n  const { process } = window;\n  const errorPrefix = "window.process is";\n  if (process === void 0) {\n    throw new Error(`${errorPrefix} undefined`);\n  }\n  if (process && typeof process !== "object") {\n    throw new Error(`${errorPrefix} not an object`);\n  }\n  return process;\n};\nclass ProcessEnvironment extends DetectorEnvironmentBase {\n  async resolveScope() {\n    let process = {};\n    try {\n      process = getProcess();\n    } catch (error) {\n    }\n    return {\n      process\n    };\n  }\n}\nclass ProcessDetector extends ScoreDetectorBase {\n  constructor() {\n    super(...arguments);\n    this.name = "detectProcess";\n    this.capabilities = DEFAULT_DOM_CAPABILITIES;\n    this.scoreWhenFailed = 0;\n    this.environment = new ProcessEnvironment();\n  }\n  async calcScore() {\n    const { process } = await this.environment.getCurrentScope();\n    if (\n      // Use process.type === "renderer" to detect Electron\n      process.type === "renderer" || process.versions?.electron != null\n    ) {\n      return 1;\n    }\n    return 0;\n  }\n}\nconst detectProcess = new ProcessDetector();\nconst getWindowExternal = () => {\n  if (window.external === void 0) {\n    throw new Error("window.external is undefined");\n  }\n  const { external } = window;\n  if (typeof external.toString !== "function") {\n    throw new Error("window.external.toString is not a function");\n  }\n  return external.toString();\n};\nclass WindowExternalEnvironment extends DetectorEnvironmentBase {\n  async resolveScope() {\n    return {\n      windowExternal: getWindowExternal()\n    };\n  }\n}\nclass WindowExternalDetector extends ScoreDetectorBase {\n  constructor() {\n    super(...arguments);\n    this.name = "detectWindowExternal";\n    this.capabilities = DEFAULT_DOM_CAPABILITIES;\n    this.scoreWhenFailed = 0;\n    this.environment = new WindowExternalEnvironment();\n  }\n  async calcScore() {\n    const { windowExternal } = await this.environment.getCurrentScope();\n    if (/Sequentum/i.test(windowExternal))\n      return 1;\n    return 0;\n  }\n}\nconst detectWindowExternal = new WindowExternalDetector();\nconst windowDetectors = [\n  detectDistinctiveProperties,\n  detectDocumentAttributes,\n  detectProcess,\n  detectWindowExternal,\n  detectAI\n];\nconst workerDetectors = [];\nconst detectors = [\n  ...agentDetectors,\n  ...appVersionDetectors,\n  ...audioDetectors,\n  ...behaviourDetectors,\n  ...canvasDetectors,\n  ...caretDetectors,\n  ...cdpDetectors,\n  ...cssDetectors,\n  ...errorDetectors,\n  ...fontsDetectors,\n  ...functionsDetectors,\n  ...headlessDetectors,\n  ...incognitoDetectors,\n  ...navigatorDetectors,\n  ...notificationDetectors,\n  ...resistanceDetectors,\n  ...stealthDetectors,\n  ...timezoneDetectors,\n  ...webdriverDetectors,\n  ...webGlDetectors,\n  ...windowDetectors,\n  ...workerDetectors\n];\nfunction filterDetectors(detectors2, filter) {\n  return detectors2.filter((detector) => filter(detector.capabilities));\n}\nfunction getWorkerSafeDetectors() {\n  return filterDetectors(detectors, (caps) => caps.workerSafe);\n}\nconst botScoreWorkerSafe = async () => {\n  const workerSafeDetectors = getWorkerSafeDetectors();\n  return Promise.all(workerSafeDetectors.map(async (detector) => detector.getDetectedScore()));\n};\nself.addEventListener("message", async (event) => {\n  const { taskId, task } = event.data;\n  try {\n    let result;\n    switch (task) {\n      case "calculateBotScore":\n        result = await botScoreWorkerSafe();\n        break;\n      default:\n        throw new Error(`Unknown task: ${task}`);\n    }\n    const response = { taskId, result };\n    self.postMessage(response);\n  } catch (error) {\n    const response = {\n      taskId,\n      error: error instanceof Error ? error.message : "Unknown error"\n    };\n    self.postMessage(response);\n  }\n});\n';
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
   * Initialize the Web Worker
   */
  async initWorker() {
    if (this.worker || this.isInitializing) {
      return;
    }
    this.isInitializing = true;
    try {
      this.worker = new WorkerWrapper({});
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
      worker.postMessage({ taskId: "test", task: "calculateBotScore" });
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
      const request = { taskId, task };
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
const BotScoreWorkerManager$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: getBotScoreWorkerManager
}, Symbol.toStringTag, { value: "Module" }));
export {
  detect as default,
  encryptData
};
