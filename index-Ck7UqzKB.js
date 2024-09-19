function xp(e, t) {
  for (var n = 0; n < t.length; n++) {
    const r = t[n];
    if (typeof r != "string" && !Array.isArray(r)) {
      for (const o in r)
        if (o !== "default" && !(o in e)) {
          const a = Object.getOwnPropertyDescriptor(r, o);
          a && Object.defineProperty(e, o, a.get ? a : {
            enumerable: !0,
            get: () => r[o]
          });
        }
    }
  }
  return Object.freeze(Object.defineProperty(e, Symbol.toStringTag, { value: "Module" }));
}
var yi = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {};
function gp(e) {
  return e && e.__esModule && Object.prototype.hasOwnProperty.call(e, "default") ? e.default : e;
}
var vp = { exports: {} }, Ns = {}, yp = { exports: {} }, Q = {};
var Ha = Symbol.for("react.element"), Eg = Symbol.for("react.portal"), Cg = Symbol.for("react.fragment"), Tg = Symbol.for("react.strict_mode"), Og = Symbol.for("react.profiler"), Ng = Symbol.for("react.provider"), Ig = Symbol.for("react.context"), Lg = Symbol.for("react.forward_ref"), Ag = Symbol.for("react.suspense"), Rg = Symbol.for("react.memo"), Pg = Symbol.for("react.lazy"), Vd = Symbol.iterator;
function Dg(e) {
  return e === null || typeof e != "object" ? null : (e = Vd && e[Vd] || e["@@iterator"], typeof e == "function" ? e : null);
}
var wp = { isMounted: function() {
  return !1;
}, enqueueForceUpdate: function() {
}, enqueueReplaceState: function() {
}, enqueueSetState: function() {
} }, bp = Object.assign, _p = {};
function _o(e, t, n) {
  this.props = e, this.context = t, this.refs = _p, this.updater = n || wp;
}
_o.prototype.isReactComponent = {};
_o.prototype.setState = function(e, t) {
  if (typeof e != "object" && typeof e != "function" && e != null) throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");
  this.updater.enqueueSetState(this, e, t, "setState");
};
_o.prototype.forceUpdate = function(e) {
  this.updater.enqueueForceUpdate(this, e, "forceUpdate");
};
function Sp() {
}
Sp.prototype = _o.prototype;
function _c(e, t, n) {
  this.props = e, this.context = t, this.refs = _p, this.updater = n || wp;
}
var Sc = _c.prototype = new Sp();
Sc.constructor = _c;
bp(Sc, _o.prototype);
Sc.isPureReactComponent = !0;
var zd = Array.isArray, kp = Object.prototype.hasOwnProperty, kc = { current: null }, Ep = { key: !0, ref: !0, __self: !0, __source: !0 };
function Cp(e, t, n) {
  var r, o = {}, a = null, i = null;
  if (t != null) for (r in t.ref !== void 0 && (i = t.ref), t.key !== void 0 && (a = "" + t.key), t) kp.call(t, r) && !Ep.hasOwnProperty(r) && (o[r] = t[r]);
  var s = arguments.length - 2;
  if (s === 1) o.children = n;
  else if (1 < s) {
    for (var l = Array(s), c = 0; c < s; c++) l[c] = arguments[c + 2];
    o.children = l;
  }
  if (e && e.defaultProps) for (r in s = e.defaultProps, s) o[r] === void 0 && (o[r] = s[r]);
  return { $$typeof: Ha, type: e, key: a, ref: i, props: o, _owner: kc.current };
}
function $g(e, t) {
  return { $$typeof: Ha, type: e.type, key: t, ref: e.ref, props: e.props, _owner: e._owner };
}
function Ec(e) {
  return typeof e == "object" && e !== null && e.$$typeof === Ha;
}
function Mg(e) {
  var t = { "=": "=0", ":": "=2" };
  return "$" + e.replace(/[=:]/g, function(n) {
    return t[n];
  });
}
var Bd = /\/+/g;
function xl(e, t) {
  return typeof e == "object" && e !== null && e.key != null ? Mg("" + e.key) : t.toString(36);
}
function wi(e, t, n, r, o) {
  var a = typeof e;
  (a === "undefined" || a === "boolean") && (e = null);
  var i = !1;
  if (e === null) i = !0;
  else switch (a) {
    case "string":
    case "number":
      i = !0;
      break;
    case "object":
      switch (e.$$typeof) {
        case Ha:
        case Eg:
          i = !0;
      }
  }
  if (i) return i = e, o = o(i), e = r === "" ? "." + xl(i, 0) : r, zd(o) ? (n = "", e != null && (n = e.replace(Bd, "$&/") + "/"), wi(o, t, n, "", function(c) {
    return c;
  })) : o != null && (Ec(o) && (o = $g(o, n + (!o.key || i && i.key === o.key ? "" : ("" + o.key).replace(Bd, "$&/") + "/") + e)), t.push(o)), 1;
  if (i = 0, r = r === "" ? "." : r + ":", zd(e)) for (var s = 0; s < e.length; s++) {
    a = e[s];
    var l = r + xl(a, s);
    i += wi(a, t, n, l, o);
  }
  else if (l = Dg(e), typeof l == "function") for (e = l.call(e), s = 0; !(a = e.next()).done; ) a = a.value, l = r + xl(a, s++), i += wi(a, t, n, l, o);
  else if (a === "object") throw t = String(e), Error("Objects are not valid as a React child (found: " + (t === "[object Object]" ? "object with keys {" + Object.keys(e).join(", ") + "}" : t) + "). If you meant to render a collection of children, use an array instead.");
  return i;
}
function Ja(e, t, n) {
  if (e == null) return e;
  var r = [], o = 0;
  return wi(e, r, "", "", function(a) {
    return t.call(n, a, o++);
  }), r;
}
function jg(e) {
  if (e._status === -1) {
    var t = e._result;
    t = t(), t.then(function(n) {
      (e._status === 0 || e._status === -1) && (e._status = 1, e._result = n);
    }, function(n) {
      (e._status === 0 || e._status === -1) && (e._status = 2, e._result = n);
    }), e._status === -1 && (e._status = 0, e._result = t);
  }
  if (e._status === 1) return e._result.default;
  throw e._result;
}
var tt = { current: null }, bi = { transition: null }, Fg = { ReactCurrentDispatcher: tt, ReactCurrentBatchConfig: bi, ReactCurrentOwner: kc };
function Tp() {
  throw Error("act(...) is not supported in production builds of React.");
}
Q.Children = { map: Ja, forEach: function(e, t, n) {
  Ja(e, function() {
    t.apply(this, arguments);
  }, n);
}, count: function(e) {
  var t = 0;
  return Ja(e, function() {
    t++;
  }), t;
}, toArray: function(e) {
  return Ja(e, function(t) {
    return t;
  }) || [];
}, only: function(e) {
  if (!Ec(e)) throw Error("React.Children.only expected to receive a single React element child.");
  return e;
} };
Q.Component = _o;
Q.Fragment = Cg;
Q.Profiler = Og;
Q.PureComponent = _c;
Q.StrictMode = Tg;
Q.Suspense = Ag;
Q.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = Fg;
Q.act = Tp;
Q.cloneElement = function(e, t, n) {
  if (e == null) throw Error("React.cloneElement(...): The argument must be a React element, but you passed " + e + ".");
  var r = bp({}, e.props), o = e.key, a = e.ref, i = e._owner;
  if (t != null) {
    if (t.ref !== void 0 && (a = t.ref, i = kc.current), t.key !== void 0 && (o = "" + t.key), e.type && e.type.defaultProps) var s = e.type.defaultProps;
    for (l in t) kp.call(t, l) && !Ep.hasOwnProperty(l) && (r[l] = t[l] === void 0 && s !== void 0 ? s[l] : t[l]);
  }
  var l = arguments.length - 2;
  if (l === 1) r.children = n;
  else if (1 < l) {
    s = Array(l);
    for (var c = 0; c < l; c++) s[c] = arguments[c + 2];
    r.children = s;
  }
  return { $$typeof: Ha, type: e.type, key: o, ref: a, props: r, _owner: i };
};
Q.createContext = function(e) {
  return e = { $$typeof: Ig, _currentValue: e, _currentValue2: e, _threadCount: 0, Provider: null, Consumer: null, _defaultValue: null, _globalName: null }, e.Provider = { $$typeof: Ng, _context: e }, e.Consumer = e;
};
Q.createElement = Cp;
Q.createFactory = function(e) {
  var t = Cp.bind(null, e);
  return t.type = e, t;
};
Q.createRef = function() {
  return { current: null };
};
Q.forwardRef = function(e) {
  return { $$typeof: Lg, render: e };
};
Q.isValidElement = Ec;
Q.lazy = function(e) {
  return { $$typeof: Pg, _payload: { _status: -1, _result: e }, _init: jg };
};
Q.memo = function(e, t) {
  return { $$typeof: Rg, type: e, compare: t === void 0 ? null : t };
};
Q.startTransition = function(e) {
  var t = bi.transition;
  bi.transition = {};
  try {
    e();
  } finally {
    bi.transition = t;
  }
};
Q.unstable_act = Tp;
Q.useCallback = function(e, t) {
  return tt.current.useCallback(e, t);
};
Q.useContext = function(e) {
  return tt.current.useContext(e);
};
Q.useDebugValue = function() {
};
Q.useDeferredValue = function(e) {
  return tt.current.useDeferredValue(e);
};
Q.useEffect = function(e, t) {
  return tt.current.useEffect(e, t);
};
Q.useId = function() {
  return tt.current.useId();
};
Q.useImperativeHandle = function(e, t, n) {
  return tt.current.useImperativeHandle(e, t, n);
};
Q.useInsertionEffect = function(e, t) {
  return tt.current.useInsertionEffect(e, t);
};
Q.useLayoutEffect = function(e, t) {
  return tt.current.useLayoutEffect(e, t);
};
Q.useMemo = function(e, t) {
  return tt.current.useMemo(e, t);
};
Q.useReducer = function(e, t, n) {
  return tt.current.useReducer(e, t, n);
};
Q.useRef = function(e) {
  return tt.current.useRef(e);
};
Q.useState = function(e) {
  return tt.current.useState(e);
};
Q.useSyncExternalStore = function(e, t, n) {
  return tt.current.useSyncExternalStore(e, t, n);
};
Q.useTransition = function() {
  return tt.current.useTransition();
};
Q.version = "18.3.1";
yp.exports = Q;
var le = yp.exports;
const Hg = /* @__PURE__ */ gp(le), Wd = /* @__PURE__ */ xp({
  __proto__: null,
  default: Hg
}, [le]);
var Ug = le, Vg = Symbol.for("react.element"), zg = Symbol.for("react.fragment"), Bg = Object.prototype.hasOwnProperty, Wg = Ug.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner, Gg = { key: !0, ref: !0, __self: !0, __source: !0 };
function Op(e, t, n) {
  var r, o = {}, a = null, i = null;
  n !== void 0 && (a = "" + n), t.key !== void 0 && (a = "" + t.key), t.ref !== void 0 && (i = t.ref);
  for (r in t) Bg.call(t, r) && !Gg.hasOwnProperty(r) && (o[r] = t[r]);
  if (e && e.defaultProps) for (r in t = e.defaultProps, t) o[r] === void 0 && (o[r] = t[r]);
  return { $$typeof: Vg, type: e, key: a, ref: i, props: o, _owner: Wg.current };
}
Ns.Fragment = zg;
Ns.jsx = Op;
Ns.jsxs = Op;
vp.exports = Ns;
var rn = vp.exports;
function Ht(e) {
  "@babel/helpers - typeof";
  return Ht = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(t) {
    return typeof t;
  } : function(t) {
    return t && typeof Symbol == "function" && t.constructor === Symbol && t !== Symbol.prototype ? "symbol" : typeof t;
  }, Ht(e);
}
function It(e, t) {
  if (!(e instanceof t)) throw new TypeError("Cannot call a class as a function");
}
function Zg(e, t) {
  if (Ht(e) != "object" || !e) return e;
  var n = e[Symbol.toPrimitive];
  if (n !== void 0) {
    var r = n.call(e, t || "default");
    if (Ht(r) != "object") return r;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return (t === "string" ? String : Number)(e);
}
function Np(e) {
  var t = Zg(e, "string");
  return Ht(t) == "symbol" ? t : t + "";
}
function Gd(e, t) {
  for (var n = 0; n < t.length; n++) {
    var r = t[n];
    r.enumerable = r.enumerable || !1, r.configurable = !0, "value" in r && (r.writable = !0), Object.defineProperty(e, Np(r.key), r);
  }
}
function Lt(e, t, n) {
  return t && Gd(e.prototype, t), n && Gd(e, n), Object.defineProperty(e, "prototype", {
    writable: !1
  }), e;
}
function zn(e) {
  if (e === void 0) throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  return e;
}
function eu(e, t) {
  return eu = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function(n, r) {
    return n.__proto__ = r, n;
  }, eu(e, t);
}
function Is(e, t) {
  if (typeof t != "function" && t !== null) throw new TypeError("Super expression must either be null or a function");
  e.prototype = Object.create(t && t.prototype, {
    constructor: {
      value: e,
      writable: !0,
      configurable: !0
    }
  }), Object.defineProperty(e, "prototype", {
    writable: !1
  }), t && eu(e, t);
}
function Ua(e, t) {
  if (t && (Ht(t) == "object" || typeof t == "function")) return t;
  if (t !== void 0) throw new TypeError("Derived constructors may only return object or undefined");
  return zn(e);
}
function un(e) {
  return un = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function(t) {
    return t.__proto__ || Object.getPrototypeOf(t);
  }, un(e);
}
function Nn(e, t, n) {
  return (t = Np(t)) in e ? Object.defineProperty(e, t, {
    value: n,
    enumerable: !0,
    configurable: !0,
    writable: !0
  }) : e[t] = n, e;
}
function Yg(e) {
  if (Array.isArray(e)) return e;
}
function Kg(e) {
  if (typeof Symbol < "u" && e[Symbol.iterator] != null || e["@@iterator"] != null) return Array.from(e);
}
function Zd(e, t) {
  (t == null || t > e.length) && (t = e.length);
  for (var n = 0, r = Array(t); n < t; n++) r[n] = e[n];
  return r;
}
function Xg(e, t) {
  if (e) {
    if (typeof e == "string") return Zd(e, t);
    var n = {}.toString.call(e).slice(8, -1);
    return n === "Object" && e.constructor && (n = e.constructor.name), n === "Map" || n === "Set" ? Array.from(e) : n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n) ? Zd(e, t) : void 0;
  }
}
function Jg() {
  throw new TypeError(`Invalid attempt to destructure non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`);
}
function Qg(e) {
  return Yg(e) || Kg(e) || Xg(e) || Jg();
}
function Yd(e, t) {
  var n = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var r = Object.getOwnPropertySymbols(e);
    t && (r = r.filter(function(o) {
      return Object.getOwnPropertyDescriptor(e, o).enumerable;
    })), n.push.apply(n, r);
  }
  return n;
}
function Kd(e) {
  for (var t = 1; t < arguments.length; t++) {
    var n = arguments[t] != null ? arguments[t] : {};
    t % 2 ? Yd(Object(n), !0).forEach(function(r) {
      Nn(e, r, n[r]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(n)) : Yd(Object(n)).forEach(function(r) {
      Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(n, r));
    });
  }
  return e;
}
var qg = {
  type: "logger",
  log: function(t) {
    this.output("log", t);
  },
  warn: function(t) {
    this.output("warn", t);
  },
  error: function(t) {
    this.output("error", t);
  },
  output: function(t, n) {
    console && console[t] && console[t].apply(console, n);
  }
}, ev = function() {
  function e(t) {
    var n = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
    It(this, e), this.init(t, n);
  }
  return Lt(e, [{
    key: "init",
    value: function(n) {
      var r = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
      this.prefix = r.prefix || "i18next:", this.logger = n || qg, this.options = r, this.debug = r.debug;
    }
  }, {
    key: "setDebug",
    value: function(n) {
      this.debug = n;
    }
  }, {
    key: "log",
    value: function() {
      for (var n = arguments.length, r = new Array(n), o = 0; o < n; o++)
        r[o] = arguments[o];
      return this.forward(r, "log", "", !0);
    }
  }, {
    key: "warn",
    value: function() {
      for (var n = arguments.length, r = new Array(n), o = 0; o < n; o++)
        r[o] = arguments[o];
      return this.forward(r, "warn", "", !0);
    }
  }, {
    key: "error",
    value: function() {
      for (var n = arguments.length, r = new Array(n), o = 0; o < n; o++)
        r[o] = arguments[o];
      return this.forward(r, "error", "");
    }
  }, {
    key: "deprecate",
    value: function() {
      for (var n = arguments.length, r = new Array(n), o = 0; o < n; o++)
        r[o] = arguments[o];
      return this.forward(r, "warn", "WARNING DEPRECATED: ", !0);
    }
  }, {
    key: "forward",
    value: function(n, r, o, a) {
      return a && !this.debug ? null : (typeof n[0] == "string" && (n[0] = "".concat(o).concat(this.prefix, " ").concat(n[0])), this.logger[r](n));
    }
  }, {
    key: "create",
    value: function(n) {
      return new e(this.logger, Kd(Kd({}, {
        prefix: "".concat(this.prefix, ":").concat(n, ":")
      }), this.options));
    }
  }, {
    key: "clone",
    value: function(n) {
      return n = n || this.options, n.prefix = n.prefix || this.prefix, new e(this.logger, n);
    }
  }]), e;
}(), nn = new ev(), Qn = function() {
  function e() {
    It(this, e), this.observers = {};
  }
  return Lt(e, [{
    key: "on",
    value: function(n, r) {
      var o = this;
      return n.split(" ").forEach(function(a) {
        o.observers[a] = o.observers[a] || [], o.observers[a].push(r);
      }), this;
    }
  }, {
    key: "off",
    value: function(n, r) {
      if (this.observers[n]) {
        if (!r) {
          delete this.observers[n];
          return;
        }
        this.observers[n] = this.observers[n].filter(function(o) {
          return o !== r;
        });
      }
    }
  }, {
    key: "emit",
    value: function(n) {
      for (var r = arguments.length, o = new Array(r > 1 ? r - 1 : 0), a = 1; a < r; a++)
        o[a - 1] = arguments[a];
      if (this.observers[n]) {
        var i = [].concat(this.observers[n]);
        i.forEach(function(l) {
          l.apply(void 0, o);
        });
      }
      if (this.observers["*"]) {
        var s = [].concat(this.observers["*"]);
        s.forEach(function(l) {
          l.apply(l, [n].concat(o));
        });
      }
    }
  }]), e;
}();
function Co() {
  var e, t, n = new Promise(function(r, o) {
    e = r, t = o;
  });
  return n.resolve = e, n.reject = t, n;
}
function Xd(e) {
  return e == null ? "" : "" + e;
}
function tv(e, t, n) {
  e.forEach(function(r) {
    t[r] && (n[r] = t[r]);
  });
}
function Cc(e, t, n) {
  function r(s) {
    return s && s.indexOf("###") > -1 ? s.replace(/###/g, ".") : s;
  }
  function o() {
    return !e || typeof e == "string";
  }
  for (var a = typeof t != "string" ? [].concat(t) : t.split("."); a.length > 1; ) {
    if (o()) return {};
    var i = r(a.shift());
    !e[i] && n && (e[i] = new n()), Object.prototype.hasOwnProperty.call(e, i) ? e = e[i] : e = {};
  }
  return o() ? {} : {
    obj: e,
    k: r(a.shift())
  };
}
function Jd(e, t, n) {
  var r = Cc(e, t, Object), o = r.obj, a = r.k;
  o[a] = n;
}
function nv(e, t, n, r) {
  var o = Cc(e, t, Object), a = o.obj, i = o.k;
  a[i] = a[i] || [], a[i].push(n);
}
function ji(e, t) {
  var n = Cc(e, t), r = n.obj, o = n.k;
  if (r)
    return r[o];
}
function Qd(e, t, n) {
  var r = ji(e, n);
  return r !== void 0 ? r : ji(t, n);
}
function Ip(e, t, n) {
  for (var r in t)
    r !== "__proto__" && r !== "constructor" && (r in e ? typeof e[r] == "string" || e[r] instanceof String || typeof t[r] == "string" || t[r] instanceof String ? n && (e[r] = t[r]) : Ip(e[r], t[r], n) : e[r] = t[r]);
  return e;
}
function Lr(e) {
  return e.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}
var rv = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
  "/": "&#x2F;"
};
function ov(e) {
  return typeof e == "string" ? e.replace(/[&<>"'\/]/g, function(t) {
    return rv[t];
  }) : e;
}
var Ls = typeof window < "u" && window.navigator && typeof window.navigator.userAgentData > "u" && window.navigator.userAgent && window.navigator.userAgent.indexOf("MSIE") > -1, av = [" ", ",", "?", "!", ";"];
function iv(e, t, n) {
  t = t || "", n = n || "";
  var r = av.filter(function(s) {
    return t.indexOf(s) < 0 && n.indexOf(s) < 0;
  });
  if (r.length === 0) return !0;
  var o = new RegExp("(".concat(r.map(function(s) {
    return s === "?" ? "\\?" : s;
  }).join("|"), ")")), a = !o.test(e);
  if (!a) {
    var i = e.indexOf(n);
    i > 0 && !o.test(e.substring(0, i)) && (a = !0);
  }
  return a;
}
function qd(e, t) {
  var n = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var r = Object.getOwnPropertySymbols(e);
    t && (r = r.filter(function(o) {
      return Object.getOwnPropertyDescriptor(e, o).enumerable;
    })), n.push.apply(n, r);
  }
  return n;
}
function Qa(e) {
  for (var t = 1; t < arguments.length; t++) {
    var n = arguments[t] != null ? arguments[t] : {};
    t % 2 ? qd(Object(n), !0).forEach(function(r) {
      Nn(e, r, n[r]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(n)) : qd(Object(n)).forEach(function(r) {
      Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(n, r));
    });
  }
  return e;
}
function sv(e) {
  var t = lv();
  return function() {
    var r = un(e), o;
    if (t) {
      var a = un(this).constructor;
      o = Reflect.construct(r, arguments, a);
    } else
      o = r.apply(this, arguments);
    return Ua(this, o);
  };
}
function lv() {
  if (typeof Reflect > "u" || !Reflect.construct || Reflect.construct.sham) return !1;
  if (typeof Proxy == "function") return !0;
  try {
    return Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function() {
    })), !0;
  } catch {
    return !1;
  }
}
function Lp(e, t) {
  var n = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : ".";
  if (e) {
    if (e[t]) return e[t];
    for (var r = t.split(n), o = e, a = 0; a < r.length; ++a) {
      if (!o || typeof o[r[a]] == "string" && a + 1 < r.length)
        return;
      if (o[r[a]] === void 0) {
        for (var i = 2, s = r.slice(a, a + i).join(n), l = o[s]; l === void 0 && r.length > a + i; )
          i++, s = r.slice(a, a + i).join(n), l = o[s];
        if (l === void 0) return;
        if (l === null) return null;
        if (t.endsWith(s)) {
          if (typeof l == "string") return l;
          if (s && typeof l[s] == "string") return l[s];
        }
        var c = r.slice(a + i).join(n);
        return c ? Lp(l, c, n) : void 0;
      }
      o = o[r[a]];
    }
    return o;
  }
}
var uv = function(e) {
  Is(n, e);
  var t = sv(n);
  function n(r) {
    var o, a = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {
      ns: ["translation"],
      defaultNS: "translation"
    };
    return It(this, n), o = t.call(this), Ls && Qn.call(zn(o)), o.data = r || {}, o.options = a, o.options.keySeparator === void 0 && (o.options.keySeparator = "."), o.options.ignoreJSONStructure === void 0 && (o.options.ignoreJSONStructure = !0), o;
  }
  return Lt(n, [{
    key: "addNamespaces",
    value: function(o) {
      this.options.ns.indexOf(o) < 0 && this.options.ns.push(o);
    }
  }, {
    key: "removeNamespaces",
    value: function(o) {
      var a = this.options.ns.indexOf(o);
      a > -1 && this.options.ns.splice(a, 1);
    }
  }, {
    key: "getResource",
    value: function(o, a, i) {
      var s = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : {}, l = s.keySeparator !== void 0 ? s.keySeparator : this.options.keySeparator, c = s.ignoreJSONStructure !== void 0 ? s.ignoreJSONStructure : this.options.ignoreJSONStructure, d = [o, a];
      i && typeof i != "string" && (d = d.concat(i)), i && typeof i == "string" && (d = d.concat(l ? i.split(l) : i)), o.indexOf(".") > -1 && (d = o.split("."));
      var f = ji(this.data, d);
      return f || !c || typeof i != "string" ? f : Lp(this.data && this.data[o] && this.data[o][a], i, l);
    }
  }, {
    key: "addResource",
    value: function(o, a, i, s) {
      var l = arguments.length > 4 && arguments[4] !== void 0 ? arguments[4] : {
        silent: !1
      }, c = this.options.keySeparator;
      c === void 0 && (c = ".");
      var d = [o, a];
      i && (d = d.concat(c ? i.split(c) : i)), o.indexOf(".") > -1 && (d = o.split("."), s = a, a = d[1]), this.addNamespaces(a), Jd(this.data, d, s), l.silent || this.emit("added", o, a, i, s);
    }
  }, {
    key: "addResources",
    value: function(o, a, i) {
      var s = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : {
        silent: !1
      };
      for (var l in i)
        (typeof i[l] == "string" || Object.prototype.toString.apply(i[l]) === "[object Array]") && this.addResource(o, a, l, i[l], {
          silent: !0
        });
      s.silent || this.emit("added", o, a, i);
    }
  }, {
    key: "addResourceBundle",
    value: function(o, a, i, s, l) {
      var c = arguments.length > 5 && arguments[5] !== void 0 ? arguments[5] : {
        silent: !1
      }, d = [o, a];
      o.indexOf(".") > -1 && (d = o.split("."), s = i, i = a, a = d[1]), this.addNamespaces(a);
      var f = ji(this.data, d) || {};
      s ? Ip(f, i, l) : f = Qa(Qa({}, f), i), Jd(this.data, d, f), c.silent || this.emit("added", o, a, i);
    }
  }, {
    key: "removeResourceBundle",
    value: function(o, a) {
      this.hasResourceBundle(o, a) && delete this.data[o][a], this.removeNamespaces(a), this.emit("removed", o, a);
    }
  }, {
    key: "hasResourceBundle",
    value: function(o, a) {
      return this.getResource(o, a) !== void 0;
    }
  }, {
    key: "getResourceBundle",
    value: function(o, a) {
      return a || (a = this.options.defaultNS), this.options.compatibilityAPI === "v1" ? Qa(Qa({}, {}), this.getResource(o, a)) : this.getResource(o, a);
    }
  }, {
    key: "getDataByLanguage",
    value: function(o) {
      return this.data[o];
    }
  }, {
    key: "hasLanguageSomeTranslations",
    value: function(o) {
      var a = this.getDataByLanguage(o), i = a && Object.keys(a) || [];
      return !!i.find(function(s) {
        return a[s] && Object.keys(a[s]).length > 0;
      });
    }
  }, {
    key: "toJSON",
    value: function() {
      return this.data;
    }
  }]), n;
}(Qn), Ap = {
  processors: {},
  addPostProcessor: function(t) {
    this.processors[t.name] = t;
  },
  handle: function(t, n, r, o, a) {
    var i = this;
    return t.forEach(function(s) {
      i.processors[s] && (n = i.processors[s].process(n, r, o, a));
    }), n;
  }
};
function ef(e, t) {
  var n = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var r = Object.getOwnPropertySymbols(e);
    t && (r = r.filter(function(o) {
      return Object.getOwnPropertyDescriptor(e, o).enumerable;
    })), n.push.apply(n, r);
  }
  return n;
}
function Xe(e) {
  for (var t = 1; t < arguments.length; t++) {
    var n = arguments[t] != null ? arguments[t] : {};
    t % 2 ? ef(Object(n), !0).forEach(function(r) {
      Nn(e, r, n[r]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(n)) : ef(Object(n)).forEach(function(r) {
      Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(n, r));
    });
  }
  return e;
}
function cv(e) {
  var t = dv();
  return function() {
    var r = un(e), o;
    if (t) {
      var a = un(this).constructor;
      o = Reflect.construct(r, arguments, a);
    } else
      o = r.apply(this, arguments);
    return Ua(this, o);
  };
}
function dv() {
  if (typeof Reflect > "u" || !Reflect.construct || Reflect.construct.sham) return !1;
  if (typeof Proxy == "function") return !0;
  try {
    return Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function() {
    })), !0;
  } catch {
    return !1;
  }
}
var tf = {}, nf = function(e) {
  Is(n, e);
  var t = cv(n);
  function n(r) {
    var o, a = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
    return It(this, n), o = t.call(this), Ls && Qn.call(zn(o)), tv(["resourceStore", "languageUtils", "pluralResolver", "interpolator", "backendConnector", "i18nFormat", "utils"], r, zn(o)), o.options = a, o.options.keySeparator === void 0 && (o.options.keySeparator = "."), o.logger = nn.create("translator"), o;
  }
  return Lt(n, [{
    key: "changeLanguage",
    value: function(o) {
      o && (this.language = o);
    }
  }, {
    key: "exists",
    value: function(o) {
      var a = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {
        interpolation: {}
      };
      if (o == null)
        return !1;
      var i = this.resolve(o, a);
      return i && i.res !== void 0;
    }
  }, {
    key: "extractFromKey",
    value: function(o, a) {
      var i = a.nsSeparator !== void 0 ? a.nsSeparator : this.options.nsSeparator;
      i === void 0 && (i = ":");
      var s = a.keySeparator !== void 0 ? a.keySeparator : this.options.keySeparator, l = a.ns || this.options.defaultNS || [], c = i && o.indexOf(i) > -1, d = !this.options.userDefinedKeySeparator && !a.keySeparator && !this.options.userDefinedNsSeparator && !a.nsSeparator && !iv(o, i, s);
      if (c && !d) {
        var f = o.match(this.interpolator.nestingRegexp);
        if (f && f.length > 0)
          return {
            key: o,
            namespaces: l
          };
        var p = o.split(i);
        (i !== s || i === s && this.options.ns.indexOf(p[0]) > -1) && (l = p.shift()), o = p.join(s);
      }
      return typeof l == "string" && (l = [l]), {
        key: o,
        namespaces: l
      };
    }
  }, {
    key: "translate",
    value: function(o, a, i) {
      var s = this;
      if (Ht(a) !== "object" && this.options.overloadTranslationOptionHandler && (a = this.options.overloadTranslationOptionHandler(arguments)), a || (a = {}), o == null) return "";
      Array.isArray(o) || (o = [String(o)]);
      var l = a.returnDetails !== void 0 ? a.returnDetails : this.options.returnDetails, c = a.keySeparator !== void 0 ? a.keySeparator : this.options.keySeparator, d = this.extractFromKey(o[o.length - 1], a), f = d.key, p = d.namespaces, g = p[p.length - 1], y = a.lng || this.language, m = a.appendNamespaceToCIMode || this.options.appendNamespaceToCIMode;
      if (y && y.toLowerCase() === "cimode") {
        if (m) {
          var b = a.nsSeparator || this.options.nsSeparator;
          return l ? (u.res = "".concat(g).concat(b).concat(f), u) : "".concat(g).concat(b).concat(f);
        }
        return l ? (u.res = f, u) : f;
      }
      var u = this.resolve(o, a), h = u && u.res, x = u && u.usedKey || f, w = u && u.exactUsedKey || f, S = Object.prototype.toString.apply(h), E = ["[object Number]", "[object Function]", "[object RegExp]"], k = a.joinArrays !== void 0 ? a.joinArrays : this.options.joinArrays, L = !this.i18nFormat || this.i18nFormat.handleAsObject, P = typeof h != "string" && typeof h != "boolean" && typeof h != "number";
      if (L && h && P && E.indexOf(S) < 0 && !(typeof k == "string" && S === "[object Array]")) {
        if (!a.returnObjects && !this.options.returnObjects) {
          this.options.returnedObjectHandler || this.logger.warn("accessing an object - but returnObjects options is not enabled!");
          var O = this.options.returnedObjectHandler ? this.options.returnedObjectHandler(x, h, Xe(Xe({}, a), {}, {
            ns: p
          })) : "key '".concat(f, " (").concat(this.language, ")' returned an object instead of string.");
          return l ? (u.res = O, u) : O;
        }
        if (c) {
          var j = S === "[object Array]", ne = j ? [] : {}, Ae = j ? w : x;
          for (var _ in h)
            if (Object.prototype.hasOwnProperty.call(h, _)) {
              var I = "".concat(Ae).concat(c).concat(_);
              ne[_] = this.translate(I, Xe(Xe({}, a), {
                joinArrays: !1,
                ns: p
              })), ne[_] === I && (ne[_] = h[_]);
            }
          h = ne;
        }
      } else if (L && typeof k == "string" && S === "[object Array]")
        h = h.join(k), h && (h = this.extendTranslation(h, o, a, i));
      else {
        var U = !1, de = !1, N = a.count !== void 0 && typeof a.count != "string", A = n.hasDefaultValue(a), B = N ? this.pluralResolver.getSuffix(y, a.count, a) : "", J = a["defaultValue".concat(B)] || a.defaultValue;
        !this.isValidLookup(h) && A && (U = !0, h = J), this.isValidLookup(h) || (de = !0, h = f);
        var fe = a.missingKeyNoValueFallbackToKey || this.options.missingKeyNoValueFallbackToKey, fn = fe && de ? void 0 : h, Oe = A && J !== h && this.options.updateMissing;
        if (de || U || Oe) {
          if (this.logger.log(Oe ? "updateKey" : "missingKey", y, g, f, Oe ? J : h), c) {
            var Nr = this.resolve(f, Xe(Xe({}, a), {}, {
              keySeparator: !1
            }));
            Nr && Nr.res && this.logger.warn("Seems the loaded translations were in flat JSON format instead of nested. Either set keySeparator: false on init or make sure your translations are published in nested format.");
          }
          var dt = [], pn = this.languageUtils.getFallbackCodes(this.options.fallbackLng, a.lng || this.language);
          if (this.options.saveMissingTo === "fallback" && pn && pn[0])
            for (var pl = 0; pl < pn.length; pl++)
              dt.push(pn[pl]);
          else this.options.saveMissingTo === "all" ? dt = this.languageUtils.toResolveHierarchy(a.lng || this.language) : dt.push(a.lng || this.language);
          var Fd = function(Ir, ml, Hd) {
            var Ud = A && Hd !== h ? Hd : fn;
            s.options.missingKeyHandler ? s.options.missingKeyHandler(Ir, g, ml, Ud, Oe, a) : s.backendConnector && s.backendConnector.saveMissing && s.backendConnector.saveMissing(Ir, g, ml, Ud, Oe, a), s.emit("missingKey", Ir, g, ml, h);
          };
          this.options.saveMissing && (this.options.saveMissingPlurals && N ? dt.forEach(function(hl) {
            s.pluralResolver.getSuffixes(hl, a).forEach(function(Ir) {
              Fd([hl], f + Ir, a["defaultValue".concat(Ir)] || J);
            });
          }) : Fd(dt, f, J));
        }
        h = this.extendTranslation(h, o, a, u, i), de && h === f && this.options.appendNamespaceToMissingKey && (h = "".concat(g, ":").concat(f)), (de || U) && this.options.parseMissingKeyHandler && (this.options.compatibilityAPI !== "v1" ? h = this.options.parseMissingKeyHandler(this.options.appendNamespaceToMissingKey ? "".concat(g, ":").concat(f) : f, U ? h : void 0) : h = this.options.parseMissingKeyHandler(h));
      }
      return l ? (u.res = h, u) : h;
    }
  }, {
    key: "extendTranslation",
    value: function(o, a, i, s, l) {
      var c = this;
      if (this.i18nFormat && this.i18nFormat.parse)
        o = this.i18nFormat.parse(o, Xe(Xe({}, this.options.interpolation.defaultVariables), i), s.usedLng, s.usedNS, s.usedKey, {
          resolved: s
        });
      else if (!i.skipInterpolation) {
        i.interpolation && this.interpolator.init(Xe(Xe({}, i), {
          interpolation: Xe(Xe({}, this.options.interpolation), i.interpolation)
        }));
        var d = typeof o == "string" && (i && i.interpolation && i.interpolation.skipOnVariables !== void 0 ? i.interpolation.skipOnVariables : this.options.interpolation.skipOnVariables), f;
        if (d) {
          var p = o.match(this.interpolator.nestingRegexp);
          f = p && p.length;
        }
        var g = i.replace && typeof i.replace != "string" ? i.replace : i;
        if (this.options.interpolation.defaultVariables && (g = Xe(Xe({}, this.options.interpolation.defaultVariables), g)), o = this.interpolator.interpolate(o, g, i.lng || this.language, i), d) {
          var y = o.match(this.interpolator.nestingRegexp), m = y && y.length;
          f < m && (i.nest = !1);
        }
        i.nest !== !1 && (o = this.interpolator.nest(o, function() {
          for (var h = arguments.length, x = new Array(h), w = 0; w < h; w++)
            x[w] = arguments[w];
          return l && l[0] === x[0] && !i.context ? (c.logger.warn("It seems you are nesting recursively key: ".concat(x[0], " in key: ").concat(a[0])), null) : c.translate.apply(c, x.concat([a]));
        }, i)), i.interpolation && this.interpolator.reset();
      }
      var b = i.postProcess || this.options.postProcess, u = typeof b == "string" ? [b] : b;
      return o != null && u && u.length && i.applyPostProcessor !== !1 && (o = Ap.handle(u, o, a, this.options && this.options.postProcessPassResolved ? Xe({
        i18nResolved: s
      }, i) : i, this)), o;
    }
  }, {
    key: "resolve",
    value: function(o) {
      var a = this, i = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {}, s, l, c, d, f;
      return typeof o == "string" && (o = [o]), o.forEach(function(p) {
        if (!a.isValidLookup(s)) {
          var g = a.extractFromKey(p, i), y = g.key;
          l = y;
          var m = g.namespaces;
          a.options.fallbackNS && (m = m.concat(a.options.fallbackNS));
          var b = i.count !== void 0 && typeof i.count != "string", u = b && !i.ordinal && i.count === 0 && a.pluralResolver.shouldUseIntlApi(), h = i.context !== void 0 && (typeof i.context == "string" || typeof i.context == "number") && i.context !== "", x = i.lngs ? i.lngs : a.languageUtils.toResolveHierarchy(i.lng || a.language, i.fallbackLng);
          m.forEach(function(w) {
            a.isValidLookup(s) || (f = w, !tf["".concat(x[0], "-").concat(w)] && a.utils && a.utils.hasLoadedNamespace && !a.utils.hasLoadedNamespace(f) && (tf["".concat(x[0], "-").concat(w)] = !0, a.logger.warn('key "'.concat(l, '" for languages "').concat(x.join(", "), `" won't get resolved as namespace "`).concat(f, '" was not yet loaded'), "This means something IS WRONG in your setup. You access the t function before i18next.init / i18next.loadNamespace / i18next.changeLanguage was done. Wait for the callback or Promise to resolve before accessing it!!!")), x.forEach(function(S) {
              if (!a.isValidLookup(s)) {
                d = S;
                var E = [y];
                if (a.i18nFormat && a.i18nFormat.addLookupKeys)
                  a.i18nFormat.addLookupKeys(E, y, S, w, i);
                else {
                  var k;
                  b && (k = a.pluralResolver.getSuffix(S, i.count, i));
                  var L = "".concat(a.options.pluralSeparator, "zero");
                  if (b && (E.push(y + k), u && E.push(y + L)), h) {
                    var P = "".concat(y).concat(a.options.contextSeparator).concat(i.context);
                    E.push(P), b && (E.push(P + k), u && E.push(P + L));
                  }
                }
                for (var O; O = E.pop(); )
                  a.isValidLookup(s) || (c = O, s = a.getResource(S, w, O, i));
              }
            }));
          });
        }
      }), {
        res: s,
        usedKey: l,
        exactUsedKey: c,
        usedLng: d,
        usedNS: f
      };
    }
  }, {
    key: "isValidLookup",
    value: function(o) {
      return o !== void 0 && !(!this.options.returnNull && o === null) && !(!this.options.returnEmptyString && o === "");
    }
  }, {
    key: "getResource",
    value: function(o, a, i) {
      var s = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : {};
      return this.i18nFormat && this.i18nFormat.getResource ? this.i18nFormat.getResource(o, a, i, s) : this.resourceStore.getResource(o, a, i, s);
    }
  }], [{
    key: "hasDefaultValue",
    value: function(o) {
      var a = "defaultValue";
      for (var i in o)
        if (Object.prototype.hasOwnProperty.call(o, i) && a === i.substring(0, a.length) && o[i] !== void 0)
          return !0;
      return !1;
    }
  }]), n;
}(Qn);
function gl(e) {
  return e.charAt(0).toUpperCase() + e.slice(1);
}
var fv = function() {
  function e(t) {
    It(this, e), this.options = t, this.supportedLngs = this.options.supportedLngs || !1, this.logger = nn.create("languageUtils");
  }
  return Lt(e, [{
    key: "getScriptPartFromCode",
    value: function(n) {
      if (!n || n.indexOf("-") < 0) return null;
      var r = n.split("-");
      return r.length === 2 || (r.pop(), r[r.length - 1].toLowerCase() === "x") ? null : this.formatLanguageCode(r.join("-"));
    }
  }, {
    key: "getLanguagePartFromCode",
    value: function(n) {
      if (!n || n.indexOf("-") < 0) return n;
      var r = n.split("-");
      return this.formatLanguageCode(r[0]);
    }
  }, {
    key: "formatLanguageCode",
    value: function(n) {
      if (typeof n == "string" && n.indexOf("-") > -1) {
        var r = ["hans", "hant", "latn", "cyrl", "cans", "mong", "arab"], o = n.split("-");
        return this.options.lowerCaseLng ? o = o.map(function(a) {
          return a.toLowerCase();
        }) : o.length === 2 ? (o[0] = o[0].toLowerCase(), o[1] = o[1].toUpperCase(), r.indexOf(o[1].toLowerCase()) > -1 && (o[1] = gl(o[1].toLowerCase()))) : o.length === 3 && (o[0] = o[0].toLowerCase(), o[1].length === 2 && (o[1] = o[1].toUpperCase()), o[0] !== "sgn" && o[2].length === 2 && (o[2] = o[2].toUpperCase()), r.indexOf(o[1].toLowerCase()) > -1 && (o[1] = gl(o[1].toLowerCase())), r.indexOf(o[2].toLowerCase()) > -1 && (o[2] = gl(o[2].toLowerCase()))), o.join("-");
      }
      return this.options.cleanCode || this.options.lowerCaseLng ? n.toLowerCase() : n;
    }
  }, {
    key: "isSupportedCode",
    value: function(n) {
      return (this.options.load === "languageOnly" || this.options.nonExplicitSupportedLngs) && (n = this.getLanguagePartFromCode(n)), !this.supportedLngs || !this.supportedLngs.length || this.supportedLngs.indexOf(n) > -1;
    }
  }, {
    key: "getBestMatchFromCodes",
    value: function(n) {
      var r = this;
      if (!n) return null;
      var o;
      return n.forEach(function(a) {
        if (!o) {
          var i = r.formatLanguageCode(a);
          (!r.options.supportedLngs || r.isSupportedCode(i)) && (o = i);
        }
      }), !o && this.options.supportedLngs && n.forEach(function(a) {
        if (!o) {
          var i = r.getLanguagePartFromCode(a);
          if (r.isSupportedCode(i)) return o = i;
          o = r.options.supportedLngs.find(function(s) {
            if (s.indexOf(i) === 0) return s;
          });
        }
      }), o || (o = this.getFallbackCodes(this.options.fallbackLng)[0]), o;
    }
  }, {
    key: "getFallbackCodes",
    value: function(n, r) {
      if (!n) return [];
      if (typeof n == "function" && (n = n(r)), typeof n == "string" && (n = [n]), Object.prototype.toString.apply(n) === "[object Array]") return n;
      if (!r) return n.default || [];
      var o = n[r];
      return o || (o = n[this.getScriptPartFromCode(r)]), o || (o = n[this.formatLanguageCode(r)]), o || (o = n[this.getLanguagePartFromCode(r)]), o || (o = n.default), o || [];
    }
  }, {
    key: "toResolveHierarchy",
    value: function(n, r) {
      var o = this, a = this.getFallbackCodes(r || this.options.fallbackLng || [], n), i = [], s = function(c) {
        c && (o.isSupportedCode(c) ? i.push(c) : o.logger.warn("rejecting language code not found in supportedLngs: ".concat(c)));
      };
      return typeof n == "string" && n.indexOf("-") > -1 ? (this.options.load !== "languageOnly" && s(this.formatLanguageCode(n)), this.options.load !== "languageOnly" && this.options.load !== "currentOnly" && s(this.getScriptPartFromCode(n)), this.options.load !== "currentOnly" && s(this.getLanguagePartFromCode(n))) : typeof n == "string" && s(this.formatLanguageCode(n)), a.forEach(function(l) {
        i.indexOf(l) < 0 && s(o.formatLanguageCode(l));
      }), i;
    }
  }]), e;
}(), pv = [{
  lngs: ["ach", "ak", "am", "arn", "br", "fil", "gun", "ln", "mfe", "mg", "mi", "oc", "pt", "pt-BR", "tg", "tl", "ti", "tr", "uz", "wa"],
  nr: [1, 2],
  fc: 1
}, {
  lngs: ["af", "an", "ast", "az", "bg", "bn", "ca", "da", "de", "dev", "el", "en", "eo", "es", "et", "eu", "fi", "fo", "fur", "fy", "gl", "gu", "ha", "hi", "hu", "hy", "ia", "it", "kk", "kn", "ku", "lb", "mai", "ml", "mn", "mr", "nah", "nap", "nb", "ne", "nl", "nn", "no", "nso", "pa", "pap", "pms", "ps", "pt-PT", "rm", "sco", "se", "si", "so", "son", "sq", "sv", "sw", "ta", "te", "tk", "ur", "yo"],
  nr: [1, 2],
  fc: 2
}, {
  lngs: ["ay", "bo", "cgg", "fa", "ht", "id", "ja", "jbo", "ka", "km", "ko", "ky", "lo", "ms", "sah", "su", "th", "tt", "ug", "vi", "wo", "zh"],
  nr: [1],
  fc: 3
}, {
  lngs: ["be", "bs", "cnr", "dz", "hr", "ru", "sr", "uk"],
  nr: [1, 2, 5],
  fc: 4
}, {
  lngs: ["ar"],
  nr: [0, 1, 2, 3, 11, 100],
  fc: 5
}, {
  lngs: ["cs", "sk"],
  nr: [1, 2, 5],
  fc: 6
}, {
  lngs: ["csb", "pl"],
  nr: [1, 2, 5],
  fc: 7
}, {
  lngs: ["cy"],
  nr: [1, 2, 3, 8],
  fc: 8
}, {
  lngs: ["fr"],
  nr: [1, 2],
  fc: 9
}, {
  lngs: ["ga"],
  nr: [1, 2, 3, 7, 11],
  fc: 10
}, {
  lngs: ["gd"],
  nr: [1, 2, 3, 20],
  fc: 11
}, {
  lngs: ["is"],
  nr: [1, 2],
  fc: 12
}, {
  lngs: ["jv"],
  nr: [0, 1],
  fc: 13
}, {
  lngs: ["kw"],
  nr: [1, 2, 3, 4],
  fc: 14
}, {
  lngs: ["lt"],
  nr: [1, 2, 10],
  fc: 15
}, {
  lngs: ["lv"],
  nr: [1, 2, 0],
  fc: 16
}, {
  lngs: ["mk"],
  nr: [1, 2],
  fc: 17
}, {
  lngs: ["mnk"],
  nr: [0, 1, 2],
  fc: 18
}, {
  lngs: ["mt"],
  nr: [1, 2, 11, 20],
  fc: 19
}, {
  lngs: ["or"],
  nr: [2, 1],
  fc: 2
}, {
  lngs: ["ro"],
  nr: [1, 2, 20],
  fc: 20
}, {
  lngs: ["sl"],
  nr: [5, 1, 2, 3],
  fc: 21
}, {
  lngs: ["he", "iw"],
  nr: [1, 2, 20, 21],
  fc: 22
}], hv = {
  1: function(t) {
    return +(t > 1);
  },
  2: function(t) {
    return +(t != 1);
  },
  3: function(t) {
    return 0;
  },
  4: function(t) {
    return t % 10 == 1 && t % 100 != 11 ? 0 : t % 10 >= 2 && t % 10 <= 4 && (t % 100 < 10 || t % 100 >= 20) ? 1 : 2;
  },
  5: function(t) {
    return t == 0 ? 0 : t == 1 ? 1 : t == 2 ? 2 : t % 100 >= 3 && t % 100 <= 10 ? 3 : t % 100 >= 11 ? 4 : 5;
  },
  6: function(t) {
    return t == 1 ? 0 : t >= 2 && t <= 4 ? 1 : 2;
  },
  7: function(t) {
    return t == 1 ? 0 : t % 10 >= 2 && t % 10 <= 4 && (t % 100 < 10 || t % 100 >= 20) ? 1 : 2;
  },
  8: function(t) {
    return t == 1 ? 0 : t == 2 ? 1 : t != 8 && t != 11 ? 2 : 3;
  },
  9: function(t) {
    return +(t >= 2);
  },
  10: function(t) {
    return t == 1 ? 0 : t == 2 ? 1 : t < 7 ? 2 : t < 11 ? 3 : 4;
  },
  11: function(t) {
    return t == 1 || t == 11 ? 0 : t == 2 || t == 12 ? 1 : t > 2 && t < 20 ? 2 : 3;
  },
  12: function(t) {
    return +(t % 10 != 1 || t % 100 == 11);
  },
  13: function(t) {
    return +(t !== 0);
  },
  14: function(t) {
    return t == 1 ? 0 : t == 2 ? 1 : t == 3 ? 2 : 3;
  },
  15: function(t) {
    return t % 10 == 1 && t % 100 != 11 ? 0 : t % 10 >= 2 && (t % 100 < 10 || t % 100 >= 20) ? 1 : 2;
  },
  16: function(t) {
    return t % 10 == 1 && t % 100 != 11 ? 0 : t !== 0 ? 1 : 2;
  },
  17: function(t) {
    return t == 1 || t % 10 == 1 && t % 100 != 11 ? 0 : 1;
  },
  18: function(t) {
    return t == 0 ? 0 : t == 1 ? 1 : 2;
  },
  19: function(t) {
    return t == 1 ? 0 : t == 0 || t % 100 > 1 && t % 100 < 11 ? 1 : t % 100 > 10 && t % 100 < 20 ? 2 : 3;
  },
  20: function(t) {
    return t == 1 ? 0 : t == 0 || t % 100 > 0 && t % 100 < 20 ? 1 : 2;
  },
  21: function(t) {
    return t % 100 == 1 ? 1 : t % 100 == 2 ? 2 : t % 100 == 3 || t % 100 == 4 ? 3 : 0;
  },
  22: function(t) {
    return t == 1 ? 0 : t == 2 ? 1 : (t < 0 || t > 10) && t % 10 == 0 ? 2 : 3;
  }
}, mv = ["v1", "v2", "v3"], rf = {
  zero: 0,
  one: 1,
  two: 2,
  few: 3,
  many: 4,
  other: 5
};
function xv() {
  var e = {};
  return pv.forEach(function(t) {
    t.lngs.forEach(function(n) {
      e[n] = {
        numbers: t.nr,
        plurals: hv[t.fc]
      };
    });
  }), e;
}
var gv = function() {
  function e(t) {
    var n = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
    It(this, e), this.languageUtils = t, this.options = n, this.logger = nn.create("pluralResolver"), (!this.options.compatibilityJSON || this.options.compatibilityJSON === "v4") && (typeof Intl > "u" || !Intl.PluralRules) && (this.options.compatibilityJSON = "v3", this.logger.error("Your environment seems not to be Intl API compatible, use an Intl.PluralRules polyfill. Will fallback to the compatibilityJSON v3 format handling.")), this.rules = xv();
  }
  return Lt(e, [{
    key: "addRule",
    value: function(n, r) {
      this.rules[n] = r;
    }
  }, {
    key: "getRule",
    value: function(n) {
      var r = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
      if (this.shouldUseIntlApi())
        try {
          return new Intl.PluralRules(n, {
            type: r.ordinal ? "ordinal" : "cardinal"
          });
        } catch {
          return;
        }
      return this.rules[n] || this.rules[this.languageUtils.getLanguagePartFromCode(n)];
    }
  }, {
    key: "needsPlural",
    value: function(n) {
      var r = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {}, o = this.getRule(n, r);
      return this.shouldUseIntlApi() ? o && o.resolvedOptions().pluralCategories.length > 1 : o && o.numbers.length > 1;
    }
  }, {
    key: "getPluralFormsOfKey",
    value: function(n, r) {
      var o = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {};
      return this.getSuffixes(n, o).map(function(a) {
        return "".concat(r).concat(a);
      });
    }
  }, {
    key: "getSuffixes",
    value: function(n) {
      var r = this, o = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {}, a = this.getRule(n, o);
      return a ? this.shouldUseIntlApi() ? a.resolvedOptions().pluralCategories.sort(function(i, s) {
        return rf[i] - rf[s];
      }).map(function(i) {
        return "".concat(r.options.prepend).concat(i);
      }) : a.numbers.map(function(i) {
        return r.getSuffix(n, i, o);
      }) : [];
    }
  }, {
    key: "getSuffix",
    value: function(n, r) {
      var o = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {}, a = this.getRule(n, o);
      return a ? this.shouldUseIntlApi() ? "".concat(this.options.prepend).concat(a.select(r)) : this.getSuffixRetroCompatible(a, r) : (this.logger.warn("no plural rule found for: ".concat(n)), "");
    }
  }, {
    key: "getSuffixRetroCompatible",
    value: function(n, r) {
      var o = this, a = n.noAbs ? n.plurals(r) : n.plurals(Math.abs(r)), i = n.numbers[a];
      this.options.simplifyPluralSuffix && n.numbers.length === 2 && n.numbers[0] === 1 && (i === 2 ? i = "plural" : i === 1 && (i = ""));
      var s = function() {
        return o.options.prepend && i.toString() ? o.options.prepend + i.toString() : i.toString();
      };
      return this.options.compatibilityJSON === "v1" ? i === 1 ? "" : typeof i == "number" ? "_plural_".concat(i.toString()) : s() : this.options.compatibilityJSON === "v2" || this.options.simplifyPluralSuffix && n.numbers.length === 2 && n.numbers[0] === 1 ? s() : this.options.prepend && a.toString() ? this.options.prepend + a.toString() : a.toString();
    }
  }, {
    key: "shouldUseIntlApi",
    value: function() {
      return !mv.includes(this.options.compatibilityJSON);
    }
  }]), e;
}();
function of(e, t) {
  var n = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var r = Object.getOwnPropertySymbols(e);
    t && (r = r.filter(function(o) {
      return Object.getOwnPropertyDescriptor(e, o).enumerable;
    })), n.push.apply(n, r);
  }
  return n;
}
function Rt(e) {
  for (var t = 1; t < arguments.length; t++) {
    var n = arguments[t] != null ? arguments[t] : {};
    t % 2 ? of(Object(n), !0).forEach(function(r) {
      Nn(e, r, n[r]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(n)) : of(Object(n)).forEach(function(r) {
      Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(n, r));
    });
  }
  return e;
}
var vv = function() {
  function e() {
    var t = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
    It(this, e), this.logger = nn.create("interpolator"), this.options = t, this.format = t.interpolation && t.interpolation.format || function(n) {
      return n;
    }, this.init(t);
  }
  return Lt(e, [{
    key: "init",
    value: function() {
      var n = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
      n.interpolation || (n.interpolation = {
        escapeValue: !0
      });
      var r = n.interpolation;
      this.escape = r.escape !== void 0 ? r.escape : ov, this.escapeValue = r.escapeValue !== void 0 ? r.escapeValue : !0, this.useRawValueToEscape = r.useRawValueToEscape !== void 0 ? r.useRawValueToEscape : !1, this.prefix = r.prefix ? Lr(r.prefix) : r.prefixEscaped || "{{", this.suffix = r.suffix ? Lr(r.suffix) : r.suffixEscaped || "}}", this.formatSeparator = r.formatSeparator ? r.formatSeparator : r.formatSeparator || ",", this.unescapePrefix = r.unescapeSuffix ? "" : r.unescapePrefix || "-", this.unescapeSuffix = this.unescapePrefix ? "" : r.unescapeSuffix || "", this.nestingPrefix = r.nestingPrefix ? Lr(r.nestingPrefix) : r.nestingPrefixEscaped || Lr("$t("), this.nestingSuffix = r.nestingSuffix ? Lr(r.nestingSuffix) : r.nestingSuffixEscaped || Lr(")"), this.nestingOptionsSeparator = r.nestingOptionsSeparator ? r.nestingOptionsSeparator : r.nestingOptionsSeparator || ",", this.maxReplaces = r.maxReplaces ? r.maxReplaces : 1e3, this.alwaysFormat = r.alwaysFormat !== void 0 ? r.alwaysFormat : !1, this.resetRegExp();
    }
  }, {
    key: "reset",
    value: function() {
      this.options && this.init(this.options);
    }
  }, {
    key: "resetRegExp",
    value: function() {
      var n = "".concat(this.prefix, "(.+?)").concat(this.suffix);
      this.regexp = new RegExp(n, "g");
      var r = "".concat(this.prefix).concat(this.unescapePrefix, "(.+?)").concat(this.unescapeSuffix).concat(this.suffix);
      this.regexpUnescape = new RegExp(r, "g");
      var o = "".concat(this.nestingPrefix, "(.+?)").concat(this.nestingSuffix);
      this.nestingRegexp = new RegExp(o, "g");
    }
  }, {
    key: "interpolate",
    value: function(n, r, o, a) {
      var i = this, s, l, c, d = this.options && this.options.interpolation && this.options.interpolation.defaultVariables || {};
      function f(b) {
        return b.replace(/\$/g, "$$$$");
      }
      var p = function(u) {
        if (u.indexOf(i.formatSeparator) < 0) {
          var h = Qd(r, d, u);
          return i.alwaysFormat ? i.format(h, void 0, o, Rt(Rt(Rt({}, a), r), {}, {
            interpolationkey: u
          })) : h;
        }
        var x = u.split(i.formatSeparator), w = x.shift().trim(), S = x.join(i.formatSeparator).trim();
        return i.format(Qd(r, d, w), S, o, Rt(Rt(Rt({}, a), r), {}, {
          interpolationkey: w
        }));
      };
      this.resetRegExp();
      var g = a && a.missingInterpolationHandler || this.options.missingInterpolationHandler, y = a && a.interpolation && a.interpolation.skipOnVariables !== void 0 ? a.interpolation.skipOnVariables : this.options.interpolation.skipOnVariables, m = [{
        regex: this.regexpUnescape,
        safeValue: function(u) {
          return f(u);
        }
      }, {
        regex: this.regexp,
        safeValue: function(u) {
          return i.escapeValue ? f(i.escape(u)) : f(u);
        }
      }];
      return m.forEach(function(b) {
        for (c = 0; s = b.regex.exec(n); ) {
          var u = s[1].trim();
          if (l = p(u), l === void 0)
            if (typeof g == "function") {
              var h = g(n, s, a);
              l = typeof h == "string" ? h : "";
            } else if (a && a.hasOwnProperty(u))
              l = "";
            else if (y) {
              l = s[0];
              continue;
            } else
              i.logger.warn("missed to pass in variable ".concat(u, " for interpolating ").concat(n)), l = "";
          else typeof l != "string" && !i.useRawValueToEscape && (l = Xd(l));
          var x = b.safeValue(l);
          if (n = n.replace(s[0], x), y ? (b.regex.lastIndex += l.length, b.regex.lastIndex -= s[0].length) : b.regex.lastIndex = 0, c++, c >= i.maxReplaces)
            break;
        }
      }), n;
    }
  }, {
    key: "nest",
    value: function(n, r) {
      var o = this, a = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {}, i, s, l = Rt({}, a);
      l.applyPostProcessor = !1, delete l.defaultValue;
      function c(g, y) {
        var m = this.nestingOptionsSeparator;
        if (g.indexOf(m) < 0) return g;
        var b = g.split(new RegExp("".concat(m, "[ ]*{"))), u = "{".concat(b[1]);
        g = b[0], u = this.interpolate(u, l);
        var h = u.match(/'/g), x = u.match(/"/g);
        (h && h.length % 2 === 0 && !x || x.length % 2 !== 0) && (u = u.replace(/'/g, '"'));
        try {
          l = JSON.parse(u), y && (l = Rt(Rt({}, y), l));
        } catch (w) {
          return this.logger.warn("failed parsing options string in nesting for key ".concat(g), w), "".concat(g).concat(m).concat(u);
        }
        return delete l.defaultValue, g;
      }
      for (; i = this.nestingRegexp.exec(n); ) {
        var d = [], f = !1;
        if (i[0].indexOf(this.formatSeparator) !== -1 && !/{.*}/.test(i[1])) {
          var p = i[1].split(this.formatSeparator).map(function(g) {
            return g.trim();
          });
          i[1] = p.shift(), d = p, f = !0;
        }
        if (s = r(c.call(this, i[1].trim(), l), l), s && i[0] === n && typeof s != "string") return s;
        typeof s != "string" && (s = Xd(s)), s || (this.logger.warn("missed to resolve ".concat(i[1], " for nesting ").concat(n)), s = ""), f && (s = d.reduce(function(g, y) {
          return o.format(g, y, a.lng, Rt(Rt({}, a), {}, {
            interpolationkey: i[1].trim()
          }));
        }, s.trim())), n = n.replace(i[0], s), this.regexp.lastIndex = 0;
      }
      return n;
    }
  }]), e;
}();
function af(e, t) {
  var n = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var r = Object.getOwnPropertySymbols(e);
    t && (r = r.filter(function(o) {
      return Object.getOwnPropertyDescriptor(e, o).enumerable;
    })), n.push.apply(n, r);
  }
  return n;
}
function An(e) {
  for (var t = 1; t < arguments.length; t++) {
    var n = arguments[t] != null ? arguments[t] : {};
    t % 2 ? af(Object(n), !0).forEach(function(r) {
      Nn(e, r, n[r]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(n)) : af(Object(n)).forEach(function(r) {
      Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(n, r));
    });
  }
  return e;
}
function yv(e) {
  var t = e.toLowerCase().trim(), n = {};
  if (e.indexOf("(") > -1) {
    var r = e.split("(");
    t = r[0].toLowerCase().trim();
    var o = r[1].substring(0, r[1].length - 1);
    if (t === "currency" && o.indexOf(":") < 0)
      n.currency || (n.currency = o.trim());
    else if (t === "relativetime" && o.indexOf(":") < 0)
      n.range || (n.range = o.trim());
    else {
      var a = o.split(";");
      a.forEach(function(i) {
        if (i) {
          var s = i.split(":"), l = Qg(s), c = l[0], d = l.slice(1), f = d.join(":").trim().replace(/^'+|'+$/g, "");
          n[c.trim()] || (n[c.trim()] = f), f === "false" && (n[c.trim()] = !1), f === "true" && (n[c.trim()] = !0), isNaN(f) || (n[c.trim()] = parseInt(f, 10));
        }
      });
    }
  }
  return {
    formatName: t,
    formatOptions: n
  };
}
var wv = function() {
  function e() {
    var t = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
    It(this, e), this.logger = nn.create("formatter"), this.options = t, this.formats = {
      number: function(r, o, a) {
        return new Intl.NumberFormat(o, a).format(r);
      },
      currency: function(r, o, a) {
        return new Intl.NumberFormat(o, An(An({}, a), {}, {
          style: "currency"
        })).format(r);
      },
      datetime: function(r, o, a) {
        return new Intl.DateTimeFormat(o, An({}, a)).format(r);
      },
      relativetime: function(r, o, a) {
        return new Intl.RelativeTimeFormat(o, An({}, a)).format(r, a.range || "day");
      },
      list: function(r, o, a) {
        return new Intl.ListFormat(o, An({}, a)).format(r);
      }
    }, this.init(t);
  }
  return Lt(e, [{
    key: "init",
    value: function(n) {
      var r = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {
        interpolation: {}
      }, o = r.interpolation;
      this.formatSeparator = o.formatSeparator ? o.formatSeparator : o.formatSeparator || ",";
    }
  }, {
    key: "add",
    value: function(n, r) {
      this.formats[n.toLowerCase().trim()] = r;
    }
  }, {
    key: "format",
    value: function(n, r, o, a) {
      var i = this, s = r.split(this.formatSeparator), l = s.reduce(function(c, d) {
        var f = yv(d), p = f.formatName, g = f.formatOptions;
        if (i.formats[p]) {
          var y = c;
          try {
            var m = a && a.formatParams && a.formatParams[a.interpolationkey] || {}, b = m.locale || m.lng || a.locale || a.lng || o;
            y = i.formats[p](c, b, An(An(An({}, g), a), m));
          } catch (u) {
            i.logger.warn(u);
          }
          return y;
        } else
          i.logger.warn("there was no format function for ".concat(p));
        return c;
      }, n);
      return l;
    }
  }]), e;
}();
function sf(e, t) {
  var n = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var r = Object.getOwnPropertySymbols(e);
    t && (r = r.filter(function(o) {
      return Object.getOwnPropertyDescriptor(e, o).enumerable;
    })), n.push.apply(n, r);
  }
  return n;
}
function lf(e) {
  for (var t = 1; t < arguments.length; t++) {
    var n = arguments[t] != null ? arguments[t] : {};
    t % 2 ? sf(Object(n), !0).forEach(function(r) {
      Nn(e, r, n[r]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(n)) : sf(Object(n)).forEach(function(r) {
      Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(n, r));
    });
  }
  return e;
}
function bv(e) {
  var t = _v();
  return function() {
    var r = un(e), o;
    if (t) {
      var a = un(this).constructor;
      o = Reflect.construct(r, arguments, a);
    } else
      o = r.apply(this, arguments);
    return Ua(this, o);
  };
}
function _v() {
  if (typeof Reflect > "u" || !Reflect.construct || Reflect.construct.sham) return !1;
  if (typeof Proxy == "function") return !0;
  try {
    return Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function() {
    })), !0;
  } catch {
    return !1;
  }
}
function Sv(e, t) {
  e.pending[t] !== void 0 && (delete e.pending[t], e.pendingCount--);
}
var kv = function(e) {
  Is(n, e);
  var t = bv(n);
  function n(r, o, a) {
    var i, s = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : {};
    return It(this, n), i = t.call(this), Ls && Qn.call(zn(i)), i.backend = r, i.store = o, i.services = a, i.languageUtils = a.languageUtils, i.options = s, i.logger = nn.create("backendConnector"), i.waitingReads = [], i.maxParallelReads = s.maxParallelReads || 10, i.readingCalls = 0, i.maxRetries = s.maxRetries >= 0 ? s.maxRetries : 5, i.retryTimeout = s.retryTimeout >= 1 ? s.retryTimeout : 350, i.state = {}, i.queue = [], i.backend && i.backend.init && i.backend.init(a, s.backend, s), i;
  }
  return Lt(n, [{
    key: "queueLoad",
    value: function(o, a, i, s) {
      var l = this, c = {}, d = {}, f = {}, p = {};
      return o.forEach(function(g) {
        var y = !0;
        a.forEach(function(m) {
          var b = "".concat(g, "|").concat(m);
          !i.reload && l.store.hasResourceBundle(g, m) ? l.state[b] = 2 : l.state[b] < 0 || (l.state[b] === 1 ? d[b] === void 0 && (d[b] = !0) : (l.state[b] = 1, y = !1, d[b] === void 0 && (d[b] = !0), c[b] === void 0 && (c[b] = !0), p[m] === void 0 && (p[m] = !0)));
        }), y || (f[g] = !0);
      }), (Object.keys(c).length || Object.keys(d).length) && this.queue.push({
        pending: d,
        pendingCount: Object.keys(d).length,
        loaded: {},
        errors: [],
        callback: s
      }), {
        toLoad: Object.keys(c),
        pending: Object.keys(d),
        toLoadLanguages: Object.keys(f),
        toLoadNamespaces: Object.keys(p)
      };
    }
  }, {
    key: "loaded",
    value: function(o, a, i) {
      var s = o.split("|"), l = s[0], c = s[1];
      a && this.emit("failedLoading", l, c, a), i && this.store.addResourceBundle(l, c, i), this.state[o] = a ? -1 : 2;
      var d = {};
      this.queue.forEach(function(f) {
        nv(f.loaded, [l], c), Sv(f, o), a && f.errors.push(a), f.pendingCount === 0 && !f.done && (Object.keys(f.loaded).forEach(function(p) {
          d[p] || (d[p] = {});
          var g = f.loaded[p];
          g.length && g.forEach(function(y) {
            d[p][y] === void 0 && (d[p][y] = !0);
          });
        }), f.done = !0, f.errors.length ? f.callback(f.errors) : f.callback());
      }), this.emit("loaded", d), this.queue = this.queue.filter(function(f) {
        return !f.done;
      });
    }
  }, {
    key: "read",
    value: function(o, a, i) {
      var s = this, l = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : 0, c = arguments.length > 4 && arguments[4] !== void 0 ? arguments[4] : this.retryTimeout, d = arguments.length > 5 ? arguments[5] : void 0;
      if (!o.length) return d(null, {});
      if (this.readingCalls >= this.maxParallelReads) {
        this.waitingReads.push({
          lng: o,
          ns: a,
          fcName: i,
          tried: l,
          wait: c,
          callback: d
        });
        return;
      }
      return this.readingCalls++, this.backend[i](o, a, function(f, p) {
        if (s.readingCalls--, s.waitingReads.length > 0) {
          var g = s.waitingReads.shift();
          s.read(g.lng, g.ns, g.fcName, g.tried, g.wait, g.callback);
        }
        if (f && p && l < s.maxRetries) {
          setTimeout(function() {
            s.read.call(s, o, a, i, l + 1, c * 2, d);
          }, c);
          return;
        }
        d(f, p);
      });
    }
  }, {
    key: "prepareLoading",
    value: function(o, a) {
      var i = this, s = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {}, l = arguments.length > 3 ? arguments[3] : void 0;
      if (!this.backend)
        return this.logger.warn("No backend was added via i18next.use. Will not load resources."), l && l();
      typeof o == "string" && (o = this.languageUtils.toResolveHierarchy(o)), typeof a == "string" && (a = [a]);
      var c = this.queueLoad(o, a, s, l);
      if (!c.toLoad.length)
        return c.pending.length || l(), null;
      c.toLoad.forEach(function(d) {
        i.loadOne(d);
      });
    }
  }, {
    key: "load",
    value: function(o, a, i) {
      this.prepareLoading(o, a, {}, i);
    }
  }, {
    key: "reload",
    value: function(o, a, i) {
      this.prepareLoading(o, a, {
        reload: !0
      }, i);
    }
  }, {
    key: "loadOne",
    value: function(o) {
      var a = this, i = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : "", s = o.split("|"), l = s[0], c = s[1];
      this.read(l, c, "read", void 0, void 0, function(d, f) {
        d && a.logger.warn("".concat(i, "loading namespace ").concat(c, " for language ").concat(l, " failed"), d), !d && f && a.logger.log("".concat(i, "loaded namespace ").concat(c, " for language ").concat(l), f), a.loaded(o, d, f);
      });
    }
  }, {
    key: "saveMissing",
    value: function(o, a, i, s, l) {
      var c = arguments.length > 5 && arguments[5] !== void 0 ? arguments[5] : {};
      if (this.services.utils && this.services.utils.hasLoadedNamespace && !this.services.utils.hasLoadedNamespace(a)) {
        this.logger.warn('did not save key "'.concat(i, '" as the namespace "').concat(a, '" was not yet loaded'), "This means something IS WRONG in your setup. You access the t function before i18next.init / i18next.loadNamespace / i18next.changeLanguage was done. Wait for the callback or Promise to resolve before accessing it!!!");
        return;
      }
      i == null || i === "" || (this.backend && this.backend.create && this.backend.create(o, a, i, s, null, lf(lf({}, c), {}, {
        isUpdate: l
      })), !(!o || !o[0]) && this.store.addResource(o[0], a, i, s));
    }
  }]), n;
}(Qn);
function Ev() {
  return {
    debug: !1,
    initImmediate: !0,
    ns: ["translation"],
    defaultNS: ["translation"],
    fallbackLng: ["dev"],
    fallbackNS: !1,
    supportedLngs: !1,
    nonExplicitSupportedLngs: !1,
    load: "all",
    preload: !1,
    simplifyPluralSuffix: !0,
    keySeparator: ".",
    nsSeparator: ":",
    pluralSeparator: "_",
    contextSeparator: "_",
    partialBundledLanguages: !1,
    saveMissing: !1,
    updateMissing: !1,
    saveMissingTo: "fallback",
    saveMissingPlurals: !0,
    missingKeyHandler: !1,
    missingInterpolationHandler: !1,
    postProcess: !1,
    postProcessPassResolved: !1,
    returnNull: !0,
    returnEmptyString: !0,
    returnObjects: !1,
    joinArrays: !1,
    returnedObjectHandler: !1,
    parseMissingKeyHandler: !1,
    appendNamespaceToMissingKey: !1,
    appendNamespaceToCIMode: !1,
    overloadTranslationOptionHandler: function(t) {
      var n = {};
      if (Ht(t[1]) === "object" && (n = t[1]), typeof t[1] == "string" && (n.defaultValue = t[1]), typeof t[2] == "string" && (n.tDescription = t[2]), Ht(t[2]) === "object" || Ht(t[3]) === "object") {
        var r = t[3] || t[2];
        Object.keys(r).forEach(function(o) {
          n[o] = r[o];
        });
      }
      return n;
    },
    interpolation: {
      escapeValue: !0,
      format: function(t, n, r, o) {
        return t;
      },
      prefix: "{{",
      suffix: "}}",
      formatSeparator: ",",
      unescapePrefix: "-",
      nestingPrefix: "$t(",
      nestingSuffix: ")",
      nestingOptionsSeparator: ",",
      maxReplaces: 1e3,
      skipOnVariables: !0
    }
  };
}
function uf(e) {
  return typeof e.ns == "string" && (e.ns = [e.ns]), typeof e.fallbackLng == "string" && (e.fallbackLng = [e.fallbackLng]), typeof e.fallbackNS == "string" && (e.fallbackNS = [e.fallbackNS]), e.supportedLngs && e.supportedLngs.indexOf("cimode") < 0 && (e.supportedLngs = e.supportedLngs.concat(["cimode"])), e;
}
function cf(e, t) {
  var n = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var r = Object.getOwnPropertySymbols(e);
    t && (r = r.filter(function(o) {
      return Object.getOwnPropertyDescriptor(e, o).enumerable;
    })), n.push.apply(n, r);
  }
  return n;
}
function Zt(e) {
  for (var t = 1; t < arguments.length; t++) {
    var n = arguments[t] != null ? arguments[t] : {};
    t % 2 ? cf(Object(n), !0).forEach(function(r) {
      Nn(e, r, n[r]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(n)) : cf(Object(n)).forEach(function(r) {
      Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(n, r));
    });
  }
  return e;
}
function Cv(e) {
  var t = Tv();
  return function() {
    var r = un(e), o;
    if (t) {
      var a = un(this).constructor;
      o = Reflect.construct(r, arguments, a);
    } else
      o = r.apply(this, arguments);
    return Ua(this, o);
  };
}
function Tv() {
  if (typeof Reflect > "u" || !Reflect.construct || Reflect.construct.sham) return !1;
  if (typeof Proxy == "function") return !0;
  try {
    return Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function() {
    })), !0;
  } catch {
    return !1;
  }
}
function qa() {
}
function Ov(e) {
  var t = Object.getOwnPropertyNames(Object.getPrototypeOf(e));
  t.forEach(function(n) {
    typeof e[n] == "function" && (e[n] = e[n].bind(e));
  });
}
var Fi = function(e) {
  Is(n, e);
  var t = Cv(n);
  function n() {
    var r, o = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {}, a = arguments.length > 1 ? arguments[1] : void 0;
    if (It(this, n), r = t.call(this), Ls && Qn.call(zn(r)), r.options = uf(o), r.services = {}, r.logger = nn, r.modules = {
      external: []
    }, Ov(zn(r)), a && !r.isInitialized && !o.isClone) {
      if (!r.options.initImmediate)
        return r.init(o, a), Ua(r, zn(r));
      setTimeout(function() {
        r.init(o, a);
      }, 0);
    }
    return r;
  }
  return Lt(n, [{
    key: "init",
    value: function() {
      var o = this, a = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {}, i = arguments.length > 1 ? arguments[1] : void 0;
      typeof a == "function" && (i = a, a = {}), !a.defaultNS && a.defaultNS !== !1 && a.ns && (typeof a.ns == "string" ? a.defaultNS = a.ns : a.ns.indexOf("translation") < 0 && (a.defaultNS = a.ns[0]));
      var s = Ev();
      this.options = Zt(Zt(Zt({}, s), this.options), uf(a)), this.options.compatibilityAPI !== "v1" && (this.options.interpolation = Zt(Zt({}, s.interpolation), this.options.interpolation)), a.keySeparator !== void 0 && (this.options.userDefinedKeySeparator = a.keySeparator), a.nsSeparator !== void 0 && (this.options.userDefinedNsSeparator = a.nsSeparator);
      function l(u) {
        return u ? typeof u == "function" ? new u() : u : null;
      }
      if (!this.options.isClone) {
        this.modules.logger ? nn.init(l(this.modules.logger), this.options) : nn.init(null, this.options);
        var c;
        this.modules.formatter ? c = this.modules.formatter : typeof Intl < "u" && (c = wv);
        var d = new fv(this.options);
        this.store = new uv(this.options.resources, this.options);
        var f = this.services;
        f.logger = nn, f.resourceStore = this.store, f.languageUtils = d, f.pluralResolver = new gv(d, {
          prepend: this.options.pluralSeparator,
          compatibilityJSON: this.options.compatibilityJSON,
          simplifyPluralSuffix: this.options.simplifyPluralSuffix
        }), c && (!this.options.interpolation.format || this.options.interpolation.format === s.interpolation.format) && (f.formatter = l(c), f.formatter.init(f, this.options), this.options.interpolation.format = f.formatter.format.bind(f.formatter)), f.interpolator = new vv(this.options), f.utils = {
          hasLoadedNamespace: this.hasLoadedNamespace.bind(this)
        }, f.backendConnector = new kv(l(this.modules.backend), f.resourceStore, f, this.options), f.backendConnector.on("*", function(u) {
          for (var h = arguments.length, x = new Array(h > 1 ? h - 1 : 0), w = 1; w < h; w++)
            x[w - 1] = arguments[w];
          o.emit.apply(o, [u].concat(x));
        }), this.modules.languageDetector && (f.languageDetector = l(this.modules.languageDetector), f.languageDetector.init(f, this.options.detection, this.options)), this.modules.i18nFormat && (f.i18nFormat = l(this.modules.i18nFormat), f.i18nFormat.init && f.i18nFormat.init(this)), this.translator = new nf(this.services, this.options), this.translator.on("*", function(u) {
          for (var h = arguments.length, x = new Array(h > 1 ? h - 1 : 0), w = 1; w < h; w++)
            x[w - 1] = arguments[w];
          o.emit.apply(o, [u].concat(x));
        }), this.modules.external.forEach(function(u) {
          u.init && u.init(o);
        });
      }
      if (this.format = this.options.interpolation.format, i || (i = qa), this.options.fallbackLng && !this.services.languageDetector && !this.options.lng) {
        var p = this.services.languageUtils.getFallbackCodes(this.options.fallbackLng);
        p.length > 0 && p[0] !== "dev" && (this.options.lng = p[0]);
      }
      !this.services.languageDetector && !this.options.lng && this.logger.warn("init: no languageDetector is used and no lng is defined");
      var g = ["getResource", "hasResourceBundle", "getResourceBundle", "getDataByLanguage"];
      g.forEach(function(u) {
        o[u] = function() {
          var h;
          return (h = o.store)[u].apply(h, arguments);
        };
      });
      var y = ["addResource", "addResources", "addResourceBundle", "removeResourceBundle"];
      y.forEach(function(u) {
        o[u] = function() {
          var h;
          return (h = o.store)[u].apply(h, arguments), o;
        };
      });
      var m = Co(), b = function() {
        var h = function(w, S) {
          o.isInitialized && !o.initializedStoreOnce && o.logger.warn("init: i18next is already initialized. You should call init just once!"), o.isInitialized = !0, o.options.isClone || o.logger.log("initialized", o.options), o.emit("initialized", o.options), m.resolve(S), i(w, S);
        };
        if (o.languages && o.options.compatibilityAPI !== "v1" && !o.isInitialized) return h(null, o.t.bind(o));
        o.changeLanguage(o.options.lng, h);
      };
      return this.options.resources || !this.options.initImmediate ? b() : setTimeout(b, 0), m;
    }
  }, {
    key: "loadResources",
    value: function(o) {
      var a = this, i = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : qa, s = i, l = typeof o == "string" ? o : this.language;
      if (typeof o == "function" && (s = o), !this.options.resources || this.options.partialBundledLanguages) {
        if (l && l.toLowerCase() === "cimode") return s();
        var c = [], d = function(g) {
          if (g) {
            var y = a.services.languageUtils.toResolveHierarchy(g);
            y.forEach(function(m) {
              c.indexOf(m) < 0 && c.push(m);
            });
          }
        };
        if (l)
          d(l);
        else {
          var f = this.services.languageUtils.getFallbackCodes(this.options.fallbackLng);
          f.forEach(function(p) {
            return d(p);
          });
        }
        this.options.preload && this.options.preload.forEach(function(p) {
          return d(p);
        }), this.services.backendConnector.load(c, this.options.ns, function(p) {
          !p && !a.resolvedLanguage && a.language && a.setResolvedLanguage(a.language), s(p);
        });
      } else
        s(null);
    }
  }, {
    key: "reloadResources",
    value: function(o, a, i) {
      var s = Co();
      return o || (o = this.languages), a || (a = this.options.ns), i || (i = qa), this.services.backendConnector.reload(o, a, function(l) {
        s.resolve(), i(l);
      }), s;
    }
  }, {
    key: "use",
    value: function(o) {
      if (!o) throw new Error("You are passing an undefined module! Please check the object you are passing to i18next.use()");
      if (!o.type) throw new Error("You are passing a wrong module! Please check the object you are passing to i18next.use()");
      return o.type === "backend" && (this.modules.backend = o), (o.type === "logger" || o.log && o.warn && o.error) && (this.modules.logger = o), o.type === "languageDetector" && (this.modules.languageDetector = o), o.type === "i18nFormat" && (this.modules.i18nFormat = o), o.type === "postProcessor" && Ap.addPostProcessor(o), o.type === "formatter" && (this.modules.formatter = o), o.type === "3rdParty" && this.modules.external.push(o), this;
    }
  }, {
    key: "setResolvedLanguage",
    value: function(o) {
      if (!(!o || !this.languages) && !(["cimode", "dev"].indexOf(o) > -1))
        for (var a = 0; a < this.languages.length; a++) {
          var i = this.languages[a];
          if (!(["cimode", "dev"].indexOf(i) > -1) && this.store.hasLanguageSomeTranslations(i)) {
            this.resolvedLanguage = i;
            break;
          }
        }
    }
  }, {
    key: "changeLanguage",
    value: function(o, a) {
      var i = this;
      this.isLanguageChangingTo = o;
      var s = Co();
      this.emit("languageChanging", o);
      var l = function(p) {
        i.language = p, i.languages = i.services.languageUtils.toResolveHierarchy(p), i.resolvedLanguage = void 0, i.setResolvedLanguage(p);
      }, c = function(p, g) {
        g ? (l(g), i.translator.changeLanguage(g), i.isLanguageChangingTo = void 0, i.emit("languageChanged", g), i.logger.log("languageChanged", g)) : i.isLanguageChangingTo = void 0, s.resolve(function() {
          return i.t.apply(i, arguments);
        }), a && a(p, function() {
          return i.t.apply(i, arguments);
        });
      }, d = function(p) {
        !o && !p && i.services.languageDetector && (p = []);
        var g = typeof p == "string" ? p : i.services.languageUtils.getBestMatchFromCodes(p);
        g && (i.language || l(g), i.translator.language || i.translator.changeLanguage(g), i.services.languageDetector && i.services.languageDetector.cacheUserLanguage(g)), i.loadResources(g, function(y) {
          c(y, g);
        });
      };
      return !o && this.services.languageDetector && !this.services.languageDetector.async ? d(this.services.languageDetector.detect()) : !o && this.services.languageDetector && this.services.languageDetector.async ? this.services.languageDetector.detect(d) : d(o), s;
    }
  }, {
    key: "getFixedT",
    value: function(o, a, i) {
      var s = this, l = function c(d, f) {
        var p;
        if (Ht(f) !== "object") {
          for (var g = arguments.length, y = new Array(g > 2 ? g - 2 : 0), m = 2; m < g; m++)
            y[m - 2] = arguments[m];
          p = s.options.overloadTranslationOptionHandler([d, f].concat(y));
        } else
          p = Zt({}, f);
        p.lng = p.lng || c.lng, p.lngs = p.lngs || c.lngs, p.ns = p.ns || c.ns, p.keyPrefix = p.keyPrefix || i || c.keyPrefix;
        var b = s.options.keySeparator || ".", u = p.keyPrefix ? "".concat(p.keyPrefix).concat(b).concat(d) : d;
        return s.t(u, p);
      };
      return typeof o == "string" ? l.lng = o : l.lngs = o, l.ns = a, l.keyPrefix = i, l;
    }
  }, {
    key: "t",
    value: function() {
      var o;
      return this.translator && (o = this.translator).translate.apply(o, arguments);
    }
  }, {
    key: "exists",
    value: function() {
      var o;
      return this.translator && (o = this.translator).exists.apply(o, arguments);
    }
  }, {
    key: "setDefaultNamespace",
    value: function(o) {
      this.options.defaultNS = o;
    }
  }, {
    key: "hasLoadedNamespace",
    value: function(o) {
      var a = this, i = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
      if (!this.isInitialized)
        return this.logger.warn("hasLoadedNamespace: i18next was not initialized", this.languages), !1;
      if (!this.languages || !this.languages.length)
        return this.logger.warn("hasLoadedNamespace: i18n.languages were undefined or empty", this.languages), !1;
      var s = this.resolvedLanguage || this.languages[0], l = this.options ? this.options.fallbackLng : !1, c = this.languages[this.languages.length - 1];
      if (s.toLowerCase() === "cimode") return !0;
      var d = function(g, y) {
        var m = a.services.backendConnector.state["".concat(g, "|").concat(y)];
        return m === -1 || m === 2;
      };
      if (i.precheck) {
        var f = i.precheck(this, d);
        if (f !== void 0) return f;
      }
      return !!(this.hasResourceBundle(s, o) || !this.services.backendConnector.backend || this.options.resources && !this.options.partialBundledLanguages || d(s, o) && (!l || d(c, o)));
    }
  }, {
    key: "loadNamespaces",
    value: function(o, a) {
      var i = this, s = Co();
      return this.options.ns ? (typeof o == "string" && (o = [o]), o.forEach(function(l) {
        i.options.ns.indexOf(l) < 0 && i.options.ns.push(l);
      }), this.loadResources(function(l) {
        s.resolve(), a && a(l);
      }), s) : (a && a(), Promise.resolve());
    }
  }, {
    key: "loadLanguages",
    value: function(o, a) {
      var i = Co();
      typeof o == "string" && (o = [o]);
      var s = this.options.preload || [], l = o.filter(function(c) {
        return s.indexOf(c) < 0;
      });
      return l.length ? (this.options.preload = s.concat(l), this.loadResources(function(c) {
        i.resolve(), a && a(c);
      }), i) : (a && a(), Promise.resolve());
    }
  }, {
    key: "dir",
    value: function(o) {
      if (o || (o = this.resolvedLanguage || (this.languages && this.languages.length > 0 ? this.languages[0] : this.language)), !o) return "rtl";
      var a = ["ar", "shu", "sqr", "ssh", "xaa", "yhd", "yud", "aao", "abh", "abv", "acm", "acq", "acw", "acx", "acy", "adf", "ads", "aeb", "aec", "afb", "ajp", "apc", "apd", "arb", "arq", "ars", "ary", "arz", "auz", "avl", "ayh", "ayl", "ayn", "ayp", "bbz", "pga", "he", "iw", "ps", "pbt", "pbu", "pst", "prp", "prd", "ug", "ur", "ydd", "yds", "yih", "ji", "yi", "hbo", "men", "xmn", "fa", "jpr", "peo", "pes", "prs", "dv", "sam", "ckb"];
      return a.indexOf(this.services.languageUtils.getLanguagePartFromCode(o)) > -1 || o.toLowerCase().indexOf("-arab") > 1 ? "rtl" : "ltr";
    }
  }, {
    key: "cloneInstance",
    value: function() {
      var o = this, a = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {}, i = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : qa, s = Zt(Zt(Zt({}, this.options), a), {
        isClone: !0
      }), l = new n(s);
      (a.debug !== void 0 || a.prefix !== void 0) && (l.logger = l.logger.clone(a));
      var c = ["store", "services", "language"];
      return c.forEach(function(d) {
        l[d] = o[d];
      }), l.services = Zt({}, this.services), l.services.utils = {
        hasLoadedNamespace: l.hasLoadedNamespace.bind(l)
      }, l.translator = new nf(l.services, l.options), l.translator.on("*", function(d) {
        for (var f = arguments.length, p = new Array(f > 1 ? f - 1 : 0), g = 1; g < f; g++)
          p[g - 1] = arguments[g];
        l.emit.apply(l, [d].concat(p));
      }), l.init(s, i), l.translator.options = l.options, l.translator.backendConnector.services.utils = {
        hasLoadedNamespace: l.hasLoadedNamespace.bind(l)
      }, l;
    }
  }, {
    key: "toJSON",
    value: function() {
      return {
        options: this.options,
        store: this.store,
        language: this.language,
        languages: this.languages,
        resolvedLanguage: this.resolvedLanguage
      };
    }
  }]), n;
}(Qn);
Nn(Fi, "createInstance", function() {
  var e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {}, t = arguments.length > 1 ? arguments[1] : void 0;
  return new Fi(e, t);
});
var lo = Fi.createInstance();
lo.createInstance = Fi.createInstance;
var Rp = [], Nv = Rp.forEach, Iv = Rp.slice;
function Lv(e) {
  return Nv.call(Iv.call(arguments, 1), function(t) {
    if (t)
      for (var n in t)
        e[n] === void 0 && (e[n] = t[n]);
  }), e;
}
var df = /^[\u0009\u0020-\u007e\u0080-\u00ff]+$/, Av = function(t, n, r) {
  var o = r || {};
  o.path = o.path || "/";
  var a = encodeURIComponent(n), i = "".concat(t, "=").concat(a);
  if (o.maxAge > 0) {
    var s = o.maxAge - 0;
    if (Number.isNaN(s)) throw new Error("maxAge should be a Number");
    i += "; Max-Age=".concat(Math.floor(s));
  }
  if (o.domain) {
    if (!df.test(o.domain))
      throw new TypeError("option domain is invalid");
    i += "; Domain=".concat(o.domain);
  }
  if (o.path) {
    if (!df.test(o.path))
      throw new TypeError("option path is invalid");
    i += "; Path=".concat(o.path);
  }
  if (o.expires) {
    if (typeof o.expires.toUTCString != "function")
      throw new TypeError("option expires is invalid");
    i += "; Expires=".concat(o.expires.toUTCString());
  }
  if (o.httpOnly && (i += "; HttpOnly"), o.secure && (i += "; Secure"), o.sameSite) {
    var l = typeof o.sameSite == "string" ? o.sameSite.toLowerCase() : o.sameSite;
    switch (l) {
      case !0:
        i += "; SameSite=Strict";
        break;
      case "lax":
        i += "; SameSite=Lax";
        break;
      case "strict":
        i += "; SameSite=Strict";
        break;
      case "none":
        i += "; SameSite=None";
        break;
      default:
        throw new TypeError("option sameSite is invalid");
    }
  }
  return i;
}, ff = {
  create: function(t, n, r, o) {
    var a = arguments.length > 4 && arguments[4] !== void 0 ? arguments[4] : {
      path: "/",
      sameSite: "strict"
    };
    r && (a.expires = /* @__PURE__ */ new Date(), a.expires.setTime(a.expires.getTime() + r * 60 * 1e3)), o && (a.domain = o), document.cookie = Av(t, encodeURIComponent(n), a);
  },
  read: function(t) {
    for (var n = "".concat(t, "="), r = document.cookie.split(";"), o = 0; o < r.length; o++) {
      for (var a = r[o]; a.charAt(0) === " "; ) a = a.substring(1, a.length);
      if (a.indexOf(n) === 0) return a.substring(n.length, a.length);
    }
    return null;
  },
  remove: function(t) {
    this.create(t, "", -1);
  }
}, Rv = {
  name: "cookie",
  lookup: function(t) {
    var n;
    if (t.lookupCookie && typeof document < "u") {
      var r = ff.read(t.lookupCookie);
      r && (n = r);
    }
    return n;
  },
  cacheUserLanguage: function(t, n) {
    n.lookupCookie && typeof document < "u" && ff.create(n.lookupCookie, t, n.cookieMinutes, n.cookieDomain, n.cookieOptions);
  }
}, Pv = {
  name: "querystring",
  lookup: function(t) {
    var n;
    if (typeof window < "u") {
      var r = window.location.search;
      !window.location.search && window.location.hash && window.location.hash.indexOf("?") > -1 && (r = window.location.hash.substring(window.location.hash.indexOf("?")));
      for (var o = r.substring(1), a = o.split("&"), i = 0; i < a.length; i++) {
        var s = a[i].indexOf("=");
        if (s > 0) {
          var l = a[i].substring(0, s);
          l === t.lookupQuerystring && (n = a[i].substring(s + 1));
        }
      }
    }
    return n;
  }
}, To = null, pf = function() {
  if (To !== null) return To;
  try {
    To = window !== "undefined" && window.localStorage !== null;
    var t = "i18next.translate.boo";
    window.localStorage.setItem(t, "foo"), window.localStorage.removeItem(t);
  } catch {
    To = !1;
  }
  return To;
}, Dv = {
  name: "localStorage",
  lookup: function(t) {
    var n;
    if (t.lookupLocalStorage && pf()) {
      var r = window.localStorage.getItem(t.lookupLocalStorage);
      r && (n = r);
    }
    return n;
  },
  cacheUserLanguage: function(t, n) {
    n.lookupLocalStorage && pf() && window.localStorage.setItem(n.lookupLocalStorage, t);
  }
}, Oo = null, hf = function() {
  if (Oo !== null) return Oo;
  try {
    Oo = window !== "undefined" && window.sessionStorage !== null;
    var t = "i18next.translate.boo";
    window.sessionStorage.setItem(t, "foo"), window.sessionStorage.removeItem(t);
  } catch {
    Oo = !1;
  }
  return Oo;
}, $v = {
  name: "sessionStorage",
  lookup: function(t) {
    var n;
    if (t.lookupSessionStorage && hf()) {
      var r = window.sessionStorage.getItem(t.lookupSessionStorage);
      r && (n = r);
    }
    return n;
  },
  cacheUserLanguage: function(t, n) {
    n.lookupSessionStorage && hf() && window.sessionStorage.setItem(n.lookupSessionStorage, t);
  }
}, Mv = {
  name: "navigator",
  lookup: function(t) {
    var n = [];
    if (typeof navigator < "u") {
      if (navigator.languages)
        for (var r = 0; r < navigator.languages.length; r++)
          n.push(navigator.languages[r]);
      navigator.userLanguage && n.push(navigator.userLanguage), navigator.language && n.push(navigator.language);
    }
    return n.length > 0 ? n : void 0;
  }
}, jv = {
  name: "htmlTag",
  lookup: function(t) {
    var n, r = t.htmlTag || (typeof document < "u" ? document.documentElement : null);
    return r && typeof r.getAttribute == "function" && (n = r.getAttribute("lang")), n;
  }
}, Fv = {
  name: "path",
  lookup: function(t) {
    var n;
    if (typeof window < "u") {
      var r = window.location.pathname.match(/\/([a-zA-Z-]*)/g);
      if (r instanceof Array)
        if (typeof t.lookupFromPathIndex == "number") {
          if (typeof r[t.lookupFromPathIndex] != "string")
            return;
          n = r[t.lookupFromPathIndex].replace("/", "");
        } else
          n = r[0].replace("/", "");
    }
    return n;
  }
}, Hv = {
  name: "subdomain",
  lookup: function(t) {
    var n = typeof t.lookupFromSubdomainIndex == "number" ? t.lookupFromSubdomainIndex + 1 : 1, r = typeof window < "u" && window.location && window.location.hostname && window.location.hostname.match(/^(\w{2,5})\.(([a-z0-9-]{1,63}\.[a-z]{2,6})|localhost)/i);
    if (r)
      return r[n];
  }
};
function Uv() {
  return {
    order: ["querystring", "cookie", "localStorage", "sessionStorage", "navigator", "htmlTag"],
    lookupQuerystring: "lng",
    lookupCookie: "i18next",
    lookupLocalStorage: "i18nextLng",
    lookupSessionStorage: "i18nextLng",
    // cache user language
    caches: ["localStorage"],
    excludeCacheFor: ["cimode"],
    // cookieMinutes: 10,
    // cookieDomain: 'myDomain'
    convertDetectedLanguage: function(t) {
      return t;
    }
  };
}
var Pp = /* @__PURE__ */ function() {
  function e(t) {
    var n = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
    It(this, e), this.type = "languageDetector", this.detectors = {}, this.init(t, n);
  }
  return Lt(e, [{
    key: "init",
    value: function(n) {
      var r = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {}, o = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {};
      this.services = n || {
        languageUtils: {}
      }, this.options = Lv(r, this.options || {}, Uv()), typeof this.options.convertDetectedLanguage == "string" && this.options.convertDetectedLanguage.indexOf("15897") > -1 && (this.options.convertDetectedLanguage = function(a) {
        return a.replace("-", "_");
      }), this.options.lookupFromUrlIndex && (this.options.lookupFromPathIndex = this.options.lookupFromUrlIndex), this.i18nOptions = o, this.addDetector(Rv), this.addDetector(Pv), this.addDetector(Dv), this.addDetector($v), this.addDetector(Mv), this.addDetector(jv), this.addDetector(Fv), this.addDetector(Hv);
    }
  }, {
    key: "addDetector",
    value: function(n) {
      return this.detectors[n.name] = n, this;
    }
  }, {
    key: "detect",
    value: function(n) {
      var r = this;
      n || (n = this.options.order);
      var o = [];
      return n.forEach(function(a) {
        if (r.detectors[a]) {
          var i = r.detectors[a].lookup(r.options);
          i && typeof i == "string" && (i = [i]), i && (o = o.concat(i));
        }
      }), o = o.map(function(a) {
        return r.options.convertDetectedLanguage(a);
      }), this.services.languageUtils.getBestMatchFromCodes ? o : o.length > 0 ? o[0] : null;
    }
  }, {
    key: "cacheUserLanguage",
    value: function(n, r) {
      var o = this;
      r || (r = this.options.caches), r && (this.options.excludeCacheFor && this.options.excludeCacheFor.indexOf(n) > -1 || r.forEach(function(a) {
        o.detectors[a] && o.detectors[a].cacheUserLanguage(n, o.options);
      }));
    }
  }]), e;
}();
Pp.type = "languageDetector";
function tu(e) {
  "@babel/helpers - typeof";
  return tu = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(t) {
    return typeof t;
  } : function(t) {
    return t && typeof Symbol == "function" && t.constructor === Symbol && t !== Symbol.prototype ? "symbol" : typeof t;
  }, tu(e);
}
var Dp = [], Vv = Dp.forEach, zv = Dp.slice;
function nu(e) {
  return Vv.call(zv.call(arguments, 1), function(t) {
    if (t)
      for (var n in t)
        e[n] === void 0 && (e[n] = t[n]);
  }), e;
}
function $p() {
  return typeof XMLHttpRequest == "function" || (typeof XMLHttpRequest > "u" ? "undefined" : tu(XMLHttpRequest)) === "object";
}
function Bv(e) {
  return !!e && typeof e.then == "function";
}
function Wv(e) {
  return Bv(e) ? e : Promise.resolve(e);
}
function Gv(e) {
  throw new Error('Could not dynamically require "' + e + '". Please configure the dynamicRequireTargets or/and ignoreDynamicRequires option of @rollup/plugin-commonjs appropriately for this require call to work.');
}
var ru = { exports: {} }, ei = { exports: {} }, mf;
function Zv() {
  return mf || (mf = 1, function(e, t) {
    var n = typeof self < "u" ? self : yi, r = function() {
      function a() {
        this.fetch = !1, this.DOMException = n.DOMException;
      }
      return a.prototype = n, new a();
    }();
    (function(a) {
      (function(i) {
        var s = {
          searchParams: "URLSearchParams" in a,
          iterable: "Symbol" in a && "iterator" in Symbol,
          blob: "FileReader" in a && "Blob" in a && function() {
            try {
              return new Blob(), !0;
            } catch {
              return !1;
            }
          }(),
          formData: "FormData" in a,
          arrayBuffer: "ArrayBuffer" in a
        };
        function l(_) {
          return _ && DataView.prototype.isPrototypeOf(_);
        }
        if (s.arrayBuffer)
          var c = [
            "[object Int8Array]",
            "[object Uint8Array]",
            "[object Uint8ClampedArray]",
            "[object Int16Array]",
            "[object Uint16Array]",
            "[object Int32Array]",
            "[object Uint32Array]",
            "[object Float32Array]",
            "[object Float64Array]"
          ], d = ArrayBuffer.isView || function(_) {
            return _ && c.indexOf(Object.prototype.toString.call(_)) > -1;
          };
        function f(_) {
          if (typeof _ != "string" && (_ = String(_)), /[^a-z0-9\-#$%&'*+.^_`|~]/i.test(_))
            throw new TypeError("Invalid character in header field name");
          return _.toLowerCase();
        }
        function p(_) {
          return typeof _ != "string" && (_ = String(_)), _;
        }
        function g(_) {
          var I = {
            next: function() {
              var U = _.shift();
              return { done: U === void 0, value: U };
            }
          };
          return s.iterable && (I[Symbol.iterator] = function() {
            return I;
          }), I;
        }
        function y(_) {
          this.map = {}, _ instanceof y ? _.forEach(function(I, U) {
            this.append(U, I);
          }, this) : Array.isArray(_) ? _.forEach(function(I) {
            this.append(I[0], I[1]);
          }, this) : _ && Object.getOwnPropertyNames(_).forEach(function(I) {
            this.append(I, _[I]);
          }, this);
        }
        y.prototype.append = function(_, I) {
          _ = f(_), I = p(I);
          var U = this.map[_];
          this.map[_] = U ? U + ", " + I : I;
        }, y.prototype.delete = function(_) {
          delete this.map[f(_)];
        }, y.prototype.get = function(_) {
          return _ = f(_), this.has(_) ? this.map[_] : null;
        }, y.prototype.has = function(_) {
          return this.map.hasOwnProperty(f(_));
        }, y.prototype.set = function(_, I) {
          this.map[f(_)] = p(I);
        }, y.prototype.forEach = function(_, I) {
          for (var U in this.map)
            this.map.hasOwnProperty(U) && _.call(I, this.map[U], U, this);
        }, y.prototype.keys = function() {
          var _ = [];
          return this.forEach(function(I, U) {
            _.push(U);
          }), g(_);
        }, y.prototype.values = function() {
          var _ = [];
          return this.forEach(function(I) {
            _.push(I);
          }), g(_);
        }, y.prototype.entries = function() {
          var _ = [];
          return this.forEach(function(I, U) {
            _.push([U, I]);
          }), g(_);
        }, s.iterable && (y.prototype[Symbol.iterator] = y.prototype.entries);
        function m(_) {
          if (_.bodyUsed)
            return Promise.reject(new TypeError("Already read"));
          _.bodyUsed = !0;
        }
        function b(_) {
          return new Promise(function(I, U) {
            _.onload = function() {
              I(_.result);
            }, _.onerror = function() {
              U(_.error);
            };
          });
        }
        function u(_) {
          var I = new FileReader(), U = b(I);
          return I.readAsArrayBuffer(_), U;
        }
        function h(_) {
          var I = new FileReader(), U = b(I);
          return I.readAsText(_), U;
        }
        function x(_) {
          for (var I = new Uint8Array(_), U = new Array(I.length), de = 0; de < I.length; de++)
            U[de] = String.fromCharCode(I[de]);
          return U.join("");
        }
        function w(_) {
          if (_.slice)
            return _.slice(0);
          var I = new Uint8Array(_.byteLength);
          return I.set(new Uint8Array(_)), I.buffer;
        }
        function S() {
          return this.bodyUsed = !1, this._initBody = function(_) {
            this._bodyInit = _, _ ? typeof _ == "string" ? this._bodyText = _ : s.blob && Blob.prototype.isPrototypeOf(_) ? this._bodyBlob = _ : s.formData && FormData.prototype.isPrototypeOf(_) ? this._bodyFormData = _ : s.searchParams && URLSearchParams.prototype.isPrototypeOf(_) ? this._bodyText = _.toString() : s.arrayBuffer && s.blob && l(_) ? (this._bodyArrayBuffer = w(_.buffer), this._bodyInit = new Blob([this._bodyArrayBuffer])) : s.arrayBuffer && (ArrayBuffer.prototype.isPrototypeOf(_) || d(_)) ? this._bodyArrayBuffer = w(_) : this._bodyText = _ = Object.prototype.toString.call(_) : this._bodyText = "", this.headers.get("content-type") || (typeof _ == "string" ? this.headers.set("content-type", "text/plain;charset=UTF-8") : this._bodyBlob && this._bodyBlob.type ? this.headers.set("content-type", this._bodyBlob.type) : s.searchParams && URLSearchParams.prototype.isPrototypeOf(_) && this.headers.set("content-type", "application/x-www-form-urlencoded;charset=UTF-8"));
          }, s.blob && (this.blob = function() {
            var _ = m(this);
            if (_)
              return _;
            if (this._bodyBlob)
              return Promise.resolve(this._bodyBlob);
            if (this._bodyArrayBuffer)
              return Promise.resolve(new Blob([this._bodyArrayBuffer]));
            if (this._bodyFormData)
              throw new Error("could not read FormData body as blob");
            return Promise.resolve(new Blob([this._bodyText]));
          }, this.arrayBuffer = function() {
            return this._bodyArrayBuffer ? m(this) || Promise.resolve(this._bodyArrayBuffer) : this.blob().then(u);
          }), this.text = function() {
            var _ = m(this);
            if (_)
              return _;
            if (this._bodyBlob)
              return h(this._bodyBlob);
            if (this._bodyArrayBuffer)
              return Promise.resolve(x(this._bodyArrayBuffer));
            if (this._bodyFormData)
              throw new Error("could not read FormData body as text");
            return Promise.resolve(this._bodyText);
          }, s.formData && (this.formData = function() {
            return this.text().then(P);
          }), this.json = function() {
            return this.text().then(JSON.parse);
          }, this;
        }
        var E = ["DELETE", "GET", "HEAD", "OPTIONS", "POST", "PUT"];
        function k(_) {
          var I = _.toUpperCase();
          return E.indexOf(I) > -1 ? I : _;
        }
        function L(_, I) {
          I = I || {};
          var U = I.body;
          if (_ instanceof L) {
            if (_.bodyUsed)
              throw new TypeError("Already read");
            this.url = _.url, this.credentials = _.credentials, I.headers || (this.headers = new y(_.headers)), this.method = _.method, this.mode = _.mode, this.signal = _.signal, !U && _._bodyInit != null && (U = _._bodyInit, _.bodyUsed = !0);
          } else
            this.url = String(_);
          if (this.credentials = I.credentials || this.credentials || "same-origin", (I.headers || !this.headers) && (this.headers = new y(I.headers)), this.method = k(I.method || this.method || "GET"), this.mode = I.mode || this.mode || null, this.signal = I.signal || this.signal, this.referrer = null, (this.method === "GET" || this.method === "HEAD") && U)
            throw new TypeError("Body not allowed for GET or HEAD requests");
          this._initBody(U);
        }
        L.prototype.clone = function() {
          return new L(this, { body: this._bodyInit });
        };
        function P(_) {
          var I = new FormData();
          return _.trim().split("&").forEach(function(U) {
            if (U) {
              var de = U.split("="), N = de.shift().replace(/\+/g, " "), A = de.join("=").replace(/\+/g, " ");
              I.append(decodeURIComponent(N), decodeURIComponent(A));
            }
          }), I;
        }
        function O(_) {
          var I = new y(), U = _.replace(/\r?\n[\t ]+/g, " ");
          return U.split(/\r?\n/).forEach(function(de) {
            var N = de.split(":"), A = N.shift().trim();
            if (A) {
              var B = N.join(":").trim();
              I.append(A, B);
            }
          }), I;
        }
        S.call(L.prototype);
        function j(_, I) {
          I || (I = {}), this.type = "default", this.status = I.status === void 0 ? 200 : I.status, this.ok = this.status >= 200 && this.status < 300, this.statusText = "statusText" in I ? I.statusText : "OK", this.headers = new y(I.headers), this.url = I.url || "", this._initBody(_);
        }
        S.call(j.prototype), j.prototype.clone = function() {
          return new j(this._bodyInit, {
            status: this.status,
            statusText: this.statusText,
            headers: new y(this.headers),
            url: this.url
          });
        }, j.error = function() {
          var _ = new j(null, { status: 0, statusText: "" });
          return _.type = "error", _;
        };
        var ne = [301, 302, 303, 307, 308];
        j.redirect = function(_, I) {
          if (ne.indexOf(I) === -1)
            throw new RangeError("Invalid status code");
          return new j(null, { status: I, headers: { location: _ } });
        }, i.DOMException = a.DOMException;
        try {
          new i.DOMException();
        } catch {
          i.DOMException = function(I, U) {
            this.message = I, this.name = U;
            var de = Error(I);
            this.stack = de.stack;
          }, i.DOMException.prototype = Object.create(Error.prototype), i.DOMException.prototype.constructor = i.DOMException;
        }
        function Ae(_, I) {
          return new Promise(function(U, de) {
            var N = new L(_, I);
            if (N.signal && N.signal.aborted)
              return de(new i.DOMException("Aborted", "AbortError"));
            var A = new XMLHttpRequest();
            function B() {
              A.abort();
            }
            A.onload = function() {
              var J = {
                status: A.status,
                statusText: A.statusText,
                headers: O(A.getAllResponseHeaders() || "")
              };
              J.url = "responseURL" in A ? A.responseURL : J.headers.get("X-Request-URL");
              var fe = "response" in A ? A.response : A.responseText;
              U(new j(fe, J));
            }, A.onerror = function() {
              de(new TypeError("Network request failed"));
            }, A.ontimeout = function() {
              de(new TypeError("Network request failed"));
            }, A.onabort = function() {
              de(new i.DOMException("Aborted", "AbortError"));
            }, A.open(N.method, N.url, !0), N.credentials === "include" ? A.withCredentials = !0 : N.credentials === "omit" && (A.withCredentials = !1), "responseType" in A && s.blob && (A.responseType = "blob"), N.headers.forEach(function(J, fe) {
              A.setRequestHeader(fe, J);
            }), N.signal && (N.signal.addEventListener("abort", B), A.onreadystatechange = function() {
              A.readyState === 4 && N.signal.removeEventListener("abort", B);
            }), A.send(typeof N._bodyInit > "u" ? null : N._bodyInit);
          });
        }
        return Ae.polyfill = !0, a.fetch || (a.fetch = Ae, a.Headers = y, a.Request = L, a.Response = j), i.Headers = y, i.Request = L, i.Response = j, i.fetch = Ae, Object.defineProperty(i, "__esModule", { value: !0 }), i;
      })({});
    })(r), r.fetch.ponyfill = !0, delete r.fetch.polyfill;
    var o = r;
    t = o.fetch, t.default = o.fetch, t.fetch = o.fetch, t.Headers = o.Headers, t.Request = o.Request, t.Response = o.Response, e.exports = t;
  }(ei, ei.exports)), ei.exports;
}
(function(e, t) {
  var n;
  if (typeof fetch == "function" && (typeof yi < "u" && yi.fetch ? n = yi.fetch : typeof window < "u" && window.fetch ? n = window.fetch : n = fetch), typeof Gv < "u" && (typeof window > "u" || typeof window.document > "u")) {
    var r = n || Zv();
    r.default && (r = r.default), t.default = r, e.exports = t.default;
  }
})(ru, ru.exports);
var Mp = ru.exports;
const jp = /* @__PURE__ */ gp(Mp), xf = /* @__PURE__ */ xp({
  __proto__: null,
  default: jp
}, [Mp]);
function Hi(e) {
  "@babel/helpers - typeof";
  return Hi = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(t) {
    return typeof t;
  } : function(t) {
    return t && typeof Symbol == "function" && t.constructor === Symbol && t !== Symbol.prototype ? "symbol" : typeof t;
  }, Hi(e);
}
var _n;
typeof fetch == "function" && (typeof global < "u" && global.fetch ? _n = global.fetch : typeof window < "u" && window.fetch ? _n = window.fetch : _n = fetch);
var ta;
$p() && (typeof global < "u" && global.XMLHttpRequest ? ta = global.XMLHttpRequest : typeof window < "u" && window.XMLHttpRequest && (ta = window.XMLHttpRequest));
var Ui;
typeof ActiveXObject == "function" && (typeof global < "u" && global.ActiveXObject ? Ui = global.ActiveXObject : typeof window < "u" && window.ActiveXObject && (Ui = window.ActiveXObject));
!_n && xf && !ta && !Ui && (_n = jp || xf);
typeof _n != "function" && (_n = void 0);
var ou = function(t, n) {
  if (n && Hi(n) === "object") {
    var r = "";
    for (var o in n)
      r += "&" + encodeURIComponent(o) + "=" + encodeURIComponent(n[o]);
    if (!r) return t;
    t = t + (t.indexOf("?") !== -1 ? "&" : "?") + r.slice(1);
  }
  return t;
}, gf = function(t, n, r) {
  _n(t, n).then(function(o) {
    if (!o.ok) return r(o.statusText || "Error", {
      status: o.status
    });
    o.text().then(function(a) {
      r(null, {
        status: o.status,
        data: a
      });
    }).catch(r);
  }).catch(r);
}, vf = !1, Yv = function(t, n, r, o) {
  t.queryStringParams && (n = ou(n, t.queryStringParams));
  var a = nu({}, typeof t.customHeaders == "function" ? t.customHeaders() : t.customHeaders);
  r && (a["Content-Type"] = "application/json");
  var i = typeof t.requestOptions == "function" ? t.requestOptions(r) : t.requestOptions, s = nu({
    method: r ? "POST" : "GET",
    body: r ? t.stringify(r) : void 0,
    headers: a
  }, vf ? {} : i);
  try {
    gf(n, s, o);
  } catch (l) {
    if (!i || Object.keys(i).length === 0 || !l.message || l.message.indexOf("not implemented") < 0)
      return o(l);
    try {
      Object.keys(i).forEach(function(c) {
        delete s[c];
      }), gf(n, s, o), vf = !0;
    } catch (c) {
      o(c);
    }
  }
}, Kv = function(t, n, r, o) {
  r && Hi(r) === "object" && (r = ou("", r).slice(1)), t.queryStringParams && (n = ou(n, t.queryStringParams));
  try {
    var a;
    ta ? a = new ta() : a = new Ui("MSXML2.XMLHTTP.3.0"), a.open(r ? "POST" : "GET", n, 1), t.crossDomain || a.setRequestHeader("X-Requested-With", "XMLHttpRequest"), a.withCredentials = !!t.withCredentials, r && a.setRequestHeader("Content-Type", "application/x-www-form-urlencoded"), a.overrideMimeType && a.overrideMimeType("application/json");
    var i = t.customHeaders;
    if (i = typeof i == "function" ? i() : i, i)
      for (var s in i)
        a.setRequestHeader(s, i[s]);
    a.onreadystatechange = function() {
      a.readyState > 3 && o(a.status >= 400 ? a.statusText : null, {
        status: a.status,
        data: a.responseText
      });
    }, a.send(r);
  } catch (l) {
  }
}, Xv = function(t, n, r, o) {
  if (typeof r == "function" && (o = r, r = void 0), o = o || function() {
  }, _n)
    return Yv(t, n, r, o);
  if ($p() || typeof ActiveXObject == "function")
    return Kv(t, n, r, o);
  o(new Error("No fetch and no xhr implementation found!"));
};
function Jv(e, t) {
  if (!(e instanceof t))
    throw new TypeError("Cannot call a class as a function");
}
function Qv(e, t) {
  for (var n = 0; n < t.length; n++) {
    var r = t[n];
    r.enumerable = r.enumerable || !1, r.configurable = !0, "value" in r && (r.writable = !0), Object.defineProperty(e, r.key, r);
  }
}
function qv(e, t, n) {
  return t && Qv(e.prototype, t), Object.defineProperty(e, "prototype", { writable: !1 }), e;
}
function e1(e, t, n) {
  return t in e ? Object.defineProperty(e, t, { value: n, enumerable: !0, configurable: !0, writable: !0 }) : e[t] = n, e;
}
var t1 = function() {
  return {
    loadPath: "/locales/{{lng}}/{{ns}}.json",
    addPath: "/locales/add/{{lng}}/{{ns}}",
    allowMultiLoading: !1,
    parse: function(n) {
      return JSON.parse(n);
    },
    stringify: JSON.stringify,
    parsePayload: function(n, r, o) {
      return e1({}, r, o || "");
    },
    request: Xv,
    reloadInterval: typeof window < "u" ? !1 : 60 * 60 * 1e3,
    customHeaders: {},
    queryStringParams: {},
    crossDomain: !1,
    withCredentials: !1,
    overrideMimeType: !1,
    requestOptions: {
      mode: "cors",
      credentials: "same-origin",
      cache: "default"
    }
  };
}, Fp = function() {
  function e(t) {
    var n = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {}, r = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {};
    Jv(this, e), this.services = t, this.options = n, this.allOptions = r, this.type = "backend", this.init(t, n, r);
  }
  return qv(e, [{
    key: "init",
    value: function(n) {
      var r = this, o = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {}, a = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {};
      this.services = n, this.options = nu(o, this.options || {}, t1()), this.allOptions = a, this.services && this.options.reloadInterval && setInterval(function() {
        return r.reload();
      }, this.options.reloadInterval);
    }
  }, {
    key: "readMulti",
    value: function(n, r, o) {
      this._readAny(n, n, r, r, o);
    }
  }, {
    key: "read",
    value: function(n, r, o) {
      this._readAny([n], n, [r], r, o);
    }
  }, {
    key: "_readAny",
    value: function(n, r, o, a, i) {
      var s = this, l = this.options.loadPath;
      typeof this.options.loadPath == "function" && (l = this.options.loadPath(n, o)), l = Wv(l), l.then(function(c) {
        if (!c) return i(null, {});
        var d = s.services.interpolator.interpolate(c, {
          lng: n.join("+"),
          ns: o.join("+")
        });
        s.loadUrl(d, i, r, a);
      });
    }
  }, {
    key: "loadUrl",
    value: function(n, r, o, a) {
      var i = this;
      this.options.request(this.options, n, void 0, function(s, l) {
        if (l && (l.status >= 500 && l.status < 600 || !l.status)) return r("failed loading " + n + "; status code: " + l.status, !0);
        if (l && l.status >= 400 && l.status < 500) return r("failed loading " + n + "; status code: " + l.status, !1);
        if (!l && s && s.message && s.message.indexOf("Failed to fetch") > -1) return r("failed loading " + n + ": " + s.message, !0);
        if (s) return r(s, !1);
        var c, d;
        try {
          typeof l.data == "string" ? c = i.options.parse(l.data, o, a) : c = l.data;
        } catch {
          d = "failed parsing " + n + " to json";
        }
        if (d) return r(d, !1);
        r(null, c);
      });
    }
  }, {
    key: "create",
    value: function(n, r, o, a, i) {
      var s = this;
      if (this.options.addPath) {
        typeof n == "string" && (n = [n]);
        var l = this.options.parsePayload(r, o, a), c = 0, d = [], f = [];
        n.forEach(function(p) {
          var g = s.options.addPath;
          typeof s.options.addPath == "function" && (g = s.options.addPath(p, r));
          var y = s.services.interpolator.interpolate(g, {
            lng: p,
            ns: r
          });
          s.options.request(s.options, y, l, function(m, b) {
            c += 1, d.push(m), f.push(b), c === n.length && i && i(d, f);
          });
        });
      }
    }
  }, {
    key: "reload",
    value: function() {
      var n = this, r = this.services, o = r.backendConnector, a = r.languageUtils, i = r.logger, s = o.language;
      if (!(s && s.toLowerCase() === "cimode")) {
        var l = [], c = function(f) {
          var p = a.toResolveHierarchy(f);
          p.forEach(function(g) {
            l.indexOf(g) < 0 && l.push(g);
          });
        };
        c(s), this.allOptions.preload && this.allOptions.preload.forEach(function(d) {
          return c(d);
        }), l.forEach(function(d) {
          n.allOptions.ns.forEach(function(f) {
            o.read(d, f, "read", null, null, function(p, g) {
              p && i.warn("loading namespace ".concat(f, " for language ").concat(d, " failed"), p), !p && g && i.log("loaded namespace ".concat(f, " for language ").concat(d), g), o.loaded("".concat(d, "|").concat(f), p, g);
            });
          });
        });
      }
    }
  }]), e;
}();
Fp.type = "backend";
var Hp = [], n1 = Hp.forEach, r1 = Hp.slice;
function o1(e) {
  return n1.call(r1.call(arguments, 1), function(t) {
    if (t)
      for (var n in t)
        e[n] === void 0 && (e[n] = t[n]);
  }), e;
}
var yf = /^[\u0009\u0020-\u007e\u0080-\u00ff]+$/, a1 = function(t, n, r) {
  var o = r || {};
  o.path = o.path || "/";
  var a = encodeURIComponent(n), i = t + "=" + a;
  if (o.maxAge > 0) {
    var s = o.maxAge - 0;
    if (isNaN(s)) throw new Error("maxAge should be a Number");
    i += "; Max-Age=" + Math.floor(s);
  }
  if (o.domain) {
    if (!yf.test(o.domain))
      throw new TypeError("option domain is invalid");
    i += "; Domain=" + o.domain;
  }
  if (o.path) {
    if (!yf.test(o.path))
      throw new TypeError("option path is invalid");
    i += "; Path=" + o.path;
  }
  if (o.expires) {
    if (typeof o.expires.toUTCString != "function")
      throw new TypeError("option expires is invalid");
    i += "; Expires=" + o.expires.toUTCString();
  }
  if (o.httpOnly && (i += "; HttpOnly"), o.secure && (i += "; Secure"), o.sameSite) {
    var l = typeof o.sameSite == "string" ? o.sameSite.toLowerCase() : o.sameSite;
    switch (l) {
      case !0:
        i += "; SameSite=Strict";
        break;
      case "lax":
        i += "; SameSite=Lax";
        break;
      case "strict":
        i += "; SameSite=Strict";
        break;
      case "none":
        i += "; SameSite=None";
        break;
      default:
        throw new TypeError("option sameSite is invalid");
    }
  }
  return i;
};
const i1 = {
  name: "cookie",
  lookup: function(t, n, r) {
    var o;
    if (r.lookupCookie && typeof t < "u") {
      var a = r.getCookies(t);
      a && (o = a[r.lookupCookie]);
    }
    return o;
  },
  cacheUserLanguage: function(t, n, r) {
    var o = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : {};
    if (o.lookupCookie && t !== "undefined") {
      var a = o.cookieExpirationDate;
      a || (a = /* @__PURE__ */ new Date(), a.setFullYear(a.getFullYear() + 1));
      var i = {
        expires: a,
        domain: o.cookieDomain,
        path: o.cookiePath,
        httpOnly: !1,
        overwrite: !0,
        sameSite: o.cookieSameSite
      };
      o.cookieSecure && (i.secure = o.cookieSecure);
      var s = o.getHeader(n, "set-cookie") || o.getHeader(n, "Set-Cookie") || [];
      typeof s == "string" && (s = [s]), Array.isArray(s) || (s = []), s = s.filter(function(l) {
        return l.indexOf("".concat(o.lookupCookie, "=")) !== 0;
      }), s.push(a1(o.lookupCookie, r, i)), o.setHeader(n, "Set-Cookie", s.length === 1 ? s[0] : s);
    }
  }
}, s1 = {
  name: "querystring",
  lookup: function(t, n, r) {
    var o;
    if (r.lookupQuerystring !== void 0 && typeof t < "u" && (r.getQuery(t) && (o = r.getQuery(t)[r.lookupQuerystring]), !o && r.getUrl(t) && r.getUrl(t).indexOf("?"))) {
      var a = r.getUrl(t).substring(r.getUrl(t).indexOf("?"));
      if (typeof URLSearchParams < "u") {
        var i = new URLSearchParams(a);
        o = i.get(r.lookupQuerystring);
      } else {
        var s = a.indexOf("".concat(r.lookupQuerystring, "="));
        if (s > -1) {
          var l = a.substring(r.lookupQuerystring.length + 2);
          l.indexOf("&") < 0 ? o = l : o = l.substring(0, l.indexOf("&"));
        }
      }
    }
    return o;
  }
}, l1 = {
  name: "path",
  lookup: function(t, n, r) {
    var o;
    if (t === void 0)
      return o;
    if (r.lookupPath !== void 0 && t.params && (o = r.getParams(t)[r.lookupPath]), !o && typeof r.lookupFromPathIndex == "number" && r.getOriginalUrl(t)) {
      var a = r.getOriginalUrl(t).split("?")[0], i = a.split("/");
      i[0] === "" && i.shift(), i.length > r.lookupFromPathIndex && (o = i[r.lookupFromPathIndex]);
    }
    return o;
  }
};
var u1 = ["hans", "hant", "latn", "cyrl", "cans", "mong", "arab", "419"];
const c1 = {
  name: "header",
  lookup: function(t, n, r) {
    var o;
    if (typeof t < "u") {
      var a = r.getHeaders(t);
      if (!a) return o;
      var i = [], s = r.lookupHeader ? a[r.lookupHeader] : a["accept-language"];
      if (s) {
        var l = /(([a-z]{2,3})-?([A-Z]{2})?)\s*;?\s*(q=([0-9.]+))?/gi;
        if (s.indexOf("-") > 0) {
          var c = u1.find(function(u) {
            return s.toLowerCase().indexOf("-".concat(u)) > 0;
          });
          c && (l = /(([a-z]{2,3})-?([A-Z0-9]{2,4})?)\s*;?\s*(q=([0-9.]+))?/gi);
        }
        var d = [], f, p, g = r.lookupHeaderRegex || l;
        do
          if (p = g.exec(s), p) {
            var y = p[1], m = p[5] || "1", b = Number(m);
            y && !isNaN(b) && d.push({
              lng: y,
              q: b
            });
          }
        while (p);
        for (d.sort(function(u, h) {
          return h.q - u.q;
        }), f = 0; f < d.length; f++)
          i.push(d[f].lng);
        i.length && (o = i);
      }
    }
    return o;
  }
};
function au(e) {
  "@babel/helpers - typeof";
  return au = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(t) {
    return typeof t;
  } : function(t) {
    return t && typeof Symbol == "function" && t.constructor === Symbol && t !== Symbol.prototype ? "symbol" : typeof t;
  }, au(e);
}
const d1 = {
  name: "session",
  lookup: function(t, n, r) {
    var o;
    return r.lookupSession !== void 0 && au(t) && r.getSession(t) && (o = r.getSession(t)[r.lookupSession]), o;
  },
  cacheUserLanguage: function(t, n, r) {
    var o = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : {};
    o.lookupSession && t && o.getSession(t) && (o.getSession(t)[o.lookupSession] = r);
  }
};
var f1 = function(t) {
  if (t.path) return t.path;
  if (t.raw && t.raw.path) return t.raw.path;
  if (t.url) return t.url;
}, Up = function(t) {
  if (t.url && t.url.href) return t.url.href;
  if (t.url) return t.url;
  if (t.raw && t.raw.url) return t.raw.url;
}, p1 = function(t, n) {
  if (t.url) {
    t.url = n;
    return;
  }
}, h1 = function(t) {
  return t.originalUrl ? t.originalUrl : t.raw && t.raw.originalUrl ? t.raw.originalUrl : Up(t);
}, m1 = function(t) {
  if (t.query && typeof t.query.entries == "function" && typeof Object.fromEntries == "function" && typeof t.query[Symbol.iterator] == "function")
    return Object.fromEntries(t.query);
  if (t.query) return t.query;
  if (t.searchParams) return t.searchParams;
  if (t.raw && t.raw.query) return t.raw.query;
  if (t.ctx && t.ctx.queryParams) return t.ctx.queryParams;
  if (t.url && t.url.searchParams) return t.url.searchParams;
  var n = t.url || t.raw && t.raw.url;
  return n && n.indexOf("?") < 0 ? {} : {};
}, x1 = function(t) {
  return t.params ? t.params : t.raw && t.raw.params ? t.raw.params : t.ctx && t.ctx.params ? t.ctx.params : {};
}, qr = function(t) {
  if (t.headers) return t.headers;
}, g1 = function(t) {
  if (t.cookies) return t.cookies;
  if (qr(t)) {
    var n = {}, r = qr(t).cookie;
    return r && r.split(";").forEach(function(o) {
      var a = o.split("=");
      n[a.shift().trim()] = decodeURI(encodeURI(a.join("=")));
    }), n;
  }
}, v1 = function(t) {
  return t.ctx && typeof t.ctx.body == "function" ? t.ctx.body.bind(t.ctx) : t.ctx && t.ctx.body ? t.ctx.body : t.json ? t.json : t.body ? t.body : t.payload ? t.payload : t.request && t.request.body ? t.request.body : {};
}, y1 = function(t, n) {
  if (t.getHeader) return t.getHeader(n);
  if (t.headers) return t.headers[n];
  if (qr(t) && qr(t)[n]) return qr(t)[n];
}, Vp = function(t, n, r) {
  if (!(t._headerSent || t.headersSent)) {
    if (typeof t.setHeader == "function") return t.setHeader(n, r);
    if (typeof t.header == "function") return t.header(n, r);
    if (t.responseHeaders && typeof t.responseHeaders.set == "function")
      return t.responseHeaders.set(n, r);
    if (t.headers && typeof t.headers.set == "function")
      return t.headers.set(n, r);
    if (typeof t.set == "function")
      return t.set(n, r);
  }
}, w1 = function(t, n) {
  if (typeof t.contentType == "function") return t.contentType(n);
  if (typeof t.type == "function") return t.type(n);
  Vp(t, "Content-Type", n);
}, b1 = function(t, n) {
  if (typeof t.status == "function") return t.status(n);
  if (t.status) return t.status = n;
}, _1 = function(t, n) {
  return typeof t.send == "function" ? t.send(n) : (t.request && t.response && t.app && (t.body = n), n);
}, S1 = function(t) {
  if (t.session) return t.session;
  if (t.raw && t.raw.session) return t.raw.session;
}, k1 = function() {
  var t = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
  return t.getPath = t.getPath || f1, t.getOriginalUrl = t.getOriginalUrl || h1, t.getUrl = t.getUrl || Up, t.setUrl = t.setUrl || p1, t.getParams = t.getParams || x1, t.getSession = t.getSession || S1, t.getQuery = t.getQuery || m1, t.getCookies = t.getCookies || g1, t.getBody = t.getBody || v1, t.getHeaders = t.getHeaders || qr, t.getHeader = t.getHeader || y1, t.setHeader = t.setHeader || Vp, t.setContentType = t.setContentType || w1, t.setStatus = t.setStatus || b1, t.send = t.send || _1, t;
};
function na(e) {
  "@babel/helpers - typeof";
  return na = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(t) {
    return typeof t;
  } : function(t) {
    return t && typeof Symbol == "function" && t.constructor === Symbol && t !== Symbol.prototype ? "symbol" : typeof t;
  }, na(e);
}
function E1(e, t) {
  if (!(e instanceof t))
    throw new TypeError("Cannot call a class as a function");
}
function C1(e, t) {
  for (var n = 0; n < t.length; n++) {
    var r = t[n];
    r.enumerable = r.enumerable || !1, r.configurable = !0, "value" in r && (r.writable = !0), Object.defineProperty(e, O1(r.key), r);
  }
}
function T1(e, t, n) {
  return t && C1(e.prototype, t), Object.defineProperty(e, "prototype", { writable: !1 }), e;
}
function O1(e) {
  var t = N1(e, "string");
  return na(t) === "symbol" ? t : String(t);
}
function N1(e, t) {
  if (na(e) !== "object" || e === null) return e;
  var n = e[Symbol.toPrimitive];
  if (n !== void 0) {
    var r = n.call(e, t);
    if (na(r) !== "object") return r;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return String(e);
}
function I1() {
  return k1({
    order: ["querystring", "cookie", "header"],
    lookupQuerystring: "lng",
    lookupCookie: "i18next",
    lookupSession: "lng",
    lookupFromPathIndex: 0,
    caches: !1,
    cookieSameSite: "strict",
    ignoreCase: !0,
    convertDetectedLanguage: function(t) {
      return t;
    }
  });
}
var zp = function() {
  function e(t) {
    var n = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {}, r = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {};
    E1(this, e), this.type = "languageDetector", this.detectors = {}, this.init(t, n, r);
  }
  return T1(e, [{
    key: "init",
    value: function(n) {
      var r = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {}, o = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {};
      this.services = n, this.options = o1(r, this.options || {}, I1()), this.allOptions = o, typeof this.options.convertDetectedLanguage == "string" && this.options.convertDetectedLanguage.indexOf("15897") > -1 && (this.options.convertDetectedLanguage = function(a) {
        return a.replace("-", "_");
      }), this.addDetector(i1), this.addDetector(s1), this.addDetector(l1), this.addDetector(c1), this.addDetector(d1);
    }
  }, {
    key: "addDetector",
    value: function(n) {
      this.detectors[n.name] = n;
    }
  }, {
    key: "detect",
    value: function(n, r, o) {
      var a = this;
      if (!(arguments.length < 2)) {
        o || (o = this.options.order);
        var i;
        if (o.forEach(function(l) {
          if (!(i || !a.detectors[l])) {
            var c = a.detectors[l].lookup(n, r, a.options);
            c && (Array.isArray(c) || (c = [c]), c = c.filter(function(d) {
              return d != null;
            }), c = c.map(function(d) {
              return a.options.convertDetectedLanguage(d);
            }), a.services.languageUtils.getBestMatchFromCodes ? (i = a.services.languageUtils.getBestMatchFromCodes(c), i && (a.options.ignoreCase ? c.map(function(d) {
              return d.toLowerCase();
            }).indexOf(i.toLowerCase()) < 0 && (i = void 0) : c.indexOf(i) < 0 && (i = void 0)), i && (n.i18nextLookupName = l)) : i = c.length > 0 ? c[0] : null);
          }
        }), !i) {
          var s = this.allOptions.fallbackLng;
          typeof s == "function" && (s = s()), typeof s == "string" && (s = [s]), s || (s = []), Object.prototype.toString.apply(s) === "[object Array]" ? i = s[0] : i = s[0] || s.default && s.default[0];
        }
        return i;
      }
    }
  }, {
    key: "cacheUserLanguage",
    value: function(n, r, o, a) {
      var i = this;
      arguments.length < 3 || (a || (a = this.options.caches), a && a.forEach(function(s) {
        i.detectors[s] && i.detectors[s].cacheUserLanguage && r.cachedUserLanguage !== o && (i.detectors[s].cacheUserLanguage(n, r, o, i.options), r.cachedUserLanguage = o);
      }));
    }
  }]), e;
}();
zp.type = "languageDetector";
var L1 = zp, A1 = /&(?:amp|#38|lt|#60|gt|#62|apos|#39|quot|#34|nbsp|#160|copy|#169|reg|#174|hellip|#8230|#x2F|#47);/g, R1 = {
  "&amp;": "&",
  "&#38;": "&",
  "&lt;": "<",
  "&#60;": "<",
  "&gt;": ">",
  "&#62;": ">",
  "&apos;": "'",
  "&#39;": "'",
  "&quot;": '"',
  "&#34;": '"',
  "&nbsp;": " ",
  "&#160;": " ",
  "&copy;": "©",
  "&#169;": "©",
  "&reg;": "®",
  "&#174;": "®",
  "&hellip;": "…",
  "&#8230;": "…",
  "&#x2F;": "/",
  "&#47;": "/"
}, P1 = function(t) {
  return R1[t];
}, D1 = function(t) {
  return t.replace(A1, P1);
};
function wf(e, t) {
  var n = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var r = Object.getOwnPropertySymbols(e);
    t && (r = r.filter(function(o) {
      return Object.getOwnPropertyDescriptor(e, o).enumerable;
    })), n.push.apply(n, r);
  }
  return n;
}
function bf(e) {
  for (var t = 1; t < arguments.length; t++) {
    var n = arguments[t] != null ? arguments[t] : {};
    t % 2 ? wf(Object(n), !0).forEach(function(r) {
      Nn(e, r, n[r]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(n)) : wf(Object(n)).forEach(function(r) {
      Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(n, r));
    });
  }
  return e;
}
var iu = {
  bindI18n: "languageChanged",
  bindI18nStore: "",
  transEmptyNodeValue: "",
  transSupportBasicHtmlNodes: !0,
  transWrapTextNodes: "",
  transKeepBasicHtmlNodesFor: ["br", "strong", "i", "p"],
  useSuspense: !0,
  unescape: D1
}, Bp, gR = le.createContext();
function $1() {
  var e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
  iu = bf(bf({}, iu), e);
}
function vR() {
  return iu;
}
var yR = function() {
  function e() {
    It(this, e), this.usedNamespaces = {};
  }
  return Lt(e, [{
    key: "addUsedNamespaces",
    value: function(n) {
      var r = this;
      n.forEach(function(o) {
        r.usedNamespaces[o] || (r.usedNamespaces[o] = !0);
      });
    }
  }, {
    key: "getUsedNamespaces",
    value: function() {
      return Object.keys(this.usedNamespaces);
    }
  }]), e;
}();
function M1(e) {
  Bp = e;
}
function wR() {
  return Bp;
}
var j1 = {
  type: "3rdParty",
  init: function(t) {
    $1(t.options.react), M1(t);
  }
};
const F1 = {
  NO_POLKADOT_EXTENSION: "Polkadot extension not found"
}, H1 = {
  SELECT_ALL: "Select all containing the following",
  IF_NONE_CLICK_NEXT: "If there are none, click Next",
  NEXT: "Next",
  SUBMIT: "Submit",
  CANCEL: "Cancel",
  I_AM_HUMAN: "I am human",
  NO_ACCOUNTS_FOUND: "No accounts found",
  ACCOUNT_NOT_FOUND: "Account not found",
  NO_EXTENSION_FOUND: "No extension found"
}, U1 = {
  JSON_LOAD_FAILED: "Failed to load JSON file",
  MNEMONIC_UNDEFINED: "Mnemonic Undefined. Please set the mnemonic in environment variables",
  NO_MNEMONIC_OR_SEED: "No mnemonic or seed provided",
  CANT_FIND_KEYRINGPAIR: "Can't find the keyringpair for {{address}}",
  ENVIRONMENT_NOT_READY: "Environment not ready",
  INVALID_SIGNATURE: "Invalid signature",
  NOT_IMPLEMENTED: "Not implemented",
  SITE_KEY_MISSING: "SITE KEY missing",
  ACCOUNT_NOT_FOUND: "Account not found"
}, V1 = {
  INVALID_METHOD: "Invalid contract method",
  TX_ERROR: "Error making tx",
  INVALID_ADDRESS: "Failed to encode invalid address",
  INVALID_STORAGE_NAME: "Failed to find given storage name",
  CAPTCHA_SOLUTION_COMMITMENT_DOES_NOT_EXIST: "Captcha solution commitment does not exist",
  CONTRACT_UNDEFINED: "Contract undefined",
  SIGNER_UNDEFINED: "Signer undefined",
  CANNOT_FIND_KEYPAIR: "Cannot find keypair",
  INTERRUPTED_EVENT: "Event interrupted",
  TOO_MANY_CALLS: "Too many calls",
  UNKNOWN_ERROR: "Unknown error",
  CHAIN_DECIMALS_UNDEFINED: "Chain decimals are not defined",
  INVALID_DATA_FORMAT: "Invalid data format",
  TX_QUEUE_ERROR: "Error in Transaction Queue",
  DISPATCH_ERROR: "Error dispatching transaction"
}, z1 = {
  UNKNOWN_ENVIRONMENT: "Unknown environment requested",
  INVALID_CAPTCHA_NUMBER: "Please configure captchas configurations correctly",
  INVALID_LOG_LEVEL: "Invalid log level",
  INVALID_PACKAGE_DIR: "Invalid package directory"
}, B1 = {
  DATASET_PARSE_ERROR: "Error parsing dataset",
  SOLUTION_PARSE_ERROR: "Error parsing dataset",
  HASH_ERROR: "Error hashing dataset",
  DATASET_ID_UNDEFINED: "Dataset id undefined",
  NOT_ENOUGH_LABELS: "Not enough labels",
  NOT_ENOUGH_IMAGES: "Not enough images",
  CAPTCHAS_COUNT_LESS_THAN_CONFIGURED: "Number of captchas in dataset is less than configured number of captchas",
  SOLUTIONS_COUNT_LESS_THAN_CONFIGURED: "Number of solutions in dataset is less than configured number of solutions",
  DUPLICATE_IMAGE: "duplicate image detected",
  MERKLE_ERROR: "Error creating merkle tree"
}, W1 = {
  DATABASE_IMPORT_FAILED: "Failed to import database engine",
  DATABASE_UNDEFINED: "Database client is not connected",
  DATABASE_HOST_UNDEFINED: "Database host address is not defined",
  DATASET_LOAD_FAILED: "Data set load failed",
  DATASET_GET_FAILED: "Failed to get dataset",
  CAPTCHA_GET_FAILED: "Failed to get captcha",
  CAPTCHA_UPDATE_FAILED: "Failed to update captcha",
  IMAGE_GET_FAILED: "Failed to get image",
  PENDING_RECORD_NOT_FOUND: "No pending record found",
  INVALID_HASH: "Invalid hash",
  SOLUTION_GET_FAILED: "Failed to get solution",
  DATASET_WITH_SOLUTIONS_GET_FAILED: "No datasets found with required number of solutions",
  SOLUTION_APPROVE_FAILED: "Failed to approve solution",
  SOLUTION_FLAG_FAILED: "Failed to flag solution as processed",
  TABLES_UNDEFINED: "Tables undefined",
  CONNECTION_UNDEFINED: "Connection undefined",
  COMMITMENT_FLAG_FAILED: "Failed to flag commitment as processed"
}, G1 = {
  PARSE_ERROR: "Error parsing captcha",
  INVALID_CAPTCHA_ID: "Invalid captcha id",
  INVALID_ITEM_FORMAT: "Only image and text item types allowed",
  INVALID_SOLUTION_TYPE: "Invalid solution type",
  INVALID_ITEM_HASH: "Invalid item hash",
  DIFFERENT_DATASET_IDS: "Dataset ids do not match",
  INVALID_TIMESTAMP: "Invalid timestamp",
  ID_MISMATCH: "captcha id mismatch",
  MISSING_ITEM_HASH: "missing item hash",
  INVALID_CAPTCHA_CHALLENGE: "Invalid captcha challenge",
  DAPP_USER_SOLUTION_NOT_FOUND: "Dapp user solution not found",
  NO_CAPTCHA: "No captcha found",
  INVALID_TOKEN: "Invalid token",
  INVALID_SOLUTION: "Invalid solution"
}, Z1 = {
  CAPTCHA_FAILED: "You answered one or more captchas incorrectly. Please try again",
  CAPTCHA_PASSED: "You correctly answered the captchas",
  BAD_REQUEST: "BadRequest",
  USER_VERIFIED: "User verified",
  USER_NOT_VERIFIED: "User not verified",
  USER_NOT_VERIFIED_TIME_EXPIRED: "User not verified. Captcha solution has expired.",
  USER_NOT_VERIFIED_NO_SOLUTION: "User not verified. No captcha solution found.",
  USER_ALREADY_VERIFIED: "This solution has already been verified. User should complete a new captcha.",
  UNKNOWN: "Unknown API error"
}, Y1 = {
  PARAMETER_ERROR: "Invalid parameter"
}, K1 = {
  PROSOPO_SITE_KEY_MISSING: "PROSOPO_SITE_KEY is not set in .env file.",
  PROVIDER_NO_CAPTCHA: "No captchas returned from provider",
  MISSING_PROVIDER_PAIR: "Missing provider pair",
  MISSING_ENV_VARIABLE: "Missing environment variable",
  GENERAL: "General Dev Error, see context",
  MISSING_SECRET_KEY: "Missing secret key",
  KEY_ERROR: "Key error",
  METHOD_NOT_IMPLEMENTED: "Method not implemented"
}, X1 = {
  FILE_NOT_FOUND: "File not found",
  FILE_ALREADY_EXISTS: "File already exists",
  INVALID_DIR_FORMAT: "Invalid directory format"
}, J1 = "bird", Q1 = "bus", q1 = "car", ey = "cat", ty = "deer", ny = "dog", ry = "horse", oy = "plane", ay = "train", iy = "animals", sy = "antelope", ly = "backpack", uy = "badger", cy = "bat", dy = "bathtub", fy = "bear", py = "bee", hy = "beetle", my = "billiards", xy = "binoculars", gy = "birdbath", vy = "bison", yy = "blimp", wy = "boar", by = "breadmaker", _y = "bulldozer", Sy = "butterfly", ky = "cactus", Ey = "cake", Cy = "calculator", Ty = "camel", Oy = "canoe", Ny = "caterpillar", Iy = "cd", Ly = "chandelier", Ay = "chimpanzee", Ry = "chopsticks", Py = "cockroach", Dy = "coffin", $y = "coin", My = "comet", jy = "conch", Fy = "cormorant", Hy = "cow", Uy = "coyote", Vy = "crab", zy = "crow", By = "dice", Wy = "dolphin", Gy = "donkey", Zy = "doorknob", Yy = "dragonfly", Ky = "duck", Xy = "eagle", Jy = "elephant", Qy = "elk", qy = "eyeglasses", e2 = "fern", t2 = "fireworks", n2 = "flamingo", r2 = "fly", o2 = "fox", a2 = "frisbee", i2 = "frog", s2 = "galaxy", l2 = "giraffe", u2 = "goat", c2 = "goldfish", d2 = "goose", f2 = "gorilla", p2 = "grapes", h2 = "grasshopper", m2 = "greyhound", x2 = "hamburger", g2 = "hammock", v2 = "hamster", y2 = "hare", w2 = "harmonica", b2 = "harp", _2 = "harpsichord", S2 = "hedgehog", k2 = "helicopter", E2 = "hibiscus", C2 = "hippopotamus", T2 = "hornbill", O2 = "hourglass", N2 = "hummingbird", I2 = "hyena", L2 = "iguana", A2 = "ipod", R2 = "jellyfish", P2 = "kangaroo", D2 = "kayak", $2 = "koala", M2 = "ladder", j2 = "ladybugs", F2 = "laptop", H2 = "leopard", U2 = "lightbulb", V2 = "lightning", z2 = "lion", B2 = "lizard", W2 = "llama", G2 = "lobster", Z2 = "mailbox", Y2 = "mandolin", K2 = "mars", X2 = "mattress", J2 = "megaphone", Q2 = "microscope", q2 = "microwave", ew = "minaret", tw = "minotaur", nw = "mosquito", rw = "moth", ow = "motorbikes", aw = "mouse", iw = "mushroom", sw = "mussels", lw = "necktie", uw = "octopus", cw = "okapi", dw = "orangutan", fw = "ostrich", pw = "otter", hw = "owl", mw = "ox", xw = "oyster", gw = "panda", vw = "paperclip", yw = "parrot", ww = "pelecaniformes", bw = "penguin", _w = "photocopier", Sw = "piano", kw = "pig", Ew = "pigeon", Cw = "porcupine", Tw = "possum", Ow = "pram", Nw = "pyramid", Iw = "raccoon", Lw = "rainbow", Aw = "rat", Rw = "refrigerator", Pw = "reindeer", Dw = "rhinoceros", $w = "saddle", Mw = "sandpiper", jw = "saturn", Fw = "screwdriver", Hw = "seahorse", Uw = "seal", Vw = "segway", zw = "shark", Bw = "sheep", Ww = "skateboard", Gw = "skunk", Zw = "skyscraper", Yw = "smokestack", Kw = "snail", Xw = "snake", Jw = "sneaker", Qw = "snowmobile", qw = "socks", eb = "spaghetti", tb = "sparrow", nb = "spoon", rb = "squid", ob = "squirrel", ab = "starfish", ib = "stirrups", sb = "sunflower", lb = "superman", ub = "sushi", cb = "swan", db = "teapot", fb = "tiger", pb = "toad", hb = "toaster", mb = "tomato", xb = "tombstone", gb = "treadmill", vb = "triceratops", yb = "tricycle", wb = "tripod", bb = "turkey", _b = "turtle", Sb = "tweezer", kb = "umbrella", Eb = "unicorn", Cb = "watch", Tb = "waterfall", Ob = "watermelon", Nb = "whale", Ib = "wheelbarrow", Lb = "windmill", Ab = "wolf", Rb = "wombat", Pb = "woodpecker", Db = "xylophone", $b = "zebra", Wp = {
  ACCOUNT: F1,
  WIDGET: H1,
  GENERAL: U1,
  CONTRACT: V1,
  CONFIG: z1,
  DATASET: B1,
  DATABASE: W1,
  CAPTCHA: G1,
  API: Z1,
  CLI: Y1,
  DEVELOPER: K1,
  FS: X1,
  bird: J1,
  bus: Q1,
  car: q1,
  cat: ey,
  deer: ty,
  dog: ny,
  horse: ry,
  plane: oy,
  train: ay,
  animals: iy,
  antelope: sy,
  backpack: ly,
  badger: uy,
  "baseball-bat": "baseball-bat",
  "baseball-glove": "baseball-glove",
  "basketball-hoop": "basketball-hoop",
  bat: cy,
  bathtub: dy,
  bear: fy,
  bee: py,
  "beer-mug": "beer-mug",
  beetle: hy,
  billiards: my,
  binoculars: xy,
  birdbath: gy,
  bison: vy,
  blimp: yy,
  boar: wy,
  "bonsai-tree": "bonsai-tree",
  "boom-box": "boom-box",
  "bowling-ball": "bowling-ball",
  "bowling-pin": "bowling-pin",
  "boxing-glove": "boxing-glove",
  breadmaker: by,
  bulldozer: _y,
  butterfly: Sy,
  cactus: ky,
  cake: Ey,
  calculator: Cy,
  camel: Ty,
  canoe: Oy,
  "car-tire": "car-tire",
  caterpillar: Ny,
  cd: Iy,
  "cereal-box": "cereal-box",
  chandelier: Ly,
  "chess-board": "chess-board",
  chimpanzee: Ay,
  chopsticks: Ry,
  cockroach: Py,
  coffin: Dy,
  coin: $y,
  comet: My,
  "computer-keyboard": "computer-keyboard",
  "computer-monitor": "computer-monitor",
  "computer-mouse": "computer-mouse",
  conch: jy,
  cormorant: Fy,
  "covered-wagon": "covered-wagon",
  cow: Hy,
  "cowboy-hat": "cowboy-hat",
  coyote: Uy,
  crab: Vy,
  crow: zy,
  "desk-globe": "desk-globe",
  "diamond-ring": "diamond-ring",
  dice: By,
  dolphin: Wy,
  donkey: Gy,
  doorknob: Zy,
  dragonfly: Yy,
  "drinking-straw": "drinking-straw",
  duck: Ky,
  "dumb-bell": "dumb-bell",
  eagle: Xy,
  "eiffel-tower": "eiffel-tower",
  "electric-guitar": "electric-guitar",
  elephant: Jy,
  elk: Qy,
  eyeglasses: qy,
  fern: e2,
  "fire-extinguisher": "fire-extinguisher",
  "fire-hydrant": "fire-hydrant",
  "fire-truck": "fire-truck",
  fireworks: t2,
  flamingo: n2,
  fly: r2,
  fox: o2,
  "french-horn": "french-horn",
  "fried-egg": "fried-egg",
  frisbee: a2,
  frog: i2,
  "frying-pan": "frying-pan",
  galaxy: s2,
  "gas-pump": "gas-pump",
  giraffe: l2,
  goat: u2,
  "golden-gate-bridge": "golden-gate-bridge",
  goldfish: c2,
  "golf-ball": "golf-ball",
  goose: d2,
  gorilla: f2,
  grapes: p2,
  grasshopper: h2,
  greyhound: m2,
  "guitar-pick": "guitar-pick",
  hamburger: x2,
  hammock: g2,
  hamster: v2,
  hare: y2,
  harmonica: w2,
  harp: b2,
  harpsichord: _2,
  "head-phones": "head-phones",
  hedgehog: S2,
  helicopter: k2,
  hibiscus: E2,
  hippopotamus: C2,
  "homer-simpson": "homer-simpson",
  hornbill: T2,
  "horseshoe-crab": "horseshoe-crab",
  "hot-air-balloon": "hot-air-balloon",
  "hot-dog": "hot-dog",
  "hot-tub": "hot-tub",
  hourglass: O2,
  "house-fly": "house-fly",
  hummingbird: N2,
  hyena: I2,
  "ice-cream-cone": "ice-cream-cone",
  iguana: L2,
  ipod: A2,
  jellyfish: R2,
  "joy-stick": "joy-stick",
  kangaroo: P2,
  kayak: D2,
  "killer-whale": "killer-whale",
  koala: $2,
  ladder: M2,
  ladybugs: j2,
  laptop: F2,
  leopard: H2,
  "license-plate": "license-plate",
  "light-house": "light-house",
  lightbulb: U2,
  lightning: V2,
  lion: z2,
  lizard: B2,
  llama: W2,
  lobster: G2,
  mailbox: Z2,
  mandolin: Y2,
  mars: K2,
  mattress: X2,
  megaphone: J2,
  microscope: Q2,
  microwave: q2,
  minaret: ew,
  minotaur: tw,
  mosquito: nw,
  moth: rw,
  motorbikes: ow,
  "mountain-bike": "mountain-bike",
  mouse: aw,
  mushroom: iw,
  mussels: sw,
  necktie: lw,
  octopus: uw,
  okapi: cw,
  orangutan: dw,
  ostrich: fw,
  otter: pw,
  owl: hw,
  ox: mw,
  oyster: xw,
  "palm-pilot": "palm-pilot",
  "palm-tree": "palm-tree",
  panda: gw,
  "paper-shredder": "paper-shredder",
  paperclip: vw,
  parrot: yw,
  "pci-card": "pci-card",
  pelecaniformes: ww,
  penguin: bw,
  photocopier: _w,
  piano: Sw,
  "picnic-table": "picnic-table",
  pig: kw,
  pigeon: Ew,
  "playing-card": "playing-card",
  porcupine: Cw,
  possum: Tw,
  pram: Ow,
  pyramid: Nw,
  raccoon: Iw,
  "radio-telescope": "radio-telescope",
  rainbow: Lw,
  rat: Aw,
  refrigerator: Rw,
  reindeer: Pw,
  rhinoceros: Dw,
  "rotary-phone": "rotary-phone",
  "roulette-wheel": "roulette-wheel",
  saddle: $w,
  sandpiper: Mw,
  saturn: jw,
  "school-bus": "school-bus",
  screwdriver: Fw,
  seahorse: Hw,
  seal: Uw,
  segway: Vw,
  "self-propelled-lawn-mower": "self-propelled-lawn-mower",
  shark: zw,
  sheep: Bw,
  "sheet-music": "sheet-music",
  skateboard: Ww,
  skunk: Gw,
  skyscraper: Zw,
  smokestack: Yw,
  snail: Kw,
  snake: Xw,
  sneaker: Jw,
  snowmobile: Qw,
  "soccer-ball": "soccer-ball",
  socks: qw,
  "soda-can": "soda-can",
  spaghetti: eb,
  sparrow: tb,
  "speed-boat": "speed-boat",
  spoon: nb,
  squid: rb,
  squirrel: ob,
  "stained-glass": "stained-glass",
  starfish: ab,
  "steering-wheel": "steering-wheel",
  stirrups: ib,
  sunflower: sb,
  superman: lb,
  sushi: ub,
  swan: cb,
  "t-shirt": "t-shirt",
  teapot: db,
  "teddy-bear": "teddy-bear",
  "telephone-box": "telephone-box",
  "tennis-ball": "tennis-ball",
  "tennis-court": "tennis-court",
  "tennis-racket": "tennis-racket",
  tiger: fb,
  toad: pb,
  toaster: hb,
  tomato: mb,
  tombstone: xb,
  "top-hat": "top-hat",
  "touring-bike": "touring-bike",
  "tower-pisa": "tower-pisa",
  "traffic-light": "traffic-light",
  treadmill: gb,
  triceratops: vb,
  tricycle: yb,
  tripod: wb,
  "tuning-fork": "tuning-fork",
  turkey: bb,
  turtle: _b,
  tweezer: Sb,
  umbrella: kb,
  unicorn: Eb,
  "video-projector": "video-projector",
  "washing-machine": "washing-machine",
  watch: Cb,
  waterfall: Tb,
  watermelon: Ob,
  "welding-mask": "welding-mask",
  whale: Nb,
  wheelbarrow: Ib,
  windmill: Lb,
  "wine-bottle": "wine-bottle",
  wolf: Ab,
  wombat: Rb,
  woodpecker: Pb,
  xylophone: Db,
  "yo-yo": "yo-yo",
  zebra: $b
}, Mb = {
  NO_POLKADOT_EXTENSION: "Extensión Polkadot no encontrada"
}, jb = {
  SELECT_ALL: "Seleccionar todo lo que contiene lo siguiente",
  IF_NONE_CLICK_NEXT: "Si no hay ninguno, haz clic en Siguiente",
  NEXT: "Siguiente",
  SUBMIT: "Enviar",
  CANCEL: "Cancelar",
  I_AM_HUMAN: "Soy humano",
  NO_ACCOUNTS_FOUND: "No se encontraron cuentas",
  ACCOUNT_NOT_FOUND: "Cuenta no encontrada",
  NO_EXTENSION_FOUND: "Extensión no encontrada"
}, Fb = {
  JSON_LOAD_FAILED: "Error al cargar el archivo JSON",
  MNEMONIC_UNDEFINED: "Mnemónico indefinido. Por favor, establece el mnemónico en las variables de entorno",
  NO_MNEMONIC_OR_SEED: "No se proporcionó mnemónico ni semilla",
  CANT_FIND_KEYRINGPAIR: "No se puede encontrar el keyringpair para {{address}}",
  ENVIRONMENT_NOT_READY: "Entorno no listo",
  INVALID_SIGNATURE: "Firma inválida",
  NOT_IMPLEMENTED: "No implementado",
  SITE_KEY_MISSING: "Falta la CLAVE DEL SITIO",
  ACCOUNT_NOT_FOUND: "Cuenta no encontrada"
}, Hb = {
  INVALID_METHOD: "Método de contrato inválido",
  TX_ERROR: "Error al hacer la tx",
  INVALID_ADDRESS: "Error al codificar dirección inválida",
  INVALID_STORAGE_NAME: "No se encontró el nombre de almacenamiento proporcionado",
  CAPTCHA_SOLUTION_COMMITMENT_DOES_NOT_EXIST: "El compromiso de la solución del captcha no existe",
  CONTRACT_UNDEFINED: "Contrato indefinido",
  SIGNER_UNDEFINED: "Firmante indefinido",
  CANNOT_FIND_KEYPAIR: "No se puede encontrar el par de claves",
  INTERRUPTED_EVENT: "Evento interrumpido",
  TOO_MANY_CALLS: "Demasiadas llamadas",
  UNKNOWN_ERROR: "Error desconocido",
  CHAIN_DECIMALS_UNDEFINED: "Decimales de la cadena no definidos",
  INVALID_DATA_FORMAT: "Formato de datos inválido",
  TX_QUEUE_ERROR: "Error en la cola de transacciones",
  DISPATCH_ERROR: "Error al despachar la transacción"
}, Ub = {
  UNKNOWN_ENVIRONMENT: "Entorno solicitado desconocido",
  INVALID_CAPTCHA_NUMBER: "Por favor configura las captchas correctamente",
  INVALID_LOG_LEVEL: "Nivel de registro inválido",
  INVALID_PACKAGE_DIR: "Directorio del paquete inválido"
}, Vb = {
  DATASET_PARSE_ERROR: "Error al analizar el conjunto de datos",
  SOLUTION_PARSE_ERROR: "Error al analizar el conjunto de soluciones",
  HASH_ERROR: "Error al hashear el conjunto de datos",
  DATASET_ID_UNDEFINED: "ID de conjunto de datos indefinido",
  NOT_ENOUGH_LABELS: "No hay suficientes etiquetas",
  NOT_ENOUGH_IMAGES: "No hay suficientes imágenes",
  CAPTCHAS_COUNT_LESS_THAN_CONFIGURED: "La cantidad de captchas en el conjunto de datos es menor a la cantidad configurada",
  SOLUTIONS_COUNT_LESS_THAN_CONFIGURED: "La cantidad de soluciones en el conjunto de datos es menor a la cantidad configurada",
  DUPLICATE_IMAGE: "Imagen duplicada detectada",
  MERKLE_ERROR: "Error al crear el árbol de Merkle"
}, zb = {
  DATABASE_IMPORT_FAILED: "Error al importar el motor de la base de datos",
  DATABASE_UNDEFINED: "El cliente de la base de datos no está conectado",
  DATABASE_HOST_UNDEFINED: "La dirección del host de la base de datos no está definida",
  DATASET_LOAD_FAILED: "Error al cargar el conjunto de datos",
  DATASET_GET_FAILED: "Error al obtener el conjunto de datos",
  CAPTCHA_GET_FAILED: "Error al obtener el captcha",
  CAPTCHA_UPDATE_FAILED: "Error al actualizar el captcha",
  IMAGE_GET_FAILED: "Error al obtener la imagen",
  PENDING_RECORD_NOT_FOUND: "No se encontró ningún registro pendiente",
  INVALID_HASH: "Hash inválido",
  SOLUTION_GET_FAILED: "Error al obtener la solución",
  DATASET_WITH_SOLUTIONS_GET_FAILED: "No se encontraron conjuntos de datos con la cantidad requerida de soluciones",
  SOLUTION_APPROVE_FAILED: "Error al aprobar la solución",
  SOLUTION_FLAG_FAILED: "Error al marcar la solución como procesada",
  TABLES_UNDEFINED: "Tablas indefinidas",
  CONNECTION_UNDEFINED: "Conexión indefinida",
  COMMITMENT_FLAG_FAILED: "Error al marcar el compromiso como procesado"
}, Bb = {
  PARSE_ERROR: "Error al analizar el captcha",
  INVALID_CAPTCHA_ID: "ID de captcha inválido",
  INVALID_ITEM_FORMAT: "Solo se permiten tipos de elementos de imagen y texto",
  INVALID_SOLUTION_TYPE: "Tipo de solución inválido",
  INVALID_ITEM_HASH: "Hash de elemento inválido",
  DIFFERENT_DATASET_IDS: "Los IDs del conjunto de datos no coinciden",
  INVALID_TIMESTAMP: "Marca de tiempo inválida",
  ID_MISMATCH: "Desajuste de ID de captcha",
  MISSING_ITEM_HASH: "Falta el hash del elemento",
  INVALID_CAPTCHA_CHALLENGE: "Desafío de captcha inválido",
  DAPP_USER_SOLUTION_NOT_FOUND: "No se encontró la solución del usuario de la Dapp",
  NO_CAPTCHA: "No se encontró captcha",
  INVALID_TOKEN: "Token inválido",
  INVALID_SOLUTION: "Solución inválida"
}, Wb = {
  CAPTCHA_FAILED: "Respondiste incorrectamente a uno o más captchas. Por favor, inténtalo de nuevo",
  CAPTCHA_PASSED: "Respondiste correctamente a los captchas",
  BAD_REQUEST: "Solicitud incorrecta",
  USER_VERIFIED: "Usuario verificado",
  USER_NOT_VERIFIED: "Usuario no verificado",
  USER_NOT_VERIFIED_TIME_EXPIRED: "Usuario no verificado. La solución del captcha ha expirado.",
  USER_NOT_VERIFIED_NO_SOLUTION: "Usuario no verificado. No se encontró solución de captcha.",
  USER_ALREADY_VERIFIED: "Esta solución ya ha sido verificada. El usuario debe completar un nuevo captcha.",
  UNKNOWN: "Error desconocido en el API"
}, Gb = {
  PARAMETER_ERROR: "Parámetro inválido"
}, Zb = {
  PROSOPO_SITE_KEY_MISSING: "PROSOPO_SITE_KEY no está configurado en el archivo .env.",
  PROVIDER_NO_CAPTCHA: "No se devolvieron captchas del proveedor",
  MISSING_PROVIDER_PAIR: "Falta el par de proveedor",
  MISSING_ENV_VARIABLE: "Falta una variable de entorno",
  GENERAL: "Error general de desarrollo, ver contexto",
  MISSING_SECRET_KEY: "Falta la clave secreta",
  KEY_ERROR: "Error de clave",
  METHOD_NOT_IMPLEMENTED: "Método no implementado"
}, Yb = {
  FILE_NOT_FOUND: "Archivo no encontrado",
  FILE_ALREADY_EXISTS: "El archivo ya existe",
  INVALID_DIR_FORMAT: "Formato de directorio inválido"
}, Kb = "animales", Xb = "antílope", Jb = "mochila", Qb = "tejón", qb = "murciélago", e_ = "bañera", t_ = "oso", n_ = "abeja", r_ = "escarabajo", o_ = "billar", a_ = "binoculares", i_ = "baño-de-aves", s_ = "bisonte", l_ = "dirigible", u_ = "jabalí", c_ = "panificadora", d_ = "bulldozer", f_ = "mariposa", p_ = "cactus", h_ = "pastel", m_ = "calculadora", x_ = "camello", g_ = "canoa", v_ = "oruga", y_ = "cd", w_ = "candelabro", b_ = "chimpancé", __ = "palillos", S_ = "cucaracha", k_ = "ataúd", E_ = "moneda", C_ = "cometa", T_ = "caracola", O_ = "cormorán", N_ = "vaca", I_ = "coyote", L_ = "cangrejo", A_ = "cuervo", R_ = "dados", P_ = "delfín", D_ = "burro", $_ = "manilla-de-puerta", M_ = "libélula", j_ = "pato", F_ = "águila", H_ = "elefante", U_ = "alce", V_ = "gafas", z_ = "helecho", B_ = "fuegos-artificiales", W_ = "flamenco", G_ = "mosca", Z_ = "zorro", Y_ = "frisbee", K_ = "rana", X_ = "galaxia", J_ = "jirafa", Q_ = "cabra", q_ = "pez-dorado", e4 = "ganso", t4 = "gorila", n4 = "uvas", r4 = "saltamontes", o4 = "galgo", a4 = "hamburguesa", i4 = "hamaca", s4 = "hámster", l4 = "liebre", u4 = "armónica", c4 = "arpa", d4 = "clavicémbalo", f4 = "erizo", p4 = "helicóptero", h4 = "hibisco", m4 = "hipopótamo", x4 = "cálao", g4 = "reloj-de-arena", v4 = "colibrí", y4 = "hiena", w4 = "iguana", b4 = "ipod", _4 = "medusa", S4 = "canguro", k4 = "kayak", E4 = "koala", C4 = "escalera", T4 = "mariquitas", O4 = "portátil", N4 = "leopardo", I4 = "bombilla", L4 = "relámpago", A4 = "león", R4 = "lagarto", P4 = "llama", D4 = "langosta", $4 = "buzón", M4 = "mandolina", j4 = "marte", F4 = "colchón", H4 = "megáfono", U4 = "microscopio", V4 = "microondas", z4 = "minarete", B4 = "minotauro", W4 = "mosquito", G4 = "polilla", Z4 = "motos", Y4 = "ratón", K4 = "seta", X4 = "mejillones", J4 = "corbata", Q4 = "pulpo", q4 = "okapi", eS = "orangután", tS = "avestruz", nS = "nutria", rS = "búho", oS = "buey", aS = "ostra", iS = "panda", sS = "clip", lS = "loro", uS = "pelecaniformes", cS = "pingüino", dS = "fotocopiadora", fS = "piano", pS = "cerdo", hS = "paloma", mS = "puercoespín", xS = "zarigüeya", gS = "carrito-de-bebé", vS = "pirámide", yS = "mapache", wS = "arcoíris", bS = "rata", _S = "refrigerador", SS = "reno", kS = "rinoceronte", ES = "silla-de-montar", CS = "correlimos", TS = "saturno", OS = "destornillador", NS = "caballito-de-mar", IS = "foca", LS = "segway", AS = "tiburón", RS = "oveja", PS = "patineta", DS = "mofeta", $S = "rascacielos", MS = "chimenea-industrial", jS = "caracol", FS = "serpiente", HS = "zapatilla-deportiva", US = "moto-de-nieve", VS = "calcetines", zS = "espagueti", BS = "gorrión", WS = "cuchara", GS = "calamar", ZS = "ardilla", YS = "estrella-de-mar", KS = "estribos", XS = "girasol", JS = "superman", QS = "sushi", qS = "cisne", e3 = "tetera", t3 = "tigre", n3 = "sapo", r3 = "tostadora", o3 = "tomate", a3 = "lápida", i3 = "cinta-de-correr", s3 = "triceratops", l3 = "triciclo", u3 = "trípode", c3 = "pavo", d3 = "tortuga", f3 = "pinzas", p3 = "paraguas", h3 = "unicornio", m3 = "reloj", x3 = "cascada", g3 = "sandía", v3 = "ballena", y3 = "carretilla", w3 = "molino-de-viento", b3 = "lobo", _3 = "wombat", S3 = "pájaro-carpintero", k3 = "xilófono", E3 = "cebra", C3 = {
  ACCOUNT: Mb,
  WIDGET: jb,
  GENERAL: Fb,
  CONTRACT: Hb,
  CONFIG: Ub,
  DATASET: Vb,
  DATABASE: zb,
  CAPTCHA: Bb,
  API: Wb,
  CLI: Gb,
  DEVELOPER: Zb,
  FS: Yb,
  animals: Kb,
  antelope: Xb,
  backpack: Jb,
  badger: Qb,
  "baseball-bat": "bate-de-béisbol",
  "baseball-glove": "guante-de-béisbol",
  "basketball-hoop": "aro-de-baloncesto",
  bat: qb,
  bathtub: e_,
  bear: t_,
  bee: n_,
  "beer-mug": "jarra-de-cerveza",
  beetle: r_,
  billiards: o_,
  binoculars: a_,
  birdbath: i_,
  bison: s_,
  blimp: l_,
  boar: u_,
  "bonsai-tree": "árbol-bonsái",
  "boom-box": "radiocasete",
  "bowling-ball": "bola-de-bolos",
  "bowling-pin": "pino-de-bolos",
  "boxing-glove": "guante-de-boxeo",
  breadmaker: c_,
  bulldozer: d_,
  butterfly: f_,
  cactus: p_,
  cake: h_,
  calculator: m_,
  camel: x_,
  canoe: g_,
  "car-tire": "neumático",
  caterpillar: v_,
  cd: y_,
  "cereal-box": "caja-de-cereal",
  chandelier: w_,
  "chess-board": "tablero-de-ajedrez",
  chimpanzee: b_,
  chopsticks: __,
  cockroach: S_,
  coffin: k_,
  coin: E_,
  comet: C_,
  "computer-keyboard": "teclado-de-ordenador",
  "computer-monitor": "monitor-de-ordenador",
  "computer-mouse": "ratón-de-ordenador",
  conch: T_,
  cormorant: O_,
  "covered-wagon": "carro-cubierto",
  cow: N_,
  "cowboy-hat": "sombrero-vaquero",
  coyote: I_,
  crab: L_,
  crow: A_,
  "desk-globe": "globo-terráqueo",
  "diamond-ring": "anillo-de-diamantes",
  dice: R_,
  dolphin: P_,
  donkey: D_,
  doorknob: $_,
  dragonfly: M_,
  "drinking-straw": "pajilla",
  duck: j_,
  "dumb-bell": "mancuerna",
  eagle: F_,
  "eiffel-tower": "torre-eiffel",
  "electric-guitar": "guitarra-eléctrica",
  elephant: H_,
  elk: U_,
  eyeglasses: V_,
  fern: z_,
  "fire-extinguisher": "extintor",
  "fire-hydrant": "hidrante",
  "fire-truck": "camión-de-bomberos",
  fireworks: B_,
  flamingo: W_,
  fly: G_,
  fox: Z_,
  "french-horn": "trompa",
  "fried-egg": "huevo-frito",
  frisbee: Y_,
  frog: K_,
  "frying-pan": "sartén",
  galaxy: X_,
  "gas-pump": "bomba-de-gasolina",
  giraffe: J_,
  goat: Q_,
  "golden-gate-bridge": "puente-golden-gate",
  goldfish: q_,
  "golf-ball": "pelota-de-golf",
  goose: e4,
  gorilla: t4,
  grapes: n4,
  grasshopper: r4,
  greyhound: o4,
  "guitar-pick": "púa-de-guitarra",
  hamburger: a4,
  hammock: i4,
  hamster: s4,
  hare: l4,
  harmonica: u4,
  harp: c4,
  harpsichord: d4,
  "head-phones": "auriculares",
  hedgehog: f4,
  helicopter: p4,
  hibiscus: h4,
  hippopotamus: m4,
  "homer-simpson": "homer-simpson",
  hornbill: x4,
  "horseshoe-crab": "cangrejo-herradura",
  "hot-air-balloon": "globo-aerostático",
  "hot-dog": "perro-caliente",
  "hot-tub": "jacuzzi",
  hourglass: g4,
  "house-fly": "mosca-doméstica",
  hummingbird: v4,
  hyena: y4,
  "ice-cream-cone": "cono-de-helado",
  iguana: w4,
  ipod: b4,
  jellyfish: _4,
  "joy-stick": "joystick",
  kangaroo: S4,
  kayak: k4,
  "killer-whale": "orca",
  koala: E4,
  ladder: C4,
  ladybugs: T4,
  laptop: O4,
  leopard: N4,
  "license-plate": "placa-de-matrícula",
  "light-house": "faro",
  lightbulb: I4,
  lightning: L4,
  lion: A4,
  lizard: R4,
  llama: P4,
  lobster: D4,
  mailbox: $4,
  mandolin: M4,
  mars: j4,
  mattress: F4,
  megaphone: H4,
  microscope: U4,
  microwave: V4,
  minaret: z4,
  minotaur: B4,
  mosquito: W4,
  moth: G4,
  motorbikes: Z4,
  "mountain-bike": "bicicleta-de-montaña",
  mouse: Y4,
  mushroom: K4,
  mussels: X4,
  necktie: J4,
  octopus: Q4,
  okapi: q4,
  orangutan: eS,
  ostrich: tS,
  otter: nS,
  owl: rS,
  ox: oS,
  oyster: aS,
  "palm-pilot": "palm-pilot",
  "palm-tree": "palmera",
  panda: iS,
  "paper-shredder": "trituradora-de-papel",
  paperclip: sS,
  parrot: lS,
  "pci-card": "tarjeta-pci",
  pelecaniformes: uS,
  penguin: cS,
  photocopier: dS,
  piano: fS,
  "picnic-table": "mesa-de-picnic",
  pig: pS,
  pigeon: hS,
  "playing-card": "carta",
  porcupine: mS,
  possum: xS,
  pram: gS,
  pyramid: vS,
  raccoon: yS,
  "radio-telescope": "radiotelescopio",
  rainbow: wS,
  rat: bS,
  refrigerator: _S,
  reindeer: SS,
  rhinoceros: kS,
  "rotary-phone": "teléfono-rotatorio",
  "roulette-wheel": "ruleta",
  saddle: ES,
  sandpiper: CS,
  saturn: TS,
  "school-bus": "autobús-escolar",
  screwdriver: OS,
  seahorse: NS,
  seal: IS,
  segway: LS,
  "self-propelled-lawn-mower": "cortacésped-autopropulsado",
  shark: AS,
  sheep: RS,
  "sheet-music": "partitura",
  skateboard: PS,
  skunk: DS,
  skyscraper: $S,
  smokestack: MS,
  snail: jS,
  snake: FS,
  sneaker: HS,
  snowmobile: US,
  "soccer-ball": "balón-de-fútbol",
  socks: VS,
  "soda-can": "lata-de-refresco",
  spaghetti: zS,
  sparrow: BS,
  "speed-boat": "lancha-rápida",
  spoon: WS,
  squid: GS,
  squirrel: ZS,
  "stained-glass": "vidrieras",
  starfish: YS,
  "steering-wheel": "volante",
  stirrups: KS,
  sunflower: XS,
  superman: JS,
  sushi: QS,
  swan: qS,
  "t-shirt": "camiseta",
  teapot: e3,
  "teddy-bear": "oso-de-peluche",
  "telephone-box": "cabina-telefónica",
  "tennis-ball": "pelota-de-tenis",
  "tennis-court": "cancha-de-tenis",
  "tennis-racket": "raqueta-de-tenis",
  tiger: t3,
  toad: n3,
  toaster: r3,
  tomato: o3,
  tombstone: a3,
  "top-hat": "sombrero-de-copa",
  "touring-bike": "bicicleta-de-turismo",
  "tower-pisa": "torre-de-pisa",
  "traffic-light": "semáforo",
  treadmill: i3,
  triceratops: s3,
  tricycle: l3,
  tripod: u3,
  "tuning-fork": "diapasón",
  turkey: c3,
  turtle: d3,
  tweezer: f3,
  umbrella: p3,
  unicorn: h3,
  "video-projector": "proyector-de-video",
  "washing-machine": "lavadora",
  watch: m3,
  waterfall: x3,
  watermelon: g3,
  "welding-mask": "máscara-de-soldar",
  whale: v3,
  wheelbarrow: y3,
  windmill: w3,
  "wine-bottle": "botella-de-vino",
  wolf: b3,
  wombat: _3,
  woodpecker: S3,
  xylophone: k3,
  "yo-yo": "yo-yo",
  zebra: E3
}, T3 = {
  NO_POLKADOT_EXTENSION: "Extensão Polkadot não encontrada"
}, O3 = {
  SELECT_ALL: "Selecionar todos que contêm o seguinte",
  IF_NONE_CLICK_NEXT: "Se não houver nenhum, clique em Próximo",
  NEXT: "Próximo",
  SUBMIT: "Enviar",
  CANCEL: "Cancelar",
  I_AM_HUMAN: "Eu sou humano",
  NO_ACCOUNTS_FOUND: "Nenhuma conta encontrada",
  ACCOUNT_NOT_FOUND: "Conta não encontrada",
  NO_EXTENSION_FOUND: "Nenhuma extensão encontrada"
}, N3 = {
  JSON_LOAD_FAILED: "Falha ao carregar o arquivo JSON",
  MNEMONIC_UNDEFINED: "Mnemônico indefinido. Por favor, defina o mnemônico nas variáveis de ambiente",
  NO_MNEMONIC_OR_SEED: "Nenhum mnemônico ou seed fornecido",
  CANT_FIND_KEYRINGPAIR: "Não é possível encontrar o keyringpair para {{address}}",
  ENVIRONMENT_NOT_READY: "Ambiente não pronto",
  INVALID_SIGNATURE: "Assinatura inválida",
  NOT_IMPLEMENTED: "Não implementado",
  SITE_KEY_MISSING: "CHAVE DO SITE ausente",
  ACCOUNT_NOT_FOUND: "Conta não encontrada"
}, I3 = {
  INVALID_METHOD: "Método de contrato inválido",
  TX_ERROR: "Erro ao fazer tx",
  INVALID_ADDRESS: "Falha ao codificar endereço inválido",
  INVALID_STORAGE_NAME: "Falha ao encontrar o nome de armazenamento fornecido",
  CAPTCHA_SOLUTION_COMMITMENT_DOES_NOT_EXIST: "O compromisso da solução do captcha não existe",
  CONTRACT_UNDEFINED: "Contrato indefinido",
  SIGNER_UNDEFINED: "Assinante indefinido",
  CANNOT_FIND_KEYPAIR: "Não é possível encontrar o par de chaves",
  INTERRUPTED_EVENT: "Evento interrompido",
  TOO_MANY_CALLS: "Muitas chamadas",
  UNKNOWN_ERROR: "Erro desconhecido",
  CHAIN_DECIMALS_UNDEFINED: "Decimais da cadeia não definidos",
  INVALID_DATA_FORMAT: "Formato de dados inválido",
  TX_QUEUE_ERROR: "Erro na fila de transações",
  DISPATCH_ERROR: "Erro ao despachar a transação"
}, L3 = {
  UNKNOWN_ENVIRONMENT: "Ambiente solicitado desconhecido",
  INVALID_CAPTCHA_NUMBER: "Por favor, configure corretamente os captchas",
  INVALID_LOG_LEVEL: "Nível de log inválido",
  INVALID_PACKAGE_DIR: "Diretório do pacote inválido"
}, A3 = {
  DATASET_PARSE_ERROR: "Erro ao analisar o conjunto de dados",
  SOLUTION_PARSE_ERROR: "Erro ao analisar o conjunto de soluções",
  HASH_ERROR: "Erro ao gerar hash do conjunto de dados",
  DATASET_ID_UNDEFINED: "ID de conjunto de dados indefinido",
  NOT_ENOUGH_LABELS: "Não há rótulos suficientes",
  NOT_ENOUGH_IMAGES: "Não há imagens suficientes",
  CAPTCHAS_COUNT_LESS_THAN_CONFIGURED: "O número de captchas no conjunto de dados é menor que o número configurado",
  SOLUTIONS_COUNT_LESS_THAN_CONFIGURED: "O número de soluções no conjunto de dados é menor que o número configurado",
  DUPLICATE_IMAGE: "Imagem duplicada detectada",
  MERKLE_ERROR: "Erro ao criar a árvore de Merkle"
}, R3 = {
  DATABASE_IMPORT_FAILED: "Falha ao importar o mecanismo do banco de dados",
  DATABASE_UNDEFINED: "Cliente do banco de dados não está conectado",
  DATABASE_HOST_UNDEFINED: "Endereço do host do banco de dados não está definido",
  DATASET_LOAD_FAILED: "Falha ao carregar o conjunto de dados",
  DATASET_GET_FAILED: "Falha ao obter o conjunto de dados",
  CAPTCHA_GET_FAILED: "Falha ao obter o captcha",
  CAPTCHA_UPDATE_FAILED: "Falha ao atualizar o captcha",
  IMAGE_GET_FAILED: "Falha ao obter a imagem",
  PENDING_RECORD_NOT_FOUND: "Nenhum registro pendente encontrado",
  INVALID_HASH: "Hash inválido",
  SOLUTION_GET_FAILED: "Falha ao obter a solução",
  DATASET_WITH_SOLUTIONS_GET_FAILED: "Nenhum conjunto de dados encontrado com o número necessário de soluções",
  SOLUTION_APPROVE_FAILED: "Falha ao aprovar a solução",
  SOLUTION_FLAG_FAILED: "Falha ao marcar a solução como processada",
  TABLES_UNDEFINED: "Tabelas indefinidas",
  CONNECTION_UNDEFINED: "Conexão indefinida",
  COMMITMENT_FLAG_FAILED: "Falha ao marcar o compromisso como processado"
}, P3 = {
  PARSE_ERROR: "Erro ao analisar o captcha",
  INVALID_CAPTCHA_ID: "ID de captcha inválido",
  INVALID_ITEM_FORMAT: "Somente tipos de itens de imagem e texto são permitidos",
  INVALID_SOLUTION_TYPE: "Tipo de solução inválido",
  INVALID_ITEM_HASH: "Hash do item inválido",
  DIFFERENT_DATASET_IDS: "Os IDs do conjunto de dados não correspondem",
  INVALID_TIMESTAMP: "Carimbo de data/hora inválido",
  ID_MISMATCH: "Desajuste de ID do captcha",
  MISSING_ITEM_HASH: "Hash do item ausente",
  INVALID_CAPTCHA_CHALLENGE: "Desafio de captcha inválido",
  DAPP_USER_SOLUTION_NOT_FOUND: "Solução do usuário da Dapp não encontrada",
  NO_CAPTCHA: "Nenhum captcha encontrado",
  INVALID_TOKEN: "Token inválido",
  INVALID_SOLUTION: "Solução inválida"
}, D3 = {
  CAPTCHA_FAILED: "Você respondeu incorretamente a um ou mais captchas. Por favor, tente novamente",
  CAPTCHA_PASSED: "Você respondeu corretamente aos captchas",
  BAD_REQUEST: "Solicitação Inválida",
  USER_VERIFIED: "Usuário verificado",
  USER_NOT_VERIFIED: "Usuário não verificado",
  USER_NOT_VERIFIED_TIME_EXPIRED: "Usuário não verificado. A solução do captcha expirou.",
  USER_NOT_VERIFIED_NO_SOLUTION: "Usuário não verificado. Nenhuma solução de captcha encontrada.",
  USER_ALREADY_VERIFIED: "Esta solução já foi verificada. O usuário deve completar um novo captcha.",
  UNKNOWN: "Erro desconhecido na API"
}, $3 = {
  PARAMETER_ERROR: "Parâmetro inválido"
}, M3 = {
  PROSOPO_SITE_KEY_MISSING: "PROSOPO_SITE_KEY não está definido no arquivo .env.",
  PROVIDER_NO_CAPTCHA: "Nenhum captcha retornado do provedor",
  MISSING_PROVIDER_PAIR: "Par de provedor ausente",
  MISSING_ENV_VARIABLE: "Variável de ambiente ausente",
  GENERAL: "Erro geral de desenvolvimento, veja o contexto",
  MISSING_SECRET_KEY: "Chave secreta ausente",
  KEY_ERROR: "Erro de chave",
  METHOD_NOT_IMPLEMENTED: "Método não implementado"
}, j3 = {
  FILE_NOT_FOUND: "Arquivo não encontrado",
  FILE_ALREADY_EXISTS: "Arquivo já existe",
  INVALID_DIR_FORMAT: "Formato de diretório inválido"
}, F3 = "animais", H3 = "antílope", U3 = "mochila", V3 = "texugo", z3 = "morcego", B3 = "banheira", W3 = "urso", G3 = "abelha", Z3 = "besouro", Y3 = "sinuca", K3 = "binóculos", X3 = "bebedouro-para-pássaros", J3 = "bisonte", Q3 = "dirigível", q3 = "javali", ek = "máquina-de-pão", tk = "trator", nk = "borboleta", rk = "cacto", ok = "bolo", ak = "calculadora", ik = "camelo", sk = "canoa", lk = "lagarta", uk = "cd", ck = "lustre", dk = "chimpanzé", fk = "hashis", pk = "barata", hk = "caixão", mk = "moeda", xk = "cometa", gk = "concha", vk = "corvo-marinho", yk = "vaca", wk = "coiote", bk = "caranguejo", _k = "corvo", Sk = "dados", kk = "golfinho", Ek = "burro", Ck = "maçaneta", Tk = "libélula", Ok = "pato", Nk = "águia", Ik = "elefante", Lk = "alce", Ak = "óculos", Rk = "samambaia", Pk = "fogos-de-artifício", Dk = "flamingo", $k = "mosca", Mk = "raposa", jk = "frisbee", Fk = "sapo", Hk = "galáxia", Uk = "girafa", Vk = "cabra", zk = "peixinho-dourado", Bk = "ganso", Wk = "gorila", Gk = "uvas", Zk = "gafanhoto", Yk = "galgo", Kk = "hambúrguer", Xk = "rede", Jk = "hamster", Qk = "lebre", qk = "gaita", eE = "harpa", tE = "cravo", nE = "ouriço", rE = "helicóptero", oE = "hibisco", aE = "hipopótamo", iE = "calau", sE = "ampulheta", lE = "beija-flor", uE = "hiena", cE = "iguana", dE = "ipod", fE = "água-viva", pE = "canguru", hE = "caiaque", mE = "coala", xE = "escada", gE = "joaninhas", vE = "laptop", yE = "leopardo", wE = "lâmpada", bE = "raio", _E = "leão", SE = "lagarto", kE = "lhama", EE = "lagosta", CE = "caixa-de-correio", TE = "bandolim", OE = "marte", NE = "colchão", IE = "megafone", LE = "microscópio", AE = "micro-ondas", RE = "minarete", PE = "minotauro", DE = "mosquito", $E = "mariposa", ME = "motos", jE = "camundongo", FE = "cogumelo", HE = "mexilhões", UE = "gravata", VE = "polvo", zE = "ocapi", BE = "orangotango", WE = "avestruz", GE = "lontra", ZE = "coruja", YE = "boi", KE = "ostra", XE = "panda", JE = "clipe", QE = "papagaio", qE = "pelecaniformes", eC = "pinguim", tC = "fotocopiadora", nC = "piano", rC = "porco", oC = "pombo", aC = "porco-espinho", iC = "gambá", sC = "carrinho-de-bebê", lC = "pirâmide", uC = "guaxinim", cC = "arco-íris", dC = "rato", fC = "geladeira", pC = "rena", hC = "rinoceronte", mC = "sela", xC = "maçarico", gC = "saturno", vC = "chave-de-fenda", yC = "cavalo-marinho", wC = "foca", bC = "segway", _C = "tubarão", SC = "ovelha", kC = "skate", EC = "gambá", CC = "arranha-céu", TC = "chaminé", OC = "caracol", NC = "cobra", IC = "tênis", LC = "moto-de-neve", AC = "meias", RC = "espaguete", PC = "pardal", DC = "colher", $C = "lula", MC = "esquilo", jC = "estrela-do-mar", FC = "estribos", HC = "girassol", UC = "superman", VC = "sushi", zC = "cisne", BC = "bule", WC = "tigre", GC = "sapo", ZC = "torradeira", YC = "tomate", KC = "lápide", XC = "esteira", JC = "tricerátopo", QC = "triciclo", qC = "tripé", eT = "peru", tT = "tartaruga", nT = "pinça", rT = "guarda-chuva", oT = "unicórnio", aT = "relógio", iT = "cachoeira", sT = "melancia", lT = "baleia", uT = "carrinho-de-mão", cT = "moinho-de-vento", dT = "lobo", fT = "vombate", pT = "pica-pau", hT = "xilofone", mT = "zebra", xT = {
  ACCOUNT: T3,
  WIDGET: O3,
  GENERAL: N3,
  CONTRACT: I3,
  CONFIG: L3,
  DATASET: A3,
  DATABASE: R3,
  CAPTCHA: P3,
  API: D3,
  CLI: $3,
  DEVELOPER: M3,
  FS: j3,
  animals: F3,
  antelope: H3,
  backpack: U3,
  badger: V3,
  "baseball-bat": "taco-de-baseball",
  "baseball-glove": "luva-de-baseball",
  "basketball-hoop": "cesta-de-basquete",
  bat: z3,
  bathtub: B3,
  bear: W3,
  bee: G3,
  "beer-mug": "caneca-de-cerveja",
  beetle: Z3,
  billiards: Y3,
  binoculars: K3,
  birdbath: X3,
  bison: J3,
  blimp: Q3,
  boar: q3,
  "bonsai-tree": "árvore-bonsai",
  "boom-box": "rádio-gravador",
  "bowling-ball": "bola-de-boliche",
  "bowling-pin": "pino-de-boliche",
  "boxing-glove": "luva-de-boxe",
  breadmaker: ek,
  bulldozer: tk,
  butterfly: nk,
  cactus: rk,
  cake: ok,
  calculator: ak,
  camel: ik,
  canoe: sk,
  "car-tire": "pneu",
  caterpillar: lk,
  cd: uk,
  "cereal-box": "caixa-de-cereal",
  chandelier: ck,
  "chess-board": "tabuleiro-de-xadrez",
  chimpanzee: dk,
  chopsticks: fk,
  cockroach: pk,
  coffin: hk,
  coin: mk,
  comet: xk,
  "computer-keyboard": "teclado-de-computador",
  "computer-monitor": "monitor-de-computador",
  "computer-mouse": "mouse-de-computador",
  conch: gk,
  cormorant: vk,
  "covered-wagon": "carroça-coberta",
  cow: yk,
  "cowboy-hat": "chapéu-de-cowboy",
  coyote: wk,
  crab: bk,
  crow: _k,
  "desk-globe": "globo-terrestre",
  "diamond-ring": "anel-de-diamante",
  dice: Sk,
  dolphin: kk,
  donkey: Ek,
  doorknob: Ck,
  dragonfly: Tk,
  "drinking-straw": "canudo",
  duck: Ok,
  "dumb-bell": "halter",
  eagle: Nk,
  "eiffel-tower": "torre-eiffel",
  "electric-guitar": "guitarra-elétrica",
  elephant: Ik,
  elk: Lk,
  eyeglasses: Ak,
  fern: Rk,
  "fire-extinguisher": "extintor-de-incêndio",
  "fire-hydrant": "hidrante",
  "fire-truck": "caminhão-de-bombeiros",
  fireworks: Pk,
  flamingo: Dk,
  fly: $k,
  fox: Mk,
  "french-horn": "trompa",
  "fried-egg": "ovo-frito",
  frisbee: jk,
  frog: Fk,
  "frying-pan": "frigideira",
  galaxy: Hk,
  "gas-pump": "bomba-de-gasolina",
  giraffe: Uk,
  goat: Vk,
  "golden-gate-bridge": "ponte-golden-gate",
  goldfish: zk,
  "golf-ball": "bola-de-golfe",
  goose: Bk,
  gorilla: Wk,
  grapes: Gk,
  grasshopper: Zk,
  greyhound: Yk,
  "guitar-pick": "palheta",
  hamburger: Kk,
  hammock: Xk,
  hamster: Jk,
  hare: Qk,
  harmonica: qk,
  harp: eE,
  harpsichord: tE,
  "head-phones": "fones-de-ouvido",
  hedgehog: nE,
  helicopter: rE,
  hibiscus: oE,
  hippopotamus: aE,
  "homer-simpson": "homer-simpson",
  hornbill: iE,
  "horseshoe-crab": "caranguejo-ferradura",
  "hot-air-balloon": "balão-de-ar-quente",
  "hot-dog": "cachorro-quente",
  "hot-tub": "banheira-de-hidromassagem",
  hourglass: sE,
  "house-fly": "mosca-doméstica",
  hummingbird: lE,
  hyena: uE,
  "ice-cream-cone": "casquinha-de-sorvete",
  iguana: cE,
  ipod: dE,
  jellyfish: fE,
  "joy-stick": "joystick",
  kangaroo: pE,
  kayak: hE,
  "killer-whale": "orca",
  koala: mE,
  ladder: xE,
  ladybugs: gE,
  laptop: vE,
  leopard: yE,
  "license-plate": "placa-de-carro",
  "light-house": "farol",
  lightbulb: wE,
  lightning: bE,
  lion: _E,
  lizard: SE,
  llama: kE,
  lobster: EE,
  mailbox: CE,
  mandolin: TE,
  mars: OE,
  mattress: NE,
  megaphone: IE,
  microscope: LE,
  microwave: AE,
  minaret: RE,
  minotaur: PE,
  mosquito: DE,
  moth: $E,
  motorbikes: ME,
  "mountain-bike": "bicicleta-de-montanha",
  mouse: jE,
  mushroom: FE,
  mussels: HE,
  necktie: UE,
  octopus: VE,
  okapi: zE,
  orangutan: BE,
  ostrich: WE,
  otter: GE,
  owl: ZE,
  ox: YE,
  oyster: KE,
  "palm-pilot": "palm-pilot",
  "palm-tree": "palmeira",
  panda: XE,
  "paper-shredder": "triturador-de-papel",
  paperclip: JE,
  parrot: QE,
  "pci-card": "cartão-pci",
  pelecaniformes: qE,
  penguin: eC,
  photocopier: tC,
  piano: nC,
  "picnic-table": "mesa-de-picnic",
  pig: rC,
  pigeon: oC,
  "playing-card": "carta-de-baralho",
  porcupine: aC,
  possum: iC,
  pram: sC,
  pyramid: lC,
  raccoon: uC,
  "radio-telescope": "radiotelescópio",
  rainbow: cC,
  rat: dC,
  refrigerator: fC,
  reindeer: pC,
  rhinoceros: hC,
  "rotary-phone": "telefone-rotativo",
  "roulette-wheel": "roleta",
  saddle: mC,
  sandpiper: xC,
  saturn: gC,
  "school-bus": "ônibus-escolar",
  screwdriver: vC,
  seahorse: yC,
  seal: wC,
  segway: bC,
  "self-propelled-lawn-mower": "cortador-de-grama-autopropelido",
  shark: _C,
  sheep: SC,
  "sheet-music": "partitura",
  skateboard: kC,
  skunk: EC,
  skyscraper: CC,
  smokestack: TC,
  snail: OC,
  snake: NC,
  sneaker: IC,
  snowmobile: LC,
  "soccer-ball": "bola-de-futebol",
  socks: AC,
  "soda-can": "lata-de-refrigerante",
  spaghetti: RC,
  sparrow: PC,
  "speed-boat": "lancha",
  spoon: DC,
  squid: $C,
  squirrel: MC,
  "stained-glass": "vitrais",
  starfish: jC,
  "steering-wheel": "volante",
  stirrups: FC,
  sunflower: HC,
  superman: UC,
  sushi: VC,
  swan: zC,
  "t-shirt": "camiseta",
  teapot: BC,
  "teddy-bear": "urso-de-pelúcia",
  "telephone-box": "cabine-telefônica",
  "tennis-ball": "bola-de-tênis",
  "tennis-court": "quadra-de-tênis",
  "tennis-racket": "raquete-de-tênis",
  tiger: WC,
  toad: GC,
  toaster: ZC,
  tomato: YC,
  tombstone: KC,
  "top-hat": "cartola",
  "touring-bike": "bicicleta-de-turismo",
  "tower-pisa": "torre-de-pisa",
  "traffic-light": "semáforo",
  treadmill: XC,
  triceratops: JC,
  tricycle: QC,
  tripod: qC,
  "tuning-fork": "diapasão",
  turkey: eT,
  turtle: tT,
  tweezer: nT,
  umbrella: rT,
  unicorn: oT,
  "video-projector": "projetor-de-vídeo",
  "washing-machine": "máquina-de-lavar",
  watch: aT,
  waterfall: iT,
  watermelon: sT,
  "welding-mask": "máscara-de-solda",
  whale: lT,
  wheelbarrow: uT,
  windmill: cT,
  "wine-bottle": "garrafa-de-vinho",
  wolf: dT,
  wombat: fT,
  woodpecker: pT,
  xylophone: hT,
  "yo-yo": "ioiô",
  zebra: mT
};
var ee;
(function(e) {
  e.assertEqual = (o) => o;
  function t(o) {
  }
  e.assertIs = t;
  function n(o) {
    throw new Error();
  }
  e.assertNever = n, e.arrayToEnum = (o) => {
    const a = {};
    for (const i of o)
      a[i] = i;
    return a;
  }, e.getValidEnumValues = (o) => {
    const a = e.objectKeys(o).filter((s) => typeof o[o[s]] != "number"), i = {};
    for (const s of a)
      i[s] = o[s];
    return e.objectValues(i);
  }, e.objectValues = (o) => e.objectKeys(o).map(function(a) {
    return o[a];
  }), e.objectKeys = typeof Object.keys == "function" ? (o) => Object.keys(o) : (o) => {
    const a = [];
    for (const i in o)
      Object.prototype.hasOwnProperty.call(o, i) && a.push(i);
    return a;
  }, e.find = (o, a) => {
    for (const i of o)
      if (a(i))
        return i;
  }, e.isInteger = typeof Number.isInteger == "function" ? (o) => Number.isInteger(o) : (o) => typeof o == "number" && isFinite(o) && Math.floor(o) === o;
  function r(o, a = " | ") {
    return o.map((i) => typeof i == "string" ? `'${i}'` : i).join(a);
  }
  e.joinValues = r, e.jsonStringifyReplacer = (o, a) => typeof a == "bigint" ? a.toString() : a;
})(ee || (ee = {}));
var su;
(function(e) {
  e.mergeShapes = (t, n) => ({
    ...t,
    ...n
    // second overwrites first
  });
})(su || (su = {}));
const D = ee.arrayToEnum([
  "string",
  "nan",
  "number",
  "integer",
  "float",
  "boolean",
  "date",
  "bigint",
  "symbol",
  "function",
  "undefined",
  "null",
  "array",
  "object",
  "unknown",
  "promise",
  "void",
  "never",
  "map",
  "set"
]), Mn = (e) => {
  switch (typeof e) {
    case "undefined":
      return D.undefined;
    case "string":
      return D.string;
    case "number":
      return isNaN(e) ? D.nan : D.number;
    case "boolean":
      return D.boolean;
    case "function":
      return D.function;
    case "bigint":
      return D.bigint;
    case "symbol":
      return D.symbol;
    case "object":
      return Array.isArray(e) ? D.array : e === null ? D.null : e.then && typeof e.then == "function" && e.catch && typeof e.catch == "function" ? D.promise : typeof Map < "u" && e instanceof Map ? D.map : typeof Set < "u" && e instanceof Set ? D.set : typeof Date < "u" && e instanceof Date ? D.date : D.object;
    default:
      return D.unknown;
  }
}, T = ee.arrayToEnum([
  "invalid_type",
  "invalid_literal",
  "custom",
  "invalid_union",
  "invalid_union_discriminator",
  "invalid_enum_value",
  "unrecognized_keys",
  "invalid_arguments",
  "invalid_return_type",
  "invalid_date",
  "invalid_string",
  "too_small",
  "too_big",
  "invalid_intersection_types",
  "not_multiple_of",
  "not_finite"
]), gT = (e) => JSON.stringify(e, null, 2).replace(/"([^"]+)":/g, "$1:");
class mt extends Error {
  constructor(t) {
    super(), this.issues = [], this.addIssue = (r) => {
      this.issues = [...this.issues, r];
    }, this.addIssues = (r = []) => {
      this.issues = [...this.issues, ...r];
    };
    const n = new.target.prototype;
    Object.setPrototypeOf ? Object.setPrototypeOf(this, n) : this.__proto__ = n, this.name = "ZodError", this.issues = t;
  }
  get errors() {
    return this.issues;
  }
  format(t) {
    const n = t || function(a) {
      return a.message;
    }, r = { _errors: [] }, o = (a) => {
      for (const i of a.issues)
        if (i.code === "invalid_union")
          i.unionErrors.map(o);
        else if (i.code === "invalid_return_type")
          o(i.returnTypeError);
        else if (i.code === "invalid_arguments")
          o(i.argumentsError);
        else if (i.path.length === 0)
          r._errors.push(n(i));
        else {
          let s = r, l = 0;
          for (; l < i.path.length; ) {
            const c = i.path[l];
            l === i.path.length - 1 ? (s[c] = s[c] || { _errors: [] }, s[c]._errors.push(n(i))) : s[c] = s[c] || { _errors: [] }, s = s[c], l++;
          }
        }
    };
    return o(this), r;
  }
  static assert(t) {
    if (!(t instanceof mt))
      throw new Error(`Not a ZodError: ${t}`);
  }
  toString() {
    return this.message;
  }
  get message() {
    return JSON.stringify(this.issues, ee.jsonStringifyReplacer, 2);
  }
  get isEmpty() {
    return this.issues.length === 0;
  }
  flatten(t = (n) => n.message) {
    const n = {}, r = [];
    for (const o of this.issues)
      o.path.length > 0 ? (n[o.path[0]] = n[o.path[0]] || [], n[o.path[0]].push(t(o))) : r.push(t(o));
    return { formErrors: r, fieldErrors: n };
  }
  get formErrors() {
    return this.flatten();
  }
}
mt.create = (e) => new mt(e);
const uo = (e, t) => {
  let n;
  switch (e.code) {
    case T.invalid_type:
      e.received === D.undefined ? n = "Required" : n = `Expected ${e.expected}, received ${e.received}`;
      break;
    case T.invalid_literal:
      n = `Invalid literal value, expected ${JSON.stringify(e.expected, ee.jsonStringifyReplacer)}`;
      break;
    case T.unrecognized_keys:
      n = `Unrecognized key(s) in object: ${ee.joinValues(e.keys, ", ")}`;
      break;
    case T.invalid_union:
      n = "Invalid input";
      break;
    case T.invalid_union_discriminator:
      n = `Invalid discriminator value. Expected ${ee.joinValues(e.options)}`;
      break;
    case T.invalid_enum_value:
      n = `Invalid enum value. Expected ${ee.joinValues(e.options)}, received '${e.received}'`;
      break;
    case T.invalid_arguments:
      n = "Invalid function arguments";
      break;
    case T.invalid_return_type:
      n = "Invalid function return type";
      break;
    case T.invalid_date:
      n = "Invalid date";
      break;
    case T.invalid_string:
      typeof e.validation == "object" ? "includes" in e.validation ? (n = `Invalid input: must include "${e.validation.includes}"`, typeof e.validation.position == "number" && (n = `${n} at one or more positions greater than or equal to ${e.validation.position}`)) : "startsWith" in e.validation ? n = `Invalid input: must start with "${e.validation.startsWith}"` : "endsWith" in e.validation ? n = `Invalid input: must end with "${e.validation.endsWith}"` : ee.assertNever(e.validation) : e.validation !== "regex" ? n = `Invalid ${e.validation}` : n = "Invalid";
      break;
    case T.too_small:
      e.type === "array" ? n = `Array must contain ${e.exact ? "exactly" : e.inclusive ? "at least" : "more than"} ${e.minimum} element(s)` : e.type === "string" ? n = `String must contain ${e.exact ? "exactly" : e.inclusive ? "at least" : "over"} ${e.minimum} character(s)` : e.type === "number" ? n = `Number must be ${e.exact ? "exactly equal to " : e.inclusive ? "greater than or equal to " : "greater than "}${e.minimum}` : e.type === "date" ? n = `Date must be ${e.exact ? "exactly equal to " : e.inclusive ? "greater than or equal to " : "greater than "}${new Date(Number(e.minimum))}` : n = "Invalid input";
      break;
    case T.too_big:
      e.type === "array" ? n = `Array must contain ${e.exact ? "exactly" : e.inclusive ? "at most" : "less than"} ${e.maximum} element(s)` : e.type === "string" ? n = `String must contain ${e.exact ? "exactly" : e.inclusive ? "at most" : "under"} ${e.maximum} character(s)` : e.type === "number" ? n = `Number must be ${e.exact ? "exactly" : e.inclusive ? "less than or equal to" : "less than"} ${e.maximum}` : e.type === "bigint" ? n = `BigInt must be ${e.exact ? "exactly" : e.inclusive ? "less than or equal to" : "less than"} ${e.maximum}` : e.type === "date" ? n = `Date must be ${e.exact ? "exactly" : e.inclusive ? "smaller than or equal to" : "smaller than"} ${new Date(Number(e.maximum))}` : n = "Invalid input";
      break;
    case T.custom:
      n = "Invalid input";
      break;
    case T.invalid_intersection_types:
      n = "Intersection results could not be merged";
      break;
    case T.not_multiple_of:
      n = `Number must be a multiple of ${e.multipleOf}`;
      break;
    case T.not_finite:
      n = "Number must be finite";
      break;
    default:
      n = t.defaultError, ee.assertNever(e);
  }
  return { message: n };
};
let Gp = uo;
function vT(e) {
  Gp = e;
}
function Vi() {
  return Gp;
}
const zi = (e) => {
  const { data: t, path: n, errorMaps: r, issueData: o } = e, a = [...n, ...o.path || []], i = {
    ...o,
    path: a
  };
  if (o.message !== void 0)
    return {
      ...o,
      path: a,
      message: o.message
    };
  let s = "";
  const l = r.filter((c) => !!c).slice().reverse();
  for (const c of l)
    s = c(i, { data: t, defaultError: s }).message;
  return {
    ...o,
    path: a,
    message: s
  };
}, yT = [];
function R(e, t) {
  const n = Vi(), r = zi({
    issueData: t,
    data: e.data,
    path: e.path,
    errorMaps: [
      e.common.contextualErrorMap,
      e.schemaErrorMap,
      n,
      n === uo ? void 0 : uo
      // then global default map
    ].filter((o) => !!o)
  });
  e.common.issues.push(r);
}
class Ye {
  constructor() {
    this.value = "valid";
  }
  dirty() {
    this.value === "valid" && (this.value = "dirty");
  }
  abort() {
    this.value !== "aborted" && (this.value = "aborted");
  }
  static mergeArray(t, n) {
    const r = [];
    for (const o of n) {
      if (o.status === "aborted")
        return z;
      o.status === "dirty" && t.dirty(), r.push(o.value);
    }
    return { status: t.value, value: r };
  }
  static async mergeObjectAsync(t, n) {
    const r = [];
    for (const o of n) {
      const a = await o.key, i = await o.value;
      r.push({
        key: a,
        value: i
      });
    }
    return Ye.mergeObjectSync(t, r);
  }
  static mergeObjectSync(t, n) {
    const r = {};
    for (const o of n) {
      const { key: a, value: i } = o;
      if (a.status === "aborted" || i.status === "aborted")
        return z;
      a.status === "dirty" && t.dirty(), i.status === "dirty" && t.dirty(), a.value !== "__proto__" && (typeof i.value < "u" || o.alwaysSet) && (r[a.value] = i.value);
    }
    return { status: t.value, value: r };
  }
}
const z = Object.freeze({
  status: "aborted"
}), jr = (e) => ({ status: "dirty", value: e }), et = (e) => ({ status: "valid", value: e }), lu = (e) => e.status === "aborted", uu = (e) => e.status === "dirty", ra = (e) => e.status === "valid", oa = (e) => typeof Promise < "u" && e instanceof Promise;
function Bi(e, t, n, r) {
  if (typeof t == "function" ? e !== t || !r : !t.has(e)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
  return t.get(e);
}
function Zp(e, t, n, r, o) {
  if (typeof t == "function" ? e !== t || !o : !t.has(e)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
  return t.set(e, n), n;
}
var H;
(function(e) {
  e.errToObj = (t) => typeof t == "string" ? { message: t } : t || {}, e.toString = (t) => typeof t == "string" ? t : t == null ? void 0 : t.message;
})(H || (H = {}));
var Fo, Ho;
class cn {
  constructor(t, n, r, o) {
    this._cachedPath = [], this.parent = t, this.data = n, this._path = r, this._key = o;
  }
  get path() {
    return this._cachedPath.length || (this._key instanceof Array ? this._cachedPath.push(...this._path, ...this._key) : this._cachedPath.push(...this._path, this._key)), this._cachedPath;
  }
}
const _f = (e, t) => {
  if (ra(t))
    return { success: !0, data: t.value };
  if (!e.common.issues.length)
    throw new Error("Validation failed but no issues detected.");
  return {
    success: !1,
    get error() {
      if (this._error)
        return this._error;
      const n = new mt(e.common.issues);
      return this._error = n, this._error;
    }
  };
};
function G(e) {
  if (!e)
    return {};
  const { errorMap: t, invalid_type_error: n, required_error: r, description: o } = e;
  if (t && (n || r))
    throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
  return t ? { errorMap: t, description: o } : { errorMap: (i, s) => {
    var l, c;
    const { message: d } = e;
    return i.code === "invalid_enum_value" ? { message: d ?? s.defaultError } : typeof s.data > "u" ? { message: (l = d ?? r) !== null && l !== void 0 ? l : s.defaultError } : i.code !== "invalid_type" ? { message: s.defaultError } : { message: (c = d ?? n) !== null && c !== void 0 ? c : s.defaultError };
  }, description: o };
}
class X {
  constructor(t) {
    this.spa = this.safeParseAsync, this._def = t, this.parse = this.parse.bind(this), this.safeParse = this.safeParse.bind(this), this.parseAsync = this.parseAsync.bind(this), this.safeParseAsync = this.safeParseAsync.bind(this), this.spa = this.spa.bind(this), this.refine = this.refine.bind(this), this.refinement = this.refinement.bind(this), this.superRefine = this.superRefine.bind(this), this.optional = this.optional.bind(this), this.nullable = this.nullable.bind(this), this.nullish = this.nullish.bind(this), this.array = this.array.bind(this), this.promise = this.promise.bind(this), this.or = this.or.bind(this), this.and = this.and.bind(this), this.transform = this.transform.bind(this), this.brand = this.brand.bind(this), this.default = this.default.bind(this), this.catch = this.catch.bind(this), this.describe = this.describe.bind(this), this.pipe = this.pipe.bind(this), this.readonly = this.readonly.bind(this), this.isNullable = this.isNullable.bind(this), this.isOptional = this.isOptional.bind(this);
  }
  get description() {
    return this._def.description;
  }
  _getType(t) {
    return Mn(t.data);
  }
  _getOrReturnCtx(t, n) {
    return n || {
      common: t.parent.common,
      data: t.data,
      parsedType: Mn(t.data),
      schemaErrorMap: this._def.errorMap,
      path: t.path,
      parent: t.parent
    };
  }
  _processInputParams(t) {
    return {
      status: new Ye(),
      ctx: {
        common: t.parent.common,
        data: t.data,
        parsedType: Mn(t.data),
        schemaErrorMap: this._def.errorMap,
        path: t.path,
        parent: t.parent
      }
    };
  }
  _parseSync(t) {
    const n = this._parse(t);
    if (oa(n))
      throw new Error("Synchronous parse encountered promise.");
    return n;
  }
  _parseAsync(t) {
    const n = this._parse(t);
    return Promise.resolve(n);
  }
  parse(t, n) {
    const r = this.safeParse(t, n);
    if (r.success)
      return r.data;
    throw r.error;
  }
  safeParse(t, n) {
    var r;
    const o = {
      common: {
        issues: [],
        async: (r = n == null ? void 0 : n.async) !== null && r !== void 0 ? r : !1,
        contextualErrorMap: n == null ? void 0 : n.errorMap
      },
      path: (n == null ? void 0 : n.path) || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data: t,
      parsedType: Mn(t)
    }, a = this._parseSync({ data: t, path: o.path, parent: o });
    return _f(o, a);
  }
  async parseAsync(t, n) {
    const r = await this.safeParseAsync(t, n);
    if (r.success)
      return r.data;
    throw r.error;
  }
  async safeParseAsync(t, n) {
    const r = {
      common: {
        issues: [],
        contextualErrorMap: n == null ? void 0 : n.errorMap,
        async: !0
      },
      path: (n == null ? void 0 : n.path) || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data: t,
      parsedType: Mn(t)
    }, o = this._parse({ data: t, path: r.path, parent: r }), a = await (oa(o) ? o : Promise.resolve(o));
    return _f(r, a);
  }
  refine(t, n) {
    const r = (o) => typeof n == "string" || typeof n > "u" ? { message: n } : typeof n == "function" ? n(o) : n;
    return this._refinement((o, a) => {
      const i = t(o), s = () => a.addIssue({
        code: T.custom,
        ...r(o)
      });
      return typeof Promise < "u" && i instanceof Promise ? i.then((l) => l ? !0 : (s(), !1)) : i ? !0 : (s(), !1);
    });
  }
  refinement(t, n) {
    return this._refinement((r, o) => t(r) ? !0 : (o.addIssue(typeof n == "function" ? n(r, o) : n), !1));
  }
  _refinement(t) {
    return new Bt({
      schema: this,
      typeName: V.ZodEffects,
      effect: { type: "refinement", refinement: t }
    });
  }
  superRefine(t) {
    return this._refinement(t);
  }
  optional() {
    return on.create(this, this._def);
  }
  nullable() {
    return nr.create(this, this._def);
  }
  nullish() {
    return this.nullable().optional();
  }
  array() {
    return Ut.create(this, this._def);
  }
  promise() {
    return fo.create(this, this._def);
  }
  or(t) {
    return la.create([this, t], this._def);
  }
  and(t) {
    return ua.create(this, t, this._def);
  }
  transform(t) {
    return new Bt({
      ...G(this._def),
      schema: this,
      typeName: V.ZodEffects,
      effect: { type: "transform", transform: t }
    });
  }
  default(t) {
    const n = typeof t == "function" ? t : () => t;
    return new ha({
      ...G(this._def),
      innerType: this,
      defaultValue: n,
      typeName: V.ZodDefault
    });
  }
  brand() {
    return new Tc({
      typeName: V.ZodBranded,
      type: this,
      ...G(this._def)
    });
  }
  catch(t) {
    const n = typeof t == "function" ? t : () => t;
    return new ma({
      ...G(this._def),
      innerType: this,
      catchValue: n,
      typeName: V.ZodCatch
    });
  }
  describe(t) {
    const n = this.constructor;
    return new n({
      ...this._def,
      description: t
    });
  }
  pipe(t) {
    return Va.create(this, t);
  }
  readonly() {
    return xa.create(this);
  }
  isOptional() {
    return this.safeParse(void 0).success;
  }
  isNullable() {
    return this.safeParse(null).success;
  }
}
const wT = /^c[^\s-]{8,}$/i, bT = /^[0-9a-z]+$/, _T = /^[0-9A-HJKMNP-TV-Z]{26}$/, ST = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i, kT = /^[a-z0-9_-]{21}$/i, ET = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/, CT = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i, TT = "^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$";
let vl;
const OT = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/, NT = /^(([a-f0-9]{1,4}:){7}|::([a-f0-9]{1,4}:){0,6}|([a-f0-9]{1,4}:){1}:([a-f0-9]{1,4}:){0,5}|([a-f0-9]{1,4}:){2}:([a-f0-9]{1,4}:){0,4}|([a-f0-9]{1,4}:){3}:([a-f0-9]{1,4}:){0,3}|([a-f0-9]{1,4}:){4}:([a-f0-9]{1,4}:){0,2}|([a-f0-9]{1,4}:){5}:([a-f0-9]{1,4}:){0,1})([a-f0-9]{1,4}|(((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2}))\.){3}((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2})))$/, IT = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/, Yp = "((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))", LT = new RegExp(`^${Yp}$`);
function Kp(e) {
  let t = "([01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d";
  return e.precision ? t = `${t}\\.\\d{${e.precision}}` : e.precision == null && (t = `${t}(\\.\\d+)?`), t;
}
function AT(e) {
  return new RegExp(`^${Kp(e)}$`);
}
function Xp(e) {
  let t = `${Yp}T${Kp(e)}`;
  const n = [];
  return n.push(e.local ? "Z?" : "Z"), e.offset && n.push("([+-]\\d{2}:?\\d{2})"), t = `${t}(${n.join("|")})`, new RegExp(`^${t}$`);
}
function RT(e, t) {
  return !!((t === "v4" || !t) && OT.test(e) || (t === "v6" || !t) && NT.test(e));
}
class Ft extends X {
  _parse(t) {
    if (this._def.coerce && (t.data = String(t.data)), this._getType(t) !== D.string) {
      const a = this._getOrReturnCtx(t);
      return R(a, {
        code: T.invalid_type,
        expected: D.string,
        received: a.parsedType
      }), z;
    }
    const r = new Ye();
    let o;
    for (const a of this._def.checks)
      if (a.kind === "min")
        t.data.length < a.value && (o = this._getOrReturnCtx(t, o), R(o, {
          code: T.too_small,
          minimum: a.value,
          type: "string",
          inclusive: !0,
          exact: !1,
          message: a.message
        }), r.dirty());
      else if (a.kind === "max")
        t.data.length > a.value && (o = this._getOrReturnCtx(t, o), R(o, {
          code: T.too_big,
          maximum: a.value,
          type: "string",
          inclusive: !0,
          exact: !1,
          message: a.message
        }), r.dirty());
      else if (a.kind === "length") {
        const i = t.data.length > a.value, s = t.data.length < a.value;
        (i || s) && (o = this._getOrReturnCtx(t, o), i ? R(o, {
          code: T.too_big,
          maximum: a.value,
          type: "string",
          inclusive: !0,
          exact: !0,
          message: a.message
        }) : s && R(o, {
          code: T.too_small,
          minimum: a.value,
          type: "string",
          inclusive: !0,
          exact: !0,
          message: a.message
        }), r.dirty());
      } else if (a.kind === "email")
        CT.test(t.data) || (o = this._getOrReturnCtx(t, o), R(o, {
          validation: "email",
          code: T.invalid_string,
          message: a.message
        }), r.dirty());
      else if (a.kind === "emoji")
        vl || (vl = new RegExp(TT, "u")), vl.test(t.data) || (o = this._getOrReturnCtx(t, o), R(o, {
          validation: "emoji",
          code: T.invalid_string,
          message: a.message
        }), r.dirty());
      else if (a.kind === "uuid")
        ST.test(t.data) || (o = this._getOrReturnCtx(t, o), R(o, {
          validation: "uuid",
          code: T.invalid_string,
          message: a.message
        }), r.dirty());
      else if (a.kind === "nanoid")
        kT.test(t.data) || (o = this._getOrReturnCtx(t, o), R(o, {
          validation: "nanoid",
          code: T.invalid_string,
          message: a.message
        }), r.dirty());
      else if (a.kind === "cuid")
        wT.test(t.data) || (o = this._getOrReturnCtx(t, o), R(o, {
          validation: "cuid",
          code: T.invalid_string,
          message: a.message
        }), r.dirty());
      else if (a.kind === "cuid2")
        bT.test(t.data) || (o = this._getOrReturnCtx(t, o), R(o, {
          validation: "cuid2",
          code: T.invalid_string,
          message: a.message
        }), r.dirty());
      else if (a.kind === "ulid")
        _T.test(t.data) || (o = this._getOrReturnCtx(t, o), R(o, {
          validation: "ulid",
          code: T.invalid_string,
          message: a.message
        }), r.dirty());
      else if (a.kind === "url")
        try {
          new URL(t.data);
        } catch {
          o = this._getOrReturnCtx(t, o), R(o, {
            validation: "url",
            code: T.invalid_string,
            message: a.message
          }), r.dirty();
        }
      else a.kind === "regex" ? (a.regex.lastIndex = 0, a.regex.test(t.data) || (o = this._getOrReturnCtx(t, o), R(o, {
        validation: "regex",
        code: T.invalid_string,
        message: a.message
      }), r.dirty())) : a.kind === "trim" ? t.data = t.data.trim() : a.kind === "includes" ? t.data.includes(a.value, a.position) || (o = this._getOrReturnCtx(t, o), R(o, {
        code: T.invalid_string,
        validation: { includes: a.value, position: a.position },
        message: a.message
      }), r.dirty()) : a.kind === "toLowerCase" ? t.data = t.data.toLowerCase() : a.kind === "toUpperCase" ? t.data = t.data.toUpperCase() : a.kind === "startsWith" ? t.data.startsWith(a.value) || (o = this._getOrReturnCtx(t, o), R(o, {
        code: T.invalid_string,
        validation: { startsWith: a.value },
        message: a.message
      }), r.dirty()) : a.kind === "endsWith" ? t.data.endsWith(a.value) || (o = this._getOrReturnCtx(t, o), R(o, {
        code: T.invalid_string,
        validation: { endsWith: a.value },
        message: a.message
      }), r.dirty()) : a.kind === "datetime" ? Xp(a).test(t.data) || (o = this._getOrReturnCtx(t, o), R(o, {
        code: T.invalid_string,
        validation: "datetime",
        message: a.message
      }), r.dirty()) : a.kind === "date" ? LT.test(t.data) || (o = this._getOrReturnCtx(t, o), R(o, {
        code: T.invalid_string,
        validation: "date",
        message: a.message
      }), r.dirty()) : a.kind === "time" ? AT(a).test(t.data) || (o = this._getOrReturnCtx(t, o), R(o, {
        code: T.invalid_string,
        validation: "time",
        message: a.message
      }), r.dirty()) : a.kind === "duration" ? ET.test(t.data) || (o = this._getOrReturnCtx(t, o), R(o, {
        validation: "duration",
        code: T.invalid_string,
        message: a.message
      }), r.dirty()) : a.kind === "ip" ? RT(t.data, a.version) || (o = this._getOrReturnCtx(t, o), R(o, {
        validation: "ip",
        code: T.invalid_string,
        message: a.message
      }), r.dirty()) : a.kind === "base64" ? IT.test(t.data) || (o = this._getOrReturnCtx(t, o), R(o, {
        validation: "base64",
        code: T.invalid_string,
        message: a.message
      }), r.dirty()) : ee.assertNever(a);
    return { status: r.value, value: t.data };
  }
  _regex(t, n, r) {
    return this.refinement((o) => t.test(o), {
      validation: n,
      code: T.invalid_string,
      ...H.errToObj(r)
    });
  }
  _addCheck(t) {
    return new Ft({
      ...this._def,
      checks: [...this._def.checks, t]
    });
  }
  email(t) {
    return this._addCheck({ kind: "email", ...H.errToObj(t) });
  }
  url(t) {
    return this._addCheck({ kind: "url", ...H.errToObj(t) });
  }
  emoji(t) {
    return this._addCheck({ kind: "emoji", ...H.errToObj(t) });
  }
  uuid(t) {
    return this._addCheck({ kind: "uuid", ...H.errToObj(t) });
  }
  nanoid(t) {
    return this._addCheck({ kind: "nanoid", ...H.errToObj(t) });
  }
  cuid(t) {
    return this._addCheck({ kind: "cuid", ...H.errToObj(t) });
  }
  cuid2(t) {
    return this._addCheck({ kind: "cuid2", ...H.errToObj(t) });
  }
  ulid(t) {
    return this._addCheck({ kind: "ulid", ...H.errToObj(t) });
  }
  base64(t) {
    return this._addCheck({ kind: "base64", ...H.errToObj(t) });
  }
  ip(t) {
    return this._addCheck({ kind: "ip", ...H.errToObj(t) });
  }
  datetime(t) {
    var n, r;
    return typeof t == "string" ? this._addCheck({
      kind: "datetime",
      precision: null,
      offset: !1,
      local: !1,
      message: t
    }) : this._addCheck({
      kind: "datetime",
      precision: typeof (t == null ? void 0 : t.precision) > "u" ? null : t == null ? void 0 : t.precision,
      offset: (n = t == null ? void 0 : t.offset) !== null && n !== void 0 ? n : !1,
      local: (r = t == null ? void 0 : t.local) !== null && r !== void 0 ? r : !1,
      ...H.errToObj(t == null ? void 0 : t.message)
    });
  }
  date(t) {
    return this._addCheck({ kind: "date", message: t });
  }
  time(t) {
    return typeof t == "string" ? this._addCheck({
      kind: "time",
      precision: null,
      message: t
    }) : this._addCheck({
      kind: "time",
      precision: typeof (t == null ? void 0 : t.precision) > "u" ? null : t == null ? void 0 : t.precision,
      ...H.errToObj(t == null ? void 0 : t.message)
    });
  }
  duration(t) {
    return this._addCheck({ kind: "duration", ...H.errToObj(t) });
  }
  regex(t, n) {
    return this._addCheck({
      kind: "regex",
      regex: t,
      ...H.errToObj(n)
    });
  }
  includes(t, n) {
    return this._addCheck({
      kind: "includes",
      value: t,
      position: n == null ? void 0 : n.position,
      ...H.errToObj(n == null ? void 0 : n.message)
    });
  }
  startsWith(t, n) {
    return this._addCheck({
      kind: "startsWith",
      value: t,
      ...H.errToObj(n)
    });
  }
  endsWith(t, n) {
    return this._addCheck({
      kind: "endsWith",
      value: t,
      ...H.errToObj(n)
    });
  }
  min(t, n) {
    return this._addCheck({
      kind: "min",
      value: t,
      ...H.errToObj(n)
    });
  }
  max(t, n) {
    return this._addCheck({
      kind: "max",
      value: t,
      ...H.errToObj(n)
    });
  }
  length(t, n) {
    return this._addCheck({
      kind: "length",
      value: t,
      ...H.errToObj(n)
    });
  }
  /**
   * @deprecated Use z.string().min(1) instead.
   * @see {@link ZodString.min}
   */
  nonempty(t) {
    return this.min(1, H.errToObj(t));
  }
  trim() {
    return new Ft({
      ...this._def,
      checks: [...this._def.checks, { kind: "trim" }]
    });
  }
  toLowerCase() {
    return new Ft({
      ...this._def,
      checks: [...this._def.checks, { kind: "toLowerCase" }]
    });
  }
  toUpperCase() {
    return new Ft({
      ...this._def,
      checks: [...this._def.checks, { kind: "toUpperCase" }]
    });
  }
  get isDatetime() {
    return !!this._def.checks.find((t) => t.kind === "datetime");
  }
  get isDate() {
    return !!this._def.checks.find((t) => t.kind === "date");
  }
  get isTime() {
    return !!this._def.checks.find((t) => t.kind === "time");
  }
  get isDuration() {
    return !!this._def.checks.find((t) => t.kind === "duration");
  }
  get isEmail() {
    return !!this._def.checks.find((t) => t.kind === "email");
  }
  get isURL() {
    return !!this._def.checks.find((t) => t.kind === "url");
  }
  get isEmoji() {
    return !!this._def.checks.find((t) => t.kind === "emoji");
  }
  get isUUID() {
    return !!this._def.checks.find((t) => t.kind === "uuid");
  }
  get isNANOID() {
    return !!this._def.checks.find((t) => t.kind === "nanoid");
  }
  get isCUID() {
    return !!this._def.checks.find((t) => t.kind === "cuid");
  }
  get isCUID2() {
    return !!this._def.checks.find((t) => t.kind === "cuid2");
  }
  get isULID() {
    return !!this._def.checks.find((t) => t.kind === "ulid");
  }
  get isIP() {
    return !!this._def.checks.find((t) => t.kind === "ip");
  }
  get isBase64() {
    return !!this._def.checks.find((t) => t.kind === "base64");
  }
  get minLength() {
    let t = null;
    for (const n of this._def.checks)
      n.kind === "min" && (t === null || n.value > t) && (t = n.value);
    return t;
  }
  get maxLength() {
    let t = null;
    for (const n of this._def.checks)
      n.kind === "max" && (t === null || n.value < t) && (t = n.value);
    return t;
  }
}
Ft.create = (e) => {
  var t;
  return new Ft({
    checks: [],
    typeName: V.ZodString,
    coerce: (t = e == null ? void 0 : e.coerce) !== null && t !== void 0 ? t : !1,
    ...G(e)
  });
};
function PT(e, t) {
  const n = (e.toString().split(".")[1] || "").length, r = (t.toString().split(".")[1] || "").length, o = n > r ? n : r, a = parseInt(e.toFixed(o).replace(".", "")), i = parseInt(t.toFixed(o).replace(".", ""));
  return a % i / Math.pow(10, o);
}
class qn extends X {
  constructor() {
    super(...arguments), this.min = this.gte, this.max = this.lte, this.step = this.multipleOf;
  }
  _parse(t) {
    if (this._def.coerce && (t.data = Number(t.data)), this._getType(t) !== D.number) {
      const a = this._getOrReturnCtx(t);
      return R(a, {
        code: T.invalid_type,
        expected: D.number,
        received: a.parsedType
      }), z;
    }
    let r;
    const o = new Ye();
    for (const a of this._def.checks)
      a.kind === "int" ? ee.isInteger(t.data) || (r = this._getOrReturnCtx(t, r), R(r, {
        code: T.invalid_type,
        expected: "integer",
        received: "float",
        message: a.message
      }), o.dirty()) : a.kind === "min" ? (a.inclusive ? t.data < a.value : t.data <= a.value) && (r = this._getOrReturnCtx(t, r), R(r, {
        code: T.too_small,
        minimum: a.value,
        type: "number",
        inclusive: a.inclusive,
        exact: !1,
        message: a.message
      }), o.dirty()) : a.kind === "max" ? (a.inclusive ? t.data > a.value : t.data >= a.value) && (r = this._getOrReturnCtx(t, r), R(r, {
        code: T.too_big,
        maximum: a.value,
        type: "number",
        inclusive: a.inclusive,
        exact: !1,
        message: a.message
      }), o.dirty()) : a.kind === "multipleOf" ? PT(t.data, a.value) !== 0 && (r = this._getOrReturnCtx(t, r), R(r, {
        code: T.not_multiple_of,
        multipleOf: a.value,
        message: a.message
      }), o.dirty()) : a.kind === "finite" ? Number.isFinite(t.data) || (r = this._getOrReturnCtx(t, r), R(r, {
        code: T.not_finite,
        message: a.message
      }), o.dirty()) : ee.assertNever(a);
    return { status: o.value, value: t.data };
  }
  gte(t, n) {
    return this.setLimit("min", t, !0, H.toString(n));
  }
  gt(t, n) {
    return this.setLimit("min", t, !1, H.toString(n));
  }
  lte(t, n) {
    return this.setLimit("max", t, !0, H.toString(n));
  }
  lt(t, n) {
    return this.setLimit("max", t, !1, H.toString(n));
  }
  setLimit(t, n, r, o) {
    return new qn({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind: t,
          value: n,
          inclusive: r,
          message: H.toString(o)
        }
      ]
    });
  }
  _addCheck(t) {
    return new qn({
      ...this._def,
      checks: [...this._def.checks, t]
    });
  }
  int(t) {
    return this._addCheck({
      kind: "int",
      message: H.toString(t)
    });
  }
  positive(t) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: !1,
      message: H.toString(t)
    });
  }
  negative(t) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: !1,
      message: H.toString(t)
    });
  }
  nonpositive(t) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: !0,
      message: H.toString(t)
    });
  }
  nonnegative(t) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: !0,
      message: H.toString(t)
    });
  }
  multipleOf(t, n) {
    return this._addCheck({
      kind: "multipleOf",
      value: t,
      message: H.toString(n)
    });
  }
  finite(t) {
    return this._addCheck({
      kind: "finite",
      message: H.toString(t)
    });
  }
  safe(t) {
    return this._addCheck({
      kind: "min",
      inclusive: !0,
      value: Number.MIN_SAFE_INTEGER,
      message: H.toString(t)
    })._addCheck({
      kind: "max",
      inclusive: !0,
      value: Number.MAX_SAFE_INTEGER,
      message: H.toString(t)
    });
  }
  get minValue() {
    let t = null;
    for (const n of this._def.checks)
      n.kind === "min" && (t === null || n.value > t) && (t = n.value);
    return t;
  }
  get maxValue() {
    let t = null;
    for (const n of this._def.checks)
      n.kind === "max" && (t === null || n.value < t) && (t = n.value);
    return t;
  }
  get isInt() {
    return !!this._def.checks.find((t) => t.kind === "int" || t.kind === "multipleOf" && ee.isInteger(t.value));
  }
  get isFinite() {
    let t = null, n = null;
    for (const r of this._def.checks) {
      if (r.kind === "finite" || r.kind === "int" || r.kind === "multipleOf")
        return !0;
      r.kind === "min" ? (n === null || r.value > n) && (n = r.value) : r.kind === "max" && (t === null || r.value < t) && (t = r.value);
    }
    return Number.isFinite(n) && Number.isFinite(t);
  }
}
qn.create = (e) => new qn({
  checks: [],
  typeName: V.ZodNumber,
  coerce: (e == null ? void 0 : e.coerce) || !1,
  ...G(e)
});
class er extends X {
  constructor() {
    super(...arguments), this.min = this.gte, this.max = this.lte;
  }
  _parse(t) {
    if (this._def.coerce && (t.data = BigInt(t.data)), this._getType(t) !== D.bigint) {
      const a = this._getOrReturnCtx(t);
      return R(a, {
        code: T.invalid_type,
        expected: D.bigint,
        received: a.parsedType
      }), z;
    }
    let r;
    const o = new Ye();
    for (const a of this._def.checks)
      a.kind === "min" ? (a.inclusive ? t.data < a.value : t.data <= a.value) && (r = this._getOrReturnCtx(t, r), R(r, {
        code: T.too_small,
        type: "bigint",
        minimum: a.value,
        inclusive: a.inclusive,
        message: a.message
      }), o.dirty()) : a.kind === "max" ? (a.inclusive ? t.data > a.value : t.data >= a.value) && (r = this._getOrReturnCtx(t, r), R(r, {
        code: T.too_big,
        type: "bigint",
        maximum: a.value,
        inclusive: a.inclusive,
        message: a.message
      }), o.dirty()) : a.kind === "multipleOf" ? t.data % a.value !== BigInt(0) && (r = this._getOrReturnCtx(t, r), R(r, {
        code: T.not_multiple_of,
        multipleOf: a.value,
        message: a.message
      }), o.dirty()) : ee.assertNever(a);
    return { status: o.value, value: t.data };
  }
  gte(t, n) {
    return this.setLimit("min", t, !0, H.toString(n));
  }
  gt(t, n) {
    return this.setLimit("min", t, !1, H.toString(n));
  }
  lte(t, n) {
    return this.setLimit("max", t, !0, H.toString(n));
  }
  lt(t, n) {
    return this.setLimit("max", t, !1, H.toString(n));
  }
  setLimit(t, n, r, o) {
    return new er({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind: t,
          value: n,
          inclusive: r,
          message: H.toString(o)
        }
      ]
    });
  }
  _addCheck(t) {
    return new er({
      ...this._def,
      checks: [...this._def.checks, t]
    });
  }
  positive(t) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: !1,
      message: H.toString(t)
    });
  }
  negative(t) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: !1,
      message: H.toString(t)
    });
  }
  nonpositive(t) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: !0,
      message: H.toString(t)
    });
  }
  nonnegative(t) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: !0,
      message: H.toString(t)
    });
  }
  multipleOf(t, n) {
    return this._addCheck({
      kind: "multipleOf",
      value: t,
      message: H.toString(n)
    });
  }
  get minValue() {
    let t = null;
    for (const n of this._def.checks)
      n.kind === "min" && (t === null || n.value > t) && (t = n.value);
    return t;
  }
  get maxValue() {
    let t = null;
    for (const n of this._def.checks)
      n.kind === "max" && (t === null || n.value < t) && (t = n.value);
    return t;
  }
}
er.create = (e) => {
  var t;
  return new er({
    checks: [],
    typeName: V.ZodBigInt,
    coerce: (t = e == null ? void 0 : e.coerce) !== null && t !== void 0 ? t : !1,
    ...G(e)
  });
};
class aa extends X {
  _parse(t) {
    if (this._def.coerce && (t.data = !!t.data), this._getType(t) !== D.boolean) {
      const r = this._getOrReturnCtx(t);
      return R(r, {
        code: T.invalid_type,
        expected: D.boolean,
        received: r.parsedType
      }), z;
    }
    return et(t.data);
  }
}
aa.create = (e) => new aa({
  typeName: V.ZodBoolean,
  coerce: (e == null ? void 0 : e.coerce) || !1,
  ...G(e)
});
class vr extends X {
  _parse(t) {
    if (this._def.coerce && (t.data = new Date(t.data)), this._getType(t) !== D.date) {
      const a = this._getOrReturnCtx(t);
      return R(a, {
        code: T.invalid_type,
        expected: D.date,
        received: a.parsedType
      }), z;
    }
    if (isNaN(t.data.getTime())) {
      const a = this._getOrReturnCtx(t);
      return R(a, {
        code: T.invalid_date
      }), z;
    }
    const r = new Ye();
    let o;
    for (const a of this._def.checks)
      a.kind === "min" ? t.data.getTime() < a.value && (o = this._getOrReturnCtx(t, o), R(o, {
        code: T.too_small,
        message: a.message,
        inclusive: !0,
        exact: !1,
        minimum: a.value,
        type: "date"
      }), r.dirty()) : a.kind === "max" ? t.data.getTime() > a.value && (o = this._getOrReturnCtx(t, o), R(o, {
        code: T.too_big,
        message: a.message,
        inclusive: !0,
        exact: !1,
        maximum: a.value,
        type: "date"
      }), r.dirty()) : ee.assertNever(a);
    return {
      status: r.value,
      value: new Date(t.data.getTime())
    };
  }
  _addCheck(t) {
    return new vr({
      ...this._def,
      checks: [...this._def.checks, t]
    });
  }
  min(t, n) {
    return this._addCheck({
      kind: "min",
      value: t.getTime(),
      message: H.toString(n)
    });
  }
  max(t, n) {
    return this._addCheck({
      kind: "max",
      value: t.getTime(),
      message: H.toString(n)
    });
  }
  get minDate() {
    let t = null;
    for (const n of this._def.checks)
      n.kind === "min" && (t === null || n.value > t) && (t = n.value);
    return t != null ? new Date(t) : null;
  }
  get maxDate() {
    let t = null;
    for (const n of this._def.checks)
      n.kind === "max" && (t === null || n.value < t) && (t = n.value);
    return t != null ? new Date(t) : null;
  }
}
vr.create = (e) => new vr({
  checks: [],
  coerce: (e == null ? void 0 : e.coerce) || !1,
  typeName: V.ZodDate,
  ...G(e)
});
class Wi extends X {
  _parse(t) {
    if (this._getType(t) !== D.symbol) {
      const r = this._getOrReturnCtx(t);
      return R(r, {
        code: T.invalid_type,
        expected: D.symbol,
        received: r.parsedType
      }), z;
    }
    return et(t.data);
  }
}
Wi.create = (e) => new Wi({
  typeName: V.ZodSymbol,
  ...G(e)
});
class ia extends X {
  _parse(t) {
    if (this._getType(t) !== D.undefined) {
      const r = this._getOrReturnCtx(t);
      return R(r, {
        code: T.invalid_type,
        expected: D.undefined,
        received: r.parsedType
      }), z;
    }
    return et(t.data);
  }
}
ia.create = (e) => new ia({
  typeName: V.ZodUndefined,
  ...G(e)
});
class sa extends X {
  _parse(t) {
    if (this._getType(t) !== D.null) {
      const r = this._getOrReturnCtx(t);
      return R(r, {
        code: T.invalid_type,
        expected: D.null,
        received: r.parsedType
      }), z;
    }
    return et(t.data);
  }
}
sa.create = (e) => new sa({
  typeName: V.ZodNull,
  ...G(e)
});
class co extends X {
  constructor() {
    super(...arguments), this._any = !0;
  }
  _parse(t) {
    return et(t.data);
  }
}
co.create = (e) => new co({
  typeName: V.ZodAny,
  ...G(e)
});
class mr extends X {
  constructor() {
    super(...arguments), this._unknown = !0;
  }
  _parse(t) {
    return et(t.data);
  }
}
mr.create = (e) => new mr({
  typeName: V.ZodUnknown,
  ...G(e)
});
class kn extends X {
  _parse(t) {
    const n = this._getOrReturnCtx(t);
    return R(n, {
      code: T.invalid_type,
      expected: D.never,
      received: n.parsedType
    }), z;
  }
}
kn.create = (e) => new kn({
  typeName: V.ZodNever,
  ...G(e)
});
class Gi extends X {
  _parse(t) {
    if (this._getType(t) !== D.undefined) {
      const r = this._getOrReturnCtx(t);
      return R(r, {
        code: T.invalid_type,
        expected: D.void,
        received: r.parsedType
      }), z;
    }
    return et(t.data);
  }
}
Gi.create = (e) => new Gi({
  typeName: V.ZodVoid,
  ...G(e)
});
class Ut extends X {
  _parse(t) {
    const { ctx: n, status: r } = this._processInputParams(t), o = this._def;
    if (n.parsedType !== D.array)
      return R(n, {
        code: T.invalid_type,
        expected: D.array,
        received: n.parsedType
      }), z;
    if (o.exactLength !== null) {
      const i = n.data.length > o.exactLength.value, s = n.data.length < o.exactLength.value;
      (i || s) && (R(n, {
        code: i ? T.too_big : T.too_small,
        minimum: s ? o.exactLength.value : void 0,
        maximum: i ? o.exactLength.value : void 0,
        type: "array",
        inclusive: !0,
        exact: !0,
        message: o.exactLength.message
      }), r.dirty());
    }
    if (o.minLength !== null && n.data.length < o.minLength.value && (R(n, {
      code: T.too_small,
      minimum: o.minLength.value,
      type: "array",
      inclusive: !0,
      exact: !1,
      message: o.minLength.message
    }), r.dirty()), o.maxLength !== null && n.data.length > o.maxLength.value && (R(n, {
      code: T.too_big,
      maximum: o.maxLength.value,
      type: "array",
      inclusive: !0,
      exact: !1,
      message: o.maxLength.message
    }), r.dirty()), n.common.async)
      return Promise.all([...n.data].map((i, s) => o.type._parseAsync(new cn(n, i, n.path, s)))).then((i) => Ye.mergeArray(r, i));
    const a = [...n.data].map((i, s) => o.type._parseSync(new cn(n, i, n.path, s)));
    return Ye.mergeArray(r, a);
  }
  get element() {
    return this._def.type;
  }
  min(t, n) {
    return new Ut({
      ...this._def,
      minLength: { value: t, message: H.toString(n) }
    });
  }
  max(t, n) {
    return new Ut({
      ...this._def,
      maxLength: { value: t, message: H.toString(n) }
    });
  }
  length(t, n) {
    return new Ut({
      ...this._def,
      exactLength: { value: t, message: H.toString(n) }
    });
  }
  nonempty(t) {
    return this.min(1, t);
  }
}
Ut.create = (e, t) => new Ut({
  type: e,
  minLength: null,
  maxLength: null,
  exactLength: null,
  typeName: V.ZodArray,
  ...G(t)
});
function Mr(e) {
  if (e instanceof ye) {
    const t = {};
    for (const n in e.shape) {
      const r = e.shape[n];
      t[n] = on.create(Mr(r));
    }
    return new ye({
      ...e._def,
      shape: () => t
    });
  } else return e instanceof Ut ? new Ut({
    ...e._def,
    type: Mr(e.element)
  }) : e instanceof on ? on.create(Mr(e.unwrap())) : e instanceof nr ? nr.create(Mr(e.unwrap())) : e instanceof dn ? dn.create(e.items.map((t) => Mr(t))) : e;
}
class ye extends X {
  constructor() {
    super(...arguments), this._cached = null, this.nonstrict = this.passthrough, this.augment = this.extend;
  }
  _getCached() {
    if (this._cached !== null)
      return this._cached;
    const t = this._def.shape(), n = ee.objectKeys(t);
    return this._cached = { shape: t, keys: n };
  }
  _parse(t) {
    if (this._getType(t) !== D.object) {
      const c = this._getOrReturnCtx(t);
      return R(c, {
        code: T.invalid_type,
        expected: D.object,
        received: c.parsedType
      }), z;
    }
    const { status: r, ctx: o } = this._processInputParams(t), { shape: a, keys: i } = this._getCached(), s = [];
    if (!(this._def.catchall instanceof kn && this._def.unknownKeys === "strip"))
      for (const c in o.data)
        i.includes(c) || s.push(c);
    const l = [];
    for (const c of i) {
      const d = a[c], f = o.data[c];
      l.push({
        key: { status: "valid", value: c },
        value: d._parse(new cn(o, f, o.path, c)),
        alwaysSet: c in o.data
      });
    }
    if (this._def.catchall instanceof kn) {
      const c = this._def.unknownKeys;
      if (c === "passthrough")
        for (const d of s)
          l.push({
            key: { status: "valid", value: d },
            value: { status: "valid", value: o.data[d] }
          });
      else if (c === "strict")
        s.length > 0 && (R(o, {
          code: T.unrecognized_keys,
          keys: s
        }), r.dirty());
      else if (c !== "strip") throw new Error("Internal ZodObject error: invalid unknownKeys value.");
    } else {
      const c = this._def.catchall;
      for (const d of s) {
        const f = o.data[d];
        l.push({
          key: { status: "valid", value: d },
          value: c._parse(
            new cn(o, f, o.path, d)
            //, ctx.child(key), value, getParsedType(value)
          ),
          alwaysSet: d in o.data
        });
      }
    }
    return o.common.async ? Promise.resolve().then(async () => {
      const c = [];
      for (const d of l) {
        const f = await d.key, p = await d.value;
        c.push({
          key: f,
          value: p,
          alwaysSet: d.alwaysSet
        });
      }
      return c;
    }).then((c) => Ye.mergeObjectSync(r, c)) : Ye.mergeObjectSync(r, l);
  }
  get shape() {
    return this._def.shape();
  }
  strict(t) {
    return new ye({
      ...this._def,
      unknownKeys: "strict",
      ...t !== void 0 ? {
        errorMap: (n, r) => {
          var o, a, i, s;
          const l = (i = (a = (o = this._def).errorMap) === null || a === void 0 ? void 0 : a.call(o, n, r).message) !== null && i !== void 0 ? i : r.defaultError;
          return n.code === "unrecognized_keys" ? {
            message: (s = H.errToObj(t).message) !== null && s !== void 0 ? s : l
          } : {
            message: l
          };
        }
      } : {}
    });
  }
  strip() {
    return new ye({
      ...this._def,
      unknownKeys: "strip"
    });
  }
  passthrough() {
    return new ye({
      ...this._def,
      unknownKeys: "passthrough"
    });
  }
  // const AugmentFactory =
  //   <Def extends ZodObjectDef>(def: Def) =>
  //   <Augmentation extends ZodRawShape>(
  //     augmentation: Augmentation
  //   ): ZodObject<
  //     extendShape<ReturnType<Def["shape"]>, Augmentation>,
  //     Def["unknownKeys"],
  //     Def["catchall"]
  //   > => {
  //     return new ZodObject({
  //       ...def,
  //       shape: () => ({
  //         ...def.shape(),
  //         ...augmentation,
  //       }),
  //     }) as any;
  //   };
  extend(t) {
    return new ye({
      ...this._def,
      shape: () => ({
        ...this._def.shape(),
        ...t
      })
    });
  }
  /**
   * Prior to zod@1.0.12 there was a bug in the
   * inferred type of merged objects. Please
   * upgrade if you are experiencing issues.
   */
  merge(t) {
    return new ye({
      unknownKeys: t._def.unknownKeys,
      catchall: t._def.catchall,
      shape: () => ({
        ...this._def.shape(),
        ...t._def.shape()
      }),
      typeName: V.ZodObject
    });
  }
  // merge<
  //   Incoming extends AnyZodObject,
  //   Augmentation extends Incoming["shape"],
  //   NewOutput extends {
  //     [k in keyof Augmentation | keyof Output]: k extends keyof Augmentation
  //       ? Augmentation[k]["_output"]
  //       : k extends keyof Output
  //       ? Output[k]
  //       : never;
  //   },
  //   NewInput extends {
  //     [k in keyof Augmentation | keyof Input]: k extends keyof Augmentation
  //       ? Augmentation[k]["_input"]
  //       : k extends keyof Input
  //       ? Input[k]
  //       : never;
  //   }
  // >(
  //   merging: Incoming
  // ): ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"],
  //   NewOutput,
  //   NewInput
  // > {
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  setKey(t, n) {
    return this.augment({ [t]: n });
  }
  // merge<Incoming extends AnyZodObject>(
  //   merging: Incoming
  // ): //ZodObject<T & Incoming["_shape"], UnknownKeys, Catchall> = (merging) => {
  // ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"]
  // > {
  //   // const mergedShape = objectUtil.mergeShapes(
  //   //   this._def.shape(),
  //   //   merging._def.shape()
  //   // );
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  catchall(t) {
    return new ye({
      ...this._def,
      catchall: t
    });
  }
  pick(t) {
    const n = {};
    return ee.objectKeys(t).forEach((r) => {
      t[r] && this.shape[r] && (n[r] = this.shape[r]);
    }), new ye({
      ...this._def,
      shape: () => n
    });
  }
  omit(t) {
    const n = {};
    return ee.objectKeys(this.shape).forEach((r) => {
      t[r] || (n[r] = this.shape[r]);
    }), new ye({
      ...this._def,
      shape: () => n
    });
  }
  /**
   * @deprecated
   */
  deepPartial() {
    return Mr(this);
  }
  partial(t) {
    const n = {};
    return ee.objectKeys(this.shape).forEach((r) => {
      const o = this.shape[r];
      t && !t[r] ? n[r] = o : n[r] = o.optional();
    }), new ye({
      ...this._def,
      shape: () => n
    });
  }
  required(t) {
    const n = {};
    return ee.objectKeys(this.shape).forEach((r) => {
      if (t && !t[r])
        n[r] = this.shape[r];
      else {
        let a = this.shape[r];
        for (; a instanceof on; )
          a = a._def.innerType;
        n[r] = a;
      }
    }), new ye({
      ...this._def,
      shape: () => n
    });
  }
  keyof() {
    return Jp(ee.objectKeys(this.shape));
  }
}
ye.create = (e, t) => new ye({
  shape: () => e,
  unknownKeys: "strip",
  catchall: kn.create(),
  typeName: V.ZodObject,
  ...G(t)
});
ye.strictCreate = (e, t) => new ye({
  shape: () => e,
  unknownKeys: "strict",
  catchall: kn.create(),
  typeName: V.ZodObject,
  ...G(t)
});
ye.lazycreate = (e, t) => new ye({
  shape: e,
  unknownKeys: "strip",
  catchall: kn.create(),
  typeName: V.ZodObject,
  ...G(t)
});
class la extends X {
  _parse(t) {
    const { ctx: n } = this._processInputParams(t), r = this._def.options;
    function o(a) {
      for (const s of a)
        if (s.result.status === "valid")
          return s.result;
      for (const s of a)
        if (s.result.status === "dirty")
          return n.common.issues.push(...s.ctx.common.issues), s.result;
      const i = a.map((s) => new mt(s.ctx.common.issues));
      return R(n, {
        code: T.invalid_union,
        unionErrors: i
      }), z;
    }
    if (n.common.async)
      return Promise.all(r.map(async (a) => {
        const i = {
          ...n,
          common: {
            ...n.common,
            issues: []
          },
          parent: null
        };
        return {
          result: await a._parseAsync({
            data: n.data,
            path: n.path,
            parent: i
          }),
          ctx: i
        };
      })).then(o);
    {
      let a;
      const i = [];
      for (const l of r) {
        const c = {
          ...n,
          common: {
            ...n.common,
            issues: []
          },
          parent: null
        }, d = l._parseSync({
          data: n.data,
          path: n.path,
          parent: c
        });
        if (d.status === "valid")
          return d;
        d.status === "dirty" && !a && (a = { result: d, ctx: c }), c.common.issues.length && i.push(c.common.issues);
      }
      if (a)
        return n.common.issues.push(...a.ctx.common.issues), a.result;
      const s = i.map((l) => new mt(l));
      return R(n, {
        code: T.invalid_union,
        unionErrors: s
      }), z;
    }
  }
  get options() {
    return this._def.options;
  }
}
la.create = (e, t) => new la({
  options: e,
  typeName: V.ZodUnion,
  ...G(t)
});
const mn = (e) => e instanceof da ? mn(e.schema) : e instanceof Bt ? mn(e.innerType()) : e instanceof fa ? [e.value] : e instanceof tr ? e.options : e instanceof pa ? ee.objectValues(e.enum) : e instanceof ha ? mn(e._def.innerType) : e instanceof ia ? [void 0] : e instanceof sa ? [null] : e instanceof on ? [void 0, ...mn(e.unwrap())] : e instanceof nr ? [null, ...mn(e.unwrap())] : e instanceof Tc || e instanceof xa ? mn(e.unwrap()) : e instanceof ma ? mn(e._def.innerType) : [];
class As extends X {
  _parse(t) {
    const { ctx: n } = this._processInputParams(t);
    if (n.parsedType !== D.object)
      return R(n, {
        code: T.invalid_type,
        expected: D.object,
        received: n.parsedType
      }), z;
    const r = this.discriminator, o = n.data[r], a = this.optionsMap.get(o);
    return a ? n.common.async ? a._parseAsync({
      data: n.data,
      path: n.path,
      parent: n
    }) : a._parseSync({
      data: n.data,
      path: n.path,
      parent: n
    }) : (R(n, {
      code: T.invalid_union_discriminator,
      options: Array.from(this.optionsMap.keys()),
      path: [r]
    }), z);
  }
  get discriminator() {
    return this._def.discriminator;
  }
  get options() {
    return this._def.options;
  }
  get optionsMap() {
    return this._def.optionsMap;
  }
  /**
   * The constructor of the discriminated union schema. Its behaviour is very similar to that of the normal z.union() constructor.
   * However, it only allows a union of objects, all of which need to share a discriminator property. This property must
   * have a different value for each object in the union.
   * @param discriminator the name of the discriminator property
   * @param types an array of object schemas
   * @param params
   */
  static create(t, n, r) {
    const o = /* @__PURE__ */ new Map();
    for (const a of n) {
      const i = mn(a.shape[t]);
      if (!i.length)
        throw new Error(`A discriminator value for key \`${t}\` could not be extracted from all schema options`);
      for (const s of i) {
        if (o.has(s))
          throw new Error(`Discriminator property ${String(t)} has duplicate value ${String(s)}`);
        o.set(s, a);
      }
    }
    return new As({
      typeName: V.ZodDiscriminatedUnion,
      discriminator: t,
      options: n,
      optionsMap: o,
      ...G(r)
    });
  }
}
function cu(e, t) {
  const n = Mn(e), r = Mn(t);
  if (e === t)
    return { valid: !0, data: e };
  if (n === D.object && r === D.object) {
    const o = ee.objectKeys(t), a = ee.objectKeys(e).filter((s) => o.indexOf(s) !== -1), i = { ...e, ...t };
    for (const s of a) {
      const l = cu(e[s], t[s]);
      if (!l.valid)
        return { valid: !1 };
      i[s] = l.data;
    }
    return { valid: !0, data: i };
  } else if (n === D.array && r === D.array) {
    if (e.length !== t.length)
      return { valid: !1 };
    const o = [];
    for (let a = 0; a < e.length; a++) {
      const i = e[a], s = t[a], l = cu(i, s);
      if (!l.valid)
        return { valid: !1 };
      o.push(l.data);
    }
    return { valid: !0, data: o };
  } else return n === D.date && r === D.date && +e == +t ? { valid: !0, data: e } : { valid: !1 };
}
class ua extends X {
  _parse(t) {
    const { status: n, ctx: r } = this._processInputParams(t), o = (a, i) => {
      if (lu(a) || lu(i))
        return z;
      const s = cu(a.value, i.value);
      return s.valid ? ((uu(a) || uu(i)) && n.dirty(), { status: n.value, value: s.data }) : (R(r, {
        code: T.invalid_intersection_types
      }), z);
    };
    return r.common.async ? Promise.all([
      this._def.left._parseAsync({
        data: r.data,
        path: r.path,
        parent: r
      }),
      this._def.right._parseAsync({
        data: r.data,
        path: r.path,
        parent: r
      })
    ]).then(([a, i]) => o(a, i)) : o(this._def.left._parseSync({
      data: r.data,
      path: r.path,
      parent: r
    }), this._def.right._parseSync({
      data: r.data,
      path: r.path,
      parent: r
    }));
  }
}
ua.create = (e, t, n) => new ua({
  left: e,
  right: t,
  typeName: V.ZodIntersection,
  ...G(n)
});
class dn extends X {
  _parse(t) {
    const { status: n, ctx: r } = this._processInputParams(t);
    if (r.parsedType !== D.array)
      return R(r, {
        code: T.invalid_type,
        expected: D.array,
        received: r.parsedType
      }), z;
    if (r.data.length < this._def.items.length)
      return R(r, {
        code: T.too_small,
        minimum: this._def.items.length,
        inclusive: !0,
        exact: !1,
        type: "array"
      }), z;
    !this._def.rest && r.data.length > this._def.items.length && (R(r, {
      code: T.too_big,
      maximum: this._def.items.length,
      inclusive: !0,
      exact: !1,
      type: "array"
    }), n.dirty());
    const a = [...r.data].map((i, s) => {
      const l = this._def.items[s] || this._def.rest;
      return l ? l._parse(new cn(r, i, r.path, s)) : null;
    }).filter((i) => !!i);
    return r.common.async ? Promise.all(a).then((i) => Ye.mergeArray(n, i)) : Ye.mergeArray(n, a);
  }
  get items() {
    return this._def.items;
  }
  rest(t) {
    return new dn({
      ...this._def,
      rest: t
    });
  }
}
dn.create = (e, t) => {
  if (!Array.isArray(e))
    throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
  return new dn({
    items: e,
    typeName: V.ZodTuple,
    rest: null,
    ...G(t)
  });
};
class ca extends X {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(t) {
    const { status: n, ctx: r } = this._processInputParams(t);
    if (r.parsedType !== D.object)
      return R(r, {
        code: T.invalid_type,
        expected: D.object,
        received: r.parsedType
      }), z;
    const o = [], a = this._def.keyType, i = this._def.valueType;
    for (const s in r.data)
      o.push({
        key: a._parse(new cn(r, s, r.path, s)),
        value: i._parse(new cn(r, r.data[s], r.path, s)),
        alwaysSet: s in r.data
      });
    return r.common.async ? Ye.mergeObjectAsync(n, o) : Ye.mergeObjectSync(n, o);
  }
  get element() {
    return this._def.valueType;
  }
  static create(t, n, r) {
    return n instanceof X ? new ca({
      keyType: t,
      valueType: n,
      typeName: V.ZodRecord,
      ...G(r)
    }) : new ca({
      keyType: Ft.create(),
      valueType: t,
      typeName: V.ZodRecord,
      ...G(n)
    });
  }
}
class Zi extends X {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(t) {
    const { status: n, ctx: r } = this._processInputParams(t);
    if (r.parsedType !== D.map)
      return R(r, {
        code: T.invalid_type,
        expected: D.map,
        received: r.parsedType
      }), z;
    const o = this._def.keyType, a = this._def.valueType, i = [...r.data.entries()].map(([s, l], c) => ({
      key: o._parse(new cn(r, s, r.path, [c, "key"])),
      value: a._parse(new cn(r, l, r.path, [c, "value"]))
    }));
    if (r.common.async) {
      const s = /* @__PURE__ */ new Map();
      return Promise.resolve().then(async () => {
        for (const l of i) {
          const c = await l.key, d = await l.value;
          if (c.status === "aborted" || d.status === "aborted")
            return z;
          (c.status === "dirty" || d.status === "dirty") && n.dirty(), s.set(c.value, d.value);
        }
        return { status: n.value, value: s };
      });
    } else {
      const s = /* @__PURE__ */ new Map();
      for (const l of i) {
        const c = l.key, d = l.value;
        if (c.status === "aborted" || d.status === "aborted")
          return z;
        (c.status === "dirty" || d.status === "dirty") && n.dirty(), s.set(c.value, d.value);
      }
      return { status: n.value, value: s };
    }
  }
}
Zi.create = (e, t, n) => new Zi({
  valueType: t,
  keyType: e,
  typeName: V.ZodMap,
  ...G(n)
});
class yr extends X {
  _parse(t) {
    const { status: n, ctx: r } = this._processInputParams(t);
    if (r.parsedType !== D.set)
      return R(r, {
        code: T.invalid_type,
        expected: D.set,
        received: r.parsedType
      }), z;
    const o = this._def;
    o.minSize !== null && r.data.size < o.minSize.value && (R(r, {
      code: T.too_small,
      minimum: o.minSize.value,
      type: "set",
      inclusive: !0,
      exact: !1,
      message: o.minSize.message
    }), n.dirty()), o.maxSize !== null && r.data.size > o.maxSize.value && (R(r, {
      code: T.too_big,
      maximum: o.maxSize.value,
      type: "set",
      inclusive: !0,
      exact: !1,
      message: o.maxSize.message
    }), n.dirty());
    const a = this._def.valueType;
    function i(l) {
      const c = /* @__PURE__ */ new Set();
      for (const d of l) {
        if (d.status === "aborted")
          return z;
        d.status === "dirty" && n.dirty(), c.add(d.value);
      }
      return { status: n.value, value: c };
    }
    const s = [...r.data.values()].map((l, c) => a._parse(new cn(r, l, r.path, c)));
    return r.common.async ? Promise.all(s).then((l) => i(l)) : i(s);
  }
  min(t, n) {
    return new yr({
      ...this._def,
      minSize: { value: t, message: H.toString(n) }
    });
  }
  max(t, n) {
    return new yr({
      ...this._def,
      maxSize: { value: t, message: H.toString(n) }
    });
  }
  size(t, n) {
    return this.min(t, n).max(t, n);
  }
  nonempty(t) {
    return this.min(1, t);
  }
}
yr.create = (e, t) => new yr({
  valueType: e,
  minSize: null,
  maxSize: null,
  typeName: V.ZodSet,
  ...G(t)
});
class eo extends X {
  constructor() {
    super(...arguments), this.validate = this.implement;
  }
  _parse(t) {
    const { ctx: n } = this._processInputParams(t);
    if (n.parsedType !== D.function)
      return R(n, {
        code: T.invalid_type,
        expected: D.function,
        received: n.parsedType
      }), z;
    function r(s, l) {
      return zi({
        data: s,
        path: n.path,
        errorMaps: [
          n.common.contextualErrorMap,
          n.schemaErrorMap,
          Vi(),
          uo
        ].filter((c) => !!c),
        issueData: {
          code: T.invalid_arguments,
          argumentsError: l
        }
      });
    }
    function o(s, l) {
      return zi({
        data: s,
        path: n.path,
        errorMaps: [
          n.common.contextualErrorMap,
          n.schemaErrorMap,
          Vi(),
          uo
        ].filter((c) => !!c),
        issueData: {
          code: T.invalid_return_type,
          returnTypeError: l
        }
      });
    }
    const a = { errorMap: n.common.contextualErrorMap }, i = n.data;
    if (this._def.returns instanceof fo) {
      const s = this;
      return et(async function(...l) {
        const c = new mt([]), d = await s._def.args.parseAsync(l, a).catch((g) => {
          throw c.addIssue(r(l, g)), c;
        }), f = await Reflect.apply(i, this, d);
        return await s._def.returns._def.type.parseAsync(f, a).catch((g) => {
          throw c.addIssue(o(f, g)), c;
        });
      });
    } else {
      const s = this;
      return et(function(...l) {
        const c = s._def.args.safeParse(l, a);
        if (!c.success)
          throw new mt([r(l, c.error)]);
        const d = Reflect.apply(i, this, c.data), f = s._def.returns.safeParse(d, a);
        if (!f.success)
          throw new mt([o(d, f.error)]);
        return f.data;
      });
    }
  }
  parameters() {
    return this._def.args;
  }
  returnType() {
    return this._def.returns;
  }
  args(...t) {
    return new eo({
      ...this._def,
      args: dn.create(t).rest(mr.create())
    });
  }
  returns(t) {
    return new eo({
      ...this._def,
      returns: t
    });
  }
  implement(t) {
    return this.parse(t);
  }
  strictImplement(t) {
    return this.parse(t);
  }
  static create(t, n, r) {
    return new eo({
      args: t || dn.create([]).rest(mr.create()),
      returns: n || mr.create(),
      typeName: V.ZodFunction,
      ...G(r)
    });
  }
}
class da extends X {
  get schema() {
    return this._def.getter();
  }
  _parse(t) {
    const { ctx: n } = this._processInputParams(t);
    return this._def.getter()._parse({ data: n.data, path: n.path, parent: n });
  }
}
da.create = (e, t) => new da({
  getter: e,
  typeName: V.ZodLazy,
  ...G(t)
});
class fa extends X {
  _parse(t) {
    if (t.data !== this._def.value) {
      const n = this._getOrReturnCtx(t);
      return R(n, {
        received: n.data,
        code: T.invalid_literal,
        expected: this._def.value
      }), z;
    }
    return { status: "valid", value: t.data };
  }
  get value() {
    return this._def.value;
  }
}
fa.create = (e, t) => new fa({
  value: e,
  typeName: V.ZodLiteral,
  ...G(t)
});
function Jp(e, t) {
  return new tr({
    values: e,
    typeName: V.ZodEnum,
    ...G(t)
  });
}
class tr extends X {
  constructor() {
    super(...arguments), Fo.set(this, void 0);
  }
  _parse(t) {
    if (typeof t.data != "string") {
      const n = this._getOrReturnCtx(t), r = this._def.values;
      return R(n, {
        expected: ee.joinValues(r),
        received: n.parsedType,
        code: T.invalid_type
      }), z;
    }
    if (Bi(this, Fo) || Zp(this, Fo, new Set(this._def.values)), !Bi(this, Fo).has(t.data)) {
      const n = this._getOrReturnCtx(t), r = this._def.values;
      return R(n, {
        received: n.data,
        code: T.invalid_enum_value,
        options: r
      }), z;
    }
    return et(t.data);
  }
  get options() {
    return this._def.values;
  }
  get enum() {
    const t = {};
    for (const n of this._def.values)
      t[n] = n;
    return t;
  }
  get Values() {
    const t = {};
    for (const n of this._def.values)
      t[n] = n;
    return t;
  }
  get Enum() {
    const t = {};
    for (const n of this._def.values)
      t[n] = n;
    return t;
  }
  extract(t, n = this._def) {
    return tr.create(t, {
      ...this._def,
      ...n
    });
  }
  exclude(t, n = this._def) {
    return tr.create(this.options.filter((r) => !t.includes(r)), {
      ...this._def,
      ...n
    });
  }
}
Fo = /* @__PURE__ */ new WeakMap();
tr.create = Jp;
class pa extends X {
  constructor() {
    super(...arguments), Ho.set(this, void 0);
  }
  _parse(t) {
    const n = ee.getValidEnumValues(this._def.values), r = this._getOrReturnCtx(t);
    if (r.parsedType !== D.string && r.parsedType !== D.number) {
      const o = ee.objectValues(n);
      return R(r, {
        expected: ee.joinValues(o),
        received: r.parsedType,
        code: T.invalid_type
      }), z;
    }
    if (Bi(this, Ho) || Zp(this, Ho, new Set(ee.getValidEnumValues(this._def.values))), !Bi(this, Ho).has(t.data)) {
      const o = ee.objectValues(n);
      return R(r, {
        received: r.data,
        code: T.invalid_enum_value,
        options: o
      }), z;
    }
    return et(t.data);
  }
  get enum() {
    return this._def.values;
  }
}
Ho = /* @__PURE__ */ new WeakMap();
pa.create = (e, t) => new pa({
  values: e,
  typeName: V.ZodNativeEnum,
  ...G(t)
});
class fo extends X {
  unwrap() {
    return this._def.type;
  }
  _parse(t) {
    const { ctx: n } = this._processInputParams(t);
    if (n.parsedType !== D.promise && n.common.async === !1)
      return R(n, {
        code: T.invalid_type,
        expected: D.promise,
        received: n.parsedType
      }), z;
    const r = n.parsedType === D.promise ? n.data : Promise.resolve(n.data);
    return et(r.then((o) => this._def.type.parseAsync(o, {
      path: n.path,
      errorMap: n.common.contextualErrorMap
    })));
  }
}
fo.create = (e, t) => new fo({
  type: e,
  typeName: V.ZodPromise,
  ...G(t)
});
class Bt extends X {
  innerType() {
    return this._def.schema;
  }
  sourceType() {
    return this._def.schema._def.typeName === V.ZodEffects ? this._def.schema.sourceType() : this._def.schema;
  }
  _parse(t) {
    const { status: n, ctx: r } = this._processInputParams(t), o = this._def.effect || null, a = {
      addIssue: (i) => {
        R(r, i), i.fatal ? n.abort() : n.dirty();
      },
      get path() {
        return r.path;
      }
    };
    if (a.addIssue = a.addIssue.bind(a), o.type === "preprocess") {
      const i = o.transform(r.data, a);
      if (r.common.async)
        return Promise.resolve(i).then(async (s) => {
          if (n.value === "aborted")
            return z;
          const l = await this._def.schema._parseAsync({
            data: s,
            path: r.path,
            parent: r
          });
          return l.status === "aborted" ? z : l.status === "dirty" || n.value === "dirty" ? jr(l.value) : l;
        });
      {
        if (n.value === "aborted")
          return z;
        const s = this._def.schema._parseSync({
          data: i,
          path: r.path,
          parent: r
        });
        return s.status === "aborted" ? z : s.status === "dirty" || n.value === "dirty" ? jr(s.value) : s;
      }
    }
    if (o.type === "refinement") {
      const i = (s) => {
        const l = o.refinement(s, a);
        if (r.common.async)
          return Promise.resolve(l);
        if (l instanceof Promise)
          throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
        return s;
      };
      if (r.common.async === !1) {
        const s = this._def.schema._parseSync({
          data: r.data,
          path: r.path,
          parent: r
        });
        return s.status === "aborted" ? z : (s.status === "dirty" && n.dirty(), i(s.value), { status: n.value, value: s.value });
      } else
        return this._def.schema._parseAsync({ data: r.data, path: r.path, parent: r }).then((s) => s.status === "aborted" ? z : (s.status === "dirty" && n.dirty(), i(s.value).then(() => ({ status: n.value, value: s.value }))));
    }
    if (o.type === "transform")
      if (r.common.async === !1) {
        const i = this._def.schema._parseSync({
          data: r.data,
          path: r.path,
          parent: r
        });
        if (!ra(i))
          return i;
        const s = o.transform(i.value, a);
        if (s instanceof Promise)
          throw new Error("Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.");
        return { status: n.value, value: s };
      } else
        return this._def.schema._parseAsync({ data: r.data, path: r.path, parent: r }).then((i) => ra(i) ? Promise.resolve(o.transform(i.value, a)).then((s) => ({ status: n.value, value: s })) : i);
    ee.assertNever(o);
  }
}
Bt.create = (e, t, n) => new Bt({
  schema: e,
  typeName: V.ZodEffects,
  effect: t,
  ...G(n)
});
Bt.createWithPreprocess = (e, t, n) => new Bt({
  schema: t,
  effect: { type: "preprocess", transform: e },
  typeName: V.ZodEffects,
  ...G(n)
});
class on extends X {
  _parse(t) {
    return this._getType(t) === D.undefined ? et(void 0) : this._def.innerType._parse(t);
  }
  unwrap() {
    return this._def.innerType;
  }
}
on.create = (e, t) => new on({
  innerType: e,
  typeName: V.ZodOptional,
  ...G(t)
});
class nr extends X {
  _parse(t) {
    return this._getType(t) === D.null ? et(null) : this._def.innerType._parse(t);
  }
  unwrap() {
    return this._def.innerType;
  }
}
nr.create = (e, t) => new nr({
  innerType: e,
  typeName: V.ZodNullable,
  ...G(t)
});
class ha extends X {
  _parse(t) {
    const { ctx: n } = this._processInputParams(t);
    let r = n.data;
    return n.parsedType === D.undefined && (r = this._def.defaultValue()), this._def.innerType._parse({
      data: r,
      path: n.path,
      parent: n
    });
  }
  removeDefault() {
    return this._def.innerType;
  }
}
ha.create = (e, t) => new ha({
  innerType: e,
  typeName: V.ZodDefault,
  defaultValue: typeof t.default == "function" ? t.default : () => t.default,
  ...G(t)
});
class ma extends X {
  _parse(t) {
    const { ctx: n } = this._processInputParams(t), r = {
      ...n,
      common: {
        ...n.common,
        issues: []
      }
    }, o = this._def.innerType._parse({
      data: r.data,
      path: r.path,
      parent: {
        ...r
      }
    });
    return oa(o) ? o.then((a) => ({
      status: "valid",
      value: a.status === "valid" ? a.value : this._def.catchValue({
        get error() {
          return new mt(r.common.issues);
        },
        input: r.data
      })
    })) : {
      status: "valid",
      value: o.status === "valid" ? o.value : this._def.catchValue({
        get error() {
          return new mt(r.common.issues);
        },
        input: r.data
      })
    };
  }
  removeCatch() {
    return this._def.innerType;
  }
}
ma.create = (e, t) => new ma({
  innerType: e,
  typeName: V.ZodCatch,
  catchValue: typeof t.catch == "function" ? t.catch : () => t.catch,
  ...G(t)
});
class Yi extends X {
  _parse(t) {
    if (this._getType(t) !== D.nan) {
      const r = this._getOrReturnCtx(t);
      return R(r, {
        code: T.invalid_type,
        expected: D.nan,
        received: r.parsedType
      }), z;
    }
    return { status: "valid", value: t.data };
  }
}
Yi.create = (e) => new Yi({
  typeName: V.ZodNaN,
  ...G(e)
});
const DT = Symbol("zod_brand");
class Tc extends X {
  _parse(t) {
    const { ctx: n } = this._processInputParams(t), r = n.data;
    return this._def.type._parse({
      data: r,
      path: n.path,
      parent: n
    });
  }
  unwrap() {
    return this._def.type;
  }
}
class Va extends X {
  _parse(t) {
    const { status: n, ctx: r } = this._processInputParams(t);
    if (r.common.async)
      return (async () => {
        const a = await this._def.in._parseAsync({
          data: r.data,
          path: r.path,
          parent: r
        });
        return a.status === "aborted" ? z : a.status === "dirty" ? (n.dirty(), jr(a.value)) : this._def.out._parseAsync({
          data: a.value,
          path: r.path,
          parent: r
        });
      })();
    {
      const o = this._def.in._parseSync({
        data: r.data,
        path: r.path,
        parent: r
      });
      return o.status === "aborted" ? z : o.status === "dirty" ? (n.dirty(), {
        status: "dirty",
        value: o.value
      }) : this._def.out._parseSync({
        data: o.value,
        path: r.path,
        parent: r
      });
    }
  }
  static create(t, n) {
    return new Va({
      in: t,
      out: n,
      typeName: V.ZodPipeline
    });
  }
}
class xa extends X {
  _parse(t) {
    const n = this._def.innerType._parse(t), r = (o) => (ra(o) && (o.value = Object.freeze(o.value)), o);
    return oa(n) ? n.then((o) => r(o)) : r(n);
  }
  unwrap() {
    return this._def.innerType;
  }
}
xa.create = (e, t) => new xa({
  innerType: e,
  typeName: V.ZodReadonly,
  ...G(t)
});
function Oc(e, t = {}, n) {
  return e ? co.create().superRefine((r, o) => {
    var a, i;
    if (!e(r)) {
      const s = typeof t == "function" ? t(r) : typeof t == "string" ? { message: t } : t, l = (i = (a = s.fatal) !== null && a !== void 0 ? a : n) !== null && i !== void 0 ? i : !0, c = typeof s == "string" ? { message: s } : s;
      o.addIssue({ code: "custom", ...c, fatal: l });
    }
  }) : co.create();
}
const $T = {
  object: ye.lazycreate
};
var V;
(function(e) {
  e.ZodString = "ZodString", e.ZodNumber = "ZodNumber", e.ZodNaN = "ZodNaN", e.ZodBigInt = "ZodBigInt", e.ZodBoolean = "ZodBoolean", e.ZodDate = "ZodDate", e.ZodSymbol = "ZodSymbol", e.ZodUndefined = "ZodUndefined", e.ZodNull = "ZodNull", e.ZodAny = "ZodAny", e.ZodUnknown = "ZodUnknown", e.ZodNever = "ZodNever", e.ZodVoid = "ZodVoid", e.ZodArray = "ZodArray", e.ZodObject = "ZodObject", e.ZodUnion = "ZodUnion", e.ZodDiscriminatedUnion = "ZodDiscriminatedUnion", e.ZodIntersection = "ZodIntersection", e.ZodTuple = "ZodTuple", e.ZodRecord = "ZodRecord", e.ZodMap = "ZodMap", e.ZodSet = "ZodSet", e.ZodFunction = "ZodFunction", e.ZodLazy = "ZodLazy", e.ZodLiteral = "ZodLiteral", e.ZodEnum = "ZodEnum", e.ZodEffects = "ZodEffects", e.ZodNativeEnum = "ZodNativeEnum", e.ZodOptional = "ZodOptional", e.ZodNullable = "ZodNullable", e.ZodDefault = "ZodDefault", e.ZodCatch = "ZodCatch", e.ZodPromise = "ZodPromise", e.ZodBranded = "ZodBranded", e.ZodPipeline = "ZodPipeline", e.ZodReadonly = "ZodReadonly";
})(V || (V = {}));
const MT = (e, t = {
  message: `Input not instance of ${e.name}`
}) => Oc((n) => n instanceof e, t), F = Ft.create, K = qn.create, jT = Yi.create, FT = er.create, Rs = aa.create, HT = vr.create, UT = Wi.create, du = ia.create, VT = sa.create, zT = co.create, BT = mr.create, WT = kn.create, GT = Gi.create, In = Ut.create, W = ye.create, ZT = ye.strictCreate, Ki = la.create, YT = As.create, KT = ua.create, XT = dn.create, Qp = ca.create, JT = Zi.create, QT = yr.create, qT = eo.create, eO = da.create, fu = fa.create, za = tr.create, Nc = pa.create, tO = fo.create, Sf = Bt.create, nO = on.create, rO = nr.create, oO = Bt.createWithPreprocess, aO = Va.create, iO = () => F().optional(), sO = () => K().optional(), lO = () => Rs().optional(), uO = {
  string: (e) => Ft.create({ ...e, coerce: !0 }),
  number: (e) => qn.create({ ...e, coerce: !0 }),
  boolean: (e) => aa.create({
    ...e,
    coerce: !0
  }),
  bigint: (e) => er.create({ ...e, coerce: !0 }),
  date: (e) => vr.create({ ...e, coerce: !0 })
}, cO = z;
var Pe = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  defaultErrorMap: uo,
  setErrorMap: vT,
  getErrorMap: Vi,
  makeIssue: zi,
  EMPTY_PATH: yT,
  addIssueToContext: R,
  ParseStatus: Ye,
  INVALID: z,
  DIRTY: jr,
  OK: et,
  isAborted: lu,
  isDirty: uu,
  isValid: ra,
  isAsync: oa,
  get util() {
    return ee;
  },
  get objectUtil() {
    return su;
  },
  ZodParsedType: D,
  getParsedType: Mn,
  ZodType: X,
  datetimeRegex: Xp,
  ZodString: Ft,
  ZodNumber: qn,
  ZodBigInt: er,
  ZodBoolean: aa,
  ZodDate: vr,
  ZodSymbol: Wi,
  ZodUndefined: ia,
  ZodNull: sa,
  ZodAny: co,
  ZodUnknown: mr,
  ZodNever: kn,
  ZodVoid: Gi,
  ZodArray: Ut,
  ZodObject: ye,
  ZodUnion: la,
  ZodDiscriminatedUnion: As,
  ZodIntersection: ua,
  ZodTuple: dn,
  ZodRecord: ca,
  ZodMap: Zi,
  ZodSet: yr,
  ZodFunction: eo,
  ZodLazy: da,
  ZodLiteral: fa,
  ZodEnum: tr,
  ZodNativeEnum: pa,
  ZodPromise: fo,
  ZodEffects: Bt,
  ZodTransformer: Bt,
  ZodOptional: on,
  ZodNullable: nr,
  ZodDefault: ha,
  ZodCatch: ma,
  ZodNaN: Yi,
  BRAND: DT,
  ZodBranded: Tc,
  ZodPipeline: Va,
  ZodReadonly: xa,
  custom: Oc,
  Schema: X,
  ZodSchema: X,
  late: $T,
  get ZodFirstPartyTypeKind() {
    return V;
  },
  coerce: uO,
  any: zT,
  array: In,
  bigint: FT,
  boolean: Rs,
  date: HT,
  discriminatedUnion: YT,
  effect: Sf,
  enum: za,
  function: qT,
  instanceof: MT,
  intersection: KT,
  lazy: eO,
  literal: fu,
  map: JT,
  nan: jT,
  nativeEnum: Nc,
  never: WT,
  null: VT,
  nullable: rO,
  number: K,
  object: W,
  oboolean: lO,
  onumber: sO,
  optional: nO,
  ostring: iO,
  pipeline: aO,
  preprocess: oO,
  promise: tO,
  record: Qp,
  set: QT,
  strictObject: ZT,
  string: F,
  symbol: UT,
  transformer: Sf,
  tuple: XT,
  undefined: du,
  union: Ki,
  unknown: BT,
  void: GT,
  NEVER: cO,
  ZodIssueCode: T,
  quotelessJson: gT,
  ZodError: mt
});
class Ic extends Error {
  constructor(t, n) {
    const r = (n == null ? void 0 : n.logger) || _O(), o = (n == null ? void 0 : n.logLevel) || "error";
    t instanceof Error ? (super(t.message), this.translationKey = n == null ? void 0 : n.translationKey, this.context = {
      ...n == null ? void 0 : n.context,
      ...n != null && n.translationKey ? { translationMessage: lo.t(n.translationKey) } : {}
    }) : (super(lo.t(t)), this.translationKey = t, this.context = n == null ? void 0 : n.context), n != null && n.silent || this.logError(r, o);
  }
  logError(t, n) {
    const r = `
*************** ERROR ***************
`, o = `Error Type: ${this.name}
`, a = JSON.stringify({ error: this.message, context: this.context }, null, 4), i = `${r}${o}${a}`;
    t[n](i);
  }
}
class dO extends Ic {
  constructor(t, n) {
    const r = (n == null ? void 0 : n.name) || "ProsopoError", o = { ...n, name: r };
    super(t, o);
  }
}
class fO extends Ic {
  constructor(t, n) {
    const r = (n == null ? void 0 : n.name) || "ProsopoEnvError", o = { ...n, name: r };
    super(t, o);
  }
}
class bR extends Ic {
  constructor(t, n) {
    const r = (n == null ? void 0 : n.name) || "ProsopoDatasetError", o = { ...n, name: r };
    super(t, o);
  }
}
function pO() {
  return !!(typeof window < "u" && window.document && window.document.createElement);
}
function qp(e) {
  return typeof e == "string" ? [] : Object.keys(e).reduce((t, n) => {
    const r = e[n];
    if (r === void 0)
      throw new dO("DEVELOPER.KEY_ERROR", {
        context: { error: `Undefined value for key ${n}` }
      });
    const o = qp(r);
    return t.concat(o.map((a) => `${n}.${a}`));
  }, []);
}
const kf = Pe.enum(qp(Wp));
Pe.record(kf, Pe.record(kf, Pe.string()));
const Ef = {
  debug: !1,
  fallbackLng: "en",
  resources: {
    en: {
      translation: Wp
    },
    es: {
      translation: C3
    },
    pt: {
      translation: xT
    }
  }
}, hO = {
  react: {
    useSuspense: !1
  },
  detection: {
    order: ["navigator", "htmlTag", "path", "subdomain"],
    caches: ["localStorage", "cookie"]
  }
}, mO = {};
pO() ? lo.use(Pp).use(j1).init({ ...Ef, ...hO }) : lo.use(new Fp(void 0, { reloadInterval: !1 })).use(L1).init({ ...Ef, ...mO });
const Ee = {
  silent: Number.NEGATIVE_INFINITY,
  fatal: 0,
  error: 0,
  warn: 1,
  log: 2,
  info: 3,
  success: 3,
  fail: 3,
  ready: 3,
  start: 3,
  box: 3,
  debug: 4,
  trace: 5,
  verbose: Number.POSITIVE_INFINITY
}, Cf = {
  // Silent
  silent: {
    level: -1
  },
  // Level 0
  fatal: {
    level: Ee.fatal
  },
  error: {
    level: Ee.error
  },
  // Level 1
  warn: {
    level: Ee.warn
  },
  // Level 2
  log: {
    level: Ee.log
  },
  // Level 3
  info: {
    level: Ee.info
  },
  success: {
    level: Ee.success
  },
  fail: {
    level: Ee.fail
  },
  ready: {
    level: Ee.info
  },
  start: {
    level: Ee.info
  },
  box: {
    level: Ee.info
  },
  // Level 4
  debug: {
    level: Ee.debug
  },
  // Level 5
  trace: {
    level: Ee.trace
  },
  // Verbose
  verbose: {
    level: Ee.verbose
  }
};
function yl(e) {
  return e !== null && typeof e == "object";
}
function pu(e, t, n = ".", r) {
  if (!yl(t))
    return pu(e, {}, n);
  const o = Object.assign({}, t);
  for (const a in e) {
    if (a === "__proto__" || a === "constructor")
      continue;
    const i = e[a];
    i != null && (Array.isArray(i) && Array.isArray(o[a]) ? o[a] = [...i, ...o[a]] : yl(i) && yl(o[a]) ? o[a] = pu(
      i,
      o[a],
      (n ? `${n}.` : "") + a.toString()
    ) : o[a] = i);
  }
  return o;
}
function xO(e) {
  return (...t) => (
    // eslint-disable-next-line unicorn/no-array-reduce
    t.reduce((n, r) => pu(n, r, ""), {})
  );
}
const gO = xO();
function vO(e) {
  return Object.prototype.toString.call(e) === "[object Object]";
}
function yO(e) {
  return !(!vO(e) || !e.message && !e.args || e.stack);
}
let wl = !1;
const Tf = [];
class Ue {
  constructor(t = {}) {
    const n = t.types || Cf;
    this.options = gO(
      {
        ...t,
        defaults: { ...t.defaults },
        level: bl(t.level, n),
        reporters: [...t.reporters || []]
      },
      {
        types: Cf,
        throttle: 1e3,
        throttleMin: 5,
        formatOptions: {
          date: !0,
          colors: !1,
          compact: !0
        }
      }
    );
    for (const r in n) {
      const o = {
        type: r,
        ...this.options.defaults,
        ...n[r]
      };
      this[r] = this._wrapLogFn(o), this[r].raw = this._wrapLogFn(
        o,
        !0
      );
    }
    this.options.mockFn && this.mockTypes(), this._lastLog = {};
  }
  get level() {
    return this.options.level;
  }
  set level(t) {
    this.options.level = bl(
      t,
      this.options.types,
      this.options.level
    );
  }
  prompt(t, n) {
    if (!this.options.prompt)
      throw new Error("prompt is not supported!");
    return this.options.prompt(t, n);
  }
  create(t) {
    const n = new Ue({
      ...this.options,
      ...t
    });
    return this._mockFn && n.mockTypes(this._mockFn), n;
  }
  withDefaults(t) {
    return this.create({
      ...this.options,
      defaults: {
        ...this.options.defaults,
        ...t
      }
    });
  }
  withTag(t) {
    return this.withDefaults({
      tag: this.options.defaults.tag ? this.options.defaults.tag + ":" + t : t
    });
  }
  addReporter(t) {
    return this.options.reporters.push(t), this;
  }
  removeReporter(t) {
    if (t) {
      const n = this.options.reporters.indexOf(t);
      if (n >= 0)
        return this.options.reporters.splice(n, 1);
    } else
      this.options.reporters.splice(0);
    return this;
  }
  setReporters(t) {
    return this.options.reporters = Array.isArray(t) ? t : [t], this;
  }
  wrapAll() {
    this.wrapConsole(), this.wrapStd();
  }
  restoreAll() {
    this.restoreConsole(), this.restoreStd();
  }
  wrapConsole() {
    for (const t in this.options.types)
      console["__" + t] || (console["__" + t] = console[t]), console[t] = this[t].raw;
  }
  restoreConsole() {
    for (const t in this.options.types)
      console["__" + t] && (console[t] = console["__" + t], delete console["__" + t]);
  }
  wrapStd() {
    this._wrapStream(this.options.stdout, "log"), this._wrapStream(this.options.stderr, "log");
  }
  _wrapStream(t, n) {
    t && (t.__write || (t.__write = t.write), t.write = (r) => {
      this[n].raw(String(r).trim());
    });
  }
  restoreStd() {
    this._restoreStream(this.options.stdout), this._restoreStream(this.options.stderr);
  }
  _restoreStream(t) {
    t && t.__write && (t.write = t.__write, delete t.__write);
  }
  pauseLogs() {
    wl = !0;
  }
  resumeLogs() {
    wl = !1;
    const t = Tf.splice(0);
    for (const n of t)
      n[0]._logFn(n[1], n[2]);
  }
  mockTypes(t) {
    const n = t || this.options.mockFn;
    if (this._mockFn = n, typeof n == "function")
      for (const r in this.options.types)
        this[r] = n(r, this.options.types[r]) || this[r], this[r].raw = this[r];
  }
  _wrapLogFn(t, n) {
    return (...r) => {
      if (wl) {
        Tf.push([this, t, r, n]);
        return;
      }
      return this._logFn(t, r, n);
    };
  }
  _logFn(t, n, r) {
    if ((t.level || 0) > this.level)
      return !1;
    const o = {
      date: /* @__PURE__ */ new Date(),
      args: [],
      ...t,
      level: bl(t.level, this.options.types)
    };
    !r && n.length === 1 && yO(n[0]) ? Object.assign(o, n[0]) : o.args = [...n], o.message && (o.args.unshift(o.message), delete o.message), o.additional && (Array.isArray(o.additional) || (o.additional = o.additional.split(`
`)), o.args.push(`
` + o.additional.join(`
`)), delete o.additional), o.type = typeof o.type == "string" ? o.type.toLowerCase() : "log", o.tag = typeof o.tag == "string" ? o.tag : "";
    const a = (s = !1) => {
      const l = (this._lastLog.count || 0) - this.options.throttleMin;
      if (this._lastLog.object && l > 0) {
        const c = [...this._lastLog.object.args];
        l > 1 && c.push(`(repeated ${l} times)`), this._log({ ...this._lastLog.object, args: c }), this._lastLog.count = 1;
      }
      s && (this._lastLog.object = o, this._log(o));
    };
    clearTimeout(this._lastLog.timeout);
    const i = this._lastLog.time && o.date ? o.date.getTime() - this._lastLog.time.getTime() : 0;
    if (this._lastLog.time = o.date, i < this.options.throttle)
      try {
        const s = JSON.stringify([
          o.type,
          o.tag,
          o.args
        ]), l = this._lastLog.serialized === s;
        if (this._lastLog.serialized = s, l && (this._lastLog.count = (this._lastLog.count || 0) + 1, this._lastLog.count > this.options.throttleMin)) {
          this._lastLog.timeout = setTimeout(
            a,
            this.options.throttle
          );
          return;
        }
      } catch {
      }
    a(!0);
  }
  _log(t) {
    for (const n of this.options.reporters)
      n.log(t, {
        options: this.options
      });
  }
}
function bl(e, t = {}, n = 3) {
  return e === void 0 ? n : typeof e == "number" ? e : t[e] && t[e].level !== void 0 ? t[e].level : n;
}
Ue.prototype.add = Ue.prototype.addReporter;
Ue.prototype.remove = Ue.prototype.removeReporter;
Ue.prototype.clear = Ue.prototype.removeReporter;
Ue.prototype.withScope = Ue.prototype.withTag;
Ue.prototype.mock = Ue.prototype.mockTypes;
Ue.prototype.pause = Ue.prototype.pauseLogs;
Ue.prototype.resume = Ue.prototype.resumeLogs;
function wO(e = {}) {
  return new Ue(e);
}
class bO {
  constructor(t) {
    this.options = { ...t }, this.defaultColor = "#7f8c8d", this.levelColorMap = {
      0: "#c0392b",
      // Red
      1: "#f39c12",
      // Yellow
      3: "#00BCD4"
      // Cyan
    }, this.typeColorMap = {
      success: "#2ecc71"
      // Green
    };
  }
  _getLogFn(t) {
    return t < 1 ? console.__error || console.error : t === 1 ? console.__warn || console.warn : console.__log || console.log;
  }
  log(t) {
    const n = this._getLogFn(t.level), r = t.type === "log" ? "" : t.type, o = t.tag || "", i = `
      background: ${this.typeColorMap[t.type] || this.levelColorMap[t.level] || this.defaultColor};
      border-radius: 0.5em;
      color: white;
      font-weight: bold;
      padding: 2px 0.5em;
    `, s = `%c${[o, r].filter(Boolean).join(":")}`;
    typeof t.args[0] == "string" ? n(
      `${s}%c ${t.args[0]}`,
      i,
      // Empty string as style resets to default console style
      "",
      ...t.args.slice(1)
    ) : n(s, i, ...t.args);
  }
}
function eh(e = {}) {
  return wO({
    reporters: e.reporters || [new bO({})],
    prompt(n, r = {}) {
      return r.type === "confirm" ? Promise.resolve(confirm(n)) : Promise.resolve(prompt(n));
    },
    ...e
  });
}
eh();
const xn = za([
  "trace",
  "debug",
  "info",
  "warn",
  "error",
  "fatal",
  "log"
]);
function _O() {
  return EO;
}
const SO = (e, t) => {
  const n = eh({
    formatOptions: { colors: !0, date: !0 }
  }).withTag(t);
  let r = e;
  const o = {
    log: n.log,
    info: n.info,
    debug: n.debug,
    trace: n.trace,
    warn: n.warn,
    error: n.error,
    fatal: n.fatal,
    setLogLevel: (a) => {
      let i = Number.NaN;
      const s = kO(a);
      switch (s) {
        case xn.enum.trace:
          i = Ee.trace;
          break;
        case xn.enum.debug:
          i = Ee.debug;
          break;
        case xn.enum.info:
          i = Ee.info;
          break;
        case xn.enum.warn:
          i = Ee.warn;
          break;
        case xn.enum.error:
          i = Ee.error;
          break;
        case xn.enum.fatal:
          i = Ee.fatal;
          break;
        case xn.enum.log:
          i = Ee.log;
          break;
        default:
          throw new Error(`Invalid log level translation to consola's log level: ${a}`);
      }
      n.level = i, r = s;
    },
    getLogLevel: () => r
  };
  return o.setLogLevel(e), o;
};
function kO(e) {
  const n = (e || process.env.PROSOPO_LOG_LEVEL || "Info").toString().toLowerCase();
  try {
    return xn.parse(n);
  } catch {
    throw new fO("CONFIG.INVALID_LOG_LEVEL", {
      context: { logLevel: e }
    });
  }
}
const EO = SO(xn.enum.info, "global"), Xi = new Array(256), th = new Array(256 * 256);
for (let e = 0; e < 256; e++)
  Xi[e] = e.toString(16).padStart(2, "0");
for (let e = 0; e < 256; e++) {
  const t = e << 8;
  for (let n = 0; n < 256; n++)
    th[t | n] = Xi[e] + Xi[n];
}
function _l(e, t) {
  const n = e.length % 2 | 0, r = e.length - n | 0;
  for (let o = 0; o < r; o += 2)
    t += th[e[o] << 8 | e[o + 1]];
  return n && (t += Xi[e[r] | 0]), t;
}
function CO(e, t = -1, n = !0) {
  const r = n ? "0x" : "";
  if (e != null && e.length) {
    if (t > 0) {
      const o = Math.ceil(t / 8);
      if (e.length > o)
        return `${_l(e.subarray(0, o / 2), r)}…${_l(e.subarray(e.length - o / 2), "")}`;
    }
  } else return r;
  return _l(e, r);
}
var v = Z;
(function(e, t) {
  for (var n = Z, r = e(); ; )
    try {
      var o = -parseInt(n(1152)) / 1 * (-parseInt(n(1189)) / 2) + -parseInt(n(857)) / 3 * (parseInt(n(1254)) / 4) + -parseInt(n(848)) / 5 + parseInt(n(553)) / 6 + parseInt(n(707)) / 7 * (-parseInt(n(327)) / 8) + parseInt(n(1099)) / 9 + -parseInt(n(1112)) / 10 * (-parseInt(n(316)) / 11);
      if (o === t) break;
      r.push(r.shift());
    } catch {
      r.push(r.shift());
    }
})(Qi, 900342);
var hu = function(e, t) {
  return hu = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(n, r) {
    var o = Z;
    n[o(784)] = r;
  } || function(n, r) {
    var o = Z;
    for (var a in r)
      Object.prototype.hasOwnProperty[o(583)](r, a) && (n[a] = r[a]);
  }, hu(e, t);
};
function TO(e, t) {
  var n = Z;
  if (typeof t !== n(425) && t !== null)
    throw new TypeError(n(1048) + String(t) + n(511));
  hu(e, t);
  function r() {
    this.constructor = e;
  }
  e[n(886)] = t === null ? Object[n(851)](t) : (r[n(886)] = t[n(886)], new r());
}
var mu = function() {
  var e = Z;
  return mu = Object[e(819)] || function(n) {
    for (var r = e, o, a = 1, i = arguments.length; a < i; a++) {
      o = arguments[a];
      for (var s in o)
        Object[r(886)][r(509)][r(583)](o, s) && (n[s] = o[s]);
    }
    return n;
  }, mu[e(1241)](this, arguments);
};
function lt(e, t, n, r) {
  function o(a) {
    return a instanceof n ? a : new n(function(i) {
      i(a);
    });
  }
  return new (n || (n = Promise))(function(a, i) {
    var s = Z;
    function l(f) {
      try {
        d(r.next(f));
      } catch (p) {
        i(p);
      }
    }
    function c(f) {
      var p = Z;
      try {
        d(r[p(644)](f));
      } catch (g) {
        i(g);
      }
    }
    function d(f) {
      var p = Z;
      f[p(820)] ? a(f[p(1223)]) : o(f.value)[p(475)](l, c);
    }
    d((r = r[s(1241)](e, []))[s(710)]());
  });
}
function ut(e, t) {
  var n = Z, r = {
    label: 0,
    sent: function() {
      if (i[0] & 1) throw i[1];
      return i[1];
    },
    trys: [],
    ops: []
  }, o, a, i, s;
  return s = { next: l(0), throw: l(1), return: l(2) }, typeof Symbol === n(425) && (s[Symbol[n(704)]] = function() {
    return this;
  }), s;
  function l(d) {
    return function(f) {
      return c([d, f]);
    };
  }
  function c(d) {
    var f = n;
    if (o) throw new TypeError(f(580));
    for (; s && (s = 0, d[0] && (r = 0)), r; )
      try {
        if (o = 1, a && (i = d[0] & 2 ? a[f(485)] : d[0] ? a[f(644)] || ((i = a.return) && i.call(a), 0) : a[f(710)]) && !(i = i.call(a, d[1]))[f(820)])
          return i;
        switch (a = 0, i && (d = [d[0] & 2, i[f(1223)]]), d[0]) {
          case 0:
          case 1:
            i = d;
            break;
          case 4:
            return r.label++, { value: d[1], done: !1 };
          case 5:
            r.label++, a = d[1], d = [0];
            continue;
          case 7:
            d = r.ops[f(1267)](), r[f(816)].pop();
            continue;
          default:
            if (i = r.trys, !(i = i.length > 0 && i[i.length - 1]) && (d[0] === 6 || d[0] === 2)) {
              r = 0;
              continue;
            }
            if (d[0] === 3 && (!i || d[1] > i[0] && d[1] < i[3])) {
              r[f(979)] = d[1];
              break;
            }
            if (d[0] === 6 && r[f(979)] < i[1]) {
              r[f(979)] = i[1], i = d;
              break;
            }
            if (i && r[f(979)] < i[2]) {
              r[f(979)] = i[2], r[f(1260)].push(d);
              break;
            }
            i[2] && r[f(1260)][f(1267)](), r[f(816)][f(1267)]();
            continue;
        }
        d = t[f(583)](e, r);
      } catch (p) {
        d = [6, p], a = 0;
      } finally {
        o = i = 0;
      }
    if (d[0] & 5) throw d[1];
    return { value: d[0] ? d[1] : void 0, done: !0 };
  }
}
function Ji(e, t, n) {
  var r = Z;
  if (n || arguments[r(343)] === 2)
    for (var o = 0, a = t.length, i; o < a; o++)
      (i || !(o in t)) && (i || (i = Array[r(886)][r(1269)][r(583)](t, 0, o)), i[o] = t[o]);
  return e.concat(i || Array[r(886)][r(1269)][r(583)](t));
}
var nh = v(808);
function ga(e, t) {
  return new Promise(function(n) {
    return setTimeout(n, e, t);
  });
}
function OO(e, t) {
  var n = v;
  t === void 0 && (t = 1 / 0);
  var r = window[n(690)];
  return r ? new Promise(function(o) {
    return r.call(
      window,
      function() {
        return o();
      },
      { timeout: t }
    );
  }) : ga(Math.min(e, t));
}
function rh(e) {
  var t = v;
  return !!e && typeof e[t(475)] === t(425);
}
function Of(e, t) {
  try {
    var n = e();
    rh(n) ? n.then(
      function(r) {
        return t(!0, r);
      },
      function(r) {
        return t(!1, r);
      }
    ) : t(!0, n);
  } catch (r) {
    t(!1, r);
  }
}
function Nf(e, t, n) {
  return n === void 0 && (n = 16), lt(this, void 0, void 0, function() {
    var r, o, a, i;
    return ut(this, function(s) {
      var l = Z;
      switch (s[l(979)]) {
        case 0:
          r = Array(e[l(343)]), o = Date[l(738)](), a = 0, s.label = 1;
        case 1:
          return a < e[l(343)] ? (r[a] = t(e[a], a), i = Date[l(738)](), i >= o + n ? (o = i, [4, ga(0)]) : [3, 3]) : [3, 4];
        case 2:
          s[l(607)](), s[l(979)] = 3;
        case 3:
          return ++a, [3, 1];
        case 4:
          return [2, r];
      }
    });
  });
}
function va(e) {
  var t = v;
  e[t(475)](void 0, function() {
  });
}
function Rn(e, t) {
  e = [e[0] >>> 16, e[0] & 65535, e[1] >>> 16, e[1] & 65535], t = [
    t[0] >>> 16,
    t[0] & 65535,
    t[1] >>> 16,
    t[1] & 65535
  ];
  var n = [0, 0, 0, 0];
  return n[3] += e[3] + t[3], n[2] += n[3] >>> 16, n[3] &= 65535, n[2] += e[2] + t[2], n[1] += n[2] >>> 16, n[2] &= 65535, n[1] += e[1] + t[1], n[0] += n[1] >>> 16, n[1] &= 65535, n[0] += e[0] + t[0], n[0] &= 65535, [n[0] << 16 | n[1], n[2] << 16 | n[3]];
}
function _t(e, t) {
  e = [e[0] >>> 16, e[0] & 65535, e[1] >>> 16, e[1] & 65535], t = [
    t[0] >>> 16,
    t[0] & 65535,
    t[1] >>> 16,
    t[1] & 65535
  ];
  var n = [0, 0, 0, 0];
  return n[3] += e[3] * t[3], n[2] += n[3] >>> 16, n[3] &= 65535, n[2] += e[2] * t[3], n[1] += n[2] >>> 16, n[2] &= 65535, n[2] += e[3] * t[2], n[1] += n[2] >>> 16, n[2] &= 65535, n[1] += e[1] * t[3], n[0] += n[1] >>> 16, n[1] &= 65535, n[1] += e[2] * t[2], n[0] += n[1] >>> 16, n[1] &= 65535, n[1] += e[3] * t[1], n[0] += n[1] >>> 16, n[1] &= 65535, n[0] += e[0] * t[3] + e[1] * t[2] + e[2] * t[1] + e[3] * t[0], n[0] &= 65535, [n[0] << 16 | n[1], n[2] << 16 | n[3]];
}
function Ar(e, t) {
  return t %= 64, t === 32 ? [e[1], e[0]] : t < 32 ? [
    e[0] << t | e[1] >>> 32 - t,
    e[1] << t | e[0] >>> 32 - t
  ] : (t -= 32, [
    e[1] << t | e[0] >>> 32 - t,
    e[0] << t | e[1] >>> 32 - t
  ]);
}
function ft(e, t) {
  return t %= 64, t === 0 ? e : t < 32 ? [e[0] << t | e[1] >>> 32 - t, e[1] << t] : [e[1] << t - 32, 0];
}
function ge(e, t) {
  return [e[0] ^ t[0], e[1] ^ t[1]];
}
function If(e) {
  return e = ge(e, [0, e[0] >>> 1]), e = _t(e, [4283543511, 3981806797]), e = ge(e, [0, e[0] >>> 1]), e = _t(e, [3301882366, 444984403]), e = ge(e, [0, e[0] >>> 1]), e;
}
function NO(e, t) {
  var n = v;
  e = e || "", t = t || 0;
  var r = e[n(343)] % 16, o = e.length - r, a = [0, t], i = [0, t], s = [0, 0], l = [0, 0], c = [2277735313, 289559509], d = [1291169091, 658871167], f;
  for (f = 0; f < o; f = f + 16)
    s = [
      e[n(655)](f + 4) & 255 | (e[n(655)](f + 5) & 255) << 8 | (e[n(655)](f + 6) & 255) << 16 | (e[n(655)](f + 7) & 255) << 24,
      e.charCodeAt(f) & 255 | (e[n(655)](f + 1) & 255) << 8 | (e[n(655)](f + 2) & 255) << 16 | (e.charCodeAt(f + 3) & 255) << 24
    ], l = [
      e[n(655)](f + 12) & 255 | (e[n(655)](f + 13) & 255) << 8 | (e[n(655)](f + 14) & 255) << 16 | (e[n(655)](f + 15) & 255) << 24,
      e[n(655)](f + 8) & 255 | (e[n(655)](f + 9) & 255) << 8 | (e.charCodeAt(f + 10) & 255) << 16 | (e[n(655)](f + 11) & 255) << 24
    ], s = _t(s, c), s = Ar(s, 31), s = _t(s, d), a = ge(a, s), a = Ar(a, 27), a = Rn(a, i), a = Rn(_t(a, [0, 5]), [0, 1390208809]), l = _t(l, d), l = Ar(l, 33), l = _t(l, c), i = ge(i, l), i = Ar(i, 31), i = Rn(i, a), i = Rn(_t(i, [0, 5]), [0, 944331445]);
  switch (s = [0, 0], l = [0, 0], r) {
    case 15:
      l = ge(l, ft([0, e.charCodeAt(f + 14)], 48));
    case 14:
      l = ge(l, ft([0, e[n(655)](f + 13)], 40));
    case 13:
      l = ge(l, ft([0, e[n(655)](f + 12)], 32));
    case 12:
      l = ge(l, ft([0, e.charCodeAt(f + 11)], 24));
    case 11:
      l = ge(l, ft([0, e[n(655)](f + 10)], 16));
    case 10:
      l = ge(l, ft([0, e[n(655)](f + 9)], 8));
    case 9:
      l = ge(l, [0, e.charCodeAt(f + 8)]), l = _t(l, d), l = Ar(l, 33), l = _t(l, c), i = ge(i, l);
    case 8:
      s = ge(s, ft([0, e[n(655)](f + 7)], 56));
    case 7:
      s = ge(s, ft([0, e[n(655)](f + 6)], 48));
    case 6:
      s = ge(s, ft([0, e[n(655)](f + 5)], 40));
    case 5:
      s = ge(s, ft([0, e[n(655)](f + 4)], 32));
    case 4:
      s = ge(s, ft([0, e[n(655)](f + 3)], 24));
    case 3:
      s = ge(s, ft([0, e[n(655)](f + 2)], 16));
    case 2:
      s = ge(s, ft([0, e[n(655)](f + 1)], 8));
    case 1:
      s = ge(s, [0, e[n(655)](f)]), s = _t(s, c), s = Ar(s, 31), s = _t(s, d), a = ge(a, s);
  }
  return a = ge(a, [0, e[n(343)]]), i = ge(i, [0, e[n(343)]]), a = Rn(a, i), i = Rn(i, a), a = If(a), i = If(i), a = Rn(a, i), i = Rn(i, a), (n(697) + (a[0] >>> 0)[n(961)](16))[n(1269)](-8) + (n(697) + (a[1] >>> 0)[n(961)](16))[n(1269)](-8) + (n(697) + (i[0] >>> 0)[n(961)](16))[n(1269)](-8) + (n(697) + (i[1] >>> 0)[n(961)](16)).slice(-8);
}
function IO(e) {
  var t = v, n;
  return mu(
    {
      name: e[t(516)],
      message: e[t(555)],
      stack: (n = e[t(742)]) === null || n === void 0 ? void 0 : n[t(447)](`
`)
    },
    e
  );
}
function LO(e, t) {
  for (var n = v, r = 0, o = e[n(343)]; r < o; ++r)
    if (e[r] === t) return !0;
  return !1;
}
function AO(e, t) {
  return !LO(e, t);
}
function Lc(e) {
  return parseInt(e);
}
function Dt(e) {
  return parseFloat(e);
}
function vn(e, t) {
  var n = v;
  return typeof e === n(477) && isNaN(e) ? t : e;
}
function Gt(e) {
  return e.reduce(function(t, n) {
    return t + (n ? 1 : 0);
  }, 0);
}
function oh(e, t) {
  var n = v;
  if (t === void 0 && (t = 1), Math.abs(t) >= 1) return Math.round(e / t) * t;
  var r = 1 / t;
  return Math[n(1012)](e * r) / r;
}
function RO(e) {
  for (var t = v, n, r, o = t(1150)[t(1130)](e, "'"), a = /^\s*([a-z-]*)(.*)$/i.exec(e), i = a[1] || void 0, s = {}, l = /([.:#][\w-]+|\[.+?\])/gi, c = function(g, y) {
    var m = t;
    s[g] = s[g] || [], s[g][m(638)](y);
  }; ; ) {
    var d = l[t(683)](a[2]);
    if (!d) break;
    var f = d[0];
    switch (f[0]) {
      case ".":
        c("class", f[t(1269)](1));
        break;
      case "#":
        c("id", f[t(1269)](1));
        break;
      case "[": {
        var p = /^\[([\w-]+)([~|^$*]?=("(.*?)"|([\w-]+)))?(\s+[is])?\]$/.exec(f);
        if (p)
          c(
            p[1],
            (r = (n = p[4]) !== null && n !== void 0 ? n : p[5]) !== null && r !== void 0 ? r : ""
          );
        else throw new Error(o);
        break;
      }
      default:
        throw new Error(o);
    }
  }
  return [i, s];
}
function Lf(e) {
  var t = v;
  return e && typeof e === t(668) && t(555) in e ? e : { message: e };
}
function PO(e) {
  var t = v;
  return typeof e !== t(425);
}
function DO(e, t) {
  var n = new Promise(function(r) {
    var o = Z, a = Date[o(738)]();
    Of(e[o(512)](null, t), function() {
      for (var i = o, s = [], l = 0; l < arguments[i(343)]; l++)
        s[l] = arguments[l];
      var c = Date[i(738)]() - a;
      if (!s[0])
        return r(function() {
          return { error: Lf(s[1]), duration: c };
        });
      var d = s[1];
      if (PO(d))
        return r(function() {
          return { value: d, duration: c };
        });
      r(function() {
        return new Promise(function(f) {
          var p = Z, g = Date[p(738)]();
          Of(d, function() {
            for (var y = p, m = [], b = 0; b < arguments[y(343)]; b++)
              m[b] = arguments[b];
            var u = c + Date[y(738)]() - g;
            if (!m[0])
              return f({ error: Lf(m[1]), duration: u });
            f({ value: m[1], duration: u });
          });
        });
      });
    });
  });
  return va(n), function() {
    return n.then(function(o) {
      return o();
    });
  };
}
function $O(e, t, n) {
  var r = v, o = Object[r(331)](e)[r(788)](function(i) {
    return AO(n, i);
  }), a = Nf(o, function(i) {
    return DO(e[i], t);
  });
  return va(a), function() {
    return lt(this, void 0, void 0, function() {
      var s, l, c, d, f;
      return ut(this, function(p) {
        var g = Z;
        switch (p[g(979)]) {
          case 0:
            return [4, a];
          case 1:
            return s = p[g(607)](), [
              4,
              Nf(s, function(y) {
                var m = y();
                return va(m), m;
              })
            ];
          case 2:
            return l = p.sent(), [4, Promise[g(930)](l)];
          case 3:
            for (c = p[g(607)](), d = {}, f = 0; f < o[g(343)]; ++f)
              d[o[f]] = c[f];
            return [2, d];
        }
      });
    });
  };
}
function ah() {
  var e = v, t = window, n = navigator;
  return Gt([
    e(628) in t,
    e(341) in t,
    "msIndexedDB" in t,
    e(523) in n,
    e(730) in n
  ]) >= 4;
}
function MO() {
  var e = v, t = window, n = navigator;
  return Gt([
    e(701) in t,
    e(661) in t,
    e(905) in n,
    e(752) in n
  ]) >= 3 && !ah();
}
function Ac() {
  var e = v, t = window, n = navigator;
  return Gt([
    e(592) in n,
    "webkitTemporaryStorage" in n,
    n[e(1033)].indexOf(e(571)) === 0,
    "webkitResolveLocalFileSystemURL" in t,
    e(1e3) in t,
    e(611) in t,
    "webkitSpeechGrammar" in t
  ]) >= 5;
}
function Ba() {
  var e = v, t = window, n = navigator;
  return Gt([
    "ApplePayError" in t,
    e(1192) in t,
    e(361) in t,
    n[e(1033)].indexOf(e(817)) === 0,
    e(670) in n,
    e(960) in t
  ]) >= 4;
}
function Qi() {
  var e = [
    "SVGGeometryElement",
    "#pavePub",
    "Screen.availHeight",
    "getProps",
    "botKind",
    "sendBeacon",
    ".kadr",
    "FakeBrowser",
    "__$webdriverAsyncExecutor",
    "#issuem-leaky-paywall-articles-zero-remaining-nag",
    "webGL",
    ".hs-sosyal",
    "__nightmare",
    "visibility",
    "important",
    "Firefox",
    "language",
    "I3dlcmJ1bmdza3k=",
    "exp",
    "client blocked behemoth iframe",
    "BatteryManager",
    "gpu",
    "log",
    "product",
    "Chrome OS",
    "rtt",
    "productSub",
    "active",
    "webgl",
    "strict",
    "availLeftHash",
    "failed illegal error",
    "round",
    "browserLanguage",
    "abs",
    "__crWeb",
    "createAnalyser",
    "connection",
    "getElementsByTagNameNS",
    "0007ab4e",
    "c767712b",
    ".BetterJsPopOverlay",
    "sequentum",
    "YVtocmVmXj0iaHR0cDovL2Fkc2Vydi5vbnRlay5jb20udHIvIl0=",
    "cef",
    ".zergnet-recommend",
    "Tor Browser",
    "OfflineAudioContext",
    "cosh",
    "ChromeDriverw",
    "getTime",
    "spawn",
    "getPrototypeOf",
    "vendor",
    "scrollHeight",
    "#SSpotIMPopSlider",
    "appVersion",
    ".adblocker-root",
    "prependHash",
    "QVtocmVmKj0iaHR0cDovL2F4aWFiYW5uZXJzLmV4b2R1cy5nci8iXQ==",
    "W2lkXj0ic2tsaWtSZWtsYW1hIl0=",
    "background-color: ActiveText",
    "setMilliseconds",
    "YVtocmVmKj0id2Vib3JhbWEuZnIvZmNnaS1iaW4vIl0=",
    ".ezmob-footer",
    "asin",
    "oncomplete",
    "945b0c78",
    "Class extends value ",
    "NightmareJS",
    "YVtocmVmKj0iLmFmbGFtLmluZm8iXQ==",
    "webkitSpeechGrammar",
    "Navigator.hardwareConcurrency",
    "failed prototype test execution",
    "state",
    "subarray",
    "#pmadv",
    "Screen.pixelDepth",
    "Marlett",
    "#ceneo-placeholder-ceneo-12",
    "replaceChildHash",
    "ZGl2W2lkXj0iQWRGb3hfYmFubmVyXyJd",
    "quadraticCurveTo",
    "() { [native code] }",
    "beginPath",
    "PhantomJS",
    "permission",
    "#f60",
    "format",
    "f43e6134",
    "failed at reflect set proto proxy",
    "Function",
    "allow",
    "Batang",
    "message-box",
    "rgba(102, 204, 0, 0.2)",
    "evalLength",
    "Chameleon",
    "languages",
    "defineProperty",
    "PluginArray",
    "position",
    "3dd86d6f",
    "BotdError",
    "navigator.mimeTypes is undefined",
    "pluginsArray",
    "copyFromChannel",
    'div[class$="-hide"][zoompage-fontsize][style="display: block;"]',
    "[object Intl]",
    "YVtocmVmKj0iLmh0aGJldDM0LmNvbSJd",
    "setTime",
    "#kauli_yad_1",
    "plugins",
    "#social_follow",
    "webkitExitFullscreen",
    "insertAdjacentHTML",
    "#mobileCatfish",
    "isPointInPath",
    "__lastWatirConfirm",
    "12090834RcHoeG",
    "866fa7e7",
    "15771efa",
    "share",
    "maxTouchPoints",
    "browserKind",
    "availWidth",
    "1px",
    "failed own property",
    "mmMwWLliI0fiflO&1",
    "WebDriverIO",
    "Serial",
    "1466aaf0",
    "40780sXEQhh",
    "Awesomium",
    "#queTooltip",
    "dbbaf31f",
    "Calibri",
    "hidden",
    "failed at too much recursion error",
    "Lucida Bright",
    "min",
    'div[class^="app_gdpr"]',
    "YVtocmVmXj0iaHR0cDovL3d3dy5pbnN0YWxsYWRzLm5ldC8iXQ==",
    "LmFkLWRlc2t0b3AtcmVjdGFuZ2xl",
    "webkitTemporaryStorage",
    "ratio",
    "contentDocumentHash",
    "MYRIAD PRO",
    "mimeTypesConsistent",
    "wechat",
    "concat",
    "MS Reference Specialty",
    "getChannelDataHash",
    "Ll9wb3BJbl9pbmZpbml0ZV9hZA==",
    "internet_explorer",
    "navigator.productSub is undefined",
    ".sb-box-pubbliredazionale",
    "sessionStorage",
    "YVtocmVmKj0iLzg0OTkyMDIwLnh5eiJd",
    "WebAssembly",
    "exitFullscreen",
    "Reflect",
    "stop",
    "insertAdjacentText",
    "aW1nW2FsdD0iRGVkaWt1b3RpLmx0IHNlcnZlcmlhaSJd",
    "formatToParts",
    "insertAdjacentElementHash",
    "failed descriptor keys",
    "d19104ec",
    "Menlo",
    "Unexpected syntax '",
    "DOMRectList",
    "45XSYNYL",
    "Cwm fjordbank gly ",
    "LmNsb3NlLWFkcw==",
    "puppeteer-extra",
    "#hirdetesek_box",
    "ecb498d9",
    "I3Jla2xhbW5pLWJveA==",
    "query",
    "onorientationchange",
    "WorkerGlobalScope",
    ".revenue_unit_item.dable",
    "getElementsByName",
    "ZWAdobeF",
    "suspended",
    "W2NsYXNzKj0iR29vZ2xlQWRzIl0=",
    "innerHTML",
    "GOTHAM",
    "mode",
    "start",
    "detect",
    "SimHei",
    "mmMwWLliI0O&1",
    '[id^="bn_bottom_fixed_"]',
    "_Selenium_IDE_Recorder",
    "AnalyserNode.getFloatTimeDomainData",
    "0cb0c682",
    "Century Gothic",
    ".lapni-pop-over",
    "aspect-ratio: initial",
    "ms (",
    "ontouchstart",
    "send",
    "getAttributeNames",
    "Node.replaceChild",
    "(inverted-colors: ",
    "fromCharCode",
    "availHeightHash",
    "77718iTWOSg",
    "size",
    "Intl",
    "CSSPrimitiveValue",
    "globalCompositeOperation",
    "webglRenderer",
    "process",
    "getUserMedia",
    "Gecko",
    "setAppBadge",
    "timeout",
    "[data-cookie-number]",
    "Helvetica Neue",
    "Selenium",
    "onmouseleave",
    "toTimeString",
    "failed class extends error",
    "I2Fkcy1nb29nbGUtbWlkZGxlX3JlY3RhbmdsZS1ncm91cA==",
    "I2FkX2Jsb2NrZXI=",
    ".sygnal24-gdpr-modal-wrap",
    "YVtocmVmXj0iaHR0cHM6Ly9ibGFja2ZyaWRheXNhbGVzLnJvL3Ryay9zaG9wLyJd",
    "Haettenschweiler",
    "onmozfullscreenchange",
    "AnalyserNode.getByteFrequencyData",
    "#qoo-counter",
    "DuckDuckGo",
    "#cemp_doboz",
    "setSeconds",
    "notifications",
    "indexedDB",
    "HTMLIFrameElement.contentDocument",
    "standalone",
    "Hash",
    "#xenium_hot_offers",
    "value",
    "failed descriptor",
    "selenium-evaluate",
    "#top100counter",
    "atanh",
    "b011fd1c",
    "0000000",
    "webkit",
    "getElementsByTagName",
    "renderer",
    "icon",
    "createEvent",
    "resistFingerprinting",
    "sin",
    ".adstekst",
    'div[id^="smi2adblock"]',
    "function ",
    "Staccato222 BT",
    "apply",
    "indexOf",
    "documentElement",
    "fe88259f",
    "Ll9faXNib29zdFJldHVybkFk",
    "cos",
    "LnRyYWZmaWNqdW5reS1hZA==",
    "enumerateDevices",
    "tagName",
    "requestAdapterInfo",
    "YVtocmVmKj0iLy9mZWJyYXJlLnJ1LyJd",
    "style",
    `
userAgent: `,
    "300844HVUqxp",
    "openDatabase",
    '"><iframe></iframe></div>',
    "AudioBuffer.getChannelData",
    "toLocaleDateString",
    "matches",
    "ops",
    "fromCodePoint",
    ".navigate-to-top",
    "YVtocmVmKj0iLy9hZHYuaW1hZHJlcC5jby5rci8iXQ==",
    "77dea834",
    ".mainostila",
    "#backkapat",
    "pop",
    "Phantomas",
    "slice",
    "#Iklan-Melayang",
    "innerHeight",
    ".ylamainos",
    "childNodes",
    "android",
    "#SidebarIklan-wrapper",
    "puffinDevice",
    "canvas",
    "selenium",
    "description",
    "2266jfDEUc",
    "trident",
    "constructor",
    "open",
    "rootBounds",
    "98ec858e",
    "__gCrWeb",
    "RunPerfTest",
    "window.Notification is undefined",
    "RTCEncodedAudioFrame",
    "destination",
    "313336RXPAzL",
    "#onlajny-stickers",
    "window.external is undefined",
    "fmget_targets",
    "keys",
    ".yt.btn-link.btn-md.btn",
    "DisplayNames",
    "72b1ee2b",
    "map",
    "security",
    `
	height: 100vh;
	width: 100vw;
	position: absolute;
	left:-10000px;
	visibility: hidden;
`,
    "() {",
    "textBaseline",
    "wdioElectron",
    "msSetImmediate",
    "RENDERER",
    "length",
    "LmF3LWNvb2tpZS1iYW5uZXI=",
    "insertAdjacentHTMLHash",
    ".widgetadv",
    "width",
    "noContactsManager",
    "availHeight",
    "fd00bf5d",
    "YVtocmVmXj0iaHR0cDovL2NsaWNrLmhvdGxvZy5ydS8iXQ==",
    "phantomas",
    "serviceWorker",
    "length,name",
    "window.external.toString is not a function",
    "CHROME_OS",
    "I3ZpcEFkbWFya3RCYW5uZXJCbG9jaw==",
    " API properties analyzed in ",
    "coachjs",
    "random",
    "Counter",
    "afec348d",
    "Leelawadee",
    '.alert-info[data-block-track*="CookieNotice"]',
    "phantomjs",
    "awesomium",
    "insertBeforeHash",
    "components",
    "    [native code]",
    "YVtocmVmXj0iaHR0cHM6Ly9sLnByb2ZpdHNoYXJlLnJvLyJd",
    "Clarendon",
    "LmhlYWRlci1ibG9ja2VkLWFk",
    "setPrototypeOf",
    "YVtocmVmPSJodHRwOi8vd3d3LnNhbGlkemluaS5sdi8iXVtzdHlsZT0iZGlzcGxheTogYmxvY2s7IHdpZHRoOiA4OHB4OyBoZWlnaHQ6IDMxcHg7IG92ZXJmbG93OiBoaWRkZW47IHBvc2l0aW9uOiByZWxhdGl2ZTsiXQ==",
    "failed at chain cycle __proto__ error",
    "CyDec",
    "#adblock-honeypot",
    "setFullYear",
    "QVtocmVmXj0iL2ZyYW1ld29yay9yZXNvdXJjZXMvZm9ybXMvYWRzLmFzcHgiXQ==",
    "_phantom",
    "I0FkLUNvbnRlbnQ=",
    "__webdriver_evaluate",
    "contentWindow",
    "(prefers-reduced-motion: ",
    "isPointInStroke",
    "Agency FB",
    "__ybro",
    "37e2f32e",
    "copyFromChannelHash",
    'amp-embed[type="24smi"]',
    "string",
    ".etsy-tweet",
    "HTMLIFrameElement.contentWindow",
    "Mac",
    "textContent",
    "Electron",
    "standard",
    "userAgentData",
    "pow",
    "getContext",
    "availLeft",
    "SerialPort",
    "randomUUID",
    "appCodeName",
    "clientHeight",
    "debug",
    "sort",
    "getTimezoneOffset",
    "__edgeTrackingPreventionStatistics",
    "monitoring",
    "fill",
    "getParameter",
    "extension",
    "localStorage",
    ".cfa_popup",
    "permissions",
    "Privacy Badger",
    "db60d7f9",
    "#publiEspecial",
    "startRendering",
    "FMiner",
    "WebGLRenderingContext.getParameter is not a function",
    "font",
    "offsetHeight",
    "function",
    "Meiryo UI",
    "availTopHash",
    "#ac-lre-player",
    "fillText",
    "FileSystemWritableFileStream",
    "getFloatFrequencyData",
    "(dynamic-range: ",
    "MS Outlook",
    "RTCRtpTransceiver",
    "/npm-monitoring",
    "__webdriver_script_fn",
    "collect",
    "toLocaleString",
    "#FollowUs",
    "HELV",
    "function () { [native code] }",
    "failed at define properties",
    "getFrequencyResponse",
    "__firefox__",
    "I2xpdmVyZUFkV3JhcHBlcg==",
    "error",
    "split",
    "sqrt",
    "chromium",
    '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1">',
    "toLowerCase",
    "replace",
    "YVtocmVmKj0iY2FzaW5vcHJvLnNlIl1bdGFyZ2V0PSJfYmxhbmsiXQ==",
    "PMingLiU",
    "closePath",
    ".article-sharer",
    "#f9c",
    "YVtocmVmXj0iLy9hZmZ0cmsuYWx0ZXgucm8vQ291bnRlci9DbGljayJd",
    "mozInnerScreenX",
    "Function.toString",
    "attack",
    "iframe",
    "cbrt",
    "toLocaleTimeString",
    "YVtocmVmKj0iOi8vY2hpa2lkaWtpLnJ1Il0=",
    "buildID",
    "failed new instance error",
    "YVtocmVmKj0iL2NsaWNrdGhyZ2guYXNwPyJd",
    "Levenim MT",
    'aside[data-portal-id="leaderboard"]',
    "contentWindowHash",
    "log10",
    "hardwareConcurrencyHash",
    "Unknown",
    "then",
    "notificationPermissions signal unexpected behaviour",
    "number",
    "Mesa OffScreen",
    "failed at instanceof check error",
    "$cdc_asdjflasutopfhvcZLmcf",
    "domAutomation",
    "setProperty",
    "ownKeys",
    "onload",
    "return",
    "a63491fb",
    "supports",
    "SharedWorker",
    "Gill Sans",
    "external",
    "opr",
    "driver",
    "frequencyBinCount",
    "frequency",
    "MAC",
    "YVtocmVmXj0iaHR0cDovL3d3dy50cml6ZXIucGwvP3V0bV9zb3VyY2UiXQ==",
    "DIV.agores300",
    "failed object toString error",
    "getElementByIdHash",
    "getDisplayMedia",
    "#divAgahi",
    "YVtocmVmPSJodHRwOi8vd3d3LnNhbGlkemluaS5sdi8iXVtzdHlsZT0iZGlzcGxheTogYmxvY2s7IHdpZHRoOiAxMjBweDsgaGVpZ2h0OiA0MHB4OyBvdmVyZmxvdzogaGlkZGVuOyBwb3NpdGlvbjogcmVsYXRpdmU7Il0=",
    'div[id^="crt-"][data-criteo-id]',
    "add",
    "toFixed",
    "YVtocmVmXj0iaHR0cDovL2cxLnYuZndtcm0ubmV0L2FkLyJd",
    "lied",
    "triangle",
    "hasOwnProperty",
    "replaceWith",
    " is not a constructor or null",
    "bind",
    "Brave",
    "sendMessage",
    "height",
    "name",
    ".sklik",
    "Pristina",
    ".mobile_adhesion",
    "CanvasRenderingContext2D.getImageData",
    "webkitResolveLocalFileSystemURL",
    '[data-cypress="soft-push-notification-modal"]',
    "msMaxTouchPoints",
    'a[href^="/url/"]',
    "navigator.connection.rtt is undefined",
    "isWebkit",
    " not an object",
    "YVtocmVmXj0iaHR0cHM6Ly9iZDc0Mi5jb20vIl0=",
    "deleteProperty",
    "privacy",
    "Privacy Possum",
    "toDateString",
    "strokeText",
    "document.documentElement is undefined",
    "msie",
    "join",
    "SlimerJS",
    "YVtocmVmKj0iLy91dGltZy5ydS8iXQ==",
    "bufferData",
    "likeHeadlessRating",
    "reduce",
    "inverted",
    "HeadlessChrome",
    'failed "prototype" in function',
    "evenodd",
    "getBattery",
    "(forced-colors: ",
    "TypeError",
    "domAutomationController",
    "forEach",
    " !important",
    "SpiderMonkey",
    "7683528FSuavn",
    "firefox",
    "message",
    "Screen.availWidth",
    "YVtocmVmKj0iZHViaXp6bGUuY29tL2FyLz91dG1fc291cmNlPSJd",
    "CefSharp",
    ".as-oil",
    "LnJla2xhbWEtbWVnYWJvYXJk",
    "LINUX",
    "rect",
    "ANDROID",
    "__webdriverFunc",
    "__webdriver_script_function",
    "#mod-social-share-2",
    "Univers CE 55 Medium",
    "getClientRects",
    "ongestureend",
    "#mgid_iframe1",
    "Google",
    "buffer",
    ".img-kosana",
    "navigator.plugins is undefined",
    "Element.insertAdjacentElement",
    "LmFkczMwMHM=",
    "suffixes",
    "https://m1.openfpcdn.io/botd/v",
    ".wp_adblock_detect",
    "Generator is already executing.",
    "#taotaole",
    "__fxdriver_evaluate",
    "call",
    "atan",
    ".cc-CookieWarning",
    "resolvedOptions",
    "getVoices",
    "onreadystatechange",
    "function isBrave() { [native code] }",
    "isArray",
    "window.PluginArray is undefined",
    "webkitPersistentStorage",
    `
  `,
    "55e9b959",
    "LmJveF9hZHZfYW5udW5jaQ==",
    "(min-monochrome: 0)",
    "edge",
    "YVtocmVmKj0iLjE5NTZobC5jb20vIl0=",
    "#ff2",
    "Document.createElement",
    "document",
    "offsetParent",
    "webdriver",
    "MediaSource",
    "zoom",
    "LlppX2FkX2FfSA==",
    "sent",
    "__lastWatirAlert",
    "403a1a21",
    "YVtocmVmXj0iaHR0cDovL2hpdGNvdW50ZXIucnUvdG9wL3N0YXQucGhwIl0=",
    "webkitMediaStream",
    "#navbar_notice_50",
    "YW1wLWF1dG8tYWRz",
    "RelativeTimeFormat",
    "running",
    "__webdriver_unwrapped",
    "Element.insertAdjacentHTML",
    "webDriver",
    "\n```",
    "cpuClass",
    "none",
    "Node.insertBefore",
    "LmFkc19iYW4=",
    "nightmarejs",
    "SCRIPTINA",
    "parse",
    "ca9d9c2f",
    "MSCSSMatrix",
    "log1p",
    "Copy the text below to get the debug data:\n\n```\nversion: ",
    "createElement",
    "LmFkX19tYWlu",
    "452924d5",
    "Brian Paul",
    "Futura Md BT",
    "parentNode",
    "left",
    "push",
    "webkitFullscreenElement",
    "a2971888",
    "stringify",
    "edg/",
    "$chrome_asyncScriptInfo",
    "throw",
    "scrollWidth",
    "getImageDataHash",
    "colorDepthHash",
    "extensionHashPattern",
    "Serifa",
    "#pgeldiz",
    "color-scheme: initial",
    "formatRange",
    "getDetections",
    "getContextHash",
    "charCodeAt",
    "ontransitioncancel",
    "appendChildHash",
    "gecko",
    "Minion Pro",
    "MediaDevices",
    "MSStream",
    "AudioBuffer.copyFromChannel",
    "getMonth",
    "081d6d1b",
    "LmFtcF9hZA==",
    "YVtocmVmXj0iaHR0cHM6Ly94bHR1YmUubmwvY2xpY2svIl0=",
    "hasFocus",
    "object",
    "div",
    "getStorageUpdates",
    "I2FkX2ludmlld19hcmVh",
    "QVtocmVmKj0iaHR0cDovL2ludGVyYWN0aXZlLmZvcnRobmV0LmdyL2NsaWNrPyJd",
    "includes",
    "find",
    "calledSelenium",
    "ul.adsmodern",
    "nightmare",
    "Monotype Corsiva",
    "YVtocmVmXj0iaHR0cDovL3Byb21vLnZhZG9yLmNvbS8iXQ==",
    "appName",
    "electron",
    "$cdc_asdjflasutopfhvcZLmcfl_",
    "exec",
    "renderedBuffer",
    "has",
    "cookie",
    "getByteFrequencyDataHash",
    "webkitTextSizeAdjust",
    "versions",
    "requestIdleCallback",
    "removeChild",
    "ZGl2LmhvbGlkQWRz",
    "Small Fonts",
    "LmFkZ29vZ2xl",
    "status-bar",
    "userLanguage",
    "00000000",
    "CSSMozDocumentRule",
    "UTC",
    "mozCancelFullScreen",
    "msWriteProfilerMark",
    "appendHash",
    "Segoe UI Light",
    "iterator",
    "UCShellJava",
    "I3Jla2xhbWUtcmVjaHRzLW1pdHRl",
    "217gLgOGJ",
    "cookietest=1; SameSite=Strict;",
    "194ecf17",
    "next",
    "failed undefined properties",
    "font: ",
    "webkitRequestFullscreen",
    "0b637a33",
    "bot",
    "(prefers-color-scheme: light)",
    "0dbbf456",
    "createElementNS",
    "getOwnPropertyNames",
    "I3Jla2xhbWk=",
    "Function.prototype.bind is undefined",
    "73c662d9",
    "318390d1",
    "alphabetic",
    "getFullYear",
    "MozAppearance",
    "delayFallback",
    "failed at too much recursion __proto__ error",
    "chrome.runtime.sendMessage or chrome.runtime.connect can't be instantiated",
    "msPointerEnabled",
    "getBBox",
    "I2FkY29udGFpbmVyX3JlY2hlcmNoZQ==",
    "pluginsLength",
    "canShare",
    "toDataURLHash",
    "rgb(255, 0, 0)",
    "forced",
    "now",
    "YVtocmVmXj0iaHR0cDovL2FkMi50cmFmZmljZ2F0ZS5uZXQvIl0=",
    ".popup-social",
    "LndpZGdldF9wb19hZHNfd2lkZ2V0",
    "stack",
    "YVtocmVmXj0iLy90ZWxlZ3JhbS5tZS9zaGFyZS91cmw/Il0=",
    "toJSON",
    "YVtocmVmKj0iYm9vcmFxLm9yZyJd",
    "8ee7df22",
    "#psyduckpockeball",
    "resistance",
    "article.category-samarbete",
    "__selenium_evaluate",
    "substr",
    "msSaveBlob",
    "#Publicidade",
    "getBoundingClientRect",
    "cc7cb598",
    "getExtension",
    "WINDOWS",
    "threshold",
    "#back-top",
    "#semilo-lrectangle",
    ".site-pub-interstitiel",
    "WebGL2RenderingContext",
    "opera",
    "getFloatFrequencyDataHash",
    "_WEBDRIVER_ELEM_CACHE",
    "NoScript",
    "failed toString",
    "body",
    "RTCPeerConnectionIceEvent",
    "block",
    "YVtocmVmXj0iaHR0cHM6Ly9hZC5sZXRtZWFkcy5jb20vIl0=",
    "acosh",
    "write",
    "safari",
    "getLineDash",
    "#cookies-policy-sticky",
    "getDate",
    "CoachJS",
    "YVtocmVmXj0iLy93d3cuc3R1bWJsZXVwb24uY29tL3N1Ym1pdD91cmw9Il0=",
    "document.documentElement.getAttributeNames is not a function",
    "createElementHash",
    "serif",
    "EyeDropper",
    "__proto__",
    "setDate",
    "tan",
    "MT Extra",
    "filter",
    "getFloatTimeDomainDataHash",
    "oprt",
    "HTMLCanvasElement.toDataURL",
    "msFullscreenElement",
    "#sovrn_container",
    "__lastWatirPrompt",
    "onerror",
    "some",
    "brave",
    "src",
    "version",
    "sans-serif",
    "Century",
    "denied",
    "Futura Bk BT",
    "#barraPublicidade",
    "Cef",
    "getElementsByClassName",
    "$ if upgrade to Pro: https://fpjs.dev/pro",
    "3.4.2",
    "__driver_evaluate",
    "ContactsManager",
    "type",
    ".util-bar-module-firefly-visible",
    "getSubStringLength",
    "LnJlY2xhbWE=",
    "getByteTimeDomainDataHash",
    "trys",
    "Apple",
    "orientation",
    "assign",
    "done",
    "Notification",
    "caller",
    "complete",
    "toBlobHash",
    "arc",
    "max",
    "ZGl2I3NrYXBpZWNfYWQ=",
    "dfd41ab4",
    "mimeTypes",
    "onmouseenter",
    "availTop",
    "__yb",
    "absolute",
    "slimerjs",
    "devicePixelRatio",
    "caption",
    "a[href*=macau-uta-popup]",
    "asinh",
    "pixelDepthHash",
    "LmN0cGwtZnVsbGJhbm5lcg==",
    "platform",
    "\\$1",
    "chrome",
    "connect",
    "aW5zLmZhc3R2aWV3LWFk",
    "replaceChild",
    "toUpperCase",
    "6841825YNZrqa",
    "visualViewport",
    "__phantomas",
    "create",
    "userAgent",
    "UNMASKED_VENDOR_WEBGL",
    "family",
    "1.9.1",
    "getImageData",
    "69dpDSEp",
    "MS Mincho",
    "window",
    "span",
    "#subscribe_popup",
    "outerHeight",
    "ARNO PRO",
    "high",
    "Arabic Typesetting",
    "appendChild",
    "runtime",
    "prompt",
    "Letter Gothic",
    "failed at incompatible proxy error",
    "I2NhbXBhaWduLWJhbm5lcg==",
    "show",
    "get",
    "Windows",
    "YVtocmVmXj0iaHR0cDovL2Fkdm1hbmFnZXIudGVjaGZ1bi5wbC9yZWRpcmVjdC8iXQ==",
    "I2Jhbm5lcmZsb2F0MjI=",
    "load",
    "LnJla2xhbW9zX3RhcnBhcw==",
    "insertAdjacentElement",
    "replaceWithHash",
    "failed call interface error",
    "#meteored_share",
    "failed descriptor.value undefined",
    "HTMLCanvasElement.getContext is not a function",
    "arguments",
    "prototype",
    "Credential",
    "navigator.webdriver is undefined",
    "oscpu",
    "fillStyle",
    "failed own keys names",
    "#widget-quan",
    "#stickyCookieBar",
    "fontFamily",
    "display",
    "YVtocmVmKj0iLy9hZC5wbGFuYnBsdXMuY28ua3IvIl0=",
    "getOwnPropertyDescriptor",
    "acos",
    "requestAdapter",
    "geb",
    "parameters",
    "JavaScriptCore",
    "measureText",
    "tanh",
    "msLaunchUri",
    "experimental-webgl",
    "50a281b5",
    "YVtocmVmKj0iZG9rdG9yLXNlLm9uZWxpbmsubWUiXQ==",
    "append",
    " undefined",
    "getComponents",
    "TRAJAN PRO",
    "test",
    ".yb-floorad",
    "QVtocmVmKj0iaHR0cDovL3BheTRyZXN1bHRzMjQuZXUiXQ==",
    "pdfViewerEnabled",
    "toDataURL",
    "__selenium_unwrapped",
    "MediaSettingsRange",
    "function get ",
    "srcdoc",
    "no-preference",
    "insertBefore",
    "48px",
    "getHours",
    "Navigator.webdriver",
    "insertAdjacentTextHash",
    "nowrap",
    "visitorId",
    "all",
    "offsetWidth",
    "unknown",
    ".bumq",
    "Trace",
    "hardwareConcurrency",
    "lieTypes",
    ".quangcao",
    "BarcodeDetector",
    "documentElementKeys",
    "83b825ab",
    "ae3d02c9",
    "QVtocmVmKj0iYWRtYW4ub3RlbmV0LmdyL2NsaWNrPyJd",
    "atan2",
    "referrer",
    "failed at chain cycle error",
    "getVideoPlaybackQuality",
    "I2FkXzMwMFgyNTA=",
    "Node.appendChild",
    "LmZyb250cGFnZUFkdk0=",
    "CanvasCaptureMediaStream",
    "Microsoft Uighur",
    "availWidthHash",
    "Permissions.query",
    "Rhino",
    "YVtocmVmXj0iaHR0cHM6Ly9hcHAucmVhZHBlYWsuY29tL2FkcyJd",
    "getElementById",
    "detections",
    "WebDriver",
    "headlessRating",
    "WebKitMediaKeys",
    "toString",
    "setAttribute",
    "<div><iframe></iframe></div>",
    "YVtocmVmXj0iaHR0cHM6Ly9hZHNlcnZlci5odG1sLml0LyJd",
    "HTMLCanvasElement.getContext",
    "yandex",
    "I2FkdmVydGVudGll",
    "outerWidth",
    "YVtocmVmXj0iaHR0cDovL2l6bGVuemkuY29tL2NhbXBhaWduLyJd",
    "6b838fb6",
    "LnNwb25zb3JpdA==",
    "getVRDisplays",
    "YVtocmVmXj0iaHR0cDovL2FmZmlsaWF6aW9uaWFkcy5zbmFpLml0LyJd",
    "headless",
    "__webdriver_script_func",
    "HIDDevice",
    "samsungAr",
    "isBrave",
    "label"
  ];
  return Qi = function() {
    return e;
  }, Qi();
}
function Rc() {
  var e = v, t = window;
  return Gt([
    "safari" in t,
    !("DeviceMotionEvent" in t),
    !(e(569) in t),
    !(e(1220) in navigator)
  ]) >= 3;
}
function jO() {
  var e = v, t, n, r = window;
  return Gt([
    e(466) in navigator,
    e(726) in ((n = (t = document[e(1243)]) === null || t === void 0 ? void 0 : t[e(1252)]) !== null && n !== void 0 ? n : {}),
    e(1211) in r,
    e(459) in r,
    e(698) in r,
    e(950) in r
  ]) >= 4;
}
function FO() {
  var e = v, t = window;
  return Gt([
    !(e(919) in t),
    e(325) in t,
    "" + t[e(1191)] === e(1088),
    "" + t.Reflect == "[object Reflect]"
  ]) >= 3;
}
function HO() {
  var e = v, t = window;
  return Gt([
    e(1151) in t,
    e(769) in t,
    e(980) in t,
    e(656) in t
  ]) >= 3;
}
function UO() {
  var e = v;
  if (navigator[e(841)] === "iPad") return !0;
  var t = screen, n = t[e(347)] / t[e(515)];
  return Gt([
    e(604) in window,
    !!Element[e(886)][e(713)],
    n > 0.65 && n < 1.53
  ]) >= 2;
}
function VO() {
  var e = v, t = document;
  return t.fullscreenElement || t[e(792)] || t.mozFullScreenElement || t[e(639)] || null;
}
function zO() {
  var e = v, t = document;
  return (t[e(1140)] || t.msExitFullscreen || t[e(700)] || t[e(1094)])[e(583)](t);
}
function ih() {
  var e = v, t = Ac(), n = jO();
  if (!t && !n) return !1;
  var r = window;
  return Gt([
    e(1160) in r,
    e(818) in r,
    t && !("SharedWorker" in r),
    n && /android/i[e(913)](navigator[e(1036)])
  ]) >= 2;
}
function BO() {
  var e = v, t = window, n = t[e(1027)] || t.webkitOfflineAudioContext;
  if (!n) return -2;
  if (WO()) return -1;
  var r = 4500, o = 5e3, a = new n(1, o, 44100), i = a.createOscillator();
  i.type = e(508), i[e(494)].value = 1e4;
  var s = a.createDynamicsCompressor();
  s[e(758)][e(1223)] = -50, s.knee.value = 40, s[e(1125)][e(1223)] = 12, s[e(461)][e(1223)] = 0, s.release.value = 0.25, i[e(844)](s), s.connect(a[e(326)]), i[e(1170)](0);
  var l = GO(a), c = l[0], d = l[1], f = c[e(475)](
    function(p) {
      var g = e;
      return ZO(p.getChannelData(0)[g(1055)](r));
    },
    function(p) {
      var g = e;
      if (p[g(516)] === g(1199) || p[g(516)] === "suspended")
        return -3;
      throw p;
    }
  );
  return va(f), function() {
    return d(), f;
  };
}
function WO() {
  return Ba() && !Rc() && !HO();
}
function GO(e) {
  var t = 3, n = 500, r = 500, o = 5e3, a = function() {
  }, i = new Promise(function(s, l) {
    var c = Z, d = !1, f = 0, p = 0;
    e[c(1046)] = function(m) {
      var b = c;
      return s(m[b(684)]);
    };
    var g = function() {
      var m = c;
      setTimeout(
        function() {
          var b = Z;
          return l(Af(b(1199)));
        },
        Math[m(1120)](r, p + o - Date[m(738)]())
      );
    }, y = function() {
      var m = c;
      try {
        var b = e[m(420)]();
        switch (rh(b) && va(b), e[m(1054)]) {
          case m(615):
            p = Date[m(738)](), d && g();
            break;
          case m(1165):
            !document.hidden && f++, d && f >= t ? l(Af(m(1165))) : setTimeout(y, n);
            break;
        }
      } catch (u) {
        l(u);
      }
    };
    y(), a = function() {
      !d && (d = !0, p > 0 && g());
    };
  });
  return [i, a];
}
function ZO(e) {
  for (var t = v, n = 0, r = 0; r < e[t(343)]; ++r)
    n += Math[t(1014)](e[r]);
  return n;
}
function Af(e) {
  var t = new Error(e);
  return t.name = e, t;
}
function sh(e, t, n) {
  var r, o, a;
  return n === void 0 && (n = 50), lt(this, void 0, void 0, function() {
    var i, s;
    return ut(this, function(l) {
      var c = Z;
      switch (l[c(979)]) {
        case 0:
          i = document, l[c(979)] = 1;
        case 1:
          return i.body ? [3, 3] : [4, ga(n)];
        case 2:
          return l.sent(), [3, 1];
        case 3:
          s = i[c(631)](c(462)), l[c(979)] = 4;
        case 4:
          return l[c(816)].push([4, , 10, 11]), [
            4,
            new Promise(function(d, f) {
              var p = c, g = !1, y = function() {
                g = !0, d();
              }, m = function(h) {
                g = !0, f(h);
              };
              s[p(484)] = y, s[p(795)] = m;
              var b = s.style;
              b[p(482)](p(895), p(770), p(994)), b[p(1081)] = p(833), b.top = "0", b[p(637)] = "0", b[p(993)] = p(1117), t && p(921) in s ? s[p(921)] = t : s[p(798)] = "about:blank", i[p(768)][p(866)](s);
              var u = function() {
                var h = p, x, w;
                g || (((w = (x = s[h(383)]) === null || x === void 0 ? void 0 : x[h(601)]) === null || w === void 0 ? void 0 : w.readyState) === h(823) ? y() : setTimeout(u, 10));
              };
              u();
            })
          ];
        case 5:
          l[c(607)](), l[c(979)] = 6;
        case 6:
          return !((o = (r = s[c(383)]) === null || r === void 0 ? void 0 : r[c(601)]) === null || o === void 0) && o[c(768)] ? [3, 8] : [4, ga(n)];
        case 7:
          return l[c(607)](), [3, 6];
        case 8:
          return [4, e(s, s.contentWindow)];
        case 9:
          return [2, l[c(607)]()];
        case 10:
          return (a = s[c(636)]) === null || a === void 0 || a.removeChild(s), [7];
        case 11:
          return [2];
      }
    });
  });
}
function YO(e) {
  for (var t = v, n = RO(e), r = n[0], o = n[1], a = document[t(631)](
    r ?? t(669)
  ), i = 0, s = Object.keys(o); i < s[t(343)]; i++) {
    var l = s[i], c = o[l].join(" ");
    l === t(1252) ? KO(a[t(1252)], c) : a[t(962)](l, c);
  }
  return a;
}
function KO(e, t) {
  for (var n = v, r = 0, o = t[n(447)](";"); r < o[n(343)]; r++) {
    var a = o[r], i = /^\s*([\w-]+)\s*:\s*(.+?)(\s*!([\w-]+))?\s*$/.exec(a);
    if (i) {
      var s = i[1], l = i[2], c = i[4];
      e[n(482)](s, l, c || "");
    }
  }
}
var XO = v(1173), JO = v(924), Rr = ["monospace", v(800), v(782)], Rf = [
  "sans-serif-thin",
  v(863),
  v(386),
  v(865),
  "Arial Unicode MS",
  "AvantGarde Bk BT",
  "BankGothic Md BT",
  v(1073),
  "Bitstream Vera Sans Mono",
  v(1116),
  v(801),
  v(1178),
  v(371),
  "EUROSTILE",
  "Franklin Gothic",
  v(803),
  v(635),
  v(1168),
  v(489),
  v(440),
  v(1210),
  v(1201),
  "Humanst521 BT",
  v(363),
  v(869),
  v(469),
  v(1119),
  "Lucida Sans",
  v(1149),
  v(858),
  v(433),
  v(1131),
  "MS UI Gothic",
  v(787),
  v(1127),
  v(1058),
  v(426),
  v(951),
  v(659),
  v(678),
  v(454),
  v(518),
  v(625),
  v(703),
  v(649),
  v(1172),
  v(693),
  v(1240),
  v(912),
  v(567),
  "Vrinda",
  v(1164)
];
function QO() {
  return sh(function(e, t) {
    var n = Z, r = t[n(601)], o = r[n(768)];
    o[n(1252)].fontSize = JO;
    var a = r[n(631)](n(669)), i = {}, s = {}, l = function(b) {
      var u = n, h = r[u(631)]("span"), x = h[u(1252)];
      return x[u(1081)] = u(833), x.top = "0", x[u(637)] = "0", x.fontFamily = b, h[u(395)] = XO, a[u(866)](h), h;
    }, c = function(b, u) {
      var h = n;
      return l("'"[h(1130)](b, "',")[h(1130)](u));
    }, d = function() {
      return Rr.map(l);
    }, f = function() {
      for (var b = n, u = {}, h = function(E) {
        var k = Z;
        u[E] = Rr[k(335)](function(L) {
          return c(E, L);
        });
      }, x = 0, w = Rf; x < w[b(343)]; x++) {
        var S = w[x];
        h(S);
      }
      return u;
    }, p = function(b) {
      var u = n;
      return Rr[u(796)](function(h, x) {
        var w = u;
        return b[x][w(931)] !== i[h] || b[x][w(424)] !== s[h];
      });
    }, g = d(), y = f();
    o[n(866)](a);
    for (var m = 0; m < Rr[n(343)]; m++)
      i[Rr[m]] = g[m].offsetWidth, s[Rr[m]] = g[m][n(424)];
    return Rf.filter(function(b) {
      return p(y[b]);
    });
  });
}
function qO() {
  var e = v, t = navigator[e(1092)];
  if (t) {
    for (var n = [], r = 0; r < t.length; ++r) {
      var o = t[r];
      if (o) {
        for (var a = [], i = 0; i < o[e(343)]; ++i) {
          var s = o[i];
          a[e(638)]({ type: s[e(811)], suffixes: s[e(577)] });
        }
        n.push({
          name: o[e(516)],
          description: o[e(315)],
          mimeTypes: a
        });
      }
    }
    return n;
  }
}
function eN() {
  var e = !1, t, n, r = tN(), o = r[0], a = r[1];
  if (!nN(o, a)) t = n = "";
  else {
    e = rN(a), oN(o, a);
    var i = Sl(o), s = Sl(o);
    i !== s ? t = n = "unstable" : (n = i, aN(o, a), t = Sl(o));
  }
  return { winding: e, geometry: t, text: n };
}
function tN() {
  var e = v, t = document[e(631)]("canvas");
  return t.width = 1, t[e(515)] = 1, [t, t.getContext("2d")];
}
function nN(e, t) {
  return !!(t && e.toDataURL);
}
function rN(e) {
  var t = v;
  return e[t(562)](0, 0, 10, 10), e[t(562)](2, 2, 6, 6), !e[t(1097)](5, 5, t(545));
}
function oN(e, t) {
  var n = v;
  e[n(347)] = 240, e[n(515)] = 60, t[n(339)] = n(724), t[n(890)] = n(1067), t.fillRect(100, 1, 62, 20), t[n(890)] = "#069", t[n(423)] = '11pt "Times New Roman"';
  var r = n(1153)[n(1130)](String[n(1187)](55357, 56835));
  t[n(429)](r, 2, 15), t[n(890)] = n(1075), t[n(423)] = "18pt Arial", t[n(429)](r, 4, 45);
}
function aN(e, t) {
  var n = v;
  e[n(347)] = 122, e.height = 110, t[n(1193)] = "multiply";
  for (var r = 0, o = [
    ["#f2f", 40, 40],
    ["#2ff", 80, 40],
    [n(599), 60, 80]
  ]; r < o.length; r++) {
    var a = o[r], i = a[0], s = a[1], l = a[2];
    t[n(890)] = i, t[n(1064)](), t[n(825)](s, l, 40, 0, Math.PI * 2, !0), t[n(455)](), t[n(411)]();
  }
  t.fillStyle = n(457), t[n(825)](60, 60, 60, 0, Math.PI * 2, !0), t[n(825)](60, 60, 20, 0, Math.PI * 2, !0), t[n(411)](n(545));
}
function Sl(e) {
  var t = v;
  return e[t(917)]();
}
function iN() {
  var e = v, t = navigator, n = 0, r;
  t[e(1103)] !== void 0 ? n = Lc(t.maxTouchPoints) : t[e(523)] !== void 0 && (n = t[e(523)]);
  try {
    document[e(1234)]("TouchEvent"), r = !0;
  } catch {
    r = !1;
  }
  var o = e(1182) in window;
  return { maxTouchPoints: n, touchEvent: r, touchStart: o };
}
function sN() {
  return navigator.oscpu;
}
function lN() {
  var e = v, t = navigator, n = [], r = t[e(996)] || t[e(696)] || t.browserLanguage || t.systemLanguage;
  if (r !== void 0 && n[e(638)]([r]), Array[e(590)](t[e(1078)]))
    !(Ac() && FO()) && n[e(638)](t[e(1078)]);
  else if (typeof t.languages === e(391)) {
    var o = t[e(1078)];
    o && n[e(638)](o[e(447)](","));
  }
  return n;
}
function uN() {
  return window.screen.colorDepth;
}
function cN() {
  return vn(Dt(navigator.deviceMemory), void 0);
}
function dN() {
  var e = v, t = screen, n = function(o) {
    return vn(Lc(o), null);
  }, r = [n(t.width), n(t[e(515)])];
  return r.sort().reverse(), r;
}
var fN = 2500, pN = 10, _i, kl;
function hN() {
  if (kl === void 0) {
    var e = function() {
      var t = xu();
      gu(t) ? kl = setTimeout(e, fN) : (_i = t, kl = void 0);
    };
    e();
  }
}
function mN() {
  var e = this;
  return hN(), function() {
    return lt(e, void 0, void 0, function() {
      var t;
      return ut(this, function(n) {
        var r = Z;
        switch (n.label) {
          case 0:
            return t = xu(), gu(t) ? _i ? [2, Ji([], _i, !0)] : VO() ? [4, zO()] : [3, 2] : [3, 2];
          case 1:
            n[r(607)](), t = xu(), n[r(979)] = 2;
          case 2:
            return !gu(t) && (_i = t), [2, t];
        }
      });
    });
  };
}
function xN() {
  var e = this, t = mN();
  return function() {
    return lt(e, void 0, void 0, function() {
      var n, r;
      return ut(this, function(o) {
        var a = Z;
        switch (o.label) {
          case 0:
            return [4, t()];
          case 1:
            return n = o[a(607)](), r = function(i) {
              return i === null ? null : oh(i, pN);
            }, [
              2,
              [
                r(n[0]),
                r(n[1]),
                r(n[2]),
                r(n[3])
              ]
            ];
        }
      });
    });
  };
}
function xu() {
  var e = v, t = screen;
  return [
    vn(Dt(t[e(831)]), null),
    vn(
      Dt(t.width) - Dt(t[e(1105)]) - vn(Dt(t[e(401)]), 0),
      null
    ),
    vn(
      Dt(t[e(515)]) - Dt(t[e(349)]) - vn(Dt(t[e(831)]), 0),
      null
    ),
    vn(Dt(t[e(401)]), null)
  ];
}
function gu(e) {
  for (var t = 0; t < 4; ++t)
    if (e[t]) return !1;
  return !0;
}
function gN() {
  var e = v;
  return vn(Lc(navigator[e(935)]), void 0);
}
function vN() {
  var e = v, t, n = (t = window[e(1191)]) === null || t === void 0 ? void 0 : t.DateTimeFormat;
  if (n) {
    var r = new n()[e(586)]().timeZone;
    if (r) return r;
  }
  var o = -yN();
  return e(699)[e(1130)](o >= 0 ? "+" : "").concat(Math[e(1014)](o));
}
function yN() {
  var e = v, t = (/* @__PURE__ */ new Date())[e(725)]();
  return Math[e(826)](
    Dt(new Date(t, 0, 1).getTimezoneOffset()),
    Dt(new Date(t, 6, 1)[e(408)]())
  );
}
function wN() {
  var e = v;
  try {
    return !!window[e(1137)];
  } catch {
    return !0;
  }
}
function bN() {
  var e = v;
  try {
    return !!window[e(414)];
  } catch {
    return !0;
  }
}
function _N() {
  var e = v;
  if (!(ah() || MO()))
    try {
      return !!window[e(1218)];
    } catch {
      return !0;
    }
}
function SN() {
  var e = v;
  return !!window[e(1255)];
}
function kN() {
  var e = v;
  return navigator[e(620)];
}
function EN() {
  var e = v, t = navigator[e(841)];
  return t === "MacIntel" && Ba() && !Rc() ? UO() ? "iPad" : "iPhone" : t;
}
function CN() {
  var e = v;
  return navigator[e(1033)] || "";
}
function TN() {
  for (var e = v, t = [], n = 0, r = [
    e(843),
    e(774),
    e(1015),
    e(322),
    e(966),
    e(832),
    e(387),
    e(444),
    e(409),
    e(1230),
    e(790),
    e(977),
    "ucweb",
    e(705),
    e(1276)
  ]; n < r[e(343)]; n++) {
    var o = r[n], a = window[o];
    a && typeof a === e(668) && t[e(638)](o);
  }
  return t[e(407)]();
}
function ON() {
  var e = v, t = document;
  try {
    t[e(686)] = e(708);
    var n = t[e(686)][e(1242)]("cookietest=") !== -1;
    return t[e(686)] = "cookietest=1; SameSite=Strict; expires=Thu, 01-Jan-1970 00:00:01 GMT", n;
  } catch {
    return !1;
  }
}
function NN() {
  var e = v, t = atob;
  return {
    abpIndo: [
      e(1270),
      "#Kolom-Iklan-728",
      e(1275),
      '[title="ALIENBOLA" i]',
      t("I0JveC1CYW5uZXItYWRz")
    ],
    abpvn: [e(937), e(1096), t(e(1154)), e(1174), e(1056)],
    adBlockFinland: [
      e(1265),
      t(e(971)),
      e(1272),
      t(e(468)),
      t(e(955))
    ],
    adBlockPersian: [
      e(612),
      e(986),
      'TABLE[width="140px"]',
      e(501),
      t(e(506))
    ],
    adBlockWarningRemoval: [
      e(377),
      e(1037),
      e(579),
      t(e(372)),
      t(e(1207))
    ],
    adGuardAnnoyances: [
      e(991),
      "#cookieconsentdiv",
      e(1121),
      e(559),
      e(522)
    ],
    adGuardBase: [
      e(1021),
      t(e(947)),
      t(e(876)),
      t(e(871)),
      t(e(381))
    ],
    adGuardChinese: [
      t(e(606)),
      t(e(1089)),
      e(892),
      t(e(1138)),
      t(e(598))
    ],
    adGuardFrench: [
      e(981),
      t(e(1123)),
      e(519),
      e(346),
      t(e(623))
    ],
    adGuardGerman: [e(470)],
    adGuardJapanese: [
      e(1091),
      t(e(739)),
      t(e(1133)),
      t(e(694)),
      t(e(1245))
    ],
    adGuardMobile: [
      t(e(613)),
      t(e(665)),
      e(390),
      e(570),
      t(e(671))
    ],
    adGuardRussian: [
      t(e(771)),
      t(e(814)),
      e(1238),
      t(e(1061)),
      e(747)
    ],
    adGuardSocial: [
      t(e(779)),
      t(e(743)),
      e(392),
      "#inlineShare",
      e(740)
    ],
    adGuardSpanishPortuguese: [
      e(804),
      e(753),
      e(419),
      e(1114),
      ".cnt-publi"
    ],
    adGuardTrackingProtection: [
      e(1213),
      t(e(351)),
      t(e(610)),
      t("YVtocmVmXj0iaHR0cDovL3RvcC5tYWlsLnJ1L2p1bXAiXQ=="),
      e(1226)
    ],
    adGuardTurkish: [
      e(1266),
      t(e(720)),
      t(e(1023)),
      t(e(969)),
      t(e(1122))
    ],
    bulgarian: [t("dGQjZnJlZW5ldF90YWJsZV9hZHM="), "#ea_intext_div", e(1179), e(1222)],
    easyList: [
      e(914),
      t(e(741)),
      t(e(1247)),
      ".textad_headline",
      t("LnNwb25zb3JlZC10ZXh0LWxpbmtz")
    ],
    easyListChina: [
      t("LmFwcGd1aWRlLXdyYXBbb25jbGljayo9ImJjZWJvcy5jb20iXQ=="),
      t(e(949)),
      e(581),
      "#aafoot.top_box",
      e(415)
    ],
    easyListCookie: [
      e(1044),
      e(585),
      e(1200),
      t(e(344)),
      e(1208)
    ],
    easyListCzechSlovak: [
      e(328),
      t(e(1158)),
      t(e(560)),
      e(517),
      t(e(1040))
    ],
    easyListDutch: [
      t(e(967)),
      t(e(357)),
      e(1237),
      t(e(666)),
      e(760)
    ],
    easyListGermany: [
      e(1035),
      t("LnNwb25zb3JsaW5rZ3J1ZW4="),
      t(e(997)),
      t(e(706)),
      t(e(528))
    ],
    easyListItaly: [
      t(e(595)),
      e(1136),
      t(e(973)),
      t(e(964)),
      t("YVtocmVmXj0iaHR0cHM6Ly9hZmZpbGlhemlvbmlhZHMuc25haS5pdC8iXQ==")
    ],
    easyListLithuania: [
      t(e(878)),
      t("LnJla2xhbW9zX251b3JvZG9z"),
      t("aW1nW2FsdD0iUmVrbGFtaW5pcyBza3lkZWxpcyJd"),
      t(e(1144)),
      t("aW1nW2FsdD0iSG9zdGluZ2FzIFNlcnZlcmlhaS5sdCJd")
    ],
    estonian: [t(e(915))],
    fanboyAnnoyances: [
      e(428),
      e(1262),
      e(861),
      ".newsletter_holder",
      e(759)
    ],
    fanboyAntiFacebook: [e(812)],
    fanboyEnhancedTrackers: [
      ".open.pushModal",
      e(989),
      e(793),
      e(1087),
      ".BlockNag__Card"
    ],
    fanboySocial: [
      e(439),
      e(882),
      e(1093),
      e(456),
      ".community__social-desc"
    ],
    frellwitSwedish: [
      t(e(453)),
      t(e(908)),
      e(749),
      t(e(692)),
      e(676)
    ],
    greekAdBlock: [
      t(e(942)),
      t(e(1039)),
      t(e(672)),
      e(497),
      "TABLE.advright"
    ],
    hungarian: [
      e(1215),
      ".optimonk-iframe-container",
      t(e(632)),
      t(e(1166)),
      e(1156)
    ],
    iDontCareAboutCookies: [
      e(364),
      ".ModuleTemplateCookieIndicator",
      ".o--cookies--container",
      e(776),
      e(893)
    ],
    icelandicAbp: [t(e(379))],
    latvian: [t(e(502)), t(e(374))],
    listKr: [
      t(e(896)),
      t(e(445)),
      t(e(1263)),
      t(e(845)),
      e(1162)
    ],
    listeAr: [
      t("LmdlbWluaUxCMUFk"),
      ".right-and-left-sponsers",
      t(e(1050)),
      t(e(745)),
      t(e(557))
    ],
    listeFr: [
      t(e(679)),
      t(e(732)),
      t(e(1043)),
      e(761),
      e(503)
    ],
    officialPolish: [
      e(1059),
      t("W2hyZWZePSJodHRwczovL2FmZi5zZW5kaHViLnBsLyJd"),
      t(e(875)),
      t(e(496)),
      t(e(827))
    ],
    ro: [
      t(e(458)),
      t(e(1209)),
      t("YVtocmVmXj0iaHR0cHM6Ly9ldmVudC4ycGVyZm9ybWFudC5jb20vZXZlbnRzL2NsaWNrIl0="),
      t(e(370)),
      e(524)
    ],
    ruAd: [
      t(e(1251)),
      t(e(538)),
      t(e(465)),
      e(650),
      ".yandex-rtb-block"
    ],
    thaiAds: [
      e(837),
      t(e(1206)),
      t(e(576)),
      e(933),
      e(573)
    ],
    webAnnoyancesUltralist: [
      e(566),
      "#social-tools",
      t(e(840)),
      e(1025),
      e(332)
    ]
  };
}
function IN(e) {
  var t = v, n = e === void 0 ? {} : e, r = n[t(406)];
  return lt(this, void 0, void 0, function() {
    var o, a, i, s, l, c;
    return ut(this, function(d) {
      var f = Z;
      switch (d[f(979)]) {
        case 0:
          return LN() ? (o = NN(), a = Object[f(331)](o), i = (c = [])[f(1130)][f(1241)](
            c,
            a.map(function(p) {
              return o[p];
            })
          ), [4, AN(i)]) : [2, void 0];
        case 1:
          return s = d[f(607)](), r && RN(o, s), l = a[f(788)](function(p) {
            var g = f, y = o[p], m = Gt(
              y[g(335)](function(b) {
                return s[b];
              })
            );
            return m > y.length * 0.6;
          }), l.sort(), [2, l];
      }
    });
  });
}
function LN() {
  return Ba() || ih();
}
function AN(e) {
  var t;
  return lt(this, void 0, void 0, function() {
    var n, r, o, a, l, i, s, l;
    return ut(this, function(c) {
      var d = Z;
      switch (c.label) {
        case 0:
          for (n = document, r = n[d(631)](d(669)), o = new Array(e[d(343)]), a = {}, Pf(r), l = 0; l < e.length; ++l)
            i = YO(e[l]), i[d(1249)] === "DIALOG" && i[d(872)](), s = n[d(631)](d(669)), Pf(s), s[d(866)](i), r[d(866)](s), o[l] = i;
          c[d(979)] = 1;
        case 1:
          return n[d(768)] ? [3, 3] : [4, ga(50)];
        case 2:
          return c[d(607)](), [3, 1];
        case 3:
          n[d(768)][d(866)](r);
          try {
            for (l = 0; l < e[d(343)]; ++l)
              !o[l][d(602)] && (a[e[l]] = !0);
          } finally {
            (t = r[d(636)]) === null || t === void 0 || t[d(691)](r);
          }
          return [2, a];
      }
    });
  });
}
function Pf(e) {
  var t = v;
  e[t(1252)].setProperty(t(895), "block", t(994));
}
function Z(e, t) {
  var n = Qi();
  return Z = function(r, o) {
    r = r - 314;
    var a = n[r];
    return a;
  }, Z(e, t);
}
function RN(e, t) {
  for (var n = v, r = "DOM blockers debug:\n```", o = 0, a = Object[n(331)](e); o < a[n(343)]; o++) {
    var i = a[o];
    r += `
`[n(1130)](i, ":");
    for (var s = 0, l = e[i]; s < l[n(343)]; s++) {
      var c = l[s];
      r += n(593)[n(1130)](t[c] ? "🚫" : "➡️", " ").concat(c);
    }
  }
  console[n(1002)](""[n(1130)](r, n(619)));
}
function PN() {
  for (var e = v, t = 0, n = ["rec2020", "p3", "srgb"]; t < n[e(343)]; t++) {
    var r = n[t];
    if (matchMedia("(color-gamut: "[e(1130)](r, ")")).matches) return r;
  }
}
function DN() {
  var e = v;
  if (Df(e(542))) return !0;
  if (Df(e(621))) return !1;
}
function Df(e) {
  var t = v;
  return matchMedia(t(1186).concat(e, ")"))[t(1259)];
}
function $N() {
  var e = v;
  if ($f(e(1007))) return !0;
  if ($f("none")) return !1;
}
function $f(e) {
  var t = v;
  return matchMedia(t(547)[t(1130)](e, ")"))[t(1259)];
}
var MN = 100;
function jN() {
  var e = v;
  if (matchMedia(e(596))[e(1259)]) {
    for (var t = 0; t <= MN; ++t)
      if (matchMedia("(max-monochrome: "[e(1130)](t, ")"))[e(1259)]) return t;
    throw new Error("Too high value");
  }
}
function FN() {
  var e = v;
  if (Pr(e(922))) return 0;
  if (Pr("high") || Pr("more")) return 1;
  if (Pr("low") || Pr("less")) return -1;
  if (Pr(e(737))) return 10;
}
function Pr(e) {
  var t = v;
  return matchMedia("(prefers-contrast: ".concat(e, ")"))[t(1259)];
}
function HN() {
  var e = v;
  if (Mf(e(541))) return !0;
  if (Mf(e(922))) return !1;
}
function Mf(e) {
  var t = v;
  return matchMedia(t(384)[t(1130)](e, ")"))[t(1259)];
}
function UN() {
  var e = v;
  if (jf(e(864))) return !0;
  if (jf("standard")) return !1;
}
function jf(e) {
  var t = v;
  return matchMedia(t(432)[t(1130)](e, ")"))[t(1259)];
}
var ie = Math, Je = function() {
  return 0;
};
function VN() {
  var e = v, t = ie[e(898)] || Je, n = ie[e(772)] || Je, r = ie[e(1045)] || Je, o = ie[e(838)] || Je, a = ie[e(1227)] || Je, i = ie[e(584)] || Je, s = ie.sin || Je, l = ie.sinh || Je, c = ie.cos || Je, d = ie.cosh || Je, f = ie[e(786)] || Je, p = ie[e(904)] || Je, g = ie.exp || Je, y = ie.expm1 || Je, m = ie[e(629)] || Je, b = function(P) {
    var O = e;
    return ie[O(399)](ie.PI, P);
  }, u = function(P) {
    var O = e;
    return ie.log(P + ie[O(448)](P * P - 1));
  }, h = function(P) {
    var O = e;
    return ie[O(1002)](P + ie.sqrt(P * P + 1));
  }, x = function(P) {
    var O = e;
    return ie[O(1002)]((1 + P) / (1 - P)) / 2;
  }, w = function(P) {
    var O = e;
    return ie.exp(P) - 1 / ie[O(998)](P) / 2;
  }, S = function(P) {
    var O = e;
    return (ie[O(998)](P) + 1 / ie[O(998)](P)) / 2;
  }, E = function(P) {
    var O = e;
    return ie[O(998)](P) - 1;
  }, k = function(P) {
    var O = e;
    return (ie.exp(2 * P) - 1) / (ie[O(998)](2 * P) + 1);
  }, L = function(P) {
    var O = e;
    return ie[O(1002)](1 + P);
  };
  return {
    acos: t(0.12312423423423424),
    acosh: n(
      1e308
    ),
    acoshPf: u(
      1e154
    ),
    asin: r(0.12312423423423424),
    asinh: o(1),
    asinhPf: h(1),
    atanh: a(0.5),
    atanhPf: x(0.5),
    atan: i(0.5),
    sin: s(
      -1e300
    ),
    sinh: l(1),
    sinhPf: w(1),
    cos: c(10.000000000123),
    cosh: d(1),
    coshPf: S(1),
    tan: f(
      -1e300
    ),
    tanh: p(1),
    tanhPf: k(1),
    exp: g(1),
    expm1: y(1),
    expm1Pf: E(1),
    log1p: m(10),
    log1pPf: L(10),
    powPI: b(-100)
  };
}
var zN = v(1108), El = {
  default: [],
  apple: [{ font: "-apple-system-body" }],
  serif: [{ fontFamily: v(782) }],
  sans: [{ fontFamily: "sans-serif" }],
  mono: [{ fontFamily: "monospace" }],
  min: [{ fontSize: v(1106) }],
  system: [{ fontFamily: "system-ui" }]
};
function BN() {
  return WN(function(e, t) {
    for (var n = Z, r = {}, o = {}, a = 0, i = Object[n(331)](El); a < i.length; a++) {
      var s = i[a], l = El[s], c = l[0], d = c === void 0 ? {} : c, f = l[1], p = f === void 0 ? zN : f, g = e[n(631)](n(860));
      g[n(395)] = p, g[n(1252)].whiteSpace = n(928);
      for (var y = 0, m = Object.keys(d); y < m.length; y++) {
        var b = m[y], u = d[b];
        u !== void 0 && (g.style[b] = u);
      }
      r[s] = g, t.appendChild(e[n(631)]("br")), t.appendChild(g);
    }
    for (var h = 0, x = Object.keys(El); h < x[n(343)]; h++) {
      var s = x[h];
      o[s] = r[s][n(754)]().width;
    }
    return o;
  });
}
function WN(e, t) {
  var n = v;
  return t === void 0 && (t = 4e3), sh(function(r, o) {
    var a = Z, i = o[a(601)], s = i[a(768)], l = s[a(1252)];
    l[a(347)] = ""[a(1130)](t, "px"), l[a(688)] = l.textSizeAdjust = a(621), Ac() ? s.style[a(605)] = ""[a(1130)](1 / o[a(835)]) : Ba() && (s[a(1252)][a(605)] = "reset");
    var c = i[a(631)](a(669));
    return c[a(395)] = Ji([], Array(t / 20 << 0), !0)[a(335)](function() {
      return "word";
    })[a(536)](" "), s[a(866)](c), e(i, s);
  }, n(450));
}
function GN() {
  var e = v, t, n = document[e(631)](e(1277)), r = (t = n[e(400)]("webgl")) !== null && t !== void 0 ? t : n.getContext(e(906));
  if (r && e(756) in r) {
    var o = r[e(756)]("WEBGL_debug_renderer_info");
    if (o)
      return {
        vendor: (r.getParameter(o[e(853)]) || "")[e(961)](),
        renderer: (r[e(412)](o.UNMASKED_RENDERER_WEBGL) || "")[e(961)]()
      };
  }
}
function ZN() {
  var e = v;
  return navigator[e(916)];
}
function YN() {
  var e = v, t = new Float32Array(1), n = new Uint8Array(t[e(572)]);
  return t[0] = 1 / 0, t[0] = t[0] - t[0], n[3];
}
var KN = {
  fonts: QO,
  domBlockers: IN,
  fontPreferences: BN,
  audio: BO,
  screenFrame: xN,
  osCpu: sN,
  languages: lN,
  colorDepth: uN,
  deviceMemory: cN,
  screenResolution: dN,
  hardwareConcurrency: gN,
  timezone: vN,
  sessionStorage: wN,
  localStorage: bN,
  indexedDB: _N,
  openDatabase: SN,
  cpuClass: kN,
  platform: EN,
  plugins: qO,
  canvas: eN,
  touchSupport: iN,
  vendor: CN,
  vendorFlavors: TN,
  cookiesEnabled: ON,
  colorGamut: PN,
  invertedColors: DN,
  forcedColors: $N,
  monochrome: jN,
  contrast: FN,
  reducedMotion: HN,
  hdr: UN,
  math: VN,
  videoCard: GN,
  pdfViewerEnabled: ZN,
  architecture: YN
};
function XN(e) {
  return $O(KN, e, []);
}
var JN = v(807);
function QN(e) {
  var t = v, n = qN(e), r = eI(n);
  return { score: n, comment: JN[t(452)](/\$/g, "".concat(r)) };
}
function qN(e) {
  var t = v;
  if (ih()) return 0.4;
  if (Ba()) return Rc() ? 0.5 : 0.3;
  var n = e[t(841)][t(1223)] || "";
  return /^Win/.test(n) ? 0.6 : /^Mac/[t(913)](n) ? 0.5 : 0.7;
}
function eI(e) {
  return oh(0.99 + 0.01 * e, 1e-4);
}
function tI(e) {
  for (var t = v, n = "", r = 0, o = Object[t(331)](e).sort(); r < o[t(343)]; r++) {
    var a = o[r], i = e[a], s = i.error ? t(446) : JSON[t(641)](i[t(1223)]);
    n += ""[t(1130)](n ? "|" : "")[t(1130)](a[t(452)](/([:|\\])/g, t(842)), ":").concat(s);
  }
  return n;
}
function nI(e) {
  return JSON.stringify(
    e,
    function(t, n) {
      return n instanceof Error ? IO(n) : n;
    },
    2
  );
}
function lh(e) {
  return NO(tI(e));
}
function rI(e) {
  var t, n = QN(e);
  return {
    get visitorId() {
      return t === void 0 && (t = lh(this.components)), t;
    },
    set visitorId(r) {
      t = r;
    },
    confidence: n,
    components: e,
    version: nh
  };
}
function oI(e) {
  return e === void 0 && (e = 50), OO(e, e * 2);
}
function aI(e, t) {
  var n = v, r = Date[n(738)]();
  return {
    get: function(o) {
      return lt(this, void 0, void 0, function() {
        var a, i, s;
        return ut(this, function(l) {
          var c = Z;
          switch (l[c(979)]) {
            case 0:
              return a = Date[c(738)](), [4, e()];
            case 1:
              return i = l[c(607)](), s = rI(i), (t || o != null && o[c(406)]) && c(630)[c(1130)](s[c(799)], c(1253))[c(1130)](
                navigator[c(852)],
                `
timeBetweenLoadAndGet: `
              )[c(1130)](a - r, `
visitorId: `).concat(s[c(929)], `
components: `)[c(1130)](nI(i), c(619)), [2, s];
          }
        });
      });
    }
  };
}
function iI() {
  var e = v;
  if (!(window.__fpjs_d_m || Math[e(360)]() >= 1e-3))
    try {
      var t = new XMLHttpRequest();
      t[e(319)](
        e(873),
        "https://m1.openfpcdn.io/fingerprintjs/v"[e(1130)](nh, e(435)),
        !0
      ), t[e(1183)]();
    } catch (n) {
      console[e(446)](n);
    }
}
function sI(e) {
  var t = v, n = {}, r = n[t(727)], o = n[t(406)], a = n[t(410)], i = a === void 0 ? !0 : a;
  return lt(this, void 0, void 0, function() {
    var s;
    return ut(this, function(l) {
      var c = Z;
      switch (l[c(979)]) {
        case 0:
          return i && iI(), [4, oI(r)];
        case 1:
          return l[c(607)](), s = XN({ debug: o }), [2, aI(s, o)];
      }
    });
  });
}
var lI = v(855), q = {
  Awesomium: v(366),
  Cef: v(1024),
  CefSharp: "cefsharp",
  CoachJS: v(359),
  Electron: v(681),
  FMiner: "fminer",
  Geb: "geb",
  NightmareJS: v(624),
  Phantomas: v(352),
  PhantomJS: v(365),
  Rhino: "rhino",
  Selenium: v(314),
  Sequentum: v(1022),
  SlimerJS: v(834),
  WebDriverIO: "webdriverio",
  WebDriver: v(603),
  HeadlessChrome: "headless_chrome",
  Unknown: "unknown"
}, he = function(e) {
  TO(t, e);
  function t(n, r) {
    var o = Z, a = e.call(this, r) || this;
    return a[o(1054)] = n, a.name = o(1083), Object[o(373)](a, t.prototype), a;
  }
  return t;
}(Error);
function uI(e, t) {
  var n = v, r = {}, o = { bot: !1 };
  for (var a in t) {
    var i = t[a], s = i(e), l = { bot: !1 };
    typeof s === n(391) ? l = { bot: !0, botKind: s } : s && (l = { bot: !0, botKind: q[n(474)] }), r[a] = l, l[n(715)] && (o = l);
  }
  return [r, o];
}
function cI(e) {
  return lt(this, void 0, void 0, function() {
    var t, n, r = this;
    return ut(this, function(o) {
      var a = Z;
      switch (o.label) {
        case 0:
          return t = {}, n = Object[a(331)](e), [
            4,
            Promise[a(930)](
              n[a(335)](function(i) {
                return lt(r, void 0, void 0, function() {
                  var s, l, c, d, f;
                  return ut(this, function(p) {
                    var g = Z;
                    switch (p.label) {
                      case 0:
                        s = e[i], p[g(979)] = 1;
                      case 1:
                        return p.trys[g(638)]([1, 3, , 4]), l = t, c = i, f = {}, [4, s()];
                      case 2:
                        return l[c] = (f.value = p[g(607)](), f[g(1054)] = 0, f), [3, 4];
                      case 3:
                        return d = p[g(607)](), d instanceof he ? t[i] = {
                          state: d[g(1054)],
                          error: ""[g(1130)](d[g(516)], ": ")[g(1130)](d[g(555)])
                        } : t[i] = {
                          state: -3,
                          error: d instanceof Error ? ""[g(1130)](
                            d[g(516)],
                            ": "
                          )[g(1130)](d.message) : String(d)
                        }, [3, 4];
                      case 4:
                        return [2];
                    }
                  });
                });
              })
            )
          ];
        case 1:
          return o.sent(), [2, t];
      }
    });
  });
}
function dI(e) {
  var t = v, n = e[t(1036)];
  if (n[t(1054)] !== 0) return !1;
  if (/headless/i[t(913)](n.value)) return q.HeadlessChrome;
  if (/electron/i[t(913)](n.value)) return q[t(396)];
  if (/slimerjs/i[t(913)](n.value)) return q[t(537)];
}
function Si(e, t) {
  var n = v;
  return e[n(1242)](t) !== -1;
}
function hn(e, t) {
  return e.indexOf(t) !== -1;
}
function fI(e, t) {
  var n = v;
  if (n(674) in e) return e[n(674)](t);
  for (var r = 0; r < e[n(343)]; r++)
    if (t(e[r], r, e)) return e[r];
}
function Ff(e) {
  var t = v;
  return Object[t(719)](e);
}
function vu(e) {
  for (var t = v, n = [], r = 1; r < arguments[t(343)]; r++)
    n[r - 1] = arguments[r];
  for (var o = function(c) {
    var d = t;
    if (typeof c === d(391)) {
      if (Si(e, c)) return { value: !0 };
    } else {
      var f = fI(e, function(p) {
        var g = d;
        return c[g(913)](p);
      });
      if (f != null) return { value: !0 };
    }
  }, a = 0, i = n; a < i[t(343)]; a++) {
    var s = i[a], l = o(s);
    if (typeof l === t(668)) return l[t(1223)];
  }
  return !1;
}
function Wo(e) {
  var t = v;
  return e[t(541)](function(n, r) {
    return n + (r ? 1 : 0);
  }, 0);
}
function pI(e) {
  var t = v, n = e[t(939)];
  if (n[t(1054)] !== 0) return !1;
  if (vu(n[t(1223)], t(314), t(603), t(492)))
    return q[t(1202)];
}
function hI(e) {
  var t = v, n = e.errorTrace;
  if (n[t(1054)] !== 0) return !1;
  if (/PhantomJS/i[t(913)](n[t(1223)])) return q[t(1065)];
}
function mI(e) {
  var t = v, n = e[t(1076)], r = e.browserKind, o = e.browserEngineKind;
  if (!(n[t(1054)] !== 0 || r.state !== 0 || o[t(1054)] !== 0)) {
    var a = n[t(1223)];
    return o[t(1223)] === "unknown" ? !1 : a === 37 && !Si([t(1230), "gecko"], o.value) || a === 39 && !Si([t(1134)], r.value) || a === 33 && !Si([t(449)], o[t(1223)]);
  }
}
function xI(e) {
  var t = v, n = e.functionBind;
  if (n[t(1054)] === -2) return q[t(1065)];
}
function gI(e) {
  var t = v, n = e[t(1078)];
  if (n.state === 0 && n[t(1223)][t(343)] === 0)
    return q[t(543)];
}
function vI(e) {
  var t = v, n = e[t(1128)];
  if (n[t(1054)] === 0 && !n[t(1223)]) return q[t(474)];
}
function yI(e) {
  var t = v, n = e.notificationPermissions, r = e.browserKind;
  if (r[t(1054)] !== 0 || r.value !== t(843)) return !1;
  if (n.state === 0 && n[t(1223)]) return q.HeadlessChrome;
}
function wI(e) {
  var t = v, n = e[t(1085)];
  if (n.state === 0 && !n[t(1223)]) return q[t(543)];
}
function bI(e) {
  var t = v, n = e[t(733)], r = e[t(1274)], o = e.browserKind, a = e.browserEngineKind;
  if (!(n[t(1054)] !== 0 || r[t(1054)] !== 0 || o[t(1054)] !== 0 || a[t(1054)] !== 0) && !(o.value !== "chrome" || r.value || a[t(1223)] !== "chromium") && n[t(1223)] === 0)
    return q[t(543)];
}
function _I(e) {
  var t = v, n, r = e.process;
  if (r[t(1054)] !== 0) return !1;
  if (r[t(1223)].type === t(1232) || ((n = r.value[t(689)]) === null || n === void 0 ? void 0 : n.electron) != null)
    return q[t(396)];
}
function SI(e) {
  var t = v, n = e.productSub, r = e[t(1104)];
  if (n[t(1054)] !== 0 || r.state !== 0) return !1;
  if ((r[t(1223)] === t(843) || r[t(1223)] === "safari" || r[t(1223)] === t(763) || r.value === "wechat") && n[t(1223)] !== "20030107")
    return q[t(474)];
}
function kI(e) {
  var t = v, n = e.userAgent;
  if (n[t(1054)] !== 0) return !1;
  if (/PhantomJS/i[t(913)](n[t(1223)])) return q[t(1065)];
  if (/Headless/i[t(913)](n[t(1223)])) return q[t(543)];
  if (/Electron/i[t(913)](n[t(1223)])) return q.Electron;
  if (/slimerjs/i[t(913)](n.value)) return q[t(537)];
}
function EI(e) {
  var t = v, n = e[t(618)];
  if (n[t(1054)] === 0 && n[t(1223)]) return q[t(543)];
}
function CI(e) {
  var t = v, n = e[t(990)];
  if (n[t(1054)] === 0) {
    var r = n.value, o = r.vendor, a = r[t(1232)];
    if (o == t(634) && a == t(478)) return q.HeadlessChrome;
  }
}
function TI(e) {
  var t = v, n = e.windowExternal;
  if (n[t(1054)] !== 0) return !1;
  if (/Sequentum/i[t(913)](n[t(1223)])) return q.Sequentum;
}
function OI(e) {
  var t = v, n = e.windowSize, r = e.documentFocus;
  if (n[t(1054)] !== 0 || r[t(1054)] !== 0) return !1;
  var o = n[t(1223)], a = o.outerWidth, i = o[t(862)];
  if (r[t(1223)] && a === 0 && i === 0)
    return q.HeadlessChrome;
}
function NI(e) {
  var t = v, n = e.distinctiveProps;
  if (n.state !== 0) return !1;
  var r = n[t(1223)], o;
  for (o in r) if (r[o]) return o;
}
var II = {
  detectAppVersion: dI,
  detectDocumentAttributes: pI,
  detectErrorTrace: hI,
  detectEvalLengthInconsistency: mI,
  detectFunctionBind: xI,
  detectLanguagesLengthInconsistency: gI,
  detectNotificationPermissions: yI,
  detectPluginsArray: wI,
  detectPluginsLengthInconsistency: bI,
  detectProcess: _I,
  detectUserAgent: kI,
  detectWebDriver: EI,
  detectWebGL: CI,
  detectWindowExternal: TI,
  detectWindowSize: OI,
  detectMimeTypesConsistent: vI,
  detectProductSub: SI,
  detectDistinctiveProperties: NI
};
function LI() {
  var e = v, t = navigator[e(1036)];
  if (t == null) throw new he(-1, "navigator.appVersion is undefined");
  return t;
}
function AI() {
  var e = v;
  if (document[e(1243)] === void 0) throw new he(-1, e(534));
  var t = document.documentElement;
  if (typeof t[e(1184)] !== e(425)) throw new he(-2, e(780));
  return t[e(1184)]();
}
function RI() {
  var e = v;
  try {
    null[0]();
  } catch (t) {
    if (t instanceof Error && t[e(742)] != null)
      return t[e(742)][e(961)]();
  }
  throw new he(-3, "errorTrace signal unexpected behaviour");
}
function PI() {
  var e = v;
  return eval[e(961)]().length;
}
function DI() {
  var e = v;
  if (Function[e(886)].bind === void 0) throw new he(-2, e(721));
  return Function.prototype.bind[e(961)]();
}
function Pc() {
  var e = v, t, n, r = window, o = navigator;
  return Wo([
    e(592) in o,
    e(1124) in o,
    o[e(1033)][e(1242)](e(571)) === 0,
    e(521) in r,
    e(1e3) in r,
    e(611) in r,
    e(1051) in r
  ]) >= 5 ? e(449) : Wo([
    "ApplePayError" in r,
    e(1192) in r,
    e(361) in r,
    o[e(1033)][e(1242)](e(817)) === 0,
    "getStorageUpdates" in o,
    e(960) in r
  ]) >= 4 ? e(1230) : Wo([
    e(466) in navigator,
    "MozAppearance" in ((n = (t = document[e(1243)]) === null || t === void 0 ? void 0 : t.style) !== null && n !== void 0 ? n : {}),
    e(1211) in r,
    e(459) in r,
    e(698) in r,
    e(950) in r
  ]) >= 4 ? "gecko" : e(932);
}
function $I() {
  var e = v, t, n = (t = navigator[e(852)]) === null || t === void 0 ? void 0 : t[e(451)]();
  return hn(n, e(642)) ? e(597) : hn(n, e(317)) || hn(n, e(535)) ? e(1134) : hn(n, "wechat") ? e(1129) : hn(n, e(554)) ? "firefox" : hn(n, e(763)) || hn(n, e(491)) ? e(763) : hn(n, e(843)) ? e(843) : hn(n, "safari") ? e(774) : e(932);
}
function MI() {
  var e = v, t = Pc(), n = t === "chromium", r = t === e(658);
  if (!n && !r) return !1;
  var o = window;
  return Wo([
    "onorientationchange" in o,
    "orientation" in o,
    n && !(e(488) in o),
    r && /android/i[e(913)](navigator[e(1036)])
  ]) >= 2;
}
function jI() {
  var e = v;
  return document[e(667)] === void 0 ? !1 : document[e(667)]();
}
function FI() {
  var e = v, t = window;
  return Wo([
    !("MediaSettingsRange" in t),
    "RTCEncodedAudioFrame" in t,
    "" + t[e(1191)] === e(1088),
    "" + t[e(1141)] == "[object Reflect]"
  ]) >= 3;
}
function HI() {
  var e = v, t = navigator, n = [], r = t[e(996)] || t[e(696)] || t[e(1013)] || t.systemLanguage;
  if (r !== void 0 && n[e(638)]([r]), Array[e(590)](t[e(1078)])) {
    var o = Pc();
    !(o === e(449) && FI()) && n[e(638)](t[e(1078)]);
  } else if (typeof t[e(1078)] == "string") {
    var a = t[e(1078)];
    a && n.push(a[e(447)](","));
  }
  return n;
}
function UI() {
  var e = v;
  if (navigator[e(829)] === void 0) throw new he(-1, e(1084));
  for (var t = navigator[e(829)], n = Object[e(1032)](t) === MimeTypeArray.prototype, r = 0; r < t.length; r++)
    n && (n = Object.getPrototypeOf(t[r]) === MimeType.prototype);
  return n;
}
function VI() {
  return lt(this, void 0, void 0, function() {
    var e, t;
    return ut(this, function(n) {
      var r = Z;
      switch (n.label) {
        case 0:
          if (window[r(821)] === void 0) throw new he(-1, r(324));
          if (navigator[r(416)] === void 0)
            throw new he(-1, "navigator.permissions is undefined");
          if (e = navigator[r(416)], typeof e[r(1159)] !== r(425))
            throw new he(-2, "navigator.permissions.query is not a function");
          n[r(979)] = 1;
        case 1:
          return n[r(816)][r(638)]([1, 3, , 4]), [4, e.query({ name: r(1217) })];
        case 2:
          return t = n.sent(), [
            2,
            window[r(821)][r(1066)] === r(802) && t[r(1054)] === "prompt"
          ];
        case 3:
          throw n[r(607)](), new he(-3, r(476));
        case 4:
          return [2];
      }
    });
  });
}
function zI() {
  var e = v;
  if (navigator[e(1092)] === void 0) throw new he(-1, e(574));
  if (window[e(1080)] === void 0) throw new he(-1, e(591));
  return navigator[e(1092)] instanceof PluginArray;
}
function BI() {
  var e = v;
  if (navigator[e(1092)] === void 0) throw new he(-1, e(574));
  if (navigator[e(1092)][e(343)] === void 0)
    throw new he(-3, "navigator.plugins.length is undefined");
  return navigator.plugins[e(343)];
}
function WI() {
  var e = v, t = window[e(1195)], n = "window.process is";
  if (t === void 0) throw new he(-1, "".concat(n, e(910)));
  if (t && typeof t !== e(668))
    throw new he(-3, ""[e(1130)](n, e(527)));
  return t;
}
function GI() {
  var e = v, t = navigator[e(1006)];
  if (t === void 0) throw new he(-1, e(1135));
  return t;
}
function ZI() {
  var e = v;
  if (navigator[e(1017)] === void 0) throw new he(-1, "navigator.connection is undefined");
  if (navigator[e(1017)][e(1005)] === void 0) throw new he(-1, e(525));
  return navigator[e(1017)].rtt;
}
function YI() {
  var e = v;
  return navigator[e(852)];
}
function KI() {
  var e = v;
  if (navigator[e(603)] == null) throw new he(-1, e(888));
  return navigator[e(603)];
}
function XI() {
  var e = v, t = document[e(631)](e(1277));
  if (typeof t[e(400)] != "function") throw new he(-2, e(884));
  var n = t[e(400)](e(1008));
  if (n === null) throw new he(-4, "WebGLRenderingContext is null");
  if (typeof n[e(412)] !== e(425)) throw new he(-2, e(422));
  var r = n[e(412)](n.VENDOR), o = n[e(412)](n[e(342)]);
  return { vendor: r, renderer: o };
}
function JI() {
  var e = v;
  if (window[e(490)] === void 0) throw new he(-1, e(329));
  var t = window[e(490)];
  if (typeof t[e(961)] !== e(425)) throw new he(-2, e(355));
  return t[e(961)]();
}
function QI() {
  var e = v;
  return {
    outerWidth: window[e(968)],
    outerHeight: window[e(862)],
    innerWidth: window.innerWidth,
    innerHeight: window[e(1271)]
  };
}
function qI() {
  var e = v, t, n = (t = {}, t[q[e(1113)]] = { window: ["awesomium"] }, t[q[e(805)]] = { window: [e(323)] }, t[q[e(558)]] = { window: ["CefSharp"] }, t[q[e(778)]] = { window: ["emit"] }, t[q[e(421)]] = { window: [e(330)] }, t[q.Geb] = { window: [e(900)] }, t[q[e(1049)]] = { window: [e(992), e(677)] }, t[q[e(1268)]] = { window: [e(850)] }, t[q.PhantomJS] = { window: ["callPhantom", e(380)] }, t[q[e(954)]] = { window: [e(1031)] }, t[q.Selenium] = {
    window: [e(1175), "_selenium", e(675), /^([a-z]){3}_.*_(Array|Promise|Symbol)$/],
    document: [e(750), e(1225), e(918)]
  }, t[q[e(1109)]] = { window: [e(340)] }, t[q[e(958)]] = {
    window: [
      e(603),
      e(564),
      e(608),
      e(1098),
      e(794),
      e(765),
      e(1029)
    ],
    document: [
      e(436),
      e(809),
      e(382),
      e(582),
      "__driver_unwrapped",
      e(616),
      "__fxdriver_unwrapped",
      "__webdriver_script_fn",
      e(975),
      e(565),
      e(480),
      e(682),
      e(643),
      e(988)
    ]
  }, t[q.HeadlessChrome] = { window: [e(481), e(549)] }, t), r, o = {}, a = Ff(window), i = [];
  window.document !== void 0 && (i = Ff(window[e(601)]));
  for (r in n) {
    var s = n[r];
    if (s !== void 0) {
      var l = s[e(859)] === void 0 ? !1 : vu[e(1241)](
        void 0,
        Ji([a], s[e(859)], !1)
      ), c = s[e(601)] === void 0 || !i.length ? !1 : vu[e(1241)](
        void 0,
        Ji([i], s[e(601)], !1)
      );
      o[r] = l || c;
    }
  }
  return o;
}
var e5 = {
  android: MI,
  browserKind: $I,
  browserEngineKind: Pc,
  documentFocus: jI,
  userAgent: YI,
  appVersion: LI,
  rtt: ZI,
  windowSize: QI,
  pluginsLength: BI,
  pluginsArray: zI,
  errorTrace: RI,
  productSub: GI,
  windowExternal: JI,
  mimeTypesConsistent: UI,
  evalLength: PI,
  webGL: XI,
  webDriver: KI,
  languages: HI,
  notificationPermissions: VI,
  documentElementKeys: AI,
  functionBind: DI,
  process: WI,
  distinctiveProps: qI
}, t5 = function() {
  var e = v;
  function t() {
    var n = Z;
    this[n(368)] = void 0, this[n(957)] = void 0;
  }
  return t[e(886)][e(911)] = function() {
    return this.components;
  }, t[e(886)][e(653)] = function() {
    return this.detections;
  }, t[e(886)][e(1171)] = function() {
    var n = e;
    if (this[n(368)] === void 0)
      throw new Error("BotDetector.detect can't be called before BotDetector.collect");
    var r = uI(this[n(368)], II), o = r[0], a = r[1];
    return this[n(957)] = o, a;
  }, t[e(886)][e(437)] = function() {
    return lt(this, void 0, void 0, function() {
      var n;
      return ut(this, function(r) {
        var o = Z;
        switch (r[o(979)]) {
          case 0:
            return n = this, [4, cI(e5)];
          case 1:
            return n.components = r[o(607)](), [2, this[o(368)]];
        }
      });
    });
  }, t;
}();
function n5() {
  var e = v;
  if (!(window.__fpjs_d_m || Math[e(360)]() >= 1e-3))
    try {
      var t = new XMLHttpRequest();
      t.open(e(873), e(578)[e(1130)](lI, e(435)), !0), t.send();
    } catch (n) {
      console.error(n);
    }
}
function r5(e) {
  var t = v, n = {}, r = n[t(410)], o = r === void 0 ? !0 : r;
  return lt(this, void 0, void 0, function() {
    var a;
    return ut(this, function(i) {
      var s = Z;
      switch (i[s(979)]) {
        case 0:
          return o && n5(), a = new t5(), [4, a.collect()];
        case 1:
          return i[s(607)](), [2, a];
      }
    });
  });
}
const uh = !self[v(601)] && self[v(1161)];
function o5() {
  var e = v;
  const t = [][e(318)];
  try {
    (-1)[e(505)](-1);
  } catch (n) {
    return n[e(555)][e(343)] + (t + "")[e(447)](t.name)[e(536)]("")[e(343)];
  }
}
const a5 = o5(), i5 = {
  80: { name: "V8", isBlink: !0, isGecko: !1, isWebkit: !1 },
  58: { name: v(552), isBlink: !1, isGecko: !0, isWebkit: !1 },
  77: { name: v(902), isBlink: !1, isGecko: !1, isWebkit: !0 }
}, Dc = i5[a5] || { name: null, isBlink: !1, isGecko: !1, isWebkit: !1 }, Ge = Dc.isBlink, qi = Dc.isGecko, s5 = Dc[v(526)];
function l5() {
  var e = v;
  return e(797) in navigator && Object[e(1032)](navigator[e(797)])[e(318)].name == "Brave" && navigator[e(797)][e(978)][e(961)]() == e(589);
}
function u5() {
  var e = v;
  const t = { unknown: !1, allow: !1, standard: !1, strict: !1 };
  try {
    if ((() => {
      var i = Z;
      try {
        window[i(1027)] = OfflineAudioContext || webkitOfflineAudioContext;
      } catch (f) {
      }
      if (!window[i(1027)]) return !1;
      const s = new OfflineAudioContext(1, 1, 44100), l = s[i(1016)](), c = new Float32Array(l[i(493)]);
      return l[i(431)](c), new Set(c).size > 1;
    })()) return t.strict = !0, t;
    const r = /(Chrom(e|ium)|Microsoft Edge) PDF (Plugin|Viewer)/, o = [...navigator.plugins], a = o[e(788)]((i) => r.test(i.name))[e(343)] == 2;
    return o.length && !a ? (t[e(397)] = !0, t) : (t[e(1072)] = !0, t);
  } catch {
    return t[e(932)] = !0, t;
  }
}
const c5 = () => {
  const e = {};
  let t = 0;
  return {
    logTestResult: ({ test: n, passed: r, time: o = 0 }) => {
      t += o;
      const a = o.toFixed(2) + "ms";
      e[n] = a;
    },
    getLog: () => e,
    getTotal: () => t
  };
}, d5 = c5(), { logTestResult: es } = d5, ch = () => {
  let e = 0;
  const t = [];
  return {
    stop: () => {
      var n = Z;
      return e && (t.push(performance[n(738)]() - e), t[n(541)]((r, o) => r += o, 0));
    },
    start: () => {
      var n = Z;
      return e = performance[n(738)](), e;
    }
  };
}, yu = (e, t = 0) => {
  var n = v;
  return e[n(1142)](), new Promise((r) => setTimeout(() => r(e[n(1170)]()), t)).catch(
    (r) => {
      var o = n;
      console[o(446)](r);
    }
  );
};
try {
  speechSynthesis.getVoices();
} catch (e) {
  console[v(446)](e);
}
function f5() {
  const e = {};
  return {
    getRecords: () => e,
    documentLie: (t, n) => {
      const r = n instanceof Array;
      return e[t] ? r ? e[t] = [...e[t], ...n] : e[t].push(n) : r ? e[t] = n : e[t] = [n];
    }
  };
}
const p5 = f5(), { documentLie: ti } = p5, dh = v(337), $c = () => String[v(1187)](Math[v(360)]() * 26 + 97) + Math[v(360)]()[v(961)](36)[v(1269)](-7);
function h5(e) {
  var t = v;
  try {
    if (!Ge) return e;
    const n = e.document[t(631)](t(669));
    n[t(962)]("id", $c()), n.setAttribute("style", dh), n[t(1167)] = "<div><iframe></iframe></div>", e.document[t(768)].appendChild(n);
    const r = [...[...n[t(1273)]][0].childNodes][0];
    if (!r) return null;
    const { contentWindow: o } = r || {};
    if (!o) return null;
    const a = o[t(601)].createElement(t(669));
    return a.innerHTML = t(963), o[t(601)].body[t(866)](a), [...[...a[t(1273)]][0][t(1273)]][0][t(383)];
  } catch {
    return console[t(446)](t(999)), e;
  }
}
$c();
const No = "Reflect" in self;
function m5(e) {
  var t = v;
  return e[t(318)][t(516)] == t(548);
}
function Re({ spawnErr: e, withStack: t, final: n }) {
  try {
    throw e(), Error();
  } catch (r) {
    return m5(r) ? t ? t(r) : !1 : !0;
  } finally {
    n && n();
  }
}
function x5(e) {
  try {
    return e(), !1;
  } catch {
    return !0;
  }
}
function Hf(e) {
  var t = v;
  return {
    [t(1239) + e + t(1063)]: !0,
    [t(920) + e + t(1063)]: !0,
    [t(441)]: !0,
    ["function " + e + t(338) + `
    [native code]
}`]: !0,
    [t(920) + e + `() {
` + t(369) + `
}`]: !0,
    "function () {\n    [native code]\n}": !0
  };
}
function Dr(e, t, n = 1) {
  var r = v;
  return n === 0 ? t.test(e[r(555)]) : t[r(913)](e[r(742)][r(447)](`
`)[n]);
}
const g5 = /at Function\.toString /, v5 = /at Object\.toString/, y5 = /at (Function\.)?\[Symbol.hasInstance\]/, w5 = /at (Proxy\.)?\[Symbol.hasInstance\]/, Uf = /strict mode/;
function Vf({
  scope: e,
  apiFunction: t,
  proto: n,
  obj: r,
  lieProps: o
}) {
  var a = v;
  if (typeof t != a(425)) return { lied: 0, lieTypes: [] };
  const i = t.name[a(452)](/get\s/, ""), s = r == null ? void 0 : r[a(516)], l = Object.getPrototypeOf(t);
  let c = {
    [a(1011)]: !!r && Re({ spawnErr: () => r[a(886)][i] }),
    [a(711)]: !!r && /^(screen|navigator)$/i[a(913)](s) && !!(Object.getOwnPropertyDescriptor(self[s.toLowerCase()], i) || No && Reflect.getOwnPropertyDescriptor(self[s[a(451)]()], i)),
    [a(881)]: Re({
      spawnErr: () => {
        var p = a;
        new t(), t[p(583)](n);
      }
    }),
    "failed apply interface error": Re({
      spawnErr: () => {
        new t(), t.apply(n);
      }
    }),
    [a(467)]: Re({ spawnErr: () => new t() }),
    [a(1205)]: !s5 && Re({ spawnErr: () => {
    } }),
    "failed null conversion error": Re({
      spawnErr: () => Object[a(373)](t, null)[a(961)](),
      final: () => Object[a(373)](t, l)
    }),
    [a(767)]: !Hf(i)[e[a(1071)].prototype[a(961)][a(583)](t)] || !Hf("toString")[e[a(1071)][a(886)][a(961)][a(583)](
      t[a(961)]
    )],
    [a(544)]: a(886) in t,
    [a(1224)]: !!(Object.getOwnPropertyDescriptor(t, a(885)) || Reflect.getOwnPropertyDescriptor(t, a(885)) || Object.getOwnPropertyDescriptor(t, a(822)) || Reflect.getOwnPropertyDescriptor(t, a(822)) || Object[a(897)](t, a(886)) || Reflect[a(897)](t, a(886)) || Object.getOwnPropertyDescriptor(t, a(961)) || Reflect.getOwnPropertyDescriptor(t, a(961))),
    [a(1107)]: !!(t[a(509)]("arguments") || t[a(509)](a(822)) || t[a(509)]("prototype") || t[a(509)]("toString")),
    [a(1147)]: Object[a(331)](Object.getOwnPropertyDescriptors(t))[a(407)]()[a(961)]() != "length,name",
    "failed own property names": Object[a(719)](t)[a(407)]()[a(961)]() != a(354),
    [a(891)]: No && Reflect[a(483)](t).sort()[a(961)]() != a(354),
    [a(498)]: Re({
      spawnErr: () => Object[a(851)](t).toString(),
      withStack: (p) => Ge && !Dr(p, g5)
    }) || Re({
      spawnErr: () => Object[a(851)](new Proxy(t, {}))[a(961)](),
      withStack: (p) => Ge && !Dr(p, v5)
    }),
    [a(870)]: Re({
      spawnErr: () => {
      },
      withStack: (p) => qi && !Dr(p, Uf, 0)
    }),
    "failed at toString incompatible proxy error": Re({
      spawnErr: () => {
      },
      withStack: (p) => qi && !Dr(p, Uf, 0)
    }),
    [a(1118)]: Re({
      spawnErr: () => {
        var p = a;
        Object[p(373)](t, Object[p(851)](t))[p(961)]();
      },
      final: () => Object[a(373)](t, l)
    })
  };
  if (i == a(961) || !!o[a(460)] || !!o[a(953)]) {
    const p = new Proxy(t, {}), g = new Proxy(t, {}), y = new Proxy(t, {});
    c = {
      ...c,
      [a(728)]: !Re({
        spawnErr: () => {
          t.__proto__ = proxy;
        },
        final: () => Object[a(373)](t, l)
      }),
      [a(945)]: !Re({
        spawnErr: () => {
          var m = a;
          Object[m(373)](p, Object[m(851)](p))[m(961)]();
        },
        final: () => Object[a(373)](p, l)
      }),
      [a(375)]: !Re({
        spawnErr: () => {
          var m = a;
          g[m(784)] = g;
        },
        final: () => Object[a(373)](g, l)
      }),
      "failed at reflect set proto": No && Re({
        spawnErr: () => {
          var m = a;
          throw Reflect[m(373)](t, Object[m(851)](t)), new TypeError();
        },
        final: () => Object[a(373)](t, l)
      }),
      [a(1070)]: No && !Re({
        spawnErr: () => {
          var m = a;
          Reflect[m(373)](y, Object.create(y));
        },
        final: () => Object[a(373)](y, l)
      }),
      [a(479)]: Ge && (Re({
        spawnErr: () => {
        },
        withStack: (m) => !Dr(m, y5)
      }) || Re({
        spawnErr: () => {
          new Proxy(t, {});
        },
        withStack: (m) => !Dr(m, w5)
      })),
      [a(442)]: Ge && No && x5(() => {
        var m = a;
        Object[m(1079)](t, "", { configurable: !0 }).toString(), Reflect[m(529)](t, "");
      })
    };
  }
  const f = Object.keys(c)[a(788)]((p) => !!c[p]);
  return { lied: f[a(343)], lieTypes: f };
}
function b5(e) {
  const t = (o) => typeof o < "u" && !!o, n = {}, r = [];
  return {
    getProps: () => n,
    getPropsSearched: () => r,
    searchLies: (o, a) => {
      var i = Z;
      const { target: s, ignore: l } = a || {};
      let c;
      try {
        if (c = o(), !t(c)) return;
      } catch {
        return;
      }
      const d = c[i(886)] ? c.prototype : c;
      [.../* @__PURE__ */ new Set([...Object[i(719)](d), ...Object.keys(d)])][i(407)]()[i(550)]((f) => {
        var b;
        var p = i;
        if (f == p(318) || s && !new Set(s)[p(685)](f) || l && new Set(l).has(f)) return;
        const y = /\s(.+)\]/, m = (c[p(516)] ? c[p(516)] : y[p(913)](c) ? (b = y[p(683)](c)) == null ? void 0 : b[1] : void 0) + "." + f;
        r[p(638)](m);
        try {
          const u = c[p(886)] ? c[p(886)] : c;
          let h;
          try {
            if (typeof u[f] == p(425))
              return h = Vf({
                scope: e,
                apiFunction: u[f],
                proto: u,
                obj: null,
                lieProps: n
              }), h.lied ? (ti(m, h.lieTypes), n[m] = h.lieTypes) : void 0;
            if (f != "name" && f != p(343) && f[0] !== f[0][p(847)]()) {
              const S = [p(883)];
              return ti(m, S), n[m] = S;
            }
          } catch {
          }
          const x = Object[p(897)](u, f)[p(873)];
          return h = Vf({
            scope: e,
            apiFunction: x,
            proto: u,
            obj: c,
            lieProps: n
          }), h[p(507)] ? (ti(m, h[p(936)]), n[m] = h[p(936)]) : void 0;
        } catch {
          const h = p(1053);
          return ti(m, h), n[m] = [h];
        }
      });
    }
  };
}
function _5() {
  var e = v;
  if (uh) return { iframeWindow: self };
  try {
    const t = self[e(343)], n = new DocumentFragment(), r = document[e(631)](e(669)), o = $c();
    r.setAttribute("id", o), n.appendChild(r), r.innerHTML = '<div style="' + dh + e(1256), document.body[e(866)](n);
    const a = self[t];
    return { iframeWindow: h5(a) || self, div: r };
  } catch {
    return console[e(446)]("client blocked phantom iframe"), { iframeWindow: self };
  }
}
const { iframeWindow: S5, div: Cl } = _5() || {};
function k5(e) {
  var t = v;
  const n = b5(e), { searchLies: r } = n;
  r(() => Function, { target: [t(961)], ignore: [t(822), t(885)] }), r(() => AnalyserNode), r(() => AudioBuffer, { target: [t(1086), "getChannelData"] }), r(() => BiquadFilterNode, { target: [t(443)] }), r(() => CanvasRenderingContext2D, {
    target: [
      t(856),
      t(775),
      "isPointInPath",
      "isPointInStroke",
      t(903),
      t(1062),
      t(429),
      t(533),
      t(423)
    ]
  }), r(() => CSSStyleDeclaration, { target: [t(482)] }), r(() => CSS2Properties, { target: [t(482)] }), r(() => Date, {
    target: [
      t(777),
      "getDay",
      "getFullYear",
      t(925),
      "getMinutes",
      t(663),
      t(1030),
      t(408),
      t(785),
      t(378),
      "setHours",
      t(1042),
      "setMonth",
      t(1216),
      t(1090),
      t(532),
      t(744),
      t(1258),
      t(438),
      t(464),
      t(961),
      t(1204),
      "valueOf"
    ]
  }), r(() => GPU, { target: [t(899)] }), r(() => GPUAdapter, { target: [t(1250)] }), r(() => Intl.DateTimeFormat, {
    target: [t(1068), t(652), t(1145), t(586)]
  }), r(() => Document, {
    target: [
      t(631),
      t(718),
      t(956),
      t(806),
      t(1163),
      t(1231),
      t(1018),
      t(944),
      t(773),
      "writeln"
    ],
    ignore: [t(588), t(830), t(1203)]
  }), r(() => DOMRect), r(() => DOMRectReadOnly), r(() => Element, {
    target: [
      t(909),
      t(866),
      t(754),
      "getClientRects",
      t(879),
      t(1095),
      t(1143),
      t(923),
      "prepend",
      "replaceChild",
      t(510),
      t(962)
    ]
  }), r(() => FontFace, { target: [t(854), t(877), "status"] }), r(() => HTMLCanvasElement), r(() => HTMLElement, {
    target: [
      t(405),
      "clientWidth",
      t(424),
      "offsetWidth",
      t(1034),
      t(645)
    ],
    ignore: ["onmouseenter", "onmouseleave"]
  }), r(() => HTMLIFrameElement, { target: ["contentDocument", t(383)] }), r(() => IntersectionObserverEntry, {
    target: ["boundingClientRect", "intersectionRect", t(320)]
  }), r(() => Math, {
    target: [
      t(898),
      t(772),
      "asinh",
      t(584),
      t(943),
      t(1227),
      t(463),
      t(1246),
      t(1028),
      t(998),
      "expm1",
      t(1002),
      t(472),
      t(629),
      t(1236),
      "sinh",
      t(448),
      t(786),
      t(904)
    ]
  }), r(() => MediaDevices, { target: [t(1248), t(500), t(1196)] }), r(() => Navigator, {
    target: [
      t(404),
      t(680),
      "appVersion",
      t(466),
      "connection",
      "deviceMemory",
      t(546),
      "getGamepads",
      t(972),
      t(935),
      t(996),
      t(1078),
      t(1103),
      t(829),
      t(889),
      "platform",
      "plugins",
      t(1003),
      t(1006),
      t(985),
      t(353),
      "storage",
      t(852),
      "vendor",
      "vendorSub",
      "webdriver",
      t(1001)
    ]
  }), r(() => Node, { target: [t(866), t(923), t(846)] }), r(() => OffscreenCanvas, { target: ["convertToBlob", "getContext"] }), r(() => OffscreenCanvasRenderingContext2D, {
    target: [
      t(856),
      t(775),
      "isPointInPath",
      t(385),
      "measureText",
      t(1062),
      t(423)
    ]
  }), r(() => Permissions, { target: [t(1159)] }), r(() => Range, { target: ["getBoundingClientRect", t(568)] }), r(() => Intl[t(614)], { target: [t(586)] }), r(() => Screen), r(() => speechSynthesis, { target: [t(587)] }), r(() => String, { target: [t(1261)] }), r(() => StorageManager, { target: ["estimate"] }), r(() => SVGRect), r(() => SVGRectElement, { target: [t(731)] }), r(() => SVGTextContentElement, {
    target: ["getExtentOfChar", t(813), "getComputedTextLength"]
  }), r(() => TextMetrics), r(() => WebGLRenderingContext, { target: [t(539), t(412), "readPixels"] }), r(() => WebGL2RenderingContext, { target: [t(539), "getParameter", "readPixels"] });
  const o = n.getProps(), a = n.getPropsSearched();
  return {
    lieDetector: n,
    lieList: Object[t(331)](o)[t(407)](),
    lieDetail: o,
    lieCount: Object[t(331)](o)[t(541)](
      (i, s) => i + o[s].length,
      0
    ),
    propsSearched: a
  };
}
const E5 = performance.now(), { lieDetector: C5, lieList: T5, lieDetail: O5, propsSearched: N5 } = k5(S5), I5 = (e) => e && e[v(788)](
  (t) => !/object toString|toString incompatible proxy/[v(913)](t)
).length;
let wu, re, zf = 0;
if (!uh) {
  wu = (() => {
    var n = v;
    const r = C5[n(983)]();
    return Object[n(331)](r)[n(541)]((o, a) => (o[a] = I5(r[a]), o), {});
  })(), re = JSON[v(626)](JSON.stringify(O5)), zf = +(performance[v(738)]() - E5)[v(505)](2);
  const t = N5.length + v(358) + zf + v(1181) + T5[v(343)] + " corrupted)";
  setTimeout(() => /* @__PURE__ */ console.log(t), 3e3);
}
const L5 = () => {
  const e = [];
  return {
    getErrors: () => e,
    captureError: (t, n = "") => {
      var r = Z;
      const o = {
        Error: !0,
        EvalError: !0,
        InternalError: !0,
        RangeError: !0,
        ReferenceError: !0,
        SyntaxError: !0,
        TypeError: !0,
        URIError: !0,
        InvalidStateError: !0,
        SecurityError: !0
      }, a = (d) => /.+(\s).+/[r(913)](d);
      console[r(446)](t);
      const { name: i, message: s } = t, l = a(s) ? n ? s + " [" + n + "]" : s : void 0, c = o[i] ? i : void 0;
      return e[r(638)]({ trustedName: c, trustedMessage: l }), void 0;
    }
  };
}, A5 = L5(), { captureError: fh } = A5;
var Ne = ((e) => {
  var t = v;
  return e[t(757)] = t(874), e[t(495)] = t(394), e[t(561)] = "Linux", e[t(563)] = "Android", e[t(356)] = t(1004), e;
})(Ne || {});
const R5 = [v(836), v(1233), "menu", v(1074), "small-caption", v(695)], Bf = {
  "-apple-system": Ne[v(495)],
  "Segoe UI": Ne[v(757)],
  Tahoma: Ne[v(757)],
  "Yu Gothic UI": Ne[v(757)],
  "Microsoft JhengHei UI": Ne[v(757)],
  "Microsoft YaHei UI": Ne[v(757)],
  "Meiryo UI": Ne[v(757)],
  Cantarell: Ne[v(561)],
  Ubuntu: Ne.LINUX,
  Sans: Ne[v(561)],
  "sans-serif": Ne[v(561)],
  "Fira Sans": Ne[v(561)],
  Roboto: Ne.ANDROID
};
function P5() {
  var e = v;
  const { body: t } = document, n = document[e(631)](e(669));
  t.appendChild(n);
  try {
    const r = String([
      ...R5[e(541)]((a, i) => {
        var s = e;
        return n[s(962)](s(1252), s(712) + i + s(551)), a[s(504)](getComputedStyle(n)[s(894)]);
      }, /* @__PURE__ */ new Set())
    ]), o = Bf[r];
    return Bf[r] ? r + ":" + o : r;
  } catch {
    return "";
  } finally {
    t.removeChild(n);
  }
}
const se = (e) => {
  var t = v;
  const n = "" + JSON[t(641)](e), r = n.split("").reduce((o, a, i) => {
    var s = t;
    return Math.imul(31, o) + n[s(655)](i) | 0;
  }, 2166136261);
  return (t(1229) + (r >>> 0)[t(961)](16))[t(751)](-8);
}, D5 = String[v(1187)](Math[v(360)]() * 26 + 97) + Math[v(360)]()[v(961)](36).slice(-7);
function $5() {
  var P;
  var e = v;
  if (!Ge) return [];
  const t = e(946) in HTMLVideoElement[e(886)], n = CSS.supports(e(651)), r = CSS.supports("appearance: initial"), o = e(333) in Intl, a = CSS[e(487)](e(1180)), i = CSS[e(487)]("border-end-end-radius: initial"), s = e(403) in Crypto[e(886)], l = e(938) in window, c = "downlinkMax" in (((P = window.NetworkInformation) == null ? void 0 : P[e(886)]) || {}), d = "ContentIndex" in window, f = e(810) in window, p = e(783) in window, g = "FileSystemWritableFileStream" in window, y = "HID" in window && e(976) in window, m = e(402) in window && "Serial" in window, b = e(488) in window, u = e(1182) in Window && "TouchEvent" in window, h = e(1198) in Navigator[e(886)], x = (O, j) => O ? [j] : [], w = {
    [Ne[e(563)]]: [
      ...x(a, l),
      ...x(r, d),
      ...x(t, f),
      c,
      ...x(s, !p),
      ...x(o, !g),
      ...x(i, !y),
      ...x(i, !m),
      !b,
      u,
      ...x(n, !h)
    ],
    [Ne[e(356)]]: [
      ...x(a, l),
      ...x(r, !d),
      ...x(t, !f),
      c,
      ...x(s, p),
      ...x(o, g),
      ...x(i, y),
      ...x(i, m),
      b,
      u || !u,
      ...x(n, !h)
    ],
    [Ne.WINDOWS]: [
      ...x(a, !l),
      ...x(r, !d),
      ...x(t, !f),
      !c,
      ...x(s, p),
      ...x(o, g),
      ...x(i, y),
      ...x(i, m),
      b,
      u || !u,
      ...x(n, h)
    ],
    [Ne[e(495)]]: [
      ...x(a, l),
      ...x(r, !d),
      ...x(t, !f),
      !c,
      ...x(s, p),
      ...x(o, g),
      ...x(i, y),
      ...x(i, m),
      b,
      !u,
      ...x(n, h)
    ],
    [Ne[e(561)]]: [
      ...x(a, !l),
      ...x(r, !d),
      ...x(t, !f),
      !c,
      ...x(s, p),
      ...x(o, g),
      ...x(i, y),
      ...x(i, m),
      b,
      !u || !u,
      ...x(n, !h)
    ]
  }, S = {
    noContentIndex: r && !d,
    noContactsManager: t && !f,
    noDownlinkMax: !c
  }, E = Object[e(331)](w)[e(541)]((O, j) => {
    var ne = e;
    const Ae = w[j], _ = +(Ae[ne(788)]((I) => I)[ne(343)] / Ae[ne(343)])[ne(505)](2);
    return O[j] = _, O;
  }, {}), k = Object[e(331)](E)[e(541)](
    (O, j) => E[O] > E[j] ? O : j
  ), L = E[k];
  return [E, L, S];
}
async function M5({ webgl: e, workerScope: t }) {
  var r;
  var n = v;
  try {
    const o = ch();
    await yu(o);
    const a = Object.keys({ ...navigator.mimeTypes }), i = P5(), [s, l, c] = $5(), d = {
      chromium: Ge,
      likeHeadless: {
        noChrome: Ge && !(n(843) in window),
        hasPermissionsBug: Ge && n(416) in navigator && await (async () => {
          var w = n;
          return (await navigator.permissions[w(1159)]({
            name: "notifications"
          }))[w(1054)] == w(868) && w(821) in window && Notification.permission === w(802);
        })(),
        noPlugins: Ge && navigator[n(1092)][n(343)] === 0,
        noMimeTypes: Ge && a[n(343)] === 0,
        notificationIsDenied: Ge && n(821) in window && Notification[n(1066)] == n(802),
        hasKnownBgColor: Ge && (() => {
          var w = n;
          let S = Cl;
          if (!Cl && (S = document[w(631)]("div"), document.body[w(866)](S)), !S) return !1;
          S[w(962)]("style", w(1041));
          const { backgroundColor: E } = getComputedStyle(S) || [];
          return !Cl && document[w(768)][w(691)](S), E === w(736);
        })(),
        prefersLightColor: matchMedia(n(716))[n(1259)],
        uaDataIsBlank: "userAgentData" in navigator && (((r = navigator.userAgentData) == null ? void 0 : r[n(841)]) === "" || await navigator[n(398)].getHighEntropyValues([n(841)]).platform === ""),
        pdfIsDisabled: n(916) in navigator && navigator.pdfViewerEnabled === !1,
        noTaskbar: screen.height === screen.availHeight && screen[n(347)] === screen[n(1105)],
        hasVvpScreenRes: innerWidth === screen[n(347)] && outerHeight === screen[n(515)] || n(849) in window && visualViewport[n(347)] === screen[n(347)] && visualViewport.height === screen[n(515)],
        hasSwiftShader: /SwiftShader/[n(913)](t == null ? void 0 : t[n(1194)]),
        noWebShare: Ge && CSS[n(487)]("accent-color: initial") && (!(n(1102) in navigator) || !(n(734) in navigator)),
        noContentIndex: !!(c != null && c.noContentIndex),
        noContactsManager: !!(c != null && c[n(348)]),
        noDownlinkMax: !!(c != null && c.noDownlinkMax)
      },
      headless: {
        webDriverIsOn: CSS[n(487)]("border-end-end-radius: initial") && navigator[n(603)] === void 0 || !!navigator[n(603)] || !!wu[n(926)],
        hasHeadlessUA: /HeadlessChrome/[n(913)](navigator[n(852)]) || /HeadlessChrome/[n(913)](navigator[n(1036)]),
        hasHeadlessWorkerUA: !!t && /HeadlessChrome/[n(913)](t.userAgent)
      },
      stealth: {
        hasIframeProxy: (() => {
          var w = n;
          try {
            const S = document[w(631)](w(462));
            return S.srcdoc = D5, !!S.contentWindow;
          } catch (S) {
            return console[w(446)](S), !0;
          }
        })(),
        hasHighChromeIndex: (() => {
          var w = n;
          const S = w(843), E = -50;
          return Object.keys(window).slice(E).includes(S) && Object[w(719)](window)[w(1269)](E)[w(673)](S);
        })(),
        hasBadChromeRuntime: (() => {
          var w = n;
          if (!("chrome" in window && w(867) in chrome)) return !1;
          try {
            return w(886) in chrome[w(867)][w(514)] || w(886) in chrome[w(867)].connect || (new chrome[w(867)].sendMessage(), new chrome[w(867)].connect()), !0;
          } catch (S) {
            return console[w(446)](w(729), S), S.constructor[w(516)] != w(548);
          }
        })(),
        hasToStringProxy: !!wu["Function.toString"],
        hasBadWebGL: (() => {
          var w = n;
          const { UNMASKED_RENDERER_WEBGL: S } = (e == null ? void 0 : e[w(901)]) || {}, { webglRenderer: E } = t || {};
          return S && E && S !== E;
        })()
      }
    }, { likeHeadless: f, headless: p, stealth: g } = d, y = Object[n(331)](f), m = Object.keys(p), b = Object[n(331)](g), u = +(y[n(788)]((w) => f[w])[n(343)] / y[n(343)] * 100)[n(505)](0), h = +(m[n(788)]((w) => p[w])[n(343)] / m[n(343)] * 100).toFixed(0), x = +(b[n(788)]((w) => g[w])[n(343)] / b[n(343)] * 100)[n(505)](0);
    return es({ time: o[n(1142)](), test: "headless", passed: !0 }), {
      ...d,
      likeHeadlessRating: u,
      headlessRating: h,
      stealthRating: x,
      systemFonts: i,
      platformEstimate: [s, l]
    };
  } catch (o) {
    es({ test: n(974), passed: !1 }), fh(o, n(974));
    return;
  }
}
async function j5() {
  var e = v;
  try {
    const t = ch();
    await yu(t);
    const n = {
      privacy: void 0,
      security: void 0,
      mode: void 0,
      extension: void 0,
      engine: Ge ? "Blink" : qi ? e(1197) : ""
    }, r = (y) => new RegExp(y + "+$"), o = (y, m, b) => new Promise(
      (u) => setTimeout(() => {
        var h = e;
        const x = b || +/* @__PURE__ */ new Date(), w = r(m)[h(913)](x) ? r(m)[h(683)](x)[0] : x;
        return u(w);
      }, y)
    ), a = async () => {
      var y = e;
      const m = +/* @__PURE__ */ new Date(), b = +("" + m)[y(1269)](-1), u = await o(0, b, m), h = await o(1, b), x = await o(2, b), w = await o(3, b), S = await o(4, b), E = await o(5, b), k = await o(6, b), L = await o(7, b), P = await o(8, b), O = await o(9, b), j = ("" + u)[y(1269)](-1), ne = ("" + h)[y(1269)](-1), Ae = ("" + x).slice(-1), _ = ("" + w)[y(1269)](-1), I = ("" + S).slice(-1), U = ("" + E)[y(1269)](-1), de = ("" + k)[y(1269)](-1), N = ("" + L).slice(-1), A = ("" + P)[y(1269)](-1), B = ("" + O)[y(1269)](-1), J = j == ne && j == Ae && j == _ && j == I && j == U && j == de && j == N && j == A && j == B, fe = ("" + u)[y(343)], fn = [
        u,
        h,
        x,
        w,
        S,
        E,
        k,
        L,
        P,
        O
      ];
      return {
        protection: J,
        delays: fn[y(335)](
          (Oe) => ("" + Oe).length > fe ? ("" + Oe).slice(-fe) : Oe
        ),
        precision: J ? Math.min(...fn[y(335)]((Oe) => ("" + Oe)[y(343)])) : void 0,
        precisionValue: J ? j : void 0
      };
    }, [i, s] = await Promise[e(930)]([
      l5(),
      Ge ? void 0 : a()
    ]);
    if (i) {
      const y = u5();
      n[e(530)] = e(513), n[e(336)] = {
        FileSystemWritableFileStream: e(430) in window,
        Serial: e(1110) in window,
        ReportingObserver: "ReportingObserver" in window
      }, n[e(1169)] = y[e(1072)] ? e(1072) : y[e(397)] ? "standard" : y[e(1009)] ? e(1009) : "";
    }
    const { protection: l } = s || {};
    if (qi && l) {
      const y = {
        OfflineAudioContext: e(1027) in window,
        WebGL2RenderingContext: e(762) in window,
        WebAssembly: e(1139) in window,
        maxTouchPoints: e(1103) in navigator,
        RTCRtpTransceiver: e(434) in window,
        MediaDevices: e(660) in window,
        Credential: e(887) in window
      }, m = Object[e(331)](y), b = /* @__PURE__ */ new Set(["RTCRtpTransceiver", e(660), e(887)]), u = m.filter((x) => b.has(x) && !y[x])[e(343)] == b[e(1190)], h = !y[e(1139)];
      n.privacy = e(u ? 1026 : 995), n[e(336)] = { reduceTimerPrecision: !0, ...y }, n[e(1169)] = u ? h ? "safer" : e(397) : e(1235);
    }
    const c = Object.keys(re)[e(343)], d = "c767712b", f = {
      noscript: {
        contentDocumentHash: [e(714), e(388), e(723)],
        contentWindowHash: ["0b637a33", e(388), e(723)],
        getContextHash: [e(714), e(664), d]
      },
      trace: {
        contentDocumentHash: [e(627)],
        contentWindowHash: [e(627)],
        createElementHash: [e(1264)],
        getElementByIdHash: ["77dea834"],
        getImageDataHash: [e(1264)],
        toBlobHash: [e(1264), d],
        toDataURLHash: ["77dea834", d]
      },
      cydec: {
        contentDocumentHash: [e(1047), e(1101), e(609), e(594)],
        contentWindowHash: ["945b0c78", e(1101), e(609), e(594)],
        createElementHash: [
          e(1082),
          e(755),
          "4237b44c",
          "1466aaf0",
          e(1177),
          "73c662d9",
          e(334),
          e(941)
        ],
        getElementByIdHash: [
          "3dd86d6f",
          "cc7cb598",
          "4237b44c",
          e(1111),
          e(1177),
          e(722),
          e(334),
          "ae3d02c9"
        ],
        getImageDataHash: ["044f14c2", e(418), "15771efa", e(418), e(594)],
        toBlobHash: ["044f14c2", e(1101), e(362), e(594), e(717)],
        toDataURLHash: [
          e(1157),
          e(1101),
          e(970),
          e(1148),
          "6985d315",
          e(594),
          e(1244)
        ]
      },
      canvasblocker: {
        contentDocumentHash: [e(321), e(1115)],
        contentWindowHash: [e(321), e(1115)],
        appendHash: [e(321), "dbbaf31f"],
        getImageDataHash: [e(321), e(640), "dbbaf31f", d],
        toBlobHash: ["9f1c3dfe", "a2971888", e(1115), d],
        toDataURLHash: [e(321), e(640), e(1115), d]
      },
      chameleon: {
        appendHash: [e(1264)],
        insertAdjacentElementHash: [e(1264)],
        insertAdjacentHTMLHash: [e(1264)],
        insertAdjacentTextHash: [e(1264)],
        prependHash: [e(1264)],
        replaceWithHash: [e(1264)],
        appendChildHash: [e(1264)],
        insertBeforeHash: ["77dea834"],
        replaceChildHash: [e(1264)]
      },
      duckduckgo: {
        toDataURLHash: [e(350), "8ee7df22", d],
        toBlobHash: [e(350), e(746), d],
        getImageDataHash: ["fd00bf5d", e(746), d],
        getByteFrequencyDataHash: ["fd00bf5d", "8ee7df22", d],
        getByteTimeDomainDataHash: [e(350), e(746), d],
        getFloatFrequencyDataHash: [e(350), e(746), d],
        getFloatTimeDomainDataHash: ["fd00bf5d", "8ee7df22", d],
        copyFromChannelHash: [e(350), e(746), d],
        getChannelDataHash: [e(350), "8ee7df22", d],
        hardwareConcurrencyHash: [e(828)],
        availHeightHash: [e(828)],
        availLeftHash: [e(828)],
        availTopHash: [e(828)],
        availWidthHash: [e(828)],
        colorDepthHash: ["dfd41ab4"],
        pixelDepthHash: [e(828)]
      },
      privacybadger: { getImageDataHash: ["0cb0c682"], toDataURLHash: ["0cb0c682"] },
      privacypossum: {
        hardwareConcurrencyHash: [e(633)],
        availWidthHash: [e(633)],
        colorDepthHash: [e(633)]
      },
      jshelter: {
        contentDocumentHash: [e(1019), e(714), e(1100), e(723)],
        contentWindowHash: [e(1019), e(714), e(1100), e(723)],
        appendHash: [e(1019), e(714), "866fa7e7", e(723)],
        insertAdjacentElementHash: [e(1019), e(714), e(1100), e(723)],
        insertAdjacentHTMLHash: [e(1019), e(714), "866fa7e7", e(723)],
        prependHash: [e(1019), "0b637a33", e(1100), e(723)],
        replaceWithHash: [e(1019), e(714), "866fa7e7", e(723)],
        appendChildHash: ["0007ab4e", e(714), e(1100), e(723)],
        insertBeforeHash: [e(1019), "0b637a33", e(1100), e(723)],
        replaceChildHash: ["0007ab4e", e(714), e(1100), e(723)],
        hardwareConcurrencyHash: ["dfd41ab4"]
      },
      puppeteerExtra: {
        contentDocumentHash: [e(594)],
        contentWindowHash: ["55e9b959", e(907)],
        createElementHash: [e(594)],
        getElementByIdHash: [e(594)],
        appendHash: [e(594)],
        insertAdjacentElementHash: [e(594)],
        insertAdjacentHTMLHash: [e(594)],
        insertAdjacentTextHash: [e(594)],
        prependHash: [e(594)],
        replaceWithHash: [e(594)],
        appendChildHash: [e(594)],
        insertBeforeHash: [e(594)],
        replaceChildHash: ["55e9b959"],
        getContextHash: [e(594), d],
        toDataURLHash: ["55e9b959", d],
        toBlobHash: ["55e9b959", d],
        getImageDataHash: [e(594)],
        hardwareConcurrencyHash: [
          "efbd4cf9",
          e(486),
          e(1228),
          e(709),
          e(594)
        ]
      },
      fakeBrowser: {
        appendChildHash: ["8dfec2ec", e(1069)],
        getContextHash: ["83b825ab", e(486)],
        toDataURLHash: [e(940), "a63491fb"],
        toBlobHash: [e(940), e(486)],
        getImageDataHash: [e(940), e(486)],
        hardwareConcurrencyHash: ["83b825ab", e(486)],
        availHeightHash: [e(940), e(486)],
        availLeftHash: [e(940), e(486)],
        availTopHash: [e(940), e(486)],
        availWidthHash: [e(940), e(486)],
        colorDepthHash: [e(940), "a63491fb"],
        pixelDepthHash: [e(940), "a63491fb"]
      }
    };
    await yu(t);
    const p = {
      contentDocumentHash: se(re[e(1219)]),
      contentWindowHash: se(re[e(393)]),
      createElementHash: se(re[e(600)]),
      getElementByIdHash: se(re["Document.getElementById"]),
      appendHash: se(re["Element.append"]),
      insertAdjacentElementHash: se(re[e(575)]),
      insertAdjacentHTMLHash: se(re[e(617)]),
      insertAdjacentTextHash: se(re["Element.insertAdjacentText"]),
      prependHash: se(re["Element.prepend"]),
      replaceWithHash: se(re["Element.replaceWith"]),
      appendChildHash: se(re[e(948)]),
      insertBeforeHash: se(re[e(622)]),
      replaceChildHash: se(re[e(1185)]),
      getContextHash: se(re[e(965)]),
      toDataURLHash: se(re[e(791)]),
      toBlobHash: se(re["HTMLCanvasElement.toBlob"]),
      getImageDataHash: se(re[e(520)]),
      getByteFrequencyDataHash: se(re[e(1212)]),
      getByteTimeDomainDataHash: se(re["AnalyserNode.getByteTimeDomainData"]),
      getFloatFrequencyDataHash: se(re["AnalyserNode.getFloatFrequencyData"]),
      getFloatTimeDomainDataHash: se(re[e(1176)]),
      copyFromChannelHash: se(re[e(662)]),
      getChannelDataHash: se(re[e(1257)]),
      hardwareConcurrencyHash: se(re[e(1052)]),
      availHeightHash: se(re[e(982)]),
      availLeftHash: se(re["Screen.availLeft"]),
      availTopHash: se(re["Screen.availTop"]),
      availWidthHash: se(re[e(556)]),
      colorDepthHash: se(re["Screen.colorDepth"]),
      pixelDepthHash: se(re[e(1057)])
    };
    n[e(648)] = Object[e(331)](p).reduce((y, m) => {
      var b = e;
      const u = p[m];
      return u == d || (y[m[b(452)](b(1221), "")] = u), y;
    }, {});
    const g = ({ pattern: y, hash: m, prototypeLiesLen: b }) => {
      var u = e;
      const {
        noscript: h,
        trace: x,
        cydec: w,
        canvasblocker: S,
        chameleon: E,
        duckduckgo: k,
        privacybadger: L,
        privacypossum: P,
        jshelter: O,
        puppeteerExtra: j,
        fakeBrowser: ne
      } = y, Ae = u(1020);
      if (b)
        return b >= 7 && x[u(1126)][u(673)](m[u(1126)]) && x[u(471)][u(673)](m.contentWindowHash) && x[u(781)].includes(m[u(781)]) && x[u(499)][u(673)](m.getElementByIdHash) && x[u(735)].includes(m[u(735)]) && x[u(824)][u(673)](m[u(824)]) && x.getImageDataHash.includes(m[u(646)]) ? u(934) : b >= 7 && w[u(1126)][u(673)](m[u(1126)]) && w[u(471)][u(673)](m[u(471)]) && w.createElementHash[u(673)](m[u(781)]) && w[u(499)].includes(m[u(499)]) && w.toDataURLHash[u(673)](m[u(735)]) && w[u(824)][u(673)](m[u(824)]) && w[u(646)].includes(m[u(646)]) ? u(376) : b >= 6 && S.contentDocumentHash[u(673)](m[u(1126)]) && S[u(471)][u(673)](m[u(471)]) && S[u(702)][u(673)](m[u(702)]) && S[u(735)].includes(m.toDataURLHash) && S[u(824)][u(673)](m[u(824)]) && S[u(646)][u(673)](m[u(646)]) ? "CanvasBlocker" : b >= 9 && E[u(702)][u(673)](m[u(702)]) && E[u(1146)][u(673)](m[u(1146)]) && E.insertAdjacentHTMLHash.includes(m[u(345)]) && E.insertAdjacentTextHash[u(673)](m[u(927)]) && E[u(1038)].includes(m.prependHash) && E.replaceWithHash[u(673)](m.replaceWithHash) && E.appendChildHash[u(673)](m[u(657)]) && E[u(367)][u(673)](m[u(367)]) && E[u(1060)].includes(m[u(1060)]) ? u(1077) : b >= 7 && k[u(735)][u(673)](m.toDataURLHash) && k.toBlobHash[u(673)](m[u(824)]) && k[u(646)][u(673)](m[u(646)]) && k[u(687)][u(673)](m[u(687)]) && k[u(815)].includes(m[u(815)]) && k[u(764)][u(673)](m[u(764)]) && k[u(789)][u(673)](m.getFloatTimeDomainDataHash) && k.copyFromChannelHash[u(673)](m[u(389)]) && k[u(1132)].includes(m[u(1132)]) && k.hardwareConcurrencyHash[u(673)](m[u(473)]) && k.availHeightHash[u(673)](m[u(1188)]) && k[u(1010)][u(673)](m[u(1010)]) && k[u(427)][u(673)](m[u(427)]) && k[u(952)][u(673)](m[u(952)]) && k[u(647)][u(673)](m[u(647)]) && k[u(839)][u(673)](m[u(839)]) ? u(1214) : b >= 2 && L.getImageDataHash[u(673)](m[u(646)]) && L.toDataURLHash.includes(m.toDataURLHash) ? u(417) : b >= 3 && P[u(473)].includes(m[u(473)]) && P.availWidthHash.includes(m[u(952)]) && P[u(647)][u(673)](m[u(647)]) ? u(531) : b >= 2 && h[u(1126)].includes(m.contentDocumentHash) && h[u(471)][u(673)](m.contentDocumentHash) && h[u(654)][u(673)](m[u(654)]) && m[u(473)] == Ae ? u(766) : b >= 14 && O[u(1126)][u(673)](m[u(1126)]) && O.contentWindowHash[u(673)](m[u(1126)]) && O[u(702)][u(673)](m[u(702)]) && O.insertAdjacentElementHash[u(673)](m.insertAdjacentElementHash) && O[u(345)][u(673)](m.insertAdjacentHTMLHash) && O[u(1038)][u(673)](m[u(1038)]) && O[u(880)].includes(m[u(880)]) && O[u(657)][u(673)](m[u(657)]) && O[u(367)][u(673)](m[u(367)]) && O[u(1060)][u(673)](m.replaceChildHash) && O[u(473)].includes(m[u(473)]) ? "JShelter" : b >= 13 && j[u(1126)].includes(m[u(1126)]) && j[u(471)][u(673)](m[u(471)]) && j[u(781)].includes(m[u(781)]) && j.getElementByIdHash.includes(m.getElementByIdHash) && j[u(702)][u(673)](m.appendHash) && j[u(1146)][u(673)](m[u(1146)]) && j[u(345)][u(673)](m[u(345)]) && j.insertAdjacentTextHash[u(673)](m[u(927)]) && j.prependHash.includes(m.prependHash) && j[u(880)][u(673)](m[u(880)]) && j.appendChildHash[u(673)](m[u(657)]) && j[u(367)].includes(m.insertBeforeHash) && j[u(1126)][u(673)](m[u(1126)]) && j.replaceChildHash.includes(m[u(1060)]) && j[u(654)][u(673)](m[u(654)]) && j[u(735)][u(673)](m.toDataURLHash) && j[u(824)][u(673)](m[u(824)]) && j[u(646)][u(673)](m[u(646)]) && j.hardwareConcurrencyHash[u(673)](m[u(473)]) ? u(1155) : b >= 12 && ne.appendChildHash[u(673)](m.appendChildHash) && ne[u(654)][u(673)](m[u(654)]) && ne[u(735)].includes(m.toDataURLHash) && ne[u(824)].includes(m[u(824)]) && ne.getImageDataHash[u(673)](m[u(646)]) && ne[u(473)][u(673)](m[u(473)]) && ne.availHeightHash[u(673)](m[u(1188)]) && ne[u(1010)][u(673)](m.availLeftHash) && ne[u(427)][u(673)](m.availTopHash) && ne[u(952)][u(673)](m[u(952)]) && ne[u(647)][u(673)](m[u(647)]) && ne[u(839)][u(673)](m[u(839)]) ? u(987) : void 0;
    };
    return n[e(413)] = g({
      pattern: f,
      hash: p,
      prototypeLiesLen: c
    }), es({ time: t[e(1142)](), test: e(748), passed: !0 }), n;
  } catch (t) {
    es({ test: e(748), passed: !1 }), fh(t);
    return;
  }
}
const F5 = async () => {
  var e = v;
  const t = await j5(), n = await M5({ webgl: null, workerScope: null }), r = { resistance: t, headlessFeaturesFingerprint: n }, o = r5(), a = await o, i = await a.detect(), s = i.bot, l = (n == null ? void 0 : n[e(959)]) || 0, c = (n == null ? void 0 : n[e(540)]) || 0, d = (n == null ? void 0 : n.stealthRating) || 0, f = s ? 100 : Math[e(826)](l, c, d), p = f > 50 || d > 30, g = s ? i[e(984)] : t == null ? void 0 : t[e(413)];
  return {
    fingerprint: r,
    isBotBotD: i,
    botScore: f,
    isBot: p,
    botType: g
  };
}, _R = async () => {
  var e = v;
  const t = sI(), n = await t, r = await n[e(873)](), { screenFrame: o, ...a } = r[e(368)];
  return lh(a);
};
var H5 = !1;
function U5(e) {
  if (e.sheet)
    return e.sheet;
  for (var t = 0; t < document.styleSheets.length; t++)
    if (document.styleSheets[t].ownerNode === e)
      return document.styleSheets[t];
}
function V5(e) {
  var t = document.createElement("style");
  return t.setAttribute("data-emotion", e.key), e.nonce !== void 0 && t.setAttribute("nonce", e.nonce), t.appendChild(document.createTextNode("")), t.setAttribute("data-s", ""), t;
}
var z5 = /* @__PURE__ */ function() {
  function e(n) {
    var r = this;
    this._insertTag = function(o) {
      var a;
      r.tags.length === 0 ? r.insertionPoint ? a = r.insertionPoint.nextSibling : r.prepend ? a = r.container.firstChild : a = r.before : a = r.tags[r.tags.length - 1].nextSibling, r.container.insertBefore(o, a), r.tags.push(o);
    }, this.isSpeedy = n.speedy === void 0 ? !H5 : n.speedy, this.tags = [], this.ctr = 0, this.nonce = n.nonce, this.key = n.key, this.container = n.container, this.prepend = n.prepend, this.insertionPoint = n.insertionPoint, this.before = null;
  }
  var t = e.prototype;
  return t.hydrate = function(r) {
    r.forEach(this._insertTag);
  }, t.insert = function(r) {
    this.ctr % (this.isSpeedy ? 65e3 : 1) === 0 && this._insertTag(V5(this));
    var o = this.tags[this.tags.length - 1];
    if (this.isSpeedy) {
      var a = U5(o);
      try {
        a.insertRule(r, a.cssRules.length);
      } catch {
      }
    } else
      o.appendChild(document.createTextNode(r));
    this.ctr++;
  }, t.flush = function() {
    this.tags.forEach(function(r) {
      var o;
      return (o = r.parentNode) == null ? void 0 : o.removeChild(r);
    }), this.tags = [], this.ctr = 0;
  }, e;
}(), We = "-ms-", ts = "-moz-", oe = "-webkit-", ph = "comm", Mc = "rule", jc = "decl", B5 = "@import", hh = "@keyframes", W5 = "@layer", G5 = Math.abs, Ps = String.fromCharCode, Z5 = Object.assign;
function Y5(e, t) {
  return Fe(e, 0) ^ 45 ? (((t << 2 ^ Fe(e, 0)) << 2 ^ Fe(e, 1)) << 2 ^ Fe(e, 2)) << 2 ^ Fe(e, 3) : 0;
}
function mh(e) {
  return e.trim();
}
function K5(e, t) {
  return (e = t.exec(e)) ? e[0] : e;
}
function ae(e, t, n) {
  return e.replace(t, n);
}
function bu(e, t) {
  return e.indexOf(t);
}
function Fe(e, t) {
  return e.charCodeAt(t) | 0;
}
function ya(e, t, n) {
  return e.slice(t, n);
}
function Qt(e) {
  return e.length;
}
function Fc(e) {
  return e.length;
}
function ni(e, t) {
  return t.push(e), e;
}
function X5(e, t) {
  return e.map(t).join("");
}
var Ds = 1, po = 1, xh = 0, ct = 0, Ce = 0, So = "";
function $s(e, t, n, r, o, a, i) {
  return { value: e, root: t, parent: n, type: r, props: o, children: a, line: Ds, column: po, length: i, return: "" };
}
function Io(e, t) {
  return Z5($s("", null, null, "", null, null, 0), e, { length: -e.length }, t);
}
function J5() {
  return Ce;
}
function Q5() {
  return Ce = ct > 0 ? Fe(So, --ct) : 0, po--, Ce === 10 && (po = 1, Ds--), Ce;
}
function xt() {
  return Ce = ct < xh ? Fe(So, ct++) : 0, po++, Ce === 10 && (po = 1, Ds++), Ce;
}
function an() {
  return Fe(So, ct);
}
function ki() {
  return ct;
}
function Wa(e, t) {
  return ya(So, e, t);
}
function wa(e) {
  switch (e) {
    case 0:
    case 9:
    case 10:
    case 13:
    case 32:
      return 5;
    case 33:
    case 43:
    case 44:
    case 47:
    case 62:
    case 64:
    case 126:
    case 59:
    case 123:
    case 125:
      return 4;
    case 58:
      return 3;
    case 34:
    case 39:
    case 40:
    case 91:
      return 2;
    case 41:
    case 93:
      return 1;
  }
  return 0;
}
function gh(e) {
  return Ds = po = 1, xh = Qt(So = e), ct = 0, [];
}
function vh(e) {
  return So = "", e;
}
function Ei(e) {
  return mh(Wa(ct - 1, _u(e === 91 ? e + 2 : e === 40 ? e + 1 : e)));
}
function q5(e) {
  for (; (Ce = an()) && Ce < 33; )
    xt();
  return wa(e) > 2 || wa(Ce) > 3 ? "" : " ";
}
function e6(e, t) {
  for (; --t && xt() && !(Ce < 48 || Ce > 102 || Ce > 57 && Ce < 65 || Ce > 70 && Ce < 97); )
    ;
  return Wa(e, ki() + (t < 6 && an() == 32 && xt() == 32));
}
function _u(e) {
  for (; xt(); )
    switch (Ce) {
      case e:
        return ct;
      case 34:
      case 39:
        e !== 34 && e !== 39 && _u(Ce);
        break;
      case 40:
        e === 41 && _u(e);
        break;
      case 92:
        xt();
        break;
    }
  return ct;
}
function t6(e, t) {
  for (; xt() && e + Ce !== 57; )
    if (e + Ce === 84 && an() === 47)
      break;
  return "/*" + Wa(t, ct - 1) + "*" + Ps(e === 47 ? e : xt());
}
function n6(e) {
  for (; !wa(an()); )
    xt();
  return Wa(e, ct);
}
function r6(e) {
  return vh(Ci("", null, null, null, [""], e = gh(e), 0, [0], e));
}
function Ci(e, t, n, r, o, a, i, s, l) {
  for (var c = 0, d = 0, f = i, p = 0, g = 0, y = 0, m = 1, b = 1, u = 1, h = 0, x = "", w = o, S = a, E = r, k = x; b; )
    switch (y = h, h = xt()) {
      case 40:
        if (y != 108 && Fe(k, f - 1) == 58) {
          bu(k += ae(Ei(h), "&", "&\f"), "&\f") != -1 && (u = -1);
          break;
        }
      case 34:
      case 39:
      case 91:
        k += Ei(h);
        break;
      case 9:
      case 10:
      case 13:
      case 32:
        k += q5(y);
        break;
      case 92:
        k += e6(ki() - 1, 7);
        continue;
      case 47:
        switch (an()) {
          case 42:
          case 47:
            ni(o6(t6(xt(), ki()), t, n), l);
            break;
          default:
            k += "/";
        }
        break;
      case 123 * m:
        s[c++] = Qt(k) * u;
      case 125 * m:
      case 59:
      case 0:
        switch (h) {
          case 0:
          case 125:
            b = 0;
          case 59 + d:
            u == -1 && (k = ae(k, /\f/g, "")), g > 0 && Qt(k) - f && ni(g > 32 ? Gf(k + ";", r, n, f - 1) : Gf(ae(k, " ", "") + ";", r, n, f - 2), l);
            break;
          case 59:
            k += ";";
          default:
            if (ni(E = Wf(k, t, n, c, d, o, s, x, w = [], S = [], f), a), h === 123)
              if (d === 0)
                Ci(k, t, E, E, w, a, f, s, S);
              else
                switch (p === 99 && Fe(k, 3) === 110 ? 100 : p) {
                  case 100:
                  case 108:
                  case 109:
                  case 115:
                    Ci(e, E, E, r && ni(Wf(e, E, E, 0, 0, o, s, x, o, w = [], f), S), o, S, f, s, r ? w : S);
                    break;
                  default:
                    Ci(k, E, E, E, [""], S, 0, s, S);
                }
        }
        c = d = g = 0, m = u = 1, x = k = "", f = i;
        break;
      case 58:
        f = 1 + Qt(k), g = y;
      default:
        if (m < 1) {
          if (h == 123)
            --m;
          else if (h == 125 && m++ == 0 && Q5() == 125)
            continue;
        }
        switch (k += Ps(h), h * m) {
          case 38:
            u = d > 0 ? 1 : (k += "\f", -1);
            break;
          case 44:
            s[c++] = (Qt(k) - 1) * u, u = 1;
            break;
          case 64:
            an() === 45 && (k += Ei(xt())), p = an(), d = f = Qt(x = k += n6(ki())), h++;
            break;
          case 45:
            y === 45 && Qt(k) == 2 && (m = 0);
        }
    }
  return a;
}
function Wf(e, t, n, r, o, a, i, s, l, c, d) {
  for (var f = o - 1, p = o === 0 ? a : [""], g = Fc(p), y = 0, m = 0, b = 0; y < r; ++y)
    for (var u = 0, h = ya(e, f + 1, f = G5(m = i[y])), x = e; u < g; ++u)
      (x = mh(m > 0 ? p[u] + " " + h : ae(h, /&\f/g, p[u]))) && (l[b++] = x);
  return $s(e, t, n, o === 0 ? Mc : s, l, c, d);
}
function o6(e, t, n) {
  return $s(e, t, n, ph, Ps(J5()), ya(e, 2, -2), 0);
}
function Gf(e, t, n, r) {
  return $s(e, t, n, jc, ya(e, 0, r), ya(e, r + 1, -1), r);
}
function to(e, t) {
  for (var n = "", r = Fc(e), o = 0; o < r; o++)
    n += t(e[o], o, e, t) || "";
  return n;
}
function a6(e, t, n, r) {
  switch (e.type) {
    case W5:
      if (e.children.length) break;
    case B5:
    case jc:
      return e.return = e.return || e.value;
    case ph:
      return "";
    case hh:
      return e.return = e.value + "{" + to(e.children, r) + "}";
    case Mc:
      e.value = e.props.join(",");
  }
  return Qt(n = to(e.children, r)) ? e.return = e.value + "{" + n + "}" : "";
}
function i6(e) {
  var t = Fc(e);
  return function(n, r, o, a) {
    for (var i = "", s = 0; s < t; s++)
      i += e[s](n, r, o, a) || "";
    return i;
  };
}
function s6(e) {
  return function(t) {
    t.root || (t = t.return) && e(t);
  };
}
function yh(e) {
  var t = /* @__PURE__ */ Object.create(null);
  return function(n) {
    return t[n] === void 0 && (t[n] = e(n)), t[n];
  };
}
var l6 = function(t, n, r) {
  for (var o = 0, a = 0; o = a, a = an(), o === 38 && a === 12 && (n[r] = 1), !wa(a); )
    xt();
  return Wa(t, ct);
}, u6 = function(t, n) {
  var r = -1, o = 44;
  do
    switch (wa(o)) {
      case 0:
        o === 38 && an() === 12 && (n[r] = 1), t[r] += l6(ct - 1, n, r);
        break;
      case 2:
        t[r] += Ei(o);
        break;
      case 4:
        if (o === 44) {
          t[++r] = an() === 58 ? "&\f" : "", n[r] = t[r].length;
          break;
        }
      default:
        t[r] += Ps(o);
    }
  while (o = xt());
  return t;
}, c6 = function(t, n) {
  return vh(u6(gh(t), n));
}, Zf = /* @__PURE__ */ new WeakMap(), d6 = function(t) {
  if (!(t.type !== "rule" || !t.parent || // positive .length indicates that this rule contains pseudo
  // negative .length indicates that this rule has been already prefixed
  t.length < 1)) {
    for (var n = t.value, r = t.parent, o = t.column === r.column && t.line === r.line; r.type !== "rule"; )
      if (r = r.parent, !r) return;
    if (!(t.props.length === 1 && n.charCodeAt(0) !== 58 && !Zf.get(r)) && !o) {
      Zf.set(t, !0);
      for (var a = [], i = c6(n, a), s = r.props, l = 0, c = 0; l < i.length; l++)
        for (var d = 0; d < s.length; d++, c++)
          t.props[c] = a[l] ? i[l].replace(/&\f/g, s[d]) : s[d] + " " + i[l];
    }
  }
}, f6 = function(t) {
  if (t.type === "decl") {
    var n = t.value;
    // charcode for l
    n.charCodeAt(0) === 108 && // charcode for b
    n.charCodeAt(2) === 98 && (t.return = "", t.value = "");
  }
};
function wh(e, t) {
  switch (Y5(e, t)) {
    case 5103:
      return oe + "print-" + e + e;
    case 5737:
    case 4201:
    case 3177:
    case 3433:
    case 1641:
    case 4457:
    case 2921:
    case 5572:
    case 6356:
    case 5844:
    case 3191:
    case 6645:
    case 3005:
    case 6391:
    case 5879:
    case 5623:
    case 6135:
    case 4599:
    case 4855:
    case 4215:
    case 6389:
    case 5109:
    case 5365:
    case 5621:
    case 3829:
      return oe + e + e;
    case 5349:
    case 4246:
    case 4810:
    case 6968:
    case 2756:
      return oe + e + ts + e + We + e + e;
    case 6828:
    case 4268:
      return oe + e + We + e + e;
    case 6165:
      return oe + e + We + "flex-" + e + e;
    case 5187:
      return oe + e + ae(e, /(\w+).+(:[^]+)/, oe + "box-$1$2" + We + "flex-$1$2") + e;
    case 5443:
      return oe + e + We + "flex-item-" + ae(e, /flex-|-self/, "") + e;
    case 4675:
      return oe + e + We + "flex-line-pack" + ae(e, /align-content|flex-|-self/, "") + e;
    case 5548:
      return oe + e + We + ae(e, "shrink", "negative") + e;
    case 5292:
      return oe + e + We + ae(e, "basis", "preferred-size") + e;
    case 6060:
      return oe + "box-" + ae(e, "-grow", "") + oe + e + We + ae(e, "grow", "positive") + e;
    case 4554:
      return oe + ae(e, /([^-])(transform)/g, "$1" + oe + "$2") + e;
    case 6187:
      return ae(ae(ae(e, /(zoom-|grab)/, oe + "$1"), /(image-set)/, oe + "$1"), e, "") + e;
    case 5495:
    case 3959:
      return ae(e, /(image-set\([^]*)/, oe + "$1$`$1");
    case 4968:
      return ae(ae(e, /(.+:)(flex-)?(.*)/, oe + "box-pack:$3" + We + "flex-pack:$3"), /s.+-b[^;]+/, "justify") + oe + e + e;
    case 4095:
    case 3583:
    case 4068:
    case 2532:
      return ae(e, /(.+)-inline(.+)/, oe + "$1$2") + e;
    case 8116:
    case 7059:
    case 5753:
    case 5535:
    case 5445:
    case 5701:
    case 4933:
    case 4677:
    case 5533:
    case 5789:
    case 5021:
    case 4765:
      if (Qt(e) - 1 - t > 6) switch (Fe(e, t + 1)) {
        case 109:
          if (Fe(e, t + 4) !== 45) break;
        case 102:
          return ae(e, /(.+:)(.+)-([^]+)/, "$1" + oe + "$2-$3$1" + ts + (Fe(e, t + 3) == 108 ? "$3" : "$2-$3")) + e;
        case 115:
          return ~bu(e, "stretch") ? wh(ae(e, "stretch", "fill-available"), t) + e : e;
      }
      break;
    case 4949:
      if (Fe(e, t + 1) !== 115) break;
    case 6444:
      switch (Fe(e, Qt(e) - 3 - (~bu(e, "!important") && 10))) {
        case 107:
          return ae(e, ":", ":" + oe) + e;
        case 101:
          return ae(e, /(.+:)([^;!]+)(;|!.+)?/, "$1" + oe + (Fe(e, 14) === 45 ? "inline-" : "") + "box$3$1" + oe + "$2$3$1" + We + "$2box$3") + e;
      }
      break;
    case 5936:
      switch (Fe(e, t + 11)) {
        case 114:
          return oe + e + We + ae(e, /[svh]\w+-[tblr]{2}/, "tb") + e;
        case 108:
          return oe + e + We + ae(e, /[svh]\w+-[tblr]{2}/, "tb-rl") + e;
        case 45:
          return oe + e + We + ae(e, /[svh]\w+-[tblr]{2}/, "lr") + e;
      }
      return oe + e + We + e + e;
  }
  return e;
}
var p6 = function(t, n, r, o) {
  if (t.length > -1 && !t.return) switch (t.type) {
    case jc:
      t.return = wh(t.value, t.length);
      break;
    case hh:
      return to([Io(t, {
        value: ae(t.value, "@", "@" + oe)
      })], o);
    case Mc:
      if (t.length) return X5(t.props, function(a) {
        switch (K5(a, /(::plac\w+|:read-\w+)/)) {
          case ":read-only":
          case ":read-write":
            return to([Io(t, {
              props: [ae(a, /:(read-\w+)/, ":" + ts + "$1")]
            })], o);
          case "::placeholder":
            return to([Io(t, {
              props: [ae(a, /:(plac\w+)/, ":" + oe + "input-$1")]
            }), Io(t, {
              props: [ae(a, /:(plac\w+)/, ":" + ts + "$1")]
            }), Io(t, {
              props: [ae(a, /:(plac\w+)/, We + "input-$1")]
            })], o);
        }
        return "";
      });
  }
}, h6 = [p6], m6 = function(t) {
  var n = t.key;
  if (n === "css") {
    var r = document.querySelectorAll("style[data-emotion]:not([data-s])");
    Array.prototype.forEach.call(r, function(m) {
      var b = m.getAttribute("data-emotion");
      b.indexOf(" ") !== -1 && (document.head.appendChild(m), m.setAttribute("data-s", ""));
    });
  }
  var o = t.stylisPlugins || h6, a = {}, i, s = [];
  i = t.container || document.head, Array.prototype.forEach.call(
    // this means we will ignore elements which don't have a space in them which
    // means that the style elements we're looking at are only Emotion 11 server-rendered style elements
    document.querySelectorAll('style[data-emotion^="' + n + ' "]'),
    function(m) {
      for (var b = m.getAttribute("data-emotion").split(" "), u = 1; u < b.length; u++)
        a[b[u]] = !0;
      s.push(m);
    }
  );
  var l, c = [d6, f6];
  {
    var d, f = [a6, s6(function(m) {
      d.insert(m);
    })], p = i6(c.concat(o, f)), g = function(b) {
      return to(r6(b), p);
    };
    l = function(b, u, h, x) {
      d = h, g(b ? b + "{" + u.styles + "}" : u.styles), x && (y.inserted[u.name] = !0);
    };
  }
  var y = {
    key: n,
    sheet: new z5({
      key: n,
      container: i,
      nonce: t.nonce,
      speedy: t.speedy,
      prepend: t.prepend,
      insertionPoint: t.insertionPoint
    }),
    nonce: t.nonce,
    inserted: a,
    registered: {},
    insert: l
  };
  return y.sheet.hydrate(s), y;
};
function Su() {
  return Su = Object.assign ? Object.assign.bind() : function(e) {
    for (var t = 1; t < arguments.length; t++) {
      var n = arguments[t];
      for (var r in n) ({}).hasOwnProperty.call(n, r) && (e[r] = n[r]);
    }
    return e;
  }, Su.apply(null, arguments);
}
var bh = { exports: {} }, ce = {};
var Me = typeof Symbol == "function" && Symbol.for, Hc = Me ? Symbol.for("react.element") : 60103, Uc = Me ? Symbol.for("react.portal") : 60106, Ms = Me ? Symbol.for("react.fragment") : 60107, js = Me ? Symbol.for("react.strict_mode") : 60108, Fs = Me ? Symbol.for("react.profiler") : 60114, Hs = Me ? Symbol.for("react.provider") : 60109, Us = Me ? Symbol.for("react.context") : 60110, Vc = Me ? Symbol.for("react.async_mode") : 60111, Vs = Me ? Symbol.for("react.concurrent_mode") : 60111, zs = Me ? Symbol.for("react.forward_ref") : 60112, Bs = Me ? Symbol.for("react.suspense") : 60113, x6 = Me ? Symbol.for("react.suspense_list") : 60120, Ws = Me ? Symbol.for("react.memo") : 60115, Gs = Me ? Symbol.for("react.lazy") : 60116, g6 = Me ? Symbol.for("react.block") : 60121, v6 = Me ? Symbol.for("react.fundamental") : 60117, y6 = Me ? Symbol.for("react.responder") : 60118, w6 = Me ? Symbol.for("react.scope") : 60119;
function yt(e) {
  if (typeof e == "object" && e !== null) {
    var t = e.$$typeof;
    switch (t) {
      case Hc:
        switch (e = e.type, e) {
          case Vc:
          case Vs:
          case Ms:
          case Fs:
          case js:
          case Bs:
            return e;
          default:
            switch (e = e && e.$$typeof, e) {
              case Us:
              case zs:
              case Gs:
              case Ws:
              case Hs:
                return e;
              default:
                return t;
            }
        }
      case Uc:
        return t;
    }
  }
}
function _h(e) {
  return yt(e) === Vs;
}
ce.AsyncMode = Vc;
ce.ConcurrentMode = Vs;
ce.ContextConsumer = Us;
ce.ContextProvider = Hs;
ce.Element = Hc;
ce.ForwardRef = zs;
ce.Fragment = Ms;
ce.Lazy = Gs;
ce.Memo = Ws;
ce.Portal = Uc;
ce.Profiler = Fs;
ce.StrictMode = js;
ce.Suspense = Bs;
ce.isAsyncMode = function(e) {
  return _h(e) || yt(e) === Vc;
};
ce.isConcurrentMode = _h;
ce.isContextConsumer = function(e) {
  return yt(e) === Us;
};
ce.isContextProvider = function(e) {
  return yt(e) === Hs;
};
ce.isElement = function(e) {
  return typeof e == "object" && e !== null && e.$$typeof === Hc;
};
ce.isForwardRef = function(e) {
  return yt(e) === zs;
};
ce.isFragment = function(e) {
  return yt(e) === Ms;
};
ce.isLazy = function(e) {
  return yt(e) === Gs;
};
ce.isMemo = function(e) {
  return yt(e) === Ws;
};
ce.isPortal = function(e) {
  return yt(e) === Uc;
};
ce.isProfiler = function(e) {
  return yt(e) === Fs;
};
ce.isStrictMode = function(e) {
  return yt(e) === js;
};
ce.isSuspense = function(e) {
  return yt(e) === Bs;
};
ce.isValidElementType = function(e) {
  return typeof e == "string" || typeof e == "function" || e === Ms || e === Vs || e === Fs || e === js || e === Bs || e === x6 || typeof e == "object" && e !== null && (e.$$typeof === Gs || e.$$typeof === Ws || e.$$typeof === Hs || e.$$typeof === Us || e.$$typeof === zs || e.$$typeof === v6 || e.$$typeof === y6 || e.$$typeof === w6 || e.$$typeof === g6);
};
ce.typeOf = yt;
bh.exports = ce;
var b6 = bh.exports, Sh = b6;
var _6 = {
  $$typeof: !0,
  render: !0,
  defaultProps: !0,
  displayName: !0,
  propTypes: !0
}, S6 = {
  $$typeof: !0,
  compare: !0,
  defaultProps: !0,
  displayName: !0,
  propTypes: !0,
  type: !0
}, kh = {};
kh[Sh.ForwardRef] = _6;
kh[Sh.Memo] = S6;
var SR = Object.prototype;
var k6 = !0;
function Eh(e, t, n) {
  var r = "";
  return n.split(" ").forEach(function(o) {
    e[o] !== void 0 ? t.push(e[o] + ";") : r += o + " ";
  }), r;
}
var zc = function(t, n, r) {
  var o = t.key + "-" + n.name;
  // we only need to add the styles to the registered cache if the
  // class name could be used further down
  // the tree but if it's a string tag, we know it won't
  // so we don't have to add it to registered cache.
  // this improves memory usage since we can avoid storing the whole style string
  (r === !1 || // we need to always store it if we're in compat mode and
  // in node since emotion-server relies on whether a style is in
  // the registered cache to know whether a style is global or not
  // also, note that this check will be dead code eliminated in the browser
  k6 === !1) && t.registered[o] === void 0 && (t.registered[o] = n.styles);
}, Ch = function(t, n, r) {
  zc(t, n, r);
  var o = t.key + "-" + n.name;
  if (t.inserted[n.name] === void 0) {
    var a = n;
    do
      t.insert(n === a ? "." + o : "", a, t.sheet, !0), a = a.next;
    while (a !== void 0);
  }
};
function E6(e) {
  for (var t = 0, n, r = 0, o = e.length; o >= 4; ++r, o -= 4)
    n = e.charCodeAt(r) & 255 | (e.charCodeAt(++r) & 255) << 8 | (e.charCodeAt(++r) & 255) << 16 | (e.charCodeAt(++r) & 255) << 24, n = /* Math.imul(k, m): */
    (n & 65535) * 1540483477 + ((n >>> 16) * 59797 << 16), n ^= /* k >>> r: */
    n >>> 24, t = /* Math.imul(k, m): */
    (n & 65535) * 1540483477 + ((n >>> 16) * 59797 << 16) ^ /* Math.imul(h, m): */
    (t & 65535) * 1540483477 + ((t >>> 16) * 59797 << 16);
  switch (o) {
    case 3:
      t ^= (e.charCodeAt(r + 2) & 255) << 16;
    case 2:
      t ^= (e.charCodeAt(r + 1) & 255) << 8;
    case 1:
      t ^= e.charCodeAt(r) & 255, t = /* Math.imul(h, m): */
      (t & 65535) * 1540483477 + ((t >>> 16) * 59797 << 16);
  }
  return t ^= t >>> 13, t = /* Math.imul(h, m): */
  (t & 65535) * 1540483477 + ((t >>> 16) * 59797 << 16), ((t ^ t >>> 15) >>> 0).toString(36);
}
var C6 = {
  animationIterationCount: 1,
  aspectRatio: 1,
  borderImageOutset: 1,
  borderImageSlice: 1,
  borderImageWidth: 1,
  boxFlex: 1,
  boxFlexGroup: 1,
  boxOrdinalGroup: 1,
  columnCount: 1,
  columns: 1,
  flex: 1,
  flexGrow: 1,
  flexPositive: 1,
  flexShrink: 1,
  flexNegative: 1,
  flexOrder: 1,
  gridRow: 1,
  gridRowEnd: 1,
  gridRowSpan: 1,
  gridRowStart: 1,
  gridColumn: 1,
  gridColumnEnd: 1,
  gridColumnSpan: 1,
  gridColumnStart: 1,
  msGridRow: 1,
  msGridRowSpan: 1,
  msGridColumn: 1,
  msGridColumnSpan: 1,
  fontWeight: 1,
  lineHeight: 1,
  opacity: 1,
  order: 1,
  orphans: 1,
  scale: 1,
  tabSize: 1,
  widows: 1,
  zIndex: 1,
  zoom: 1,
  WebkitLineClamp: 1,
  // SVG-related properties
  fillOpacity: 1,
  floodOpacity: 1,
  stopOpacity: 1,
  strokeDasharray: 1,
  strokeDashoffset: 1,
  strokeMiterlimit: 1,
  strokeOpacity: 1,
  strokeWidth: 1
}, T6 = !1, O6 = /[A-Z]|^ms/g, N6 = /_EMO_([^_]+?)_([^]*?)_EMO_/g, Th = function(t) {
  return t.charCodeAt(1) === 45;
}, Yf = function(t) {
  return t != null && typeof t != "boolean";
}, Tl = /* @__PURE__ */ yh(function(e) {
  return Th(e) ? e : e.replace(O6, "-$&").toLowerCase();
}), Kf = function(t, n) {
  switch (t) {
    case "animation":
    case "animationName":
      if (typeof n == "string")
        return n.replace(N6, function(r, o, a) {
          return qt = {
            name: o,
            styles: a,
            next: qt
          }, o;
        });
  }
  return C6[t] !== 1 && !Th(t) && typeof n == "number" && n !== 0 ? n + "px" : n;
}, I6 = "Component selectors can only be used in conjunction with @emotion/babel-plugin, the swc Emotion plugin, or another Emotion-aware compiler transform.";
function ba(e, t, n) {
  if (n == null)
    return "";
  var r = n;
  if (r.__emotion_styles !== void 0)
    return r;
  switch (typeof n) {
    case "boolean":
      return "";
    case "object": {
      var o = n;
      if (o.anim === 1)
        return qt = {
          name: o.name,
          styles: o.styles,
          next: qt
        }, o.name;
      var a = n;
      if (a.styles !== void 0) {
        var i = a.next;
        if (i !== void 0)
          for (; i !== void 0; )
            qt = {
              name: i.name,
              styles: i.styles,
              next: qt
            }, i = i.next;
        var s = a.styles + ";";
        return s;
      }
      return L6(e, t, n);
    }
    case "function": {
      if (e !== void 0) {
        var l = qt, c = n(e);
        return qt = l, ba(e, t, c);
      }
      break;
    }
  }
  var d = n;
  if (t == null)
    return d;
  var f = t[d];
  return f !== void 0 ? f : d;
}
function L6(e, t, n) {
  var r = "";
  if (Array.isArray(n))
    for (var o = 0; o < n.length; o++)
      r += ba(e, t, n[o]) + ";";
  else
    for (var a in n) {
      var i = n[a];
      if (typeof i != "object") {
        var s = i;
        t != null && t[s] !== void 0 ? r += a + "{" + t[s] + "}" : Yf(s) && (r += Tl(a) + ":" + Kf(a, s) + ";");
      } else {
        if (a === "NO_COMPONENT_SELECTOR" && T6)
          throw new Error(I6);
        if (Array.isArray(i) && typeof i[0] == "string" && (t == null || t[i[0]] === void 0))
          for (var l = 0; l < i.length; l++)
            Yf(i[l]) && (r += Tl(a) + ":" + Kf(a, i[l]) + ";");
        else {
          var c = ba(e, t, i);
          switch (a) {
            case "animation":
            case "animationName": {
              r += Tl(a) + ":" + c + ";";
              break;
            }
            default:
              r += a + "{" + c + "}";
          }
        }
      }
    }
  return r;
}
var Xf = /label:\s*([^\s;\n{]+)\s*(;|$)/g, qt;
function Oh(e, t, n) {
  if (e.length === 1 && typeof e[0] == "object" && e[0] !== null && e[0].styles !== void 0)
    return e[0];
  var r = !0, o = "";
  qt = void 0;
  var a = e[0];
  if (a == null || a.raw === void 0)
    r = !1, o += ba(n, t, a);
  else {
    var i = a;
    o += i[0];
  }
  for (var s = 1; s < e.length; s++)
    if (o += ba(n, t, e[s]), r) {
      var l = a;
      o += l[s];
    }
  Xf.lastIndex = 0;
  for (var c = "", d; (d = Xf.exec(o)) !== null; )
    c += "-" + d[1];
  var f = E6(o) + c;
  return {
    name: f,
    styles: o,
    next: qt
  };
}
var A6 = function(t) {
  return t();
}, Nh = Wd.useInsertionEffect ? Wd.useInsertionEffect : !1, Ih = Nh || A6, kR = Nh || le.useLayoutEffect, R6 = !1, P6 = /* @__PURE__ */ le.createContext(
  // we're doing this to avoid preconstruct's dead code elimination in this one case
  // because this module is primarily intended for the browser and node
  // but it's also required in react native and similar environments sometimes
  // and we could have a special build just for that
  // but this is much easier and the native packages
  // might use a different theme context in the future anyway
  typeof HTMLElement < "u" ? /* @__PURE__ */ m6({
    key: "css"
  }) : null
), Lh = function(t) {
  return /* @__PURE__ */ le.forwardRef(function(n, r) {
    var o = le.useContext(P6);
    return t(n, o, r);
  });
}, Ah = /* @__PURE__ */ le.createContext({}), Zs = {}.hasOwnProperty, ku = "__EMOTION_TYPE_PLEASE_DO_NOT_USE__", Rh = function(t, n) {
  var r = {};
  for (var o in n)
    Zs.call(n, o) && (r[o] = n[o]);
  return r[ku] = t, r;
}, D6 = function(t) {
  var n = t.cache, r = t.serialized, o = t.isStringTag;
  return zc(n, r, o), Ih(function() {
    return Ch(n, r, o);
  }), null;
}, $6 = /* @__PURE__ */ Lh(
  /* <any, any> */
  function(e, t, n) {
    var r = e.css;
    typeof r == "string" && t.registered[r] !== void 0 && (r = t.registered[r]);
    var o = e[ku], a = [r], i = "";
    typeof e.className == "string" ? i = Eh(t.registered, a, e.className) : e.className != null && (i = e.className + " ");
    var s = Oh(a, void 0, le.useContext(Ah));
    i += t.key + "-" + s.name;
    var l = {};
    for (var c in e)
      Zs.call(e, c) && c !== "css" && c !== ku && !R6 && (l[c] = e[c]);
    return l.className = i, n && (l.ref = n), /* @__PURE__ */ le.createElement(le.Fragment, null, /* @__PURE__ */ le.createElement(D6, {
      cache: t,
      serialized: s,
      isStringTag: typeof o == "string"
    }), /* @__PURE__ */ le.createElement(o, l));
  }
), Ph = $6;
function Y(e, t, n) {
  return Zs.call(t, "css") ? rn.jsx(Ph, Rh(e, t), n) : rn.jsx(e, t, n);
}
function Hn(e, t, n) {
  return Zs.call(t, "css") ? rn.jsxs(Ph, Rh(e, t), n) : rn.jsxs(e, t, n);
}
function Dh(e, t, n) {
  if (e.length === 0)
    throw new Error("Array is empty");
  if (!Number.isFinite(t))
    throw new Error(`Index ${t} is not a finite number`);
  if (t > 0 ? t = t % e.length : t = Math.ceil(Math.abs(t) / e.length) * e.length + t, t >= e.length)
    throw new Error(`Index ${t} larger than array length ${e.length}`);
  if (t < 0)
    throw new Error(`Index ${t} smaller than 0`);
  return e[t];
}
var M6 = /^((children|dangerouslySetInnerHTML|key|ref|autoFocus|defaultValue|defaultChecked|innerHTML|suppressContentEditableWarning|suppressHydrationWarning|valueLink|abbr|accept|acceptCharset|accessKey|action|allow|allowUserMedia|allowPaymentRequest|allowFullScreen|allowTransparency|alt|async|autoComplete|autoPlay|capture|cellPadding|cellSpacing|challenge|charSet|checked|cite|classID|className|cols|colSpan|content|contentEditable|contextMenu|controls|controlsList|coords|crossOrigin|data|dateTime|decoding|default|defer|dir|disabled|disablePictureInPicture|disableRemotePlayback|download|draggable|encType|enterKeyHint|form|formAction|formEncType|formMethod|formNoValidate|formTarget|frameBorder|headers|height|hidden|high|href|hrefLang|htmlFor|httpEquiv|id|inputMode|integrity|is|keyParams|keyType|kind|label|lang|list|loading|loop|low|marginHeight|marginWidth|max|maxLength|media|mediaGroup|method|min|minLength|multiple|muted|name|nonce|noValidate|open|optimum|pattern|placeholder|playsInline|poster|preload|profile|radioGroup|readOnly|referrerPolicy|rel|required|reversed|role|rows|rowSpan|sandbox|scope|scoped|scrolling|seamless|selected|shape|size|sizes|slot|span|spellCheck|src|srcDoc|srcLang|srcSet|start|step|style|summary|tabIndex|target|title|translate|type|useMap|value|width|wmode|wrap|about|datatype|inlist|prefix|property|resource|typeof|vocab|autoCapitalize|autoCorrect|autoSave|color|incremental|fallback|inert|itemProp|itemScope|itemType|itemID|itemRef|on|option|results|security|unselectable|accentHeight|accumulate|additive|alignmentBaseline|allowReorder|alphabetic|amplitude|arabicForm|ascent|attributeName|attributeType|autoReverse|azimuth|baseFrequency|baselineShift|baseProfile|bbox|begin|bias|by|calcMode|capHeight|clip|clipPathUnits|clipPath|clipRule|colorInterpolation|colorInterpolationFilters|colorProfile|colorRendering|contentScriptType|contentStyleType|cursor|cx|cy|d|decelerate|descent|diffuseConstant|direction|display|divisor|dominantBaseline|dur|dx|dy|edgeMode|elevation|enableBackground|end|exponent|externalResourcesRequired|fill|fillOpacity|fillRule|filter|filterRes|filterUnits|floodColor|floodOpacity|focusable|fontFamily|fontSize|fontSizeAdjust|fontStretch|fontStyle|fontVariant|fontWeight|format|from|fr|fx|fy|g1|g2|glyphName|glyphOrientationHorizontal|glyphOrientationVertical|glyphRef|gradientTransform|gradientUnits|hanging|horizAdvX|horizOriginX|ideographic|imageRendering|in|in2|intercept|k|k1|k2|k3|k4|kernelMatrix|kernelUnitLength|kerning|keyPoints|keySplines|keyTimes|lengthAdjust|letterSpacing|lightingColor|limitingConeAngle|local|markerEnd|markerMid|markerStart|markerHeight|markerUnits|markerWidth|mask|maskContentUnits|maskUnits|mathematical|mode|numOctaves|offset|opacity|operator|order|orient|orientation|origin|overflow|overlinePosition|overlineThickness|panose1|paintOrder|pathLength|patternContentUnits|patternTransform|patternUnits|pointerEvents|points|pointsAtX|pointsAtY|pointsAtZ|preserveAlpha|preserveAspectRatio|primitiveUnits|r|radius|refX|refY|renderingIntent|repeatCount|repeatDur|requiredExtensions|requiredFeatures|restart|result|rotate|rx|ry|scale|seed|shapeRendering|slope|spacing|specularConstant|specularExponent|speed|spreadMethod|startOffset|stdDeviation|stemh|stemv|stitchTiles|stopColor|stopOpacity|strikethroughPosition|strikethroughThickness|string|stroke|strokeDasharray|strokeDashoffset|strokeLinecap|strokeLinejoin|strokeMiterlimit|strokeOpacity|strokeWidth|surfaceScale|systemLanguage|tableValues|targetX|targetY|textAnchor|textDecoration|textRendering|textLength|to|transform|u1|u2|underlinePosition|underlineThickness|unicode|unicodeBidi|unicodeRange|unitsPerEm|vAlphabetic|vHanging|vIdeographic|vMathematical|values|vectorEffect|version|vertAdvY|vertOriginX|vertOriginY|viewBox|viewTarget|visibility|widths|wordSpacing|writingMode|x|xHeight|x1|x2|xChannelSelector|xlinkActuate|xlinkArcrole|xlinkHref|xlinkRole|xlinkShow|xlinkTitle|xlinkType|xmlBase|xmlns|xmlnsXlink|xmlLang|xmlSpace|y|y1|y2|yChannelSelector|z|zoomAndPan|for|class|autofocus)|(([Dd][Aa][Tt][Aa]|[Aa][Rr][Ii][Aa]|x)-.*))$/, j6 = /* @__PURE__ */ yh(
  function(e) {
    return M6.test(e) || e.charCodeAt(0) === 111 && e.charCodeAt(1) === 110 && e.charCodeAt(2) < 91;
  }
  /* Z+1 */
), F6 = j6, H6 = function(t) {
  return t !== "theme";
}, Jf = function(t) {
  return typeof t == "string" && // 96 is one less than the char code
  // for "a" so this is checking that
  // it's a lowercase character
  t.charCodeAt(0) > 96 ? F6 : H6;
}, Qf = function(t, n, r) {
  var o;
  if (n) {
    var a = n.shouldForwardProp;
    o = t.__emotion_forwardProp && a ? function(i) {
      return t.__emotion_forwardProp(i) && a(i);
    } : a;
  }
  return typeof o != "function" && r && (o = t.__emotion_forwardProp), o;
}, U6 = !1, V6 = function(t) {
  var n = t.cache, r = t.serialized, o = t.isStringTag;
  return zc(n, r, o), Ih(function() {
    return Ch(n, r, o);
  }), null;
}, z6 = function e(t, n) {
  var r = t.__emotion_real === t, o = r && t.__emotion_base || t, a, i;
  n !== void 0 && (a = n.label, i = n.target);
  var s = Qf(t, n, r), l = s || Jf(o), c = !l("as");
  return function() {
    var d = arguments, f = r && t.__emotion_styles !== void 0 ? t.__emotion_styles.slice(0) : [];
    if (a !== void 0 && f.push("label:" + a + ";"), d[0] == null || d[0].raw === void 0)
      f.push.apply(f, d);
    else {
      f.push(d[0][0]);
      for (var p = d.length, g = 1; g < p; g++)
        f.push(d[g], d[0][g]);
    }
    var y = Lh(function(m, b, u) {
      var h = c && m.as || o, x = "", w = [], S = m;
      if (m.theme == null) {
        S = {};
        for (var E in m)
          S[E] = m[E];
        S.theme = le.useContext(Ah);
      }
      typeof m.className == "string" ? x = Eh(b.registered, w, m.className) : m.className != null && (x = m.className + " ");
      var k = Oh(f.concat(w), b.registered, S);
      x += b.key + "-" + k.name, i !== void 0 && (x += " " + i);
      var L = c && s === void 0 ? Jf(h) : l, P = {};
      for (var O in m)
        c && O === "as" || L(O) && (P[O] = m[O]);
      return P.className = x, u && (P.ref = u), /* @__PURE__ */ le.createElement(le.Fragment, null, /* @__PURE__ */ le.createElement(V6, {
        cache: b,
        serialized: k,
        isStringTag: typeof h == "string"
      }), /* @__PURE__ */ le.createElement(h, P));
    });
    return y.displayName = a !== void 0 ? a : "Styled(" + (typeof o == "string" ? o : o.displayName || o.name || "Component") + ")", y.defaultProps = t.defaultProps, y.__emotion_real = y, y.__emotion_base = o, y.__emotion_styles = f, y.__emotion_forwardProp = s, Object.defineProperty(y, "toString", {
      value: function() {
        return i === void 0 && U6 ? "NO_COMPONENT_SELECTOR" : "." + i;
      }
    }), y.withComponent = function(m, b) {
      return e(m, Su({}, n, b, {
        shouldForwardProp: Qf(y, b, !0)
      })).apply(void 0, f);
    }, y;
  };
}, B6 = [
  "a",
  "abbr",
  "address",
  "area",
  "article",
  "aside",
  "audio",
  "b",
  "base",
  "bdi",
  "bdo",
  "big",
  "blockquote",
  "body",
  "br",
  "button",
  "canvas",
  "caption",
  "cite",
  "code",
  "col",
  "colgroup",
  "data",
  "datalist",
  "dd",
  "del",
  "details",
  "dfn",
  "dialog",
  "div",
  "dl",
  "dt",
  "em",
  "embed",
  "fieldset",
  "figcaption",
  "figure",
  "footer",
  "form",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "head",
  "header",
  "hgroup",
  "hr",
  "html",
  "i",
  "iframe",
  "img",
  "input",
  "ins",
  "kbd",
  "keygen",
  "label",
  "legend",
  "li",
  "link",
  "main",
  "map",
  "mark",
  "marquee",
  "menu",
  "menuitem",
  "meta",
  "meter",
  "nav",
  "noscript",
  "object",
  "ol",
  "optgroup",
  "option",
  "output",
  "p",
  "param",
  "picture",
  "pre",
  "progress",
  "q",
  "rp",
  "rt",
  "ruby",
  "s",
  "samp",
  "script",
  "section",
  "select",
  "small",
  "source",
  "span",
  "strong",
  "style",
  "sub",
  "summary",
  "sup",
  "table",
  "tbody",
  "td",
  "textarea",
  "tfoot",
  "th",
  "thead",
  "time",
  "title",
  "tr",
  "track",
  "u",
  "ul",
  "var",
  "video",
  "wbr",
  // SVG
  "circle",
  "clipPath",
  "defs",
  "ellipse",
  "foreignObject",
  "g",
  "image",
  "line",
  "linearGradient",
  "mask",
  "path",
  "pattern",
  "polygon",
  "polyline",
  "radialGradient",
  "rect",
  "stop",
  "svg",
  "text",
  "tspan"
], wr = z6.bind();
B6.forEach(function(e) {
  wr[e] = wr(e);
});
const W6 = "https://prosopo.io/?ref=prosopo.io&amp;utm_campaign=widget&amp;utm_medium=checkbox#features", G6 = "Visit prosopo.io to learn more about the service and its accessibility options.", Z6 = 74, $h = 80, Mh = "302px", Y6 = {
  maxWidth: Mh,
  minHeight: `${$h}px`
}, K6 = "8px", X6 = "2px", J6 = "1px solid", Q6 = wr.div`
  container-type: inline-size;
`, q6 = wr.div`
  max-width: 100%;
  max-height: 100%;
  overflow: hidden;
  height: ${$h}px;
  @container (max-width: 200px) {
    #logo-without-text {
      display: none;
    }

    #logo-with-text {
      display: none;
    }
  }
  @container (min-width: 201px) and (max-width: 244px) {
    #logo-without-text {
      display: inherit;
    }

    #logo-with-text {
      display: none;
    }
  }
  @container (min-width: 245px) {
    #logo-without-text {
      display: none;
    }

    #logo-with-text {
      display: inherit;
    }
  }
`, jh = {
  0: "#fff",
  100: "#f5f5f5",
  200: "#eeeeee",
  300: "#e0e0e0",
  400: "#bdbdbd",
  500: "#9e9e9e",
  600: "#757575",
  700: "#616161",
  800: "#424242",
  900: "#212121"
}, ns = 10, Fh = {
  palette: {
    mode: "light",
    primary: {
      main: "#487DFA",
      contrastText: "#fff"
    },
    background: {
      default: "#fff",
      contrastText: "#000"
    },
    grey: jh
  },
  spacing: {
    unit: ns,
    half: Math.floor(ns / 2)
  }
}, Hh = {
  palette: {
    mode: "dark",
    primary: {
      main: "#487DFA",
      contrastText: "#fff"
    },
    background: {
      default: "#303030",
      contrastText: "#fff"
    },
    grey: jh
  },
  spacing: {
    unit: ns,
    half: Math.floor(ns / 2)
  }
}, eL = ({ themeColor: e }) => {
  const t = le.useMemo(() => e === "light" ? Fh : Hh, [e]), n = wr.div`
    margin-top: 0;
    margin-left: 15px;
    margin-right: 15px;
    width: 2em;
    height: 2em;
    border: 4px solid ${t.palette.background.contrastText};
    border-bottom-color: transparent;
    border-radius: 50%;
    display: inherit;
    box-sizing: border-box;
    animation: rotation 1s linear infinite;

    @keyframes rotation {
      0% {
        transform: rotate(0deg);
      }
      100% {
        transform: rotate(360deg);
      }
    }
  `;
  return Y(n, {});
}, tL = ({ themeColor: e }) => {
  const t = le.useMemo(() => e === "light" ? "#1d1d1b" : "#fff", [e]);
  return Hn("svg", { className: "prosopo-logo", id: "logo-with-text", xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 468.67004 487.99998", height: "35px", style: { fill: t }, "aria-label": "Prosopo Logo With Text", children: [Y("title", { children: "Prosopo Logo With Text" }), Hn("g", { id: "g1960", transform: "translate(0,-35.903035)", children: [Hn("g", { id: "g943", transform: "matrix(0.82220888,0,0,0.82220888,103.56268,35.903035)", children: [Y("path", { d: "m 335.55,1825.19 a 147.75,147.75 0 0 1 147.75,147.75 h 50.5 c 0,-109.49 -88.76,-198.25 -198.25,-198.25 z", transform: "translate(-215.73,-1774.69)", id: "path8" }), Y("path", { d: "m 269.36,1891.39 a 147.74,147.74 0 0 1 147.74,147.74 h 50.5 c 0,-109.49 -88.75,-198.24 -198.24,-198.24 z", transform: "translate(-215.73,-1774.69)", id: "path10" }), Y("path", { d: "M 414,2157.17 A 147.75,147.75 0 0 1 266.26,2009.43 h -50.5 c 0,109.49 88.75,198.24 198.24,198.24 z", transform: "translate(-215.73,-1774.69)", id: "path12" }), Y("path", { d: "M 480.17,2091 A 147.74,147.74 0 0 1 332.43,1943.25 h -50.51 c 0,109.49 88.76,198.25 198.25,198.25 z", transform: "translate(-215.73,-1774.69)", id: "path14" })] }), Hn("g", { id: "g937", transform: "translate(-3.3873724,-118.52322)", children: [Y("path", { d: "m 63.842242,576.50288 q -7.89541,6.5896 -22.55626,6.5896 h -18.73684 v 32.33977 H 3.8901421 v -89.9368 H 42.516842 q 13.35216,0 21.29081,6.95569 7.93866,6.95569 7.94154,21.53871 -0.009,15.92343 -7.90695,22.51303 z m -14.35529,-32.40032 q -3.56577,-2.98636 -10.00259,-2.99212 h -16.92369 v 26.48235 h 16.93522 q 6.43394,0 10.00259,-3.23426 3.56864,-3.23427 3.57153,-10.2505 0,-7.01334 -3.58306,-10.00547 z", id: "path16", style: { strokeWidth: 0.288259 } }), Y("path", { d: "m 116.56193,547.36566 c 0.22484,0.0231 0.72353,0.0548 1.49607,0.0922 v 17.81729 c -1.09827,-0.12107 -2.07547,-0.20466 -2.92872,-0.24502 -0.85324,-0.0404 -1.54506,-0.0605 -2.07546,-0.0605 q -10.49263,0 -14.092978,6.83462 -2.01782,3.84249 -2.01782,11.83591 v 31.79205 h -17.50885 v -66.51 h 16.59796 v 11.58225 q 4.035618,-6.65013 7.016218,-9.09169 4.88311,-4.08751 12.6834,-4.08751 c 0.34302,0.0115 0.60822,0.0202 0.83018,0.0404 z", id: "path18", style: { strokeWidth: 0.288259 } }), Y("path", { d: "m 179.9645,607.2947 q -8.42005,10.39462 -25.56569,10.39462 -17.14565,0 -25.56569,-10.39462 -8.43446,-10.39462 -8.43446,-25.02664 0,-14.38413 8.42293,-24.93441 8.42292,-10.55028 25.56569,-10.54739 17.14276,0 25.56569,10.54739 8.42292,10.5474 8.42004,24.93441 0.0115,14.63202 -8.40851,25.02664 z m -13.91138,-9.60479 q 4.08463,-5.42215 4.08751,-15.41609 0.003,-9.99394 -4.08751,-15.38438 -4.0904,-5.39044 -11.71485,-5.39332 -7.62445,-0.003 -11.74367,5.38756 -4.11922,5.3962 -4.11922,15.38438 0,9.98817 4.11922,15.42185 4.11634,5.42216 11.74655,5.42216 7.63022,0 11.71197,-5.42216 z", id: "path20", style: { strokeWidth: 0.288259 } }), Y("path", { d: "m 210.56895,594.19621 q 0.55346,4.64097 2.38967,6.59249 3.25156,3.4764 12.0204,3.4764 5.14542,0 8.18367,-1.52489 3.03825,-1.52489 3.03537,-4.57755 a 4.9349939,4.9349939 0 0 0 -2.44444,-4.4536 q -2.44732,-1.52201 -18.1949,-5.24632 -11.33723,-2.80476 -15.97243,-7.0191 -4.63521,-4.14805 -4.63809,-11.95987 0,-9.22429 7.24683,-15.83407 7.24683,-6.60978 20.39432,-6.62995 12.47009,0 20.33091,4.97246 7.86082,4.97247 9.01962,17.17736 h -17.39066 q -0.36609,-3.35534 -1.89675,-5.30973 -2.88259,-3.53694 -9.8008,-3.53982 -5.69023,0 -8.10873,1.76991 -2.41849,1.76991 -2.41561,4.15093 c 0,1.99187 0.86478,3.43893 2.57127,4.32388 q 2.56263,1.40959 18.16032,4.82258 10.37732,2.43867 15.5804,7.38231 5.12236,5.00129 5.12524,12.50756 0,9.88728 -7.3679,16.1425 -7.3679,6.25522 -22.77246,6.25522 -15.71299,0 -23.20196,-6.62996 -7.48897,-6.62995 -7.49474,-16.8718 z", id: "path22", style: { strokeWidth: 0.288259 } }), Y("path", { d: "m 318.29999,607.2947 q -8.42293,10.39462 -25.56858,10.39462 -17.14564,0 -25.56569,-10.39462 -8.41716,-10.39462 -8.42004,-25.02664 0,-14.38413 8.42004,-24.93441 8.42005,-10.55028 25.56569,-10.54739 17.14853,0 25.56858,10.54739 8.42004,10.5474 8.42004,24.93441 0,14.63202 -8.42004,25.02664 z m -13.91427,-9.60479 q 4.0904,-5.42215 4.0904,-15.41609 0,-9.99394 -4.0904,-15.38438 -4.08751,-5.39044 -11.71484,-5.39332 -7.62733,-0.003 -11.74656,5.39332 -4.11633,5.39621 -4.11633,15.38438 0,9.98818 4.11633,15.41609 4.12211,5.42216 11.74656,5.42216 7.62445,0 11.71484,-5.42216 z", id: "path24", style: { strokeWidth: 0.288259 } }), Y("path", { d: "m 389.56049,556.06243 q 8.14043,8.60165 8.13755,25.26014 0,17.5838 -7.95018,26.78791 -7.95018,9.20411 -20.48369,9.22428 -7.98189,0 -13.25991,-3.96644 -2.88259,-2.19653 -5.64988,-6.408 v 34.66026 h -17.22059 v -92.69833 h 16.65849 v 9.82387 q 2.82206,-4.32388 6.01885,-6.83462 5.83148,-4.44784 13.87967,-4.4536 11.73502,0 19.86969,8.60453 z m -13.34639,12.50756 q -3.54559,-5.91507 -11.49577,-5.91796 -9.55579,0 -13.12731,8.96774 -1.85351,4.75916 -1.85063,12.08382 0,11.59089 6.22063,16.28951 3.69548,2.74711 8.75443,2.74711 7.33619,0 11.19309,-5.61528 3.85691,-5.61529 3.85114,-14.94911 0,-7.68787 -3.54558,-13.60006 z", id: "path26", style: { strokeWidth: 0.288259 } }), Y("path", { d: "m 463.46721,607.2947 q -8.41716,10.39462 -25.56569,10.39462 -17.14852,0 -25.56569,-10.39462 -8.42292,-10.39462 -8.42004,-25.02664 0,-14.38413 8.42004,-24.93441 8.42005,-10.55028 25.56569,-10.54739 17.14853,0 25.56569,10.54739 8.41716,10.5474 8.42293,24.93441 0,14.63202 -8.42293,25.02664 z m -13.91138,-9.60479 q 4.0904,-5.42215 4.08752,-15.41609 -0.003,-9.99394 -4.08752,-15.38438 -4.08751,-5.39044 -11.71484,-5.39332 -7.62733,-0.003 -11.74656,5.39332 -4.11633,5.39621 -4.11922,15.38438 -0.003,9.98818 4.11922,15.41609 4.12211,5.42216 11.74656,5.42216 7.62445,0 11.71484,-5.42216 z", id: "path28", style: { strokeWidth: 0.288259 } })] })] })] });
}, nL = ({ themeColor: e }) => {
  const t = le.useMemo(() => e === "light" ? "#1d1d1b" : "#fff", [e]);
  return Hn("svg", { className: "prosopo-logo", id: "logo-without-text", xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 260 348", height: "35px", style: { fill: t }, "aria-label": "Prosopo Logo Without Text", children: [Y("title", { children: "Prosopo Logo Without Text" }), Y("path", { d: "M95.7053 40.2707C127.005 40.2707 157.022 52.6841 179.154 74.78C201.286 96.8759 213.719 126.844 213.719 158.093H254.056C254.056 70.7808 183.16 -4.57764e-05 95.7053 -4.57764e-05V40.2707Z" }), Y("path", { d: "M42.8365 93.0614C58.3333 93.0614 73.6784 96.1087 87.9955 102.029C102.313 107.95 115.322 116.628 126.279 127.568C137.237 138.508 145.93 151.496 151.86 165.79C157.79 180.084 160.843 195.404 160.843 210.875H201.179C201.179 123.564 130.291 52.7906 42.8365 52.7906V93.0614Z" }), Y("path", { d: "M158.367 305.005C127.07 305.003 97.056 292.59 74.926 270.496C52.796 248.402 40.3626 218.437 40.3604 187.191H0.0239563C0.0239563 274.503 70.9123 345.276 158.367 345.276V305.005Z" }), Y("path", { d: "M211.219 252.239C195.722 252.239 180.376 249.191 166.059 243.27C151.741 237.349 138.732 228.67 127.774 217.729C116.816 206.788 108.123 193.799 102.194 179.505C96.2637 165.21 93.2121 149.889 93.2132 134.417H52.8687C52.8687 221.729 123.765 292.509 211.219 292.509V252.239Z" })] });
}, rL = wr.div`
  padding: 4px;
  flex: 1 1 0;
`, oL = wr.div`
  padding: 4px;
`, aL = ({ themeColor: e }) => Y(rL, { children: Hn(oL, { children: [Y(nL, { themeColor: e }), Y(tL, { themeColor: e })] }) }), Bc = ({ config: e, callbacks: t }) => {
  const n = e.theme === "light" ? "light" : "dark", r = e.theme === "light" ? Fh : Hh;
  return Y("div", { children: Y("div", { style: {
    maxWidth: Mh,
    maxHeight: "100%",
    overflowX: "auto"
  }, children: Y(Q6, { children: Y(q6, { children: Hn("div", { style: Y6, "data-cy": "button-human", children: [" ", Hn("div", { style: {
    padding: X6,
    border: J6,
    backgroundColor: r.palette.background.default,
    borderColor: r.palette.grey[300],
    borderRadius: K6,
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    justifyContent: "space-between",
    minHeight: `${Z6}px`,
    overflow: "hidden"
  }, children: [Y("div", { style: { display: "flex", flexDirection: "column" }, children: Y("div", { style: {
    alignItems: "center",
    flex: 1
  }, children: Y("div", { style: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
    verticalAlign: "middle"
  }, children: Y("div", { style: {
    display: "flex"
  }, children: Y("div", { style: { display: "inline-flex" }, children: Y(eL, { themeColor: n, "aria-label": "Loading spinner" }) }) }) }) }) }), Y("div", { style: { display: "inline-flex", flexDirection: "column" }, children: Y("a", { href: W6, target: "_blank", "aria-label": G6, rel: "noreferrer", children: Y("div", { style: { flex: 1 }, children: Y(aL, { themeColor: n, "aria-label": "Prosopo logo" }) }) }) })] })] }) }) }) }) });
};
var $;
(function(e) {
  e.datasetId = "datasetId", e.user = "user", e.dapp = "dapp", e.provider = "provider", e.blockNumber = "blockNumber", e.requestHash = "requestHash", e.captchas = "captchas", e.commitmentId = "commitmentId", e.proof = "proof", e.dappSignature = "dappSignature", e.dappUserSignature = "dappUserSignature", e.providerUrl = "providerUrl", e.procaptchaResponse = "procaptcha-response", e.verifiedTimeout = "verifiedTimeout", e.maxVerifiedTime = "maxVerifiedTime", e.verified = "verified", e.status = "status", e.challenge = "challenge", e.difficulty = "difficulty", e.nonce = "nonce", e.timeouts = "timeouts", e.token = "token", e.secret = "secret", e.timestamp = "timestamp", e.signature = "signature";
})($ || ($ = {}));
const Wc = 60 * 1e3, Ga = Wc, Uh = Ga * 2, Vh = Ga * 3, Gc = Ga * 15, Ys = Wc, Ks = Ys * 2, zh = Ys * 3, Bh = Wc * 15;
var Eu;
(function(e) {
  e.SelectAll = "SelectAll";
})(Eu || (Eu = {}));
var Cu;
(function(e) {
  e.Text = "text", e.Image = "image";
})(Cu || (Cu = {}));
var qf;
(function(e) {
  e.Solved = "solved", e.Unsolved = "unsolved";
})(qf || (qf = {}));
var e0;
(function(e) {
  e.pending = "Pending", e.approved = "Approved", e.disapproved = "Disapproved";
})(e0 || (e0 = {}));
var t0;
(function(e) {
  e.active = "Active", e.inactive = "Inactive";
})(t0 || (t0 = {}));
var n0;
(function(e) {
  e.provider = "Provider", e.dapp = "Dapp", e.any = "Any";
})(n0 || (n0 = {}));
K();
const iL = "___", sL = Oc((e) => {
  const t = e.split(iL);
  try {
    return t.length === 3;
  } catch {
    return !1;
  }
}), lL = W({
  captchaId: Ki([F(), du()]),
  captchaContentId: Ki([F(), du()]),
  salt: F().min(34),
  solution: K().array().optional(),
  unlabelled: K().array().optional(),
  timeLimit: K().optional()
}), Wh = W({
  hash: F(),
  data: F(),
  type: Nc(Cu)
}), Gh = Wh.extend({
  hash: F()
}), uL = Gh.extend({
  label: F()
}), cL = Gh.extend({
  label: F().optional()
}), Zh = lL.extend({
  items: In(Wh),
  target: F()
}), dL = Zh.extend({
  solution: F().array().optional(),
  unlabelled: F().array().optional()
}), fL = dL.extend({
  solution: K().array().optional(),
  unlabelled: K().array().optional()
}), pL = In(Zh);
In(fL);
const Yh = W({
  captchaId: F(),
  captchaContentId: F(),
  solution: F().array(),
  salt: F().min(34)
});
In(Yh);
W({
  items: In(cL)
});
W({
  items: In(uL)
});
W({
  captchas: pL,
  format: Nc(Eu)
});
W({
  labels: In(F())
});
var hL = Object.defineProperty, mL = (e, t, n) => t in e ? hL(e, t, { enumerable: !0, configurable: !0, writable: !0, value: n }) : e[t] = n, r0 = (e, t, n) => (mL(e, typeof t != "symbol" ? t + "" : t, n), n), Ol = {
  0: 0,
  1: 1,
  2: 2,
  3: 3,
  4: 4,
  5: 5,
  6: 6,
  7: 7,
  8: 8,
  9: 9,
  a: 10,
  b: 11,
  c: 12,
  d: 13,
  e: 14,
  f: 15,
  A: 10,
  B: 11,
  C: 12,
  D: 13,
  E: 14,
  F: 15
};
function xL(e) {
  const t = e.length % 2, n = (e[1] === "x" ? 2 : 0) + t, r = (e.length - n) / 2 + t, o = new Uint8Array(r);
  t && (o[0] = 0 | Ol[e[2]]);
  for (let a = 0; a < r; ) {
    const i = n + a * 2, s = Ol[e[i]], l = Ol[e[i + 1]];
    o[t + a++] = s << 4 | l;
  }
  return o;
}
var o0 = class extends Uint8Array {
  constructor(e) {
    super(e), r0(this, "i", 0), r0(this, "v"), this.v = new DataView(e);
  }
}, Cr = (e) => (t) => e(t instanceof o0 ? t : new o0(t instanceof Uint8Array ? t.buffer : typeof t == "string" ? xL(t).buffer : t)), Xs = (e) => {
  const t = e.length;
  let n = 0;
  for (let o = 0; o < t; o++)
    n += e[o].byteLength;
  const r = new Uint8Array(n);
  for (let o = 0, a = 0; o < t; o++) {
    const i = e[o];
    r.set(i, a), a += i.byteLength;
  }
  return r;
};
function a0(e, t) {
  const n = Object.keys(e), r = n.length, o = {};
  for (let a = 0; a < r; a++) {
    const i = n[a];
    o[i] = t(e[i], i);
  }
  return o;
}
var At = (e, t) => {
  const n = [e, t];
  return n.enc = e, n.dec = t, n;
}, Kh = (e, t) => (n) => e(t(n)), Xh = (e, t) => (n) => t(e(n)), gL = ([e, t], n, r) => At(Kh(e, n), Xh(t, r));
function vL(e, t) {
  return Cr((n) => {
    const r = n.v[t](n.i, !0);
    return n.i += e, r;
  });
}
function yL(e, t) {
  return (n) => {
    const r = new Uint8Array(e);
    return new DataView(r.buffer)[t](0, n, !0), r;
  };
}
function ar(e, t, n) {
  return At(yL(e, n), vL(e, t));
}
var ho = ar(1, "getUint8", "setUint8"), rs = ar(2, "getUint16", "setUint16"), _a = ar(4, "getUint32", "setUint32"), Jh = ar(8, "getBigUint64", "setBigUint64");
ar(1, "getInt8", "setInt8");
ar(2, "getInt16", "setInt16");
ar(4, "getInt32", "setInt32");
ar(8, "getBigInt64", "setBigInt64");
var Qh = (e) => {
  const t = new Uint8Array(16), n = new DataView(t.buffer);
  return n.setBigInt64(0, e, !0), n.setBigInt64(8, e >> 64n, !0), t;
}, qh = (e) => Cr((t) => {
  const { v: n, i: r } = t, o = n.getBigUint64(r, !0), a = n[e](r + 8, !0);
  return t.i += 16, a << 64n | o;
});
At(Qh, qh("getBigUint64"));
At(Qh, qh("getBigInt64"));
var em = (e) => {
  const t = new Uint8Array(32), n = new DataView(t.buffer);
  return n.setBigInt64(0, e, !0), n.setBigInt64(8, e >> 64n, !0), n.setBigInt64(16, e >> 128n, !0), n.setBigInt64(24, e >> 192n, !0), t;
}, tm = (e) => Cr((t) => {
  let n = t.v.getBigUint64(t.i, !0);
  return t.i += 8, n |= t.v.getBigUint64(t.i, !0) << 64n, t.i += 8, n |= t.v.getBigUint64(t.i, !0) << 128n, t.i += 8, n |= t.v[e](t.i, !0) << 192n, t.i += 8, n;
});
At(em, tm("getBigUint64"));
At(em, tm("getBigInt64"));
var nm = gL(ho, (e) => e ? 1 : 0, Boolean), wL = [ho[1], rs[1], _a[1]], bL = Cr((e) => {
  const t = e[e.i], n = t & 3;
  if (n < 3)
    return wL[n](e) >>> 2;
  const r = (t >>> 2) + 4;
  e.i++;
  let o = 0n;
  const a = r / 8 | 0;
  let i = 0n;
  for (let l = 0; l < a; l++)
    o = Jh[1](e) << i | o, i += 64n;
  let s = r % 8;
  return s > 3 && (o = BigInt(_a[1](e)) << i | o, i += 32n, s -= 4), s > 1 && (o = BigInt(rs[1](e)) << i | o, i += 16n, s -= 2), s && (o = BigInt(ho[1](e)) << i | o), o;
}), _L = 1n << 56n, SL = 1 << 24, kL = 256, EL = 4294967295n, CL = 64, TL = 16384, OL = 1 << 30, NL = (e) => {
  if (e < 0)
    throw new Error(`Wrong compact input (${e})`);
  const t = Number(e) << 2;
  if (e < CL)
    return ho[0](t);
  if (e < TL)
    return rs[0](t | 1);
  if (e < OL)
    return _a[0](t | 2);
  let n = [new Uint8Array(1)], r = BigInt(e);
  for (; r >= _L; )
    n.push(Jh[0](r)), r >>= 64n;
  r >= SL && (n.push(_a[0](Number(r & EL))), r >>= 32n);
  let o = Number(r);
  o >= kL && (n.push(rs[0](o)), o >>= 16), o && n.push(ho[0](o));
  const a = Xs(n);
  return a[0] = a.length - 5 << 2 | 3, a;
}, rm = At(NL, bL), IL = new TextEncoder(), LL = (e) => {
  const t = IL.encode(e);
  return Xs([rm.enc(t.length), t]);
}, AL = new TextDecoder(), RL = Cr((e) => {
  let t = rm.dec(e);
  const n = new DataView(e.buffer, e.i, t);
  return e.i += t, AL.decode(n);
}), Yt = At(LL, RL), PL = () => {
}, DL = new Uint8Array(0);
At(() => DL, PL);
var om = (e) => Cr((t) => {
  const n = ho.dec(t);
  if (n !== 0)
    return e === nm[1] ? n === 1 : e(t);
}), am = (e) => (t) => {
  const n = new Uint8Array(1);
  return t === void 0 ? (n[0] = 0, n) : (n[0] = 1, e === nm[0] ? (n[0] = t ? 1 : 2, n) : Xs([n, e(t)]));
}, Xt = (e) => At(am(e[0]), om(e[1]));
Xt.enc = am;
Xt.dec = om;
var im = (...e) => Cr((t) => e.map((n) => n(t))), sm = (...e) => (t) => Xs(e.map((n, r) => n(t[r]))), Js = (...e) => At(sm(...e.map(([t]) => t)), im(...e.map(([, t]) => t)));
Js.enc = sm;
Js.dec = im;
var lm = (e) => {
  const t = Object.keys(e);
  return Kh(Js.enc(...Object.values(e)), (n) => t.map((r) => n[r]));
}, um = (e) => {
  const t = Object.keys(e);
  return Xh(Js.dec(...Object.values(e)), (n) => Object.fromEntries(n.map((r, o) => [t[o], r])));
}, Fr = (e) => At(lm(a0(e, (t) => t[0])), um(a0(e, (t) => t[1])));
Fr.enc = lm;
Fr.dec = um;
const i0 = W({
  [$.requestHash]: F()
});
W({
  [$.challenge]: F()
});
const s0 = W({
  [$.challenge]: F().optional(),
  [$.requestHash]: F().optional(),
  [$.timestamp]: F().optional()
});
W({
  [$.commitmentId]: F().optional(),
  [$.providerUrl]: F().optional(),
  [$.dapp]: F(),
  [$.user]: F(),
  [$.challenge]: F().optional(),
  [$.nonce]: K().optional(),
  [$.timestamp]: F(),
  [$.signature]: W({
    [$.provider]: s0,
    [$.user]: s0
  })
});
const $L = Fr({
  [$.commitmentId]: Xt(Yt),
  [$.providerUrl]: Xt(Yt),
  [$.dapp]: Yt,
  [$.user]: Yt,
  [$.challenge]: Xt(Yt),
  [$.nonce]: Xt(_a),
  [$.timestamp]: Yt,
  [$.signature]: Fr({
    [$.provider]: Fr({
      [$.challenge]: Xt(Yt),
      [$.requestHash]: Xt(Yt)
    }),
    [$.user]: Fr({
      [$.timestamp]: Xt(Yt),
      [$.requestHash]: Xt(Yt)
    })
  })
}), cm = F().startsWith("0x"), ER = (e) => {
  var t, n, r, o;
  return CO($L.enc({
    [$.commitmentId]: void 0,
    [$.providerUrl]: void 0,
    [$.challenge]: void 0,
    [$.nonce]: void 0,
    ...e,
    signature: {
      provider: {
        challenge: ((t = e.signature.provider) == null ? void 0 : t.challenge) || void 0,
        requestHash: ((n = e.signature.provider) == null ? void 0 : n.requestHash) || void 0
      },
      user: {
        timestamp: ((r = e.signature.user) == null ? void 0 : r.timestamp) || void 0,
        requestHash: ((o = e.signature.user) == null ? void 0 : o.requestHash) || void 0
      }
    }
  }));
};
var St;
(function(e) {
  e.GetImageCaptchaChallenge = "/v1/prosopo/provider/captcha/image", e.GetPowCaptchaChallenge = "/v1/prosopo/provider/captcha/pow", e.SubmitImageCaptchaSolution = "/v1/prosopo/provider/solution", e.SubmitPowCaptchaSolution = "/v1/prosopo/provider/pow/solution", e.VerifyPowCaptchaSolution = "/v1/prosopo/provider/pow/verify", e.VerifyImageCaptchaSolutionDapp = "/v1/prosopo/provider/image/dapp/verify", e.VerifyImageCaptchaSolutionUser = "/v1/prosopo/provider/image/user/verify", e.GetProviderStatus = "/v1/prosopo/provider/status", e.GetProviderDetails = "/v1/prosopo/provider/details", e.SubmitUserEvents = "/v1/prosopo/provider/events";
})(St || (St = {}));
var Hr;
(function(e) {
  e.BatchCommit = "/v1/prosopo/provider/admin/batch", e.UpdateDataset = "/v1/prosopo/provider/admin/dataset", e.ProviderDeregister = "/v1/prosopo/provider/admin/deregister", e.ProviderUpdate = "/v1/prosopo/provider/admin/update";
})(Hr || (Hr = {}));
const dm = {
  [St.GetImageCaptchaChallenge]: { windowMs: 6e4, limit: 30 },
  [St.GetPowCaptchaChallenge]: { windowMs: 6e4, limit: 60 },
  [St.SubmitImageCaptchaSolution]: { windowMs: 6e4, limit: 60 },
  [St.SubmitPowCaptchaSolution]: { windowMs: 6e4, limit: 60 },
  [St.VerifyPowCaptchaSolution]: { windowMs: 6e4, limit: 60 },
  [St.VerifyImageCaptchaSolutionDapp]: { windowMs: 6e4, limit: 60 },
  [St.VerifyImageCaptchaSolutionUser]: { windowMs: 6e4, limit: 60 },
  [St.GetProviderStatus]: { windowMs: 6e4, limit: 60 },
  [St.GetProviderDetails]: { windowMs: 6e4, limit: 60 },
  [St.SubmitUserEvents]: { windowMs: 6e4, limit: 60 },
  [Hr.BatchCommit]: { windowMs: 6e4, limit: 5 },
  [Hr.UpdateDataset]: { windowMs: 6e4, limit: 5 },
  [Hr.ProviderDeregister]: { windowMs: 6e4, limit: 1 },
  [Hr.ProviderUpdate]: { windowMs: 6e4, limit: 5 }
}, ML = (e) => W(Object.entries(e).reduce((t, [n, r]) => {
  const o = n;
  return t[o] = W({
    windowMs: K().optional().default(r.windowMs),
    limit: K().optional().default(r.limit)
  }), t;
}, {})), jL = ML(dm);
W({
  [$.user]: F(),
  [$.dapp]: F(),
  [$.datasetId]: F()
});
W({
  [$.user]: F(),
  [$.dapp]: F(),
  [$.captchas]: In(Yh),
  [$.requestHash]: F(),
  [$.timestamp]: F(),
  [$.signature]: W({
    [$.user]: i0,
    [$.provider]: i0
  })
});
W({
  [$.token]: cm,
  [$.dappSignature]: F(),
  [$.maxVerifiedTime]: K().optional().default(Gc)
});
W({
  [$.token]: cm,
  [$.dappSignature]: F(),
  [$.verifiedTimeout]: K().optional().default(Ks)
});
W({
  [$.user]: F(),
  [$.dapp]: F()
});
const CR = W({
  [$.challenge]: sL,
  [$.difficulty]: K(),
  [$.signature]: W({
    [$.user]: W({
      [$.timestamp]: F()
    }),
    [$.provider]: W({
      [$.challenge]: F()
    })
  }),
  [$.user]: F(),
  [$.dapp]: F(),
  [$.nonce]: K(),
  [$.verifiedTimeout]: K().optional().default(Ks)
}), l0 = za([
  "trace",
  "debug",
  "info",
  "warn",
  "error",
  "fatal",
  "log"
]);
za([
  "mongo",
  "mongoMemory",
  "provider",
  "client",
  "captcha"
]);
const os = za([
  "development",
  "staging",
  "production"
]), FL = Qp(os, W({
  type: F(),
  endpoint: F(),
  dbname: F().default("prosopo"),
  authSource: F().default("admin")
})), HL = W({
  logLevel: l0.optional().default(l0.enum.info),
  defaultEnvironment: os.default(os.Values.production),
  account: W({
    address: F().optional(),
    secret: F().optional(),
    password: F().optional()
  })
});
Pe.object({
  encoded: Pe.string(),
  encoding: Pe.object({
    content: Pe.array(Pe.string()),
    type: Pe.array(Pe.string()),
    version: Pe.string()
  }),
  address: Pe.string(),
  meta: Pe.object({
    genesisHash: Pe.string(),
    name: Pe.string(),
    whenCreated: Pe.number()
  })
});
const fm = HL.merge(W({
  database: FL.optional(),
  devOnlyWatchEvents: Rs().optional()
})), UL = W({
  solved: W({
    count: K().positive()
  }).optional().default({ count: 1 }),
  unsolved: W({
    count: K().nonnegative()
  }).optional().default({ count: 1 })
}), VL = W({
  baseURL: F().url(),
  port: K().optional().default(9229)
}), zL = W({
  requiredNumberOfSolutions: K().positive().min(2),
  solutionWinningPercentage: K().positive().max(100),
  captchaBlockRecency: K().positive().min(2)
}), pm = fm.merge(W({
  userAccountAddress: F().optional(),
  web2: Rs().optional().default(!0),
  solutionThreshold: K().positive().max(100).optional().default(80),
  dappName: F().optional().default("ProsopoClientDapp"),
  serverUrl: F().optional()
})), hm = {
  challengeTimeout: Ga,
  solutionTimeout: Uh,
  verifiedTimeout: Vh,
  cachedTimeout: Gc
}, mm = {
  challengeTimeout: Ks,
  solutionTimeout: Ys,
  cachedTimeout: zh
}, xm = {
  maxVerifiedTime: Bh
}, Zc = {
  image: hm,
  pow: mm,
  contract: xm
}, gm = W({
  image: W({
    challengeTimeout: K().positive().optional().default(Ga),
    solutionTimeout: K().positive().optional().default(Uh),
    verifiedTimeout: K().positive().optional().default(Vh),
    cachedTimeout: K().positive().optional().default(Gc)
  }).default(hm),
  pow: W({
    verifiedTimeout: K().positive().optional().default(Ks),
    solutionTimeout: K().positive().optional().default(Ys),
    cachedTimeout: K().positive().optional().default(zh)
  }).default(mm),
  contract: W({
    maxVerifiedTime: K().positive().optional().default(Bh)
  }).default(xm)
}).default(Zc);
pm.merge(W({
  serverUrl: F().url().optional(),
  timeouts: gm.optional().default(Zc)
}));
const BL = W({
  area: W({
    width: K().positive(),
    height: K().positive()
  }),
  offsetParameter: K().positive(),
  multiplier: K().positive(),
  fontSizeFactor: K().positive(),
  maxShadowBlur: K().positive(),
  numberOfRounds: K().positive(),
  seed: K().positive()
}), WL = Ki([fu("light"), fu("dark")]), Tu = Pe.enum(["en", "es", "pt", "pt-BR"]), GL = pm.and(W({
  accountCreator: BL.optional(),
  theme: WL.optional().default("light"),
  captchas: gm.optional().default(Zc),
  language: Tu.optional()
}));
fm.merge(W({
  captchas: UL.optional().default({
    solved: { count: 1 },
    unsolved: { count: 0 }
  }),
  captchaSolutions: zL.optional().default({
    requiredNumberOfSolutions: 3,
    solutionWinningPercentage: 80,
    captchaBlockRecency: 10
  }),
  scheduledTasks: W({
    captchaScheduler: W({
      schedule: F().optional()
    }).optional(),
    clientListScheduler: W({
      schedule: F().optional()
    }).optional()
  }).optional(),
  server: VL,
  mongoEventsUri: F().optional(),
  mongoCaptchaUri: F().optional(),
  mongoClientUri: F().optional(),
  rateLimits: jL.default(dm),
  proxyCount: K().optional().default(0)
}));
var Ou;
(function(e) {
  e.Image = "image", e.Pow = "pow", e.Frictionless = "frictionless";
})(Ou || (Ou = {}));
const ZL = le.lazy(async () => import("./ProcaptchaWidget-b_oUhvT9.js")), vm = (e) => Y(le.Suspense, { fallback: Y(Bc, { config: e.config, callbacks: e.callbacks }), children: Y(ZL, { config: e.config, callbacks: e.callbacks }) }), YL = le.lazy(async () => import("./ProcaptchaWidget-BZq2OhjK.js")), ym = (e) => Y(le.Suspense, { fallback: Y(Bc, { config: e.config, callbacks: e.callbacks }), children: Y(YL, { config: e.config, callbacks: e.callbacks }) }), KL = async () => await F5().then((e) => ({ bot: e.isBot })), XL = ({ config: e, callbacks: t, detectBot: n = KL }) => {
  const [r, o] = le.useState(rn.jsx(Bc, { config: e, callbacks: t }));
  return le.useEffect(() => {
    (async () => {
      (await n()).bot ? o(rn.jsx(ym, { config: e, callbacks: t })) : o(rn.jsx(vm, { config: e, callbacks: t }));
    })(), e.language && lo.changeLanguage(e.language);
  }, [e, t, n, e.language]), r;
};
var wm = { exports: {} }, wt = {}, bm = { exports: {} }, _m = {};
(function(e) {
  function t(N, A) {
    var B = N.length;
    N.push(A);
    e: for (; 0 < B; ) {
      var J = B - 1 >>> 1, fe = N[J];
      if (0 < o(fe, A)) N[J] = A, N[B] = fe, B = J;
      else break e;
    }
  }
  function n(N) {
    return N.length === 0 ? null : N[0];
  }
  function r(N) {
    if (N.length === 0) return null;
    var A = N[0], B = N.pop();
    if (B !== A) {
      N[0] = B;
      e: for (var J = 0, fe = N.length, fn = fe >>> 1; J < fn; ) {
        var Oe = 2 * (J + 1) - 1, Nr = N[Oe], dt = Oe + 1, pn = N[dt];
        if (0 > o(Nr, B)) dt < fe && 0 > o(pn, Nr) ? (N[J] = pn, N[dt] = B, J = dt) : (N[J] = Nr, N[Oe] = B, J = Oe);
        else if (dt < fe && 0 > o(pn, B)) N[J] = pn, N[dt] = B, J = dt;
        else break e;
      }
    }
    return A;
  }
  function o(N, A) {
    var B = N.sortIndex - A.sortIndex;
    return B !== 0 ? B : N.id - A.id;
  }
  if (typeof performance == "object" && typeof performance.now == "function") {
    var a = performance;
    e.unstable_now = function() {
      return a.now();
    };
  } else {
    var i = Date, s = i.now();
    e.unstable_now = function() {
      return i.now() - s;
    };
  }
  var l = [], c = [], d = 1, f = null, p = 3, g = !1, y = !1, m = !1, b = typeof setTimeout == "function" ? setTimeout : null, u = typeof clearTimeout == "function" ? clearTimeout : null, h = typeof setImmediate < "u" ? setImmediate : null;
  typeof navigator < "u" && navigator.scheduling !== void 0 && navigator.scheduling.isInputPending !== void 0 && navigator.scheduling.isInputPending.bind(navigator.scheduling);
  function x(N) {
    for (var A = n(c); A !== null; ) {
      if (A.callback === null) r(c);
      else if (A.startTime <= N) r(c), A.sortIndex = A.expirationTime, t(l, A);
      else break;
      A = n(c);
    }
  }
  function w(N) {
    if (m = !1, x(N), !y) if (n(l) !== null) y = !0, U(S);
    else {
      var A = n(c);
      A !== null && de(w, A.startTime - N);
    }
  }
  function S(N, A) {
    y = !1, m && (m = !1, u(L), L = -1), g = !0;
    var B = p;
    try {
      for (x(A), f = n(l); f !== null && (!(f.expirationTime > A) || N && !j()); ) {
        var J = f.callback;
        if (typeof J == "function") {
          f.callback = null, p = f.priorityLevel;
          var fe = J(f.expirationTime <= A);
          A = e.unstable_now(), typeof fe == "function" ? f.callback = fe : f === n(l) && r(l), x(A);
        } else r(l);
        f = n(l);
      }
      if (f !== null) var fn = !0;
      else {
        var Oe = n(c);
        Oe !== null && de(w, Oe.startTime - A), fn = !1;
      }
      return fn;
    } finally {
      f = null, p = B, g = !1;
    }
  }
  var E = !1, k = null, L = -1, P = 5, O = -1;
  function j() {
    return !(e.unstable_now() - O < P);
  }
  function ne() {
    if (k !== null) {
      var N = e.unstable_now();
      O = N;
      var A = !0;
      try {
        A = k(!0, N);
      } finally {
        A ? Ae() : (E = !1, k = null);
      }
    } else E = !1;
  }
  var Ae;
  if (typeof h == "function") Ae = function() {
    h(ne);
  };
  else if (typeof MessageChannel < "u") {
    var _ = new MessageChannel(), I = _.port2;
    _.port1.onmessage = ne, Ae = function() {
      I.postMessage(null);
    };
  } else Ae = function() {
    b(ne, 0);
  };
  function U(N) {
    k = N, E || (E = !0, Ae());
  }
  function de(N, A) {
    L = b(function() {
      N(e.unstable_now());
    }, A);
  }
  e.unstable_IdlePriority = 5, e.unstable_ImmediatePriority = 1, e.unstable_LowPriority = 4, e.unstable_NormalPriority = 3, e.unstable_Profiling = null, e.unstable_UserBlockingPriority = 2, e.unstable_cancelCallback = function(N) {
    N.callback = null;
  }, e.unstable_continueExecution = function() {
    y || g || (y = !0, U(S));
  }, e.unstable_forceFrameRate = function(N) {
    0 > N || 125 < N ? console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported") : P = 0 < N ? Math.floor(1e3 / N) : 5;
  }, e.unstable_getCurrentPriorityLevel = function() {
    return p;
  }, e.unstable_getFirstCallbackNode = function() {
    return n(l);
  }, e.unstable_next = function(N) {
    switch (p) {
      case 1:
      case 2:
      case 3:
        var A = 3;
        break;
      default:
        A = p;
    }
    var B = p;
    p = A;
    try {
      return N();
    } finally {
      p = B;
    }
  }, e.unstable_pauseExecution = function() {
  }, e.unstable_requestPaint = function() {
  }, e.unstable_runWithPriority = function(N, A) {
    switch (N) {
      case 1:
      case 2:
      case 3:
      case 4:
      case 5:
        break;
      default:
        N = 3;
    }
    var B = p;
    p = N;
    try {
      return A();
    } finally {
      p = B;
    }
  }, e.unstable_scheduleCallback = function(N, A, B) {
    var J = e.unstable_now();
    switch (typeof B == "object" && B !== null ? (B = B.delay, B = typeof B == "number" && 0 < B ? J + B : J) : B = J, N) {
      case 1:
        var fe = -1;
        break;
      case 2:
        fe = 250;
        break;
      case 5:
        fe = 1073741823;
        break;
      case 4:
        fe = 1e4;
        break;
      default:
        fe = 5e3;
    }
    return fe = B + fe, N = { id: d++, callback: A, priorityLevel: N, startTime: B, expirationTime: fe, sortIndex: -1 }, B > J ? (N.sortIndex = B, t(c, N), n(l) === null && N === n(c) && (m ? (u(L), L = -1) : m = !0, de(w, B - J))) : (N.sortIndex = fe, t(l, N), y || g || (y = !0, U(S))), N;
  }, e.unstable_shouldYield = j, e.unstable_wrapCallback = function(N) {
    var A = p;
    return function() {
      var B = p;
      p = A;
      try {
        return N.apply(this, arguments);
      } finally {
        p = B;
      }
    };
  };
})(_m);
bm.exports = _m;
var JL = bm.exports;
var QL = le, vt = JL;
function C(e) {
  for (var t = "https://reactjs.org/docs/error-decoder.html?invariant=" + e, n = 1; n < arguments.length; n++) t += "&args[]=" + encodeURIComponent(arguments[n]);
  return "Minified React error #" + e + "; visit " + t + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
}
var Sm = /* @__PURE__ */ new Set(), Sa = {};
function Tr(e, t) {
  mo(e, t), mo(e + "Capture", t);
}
function mo(e, t) {
  for (Sa[e] = t, e = 0; e < t.length; e++) Sm.add(t[e]);
}
var En = !(typeof window > "u" || typeof window.document > "u" || typeof window.document.createElement > "u"), Nu = Object.prototype.hasOwnProperty, qL = /^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/, u0 = {}, c0 = {};
function e8(e) {
  return Nu.call(c0, e) ? !0 : Nu.call(u0, e) ? !1 : qL.test(e) ? c0[e] = !0 : (u0[e] = !0, !1);
}
function t8(e, t, n, r) {
  if (n !== null && n.type === 0) return !1;
  switch (typeof t) {
    case "function":
    case "symbol":
      return !0;
    case "boolean":
      return r ? !1 : n !== null ? !n.acceptsBooleans : (e = e.toLowerCase().slice(0, 5), e !== "data-" && e !== "aria-");
    default:
      return !1;
  }
}
function n8(e, t, n, r) {
  if (t === null || typeof t > "u" || t8(e, t, n, r)) return !0;
  if (r) return !1;
  if (n !== null) switch (n.type) {
    case 3:
      return !t;
    case 4:
      return t === !1;
    case 5:
      return isNaN(t);
    case 6:
      return isNaN(t) || 1 > t;
  }
  return !1;
}
function nt(e, t, n, r, o, a, i) {
  this.acceptsBooleans = t === 2 || t === 3 || t === 4, this.attributeName = r, this.attributeNamespace = o, this.mustUseProperty = n, this.propertyName = e, this.type = t, this.sanitizeURL = a, this.removeEmptyString = i;
}
var Ve = {};
"children dangerouslySetInnerHTML defaultValue defaultChecked innerHTML suppressContentEditableWarning suppressHydrationWarning style".split(" ").forEach(function(e) {
  Ve[e] = new nt(e, 0, !1, e, null, !1, !1);
});
[["acceptCharset", "accept-charset"], ["className", "class"], ["htmlFor", "for"], ["httpEquiv", "http-equiv"]].forEach(function(e) {
  var t = e[0];
  Ve[t] = new nt(t, 1, !1, e[1], null, !1, !1);
});
["contentEditable", "draggable", "spellCheck", "value"].forEach(function(e) {
  Ve[e] = new nt(e, 2, !1, e.toLowerCase(), null, !1, !1);
});
["autoReverse", "externalResourcesRequired", "focusable", "preserveAlpha"].forEach(function(e) {
  Ve[e] = new nt(e, 2, !1, e, null, !1, !1);
});
"allowFullScreen async autoFocus autoPlay controls default defer disabled disablePictureInPicture disableRemotePlayback formNoValidate hidden loop noModule noValidate open playsInline readOnly required reversed scoped seamless itemScope".split(" ").forEach(function(e) {
  Ve[e] = new nt(e, 3, !1, e.toLowerCase(), null, !1, !1);
});
["checked", "multiple", "muted", "selected"].forEach(function(e) {
  Ve[e] = new nt(e, 3, !0, e, null, !1, !1);
});
["capture", "download"].forEach(function(e) {
  Ve[e] = new nt(e, 4, !1, e, null, !1, !1);
});
["cols", "rows", "size", "span"].forEach(function(e) {
  Ve[e] = new nt(e, 6, !1, e, null, !1, !1);
});
["rowSpan", "start"].forEach(function(e) {
  Ve[e] = new nt(e, 5, !1, e.toLowerCase(), null, !1, !1);
});
var Yc = /[\-:]([a-z])/g;
function Kc(e) {
  return e[1].toUpperCase();
}
"accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height".split(" ").forEach(function(e) {
  var t = e.replace(
    Yc,
    Kc
  );
  Ve[t] = new nt(t, 1, !1, e, null, !1, !1);
});
"xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type".split(" ").forEach(function(e) {
  var t = e.replace(Yc, Kc);
  Ve[t] = new nt(t, 1, !1, e, "http://www.w3.org/1999/xlink", !1, !1);
});
["xml:base", "xml:lang", "xml:space"].forEach(function(e) {
  var t = e.replace(Yc, Kc);
  Ve[t] = new nt(t, 1, !1, e, "http://www.w3.org/XML/1998/namespace", !1, !1);
});
["tabIndex", "crossOrigin"].forEach(function(e) {
  Ve[e] = new nt(e, 1, !1, e.toLowerCase(), null, !1, !1);
});
Ve.xlinkHref = new nt("xlinkHref", 1, !1, "xlink:href", "http://www.w3.org/1999/xlink", !0, !1);
["src", "href", "action", "formAction"].forEach(function(e) {
  Ve[e] = new nt(e, 1, !1, e.toLowerCase(), null, !0, !0);
});
function Xc(e, t, n, r) {
  var o = Ve.hasOwnProperty(t) ? Ve[t] : null;
  (o !== null ? o.type !== 0 : r || !(2 < t.length) || t[0] !== "o" && t[0] !== "O" || t[1] !== "n" && t[1] !== "N") && (n8(t, n, o, r) && (n = null), r || o === null ? e8(t) && (n === null ? e.removeAttribute(t) : e.setAttribute(t, "" + n)) : o.mustUseProperty ? e[o.propertyName] = n === null ? o.type === 3 ? !1 : "" : n : (t = o.attributeName, r = o.attributeNamespace, n === null ? e.removeAttribute(t) : (o = o.type, n = o === 3 || o === 4 && n === !0 ? "" : "" + n, r ? e.setAttributeNS(r, t, n) : e.setAttribute(t, n))));
}
var Ln = QL.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED, ri = Symbol.for("react.element"), Ur = Symbol.for("react.portal"), Vr = Symbol.for("react.fragment"), Jc = Symbol.for("react.strict_mode"), Iu = Symbol.for("react.profiler"), km = Symbol.for("react.provider"), Em = Symbol.for("react.context"), Qc = Symbol.for("react.forward_ref"), Lu = Symbol.for("react.suspense"), Au = Symbol.for("react.suspense_list"), qc = Symbol.for("react.memo"), Dn = Symbol.for("react.lazy"), Cm = Symbol.for("react.offscreen"), d0 = Symbol.iterator;
function Lo(e) {
  return e === null || typeof e != "object" ? null : (e = d0 && e[d0] || e["@@iterator"], typeof e == "function" ? e : null);
}
var _e = Object.assign, Nl;
function Uo(e) {
  if (Nl === void 0) try {
    throw Error();
  } catch (n) {
    var t = n.stack.trim().match(/\n( *(at )?)/);
    Nl = t && t[1] || "";
  }
  return `
` + Nl + e;
}
var Il = !1;
function Ll(e, t) {
  if (!e || Il) return "";
  Il = !0;
  var n = Error.prepareStackTrace;
  Error.prepareStackTrace = void 0;
  try {
    if (t) if (t = function() {
      throw Error();
    }, Object.defineProperty(t.prototype, "props", { set: function() {
      throw Error();
    } }), typeof Reflect == "object" && Reflect.construct) {
      try {
        Reflect.construct(t, []);
      } catch (c) {
        var r = c;
      }
      Reflect.construct(e, [], t);
    } else {
      try {
        t.call();
      } catch (c) {
        r = c;
      }
      e.call(t.prototype);
    }
    else {
      try {
        throw Error();
      } catch (c) {
        r = c;
      }
      e();
    }
  } catch (c) {
    if (c && r && typeof c.stack == "string") {
      for (var o = c.stack.split(`
`), a = r.stack.split(`
`), i = o.length - 1, s = a.length - 1; 1 <= i && 0 <= s && o[i] !== a[s]; ) s--;
      for (; 1 <= i && 0 <= s; i--, s--) if (o[i] !== a[s]) {
        if (i !== 1 || s !== 1)
          do
            if (i--, s--, 0 > s || o[i] !== a[s]) {
              var l = `
` + o[i].replace(" at new ", " at ");
              return e.displayName && l.includes("<anonymous>") && (l = l.replace("<anonymous>", e.displayName)), l;
            }
          while (1 <= i && 0 <= s);
        break;
      }
    }
  } finally {
    Il = !1, Error.prepareStackTrace = n;
  }
  return (e = e ? e.displayName || e.name : "") ? Uo(e) : "";
}
function r8(e) {
  switch (e.tag) {
    case 5:
      return Uo(e.type);
    case 16:
      return Uo("Lazy");
    case 13:
      return Uo("Suspense");
    case 19:
      return Uo("SuspenseList");
    case 0:
    case 2:
    case 15:
      return e = Ll(e.type, !1), e;
    case 11:
      return e = Ll(e.type.render, !1), e;
    case 1:
      return e = Ll(e.type, !0), e;
    default:
      return "";
  }
}
function Ru(e) {
  if (e == null) return null;
  if (typeof e == "function") return e.displayName || e.name || null;
  if (typeof e == "string") return e;
  switch (e) {
    case Vr:
      return "Fragment";
    case Ur:
      return "Portal";
    case Iu:
      return "Profiler";
    case Jc:
      return "StrictMode";
    case Lu:
      return "Suspense";
    case Au:
      return "SuspenseList";
  }
  if (typeof e == "object") switch (e.$$typeof) {
    case Em:
      return (e.displayName || "Context") + ".Consumer";
    case km:
      return (e._context.displayName || "Context") + ".Provider";
    case Qc:
      var t = e.render;
      return e = e.displayName, e || (e = t.displayName || t.name || "", e = e !== "" ? "ForwardRef(" + e + ")" : "ForwardRef"), e;
    case qc:
      return t = e.displayName || null, t !== null ? t : Ru(e.type) || "Memo";
    case Dn:
      t = e._payload, e = e._init;
      try {
        return Ru(e(t));
      } catch {
      }
  }
  return null;
}
function o8(e) {
  var t = e.type;
  switch (e.tag) {
    case 24:
      return "Cache";
    case 9:
      return (t.displayName || "Context") + ".Consumer";
    case 10:
      return (t._context.displayName || "Context") + ".Provider";
    case 18:
      return "DehydratedFragment";
    case 11:
      return e = t.render, e = e.displayName || e.name || "", t.displayName || (e !== "" ? "ForwardRef(" + e + ")" : "ForwardRef");
    case 7:
      return "Fragment";
    case 5:
      return t;
    case 4:
      return "Portal";
    case 3:
      return "Root";
    case 6:
      return "Text";
    case 16:
      return Ru(t);
    case 8:
      return t === Jc ? "StrictMode" : "Mode";
    case 22:
      return "Offscreen";
    case 12:
      return "Profiler";
    case 21:
      return "Scope";
    case 13:
      return "Suspense";
    case 19:
      return "SuspenseList";
    case 25:
      return "TracingMarker";
    case 1:
    case 0:
    case 17:
    case 2:
    case 14:
    case 15:
      if (typeof t == "function") return t.displayName || t.name || null;
      if (typeof t == "string") return t;
  }
  return null;
}
function rr(e) {
  switch (typeof e) {
    case "boolean":
    case "number":
    case "string":
    case "undefined":
      return e;
    case "object":
      return e;
    default:
      return "";
  }
}
function Tm(e) {
  var t = e.type;
  return (e = e.nodeName) && e.toLowerCase() === "input" && (t === "checkbox" || t === "radio");
}
function a8(e) {
  var t = Tm(e) ? "checked" : "value", n = Object.getOwnPropertyDescriptor(e.constructor.prototype, t), r = "" + e[t];
  if (!e.hasOwnProperty(t) && typeof n < "u" && typeof n.get == "function" && typeof n.set == "function") {
    var o = n.get, a = n.set;
    return Object.defineProperty(e, t, { configurable: !0, get: function() {
      return o.call(this);
    }, set: function(i) {
      r = "" + i, a.call(this, i);
    } }), Object.defineProperty(e, t, { enumerable: n.enumerable }), { getValue: function() {
      return r;
    }, setValue: function(i) {
      r = "" + i;
    }, stopTracking: function() {
      e._valueTracker = null, delete e[t];
    } };
  }
}
function oi(e) {
  e._valueTracker || (e._valueTracker = a8(e));
}
function Om(e) {
  if (!e) return !1;
  var t = e._valueTracker;
  if (!t) return !0;
  var n = t.getValue(), r = "";
  return e && (r = Tm(e) ? e.checked ? "true" : "false" : e.value), e = r, e !== n ? (t.setValue(e), !0) : !1;
}
function as(e) {
  if (e = e || (typeof document < "u" ? document : void 0), typeof e > "u") return null;
  try {
    return e.activeElement || e.body;
  } catch {
    return e.body;
  }
}
function Pu(e, t) {
  var n = t.checked;
  return _e({}, t, { defaultChecked: void 0, defaultValue: void 0, value: void 0, checked: n ?? e._wrapperState.initialChecked });
}
function f0(e, t) {
  var n = t.defaultValue == null ? "" : t.defaultValue, r = t.checked != null ? t.checked : t.defaultChecked;
  n = rr(t.value != null ? t.value : n), e._wrapperState = { initialChecked: r, initialValue: n, controlled: t.type === "checkbox" || t.type === "radio" ? t.checked != null : t.value != null };
}
function Nm(e, t) {
  t = t.checked, t != null && Xc(e, "checked", t, !1);
}
function Du(e, t) {
  Nm(e, t);
  var n = rr(t.value), r = t.type;
  if (n != null) r === "number" ? (n === 0 && e.value === "" || e.value != n) && (e.value = "" + n) : e.value !== "" + n && (e.value = "" + n);
  else if (r === "submit" || r === "reset") {
    e.removeAttribute("value");
    return;
  }
  t.hasOwnProperty("value") ? $u(e, t.type, n) : t.hasOwnProperty("defaultValue") && $u(e, t.type, rr(t.defaultValue)), t.checked == null && t.defaultChecked != null && (e.defaultChecked = !!t.defaultChecked);
}
function p0(e, t, n) {
  if (t.hasOwnProperty("value") || t.hasOwnProperty("defaultValue")) {
    var r = t.type;
    if (!(r !== "submit" && r !== "reset" || t.value !== void 0 && t.value !== null)) return;
    t = "" + e._wrapperState.initialValue, n || t === e.value || (e.value = t), e.defaultValue = t;
  }
  n = e.name, n !== "" && (e.name = ""), e.defaultChecked = !!e._wrapperState.initialChecked, n !== "" && (e.name = n);
}
function $u(e, t, n) {
  (t !== "number" || as(e.ownerDocument) !== e) && (n == null ? e.defaultValue = "" + e._wrapperState.initialValue : e.defaultValue !== "" + n && (e.defaultValue = "" + n));
}
var Vo = Array.isArray;
function no(e, t, n, r) {
  if (e = e.options, t) {
    t = {};
    for (var o = 0; o < n.length; o++) t["$" + n[o]] = !0;
    for (n = 0; n < e.length; n++) o = t.hasOwnProperty("$" + e[n].value), e[n].selected !== o && (e[n].selected = o), o && r && (e[n].defaultSelected = !0);
  } else {
    for (n = "" + rr(n), t = null, o = 0; o < e.length; o++) {
      if (e[o].value === n) {
        e[o].selected = !0, r && (e[o].defaultSelected = !0);
        return;
      }
      t !== null || e[o].disabled || (t = e[o]);
    }
    t !== null && (t.selected = !0);
  }
}
function Mu(e, t) {
  if (t.dangerouslySetInnerHTML != null) throw Error(C(91));
  return _e({}, t, { value: void 0, defaultValue: void 0, children: "" + e._wrapperState.initialValue });
}
function h0(e, t) {
  var n = t.value;
  if (n == null) {
    if (n = t.children, t = t.defaultValue, n != null) {
      if (t != null) throw Error(C(92));
      if (Vo(n)) {
        if (1 < n.length) throw Error(C(93));
        n = n[0];
      }
      t = n;
    }
    t == null && (t = ""), n = t;
  }
  e._wrapperState = { initialValue: rr(n) };
}
function Im(e, t) {
  var n = rr(t.value), r = rr(t.defaultValue);
  n != null && (n = "" + n, n !== e.value && (e.value = n), t.defaultValue == null && e.defaultValue !== n && (e.defaultValue = n)), r != null && (e.defaultValue = "" + r);
}
function m0(e) {
  var t = e.textContent;
  t === e._wrapperState.initialValue && t !== "" && t !== null && (e.value = t);
}
function Lm(e) {
  switch (e) {
    case "svg":
      return "http://www.w3.org/2000/svg";
    case "math":
      return "http://www.w3.org/1998/Math/MathML";
    default:
      return "http://www.w3.org/1999/xhtml";
  }
}
function ju(e, t) {
  return e == null || e === "http://www.w3.org/1999/xhtml" ? Lm(t) : e === "http://www.w3.org/2000/svg" && t === "foreignObject" ? "http://www.w3.org/1999/xhtml" : e;
}
var ai, Am = function(e) {
  return typeof MSApp < "u" && MSApp.execUnsafeLocalFunction ? function(t, n, r, o) {
    MSApp.execUnsafeLocalFunction(function() {
      return e(t, n, r, o);
    });
  } : e;
}(function(e, t) {
  if (e.namespaceURI !== "http://www.w3.org/2000/svg" || "innerHTML" in e) e.innerHTML = t;
  else {
    for (ai = ai || document.createElement("div"), ai.innerHTML = "<svg>" + t.valueOf().toString() + "</svg>", t = ai.firstChild; e.firstChild; ) e.removeChild(e.firstChild);
    for (; t.firstChild; ) e.appendChild(t.firstChild);
  }
});
function ka(e, t) {
  if (t) {
    var n = e.firstChild;
    if (n && n === e.lastChild && n.nodeType === 3) {
      n.nodeValue = t;
      return;
    }
  }
  e.textContent = t;
}
var Go = {
  animationIterationCount: !0,
  aspectRatio: !0,
  borderImageOutset: !0,
  borderImageSlice: !0,
  borderImageWidth: !0,
  boxFlex: !0,
  boxFlexGroup: !0,
  boxOrdinalGroup: !0,
  columnCount: !0,
  columns: !0,
  flex: !0,
  flexGrow: !0,
  flexPositive: !0,
  flexShrink: !0,
  flexNegative: !0,
  flexOrder: !0,
  gridArea: !0,
  gridRow: !0,
  gridRowEnd: !0,
  gridRowSpan: !0,
  gridRowStart: !0,
  gridColumn: !0,
  gridColumnEnd: !0,
  gridColumnSpan: !0,
  gridColumnStart: !0,
  fontWeight: !0,
  lineClamp: !0,
  lineHeight: !0,
  opacity: !0,
  order: !0,
  orphans: !0,
  tabSize: !0,
  widows: !0,
  zIndex: !0,
  zoom: !0,
  fillOpacity: !0,
  floodOpacity: !0,
  stopOpacity: !0,
  strokeDasharray: !0,
  strokeDashoffset: !0,
  strokeMiterlimit: !0,
  strokeOpacity: !0,
  strokeWidth: !0
}, i8 = ["Webkit", "ms", "Moz", "O"];
Object.keys(Go).forEach(function(e) {
  i8.forEach(function(t) {
    t = t + e.charAt(0).toUpperCase() + e.substring(1), Go[t] = Go[e];
  });
});
function Rm(e, t, n) {
  return t == null || typeof t == "boolean" || t === "" ? "" : n || typeof t != "number" || t === 0 || Go.hasOwnProperty(e) && Go[e] ? ("" + t).trim() : t + "px";
}
function Pm(e, t) {
  e = e.style;
  for (var n in t) if (t.hasOwnProperty(n)) {
    var r = n.indexOf("--") === 0, o = Rm(n, t[n], r);
    n === "float" && (n = "cssFloat"), r ? e.setProperty(n, o) : e[n] = o;
  }
}
var s8 = _e({ menuitem: !0 }, { area: !0, base: !0, br: !0, col: !0, embed: !0, hr: !0, img: !0, input: !0, keygen: !0, link: !0, meta: !0, param: !0, source: !0, track: !0, wbr: !0 });
function Fu(e, t) {
  if (t) {
    if (s8[e] && (t.children != null || t.dangerouslySetInnerHTML != null)) throw Error(C(137, e));
    if (t.dangerouslySetInnerHTML != null) {
      if (t.children != null) throw Error(C(60));
      if (typeof t.dangerouslySetInnerHTML != "object" || !("__html" in t.dangerouslySetInnerHTML)) throw Error(C(61));
    }
    if (t.style != null && typeof t.style != "object") throw Error(C(62));
  }
}
function Hu(e, t) {
  if (e.indexOf("-") === -1) return typeof t.is == "string";
  switch (e) {
    case "annotation-xml":
    case "color-profile":
    case "font-face":
    case "font-face-src":
    case "font-face-uri":
    case "font-face-format":
    case "font-face-name":
    case "missing-glyph":
      return !1;
    default:
      return !0;
  }
}
var Uu = null;
function ed(e) {
  return e = e.target || e.srcElement || window, e.correspondingUseElement && (e = e.correspondingUseElement), e.nodeType === 3 ? e.parentNode : e;
}
var Vu = null, ro = null, oo = null;
function x0(e) {
  if (e = Ka(e)) {
    if (typeof Vu != "function") throw Error(C(280));
    var t = e.stateNode;
    t && (t = nl(t), Vu(e.stateNode, e.type, t));
  }
}
function Dm(e) {
  ro ? oo ? oo.push(e) : oo = [e] : ro = e;
}
function $m() {
  if (ro) {
    var e = ro, t = oo;
    if (oo = ro = null, x0(e), t) for (e = 0; e < t.length; e++) x0(t[e]);
  }
}
function Mm(e, t) {
  return e(t);
}
function jm() {
}
var Al = !1;
function Fm(e, t, n) {
  if (Al) return e(t, n);
  Al = !0;
  try {
    return Mm(e, t, n);
  } finally {
    Al = !1, (ro !== null || oo !== null) && (jm(), $m());
  }
}
function Ea(e, t) {
  var n = e.stateNode;
  if (n === null) return null;
  var r = nl(n);
  if (r === null) return null;
  n = r[t];
  e: switch (t) {
    case "onClick":
    case "onClickCapture":
    case "onDoubleClick":
    case "onDoubleClickCapture":
    case "onMouseDown":
    case "onMouseDownCapture":
    case "onMouseMove":
    case "onMouseMoveCapture":
    case "onMouseUp":
    case "onMouseUpCapture":
    case "onMouseEnter":
      (r = !r.disabled) || (e = e.type, r = !(e === "button" || e === "input" || e === "select" || e === "textarea")), e = !r;
      break e;
    default:
      e = !1;
  }
  if (e) return null;
  if (n && typeof n != "function") throw Error(C(231, t, typeof n));
  return n;
}
var zu = !1;
if (En) try {
  var Ao = {};
  Object.defineProperty(Ao, "passive", { get: function() {
    zu = !0;
  } }), window.addEventListener("test", Ao, Ao), window.removeEventListener("test", Ao, Ao);
} catch {
  zu = !1;
}
function l8(e, t, n, r, o, a, i, s, l) {
  var c = Array.prototype.slice.call(arguments, 3);
  try {
    t.apply(n, c);
  } catch (d) {
    this.onError(d);
  }
}
var Zo = !1, is = null, ss = !1, Bu = null, u8 = { onError: function(e) {
  Zo = !0, is = e;
} };
function c8(e, t, n, r, o, a, i, s, l) {
  Zo = !1, is = null, l8.apply(u8, arguments);
}
function d8(e, t, n, r, o, a, i, s, l) {
  if (c8.apply(this, arguments), Zo) {
    if (Zo) {
      var c = is;
      Zo = !1, is = null;
    } else throw Error(C(198));
    ss || (ss = !0, Bu = c);
  }
}
function Or(e) {
  var t = e, n = e;
  if (e.alternate) for (; t.return; ) t = t.return;
  else {
    e = t;
    do
      t = e, t.flags & 4098 && (n = t.return), e = t.return;
    while (e);
  }
  return t.tag === 3 ? n : null;
}
function Hm(e) {
  if (e.tag === 13) {
    var t = e.memoizedState;
    if (t === null && (e = e.alternate, e !== null && (t = e.memoizedState)), t !== null) return t.dehydrated;
  }
  return null;
}
function g0(e) {
  if (Or(e) !== e) throw Error(C(188));
}
function f8(e) {
  var t = e.alternate;
  if (!t) {
    if (t = Or(e), t === null) throw Error(C(188));
    return t !== e ? null : e;
  }
  for (var n = e, r = t; ; ) {
    var o = n.return;
    if (o === null) break;
    var a = o.alternate;
    if (a === null) {
      if (r = o.return, r !== null) {
        n = r;
        continue;
      }
      break;
    }
    if (o.child === a.child) {
      for (a = o.child; a; ) {
        if (a === n) return g0(o), e;
        if (a === r) return g0(o), t;
        a = a.sibling;
      }
      throw Error(C(188));
    }
    if (n.return !== r.return) n = o, r = a;
    else {
      for (var i = !1, s = o.child; s; ) {
        if (s === n) {
          i = !0, n = o, r = a;
          break;
        }
        if (s === r) {
          i = !0, r = o, n = a;
          break;
        }
        s = s.sibling;
      }
      if (!i) {
        for (s = a.child; s; ) {
          if (s === n) {
            i = !0, n = a, r = o;
            break;
          }
          if (s === r) {
            i = !0, r = a, n = o;
            break;
          }
          s = s.sibling;
        }
        if (!i) throw Error(C(189));
      }
    }
    if (n.alternate !== r) throw Error(C(190));
  }
  if (n.tag !== 3) throw Error(C(188));
  return n.stateNode.current === n ? e : t;
}
function Um(e) {
  return e = f8(e), e !== null ? Vm(e) : null;
}
function Vm(e) {
  if (e.tag === 5 || e.tag === 6) return e;
  for (e = e.child; e !== null; ) {
    var t = Vm(e);
    if (t !== null) return t;
    e = e.sibling;
  }
  return null;
}
var zm = vt.unstable_scheduleCallback, v0 = vt.unstable_cancelCallback, p8 = vt.unstable_shouldYield, h8 = vt.unstable_requestPaint, ke = vt.unstable_now, m8 = vt.unstable_getCurrentPriorityLevel, td = vt.unstable_ImmediatePriority, Bm = vt.unstable_UserBlockingPriority, ls = vt.unstable_NormalPriority, x8 = vt.unstable_LowPriority, Wm = vt.unstable_IdlePriority, Qs = null, sn = null;
function g8(e) {
  if (sn && typeof sn.onCommitFiberRoot == "function") try {
    sn.onCommitFiberRoot(Qs, e, void 0, (e.current.flags & 128) === 128);
  } catch {
  }
}
var Vt = Math.clz32 ? Math.clz32 : w8, v8 = Math.log, y8 = Math.LN2;
function w8(e) {
  return e >>>= 0, e === 0 ? 32 : 31 - (v8(e) / y8 | 0) | 0;
}
var ii = 64, si = 4194304;
function zo(e) {
  switch (e & -e) {
    case 1:
      return 1;
    case 2:
      return 2;
    case 4:
      return 4;
    case 8:
      return 8;
    case 16:
      return 16;
    case 32:
      return 32;
    case 64:
    case 128:
    case 256:
    case 512:
    case 1024:
    case 2048:
    case 4096:
    case 8192:
    case 16384:
    case 32768:
    case 65536:
    case 131072:
    case 262144:
    case 524288:
    case 1048576:
    case 2097152:
      return e & 4194240;
    case 4194304:
    case 8388608:
    case 16777216:
    case 33554432:
    case 67108864:
      return e & 130023424;
    case 134217728:
      return 134217728;
    case 268435456:
      return 268435456;
    case 536870912:
      return 536870912;
    case 1073741824:
      return 1073741824;
    default:
      return e;
  }
}
function us(e, t) {
  var n = e.pendingLanes;
  if (n === 0) return 0;
  var r = 0, o = e.suspendedLanes, a = e.pingedLanes, i = n & 268435455;
  if (i !== 0) {
    var s = i & ~o;
    s !== 0 ? r = zo(s) : (a &= i, a !== 0 && (r = zo(a)));
  } else i = n & ~o, i !== 0 ? r = zo(i) : a !== 0 && (r = zo(a));
  if (r === 0) return 0;
  if (t !== 0 && t !== r && !(t & o) && (o = r & -r, a = t & -t, o >= a || o === 16 && (a & 4194240) !== 0)) return t;
  if (r & 4 && (r |= n & 16), t = e.entangledLanes, t !== 0) for (e = e.entanglements, t &= r; 0 < t; ) n = 31 - Vt(t), o = 1 << n, r |= e[n], t &= ~o;
  return r;
}
function b8(e, t) {
  switch (e) {
    case 1:
    case 2:
    case 4:
      return t + 250;
    case 8:
    case 16:
    case 32:
    case 64:
    case 128:
    case 256:
    case 512:
    case 1024:
    case 2048:
    case 4096:
    case 8192:
    case 16384:
    case 32768:
    case 65536:
    case 131072:
    case 262144:
    case 524288:
    case 1048576:
    case 2097152:
      return t + 5e3;
    case 4194304:
    case 8388608:
    case 16777216:
    case 33554432:
    case 67108864:
      return -1;
    case 134217728:
    case 268435456:
    case 536870912:
    case 1073741824:
      return -1;
    default:
      return -1;
  }
}
function _8(e, t) {
  for (var n = e.suspendedLanes, r = e.pingedLanes, o = e.expirationTimes, a = e.pendingLanes; 0 < a; ) {
    var i = 31 - Vt(a), s = 1 << i, l = o[i];
    l === -1 ? (!(s & n) || s & r) && (o[i] = b8(s, t)) : l <= t && (e.expiredLanes |= s), a &= ~s;
  }
}
function Wu(e) {
  return e = e.pendingLanes & -1073741825, e !== 0 ? e : e & 1073741824 ? 1073741824 : 0;
}
function Gm() {
  var e = ii;
  return ii <<= 1, !(ii & 4194240) && (ii = 64), e;
}
function Rl(e) {
  for (var t = [], n = 0; 31 > n; n++) t.push(e);
  return t;
}
function Za(e, t, n) {
  e.pendingLanes |= t, t !== 536870912 && (e.suspendedLanes = 0, e.pingedLanes = 0), e = e.eventTimes, t = 31 - Vt(t), e[t] = n;
}
function S8(e, t) {
  var n = e.pendingLanes & ~t;
  e.pendingLanes = t, e.suspendedLanes = 0, e.pingedLanes = 0, e.expiredLanes &= t, e.mutableReadLanes &= t, e.entangledLanes &= t, t = e.entanglements;
  var r = e.eventTimes;
  for (e = e.expirationTimes; 0 < n; ) {
    var o = 31 - Vt(n), a = 1 << o;
    t[o] = 0, r[o] = -1, e[o] = -1, n &= ~a;
  }
}
function nd(e, t) {
  var n = e.entangledLanes |= t;
  for (e = e.entanglements; n; ) {
    var r = 31 - Vt(n), o = 1 << r;
    o & t | e[r] & t && (e[r] |= t), n &= ~o;
  }
}
var ue = 0;
function Zm(e) {
  return e &= -e, 1 < e ? 4 < e ? e & 268435455 ? 16 : 536870912 : 4 : 1;
}
var Ym, rd, Km, Xm, Jm, Gu = !1, li = [], Bn = null, Wn = null, Gn = null, Ca = /* @__PURE__ */ new Map(), Ta = /* @__PURE__ */ new Map(), jn = [], k8 = "mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit".split(" ");
function y0(e, t) {
  switch (e) {
    case "focusin":
    case "focusout":
      Bn = null;
      break;
    case "dragenter":
    case "dragleave":
      Wn = null;
      break;
    case "mouseover":
    case "mouseout":
      Gn = null;
      break;
    case "pointerover":
    case "pointerout":
      Ca.delete(t.pointerId);
      break;
    case "gotpointercapture":
    case "lostpointercapture":
      Ta.delete(t.pointerId);
  }
}
function Ro(e, t, n, r, o, a) {
  return e === null || e.nativeEvent !== a ? (e = { blockedOn: t, domEventName: n, eventSystemFlags: r, nativeEvent: a, targetContainers: [o] }, t !== null && (t = Ka(t), t !== null && rd(t)), e) : (e.eventSystemFlags |= r, t = e.targetContainers, o !== null && t.indexOf(o) === -1 && t.push(o), e);
}
function E8(e, t, n, r, o) {
  switch (t) {
    case "focusin":
      return Bn = Ro(Bn, e, t, n, r, o), !0;
    case "dragenter":
      return Wn = Ro(Wn, e, t, n, r, o), !0;
    case "mouseover":
      return Gn = Ro(Gn, e, t, n, r, o), !0;
    case "pointerover":
      var a = o.pointerId;
      return Ca.set(a, Ro(Ca.get(a) || null, e, t, n, r, o)), !0;
    case "gotpointercapture":
      return a = o.pointerId, Ta.set(a, Ro(Ta.get(a) || null, e, t, n, r, o)), !0;
  }
  return !1;
}
function Qm(e) {
  var t = fr(e.target);
  if (t !== null) {
    var n = Or(t);
    if (n !== null) {
      if (t = n.tag, t === 13) {
        if (t = Hm(n), t !== null) {
          e.blockedOn = t, Jm(e.priority, function() {
            Km(n);
          });
          return;
        }
      } else if (t === 3 && n.stateNode.current.memoizedState.isDehydrated) {
        e.blockedOn = n.tag === 3 ? n.stateNode.containerInfo : null;
        return;
      }
    }
  }
  e.blockedOn = null;
}
function Ti(e) {
  if (e.blockedOn !== null) return !1;
  for (var t = e.targetContainers; 0 < t.length; ) {
    var n = Zu(e.domEventName, e.eventSystemFlags, t[0], e.nativeEvent);
    if (n === null) {
      n = e.nativeEvent;
      var r = new n.constructor(n.type, n);
      Uu = r, n.target.dispatchEvent(r), Uu = null;
    } else return t = Ka(n), t !== null && rd(t), e.blockedOn = n, !1;
    t.shift();
  }
  return !0;
}
function w0(e, t, n) {
  Ti(e) && n.delete(t);
}
function C8() {
  Gu = !1, Bn !== null && Ti(Bn) && (Bn = null), Wn !== null && Ti(Wn) && (Wn = null), Gn !== null && Ti(Gn) && (Gn = null), Ca.forEach(w0), Ta.forEach(w0);
}
function Po(e, t) {
  e.blockedOn === t && (e.blockedOn = null, Gu || (Gu = !0, vt.unstable_scheduleCallback(vt.unstable_NormalPriority, C8)));
}
function Oa(e) {
  function t(o) {
    return Po(o, e);
  }
  if (0 < li.length) {
    Po(li[0], e);
    for (var n = 1; n < li.length; n++) {
      var r = li[n];
      r.blockedOn === e && (r.blockedOn = null);
    }
  }
  for (Bn !== null && Po(Bn, e), Wn !== null && Po(Wn, e), Gn !== null && Po(Gn, e), Ca.forEach(t), Ta.forEach(t), n = 0; n < jn.length; n++) r = jn[n], r.blockedOn === e && (r.blockedOn = null);
  for (; 0 < jn.length && (n = jn[0], n.blockedOn === null); ) Qm(n), n.blockedOn === null && jn.shift();
}
var ao = Ln.ReactCurrentBatchConfig, cs = !0;
function T8(e, t, n, r) {
  var o = ue, a = ao.transition;
  ao.transition = null;
  try {
    ue = 1, od(e, t, n, r);
  } finally {
    ue = o, ao.transition = a;
  }
}
function O8(e, t, n, r) {
  var o = ue, a = ao.transition;
  ao.transition = null;
  try {
    ue = 4, od(e, t, n, r);
  } finally {
    ue = o, ao.transition = a;
  }
}
function od(e, t, n, r) {
  if (cs) {
    var o = Zu(e, t, n, r);
    if (o === null) zl(e, t, r, ds, n), y0(e, r);
    else if (E8(o, e, t, n, r)) r.stopPropagation();
    else if (y0(e, r), t & 4 && -1 < k8.indexOf(e)) {
      for (; o !== null; ) {
        var a = Ka(o);
        if (a !== null && Ym(a), a = Zu(e, t, n, r), a === null && zl(e, t, r, ds, n), a === o) break;
        o = a;
      }
      o !== null && r.stopPropagation();
    } else zl(e, t, r, null, n);
  }
}
var ds = null;
function Zu(e, t, n, r) {
  if (ds = null, e = ed(r), e = fr(e), e !== null) if (t = Or(e), t === null) e = null;
  else if (n = t.tag, n === 13) {
    if (e = Hm(t), e !== null) return e;
    e = null;
  } else if (n === 3) {
    if (t.stateNode.current.memoizedState.isDehydrated) return t.tag === 3 ? t.stateNode.containerInfo : null;
    e = null;
  } else t !== e && (e = null);
  return ds = e, null;
}
function qm(e) {
  switch (e) {
    case "cancel":
    case "click":
    case "close":
    case "contextmenu":
    case "copy":
    case "cut":
    case "auxclick":
    case "dblclick":
    case "dragend":
    case "dragstart":
    case "drop":
    case "focusin":
    case "focusout":
    case "input":
    case "invalid":
    case "keydown":
    case "keypress":
    case "keyup":
    case "mousedown":
    case "mouseup":
    case "paste":
    case "pause":
    case "play":
    case "pointercancel":
    case "pointerdown":
    case "pointerup":
    case "ratechange":
    case "reset":
    case "resize":
    case "seeked":
    case "submit":
    case "touchcancel":
    case "touchend":
    case "touchstart":
    case "volumechange":
    case "change":
    case "selectionchange":
    case "textInput":
    case "compositionstart":
    case "compositionend":
    case "compositionupdate":
    case "beforeblur":
    case "afterblur":
    case "beforeinput":
    case "blur":
    case "fullscreenchange":
    case "focus":
    case "hashchange":
    case "popstate":
    case "select":
    case "selectstart":
      return 1;
    case "drag":
    case "dragenter":
    case "dragexit":
    case "dragleave":
    case "dragover":
    case "mousemove":
    case "mouseout":
    case "mouseover":
    case "pointermove":
    case "pointerout":
    case "pointerover":
    case "scroll":
    case "toggle":
    case "touchmove":
    case "wheel":
    case "mouseenter":
    case "mouseleave":
    case "pointerenter":
    case "pointerleave":
      return 4;
    case "message":
      switch (m8()) {
        case td:
          return 1;
        case Bm:
          return 4;
        case ls:
        case x8:
          return 16;
        case Wm:
          return 536870912;
        default:
          return 16;
      }
    default:
      return 16;
  }
}
var Un = null, ad = null, Oi = null;
function ex() {
  if (Oi) return Oi;
  var e, t = ad, n = t.length, r, o = "value" in Un ? Un.value : Un.textContent, a = o.length;
  for (e = 0; e < n && t[e] === o[e]; e++) ;
  var i = n - e;
  for (r = 1; r <= i && t[n - r] === o[a - r]; r++) ;
  return Oi = o.slice(e, 1 < r ? 1 - r : void 0);
}
function Ni(e) {
  var t = e.keyCode;
  return "charCode" in e ? (e = e.charCode, e === 0 && t === 13 && (e = 13)) : e = t, e === 10 && (e = 13), 32 <= e || e === 13 ? e : 0;
}
function ui() {
  return !0;
}
function b0() {
  return !1;
}
function bt(e) {
  function t(n, r, o, a, i) {
    this._reactName = n, this._targetInst = o, this.type = r, this.nativeEvent = a, this.target = i, this.currentTarget = null;
    for (var s in e) e.hasOwnProperty(s) && (n = e[s], this[s] = n ? n(a) : a[s]);
    return this.isDefaultPrevented = (a.defaultPrevented != null ? a.defaultPrevented : a.returnValue === !1) ? ui : b0, this.isPropagationStopped = b0, this;
  }
  return _e(t.prototype, { preventDefault: function() {
    this.defaultPrevented = !0;
    var n = this.nativeEvent;
    n && (n.preventDefault ? n.preventDefault() : typeof n.returnValue != "unknown" && (n.returnValue = !1), this.isDefaultPrevented = ui);
  }, stopPropagation: function() {
    var n = this.nativeEvent;
    n && (n.stopPropagation ? n.stopPropagation() : typeof n.cancelBubble != "unknown" && (n.cancelBubble = !0), this.isPropagationStopped = ui);
  }, persist: function() {
  }, isPersistent: ui }), t;
}
var ko = { eventPhase: 0, bubbles: 0, cancelable: 0, timeStamp: function(e) {
  return e.timeStamp || Date.now();
}, defaultPrevented: 0, isTrusted: 0 }, id = bt(ko), Ya = _e({}, ko, { view: 0, detail: 0 }), N8 = bt(Ya), Pl, Dl, Do, qs = _e({}, Ya, { screenX: 0, screenY: 0, clientX: 0, clientY: 0, pageX: 0, pageY: 0, ctrlKey: 0, shiftKey: 0, altKey: 0, metaKey: 0, getModifierState: sd, button: 0, buttons: 0, relatedTarget: function(e) {
  return e.relatedTarget === void 0 ? e.fromElement === e.srcElement ? e.toElement : e.fromElement : e.relatedTarget;
}, movementX: function(e) {
  return "movementX" in e ? e.movementX : (e !== Do && (Do && e.type === "mousemove" ? (Pl = e.screenX - Do.screenX, Dl = e.screenY - Do.screenY) : Dl = Pl = 0, Do = e), Pl);
}, movementY: function(e) {
  return "movementY" in e ? e.movementY : Dl;
} }), _0 = bt(qs), I8 = _e({}, qs, { dataTransfer: 0 }), L8 = bt(I8), A8 = _e({}, Ya, { relatedTarget: 0 }), $l = bt(A8), R8 = _e({}, ko, { animationName: 0, elapsedTime: 0, pseudoElement: 0 }), P8 = bt(R8), D8 = _e({}, ko, { clipboardData: function(e) {
  return "clipboardData" in e ? e.clipboardData : window.clipboardData;
} }), $8 = bt(D8), M8 = _e({}, ko, { data: 0 }), S0 = bt(M8), j8 = {
  Esc: "Escape",
  Spacebar: " ",
  Left: "ArrowLeft",
  Up: "ArrowUp",
  Right: "ArrowRight",
  Down: "ArrowDown",
  Del: "Delete",
  Win: "OS",
  Menu: "ContextMenu",
  Apps: "ContextMenu",
  Scroll: "ScrollLock",
  MozPrintableKey: "Unidentified"
}, F8 = {
  8: "Backspace",
  9: "Tab",
  12: "Clear",
  13: "Enter",
  16: "Shift",
  17: "Control",
  18: "Alt",
  19: "Pause",
  20: "CapsLock",
  27: "Escape",
  32: " ",
  33: "PageUp",
  34: "PageDown",
  35: "End",
  36: "Home",
  37: "ArrowLeft",
  38: "ArrowUp",
  39: "ArrowRight",
  40: "ArrowDown",
  45: "Insert",
  46: "Delete",
  112: "F1",
  113: "F2",
  114: "F3",
  115: "F4",
  116: "F5",
  117: "F6",
  118: "F7",
  119: "F8",
  120: "F9",
  121: "F10",
  122: "F11",
  123: "F12",
  144: "NumLock",
  145: "ScrollLock",
  224: "Meta"
}, H8 = { Alt: "altKey", Control: "ctrlKey", Meta: "metaKey", Shift: "shiftKey" };
function U8(e) {
  var t = this.nativeEvent;
  return t.getModifierState ? t.getModifierState(e) : (e = H8[e]) ? !!t[e] : !1;
}
function sd() {
  return U8;
}
var V8 = _e({}, Ya, { key: function(e) {
  if (e.key) {
    var t = j8[e.key] || e.key;
    if (t !== "Unidentified") return t;
  }
  return e.type === "keypress" ? (e = Ni(e), e === 13 ? "Enter" : String.fromCharCode(e)) : e.type === "keydown" || e.type === "keyup" ? F8[e.keyCode] || "Unidentified" : "";
}, code: 0, location: 0, ctrlKey: 0, shiftKey: 0, altKey: 0, metaKey: 0, repeat: 0, locale: 0, getModifierState: sd, charCode: function(e) {
  return e.type === "keypress" ? Ni(e) : 0;
}, keyCode: function(e) {
  return e.type === "keydown" || e.type === "keyup" ? e.keyCode : 0;
}, which: function(e) {
  return e.type === "keypress" ? Ni(e) : e.type === "keydown" || e.type === "keyup" ? e.keyCode : 0;
} }), z8 = bt(V8), B8 = _e({}, qs, { pointerId: 0, width: 0, height: 0, pressure: 0, tangentialPressure: 0, tiltX: 0, tiltY: 0, twist: 0, pointerType: 0, isPrimary: 0 }), k0 = bt(B8), W8 = _e({}, Ya, { touches: 0, targetTouches: 0, changedTouches: 0, altKey: 0, metaKey: 0, ctrlKey: 0, shiftKey: 0, getModifierState: sd }), G8 = bt(W8), Z8 = _e({}, ko, { propertyName: 0, elapsedTime: 0, pseudoElement: 0 }), Y8 = bt(Z8), K8 = _e({}, qs, {
  deltaX: function(e) {
    return "deltaX" in e ? e.deltaX : "wheelDeltaX" in e ? -e.wheelDeltaX : 0;
  },
  deltaY: function(e) {
    return "deltaY" in e ? e.deltaY : "wheelDeltaY" in e ? -e.wheelDeltaY : "wheelDelta" in e ? -e.wheelDelta : 0;
  },
  deltaZ: 0,
  deltaMode: 0
}), X8 = bt(K8), J8 = [9, 13, 27, 32], ld = En && "CompositionEvent" in window, Yo = null;
En && "documentMode" in document && (Yo = document.documentMode);
var Q8 = En && "TextEvent" in window && !Yo, tx = En && (!ld || Yo && 8 < Yo && 11 >= Yo), E0 = " ", C0 = !1;
function nx(e, t) {
  switch (e) {
    case "keyup":
      return J8.indexOf(t.keyCode) !== -1;
    case "keydown":
      return t.keyCode !== 229;
    case "keypress":
    case "mousedown":
    case "focusout":
      return !0;
    default:
      return !1;
  }
}
function rx(e) {
  return e = e.detail, typeof e == "object" && "data" in e ? e.data : null;
}
var zr = !1;
function q8(e, t) {
  switch (e) {
    case "compositionend":
      return rx(t);
    case "keypress":
      return t.which !== 32 ? null : (C0 = !0, E0);
    case "textInput":
      return e = t.data, e === E0 && C0 ? null : e;
    default:
      return null;
  }
}
function eA(e, t) {
  if (zr) return e === "compositionend" || !ld && nx(e, t) ? (e = ex(), Oi = ad = Un = null, zr = !1, e) : null;
  switch (e) {
    case "paste":
      return null;
    case "keypress":
      if (!(t.ctrlKey || t.altKey || t.metaKey) || t.ctrlKey && t.altKey) {
        if (t.char && 1 < t.char.length) return t.char;
        if (t.which) return String.fromCharCode(t.which);
      }
      return null;
    case "compositionend":
      return tx && t.locale !== "ko" ? null : t.data;
    default:
      return null;
  }
}
var tA = { color: !0, date: !0, datetime: !0, "datetime-local": !0, email: !0, month: !0, number: !0, password: !0, range: !0, search: !0, tel: !0, text: !0, time: !0, url: !0, week: !0 };
function T0(e) {
  var t = e && e.nodeName && e.nodeName.toLowerCase();
  return t === "input" ? !!tA[e.type] : t === "textarea";
}
function ox(e, t, n, r) {
  Dm(r), t = fs(t, "onChange"), 0 < t.length && (n = new id("onChange", "change", null, n, r), e.push({ event: n, listeners: t }));
}
var Ko = null, Na = null;
function nA(e) {
  mx(e, 0);
}
function el(e) {
  var t = Gr(e);
  if (Om(t)) return e;
}
function rA(e, t) {
  if (e === "change") return t;
}
var ax = !1;
if (En) {
  var Ml;
  if (En) {
    var jl = "oninput" in document;
    if (!jl) {
      var O0 = document.createElement("div");
      O0.setAttribute("oninput", "return;"), jl = typeof O0.oninput == "function";
    }
    Ml = jl;
  } else Ml = !1;
  ax = Ml && (!document.documentMode || 9 < document.documentMode);
}
function N0() {
  Ko && (Ko.detachEvent("onpropertychange", ix), Na = Ko = null);
}
function ix(e) {
  if (e.propertyName === "value" && el(Na)) {
    var t = [];
    ox(t, Na, e, ed(e)), Fm(nA, t);
  }
}
function oA(e, t, n) {
  e === "focusin" ? (N0(), Ko = t, Na = n, Ko.attachEvent("onpropertychange", ix)) : e === "focusout" && N0();
}
function aA(e) {
  if (e === "selectionchange" || e === "keyup" || e === "keydown") return el(Na);
}
function iA(e, t) {
  if (e === "click") return el(t);
}
function sA(e, t) {
  if (e === "input" || e === "change") return el(t);
}
function lA(e, t) {
  return e === t && (e !== 0 || 1 / e === 1 / t) || e !== e && t !== t;
}
var Wt = typeof Object.is == "function" ? Object.is : lA;
function Ia(e, t) {
  if (Wt(e, t)) return !0;
  if (typeof e != "object" || e === null || typeof t != "object" || t === null) return !1;
  var n = Object.keys(e), r = Object.keys(t);
  if (n.length !== r.length) return !1;
  for (r = 0; r < n.length; r++) {
    var o = n[r];
    if (!Nu.call(t, o) || !Wt(e[o], t[o])) return !1;
  }
  return !0;
}
function I0(e) {
  for (; e && e.firstChild; ) e = e.firstChild;
  return e;
}
function L0(e, t) {
  var n = I0(e);
  e = 0;
  for (var r; n; ) {
    if (n.nodeType === 3) {
      if (r = e + n.textContent.length, e <= t && r >= t) return { node: n, offset: t - e };
      e = r;
    }
    e: {
      for (; n; ) {
        if (n.nextSibling) {
          n = n.nextSibling;
          break e;
        }
        n = n.parentNode;
      }
      n = void 0;
    }
    n = I0(n);
  }
}
function sx(e, t) {
  return e && t ? e === t ? !0 : e && e.nodeType === 3 ? !1 : t && t.nodeType === 3 ? sx(e, t.parentNode) : "contains" in e ? e.contains(t) : e.compareDocumentPosition ? !!(e.compareDocumentPosition(t) & 16) : !1 : !1;
}
function lx() {
  for (var e = window, t = as(); t instanceof e.HTMLIFrameElement; ) {
    try {
      var n = typeof t.contentWindow.location.href == "string";
    } catch {
      n = !1;
    }
    if (n) e = t.contentWindow;
    else break;
    t = as(e.document);
  }
  return t;
}
function ud(e) {
  var t = e && e.nodeName && e.nodeName.toLowerCase();
  return t && (t === "input" && (e.type === "text" || e.type === "search" || e.type === "tel" || e.type === "url" || e.type === "password") || t === "textarea" || e.contentEditable === "true");
}
function uA(e) {
  var t = lx(), n = e.focusedElem, r = e.selectionRange;
  if (t !== n && n && n.ownerDocument && sx(n.ownerDocument.documentElement, n)) {
    if (r !== null && ud(n)) {
      if (t = r.start, e = r.end, e === void 0 && (e = t), "selectionStart" in n) n.selectionStart = t, n.selectionEnd = Math.min(e, n.value.length);
      else if (e = (t = n.ownerDocument || document) && t.defaultView || window, e.getSelection) {
        e = e.getSelection();
        var o = n.textContent.length, a = Math.min(r.start, o);
        r = r.end === void 0 ? a : Math.min(r.end, o), !e.extend && a > r && (o = r, r = a, a = o), o = L0(n, a);
        var i = L0(
          n,
          r
        );
        o && i && (e.rangeCount !== 1 || e.anchorNode !== o.node || e.anchorOffset !== o.offset || e.focusNode !== i.node || e.focusOffset !== i.offset) && (t = t.createRange(), t.setStart(o.node, o.offset), e.removeAllRanges(), a > r ? (e.addRange(t), e.extend(i.node, i.offset)) : (t.setEnd(i.node, i.offset), e.addRange(t)));
      }
    }
    for (t = [], e = n; e = e.parentNode; ) e.nodeType === 1 && t.push({ element: e, left: e.scrollLeft, top: e.scrollTop });
    for (typeof n.focus == "function" && n.focus(), n = 0; n < t.length; n++) e = t[n], e.element.scrollLeft = e.left, e.element.scrollTop = e.top;
  }
}
var cA = En && "documentMode" in document && 11 >= document.documentMode, Br = null, Yu = null, Xo = null, Ku = !1;
function A0(e, t, n) {
  var r = n.window === n ? n.document : n.nodeType === 9 ? n : n.ownerDocument;
  Ku || Br == null || Br !== as(r) || (r = Br, "selectionStart" in r && ud(r) ? r = { start: r.selectionStart, end: r.selectionEnd } : (r = (r.ownerDocument && r.ownerDocument.defaultView || window).getSelection(), r = { anchorNode: r.anchorNode, anchorOffset: r.anchorOffset, focusNode: r.focusNode, focusOffset: r.focusOffset }), Xo && Ia(Xo, r) || (Xo = r, r = fs(Yu, "onSelect"), 0 < r.length && (t = new id("onSelect", "select", null, t, n), e.push({ event: t, listeners: r }), t.target = Br)));
}
function ci(e, t) {
  var n = {};
  return n[e.toLowerCase()] = t.toLowerCase(), n["Webkit" + e] = "webkit" + t, n["Moz" + e] = "moz" + t, n;
}
var Wr = { animationend: ci("Animation", "AnimationEnd"), animationiteration: ci("Animation", "AnimationIteration"), animationstart: ci("Animation", "AnimationStart"), transitionend: ci("Transition", "TransitionEnd") }, Fl = {}, ux = {};
En && (ux = document.createElement("div").style, "AnimationEvent" in window || (delete Wr.animationend.animation, delete Wr.animationiteration.animation, delete Wr.animationstart.animation), "TransitionEvent" in window || delete Wr.transitionend.transition);
function tl(e) {
  if (Fl[e]) return Fl[e];
  if (!Wr[e]) return e;
  var t = Wr[e], n;
  for (n in t) if (t.hasOwnProperty(n) && n in ux) return Fl[e] = t[n];
  return e;
}
var cx = tl("animationend"), dx = tl("animationiteration"), fx = tl("animationstart"), px = tl("transitionend"), hx = /* @__PURE__ */ new Map(), R0 = "abort auxClick cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");
function ir(e, t) {
  hx.set(e, t), Tr(t, [e]);
}
for (var Hl = 0; Hl < R0.length; Hl++) {
  var Ul = R0[Hl], dA = Ul.toLowerCase(), fA = Ul[0].toUpperCase() + Ul.slice(1);
  ir(dA, "on" + fA);
}
ir(cx, "onAnimationEnd");
ir(dx, "onAnimationIteration");
ir(fx, "onAnimationStart");
ir("dblclick", "onDoubleClick");
ir("focusin", "onFocus");
ir("focusout", "onBlur");
ir(px, "onTransitionEnd");
mo("onMouseEnter", ["mouseout", "mouseover"]);
mo("onMouseLeave", ["mouseout", "mouseover"]);
mo("onPointerEnter", ["pointerout", "pointerover"]);
mo("onPointerLeave", ["pointerout", "pointerover"]);
Tr("onChange", "change click focusin focusout input keydown keyup selectionchange".split(" "));
Tr("onSelect", "focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" "));
Tr("onBeforeInput", ["compositionend", "keypress", "textInput", "paste"]);
Tr("onCompositionEnd", "compositionend focusout keydown keypress keyup mousedown".split(" "));
Tr("onCompositionStart", "compositionstart focusout keydown keypress keyup mousedown".split(" "));
Tr("onCompositionUpdate", "compositionupdate focusout keydown keypress keyup mousedown".split(" "));
var Bo = "abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" "), pA = new Set("cancel close invalid load scroll toggle".split(" ").concat(Bo));
function P0(e, t, n) {
  var r = e.type || "unknown-event";
  e.currentTarget = n, d8(r, t, void 0, e), e.currentTarget = null;
}
function mx(e, t) {
  t = (t & 4) !== 0;
  for (var n = 0; n < e.length; n++) {
    var r = e[n], o = r.event;
    r = r.listeners;
    e: {
      var a = void 0;
      if (t) for (var i = r.length - 1; 0 <= i; i--) {
        var s = r[i], l = s.instance, c = s.currentTarget;
        if (s = s.listener, l !== a && o.isPropagationStopped()) break e;
        P0(o, s, c), a = l;
      }
      else for (i = 0; i < r.length; i++) {
        if (s = r[i], l = s.instance, c = s.currentTarget, s = s.listener, l !== a && o.isPropagationStopped()) break e;
        P0(o, s, c), a = l;
      }
    }
  }
  if (ss) throw e = Bu, ss = !1, Bu = null, e;
}
function me(e, t) {
  var n = t[ec];
  n === void 0 && (n = t[ec] = /* @__PURE__ */ new Set());
  var r = e + "__bubble";
  n.has(r) || (xx(t, e, 2, !1), n.add(r));
}
function Vl(e, t, n) {
  var r = 0;
  t && (r |= 4), xx(n, e, r, t);
}
var di = "_reactListening" + Math.random().toString(36).slice(2);
function La(e) {
  if (!e[di]) {
    e[di] = !0, Sm.forEach(function(n) {
      n !== "selectionchange" && (pA.has(n) || Vl(n, !1, e), Vl(n, !0, e));
    });
    var t = e.nodeType === 9 ? e : e.ownerDocument;
    t === null || t[di] || (t[di] = !0, Vl("selectionchange", !1, t));
  }
}
function xx(e, t, n, r) {
  switch (qm(t)) {
    case 1:
      var o = T8;
      break;
    case 4:
      o = O8;
      break;
    default:
      o = od;
  }
  n = o.bind(null, t, n, e), o = void 0, !zu || t !== "touchstart" && t !== "touchmove" && t !== "wheel" || (o = !0), r ? o !== void 0 ? e.addEventListener(t, n, { capture: !0, passive: o }) : e.addEventListener(t, n, !0) : o !== void 0 ? e.addEventListener(t, n, { passive: o }) : e.addEventListener(t, n, !1);
}
function zl(e, t, n, r, o) {
  var a = r;
  if (!(t & 1) && !(t & 2) && r !== null) e: for (; ; ) {
    if (r === null) return;
    var i = r.tag;
    if (i === 3 || i === 4) {
      var s = r.stateNode.containerInfo;
      if (s === o || s.nodeType === 8 && s.parentNode === o) break;
      if (i === 4) for (i = r.return; i !== null; ) {
        var l = i.tag;
        if ((l === 3 || l === 4) && (l = i.stateNode.containerInfo, l === o || l.nodeType === 8 && l.parentNode === o)) return;
        i = i.return;
      }
      for (; s !== null; ) {
        if (i = fr(s), i === null) return;
        if (l = i.tag, l === 5 || l === 6) {
          r = a = i;
          continue e;
        }
        s = s.parentNode;
      }
    }
    r = r.return;
  }
  Fm(function() {
    var c = a, d = ed(n), f = [];
    e: {
      var p = hx.get(e);
      if (p !== void 0) {
        var g = id, y = e;
        switch (e) {
          case "keypress":
            if (Ni(n) === 0) break e;
          case "keydown":
          case "keyup":
            g = z8;
            break;
          case "focusin":
            y = "focus", g = $l;
            break;
          case "focusout":
            y = "blur", g = $l;
            break;
          case "beforeblur":
          case "afterblur":
            g = $l;
            break;
          case "click":
            if (n.button === 2) break e;
          case "auxclick":
          case "dblclick":
          case "mousedown":
          case "mousemove":
          case "mouseup":
          case "mouseout":
          case "mouseover":
          case "contextmenu":
            g = _0;
            break;
          case "drag":
          case "dragend":
          case "dragenter":
          case "dragexit":
          case "dragleave":
          case "dragover":
          case "dragstart":
          case "drop":
            g = L8;
            break;
          case "touchcancel":
          case "touchend":
          case "touchmove":
          case "touchstart":
            g = G8;
            break;
          case cx:
          case dx:
          case fx:
            g = P8;
            break;
          case px:
            g = Y8;
            break;
          case "scroll":
            g = N8;
            break;
          case "wheel":
            g = X8;
            break;
          case "copy":
          case "cut":
          case "paste":
            g = $8;
            break;
          case "gotpointercapture":
          case "lostpointercapture":
          case "pointercancel":
          case "pointerdown":
          case "pointermove":
          case "pointerout":
          case "pointerover":
          case "pointerup":
            g = k0;
        }
        var m = (t & 4) !== 0, b = !m && e === "scroll", u = m ? p !== null ? p + "Capture" : null : p;
        m = [];
        for (var h = c, x; h !== null; ) {
          x = h;
          var w = x.stateNode;
          if (x.tag === 5 && w !== null && (x = w, u !== null && (w = Ea(h, u), w != null && m.push(Aa(h, w, x)))), b) break;
          h = h.return;
        }
        0 < m.length && (p = new g(p, y, null, n, d), f.push({ event: p, listeners: m }));
      }
    }
    if (!(t & 7)) {
      e: {
        if (p = e === "mouseover" || e === "pointerover", g = e === "mouseout" || e === "pointerout", p && n !== Uu && (y = n.relatedTarget || n.fromElement) && (fr(y) || y[Cn])) break e;
        if ((g || p) && (p = d.window === d ? d : (p = d.ownerDocument) ? p.defaultView || p.parentWindow : window, g ? (y = n.relatedTarget || n.toElement, g = c, y = y ? fr(y) : null, y !== null && (b = Or(y), y !== b || y.tag !== 5 && y.tag !== 6) && (y = null)) : (g = null, y = c), g !== y)) {
          if (m = _0, w = "onMouseLeave", u = "onMouseEnter", h = "mouse", (e === "pointerout" || e === "pointerover") && (m = k0, w = "onPointerLeave", u = "onPointerEnter", h = "pointer"), b = g == null ? p : Gr(g), x = y == null ? p : Gr(y), p = new m(w, h + "leave", g, n, d), p.target = b, p.relatedTarget = x, w = null, fr(d) === c && (m = new m(u, h + "enter", y, n, d), m.target = x, m.relatedTarget = b, w = m), b = w, g && y) t: {
            for (m = g, u = y, h = 0, x = m; x; x = $r(x)) h++;
            for (x = 0, w = u; w; w = $r(w)) x++;
            for (; 0 < h - x; ) m = $r(m), h--;
            for (; 0 < x - h; ) u = $r(u), x--;
            for (; h--; ) {
              if (m === u || u !== null && m === u.alternate) break t;
              m = $r(m), u = $r(u);
            }
            m = null;
          }
          else m = null;
          g !== null && D0(f, p, g, m, !1), y !== null && b !== null && D0(f, b, y, m, !0);
        }
      }
      e: {
        if (p = c ? Gr(c) : window, g = p.nodeName && p.nodeName.toLowerCase(), g === "select" || g === "input" && p.type === "file") var S = rA;
        else if (T0(p)) if (ax) S = sA;
        else {
          S = aA;
          var E = oA;
        }
        else (g = p.nodeName) && g.toLowerCase() === "input" && (p.type === "checkbox" || p.type === "radio") && (S = iA);
        if (S && (S = S(e, c))) {
          ox(f, S, n, d);
          break e;
        }
        E && E(e, p, c), e === "focusout" && (E = p._wrapperState) && E.controlled && p.type === "number" && $u(p, "number", p.value);
      }
      switch (E = c ? Gr(c) : window, e) {
        case "focusin":
          (T0(E) || E.contentEditable === "true") && (Br = E, Yu = c, Xo = null);
          break;
        case "focusout":
          Xo = Yu = Br = null;
          break;
        case "mousedown":
          Ku = !0;
          break;
        case "contextmenu":
        case "mouseup":
        case "dragend":
          Ku = !1, A0(f, n, d);
          break;
        case "selectionchange":
          if (cA) break;
        case "keydown":
        case "keyup":
          A0(f, n, d);
      }
      var k;
      if (ld) e: {
        switch (e) {
          case "compositionstart":
            var L = "onCompositionStart";
            break e;
          case "compositionend":
            L = "onCompositionEnd";
            break e;
          case "compositionupdate":
            L = "onCompositionUpdate";
            break e;
        }
        L = void 0;
      }
      else zr ? nx(e, n) && (L = "onCompositionEnd") : e === "keydown" && n.keyCode === 229 && (L = "onCompositionStart");
      L && (tx && n.locale !== "ko" && (zr || L !== "onCompositionStart" ? L === "onCompositionEnd" && zr && (k = ex()) : (Un = d, ad = "value" in Un ? Un.value : Un.textContent, zr = !0)), E = fs(c, L), 0 < E.length && (L = new S0(L, e, null, n, d), f.push({ event: L, listeners: E }), k ? L.data = k : (k = rx(n), k !== null && (L.data = k)))), (k = Q8 ? q8(e, n) : eA(e, n)) && (c = fs(c, "onBeforeInput"), 0 < c.length && (d = new S0("onBeforeInput", "beforeinput", null, n, d), f.push({ event: d, listeners: c }), d.data = k));
    }
    mx(f, t);
  });
}
function Aa(e, t, n) {
  return { instance: e, listener: t, currentTarget: n };
}
function fs(e, t) {
  for (var n = t + "Capture", r = []; e !== null; ) {
    var o = e, a = o.stateNode;
    o.tag === 5 && a !== null && (o = a, a = Ea(e, n), a != null && r.unshift(Aa(e, a, o)), a = Ea(e, t), a != null && r.push(Aa(e, a, o))), e = e.return;
  }
  return r;
}
function $r(e) {
  if (e === null) return null;
  do
    e = e.return;
  while (e && e.tag !== 5);
  return e || null;
}
function D0(e, t, n, r, o) {
  for (var a = t._reactName, i = []; n !== null && n !== r; ) {
    var s = n, l = s.alternate, c = s.stateNode;
    if (l !== null && l === r) break;
    s.tag === 5 && c !== null && (s = c, o ? (l = Ea(n, a), l != null && i.unshift(Aa(n, l, s))) : o || (l = Ea(n, a), l != null && i.push(Aa(n, l, s)))), n = n.return;
  }
  i.length !== 0 && e.push({ event: t, listeners: i });
}
var hA = /\r\n?/g, mA = /\u0000|\uFFFD/g;
function $0(e) {
  return (typeof e == "string" ? e : "" + e).replace(hA, `
`).replace(mA, "");
}
function fi(e, t, n) {
  if (t = $0(t), $0(e) !== t && n) throw Error(C(425));
}
function ps() {
}
var Xu = null, Ju = null;
function Qu(e, t) {
  return e === "textarea" || e === "noscript" || typeof t.children == "string" || typeof t.children == "number" || typeof t.dangerouslySetInnerHTML == "object" && t.dangerouslySetInnerHTML !== null && t.dangerouslySetInnerHTML.__html != null;
}
var qu = typeof setTimeout == "function" ? setTimeout : void 0, xA = typeof clearTimeout == "function" ? clearTimeout : void 0, M0 = typeof Promise == "function" ? Promise : void 0, gA = typeof queueMicrotask == "function" ? queueMicrotask : typeof M0 < "u" ? function(e) {
  return M0.resolve(null).then(e).catch(vA);
} : qu;
function vA(e) {
  setTimeout(function() {
    throw e;
  });
}
function Bl(e, t) {
  var n = t, r = 0;
  do {
    var o = n.nextSibling;
    if (e.removeChild(n), o && o.nodeType === 8) if (n = o.data, n === "/$") {
      if (r === 0) {
        e.removeChild(o), Oa(t);
        return;
      }
      r--;
    } else n !== "$" && n !== "$?" && n !== "$!" || r++;
    n = o;
  } while (n);
  Oa(t);
}
function Zn(e) {
  for (; e != null; e = e.nextSibling) {
    var t = e.nodeType;
    if (t === 1 || t === 3) break;
    if (t === 8) {
      if (t = e.data, t === "$" || t === "$!" || t === "$?") break;
      if (t === "/$") return null;
    }
  }
  return e;
}
function j0(e) {
  e = e.previousSibling;
  for (var t = 0; e; ) {
    if (e.nodeType === 8) {
      var n = e.data;
      if (n === "$" || n === "$!" || n === "$?") {
        if (t === 0) return e;
        t--;
      } else n === "/$" && t++;
    }
    e = e.previousSibling;
  }
  return null;
}
var Eo = Math.random().toString(36).slice(2), tn = "__reactFiber$" + Eo, Ra = "__reactProps$" + Eo, Cn = "__reactContainer$" + Eo, ec = "__reactEvents$" + Eo, yA = "__reactListeners$" + Eo, wA = "__reactHandles$" + Eo;
function fr(e) {
  var t = e[tn];
  if (t) return t;
  for (var n = e.parentNode; n; ) {
    if (t = n[Cn] || n[tn]) {
      if (n = t.alternate, t.child !== null || n !== null && n.child !== null) for (e = j0(e); e !== null; ) {
        if (n = e[tn]) return n;
        e = j0(e);
      }
      return t;
    }
    e = n, n = e.parentNode;
  }
  return null;
}
function Ka(e) {
  return e = e[tn] || e[Cn], !e || e.tag !== 5 && e.tag !== 6 && e.tag !== 13 && e.tag !== 3 ? null : e;
}
function Gr(e) {
  if (e.tag === 5 || e.tag === 6) return e.stateNode;
  throw Error(C(33));
}
function nl(e) {
  return e[Ra] || null;
}
var tc = [], Zr = -1;
function sr(e) {
  return { current: e };
}
function xe(e) {
  0 > Zr || (e.current = tc[Zr], tc[Zr] = null, Zr--);
}
function pe(e, t) {
  Zr++, tc[Zr] = e.current, e.current = t;
}
var or = {}, Ke = sr(or), at = sr(!1), br = or;
function xo(e, t) {
  var n = e.type.contextTypes;
  if (!n) return or;
  var r = e.stateNode;
  if (r && r.__reactInternalMemoizedUnmaskedChildContext === t) return r.__reactInternalMemoizedMaskedChildContext;
  var o = {}, a;
  for (a in n) o[a] = t[a];
  return r && (e = e.stateNode, e.__reactInternalMemoizedUnmaskedChildContext = t, e.__reactInternalMemoizedMaskedChildContext = o), o;
}
function it(e) {
  return e = e.childContextTypes, e != null;
}
function hs() {
  xe(at), xe(Ke);
}
function F0(e, t, n) {
  if (Ke.current !== or) throw Error(C(168));
  pe(Ke, t), pe(at, n);
}
function gx(e, t, n) {
  var r = e.stateNode;
  if (t = t.childContextTypes, typeof r.getChildContext != "function") return n;
  r = r.getChildContext();
  for (var o in r) if (!(o in t)) throw Error(C(108, o8(e) || "Unknown", o));
  return _e({}, n, r);
}
function ms(e) {
  return e = (e = e.stateNode) && e.__reactInternalMemoizedMergedChildContext || or, br = Ke.current, pe(Ke, e), pe(at, at.current), !0;
}
function H0(e, t, n) {
  var r = e.stateNode;
  if (!r) throw Error(C(169));
  n ? (e = gx(e, t, br), r.__reactInternalMemoizedMergedChildContext = e, xe(at), xe(Ke), pe(Ke, e)) : xe(at), pe(at, n);
}
var yn = null, rl = !1, Wl = !1;
function vx(e) {
  yn === null ? yn = [e] : yn.push(e);
}
function bA(e) {
  rl = !0, vx(e);
}
function lr() {
  if (!Wl && yn !== null) {
    Wl = !0;
    var e = 0, t = ue;
    try {
      var n = yn;
      for (ue = 1; e < n.length; e++) {
        var r = n[e];
        do
          r = r(!0);
        while (r !== null);
      }
      yn = null, rl = !1;
    } catch (o) {
      throw yn !== null && (yn = yn.slice(e + 1)), zm(td, lr), o;
    } finally {
      ue = t, Wl = !1;
    }
  }
  return null;
}
var Yr = [], Kr = 0, xs = null, gs = 0, kt = [], Et = 0, _r = null, wn = 1, bn = "";
function ur(e, t) {
  Yr[Kr++] = gs, Yr[Kr++] = xs, xs = e, gs = t;
}
function yx(e, t, n) {
  kt[Et++] = wn, kt[Et++] = bn, kt[Et++] = _r, _r = e;
  var r = wn;
  e = bn;
  var o = 32 - Vt(r) - 1;
  r &= ~(1 << o), n += 1;
  var a = 32 - Vt(t) + o;
  if (30 < a) {
    var i = o - o % 5;
    a = (r & (1 << i) - 1).toString(32), r >>= i, o -= i, wn = 1 << 32 - Vt(t) + o | n << o | r, bn = a + e;
  } else wn = 1 << a | n << o | r, bn = e;
}
function cd(e) {
  e.return !== null && (ur(e, 1), yx(e, 1, 0));
}
function dd(e) {
  for (; e === xs; ) xs = Yr[--Kr], Yr[Kr] = null, gs = Yr[--Kr], Yr[Kr] = null;
  for (; e === _r; ) _r = kt[--Et], kt[Et] = null, bn = kt[--Et], kt[Et] = null, wn = kt[--Et], kt[Et] = null;
}
var gt = null, ht = null, ve = !1, jt = null;
function wx(e, t) {
  var n = Ct(5, null, null, 0);
  n.elementType = "DELETED", n.stateNode = t, n.return = e, t = e.deletions, t === null ? (e.deletions = [n], e.flags |= 16) : t.push(n);
}
function U0(e, t) {
  switch (e.tag) {
    case 5:
      var n = e.type;
      return t = t.nodeType !== 1 || n.toLowerCase() !== t.nodeName.toLowerCase() ? null : t, t !== null ? (e.stateNode = t, gt = e, ht = Zn(t.firstChild), !0) : !1;
    case 6:
      return t = e.pendingProps === "" || t.nodeType !== 3 ? null : t, t !== null ? (e.stateNode = t, gt = e, ht = null, !0) : !1;
    case 13:
      return t = t.nodeType !== 8 ? null : t, t !== null ? (n = _r !== null ? { id: wn, overflow: bn } : null, e.memoizedState = { dehydrated: t, treeContext: n, retryLane: 1073741824 }, n = Ct(18, null, null, 0), n.stateNode = t, n.return = e, e.child = n, gt = e, ht = null, !0) : !1;
    default:
      return !1;
  }
}
function nc(e) {
  return (e.mode & 1) !== 0 && (e.flags & 128) === 0;
}
function rc(e) {
  if (ve) {
    var t = ht;
    if (t) {
      var n = t;
      if (!U0(e, t)) {
        if (nc(e)) throw Error(C(418));
        t = Zn(n.nextSibling);
        var r = gt;
        t && U0(e, t) ? wx(r, n) : (e.flags = e.flags & -4097 | 2, ve = !1, gt = e);
      }
    } else {
      if (nc(e)) throw Error(C(418));
      e.flags = e.flags & -4097 | 2, ve = !1, gt = e;
    }
  }
}
function V0(e) {
  for (e = e.return; e !== null && e.tag !== 5 && e.tag !== 3 && e.tag !== 13; ) e = e.return;
  gt = e;
}
function pi(e) {
  if (e !== gt) return !1;
  if (!ve) return V0(e), ve = !0, !1;
  var t;
  if ((t = e.tag !== 3) && !(t = e.tag !== 5) && (t = e.type, t = t !== "head" && t !== "body" && !Qu(e.type, e.memoizedProps)), t && (t = ht)) {
    if (nc(e)) throw bx(), Error(C(418));
    for (; t; ) wx(e, t), t = Zn(t.nextSibling);
  }
  if (V0(e), e.tag === 13) {
    if (e = e.memoizedState, e = e !== null ? e.dehydrated : null, !e) throw Error(C(317));
    e: {
      for (e = e.nextSibling, t = 0; e; ) {
        if (e.nodeType === 8) {
          var n = e.data;
          if (n === "/$") {
            if (t === 0) {
              ht = Zn(e.nextSibling);
              break e;
            }
            t--;
          } else n !== "$" && n !== "$!" && n !== "$?" || t++;
        }
        e = e.nextSibling;
      }
      ht = null;
    }
  } else ht = gt ? Zn(e.stateNode.nextSibling) : null;
  return !0;
}
function bx() {
  for (var e = ht; e; ) e = Zn(e.nextSibling);
}
function go() {
  ht = gt = null, ve = !1;
}
function fd(e) {
  jt === null ? jt = [e] : jt.push(e);
}
var _A = Ln.ReactCurrentBatchConfig;
function $o(e, t, n) {
  if (e = n.ref, e !== null && typeof e != "function" && typeof e != "object") {
    if (n._owner) {
      if (n = n._owner, n) {
        if (n.tag !== 1) throw Error(C(309));
        var r = n.stateNode;
      }
      if (!r) throw Error(C(147, e));
      var o = r, a = "" + e;
      return t !== null && t.ref !== null && typeof t.ref == "function" && t.ref._stringRef === a ? t.ref : (t = function(i) {
        var s = o.refs;
        i === null ? delete s[a] : s[a] = i;
      }, t._stringRef = a, t);
    }
    if (typeof e != "string") throw Error(C(284));
    if (!n._owner) throw Error(C(290, e));
  }
  return e;
}
function hi(e, t) {
  throw e = Object.prototype.toString.call(t), Error(C(31, e === "[object Object]" ? "object with keys {" + Object.keys(t).join(", ") + "}" : e));
}
function z0(e) {
  var t = e._init;
  return t(e._payload);
}
function _x(e) {
  function t(u, h) {
    if (e) {
      var x = u.deletions;
      x === null ? (u.deletions = [h], u.flags |= 16) : x.push(h);
    }
  }
  function n(u, h) {
    if (!e) return null;
    for (; h !== null; ) t(u, h), h = h.sibling;
    return null;
  }
  function r(u, h) {
    for (u = /* @__PURE__ */ new Map(); h !== null; ) h.key !== null ? u.set(h.key, h) : u.set(h.index, h), h = h.sibling;
    return u;
  }
  function o(u, h) {
    return u = Jn(u, h), u.index = 0, u.sibling = null, u;
  }
  function a(u, h, x) {
    return u.index = x, e ? (x = u.alternate, x !== null ? (x = x.index, x < h ? (u.flags |= 2, h) : x) : (u.flags |= 2, h)) : (u.flags |= 1048576, h);
  }
  function i(u) {
    return e && u.alternate === null && (u.flags |= 2), u;
  }
  function s(u, h, x, w) {
    return h === null || h.tag !== 6 ? (h = Ql(x, u.mode, w), h.return = u, h) : (h = o(h, x), h.return = u, h);
  }
  function l(u, h, x, w) {
    var S = x.type;
    return S === Vr ? d(u, h, x.props.children, w, x.key) : h !== null && (h.elementType === S || typeof S == "object" && S !== null && S.$$typeof === Dn && z0(S) === h.type) ? (w = o(h, x.props), w.ref = $o(u, h, x), w.return = u, w) : (w = $i(x.type, x.key, x.props, null, u.mode, w), w.ref = $o(u, h, x), w.return = u, w);
  }
  function c(u, h, x, w) {
    return h === null || h.tag !== 4 || h.stateNode.containerInfo !== x.containerInfo || h.stateNode.implementation !== x.implementation ? (h = ql(x, u.mode, w), h.return = u, h) : (h = o(h, x.children || []), h.return = u, h);
  }
  function d(u, h, x, w, S) {
    return h === null || h.tag !== 7 ? (h = gr(x, u.mode, w, S), h.return = u, h) : (h = o(h, x), h.return = u, h);
  }
  function f(u, h, x) {
    if (typeof h == "string" && h !== "" || typeof h == "number") return h = Ql("" + h, u.mode, x), h.return = u, h;
    if (typeof h == "object" && h !== null) {
      switch (h.$$typeof) {
        case ri:
          return x = $i(h.type, h.key, h.props, null, u.mode, x), x.ref = $o(u, null, h), x.return = u, x;
        case Ur:
          return h = ql(h, u.mode, x), h.return = u, h;
        case Dn:
          var w = h._init;
          return f(u, w(h._payload), x);
      }
      if (Vo(h) || Lo(h)) return h = gr(h, u.mode, x, null), h.return = u, h;
      hi(u, h);
    }
    return null;
  }
  function p(u, h, x, w) {
    var S = h !== null ? h.key : null;
    if (typeof x == "string" && x !== "" || typeof x == "number") return S !== null ? null : s(u, h, "" + x, w);
    if (typeof x == "object" && x !== null) {
      switch (x.$$typeof) {
        case ri:
          return x.key === S ? l(u, h, x, w) : null;
        case Ur:
          return x.key === S ? c(u, h, x, w) : null;
        case Dn:
          return S = x._init, p(
            u,
            h,
            S(x._payload),
            w
          );
      }
      if (Vo(x) || Lo(x)) return S !== null ? null : d(u, h, x, w, null);
      hi(u, x);
    }
    return null;
  }
  function g(u, h, x, w, S) {
    if (typeof w == "string" && w !== "" || typeof w == "number") return u = u.get(x) || null, s(h, u, "" + w, S);
    if (typeof w == "object" && w !== null) {
      switch (w.$$typeof) {
        case ri:
          return u = u.get(w.key === null ? x : w.key) || null, l(h, u, w, S);
        case Ur:
          return u = u.get(w.key === null ? x : w.key) || null, c(h, u, w, S);
        case Dn:
          var E = w._init;
          return g(u, h, x, E(w._payload), S);
      }
      if (Vo(w) || Lo(w)) return u = u.get(x) || null, d(h, u, w, S, null);
      hi(h, w);
    }
    return null;
  }
  function y(u, h, x, w) {
    for (var S = null, E = null, k = h, L = h = 0, P = null; k !== null && L < x.length; L++) {
      k.index > L ? (P = k, k = null) : P = k.sibling;
      var O = p(u, k, x[L], w);
      if (O === null) {
        k === null && (k = P);
        break;
      }
      e && k && O.alternate === null && t(u, k), h = a(O, h, L), E === null ? S = O : E.sibling = O, E = O, k = P;
    }
    if (L === x.length) return n(u, k), ve && ur(u, L), S;
    if (k === null) {
      for (; L < x.length; L++) k = f(u, x[L], w), k !== null && (h = a(k, h, L), E === null ? S = k : E.sibling = k, E = k);
      return ve && ur(u, L), S;
    }
    for (k = r(u, k); L < x.length; L++) P = g(k, u, L, x[L], w), P !== null && (e && P.alternate !== null && k.delete(P.key === null ? L : P.key), h = a(P, h, L), E === null ? S = P : E.sibling = P, E = P);
    return e && k.forEach(function(j) {
      return t(u, j);
    }), ve && ur(u, L), S;
  }
  function m(u, h, x, w) {
    var S = Lo(x);
    if (typeof S != "function") throw Error(C(150));
    if (x = S.call(x), x == null) throw Error(C(151));
    for (var E = S = null, k = h, L = h = 0, P = null, O = x.next(); k !== null && !O.done; L++, O = x.next()) {
      k.index > L ? (P = k, k = null) : P = k.sibling;
      var j = p(u, k, O.value, w);
      if (j === null) {
        k === null && (k = P);
        break;
      }
      e && k && j.alternate === null && t(u, k), h = a(j, h, L), E === null ? S = j : E.sibling = j, E = j, k = P;
    }
    if (O.done) return n(
      u,
      k
    ), ve && ur(u, L), S;
    if (k === null) {
      for (; !O.done; L++, O = x.next()) O = f(u, O.value, w), O !== null && (h = a(O, h, L), E === null ? S = O : E.sibling = O, E = O);
      return ve && ur(u, L), S;
    }
    for (k = r(u, k); !O.done; L++, O = x.next()) O = g(k, u, L, O.value, w), O !== null && (e && O.alternate !== null && k.delete(O.key === null ? L : O.key), h = a(O, h, L), E === null ? S = O : E.sibling = O, E = O);
    return e && k.forEach(function(ne) {
      return t(u, ne);
    }), ve && ur(u, L), S;
  }
  function b(u, h, x, w) {
    if (typeof x == "object" && x !== null && x.type === Vr && x.key === null && (x = x.props.children), typeof x == "object" && x !== null) {
      switch (x.$$typeof) {
        case ri:
          e: {
            for (var S = x.key, E = h; E !== null; ) {
              if (E.key === S) {
                if (S = x.type, S === Vr) {
                  if (E.tag === 7) {
                    n(u, E.sibling), h = o(E, x.props.children), h.return = u, u = h;
                    break e;
                  }
                } else if (E.elementType === S || typeof S == "object" && S !== null && S.$$typeof === Dn && z0(S) === E.type) {
                  n(u, E.sibling), h = o(E, x.props), h.ref = $o(u, E, x), h.return = u, u = h;
                  break e;
                }
                n(u, E);
                break;
              } else t(u, E);
              E = E.sibling;
            }
            x.type === Vr ? (h = gr(x.props.children, u.mode, w, x.key), h.return = u, u = h) : (w = $i(x.type, x.key, x.props, null, u.mode, w), w.ref = $o(u, h, x), w.return = u, u = w);
          }
          return i(u);
        case Ur:
          e: {
            for (E = x.key; h !== null; ) {
              if (h.key === E) if (h.tag === 4 && h.stateNode.containerInfo === x.containerInfo && h.stateNode.implementation === x.implementation) {
                n(u, h.sibling), h = o(h, x.children || []), h.return = u, u = h;
                break e;
              } else {
                n(u, h);
                break;
              }
              else t(u, h);
              h = h.sibling;
            }
            h = ql(x, u.mode, w), h.return = u, u = h;
          }
          return i(u);
        case Dn:
          return E = x._init, b(u, h, E(x._payload), w);
      }
      if (Vo(x)) return y(u, h, x, w);
      if (Lo(x)) return m(u, h, x, w);
      hi(u, x);
    }
    return typeof x == "string" && x !== "" || typeof x == "number" ? (x = "" + x, h !== null && h.tag === 6 ? (n(u, h.sibling), h = o(h, x), h.return = u, u = h) : (n(u, h), h = Ql(x, u.mode, w), h.return = u, u = h), i(u)) : n(u, h);
  }
  return b;
}
var vo = _x(!0), Sx = _x(!1), vs = sr(null), ys = null, Xr = null, pd = null;
function hd() {
  pd = Xr = ys = null;
}
function md(e) {
  var t = vs.current;
  xe(vs), e._currentValue = t;
}
function oc(e, t, n) {
  for (; e !== null; ) {
    var r = e.alternate;
    if ((e.childLanes & t) !== t ? (e.childLanes |= t, r !== null && (r.childLanes |= t)) : r !== null && (r.childLanes & t) !== t && (r.childLanes |= t), e === n) break;
    e = e.return;
  }
}
function io(e, t) {
  ys = e, pd = Xr = null, e = e.dependencies, e !== null && e.firstContext !== null && (e.lanes & t && (ot = !0), e.firstContext = null);
}
function Ot(e) {
  var t = e._currentValue;
  if (pd !== e) if (e = { context: e, memoizedValue: t, next: null }, Xr === null) {
    if (ys === null) throw Error(C(308));
    Xr = e, ys.dependencies = { lanes: 0, firstContext: e };
  } else Xr = Xr.next = e;
  return t;
}
var pr = null;
function xd(e) {
  pr === null ? pr = [e] : pr.push(e);
}
function kx(e, t, n, r) {
  var o = t.interleaved;
  return o === null ? (n.next = n, xd(t)) : (n.next = o.next, o.next = n), t.interleaved = n, Tn(e, r);
}
function Tn(e, t) {
  e.lanes |= t;
  var n = e.alternate;
  for (n !== null && (n.lanes |= t), n = e, e = e.return; e !== null; ) e.childLanes |= t, n = e.alternate, n !== null && (n.childLanes |= t), n = e, e = e.return;
  return n.tag === 3 ? n.stateNode : null;
}
var $n = !1;
function gd(e) {
  e.updateQueue = { baseState: e.memoizedState, firstBaseUpdate: null, lastBaseUpdate: null, shared: { pending: null, interleaved: null, lanes: 0 }, effects: null };
}
function Ex(e, t) {
  e = e.updateQueue, t.updateQueue === e && (t.updateQueue = { baseState: e.baseState, firstBaseUpdate: e.firstBaseUpdate, lastBaseUpdate: e.lastBaseUpdate, shared: e.shared, effects: e.effects });
}
function Sn(e, t) {
  return { eventTime: e, lane: t, tag: 0, payload: null, callback: null, next: null };
}
function Yn(e, t, n) {
  var r = e.updateQueue;
  if (r === null) return null;
  if (r = r.shared, te & 2) {
    var o = r.pending;
    return o === null ? t.next = t : (t.next = o.next, o.next = t), r.pending = t, Tn(e, n);
  }
  return o = r.interleaved, o === null ? (t.next = t, xd(r)) : (t.next = o.next, o.next = t), r.interleaved = t, Tn(e, n);
}
function Ii(e, t, n) {
  if (t = t.updateQueue, t !== null && (t = t.shared, (n & 4194240) !== 0)) {
    var r = t.lanes;
    r &= e.pendingLanes, n |= r, t.lanes = n, nd(e, n);
  }
}
function B0(e, t) {
  var n = e.updateQueue, r = e.alternate;
  if (r !== null && (r = r.updateQueue, n === r)) {
    var o = null, a = null;
    if (n = n.firstBaseUpdate, n !== null) {
      do {
        var i = { eventTime: n.eventTime, lane: n.lane, tag: n.tag, payload: n.payload, callback: n.callback, next: null };
        a === null ? o = a = i : a = a.next = i, n = n.next;
      } while (n !== null);
      a === null ? o = a = t : a = a.next = t;
    } else o = a = t;
    n = { baseState: r.baseState, firstBaseUpdate: o, lastBaseUpdate: a, shared: r.shared, effects: r.effects }, e.updateQueue = n;
    return;
  }
  e = n.lastBaseUpdate, e === null ? n.firstBaseUpdate = t : e.next = t, n.lastBaseUpdate = t;
}
function ws(e, t, n, r) {
  var o = e.updateQueue;
  $n = !1;
  var a = o.firstBaseUpdate, i = o.lastBaseUpdate, s = o.shared.pending;
  if (s !== null) {
    o.shared.pending = null;
    var l = s, c = l.next;
    l.next = null, i === null ? a = c : i.next = c, i = l;
    var d = e.alternate;
    d !== null && (d = d.updateQueue, s = d.lastBaseUpdate, s !== i && (s === null ? d.firstBaseUpdate = c : s.next = c, d.lastBaseUpdate = l));
  }
  if (a !== null) {
    var f = o.baseState;
    i = 0, d = c = l = null, s = a;
    do {
      var p = s.lane, g = s.eventTime;
      if ((r & p) === p) {
        d !== null && (d = d.next = {
          eventTime: g,
          lane: 0,
          tag: s.tag,
          payload: s.payload,
          callback: s.callback,
          next: null
        });
        e: {
          var y = e, m = s;
          switch (p = t, g = n, m.tag) {
            case 1:
              if (y = m.payload, typeof y == "function") {
                f = y.call(g, f, p);
                break e;
              }
              f = y;
              break e;
            case 3:
              y.flags = y.flags & -65537 | 128;
            case 0:
              if (y = m.payload, p = typeof y == "function" ? y.call(g, f, p) : y, p == null) break e;
              f = _e({}, f, p);
              break e;
            case 2:
              $n = !0;
          }
        }
        s.callback !== null && s.lane !== 0 && (e.flags |= 64, p = o.effects, p === null ? o.effects = [s] : p.push(s));
      } else g = { eventTime: g, lane: p, tag: s.tag, payload: s.payload, callback: s.callback, next: null }, d === null ? (c = d = g, l = f) : d = d.next = g, i |= p;
      if (s = s.next, s === null) {
        if (s = o.shared.pending, s === null) break;
        p = s, s = p.next, p.next = null, o.lastBaseUpdate = p, o.shared.pending = null;
      }
    } while (!0);
    if (d === null && (l = f), o.baseState = l, o.firstBaseUpdate = c, o.lastBaseUpdate = d, t = o.shared.interleaved, t !== null) {
      o = t;
      do
        i |= o.lane, o = o.next;
      while (o !== t);
    } else a === null && (o.shared.lanes = 0);
    kr |= i, e.lanes = i, e.memoizedState = f;
  }
}
function W0(e, t, n) {
  if (e = t.effects, t.effects = null, e !== null) for (t = 0; t < e.length; t++) {
    var r = e[t], o = r.callback;
    if (o !== null) {
      if (r.callback = null, r = n, typeof o != "function") throw Error(C(191, o));
      o.call(r);
    }
  }
}
var Xa = {}, ln = sr(Xa), Pa = sr(Xa), Da = sr(Xa);
function hr(e) {
  if (e === Xa) throw Error(C(174));
  return e;
}
function vd(e, t) {
  switch (pe(Da, t), pe(Pa, e), pe(ln, Xa), e = t.nodeType, e) {
    case 9:
    case 11:
      t = (t = t.documentElement) ? t.namespaceURI : ju(null, "");
      break;
    default:
      e = e === 8 ? t.parentNode : t, t = e.namespaceURI || null, e = e.tagName, t = ju(t, e);
  }
  xe(ln), pe(ln, t);
}
function yo() {
  xe(ln), xe(Pa), xe(Da);
}
function Cx(e) {
  hr(Da.current);
  var t = hr(ln.current), n = ju(t, e.type);
  t !== n && (pe(Pa, e), pe(ln, n));
}
function yd(e) {
  Pa.current === e && (xe(ln), xe(Pa));
}
var we = sr(0);
function bs(e) {
  for (var t = e; t !== null; ) {
    if (t.tag === 13) {
      var n = t.memoizedState;
      if (n !== null && (n = n.dehydrated, n === null || n.data === "$?" || n.data === "$!")) return t;
    } else if (t.tag === 19 && t.memoizedProps.revealOrder !== void 0) {
      if (t.flags & 128) return t;
    } else if (t.child !== null) {
      t.child.return = t, t = t.child;
      continue;
    }
    if (t === e) break;
    for (; t.sibling === null; ) {
      if (t.return === null || t.return === e) return null;
      t = t.return;
    }
    t.sibling.return = t.return, t = t.sibling;
  }
  return null;
}
var Gl = [];
function wd() {
  for (var e = 0; e < Gl.length; e++) Gl[e]._workInProgressVersionPrimary = null;
  Gl.length = 0;
}
var Li = Ln.ReactCurrentDispatcher, Zl = Ln.ReactCurrentBatchConfig, Sr = 0, be = null, Ie = null, De = null, _s = !1, Jo = !1, $a = 0, SA = 0;
function ze() {
  throw Error(C(321));
}
function bd(e, t) {
  if (t === null) return !1;
  for (var n = 0; n < t.length && n < e.length; n++) if (!Wt(e[n], t[n])) return !1;
  return !0;
}
function _d(e, t, n, r, o, a) {
  if (Sr = a, be = t, t.memoizedState = null, t.updateQueue = null, t.lanes = 0, Li.current = e === null || e.memoizedState === null ? TA : OA, e = n(r, o), Jo) {
    a = 0;
    do {
      if (Jo = !1, $a = 0, 25 <= a) throw Error(C(301));
      a += 1, De = Ie = null, t.updateQueue = null, Li.current = NA, e = n(r, o);
    } while (Jo);
  }
  if (Li.current = Ss, t = Ie !== null && Ie.next !== null, Sr = 0, De = Ie = be = null, _s = !1, t) throw Error(C(300));
  return e;
}
function Sd() {
  var e = $a !== 0;
  return $a = 0, e;
}
function Jt() {
  var e = { memoizedState: null, baseState: null, baseQueue: null, queue: null, next: null };
  return De === null ? be.memoizedState = De = e : De = De.next = e, De;
}
function Nt() {
  if (Ie === null) {
    var e = be.alternate;
    e = e !== null ? e.memoizedState : null;
  } else e = Ie.next;
  var t = De === null ? be.memoizedState : De.next;
  if (t !== null) De = t, Ie = e;
  else {
    if (e === null) throw Error(C(310));
    Ie = e, e = { memoizedState: Ie.memoizedState, baseState: Ie.baseState, baseQueue: Ie.baseQueue, queue: Ie.queue, next: null }, De === null ? be.memoizedState = De = e : De = De.next = e;
  }
  return De;
}
function Ma(e, t) {
  return typeof t == "function" ? t(e) : t;
}
function Yl(e) {
  var t = Nt(), n = t.queue;
  if (n === null) throw Error(C(311));
  n.lastRenderedReducer = e;
  var r = Ie, o = r.baseQueue, a = n.pending;
  if (a !== null) {
    if (o !== null) {
      var i = o.next;
      o.next = a.next, a.next = i;
    }
    r.baseQueue = o = a, n.pending = null;
  }
  if (o !== null) {
    a = o.next, r = r.baseState;
    var s = i = null, l = null, c = a;
    do {
      var d = c.lane;
      if ((Sr & d) === d) l !== null && (l = l.next = { lane: 0, action: c.action, hasEagerState: c.hasEagerState, eagerState: c.eagerState, next: null }), r = c.hasEagerState ? c.eagerState : e(r, c.action);
      else {
        var f = {
          lane: d,
          action: c.action,
          hasEagerState: c.hasEagerState,
          eagerState: c.eagerState,
          next: null
        };
        l === null ? (s = l = f, i = r) : l = l.next = f, be.lanes |= d, kr |= d;
      }
      c = c.next;
    } while (c !== null && c !== a);
    l === null ? i = r : l.next = s, Wt(r, t.memoizedState) || (ot = !0), t.memoizedState = r, t.baseState = i, t.baseQueue = l, n.lastRenderedState = r;
  }
  if (e = n.interleaved, e !== null) {
    o = e;
    do
      a = o.lane, be.lanes |= a, kr |= a, o = o.next;
    while (o !== e);
  } else o === null && (n.lanes = 0);
  return [t.memoizedState, n.dispatch];
}
function Kl(e) {
  var t = Nt(), n = t.queue;
  if (n === null) throw Error(C(311));
  n.lastRenderedReducer = e;
  var r = n.dispatch, o = n.pending, a = t.memoizedState;
  if (o !== null) {
    n.pending = null;
    var i = o = o.next;
    do
      a = e(a, i.action), i = i.next;
    while (i !== o);
    Wt(a, t.memoizedState) || (ot = !0), t.memoizedState = a, t.baseQueue === null && (t.baseState = a), n.lastRenderedState = a;
  }
  return [a, r];
}
function Tx() {
}
function Ox(e, t) {
  var n = be, r = Nt(), o = t(), a = !Wt(r.memoizedState, o);
  if (a && (r.memoizedState = o, ot = !0), r = r.queue, kd(Lx.bind(null, n, r, e), [e]), r.getSnapshot !== t || a || De !== null && De.memoizedState.tag & 1) {
    if (n.flags |= 2048, ja(9, Ix.bind(null, n, r, o, t), void 0, null), $e === null) throw Error(C(349));
    Sr & 30 || Nx(n, t, o);
  }
  return o;
}
function Nx(e, t, n) {
  e.flags |= 16384, e = { getSnapshot: t, value: n }, t = be.updateQueue, t === null ? (t = { lastEffect: null, stores: null }, be.updateQueue = t, t.stores = [e]) : (n = t.stores, n === null ? t.stores = [e] : n.push(e));
}
function Ix(e, t, n, r) {
  t.value = n, t.getSnapshot = r, Ax(t) && Rx(e);
}
function Lx(e, t, n) {
  return n(function() {
    Ax(t) && Rx(e);
  });
}
function Ax(e) {
  var t = e.getSnapshot;
  e = e.value;
  try {
    var n = t();
    return !Wt(e, n);
  } catch {
    return !0;
  }
}
function Rx(e) {
  var t = Tn(e, 1);
  t !== null && zt(t, e, 1, -1);
}
function G0(e) {
  var t = Jt();
  return typeof e == "function" && (e = e()), t.memoizedState = t.baseState = e, e = { pending: null, interleaved: null, lanes: 0, dispatch: null, lastRenderedReducer: Ma, lastRenderedState: e }, t.queue = e, e = e.dispatch = CA.bind(null, be, e), [t.memoizedState, e];
}
function ja(e, t, n, r) {
  return e = { tag: e, create: t, destroy: n, deps: r, next: null }, t = be.updateQueue, t === null ? (t = { lastEffect: null, stores: null }, be.updateQueue = t, t.lastEffect = e.next = e) : (n = t.lastEffect, n === null ? t.lastEffect = e.next = e : (r = n.next, n.next = e, e.next = r, t.lastEffect = e)), e;
}
function Px() {
  return Nt().memoizedState;
}
function Ai(e, t, n, r) {
  var o = Jt();
  be.flags |= e, o.memoizedState = ja(1 | t, n, void 0, r === void 0 ? null : r);
}
function ol(e, t, n, r) {
  var o = Nt();
  r = r === void 0 ? null : r;
  var a = void 0;
  if (Ie !== null) {
    var i = Ie.memoizedState;
    if (a = i.destroy, r !== null && bd(r, i.deps)) {
      o.memoizedState = ja(t, n, a, r);
      return;
    }
  }
  be.flags |= e, o.memoizedState = ja(1 | t, n, a, r);
}
function Z0(e, t) {
  return Ai(8390656, 8, e, t);
}
function kd(e, t) {
  return ol(2048, 8, e, t);
}
function Dx(e, t) {
  return ol(4, 2, e, t);
}
function $x(e, t) {
  return ol(4, 4, e, t);
}
function Mx(e, t) {
  if (typeof t == "function") return e = e(), t(e), function() {
    t(null);
  };
  if (t != null) return e = e(), t.current = e, function() {
    t.current = null;
  };
}
function jx(e, t, n) {
  return n = n != null ? n.concat([e]) : null, ol(4, 4, Mx.bind(null, t, e), n);
}
function Ed() {
}
function Fx(e, t) {
  var n = Nt();
  t = t === void 0 ? null : t;
  var r = n.memoizedState;
  return r !== null && t !== null && bd(t, r[1]) ? r[0] : (n.memoizedState = [e, t], e);
}
function Hx(e, t) {
  var n = Nt();
  t = t === void 0 ? null : t;
  var r = n.memoizedState;
  return r !== null && t !== null && bd(t, r[1]) ? r[0] : (e = e(), n.memoizedState = [e, t], e);
}
function Ux(e, t, n) {
  return Sr & 21 ? (Wt(n, t) || (n = Gm(), be.lanes |= n, kr |= n, e.baseState = !0), t) : (e.baseState && (e.baseState = !1, ot = !0), e.memoizedState = n);
}
function kA(e, t) {
  var n = ue;
  ue = n !== 0 && 4 > n ? n : 4, e(!0);
  var r = Zl.transition;
  Zl.transition = {};
  try {
    e(!1), t();
  } finally {
    ue = n, Zl.transition = r;
  }
}
function Vx() {
  return Nt().memoizedState;
}
function EA(e, t, n) {
  var r = Xn(e);
  if (n = { lane: r, action: n, hasEagerState: !1, eagerState: null, next: null }, zx(e)) Bx(t, n);
  else if (n = kx(e, t, n, r), n !== null) {
    var o = qe();
    zt(n, e, r, o), Wx(n, t, r);
  }
}
function CA(e, t, n) {
  var r = Xn(e), o = { lane: r, action: n, hasEagerState: !1, eagerState: null, next: null };
  if (zx(e)) Bx(t, o);
  else {
    var a = e.alternate;
    if (e.lanes === 0 && (a === null || a.lanes === 0) && (a = t.lastRenderedReducer, a !== null)) try {
      var i = t.lastRenderedState, s = a(i, n);
      if (o.hasEagerState = !0, o.eagerState = s, Wt(s, i)) {
        var l = t.interleaved;
        l === null ? (o.next = o, xd(t)) : (o.next = l.next, l.next = o), t.interleaved = o;
        return;
      }
    } catch {
    } finally {
    }
    n = kx(e, t, o, r), n !== null && (o = qe(), zt(n, e, r, o), Wx(n, t, r));
  }
}
function zx(e) {
  var t = e.alternate;
  return e === be || t !== null && t === be;
}
function Bx(e, t) {
  Jo = _s = !0;
  var n = e.pending;
  n === null ? t.next = t : (t.next = n.next, n.next = t), e.pending = t;
}
function Wx(e, t, n) {
  if (n & 4194240) {
    var r = t.lanes;
    r &= e.pendingLanes, n |= r, t.lanes = n, nd(e, n);
  }
}
var Ss = { readContext: Ot, useCallback: ze, useContext: ze, useEffect: ze, useImperativeHandle: ze, useInsertionEffect: ze, useLayoutEffect: ze, useMemo: ze, useReducer: ze, useRef: ze, useState: ze, useDebugValue: ze, useDeferredValue: ze, useTransition: ze, useMutableSource: ze, useSyncExternalStore: ze, useId: ze, unstable_isNewReconciler: !1 }, TA = { readContext: Ot, useCallback: function(e, t) {
  return Jt().memoizedState = [e, t === void 0 ? null : t], e;
}, useContext: Ot, useEffect: Z0, useImperativeHandle: function(e, t, n) {
  return n = n != null ? n.concat([e]) : null, Ai(
    4194308,
    4,
    Mx.bind(null, t, e),
    n
  );
}, useLayoutEffect: function(e, t) {
  return Ai(4194308, 4, e, t);
}, useInsertionEffect: function(e, t) {
  return Ai(4, 2, e, t);
}, useMemo: function(e, t) {
  var n = Jt();
  return t = t === void 0 ? null : t, e = e(), n.memoizedState = [e, t], e;
}, useReducer: function(e, t, n) {
  var r = Jt();
  return t = n !== void 0 ? n(t) : t, r.memoizedState = r.baseState = t, e = { pending: null, interleaved: null, lanes: 0, dispatch: null, lastRenderedReducer: e, lastRenderedState: t }, r.queue = e, e = e.dispatch = EA.bind(null, be, e), [r.memoizedState, e];
}, useRef: function(e) {
  var t = Jt();
  return e = { current: e }, t.memoizedState = e;
}, useState: G0, useDebugValue: Ed, useDeferredValue: function(e) {
  return Jt().memoizedState = e;
}, useTransition: function() {
  var e = G0(!1), t = e[0];
  return e = kA.bind(null, e[1]), Jt().memoizedState = e, [t, e];
}, useMutableSource: function() {
}, useSyncExternalStore: function(e, t, n) {
  var r = be, o = Jt();
  if (ve) {
    if (n === void 0) throw Error(C(407));
    n = n();
  } else {
    if (n = t(), $e === null) throw Error(C(349));
    Sr & 30 || Nx(r, t, n);
  }
  o.memoizedState = n;
  var a = { value: n, getSnapshot: t };
  return o.queue = a, Z0(Lx.bind(
    null,
    r,
    a,
    e
  ), [e]), r.flags |= 2048, ja(9, Ix.bind(null, r, a, n, t), void 0, null), n;
}, useId: function() {
  var e = Jt(), t = $e.identifierPrefix;
  if (ve) {
    var n = bn, r = wn;
    n = (r & ~(1 << 32 - Vt(r) - 1)).toString(32) + n, t = ":" + t + "R" + n, n = $a++, 0 < n && (t += "H" + n.toString(32)), t += ":";
  } else n = SA++, t = ":" + t + "r" + n.toString(32) + ":";
  return e.memoizedState = t;
}, unstable_isNewReconciler: !1 }, OA = {
  readContext: Ot,
  useCallback: Fx,
  useContext: Ot,
  useEffect: kd,
  useImperativeHandle: jx,
  useInsertionEffect: Dx,
  useLayoutEffect: $x,
  useMemo: Hx,
  useReducer: Yl,
  useRef: Px,
  useState: function() {
    return Yl(Ma);
  },
  useDebugValue: Ed,
  useDeferredValue: function(e) {
    var t = Nt();
    return Ux(t, Ie.memoizedState, e);
  },
  useTransition: function() {
    var e = Yl(Ma)[0], t = Nt().memoizedState;
    return [e, t];
  },
  useMutableSource: Tx,
  useSyncExternalStore: Ox,
  useId: Vx,
  unstable_isNewReconciler: !1
}, NA = { readContext: Ot, useCallback: Fx, useContext: Ot, useEffect: kd, useImperativeHandle: jx, useInsertionEffect: Dx, useLayoutEffect: $x, useMemo: Hx, useReducer: Kl, useRef: Px, useState: function() {
  return Kl(Ma);
}, useDebugValue: Ed, useDeferredValue: function(e) {
  var t = Nt();
  return Ie === null ? t.memoizedState = e : Ux(t, Ie.memoizedState, e);
}, useTransition: function() {
  var e = Kl(Ma)[0], t = Nt().memoizedState;
  return [e, t];
}, useMutableSource: Tx, useSyncExternalStore: Ox, useId: Vx, unstable_isNewReconciler: !1 };
function $t(e, t) {
  if (e && e.defaultProps) {
    t = _e({}, t), e = e.defaultProps;
    for (var n in e) t[n] === void 0 && (t[n] = e[n]);
    return t;
  }
  return t;
}
function ac(e, t, n, r) {
  t = e.memoizedState, n = n(r, t), n = n == null ? t : _e({}, t, n), e.memoizedState = n, e.lanes === 0 && (e.updateQueue.baseState = n);
}
var al = { isMounted: function(e) {
  return (e = e._reactInternals) ? Or(e) === e : !1;
}, enqueueSetState: function(e, t, n) {
  e = e._reactInternals;
  var r = qe(), o = Xn(e), a = Sn(r, o);
  a.payload = t, n != null && (a.callback = n), t = Yn(e, a, o), t !== null && (zt(t, e, o, r), Ii(t, e, o));
}, enqueueReplaceState: function(e, t, n) {
  e = e._reactInternals;
  var r = qe(), o = Xn(e), a = Sn(r, o);
  a.tag = 1, a.payload = t, n != null && (a.callback = n), t = Yn(e, a, o), t !== null && (zt(t, e, o, r), Ii(t, e, o));
}, enqueueForceUpdate: function(e, t) {
  e = e._reactInternals;
  var n = qe(), r = Xn(e), o = Sn(n, r);
  o.tag = 2, t != null && (o.callback = t), t = Yn(e, o, r), t !== null && (zt(t, e, r, n), Ii(t, e, r));
} };
function Y0(e, t, n, r, o, a, i) {
  return e = e.stateNode, typeof e.shouldComponentUpdate == "function" ? e.shouldComponentUpdate(r, a, i) : t.prototype && t.prototype.isPureReactComponent ? !Ia(n, r) || !Ia(o, a) : !0;
}
function Gx(e, t, n) {
  var r = !1, o = or, a = t.contextType;
  return typeof a == "object" && a !== null ? a = Ot(a) : (o = it(t) ? br : Ke.current, r = t.contextTypes, a = (r = r != null) ? xo(e, o) : or), t = new t(n, a), e.memoizedState = t.state !== null && t.state !== void 0 ? t.state : null, t.updater = al, e.stateNode = t, t._reactInternals = e, r && (e = e.stateNode, e.__reactInternalMemoizedUnmaskedChildContext = o, e.__reactInternalMemoizedMaskedChildContext = a), t;
}
function K0(e, t, n, r) {
  e = t.state, typeof t.componentWillReceiveProps == "function" && t.componentWillReceiveProps(n, r), typeof t.UNSAFE_componentWillReceiveProps == "function" && t.UNSAFE_componentWillReceiveProps(n, r), t.state !== e && al.enqueueReplaceState(t, t.state, null);
}
function ic(e, t, n, r) {
  var o = e.stateNode;
  o.props = n, o.state = e.memoizedState, o.refs = {}, gd(e);
  var a = t.contextType;
  typeof a == "object" && a !== null ? o.context = Ot(a) : (a = it(t) ? br : Ke.current, o.context = xo(e, a)), o.state = e.memoizedState, a = t.getDerivedStateFromProps, typeof a == "function" && (ac(e, t, a, n), o.state = e.memoizedState), typeof t.getDerivedStateFromProps == "function" || typeof o.getSnapshotBeforeUpdate == "function" || typeof o.UNSAFE_componentWillMount != "function" && typeof o.componentWillMount != "function" || (t = o.state, typeof o.componentWillMount == "function" && o.componentWillMount(), typeof o.UNSAFE_componentWillMount == "function" && o.UNSAFE_componentWillMount(), t !== o.state && al.enqueueReplaceState(o, o.state, null), ws(e, n, o, r), o.state = e.memoizedState), typeof o.componentDidMount == "function" && (e.flags |= 4194308);
}
function wo(e, t) {
  try {
    var n = "", r = t;
    do
      n += r8(r), r = r.return;
    while (r);
    var o = n;
  } catch (a) {
    o = `
Error generating stack: ` + a.message + `
` + a.stack;
  }
  return { value: e, source: t, stack: o, digest: null };
}
function Xl(e, t, n) {
  return { value: e, source: null, stack: n ?? null, digest: t ?? null };
}
function sc(e, t) {
  try {
    console.error(t.value);
  } catch (n) {
    setTimeout(function() {
      throw n;
    });
  }
}
var IA = typeof WeakMap == "function" ? WeakMap : Map;
function Zx(e, t, n) {
  n = Sn(-1, n), n.tag = 3, n.payload = { element: null };
  var r = t.value;
  return n.callback = function() {
    Es || (Es = !0, gc = r), sc(e, t);
  }, n;
}
function Yx(e, t, n) {
  n = Sn(-1, n), n.tag = 3;
  var r = e.type.getDerivedStateFromError;
  if (typeof r == "function") {
    var o = t.value;
    n.payload = function() {
      return r(o);
    }, n.callback = function() {
      sc(e, t);
    };
  }
  var a = e.stateNode;
  return a !== null && typeof a.componentDidCatch == "function" && (n.callback = function() {
    sc(e, t), typeof r != "function" && (Kn === null ? Kn = /* @__PURE__ */ new Set([this]) : Kn.add(this));
    var i = t.stack;
    this.componentDidCatch(t.value, { componentStack: i !== null ? i : "" });
  }), n;
}
function X0(e, t, n) {
  var r = e.pingCache;
  if (r === null) {
    r = e.pingCache = new IA();
    var o = /* @__PURE__ */ new Set();
    r.set(t, o);
  } else o = r.get(t), o === void 0 && (o = /* @__PURE__ */ new Set(), r.set(t, o));
  o.has(n) || (o.add(n), e = BA.bind(null, e, t, n), t.then(e, e));
}
function J0(e) {
  do {
    var t;
    if ((t = e.tag === 13) && (t = e.memoizedState, t = t !== null ? t.dehydrated !== null : !0), t) return e;
    e = e.return;
  } while (e !== null);
  return null;
}
function Q0(e, t, n, r, o) {
  return e.mode & 1 ? (e.flags |= 65536, e.lanes = o, e) : (e === t ? e.flags |= 65536 : (e.flags |= 128, n.flags |= 131072, n.flags &= -52805, n.tag === 1 && (n.alternate === null ? n.tag = 17 : (t = Sn(-1, 1), t.tag = 2, Yn(n, t, 1))), n.lanes |= 1), e);
}
var LA = Ln.ReactCurrentOwner, ot = !1;
function Qe(e, t, n, r) {
  t.child = e === null ? Sx(t, null, n, r) : vo(t, e.child, n, r);
}
function q0(e, t, n, r, o) {
  n = n.render;
  var a = t.ref;
  return io(t, o), r = _d(e, t, n, r, a, o), n = Sd(), e !== null && !ot ? (t.updateQueue = e.updateQueue, t.flags &= -2053, e.lanes &= ~o, On(e, t, o)) : (ve && n && cd(t), t.flags |= 1, Qe(e, t, r, o), t.child);
}
function ep(e, t, n, r, o) {
  if (e === null) {
    var a = n.type;
    return typeof a == "function" && !Rd(a) && a.defaultProps === void 0 && n.compare === null && n.defaultProps === void 0 ? (t.tag = 15, t.type = a, Kx(e, t, a, r, o)) : (e = $i(n.type, null, r, t, t.mode, o), e.ref = t.ref, e.return = t, t.child = e);
  }
  if (a = e.child, !(e.lanes & o)) {
    var i = a.memoizedProps;
    if (n = n.compare, n = n !== null ? n : Ia, n(i, r) && e.ref === t.ref) return On(e, t, o);
  }
  return t.flags |= 1, e = Jn(a, r), e.ref = t.ref, e.return = t, t.child = e;
}
function Kx(e, t, n, r, o) {
  if (e !== null) {
    var a = e.memoizedProps;
    if (Ia(a, r) && e.ref === t.ref) if (ot = !1, t.pendingProps = r = a, (e.lanes & o) !== 0) e.flags & 131072 && (ot = !0);
    else return t.lanes = e.lanes, On(e, t, o);
  }
  return lc(e, t, n, r, o);
}
function Xx(e, t, n) {
  var r = t.pendingProps, o = r.children, a = e !== null ? e.memoizedState : null;
  if (r.mode === "hidden") if (!(t.mode & 1)) t.memoizedState = { baseLanes: 0, cachePool: null, transitions: null }, pe(Qr, pt), pt |= n;
  else {
    if (!(n & 1073741824)) return e = a !== null ? a.baseLanes | n : n, t.lanes = t.childLanes = 1073741824, t.memoizedState = { baseLanes: e, cachePool: null, transitions: null }, t.updateQueue = null, pe(Qr, pt), pt |= e, null;
    t.memoizedState = { baseLanes: 0, cachePool: null, transitions: null }, r = a !== null ? a.baseLanes : n, pe(Qr, pt), pt |= r;
  }
  else a !== null ? (r = a.baseLanes | n, t.memoizedState = null) : r = n, pe(Qr, pt), pt |= r;
  return Qe(e, t, o, n), t.child;
}
function Jx(e, t) {
  var n = t.ref;
  (e === null && n !== null || e !== null && e.ref !== n) && (t.flags |= 512, t.flags |= 2097152);
}
function lc(e, t, n, r, o) {
  var a = it(n) ? br : Ke.current;
  return a = xo(t, a), io(t, o), n = _d(e, t, n, r, a, o), r = Sd(), e !== null && !ot ? (t.updateQueue = e.updateQueue, t.flags &= -2053, e.lanes &= ~o, On(e, t, o)) : (ve && r && cd(t), t.flags |= 1, Qe(e, t, n, o), t.child);
}
function tp(e, t, n, r, o) {
  if (it(n)) {
    var a = !0;
    ms(t);
  } else a = !1;
  if (io(t, o), t.stateNode === null) Ri(e, t), Gx(t, n, r), ic(t, n, r, o), r = !0;
  else if (e === null) {
    var i = t.stateNode, s = t.memoizedProps;
    i.props = s;
    var l = i.context, c = n.contextType;
    typeof c == "object" && c !== null ? c = Ot(c) : (c = it(n) ? br : Ke.current, c = xo(t, c));
    var d = n.getDerivedStateFromProps, f = typeof d == "function" || typeof i.getSnapshotBeforeUpdate == "function";
    f || typeof i.UNSAFE_componentWillReceiveProps != "function" && typeof i.componentWillReceiveProps != "function" || (s !== r || l !== c) && K0(t, i, r, c), $n = !1;
    var p = t.memoizedState;
    i.state = p, ws(t, r, i, o), l = t.memoizedState, s !== r || p !== l || at.current || $n ? (typeof d == "function" && (ac(t, n, d, r), l = t.memoizedState), (s = $n || Y0(t, n, s, r, p, l, c)) ? (f || typeof i.UNSAFE_componentWillMount != "function" && typeof i.componentWillMount != "function" || (typeof i.componentWillMount == "function" && i.componentWillMount(), typeof i.UNSAFE_componentWillMount == "function" && i.UNSAFE_componentWillMount()), typeof i.componentDidMount == "function" && (t.flags |= 4194308)) : (typeof i.componentDidMount == "function" && (t.flags |= 4194308), t.memoizedProps = r, t.memoizedState = l), i.props = r, i.state = l, i.context = c, r = s) : (typeof i.componentDidMount == "function" && (t.flags |= 4194308), r = !1);
  } else {
    i = t.stateNode, Ex(e, t), s = t.memoizedProps, c = t.type === t.elementType ? s : $t(t.type, s), i.props = c, f = t.pendingProps, p = i.context, l = n.contextType, typeof l == "object" && l !== null ? l = Ot(l) : (l = it(n) ? br : Ke.current, l = xo(t, l));
    var g = n.getDerivedStateFromProps;
    (d = typeof g == "function" || typeof i.getSnapshotBeforeUpdate == "function") || typeof i.UNSAFE_componentWillReceiveProps != "function" && typeof i.componentWillReceiveProps != "function" || (s !== f || p !== l) && K0(t, i, r, l), $n = !1, p = t.memoizedState, i.state = p, ws(t, r, i, o);
    var y = t.memoizedState;
    s !== f || p !== y || at.current || $n ? (typeof g == "function" && (ac(t, n, g, r), y = t.memoizedState), (c = $n || Y0(t, n, c, r, p, y, l) || !1) ? (d || typeof i.UNSAFE_componentWillUpdate != "function" && typeof i.componentWillUpdate != "function" || (typeof i.componentWillUpdate == "function" && i.componentWillUpdate(r, y, l), typeof i.UNSAFE_componentWillUpdate == "function" && i.UNSAFE_componentWillUpdate(r, y, l)), typeof i.componentDidUpdate == "function" && (t.flags |= 4), typeof i.getSnapshotBeforeUpdate == "function" && (t.flags |= 1024)) : (typeof i.componentDidUpdate != "function" || s === e.memoizedProps && p === e.memoizedState || (t.flags |= 4), typeof i.getSnapshotBeforeUpdate != "function" || s === e.memoizedProps && p === e.memoizedState || (t.flags |= 1024), t.memoizedProps = r, t.memoizedState = y), i.props = r, i.state = y, i.context = l, r = c) : (typeof i.componentDidUpdate != "function" || s === e.memoizedProps && p === e.memoizedState || (t.flags |= 4), typeof i.getSnapshotBeforeUpdate != "function" || s === e.memoizedProps && p === e.memoizedState || (t.flags |= 1024), r = !1);
  }
  return uc(e, t, n, r, a, o);
}
function uc(e, t, n, r, o, a) {
  Jx(e, t);
  var i = (t.flags & 128) !== 0;
  if (!r && !i) return o && H0(t, n, !1), On(e, t, a);
  r = t.stateNode, LA.current = t;
  var s = i && typeof n.getDerivedStateFromError != "function" ? null : r.render();
  return t.flags |= 1, e !== null && i ? (t.child = vo(t, e.child, null, a), t.child = vo(t, null, s, a)) : Qe(e, t, s, a), t.memoizedState = r.state, o && H0(t, n, !0), t.child;
}
function Qx(e) {
  var t = e.stateNode;
  t.pendingContext ? F0(e, t.pendingContext, t.pendingContext !== t.context) : t.context && F0(e, t.context, !1), vd(e, t.containerInfo);
}
function np(e, t, n, r, o) {
  return go(), fd(o), t.flags |= 256, Qe(e, t, n, r), t.child;
}
var cc = { dehydrated: null, treeContext: null, retryLane: 0 };
function dc(e) {
  return { baseLanes: e, cachePool: null, transitions: null };
}
function qx(e, t, n) {
  var r = t.pendingProps, o = we.current, a = !1, i = (t.flags & 128) !== 0, s;
  if ((s = i) || (s = e !== null && e.memoizedState === null ? !1 : (o & 2) !== 0), s ? (a = !0, t.flags &= -129) : (e === null || e.memoizedState !== null) && (o |= 1), pe(we, o & 1), e === null)
    return rc(t), e = t.memoizedState, e !== null && (e = e.dehydrated, e !== null) ? (t.mode & 1 ? e.data === "$!" ? t.lanes = 8 : t.lanes = 1073741824 : t.lanes = 1, null) : (i = r.children, e = r.fallback, a ? (r = t.mode, a = t.child, i = { mode: "hidden", children: i }, !(r & 1) && a !== null ? (a.childLanes = 0, a.pendingProps = i) : a = ll(i, r, 0, null), e = gr(e, r, n, null), a.return = t, e.return = t, a.sibling = e, t.child = a, t.child.memoizedState = dc(n), t.memoizedState = cc, e) : Cd(t, i));
  if (o = e.memoizedState, o !== null && (s = o.dehydrated, s !== null)) return AA(e, t, i, r, s, o, n);
  if (a) {
    a = r.fallback, i = t.mode, o = e.child, s = o.sibling;
    var l = { mode: "hidden", children: r.children };
    return !(i & 1) && t.child !== o ? (r = t.child, r.childLanes = 0, r.pendingProps = l, t.deletions = null) : (r = Jn(o, l), r.subtreeFlags = o.subtreeFlags & 14680064), s !== null ? a = Jn(s, a) : (a = gr(a, i, n, null), a.flags |= 2), a.return = t, r.return = t, r.sibling = a, t.child = r, r = a, a = t.child, i = e.child.memoizedState, i = i === null ? dc(n) : { baseLanes: i.baseLanes | n, cachePool: null, transitions: i.transitions }, a.memoizedState = i, a.childLanes = e.childLanes & ~n, t.memoizedState = cc, r;
  }
  return a = e.child, e = a.sibling, r = Jn(a, { mode: "visible", children: r.children }), !(t.mode & 1) && (r.lanes = n), r.return = t, r.sibling = null, e !== null && (n = t.deletions, n === null ? (t.deletions = [e], t.flags |= 16) : n.push(e)), t.child = r, t.memoizedState = null, r;
}
function Cd(e, t) {
  return t = ll({ mode: "visible", children: t }, e.mode, 0, null), t.return = e, e.child = t;
}
function mi(e, t, n, r) {
  return r !== null && fd(r), vo(t, e.child, null, n), e = Cd(t, t.pendingProps.children), e.flags |= 2, t.memoizedState = null, e;
}
function AA(e, t, n, r, o, a, i) {
  if (n)
    return t.flags & 256 ? (t.flags &= -257, r = Xl(Error(C(422))), mi(e, t, i, r)) : t.memoizedState !== null ? (t.child = e.child, t.flags |= 128, null) : (a = r.fallback, o = t.mode, r = ll({ mode: "visible", children: r.children }, o, 0, null), a = gr(a, o, i, null), a.flags |= 2, r.return = t, a.return = t, r.sibling = a, t.child = r, t.mode & 1 && vo(t, e.child, null, i), t.child.memoizedState = dc(i), t.memoizedState = cc, a);
  if (!(t.mode & 1)) return mi(e, t, i, null);
  if (o.data === "$!") {
    if (r = o.nextSibling && o.nextSibling.dataset, r) var s = r.dgst;
    return r = s, a = Error(C(419)), r = Xl(a, r, void 0), mi(e, t, i, r);
  }
  if (s = (i & e.childLanes) !== 0, ot || s) {
    if (r = $e, r !== null) {
      switch (i & -i) {
        case 4:
          o = 2;
          break;
        case 16:
          o = 8;
          break;
        case 64:
        case 128:
        case 256:
        case 512:
        case 1024:
        case 2048:
        case 4096:
        case 8192:
        case 16384:
        case 32768:
        case 65536:
        case 131072:
        case 262144:
        case 524288:
        case 1048576:
        case 2097152:
        case 4194304:
        case 8388608:
        case 16777216:
        case 33554432:
        case 67108864:
          o = 32;
          break;
        case 536870912:
          o = 268435456;
          break;
        default:
          o = 0;
      }
      o = o & (r.suspendedLanes | i) ? 0 : o, o !== 0 && o !== a.retryLane && (a.retryLane = o, Tn(e, o), zt(r, e, o, -1));
    }
    return Ad(), r = Xl(Error(C(421))), mi(e, t, i, r);
  }
  return o.data === "$?" ? (t.flags |= 128, t.child = e.child, t = WA.bind(null, e), o._reactRetry = t, null) : (e = a.treeContext, ht = Zn(o.nextSibling), gt = t, ve = !0, jt = null, e !== null && (kt[Et++] = wn, kt[Et++] = bn, kt[Et++] = _r, wn = e.id, bn = e.overflow, _r = t), t = Cd(t, r.children), t.flags |= 4096, t);
}
function rp(e, t, n) {
  e.lanes |= t;
  var r = e.alternate;
  r !== null && (r.lanes |= t), oc(e.return, t, n);
}
function Jl(e, t, n, r, o) {
  var a = e.memoizedState;
  a === null ? e.memoizedState = { isBackwards: t, rendering: null, renderingStartTime: 0, last: r, tail: n, tailMode: o } : (a.isBackwards = t, a.rendering = null, a.renderingStartTime = 0, a.last = r, a.tail = n, a.tailMode = o);
}
function eg(e, t, n) {
  var r = t.pendingProps, o = r.revealOrder, a = r.tail;
  if (Qe(e, t, r.children, n), r = we.current, r & 2) r = r & 1 | 2, t.flags |= 128;
  else {
    if (e !== null && e.flags & 128) e: for (e = t.child; e !== null; ) {
      if (e.tag === 13) e.memoizedState !== null && rp(e, n, t);
      else if (e.tag === 19) rp(e, n, t);
      else if (e.child !== null) {
        e.child.return = e, e = e.child;
        continue;
      }
      if (e === t) break e;
      for (; e.sibling === null; ) {
        if (e.return === null || e.return === t) break e;
        e = e.return;
      }
      e.sibling.return = e.return, e = e.sibling;
    }
    r &= 1;
  }
  if (pe(we, r), !(t.mode & 1)) t.memoizedState = null;
  else switch (o) {
    case "forwards":
      for (n = t.child, o = null; n !== null; ) e = n.alternate, e !== null && bs(e) === null && (o = n), n = n.sibling;
      n = o, n === null ? (o = t.child, t.child = null) : (o = n.sibling, n.sibling = null), Jl(t, !1, o, n, a);
      break;
    case "backwards":
      for (n = null, o = t.child, t.child = null; o !== null; ) {
        if (e = o.alternate, e !== null && bs(e) === null) {
          t.child = o;
          break;
        }
        e = o.sibling, o.sibling = n, n = o, o = e;
      }
      Jl(t, !0, n, null, a);
      break;
    case "together":
      Jl(t, !1, null, null, void 0);
      break;
    default:
      t.memoizedState = null;
  }
  return t.child;
}
function Ri(e, t) {
  !(t.mode & 1) && e !== null && (e.alternate = null, t.alternate = null, t.flags |= 2);
}
function On(e, t, n) {
  if (e !== null && (t.dependencies = e.dependencies), kr |= t.lanes, !(n & t.childLanes)) return null;
  if (e !== null && t.child !== e.child) throw Error(C(153));
  if (t.child !== null) {
    for (e = t.child, n = Jn(e, e.pendingProps), t.child = n, n.return = t; e.sibling !== null; ) e = e.sibling, n = n.sibling = Jn(e, e.pendingProps), n.return = t;
    n.sibling = null;
  }
  return t.child;
}
function RA(e, t, n) {
  switch (t.tag) {
    case 3:
      Qx(t), go();
      break;
    case 5:
      Cx(t);
      break;
    case 1:
      it(t.type) && ms(t);
      break;
    case 4:
      vd(t, t.stateNode.containerInfo);
      break;
    case 10:
      var r = t.type._context, o = t.memoizedProps.value;
      pe(vs, r._currentValue), r._currentValue = o;
      break;
    case 13:
      if (r = t.memoizedState, r !== null)
        return r.dehydrated !== null ? (pe(we, we.current & 1), t.flags |= 128, null) : n & t.child.childLanes ? qx(e, t, n) : (pe(we, we.current & 1), e = On(e, t, n), e !== null ? e.sibling : null);
      pe(we, we.current & 1);
      break;
    case 19:
      if (r = (n & t.childLanes) !== 0, e.flags & 128) {
        if (r) return eg(e, t, n);
        t.flags |= 128;
      }
      if (o = t.memoizedState, o !== null && (o.rendering = null, o.tail = null, o.lastEffect = null), pe(we, we.current), r) break;
      return null;
    case 22:
    case 23:
      return t.lanes = 0, Xx(e, t, n);
  }
  return On(e, t, n);
}
var tg, fc, ng, rg;
tg = function(e, t) {
  for (var n = t.child; n !== null; ) {
    if (n.tag === 5 || n.tag === 6) e.appendChild(n.stateNode);
    else if (n.tag !== 4 && n.child !== null) {
      n.child.return = n, n = n.child;
      continue;
    }
    if (n === t) break;
    for (; n.sibling === null; ) {
      if (n.return === null || n.return === t) return;
      n = n.return;
    }
    n.sibling.return = n.return, n = n.sibling;
  }
};
fc = function() {
};
ng = function(e, t, n, r) {
  var o = e.memoizedProps;
  if (o !== r) {
    e = t.stateNode, hr(ln.current);
    var a = null;
    switch (n) {
      case "input":
        o = Pu(e, o), r = Pu(e, r), a = [];
        break;
      case "select":
        o = _e({}, o, { value: void 0 }), r = _e({}, r, { value: void 0 }), a = [];
        break;
      case "textarea":
        o = Mu(e, o), r = Mu(e, r), a = [];
        break;
      default:
        typeof o.onClick != "function" && typeof r.onClick == "function" && (e.onclick = ps);
    }
    Fu(n, r);
    var i;
    n = null;
    for (c in o) if (!r.hasOwnProperty(c) && o.hasOwnProperty(c) && o[c] != null) if (c === "style") {
      var s = o[c];
      for (i in s) s.hasOwnProperty(i) && (n || (n = {}), n[i] = "");
    } else c !== "dangerouslySetInnerHTML" && c !== "children" && c !== "suppressContentEditableWarning" && c !== "suppressHydrationWarning" && c !== "autoFocus" && (Sa.hasOwnProperty(c) ? a || (a = []) : (a = a || []).push(c, null));
    for (c in r) {
      var l = r[c];
      if (s = o != null ? o[c] : void 0, r.hasOwnProperty(c) && l !== s && (l != null || s != null)) if (c === "style") if (s) {
        for (i in s) !s.hasOwnProperty(i) || l && l.hasOwnProperty(i) || (n || (n = {}), n[i] = "");
        for (i in l) l.hasOwnProperty(i) && s[i] !== l[i] && (n || (n = {}), n[i] = l[i]);
      } else n || (a || (a = []), a.push(
        c,
        n
      )), n = l;
      else c === "dangerouslySetInnerHTML" ? (l = l ? l.__html : void 0, s = s ? s.__html : void 0, l != null && s !== l && (a = a || []).push(c, l)) : c === "children" ? typeof l != "string" && typeof l != "number" || (a = a || []).push(c, "" + l) : c !== "suppressContentEditableWarning" && c !== "suppressHydrationWarning" && (Sa.hasOwnProperty(c) ? (l != null && c === "onScroll" && me("scroll", e), a || s === l || (a = [])) : (a = a || []).push(c, l));
    }
    n && (a = a || []).push("style", n);
    var c = a;
    (t.updateQueue = c) && (t.flags |= 4);
  }
};
rg = function(e, t, n, r) {
  n !== r && (t.flags |= 4);
};
function Mo(e, t) {
  if (!ve) switch (e.tailMode) {
    case "hidden":
      t = e.tail;
      for (var n = null; t !== null; ) t.alternate !== null && (n = t), t = t.sibling;
      n === null ? e.tail = null : n.sibling = null;
      break;
    case "collapsed":
      n = e.tail;
      for (var r = null; n !== null; ) n.alternate !== null && (r = n), n = n.sibling;
      r === null ? t || e.tail === null ? e.tail = null : e.tail.sibling = null : r.sibling = null;
  }
}
function Be(e) {
  var t = e.alternate !== null && e.alternate.child === e.child, n = 0, r = 0;
  if (t) for (var o = e.child; o !== null; ) n |= o.lanes | o.childLanes, r |= o.subtreeFlags & 14680064, r |= o.flags & 14680064, o.return = e, o = o.sibling;
  else for (o = e.child; o !== null; ) n |= o.lanes | o.childLanes, r |= o.subtreeFlags, r |= o.flags, o.return = e, o = o.sibling;
  return e.subtreeFlags |= r, e.childLanes = n, t;
}
function PA(e, t, n) {
  var r = t.pendingProps;
  switch (dd(t), t.tag) {
    case 2:
    case 16:
    case 15:
    case 0:
    case 11:
    case 7:
    case 8:
    case 12:
    case 9:
    case 14:
      return Be(t), null;
    case 1:
      return it(t.type) && hs(), Be(t), null;
    case 3:
      return r = t.stateNode, yo(), xe(at), xe(Ke), wd(), r.pendingContext && (r.context = r.pendingContext, r.pendingContext = null), (e === null || e.child === null) && (pi(t) ? t.flags |= 4 : e === null || e.memoizedState.isDehydrated && !(t.flags & 256) || (t.flags |= 1024, jt !== null && (wc(jt), jt = null))), fc(e, t), Be(t), null;
    case 5:
      yd(t);
      var o = hr(Da.current);
      if (n = t.type, e !== null && t.stateNode != null) ng(e, t, n, r, o), e.ref !== t.ref && (t.flags |= 512, t.flags |= 2097152);
      else {
        if (!r) {
          if (t.stateNode === null) throw Error(C(166));
          return Be(t), null;
        }
        if (e = hr(ln.current), pi(t)) {
          r = t.stateNode, n = t.type;
          var a = t.memoizedProps;
          switch (r[tn] = t, r[Ra] = a, e = (t.mode & 1) !== 0, n) {
            case "dialog":
              me("cancel", r), me("close", r);
              break;
            case "iframe":
            case "object":
            case "embed":
              me("load", r);
              break;
            case "video":
            case "audio":
              for (o = 0; o < Bo.length; o++) me(Bo[o], r);
              break;
            case "source":
              me("error", r);
              break;
            case "img":
            case "image":
            case "link":
              me(
                "error",
                r
              ), me("load", r);
              break;
            case "details":
              me("toggle", r);
              break;
            case "input":
              f0(r, a), me("invalid", r);
              break;
            case "select":
              r._wrapperState = { wasMultiple: !!a.multiple }, me("invalid", r);
              break;
            case "textarea":
              h0(r, a), me("invalid", r);
          }
          Fu(n, a), o = null;
          for (var i in a) if (a.hasOwnProperty(i)) {
            var s = a[i];
            i === "children" ? typeof s == "string" ? r.textContent !== s && (a.suppressHydrationWarning !== !0 && fi(r.textContent, s, e), o = ["children", s]) : typeof s == "number" && r.textContent !== "" + s && (a.suppressHydrationWarning !== !0 && fi(
              r.textContent,
              s,
              e
            ), o = ["children", "" + s]) : Sa.hasOwnProperty(i) && s != null && i === "onScroll" && me("scroll", r);
          }
          switch (n) {
            case "input":
              oi(r), p0(r, a, !0);
              break;
            case "textarea":
              oi(r), m0(r);
              break;
            case "select":
            case "option":
              break;
            default:
              typeof a.onClick == "function" && (r.onclick = ps);
          }
          r = o, t.updateQueue = r, r !== null && (t.flags |= 4);
        } else {
          i = o.nodeType === 9 ? o : o.ownerDocument, e === "http://www.w3.org/1999/xhtml" && (e = Lm(n)), e === "http://www.w3.org/1999/xhtml" ? n === "script" ? (e = i.createElement("div"), e.innerHTML = "<script><\/script>", e = e.removeChild(e.firstChild)) : typeof r.is == "string" ? e = i.createElement(n, { is: r.is }) : (e = i.createElement(n), n === "select" && (i = e, r.multiple ? i.multiple = !0 : r.size && (i.size = r.size))) : e = i.createElementNS(e, n), e[tn] = t, e[Ra] = r, tg(e, t, !1, !1), t.stateNode = e;
          e: {
            switch (i = Hu(n, r), n) {
              case "dialog":
                me("cancel", e), me("close", e), o = r;
                break;
              case "iframe":
              case "object":
              case "embed":
                me("load", e), o = r;
                break;
              case "video":
              case "audio":
                for (o = 0; o < Bo.length; o++) me(Bo[o], e);
                o = r;
                break;
              case "source":
                me("error", e), o = r;
                break;
              case "img":
              case "image":
              case "link":
                me(
                  "error",
                  e
                ), me("load", e), o = r;
                break;
              case "details":
                me("toggle", e), o = r;
                break;
              case "input":
                f0(e, r), o = Pu(e, r), me("invalid", e);
                break;
              case "option":
                o = r;
                break;
              case "select":
                e._wrapperState = { wasMultiple: !!r.multiple }, o = _e({}, r, { value: void 0 }), me("invalid", e);
                break;
              case "textarea":
                h0(e, r), o = Mu(e, r), me("invalid", e);
                break;
              default:
                o = r;
            }
            Fu(n, o), s = o;
            for (a in s) if (s.hasOwnProperty(a)) {
              var l = s[a];
              a === "style" ? Pm(e, l) : a === "dangerouslySetInnerHTML" ? (l = l ? l.__html : void 0, l != null && Am(e, l)) : a === "children" ? typeof l == "string" ? (n !== "textarea" || l !== "") && ka(e, l) : typeof l == "number" && ka(e, "" + l) : a !== "suppressContentEditableWarning" && a !== "suppressHydrationWarning" && a !== "autoFocus" && (Sa.hasOwnProperty(a) ? l != null && a === "onScroll" && me("scroll", e) : l != null && Xc(e, a, l, i));
            }
            switch (n) {
              case "input":
                oi(e), p0(e, r, !1);
                break;
              case "textarea":
                oi(e), m0(e);
                break;
              case "option":
                r.value != null && e.setAttribute("value", "" + rr(r.value));
                break;
              case "select":
                e.multiple = !!r.multiple, a = r.value, a != null ? no(e, !!r.multiple, a, !1) : r.defaultValue != null && no(
                  e,
                  !!r.multiple,
                  r.defaultValue,
                  !0
                );
                break;
              default:
                typeof o.onClick == "function" && (e.onclick = ps);
            }
            switch (n) {
              case "button":
              case "input":
              case "select":
              case "textarea":
                r = !!r.autoFocus;
                break e;
              case "img":
                r = !0;
                break e;
              default:
                r = !1;
            }
          }
          r && (t.flags |= 4);
        }
        t.ref !== null && (t.flags |= 512, t.flags |= 2097152);
      }
      return Be(t), null;
    case 6:
      if (e && t.stateNode != null) rg(e, t, e.memoizedProps, r);
      else {
        if (typeof r != "string" && t.stateNode === null) throw Error(C(166));
        if (n = hr(Da.current), hr(ln.current), pi(t)) {
          if (r = t.stateNode, n = t.memoizedProps, r[tn] = t, (a = r.nodeValue !== n) && (e = gt, e !== null)) switch (e.tag) {
            case 3:
              fi(r.nodeValue, n, (e.mode & 1) !== 0);
              break;
            case 5:
              e.memoizedProps.suppressHydrationWarning !== !0 && fi(r.nodeValue, n, (e.mode & 1) !== 0);
          }
          a && (t.flags |= 4);
        } else r = (n.nodeType === 9 ? n : n.ownerDocument).createTextNode(r), r[tn] = t, t.stateNode = r;
      }
      return Be(t), null;
    case 13:
      if (xe(we), r = t.memoizedState, e === null || e.memoizedState !== null && e.memoizedState.dehydrated !== null) {
        if (ve && ht !== null && t.mode & 1 && !(t.flags & 128)) bx(), go(), t.flags |= 98560, a = !1;
        else if (a = pi(t), r !== null && r.dehydrated !== null) {
          if (e === null) {
            if (!a) throw Error(C(318));
            if (a = t.memoizedState, a = a !== null ? a.dehydrated : null, !a) throw Error(C(317));
            a[tn] = t;
          } else go(), !(t.flags & 128) && (t.memoizedState = null), t.flags |= 4;
          Be(t), a = !1;
        } else jt !== null && (wc(jt), jt = null), a = !0;
        if (!a) return t.flags & 65536 ? t : null;
      }
      return t.flags & 128 ? (t.lanes = n, t) : (r = r !== null, r !== (e !== null && e.memoizedState !== null) && r && (t.child.flags |= 8192, t.mode & 1 && (e === null || we.current & 1 ? Le === 0 && (Le = 3) : Ad())), t.updateQueue !== null && (t.flags |= 4), Be(t), null);
    case 4:
      return yo(), fc(e, t), e === null && La(t.stateNode.containerInfo), Be(t), null;
    case 10:
      return md(t.type._context), Be(t), null;
    case 17:
      return it(t.type) && hs(), Be(t), null;
    case 19:
      if (xe(we), a = t.memoizedState, a === null) return Be(t), null;
      if (r = (t.flags & 128) !== 0, i = a.rendering, i === null) if (r) Mo(a, !1);
      else {
        if (Le !== 0 || e !== null && e.flags & 128) for (e = t.child; e !== null; ) {
          if (i = bs(e), i !== null) {
            for (t.flags |= 128, Mo(a, !1), r = i.updateQueue, r !== null && (t.updateQueue = r, t.flags |= 4), t.subtreeFlags = 0, r = n, n = t.child; n !== null; ) a = n, e = r, a.flags &= 14680066, i = a.alternate, i === null ? (a.childLanes = 0, a.lanes = e, a.child = null, a.subtreeFlags = 0, a.memoizedProps = null, a.memoizedState = null, a.updateQueue = null, a.dependencies = null, a.stateNode = null) : (a.childLanes = i.childLanes, a.lanes = i.lanes, a.child = i.child, a.subtreeFlags = 0, a.deletions = null, a.memoizedProps = i.memoizedProps, a.memoizedState = i.memoizedState, a.updateQueue = i.updateQueue, a.type = i.type, e = i.dependencies, a.dependencies = e === null ? null : { lanes: e.lanes, firstContext: e.firstContext }), n = n.sibling;
            return pe(we, we.current & 1 | 2), t.child;
          }
          e = e.sibling;
        }
        a.tail !== null && ke() > bo && (t.flags |= 128, r = !0, Mo(a, !1), t.lanes = 4194304);
      }
      else {
        if (!r) if (e = bs(i), e !== null) {
          if (t.flags |= 128, r = !0, n = e.updateQueue, n !== null && (t.updateQueue = n, t.flags |= 4), Mo(a, !0), a.tail === null && a.tailMode === "hidden" && !i.alternate && !ve) return Be(t), null;
        } else 2 * ke() - a.renderingStartTime > bo && n !== 1073741824 && (t.flags |= 128, r = !0, Mo(a, !1), t.lanes = 4194304);
        a.isBackwards ? (i.sibling = t.child, t.child = i) : (n = a.last, n !== null ? n.sibling = i : t.child = i, a.last = i);
      }
      return a.tail !== null ? (t = a.tail, a.rendering = t, a.tail = t.sibling, a.renderingStartTime = ke(), t.sibling = null, n = we.current, pe(we, r ? n & 1 | 2 : n & 1), t) : (Be(t), null);
    case 22:
    case 23:
      return Ld(), r = t.memoizedState !== null, e !== null && e.memoizedState !== null !== r && (t.flags |= 8192), r && t.mode & 1 ? pt & 1073741824 && (Be(t), t.subtreeFlags & 6 && (t.flags |= 8192)) : Be(t), null;
    case 24:
      return null;
    case 25:
      return null;
  }
  throw Error(C(156, t.tag));
}
function DA(e, t) {
  switch (dd(t), t.tag) {
    case 1:
      return it(t.type) && hs(), e = t.flags, e & 65536 ? (t.flags = e & -65537 | 128, t) : null;
    case 3:
      return yo(), xe(at), xe(Ke), wd(), e = t.flags, e & 65536 && !(e & 128) ? (t.flags = e & -65537 | 128, t) : null;
    case 5:
      return yd(t), null;
    case 13:
      if (xe(we), e = t.memoizedState, e !== null && e.dehydrated !== null) {
        if (t.alternate === null) throw Error(C(340));
        go();
      }
      return e = t.flags, e & 65536 ? (t.flags = e & -65537 | 128, t) : null;
    case 19:
      return xe(we), null;
    case 4:
      return yo(), null;
    case 10:
      return md(t.type._context), null;
    case 22:
    case 23:
      return Ld(), null;
    case 24:
      return null;
    default:
      return null;
  }
}
var xi = !1, Ze = !1, $A = typeof WeakSet == "function" ? WeakSet : Set, M = null;
function Jr(e, t) {
  var n = e.ref;
  if (n !== null) if (typeof n == "function") try {
    n(null);
  } catch (r) {
    Se(e, t, r);
  }
  else n.current = null;
}
function pc(e, t, n) {
  try {
    n();
  } catch (r) {
    Se(e, t, r);
  }
}
var op = !1;
function MA(e, t) {
  if (Xu = cs, e = lx(), ud(e)) {
    if ("selectionStart" in e) var n = { start: e.selectionStart, end: e.selectionEnd };
    else {
      n = (n = e.ownerDocument) && n.defaultView || window;
      var r = n.getSelection && n.getSelection();
      if (r && r.rangeCount !== 0) {
        n = r.anchorNode;
        var o = r.anchorOffset, a = r.focusNode;
        r = r.focusOffset;
        var i = 0, s = -1, l = -1, c = 0, d = 0, f = e, p = null;
        e: for (; ; ) {
          for (var g; f !== n || o !== 0 && f.nodeType !== 3 || (s = i + o), f !== a || r !== 0 && f.nodeType !== 3 || (l = i + r), f.nodeType === 3 && (i += f.nodeValue.length), (g = f.firstChild) !== null; )
            p = f, f = g;
          for (; ; ) {
            if (f === e) break e;
            if (p === n && ++c === o && (s = i), p === a && ++d === r && (l = i), (g = f.nextSibling) !== null) break;
            f = p, p = f.parentNode;
          }
          f = g;
        }
        n = s === -1 || l === -1 ? null : { start: s, end: l };
      } else n = null;
    }
    n = n || { start: 0, end: 0 };
  } else n = null;
  for (Ju = { focusedElem: e, selectionRange: n }, cs = !1, M = t; M !== null; ) if (t = M, e = t.child, (t.subtreeFlags & 1028) !== 0 && e !== null) e.return = t, M = e;
  else for (; M !== null; ) {
    t = M;
    try {
      var y = t.alternate;
      if (t.flags & 1024) switch (t.tag) {
        case 0:
        case 11:
        case 15:
          break;
        case 1:
          if (y !== null) {
            var m = y.memoizedProps, b = y.memoizedState, u = t.stateNode, h = u.getSnapshotBeforeUpdate(t.elementType === t.type ? m : $t(t.type, m), b);
            u.__reactInternalSnapshotBeforeUpdate = h;
          }
          break;
        case 3:
          var x = t.stateNode.containerInfo;
          x.nodeType === 1 ? x.textContent = "" : x.nodeType === 9 && x.documentElement && x.removeChild(x.documentElement);
          break;
        case 5:
        case 6:
        case 4:
        case 17:
          break;
        default:
          throw Error(C(163));
      }
    } catch (w) {
      Se(t, t.return, w);
    }
    if (e = t.sibling, e !== null) {
      e.return = t.return, M = e;
      break;
    }
    M = t.return;
  }
  return y = op, op = !1, y;
}
function Qo(e, t, n) {
  var r = t.updateQueue;
  if (r = r !== null ? r.lastEffect : null, r !== null) {
    var o = r = r.next;
    do {
      if ((o.tag & e) === e) {
        var a = o.destroy;
        o.destroy = void 0, a !== void 0 && pc(t, n, a);
      }
      o = o.next;
    } while (o !== r);
  }
}
function il(e, t) {
  if (t = t.updateQueue, t = t !== null ? t.lastEffect : null, t !== null) {
    var n = t = t.next;
    do {
      if ((n.tag & e) === e) {
        var r = n.create;
        n.destroy = r();
      }
      n = n.next;
    } while (n !== t);
  }
}
function hc(e) {
  var t = e.ref;
  if (t !== null) {
    var n = e.stateNode;
    switch (e.tag) {
      case 5:
        e = n;
        break;
      default:
        e = n;
    }
    typeof t == "function" ? t(e) : t.current = e;
  }
}
function og(e) {
  var t = e.alternate;
  t !== null && (e.alternate = null, og(t)), e.child = null, e.deletions = null, e.sibling = null, e.tag === 5 && (t = e.stateNode, t !== null && (delete t[tn], delete t[Ra], delete t[ec], delete t[yA], delete t[wA])), e.stateNode = null, e.return = null, e.dependencies = null, e.memoizedProps = null, e.memoizedState = null, e.pendingProps = null, e.stateNode = null, e.updateQueue = null;
}
function ag(e) {
  return e.tag === 5 || e.tag === 3 || e.tag === 4;
}
function ap(e) {
  e: for (; ; ) {
    for (; e.sibling === null; ) {
      if (e.return === null || ag(e.return)) return null;
      e = e.return;
    }
    for (e.sibling.return = e.return, e = e.sibling; e.tag !== 5 && e.tag !== 6 && e.tag !== 18; ) {
      if (e.flags & 2 || e.child === null || e.tag === 4) continue e;
      e.child.return = e, e = e.child;
    }
    if (!(e.flags & 2)) return e.stateNode;
  }
}
function mc(e, t, n) {
  var r = e.tag;
  if (r === 5 || r === 6) e = e.stateNode, t ? n.nodeType === 8 ? n.parentNode.insertBefore(e, t) : n.insertBefore(e, t) : (n.nodeType === 8 ? (t = n.parentNode, t.insertBefore(e, n)) : (t = n, t.appendChild(e)), n = n._reactRootContainer, n != null || t.onclick !== null || (t.onclick = ps));
  else if (r !== 4 && (e = e.child, e !== null)) for (mc(e, t, n), e = e.sibling; e !== null; ) mc(e, t, n), e = e.sibling;
}
function xc(e, t, n) {
  var r = e.tag;
  if (r === 5 || r === 6) e = e.stateNode, t ? n.insertBefore(e, t) : n.appendChild(e);
  else if (r !== 4 && (e = e.child, e !== null)) for (xc(e, t, n), e = e.sibling; e !== null; ) xc(e, t, n), e = e.sibling;
}
var je = null, Mt = !1;
function Pn(e, t, n) {
  for (n = n.child; n !== null; ) ig(e, t, n), n = n.sibling;
}
function ig(e, t, n) {
  if (sn && typeof sn.onCommitFiberUnmount == "function") try {
    sn.onCommitFiberUnmount(Qs, n);
  } catch {
  }
  switch (n.tag) {
    case 5:
      Ze || Jr(n, t);
    case 6:
      var r = je, o = Mt;
      je = null, Pn(e, t, n), je = r, Mt = o, je !== null && (Mt ? (e = je, n = n.stateNode, e.nodeType === 8 ? e.parentNode.removeChild(n) : e.removeChild(n)) : je.removeChild(n.stateNode));
      break;
    case 18:
      je !== null && (Mt ? (e = je, n = n.stateNode, e.nodeType === 8 ? Bl(e.parentNode, n) : e.nodeType === 1 && Bl(e, n), Oa(e)) : Bl(je, n.stateNode));
      break;
    case 4:
      r = je, o = Mt, je = n.stateNode.containerInfo, Mt = !0, Pn(e, t, n), je = r, Mt = o;
      break;
    case 0:
    case 11:
    case 14:
    case 15:
      if (!Ze && (r = n.updateQueue, r !== null && (r = r.lastEffect, r !== null))) {
        o = r = r.next;
        do {
          var a = o, i = a.destroy;
          a = a.tag, i !== void 0 && (a & 2 || a & 4) && pc(n, t, i), o = o.next;
        } while (o !== r);
      }
      Pn(e, t, n);
      break;
    case 1:
      if (!Ze && (Jr(n, t), r = n.stateNode, typeof r.componentWillUnmount == "function")) try {
        r.props = n.memoizedProps, r.state = n.memoizedState, r.componentWillUnmount();
      } catch (s) {
        Se(n, t, s);
      }
      Pn(e, t, n);
      break;
    case 21:
      Pn(e, t, n);
      break;
    case 22:
      n.mode & 1 ? (Ze = (r = Ze) || n.memoizedState !== null, Pn(e, t, n), Ze = r) : Pn(e, t, n);
      break;
    default:
      Pn(e, t, n);
  }
}
function ip(e) {
  var t = e.updateQueue;
  if (t !== null) {
    e.updateQueue = null;
    var n = e.stateNode;
    n === null && (n = e.stateNode = new $A()), t.forEach(function(r) {
      var o = GA.bind(null, e, r);
      n.has(r) || (n.add(r), r.then(o, o));
    });
  }
}
function Pt(e, t) {
  var n = t.deletions;
  if (n !== null) for (var r = 0; r < n.length; r++) {
    var o = n[r];
    try {
      var a = e, i = t, s = i;
      e: for (; s !== null; ) {
        switch (s.tag) {
          case 5:
            je = s.stateNode, Mt = !1;
            break e;
          case 3:
            je = s.stateNode.containerInfo, Mt = !0;
            break e;
          case 4:
            je = s.stateNode.containerInfo, Mt = !0;
            break e;
        }
        s = s.return;
      }
      if (je === null) throw Error(C(160));
      ig(a, i, o), je = null, Mt = !1;
      var l = o.alternate;
      l !== null && (l.return = null), o.return = null;
    } catch (c) {
      Se(o, t, c);
    }
  }
  if (t.subtreeFlags & 12854) for (t = t.child; t !== null; ) sg(t, e), t = t.sibling;
}
function sg(e, t) {
  var n = e.alternate, r = e.flags;
  switch (e.tag) {
    case 0:
    case 11:
    case 14:
    case 15:
      if (Pt(t, e), Kt(e), r & 4) {
        try {
          Qo(3, e, e.return), il(3, e);
        } catch (m) {
          Se(e, e.return, m);
        }
        try {
          Qo(5, e, e.return);
        } catch (m) {
          Se(e, e.return, m);
        }
      }
      break;
    case 1:
      Pt(t, e), Kt(e), r & 512 && n !== null && Jr(n, n.return);
      break;
    case 5:
      if (Pt(t, e), Kt(e), r & 512 && n !== null && Jr(n, n.return), e.flags & 32) {
        var o = e.stateNode;
        try {
          ka(o, "");
        } catch (m) {
          Se(e, e.return, m);
        }
      }
      if (r & 4 && (o = e.stateNode, o != null)) {
        var a = e.memoizedProps, i = n !== null ? n.memoizedProps : a, s = e.type, l = e.updateQueue;
        if (e.updateQueue = null, l !== null) try {
          s === "input" && a.type === "radio" && a.name != null && Nm(o, a), Hu(s, i);
          var c = Hu(s, a);
          for (i = 0; i < l.length; i += 2) {
            var d = l[i], f = l[i + 1];
            d === "style" ? Pm(o, f) : d === "dangerouslySetInnerHTML" ? Am(o, f) : d === "children" ? ka(o, f) : Xc(o, d, f, c);
          }
          switch (s) {
            case "input":
              Du(o, a);
              break;
            case "textarea":
              Im(o, a);
              break;
            case "select":
              var p = o._wrapperState.wasMultiple;
              o._wrapperState.wasMultiple = !!a.multiple;
              var g = a.value;
              g != null ? no(o, !!a.multiple, g, !1) : p !== !!a.multiple && (a.defaultValue != null ? no(
                o,
                !!a.multiple,
                a.defaultValue,
                !0
              ) : no(o, !!a.multiple, a.multiple ? [] : "", !1));
          }
          o[Ra] = a;
        } catch (m) {
          Se(e, e.return, m);
        }
      }
      break;
    case 6:
      if (Pt(t, e), Kt(e), r & 4) {
        if (e.stateNode === null) throw Error(C(162));
        o = e.stateNode, a = e.memoizedProps;
        try {
          o.nodeValue = a;
        } catch (m) {
          Se(e, e.return, m);
        }
      }
      break;
    case 3:
      if (Pt(t, e), Kt(e), r & 4 && n !== null && n.memoizedState.isDehydrated) try {
        Oa(t.containerInfo);
      } catch (m) {
        Se(e, e.return, m);
      }
      break;
    case 4:
      Pt(t, e), Kt(e);
      break;
    case 13:
      Pt(t, e), Kt(e), o = e.child, o.flags & 8192 && (a = o.memoizedState !== null, o.stateNode.isHidden = a, !a || o.alternate !== null && o.alternate.memoizedState !== null || (Nd = ke())), r & 4 && ip(e);
      break;
    case 22:
      if (d = n !== null && n.memoizedState !== null, e.mode & 1 ? (Ze = (c = Ze) || d, Pt(t, e), Ze = c) : Pt(t, e), Kt(e), r & 8192) {
        if (c = e.memoizedState !== null, (e.stateNode.isHidden = c) && !d && e.mode & 1) for (M = e, d = e.child; d !== null; ) {
          for (f = M = d; M !== null; ) {
            switch (p = M, g = p.child, p.tag) {
              case 0:
              case 11:
              case 14:
              case 15:
                Qo(4, p, p.return);
                break;
              case 1:
                Jr(p, p.return);
                var y = p.stateNode;
                if (typeof y.componentWillUnmount == "function") {
                  r = p, n = p.return;
                  try {
                    t = r, y.props = t.memoizedProps, y.state = t.memoizedState, y.componentWillUnmount();
                  } catch (m) {
                    Se(r, n, m);
                  }
                }
                break;
              case 5:
                Jr(p, p.return);
                break;
              case 22:
                if (p.memoizedState !== null) {
                  lp(f);
                  continue;
                }
            }
            g !== null ? (g.return = p, M = g) : lp(f);
          }
          d = d.sibling;
        }
        e: for (d = null, f = e; ; ) {
          if (f.tag === 5) {
            if (d === null) {
              d = f;
              try {
                o = f.stateNode, c ? (a = o.style, typeof a.setProperty == "function" ? a.setProperty("display", "none", "important") : a.display = "none") : (s = f.stateNode, l = f.memoizedProps.style, i = l != null && l.hasOwnProperty("display") ? l.display : null, s.style.display = Rm("display", i));
              } catch (m) {
                Se(e, e.return, m);
              }
            }
          } else if (f.tag === 6) {
            if (d === null) try {
              f.stateNode.nodeValue = c ? "" : f.memoizedProps;
            } catch (m) {
              Se(e, e.return, m);
            }
          } else if ((f.tag !== 22 && f.tag !== 23 || f.memoizedState === null || f === e) && f.child !== null) {
            f.child.return = f, f = f.child;
            continue;
          }
          if (f === e) break e;
          for (; f.sibling === null; ) {
            if (f.return === null || f.return === e) break e;
            d === f && (d = null), f = f.return;
          }
          d === f && (d = null), f.sibling.return = f.return, f = f.sibling;
        }
      }
      break;
    case 19:
      Pt(t, e), Kt(e), r & 4 && ip(e);
      break;
    case 21:
      break;
    default:
      Pt(
        t,
        e
      ), Kt(e);
  }
}
function Kt(e) {
  var t = e.flags;
  if (t & 2) {
    try {
      e: {
        for (var n = e.return; n !== null; ) {
          if (ag(n)) {
            var r = n;
            break e;
          }
          n = n.return;
        }
        throw Error(C(160));
      }
      switch (r.tag) {
        case 5:
          var o = r.stateNode;
          r.flags & 32 && (ka(o, ""), r.flags &= -33);
          var a = ap(e);
          xc(e, a, o);
          break;
        case 3:
        case 4:
          var i = r.stateNode.containerInfo, s = ap(e);
          mc(e, s, i);
          break;
        default:
          throw Error(C(161));
      }
    } catch (l) {
      Se(e, e.return, l);
    }
    e.flags &= -3;
  }
  t & 4096 && (e.flags &= -4097);
}
function jA(e, t, n) {
  M = e, lg(e);
}
function lg(e, t, n) {
  for (var r = (e.mode & 1) !== 0; M !== null; ) {
    var o = M, a = o.child;
    if (o.tag === 22 && r) {
      var i = o.memoizedState !== null || xi;
      if (!i) {
        var s = o.alternate, l = s !== null && s.memoizedState !== null || Ze;
        s = xi;
        var c = Ze;
        if (xi = i, (Ze = l) && !c) for (M = o; M !== null; ) i = M, l = i.child, i.tag === 22 && i.memoizedState !== null ? up(o) : l !== null ? (l.return = i, M = l) : up(o);
        for (; a !== null; ) M = a, lg(a), a = a.sibling;
        M = o, xi = s, Ze = c;
      }
      sp(e);
    } else o.subtreeFlags & 8772 && a !== null ? (a.return = o, M = a) : sp(e);
  }
}
function sp(e) {
  for (; M !== null; ) {
    var t = M;
    if (t.flags & 8772) {
      var n = t.alternate;
      try {
        if (t.flags & 8772) switch (t.tag) {
          case 0:
          case 11:
          case 15:
            Ze || il(5, t);
            break;
          case 1:
            var r = t.stateNode;
            if (t.flags & 4 && !Ze) if (n === null) r.componentDidMount();
            else {
              var o = t.elementType === t.type ? n.memoizedProps : $t(t.type, n.memoizedProps);
              r.componentDidUpdate(o, n.memoizedState, r.__reactInternalSnapshotBeforeUpdate);
            }
            var a = t.updateQueue;
            a !== null && W0(t, a, r);
            break;
          case 3:
            var i = t.updateQueue;
            if (i !== null) {
              if (n = null, t.child !== null) switch (t.child.tag) {
                case 5:
                  n = t.child.stateNode;
                  break;
                case 1:
                  n = t.child.stateNode;
              }
              W0(t, i, n);
            }
            break;
          case 5:
            var s = t.stateNode;
            if (n === null && t.flags & 4) {
              n = s;
              var l = t.memoizedProps;
              switch (t.type) {
                case "button":
                case "input":
                case "select":
                case "textarea":
                  l.autoFocus && n.focus();
                  break;
                case "img":
                  l.src && (n.src = l.src);
              }
            }
            break;
          case 6:
            break;
          case 4:
            break;
          case 12:
            break;
          case 13:
            if (t.memoizedState === null) {
              var c = t.alternate;
              if (c !== null) {
                var d = c.memoizedState;
                if (d !== null) {
                  var f = d.dehydrated;
                  f !== null && Oa(f);
                }
              }
            }
            break;
          case 19:
          case 17:
          case 21:
          case 22:
          case 23:
          case 25:
            break;
          default:
            throw Error(C(163));
        }
        Ze || t.flags & 512 && hc(t);
      } catch (p) {
        Se(t, t.return, p);
      }
    }
    if (t === e) {
      M = null;
      break;
    }
    if (n = t.sibling, n !== null) {
      n.return = t.return, M = n;
      break;
    }
    M = t.return;
  }
}
function lp(e) {
  for (; M !== null; ) {
    var t = M;
    if (t === e) {
      M = null;
      break;
    }
    var n = t.sibling;
    if (n !== null) {
      n.return = t.return, M = n;
      break;
    }
    M = t.return;
  }
}
function up(e) {
  for (; M !== null; ) {
    var t = M;
    try {
      switch (t.tag) {
        case 0:
        case 11:
        case 15:
          var n = t.return;
          try {
            il(4, t);
          } catch (l) {
            Se(t, n, l);
          }
          break;
        case 1:
          var r = t.stateNode;
          if (typeof r.componentDidMount == "function") {
            var o = t.return;
            try {
              r.componentDidMount();
            } catch (l) {
              Se(t, o, l);
            }
          }
          var a = t.return;
          try {
            hc(t);
          } catch (l) {
            Se(t, a, l);
          }
          break;
        case 5:
          var i = t.return;
          try {
            hc(t);
          } catch (l) {
            Se(t, i, l);
          }
      }
    } catch (l) {
      Se(t, t.return, l);
    }
    if (t === e) {
      M = null;
      break;
    }
    var s = t.sibling;
    if (s !== null) {
      s.return = t.return, M = s;
      break;
    }
    M = t.return;
  }
}
var FA = Math.ceil, ks = Ln.ReactCurrentDispatcher, Td = Ln.ReactCurrentOwner, Tt = Ln.ReactCurrentBatchConfig, te = 0, $e = null, Te = null, He = 0, pt = 0, Qr = sr(0), Le = 0, Fa = null, kr = 0, sl = 0, Od = 0, qo = null, rt = null, Nd = 0, bo = 1 / 0, gn = null, Es = !1, gc = null, Kn = null, gi = !1, Vn = null, Cs = 0, ea = 0, vc = null, Pi = -1, Di = 0;
function qe() {
  return te & 6 ? ke() : Pi !== -1 ? Pi : Pi = ke();
}
function Xn(e) {
  return e.mode & 1 ? te & 2 && He !== 0 ? He & -He : _A.transition !== null ? (Di === 0 && (Di = Gm()), Di) : (e = ue, e !== 0 || (e = window.event, e = e === void 0 ? 16 : qm(e.type)), e) : 1;
}
function zt(e, t, n, r) {
  if (50 < ea) throw ea = 0, vc = null, Error(C(185));
  Za(e, n, r), (!(te & 2) || e !== $e) && (e === $e && (!(te & 2) && (sl |= n), Le === 4 && Fn(e, He)), st(e, r), n === 1 && te === 0 && !(t.mode & 1) && (bo = ke() + 500, rl && lr()));
}
function st(e, t) {
  var n = e.callbackNode;
  _8(e, t);
  var r = us(e, e === $e ? He : 0);
  if (r === 0) n !== null && v0(n), e.callbackNode = null, e.callbackPriority = 0;
  else if (t = r & -r, e.callbackPriority !== t) {
    if (n != null && v0(n), t === 1) e.tag === 0 ? bA(cp.bind(null, e)) : vx(cp.bind(null, e)), gA(function() {
      !(te & 6) && lr();
    }), n = null;
    else {
      switch (Zm(r)) {
        case 1:
          n = td;
          break;
        case 4:
          n = Bm;
          break;
        case 16:
          n = ls;
          break;
        case 536870912:
          n = Wm;
          break;
        default:
          n = ls;
      }
      n = xg(n, ug.bind(null, e));
    }
    e.callbackPriority = t, e.callbackNode = n;
  }
}
function ug(e, t) {
  if (Pi = -1, Di = 0, te & 6) throw Error(C(327));
  var n = e.callbackNode;
  if (so() && e.callbackNode !== n) return null;
  var r = us(e, e === $e ? He : 0);
  if (r === 0) return null;
  if (r & 30 || r & e.expiredLanes || t) t = Ts(e, r);
  else {
    t = r;
    var o = te;
    te |= 2;
    var a = dg();
    ($e !== e || He !== t) && (gn = null, bo = ke() + 500, xr(e, t));
    do
      try {
        VA();
        break;
      } catch (s) {
        cg(e, s);
      }
    while (!0);
    hd(), ks.current = a, te = o, Te !== null ? t = 0 : ($e = null, He = 0, t = Le);
  }
  if (t !== 0) {
    if (t === 2 && (o = Wu(e), o !== 0 && (r = o, t = yc(e, o))), t === 1) throw n = Fa, xr(e, 0), Fn(e, r), st(e, ke()), n;
    if (t === 6) Fn(e, r);
    else {
      if (o = e.current.alternate, !(r & 30) && !HA(o) && (t = Ts(e, r), t === 2 && (a = Wu(e), a !== 0 && (r = a, t = yc(e, a))), t === 1)) throw n = Fa, xr(e, 0), Fn(e, r), st(e, ke()), n;
      switch (e.finishedWork = o, e.finishedLanes = r, t) {
        case 0:
        case 1:
          throw Error(C(345));
        case 2:
          cr(e, rt, gn);
          break;
        case 3:
          if (Fn(e, r), (r & 130023424) === r && (t = Nd + 500 - ke(), 10 < t)) {
            if (us(e, 0) !== 0) break;
            if (o = e.suspendedLanes, (o & r) !== r) {
              qe(), e.pingedLanes |= e.suspendedLanes & o;
              break;
            }
            e.timeoutHandle = qu(cr.bind(null, e, rt, gn), t);
            break;
          }
          cr(e, rt, gn);
          break;
        case 4:
          if (Fn(e, r), (r & 4194240) === r) break;
          for (t = e.eventTimes, o = -1; 0 < r; ) {
            var i = 31 - Vt(r);
            a = 1 << i, i = t[i], i > o && (o = i), r &= ~a;
          }
          if (r = o, r = ke() - r, r = (120 > r ? 120 : 480 > r ? 480 : 1080 > r ? 1080 : 1920 > r ? 1920 : 3e3 > r ? 3e3 : 4320 > r ? 4320 : 1960 * FA(r / 1960)) - r, 10 < r) {
            e.timeoutHandle = qu(cr.bind(null, e, rt, gn), r);
            break;
          }
          cr(e, rt, gn);
          break;
        case 5:
          cr(e, rt, gn);
          break;
        default:
          throw Error(C(329));
      }
    }
  }
  return st(e, ke()), e.callbackNode === n ? ug.bind(null, e) : null;
}
function yc(e, t) {
  var n = qo;
  return e.current.memoizedState.isDehydrated && (xr(e, t).flags |= 256), e = Ts(e, t), e !== 2 && (t = rt, rt = n, t !== null && wc(t)), e;
}
function wc(e) {
  rt === null ? rt = e : rt.push.apply(rt, e);
}
function HA(e) {
  for (var t = e; ; ) {
    if (t.flags & 16384) {
      var n = t.updateQueue;
      if (n !== null && (n = n.stores, n !== null)) for (var r = 0; r < n.length; r++) {
        var o = n[r], a = o.getSnapshot;
        o = o.value;
        try {
          if (!Wt(a(), o)) return !1;
        } catch {
          return !1;
        }
      }
    }
    if (n = t.child, t.subtreeFlags & 16384 && n !== null) n.return = t, t = n;
    else {
      if (t === e) break;
      for (; t.sibling === null; ) {
        if (t.return === null || t.return === e) return !0;
        t = t.return;
      }
      t.sibling.return = t.return, t = t.sibling;
    }
  }
  return !0;
}
function Fn(e, t) {
  for (t &= ~Od, t &= ~sl, e.suspendedLanes |= t, e.pingedLanes &= ~t, e = e.expirationTimes; 0 < t; ) {
    var n = 31 - Vt(t), r = 1 << n;
    e[n] = -1, t &= ~r;
  }
}
function cp(e) {
  if (te & 6) throw Error(C(327));
  so();
  var t = us(e, 0);
  if (!(t & 1)) return st(e, ke()), null;
  var n = Ts(e, t);
  if (e.tag !== 0 && n === 2) {
    var r = Wu(e);
    r !== 0 && (t = r, n = yc(e, r));
  }
  if (n === 1) throw n = Fa, xr(e, 0), Fn(e, t), st(e, ke()), n;
  if (n === 6) throw Error(C(345));
  return e.finishedWork = e.current.alternate, e.finishedLanes = t, cr(e, rt, gn), st(e, ke()), null;
}
function Id(e, t) {
  var n = te;
  te |= 1;
  try {
    return e(t);
  } finally {
    te = n, te === 0 && (bo = ke() + 500, rl && lr());
  }
}
function Er(e) {
  Vn !== null && Vn.tag === 0 && !(te & 6) && so();
  var t = te;
  te |= 1;
  var n = Tt.transition, r = ue;
  try {
    if (Tt.transition = null, ue = 1, e) return e();
  } finally {
    ue = r, Tt.transition = n, te = t, !(te & 6) && lr();
  }
}
function Ld() {
  pt = Qr.current, xe(Qr);
}
function xr(e, t) {
  e.finishedWork = null, e.finishedLanes = 0;
  var n = e.timeoutHandle;
  if (n !== -1 && (e.timeoutHandle = -1, xA(n)), Te !== null) for (n = Te.return; n !== null; ) {
    var r = n;
    switch (dd(r), r.tag) {
      case 1:
        r = r.type.childContextTypes, r != null && hs();
        break;
      case 3:
        yo(), xe(at), xe(Ke), wd();
        break;
      case 5:
        yd(r);
        break;
      case 4:
        yo();
        break;
      case 13:
        xe(we);
        break;
      case 19:
        xe(we);
        break;
      case 10:
        md(r.type._context);
        break;
      case 22:
      case 23:
        Ld();
    }
    n = n.return;
  }
  if ($e = e, Te = e = Jn(e.current, null), He = pt = t, Le = 0, Fa = null, Od = sl = kr = 0, rt = qo = null, pr !== null) {
    for (t = 0; t < pr.length; t++) if (n = pr[t], r = n.interleaved, r !== null) {
      n.interleaved = null;
      var o = r.next, a = n.pending;
      if (a !== null) {
        var i = a.next;
        a.next = o, r.next = i;
      }
      n.pending = r;
    }
    pr = null;
  }
  return e;
}
function cg(e, t) {
  do {
    var n = Te;
    try {
      if (hd(), Li.current = Ss, _s) {
        for (var r = be.memoizedState; r !== null; ) {
          var o = r.queue;
          o !== null && (o.pending = null), r = r.next;
        }
        _s = !1;
      }
      if (Sr = 0, De = Ie = be = null, Jo = !1, $a = 0, Td.current = null, n === null || n.return === null) {
        Le = 1, Fa = t, Te = null;
        break;
      }
      e: {
        var a = e, i = n.return, s = n, l = t;
        if (t = He, s.flags |= 32768, l !== null && typeof l == "object" && typeof l.then == "function") {
          var c = l, d = s, f = d.tag;
          if (!(d.mode & 1) && (f === 0 || f === 11 || f === 15)) {
            var p = d.alternate;
            p ? (d.updateQueue = p.updateQueue, d.memoizedState = p.memoizedState, d.lanes = p.lanes) : (d.updateQueue = null, d.memoizedState = null);
          }
          var g = J0(i);
          if (g !== null) {
            g.flags &= -257, Q0(g, i, s, a, t), g.mode & 1 && X0(a, c, t), t = g, l = c;
            var y = t.updateQueue;
            if (y === null) {
              var m = /* @__PURE__ */ new Set();
              m.add(l), t.updateQueue = m;
            } else y.add(l);
            break e;
          } else {
            if (!(t & 1)) {
              X0(a, c, t), Ad();
              break e;
            }
            l = Error(C(426));
          }
        } else if (ve && s.mode & 1) {
          var b = J0(i);
          if (b !== null) {
            !(b.flags & 65536) && (b.flags |= 256), Q0(b, i, s, a, t), fd(wo(l, s));
            break e;
          }
        }
        a = l = wo(l, s), Le !== 4 && (Le = 2), qo === null ? qo = [a] : qo.push(a), a = i;
        do {
          switch (a.tag) {
            case 3:
              a.flags |= 65536, t &= -t, a.lanes |= t;
              var u = Zx(a, l, t);
              B0(a, u);
              break e;
            case 1:
              s = l;
              var h = a.type, x = a.stateNode;
              if (!(a.flags & 128) && (typeof h.getDerivedStateFromError == "function" || x !== null && typeof x.componentDidCatch == "function" && (Kn === null || !Kn.has(x)))) {
                a.flags |= 65536, t &= -t, a.lanes |= t;
                var w = Yx(a, s, t);
                B0(a, w);
                break e;
              }
          }
          a = a.return;
        } while (a !== null);
      }
      pg(n);
    } catch (S) {
      t = S, Te === n && n !== null && (Te = n = n.return);
      continue;
    }
    break;
  } while (!0);
}
function dg() {
  var e = ks.current;
  return ks.current = Ss, e === null ? Ss : e;
}
function Ad() {
  (Le === 0 || Le === 3 || Le === 2) && (Le = 4), $e === null || !(kr & 268435455) && !(sl & 268435455) || Fn($e, He);
}
function Ts(e, t) {
  var n = te;
  te |= 2;
  var r = dg();
  ($e !== e || He !== t) && (gn = null, xr(e, t));
  do
    try {
      UA();
      break;
    } catch (o) {
      cg(e, o);
    }
  while (!0);
  if (hd(), te = n, ks.current = r, Te !== null) throw Error(C(261));
  return $e = null, He = 0, Le;
}
function UA() {
  for (; Te !== null; ) fg(Te);
}
function VA() {
  for (; Te !== null && !p8(); ) fg(Te);
}
function fg(e) {
  var t = mg(e.alternate, e, pt);
  e.memoizedProps = e.pendingProps, t === null ? pg(e) : Te = t, Td.current = null;
}
function pg(e) {
  var t = e;
  do {
    var n = t.alternate;
    if (e = t.return, t.flags & 32768) {
      if (n = DA(n, t), n !== null) {
        n.flags &= 32767, Te = n;
        return;
      }
      if (e !== null) e.flags |= 32768, e.subtreeFlags = 0, e.deletions = null;
      else {
        Le = 6, Te = null;
        return;
      }
    } else if (n = PA(n, t, pt), n !== null) {
      Te = n;
      return;
    }
    if (t = t.sibling, t !== null) {
      Te = t;
      return;
    }
    Te = t = e;
  } while (t !== null);
  Le === 0 && (Le = 5);
}
function cr(e, t, n) {
  var r = ue, o = Tt.transition;
  try {
    Tt.transition = null, ue = 1, zA(e, t, n, r);
  } finally {
    Tt.transition = o, ue = r;
  }
  return null;
}
function zA(e, t, n, r) {
  do
    so();
  while (Vn !== null);
  if (te & 6) throw Error(C(327));
  n = e.finishedWork;
  var o = e.finishedLanes;
  if (n === null) return null;
  if (e.finishedWork = null, e.finishedLanes = 0, n === e.current) throw Error(C(177));
  e.callbackNode = null, e.callbackPriority = 0;
  var a = n.lanes | n.childLanes;
  if (S8(e, a), e === $e && (Te = $e = null, He = 0), !(n.subtreeFlags & 2064) && !(n.flags & 2064) || gi || (gi = !0, xg(ls, function() {
    return so(), null;
  })), a = (n.flags & 15990) !== 0, n.subtreeFlags & 15990 || a) {
    a = Tt.transition, Tt.transition = null;
    var i = ue;
    ue = 1;
    var s = te;
    te |= 4, Td.current = null, MA(e, n), sg(n, e), uA(Ju), cs = !!Xu, Ju = Xu = null, e.current = n, jA(n), h8(), te = s, ue = i, Tt.transition = a;
  } else e.current = n;
  if (gi && (gi = !1, Vn = e, Cs = o), a = e.pendingLanes, a === 0 && (Kn = null), g8(n.stateNode), st(e, ke()), t !== null) for (r = e.onRecoverableError, n = 0; n < t.length; n++) o = t[n], r(o.value, { componentStack: o.stack, digest: o.digest });
  if (Es) throw Es = !1, e = gc, gc = null, e;
  return Cs & 1 && e.tag !== 0 && so(), a = e.pendingLanes, a & 1 ? e === vc ? ea++ : (ea = 0, vc = e) : ea = 0, lr(), null;
}
function so() {
  if (Vn !== null) {
    var e = Zm(Cs), t = Tt.transition, n = ue;
    try {
      if (Tt.transition = null, ue = 16 > e ? 16 : e, Vn === null) var r = !1;
      else {
        if (e = Vn, Vn = null, Cs = 0, te & 6) throw Error(C(331));
        var o = te;
        for (te |= 4, M = e.current; M !== null; ) {
          var a = M, i = a.child;
          if (M.flags & 16) {
            var s = a.deletions;
            if (s !== null) {
              for (var l = 0; l < s.length; l++) {
                var c = s[l];
                for (M = c; M !== null; ) {
                  var d = M;
                  switch (d.tag) {
                    case 0:
                    case 11:
                    case 15:
                      Qo(8, d, a);
                  }
                  var f = d.child;
                  if (f !== null) f.return = d, M = f;
                  else for (; M !== null; ) {
                    d = M;
                    var p = d.sibling, g = d.return;
                    if (og(d), d === c) {
                      M = null;
                      break;
                    }
                    if (p !== null) {
                      p.return = g, M = p;
                      break;
                    }
                    M = g;
                  }
                }
              }
              var y = a.alternate;
              if (y !== null) {
                var m = y.child;
                if (m !== null) {
                  y.child = null;
                  do {
                    var b = m.sibling;
                    m.sibling = null, m = b;
                  } while (m !== null);
                }
              }
              M = a;
            }
          }
          if (a.subtreeFlags & 2064 && i !== null) i.return = a, M = i;
          else e: for (; M !== null; ) {
            if (a = M, a.flags & 2048) switch (a.tag) {
              case 0:
              case 11:
              case 15:
                Qo(9, a, a.return);
            }
            var u = a.sibling;
            if (u !== null) {
              u.return = a.return, M = u;
              break e;
            }
            M = a.return;
          }
        }
        var h = e.current;
        for (M = h; M !== null; ) {
          i = M;
          var x = i.child;
          if (i.subtreeFlags & 2064 && x !== null) x.return = i, M = x;
          else e: for (i = h; M !== null; ) {
            if (s = M, s.flags & 2048) try {
              switch (s.tag) {
                case 0:
                case 11:
                case 15:
                  il(9, s);
              }
            } catch (S) {
              Se(s, s.return, S);
            }
            if (s === i) {
              M = null;
              break e;
            }
            var w = s.sibling;
            if (w !== null) {
              w.return = s.return, M = w;
              break e;
            }
            M = s.return;
          }
        }
        if (te = o, lr(), sn && typeof sn.onPostCommitFiberRoot == "function") try {
          sn.onPostCommitFiberRoot(Qs, e);
        } catch {
        }
        r = !0;
      }
      return r;
    } finally {
      ue = n, Tt.transition = t;
    }
  }
  return !1;
}
function dp(e, t, n) {
  t = wo(n, t), t = Zx(e, t, 1), e = Yn(e, t, 1), t = qe(), e !== null && (Za(e, 1, t), st(e, t));
}
function Se(e, t, n) {
  if (e.tag === 3) dp(e, e, n);
  else for (; t !== null; ) {
    if (t.tag === 3) {
      dp(t, e, n);
      break;
    } else if (t.tag === 1) {
      var r = t.stateNode;
      if (typeof t.type.getDerivedStateFromError == "function" || typeof r.componentDidCatch == "function" && (Kn === null || !Kn.has(r))) {
        e = wo(n, e), e = Yx(t, e, 1), t = Yn(t, e, 1), e = qe(), t !== null && (Za(t, 1, e), st(t, e));
        break;
      }
    }
    t = t.return;
  }
}
function BA(e, t, n) {
  var r = e.pingCache;
  r !== null && r.delete(t), t = qe(), e.pingedLanes |= e.suspendedLanes & n, $e === e && (He & n) === n && (Le === 4 || Le === 3 && (He & 130023424) === He && 500 > ke() - Nd ? xr(e, 0) : Od |= n), st(e, t);
}
function hg(e, t) {
  t === 0 && (e.mode & 1 ? (t = si, si <<= 1, !(si & 130023424) && (si = 4194304)) : t = 1);
  var n = qe();
  e = Tn(e, t), e !== null && (Za(e, t, n), st(e, n));
}
function WA(e) {
  var t = e.memoizedState, n = 0;
  t !== null && (n = t.retryLane), hg(e, n);
}
function GA(e, t) {
  var n = 0;
  switch (e.tag) {
    case 13:
      var r = e.stateNode, o = e.memoizedState;
      o !== null && (n = o.retryLane);
      break;
    case 19:
      r = e.stateNode;
      break;
    default:
      throw Error(C(314));
  }
  r !== null && r.delete(t), hg(e, n);
}
var mg;
mg = function(e, t, n) {
  if (e !== null) if (e.memoizedProps !== t.pendingProps || at.current) ot = !0;
  else {
    if (!(e.lanes & n) && !(t.flags & 128)) return ot = !1, RA(e, t, n);
    ot = !!(e.flags & 131072);
  }
  else ot = !1, ve && t.flags & 1048576 && yx(t, gs, t.index);
  switch (t.lanes = 0, t.tag) {
    case 2:
      var r = t.type;
      Ri(e, t), e = t.pendingProps;
      var o = xo(t, Ke.current);
      io(t, n), o = _d(null, t, r, e, o, n);
      var a = Sd();
      return t.flags |= 1, typeof o == "object" && o !== null && typeof o.render == "function" && o.$$typeof === void 0 ? (t.tag = 1, t.memoizedState = null, t.updateQueue = null, it(r) ? (a = !0, ms(t)) : a = !1, t.memoizedState = o.state !== null && o.state !== void 0 ? o.state : null, gd(t), o.updater = al, t.stateNode = o, o._reactInternals = t, ic(t, r, e, n), t = uc(null, t, r, !0, a, n)) : (t.tag = 0, ve && a && cd(t), Qe(null, t, o, n), t = t.child), t;
    case 16:
      r = t.elementType;
      e: {
        switch (Ri(e, t), e = t.pendingProps, o = r._init, r = o(r._payload), t.type = r, o = t.tag = YA(r), e = $t(r, e), o) {
          case 0:
            t = lc(null, t, r, e, n);
            break e;
          case 1:
            t = tp(null, t, r, e, n);
            break e;
          case 11:
            t = q0(null, t, r, e, n);
            break e;
          case 14:
            t = ep(null, t, r, $t(r.type, e), n);
            break e;
        }
        throw Error(C(
          306,
          r,
          ""
        ));
      }
      return t;
    case 0:
      return r = t.type, o = t.pendingProps, o = t.elementType === r ? o : $t(r, o), lc(e, t, r, o, n);
    case 1:
      return r = t.type, o = t.pendingProps, o = t.elementType === r ? o : $t(r, o), tp(e, t, r, o, n);
    case 3:
      e: {
        if (Qx(t), e === null) throw Error(C(387));
        r = t.pendingProps, a = t.memoizedState, o = a.element, Ex(e, t), ws(t, r, null, n);
        var i = t.memoizedState;
        if (r = i.element, a.isDehydrated) if (a = { element: r, isDehydrated: !1, cache: i.cache, pendingSuspenseBoundaries: i.pendingSuspenseBoundaries, transitions: i.transitions }, t.updateQueue.baseState = a, t.memoizedState = a, t.flags & 256) {
          o = wo(Error(C(423)), t), t = np(e, t, r, n, o);
          break e;
        } else if (r !== o) {
          o = wo(Error(C(424)), t), t = np(e, t, r, n, o);
          break e;
        } else for (ht = Zn(t.stateNode.containerInfo.firstChild), gt = t, ve = !0, jt = null, n = Sx(t, null, r, n), t.child = n; n; ) n.flags = n.flags & -3 | 4096, n = n.sibling;
        else {
          if (go(), r === o) {
            t = On(e, t, n);
            break e;
          }
          Qe(e, t, r, n);
        }
        t = t.child;
      }
      return t;
    case 5:
      return Cx(t), e === null && rc(t), r = t.type, o = t.pendingProps, a = e !== null ? e.memoizedProps : null, i = o.children, Qu(r, o) ? i = null : a !== null && Qu(r, a) && (t.flags |= 32), Jx(e, t), Qe(e, t, i, n), t.child;
    case 6:
      return e === null && rc(t), null;
    case 13:
      return qx(e, t, n);
    case 4:
      return vd(t, t.stateNode.containerInfo), r = t.pendingProps, e === null ? t.child = vo(t, null, r, n) : Qe(e, t, r, n), t.child;
    case 11:
      return r = t.type, o = t.pendingProps, o = t.elementType === r ? o : $t(r, o), q0(e, t, r, o, n);
    case 7:
      return Qe(e, t, t.pendingProps, n), t.child;
    case 8:
      return Qe(e, t, t.pendingProps.children, n), t.child;
    case 12:
      return Qe(e, t, t.pendingProps.children, n), t.child;
    case 10:
      e: {
        if (r = t.type._context, o = t.pendingProps, a = t.memoizedProps, i = o.value, pe(vs, r._currentValue), r._currentValue = i, a !== null) if (Wt(a.value, i)) {
          if (a.children === o.children && !at.current) {
            t = On(e, t, n);
            break e;
          }
        } else for (a = t.child, a !== null && (a.return = t); a !== null; ) {
          var s = a.dependencies;
          if (s !== null) {
            i = a.child;
            for (var l = s.firstContext; l !== null; ) {
              if (l.context === r) {
                if (a.tag === 1) {
                  l = Sn(-1, n & -n), l.tag = 2;
                  var c = a.updateQueue;
                  if (c !== null) {
                    c = c.shared;
                    var d = c.pending;
                    d === null ? l.next = l : (l.next = d.next, d.next = l), c.pending = l;
                  }
                }
                a.lanes |= n, l = a.alternate, l !== null && (l.lanes |= n), oc(
                  a.return,
                  n,
                  t
                ), s.lanes |= n;
                break;
              }
              l = l.next;
            }
          } else if (a.tag === 10) i = a.type === t.type ? null : a.child;
          else if (a.tag === 18) {
            if (i = a.return, i === null) throw Error(C(341));
            i.lanes |= n, s = i.alternate, s !== null && (s.lanes |= n), oc(i, n, t), i = a.sibling;
          } else i = a.child;
          if (i !== null) i.return = a;
          else for (i = a; i !== null; ) {
            if (i === t) {
              i = null;
              break;
            }
            if (a = i.sibling, a !== null) {
              a.return = i.return, i = a;
              break;
            }
            i = i.return;
          }
          a = i;
        }
        Qe(e, t, o.children, n), t = t.child;
      }
      return t;
    case 9:
      return o = t.type, r = t.pendingProps.children, io(t, n), o = Ot(o), r = r(o), t.flags |= 1, Qe(e, t, r, n), t.child;
    case 14:
      return r = t.type, o = $t(r, t.pendingProps), o = $t(r.type, o), ep(e, t, r, o, n);
    case 15:
      return Kx(e, t, t.type, t.pendingProps, n);
    case 17:
      return r = t.type, o = t.pendingProps, o = t.elementType === r ? o : $t(r, o), Ri(e, t), t.tag = 1, it(r) ? (e = !0, ms(t)) : e = !1, io(t, n), Gx(t, r, o), ic(t, r, o, n), uc(null, t, r, !0, e, n);
    case 19:
      return eg(e, t, n);
    case 22:
      return Xx(e, t, n);
  }
  throw Error(C(156, t.tag));
};
function xg(e, t) {
  return zm(e, t);
}
function ZA(e, t, n, r) {
  this.tag = e, this.key = n, this.sibling = this.child = this.return = this.stateNode = this.type = this.elementType = null, this.index = 0, this.ref = null, this.pendingProps = t, this.dependencies = this.memoizedState = this.updateQueue = this.memoizedProps = null, this.mode = r, this.subtreeFlags = this.flags = 0, this.deletions = null, this.childLanes = this.lanes = 0, this.alternate = null;
}
function Ct(e, t, n, r) {
  return new ZA(e, t, n, r);
}
function Rd(e) {
  return e = e.prototype, !(!e || !e.isReactComponent);
}
function YA(e) {
  if (typeof e == "function") return Rd(e) ? 1 : 0;
  if (e != null) {
    if (e = e.$$typeof, e === Qc) return 11;
    if (e === qc) return 14;
  }
  return 2;
}
function Jn(e, t) {
  var n = e.alternate;
  return n === null ? (n = Ct(e.tag, t, e.key, e.mode), n.elementType = e.elementType, n.type = e.type, n.stateNode = e.stateNode, n.alternate = e, e.alternate = n) : (n.pendingProps = t, n.type = e.type, n.flags = 0, n.subtreeFlags = 0, n.deletions = null), n.flags = e.flags & 14680064, n.childLanes = e.childLanes, n.lanes = e.lanes, n.child = e.child, n.memoizedProps = e.memoizedProps, n.memoizedState = e.memoizedState, n.updateQueue = e.updateQueue, t = e.dependencies, n.dependencies = t === null ? null : { lanes: t.lanes, firstContext: t.firstContext }, n.sibling = e.sibling, n.index = e.index, n.ref = e.ref, n;
}
function $i(e, t, n, r, o, a) {
  var i = 2;
  if (r = e, typeof e == "function") Rd(e) && (i = 1);
  else if (typeof e == "string") i = 5;
  else e: switch (e) {
    case Vr:
      return gr(n.children, o, a, t);
    case Jc:
      i = 8, o |= 8;
      break;
    case Iu:
      return e = Ct(12, n, t, o | 2), e.elementType = Iu, e.lanes = a, e;
    case Lu:
      return e = Ct(13, n, t, o), e.elementType = Lu, e.lanes = a, e;
    case Au:
      return e = Ct(19, n, t, o), e.elementType = Au, e.lanes = a, e;
    case Cm:
      return ll(n, o, a, t);
    default:
      if (typeof e == "object" && e !== null) switch (e.$$typeof) {
        case km:
          i = 10;
          break e;
        case Em:
          i = 9;
          break e;
        case Qc:
          i = 11;
          break e;
        case qc:
          i = 14;
          break e;
        case Dn:
          i = 16, r = null;
          break e;
      }
      throw Error(C(130, e == null ? e : typeof e, ""));
  }
  return t = Ct(i, n, t, o), t.elementType = e, t.type = r, t.lanes = a, t;
}
function gr(e, t, n, r) {
  return e = Ct(7, e, r, t), e.lanes = n, e;
}
function ll(e, t, n, r) {
  return e = Ct(22, e, r, t), e.elementType = Cm, e.lanes = n, e.stateNode = { isHidden: !1 }, e;
}
function Ql(e, t, n) {
  return e = Ct(6, e, null, t), e.lanes = n, e;
}
function ql(e, t, n) {
  return t = Ct(4, e.children !== null ? e.children : [], e.key, t), t.lanes = n, t.stateNode = { containerInfo: e.containerInfo, pendingChildren: null, implementation: e.implementation }, t;
}
function KA(e, t, n, r, o) {
  this.tag = t, this.containerInfo = e, this.finishedWork = this.pingCache = this.current = this.pendingChildren = null, this.timeoutHandle = -1, this.callbackNode = this.pendingContext = this.context = null, this.callbackPriority = 0, this.eventTimes = Rl(0), this.expirationTimes = Rl(-1), this.entangledLanes = this.finishedLanes = this.mutableReadLanes = this.expiredLanes = this.pingedLanes = this.suspendedLanes = this.pendingLanes = 0, this.entanglements = Rl(0), this.identifierPrefix = r, this.onRecoverableError = o, this.mutableSourceEagerHydrationData = null;
}
function Pd(e, t, n, r, o, a, i, s, l) {
  return e = new KA(e, t, n, s, l), t === 1 ? (t = 1, a === !0 && (t |= 8)) : t = 0, a = Ct(3, null, null, t), e.current = a, a.stateNode = e, a.memoizedState = { element: r, isDehydrated: n, cache: null, transitions: null, pendingSuspenseBoundaries: null }, gd(a), e;
}
function XA(e, t, n) {
  var r = 3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
  return { $$typeof: Ur, key: r == null ? null : "" + r, children: e, containerInfo: t, implementation: n };
}
function gg(e) {
  if (!e) return or;
  e = e._reactInternals;
  e: {
    if (Or(e) !== e || e.tag !== 1) throw Error(C(170));
    var t = e;
    do {
      switch (t.tag) {
        case 3:
          t = t.stateNode.context;
          break e;
        case 1:
          if (it(t.type)) {
            t = t.stateNode.__reactInternalMemoizedMergedChildContext;
            break e;
          }
      }
      t = t.return;
    } while (t !== null);
    throw Error(C(171));
  }
  if (e.tag === 1) {
    var n = e.type;
    if (it(n)) return gx(e, n, t);
  }
  return t;
}
function vg(e, t, n, r, o, a, i, s, l) {
  return e = Pd(n, r, !0, e, o, a, i, s, l), e.context = gg(null), n = e.current, r = qe(), o = Xn(n), a = Sn(r, o), a.callback = t ?? null, Yn(n, a, o), e.current.lanes = o, Za(e, o, r), st(e, r), e;
}
function ul(e, t, n, r) {
  var o = t.current, a = qe(), i = Xn(o);
  return n = gg(n), t.context === null ? t.context = n : t.pendingContext = n, t = Sn(a, i), t.payload = { element: e }, r = r === void 0 ? null : r, r !== null && (t.callback = r), e = Yn(o, t, i), e !== null && (zt(e, o, i, a), Ii(e, o, i)), i;
}
function Os(e) {
  if (e = e.current, !e.child) return null;
  switch (e.child.tag) {
    case 5:
      return e.child.stateNode;
    default:
      return e.child.stateNode;
  }
}
function fp(e, t) {
  if (e = e.memoizedState, e !== null && e.dehydrated !== null) {
    var n = e.retryLane;
    e.retryLane = n !== 0 && n < t ? n : t;
  }
}
function Dd(e, t) {
  fp(e, t), (e = e.alternate) && fp(e, t);
}
function JA() {
  return null;
}
var yg = typeof reportError == "function" ? reportError : function(e) {
  console.error(e);
};
function $d(e) {
  this._internalRoot = e;
}
cl.prototype.render = $d.prototype.render = function(e) {
  var t = this._internalRoot;
  if (t === null) throw Error(C(409));
  ul(e, t, null, null);
};
cl.prototype.unmount = $d.prototype.unmount = function() {
  var e = this._internalRoot;
  if (e !== null) {
    this._internalRoot = null;
    var t = e.containerInfo;
    Er(function() {
      ul(null, e, null, null);
    }), t[Cn] = null;
  }
};
function cl(e) {
  this._internalRoot = e;
}
cl.prototype.unstable_scheduleHydration = function(e) {
  if (e) {
    var t = Xm();
    e = { blockedOn: null, target: e, priority: t };
    for (var n = 0; n < jn.length && t !== 0 && t < jn[n].priority; n++) ;
    jn.splice(n, 0, e), n === 0 && Qm(e);
  }
};
function Md(e) {
  return !(!e || e.nodeType !== 1 && e.nodeType !== 9 && e.nodeType !== 11);
}
function dl(e) {
  return !(!e || e.nodeType !== 1 && e.nodeType !== 9 && e.nodeType !== 11 && (e.nodeType !== 8 || e.nodeValue !== " react-mount-point-unstable "));
}
function pp() {
}
function QA(e, t, n, r, o) {
  if (o) {
    if (typeof r == "function") {
      var a = r;
      r = function() {
        var c = Os(i);
        a.call(c);
      };
    }
    var i = vg(t, r, e, 0, null, !1, !1, "", pp);
    return e._reactRootContainer = i, e[Cn] = i.current, La(e.nodeType === 8 ? e.parentNode : e), Er(), i;
  }
  for (; o = e.lastChild; ) e.removeChild(o);
  if (typeof r == "function") {
    var s = r;
    r = function() {
      var c = Os(l);
      s.call(c);
    };
  }
  var l = Pd(e, 0, !1, null, null, !1, !1, "", pp);
  return e._reactRootContainer = l, e[Cn] = l.current, La(e.nodeType === 8 ? e.parentNode : e), Er(function() {
    ul(t, l, n, r);
  }), l;
}
function fl(e, t, n, r, o) {
  var a = n._reactRootContainer;
  if (a) {
    var i = a;
    if (typeof o == "function") {
      var s = o;
      o = function() {
        var l = Os(i);
        s.call(l);
      };
    }
    ul(t, i, e, o);
  } else i = QA(n, t, e, o, r);
  return Os(i);
}
Ym = function(e) {
  switch (e.tag) {
    case 3:
      var t = e.stateNode;
      if (t.current.memoizedState.isDehydrated) {
        var n = zo(t.pendingLanes);
        n !== 0 && (nd(t, n | 1), st(t, ke()), !(te & 6) && (bo = ke() + 500, lr()));
      }
      break;
    case 13:
      Er(function() {
        var r = Tn(e, 1);
        if (r !== null) {
          var o = qe();
          zt(r, e, 1, o);
        }
      }), Dd(e, 1);
  }
};
rd = function(e) {
  if (e.tag === 13) {
    var t = Tn(e, 134217728);
    if (t !== null) {
      var n = qe();
      zt(t, e, 134217728, n);
    }
    Dd(e, 134217728);
  }
};
Km = function(e) {
  if (e.tag === 13) {
    var t = Xn(e), n = Tn(e, t);
    if (n !== null) {
      var r = qe();
      zt(n, e, t, r);
    }
    Dd(e, t);
  }
};
Xm = function() {
  return ue;
};
Jm = function(e, t) {
  var n = ue;
  try {
    return ue = e, t();
  } finally {
    ue = n;
  }
};
Vu = function(e, t, n) {
  switch (t) {
    case "input":
      if (Du(e, n), t = n.name, n.type === "radio" && t != null) {
        for (n = e; n.parentNode; ) n = n.parentNode;
        for (n = n.querySelectorAll("input[name=" + JSON.stringify("" + t) + '][type="radio"]'), t = 0; t < n.length; t++) {
          var r = n[t];
          if (r !== e && r.form === e.form) {
            var o = nl(r);
            if (!o) throw Error(C(90));
            Om(r), Du(r, o);
          }
        }
      }
      break;
    case "textarea":
      Im(e, n);
      break;
    case "select":
      t = n.value, t != null && no(e, !!n.multiple, t, !1);
  }
};
Mm = Id;
jm = Er;
var qA = { usingClientEntryPoint: !1, Events: [Ka, Gr, nl, Dm, $m, Id] }, jo = { findFiberByHostInstance: fr, bundleType: 0, version: "18.3.1", rendererPackageName: "react-dom" }, eR = { bundleType: jo.bundleType, version: jo.version, rendererPackageName: jo.rendererPackageName, rendererConfig: jo.rendererConfig, overrideHookState: null, overrideHookStateDeletePath: null, overrideHookStateRenamePath: null, overrideProps: null, overridePropsDeletePath: null, overridePropsRenamePath: null, setErrorHandler: null, setSuspenseHandler: null, scheduleUpdate: null, currentDispatcherRef: Ln.ReactCurrentDispatcher, findHostInstanceByFiber: function(e) {
  return e = Um(e), e === null ? null : e.stateNode;
}, findFiberByHostInstance: jo.findFiberByHostInstance || JA, findHostInstancesForRefresh: null, scheduleRefresh: null, scheduleRoot: null, setRefreshHandler: null, getCurrentFiber: null, reconcilerVersion: "18.3.1-next-f1338f8080-20240426" };
if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < "u") {
  var vi = __REACT_DEVTOOLS_GLOBAL_HOOK__;
  if (!vi.isDisabled && vi.supportsFiber) try {
    Qs = vi.inject(eR), sn = vi;
  } catch {
  }
}
wt.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = qA;
wt.createPortal = function(e, t) {
  var n = 2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
  if (!Md(t)) throw Error(C(200));
  return XA(e, t, null, n);
};
wt.createRoot = function(e, t) {
  if (!Md(e)) throw Error(C(299));
  var n = !1, r = "", o = yg;
  return t != null && (t.unstable_strictMode === !0 && (n = !0), t.identifierPrefix !== void 0 && (r = t.identifierPrefix), t.onRecoverableError !== void 0 && (o = t.onRecoverableError)), t = Pd(e, 1, !1, null, null, n, !1, r, o), e[Cn] = t.current, La(e.nodeType === 8 ? e.parentNode : e), new $d(t);
};
wt.findDOMNode = function(e) {
  if (e == null) return null;
  if (e.nodeType === 1) return e;
  var t = e._reactInternals;
  if (t === void 0)
    throw typeof e.render == "function" ? Error(C(188)) : (e = Object.keys(e).join(","), Error(C(268, e)));
  return e = Um(t), e = e === null ? null : e.stateNode, e;
};
wt.flushSync = function(e) {
  return Er(e);
};
wt.hydrate = function(e, t, n) {
  if (!dl(t)) throw Error(C(200));
  return fl(null, e, t, !0, n);
};
wt.hydrateRoot = function(e, t, n) {
  if (!Md(e)) throw Error(C(405));
  var r = n != null && n.hydratedSources || null, o = !1, a = "", i = yg;
  if (n != null && (n.unstable_strictMode === !0 && (o = !0), n.identifierPrefix !== void 0 && (a = n.identifierPrefix), n.onRecoverableError !== void 0 && (i = n.onRecoverableError)), t = vg(t, null, e, 1, n ?? null, o, !1, a, i), e[Cn] = t.current, La(e), r) for (e = 0; e < r.length; e++) n = r[e], o = n._getVersion, o = o(n._source), t.mutableSourceEagerHydrationData == null ? t.mutableSourceEagerHydrationData = [n, o] : t.mutableSourceEagerHydrationData.push(
    n,
    o
  );
  return new cl(t);
};
wt.render = function(e, t, n) {
  if (!dl(t)) throw Error(C(200));
  return fl(null, e, t, !1, n);
};
wt.unmountComponentAtNode = function(e) {
  if (!dl(e)) throw Error(C(40));
  return e._reactRootContainer ? (Er(function() {
    fl(null, null, e, !1, function() {
      e._reactRootContainer = null, e[Cn] = null;
    });
  }), !0) : !1;
};
wt.unstable_batchedUpdates = Id;
wt.unstable_renderSubtreeIntoContainer = function(e, t, n, r) {
  if (!dl(n)) throw Error(C(200));
  if (e == null || e._reactInternals === void 0) throw Error(C(38));
  return fl(e, t, n, !1, r);
};
wt.version = "18.3.1-next-f1338f8080-20240426";
function wg() {
  if (!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > "u" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != "function"))
    try {
      __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(wg);
    } catch (e) {
      console.error(e);
    }
}
wg(), wm.exports = wt;
var tR = wm.exports, Mi, nR = tR;
Mi = nR.createRoot;
function rR(e) {
  return Object.values(Ou).find((r) => r === Dh(e, 0).getAttribute("data-captcha-type")) || "frictionless";
}
const bg = (e) => (e || (e = ""), GL.parse({
  defaultEnvironment: os.parse("production"),
  userAccountAddress: "",
  account: {
    address: e
  },
  serverUrl: "",
  mongoAtlasUri: "mongodb+srv://<MONGO_URI_HERE>/frictionless_events",
  devOnlyWatchEvents: !1
})), _g = (e) => document.querySelector('script[src*="'.concat(e, '"]')), oR = (e) => {
  const t = _g(e);
  if (t && t.src.indexOf("".concat(e)) !== -1) {
    const n = new URLSearchParams(t.src.split("?")[1]);
    return {
      onloadUrlCallback: n.get("onload") || void 0,
      renderExplicit: n.get("render") || void 0
    };
  }
  return { onloadUrlCallback: void 0, renderExplicit: void 0 };
}, aR = (e) => e.closest("form"), dr = (e) => {
  const t = window[e.replace("window.", "")];
  if (typeof t != "function")
    throw new Error("Callback ".concat(e, " is not defined on the window object"));
  return t;
}, iR = (e) => ({
  onHuman: (t) => bc(e, t),
  onChallengeExpired: () => {
    en();
  },
  onExpired: () => {
    en(), alert("Completed challenge has expired, please try again");
  },
  onError: (t) => {
    en(), console.error(t);
  },
  onClose: () => {
  },
  onOpen: () => {
  }
});
function sR(e, t, n) {
  if (typeof (e == null ? void 0 : e.callback) == "function") {
    const r = e.callback;
    t.onHuman = (o) => {
      bc(n, o), r(o);
    };
  } else {
    const r = typeof (e == null ? void 0 : e.callback) == "string" ? e == null ? void 0 : e.callback : n.getAttribute("data-callback");
    r && (t.onHuman = (o) => {
      bc(n, o), dr(r)(o);
    });
  }
  if (e != null && e["chalexpired-callback"] && typeof e["chalexpired-callback"] == "function") {
    const r = e["chalexpired-callback"];
    t.onChallengeExpired = () => {
      en(), r();
    };
  } else {
    const r = typeof (e == null ? void 0 : e["chalexpired-callback"]) == "string" ? e == null ? void 0 : e["chalexpired-callback"] : n.getAttribute("data-chalexpired-callback");
    r && (t.onChallengeExpired = () => {
      const o = dr(r);
      en(), o();
    });
  }
  if (e != null && e["expired-callback"] && typeof e["expired-callback"] == "function") {
    const r = e["expired-callback"];
    t.onExpired = () => {
      en(), r();
    };
  } else {
    const r = typeof (e == null ? void 0 : e["expired-callback"]) == "string" ? e == null ? void 0 : e["expired-callback"] : n.getAttribute("data-expired-callback");
    r && (t.onExpired = () => {
      const o = dr(r);
      en(), o();
    });
  }
  if (e != null && e["error-callback"] && typeof e["error-callback"] == "function") {
    const r = e["error-callback"];
    t.onError = () => {
      en(), r();
    };
  } else {
    const r = typeof (e == null ? void 0 : e["error-callback"]) == "string" ? e == null ? void 0 : e["error-callback"] : n.getAttribute("data-error-callback");
    r && (t.onError = () => {
      const o = dr(r);
      en(), o();
    });
  }
  if (typeof (e == null ? void 0 : e["close-callback"]) == "function")
    t.onClose = e["close-callback"];
  else {
    const r = typeof (e == null ? void 0 : e["close-callback"]) == "string" ? e == null ? void 0 : e["close-callback"] : n.getAttribute("data-close-callback");
    r && (t.onClose = dr(r));
  }
  if (e != null && e["open-callback"])
    if (typeof e["open-callback"] == "function")
      t.onOpen = e["open-callback"];
    else {
      const r = typeof (e == null ? void 0 : e["open-callback"]) == "string" ? e == null ? void 0 : e["open-callback"] : n.getAttribute("data-open-callback");
      r && (t.onOpen = dr(r));
    }
}
const bc = (e, t) => {
  en();
  const n = aR(e);
  if (!n) {
    console.error("Parent form not found for the element:", e);
    return;
  }
  const r = document.createElement("input");
  r.type = "hidden", r.name = $.procaptchaResponse, r.value = t, n.appendChild(r);
}, en = () => {
  Array.from(document.getElementsByName($.procaptchaResponse)).map((t) => t.remove());
}, lR = (e, t, n) => {
  const r = (e == null ? void 0 : e.language) || t.getAttribute("data-language");
  r && (n.language = uR(r));
}, uR = (e) => {
  try {
    return Tu.parse(e);
  } catch {
    return console.error("Invalid language attribute: ".concat(e)), Tu.parse("en");
  }
}, cR = (e, t, n) => {
  const r = (e == null ? void 0 : e.theme) || t.getAttribute("data-theme") || "light";
  n.theme = fR(r);
}, dR = /* @__PURE__ */ new Set(["light", "dark"]), fR = (e) => dR.has(e) ? e : "light", pR = (e, t, n) => {
  const r = (e == null ? void 0 : e["challenge-valid-length"]) || t.getAttribute("data-challenge-valid-length");
  r && (n.captchas.image.solutionTimeout = Number.parseInt(r), n.captchas.pow.solutionTimeout = Number.parseInt(r));
};
var hp;
const Sg = "procaptcha.bundle.js", hR = () => {
  const e = Array.from(document.getElementsByClassName("procaptcha"));
  if (e.length) {
    const t = Dh(e, 0).getAttribute("data-sitekey");
    if (!t) {
      console.error("No siteKey found");
      return;
    }
    const n = rR(e);
    kg(e, bg(t), { captchaType: n, siteKey: t });
  }
}, kg = (e, t, n) => {
  for (const r of e) {
    const o = iR(r);
    switch (sR(n, o, r), cR(n, r, t), pR(n, r, t), lR(n, r, t), n == null ? void 0 : n.captchaType) {
      case "pow":
        Mi(r).render(rn.jsx(vm, { config: t, callbacks: o }));
        break;
      case "frictionless":
        Mi(r).render(rn.jsx(XL, { config: t, callbacks: o }));
        break;
      default:
        Mi(r).render(rn.jsx(ym, { config: t, callbacks: o }));
        break;
    }
  }
}, mR = (e, t) => {
  const n = t.siteKey;
  kg([e], bg(n), t);
};
function jd(e) {
  document && document.readyState !== "loading" ? e() : document.addEventListener("DOMContentLoaded", e);
}
window.procaptcha = { ready: jd, render: mR };
const { onloadUrlCallback: mp, renderExplicit: xR } = oR(Sg);
xR !== "explicit" && jd(hR);
if (mp) {
  const e = dr(mp);
  (hp = _g(Sg)) == null || hp.addEventListener("load", () => {
    jd(e);
  });
}
export {
  $ as A,
  wR as B,
  Q6 as C,
  gp as D,
  yi as E,
  CO as F,
  Oh as G,
  Lh as H,
  gR as I,
  kR as J,
  Ch as K,
  eL as L,
  Ih as M,
  R6 as N,
  zc as O,
  dO as P,
  Eh as Q,
  Hg as R,
  _R as S,
  Ah as T,
  St as U,
  CR as V,
  Mh as W,
  mR as X,
  jd as Y,
  Yg as _,
  Dh as a,
  fO as b,
  bR as c,
  GL as d,
  ER as e,
  Hh as f,
  Hn as g,
  q6 as h,
  lo as i,
  Y as j,
  Y6 as k,
  Fh as l,
  X6 as m,
  J6 as n,
  K6 as o,
  Z6 as p,
  W6 as q,
  le as r,
  G6 as s,
  aL as t,
  Xg as u,
  Jg as v,
  yR as w,
  vR as x,
  Nn as y,
  Pe as z
};
