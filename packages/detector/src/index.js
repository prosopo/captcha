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
      const hex = "4d5231754d5230425354654b5568435057544b4c52544c665231575b4d5231754d52314a55546d4b506a6d70505434425b33757960467571537b6d324c444b435454574650544751503147534e44474f52546d425033654d5031475353544735634638426546385458313445546c4c785433583157474b7362666e7b5333384e4c306a7856596e76626d5b6a52324f796056587b4f455b37606a5034537b57436530435b5b544f7454556d4950306d45576f6d5856546d7b6359507665475b7860783878623147316331574b526c7948426a5b4f4c6a307765544f33646c5b605546795765564f7b557b6d4456594b4b526b657463456d485545696d536d47375733714e4c556d7664465b524d3157694d7b47465247695154555b6956476235645557434e55404a65456d536352397756543446506b6a354f314b4b586a75316255474c65314759556f4f5452596d6d4e445777586b5735544548306344754d506d69535230576d4e566d71656c714657496559555553475b4750315b76716e5757713462447179586c346f50545433506f4b78536a5078587b44314e544879626c6d58536b576a5556756b4c337949627b53515b543435556c3131536c6d71556c476b6546767655316a35586b5b7b60476d57426a79546357696c5244713260454b3262543878506c696f6333794950556534574672305b316d715b6c767362456942507b6d4b4e54695355304779636f5b56637b5b34526c304c566c796b62336d49656c4f465231764a5330474b534447535054484a4d5231754d523047556a50665447574255446d4548447547565231754d52317542663c3c";
      let key = "";
      for (let i = 0; i < hex.length; i += 2) {
        key += String.fromCharCode(Number.parseInt(hex.substr(i, 2), 16) ^ 1);
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
  }
  _cachedBrowserEngineKind = BrowserEngineKind.Unknown;
  return _cachedBrowserEngineKind;
}
function getBrowserKind() {
  if (_cachedBrowserKind !== null) {
    return _cachedBrowserKind;
  }
  const userAgent = navigator.userAgent?.toLowerCase();
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
  if (!version) return 0;
  const normalized = version.replace(/_/g, ".");
  const parts = normalized.split(".");
  const major = Number.parseInt(parts[0], 10);
  return Number.isNaN(major) ? 0 : major;
};
function getBrowserVersion() {
  if (_cachedBrowserVersion !== null) {
    return _cachedBrowserVersion;
  }
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
      match = userAgent.match(/version\/(\d+(\.\d+)?)/i) || userAgent.match(/(?:iphone|ipad).*os (\d+(_\d+)?)/i);
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
const supportsCaretPositionFromPoint = () => typeof document.caretPositionFromPoint === "function";
const detectCaretPositionFromPoint = () => {
  const browserEngineKind = getBrowserEngineKind();
  if (browserEngineKind !== BrowserEngineKind.Chromium) {
    return 0;
  }
  const browserVersion = getBrowserVersion();
  const browserKind = getBrowserKind();
  const isChrome = browserKind === BrowserKind.Chrome && browserEngineKind === BrowserEngineKind.Chromium;
  const shouldHaveDetectCaretPositionFromPoint = isChrome && browserVersion >= 128;
  const shouldNotHaveDetectCaretPositionFromPoint = isChrome && browserVersion < 128;
  if (supportsCaretPositionFromPoint() && shouldNotHaveDetectCaretPositionFromPoint) {
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
const supportsCssIfFunction = () => CSS?.supports("color", "if(style(--test: red): blue; else: green)");
const detectCssIfFunction = () => {
  const browserKind = getBrowserKind();
  const browserVersion = getBrowserVersion();
  const detectedSupport = supportsCssIfFunction();
  let shouldSupportCssIf = false;
  switch (browserKind) {
    case BrowserKind.Chrome:
    case BrowserKind.Edge:
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
  return detectedSupport !== shouldSupportCssIf ? 1 : 0;
};
const supportsCssReadingFlow = () => CSS?.supports("reading-flow", "flex-visual") || CSS?.supports("reading-order", "1");
const detectCssReadingFlow = () => {
  const browserKind = getBrowserKind();
  const browserVersion = getBrowserVersion();
  const detectedSupport = supportsCssReadingFlow();
  let shouldSupportReadingFlow = false;
  switch (browserKind) {
    case BrowserKind.Chrome:
    case BrowserKind.Edge:
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
  return detectedSupport !== shouldSupportReadingFlow ? 1 : 0;
};
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
  getBrowserEngineKind();
  const browserVersion = getBrowserVersion();
  const browserKind = getBrowserKind();
  let shouldHaveFontSizeAdjust = false;
  switch (browserKind) {
    case BrowserKind.Chrome:
      if (browserVersion >= 127) {
        shouldHaveFontSizeAdjust = true;
      }
      break;
    case BrowserKind.Edge:
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
  const detectedSupport = supportsFontSizeAdjust();
  if (detectedSupport !== shouldHaveFontSizeAdjust) {
    return 1;
  }
  return 0;
};
const supportsOffsetPathShape = () => CSS?.supports("offset-path", "shape(from 0 0, line to 10px 10px)");
const detectOffsetPathShape = () => {
  const browserKind = getBrowserKind();
  const browserVersion = getBrowserVersion();
  const detectedSupport = supportsOffsetPathShape();
  let shouldSupportOffsetPathShape = true;
  switch (browserKind) {
    case BrowserKind.Chrome:
    case BrowserKind.Edge:
      if (browserVersion < 135) {
        shouldSupportOffsetPathShape = false;
      }
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
};
const supportsViewTransitionMatchElement = () => CSS?.supports("view-transition-name", "match-element");
const detectViewTransitionMatchElement = () => {
  const browserKind = getBrowserKind();
  const browserVersion = getBrowserVersion();
  const detectedSupport = supportsViewTransitionMatchElement();
  let shouldSupportViewTransition = true;
  switch (browserKind) {
    case BrowserKind.Chrome:
    case BrowserKind.Edge:
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
      if (browserVersion < 18) shouldSupportViewTransition = false;
      break;
    default:
      shouldSupportViewTransition = true;
      break;
  }
  return detectedSupport !== shouldSupportViewTransition ? 1 : 0;
};
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
const botScore = async () => {
  const syncDetectors = [];
  const asyncDetectors = [];
  for (const detector of detectors) {
    const testResult = detector();
    if (typeof testResult === "number") {
      syncDetectors.push(detector);
    } else {
      asyncDetectors.push(detector);
    }
  }
  const syncScores = syncDetectors.map((detector) => {
    const start = performance.now();
    const result = detector();
    const end = performance.now();
    console.log(
      `Sync detector ${detector.name} took ${(end - start).toFixed(2)} ms`
    );
    return result;
  });
  console.time("Time till idle callbacks scheduled");
  const asyncScores = await Promise.all(
    asyncDetectors.map((detector) => {
      return new Promise((resolve) => {
        if (typeof requestIdleCallback !== "undefined") {
          requestIdleCallback(async () => {
            console.timeEnd("Time till idle callbacks scheduled");
            const start = performance.now();
            try {
              const result = await detector();
              const end = performance.now();
              console.log(
                `Async detector ${detector.name} took ${(end - start).toFixed(2)} ms`
              );
              resolve(result);
            } catch (error) {
              console.warn(`Async detector ${detector.name} failed:`, error);
              resolve(0);
            }
          });
        } else {
          (async () => {
            const start = performance.now();
            try {
              const result = await detector();
              const end = performance.now();
              console.log(
                `Async detector ${detector.name} took ${(end - start).toFixed(2)} ms`
              );
              resolve(result);
            } catch (error) {
              console.warn(`Async detector ${detector.name} failed:`, error);
              resolve(0);
            }
          })();
        }
      });
    })
  );
  return [...syncScores, ...asyncScores];
};
async function encryptData(data) {
  const pub = (() => {
    const hex = "48573470485735475651604e506d465552514e49575149635734525e485734704857344f5051684e556f6875555131475e36707c65437074567e683749414e465151524355514254553442564b41424a5751684755366048553442565651423066433d4760433d515d3431405169497d51365d3452424e7667636b7e56363d4b49356f7d535c6b7367685e6f57374a7c65535d7e4a405e32656f5531567e52466035465e5e514a715150684c55356840526a685d5351687e665c557360425e7d657d3d7d673442346634524e57697c4d476f5e4a496f357260514a3661695e6550437c5260534a7e507e6841535c4e4e576e60716640684d50406c68566842325236744b4950687361435e574834526c487e424357426c5451505e6c53426730615052464b50454f6040685666573c7253513143556e6f304a344e4e5d6f7034675042496034425c506a4a51575c68684b4152725d6e523051404d356641704855686c56573552684b53687460697443524c605c505056425e4255345e73746b525274316741747c5d69316a55515136556a4e7d566f557d5d7e41344b514d7c6769685d566e526f5053706e49367c4c677e56545e51313050693434566968745069426e6043737350346f305d6e5e7e65426852476f7c5166526c695741743765404e3767513d7d55696c6a66367c4c55506031524377355e3468745e69737667406c47557e684e4b516c565035427c666a5e53667e5e315769354953697c6e6736684c60694a435734734f5635424e5641425655514d4f4857347048573542506f556351425247504168404d417042535734704857347047633939";
    let key = "";
    for (let i = 0; i < hex.length; i += 2) {
      key += String.fromCharCode(Number.parseInt(hex.substr(i, 2), 16) ^ 4);
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
  console.time("SimHash Computation Time");
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
  console.timeEnd("SimHash Computation Time");
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
    console.time("Override shadowRoot getter");
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
    console.timeEnd("Override shadowRoot getter");
  } catch (error) {
  }
};
const detect = async (env, randomProviderSelectorFn, container, restart, accountGenerator) => {
  let cleanupShadowDetection = () => {
  };
  let shadowDomInteractionDetected = false;
  if (container) {
    [cleanupShadowDetection, shadowDomInteractionDetected] = setupShadowDomDetection(container, restart);
  }
  const [scores, userAccount] = await Promise.all([
    botScore(),
    accountGenerator()
  ]);
  const shadowDomPenalty = shadowDomInteractionDetected ? 1 : 0;
  const noise = Math.random() * 0.3;
  const score = Math.min(
    scores.reduce((sum, value) => sum + value, 0) + noise + shadowDomPenalty,
    1
  );
  const webView = isWebView();
  const ifFrame = inIframe();
  let token;
  let encryptHeadHash;
  let provider;
  try {
    const [currentTime, scorePayload, providerSelectEntropy, headHash] = await generatePayload(
      score,
      userAccount.account.address,
      webView,
      ifFrame
    );
    provider = await randomProviderSelectorFn(env, providerSelectEntropy);
    token = await encryptData(
      JSON.stringify([currentTime, scorePayload, providerSelectEntropy])
    );
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
    userAccount
  };
};
export {
  detect as default
};
