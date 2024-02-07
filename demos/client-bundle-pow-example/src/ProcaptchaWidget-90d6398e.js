import { _ as _arrayWithHoles, a as _unsupportedIterableToArray, b as _nonIterableRest, r as reactExports, I as I18nContext, R as ReportNamespaces, g as getDefaults, c as _defineProperty, d as getI18n, i as i18n, l as lightTheme, e as darkTheme, j as jsx, f as jsxs, P as ProsopoDatasetError, h as at, k as css, m as React, M as Manager, L as LoadingSpinner } from "./index-765970ac.js";
function warn() {
  if (console && console.warn) {
    var _console;
    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }
    if (typeof args[0] === "string")
      args[0] = "react-i18next:: ".concat(args[0]);
    (_console = console).warn.apply(_console, args);
  }
}
var alreadyWarned = {};
function warnOnce() {
  for (var _len2 = arguments.length, args = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
    args[_key2] = arguments[_key2];
  }
  if (typeof args[0] === "string" && alreadyWarned[args[0]])
    return;
  if (typeof args[0] === "string")
    alreadyWarned[args[0]] = /* @__PURE__ */ new Date();
  warn.apply(void 0, args);
}
function loadNamespaces(i18n2, ns, cb) {
  i18n2.loadNamespaces(ns, function() {
    if (i18n2.isInitialized) {
      cb();
    } else {
      var initialized = function initialized2() {
        setTimeout(function() {
          i18n2.off("initialized", initialized2);
        }, 0);
        cb();
      };
      i18n2.on("initialized", initialized);
    }
  });
}
function oldI18nextHasLoadedNamespace(ns, i18n2) {
  var options = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {};
  var lng = i18n2.languages[0];
  var fallbackLng = i18n2.options ? i18n2.options.fallbackLng : false;
  var lastLng = i18n2.languages[i18n2.languages.length - 1];
  if (lng.toLowerCase() === "cimode")
    return true;
  var loadNotPending = function loadNotPending2(l, n) {
    var loadState = i18n2.services.backendConnector.state["".concat(l, "|").concat(n)];
    return loadState === -1 || loadState === 2;
  };
  if (options.bindI18n && options.bindI18n.indexOf("languageChanging") > -1 && i18n2.services.backendConnector.backend && i18n2.isLanguageChangingTo && !loadNotPending(i18n2.isLanguageChangingTo, ns))
    return false;
  if (i18n2.hasResourceBundle(lng, ns))
    return true;
  if (!i18n2.services.backendConnector.backend || i18n2.options.resources && !i18n2.options.partialBundledLanguages)
    return true;
  if (loadNotPending(lng, ns) && (!fallbackLng || loadNotPending(lastLng, ns)))
    return true;
  return false;
}
function hasLoadedNamespace(ns, i18n2) {
  var options = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {};
  if (!i18n2.languages || !i18n2.languages.length) {
    warnOnce("i18n.languages were undefined or empty", i18n2.languages);
    return true;
  }
  var isNewerI18next = i18n2.options.ignoreJSONStructure !== void 0;
  if (!isNewerI18next) {
    return oldI18nextHasLoadedNamespace(ns, i18n2, options);
  }
  return i18n2.hasLoadedNamespace(ns, {
    precheck: function precheck(i18nInstance, loadNotPending) {
      if (options.bindI18n && options.bindI18n.indexOf("languageChanging") > -1 && i18nInstance.services.backendConnector.backend && i18nInstance.isLanguageChangingTo && !loadNotPending(i18nInstance.isLanguageChangingTo, ns))
        return false;
    }
  });
}
function _iterableToArrayLimit(r, l) {
  var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"];
  if (null != t) {
    var e, n, i, u, a = [], f = true, o = false;
    try {
      if (i = (t = t.call(r)).next, 0 === l) {
        if (Object(t) !== t)
          return;
        f = false;
      } else
        for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = true)
          ;
    } catch (r2) {
      o = true, n = r2;
    } finally {
      try {
        if (!f && null != t["return"] && (u = t["return"](), Object(u) !== u))
          return;
      } finally {
        if (o)
          throw n;
      }
    }
    return a;
  }
}
function _slicedToArray(arr, i) {
  return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest();
}
function ownKeys(object, enumerableOnly) {
  var keys = Object.keys(object);
  if (Object.getOwnPropertySymbols) {
    var symbols = Object.getOwnPropertySymbols(object);
    if (enumerableOnly) {
      symbols = symbols.filter(function(sym) {
        return Object.getOwnPropertyDescriptor(object, sym).enumerable;
      });
    }
    keys.push.apply(keys, symbols);
  }
  return keys;
}
function _objectSpread(target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i] != null ? arguments[i] : {};
    if (i % 2) {
      ownKeys(Object(source), true).forEach(function(key) {
        _defineProperty(target, key, source[key]);
      });
    } else if (Object.getOwnPropertyDescriptors) {
      Object.defineProperties(target, Object.getOwnPropertyDescriptors(source));
    } else {
      ownKeys(Object(source)).forEach(function(key) {
        Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
      });
    }
  }
  return target;
}
var usePrevious = function usePrevious2(value, ignore) {
  var ref = reactExports.useRef();
  reactExports.useEffect(function() {
    ref.current = ignore ? ref.current : value;
  }, [value, ignore]);
  return ref.current;
};
function useTranslation$1(ns) {
  var props = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
  var i18nFromProps = props.i18n;
  var _ref = reactExports.useContext(I18nContext) || {}, i18nFromContext = _ref.i18n, defaultNSFromContext = _ref.defaultNS;
  var i18n2 = i18nFromProps || i18nFromContext || getI18n();
  if (i18n2 && !i18n2.reportNamespaces)
    i18n2.reportNamespaces = new ReportNamespaces();
  if (!i18n2) {
    warnOnce("You will need to pass in an i18next instance by using initReactI18next");
    var notReadyT = function notReadyT2(k) {
      return Array.isArray(k) ? k[k.length - 1] : k;
    };
    var retNotReady = [notReadyT, {}, false];
    retNotReady.t = notReadyT;
    retNotReady.i18n = {};
    retNotReady.ready = false;
    return retNotReady;
  }
  if (i18n2.options.react && i18n2.options.react.wait !== void 0)
    warnOnce("It seems you are still using the old wait option, you may migrate to the new useSuspense behaviour.");
  var i18nOptions = _objectSpread(_objectSpread(_objectSpread({}, getDefaults()), i18n2.options.react), props);
  var useSuspense = i18nOptions.useSuspense, keyPrefix = i18nOptions.keyPrefix;
  var namespaces = ns || defaultNSFromContext || i18n2.options && i18n2.options.defaultNS;
  namespaces = typeof namespaces === "string" ? [namespaces] : namespaces || ["translation"];
  if (i18n2.reportNamespaces.addUsedNamespaces)
    i18n2.reportNamespaces.addUsedNamespaces(namespaces);
  var ready = (i18n2.isInitialized || i18n2.initializedStoreOnce) && namespaces.every(function(n) {
    return hasLoadedNamespace(n, i18n2, i18nOptions);
  });
  function getT() {
    return i18n2.getFixedT(null, i18nOptions.nsMode === "fallback" ? namespaces : namespaces[0], keyPrefix);
  }
  var _useState = reactExports.useState(getT), _useState2 = _slicedToArray(_useState, 2), t = _useState2[0], setT = _useState2[1];
  var joinedNS = namespaces.join();
  var previousJoinedNS = usePrevious(joinedNS);
  var isMounted = reactExports.useRef(true);
  reactExports.useEffect(function() {
    var bindI18n = i18nOptions.bindI18n, bindI18nStore = i18nOptions.bindI18nStore;
    isMounted.current = true;
    if (!ready && !useSuspense) {
      loadNamespaces(i18n2, namespaces, function() {
        if (isMounted.current)
          setT(getT);
      });
    }
    if (ready && previousJoinedNS && previousJoinedNS !== joinedNS && isMounted.current) {
      setT(getT);
    }
    function boundReset() {
      if (isMounted.current)
        setT(getT);
    }
    if (bindI18n && i18n2)
      i18n2.on(bindI18n, boundReset);
    if (bindI18nStore && i18n2)
      i18n2.store.on(bindI18nStore, boundReset);
    return function() {
      isMounted.current = false;
      if (bindI18n && i18n2)
        bindI18n.split(" ").forEach(function(e) {
          return i18n2.off(e, boundReset);
        });
      if (bindI18nStore && i18n2)
        bindI18nStore.split(" ").forEach(function(e) {
          return i18n2.store.off(e, boundReset);
        });
    };
  }, [i18n2, joinedNS]);
  var isInitial = reactExports.useRef(true);
  reactExports.useEffect(function() {
    if (isMounted.current && !isInitial.current) {
      setT(getT);
    }
    isInitial.current = false;
  }, [i18n2, keyPrefix]);
  var ret = [t, i18n2, ready];
  ret.t = t;
  ret.i18n = i18n2;
  ret.ready = ready;
  if (ready)
    return ret;
  if (!ready && !useSuspense)
    return ret;
  throw new Promise(function(resolve) {
    loadNamespaces(i18n2, namespaces, function() {
      resolve();
    });
  });
}
function useTranslation(options) {
  return useTranslation$1("translation", { i18n, ...options });
}
const COLLECTOR_LIMIT = 1e3;
const storeLog = (event, setEvents) => {
  setEvents((currentEvents) => {
    let newEvents = [...currentEvents, event];
    if (newEvents.length > COLLECTOR_LIMIT) {
      newEvents = newEvents.slice(1);
    }
    return newEvents;
  });
};
const logMouseEvent = (event, setMouseEvent) => {
  const storedEvent = {
    x: event.x,
    y: event.y,
    timestamp: event.timeStamp
  };
  storeLog(storedEvent, setMouseEvent);
};
const logKeyboardEvent = (event, setKeyboardEvent) => {
  const storedEvent = {
    key: event.key,
    timestamp: event.timeStamp,
    isShiftKey: event.shiftKey,
    isCtrlKey: event.ctrlKey
  };
  storeLog(storedEvent, setKeyboardEvent);
};
const logTouchEvent = (event, setTouchEvent) => {
  for (let i = 0; i < event.touches.length; i++) {
    const touch = event.touches[i];
    if (!touch) {
      continue;
    }
    storeLog({ x: touch.clientX, y: touch.clientY, timestamp: event.timeStamp }, setTouchEvent);
  }
};
const startCollector = (setStoredMouseEvents, setStoredTouchEvents, setStoredKeyboardEvents, rootElement) => {
  const form = findContainingForm(rootElement);
  if (form) {
    form.addEventListener("mousemove", (e) => logMouseEvent(e, setStoredMouseEvents));
    form.addEventListener("keydown", (e) => logKeyboardEvent(e, setStoredKeyboardEvents));
    form.addEventListener("keyup", (e) => logKeyboardEvent(e, setStoredKeyboardEvents));
    form.addEventListener("touchstart", (e) => logTouchEvent(e, setStoredTouchEvents));
    form.addEventListener("touchend", (e) => logTouchEvent(e, setStoredTouchEvents));
    form.addEventListener("touchcancel", (e) => logTouchEvent(e, setStoredTouchEvents));
    form.addEventListener("touchmove", (e) => logTouchEvent(e, setStoredTouchEvents));
  }
};
const findContainingForm = (element) => {
  if (element.tagName === "FORM") {
    return element;
  }
  if (element.parentElement) {
    return findContainingForm(element.parentElement);
  }
  return null;
};
const getHash = (item) => {
  if (!item.hash) {
    throw new ProsopoDatasetError("CAPTCHA.MISSING_ITEM_HASH", { context: { item } });
  }
  return item.hash;
};
const CaptchaWidget = ({ challenge, solution, onClick, themeColor }) => {
  const items = challenge.captcha.items;
  const theme = reactExports.useMemo(() => themeColor === "light" ? lightTheme : darkTheme, [themeColor]);
  const isTouchDevice = "ontouchstart" in window;
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
    return jsx("div", { style: {
      paddingTop: "4px",
      paddingLeft: "4px",
      flexGrow: 1,
      flexBasis: "33.3333%",
      boxSizing: "border-box"
    }, children: jsxs("div", { style: { cursor: "pointer", height: "100%", width: "100%" }, onClick: isTouchDevice ? void 0 : () => onClick(hash), onTouchStart: isTouchDevice ? () => onClick(hash) : void 0, children: [jsx("div", { style: { border: 1, borderColor: theme.palette.grey[300] }, children: jsx("img", { style: {
      width: "100%",
      backgroundColor: theme.palette.grey[300],
      opacity: solution.includes(hash) && isTouchDevice ? "50%" : "100%",
      display: "block",
      objectFit: "contain",
      aspectRatio: "1/1"
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
    }, focusable: "false", color: "#fff", "aria-hidden": "true", viewBox: "0 0 24 24", "data-testid": "CheckIcon", children: jsx("path", { d: "M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" }) }) }) })] }) }, index);
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
    const baseStyle2 = {
      ...buttonStyleBase,
      color: hover ? theme.palette.primary.contrastText : theme.palette.background.contrastText
    };
    if (buttonType === "cancel") {
      return {
        ...baseStyle2,
        backgroundColor: hover ? theme.palette.grey[600] : "transparent"
      };
    } else {
      return {
        ...baseStyle2,
        backgroundColor: hover ? theme.palette.primary.main : theme.palette.background.default
      };
    }
  }, [buttonType, hover, theme]);
  return jsx("button", { ...addDataAttr({ dev: { cy: `button-${buttonType}` } }), onMouseEnter: () => setHover(true), onMouseLeave: () => setHover(false), style: buttonStyle, onClick: (e) => {
    e.preventDefault();
    onClick();
  }, children: text });
};
const Button$1 = Button;
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
    flexDirection: "column"
  }, children: jsxs("div", { style: {
    backgroundColor: theme.palette.background.default,
    display: "flex",
    flexDirection: "column",
    minWidth: "300px"
  }, children: [jsxs("div", { style: {
    display: "flex",
    alignItems: "center",
    width: "100%",
    backgroundColor: theme.palette.primary.main,
    padding: "24px 16px"
  }, children: [jsxs("p", { style: {
    color: "#ffffff",
    fontWeight: 700,
    lineHeight: 1.5
  }, children: [t("WIDGET.SELECT_ALL"), ": "] }), jsx("p", { style: {
    color: "#ffffff",
    fontWeight: 700,
    textTransform: "capitalize",
    lineHeight: 1.5
  }, children: `${at(challenge.captchas, index).captcha.target}` })] }), jsx("div", { ...addDataAttr({ dev: { cy: "captcha-" + index } }), children: captcha && jsx(CaptchaWidget, { challenge: captcha, solution, onClick, themeColor }) }), jsx("div", { style: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%"
  }, ...addDataAttr({ dev: { cy: "dots-captcha" } }) }), jsx("div", { style: {
    padding: "8px 16px",
    display: "flex",
    width: "100%"
  } }), jsxs("div", { style: {
    padding: "0 16px 16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    lineHeight: 1.75
  }, children: [jsx(Button$1, { themeColor, buttonType: "cancel", onClick: onCancel, text: t("WIDGET.CANCEL") }), jsx(Button$1, { themeColor, buttonType: "next", text: index < challenge.captchas.length - 1 ? t("WIDGET.NEXT") : t("WIDGET.SUBMIT"), onClick: index < challenge.captchas.length - 1 ? onNext : onSubmit })] })] }) }) });
};
const CaptchaComponent$1 = CaptchaComponent;
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
const Collector = ({ onProcessData, sendData }) => {
  const [mouseEvents, setStoredMouseEvents] = reactExports.useState([]);
  const [touchEvents, setStoredTouchEvents] = reactExports.useState([]);
  const [keyboardEvents, setStoredKeyboardEvents] = reactExports.useState([]);
  const ref = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (ref && ref.current) {
      startCollector(setStoredMouseEvents, setStoredTouchEvents, setStoredKeyboardEvents, ref.current);
    }
  }, []);
  reactExports.useEffect(() => {
    const userEvents = {
      mouseEvents,
      touchEvents,
      keyboardEvents
    };
    onProcessData(userEvents);
  }, [sendData]);
  return jsx("div", { ref });
};
const Collector$1 = Collector;
const ModalComponent = React.memo((props, nextProps) => {
  const { show, children } = props;
  console.log("rendering modal with show: ", show);
  const display = show ? "flex" : "none";
  const ModalOuterDivCss = {
    overflow: "auto",
    width: "100%",
    maxHeight: "100%",
    position: "fixed",
    top: "0",
    left: "0",
    height: "100%",
    background: "rgba(0, 0, 0, 0.6)",
    zIndex: "2147483646",
    transition: "all 0.5s",
    display
  };
  const ModalInnerDivCSS = {
    maxWidth: "500px",
    margin: "auto",
    position: "fixed",
    background: "white",
    height: "auto",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    zIndex: "2147483647",
    transition: "all 0.5s"
  };
  return jsx("div", { style: ModalOuterDivCss, children: jsx("div", { style: ModalInnerDivCSS, children }) });
});
const Modal = ModalComponent;
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
const useRefAsState = (defaultValue) => {
  const ref = reactExports.useRef(defaultValue);
  const setter = (value2) => {
    ref.current = value2;
  };
  const value = ref.current;
  return [value, setter];
};
const useProcaptcha = () => {
  const [isHuman, setIsHuman] = reactExports.useState(false);
  const [index, setIndex] = reactExports.useState(0);
  const [solutions, setSolutions] = reactExports.useState([]);
  const [captchaApi, setCaptchaApi] = useRefAsState(void 0);
  const [showModal, setShowModal] = reactExports.useState(false);
  const [challenge, setChallenge] = reactExports.useState(void 0);
  const [loading, setLoading] = reactExports.useState(false);
  const [account, setAccount] = reactExports.useState(void 0);
  const [dappAccount, setDappAccount] = reactExports.useState(void 0);
  const [submission, setSubmission] = useRefAsState(void 0);
  const [timeout, setTimeout2] = useRefAsState(void 0);
  const [blockNumber, setBlockNumber] = useRefAsState(void 0);
  const [successfullChallengeTimeout, setSuccessfullChallengeTimeout] = useRefAsState(void 0);
  const [sendData, setSendData] = reactExports.useState(false);
  return [
    {
      isHuman,
      index,
      solutions,
      captchaApi,
      showModal,
      challenge,
      loading,
      account,
      dappAccount,
      submission,
      timeout,
      blockNumber,
      successfullChallengeTimeout,
      sendData
    },
    (nextState) => {
      if (nextState.account !== void 0)
        setAccount(nextState.account);
      if (nextState.isHuman !== void 0)
        setIsHuman(nextState.isHuman);
      if (nextState.index !== void 0)
        setIndex(nextState.index);
      if (nextState.solutions !== void 0)
        setSolutions(nextState.solutions.slice());
      if (nextState.captchaApi !== void 0)
        setCaptchaApi(nextState.captchaApi);
      if (nextState.showModal !== void 0)
        setShowModal(nextState.showModal);
      if (nextState.challenge !== void 0)
        setChallenge(nextState.challenge);
      if (nextState.loading !== void 0)
        setLoading(nextState.loading);
      if (nextState.showModal !== void 0)
        setShowModal(nextState.showModal);
      if (nextState.dappAccount !== void 0)
        setDappAccount(nextState.dappAccount);
      if (nextState.submission !== void 0)
        setSubmission(nextState.submission);
      if (nextState.timeout !== void 0)
        setTimeout2(nextState.timeout);
      if (nextState.successfullChallengeTimeout !== void 0)
        setSuccessfullChallengeTimeout(nextState.timeout);
      if (nextState.blockNumber !== void 0)
        setBlockNumber(nextState.blockNumber);
      if (nextState.sendData !== void 0)
        setSendData(nextState.sendData);
    }
  ];
};
const ProcaptchaWidget = (props) => {
  console.log("config", props.config);
  const config = props.config;
  const callbacks = props.callbacks || {};
  const [state, updateState] = useProcaptcha();
  console.log("state", state);
  const manager = Manager(config, state, updateState, callbacks);
  const styleWidth = { maxWidth: "400px", minWidth: "200px", margin: "8px" };
  const themeColor = props.config.theme === "light" ? "light" : "dark";
  const theme = reactExports.useMemo(() => props.config.theme === "light" ? lightTheme : darkTheme, [props.config.theme]);
  console.log("theme", theme);
  console.log("showModal", state.showModal);
  return jsxs("div", { children: [jsxs("div", { style: { maxWidth: "100%", maxHeight: "100%", overflowX: "auto" }, children: [jsx(Modal, { show: state.showModal, children: state.challenge ? jsx(CaptchaComponent$1, { challenge: state.challenge, index: state.index, solutions: state.solutions, onSubmit: manager.submit, onCancel: manager.cancel, onClick: manager.select, onNext: manager.nextRound, themeColor: config.theme ?? "light" }) : jsx("div", { children: "No challenge set." }) }), jsxs("div", { style: styleWidth, "data-cy": "button-human", children: [" ", jsxs("div", { style: {
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
  }, children: [jsxs("div", { style: {
    height: "50px",
    width: "50px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
    verticalAlign: "middle"
  }, children: [jsx("div", { style: {
    display: !state.loading ? "flex" : "none"
  }, children: jsx(Checkbox$1, { themeColor, onChange: manager.start, checked: state.isHuman }) }), jsx("div", { style: {
    display: state.loading ? "flex" : "none"
  }, children: jsx("div", { style: { flex: 1 }, children: jsx(LoadingSpinner, { themeColor }) }) })] }), jsx("div", { style: { padding: 1 }, children: jsx("span", { style: { color: theme.palette.background.contrastText, paddingLeft: "4px" }, children: "I am a human" }) })] }) }), jsx("div", { children: jsx("a", { href: "https://www.prosopo.io/#features?ref=accounts.prosopo.io&utm_campaign=widget&utm_medium=checkbox", target: "_blank", "aria-label": "Visit prosopo.io to learn more about the service and its accessibility options.", children: jsx("div", { children: jsxs("div", { children: [jsx("div", { css: logoStyle, dangerouslySetInnerHTML: {
    __html: props.config.theme === "light" ? logoWithoutTextBlack : logoWithoutTextWhite
  } }), jsx("div", { css: logoStyle, dangerouslySetInnerHTML: {
    __html: props.config.theme === "light" ? logoWithTextBlack : logoWithTextWhite
  } })] }) }) }) })] })] })] }), config.devOnlyWatchEvents && jsx(Collector$1, { onProcessData: manager.exportData, sendData: state.showModal })] });
};
const logoWithTextBlack = '<svg id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2062.63 468.67" height="35px" width="140px"><defs><style>.cls-1{fill:#1d1d1b;}</style></defs><title>Prosopo Logo Black</title><path class="cls-1" d="M335.55,1825.19A147.75,147.75,0,0,1,483.3,1972.94h50.5c0-109.49-88.76-198.25-198.25-198.25v50.5Z" transform="translate(-215.73 -1774.69)"/><path class="cls-1" d="M269.36,1891.39A147.74,147.74,0,0,1,417.1,2039.13h50.5c0-109.49-88.75-198.24-198.24-198.24v50.5Z" transform="translate(-215.73 -1774.69)"/><path class="cls-1" d="M414,2157.17a147.75,147.75,0,0,1-147.74-147.74h-50.5c0,109.49,88.75,198.24,198.24,198.24v-50.5Z" transform="translate(-215.73 -1774.69)"/><path class="cls-1" d="M480.17,2091a147.74,147.74,0,0,1-147.74-147.75H281.92c0,109.49,88.76,198.25,198.25,198.25V2091Z" transform="translate(-215.73 -1774.69)"/><path class="cls-1" d="M862.8,2017.5q-27.39,22.86-78.25,22.86h-65v112.19H654.82v-312h134q46.32,0,73.86,24.13t27.55,74.72Q890.2,1994.64,862.8,2017.5ZM813,1905.1q-12.37-10.36-34.7-10.38H719.59v91.87h58.75q22.32,0,34.7-11.22t12.39-35.56Q825.43,1915.48,813,1905.1Z" transform="translate(-215.73 -1774.69)"/><path class="cls-1" d="M1045.69,1916.42c.78.08,2.51.19,5.19.32v61.81c-3.81-.42-7.2-.71-10.16-.85s-5.36-.21-7.2-.21q-36.4,0-48.89,23.71-7,13.33-7,41.06v110.29H916.89V1921.82h57.58V1962q14-23.07,24.34-31.54,16.94-14.18,44-14.18C1044,1916.32,1044.92,1916.35,1045.69,1916.42Z" transform="translate(-215.73 -1774.69)"/><path class="cls-1" d="M1265.64,2124.32q-29.21,36.06-88.69,36.06t-88.69-36.06Q1059,2088.26,1059,2037.5q0-49.9,29.22-86.5t88.69-36.59q59.47,0,88.69,36.59t29.21,86.5Q1294.85,2088.26,1265.64,2124.32ZM1217.38,2091q14.17-18.81,14.18-53.48t-14.18-53.37q-14.19-18.7-40.64-18.71T1136,1984.13q-14.29,18.72-14.29,53.37T1136,2091q14.28,18.81,40.75,18.81T1217.38,2091Z" transform="translate(-215.73 -1774.69)"/><path class="cls-1" d="M1371.81,2078.88q1.92,16.1,8.29,22.87,11.28,12.06,41.7,12.06,17.85,0,28.39-5.29t10.53-15.88a17.12,17.12,0,0,0-8.48-15.45q-8.49-5.28-63.12-18.2-39.33-9.73-55.41-24.35-16.08-14.39-16.09-41.49,0-32,25.14-54.93t70.75-23q43.26,0,70.53,17.25t31.29,59.59H1455q-1.27-11.64-6.58-18.42-10-12.27-34-12.28-19.74,0-28.13,6.14t-8.38,14.4c0,6.91,3,11.93,8.92,15q8.89,4.89,63,16.73,36,8.46,54.05,25.61,17.77,17.35,17.78,43.39,0,34.3-25.56,56t-79,21.7q-54.51,0-80.49-23t-26-58.53Z" transform="translate(-215.73 -1774.69)"/><path class="cls-1" d="M1745.54,2124.32q-29.22,36.06-88.7,36.06t-88.69-36.06q-29.2-36.06-29.21-86.82,0-49.9,29.21-86.5t88.69-36.59q59.49,0,88.7,36.59t29.21,86.5Q1774.75,2088.26,1745.54,2124.32ZM1697.27,2091q14.19-18.81,14.19-53.48t-14.19-53.37q-14.18-18.7-40.64-18.71t-40.75,18.71q-14.28,18.72-14.28,53.37t14.28,53.48q14.3,18.81,40.75,18.81T1697.27,2091Z" transform="translate(-215.73 -1774.69)"/><path class="cls-1" d="M1992.75,1946.59q28.24,29.84,28.23,87.63,0,61-27.58,92.93t-71.06,32q-27.69,0-46-13.76-10-7.62-19.6-22.23v120.24H1797V1921.82h57.79v34.08q9.79-15,20.88-23.71,20.23-15.43,48.15-15.45Q1964.53,1916.74,1992.75,1946.59Zm-46.3,43.39q-12.3-20.52-39.88-20.53-33.15,0-45.54,31.11-6.43,16.51-6.42,41.92,0,40.21,21.58,56.51,12.82,9.53,30.37,9.53,25.45,0,38.83-19.48t13.36-51.86Q1958.75,2010.51,1946.45,1990Z" transform="translate(-215.73 -1774.69)"/><path class="cls-1" d="M2249.14,2124.32q-29.2,36.06-88.69,36.06t-88.69-36.06q-29.22-36.06-29.21-86.82,0-49.9,29.21-86.5t88.69-36.59q59.49,0,88.69,36.59t29.22,86.5Q2278.36,2088.26,2249.14,2124.32ZM2200.88,2091q14.19-18.81,14.18-53.48t-14.18-53.37q-14.18-18.7-40.64-18.71t-40.75,18.71q-14.28,18.72-14.29,53.37t14.29,53.48q14.3,18.81,40.75,18.81T2200.88,2091Z" transform="translate(-215.73 -1774.69)"/></svg>';
const logoWithTextWhite = '<svg id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2062.63 468.67" height="35px" width="140px"><defs><style>.cls-1{fill:#fff;}</style></defs><title>Prosopo Logo Black</title><path class="cls-1" d="M335.55,1825.19A147.75,147.75,0,0,1,483.3,1972.94h50.5c0-109.49-88.76-198.25-198.25-198.25v50.5Z" transform="translate(-215.73 -1774.69)"/><path class="cls-1" d="M269.36,1891.39A147.74,147.74,0,0,1,417.1,2039.13h50.5c0-109.49-88.75-198.24-198.24-198.24v50.5Z" transform="translate(-215.73 -1774.69)"/><path class="cls-1" d="M414,2157.17a147.75,147.75,0,0,1-147.74-147.74h-50.5c0,109.49,88.75,198.24,198.24,198.24v-50.5Z" transform="translate(-215.73 -1774.69)"/><path class="cls-1" d="M480.17,2091a147.74,147.74,0,0,1-147.74-147.75H281.92c0,109.49,88.76,198.25,198.25,198.25V2091Z" transform="translate(-215.73 -1774.69)"/><path class="cls-1" d="M862.8,2017.5q-27.39,22.86-78.25,22.86h-65v112.19H654.82v-312h134q46.32,0,73.86,24.13t27.55,74.72Q890.2,1994.64,862.8,2017.5ZM813,1905.1q-12.37-10.36-34.7-10.38H719.59v91.87h58.75q22.32,0,34.7-11.22t12.39-35.56Q825.43,1915.48,813,1905.1Z" transform="translate(-215.73 -1774.69)"/><path class="cls-1" d="M1045.69,1916.42c.78.08,2.51.19,5.19.32v61.81c-3.81-.42-7.2-.71-10.16-.85s-5.36-.21-7.2-.21q-36.4,0-48.89,23.71-7,13.33-7,41.06v110.29H916.89V1921.82h57.58V1962q14-23.07,24.34-31.54,16.94-14.18,44-14.18C1044,1916.32,1044.92,1916.35,1045.69,1916.42Z" transform="translate(-215.73 -1774.69)"/><path class="cls-1" d="M1265.64,2124.32q-29.21,36.06-88.69,36.06t-88.69-36.06Q1059,2088.26,1059,2037.5q0-49.9,29.22-86.5t88.69-36.59q59.47,0,88.69,36.59t29.21,86.5Q1294.85,2088.26,1265.64,2124.32ZM1217.38,2091q14.17-18.81,14.18-53.48t-14.18-53.37q-14.19-18.7-40.64-18.71T1136,1984.13q-14.29,18.72-14.29,53.37T1136,2091q14.28,18.81,40.75,18.81T1217.38,2091Z" transform="translate(-215.73 -1774.69)"/><path class="cls-1" d="M1371.81,2078.88q1.92,16.1,8.29,22.87,11.28,12.06,41.7,12.06,17.85,0,28.39-5.29t10.53-15.88a17.12,17.12,0,0,0-8.48-15.45q-8.49-5.28-63.12-18.2-39.33-9.73-55.41-24.35-16.08-14.39-16.09-41.49,0-32,25.14-54.93t70.75-23q43.26,0,70.53,17.25t31.29,59.59H1455q-1.27-11.64-6.58-18.42-10-12.27-34-12.28-19.74,0-28.13,6.14t-8.38,14.4c0,6.91,3,11.93,8.92,15q8.89,4.89,63,16.73,36,8.46,54.05,25.61,17.77,17.35,17.78,43.39,0,34.3-25.56,56t-79,21.7q-54.51,0-80.49-23t-26-58.53Z" transform="translate(-215.73 -1774.69)"/><path class="cls-1" d="M1745.54,2124.32q-29.22,36.06-88.7,36.06t-88.69-36.06q-29.2-36.06-29.21-86.82,0-49.9,29.21-86.5t88.69-36.59q59.49,0,88.7,36.59t29.21,86.5Q1774.75,2088.26,1745.54,2124.32ZM1697.27,2091q14.19-18.81,14.19-53.48t-14.19-53.37q-14.18-18.7-40.64-18.71t-40.75,18.71q-14.28,18.72-14.28,53.37t14.28,53.48q14.3,18.81,40.75,18.81T1697.27,2091Z" transform="translate(-215.73 -1774.69)"/><path class="cls-1" d="M1992.75,1946.59q28.24,29.84,28.23,87.63,0,61-27.58,92.93t-71.06,32q-27.69,0-46-13.76-10-7.62-19.6-22.23v120.24H1797V1921.82h57.79v34.08q9.79-15,20.88-23.71,20.23-15.43,48.15-15.45Q1964.53,1916.74,1992.75,1946.59Zm-46.3,43.39q-12.3-20.52-39.88-20.53-33.15,0-45.54,31.11-6.43,16.51-6.42,41.92,0,40.21,21.58,56.51,12.82,9.53,30.37,9.53,25.45,0,38.83-19.48t13.36-51.86Q1958.75,2010.51,1946.45,1990Z" transform="translate(-215.73 -1774.69)"/><path class="cls-1" d="M2249.14,2124.32q-29.2,36.06-88.69,36.06t-88.69-36.06q-29.22-36.06-29.21-86.82,0-49.9,29.21-86.5t88.69-36.59q59.49,0,88.69,36.59t29.22,86.5Q2278.36,2088.26,2249.14,2124.32ZM2200.88,2091q14.19-18.81,14.18-53.48t-14.18-53.37q-14.18-18.7-40.64-18.71t-40.75,18.71q-14.28,18.72-14.29,53.37t14.29,53.48q14.3,18.81,40.75,18.81T2200.88,2091Z" transform="translate(-215.73 -1774.69)"/></svg>';
const logoWithoutTextWhite = '<svg id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 348" height="35px"><path id="Vector" d="M95.7053 40.2707C127.005 40.2707 157.022 52.6841 179.154 74.78C201.286 96.8759 213.719 126.844 213.719 158.093H254.056C254.056 70.7808 183.16 -4.57764e-05 95.7053 -4.57764e-05V40.2707Z" fill="#fff"/><path id="Vector_2" d="M42.8365 93.0614C58.3333 93.0614 73.6784 96.1087 87.9955 102.029C102.313 107.95 115.322 116.628 126.279 127.568C137.237 138.508 145.93 151.496 151.86 165.79C157.79 180.084 160.843 195.404 160.843 210.875H201.179C201.179 123.564 130.291 52.7906 42.8365 52.7906V93.0614Z" fill="#fff"/><path id="Vector_3" d="M158.367 305.005C127.07 305.003 97.056 292.59 74.926 270.496C52.796 248.402 40.3626 218.437 40.3604 187.191H0.0239563C0.0239563 274.503 70.9123 345.276 158.367 345.276V305.005Z" fill="#fff"/><path id="Vector_4" d="M211.219 252.239C195.722 252.239 180.376 249.191 166.059 243.27C151.741 237.349 138.732 228.67 127.774 217.729C116.816 206.788 108.123 193.799 102.194 179.505C96.2637 165.21 93.2121 149.889 93.2132 134.417H52.8687C52.8687 221.729 123.765 292.509 211.219 292.509V252.239Z" fill="#fff"/></g><defs><clipPath id="clip0_1_2"><rect width="254" height="345" fill="white"/></clipPath></defs></svg>';
const logoWithoutTextBlack = '<svg id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 348" height="35px"><path id="Vector" d="M95.7053 40.2707C127.005 40.2707 157.022 52.6841 179.154 74.78C201.286 96.8759 213.719 126.844 213.719 158.093H254.056C254.056 70.7808 183.16 -4.57764e-05 95.7053 -4.57764e-05V40.2707Z" fill="#000000"/><path id="Vector_2" d="M42.8365 93.0614C58.3333 93.0614 73.6784 96.1087 87.9955 102.029C102.313 107.95 115.322 116.628 126.279 127.568C137.237 138.508 145.93 151.496 151.86 165.79C157.79 180.084 160.843 195.404 160.843 210.875H201.179C201.179 123.564 130.291 52.7906 42.8365 52.7906V93.0614Z" fill="#000000"/><path id="Vector_3" d="M158.367 305.005C127.07 305.003 97.056 292.59 74.926 270.496C52.796 248.402 40.3626 218.437 40.3604 187.191H0.0239563C0.0239563 274.503 70.9123 345.276 158.367 345.276V305.005Z" fill="#000000"/><path id="Vector_4" d="M211.219 252.239C195.722 252.239 180.376 249.191 166.059 243.27C151.741 237.349 138.732 228.67 127.774 217.729C116.816 206.788 108.123 193.799 102.194 179.505C96.2637 165.21 93.2121 149.889 93.2132 134.417H52.8687C52.8687 221.729 123.765 292.509 211.219 292.509V252.239Z" fill="#000000"/></g><defs><clipPath id="clip0_1_2"><rect width="254" height="345" fill="white"/></clipPath></defs></svg>';
export {
  ProcaptchaWidget as default
};
