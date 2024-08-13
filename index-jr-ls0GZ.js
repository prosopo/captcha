function Sh(e, t) {
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
var M3 = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {};
function Ch(e) {
  return e && e.__esModule && Object.prototype.hasOwnProperty.call(e, "default") ? e.default : e;
}
var Hd = { exports: {} }, Ko = {}, Ad = { exports: {} }, Y = {};
var ha = Symbol.for("react.element"), bh = Symbol.for("react.portal"), Eh = Symbol.for("react.fragment"), Th = Symbol.for("react.strict_mode"), Ph = Symbol.for("react.profiler"), Nh = Symbol.for("react.provider"), Lh = Symbol.for("react.context"), Ih = Symbol.for("react.forward_ref"), Rh = Symbol.for("react.suspense"), Dh = Symbol.for("react.memo"), Mh = Symbol.for("react.lazy"), Bc = Symbol.iterator;
function Oh(e) {
  return e === null || typeof e != "object" ? null : (e = Bc && e[Bc] || e["@@iterator"], typeof e == "function" ? e : null);
}
var jd = { isMounted: function() {
  return !1;
}, enqueueForceUpdate: function() {
}, enqueueReplaceState: function() {
}, enqueueSetState: function() {
} }, Fd = Object.assign, zd = {};
function Jr(e, t, n) {
  this.props = e, this.context = t, this.refs = zd, this.updater = n || jd;
}
Jr.prototype.isReactComponent = {};
Jr.prototype.setState = function(e, t) {
  if (typeof e != "object" && typeof e != "function" && e != null) throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");
  this.updater.enqueueSetState(this, e, t, "setState");
};
Jr.prototype.forceUpdate = function(e) {
  this.updater.enqueueForceUpdate(this, e, "forceUpdate");
};
function Vd() {
}
Vd.prototype = Jr.prototype;
function Tu(e, t, n) {
  this.props = e, this.context = t, this.refs = zd, this.updater = n || jd;
}
var Pu = Tu.prototype = new Vd();
Pu.constructor = Tu;
Fd(Pu, Jr.prototype);
Pu.isPureReactComponent = !0;
var Uc = Array.isArray, Wd = Object.prototype.hasOwnProperty, Nu = { current: null }, Bd = { key: !0, ref: !0, __self: !0, __source: !0 };
function Ud(e, t, n) {
  var r, i = {}, a = null, o = null;
  if (t != null) for (r in t.ref !== void 0 && (o = t.ref), t.key !== void 0 && (a = "" + t.key), t) Wd.call(t, r) && !Bd.hasOwnProperty(r) && (i[r] = t[r]);
  var s = arguments.length - 2;
  if (s === 1) i.children = n;
  else if (1 < s) {
    for (var l = Array(s), c = 0; c < s; c++) l[c] = arguments[c + 2];
    i.children = l;
  }
  if (e && e.defaultProps) for (r in s = e.defaultProps, s) i[r] === void 0 && (i[r] = s[r]);
  return { $$typeof: ha, type: e, key: a, ref: o, props: i, _owner: Nu.current };
}
function Hh(e, t) {
  return { $$typeof: ha, type: e.type, key: t, ref: e.ref, props: e.props, _owner: e._owner };
}
function Lu(e) {
  return typeof e == "object" && e !== null && e.$$typeof === ha;
}
function Ah(e) {
  var t = { "=": "=0", ":": "=2" };
  return "$" + e.replace(/[=:]/g, function(n) {
    return t[n];
  });
}
var Zc = /\/+/g;
function Os(e, t) {
  return typeof e == "object" && e !== null && e.key != null ? Ah("" + e.key) : t.toString(36);
}
function Ga(e, t, n, r, i) {
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
        case ha:
        case bh:
          o = !0;
      }
  }
  if (o) return o = e, i = i(o), e = r === "" ? "." + Os(o, 0) : r, Uc(i) ? (n = "", e != null && (n = e.replace(Zc, "$&/") + "/"), Ga(i, t, n, "", function(c) {
    return c;
  })) : i != null && (Lu(i) && (i = Hh(i, n + (!i.key || o && o.key === i.key ? "" : ("" + i.key).replace(Zc, "$&/") + "/") + e)), t.push(i)), 1;
  if (o = 0, r = r === "" ? "." : r + ":", Uc(e)) for (var s = 0; s < e.length; s++) {
    a = e[s];
    var l = r + Os(a, s);
    o += Ga(a, t, n, l, i);
  }
  else if (l = Oh(e), typeof l == "function") for (e = l.call(e), s = 0; !(a = e.next()).done; ) a = a.value, l = r + Os(a, s++), o += Ga(a, t, n, l, i);
  else if (a === "object") throw t = String(e), Error("Objects are not valid as a React child (found: " + (t === "[object Object]" ? "object with keys {" + Object.keys(e).join(", ") + "}" : t) + "). If you meant to render a collection of children, use an array instead.");
  return o;
}
function Ea(e, t, n) {
  if (e == null) return e;
  var r = [], i = 0;
  return Ga(e, r, "", "", function(a) {
    return t.call(n, a, i++);
  }), r;
}
function jh(e) {
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
var Ze = { current: null }, Ya = { transition: null }, Fh = { ReactCurrentDispatcher: Ze, ReactCurrentBatchConfig: Ya, ReactCurrentOwner: Nu };
function Zd() {
  throw Error("act(...) is not supported in production builds of React.");
}
Y.Children = { map: Ea, forEach: function(e, t, n) {
  Ea(e, function() {
    t.apply(this, arguments);
  }, n);
}, count: function(e) {
  var t = 0;
  return Ea(e, function() {
    t++;
  }), t;
}, toArray: function(e) {
  return Ea(e, function(t) {
    return t;
  }) || [];
}, only: function(e) {
  if (!Lu(e)) throw Error("React.Children.only expected to receive a single React element child.");
  return e;
} };
Y.Component = Jr;
Y.Fragment = Eh;
Y.Profiler = Ph;
Y.PureComponent = Tu;
Y.StrictMode = Th;
Y.Suspense = Rh;
Y.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = Fh;
Y.act = Zd;
Y.cloneElement = function(e, t, n) {
  if (e == null) throw Error("React.cloneElement(...): The argument must be a React element, but you passed " + e + ".");
  var r = Fd({}, e.props), i = e.key, a = e.ref, o = e._owner;
  if (t != null) {
    if (t.ref !== void 0 && (a = t.ref, o = Nu.current), t.key !== void 0 && (i = "" + t.key), e.type && e.type.defaultProps) var s = e.type.defaultProps;
    for (l in t) Wd.call(t, l) && !Bd.hasOwnProperty(l) && (r[l] = t[l] === void 0 && s !== void 0 ? s[l] : t[l]);
  }
  var l = arguments.length - 2;
  if (l === 1) r.children = n;
  else if (1 < l) {
    s = Array(l);
    for (var c = 0; c < l; c++) s[c] = arguments[c + 2];
    r.children = s;
  }
  return { $$typeof: ha, type: e.type, key: i, ref: a, props: r, _owner: o };
};
Y.createContext = function(e) {
  return e = { $$typeof: Lh, _currentValue: e, _currentValue2: e, _threadCount: 0, Provider: null, Consumer: null, _defaultValue: null, _globalName: null }, e.Provider = { $$typeof: Nh, _context: e }, e.Consumer = e;
};
Y.createElement = Ud;
Y.createFactory = function(e) {
  var t = Ud.bind(null, e);
  return t.type = e, t;
};
Y.createRef = function() {
  return { current: null };
};
Y.forwardRef = function(e) {
  return { $$typeof: Ih, render: e };
};
Y.isValidElement = Lu;
Y.lazy = function(e) {
  return { $$typeof: Mh, _payload: { _status: -1, _result: e }, _init: jh };
};
Y.memo = function(e, t) {
  return { $$typeof: Dh, type: e, compare: t === void 0 ? null : t };
};
Y.startTransition = function(e) {
  var t = Ya.transition;
  Ya.transition = {};
  try {
    e();
  } finally {
    Ya.transition = t;
  }
};
Y.unstable_act = Zd;
Y.useCallback = function(e, t) {
  return Ze.current.useCallback(e, t);
};
Y.useContext = function(e) {
  return Ze.current.useContext(e);
};
Y.useDebugValue = function() {
};
Y.useDeferredValue = function(e) {
  return Ze.current.useDeferredValue(e);
};
Y.useEffect = function(e, t) {
  return Ze.current.useEffect(e, t);
};
Y.useId = function() {
  return Ze.current.useId();
};
Y.useImperativeHandle = function(e, t, n) {
  return Ze.current.useImperativeHandle(e, t, n);
};
Y.useInsertionEffect = function(e, t) {
  return Ze.current.useInsertionEffect(e, t);
};
Y.useLayoutEffect = function(e, t) {
  return Ze.current.useLayoutEffect(e, t);
};
Y.useMemo = function(e, t) {
  return Ze.current.useMemo(e, t);
};
Y.useReducer = function(e, t, n) {
  return Ze.current.useReducer(e, t, n);
};
Y.useRef = function(e) {
  return Ze.current.useRef(e);
};
Y.useState = function(e) {
  return Ze.current.useState(e);
};
Y.useSyncExternalStore = function(e, t, n) {
  return Ze.current.useSyncExternalStore(e, t, n);
};
Y.useTransition = function() {
  return Ze.current.useTransition();
};
Y.version = "18.3.1";
Ad.exports = Y;
var ae = Ad.exports;
const zh = /* @__PURE__ */ Ch(ae), $c = /* @__PURE__ */ Sh({
  __proto__: null,
  default: zh
}, [ae]);
var Vh = ae, Wh = Symbol.for("react.element"), Bh = Symbol.for("react.fragment"), Uh = Object.prototype.hasOwnProperty, Zh = Vh.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner, $h = { key: !0, ref: !0, __self: !0, __source: !0 };
function $d(e, t, n) {
  var r, i = {}, a = null, o = null;
  n !== void 0 && (a = "" + n), t.key !== void 0 && (a = "" + t.key), t.ref !== void 0 && (o = t.ref);
  for (r in t) Uh.call(t, r) && !$h.hasOwnProperty(r) && (i[r] = t[r]);
  if (e && e.defaultProps) for (r in t = e.defaultProps, t) i[r] === void 0 && (i[r] = t[r]);
  return { $$typeof: Wh, type: e, key: a, ref: o, props: i, _owner: Zh.current };
}
Ko.Fragment = Bh;
Ko.jsx = $d;
Ko.jsxs = $d;
Hd.exports = Ko;
var Vt = Hd.exports, v = U;
(function(e, t) {
  for (var n = U, r = e(); ; )
    try {
      var i = -parseInt(n(1152)) / 1 * (-parseInt(n(1189)) / 2) + -parseInt(n(857)) / 3 * (parseInt(n(1254)) / 4) + -parseInt(n(848)) / 5 + parseInt(n(553)) / 6 + parseInt(n(707)) / 7 * (-parseInt(n(327)) / 8) + parseInt(n(1099)) / 9 + -parseInt(n(1112)) / 10 * (-parseInt(n(316)) / 11);
      if (i === t) break;
      r.push(r.shift());
    } catch {
      r.push(r.shift());
    }
})(xo, 900342);
var hl = function(e, t) {
  return hl = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(n, r) {
    var i = U;
    n[i(784)] = r;
  } || function(n, r) {
    var i = U;
    for (var a in r)
      Object.prototype.hasOwnProperty[i(583)](r, a) && (n[a] = r[a]);
  }, hl(e, t);
};
function Gh(e, t) {
  var n = U;
  if (typeof t !== n(425) && t !== null)
    throw new TypeError(n(1048) + String(t) + n(511));
  hl(e, t);
  function r() {
    this.constructor = e;
  }
  e[n(886)] = t === null ? Object[n(851)](t) : (r[n(886)] = t[n(886)], new r());
}
var ml = function() {
  var e = U;
  return ml = Object[e(819)] || function(n) {
    for (var r = e, i, a = 1, o = arguments.length; a < o; a++) {
      i = arguments[a];
      for (var s in i)
        Object[r(886)][r(509)][r(583)](i, s) && (n[s] = i[s]);
    }
    return n;
  }, ml[e(1241)](this, arguments);
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
function fo(e, t, n) {
  var r = U;
  if (n || arguments[r(343)] === 2)
    for (var i = 0, a = t.length, o; i < a; i++)
      (o || !(i in t)) && (o || (o = Array[r(886)][r(1269)][r(583)](t, 0, i)), o[i] = t[i]);
  return e.concat(o || Array[r(886)][r(1269)][r(583)](t));
}
var Gd = v(808);
function Ii(e, t) {
  return new Promise(function(n) {
    return setTimeout(n, e, t);
  });
}
function Yh(e, t) {
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
  }) : Ii(Math.min(e, t));
}
function Yd(e) {
  var t = v;
  return !!e && typeof e[t(475)] === t(425);
}
function Gc(e, t) {
  try {
    var n = e();
    Yd(n) ? n.then(
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
function Yc(e, t, n) {
  return n === void 0 && (n = 16), Ke(this, void 0, void 0, function() {
    var r, i, a, o;
    return qe(this, function(s) {
      var l = U;
      switch (s[l(979)]) {
        case 0:
          r = Array(e[l(343)]), i = Date[l(738)](), a = 0, s.label = 1;
        case 1:
          return a < e[l(343)] ? (r[a] = t(e[a], a), o = Date[l(738)](), o >= i + n ? (i = o, [4, Ii(0)]) : [3, 3]) : [3, 4];
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
function Ri(e) {
  var t = v;
  e[t(475)](void 0, function() {
  });
}
function cn(e, t) {
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
function Xc(e) {
  return e = fe(e, [0, e[0] >>> 1]), e = pt(e, [4283543511, 3981806797]), e = fe(e, [0, e[0] >>> 1]), e = pt(e, [3301882366, 444984403]), e = fe(e, [0, e[0] >>> 1]), e;
}
function Xh(e, t) {
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
    ], s = pt(s, c), s = ur(s, 31), s = pt(s, d), a = fe(a, s), a = ur(a, 27), a = cn(a, o), a = cn(pt(a, [0, 5]), [0, 1390208809]), l = pt(l, d), l = ur(l, 33), l = pt(l, c), o = fe(o, l), o = ur(o, 31), o = cn(o, a), o = cn(pt(o, [0, 5]), [0, 944331445]);
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
  return a = fe(a, [0, e[n(343)]]), o = fe(o, [0, e[n(343)]]), a = cn(a, o), o = cn(o, a), a = Xc(a), o = Xc(o), a = cn(a, o), o = cn(o, a), (n(697) + (a[0] >>> 0)[n(961)](16))[n(1269)](-8) + (n(697) + (a[1] >>> 0)[n(961)](16))[n(1269)](-8) + (n(697) + (o[0] >>> 0)[n(961)](16))[n(1269)](-8) + (n(697) + (o[1] >>> 0)[n(961)](16)).slice(-8);
}
function Qh(e) {
  var t = v, n;
  return ml(
    {
      name: e[t(516)],
      message: e[t(555)],
      stack: (n = e[t(742)]) === null || n === void 0 ? void 0 : n[t(447)](`
`)
    },
    e
  );
}
function Jh(e, t) {
  for (var n = v, r = 0, i = e[n(343)]; r < i; ++r)
    if (e[r] === t) return !0;
  return !1;
}
function Kh(e, t) {
  return !Jh(e, t);
}
function Iu(e) {
  return parseInt(e);
}
function Ct(e) {
  return parseFloat(e);
}
function Kt(e, t) {
  var n = v;
  return typeof e === n(477) && isNaN(e) ? t : e;
}
function Mt(e) {
  return e.reduce(function(t, n) {
    return t + (n ? 1 : 0);
  }, 0);
}
function Xd(e, t) {
  var n = v;
  if (t === void 0 && (t = 1), Math.abs(t) >= 1) return Math.round(e / t) * t;
  var r = 1 / t;
  return Math[n(1012)](e * r) / r;
}
function qh(e) {
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
function Qc(e) {
  var t = v;
  return e && typeof e === t(668) && t(555) in e ? e : { message: e };
}
function em(e) {
  var t = v;
  return typeof e !== t(425);
}
function tm(e, t) {
  var n = new Promise(function(r) {
    var i = U, a = Date[i(738)]();
    Gc(e[i(512)](null, t), function() {
      for (var o = i, s = [], l = 0; l < arguments[o(343)]; l++)
        s[l] = arguments[l];
      var c = Date[o(738)]() - a;
      if (!s[0])
        return r(function() {
          return { error: Qc(s[1]), duration: c };
        });
      var d = s[1];
      if (em(d))
        return r(function() {
          return { value: d, duration: c };
        });
      r(function() {
        return new Promise(function(f) {
          var m = U, w = Date[m(738)]();
          Gc(d, function() {
            for (var y = m, x = [], _ = 0; _ < arguments[y(343)]; _++)
              x[_] = arguments[_];
            var u = c + Date[y(738)]() - w;
            if (!x[0])
              return f({ error: Qc(x[1]), duration: u });
            f({ value: x[1], duration: u });
          });
        });
      });
    });
  });
  return Ri(n), function() {
    return n.then(function(i) {
      return i();
    });
  };
}
function nm(e, t, n) {
  var r = v, i = Object[r(331)](e)[r(788)](function(o) {
    return Kh(n, o);
  }), a = Yc(i, function(o) {
    return tm(e[o], t);
  });
  return Ri(a), function() {
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
              Yc(s, function(y) {
                var x = y();
                return Ri(x), x;
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
function Qd() {
  var e = v, t = window, n = navigator;
  return Mt([
    e(628) in t,
    e(341) in t,
    "msIndexedDB" in t,
    e(523) in n,
    e(730) in n
  ]) >= 4;
}
function rm() {
  var e = v, t = window, n = navigator;
  return Mt([
    e(701) in t,
    e(661) in t,
    e(905) in n,
    e(752) in n
  ]) >= 3 && !Qd();
}
function Ru() {
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
function ma() {
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
function xo() {
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
  return xo = function() {
    return e;
  }, xo();
}
function Du() {
  var e = v, t = window;
  return Mt([
    "safari" in t,
    !("DeviceMotionEvent" in t),
    !(e(569) in t),
    !(e(1220) in navigator)
  ]) >= 3;
}
function im() {
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
function am() {
  var e = v, t = window;
  return Mt([
    !(e(919) in t),
    e(325) in t,
    "" + t[e(1191)] === e(1088),
    "" + t.Reflect == "[object Reflect]"
  ]) >= 3;
}
function om() {
  var e = v, t = window;
  return Mt([
    e(1151) in t,
    e(769) in t,
    e(980) in t,
    e(656) in t
  ]) >= 3;
}
function sm() {
  var e = v;
  if (navigator[e(841)] === "iPad") return !0;
  var t = screen, n = t[e(347)] / t[e(515)];
  return Mt([
    e(604) in window,
    !!Element[e(886)][e(713)],
    n > 0.65 && n < 1.53
  ]) >= 2;
}
function lm() {
  var e = v, t = document;
  return t.fullscreenElement || t[e(792)] || t.mozFullScreenElement || t[e(639)] || null;
}
function um() {
  var e = v, t = document;
  return (t[e(1140)] || t.msExitFullscreen || t[e(700)] || t[e(1094)])[e(583)](t);
}
function Jd() {
  var e = v, t = Ru(), n = im();
  if (!t && !n) return !1;
  var r = window;
  return Mt([
    e(1160) in r,
    e(818) in r,
    t && !("SharedWorker" in r),
    n && /android/i[e(913)](navigator[e(1036)])
  ]) >= 2;
}
function cm() {
  var e = v, t = window, n = t[e(1027)] || t.webkitOfflineAudioContext;
  if (!n) return -2;
  if (dm()) return -1;
  var r = 4500, i = 5e3, a = new n(1, i, 44100), o = a.createOscillator();
  o.type = e(508), o[e(494)].value = 1e4;
  var s = a.createDynamicsCompressor();
  s[e(758)][e(1223)] = -50, s.knee.value = 40, s[e(1125)][e(1223)] = 12, s[e(461)][e(1223)] = 0, s.release.value = 0.25, o[e(844)](s), s.connect(a[e(326)]), o[e(1170)](0);
  var l = fm(a), c = l[0], d = l[1], f = c[e(475)](
    function(m) {
      var w = e;
      return xm(m.getChannelData(0)[w(1055)](r));
    },
    function(m) {
      var w = e;
      if (m[w(516)] === w(1199) || m[w(516)] === "suspended")
        return -3;
      throw m;
    }
  );
  return Ri(f), function() {
    return d(), f;
  };
}
function dm() {
  return ma() && !Du() && !om();
}
function fm(e) {
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
          return l(Jc(_(1199)));
        },
        Math[x(1120)](r, m + i - Date[x(738)]())
      );
    }, y = function() {
      var x = c;
      try {
        var _ = e[x(420)]();
        switch (Yd(_) && Ri(_), e[x(1054)]) {
          case x(615):
            m = Date[x(738)](), d && w();
            break;
          case x(1165):
            !document.hidden && f++, d && f >= t ? l(Jc(x(1165))) : setTimeout(y, n);
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
function xm(e) {
  for (var t = v, n = 0, r = 0; r < e[t(343)]; ++r)
    n += Math[t(1014)](e[r]);
  return n;
}
function Jc(e) {
  var t = new Error(e);
  return t.name = e, t;
}
function Kd(e, t, n) {
  var r, i, a;
  return n === void 0 && (n = 50), Ke(this, void 0, void 0, function() {
    var o, s;
    return qe(this, function(l) {
      var c = U;
      switch (l[c(979)]) {
        case 0:
          o = document, l[c(979)] = 1;
        case 1:
          return o.body ? [3, 3] : [4, Ii(n)];
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
          return !((i = (r = s[c(383)]) === null || r === void 0 ? void 0 : r[c(601)]) === null || i === void 0) && i[c(768)] ? [3, 8] : [4, Ii(n)];
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
function pm(e) {
  for (var t = v, n = qh(e), r = n[0], i = n[1], a = document[t(631)](
    r ?? t(669)
  ), o = 0, s = Object.keys(i); o < s[t(343)]; o++) {
    var l = s[o], c = i[l].join(" ");
    l === t(1252) ? hm(a[t(1252)], c) : a[t(962)](l, c);
  }
  return a;
}
function hm(e, t) {
  for (var n = v, r = 0, i = t[n(447)](";"); r < i[n(343)]; r++) {
    var a = i[r], o = /^\s*([\w-]+)\s*:\s*(.+?)(\s*!([\w-]+))?\s*$/.exec(a);
    if (o) {
      var s = o[1], l = o[2], c = o[4];
      e[n(482)](s, l, c || "");
    }
  }
}
var mm = v(1173), vm = v(924), cr = ["monospace", v(800), v(782)], Kc = [
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
function gm() {
  return Kd(function(e, t) {
    var n = U, r = t[n(601)], i = r[n(768)];
    i[n(1252)].fontSize = vm;
    var a = r[n(631)](n(669)), o = {}, s = {}, l = function(_) {
      var u = n, p = r[u(631)]("span"), h = p[u(1252)];
      return h[u(1081)] = u(833), h.top = "0", h[u(637)] = "0", h.fontFamily = _, p[u(395)] = mm, a[u(866)](p), p;
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
      }, h = 0, g = Kc; h < g[_(343)]; h++) {
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
    return Kc.filter(function(_) {
      return m(y[_]);
    });
  });
}
function ym() {
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
function wm() {
  var e = !1, t, n, r = _m(), i = r[0], a = r[1];
  if (!km(i, a)) t = n = "";
  else {
    e = Sm(a), Cm(i, a);
    var o = Hs(i), s = Hs(i);
    o !== s ? t = n = "unstable" : (n = o, bm(i, a), t = Hs(i));
  }
  return { winding: e, geometry: t, text: n };
}
function _m() {
  var e = v, t = document[e(631)]("canvas");
  return t.width = 1, t[e(515)] = 1, [t, t.getContext("2d")];
}
function km(e, t) {
  return !!(t && e.toDataURL);
}
function Sm(e) {
  var t = v;
  return e[t(562)](0, 0, 10, 10), e[t(562)](2, 2, 6, 6), !e[t(1097)](5, 5, t(545));
}
function Cm(e, t) {
  var n = v;
  e[n(347)] = 240, e[n(515)] = 60, t[n(339)] = n(724), t[n(890)] = n(1067), t.fillRect(100, 1, 62, 20), t[n(890)] = "#069", t[n(423)] = '11pt "Times New Roman"';
  var r = n(1153)[n(1130)](String[n(1187)](55357, 56835));
  t[n(429)](r, 2, 15), t[n(890)] = n(1075), t[n(423)] = "18pt Arial", t[n(429)](r, 4, 45);
}
function bm(e, t) {
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
function Hs(e) {
  var t = v;
  return e[t(917)]();
}
function Em() {
  var e = v, t = navigator, n = 0, r;
  t[e(1103)] !== void 0 ? n = Iu(t.maxTouchPoints) : t[e(523)] !== void 0 && (n = t[e(523)]);
  try {
    document[e(1234)]("TouchEvent"), r = !0;
  } catch {
    r = !1;
  }
  var i = e(1182) in window;
  return { maxTouchPoints: n, touchEvent: r, touchStart: i };
}
function Tm() {
  return navigator.oscpu;
}
function Pm() {
  var e = v, t = navigator, n = [], r = t[e(996)] || t[e(696)] || t.browserLanguage || t.systemLanguage;
  if (r !== void 0 && n[e(638)]([r]), Array[e(590)](t[e(1078)]))
    !(Ru() && am()) && n[e(638)](t[e(1078)]);
  else if (typeof t.languages === e(391)) {
    var i = t[e(1078)];
    i && n[e(638)](i[e(447)](","));
  }
  return n;
}
function Nm() {
  return window.screen.colorDepth;
}
function Lm() {
  return Kt(Ct(navigator.deviceMemory), void 0);
}
function Im() {
  var e = v, t = screen, n = function(i) {
    return Kt(Iu(i), null);
  }, r = [n(t.width), n(t[e(515)])];
  return r.sort().reverse(), r;
}
var Rm = 2500, Dm = 10, Xa, As;
function Mm() {
  if (As === void 0) {
    var e = function() {
      var t = vl();
      gl(t) ? As = setTimeout(e, Rm) : (Xa = t, As = void 0);
    };
    e();
  }
}
function Om() {
  var e = this;
  return Mm(), function() {
    return Ke(e, void 0, void 0, function() {
      var t;
      return qe(this, function(n) {
        var r = U;
        switch (n.label) {
          case 0:
            return t = vl(), gl(t) ? Xa ? [2, fo([], Xa, !0)] : lm() ? [4, um()] : [3, 2] : [3, 2];
          case 1:
            n[r(607)](), t = vl(), n[r(979)] = 2;
          case 2:
            return !gl(t) && (Xa = t), [2, t];
        }
      });
    });
  };
}
function Hm() {
  var e = this, t = Om();
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
              return o === null ? null : Xd(o, Dm);
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
function vl() {
  var e = v, t = screen;
  return [
    Kt(Ct(t[e(831)]), null),
    Kt(
      Ct(t.width) - Ct(t[e(1105)]) - Kt(Ct(t[e(401)]), 0),
      null
    ),
    Kt(
      Ct(t[e(515)]) - Ct(t[e(349)]) - Kt(Ct(t[e(831)]), 0),
      null
    ),
    Kt(Ct(t[e(401)]), null)
  ];
}
function gl(e) {
  for (var t = 0; t < 4; ++t)
    if (e[t]) return !1;
  return !0;
}
function Am() {
  var e = v;
  return Kt(Iu(navigator[e(935)]), void 0);
}
function jm() {
  var e = v, t, n = (t = window[e(1191)]) === null || t === void 0 ? void 0 : t.DateTimeFormat;
  if (n) {
    var r = new n()[e(586)]().timeZone;
    if (r) return r;
  }
  var i = -Fm();
  return e(699)[e(1130)](i >= 0 ? "+" : "").concat(Math[e(1014)](i));
}
function Fm() {
  var e = v, t = (/* @__PURE__ */ new Date())[e(725)]();
  return Math[e(826)](
    Ct(new Date(t, 0, 1).getTimezoneOffset()),
    Ct(new Date(t, 6, 1)[e(408)]())
  );
}
function zm() {
  var e = v;
  try {
    return !!window[e(1137)];
  } catch {
    return !0;
  }
}
function Vm() {
  var e = v;
  try {
    return !!window[e(414)];
  } catch {
    return !0;
  }
}
function Wm() {
  var e = v;
  if (!(Qd() || rm()))
    try {
      return !!window[e(1218)];
    } catch {
      return !0;
    }
}
function Bm() {
  var e = v;
  return !!window[e(1255)];
}
function Um() {
  var e = v;
  return navigator[e(620)];
}
function Zm() {
  var e = v, t = navigator[e(841)];
  return t === "MacIntel" && ma() && !Du() ? sm() ? "iPad" : "iPhone" : t;
}
function $m() {
  var e = v;
  return navigator[e(1033)] || "";
}
function Gm() {
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
function Ym() {
  var e = v, t = document;
  try {
    t[e(686)] = e(708);
    var n = t[e(686)][e(1242)]("cookietest=") !== -1;
    return t[e(686)] = "cookietest=1; SameSite=Strict; expires=Thu, 01-Jan-1970 00:00:01 GMT", n;
  } catch {
    return !1;
  }
}
function Xm() {
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
function Qm(e) {
  var t = v, n = e === void 0 ? {} : e, r = n[t(406)];
  return Ke(this, void 0, void 0, function() {
    var i, a, o, s, l, c;
    return qe(this, function(d) {
      var f = U;
      switch (d[f(979)]) {
        case 0:
          return Jm() ? (i = Xm(), a = Object[f(331)](i), o = (c = [])[f(1130)][f(1241)](
            c,
            a.map(function(m) {
              return i[m];
            })
          ), [4, Km(o)]) : [2, void 0];
        case 1:
          return s = d[f(607)](), r && qm(i, s), l = a[f(788)](function(m) {
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
function Jm() {
  return ma() || Jd();
}
function Km(e) {
  var t;
  return Ke(this, void 0, void 0, function() {
    var n, r, i, a, l, o, s, l;
    return qe(this, function(c) {
      var d = U;
      switch (c.label) {
        case 0:
          for (n = document, r = n[d(631)](d(669)), i = new Array(e[d(343)]), a = {}, qc(r), l = 0; l < e.length; ++l)
            o = pm(e[l]), o[d(1249)] === "DIALOG" && o[d(872)](), s = n[d(631)](d(669)), qc(s), s[d(866)](o), r[d(866)](s), i[l] = o;
          c[d(979)] = 1;
        case 1:
          return n[d(768)] ? [3, 3] : [4, Ii(50)];
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
function qc(e) {
  var t = v;
  e[t(1252)].setProperty(t(895), "block", t(994));
}
function U(e, t) {
  var n = xo();
  return U = function(r, i) {
    r = r - 314;
    var a = n[r];
    return a;
  }, U(e, t);
}
function qm(e, t) {
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
function e1() {
  for (var e = v, t = 0, n = ["rec2020", "p3", "srgb"]; t < n[e(343)]; t++) {
    var r = n[t];
    if (matchMedia("(color-gamut: "[e(1130)](r, ")")).matches) return r;
  }
}
function t1() {
  var e = v;
  if (e0(e(542))) return !0;
  if (e0(e(621))) return !1;
}
function e0(e) {
  var t = v;
  return matchMedia(t(1186).concat(e, ")"))[t(1259)];
}
function n1() {
  var e = v;
  if (t0(e(1007))) return !0;
  if (t0("none")) return !1;
}
function t0(e) {
  var t = v;
  return matchMedia(t(547)[t(1130)](e, ")"))[t(1259)];
}
var r1 = 100;
function i1() {
  var e = v;
  if (matchMedia(e(596))[e(1259)]) {
    for (var t = 0; t <= r1; ++t)
      if (matchMedia("(max-monochrome: "[e(1130)](t, ")"))[e(1259)]) return t;
    throw new Error("Too high value");
  }
}
function a1() {
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
function o1() {
  var e = v;
  if (n0(e(541))) return !0;
  if (n0(e(922))) return !1;
}
function n0(e) {
  var t = v;
  return matchMedia(t(384)[t(1130)](e, ")"))[t(1259)];
}
function s1() {
  var e = v;
  if (r0(e(864))) return !0;
  if (r0("standard")) return !1;
}
function r0(e) {
  var t = v;
  return matchMedia(t(432)[t(1130)](e, ")"))[t(1259)];
}
var te = Math, Ve = function() {
  return 0;
};
function l1() {
  var e = v, t = te[e(898)] || Ve, n = te[e(772)] || Ve, r = te[e(1045)] || Ve, i = te[e(838)] || Ve, a = te[e(1227)] || Ve, o = te[e(584)] || Ve, s = te.sin || Ve, l = te.sinh || Ve, c = te.cos || Ve, d = te.cosh || Ve, f = te[e(786)] || Ve, m = te[e(904)] || Ve, w = te.exp || Ve, y = te.expm1 || Ve, x = te[e(629)] || Ve, _ = function(O) {
    var T = e;
    return te[T(399)](te.PI, O);
  }, u = function(O) {
    var T = e;
    return te.log(O + te[T(448)](O * O - 1));
  }, p = function(O) {
    var T = e;
    return te[T(1002)](O + te.sqrt(O * O + 1));
  }, h = function(O) {
    var T = e;
    return te[T(1002)]((1 + O) / (1 - O)) / 2;
  }, g = function(O) {
    var T = e;
    return te.exp(O) - 1 / te[T(998)](O) / 2;
  }, k = function(O) {
    var T = e;
    return (te[T(998)](O) + 1 / te[T(998)](O)) / 2;
  }, C = function(O) {
    var T = e;
    return te[T(998)](O) - 1;
  }, S = function(O) {
    var T = e;
    return (te.exp(2 * O) - 1) / (te[T(998)](2 * O) + 1);
  }, L = function(O) {
    var T = e;
    return te[T(1002)](1 + O);
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
var u1 = v(1108), js = {
  default: [],
  apple: [{ font: "-apple-system-body" }],
  serif: [{ fontFamily: v(782) }],
  sans: [{ fontFamily: "sans-serif" }],
  mono: [{ fontFamily: "monospace" }],
  min: [{ fontSize: v(1106) }],
  system: [{ fontFamily: "system-ui" }]
};
function c1() {
  return d1(function(e, t) {
    for (var n = U, r = {}, i = {}, a = 0, o = Object[n(331)](js); a < o.length; a++) {
      var s = o[a], l = js[s], c = l[0], d = c === void 0 ? {} : c, f = l[1], m = f === void 0 ? u1 : f, w = e[n(631)](n(860));
      w[n(395)] = m, w[n(1252)].whiteSpace = n(928);
      for (var y = 0, x = Object.keys(d); y < x.length; y++) {
        var _ = x[y], u = d[_];
        u !== void 0 && (w.style[_] = u);
      }
      r[s] = w, t.appendChild(e[n(631)]("br")), t.appendChild(w);
    }
    for (var p = 0, h = Object.keys(js); p < h[n(343)]; p++) {
      var s = h[p];
      i[s] = r[s][n(754)]().width;
    }
    return i;
  });
}
function d1(e, t) {
  var n = v;
  return t === void 0 && (t = 4e3), Kd(function(r, i) {
    var a = U, o = i[a(601)], s = o[a(768)], l = s[a(1252)];
    l[a(347)] = ""[a(1130)](t, "px"), l[a(688)] = l.textSizeAdjust = a(621), Ru() ? s.style[a(605)] = ""[a(1130)](1 / i[a(835)]) : ma() && (s[a(1252)][a(605)] = "reset");
    var c = o[a(631)](a(669));
    return c[a(395)] = fo([], Array(t / 20 << 0), !0)[a(335)](function() {
      return "word";
    })[a(536)](" "), s[a(866)](c), e(o, s);
  }, n(450));
}
function f1() {
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
function x1() {
  var e = v;
  return navigator[e(916)];
}
function p1() {
  var e = v, t = new Float32Array(1), n = new Uint8Array(t[e(572)]);
  return t[0] = 1 / 0, t[0] = t[0] - t[0], n[3];
}
var h1 = {
  fonts: gm,
  domBlockers: Qm,
  fontPreferences: c1,
  audio: cm,
  screenFrame: Hm,
  osCpu: Tm,
  languages: Pm,
  colorDepth: Nm,
  deviceMemory: Lm,
  screenResolution: Im,
  hardwareConcurrency: Am,
  timezone: jm,
  sessionStorage: zm,
  localStorage: Vm,
  indexedDB: Wm,
  openDatabase: Bm,
  cpuClass: Um,
  platform: Zm,
  plugins: ym,
  canvas: wm,
  touchSupport: Em,
  vendor: $m,
  vendorFlavors: Gm,
  cookiesEnabled: Ym,
  colorGamut: e1,
  invertedColors: t1,
  forcedColors: n1,
  monochrome: i1,
  contrast: a1,
  reducedMotion: o1,
  hdr: s1,
  math: l1,
  videoCard: f1,
  pdfViewerEnabled: x1,
  architecture: p1
};
function m1(e) {
  return nm(h1, e, []);
}
var v1 = v(807);
function g1(e) {
  var t = v, n = y1(e), r = w1(n);
  return { score: n, comment: v1[t(452)](/\$/g, "".concat(r)) };
}
function y1(e) {
  var t = v;
  if (Jd()) return 0.4;
  if (ma()) return Du() ? 0.5 : 0.3;
  var n = e[t(841)][t(1223)] || "";
  return /^Win/.test(n) ? 0.6 : /^Mac/[t(913)](n) ? 0.5 : 0.7;
}
function w1(e) {
  return Xd(0.99 + 0.01 * e, 1e-4);
}
function _1(e) {
  for (var t = v, n = "", r = 0, i = Object[t(331)](e).sort(); r < i[t(343)]; r++) {
    var a = i[r], o = e[a], s = o.error ? t(446) : JSON[t(641)](o[t(1223)]);
    n += ""[t(1130)](n ? "|" : "")[t(1130)](a[t(452)](/([:|\\])/g, t(842)), ":").concat(s);
  }
  return n;
}
function k1(e) {
  return JSON.stringify(
    e,
    function(t, n) {
      return n instanceof Error ? Qh(n) : n;
    },
    2
  );
}
function qd(e) {
  return Xh(_1(e));
}
function S1(e) {
  var t, n = g1(e);
  return {
    get visitorId() {
      return t === void 0 && (t = qd(this.components)), t;
    },
    set visitorId(r) {
      t = r;
    },
    confidence: n,
    components: e,
    version: Gd
  };
}
function C1(e) {
  return e === void 0 && (e = 50), Yh(e, e * 2);
}
function b1(e, t) {
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
              return o = l[c(607)](), s = S1(o), (t || i != null && i[c(406)]) && c(630)[c(1130)](s[c(799)], c(1253))[c(1130)](
                navigator[c(852)],
                `
timeBetweenLoadAndGet: `
              )[c(1130)](a - r, `
visitorId: `).concat(s[c(929)], `
components: `)[c(1130)](k1(o), c(619)), [2, s];
          }
        });
      });
    }
  };
}
function E1() {
  var e = v;
  if (!(window.__fpjs_d_m || Math[e(360)]() >= 1e-3))
    try {
      var t = new XMLHttpRequest();
      t[e(319)](
        e(873),
        "https://m1.openfpcdn.io/fingerprintjs/v"[e(1130)](Gd, e(435)),
        !0
      ), t[e(1183)]();
    } catch (n) {
      console[e(446)](n);
    }
}
function T1(e) {
  var t = v, n = {}, r = n[t(727)], i = n[t(406)], a = n[t(410)], o = a === void 0 ? !0 : a;
  return Ke(this, void 0, void 0, function() {
    var s;
    return qe(this, function(l) {
      var c = U;
      switch (l[c(979)]) {
        case 0:
          return o && E1(), [4, C1(r)];
        case 1:
          return l[c(607)](), s = m1({ debug: i }), [2, b1(s, i)];
      }
    });
  });
}
var P1 = v(855), X = {
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
  Gh(t, e);
  function t(n, r) {
    var i = U, a = e.call(this, r) || this;
    return a[i(1054)] = n, a.name = i(1083), Object[i(373)](a, t.prototype), a;
  }
  return t;
}(Error);
function N1(e, t) {
  var n = v, r = {}, i = { bot: !1 };
  for (var a in t) {
    var o = t[a], s = o(e), l = { bot: !1 };
    typeof s === n(391) ? l = { bot: !0, botKind: s } : s && (l = { bot: !0, botKind: X[n(474)] }), r[a] = l, l[n(715)] && (i = l);
  }
  return [r, i];
}
function L1(e) {
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
function I1(e) {
  var t = v, n = e[t(1036)];
  if (n[t(1054)] !== 0) return !1;
  if (/headless/i[t(913)](n.value)) return X.HeadlessChrome;
  if (/electron/i[t(913)](n.value)) return X[t(396)];
  if (/slimerjs/i[t(913)](n.value)) return X[t(537)];
}
function Qa(e, t) {
  var n = v;
  return e[n(1242)](t) !== -1;
}
function Xt(e, t) {
  return e.indexOf(t) !== -1;
}
function R1(e, t) {
  var n = v;
  if (n(674) in e) return e[n(674)](t);
  for (var r = 0; r < e[n(343)]; r++)
    if (t(e[r], r, e)) return e[r];
}
function i0(e) {
  var t = v;
  return Object[t(719)](e);
}
function yl(e) {
  for (var t = v, n = [], r = 1; r < arguments[t(343)]; r++)
    n[r - 1] = arguments[r];
  for (var i = function(c) {
    var d = t;
    if (typeof c === d(391)) {
      if (Qa(e, c)) return { value: !0 };
    } else {
      var f = R1(e, function(m) {
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
function wi(e) {
  var t = v;
  return e[t(541)](function(n, r) {
    return n + (r ? 1 : 0);
  }, 0);
}
function D1(e) {
  var t = v, n = e[t(939)];
  if (n[t(1054)] !== 0) return !1;
  if (yl(n[t(1223)], t(314), t(603), t(492)))
    return X[t(1202)];
}
function M1(e) {
  var t = v, n = e.errorTrace;
  if (n[t(1054)] !== 0) return !1;
  if (/PhantomJS/i[t(913)](n[t(1223)])) return X[t(1065)];
}
function O1(e) {
  var t = v, n = e[t(1076)], r = e.browserKind, i = e.browserEngineKind;
  if (!(n[t(1054)] !== 0 || r.state !== 0 || i[t(1054)] !== 0)) {
    var a = n[t(1223)];
    return i[t(1223)] === "unknown" ? !1 : a === 37 && !Qa([t(1230), "gecko"], i.value) || a === 39 && !Qa([t(1134)], r.value) || a === 33 && !Qa([t(449)], i[t(1223)]);
  }
}
function H1(e) {
  var t = v, n = e.functionBind;
  if (n[t(1054)] === -2) return X[t(1065)];
}
function A1(e) {
  var t = v, n = e[t(1078)];
  if (n.state === 0 && n[t(1223)][t(343)] === 0)
    return X[t(543)];
}
function j1(e) {
  var t = v, n = e[t(1128)];
  if (n[t(1054)] === 0 && !n[t(1223)]) return X[t(474)];
}
function F1(e) {
  var t = v, n = e.notificationPermissions, r = e.browserKind;
  if (r[t(1054)] !== 0 || r.value !== t(843)) return !1;
  if (n.state === 0 && n[t(1223)]) return X.HeadlessChrome;
}
function z1(e) {
  var t = v, n = e[t(1085)];
  if (n.state === 0 && !n[t(1223)]) return X[t(543)];
}
function V1(e) {
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
function B1(e) {
  var t = v, n = e.productSub, r = e[t(1104)];
  if (n[t(1054)] !== 0 || r.state !== 0) return !1;
  if ((r[t(1223)] === t(843) || r[t(1223)] === "safari" || r[t(1223)] === t(763) || r.value === "wechat") && n[t(1223)] !== "20030107")
    return X[t(474)];
}
function U1(e) {
  var t = v, n = e.userAgent;
  if (n[t(1054)] !== 0) return !1;
  if (/PhantomJS/i[t(913)](n[t(1223)])) return X[t(1065)];
  if (/Headless/i[t(913)](n[t(1223)])) return X[t(543)];
  if (/Electron/i[t(913)](n[t(1223)])) return X.Electron;
  if (/slimerjs/i[t(913)](n.value)) return X[t(537)];
}
function Z1(e) {
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
function G1(e) {
  var t = v, n = e.windowExternal;
  if (n[t(1054)] !== 0) return !1;
  if (/Sequentum/i[t(913)](n[t(1223)])) return X.Sequentum;
}
function Y1(e) {
  var t = v, n = e.windowSize, r = e.documentFocus;
  if (n[t(1054)] !== 0 || r[t(1054)] !== 0) return !1;
  var i = n[t(1223)], a = i.outerWidth, o = i[t(862)];
  if (r[t(1223)] && a === 0 && o === 0)
    return X.HeadlessChrome;
}
function X1(e) {
  var t = v, n = e.distinctiveProps;
  if (n.state !== 0) return !1;
  var r = n[t(1223)], i;
  for (i in r) if (r[i]) return i;
}
var Q1 = {
  detectAppVersion: I1,
  detectDocumentAttributes: D1,
  detectErrorTrace: M1,
  detectEvalLengthInconsistency: O1,
  detectFunctionBind: H1,
  detectLanguagesLengthInconsistency: A1,
  detectNotificationPermissions: F1,
  detectPluginsArray: z1,
  detectPluginsLengthInconsistency: V1,
  detectProcess: W1,
  detectUserAgent: U1,
  detectWebDriver: Z1,
  detectWebGL: $1,
  detectWindowExternal: G1,
  detectWindowSize: Y1,
  detectMimeTypesConsistent: j1,
  detectProductSub: B1,
  detectDistinctiveProperties: X1
};
function J1() {
  var e = v, t = navigator[e(1036)];
  if (t == null) throw new se(-1, "navigator.appVersion is undefined");
  return t;
}
function K1() {
  var e = v;
  if (document[e(1243)] === void 0) throw new se(-1, e(534));
  var t = document.documentElement;
  if (typeof t[e(1184)] !== e(425)) throw new se(-2, e(780));
  return t[e(1184)]();
}
function q1() {
  var e = v;
  try {
    null[0]();
  } catch (t) {
    if (t instanceof Error && t[e(742)] != null)
      return t[e(742)][e(961)]();
  }
  throw new se(-3, "errorTrace signal unexpected behaviour");
}
function ev() {
  var e = v;
  return eval[e(961)]().length;
}
function tv() {
  var e = v;
  if (Function[e(886)].bind === void 0) throw new se(-2, e(721));
  return Function.prototype.bind[e(961)]();
}
function Mu() {
  var e = v, t, n, r = window, i = navigator;
  return wi([
    e(592) in i,
    e(1124) in i,
    i[e(1033)][e(1242)](e(571)) === 0,
    e(521) in r,
    e(1e3) in r,
    e(611) in r,
    e(1051) in r
  ]) >= 5 ? e(449) : wi([
    "ApplePayError" in r,
    e(1192) in r,
    e(361) in r,
    i[e(1033)][e(1242)](e(817)) === 0,
    "getStorageUpdates" in i,
    e(960) in r
  ]) >= 4 ? e(1230) : wi([
    e(466) in navigator,
    "MozAppearance" in ((n = (t = document[e(1243)]) === null || t === void 0 ? void 0 : t.style) !== null && n !== void 0 ? n : {}),
    e(1211) in r,
    e(459) in r,
    e(698) in r,
    e(950) in r
  ]) >= 4 ? "gecko" : e(932);
}
function nv() {
  var e = v, t, n = (t = navigator[e(852)]) === null || t === void 0 ? void 0 : t[e(451)]();
  return Xt(n, e(642)) ? e(597) : Xt(n, e(317)) || Xt(n, e(535)) ? e(1134) : Xt(n, "wechat") ? e(1129) : Xt(n, e(554)) ? "firefox" : Xt(n, e(763)) || Xt(n, e(491)) ? e(763) : Xt(n, e(843)) ? e(843) : Xt(n, "safari") ? e(774) : e(932);
}
function rv() {
  var e = v, t = Mu(), n = t === "chromium", r = t === e(658);
  if (!n && !r) return !1;
  var i = window;
  return wi([
    "onorientationchange" in i,
    "orientation" in i,
    n && !(e(488) in i),
    r && /android/i[e(913)](navigator[e(1036)])
  ]) >= 2;
}
function iv() {
  var e = v;
  return document[e(667)] === void 0 ? !1 : document[e(667)]();
}
function av() {
  var e = v, t = window;
  return wi([
    !("MediaSettingsRange" in t),
    "RTCEncodedAudioFrame" in t,
    "" + t[e(1191)] === e(1088),
    "" + t[e(1141)] == "[object Reflect]"
  ]) >= 3;
}
function ov() {
  var e = v, t = navigator, n = [], r = t[e(996)] || t[e(696)] || t[e(1013)] || t.systemLanguage;
  if (r !== void 0 && n[e(638)]([r]), Array[e(590)](t[e(1078)])) {
    var i = Mu();
    !(i === e(449) && av()) && n[e(638)](t[e(1078)]);
  } else if (typeof t[e(1078)] == "string") {
    var a = t[e(1078)];
    a && n.push(a[e(447)](","));
  }
  return n;
}
function sv() {
  var e = v;
  if (navigator[e(829)] === void 0) throw new se(-1, e(1084));
  for (var t = navigator[e(829)], n = Object[e(1032)](t) === MimeTypeArray.prototype, r = 0; r < t.length; r++)
    n && (n = Object.getPrototypeOf(t[r]) === MimeType.prototype);
  return n;
}
function lv() {
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
function uv() {
  var e = v;
  if (navigator[e(1092)] === void 0) throw new se(-1, e(574));
  if (window[e(1080)] === void 0) throw new se(-1, e(591));
  return navigator[e(1092)] instanceof PluginArray;
}
function cv() {
  var e = v;
  if (navigator[e(1092)] === void 0) throw new se(-1, e(574));
  if (navigator[e(1092)][e(343)] === void 0)
    throw new se(-3, "navigator.plugins.length is undefined");
  return navigator.plugins[e(343)];
}
function dv() {
  var e = v, t = window[e(1195)], n = "window.process is";
  if (t === void 0) throw new se(-1, "".concat(n, e(910)));
  if (t && typeof t !== e(668))
    throw new se(-3, ""[e(1130)](n, e(527)));
  return t;
}
function fv() {
  var e = v, t = navigator[e(1006)];
  if (t === void 0) throw new se(-1, e(1135));
  return t;
}
function xv() {
  var e = v;
  if (navigator[e(1017)] === void 0) throw new se(-1, "navigator.connection is undefined");
  if (navigator[e(1017)][e(1005)] === void 0) throw new se(-1, e(525));
  return navigator[e(1017)].rtt;
}
function pv() {
  var e = v;
  return navigator[e(852)];
}
function hv() {
  var e = v;
  if (navigator[e(603)] == null) throw new se(-1, e(888));
  return navigator[e(603)];
}
function mv() {
  var e = v, t = document[e(631)](e(1277));
  if (typeof t[e(400)] != "function") throw new se(-2, e(884));
  var n = t[e(400)](e(1008));
  if (n === null) throw new se(-4, "WebGLRenderingContext is null");
  if (typeof n[e(412)] !== e(425)) throw new se(-2, e(422));
  var r = n[e(412)](n.VENDOR), i = n[e(412)](n[e(342)]);
  return { vendor: r, renderer: i };
}
function vv() {
  var e = v;
  if (window[e(490)] === void 0) throw new se(-1, e(329));
  var t = window[e(490)];
  if (typeof t[e(961)] !== e(425)) throw new se(-2, e(355));
  return t[e(961)]();
}
function gv() {
  var e = v;
  return {
    outerWidth: window[e(968)],
    outerHeight: window[e(862)],
    innerWidth: window.innerWidth,
    innerHeight: window[e(1271)]
  };
}
function yv() {
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
  }, t[X.HeadlessChrome] = { window: [e(481), e(549)] }, t), r, i = {}, a = i0(window), o = [];
  window.document !== void 0 && (o = i0(window[e(601)]));
  for (r in n) {
    var s = n[r];
    if (s !== void 0) {
      var l = s[e(859)] === void 0 ? !1 : yl[e(1241)](
        void 0,
        fo([a], s[e(859)], !1)
      ), c = s[e(601)] === void 0 || !o.length ? !1 : yl[e(1241)](
        void 0,
        fo([o], s[e(601)], !1)
      );
      i[r] = l || c;
    }
  }
  return i;
}
var wv = {
  android: rv,
  browserKind: nv,
  browserEngineKind: Mu,
  documentFocus: iv,
  userAgent: pv,
  appVersion: J1,
  rtt: xv,
  windowSize: gv,
  pluginsLength: cv,
  pluginsArray: uv,
  errorTrace: q1,
  productSub: fv,
  windowExternal: vv,
  mimeTypesConsistent: sv,
  evalLength: ev,
  webGL: mv,
  webDriver: hv,
  languages: ov,
  notificationPermissions: lv,
  documentElementKeys: K1,
  functionBind: tv,
  process: dv,
  distinctiveProps: yv
}, _v = function() {
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
    var r = N1(this[n(368)], Q1), i = r[0], a = r[1];
    return this[n(957)] = i, a;
  }, t[e(886)][e(437)] = function() {
    return Ke(this, void 0, void 0, function() {
      var n;
      return qe(this, function(r) {
        var i = U;
        switch (r[i(979)]) {
          case 0:
            return n = this, [4, L1(wv)];
          case 1:
            return n.components = r[i(607)](), [2, this[i(368)]];
        }
      });
    });
  }, t;
}();
function kv() {
  var e = v;
  if (!(window.__fpjs_d_m || Math[e(360)]() >= 1e-3))
    try {
      var t = new XMLHttpRequest();
      t.open(e(873), e(578)[e(1130)](P1, e(435)), !0), t.send();
    } catch (n) {
      console.error(n);
    }
}
function Sv(e) {
  var t = v, n = {}, r = n[t(410)], i = r === void 0 ? !0 : r;
  return Ke(this, void 0, void 0, function() {
    var a;
    return qe(this, function(o) {
      var s = U;
      switch (o[s(979)]) {
        case 0:
          return i && kv(), a = new _v(), [4, a.collect()];
        case 1:
          return o[s(607)](), [2, a];
      }
    });
  });
}
const ef = !self[v(601)] && self[v(1161)];
function Cv() {
  var e = v;
  const t = [][e(318)];
  try {
    (-1)[e(505)](-1);
  } catch (n) {
    return n[e(555)][e(343)] + (t + "")[e(447)](t.name)[e(536)]("")[e(343)];
  }
}
const bv = Cv(), Ev = {
  80: { name: "V8", isBlink: !0, isGecko: !1, isWebkit: !1 },
  58: { name: v(552), isBlink: !1, isGecko: !0, isWebkit: !1 },
  77: { name: v(902), isBlink: !1, isGecko: !1, isWebkit: !0 }
}, Ou = Ev[bv] || { name: null, isBlink: !1, isGecko: !1, isWebkit: !1 }, Ae = Ou.isBlink, po = Ou.isGecko, Tv = Ou[v(526)];
function Pv() {
  var e = v;
  return e(797) in navigator && Object[e(1032)](navigator[e(797)])[e(318)].name == "Brave" && navigator[e(797)][e(978)][e(961)]() == e(589);
}
function Nv() {
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
const Lv = () => {
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
}, Iv = Lv(), { logTestResult: ho } = Iv, tf = () => {
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
}, wl = (e, t = 0) => {
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
function Rv() {
  const e = {};
  return {
    getRecords: () => e,
    documentLie: (t, n) => {
      const r = n instanceof Array;
      return e[t] ? r ? e[t] = [...e[t], ...n] : e[t].push(n) : r ? e[t] = n : e[t] = [n];
    }
  };
}
const Dv = Rv(), { documentLie: Ta } = Dv, nf = v(337), Hu = () => String[v(1187)](Math[v(360)]() * 26 + 97) + Math[v(360)]()[v(961)](36)[v(1269)](-7);
function Mv(e) {
  var t = v;
  try {
    if (!Ae) return e;
    const n = e.document[t(631)](t(669));
    n[t(962)]("id", Hu()), n.setAttribute("style", nf), n[t(1167)] = "<div><iframe></iframe></div>", e.document[t(768)].appendChild(n);
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
Hu();
const ii = "Reflect" in self;
function Ov(e) {
  var t = v;
  return e[t(318)][t(516)] == t(548);
}
function Ee({ spawnErr: e, withStack: t, final: n }) {
  try {
    throw e(), Error();
  } catch (r) {
    return Ov(r) ? t ? t(r) : !1 : !0;
  } finally {
    n && n();
  }
}
function Hv(e) {
  try {
    return e(), !1;
  } catch {
    return !0;
  }
}
function a0(e) {
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
const Av = /at Function\.toString /, jv = /at Object\.toString/, Fv = /at (Function\.)?\[Symbol.hasInstance\]/, zv = /at (Proxy\.)?\[Symbol.hasInstance\]/, o0 = /strict mode/;
function s0({
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
    [a(711)]: !!r && /^(screen|navigator)$/i[a(913)](s) && !!(Object.getOwnPropertyDescriptor(self[s.toLowerCase()], o) || ii && Reflect.getOwnPropertyDescriptor(self[s[a(451)]()], o)),
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
    [a(1205)]: !Tv && Ee({ spawnErr: () => {
    } }),
    "failed null conversion error": Ee({
      spawnErr: () => Object[a(373)](t, null)[a(961)](),
      final: () => Object[a(373)](t, l)
    }),
    [a(767)]: !a0(o)[e[a(1071)].prototype[a(961)][a(583)](t)] || !a0("toString")[e[a(1071)][a(886)][a(961)][a(583)](
      t[a(961)]
    )],
    [a(544)]: a(886) in t,
    [a(1224)]: !!(Object.getOwnPropertyDescriptor(t, a(885)) || Reflect.getOwnPropertyDescriptor(t, a(885)) || Object.getOwnPropertyDescriptor(t, a(822)) || Reflect.getOwnPropertyDescriptor(t, a(822)) || Object[a(897)](t, a(886)) || Reflect[a(897)](t, a(886)) || Object.getOwnPropertyDescriptor(t, a(961)) || Reflect.getOwnPropertyDescriptor(t, a(961))),
    [a(1107)]: !!(t[a(509)]("arguments") || t[a(509)](a(822)) || t[a(509)]("prototype") || t[a(509)]("toString")),
    [a(1147)]: Object[a(331)](Object.getOwnPropertyDescriptors(t))[a(407)]()[a(961)]() != "length,name",
    "failed own property names": Object[a(719)](t)[a(407)]()[a(961)]() != a(354),
    [a(891)]: ii && Reflect[a(483)](t).sort()[a(961)]() != a(354),
    [a(498)]: Ee({
      spawnErr: () => Object[a(851)](t).toString(),
      withStack: (m) => Ae && !fr(m, Av)
    }) || Ee({
      spawnErr: () => Object[a(851)](new Proxy(t, {}))[a(961)](),
      withStack: (m) => Ae && !fr(m, jv)
    }),
    [a(870)]: Ee({
      spawnErr: () => {
      },
      withStack: (m) => po && !fr(m, o0, 0)
    }),
    "failed at toString incompatible proxy error": Ee({
      spawnErr: () => {
      },
      withStack: (m) => po && !fr(m, o0, 0)
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
      "failed at reflect set proto": ii && Ee({
        spawnErr: () => {
          var x = a;
          throw Reflect[x(373)](t, Object[x(851)](t)), new TypeError();
        },
        final: () => Object[a(373)](t, l)
      }),
      [a(1070)]: ii && !Ee({
        spawnErr: () => {
          var x = a;
          Reflect[x(373)](y, Object.create(y));
        },
        final: () => Object[a(373)](y, l)
      }),
      [a(479)]: Ae && (Ee({
        spawnErr: () => {
        },
        withStack: (x) => !fr(x, Fv)
      }) || Ee({
        spawnErr: () => {
          new Proxy(t, {});
        },
        withStack: (x) => !fr(x, zv)
      })),
      [a(442)]: Ae && ii && Hv(() => {
        var x = a;
        Object[x(1079)](t, "", { configurable: !0 }).toString(), Reflect[x(529)](t, "");
      })
    };
  }
  const f = Object.keys(c)[a(788)]((m) => !!c[m]);
  return { lied: f[a(343)], lieTypes: f };
}
function Vv(e) {
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
              return p = s0({
                scope: e,
                apiFunction: u[f],
                proto: u,
                obj: null,
                lieProps: n
              }), p.lied ? (Ta(x, p.lieTypes), n[x] = p.lieTypes) : void 0;
            if (f != "name" && f != m(343) && f[0] !== f[0][m(847)]()) {
              const k = [m(883)];
              return Ta(x, k), n[x] = k;
            }
          } catch {
          }
          const h = Object[m(897)](u, f)[m(873)];
          return p = s0({
            scope: e,
            apiFunction: h,
            proto: u,
            obj: c,
            lieProps: n
          }), p[m(507)] ? (Ta(x, p[m(936)]), n[x] = p[m(936)]) : void 0;
        } catch {
          const p = m(1053);
          return Ta(x, p), n[x] = [p];
        }
      });
    }
  };
}
function Wv() {
  var e = v;
  if (ef) return { iframeWindow: self };
  try {
    const t = self[e(343)], n = new DocumentFragment(), r = document[e(631)](e(669)), i = Hu();
    r.setAttribute("id", i), n.appendChild(r), r.innerHTML = '<div style="' + nf + e(1256), document.body[e(866)](n);
    const a = self[t];
    return { iframeWindow: Mv(a) || self, div: r };
  } catch {
    return console[e(446)]("client blocked phantom iframe"), { iframeWindow: self };
  }
}
const { iframeWindow: Bv, div: Fs } = Wv() || {};
function Uv(e) {
  var t = v;
  const n = Vv(e), { searchLies: r } = n;
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
const Zv = performance.now(), { lieDetector: $v, lieList: Gv, lieDetail: Yv, propsSearched: Xv } = Uv(Bv), Qv = (e) => e && e[v(788)](
  (t) => !/object toString|toString incompatible proxy/[v(913)](t)
).length;
let _l, K, l0 = 0;
if (!ef) {
  _l = (() => {
    var n = v;
    const r = $v[n(983)]();
    return Object[n(331)](r)[n(541)]((i, a) => (i[a] = Qv(r[a]), i), {});
  })(), K = JSON[v(626)](JSON.stringify(Yv)), l0 = +(performance[v(738)]() - Zv)[v(505)](2);
  const t = Xv.length + v(358) + l0 + v(1181) + Gv[v(343)] + " corrupted)";
  setTimeout(() => /* @__PURE__ */ console.log(t), 3e3);
}
const Jv = () => {
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
}, Kv = Jv(), { captureError: rf } = Kv;
var Se = ((e) => {
  var t = v;
  return e[t(757)] = t(874), e[t(495)] = t(394), e[t(561)] = "Linux", e[t(563)] = "Android", e[t(356)] = t(1004), e;
})(Se || {});
const qv = [v(836), v(1233), "menu", v(1074), "small-caption", v(695)], u0 = {
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
function eg() {
  var e = v;
  const { body: t } = document, n = document[e(631)](e(669));
  t.appendChild(n);
  try {
    const r = String([
      ...qv[e(541)]((a, o) => {
        var s = e;
        return n[s(962)](s(1252), s(712) + o + s(551)), a[s(504)](getComputedStyle(n)[s(894)]);
      }, /* @__PURE__ */ new Set())
    ]), i = u0[r];
    return u0[r] ? r + ":" + i : r;
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
}, tg = String[v(1187)](Math[v(360)]() * 26 + 97) + Math[v(360)]()[v(961)](36).slice(-7);
function ng() {
  var O;
  var e = v;
  if (!Ae) return [];
  const t = e(946) in HTMLVideoElement[e(886)], n = CSS.supports(e(651)), r = CSS.supports("appearance: initial"), i = e(333) in Intl, a = CSS[e(487)](e(1180)), o = CSS[e(487)]("border-end-end-radius: initial"), s = e(403) in Crypto[e(886)], l = e(938) in window, c = "downlinkMax" in (((O = window.NetworkInformation) == null ? void 0 : O[e(886)]) || {}), d = "ContentIndex" in window, f = e(810) in window, m = e(783) in window, w = "FileSystemWritableFileStream" in window, y = "HID" in window && e(976) in window, x = e(402) in window && "Serial" in window, _ = e(488) in window, u = e(1182) in Window && "TouchEvent" in window, p = e(1198) in Navigator[e(886)], h = (T, A) => T ? [A] : [], g = {
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
    const xt = g[A], lr = +(xt[le(788)]((ti) => ti)[le(343)] / xt[le(343)])[le(505)](2);
    return T[A] = lr, T;
  }, {}), S = Object[e(331)](C)[e(541)](
    (T, A) => C[T] > C[A] ? T : A
  ), L = C[S];
  return [C, L, k];
}
async function rg({ webgl: e, workerScope: t }) {
  var r;
  var n = v;
  try {
    const i = tf();
    await wl(i);
    const a = Object.keys({ ...navigator.mimeTypes }), o = eg(), [s, l, c] = ng(), d = {
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
          let k = Fs;
          if (!Fs && (k = document[g(631)]("div"), document.body[g(866)](k)), !k) return !1;
          k[g(962)]("style", g(1041));
          const { backgroundColor: C } = getComputedStyle(k) || [];
          return !Fs && document[g(768)][g(691)](k), C === g(736);
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
        webDriverIsOn: CSS[n(487)]("border-end-end-radius: initial") && navigator[n(603)] === void 0 || !!navigator[n(603)] || !!_l[n(926)],
        hasHeadlessUA: /HeadlessChrome/[n(913)](navigator[n(852)]) || /HeadlessChrome/[n(913)](navigator[n(1036)]),
        hasHeadlessWorkerUA: !!t && /HeadlessChrome/[n(913)](t.userAgent)
      },
      stealth: {
        hasIframeProxy: (() => {
          var g = n;
          try {
            const k = document[g(631)](g(462));
            return k.srcdoc = tg, !!k.contentWindow;
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
        hasToStringProxy: !!_l["Function.toString"],
        hasBadWebGL: (() => {
          var g = n;
          const { UNMASKED_RENDERER_WEBGL: k } = (e == null ? void 0 : e[g(901)]) || {}, { webglRenderer: C } = t || {};
          return k && C && k !== C;
        })()
      }
    }, { likeHeadless: f, headless: m, stealth: w } = d, y = Object[n(331)](f), x = Object.keys(m), _ = Object[n(331)](w), u = +(y[n(788)]((g) => f[g])[n(343)] / y[n(343)] * 100)[n(505)](0), p = +(x[n(788)]((g) => m[g])[n(343)] / x[n(343)] * 100).toFixed(0), h = +(_[n(788)]((g) => w[g])[n(343)] / _[n(343)] * 100)[n(505)](0);
    return ho({ time: i[n(1142)](), test: "headless", passed: !0 }), {
      ...d,
      likeHeadlessRating: u,
      headlessRating: p,
      stealthRating: h,
      systemFonts: o,
      platformEstimate: [s, l]
    };
  } catch (i) {
    ho({ test: n(974), passed: !1 }), rf(i, n(974));
    return;
  }
}
async function ig() {
  var e = v;
  try {
    const t = tf();
    await wl(t);
    const n = {
      privacy: void 0,
      security: void 0,
      mode: void 0,
      extension: void 0,
      engine: Ae ? "Blink" : po ? e(1197) : ""
    }, r = (y) => new RegExp(y + "+$"), i = (y, x, _) => new Promise(
      (u) => setTimeout(() => {
        var p = e;
        const h = _ || +/* @__PURE__ */ new Date(), g = r(x)[p(913)](h) ? r(x)[p(683)](h)[0] : h;
        return u(g);
      }, y)
    ), a = async () => {
      var y = e;
      const x = +/* @__PURE__ */ new Date(), _ = +("" + x)[y(1269)](-1), u = await i(0, _, x), p = await i(1, _), h = await i(2, _), g = await i(3, _), k = await i(4, _), C = await i(5, _), S = await i(6, _), L = await i(7, _), O = await i(8, _), T = await i(9, _), A = ("" + u)[y(1269)](-1), le = ("" + p)[y(1269)](-1), xt = ("" + h).slice(-1), lr = ("" + g)[y(1269)](-1), ti = ("" + k).slice(-1), ni = ("" + C)[y(1269)](-1), ri = ("" + S)[y(1269)](-1), I = ("" + L).slice(-1), V = ("" + O)[y(1269)](-1), $ = ("" + T)[y(1269)](-1), ue = A == le && A == xt && A == lr && A == ti && A == ni && A == ri && A == I && A == V && A == $, ye = ("" + u)[y(343)], jn = [
        u,
        p,
        h,
        g,
        k,
        C,
        S,
        L,
        O,
        T
      ];
      return {
        protection: ue,
        delays: jn[y(335)](
          (tt) => ("" + tt).length > ye ? ("" + tt).slice(-ye) : tt
        ),
        precision: ue ? Math.min(...jn[y(335)]((tt) => ("" + tt)[y(343)])) : void 0,
        precisionValue: ue ? A : void 0
      };
    }, [o, s] = await Promise[e(930)]([
      Pv(),
      Ae ? void 0 : a()
    ]);
    if (o) {
      const y = Nv();
      n[e(530)] = e(513), n[e(336)] = {
        FileSystemWritableFileStream: e(430) in window,
        Serial: e(1110) in window,
        ReportingObserver: "ReportingObserver" in window
      }, n[e(1169)] = y[e(1072)] ? e(1072) : y[e(397)] ? "standard" : y[e(1009)] ? e(1009) : "";
    }
    const { protection: l } = s || {};
    if (po && l) {
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
    await wl(t);
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
        privacypossum: O,
        jshelter: T,
        puppeteerExtra: A,
        fakeBrowser: le
      } = y, xt = u(1020);
      if (_)
        return _ >= 7 && h[u(1126)][u(673)](x[u(1126)]) && h[u(471)][u(673)](x.contentWindowHash) && h[u(781)].includes(x[u(781)]) && h[u(499)][u(673)](x.getElementByIdHash) && h[u(735)].includes(x[u(735)]) && h[u(824)][u(673)](x[u(824)]) && h.getImageDataHash.includes(x[u(646)]) ? u(934) : _ >= 7 && g[u(1126)][u(673)](x[u(1126)]) && g[u(471)][u(673)](x[u(471)]) && g.createElementHash[u(673)](x[u(781)]) && g[u(499)].includes(x[u(499)]) && g.toDataURLHash[u(673)](x[u(735)]) && g[u(824)][u(673)](x[u(824)]) && g[u(646)].includes(x[u(646)]) ? u(376) : _ >= 6 && k.contentDocumentHash[u(673)](x[u(1126)]) && k[u(471)][u(673)](x[u(471)]) && k[u(702)][u(673)](x[u(702)]) && k[u(735)].includes(x.toDataURLHash) && k[u(824)][u(673)](x[u(824)]) && k[u(646)][u(673)](x[u(646)]) ? "CanvasBlocker" : _ >= 9 && C[u(702)][u(673)](x[u(702)]) && C[u(1146)][u(673)](x[u(1146)]) && C.insertAdjacentHTMLHash.includes(x[u(345)]) && C.insertAdjacentTextHash[u(673)](x[u(927)]) && C[u(1038)].includes(x.prependHash) && C.replaceWithHash[u(673)](x.replaceWithHash) && C.appendChildHash[u(673)](x[u(657)]) && C[u(367)][u(673)](x[u(367)]) && C[u(1060)].includes(x[u(1060)]) ? u(1077) : _ >= 7 && S[u(735)][u(673)](x.toDataURLHash) && S.toBlobHash[u(673)](x[u(824)]) && S[u(646)][u(673)](x[u(646)]) && S[u(687)][u(673)](x[u(687)]) && S[u(815)].includes(x[u(815)]) && S[u(764)][u(673)](x[u(764)]) && S[u(789)][u(673)](x.getFloatTimeDomainDataHash) && S.copyFromChannelHash[u(673)](x[u(389)]) && S[u(1132)].includes(x[u(1132)]) && S.hardwareConcurrencyHash[u(673)](x[u(473)]) && S.availHeightHash[u(673)](x[u(1188)]) && S[u(1010)][u(673)](x[u(1010)]) && S[u(427)][u(673)](x[u(427)]) && S[u(952)][u(673)](x[u(952)]) && S[u(647)][u(673)](x[u(647)]) && S[u(839)][u(673)](x[u(839)]) ? u(1214) : _ >= 2 && L.getImageDataHash[u(673)](x[u(646)]) && L.toDataURLHash.includes(x.toDataURLHash) ? u(417) : _ >= 3 && O[u(473)].includes(x[u(473)]) && O.availWidthHash.includes(x[u(952)]) && O[u(647)][u(673)](x[u(647)]) ? u(531) : _ >= 2 && p[u(1126)].includes(x.contentDocumentHash) && p[u(471)][u(673)](x.contentDocumentHash) && p[u(654)][u(673)](x[u(654)]) && x[u(473)] == xt ? u(766) : _ >= 14 && T[u(1126)][u(673)](x[u(1126)]) && T.contentWindowHash[u(673)](x[u(1126)]) && T[u(702)][u(673)](x[u(702)]) && T.insertAdjacentElementHash[u(673)](x.insertAdjacentElementHash) && T[u(345)][u(673)](x.insertAdjacentHTMLHash) && T[u(1038)][u(673)](x[u(1038)]) && T[u(880)].includes(x[u(880)]) && T[u(657)][u(673)](x[u(657)]) && T[u(367)][u(673)](x[u(367)]) && T[u(1060)][u(673)](x.replaceChildHash) && T[u(473)].includes(x[u(473)]) ? "JShelter" : _ >= 13 && A[u(1126)].includes(x[u(1126)]) && A[u(471)][u(673)](x[u(471)]) && A[u(781)].includes(x[u(781)]) && A.getElementByIdHash.includes(x.getElementByIdHash) && A[u(702)][u(673)](x.appendHash) && A[u(1146)][u(673)](x[u(1146)]) && A[u(345)][u(673)](x[u(345)]) && A.insertAdjacentTextHash[u(673)](x[u(927)]) && A.prependHash.includes(x.prependHash) && A[u(880)][u(673)](x[u(880)]) && A.appendChildHash[u(673)](x[u(657)]) && A[u(367)].includes(x.insertBeforeHash) && A[u(1126)][u(673)](x[u(1126)]) && A.replaceChildHash.includes(x[u(1060)]) && A[u(654)][u(673)](x[u(654)]) && A[u(735)][u(673)](x.toDataURLHash) && A[u(824)][u(673)](x[u(824)]) && A[u(646)][u(673)](x[u(646)]) && A.hardwareConcurrencyHash[u(673)](x[u(473)]) ? u(1155) : _ >= 12 && le.appendChildHash[u(673)](x.appendChildHash) && le[u(654)][u(673)](x[u(654)]) && le[u(735)].includes(x.toDataURLHash) && le[u(824)].includes(x[u(824)]) && le.getImageDataHash[u(673)](x[u(646)]) && le[u(473)][u(673)](x[u(473)]) && le.availHeightHash[u(673)](x[u(1188)]) && le[u(1010)][u(673)](x.availLeftHash) && le[u(427)][u(673)](x.availTopHash) && le[u(952)][u(673)](x[u(952)]) && le[u(647)][u(673)](x[u(647)]) && le[u(839)][u(673)](x[u(839)]) ? u(987) : void 0;
    };
    return n[e(413)] = w({
      pattern: f,
      hash: m,
      prototypeLiesLen: c
    }), ho({ time: t[e(1142)](), test: e(748), passed: !0 }), n;
  } catch (t) {
    ho({ test: e(748), passed: !1 }), rf(t);
    return;
  }
}
const ag = async () => {
  var e = v;
  const t = await ig(), n = await rg({ webgl: null, workerScope: null }), r = { resistance: t, headlessFeaturesFingerprint: n }, i = Sv(), a = await i, o = await a.detect(), s = o.bot, l = (n == null ? void 0 : n[e(959)]) || 0, c = (n == null ? void 0 : n[e(540)]) || 0, d = (n == null ? void 0 : n.stealthRating) || 0, f = s ? 100 : Math[e(826)](l, c, d), m = f > 50 || d > 30, w = s ? o[e(984)] : t == null ? void 0 : t[e(413)];
  return {
    fingerprint: r,
    isBotBotD: o,
    botScore: f,
    isBot: m,
    botType: w
  };
}, O3 = async () => {
  var e = v;
  const t = T1(), n = await t, r = await n[e(873)](), { screenFrame: i, ...a } = r[e(368)];
  return qd(a);
};
var og = !1;
function sg(e) {
  if (e.sheet)
    return e.sheet;
  for (var t = 0; t < document.styleSheets.length; t++)
    if (document.styleSheets[t].ownerNode === e)
      return document.styleSheets[t];
}
function lg(e) {
  var t = document.createElement("style");
  return t.setAttribute("data-emotion", e.key), e.nonce !== void 0 && t.setAttribute("nonce", e.nonce), t.appendChild(document.createTextNode("")), t.setAttribute("data-s", ""), t;
}
var ug = /* @__PURE__ */ function() {
  function e(n) {
    var r = this;
    this._insertTag = function(i) {
      var a;
      r.tags.length === 0 ? r.insertionPoint ? a = r.insertionPoint.nextSibling : r.prepend ? a = r.container.firstChild : a = r.before : a = r.tags[r.tags.length - 1].nextSibling, r.container.insertBefore(i, a), r.tags.push(i);
    }, this.isSpeedy = n.speedy === void 0 ? !og : n.speedy, this.tags = [], this.ctr = 0, this.nonce = n.nonce, this.key = n.key, this.container = n.container, this.prepend = n.prepend, this.insertionPoint = n.insertionPoint, this.before = null;
  }
  var t = e.prototype;
  return t.hydrate = function(r) {
    r.forEach(this._insertTag);
  }, t.insert = function(r) {
    this.ctr % (this.isSpeedy ? 65e3 : 1) === 0 && this._insertTag(lg(this));
    var i = this.tags[this.tags.length - 1];
    if (this.isSpeedy) {
      var a = sg(i);
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
}(), He = "-ms-", mo = "-moz-", q = "-webkit-", af = "comm", Au = "rule", ju = "decl", cg = "@import", of = "@keyframes", dg = "@layer", fg = Math.abs, qo = String.fromCharCode, xg = Object.assign;
function pg(e, t) {
  return Ie(e, 0) ^ 45 ? (((t << 2 ^ Ie(e, 0)) << 2 ^ Ie(e, 1)) << 2 ^ Ie(e, 2)) << 2 ^ Ie(e, 3) : 0;
}
function sf(e) {
  return e.trim();
}
function hg(e, t) {
  return (e = t.exec(e)) ? e[0] : e;
}
function ee(e, t, n) {
  return e.replace(t, n);
}
function kl(e, t) {
  return e.indexOf(t);
}
function Ie(e, t) {
  return e.charCodeAt(t) | 0;
}
function Di(e, t, n) {
  return e.slice(t, n);
}
function At(e) {
  return e.length;
}
function Fu(e) {
  return e.length;
}
function Pa(e, t) {
  return t.push(e), e;
}
function mg(e, t) {
  return e.map(t).join("");
}
var es = 1, jr = 1, lf = 0, et = 0, _e = 0, Kr = "";
function ts(e, t, n, r, i, a, o) {
  return { value: e, root: t, parent: n, type: r, props: i, children: a, line: es, column: jr, length: o, return: "" };
}
function ai(e, t) {
  return xg(ts("", null, null, "", null, null, 0), e, { length: -e.length }, t);
}
function vg() {
  return _e;
}
function gg() {
  return _e = et > 0 ? Ie(Kr, --et) : 0, jr--, _e === 10 && (jr = 1, es--), _e;
}
function ot() {
  return _e = et < lf ? Ie(Kr, et++) : 0, jr++, _e === 10 && (jr = 1, es++), _e;
}
function Wt() {
  return Ie(Kr, et);
}
function Ja() {
  return et;
}
function va(e, t) {
  return Di(Kr, e, t);
}
function Mi(e) {
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
function uf(e) {
  return es = jr = 1, lf = At(Kr = e), et = 0, [];
}
function cf(e) {
  return Kr = "", e;
}
function Ka(e) {
  return sf(va(et - 1, Sl(e === 91 ? e + 2 : e === 40 ? e + 1 : e)));
}
function yg(e) {
  for (; (_e = Wt()) && _e < 33; )
    ot();
  return Mi(e) > 2 || Mi(_e) > 3 ? "" : " ";
}
function wg(e, t) {
  for (; --t && ot() && !(_e < 48 || _e > 102 || _e > 57 && _e < 65 || _e > 70 && _e < 97); )
    ;
  return va(e, Ja() + (t < 6 && Wt() == 32 && ot() == 32));
}
function Sl(e) {
  for (; ot(); )
    switch (_e) {
      case e:
        return et;
      case 34:
      case 39:
        e !== 34 && e !== 39 && Sl(_e);
        break;
      case 40:
        e === 41 && Sl(e);
        break;
      case 92:
        ot();
        break;
    }
  return et;
}
function _g(e, t) {
  for (; ot() && e + _e !== 57; )
    if (e + _e === 84 && Wt() === 47)
      break;
  return "/*" + va(t, et - 1) + "*" + qo(e === 47 ? e : ot());
}
function kg(e) {
  for (; !Mi(Wt()); )
    ot();
  return va(e, et);
}
function Sg(e) {
  return cf(qa("", null, null, null, [""], e = uf(e), 0, [0], e));
}
function qa(e, t, n, r, i, a, o, s, l) {
  for (var c = 0, d = 0, f = o, m = 0, w = 0, y = 0, x = 1, _ = 1, u = 1, p = 0, h = "", g = i, k = a, C = r, S = h; _; )
    switch (y = p, p = ot()) {
      case 40:
        if (y != 108 && Ie(S, f - 1) == 58) {
          kl(S += ee(Ka(p), "&", "&\f"), "&\f") != -1 && (u = -1);
          break;
        }
      case 34:
      case 39:
      case 91:
        S += Ka(p);
        break;
      case 9:
      case 10:
      case 13:
      case 32:
        S += yg(y);
        break;
      case 92:
        S += wg(Ja() - 1, 7);
        continue;
      case 47:
        switch (Wt()) {
          case 42:
          case 47:
            Pa(Cg(_g(ot(), Ja()), t, n), l);
            break;
          default:
            S += "/";
        }
        break;
      case 123 * x:
        s[c++] = At(S) * u;
      case 125 * x:
      case 59:
      case 0:
        switch (p) {
          case 0:
          case 125:
            _ = 0;
          case 59 + d:
            u == -1 && (S = ee(S, /\f/g, "")), w > 0 && At(S) - f && Pa(w > 32 ? d0(S + ";", r, n, f - 1) : d0(ee(S, " ", "") + ";", r, n, f - 2), l);
            break;
          case 59:
            S += ";";
          default:
            if (Pa(C = c0(S, t, n, c, d, i, s, h, g = [], k = [], f), a), p === 123)
              if (d === 0)
                qa(S, t, C, C, g, a, f, s, k);
              else
                switch (m === 99 && Ie(S, 3) === 110 ? 100 : m) {
                  case 100:
                  case 108:
                  case 109:
                  case 115:
                    qa(e, C, C, r && Pa(c0(e, C, C, 0, 0, i, s, h, i, g = [], f), k), i, k, f, s, r ? g : k);
                    break;
                  default:
                    qa(S, C, C, C, [""], k, 0, s, k);
                }
        }
        c = d = w = 0, x = u = 1, h = S = "", f = o;
        break;
      case 58:
        f = 1 + At(S), w = y;
      default:
        if (x < 1) {
          if (p == 123)
            --x;
          else if (p == 125 && x++ == 0 && gg() == 125)
            continue;
        }
        switch (S += qo(p), p * x) {
          case 38:
            u = d > 0 ? 1 : (S += "\f", -1);
            break;
          case 44:
            s[c++] = (At(S) - 1) * u, u = 1;
            break;
          case 64:
            Wt() === 45 && (S += Ka(ot())), m = Wt(), d = f = At(h = S += kg(Ja())), p++;
            break;
          case 45:
            y === 45 && At(S) == 2 && (x = 0);
        }
    }
  return a;
}
function c0(e, t, n, r, i, a, o, s, l, c, d) {
  for (var f = i - 1, m = i === 0 ? a : [""], w = Fu(m), y = 0, x = 0, _ = 0; y < r; ++y)
    for (var u = 0, p = Di(e, f + 1, f = fg(x = o[y])), h = e; u < w; ++u)
      (h = sf(x > 0 ? m[u] + " " + p : ee(p, /&\f/g, m[u]))) && (l[_++] = h);
  return ts(e, t, n, i === 0 ? Au : s, l, c, d);
}
function Cg(e, t, n) {
  return ts(e, t, n, af, qo(vg()), Di(e, 2, -2), 0);
}
function d0(e, t, n, r) {
  return ts(e, t, n, ju, Di(e, 0, r), Di(e, r + 1, -1), r);
}
function Lr(e, t) {
  for (var n = "", r = Fu(e), i = 0; i < r; i++)
    n += t(e[i], i, e, t) || "";
  return n;
}
function bg(e, t, n, r) {
  switch (e.type) {
    case dg:
      if (e.children.length) break;
    case cg:
    case ju:
      return e.return = e.return || e.value;
    case af:
      return "";
    case of:
      return e.return = e.value + "{" + Lr(e.children, r) + "}";
    case Au:
      e.value = e.props.join(",");
  }
  return At(n = Lr(e.children, r)) ? e.return = e.value + "{" + n + "}" : "";
}
function Eg(e) {
  var t = Fu(e);
  return function(n, r, i, a) {
    for (var o = "", s = 0; s < t; s++)
      o += e[s](n, r, i, a) || "";
    return o;
  };
}
function Tg(e) {
  return function(t) {
    t.root || (t = t.return) && e(t);
  };
}
function df(e) {
  var t = /* @__PURE__ */ Object.create(null);
  return function(n) {
    return t[n] === void 0 && (t[n] = e(n)), t[n];
  };
}
var Pg = function(t, n, r) {
  for (var i = 0, a = 0; i = a, a = Wt(), i === 38 && a === 12 && (n[r] = 1), !Mi(a); )
    ot();
  return va(t, et);
}, Ng = function(t, n) {
  var r = -1, i = 44;
  do
    switch (Mi(i)) {
      case 0:
        i === 38 && Wt() === 12 && (n[r] = 1), t[r] += Pg(et - 1, n, r);
        break;
      case 2:
        t[r] += Ka(i);
        break;
      case 4:
        if (i === 44) {
          t[++r] = Wt() === 58 ? "&\f" : "", n[r] = t[r].length;
          break;
        }
      default:
        t[r] += qo(i);
    }
  while (i = ot());
  return t;
}, Lg = function(t, n) {
  return cf(Ng(uf(t), n));
}, f0 = /* @__PURE__ */ new WeakMap(), Ig = function(t) {
  if (!(t.type !== "rule" || !t.parent || // positive .length indicates that this rule contains pseudo
  // negative .length indicates that this rule has been already prefixed
  t.length < 1)) {
    for (var n = t.value, r = t.parent, i = t.column === r.column && t.line === r.line; r.type !== "rule"; )
      if (r = r.parent, !r) return;
    if (!(t.props.length === 1 && n.charCodeAt(0) !== 58 && !f0.get(r)) && !i) {
      f0.set(t, !0);
      for (var a = [], o = Lg(n, a), s = r.props, l = 0, c = 0; l < o.length; l++)
        for (var d = 0; d < s.length; d++, c++)
          t.props[c] = a[l] ? o[l].replace(/&\f/g, s[d]) : s[d] + " " + o[l];
    }
  }
}, Rg = function(t) {
  if (t.type === "decl") {
    var n = t.value;
    // charcode for l
    n.charCodeAt(0) === 108 && // charcode for b
    n.charCodeAt(2) === 98 && (t.return = "", t.value = "");
  }
};
function ff(e, t) {
  switch (pg(e, t)) {
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
      return q + e + mo + e + He + e + e;
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
      if (At(e) - 1 - t > 6) switch (Ie(e, t + 1)) {
        case 109:
          if (Ie(e, t + 4) !== 45) break;
        case 102:
          return ee(e, /(.+:)(.+)-([^]+)/, "$1" + q + "$2-$3$1" + mo + (Ie(e, t + 3) == 108 ? "$3" : "$2-$3")) + e;
        case 115:
          return ~kl(e, "stretch") ? ff(ee(e, "stretch", "fill-available"), t) + e : e;
      }
      break;
    case 4949:
      if (Ie(e, t + 1) !== 115) break;
    case 6444:
      switch (Ie(e, At(e) - 3 - (~kl(e, "!important") && 10))) {
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
var Dg = function(t, n, r, i) {
  if (t.length > -1 && !t.return) switch (t.type) {
    case ju:
      t.return = ff(t.value, t.length);
      break;
    case of:
      return Lr([ai(t, {
        value: ee(t.value, "@", "@" + q)
      })], i);
    case Au:
      if (t.length) return mg(t.props, function(a) {
        switch (hg(a, /(::plac\w+|:read-\w+)/)) {
          case ":read-only":
          case ":read-write":
            return Lr([ai(t, {
              props: [ee(a, /:(read-\w+)/, ":" + mo + "$1")]
            })], i);
          case "::placeholder":
            return Lr([ai(t, {
              props: [ee(a, /:(plac\w+)/, ":" + q + "input-$1")]
            }), ai(t, {
              props: [ee(a, /:(plac\w+)/, ":" + mo + "$1")]
            }), ai(t, {
              props: [ee(a, /:(plac\w+)/, He + "input-$1")]
            })], i);
        }
        return "";
      });
  }
}, Mg = [Dg], Og = function(t) {
  var n = t.key;
  if (n === "css") {
    var r = document.querySelectorAll("style[data-emotion]:not([data-s])");
    Array.prototype.forEach.call(r, function(x) {
      var _ = x.getAttribute("data-emotion");
      _.indexOf(" ") !== -1 && (document.head.appendChild(x), x.setAttribute("data-s", ""));
    });
  }
  var i = t.stylisPlugins || Mg, a = {}, o, s = [];
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
  var l, c = [Ig, Rg];
  {
    var d, f = [bg, Tg(function(x) {
      d.insert(x);
    })], m = Eg(c.concat(i, f)), w = function(_) {
      return Lr(Sg(_), m);
    };
    l = function(_, u, p, h) {
      d = p, w(_ ? _ + "{" + u.styles + "}" : u.styles), h && (y.inserted[u.name] = !0);
    };
  }
  var y = {
    key: n,
    sheet: new ug({
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
function Cl() {
  return Cl = Object.assign ? Object.assign.bind() : function(e) {
    for (var t = 1; t < arguments.length; t++) {
      var n = arguments[t];
      for (var r in n) ({}).hasOwnProperty.call(n, r) && (e[r] = n[r]);
    }
    return e;
  }, Cl.apply(null, arguments);
}
var xf = { exports: {} }, ie = {};
var Ne = typeof Symbol == "function" && Symbol.for, zu = Ne ? Symbol.for("react.element") : 60103, Vu = Ne ? Symbol.for("react.portal") : 60106, ns = Ne ? Symbol.for("react.fragment") : 60107, rs = Ne ? Symbol.for("react.strict_mode") : 60108, is = Ne ? Symbol.for("react.profiler") : 60114, as = Ne ? Symbol.for("react.provider") : 60109, os = Ne ? Symbol.for("react.context") : 60110, Wu = Ne ? Symbol.for("react.async_mode") : 60111, ss = Ne ? Symbol.for("react.concurrent_mode") : 60111, ls = Ne ? Symbol.for("react.forward_ref") : 60112, us = Ne ? Symbol.for("react.suspense") : 60113, Hg = Ne ? Symbol.for("react.suspense_list") : 60120, cs = Ne ? Symbol.for("react.memo") : 60115, ds = Ne ? Symbol.for("react.lazy") : 60116, Ag = Ne ? Symbol.for("react.block") : 60121, jg = Ne ? Symbol.for("react.fundamental") : 60117, Fg = Ne ? Symbol.for("react.responder") : 60118, zg = Ne ? Symbol.for("react.scope") : 60119;
function ct(e) {
  if (typeof e == "object" && e !== null) {
    var t = e.$$typeof;
    switch (t) {
      case zu:
        switch (e = e.type, e) {
          case Wu:
          case ss:
          case ns:
          case is:
          case rs:
          case us:
            return e;
          default:
            switch (e = e && e.$$typeof, e) {
              case os:
              case ls:
              case ds:
              case cs:
              case as:
                return e;
              default:
                return t;
            }
        }
      case Vu:
        return t;
    }
  }
}
function pf(e) {
  return ct(e) === ss;
}
ie.AsyncMode = Wu;
ie.ConcurrentMode = ss;
ie.ContextConsumer = os;
ie.ContextProvider = as;
ie.Element = zu;
ie.ForwardRef = ls;
ie.Fragment = ns;
ie.Lazy = ds;
ie.Memo = cs;
ie.Portal = Vu;
ie.Profiler = is;
ie.StrictMode = rs;
ie.Suspense = us;
ie.isAsyncMode = function(e) {
  return pf(e) || ct(e) === Wu;
};
ie.isConcurrentMode = pf;
ie.isContextConsumer = function(e) {
  return ct(e) === os;
};
ie.isContextProvider = function(e) {
  return ct(e) === as;
};
ie.isElement = function(e) {
  return typeof e == "object" && e !== null && e.$$typeof === zu;
};
ie.isForwardRef = function(e) {
  return ct(e) === ls;
};
ie.isFragment = function(e) {
  return ct(e) === ns;
};
ie.isLazy = function(e) {
  return ct(e) === ds;
};
ie.isMemo = function(e) {
  return ct(e) === cs;
};
ie.isPortal = function(e) {
  return ct(e) === Vu;
};
ie.isProfiler = function(e) {
  return ct(e) === is;
};
ie.isStrictMode = function(e) {
  return ct(e) === rs;
};
ie.isSuspense = function(e) {
  return ct(e) === us;
};
ie.isValidElementType = function(e) {
  return typeof e == "string" || typeof e == "function" || e === ns || e === ss || e === is || e === rs || e === us || e === Hg || typeof e == "object" && e !== null && (e.$$typeof === ds || e.$$typeof === cs || e.$$typeof === as || e.$$typeof === os || e.$$typeof === ls || e.$$typeof === jg || e.$$typeof === Fg || e.$$typeof === zg || e.$$typeof === Ag);
};
ie.typeOf = ct;
xf.exports = ie;
var Vg = xf.exports, hf = Vg;
var Wg = {
  $$typeof: !0,
  render: !0,
  defaultProps: !0,
  displayName: !0,
  propTypes: !0
}, Bg = {
  $$typeof: !0,
  compare: !0,
  defaultProps: !0,
  displayName: !0,
  propTypes: !0,
  type: !0
}, mf = {};
mf[hf.ForwardRef] = Wg;
mf[hf.Memo] = Bg;
var H3 = Object.prototype;
var Ug = !0;
function vf(e, t, n) {
  var r = "";
  return n.split(" ").forEach(function(i) {
    e[i] !== void 0 ? t.push(e[i] + ";") : r += i + " ";
  }), r;
}
var Bu = function(t, n, r) {
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
  Ug === !1) && t.registered[i] === void 0 && (t.registered[i] = n.styles);
}, gf = function(t, n, r) {
  Bu(t, n, r);
  var i = t.key + "-" + n.name;
  if (t.inserted[n.name] === void 0) {
    var a = n;
    do
      t.insert(n === a ? "." + i : "", a, t.sheet, !0), a = a.next;
    while (a !== void 0);
  }
};
function Zg(e) {
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
}, Gg = !1, Yg = /[A-Z]|^ms/g, Xg = /_EMO_([^_]+?)_([^]*?)_EMO_/g, yf = function(t) {
  return t.charCodeAt(1) === 45;
}, x0 = function(t) {
  return t != null && typeof t != "boolean";
}, zs = /* @__PURE__ */ df(function(e) {
  return yf(e) ? e : e.replace(Yg, "-$&").toLowerCase();
}), p0 = function(t, n) {
  switch (t) {
    case "animation":
    case "animationName":
      if (typeof n == "string")
        return n.replace(Xg, function(r, i, a) {
          return jt = {
            name: i,
            styles: a,
            next: jt
          }, i;
        });
  }
  return $g[t] !== 1 && !yf(t) && typeof n == "number" && n !== 0 ? n + "px" : n;
}, Qg = "Component selectors can only be used in conjunction with @emotion/babel-plugin, the swc Emotion plugin, or another Emotion-aware compiler transform.";
function Oi(e, t, n) {
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
        return jt = {
          name: i.name,
          styles: i.styles,
          next: jt
        }, i.name;
      var a = n;
      if (a.styles !== void 0) {
        var o = a.next;
        if (o !== void 0)
          for (; o !== void 0; )
            jt = {
              name: o.name,
              styles: o.styles,
              next: jt
            }, o = o.next;
        var s = a.styles + ";";
        return s;
      }
      return Jg(e, t, n);
    }
    case "function": {
      if (e !== void 0) {
        var l = jt, c = n(e);
        return jt = l, Oi(e, t, c);
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
function Jg(e, t, n) {
  var r = "";
  if (Array.isArray(n))
    for (var i = 0; i < n.length; i++)
      r += Oi(e, t, n[i]) + ";";
  else
    for (var a in n) {
      var o = n[a];
      if (typeof o != "object") {
        var s = o;
        t != null && t[s] !== void 0 ? r += a + "{" + t[s] + "}" : x0(s) && (r += zs(a) + ":" + p0(a, s) + ";");
      } else {
        if (a === "NO_COMPONENT_SELECTOR" && Gg)
          throw new Error(Qg);
        if (Array.isArray(o) && typeof o[0] == "string" && (t == null || t[o[0]] === void 0))
          for (var l = 0; l < o.length; l++)
            x0(o[l]) && (r += zs(a) + ":" + p0(a, o[l]) + ";");
        else {
          var c = Oi(e, t, o);
          switch (a) {
            case "animation":
            case "animationName": {
              r += zs(a) + ":" + c + ";";
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
var h0 = /label:\s*([^\s;\n{]+)\s*(;|$)/g, jt;
function wf(e, t, n) {
  if (e.length === 1 && typeof e[0] == "object" && e[0] !== null && e[0].styles !== void 0)
    return e[0];
  var r = !0, i = "";
  jt = void 0;
  var a = e[0];
  if (a == null || a.raw === void 0)
    r = !1, i += Oi(n, t, a);
  else {
    var o = a;
    i += o[0];
  }
  for (var s = 1; s < e.length; s++)
    if (i += Oi(n, t, e[s]), r) {
      var l = a;
      i += l[s];
    }
  h0.lastIndex = 0;
  for (var c = "", d; (d = h0.exec(i)) !== null; )
    c += "-" + d[1];
  var f = Zg(i) + c;
  return {
    name: f,
    styles: i,
    next: jt
  };
}
var Kg = function(t) {
  return t();
}, _f = $c.useInsertionEffect ? $c.useInsertionEffect : !1, kf = _f || Kg, A3 = _f || ae.useLayoutEffect, qg = !1, e2 = /* @__PURE__ */ ae.createContext(
  // we're doing this to avoid preconstruct's dead code elimination in this one case
  // because this module is primarily intended for the browser and node
  // but it's also required in react native and similar environments sometimes
  // and we could have a special build just for that
  // but this is much easier and the native packages
  // might use a different theme context in the future anyway
  typeof HTMLElement < "u" ? /* @__PURE__ */ Og({
    key: "css"
  }) : null
), Sf = function(t) {
  return /* @__PURE__ */ ae.forwardRef(function(n, r) {
    var i = ae.useContext(e2);
    return t(n, i, r);
  });
}, Cf = /* @__PURE__ */ ae.createContext({}), fs = {}.hasOwnProperty, bl = "__EMOTION_TYPE_PLEASE_DO_NOT_USE__", bf = function(t, n) {
  var r = {};
  for (var i in n)
    fs.call(n, i) && (r[i] = n[i]);
  return r[bl] = t, r;
}, t2 = function(t) {
  var n = t.cache, r = t.serialized, i = t.isStringTag;
  return Bu(n, r, i), kf(function() {
    return gf(n, r, i);
  }), null;
}, n2 = /* @__PURE__ */ Sf(
  /* <any, any> */
  function(e, t, n) {
    var r = e.css;
    typeof r == "string" && t.registered[r] !== void 0 && (r = t.registered[r]);
    var i = e[bl], a = [r], o = "";
    typeof e.className == "string" ? o = vf(t.registered, a, e.className) : e.className != null && (o = e.className + " ");
    var s = wf(a, void 0, ae.useContext(Cf));
    o += t.key + "-" + s.name;
    var l = {};
    for (var c in e)
      fs.call(e, c) && c !== "css" && c !== bl && !qg && (l[c] = e[c]);
    return l.className = o, n && (l.ref = n), /* @__PURE__ */ ae.createElement(ae.Fragment, null, /* @__PURE__ */ ae.createElement(t2, {
      cache: t,
      serialized: s,
      isStringTag: typeof i == "string"
    }), /* @__PURE__ */ ae.createElement(i, l));
  }
), Ef = n2;
function Z(e, t, n) {
  return fs.call(t, "css") ? Vt.jsx(Ef, bf(e, t), n) : Vt.jsx(e, t, n);
}
function Hi(e, t, n) {
  return fs.call(t, "css") ? Vt.jsxs(Ef, bf(e, t), n) : Vt.jsxs(e, t, n);
}
var r2 = /^((children|dangerouslySetInnerHTML|key|ref|autoFocus|defaultValue|defaultChecked|innerHTML|suppressContentEditableWarning|suppressHydrationWarning|valueLink|abbr|accept|acceptCharset|accessKey|action|allow|allowUserMedia|allowPaymentRequest|allowFullScreen|allowTransparency|alt|async|autoComplete|autoPlay|capture|cellPadding|cellSpacing|challenge|charSet|checked|cite|classID|className|cols|colSpan|content|contentEditable|contextMenu|controls|controlsList|coords|crossOrigin|data|dateTime|decoding|default|defer|dir|disabled|disablePictureInPicture|disableRemotePlayback|download|draggable|encType|enterKeyHint|form|formAction|formEncType|formMethod|formNoValidate|formTarget|frameBorder|headers|height|hidden|high|href|hrefLang|htmlFor|httpEquiv|id|inputMode|integrity|is|keyParams|keyType|kind|label|lang|list|loading|loop|low|marginHeight|marginWidth|max|maxLength|media|mediaGroup|method|min|minLength|multiple|muted|name|nonce|noValidate|open|optimum|pattern|placeholder|playsInline|poster|preload|profile|radioGroup|readOnly|referrerPolicy|rel|required|reversed|role|rows|rowSpan|sandbox|scope|scoped|scrolling|seamless|selected|shape|size|sizes|slot|span|spellCheck|src|srcDoc|srcLang|srcSet|start|step|style|summary|tabIndex|target|title|translate|type|useMap|value|width|wmode|wrap|about|datatype|inlist|prefix|property|resource|typeof|vocab|autoCapitalize|autoCorrect|autoSave|color|incremental|fallback|inert|itemProp|itemScope|itemType|itemID|itemRef|on|option|results|security|unselectable|accentHeight|accumulate|additive|alignmentBaseline|allowReorder|alphabetic|amplitude|arabicForm|ascent|attributeName|attributeType|autoReverse|azimuth|baseFrequency|baselineShift|baseProfile|bbox|begin|bias|by|calcMode|capHeight|clip|clipPathUnits|clipPath|clipRule|colorInterpolation|colorInterpolationFilters|colorProfile|colorRendering|contentScriptType|contentStyleType|cursor|cx|cy|d|decelerate|descent|diffuseConstant|direction|display|divisor|dominantBaseline|dur|dx|dy|edgeMode|elevation|enableBackground|end|exponent|externalResourcesRequired|fill|fillOpacity|fillRule|filter|filterRes|filterUnits|floodColor|floodOpacity|focusable|fontFamily|fontSize|fontSizeAdjust|fontStretch|fontStyle|fontVariant|fontWeight|format|from|fr|fx|fy|g1|g2|glyphName|glyphOrientationHorizontal|glyphOrientationVertical|glyphRef|gradientTransform|gradientUnits|hanging|horizAdvX|horizOriginX|ideographic|imageRendering|in|in2|intercept|k|k1|k2|k3|k4|kernelMatrix|kernelUnitLength|kerning|keyPoints|keySplines|keyTimes|lengthAdjust|letterSpacing|lightingColor|limitingConeAngle|local|markerEnd|markerMid|markerStart|markerHeight|markerUnits|markerWidth|mask|maskContentUnits|maskUnits|mathematical|mode|numOctaves|offset|opacity|operator|order|orient|orientation|origin|overflow|overlinePosition|overlineThickness|panose1|paintOrder|pathLength|patternContentUnits|patternTransform|patternUnits|pointerEvents|points|pointsAtX|pointsAtY|pointsAtZ|preserveAlpha|preserveAspectRatio|primitiveUnits|r|radius|refX|refY|renderingIntent|repeatCount|repeatDur|requiredExtensions|requiredFeatures|restart|result|rotate|rx|ry|scale|seed|shapeRendering|slope|spacing|specularConstant|specularExponent|speed|spreadMethod|startOffset|stdDeviation|stemh|stemv|stitchTiles|stopColor|stopOpacity|strikethroughPosition|strikethroughThickness|string|stroke|strokeDasharray|strokeDashoffset|strokeLinecap|strokeLinejoin|strokeMiterlimit|strokeOpacity|strokeWidth|surfaceScale|systemLanguage|tableValues|targetX|targetY|textAnchor|textDecoration|textRendering|textLength|to|transform|u1|u2|underlinePosition|underlineThickness|unicode|unicodeBidi|unicodeRange|unitsPerEm|vAlphabetic|vHanging|vIdeographic|vMathematical|values|vectorEffect|version|vertAdvY|vertOriginX|vertOriginY|viewBox|viewTarget|visibility|widths|wordSpacing|writingMode|x|xHeight|x1|x2|xChannelSelector|xlinkActuate|xlinkArcrole|xlinkHref|xlinkRole|xlinkShow|xlinkTitle|xlinkType|xmlBase|xmlns|xmlnsXlink|xmlLang|xmlSpace|y|y1|y2|yChannelSelector|z|zoomAndPan|for|class|autofocus)|(([Dd][Aa][Tt][Aa]|[Aa][Rr][Ii][Aa]|x)-.*))$/, i2 = /* @__PURE__ */ df(
  function(e) {
    return r2.test(e) || e.charCodeAt(0) === 111 && e.charCodeAt(1) === 110 && e.charCodeAt(2) < 91;
  }
  /* Z+1 */
), a2 = i2, o2 = function(t) {
  return t !== "theme";
}, m0 = function(t) {
  return typeof t == "string" && // 96 is one less than the char code
  // for "a" so this is checking that
  // it's a lowercase character
  t.charCodeAt(0) > 96 ? a2 : o2;
}, v0 = function(t, n, r) {
  var i;
  if (n) {
    var a = n.shouldForwardProp;
    i = t.__emotion_forwardProp && a ? function(o) {
      return t.__emotion_forwardProp(o) && a(o);
    } : a;
  }
  return typeof i != "function" && r && (i = t.__emotion_forwardProp), i;
}, s2 = !1, l2 = function(t) {
  var n = t.cache, r = t.serialized, i = t.isStringTag;
  return Bu(n, r, i), kf(function() {
    return gf(n, r, i);
  }), null;
}, u2 = function e(t, n) {
  var r = t.__emotion_real === t, i = r && t.__emotion_base || t, a, o;
  n !== void 0 && (a = n.label, o = n.target);
  var s = v0(t, n, r), l = s || m0(i), c = !l("as");
  return function() {
    var d = arguments, f = r && t.__emotion_styles !== void 0 ? t.__emotion_styles.slice(0) : [];
    if (a !== void 0 && f.push("label:" + a + ";"), d[0] == null || d[0].raw === void 0)
      f.push.apply(f, d);
    else {
      f.push(d[0][0]);
      for (var m = d.length, w = 1; w < m; w++)
        f.push(d[w], d[0][w]);
    }
    var y = Sf(function(x, _, u) {
      var p = c && x.as || i, h = "", g = [], k = x;
      if (x.theme == null) {
        k = {};
        for (var C in x)
          k[C] = x[C];
        k.theme = ae.useContext(Cf);
      }
      typeof x.className == "string" ? h = vf(_.registered, g, x.className) : x.className != null && (h = x.className + " ");
      var S = wf(f.concat(g), _.registered, k);
      h += _.key + "-" + S.name, o !== void 0 && (h += " " + o);
      var L = c && s === void 0 ? m0(p) : l, O = {};
      for (var T in x)
        c && T === "as" || L(T) && (O[T] = x[T]);
      return O.className = h, u && (O.ref = u), /* @__PURE__ */ ae.createElement(ae.Fragment, null, /* @__PURE__ */ ae.createElement(l2, {
        cache: _,
        serialized: S,
        isStringTag: typeof p == "string"
      }), /* @__PURE__ */ ae.createElement(p, O));
    });
    return y.displayName = a !== void 0 ? a : "Styled(" + (typeof i == "string" ? i : i.displayName || i.name || "Component") + ")", y.defaultProps = t.defaultProps, y.__emotion_real = y, y.__emotion_base = i, y.__emotion_styles = f, y.__emotion_forwardProp = s, Object.defineProperty(y, "toString", {
      value: function() {
        return o === void 0 && s2 ? "NO_COMPONENT_SELECTOR" : "." + o;
      }
    }), y.withComponent = function(x, _) {
      return e(x, Cl({}, n, _, {
        shouldForwardProp: v0(y, _, !0)
      })).apply(void 0, f);
    }, y;
  };
}, c2 = [
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
], Jn = u2.bind();
c2.forEach(function(e) {
  Jn[e] = Jn(e);
});
const d2 = "https://prosopo.io/?ref=prosopo.io&amp;utm_campaign=widget&amp;utm_medium=checkbox#features", f2 = "Visit prosopo.io to learn more about the service and its accessibility options.", x2 = 74, Tf = 80, p2 = {
  maxWidth: "400px",
  minWidth: "200px",
  minHeight: `${Tf}px`
}, h2 = "8px", m2 = "2px", v2 = "1px solid", g2 = Jn.div`
    container-type: inline-size;
`, y2 = Jn.div`
    max-width: 100%;
    max-height: 100%;
    overflow: hidden;
    height: ${Tf}px;
    @container (max-width: 243px) {
        #logo-without-text {
            display: none;
        }

        #logo-with-text {
            display: none;
        }
    }
    @container (min-width: 244px) and (max-width: 339px) {
        #logo-without-text {
            display: inherit;
        }

        #logo-with-text {
            display: none;
        }
    }
    @container (min-width: 340px) {
        #logo-without-text {
            display: none;
        }

        #logo-with-text {
            display: inherit;
        }
    }
`, Pf = {
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
}, vo = 10, Nf = {
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
    grey: Pf
  },
  spacing: {
    unit: vo,
    half: Math.floor(vo / 2)
  }
}, Lf = {
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
    grey: Pf
  },
  spacing: {
    unit: vo,
    half: Math.floor(vo / 2)
  }
}, w2 = ({ themeColor: e }) => {
  const t = ae.useMemo(() => e === "light" ? Nf : Lf, [e]), n = Jn.div`
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
  return Z(n, {});
}, _2 = ({ themeColor: e }) => {
  const t = ae.useMemo(() => e === "light" ? "#1d1d1b" : "#fff", [e]);
  return Hi("svg", { className: "logo", id: "logo-with-text", xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 2062.63 468.67", height: "35px", width: "140px", style: { fill: t }, "aria-label": "Prosopo Logo With Text", children: [Z("title", { children: "Prosopo Logo With Text" }), Z("path", { d: "M335.55,1825.19A147.75,147.75,0,0,1,483.3,1972.94h50.5c0-109.49-88.76-198.25-198.25-198.25v50.5Z", transform: "translate(-215.73 -1774.69)" }), Z("path", { d: "M269.36,1891.39A147.74,147.74,0,0,1,417.1,2039.13h50.5c0-109.49-88.75-198.24-198.24-198.24v50.5Z", transform: "translate(-215.73 -1774.69)" }), Z("path", { d: "M414,2157.17a147.75,147.75,0,0,1-147.74-147.74h-50.5c0,109.49,88.75,198.24,198.24,198.24v-50.5Z", transform: "translate(-215.73 -1774.69)" }), Z("path", { d: "M480.17,2091a147.74,147.74,0,0,1-147.74-147.75H281.92c0,109.49,88.76,198.25,198.25,198.25V2091Z", transform: "translate(-215.73 -1774.69)" }), Z("path", { d: "M862.8,2017.5q-27.39,22.86-78.25,22.86h-65v112.19H654.82v-312h134q46.32,0,73.86,24.13t27.55,74.72Q890.2,1994.64,862.8,2017.5ZM813,1905.1q-12.37-10.36-34.7-10.38H719.59v91.87h58.75q22.32,0,34.7-11.22t12.39-35.56Q825.43,1915.48,813,1905.1Z", transform: "translate(-215.73 -1774.69)" }), Z("path", { d: "M1045.69,1916.42c.78.08,2.51.19,5.19.32v61.81c-3.81-.42-7.2-.71-10.16-.85s-5.36-.21-7.2-.21q-36.4,0-48.89,23.71-7,13.33-7,41.06v110.29H916.89V1921.82h57.58V1962q14-23.07,24.34-31.54,16.94-14.18,44-14.18C1044,1916.32,1044.92,1916.35,1045.69,1916.42Z", transform: "translate(-215.73 -1774.69)" }), Z("path", { d: "M1265.64,2124.32q-29.21,36.06-88.69,36.06t-88.69-36.06Q1059,2088.26,1059,2037.5q0-49.9,29.22-86.5t88.69-36.59q59.47,0,88.69,36.59t29.21,86.5Q1294.85,2088.26,1265.64,2124.32ZM1217.38,2091q14.17-18.81,14.18-53.48t-14.18-53.37q-14.19-18.7-40.64-18.71T1136,1984.13q-14.29,18.72-14.29,53.37T1136,2091q14.28,18.81,40.75,18.81T1217.38,2091Z", transform: "translate(-215.73 -1774.69)" }), Z("path", { d: "M1371.81,2078.88q1.92,16.1,8.29,22.87,11.28,12.06,41.7,12.06,17.85,0,28.39-5.29t10.53-15.88a17.12,17.12,0,0,0-8.48-15.45q-8.49-5.28-63.12-18.2-39.33-9.73-55.41-24.35-16.08-14.39-16.09-41.49,0-32,25.14-54.93t70.75-23q43.26,0,70.53,17.25t31.29,59.59H1455q-1.27-11.64-6.58-18.42-10-12.27-34-12.28-19.74,0-28.13,6.14t-8.38,14.4c0,6.91,3,11.93,8.92,15q8.89,4.89,63,16.73,36,8.46,54.05,25.61,17.77,17.35,17.78,43.39,0,34.3-25.56,56t-79,21.7q-54.51,0-80.49-23t-26-58.53Z", transform: "translate(-215.73 -1774.69)" }), Z("path", { d: "M1745.54,2124.32q-29.22,36.06-88.7,36.06t-88.69-36.06q-29.2-36.06-29.21-86.82,0-49.9,29.21-86.5t88.69-36.59q59.49,0,88.7,36.59t29.21,86.5Q1774.75,2088.26,1745.54,2124.32ZM1697.27,2091q14.19-18.81,14.19-53.48t-14.19-53.37q-14.18-18.7-40.64-18.71t-40.75,18.71q-14.28,18.72-14.28,53.37t14.28,53.48q14.3,18.81,40.75,18.81T1697.27,2091Z", transform: "translate(-215.73 -1774.69)" }), Z("path", { d: "M1992.75,1946.59q28.24,29.84,28.23,87.63,0,61-27.58,92.93t-71.06,32q-27.69,0-46-13.76-10-7.62-19.6-22.23v120.24H1797V1921.82h57.79v34.08q9.79-15,20.88-23.71,20.23-15.43,48.15-15.45Q1964.53,1916.74,1992.75,1946.59Zm-46.3,43.39q-12.3-20.52-39.88-20.53-33.15,0-45.54,31.11-6.43,16.51-6.42,41.92,0,40.21,21.58,56.51,12.82,9.53,30.37,9.53,25.45,0,38.83-19.48t13.36-51.86Q1958.75,2010.51,1946.45,1990Z", transform: "translate(-215.73 -1774.69)" }), Z("path", { d: "M2249.14,2124.32q-29.2,36.06-88.69,36.06t-88.69-36.06q-29.22-36.06-29.21-86.82,0-49.9,29.21-86.5t88.69-36.59q59.49,0,88.69,36.59t29.22,86.5Q2278.36,2088.26,2249.14,2124.32ZM2200.88,2091q14.19-18.81,14.18-53.48t-14.18-53.37q-14.18-18.7-40.64-18.71t-40.75,18.71q-14.28,18.72-14.29,53.37t14.29,53.48q14.3,18.81,40.75,18.81T2200.88,2091Z", transform: "translate(-215.73 -1774.69)" })] });
}, k2 = ({ themeColor: e }) => {
  const t = ae.useMemo(() => e === "light" ? "#1d1d1b" : "#fff", [e]);
  return Hi("svg", { className: "logo", id: "logo-without-text", xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 260 348", height: "35px", style: { fill: t }, "aria-label": "Prosopo Logo Without Text", children: [Z("title", { children: "Prosopo Logo Without Text" }), Z("path", { d: "M95.7053 40.2707C127.005 40.2707 157.022 52.6841 179.154 74.78C201.286 96.8759 213.719 126.844 213.719 158.093H254.056C254.056 70.7808 183.16 -4.57764e-05 95.7053 -4.57764e-05V40.2707Z" }), Z("path", { d: "M42.8365 93.0614C58.3333 93.0614 73.6784 96.1087 87.9955 102.029C102.313 107.95 115.322 116.628 126.279 127.568C137.237 138.508 145.93 151.496 151.86 165.79C157.79 180.084 160.843 195.404 160.843 210.875H201.179C201.179 123.564 130.291 52.7906 42.8365 52.7906V93.0614Z" }), Z("path", { d: "M158.367 305.005C127.07 305.003 97.056 292.59 74.926 270.496C52.796 248.402 40.3626 218.437 40.3604 187.191H0.0239563C0.0239563 274.503 70.9123 345.276 158.367 345.276V305.005Z" }), Z("path", { d: "M211.219 252.239C195.722 252.239 180.376 249.191 166.059 243.27C151.741 237.349 138.732 228.67 127.774 217.729C116.816 206.788 108.123 193.799 102.194 179.505C96.2637 165.21 93.2121 149.889 93.2132 134.417H52.8687C52.8687 221.729 123.765 292.509 211.219 292.509V252.239Z" })] });
}, S2 = Jn.div`
    padding: 8px;
    flex: 1 1 0;
`, C2 = Jn.div`
    padding: 8px;
`, b2 = ({ themeColor: e }) => Z(S2, { children: Hi(C2, { children: [Z(k2, { themeColor: e }), Z(_2, { themeColor: e })] }) }), Uu = (e) => {
  const t = e.darkMode === "light" ? "light" : "dark", n = e.darkMode === "light" ? Nf : Lf;
  return Z("div", { children: Z("div", { style: { maxWidth: "100%", maxHeight: "100%", overflowX: "auto" }, children: Z(g2, { children: Z(y2, { children: Hi("div", { style: p2, "data-cy": "button-human", children: [" ", Hi("div", { style: {
    padding: m2,
    border: v2,
    backgroundColor: n.palette.background.default,
    borderColor: n.palette.grey[300],
    borderRadius: h2,
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    justifyContent: "space-between",
    minHeight: `${x2}px`,
    overflow: "hidden"
  }, children: [Z("div", { style: { display: "flex", flexDirection: "column" }, children: Z("div", { style: {
    alignItems: "center",
    flex: 1
  }, children: Z("div", { style: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
    verticalAlign: "middle"
  }, children: Z("div", { style: {
    display: "flex"
  }, children: Z("div", { style: { display: "inline-flex" }, children: Z(w2, { themeColor: t, "aria-label": "Loading spinner" }) }) }) }) }) }), Z("div", { style: { display: "inline-flex", flexDirection: "column" }, children: Z("a", { href: d2, target: "_blank", "aria-label": f2, rel: "noreferrer", children: Z("div", { style: { flex: 1 }, children: Z(b2, { themeColor: t, "aria-label": "Prosopo logo" }) }) }) })] })] }) }) }) }) });
}, go = new Array(256), If = new Array(256 * 256);
for (let e = 0; e < 256; e++)
  go[e] = e.toString(16).padStart(2, "0");
for (let e = 0; e < 256; e++) {
  const t = e << 8;
  for (let n = 0; n < 256; n++)
    If[t | n] = go[e] + go[n];
}
function Vs(e, t) {
  const n = e.length % 2 | 0, r = e.length - n | 0;
  for (let i = 0; i < r; i += 2)
    t += If[e[i] << 8 | e[i + 1]];
  return n && (t += go[e[r] | 0]), t;
}
function E2(e, t = -1, n = !0) {
  const r = n ? "0x" : "";
  if (e != null && e.length) {
    if (t > 0) {
      const i = Math.ceil(t / 8);
      if (e.length > i)
        return `${Vs(e.subarray(0, i / 2), r)}…${Vs(e.subarray(e.length - i / 2), "")}`;
    }
  } else return r;
  return Vs(e, r);
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
var El;
(function(e) {
  e.mergeShapes = (t, n) => ({
    ...t,
    ...n
    // second overwrites first
  });
})(El || (El = {}));
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
]), pn = (e) => {
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
]), T2 = (e) => JSON.stringify(e, null, 2).replace(/"([^"]+)":/g, "$1:");
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
let Rf = Fr;
function P2(e) {
  Rf = e;
}
function yo() {
  return Rf;
}
const wo = (e) => {
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
}, N2 = [];
function P(e, t) {
  const n = yo(), r = wo({
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
        return z;
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
        return z;
      a.status === "dirty" && t.dirty(), o.status === "dirty" && t.dirty(), a.value !== "__proto__" && (typeof o.value < "u" || i.alwaysSet) && (r[a.value] = o.value);
    }
    return { status: t.value, value: r };
  }
}
const z = Object.freeze({
  status: "aborted"
}), hr = (e) => ({ status: "dirty", value: e }), Ue = (e) => ({ status: "valid", value: e }), Tl = (e) => e.status === "aborted", Pl = (e) => e.status === "dirty", Ai = (e) => e.status === "valid", ji = (e) => typeof Promise < "u" && e instanceof Promise;
function _o(e, t, n, r) {
  if (typeof t == "function" ? e !== t || !r : !t.has(e)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
  return t.get(e);
}
function Df(e, t, n, r, i) {
  if (typeof t == "function" ? e !== t || !i : !t.has(e)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
  return t.set(e, n), n;
}
var H;
(function(e) {
  e.errToObj = (t) => typeof t == "string" ? { message: t } : t || {}, e.toString = (t) => typeof t == "string" ? t : t == null ? void 0 : t.message;
})(H || (H = {}));
var pi, hi;
class $t {
  constructor(t, n, r, i) {
    this._cachedPath = [], this.parent = t, this.data = n, this._path = r, this._key = i;
  }
  get path() {
    return this._cachedPath.length || (this._key instanceof Array ? this._cachedPath.push(...this._path, ...this._key) : this._cachedPath.push(...this._path, this._key)), this._cachedPath;
  }
}
const g0 = (e, t) => {
  if (Ai(t))
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
    return pn(t.data);
  }
  _getOrReturnCtx(t, n) {
    return n || {
      common: t.parent.common,
      data: t.data,
      parsedType: pn(t.data),
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
        parsedType: pn(t.data),
        schemaErrorMap: this._def.errorMap,
        path: t.path,
        parent: t.parent
      }
    };
  }
  _parseSync(t) {
    const n = this._parse(t);
    if (ji(n))
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
      parsedType: pn(t)
    }, a = this._parseSync({ data: t, path: i.path, parent: i });
    return g0(i, a);
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
      parsedType: pn(t)
    }, i = this._parse({ data: t, path: r.path, parent: r }), a = await (ji(i) ? i : Promise.resolve(i));
    return g0(r, a);
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
    return Bt.create(this, this._def);
  }
  nullable() {
    return In.create(this, this._def);
  }
  nullish() {
    return this.nullable().optional();
  }
  array() {
    return Nt.create(this, this._def);
  }
  promise() {
    return Vr.create(this, this._def);
  }
  or(t) {
    return Wi.create([this, t], this._def);
  }
  and(t) {
    return Bi.create(this, t, this._def);
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
    return new Yi({
      ...B(this._def),
      innerType: this,
      defaultValue: n,
      typeName: j.ZodDefault
    });
  }
  brand() {
    return new Zu({
      typeName: j.ZodBranded,
      type: this,
      ...B(this._def)
    });
  }
  catch(t) {
    const n = typeof t == "function" ? t : () => t;
    return new Xi({
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
    return ga.create(this, t);
  }
  readonly() {
    return Qi.create(this);
  }
  isOptional() {
    return this.safeParse(void 0).success;
  }
  isNullable() {
    return this.safeParse(null).success;
  }
}
const L2 = /^c[^\s-]{8,}$/i, I2 = /^[0-9a-z]+$/, R2 = /^[0-9A-HJKMNP-TV-Z]{26}$/, D2 = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i, M2 = /^[a-z0-9_-]{21}$/i, O2 = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/, H2 = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i, A2 = "^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$";
let Ws;
const j2 = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/, F2 = /^(([a-f0-9]{1,4}:){7}|::([a-f0-9]{1,4}:){0,6}|([a-f0-9]{1,4}:){1}:([a-f0-9]{1,4}:){0,5}|([a-f0-9]{1,4}:){2}:([a-f0-9]{1,4}:){0,4}|([a-f0-9]{1,4}:){3}:([a-f0-9]{1,4}:){0,3}|([a-f0-9]{1,4}:){4}:([a-f0-9]{1,4}:){0,2}|([a-f0-9]{1,4}:){5}:([a-f0-9]{1,4}:){0,1})([a-f0-9]{1,4}|(((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2}))\.){3}((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2})))$/, z2 = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/, Mf = "((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))", V2 = new RegExp(`^${Mf}$`);
function Of(e) {
  let t = "([01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d";
  return e.precision ? t = `${t}\\.\\d{${e.precision}}` : e.precision == null && (t = `${t}(\\.\\d+)?`), t;
}
function W2(e) {
  return new RegExp(`^${Of(e)}$`);
}
function Hf(e) {
  let t = `${Mf}T${Of(e)}`;
  const n = [];
  return n.push(e.local ? "Z?" : "Z"), e.offset && n.push("([+-]\\d{2}:?\\d{2})"), t = `${t}(${n.join("|")})`, new RegExp(`^${t}$`);
}
function B2(e, t) {
  return !!((t === "v4" || !t) && j2.test(e) || (t === "v6" || !t) && F2.test(e));
}
class Pt extends G {
  _parse(t) {
    if (this._def.coerce && (t.data = String(t.data)), this._getType(t) !== N.string) {
      const a = this._getOrReturnCtx(t);
      return P(a, {
        code: E.invalid_type,
        expected: N.string,
        received: a.parsedType
      }), z;
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
        H2.test(t.data) || (i = this._getOrReturnCtx(t, i), P(i, {
          validation: "email",
          code: E.invalid_string,
          message: a.message
        }), r.dirty());
      else if (a.kind === "emoji")
        Ws || (Ws = new RegExp(A2, "u")), Ws.test(t.data) || (i = this._getOrReturnCtx(t, i), P(i, {
          validation: "emoji",
          code: E.invalid_string,
          message: a.message
        }), r.dirty());
      else if (a.kind === "uuid")
        D2.test(t.data) || (i = this._getOrReturnCtx(t, i), P(i, {
          validation: "uuid",
          code: E.invalid_string,
          message: a.message
        }), r.dirty());
      else if (a.kind === "nanoid")
        M2.test(t.data) || (i = this._getOrReturnCtx(t, i), P(i, {
          validation: "nanoid",
          code: E.invalid_string,
          message: a.message
        }), r.dirty());
      else if (a.kind === "cuid")
        L2.test(t.data) || (i = this._getOrReturnCtx(t, i), P(i, {
          validation: "cuid",
          code: E.invalid_string,
          message: a.message
        }), r.dirty());
      else if (a.kind === "cuid2")
        I2.test(t.data) || (i = this._getOrReturnCtx(t, i), P(i, {
          validation: "cuid2",
          code: E.invalid_string,
          message: a.message
        }), r.dirty());
      else if (a.kind === "ulid")
        R2.test(t.data) || (i = this._getOrReturnCtx(t, i), P(i, {
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
      }), r.dirty()) : a.kind === "datetime" ? Hf(a).test(t.data) || (i = this._getOrReturnCtx(t, i), P(i, {
        code: E.invalid_string,
        validation: "datetime",
        message: a.message
      }), r.dirty()) : a.kind === "date" ? V2.test(t.data) || (i = this._getOrReturnCtx(t, i), P(i, {
        code: E.invalid_string,
        validation: "date",
        message: a.message
      }), r.dirty()) : a.kind === "time" ? W2(a).test(t.data) || (i = this._getOrReturnCtx(t, i), P(i, {
        code: E.invalid_string,
        validation: "time",
        message: a.message
      }), r.dirty()) : a.kind === "duration" ? O2.test(t.data) || (i = this._getOrReturnCtx(t, i), P(i, {
        validation: "duration",
        code: E.invalid_string,
        message: a.message
      }), r.dirty()) : a.kind === "ip" ? B2(t.data, a.version) || (i = this._getOrReturnCtx(t, i), P(i, {
        validation: "ip",
        code: E.invalid_string,
        message: a.message
      }), r.dirty()) : a.kind === "base64" ? z2.test(t.data) || (i = this._getOrReturnCtx(t, i), P(i, {
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
function U2(e, t) {
  const n = (e.toString().split(".")[1] || "").length, r = (t.toString().split(".")[1] || "").length, i = n > r ? n : r, a = parseInt(e.toFixed(i).replace(".", "")), o = parseInt(t.toFixed(i).replace(".", ""));
  return a % o / Math.pow(10, i);
}
class Pn extends G {
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
      }), z;
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
      }), i.dirty()) : a.kind === "multipleOf" ? U2(t.data, a.value) !== 0 && (r = this._getOrReturnCtx(t, r), P(r, {
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
    return new Pn({
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
    return new Pn({
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
Pn.create = (e) => new Pn({
  checks: [],
  typeName: j.ZodNumber,
  coerce: (e == null ? void 0 : e.coerce) || !1,
  ...B(e)
});
class Nn extends G {
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
      }), z;
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
    return new Nn({
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
    return new Nn({
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
Nn.create = (e) => {
  var t;
  return new Nn({
    checks: [],
    typeName: j.ZodBigInt,
    coerce: (t = e == null ? void 0 : e.coerce) !== null && t !== void 0 ? t : !1,
    ...B(e)
  });
};
class Fi extends G {
  _parse(t) {
    if (this._def.coerce && (t.data = !!t.data), this._getType(t) !== N.boolean) {
      const r = this._getOrReturnCtx(t);
      return P(r, {
        code: E.invalid_type,
        expected: N.boolean,
        received: r.parsedType
      }), z;
    }
    return Ue(t.data);
  }
}
Fi.create = (e) => new Fi({
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
      }), z;
    }
    if (isNaN(t.data.getTime())) {
      const a = this._getOrReturnCtx(t);
      return P(a, {
        code: E.invalid_date
      }), z;
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
class ko extends G {
  _parse(t) {
    if (this._getType(t) !== N.symbol) {
      const r = this._getOrReturnCtx(t);
      return P(r, {
        code: E.invalid_type,
        expected: N.symbol,
        received: r.parsedType
      }), z;
    }
    return Ue(t.data);
  }
}
ko.create = (e) => new ko({
  typeName: j.ZodSymbol,
  ...B(e)
});
class zi extends G {
  _parse(t) {
    if (this._getType(t) !== N.undefined) {
      const r = this._getOrReturnCtx(t);
      return P(r, {
        code: E.invalid_type,
        expected: N.undefined,
        received: r.parsedType
      }), z;
    }
    return Ue(t.data);
  }
}
zi.create = (e) => new zi({
  typeName: j.ZodUndefined,
  ...B(e)
});
class Vi extends G {
  _parse(t) {
    if (this._getType(t) !== N.null) {
      const r = this._getOrReturnCtx(t);
      return P(r, {
        code: E.invalid_type,
        expected: N.null,
        received: r.parsedType
      }), z;
    }
    return Ue(t.data);
  }
}
Vi.create = (e) => new Vi({
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
class rn extends G {
  _parse(t) {
    const n = this._getOrReturnCtx(t);
    return P(n, {
      code: E.invalid_type,
      expected: N.never,
      received: n.parsedType
    }), z;
  }
}
rn.create = (e) => new rn({
  typeName: j.ZodNever,
  ...B(e)
});
class So extends G {
  _parse(t) {
    if (this._getType(t) !== N.undefined) {
      const r = this._getOrReturnCtx(t);
      return P(r, {
        code: E.invalid_type,
        expected: N.void,
        received: r.parsedType
      }), z;
    }
    return Ue(t.data);
  }
}
So.create = (e) => new So({
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
      }), z;
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
      return Promise.all([...n.data].map((o, s) => i.type._parseAsync(new $t(n, o, n.path, s)))).then((o) => Fe.mergeArray(r, o));
    const a = [...n.data].map((o, s) => i.type._parseSync(new $t(n, o, n.path, s)));
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
      t[n] = Bt.create(pr(r));
    }
    return new pe({
      ...e._def,
      shape: () => t
    });
  } else return e instanceof Nt ? new Nt({
    ...e._def,
    type: pr(e.element)
  }) : e instanceof Bt ? Bt.create(pr(e.unwrap())) : e instanceof In ? In.create(pr(e.unwrap())) : e instanceof Gt ? Gt.create(e.items.map((t) => pr(t))) : e;
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
      }), z;
    }
    const { status: r, ctx: i } = this._processInputParams(t), { shape: a, keys: o } = this._getCached(), s = [];
    if (!(this._def.catchall instanceof rn && this._def.unknownKeys === "strip"))
      for (const c in i.data)
        o.includes(c) || s.push(c);
    const l = [];
    for (const c of o) {
      const d = a[c], f = i.data[c];
      l.push({
        key: { status: "valid", value: c },
        value: d._parse(new $t(i, f, i.path, c)),
        alwaysSet: c in i.data
      });
    }
    if (this._def.catchall instanceof rn) {
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
            new $t(i, f, i.path, d)
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
        for (; a instanceof Bt; )
          a = a._def.innerType;
        n[r] = a;
      }
    }), new pe({
      ...this._def,
      shape: () => n
    });
  }
  keyof() {
    return Af(Q.objectKeys(this.shape));
  }
}
pe.create = (e, t) => new pe({
  shape: () => e,
  unknownKeys: "strip",
  catchall: rn.create(),
  typeName: j.ZodObject,
  ...B(t)
});
pe.strictCreate = (e, t) => new pe({
  shape: () => e,
  unknownKeys: "strict",
  catchall: rn.create(),
  typeName: j.ZodObject,
  ...B(t)
});
pe.lazycreate = (e, t) => new pe({
  shape: e,
  unknownKeys: "strip",
  catchall: rn.create(),
  typeName: j.ZodObject,
  ...B(t)
});
class Wi extends G {
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
      }), z;
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
      }), z;
    }
  }
  get options() {
    return this._def.options;
  }
}
Wi.create = (e, t) => new Wi({
  options: e,
  typeName: j.ZodUnion,
  ...B(t)
});
const Qt = (e) => e instanceof Zi ? Qt(e.schema) : e instanceof Rt ? Qt(e.innerType()) : e instanceof $i ? [e.value] : e instanceof Ln ? e.options : e instanceof Gi ? Q.objectValues(e.enum) : e instanceof Yi ? Qt(e._def.innerType) : e instanceof zi ? [void 0] : e instanceof Vi ? [null] : e instanceof Bt ? [void 0, ...Qt(e.unwrap())] : e instanceof In ? [null, ...Qt(e.unwrap())] : e instanceof Zu || e instanceof Qi ? Qt(e.unwrap()) : e instanceof Xi ? Qt(e._def.innerType) : [];
class xs extends G {
  _parse(t) {
    const { ctx: n } = this._processInputParams(t);
    if (n.parsedType !== N.object)
      return P(n, {
        code: E.invalid_type,
        expected: N.object,
        received: n.parsedType
      }), z;
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
    const i = /* @__PURE__ */ new Map();
    for (const a of n) {
      const o = Qt(a.shape[t]);
      if (!o.length)
        throw new Error(`A discriminator value for key \`${t}\` could not be extracted from all schema options`);
      for (const s of o) {
        if (i.has(s))
          throw new Error(`Discriminator property ${String(t)} has duplicate value ${String(s)}`);
        i.set(s, a);
      }
    }
    return new xs({
      typeName: j.ZodDiscriminatedUnion,
      discriminator: t,
      options: n,
      optionsMap: i,
      ...B(r)
    });
  }
}
function Nl(e, t) {
  const n = pn(e), r = pn(t);
  if (e === t)
    return { valid: !0, data: e };
  if (n === N.object && r === N.object) {
    const i = Q.objectKeys(t), a = Q.objectKeys(e).filter((s) => i.indexOf(s) !== -1), o = { ...e, ...t };
    for (const s of a) {
      const l = Nl(e[s], t[s]);
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
      const o = e[a], s = t[a], l = Nl(o, s);
      if (!l.valid)
        return { valid: !1 };
      i.push(l.data);
    }
    return { valid: !0, data: i };
  } else return n === N.date && r === N.date && +e == +t ? { valid: !0, data: e } : { valid: !1 };
}
class Bi extends G {
  _parse(t) {
    const { status: n, ctx: r } = this._processInputParams(t), i = (a, o) => {
      if (Tl(a) || Tl(o))
        return z;
      const s = Nl(a.value, o.value);
      return s.valid ? ((Pl(a) || Pl(o)) && n.dirty(), { status: n.value, value: s.data }) : (P(r, {
        code: E.invalid_intersection_types
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
Bi.create = (e, t, n) => new Bi({
  left: e,
  right: t,
  typeName: j.ZodIntersection,
  ...B(n)
});
class Gt extends G {
  _parse(t) {
    const { status: n, ctx: r } = this._processInputParams(t);
    if (r.parsedType !== N.array)
      return P(r, {
        code: E.invalid_type,
        expected: N.array,
        received: r.parsedType
      }), z;
    if (r.data.length < this._def.items.length)
      return P(r, {
        code: E.too_small,
        minimum: this._def.items.length,
        inclusive: !0,
        exact: !1,
        type: "array"
      }), z;
    !this._def.rest && r.data.length > this._def.items.length && (P(r, {
      code: E.too_big,
      maximum: this._def.items.length,
      inclusive: !0,
      exact: !1,
      type: "array"
    }), n.dirty());
    const a = [...r.data].map((o, s) => {
      const l = this._def.items[s] || this._def.rest;
      return l ? l._parse(new $t(r, o, r.path, s)) : null;
    }).filter((o) => !!o);
    return r.common.async ? Promise.all(a).then((o) => Fe.mergeArray(n, o)) : Fe.mergeArray(n, a);
  }
  get items() {
    return this._def.items;
  }
  rest(t) {
    return new Gt({
      ...this._def,
      rest: t
    });
  }
}
Gt.create = (e, t) => {
  if (!Array.isArray(e))
    throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
  return new Gt({
    items: e,
    typeName: j.ZodTuple,
    rest: null,
    ...B(t)
  });
};
class Ui extends G {
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
      }), z;
    const i = [], a = this._def.keyType, o = this._def.valueType;
    for (const s in r.data)
      i.push({
        key: a._parse(new $t(r, s, r.path, s)),
        value: o._parse(new $t(r, r.data[s], r.path, s)),
        alwaysSet: s in r.data
      });
    return r.common.async ? Fe.mergeObjectAsync(n, i) : Fe.mergeObjectSync(n, i);
  }
  get element() {
    return this._def.valueType;
  }
  static create(t, n, r) {
    return n instanceof G ? new Ui({
      keyType: t,
      valueType: n,
      typeName: j.ZodRecord,
      ...B(r)
    }) : new Ui({
      keyType: Pt.create(),
      valueType: t,
      typeName: j.ZodRecord,
      ...B(n)
    });
  }
}
class Co extends G {
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
      }), z;
    const i = this._def.keyType, a = this._def.valueType, o = [...r.data.entries()].map(([s, l], c) => ({
      key: i._parse(new $t(r, s, r.path, [c, "key"])),
      value: a._parse(new $t(r, l, r.path, [c, "value"]))
    }));
    if (r.common.async) {
      const s = /* @__PURE__ */ new Map();
      return Promise.resolve().then(async () => {
        for (const l of o) {
          const c = await l.key, d = await l.value;
          if (c.status === "aborted" || d.status === "aborted")
            return z;
          (c.status === "dirty" || d.status === "dirty") && n.dirty(), s.set(c.value, d.value);
        }
        return { status: n.value, value: s };
      });
    } else {
      const s = /* @__PURE__ */ new Map();
      for (const l of o) {
        const c = l.key, d = l.value;
        if (c.status === "aborted" || d.status === "aborted")
          return z;
        (c.status === "dirty" || d.status === "dirty") && n.dirty(), s.set(c.value, d.value);
      }
      return { status: n.value, value: s };
    }
  }
}
Co.create = (e, t, n) => new Co({
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
      }), z;
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
          return z;
        d.status === "dirty" && n.dirty(), c.add(d.value);
      }
      return { status: n.value, value: c };
    }
    const s = [...r.data.values()].map((l, c) => a._parse(new $t(r, l, r.path, c)));
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
      }), z;
    function r(s, l) {
      return wo({
        data: s,
        path: n.path,
        errorMaps: [
          n.common.contextualErrorMap,
          n.schemaErrorMap,
          yo(),
          Fr
        ].filter((c) => !!c),
        issueData: {
          code: E.invalid_arguments,
          argumentsError: l
        }
      });
    }
    function i(s, l) {
      return wo({
        data: s,
        path: n.path,
        errorMaps: [
          n.common.contextualErrorMap,
          n.schemaErrorMap,
          yo(),
          Fr
        ].filter((c) => !!c),
        issueData: {
          code: E.invalid_return_type,
          returnTypeError: l
        }
      });
    }
    const a = { errorMap: n.common.contextualErrorMap }, o = n.data;
    if (this._def.returns instanceof Vr) {
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
      args: Gt.create(t).rest(Yn.create())
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
      args: t || Gt.create([]).rest(Yn.create()),
      returns: n || Yn.create(),
      typeName: j.ZodFunction,
      ...B(r)
    });
  }
}
class Zi extends G {
  get schema() {
    return this._def.getter();
  }
  _parse(t) {
    const { ctx: n } = this._processInputParams(t);
    return this._def.getter()._parse({ data: n.data, path: n.path, parent: n });
  }
}
Zi.create = (e, t) => new Zi({
  getter: e,
  typeName: j.ZodLazy,
  ...B(t)
});
class $i extends G {
  _parse(t) {
    if (t.data !== this._def.value) {
      const n = this._getOrReturnCtx(t);
      return P(n, {
        received: n.data,
        code: E.invalid_literal,
        expected: this._def.value
      }), z;
    }
    return { status: "valid", value: t.data };
  }
  get value() {
    return this._def.value;
  }
}
$i.create = (e, t) => new $i({
  value: e,
  typeName: j.ZodLiteral,
  ...B(t)
});
function Af(e, t) {
  return new Ln({
    values: e,
    typeName: j.ZodEnum,
    ...B(t)
  });
}
class Ln extends G {
  constructor() {
    super(...arguments), pi.set(this, void 0);
  }
  _parse(t) {
    if (typeof t.data != "string") {
      const n = this._getOrReturnCtx(t), r = this._def.values;
      return P(n, {
        expected: Q.joinValues(r),
        received: n.parsedType,
        code: E.invalid_type
      }), z;
    }
    if (_o(this, pi) || Df(this, pi, new Set(this._def.values)), !_o(this, pi).has(t.data)) {
      const n = this._getOrReturnCtx(t), r = this._def.values;
      return P(n, {
        received: n.data,
        code: E.invalid_enum_value,
        options: r
      }), z;
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
    return Ln.create(t, {
      ...this._def,
      ...n
    });
  }
  exclude(t, n = this._def) {
    return Ln.create(this.options.filter((r) => !t.includes(r)), {
      ...this._def,
      ...n
    });
  }
}
pi = /* @__PURE__ */ new WeakMap();
Ln.create = Af;
class Gi extends G {
  constructor() {
    super(...arguments), hi.set(this, void 0);
  }
  _parse(t) {
    const n = Q.getValidEnumValues(this._def.values), r = this._getOrReturnCtx(t);
    if (r.parsedType !== N.string && r.parsedType !== N.number) {
      const i = Q.objectValues(n);
      return P(r, {
        expected: Q.joinValues(i),
        received: r.parsedType,
        code: E.invalid_type
      }), z;
    }
    if (_o(this, hi) || Df(this, hi, new Set(Q.getValidEnumValues(this._def.values))), !_o(this, hi).has(t.data)) {
      const i = Q.objectValues(n);
      return P(r, {
        received: r.data,
        code: E.invalid_enum_value,
        options: i
      }), z;
    }
    return Ue(t.data);
  }
  get enum() {
    return this._def.values;
  }
}
hi = /* @__PURE__ */ new WeakMap();
Gi.create = (e, t) => new Gi({
  values: e,
  typeName: j.ZodNativeEnum,
  ...B(t)
});
class Vr extends G {
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
      }), z;
    const r = n.parsedType === N.promise ? n.data : Promise.resolve(n.data);
    return Ue(r.then((i) => this._def.type.parseAsync(i, {
      path: n.path,
      errorMap: n.common.contextualErrorMap
    })));
  }
}
Vr.create = (e, t) => new Vr({
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
            return z;
          const l = await this._def.schema._parseAsync({
            data: s,
            path: r.path,
            parent: r
          });
          return l.status === "aborted" ? z : l.status === "dirty" || n.value === "dirty" ? hr(l.value) : l;
        });
      {
        if (n.value === "aborted")
          return z;
        const s = this._def.schema._parseSync({
          data: o,
          path: r.path,
          parent: r
        });
        return s.status === "aborted" ? z : s.status === "dirty" || n.value === "dirty" ? hr(s.value) : s;
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
        return s.status === "aborted" ? z : (s.status === "dirty" && n.dirty(), o(s.value), { status: n.value, value: s.value });
      } else
        return this._def.schema._parseAsync({ data: r.data, path: r.path, parent: r }).then((s) => s.status === "aborted" ? z : (s.status === "dirty" && n.dirty(), o(s.value).then(() => ({ status: n.value, value: s.value }))));
    }
    if (i.type === "transform")
      if (r.common.async === !1) {
        const o = this._def.schema._parseSync({
          data: r.data,
          path: r.path,
          parent: r
        });
        if (!Ai(o))
          return o;
        const s = i.transform(o.value, a);
        if (s instanceof Promise)
          throw new Error("Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.");
        return { status: n.value, value: s };
      } else
        return this._def.schema._parseAsync({ data: r.data, path: r.path, parent: r }).then((o) => Ai(o) ? Promise.resolve(i.transform(o.value, a)).then((s) => ({ status: n.value, value: s })) : o);
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
class Bt extends G {
  _parse(t) {
    return this._getType(t) === N.undefined ? Ue(void 0) : this._def.innerType._parse(t);
  }
  unwrap() {
    return this._def.innerType;
  }
}
Bt.create = (e, t) => new Bt({
  innerType: e,
  typeName: j.ZodOptional,
  ...B(t)
});
class In extends G {
  _parse(t) {
    return this._getType(t) === N.null ? Ue(null) : this._def.innerType._parse(t);
  }
  unwrap() {
    return this._def.innerType;
  }
}
In.create = (e, t) => new In({
  innerType: e,
  typeName: j.ZodNullable,
  ...B(t)
});
class Yi extends G {
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
Yi.create = (e, t) => new Yi({
  innerType: e,
  typeName: j.ZodDefault,
  defaultValue: typeof t.default == "function" ? t.default : () => t.default,
  ...B(t)
});
class Xi extends G {
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
    return ji(i) ? i.then((a) => ({
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
Xi.create = (e, t) => new Xi({
  innerType: e,
  typeName: j.ZodCatch,
  catchValue: typeof t.catch == "function" ? t.catch : () => t.catch,
  ...B(t)
});
class bo extends G {
  _parse(t) {
    if (this._getType(t) !== N.nan) {
      const r = this._getOrReturnCtx(t);
      return P(r, {
        code: E.invalid_type,
        expected: N.nan,
        received: r.parsedType
      }), z;
    }
    return { status: "valid", value: t.data };
  }
}
bo.create = (e) => new bo({
  typeName: j.ZodNaN,
  ...B(e)
});
const Z2 = Symbol("zod_brand");
class Zu extends G {
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
class ga extends G {
  _parse(t) {
    const { status: n, ctx: r } = this._processInputParams(t);
    if (r.common.async)
      return (async () => {
        const a = await this._def.in._parseAsync({
          data: r.data,
          path: r.path,
          parent: r
        });
        return a.status === "aborted" ? z : a.status === "dirty" ? (n.dirty(), hr(a.value)) : this._def.out._parseAsync({
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
      return i.status === "aborted" ? z : i.status === "dirty" ? (n.dirty(), {
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
    return new ga({
      in: t,
      out: n,
      typeName: j.ZodPipeline
    });
  }
}
class Qi extends G {
  _parse(t) {
    const n = this._def.innerType._parse(t), r = (i) => (Ai(i) && (i.value = Object.freeze(i.value)), i);
    return ji(n) ? n.then((i) => r(i)) : r(n);
  }
  unwrap() {
    return this._def.innerType;
  }
}
Qi.create = (e, t) => new Qi({
  innerType: e,
  typeName: j.ZodReadonly,
  ...B(t)
});
function $u(e, t = {}, n) {
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
const G2 = (e, t = {
  message: `Input not instance of ${e.name}`
}) => $u((n) => n instanceof e, t), M = Pt.create, W = Pn.create, Y2 = bo.create, X2 = Nn.create, ps = Fi.create, Q2 = Kn.create, J2 = ko.create, Ll = zi.create, K2 = Vi.create, q2 = zr.create, ey = Yn.create, ty = rn.create, ny = So.create, Yt = Nt.create, F = pe.create, ry = pe.strictCreate, Ji = Wi.create, iy = xs.create, ay = Bi.create, oy = Gt.create, Gu = Ui.create, sy = Co.create, ly = qn.create, uy = Ir.create, cy = Zi.create, Un = $i.create, ya = Ln.create, Yu = Gi.create, dy = Vr.create, y0 = Rt.create, fy = Bt.create, xy = In.create, py = Rt.createWithPreprocess, hy = ga.create, my = () => M().optional(), vy = () => W().optional(), gy = () => ps().optional(), yy = {
  string: (e) => Pt.create({ ...e, coerce: !0 }),
  number: (e) => Pn.create({ ...e, coerce: !0 }),
  boolean: (e) => Fi.create({
    ...e,
    coerce: !0
  }),
  bigint: (e) => Nn.create({ ...e, coerce: !0 }),
  date: (e) => Kn.create({ ...e, coerce: !0 })
}, wy = z;
var rt = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  defaultErrorMap: Fr,
  setErrorMap: P2,
  getErrorMap: yo,
  makeIssue: wo,
  EMPTY_PATH: N2,
  addIssueToContext: P,
  ParseStatus: Fe,
  INVALID: z,
  DIRTY: hr,
  OK: Ue,
  isAborted: Tl,
  isDirty: Pl,
  isValid: Ai,
  isAsync: ji,
  get util() {
    return Q;
  },
  get objectUtil() {
    return El;
  },
  ZodParsedType: N,
  getParsedType: pn,
  ZodType: G,
  datetimeRegex: Hf,
  ZodString: Pt,
  ZodNumber: Pn,
  ZodBigInt: Nn,
  ZodBoolean: Fi,
  ZodDate: Kn,
  ZodSymbol: ko,
  ZodUndefined: zi,
  ZodNull: Vi,
  ZodAny: zr,
  ZodUnknown: Yn,
  ZodNever: rn,
  ZodVoid: So,
  ZodArray: Nt,
  ZodObject: pe,
  ZodUnion: Wi,
  ZodDiscriminatedUnion: xs,
  ZodIntersection: Bi,
  ZodTuple: Gt,
  ZodRecord: Ui,
  ZodMap: Co,
  ZodSet: qn,
  ZodFunction: Ir,
  ZodLazy: Zi,
  ZodLiteral: $i,
  ZodEnum: Ln,
  ZodNativeEnum: Gi,
  ZodPromise: Vr,
  ZodEffects: Rt,
  ZodTransformer: Rt,
  ZodOptional: Bt,
  ZodNullable: In,
  ZodDefault: Yi,
  ZodCatch: Xi,
  ZodNaN: bo,
  BRAND: Z2,
  ZodBranded: Zu,
  ZodPipeline: ga,
  ZodReadonly: Qi,
  custom: $u,
  Schema: G,
  ZodSchema: G,
  late: $2,
  get ZodFirstPartyTypeKind() {
    return j;
  },
  coerce: yy,
  any: q2,
  array: Yt,
  bigint: X2,
  boolean: ps,
  date: Q2,
  discriminatedUnion: iy,
  effect: y0,
  enum: ya,
  function: uy,
  instanceof: G2,
  intersection: ay,
  lazy: cy,
  literal: Un,
  map: sy,
  nan: Y2,
  nativeEnum: Yu,
  never: ty,
  null: K2,
  nullable: xy,
  number: W,
  object: F,
  oboolean: gy,
  onumber: vy,
  optional: fy,
  ostring: my,
  pipeline: hy,
  preprocess: py,
  promise: dy,
  record: Gu,
  set: ly,
  strictObject: ry,
  string: M,
  symbol: J2,
  transformer: y0,
  tuple: oy,
  undefined: Ll,
  union: Ji,
  unknown: ey,
  void: ny,
  NEVER: wy,
  ZodIssueCode: E,
  quotelessJson: T2,
  ZodError: st
});
function w0(e, t, n) {
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
var D;
(function(e) {
  e.datasetId = "datasetId", e.user = "user", e.dapp = "dapp", e.provider = "provider", e.blockNumber = "blockNumber", e.requestHash = "requestHash", e.captchas = "captchas", e.commitmentId = "commitmentId", e.proof = "proof", e.dappSignature = "dappSignature", e.dappUserSignature = "dappUserSignature", e.providerUrl = "providerUrl", e.procaptchaResponse = "procaptcha-response", e.verifiedTimeout = "verifiedTimeout", e.maxVerifiedTime = "maxVerifiedTime", e.verified = "verified", e.status = "status", e.challenge = "challenge", e.difficulty = "difficulty", e.nonce = "nonce", e.timeouts = "timeouts", e.token = "token", e.secret = "secret", e.timestamp = "timestamp", e.signature = "signature";
})(D || (D = {}));
const _y = (e, t) => {
  const n = (r) => Object.keys(r).every((i) => e.safeParse(i).success);
  return Gu(t).refine(n);
}, vn = ya([
  "development",
  "rococo",
  "shiden",
  "astar"
]), jf = Ji([
  Un("sr25519"),
  Un("ed25519"),
  Un("ecdsa"),
  Un("ethereum")
]), ky = F({
  endpoint: Yt(M().url()),
  contract: F({
    address: M(),
    name: M()
  }),
  pairType: jf,
  ss58Format: W().positive().default(42)
}), Sy = _y(vn, ky.required({
  endpoint: !0,
  pairType: !0,
  ss58Format: !0
})), Na = jf.parse("sr25519"), La = (e) => e || "", Cy = () => ({
  [vn.Values.development]: {
    endpoint: ["ws://127.0.0.1:9944"],
    contract: {
      name: "captcha",
      address: La("CONTRACT_NOT_DEPLOYED")
    },
    pairType: Na,
    ss58Format: 42
  },
  [vn.Values.rococo]: {
    endpoint: ["wss://rococo-contracts-rpc.polkadot.io:443"],
    contract: {
      name: "captcha",
      address: La("5HiVWQhJrysNcFNEWf2crArKht16zrhro3FcekVWocyQjx5u")
    },
    pairType: Na,
    ss58Format: 42
  },
  [vn.Values.shiden]: {
    endpoint: ["wss://shiden.public.blastapi.io"],
    contract: {
      address: La("XpRox5bNg6YV8BHafsuHQ3b8i7gSq3GKPeYLA1b8EZwrDb3"),
      name: "captcha"
    },
    pairType: Na,
    ss58Format: 42
  },
  [vn.Values.astar]: {
    endpoint: [
      "wss://rpc.astar.network",
      "wss://1rpc.io/astr",
      "wss://astar.public.blastapi.io",
      "wss://astar.public.curie.radiumblock.co/ws"
    ],
    contract: {
      address: La("X2NLPj49L4UKWAzX8tS1LHTwioMHNyVurCsvTyUNYxcPuWA"),
      name: "captcha"
    },
    pairType: Na,
    ss58Format: 42
  }
}), Xu = 60 * 1e3, wa = Xu, Ff = wa * 2, zf = wa * 3, Qu = wa * 15, hs = Xu, ms = hs * 2, Vf = hs * 3, Wf = Xu * 15;
var Il;
(function(e) {
  e.SelectAll = "SelectAll";
})(Il || (Il = {}));
var Rl;
(function(e) {
  e.Text = "text", e.Image = "image";
})(Rl || (Rl = {}));
var _0;
(function(e) {
  e.Solved = "solved", e.Unsolved = "unsolved";
})(_0 || (_0 = {}));
var k0;
(function(e) {
  e.pending = "Pending", e.approved = "Approved", e.disapproved = "Disapproved";
})(k0 || (k0 = {}));
var S0;
(function(e) {
  e.active = "Active", e.inactive = "Inactive";
})(S0 || (S0 = {}));
var C0;
(function(e) {
  e.provider = "Provider", e.dapp = "Dapp", e.any = "Any";
})(C0 || (C0 = {}));
const by = "___", Ey = $u((e) => {
  const t = e.split(by);
  try {
    return t.length === 3;
  } catch {
    return !1;
  }
}), Ty = F({
  captchaId: Ji([M(), Ll()]),
  captchaContentId: Ji([M(), Ll()]),
  salt: M().min(34),
  solution: W().array().optional(),
  unlabelled: W().array().optional(),
  timeLimit: W().optional()
}), Bf = F({
  hash: M(),
  data: M(),
  type: Yu(Rl)
}), Uf = Bf.extend({
  hash: M()
}), Py = Uf.extend({
  label: M()
}), Ny = Uf.extend({
  label: M().optional()
}), Zf = Ty.extend({
  items: Yt(Bf),
  target: M()
}), Ly = Zf.extend({
  solution: M().array().optional(),
  unlabelled: M().array().optional()
}), Iy = Ly.extend({
  solution: W().array().optional(),
  unlabelled: W().array().optional()
}), Ry = Yt(Zf);
Yt(Iy);
const $f = F({
  captchaId: M(),
  captchaContentId: M(),
  solution: M().array(),
  salt: M().min(34)
});
Yt($f);
F({
  items: Yt(Ny)
});
F({
  items: Yt(Py)
});
F({
  captchas: Ry,
  format: Yu(Il)
});
F({
  labels: Yt(M())
});
var Dy = Object.defineProperty, My = (e, t, n) => t in e ? Dy(e, t, { enumerable: !0, configurable: !0, writable: !0, value: n }) : e[t] = n, b0 = (e, t, n) => (My(e, typeof t != "symbol" ? t + "" : t, n), n), Bs = {
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
function Oy(e) {
  const t = e.length % 2, n = (e[1] === "x" ? 2 : 0) + t, r = (e.length - n) / 2 + t, i = new Uint8Array(r);
  t && (i[0] = 0 | Bs[e[2]]);
  for (let a = 0; a < r; ) {
    const o = n + a * 2, s = Bs[e[o]], l = Bs[e[o + 1]];
    i[t + a++] = s << 4 | l;
  }
  return i;
}
var E0 = class extends Uint8Array {
  constructor(e) {
    super(e), b0(this, "i", 0), b0(this, "v"), this.v = new DataView(e);
  }
}, ar = (e) => (t) => e(t instanceof E0 ? t : new E0(t instanceof Uint8Array ? t.buffer : typeof t == "string" ? Oy(t).buffer : t)), vs = (e) => {
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
function T0(e, t) {
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
}, Gf = (e, t) => (n) => e(t(n)), Yf = (e, t) => (n) => t(e(n)), Hy = ([e, t], n, r) => kt(Gf(e, n), Yf(t, r));
function Ay(e, t) {
  return ar((n) => {
    const r = n.v[t](n.i, !0);
    return n.i += e, r;
  });
}
function jy(e, t) {
  return (n) => {
    const r = new Uint8Array(e);
    return new DataView(r.buffer)[t](0, n, !0), r;
  };
}
function Mn(e, t, n) {
  return kt(jy(e, n), Ay(e, t));
}
var Wr = Mn(1, "getUint8", "setUint8"), Eo = Mn(2, "getUint16", "setUint16"), Br = Mn(4, "getUint32", "setUint32"), Xf = Mn(8, "getBigUint64", "setBigUint64");
Mn(1, "getInt8", "setInt8");
Mn(2, "getInt16", "setInt16");
Mn(4, "getInt32", "setInt32");
Mn(8, "getBigInt64", "setBigInt64");
var Qf = (e) => {
  const t = new Uint8Array(16), n = new DataView(t.buffer);
  return n.setBigInt64(0, e, !0), n.setBigInt64(8, e >> 64n, !0), t;
}, Jf = (e) => ar((t) => {
  const { v: n, i: r } = t, i = n.getBigUint64(r, !0), a = n[e](r + 8, !0);
  return t.i += 16, a << 64n | i;
});
kt(Qf, Jf("getBigUint64"));
kt(Qf, Jf("getBigInt64"));
var Kf = (e) => {
  const t = new Uint8Array(32), n = new DataView(t.buffer);
  return n.setBigInt64(0, e, !0), n.setBigInt64(8, e >> 64n, !0), n.setBigInt64(16, e >> 128n, !0), n.setBigInt64(24, e >> 192n, !0), t;
}, qf = (e) => ar((t) => {
  let n = t.v.getBigUint64(t.i, !0);
  return t.i += 8, n |= t.v.getBigUint64(t.i, !0) << 64n, t.i += 8, n |= t.v.getBigUint64(t.i, !0) << 128n, t.i += 8, n |= t.v[e](t.i, !0) << 192n, t.i += 8, n;
});
kt(Kf, qf("getBigUint64"));
kt(Kf, qf("getBigInt64"));
var ex = Hy(Wr, (e) => e ? 1 : 0, Boolean), Fy = [Wr[1], Eo[1], Br[1]], zy = ar((e) => {
  const t = e[e.i], n = t & 3;
  if (n < 3)
    return Fy[n](e) >>> 2;
  const r = (t >>> 2) + 4;
  e.i++;
  let i = 0n;
  const a = r / 8 | 0;
  let o = 0n;
  for (let l = 0; l < a; l++)
    i = Xf[1](e) << o | i, o += 64n;
  let s = r % 8;
  return s > 3 && (i = BigInt(Br[1](e)) << o | i, o += 32n, s -= 4), s > 1 && (i = BigInt(Eo[1](e)) << o | i, o += 16n, s -= 2), s && (i = BigInt(Wr[1](e)) << o | i), i;
}), Vy = 1n << 56n, Wy = 1 << 24, By = 256, Uy = 4294967295n, Zy = 64, $y = 16384, Gy = 1 << 30, Yy = (e) => {
  if (e < 0)
    throw new Error(`Wrong compact input (${e})`);
  const t = Number(e) << 2;
  if (e < Zy)
    return Wr[0](t);
  if (e < $y)
    return Eo[0](t | 1);
  if (e < Gy)
    return Br[0](t | 2);
  let n = [new Uint8Array(1)], r = BigInt(e);
  for (; r >= Vy; )
    n.push(Xf[0](r)), r >>= 64n;
  r >= Wy && (n.push(Br[0](Number(r & Uy))), r >>= 32n);
  let i = Number(r);
  i >= By && (n.push(Eo[0](i)), i >>= 16), i && n.push(Wr[0](i));
  const a = vs(n);
  return a[0] = a.length - 5 << 2 | 3, a;
}, tx = kt(Yy, zy), Xy = new TextEncoder(), Qy = (e) => {
  const t = Xy.encode(e);
  return vs([tx.enc(t.length), t]);
}, Jy = new TextDecoder(), Ky = ar((e) => {
  let t = tx.dec(e);
  const n = new DataView(e.buffer, e.i, t);
  return e.i += t, Jy.decode(n);
}), zn = kt(Qy, Ky), qy = () => {
}, e4 = new Uint8Array(0);
kt(() => e4, qy);
var nx = (e) => ar((t) => {
  const n = Wr.dec(t);
  if (n !== 0)
    return e === ex[1] ? n === 1 : e(t);
}), rx = (e) => (t) => {
  const n = new Uint8Array(1);
  return t === void 0 ? (n[0] = 0, n) : (n[0] = 1, e === ex[0] ? (n[0] = t ? 1 : 2, n) : vs([n, e(t)]));
}, mr = (e) => kt(rx(e[0]), nx(e[1]));
mr.enc = rx;
mr.dec = nx;
var ix = (...e) => ar((t) => e.map((n) => n(t))), ax = (...e) => (t) => vs(e.map((n, r) => n(t[r]))), gs = (...e) => kt(ax(...e.map(([t]) => t)), ix(...e.map(([, t]) => t)));
gs.enc = ax;
gs.dec = ix;
var ox = (e) => {
  const t = Object.keys(e);
  return Gf(gs.enc(...Object.values(e)), (n) => t.map((r) => n[r]));
}, sx = (e) => {
  const t = Object.keys(e);
  return Yf(gs.dec(...Object.values(e)), (n) => Object.fromEntries(n.map((r, i) => [t[i], r])));
}, _i = (e) => kt(ox(T0(e, (t) => t[0])), sx(T0(e, (t) => t[1])));
_i.enc = ox;
_i.dec = sx;
F({
  [D.commitmentId]: M().optional(),
  [D.providerUrl]: M().optional(),
  [D.dapp]: M(),
  [D.user]: M(),
  [D.blockNumber]: W(),
  [D.challenge]: M().optional(),
  [D.nonce]: W().optional(),
  [D.timestamp]: M(),
  [D.signature]: F({
    [D.provider]: F({
      [D.timestamp]: M()
    }),
    [D.user]: F({
      [D.timestamp]: M()
    }).optional()
  })
});
const t4 = _i({
  [D.commitmentId]: mr(zn),
  [D.providerUrl]: mr(zn),
  [D.dapp]: zn,
  [D.user]: zn,
  [D.blockNumber]: Br,
  [D.challenge]: mr(zn),
  [D.nonce]: mr(Br),
  [D.timestamp]: zn,
  [D.signature]: _i({
    [D.provider]: _i({
      [D.timestamp]: zn
    })
  })
}), lx = M().startsWith("0x"), j3 = (e) => E2(t4.enc({
  [D.commitmentId]: void 0,
  [D.providerUrl]: void 0,
  [D.challenge]: void 0,
  [D.nonce]: void 0,
  ...e
}));
var ht;
(function(e) {
  e.GetImageCaptchaChallenge = "/v1/prosopo/provider/captcha/image", e.GetPowCaptchaChallenge = "/v1/prosopo/provider/captcha/pow", e.SubmitImageCaptchaSolution = "/v1/prosopo/provider/solution", e.SubmitPowCaptchaSolution = "/v1/prosopo/provider/pow/solution", e.VerifyPowCaptchaSolution = "/v1/prosopo/provider/pow/verify", e.VerifyImageCaptchaSolutionDapp = "/v1/prosopo/provider/image/dapp/verify", e.VerifyImageCaptchaSolutionUser = "/v1/prosopo/provider/image/user/verify", e.GetProviderStatus = "/v1/prosopo/provider/status", e.GetProviderDetails = "/v1/prosopo/provider/details", e.SubmitUserEvents = "/v1/prosopo/provider/events";
})(ht || (ht = {}));
var vr;
(function(e) {
  e.BatchCommit = "/v1/prosopo/provider/admin/batch", e.UpdateDataset = "/v1/prosopo/provider/admin/dataset", e.ProviderDeregister = "/v1/prosopo/provider/admin/deregister", e.ProviderUpdate = "/v1/prosopo/provider/admin/update";
})(vr || (vr = {}));
const ux = {
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
}, n4 = (e) => F(Object.entries(e).reduce((t, [n, r]) => {
  const i = n;
  return t[i] = F({
    windowMs: W().optional().default(r.windowMs),
    limit: W().optional().default(r.limit)
  }), t;
}, {})), r4 = n4(ux);
F({
  [D.user]: M(),
  [D.dapp]: M(),
  [D.datasetId]: M(),
  [D.blockNumber]: M()
});
const F3 = F({
  [D.user]: M(),
  [D.dapp]: M(),
  [D.captchas]: Yt($f),
  [D.requestHash]: M(),
  [D.timestamp]: M(),
  [D.signature]: F({
    [D.user]: F({
      [D.requestHash]: M()
    }),
    [D.provider]: F({
      [D.timestamp]: M()
    })
  })
});
F({
  [D.token]: lx,
  [D.dappUserSignature]: M(),
  [D.maxVerifiedTime]: W().optional().default(Qu)
});
F({
  [D.token]: lx,
  [D.dappSignature]: M(),
  [D.verifiedTimeout]: W().optional().default(ms)
});
F({
  [D.user]: M(),
  [D.dapp]: M()
});
const z3 = F({
  [D.challenge]: Ey,
  [D.difficulty]: W(),
  [D.signature]: F({
    [D.user]: F({
      [D.timestamp]: M()
    }),
    [D.provider]: F({
      [D.challenge]: M()
    })
  }),
  [D.user]: M(),
  [D.dapp]: M(),
  [D.nonce]: W(),
  [D.verifiedTimeout]: W().optional().default(ms)
}), P0 = ya([
  "trace",
  "debug",
  "info",
  "warn",
  "error",
  "fatal",
  "log"
]);
ya(["mongo", "mongoMemory"]);
const To = ya([
  "development",
  "staging",
  "production"
]), i4 = Gu(To, F({
  type: M(),
  endpoint: M(),
  dbname: M(),
  authSource: M()
})), a4 = F({
  interval: W().positive().optional().default(300),
  maxBatchExtrinsicPercentage: W().positive().optional().default(59)
}), o4 = F({
  logLevel: P0.optional().default(P0.enum.info),
  defaultEnvironment: To.default(To.Values.production),
  defaultNetwork: vn.default(vn.Values.astar),
  account: F({
    address: M().optional(),
    secret: M().optional(),
    password: M().optional()
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
const cx = o4.merge(F({
  networks: Sy.default(Cy),
  database: i4.optional(),
  devOnlyWatchEvents: ps().optional()
})), s4 = F({
  solved: F({
    count: W().positive()
  }).optional().default({ count: 1 }),
  unsolved: F({
    count: W().nonnegative()
  }).optional().default({ count: 1 })
}), l4 = F({
  baseURL: M().url(),
  port: W().optional().default(9229)
}), u4 = F({
  requiredNumberOfSolutions: W().positive().min(2),
  solutionWinningPercentage: W().positive().max(100),
  captchaBlockRecency: W().positive().min(2)
}), dx = cx.merge(F({
  userAccountAddress: M().optional(),
  web2: ps().optional().default(!0),
  solutionThreshold: W().positive().max(100).optional().default(80),
  dappName: M().optional().default("ProsopoClientDapp"),
  serverUrl: M().optional()
})), fx = {
  challengeTimeout: wa,
  solutionTimeout: Ff,
  verifiedTimeout: zf,
  cachedTimeout: Qu
}, xx = {
  challengeTimeout: ms,
  solutionTimeout: hs,
  cachedTimeout: Vf
}, px = {
  maxVerifiedTime: Wf
}, Ju = {
  image: fx,
  pow: xx,
  contract: px
}, hx = F({
  image: F({
    challengeTimeout: W().positive().optional().default(wa),
    solutionTimeout: W().positive().optional().default(Ff),
    verifiedTimeout: W().positive().optional().default(zf),
    cachedTimeout: W().positive().optional().default(Qu)
  }).default(fx),
  pow: F({
    verifiedTimeout: W().positive().optional().default(ms),
    solutionTimeout: W().positive().optional().default(hs),
    cachedTimeout: W().positive().optional().default(Vf)
  }).default(xx),
  contract: F({
    maxVerifiedTime: W().positive().optional().default(Wf)
  }).default(px)
}).default(Ju);
dx.merge(F({
  serverUrl: M().url().optional(),
  timeouts: hx.optional().default(Ju)
}));
const c4 = F({
  area: F({
    width: W().positive(),
    height: W().positive()
  }),
  offsetParameter: W().positive(),
  multiplier: W().positive(),
  fontSizeFactor: W().positive(),
  maxShadowBlur: W().positive(),
  numberOfRounds: W().positive(),
  seed: W().positive()
}), d4 = Ji([Un("light"), Un("dark")]), f4 = dx.and(F({
  accountCreator: c4.optional(),
  theme: d4.optional(),
  captchas: hx.optional().default(Ju)
}));
cx.merge(F({
  captchas: s4.optional().default({
    solved: { count: 1 },
    unsolved: { count: 0 }
  }),
  captchaSolutions: u4.optional().default({
    requiredNumberOfSolutions: 3,
    solutionWinningPercentage: 80,
    captchaBlockRecency: 10
  }),
  batchCommit: a4.optional().default({
    interval: 300,
    maxBatchExtrinsicPercentage: 59
  }),
  captchaScheduler: F({
    schedule: M().optional()
  }).optional(),
  server: l4,
  mongoEventsUri: M().optional(),
  mongoCaptchaUri: M().optional(),
  rateLimits: r4.default(ux),
  proxyCount: W().optional().default(0)
}));
var Dl;
(function(e) {
  e.Image = "image", e.Pow = "pow", e.Frictionless = "frictionless";
})(Dl || (Dl = {}));
const x4 = ae.lazy(async () => import("./Captcha-DmelpUdl.js")), mx = (e) => Z(ae.Suspense, { fallback: Z(Uu, { darkMode: e.config.theme }), children: Z(x4, { config: e.config, callbacks: e.callbacks }) }), p4 = ae.lazy(async () => import("./ProcaptchaWidget-BJBQxbCd.js")), vx = (e) => Z(ae.Suspense, { fallback: Z(Uu, { darkMode: e.config.theme }), children: Z(p4, { config: e.config, callbacks: e.callbacks }) }), h4 = async () => await ag().then((e) => ({ bot: e.isBot })), m4 = ({ config: e, callbacks: t, detectBot: n = h4 }) => {
  const [r, i] = ae.useState(Vt.jsx(Uu, { darkMode: e.theme }));
  return ae.useEffect(() => {
    (async () => {
      (await n()).bot ? i(Vt.jsx(vx, { config: e, callbacks: t })) : i(Vt.jsx(mx, { config: e, callbacks: t }));
    })();
  }, [e, t, n]), r;
};
var gx = { exports: {} }, dt = {}, yx = { exports: {} }, wx = {};
(function(e) {
  function t(I, V) {
    var $ = I.length;
    I.push(V);
    e: for (; 0 < $; ) {
      var ue = $ - 1 >>> 1, ye = I[ue];
      if (0 < i(ye, V)) I[ue] = V, I[$] = ye, $ = ue;
      else break e;
    }
  }
  function n(I) {
    return I.length === 0 ? null : I[0];
  }
  function r(I) {
    if (I.length === 0) return null;
    var V = I[0], $ = I.pop();
    if ($ !== V) {
      I[0] = $;
      e: for (var ue = 0, ye = I.length, jn = ye >>> 1; ue < jn; ) {
        var tt = 2 * (ue + 1) - 1, Ms = I[tt], Fn = tt + 1, ba = I[Fn];
        if (0 > i(Ms, $)) Fn < ye && 0 > i(ba, Ms) ? (I[ue] = ba, I[Fn] = $, ue = Fn) : (I[ue] = Ms, I[tt] = $, ue = tt);
        else if (Fn < ye && 0 > i(ba, $)) I[ue] = ba, I[Fn] = $, ue = Fn;
        else break e;
      }
    }
    return V;
  }
  function i(I, V) {
    var $ = I.sortIndex - V.sortIndex;
    return $ !== 0 ? $ : I.id - V.id;
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
  function h(I) {
    for (var V = n(c); V !== null; ) {
      if (V.callback === null) r(c);
      else if (V.startTime <= I) r(c), V.sortIndex = V.expirationTime, t(l, V);
      else break;
      V = n(c);
    }
  }
  function g(I) {
    if (x = !1, h(I), !y) if (n(l) !== null) y = !0, ni(k);
    else {
      var V = n(c);
      V !== null && ri(g, V.startTime - I);
    }
  }
  function k(I, V) {
    y = !1, x && (x = !1, u(L), L = -1), w = !0;
    var $ = m;
    try {
      for (h(V), f = n(l); f !== null && (!(f.expirationTime > V) || I && !A()); ) {
        var ue = f.callback;
        if (typeof ue == "function") {
          f.callback = null, m = f.priorityLevel;
          var ye = ue(f.expirationTime <= V);
          V = e.unstable_now(), typeof ye == "function" ? f.callback = ye : f === n(l) && r(l), h(V);
        } else r(l);
        f = n(l);
      }
      if (f !== null) var jn = !0;
      else {
        var tt = n(c);
        tt !== null && ri(g, tt.startTime - V), jn = !1;
      }
      return jn;
    } finally {
      f = null, m = $, w = !1;
    }
  }
  var C = !1, S = null, L = -1, O = 5, T = -1;
  function A() {
    return !(e.unstable_now() - T < O);
  }
  function le() {
    if (S !== null) {
      var I = e.unstable_now();
      T = I;
      var V = !0;
      try {
        V = S(!0, I);
      } finally {
        V ? xt() : (C = !1, S = null);
      }
    } else C = !1;
  }
  var xt;
  if (typeof p == "function") xt = function() {
    p(le);
  };
  else if (typeof MessageChannel < "u") {
    var lr = new MessageChannel(), ti = lr.port2;
    lr.port1.onmessage = le, xt = function() {
      ti.postMessage(null);
    };
  } else xt = function() {
    _(le, 0);
  };
  function ni(I) {
    S = I, C || (C = !0, xt());
  }
  function ri(I, V) {
    L = _(function() {
      I(e.unstable_now());
    }, V);
  }
  e.unstable_IdlePriority = 5, e.unstable_ImmediatePriority = 1, e.unstable_LowPriority = 4, e.unstable_NormalPriority = 3, e.unstable_Profiling = null, e.unstable_UserBlockingPriority = 2, e.unstable_cancelCallback = function(I) {
    I.callback = null;
  }, e.unstable_continueExecution = function() {
    y || w || (y = !0, ni(k));
  }, e.unstable_forceFrameRate = function(I) {
    0 > I || 125 < I ? console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported") : O = 0 < I ? Math.floor(1e3 / I) : 5;
  }, e.unstable_getCurrentPriorityLevel = function() {
    return m;
  }, e.unstable_getFirstCallbackNode = function() {
    return n(l);
  }, e.unstable_next = function(I) {
    switch (m) {
      case 1:
      case 2:
      case 3:
        var V = 3;
        break;
      default:
        V = m;
    }
    var $ = m;
    m = V;
    try {
      return I();
    } finally {
      m = $;
    }
  }, e.unstable_pauseExecution = function() {
  }, e.unstable_requestPaint = function() {
  }, e.unstable_runWithPriority = function(I, V) {
    switch (I) {
      case 1:
      case 2:
      case 3:
      case 4:
      case 5:
        break;
      default:
        I = 3;
    }
    var $ = m;
    m = I;
    try {
      return V();
    } finally {
      m = $;
    }
  }, e.unstable_scheduleCallback = function(I, V, $) {
    var ue = e.unstable_now();
    switch (typeof $ == "object" && $ !== null ? ($ = $.delay, $ = typeof $ == "number" && 0 < $ ? ue + $ : ue) : $ = ue, I) {
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
    return ye = $ + ye, I = { id: d++, callback: V, priorityLevel: I, startTime: $, expirationTime: ye, sortIndex: -1 }, $ > ue ? (I.sortIndex = $, t(c, I), n(l) === null && I === n(c) && (x ? (u(L), L = -1) : x = !0, ri(g, $ - ue))) : (I.sortIndex = ye, t(l, I), y || w || (y = !0, ni(k))), I;
  }, e.unstable_shouldYield = A, e.unstable_wrapCallback = function(I) {
    var V = m;
    return function() {
      var $ = m;
      m = V;
      try {
        return I.apply(this, arguments);
      } finally {
        m = $;
      }
    };
  };
})(wx);
yx.exports = wx;
var v4 = yx.exports;
var g4 = ae, ut = v4;
function b(e) {
  for (var t = "https://reactjs.org/docs/error-decoder.html?invariant=" + e, n = 1; n < arguments.length; n++) t += "&args[]=" + encodeURIComponent(arguments[n]);
  return "Minified React error #" + e + "; visit " + t + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
}
var _x = /* @__PURE__ */ new Set(), Ki = {};
function or(e, t) {
  Ur(e, t), Ur(e + "Capture", t);
}
function Ur(e, t) {
  for (Ki[e] = t, e = 0; e < t.length; e++) _x.add(t[e]);
}
var an = !(typeof window > "u" || typeof window.document > "u" || typeof window.document.createElement > "u"), Ml = Object.prototype.hasOwnProperty, y4 = /^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/, N0 = {}, L0 = {};
function w4(e) {
  return Ml.call(L0, e) ? !0 : Ml.call(N0, e) ? !1 : y4.test(e) ? L0[e] = !0 : (N0[e] = !0, !1);
}
function _4(e, t, n, r) {
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
function k4(e, t, n, r) {
  if (t === null || typeof t > "u" || _4(e, t, n, r)) return !0;
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
function $e(e, t, n, r, i, a, o) {
  this.acceptsBooleans = t === 2 || t === 3 || t === 4, this.attributeName = r, this.attributeNamespace = i, this.mustUseProperty = n, this.propertyName = e, this.type = t, this.sanitizeURL = a, this.removeEmptyString = o;
}
var De = {};
"children dangerouslySetInnerHTML defaultValue defaultChecked innerHTML suppressContentEditableWarning suppressHydrationWarning style".split(" ").forEach(function(e) {
  De[e] = new $e(e, 0, !1, e, null, !1, !1);
});
[["acceptCharset", "accept-charset"], ["className", "class"], ["htmlFor", "for"], ["httpEquiv", "http-equiv"]].forEach(function(e) {
  var t = e[0];
  De[t] = new $e(t, 1, !1, e[1], null, !1, !1);
});
["contentEditable", "draggable", "spellCheck", "value"].forEach(function(e) {
  De[e] = new $e(e, 2, !1, e.toLowerCase(), null, !1, !1);
});
["autoReverse", "externalResourcesRequired", "focusable", "preserveAlpha"].forEach(function(e) {
  De[e] = new $e(e, 2, !1, e, null, !1, !1);
});
"allowFullScreen async autoFocus autoPlay controls default defer disabled disablePictureInPicture disableRemotePlayback formNoValidate hidden loop noModule noValidate open playsInline readOnly required reversed scoped seamless itemScope".split(" ").forEach(function(e) {
  De[e] = new $e(e, 3, !1, e.toLowerCase(), null, !1, !1);
});
["checked", "multiple", "muted", "selected"].forEach(function(e) {
  De[e] = new $e(e, 3, !0, e, null, !1, !1);
});
["capture", "download"].forEach(function(e) {
  De[e] = new $e(e, 4, !1, e, null, !1, !1);
});
["cols", "rows", "size", "span"].forEach(function(e) {
  De[e] = new $e(e, 6, !1, e, null, !1, !1);
});
["rowSpan", "start"].forEach(function(e) {
  De[e] = new $e(e, 5, !1, e.toLowerCase(), null, !1, !1);
});
var Ku = /[\-:]([a-z])/g;
function qu(e) {
  return e[1].toUpperCase();
}
"accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height".split(" ").forEach(function(e) {
  var t = e.replace(
    Ku,
    qu
  );
  De[t] = new $e(t, 1, !1, e, null, !1, !1);
});
"xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type".split(" ").forEach(function(e) {
  var t = e.replace(Ku, qu);
  De[t] = new $e(t, 1, !1, e, "http://www.w3.org/1999/xlink", !1, !1);
});
["xml:base", "xml:lang", "xml:space"].forEach(function(e) {
  var t = e.replace(Ku, qu);
  De[t] = new $e(t, 1, !1, e, "http://www.w3.org/XML/1998/namespace", !1, !1);
});
["tabIndex", "crossOrigin"].forEach(function(e) {
  De[e] = new $e(e, 1, !1, e.toLowerCase(), null, !1, !1);
});
De.xlinkHref = new $e("xlinkHref", 1, !1, "xlink:href", "http://www.w3.org/1999/xlink", !0, !1);
["src", "href", "action", "formAction"].forEach(function(e) {
  De[e] = new $e(e, 1, !1, e.toLowerCase(), null, !0, !0);
});
function ec(e, t, n, r) {
  var i = De.hasOwnProperty(t) ? De[t] : null;
  (i !== null ? i.type !== 0 : r || !(2 < t.length) || t[0] !== "o" && t[0] !== "O" || t[1] !== "n" && t[1] !== "N") && (k4(t, n, i, r) && (n = null), r || i === null ? w4(t) && (n === null ? e.removeAttribute(t) : e.setAttribute(t, "" + n)) : i.mustUseProperty ? e[i.propertyName] = n === null ? i.type === 3 ? !1 : "" : n : (t = i.attributeName, r = i.attributeNamespace, n === null ? e.removeAttribute(t) : (i = i.type, n = i === 3 || i === 4 && n === !0 ? "" : "" + n, r ? e.setAttributeNS(r, t, n) : e.setAttribute(t, n))));
}
var un = g4.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED, Ia = Symbol.for("react.element"), gr = Symbol.for("react.portal"), yr = Symbol.for("react.fragment"), tc = Symbol.for("react.strict_mode"), Ol = Symbol.for("react.profiler"), kx = Symbol.for("react.provider"), Sx = Symbol.for("react.context"), nc = Symbol.for("react.forward_ref"), Hl = Symbol.for("react.suspense"), Al = Symbol.for("react.suspense_list"), rc = Symbol.for("react.memo"), fn = Symbol.for("react.lazy"), Cx = Symbol.for("react.offscreen"), I0 = Symbol.iterator;
function oi(e) {
  return e === null || typeof e != "object" ? null : (e = I0 && e[I0] || e["@@iterator"], typeof e == "function" ? e : null);
}
var ve = Object.assign, Us;
function mi(e) {
  if (Us === void 0) try {
    throw Error();
  } catch (n) {
    var t = n.stack.trim().match(/\n( *(at )?)/);
    Us = t && t[1] || "";
  }
  return `
` + Us + e;
}
var Zs = !1;
function $s(e, t) {
  if (!e || Zs) return "";
  Zs = !0;
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
    Zs = !1, Error.prepareStackTrace = n;
  }
  return (e = e ? e.displayName || e.name : "") ? mi(e) : "";
}
function S4(e) {
  switch (e.tag) {
    case 5:
      return mi(e.type);
    case 16:
      return mi("Lazy");
    case 13:
      return mi("Suspense");
    case 19:
      return mi("SuspenseList");
    case 0:
    case 2:
    case 15:
      return e = $s(e.type, !1), e;
    case 11:
      return e = $s(e.type.render, !1), e;
    case 1:
      return e = $s(e.type, !0), e;
    default:
      return "";
  }
}
function jl(e) {
  if (e == null) return null;
  if (typeof e == "function") return e.displayName || e.name || null;
  if (typeof e == "string") return e;
  switch (e) {
    case yr:
      return "Fragment";
    case gr:
      return "Portal";
    case Ol:
      return "Profiler";
    case tc:
      return "StrictMode";
    case Hl:
      return "Suspense";
    case Al:
      return "SuspenseList";
  }
  if (typeof e == "object") switch (e.$$typeof) {
    case Sx:
      return (e.displayName || "Context") + ".Consumer";
    case kx:
      return (e._context.displayName || "Context") + ".Provider";
    case nc:
      var t = e.render;
      return e = e.displayName, e || (e = t.displayName || t.name || "", e = e !== "" ? "ForwardRef(" + e + ")" : "ForwardRef"), e;
    case rc:
      return t = e.displayName || null, t !== null ? t : jl(e.type) || "Memo";
    case fn:
      t = e._payload, e = e._init;
      try {
        return jl(e(t));
      } catch {
      }
  }
  return null;
}
function C4(e) {
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
      return jl(t);
    case 8:
      return t === tc ? "StrictMode" : "Mode";
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
function Rn(e) {
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
function bx(e) {
  var t = e.type;
  return (e = e.nodeName) && e.toLowerCase() === "input" && (t === "checkbox" || t === "radio");
}
function b4(e) {
  var t = bx(e) ? "checked" : "value", n = Object.getOwnPropertyDescriptor(e.constructor.prototype, t), r = "" + e[t];
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
function Ra(e) {
  e._valueTracker || (e._valueTracker = b4(e));
}
function Ex(e) {
  if (!e) return !1;
  var t = e._valueTracker;
  if (!t) return !0;
  var n = t.getValue(), r = "";
  return e && (r = bx(e) ? e.checked ? "true" : "false" : e.value), e = r, e !== n ? (t.setValue(e), !0) : !1;
}
function Po(e) {
  if (e = e || (typeof document < "u" ? document : void 0), typeof e > "u") return null;
  try {
    return e.activeElement || e.body;
  } catch {
    return e.body;
  }
}
function Fl(e, t) {
  var n = t.checked;
  return ve({}, t, { defaultChecked: void 0, defaultValue: void 0, value: void 0, checked: n ?? e._wrapperState.initialChecked });
}
function R0(e, t) {
  var n = t.defaultValue == null ? "" : t.defaultValue, r = t.checked != null ? t.checked : t.defaultChecked;
  n = Rn(t.value != null ? t.value : n), e._wrapperState = { initialChecked: r, initialValue: n, controlled: t.type === "checkbox" || t.type === "radio" ? t.checked != null : t.value != null };
}
function Tx(e, t) {
  t = t.checked, t != null && ec(e, "checked", t, !1);
}
function zl(e, t) {
  Tx(e, t);
  var n = Rn(t.value), r = t.type;
  if (n != null) r === "number" ? (n === 0 && e.value === "" || e.value != n) && (e.value = "" + n) : e.value !== "" + n && (e.value = "" + n);
  else if (r === "submit" || r === "reset") {
    e.removeAttribute("value");
    return;
  }
  t.hasOwnProperty("value") ? Vl(e, t.type, n) : t.hasOwnProperty("defaultValue") && Vl(e, t.type, Rn(t.defaultValue)), t.checked == null && t.defaultChecked != null && (e.defaultChecked = !!t.defaultChecked);
}
function D0(e, t, n) {
  if (t.hasOwnProperty("value") || t.hasOwnProperty("defaultValue")) {
    var r = t.type;
    if (!(r !== "submit" && r !== "reset" || t.value !== void 0 && t.value !== null)) return;
    t = "" + e._wrapperState.initialValue, n || t === e.value || (e.value = t), e.defaultValue = t;
  }
  n = e.name, n !== "" && (e.name = ""), e.defaultChecked = !!e._wrapperState.initialChecked, n !== "" && (e.name = n);
}
function Vl(e, t, n) {
  (t !== "number" || Po(e.ownerDocument) !== e) && (n == null ? e.defaultValue = "" + e._wrapperState.initialValue : e.defaultValue !== "" + n && (e.defaultValue = "" + n));
}
var vi = Array.isArray;
function Rr(e, t, n, r) {
  if (e = e.options, t) {
    t = {};
    for (var i = 0; i < n.length; i++) t["$" + n[i]] = !0;
    for (n = 0; n < e.length; n++) i = t.hasOwnProperty("$" + e[n].value), e[n].selected !== i && (e[n].selected = i), i && r && (e[n].defaultSelected = !0);
  } else {
    for (n = "" + Rn(n), t = null, i = 0; i < e.length; i++) {
      if (e[i].value === n) {
        e[i].selected = !0, r && (e[i].defaultSelected = !0);
        return;
      }
      t !== null || e[i].disabled || (t = e[i]);
    }
    t !== null && (t.selected = !0);
  }
}
function Wl(e, t) {
  if (t.dangerouslySetInnerHTML != null) throw Error(b(91));
  return ve({}, t, { value: void 0, defaultValue: void 0, children: "" + e._wrapperState.initialValue });
}
function M0(e, t) {
  var n = t.value;
  if (n == null) {
    if (n = t.children, t = t.defaultValue, n != null) {
      if (t != null) throw Error(b(92));
      if (vi(n)) {
        if (1 < n.length) throw Error(b(93));
        n = n[0];
      }
      t = n;
    }
    t == null && (t = ""), n = t;
  }
  e._wrapperState = { initialValue: Rn(n) };
}
function Px(e, t) {
  var n = Rn(t.value), r = Rn(t.defaultValue);
  n != null && (n = "" + n, n !== e.value && (e.value = n), t.defaultValue == null && e.defaultValue !== n && (e.defaultValue = n)), r != null && (e.defaultValue = "" + r);
}
function O0(e) {
  var t = e.textContent;
  t === e._wrapperState.initialValue && t !== "" && t !== null && (e.value = t);
}
function Nx(e) {
  switch (e) {
    case "svg":
      return "http://www.w3.org/2000/svg";
    case "math":
      return "http://www.w3.org/1998/Math/MathML";
    default:
      return "http://www.w3.org/1999/xhtml";
  }
}
function Bl(e, t) {
  return e == null || e === "http://www.w3.org/1999/xhtml" ? Nx(t) : e === "http://www.w3.org/2000/svg" && t === "foreignObject" ? "http://www.w3.org/1999/xhtml" : e;
}
var Da, Lx = function(e) {
  return typeof MSApp < "u" && MSApp.execUnsafeLocalFunction ? function(t, n, r, i) {
    MSApp.execUnsafeLocalFunction(function() {
      return e(t, n, r, i);
    });
  } : e;
}(function(e, t) {
  if (e.namespaceURI !== "http://www.w3.org/2000/svg" || "innerHTML" in e) e.innerHTML = t;
  else {
    for (Da = Da || document.createElement("div"), Da.innerHTML = "<svg>" + t.valueOf().toString() + "</svg>", t = Da.firstChild; e.firstChild; ) e.removeChild(e.firstChild);
    for (; t.firstChild; ) e.appendChild(t.firstChild);
  }
});
function qi(e, t) {
  if (t) {
    var n = e.firstChild;
    if (n && n === e.lastChild && n.nodeType === 3) {
      n.nodeValue = t;
      return;
    }
  }
  e.textContent = t;
}
var ki = {
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
}, E4 = ["Webkit", "ms", "Moz", "O"];
Object.keys(ki).forEach(function(e) {
  E4.forEach(function(t) {
    t = t + e.charAt(0).toUpperCase() + e.substring(1), ki[t] = ki[e];
  });
});
function Ix(e, t, n) {
  return t == null || typeof t == "boolean" || t === "" ? "" : n || typeof t != "number" || t === 0 || ki.hasOwnProperty(e) && ki[e] ? ("" + t).trim() : t + "px";
}
function Rx(e, t) {
  e = e.style;
  for (var n in t) if (t.hasOwnProperty(n)) {
    var r = n.indexOf("--") === 0, i = Ix(n, t[n], r);
    n === "float" && (n = "cssFloat"), r ? e.setProperty(n, i) : e[n] = i;
  }
}
var T4 = ve({ menuitem: !0 }, { area: !0, base: !0, br: !0, col: !0, embed: !0, hr: !0, img: !0, input: !0, keygen: !0, link: !0, meta: !0, param: !0, source: !0, track: !0, wbr: !0 });
function Ul(e, t) {
  if (t) {
    if (T4[e] && (t.children != null || t.dangerouslySetInnerHTML != null)) throw Error(b(137, e));
    if (t.dangerouslySetInnerHTML != null) {
      if (t.children != null) throw Error(b(60));
      if (typeof t.dangerouslySetInnerHTML != "object" || !("__html" in t.dangerouslySetInnerHTML)) throw Error(b(61));
    }
    if (t.style != null && typeof t.style != "object") throw Error(b(62));
  }
}
function Zl(e, t) {
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
var $l = null;
function ic(e) {
  return e = e.target || e.srcElement || window, e.correspondingUseElement && (e = e.correspondingUseElement), e.nodeType === 3 ? e.parentNode : e;
}
var Gl = null, Dr = null, Mr = null;
function H0(e) {
  if (e = Sa(e)) {
    if (typeof Gl != "function") throw Error(b(280));
    var t = e.stateNode;
    t && (t = Ss(t), Gl(e.stateNode, e.type, t));
  }
}
function Dx(e) {
  Dr ? Mr ? Mr.push(e) : Mr = [e] : Dr = e;
}
function Mx() {
  if (Dr) {
    var e = Dr, t = Mr;
    if (Mr = Dr = null, H0(e), t) for (e = 0; e < t.length; e++) H0(t[e]);
  }
}
function Ox(e, t) {
  return e(t);
}
function Hx() {
}
var Gs = !1;
function Ax(e, t, n) {
  if (Gs) return e(t, n);
  Gs = !0;
  try {
    return Ox(e, t, n);
  } finally {
    Gs = !1, (Dr !== null || Mr !== null) && (Hx(), Mx());
  }
}
function ea(e, t) {
  var n = e.stateNode;
  if (n === null) return null;
  var r = Ss(n);
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
var Yl = !1;
if (an) try {
  var si = {};
  Object.defineProperty(si, "passive", { get: function() {
    Yl = !0;
  } }), window.addEventListener("test", si, si), window.removeEventListener("test", si, si);
} catch {
  Yl = !1;
}
function P4(e, t, n, r, i, a, o, s, l) {
  var c = Array.prototype.slice.call(arguments, 3);
  try {
    t.apply(n, c);
  } catch (d) {
    this.onError(d);
  }
}
var Si = !1, No = null, Lo = !1, Xl = null, N4 = { onError: function(e) {
  Si = !0, No = e;
} };
function L4(e, t, n, r, i, a, o, s, l) {
  Si = !1, No = null, P4.apply(N4, arguments);
}
function I4(e, t, n, r, i, a, o, s, l) {
  if (L4.apply(this, arguments), Si) {
    if (Si) {
      var c = No;
      Si = !1, No = null;
    } else throw Error(b(198));
    Lo || (Lo = !0, Xl = c);
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
function jx(e) {
  if (e.tag === 13) {
    var t = e.memoizedState;
    if (t === null && (e = e.alternate, e !== null && (t = e.memoizedState)), t !== null) return t.dehydrated;
  }
  return null;
}
function A0(e) {
  if (sr(e) !== e) throw Error(b(188));
}
function R4(e) {
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
        if (a === n) return A0(i), e;
        if (a === r) return A0(i), t;
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
function Fx(e) {
  return e = R4(e), e !== null ? zx(e) : null;
}
function zx(e) {
  if (e.tag === 5 || e.tag === 6) return e;
  for (e = e.child; e !== null; ) {
    var t = zx(e);
    if (t !== null) return t;
    e = e.sibling;
  }
  return null;
}
var Vx = ut.unstable_scheduleCallback, j0 = ut.unstable_cancelCallback, D4 = ut.unstable_shouldYield, M4 = ut.unstable_requestPaint, we = ut.unstable_now, O4 = ut.unstable_getCurrentPriorityLevel, ac = ut.unstable_ImmediatePriority, Wx = ut.unstable_UserBlockingPriority, Io = ut.unstable_NormalPriority, H4 = ut.unstable_LowPriority, Bx = ut.unstable_IdlePriority, ys = null, Ut = null;
function A4(e) {
  if (Ut && typeof Ut.onCommitFiberRoot == "function") try {
    Ut.onCommitFiberRoot(ys, e, void 0, (e.current.flags & 128) === 128);
  } catch {
  }
}
var Lt = Math.clz32 ? Math.clz32 : z4, j4 = Math.log, F4 = Math.LN2;
function z4(e) {
  return e >>>= 0, e === 0 ? 32 : 31 - (j4(e) / F4 | 0) | 0;
}
var Ma = 64, Oa = 4194304;
function gi(e) {
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
function Ro(e, t) {
  var n = e.pendingLanes;
  if (n === 0) return 0;
  var r = 0, i = e.suspendedLanes, a = e.pingedLanes, o = n & 268435455;
  if (o !== 0) {
    var s = o & ~i;
    s !== 0 ? r = gi(s) : (a &= o, a !== 0 && (r = gi(a)));
  } else o = n & ~i, o !== 0 ? r = gi(o) : a !== 0 && (r = gi(a));
  if (r === 0) return 0;
  if (t !== 0 && t !== r && !(t & i) && (i = r & -r, a = t & -t, i >= a || i === 16 && (a & 4194240) !== 0)) return t;
  if (r & 4 && (r |= n & 16), t = e.entangledLanes, t !== 0) for (e = e.entanglements, t &= r; 0 < t; ) n = 31 - Lt(t), i = 1 << n, r |= e[n], t &= ~i;
  return r;
}
function V4(e, t) {
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
function W4(e, t) {
  for (var n = e.suspendedLanes, r = e.pingedLanes, i = e.expirationTimes, a = e.pendingLanes; 0 < a; ) {
    var o = 31 - Lt(a), s = 1 << o, l = i[o];
    l === -1 ? (!(s & n) || s & r) && (i[o] = V4(s, t)) : l <= t && (e.expiredLanes |= s), a &= ~s;
  }
}
function Ql(e) {
  return e = e.pendingLanes & -1073741825, e !== 0 ? e : e & 1073741824 ? 1073741824 : 0;
}
function Ux() {
  var e = Ma;
  return Ma <<= 1, !(Ma & 4194240) && (Ma = 64), e;
}
function Ys(e) {
  for (var t = [], n = 0; 31 > n; n++) t.push(e);
  return t;
}
function _a(e, t, n) {
  e.pendingLanes |= t, t !== 536870912 && (e.suspendedLanes = 0, e.pingedLanes = 0), e = e.eventTimes, t = 31 - Lt(t), e[t] = n;
}
function B4(e, t) {
  var n = e.pendingLanes & ~t;
  e.pendingLanes = t, e.suspendedLanes = 0, e.pingedLanes = 0, e.expiredLanes &= t, e.mutableReadLanes &= t, e.entangledLanes &= t, t = e.entanglements;
  var r = e.eventTimes;
  for (e = e.expirationTimes; 0 < n; ) {
    var i = 31 - Lt(n), a = 1 << i;
    t[i] = 0, r[i] = -1, e[i] = -1, n &= ~a;
  }
}
function oc(e, t) {
  var n = e.entangledLanes |= t;
  for (e = e.entanglements; n; ) {
    var r = 31 - Lt(n), i = 1 << r;
    i & t | e[r] & t && (e[r] |= t), n &= ~i;
  }
}
var re = 0;
function Zx(e) {
  return e &= -e, 1 < e ? 4 < e ? e & 268435455 ? 16 : 536870912 : 4 : 1;
}
var $x, sc, Gx, Yx, Xx, Jl = !1, Ha = [], wn = null, _n = null, kn = null, ta = /* @__PURE__ */ new Map(), na = /* @__PURE__ */ new Map(), hn = [], U4 = "mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit".split(" ");
function F0(e, t) {
  switch (e) {
    case "focusin":
    case "focusout":
      wn = null;
      break;
    case "dragenter":
    case "dragleave":
      _n = null;
      break;
    case "mouseover":
    case "mouseout":
      kn = null;
      break;
    case "pointerover":
    case "pointerout":
      ta.delete(t.pointerId);
      break;
    case "gotpointercapture":
    case "lostpointercapture":
      na.delete(t.pointerId);
  }
}
function li(e, t, n, r, i, a) {
  return e === null || e.nativeEvent !== a ? (e = { blockedOn: t, domEventName: n, eventSystemFlags: r, nativeEvent: a, targetContainers: [i] }, t !== null && (t = Sa(t), t !== null && sc(t)), e) : (e.eventSystemFlags |= r, t = e.targetContainers, i !== null && t.indexOf(i) === -1 && t.push(i), e);
}
function Z4(e, t, n, r, i) {
  switch (t) {
    case "focusin":
      return wn = li(wn, e, t, n, r, i), !0;
    case "dragenter":
      return _n = li(_n, e, t, n, r, i), !0;
    case "mouseover":
      return kn = li(kn, e, t, n, r, i), !0;
    case "pointerover":
      var a = i.pointerId;
      return ta.set(a, li(ta.get(a) || null, e, t, n, r, i)), !0;
    case "gotpointercapture":
      return a = i.pointerId, na.set(a, li(na.get(a) || null, e, t, n, r, i)), !0;
  }
  return !1;
}
function Qx(e) {
  var t = Zn(e.target);
  if (t !== null) {
    var n = sr(t);
    if (n !== null) {
      if (t = n.tag, t === 13) {
        if (t = jx(n), t !== null) {
          e.blockedOn = t, Xx(e.priority, function() {
            Gx(n);
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
function eo(e) {
  if (e.blockedOn !== null) return !1;
  for (var t = e.targetContainers; 0 < t.length; ) {
    var n = Kl(e.domEventName, e.eventSystemFlags, t[0], e.nativeEvent);
    if (n === null) {
      n = e.nativeEvent;
      var r = new n.constructor(n.type, n);
      $l = r, n.target.dispatchEvent(r), $l = null;
    } else return t = Sa(n), t !== null && sc(t), e.blockedOn = n, !1;
    t.shift();
  }
  return !0;
}
function z0(e, t, n) {
  eo(e) && n.delete(t);
}
function $4() {
  Jl = !1, wn !== null && eo(wn) && (wn = null), _n !== null && eo(_n) && (_n = null), kn !== null && eo(kn) && (kn = null), ta.forEach(z0), na.forEach(z0);
}
function ui(e, t) {
  e.blockedOn === t && (e.blockedOn = null, Jl || (Jl = !0, ut.unstable_scheduleCallback(ut.unstable_NormalPriority, $4)));
}
function ra(e) {
  function t(i) {
    return ui(i, e);
  }
  if (0 < Ha.length) {
    ui(Ha[0], e);
    for (var n = 1; n < Ha.length; n++) {
      var r = Ha[n];
      r.blockedOn === e && (r.blockedOn = null);
    }
  }
  for (wn !== null && ui(wn, e), _n !== null && ui(_n, e), kn !== null && ui(kn, e), ta.forEach(t), na.forEach(t), n = 0; n < hn.length; n++) r = hn[n], r.blockedOn === e && (r.blockedOn = null);
  for (; 0 < hn.length && (n = hn[0], n.blockedOn === null); ) Qx(n), n.blockedOn === null && hn.shift();
}
var Or = un.ReactCurrentBatchConfig, Do = !0;
function G4(e, t, n, r) {
  var i = re, a = Or.transition;
  Or.transition = null;
  try {
    re = 1, lc(e, t, n, r);
  } finally {
    re = i, Or.transition = a;
  }
}
function Y4(e, t, n, r) {
  var i = re, a = Or.transition;
  Or.transition = null;
  try {
    re = 4, lc(e, t, n, r);
  } finally {
    re = i, Or.transition = a;
  }
}
function lc(e, t, n, r) {
  if (Do) {
    var i = Kl(e, t, n, r);
    if (i === null) il(e, t, r, Mo, n), F0(e, r);
    else if (Z4(i, e, t, n, r)) r.stopPropagation();
    else if (F0(e, r), t & 4 && -1 < U4.indexOf(e)) {
      for (; i !== null; ) {
        var a = Sa(i);
        if (a !== null && $x(a), a = Kl(e, t, n, r), a === null && il(e, t, r, Mo, n), a === i) break;
        i = a;
      }
      i !== null && r.stopPropagation();
    } else il(e, t, r, null, n);
  }
}
var Mo = null;
function Kl(e, t, n, r) {
  if (Mo = null, e = ic(r), e = Zn(e), e !== null) if (t = sr(e), t === null) e = null;
  else if (n = t.tag, n === 13) {
    if (e = jx(t), e !== null) return e;
    e = null;
  } else if (n === 3) {
    if (t.stateNode.current.memoizedState.isDehydrated) return t.tag === 3 ? t.stateNode.containerInfo : null;
    e = null;
  } else t !== e && (e = null);
  return Mo = e, null;
}
function Jx(e) {
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
      switch (O4()) {
        case ac:
          return 1;
        case Wx:
          return 4;
        case Io:
        case H4:
          return 16;
        case Bx:
          return 536870912;
        default:
          return 16;
      }
    default:
      return 16;
  }
}
var gn = null, uc = null, to = null;
function Kx() {
  if (to) return to;
  var e, t = uc, n = t.length, r, i = "value" in gn ? gn.value : gn.textContent, a = i.length;
  for (e = 0; e < n && t[e] === i[e]; e++) ;
  var o = n - e;
  for (r = 1; r <= o && t[n - r] === i[a - r]; r++) ;
  return to = i.slice(e, 1 < r ? 1 - r : void 0);
}
function no(e) {
  var t = e.keyCode;
  return "charCode" in e ? (e = e.charCode, e === 0 && t === 13 && (e = 13)) : e = t, e === 10 && (e = 13), 32 <= e || e === 13 ? e : 0;
}
function Aa() {
  return !0;
}
function V0() {
  return !1;
}
function ft(e) {
  function t(n, r, i, a, o) {
    this._reactName = n, this._targetInst = i, this.type = r, this.nativeEvent = a, this.target = o, this.currentTarget = null;
    for (var s in e) e.hasOwnProperty(s) && (n = e[s], this[s] = n ? n(a) : a[s]);
    return this.isDefaultPrevented = (a.defaultPrevented != null ? a.defaultPrevented : a.returnValue === !1) ? Aa : V0, this.isPropagationStopped = V0, this;
  }
  return ve(t.prototype, { preventDefault: function() {
    this.defaultPrevented = !0;
    var n = this.nativeEvent;
    n && (n.preventDefault ? n.preventDefault() : typeof n.returnValue != "unknown" && (n.returnValue = !1), this.isDefaultPrevented = Aa);
  }, stopPropagation: function() {
    var n = this.nativeEvent;
    n && (n.stopPropagation ? n.stopPropagation() : typeof n.cancelBubble != "unknown" && (n.cancelBubble = !0), this.isPropagationStopped = Aa);
  }, persist: function() {
  }, isPersistent: Aa }), t;
}
var qr = { eventPhase: 0, bubbles: 0, cancelable: 0, timeStamp: function(e) {
  return e.timeStamp || Date.now();
}, defaultPrevented: 0, isTrusted: 0 }, cc = ft(qr), ka = ve({}, qr, { view: 0, detail: 0 }), X4 = ft(ka), Xs, Qs, ci, ws = ve({}, ka, { screenX: 0, screenY: 0, clientX: 0, clientY: 0, pageX: 0, pageY: 0, ctrlKey: 0, shiftKey: 0, altKey: 0, metaKey: 0, getModifierState: dc, button: 0, buttons: 0, relatedTarget: function(e) {
  return e.relatedTarget === void 0 ? e.fromElement === e.srcElement ? e.toElement : e.fromElement : e.relatedTarget;
}, movementX: function(e) {
  return "movementX" in e ? e.movementX : (e !== ci && (ci && e.type === "mousemove" ? (Xs = e.screenX - ci.screenX, Qs = e.screenY - ci.screenY) : Qs = Xs = 0, ci = e), Xs);
}, movementY: function(e) {
  return "movementY" in e ? e.movementY : Qs;
} }), W0 = ft(ws), Q4 = ve({}, ws, { dataTransfer: 0 }), J4 = ft(Q4), K4 = ve({}, ka, { relatedTarget: 0 }), Js = ft(K4), q4 = ve({}, qr, { animationName: 0, elapsedTime: 0, pseudoElement: 0 }), ew = ft(q4), tw = ve({}, qr, { clipboardData: function(e) {
  return "clipboardData" in e ? e.clipboardData : window.clipboardData;
} }), nw = ft(tw), rw = ve({}, qr, { data: 0 }), B0 = ft(rw), iw = {
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
}, aw = {
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
}, ow = { Alt: "altKey", Control: "ctrlKey", Meta: "metaKey", Shift: "shiftKey" };
function sw(e) {
  var t = this.nativeEvent;
  return t.getModifierState ? t.getModifierState(e) : (e = ow[e]) ? !!t[e] : !1;
}
function dc() {
  return sw;
}
var lw = ve({}, ka, { key: function(e) {
  if (e.key) {
    var t = iw[e.key] || e.key;
    if (t !== "Unidentified") return t;
  }
  return e.type === "keypress" ? (e = no(e), e === 13 ? "Enter" : String.fromCharCode(e)) : e.type === "keydown" || e.type === "keyup" ? aw[e.keyCode] || "Unidentified" : "";
}, code: 0, location: 0, ctrlKey: 0, shiftKey: 0, altKey: 0, metaKey: 0, repeat: 0, locale: 0, getModifierState: dc, charCode: function(e) {
  return e.type === "keypress" ? no(e) : 0;
}, keyCode: function(e) {
  return e.type === "keydown" || e.type === "keyup" ? e.keyCode : 0;
}, which: function(e) {
  return e.type === "keypress" ? no(e) : e.type === "keydown" || e.type === "keyup" ? e.keyCode : 0;
} }), uw = ft(lw), cw = ve({}, ws, { pointerId: 0, width: 0, height: 0, pressure: 0, tangentialPressure: 0, tiltX: 0, tiltY: 0, twist: 0, pointerType: 0, isPrimary: 0 }), U0 = ft(cw), dw = ve({}, ka, { touches: 0, targetTouches: 0, changedTouches: 0, altKey: 0, metaKey: 0, ctrlKey: 0, shiftKey: 0, getModifierState: dc }), fw = ft(dw), xw = ve({}, qr, { propertyName: 0, elapsedTime: 0, pseudoElement: 0 }), pw = ft(xw), hw = ve({}, ws, {
  deltaX: function(e) {
    return "deltaX" in e ? e.deltaX : "wheelDeltaX" in e ? -e.wheelDeltaX : 0;
  },
  deltaY: function(e) {
    return "deltaY" in e ? e.deltaY : "wheelDeltaY" in e ? -e.wheelDeltaY : "wheelDelta" in e ? -e.wheelDelta : 0;
  },
  deltaZ: 0,
  deltaMode: 0
}), mw = ft(hw), vw = [9, 13, 27, 32], fc = an && "CompositionEvent" in window, Ci = null;
an && "documentMode" in document && (Ci = document.documentMode);
var gw = an && "TextEvent" in window && !Ci, qx = an && (!fc || Ci && 8 < Ci && 11 >= Ci), Z0 = " ", $0 = !1;
function ep(e, t) {
  switch (e) {
    case "keyup":
      return vw.indexOf(t.keyCode) !== -1;
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
function tp(e) {
  return e = e.detail, typeof e == "object" && "data" in e ? e.data : null;
}
var wr = !1;
function yw(e, t) {
  switch (e) {
    case "compositionend":
      return tp(t);
    case "keypress":
      return t.which !== 32 ? null : ($0 = !0, Z0);
    case "textInput":
      return e = t.data, e === Z0 && $0 ? null : e;
    default:
      return null;
  }
}
function ww(e, t) {
  if (wr) return e === "compositionend" || !fc && ep(e, t) ? (e = Kx(), to = uc = gn = null, wr = !1, e) : null;
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
      return qx && t.locale !== "ko" ? null : t.data;
    default:
      return null;
  }
}
var _w = { color: !0, date: !0, datetime: !0, "datetime-local": !0, email: !0, month: !0, number: !0, password: !0, range: !0, search: !0, tel: !0, text: !0, time: !0, url: !0, week: !0 };
function G0(e) {
  var t = e && e.nodeName && e.nodeName.toLowerCase();
  return t === "input" ? !!_w[e.type] : t === "textarea";
}
function np(e, t, n, r) {
  Dx(r), t = Oo(t, "onChange"), 0 < t.length && (n = new cc("onChange", "change", null, n, r), e.push({ event: n, listeners: t }));
}
var bi = null, ia = null;
function kw(e) {
  xp(e, 0);
}
function _s(e) {
  var t = Sr(e);
  if (Ex(t)) return e;
}
function Sw(e, t) {
  if (e === "change") return t;
}
var rp = !1;
if (an) {
  var Ks;
  if (an) {
    var qs = "oninput" in document;
    if (!qs) {
      var Y0 = document.createElement("div");
      Y0.setAttribute("oninput", "return;"), qs = typeof Y0.oninput == "function";
    }
    Ks = qs;
  } else Ks = !1;
  rp = Ks && (!document.documentMode || 9 < document.documentMode);
}
function X0() {
  bi && (bi.detachEvent("onpropertychange", ip), ia = bi = null);
}
function ip(e) {
  if (e.propertyName === "value" && _s(ia)) {
    var t = [];
    np(t, ia, e, ic(e)), Ax(kw, t);
  }
}
function Cw(e, t, n) {
  e === "focusin" ? (X0(), bi = t, ia = n, bi.attachEvent("onpropertychange", ip)) : e === "focusout" && X0();
}
function bw(e) {
  if (e === "selectionchange" || e === "keyup" || e === "keydown") return _s(ia);
}
function Ew(e, t) {
  if (e === "click") return _s(t);
}
function Tw(e, t) {
  if (e === "input" || e === "change") return _s(t);
}
function Pw(e, t) {
  return e === t && (e !== 0 || 1 / e === 1 / t) || e !== e && t !== t;
}
var Dt = typeof Object.is == "function" ? Object.is : Pw;
function aa(e, t) {
  if (Dt(e, t)) return !0;
  if (typeof e != "object" || e === null || typeof t != "object" || t === null) return !1;
  var n = Object.keys(e), r = Object.keys(t);
  if (n.length !== r.length) return !1;
  for (r = 0; r < n.length; r++) {
    var i = n[r];
    if (!Ml.call(t, i) || !Dt(e[i], t[i])) return !1;
  }
  return !0;
}
function Q0(e) {
  for (; e && e.firstChild; ) e = e.firstChild;
  return e;
}
function J0(e, t) {
  var n = Q0(e);
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
    n = Q0(n);
  }
}
function ap(e, t) {
  return e && t ? e === t ? !0 : e && e.nodeType === 3 ? !1 : t && t.nodeType === 3 ? ap(e, t.parentNode) : "contains" in e ? e.contains(t) : e.compareDocumentPosition ? !!(e.compareDocumentPosition(t) & 16) : !1 : !1;
}
function op() {
  for (var e = window, t = Po(); t instanceof e.HTMLIFrameElement; ) {
    try {
      var n = typeof t.contentWindow.location.href == "string";
    } catch {
      n = !1;
    }
    if (n) e = t.contentWindow;
    else break;
    t = Po(e.document);
  }
  return t;
}
function xc(e) {
  var t = e && e.nodeName && e.nodeName.toLowerCase();
  return t && (t === "input" && (e.type === "text" || e.type === "search" || e.type === "tel" || e.type === "url" || e.type === "password") || t === "textarea" || e.contentEditable === "true");
}
function Nw(e) {
  var t = op(), n = e.focusedElem, r = e.selectionRange;
  if (t !== n && n && n.ownerDocument && ap(n.ownerDocument.documentElement, n)) {
    if (r !== null && xc(n)) {
      if (t = r.start, e = r.end, e === void 0 && (e = t), "selectionStart" in n) n.selectionStart = t, n.selectionEnd = Math.min(e, n.value.length);
      else if (e = (t = n.ownerDocument || document) && t.defaultView || window, e.getSelection) {
        e = e.getSelection();
        var i = n.textContent.length, a = Math.min(r.start, i);
        r = r.end === void 0 ? a : Math.min(r.end, i), !e.extend && a > r && (i = r, r = a, a = i), i = J0(n, a);
        var o = J0(
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
var Lw = an && "documentMode" in document && 11 >= document.documentMode, _r = null, ql = null, Ei = null, eu = !1;
function K0(e, t, n) {
  var r = n.window === n ? n.document : n.nodeType === 9 ? n : n.ownerDocument;
  eu || _r == null || _r !== Po(r) || (r = _r, "selectionStart" in r && xc(r) ? r = { start: r.selectionStart, end: r.selectionEnd } : (r = (r.ownerDocument && r.ownerDocument.defaultView || window).getSelection(), r = { anchorNode: r.anchorNode, anchorOffset: r.anchorOffset, focusNode: r.focusNode, focusOffset: r.focusOffset }), Ei && aa(Ei, r) || (Ei = r, r = Oo(ql, "onSelect"), 0 < r.length && (t = new cc("onSelect", "select", null, t, n), e.push({ event: t, listeners: r }), t.target = _r)));
}
function ja(e, t) {
  var n = {};
  return n[e.toLowerCase()] = t.toLowerCase(), n["Webkit" + e] = "webkit" + t, n["Moz" + e] = "moz" + t, n;
}
var kr = { animationend: ja("Animation", "AnimationEnd"), animationiteration: ja("Animation", "AnimationIteration"), animationstart: ja("Animation", "AnimationStart"), transitionend: ja("Transition", "TransitionEnd") }, el = {}, sp = {};
an && (sp = document.createElement("div").style, "AnimationEvent" in window || (delete kr.animationend.animation, delete kr.animationiteration.animation, delete kr.animationstart.animation), "TransitionEvent" in window || delete kr.transitionend.transition);
function ks(e) {
  if (el[e]) return el[e];
  if (!kr[e]) return e;
  var t = kr[e], n;
  for (n in t) if (t.hasOwnProperty(n) && n in sp) return el[e] = t[n];
  return e;
}
var lp = ks("animationend"), up = ks("animationiteration"), cp = ks("animationstart"), dp = ks("transitionend"), fp = /* @__PURE__ */ new Map(), q0 = "abort auxClick cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");
function On(e, t) {
  fp.set(e, t), or(t, [e]);
}
for (var tl = 0; tl < q0.length; tl++) {
  var nl = q0[tl], Iw = nl.toLowerCase(), Rw = nl[0].toUpperCase() + nl.slice(1);
  On(Iw, "on" + Rw);
}
On(lp, "onAnimationEnd");
On(up, "onAnimationIteration");
On(cp, "onAnimationStart");
On("dblclick", "onDoubleClick");
On("focusin", "onFocus");
On("focusout", "onBlur");
On(dp, "onTransitionEnd");
Ur("onMouseEnter", ["mouseout", "mouseover"]);
Ur("onMouseLeave", ["mouseout", "mouseover"]);
Ur("onPointerEnter", ["pointerout", "pointerover"]);
Ur("onPointerLeave", ["pointerout", "pointerover"]);
or("onChange", "change click focusin focusout input keydown keyup selectionchange".split(" "));
or("onSelect", "focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" "));
or("onBeforeInput", ["compositionend", "keypress", "textInput", "paste"]);
or("onCompositionEnd", "compositionend focusout keydown keypress keyup mousedown".split(" "));
or("onCompositionStart", "compositionstart focusout keydown keypress keyup mousedown".split(" "));
or("onCompositionUpdate", "compositionupdate focusout keydown keypress keyup mousedown".split(" "));
var yi = "abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" "), Dw = new Set("cancel close invalid load scroll toggle".split(" ").concat(yi));
function ed(e, t, n) {
  var r = e.type || "unknown-event";
  e.currentTarget = n, I4(r, t, void 0, e), e.currentTarget = null;
}
function xp(e, t) {
  t = (t & 4) !== 0;
  for (var n = 0; n < e.length; n++) {
    var r = e[n], i = r.event;
    r = r.listeners;
    e: {
      var a = void 0;
      if (t) for (var o = r.length - 1; 0 <= o; o--) {
        var s = r[o], l = s.instance, c = s.currentTarget;
        if (s = s.listener, l !== a && i.isPropagationStopped()) break e;
        ed(i, s, c), a = l;
      }
      else for (o = 0; o < r.length; o++) {
        if (s = r[o], l = s.instance, c = s.currentTarget, s = s.listener, l !== a && i.isPropagationStopped()) break e;
        ed(i, s, c), a = l;
      }
    }
  }
  if (Lo) throw e = Xl, Lo = !1, Xl = null, e;
}
function ce(e, t) {
  var n = t[au];
  n === void 0 && (n = t[au] = /* @__PURE__ */ new Set());
  var r = e + "__bubble";
  n.has(r) || (pp(t, e, 2, !1), n.add(r));
}
function rl(e, t, n) {
  var r = 0;
  t && (r |= 4), pp(n, e, r, t);
}
var Fa = "_reactListening" + Math.random().toString(36).slice(2);
function oa(e) {
  if (!e[Fa]) {
    e[Fa] = !0, _x.forEach(function(n) {
      n !== "selectionchange" && (Dw.has(n) || rl(n, !1, e), rl(n, !0, e));
    });
    var t = e.nodeType === 9 ? e : e.ownerDocument;
    t === null || t[Fa] || (t[Fa] = !0, rl("selectionchange", !1, t));
  }
}
function pp(e, t, n, r) {
  switch (Jx(t)) {
    case 1:
      var i = G4;
      break;
    case 4:
      i = Y4;
      break;
    default:
      i = lc;
  }
  n = i.bind(null, t, n, e), i = void 0, !Yl || t !== "touchstart" && t !== "touchmove" && t !== "wheel" || (i = !0), r ? i !== void 0 ? e.addEventListener(t, n, { capture: !0, passive: i }) : e.addEventListener(t, n, !0) : i !== void 0 ? e.addEventListener(t, n, { passive: i }) : e.addEventListener(t, n, !1);
}
function il(e, t, n, r, i) {
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
        if (o = Zn(s), o === null) return;
        if (l = o.tag, l === 5 || l === 6) {
          r = a = o;
          continue e;
        }
        s = s.parentNode;
      }
    }
    r = r.return;
  }
  Ax(function() {
    var c = a, d = ic(n), f = [];
    e: {
      var m = fp.get(e);
      if (m !== void 0) {
        var w = cc, y = e;
        switch (e) {
          case "keypress":
            if (no(n) === 0) break e;
          case "keydown":
          case "keyup":
            w = uw;
            break;
          case "focusin":
            y = "focus", w = Js;
            break;
          case "focusout":
            y = "blur", w = Js;
            break;
          case "beforeblur":
          case "afterblur":
            w = Js;
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
            w = W0;
            break;
          case "drag":
          case "dragend":
          case "dragenter":
          case "dragexit":
          case "dragleave":
          case "dragover":
          case "dragstart":
          case "drop":
            w = J4;
            break;
          case "touchcancel":
          case "touchend":
          case "touchmove":
          case "touchstart":
            w = fw;
            break;
          case lp:
          case up:
          case cp:
            w = ew;
            break;
          case dp:
            w = pw;
            break;
          case "scroll":
            w = X4;
            break;
          case "wheel":
            w = mw;
            break;
          case "copy":
          case "cut":
          case "paste":
            w = nw;
            break;
          case "gotpointercapture":
          case "lostpointercapture":
          case "pointercancel":
          case "pointerdown":
          case "pointermove":
          case "pointerout":
          case "pointerover":
          case "pointerup":
            w = U0;
        }
        var x = (t & 4) !== 0, _ = !x && e === "scroll", u = x ? m !== null ? m + "Capture" : null : m;
        x = [];
        for (var p = c, h; p !== null; ) {
          h = p;
          var g = h.stateNode;
          if (h.tag === 5 && g !== null && (h = g, u !== null && (g = ea(p, u), g != null && x.push(sa(p, g, h)))), _) break;
          p = p.return;
        }
        0 < x.length && (m = new w(m, y, null, n, d), f.push({ event: m, listeners: x }));
      }
    }
    if (!(t & 7)) {
      e: {
        if (m = e === "mouseover" || e === "pointerover", w = e === "mouseout" || e === "pointerout", m && n !== $l && (y = n.relatedTarget || n.fromElement) && (Zn(y) || y[on])) break e;
        if ((w || m) && (m = d.window === d ? d : (m = d.ownerDocument) ? m.defaultView || m.parentWindow : window, w ? (y = n.relatedTarget || n.toElement, w = c, y = y ? Zn(y) : null, y !== null && (_ = sr(y), y !== _ || y.tag !== 5 && y.tag !== 6) && (y = null)) : (w = null, y = c), w !== y)) {
          if (x = W0, g = "onMouseLeave", u = "onMouseEnter", p = "mouse", (e === "pointerout" || e === "pointerover") && (x = U0, g = "onPointerLeave", u = "onPointerEnter", p = "pointer"), _ = w == null ? m : Sr(w), h = y == null ? m : Sr(y), m = new x(g, p + "leave", w, n, d), m.target = _, m.relatedTarget = h, g = null, Zn(d) === c && (x = new x(u, p + "enter", y, n, d), x.target = h, x.relatedTarget = _, g = x), _ = g, w && y) t: {
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
          w !== null && td(f, m, w, x, !1), y !== null && _ !== null && td(f, _, y, x, !0);
        }
      }
      e: {
        if (m = c ? Sr(c) : window, w = m.nodeName && m.nodeName.toLowerCase(), w === "select" || w === "input" && m.type === "file") var k = Sw;
        else if (G0(m)) if (rp) k = Tw;
        else {
          k = bw;
          var C = Cw;
        }
        else (w = m.nodeName) && w.toLowerCase() === "input" && (m.type === "checkbox" || m.type === "radio") && (k = Ew);
        if (k && (k = k(e, c))) {
          np(f, k, n, d);
          break e;
        }
        C && C(e, m, c), e === "focusout" && (C = m._wrapperState) && C.controlled && m.type === "number" && Vl(m, "number", m.value);
      }
      switch (C = c ? Sr(c) : window, e) {
        case "focusin":
          (G0(C) || C.contentEditable === "true") && (_r = C, ql = c, Ei = null);
          break;
        case "focusout":
          Ei = ql = _r = null;
          break;
        case "mousedown":
          eu = !0;
          break;
        case "contextmenu":
        case "mouseup":
        case "dragend":
          eu = !1, K0(f, n, d);
          break;
        case "selectionchange":
          if (Lw) break;
        case "keydown":
        case "keyup":
          K0(f, n, d);
      }
      var S;
      if (fc) e: {
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
      else wr ? ep(e, n) && (L = "onCompositionEnd") : e === "keydown" && n.keyCode === 229 && (L = "onCompositionStart");
      L && (qx && n.locale !== "ko" && (wr || L !== "onCompositionStart" ? L === "onCompositionEnd" && wr && (S = Kx()) : (gn = d, uc = "value" in gn ? gn.value : gn.textContent, wr = !0)), C = Oo(c, L), 0 < C.length && (L = new B0(L, e, null, n, d), f.push({ event: L, listeners: C }), S ? L.data = S : (S = tp(n), S !== null && (L.data = S)))), (S = gw ? yw(e, n) : ww(e, n)) && (c = Oo(c, "onBeforeInput"), 0 < c.length && (d = new B0("onBeforeInput", "beforeinput", null, n, d), f.push({ event: d, listeners: c }), d.data = S));
    }
    xp(f, t);
  });
}
function sa(e, t, n) {
  return { instance: e, listener: t, currentTarget: n };
}
function Oo(e, t) {
  for (var n = t + "Capture", r = []; e !== null; ) {
    var i = e, a = i.stateNode;
    i.tag === 5 && a !== null && (i = a, a = ea(e, n), a != null && r.unshift(sa(e, a, i)), a = ea(e, t), a != null && r.push(sa(e, a, i))), e = e.return;
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
function td(e, t, n, r, i) {
  for (var a = t._reactName, o = []; n !== null && n !== r; ) {
    var s = n, l = s.alternate, c = s.stateNode;
    if (l !== null && l === r) break;
    s.tag === 5 && c !== null && (s = c, i ? (l = ea(n, a), l != null && o.unshift(sa(n, l, s))) : i || (l = ea(n, a), l != null && o.push(sa(n, l, s)))), n = n.return;
  }
  o.length !== 0 && e.push({ event: t, listeners: o });
}
var Mw = /\r\n?/g, Ow = /\u0000|\uFFFD/g;
function nd(e) {
  return (typeof e == "string" ? e : "" + e).replace(Mw, `
`).replace(Ow, "");
}
function za(e, t, n) {
  if (t = nd(t), nd(e) !== t && n) throw Error(b(425));
}
function Ho() {
}
var tu = null, nu = null;
function ru(e, t) {
  return e === "textarea" || e === "noscript" || typeof t.children == "string" || typeof t.children == "number" || typeof t.dangerouslySetInnerHTML == "object" && t.dangerouslySetInnerHTML !== null && t.dangerouslySetInnerHTML.__html != null;
}
var iu = typeof setTimeout == "function" ? setTimeout : void 0, Hw = typeof clearTimeout == "function" ? clearTimeout : void 0, rd = typeof Promise == "function" ? Promise : void 0, Aw = typeof queueMicrotask == "function" ? queueMicrotask : typeof rd < "u" ? function(e) {
  return rd.resolve(null).then(e).catch(jw);
} : iu;
function jw(e) {
  setTimeout(function() {
    throw e;
  });
}
function al(e, t) {
  var n = t, r = 0;
  do {
    var i = n.nextSibling;
    if (e.removeChild(n), i && i.nodeType === 8) if (n = i.data, n === "/$") {
      if (r === 0) {
        e.removeChild(i), ra(t);
        return;
      }
      r--;
    } else n !== "$" && n !== "$?" && n !== "$!" || r++;
    n = i;
  } while (n);
  ra(t);
}
function Sn(e) {
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
function id(e) {
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
var ei = Math.random().toString(36).slice(2), zt = "__reactFiber$" + ei, la = "__reactProps$" + ei, on = "__reactContainer$" + ei, au = "__reactEvents$" + ei, Fw = "__reactListeners$" + ei, zw = "__reactHandles$" + ei;
function Zn(e) {
  var t = e[zt];
  if (t) return t;
  for (var n = e.parentNode; n; ) {
    if (t = n[on] || n[zt]) {
      if (n = t.alternate, t.child !== null || n !== null && n.child !== null) for (e = id(e); e !== null; ) {
        if (n = e[zt]) return n;
        e = id(e);
      }
      return t;
    }
    e = n, n = e.parentNode;
  }
  return null;
}
function Sa(e) {
  return e = e[zt] || e[on], !e || e.tag !== 5 && e.tag !== 6 && e.tag !== 13 && e.tag !== 3 ? null : e;
}
function Sr(e) {
  if (e.tag === 5 || e.tag === 6) return e.stateNode;
  throw Error(b(33));
}
function Ss(e) {
  return e[la] || null;
}
var ou = [], Cr = -1;
function Hn(e) {
  return { current: e };
}
function de(e) {
  0 > Cr || (e.current = ou[Cr], ou[Cr] = null, Cr--);
}
function oe(e, t) {
  Cr++, ou[Cr] = e.current, e.current = t;
}
var Dn = {}, ze = Hn(Dn), Xe = Hn(!1), er = Dn;
function Zr(e, t) {
  var n = e.type.contextTypes;
  if (!n) return Dn;
  var r = e.stateNode;
  if (r && r.__reactInternalMemoizedUnmaskedChildContext === t) return r.__reactInternalMemoizedMaskedChildContext;
  var i = {}, a;
  for (a in n) i[a] = t[a];
  return r && (e = e.stateNode, e.__reactInternalMemoizedUnmaskedChildContext = t, e.__reactInternalMemoizedMaskedChildContext = i), i;
}
function Qe(e) {
  return e = e.childContextTypes, e != null;
}
function Ao() {
  de(Xe), de(ze);
}
function ad(e, t, n) {
  if (ze.current !== Dn) throw Error(b(168));
  oe(ze, t), oe(Xe, n);
}
function hp(e, t, n) {
  var r = e.stateNode;
  if (t = t.childContextTypes, typeof r.getChildContext != "function") return n;
  r = r.getChildContext();
  for (var i in r) if (!(i in t)) throw Error(b(108, C4(e) || "Unknown", i));
  return ve({}, n, r);
}
function jo(e) {
  return e = (e = e.stateNode) && e.__reactInternalMemoizedMergedChildContext || Dn, er = ze.current, oe(ze, e), oe(Xe, Xe.current), !0;
}
function od(e, t, n) {
  var r = e.stateNode;
  if (!r) throw Error(b(169));
  n ? (e = hp(e, t, er), r.__reactInternalMemoizedMergedChildContext = e, de(Xe), de(ze), oe(ze, e)) : de(Xe), oe(Xe, n);
}
var qt = null, Cs = !1, ol = !1;
function mp(e) {
  qt === null ? qt = [e] : qt.push(e);
}
function Vw(e) {
  Cs = !0, mp(e);
}
function An() {
  if (!ol && qt !== null) {
    ol = !0;
    var e = 0, t = re;
    try {
      var n = qt;
      for (re = 1; e < n.length; e++) {
        var r = n[e];
        do
          r = r(!0);
        while (r !== null);
      }
      qt = null, Cs = !1;
    } catch (i) {
      throw qt !== null && (qt = qt.slice(e + 1)), Vx(ac, An), i;
    } finally {
      re = t, ol = !1;
    }
  }
  return null;
}
var br = [], Er = 0, Fo = null, zo = 0, mt = [], vt = 0, tr = null, en = 1, tn = "";
function Vn(e, t) {
  br[Er++] = zo, br[Er++] = Fo, Fo = e, zo = t;
}
function vp(e, t, n) {
  mt[vt++] = en, mt[vt++] = tn, mt[vt++] = tr, tr = e;
  var r = en;
  e = tn;
  var i = 32 - Lt(r) - 1;
  r &= ~(1 << i), n += 1;
  var a = 32 - Lt(t) + i;
  if (30 < a) {
    var o = i - i % 5;
    a = (r & (1 << o) - 1).toString(32), r >>= o, i -= o, en = 1 << 32 - Lt(t) + i | n << i | r, tn = a + e;
  } else en = 1 << a | n << i | r, tn = e;
}
function pc(e) {
  e.return !== null && (Vn(e, 1), vp(e, 1, 0));
}
function hc(e) {
  for (; e === Fo; ) Fo = br[--Er], br[Er] = null, zo = br[--Er], br[Er] = null;
  for (; e === tr; ) tr = mt[--vt], mt[vt] = null, tn = mt[--vt], mt[vt] = null, en = mt[--vt], mt[vt] = null;
}
var lt = null, at = null, xe = !1, Tt = null;
function gp(e, t) {
  var n = gt(5, null, null, 0);
  n.elementType = "DELETED", n.stateNode = t, n.return = e, t = e.deletions, t === null ? (e.deletions = [n], e.flags |= 16) : t.push(n);
}
function sd(e, t) {
  switch (e.tag) {
    case 5:
      var n = e.type;
      return t = t.nodeType !== 1 || n.toLowerCase() !== t.nodeName.toLowerCase() ? null : t, t !== null ? (e.stateNode = t, lt = e, at = Sn(t.firstChild), !0) : !1;
    case 6:
      return t = e.pendingProps === "" || t.nodeType !== 3 ? null : t, t !== null ? (e.stateNode = t, lt = e, at = null, !0) : !1;
    case 13:
      return t = t.nodeType !== 8 ? null : t, t !== null ? (n = tr !== null ? { id: en, overflow: tn } : null, e.memoizedState = { dehydrated: t, treeContext: n, retryLane: 1073741824 }, n = gt(18, null, null, 0), n.stateNode = t, n.return = e, e.child = n, lt = e, at = null, !0) : !1;
    default:
      return !1;
  }
}
function su(e) {
  return (e.mode & 1) !== 0 && (e.flags & 128) === 0;
}
function lu(e) {
  if (xe) {
    var t = at;
    if (t) {
      var n = t;
      if (!sd(e, t)) {
        if (su(e)) throw Error(b(418));
        t = Sn(n.nextSibling);
        var r = lt;
        t && sd(e, t) ? gp(r, n) : (e.flags = e.flags & -4097 | 2, xe = !1, lt = e);
      }
    } else {
      if (su(e)) throw Error(b(418));
      e.flags = e.flags & -4097 | 2, xe = !1, lt = e;
    }
  }
}
function ld(e) {
  for (e = e.return; e !== null && e.tag !== 5 && e.tag !== 3 && e.tag !== 13; ) e = e.return;
  lt = e;
}
function Va(e) {
  if (e !== lt) return !1;
  if (!xe) return ld(e), xe = !0, !1;
  var t;
  if ((t = e.tag !== 3) && !(t = e.tag !== 5) && (t = e.type, t = t !== "head" && t !== "body" && !ru(e.type, e.memoizedProps)), t && (t = at)) {
    if (su(e)) throw yp(), Error(b(418));
    for (; t; ) gp(e, t), t = Sn(t.nextSibling);
  }
  if (ld(e), e.tag === 13) {
    if (e = e.memoizedState, e = e !== null ? e.dehydrated : null, !e) throw Error(b(317));
    e: {
      for (e = e.nextSibling, t = 0; e; ) {
        if (e.nodeType === 8) {
          var n = e.data;
          if (n === "/$") {
            if (t === 0) {
              at = Sn(e.nextSibling);
              break e;
            }
            t--;
          } else n !== "$" && n !== "$!" && n !== "$?" || t++;
        }
        e = e.nextSibling;
      }
      at = null;
    }
  } else at = lt ? Sn(e.stateNode.nextSibling) : null;
  return !0;
}
function yp() {
  for (var e = at; e; ) e = Sn(e.nextSibling);
}
function $r() {
  at = lt = null, xe = !1;
}
function mc(e) {
  Tt === null ? Tt = [e] : Tt.push(e);
}
var Ww = un.ReactCurrentBatchConfig;
function di(e, t, n) {
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
function Wa(e, t) {
  throw e = Object.prototype.toString.call(t), Error(b(31, e === "[object Object]" ? "object with keys {" + Object.keys(t).join(", ") + "}" : e));
}
function ud(e) {
  var t = e._init;
  return t(e._payload);
}
function wp(e) {
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
    return u = Tn(u, p), u.index = 0, u.sibling = null, u;
  }
  function a(u, p, h) {
    return u.index = h, e ? (h = u.alternate, h !== null ? (h = h.index, h < p ? (u.flags |= 2, p) : h) : (u.flags |= 2, p)) : (u.flags |= 1048576, p);
  }
  function o(u) {
    return e && u.alternate === null && (u.flags |= 2), u;
  }
  function s(u, p, h, g) {
    return p === null || p.tag !== 6 ? (p = xl(h, u.mode, g), p.return = u, p) : (p = i(p, h), p.return = u, p);
  }
  function l(u, p, h, g) {
    var k = h.type;
    return k === yr ? d(u, p, h.props.children, g, h.key) : p !== null && (p.elementType === k || typeof k == "object" && k !== null && k.$$typeof === fn && ud(k) === p.type) ? (g = i(p, h.props), g.ref = di(u, p, h), g.return = u, g) : (g = uo(h.type, h.key, h.props, null, u.mode, g), g.ref = di(u, p, h), g.return = u, g);
  }
  function c(u, p, h, g) {
    return p === null || p.tag !== 4 || p.stateNode.containerInfo !== h.containerInfo || p.stateNode.implementation !== h.implementation ? (p = pl(h, u.mode, g), p.return = u, p) : (p = i(p, h.children || []), p.return = u, p);
  }
  function d(u, p, h, g, k) {
    return p === null || p.tag !== 7 ? (p = Qn(h, u.mode, g, k), p.return = u, p) : (p = i(p, h), p.return = u, p);
  }
  function f(u, p, h) {
    if (typeof p == "string" && p !== "" || typeof p == "number") return p = xl("" + p, u.mode, h), p.return = u, p;
    if (typeof p == "object" && p !== null) {
      switch (p.$$typeof) {
        case Ia:
          return h = uo(p.type, p.key, p.props, null, u.mode, h), h.ref = di(u, null, p), h.return = u, h;
        case gr:
          return p = pl(p, u.mode, h), p.return = u, p;
        case fn:
          var g = p._init;
          return f(u, g(p._payload), h);
      }
      if (vi(p) || oi(p)) return p = Qn(p, u.mode, h, null), p.return = u, p;
      Wa(u, p);
    }
    return null;
  }
  function m(u, p, h, g) {
    var k = p !== null ? p.key : null;
    if (typeof h == "string" && h !== "" || typeof h == "number") return k !== null ? null : s(u, p, "" + h, g);
    if (typeof h == "object" && h !== null) {
      switch (h.$$typeof) {
        case Ia:
          return h.key === k ? l(u, p, h, g) : null;
        case gr:
          return h.key === k ? c(u, p, h, g) : null;
        case fn:
          return k = h._init, m(
            u,
            p,
            k(h._payload),
            g
          );
      }
      if (vi(h) || oi(h)) return k !== null ? null : d(u, p, h, g, null);
      Wa(u, h);
    }
    return null;
  }
  function w(u, p, h, g, k) {
    if (typeof g == "string" && g !== "" || typeof g == "number") return u = u.get(h) || null, s(p, u, "" + g, k);
    if (typeof g == "object" && g !== null) {
      switch (g.$$typeof) {
        case Ia:
          return u = u.get(g.key === null ? h : g.key) || null, l(p, u, g, k);
        case gr:
          return u = u.get(g.key === null ? h : g.key) || null, c(p, u, g, k);
        case fn:
          var C = g._init;
          return w(u, p, h, C(g._payload), k);
      }
      if (vi(g) || oi(g)) return u = u.get(h) || null, d(p, u, g, k, null);
      Wa(p, g);
    }
    return null;
  }
  function y(u, p, h, g) {
    for (var k = null, C = null, S = p, L = p = 0, O = null; S !== null && L < h.length; L++) {
      S.index > L ? (O = S, S = null) : O = S.sibling;
      var T = m(u, S, h[L], g);
      if (T === null) {
        S === null && (S = O);
        break;
      }
      e && S && T.alternate === null && t(u, S), p = a(T, p, L), C === null ? k = T : C.sibling = T, C = T, S = O;
    }
    if (L === h.length) return n(u, S), xe && Vn(u, L), k;
    if (S === null) {
      for (; L < h.length; L++) S = f(u, h[L], g), S !== null && (p = a(S, p, L), C === null ? k = S : C.sibling = S, C = S);
      return xe && Vn(u, L), k;
    }
    for (S = r(u, S); L < h.length; L++) O = w(S, u, L, h[L], g), O !== null && (e && O.alternate !== null && S.delete(O.key === null ? L : O.key), p = a(O, p, L), C === null ? k = O : C.sibling = O, C = O);
    return e && S.forEach(function(A) {
      return t(u, A);
    }), xe && Vn(u, L), k;
  }
  function x(u, p, h, g) {
    var k = oi(h);
    if (typeof k != "function") throw Error(b(150));
    if (h = k.call(h), h == null) throw Error(b(151));
    for (var C = k = null, S = p, L = p = 0, O = null, T = h.next(); S !== null && !T.done; L++, T = h.next()) {
      S.index > L ? (O = S, S = null) : O = S.sibling;
      var A = m(u, S, T.value, g);
      if (A === null) {
        S === null && (S = O);
        break;
      }
      e && S && A.alternate === null && t(u, S), p = a(A, p, L), C === null ? k = A : C.sibling = A, C = A, S = O;
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
        case Ia:
          e: {
            for (var k = h.key, C = p; C !== null; ) {
              if (C.key === k) {
                if (k = h.type, k === yr) {
                  if (C.tag === 7) {
                    n(u, C.sibling), p = i(C, h.props.children), p.return = u, u = p;
                    break e;
                  }
                } else if (C.elementType === k || typeof k == "object" && k !== null && k.$$typeof === fn && ud(k) === C.type) {
                  n(u, C.sibling), p = i(C, h.props), p.ref = di(u, C, h), p.return = u, u = p;
                  break e;
                }
                n(u, C);
                break;
              } else t(u, C);
              C = C.sibling;
            }
            h.type === yr ? (p = Qn(h.props.children, u.mode, g, h.key), p.return = u, u = p) : (g = uo(h.type, h.key, h.props, null, u.mode, g), g.ref = di(u, p, h), g.return = u, u = g);
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
            p = pl(h, u.mode, g), p.return = u, u = p;
          }
          return o(u);
        case fn:
          return C = h._init, _(u, p, C(h._payload), g);
      }
      if (vi(h)) return y(u, p, h, g);
      if (oi(h)) return x(u, p, h, g);
      Wa(u, h);
    }
    return typeof h == "string" && h !== "" || typeof h == "number" ? (h = "" + h, p !== null && p.tag === 6 ? (n(u, p.sibling), p = i(p, h), p.return = u, u = p) : (n(u, p), p = xl(h, u.mode, g), p.return = u, u = p), o(u)) : n(u, p);
  }
  return _;
}
var Gr = wp(!0), _p = wp(!1), Vo = Hn(null), Wo = null, Tr = null, vc = null;
function gc() {
  vc = Tr = Wo = null;
}
function yc(e) {
  var t = Vo.current;
  de(Vo), e._currentValue = t;
}
function uu(e, t, n) {
  for (; e !== null; ) {
    var r = e.alternate;
    if ((e.childLanes & t) !== t ? (e.childLanes |= t, r !== null && (r.childLanes |= t)) : r !== null && (r.childLanes & t) !== t && (r.childLanes |= t), e === n) break;
    e = e.return;
  }
}
function Hr(e, t) {
  Wo = e, vc = Tr = null, e = e.dependencies, e !== null && e.firstContext !== null && (e.lanes & t && (Ye = !0), e.firstContext = null);
}
function wt(e) {
  var t = e._currentValue;
  if (vc !== e) if (e = { context: e, memoizedValue: t, next: null }, Tr === null) {
    if (Wo === null) throw Error(b(308));
    Tr = e, Wo.dependencies = { lanes: 0, firstContext: e };
  } else Tr = Tr.next = e;
  return t;
}
var $n = null;
function wc(e) {
  $n === null ? $n = [e] : $n.push(e);
}
function kp(e, t, n, r) {
  var i = t.interleaved;
  return i === null ? (n.next = n, wc(t)) : (n.next = i.next, i.next = n), t.interleaved = n, sn(e, r);
}
function sn(e, t) {
  e.lanes |= t;
  var n = e.alternate;
  for (n !== null && (n.lanes |= t), n = e, e = e.return; e !== null; ) e.childLanes |= t, n = e.alternate, n !== null && (n.childLanes |= t), n = e, e = e.return;
  return n.tag === 3 ? n.stateNode : null;
}
var xn = !1;
function _c(e) {
  e.updateQueue = { baseState: e.memoizedState, firstBaseUpdate: null, lastBaseUpdate: null, shared: { pending: null, interleaved: null, lanes: 0 }, effects: null };
}
function Sp(e, t) {
  e = e.updateQueue, t.updateQueue === e && (t.updateQueue = { baseState: e.baseState, firstBaseUpdate: e.firstBaseUpdate, lastBaseUpdate: e.lastBaseUpdate, shared: e.shared, effects: e.effects });
}
function nn(e, t) {
  return { eventTime: e, lane: t, tag: 0, payload: null, callback: null, next: null };
}
function Cn(e, t, n) {
  var r = e.updateQueue;
  if (r === null) return null;
  if (r = r.shared, J & 2) {
    var i = r.pending;
    return i === null ? t.next = t : (t.next = i.next, i.next = t), r.pending = t, sn(e, n);
  }
  return i = r.interleaved, i === null ? (t.next = t, wc(r)) : (t.next = i.next, i.next = t), r.interleaved = t, sn(e, n);
}
function ro(e, t, n) {
  if (t = t.updateQueue, t !== null && (t = t.shared, (n & 4194240) !== 0)) {
    var r = t.lanes;
    r &= e.pendingLanes, n |= r, t.lanes = n, oc(e, n);
  }
}
function cd(e, t) {
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
function Bo(e, t, n, r) {
  var i = e.updateQueue;
  xn = !1;
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
              xn = !0;
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
function dd(e, t, n) {
  if (e = t.effects, t.effects = null, e !== null) for (t = 0; t < e.length; t++) {
    var r = e[t], i = r.callback;
    if (i !== null) {
      if (r.callback = null, r = n, typeof i != "function") throw Error(b(191, i));
      i.call(r);
    }
  }
}
var Ca = {}, Zt = Hn(Ca), ua = Hn(Ca), ca = Hn(Ca);
function Gn(e) {
  if (e === Ca) throw Error(b(174));
  return e;
}
function kc(e, t) {
  switch (oe(ca, t), oe(ua, e), oe(Zt, Ca), e = t.nodeType, e) {
    case 9:
    case 11:
      t = (t = t.documentElement) ? t.namespaceURI : Bl(null, "");
      break;
    default:
      e = e === 8 ? t.parentNode : t, t = e.namespaceURI || null, e = e.tagName, t = Bl(t, e);
  }
  de(Zt), oe(Zt, t);
}
function Yr() {
  de(Zt), de(ua), de(ca);
}
function Cp(e) {
  Gn(ca.current);
  var t = Gn(Zt.current), n = Bl(t, e.type);
  t !== n && (oe(ua, e), oe(Zt, n));
}
function Sc(e) {
  ua.current === e && (de(Zt), de(ua));
}
var he = Hn(0);
function Uo(e) {
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
var sl = [];
function Cc() {
  for (var e = 0; e < sl.length; e++) sl[e]._workInProgressVersionPrimary = null;
  sl.length = 0;
}
var io = un.ReactCurrentDispatcher, ll = un.ReactCurrentBatchConfig, nr = 0, me = null, Ce = null, Te = null, Zo = !1, Ti = !1, da = 0, Bw = 0;
function Me() {
  throw Error(b(321));
}
function bc(e, t) {
  if (t === null) return !1;
  for (var n = 0; n < t.length && n < e.length; n++) if (!Dt(e[n], t[n])) return !1;
  return !0;
}
function Ec(e, t, n, r, i, a) {
  if (nr = a, me = t, t.memoizedState = null, t.updateQueue = null, t.lanes = 0, io.current = e === null || e.memoizedState === null ? Gw : Yw, e = n(r, i), Ti) {
    a = 0;
    do {
      if (Ti = !1, da = 0, 25 <= a) throw Error(b(301));
      a += 1, Te = Ce = null, t.updateQueue = null, io.current = Xw, e = n(r, i);
    } while (Ti);
  }
  if (io.current = $o, t = Ce !== null && Ce.next !== null, nr = 0, Te = Ce = me = null, Zo = !1, t) throw Error(b(300));
  return e;
}
function Tc() {
  var e = da !== 0;
  return da = 0, e;
}
function Ht() {
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
function fa(e, t) {
  return typeof t == "function" ? t(e) : t;
}
function ul(e) {
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
function cl(e) {
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
function bp() {
}
function Ep(e, t) {
  var n = me, r = _t(), i = t(), a = !Dt(r.memoizedState, i);
  if (a && (r.memoizedState = i, Ye = !0), r = r.queue, Pc(Np.bind(null, n, r, e), [e]), r.getSnapshot !== t || a || Te !== null && Te.memoizedState.tag & 1) {
    if (n.flags |= 2048, xa(9, Pp.bind(null, n, r, i, t), void 0, null), Pe === null) throw Error(b(349));
    nr & 30 || Tp(n, t, i);
  }
  return i;
}
function Tp(e, t, n) {
  e.flags |= 16384, e = { getSnapshot: t, value: n }, t = me.updateQueue, t === null ? (t = { lastEffect: null, stores: null }, me.updateQueue = t, t.stores = [e]) : (n = t.stores, n === null ? t.stores = [e] : n.push(e));
}
function Pp(e, t, n, r) {
  t.value = n, t.getSnapshot = r, Lp(t) && Ip(e);
}
function Np(e, t, n) {
  return n(function() {
    Lp(t) && Ip(e);
  });
}
function Lp(e) {
  var t = e.getSnapshot;
  e = e.value;
  try {
    var n = t();
    return !Dt(e, n);
  } catch {
    return !0;
  }
}
function Ip(e) {
  var t = sn(e, 1);
  t !== null && It(t, e, 1, -1);
}
function fd(e) {
  var t = Ht();
  return typeof e == "function" && (e = e()), t.memoizedState = t.baseState = e, e = { pending: null, interleaved: null, lanes: 0, dispatch: null, lastRenderedReducer: fa, lastRenderedState: e }, t.queue = e, e = e.dispatch = $w.bind(null, me, e), [t.memoizedState, e];
}
function xa(e, t, n, r) {
  return e = { tag: e, create: t, destroy: n, deps: r, next: null }, t = me.updateQueue, t === null ? (t = { lastEffect: null, stores: null }, me.updateQueue = t, t.lastEffect = e.next = e) : (n = t.lastEffect, n === null ? t.lastEffect = e.next = e : (r = n.next, n.next = e, e.next = r, t.lastEffect = e)), e;
}
function Rp() {
  return _t().memoizedState;
}
function ao(e, t, n, r) {
  var i = Ht();
  me.flags |= e, i.memoizedState = xa(1 | t, n, void 0, r === void 0 ? null : r);
}
function bs(e, t, n, r) {
  var i = _t();
  r = r === void 0 ? null : r;
  var a = void 0;
  if (Ce !== null) {
    var o = Ce.memoizedState;
    if (a = o.destroy, r !== null && bc(r, o.deps)) {
      i.memoizedState = xa(t, n, a, r);
      return;
    }
  }
  me.flags |= e, i.memoizedState = xa(1 | t, n, a, r);
}
function xd(e, t) {
  return ao(8390656, 8, e, t);
}
function Pc(e, t) {
  return bs(2048, 8, e, t);
}
function Dp(e, t) {
  return bs(4, 2, e, t);
}
function Mp(e, t) {
  return bs(4, 4, e, t);
}
function Op(e, t) {
  if (typeof t == "function") return e = e(), t(e), function() {
    t(null);
  };
  if (t != null) return e = e(), t.current = e, function() {
    t.current = null;
  };
}
function Hp(e, t, n) {
  return n = n != null ? n.concat([e]) : null, bs(4, 4, Op.bind(null, t, e), n);
}
function Nc() {
}
function Ap(e, t) {
  var n = _t();
  t = t === void 0 ? null : t;
  var r = n.memoizedState;
  return r !== null && t !== null && bc(t, r[1]) ? r[0] : (n.memoizedState = [e, t], e);
}
function jp(e, t) {
  var n = _t();
  t = t === void 0 ? null : t;
  var r = n.memoizedState;
  return r !== null && t !== null && bc(t, r[1]) ? r[0] : (e = e(), n.memoizedState = [e, t], e);
}
function Fp(e, t, n) {
  return nr & 21 ? (Dt(n, t) || (n = Ux(), me.lanes |= n, rr |= n, e.baseState = !0), t) : (e.baseState && (e.baseState = !1, Ye = !0), e.memoizedState = n);
}
function Uw(e, t) {
  var n = re;
  re = n !== 0 && 4 > n ? n : 4, e(!0);
  var r = ll.transition;
  ll.transition = {};
  try {
    e(!1), t();
  } finally {
    re = n, ll.transition = r;
  }
}
function zp() {
  return _t().memoizedState;
}
function Zw(e, t, n) {
  var r = En(e);
  if (n = { lane: r, action: n, hasEagerState: !1, eagerState: null, next: null }, Vp(e)) Wp(t, n);
  else if (n = kp(e, t, n, r), n !== null) {
    var i = Be();
    It(n, e, r, i), Bp(n, t, r);
  }
}
function $w(e, t, n) {
  var r = En(e), i = { lane: r, action: n, hasEagerState: !1, eagerState: null, next: null };
  if (Vp(e)) Wp(t, i);
  else {
    var a = e.alternate;
    if (e.lanes === 0 && (a === null || a.lanes === 0) && (a = t.lastRenderedReducer, a !== null)) try {
      var o = t.lastRenderedState, s = a(o, n);
      if (i.hasEagerState = !0, i.eagerState = s, Dt(s, o)) {
        var l = t.interleaved;
        l === null ? (i.next = i, wc(t)) : (i.next = l.next, l.next = i), t.interleaved = i;
        return;
      }
    } catch {
    } finally {
    }
    n = kp(e, t, i, r), n !== null && (i = Be(), It(n, e, r, i), Bp(n, t, r));
  }
}
function Vp(e) {
  var t = e.alternate;
  return e === me || t !== null && t === me;
}
function Wp(e, t) {
  Ti = Zo = !0;
  var n = e.pending;
  n === null ? t.next = t : (t.next = n.next, n.next = t), e.pending = t;
}
function Bp(e, t, n) {
  if (n & 4194240) {
    var r = t.lanes;
    r &= e.pendingLanes, n |= r, t.lanes = n, oc(e, n);
  }
}
var $o = { readContext: wt, useCallback: Me, useContext: Me, useEffect: Me, useImperativeHandle: Me, useInsertionEffect: Me, useLayoutEffect: Me, useMemo: Me, useReducer: Me, useRef: Me, useState: Me, useDebugValue: Me, useDeferredValue: Me, useTransition: Me, useMutableSource: Me, useSyncExternalStore: Me, useId: Me, unstable_isNewReconciler: !1 }, Gw = { readContext: wt, useCallback: function(e, t) {
  return Ht().memoizedState = [e, t === void 0 ? null : t], e;
}, useContext: wt, useEffect: xd, useImperativeHandle: function(e, t, n) {
  return n = n != null ? n.concat([e]) : null, ao(
    4194308,
    4,
    Op.bind(null, t, e),
    n
  );
}, useLayoutEffect: function(e, t) {
  return ao(4194308, 4, e, t);
}, useInsertionEffect: function(e, t) {
  return ao(4, 2, e, t);
}, useMemo: function(e, t) {
  var n = Ht();
  return t = t === void 0 ? null : t, e = e(), n.memoizedState = [e, t], e;
}, useReducer: function(e, t, n) {
  var r = Ht();
  return t = n !== void 0 ? n(t) : t, r.memoizedState = r.baseState = t, e = { pending: null, interleaved: null, lanes: 0, dispatch: null, lastRenderedReducer: e, lastRenderedState: t }, r.queue = e, e = e.dispatch = Zw.bind(null, me, e), [r.memoizedState, e];
}, useRef: function(e) {
  var t = Ht();
  return e = { current: e }, t.memoizedState = e;
}, useState: fd, useDebugValue: Nc, useDeferredValue: function(e) {
  return Ht().memoizedState = e;
}, useTransition: function() {
  var e = fd(!1), t = e[0];
  return e = Uw.bind(null, e[1]), Ht().memoizedState = e, [t, e];
}, useMutableSource: function() {
}, useSyncExternalStore: function(e, t, n) {
  var r = me, i = Ht();
  if (xe) {
    if (n === void 0) throw Error(b(407));
    n = n();
  } else {
    if (n = t(), Pe === null) throw Error(b(349));
    nr & 30 || Tp(r, t, n);
  }
  i.memoizedState = n;
  var a = { value: n, getSnapshot: t };
  return i.queue = a, xd(Np.bind(
    null,
    r,
    a,
    e
  ), [e]), r.flags |= 2048, xa(9, Pp.bind(null, r, a, n, t), void 0, null), n;
}, useId: function() {
  var e = Ht(), t = Pe.identifierPrefix;
  if (xe) {
    var n = tn, r = en;
    n = (r & ~(1 << 32 - Lt(r) - 1)).toString(32) + n, t = ":" + t + "R" + n, n = da++, 0 < n && (t += "H" + n.toString(32)), t += ":";
  } else n = Bw++, t = ":" + t + "r" + n.toString(32) + ":";
  return e.memoizedState = t;
}, unstable_isNewReconciler: !1 }, Yw = {
  readContext: wt,
  useCallback: Ap,
  useContext: wt,
  useEffect: Pc,
  useImperativeHandle: Hp,
  useInsertionEffect: Dp,
  useLayoutEffect: Mp,
  useMemo: jp,
  useReducer: ul,
  useRef: Rp,
  useState: function() {
    return ul(fa);
  },
  useDebugValue: Nc,
  useDeferredValue: function(e) {
    var t = _t();
    return Fp(t, Ce.memoizedState, e);
  },
  useTransition: function() {
    var e = ul(fa)[0], t = _t().memoizedState;
    return [e, t];
  },
  useMutableSource: bp,
  useSyncExternalStore: Ep,
  useId: zp,
  unstable_isNewReconciler: !1
}, Xw = { readContext: wt, useCallback: Ap, useContext: wt, useEffect: Pc, useImperativeHandle: Hp, useInsertionEffect: Dp, useLayoutEffect: Mp, useMemo: jp, useReducer: cl, useRef: Rp, useState: function() {
  return cl(fa);
}, useDebugValue: Nc, useDeferredValue: function(e) {
  var t = _t();
  return Ce === null ? t.memoizedState = e : Fp(t, Ce.memoizedState, e);
}, useTransition: function() {
  var e = cl(fa)[0], t = _t().memoizedState;
  return [e, t];
}, useMutableSource: bp, useSyncExternalStore: Ep, useId: zp, unstable_isNewReconciler: !1 };
function bt(e, t) {
  if (e && e.defaultProps) {
    t = ve({}, t), e = e.defaultProps;
    for (var n in e) t[n] === void 0 && (t[n] = e[n]);
    return t;
  }
  return t;
}
function cu(e, t, n, r) {
  t = e.memoizedState, n = n(r, t), n = n == null ? t : ve({}, t, n), e.memoizedState = n, e.lanes === 0 && (e.updateQueue.baseState = n);
}
var Es = { isMounted: function(e) {
  return (e = e._reactInternals) ? sr(e) === e : !1;
}, enqueueSetState: function(e, t, n) {
  e = e._reactInternals;
  var r = Be(), i = En(e), a = nn(r, i);
  a.payload = t, n != null && (a.callback = n), t = Cn(e, a, i), t !== null && (It(t, e, i, r), ro(t, e, i));
}, enqueueReplaceState: function(e, t, n) {
  e = e._reactInternals;
  var r = Be(), i = En(e), a = nn(r, i);
  a.tag = 1, a.payload = t, n != null && (a.callback = n), t = Cn(e, a, i), t !== null && (It(t, e, i, r), ro(t, e, i));
}, enqueueForceUpdate: function(e, t) {
  e = e._reactInternals;
  var n = Be(), r = En(e), i = nn(n, r);
  i.tag = 2, t != null && (i.callback = t), t = Cn(e, i, r), t !== null && (It(t, e, r, n), ro(t, e, r));
} };
function pd(e, t, n, r, i, a, o) {
  return e = e.stateNode, typeof e.shouldComponentUpdate == "function" ? e.shouldComponentUpdate(r, a, o) : t.prototype && t.prototype.isPureReactComponent ? !aa(n, r) || !aa(i, a) : !0;
}
function Up(e, t, n) {
  var r = !1, i = Dn, a = t.contextType;
  return typeof a == "object" && a !== null ? a = wt(a) : (i = Qe(t) ? er : ze.current, r = t.contextTypes, a = (r = r != null) ? Zr(e, i) : Dn), t = new t(n, a), e.memoizedState = t.state !== null && t.state !== void 0 ? t.state : null, t.updater = Es, e.stateNode = t, t._reactInternals = e, r && (e = e.stateNode, e.__reactInternalMemoizedUnmaskedChildContext = i, e.__reactInternalMemoizedMaskedChildContext = a), t;
}
function hd(e, t, n, r) {
  e = t.state, typeof t.componentWillReceiveProps == "function" && t.componentWillReceiveProps(n, r), typeof t.UNSAFE_componentWillReceiveProps == "function" && t.UNSAFE_componentWillReceiveProps(n, r), t.state !== e && Es.enqueueReplaceState(t, t.state, null);
}
function du(e, t, n, r) {
  var i = e.stateNode;
  i.props = n, i.state = e.memoizedState, i.refs = {}, _c(e);
  var a = t.contextType;
  typeof a == "object" && a !== null ? i.context = wt(a) : (a = Qe(t) ? er : ze.current, i.context = Zr(e, a)), i.state = e.memoizedState, a = t.getDerivedStateFromProps, typeof a == "function" && (cu(e, t, a, n), i.state = e.memoizedState), typeof t.getDerivedStateFromProps == "function" || typeof i.getSnapshotBeforeUpdate == "function" || typeof i.UNSAFE_componentWillMount != "function" && typeof i.componentWillMount != "function" || (t = i.state, typeof i.componentWillMount == "function" && i.componentWillMount(), typeof i.UNSAFE_componentWillMount == "function" && i.UNSAFE_componentWillMount(), t !== i.state && Es.enqueueReplaceState(i, i.state, null), Bo(e, n, i, r), i.state = e.memoizedState), typeof i.componentDidMount == "function" && (e.flags |= 4194308);
}
function Xr(e, t) {
  try {
    var n = "", r = t;
    do
      n += S4(r), r = r.return;
    while (r);
    var i = n;
  } catch (a) {
    i = `
Error generating stack: ` + a.message + `
` + a.stack;
  }
  return { value: e, source: t, stack: i, digest: null };
}
function dl(e, t, n) {
  return { value: e, source: null, stack: n ?? null, digest: t ?? null };
}
function fu(e, t) {
  try {
    console.error(t.value);
  } catch (n) {
    setTimeout(function() {
      throw n;
    });
  }
}
var Qw = typeof WeakMap == "function" ? WeakMap : Map;
function Zp(e, t, n) {
  n = nn(-1, n), n.tag = 3, n.payload = { element: null };
  var r = t.value;
  return n.callback = function() {
    Yo || (Yo = !0, ku = r), fu(e, t);
  }, n;
}
function $p(e, t, n) {
  n = nn(-1, n), n.tag = 3;
  var r = e.type.getDerivedStateFromError;
  if (typeof r == "function") {
    var i = t.value;
    n.payload = function() {
      return r(i);
    }, n.callback = function() {
      fu(e, t);
    };
  }
  var a = e.stateNode;
  return a !== null && typeof a.componentDidCatch == "function" && (n.callback = function() {
    fu(e, t), typeof r != "function" && (bn === null ? bn = /* @__PURE__ */ new Set([this]) : bn.add(this));
    var o = t.stack;
    this.componentDidCatch(t.value, { componentStack: o !== null ? o : "" });
  }), n;
}
function md(e, t, n) {
  var r = e.pingCache;
  if (r === null) {
    r = e.pingCache = new Qw();
    var i = /* @__PURE__ */ new Set();
    r.set(t, i);
  } else i = r.get(t), i === void 0 && (i = /* @__PURE__ */ new Set(), r.set(t, i));
  i.has(n) || (i.add(n), e = c3.bind(null, e, t, n), t.then(e, e));
}
function vd(e) {
  do {
    var t;
    if ((t = e.tag === 13) && (t = e.memoizedState, t = t !== null ? t.dehydrated !== null : !0), t) return e;
    e = e.return;
  } while (e !== null);
  return null;
}
function gd(e, t, n, r, i) {
  return e.mode & 1 ? (e.flags |= 65536, e.lanes = i, e) : (e === t ? e.flags |= 65536 : (e.flags |= 128, n.flags |= 131072, n.flags &= -52805, n.tag === 1 && (n.alternate === null ? n.tag = 17 : (t = nn(-1, 1), t.tag = 2, Cn(n, t, 1))), n.lanes |= 1), e);
}
var Jw = un.ReactCurrentOwner, Ye = !1;
function We(e, t, n, r) {
  t.child = e === null ? _p(t, null, n, r) : Gr(t, e.child, n, r);
}
function yd(e, t, n, r, i) {
  n = n.render;
  var a = t.ref;
  return Hr(t, i), r = Ec(e, t, n, r, a, i), n = Tc(), e !== null && !Ye ? (t.updateQueue = e.updateQueue, t.flags &= -2053, e.lanes &= ~i, ln(e, t, i)) : (xe && n && pc(t), t.flags |= 1, We(e, t, r, i), t.child);
}
function wd(e, t, n, r, i) {
  if (e === null) {
    var a = n.type;
    return typeof a == "function" && !Ac(a) && a.defaultProps === void 0 && n.compare === null && n.defaultProps === void 0 ? (t.tag = 15, t.type = a, Gp(e, t, a, r, i)) : (e = uo(n.type, null, r, t, t.mode, i), e.ref = t.ref, e.return = t, t.child = e);
  }
  if (a = e.child, !(e.lanes & i)) {
    var o = a.memoizedProps;
    if (n = n.compare, n = n !== null ? n : aa, n(o, r) && e.ref === t.ref) return ln(e, t, i);
  }
  return t.flags |= 1, e = Tn(a, r), e.ref = t.ref, e.return = t, t.child = e;
}
function Gp(e, t, n, r, i) {
  if (e !== null) {
    var a = e.memoizedProps;
    if (aa(a, r) && e.ref === t.ref) if (Ye = !1, t.pendingProps = r = a, (e.lanes & i) !== 0) e.flags & 131072 && (Ye = !0);
    else return t.lanes = e.lanes, ln(e, t, i);
  }
  return xu(e, t, n, r, i);
}
function Yp(e, t, n) {
  var r = t.pendingProps, i = r.children, a = e !== null ? e.memoizedState : null;
  if (r.mode === "hidden") if (!(t.mode & 1)) t.memoizedState = { baseLanes: 0, cachePool: null, transitions: null }, oe(Nr, it), it |= n;
  else {
    if (!(n & 1073741824)) return e = a !== null ? a.baseLanes | n : n, t.lanes = t.childLanes = 1073741824, t.memoizedState = { baseLanes: e, cachePool: null, transitions: null }, t.updateQueue = null, oe(Nr, it), it |= e, null;
    t.memoizedState = { baseLanes: 0, cachePool: null, transitions: null }, r = a !== null ? a.baseLanes : n, oe(Nr, it), it |= r;
  }
  else a !== null ? (r = a.baseLanes | n, t.memoizedState = null) : r = n, oe(Nr, it), it |= r;
  return We(e, t, i, n), t.child;
}
function Xp(e, t) {
  var n = t.ref;
  (e === null && n !== null || e !== null && e.ref !== n) && (t.flags |= 512, t.flags |= 2097152);
}
function xu(e, t, n, r, i) {
  var a = Qe(n) ? er : ze.current;
  return a = Zr(t, a), Hr(t, i), n = Ec(e, t, n, r, a, i), r = Tc(), e !== null && !Ye ? (t.updateQueue = e.updateQueue, t.flags &= -2053, e.lanes &= ~i, ln(e, t, i)) : (xe && r && pc(t), t.flags |= 1, We(e, t, n, i), t.child);
}
function _d(e, t, n, r, i) {
  if (Qe(n)) {
    var a = !0;
    jo(t);
  } else a = !1;
  if (Hr(t, i), t.stateNode === null) oo(e, t), Up(t, n, r), du(t, n, r, i), r = !0;
  else if (e === null) {
    var o = t.stateNode, s = t.memoizedProps;
    o.props = s;
    var l = o.context, c = n.contextType;
    typeof c == "object" && c !== null ? c = wt(c) : (c = Qe(n) ? er : ze.current, c = Zr(t, c));
    var d = n.getDerivedStateFromProps, f = typeof d == "function" || typeof o.getSnapshotBeforeUpdate == "function";
    f || typeof o.UNSAFE_componentWillReceiveProps != "function" && typeof o.componentWillReceiveProps != "function" || (s !== r || l !== c) && hd(t, o, r, c), xn = !1;
    var m = t.memoizedState;
    o.state = m, Bo(t, r, o, i), l = t.memoizedState, s !== r || m !== l || Xe.current || xn ? (typeof d == "function" && (cu(t, n, d, r), l = t.memoizedState), (s = xn || pd(t, n, s, r, m, l, c)) ? (f || typeof o.UNSAFE_componentWillMount != "function" && typeof o.componentWillMount != "function" || (typeof o.componentWillMount == "function" && o.componentWillMount(), typeof o.UNSAFE_componentWillMount == "function" && o.UNSAFE_componentWillMount()), typeof o.componentDidMount == "function" && (t.flags |= 4194308)) : (typeof o.componentDidMount == "function" && (t.flags |= 4194308), t.memoizedProps = r, t.memoizedState = l), o.props = r, o.state = l, o.context = c, r = s) : (typeof o.componentDidMount == "function" && (t.flags |= 4194308), r = !1);
  } else {
    o = t.stateNode, Sp(e, t), s = t.memoizedProps, c = t.type === t.elementType ? s : bt(t.type, s), o.props = c, f = t.pendingProps, m = o.context, l = n.contextType, typeof l == "object" && l !== null ? l = wt(l) : (l = Qe(n) ? er : ze.current, l = Zr(t, l));
    var w = n.getDerivedStateFromProps;
    (d = typeof w == "function" || typeof o.getSnapshotBeforeUpdate == "function") || typeof o.UNSAFE_componentWillReceiveProps != "function" && typeof o.componentWillReceiveProps != "function" || (s !== f || m !== l) && hd(t, o, r, l), xn = !1, m = t.memoizedState, o.state = m, Bo(t, r, o, i);
    var y = t.memoizedState;
    s !== f || m !== y || Xe.current || xn ? (typeof w == "function" && (cu(t, n, w, r), y = t.memoizedState), (c = xn || pd(t, n, c, r, m, y, l) || !1) ? (d || typeof o.UNSAFE_componentWillUpdate != "function" && typeof o.componentWillUpdate != "function" || (typeof o.componentWillUpdate == "function" && o.componentWillUpdate(r, y, l), typeof o.UNSAFE_componentWillUpdate == "function" && o.UNSAFE_componentWillUpdate(r, y, l)), typeof o.componentDidUpdate == "function" && (t.flags |= 4), typeof o.getSnapshotBeforeUpdate == "function" && (t.flags |= 1024)) : (typeof o.componentDidUpdate != "function" || s === e.memoizedProps && m === e.memoizedState || (t.flags |= 4), typeof o.getSnapshotBeforeUpdate != "function" || s === e.memoizedProps && m === e.memoizedState || (t.flags |= 1024), t.memoizedProps = r, t.memoizedState = y), o.props = r, o.state = y, o.context = l, r = c) : (typeof o.componentDidUpdate != "function" || s === e.memoizedProps && m === e.memoizedState || (t.flags |= 4), typeof o.getSnapshotBeforeUpdate != "function" || s === e.memoizedProps && m === e.memoizedState || (t.flags |= 1024), r = !1);
  }
  return pu(e, t, n, r, a, i);
}
function pu(e, t, n, r, i, a) {
  Xp(e, t);
  var o = (t.flags & 128) !== 0;
  if (!r && !o) return i && od(t, n, !1), ln(e, t, a);
  r = t.stateNode, Jw.current = t;
  var s = o && typeof n.getDerivedStateFromError != "function" ? null : r.render();
  return t.flags |= 1, e !== null && o ? (t.child = Gr(t, e.child, null, a), t.child = Gr(t, null, s, a)) : We(e, t, s, a), t.memoizedState = r.state, i && od(t, n, !0), t.child;
}
function Qp(e) {
  var t = e.stateNode;
  t.pendingContext ? ad(e, t.pendingContext, t.pendingContext !== t.context) : t.context && ad(e, t.context, !1), kc(e, t.containerInfo);
}
function kd(e, t, n, r, i) {
  return $r(), mc(i), t.flags |= 256, We(e, t, n, r), t.child;
}
var hu = { dehydrated: null, treeContext: null, retryLane: 0 };
function mu(e) {
  return { baseLanes: e, cachePool: null, transitions: null };
}
function Jp(e, t, n) {
  var r = t.pendingProps, i = he.current, a = !1, o = (t.flags & 128) !== 0, s;
  if ((s = o) || (s = e !== null && e.memoizedState === null ? !1 : (i & 2) !== 0), s ? (a = !0, t.flags &= -129) : (e === null || e.memoizedState !== null) && (i |= 1), oe(he, i & 1), e === null)
    return lu(t), e = t.memoizedState, e !== null && (e = e.dehydrated, e !== null) ? (t.mode & 1 ? e.data === "$!" ? t.lanes = 8 : t.lanes = 1073741824 : t.lanes = 1, null) : (o = r.children, e = r.fallback, a ? (r = t.mode, a = t.child, o = { mode: "hidden", children: o }, !(r & 1) && a !== null ? (a.childLanes = 0, a.pendingProps = o) : a = Ns(o, r, 0, null), e = Qn(e, r, n, null), a.return = t, e.return = t, a.sibling = e, t.child = a, t.child.memoizedState = mu(n), t.memoizedState = hu, e) : Lc(t, o));
  if (i = e.memoizedState, i !== null && (s = i.dehydrated, s !== null)) return Kw(e, t, o, r, s, i, n);
  if (a) {
    a = r.fallback, o = t.mode, i = e.child, s = i.sibling;
    var l = { mode: "hidden", children: r.children };
    return !(o & 1) && t.child !== i ? (r = t.child, r.childLanes = 0, r.pendingProps = l, t.deletions = null) : (r = Tn(i, l), r.subtreeFlags = i.subtreeFlags & 14680064), s !== null ? a = Tn(s, a) : (a = Qn(a, o, n, null), a.flags |= 2), a.return = t, r.return = t, r.sibling = a, t.child = r, r = a, a = t.child, o = e.child.memoizedState, o = o === null ? mu(n) : { baseLanes: o.baseLanes | n, cachePool: null, transitions: o.transitions }, a.memoizedState = o, a.childLanes = e.childLanes & ~n, t.memoizedState = hu, r;
  }
  return a = e.child, e = a.sibling, r = Tn(a, { mode: "visible", children: r.children }), !(t.mode & 1) && (r.lanes = n), r.return = t, r.sibling = null, e !== null && (n = t.deletions, n === null ? (t.deletions = [e], t.flags |= 16) : n.push(e)), t.child = r, t.memoizedState = null, r;
}
function Lc(e, t) {
  return t = Ns({ mode: "visible", children: t }, e.mode, 0, null), t.return = e, e.child = t;
}
function Ba(e, t, n, r) {
  return r !== null && mc(r), Gr(t, e.child, null, n), e = Lc(t, t.pendingProps.children), e.flags |= 2, t.memoizedState = null, e;
}
function Kw(e, t, n, r, i, a, o) {
  if (n)
    return t.flags & 256 ? (t.flags &= -257, r = dl(Error(b(422))), Ba(e, t, o, r)) : t.memoizedState !== null ? (t.child = e.child, t.flags |= 128, null) : (a = r.fallback, i = t.mode, r = Ns({ mode: "visible", children: r.children }, i, 0, null), a = Qn(a, i, o, null), a.flags |= 2, r.return = t, a.return = t, r.sibling = a, t.child = r, t.mode & 1 && Gr(t, e.child, null, o), t.child.memoizedState = mu(o), t.memoizedState = hu, a);
  if (!(t.mode & 1)) return Ba(e, t, o, null);
  if (i.data === "$!") {
    if (r = i.nextSibling && i.nextSibling.dataset, r) var s = r.dgst;
    return r = s, a = Error(b(419)), r = dl(a, r, void 0), Ba(e, t, o, r);
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
      i = i & (r.suspendedLanes | o) ? 0 : i, i !== 0 && i !== a.retryLane && (a.retryLane = i, sn(e, i), It(r, e, i, -1));
    }
    return Hc(), r = dl(Error(b(421))), Ba(e, t, o, r);
  }
  return i.data === "$?" ? (t.flags |= 128, t.child = e.child, t = d3.bind(null, e), i._reactRetry = t, null) : (e = a.treeContext, at = Sn(i.nextSibling), lt = t, xe = !0, Tt = null, e !== null && (mt[vt++] = en, mt[vt++] = tn, mt[vt++] = tr, en = e.id, tn = e.overflow, tr = t), t = Lc(t, r.children), t.flags |= 4096, t);
}
function Sd(e, t, n) {
  e.lanes |= t;
  var r = e.alternate;
  r !== null && (r.lanes |= t), uu(e.return, t, n);
}
function fl(e, t, n, r, i) {
  var a = e.memoizedState;
  a === null ? e.memoizedState = { isBackwards: t, rendering: null, renderingStartTime: 0, last: r, tail: n, tailMode: i } : (a.isBackwards = t, a.rendering = null, a.renderingStartTime = 0, a.last = r, a.tail = n, a.tailMode = i);
}
function Kp(e, t, n) {
  var r = t.pendingProps, i = r.revealOrder, a = r.tail;
  if (We(e, t, r.children, n), r = he.current, r & 2) r = r & 1 | 2, t.flags |= 128;
  else {
    if (e !== null && e.flags & 128) e: for (e = t.child; e !== null; ) {
      if (e.tag === 13) e.memoizedState !== null && Sd(e, n, t);
      else if (e.tag === 19) Sd(e, n, t);
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
      for (n = t.child, i = null; n !== null; ) e = n.alternate, e !== null && Uo(e) === null && (i = n), n = n.sibling;
      n = i, n === null ? (i = t.child, t.child = null) : (i = n.sibling, n.sibling = null), fl(t, !1, i, n, a);
      break;
    case "backwards":
      for (n = null, i = t.child, t.child = null; i !== null; ) {
        if (e = i.alternate, e !== null && Uo(e) === null) {
          t.child = i;
          break;
        }
        e = i.sibling, i.sibling = n, n = i, i = e;
      }
      fl(t, !0, n, null, a);
      break;
    case "together":
      fl(t, !1, null, null, void 0);
      break;
    default:
      t.memoizedState = null;
  }
  return t.child;
}
function oo(e, t) {
  !(t.mode & 1) && e !== null && (e.alternate = null, t.alternate = null, t.flags |= 2);
}
function ln(e, t, n) {
  if (e !== null && (t.dependencies = e.dependencies), rr |= t.lanes, !(n & t.childLanes)) return null;
  if (e !== null && t.child !== e.child) throw Error(b(153));
  if (t.child !== null) {
    for (e = t.child, n = Tn(e, e.pendingProps), t.child = n, n.return = t; e.sibling !== null; ) e = e.sibling, n = n.sibling = Tn(e, e.pendingProps), n.return = t;
    n.sibling = null;
  }
  return t.child;
}
function qw(e, t, n) {
  switch (t.tag) {
    case 3:
      Qp(t), $r();
      break;
    case 5:
      Cp(t);
      break;
    case 1:
      Qe(t.type) && jo(t);
      break;
    case 4:
      kc(t, t.stateNode.containerInfo);
      break;
    case 10:
      var r = t.type._context, i = t.memoizedProps.value;
      oe(Vo, r._currentValue), r._currentValue = i;
      break;
    case 13:
      if (r = t.memoizedState, r !== null)
        return r.dehydrated !== null ? (oe(he, he.current & 1), t.flags |= 128, null) : n & t.child.childLanes ? Jp(e, t, n) : (oe(he, he.current & 1), e = ln(e, t, n), e !== null ? e.sibling : null);
      oe(he, he.current & 1);
      break;
    case 19:
      if (r = (n & t.childLanes) !== 0, e.flags & 128) {
        if (r) return Kp(e, t, n);
        t.flags |= 128;
      }
      if (i = t.memoizedState, i !== null && (i.rendering = null, i.tail = null, i.lastEffect = null), oe(he, he.current), r) break;
      return null;
    case 22:
    case 23:
      return t.lanes = 0, Yp(e, t, n);
  }
  return ln(e, t, n);
}
var qp, vu, eh, th;
qp = function(e, t) {
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
vu = function() {
};
eh = function(e, t, n, r) {
  var i = e.memoizedProps;
  if (i !== r) {
    e = t.stateNode, Gn(Zt.current);
    var a = null;
    switch (n) {
      case "input":
        i = Fl(e, i), r = Fl(e, r), a = [];
        break;
      case "select":
        i = ve({}, i, { value: void 0 }), r = ve({}, r, { value: void 0 }), a = [];
        break;
      case "textarea":
        i = Wl(e, i), r = Wl(e, r), a = [];
        break;
      default:
        typeof i.onClick != "function" && typeof r.onClick == "function" && (e.onclick = Ho);
    }
    Ul(n, r);
    var o;
    n = null;
    for (c in i) if (!r.hasOwnProperty(c) && i.hasOwnProperty(c) && i[c] != null) if (c === "style") {
      var s = i[c];
      for (o in s) s.hasOwnProperty(o) && (n || (n = {}), n[o] = "");
    } else c !== "dangerouslySetInnerHTML" && c !== "children" && c !== "suppressContentEditableWarning" && c !== "suppressHydrationWarning" && c !== "autoFocus" && (Ki.hasOwnProperty(c) ? a || (a = []) : (a = a || []).push(c, null));
    for (c in r) {
      var l = r[c];
      if (s = i != null ? i[c] : void 0, r.hasOwnProperty(c) && l !== s && (l != null || s != null)) if (c === "style") if (s) {
        for (o in s) !s.hasOwnProperty(o) || l && l.hasOwnProperty(o) || (n || (n = {}), n[o] = "");
        for (o in l) l.hasOwnProperty(o) && s[o] !== l[o] && (n || (n = {}), n[o] = l[o]);
      } else n || (a || (a = []), a.push(
        c,
        n
      )), n = l;
      else c === "dangerouslySetInnerHTML" ? (l = l ? l.__html : void 0, s = s ? s.__html : void 0, l != null && s !== l && (a = a || []).push(c, l)) : c === "children" ? typeof l != "string" && typeof l != "number" || (a = a || []).push(c, "" + l) : c !== "suppressContentEditableWarning" && c !== "suppressHydrationWarning" && (Ki.hasOwnProperty(c) ? (l != null && c === "onScroll" && ce("scroll", e), a || s === l || (a = [])) : (a = a || []).push(c, l));
    }
    n && (a = a || []).push("style", n);
    var c = a;
    (t.updateQueue = c) && (t.flags |= 4);
  }
};
th = function(e, t, n, r) {
  n !== r && (t.flags |= 4);
};
function fi(e, t) {
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
function e3(e, t, n) {
  var r = t.pendingProps;
  switch (hc(t), t.tag) {
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
      return Qe(t.type) && Ao(), Oe(t), null;
    case 3:
      return r = t.stateNode, Yr(), de(Xe), de(ze), Cc(), r.pendingContext && (r.context = r.pendingContext, r.pendingContext = null), (e === null || e.child === null) && (Va(t) ? t.flags |= 4 : e === null || e.memoizedState.isDehydrated && !(t.flags & 256) || (t.flags |= 1024, Tt !== null && (bu(Tt), Tt = null))), vu(e, t), Oe(t), null;
    case 5:
      Sc(t);
      var i = Gn(ca.current);
      if (n = t.type, e !== null && t.stateNode != null) eh(e, t, n, r, i), e.ref !== t.ref && (t.flags |= 512, t.flags |= 2097152);
      else {
        if (!r) {
          if (t.stateNode === null) throw Error(b(166));
          return Oe(t), null;
        }
        if (e = Gn(Zt.current), Va(t)) {
          r = t.stateNode, n = t.type;
          var a = t.memoizedProps;
          switch (r[zt] = t, r[la] = a, e = (t.mode & 1) !== 0, n) {
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
              for (i = 0; i < yi.length; i++) ce(yi[i], r);
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
              R0(r, a), ce("invalid", r);
              break;
            case "select":
              r._wrapperState = { wasMultiple: !!a.multiple }, ce("invalid", r);
              break;
            case "textarea":
              M0(r, a), ce("invalid", r);
          }
          Ul(n, a), i = null;
          for (var o in a) if (a.hasOwnProperty(o)) {
            var s = a[o];
            o === "children" ? typeof s == "string" ? r.textContent !== s && (a.suppressHydrationWarning !== !0 && za(r.textContent, s, e), i = ["children", s]) : typeof s == "number" && r.textContent !== "" + s && (a.suppressHydrationWarning !== !0 && za(
              r.textContent,
              s,
              e
            ), i = ["children", "" + s]) : Ki.hasOwnProperty(o) && s != null && o === "onScroll" && ce("scroll", r);
          }
          switch (n) {
            case "input":
              Ra(r), D0(r, a, !0);
              break;
            case "textarea":
              Ra(r), O0(r);
              break;
            case "select":
            case "option":
              break;
            default:
              typeof a.onClick == "function" && (r.onclick = Ho);
          }
          r = i, t.updateQueue = r, r !== null && (t.flags |= 4);
        } else {
          o = i.nodeType === 9 ? i : i.ownerDocument, e === "http://www.w3.org/1999/xhtml" && (e = Nx(n)), e === "http://www.w3.org/1999/xhtml" ? n === "script" ? (e = o.createElement("div"), e.innerHTML = "<script><\/script>", e = e.removeChild(e.firstChild)) : typeof r.is == "string" ? e = o.createElement(n, { is: r.is }) : (e = o.createElement(n), n === "select" && (o = e, r.multiple ? o.multiple = !0 : r.size && (o.size = r.size))) : e = o.createElementNS(e, n), e[zt] = t, e[la] = r, qp(e, t, !1, !1), t.stateNode = e;
          e: {
            switch (o = Zl(n, r), n) {
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
                for (i = 0; i < yi.length; i++) ce(yi[i], e);
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
                R0(e, r), i = Fl(e, r), ce("invalid", e);
                break;
              case "option":
                i = r;
                break;
              case "select":
                e._wrapperState = { wasMultiple: !!r.multiple }, i = ve({}, r, { value: void 0 }), ce("invalid", e);
                break;
              case "textarea":
                M0(e, r), i = Wl(e, r), ce("invalid", e);
                break;
              default:
                i = r;
            }
            Ul(n, i), s = i;
            for (a in s) if (s.hasOwnProperty(a)) {
              var l = s[a];
              a === "style" ? Rx(e, l) : a === "dangerouslySetInnerHTML" ? (l = l ? l.__html : void 0, l != null && Lx(e, l)) : a === "children" ? typeof l == "string" ? (n !== "textarea" || l !== "") && qi(e, l) : typeof l == "number" && qi(e, "" + l) : a !== "suppressContentEditableWarning" && a !== "suppressHydrationWarning" && a !== "autoFocus" && (Ki.hasOwnProperty(a) ? l != null && a === "onScroll" && ce("scroll", e) : l != null && ec(e, a, l, o));
            }
            switch (n) {
              case "input":
                Ra(e), D0(e, r, !1);
                break;
              case "textarea":
                Ra(e), O0(e);
                break;
              case "option":
                r.value != null && e.setAttribute("value", "" + Rn(r.value));
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
                typeof i.onClick == "function" && (e.onclick = Ho);
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
      if (e && t.stateNode != null) th(e, t, e.memoizedProps, r);
      else {
        if (typeof r != "string" && t.stateNode === null) throw Error(b(166));
        if (n = Gn(ca.current), Gn(Zt.current), Va(t)) {
          if (r = t.stateNode, n = t.memoizedProps, r[zt] = t, (a = r.nodeValue !== n) && (e = lt, e !== null)) switch (e.tag) {
            case 3:
              za(r.nodeValue, n, (e.mode & 1) !== 0);
              break;
            case 5:
              e.memoizedProps.suppressHydrationWarning !== !0 && za(r.nodeValue, n, (e.mode & 1) !== 0);
          }
          a && (t.flags |= 4);
        } else r = (n.nodeType === 9 ? n : n.ownerDocument).createTextNode(r), r[zt] = t, t.stateNode = r;
      }
      return Oe(t), null;
    case 13:
      if (de(he), r = t.memoizedState, e === null || e.memoizedState !== null && e.memoizedState.dehydrated !== null) {
        if (xe && at !== null && t.mode & 1 && !(t.flags & 128)) yp(), $r(), t.flags |= 98560, a = !1;
        else if (a = Va(t), r !== null && r.dehydrated !== null) {
          if (e === null) {
            if (!a) throw Error(b(318));
            if (a = t.memoizedState, a = a !== null ? a.dehydrated : null, !a) throw Error(b(317));
            a[zt] = t;
          } else $r(), !(t.flags & 128) && (t.memoizedState = null), t.flags |= 4;
          Oe(t), a = !1;
        } else Tt !== null && (bu(Tt), Tt = null), a = !0;
        if (!a) return t.flags & 65536 ? t : null;
      }
      return t.flags & 128 ? (t.lanes = n, t) : (r = r !== null, r !== (e !== null && e.memoizedState !== null) && r && (t.child.flags |= 8192, t.mode & 1 && (e === null || he.current & 1 ? be === 0 && (be = 3) : Hc())), t.updateQueue !== null && (t.flags |= 4), Oe(t), null);
    case 4:
      return Yr(), vu(e, t), e === null && oa(t.stateNode.containerInfo), Oe(t), null;
    case 10:
      return yc(t.type._context), Oe(t), null;
    case 17:
      return Qe(t.type) && Ao(), Oe(t), null;
    case 19:
      if (de(he), a = t.memoizedState, a === null) return Oe(t), null;
      if (r = (t.flags & 128) !== 0, o = a.rendering, o === null) if (r) fi(a, !1);
      else {
        if (be !== 0 || e !== null && e.flags & 128) for (e = t.child; e !== null; ) {
          if (o = Uo(e), o !== null) {
            for (t.flags |= 128, fi(a, !1), r = o.updateQueue, r !== null && (t.updateQueue = r, t.flags |= 4), t.subtreeFlags = 0, r = n, n = t.child; n !== null; ) a = n, e = r, a.flags &= 14680066, o = a.alternate, o === null ? (a.childLanes = 0, a.lanes = e, a.child = null, a.subtreeFlags = 0, a.memoizedProps = null, a.memoizedState = null, a.updateQueue = null, a.dependencies = null, a.stateNode = null) : (a.childLanes = o.childLanes, a.lanes = o.lanes, a.child = o.child, a.subtreeFlags = 0, a.deletions = null, a.memoizedProps = o.memoizedProps, a.memoizedState = o.memoizedState, a.updateQueue = o.updateQueue, a.type = o.type, e = o.dependencies, a.dependencies = e === null ? null : { lanes: e.lanes, firstContext: e.firstContext }), n = n.sibling;
            return oe(he, he.current & 1 | 2), t.child;
          }
          e = e.sibling;
        }
        a.tail !== null && we() > Qr && (t.flags |= 128, r = !0, fi(a, !1), t.lanes = 4194304);
      }
      else {
        if (!r) if (e = Uo(o), e !== null) {
          if (t.flags |= 128, r = !0, n = e.updateQueue, n !== null && (t.updateQueue = n, t.flags |= 4), fi(a, !0), a.tail === null && a.tailMode === "hidden" && !o.alternate && !xe) return Oe(t), null;
        } else 2 * we() - a.renderingStartTime > Qr && n !== 1073741824 && (t.flags |= 128, r = !0, fi(a, !1), t.lanes = 4194304);
        a.isBackwards ? (o.sibling = t.child, t.child = o) : (n = a.last, n !== null ? n.sibling = o : t.child = o, a.last = o);
      }
      return a.tail !== null ? (t = a.tail, a.rendering = t, a.tail = t.sibling, a.renderingStartTime = we(), t.sibling = null, n = he.current, oe(he, r ? n & 1 | 2 : n & 1), t) : (Oe(t), null);
    case 22:
    case 23:
      return Oc(), r = t.memoizedState !== null, e !== null && e.memoizedState !== null !== r && (t.flags |= 8192), r && t.mode & 1 ? it & 1073741824 && (Oe(t), t.subtreeFlags & 6 && (t.flags |= 8192)) : Oe(t), null;
    case 24:
      return null;
    case 25:
      return null;
  }
  throw Error(b(156, t.tag));
}
function t3(e, t) {
  switch (hc(t), t.tag) {
    case 1:
      return Qe(t.type) && Ao(), e = t.flags, e & 65536 ? (t.flags = e & -65537 | 128, t) : null;
    case 3:
      return Yr(), de(Xe), de(ze), Cc(), e = t.flags, e & 65536 && !(e & 128) ? (t.flags = e & -65537 | 128, t) : null;
    case 5:
      return Sc(t), null;
    case 13:
      if (de(he), e = t.memoizedState, e !== null && e.dehydrated !== null) {
        if (t.alternate === null) throw Error(b(340));
        $r();
      }
      return e = t.flags, e & 65536 ? (t.flags = e & -65537 | 128, t) : null;
    case 19:
      return de(he), null;
    case 4:
      return Yr(), null;
    case 10:
      return yc(t.type._context), null;
    case 22:
    case 23:
      return Oc(), null;
    case 24:
      return null;
    default:
      return null;
  }
}
var Ua = !1, je = !1, n3 = typeof WeakSet == "function" ? WeakSet : Set, R = null;
function Pr(e, t) {
  var n = e.ref;
  if (n !== null) if (typeof n == "function") try {
    n(null);
  } catch (r) {
    ge(e, t, r);
  }
  else n.current = null;
}
function gu(e, t, n) {
  try {
    n();
  } catch (r) {
    ge(e, t, r);
  }
}
var Cd = !1;
function r3(e, t) {
  if (tu = Do, e = op(), xc(e)) {
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
  for (nu = { focusedElem: e, selectionRange: n }, Do = !1, R = t; R !== null; ) if (t = R, e = t.child, (t.subtreeFlags & 1028) !== 0 && e !== null) e.return = t, R = e;
  else for (; R !== null; ) {
    t = R;
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
      e.return = t.return, R = e;
      break;
    }
    R = t.return;
  }
  return y = Cd, Cd = !1, y;
}
function Pi(e, t, n) {
  var r = t.updateQueue;
  if (r = r !== null ? r.lastEffect : null, r !== null) {
    var i = r = r.next;
    do {
      if ((i.tag & e) === e) {
        var a = i.destroy;
        i.destroy = void 0, a !== void 0 && gu(t, n, a);
      }
      i = i.next;
    } while (i !== r);
  }
}
function Ts(e, t) {
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
function yu(e) {
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
function nh(e) {
  var t = e.alternate;
  t !== null && (e.alternate = null, nh(t)), e.child = null, e.deletions = null, e.sibling = null, e.tag === 5 && (t = e.stateNode, t !== null && (delete t[zt], delete t[la], delete t[au], delete t[Fw], delete t[zw])), e.stateNode = null, e.return = null, e.dependencies = null, e.memoizedProps = null, e.memoizedState = null, e.pendingProps = null, e.stateNode = null, e.updateQueue = null;
}
function rh(e) {
  return e.tag === 5 || e.tag === 3 || e.tag === 4;
}
function bd(e) {
  e: for (; ; ) {
    for (; e.sibling === null; ) {
      if (e.return === null || rh(e.return)) return null;
      e = e.return;
    }
    for (e.sibling.return = e.return, e = e.sibling; e.tag !== 5 && e.tag !== 6 && e.tag !== 18; ) {
      if (e.flags & 2 || e.child === null || e.tag === 4) continue e;
      e.child.return = e, e = e.child;
    }
    if (!(e.flags & 2)) return e.stateNode;
  }
}
function wu(e, t, n) {
  var r = e.tag;
  if (r === 5 || r === 6) e = e.stateNode, t ? n.nodeType === 8 ? n.parentNode.insertBefore(e, t) : n.insertBefore(e, t) : (n.nodeType === 8 ? (t = n.parentNode, t.insertBefore(e, n)) : (t = n, t.appendChild(e)), n = n._reactRootContainer, n != null || t.onclick !== null || (t.onclick = Ho));
  else if (r !== 4 && (e = e.child, e !== null)) for (wu(e, t, n), e = e.sibling; e !== null; ) wu(e, t, n), e = e.sibling;
}
function _u(e, t, n) {
  var r = e.tag;
  if (r === 5 || r === 6) e = e.stateNode, t ? n.insertBefore(e, t) : n.appendChild(e);
  else if (r !== 4 && (e = e.child, e !== null)) for (_u(e, t, n), e = e.sibling; e !== null; ) _u(e, t, n), e = e.sibling;
}
var Le = null, Et = !1;
function dn(e, t, n) {
  for (n = n.child; n !== null; ) ih(e, t, n), n = n.sibling;
}
function ih(e, t, n) {
  if (Ut && typeof Ut.onCommitFiberUnmount == "function") try {
    Ut.onCommitFiberUnmount(ys, n);
  } catch {
  }
  switch (n.tag) {
    case 5:
      je || Pr(n, t);
    case 6:
      var r = Le, i = Et;
      Le = null, dn(e, t, n), Le = r, Et = i, Le !== null && (Et ? (e = Le, n = n.stateNode, e.nodeType === 8 ? e.parentNode.removeChild(n) : e.removeChild(n)) : Le.removeChild(n.stateNode));
      break;
    case 18:
      Le !== null && (Et ? (e = Le, n = n.stateNode, e.nodeType === 8 ? al(e.parentNode, n) : e.nodeType === 1 && al(e, n), ra(e)) : al(Le, n.stateNode));
      break;
    case 4:
      r = Le, i = Et, Le = n.stateNode.containerInfo, Et = !0, dn(e, t, n), Le = r, Et = i;
      break;
    case 0:
    case 11:
    case 14:
    case 15:
      if (!je && (r = n.updateQueue, r !== null && (r = r.lastEffect, r !== null))) {
        i = r = r.next;
        do {
          var a = i, o = a.destroy;
          a = a.tag, o !== void 0 && (a & 2 || a & 4) && gu(n, t, o), i = i.next;
        } while (i !== r);
      }
      dn(e, t, n);
      break;
    case 1:
      if (!je && (Pr(n, t), r = n.stateNode, typeof r.componentWillUnmount == "function")) try {
        r.props = n.memoizedProps, r.state = n.memoizedState, r.componentWillUnmount();
      } catch (s) {
        ge(n, t, s);
      }
      dn(e, t, n);
      break;
    case 21:
      dn(e, t, n);
      break;
    case 22:
      n.mode & 1 ? (je = (r = je) || n.memoizedState !== null, dn(e, t, n), je = r) : dn(e, t, n);
      break;
    default:
      dn(e, t, n);
  }
}
function Ed(e) {
  var t = e.updateQueue;
  if (t !== null) {
    e.updateQueue = null;
    var n = e.stateNode;
    n === null && (n = e.stateNode = new n3()), t.forEach(function(r) {
      var i = f3.bind(null, e, r);
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
      ih(a, o, i), Le = null, Et = !1;
      var l = i.alternate;
      l !== null && (l.return = null), i.return = null;
    } catch (c) {
      ge(i, t, c);
    }
  }
  if (t.subtreeFlags & 12854) for (t = t.child; t !== null; ) ah(t, e), t = t.sibling;
}
function ah(e, t) {
  var n = e.alternate, r = e.flags;
  switch (e.tag) {
    case 0:
    case 11:
    case 14:
    case 15:
      if (St(t, e), Ot(e), r & 4) {
        try {
          Pi(3, e, e.return), Ts(3, e);
        } catch (x) {
          ge(e, e.return, x);
        }
        try {
          Pi(5, e, e.return);
        } catch (x) {
          ge(e, e.return, x);
        }
      }
      break;
    case 1:
      St(t, e), Ot(e), r & 512 && n !== null && Pr(n, n.return);
      break;
    case 5:
      if (St(t, e), Ot(e), r & 512 && n !== null && Pr(n, n.return), e.flags & 32) {
        var i = e.stateNode;
        try {
          qi(i, "");
        } catch (x) {
          ge(e, e.return, x);
        }
      }
      if (r & 4 && (i = e.stateNode, i != null)) {
        var a = e.memoizedProps, o = n !== null ? n.memoizedProps : a, s = e.type, l = e.updateQueue;
        if (e.updateQueue = null, l !== null) try {
          s === "input" && a.type === "radio" && a.name != null && Tx(i, a), Zl(s, o);
          var c = Zl(s, a);
          for (o = 0; o < l.length; o += 2) {
            var d = l[o], f = l[o + 1];
            d === "style" ? Rx(i, f) : d === "dangerouslySetInnerHTML" ? Lx(i, f) : d === "children" ? qi(i, f) : ec(i, d, f, c);
          }
          switch (s) {
            case "input":
              zl(i, a);
              break;
            case "textarea":
              Px(i, a);
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
          i[la] = a;
        } catch (x) {
          ge(e, e.return, x);
        }
      }
      break;
    case 6:
      if (St(t, e), Ot(e), r & 4) {
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
      if (St(t, e), Ot(e), r & 4 && n !== null && n.memoizedState.isDehydrated) try {
        ra(t.containerInfo);
      } catch (x) {
        ge(e, e.return, x);
      }
      break;
    case 4:
      St(t, e), Ot(e);
      break;
    case 13:
      St(t, e), Ot(e), i = e.child, i.flags & 8192 && (a = i.memoizedState !== null, i.stateNode.isHidden = a, !a || i.alternate !== null && i.alternate.memoizedState !== null || (Dc = we())), r & 4 && Ed(e);
      break;
    case 22:
      if (d = n !== null && n.memoizedState !== null, e.mode & 1 ? (je = (c = je) || d, St(t, e), je = c) : St(t, e), Ot(e), r & 8192) {
        if (c = e.memoizedState !== null, (e.stateNode.isHidden = c) && !d && e.mode & 1) for (R = e, d = e.child; d !== null; ) {
          for (f = R = d; R !== null; ) {
            switch (m = R, w = m.child, m.tag) {
              case 0:
              case 11:
              case 14:
              case 15:
                Pi(4, m, m.return);
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
                  Pd(f);
                  continue;
                }
            }
            w !== null ? (w.return = m, R = w) : Pd(f);
          }
          d = d.sibling;
        }
        e: for (d = null, f = e; ; ) {
          if (f.tag === 5) {
            if (d === null) {
              d = f;
              try {
                i = f.stateNode, c ? (a = i.style, typeof a.setProperty == "function" ? a.setProperty("display", "none", "important") : a.display = "none") : (s = f.stateNode, l = f.memoizedProps.style, o = l != null && l.hasOwnProperty("display") ? l.display : null, s.style.display = Ix("display", o));
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
      St(t, e), Ot(e), r & 4 && Ed(e);
      break;
    case 21:
      break;
    default:
      St(
        t,
        e
      ), Ot(e);
  }
}
function Ot(e) {
  var t = e.flags;
  if (t & 2) {
    try {
      e: {
        for (var n = e.return; n !== null; ) {
          if (rh(n)) {
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
          r.flags & 32 && (qi(i, ""), r.flags &= -33);
          var a = bd(e);
          _u(e, a, i);
          break;
        case 3:
        case 4:
          var o = r.stateNode.containerInfo, s = bd(e);
          wu(e, s, o);
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
function i3(e, t, n) {
  R = e, oh(e);
}
function oh(e, t, n) {
  for (var r = (e.mode & 1) !== 0; R !== null; ) {
    var i = R, a = i.child;
    if (i.tag === 22 && r) {
      var o = i.memoizedState !== null || Ua;
      if (!o) {
        var s = i.alternate, l = s !== null && s.memoizedState !== null || je;
        s = Ua;
        var c = je;
        if (Ua = o, (je = l) && !c) for (R = i; R !== null; ) o = R, l = o.child, o.tag === 22 && o.memoizedState !== null ? Nd(i) : l !== null ? (l.return = o, R = l) : Nd(i);
        for (; a !== null; ) R = a, oh(a), a = a.sibling;
        R = i, Ua = s, je = c;
      }
      Td(e);
    } else i.subtreeFlags & 8772 && a !== null ? (a.return = i, R = a) : Td(e);
  }
}
function Td(e) {
  for (; R !== null; ) {
    var t = R;
    if (t.flags & 8772) {
      var n = t.alternate;
      try {
        if (t.flags & 8772) switch (t.tag) {
          case 0:
          case 11:
          case 15:
            je || Ts(5, t);
            break;
          case 1:
            var r = t.stateNode;
            if (t.flags & 4 && !je) if (n === null) r.componentDidMount();
            else {
              var i = t.elementType === t.type ? n.memoizedProps : bt(t.type, n.memoizedProps);
              r.componentDidUpdate(i, n.memoizedState, r.__reactInternalSnapshotBeforeUpdate);
            }
            var a = t.updateQueue;
            a !== null && dd(t, a, r);
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
              dd(t, o, n);
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
                  f !== null && ra(f);
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
        je || t.flags & 512 && yu(t);
      } catch (m) {
        ge(t, t.return, m);
      }
    }
    if (t === e) {
      R = null;
      break;
    }
    if (n = t.sibling, n !== null) {
      n.return = t.return, R = n;
      break;
    }
    R = t.return;
  }
}
function Pd(e) {
  for (; R !== null; ) {
    var t = R;
    if (t === e) {
      R = null;
      break;
    }
    var n = t.sibling;
    if (n !== null) {
      n.return = t.return, R = n;
      break;
    }
    R = t.return;
  }
}
function Nd(e) {
  for (; R !== null; ) {
    var t = R;
    try {
      switch (t.tag) {
        case 0:
        case 11:
        case 15:
          var n = t.return;
          try {
            Ts(4, t);
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
            yu(t);
          } catch (l) {
            ge(t, a, l);
          }
          break;
        case 5:
          var o = t.return;
          try {
            yu(t);
          } catch (l) {
            ge(t, o, l);
          }
      }
    } catch (l) {
      ge(t, t.return, l);
    }
    if (t === e) {
      R = null;
      break;
    }
    var s = t.sibling;
    if (s !== null) {
      s.return = t.return, R = s;
      break;
    }
    R = t.return;
  }
}
var a3 = Math.ceil, Go = un.ReactCurrentDispatcher, Ic = un.ReactCurrentOwner, yt = un.ReactCurrentBatchConfig, J = 0, Pe = null, ke = null, Re = 0, it = 0, Nr = Hn(0), be = 0, pa = null, rr = 0, Ps = 0, Rc = 0, Ni = null, Ge = null, Dc = 0, Qr = 1 / 0, Jt = null, Yo = !1, ku = null, bn = null, Za = !1, yn = null, Xo = 0, Li = 0, Su = null, so = -1, lo = 0;
function Be() {
  return J & 6 ? we() : so !== -1 ? so : so = we();
}
function En(e) {
  return e.mode & 1 ? J & 2 && Re !== 0 ? Re & -Re : Ww.transition !== null ? (lo === 0 && (lo = Ux()), lo) : (e = re, e !== 0 || (e = window.event, e = e === void 0 ? 16 : Jx(e.type)), e) : 1;
}
function It(e, t, n, r) {
  if (50 < Li) throw Li = 0, Su = null, Error(b(185));
  _a(e, n, r), (!(J & 2) || e !== Pe) && (e === Pe && (!(J & 2) && (Ps |= n), be === 4 && mn(e, Re)), Je(e, r), n === 1 && J === 0 && !(t.mode & 1) && (Qr = we() + 500, Cs && An()));
}
function Je(e, t) {
  var n = e.callbackNode;
  W4(e, t);
  var r = Ro(e, e === Pe ? Re : 0);
  if (r === 0) n !== null && j0(n), e.callbackNode = null, e.callbackPriority = 0;
  else if (t = r & -r, e.callbackPriority !== t) {
    if (n != null && j0(n), t === 1) e.tag === 0 ? Vw(Ld.bind(null, e)) : mp(Ld.bind(null, e)), Aw(function() {
      !(J & 6) && An();
    }), n = null;
    else {
      switch (Zx(r)) {
        case 1:
          n = ac;
          break;
        case 4:
          n = Wx;
          break;
        case 16:
          n = Io;
          break;
        case 536870912:
          n = Bx;
          break;
        default:
          n = Io;
      }
      n = ph(n, sh.bind(null, e));
    }
    e.callbackPriority = t, e.callbackNode = n;
  }
}
function sh(e, t) {
  if (so = -1, lo = 0, J & 6) throw Error(b(327));
  var n = e.callbackNode;
  if (Ar() && e.callbackNode !== n) return null;
  var r = Ro(e, e === Pe ? Re : 0);
  if (r === 0) return null;
  if (r & 30 || r & e.expiredLanes || t) t = Qo(e, r);
  else {
    t = r;
    var i = J;
    J |= 2;
    var a = uh();
    (Pe !== e || Re !== t) && (Jt = null, Qr = we() + 500, Xn(e, t));
    do
      try {
        l3();
        break;
      } catch (s) {
        lh(e, s);
      }
    while (!0);
    gc(), Go.current = a, J = i, ke !== null ? t = 0 : (Pe = null, Re = 0, t = be);
  }
  if (t !== 0) {
    if (t === 2 && (i = Ql(e), i !== 0 && (r = i, t = Cu(e, i))), t === 1) throw n = pa, Xn(e, 0), mn(e, r), Je(e, we()), n;
    if (t === 6) mn(e, r);
    else {
      if (i = e.current.alternate, !(r & 30) && !o3(i) && (t = Qo(e, r), t === 2 && (a = Ql(e), a !== 0 && (r = a, t = Cu(e, a))), t === 1)) throw n = pa, Xn(e, 0), mn(e, r), Je(e, we()), n;
      switch (e.finishedWork = i, e.finishedLanes = r, t) {
        case 0:
        case 1:
          throw Error(b(345));
        case 2:
          Wn(e, Ge, Jt);
          break;
        case 3:
          if (mn(e, r), (r & 130023424) === r && (t = Dc + 500 - we(), 10 < t)) {
            if (Ro(e, 0) !== 0) break;
            if (i = e.suspendedLanes, (i & r) !== r) {
              Be(), e.pingedLanes |= e.suspendedLanes & i;
              break;
            }
            e.timeoutHandle = iu(Wn.bind(null, e, Ge, Jt), t);
            break;
          }
          Wn(e, Ge, Jt);
          break;
        case 4:
          if (mn(e, r), (r & 4194240) === r) break;
          for (t = e.eventTimes, i = -1; 0 < r; ) {
            var o = 31 - Lt(r);
            a = 1 << o, o = t[o], o > i && (i = o), r &= ~a;
          }
          if (r = i, r = we() - r, r = (120 > r ? 120 : 480 > r ? 480 : 1080 > r ? 1080 : 1920 > r ? 1920 : 3e3 > r ? 3e3 : 4320 > r ? 4320 : 1960 * a3(r / 1960)) - r, 10 < r) {
            e.timeoutHandle = iu(Wn.bind(null, e, Ge, Jt), r);
            break;
          }
          Wn(e, Ge, Jt);
          break;
        case 5:
          Wn(e, Ge, Jt);
          break;
        default:
          throw Error(b(329));
      }
    }
  }
  return Je(e, we()), e.callbackNode === n ? sh.bind(null, e) : null;
}
function Cu(e, t) {
  var n = Ni;
  return e.current.memoizedState.isDehydrated && (Xn(e, t).flags |= 256), e = Qo(e, t), e !== 2 && (t = Ge, Ge = n, t !== null && bu(t)), e;
}
function bu(e) {
  Ge === null ? Ge = e : Ge.push.apply(Ge, e);
}
function o3(e) {
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
function mn(e, t) {
  for (t &= ~Rc, t &= ~Ps, e.suspendedLanes |= t, e.pingedLanes &= ~t, e = e.expirationTimes; 0 < t; ) {
    var n = 31 - Lt(t), r = 1 << n;
    e[n] = -1, t &= ~r;
  }
}
function Ld(e) {
  if (J & 6) throw Error(b(327));
  Ar();
  var t = Ro(e, 0);
  if (!(t & 1)) return Je(e, we()), null;
  var n = Qo(e, t);
  if (e.tag !== 0 && n === 2) {
    var r = Ql(e);
    r !== 0 && (t = r, n = Cu(e, r));
  }
  if (n === 1) throw n = pa, Xn(e, 0), mn(e, t), Je(e, we()), n;
  if (n === 6) throw Error(b(345));
  return e.finishedWork = e.current.alternate, e.finishedLanes = t, Wn(e, Ge, Jt), Je(e, we()), null;
}
function Mc(e, t) {
  var n = J;
  J |= 1;
  try {
    return e(t);
  } finally {
    J = n, J === 0 && (Qr = we() + 500, Cs && An());
  }
}
function ir(e) {
  yn !== null && yn.tag === 0 && !(J & 6) && Ar();
  var t = J;
  J |= 1;
  var n = yt.transition, r = re;
  try {
    if (yt.transition = null, re = 1, e) return e();
  } finally {
    re = r, yt.transition = n, J = t, !(J & 6) && An();
  }
}
function Oc() {
  it = Nr.current, de(Nr);
}
function Xn(e, t) {
  e.finishedWork = null, e.finishedLanes = 0;
  var n = e.timeoutHandle;
  if (n !== -1 && (e.timeoutHandle = -1, Hw(n)), ke !== null) for (n = ke.return; n !== null; ) {
    var r = n;
    switch (hc(r), r.tag) {
      case 1:
        r = r.type.childContextTypes, r != null && Ao();
        break;
      case 3:
        Yr(), de(Xe), de(ze), Cc();
        break;
      case 5:
        Sc(r);
        break;
      case 4:
        Yr();
        break;
      case 13:
        de(he);
        break;
      case 19:
        de(he);
        break;
      case 10:
        yc(r.type._context);
        break;
      case 22:
      case 23:
        Oc();
    }
    n = n.return;
  }
  if (Pe = e, ke = e = Tn(e.current, null), Re = it = t, be = 0, pa = null, Rc = Ps = rr = 0, Ge = Ni = null, $n !== null) {
    for (t = 0; t < $n.length; t++) if (n = $n[t], r = n.interleaved, r !== null) {
      n.interleaved = null;
      var i = r.next, a = n.pending;
      if (a !== null) {
        var o = a.next;
        a.next = i, r.next = o;
      }
      n.pending = r;
    }
    $n = null;
  }
  return e;
}
function lh(e, t) {
  do {
    var n = ke;
    try {
      if (gc(), io.current = $o, Zo) {
        for (var r = me.memoizedState; r !== null; ) {
          var i = r.queue;
          i !== null && (i.pending = null), r = r.next;
        }
        Zo = !1;
      }
      if (nr = 0, Te = Ce = me = null, Ti = !1, da = 0, Ic.current = null, n === null || n.return === null) {
        be = 1, pa = t, ke = null;
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
          var w = vd(o);
          if (w !== null) {
            w.flags &= -257, gd(w, o, s, a, t), w.mode & 1 && md(a, c, t), t = w, l = c;
            var y = t.updateQueue;
            if (y === null) {
              var x = /* @__PURE__ */ new Set();
              x.add(l), t.updateQueue = x;
            } else y.add(l);
            break e;
          } else {
            if (!(t & 1)) {
              md(a, c, t), Hc();
              break e;
            }
            l = Error(b(426));
          }
        } else if (xe && s.mode & 1) {
          var _ = vd(o);
          if (_ !== null) {
            !(_.flags & 65536) && (_.flags |= 256), gd(_, o, s, a, t), mc(Xr(l, s));
            break e;
          }
        }
        a = l = Xr(l, s), be !== 4 && (be = 2), Ni === null ? Ni = [a] : Ni.push(a), a = o;
        do {
          switch (a.tag) {
            case 3:
              a.flags |= 65536, t &= -t, a.lanes |= t;
              var u = Zp(a, l, t);
              cd(a, u);
              break e;
            case 1:
              s = l;
              var p = a.type, h = a.stateNode;
              if (!(a.flags & 128) && (typeof p.getDerivedStateFromError == "function" || h !== null && typeof h.componentDidCatch == "function" && (bn === null || !bn.has(h)))) {
                a.flags |= 65536, t &= -t, a.lanes |= t;
                var g = $p(a, s, t);
                cd(a, g);
                break e;
              }
          }
          a = a.return;
        } while (a !== null);
      }
      dh(n);
    } catch (k) {
      t = k, ke === n && n !== null && (ke = n = n.return);
      continue;
    }
    break;
  } while (!0);
}
function uh() {
  var e = Go.current;
  return Go.current = $o, e === null ? $o : e;
}
function Hc() {
  (be === 0 || be === 3 || be === 2) && (be = 4), Pe === null || !(rr & 268435455) && !(Ps & 268435455) || mn(Pe, Re);
}
function Qo(e, t) {
  var n = J;
  J |= 2;
  var r = uh();
  (Pe !== e || Re !== t) && (Jt = null, Xn(e, t));
  do
    try {
      s3();
      break;
    } catch (i) {
      lh(e, i);
    }
  while (!0);
  if (gc(), J = n, Go.current = r, ke !== null) throw Error(b(261));
  return Pe = null, Re = 0, be;
}
function s3() {
  for (; ke !== null; ) ch(ke);
}
function l3() {
  for (; ke !== null && !D4(); ) ch(ke);
}
function ch(e) {
  var t = xh(e.alternate, e, it);
  e.memoizedProps = e.pendingProps, t === null ? dh(e) : ke = t, Ic.current = null;
}
function dh(e) {
  var t = e;
  do {
    var n = t.alternate;
    if (e = t.return, t.flags & 32768) {
      if (n = t3(n, t), n !== null) {
        n.flags &= 32767, ke = n;
        return;
      }
      if (e !== null) e.flags |= 32768, e.subtreeFlags = 0, e.deletions = null;
      else {
        be = 6, ke = null;
        return;
      }
    } else if (n = e3(n, t, it), n !== null) {
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
function Wn(e, t, n) {
  var r = re, i = yt.transition;
  try {
    yt.transition = null, re = 1, u3(e, t, n, r);
  } finally {
    yt.transition = i, re = r;
  }
  return null;
}
function u3(e, t, n, r) {
  do
    Ar();
  while (yn !== null);
  if (J & 6) throw Error(b(327));
  n = e.finishedWork;
  var i = e.finishedLanes;
  if (n === null) return null;
  if (e.finishedWork = null, e.finishedLanes = 0, n === e.current) throw Error(b(177));
  e.callbackNode = null, e.callbackPriority = 0;
  var a = n.lanes | n.childLanes;
  if (B4(e, a), e === Pe && (ke = Pe = null, Re = 0), !(n.subtreeFlags & 2064) && !(n.flags & 2064) || Za || (Za = !0, ph(Io, function() {
    return Ar(), null;
  })), a = (n.flags & 15990) !== 0, n.subtreeFlags & 15990 || a) {
    a = yt.transition, yt.transition = null;
    var o = re;
    re = 1;
    var s = J;
    J |= 4, Ic.current = null, r3(e, n), ah(n, e), Nw(nu), Do = !!tu, nu = tu = null, e.current = n, i3(n), M4(), J = s, re = o, yt.transition = a;
  } else e.current = n;
  if (Za && (Za = !1, yn = e, Xo = i), a = e.pendingLanes, a === 0 && (bn = null), A4(n.stateNode), Je(e, we()), t !== null) for (r = e.onRecoverableError, n = 0; n < t.length; n++) i = t[n], r(i.value, { componentStack: i.stack, digest: i.digest });
  if (Yo) throw Yo = !1, e = ku, ku = null, e;
  return Xo & 1 && e.tag !== 0 && Ar(), a = e.pendingLanes, a & 1 ? e === Su ? Li++ : (Li = 0, Su = e) : Li = 0, An(), null;
}
function Ar() {
  if (yn !== null) {
    var e = Zx(Xo), t = yt.transition, n = re;
    try {
      if (yt.transition = null, re = 16 > e ? 16 : e, yn === null) var r = !1;
      else {
        if (e = yn, yn = null, Xo = 0, J & 6) throw Error(b(331));
        var i = J;
        for (J |= 4, R = e.current; R !== null; ) {
          var a = R, o = a.child;
          if (R.flags & 16) {
            var s = a.deletions;
            if (s !== null) {
              for (var l = 0; l < s.length; l++) {
                var c = s[l];
                for (R = c; R !== null; ) {
                  var d = R;
                  switch (d.tag) {
                    case 0:
                    case 11:
                    case 15:
                      Pi(8, d, a);
                  }
                  var f = d.child;
                  if (f !== null) f.return = d, R = f;
                  else for (; R !== null; ) {
                    d = R;
                    var m = d.sibling, w = d.return;
                    if (nh(d), d === c) {
                      R = null;
                      break;
                    }
                    if (m !== null) {
                      m.return = w, R = m;
                      break;
                    }
                    R = w;
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
              R = a;
            }
          }
          if (a.subtreeFlags & 2064 && o !== null) o.return = a, R = o;
          else e: for (; R !== null; ) {
            if (a = R, a.flags & 2048) switch (a.tag) {
              case 0:
              case 11:
              case 15:
                Pi(9, a, a.return);
            }
            var u = a.sibling;
            if (u !== null) {
              u.return = a.return, R = u;
              break e;
            }
            R = a.return;
          }
        }
        var p = e.current;
        for (R = p; R !== null; ) {
          o = R;
          var h = o.child;
          if (o.subtreeFlags & 2064 && h !== null) h.return = o, R = h;
          else e: for (o = p; R !== null; ) {
            if (s = R, s.flags & 2048) try {
              switch (s.tag) {
                case 0:
                case 11:
                case 15:
                  Ts(9, s);
              }
            } catch (k) {
              ge(s, s.return, k);
            }
            if (s === o) {
              R = null;
              break e;
            }
            var g = s.sibling;
            if (g !== null) {
              g.return = s.return, R = g;
              break e;
            }
            R = s.return;
          }
        }
        if (J = i, An(), Ut && typeof Ut.onPostCommitFiberRoot == "function") try {
          Ut.onPostCommitFiberRoot(ys, e);
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
function Id(e, t, n) {
  t = Xr(n, t), t = Zp(e, t, 1), e = Cn(e, t, 1), t = Be(), e !== null && (_a(e, 1, t), Je(e, t));
}
function ge(e, t, n) {
  if (e.tag === 3) Id(e, e, n);
  else for (; t !== null; ) {
    if (t.tag === 3) {
      Id(t, e, n);
      break;
    } else if (t.tag === 1) {
      var r = t.stateNode;
      if (typeof t.type.getDerivedStateFromError == "function" || typeof r.componentDidCatch == "function" && (bn === null || !bn.has(r))) {
        e = Xr(n, e), e = $p(t, e, 1), t = Cn(t, e, 1), e = Be(), t !== null && (_a(t, 1, e), Je(t, e));
        break;
      }
    }
    t = t.return;
  }
}
function c3(e, t, n) {
  var r = e.pingCache;
  r !== null && r.delete(t), t = Be(), e.pingedLanes |= e.suspendedLanes & n, Pe === e && (Re & n) === n && (be === 4 || be === 3 && (Re & 130023424) === Re && 500 > we() - Dc ? Xn(e, 0) : Rc |= n), Je(e, t);
}
function fh(e, t) {
  t === 0 && (e.mode & 1 ? (t = Oa, Oa <<= 1, !(Oa & 130023424) && (Oa = 4194304)) : t = 1);
  var n = Be();
  e = sn(e, t), e !== null && (_a(e, t, n), Je(e, n));
}
function d3(e) {
  var t = e.memoizedState, n = 0;
  t !== null && (n = t.retryLane), fh(e, n);
}
function f3(e, t) {
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
  r !== null && r.delete(t), fh(e, n);
}
var xh;
xh = function(e, t, n) {
  if (e !== null) if (e.memoizedProps !== t.pendingProps || Xe.current) Ye = !0;
  else {
    if (!(e.lanes & n) && !(t.flags & 128)) return Ye = !1, qw(e, t, n);
    Ye = !!(e.flags & 131072);
  }
  else Ye = !1, xe && t.flags & 1048576 && vp(t, zo, t.index);
  switch (t.lanes = 0, t.tag) {
    case 2:
      var r = t.type;
      oo(e, t), e = t.pendingProps;
      var i = Zr(t, ze.current);
      Hr(t, n), i = Ec(null, t, r, e, i, n);
      var a = Tc();
      return t.flags |= 1, typeof i == "object" && i !== null && typeof i.render == "function" && i.$$typeof === void 0 ? (t.tag = 1, t.memoizedState = null, t.updateQueue = null, Qe(r) ? (a = !0, jo(t)) : a = !1, t.memoizedState = i.state !== null && i.state !== void 0 ? i.state : null, _c(t), i.updater = Es, t.stateNode = i, i._reactInternals = t, du(t, r, e, n), t = pu(null, t, r, !0, a, n)) : (t.tag = 0, xe && a && pc(t), We(null, t, i, n), t = t.child), t;
    case 16:
      r = t.elementType;
      e: {
        switch (oo(e, t), e = t.pendingProps, i = r._init, r = i(r._payload), t.type = r, i = t.tag = p3(r), e = bt(r, e), i) {
          case 0:
            t = xu(null, t, r, e, n);
            break e;
          case 1:
            t = _d(null, t, r, e, n);
            break e;
          case 11:
            t = yd(null, t, r, e, n);
            break e;
          case 14:
            t = wd(null, t, r, bt(r.type, e), n);
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
      return r = t.type, i = t.pendingProps, i = t.elementType === r ? i : bt(r, i), xu(e, t, r, i, n);
    case 1:
      return r = t.type, i = t.pendingProps, i = t.elementType === r ? i : bt(r, i), _d(e, t, r, i, n);
    case 3:
      e: {
        if (Qp(t), e === null) throw Error(b(387));
        r = t.pendingProps, a = t.memoizedState, i = a.element, Sp(e, t), Bo(t, r, null, n);
        var o = t.memoizedState;
        if (r = o.element, a.isDehydrated) if (a = { element: r, isDehydrated: !1, cache: o.cache, pendingSuspenseBoundaries: o.pendingSuspenseBoundaries, transitions: o.transitions }, t.updateQueue.baseState = a, t.memoizedState = a, t.flags & 256) {
          i = Xr(Error(b(423)), t), t = kd(e, t, r, n, i);
          break e;
        } else if (r !== i) {
          i = Xr(Error(b(424)), t), t = kd(e, t, r, n, i);
          break e;
        } else for (at = Sn(t.stateNode.containerInfo.firstChild), lt = t, xe = !0, Tt = null, n = _p(t, null, r, n), t.child = n; n; ) n.flags = n.flags & -3 | 4096, n = n.sibling;
        else {
          if ($r(), r === i) {
            t = ln(e, t, n);
            break e;
          }
          We(e, t, r, n);
        }
        t = t.child;
      }
      return t;
    case 5:
      return Cp(t), e === null && lu(t), r = t.type, i = t.pendingProps, a = e !== null ? e.memoizedProps : null, o = i.children, ru(r, i) ? o = null : a !== null && ru(r, a) && (t.flags |= 32), Xp(e, t), We(e, t, o, n), t.child;
    case 6:
      return e === null && lu(t), null;
    case 13:
      return Jp(e, t, n);
    case 4:
      return kc(t, t.stateNode.containerInfo), r = t.pendingProps, e === null ? t.child = Gr(t, null, r, n) : We(e, t, r, n), t.child;
    case 11:
      return r = t.type, i = t.pendingProps, i = t.elementType === r ? i : bt(r, i), yd(e, t, r, i, n);
    case 7:
      return We(e, t, t.pendingProps, n), t.child;
    case 8:
      return We(e, t, t.pendingProps.children, n), t.child;
    case 12:
      return We(e, t, t.pendingProps.children, n), t.child;
    case 10:
      e: {
        if (r = t.type._context, i = t.pendingProps, a = t.memoizedProps, o = i.value, oe(Vo, r._currentValue), r._currentValue = o, a !== null) if (Dt(a.value, o)) {
          if (a.children === i.children && !Xe.current) {
            t = ln(e, t, n);
            break e;
          }
        } else for (a = t.child, a !== null && (a.return = t); a !== null; ) {
          var s = a.dependencies;
          if (s !== null) {
            o = a.child;
            for (var l = s.firstContext; l !== null; ) {
              if (l.context === r) {
                if (a.tag === 1) {
                  l = nn(-1, n & -n), l.tag = 2;
                  var c = a.updateQueue;
                  if (c !== null) {
                    c = c.shared;
                    var d = c.pending;
                    d === null ? l.next = l : (l.next = d.next, d.next = l), c.pending = l;
                  }
                }
                a.lanes |= n, l = a.alternate, l !== null && (l.lanes |= n), uu(
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
            o.lanes |= n, s = o.alternate, s !== null && (s.lanes |= n), uu(o, n, t), o = a.sibling;
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
        We(e, t, i.children, n), t = t.child;
      }
      return t;
    case 9:
      return i = t.type, r = t.pendingProps.children, Hr(t, n), i = wt(i), r = r(i), t.flags |= 1, We(e, t, r, n), t.child;
    case 14:
      return r = t.type, i = bt(r, t.pendingProps), i = bt(r.type, i), wd(e, t, r, i, n);
    case 15:
      return Gp(e, t, t.type, t.pendingProps, n);
    case 17:
      return r = t.type, i = t.pendingProps, i = t.elementType === r ? i : bt(r, i), oo(e, t), t.tag = 1, Qe(r) ? (e = !0, jo(t)) : e = !1, Hr(t, n), Up(t, r, i), du(t, r, i, n), pu(null, t, r, !0, e, n);
    case 19:
      return Kp(e, t, n);
    case 22:
      return Yp(e, t, n);
  }
  throw Error(b(156, t.tag));
};
function ph(e, t) {
  return Vx(e, t);
}
function x3(e, t, n, r) {
  this.tag = e, this.key = n, this.sibling = this.child = this.return = this.stateNode = this.type = this.elementType = null, this.index = 0, this.ref = null, this.pendingProps = t, this.dependencies = this.memoizedState = this.updateQueue = this.memoizedProps = null, this.mode = r, this.subtreeFlags = this.flags = 0, this.deletions = null, this.childLanes = this.lanes = 0, this.alternate = null;
}
function gt(e, t, n, r) {
  return new x3(e, t, n, r);
}
function Ac(e) {
  return e = e.prototype, !(!e || !e.isReactComponent);
}
function p3(e) {
  if (typeof e == "function") return Ac(e) ? 1 : 0;
  if (e != null) {
    if (e = e.$$typeof, e === nc) return 11;
    if (e === rc) return 14;
  }
  return 2;
}
function Tn(e, t) {
  var n = e.alternate;
  return n === null ? (n = gt(e.tag, t, e.key, e.mode), n.elementType = e.elementType, n.type = e.type, n.stateNode = e.stateNode, n.alternate = e, e.alternate = n) : (n.pendingProps = t, n.type = e.type, n.flags = 0, n.subtreeFlags = 0, n.deletions = null), n.flags = e.flags & 14680064, n.childLanes = e.childLanes, n.lanes = e.lanes, n.child = e.child, n.memoizedProps = e.memoizedProps, n.memoizedState = e.memoizedState, n.updateQueue = e.updateQueue, t = e.dependencies, n.dependencies = t === null ? null : { lanes: t.lanes, firstContext: t.firstContext }, n.sibling = e.sibling, n.index = e.index, n.ref = e.ref, n;
}
function uo(e, t, n, r, i, a) {
  var o = 2;
  if (r = e, typeof e == "function") Ac(e) && (o = 1);
  else if (typeof e == "string") o = 5;
  else e: switch (e) {
    case yr:
      return Qn(n.children, i, a, t);
    case tc:
      o = 8, i |= 8;
      break;
    case Ol:
      return e = gt(12, n, t, i | 2), e.elementType = Ol, e.lanes = a, e;
    case Hl:
      return e = gt(13, n, t, i), e.elementType = Hl, e.lanes = a, e;
    case Al:
      return e = gt(19, n, t, i), e.elementType = Al, e.lanes = a, e;
    case Cx:
      return Ns(n, i, a, t);
    default:
      if (typeof e == "object" && e !== null) switch (e.$$typeof) {
        case kx:
          o = 10;
          break e;
        case Sx:
          o = 9;
          break e;
        case nc:
          o = 11;
          break e;
        case rc:
          o = 14;
          break e;
        case fn:
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
function Ns(e, t, n, r) {
  return e = gt(22, e, r, t), e.elementType = Cx, e.lanes = n, e.stateNode = { isHidden: !1 }, e;
}
function xl(e, t, n) {
  return e = gt(6, e, null, t), e.lanes = n, e;
}
function pl(e, t, n) {
  return t = gt(4, e.children !== null ? e.children : [], e.key, t), t.lanes = n, t.stateNode = { containerInfo: e.containerInfo, pendingChildren: null, implementation: e.implementation }, t;
}
function h3(e, t, n, r, i) {
  this.tag = t, this.containerInfo = e, this.finishedWork = this.pingCache = this.current = this.pendingChildren = null, this.timeoutHandle = -1, this.callbackNode = this.pendingContext = this.context = null, this.callbackPriority = 0, this.eventTimes = Ys(0), this.expirationTimes = Ys(-1), this.entangledLanes = this.finishedLanes = this.mutableReadLanes = this.expiredLanes = this.pingedLanes = this.suspendedLanes = this.pendingLanes = 0, this.entanglements = Ys(0), this.identifierPrefix = r, this.onRecoverableError = i, this.mutableSourceEagerHydrationData = null;
}
function jc(e, t, n, r, i, a, o, s, l) {
  return e = new h3(e, t, n, s, l), t === 1 ? (t = 1, a === !0 && (t |= 8)) : t = 0, a = gt(3, null, null, t), e.current = a, a.stateNode = e, a.memoizedState = { element: r, isDehydrated: n, cache: null, transitions: null, pendingSuspenseBoundaries: null }, _c(a), e;
}
function m3(e, t, n) {
  var r = 3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
  return { $$typeof: gr, key: r == null ? null : "" + r, children: e, containerInfo: t, implementation: n };
}
function hh(e) {
  if (!e) return Dn;
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
    if (Qe(n)) return hp(e, n, t);
  }
  return t;
}
function mh(e, t, n, r, i, a, o, s, l) {
  return e = jc(n, r, !0, e, i, a, o, s, l), e.context = hh(null), n = e.current, r = Be(), i = En(n), a = nn(r, i), a.callback = t ?? null, Cn(n, a, i), e.current.lanes = i, _a(e, i, r), Je(e, r), e;
}
function Ls(e, t, n, r) {
  var i = t.current, a = Be(), o = En(i);
  return n = hh(n), t.context === null ? t.context = n : t.pendingContext = n, t = nn(a, o), t.payload = { element: e }, r = r === void 0 ? null : r, r !== null && (t.callback = r), e = Cn(i, t, o), e !== null && (It(e, i, o, a), ro(e, i, o)), o;
}
function Jo(e) {
  if (e = e.current, !e.child) return null;
  switch (e.child.tag) {
    case 5:
      return e.child.stateNode;
    default:
      return e.child.stateNode;
  }
}
function Rd(e, t) {
  if (e = e.memoizedState, e !== null && e.dehydrated !== null) {
    var n = e.retryLane;
    e.retryLane = n !== 0 && n < t ? n : t;
  }
}
function Fc(e, t) {
  Rd(e, t), (e = e.alternate) && Rd(e, t);
}
function v3() {
  return null;
}
var vh = typeof reportError == "function" ? reportError : function(e) {
  console.error(e);
};
function zc(e) {
  this._internalRoot = e;
}
Is.prototype.render = zc.prototype.render = function(e) {
  var t = this._internalRoot;
  if (t === null) throw Error(b(409));
  Ls(e, t, null, null);
};
Is.prototype.unmount = zc.prototype.unmount = function() {
  var e = this._internalRoot;
  if (e !== null) {
    this._internalRoot = null;
    var t = e.containerInfo;
    ir(function() {
      Ls(null, e, null, null);
    }), t[on] = null;
  }
};
function Is(e) {
  this._internalRoot = e;
}
Is.prototype.unstable_scheduleHydration = function(e) {
  if (e) {
    var t = Yx();
    e = { blockedOn: null, target: e, priority: t };
    for (var n = 0; n < hn.length && t !== 0 && t < hn[n].priority; n++) ;
    hn.splice(n, 0, e), n === 0 && Qx(e);
  }
};
function Vc(e) {
  return !(!e || e.nodeType !== 1 && e.nodeType !== 9 && e.nodeType !== 11);
}
function Rs(e) {
  return !(!e || e.nodeType !== 1 && e.nodeType !== 9 && e.nodeType !== 11 && (e.nodeType !== 8 || e.nodeValue !== " react-mount-point-unstable "));
}
function Dd() {
}
function g3(e, t, n, r, i) {
  if (i) {
    if (typeof r == "function") {
      var a = r;
      r = function() {
        var c = Jo(o);
        a.call(c);
      };
    }
    var o = mh(t, r, e, 0, null, !1, !1, "", Dd);
    return e._reactRootContainer = o, e[on] = o.current, oa(e.nodeType === 8 ? e.parentNode : e), ir(), o;
  }
  for (; i = e.lastChild; ) e.removeChild(i);
  if (typeof r == "function") {
    var s = r;
    r = function() {
      var c = Jo(l);
      s.call(c);
    };
  }
  var l = jc(e, 0, !1, null, null, !1, !1, "", Dd);
  return e._reactRootContainer = l, e[on] = l.current, oa(e.nodeType === 8 ? e.parentNode : e), ir(function() {
    Ls(t, l, n, r);
  }), l;
}
function Ds(e, t, n, r, i) {
  var a = n._reactRootContainer;
  if (a) {
    var o = a;
    if (typeof i == "function") {
      var s = i;
      i = function() {
        var l = Jo(o);
        s.call(l);
      };
    }
    Ls(t, o, e, i);
  } else o = g3(n, t, e, i, r);
  return Jo(o);
}
$x = function(e) {
  switch (e.tag) {
    case 3:
      var t = e.stateNode;
      if (t.current.memoizedState.isDehydrated) {
        var n = gi(t.pendingLanes);
        n !== 0 && (oc(t, n | 1), Je(t, we()), !(J & 6) && (Qr = we() + 500, An()));
      }
      break;
    case 13:
      ir(function() {
        var r = sn(e, 1);
        if (r !== null) {
          var i = Be();
          It(r, e, 1, i);
        }
      }), Fc(e, 1);
  }
};
sc = function(e) {
  if (e.tag === 13) {
    var t = sn(e, 134217728);
    if (t !== null) {
      var n = Be();
      It(t, e, 134217728, n);
    }
    Fc(e, 134217728);
  }
};
Gx = function(e) {
  if (e.tag === 13) {
    var t = En(e), n = sn(e, t);
    if (n !== null) {
      var r = Be();
      It(n, e, t, r);
    }
    Fc(e, t);
  }
};
Yx = function() {
  return re;
};
Xx = function(e, t) {
  var n = re;
  try {
    return re = e, t();
  } finally {
    re = n;
  }
};
Gl = function(e, t, n) {
  switch (t) {
    case "input":
      if (zl(e, n), t = n.name, n.type === "radio" && t != null) {
        for (n = e; n.parentNode; ) n = n.parentNode;
        for (n = n.querySelectorAll("input[name=" + JSON.stringify("" + t) + '][type="radio"]'), t = 0; t < n.length; t++) {
          var r = n[t];
          if (r !== e && r.form === e.form) {
            var i = Ss(r);
            if (!i) throw Error(b(90));
            Ex(r), zl(r, i);
          }
        }
      }
      break;
    case "textarea":
      Px(e, n);
      break;
    case "select":
      t = n.value, t != null && Rr(e, !!n.multiple, t, !1);
  }
};
Ox = Mc;
Hx = ir;
var y3 = { usingClientEntryPoint: !1, Events: [Sa, Sr, Ss, Dx, Mx, Mc] }, xi = { findFiberByHostInstance: Zn, bundleType: 0, version: "18.3.1", rendererPackageName: "react-dom" }, w3 = { bundleType: xi.bundleType, version: xi.version, rendererPackageName: xi.rendererPackageName, rendererConfig: xi.rendererConfig, overrideHookState: null, overrideHookStateDeletePath: null, overrideHookStateRenamePath: null, overrideProps: null, overridePropsDeletePath: null, overridePropsRenamePath: null, setErrorHandler: null, setSuspenseHandler: null, scheduleUpdate: null, currentDispatcherRef: un.ReactCurrentDispatcher, findHostInstanceByFiber: function(e) {
  return e = Fx(e), e === null ? null : e.stateNode;
}, findFiberByHostInstance: xi.findFiberByHostInstance || v3, findHostInstancesForRefresh: null, scheduleRefresh: null, scheduleRoot: null, setRefreshHandler: null, getCurrentFiber: null, reconcilerVersion: "18.3.1-next-f1338f8080-20240426" };
if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < "u") {
  var $a = __REACT_DEVTOOLS_GLOBAL_HOOK__;
  if (!$a.isDisabled && $a.supportsFiber) try {
    ys = $a.inject(w3), Ut = $a;
  } catch {
  }
}
dt.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = y3;
dt.createPortal = function(e, t) {
  var n = 2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
  if (!Vc(t)) throw Error(b(200));
  return m3(e, t, null, n);
};
dt.createRoot = function(e, t) {
  if (!Vc(e)) throw Error(b(299));
  var n = !1, r = "", i = vh;
  return t != null && (t.unstable_strictMode === !0 && (n = !0), t.identifierPrefix !== void 0 && (r = t.identifierPrefix), t.onRecoverableError !== void 0 && (i = t.onRecoverableError)), t = jc(e, 1, !1, null, null, n, !1, r, i), e[on] = t.current, oa(e.nodeType === 8 ? e.parentNode : e), new zc(t);
};
dt.findDOMNode = function(e) {
  if (e == null) return null;
  if (e.nodeType === 1) return e;
  var t = e._reactInternals;
  if (t === void 0)
    throw typeof e.render == "function" ? Error(b(188)) : (e = Object.keys(e).join(","), Error(b(268, e)));
  return e = Fx(t), e = e === null ? null : e.stateNode, e;
};
dt.flushSync = function(e) {
  return ir(e);
};
dt.hydrate = function(e, t, n) {
  if (!Rs(t)) throw Error(b(200));
  return Ds(null, e, t, !0, n);
};
dt.hydrateRoot = function(e, t, n) {
  if (!Vc(e)) throw Error(b(405));
  var r = n != null && n.hydratedSources || null, i = !1, a = "", o = vh;
  if (n != null && (n.unstable_strictMode === !0 && (i = !0), n.identifierPrefix !== void 0 && (a = n.identifierPrefix), n.onRecoverableError !== void 0 && (o = n.onRecoverableError)), t = mh(t, null, e, 1, n ?? null, i, !1, a, o), e[on] = t.current, oa(e), r) for (e = 0; e < r.length; e++) n = r[e], i = n._getVersion, i = i(n._source), t.mutableSourceEagerHydrationData == null ? t.mutableSourceEagerHydrationData = [n, i] : t.mutableSourceEagerHydrationData.push(
    n,
    i
  );
  return new Is(t);
};
dt.render = function(e, t, n) {
  if (!Rs(t)) throw Error(b(200));
  return Ds(null, e, t, !1, n);
};
dt.unmountComponentAtNode = function(e) {
  if (!Rs(e)) throw Error(b(40));
  return e._reactRootContainer ? (ir(function() {
    Ds(null, null, e, !1, function() {
      e._reactRootContainer = null, e[on] = null;
    });
  }), !0) : !1;
};
dt.unstable_batchedUpdates = Mc;
dt.unstable_renderSubtreeIntoContainer = function(e, t, n, r) {
  if (!Rs(n)) throw Error(b(200));
  if (e == null || e._reactInternals === void 0) throw Error(b(38));
  return Ds(e, t, n, !1, r);
};
dt.version = "18.3.1-next-f1338f8080-20240426";
function gh() {
  if (!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > "u" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != "function"))
    try {
      __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(gh);
    } catch (e) {
      console.error(e);
    }
}
gh(), gx.exports = dt;
var _3 = gx.exports, co, k3 = _3;
co = k3.createRoot;
var Md;
const yh = "procaptcha.bundle.js", wh = () => document.querySelector('script[src*="'.concat(yh, '"]')), S3 = (e) => {
  const t = wh();
  if (t && t.src.indexOf("".concat(e)) !== -1) {
    const n = new URLSearchParams(t.src.split("?")[1]);
    return {
      onloadUrlCallback: n.get("onload") || void 0,
      renderExplicit: n.get("render") || void 0
    };
  }
  return { onloadUrlCallback: void 0, renderExplicit: void 0 };
}, _h = (e) => (e || (e = ""), f4.parse({
  defaultEnvironment: To.parse("production"),
  defaultNetwork: vn.parse("astar"),
  userAccountAddress: "",
  account: {
    address: e
  },
  serverUrl: "",
  mongoAtlasUri: "",
  devOnlyWatchEvents: !1
})), C3 = (e) => e.closest("form"), Bn = (e) => {
  const t = window[e.replace("window.", "")];
  if (typeof t != "function")
    throw new Error("Callback ".concat(e, " is not defined on the window object"));
  return t;
}, Eu = (e, t) => {
  Ft();
  const n = C3(e);
  if (!n) {
    console.error("Parent form not found for the element:", e);
    return;
  }
  const r = document.createElement("input");
  r.type = "hidden", r.name = D.procaptchaResponse, r.value = t, n.appendChild(r);
}, b3 = /* @__PURE__ */ new Set(["light", "dark"]), E3 = (e) => b3.has(e) ? e : "light", T3 = (e, t, n) => {
  const r = (e == null ? void 0 : e["challenge-valid-length"]) || t.getAttribute("data-challenge-valid-length");
  r && (n.captchas.image.solutionTimeout = Number.parseInt(r), n.captchas.pow.solutionTimeout = Number.parseInt(r));
}, Ft = () => {
  Array.from(document.getElementsByName(D.procaptchaResponse)).map((t) => t.remove());
}, P3 = (e) => ({
  onHuman: (t) => Eu(e, t),
  onChallengeExpired: () => {
    Ft();
  },
  onExpired: () => {
    Ft(), alert("Completed challenge has expired, please try again");
  },
  onError: (t) => {
    Ft(), console.error(t);
  },
  onClose: () => {
  },
  onOpen: () => {
  }
}), N3 = (e, t, n) => {
  const r = (e == null ? void 0 : e.theme) || t.getAttribute("data-theme") || "light";
  n.theme = E3(r);
};
function L3(e, t, n) {
  if (typeof (e == null ? void 0 : e.callback) == "function") {
    const r = e.callback;
    t.onHuman = (i) => {
      Eu(n, i), r(i);
    };
  } else {
    const r = typeof (e == null ? void 0 : e.callback) == "string" ? e == null ? void 0 : e.callback : n.getAttribute("data-callback");
    r && (t.onHuman = (i) => {
      Eu(n, i), Bn(r)(i);
    });
  }
  if (e && e["chalexpired-callback"] && typeof e["chalexpired-callback"] == "function") {
    const r = e["chalexpired-callback"];
    t.onChallengeExpired = () => {
      Ft(), r();
    };
  } else {
    const r = typeof (e == null ? void 0 : e["chalexpired-callback"]) == "string" ? e == null ? void 0 : e["chalexpired-callback"] : n.getAttribute("data-chalexpired-callback");
    r && (t.onChallengeExpired = () => {
      const i = Bn(r);
      Ft(), i();
    });
  }
  if (e && e["expired-callback"] && typeof e["expired-callback"] == "function") {
    const r = e["expired-callback"];
    t.onExpired = () => {
      Ft(), r();
    };
  } else {
    const r = typeof (e == null ? void 0 : e["expired-callback"]) == "string" ? e == null ? void 0 : e["expired-callback"] : n.getAttribute("data-expired-callback");
    r && (t.onExpired = () => {
      const i = Bn(r);
      Ft(), i();
    });
  }
  if (e && (e != null && e["error-callback"]) && typeof e["error-callback"] == "function") {
    const r = e["error-callback"];
    t.onError = () => {
      Ft(), r();
    };
  } else {
    const r = typeof (e == null ? void 0 : e["error-callback"]) == "string" ? e == null ? void 0 : e["error-callback"] : n.getAttribute("data-error-callback");
    r && (t.onError = () => {
      const i = Bn(r);
      Ft(), i();
    });
  }
  if (typeof (e == null ? void 0 : e["close-callback"]) == "function")
    t.onClose = e["close-callback"];
  else {
    const r = typeof (e == null ? void 0 : e["close-callback"]) == "string" ? e == null ? void 0 : e["close-callback"] : n.getAttribute("data-close-callback");
    r && (t.onClose = Bn(r));
  }
  if (e != null && e["open-callback"])
    if (typeof e["open-callback"] == "function")
      t.onOpen = e["open-callback"];
    else {
      const r = typeof (e == null ? void 0 : e["open-callback"]) == "string" ? e == null ? void 0 : e["open-callback"] : n.getAttribute("data-open-callback");
      r && (t.onOpen = Bn(r));
    }
}
const kh = (e, t, n) => {
  for (const r of e) {
    const i = P3(r);
    switch (L3(n, i, r), N3(n, r, t), T3(n, r, t), n == null ? void 0 : n.captchaType) {
      case "pow":
        co(r).render(Vt.jsx(mx, { config: t, callbacks: i }));
        break;
      case "frictionless":
        co(r).render(Vt.jsx(m4, { config: t, callbacks: i }));
        break;
      default:
        co(r).render(Vt.jsx(vx, { config: t, callbacks: i }));
        break;
    }
  }
}, I3 = () => {
  const e = Array.from(document.getElementsByClassName("procaptcha"));
  if (e.length) {
    const t = w0(e, 0).getAttribute("data-sitekey");
    if (!t) {
      console.error("No siteKey found");
      return;
    }
    const r = Object.values(Dl).find((i) => i === w0(e, 0).getAttribute("data-captcha-type")) || "frictionless";
    kh(e, _h(t), { captchaType: r, siteKey: t });
  }
}, R3 = (e, t) => {
  const n = t.siteKey;
  kh([e], _h(n), t);
};
function Wc(e) {
  document && document.readyState !== "loading" ? e() : document.addEventListener("DOMContentLoaded", e);
}
window.procaptcha = { ready: Wc, render: R3 };
const { onloadUrlCallback: Od, renderExplicit: D3 } = S3(yh);
D3 !== "explicit" && Wc(I3);
if (Od) {
  const e = Bn(Od);
  (Md = wh()) == null || Md.addEventListener("load", () => {
    Wc(e);
  });
}
export {
  D as A,
  M3 as B,
  g2 as C,
  ya as D,
  O3 as E,
  ht as F,
  F3 as G,
  R3 as H,
  Wc as I,
  w2 as L,
  f4 as P,
  zh as R,
  z3 as S,
  Cf as T,
  y2 as W,
  w0 as a,
  Hi as b,
  p2 as c,
  Lf as d,
  j3 as e,
  m2 as f,
  v2 as g,
  h2 as h,
  x2 as i,
  Z as j,
  d2 as k,
  Nf as l,
  f2 as m,
  b2 as n,
  gf as o,
  kf as p,
  qg as q,
  ae as r,
  wf as s,
  Bu as t,
  A3 as u,
  vf as v,
  Sf as w,
  E2 as x,
  Ch as y,
  rt as z
};
