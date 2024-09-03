function kh(e, t) {
  for (var n = 0; n < t.length; n++) {
    const r = t[n];
    if (typeof r != "string" && !Array.isArray(r)) {
      for (const i in r)
        if (i !== "default" && !(i in e)) {
          const a = Object.getOwnPropertyDescriptor(r, i);
          a && Object.defineProperty(e, i, a.get ? a : {
            enumerable: !0,
            get: () => r[i]
          });
        }
    }
  }
  return Object.freeze(Object.defineProperty(e, Symbol.toStringTag, { value: "Module" }));
}
var Nw = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {};
function Sh(e) {
  return e && e.__esModule && Object.prototype.hasOwnProperty.call(e, "default") ? e.default : e;
}
var Md = { exports: {} }, Go = {}, Od = { exports: {} }, Y = {};
var fa = Symbol.for("react.element"), Ch = Symbol.for("react.portal"), bh = Symbol.for("react.fragment"), Eh = Symbol.for("react.strict_mode"), Th = Symbol.for("react.profiler"), Ph = Symbol.for("react.provider"), Nh = Symbol.for("react.context"), Lh = Symbol.for("react.forward_ref"), Ih = Symbol.for("react.suspense"), Rh = Symbol.for("react.memo"), Dh = Symbol.for("react.lazy"), Fc = Symbol.iterator;
function Mh(e) {
  return e === null || typeof e != "object" ? null : (e = Fc && e[Fc] || e["@@iterator"], typeof e == "function" ? e : null);
}
var Hd = { isMounted: function() {
  return !1;
}, enqueueForceUpdate: function() {
}, enqueueReplaceState: function() {
}, enqueueSetState: function() {
} }, Ad = Object.assign, jd = {};
function Qr(e, t, n) {
  this.props = e, this.context = t, this.refs = jd, this.updater = n || Hd;
}
Qr.prototype.isReactComponent = {};
Qr.prototype.setState = function(e, t) {
  if (typeof e != "object" && typeof e != "function" && e != null) throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");
  this.updater.enqueueSetState(this, e, t, "setState");
};
Qr.prototype.forceUpdate = function(e) {
  this.updater.enqueueForceUpdate(this, e, "forceUpdate");
};
function Fd() {
}
Fd.prototype = Qr.prototype;
function Cu(e, t, n) {
  this.props = e, this.context = t, this.refs = jd, this.updater = n || Hd;
}
var bu = Cu.prototype = new Fd();
bu.constructor = Cu;
Ad(bu, Qr.prototype);
bu.isPureReactComponent = !0;
var zc = Array.isArray, zd = Object.prototype.hasOwnProperty, Eu = { current: null }, Wd = { key: !0, ref: !0, __self: !0, __source: !0 };
function Vd(e, t, n) {
  var r, i = {}, a = null, o = null;
  if (t != null) for (r in t.ref !== void 0 && (o = t.ref), t.key !== void 0 && (a = "" + t.key), t) zd.call(t, r) && !Wd.hasOwnProperty(r) && (i[r] = t[r]);
  var s = arguments.length - 2;
  if (s === 1) i.children = n;
  else if (1 < s) {
    for (var l = Array(s), c = 0; c < s; c++) l[c] = arguments[c + 2];
    i.children = l;
  }
  if (e && e.defaultProps) for (r in s = e.defaultProps, s) i[r] === void 0 && (i[r] = s[r]);
  return { $$typeof: fa, type: e, key: a, ref: o, props: i, _owner: Eu.current };
}
function Oh(e, t) {
  return { $$typeof: fa, type: e.type, key: t, ref: e.ref, props: e.props, _owner: e._owner };
}
function Tu(e) {
  return typeof e == "object" && e !== null && e.$$typeof === fa;
}
function Hh(e) {
  var t = { "=": "=0", ":": "=2" };
  return "$" + e.replace(/[=:]/g, function(n) {
    return t[n];
  });
}
var Wc = /\/+/g;
function Is(e, t) {
  return typeof e == "object" && e !== null && e.key != null ? Hh("" + e.key) : t.toString(36);
}
function Wa(e, t, n, r, i) {
  var a = typeof e;
  (a === "undefined" || a === "boolean") && (e = null);
  var o = !1;
  if (e === null) o = !0;
  else switch (a) {
    case "string":
    case "number":
      o = !0;
      break;
    case "object":
      switch (e.$$typeof) {
        case fa:
        case Ch:
          o = !0;
      }
  }
  if (o) return o = e, i = i(o), e = r === "" ? "." + Is(o, 0) : r, zc(i) ? (n = "", e != null && (n = e.replace(Wc, "$&/") + "/"), Wa(i, t, n, "", function(c) {
    return c;
  })) : i != null && (Tu(i) && (i = Oh(i, n + (!i.key || o && o.key === i.key ? "" : ("" + i.key).replace(Wc, "$&/") + "/") + e)), t.push(i)), 1;
  if (o = 0, r = r === "" ? "." : r + ":", zc(e)) for (var s = 0; s < e.length; s++) {
    a = e[s];
    var l = r + Is(a, s);
    o += Wa(a, t, n, l, i);
  }
  else if (l = Mh(e), typeof l == "function") for (e = l.call(e), s = 0; !(a = e.next()).done; ) a = a.value, l = r + Is(a, s++), o += Wa(a, t, n, l, i);
  else if (a === "object") throw t = String(e), Error("Objects are not valid as a React child (found: " + (t === "[object Object]" ? "object with keys {" + Object.keys(e).join(", ") + "}" : t) + "). If you meant to render a collection of children, use an array instead.");
  return o;
}
function ka(e, t, n) {
  if (e == null) return e;
  var r = [], i = 0;
  return Wa(e, r, "", "", function(a) {
    return t.call(n, a, i++);
  }), r;
}
function Ah(e) {
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
var $e = { current: null }, Va = { transition: null }, jh = { ReactCurrentDispatcher: $e, ReactCurrentBatchConfig: Va, ReactCurrentOwner: Eu };
function Bd() {
  throw Error("act(...) is not supported in production builds of React.");
}
Y.Children = { map: ka, forEach: function(e, t, n) {
  ka(e, function() {
    t.apply(this, arguments);
  }, n);
}, count: function(e) {
  var t = 0;
  return ka(e, function() {
    t++;
  }), t;
}, toArray: function(e) {
  return ka(e, function(t) {
    return t;
  }) || [];
}, only: function(e) {
  if (!Tu(e)) throw Error("React.Children.only expected to receive a single React element child.");
  return e;
} };
Y.Component = Qr;
Y.Fragment = bh;
Y.Profiler = Th;
Y.PureComponent = Cu;
Y.StrictMode = Eh;
Y.Suspense = Ih;
Y.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = jh;
Y.act = Bd;
Y.cloneElement = function(e, t, n) {
  if (e == null) throw Error("React.cloneElement(...): The argument must be a React element, but you passed " + e + ".");
  var r = Ad({}, e.props), i = e.key, a = e.ref, o = e._owner;
  if (t != null) {
    if (t.ref !== void 0 && (a = t.ref, o = Eu.current), t.key !== void 0 && (i = "" + t.key), e.type && e.type.defaultProps) var s = e.type.defaultProps;
    for (l in t) zd.call(t, l) && !Wd.hasOwnProperty(l) && (r[l] = t[l] === void 0 && s !== void 0 ? s[l] : t[l]);
  }
  var l = arguments.length - 2;
  if (l === 1) r.children = n;
  else if (1 < l) {
    s = Array(l);
    for (var c = 0; c < l; c++) s[c] = arguments[c + 2];
    r.children = s;
  }
  return { $$typeof: fa, type: e.type, key: i, ref: a, props: r, _owner: o };
};
Y.createContext = function(e) {
  return e = { $$typeof: Nh, _currentValue: e, _currentValue2: e, _threadCount: 0, Provider: null, Consumer: null, _defaultValue: null, _globalName: null }, e.Provider = { $$typeof: Ph, _context: e }, e.Consumer = e;
};
Y.createElement = Vd;
Y.createFactory = function(e) {
  var t = Vd.bind(null, e);
  return t.type = e, t;
};
Y.createRef = function() {
  return { current: null };
};
Y.forwardRef = function(e) {
  return { $$typeof: Lh, render: e };
};
Y.isValidElement = Tu;
Y.lazy = function(e) {
  return { $$typeof: Dh, _payload: { _status: -1, _result: e }, _init: Ah };
};
Y.memo = function(e, t) {
  return { $$typeof: Rh, type: e, compare: t === void 0 ? null : t };
};
Y.startTransition = function(e) {
  var t = Va.transition;
  Va.transition = {};
  try {
    e();
  } finally {
    Va.transition = t;
  }
};
Y.unstable_act = Bd;
Y.useCallback = function(e, t) {
  return $e.current.useCallback(e, t);
};
Y.useContext = function(e) {
  return $e.current.useContext(e);
};
Y.useDebugValue = function() {
};
Y.useDeferredValue = function(e) {
  return $e.current.useDeferredValue(e);
};
Y.useEffect = function(e, t) {
  return $e.current.useEffect(e, t);
};
Y.useId = function() {
  return $e.current.useId();
};
Y.useImperativeHandle = function(e, t, n) {
  return $e.current.useImperativeHandle(e, t, n);
};
Y.useInsertionEffect = function(e, t) {
  return $e.current.useInsertionEffect(e, t);
};
Y.useLayoutEffect = function(e, t) {
  return $e.current.useLayoutEffect(e, t);
};
Y.useMemo = function(e, t) {
  return $e.current.useMemo(e, t);
};
Y.useReducer = function(e, t, n) {
  return $e.current.useReducer(e, t, n);
};
Y.useRef = function(e) {
  return $e.current.useRef(e);
};
Y.useState = function(e) {
  return $e.current.useState(e);
};
Y.useSyncExternalStore = function(e, t, n) {
  return $e.current.useSyncExternalStore(e, t, n);
};
Y.useTransition = function() {
  return $e.current.useTransition();
};
Y.version = "18.3.1";
Od.exports = Y;
var ae = Od.exports;
const Fh = /* @__PURE__ */ Sh(ae), Vc = /* @__PURE__ */ kh({
  __proto__: null,
  default: Fh
}, [ae]);
var zh = ae, Wh = Symbol.for("react.element"), Vh = Symbol.for("react.fragment"), Bh = Object.prototype.hasOwnProperty, Uh = zh.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner, $h = { key: !0, ref: !0, __self: !0, __source: !0 };
function Ud(e, t, n) {
  var r, i = {}, a = null, o = null;
  n !== void 0 && (a = "" + n), t.key !== void 0 && (a = "" + t.key), t.ref !== void 0 && (o = t.ref);
  for (r in t) Bh.call(t, r) && !$h.hasOwnProperty(r) && (i[r] = t[r]);
  if (e && e.defaultProps) for (r in t = e.defaultProps, t) i[r] === void 0 && (i[r] = t[r]);
  return { $$typeof: Wh, type: e, key: a, ref: o, props: i, _owner: Uh.current };
}
Go.Fragment = Vh;
Go.jsx = Ud;
Go.jsxs = Ud;
Md.exports = Go;
var Bt = Md.exports, v = U;
(function(e, t) {
  for (var n = U, r = e(); ; )
    try {
      var i = -parseInt(n(1152)) / 1 * (-parseInt(n(1189)) / 2) + -parseInt(n(857)) / 3 * (parseInt(n(1254)) / 4) + -parseInt(n(848)) / 5 + parseInt(n(553)) / 6 + parseInt(n(707)) / 7 * (-parseInt(n(327)) / 8) + parseInt(n(1099)) / 9 + -parseInt(n(1112)) / 10 * (-parseInt(n(316)) / 11);
      if (i === t) break;
      r.push(r.shift());
    } catch {
      r.push(r.shift());
    }
})(oo, 900342);
var dl = function(e, t) {
  return dl = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(n, r) {
    var i = U;
    n[i(784)] = r;
  } || function(n, r) {
    var i = U;
    for (var a in r)
      Object.prototype.hasOwnProperty[i(583)](r, a) && (n[a] = r[a]);
  }, dl(e, t);
};
function Zh(e, t) {
  var n = U;
  if (typeof t !== n(425) && t !== null)
    throw new TypeError(n(1048) + String(t) + n(511));
  dl(e, t);
  function r() {
    this.constructor = e;
  }
  e[n(886)] = t === null ? Object[n(851)](t) : (r[n(886)] = t[n(886)], new r());
}
var fl = function() {
  var e = U;
  return fl = Object[e(819)] || function(n) {
    for (var r = e, i, a = 1, o = arguments.length; a < o; a++) {
      i = arguments[a];
      for (var s in i)
        Object[r(886)][r(509)][r(583)](i, s) && (n[s] = i[s]);
    }
    return n;
  }, fl[e(1241)](this, arguments);
};
function Ke(e, t, n, r) {
  function i(a) {
    return a instanceof n ? a : new n(function(o) {
      o(a);
    });
  }
  return new (n || (n = Promise))(function(a, o) {
    var s = U;
    function l(f) {
      try {
        d(r.next(f));
      } catch (m) {
        o(m);
      }
    }
    function c(f) {
      var m = U;
      try {
        d(r[m(644)](f));
      } catch (w) {
        o(w);
      }
    }
    function d(f) {
      var m = U;
      f[m(820)] ? a(f[m(1223)]) : i(f.value)[m(475)](l, c);
    }
    d((r = r[s(1241)](e, []))[s(710)]());
  });
}
function qe(e, t) {
  var n = U, r = {
    label: 0,
    sent: function() {
      if (o[0] & 1) throw o[1];
      return o[1];
    },
    trys: [],
    ops: []
  }, i, a, o, s;
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
    if (i) throw new TypeError(f(580));
    for (; s && (s = 0, d[0] && (r = 0)), r; )
      try {
        if (i = 1, a && (o = d[0] & 2 ? a[f(485)] : d[0] ? a[f(644)] || ((o = a.return) && o.call(a), 0) : a[f(710)]) && !(o = o.call(a, d[1]))[f(820)])
          return o;
        switch (a = 0, o && (d = [d[0] & 2, o[f(1223)]]), d[0]) {
          case 0:
          case 1:
            o = d;
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
            if (o = r.trys, !(o = o.length > 0 && o[o.length - 1]) && (d[0] === 6 || d[0] === 2)) {
              r = 0;
              continue;
            }
            if (d[0] === 3 && (!o || d[1] > o[0] && d[1] < o[3])) {
              r[f(979)] = d[1];
              break;
            }
            if (d[0] === 6 && r[f(979)] < o[1]) {
              r[f(979)] = o[1], o = d;
              break;
            }
            if (o && r[f(979)] < o[2]) {
              r[f(979)] = o[2], r[f(1260)].push(d);
              break;
            }
            o[2] && r[f(1260)][f(1267)](), r[f(816)][f(1267)]();
            continue;
        }
        d = t[f(583)](e, r);
      } catch (m) {
        d = [6, m], a = 0;
      } finally {
        i = o = 0;
      }
    if (d[0] & 5) throw d[1];
    return { value: d[0] ? d[1] : void 0, done: !0 };
  }
}
function ao(e, t, n) {
  var r = U;
  if (n || arguments[r(343)] === 2)
    for (var i = 0, a = t.length, o; i < a; i++)
      (o || !(i in t)) && (o || (o = Array[r(886)][r(1269)][r(583)](t, 0, i)), o[i] = t[i]);
  return e.concat(o || Array[r(886)][r(1269)][r(583)](t));
}
var $d = v(808);
function Ni(e, t) {
  return new Promise(function(n) {
    return setTimeout(n, e, t);
  });
}
function Gh(e, t) {
  var n = v;
  t === void 0 && (t = 1 / 0);
  var r = window[n(690)];
  return r ? new Promise(function(i) {
    return r.call(
      window,
      function() {
        return i();
      },
      { timeout: t }
    );
  }) : Ni(Math.min(e, t));
}
function Zd(e) {
  var t = v;
  return !!e && typeof e[t(475)] === t(425);
}
function Bc(e, t) {
  try {
    var n = e();
    Zd(n) ? n.then(
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
function Uc(e, t, n) {
  return n === void 0 && (n = 16), Ke(this, void 0, void 0, function() {
    var r, i, a, o;
    return qe(this, function(s) {
      var l = U;
      switch (s[l(979)]) {
        case 0:
          r = Array(e[l(343)]), i = Date[l(738)](), a = 0, s.label = 1;
        case 1:
          return a < e[l(343)] ? (r[a] = t(e[a], a), o = Date[l(738)](), o >= i + n ? (i = o, [4, Ni(0)]) : [3, 3]) : [3, 4];
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
function Li(e) {
  var t = v;
  e[t(475)](void 0, function() {
  });
}
function fn(e, t) {
  e = [e[0] >>> 16, e[0] & 65535, e[1] >>> 16, e[1] & 65535], t = [
    t[0] >>> 16,
    t[0] & 65535,
    t[1] >>> 16,
    t[1] & 65535
  ];
  var n = [0, 0, 0, 0];
  return n[3] += e[3] + t[3], n[2] += n[3] >>> 16, n[3] &= 65535, n[2] += e[2] + t[2], n[1] += n[2] >>> 16, n[2] &= 65535, n[1] += e[1] + t[1], n[0] += n[1] >>> 16, n[1] &= 65535, n[0] += e[0] + t[0], n[0] &= 65535, [n[0] << 16 | n[1], n[2] << 16 | n[3]];
}
function pt(e, t) {
  e = [e[0] >>> 16, e[0] & 65535, e[1] >>> 16, e[1] & 65535], t = [
    t[0] >>> 16,
    t[0] & 65535,
    t[1] >>> 16,
    t[1] & 65535
  ];
  var n = [0, 0, 0, 0];
  return n[3] += e[3] * t[3], n[2] += n[3] >>> 16, n[3] &= 65535, n[2] += e[2] * t[3], n[1] += n[2] >>> 16, n[2] &= 65535, n[2] += e[3] * t[2], n[1] += n[2] >>> 16, n[2] &= 65535, n[1] += e[1] * t[3], n[0] += n[1] >>> 16, n[1] &= 65535, n[1] += e[2] * t[2], n[0] += n[1] >>> 16, n[1] &= 65535, n[1] += e[3] * t[1], n[0] += n[1] >>> 16, n[1] &= 65535, n[0] += e[0] * t[3] + e[1] * t[2] + e[2] * t[1] + e[3] * t[0], n[0] &= 65535, [n[0] << 16 | n[1], n[2] << 16 | n[3]];
}
function ur(e, t) {
  return t %= 64, t === 32 ? [e[1], e[0]] : t < 32 ? [
    e[0] << t | e[1] >>> 32 - t,
    e[1] << t | e[0] >>> 32 - t
  ] : (t -= 32, [
    e[1] << t | e[0] >>> 32 - t,
    e[0] << t | e[1] >>> 32 - t
  ]);
}
function nt(e, t) {
  return t %= 64, t === 0 ? e : t < 32 ? [e[0] << t | e[1] >>> 32 - t, e[1] << t] : [e[1] << t - 32, 0];
}
function fe(e, t) {
  return [e[0] ^ t[0], e[1] ^ t[1]];
}
function $c(e) {
  return e = fe(e, [0, e[0] >>> 1]), e = pt(e, [4283543511, 3981806797]), e = fe(e, [0, e[0] >>> 1]), e = pt(e, [3301882366, 444984403]), e = fe(e, [0, e[0] >>> 1]), e;
}
function Yh(e, t) {
  var n = v;
  e = e || "", t = t || 0;
  var r = e[n(343)] % 16, i = e.length - r, a = [0, t], o = [0, t], s = [0, 0], l = [0, 0], c = [2277735313, 289559509], d = [1291169091, 658871167], f;
  for (f = 0; f < i; f = f + 16)
    s = [
      e[n(655)](f + 4) & 255 | (e[n(655)](f + 5) & 255) << 8 | (e[n(655)](f + 6) & 255) << 16 | (e[n(655)](f + 7) & 255) << 24,
      e.charCodeAt(f) & 255 | (e[n(655)](f + 1) & 255) << 8 | (e[n(655)](f + 2) & 255) << 16 | (e.charCodeAt(f + 3) & 255) << 24
    ], l = [
      e[n(655)](f + 12) & 255 | (e[n(655)](f + 13) & 255) << 8 | (e[n(655)](f + 14) & 255) << 16 | (e[n(655)](f + 15) & 255) << 24,
      e[n(655)](f + 8) & 255 | (e[n(655)](f + 9) & 255) << 8 | (e.charCodeAt(f + 10) & 255) << 16 | (e[n(655)](f + 11) & 255) << 24
    ], s = pt(s, c), s = ur(s, 31), s = pt(s, d), a = fe(a, s), a = ur(a, 27), a = fn(a, o), a = fn(pt(a, [0, 5]), [0, 1390208809]), l = pt(l, d), l = ur(l, 33), l = pt(l, c), o = fe(o, l), o = ur(o, 31), o = fn(o, a), o = fn(pt(o, [0, 5]), [0, 944331445]);
  switch (s = [0, 0], l = [0, 0], r) {
    case 15:
      l = fe(l, nt([0, e.charCodeAt(f + 14)], 48));
    case 14:
      l = fe(l, nt([0, e[n(655)](f + 13)], 40));
    case 13:
      l = fe(l, nt([0, e[n(655)](f + 12)], 32));
    case 12:
      l = fe(l, nt([0, e.charCodeAt(f + 11)], 24));
    case 11:
      l = fe(l, nt([0, e[n(655)](f + 10)], 16));
    case 10:
      l = fe(l, nt([0, e[n(655)](f + 9)], 8));
    case 9:
      l = fe(l, [0, e.charCodeAt(f + 8)]), l = pt(l, d), l = ur(l, 33), l = pt(l, c), o = fe(o, l);
    case 8:
      s = fe(s, nt([0, e[n(655)](f + 7)], 56));
    case 7:
      s = fe(s, nt([0, e[n(655)](f + 6)], 48));
    case 6:
      s = fe(s, nt([0, e[n(655)](f + 5)], 40));
    case 5:
      s = fe(s, nt([0, e[n(655)](f + 4)], 32));
    case 4:
      s = fe(s, nt([0, e[n(655)](f + 3)], 24));
    case 3:
      s = fe(s, nt([0, e[n(655)](f + 2)], 16));
    case 2:
      s = fe(s, nt([0, e[n(655)](f + 1)], 8));
    case 1:
      s = fe(s, [0, e[n(655)](f)]), s = pt(s, c), s = ur(s, 31), s = pt(s, d), a = fe(a, s);
  }
  return a = fe(a, [0, e[n(343)]]), o = fe(o, [0, e[n(343)]]), a = fn(a, o), o = fn(o, a), a = $c(a), o = $c(o), a = fn(a, o), o = fn(o, a), (n(697) + (a[0] >>> 0)[n(961)](16))[n(1269)](-8) + (n(697) + (a[1] >>> 0)[n(961)](16))[n(1269)](-8) + (n(697) + (o[0] >>> 0)[n(961)](16))[n(1269)](-8) + (n(697) + (o[1] >>> 0)[n(961)](16)).slice(-8);
}
function Xh(e) {
  var t = v, n;
  return fl(
    {
      name: e[t(516)],
      message: e[t(555)],
      stack: (n = e[t(742)]) === null || n === void 0 ? void 0 : n[t(447)](`
`)
    },
    e
  );
}
function Qh(e, t) {
  for (var n = v, r = 0, i = e[n(343)]; r < i; ++r)
    if (e[r] === t) return !0;
  return !1;
}
function Jh(e, t) {
  return !Qh(e, t);
}
function Pu(e) {
  return parseInt(e);
}
function Ct(e) {
  return parseFloat(e);
}
function qt(e, t) {
  var n = v;
  return typeof e === n(477) && isNaN(e) ? t : e;
}
function Mt(e) {
  return e.reduce(function(t, n) {
    return t + (n ? 1 : 0);
  }, 0);
}
function Gd(e, t) {
  var n = v;
  if (t === void 0 && (t = 1), Math.abs(t) >= 1) return Math.round(e / t) * t;
  var r = 1 / t;
  return Math[n(1012)](e * r) / r;
}
function Kh(e) {
  for (var t = v, n, r, i = t(1150)[t(1130)](e, "'"), a = /^\s*([a-z-]*)(.*)$/i.exec(e), o = a[1] || void 0, s = {}, l = /([.:#][\w-]+|\[.+?\])/gi, c = function(w, y) {
    var x = t;
    s[w] = s[w] || [], s[w][x(638)](y);
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
        var m = /^\[([\w-]+)([~|^$*]?=("(.*?)"|([\w-]+)))?(\s+[is])?\]$/.exec(f);
        if (m)
          c(
            m[1],
            (r = (n = m[4]) !== null && n !== void 0 ? n : m[5]) !== null && r !== void 0 ? r : ""
          );
        else throw new Error(i);
        break;
      }
      default:
        throw new Error(i);
    }
  }
  return [o, s];
}
function Zc(e) {
  var t = v;
  return e && typeof e === t(668) && t(555) in e ? e : { message: e };
}
function qh(e) {
  var t = v;
  return typeof e !== t(425);
}
function em(e, t) {
  var n = new Promise(function(r) {
    var i = U, a = Date[i(738)]();
    Bc(e[i(512)](null, t), function() {
      for (var o = i, s = [], l = 0; l < arguments[o(343)]; l++)
        s[l] = arguments[l];
      var c = Date[o(738)]() - a;
      if (!s[0])
        return r(function() {
          return { error: Zc(s[1]), duration: c };
        });
      var d = s[1];
      if (qh(d))
        return r(function() {
          return { value: d, duration: c };
        });
      r(function() {
        return new Promise(function(f) {
          var m = U, w = Date[m(738)]();
          Bc(d, function() {
            for (var y = m, x = [], _ = 0; _ < arguments[y(343)]; _++)
              x[_] = arguments[_];
            var u = c + Date[y(738)]() - w;
            if (!x[0])
              return f({ error: Zc(x[1]), duration: u });
            f({ value: x[1], duration: u });
          });
        });
      });
    });
  });
  return Li(n), function() {
    return n.then(function(i) {
      return i();
    });
  };
}
function tm(e, t, n) {
  var r = v, i = Object[r(331)](e)[r(788)](function(o) {
    return Jh(n, o);
  }), a = Uc(i, function(o) {
    return em(e[o], t);
  });
  return Li(a), function() {
    return Ke(this, void 0, void 0, function() {
      var s, l, c, d, f;
      return qe(this, function(m) {
        var w = U;
        switch (m[w(979)]) {
          case 0:
            return [4, a];
          case 1:
            return s = m[w(607)](), [
              4,
              Uc(s, function(y) {
                var x = y();
                return Li(x), x;
              })
            ];
          case 2:
            return l = m.sent(), [4, Promise[w(930)](l)];
          case 3:
            for (c = m[w(607)](), d = {}, f = 0; f < i[w(343)]; ++f)
              d[i[f]] = c[f];
            return [2, d];
        }
      });
    });
  };
}
function Yd() {
  var e = v, t = window, n = navigator;
  return Mt([
    e(628) in t,
    e(341) in t,
    "msIndexedDB" in t,
    e(523) in n,
    e(730) in n
  ]) >= 4;
}
function nm() {
  var e = v, t = window, n = navigator;
  return Mt([
    e(701) in t,
    e(661) in t,
    e(905) in n,
    e(752) in n
  ]) >= 3 && !Yd();
}
function Nu() {
  var e = v, t = window, n = navigator;
  return Mt([
    e(592) in n,
    "webkitTemporaryStorage" in n,
    n[e(1033)].indexOf(e(571)) === 0,
    "webkitResolveLocalFileSystemURL" in t,
    e(1e3) in t,
    e(611) in t,
    "webkitSpeechGrammar" in t
  ]) >= 5;
}
function xa() {
  var e = v, t = window, n = navigator;
  return Mt([
    "ApplePayError" in t,
    e(1192) in t,
    e(361) in t,
    n[e(1033)].indexOf(e(817)) === 0,
    e(670) in n,
    e(960) in t
  ]) >= 4;
}
function oo() {
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
  return oo = function() {
    return e;
  }, oo();
}
function Lu() {
  var e = v, t = window;
  return Mt([
    "safari" in t,
    !("DeviceMotionEvent" in t),
    !(e(569) in t),
    !(e(1220) in navigator)
  ]) >= 3;
}
function rm() {
  var e = v, t, n, r = window;
  return Mt([
    e(466) in navigator,
    e(726) in ((n = (t = document[e(1243)]) === null || t === void 0 ? void 0 : t[e(1252)]) !== null && n !== void 0 ? n : {}),
    e(1211) in r,
    e(459) in r,
    e(698) in r,
    e(950) in r
  ]) >= 4;
}
function im() {
  var e = v, t = window;
  return Mt([
    !(e(919) in t),
    e(325) in t,
    "" + t[e(1191)] === e(1088),
    "" + t.Reflect == "[object Reflect]"
  ]) >= 3;
}
function am() {
  var e = v, t = window;
  return Mt([
    e(1151) in t,
    e(769) in t,
    e(980) in t,
    e(656) in t
  ]) >= 3;
}
function om() {
  var e = v;
  if (navigator[e(841)] === "iPad") return !0;
  var t = screen, n = t[e(347)] / t[e(515)];
  return Mt([
    e(604) in window,
    !!Element[e(886)][e(713)],
    n > 0.65 && n < 1.53
  ]) >= 2;
}
function sm() {
  var e = v, t = document;
  return t.fullscreenElement || t[e(792)] || t.mozFullScreenElement || t[e(639)] || null;
}
function lm() {
  var e = v, t = document;
  return (t[e(1140)] || t.msExitFullscreen || t[e(700)] || t[e(1094)])[e(583)](t);
}
function Xd() {
  var e = v, t = Nu(), n = rm();
  if (!t && !n) return !1;
  var r = window;
  return Mt([
    e(1160) in r,
    e(818) in r,
    t && !("SharedWorker" in r),
    n && /android/i[e(913)](navigator[e(1036)])
  ]) >= 2;
}
function um() {
  var e = v, t = window, n = t[e(1027)] || t.webkitOfflineAudioContext;
  if (!n) return -2;
  if (cm()) return -1;
  var r = 4500, i = 5e3, a = new n(1, i, 44100), o = a.createOscillator();
  o.type = e(508), o[e(494)].value = 1e4;
  var s = a.createDynamicsCompressor();
  s[e(758)][e(1223)] = -50, s.knee.value = 40, s[e(1125)][e(1223)] = 12, s[e(461)][e(1223)] = 0, s.release.value = 0.25, o[e(844)](s), s.connect(a[e(326)]), o[e(1170)](0);
  var l = dm(a), c = l[0], d = l[1], f = c[e(475)](
    function(m) {
      var w = e;
      return fm(m.getChannelData(0)[w(1055)](r));
    },
    function(m) {
      var w = e;
      if (m[w(516)] === w(1199) || m[w(516)] === "suspended")
        return -3;
      throw m;
    }
  );
  return Li(f), function() {
    return d(), f;
  };
}
function cm() {
  return xa() && !Lu() && !am();
}
function dm(e) {
  var t = 3, n = 500, r = 500, i = 5e3, a = function() {
  }, o = new Promise(function(s, l) {
    var c = U, d = !1, f = 0, m = 0;
    e[c(1046)] = function(x) {
      var _ = c;
      return s(x[_(684)]);
    };
    var w = function() {
      var x = c;
      setTimeout(
        function() {
          var _ = U;
          return l(Gc(_(1199)));
        },
        Math[x(1120)](r, m + i - Date[x(738)]())
      );
    }, y = function() {
      var x = c;
      try {
        var _ = e[x(420)]();
        switch (Zd(_) && Li(_), e[x(1054)]) {
          case x(615):
            m = Date[x(738)](), d && w();
            break;
          case x(1165):
            !document.hidden && f++, d && f >= t ? l(Gc(x(1165))) : setTimeout(y, n);
            break;
        }
      } catch (u) {
        l(u);
      }
    };
    y(), a = function() {
      !d && (d = !0, m > 0 && w());
    };
  });
  return [o, a];
}
function fm(e) {
  for (var t = v, n = 0, r = 0; r < e[t(343)]; ++r)
    n += Math[t(1014)](e[r]);
  return n;
}
function Gc(e) {
  var t = new Error(e);
  return t.name = e, t;
}
function Qd(e, t, n) {
  var r, i, a;
  return n === void 0 && (n = 50), Ke(this, void 0, void 0, function() {
    var o, s;
    return qe(this, function(l) {
      var c = U;
      switch (l[c(979)]) {
        case 0:
          o = document, l[c(979)] = 1;
        case 1:
          return o.body ? [3, 3] : [4, Ni(n)];
        case 2:
          return l.sent(), [3, 1];
        case 3:
          s = o[c(631)](c(462)), l[c(979)] = 4;
        case 4:
          return l[c(816)].push([4, , 10, 11]), [
            4,
            new Promise(function(d, f) {
              var m = c, w = !1, y = function() {
                w = !0, d();
              }, x = function(p) {
                w = !0, f(p);
              };
              s[m(484)] = y, s[m(795)] = x;
              var _ = s.style;
              _[m(482)](m(895), m(770), m(994)), _[m(1081)] = m(833), _.top = "0", _[m(637)] = "0", _[m(993)] = m(1117), t && m(921) in s ? s[m(921)] = t : s[m(798)] = "about:blank", o[m(768)][m(866)](s);
              var u = function() {
                var p = m, h, g;
                w || (((g = (h = s[p(383)]) === null || h === void 0 ? void 0 : h[p(601)]) === null || g === void 0 ? void 0 : g.readyState) === p(823) ? y() : setTimeout(u, 10));
              };
              u();
            })
          ];
        case 5:
          l[c(607)](), l[c(979)] = 6;
        case 6:
          return !((i = (r = s[c(383)]) === null || r === void 0 ? void 0 : r[c(601)]) === null || i === void 0) && i[c(768)] ? [3, 8] : [4, Ni(n)];
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
function xm(e) {
  for (var t = v, n = Kh(e), r = n[0], i = n[1], a = document[t(631)](
    r ?? t(669)
  ), o = 0, s = Object.keys(i); o < s[t(343)]; o++) {
    var l = s[o], c = i[l].join(" ");
    l === t(1252) ? pm(a[t(1252)], c) : a[t(962)](l, c);
  }
  return a;
}
function pm(e, t) {
  for (var n = v, r = 0, i = t[n(447)](";"); r < i[n(343)]; r++) {
    var a = i[r], o = /^\s*([\w-]+)\s*:\s*(.+?)(\s*!([\w-]+))?\s*$/.exec(a);
    if (o) {
      var s = o[1], l = o[2], c = o[4];
      e[n(482)](s, l, c || "");
    }
  }
}
var hm = v(1173), mm = v(924), cr = ["monospace", v(800), v(782)], Yc = [
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
function vm() {
  return Qd(function(e, t) {
    var n = U, r = t[n(601)], i = r[n(768)];
    i[n(1252)].fontSize = mm;
    var a = r[n(631)](n(669)), o = {}, s = {}, l = function(_) {
      var u = n, p = r[u(631)]("span"), h = p[u(1252)];
      return h[u(1081)] = u(833), h.top = "0", h[u(637)] = "0", h.fontFamily = _, p[u(395)] = hm, a[u(866)](p), p;
    }, c = function(_, u) {
      var p = n;
      return l("'"[p(1130)](_, "',")[p(1130)](u));
    }, d = function() {
      return cr.map(l);
    }, f = function() {
      for (var _ = n, u = {}, p = function(C) {
        var S = U;
        u[C] = cr[S(335)](function(L) {
          return c(C, L);
        });
      }, h = 0, g = Yc; h < g[_(343)]; h++) {
        var k = g[h];
        p(k);
      }
      return u;
    }, m = function(_) {
      var u = n;
      return cr[u(796)](function(p, h) {
        var g = u;
        return _[h][g(931)] !== o[p] || _[h][g(424)] !== s[p];
      });
    }, w = d(), y = f();
    i[n(866)](a);
    for (var x = 0; x < cr[n(343)]; x++)
      o[cr[x]] = w[x].offsetWidth, s[cr[x]] = w[x][n(424)];
    return Yc.filter(function(_) {
      return m(y[_]);
    });
  });
}
function gm() {
  var e = v, t = navigator[e(1092)];
  if (t) {
    for (var n = [], r = 0; r < t.length; ++r) {
      var i = t[r];
      if (i) {
        for (var a = [], o = 0; o < i[e(343)]; ++o) {
          var s = i[o];
          a[e(638)]({ type: s[e(811)], suffixes: s[e(577)] });
        }
        n.push({
          name: i[e(516)],
          description: i[e(315)],
          mimeTypes: a
        });
      }
    }
    return n;
  }
}
function ym() {
  var e = !1, t, n, r = wm(), i = r[0], a = r[1];
  if (!_m(i, a)) t = n = "";
  else {
    e = km(a), Sm(i, a);
    var o = Rs(i), s = Rs(i);
    o !== s ? t = n = "unstable" : (n = o, Cm(i, a), t = Rs(i));
  }
  return { winding: e, geometry: t, text: n };
}
function wm() {
  var e = v, t = document[e(631)]("canvas");
  return t.width = 1, t[e(515)] = 1, [t, t.getContext("2d")];
}
function _m(e, t) {
  return !!(t && e.toDataURL);
}
function km(e) {
  var t = v;
  return e[t(562)](0, 0, 10, 10), e[t(562)](2, 2, 6, 6), !e[t(1097)](5, 5, t(545));
}
function Sm(e, t) {
  var n = v;
  e[n(347)] = 240, e[n(515)] = 60, t[n(339)] = n(724), t[n(890)] = n(1067), t.fillRect(100, 1, 62, 20), t[n(890)] = "#069", t[n(423)] = '11pt "Times New Roman"';
  var r = n(1153)[n(1130)](String[n(1187)](55357, 56835));
  t[n(429)](r, 2, 15), t[n(890)] = n(1075), t[n(423)] = "18pt Arial", t[n(429)](r, 4, 45);
}
function Cm(e, t) {
  var n = v;
  e[n(347)] = 122, e.height = 110, t[n(1193)] = "multiply";
  for (var r = 0, i = [
    ["#f2f", 40, 40],
    ["#2ff", 80, 40],
    [n(599), 60, 80]
  ]; r < i.length; r++) {
    var a = i[r], o = a[0], s = a[1], l = a[2];
    t[n(890)] = o, t[n(1064)](), t[n(825)](s, l, 40, 0, Math.PI * 2, !0), t[n(455)](), t[n(411)]();
  }
  t.fillStyle = n(457), t[n(825)](60, 60, 60, 0, Math.PI * 2, !0), t[n(825)](60, 60, 20, 0, Math.PI * 2, !0), t[n(411)](n(545));
}
function Rs(e) {
  var t = v;
  return e[t(917)]();
}
function bm() {
  var e = v, t = navigator, n = 0, r;
  t[e(1103)] !== void 0 ? n = Pu(t.maxTouchPoints) : t[e(523)] !== void 0 && (n = t[e(523)]);
  try {
    document[e(1234)]("TouchEvent"), r = !0;
  } catch {
    r = !1;
  }
  var i = e(1182) in window;
  return { maxTouchPoints: n, touchEvent: r, touchStart: i };
}
function Em() {
  return navigator.oscpu;
}
function Tm() {
  var e = v, t = navigator, n = [], r = t[e(996)] || t[e(696)] || t.browserLanguage || t.systemLanguage;
  if (r !== void 0 && n[e(638)]([r]), Array[e(590)](t[e(1078)]))
    !(Nu() && im()) && n[e(638)](t[e(1078)]);
  else if (typeof t.languages === e(391)) {
    var i = t[e(1078)];
    i && n[e(638)](i[e(447)](","));
  }
  return n;
}
function Pm() {
  return window.screen.colorDepth;
}
function Nm() {
  return qt(Ct(navigator.deviceMemory), void 0);
}
function Lm() {
  var e = v, t = screen, n = function(i) {
    return qt(Pu(i), null);
  }, r = [n(t.width), n(t[e(515)])];
  return r.sort().reverse(), r;
}
var Im = 2500, Rm = 10, Ba, Ds;
function Dm() {
  if (Ds === void 0) {
    var e = function() {
      var t = xl();
      pl(t) ? Ds = setTimeout(e, Im) : (Ba = t, Ds = void 0);
    };
    e();
  }
}
function Mm() {
  var e = this;
  return Dm(), function() {
    return Ke(e, void 0, void 0, function() {
      var t;
      return qe(this, function(n) {
        var r = U;
        switch (n.label) {
          case 0:
            return t = xl(), pl(t) ? Ba ? [2, ao([], Ba, !0)] : sm() ? [4, lm()] : [3, 2] : [3, 2];
          case 1:
            n[r(607)](), t = xl(), n[r(979)] = 2;
          case 2:
            return !pl(t) && (Ba = t), [2, t];
        }
      });
    });
  };
}
function Om() {
  var e = this, t = Mm();
  return function() {
    return Ke(e, void 0, void 0, function() {
      var n, r;
      return qe(this, function(i) {
        var a = U;
        switch (i.label) {
          case 0:
            return [4, t()];
          case 1:
            return n = i[a(607)](), r = function(o) {
              return o === null ? null : Gd(o, Rm);
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
function xl() {
  var e = v, t = screen;
  return [
    qt(Ct(t[e(831)]), null),
    qt(
      Ct(t.width) - Ct(t[e(1105)]) - qt(Ct(t[e(401)]), 0),
      null
    ),
    qt(
      Ct(t[e(515)]) - Ct(t[e(349)]) - qt(Ct(t[e(831)]), 0),
      null
    ),
    qt(Ct(t[e(401)]), null)
  ];
}
function pl(e) {
  for (var t = 0; t < 4; ++t)
    if (e[t]) return !1;
  return !0;
}
function Hm() {
  var e = v;
  return qt(Pu(navigator[e(935)]), void 0);
}
function Am() {
  var e = v, t, n = (t = window[e(1191)]) === null || t === void 0 ? void 0 : t.DateTimeFormat;
  if (n) {
    var r = new n()[e(586)]().timeZone;
    if (r) return r;
  }
  var i = -jm();
  return e(699)[e(1130)](i >= 0 ? "+" : "").concat(Math[e(1014)](i));
}
function jm() {
  var e = v, t = (/* @__PURE__ */ new Date())[e(725)]();
  return Math[e(826)](
    Ct(new Date(t, 0, 1).getTimezoneOffset()),
    Ct(new Date(t, 6, 1)[e(408)]())
  );
}
function Fm() {
  var e = v;
  try {
    return !!window[e(1137)];
  } catch {
    return !0;
  }
}
function zm() {
  var e = v;
  try {
    return !!window[e(414)];
  } catch {
    return !0;
  }
}
function Wm() {
  var e = v;
  if (!(Yd() || nm()))
    try {
      return !!window[e(1218)];
    } catch {
      return !0;
    }
}
function Vm() {
  var e = v;
  return !!window[e(1255)];
}
function Bm() {
  var e = v;
  return navigator[e(620)];
}
function Um() {
  var e = v, t = navigator[e(841)];
  return t === "MacIntel" && xa() && !Lu() ? om() ? "iPad" : "iPhone" : t;
}
function $m() {
  var e = v;
  return navigator[e(1033)] || "";
}
function Zm() {
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
    var i = r[n], a = window[i];
    a && typeof a === e(668) && t[e(638)](i);
  }
  return t[e(407)]();
}
function Gm() {
  var e = v, t = document;
  try {
    t[e(686)] = e(708);
    var n = t[e(686)][e(1242)]("cookietest=") !== -1;
    return t[e(686)] = "cookietest=1; SameSite=Strict; expires=Thu, 01-Jan-1970 00:00:01 GMT", n;
  } catch {
    return !1;
  }
}
function Ym() {
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
function Xm(e) {
  var t = v, n = e === void 0 ? {} : e, r = n[t(406)];
  return Ke(this, void 0, void 0, function() {
    var i, a, o, s, l, c;
    return qe(this, function(d) {
      var f = U;
      switch (d[f(979)]) {
        case 0:
          return Qm() ? (i = Ym(), a = Object[f(331)](i), o = (c = [])[f(1130)][f(1241)](
            c,
            a.map(function(m) {
              return i[m];
            })
          ), [4, Jm(o)]) : [2, void 0];
        case 1:
          return s = d[f(607)](), r && Km(i, s), l = a[f(788)](function(m) {
            var w = f, y = i[m], x = Mt(
              y[w(335)](function(_) {
                return s[_];
              })
            );
            return x > y.length * 0.6;
          }), l.sort(), [2, l];
      }
    });
  });
}
function Qm() {
  return xa() || Xd();
}
function Jm(e) {
  var t;
  return Ke(this, void 0, void 0, function() {
    var n, r, i, a, l, o, s, l;
    return qe(this, function(c) {
      var d = U;
      switch (c.label) {
        case 0:
          for (n = document, r = n[d(631)](d(669)), i = new Array(e[d(343)]), a = {}, Xc(r), l = 0; l < e.length; ++l)
            o = xm(e[l]), o[d(1249)] === "DIALOG" && o[d(872)](), s = n[d(631)](d(669)), Xc(s), s[d(866)](o), r[d(866)](s), i[l] = o;
          c[d(979)] = 1;
        case 1:
          return n[d(768)] ? [3, 3] : [4, Ni(50)];
        case 2:
          return c[d(607)](), [3, 1];
        case 3:
          n[d(768)][d(866)](r);
          try {
            for (l = 0; l < e[d(343)]; ++l)
              !i[l][d(602)] && (a[e[l]] = !0);
          } finally {
            (t = r[d(636)]) === null || t === void 0 || t[d(691)](r);
          }
          return [2, a];
      }
    });
  });
}
function Xc(e) {
  var t = v;
  e[t(1252)].setProperty(t(895), "block", t(994));
}
function U(e, t) {
  var n = oo();
  return U = function(r, i) {
    r = r - 314;
    var a = n[r];
    return a;
  }, U(e, t);
}
function Km(e, t) {
  for (var n = v, r = "DOM blockers debug:\n```", i = 0, a = Object[n(331)](e); i < a[n(343)]; i++) {
    var o = a[i];
    r += `
`[n(1130)](o, ":");
    for (var s = 0, l = e[o]; s < l[n(343)]; s++) {
      var c = l[s];
      r += n(593)[n(1130)](t[c] ? "🚫" : "➡️", " ").concat(c);
    }
  }
  console[n(1002)](""[n(1130)](r, n(619)));
}
function qm() {
  for (var e = v, t = 0, n = ["rec2020", "p3", "srgb"]; t < n[e(343)]; t++) {
    var r = n[t];
    if (matchMedia("(color-gamut: "[e(1130)](r, ")")).matches) return r;
  }
}
function e1() {
  var e = v;
  if (Qc(e(542))) return !0;
  if (Qc(e(621))) return !1;
}
function Qc(e) {
  var t = v;
  return matchMedia(t(1186).concat(e, ")"))[t(1259)];
}
function t1() {
  var e = v;
  if (Jc(e(1007))) return !0;
  if (Jc("none")) return !1;
}
function Jc(e) {
  var t = v;
  return matchMedia(t(547)[t(1130)](e, ")"))[t(1259)];
}
var n1 = 100;
function r1() {
  var e = v;
  if (matchMedia(e(596))[e(1259)]) {
    for (var t = 0; t <= n1; ++t)
      if (matchMedia("(max-monochrome: "[e(1130)](t, ")"))[e(1259)]) return t;
    throw new Error("Too high value");
  }
}
function i1() {
  var e = v;
  if (dr(e(922))) return 0;
  if (dr("high") || dr("more")) return 1;
  if (dr("low") || dr("less")) return -1;
  if (dr(e(737))) return 10;
}
function dr(e) {
  var t = v;
  return matchMedia("(prefers-contrast: ".concat(e, ")"))[t(1259)];
}
function a1() {
  var e = v;
  if (Kc(e(541))) return !0;
  if (Kc(e(922))) return !1;
}
function Kc(e) {
  var t = v;
  return matchMedia(t(384)[t(1130)](e, ")"))[t(1259)];
}
function o1() {
  var e = v;
  if (qc(e(864))) return !0;
  if (qc("standard")) return !1;
}
function qc(e) {
  var t = v;
  return matchMedia(t(432)[t(1130)](e, ")"))[t(1259)];
}
var te = Math, We = function() {
  return 0;
};
function s1() {
  var e = v, t = te[e(898)] || We, n = te[e(772)] || We, r = te[e(1045)] || We, i = te[e(838)] || We, a = te[e(1227)] || We, o = te[e(584)] || We, s = te.sin || We, l = te.sinh || We, c = te.cos || We, d = te.cosh || We, f = te[e(786)] || We, m = te[e(904)] || We, w = te.exp || We, y = te.expm1 || We, x = te[e(629)] || We, _ = function(M) {
    var T = e;
    return te[T(399)](te.PI, M);
  }, u = function(M) {
    var T = e;
    return te.log(M + te[T(448)](M * M - 1));
  }, p = function(M) {
    var T = e;
    return te[T(1002)](M + te.sqrt(M * M + 1));
  }, h = function(M) {
    var T = e;
    return te[T(1002)]((1 + M) / (1 - M)) / 2;
  }, g = function(M) {
    var T = e;
    return te.exp(M) - 1 / te[T(998)](M) / 2;
  }, k = function(M) {
    var T = e;
    return (te[T(998)](M) + 1 / te[T(998)](M)) / 2;
  }, C = function(M) {
    var T = e;
    return te[T(998)](M) - 1;
  }, S = function(M) {
    var T = e;
    return (te.exp(2 * M) - 1) / (te[T(998)](2 * M) + 1);
  }, L = function(M) {
    var T = e;
    return te[T(1002)](1 + M);
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
    asinh: i(1),
    asinhPf: p(1),
    atanh: a(0.5),
    atanhPf: h(0.5),
    atan: o(0.5),
    sin: s(
      -1e300
    ),
    sinh: l(1),
    sinhPf: g(1),
    cos: c(10.000000000123),
    cosh: d(1),
    coshPf: k(1),
    tan: f(
      -1e300
    ),
    tanh: m(1),
    tanhPf: S(1),
    exp: w(1),
    expm1: y(1),
    expm1Pf: C(1),
    log1p: x(10),
    log1pPf: L(10),
    powPI: _(-100)
  };
}
var l1 = v(1108), Ms = {
  default: [],
  apple: [{ font: "-apple-system-body" }],
  serif: [{ fontFamily: v(782) }],
  sans: [{ fontFamily: "sans-serif" }],
  mono: [{ fontFamily: "monospace" }],
  min: [{ fontSize: v(1106) }],
  system: [{ fontFamily: "system-ui" }]
};
function u1() {
  return c1(function(e, t) {
    for (var n = U, r = {}, i = {}, a = 0, o = Object[n(331)](Ms); a < o.length; a++) {
      var s = o[a], l = Ms[s], c = l[0], d = c === void 0 ? {} : c, f = l[1], m = f === void 0 ? l1 : f, w = e[n(631)](n(860));
      w[n(395)] = m, w[n(1252)].whiteSpace = n(928);
      for (var y = 0, x = Object.keys(d); y < x.length; y++) {
        var _ = x[y], u = d[_];
        u !== void 0 && (w.style[_] = u);
      }
      r[s] = w, t.appendChild(e[n(631)]("br")), t.appendChild(w);
    }
    for (var p = 0, h = Object.keys(Ms); p < h[n(343)]; p++) {
      var s = h[p];
      i[s] = r[s][n(754)]().width;
    }
    return i;
  });
}
function c1(e, t) {
  var n = v;
  return t === void 0 && (t = 4e3), Qd(function(r, i) {
    var a = U, o = i[a(601)], s = o[a(768)], l = s[a(1252)];
    l[a(347)] = ""[a(1130)](t, "px"), l[a(688)] = l.textSizeAdjust = a(621), Nu() ? s.style[a(605)] = ""[a(1130)](1 / i[a(835)]) : xa() && (s[a(1252)][a(605)] = "reset");
    var c = o[a(631)](a(669));
    return c[a(395)] = ao([], Array(t / 20 << 0), !0)[a(335)](function() {
      return "word";
    })[a(536)](" "), s[a(866)](c), e(o, s);
  }, n(450));
}
function d1() {
  var e = v, t, n = document[e(631)](e(1277)), r = (t = n[e(400)]("webgl")) !== null && t !== void 0 ? t : n.getContext(e(906));
  if (r && e(756) in r) {
    var i = r[e(756)]("WEBGL_debug_renderer_info");
    if (i)
      return {
        vendor: (r.getParameter(i[e(853)]) || "")[e(961)](),
        renderer: (r[e(412)](i.UNMASKED_RENDERER_WEBGL) || "")[e(961)]()
      };
  }
}
function f1() {
  var e = v;
  return navigator[e(916)];
}
function x1() {
  var e = v, t = new Float32Array(1), n = new Uint8Array(t[e(572)]);
  return t[0] = 1 / 0, t[0] = t[0] - t[0], n[3];
}
var p1 = {
  fonts: vm,
  domBlockers: Xm,
  fontPreferences: u1,
  audio: um,
  screenFrame: Om,
  osCpu: Em,
  languages: Tm,
  colorDepth: Pm,
  deviceMemory: Nm,
  screenResolution: Lm,
  hardwareConcurrency: Hm,
  timezone: Am,
  sessionStorage: Fm,
  localStorage: zm,
  indexedDB: Wm,
  openDatabase: Vm,
  cpuClass: Bm,
  platform: Um,
  plugins: gm,
  canvas: ym,
  touchSupport: bm,
  vendor: $m,
  vendorFlavors: Zm,
  cookiesEnabled: Gm,
  colorGamut: qm,
  invertedColors: e1,
  forcedColors: t1,
  monochrome: r1,
  contrast: i1,
  reducedMotion: a1,
  hdr: o1,
  math: s1,
  videoCard: d1,
  pdfViewerEnabled: f1,
  architecture: x1
};
function h1(e) {
  return tm(p1, e, []);
}
var m1 = v(807);
function v1(e) {
  var t = v, n = g1(e), r = y1(n);
  return { score: n, comment: m1[t(452)](/\$/g, "".concat(r)) };
}
function g1(e) {
  var t = v;
  if (Xd()) return 0.4;
  if (xa()) return Lu() ? 0.5 : 0.3;
  var n = e[t(841)][t(1223)] || "";
  return /^Win/.test(n) ? 0.6 : /^Mac/[t(913)](n) ? 0.5 : 0.7;
}
function y1(e) {
  return Gd(0.99 + 0.01 * e, 1e-4);
}
function w1(e) {
  for (var t = v, n = "", r = 0, i = Object[t(331)](e).sort(); r < i[t(343)]; r++) {
    var a = i[r], o = e[a], s = o.error ? t(446) : JSON[t(641)](o[t(1223)]);
    n += ""[t(1130)](n ? "|" : "")[t(1130)](a[t(452)](/([:|\\])/g, t(842)), ":").concat(s);
  }
  return n;
}
function _1(e) {
  return JSON.stringify(
    e,
    function(t, n) {
      return n instanceof Error ? Xh(n) : n;
    },
    2
  );
}
function Jd(e) {
  return Yh(w1(e));
}
function k1(e) {
  var t, n = v1(e);
  return {
    get visitorId() {
      return t === void 0 && (t = Jd(this.components)), t;
    },
    set visitorId(r) {
      t = r;
    },
    confidence: n,
    components: e,
    version: $d
  };
}
function S1(e) {
  return e === void 0 && (e = 50), Gh(e, e * 2);
}
function C1(e, t) {
  var n = v, r = Date[n(738)]();
  return {
    get: function(i) {
      return Ke(this, void 0, void 0, function() {
        var a, o, s;
        return qe(this, function(l) {
          var c = U;
          switch (l[c(979)]) {
            case 0:
              return a = Date[c(738)](), [4, e()];
            case 1:
              return o = l[c(607)](), s = k1(o), (t || i != null && i[c(406)]) && c(630)[c(1130)](s[c(799)], c(1253))[c(1130)](
                navigator[c(852)],
                `
timeBetweenLoadAndGet: `
              )[c(1130)](a - r, `
visitorId: `).concat(s[c(929)], `
components: `)[c(1130)](_1(o), c(619)), [2, s];
          }
        });
      });
    }
  };
}
function b1() {
  var e = v;
  if (!(window.__fpjs_d_m || Math[e(360)]() >= 1e-3))
    try {
      var t = new XMLHttpRequest();
      t[e(319)](
        e(873),
        "https://m1.openfpcdn.io/fingerprintjs/v"[e(1130)]($d, e(435)),
        !0
      ), t[e(1183)]();
    } catch (n) {
      console[e(446)](n);
    }
}
function E1(e) {
  var t = v, n = {}, r = n[t(727)], i = n[t(406)], a = n[t(410)], o = a === void 0 ? !0 : a;
  return Ke(this, void 0, void 0, function() {
    var s;
    return qe(this, function(l) {
      var c = U;
      switch (l[c(979)]) {
        case 0:
          return o && b1(), [4, S1(r)];
        case 1:
          return l[c(607)](), s = h1({ debug: i }), [2, C1(s, i)];
      }
    });
  });
}
var T1 = v(855), X = {
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
}, se = function(e) {
  Zh(t, e);
  function t(n, r) {
    var i = U, a = e.call(this, r) || this;
    return a[i(1054)] = n, a.name = i(1083), Object[i(373)](a, t.prototype), a;
  }
  return t;
}(Error);
function P1(e, t) {
  var n = v, r = {}, i = { bot: !1 };
  for (var a in t) {
    var o = t[a], s = o(e), l = { bot: !1 };
    typeof s === n(391) ? l = { bot: !0, botKind: s } : s && (l = { bot: !0, botKind: X[n(474)] }), r[a] = l, l[n(715)] && (i = l);
  }
  return [r, i];
}
function N1(e) {
  return Ke(this, void 0, void 0, function() {
    var t, n, r = this;
    return qe(this, function(i) {
      var a = U;
      switch (i.label) {
        case 0:
          return t = {}, n = Object[a(331)](e), [
            4,
            Promise[a(930)](
              n[a(335)](function(o) {
                return Ke(r, void 0, void 0, function() {
                  var s, l, c, d, f;
                  return qe(this, function(m) {
                    var w = U;
                    switch (m.label) {
                      case 0:
                        s = e[o], m[w(979)] = 1;
                      case 1:
                        return m.trys[w(638)]([1, 3, , 4]), l = t, c = o, f = {}, [4, s()];
                      case 2:
                        return l[c] = (f.value = m[w(607)](), f[w(1054)] = 0, f), [3, 4];
                      case 3:
                        return d = m[w(607)](), d instanceof se ? t[o] = {
                          state: d[w(1054)],
                          error: ""[w(1130)](d[w(516)], ": ")[w(1130)](d[w(555)])
                        } : t[o] = {
                          state: -3,
                          error: d instanceof Error ? ""[w(1130)](
                            d[w(516)],
                            ": "
                          )[w(1130)](d.message) : String(d)
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
          return i.sent(), [2, t];
      }
    });
  });
}
function L1(e) {
  var t = v, n = e[t(1036)];
  if (n[t(1054)] !== 0) return !1;
  if (/headless/i[t(913)](n.value)) return X.HeadlessChrome;
  if (/electron/i[t(913)](n.value)) return X[t(396)];
  if (/slimerjs/i[t(913)](n.value)) return X[t(537)];
}
function Ua(e, t) {
  var n = v;
  return e[n(1242)](t) !== -1;
}
function Qt(e, t) {
  return e.indexOf(t) !== -1;
}
function I1(e, t) {
  var n = v;
  if (n(674) in e) return e[n(674)](t);
  for (var r = 0; r < e[n(343)]; r++)
    if (t(e[r], r, e)) return e[r];
}
function e0(e) {
  var t = v;
  return Object[t(719)](e);
}
function hl(e) {
  for (var t = v, n = [], r = 1; r < arguments[t(343)]; r++)
    n[r - 1] = arguments[r];
  for (var i = function(c) {
    var d = t;
    if (typeof c === d(391)) {
      if (Ua(e, c)) return { value: !0 };
    } else {
      var f = I1(e, function(m) {
        var w = d;
        return c[w(913)](m);
      });
      if (f != null) return { value: !0 };
    }
  }, a = 0, o = n; a < o[t(343)]; a++) {
    var s = o[a], l = i(s);
    if (typeof l === t(668)) return l[t(1223)];
  }
  return !1;
}
function yi(e) {
  var t = v;
  return e[t(541)](function(n, r) {
    return n + (r ? 1 : 0);
  }, 0);
}
function R1(e) {
  var t = v, n = e[t(939)];
  if (n[t(1054)] !== 0) return !1;
  if (hl(n[t(1223)], t(314), t(603), t(492)))
    return X[t(1202)];
}
function D1(e) {
  var t = v, n = e.errorTrace;
  if (n[t(1054)] !== 0) return !1;
  if (/PhantomJS/i[t(913)](n[t(1223)])) return X[t(1065)];
}
function M1(e) {
  var t = v, n = e[t(1076)], r = e.browserKind, i = e.browserEngineKind;
  if (!(n[t(1054)] !== 0 || r.state !== 0 || i[t(1054)] !== 0)) {
    var a = n[t(1223)];
    return i[t(1223)] === "unknown" ? !1 : a === 37 && !Ua([t(1230), "gecko"], i.value) || a === 39 && !Ua([t(1134)], r.value) || a === 33 && !Ua([t(449)], i[t(1223)]);
  }
}
function O1(e) {
  var t = v, n = e.functionBind;
  if (n[t(1054)] === -2) return X[t(1065)];
}
function H1(e) {
  var t = v, n = e[t(1078)];
  if (n.state === 0 && n[t(1223)][t(343)] === 0)
    return X[t(543)];
}
function A1(e) {
  var t = v, n = e[t(1128)];
  if (n[t(1054)] === 0 && !n[t(1223)]) return X[t(474)];
}
function j1(e) {
  var t = v, n = e.notificationPermissions, r = e.browserKind;
  if (r[t(1054)] !== 0 || r.value !== t(843)) return !1;
  if (n.state === 0 && n[t(1223)]) return X.HeadlessChrome;
}
function F1(e) {
  var t = v, n = e[t(1085)];
  if (n.state === 0 && !n[t(1223)]) return X[t(543)];
}
function z1(e) {
  var t = v, n = e[t(733)], r = e[t(1274)], i = e.browserKind, a = e.browserEngineKind;
  if (!(n[t(1054)] !== 0 || r[t(1054)] !== 0 || i[t(1054)] !== 0 || a[t(1054)] !== 0) && !(i.value !== "chrome" || r.value || a[t(1223)] !== "chromium") && n[t(1223)] === 0)
    return X[t(543)];
}
function W1(e) {
  var t = v, n, r = e.process;
  if (r[t(1054)] !== 0) return !1;
  if (r[t(1223)].type === t(1232) || ((n = r.value[t(689)]) === null || n === void 0 ? void 0 : n.electron) != null)
    return X[t(396)];
}
function V1(e) {
  var t = v, n = e.productSub, r = e[t(1104)];
  if (n[t(1054)] !== 0 || r.state !== 0) return !1;
  if ((r[t(1223)] === t(843) || r[t(1223)] === "safari" || r[t(1223)] === t(763) || r.value === "wechat") && n[t(1223)] !== "20030107")
    return X[t(474)];
}
function B1(e) {
  var t = v, n = e.userAgent;
  if (n[t(1054)] !== 0) return !1;
  if (/PhantomJS/i[t(913)](n[t(1223)])) return X[t(1065)];
  if (/Headless/i[t(913)](n[t(1223)])) return X[t(543)];
  if (/Electron/i[t(913)](n[t(1223)])) return X.Electron;
  if (/slimerjs/i[t(913)](n.value)) return X[t(537)];
}
function U1(e) {
  var t = v, n = e[t(618)];
  if (n[t(1054)] === 0 && n[t(1223)]) return X[t(543)];
}
function $1(e) {
  var t = v, n = e[t(990)];
  if (n[t(1054)] === 0) {
    var r = n.value, i = r.vendor, a = r[t(1232)];
    if (i == t(634) && a == t(478)) return X.HeadlessChrome;
  }
}
function Z1(e) {
  var t = v, n = e.windowExternal;
  if (n[t(1054)] !== 0) return !1;
  if (/Sequentum/i[t(913)](n[t(1223)])) return X.Sequentum;
}
function G1(e) {
  var t = v, n = e.windowSize, r = e.documentFocus;
  if (n[t(1054)] !== 0 || r[t(1054)] !== 0) return !1;
  var i = n[t(1223)], a = i.outerWidth, o = i[t(862)];
  if (r[t(1223)] && a === 0 && o === 0)
    return X.HeadlessChrome;
}
function Y1(e) {
  var t = v, n = e.distinctiveProps;
  if (n.state !== 0) return !1;
  var r = n[t(1223)], i;
  for (i in r) if (r[i]) return i;
}
var X1 = {
  detectAppVersion: L1,
  detectDocumentAttributes: R1,
  detectErrorTrace: D1,
  detectEvalLengthInconsistency: M1,
  detectFunctionBind: O1,
  detectLanguagesLengthInconsistency: H1,
  detectNotificationPermissions: j1,
  detectPluginsArray: F1,
  detectPluginsLengthInconsistency: z1,
  detectProcess: W1,
  detectUserAgent: B1,
  detectWebDriver: U1,
  detectWebGL: $1,
  detectWindowExternal: Z1,
  detectWindowSize: G1,
  detectMimeTypesConsistent: A1,
  detectProductSub: V1,
  detectDistinctiveProperties: Y1
};
function Q1() {
  var e = v, t = navigator[e(1036)];
  if (t == null) throw new se(-1, "navigator.appVersion is undefined");
  return t;
}
function J1() {
  var e = v;
  if (document[e(1243)] === void 0) throw new se(-1, e(534));
  var t = document.documentElement;
  if (typeof t[e(1184)] !== e(425)) throw new se(-2, e(780));
  return t[e(1184)]();
}
function K1() {
  var e = v;
  try {
    null[0]();
  } catch (t) {
    if (t instanceof Error && t[e(742)] != null)
      return t[e(742)][e(961)]();
  }
  throw new se(-3, "errorTrace signal unexpected behaviour");
}
function q1() {
  var e = v;
  return eval[e(961)]().length;
}
function ev() {
  var e = v;
  if (Function[e(886)].bind === void 0) throw new se(-2, e(721));
  return Function.prototype.bind[e(961)]();
}
function Iu() {
  var e = v, t, n, r = window, i = navigator;
  return yi([
    e(592) in i,
    e(1124) in i,
    i[e(1033)][e(1242)](e(571)) === 0,
    e(521) in r,
    e(1e3) in r,
    e(611) in r,
    e(1051) in r
  ]) >= 5 ? e(449) : yi([
    "ApplePayError" in r,
    e(1192) in r,
    e(361) in r,
    i[e(1033)][e(1242)](e(817)) === 0,
    "getStorageUpdates" in i,
    e(960) in r
  ]) >= 4 ? e(1230) : yi([
    e(466) in navigator,
    "MozAppearance" in ((n = (t = document[e(1243)]) === null || t === void 0 ? void 0 : t.style) !== null && n !== void 0 ? n : {}),
    e(1211) in r,
    e(459) in r,
    e(698) in r,
    e(950) in r
  ]) >= 4 ? "gecko" : e(932);
}
function tv() {
  var e = v, t, n = (t = navigator[e(852)]) === null || t === void 0 ? void 0 : t[e(451)]();
  return Qt(n, e(642)) ? e(597) : Qt(n, e(317)) || Qt(n, e(535)) ? e(1134) : Qt(n, "wechat") ? e(1129) : Qt(n, e(554)) ? "firefox" : Qt(n, e(763)) || Qt(n, e(491)) ? e(763) : Qt(n, e(843)) ? e(843) : Qt(n, "safari") ? e(774) : e(932);
}
function nv() {
  var e = v, t = Iu(), n = t === "chromium", r = t === e(658);
  if (!n && !r) return !1;
  var i = window;
  return yi([
    "onorientationchange" in i,
    "orientation" in i,
    n && !(e(488) in i),
    r && /android/i[e(913)](navigator[e(1036)])
  ]) >= 2;
}
function rv() {
  var e = v;
  return document[e(667)] === void 0 ? !1 : document[e(667)]();
}
function iv() {
  var e = v, t = window;
  return yi([
    !("MediaSettingsRange" in t),
    "RTCEncodedAudioFrame" in t,
    "" + t[e(1191)] === e(1088),
    "" + t[e(1141)] == "[object Reflect]"
  ]) >= 3;
}
function av() {
  var e = v, t = navigator, n = [], r = t[e(996)] || t[e(696)] || t[e(1013)] || t.systemLanguage;
  if (r !== void 0 && n[e(638)]([r]), Array[e(590)](t[e(1078)])) {
    var i = Iu();
    !(i === e(449) && iv()) && n[e(638)](t[e(1078)]);
  } else if (typeof t[e(1078)] == "string") {
    var a = t[e(1078)];
    a && n.push(a[e(447)](","));
  }
  return n;
}
function ov() {
  var e = v;
  if (navigator[e(829)] === void 0) throw new se(-1, e(1084));
  for (var t = navigator[e(829)], n = Object[e(1032)](t) === MimeTypeArray.prototype, r = 0; r < t.length; r++)
    n && (n = Object.getPrototypeOf(t[r]) === MimeType.prototype);
  return n;
}
function sv() {
  return Ke(this, void 0, void 0, function() {
    var e, t;
    return qe(this, function(n) {
      var r = U;
      switch (n.label) {
        case 0:
          if (window[r(821)] === void 0) throw new se(-1, r(324));
          if (navigator[r(416)] === void 0)
            throw new se(-1, "navigator.permissions is undefined");
          if (e = navigator[r(416)], typeof e[r(1159)] !== r(425))
            throw new se(-2, "navigator.permissions.query is not a function");
          n[r(979)] = 1;
        case 1:
          return n[r(816)][r(638)]([1, 3, , 4]), [4, e.query({ name: r(1217) })];
        case 2:
          return t = n.sent(), [
            2,
            window[r(821)][r(1066)] === r(802) && t[r(1054)] === "prompt"
          ];
        case 3:
          throw n[r(607)](), new se(-3, r(476));
        case 4:
          return [2];
      }
    });
  });
}
function lv() {
  var e = v;
  if (navigator[e(1092)] === void 0) throw new se(-1, e(574));
  if (window[e(1080)] === void 0) throw new se(-1, e(591));
  return navigator[e(1092)] instanceof PluginArray;
}
function uv() {
  var e = v;
  if (navigator[e(1092)] === void 0) throw new se(-1, e(574));
  if (navigator[e(1092)][e(343)] === void 0)
    throw new se(-3, "navigator.plugins.length is undefined");
  return navigator.plugins[e(343)];
}
function cv() {
  var e = v, t = window[e(1195)], n = "window.process is";
  if (t === void 0) throw new se(-1, "".concat(n, e(910)));
  if (t && typeof t !== e(668))
    throw new se(-3, ""[e(1130)](n, e(527)));
  return t;
}
function dv() {
  var e = v, t = navigator[e(1006)];
  if (t === void 0) throw new se(-1, e(1135));
  return t;
}
function fv() {
  var e = v;
  if (navigator[e(1017)] === void 0) throw new se(-1, "navigator.connection is undefined");
  if (navigator[e(1017)][e(1005)] === void 0) throw new se(-1, e(525));
  return navigator[e(1017)].rtt;
}
function xv() {
  var e = v;
  return navigator[e(852)];
}
function pv() {
  var e = v;
  if (navigator[e(603)] == null) throw new se(-1, e(888));
  return navigator[e(603)];
}
function hv() {
  var e = v, t = document[e(631)](e(1277));
  if (typeof t[e(400)] != "function") throw new se(-2, e(884));
  var n = t[e(400)](e(1008));
  if (n === null) throw new se(-4, "WebGLRenderingContext is null");
  if (typeof n[e(412)] !== e(425)) throw new se(-2, e(422));
  var r = n[e(412)](n.VENDOR), i = n[e(412)](n[e(342)]);
  return { vendor: r, renderer: i };
}
function mv() {
  var e = v;
  if (window[e(490)] === void 0) throw new se(-1, e(329));
  var t = window[e(490)];
  if (typeof t[e(961)] !== e(425)) throw new se(-2, e(355));
  return t[e(961)]();
}
function vv() {
  var e = v;
  return {
    outerWidth: window[e(968)],
    outerHeight: window[e(862)],
    innerWidth: window.innerWidth,
    innerHeight: window[e(1271)]
  };
}
function gv() {
  var e = v, t, n = (t = {}, t[X[e(1113)]] = { window: ["awesomium"] }, t[X[e(805)]] = { window: [e(323)] }, t[X[e(558)]] = { window: ["CefSharp"] }, t[X[e(778)]] = { window: ["emit"] }, t[X[e(421)]] = { window: [e(330)] }, t[X.Geb] = { window: [e(900)] }, t[X[e(1049)]] = { window: [e(992), e(677)] }, t[X[e(1268)]] = { window: [e(850)] }, t[X.PhantomJS] = { window: ["callPhantom", e(380)] }, t[X[e(954)]] = { window: [e(1031)] }, t[X.Selenium] = {
    window: [e(1175), "_selenium", e(675), /^([a-z]){3}_.*_(Array|Promise|Symbol)$/],
    document: [e(750), e(1225), e(918)]
  }, t[X[e(1109)]] = { window: [e(340)] }, t[X[e(958)]] = {
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
  }, t[X.HeadlessChrome] = { window: [e(481), e(549)] }, t), r, i = {}, a = e0(window), o = [];
  window.document !== void 0 && (o = e0(window[e(601)]));
  for (r in n) {
    var s = n[r];
    if (s !== void 0) {
      var l = s[e(859)] === void 0 ? !1 : hl[e(1241)](
        void 0,
        ao([a], s[e(859)], !1)
      ), c = s[e(601)] === void 0 || !o.length ? !1 : hl[e(1241)](
        void 0,
        ao([o], s[e(601)], !1)
      );
      i[r] = l || c;
    }
  }
  return i;
}
var yv = {
  android: nv,
  browserKind: tv,
  browserEngineKind: Iu,
  documentFocus: rv,
  userAgent: xv,
  appVersion: Q1,
  rtt: fv,
  windowSize: vv,
  pluginsLength: uv,
  pluginsArray: lv,
  errorTrace: K1,
  productSub: dv,
  windowExternal: mv,
  mimeTypesConsistent: ov,
  evalLength: q1,
  webGL: hv,
  webDriver: pv,
  languages: av,
  notificationPermissions: sv,
  documentElementKeys: J1,
  functionBind: ev,
  process: cv,
  distinctiveProps: gv
}, wv = function() {
  var e = v;
  function t() {
    var n = U;
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
    var r = P1(this[n(368)], X1), i = r[0], a = r[1];
    return this[n(957)] = i, a;
  }, t[e(886)][e(437)] = function() {
    return Ke(this, void 0, void 0, function() {
      var n;
      return qe(this, function(r) {
        var i = U;
        switch (r[i(979)]) {
          case 0:
            return n = this, [4, N1(yv)];
          case 1:
            return n.components = r[i(607)](), [2, this[i(368)]];
        }
      });
    });
  }, t;
}();
function _v() {
  var e = v;
  if (!(window.__fpjs_d_m || Math[e(360)]() >= 1e-3))
    try {
      var t = new XMLHttpRequest();
      t.open(e(873), e(578)[e(1130)](T1, e(435)), !0), t.send();
    } catch (n) {
      console.error(n);
    }
}
function kv(e) {
  var t = v, n = {}, r = n[t(410)], i = r === void 0 ? !0 : r;
  return Ke(this, void 0, void 0, function() {
    var a;
    return qe(this, function(o) {
      var s = U;
      switch (o[s(979)]) {
        case 0:
          return i && _v(), a = new wv(), [4, a.collect()];
        case 1:
          return o[s(607)](), [2, a];
      }
    });
  });
}
const Kd = !self[v(601)] && self[v(1161)];
function Sv() {
  var e = v;
  const t = [][e(318)];
  try {
    (-1)[e(505)](-1);
  } catch (n) {
    return n[e(555)][e(343)] + (t + "")[e(447)](t.name)[e(536)]("")[e(343)];
  }
}
const Cv = Sv(), bv = {
  80: { name: "V8", isBlink: !0, isGecko: !1, isWebkit: !1 },
  58: { name: v(552), isBlink: !1, isGecko: !0, isWebkit: !1 },
  77: { name: v(902), isBlink: !1, isGecko: !1, isWebkit: !0 }
}, Ru = bv[Cv] || { name: null, isBlink: !1, isGecko: !1, isWebkit: !1 }, Ae = Ru.isBlink, so = Ru.isGecko, Ev = Ru[v(526)];
function Tv() {
  var e = v;
  return e(797) in navigator && Object[e(1032)](navigator[e(797)])[e(318)].name == "Brave" && navigator[e(797)][e(978)][e(961)]() == e(589);
}
function Pv() {
  var e = v;
  const t = { unknown: !1, allow: !1, standard: !1, strict: !1 };
  try {
    if ((() => {
      var o = U;
      try {
        window[o(1027)] = OfflineAudioContext || webkitOfflineAudioContext;
      } catch (f) {
      }
      if (!window[o(1027)]) return !1;
      const s = new OfflineAudioContext(1, 1, 44100), l = s[o(1016)](), c = new Float32Array(l[o(493)]);
      return l[o(431)](c), new Set(c).size > 1;
    })()) return t.strict = !0, t;
    const r = /(Chrom(e|ium)|Microsoft Edge) PDF (Plugin|Viewer)/, i = [...navigator.plugins], a = i[e(788)]((o) => r.test(o.name))[e(343)] == 2;
    return i.length && !a ? (t[e(397)] = !0, t) : (t[e(1072)] = !0, t);
  } catch {
    return t[e(932)] = !0, t;
  }
}
const Nv = () => {
  const e = {};
  let t = 0;
  return {
    logTestResult: ({ test: n, passed: r, time: i = 0 }) => {
      t += i;
      const a = i.toFixed(2) + "ms";
      e[n] = a;
    },
    getLog: () => e,
    getTotal: () => t
  };
}, Lv = Nv(), { logTestResult: lo } = Lv, qd = () => {
  let e = 0;
  const t = [];
  return {
    stop: () => {
      var n = U;
      return e && (t.push(performance[n(738)]() - e), t[n(541)]((r, i) => r += i, 0));
    },
    start: () => {
      var n = U;
      return e = performance[n(738)](), e;
    }
  };
}, ml = (e, t = 0) => {
  var n = v;
  return e[n(1142)](), new Promise((r) => setTimeout(() => r(e[n(1170)]()), t)).catch(
    (r) => {
      var i = n;
      console[i(446)](r);
    }
  );
};
try {
  speechSynthesis.getVoices();
} catch (e) {
  console[v(446)](e);
}
function Iv() {
  const e = {};
  return {
    getRecords: () => e,
    documentLie: (t, n) => {
      const r = n instanceof Array;
      return e[t] ? r ? e[t] = [...e[t], ...n] : e[t].push(n) : r ? e[t] = n : e[t] = [n];
    }
  };
}
const Rv = Iv(), { documentLie: Sa } = Rv, ef = v(337), Du = () => String[v(1187)](Math[v(360)]() * 26 + 97) + Math[v(360)]()[v(961)](36)[v(1269)](-7);
function Dv(e) {
  var t = v;
  try {
    if (!Ae) return e;
    const n = e.document[t(631)](t(669));
    n[t(962)]("id", Du()), n.setAttribute("style", ef), n[t(1167)] = "<div><iframe></iframe></div>", e.document[t(768)].appendChild(n);
    const r = [...[...n[t(1273)]][0].childNodes][0];
    if (!r) return null;
    const { contentWindow: i } = r || {};
    if (!i) return null;
    const a = i[t(601)].createElement(t(669));
    return a.innerHTML = t(963), i[t(601)].body[t(866)](a), [...[...a[t(1273)]][0][t(1273)]][0][t(383)];
  } catch {
    return console[t(446)](t(999)), e;
  }
}
Du();
const ri = "Reflect" in self;
function Mv(e) {
  var t = v;
  return e[t(318)][t(516)] == t(548);
}
function Ee({ spawnErr: e, withStack: t, final: n }) {
  try {
    throw e(), Error();
  } catch (r) {
    return Mv(r) ? t ? t(r) : !1 : !0;
  } finally {
    n && n();
  }
}
function Ov(e) {
  try {
    return e(), !1;
  } catch {
    return !0;
  }
}
function t0(e) {
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
function fr(e, t, n = 1) {
  var r = v;
  return n === 0 ? t.test(e[r(555)]) : t[r(913)](e[r(742)][r(447)](`
`)[n]);
}
const Hv = /at Function\.toString /, Av = /at Object\.toString/, jv = /at (Function\.)?\[Symbol.hasInstance\]/, Fv = /at (Proxy\.)?\[Symbol.hasInstance\]/, n0 = /strict mode/;
function r0({
  scope: e,
  apiFunction: t,
  proto: n,
  obj: r,
  lieProps: i
}) {
  var a = v;
  if (typeof t != a(425)) return { lied: 0, lieTypes: [] };
  const o = t.name[a(452)](/get\s/, ""), s = r == null ? void 0 : r[a(516)], l = Object.getPrototypeOf(t);
  let c = {
    [a(1011)]: !!r && Ee({ spawnErr: () => r[a(886)][o] }),
    [a(711)]: !!r && /^(screen|navigator)$/i[a(913)](s) && !!(Object.getOwnPropertyDescriptor(self[s.toLowerCase()], o) || ri && Reflect.getOwnPropertyDescriptor(self[s[a(451)]()], o)),
    [a(881)]: Ee({
      spawnErr: () => {
        var m = a;
        new t(), t[m(583)](n);
      }
    }),
    "failed apply interface error": Ee({
      spawnErr: () => {
        new t(), t.apply(n);
      }
    }),
    [a(467)]: Ee({ spawnErr: () => new t() }),
    [a(1205)]: !Ev && Ee({ spawnErr: () => {
    } }),
    "failed null conversion error": Ee({
      spawnErr: () => Object[a(373)](t, null)[a(961)](),
      final: () => Object[a(373)](t, l)
    }),
    [a(767)]: !t0(o)[e[a(1071)].prototype[a(961)][a(583)](t)] || !t0("toString")[e[a(1071)][a(886)][a(961)][a(583)](
      t[a(961)]
    )],
    [a(544)]: a(886) in t,
    [a(1224)]: !!(Object.getOwnPropertyDescriptor(t, a(885)) || Reflect.getOwnPropertyDescriptor(t, a(885)) || Object.getOwnPropertyDescriptor(t, a(822)) || Reflect.getOwnPropertyDescriptor(t, a(822)) || Object[a(897)](t, a(886)) || Reflect[a(897)](t, a(886)) || Object.getOwnPropertyDescriptor(t, a(961)) || Reflect.getOwnPropertyDescriptor(t, a(961))),
    [a(1107)]: !!(t[a(509)]("arguments") || t[a(509)](a(822)) || t[a(509)]("prototype") || t[a(509)]("toString")),
    [a(1147)]: Object[a(331)](Object.getOwnPropertyDescriptors(t))[a(407)]()[a(961)]() != "length,name",
    "failed own property names": Object[a(719)](t)[a(407)]()[a(961)]() != a(354),
    [a(891)]: ri && Reflect[a(483)](t).sort()[a(961)]() != a(354),
    [a(498)]: Ee({
      spawnErr: () => Object[a(851)](t).toString(),
      withStack: (m) => Ae && !fr(m, Hv)
    }) || Ee({
      spawnErr: () => Object[a(851)](new Proxy(t, {}))[a(961)](),
      withStack: (m) => Ae && !fr(m, Av)
    }),
    [a(870)]: Ee({
      spawnErr: () => {
      },
      withStack: (m) => so && !fr(m, n0, 0)
    }),
    "failed at toString incompatible proxy error": Ee({
      spawnErr: () => {
      },
      withStack: (m) => so && !fr(m, n0, 0)
    }),
    [a(1118)]: Ee({
      spawnErr: () => {
        var m = a;
        Object[m(373)](t, Object[m(851)](t))[m(961)]();
      },
      final: () => Object[a(373)](t, l)
    })
  };
  if (o == a(961) || !!i[a(460)] || !!i[a(953)]) {
    const m = new Proxy(t, {}), w = new Proxy(t, {}), y = new Proxy(t, {});
    c = {
      ...c,
      [a(728)]: !Ee({
        spawnErr: () => {
          t.__proto__ = proxy;
        },
        final: () => Object[a(373)](t, l)
      }),
      [a(945)]: !Ee({
        spawnErr: () => {
          var x = a;
          Object[x(373)](m, Object[x(851)](m))[x(961)]();
        },
        final: () => Object[a(373)](m, l)
      }),
      [a(375)]: !Ee({
        spawnErr: () => {
          var x = a;
          w[x(784)] = w;
        },
        final: () => Object[a(373)](w, l)
      }),
      "failed at reflect set proto": ri && Ee({
        spawnErr: () => {
          var x = a;
          throw Reflect[x(373)](t, Object[x(851)](t)), new TypeError();
        },
        final: () => Object[a(373)](t, l)
      }),
      [a(1070)]: ri && !Ee({
        spawnErr: () => {
          var x = a;
          Reflect[x(373)](y, Object.create(y));
        },
        final: () => Object[a(373)](y, l)
      }),
      [a(479)]: Ae && (Ee({
        spawnErr: () => {
        },
        withStack: (x) => !fr(x, jv)
      }) || Ee({
        spawnErr: () => {
          new Proxy(t, {});
        },
        withStack: (x) => !fr(x, Fv)
      })),
      [a(442)]: Ae && ri && Ov(() => {
        var x = a;
        Object[x(1079)](t, "", { configurable: !0 }).toString(), Reflect[x(529)](t, "");
      })
    };
  }
  const f = Object.keys(c)[a(788)]((m) => !!c[m]);
  return { lied: f[a(343)], lieTypes: f };
}
function zv(e) {
  const t = (i) => typeof i < "u" && !!i, n = {}, r = [];
  return {
    getProps: () => n,
    getPropsSearched: () => r,
    searchLies: (i, a) => {
      var o = U;
      const { target: s, ignore: l } = a || {};
      let c;
      try {
        if (c = i(), !t(c)) return;
      } catch {
        return;
      }
      const d = c[o(886)] ? c.prototype : c;
      [.../* @__PURE__ */ new Set([...Object[o(719)](d), ...Object.keys(d)])][o(407)]()[o(550)]((f) => {
        var _;
        var m = o;
        if (f == m(318) || s && !new Set(s)[m(685)](f) || l && new Set(l).has(f)) return;
        const y = /\s(.+)\]/, x = (c[m(516)] ? c[m(516)] : y[m(913)](c) ? (_ = y[m(683)](c)) == null ? void 0 : _[1] : void 0) + "." + f;
        r[m(638)](x);
        try {
          const u = c[m(886)] ? c[m(886)] : c;
          let p;
          try {
            if (typeof u[f] == m(425))
              return p = r0({
                scope: e,
                apiFunction: u[f],
                proto: u,
                obj: null,
                lieProps: n
              }), p.lied ? (Sa(x, p.lieTypes), n[x] = p.lieTypes) : void 0;
            if (f != "name" && f != m(343) && f[0] !== f[0][m(847)]()) {
              const k = [m(883)];
              return Sa(x, k), n[x] = k;
            }
          } catch {
          }
          const h = Object[m(897)](u, f)[m(873)];
          return p = r0({
            scope: e,
            apiFunction: h,
            proto: u,
            obj: c,
            lieProps: n
          }), p[m(507)] ? (Sa(x, p[m(936)]), n[x] = p[m(936)]) : void 0;
        } catch {
          const p = m(1053);
          return Sa(x, p), n[x] = [p];
        }
      });
    }
  };
}
function Wv() {
  var e = v;
  if (Kd) return { iframeWindow: self };
  try {
    const t = self[e(343)], n = new DocumentFragment(), r = document[e(631)](e(669)), i = Du();
    r.setAttribute("id", i), n.appendChild(r), r.innerHTML = '<div style="' + ef + e(1256), document.body[e(866)](n);
    const a = self[t];
    return { iframeWindow: Dv(a) || self, div: r };
  } catch {
    return console[e(446)]("client blocked phantom iframe"), { iframeWindow: self };
  }
}
const { iframeWindow: Vv, div: Os } = Wv() || {};
function Bv(e) {
  var t = v;
  const n = zv(e), { searchLies: r } = n;
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
  const i = n.getProps(), a = n.getPropsSearched();
  return {
    lieDetector: n,
    lieList: Object[t(331)](i)[t(407)](),
    lieDetail: i,
    lieCount: Object[t(331)](i)[t(541)](
      (o, s) => o + i[s].length,
      0
    ),
    propsSearched: a
  };
}
const Uv = performance.now(), { lieDetector: $v, lieList: Zv, lieDetail: Gv, propsSearched: Yv } = Bv(Vv), Xv = (e) => e && e[v(788)](
  (t) => !/object toString|toString incompatible proxy/[v(913)](t)
).length;
let vl, K, i0 = 0;
if (!Kd) {
  vl = (() => {
    var n = v;
    const r = $v[n(983)]();
    return Object[n(331)](r)[n(541)]((i, a) => (i[a] = Xv(r[a]), i), {});
  })(), K = JSON[v(626)](JSON.stringify(Gv)), i0 = +(performance[v(738)]() - Uv)[v(505)](2);
  const t = Yv.length + v(358) + i0 + v(1181) + Zv[v(343)] + " corrupted)";
  setTimeout(() => /* @__PURE__ */ console.log(t), 3e3);
}
const Qv = () => {
  const e = [];
  return {
    getErrors: () => e,
    captureError: (t, n = "") => {
      var r = U;
      const i = {
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
      const { name: o, message: s } = t, l = a(s) ? n ? s + " [" + n + "]" : s : void 0, c = i[o] ? o : void 0;
      return e[r(638)]({ trustedName: c, trustedMessage: l }), void 0;
    }
  };
}, Jv = Qv(), { captureError: tf } = Jv;
var Se = ((e) => {
  var t = v;
  return e[t(757)] = t(874), e[t(495)] = t(394), e[t(561)] = "Linux", e[t(563)] = "Android", e[t(356)] = t(1004), e;
})(Se || {});
const Kv = [v(836), v(1233), "menu", v(1074), "small-caption", v(695)], a0 = {
  "-apple-system": Se[v(495)],
  "Segoe UI": Se[v(757)],
  Tahoma: Se[v(757)],
  "Yu Gothic UI": Se[v(757)],
  "Microsoft JhengHei UI": Se[v(757)],
  "Microsoft YaHei UI": Se[v(757)],
  "Meiryo UI": Se[v(757)],
  Cantarell: Se[v(561)],
  Ubuntu: Se.LINUX,
  Sans: Se[v(561)],
  "sans-serif": Se[v(561)],
  "Fira Sans": Se[v(561)],
  Roboto: Se.ANDROID
};
function qv() {
  var e = v;
  const { body: t } = document, n = document[e(631)](e(669));
  t.appendChild(n);
  try {
    const r = String([
      ...Kv[e(541)]((a, o) => {
        var s = e;
        return n[s(962)](s(1252), s(712) + o + s(551)), a[s(504)](getComputedStyle(n)[s(894)]);
      }, /* @__PURE__ */ new Set())
    ]), i = a0[r];
    return a0[r] ? r + ":" + i : r;
  } catch {
    return "";
  } finally {
    t.removeChild(n);
  }
}
const ne = (e) => {
  var t = v;
  const n = "" + JSON[t(641)](e), r = n.split("").reduce((i, a, o) => {
    var s = t;
    return Math.imul(31, i) + n[s(655)](o) | 0;
  }, 2166136261);
  return (t(1229) + (r >>> 0)[t(961)](16))[t(751)](-8);
}, eg = String[v(1187)](Math[v(360)]() * 26 + 97) + Math[v(360)]()[v(961)](36).slice(-7);
function tg() {
  var M;
  var e = v;
  if (!Ae) return [];
  const t = e(946) in HTMLVideoElement[e(886)], n = CSS.supports(e(651)), r = CSS.supports("appearance: initial"), i = e(333) in Intl, a = CSS[e(487)](e(1180)), o = CSS[e(487)]("border-end-end-radius: initial"), s = e(403) in Crypto[e(886)], l = e(938) in window, c = "downlinkMax" in (((M = window.NetworkInformation) == null ? void 0 : M[e(886)]) || {}), d = "ContentIndex" in window, f = e(810) in window, m = e(783) in window, w = "FileSystemWritableFileStream" in window, y = "HID" in window && e(976) in window, x = e(402) in window && "Serial" in window, _ = e(488) in window, u = e(1182) in Window && "TouchEvent" in window, p = e(1198) in Navigator[e(886)], h = (T, A) => T ? [A] : [], g = {
    [Se[e(563)]]: [
      ...h(a, l),
      ...h(r, d),
      ...h(t, f),
      c,
      ...h(s, !m),
      ...h(i, !w),
      ...h(o, !y),
      ...h(o, !x),
      !_,
      u,
      ...h(n, !p)
    ],
    [Se[e(356)]]: [
      ...h(a, l),
      ...h(r, !d),
      ...h(t, !f),
      c,
      ...h(s, m),
      ...h(i, w),
      ...h(o, y),
      ...h(o, x),
      _,
      u || !u,
      ...h(n, !p)
    ],
    [Se.WINDOWS]: [
      ...h(a, !l),
      ...h(r, !d),
      ...h(t, !f),
      !c,
      ...h(s, m),
      ...h(i, w),
      ...h(o, y),
      ...h(o, x),
      _,
      u || !u,
      ...h(n, p)
    ],
    [Se[e(495)]]: [
      ...h(a, l),
      ...h(r, !d),
      ...h(t, !f),
      !c,
      ...h(s, m),
      ...h(i, w),
      ...h(o, y),
      ...h(o, x),
      _,
      !u,
      ...h(n, p)
    ],
    [Se[e(561)]]: [
      ...h(a, !l),
      ...h(r, !d),
      ...h(t, !f),
      !c,
      ...h(s, m),
      ...h(i, w),
      ...h(o, y),
      ...h(o, x),
      _,
      !u || !u,
      ...h(n, !p)
    ]
  }, k = {
    noContentIndex: r && !d,
    noContactsManager: t && !f,
    noDownlinkMax: !c
  }, C = Object[e(331)](g)[e(541)]((T, A) => {
    var le = e;
    const xt = g[A], lr = +(xt[le(788)]((ei) => ei)[le(343)] / xt[le(343)])[le(505)](2);
    return T[A] = lr, T;
  }, {}), S = Object[e(331)](C)[e(541)](
    (T, A) => C[T] > C[A] ? T : A
  ), L = C[S];
  return [C, L, k];
}
async function ng({ webgl: e, workerScope: t }) {
  var r;
  var n = v;
  try {
    const i = qd();
    await ml(i);
    const a = Object.keys({ ...navigator.mimeTypes }), o = qv(), [s, l, c] = tg(), d = {
      chromium: Ae,
      likeHeadless: {
        noChrome: Ae && !(n(843) in window),
        hasPermissionsBug: Ae && n(416) in navigator && await (async () => {
          var g = n;
          return (await navigator.permissions[g(1159)]({
            name: "notifications"
          }))[g(1054)] == g(868) && g(821) in window && Notification.permission === g(802);
        })(),
        noPlugins: Ae && navigator[n(1092)][n(343)] === 0,
        noMimeTypes: Ae && a[n(343)] === 0,
        notificationIsDenied: Ae && n(821) in window && Notification[n(1066)] == n(802),
        hasKnownBgColor: Ae && (() => {
          var g = n;
          let k = Os;
          if (!Os && (k = document[g(631)]("div"), document.body[g(866)](k)), !k) return !1;
          k[g(962)]("style", g(1041));
          const { backgroundColor: C } = getComputedStyle(k) || [];
          return !Os && document[g(768)][g(691)](k), C === g(736);
        })(),
        prefersLightColor: matchMedia(n(716))[n(1259)],
        uaDataIsBlank: "userAgentData" in navigator && (((r = navigator.userAgentData) == null ? void 0 : r[n(841)]) === "" || await navigator[n(398)].getHighEntropyValues([n(841)]).platform === ""),
        pdfIsDisabled: n(916) in navigator && navigator.pdfViewerEnabled === !1,
        noTaskbar: screen.height === screen.availHeight && screen[n(347)] === screen[n(1105)],
        hasVvpScreenRes: innerWidth === screen[n(347)] && outerHeight === screen[n(515)] || n(849) in window && visualViewport[n(347)] === screen[n(347)] && visualViewport.height === screen[n(515)],
        hasSwiftShader: /SwiftShader/[n(913)](t == null ? void 0 : t[n(1194)]),
        noWebShare: Ae && CSS[n(487)]("accent-color: initial") && (!(n(1102) in navigator) || !(n(734) in navigator)),
        noContentIndex: !!(c != null && c.noContentIndex),
        noContactsManager: !!(c != null && c[n(348)]),
        noDownlinkMax: !!(c != null && c.noDownlinkMax)
      },
      headless: {
        webDriverIsOn: CSS[n(487)]("border-end-end-radius: initial") && navigator[n(603)] === void 0 || !!navigator[n(603)] || !!vl[n(926)],
        hasHeadlessUA: /HeadlessChrome/[n(913)](navigator[n(852)]) || /HeadlessChrome/[n(913)](navigator[n(1036)]),
        hasHeadlessWorkerUA: !!t && /HeadlessChrome/[n(913)](t.userAgent)
      },
      stealth: {
        hasIframeProxy: (() => {
          var g = n;
          try {
            const k = document[g(631)](g(462));
            return k.srcdoc = eg, !!k.contentWindow;
          } catch (k) {
            return console[g(446)](k), !0;
          }
        })(),
        hasHighChromeIndex: (() => {
          var g = n;
          const k = g(843), C = -50;
          return Object.keys(window).slice(C).includes(k) && Object[g(719)](window)[g(1269)](C)[g(673)](k);
        })(),
        hasBadChromeRuntime: (() => {
          var g = n;
          if (!("chrome" in window && g(867) in chrome)) return !1;
          try {
            return g(886) in chrome[g(867)][g(514)] || g(886) in chrome[g(867)].connect || (new chrome[g(867)].sendMessage(), new chrome[g(867)].connect()), !0;
          } catch (k) {
            return console[g(446)](g(729), k), k.constructor[g(516)] != g(548);
          }
        })(),
        hasToStringProxy: !!vl["Function.toString"],
        hasBadWebGL: (() => {
          var g = n;
          const { UNMASKED_RENDERER_WEBGL: k } = (e == null ? void 0 : e[g(901)]) || {}, { webglRenderer: C } = t || {};
          return k && C && k !== C;
        })()
      }
    }, { likeHeadless: f, headless: m, stealth: w } = d, y = Object[n(331)](f), x = Object.keys(m), _ = Object[n(331)](w), u = +(y[n(788)]((g) => f[g])[n(343)] / y[n(343)] * 100)[n(505)](0), p = +(x[n(788)]((g) => m[g])[n(343)] / x[n(343)] * 100).toFixed(0), h = +(_[n(788)]((g) => w[g])[n(343)] / _[n(343)] * 100)[n(505)](0);
    return lo({ time: i[n(1142)](), test: "headless", passed: !0 }), {
      ...d,
      likeHeadlessRating: u,
      headlessRating: p,
      stealthRating: h,
      systemFonts: o,
      platformEstimate: [s, l]
    };
  } catch (i) {
    lo({ test: n(974), passed: !1 }), tf(i, n(974));
    return;
  }
}
async function rg() {
  var e = v;
  try {
    const t = qd();
    await ml(t);
    const n = {
      privacy: void 0,
      security: void 0,
      mode: void 0,
      extension: void 0,
      engine: Ae ? "Blink" : so ? e(1197) : ""
    }, r = (y) => new RegExp(y + "+$"), i = (y, x, _) => new Promise(
      (u) => setTimeout(() => {
        var p = e;
        const h = _ || +/* @__PURE__ */ new Date(), g = r(x)[p(913)](h) ? r(x)[p(683)](h)[0] : h;
        return u(g);
      }, y)
    ), a = async () => {
      var y = e;
      const x = +/* @__PURE__ */ new Date(), _ = +("" + x)[y(1269)](-1), u = await i(0, _, x), p = await i(1, _), h = await i(2, _), g = await i(3, _), k = await i(4, _), C = await i(5, _), S = await i(6, _), L = await i(7, _), M = await i(8, _), T = await i(9, _), A = ("" + u)[y(1269)](-1), le = ("" + p)[y(1269)](-1), xt = ("" + h).slice(-1), lr = ("" + g)[y(1269)](-1), ei = ("" + k).slice(-1), ti = ("" + C)[y(1269)](-1), ni = ("" + S)[y(1269)](-1), R = ("" + L).slice(-1), W = ("" + M)[y(1269)](-1), Z = ("" + T)[y(1269)](-1), ue = A == le && A == xt && A == lr && A == ei && A == ti && A == ni && A == R && A == W && A == Z, ye = ("" + u)[y(343)], zn = [
        u,
        p,
        h,
        g,
        k,
        C,
        S,
        L,
        M,
        T
      ];
      return {
        protection: ue,
        delays: zn[y(335)](
          (tt) => ("" + tt).length > ye ? ("" + tt).slice(-ye) : tt
        ),
        precision: ue ? Math.min(...zn[y(335)]((tt) => ("" + tt)[y(343)])) : void 0,
        precisionValue: ue ? A : void 0
      };
    }, [o, s] = await Promise[e(930)]([
      Tv(),
      Ae ? void 0 : a()
    ]);
    if (o) {
      const y = Pv();
      n[e(530)] = e(513), n[e(336)] = {
        FileSystemWritableFileStream: e(430) in window,
        Serial: e(1110) in window,
        ReportingObserver: "ReportingObserver" in window
      }, n[e(1169)] = y[e(1072)] ? e(1072) : y[e(397)] ? "standard" : y[e(1009)] ? e(1009) : "";
    }
    const { protection: l } = s || {};
    if (so && l) {
      const y = {
        OfflineAudioContext: e(1027) in window,
        WebGL2RenderingContext: e(762) in window,
        WebAssembly: e(1139) in window,
        maxTouchPoints: e(1103) in navigator,
        RTCRtpTransceiver: e(434) in window,
        MediaDevices: e(660) in window,
        Credential: e(887) in window
      }, x = Object[e(331)](y), _ = /* @__PURE__ */ new Set(["RTCRtpTransceiver", e(660), e(887)]), u = x.filter((h) => _.has(h) && !y[h])[e(343)] == _[e(1190)], p = !y[e(1139)];
      n.privacy = e(u ? 1026 : 995), n[e(336)] = { reduceTimerPrecision: !0, ...y }, n[e(1169)] = u ? p ? "safer" : e(397) : e(1235);
    }
    const c = Object.keys(K)[e(343)], d = "c767712b", f = {
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
    await ml(t);
    const m = {
      contentDocumentHash: ne(K[e(1219)]),
      contentWindowHash: ne(K[e(393)]),
      createElementHash: ne(K[e(600)]),
      getElementByIdHash: ne(K["Document.getElementById"]),
      appendHash: ne(K["Element.append"]),
      insertAdjacentElementHash: ne(K[e(575)]),
      insertAdjacentHTMLHash: ne(K[e(617)]),
      insertAdjacentTextHash: ne(K["Element.insertAdjacentText"]),
      prependHash: ne(K["Element.prepend"]),
      replaceWithHash: ne(K["Element.replaceWith"]),
      appendChildHash: ne(K[e(948)]),
      insertBeforeHash: ne(K[e(622)]),
      replaceChildHash: ne(K[e(1185)]),
      getContextHash: ne(K[e(965)]),
      toDataURLHash: ne(K[e(791)]),
      toBlobHash: ne(K["HTMLCanvasElement.toBlob"]),
      getImageDataHash: ne(K[e(520)]),
      getByteFrequencyDataHash: ne(K[e(1212)]),
      getByteTimeDomainDataHash: ne(K["AnalyserNode.getByteTimeDomainData"]),
      getFloatFrequencyDataHash: ne(K["AnalyserNode.getFloatFrequencyData"]),
      getFloatTimeDomainDataHash: ne(K[e(1176)]),
      copyFromChannelHash: ne(K[e(662)]),
      getChannelDataHash: ne(K[e(1257)]),
      hardwareConcurrencyHash: ne(K[e(1052)]),
      availHeightHash: ne(K[e(982)]),
      availLeftHash: ne(K["Screen.availLeft"]),
      availTopHash: ne(K["Screen.availTop"]),
      availWidthHash: ne(K[e(556)]),
      colorDepthHash: ne(K["Screen.colorDepth"]),
      pixelDepthHash: ne(K[e(1057)])
    };
    n[e(648)] = Object[e(331)](m).reduce((y, x) => {
      var _ = e;
      const u = m[x];
      return u == d || (y[x[_(452)](_(1221), "")] = u), y;
    }, {});
    const w = ({ pattern: y, hash: x, prototypeLiesLen: _ }) => {
      var u = e;
      const {
        noscript: p,
        trace: h,
        cydec: g,
        canvasblocker: k,
        chameleon: C,
        duckduckgo: S,
        privacybadger: L,
        privacypossum: M,
        jshelter: T,
        puppeteerExtra: A,
        fakeBrowser: le
      } = y, xt = u(1020);
      if (_)
        return _ >= 7 && h[u(1126)][u(673)](x[u(1126)]) && h[u(471)][u(673)](x.contentWindowHash) && h[u(781)].includes(x[u(781)]) && h[u(499)][u(673)](x.getElementByIdHash) && h[u(735)].includes(x[u(735)]) && h[u(824)][u(673)](x[u(824)]) && h.getImageDataHash.includes(x[u(646)]) ? u(934) : _ >= 7 && g[u(1126)][u(673)](x[u(1126)]) && g[u(471)][u(673)](x[u(471)]) && g.createElementHash[u(673)](x[u(781)]) && g[u(499)].includes(x[u(499)]) && g.toDataURLHash[u(673)](x[u(735)]) && g[u(824)][u(673)](x[u(824)]) && g[u(646)].includes(x[u(646)]) ? u(376) : _ >= 6 && k.contentDocumentHash[u(673)](x[u(1126)]) && k[u(471)][u(673)](x[u(471)]) && k[u(702)][u(673)](x[u(702)]) && k[u(735)].includes(x.toDataURLHash) && k[u(824)][u(673)](x[u(824)]) && k[u(646)][u(673)](x[u(646)]) ? "CanvasBlocker" : _ >= 9 && C[u(702)][u(673)](x[u(702)]) && C[u(1146)][u(673)](x[u(1146)]) && C.insertAdjacentHTMLHash.includes(x[u(345)]) && C.insertAdjacentTextHash[u(673)](x[u(927)]) && C[u(1038)].includes(x.prependHash) && C.replaceWithHash[u(673)](x.replaceWithHash) && C.appendChildHash[u(673)](x[u(657)]) && C[u(367)][u(673)](x[u(367)]) && C[u(1060)].includes(x[u(1060)]) ? u(1077) : _ >= 7 && S[u(735)][u(673)](x.toDataURLHash) && S.toBlobHash[u(673)](x[u(824)]) && S[u(646)][u(673)](x[u(646)]) && S[u(687)][u(673)](x[u(687)]) && S[u(815)].includes(x[u(815)]) && S[u(764)][u(673)](x[u(764)]) && S[u(789)][u(673)](x.getFloatTimeDomainDataHash) && S.copyFromChannelHash[u(673)](x[u(389)]) && S[u(1132)].includes(x[u(1132)]) && S.hardwareConcurrencyHash[u(673)](x[u(473)]) && S.availHeightHash[u(673)](x[u(1188)]) && S[u(1010)][u(673)](x[u(1010)]) && S[u(427)][u(673)](x[u(427)]) && S[u(952)][u(673)](x[u(952)]) && S[u(647)][u(673)](x[u(647)]) && S[u(839)][u(673)](x[u(839)]) ? u(1214) : _ >= 2 && L.getImageDataHash[u(673)](x[u(646)]) && L.toDataURLHash.includes(x.toDataURLHash) ? u(417) : _ >= 3 && M[u(473)].includes(x[u(473)]) && M.availWidthHash.includes(x[u(952)]) && M[u(647)][u(673)](x[u(647)]) ? u(531) : _ >= 2 && p[u(1126)].includes(x.contentDocumentHash) && p[u(471)][u(673)](x.contentDocumentHash) && p[u(654)][u(673)](x[u(654)]) && x[u(473)] == xt ? u(766) : _ >= 14 && T[u(1126)][u(673)](x[u(1126)]) && T.contentWindowHash[u(673)](x[u(1126)]) && T[u(702)][u(673)](x[u(702)]) && T.insertAdjacentElementHash[u(673)](x.insertAdjacentElementHash) && T[u(345)][u(673)](x.insertAdjacentHTMLHash) && T[u(1038)][u(673)](x[u(1038)]) && T[u(880)].includes(x[u(880)]) && T[u(657)][u(673)](x[u(657)]) && T[u(367)][u(673)](x[u(367)]) && T[u(1060)][u(673)](x.replaceChildHash) && T[u(473)].includes(x[u(473)]) ? "JShelter" : _ >= 13 && A[u(1126)].includes(x[u(1126)]) && A[u(471)][u(673)](x[u(471)]) && A[u(781)].includes(x[u(781)]) && A.getElementByIdHash.includes(x.getElementByIdHash) && A[u(702)][u(673)](x.appendHash) && A[u(1146)][u(673)](x[u(1146)]) && A[u(345)][u(673)](x[u(345)]) && A.insertAdjacentTextHash[u(673)](x[u(927)]) && A.prependHash.includes(x.prependHash) && A[u(880)][u(673)](x[u(880)]) && A.appendChildHash[u(673)](x[u(657)]) && A[u(367)].includes(x.insertBeforeHash) && A[u(1126)][u(673)](x[u(1126)]) && A.replaceChildHash.includes(x[u(1060)]) && A[u(654)][u(673)](x[u(654)]) && A[u(735)][u(673)](x.toDataURLHash) && A[u(824)][u(673)](x[u(824)]) && A[u(646)][u(673)](x[u(646)]) && A.hardwareConcurrencyHash[u(673)](x[u(473)]) ? u(1155) : _ >= 12 && le.appendChildHash[u(673)](x.appendChildHash) && le[u(654)][u(673)](x[u(654)]) && le[u(735)].includes(x.toDataURLHash) && le[u(824)].includes(x[u(824)]) && le.getImageDataHash[u(673)](x[u(646)]) && le[u(473)][u(673)](x[u(473)]) && le.availHeightHash[u(673)](x[u(1188)]) && le[u(1010)][u(673)](x.availLeftHash) && le[u(427)][u(673)](x.availTopHash) && le[u(952)][u(673)](x[u(952)]) && le[u(647)][u(673)](x[u(647)]) && le[u(839)][u(673)](x[u(839)]) ? u(987) : void 0;
    };
    return n[e(413)] = w({
      pattern: f,
      hash: m,
      prototypeLiesLen: c
    }), lo({ time: t[e(1142)](), test: e(748), passed: !0 }), n;
  } catch (t) {
    lo({ test: e(748), passed: !1 }), tf(t);
    return;
  }
}
const ig = async () => {
  var e = v;
  const t = await rg(), n = await ng({ webgl: null, workerScope: null }), r = { resistance: t, headlessFeaturesFingerprint: n }, i = kv(), a = await i, o = await a.detect(), s = o.bot, l = (n == null ? void 0 : n[e(959)]) || 0, c = (n == null ? void 0 : n[e(540)]) || 0, d = (n == null ? void 0 : n.stealthRating) || 0, f = s ? 100 : Math[e(826)](l, c, d), m = f > 50 || d > 30, w = s ? o[e(984)] : t == null ? void 0 : t[e(413)];
  return {
    fingerprint: r,
    isBotBotD: o,
    botScore: f,
    isBot: m,
    botType: w
  };
}, Lw = async () => {
  var e = v;
  const t = E1(), n = await t, r = await n[e(873)](), { screenFrame: i, ...a } = r[e(368)];
  return Jd(a);
};
var ag = !1;
function og(e) {
  if (e.sheet)
    return e.sheet;
  for (var t = 0; t < document.styleSheets.length; t++)
    if (document.styleSheets[t].ownerNode === e)
      return document.styleSheets[t];
}
function sg(e) {
  var t = document.createElement("style");
  return t.setAttribute("data-emotion", e.key), e.nonce !== void 0 && t.setAttribute("nonce", e.nonce), t.appendChild(document.createTextNode("")), t.setAttribute("data-s", ""), t;
}
var lg = /* @__PURE__ */ function() {
  function e(n) {
    var r = this;
    this._insertTag = function(i) {
      var a;
      r.tags.length === 0 ? r.insertionPoint ? a = r.insertionPoint.nextSibling : r.prepend ? a = r.container.firstChild : a = r.before : a = r.tags[r.tags.length - 1].nextSibling, r.container.insertBefore(i, a), r.tags.push(i);
    }, this.isSpeedy = n.speedy === void 0 ? !ag : n.speedy, this.tags = [], this.ctr = 0, this.nonce = n.nonce, this.key = n.key, this.container = n.container, this.prepend = n.prepend, this.insertionPoint = n.insertionPoint, this.before = null;
  }
  var t = e.prototype;
  return t.hydrate = function(r) {
    r.forEach(this._insertTag);
  }, t.insert = function(r) {
    this.ctr % (this.isSpeedy ? 65e3 : 1) === 0 && this._insertTag(sg(this));
    var i = this.tags[this.tags.length - 1];
    if (this.isSpeedy) {
      var a = og(i);
      try {
        a.insertRule(r, a.cssRules.length);
      } catch {
      }
    } else
      i.appendChild(document.createTextNode(r));
    this.ctr++;
  }, t.flush = function() {
    this.tags.forEach(function(r) {
      var i;
      return (i = r.parentNode) == null ? void 0 : i.removeChild(r);
    }), this.tags = [], this.ctr = 0;
  }, e;
}(), He = "-ms-", uo = "-moz-", q = "-webkit-", nf = "comm", Mu = "rule", Ou = "decl", ug = "@import", rf = "@keyframes", cg = "@layer", dg = Math.abs, Yo = String.fromCharCode, fg = Object.assign;
function xg(e, t) {
  return Ie(e, 0) ^ 45 ? (((t << 2 ^ Ie(e, 0)) << 2 ^ Ie(e, 1)) << 2 ^ Ie(e, 2)) << 2 ^ Ie(e, 3) : 0;
}
function af(e) {
  return e.trim();
}
function pg(e, t) {
  return (e = t.exec(e)) ? e[0] : e;
}
function ee(e, t, n) {
  return e.replace(t, n);
}
function gl(e, t) {
  return e.indexOf(t);
}
function Ie(e, t) {
  return e.charCodeAt(t) | 0;
}
function Ii(e, t, n) {
  return e.slice(t, n);
}
function Ft(e) {
  return e.length;
}
function Hu(e) {
  return e.length;
}
function Ca(e, t) {
  return t.push(e), e;
}
function hg(e, t) {
  return e.map(t).join("");
}
var Xo = 1, jr = 1, of = 0, et = 0, _e = 0, Jr = "";
function Qo(e, t, n, r, i, a, o) {
  return { value: e, root: t, parent: n, type: r, props: i, children: a, line: Xo, column: jr, length: o, return: "" };
}
function ii(e, t) {
  return fg(Qo("", null, null, "", null, null, 0), e, { length: -e.length }, t);
}
function mg() {
  return _e;
}
function vg() {
  return _e = et > 0 ? Ie(Jr, --et) : 0, jr--, _e === 10 && (jr = 1, Xo--), _e;
}
function ot() {
  return _e = et < of ? Ie(Jr, et++) : 0, jr++, _e === 10 && (jr = 1, Xo++), _e;
}
function Ut() {
  return Ie(Jr, et);
}
function $a() {
  return et;
}
function pa(e, t) {
  return Ii(Jr, e, t);
}
function Ri(e) {
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
function sf(e) {
  return Xo = jr = 1, of = Ft(Jr = e), et = 0, [];
}
function lf(e) {
  return Jr = "", e;
}
function Za(e) {
  return af(pa(et - 1, yl(e === 91 ? e + 2 : e === 40 ? e + 1 : e)));
}
function gg(e) {
  for (; (_e = Ut()) && _e < 33; )
    ot();
  return Ri(e) > 2 || Ri(_e) > 3 ? "" : " ";
}
function yg(e, t) {
  for (; --t && ot() && !(_e < 48 || _e > 102 || _e > 57 && _e < 65 || _e > 70 && _e < 97); )
    ;
  return pa(e, $a() + (t < 6 && Ut() == 32 && ot() == 32));
}
function yl(e) {
  for (; ot(); )
    switch (_e) {
      case e:
        return et;
      case 34:
      case 39:
        e !== 34 && e !== 39 && yl(_e);
        break;
      case 40:
        e === 41 && yl(e);
        break;
      case 92:
        ot();
        break;
    }
  return et;
}
function wg(e, t) {
  for (; ot() && e + _e !== 57; )
    if (e + _e === 84 && Ut() === 47)
      break;
  return "/*" + pa(t, et - 1) + "*" + Yo(e === 47 ? e : ot());
}
function _g(e) {
  for (; !Ri(Ut()); )
    ot();
  return pa(e, et);
}
function kg(e) {
  return lf(Ga("", null, null, null, [""], e = sf(e), 0, [0], e));
}
function Ga(e, t, n, r, i, a, o, s, l) {
  for (var c = 0, d = 0, f = o, m = 0, w = 0, y = 0, x = 1, _ = 1, u = 1, p = 0, h = "", g = i, k = a, C = r, S = h; _; )
    switch (y = p, p = ot()) {
      case 40:
        if (y != 108 && Ie(S, f - 1) == 58) {
          gl(S += ee(Za(p), "&", "&\f"), "&\f") != -1 && (u = -1);
          break;
        }
      case 34:
      case 39:
      case 91:
        S += Za(p);
        break;
      case 9:
      case 10:
      case 13:
      case 32:
        S += gg(y);
        break;
      case 92:
        S += yg($a() - 1, 7);
        continue;
      case 47:
        switch (Ut()) {
          case 42:
          case 47:
            Ca(Sg(wg(ot(), $a()), t, n), l);
            break;
          default:
            S += "/";
        }
        break;
      case 123 * x:
        s[c++] = Ft(S) * u;
      case 125 * x:
      case 59:
      case 0:
        switch (p) {
          case 0:
          case 125:
            _ = 0;
          case 59 + d:
            u == -1 && (S = ee(S, /\f/g, "")), w > 0 && Ft(S) - f && Ca(w > 32 ? s0(S + ";", r, n, f - 1) : s0(ee(S, " ", "") + ";", r, n, f - 2), l);
            break;
          case 59:
            S += ";";
          default:
            if (Ca(C = o0(S, t, n, c, d, i, s, h, g = [], k = [], f), a), p === 123)
              if (d === 0)
                Ga(S, t, C, C, g, a, f, s, k);
              else
                switch (m === 99 && Ie(S, 3) === 110 ? 100 : m) {
                  case 100:
                  case 108:
                  case 109:
                  case 115:
                    Ga(e, C, C, r && Ca(o0(e, C, C, 0, 0, i, s, h, i, g = [], f), k), i, k, f, s, r ? g : k);
                    break;
                  default:
                    Ga(S, C, C, C, [""], k, 0, s, k);
                }
        }
        c = d = w = 0, x = u = 1, h = S = "", f = o;
        break;
      case 58:
        f = 1 + Ft(S), w = y;
      default:
        if (x < 1) {
          if (p == 123)
            --x;
          else if (p == 125 && x++ == 0 && vg() == 125)
            continue;
        }
        switch (S += Yo(p), p * x) {
          case 38:
            u = d > 0 ? 1 : (S += "\f", -1);
            break;
          case 44:
            s[c++] = (Ft(S) - 1) * u, u = 1;
            break;
          case 64:
            Ut() === 45 && (S += Za(ot())), m = Ut(), d = f = Ft(h = S += _g($a())), p++;
            break;
          case 45:
            y === 45 && Ft(S) == 2 && (x = 0);
        }
    }
  return a;
}
function o0(e, t, n, r, i, a, o, s, l, c, d) {
  for (var f = i - 1, m = i === 0 ? a : [""], w = Hu(m), y = 0, x = 0, _ = 0; y < r; ++y)
    for (var u = 0, p = Ii(e, f + 1, f = dg(x = o[y])), h = e; u < w; ++u)
      (h = af(x > 0 ? m[u] + " " + p : ee(p, /&\f/g, m[u]))) && (l[_++] = h);
  return Qo(e, t, n, i === 0 ? Mu : s, l, c, d);
}
function Sg(e, t, n) {
  return Qo(e, t, n, nf, Yo(mg()), Ii(e, 2, -2), 0);
}
function s0(e, t, n, r) {
  return Qo(e, t, n, Ou, Ii(e, 0, r), Ii(e, r + 1, -1), r);
}
function Lr(e, t) {
  for (var n = "", r = Hu(e), i = 0; i < r; i++)
    n += t(e[i], i, e, t) || "";
  return n;
}
function Cg(e, t, n, r) {
  switch (e.type) {
    case cg:
      if (e.children.length) break;
    case ug:
    case Ou:
      return e.return = e.return || e.value;
    case nf:
      return "";
    case rf:
      return e.return = e.value + "{" + Lr(e.children, r) + "}";
    case Mu:
      e.value = e.props.join(",");
  }
  return Ft(n = Lr(e.children, r)) ? e.return = e.value + "{" + n + "}" : "";
}
function bg(e) {
  var t = Hu(e);
  return function(n, r, i, a) {
    for (var o = "", s = 0; s < t; s++)
      o += e[s](n, r, i, a) || "";
    return o;
  };
}
function Eg(e) {
  return function(t) {
    t.root || (t = t.return) && e(t);
  };
}
function uf(e) {
  var t = /* @__PURE__ */ Object.create(null);
  return function(n) {
    return t[n] === void 0 && (t[n] = e(n)), t[n];
  };
}
var Tg = function(t, n, r) {
  for (var i = 0, a = 0; i = a, a = Ut(), i === 38 && a === 12 && (n[r] = 1), !Ri(a); )
    ot();
  return pa(t, et);
}, Pg = function(t, n) {
  var r = -1, i = 44;
  do
    switch (Ri(i)) {
      case 0:
        i === 38 && Ut() === 12 && (n[r] = 1), t[r] += Tg(et - 1, n, r);
        break;
      case 2:
        t[r] += Za(i);
        break;
      case 4:
        if (i === 44) {
          t[++r] = Ut() === 58 ? "&\f" : "", n[r] = t[r].length;
          break;
        }
      default:
        t[r] += Yo(i);
    }
  while (i = ot());
  return t;
}, Ng = function(t, n) {
  return lf(Pg(sf(t), n));
}, l0 = /* @__PURE__ */ new WeakMap(), Lg = function(t) {
  if (!(t.type !== "rule" || !t.parent || // positive .length indicates that this rule contains pseudo
  // negative .length indicates that this rule has been already prefixed
  t.length < 1)) {
    for (var n = t.value, r = t.parent, i = t.column === r.column && t.line === r.line; r.type !== "rule"; )
      if (r = r.parent, !r) return;
    if (!(t.props.length === 1 && n.charCodeAt(0) !== 58 && !l0.get(r)) && !i) {
      l0.set(t, !0);
      for (var a = [], o = Ng(n, a), s = r.props, l = 0, c = 0; l < o.length; l++)
        for (var d = 0; d < s.length; d++, c++)
          t.props[c] = a[l] ? o[l].replace(/&\f/g, s[d]) : s[d] + " " + o[l];
    }
  }
}, Ig = function(t) {
  if (t.type === "decl") {
    var n = t.value;
    // charcode for l
    n.charCodeAt(0) === 108 && // charcode for b
    n.charCodeAt(2) === 98 && (t.return = "", t.value = "");
  }
};
function cf(e, t) {
  switch (xg(e, t)) {
    case 5103:
      return q + "print-" + e + e;
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
      return q + e + e;
    case 5349:
    case 4246:
    case 4810:
    case 6968:
    case 2756:
      return q + e + uo + e + He + e + e;
    case 6828:
    case 4268:
      return q + e + He + e + e;
    case 6165:
      return q + e + He + "flex-" + e + e;
    case 5187:
      return q + e + ee(e, /(\w+).+(:[^]+)/, q + "box-$1$2" + He + "flex-$1$2") + e;
    case 5443:
      return q + e + He + "flex-item-" + ee(e, /flex-|-self/, "") + e;
    case 4675:
      return q + e + He + "flex-line-pack" + ee(e, /align-content|flex-|-self/, "") + e;
    case 5548:
      return q + e + He + ee(e, "shrink", "negative") + e;
    case 5292:
      return q + e + He + ee(e, "basis", "preferred-size") + e;
    case 6060:
      return q + "box-" + ee(e, "-grow", "") + q + e + He + ee(e, "grow", "positive") + e;
    case 4554:
      return q + ee(e, /([^-])(transform)/g, "$1" + q + "$2") + e;
    case 6187:
      return ee(ee(ee(e, /(zoom-|grab)/, q + "$1"), /(image-set)/, q + "$1"), e, "") + e;
    case 5495:
    case 3959:
      return ee(e, /(image-set\([^]*)/, q + "$1$`$1");
    case 4968:
      return ee(ee(e, /(.+:)(flex-)?(.*)/, q + "box-pack:$3" + He + "flex-pack:$3"), /s.+-b[^;]+/, "justify") + q + e + e;
    case 4095:
    case 3583:
    case 4068:
    case 2532:
      return ee(e, /(.+)-inline(.+)/, q + "$1$2") + e;
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
      if (Ft(e) - 1 - t > 6) switch (Ie(e, t + 1)) {
        case 109:
          if (Ie(e, t + 4) !== 45) break;
        case 102:
          return ee(e, /(.+:)(.+)-([^]+)/, "$1" + q + "$2-$3$1" + uo + (Ie(e, t + 3) == 108 ? "$3" : "$2-$3")) + e;
        case 115:
          return ~gl(e, "stretch") ? cf(ee(e, "stretch", "fill-available"), t) + e : e;
      }
      break;
    case 4949:
      if (Ie(e, t + 1) !== 115) break;
    case 6444:
      switch (Ie(e, Ft(e) - 3 - (~gl(e, "!important") && 10))) {
        case 107:
          return ee(e, ":", ":" + q) + e;
        case 101:
          return ee(e, /(.+:)([^;!]+)(;|!.+)?/, "$1" + q + (Ie(e, 14) === 45 ? "inline-" : "") + "box$3$1" + q + "$2$3$1" + He + "$2box$3") + e;
      }
      break;
    case 5936:
      switch (Ie(e, t + 11)) {
        case 114:
          return q + e + He + ee(e, /[svh]\w+-[tblr]{2}/, "tb") + e;
        case 108:
          return q + e + He + ee(e, /[svh]\w+-[tblr]{2}/, "tb-rl") + e;
        case 45:
          return q + e + He + ee(e, /[svh]\w+-[tblr]{2}/, "lr") + e;
      }
      return q + e + He + e + e;
  }
  return e;
}
var Rg = function(t, n, r, i) {
  if (t.length > -1 && !t.return) switch (t.type) {
    case Ou:
      t.return = cf(t.value, t.length);
      break;
    case rf:
      return Lr([ii(t, {
        value: ee(t.value, "@", "@" + q)
      })], i);
    case Mu:
      if (t.length) return hg(t.props, function(a) {
        switch (pg(a, /(::plac\w+|:read-\w+)/)) {
          case ":read-only":
          case ":read-write":
            return Lr([ii(t, {
              props: [ee(a, /:(read-\w+)/, ":" + uo + "$1")]
            })], i);
          case "::placeholder":
            return Lr([ii(t, {
              props: [ee(a, /:(plac\w+)/, ":" + q + "input-$1")]
            }), ii(t, {
              props: [ee(a, /:(plac\w+)/, ":" + uo + "$1")]
            }), ii(t, {
              props: [ee(a, /:(plac\w+)/, He + "input-$1")]
            })], i);
        }
        return "";
      });
  }
}, Dg = [Rg], Mg = function(t) {
  var n = t.key;
  if (n === "css") {
    var r = document.querySelectorAll("style[data-emotion]:not([data-s])");
    Array.prototype.forEach.call(r, function(x) {
      var _ = x.getAttribute("data-emotion");
      _.indexOf(" ") !== -1 && (document.head.appendChild(x), x.setAttribute("data-s", ""));
    });
  }
  var i = t.stylisPlugins || Dg, a = {}, o, s = [];
  o = t.container || document.head, Array.prototype.forEach.call(
    // this means we will ignore elements which don't have a space in them which
    // means that the style elements we're looking at are only Emotion 11 server-rendered style elements
    document.querySelectorAll('style[data-emotion^="' + n + ' "]'),
    function(x) {
      for (var _ = x.getAttribute("data-emotion").split(" "), u = 1; u < _.length; u++)
        a[_[u]] = !0;
      s.push(x);
    }
  );
  var l, c = [Lg, Ig];
  {
    var d, f = [Cg, Eg(function(x) {
      d.insert(x);
    })], m = bg(c.concat(i, f)), w = function(_) {
      return Lr(kg(_), m);
    };
    l = function(_, u, p, h) {
      d = p, w(_ ? _ + "{" + u.styles + "}" : u.styles), h && (y.inserted[u.name] = !0);
    };
  }
  var y = {
    key: n,
    sheet: new lg({
      key: n,
      container: o,
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
function wl() {
  return wl = Object.assign ? Object.assign.bind() : function(e) {
    for (var t = 1; t < arguments.length; t++) {
      var n = arguments[t];
      for (var r in n) ({}).hasOwnProperty.call(n, r) && (e[r] = n[r]);
    }
    return e;
  }, wl.apply(null, arguments);
}
var df = { exports: {} }, ie = {};
var Ne = typeof Symbol == "function" && Symbol.for, Au = Ne ? Symbol.for("react.element") : 60103, ju = Ne ? Symbol.for("react.portal") : 60106, Jo = Ne ? Symbol.for("react.fragment") : 60107, Ko = Ne ? Symbol.for("react.strict_mode") : 60108, qo = Ne ? Symbol.for("react.profiler") : 60114, es = Ne ? Symbol.for("react.provider") : 60109, ts = Ne ? Symbol.for("react.context") : 60110, Fu = Ne ? Symbol.for("react.async_mode") : 60111, ns = Ne ? Symbol.for("react.concurrent_mode") : 60111, rs = Ne ? Symbol.for("react.forward_ref") : 60112, is = Ne ? Symbol.for("react.suspense") : 60113, Og = Ne ? Symbol.for("react.suspense_list") : 60120, as = Ne ? Symbol.for("react.memo") : 60115, os = Ne ? Symbol.for("react.lazy") : 60116, Hg = Ne ? Symbol.for("react.block") : 60121, Ag = Ne ? Symbol.for("react.fundamental") : 60117, jg = Ne ? Symbol.for("react.responder") : 60118, Fg = Ne ? Symbol.for("react.scope") : 60119;
function ct(e) {
  if (typeof e == "object" && e !== null) {
    var t = e.$$typeof;
    switch (t) {
      case Au:
        switch (e = e.type, e) {
          case Fu:
          case ns:
          case Jo:
          case qo:
          case Ko:
          case is:
            return e;
          default:
            switch (e = e && e.$$typeof, e) {
              case ts:
              case rs:
              case os:
              case as:
              case es:
                return e;
              default:
                return t;
            }
        }
      case ju:
        return t;
    }
  }
}
function ff(e) {
  return ct(e) === ns;
}
ie.AsyncMode = Fu;
ie.ConcurrentMode = ns;
ie.ContextConsumer = ts;
ie.ContextProvider = es;
ie.Element = Au;
ie.ForwardRef = rs;
ie.Fragment = Jo;
ie.Lazy = os;
ie.Memo = as;
ie.Portal = ju;
ie.Profiler = qo;
ie.StrictMode = Ko;
ie.Suspense = is;
ie.isAsyncMode = function(e) {
  return ff(e) || ct(e) === Fu;
};
ie.isConcurrentMode = ff;
ie.isContextConsumer = function(e) {
  return ct(e) === ts;
};
ie.isContextProvider = function(e) {
  return ct(e) === es;
};
ie.isElement = function(e) {
  return typeof e == "object" && e !== null && e.$$typeof === Au;
};
ie.isForwardRef = function(e) {
  return ct(e) === rs;
};
ie.isFragment = function(e) {
  return ct(e) === Jo;
};
ie.isLazy = function(e) {
  return ct(e) === os;
};
ie.isMemo = function(e) {
  return ct(e) === as;
};
ie.isPortal = function(e) {
  return ct(e) === ju;
};
ie.isProfiler = function(e) {
  return ct(e) === qo;
};
ie.isStrictMode = function(e) {
  return ct(e) === Ko;
};
ie.isSuspense = function(e) {
  return ct(e) === is;
};
ie.isValidElementType = function(e) {
  return typeof e == "string" || typeof e == "function" || e === Jo || e === ns || e === qo || e === Ko || e === is || e === Og || typeof e == "object" && e !== null && (e.$$typeof === os || e.$$typeof === as || e.$$typeof === es || e.$$typeof === ts || e.$$typeof === rs || e.$$typeof === Ag || e.$$typeof === jg || e.$$typeof === Fg || e.$$typeof === Hg);
};
ie.typeOf = ct;
df.exports = ie;
var zg = df.exports, xf = zg;
var Wg = {
  $$typeof: !0,
  render: !0,
  defaultProps: !0,
  displayName: !0,
  propTypes: !0
}, Vg = {
  $$typeof: !0,
  compare: !0,
  defaultProps: !0,
  displayName: !0,
  propTypes: !0,
  type: !0
}, pf = {};
pf[xf.ForwardRef] = Wg;
pf[xf.Memo] = Vg;
var Iw = Object.prototype;
var Bg = !0;
function hf(e, t, n) {
  var r = "";
  return n.split(" ").forEach(function(i) {
    e[i] !== void 0 ? t.push(e[i] + ";") : r += i + " ";
  }), r;
}
var zu = function(t, n, r) {
  var i = t.key + "-" + n.name;
  // we only need to add the styles to the registered cache if the
  // class name could be used further down
  // the tree but if it's a string tag, we know it won't
  // so we don't have to add it to registered cache.
  // this improves memory usage since we can avoid storing the whole style string
  (r === !1 || // we need to always store it if we're in compat mode and
  // in node since emotion-server relies on whether a style is in
  // the registered cache to know whether a style is global or not
  // also, note that this check will be dead code eliminated in the browser
  Bg === !1) && t.registered[i] === void 0 && (t.registered[i] = n.styles);
}, mf = function(t, n, r) {
  zu(t, n, r);
  var i = t.key + "-" + n.name;
  if (t.inserted[n.name] === void 0) {
    var a = n;
    do
      t.insert(n === a ? "." + i : "", a, t.sheet, !0), a = a.next;
    while (a !== void 0);
  }
};
function Ug(e) {
  for (var t = 0, n, r = 0, i = e.length; i >= 4; ++r, i -= 4)
    n = e.charCodeAt(r) & 255 | (e.charCodeAt(++r) & 255) << 8 | (e.charCodeAt(++r) & 255) << 16 | (e.charCodeAt(++r) & 255) << 24, n = /* Math.imul(k, m): */
    (n & 65535) * 1540483477 + ((n >>> 16) * 59797 << 16), n ^= /* k >>> r: */
    n >>> 24, t = /* Math.imul(k, m): */
    (n & 65535) * 1540483477 + ((n >>> 16) * 59797 << 16) ^ /* Math.imul(h, m): */
    (t & 65535) * 1540483477 + ((t >>> 16) * 59797 << 16);
  switch (i) {
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
var $g = {
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
}, Zg = !1, Gg = /[A-Z]|^ms/g, Yg = /_EMO_([^_]+?)_([^]*?)_EMO_/g, vf = function(t) {
  return t.charCodeAt(1) === 45;
}, u0 = function(t) {
  return t != null && typeof t != "boolean";
}, Hs = /* @__PURE__ */ uf(function(e) {
  return vf(e) ? e : e.replace(Gg, "-$&").toLowerCase();
}), c0 = function(t, n) {
  switch (t) {
    case "animation":
    case "animationName":
      if (typeof n == "string")
        return n.replace(Yg, function(r, i, a) {
          return zt = {
            name: i,
            styles: a,
            next: zt
          }, i;
        });
  }
  return $g[t] !== 1 && !vf(t) && typeof n == "number" && n !== 0 ? n + "px" : n;
}, Xg = "Component selectors can only be used in conjunction with @emotion/babel-plugin, the swc Emotion plugin, or another Emotion-aware compiler transform.";
function Di(e, t, n) {
  if (n == null)
    return "";
  var r = n;
  if (r.__emotion_styles !== void 0)
    return r;
  switch (typeof n) {
    case "boolean":
      return "";
    case "object": {
      var i = n;
      if (i.anim === 1)
        return zt = {
          name: i.name,
          styles: i.styles,
          next: zt
        }, i.name;
      var a = n;
      if (a.styles !== void 0) {
        var o = a.next;
        if (o !== void 0)
          for (; o !== void 0; )
            zt = {
              name: o.name,
              styles: o.styles,
              next: zt
            }, o = o.next;
        var s = a.styles + ";";
        return s;
      }
      return Qg(e, t, n);
    }
    case "function": {
      if (e !== void 0) {
        var l = zt, c = n(e);
        return zt = l, Di(e, t, c);
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
function Qg(e, t, n) {
  var r = "";
  if (Array.isArray(n))
    for (var i = 0; i < n.length; i++)
      r += Di(e, t, n[i]) + ";";
  else
    for (var a in n) {
      var o = n[a];
      if (typeof o != "object") {
        var s = o;
        t != null && t[s] !== void 0 ? r += a + "{" + t[s] + "}" : u0(s) && (r += Hs(a) + ":" + c0(a, s) + ";");
      } else {
        if (a === "NO_COMPONENT_SELECTOR" && Zg)
          throw new Error(Xg);
        if (Array.isArray(o) && typeof o[0] == "string" && (t == null || t[o[0]] === void 0))
          for (var l = 0; l < o.length; l++)
            u0(o[l]) && (r += Hs(a) + ":" + c0(a, o[l]) + ";");
        else {
          var c = Di(e, t, o);
          switch (a) {
            case "animation":
            case "animationName": {
              r += Hs(a) + ":" + c + ";";
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
var d0 = /label:\s*([^\s;\n{]+)\s*(;|$)/g, zt;
function gf(e, t, n) {
  if (e.length === 1 && typeof e[0] == "object" && e[0] !== null && e[0].styles !== void 0)
    return e[0];
  var r = !0, i = "";
  zt = void 0;
  var a = e[0];
  if (a == null || a.raw === void 0)
    r = !1, i += Di(n, t, a);
  else {
    var o = a;
    i += o[0];
  }
  for (var s = 1; s < e.length; s++)
    if (i += Di(n, t, e[s]), r) {
      var l = a;
      i += l[s];
    }
  d0.lastIndex = 0;
  for (var c = "", d; (d = d0.exec(i)) !== null; )
    c += "-" + d[1];
  var f = Ug(i) + c;
  return {
    name: f,
    styles: i,
    next: zt
  };
}
var Jg = function(t) {
  return t();
}, yf = Vc.useInsertionEffect ? Vc.useInsertionEffect : !1, wf = yf || Jg, Rw = yf || ae.useLayoutEffect, Kg = !1, qg = /* @__PURE__ */ ae.createContext(
  // we're doing this to avoid preconstruct's dead code elimination in this one case
  // because this module is primarily intended for the browser and node
  // but it's also required in react native and similar environments sometimes
  // and we could have a special build just for that
  // but this is much easier and the native packages
  // might use a different theme context in the future anyway
  typeof HTMLElement < "u" ? /* @__PURE__ */ Mg({
    key: "css"
  }) : null
), _f = function(t) {
  return /* @__PURE__ */ ae.forwardRef(function(n, r) {
    var i = ae.useContext(qg);
    return t(n, i, r);
  });
}, kf = /* @__PURE__ */ ae.createContext({}), ss = {}.hasOwnProperty, _l = "__EMOTION_TYPE_PLEASE_DO_NOT_USE__", Sf = function(t, n) {
  var r = {};
  for (var i in n)
    ss.call(n, i) && (r[i] = n[i]);
  return r[_l] = t, r;
}, e2 = function(t) {
  var n = t.cache, r = t.serialized, i = t.isStringTag;
  return zu(n, r, i), wf(function() {
    return mf(n, r, i);
  }), null;
}, t2 = /* @__PURE__ */ _f(
  /* <any, any> */
  function(e, t, n) {
    var r = e.css;
    typeof r == "string" && t.registered[r] !== void 0 && (r = t.registered[r]);
    var i = e[_l], a = [r], o = "";
    typeof e.className == "string" ? o = hf(t.registered, a, e.className) : e.className != null && (o = e.className + " ");
    var s = gf(a, void 0, ae.useContext(kf));
    o += t.key + "-" + s.name;
    var l = {};
    for (var c in e)
      ss.call(e, c) && c !== "css" && c !== _l && !Kg && (l[c] = e[c]);
    return l.className = o, n && (l.ref = n), /* @__PURE__ */ ae.createElement(ae.Fragment, null, /* @__PURE__ */ ae.createElement(e2, {
      cache: t,
      serialized: s,
      isStringTag: typeof i == "string"
    }), /* @__PURE__ */ ae.createElement(i, l));
  }
), Cf = t2;
function $(e, t, n) {
  return ss.call(t, "css") ? Bt.jsx(Cf, Sf(e, t), n) : Bt.jsx(e, t, n);
}
function yn(e, t, n) {
  return ss.call(t, "css") ? Bt.jsxs(Cf, Sf(e, t), n) : Bt.jsxs(e, t, n);
}
var n2 = /^((children|dangerouslySetInnerHTML|key|ref|autoFocus|defaultValue|defaultChecked|innerHTML|suppressContentEditableWarning|suppressHydrationWarning|valueLink|abbr|accept|acceptCharset|accessKey|action|allow|allowUserMedia|allowPaymentRequest|allowFullScreen|allowTransparency|alt|async|autoComplete|autoPlay|capture|cellPadding|cellSpacing|challenge|charSet|checked|cite|classID|className|cols|colSpan|content|contentEditable|contextMenu|controls|controlsList|coords|crossOrigin|data|dateTime|decoding|default|defer|dir|disabled|disablePictureInPicture|disableRemotePlayback|download|draggable|encType|enterKeyHint|form|formAction|formEncType|formMethod|formNoValidate|formTarget|frameBorder|headers|height|hidden|high|href|hrefLang|htmlFor|httpEquiv|id|inputMode|integrity|is|keyParams|keyType|kind|label|lang|list|loading|loop|low|marginHeight|marginWidth|max|maxLength|media|mediaGroup|method|min|minLength|multiple|muted|name|nonce|noValidate|open|optimum|pattern|placeholder|playsInline|poster|preload|profile|radioGroup|readOnly|referrerPolicy|rel|required|reversed|role|rows|rowSpan|sandbox|scope|scoped|scrolling|seamless|selected|shape|size|sizes|slot|span|spellCheck|src|srcDoc|srcLang|srcSet|start|step|style|summary|tabIndex|target|title|translate|type|useMap|value|width|wmode|wrap|about|datatype|inlist|prefix|property|resource|typeof|vocab|autoCapitalize|autoCorrect|autoSave|color|incremental|fallback|inert|itemProp|itemScope|itemType|itemID|itemRef|on|option|results|security|unselectable|accentHeight|accumulate|additive|alignmentBaseline|allowReorder|alphabetic|amplitude|arabicForm|ascent|attributeName|attributeType|autoReverse|azimuth|baseFrequency|baselineShift|baseProfile|bbox|begin|bias|by|calcMode|capHeight|clip|clipPathUnits|clipPath|clipRule|colorInterpolation|colorInterpolationFilters|colorProfile|colorRendering|contentScriptType|contentStyleType|cursor|cx|cy|d|decelerate|descent|diffuseConstant|direction|display|divisor|dominantBaseline|dur|dx|dy|edgeMode|elevation|enableBackground|end|exponent|externalResourcesRequired|fill|fillOpacity|fillRule|filter|filterRes|filterUnits|floodColor|floodOpacity|focusable|fontFamily|fontSize|fontSizeAdjust|fontStretch|fontStyle|fontVariant|fontWeight|format|from|fr|fx|fy|g1|g2|glyphName|glyphOrientationHorizontal|glyphOrientationVertical|glyphRef|gradientTransform|gradientUnits|hanging|horizAdvX|horizOriginX|ideographic|imageRendering|in|in2|intercept|k|k1|k2|k3|k4|kernelMatrix|kernelUnitLength|kerning|keyPoints|keySplines|keyTimes|lengthAdjust|letterSpacing|lightingColor|limitingConeAngle|local|markerEnd|markerMid|markerStart|markerHeight|markerUnits|markerWidth|mask|maskContentUnits|maskUnits|mathematical|mode|numOctaves|offset|opacity|operator|order|orient|orientation|origin|overflow|overlinePosition|overlineThickness|panose1|paintOrder|pathLength|patternContentUnits|patternTransform|patternUnits|pointerEvents|points|pointsAtX|pointsAtY|pointsAtZ|preserveAlpha|preserveAspectRatio|primitiveUnits|r|radius|refX|refY|renderingIntent|repeatCount|repeatDur|requiredExtensions|requiredFeatures|restart|result|rotate|rx|ry|scale|seed|shapeRendering|slope|spacing|specularConstant|specularExponent|speed|spreadMethod|startOffset|stdDeviation|stemh|stemv|stitchTiles|stopColor|stopOpacity|strikethroughPosition|strikethroughThickness|string|stroke|strokeDasharray|strokeDashoffset|strokeLinecap|strokeLinejoin|strokeMiterlimit|strokeOpacity|strokeWidth|surfaceScale|systemLanguage|tableValues|targetX|targetY|textAnchor|textDecoration|textRendering|textLength|to|transform|u1|u2|underlinePosition|underlineThickness|unicode|unicodeBidi|unicodeRange|unitsPerEm|vAlphabetic|vHanging|vIdeographic|vMathematical|values|vectorEffect|version|vertAdvY|vertOriginX|vertOriginY|viewBox|viewTarget|visibility|widths|wordSpacing|writingMode|x|xHeight|x1|x2|xChannelSelector|xlinkActuate|xlinkArcrole|xlinkHref|xlinkRole|xlinkShow|xlinkTitle|xlinkType|xmlBase|xmlns|xmlnsXlink|xmlLang|xmlSpace|y|y1|y2|yChannelSelector|z|zoomAndPan|for|class|autofocus)|(([Dd][Aa][Tt][Aa]|[Aa][Rr][Ii][Aa]|x)-.*))$/, r2 = /* @__PURE__ */ uf(
  function(e) {
    return n2.test(e) || e.charCodeAt(0) === 111 && e.charCodeAt(1) === 110 && e.charCodeAt(2) < 91;
  }
  /* Z+1 */
), i2 = r2, a2 = function(t) {
  return t !== "theme";
}, f0 = function(t) {
  return typeof t == "string" && // 96 is one less than the char code
  // for "a" so this is checking that
  // it's a lowercase character
  t.charCodeAt(0) > 96 ? i2 : a2;
}, x0 = function(t, n, r) {
  var i;
  if (n) {
    var a = n.shouldForwardProp;
    i = t.__emotion_forwardProp && a ? function(o) {
      return t.__emotion_forwardProp(o) && a(o);
    } : a;
  }
  return typeof i != "function" && r && (i = t.__emotion_forwardProp), i;
}, o2 = !1, s2 = function(t) {
  var n = t.cache, r = t.serialized, i = t.isStringTag;
  return zu(n, r, i), wf(function() {
    return mf(n, r, i);
  }), null;
}, l2 = function e(t, n) {
  var r = t.__emotion_real === t, i = r && t.__emotion_base || t, a, o;
  n !== void 0 && (a = n.label, o = n.target);
  var s = x0(t, n, r), l = s || f0(i), c = !l("as");
  return function() {
    var d = arguments, f = r && t.__emotion_styles !== void 0 ? t.__emotion_styles.slice(0) : [];
    if (a !== void 0 && f.push("label:" + a + ";"), d[0] == null || d[0].raw === void 0)
      f.push.apply(f, d);
    else {
      f.push(d[0][0]);
      for (var m = d.length, w = 1; w < m; w++)
        f.push(d[w], d[0][w]);
    }
    var y = _f(function(x, _, u) {
      var p = c && x.as || i, h = "", g = [], k = x;
      if (x.theme == null) {
        k = {};
        for (var C in x)
          k[C] = x[C];
        k.theme = ae.useContext(kf);
      }
      typeof x.className == "string" ? h = hf(_.registered, g, x.className) : x.className != null && (h = x.className + " ");
      var S = gf(f.concat(g), _.registered, k);
      h += _.key + "-" + S.name, o !== void 0 && (h += " " + o);
      var L = c && s === void 0 ? f0(p) : l, M = {};
      for (var T in x)
        c && T === "as" || L(T) && (M[T] = x[T]);
      return M.className = h, u && (M.ref = u), /* @__PURE__ */ ae.createElement(ae.Fragment, null, /* @__PURE__ */ ae.createElement(s2, {
        cache: _,
        serialized: S,
        isStringTag: typeof p == "string"
      }), /* @__PURE__ */ ae.createElement(p, M));
    });
    return y.displayName = a !== void 0 ? a : "Styled(" + (typeof i == "string" ? i : i.displayName || i.name || "Component") + ")", y.defaultProps = t.defaultProps, y.__emotion_real = y, y.__emotion_base = i, y.__emotion_styles = f, y.__emotion_forwardProp = s, Object.defineProperty(y, "toString", {
      value: function() {
        return o === void 0 && o2 ? "NO_COMPONENT_SELECTOR" : "." + o;
      }
    }), y.withComponent = function(x, _) {
      return e(x, wl({}, n, _, {
        shouldForwardProp: x0(y, _, !0)
      })).apply(void 0, f);
    }, y;
  };
}, u2 = [
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
], Jn = l2.bind();
u2.forEach(function(e) {
  Jn[e] = Jn(e);
});
const c2 = "https://prosopo.io/?ref=prosopo.io&amp;utm_campaign=widget&amp;utm_medium=checkbox#features", d2 = "Visit prosopo.io to learn more about the service and its accessibility options.", f2 = 74, bf = 80, Ef = "302px", x2 = {
  maxWidth: Ef,
  minHeight: `${bf}px`
}, p2 = "8px", h2 = "2px", m2 = "1px solid", v2 = Jn.div`
  container-type: inline-size;
`, g2 = Jn.div`
  max-width: 100%;
  max-height: 100%;
  overflow: hidden;
  height: ${bf}px;
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
`, Tf = {
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
}, co = 10, Pf = {
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
    grey: Tf
  },
  spacing: {
    unit: co,
    half: Math.floor(co / 2)
  }
}, Nf = {
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
    grey: Tf
  },
  spacing: {
    unit: co,
    half: Math.floor(co / 2)
  }
}, y2 = ({ themeColor: e }) => {
  const t = ae.useMemo(() => e === "light" ? Pf : Nf, [e]), n = Jn.div`
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
  return $(n, {});
}, w2 = ({ themeColor: e }) => {
  const t = ae.useMemo(() => e === "light" ? "#1d1d1b" : "#fff", [e]);
  return yn("svg", { className: "logo", id: "logo-with-text", xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 468.67004 487.99998", height: "35px", style: { fill: t }, "aria-label": "Prosopo Logo With Text", children: [$("title", { children: "Prosopo Logo With Text" }), yn("g", { id: "g1960", transform: "translate(0,-35.903035)", children: [yn("g", { id: "g943", transform: "matrix(0.82220888,0,0,0.82220888,103.56268,35.903035)", children: [$("path", { className: "cls-1", d: "m 335.55,1825.19 a 147.75,147.75 0 0 1 147.75,147.75 h 50.5 c 0,-109.49 -88.76,-198.25 -198.25,-198.25 z", transform: "translate(-215.73,-1774.69)", id: "path8" }), $("path", { className: "cls-1", d: "m 269.36,1891.39 a 147.74,147.74 0 0 1 147.74,147.74 h 50.5 c 0,-109.49 -88.75,-198.24 -198.24,-198.24 z", transform: "translate(-215.73,-1774.69)", id: "path10" }), $("path", { className: "cls-1", d: "M 414,2157.17 A 147.75,147.75 0 0 1 266.26,2009.43 h -50.5 c 0,109.49 88.75,198.24 198.24,198.24 z", transform: "translate(-215.73,-1774.69)", id: "path12" }), $("path", { className: "cls-1", d: "M 480.17,2091 A 147.74,147.74 0 0 1 332.43,1943.25 h -50.51 c 0,109.49 88.76,198.25 198.25,198.25 z", transform: "translate(-215.73,-1774.69)", id: "path14" })] }), yn("g", { id: "g937", transform: "translate(-3.3873724,-118.52322)", children: [$("path", { className: "cls-1", d: "m 63.842242,576.50288 q -7.89541,6.5896 -22.55626,6.5896 h -18.73684 v 32.33977 H 3.8901421 v -89.9368 H 42.516842 q 13.35216,0 21.29081,6.95569 7.93866,6.95569 7.94154,21.53871 -0.009,15.92343 -7.90695,22.51303 z m -14.35529,-32.40032 q -3.56577,-2.98636 -10.00259,-2.99212 h -16.92369 v 26.48235 h 16.93522 q 6.43394,0 10.00259,-3.23426 3.56864,-3.23427 3.57153,-10.2505 0,-7.01334 -3.58306,-10.00547 z", id: "path16", style: { strokeWidth: 0.288259 } }), $("path", { className: "cls-1", d: "m 116.56193,547.36566 c 0.22484,0.0231 0.72353,0.0548 1.49607,0.0922 v 17.81729 c -1.09827,-0.12107 -2.07547,-0.20466 -2.92872,-0.24502 -0.85324,-0.0404 -1.54506,-0.0605 -2.07546,-0.0605 q -10.49263,0 -14.092978,6.83462 -2.01782,3.84249 -2.01782,11.83591 v 31.79205 h -17.50885 v -66.51 h 16.59796 v 11.58225 q 4.035618,-6.65013 7.016218,-9.09169 4.88311,-4.08751 12.6834,-4.08751 c 0.34302,0.0115 0.60822,0.0202 0.83018,0.0404 z", id: "path18", style: { strokeWidth: 0.288259 } }), $("path", { className: "cls-1", d: "m 179.9645,607.2947 q -8.42005,10.39462 -25.56569,10.39462 -17.14565,0 -25.56569,-10.39462 -8.43446,-10.39462 -8.43446,-25.02664 0,-14.38413 8.42293,-24.93441 8.42292,-10.55028 25.56569,-10.54739 17.14276,0 25.56569,10.54739 8.42292,10.5474 8.42004,24.93441 0.0115,14.63202 -8.40851,25.02664 z m -13.91138,-9.60479 q 4.08463,-5.42215 4.08751,-15.41609 0.003,-9.99394 -4.08751,-15.38438 -4.0904,-5.39044 -11.71485,-5.39332 -7.62445,-0.003 -11.74367,5.38756 -4.11922,5.3962 -4.11922,15.38438 0,9.98817 4.11922,15.42185 4.11634,5.42216 11.74655,5.42216 7.63022,0 11.71197,-5.42216 z", id: "path20", style: { strokeWidth: 0.288259 } }), $("path", { className: "cls-1", d: "m 210.56895,594.19621 q 0.55346,4.64097 2.38967,6.59249 3.25156,3.4764 12.0204,3.4764 5.14542,0 8.18367,-1.52489 3.03825,-1.52489 3.03537,-4.57755 a 4.9349939,4.9349939 0 0 0 -2.44444,-4.4536 q -2.44732,-1.52201 -18.1949,-5.24632 -11.33723,-2.80476 -15.97243,-7.0191 -4.63521,-4.14805 -4.63809,-11.95987 0,-9.22429 7.24683,-15.83407 7.24683,-6.60978 20.39432,-6.62995 12.47009,0 20.33091,4.97246 7.86082,4.97247 9.01962,17.17736 h -17.39066 q -0.36609,-3.35534 -1.89675,-5.30973 -2.88259,-3.53694 -9.8008,-3.53982 -5.69023,0 -8.10873,1.76991 -2.41849,1.76991 -2.41561,4.15093 c 0,1.99187 0.86478,3.43893 2.57127,4.32388 q 2.56263,1.40959 18.16032,4.82258 10.37732,2.43867 15.5804,7.38231 5.12236,5.00129 5.12524,12.50756 0,9.88728 -7.3679,16.1425 -7.3679,6.25522 -22.77246,6.25522 -15.71299,0 -23.20196,-6.62996 -7.48897,-6.62995 -7.49474,-16.8718 z", id: "path22", style: { strokeWidth: 0.288259 } }), $("path", { className: "cls-1", d: "m 318.29999,607.2947 q -8.42293,10.39462 -25.56858,10.39462 -17.14564,0 -25.56569,-10.39462 -8.41716,-10.39462 -8.42004,-25.02664 0,-14.38413 8.42004,-24.93441 8.42005,-10.55028 25.56569,-10.54739 17.14853,0 25.56858,10.54739 8.42004,10.5474 8.42004,24.93441 0,14.63202 -8.42004,25.02664 z m -13.91427,-9.60479 q 4.0904,-5.42215 4.0904,-15.41609 0,-9.99394 -4.0904,-15.38438 -4.08751,-5.39044 -11.71484,-5.39332 -7.62733,-0.003 -11.74656,5.39332 -4.11633,5.39621 -4.11633,15.38438 0,9.98818 4.11633,15.41609 4.12211,5.42216 11.74656,5.42216 7.62445,0 11.71484,-5.42216 z", id: "path24", style: { strokeWidth: 0.288259 } }), $("path", { className: "cls-1", d: "m 389.56049,556.06243 q 8.14043,8.60165 8.13755,25.26014 0,17.5838 -7.95018,26.78791 -7.95018,9.20411 -20.48369,9.22428 -7.98189,0 -13.25991,-3.96644 -2.88259,-2.19653 -5.64988,-6.408 v 34.66026 h -17.22059 v -92.69833 h 16.65849 v 9.82387 q 2.82206,-4.32388 6.01885,-6.83462 5.83148,-4.44784 13.87967,-4.4536 11.73502,0 19.86969,8.60453 z m -13.34639,12.50756 q -3.54559,-5.91507 -11.49577,-5.91796 -9.55579,0 -13.12731,8.96774 -1.85351,4.75916 -1.85063,12.08382 0,11.59089 6.22063,16.28951 3.69548,2.74711 8.75443,2.74711 7.33619,0 11.19309,-5.61528 3.85691,-5.61529 3.85114,-14.94911 0,-7.68787 -3.54558,-13.60006 z", id: "path26", style: { strokeWidth: 0.288259 } }), $("path", { className: "cls-1", d: "m 463.46721,607.2947 q -8.41716,10.39462 -25.56569,10.39462 -17.14852,0 -25.56569,-10.39462 -8.42292,-10.39462 -8.42004,-25.02664 0,-14.38413 8.42004,-24.93441 8.42005,-10.55028 25.56569,-10.54739 17.14853,0 25.56569,10.54739 8.41716,10.5474 8.42293,24.93441 0,14.63202 -8.42293,25.02664 z m -13.91138,-9.60479 q 4.0904,-5.42215 4.08752,-15.41609 -0.003,-9.99394 -4.08752,-15.38438 -4.08751,-5.39044 -11.71484,-5.39332 -7.62733,-0.003 -11.74656,5.39332 -4.11633,5.39621 -4.11922,15.38438 -0.003,9.98818 4.11922,15.41609 4.12211,5.42216 11.74656,5.42216 7.62445,0 11.71484,-5.42216 z", id: "path28", style: { strokeWidth: 0.288259 } })] })] })] });
}, _2 = ({ themeColor: e }) => {
  const t = ae.useMemo(() => e === "light" ? "#1d1d1b" : "#fff", [e]);
  return yn("svg", { className: "logo", id: "logo-without-text", xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 260 348", height: "35px", style: { fill: t }, "aria-label": "Prosopo Logo Without Text", children: [$("title", { children: "Prosopo Logo Without Text" }), $("path", { d: "M95.7053 40.2707C127.005 40.2707 157.022 52.6841 179.154 74.78C201.286 96.8759 213.719 126.844 213.719 158.093H254.056C254.056 70.7808 183.16 -4.57764e-05 95.7053 -4.57764e-05V40.2707Z" }), $("path", { d: "M42.8365 93.0614C58.3333 93.0614 73.6784 96.1087 87.9955 102.029C102.313 107.95 115.322 116.628 126.279 127.568C137.237 138.508 145.93 151.496 151.86 165.79C157.79 180.084 160.843 195.404 160.843 210.875H201.179C201.179 123.564 130.291 52.7906 42.8365 52.7906V93.0614Z" }), $("path", { d: "M158.367 305.005C127.07 305.003 97.056 292.59 74.926 270.496C52.796 248.402 40.3626 218.437 40.3604 187.191H0.0239563C0.0239563 274.503 70.9123 345.276 158.367 345.276V305.005Z" }), $("path", { d: "M211.219 252.239C195.722 252.239 180.376 249.191 166.059 243.27C151.741 237.349 138.732 228.67 127.774 217.729C116.816 206.788 108.123 193.799 102.194 179.505C96.2637 165.21 93.2121 149.889 93.2132 134.417H52.8687C52.8687 221.729 123.765 292.509 211.219 292.509V252.239Z" })] });
}, k2 = Jn.div`
  padding: 4px;
  flex: 1 1 0;
`, S2 = Jn.div`
  padding: 4px;
`, C2 = ({ themeColor: e }) => $(k2, { children: yn(S2, { children: [$(_2, { themeColor: e }), $(w2, { themeColor: e })] }) }), Wu = (e) => {
  const t = e.darkMode === "light" ? "light" : "dark", n = e.darkMode === "light" ? Pf : Nf;
  return $("div", { children: $("div", { style: {
    maxWidth: Ef,
    maxHeight: "100%",
    overflowX: "auto"
  }, children: $(v2, { children: $(g2, { children: yn("div", { style: x2, "data-cy": "button-human", children: [" ", yn("div", { style: {
    padding: h2,
    border: m2,
    backgroundColor: n.palette.background.default,
    borderColor: n.palette.grey[300],
    borderRadius: p2,
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    justifyContent: "space-between",
    minHeight: `${f2}px`,
    overflow: "hidden"
  }, children: [$("div", { style: { display: "flex", flexDirection: "column" }, children: $("div", { style: {
    alignItems: "center",
    flex: 1
  }, children: $("div", { style: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
    verticalAlign: "middle"
  }, children: $("div", { style: {
    display: "flex"
  }, children: $("div", { style: { display: "inline-flex" }, children: $(y2, { themeColor: t, "aria-label": "Loading spinner" }) }) }) }) }) }), $("div", { style: { display: "inline-flex", flexDirection: "column" }, children: $("a", { href: c2, target: "_blank", "aria-label": d2, rel: "noreferrer", children: $("div", { style: { flex: 1 }, children: $(C2, { themeColor: t, "aria-label": "Prosopo logo" }) }) }) })] })] }) }) }) }) });
}, fo = new Array(256), Lf = new Array(256 * 256);
for (let e = 0; e < 256; e++)
  fo[e] = e.toString(16).padStart(2, "0");
for (let e = 0; e < 256; e++) {
  const t = e << 8;
  for (let n = 0; n < 256; n++)
    Lf[t | n] = fo[e] + fo[n];
}
function As(e, t) {
  const n = e.length % 2 | 0, r = e.length - n | 0;
  for (let i = 0; i < r; i += 2)
    t += Lf[e[i] << 8 | e[i + 1]];
  return n && (t += fo[e[r] | 0]), t;
}
function b2(e, t = -1, n = !0) {
  const r = n ? "0x" : "";
  if (e != null && e.length) {
    if (t > 0) {
      const i = Math.ceil(t / 8);
      if (e.length > i)
        return `${As(e.subarray(0, i / 2), r)}…${As(e.subarray(e.length - i / 2), "")}`;
    }
  } else return r;
  return As(e, r);
}
var Q;
(function(e) {
  e.assertEqual = (i) => i;
  function t(i) {
  }
  e.assertIs = t;
  function n(i) {
    throw new Error();
  }
  e.assertNever = n, e.arrayToEnum = (i) => {
    const a = {};
    for (const o of i)
      a[o] = o;
    return a;
  }, e.getValidEnumValues = (i) => {
    const a = e.objectKeys(i).filter((s) => typeof i[i[s]] != "number"), o = {};
    for (const s of a)
      o[s] = i[s];
    return e.objectValues(o);
  }, e.objectValues = (i) => e.objectKeys(i).map(function(a) {
    return i[a];
  }), e.objectKeys = typeof Object.keys == "function" ? (i) => Object.keys(i) : (i) => {
    const a = [];
    for (const o in i)
      Object.prototype.hasOwnProperty.call(i, o) && a.push(o);
    return a;
  }, e.find = (i, a) => {
    for (const o of i)
      if (a(o))
        return o;
  }, e.isInteger = typeof Number.isInteger == "function" ? (i) => Number.isInteger(i) : (i) => typeof i == "number" && isFinite(i) && Math.floor(i) === i;
  function r(i, a = " | ") {
    return i.map((o) => typeof o == "string" ? `'${o}'` : o).join(a);
  }
  e.joinValues = r, e.jsonStringifyReplacer = (i, a) => typeof a == "bigint" ? a.toString() : a;
})(Q || (Q = {}));
var kl;
(function(e) {
  e.mergeShapes = (t, n) => ({
    ...t,
    ...n
    // second overwrites first
  });
})(kl || (kl = {}));
const N = Q.arrayToEnum([
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
]), mn = (e) => {
  switch (typeof e) {
    case "undefined":
      return N.undefined;
    case "string":
      return N.string;
    case "number":
      return isNaN(e) ? N.nan : N.number;
    case "boolean":
      return N.boolean;
    case "function":
      return N.function;
    case "bigint":
      return N.bigint;
    case "symbol":
      return N.symbol;
    case "object":
      return Array.isArray(e) ? N.array : e === null ? N.null : e.then && typeof e.then == "function" && e.catch && typeof e.catch == "function" ? N.promise : typeof Map < "u" && e instanceof Map ? N.map : typeof Set < "u" && e instanceof Set ? N.set : typeof Date < "u" && e instanceof Date ? N.date : N.object;
    default:
      return N.unknown;
  }
}, E = Q.arrayToEnum([
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
]), E2 = (e) => JSON.stringify(e, null, 2).replace(/"([^"]+)":/g, "$1:");
class st extends Error {
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
    }, r = { _errors: [] }, i = (a) => {
      for (const o of a.issues)
        if (o.code === "invalid_union")
          o.unionErrors.map(i);
        else if (o.code === "invalid_return_type")
          i(o.returnTypeError);
        else if (o.code === "invalid_arguments")
          i(o.argumentsError);
        else if (o.path.length === 0)
          r._errors.push(n(o));
        else {
          let s = r, l = 0;
          for (; l < o.path.length; ) {
            const c = o.path[l];
            l === o.path.length - 1 ? (s[c] = s[c] || { _errors: [] }, s[c]._errors.push(n(o))) : s[c] = s[c] || { _errors: [] }, s = s[c], l++;
          }
        }
    };
    return i(this), r;
  }
  static assert(t) {
    if (!(t instanceof st))
      throw new Error(`Not a ZodError: ${t}`);
  }
  toString() {
    return this.message;
  }
  get message() {
    return JSON.stringify(this.issues, Q.jsonStringifyReplacer, 2);
  }
  get isEmpty() {
    return this.issues.length === 0;
  }
  flatten(t = (n) => n.message) {
    const n = {}, r = [];
    for (const i of this.issues)
      i.path.length > 0 ? (n[i.path[0]] = n[i.path[0]] || [], n[i.path[0]].push(t(i))) : r.push(t(i));
    return { formErrors: r, fieldErrors: n };
  }
  get formErrors() {
    return this.flatten();
  }
}
st.create = (e) => new st(e);
const Fr = (e, t) => {
  let n;
  switch (e.code) {
    case E.invalid_type:
      e.received === N.undefined ? n = "Required" : n = `Expected ${e.expected}, received ${e.received}`;
      break;
    case E.invalid_literal:
      n = `Invalid literal value, expected ${JSON.stringify(e.expected, Q.jsonStringifyReplacer)}`;
      break;
    case E.unrecognized_keys:
      n = `Unrecognized key(s) in object: ${Q.joinValues(e.keys, ", ")}`;
      break;
    case E.invalid_union:
      n = "Invalid input";
      break;
    case E.invalid_union_discriminator:
      n = `Invalid discriminator value. Expected ${Q.joinValues(e.options)}`;
      break;
    case E.invalid_enum_value:
      n = `Invalid enum value. Expected ${Q.joinValues(e.options)}, received '${e.received}'`;
      break;
    case E.invalid_arguments:
      n = "Invalid function arguments";
      break;
    case E.invalid_return_type:
      n = "Invalid function return type";
      break;
    case E.invalid_date:
      n = "Invalid date";
      break;
    case E.invalid_string:
      typeof e.validation == "object" ? "includes" in e.validation ? (n = `Invalid input: must include "${e.validation.includes}"`, typeof e.validation.position == "number" && (n = `${n} at one or more positions greater than or equal to ${e.validation.position}`)) : "startsWith" in e.validation ? n = `Invalid input: must start with "${e.validation.startsWith}"` : "endsWith" in e.validation ? n = `Invalid input: must end with "${e.validation.endsWith}"` : Q.assertNever(e.validation) : e.validation !== "regex" ? n = `Invalid ${e.validation}` : n = "Invalid";
      break;
    case E.too_small:
      e.type === "array" ? n = `Array must contain ${e.exact ? "exactly" : e.inclusive ? "at least" : "more than"} ${e.minimum} element(s)` : e.type === "string" ? n = `String must contain ${e.exact ? "exactly" : e.inclusive ? "at least" : "over"} ${e.minimum} character(s)` : e.type === "number" ? n = `Number must be ${e.exact ? "exactly equal to " : e.inclusive ? "greater than or equal to " : "greater than "}${e.minimum}` : e.type === "date" ? n = `Date must be ${e.exact ? "exactly equal to " : e.inclusive ? "greater than or equal to " : "greater than "}${new Date(Number(e.minimum))}` : n = "Invalid input";
      break;
    case E.too_big:
      e.type === "array" ? n = `Array must contain ${e.exact ? "exactly" : e.inclusive ? "at most" : "less than"} ${e.maximum} element(s)` : e.type === "string" ? n = `String must contain ${e.exact ? "exactly" : e.inclusive ? "at most" : "under"} ${e.maximum} character(s)` : e.type === "number" ? n = `Number must be ${e.exact ? "exactly" : e.inclusive ? "less than or equal to" : "less than"} ${e.maximum}` : e.type === "bigint" ? n = `BigInt must be ${e.exact ? "exactly" : e.inclusive ? "less than or equal to" : "less than"} ${e.maximum}` : e.type === "date" ? n = `Date must be ${e.exact ? "exactly" : e.inclusive ? "smaller than or equal to" : "smaller than"} ${new Date(Number(e.maximum))}` : n = "Invalid input";
      break;
    case E.custom:
      n = "Invalid input";
      break;
    case E.invalid_intersection_types:
      n = "Intersection results could not be merged";
      break;
    case E.not_multiple_of:
      n = `Number must be a multiple of ${e.multipleOf}`;
      break;
    case E.not_finite:
      n = "Number must be finite";
      break;
    default:
      n = t.defaultError, Q.assertNever(e);
  }
  return { message: n };
};
let If = Fr;
function T2(e) {
  If = e;
}
function xo() {
  return If;
}
const po = (e) => {
  const { data: t, path: n, errorMaps: r, issueData: i } = e, a = [...n, ...i.path || []], o = {
    ...i,
    path: a
  };
  if (i.message !== void 0)
    return {
      ...i,
      path: a,
      message: i.message
    };
  let s = "";
  const l = r.filter((c) => !!c).slice().reverse();
  for (const c of l)
    s = c(o, { data: t, defaultError: s }).message;
  return {
    ...i,
    path: a,
    message: s
  };
}, P2 = [];
function P(e, t) {
  const n = xo(), r = po({
    issueData: t,
    data: e.data,
    path: e.path,
    errorMaps: [
      e.common.contextualErrorMap,
      e.schemaErrorMap,
      n,
      n === Fr ? void 0 : Fr
      // then global default map
    ].filter((i) => !!i)
  });
  e.common.issues.push(r);
}
class Fe {
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
    for (const i of n) {
      if (i.status === "aborted")
        return F;
      i.status === "dirty" && t.dirty(), r.push(i.value);
    }
    return { status: t.value, value: r };
  }
  static async mergeObjectAsync(t, n) {
    const r = [];
    for (const i of n) {
      const a = await i.key, o = await i.value;
      r.push({
        key: a,
        value: o
      });
    }
    return Fe.mergeObjectSync(t, r);
  }
  static mergeObjectSync(t, n) {
    const r = {};
    for (const i of n) {
      const { key: a, value: o } = i;
      if (a.status === "aborted" || o.status === "aborted")
        return F;
      a.status === "dirty" && t.dirty(), o.status === "dirty" && t.dirty(), a.value !== "__proto__" && (typeof o.value < "u" || i.alwaysSet) && (r[a.value] = o.value);
    }
    return { status: t.value, value: r };
  }
}
const F = Object.freeze({
  status: "aborted"
}), hr = (e) => ({ status: "dirty", value: e }), Ue = (e) => ({ status: "valid", value: e }), Sl = (e) => e.status === "aborted", Cl = (e) => e.status === "dirty", Mi = (e) => e.status === "valid", Oi = (e) => typeof Promise < "u" && e instanceof Promise;
function ho(e, t, n, r) {
  if (typeof t == "function" ? e !== t || !r : !t.has(e)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
  return t.get(e);
}
function Rf(e, t, n, r, i) {
  if (typeof t == "function" ? e !== t || !i : !t.has(e)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
  return t.set(e, n), n;
}
var H;
(function(e) {
  e.errToObj = (t) => typeof t == "string" ? { message: t } : t || {}, e.toString = (t) => typeof t == "string" ? t : t == null ? void 0 : t.message;
})(H || (H = {}));
var xi, pi;
class Yt {
  constructor(t, n, r, i) {
    this._cachedPath = [], this.parent = t, this.data = n, this._path = r, this._key = i;
  }
  get path() {
    return this._cachedPath.length || (this._key instanceof Array ? this._cachedPath.push(...this._path, ...this._key) : this._cachedPath.push(...this._path, this._key)), this._cachedPath;
  }
}
const p0 = (e, t) => {
  if (Mi(t))
    return { success: !0, data: t.value };
  if (!e.common.issues.length)
    throw new Error("Validation failed but no issues detected.");
  return {
    success: !1,
    get error() {
      if (this._error)
        return this._error;
      const n = new st(e.common.issues);
      return this._error = n, this._error;
    }
  };
};
function B(e) {
  if (!e)
    return {};
  const { errorMap: t, invalid_type_error: n, required_error: r, description: i } = e;
  if (t && (n || r))
    throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
  return t ? { errorMap: t, description: i } : { errorMap: (o, s) => {
    var l, c;
    const { message: d } = e;
    return o.code === "invalid_enum_value" ? { message: d ?? s.defaultError } : typeof s.data > "u" ? { message: (l = d ?? r) !== null && l !== void 0 ? l : s.defaultError } : o.code !== "invalid_type" ? { message: s.defaultError } : { message: (c = d ?? n) !== null && c !== void 0 ? c : s.defaultError };
  }, description: i };
}
class G {
  constructor(t) {
    this.spa = this.safeParseAsync, this._def = t, this.parse = this.parse.bind(this), this.safeParse = this.safeParse.bind(this), this.parseAsync = this.parseAsync.bind(this), this.safeParseAsync = this.safeParseAsync.bind(this), this.spa = this.spa.bind(this), this.refine = this.refine.bind(this), this.refinement = this.refinement.bind(this), this.superRefine = this.superRefine.bind(this), this.optional = this.optional.bind(this), this.nullable = this.nullable.bind(this), this.nullish = this.nullish.bind(this), this.array = this.array.bind(this), this.promise = this.promise.bind(this), this.or = this.or.bind(this), this.and = this.and.bind(this), this.transform = this.transform.bind(this), this.brand = this.brand.bind(this), this.default = this.default.bind(this), this.catch = this.catch.bind(this), this.describe = this.describe.bind(this), this.pipe = this.pipe.bind(this), this.readonly = this.readonly.bind(this), this.isNullable = this.isNullable.bind(this), this.isOptional = this.isOptional.bind(this);
  }
  get description() {
    return this._def.description;
  }
  _getType(t) {
    return mn(t.data);
  }
  _getOrReturnCtx(t, n) {
    return n || {
      common: t.parent.common,
      data: t.data,
      parsedType: mn(t.data),
      schemaErrorMap: this._def.errorMap,
      path: t.path,
      parent: t.parent
    };
  }
  _processInputParams(t) {
    return {
      status: new Fe(),
      ctx: {
        common: t.parent.common,
        data: t.data,
        parsedType: mn(t.data),
        schemaErrorMap: this._def.errorMap,
        path: t.path,
        parent: t.parent
      }
    };
  }
  _parseSync(t) {
    const n = this._parse(t);
    if (Oi(n))
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
    const i = {
      common: {
        issues: [],
        async: (r = n == null ? void 0 : n.async) !== null && r !== void 0 ? r : !1,
        contextualErrorMap: n == null ? void 0 : n.errorMap
      },
      path: (n == null ? void 0 : n.path) || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data: t,
      parsedType: mn(t)
    }, a = this._parseSync({ data: t, path: i.path, parent: i });
    return p0(i, a);
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
      parsedType: mn(t)
    }, i = this._parse({ data: t, path: r.path, parent: r }), a = await (Oi(i) ? i : Promise.resolve(i));
    return p0(r, a);
  }
  refine(t, n) {
    const r = (i) => typeof n == "string" || typeof n > "u" ? { message: n } : typeof n == "function" ? n(i) : n;
    return this._refinement((i, a) => {
      const o = t(i), s = () => a.addIssue({
        code: E.custom,
        ...r(i)
      });
      return typeof Promise < "u" && o instanceof Promise ? o.then((l) => l ? !0 : (s(), !1)) : o ? !0 : (s(), !1);
    });
  }
  refinement(t, n) {
    return this._refinement((r, i) => t(r) ? !0 : (i.addIssue(typeof n == "function" ? n(r, i) : n), !1));
  }
  _refinement(t) {
    return new Rt({
      schema: this,
      typeName: j.ZodEffects,
      effect: { type: "refinement", refinement: t }
    });
  }
  superRefine(t) {
    return this._refinement(t);
  }
  optional() {
    return $t.create(this, this._def);
  }
  nullable() {
    return Dn.create(this, this._def);
  }
  nullish() {
    return this.nullable().optional();
  }
  array() {
    return Nt.create(this, this._def);
  }
  promise() {
    return Wr.create(this, this._def);
  }
  or(t) {
    return Fi.create([this, t], this._def);
  }
  and(t) {
    return zi.create(this, t, this._def);
  }
  transform(t) {
    return new Rt({
      ...B(this._def),
      schema: this,
      typeName: j.ZodEffects,
      effect: { type: "transform", transform: t }
    });
  }
  default(t) {
    const n = typeof t == "function" ? t : () => t;
    return new $i({
      ...B(this._def),
      innerType: this,
      defaultValue: n,
      typeName: j.ZodDefault
    });
  }
  brand() {
    return new Vu({
      typeName: j.ZodBranded,
      type: this,
      ...B(this._def)
    });
  }
  catch(t) {
    const n = typeof t == "function" ? t : () => t;
    return new Zi({
      ...B(this._def),
      innerType: this,
      catchValue: n,
      typeName: j.ZodCatch
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
    return ha.create(this, t);
  }
  readonly() {
    return Gi.create(this);
  }
  isOptional() {
    return this.safeParse(void 0).success;
  }
  isNullable() {
    return this.safeParse(null).success;
  }
}
const N2 = /^c[^\s-]{8,}$/i, L2 = /^[0-9a-z]+$/, I2 = /^[0-9A-HJKMNP-TV-Z]{26}$/, R2 = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i, D2 = /^[a-z0-9_-]{21}$/i, M2 = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/, O2 = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i, H2 = "^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$";
let js;
const A2 = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/, j2 = /^(([a-f0-9]{1,4}:){7}|::([a-f0-9]{1,4}:){0,6}|([a-f0-9]{1,4}:){1}:([a-f0-9]{1,4}:){0,5}|([a-f0-9]{1,4}:){2}:([a-f0-9]{1,4}:){0,4}|([a-f0-9]{1,4}:){3}:([a-f0-9]{1,4}:){0,3}|([a-f0-9]{1,4}:){4}:([a-f0-9]{1,4}:){0,2}|([a-f0-9]{1,4}:){5}:([a-f0-9]{1,4}:){0,1})([a-f0-9]{1,4}|(((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2}))\.){3}((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2})))$/, F2 = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/, Df = "((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))", z2 = new RegExp(`^${Df}$`);
function Mf(e) {
  let t = "([01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d";
  return e.precision ? t = `${t}\\.\\d{${e.precision}}` : e.precision == null && (t = `${t}(\\.\\d+)?`), t;
}
function W2(e) {
  return new RegExp(`^${Mf(e)}$`);
}
function Of(e) {
  let t = `${Df}T${Mf(e)}`;
  const n = [];
  return n.push(e.local ? "Z?" : "Z"), e.offset && n.push("([+-]\\d{2}:?\\d{2})"), t = `${t}(${n.join("|")})`, new RegExp(`^${t}$`);
}
function V2(e, t) {
  return !!((t === "v4" || !t) && A2.test(e) || (t === "v6" || !t) && j2.test(e));
}
class Pt extends G {
  _parse(t) {
    if (this._def.coerce && (t.data = String(t.data)), this._getType(t) !== N.string) {
      const a = this._getOrReturnCtx(t);
      return P(a, {
        code: E.invalid_type,
        expected: N.string,
        received: a.parsedType
      }), F;
    }
    const r = new Fe();
    let i;
    for (const a of this._def.checks)
      if (a.kind === "min")
        t.data.length < a.value && (i = this._getOrReturnCtx(t, i), P(i, {
          code: E.too_small,
          minimum: a.value,
          type: "string",
          inclusive: !0,
          exact: !1,
          message: a.message
        }), r.dirty());
      else if (a.kind === "max")
        t.data.length > a.value && (i = this._getOrReturnCtx(t, i), P(i, {
          code: E.too_big,
          maximum: a.value,
          type: "string",
          inclusive: !0,
          exact: !1,
          message: a.message
        }), r.dirty());
      else if (a.kind === "length") {
        const o = t.data.length > a.value, s = t.data.length < a.value;
        (o || s) && (i = this._getOrReturnCtx(t, i), o ? P(i, {
          code: E.too_big,
          maximum: a.value,
          type: "string",
          inclusive: !0,
          exact: !0,
          message: a.message
        }) : s && P(i, {
          code: E.too_small,
          minimum: a.value,
          type: "string",
          inclusive: !0,
          exact: !0,
          message: a.message
        }), r.dirty());
      } else if (a.kind === "email")
        O2.test(t.data) || (i = this._getOrReturnCtx(t, i), P(i, {
          validation: "email",
          code: E.invalid_string,
          message: a.message
        }), r.dirty());
      else if (a.kind === "emoji")
        js || (js = new RegExp(H2, "u")), js.test(t.data) || (i = this._getOrReturnCtx(t, i), P(i, {
          validation: "emoji",
          code: E.invalid_string,
          message: a.message
        }), r.dirty());
      else if (a.kind === "uuid")
        R2.test(t.data) || (i = this._getOrReturnCtx(t, i), P(i, {
          validation: "uuid",
          code: E.invalid_string,
          message: a.message
        }), r.dirty());
      else if (a.kind === "nanoid")
        D2.test(t.data) || (i = this._getOrReturnCtx(t, i), P(i, {
          validation: "nanoid",
          code: E.invalid_string,
          message: a.message
        }), r.dirty());
      else if (a.kind === "cuid")
        N2.test(t.data) || (i = this._getOrReturnCtx(t, i), P(i, {
          validation: "cuid",
          code: E.invalid_string,
          message: a.message
        }), r.dirty());
      else if (a.kind === "cuid2")
        L2.test(t.data) || (i = this._getOrReturnCtx(t, i), P(i, {
          validation: "cuid2",
          code: E.invalid_string,
          message: a.message
        }), r.dirty());
      else if (a.kind === "ulid")
        I2.test(t.data) || (i = this._getOrReturnCtx(t, i), P(i, {
          validation: "ulid",
          code: E.invalid_string,
          message: a.message
        }), r.dirty());
      else if (a.kind === "url")
        try {
          new URL(t.data);
        } catch {
          i = this._getOrReturnCtx(t, i), P(i, {
            validation: "url",
            code: E.invalid_string,
            message: a.message
          }), r.dirty();
        }
      else a.kind === "regex" ? (a.regex.lastIndex = 0, a.regex.test(t.data) || (i = this._getOrReturnCtx(t, i), P(i, {
        validation: "regex",
        code: E.invalid_string,
        message: a.message
      }), r.dirty())) : a.kind === "trim" ? t.data = t.data.trim() : a.kind === "includes" ? t.data.includes(a.value, a.position) || (i = this._getOrReturnCtx(t, i), P(i, {
        code: E.invalid_string,
        validation: { includes: a.value, position: a.position },
        message: a.message
      }), r.dirty()) : a.kind === "toLowerCase" ? t.data = t.data.toLowerCase() : a.kind === "toUpperCase" ? t.data = t.data.toUpperCase() : a.kind === "startsWith" ? t.data.startsWith(a.value) || (i = this._getOrReturnCtx(t, i), P(i, {
        code: E.invalid_string,
        validation: { startsWith: a.value },
        message: a.message
      }), r.dirty()) : a.kind === "endsWith" ? t.data.endsWith(a.value) || (i = this._getOrReturnCtx(t, i), P(i, {
        code: E.invalid_string,
        validation: { endsWith: a.value },
        message: a.message
      }), r.dirty()) : a.kind === "datetime" ? Of(a).test(t.data) || (i = this._getOrReturnCtx(t, i), P(i, {
        code: E.invalid_string,
        validation: "datetime",
        message: a.message
      }), r.dirty()) : a.kind === "date" ? z2.test(t.data) || (i = this._getOrReturnCtx(t, i), P(i, {
        code: E.invalid_string,
        validation: "date",
        message: a.message
      }), r.dirty()) : a.kind === "time" ? W2(a).test(t.data) || (i = this._getOrReturnCtx(t, i), P(i, {
        code: E.invalid_string,
        validation: "time",
        message: a.message
      }), r.dirty()) : a.kind === "duration" ? M2.test(t.data) || (i = this._getOrReturnCtx(t, i), P(i, {
        validation: "duration",
        code: E.invalid_string,
        message: a.message
      }), r.dirty()) : a.kind === "ip" ? V2(t.data, a.version) || (i = this._getOrReturnCtx(t, i), P(i, {
        validation: "ip",
        code: E.invalid_string,
        message: a.message
      }), r.dirty()) : a.kind === "base64" ? F2.test(t.data) || (i = this._getOrReturnCtx(t, i), P(i, {
        validation: "base64",
        code: E.invalid_string,
        message: a.message
      }), r.dirty()) : Q.assertNever(a);
    return { status: r.value, value: t.data };
  }
  _regex(t, n, r) {
    return this.refinement((i) => t.test(i), {
      validation: n,
      code: E.invalid_string,
      ...H.errToObj(r)
    });
  }
  _addCheck(t) {
    return new Pt({
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
    return new Pt({
      ...this._def,
      checks: [...this._def.checks, { kind: "trim" }]
    });
  }
  toLowerCase() {
    return new Pt({
      ...this._def,
      checks: [...this._def.checks, { kind: "toLowerCase" }]
    });
  }
  toUpperCase() {
    return new Pt({
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
Pt.create = (e) => {
  var t;
  return new Pt({
    checks: [],
    typeName: j.ZodString,
    coerce: (t = e == null ? void 0 : e.coerce) !== null && t !== void 0 ? t : !1,
    ...B(e)
  });
};
function B2(e, t) {
  const n = (e.toString().split(".")[1] || "").length, r = (t.toString().split(".")[1] || "").length, i = n > r ? n : r, a = parseInt(e.toFixed(i).replace(".", "")), o = parseInt(t.toFixed(i).replace(".", ""));
  return a % o / Math.pow(10, i);
}
class Ln extends G {
  constructor() {
    super(...arguments), this.min = this.gte, this.max = this.lte, this.step = this.multipleOf;
  }
  _parse(t) {
    if (this._def.coerce && (t.data = Number(t.data)), this._getType(t) !== N.number) {
      const a = this._getOrReturnCtx(t);
      return P(a, {
        code: E.invalid_type,
        expected: N.number,
        received: a.parsedType
      }), F;
    }
    let r;
    const i = new Fe();
    for (const a of this._def.checks)
      a.kind === "int" ? Q.isInteger(t.data) || (r = this._getOrReturnCtx(t, r), P(r, {
        code: E.invalid_type,
        expected: "integer",
        received: "float",
        message: a.message
      }), i.dirty()) : a.kind === "min" ? (a.inclusive ? t.data < a.value : t.data <= a.value) && (r = this._getOrReturnCtx(t, r), P(r, {
        code: E.too_small,
        minimum: a.value,
        type: "number",
        inclusive: a.inclusive,
        exact: !1,
        message: a.message
      }), i.dirty()) : a.kind === "max" ? (a.inclusive ? t.data > a.value : t.data >= a.value) && (r = this._getOrReturnCtx(t, r), P(r, {
        code: E.too_big,
        maximum: a.value,
        type: "number",
        inclusive: a.inclusive,
        exact: !1,
        message: a.message
      }), i.dirty()) : a.kind === "multipleOf" ? B2(t.data, a.value) !== 0 && (r = this._getOrReturnCtx(t, r), P(r, {
        code: E.not_multiple_of,
        multipleOf: a.value,
        message: a.message
      }), i.dirty()) : a.kind === "finite" ? Number.isFinite(t.data) || (r = this._getOrReturnCtx(t, r), P(r, {
        code: E.not_finite,
        message: a.message
      }), i.dirty()) : Q.assertNever(a);
    return { status: i.value, value: t.data };
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
  setLimit(t, n, r, i) {
    return new Ln({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind: t,
          value: n,
          inclusive: r,
          message: H.toString(i)
        }
      ]
    });
  }
  _addCheck(t) {
    return new Ln({
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
    return !!this._def.checks.find((t) => t.kind === "int" || t.kind === "multipleOf" && Q.isInteger(t.value));
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
Ln.create = (e) => new Ln({
  checks: [],
  typeName: j.ZodNumber,
  coerce: (e == null ? void 0 : e.coerce) || !1,
  ...B(e)
});
class In extends G {
  constructor() {
    super(...arguments), this.min = this.gte, this.max = this.lte;
  }
  _parse(t) {
    if (this._def.coerce && (t.data = BigInt(t.data)), this._getType(t) !== N.bigint) {
      const a = this._getOrReturnCtx(t);
      return P(a, {
        code: E.invalid_type,
        expected: N.bigint,
        received: a.parsedType
      }), F;
    }
    let r;
    const i = new Fe();
    for (const a of this._def.checks)
      a.kind === "min" ? (a.inclusive ? t.data < a.value : t.data <= a.value) && (r = this._getOrReturnCtx(t, r), P(r, {
        code: E.too_small,
        type: "bigint",
        minimum: a.value,
        inclusive: a.inclusive,
        message: a.message
      }), i.dirty()) : a.kind === "max" ? (a.inclusive ? t.data > a.value : t.data >= a.value) && (r = this._getOrReturnCtx(t, r), P(r, {
        code: E.too_big,
        type: "bigint",
        maximum: a.value,
        inclusive: a.inclusive,
        message: a.message
      }), i.dirty()) : a.kind === "multipleOf" ? t.data % a.value !== BigInt(0) && (r = this._getOrReturnCtx(t, r), P(r, {
        code: E.not_multiple_of,
        multipleOf: a.value,
        message: a.message
      }), i.dirty()) : Q.assertNever(a);
    return { status: i.value, value: t.data };
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
  setLimit(t, n, r, i) {
    return new In({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind: t,
          value: n,
          inclusive: r,
          message: H.toString(i)
        }
      ]
    });
  }
  _addCheck(t) {
    return new In({
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
In.create = (e) => {
  var t;
  return new In({
    checks: [],
    typeName: j.ZodBigInt,
    coerce: (t = e == null ? void 0 : e.coerce) !== null && t !== void 0 ? t : !1,
    ...B(e)
  });
};
class Hi extends G {
  _parse(t) {
    if (this._def.coerce && (t.data = !!t.data), this._getType(t) !== N.boolean) {
      const r = this._getOrReturnCtx(t);
      return P(r, {
        code: E.invalid_type,
        expected: N.boolean,
        received: r.parsedType
      }), F;
    }
    return Ue(t.data);
  }
}
Hi.create = (e) => new Hi({
  typeName: j.ZodBoolean,
  coerce: (e == null ? void 0 : e.coerce) || !1,
  ...B(e)
});
class Kn extends G {
  _parse(t) {
    if (this._def.coerce && (t.data = new Date(t.data)), this._getType(t) !== N.date) {
      const a = this._getOrReturnCtx(t);
      return P(a, {
        code: E.invalid_type,
        expected: N.date,
        received: a.parsedType
      }), F;
    }
    if (isNaN(t.data.getTime())) {
      const a = this._getOrReturnCtx(t);
      return P(a, {
        code: E.invalid_date
      }), F;
    }
    const r = new Fe();
    let i;
    for (const a of this._def.checks)
      a.kind === "min" ? t.data.getTime() < a.value && (i = this._getOrReturnCtx(t, i), P(i, {
        code: E.too_small,
        message: a.message,
        inclusive: !0,
        exact: !1,
        minimum: a.value,
        type: "date"
      }), r.dirty()) : a.kind === "max" ? t.data.getTime() > a.value && (i = this._getOrReturnCtx(t, i), P(i, {
        code: E.too_big,
        message: a.message,
        inclusive: !0,
        exact: !1,
        maximum: a.value,
        type: "date"
      }), r.dirty()) : Q.assertNever(a);
    return {
      status: r.value,
      value: new Date(t.data.getTime())
    };
  }
  _addCheck(t) {
    return new Kn({
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
Kn.create = (e) => new Kn({
  checks: [],
  coerce: (e == null ? void 0 : e.coerce) || !1,
  typeName: j.ZodDate,
  ...B(e)
});
class mo extends G {
  _parse(t) {
    if (this._getType(t) !== N.symbol) {
      const r = this._getOrReturnCtx(t);
      return P(r, {
        code: E.invalid_type,
        expected: N.symbol,
        received: r.parsedType
      }), F;
    }
    return Ue(t.data);
  }
}
mo.create = (e) => new mo({
  typeName: j.ZodSymbol,
  ...B(e)
});
class Ai extends G {
  _parse(t) {
    if (this._getType(t) !== N.undefined) {
      const r = this._getOrReturnCtx(t);
      return P(r, {
        code: E.invalid_type,
        expected: N.undefined,
        received: r.parsedType
      }), F;
    }
    return Ue(t.data);
  }
}
Ai.create = (e) => new Ai({
  typeName: j.ZodUndefined,
  ...B(e)
});
class ji extends G {
  _parse(t) {
    if (this._getType(t) !== N.null) {
      const r = this._getOrReturnCtx(t);
      return P(r, {
        code: E.invalid_type,
        expected: N.null,
        received: r.parsedType
      }), F;
    }
    return Ue(t.data);
  }
}
ji.create = (e) => new ji({
  typeName: j.ZodNull,
  ...B(e)
});
class zr extends G {
  constructor() {
    super(...arguments), this._any = !0;
  }
  _parse(t) {
    return Ue(t.data);
  }
}
zr.create = (e) => new zr({
  typeName: j.ZodAny,
  ...B(e)
});
class Yn extends G {
  constructor() {
    super(...arguments), this._unknown = !0;
  }
  _parse(t) {
    return Ue(t.data);
  }
}
Yn.create = (e) => new Yn({
  typeName: j.ZodUnknown,
  ...B(e)
});
class an extends G {
  _parse(t) {
    const n = this._getOrReturnCtx(t);
    return P(n, {
      code: E.invalid_type,
      expected: N.never,
      received: n.parsedType
    }), F;
  }
}
an.create = (e) => new an({
  typeName: j.ZodNever,
  ...B(e)
});
class vo extends G {
  _parse(t) {
    if (this._getType(t) !== N.undefined) {
      const r = this._getOrReturnCtx(t);
      return P(r, {
        code: E.invalid_type,
        expected: N.void,
        received: r.parsedType
      }), F;
    }
    return Ue(t.data);
  }
}
vo.create = (e) => new vo({
  typeName: j.ZodVoid,
  ...B(e)
});
class Nt extends G {
  _parse(t) {
    const { ctx: n, status: r } = this._processInputParams(t), i = this._def;
    if (n.parsedType !== N.array)
      return P(n, {
        code: E.invalid_type,
        expected: N.array,
        received: n.parsedType
      }), F;
    if (i.exactLength !== null) {
      const o = n.data.length > i.exactLength.value, s = n.data.length < i.exactLength.value;
      (o || s) && (P(n, {
        code: o ? E.too_big : E.too_small,
        minimum: s ? i.exactLength.value : void 0,
        maximum: o ? i.exactLength.value : void 0,
        type: "array",
        inclusive: !0,
        exact: !0,
        message: i.exactLength.message
      }), r.dirty());
    }
    if (i.minLength !== null && n.data.length < i.minLength.value && (P(n, {
      code: E.too_small,
      minimum: i.minLength.value,
      type: "array",
      inclusive: !0,
      exact: !1,
      message: i.minLength.message
    }), r.dirty()), i.maxLength !== null && n.data.length > i.maxLength.value && (P(n, {
      code: E.too_big,
      maximum: i.maxLength.value,
      type: "array",
      inclusive: !0,
      exact: !1,
      message: i.maxLength.message
    }), r.dirty()), n.common.async)
      return Promise.all([...n.data].map((o, s) => i.type._parseAsync(new Yt(n, o, n.path, s)))).then((o) => Fe.mergeArray(r, o));
    const a = [...n.data].map((o, s) => i.type._parseSync(new Yt(n, o, n.path, s)));
    return Fe.mergeArray(r, a);
  }
  get element() {
    return this._def.type;
  }
  min(t, n) {
    return new Nt({
      ...this._def,
      minLength: { value: t, message: H.toString(n) }
    });
  }
  max(t, n) {
    return new Nt({
      ...this._def,
      maxLength: { value: t, message: H.toString(n) }
    });
  }
  length(t, n) {
    return new Nt({
      ...this._def,
      exactLength: { value: t, message: H.toString(n) }
    });
  }
  nonempty(t) {
    return this.min(1, t);
  }
}
Nt.create = (e, t) => new Nt({
  type: e,
  minLength: null,
  maxLength: null,
  exactLength: null,
  typeName: j.ZodArray,
  ...B(t)
});
function pr(e) {
  if (e instanceof pe) {
    const t = {};
    for (const n in e.shape) {
      const r = e.shape[n];
      t[n] = $t.create(pr(r));
    }
    return new pe({
      ...e._def,
      shape: () => t
    });
  } else return e instanceof Nt ? new Nt({
    ...e._def,
    type: pr(e.element)
  }) : e instanceof $t ? $t.create(pr(e.unwrap())) : e instanceof Dn ? Dn.create(pr(e.unwrap())) : e instanceof Xt ? Xt.create(e.items.map((t) => pr(t))) : e;
}
class pe extends G {
  constructor() {
    super(...arguments), this._cached = null, this.nonstrict = this.passthrough, this.augment = this.extend;
  }
  _getCached() {
    if (this._cached !== null)
      return this._cached;
    const t = this._def.shape(), n = Q.objectKeys(t);
    return this._cached = { shape: t, keys: n };
  }
  _parse(t) {
    if (this._getType(t) !== N.object) {
      const c = this._getOrReturnCtx(t);
      return P(c, {
        code: E.invalid_type,
        expected: N.object,
        received: c.parsedType
      }), F;
    }
    const { status: r, ctx: i } = this._processInputParams(t), { shape: a, keys: o } = this._getCached(), s = [];
    if (!(this._def.catchall instanceof an && this._def.unknownKeys === "strip"))
      for (const c in i.data)
        o.includes(c) || s.push(c);
    const l = [];
    for (const c of o) {
      const d = a[c], f = i.data[c];
      l.push({
        key: { status: "valid", value: c },
        value: d._parse(new Yt(i, f, i.path, c)),
        alwaysSet: c in i.data
      });
    }
    if (this._def.catchall instanceof an) {
      const c = this._def.unknownKeys;
      if (c === "passthrough")
        for (const d of s)
          l.push({
            key: { status: "valid", value: d },
            value: { status: "valid", value: i.data[d] }
          });
      else if (c === "strict")
        s.length > 0 && (P(i, {
          code: E.unrecognized_keys,
          keys: s
        }), r.dirty());
      else if (c !== "strip") throw new Error("Internal ZodObject error: invalid unknownKeys value.");
    } else {
      const c = this._def.catchall;
      for (const d of s) {
        const f = i.data[d];
        l.push({
          key: { status: "valid", value: d },
          value: c._parse(
            new Yt(i, f, i.path, d)
            //, ctx.child(key), value, getParsedType(value)
          ),
          alwaysSet: d in i.data
        });
      }
    }
    return i.common.async ? Promise.resolve().then(async () => {
      const c = [];
      for (const d of l) {
        const f = await d.key, m = await d.value;
        c.push({
          key: f,
          value: m,
          alwaysSet: d.alwaysSet
        });
      }
      return c;
    }).then((c) => Fe.mergeObjectSync(r, c)) : Fe.mergeObjectSync(r, l);
  }
  get shape() {
    return this._def.shape();
  }
  strict(t) {
    return new pe({
      ...this._def,
      unknownKeys: "strict",
      ...t !== void 0 ? {
        errorMap: (n, r) => {
          var i, a, o, s;
          const l = (o = (a = (i = this._def).errorMap) === null || a === void 0 ? void 0 : a.call(i, n, r).message) !== null && o !== void 0 ? o : r.defaultError;
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
    return new pe({
      ...this._def,
      unknownKeys: "strip"
    });
  }
  passthrough() {
    return new pe({
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
    return new pe({
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
    return new pe({
      unknownKeys: t._def.unknownKeys,
      catchall: t._def.catchall,
      shape: () => ({
        ...this._def.shape(),
        ...t._def.shape()
      }),
      typeName: j.ZodObject
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
    return new pe({
      ...this._def,
      catchall: t
    });
  }
  pick(t) {
    const n = {};
    return Q.objectKeys(t).forEach((r) => {
      t[r] && this.shape[r] && (n[r] = this.shape[r]);
    }), new pe({
      ...this._def,
      shape: () => n
    });
  }
  omit(t) {
    const n = {};
    return Q.objectKeys(this.shape).forEach((r) => {
      t[r] || (n[r] = this.shape[r]);
    }), new pe({
      ...this._def,
      shape: () => n
    });
  }
  /**
   * @deprecated
   */
  deepPartial() {
    return pr(this);
  }
  partial(t) {
    const n = {};
    return Q.objectKeys(this.shape).forEach((r) => {
      const i = this.shape[r];
      t && !t[r] ? n[r] = i : n[r] = i.optional();
    }), new pe({
      ...this._def,
      shape: () => n
    });
  }
  required(t) {
    const n = {};
    return Q.objectKeys(this.shape).forEach((r) => {
      if (t && !t[r])
        n[r] = this.shape[r];
      else {
        let a = this.shape[r];
        for (; a instanceof $t; )
          a = a._def.innerType;
        n[r] = a;
      }
    }), new pe({
      ...this._def,
      shape: () => n
    });
  }
  keyof() {
    return Hf(Q.objectKeys(this.shape));
  }
}
pe.create = (e, t) => new pe({
  shape: () => e,
  unknownKeys: "strip",
  catchall: an.create(),
  typeName: j.ZodObject,
  ...B(t)
});
pe.strictCreate = (e, t) => new pe({
  shape: () => e,
  unknownKeys: "strict",
  catchall: an.create(),
  typeName: j.ZodObject,
  ...B(t)
});
pe.lazycreate = (e, t) => new pe({
  shape: e,
  unknownKeys: "strip",
  catchall: an.create(),
  typeName: j.ZodObject,
  ...B(t)
});
class Fi extends G {
  _parse(t) {
    const { ctx: n } = this._processInputParams(t), r = this._def.options;
    function i(a) {
      for (const s of a)
        if (s.result.status === "valid")
          return s.result;
      for (const s of a)
        if (s.result.status === "dirty")
          return n.common.issues.push(...s.ctx.common.issues), s.result;
      const o = a.map((s) => new st(s.ctx.common.issues));
      return P(n, {
        code: E.invalid_union,
        unionErrors: o
      }), F;
    }
    if (n.common.async)
      return Promise.all(r.map(async (a) => {
        const o = {
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
            parent: o
          }),
          ctx: o
        };
      })).then(i);
    {
      let a;
      const o = [];
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
        d.status === "dirty" && !a && (a = { result: d, ctx: c }), c.common.issues.length && o.push(c.common.issues);
      }
      if (a)
        return n.common.issues.push(...a.ctx.common.issues), a.result;
      const s = o.map((l) => new st(l));
      return P(n, {
        code: E.invalid_union,
        unionErrors: s
      }), F;
    }
  }
  get options() {
    return this._def.options;
  }
}
Fi.create = (e, t) => new Fi({
  options: e,
  typeName: j.ZodUnion,
  ...B(t)
});
const Jt = (e) => e instanceof Vi ? Jt(e.schema) : e instanceof Rt ? Jt(e.innerType()) : e instanceof Bi ? [e.value] : e instanceof Rn ? e.options : e instanceof Ui ? Q.objectValues(e.enum) : e instanceof $i ? Jt(e._def.innerType) : e instanceof Ai ? [void 0] : e instanceof ji ? [null] : e instanceof $t ? [void 0, ...Jt(e.unwrap())] : e instanceof Dn ? [null, ...Jt(e.unwrap())] : e instanceof Vu || e instanceof Gi ? Jt(e.unwrap()) : e instanceof Zi ? Jt(e._def.innerType) : [];
class ls extends G {
  _parse(t) {
    const { ctx: n } = this._processInputParams(t);
    if (n.parsedType !== N.object)
      return P(n, {
        code: E.invalid_type,
        expected: N.object,
        received: n.parsedType
      }), F;
    const r = this.discriminator, i = n.data[r], a = this.optionsMap.get(i);
    return a ? n.common.async ? a._parseAsync({
      data: n.data,
      path: n.path,
      parent: n
    }) : a._parseSync({
      data: n.data,
      path: n.path,
      parent: n
    }) : (P(n, {
      code: E.invalid_union_discriminator,
      options: Array.from(this.optionsMap.keys()),
      path: [r]
    }), F);
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
    const i = /* @__PURE__ */ new Map();
    for (const a of n) {
      const o = Jt(a.shape[t]);
      if (!o.length)
        throw new Error(`A discriminator value for key \`${t}\` could not be extracted from all schema options`);
      for (const s of o) {
        if (i.has(s))
          throw new Error(`Discriminator property ${String(t)} has duplicate value ${String(s)}`);
        i.set(s, a);
      }
    }
    return new ls({
      typeName: j.ZodDiscriminatedUnion,
      discriminator: t,
      options: n,
      optionsMap: i,
      ...B(r)
    });
  }
}
function bl(e, t) {
  const n = mn(e), r = mn(t);
  if (e === t)
    return { valid: !0, data: e };
  if (n === N.object && r === N.object) {
    const i = Q.objectKeys(t), a = Q.objectKeys(e).filter((s) => i.indexOf(s) !== -1), o = { ...e, ...t };
    for (const s of a) {
      const l = bl(e[s], t[s]);
      if (!l.valid)
        return { valid: !1 };
      o[s] = l.data;
    }
    return { valid: !0, data: o };
  } else if (n === N.array && r === N.array) {
    if (e.length !== t.length)
      return { valid: !1 };
    const i = [];
    for (let a = 0; a < e.length; a++) {
      const o = e[a], s = t[a], l = bl(o, s);
      if (!l.valid)
        return { valid: !1 };
      i.push(l.data);
    }
    return { valid: !0, data: i };
  } else return n === N.date && r === N.date && +e == +t ? { valid: !0, data: e } : { valid: !1 };
}
class zi extends G {
  _parse(t) {
    const { status: n, ctx: r } = this._processInputParams(t), i = (a, o) => {
      if (Sl(a) || Sl(o))
        return F;
      const s = bl(a.value, o.value);
      return s.valid ? ((Cl(a) || Cl(o)) && n.dirty(), { status: n.value, value: s.data }) : (P(r, {
        code: E.invalid_intersection_types
      }), F);
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
    ]).then(([a, o]) => i(a, o)) : i(this._def.left._parseSync({
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
zi.create = (e, t, n) => new zi({
  left: e,
  right: t,
  typeName: j.ZodIntersection,
  ...B(n)
});
class Xt extends G {
  _parse(t) {
    const { status: n, ctx: r } = this._processInputParams(t);
    if (r.parsedType !== N.array)
      return P(r, {
        code: E.invalid_type,
        expected: N.array,
        received: r.parsedType
      }), F;
    if (r.data.length < this._def.items.length)
      return P(r, {
        code: E.too_small,
        minimum: this._def.items.length,
        inclusive: !0,
        exact: !1,
        type: "array"
      }), F;
    !this._def.rest && r.data.length > this._def.items.length && (P(r, {
      code: E.too_big,
      maximum: this._def.items.length,
      inclusive: !0,
      exact: !1,
      type: "array"
    }), n.dirty());
    const a = [...r.data].map((o, s) => {
      const l = this._def.items[s] || this._def.rest;
      return l ? l._parse(new Yt(r, o, r.path, s)) : null;
    }).filter((o) => !!o);
    return r.common.async ? Promise.all(a).then((o) => Fe.mergeArray(n, o)) : Fe.mergeArray(n, a);
  }
  get items() {
    return this._def.items;
  }
  rest(t) {
    return new Xt({
      ...this._def,
      rest: t
    });
  }
}
Xt.create = (e, t) => {
  if (!Array.isArray(e))
    throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
  return new Xt({
    items: e,
    typeName: j.ZodTuple,
    rest: null,
    ...B(t)
  });
};
class Wi extends G {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(t) {
    const { status: n, ctx: r } = this._processInputParams(t);
    if (r.parsedType !== N.object)
      return P(r, {
        code: E.invalid_type,
        expected: N.object,
        received: r.parsedType
      }), F;
    const i = [], a = this._def.keyType, o = this._def.valueType;
    for (const s in r.data)
      i.push({
        key: a._parse(new Yt(r, s, r.path, s)),
        value: o._parse(new Yt(r, r.data[s], r.path, s)),
        alwaysSet: s in r.data
      });
    return r.common.async ? Fe.mergeObjectAsync(n, i) : Fe.mergeObjectSync(n, i);
  }
  get element() {
    return this._def.valueType;
  }
  static create(t, n, r) {
    return n instanceof G ? new Wi({
      keyType: t,
      valueType: n,
      typeName: j.ZodRecord,
      ...B(r)
    }) : new Wi({
      keyType: Pt.create(),
      valueType: t,
      typeName: j.ZodRecord,
      ...B(n)
    });
  }
}
class go extends G {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(t) {
    const { status: n, ctx: r } = this._processInputParams(t);
    if (r.parsedType !== N.map)
      return P(r, {
        code: E.invalid_type,
        expected: N.map,
        received: r.parsedType
      }), F;
    const i = this._def.keyType, a = this._def.valueType, o = [...r.data.entries()].map(([s, l], c) => ({
      key: i._parse(new Yt(r, s, r.path, [c, "key"])),
      value: a._parse(new Yt(r, l, r.path, [c, "value"]))
    }));
    if (r.common.async) {
      const s = /* @__PURE__ */ new Map();
      return Promise.resolve().then(async () => {
        for (const l of o) {
          const c = await l.key, d = await l.value;
          if (c.status === "aborted" || d.status === "aborted")
            return F;
          (c.status === "dirty" || d.status === "dirty") && n.dirty(), s.set(c.value, d.value);
        }
        return { status: n.value, value: s };
      });
    } else {
      const s = /* @__PURE__ */ new Map();
      for (const l of o) {
        const c = l.key, d = l.value;
        if (c.status === "aborted" || d.status === "aborted")
          return F;
        (c.status === "dirty" || d.status === "dirty") && n.dirty(), s.set(c.value, d.value);
      }
      return { status: n.value, value: s };
    }
  }
}
go.create = (e, t, n) => new go({
  valueType: t,
  keyType: e,
  typeName: j.ZodMap,
  ...B(n)
});
class qn extends G {
  _parse(t) {
    const { status: n, ctx: r } = this._processInputParams(t);
    if (r.parsedType !== N.set)
      return P(r, {
        code: E.invalid_type,
        expected: N.set,
        received: r.parsedType
      }), F;
    const i = this._def;
    i.minSize !== null && r.data.size < i.minSize.value && (P(r, {
      code: E.too_small,
      minimum: i.minSize.value,
      type: "set",
      inclusive: !0,
      exact: !1,
      message: i.minSize.message
    }), n.dirty()), i.maxSize !== null && r.data.size > i.maxSize.value && (P(r, {
      code: E.too_big,
      maximum: i.maxSize.value,
      type: "set",
      inclusive: !0,
      exact: !1,
      message: i.maxSize.message
    }), n.dirty());
    const a = this._def.valueType;
    function o(l) {
      const c = /* @__PURE__ */ new Set();
      for (const d of l) {
        if (d.status === "aborted")
          return F;
        d.status === "dirty" && n.dirty(), c.add(d.value);
      }
      return { status: n.value, value: c };
    }
    const s = [...r.data.values()].map((l, c) => a._parse(new Yt(r, l, r.path, c)));
    return r.common.async ? Promise.all(s).then((l) => o(l)) : o(s);
  }
  min(t, n) {
    return new qn({
      ...this._def,
      minSize: { value: t, message: H.toString(n) }
    });
  }
  max(t, n) {
    return new qn({
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
qn.create = (e, t) => new qn({
  valueType: e,
  minSize: null,
  maxSize: null,
  typeName: j.ZodSet,
  ...B(t)
});
class Ir extends G {
  constructor() {
    super(...arguments), this.validate = this.implement;
  }
  _parse(t) {
    const { ctx: n } = this._processInputParams(t);
    if (n.parsedType !== N.function)
      return P(n, {
        code: E.invalid_type,
        expected: N.function,
        received: n.parsedType
      }), F;
    function r(s, l) {
      return po({
        data: s,
        path: n.path,
        errorMaps: [
          n.common.contextualErrorMap,
          n.schemaErrorMap,
          xo(),
          Fr
        ].filter((c) => !!c),
        issueData: {
          code: E.invalid_arguments,
          argumentsError: l
        }
      });
    }
    function i(s, l) {
      return po({
        data: s,
        path: n.path,
        errorMaps: [
          n.common.contextualErrorMap,
          n.schemaErrorMap,
          xo(),
          Fr
        ].filter((c) => !!c),
        issueData: {
          code: E.invalid_return_type,
          returnTypeError: l
        }
      });
    }
    const a = { errorMap: n.common.contextualErrorMap }, o = n.data;
    if (this._def.returns instanceof Wr) {
      const s = this;
      return Ue(async function(...l) {
        const c = new st([]), d = await s._def.args.parseAsync(l, a).catch((w) => {
          throw c.addIssue(r(l, w)), c;
        }), f = await Reflect.apply(o, this, d);
        return await s._def.returns._def.type.parseAsync(f, a).catch((w) => {
          throw c.addIssue(i(f, w)), c;
        });
      });
    } else {
      const s = this;
      return Ue(function(...l) {
        const c = s._def.args.safeParse(l, a);
        if (!c.success)
          throw new st([r(l, c.error)]);
        const d = Reflect.apply(o, this, c.data), f = s._def.returns.safeParse(d, a);
        if (!f.success)
          throw new st([i(d, f.error)]);
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
    return new Ir({
      ...this._def,
      args: Xt.create(t).rest(Yn.create())
    });
  }
  returns(t) {
    return new Ir({
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
    return new Ir({
      args: t || Xt.create([]).rest(Yn.create()),
      returns: n || Yn.create(),
      typeName: j.ZodFunction,
      ...B(r)
    });
  }
}
class Vi extends G {
  get schema() {
    return this._def.getter();
  }
  _parse(t) {
    const { ctx: n } = this._processInputParams(t);
    return this._def.getter()._parse({ data: n.data, path: n.path, parent: n });
  }
}
Vi.create = (e, t) => new Vi({
  getter: e,
  typeName: j.ZodLazy,
  ...B(t)
});
class Bi extends G {
  _parse(t) {
    if (t.data !== this._def.value) {
      const n = this._getOrReturnCtx(t);
      return P(n, {
        received: n.data,
        code: E.invalid_literal,
        expected: this._def.value
      }), F;
    }
    return { status: "valid", value: t.data };
  }
  get value() {
    return this._def.value;
  }
}
Bi.create = (e, t) => new Bi({
  value: e,
  typeName: j.ZodLiteral,
  ...B(t)
});
function Hf(e, t) {
  return new Rn({
    values: e,
    typeName: j.ZodEnum,
    ...B(t)
  });
}
class Rn extends G {
  constructor() {
    super(...arguments), xi.set(this, void 0);
  }
  _parse(t) {
    if (typeof t.data != "string") {
      const n = this._getOrReturnCtx(t), r = this._def.values;
      return P(n, {
        expected: Q.joinValues(r),
        received: n.parsedType,
        code: E.invalid_type
      }), F;
    }
    if (ho(this, xi) || Rf(this, xi, new Set(this._def.values)), !ho(this, xi).has(t.data)) {
      const n = this._getOrReturnCtx(t), r = this._def.values;
      return P(n, {
        received: n.data,
        code: E.invalid_enum_value,
        options: r
      }), F;
    }
    return Ue(t.data);
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
    return Rn.create(t, {
      ...this._def,
      ...n
    });
  }
  exclude(t, n = this._def) {
    return Rn.create(this.options.filter((r) => !t.includes(r)), {
      ...this._def,
      ...n
    });
  }
}
xi = /* @__PURE__ */ new WeakMap();
Rn.create = Hf;
class Ui extends G {
  constructor() {
    super(...arguments), pi.set(this, void 0);
  }
  _parse(t) {
    const n = Q.getValidEnumValues(this._def.values), r = this._getOrReturnCtx(t);
    if (r.parsedType !== N.string && r.parsedType !== N.number) {
      const i = Q.objectValues(n);
      return P(r, {
        expected: Q.joinValues(i),
        received: r.parsedType,
        code: E.invalid_type
      }), F;
    }
    if (ho(this, pi) || Rf(this, pi, new Set(Q.getValidEnumValues(this._def.values))), !ho(this, pi).has(t.data)) {
      const i = Q.objectValues(n);
      return P(r, {
        received: r.data,
        code: E.invalid_enum_value,
        options: i
      }), F;
    }
    return Ue(t.data);
  }
  get enum() {
    return this._def.values;
  }
}
pi = /* @__PURE__ */ new WeakMap();
Ui.create = (e, t) => new Ui({
  values: e,
  typeName: j.ZodNativeEnum,
  ...B(t)
});
class Wr extends G {
  unwrap() {
    return this._def.type;
  }
  _parse(t) {
    const { ctx: n } = this._processInputParams(t);
    if (n.parsedType !== N.promise && n.common.async === !1)
      return P(n, {
        code: E.invalid_type,
        expected: N.promise,
        received: n.parsedType
      }), F;
    const r = n.parsedType === N.promise ? n.data : Promise.resolve(n.data);
    return Ue(r.then((i) => this._def.type.parseAsync(i, {
      path: n.path,
      errorMap: n.common.contextualErrorMap
    })));
  }
}
Wr.create = (e, t) => new Wr({
  type: e,
  typeName: j.ZodPromise,
  ...B(t)
});
class Rt extends G {
  innerType() {
    return this._def.schema;
  }
  sourceType() {
    return this._def.schema._def.typeName === j.ZodEffects ? this._def.schema.sourceType() : this._def.schema;
  }
  _parse(t) {
    const { status: n, ctx: r } = this._processInputParams(t), i = this._def.effect || null, a = {
      addIssue: (o) => {
        P(r, o), o.fatal ? n.abort() : n.dirty();
      },
      get path() {
        return r.path;
      }
    };
    if (a.addIssue = a.addIssue.bind(a), i.type === "preprocess") {
      const o = i.transform(r.data, a);
      if (r.common.async)
        return Promise.resolve(o).then(async (s) => {
          if (n.value === "aborted")
            return F;
          const l = await this._def.schema._parseAsync({
            data: s,
            path: r.path,
            parent: r
          });
          return l.status === "aborted" ? F : l.status === "dirty" || n.value === "dirty" ? hr(l.value) : l;
        });
      {
        if (n.value === "aborted")
          return F;
        const s = this._def.schema._parseSync({
          data: o,
          path: r.path,
          parent: r
        });
        return s.status === "aborted" ? F : s.status === "dirty" || n.value === "dirty" ? hr(s.value) : s;
      }
    }
    if (i.type === "refinement") {
      const o = (s) => {
        const l = i.refinement(s, a);
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
        return s.status === "aborted" ? F : (s.status === "dirty" && n.dirty(), o(s.value), { status: n.value, value: s.value });
      } else
        return this._def.schema._parseAsync({ data: r.data, path: r.path, parent: r }).then((s) => s.status === "aborted" ? F : (s.status === "dirty" && n.dirty(), o(s.value).then(() => ({ status: n.value, value: s.value }))));
    }
    if (i.type === "transform")
      if (r.common.async === !1) {
        const o = this._def.schema._parseSync({
          data: r.data,
          path: r.path,
          parent: r
        });
        if (!Mi(o))
          return o;
        const s = i.transform(o.value, a);
        if (s instanceof Promise)
          throw new Error("Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.");
        return { status: n.value, value: s };
      } else
        return this._def.schema._parseAsync({ data: r.data, path: r.path, parent: r }).then((o) => Mi(o) ? Promise.resolve(i.transform(o.value, a)).then((s) => ({ status: n.value, value: s })) : o);
    Q.assertNever(i);
  }
}
Rt.create = (e, t, n) => new Rt({
  schema: e,
  typeName: j.ZodEffects,
  effect: t,
  ...B(n)
});
Rt.createWithPreprocess = (e, t, n) => new Rt({
  schema: t,
  effect: { type: "preprocess", transform: e },
  typeName: j.ZodEffects,
  ...B(n)
});
class $t extends G {
  _parse(t) {
    return this._getType(t) === N.undefined ? Ue(void 0) : this._def.innerType._parse(t);
  }
  unwrap() {
    return this._def.innerType;
  }
}
$t.create = (e, t) => new $t({
  innerType: e,
  typeName: j.ZodOptional,
  ...B(t)
});
class Dn extends G {
  _parse(t) {
    return this._getType(t) === N.null ? Ue(null) : this._def.innerType._parse(t);
  }
  unwrap() {
    return this._def.innerType;
  }
}
Dn.create = (e, t) => new Dn({
  innerType: e,
  typeName: j.ZodNullable,
  ...B(t)
});
class $i extends G {
  _parse(t) {
    const { ctx: n } = this._processInputParams(t);
    let r = n.data;
    return n.parsedType === N.undefined && (r = this._def.defaultValue()), this._def.innerType._parse({
      data: r,
      path: n.path,
      parent: n
    });
  }
  removeDefault() {
    return this._def.innerType;
  }
}
$i.create = (e, t) => new $i({
  innerType: e,
  typeName: j.ZodDefault,
  defaultValue: typeof t.default == "function" ? t.default : () => t.default,
  ...B(t)
});
class Zi extends G {
  _parse(t) {
    const { ctx: n } = this._processInputParams(t), r = {
      ...n,
      common: {
        ...n.common,
        issues: []
      }
    }, i = this._def.innerType._parse({
      data: r.data,
      path: r.path,
      parent: {
        ...r
      }
    });
    return Oi(i) ? i.then((a) => ({
      status: "valid",
      value: a.status === "valid" ? a.value : this._def.catchValue({
        get error() {
          return new st(r.common.issues);
        },
        input: r.data
      })
    })) : {
      status: "valid",
      value: i.status === "valid" ? i.value : this._def.catchValue({
        get error() {
          return new st(r.common.issues);
        },
        input: r.data
      })
    };
  }
  removeCatch() {
    return this._def.innerType;
  }
}
Zi.create = (e, t) => new Zi({
  innerType: e,
  typeName: j.ZodCatch,
  catchValue: typeof t.catch == "function" ? t.catch : () => t.catch,
  ...B(t)
});
class yo extends G {
  _parse(t) {
    if (this._getType(t) !== N.nan) {
      const r = this._getOrReturnCtx(t);
      return P(r, {
        code: E.invalid_type,
        expected: N.nan,
        received: r.parsedType
      }), F;
    }
    return { status: "valid", value: t.data };
  }
}
yo.create = (e) => new yo({
  typeName: j.ZodNaN,
  ...B(e)
});
const U2 = Symbol("zod_brand");
class Vu extends G {
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
class ha extends G {
  _parse(t) {
    const { status: n, ctx: r } = this._processInputParams(t);
    if (r.common.async)
      return (async () => {
        const a = await this._def.in._parseAsync({
          data: r.data,
          path: r.path,
          parent: r
        });
        return a.status === "aborted" ? F : a.status === "dirty" ? (n.dirty(), hr(a.value)) : this._def.out._parseAsync({
          data: a.value,
          path: r.path,
          parent: r
        });
      })();
    {
      const i = this._def.in._parseSync({
        data: r.data,
        path: r.path,
        parent: r
      });
      return i.status === "aborted" ? F : i.status === "dirty" ? (n.dirty(), {
        status: "dirty",
        value: i.value
      }) : this._def.out._parseSync({
        data: i.value,
        path: r.path,
        parent: r
      });
    }
  }
  static create(t, n) {
    return new ha({
      in: t,
      out: n,
      typeName: j.ZodPipeline
    });
  }
}
class Gi extends G {
  _parse(t) {
    const n = this._def.innerType._parse(t), r = (i) => (Mi(i) && (i.value = Object.freeze(i.value)), i);
    return Oi(n) ? n.then((i) => r(i)) : r(n);
  }
  unwrap() {
    return this._def.innerType;
  }
}
Gi.create = (e, t) => new Gi({
  innerType: e,
  typeName: j.ZodReadonly,
  ...B(t)
});
function Bu(e, t = {}, n) {
  return e ? zr.create().superRefine((r, i) => {
    var a, o;
    if (!e(r)) {
      const s = typeof t == "function" ? t(r) : typeof t == "string" ? { message: t } : t, l = (o = (a = s.fatal) !== null && a !== void 0 ? a : n) !== null && o !== void 0 ? o : !0, c = typeof s == "string" ? { message: s } : s;
      i.addIssue({ code: "custom", ...c, fatal: l });
    }
  }) : zr.create();
}
const $2 = {
  object: pe.lazycreate
};
var j;
(function(e) {
  e.ZodString = "ZodString", e.ZodNumber = "ZodNumber", e.ZodNaN = "ZodNaN", e.ZodBigInt = "ZodBigInt", e.ZodBoolean = "ZodBoolean", e.ZodDate = "ZodDate", e.ZodSymbol = "ZodSymbol", e.ZodUndefined = "ZodUndefined", e.ZodNull = "ZodNull", e.ZodAny = "ZodAny", e.ZodUnknown = "ZodUnknown", e.ZodNever = "ZodNever", e.ZodVoid = "ZodVoid", e.ZodArray = "ZodArray", e.ZodObject = "ZodObject", e.ZodUnion = "ZodUnion", e.ZodDiscriminatedUnion = "ZodDiscriminatedUnion", e.ZodIntersection = "ZodIntersection", e.ZodTuple = "ZodTuple", e.ZodRecord = "ZodRecord", e.ZodMap = "ZodMap", e.ZodSet = "ZodSet", e.ZodFunction = "ZodFunction", e.ZodLazy = "ZodLazy", e.ZodLiteral = "ZodLiteral", e.ZodEnum = "ZodEnum", e.ZodEffects = "ZodEffects", e.ZodNativeEnum = "ZodNativeEnum", e.ZodOptional = "ZodOptional", e.ZodNullable = "ZodNullable", e.ZodDefault = "ZodDefault", e.ZodCatch = "ZodCatch", e.ZodPromise = "ZodPromise", e.ZodBranded = "ZodBranded", e.ZodPipeline = "ZodPipeline", e.ZodReadonly = "ZodReadonly";
})(j || (j = {}));
const Z2 = (e, t = {
  message: `Input not instance of ${e.name}`
}) => Bu((n) => n instanceof e, t), O = Pt.create, V = Ln.create, G2 = yo.create, Y2 = In.create, us = Hi.create, X2 = Kn.create, Q2 = mo.create, El = Ai.create, J2 = ji.create, K2 = zr.create, q2 = Yn.create, ey = an.create, ty = vo.create, cn = Nt.create, z = pe.create, ny = pe.strictCreate, wo = Fi.create, ry = ls.create, iy = zi.create, ay = Xt.create, Af = Wi.create, oy = go.create, sy = qn.create, ly = Ir.create, uy = Vi.create, Tl = Bi.create, cs = Rn.create, Uu = Ui.create, cy = Wr.create, h0 = Rt.create, dy = $t.create, fy = Dn.create, xy = Rt.createWithPreprocess, py = ha.create, hy = () => O().optional(), my = () => V().optional(), vy = () => us().optional(), gy = {
  string: (e) => Pt.create({ ...e, coerce: !0 }),
  number: (e) => Ln.create({ ...e, coerce: !0 }),
  boolean: (e) => Hi.create({
    ...e,
    coerce: !0
  }),
  bigint: (e) => In.create({ ...e, coerce: !0 }),
  date: (e) => Kn.create({ ...e, coerce: !0 })
}, yy = F;
var rt = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  defaultErrorMap: Fr,
  setErrorMap: T2,
  getErrorMap: xo,
  makeIssue: po,
  EMPTY_PATH: P2,
  addIssueToContext: P,
  ParseStatus: Fe,
  INVALID: F,
  DIRTY: hr,
  OK: Ue,
  isAborted: Sl,
  isDirty: Cl,
  isValid: Mi,
  isAsync: Oi,
  get util() {
    return Q;
  },
  get objectUtil() {
    return kl;
  },
  ZodParsedType: N,
  getParsedType: mn,
  ZodType: G,
  datetimeRegex: Of,
  ZodString: Pt,
  ZodNumber: Ln,
  ZodBigInt: In,
  ZodBoolean: Hi,
  ZodDate: Kn,
  ZodSymbol: mo,
  ZodUndefined: Ai,
  ZodNull: ji,
  ZodAny: zr,
  ZodUnknown: Yn,
  ZodNever: an,
  ZodVoid: vo,
  ZodArray: Nt,
  ZodObject: pe,
  ZodUnion: Fi,
  ZodDiscriminatedUnion: ls,
  ZodIntersection: zi,
  ZodTuple: Xt,
  ZodRecord: Wi,
  ZodMap: go,
  ZodSet: qn,
  ZodFunction: Ir,
  ZodLazy: Vi,
  ZodLiteral: Bi,
  ZodEnum: Rn,
  ZodNativeEnum: Ui,
  ZodPromise: Wr,
  ZodEffects: Rt,
  ZodTransformer: Rt,
  ZodOptional: $t,
  ZodNullable: Dn,
  ZodDefault: $i,
  ZodCatch: Zi,
  ZodNaN: yo,
  BRAND: U2,
  ZodBranded: Vu,
  ZodPipeline: ha,
  ZodReadonly: Gi,
  custom: Bu,
  Schema: G,
  ZodSchema: G,
  late: $2,
  get ZodFirstPartyTypeKind() {
    return j;
  },
  coerce: gy,
  any: K2,
  array: cn,
  bigint: Y2,
  boolean: us,
  date: X2,
  discriminatedUnion: ry,
  effect: h0,
  enum: cs,
  function: ly,
  instanceof: Z2,
  intersection: iy,
  lazy: uy,
  literal: Tl,
  map: oy,
  nan: G2,
  nativeEnum: Uu,
  never: ey,
  null: J2,
  nullable: fy,
  number: V,
  object: z,
  oboolean: vy,
  onumber: my,
  optional: dy,
  ostring: hy,
  pipeline: py,
  preprocess: xy,
  promise: cy,
  record: Af,
  set: sy,
  strictObject: ny,
  string: O,
  symbol: Q2,
  transformer: h0,
  tuple: ay,
  undefined: El,
  union: wo,
  unknown: q2,
  void: ty,
  NEVER: yy,
  ZodIssueCode: E,
  quotelessJson: E2,
  ZodError: st
});
function m0(e, t, n) {
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
var I;
(function(e) {
  e.datasetId = "datasetId", e.user = "user", e.dapp = "dapp", e.provider = "provider", e.blockNumber = "blockNumber", e.requestHash = "requestHash", e.captchas = "captchas", e.commitmentId = "commitmentId", e.proof = "proof", e.dappSignature = "dappSignature", e.dappUserSignature = "dappUserSignature", e.providerUrl = "providerUrl", e.procaptchaResponse = "procaptcha-response", e.verifiedTimeout = "verifiedTimeout", e.maxVerifiedTime = "maxVerifiedTime", e.verified = "verified", e.status = "status", e.challenge = "challenge", e.difficulty = "difficulty", e.nonce = "nonce", e.timeouts = "timeouts", e.token = "token", e.secret = "secret", e.timestamp = "timestamp", e.signature = "signature";
})(I || (I = {}));
const $u = 60 * 1e3, ma = $u, jf = ma * 2, Ff = ma * 3, Zu = ma * 15, ds = $u, fs = ds * 2, zf = ds * 3, Wf = $u * 15;
var Pl;
(function(e) {
  e.SelectAll = "SelectAll";
})(Pl || (Pl = {}));
var Nl;
(function(e) {
  e.Text = "text", e.Image = "image";
})(Nl || (Nl = {}));
var v0;
(function(e) {
  e.Solved = "solved", e.Unsolved = "unsolved";
})(v0 || (v0 = {}));
var g0;
(function(e) {
  e.pending = "Pending", e.approved = "Approved", e.disapproved = "Disapproved";
})(g0 || (g0 = {}));
var y0;
(function(e) {
  e.active = "Active", e.inactive = "Inactive";
})(y0 || (y0 = {}));
var w0;
(function(e) {
  e.provider = "Provider", e.dapp = "Dapp", e.any = "Any";
})(w0 || (w0 = {}));
V();
const wy = "___", _y = Bu((e) => {
  const t = e.split(wy);
  try {
    return t.length === 3;
  } catch {
    return !1;
  }
}), ky = z({
  captchaId: wo([O(), El()]),
  captchaContentId: wo([O(), El()]),
  salt: O().min(34),
  solution: V().array().optional(),
  unlabelled: V().array().optional(),
  timeLimit: V().optional()
}), Vf = z({
  hash: O(),
  data: O(),
  type: Uu(Nl)
}), Bf = Vf.extend({
  hash: O()
}), Sy = Bf.extend({
  label: O()
}), Cy = Bf.extend({
  label: O().optional()
}), Uf = ky.extend({
  items: cn(Vf),
  target: O()
}), by = Uf.extend({
  solution: O().array().optional(),
  unlabelled: O().array().optional()
}), Ey = by.extend({
  solution: V().array().optional(),
  unlabelled: V().array().optional()
}), Ty = cn(Uf);
cn(Ey);
const $f = z({
  captchaId: O(),
  captchaContentId: O(),
  solution: O().array(),
  salt: O().min(34)
});
cn($f);
z({
  items: cn(Cy)
});
z({
  items: cn(Sy)
});
z({
  captchas: Ty,
  format: Uu(Pl)
});
z({
  labels: cn(O())
});
var Py = Object.defineProperty, Ny = (e, t, n) => t in e ? Py(e, t, { enumerable: !0, configurable: !0, writable: !0, value: n }) : e[t] = n, _0 = (e, t, n) => (Ny(e, typeof t != "symbol" ? t + "" : t, n), n), Fs = {
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
function Ly(e) {
  const t = e.length % 2, n = (e[1] === "x" ? 2 : 0) + t, r = (e.length - n) / 2 + t, i = new Uint8Array(r);
  t && (i[0] = 0 | Fs[e[2]]);
  for (let a = 0; a < r; ) {
    const o = n + a * 2, s = Fs[e[o]], l = Fs[e[o + 1]];
    i[t + a++] = s << 4 | l;
  }
  return i;
}
var k0 = class extends Uint8Array {
  constructor(e) {
    super(e), _0(this, "i", 0), _0(this, "v"), this.v = new DataView(e);
  }
}, ar = (e) => (t) => e(t instanceof k0 ? t : new k0(t instanceof Uint8Array ? t.buffer : typeof t == "string" ? Ly(t).buffer : t)), xs = (e) => {
  const t = e.length;
  let n = 0;
  for (let i = 0; i < t; i++)
    n += e[i].byteLength;
  const r = new Uint8Array(n);
  for (let i = 0, a = 0; i < t; i++) {
    const o = e[i];
    r.set(o, a), a += o.byteLength;
  }
  return r;
};
function S0(e, t) {
  const n = Object.keys(e), r = n.length, i = {};
  for (let a = 0; a < r; a++) {
    const o = n[a];
    i[o] = t(e[o], o);
  }
  return i;
}
var kt = (e, t) => {
  const n = [e, t];
  return n.enc = e, n.dec = t, n;
}, Zf = (e, t) => (n) => e(t(n)), Gf = (e, t) => (n) => t(e(n)), Iy = ([e, t], n, r) => kt(Zf(e, n), Gf(t, r));
function Ry(e, t) {
  return ar((n) => {
    const r = n.v[t](n.i, !0);
    return n.i += e, r;
  });
}
function Dy(e, t) {
  return (n) => {
    const r = new Uint8Array(e);
    return new DataView(r.buffer)[t](0, n, !0), r;
  };
}
function Hn(e, t, n) {
  return kt(Dy(e, n), Ry(e, t));
}
var Vr = Hn(1, "getUint8", "setUint8"), _o = Hn(2, "getUint16", "setUint16"), Yi = Hn(4, "getUint32", "setUint32"), Yf = Hn(8, "getBigUint64", "setBigUint64");
Hn(1, "getInt8", "setInt8");
Hn(2, "getInt16", "setInt16");
Hn(4, "getInt32", "setInt32");
Hn(8, "getBigInt64", "setBigInt64");
var Xf = (e) => {
  const t = new Uint8Array(16), n = new DataView(t.buffer);
  return n.setBigInt64(0, e, !0), n.setBigInt64(8, e >> 64n, !0), t;
}, Qf = (e) => ar((t) => {
  const { v: n, i: r } = t, i = n.getBigUint64(r, !0), a = n[e](r + 8, !0);
  return t.i += 16, a << 64n | i;
});
kt(Xf, Qf("getBigUint64"));
kt(Xf, Qf("getBigInt64"));
var Jf = (e) => {
  const t = new Uint8Array(32), n = new DataView(t.buffer);
  return n.setBigInt64(0, e, !0), n.setBigInt64(8, e >> 64n, !0), n.setBigInt64(16, e >> 128n, !0), n.setBigInt64(24, e >> 192n, !0), t;
}, Kf = (e) => ar((t) => {
  let n = t.v.getBigUint64(t.i, !0);
  return t.i += 8, n |= t.v.getBigUint64(t.i, !0) << 64n, t.i += 8, n |= t.v.getBigUint64(t.i, !0) << 128n, t.i += 8, n |= t.v[e](t.i, !0) << 192n, t.i += 8, n;
});
kt(Jf, Kf("getBigUint64"));
kt(Jf, Kf("getBigInt64"));
var qf = Iy(Vr, (e) => e ? 1 : 0, Boolean), My = [Vr[1], _o[1], Yi[1]], Oy = ar((e) => {
  const t = e[e.i], n = t & 3;
  if (n < 3)
    return My[n](e) >>> 2;
  const r = (t >>> 2) + 4;
  e.i++;
  let i = 0n;
  const a = r / 8 | 0;
  let o = 0n;
  for (let l = 0; l < a; l++)
    i = Yf[1](e) << o | i, o += 64n;
  let s = r % 8;
  return s > 3 && (i = BigInt(Yi[1](e)) << o | i, o += 32n, s -= 4), s > 1 && (i = BigInt(_o[1](e)) << o | i, o += 16n, s -= 2), s && (i = BigInt(Vr[1](e)) << o | i), i;
}), Hy = 1n << 56n, Ay = 1 << 24, jy = 256, Fy = 4294967295n, zy = 64, Wy = 16384, Vy = 1 << 30, By = (e) => {
  if (e < 0)
    throw new Error(`Wrong compact input (${e})`);
  const t = Number(e) << 2;
  if (e < zy)
    return Vr[0](t);
  if (e < Wy)
    return _o[0](t | 1);
  if (e < Vy)
    return Yi[0](t | 2);
  let n = [new Uint8Array(1)], r = BigInt(e);
  for (; r >= Hy; )
    n.push(Yf[0](r)), r >>= 64n;
  r >= Ay && (n.push(Yi[0](Number(r & Fy))), r >>= 32n);
  let i = Number(r);
  i >= jy && (n.push(_o[0](i)), i >>= 16), i && n.push(Vr[0](i));
  const a = xs(n);
  return a[0] = a.length - 5 << 2 | 3, a;
}, ex = kt(By, Oy), Uy = new TextEncoder(), $y = (e) => {
  const t = Uy.encode(e);
  return xs([ex.enc(t.length), t]);
}, Zy = new TextDecoder(), Gy = ar((e) => {
  let t = ex.dec(e);
  const n = new DataView(e.buffer, e.i, t);
  return e.i += t, Zy.decode(n);
}), Ot = kt($y, Gy), Yy = () => {
}, Xy = new Uint8Array(0);
kt(() => Xy, Yy);
var tx = (e) => ar((t) => {
  const n = Vr.dec(t);
  if (n !== 0)
    return e === qf[1] ? n === 1 : e(t);
}), nx = (e) => (t) => {
  const n = new Uint8Array(1);
  return t === void 0 ? (n[0] = 0, n) : (n[0] = 1, e === qf[0] ? (n[0] = t ? 1 : 2, n) : xs([n, e(t)]));
}, At = (e) => kt(nx(e[0]), tx(e[1]));
At.enc = nx;
At.dec = tx;
var rx = (...e) => ar((t) => e.map((n) => n(t))), ix = (...e) => (t) => xs(e.map((n, r) => n(t[r]))), ps = (...e) => kt(ix(...e.map(([t]) => t)), rx(...e.map(([, t]) => t)));
ps.enc = ix;
ps.dec = rx;
var ax = (e) => {
  const t = Object.keys(e);
  return Zf(ps.enc(...Object.values(e)), (n) => t.map((r) => n[r]));
}, ox = (e) => {
  const t = Object.keys(e);
  return Gf(ps.dec(...Object.values(e)), (n) => Object.fromEntries(n.map((r, i) => [t[i], r])));
}, mr = (e) => kt(ax(S0(e, (t) => t[0])), ox(S0(e, (t) => t[1])));
mr.enc = ax;
mr.dec = ox;
const C0 = z({
  [I.requestHash]: O()
});
z({
  [I.challenge]: O()
});
const b0 = z({
  [I.challenge]: O().optional(),
  [I.requestHash]: O().optional(),
  [I.timestamp]: O().optional()
});
z({
  [I.commitmentId]: O().optional(),
  [I.providerUrl]: O().optional(),
  [I.dapp]: O(),
  [I.user]: O(),
  [I.challenge]: O().optional(),
  [I.nonce]: V().optional(),
  [I.timestamp]: O(),
  [I.signature]: z({
    [I.provider]: b0,
    [I.user]: b0
  })
});
const Qy = mr({
  [I.commitmentId]: At(Ot),
  [I.providerUrl]: At(Ot),
  [I.dapp]: Ot,
  [I.user]: Ot,
  [I.challenge]: At(Ot),
  [I.nonce]: At(Yi),
  [I.timestamp]: Ot,
  [I.signature]: mr({
    [I.provider]: mr({
      [I.challenge]: At(Ot),
      [I.requestHash]: At(Ot)
    }),
    [I.user]: mr({
      [I.timestamp]: At(Ot),
      [I.requestHash]: At(Ot)
    })
  })
}), sx = O().startsWith("0x"), Dw = (e) => {
  var t, n, r, i;
  return b2(Qy.enc({
    [I.commitmentId]: void 0,
    [I.providerUrl]: void 0,
    [I.challenge]: void 0,
    [I.nonce]: void 0,
    ...e,
    signature: {
      provider: {
        challenge: ((t = e.signature.provider) == null ? void 0 : t.challenge) || void 0,
        requestHash: ((n = e.signature.provider) == null ? void 0 : n.requestHash) || void 0
      },
      user: {
        timestamp: ((r = e.signature.user) == null ? void 0 : r.timestamp) || void 0,
        requestHash: ((i = e.signature.user) == null ? void 0 : i.requestHash) || void 0
      }
    }
  }));
};
var ht;
(function(e) {
  e.GetImageCaptchaChallenge = "/v1/prosopo/provider/captcha/image", e.GetPowCaptchaChallenge = "/v1/prosopo/provider/captcha/pow", e.SubmitImageCaptchaSolution = "/v1/prosopo/provider/solution", e.SubmitPowCaptchaSolution = "/v1/prosopo/provider/pow/solution", e.VerifyPowCaptchaSolution = "/v1/prosopo/provider/pow/verify", e.VerifyImageCaptchaSolutionDapp = "/v1/prosopo/provider/image/dapp/verify", e.VerifyImageCaptchaSolutionUser = "/v1/prosopo/provider/image/user/verify", e.GetProviderStatus = "/v1/prosopo/provider/status", e.GetProviderDetails = "/v1/prosopo/provider/details", e.SubmitUserEvents = "/v1/prosopo/provider/events";
})(ht || (ht = {}));
var vr;
(function(e) {
  e.BatchCommit = "/v1/prosopo/provider/admin/batch", e.UpdateDataset = "/v1/prosopo/provider/admin/dataset", e.ProviderDeregister = "/v1/prosopo/provider/admin/deregister", e.ProviderUpdate = "/v1/prosopo/provider/admin/update";
})(vr || (vr = {}));
const lx = {
  [ht.GetImageCaptchaChallenge]: { windowMs: 6e4, limit: 30 },
  [ht.GetPowCaptchaChallenge]: { windowMs: 6e4, limit: 60 },
  [ht.SubmitImageCaptchaSolution]: { windowMs: 6e4, limit: 60 },
  [ht.SubmitPowCaptchaSolution]: { windowMs: 6e4, limit: 60 },
  [ht.VerifyPowCaptchaSolution]: { windowMs: 6e4, limit: 60 },
  [ht.VerifyImageCaptchaSolutionDapp]: { windowMs: 6e4, limit: 60 },
  [ht.VerifyImageCaptchaSolutionUser]: { windowMs: 6e4, limit: 60 },
  [ht.GetProviderStatus]: { windowMs: 6e4, limit: 60 },
  [ht.GetProviderDetails]: { windowMs: 6e4, limit: 60 },
  [ht.SubmitUserEvents]: { windowMs: 6e4, limit: 60 },
  [vr.BatchCommit]: { windowMs: 6e4, limit: 5 },
  [vr.UpdateDataset]: { windowMs: 6e4, limit: 5 },
  [vr.ProviderDeregister]: { windowMs: 6e4, limit: 1 },
  [vr.ProviderUpdate]: { windowMs: 6e4, limit: 5 }
}, Jy = (e) => z(Object.entries(e).reduce((t, [n, r]) => {
  const i = n;
  return t[i] = z({
    windowMs: V().optional().default(r.windowMs),
    limit: V().optional().default(r.limit)
  }), t;
}, {})), Ky = Jy(lx);
z({
  [I.user]: O(),
  [I.dapp]: O(),
  [I.datasetId]: O()
});
z({
  [I.user]: O(),
  [I.dapp]: O(),
  [I.captchas]: cn($f),
  [I.requestHash]: O(),
  [I.timestamp]: O(),
  [I.signature]: z({
    [I.user]: C0,
    [I.provider]: C0
  })
});
z({
  [I.token]: sx,
  [I.dappSignature]: O(),
  [I.maxVerifiedTime]: V().optional().default(Zu)
});
z({
  [I.token]: sx,
  [I.dappSignature]: O(),
  [I.verifiedTimeout]: V().optional().default(fs)
});
z({
  [I.user]: O(),
  [I.dapp]: O()
});
const Mw = z({
  [I.challenge]: _y,
  [I.difficulty]: V(),
  [I.signature]: z({
    [I.user]: z({
      [I.timestamp]: O()
    }),
    [I.provider]: z({
      [I.challenge]: O()
    })
  }),
  [I.user]: O(),
  [I.dapp]: O(),
  [I.nonce]: V(),
  [I.verifiedTimeout]: V().optional().default(fs)
}), E0 = cs([
  "trace",
  "debug",
  "info",
  "warn",
  "error",
  "fatal",
  "log"
]);
cs(["mongo", "mongoMemory"]);
const ko = cs([
  "development",
  "staging",
  "production"
]), qy = Af(ko, z({
  type: O(),
  endpoint: O(),
  dbname: O(),
  authSource: O()
})), e4 = z({
  interval: V().positive().optional().default(300),
  maxBatchExtrinsicPercentage: V().positive().optional().default(59)
}), t4 = z({
  logLevel: E0.optional().default(E0.enum.info),
  defaultEnvironment: ko.default(ko.Values.production),
  account: z({
    address: O().optional(),
    secret: O().optional(),
    password: O().optional()
  })
});
rt.object({
  encoded: rt.string(),
  encoding: rt.object({
    content: rt.array(rt.string()),
    type: rt.array(rt.string()),
    version: rt.string()
  }),
  address: rt.string(),
  meta: rt.object({
    genesisHash: rt.string(),
    name: rt.string(),
    whenCreated: rt.number()
  })
});
const ux = t4.merge(z({
  database: qy.optional(),
  devOnlyWatchEvents: us().optional()
})), n4 = z({
  solved: z({
    count: V().positive()
  }).optional().default({ count: 1 }),
  unsolved: z({
    count: V().nonnegative()
  }).optional().default({ count: 1 })
}), r4 = z({
  baseURL: O().url(),
  port: V().optional().default(9229)
}), i4 = z({
  requiredNumberOfSolutions: V().positive().min(2),
  solutionWinningPercentage: V().positive().max(100),
  captchaBlockRecency: V().positive().min(2)
}), cx = ux.merge(z({
  userAccountAddress: O().optional(),
  web2: us().optional().default(!0),
  solutionThreshold: V().positive().max(100).optional().default(80),
  dappName: O().optional().default("ProsopoClientDapp"),
  serverUrl: O().optional()
})), dx = {
  challengeTimeout: ma,
  solutionTimeout: jf,
  verifiedTimeout: Ff,
  cachedTimeout: Zu
}, fx = {
  challengeTimeout: fs,
  solutionTimeout: ds,
  cachedTimeout: zf
}, xx = {
  maxVerifiedTime: Wf
}, Gu = {
  image: dx,
  pow: fx,
  contract: xx
}, px = z({
  image: z({
    challengeTimeout: V().positive().optional().default(ma),
    solutionTimeout: V().positive().optional().default(jf),
    verifiedTimeout: V().positive().optional().default(Ff),
    cachedTimeout: V().positive().optional().default(Zu)
  }).default(dx),
  pow: z({
    verifiedTimeout: V().positive().optional().default(fs),
    solutionTimeout: V().positive().optional().default(ds),
    cachedTimeout: V().positive().optional().default(zf)
  }).default(fx),
  contract: z({
    maxVerifiedTime: V().positive().optional().default(Wf)
  }).default(xx)
}).default(Gu);
cx.merge(z({
  serverUrl: O().url().optional(),
  timeouts: px.optional().default(Gu)
}));
const a4 = z({
  area: z({
    width: V().positive(),
    height: V().positive()
  }),
  offsetParameter: V().positive(),
  multiplier: V().positive(),
  fontSizeFactor: V().positive(),
  maxShadowBlur: V().positive(),
  numberOfRounds: V().positive(),
  seed: V().positive()
}), o4 = wo([Tl("light"), Tl("dark")]), s4 = cx.and(z({
  accountCreator: a4.optional(),
  theme: o4.optional(),
  captchas: px.optional().default(Gu)
}));
ux.merge(z({
  captchas: n4.optional().default({
    solved: { count: 1 },
    unsolved: { count: 0 }
  }),
  captchaSolutions: i4.optional().default({
    requiredNumberOfSolutions: 3,
    solutionWinningPercentage: 80,
    captchaBlockRecency: 10
  }),
  batchCommit: e4.optional().default({
    interval: 300,
    maxBatchExtrinsicPercentage: 59
  }),
  captchaScheduler: z({
    schedule: O().optional()
  }).optional(),
  server: r4,
  mongoEventsUri: O().optional(),
  mongoCaptchaUri: O().optional(),
  rateLimits: Ky.default(lx),
  proxyCount: V().optional().default(0)
}));
var Ll;
(function(e) {
  e.Image = "image", e.Pow = "pow", e.Frictionless = "frictionless";
})(Ll || (Ll = {}));
const l4 = ae.lazy(async () => import("./ProcaptchaWidget-nO3NsM0R.js")), hx = (e) => $(ae.Suspense, { fallback: $(Wu, { darkMode: e.config.theme }), children: $(l4, { config: e.config, callbacks: e.callbacks }) }), u4 = ae.lazy(async () => import("./ProcaptchaWidget-BzBkw8-_.js")), mx = (e) => $(ae.Suspense, { fallback: $(Wu, { darkMode: e.config.theme }), children: $(u4, { config: e.config, callbacks: e.callbacks }) }), c4 = async () => await ig().then((e) => ({ bot: e.isBot })), d4 = ({ config: e, callbacks: t, detectBot: n = c4 }) => {
  const [r, i] = ae.useState(Bt.jsx(Wu, { darkMode: e.theme }));
  return ae.useEffect(() => {
    (async () => {
      (await n()).bot ? i(Bt.jsx(mx, { config: e, callbacks: t })) : i(Bt.jsx(hx, { config: e, callbacks: t }));
    })();
  }, [e, t, n]), r;
};
var vx = { exports: {} }, dt = {}, gx = { exports: {} }, yx = {};
(function(e) {
  function t(R, W) {
    var Z = R.length;
    R.push(W);
    e: for (; 0 < Z; ) {
      var ue = Z - 1 >>> 1, ye = R[ue];
      if (0 < i(ye, W)) R[ue] = W, R[Z] = ye, Z = ue;
      else break e;
    }
  }
  function n(R) {
    return R.length === 0 ? null : R[0];
  }
  function r(R) {
    if (R.length === 0) return null;
    var W = R[0], Z = R.pop();
    if (Z !== W) {
      R[0] = Z;
      e: for (var ue = 0, ye = R.length, zn = ye >>> 1; ue < zn; ) {
        var tt = 2 * (ue + 1) - 1, Ls = R[tt], Wn = tt + 1, _a = R[Wn];
        if (0 > i(Ls, Z)) Wn < ye && 0 > i(_a, Ls) ? (R[ue] = _a, R[Wn] = Z, ue = Wn) : (R[ue] = Ls, R[tt] = Z, ue = tt);
        else if (Wn < ye && 0 > i(_a, Z)) R[ue] = _a, R[Wn] = Z, ue = Wn;
        else break e;
      }
    }
    return W;
  }
  function i(R, W) {
    var Z = R.sortIndex - W.sortIndex;
    return Z !== 0 ? Z : R.id - W.id;
  }
  if (typeof performance == "object" && typeof performance.now == "function") {
    var a = performance;
    e.unstable_now = function() {
      return a.now();
    };
  } else {
    var o = Date, s = o.now();
    e.unstable_now = function() {
      return o.now() - s;
    };
  }
  var l = [], c = [], d = 1, f = null, m = 3, w = !1, y = !1, x = !1, _ = typeof setTimeout == "function" ? setTimeout : null, u = typeof clearTimeout == "function" ? clearTimeout : null, p = typeof setImmediate < "u" ? setImmediate : null;
  typeof navigator < "u" && navigator.scheduling !== void 0 && navigator.scheduling.isInputPending !== void 0 && navigator.scheduling.isInputPending.bind(navigator.scheduling);
  function h(R) {
    for (var W = n(c); W !== null; ) {
      if (W.callback === null) r(c);
      else if (W.startTime <= R) r(c), W.sortIndex = W.expirationTime, t(l, W);
      else break;
      W = n(c);
    }
  }
  function g(R) {
    if (x = !1, h(R), !y) if (n(l) !== null) y = !0, ti(k);
    else {
      var W = n(c);
      W !== null && ni(g, W.startTime - R);
    }
  }
  function k(R, W) {
    y = !1, x && (x = !1, u(L), L = -1), w = !0;
    var Z = m;
    try {
      for (h(W), f = n(l); f !== null && (!(f.expirationTime > W) || R && !A()); ) {
        var ue = f.callback;
        if (typeof ue == "function") {
          f.callback = null, m = f.priorityLevel;
          var ye = ue(f.expirationTime <= W);
          W = e.unstable_now(), typeof ye == "function" ? f.callback = ye : f === n(l) && r(l), h(W);
        } else r(l);
        f = n(l);
      }
      if (f !== null) var zn = !0;
      else {
        var tt = n(c);
        tt !== null && ni(g, tt.startTime - W), zn = !1;
      }
      return zn;
    } finally {
      f = null, m = Z, w = !1;
    }
  }
  var C = !1, S = null, L = -1, M = 5, T = -1;
  function A() {
    return !(e.unstable_now() - T < M);
  }
  function le() {
    if (S !== null) {
      var R = e.unstable_now();
      T = R;
      var W = !0;
      try {
        W = S(!0, R);
      } finally {
        W ? xt() : (C = !1, S = null);
      }
    } else C = !1;
  }
  var xt;
  if (typeof p == "function") xt = function() {
    p(le);
  };
  else if (typeof MessageChannel < "u") {
    var lr = new MessageChannel(), ei = lr.port2;
    lr.port1.onmessage = le, xt = function() {
      ei.postMessage(null);
    };
  } else xt = function() {
    _(le, 0);
  };
  function ti(R) {
    S = R, C || (C = !0, xt());
  }
  function ni(R, W) {
    L = _(function() {
      R(e.unstable_now());
    }, W);
  }
  e.unstable_IdlePriority = 5, e.unstable_ImmediatePriority = 1, e.unstable_LowPriority = 4, e.unstable_NormalPriority = 3, e.unstable_Profiling = null, e.unstable_UserBlockingPriority = 2, e.unstable_cancelCallback = function(R) {
    R.callback = null;
  }, e.unstable_continueExecution = function() {
    y || w || (y = !0, ti(k));
  }, e.unstable_forceFrameRate = function(R) {
    0 > R || 125 < R ? console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported") : M = 0 < R ? Math.floor(1e3 / R) : 5;
  }, e.unstable_getCurrentPriorityLevel = function() {
    return m;
  }, e.unstable_getFirstCallbackNode = function() {
    return n(l);
  }, e.unstable_next = function(R) {
    switch (m) {
      case 1:
      case 2:
      case 3:
        var W = 3;
        break;
      default:
        W = m;
    }
    var Z = m;
    m = W;
    try {
      return R();
    } finally {
      m = Z;
    }
  }, e.unstable_pauseExecution = function() {
  }, e.unstable_requestPaint = function() {
  }, e.unstable_runWithPriority = function(R, W) {
    switch (R) {
      case 1:
      case 2:
      case 3:
      case 4:
      case 5:
        break;
      default:
        R = 3;
    }
    var Z = m;
    m = R;
    try {
      return W();
    } finally {
      m = Z;
    }
  }, e.unstable_scheduleCallback = function(R, W, Z) {
    var ue = e.unstable_now();
    switch (typeof Z == "object" && Z !== null ? (Z = Z.delay, Z = typeof Z == "number" && 0 < Z ? ue + Z : ue) : Z = ue, R) {
      case 1:
        var ye = -1;
        break;
      case 2:
        ye = 250;
        break;
      case 5:
        ye = 1073741823;
        break;
      case 4:
        ye = 1e4;
        break;
      default:
        ye = 5e3;
    }
    return ye = Z + ye, R = { id: d++, callback: W, priorityLevel: R, startTime: Z, expirationTime: ye, sortIndex: -1 }, Z > ue ? (R.sortIndex = Z, t(c, R), n(l) === null && R === n(c) && (x ? (u(L), L = -1) : x = !0, ni(g, Z - ue))) : (R.sortIndex = ye, t(l, R), y || w || (y = !0, ti(k))), R;
  }, e.unstable_shouldYield = A, e.unstable_wrapCallback = function(R) {
    var W = m;
    return function() {
      var Z = m;
      m = W;
      try {
        return R.apply(this, arguments);
      } finally {
        m = Z;
      }
    };
  };
})(yx);
gx.exports = yx;
var f4 = gx.exports;
var x4 = ae, ut = f4;
function b(e) {
  for (var t = "https://reactjs.org/docs/error-decoder.html?invariant=" + e, n = 1; n < arguments.length; n++) t += "&args[]=" + encodeURIComponent(arguments[n]);
  return "Minified React error #" + e + "; visit " + t + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
}
var wx = /* @__PURE__ */ new Set(), Xi = {};
function or(e, t) {
  Br(e, t), Br(e + "Capture", t);
}
function Br(e, t) {
  for (Xi[e] = t, e = 0; e < t.length; e++) wx.add(t[e]);
}
var on = !(typeof window > "u" || typeof window.document > "u" || typeof window.document.createElement > "u"), Il = Object.prototype.hasOwnProperty, p4 = /^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/, T0 = {}, P0 = {};
function h4(e) {
  return Il.call(P0, e) ? !0 : Il.call(T0, e) ? !1 : p4.test(e) ? P0[e] = !0 : (T0[e] = !0, !1);
}
function m4(e, t, n, r) {
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
function v4(e, t, n, r) {
  if (t === null || typeof t > "u" || m4(e, t, n, r)) return !0;
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
function Ze(e, t, n, r, i, a, o) {
  this.acceptsBooleans = t === 2 || t === 3 || t === 4, this.attributeName = r, this.attributeNamespace = i, this.mustUseProperty = n, this.propertyName = e, this.type = t, this.sanitizeURL = a, this.removeEmptyString = o;
}
var De = {};
"children dangerouslySetInnerHTML defaultValue defaultChecked innerHTML suppressContentEditableWarning suppressHydrationWarning style".split(" ").forEach(function(e) {
  De[e] = new Ze(e, 0, !1, e, null, !1, !1);
});
[["acceptCharset", "accept-charset"], ["className", "class"], ["htmlFor", "for"], ["httpEquiv", "http-equiv"]].forEach(function(e) {
  var t = e[0];
  De[t] = new Ze(t, 1, !1, e[1], null, !1, !1);
});
["contentEditable", "draggable", "spellCheck", "value"].forEach(function(e) {
  De[e] = new Ze(e, 2, !1, e.toLowerCase(), null, !1, !1);
});
["autoReverse", "externalResourcesRequired", "focusable", "preserveAlpha"].forEach(function(e) {
  De[e] = new Ze(e, 2, !1, e, null, !1, !1);
});
"allowFullScreen async autoFocus autoPlay controls default defer disabled disablePictureInPicture disableRemotePlayback formNoValidate hidden loop noModule noValidate open playsInline readOnly required reversed scoped seamless itemScope".split(" ").forEach(function(e) {
  De[e] = new Ze(e, 3, !1, e.toLowerCase(), null, !1, !1);
});
["checked", "multiple", "muted", "selected"].forEach(function(e) {
  De[e] = new Ze(e, 3, !0, e, null, !1, !1);
});
["capture", "download"].forEach(function(e) {
  De[e] = new Ze(e, 4, !1, e, null, !1, !1);
});
["cols", "rows", "size", "span"].forEach(function(e) {
  De[e] = new Ze(e, 6, !1, e, null, !1, !1);
});
["rowSpan", "start"].forEach(function(e) {
  De[e] = new Ze(e, 5, !1, e.toLowerCase(), null, !1, !1);
});
var Yu = /[\-:]([a-z])/g;
function Xu(e) {
  return e[1].toUpperCase();
}
"accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height".split(" ").forEach(function(e) {
  var t = e.replace(
    Yu,
    Xu
  );
  De[t] = new Ze(t, 1, !1, e, null, !1, !1);
});
"xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type".split(" ").forEach(function(e) {
  var t = e.replace(Yu, Xu);
  De[t] = new Ze(t, 1, !1, e, "http://www.w3.org/1999/xlink", !1, !1);
});
["xml:base", "xml:lang", "xml:space"].forEach(function(e) {
  var t = e.replace(Yu, Xu);
  De[t] = new Ze(t, 1, !1, e, "http://www.w3.org/XML/1998/namespace", !1, !1);
});
["tabIndex", "crossOrigin"].forEach(function(e) {
  De[e] = new Ze(e, 1, !1, e.toLowerCase(), null, !1, !1);
});
De.xlinkHref = new Ze("xlinkHref", 1, !1, "xlink:href", "http://www.w3.org/1999/xlink", !0, !1);
["src", "href", "action", "formAction"].forEach(function(e) {
  De[e] = new Ze(e, 1, !1, e.toLowerCase(), null, !0, !0);
});
function Qu(e, t, n, r) {
  var i = De.hasOwnProperty(t) ? De[t] : null;
  (i !== null ? i.type !== 0 : r || !(2 < t.length) || t[0] !== "o" && t[0] !== "O" || t[1] !== "n" && t[1] !== "N") && (v4(t, n, i, r) && (n = null), r || i === null ? h4(t) && (n === null ? e.removeAttribute(t) : e.setAttribute(t, "" + n)) : i.mustUseProperty ? e[i.propertyName] = n === null ? i.type === 3 ? !1 : "" : n : (t = i.attributeName, r = i.attributeNamespace, n === null ? e.removeAttribute(t) : (i = i.type, n = i === 3 || i === 4 && n === !0 ? "" : "" + n, r ? e.setAttributeNS(r, t, n) : e.setAttribute(t, n))));
}
var dn = x4.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED, ba = Symbol.for("react.element"), gr = Symbol.for("react.portal"), yr = Symbol.for("react.fragment"), Ju = Symbol.for("react.strict_mode"), Rl = Symbol.for("react.profiler"), _x = Symbol.for("react.provider"), kx = Symbol.for("react.context"), Ku = Symbol.for("react.forward_ref"), Dl = Symbol.for("react.suspense"), Ml = Symbol.for("react.suspense_list"), qu = Symbol.for("react.memo"), pn = Symbol.for("react.lazy"), Sx = Symbol.for("react.offscreen"), N0 = Symbol.iterator;
function ai(e) {
  return e === null || typeof e != "object" ? null : (e = N0 && e[N0] || e["@@iterator"], typeof e == "function" ? e : null);
}
var ve = Object.assign, zs;
function hi(e) {
  if (zs === void 0) try {
    throw Error();
  } catch (n) {
    var t = n.stack.trim().match(/\n( *(at )?)/);
    zs = t && t[1] || "";
  }
  return `
` + zs + e;
}
var Ws = !1;
function Vs(e, t) {
  if (!e || Ws) return "";
  Ws = !0;
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
      for (var i = c.stack.split(`
`), a = r.stack.split(`
`), o = i.length - 1, s = a.length - 1; 1 <= o && 0 <= s && i[o] !== a[s]; ) s--;
      for (; 1 <= o && 0 <= s; o--, s--) if (i[o] !== a[s]) {
        if (o !== 1 || s !== 1)
          do
            if (o--, s--, 0 > s || i[o] !== a[s]) {
              var l = `
` + i[o].replace(" at new ", " at ");
              return e.displayName && l.includes("<anonymous>") && (l = l.replace("<anonymous>", e.displayName)), l;
            }
          while (1 <= o && 0 <= s);
        break;
      }
    }
  } finally {
    Ws = !1, Error.prepareStackTrace = n;
  }
  return (e = e ? e.displayName || e.name : "") ? hi(e) : "";
}
function g4(e) {
  switch (e.tag) {
    case 5:
      return hi(e.type);
    case 16:
      return hi("Lazy");
    case 13:
      return hi("Suspense");
    case 19:
      return hi("SuspenseList");
    case 0:
    case 2:
    case 15:
      return e = Vs(e.type, !1), e;
    case 11:
      return e = Vs(e.type.render, !1), e;
    case 1:
      return e = Vs(e.type, !0), e;
    default:
      return "";
  }
}
function Ol(e) {
  if (e == null) return null;
  if (typeof e == "function") return e.displayName || e.name || null;
  if (typeof e == "string") return e;
  switch (e) {
    case yr:
      return "Fragment";
    case gr:
      return "Portal";
    case Rl:
      return "Profiler";
    case Ju:
      return "StrictMode";
    case Dl:
      return "Suspense";
    case Ml:
      return "SuspenseList";
  }
  if (typeof e == "object") switch (e.$$typeof) {
    case kx:
      return (e.displayName || "Context") + ".Consumer";
    case _x:
      return (e._context.displayName || "Context") + ".Provider";
    case Ku:
      var t = e.render;
      return e = e.displayName, e || (e = t.displayName || t.name || "", e = e !== "" ? "ForwardRef(" + e + ")" : "ForwardRef"), e;
    case qu:
      return t = e.displayName || null, t !== null ? t : Ol(e.type) || "Memo";
    case pn:
      t = e._payload, e = e._init;
      try {
        return Ol(e(t));
      } catch {
      }
  }
  return null;
}
function y4(e) {
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
      return Ol(t);
    case 8:
      return t === Ju ? "StrictMode" : "Mode";
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
function Mn(e) {
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
function Cx(e) {
  var t = e.type;
  return (e = e.nodeName) && e.toLowerCase() === "input" && (t === "checkbox" || t === "radio");
}
function w4(e) {
  var t = Cx(e) ? "checked" : "value", n = Object.getOwnPropertyDescriptor(e.constructor.prototype, t), r = "" + e[t];
  if (!e.hasOwnProperty(t) && typeof n < "u" && typeof n.get == "function" && typeof n.set == "function") {
    var i = n.get, a = n.set;
    return Object.defineProperty(e, t, { configurable: !0, get: function() {
      return i.call(this);
    }, set: function(o) {
      r = "" + o, a.call(this, o);
    } }), Object.defineProperty(e, t, { enumerable: n.enumerable }), { getValue: function() {
      return r;
    }, setValue: function(o) {
      r = "" + o;
    }, stopTracking: function() {
      e._valueTracker = null, delete e[t];
    } };
  }
}
function Ea(e) {
  e._valueTracker || (e._valueTracker = w4(e));
}
function bx(e) {
  if (!e) return !1;
  var t = e._valueTracker;
  if (!t) return !0;
  var n = t.getValue(), r = "";
  return e && (r = Cx(e) ? e.checked ? "true" : "false" : e.value), e = r, e !== n ? (t.setValue(e), !0) : !1;
}
function So(e) {
  if (e = e || (typeof document < "u" ? document : void 0), typeof e > "u") return null;
  try {
    return e.activeElement || e.body;
  } catch {
    return e.body;
  }
}
function Hl(e, t) {
  var n = t.checked;
  return ve({}, t, { defaultChecked: void 0, defaultValue: void 0, value: void 0, checked: n ?? e._wrapperState.initialChecked });
}
function L0(e, t) {
  var n = t.defaultValue == null ? "" : t.defaultValue, r = t.checked != null ? t.checked : t.defaultChecked;
  n = Mn(t.value != null ? t.value : n), e._wrapperState = { initialChecked: r, initialValue: n, controlled: t.type === "checkbox" || t.type === "radio" ? t.checked != null : t.value != null };
}
function Ex(e, t) {
  t = t.checked, t != null && Qu(e, "checked", t, !1);
}
function Al(e, t) {
  Ex(e, t);
  var n = Mn(t.value), r = t.type;
  if (n != null) r === "number" ? (n === 0 && e.value === "" || e.value != n) && (e.value = "" + n) : e.value !== "" + n && (e.value = "" + n);
  else if (r === "submit" || r === "reset") {
    e.removeAttribute("value");
    return;
  }
  t.hasOwnProperty("value") ? jl(e, t.type, n) : t.hasOwnProperty("defaultValue") && jl(e, t.type, Mn(t.defaultValue)), t.checked == null && t.defaultChecked != null && (e.defaultChecked = !!t.defaultChecked);
}
function I0(e, t, n) {
  if (t.hasOwnProperty("value") || t.hasOwnProperty("defaultValue")) {
    var r = t.type;
    if (!(r !== "submit" && r !== "reset" || t.value !== void 0 && t.value !== null)) return;
    t = "" + e._wrapperState.initialValue, n || t === e.value || (e.value = t), e.defaultValue = t;
  }
  n = e.name, n !== "" && (e.name = ""), e.defaultChecked = !!e._wrapperState.initialChecked, n !== "" && (e.name = n);
}
function jl(e, t, n) {
  (t !== "number" || So(e.ownerDocument) !== e) && (n == null ? e.defaultValue = "" + e._wrapperState.initialValue : e.defaultValue !== "" + n && (e.defaultValue = "" + n));
}
var mi = Array.isArray;
function Rr(e, t, n, r) {
  if (e = e.options, t) {
    t = {};
    for (var i = 0; i < n.length; i++) t["$" + n[i]] = !0;
    for (n = 0; n < e.length; n++) i = t.hasOwnProperty("$" + e[n].value), e[n].selected !== i && (e[n].selected = i), i && r && (e[n].defaultSelected = !0);
  } else {
    for (n = "" + Mn(n), t = null, i = 0; i < e.length; i++) {
      if (e[i].value === n) {
        e[i].selected = !0, r && (e[i].defaultSelected = !0);
        return;
      }
      t !== null || e[i].disabled || (t = e[i]);
    }
    t !== null && (t.selected = !0);
  }
}
function Fl(e, t) {
  if (t.dangerouslySetInnerHTML != null) throw Error(b(91));
  return ve({}, t, { value: void 0, defaultValue: void 0, children: "" + e._wrapperState.initialValue });
}
function R0(e, t) {
  var n = t.value;
  if (n == null) {
    if (n = t.children, t = t.defaultValue, n != null) {
      if (t != null) throw Error(b(92));
      if (mi(n)) {
        if (1 < n.length) throw Error(b(93));
        n = n[0];
      }
      t = n;
    }
    t == null && (t = ""), n = t;
  }
  e._wrapperState = { initialValue: Mn(n) };
}
function Tx(e, t) {
  var n = Mn(t.value), r = Mn(t.defaultValue);
  n != null && (n = "" + n, n !== e.value && (e.value = n), t.defaultValue == null && e.defaultValue !== n && (e.defaultValue = n)), r != null && (e.defaultValue = "" + r);
}
function D0(e) {
  var t = e.textContent;
  t === e._wrapperState.initialValue && t !== "" && t !== null && (e.value = t);
}
function Px(e) {
  switch (e) {
    case "svg":
      return "http://www.w3.org/2000/svg";
    case "math":
      return "http://www.w3.org/1998/Math/MathML";
    default:
      return "http://www.w3.org/1999/xhtml";
  }
}
function zl(e, t) {
  return e == null || e === "http://www.w3.org/1999/xhtml" ? Px(t) : e === "http://www.w3.org/2000/svg" && t === "foreignObject" ? "http://www.w3.org/1999/xhtml" : e;
}
var Ta, Nx = function(e) {
  return typeof MSApp < "u" && MSApp.execUnsafeLocalFunction ? function(t, n, r, i) {
    MSApp.execUnsafeLocalFunction(function() {
      return e(t, n, r, i);
    });
  } : e;
}(function(e, t) {
  if (e.namespaceURI !== "http://www.w3.org/2000/svg" || "innerHTML" in e) e.innerHTML = t;
  else {
    for (Ta = Ta || document.createElement("div"), Ta.innerHTML = "<svg>" + t.valueOf().toString() + "</svg>", t = Ta.firstChild; e.firstChild; ) e.removeChild(e.firstChild);
    for (; t.firstChild; ) e.appendChild(t.firstChild);
  }
});
function Qi(e, t) {
  if (t) {
    var n = e.firstChild;
    if (n && n === e.lastChild && n.nodeType === 3) {
      n.nodeValue = t;
      return;
    }
  }
  e.textContent = t;
}
var wi = {
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
}, _4 = ["Webkit", "ms", "Moz", "O"];
Object.keys(wi).forEach(function(e) {
  _4.forEach(function(t) {
    t = t + e.charAt(0).toUpperCase() + e.substring(1), wi[t] = wi[e];
  });
});
function Lx(e, t, n) {
  return t == null || typeof t == "boolean" || t === "" ? "" : n || typeof t != "number" || t === 0 || wi.hasOwnProperty(e) && wi[e] ? ("" + t).trim() : t + "px";
}
function Ix(e, t) {
  e = e.style;
  for (var n in t) if (t.hasOwnProperty(n)) {
    var r = n.indexOf("--") === 0, i = Lx(n, t[n], r);
    n === "float" && (n = "cssFloat"), r ? e.setProperty(n, i) : e[n] = i;
  }
}
var k4 = ve({ menuitem: !0 }, { area: !0, base: !0, br: !0, col: !0, embed: !0, hr: !0, img: !0, input: !0, keygen: !0, link: !0, meta: !0, param: !0, source: !0, track: !0, wbr: !0 });
function Wl(e, t) {
  if (t) {
    if (k4[e] && (t.children != null || t.dangerouslySetInnerHTML != null)) throw Error(b(137, e));
    if (t.dangerouslySetInnerHTML != null) {
      if (t.children != null) throw Error(b(60));
      if (typeof t.dangerouslySetInnerHTML != "object" || !("__html" in t.dangerouslySetInnerHTML)) throw Error(b(61));
    }
    if (t.style != null && typeof t.style != "object") throw Error(b(62));
  }
}
function Vl(e, t) {
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
var Bl = null;
function ec(e) {
  return e = e.target || e.srcElement || window, e.correspondingUseElement && (e = e.correspondingUseElement), e.nodeType === 3 ? e.parentNode : e;
}
var Ul = null, Dr = null, Mr = null;
function M0(e) {
  if (e = ya(e)) {
    if (typeof Ul != "function") throw Error(b(280));
    var t = e.stateNode;
    t && (t = ys(t), Ul(e.stateNode, e.type, t));
  }
}
function Rx(e) {
  Dr ? Mr ? Mr.push(e) : Mr = [e] : Dr = e;
}
function Dx() {
  if (Dr) {
    var e = Dr, t = Mr;
    if (Mr = Dr = null, M0(e), t) for (e = 0; e < t.length; e++) M0(t[e]);
  }
}
function Mx(e, t) {
  return e(t);
}
function Ox() {
}
var Bs = !1;
function Hx(e, t, n) {
  if (Bs) return e(t, n);
  Bs = !0;
  try {
    return Mx(e, t, n);
  } finally {
    Bs = !1, (Dr !== null || Mr !== null) && (Ox(), Dx());
  }
}
function Ji(e, t) {
  var n = e.stateNode;
  if (n === null) return null;
  var r = ys(n);
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
  if (n && typeof n != "function") throw Error(b(231, t, typeof n));
  return n;
}
var $l = !1;
if (on) try {
  var oi = {};
  Object.defineProperty(oi, "passive", { get: function() {
    $l = !0;
  } }), window.addEventListener("test", oi, oi), window.removeEventListener("test", oi, oi);
} catch {
  $l = !1;
}
function S4(e, t, n, r, i, a, o, s, l) {
  var c = Array.prototype.slice.call(arguments, 3);
  try {
    t.apply(n, c);
  } catch (d) {
    this.onError(d);
  }
}
var _i = !1, Co = null, bo = !1, Zl = null, C4 = { onError: function(e) {
  _i = !0, Co = e;
} };
function b4(e, t, n, r, i, a, o, s, l) {
  _i = !1, Co = null, S4.apply(C4, arguments);
}
function E4(e, t, n, r, i, a, o, s, l) {
  if (b4.apply(this, arguments), _i) {
    if (_i) {
      var c = Co;
      _i = !1, Co = null;
    } else throw Error(b(198));
    bo || (bo = !0, Zl = c);
  }
}
function sr(e) {
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
function Ax(e) {
  if (e.tag === 13) {
    var t = e.memoizedState;
    if (t === null && (e = e.alternate, e !== null && (t = e.memoizedState)), t !== null) return t.dehydrated;
  }
  return null;
}
function O0(e) {
  if (sr(e) !== e) throw Error(b(188));
}
function T4(e) {
  var t = e.alternate;
  if (!t) {
    if (t = sr(e), t === null) throw Error(b(188));
    return t !== e ? null : e;
  }
  for (var n = e, r = t; ; ) {
    var i = n.return;
    if (i === null) break;
    var a = i.alternate;
    if (a === null) {
      if (r = i.return, r !== null) {
        n = r;
        continue;
      }
      break;
    }
    if (i.child === a.child) {
      for (a = i.child; a; ) {
        if (a === n) return O0(i), e;
        if (a === r) return O0(i), t;
        a = a.sibling;
      }
      throw Error(b(188));
    }
    if (n.return !== r.return) n = i, r = a;
    else {
      for (var o = !1, s = i.child; s; ) {
        if (s === n) {
          o = !0, n = i, r = a;
          break;
        }
        if (s === r) {
          o = !0, r = i, n = a;
          break;
        }
        s = s.sibling;
      }
      if (!o) {
        for (s = a.child; s; ) {
          if (s === n) {
            o = !0, n = a, r = i;
            break;
          }
          if (s === r) {
            o = !0, r = a, n = i;
            break;
          }
          s = s.sibling;
        }
        if (!o) throw Error(b(189));
      }
    }
    if (n.alternate !== r) throw Error(b(190));
  }
  if (n.tag !== 3) throw Error(b(188));
  return n.stateNode.current === n ? e : t;
}
function jx(e) {
  return e = T4(e), e !== null ? Fx(e) : null;
}
function Fx(e) {
  if (e.tag === 5 || e.tag === 6) return e;
  for (e = e.child; e !== null; ) {
    var t = Fx(e);
    if (t !== null) return t;
    e = e.sibling;
  }
  return null;
}
var zx = ut.unstable_scheduleCallback, H0 = ut.unstable_cancelCallback, P4 = ut.unstable_shouldYield, N4 = ut.unstable_requestPaint, we = ut.unstable_now, L4 = ut.unstable_getCurrentPriorityLevel, tc = ut.unstable_ImmediatePriority, Wx = ut.unstable_UserBlockingPriority, Eo = ut.unstable_NormalPriority, I4 = ut.unstable_LowPriority, Vx = ut.unstable_IdlePriority, hs = null, Zt = null;
function R4(e) {
  if (Zt && typeof Zt.onCommitFiberRoot == "function") try {
    Zt.onCommitFiberRoot(hs, e, void 0, (e.current.flags & 128) === 128);
  } catch {
  }
}
var Lt = Math.clz32 ? Math.clz32 : O4, D4 = Math.log, M4 = Math.LN2;
function O4(e) {
  return e >>>= 0, e === 0 ? 32 : 31 - (D4(e) / M4 | 0) | 0;
}
var Pa = 64, Na = 4194304;
function vi(e) {
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
function To(e, t) {
  var n = e.pendingLanes;
  if (n === 0) return 0;
  var r = 0, i = e.suspendedLanes, a = e.pingedLanes, o = n & 268435455;
  if (o !== 0) {
    var s = o & ~i;
    s !== 0 ? r = vi(s) : (a &= o, a !== 0 && (r = vi(a)));
  } else o = n & ~i, o !== 0 ? r = vi(o) : a !== 0 && (r = vi(a));
  if (r === 0) return 0;
  if (t !== 0 && t !== r && !(t & i) && (i = r & -r, a = t & -t, i >= a || i === 16 && (a & 4194240) !== 0)) return t;
  if (r & 4 && (r |= n & 16), t = e.entangledLanes, t !== 0) for (e = e.entanglements, t &= r; 0 < t; ) n = 31 - Lt(t), i = 1 << n, r |= e[n], t &= ~i;
  return r;
}
function H4(e, t) {
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
function A4(e, t) {
  for (var n = e.suspendedLanes, r = e.pingedLanes, i = e.expirationTimes, a = e.pendingLanes; 0 < a; ) {
    var o = 31 - Lt(a), s = 1 << o, l = i[o];
    l === -1 ? (!(s & n) || s & r) && (i[o] = H4(s, t)) : l <= t && (e.expiredLanes |= s), a &= ~s;
  }
}
function Gl(e) {
  return e = e.pendingLanes & -1073741825, e !== 0 ? e : e & 1073741824 ? 1073741824 : 0;
}
function Bx() {
  var e = Pa;
  return Pa <<= 1, !(Pa & 4194240) && (Pa = 64), e;
}
function Us(e) {
  for (var t = [], n = 0; 31 > n; n++) t.push(e);
  return t;
}
function va(e, t, n) {
  e.pendingLanes |= t, t !== 536870912 && (e.suspendedLanes = 0, e.pingedLanes = 0), e = e.eventTimes, t = 31 - Lt(t), e[t] = n;
}
function j4(e, t) {
  var n = e.pendingLanes & ~t;
  e.pendingLanes = t, e.suspendedLanes = 0, e.pingedLanes = 0, e.expiredLanes &= t, e.mutableReadLanes &= t, e.entangledLanes &= t, t = e.entanglements;
  var r = e.eventTimes;
  for (e = e.expirationTimes; 0 < n; ) {
    var i = 31 - Lt(n), a = 1 << i;
    t[i] = 0, r[i] = -1, e[i] = -1, n &= ~a;
  }
}
function nc(e, t) {
  var n = e.entangledLanes |= t;
  for (e = e.entanglements; n; ) {
    var r = 31 - Lt(n), i = 1 << r;
    i & t | e[r] & t && (e[r] |= t), n &= ~i;
  }
}
var re = 0;
function Ux(e) {
  return e &= -e, 1 < e ? 4 < e ? e & 268435455 ? 16 : 536870912 : 4 : 1;
}
var $x, rc, Zx, Gx, Yx, Yl = !1, La = [], kn = null, Sn = null, Cn = null, Ki = /* @__PURE__ */ new Map(), qi = /* @__PURE__ */ new Map(), vn = [], F4 = "mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit".split(" ");
function A0(e, t) {
  switch (e) {
    case "focusin":
    case "focusout":
      kn = null;
      break;
    case "dragenter":
    case "dragleave":
      Sn = null;
      break;
    case "mouseover":
    case "mouseout":
      Cn = null;
      break;
    case "pointerover":
    case "pointerout":
      Ki.delete(t.pointerId);
      break;
    case "gotpointercapture":
    case "lostpointercapture":
      qi.delete(t.pointerId);
  }
}
function si(e, t, n, r, i, a) {
  return e === null || e.nativeEvent !== a ? (e = { blockedOn: t, domEventName: n, eventSystemFlags: r, nativeEvent: a, targetContainers: [i] }, t !== null && (t = ya(t), t !== null && rc(t)), e) : (e.eventSystemFlags |= r, t = e.targetContainers, i !== null && t.indexOf(i) === -1 && t.push(i), e);
}
function z4(e, t, n, r, i) {
  switch (t) {
    case "focusin":
      return kn = si(kn, e, t, n, r, i), !0;
    case "dragenter":
      return Sn = si(Sn, e, t, n, r, i), !0;
    case "mouseover":
      return Cn = si(Cn, e, t, n, r, i), !0;
    case "pointerover":
      var a = i.pointerId;
      return Ki.set(a, si(Ki.get(a) || null, e, t, n, r, i)), !0;
    case "gotpointercapture":
      return a = i.pointerId, qi.set(a, si(qi.get(a) || null, e, t, n, r, i)), !0;
  }
  return !1;
}
function Xx(e) {
  var t = $n(e.target);
  if (t !== null) {
    var n = sr(t);
    if (n !== null) {
      if (t = n.tag, t === 13) {
        if (t = Ax(n), t !== null) {
          e.blockedOn = t, Yx(e.priority, function() {
            Zx(n);
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
function Ya(e) {
  if (e.blockedOn !== null) return !1;
  for (var t = e.targetContainers; 0 < t.length; ) {
    var n = Xl(e.domEventName, e.eventSystemFlags, t[0], e.nativeEvent);
    if (n === null) {
      n = e.nativeEvent;
      var r = new n.constructor(n.type, n);
      Bl = r, n.target.dispatchEvent(r), Bl = null;
    } else return t = ya(n), t !== null && rc(t), e.blockedOn = n, !1;
    t.shift();
  }
  return !0;
}
function j0(e, t, n) {
  Ya(e) && n.delete(t);
}
function W4() {
  Yl = !1, kn !== null && Ya(kn) && (kn = null), Sn !== null && Ya(Sn) && (Sn = null), Cn !== null && Ya(Cn) && (Cn = null), Ki.forEach(j0), qi.forEach(j0);
}
function li(e, t) {
  e.blockedOn === t && (e.blockedOn = null, Yl || (Yl = !0, ut.unstable_scheduleCallback(ut.unstable_NormalPriority, W4)));
}
function ea(e) {
  function t(i) {
    return li(i, e);
  }
  if (0 < La.length) {
    li(La[0], e);
    for (var n = 1; n < La.length; n++) {
      var r = La[n];
      r.blockedOn === e && (r.blockedOn = null);
    }
  }
  for (kn !== null && li(kn, e), Sn !== null && li(Sn, e), Cn !== null && li(Cn, e), Ki.forEach(t), qi.forEach(t), n = 0; n < vn.length; n++) r = vn[n], r.blockedOn === e && (r.blockedOn = null);
  for (; 0 < vn.length && (n = vn[0], n.blockedOn === null); ) Xx(n), n.blockedOn === null && vn.shift();
}
var Or = dn.ReactCurrentBatchConfig, Po = !0;
function V4(e, t, n, r) {
  var i = re, a = Or.transition;
  Or.transition = null;
  try {
    re = 1, ic(e, t, n, r);
  } finally {
    re = i, Or.transition = a;
  }
}
function B4(e, t, n, r) {
  var i = re, a = Or.transition;
  Or.transition = null;
  try {
    re = 4, ic(e, t, n, r);
  } finally {
    re = i, Or.transition = a;
  }
}
function ic(e, t, n, r) {
  if (Po) {
    var i = Xl(e, t, n, r);
    if (i === null) el(e, t, r, No, n), A0(e, r);
    else if (z4(i, e, t, n, r)) r.stopPropagation();
    else if (A0(e, r), t & 4 && -1 < F4.indexOf(e)) {
      for (; i !== null; ) {
        var a = ya(i);
        if (a !== null && $x(a), a = Xl(e, t, n, r), a === null && el(e, t, r, No, n), a === i) break;
        i = a;
      }
      i !== null && r.stopPropagation();
    } else el(e, t, r, null, n);
  }
}
var No = null;
function Xl(e, t, n, r) {
  if (No = null, e = ec(r), e = $n(e), e !== null) if (t = sr(e), t === null) e = null;
  else if (n = t.tag, n === 13) {
    if (e = Ax(t), e !== null) return e;
    e = null;
  } else if (n === 3) {
    if (t.stateNode.current.memoizedState.isDehydrated) return t.tag === 3 ? t.stateNode.containerInfo : null;
    e = null;
  } else t !== e && (e = null);
  return No = e, null;
}
function Qx(e) {
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
      switch (L4()) {
        case tc:
          return 1;
        case Wx:
          return 4;
        case Eo:
        case I4:
          return 16;
        case Vx:
          return 536870912;
        default:
          return 16;
      }
    default:
      return 16;
  }
}
var wn = null, ac = null, Xa = null;
function Jx() {
  if (Xa) return Xa;
  var e, t = ac, n = t.length, r, i = "value" in wn ? wn.value : wn.textContent, a = i.length;
  for (e = 0; e < n && t[e] === i[e]; e++) ;
  var o = n - e;
  for (r = 1; r <= o && t[n - r] === i[a - r]; r++) ;
  return Xa = i.slice(e, 1 < r ? 1 - r : void 0);
}
function Qa(e) {
  var t = e.keyCode;
  return "charCode" in e ? (e = e.charCode, e === 0 && t === 13 && (e = 13)) : e = t, e === 10 && (e = 13), 32 <= e || e === 13 ? e : 0;
}
function Ia() {
  return !0;
}
function F0() {
  return !1;
}
function ft(e) {
  function t(n, r, i, a, o) {
    this._reactName = n, this._targetInst = i, this.type = r, this.nativeEvent = a, this.target = o, this.currentTarget = null;
    for (var s in e) e.hasOwnProperty(s) && (n = e[s], this[s] = n ? n(a) : a[s]);
    return this.isDefaultPrevented = (a.defaultPrevented != null ? a.defaultPrevented : a.returnValue === !1) ? Ia : F0, this.isPropagationStopped = F0, this;
  }
  return ve(t.prototype, { preventDefault: function() {
    this.defaultPrevented = !0;
    var n = this.nativeEvent;
    n && (n.preventDefault ? n.preventDefault() : typeof n.returnValue != "unknown" && (n.returnValue = !1), this.isDefaultPrevented = Ia);
  }, stopPropagation: function() {
    var n = this.nativeEvent;
    n && (n.stopPropagation ? n.stopPropagation() : typeof n.cancelBubble != "unknown" && (n.cancelBubble = !0), this.isPropagationStopped = Ia);
  }, persist: function() {
  }, isPersistent: Ia }), t;
}
var Kr = { eventPhase: 0, bubbles: 0, cancelable: 0, timeStamp: function(e) {
  return e.timeStamp || Date.now();
}, defaultPrevented: 0, isTrusted: 0 }, oc = ft(Kr), ga = ve({}, Kr, { view: 0, detail: 0 }), U4 = ft(ga), $s, Zs, ui, ms = ve({}, ga, { screenX: 0, screenY: 0, clientX: 0, clientY: 0, pageX: 0, pageY: 0, ctrlKey: 0, shiftKey: 0, altKey: 0, metaKey: 0, getModifierState: sc, button: 0, buttons: 0, relatedTarget: function(e) {
  return e.relatedTarget === void 0 ? e.fromElement === e.srcElement ? e.toElement : e.fromElement : e.relatedTarget;
}, movementX: function(e) {
  return "movementX" in e ? e.movementX : (e !== ui && (ui && e.type === "mousemove" ? ($s = e.screenX - ui.screenX, Zs = e.screenY - ui.screenY) : Zs = $s = 0, ui = e), $s);
}, movementY: function(e) {
  return "movementY" in e ? e.movementY : Zs;
} }), z0 = ft(ms), $4 = ve({}, ms, { dataTransfer: 0 }), Z4 = ft($4), G4 = ve({}, ga, { relatedTarget: 0 }), Gs = ft(G4), Y4 = ve({}, Kr, { animationName: 0, elapsedTime: 0, pseudoElement: 0 }), X4 = ft(Y4), Q4 = ve({}, Kr, { clipboardData: function(e) {
  return "clipboardData" in e ? e.clipboardData : window.clipboardData;
} }), J4 = ft(Q4), K4 = ve({}, Kr, { data: 0 }), W0 = ft(K4), q4 = {
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
}, e3 = {
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
}, t3 = { Alt: "altKey", Control: "ctrlKey", Meta: "metaKey", Shift: "shiftKey" };
function n3(e) {
  var t = this.nativeEvent;
  return t.getModifierState ? t.getModifierState(e) : (e = t3[e]) ? !!t[e] : !1;
}
function sc() {
  return n3;
}
var r3 = ve({}, ga, { key: function(e) {
  if (e.key) {
    var t = q4[e.key] || e.key;
    if (t !== "Unidentified") return t;
  }
  return e.type === "keypress" ? (e = Qa(e), e === 13 ? "Enter" : String.fromCharCode(e)) : e.type === "keydown" || e.type === "keyup" ? e3[e.keyCode] || "Unidentified" : "";
}, code: 0, location: 0, ctrlKey: 0, shiftKey: 0, altKey: 0, metaKey: 0, repeat: 0, locale: 0, getModifierState: sc, charCode: function(e) {
  return e.type === "keypress" ? Qa(e) : 0;
}, keyCode: function(e) {
  return e.type === "keydown" || e.type === "keyup" ? e.keyCode : 0;
}, which: function(e) {
  return e.type === "keypress" ? Qa(e) : e.type === "keydown" || e.type === "keyup" ? e.keyCode : 0;
} }), i3 = ft(r3), a3 = ve({}, ms, { pointerId: 0, width: 0, height: 0, pressure: 0, tangentialPressure: 0, tiltX: 0, tiltY: 0, twist: 0, pointerType: 0, isPrimary: 0 }), V0 = ft(a3), o3 = ve({}, ga, { touches: 0, targetTouches: 0, changedTouches: 0, altKey: 0, metaKey: 0, ctrlKey: 0, shiftKey: 0, getModifierState: sc }), s3 = ft(o3), l3 = ve({}, Kr, { propertyName: 0, elapsedTime: 0, pseudoElement: 0 }), u3 = ft(l3), c3 = ve({}, ms, {
  deltaX: function(e) {
    return "deltaX" in e ? e.deltaX : "wheelDeltaX" in e ? -e.wheelDeltaX : 0;
  },
  deltaY: function(e) {
    return "deltaY" in e ? e.deltaY : "wheelDeltaY" in e ? -e.wheelDeltaY : "wheelDelta" in e ? -e.wheelDelta : 0;
  },
  deltaZ: 0,
  deltaMode: 0
}), d3 = ft(c3), f3 = [9, 13, 27, 32], lc = on && "CompositionEvent" in window, ki = null;
on && "documentMode" in document && (ki = document.documentMode);
var x3 = on && "TextEvent" in window && !ki, Kx = on && (!lc || ki && 8 < ki && 11 >= ki), B0 = " ", U0 = !1;
function qx(e, t) {
  switch (e) {
    case "keyup":
      return f3.indexOf(t.keyCode) !== -1;
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
function ep(e) {
  return e = e.detail, typeof e == "object" && "data" in e ? e.data : null;
}
var wr = !1;
function p3(e, t) {
  switch (e) {
    case "compositionend":
      return ep(t);
    case "keypress":
      return t.which !== 32 ? null : (U0 = !0, B0);
    case "textInput":
      return e = t.data, e === B0 && U0 ? null : e;
    default:
      return null;
  }
}
function h3(e, t) {
  if (wr) return e === "compositionend" || !lc && qx(e, t) ? (e = Jx(), Xa = ac = wn = null, wr = !1, e) : null;
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
      return Kx && t.locale !== "ko" ? null : t.data;
    default:
      return null;
  }
}
var m3 = { color: !0, date: !0, datetime: !0, "datetime-local": !0, email: !0, month: !0, number: !0, password: !0, range: !0, search: !0, tel: !0, text: !0, time: !0, url: !0, week: !0 };
function $0(e) {
  var t = e && e.nodeName && e.nodeName.toLowerCase();
  return t === "input" ? !!m3[e.type] : t === "textarea";
}
function tp(e, t, n, r) {
  Rx(r), t = Lo(t, "onChange"), 0 < t.length && (n = new oc("onChange", "change", null, n, r), e.push({ event: n, listeners: t }));
}
var Si = null, ta = null;
function v3(e) {
  fp(e, 0);
}
function vs(e) {
  var t = Sr(e);
  if (bx(t)) return e;
}
function g3(e, t) {
  if (e === "change") return t;
}
var np = !1;
if (on) {
  var Ys;
  if (on) {
    var Xs = "oninput" in document;
    if (!Xs) {
      var Z0 = document.createElement("div");
      Z0.setAttribute("oninput", "return;"), Xs = typeof Z0.oninput == "function";
    }
    Ys = Xs;
  } else Ys = !1;
  np = Ys && (!document.documentMode || 9 < document.documentMode);
}
function G0() {
  Si && (Si.detachEvent("onpropertychange", rp), ta = Si = null);
}
function rp(e) {
  if (e.propertyName === "value" && vs(ta)) {
    var t = [];
    tp(t, ta, e, ec(e)), Hx(v3, t);
  }
}
function y3(e, t, n) {
  e === "focusin" ? (G0(), Si = t, ta = n, Si.attachEvent("onpropertychange", rp)) : e === "focusout" && G0();
}
function w3(e) {
  if (e === "selectionchange" || e === "keyup" || e === "keydown") return vs(ta);
}
function _3(e, t) {
  if (e === "click") return vs(t);
}
function k3(e, t) {
  if (e === "input" || e === "change") return vs(t);
}
function S3(e, t) {
  return e === t && (e !== 0 || 1 / e === 1 / t) || e !== e && t !== t;
}
var Dt = typeof Object.is == "function" ? Object.is : S3;
function na(e, t) {
  if (Dt(e, t)) return !0;
  if (typeof e != "object" || e === null || typeof t != "object" || t === null) return !1;
  var n = Object.keys(e), r = Object.keys(t);
  if (n.length !== r.length) return !1;
  for (r = 0; r < n.length; r++) {
    var i = n[r];
    if (!Il.call(t, i) || !Dt(e[i], t[i])) return !1;
  }
  return !0;
}
function Y0(e) {
  for (; e && e.firstChild; ) e = e.firstChild;
  return e;
}
function X0(e, t) {
  var n = Y0(e);
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
    n = Y0(n);
  }
}
function ip(e, t) {
  return e && t ? e === t ? !0 : e && e.nodeType === 3 ? !1 : t && t.nodeType === 3 ? ip(e, t.parentNode) : "contains" in e ? e.contains(t) : e.compareDocumentPosition ? !!(e.compareDocumentPosition(t) & 16) : !1 : !1;
}
function ap() {
  for (var e = window, t = So(); t instanceof e.HTMLIFrameElement; ) {
    try {
      var n = typeof t.contentWindow.location.href == "string";
    } catch {
      n = !1;
    }
    if (n) e = t.contentWindow;
    else break;
    t = So(e.document);
  }
  return t;
}
function uc(e) {
  var t = e && e.nodeName && e.nodeName.toLowerCase();
  return t && (t === "input" && (e.type === "text" || e.type === "search" || e.type === "tel" || e.type === "url" || e.type === "password") || t === "textarea" || e.contentEditable === "true");
}
function C3(e) {
  var t = ap(), n = e.focusedElem, r = e.selectionRange;
  if (t !== n && n && n.ownerDocument && ip(n.ownerDocument.documentElement, n)) {
    if (r !== null && uc(n)) {
      if (t = r.start, e = r.end, e === void 0 && (e = t), "selectionStart" in n) n.selectionStart = t, n.selectionEnd = Math.min(e, n.value.length);
      else if (e = (t = n.ownerDocument || document) && t.defaultView || window, e.getSelection) {
        e = e.getSelection();
        var i = n.textContent.length, a = Math.min(r.start, i);
        r = r.end === void 0 ? a : Math.min(r.end, i), !e.extend && a > r && (i = r, r = a, a = i), i = X0(n, a);
        var o = X0(
          n,
          r
        );
        i && o && (e.rangeCount !== 1 || e.anchorNode !== i.node || e.anchorOffset !== i.offset || e.focusNode !== o.node || e.focusOffset !== o.offset) && (t = t.createRange(), t.setStart(i.node, i.offset), e.removeAllRanges(), a > r ? (e.addRange(t), e.extend(o.node, o.offset)) : (t.setEnd(o.node, o.offset), e.addRange(t)));
      }
    }
    for (t = [], e = n; e = e.parentNode; ) e.nodeType === 1 && t.push({ element: e, left: e.scrollLeft, top: e.scrollTop });
    for (typeof n.focus == "function" && n.focus(), n = 0; n < t.length; n++) e = t[n], e.element.scrollLeft = e.left, e.element.scrollTop = e.top;
  }
}
var b3 = on && "documentMode" in document && 11 >= document.documentMode, _r = null, Ql = null, Ci = null, Jl = !1;
function Q0(e, t, n) {
  var r = n.window === n ? n.document : n.nodeType === 9 ? n : n.ownerDocument;
  Jl || _r == null || _r !== So(r) || (r = _r, "selectionStart" in r && uc(r) ? r = { start: r.selectionStart, end: r.selectionEnd } : (r = (r.ownerDocument && r.ownerDocument.defaultView || window).getSelection(), r = { anchorNode: r.anchorNode, anchorOffset: r.anchorOffset, focusNode: r.focusNode, focusOffset: r.focusOffset }), Ci && na(Ci, r) || (Ci = r, r = Lo(Ql, "onSelect"), 0 < r.length && (t = new oc("onSelect", "select", null, t, n), e.push({ event: t, listeners: r }), t.target = _r)));
}
function Ra(e, t) {
  var n = {};
  return n[e.toLowerCase()] = t.toLowerCase(), n["Webkit" + e] = "webkit" + t, n["Moz" + e] = "moz" + t, n;
}
var kr = { animationend: Ra("Animation", "AnimationEnd"), animationiteration: Ra("Animation", "AnimationIteration"), animationstart: Ra("Animation", "AnimationStart"), transitionend: Ra("Transition", "TransitionEnd") }, Qs = {}, op = {};
on && (op = document.createElement("div").style, "AnimationEvent" in window || (delete kr.animationend.animation, delete kr.animationiteration.animation, delete kr.animationstart.animation), "TransitionEvent" in window || delete kr.transitionend.transition);
function gs(e) {
  if (Qs[e]) return Qs[e];
  if (!kr[e]) return e;
  var t = kr[e], n;
  for (n in t) if (t.hasOwnProperty(n) && n in op) return Qs[e] = t[n];
  return e;
}
var sp = gs("animationend"), lp = gs("animationiteration"), up = gs("animationstart"), cp = gs("transitionend"), dp = /* @__PURE__ */ new Map(), J0 = "abort auxClick cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");
function An(e, t) {
  dp.set(e, t), or(t, [e]);
}
for (var Js = 0; Js < J0.length; Js++) {
  var Ks = J0[Js], E3 = Ks.toLowerCase(), T3 = Ks[0].toUpperCase() + Ks.slice(1);
  An(E3, "on" + T3);
}
An(sp, "onAnimationEnd");
An(lp, "onAnimationIteration");
An(up, "onAnimationStart");
An("dblclick", "onDoubleClick");
An("focusin", "onFocus");
An("focusout", "onBlur");
An(cp, "onTransitionEnd");
Br("onMouseEnter", ["mouseout", "mouseover"]);
Br("onMouseLeave", ["mouseout", "mouseover"]);
Br("onPointerEnter", ["pointerout", "pointerover"]);
Br("onPointerLeave", ["pointerout", "pointerover"]);
or("onChange", "change click focusin focusout input keydown keyup selectionchange".split(" "));
or("onSelect", "focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" "));
or("onBeforeInput", ["compositionend", "keypress", "textInput", "paste"]);
or("onCompositionEnd", "compositionend focusout keydown keypress keyup mousedown".split(" "));
or("onCompositionStart", "compositionstart focusout keydown keypress keyup mousedown".split(" "));
or("onCompositionUpdate", "compositionupdate focusout keydown keypress keyup mousedown".split(" "));
var gi = "abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" "), P3 = new Set("cancel close invalid load scroll toggle".split(" ").concat(gi));
function K0(e, t, n) {
  var r = e.type || "unknown-event";
  e.currentTarget = n, E4(r, t, void 0, e), e.currentTarget = null;
}
function fp(e, t) {
  t = (t & 4) !== 0;
  for (var n = 0; n < e.length; n++) {
    var r = e[n], i = r.event;
    r = r.listeners;
    e: {
      var a = void 0;
      if (t) for (var o = r.length - 1; 0 <= o; o--) {
        var s = r[o], l = s.instance, c = s.currentTarget;
        if (s = s.listener, l !== a && i.isPropagationStopped()) break e;
        K0(i, s, c), a = l;
      }
      else for (o = 0; o < r.length; o++) {
        if (s = r[o], l = s.instance, c = s.currentTarget, s = s.listener, l !== a && i.isPropagationStopped()) break e;
        K0(i, s, c), a = l;
      }
    }
  }
  if (bo) throw e = Zl, bo = !1, Zl = null, e;
}
function ce(e, t) {
  var n = t[nu];
  n === void 0 && (n = t[nu] = /* @__PURE__ */ new Set());
  var r = e + "__bubble";
  n.has(r) || (xp(t, e, 2, !1), n.add(r));
}
function qs(e, t, n) {
  var r = 0;
  t && (r |= 4), xp(n, e, r, t);
}
var Da = "_reactListening" + Math.random().toString(36).slice(2);
function ra(e) {
  if (!e[Da]) {
    e[Da] = !0, wx.forEach(function(n) {
      n !== "selectionchange" && (P3.has(n) || qs(n, !1, e), qs(n, !0, e));
    });
    var t = e.nodeType === 9 ? e : e.ownerDocument;
    t === null || t[Da] || (t[Da] = !0, qs("selectionchange", !1, t));
  }
}
function xp(e, t, n, r) {
  switch (Qx(t)) {
    case 1:
      var i = V4;
      break;
    case 4:
      i = B4;
      break;
    default:
      i = ic;
  }
  n = i.bind(null, t, n, e), i = void 0, !$l || t !== "touchstart" && t !== "touchmove" && t !== "wheel" || (i = !0), r ? i !== void 0 ? e.addEventListener(t, n, { capture: !0, passive: i }) : e.addEventListener(t, n, !0) : i !== void 0 ? e.addEventListener(t, n, { passive: i }) : e.addEventListener(t, n, !1);
}
function el(e, t, n, r, i) {
  var a = r;
  if (!(t & 1) && !(t & 2) && r !== null) e: for (; ; ) {
    if (r === null) return;
    var o = r.tag;
    if (o === 3 || o === 4) {
      var s = r.stateNode.containerInfo;
      if (s === i || s.nodeType === 8 && s.parentNode === i) break;
      if (o === 4) for (o = r.return; o !== null; ) {
        var l = o.tag;
        if ((l === 3 || l === 4) && (l = o.stateNode.containerInfo, l === i || l.nodeType === 8 && l.parentNode === i)) return;
        o = o.return;
      }
      for (; s !== null; ) {
        if (o = $n(s), o === null) return;
        if (l = o.tag, l === 5 || l === 6) {
          r = a = o;
          continue e;
        }
        s = s.parentNode;
      }
    }
    r = r.return;
  }
  Hx(function() {
    var c = a, d = ec(n), f = [];
    e: {
      var m = dp.get(e);
      if (m !== void 0) {
        var w = oc, y = e;
        switch (e) {
          case "keypress":
            if (Qa(n) === 0) break e;
          case "keydown":
          case "keyup":
            w = i3;
            break;
          case "focusin":
            y = "focus", w = Gs;
            break;
          case "focusout":
            y = "blur", w = Gs;
            break;
          case "beforeblur":
          case "afterblur":
            w = Gs;
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
            w = z0;
            break;
          case "drag":
          case "dragend":
          case "dragenter":
          case "dragexit":
          case "dragleave":
          case "dragover":
          case "dragstart":
          case "drop":
            w = Z4;
            break;
          case "touchcancel":
          case "touchend":
          case "touchmove":
          case "touchstart":
            w = s3;
            break;
          case sp:
          case lp:
          case up:
            w = X4;
            break;
          case cp:
            w = u3;
            break;
          case "scroll":
            w = U4;
            break;
          case "wheel":
            w = d3;
            break;
          case "copy":
          case "cut":
          case "paste":
            w = J4;
            break;
          case "gotpointercapture":
          case "lostpointercapture":
          case "pointercancel":
          case "pointerdown":
          case "pointermove":
          case "pointerout":
          case "pointerover":
          case "pointerup":
            w = V0;
        }
        var x = (t & 4) !== 0, _ = !x && e === "scroll", u = x ? m !== null ? m + "Capture" : null : m;
        x = [];
        for (var p = c, h; p !== null; ) {
          h = p;
          var g = h.stateNode;
          if (h.tag === 5 && g !== null && (h = g, u !== null && (g = Ji(p, u), g != null && x.push(ia(p, g, h)))), _) break;
          p = p.return;
        }
        0 < x.length && (m = new w(m, y, null, n, d), f.push({ event: m, listeners: x }));
      }
    }
    if (!(t & 7)) {
      e: {
        if (m = e === "mouseover" || e === "pointerover", w = e === "mouseout" || e === "pointerout", m && n !== Bl && (y = n.relatedTarget || n.fromElement) && ($n(y) || y[sn])) break e;
        if ((w || m) && (m = d.window === d ? d : (m = d.ownerDocument) ? m.defaultView || m.parentWindow : window, w ? (y = n.relatedTarget || n.toElement, w = c, y = y ? $n(y) : null, y !== null && (_ = sr(y), y !== _ || y.tag !== 5 && y.tag !== 6) && (y = null)) : (w = null, y = c), w !== y)) {
          if (x = z0, g = "onMouseLeave", u = "onMouseEnter", p = "mouse", (e === "pointerout" || e === "pointerover") && (x = V0, g = "onPointerLeave", u = "onPointerEnter", p = "pointer"), _ = w == null ? m : Sr(w), h = y == null ? m : Sr(y), m = new x(g, p + "leave", w, n, d), m.target = _, m.relatedTarget = h, g = null, $n(d) === c && (x = new x(u, p + "enter", y, n, d), x.target = h, x.relatedTarget = _, g = x), _ = g, w && y) t: {
            for (x = w, u = y, p = 0, h = x; h; h = xr(h)) p++;
            for (h = 0, g = u; g; g = xr(g)) h++;
            for (; 0 < p - h; ) x = xr(x), p--;
            for (; 0 < h - p; ) u = xr(u), h--;
            for (; p--; ) {
              if (x === u || u !== null && x === u.alternate) break t;
              x = xr(x), u = xr(u);
            }
            x = null;
          }
          else x = null;
          w !== null && q0(f, m, w, x, !1), y !== null && _ !== null && q0(f, _, y, x, !0);
        }
      }
      e: {
        if (m = c ? Sr(c) : window, w = m.nodeName && m.nodeName.toLowerCase(), w === "select" || w === "input" && m.type === "file") var k = g3;
        else if ($0(m)) if (np) k = k3;
        else {
          k = w3;
          var C = y3;
        }
        else (w = m.nodeName) && w.toLowerCase() === "input" && (m.type === "checkbox" || m.type === "radio") && (k = _3);
        if (k && (k = k(e, c))) {
          tp(f, k, n, d);
          break e;
        }
        C && C(e, m, c), e === "focusout" && (C = m._wrapperState) && C.controlled && m.type === "number" && jl(m, "number", m.value);
      }
      switch (C = c ? Sr(c) : window, e) {
        case "focusin":
          ($0(C) || C.contentEditable === "true") && (_r = C, Ql = c, Ci = null);
          break;
        case "focusout":
          Ci = Ql = _r = null;
          break;
        case "mousedown":
          Jl = !0;
          break;
        case "contextmenu":
        case "mouseup":
        case "dragend":
          Jl = !1, Q0(f, n, d);
          break;
        case "selectionchange":
          if (b3) break;
        case "keydown":
        case "keyup":
          Q0(f, n, d);
      }
      var S;
      if (lc) e: {
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
      else wr ? qx(e, n) && (L = "onCompositionEnd") : e === "keydown" && n.keyCode === 229 && (L = "onCompositionStart");
      L && (Kx && n.locale !== "ko" && (wr || L !== "onCompositionStart" ? L === "onCompositionEnd" && wr && (S = Jx()) : (wn = d, ac = "value" in wn ? wn.value : wn.textContent, wr = !0)), C = Lo(c, L), 0 < C.length && (L = new W0(L, e, null, n, d), f.push({ event: L, listeners: C }), S ? L.data = S : (S = ep(n), S !== null && (L.data = S)))), (S = x3 ? p3(e, n) : h3(e, n)) && (c = Lo(c, "onBeforeInput"), 0 < c.length && (d = new W0("onBeforeInput", "beforeinput", null, n, d), f.push({ event: d, listeners: c }), d.data = S));
    }
    fp(f, t);
  });
}
function ia(e, t, n) {
  return { instance: e, listener: t, currentTarget: n };
}
function Lo(e, t) {
  for (var n = t + "Capture", r = []; e !== null; ) {
    var i = e, a = i.stateNode;
    i.tag === 5 && a !== null && (i = a, a = Ji(e, n), a != null && r.unshift(ia(e, a, i)), a = Ji(e, t), a != null && r.push(ia(e, a, i))), e = e.return;
  }
  return r;
}
function xr(e) {
  if (e === null) return null;
  do
    e = e.return;
  while (e && e.tag !== 5);
  return e || null;
}
function q0(e, t, n, r, i) {
  for (var a = t._reactName, o = []; n !== null && n !== r; ) {
    var s = n, l = s.alternate, c = s.stateNode;
    if (l !== null && l === r) break;
    s.tag === 5 && c !== null && (s = c, i ? (l = Ji(n, a), l != null && o.unshift(ia(n, l, s))) : i || (l = Ji(n, a), l != null && o.push(ia(n, l, s)))), n = n.return;
  }
  o.length !== 0 && e.push({ event: t, listeners: o });
}
var N3 = /\r\n?/g, L3 = /\u0000|\uFFFD/g;
function ed(e) {
  return (typeof e == "string" ? e : "" + e).replace(N3, `
`).replace(L3, "");
}
function Ma(e, t, n) {
  if (t = ed(t), ed(e) !== t && n) throw Error(b(425));
}
function Io() {
}
var Kl = null, ql = null;
function eu(e, t) {
  return e === "textarea" || e === "noscript" || typeof t.children == "string" || typeof t.children == "number" || typeof t.dangerouslySetInnerHTML == "object" && t.dangerouslySetInnerHTML !== null && t.dangerouslySetInnerHTML.__html != null;
}
var tu = typeof setTimeout == "function" ? setTimeout : void 0, I3 = typeof clearTimeout == "function" ? clearTimeout : void 0, td = typeof Promise == "function" ? Promise : void 0, R3 = typeof queueMicrotask == "function" ? queueMicrotask : typeof td < "u" ? function(e) {
  return td.resolve(null).then(e).catch(D3);
} : tu;
function D3(e) {
  setTimeout(function() {
    throw e;
  });
}
function tl(e, t) {
  var n = t, r = 0;
  do {
    var i = n.nextSibling;
    if (e.removeChild(n), i && i.nodeType === 8) if (n = i.data, n === "/$") {
      if (r === 0) {
        e.removeChild(i), ea(t);
        return;
      }
      r--;
    } else n !== "$" && n !== "$?" && n !== "$!" || r++;
    n = i;
  } while (n);
  ea(t);
}
function bn(e) {
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
function nd(e) {
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
var qr = Math.random().toString(36).slice(2), Vt = "__reactFiber$" + qr, aa = "__reactProps$" + qr, sn = "__reactContainer$" + qr, nu = "__reactEvents$" + qr, M3 = "__reactListeners$" + qr, O3 = "__reactHandles$" + qr;
function $n(e) {
  var t = e[Vt];
  if (t) return t;
  for (var n = e.parentNode; n; ) {
    if (t = n[sn] || n[Vt]) {
      if (n = t.alternate, t.child !== null || n !== null && n.child !== null) for (e = nd(e); e !== null; ) {
        if (n = e[Vt]) return n;
        e = nd(e);
      }
      return t;
    }
    e = n, n = e.parentNode;
  }
  return null;
}
function ya(e) {
  return e = e[Vt] || e[sn], !e || e.tag !== 5 && e.tag !== 6 && e.tag !== 13 && e.tag !== 3 ? null : e;
}
function Sr(e) {
  if (e.tag === 5 || e.tag === 6) return e.stateNode;
  throw Error(b(33));
}
function ys(e) {
  return e[aa] || null;
}
var ru = [], Cr = -1;
function jn(e) {
  return { current: e };
}
function de(e) {
  0 > Cr || (e.current = ru[Cr], ru[Cr] = null, Cr--);
}
function oe(e, t) {
  Cr++, ru[Cr] = e.current, e.current = t;
}
var On = {}, ze = jn(On), Xe = jn(!1), er = On;
function Ur(e, t) {
  var n = e.type.contextTypes;
  if (!n) return On;
  var r = e.stateNode;
  if (r && r.__reactInternalMemoizedUnmaskedChildContext === t) return r.__reactInternalMemoizedMaskedChildContext;
  var i = {}, a;
  for (a in n) i[a] = t[a];
  return r && (e = e.stateNode, e.__reactInternalMemoizedUnmaskedChildContext = t, e.__reactInternalMemoizedMaskedChildContext = i), i;
}
function Qe(e) {
  return e = e.childContextTypes, e != null;
}
function Ro() {
  de(Xe), de(ze);
}
function rd(e, t, n) {
  if (ze.current !== On) throw Error(b(168));
  oe(ze, t), oe(Xe, n);
}
function pp(e, t, n) {
  var r = e.stateNode;
  if (t = t.childContextTypes, typeof r.getChildContext != "function") return n;
  r = r.getChildContext();
  for (var i in r) if (!(i in t)) throw Error(b(108, y4(e) || "Unknown", i));
  return ve({}, n, r);
}
function Do(e) {
  return e = (e = e.stateNode) && e.__reactInternalMemoizedMergedChildContext || On, er = ze.current, oe(ze, e), oe(Xe, Xe.current), !0;
}
function id(e, t, n) {
  var r = e.stateNode;
  if (!r) throw Error(b(169));
  n ? (e = pp(e, t, er), r.__reactInternalMemoizedMergedChildContext = e, de(Xe), de(ze), oe(ze, e)) : de(Xe), oe(Xe, n);
}
var en = null, ws = !1, nl = !1;
function hp(e) {
  en === null ? en = [e] : en.push(e);
}
function H3(e) {
  ws = !0, hp(e);
}
function Fn() {
  if (!nl && en !== null) {
    nl = !0;
    var e = 0, t = re;
    try {
      var n = en;
      for (re = 1; e < n.length; e++) {
        var r = n[e];
        do
          r = r(!0);
        while (r !== null);
      }
      en = null, ws = !1;
    } catch (i) {
      throw en !== null && (en = en.slice(e + 1)), zx(tc, Fn), i;
    } finally {
      re = t, nl = !1;
    }
  }
  return null;
}
var br = [], Er = 0, Mo = null, Oo = 0, mt = [], vt = 0, tr = null, tn = 1, nn = "";
function Vn(e, t) {
  br[Er++] = Oo, br[Er++] = Mo, Mo = e, Oo = t;
}
function mp(e, t, n) {
  mt[vt++] = tn, mt[vt++] = nn, mt[vt++] = tr, tr = e;
  var r = tn;
  e = nn;
  var i = 32 - Lt(r) - 1;
  r &= ~(1 << i), n += 1;
  var a = 32 - Lt(t) + i;
  if (30 < a) {
    var o = i - i % 5;
    a = (r & (1 << o) - 1).toString(32), r >>= o, i -= o, tn = 1 << 32 - Lt(t) + i | n << i | r, nn = a + e;
  } else tn = 1 << a | n << i | r, nn = e;
}
function cc(e) {
  e.return !== null && (Vn(e, 1), mp(e, 1, 0));
}
function dc(e) {
  for (; e === Mo; ) Mo = br[--Er], br[Er] = null, Oo = br[--Er], br[Er] = null;
  for (; e === tr; ) tr = mt[--vt], mt[vt] = null, nn = mt[--vt], mt[vt] = null, tn = mt[--vt], mt[vt] = null;
}
var lt = null, at = null, xe = !1, Tt = null;
function vp(e, t) {
  var n = gt(5, null, null, 0);
  n.elementType = "DELETED", n.stateNode = t, n.return = e, t = e.deletions, t === null ? (e.deletions = [n], e.flags |= 16) : t.push(n);
}
function ad(e, t) {
  switch (e.tag) {
    case 5:
      var n = e.type;
      return t = t.nodeType !== 1 || n.toLowerCase() !== t.nodeName.toLowerCase() ? null : t, t !== null ? (e.stateNode = t, lt = e, at = bn(t.firstChild), !0) : !1;
    case 6:
      return t = e.pendingProps === "" || t.nodeType !== 3 ? null : t, t !== null ? (e.stateNode = t, lt = e, at = null, !0) : !1;
    case 13:
      return t = t.nodeType !== 8 ? null : t, t !== null ? (n = tr !== null ? { id: tn, overflow: nn } : null, e.memoizedState = { dehydrated: t, treeContext: n, retryLane: 1073741824 }, n = gt(18, null, null, 0), n.stateNode = t, n.return = e, e.child = n, lt = e, at = null, !0) : !1;
    default:
      return !1;
  }
}
function iu(e) {
  return (e.mode & 1) !== 0 && (e.flags & 128) === 0;
}
function au(e) {
  if (xe) {
    var t = at;
    if (t) {
      var n = t;
      if (!ad(e, t)) {
        if (iu(e)) throw Error(b(418));
        t = bn(n.nextSibling);
        var r = lt;
        t && ad(e, t) ? vp(r, n) : (e.flags = e.flags & -4097 | 2, xe = !1, lt = e);
      }
    } else {
      if (iu(e)) throw Error(b(418));
      e.flags = e.flags & -4097 | 2, xe = !1, lt = e;
    }
  }
}
function od(e) {
  for (e = e.return; e !== null && e.tag !== 5 && e.tag !== 3 && e.tag !== 13; ) e = e.return;
  lt = e;
}
function Oa(e) {
  if (e !== lt) return !1;
  if (!xe) return od(e), xe = !0, !1;
  var t;
  if ((t = e.tag !== 3) && !(t = e.tag !== 5) && (t = e.type, t = t !== "head" && t !== "body" && !eu(e.type, e.memoizedProps)), t && (t = at)) {
    if (iu(e)) throw gp(), Error(b(418));
    for (; t; ) vp(e, t), t = bn(t.nextSibling);
  }
  if (od(e), e.tag === 13) {
    if (e = e.memoizedState, e = e !== null ? e.dehydrated : null, !e) throw Error(b(317));
    e: {
      for (e = e.nextSibling, t = 0; e; ) {
        if (e.nodeType === 8) {
          var n = e.data;
          if (n === "/$") {
            if (t === 0) {
              at = bn(e.nextSibling);
              break e;
            }
            t--;
          } else n !== "$" && n !== "$!" && n !== "$?" || t++;
        }
        e = e.nextSibling;
      }
      at = null;
    }
  } else at = lt ? bn(e.stateNode.nextSibling) : null;
  return !0;
}
function gp() {
  for (var e = at; e; ) e = bn(e.nextSibling);
}
function $r() {
  at = lt = null, xe = !1;
}
function fc(e) {
  Tt === null ? Tt = [e] : Tt.push(e);
}
var A3 = dn.ReactCurrentBatchConfig;
function ci(e, t, n) {
  if (e = n.ref, e !== null && typeof e != "function" && typeof e != "object") {
    if (n._owner) {
      if (n = n._owner, n) {
        if (n.tag !== 1) throw Error(b(309));
        var r = n.stateNode;
      }
      if (!r) throw Error(b(147, e));
      var i = r, a = "" + e;
      return t !== null && t.ref !== null && typeof t.ref == "function" && t.ref._stringRef === a ? t.ref : (t = function(o) {
        var s = i.refs;
        o === null ? delete s[a] : s[a] = o;
      }, t._stringRef = a, t);
    }
    if (typeof e != "string") throw Error(b(284));
    if (!n._owner) throw Error(b(290, e));
  }
  return e;
}
function Ha(e, t) {
  throw e = Object.prototype.toString.call(t), Error(b(31, e === "[object Object]" ? "object with keys {" + Object.keys(t).join(", ") + "}" : e));
}
function sd(e) {
  var t = e._init;
  return t(e._payload);
}
function yp(e) {
  function t(u, p) {
    if (e) {
      var h = u.deletions;
      h === null ? (u.deletions = [p], u.flags |= 16) : h.push(p);
    }
  }
  function n(u, p) {
    if (!e) return null;
    for (; p !== null; ) t(u, p), p = p.sibling;
    return null;
  }
  function r(u, p) {
    for (u = /* @__PURE__ */ new Map(); p !== null; ) p.key !== null ? u.set(p.key, p) : u.set(p.index, p), p = p.sibling;
    return u;
  }
  function i(u, p) {
    return u = Nn(u, p), u.index = 0, u.sibling = null, u;
  }
  function a(u, p, h) {
    return u.index = h, e ? (h = u.alternate, h !== null ? (h = h.index, h < p ? (u.flags |= 2, p) : h) : (u.flags |= 2, p)) : (u.flags |= 1048576, p);
  }
  function o(u) {
    return e && u.alternate === null && (u.flags |= 2), u;
  }
  function s(u, p, h, g) {
    return p === null || p.tag !== 6 ? (p = ul(h, u.mode, g), p.return = u, p) : (p = i(p, h), p.return = u, p);
  }
  function l(u, p, h, g) {
    var k = h.type;
    return k === yr ? d(u, p, h.props.children, g, h.key) : p !== null && (p.elementType === k || typeof k == "object" && k !== null && k.$$typeof === pn && sd(k) === p.type) ? (g = i(p, h.props), g.ref = ci(u, p, h), g.return = u, g) : (g = ro(h.type, h.key, h.props, null, u.mode, g), g.ref = ci(u, p, h), g.return = u, g);
  }
  function c(u, p, h, g) {
    return p === null || p.tag !== 4 || p.stateNode.containerInfo !== h.containerInfo || p.stateNode.implementation !== h.implementation ? (p = cl(h, u.mode, g), p.return = u, p) : (p = i(p, h.children || []), p.return = u, p);
  }
  function d(u, p, h, g, k) {
    return p === null || p.tag !== 7 ? (p = Qn(h, u.mode, g, k), p.return = u, p) : (p = i(p, h), p.return = u, p);
  }
  function f(u, p, h) {
    if (typeof p == "string" && p !== "" || typeof p == "number") return p = ul("" + p, u.mode, h), p.return = u, p;
    if (typeof p == "object" && p !== null) {
      switch (p.$$typeof) {
        case ba:
          return h = ro(p.type, p.key, p.props, null, u.mode, h), h.ref = ci(u, null, p), h.return = u, h;
        case gr:
          return p = cl(p, u.mode, h), p.return = u, p;
        case pn:
          var g = p._init;
          return f(u, g(p._payload), h);
      }
      if (mi(p) || ai(p)) return p = Qn(p, u.mode, h, null), p.return = u, p;
      Ha(u, p);
    }
    return null;
  }
  function m(u, p, h, g) {
    var k = p !== null ? p.key : null;
    if (typeof h == "string" && h !== "" || typeof h == "number") return k !== null ? null : s(u, p, "" + h, g);
    if (typeof h == "object" && h !== null) {
      switch (h.$$typeof) {
        case ba:
          return h.key === k ? l(u, p, h, g) : null;
        case gr:
          return h.key === k ? c(u, p, h, g) : null;
        case pn:
          return k = h._init, m(
            u,
            p,
            k(h._payload),
            g
          );
      }
      if (mi(h) || ai(h)) return k !== null ? null : d(u, p, h, g, null);
      Ha(u, h);
    }
    return null;
  }
  function w(u, p, h, g, k) {
    if (typeof g == "string" && g !== "" || typeof g == "number") return u = u.get(h) || null, s(p, u, "" + g, k);
    if (typeof g == "object" && g !== null) {
      switch (g.$$typeof) {
        case ba:
          return u = u.get(g.key === null ? h : g.key) || null, l(p, u, g, k);
        case gr:
          return u = u.get(g.key === null ? h : g.key) || null, c(p, u, g, k);
        case pn:
          var C = g._init;
          return w(u, p, h, C(g._payload), k);
      }
      if (mi(g) || ai(g)) return u = u.get(h) || null, d(p, u, g, k, null);
      Ha(p, g);
    }
    return null;
  }
  function y(u, p, h, g) {
    for (var k = null, C = null, S = p, L = p = 0, M = null; S !== null && L < h.length; L++) {
      S.index > L ? (M = S, S = null) : M = S.sibling;
      var T = m(u, S, h[L], g);
      if (T === null) {
        S === null && (S = M);
        break;
      }
      e && S && T.alternate === null && t(u, S), p = a(T, p, L), C === null ? k = T : C.sibling = T, C = T, S = M;
    }
    if (L === h.length) return n(u, S), xe && Vn(u, L), k;
    if (S === null) {
      for (; L < h.length; L++) S = f(u, h[L], g), S !== null && (p = a(S, p, L), C === null ? k = S : C.sibling = S, C = S);
      return xe && Vn(u, L), k;
    }
    for (S = r(u, S); L < h.length; L++) M = w(S, u, L, h[L], g), M !== null && (e && M.alternate !== null && S.delete(M.key === null ? L : M.key), p = a(M, p, L), C === null ? k = M : C.sibling = M, C = M);
    return e && S.forEach(function(A) {
      return t(u, A);
    }), xe && Vn(u, L), k;
  }
  function x(u, p, h, g) {
    var k = ai(h);
    if (typeof k != "function") throw Error(b(150));
    if (h = k.call(h), h == null) throw Error(b(151));
    for (var C = k = null, S = p, L = p = 0, M = null, T = h.next(); S !== null && !T.done; L++, T = h.next()) {
      S.index > L ? (M = S, S = null) : M = S.sibling;
      var A = m(u, S, T.value, g);
      if (A === null) {
        S === null && (S = M);
        break;
      }
      e && S && A.alternate === null && t(u, S), p = a(A, p, L), C === null ? k = A : C.sibling = A, C = A, S = M;
    }
    if (T.done) return n(
      u,
      S
    ), xe && Vn(u, L), k;
    if (S === null) {
      for (; !T.done; L++, T = h.next()) T = f(u, T.value, g), T !== null && (p = a(T, p, L), C === null ? k = T : C.sibling = T, C = T);
      return xe && Vn(u, L), k;
    }
    for (S = r(u, S); !T.done; L++, T = h.next()) T = w(S, u, L, T.value, g), T !== null && (e && T.alternate !== null && S.delete(T.key === null ? L : T.key), p = a(T, p, L), C === null ? k = T : C.sibling = T, C = T);
    return e && S.forEach(function(le) {
      return t(u, le);
    }), xe && Vn(u, L), k;
  }
  function _(u, p, h, g) {
    if (typeof h == "object" && h !== null && h.type === yr && h.key === null && (h = h.props.children), typeof h == "object" && h !== null) {
      switch (h.$$typeof) {
        case ba:
          e: {
            for (var k = h.key, C = p; C !== null; ) {
              if (C.key === k) {
                if (k = h.type, k === yr) {
                  if (C.tag === 7) {
                    n(u, C.sibling), p = i(C, h.props.children), p.return = u, u = p;
                    break e;
                  }
                } else if (C.elementType === k || typeof k == "object" && k !== null && k.$$typeof === pn && sd(k) === C.type) {
                  n(u, C.sibling), p = i(C, h.props), p.ref = ci(u, C, h), p.return = u, u = p;
                  break e;
                }
                n(u, C);
                break;
              } else t(u, C);
              C = C.sibling;
            }
            h.type === yr ? (p = Qn(h.props.children, u.mode, g, h.key), p.return = u, u = p) : (g = ro(h.type, h.key, h.props, null, u.mode, g), g.ref = ci(u, p, h), g.return = u, u = g);
          }
          return o(u);
        case gr:
          e: {
            for (C = h.key; p !== null; ) {
              if (p.key === C) if (p.tag === 4 && p.stateNode.containerInfo === h.containerInfo && p.stateNode.implementation === h.implementation) {
                n(u, p.sibling), p = i(p, h.children || []), p.return = u, u = p;
                break e;
              } else {
                n(u, p);
                break;
              }
              else t(u, p);
              p = p.sibling;
            }
            p = cl(h, u.mode, g), p.return = u, u = p;
          }
          return o(u);
        case pn:
          return C = h._init, _(u, p, C(h._payload), g);
      }
      if (mi(h)) return y(u, p, h, g);
      if (ai(h)) return x(u, p, h, g);
      Ha(u, h);
    }
    return typeof h == "string" && h !== "" || typeof h == "number" ? (h = "" + h, p !== null && p.tag === 6 ? (n(u, p.sibling), p = i(p, h), p.return = u, u = p) : (n(u, p), p = ul(h, u.mode, g), p.return = u, u = p), o(u)) : n(u, p);
  }
  return _;
}
var Zr = yp(!0), wp = yp(!1), Ho = jn(null), Ao = null, Tr = null, xc = null;
function pc() {
  xc = Tr = Ao = null;
}
function hc(e) {
  var t = Ho.current;
  de(Ho), e._currentValue = t;
}
function ou(e, t, n) {
  for (; e !== null; ) {
    var r = e.alternate;
    if ((e.childLanes & t) !== t ? (e.childLanes |= t, r !== null && (r.childLanes |= t)) : r !== null && (r.childLanes & t) !== t && (r.childLanes |= t), e === n) break;
    e = e.return;
  }
}
function Hr(e, t) {
  Ao = e, xc = Tr = null, e = e.dependencies, e !== null && e.firstContext !== null && (e.lanes & t && (Ye = !0), e.firstContext = null);
}
function wt(e) {
  var t = e._currentValue;
  if (xc !== e) if (e = { context: e, memoizedValue: t, next: null }, Tr === null) {
    if (Ao === null) throw Error(b(308));
    Tr = e, Ao.dependencies = { lanes: 0, firstContext: e };
  } else Tr = Tr.next = e;
  return t;
}
var Zn = null;
function mc(e) {
  Zn === null ? Zn = [e] : Zn.push(e);
}
function _p(e, t, n, r) {
  var i = t.interleaved;
  return i === null ? (n.next = n, mc(t)) : (n.next = i.next, i.next = n), t.interleaved = n, ln(e, r);
}
function ln(e, t) {
  e.lanes |= t;
  var n = e.alternate;
  for (n !== null && (n.lanes |= t), n = e, e = e.return; e !== null; ) e.childLanes |= t, n = e.alternate, n !== null && (n.childLanes |= t), n = e, e = e.return;
  return n.tag === 3 ? n.stateNode : null;
}
var hn = !1;
function vc(e) {
  e.updateQueue = { baseState: e.memoizedState, firstBaseUpdate: null, lastBaseUpdate: null, shared: { pending: null, interleaved: null, lanes: 0 }, effects: null };
}
function kp(e, t) {
  e = e.updateQueue, t.updateQueue === e && (t.updateQueue = { baseState: e.baseState, firstBaseUpdate: e.firstBaseUpdate, lastBaseUpdate: e.lastBaseUpdate, shared: e.shared, effects: e.effects });
}
function rn(e, t) {
  return { eventTime: e, lane: t, tag: 0, payload: null, callback: null, next: null };
}
function En(e, t, n) {
  var r = e.updateQueue;
  if (r === null) return null;
  if (r = r.shared, J & 2) {
    var i = r.pending;
    return i === null ? t.next = t : (t.next = i.next, i.next = t), r.pending = t, ln(e, n);
  }
  return i = r.interleaved, i === null ? (t.next = t, mc(r)) : (t.next = i.next, i.next = t), r.interleaved = t, ln(e, n);
}
function Ja(e, t, n) {
  if (t = t.updateQueue, t !== null && (t = t.shared, (n & 4194240) !== 0)) {
    var r = t.lanes;
    r &= e.pendingLanes, n |= r, t.lanes = n, nc(e, n);
  }
}
function ld(e, t) {
  var n = e.updateQueue, r = e.alternate;
  if (r !== null && (r = r.updateQueue, n === r)) {
    var i = null, a = null;
    if (n = n.firstBaseUpdate, n !== null) {
      do {
        var o = { eventTime: n.eventTime, lane: n.lane, tag: n.tag, payload: n.payload, callback: n.callback, next: null };
        a === null ? i = a = o : a = a.next = o, n = n.next;
      } while (n !== null);
      a === null ? i = a = t : a = a.next = t;
    } else i = a = t;
    n = { baseState: r.baseState, firstBaseUpdate: i, lastBaseUpdate: a, shared: r.shared, effects: r.effects }, e.updateQueue = n;
    return;
  }
  e = n.lastBaseUpdate, e === null ? n.firstBaseUpdate = t : e.next = t, n.lastBaseUpdate = t;
}
function jo(e, t, n, r) {
  var i = e.updateQueue;
  hn = !1;
  var a = i.firstBaseUpdate, o = i.lastBaseUpdate, s = i.shared.pending;
  if (s !== null) {
    i.shared.pending = null;
    var l = s, c = l.next;
    l.next = null, o === null ? a = c : o.next = c, o = l;
    var d = e.alternate;
    d !== null && (d = d.updateQueue, s = d.lastBaseUpdate, s !== o && (s === null ? d.firstBaseUpdate = c : s.next = c, d.lastBaseUpdate = l));
  }
  if (a !== null) {
    var f = i.baseState;
    o = 0, d = c = l = null, s = a;
    do {
      var m = s.lane, w = s.eventTime;
      if ((r & m) === m) {
        d !== null && (d = d.next = {
          eventTime: w,
          lane: 0,
          tag: s.tag,
          payload: s.payload,
          callback: s.callback,
          next: null
        });
        e: {
          var y = e, x = s;
          switch (m = t, w = n, x.tag) {
            case 1:
              if (y = x.payload, typeof y == "function") {
                f = y.call(w, f, m);
                break e;
              }
              f = y;
              break e;
            case 3:
              y.flags = y.flags & -65537 | 128;
            case 0:
              if (y = x.payload, m = typeof y == "function" ? y.call(w, f, m) : y, m == null) break e;
              f = ve({}, f, m);
              break e;
            case 2:
              hn = !0;
          }
        }
        s.callback !== null && s.lane !== 0 && (e.flags |= 64, m = i.effects, m === null ? i.effects = [s] : m.push(s));
      } else w = { eventTime: w, lane: m, tag: s.tag, payload: s.payload, callback: s.callback, next: null }, d === null ? (c = d = w, l = f) : d = d.next = w, o |= m;
      if (s = s.next, s === null) {
        if (s = i.shared.pending, s === null) break;
        m = s, s = m.next, m.next = null, i.lastBaseUpdate = m, i.shared.pending = null;
      }
    } while (!0);
    if (d === null && (l = f), i.baseState = l, i.firstBaseUpdate = c, i.lastBaseUpdate = d, t = i.shared.interleaved, t !== null) {
      i = t;
      do
        o |= i.lane, i = i.next;
      while (i !== t);
    } else a === null && (i.shared.lanes = 0);
    rr |= o, e.lanes = o, e.memoizedState = f;
  }
}
function ud(e, t, n) {
  if (e = t.effects, t.effects = null, e !== null) for (t = 0; t < e.length; t++) {
    var r = e[t], i = r.callback;
    if (i !== null) {
      if (r.callback = null, r = n, typeof i != "function") throw Error(b(191, i));
      i.call(r);
    }
  }
}
var wa = {}, Gt = jn(wa), oa = jn(wa), sa = jn(wa);
function Gn(e) {
  if (e === wa) throw Error(b(174));
  return e;
}
function gc(e, t) {
  switch (oe(sa, t), oe(oa, e), oe(Gt, wa), e = t.nodeType, e) {
    case 9:
    case 11:
      t = (t = t.documentElement) ? t.namespaceURI : zl(null, "");
      break;
    default:
      e = e === 8 ? t.parentNode : t, t = e.namespaceURI || null, e = e.tagName, t = zl(t, e);
  }
  de(Gt), oe(Gt, t);
}
function Gr() {
  de(Gt), de(oa), de(sa);
}
function Sp(e) {
  Gn(sa.current);
  var t = Gn(Gt.current), n = zl(t, e.type);
  t !== n && (oe(oa, e), oe(Gt, n));
}
function yc(e) {
  oa.current === e && (de(Gt), de(oa));
}
var he = jn(0);
function Fo(e) {
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
var rl = [];
function wc() {
  for (var e = 0; e < rl.length; e++) rl[e]._workInProgressVersionPrimary = null;
  rl.length = 0;
}
var Ka = dn.ReactCurrentDispatcher, il = dn.ReactCurrentBatchConfig, nr = 0, me = null, Ce = null, Te = null, zo = !1, bi = !1, la = 0, j3 = 0;
function Me() {
  throw Error(b(321));
}
function _c(e, t) {
  if (t === null) return !1;
  for (var n = 0; n < t.length && n < e.length; n++) if (!Dt(e[n], t[n])) return !1;
  return !0;
}
function kc(e, t, n, r, i, a) {
  if (nr = a, me = t, t.memoizedState = null, t.updateQueue = null, t.lanes = 0, Ka.current = e === null || e.memoizedState === null ? V3 : B3, e = n(r, i), bi) {
    a = 0;
    do {
      if (bi = !1, la = 0, 25 <= a) throw Error(b(301));
      a += 1, Te = Ce = null, t.updateQueue = null, Ka.current = U3, e = n(r, i);
    } while (bi);
  }
  if (Ka.current = Wo, t = Ce !== null && Ce.next !== null, nr = 0, Te = Ce = me = null, zo = !1, t) throw Error(b(300));
  return e;
}
function Sc() {
  var e = la !== 0;
  return la = 0, e;
}
function jt() {
  var e = { memoizedState: null, baseState: null, baseQueue: null, queue: null, next: null };
  return Te === null ? me.memoizedState = Te = e : Te = Te.next = e, Te;
}
function _t() {
  if (Ce === null) {
    var e = me.alternate;
    e = e !== null ? e.memoizedState : null;
  } else e = Ce.next;
  var t = Te === null ? me.memoizedState : Te.next;
  if (t !== null) Te = t, Ce = e;
  else {
    if (e === null) throw Error(b(310));
    Ce = e, e = { memoizedState: Ce.memoizedState, baseState: Ce.baseState, baseQueue: Ce.baseQueue, queue: Ce.queue, next: null }, Te === null ? me.memoizedState = Te = e : Te = Te.next = e;
  }
  return Te;
}
function ua(e, t) {
  return typeof t == "function" ? t(e) : t;
}
function al(e) {
  var t = _t(), n = t.queue;
  if (n === null) throw Error(b(311));
  n.lastRenderedReducer = e;
  var r = Ce, i = r.baseQueue, a = n.pending;
  if (a !== null) {
    if (i !== null) {
      var o = i.next;
      i.next = a.next, a.next = o;
    }
    r.baseQueue = i = a, n.pending = null;
  }
  if (i !== null) {
    a = i.next, r = r.baseState;
    var s = o = null, l = null, c = a;
    do {
      var d = c.lane;
      if ((nr & d) === d) l !== null && (l = l.next = { lane: 0, action: c.action, hasEagerState: c.hasEagerState, eagerState: c.eagerState, next: null }), r = c.hasEagerState ? c.eagerState : e(r, c.action);
      else {
        var f = {
          lane: d,
          action: c.action,
          hasEagerState: c.hasEagerState,
          eagerState: c.eagerState,
          next: null
        };
        l === null ? (s = l = f, o = r) : l = l.next = f, me.lanes |= d, rr |= d;
      }
      c = c.next;
    } while (c !== null && c !== a);
    l === null ? o = r : l.next = s, Dt(r, t.memoizedState) || (Ye = !0), t.memoizedState = r, t.baseState = o, t.baseQueue = l, n.lastRenderedState = r;
  }
  if (e = n.interleaved, e !== null) {
    i = e;
    do
      a = i.lane, me.lanes |= a, rr |= a, i = i.next;
    while (i !== e);
  } else i === null && (n.lanes = 0);
  return [t.memoizedState, n.dispatch];
}
function ol(e) {
  var t = _t(), n = t.queue;
  if (n === null) throw Error(b(311));
  n.lastRenderedReducer = e;
  var r = n.dispatch, i = n.pending, a = t.memoizedState;
  if (i !== null) {
    n.pending = null;
    var o = i = i.next;
    do
      a = e(a, o.action), o = o.next;
    while (o !== i);
    Dt(a, t.memoizedState) || (Ye = !0), t.memoizedState = a, t.baseQueue === null && (t.baseState = a), n.lastRenderedState = a;
  }
  return [a, r];
}
function Cp() {
}
function bp(e, t) {
  var n = me, r = _t(), i = t(), a = !Dt(r.memoizedState, i);
  if (a && (r.memoizedState = i, Ye = !0), r = r.queue, Cc(Pp.bind(null, n, r, e), [e]), r.getSnapshot !== t || a || Te !== null && Te.memoizedState.tag & 1) {
    if (n.flags |= 2048, ca(9, Tp.bind(null, n, r, i, t), void 0, null), Pe === null) throw Error(b(349));
    nr & 30 || Ep(n, t, i);
  }
  return i;
}
function Ep(e, t, n) {
  e.flags |= 16384, e = { getSnapshot: t, value: n }, t = me.updateQueue, t === null ? (t = { lastEffect: null, stores: null }, me.updateQueue = t, t.stores = [e]) : (n = t.stores, n === null ? t.stores = [e] : n.push(e));
}
function Tp(e, t, n, r) {
  t.value = n, t.getSnapshot = r, Np(t) && Lp(e);
}
function Pp(e, t, n) {
  return n(function() {
    Np(t) && Lp(e);
  });
}
function Np(e) {
  var t = e.getSnapshot;
  e = e.value;
  try {
    var n = t();
    return !Dt(e, n);
  } catch {
    return !0;
  }
}
function Lp(e) {
  var t = ln(e, 1);
  t !== null && It(t, e, 1, -1);
}
function cd(e) {
  var t = jt();
  return typeof e == "function" && (e = e()), t.memoizedState = t.baseState = e, e = { pending: null, interleaved: null, lanes: 0, dispatch: null, lastRenderedReducer: ua, lastRenderedState: e }, t.queue = e, e = e.dispatch = W3.bind(null, me, e), [t.memoizedState, e];
}
function ca(e, t, n, r) {
  return e = { tag: e, create: t, destroy: n, deps: r, next: null }, t = me.updateQueue, t === null ? (t = { lastEffect: null, stores: null }, me.updateQueue = t, t.lastEffect = e.next = e) : (n = t.lastEffect, n === null ? t.lastEffect = e.next = e : (r = n.next, n.next = e, e.next = r, t.lastEffect = e)), e;
}
function Ip() {
  return _t().memoizedState;
}
function qa(e, t, n, r) {
  var i = jt();
  me.flags |= e, i.memoizedState = ca(1 | t, n, void 0, r === void 0 ? null : r);
}
function _s(e, t, n, r) {
  var i = _t();
  r = r === void 0 ? null : r;
  var a = void 0;
  if (Ce !== null) {
    var o = Ce.memoizedState;
    if (a = o.destroy, r !== null && _c(r, o.deps)) {
      i.memoizedState = ca(t, n, a, r);
      return;
    }
  }
  me.flags |= e, i.memoizedState = ca(1 | t, n, a, r);
}
function dd(e, t) {
  return qa(8390656, 8, e, t);
}
function Cc(e, t) {
  return _s(2048, 8, e, t);
}
function Rp(e, t) {
  return _s(4, 2, e, t);
}
function Dp(e, t) {
  return _s(4, 4, e, t);
}
function Mp(e, t) {
  if (typeof t == "function") return e = e(), t(e), function() {
    t(null);
  };
  if (t != null) return e = e(), t.current = e, function() {
    t.current = null;
  };
}
function Op(e, t, n) {
  return n = n != null ? n.concat([e]) : null, _s(4, 4, Mp.bind(null, t, e), n);
}
function bc() {
}
function Hp(e, t) {
  var n = _t();
  t = t === void 0 ? null : t;
  var r = n.memoizedState;
  return r !== null && t !== null && _c(t, r[1]) ? r[0] : (n.memoizedState = [e, t], e);
}
function Ap(e, t) {
  var n = _t();
  t = t === void 0 ? null : t;
  var r = n.memoizedState;
  return r !== null && t !== null && _c(t, r[1]) ? r[0] : (e = e(), n.memoizedState = [e, t], e);
}
function jp(e, t, n) {
  return nr & 21 ? (Dt(n, t) || (n = Bx(), me.lanes |= n, rr |= n, e.baseState = !0), t) : (e.baseState && (e.baseState = !1, Ye = !0), e.memoizedState = n);
}
function F3(e, t) {
  var n = re;
  re = n !== 0 && 4 > n ? n : 4, e(!0);
  var r = il.transition;
  il.transition = {};
  try {
    e(!1), t();
  } finally {
    re = n, il.transition = r;
  }
}
function Fp() {
  return _t().memoizedState;
}
function z3(e, t, n) {
  var r = Pn(e);
  if (n = { lane: r, action: n, hasEagerState: !1, eagerState: null, next: null }, zp(e)) Wp(t, n);
  else if (n = _p(e, t, n, r), n !== null) {
    var i = Be();
    It(n, e, r, i), Vp(n, t, r);
  }
}
function W3(e, t, n) {
  var r = Pn(e), i = { lane: r, action: n, hasEagerState: !1, eagerState: null, next: null };
  if (zp(e)) Wp(t, i);
  else {
    var a = e.alternate;
    if (e.lanes === 0 && (a === null || a.lanes === 0) && (a = t.lastRenderedReducer, a !== null)) try {
      var o = t.lastRenderedState, s = a(o, n);
      if (i.hasEagerState = !0, i.eagerState = s, Dt(s, o)) {
        var l = t.interleaved;
        l === null ? (i.next = i, mc(t)) : (i.next = l.next, l.next = i), t.interleaved = i;
        return;
      }
    } catch {
    } finally {
    }
    n = _p(e, t, i, r), n !== null && (i = Be(), It(n, e, r, i), Vp(n, t, r));
  }
}
function zp(e) {
  var t = e.alternate;
  return e === me || t !== null && t === me;
}
function Wp(e, t) {
  bi = zo = !0;
  var n = e.pending;
  n === null ? t.next = t : (t.next = n.next, n.next = t), e.pending = t;
}
function Vp(e, t, n) {
  if (n & 4194240) {
    var r = t.lanes;
    r &= e.pendingLanes, n |= r, t.lanes = n, nc(e, n);
  }
}
var Wo = { readContext: wt, useCallback: Me, useContext: Me, useEffect: Me, useImperativeHandle: Me, useInsertionEffect: Me, useLayoutEffect: Me, useMemo: Me, useReducer: Me, useRef: Me, useState: Me, useDebugValue: Me, useDeferredValue: Me, useTransition: Me, useMutableSource: Me, useSyncExternalStore: Me, useId: Me, unstable_isNewReconciler: !1 }, V3 = { readContext: wt, useCallback: function(e, t) {
  return jt().memoizedState = [e, t === void 0 ? null : t], e;
}, useContext: wt, useEffect: dd, useImperativeHandle: function(e, t, n) {
  return n = n != null ? n.concat([e]) : null, qa(
    4194308,
    4,
    Mp.bind(null, t, e),
    n
  );
}, useLayoutEffect: function(e, t) {
  return qa(4194308, 4, e, t);
}, useInsertionEffect: function(e, t) {
  return qa(4, 2, e, t);
}, useMemo: function(e, t) {
  var n = jt();
  return t = t === void 0 ? null : t, e = e(), n.memoizedState = [e, t], e;
}, useReducer: function(e, t, n) {
  var r = jt();
  return t = n !== void 0 ? n(t) : t, r.memoizedState = r.baseState = t, e = { pending: null, interleaved: null, lanes: 0, dispatch: null, lastRenderedReducer: e, lastRenderedState: t }, r.queue = e, e = e.dispatch = z3.bind(null, me, e), [r.memoizedState, e];
}, useRef: function(e) {
  var t = jt();
  return e = { current: e }, t.memoizedState = e;
}, useState: cd, useDebugValue: bc, useDeferredValue: function(e) {
  return jt().memoizedState = e;
}, useTransition: function() {
  var e = cd(!1), t = e[0];
  return e = F3.bind(null, e[1]), jt().memoizedState = e, [t, e];
}, useMutableSource: function() {
}, useSyncExternalStore: function(e, t, n) {
  var r = me, i = jt();
  if (xe) {
    if (n === void 0) throw Error(b(407));
    n = n();
  } else {
    if (n = t(), Pe === null) throw Error(b(349));
    nr & 30 || Ep(r, t, n);
  }
  i.memoizedState = n;
  var a = { value: n, getSnapshot: t };
  return i.queue = a, dd(Pp.bind(
    null,
    r,
    a,
    e
  ), [e]), r.flags |= 2048, ca(9, Tp.bind(null, r, a, n, t), void 0, null), n;
}, useId: function() {
  var e = jt(), t = Pe.identifierPrefix;
  if (xe) {
    var n = nn, r = tn;
    n = (r & ~(1 << 32 - Lt(r) - 1)).toString(32) + n, t = ":" + t + "R" + n, n = la++, 0 < n && (t += "H" + n.toString(32)), t += ":";
  } else n = j3++, t = ":" + t + "r" + n.toString(32) + ":";
  return e.memoizedState = t;
}, unstable_isNewReconciler: !1 }, B3 = {
  readContext: wt,
  useCallback: Hp,
  useContext: wt,
  useEffect: Cc,
  useImperativeHandle: Op,
  useInsertionEffect: Rp,
  useLayoutEffect: Dp,
  useMemo: Ap,
  useReducer: al,
  useRef: Ip,
  useState: function() {
    return al(ua);
  },
  useDebugValue: bc,
  useDeferredValue: function(e) {
    var t = _t();
    return jp(t, Ce.memoizedState, e);
  },
  useTransition: function() {
    var e = al(ua)[0], t = _t().memoizedState;
    return [e, t];
  },
  useMutableSource: Cp,
  useSyncExternalStore: bp,
  useId: Fp,
  unstable_isNewReconciler: !1
}, U3 = { readContext: wt, useCallback: Hp, useContext: wt, useEffect: Cc, useImperativeHandle: Op, useInsertionEffect: Rp, useLayoutEffect: Dp, useMemo: Ap, useReducer: ol, useRef: Ip, useState: function() {
  return ol(ua);
}, useDebugValue: bc, useDeferredValue: function(e) {
  var t = _t();
  return Ce === null ? t.memoizedState = e : jp(t, Ce.memoizedState, e);
}, useTransition: function() {
  var e = ol(ua)[0], t = _t().memoizedState;
  return [e, t];
}, useMutableSource: Cp, useSyncExternalStore: bp, useId: Fp, unstable_isNewReconciler: !1 };
function bt(e, t) {
  if (e && e.defaultProps) {
    t = ve({}, t), e = e.defaultProps;
    for (var n in e) t[n] === void 0 && (t[n] = e[n]);
    return t;
  }
  return t;
}
function su(e, t, n, r) {
  t = e.memoizedState, n = n(r, t), n = n == null ? t : ve({}, t, n), e.memoizedState = n, e.lanes === 0 && (e.updateQueue.baseState = n);
}
var ks = { isMounted: function(e) {
  return (e = e._reactInternals) ? sr(e) === e : !1;
}, enqueueSetState: function(e, t, n) {
  e = e._reactInternals;
  var r = Be(), i = Pn(e), a = rn(r, i);
  a.payload = t, n != null && (a.callback = n), t = En(e, a, i), t !== null && (It(t, e, i, r), Ja(t, e, i));
}, enqueueReplaceState: function(e, t, n) {
  e = e._reactInternals;
  var r = Be(), i = Pn(e), a = rn(r, i);
  a.tag = 1, a.payload = t, n != null && (a.callback = n), t = En(e, a, i), t !== null && (It(t, e, i, r), Ja(t, e, i));
}, enqueueForceUpdate: function(e, t) {
  e = e._reactInternals;
  var n = Be(), r = Pn(e), i = rn(n, r);
  i.tag = 2, t != null && (i.callback = t), t = En(e, i, r), t !== null && (It(t, e, r, n), Ja(t, e, r));
} };
function fd(e, t, n, r, i, a, o) {
  return e = e.stateNode, typeof e.shouldComponentUpdate == "function" ? e.shouldComponentUpdate(r, a, o) : t.prototype && t.prototype.isPureReactComponent ? !na(n, r) || !na(i, a) : !0;
}
function Bp(e, t, n) {
  var r = !1, i = On, a = t.contextType;
  return typeof a == "object" && a !== null ? a = wt(a) : (i = Qe(t) ? er : ze.current, r = t.contextTypes, a = (r = r != null) ? Ur(e, i) : On), t = new t(n, a), e.memoizedState = t.state !== null && t.state !== void 0 ? t.state : null, t.updater = ks, e.stateNode = t, t._reactInternals = e, r && (e = e.stateNode, e.__reactInternalMemoizedUnmaskedChildContext = i, e.__reactInternalMemoizedMaskedChildContext = a), t;
}
function xd(e, t, n, r) {
  e = t.state, typeof t.componentWillReceiveProps == "function" && t.componentWillReceiveProps(n, r), typeof t.UNSAFE_componentWillReceiveProps == "function" && t.UNSAFE_componentWillReceiveProps(n, r), t.state !== e && ks.enqueueReplaceState(t, t.state, null);
}
function lu(e, t, n, r) {
  var i = e.stateNode;
  i.props = n, i.state = e.memoizedState, i.refs = {}, vc(e);
  var a = t.contextType;
  typeof a == "object" && a !== null ? i.context = wt(a) : (a = Qe(t) ? er : ze.current, i.context = Ur(e, a)), i.state = e.memoizedState, a = t.getDerivedStateFromProps, typeof a == "function" && (su(e, t, a, n), i.state = e.memoizedState), typeof t.getDerivedStateFromProps == "function" || typeof i.getSnapshotBeforeUpdate == "function" || typeof i.UNSAFE_componentWillMount != "function" && typeof i.componentWillMount != "function" || (t = i.state, typeof i.componentWillMount == "function" && i.componentWillMount(), typeof i.UNSAFE_componentWillMount == "function" && i.UNSAFE_componentWillMount(), t !== i.state && ks.enqueueReplaceState(i, i.state, null), jo(e, n, i, r), i.state = e.memoizedState), typeof i.componentDidMount == "function" && (e.flags |= 4194308);
}
function Yr(e, t) {
  try {
    var n = "", r = t;
    do
      n += g4(r), r = r.return;
    while (r);
    var i = n;
  } catch (a) {
    i = `
Error generating stack: ` + a.message + `
` + a.stack;
  }
  return { value: e, source: t, stack: i, digest: null };
}
function sl(e, t, n) {
  return { value: e, source: null, stack: n ?? null, digest: t ?? null };
}
function uu(e, t) {
  try {
    console.error(t.value);
  } catch (n) {
    setTimeout(function() {
      throw n;
    });
  }
}
var $3 = typeof WeakMap == "function" ? WeakMap : Map;
function Up(e, t, n) {
  n = rn(-1, n), n.tag = 3, n.payload = { element: null };
  var r = t.value;
  return n.callback = function() {
    Bo || (Bo = !0, yu = r), uu(e, t);
  }, n;
}
function $p(e, t, n) {
  n = rn(-1, n), n.tag = 3;
  var r = e.type.getDerivedStateFromError;
  if (typeof r == "function") {
    var i = t.value;
    n.payload = function() {
      return r(i);
    }, n.callback = function() {
      uu(e, t);
    };
  }
  var a = e.stateNode;
  return a !== null && typeof a.componentDidCatch == "function" && (n.callback = function() {
    uu(e, t), typeof r != "function" && (Tn === null ? Tn = /* @__PURE__ */ new Set([this]) : Tn.add(this));
    var o = t.stack;
    this.componentDidCatch(t.value, { componentStack: o !== null ? o : "" });
  }), n;
}
function pd(e, t, n) {
  var r = e.pingCache;
  if (r === null) {
    r = e.pingCache = new $3();
    var i = /* @__PURE__ */ new Set();
    r.set(t, i);
  } else i = r.get(t), i === void 0 && (i = /* @__PURE__ */ new Set(), r.set(t, i));
  i.has(n) || (i.add(n), e = aw.bind(null, e, t, n), t.then(e, e));
}
function hd(e) {
  do {
    var t;
    if ((t = e.tag === 13) && (t = e.memoizedState, t = t !== null ? t.dehydrated !== null : !0), t) return e;
    e = e.return;
  } while (e !== null);
  return null;
}
function md(e, t, n, r, i) {
  return e.mode & 1 ? (e.flags |= 65536, e.lanes = i, e) : (e === t ? e.flags |= 65536 : (e.flags |= 128, n.flags |= 131072, n.flags &= -52805, n.tag === 1 && (n.alternate === null ? n.tag = 17 : (t = rn(-1, 1), t.tag = 2, En(n, t, 1))), n.lanes |= 1), e);
}
var Z3 = dn.ReactCurrentOwner, Ye = !1;
function Ve(e, t, n, r) {
  t.child = e === null ? wp(t, null, n, r) : Zr(t, e.child, n, r);
}
function vd(e, t, n, r, i) {
  n = n.render;
  var a = t.ref;
  return Hr(t, i), r = kc(e, t, n, r, a, i), n = Sc(), e !== null && !Ye ? (t.updateQueue = e.updateQueue, t.flags &= -2053, e.lanes &= ~i, un(e, t, i)) : (xe && n && cc(t), t.flags |= 1, Ve(e, t, r, i), t.child);
}
function gd(e, t, n, r, i) {
  if (e === null) {
    var a = n.type;
    return typeof a == "function" && !Dc(a) && a.defaultProps === void 0 && n.compare === null && n.defaultProps === void 0 ? (t.tag = 15, t.type = a, Zp(e, t, a, r, i)) : (e = ro(n.type, null, r, t, t.mode, i), e.ref = t.ref, e.return = t, t.child = e);
  }
  if (a = e.child, !(e.lanes & i)) {
    var o = a.memoizedProps;
    if (n = n.compare, n = n !== null ? n : na, n(o, r) && e.ref === t.ref) return un(e, t, i);
  }
  return t.flags |= 1, e = Nn(a, r), e.ref = t.ref, e.return = t, t.child = e;
}
function Zp(e, t, n, r, i) {
  if (e !== null) {
    var a = e.memoizedProps;
    if (na(a, r) && e.ref === t.ref) if (Ye = !1, t.pendingProps = r = a, (e.lanes & i) !== 0) e.flags & 131072 && (Ye = !0);
    else return t.lanes = e.lanes, un(e, t, i);
  }
  return cu(e, t, n, r, i);
}
function Gp(e, t, n) {
  var r = t.pendingProps, i = r.children, a = e !== null ? e.memoizedState : null;
  if (r.mode === "hidden") if (!(t.mode & 1)) t.memoizedState = { baseLanes: 0, cachePool: null, transitions: null }, oe(Nr, it), it |= n;
  else {
    if (!(n & 1073741824)) return e = a !== null ? a.baseLanes | n : n, t.lanes = t.childLanes = 1073741824, t.memoizedState = { baseLanes: e, cachePool: null, transitions: null }, t.updateQueue = null, oe(Nr, it), it |= e, null;
    t.memoizedState = { baseLanes: 0, cachePool: null, transitions: null }, r = a !== null ? a.baseLanes : n, oe(Nr, it), it |= r;
  }
  else a !== null ? (r = a.baseLanes | n, t.memoizedState = null) : r = n, oe(Nr, it), it |= r;
  return Ve(e, t, i, n), t.child;
}
function Yp(e, t) {
  var n = t.ref;
  (e === null && n !== null || e !== null && e.ref !== n) && (t.flags |= 512, t.flags |= 2097152);
}
function cu(e, t, n, r, i) {
  var a = Qe(n) ? er : ze.current;
  return a = Ur(t, a), Hr(t, i), n = kc(e, t, n, r, a, i), r = Sc(), e !== null && !Ye ? (t.updateQueue = e.updateQueue, t.flags &= -2053, e.lanes &= ~i, un(e, t, i)) : (xe && r && cc(t), t.flags |= 1, Ve(e, t, n, i), t.child);
}
function yd(e, t, n, r, i) {
  if (Qe(n)) {
    var a = !0;
    Do(t);
  } else a = !1;
  if (Hr(t, i), t.stateNode === null) eo(e, t), Bp(t, n, r), lu(t, n, r, i), r = !0;
  else if (e === null) {
    var o = t.stateNode, s = t.memoizedProps;
    o.props = s;
    var l = o.context, c = n.contextType;
    typeof c == "object" && c !== null ? c = wt(c) : (c = Qe(n) ? er : ze.current, c = Ur(t, c));
    var d = n.getDerivedStateFromProps, f = typeof d == "function" || typeof o.getSnapshotBeforeUpdate == "function";
    f || typeof o.UNSAFE_componentWillReceiveProps != "function" && typeof o.componentWillReceiveProps != "function" || (s !== r || l !== c) && xd(t, o, r, c), hn = !1;
    var m = t.memoizedState;
    o.state = m, jo(t, r, o, i), l = t.memoizedState, s !== r || m !== l || Xe.current || hn ? (typeof d == "function" && (su(t, n, d, r), l = t.memoizedState), (s = hn || fd(t, n, s, r, m, l, c)) ? (f || typeof o.UNSAFE_componentWillMount != "function" && typeof o.componentWillMount != "function" || (typeof o.componentWillMount == "function" && o.componentWillMount(), typeof o.UNSAFE_componentWillMount == "function" && o.UNSAFE_componentWillMount()), typeof o.componentDidMount == "function" && (t.flags |= 4194308)) : (typeof o.componentDidMount == "function" && (t.flags |= 4194308), t.memoizedProps = r, t.memoizedState = l), o.props = r, o.state = l, o.context = c, r = s) : (typeof o.componentDidMount == "function" && (t.flags |= 4194308), r = !1);
  } else {
    o = t.stateNode, kp(e, t), s = t.memoizedProps, c = t.type === t.elementType ? s : bt(t.type, s), o.props = c, f = t.pendingProps, m = o.context, l = n.contextType, typeof l == "object" && l !== null ? l = wt(l) : (l = Qe(n) ? er : ze.current, l = Ur(t, l));
    var w = n.getDerivedStateFromProps;
    (d = typeof w == "function" || typeof o.getSnapshotBeforeUpdate == "function") || typeof o.UNSAFE_componentWillReceiveProps != "function" && typeof o.componentWillReceiveProps != "function" || (s !== f || m !== l) && xd(t, o, r, l), hn = !1, m = t.memoizedState, o.state = m, jo(t, r, o, i);
    var y = t.memoizedState;
    s !== f || m !== y || Xe.current || hn ? (typeof w == "function" && (su(t, n, w, r), y = t.memoizedState), (c = hn || fd(t, n, c, r, m, y, l) || !1) ? (d || typeof o.UNSAFE_componentWillUpdate != "function" && typeof o.componentWillUpdate != "function" || (typeof o.componentWillUpdate == "function" && o.componentWillUpdate(r, y, l), typeof o.UNSAFE_componentWillUpdate == "function" && o.UNSAFE_componentWillUpdate(r, y, l)), typeof o.componentDidUpdate == "function" && (t.flags |= 4), typeof o.getSnapshotBeforeUpdate == "function" && (t.flags |= 1024)) : (typeof o.componentDidUpdate != "function" || s === e.memoizedProps && m === e.memoizedState || (t.flags |= 4), typeof o.getSnapshotBeforeUpdate != "function" || s === e.memoizedProps && m === e.memoizedState || (t.flags |= 1024), t.memoizedProps = r, t.memoizedState = y), o.props = r, o.state = y, o.context = l, r = c) : (typeof o.componentDidUpdate != "function" || s === e.memoizedProps && m === e.memoizedState || (t.flags |= 4), typeof o.getSnapshotBeforeUpdate != "function" || s === e.memoizedProps && m === e.memoizedState || (t.flags |= 1024), r = !1);
  }
  return du(e, t, n, r, a, i);
}
function du(e, t, n, r, i, a) {
  Yp(e, t);
  var o = (t.flags & 128) !== 0;
  if (!r && !o) return i && id(t, n, !1), un(e, t, a);
  r = t.stateNode, Z3.current = t;
  var s = o && typeof n.getDerivedStateFromError != "function" ? null : r.render();
  return t.flags |= 1, e !== null && o ? (t.child = Zr(t, e.child, null, a), t.child = Zr(t, null, s, a)) : Ve(e, t, s, a), t.memoizedState = r.state, i && id(t, n, !0), t.child;
}
function Xp(e) {
  var t = e.stateNode;
  t.pendingContext ? rd(e, t.pendingContext, t.pendingContext !== t.context) : t.context && rd(e, t.context, !1), gc(e, t.containerInfo);
}
function wd(e, t, n, r, i) {
  return $r(), fc(i), t.flags |= 256, Ve(e, t, n, r), t.child;
}
var fu = { dehydrated: null, treeContext: null, retryLane: 0 };
function xu(e) {
  return { baseLanes: e, cachePool: null, transitions: null };
}
function Qp(e, t, n) {
  var r = t.pendingProps, i = he.current, a = !1, o = (t.flags & 128) !== 0, s;
  if ((s = o) || (s = e !== null && e.memoizedState === null ? !1 : (i & 2) !== 0), s ? (a = !0, t.flags &= -129) : (e === null || e.memoizedState !== null) && (i |= 1), oe(he, i & 1), e === null)
    return au(t), e = t.memoizedState, e !== null && (e = e.dehydrated, e !== null) ? (t.mode & 1 ? e.data === "$!" ? t.lanes = 8 : t.lanes = 1073741824 : t.lanes = 1, null) : (o = r.children, e = r.fallback, a ? (r = t.mode, a = t.child, o = { mode: "hidden", children: o }, !(r & 1) && a !== null ? (a.childLanes = 0, a.pendingProps = o) : a = bs(o, r, 0, null), e = Qn(e, r, n, null), a.return = t, e.return = t, a.sibling = e, t.child = a, t.child.memoizedState = xu(n), t.memoizedState = fu, e) : Ec(t, o));
  if (i = e.memoizedState, i !== null && (s = i.dehydrated, s !== null)) return G3(e, t, o, r, s, i, n);
  if (a) {
    a = r.fallback, o = t.mode, i = e.child, s = i.sibling;
    var l = { mode: "hidden", children: r.children };
    return !(o & 1) && t.child !== i ? (r = t.child, r.childLanes = 0, r.pendingProps = l, t.deletions = null) : (r = Nn(i, l), r.subtreeFlags = i.subtreeFlags & 14680064), s !== null ? a = Nn(s, a) : (a = Qn(a, o, n, null), a.flags |= 2), a.return = t, r.return = t, r.sibling = a, t.child = r, r = a, a = t.child, o = e.child.memoizedState, o = o === null ? xu(n) : { baseLanes: o.baseLanes | n, cachePool: null, transitions: o.transitions }, a.memoizedState = o, a.childLanes = e.childLanes & ~n, t.memoizedState = fu, r;
  }
  return a = e.child, e = a.sibling, r = Nn(a, { mode: "visible", children: r.children }), !(t.mode & 1) && (r.lanes = n), r.return = t, r.sibling = null, e !== null && (n = t.deletions, n === null ? (t.deletions = [e], t.flags |= 16) : n.push(e)), t.child = r, t.memoizedState = null, r;
}
function Ec(e, t) {
  return t = bs({ mode: "visible", children: t }, e.mode, 0, null), t.return = e, e.child = t;
}
function Aa(e, t, n, r) {
  return r !== null && fc(r), Zr(t, e.child, null, n), e = Ec(t, t.pendingProps.children), e.flags |= 2, t.memoizedState = null, e;
}
function G3(e, t, n, r, i, a, o) {
  if (n)
    return t.flags & 256 ? (t.flags &= -257, r = sl(Error(b(422))), Aa(e, t, o, r)) : t.memoizedState !== null ? (t.child = e.child, t.flags |= 128, null) : (a = r.fallback, i = t.mode, r = bs({ mode: "visible", children: r.children }, i, 0, null), a = Qn(a, i, o, null), a.flags |= 2, r.return = t, a.return = t, r.sibling = a, t.child = r, t.mode & 1 && Zr(t, e.child, null, o), t.child.memoizedState = xu(o), t.memoizedState = fu, a);
  if (!(t.mode & 1)) return Aa(e, t, o, null);
  if (i.data === "$!") {
    if (r = i.nextSibling && i.nextSibling.dataset, r) var s = r.dgst;
    return r = s, a = Error(b(419)), r = sl(a, r, void 0), Aa(e, t, o, r);
  }
  if (s = (o & e.childLanes) !== 0, Ye || s) {
    if (r = Pe, r !== null) {
      switch (o & -o) {
        case 4:
          i = 2;
          break;
        case 16:
          i = 8;
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
          i = 32;
          break;
        case 536870912:
          i = 268435456;
          break;
        default:
          i = 0;
      }
      i = i & (r.suspendedLanes | o) ? 0 : i, i !== 0 && i !== a.retryLane && (a.retryLane = i, ln(e, i), It(r, e, i, -1));
    }
    return Rc(), r = sl(Error(b(421))), Aa(e, t, o, r);
  }
  return i.data === "$?" ? (t.flags |= 128, t.child = e.child, t = ow.bind(null, e), i._reactRetry = t, null) : (e = a.treeContext, at = bn(i.nextSibling), lt = t, xe = !0, Tt = null, e !== null && (mt[vt++] = tn, mt[vt++] = nn, mt[vt++] = tr, tn = e.id, nn = e.overflow, tr = t), t = Ec(t, r.children), t.flags |= 4096, t);
}
function _d(e, t, n) {
  e.lanes |= t;
  var r = e.alternate;
  r !== null && (r.lanes |= t), ou(e.return, t, n);
}
function ll(e, t, n, r, i) {
  var a = e.memoizedState;
  a === null ? e.memoizedState = { isBackwards: t, rendering: null, renderingStartTime: 0, last: r, tail: n, tailMode: i } : (a.isBackwards = t, a.rendering = null, a.renderingStartTime = 0, a.last = r, a.tail = n, a.tailMode = i);
}
function Jp(e, t, n) {
  var r = t.pendingProps, i = r.revealOrder, a = r.tail;
  if (Ve(e, t, r.children, n), r = he.current, r & 2) r = r & 1 | 2, t.flags |= 128;
  else {
    if (e !== null && e.flags & 128) e: for (e = t.child; e !== null; ) {
      if (e.tag === 13) e.memoizedState !== null && _d(e, n, t);
      else if (e.tag === 19) _d(e, n, t);
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
  if (oe(he, r), !(t.mode & 1)) t.memoizedState = null;
  else switch (i) {
    case "forwards":
      for (n = t.child, i = null; n !== null; ) e = n.alternate, e !== null && Fo(e) === null && (i = n), n = n.sibling;
      n = i, n === null ? (i = t.child, t.child = null) : (i = n.sibling, n.sibling = null), ll(t, !1, i, n, a);
      break;
    case "backwards":
      for (n = null, i = t.child, t.child = null; i !== null; ) {
        if (e = i.alternate, e !== null && Fo(e) === null) {
          t.child = i;
          break;
        }
        e = i.sibling, i.sibling = n, n = i, i = e;
      }
      ll(t, !0, n, null, a);
      break;
    case "together":
      ll(t, !1, null, null, void 0);
      break;
    default:
      t.memoizedState = null;
  }
  return t.child;
}
function eo(e, t) {
  !(t.mode & 1) && e !== null && (e.alternate = null, t.alternate = null, t.flags |= 2);
}
function un(e, t, n) {
  if (e !== null && (t.dependencies = e.dependencies), rr |= t.lanes, !(n & t.childLanes)) return null;
  if (e !== null && t.child !== e.child) throw Error(b(153));
  if (t.child !== null) {
    for (e = t.child, n = Nn(e, e.pendingProps), t.child = n, n.return = t; e.sibling !== null; ) e = e.sibling, n = n.sibling = Nn(e, e.pendingProps), n.return = t;
    n.sibling = null;
  }
  return t.child;
}
function Y3(e, t, n) {
  switch (t.tag) {
    case 3:
      Xp(t), $r();
      break;
    case 5:
      Sp(t);
      break;
    case 1:
      Qe(t.type) && Do(t);
      break;
    case 4:
      gc(t, t.stateNode.containerInfo);
      break;
    case 10:
      var r = t.type._context, i = t.memoizedProps.value;
      oe(Ho, r._currentValue), r._currentValue = i;
      break;
    case 13:
      if (r = t.memoizedState, r !== null)
        return r.dehydrated !== null ? (oe(he, he.current & 1), t.flags |= 128, null) : n & t.child.childLanes ? Qp(e, t, n) : (oe(he, he.current & 1), e = un(e, t, n), e !== null ? e.sibling : null);
      oe(he, he.current & 1);
      break;
    case 19:
      if (r = (n & t.childLanes) !== 0, e.flags & 128) {
        if (r) return Jp(e, t, n);
        t.flags |= 128;
      }
      if (i = t.memoizedState, i !== null && (i.rendering = null, i.tail = null, i.lastEffect = null), oe(he, he.current), r) break;
      return null;
    case 22:
    case 23:
      return t.lanes = 0, Gp(e, t, n);
  }
  return un(e, t, n);
}
var Kp, pu, qp, eh;
Kp = function(e, t) {
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
pu = function() {
};
qp = function(e, t, n, r) {
  var i = e.memoizedProps;
  if (i !== r) {
    e = t.stateNode, Gn(Gt.current);
    var a = null;
    switch (n) {
      case "input":
        i = Hl(e, i), r = Hl(e, r), a = [];
        break;
      case "select":
        i = ve({}, i, { value: void 0 }), r = ve({}, r, { value: void 0 }), a = [];
        break;
      case "textarea":
        i = Fl(e, i), r = Fl(e, r), a = [];
        break;
      default:
        typeof i.onClick != "function" && typeof r.onClick == "function" && (e.onclick = Io);
    }
    Wl(n, r);
    var o;
    n = null;
    for (c in i) if (!r.hasOwnProperty(c) && i.hasOwnProperty(c) && i[c] != null) if (c === "style") {
      var s = i[c];
      for (o in s) s.hasOwnProperty(o) && (n || (n = {}), n[o] = "");
    } else c !== "dangerouslySetInnerHTML" && c !== "children" && c !== "suppressContentEditableWarning" && c !== "suppressHydrationWarning" && c !== "autoFocus" && (Xi.hasOwnProperty(c) ? a || (a = []) : (a = a || []).push(c, null));
    for (c in r) {
      var l = r[c];
      if (s = i != null ? i[c] : void 0, r.hasOwnProperty(c) && l !== s && (l != null || s != null)) if (c === "style") if (s) {
        for (o in s) !s.hasOwnProperty(o) || l && l.hasOwnProperty(o) || (n || (n = {}), n[o] = "");
        for (o in l) l.hasOwnProperty(o) && s[o] !== l[o] && (n || (n = {}), n[o] = l[o]);
      } else n || (a || (a = []), a.push(
        c,
        n
      )), n = l;
      else c === "dangerouslySetInnerHTML" ? (l = l ? l.__html : void 0, s = s ? s.__html : void 0, l != null && s !== l && (a = a || []).push(c, l)) : c === "children" ? typeof l != "string" && typeof l != "number" || (a = a || []).push(c, "" + l) : c !== "suppressContentEditableWarning" && c !== "suppressHydrationWarning" && (Xi.hasOwnProperty(c) ? (l != null && c === "onScroll" && ce("scroll", e), a || s === l || (a = [])) : (a = a || []).push(c, l));
    }
    n && (a = a || []).push("style", n);
    var c = a;
    (t.updateQueue = c) && (t.flags |= 4);
  }
};
eh = function(e, t, n, r) {
  n !== r && (t.flags |= 4);
};
function di(e, t) {
  if (!xe) switch (e.tailMode) {
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
function Oe(e) {
  var t = e.alternate !== null && e.alternate.child === e.child, n = 0, r = 0;
  if (t) for (var i = e.child; i !== null; ) n |= i.lanes | i.childLanes, r |= i.subtreeFlags & 14680064, r |= i.flags & 14680064, i.return = e, i = i.sibling;
  else for (i = e.child; i !== null; ) n |= i.lanes | i.childLanes, r |= i.subtreeFlags, r |= i.flags, i.return = e, i = i.sibling;
  return e.subtreeFlags |= r, e.childLanes = n, t;
}
function X3(e, t, n) {
  var r = t.pendingProps;
  switch (dc(t), t.tag) {
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
      return Oe(t), null;
    case 1:
      return Qe(t.type) && Ro(), Oe(t), null;
    case 3:
      return r = t.stateNode, Gr(), de(Xe), de(ze), wc(), r.pendingContext && (r.context = r.pendingContext, r.pendingContext = null), (e === null || e.child === null) && (Oa(t) ? t.flags |= 4 : e === null || e.memoizedState.isDehydrated && !(t.flags & 256) || (t.flags |= 1024, Tt !== null && (ku(Tt), Tt = null))), pu(e, t), Oe(t), null;
    case 5:
      yc(t);
      var i = Gn(sa.current);
      if (n = t.type, e !== null && t.stateNode != null) qp(e, t, n, r, i), e.ref !== t.ref && (t.flags |= 512, t.flags |= 2097152);
      else {
        if (!r) {
          if (t.stateNode === null) throw Error(b(166));
          return Oe(t), null;
        }
        if (e = Gn(Gt.current), Oa(t)) {
          r = t.stateNode, n = t.type;
          var a = t.memoizedProps;
          switch (r[Vt] = t, r[aa] = a, e = (t.mode & 1) !== 0, n) {
            case "dialog":
              ce("cancel", r), ce("close", r);
              break;
            case "iframe":
            case "object":
            case "embed":
              ce("load", r);
              break;
            case "video":
            case "audio":
              for (i = 0; i < gi.length; i++) ce(gi[i], r);
              break;
            case "source":
              ce("error", r);
              break;
            case "img":
            case "image":
            case "link":
              ce(
                "error",
                r
              ), ce("load", r);
              break;
            case "details":
              ce("toggle", r);
              break;
            case "input":
              L0(r, a), ce("invalid", r);
              break;
            case "select":
              r._wrapperState = { wasMultiple: !!a.multiple }, ce("invalid", r);
              break;
            case "textarea":
              R0(r, a), ce("invalid", r);
          }
          Wl(n, a), i = null;
          for (var o in a) if (a.hasOwnProperty(o)) {
            var s = a[o];
            o === "children" ? typeof s == "string" ? r.textContent !== s && (a.suppressHydrationWarning !== !0 && Ma(r.textContent, s, e), i = ["children", s]) : typeof s == "number" && r.textContent !== "" + s && (a.suppressHydrationWarning !== !0 && Ma(
              r.textContent,
              s,
              e
            ), i = ["children", "" + s]) : Xi.hasOwnProperty(o) && s != null && o === "onScroll" && ce("scroll", r);
          }
          switch (n) {
            case "input":
              Ea(r), I0(r, a, !0);
              break;
            case "textarea":
              Ea(r), D0(r);
              break;
            case "select":
            case "option":
              break;
            default:
              typeof a.onClick == "function" && (r.onclick = Io);
          }
          r = i, t.updateQueue = r, r !== null && (t.flags |= 4);
        } else {
          o = i.nodeType === 9 ? i : i.ownerDocument, e === "http://www.w3.org/1999/xhtml" && (e = Px(n)), e === "http://www.w3.org/1999/xhtml" ? n === "script" ? (e = o.createElement("div"), e.innerHTML = "<script><\/script>", e = e.removeChild(e.firstChild)) : typeof r.is == "string" ? e = o.createElement(n, { is: r.is }) : (e = o.createElement(n), n === "select" && (o = e, r.multiple ? o.multiple = !0 : r.size && (o.size = r.size))) : e = o.createElementNS(e, n), e[Vt] = t, e[aa] = r, Kp(e, t, !1, !1), t.stateNode = e;
          e: {
            switch (o = Vl(n, r), n) {
              case "dialog":
                ce("cancel", e), ce("close", e), i = r;
                break;
              case "iframe":
              case "object":
              case "embed":
                ce("load", e), i = r;
                break;
              case "video":
              case "audio":
                for (i = 0; i < gi.length; i++) ce(gi[i], e);
                i = r;
                break;
              case "source":
                ce("error", e), i = r;
                break;
              case "img":
              case "image":
              case "link":
                ce(
                  "error",
                  e
                ), ce("load", e), i = r;
                break;
              case "details":
                ce("toggle", e), i = r;
                break;
              case "input":
                L0(e, r), i = Hl(e, r), ce("invalid", e);
                break;
              case "option":
                i = r;
                break;
              case "select":
                e._wrapperState = { wasMultiple: !!r.multiple }, i = ve({}, r, { value: void 0 }), ce("invalid", e);
                break;
              case "textarea":
                R0(e, r), i = Fl(e, r), ce("invalid", e);
                break;
              default:
                i = r;
            }
            Wl(n, i), s = i;
            for (a in s) if (s.hasOwnProperty(a)) {
              var l = s[a];
              a === "style" ? Ix(e, l) : a === "dangerouslySetInnerHTML" ? (l = l ? l.__html : void 0, l != null && Nx(e, l)) : a === "children" ? typeof l == "string" ? (n !== "textarea" || l !== "") && Qi(e, l) : typeof l == "number" && Qi(e, "" + l) : a !== "suppressContentEditableWarning" && a !== "suppressHydrationWarning" && a !== "autoFocus" && (Xi.hasOwnProperty(a) ? l != null && a === "onScroll" && ce("scroll", e) : l != null && Qu(e, a, l, o));
            }
            switch (n) {
              case "input":
                Ea(e), I0(e, r, !1);
                break;
              case "textarea":
                Ea(e), D0(e);
                break;
              case "option":
                r.value != null && e.setAttribute("value", "" + Mn(r.value));
                break;
              case "select":
                e.multiple = !!r.multiple, a = r.value, a != null ? Rr(e, !!r.multiple, a, !1) : r.defaultValue != null && Rr(
                  e,
                  !!r.multiple,
                  r.defaultValue,
                  !0
                );
                break;
              default:
                typeof i.onClick == "function" && (e.onclick = Io);
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
      return Oe(t), null;
    case 6:
      if (e && t.stateNode != null) eh(e, t, e.memoizedProps, r);
      else {
        if (typeof r != "string" && t.stateNode === null) throw Error(b(166));
        if (n = Gn(sa.current), Gn(Gt.current), Oa(t)) {
          if (r = t.stateNode, n = t.memoizedProps, r[Vt] = t, (a = r.nodeValue !== n) && (e = lt, e !== null)) switch (e.tag) {
            case 3:
              Ma(r.nodeValue, n, (e.mode & 1) !== 0);
              break;
            case 5:
              e.memoizedProps.suppressHydrationWarning !== !0 && Ma(r.nodeValue, n, (e.mode & 1) !== 0);
          }
          a && (t.flags |= 4);
        } else r = (n.nodeType === 9 ? n : n.ownerDocument).createTextNode(r), r[Vt] = t, t.stateNode = r;
      }
      return Oe(t), null;
    case 13:
      if (de(he), r = t.memoizedState, e === null || e.memoizedState !== null && e.memoizedState.dehydrated !== null) {
        if (xe && at !== null && t.mode & 1 && !(t.flags & 128)) gp(), $r(), t.flags |= 98560, a = !1;
        else if (a = Oa(t), r !== null && r.dehydrated !== null) {
          if (e === null) {
            if (!a) throw Error(b(318));
            if (a = t.memoizedState, a = a !== null ? a.dehydrated : null, !a) throw Error(b(317));
            a[Vt] = t;
          } else $r(), !(t.flags & 128) && (t.memoizedState = null), t.flags |= 4;
          Oe(t), a = !1;
        } else Tt !== null && (ku(Tt), Tt = null), a = !0;
        if (!a) return t.flags & 65536 ? t : null;
      }
      return t.flags & 128 ? (t.lanes = n, t) : (r = r !== null, r !== (e !== null && e.memoizedState !== null) && r && (t.child.flags |= 8192, t.mode & 1 && (e === null || he.current & 1 ? be === 0 && (be = 3) : Rc())), t.updateQueue !== null && (t.flags |= 4), Oe(t), null);
    case 4:
      return Gr(), pu(e, t), e === null && ra(t.stateNode.containerInfo), Oe(t), null;
    case 10:
      return hc(t.type._context), Oe(t), null;
    case 17:
      return Qe(t.type) && Ro(), Oe(t), null;
    case 19:
      if (de(he), a = t.memoizedState, a === null) return Oe(t), null;
      if (r = (t.flags & 128) !== 0, o = a.rendering, o === null) if (r) di(a, !1);
      else {
        if (be !== 0 || e !== null && e.flags & 128) for (e = t.child; e !== null; ) {
          if (o = Fo(e), o !== null) {
            for (t.flags |= 128, di(a, !1), r = o.updateQueue, r !== null && (t.updateQueue = r, t.flags |= 4), t.subtreeFlags = 0, r = n, n = t.child; n !== null; ) a = n, e = r, a.flags &= 14680066, o = a.alternate, o === null ? (a.childLanes = 0, a.lanes = e, a.child = null, a.subtreeFlags = 0, a.memoizedProps = null, a.memoizedState = null, a.updateQueue = null, a.dependencies = null, a.stateNode = null) : (a.childLanes = o.childLanes, a.lanes = o.lanes, a.child = o.child, a.subtreeFlags = 0, a.deletions = null, a.memoizedProps = o.memoizedProps, a.memoizedState = o.memoizedState, a.updateQueue = o.updateQueue, a.type = o.type, e = o.dependencies, a.dependencies = e === null ? null : { lanes: e.lanes, firstContext: e.firstContext }), n = n.sibling;
            return oe(he, he.current & 1 | 2), t.child;
          }
          e = e.sibling;
        }
        a.tail !== null && we() > Xr && (t.flags |= 128, r = !0, di(a, !1), t.lanes = 4194304);
      }
      else {
        if (!r) if (e = Fo(o), e !== null) {
          if (t.flags |= 128, r = !0, n = e.updateQueue, n !== null && (t.updateQueue = n, t.flags |= 4), di(a, !0), a.tail === null && a.tailMode === "hidden" && !o.alternate && !xe) return Oe(t), null;
        } else 2 * we() - a.renderingStartTime > Xr && n !== 1073741824 && (t.flags |= 128, r = !0, di(a, !1), t.lanes = 4194304);
        a.isBackwards ? (o.sibling = t.child, t.child = o) : (n = a.last, n !== null ? n.sibling = o : t.child = o, a.last = o);
      }
      return a.tail !== null ? (t = a.tail, a.rendering = t, a.tail = t.sibling, a.renderingStartTime = we(), t.sibling = null, n = he.current, oe(he, r ? n & 1 | 2 : n & 1), t) : (Oe(t), null);
    case 22:
    case 23:
      return Ic(), r = t.memoizedState !== null, e !== null && e.memoizedState !== null !== r && (t.flags |= 8192), r && t.mode & 1 ? it & 1073741824 && (Oe(t), t.subtreeFlags & 6 && (t.flags |= 8192)) : Oe(t), null;
    case 24:
      return null;
    case 25:
      return null;
  }
  throw Error(b(156, t.tag));
}
function Q3(e, t) {
  switch (dc(t), t.tag) {
    case 1:
      return Qe(t.type) && Ro(), e = t.flags, e & 65536 ? (t.flags = e & -65537 | 128, t) : null;
    case 3:
      return Gr(), de(Xe), de(ze), wc(), e = t.flags, e & 65536 && !(e & 128) ? (t.flags = e & -65537 | 128, t) : null;
    case 5:
      return yc(t), null;
    case 13:
      if (de(he), e = t.memoizedState, e !== null && e.dehydrated !== null) {
        if (t.alternate === null) throw Error(b(340));
        $r();
      }
      return e = t.flags, e & 65536 ? (t.flags = e & -65537 | 128, t) : null;
    case 19:
      return de(he), null;
    case 4:
      return Gr(), null;
    case 10:
      return hc(t.type._context), null;
    case 22:
    case 23:
      return Ic(), null;
    case 24:
      return null;
    default:
      return null;
  }
}
var ja = !1, je = !1, J3 = typeof WeakSet == "function" ? WeakSet : Set, D = null;
function Pr(e, t) {
  var n = e.ref;
  if (n !== null) if (typeof n == "function") try {
    n(null);
  } catch (r) {
    ge(e, t, r);
  }
  else n.current = null;
}
function hu(e, t, n) {
  try {
    n();
  } catch (r) {
    ge(e, t, r);
  }
}
var kd = !1;
function K3(e, t) {
  if (Kl = Po, e = ap(), uc(e)) {
    if ("selectionStart" in e) var n = { start: e.selectionStart, end: e.selectionEnd };
    else {
      n = (n = e.ownerDocument) && n.defaultView || window;
      var r = n.getSelection && n.getSelection();
      if (r && r.rangeCount !== 0) {
        n = r.anchorNode;
        var i = r.anchorOffset, a = r.focusNode;
        r = r.focusOffset;
        var o = 0, s = -1, l = -1, c = 0, d = 0, f = e, m = null;
        e: for (; ; ) {
          for (var w; f !== n || i !== 0 && f.nodeType !== 3 || (s = o + i), f !== a || r !== 0 && f.nodeType !== 3 || (l = o + r), f.nodeType === 3 && (o += f.nodeValue.length), (w = f.firstChild) !== null; )
            m = f, f = w;
          for (; ; ) {
            if (f === e) break e;
            if (m === n && ++c === i && (s = o), m === a && ++d === r && (l = o), (w = f.nextSibling) !== null) break;
            f = m, m = f.parentNode;
          }
          f = w;
        }
        n = s === -1 || l === -1 ? null : { start: s, end: l };
      } else n = null;
    }
    n = n || { start: 0, end: 0 };
  } else n = null;
  for (ql = { focusedElem: e, selectionRange: n }, Po = !1, D = t; D !== null; ) if (t = D, e = t.child, (t.subtreeFlags & 1028) !== 0 && e !== null) e.return = t, D = e;
  else for (; D !== null; ) {
    t = D;
    try {
      var y = t.alternate;
      if (t.flags & 1024) switch (t.tag) {
        case 0:
        case 11:
        case 15:
          break;
        case 1:
          if (y !== null) {
            var x = y.memoizedProps, _ = y.memoizedState, u = t.stateNode, p = u.getSnapshotBeforeUpdate(t.elementType === t.type ? x : bt(t.type, x), _);
            u.__reactInternalSnapshotBeforeUpdate = p;
          }
          break;
        case 3:
          var h = t.stateNode.containerInfo;
          h.nodeType === 1 ? h.textContent = "" : h.nodeType === 9 && h.documentElement && h.removeChild(h.documentElement);
          break;
        case 5:
        case 6:
        case 4:
        case 17:
          break;
        default:
          throw Error(b(163));
      }
    } catch (g) {
      ge(t, t.return, g);
    }
    if (e = t.sibling, e !== null) {
      e.return = t.return, D = e;
      break;
    }
    D = t.return;
  }
  return y = kd, kd = !1, y;
}
function Ei(e, t, n) {
  var r = t.updateQueue;
  if (r = r !== null ? r.lastEffect : null, r !== null) {
    var i = r = r.next;
    do {
      if ((i.tag & e) === e) {
        var a = i.destroy;
        i.destroy = void 0, a !== void 0 && hu(t, n, a);
      }
      i = i.next;
    } while (i !== r);
  }
}
function Ss(e, t) {
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
function mu(e) {
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
function th(e) {
  var t = e.alternate;
  t !== null && (e.alternate = null, th(t)), e.child = null, e.deletions = null, e.sibling = null, e.tag === 5 && (t = e.stateNode, t !== null && (delete t[Vt], delete t[aa], delete t[nu], delete t[M3], delete t[O3])), e.stateNode = null, e.return = null, e.dependencies = null, e.memoizedProps = null, e.memoizedState = null, e.pendingProps = null, e.stateNode = null, e.updateQueue = null;
}
function nh(e) {
  return e.tag === 5 || e.tag === 3 || e.tag === 4;
}
function Sd(e) {
  e: for (; ; ) {
    for (; e.sibling === null; ) {
      if (e.return === null || nh(e.return)) return null;
      e = e.return;
    }
    for (e.sibling.return = e.return, e = e.sibling; e.tag !== 5 && e.tag !== 6 && e.tag !== 18; ) {
      if (e.flags & 2 || e.child === null || e.tag === 4) continue e;
      e.child.return = e, e = e.child;
    }
    if (!(e.flags & 2)) return e.stateNode;
  }
}
function vu(e, t, n) {
  var r = e.tag;
  if (r === 5 || r === 6) e = e.stateNode, t ? n.nodeType === 8 ? n.parentNode.insertBefore(e, t) : n.insertBefore(e, t) : (n.nodeType === 8 ? (t = n.parentNode, t.insertBefore(e, n)) : (t = n, t.appendChild(e)), n = n._reactRootContainer, n != null || t.onclick !== null || (t.onclick = Io));
  else if (r !== 4 && (e = e.child, e !== null)) for (vu(e, t, n), e = e.sibling; e !== null; ) vu(e, t, n), e = e.sibling;
}
function gu(e, t, n) {
  var r = e.tag;
  if (r === 5 || r === 6) e = e.stateNode, t ? n.insertBefore(e, t) : n.appendChild(e);
  else if (r !== 4 && (e = e.child, e !== null)) for (gu(e, t, n), e = e.sibling; e !== null; ) gu(e, t, n), e = e.sibling;
}
var Le = null, Et = !1;
function xn(e, t, n) {
  for (n = n.child; n !== null; ) rh(e, t, n), n = n.sibling;
}
function rh(e, t, n) {
  if (Zt && typeof Zt.onCommitFiberUnmount == "function") try {
    Zt.onCommitFiberUnmount(hs, n);
  } catch {
  }
  switch (n.tag) {
    case 5:
      je || Pr(n, t);
    case 6:
      var r = Le, i = Et;
      Le = null, xn(e, t, n), Le = r, Et = i, Le !== null && (Et ? (e = Le, n = n.stateNode, e.nodeType === 8 ? e.parentNode.removeChild(n) : e.removeChild(n)) : Le.removeChild(n.stateNode));
      break;
    case 18:
      Le !== null && (Et ? (e = Le, n = n.stateNode, e.nodeType === 8 ? tl(e.parentNode, n) : e.nodeType === 1 && tl(e, n), ea(e)) : tl(Le, n.stateNode));
      break;
    case 4:
      r = Le, i = Et, Le = n.stateNode.containerInfo, Et = !0, xn(e, t, n), Le = r, Et = i;
      break;
    case 0:
    case 11:
    case 14:
    case 15:
      if (!je && (r = n.updateQueue, r !== null && (r = r.lastEffect, r !== null))) {
        i = r = r.next;
        do {
          var a = i, o = a.destroy;
          a = a.tag, o !== void 0 && (a & 2 || a & 4) && hu(n, t, o), i = i.next;
        } while (i !== r);
      }
      xn(e, t, n);
      break;
    case 1:
      if (!je && (Pr(n, t), r = n.stateNode, typeof r.componentWillUnmount == "function")) try {
        r.props = n.memoizedProps, r.state = n.memoizedState, r.componentWillUnmount();
      } catch (s) {
        ge(n, t, s);
      }
      xn(e, t, n);
      break;
    case 21:
      xn(e, t, n);
      break;
    case 22:
      n.mode & 1 ? (je = (r = je) || n.memoizedState !== null, xn(e, t, n), je = r) : xn(e, t, n);
      break;
    default:
      xn(e, t, n);
  }
}
function Cd(e) {
  var t = e.updateQueue;
  if (t !== null) {
    e.updateQueue = null;
    var n = e.stateNode;
    n === null && (n = e.stateNode = new J3()), t.forEach(function(r) {
      var i = sw.bind(null, e, r);
      n.has(r) || (n.add(r), r.then(i, i));
    });
  }
}
function St(e, t) {
  var n = t.deletions;
  if (n !== null) for (var r = 0; r < n.length; r++) {
    var i = n[r];
    try {
      var a = e, o = t, s = o;
      e: for (; s !== null; ) {
        switch (s.tag) {
          case 5:
            Le = s.stateNode, Et = !1;
            break e;
          case 3:
            Le = s.stateNode.containerInfo, Et = !0;
            break e;
          case 4:
            Le = s.stateNode.containerInfo, Et = !0;
            break e;
        }
        s = s.return;
      }
      if (Le === null) throw Error(b(160));
      rh(a, o, i), Le = null, Et = !1;
      var l = i.alternate;
      l !== null && (l.return = null), i.return = null;
    } catch (c) {
      ge(i, t, c);
    }
  }
  if (t.subtreeFlags & 12854) for (t = t.child; t !== null; ) ih(t, e), t = t.sibling;
}
function ih(e, t) {
  var n = e.alternate, r = e.flags;
  switch (e.tag) {
    case 0:
    case 11:
    case 14:
    case 15:
      if (St(t, e), Ht(e), r & 4) {
        try {
          Ei(3, e, e.return), Ss(3, e);
        } catch (x) {
          ge(e, e.return, x);
        }
        try {
          Ei(5, e, e.return);
        } catch (x) {
          ge(e, e.return, x);
        }
      }
      break;
    case 1:
      St(t, e), Ht(e), r & 512 && n !== null && Pr(n, n.return);
      break;
    case 5:
      if (St(t, e), Ht(e), r & 512 && n !== null && Pr(n, n.return), e.flags & 32) {
        var i = e.stateNode;
        try {
          Qi(i, "");
        } catch (x) {
          ge(e, e.return, x);
        }
      }
      if (r & 4 && (i = e.stateNode, i != null)) {
        var a = e.memoizedProps, o = n !== null ? n.memoizedProps : a, s = e.type, l = e.updateQueue;
        if (e.updateQueue = null, l !== null) try {
          s === "input" && a.type === "radio" && a.name != null && Ex(i, a), Vl(s, o);
          var c = Vl(s, a);
          for (o = 0; o < l.length; o += 2) {
            var d = l[o], f = l[o + 1];
            d === "style" ? Ix(i, f) : d === "dangerouslySetInnerHTML" ? Nx(i, f) : d === "children" ? Qi(i, f) : Qu(i, d, f, c);
          }
          switch (s) {
            case "input":
              Al(i, a);
              break;
            case "textarea":
              Tx(i, a);
              break;
            case "select":
              var m = i._wrapperState.wasMultiple;
              i._wrapperState.wasMultiple = !!a.multiple;
              var w = a.value;
              w != null ? Rr(i, !!a.multiple, w, !1) : m !== !!a.multiple && (a.defaultValue != null ? Rr(
                i,
                !!a.multiple,
                a.defaultValue,
                !0
              ) : Rr(i, !!a.multiple, a.multiple ? [] : "", !1));
          }
          i[aa] = a;
        } catch (x) {
          ge(e, e.return, x);
        }
      }
      break;
    case 6:
      if (St(t, e), Ht(e), r & 4) {
        if (e.stateNode === null) throw Error(b(162));
        i = e.stateNode, a = e.memoizedProps;
        try {
          i.nodeValue = a;
        } catch (x) {
          ge(e, e.return, x);
        }
      }
      break;
    case 3:
      if (St(t, e), Ht(e), r & 4 && n !== null && n.memoizedState.isDehydrated) try {
        ea(t.containerInfo);
      } catch (x) {
        ge(e, e.return, x);
      }
      break;
    case 4:
      St(t, e), Ht(e);
      break;
    case 13:
      St(t, e), Ht(e), i = e.child, i.flags & 8192 && (a = i.memoizedState !== null, i.stateNode.isHidden = a, !a || i.alternate !== null && i.alternate.memoizedState !== null || (Nc = we())), r & 4 && Cd(e);
      break;
    case 22:
      if (d = n !== null && n.memoizedState !== null, e.mode & 1 ? (je = (c = je) || d, St(t, e), je = c) : St(t, e), Ht(e), r & 8192) {
        if (c = e.memoizedState !== null, (e.stateNode.isHidden = c) && !d && e.mode & 1) for (D = e, d = e.child; d !== null; ) {
          for (f = D = d; D !== null; ) {
            switch (m = D, w = m.child, m.tag) {
              case 0:
              case 11:
              case 14:
              case 15:
                Ei(4, m, m.return);
                break;
              case 1:
                Pr(m, m.return);
                var y = m.stateNode;
                if (typeof y.componentWillUnmount == "function") {
                  r = m, n = m.return;
                  try {
                    t = r, y.props = t.memoizedProps, y.state = t.memoizedState, y.componentWillUnmount();
                  } catch (x) {
                    ge(r, n, x);
                  }
                }
                break;
              case 5:
                Pr(m, m.return);
                break;
              case 22:
                if (m.memoizedState !== null) {
                  Ed(f);
                  continue;
                }
            }
            w !== null ? (w.return = m, D = w) : Ed(f);
          }
          d = d.sibling;
        }
        e: for (d = null, f = e; ; ) {
          if (f.tag === 5) {
            if (d === null) {
              d = f;
              try {
                i = f.stateNode, c ? (a = i.style, typeof a.setProperty == "function" ? a.setProperty("display", "none", "important") : a.display = "none") : (s = f.stateNode, l = f.memoizedProps.style, o = l != null && l.hasOwnProperty("display") ? l.display : null, s.style.display = Lx("display", o));
              } catch (x) {
                ge(e, e.return, x);
              }
            }
          } else if (f.tag === 6) {
            if (d === null) try {
              f.stateNode.nodeValue = c ? "" : f.memoizedProps;
            } catch (x) {
              ge(e, e.return, x);
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
      St(t, e), Ht(e), r & 4 && Cd(e);
      break;
    case 21:
      break;
    default:
      St(
        t,
        e
      ), Ht(e);
  }
}
function Ht(e) {
  var t = e.flags;
  if (t & 2) {
    try {
      e: {
        for (var n = e.return; n !== null; ) {
          if (nh(n)) {
            var r = n;
            break e;
          }
          n = n.return;
        }
        throw Error(b(160));
      }
      switch (r.tag) {
        case 5:
          var i = r.stateNode;
          r.flags & 32 && (Qi(i, ""), r.flags &= -33);
          var a = Sd(e);
          gu(e, a, i);
          break;
        case 3:
        case 4:
          var o = r.stateNode.containerInfo, s = Sd(e);
          vu(e, s, o);
          break;
        default:
          throw Error(b(161));
      }
    } catch (l) {
      ge(e, e.return, l);
    }
    e.flags &= -3;
  }
  t & 4096 && (e.flags &= -4097);
}
function q3(e, t, n) {
  D = e, ah(e);
}
function ah(e, t, n) {
  for (var r = (e.mode & 1) !== 0; D !== null; ) {
    var i = D, a = i.child;
    if (i.tag === 22 && r) {
      var o = i.memoizedState !== null || ja;
      if (!o) {
        var s = i.alternate, l = s !== null && s.memoizedState !== null || je;
        s = ja;
        var c = je;
        if (ja = o, (je = l) && !c) for (D = i; D !== null; ) o = D, l = o.child, o.tag === 22 && o.memoizedState !== null ? Td(i) : l !== null ? (l.return = o, D = l) : Td(i);
        for (; a !== null; ) D = a, ah(a), a = a.sibling;
        D = i, ja = s, je = c;
      }
      bd(e);
    } else i.subtreeFlags & 8772 && a !== null ? (a.return = i, D = a) : bd(e);
  }
}
function bd(e) {
  for (; D !== null; ) {
    var t = D;
    if (t.flags & 8772) {
      var n = t.alternate;
      try {
        if (t.flags & 8772) switch (t.tag) {
          case 0:
          case 11:
          case 15:
            je || Ss(5, t);
            break;
          case 1:
            var r = t.stateNode;
            if (t.flags & 4 && !je) if (n === null) r.componentDidMount();
            else {
              var i = t.elementType === t.type ? n.memoizedProps : bt(t.type, n.memoizedProps);
              r.componentDidUpdate(i, n.memoizedState, r.__reactInternalSnapshotBeforeUpdate);
            }
            var a = t.updateQueue;
            a !== null && ud(t, a, r);
            break;
          case 3:
            var o = t.updateQueue;
            if (o !== null) {
              if (n = null, t.child !== null) switch (t.child.tag) {
                case 5:
                  n = t.child.stateNode;
                  break;
                case 1:
                  n = t.child.stateNode;
              }
              ud(t, o, n);
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
                  f !== null && ea(f);
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
            throw Error(b(163));
        }
        je || t.flags & 512 && mu(t);
      } catch (m) {
        ge(t, t.return, m);
      }
    }
    if (t === e) {
      D = null;
      break;
    }
    if (n = t.sibling, n !== null) {
      n.return = t.return, D = n;
      break;
    }
    D = t.return;
  }
}
function Ed(e) {
  for (; D !== null; ) {
    var t = D;
    if (t === e) {
      D = null;
      break;
    }
    var n = t.sibling;
    if (n !== null) {
      n.return = t.return, D = n;
      break;
    }
    D = t.return;
  }
}
function Td(e) {
  for (; D !== null; ) {
    var t = D;
    try {
      switch (t.tag) {
        case 0:
        case 11:
        case 15:
          var n = t.return;
          try {
            Ss(4, t);
          } catch (l) {
            ge(t, n, l);
          }
          break;
        case 1:
          var r = t.stateNode;
          if (typeof r.componentDidMount == "function") {
            var i = t.return;
            try {
              r.componentDidMount();
            } catch (l) {
              ge(t, i, l);
            }
          }
          var a = t.return;
          try {
            mu(t);
          } catch (l) {
            ge(t, a, l);
          }
          break;
        case 5:
          var o = t.return;
          try {
            mu(t);
          } catch (l) {
            ge(t, o, l);
          }
      }
    } catch (l) {
      ge(t, t.return, l);
    }
    if (t === e) {
      D = null;
      break;
    }
    var s = t.sibling;
    if (s !== null) {
      s.return = t.return, D = s;
      break;
    }
    D = t.return;
  }
}
var ew = Math.ceil, Vo = dn.ReactCurrentDispatcher, Tc = dn.ReactCurrentOwner, yt = dn.ReactCurrentBatchConfig, J = 0, Pe = null, ke = null, Re = 0, it = 0, Nr = jn(0), be = 0, da = null, rr = 0, Cs = 0, Pc = 0, Ti = null, Ge = null, Nc = 0, Xr = 1 / 0, Kt = null, Bo = !1, yu = null, Tn = null, Fa = !1, _n = null, Uo = 0, Pi = 0, wu = null, to = -1, no = 0;
function Be() {
  return J & 6 ? we() : to !== -1 ? to : to = we();
}
function Pn(e) {
  return e.mode & 1 ? J & 2 && Re !== 0 ? Re & -Re : A3.transition !== null ? (no === 0 && (no = Bx()), no) : (e = re, e !== 0 || (e = window.event, e = e === void 0 ? 16 : Qx(e.type)), e) : 1;
}
function It(e, t, n, r) {
  if (50 < Pi) throw Pi = 0, wu = null, Error(b(185));
  va(e, n, r), (!(J & 2) || e !== Pe) && (e === Pe && (!(J & 2) && (Cs |= n), be === 4 && gn(e, Re)), Je(e, r), n === 1 && J === 0 && !(t.mode & 1) && (Xr = we() + 500, ws && Fn()));
}
function Je(e, t) {
  var n = e.callbackNode;
  A4(e, t);
  var r = To(e, e === Pe ? Re : 0);
  if (r === 0) n !== null && H0(n), e.callbackNode = null, e.callbackPriority = 0;
  else if (t = r & -r, e.callbackPriority !== t) {
    if (n != null && H0(n), t === 1) e.tag === 0 ? H3(Pd.bind(null, e)) : hp(Pd.bind(null, e)), R3(function() {
      !(J & 6) && Fn();
    }), n = null;
    else {
      switch (Ux(r)) {
        case 1:
          n = tc;
          break;
        case 4:
          n = Wx;
          break;
        case 16:
          n = Eo;
          break;
        case 536870912:
          n = Vx;
          break;
        default:
          n = Eo;
      }
      n = xh(n, oh.bind(null, e));
    }
    e.callbackPriority = t, e.callbackNode = n;
  }
}
function oh(e, t) {
  if (to = -1, no = 0, J & 6) throw Error(b(327));
  var n = e.callbackNode;
  if (Ar() && e.callbackNode !== n) return null;
  var r = To(e, e === Pe ? Re : 0);
  if (r === 0) return null;
  if (r & 30 || r & e.expiredLanes || t) t = $o(e, r);
  else {
    t = r;
    var i = J;
    J |= 2;
    var a = lh();
    (Pe !== e || Re !== t) && (Kt = null, Xr = we() + 500, Xn(e, t));
    do
      try {
        rw();
        break;
      } catch (s) {
        sh(e, s);
      }
    while (!0);
    pc(), Vo.current = a, J = i, ke !== null ? t = 0 : (Pe = null, Re = 0, t = be);
  }
  if (t !== 0) {
    if (t === 2 && (i = Gl(e), i !== 0 && (r = i, t = _u(e, i))), t === 1) throw n = da, Xn(e, 0), gn(e, r), Je(e, we()), n;
    if (t === 6) gn(e, r);
    else {
      if (i = e.current.alternate, !(r & 30) && !tw(i) && (t = $o(e, r), t === 2 && (a = Gl(e), a !== 0 && (r = a, t = _u(e, a))), t === 1)) throw n = da, Xn(e, 0), gn(e, r), Je(e, we()), n;
      switch (e.finishedWork = i, e.finishedLanes = r, t) {
        case 0:
        case 1:
          throw Error(b(345));
        case 2:
          Bn(e, Ge, Kt);
          break;
        case 3:
          if (gn(e, r), (r & 130023424) === r && (t = Nc + 500 - we(), 10 < t)) {
            if (To(e, 0) !== 0) break;
            if (i = e.suspendedLanes, (i & r) !== r) {
              Be(), e.pingedLanes |= e.suspendedLanes & i;
              break;
            }
            e.timeoutHandle = tu(Bn.bind(null, e, Ge, Kt), t);
            break;
          }
          Bn(e, Ge, Kt);
          break;
        case 4:
          if (gn(e, r), (r & 4194240) === r) break;
          for (t = e.eventTimes, i = -1; 0 < r; ) {
            var o = 31 - Lt(r);
            a = 1 << o, o = t[o], o > i && (i = o), r &= ~a;
          }
          if (r = i, r = we() - r, r = (120 > r ? 120 : 480 > r ? 480 : 1080 > r ? 1080 : 1920 > r ? 1920 : 3e3 > r ? 3e3 : 4320 > r ? 4320 : 1960 * ew(r / 1960)) - r, 10 < r) {
            e.timeoutHandle = tu(Bn.bind(null, e, Ge, Kt), r);
            break;
          }
          Bn(e, Ge, Kt);
          break;
        case 5:
          Bn(e, Ge, Kt);
          break;
        default:
          throw Error(b(329));
      }
    }
  }
  return Je(e, we()), e.callbackNode === n ? oh.bind(null, e) : null;
}
function _u(e, t) {
  var n = Ti;
  return e.current.memoizedState.isDehydrated && (Xn(e, t).flags |= 256), e = $o(e, t), e !== 2 && (t = Ge, Ge = n, t !== null && ku(t)), e;
}
function ku(e) {
  Ge === null ? Ge = e : Ge.push.apply(Ge, e);
}
function tw(e) {
  for (var t = e; ; ) {
    if (t.flags & 16384) {
      var n = t.updateQueue;
      if (n !== null && (n = n.stores, n !== null)) for (var r = 0; r < n.length; r++) {
        var i = n[r], a = i.getSnapshot;
        i = i.value;
        try {
          if (!Dt(a(), i)) return !1;
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
function gn(e, t) {
  for (t &= ~Pc, t &= ~Cs, e.suspendedLanes |= t, e.pingedLanes &= ~t, e = e.expirationTimes; 0 < t; ) {
    var n = 31 - Lt(t), r = 1 << n;
    e[n] = -1, t &= ~r;
  }
}
function Pd(e) {
  if (J & 6) throw Error(b(327));
  Ar();
  var t = To(e, 0);
  if (!(t & 1)) return Je(e, we()), null;
  var n = $o(e, t);
  if (e.tag !== 0 && n === 2) {
    var r = Gl(e);
    r !== 0 && (t = r, n = _u(e, r));
  }
  if (n === 1) throw n = da, Xn(e, 0), gn(e, t), Je(e, we()), n;
  if (n === 6) throw Error(b(345));
  return e.finishedWork = e.current.alternate, e.finishedLanes = t, Bn(e, Ge, Kt), Je(e, we()), null;
}
function Lc(e, t) {
  var n = J;
  J |= 1;
  try {
    return e(t);
  } finally {
    J = n, J === 0 && (Xr = we() + 500, ws && Fn());
  }
}
function ir(e) {
  _n !== null && _n.tag === 0 && !(J & 6) && Ar();
  var t = J;
  J |= 1;
  var n = yt.transition, r = re;
  try {
    if (yt.transition = null, re = 1, e) return e();
  } finally {
    re = r, yt.transition = n, J = t, !(J & 6) && Fn();
  }
}
function Ic() {
  it = Nr.current, de(Nr);
}
function Xn(e, t) {
  e.finishedWork = null, e.finishedLanes = 0;
  var n = e.timeoutHandle;
  if (n !== -1 && (e.timeoutHandle = -1, I3(n)), ke !== null) for (n = ke.return; n !== null; ) {
    var r = n;
    switch (dc(r), r.tag) {
      case 1:
        r = r.type.childContextTypes, r != null && Ro();
        break;
      case 3:
        Gr(), de(Xe), de(ze), wc();
        break;
      case 5:
        yc(r);
        break;
      case 4:
        Gr();
        break;
      case 13:
        de(he);
        break;
      case 19:
        de(he);
        break;
      case 10:
        hc(r.type._context);
        break;
      case 22:
      case 23:
        Ic();
    }
    n = n.return;
  }
  if (Pe = e, ke = e = Nn(e.current, null), Re = it = t, be = 0, da = null, Pc = Cs = rr = 0, Ge = Ti = null, Zn !== null) {
    for (t = 0; t < Zn.length; t++) if (n = Zn[t], r = n.interleaved, r !== null) {
      n.interleaved = null;
      var i = r.next, a = n.pending;
      if (a !== null) {
        var o = a.next;
        a.next = i, r.next = o;
      }
      n.pending = r;
    }
    Zn = null;
  }
  return e;
}
function sh(e, t) {
  do {
    var n = ke;
    try {
      if (pc(), Ka.current = Wo, zo) {
        for (var r = me.memoizedState; r !== null; ) {
          var i = r.queue;
          i !== null && (i.pending = null), r = r.next;
        }
        zo = !1;
      }
      if (nr = 0, Te = Ce = me = null, bi = !1, la = 0, Tc.current = null, n === null || n.return === null) {
        be = 1, da = t, ke = null;
        break;
      }
      e: {
        var a = e, o = n.return, s = n, l = t;
        if (t = Re, s.flags |= 32768, l !== null && typeof l == "object" && typeof l.then == "function") {
          var c = l, d = s, f = d.tag;
          if (!(d.mode & 1) && (f === 0 || f === 11 || f === 15)) {
            var m = d.alternate;
            m ? (d.updateQueue = m.updateQueue, d.memoizedState = m.memoizedState, d.lanes = m.lanes) : (d.updateQueue = null, d.memoizedState = null);
          }
          var w = hd(o);
          if (w !== null) {
            w.flags &= -257, md(w, o, s, a, t), w.mode & 1 && pd(a, c, t), t = w, l = c;
            var y = t.updateQueue;
            if (y === null) {
              var x = /* @__PURE__ */ new Set();
              x.add(l), t.updateQueue = x;
            } else y.add(l);
            break e;
          } else {
            if (!(t & 1)) {
              pd(a, c, t), Rc();
              break e;
            }
            l = Error(b(426));
          }
        } else if (xe && s.mode & 1) {
          var _ = hd(o);
          if (_ !== null) {
            !(_.flags & 65536) && (_.flags |= 256), md(_, o, s, a, t), fc(Yr(l, s));
            break e;
          }
        }
        a = l = Yr(l, s), be !== 4 && (be = 2), Ti === null ? Ti = [a] : Ti.push(a), a = o;
        do {
          switch (a.tag) {
            case 3:
              a.flags |= 65536, t &= -t, a.lanes |= t;
              var u = Up(a, l, t);
              ld(a, u);
              break e;
            case 1:
              s = l;
              var p = a.type, h = a.stateNode;
              if (!(a.flags & 128) && (typeof p.getDerivedStateFromError == "function" || h !== null && typeof h.componentDidCatch == "function" && (Tn === null || !Tn.has(h)))) {
                a.flags |= 65536, t &= -t, a.lanes |= t;
                var g = $p(a, s, t);
                ld(a, g);
                break e;
              }
          }
          a = a.return;
        } while (a !== null);
      }
      ch(n);
    } catch (k) {
      t = k, ke === n && n !== null && (ke = n = n.return);
      continue;
    }
    break;
  } while (!0);
}
function lh() {
  var e = Vo.current;
  return Vo.current = Wo, e === null ? Wo : e;
}
function Rc() {
  (be === 0 || be === 3 || be === 2) && (be = 4), Pe === null || !(rr & 268435455) && !(Cs & 268435455) || gn(Pe, Re);
}
function $o(e, t) {
  var n = J;
  J |= 2;
  var r = lh();
  (Pe !== e || Re !== t) && (Kt = null, Xn(e, t));
  do
    try {
      nw();
      break;
    } catch (i) {
      sh(e, i);
    }
  while (!0);
  if (pc(), J = n, Vo.current = r, ke !== null) throw Error(b(261));
  return Pe = null, Re = 0, be;
}
function nw() {
  for (; ke !== null; ) uh(ke);
}
function rw() {
  for (; ke !== null && !P4(); ) uh(ke);
}
function uh(e) {
  var t = fh(e.alternate, e, it);
  e.memoizedProps = e.pendingProps, t === null ? ch(e) : ke = t, Tc.current = null;
}
function ch(e) {
  var t = e;
  do {
    var n = t.alternate;
    if (e = t.return, t.flags & 32768) {
      if (n = Q3(n, t), n !== null) {
        n.flags &= 32767, ke = n;
        return;
      }
      if (e !== null) e.flags |= 32768, e.subtreeFlags = 0, e.deletions = null;
      else {
        be = 6, ke = null;
        return;
      }
    } else if (n = X3(n, t, it), n !== null) {
      ke = n;
      return;
    }
    if (t = t.sibling, t !== null) {
      ke = t;
      return;
    }
    ke = t = e;
  } while (t !== null);
  be === 0 && (be = 5);
}
function Bn(e, t, n) {
  var r = re, i = yt.transition;
  try {
    yt.transition = null, re = 1, iw(e, t, n, r);
  } finally {
    yt.transition = i, re = r;
  }
  return null;
}
function iw(e, t, n, r) {
  do
    Ar();
  while (_n !== null);
  if (J & 6) throw Error(b(327));
  n = e.finishedWork;
  var i = e.finishedLanes;
  if (n === null) return null;
  if (e.finishedWork = null, e.finishedLanes = 0, n === e.current) throw Error(b(177));
  e.callbackNode = null, e.callbackPriority = 0;
  var a = n.lanes | n.childLanes;
  if (j4(e, a), e === Pe && (ke = Pe = null, Re = 0), !(n.subtreeFlags & 2064) && !(n.flags & 2064) || Fa || (Fa = !0, xh(Eo, function() {
    return Ar(), null;
  })), a = (n.flags & 15990) !== 0, n.subtreeFlags & 15990 || a) {
    a = yt.transition, yt.transition = null;
    var o = re;
    re = 1;
    var s = J;
    J |= 4, Tc.current = null, K3(e, n), ih(n, e), C3(ql), Po = !!Kl, ql = Kl = null, e.current = n, q3(n), N4(), J = s, re = o, yt.transition = a;
  } else e.current = n;
  if (Fa && (Fa = !1, _n = e, Uo = i), a = e.pendingLanes, a === 0 && (Tn = null), R4(n.stateNode), Je(e, we()), t !== null) for (r = e.onRecoverableError, n = 0; n < t.length; n++) i = t[n], r(i.value, { componentStack: i.stack, digest: i.digest });
  if (Bo) throw Bo = !1, e = yu, yu = null, e;
  return Uo & 1 && e.tag !== 0 && Ar(), a = e.pendingLanes, a & 1 ? e === wu ? Pi++ : (Pi = 0, wu = e) : Pi = 0, Fn(), null;
}
function Ar() {
  if (_n !== null) {
    var e = Ux(Uo), t = yt.transition, n = re;
    try {
      if (yt.transition = null, re = 16 > e ? 16 : e, _n === null) var r = !1;
      else {
        if (e = _n, _n = null, Uo = 0, J & 6) throw Error(b(331));
        var i = J;
        for (J |= 4, D = e.current; D !== null; ) {
          var a = D, o = a.child;
          if (D.flags & 16) {
            var s = a.deletions;
            if (s !== null) {
              for (var l = 0; l < s.length; l++) {
                var c = s[l];
                for (D = c; D !== null; ) {
                  var d = D;
                  switch (d.tag) {
                    case 0:
                    case 11:
                    case 15:
                      Ei(8, d, a);
                  }
                  var f = d.child;
                  if (f !== null) f.return = d, D = f;
                  else for (; D !== null; ) {
                    d = D;
                    var m = d.sibling, w = d.return;
                    if (th(d), d === c) {
                      D = null;
                      break;
                    }
                    if (m !== null) {
                      m.return = w, D = m;
                      break;
                    }
                    D = w;
                  }
                }
              }
              var y = a.alternate;
              if (y !== null) {
                var x = y.child;
                if (x !== null) {
                  y.child = null;
                  do {
                    var _ = x.sibling;
                    x.sibling = null, x = _;
                  } while (x !== null);
                }
              }
              D = a;
            }
          }
          if (a.subtreeFlags & 2064 && o !== null) o.return = a, D = o;
          else e: for (; D !== null; ) {
            if (a = D, a.flags & 2048) switch (a.tag) {
              case 0:
              case 11:
              case 15:
                Ei(9, a, a.return);
            }
            var u = a.sibling;
            if (u !== null) {
              u.return = a.return, D = u;
              break e;
            }
            D = a.return;
          }
        }
        var p = e.current;
        for (D = p; D !== null; ) {
          o = D;
          var h = o.child;
          if (o.subtreeFlags & 2064 && h !== null) h.return = o, D = h;
          else e: for (o = p; D !== null; ) {
            if (s = D, s.flags & 2048) try {
              switch (s.tag) {
                case 0:
                case 11:
                case 15:
                  Ss(9, s);
              }
            } catch (k) {
              ge(s, s.return, k);
            }
            if (s === o) {
              D = null;
              break e;
            }
            var g = s.sibling;
            if (g !== null) {
              g.return = s.return, D = g;
              break e;
            }
            D = s.return;
          }
        }
        if (J = i, Fn(), Zt && typeof Zt.onPostCommitFiberRoot == "function") try {
          Zt.onPostCommitFiberRoot(hs, e);
        } catch {
        }
        r = !0;
      }
      return r;
    } finally {
      re = n, yt.transition = t;
    }
  }
  return !1;
}
function Nd(e, t, n) {
  t = Yr(n, t), t = Up(e, t, 1), e = En(e, t, 1), t = Be(), e !== null && (va(e, 1, t), Je(e, t));
}
function ge(e, t, n) {
  if (e.tag === 3) Nd(e, e, n);
  else for (; t !== null; ) {
    if (t.tag === 3) {
      Nd(t, e, n);
      break;
    } else if (t.tag === 1) {
      var r = t.stateNode;
      if (typeof t.type.getDerivedStateFromError == "function" || typeof r.componentDidCatch == "function" && (Tn === null || !Tn.has(r))) {
        e = Yr(n, e), e = $p(t, e, 1), t = En(t, e, 1), e = Be(), t !== null && (va(t, 1, e), Je(t, e));
        break;
      }
    }
    t = t.return;
  }
}
function aw(e, t, n) {
  var r = e.pingCache;
  r !== null && r.delete(t), t = Be(), e.pingedLanes |= e.suspendedLanes & n, Pe === e && (Re & n) === n && (be === 4 || be === 3 && (Re & 130023424) === Re && 500 > we() - Nc ? Xn(e, 0) : Pc |= n), Je(e, t);
}
function dh(e, t) {
  t === 0 && (e.mode & 1 ? (t = Na, Na <<= 1, !(Na & 130023424) && (Na = 4194304)) : t = 1);
  var n = Be();
  e = ln(e, t), e !== null && (va(e, t, n), Je(e, n));
}
function ow(e) {
  var t = e.memoizedState, n = 0;
  t !== null && (n = t.retryLane), dh(e, n);
}
function sw(e, t) {
  var n = 0;
  switch (e.tag) {
    case 13:
      var r = e.stateNode, i = e.memoizedState;
      i !== null && (n = i.retryLane);
      break;
    case 19:
      r = e.stateNode;
      break;
    default:
      throw Error(b(314));
  }
  r !== null && r.delete(t), dh(e, n);
}
var fh;
fh = function(e, t, n) {
  if (e !== null) if (e.memoizedProps !== t.pendingProps || Xe.current) Ye = !0;
  else {
    if (!(e.lanes & n) && !(t.flags & 128)) return Ye = !1, Y3(e, t, n);
    Ye = !!(e.flags & 131072);
  }
  else Ye = !1, xe && t.flags & 1048576 && mp(t, Oo, t.index);
  switch (t.lanes = 0, t.tag) {
    case 2:
      var r = t.type;
      eo(e, t), e = t.pendingProps;
      var i = Ur(t, ze.current);
      Hr(t, n), i = kc(null, t, r, e, i, n);
      var a = Sc();
      return t.flags |= 1, typeof i == "object" && i !== null && typeof i.render == "function" && i.$$typeof === void 0 ? (t.tag = 1, t.memoizedState = null, t.updateQueue = null, Qe(r) ? (a = !0, Do(t)) : a = !1, t.memoizedState = i.state !== null && i.state !== void 0 ? i.state : null, vc(t), i.updater = ks, t.stateNode = i, i._reactInternals = t, lu(t, r, e, n), t = du(null, t, r, !0, a, n)) : (t.tag = 0, xe && a && cc(t), Ve(null, t, i, n), t = t.child), t;
    case 16:
      r = t.elementType;
      e: {
        switch (eo(e, t), e = t.pendingProps, i = r._init, r = i(r._payload), t.type = r, i = t.tag = uw(r), e = bt(r, e), i) {
          case 0:
            t = cu(null, t, r, e, n);
            break e;
          case 1:
            t = yd(null, t, r, e, n);
            break e;
          case 11:
            t = vd(null, t, r, e, n);
            break e;
          case 14:
            t = gd(null, t, r, bt(r.type, e), n);
            break e;
        }
        throw Error(b(
          306,
          r,
          ""
        ));
      }
      return t;
    case 0:
      return r = t.type, i = t.pendingProps, i = t.elementType === r ? i : bt(r, i), cu(e, t, r, i, n);
    case 1:
      return r = t.type, i = t.pendingProps, i = t.elementType === r ? i : bt(r, i), yd(e, t, r, i, n);
    case 3:
      e: {
        if (Xp(t), e === null) throw Error(b(387));
        r = t.pendingProps, a = t.memoizedState, i = a.element, kp(e, t), jo(t, r, null, n);
        var o = t.memoizedState;
        if (r = o.element, a.isDehydrated) if (a = { element: r, isDehydrated: !1, cache: o.cache, pendingSuspenseBoundaries: o.pendingSuspenseBoundaries, transitions: o.transitions }, t.updateQueue.baseState = a, t.memoizedState = a, t.flags & 256) {
          i = Yr(Error(b(423)), t), t = wd(e, t, r, n, i);
          break e;
        } else if (r !== i) {
          i = Yr(Error(b(424)), t), t = wd(e, t, r, n, i);
          break e;
        } else for (at = bn(t.stateNode.containerInfo.firstChild), lt = t, xe = !0, Tt = null, n = wp(t, null, r, n), t.child = n; n; ) n.flags = n.flags & -3 | 4096, n = n.sibling;
        else {
          if ($r(), r === i) {
            t = un(e, t, n);
            break e;
          }
          Ve(e, t, r, n);
        }
        t = t.child;
      }
      return t;
    case 5:
      return Sp(t), e === null && au(t), r = t.type, i = t.pendingProps, a = e !== null ? e.memoizedProps : null, o = i.children, eu(r, i) ? o = null : a !== null && eu(r, a) && (t.flags |= 32), Yp(e, t), Ve(e, t, o, n), t.child;
    case 6:
      return e === null && au(t), null;
    case 13:
      return Qp(e, t, n);
    case 4:
      return gc(t, t.stateNode.containerInfo), r = t.pendingProps, e === null ? t.child = Zr(t, null, r, n) : Ve(e, t, r, n), t.child;
    case 11:
      return r = t.type, i = t.pendingProps, i = t.elementType === r ? i : bt(r, i), vd(e, t, r, i, n);
    case 7:
      return Ve(e, t, t.pendingProps, n), t.child;
    case 8:
      return Ve(e, t, t.pendingProps.children, n), t.child;
    case 12:
      return Ve(e, t, t.pendingProps.children, n), t.child;
    case 10:
      e: {
        if (r = t.type._context, i = t.pendingProps, a = t.memoizedProps, o = i.value, oe(Ho, r._currentValue), r._currentValue = o, a !== null) if (Dt(a.value, o)) {
          if (a.children === i.children && !Xe.current) {
            t = un(e, t, n);
            break e;
          }
        } else for (a = t.child, a !== null && (a.return = t); a !== null; ) {
          var s = a.dependencies;
          if (s !== null) {
            o = a.child;
            for (var l = s.firstContext; l !== null; ) {
              if (l.context === r) {
                if (a.tag === 1) {
                  l = rn(-1, n & -n), l.tag = 2;
                  var c = a.updateQueue;
                  if (c !== null) {
                    c = c.shared;
                    var d = c.pending;
                    d === null ? l.next = l : (l.next = d.next, d.next = l), c.pending = l;
                  }
                }
                a.lanes |= n, l = a.alternate, l !== null && (l.lanes |= n), ou(
                  a.return,
                  n,
                  t
                ), s.lanes |= n;
                break;
              }
              l = l.next;
            }
          } else if (a.tag === 10) o = a.type === t.type ? null : a.child;
          else if (a.tag === 18) {
            if (o = a.return, o === null) throw Error(b(341));
            o.lanes |= n, s = o.alternate, s !== null && (s.lanes |= n), ou(o, n, t), o = a.sibling;
          } else o = a.child;
          if (o !== null) o.return = a;
          else for (o = a; o !== null; ) {
            if (o === t) {
              o = null;
              break;
            }
            if (a = o.sibling, a !== null) {
              a.return = o.return, o = a;
              break;
            }
            o = o.return;
          }
          a = o;
        }
        Ve(e, t, i.children, n), t = t.child;
      }
      return t;
    case 9:
      return i = t.type, r = t.pendingProps.children, Hr(t, n), i = wt(i), r = r(i), t.flags |= 1, Ve(e, t, r, n), t.child;
    case 14:
      return r = t.type, i = bt(r, t.pendingProps), i = bt(r.type, i), gd(e, t, r, i, n);
    case 15:
      return Zp(e, t, t.type, t.pendingProps, n);
    case 17:
      return r = t.type, i = t.pendingProps, i = t.elementType === r ? i : bt(r, i), eo(e, t), t.tag = 1, Qe(r) ? (e = !0, Do(t)) : e = !1, Hr(t, n), Bp(t, r, i), lu(t, r, i, n), du(null, t, r, !0, e, n);
    case 19:
      return Jp(e, t, n);
    case 22:
      return Gp(e, t, n);
  }
  throw Error(b(156, t.tag));
};
function xh(e, t) {
  return zx(e, t);
}
function lw(e, t, n, r) {
  this.tag = e, this.key = n, this.sibling = this.child = this.return = this.stateNode = this.type = this.elementType = null, this.index = 0, this.ref = null, this.pendingProps = t, this.dependencies = this.memoizedState = this.updateQueue = this.memoizedProps = null, this.mode = r, this.subtreeFlags = this.flags = 0, this.deletions = null, this.childLanes = this.lanes = 0, this.alternate = null;
}
function gt(e, t, n, r) {
  return new lw(e, t, n, r);
}
function Dc(e) {
  return e = e.prototype, !(!e || !e.isReactComponent);
}
function uw(e) {
  if (typeof e == "function") return Dc(e) ? 1 : 0;
  if (e != null) {
    if (e = e.$$typeof, e === Ku) return 11;
    if (e === qu) return 14;
  }
  return 2;
}
function Nn(e, t) {
  var n = e.alternate;
  return n === null ? (n = gt(e.tag, t, e.key, e.mode), n.elementType = e.elementType, n.type = e.type, n.stateNode = e.stateNode, n.alternate = e, e.alternate = n) : (n.pendingProps = t, n.type = e.type, n.flags = 0, n.subtreeFlags = 0, n.deletions = null), n.flags = e.flags & 14680064, n.childLanes = e.childLanes, n.lanes = e.lanes, n.child = e.child, n.memoizedProps = e.memoizedProps, n.memoizedState = e.memoizedState, n.updateQueue = e.updateQueue, t = e.dependencies, n.dependencies = t === null ? null : { lanes: t.lanes, firstContext: t.firstContext }, n.sibling = e.sibling, n.index = e.index, n.ref = e.ref, n;
}
function ro(e, t, n, r, i, a) {
  var o = 2;
  if (r = e, typeof e == "function") Dc(e) && (o = 1);
  else if (typeof e == "string") o = 5;
  else e: switch (e) {
    case yr:
      return Qn(n.children, i, a, t);
    case Ju:
      o = 8, i |= 8;
      break;
    case Rl:
      return e = gt(12, n, t, i | 2), e.elementType = Rl, e.lanes = a, e;
    case Dl:
      return e = gt(13, n, t, i), e.elementType = Dl, e.lanes = a, e;
    case Ml:
      return e = gt(19, n, t, i), e.elementType = Ml, e.lanes = a, e;
    case Sx:
      return bs(n, i, a, t);
    default:
      if (typeof e == "object" && e !== null) switch (e.$$typeof) {
        case _x:
          o = 10;
          break e;
        case kx:
          o = 9;
          break e;
        case Ku:
          o = 11;
          break e;
        case qu:
          o = 14;
          break e;
        case pn:
          o = 16, r = null;
          break e;
      }
      throw Error(b(130, e == null ? e : typeof e, ""));
  }
  return t = gt(o, n, t, i), t.elementType = e, t.type = r, t.lanes = a, t;
}
function Qn(e, t, n, r) {
  return e = gt(7, e, r, t), e.lanes = n, e;
}
function bs(e, t, n, r) {
  return e = gt(22, e, r, t), e.elementType = Sx, e.lanes = n, e.stateNode = { isHidden: !1 }, e;
}
function ul(e, t, n) {
  return e = gt(6, e, null, t), e.lanes = n, e;
}
function cl(e, t, n) {
  return t = gt(4, e.children !== null ? e.children : [], e.key, t), t.lanes = n, t.stateNode = { containerInfo: e.containerInfo, pendingChildren: null, implementation: e.implementation }, t;
}
function cw(e, t, n, r, i) {
  this.tag = t, this.containerInfo = e, this.finishedWork = this.pingCache = this.current = this.pendingChildren = null, this.timeoutHandle = -1, this.callbackNode = this.pendingContext = this.context = null, this.callbackPriority = 0, this.eventTimes = Us(0), this.expirationTimes = Us(-1), this.entangledLanes = this.finishedLanes = this.mutableReadLanes = this.expiredLanes = this.pingedLanes = this.suspendedLanes = this.pendingLanes = 0, this.entanglements = Us(0), this.identifierPrefix = r, this.onRecoverableError = i, this.mutableSourceEagerHydrationData = null;
}
function Mc(e, t, n, r, i, a, o, s, l) {
  return e = new cw(e, t, n, s, l), t === 1 ? (t = 1, a === !0 && (t |= 8)) : t = 0, a = gt(3, null, null, t), e.current = a, a.stateNode = e, a.memoizedState = { element: r, isDehydrated: n, cache: null, transitions: null, pendingSuspenseBoundaries: null }, vc(a), e;
}
function dw(e, t, n) {
  var r = 3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
  return { $$typeof: gr, key: r == null ? null : "" + r, children: e, containerInfo: t, implementation: n };
}
function ph(e) {
  if (!e) return On;
  e = e._reactInternals;
  e: {
    if (sr(e) !== e || e.tag !== 1) throw Error(b(170));
    var t = e;
    do {
      switch (t.tag) {
        case 3:
          t = t.stateNode.context;
          break e;
        case 1:
          if (Qe(t.type)) {
            t = t.stateNode.__reactInternalMemoizedMergedChildContext;
            break e;
          }
      }
      t = t.return;
    } while (t !== null);
    throw Error(b(171));
  }
  if (e.tag === 1) {
    var n = e.type;
    if (Qe(n)) return pp(e, n, t);
  }
  return t;
}
function hh(e, t, n, r, i, a, o, s, l) {
  return e = Mc(n, r, !0, e, i, a, o, s, l), e.context = ph(null), n = e.current, r = Be(), i = Pn(n), a = rn(r, i), a.callback = t ?? null, En(n, a, i), e.current.lanes = i, va(e, i, r), Je(e, r), e;
}
function Es(e, t, n, r) {
  var i = t.current, a = Be(), o = Pn(i);
  return n = ph(n), t.context === null ? t.context = n : t.pendingContext = n, t = rn(a, o), t.payload = { element: e }, r = r === void 0 ? null : r, r !== null && (t.callback = r), e = En(i, t, o), e !== null && (It(e, i, o, a), Ja(e, i, o)), o;
}
function Zo(e) {
  if (e = e.current, !e.child) return null;
  switch (e.child.tag) {
    case 5:
      return e.child.stateNode;
    default:
      return e.child.stateNode;
  }
}
function Ld(e, t) {
  if (e = e.memoizedState, e !== null && e.dehydrated !== null) {
    var n = e.retryLane;
    e.retryLane = n !== 0 && n < t ? n : t;
  }
}
function Oc(e, t) {
  Ld(e, t), (e = e.alternate) && Ld(e, t);
}
function fw() {
  return null;
}
var mh = typeof reportError == "function" ? reportError : function(e) {
  console.error(e);
};
function Hc(e) {
  this._internalRoot = e;
}
Ts.prototype.render = Hc.prototype.render = function(e) {
  var t = this._internalRoot;
  if (t === null) throw Error(b(409));
  Es(e, t, null, null);
};
Ts.prototype.unmount = Hc.prototype.unmount = function() {
  var e = this._internalRoot;
  if (e !== null) {
    this._internalRoot = null;
    var t = e.containerInfo;
    ir(function() {
      Es(null, e, null, null);
    }), t[sn] = null;
  }
};
function Ts(e) {
  this._internalRoot = e;
}
Ts.prototype.unstable_scheduleHydration = function(e) {
  if (e) {
    var t = Gx();
    e = { blockedOn: null, target: e, priority: t };
    for (var n = 0; n < vn.length && t !== 0 && t < vn[n].priority; n++) ;
    vn.splice(n, 0, e), n === 0 && Xx(e);
  }
};
function Ac(e) {
  return !(!e || e.nodeType !== 1 && e.nodeType !== 9 && e.nodeType !== 11);
}
function Ps(e) {
  return !(!e || e.nodeType !== 1 && e.nodeType !== 9 && e.nodeType !== 11 && (e.nodeType !== 8 || e.nodeValue !== " react-mount-point-unstable "));
}
function Id() {
}
function xw(e, t, n, r, i) {
  if (i) {
    if (typeof r == "function") {
      var a = r;
      r = function() {
        var c = Zo(o);
        a.call(c);
      };
    }
    var o = hh(t, r, e, 0, null, !1, !1, "", Id);
    return e._reactRootContainer = o, e[sn] = o.current, ra(e.nodeType === 8 ? e.parentNode : e), ir(), o;
  }
  for (; i = e.lastChild; ) e.removeChild(i);
  if (typeof r == "function") {
    var s = r;
    r = function() {
      var c = Zo(l);
      s.call(c);
    };
  }
  var l = Mc(e, 0, !1, null, null, !1, !1, "", Id);
  return e._reactRootContainer = l, e[sn] = l.current, ra(e.nodeType === 8 ? e.parentNode : e), ir(function() {
    Es(t, l, n, r);
  }), l;
}
function Ns(e, t, n, r, i) {
  var a = n._reactRootContainer;
  if (a) {
    var o = a;
    if (typeof i == "function") {
      var s = i;
      i = function() {
        var l = Zo(o);
        s.call(l);
      };
    }
    Es(t, o, e, i);
  } else o = xw(n, t, e, i, r);
  return Zo(o);
}
$x = function(e) {
  switch (e.tag) {
    case 3:
      var t = e.stateNode;
      if (t.current.memoizedState.isDehydrated) {
        var n = vi(t.pendingLanes);
        n !== 0 && (nc(t, n | 1), Je(t, we()), !(J & 6) && (Xr = we() + 500, Fn()));
      }
      break;
    case 13:
      ir(function() {
        var r = ln(e, 1);
        if (r !== null) {
          var i = Be();
          It(r, e, 1, i);
        }
      }), Oc(e, 1);
  }
};
rc = function(e) {
  if (e.tag === 13) {
    var t = ln(e, 134217728);
    if (t !== null) {
      var n = Be();
      It(t, e, 134217728, n);
    }
    Oc(e, 134217728);
  }
};
Zx = function(e) {
  if (e.tag === 13) {
    var t = Pn(e), n = ln(e, t);
    if (n !== null) {
      var r = Be();
      It(n, e, t, r);
    }
    Oc(e, t);
  }
};
Gx = function() {
  return re;
};
Yx = function(e, t) {
  var n = re;
  try {
    return re = e, t();
  } finally {
    re = n;
  }
};
Ul = function(e, t, n) {
  switch (t) {
    case "input":
      if (Al(e, n), t = n.name, n.type === "radio" && t != null) {
        for (n = e; n.parentNode; ) n = n.parentNode;
        for (n = n.querySelectorAll("input[name=" + JSON.stringify("" + t) + '][type="radio"]'), t = 0; t < n.length; t++) {
          var r = n[t];
          if (r !== e && r.form === e.form) {
            var i = ys(r);
            if (!i) throw Error(b(90));
            bx(r), Al(r, i);
          }
        }
      }
      break;
    case "textarea":
      Tx(e, n);
      break;
    case "select":
      t = n.value, t != null && Rr(e, !!n.multiple, t, !1);
  }
};
Mx = Lc;
Ox = ir;
var pw = { usingClientEntryPoint: !1, Events: [ya, Sr, ys, Rx, Dx, Lc] }, fi = { findFiberByHostInstance: $n, bundleType: 0, version: "18.3.1", rendererPackageName: "react-dom" }, hw = { bundleType: fi.bundleType, version: fi.version, rendererPackageName: fi.rendererPackageName, rendererConfig: fi.rendererConfig, overrideHookState: null, overrideHookStateDeletePath: null, overrideHookStateRenamePath: null, overrideProps: null, overridePropsDeletePath: null, overridePropsRenamePath: null, setErrorHandler: null, setSuspenseHandler: null, scheduleUpdate: null, currentDispatcherRef: dn.ReactCurrentDispatcher, findHostInstanceByFiber: function(e) {
  return e = jx(e), e === null ? null : e.stateNode;
}, findFiberByHostInstance: fi.findFiberByHostInstance || fw, findHostInstancesForRefresh: null, scheduleRefresh: null, scheduleRoot: null, setRefreshHandler: null, getCurrentFiber: null, reconcilerVersion: "18.3.1-next-f1338f8080-20240426" };
if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < "u") {
  var za = __REACT_DEVTOOLS_GLOBAL_HOOK__;
  if (!za.isDisabled && za.supportsFiber) try {
    hs = za.inject(hw), Zt = za;
  } catch {
  }
}
dt.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = pw;
dt.createPortal = function(e, t) {
  var n = 2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
  if (!Ac(t)) throw Error(b(200));
  return dw(e, t, null, n);
};
dt.createRoot = function(e, t) {
  if (!Ac(e)) throw Error(b(299));
  var n = !1, r = "", i = mh;
  return t != null && (t.unstable_strictMode === !0 && (n = !0), t.identifierPrefix !== void 0 && (r = t.identifierPrefix), t.onRecoverableError !== void 0 && (i = t.onRecoverableError)), t = Mc(e, 1, !1, null, null, n, !1, r, i), e[sn] = t.current, ra(e.nodeType === 8 ? e.parentNode : e), new Hc(t);
};
dt.findDOMNode = function(e) {
  if (e == null) return null;
  if (e.nodeType === 1) return e;
  var t = e._reactInternals;
  if (t === void 0)
    throw typeof e.render == "function" ? Error(b(188)) : (e = Object.keys(e).join(","), Error(b(268, e)));
  return e = jx(t), e = e === null ? null : e.stateNode, e;
};
dt.flushSync = function(e) {
  return ir(e);
};
dt.hydrate = function(e, t, n) {
  if (!Ps(t)) throw Error(b(200));
  return Ns(null, e, t, !0, n);
};
dt.hydrateRoot = function(e, t, n) {
  if (!Ac(e)) throw Error(b(405));
  var r = n != null && n.hydratedSources || null, i = !1, a = "", o = mh;
  if (n != null && (n.unstable_strictMode === !0 && (i = !0), n.identifierPrefix !== void 0 && (a = n.identifierPrefix), n.onRecoverableError !== void 0 && (o = n.onRecoverableError)), t = hh(t, null, e, 1, n ?? null, i, !1, a, o), e[sn] = t.current, ra(e), r) for (e = 0; e < r.length; e++) n = r[e], i = n._getVersion, i = i(n._source), t.mutableSourceEagerHydrationData == null ? t.mutableSourceEagerHydrationData = [n, i] : t.mutableSourceEagerHydrationData.push(
    n,
    i
  );
  return new Ts(t);
};
dt.render = function(e, t, n) {
  if (!Ps(t)) throw Error(b(200));
  return Ns(null, e, t, !1, n);
};
dt.unmountComponentAtNode = function(e) {
  if (!Ps(e)) throw Error(b(40));
  return e._reactRootContainer ? (ir(function() {
    Ns(null, null, e, !1, function() {
      e._reactRootContainer = null, e[sn] = null;
    });
  }), !0) : !1;
};
dt.unstable_batchedUpdates = Lc;
dt.unstable_renderSubtreeIntoContainer = function(e, t, n, r) {
  if (!Ps(n)) throw Error(b(200));
  if (e == null || e._reactInternals === void 0) throw Error(b(38));
  return Ns(e, t, n, !1, r);
};
dt.version = "18.3.1-next-f1338f8080-20240426";
function vh() {
  if (!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > "u" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != "function"))
    try {
      __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(vh);
    } catch (e) {
      console.error(e);
    }
}
vh(), vx.exports = dt;
var mw = vx.exports, io, vw = mw;
io = vw.createRoot;
var Rd;
const gh = "procaptcha.bundle.js", yh = () => document.querySelector('script[src*="'.concat(gh, '"]')), gw = (e) => {
  const t = yh();
  if (t && t.src.indexOf("".concat(e)) !== -1) {
    const n = new URLSearchParams(t.src.split("?")[1]);
    return {
      onloadUrlCallback: n.get("onload") || void 0,
      renderExplicit: n.get("render") || void 0
    };
  }
  return { onloadUrlCallback: void 0, renderExplicit: void 0 };
}, wh = (e) => (e || (e = ""), s4.parse({
  defaultEnvironment: ko.parse("production"),
  userAccountAddress: "",
  account: {
    address: e
  },
  serverUrl: "",
  mongoAtlasUri: "",
  devOnlyWatchEvents: !1
})), yw = (e) => e.closest("form"), Un = (e) => {
  const t = window[e.replace("window.", "")];
  if (typeof t != "function")
    throw new Error("Callback ".concat(e, " is not defined on the window object"));
  return t;
}, Su = (e, t) => {
  Wt();
  const n = yw(e);
  if (!n) {
    console.error("Parent form not found for the element:", e);
    return;
  }
  const r = document.createElement("input");
  r.type = "hidden", r.name = I.procaptchaResponse, r.value = t, n.appendChild(r);
}, ww = /* @__PURE__ */ new Set(["light", "dark"]), _w = (e) => ww.has(e) ? e : "light", kw = (e, t, n) => {
  const r = (e == null ? void 0 : e["challenge-valid-length"]) || t.getAttribute("data-challenge-valid-length");
  r && (n.captchas.image.solutionTimeout = Number.parseInt(r), n.captchas.pow.solutionTimeout = Number.parseInt(r));
}, Wt = () => {
  Array.from(document.getElementsByName(I.procaptchaResponse)).map((t) => t.remove());
}, Sw = (e) => ({
  onHuman: (t) => Su(e, t),
  onChallengeExpired: () => {
    Wt();
  },
  onExpired: () => {
    Wt(), alert("Completed challenge has expired, please try again");
  },
  onError: (t) => {
    Wt(), console.error(t);
  },
  onClose: () => {
  },
  onOpen: () => {
  }
}), Cw = (e, t, n) => {
  const r = (e == null ? void 0 : e.theme) || t.getAttribute("data-theme") || "light";
  n.theme = _w(r);
};
function bw(e, t, n) {
  if (typeof (e == null ? void 0 : e.callback) == "function") {
    const r = e.callback;
    t.onHuman = (i) => {
      Su(n, i), r(i);
    };
  } else {
    const r = typeof (e == null ? void 0 : e.callback) == "string" ? e == null ? void 0 : e.callback : n.getAttribute("data-callback");
    r && (t.onHuman = (i) => {
      Su(n, i), Un(r)(i);
    });
  }
  if (e && e["chalexpired-callback"] && typeof e["chalexpired-callback"] == "function") {
    const r = e["chalexpired-callback"];
    t.onChallengeExpired = () => {
      Wt(), r();
    };
  } else {
    const r = typeof (e == null ? void 0 : e["chalexpired-callback"]) == "string" ? e == null ? void 0 : e["chalexpired-callback"] : n.getAttribute("data-chalexpired-callback");
    r && (t.onChallengeExpired = () => {
      const i = Un(r);
      Wt(), i();
    });
  }
  if (e && e["expired-callback"] && typeof e["expired-callback"] == "function") {
    const r = e["expired-callback"];
    t.onExpired = () => {
      Wt(), r();
    };
  } else {
    const r = typeof (e == null ? void 0 : e["expired-callback"]) == "string" ? e == null ? void 0 : e["expired-callback"] : n.getAttribute("data-expired-callback");
    r && (t.onExpired = () => {
      const i = Un(r);
      Wt(), i();
    });
  }
  if (e && (e != null && e["error-callback"]) && typeof e["error-callback"] == "function") {
    const r = e["error-callback"];
    t.onError = () => {
      Wt(), r();
    };
  } else {
    const r = typeof (e == null ? void 0 : e["error-callback"]) == "string" ? e == null ? void 0 : e["error-callback"] : n.getAttribute("data-error-callback");
    r && (t.onError = () => {
      const i = Un(r);
      Wt(), i();
    });
  }
  if (typeof (e == null ? void 0 : e["close-callback"]) == "function")
    t.onClose = e["close-callback"];
  else {
    const r = typeof (e == null ? void 0 : e["close-callback"]) == "string" ? e == null ? void 0 : e["close-callback"] : n.getAttribute("data-close-callback");
    r && (t.onClose = Un(r));
  }
  if (e != null && e["open-callback"])
    if (typeof e["open-callback"] == "function")
      t.onOpen = e["open-callback"];
    else {
      const r = typeof (e == null ? void 0 : e["open-callback"]) == "string" ? e == null ? void 0 : e["open-callback"] : n.getAttribute("data-open-callback");
      r && (t.onOpen = Un(r));
    }
}
const _h = (e, t, n) => {
  for (const r of e) {
    const i = Sw(r);
    switch (bw(n, i, r), Cw(n, r, t), kw(n, r, t), n == null ? void 0 : n.captchaType) {
      case "pow":
        io(r).render(Bt.jsx(hx, { config: t, callbacks: i }));
        break;
      case "frictionless":
        io(r).render(Bt.jsx(d4, { config: t, callbacks: i }));
        break;
      default:
        io(r).render(Bt.jsx(mx, { config: t, callbacks: i }));
        break;
    }
  }
}, Ew = () => {
  const e = Array.from(document.getElementsByClassName("procaptcha"));
  if (e.length) {
    const t = m0(e, 0).getAttribute("data-sitekey");
    if (!t) {
      console.error("No siteKey found");
      return;
    }
    const r = Object.values(Ll).find((i) => i === m0(e, 0).getAttribute("data-captcha-type")) || "frictionless";
    _h(e, wh(t), { captchaType: r, siteKey: t });
  }
}, Tw = (e, t) => {
  const n = t.siteKey;
  _h([e], wh(n), t);
};
function jc(e) {
  document && document.readyState !== "loading" ? e() : document.addEventListener("DOMContentLoaded", e);
}
window.procaptcha = { ready: jc, render: Tw };
const { onloadUrlCallback: Dd, renderExplicit: Pw } = gw(gh);
Pw !== "explicit" && jc(Ew);
if (Dd) {
  const e = Un(Dd);
  (Rd = yh()) == null || Rd.addEventListener("load", () => {
    jc(e);
  });
}
export {
  I as A,
  Sh as B,
  v2 as C,
  Nw as D,
  cs as E,
  Lw as F,
  ht as G,
  Tw as H,
  jc as I,
  y2 as L,
  s4 as P,
  Fh as R,
  Mw as S,
  kf as T,
  Ef as W,
  m0 as a,
  yn as b,
  g2 as c,
  Nf as d,
  Dw as e,
  x2 as f,
  h2 as g,
  m2 as h,
  p2 as i,
  $ as j,
  f2 as k,
  Pf as l,
  c2 as m,
  d2 as n,
  C2 as o,
  mf as p,
  wf as q,
  ae as r,
  gf as s,
  Kg as t,
  Rw as u,
  zu as v,
  _f as w,
  hf as x,
  b2 as y,
  rt as z
};
