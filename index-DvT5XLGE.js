function Ch(e, t) {
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
var Ow = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {};
function bh(e) {
  return e && e.__esModule && Object.prototype.hasOwnProperty.call(e, "default") ? e.default : e;
}
var Hd = { exports: {} }, Ko = {}, Ad = { exports: {} }, Y = {};
var ha = Symbol.for("react.element"), Eh = Symbol.for("react.portal"), Th = Symbol.for("react.fragment"), Ph = Symbol.for("react.strict_mode"), Nh = Symbol.for("react.profiler"), Lh = Symbol.for("react.provider"), Ih = Symbol.for("react.context"), Rh = Symbol.for("react.forward_ref"), Dh = Symbol.for("react.suspense"), Mh = Symbol.for("react.memo"), Oh = Symbol.for("react.lazy"), Bc = Symbol.iterator;
function Hh(e) {
  return e === null || typeof e != "object" ? null : (e = Bc && e[Bc] || e["@@iterator"], typeof e == "function" ? e : null);
}
var jd = { isMounted: function() {
  return !1;
}, enqueueForceUpdate: function() {
}, enqueueReplaceState: function() {
}, enqueueSetState: function() {
} }, Fd = Object.assign, zd = {};
function Kr(e, t, n) {
  this.props = e, this.context = t, this.refs = zd, this.updater = n || jd;
}
Kr.prototype.isReactComponent = {};
Kr.prototype.setState = function(e, t) {
  if (typeof e != "object" && typeof e != "function" && e != null) throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");
  this.updater.enqueueSetState(this, e, t, "setState");
};
Kr.prototype.forceUpdate = function(e) {
  this.updater.enqueueForceUpdate(this, e, "forceUpdate");
};
function Wd() {
}
Wd.prototype = Kr.prototype;
function Tu(e, t, n) {
  this.props = e, this.context = t, this.refs = zd, this.updater = n || jd;
}
var Pu = Tu.prototype = new Wd();
Pu.constructor = Tu;
Fd(Pu, Kr.prototype);
Pu.isPureReactComponent = !0;
var Uc = Array.isArray, Vd = Object.prototype.hasOwnProperty, Nu = { current: null }, Bd = { key: !0, ref: !0, __self: !0, __source: !0 };
function Ud(e, t, n) {
  var r, i = {}, a = null, o = null;
  if (t != null) for (r in t.ref !== void 0 && (o = t.ref), t.key !== void 0 && (a = "" + t.key), t) Vd.call(t, r) && !Bd.hasOwnProperty(r) && (i[r] = t[r]);
  var s = arguments.length - 2;
  if (s === 1) i.children = n;
  else if (1 < s) {
    for (var l = Array(s), c = 0; c < s; c++) l[c] = arguments[c + 2];
    i.children = l;
  }
  if (e && e.defaultProps) for (r in s = e.defaultProps, s) i[r] === void 0 && (i[r] = s[r]);
  return { $$typeof: ha, type: e, key: a, ref: o, props: i, _owner: Nu.current };
}
function Ah(e, t) {
  return { $$typeof: ha, type: e.type, key: t, ref: e.ref, props: e.props, _owner: e._owner };
}
function Lu(e) {
  return typeof e == "object" && e !== null && e.$$typeof === ha;
}
function jh(e) {
  var t = { "=": "=0", ":": "=2" };
  return "$" + e.replace(/[=:]/g, function(n) {
    return t[n];
  });
}
var $c = /\/+/g;
function Os(e, t) {
  return typeof e == "object" && e !== null && e.key != null ? jh("" + e.key) : t.toString(36);
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
        case Eh:
          o = !0;
      }
  }
  if (o) return o = e, i = i(o), e = r === "" ? "." + Os(o, 0) : r, Uc(i) ? (n = "", e != null && (n = e.replace($c, "$&/") + "/"), Ga(i, t, n, "", function(c) {
    return c;
  })) : i != null && (Lu(i) && (i = Ah(i, n + (!i.key || o && o.key === i.key ? "" : ("" + i.key).replace($c, "$&/") + "/") + e)), t.push(i)), 1;
  if (o = 0, r = r === "" ? "." : r + ":", Uc(e)) for (var s = 0; s < e.length; s++) {
    a = e[s];
    var l = r + Os(a, s);
    o += Ga(a, t, n, l, i);
  }
  else if (l = Hh(e), typeof l == "function") for (e = l.call(e), s = 0; !(a = e.next()).done; ) a = a.value, l = r + Os(a, s++), o += Ga(a, t, n, l, i);
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
function Fh(e) {
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
var $e = { current: null }, Ya = { transition: null }, zh = { ReactCurrentDispatcher: $e, ReactCurrentBatchConfig: Ya, ReactCurrentOwner: Nu };
function $d() {
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
Y.Component = Kr;
Y.Fragment = Th;
Y.Profiler = Nh;
Y.PureComponent = Tu;
Y.StrictMode = Ph;
Y.Suspense = Dh;
Y.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = zh;
Y.act = $d;
Y.cloneElement = function(e, t, n) {
  if (e == null) throw Error("React.cloneElement(...): The argument must be a React element, but you passed " + e + ".");
  var r = Fd({}, e.props), i = e.key, a = e.ref, o = e._owner;
  if (t != null) {
    if (t.ref !== void 0 && (a = t.ref, o = Nu.current), t.key !== void 0 && (i = "" + t.key), e.type && e.type.defaultProps) var s = e.type.defaultProps;
    for (l in t) Vd.call(t, l) && !Bd.hasOwnProperty(l) && (r[l] = t[l] === void 0 && s !== void 0 ? s[l] : t[l]);
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
  return e = { $$typeof: Ih, _currentValue: e, _currentValue2: e, _threadCount: 0, Provider: null, Consumer: null, _defaultValue: null, _globalName: null }, e.Provider = { $$typeof: Lh, _context: e }, e.Consumer = e;
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
  return { $$typeof: Rh, render: e };
};
Y.isValidElement = Lu;
Y.lazy = function(e) {
  return { $$typeof: Oh, _payload: { _status: -1, _result: e }, _init: Fh };
};
Y.memo = function(e, t) {
  return { $$typeof: Mh, type: e, compare: t === void 0 ? null : t };
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
Y.unstable_act = $d;
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
Ad.exports = Y;
var ae = Ad.exports;
const Wh = /* @__PURE__ */ bh(ae), Zc = /* @__PURE__ */ Ch({
  __proto__: null,
  default: Wh
}, [ae]);
var Vh = ae, Bh = Symbol.for("react.element"), Uh = Symbol.for("react.fragment"), $h = Object.prototype.hasOwnProperty, Zh = Vh.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner, Gh = { key: !0, ref: !0, __self: !0, __source: !0 };
function Zd(e, t, n) {
  var r, i = {}, a = null, o = null;
  n !== void 0 && (a = "" + n), t.key !== void 0 && (a = "" + t.key), t.ref !== void 0 && (o = t.ref);
  for (r in t) $h.call(t, r) && !Gh.hasOwnProperty(r) && (i[r] = t[r]);
  if (e && e.defaultProps) for (r in t = e.defaultProps, t) i[r] === void 0 && (i[r] = t[r]);
  return { $$typeof: Bh, type: e, key: a, ref: o, props: i, _owner: Zh.current };
}
Ko.Fragment = Uh;
Ko.jsx = Zd;
Ko.jsxs = Zd;
Hd.exports = Ko;
var Wt = Hd.exports, v = U;
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
function Yh(e, t) {
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
function Ri(e, t) {
  return new Promise(function(n) {
    return setTimeout(n, e, t);
  });
}
function Xh(e, t) {
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
  }) : Ri(Math.min(e, t));
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
          return a < e[l(343)] ? (r[a] = t(e[a], a), o = Date[l(738)](), o >= i + n ? (i = o, [4, Ri(0)]) : [3, 3]) : [3, 4];
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
function Di(e) {
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
function cr(e, t) {
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
function Qh(e, t) {
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
    ], s = pt(s, c), s = cr(s, 31), s = pt(s, d), a = fe(a, s), a = cr(a, 27), a = cn(a, o), a = cn(pt(a, [0, 5]), [0, 1390208809]), l = pt(l, d), l = cr(l, 33), l = pt(l, c), o = fe(o, l), o = cr(o, 31), o = cn(o, a), o = cn(pt(o, [0, 5]), [0, 944331445]);
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
      l = fe(l, [0, e.charCodeAt(f + 8)]), l = pt(l, d), l = cr(l, 33), l = pt(l, c), o = fe(o, l);
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
      s = fe(s, [0, e[n(655)](f)]), s = pt(s, c), s = cr(s, 31), s = pt(s, d), a = fe(a, s);
  }
  return a = fe(a, [0, e[n(343)]]), o = fe(o, [0, e[n(343)]]), a = cn(a, o), o = cn(o, a), a = Xc(a), o = Xc(o), a = cn(a, o), o = cn(o, a), (n(697) + (a[0] >>> 0)[n(961)](16))[n(1269)](-8) + (n(697) + (a[1] >>> 0)[n(961)](16))[n(1269)](-8) + (n(697) + (o[0] >>> 0)[n(961)](16))[n(1269)](-8) + (n(697) + (o[1] >>> 0)[n(961)](16)).slice(-8);
}
function Jh(e) {
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
function Kh(e, t) {
  for (var n = v, r = 0, i = e[n(343)]; r < i; ++r)
    if (e[r] === t) return !0;
  return !1;
}
function qh(e, t) {
  return !Kh(e, t);
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
function em(e) {
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
function tm(e) {
  var t = v;
  return typeof e !== t(425);
}
function nm(e, t) {
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
      if (tm(d))
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
  return Di(n), function() {
    return n.then(function(i) {
      return i();
    });
  };
}
function rm(e, t, n) {
  var r = v, i = Object[r(331)](e)[r(788)](function(o) {
    return qh(n, o);
  }), a = Yc(i, function(o) {
    return nm(e[o], t);
  });
  return Di(a), function() {
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
                return Di(x), x;
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
function im() {
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
function am() {
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
function om() {
  var e = v, t = window;
  return Mt([
    !(e(919) in t),
    e(325) in t,
    "" + t[e(1191)] === e(1088),
    "" + t.Reflect == "[object Reflect]"
  ]) >= 3;
}
function sm() {
  var e = v, t = window;
  return Mt([
    e(1151) in t,
    e(769) in t,
    e(980) in t,
    e(656) in t
  ]) >= 3;
}
function lm() {
  var e = v;
  if (navigator[e(841)] === "iPad") return !0;
  var t = screen, n = t[e(347)] / t[e(515)];
  return Mt([
    e(604) in window,
    !!Element[e(886)][e(713)],
    n > 0.65 && n < 1.53
  ]) >= 2;
}
function um() {
  var e = v, t = document;
  return t.fullscreenElement || t[e(792)] || t.mozFullScreenElement || t[e(639)] || null;
}
function cm() {
  var e = v, t = document;
  return (t[e(1140)] || t.msExitFullscreen || t[e(700)] || t[e(1094)])[e(583)](t);
}
function Jd() {
  var e = v, t = Ru(), n = am();
  if (!t && !n) return !1;
  var r = window;
  return Mt([
    e(1160) in r,
    e(818) in r,
    t && !("SharedWorker" in r),
    n && /android/i[e(913)](navigator[e(1036)])
  ]) >= 2;
}
function dm() {
  var e = v, t = window, n = t[e(1027)] || t.webkitOfflineAudioContext;
  if (!n) return -2;
  if (fm()) return -1;
  var r = 4500, i = 5e3, a = new n(1, i, 44100), o = a.createOscillator();
  o.type = e(508), o[e(494)].value = 1e4;
  var s = a.createDynamicsCompressor();
  s[e(758)][e(1223)] = -50, s.knee.value = 40, s[e(1125)][e(1223)] = 12, s[e(461)][e(1223)] = 0, s.release.value = 0.25, o[e(844)](s), s.connect(a[e(326)]), o[e(1170)](0);
  var l = xm(a), c = l[0], d = l[1], f = c[e(475)](
    function(m) {
      var w = e;
      return pm(m.getChannelData(0)[w(1055)](r));
    },
    function(m) {
      var w = e;
      if (m[w(516)] === w(1199) || m[w(516)] === "suspended")
        return -3;
      throw m;
    }
  );
  return Di(f), function() {
    return d(), f;
  };
}
function fm() {
  return ma() && !Du() && !sm();
}
function xm(e) {
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
        switch (Yd(_) && Di(_), e[x(1054)]) {
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
function pm(e) {
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
          return o.body ? [3, 3] : [4, Ri(n)];
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
          return !((i = (r = s[c(383)]) === null || r === void 0 ? void 0 : r[c(601)]) === null || i === void 0) && i[c(768)] ? [3, 8] : [4, Ri(n)];
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
function hm(e) {
  for (var t = v, n = em(e), r = n[0], i = n[1], a = document[t(631)](
    r ?? t(669)
  ), o = 0, s = Object.keys(i); o < s[t(343)]; o++) {
    var l = s[o], c = i[l].join(" ");
    l === t(1252) ? mm(a[t(1252)], c) : a[t(962)](l, c);
  }
  return a;
}
function mm(e, t) {
  for (var n = v, r = 0, i = t[n(447)](";"); r < i[n(343)]; r++) {
    var a = i[r], o = /^\s*([\w-]+)\s*:\s*(.+?)(\s*!([\w-]+))?\s*$/.exec(a);
    if (o) {
      var s = o[1], l = o[2], c = o[4];
      e[n(482)](s, l, c || "");
    }
  }
}
var vm = v(1173), gm = v(924), dr = ["monospace", v(800), v(782)], Kc = [
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
function ym() {
  return Kd(function(e, t) {
    var n = U, r = t[n(601)], i = r[n(768)];
    i[n(1252)].fontSize = gm;
    var a = r[n(631)](n(669)), o = {}, s = {}, l = function(_) {
      var u = n, p = r[u(631)]("span"), h = p[u(1252)];
      return h[u(1081)] = u(833), h.top = "0", h[u(637)] = "0", h.fontFamily = _, p[u(395)] = vm, a[u(866)](p), p;
    }, c = function(_, u) {
      var p = n;
      return l("'"[p(1130)](_, "',")[p(1130)](u));
    }, d = function() {
      return dr.map(l);
    }, f = function() {
      for (var _ = n, u = {}, p = function(C) {
        var S = U;
        u[C] = dr[S(335)](function(L) {
          return c(C, L);
        });
      }, h = 0, g = Kc; h < g[_(343)]; h++) {
        var k = g[h];
        p(k);
      }
      return u;
    }, m = function(_) {
      var u = n;
      return dr[u(796)](function(p, h) {
        var g = u;
        return _[h][g(931)] !== o[p] || _[h][g(424)] !== s[p];
      });
    }, w = d(), y = f();
    i[n(866)](a);
    for (var x = 0; x < dr[n(343)]; x++)
      o[dr[x]] = w[x].offsetWidth, s[dr[x]] = w[x][n(424)];
    return Kc.filter(function(_) {
      return m(y[_]);
    });
  });
}
function wm() {
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
function _m() {
  var e = !1, t, n, r = km(), i = r[0], a = r[1];
  if (!Sm(i, a)) t = n = "";
  else {
    e = Cm(a), bm(i, a);
    var o = Hs(i), s = Hs(i);
    o !== s ? t = n = "unstable" : (n = o, Em(i, a), t = Hs(i));
  }
  return { winding: e, geometry: t, text: n };
}
function km() {
  var e = v, t = document[e(631)]("canvas");
  return t.width = 1, t[e(515)] = 1, [t, t.getContext("2d")];
}
function Sm(e, t) {
  return !!(t && e.toDataURL);
}
function Cm(e) {
  var t = v;
  return e[t(562)](0, 0, 10, 10), e[t(562)](2, 2, 6, 6), !e[t(1097)](5, 5, t(545));
}
function bm(e, t) {
  var n = v;
  e[n(347)] = 240, e[n(515)] = 60, t[n(339)] = n(724), t[n(890)] = n(1067), t.fillRect(100, 1, 62, 20), t[n(890)] = "#069", t[n(423)] = '11pt "Times New Roman"';
  var r = n(1153)[n(1130)](String[n(1187)](55357, 56835));
  t[n(429)](r, 2, 15), t[n(890)] = n(1075), t[n(423)] = "18pt Arial", t[n(429)](r, 4, 45);
}
function Em(e, t) {
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
function Tm() {
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
function Pm() {
  return navigator.oscpu;
}
function Nm() {
  var e = v, t = navigator, n = [], r = t[e(996)] || t[e(696)] || t.browserLanguage || t.systemLanguage;
  if (r !== void 0 && n[e(638)]([r]), Array[e(590)](t[e(1078)]))
    !(Ru() && om()) && n[e(638)](t[e(1078)]);
  else if (typeof t.languages === e(391)) {
    var i = t[e(1078)];
    i && n[e(638)](i[e(447)](","));
  }
  return n;
}
function Lm() {
  return window.screen.colorDepth;
}
function Im() {
  return Kt(Ct(navigator.deviceMemory), void 0);
}
function Rm() {
  var e = v, t = screen, n = function(i) {
    return Kt(Iu(i), null);
  }, r = [n(t.width), n(t[e(515)])];
  return r.sort().reverse(), r;
}
var Dm = 2500, Mm = 10, Xa, As;
function Om() {
  if (As === void 0) {
    var e = function() {
      var t = vl();
      gl(t) ? As = setTimeout(e, Dm) : (Xa = t, As = void 0);
    };
    e();
  }
}
function Hm() {
  var e = this;
  return Om(), function() {
    return Ke(e, void 0, void 0, function() {
      var t;
      return qe(this, function(n) {
        var r = U;
        switch (n.label) {
          case 0:
            return t = vl(), gl(t) ? Xa ? [2, fo([], Xa, !0)] : um() ? [4, cm()] : [3, 2] : [3, 2];
          case 1:
            n[r(607)](), t = vl(), n[r(979)] = 2;
          case 2:
            return !gl(t) && (Xa = t), [2, t];
        }
      });
    });
  };
}
function Am() {
  var e = this, t = Hm();
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
              return o === null ? null : Xd(o, Mm);
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
function jm() {
  var e = v;
  return Kt(Iu(navigator[e(935)]), void 0);
}
function Fm() {
  var e = v, t, n = (t = window[e(1191)]) === null || t === void 0 ? void 0 : t.DateTimeFormat;
  if (n) {
    var r = new n()[e(586)]().timeZone;
    if (r) return r;
  }
  var i = -zm();
  return e(699)[e(1130)](i >= 0 ? "+" : "").concat(Math[e(1014)](i));
}
function zm() {
  var e = v, t = (/* @__PURE__ */ new Date())[e(725)]();
  return Math[e(826)](
    Ct(new Date(t, 0, 1).getTimezoneOffset()),
    Ct(new Date(t, 6, 1)[e(408)]())
  );
}
function Wm() {
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
function Bm() {
  var e = v;
  if (!(Qd() || im()))
    try {
      return !!window[e(1218)];
    } catch {
      return !0;
    }
}
function Um() {
  var e = v;
  return !!window[e(1255)];
}
function $m() {
  var e = v;
  return navigator[e(620)];
}
function Zm() {
  var e = v, t = navigator[e(841)];
  return t === "MacIntel" && ma() && !Du() ? lm() ? "iPad" : "iPhone" : t;
}
function Gm() {
  var e = v;
  return navigator[e(1033)] || "";
}
function Ym() {
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
function Xm() {
  var e = v, t = document;
  try {
    t[e(686)] = e(708);
    var n = t[e(686)][e(1242)]("cookietest=") !== -1;
    return t[e(686)] = "cookietest=1; SameSite=Strict; expires=Thu, 01-Jan-1970 00:00:01 GMT", n;
  } catch {
    return !1;
  }
}
function Qm() {
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
function Jm(e) {
  var t = v, n = e === void 0 ? {} : e, r = n[t(406)];
  return Ke(this, void 0, void 0, function() {
    var i, a, o, s, l, c;
    return qe(this, function(d) {
      var f = U;
      switch (d[f(979)]) {
        case 0:
          return Km() ? (i = Qm(), a = Object[f(331)](i), o = (c = [])[f(1130)][f(1241)](
            c,
            a.map(function(m) {
              return i[m];
            })
          ), [4, qm(o)]) : [2, void 0];
        case 1:
          return s = d[f(607)](), r && e1(i, s), l = a[f(788)](function(m) {
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
function Km() {
  return ma() || Jd();
}
function qm(e) {
  var t;
  return Ke(this, void 0, void 0, function() {
    var n, r, i, a, l, o, s, l;
    return qe(this, function(c) {
      var d = U;
      switch (c.label) {
        case 0:
          for (n = document, r = n[d(631)](d(669)), i = new Array(e[d(343)]), a = {}, qc(r), l = 0; l < e.length; ++l)
            o = hm(e[l]), o[d(1249)] === "DIALOG" && o[d(872)](), s = n[d(631)](d(669)), qc(s), s[d(866)](o), r[d(866)](s), i[l] = o;
          c[d(979)] = 1;
        case 1:
          return n[d(768)] ? [3, 3] : [4, Ri(50)];
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
function e1(e, t) {
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
function t1() {
  for (var e = v, t = 0, n = ["rec2020", "p3", "srgb"]; t < n[e(343)]; t++) {
    var r = n[t];
    if (matchMedia("(color-gamut: "[e(1130)](r, ")")).matches) return r;
  }
}
function n1() {
  var e = v;
  if (e0(e(542))) return !0;
  if (e0(e(621))) return !1;
}
function e0(e) {
  var t = v;
  return matchMedia(t(1186).concat(e, ")"))[t(1259)];
}
function r1() {
  var e = v;
  if (t0(e(1007))) return !0;
  if (t0("none")) return !1;
}
function t0(e) {
  var t = v;
  return matchMedia(t(547)[t(1130)](e, ")"))[t(1259)];
}
var i1 = 100;
function a1() {
  var e = v;
  if (matchMedia(e(596))[e(1259)]) {
    for (var t = 0; t <= i1; ++t)
      if (matchMedia("(max-monochrome: "[e(1130)](t, ")"))[e(1259)]) return t;
    throw new Error("Too high value");
  }
}
function o1() {
  var e = v;
  if (fr(e(922))) return 0;
  if (fr("high") || fr("more")) return 1;
  if (fr("low") || fr("less")) return -1;
  if (fr(e(737))) return 10;
}
function fr(e) {
  var t = v;
  return matchMedia("(prefers-contrast: ".concat(e, ")"))[t(1259)];
}
function s1() {
  var e = v;
  if (n0(e(541))) return !0;
  if (n0(e(922))) return !1;
}
function n0(e) {
  var t = v;
  return matchMedia(t(384)[t(1130)](e, ")"))[t(1259)];
}
function l1() {
  var e = v;
  if (r0(e(864))) return !0;
  if (r0("standard")) return !1;
}
function r0(e) {
  var t = v;
  return matchMedia(t(432)[t(1130)](e, ")"))[t(1259)];
}
var te = Math, We = function() {
  return 0;
};
function u1() {
  var e = v, t = te[e(898)] || We, n = te[e(772)] || We, r = te[e(1045)] || We, i = te[e(838)] || We, a = te[e(1227)] || We, o = te[e(584)] || We, s = te.sin || We, l = te.sinh || We, c = te.cos || We, d = te.cosh || We, f = te[e(786)] || We, m = te[e(904)] || We, w = te.exp || We, y = te.expm1 || We, x = te[e(629)] || We, _ = function(O) {
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
var c1 = v(1108), js = {
  default: [],
  apple: [{ font: "-apple-system-body" }],
  serif: [{ fontFamily: v(782) }],
  sans: [{ fontFamily: "sans-serif" }],
  mono: [{ fontFamily: "monospace" }],
  min: [{ fontSize: v(1106) }],
  system: [{ fontFamily: "system-ui" }]
};
function d1() {
  return f1(function(e, t) {
    for (var n = U, r = {}, i = {}, a = 0, o = Object[n(331)](js); a < o.length; a++) {
      var s = o[a], l = js[s], c = l[0], d = c === void 0 ? {} : c, f = l[1], m = f === void 0 ? c1 : f, w = e[n(631)](n(860));
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
function f1(e, t) {
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
function x1() {
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
function p1() {
  var e = v;
  return navigator[e(916)];
}
function h1() {
  var e = v, t = new Float32Array(1), n = new Uint8Array(t[e(572)]);
  return t[0] = 1 / 0, t[0] = t[0] - t[0], n[3];
}
var m1 = {
  fonts: ym,
  domBlockers: Jm,
  fontPreferences: d1,
  audio: dm,
  screenFrame: Am,
  osCpu: Pm,
  languages: Nm,
  colorDepth: Lm,
  deviceMemory: Im,
  screenResolution: Rm,
  hardwareConcurrency: jm,
  timezone: Fm,
  sessionStorage: Wm,
  localStorage: Vm,
  indexedDB: Bm,
  openDatabase: Um,
  cpuClass: $m,
  platform: Zm,
  plugins: wm,
  canvas: _m,
  touchSupport: Tm,
  vendor: Gm,
  vendorFlavors: Ym,
  cookiesEnabled: Xm,
  colorGamut: t1,
  invertedColors: n1,
  forcedColors: r1,
  monochrome: a1,
  contrast: o1,
  reducedMotion: s1,
  hdr: l1,
  math: u1,
  videoCard: x1,
  pdfViewerEnabled: p1,
  architecture: h1
};
function v1(e) {
  return rm(m1, e, []);
}
var g1 = v(807);
function y1(e) {
  var t = v, n = w1(e), r = _1(n);
  return { score: n, comment: g1[t(452)](/\$/g, "".concat(r)) };
}
function w1(e) {
  var t = v;
  if (Jd()) return 0.4;
  if (ma()) return Du() ? 0.5 : 0.3;
  var n = e[t(841)][t(1223)] || "";
  return /^Win/.test(n) ? 0.6 : /^Mac/[t(913)](n) ? 0.5 : 0.7;
}
function _1(e) {
  return Xd(0.99 + 0.01 * e, 1e-4);
}
function k1(e) {
  for (var t = v, n = "", r = 0, i = Object[t(331)](e).sort(); r < i[t(343)]; r++) {
    var a = i[r], o = e[a], s = o.error ? t(446) : JSON[t(641)](o[t(1223)]);
    n += ""[t(1130)](n ? "|" : "")[t(1130)](a[t(452)](/([:|\\])/g, t(842)), ":").concat(s);
  }
  return n;
}
function S1(e) {
  return JSON.stringify(
    e,
    function(t, n) {
      return n instanceof Error ? Jh(n) : n;
    },
    2
  );
}
function qd(e) {
  return Qh(k1(e));
}
function C1(e) {
  var t, n = y1(e);
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
function b1(e) {
  return e === void 0 && (e = 50), Xh(e, e * 2);
}
function E1(e, t) {
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
              return o = l[c(607)](), s = C1(o), (t || i != null && i[c(406)]) && c(630)[c(1130)](s[c(799)], c(1253))[c(1130)](
                navigator[c(852)],
                `
timeBetweenLoadAndGet: `
              )[c(1130)](a - r, `
visitorId: `).concat(s[c(929)], `
components: `)[c(1130)](S1(o), c(619)), [2, s];
          }
        });
      });
    }
  };
}
function T1() {
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
function P1(e) {
  var t = v, n = {}, r = n[t(727)], i = n[t(406)], a = n[t(410)], o = a === void 0 ? !0 : a;
  return Ke(this, void 0, void 0, function() {
    var s;
    return qe(this, function(l) {
      var c = U;
      switch (l[c(979)]) {
        case 0:
          return o && T1(), [4, b1(r)];
        case 1:
          return l[c(607)](), s = v1({ debug: i }), [2, E1(s, i)];
      }
    });
  });
}
var N1 = v(855), X = {
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
  Yh(t, e);
  function t(n, r) {
    var i = U, a = e.call(this, r) || this;
    return a[i(1054)] = n, a.name = i(1083), Object[i(373)](a, t.prototype), a;
  }
  return t;
}(Error);
function L1(e, t) {
  var n = v, r = {}, i = { bot: !1 };
  for (var a in t) {
    var o = t[a], s = o(e), l = { bot: !1 };
    typeof s === n(391) ? l = { bot: !0, botKind: s } : s && (l = { bot: !0, botKind: X[n(474)] }), r[a] = l, l[n(715)] && (i = l);
  }
  return [r, i];
}
function I1(e) {
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
function R1(e) {
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
function D1(e, t) {
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
      var f = D1(e, function(m) {
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
function _i(e) {
  var t = v;
  return e[t(541)](function(n, r) {
    return n + (r ? 1 : 0);
  }, 0);
}
function M1(e) {
  var t = v, n = e[t(939)];
  if (n[t(1054)] !== 0) return !1;
  if (yl(n[t(1223)], t(314), t(603), t(492)))
    return X[t(1202)];
}
function O1(e) {
  var t = v, n = e.errorTrace;
  if (n[t(1054)] !== 0) return !1;
  if (/PhantomJS/i[t(913)](n[t(1223)])) return X[t(1065)];
}
function H1(e) {
  var t = v, n = e[t(1076)], r = e.browserKind, i = e.browserEngineKind;
  if (!(n[t(1054)] !== 0 || r.state !== 0 || i[t(1054)] !== 0)) {
    var a = n[t(1223)];
    return i[t(1223)] === "unknown" ? !1 : a === 37 && !Qa([t(1230), "gecko"], i.value) || a === 39 && !Qa([t(1134)], r.value) || a === 33 && !Qa([t(449)], i[t(1223)]);
  }
}
function A1(e) {
  var t = v, n = e.functionBind;
  if (n[t(1054)] === -2) return X[t(1065)];
}
function j1(e) {
  var t = v, n = e[t(1078)];
  if (n.state === 0 && n[t(1223)][t(343)] === 0)
    return X[t(543)];
}
function F1(e) {
  var t = v, n = e[t(1128)];
  if (n[t(1054)] === 0 && !n[t(1223)]) return X[t(474)];
}
function z1(e) {
  var t = v, n = e.notificationPermissions, r = e.browserKind;
  if (r[t(1054)] !== 0 || r.value !== t(843)) return !1;
  if (n.state === 0 && n[t(1223)]) return X.HeadlessChrome;
}
function W1(e) {
  var t = v, n = e[t(1085)];
  if (n.state === 0 && !n[t(1223)]) return X[t(543)];
}
function V1(e) {
  var t = v, n = e[t(733)], r = e[t(1274)], i = e.browserKind, a = e.browserEngineKind;
  if (!(n[t(1054)] !== 0 || r[t(1054)] !== 0 || i[t(1054)] !== 0 || a[t(1054)] !== 0) && !(i.value !== "chrome" || r.value || a[t(1223)] !== "chromium") && n[t(1223)] === 0)
    return X[t(543)];
}
function B1(e) {
  var t = v, n, r = e.process;
  if (r[t(1054)] !== 0) return !1;
  if (r[t(1223)].type === t(1232) || ((n = r.value[t(689)]) === null || n === void 0 ? void 0 : n.electron) != null)
    return X[t(396)];
}
function U1(e) {
  var t = v, n = e.productSub, r = e[t(1104)];
  if (n[t(1054)] !== 0 || r.state !== 0) return !1;
  if ((r[t(1223)] === t(843) || r[t(1223)] === "safari" || r[t(1223)] === t(763) || r.value === "wechat") && n[t(1223)] !== "20030107")
    return X[t(474)];
}
function $1(e) {
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
function G1(e) {
  var t = v, n = e[t(990)];
  if (n[t(1054)] === 0) {
    var r = n.value, i = r.vendor, a = r[t(1232)];
    if (i == t(634) && a == t(478)) return X.HeadlessChrome;
  }
}
function Y1(e) {
  var t = v, n = e.windowExternal;
  if (n[t(1054)] !== 0) return !1;
  if (/Sequentum/i[t(913)](n[t(1223)])) return X.Sequentum;
}
function X1(e) {
  var t = v, n = e.windowSize, r = e.documentFocus;
  if (n[t(1054)] !== 0 || r[t(1054)] !== 0) return !1;
  var i = n[t(1223)], a = i.outerWidth, o = i[t(862)];
  if (r[t(1223)] && a === 0 && o === 0)
    return X.HeadlessChrome;
}
function Q1(e) {
  var t = v, n = e.distinctiveProps;
  if (n.state !== 0) return !1;
  var r = n[t(1223)], i;
  for (i in r) if (r[i]) return i;
}
var J1 = {
  detectAppVersion: R1,
  detectDocumentAttributes: M1,
  detectErrorTrace: O1,
  detectEvalLengthInconsistency: H1,
  detectFunctionBind: A1,
  detectLanguagesLengthInconsistency: j1,
  detectNotificationPermissions: z1,
  detectPluginsArray: W1,
  detectPluginsLengthInconsistency: V1,
  detectProcess: B1,
  detectUserAgent: $1,
  detectWebDriver: Z1,
  detectWebGL: G1,
  detectWindowExternal: Y1,
  detectWindowSize: X1,
  detectMimeTypesConsistent: F1,
  detectProductSub: U1,
  detectDistinctiveProperties: Q1
};
function K1() {
  var e = v, t = navigator[e(1036)];
  if (t == null) throw new se(-1, "navigator.appVersion is undefined");
  return t;
}
function q1() {
  var e = v;
  if (document[e(1243)] === void 0) throw new se(-1, e(534));
  var t = document.documentElement;
  if (typeof t[e(1184)] !== e(425)) throw new se(-2, e(780));
  return t[e(1184)]();
}
function ev() {
  var e = v;
  try {
    null[0]();
  } catch (t) {
    if (t instanceof Error && t[e(742)] != null)
      return t[e(742)][e(961)]();
  }
  throw new se(-3, "errorTrace signal unexpected behaviour");
}
function tv() {
  var e = v;
  return eval[e(961)]().length;
}
function nv() {
  var e = v;
  if (Function[e(886)].bind === void 0) throw new se(-2, e(721));
  return Function.prototype.bind[e(961)]();
}
function Mu() {
  var e = v, t, n, r = window, i = navigator;
  return _i([
    e(592) in i,
    e(1124) in i,
    i[e(1033)][e(1242)](e(571)) === 0,
    e(521) in r,
    e(1e3) in r,
    e(611) in r,
    e(1051) in r
  ]) >= 5 ? e(449) : _i([
    "ApplePayError" in r,
    e(1192) in r,
    e(361) in r,
    i[e(1033)][e(1242)](e(817)) === 0,
    "getStorageUpdates" in i,
    e(960) in r
  ]) >= 4 ? e(1230) : _i([
    e(466) in navigator,
    "MozAppearance" in ((n = (t = document[e(1243)]) === null || t === void 0 ? void 0 : t.style) !== null && n !== void 0 ? n : {}),
    e(1211) in r,
    e(459) in r,
    e(698) in r,
    e(950) in r
  ]) >= 4 ? "gecko" : e(932);
}
function rv() {
  var e = v, t, n = (t = navigator[e(852)]) === null || t === void 0 ? void 0 : t[e(451)]();
  return Xt(n, e(642)) ? e(597) : Xt(n, e(317)) || Xt(n, e(535)) ? e(1134) : Xt(n, "wechat") ? e(1129) : Xt(n, e(554)) ? "firefox" : Xt(n, e(763)) || Xt(n, e(491)) ? e(763) : Xt(n, e(843)) ? e(843) : Xt(n, "safari") ? e(774) : e(932);
}
function iv() {
  var e = v, t = Mu(), n = t === "chromium", r = t === e(658);
  if (!n && !r) return !1;
  var i = window;
  return _i([
    "onorientationchange" in i,
    "orientation" in i,
    n && !(e(488) in i),
    r && /android/i[e(913)](navigator[e(1036)])
  ]) >= 2;
}
function av() {
  var e = v;
  return document[e(667)] === void 0 ? !1 : document[e(667)]();
}
function ov() {
  var e = v, t = window;
  return _i([
    !("MediaSettingsRange" in t),
    "RTCEncodedAudioFrame" in t,
    "" + t[e(1191)] === e(1088),
    "" + t[e(1141)] == "[object Reflect]"
  ]) >= 3;
}
function sv() {
  var e = v, t = navigator, n = [], r = t[e(996)] || t[e(696)] || t[e(1013)] || t.systemLanguage;
  if (r !== void 0 && n[e(638)]([r]), Array[e(590)](t[e(1078)])) {
    var i = Mu();
    !(i === e(449) && ov()) && n[e(638)](t[e(1078)]);
  } else if (typeof t[e(1078)] == "string") {
    var a = t[e(1078)];
    a && n.push(a[e(447)](","));
  }
  return n;
}
function lv() {
  var e = v;
  if (navigator[e(829)] === void 0) throw new se(-1, e(1084));
  for (var t = navigator[e(829)], n = Object[e(1032)](t) === MimeTypeArray.prototype, r = 0; r < t.length; r++)
    n && (n = Object.getPrototypeOf(t[r]) === MimeType.prototype);
  return n;
}
function uv() {
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
function cv() {
  var e = v;
  if (navigator[e(1092)] === void 0) throw new se(-1, e(574));
  if (window[e(1080)] === void 0) throw new se(-1, e(591));
  return navigator[e(1092)] instanceof PluginArray;
}
function dv() {
  var e = v;
  if (navigator[e(1092)] === void 0) throw new se(-1, e(574));
  if (navigator[e(1092)][e(343)] === void 0)
    throw new se(-3, "navigator.plugins.length is undefined");
  return navigator.plugins[e(343)];
}
function fv() {
  var e = v, t = window[e(1195)], n = "window.process is";
  if (t === void 0) throw new se(-1, "".concat(n, e(910)));
  if (t && typeof t !== e(668))
    throw new se(-3, ""[e(1130)](n, e(527)));
  return t;
}
function xv() {
  var e = v, t = navigator[e(1006)];
  if (t === void 0) throw new se(-1, e(1135));
  return t;
}
function pv() {
  var e = v;
  if (navigator[e(1017)] === void 0) throw new se(-1, "navigator.connection is undefined");
  if (navigator[e(1017)][e(1005)] === void 0) throw new se(-1, e(525));
  return navigator[e(1017)].rtt;
}
function hv() {
  var e = v;
  return navigator[e(852)];
}
function mv() {
  var e = v;
  if (navigator[e(603)] == null) throw new se(-1, e(888));
  return navigator[e(603)];
}
function vv() {
  var e = v, t = document[e(631)](e(1277));
  if (typeof t[e(400)] != "function") throw new se(-2, e(884));
  var n = t[e(400)](e(1008));
  if (n === null) throw new se(-4, "WebGLRenderingContext is null");
  if (typeof n[e(412)] !== e(425)) throw new se(-2, e(422));
  var r = n[e(412)](n.VENDOR), i = n[e(412)](n[e(342)]);
  return { vendor: r, renderer: i };
}
function gv() {
  var e = v;
  if (window[e(490)] === void 0) throw new se(-1, e(329));
  var t = window[e(490)];
  if (typeof t[e(961)] !== e(425)) throw new se(-2, e(355));
  return t[e(961)]();
}
function yv() {
  var e = v;
  return {
    outerWidth: window[e(968)],
    outerHeight: window[e(862)],
    innerWidth: window.innerWidth,
    innerHeight: window[e(1271)]
  };
}
function wv() {
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
var _v = {
  android: iv,
  browserKind: rv,
  browserEngineKind: Mu,
  documentFocus: av,
  userAgent: hv,
  appVersion: K1,
  rtt: pv,
  windowSize: yv,
  pluginsLength: dv,
  pluginsArray: cv,
  errorTrace: ev,
  productSub: xv,
  windowExternal: gv,
  mimeTypesConsistent: lv,
  evalLength: tv,
  webGL: vv,
  webDriver: mv,
  languages: sv,
  notificationPermissions: uv,
  documentElementKeys: q1,
  functionBind: nv,
  process: fv,
  distinctiveProps: wv
}, kv = function() {
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
    var r = L1(this[n(368)], J1), i = r[0], a = r[1];
    return this[n(957)] = i, a;
  }, t[e(886)][e(437)] = function() {
    return Ke(this, void 0, void 0, function() {
      var n;
      return qe(this, function(r) {
        var i = U;
        switch (r[i(979)]) {
          case 0:
            return n = this, [4, I1(_v)];
          case 1:
            return n.components = r[i(607)](), [2, this[i(368)]];
        }
      });
    });
  }, t;
}();
function Sv() {
  var e = v;
  if (!(window.__fpjs_d_m || Math[e(360)]() >= 1e-3))
    try {
      var t = new XMLHttpRequest();
      t.open(e(873), e(578)[e(1130)](N1, e(435)), !0), t.send();
    } catch (n) {
      console.error(n);
    }
}
function Cv(e) {
  var t = v, n = {}, r = n[t(410)], i = r === void 0 ? !0 : r;
  return Ke(this, void 0, void 0, function() {
    var a;
    return qe(this, function(o) {
      var s = U;
      switch (o[s(979)]) {
        case 0:
          return i && Sv(), a = new kv(), [4, a.collect()];
        case 1:
          return o[s(607)](), [2, a];
      }
    });
  });
}
const ef = !self[v(601)] && self[v(1161)];
function bv() {
  var e = v;
  const t = [][e(318)];
  try {
    (-1)[e(505)](-1);
  } catch (n) {
    return n[e(555)][e(343)] + (t + "")[e(447)](t.name)[e(536)]("")[e(343)];
  }
}
const Ev = bv(), Tv = {
  80: { name: "V8", isBlink: !0, isGecko: !1, isWebkit: !1 },
  58: { name: v(552), isBlink: !1, isGecko: !0, isWebkit: !1 },
  77: { name: v(902), isBlink: !1, isGecko: !1, isWebkit: !0 }
}, Ou = Tv[Ev] || { name: null, isBlink: !1, isGecko: !1, isWebkit: !1 }, Ae = Ou.isBlink, po = Ou.isGecko, Pv = Ou[v(526)];
function Nv() {
  var e = v;
  return e(797) in navigator && Object[e(1032)](navigator[e(797)])[e(318)].name == "Brave" && navigator[e(797)][e(978)][e(961)]() == e(589);
}
function Lv() {
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
const Iv = () => {
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
}, Rv = Iv(), { logTestResult: ho } = Rv, tf = () => {
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
function Dv() {
  const e = {};
  return {
    getRecords: () => e,
    documentLie: (t, n) => {
      const r = n instanceof Array;
      return e[t] ? r ? e[t] = [...e[t], ...n] : e[t].push(n) : r ? e[t] = n : e[t] = [n];
    }
  };
}
const Mv = Dv(), { documentLie: Ta } = Mv, nf = v(337), Hu = () => String[v(1187)](Math[v(360)]() * 26 + 97) + Math[v(360)]()[v(961)](36)[v(1269)](-7);
function Ov(e) {
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
const ai = "Reflect" in self;
function Hv(e) {
  var t = v;
  return e[t(318)][t(516)] == t(548);
}
function Ee({ spawnErr: e, withStack: t, final: n }) {
  try {
    throw e(), Error();
  } catch (r) {
    return Hv(r) ? t ? t(r) : !1 : !0;
  } finally {
    n && n();
  }
}
function Av(e) {
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
function xr(e, t, n = 1) {
  var r = v;
  return n === 0 ? t.test(e[r(555)]) : t[r(913)](e[r(742)][r(447)](`
`)[n]);
}
const jv = /at Function\.toString /, Fv = /at Object\.toString/, zv = /at (Function\.)?\[Symbol.hasInstance\]/, Wv = /at (Proxy\.)?\[Symbol.hasInstance\]/, o0 = /strict mode/;
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
    [a(711)]: !!r && /^(screen|navigator)$/i[a(913)](s) && !!(Object.getOwnPropertyDescriptor(self[s.toLowerCase()], o) || ai && Reflect.getOwnPropertyDescriptor(self[s[a(451)]()], o)),
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
    [a(1205)]: !Pv && Ee({ spawnErr: () => {
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
    [a(891)]: ai && Reflect[a(483)](t).sort()[a(961)]() != a(354),
    [a(498)]: Ee({
      spawnErr: () => Object[a(851)](t).toString(),
      withStack: (m) => Ae && !xr(m, jv)
    }) || Ee({
      spawnErr: () => Object[a(851)](new Proxy(t, {}))[a(961)](),
      withStack: (m) => Ae && !xr(m, Fv)
    }),
    [a(870)]: Ee({
      spawnErr: () => {
      },
      withStack: (m) => po && !xr(m, o0, 0)
    }),
    "failed at toString incompatible proxy error": Ee({
      spawnErr: () => {
      },
      withStack: (m) => po && !xr(m, o0, 0)
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
      "failed at reflect set proto": ai && Ee({
        spawnErr: () => {
          var x = a;
          throw Reflect[x(373)](t, Object[x(851)](t)), new TypeError();
        },
        final: () => Object[a(373)](t, l)
      }),
      [a(1070)]: ai && !Ee({
        spawnErr: () => {
          var x = a;
          Reflect[x(373)](y, Object.create(y));
        },
        final: () => Object[a(373)](y, l)
      }),
      [a(479)]: Ae && (Ee({
        spawnErr: () => {
        },
        withStack: (x) => !xr(x, zv)
      }) || Ee({
        spawnErr: () => {
          new Proxy(t, {});
        },
        withStack: (x) => !xr(x, Wv)
      })),
      [a(442)]: Ae && ai && Av(() => {
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
function Bv() {
  var e = v;
  if (ef) return { iframeWindow: self };
  try {
    const t = self[e(343)], n = new DocumentFragment(), r = document[e(631)](e(669)), i = Hu();
    r.setAttribute("id", i), n.appendChild(r), r.innerHTML = '<div style="' + nf + e(1256), document.body[e(866)](n);
    const a = self[t];
    return { iframeWindow: Ov(a) || self, div: r };
  } catch {
    return console[e(446)]("client blocked phantom iframe"), { iframeWindow: self };
  }
}
const { iframeWindow: Uv, div: Fs } = Bv() || {};
function $v(e) {
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
const Zv = performance.now(), { lieDetector: Gv, lieList: Yv, lieDetail: Xv, propsSearched: Qv } = $v(Uv), Jv = (e) => e && e[v(788)](
  (t) => !/object toString|toString incompatible proxy/[v(913)](t)
).length;
let _l, K, l0 = 0;
if (!ef) {
  _l = (() => {
    var n = v;
    const r = Gv[n(983)]();
    return Object[n(331)](r)[n(541)]((i, a) => (i[a] = Jv(r[a]), i), {});
  })(), K = JSON[v(626)](JSON.stringify(Xv)), l0 = +(performance[v(738)]() - Zv)[v(505)](2);
  const t = Qv.length + v(358) + l0 + v(1181) + Yv[v(343)] + " corrupted)";
  setTimeout(() => /* @__PURE__ */ console.log(t), 3e3);
}
const Kv = () => {
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
}, qv = Kv(), { captureError: rf } = qv;
var Se = ((e) => {
  var t = v;
  return e[t(757)] = t(874), e[t(495)] = t(394), e[t(561)] = "Linux", e[t(563)] = "Android", e[t(356)] = t(1004), e;
})(Se || {});
const eg = [v(836), v(1233), "menu", v(1074), "small-caption", v(695)], u0 = {
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
function tg() {
  var e = v;
  const { body: t } = document, n = document[e(631)](e(669));
  t.appendChild(n);
  try {
    const r = String([
      ...eg[e(541)]((a, o) => {
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
}, ng = String[v(1187)](Math[v(360)]() * 26 + 97) + Math[v(360)]()[v(961)](36).slice(-7);
function rg() {
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
    const xt = g[A], ur = +(xt[le(788)]((ni) => ni)[le(343)] / xt[le(343)])[le(505)](2);
    return T[A] = ur, T;
  }, {}), S = Object[e(331)](C)[e(541)](
    (T, A) => C[T] > C[A] ? T : A
  ), L = C[S];
  return [C, L, k];
}
async function ig({ webgl: e, workerScope: t }) {
  var r;
  var n = v;
  try {
    const i = tf();
    await wl(i);
    const a = Object.keys({ ...navigator.mimeTypes }), o = tg(), [s, l, c] = rg(), d = {
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
            return k.srcdoc = ng, !!k.contentWindow;
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
async function ag() {
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
      const x = +/* @__PURE__ */ new Date(), _ = +("" + x)[y(1269)](-1), u = await i(0, _, x), p = await i(1, _), h = await i(2, _), g = await i(3, _), k = await i(4, _), C = await i(5, _), S = await i(6, _), L = await i(7, _), O = await i(8, _), T = await i(9, _), A = ("" + u)[y(1269)](-1), le = ("" + p)[y(1269)](-1), xt = ("" + h).slice(-1), ur = ("" + g)[y(1269)](-1), ni = ("" + k).slice(-1), ri = ("" + C)[y(1269)](-1), ii = ("" + S)[y(1269)](-1), I = ("" + L).slice(-1), W = ("" + O)[y(1269)](-1), Z = ("" + T)[y(1269)](-1), ue = A == le && A == xt && A == ur && A == ni && A == ri && A == ii && A == I && A == W && A == Z, ye = ("" + u)[y(343)], Fn = [
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
        delays: Fn[y(335)](
          (tt) => ("" + tt).length > ye ? ("" + tt).slice(-ye) : tt
        ),
        precision: ue ? Math.min(...Fn[y(335)]((tt) => ("" + tt)[y(343)])) : void 0,
        precisionValue: ue ? A : void 0
      };
    }, [o, s] = await Promise[e(930)]([
      Nv(),
      Ae ? void 0 : a()
    ]);
    if (o) {
      const y = Lv();
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
const og = async () => {
  var e = v;
  const t = await ag(), n = await ig({ webgl: null, workerScope: null }), r = { resistance: t, headlessFeaturesFingerprint: n }, i = Cv(), a = await i, o = await a.detect(), s = o.bot, l = (n == null ? void 0 : n[e(959)]) || 0, c = (n == null ? void 0 : n[e(540)]) || 0, d = (n == null ? void 0 : n.stealthRating) || 0, f = s ? 100 : Math[e(826)](l, c, d), m = f > 50 || d > 30, w = s ? o[e(984)] : t == null ? void 0 : t[e(413)];
  return {
    fingerprint: r,
    isBotBotD: o,
    botScore: f,
    isBot: m,
    botType: w
  };
}, Hw = async () => {
  var e = v;
  const t = P1(), n = await t, r = await n[e(873)](), { screenFrame: i, ...a } = r[e(368)];
  return qd(a);
};
var sg = !1;
function lg(e) {
  if (e.sheet)
    return e.sheet;
  for (var t = 0; t < document.styleSheets.length; t++)
    if (document.styleSheets[t].ownerNode === e)
      return document.styleSheets[t];
}
function ug(e) {
  var t = document.createElement("style");
  return t.setAttribute("data-emotion", e.key), e.nonce !== void 0 && t.setAttribute("nonce", e.nonce), t.appendChild(document.createTextNode("")), t.setAttribute("data-s", ""), t;
}
var cg = /* @__PURE__ */ function() {
  function e(n) {
    var r = this;
    this._insertTag = function(i) {
      var a;
      r.tags.length === 0 ? r.insertionPoint ? a = r.insertionPoint.nextSibling : r.prepend ? a = r.container.firstChild : a = r.before : a = r.tags[r.tags.length - 1].nextSibling, r.container.insertBefore(i, a), r.tags.push(i);
    }, this.isSpeedy = n.speedy === void 0 ? !sg : n.speedy, this.tags = [], this.ctr = 0, this.nonce = n.nonce, this.key = n.key, this.container = n.container, this.prepend = n.prepend, this.insertionPoint = n.insertionPoint, this.before = null;
  }
  var t = e.prototype;
  return t.hydrate = function(r) {
    r.forEach(this._insertTag);
  }, t.insert = function(r) {
    this.ctr % (this.isSpeedy ? 65e3 : 1) === 0 && this._insertTag(ug(this));
    var i = this.tags[this.tags.length - 1];
    if (this.isSpeedy) {
      var a = lg(i);
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
}(), He = "-ms-", mo = "-moz-", q = "-webkit-", af = "comm", Au = "rule", ju = "decl", dg = "@import", of = "@keyframes", fg = "@layer", xg = Math.abs, qo = String.fromCharCode, pg = Object.assign;
function hg(e, t) {
  return Ie(e, 0) ^ 45 ? (((t << 2 ^ Ie(e, 0)) << 2 ^ Ie(e, 1)) << 2 ^ Ie(e, 2)) << 2 ^ Ie(e, 3) : 0;
}
function sf(e) {
  return e.trim();
}
function mg(e, t) {
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
function Mi(e, t, n) {
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
function vg(e, t) {
  return e.map(t).join("");
}
var es = 1, Fr = 1, lf = 0, et = 0, _e = 0, qr = "";
function ts(e, t, n, r, i, a, o) {
  return { value: e, root: t, parent: n, type: r, props: i, children: a, line: es, column: Fr, length: o, return: "" };
}
function oi(e, t) {
  return pg(ts("", null, null, "", null, null, 0), e, { length: -e.length }, t);
}
function gg() {
  return _e;
}
function yg() {
  return _e = et > 0 ? Ie(qr, --et) : 0, Fr--, _e === 10 && (Fr = 1, es--), _e;
}
function ot() {
  return _e = et < lf ? Ie(qr, et++) : 0, Fr++, _e === 10 && (Fr = 1, es++), _e;
}
function Vt() {
  return Ie(qr, et);
}
function Ja() {
  return et;
}
function va(e, t) {
  return Mi(qr, e, t);
}
function Oi(e) {
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
  return es = Fr = 1, lf = At(qr = e), et = 0, [];
}
function cf(e) {
  return qr = "", e;
}
function Ka(e) {
  return sf(va(et - 1, Sl(e === 91 ? e + 2 : e === 40 ? e + 1 : e)));
}
function wg(e) {
  for (; (_e = Vt()) && _e < 33; )
    ot();
  return Oi(e) > 2 || Oi(_e) > 3 ? "" : " ";
}
function _g(e, t) {
  for (; --t && ot() && !(_e < 48 || _e > 102 || _e > 57 && _e < 65 || _e > 70 && _e < 97); )
    ;
  return va(e, Ja() + (t < 6 && Vt() == 32 && ot() == 32));
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
function kg(e, t) {
  for (; ot() && e + _e !== 57; )
    if (e + _e === 84 && Vt() === 47)
      break;
  return "/*" + va(t, et - 1) + "*" + qo(e === 47 ? e : ot());
}
function Sg(e) {
  for (; !Oi(Vt()); )
    ot();
  return va(e, et);
}
function Cg(e) {
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
        S += wg(y);
        break;
      case 92:
        S += _g(Ja() - 1, 7);
        continue;
      case 47:
        switch (Vt()) {
          case 42:
          case 47:
            Pa(bg(kg(ot(), Ja()), t, n), l);
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
          else if (p == 125 && x++ == 0 && yg() == 125)
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
            Vt() === 45 && (S += Ka(ot())), m = Vt(), d = f = At(h = S += Sg(Ja())), p++;
            break;
          case 45:
            y === 45 && At(S) == 2 && (x = 0);
        }
    }
  return a;
}
function c0(e, t, n, r, i, a, o, s, l, c, d) {
  for (var f = i - 1, m = i === 0 ? a : [""], w = Fu(m), y = 0, x = 0, _ = 0; y < r; ++y)
    for (var u = 0, p = Mi(e, f + 1, f = xg(x = o[y])), h = e; u < w; ++u)
      (h = sf(x > 0 ? m[u] + " " + p : ee(p, /&\f/g, m[u]))) && (l[_++] = h);
  return ts(e, t, n, i === 0 ? Au : s, l, c, d);
}
function bg(e, t, n) {
  return ts(e, t, n, af, qo(gg()), Mi(e, 2, -2), 0);
}
function d0(e, t, n, r) {
  return ts(e, t, n, ju, Mi(e, 0, r), Mi(e, r + 1, -1), r);
}
function Ir(e, t) {
  for (var n = "", r = Fu(e), i = 0; i < r; i++)
    n += t(e[i], i, e, t) || "";
  return n;
}
function Eg(e, t, n, r) {
  switch (e.type) {
    case fg:
      if (e.children.length) break;
    case dg:
    case ju:
      return e.return = e.return || e.value;
    case af:
      return "";
    case of:
      return e.return = e.value + "{" + Ir(e.children, r) + "}";
    case Au:
      e.value = e.props.join(",");
  }
  return At(n = Ir(e.children, r)) ? e.return = e.value + "{" + n + "}" : "";
}
function Tg(e) {
  var t = Fu(e);
  return function(n, r, i, a) {
    for (var o = "", s = 0; s < t; s++)
      o += e[s](n, r, i, a) || "";
    return o;
  };
}
function Pg(e) {
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
var Ng = function(t, n, r) {
  for (var i = 0, a = 0; i = a, a = Vt(), i === 38 && a === 12 && (n[r] = 1), !Oi(a); )
    ot();
  return va(t, et);
}, Lg = function(t, n) {
  var r = -1, i = 44;
  do
    switch (Oi(i)) {
      case 0:
        i === 38 && Vt() === 12 && (n[r] = 1), t[r] += Ng(et - 1, n, r);
        break;
      case 2:
        t[r] += Ka(i);
        break;
      case 4:
        if (i === 44) {
          t[++r] = Vt() === 58 ? "&\f" : "", n[r] = t[r].length;
          break;
        }
      default:
        t[r] += qo(i);
    }
  while (i = ot());
  return t;
}, Ig = function(t, n) {
  return cf(Lg(uf(t), n));
}, f0 = /* @__PURE__ */ new WeakMap(), Rg = function(t) {
  if (!(t.type !== "rule" || !t.parent || // positive .length indicates that this rule contains pseudo
  // negative .length indicates that this rule has been already prefixed
  t.length < 1)) {
    for (var n = t.value, r = t.parent, i = t.column === r.column && t.line === r.line; r.type !== "rule"; )
      if (r = r.parent, !r) return;
    if (!(t.props.length === 1 && n.charCodeAt(0) !== 58 && !f0.get(r)) && !i) {
      f0.set(t, !0);
      for (var a = [], o = Ig(n, a), s = r.props, l = 0, c = 0; l < o.length; l++)
        for (var d = 0; d < s.length; d++, c++)
          t.props[c] = a[l] ? o[l].replace(/&\f/g, s[d]) : s[d] + " " + o[l];
    }
  }
}, Dg = function(t) {
  if (t.type === "decl") {
    var n = t.value;
    // charcode for l
    n.charCodeAt(0) === 108 && // charcode for b
    n.charCodeAt(2) === 98 && (t.return = "", t.value = "");
  }
};
function ff(e, t) {
  switch (hg(e, t)) {
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
var Mg = function(t, n, r, i) {
  if (t.length > -1 && !t.return) switch (t.type) {
    case ju:
      t.return = ff(t.value, t.length);
      break;
    case of:
      return Ir([oi(t, {
        value: ee(t.value, "@", "@" + q)
      })], i);
    case Au:
      if (t.length) return vg(t.props, function(a) {
        switch (mg(a, /(::plac\w+|:read-\w+)/)) {
          case ":read-only":
          case ":read-write":
            return Ir([oi(t, {
              props: [ee(a, /:(read-\w+)/, ":" + mo + "$1")]
            })], i);
          case "::placeholder":
            return Ir([oi(t, {
              props: [ee(a, /:(plac\w+)/, ":" + q + "input-$1")]
            }), oi(t, {
              props: [ee(a, /:(plac\w+)/, ":" + mo + "$1")]
            }), oi(t, {
              props: [ee(a, /:(plac\w+)/, He + "input-$1")]
            })], i);
        }
        return "";
      });
  }
}, Og = [Mg], Hg = function(t) {
  var n = t.key;
  if (n === "css") {
    var r = document.querySelectorAll("style[data-emotion]:not([data-s])");
    Array.prototype.forEach.call(r, function(x) {
      var _ = x.getAttribute("data-emotion");
      _.indexOf(" ") !== -1 && (document.head.appendChild(x), x.setAttribute("data-s", ""));
    });
  }
  var i = t.stylisPlugins || Og, a = {}, o, s = [];
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
  var l, c = [Rg, Dg];
  {
    var d, f = [Eg, Pg(function(x) {
      d.insert(x);
    })], m = Tg(c.concat(i, f)), w = function(_) {
      return Ir(Cg(_), m);
    };
    l = function(_, u, p, h) {
      d = p, w(_ ? _ + "{" + u.styles + "}" : u.styles), h && (y.inserted[u.name] = !0);
    };
  }
  var y = {
    key: n,
    sheet: new cg({
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
var Ne = typeof Symbol == "function" && Symbol.for, zu = Ne ? Symbol.for("react.element") : 60103, Wu = Ne ? Symbol.for("react.portal") : 60106, ns = Ne ? Symbol.for("react.fragment") : 60107, rs = Ne ? Symbol.for("react.strict_mode") : 60108, is = Ne ? Symbol.for("react.profiler") : 60114, as = Ne ? Symbol.for("react.provider") : 60109, os = Ne ? Symbol.for("react.context") : 60110, Vu = Ne ? Symbol.for("react.async_mode") : 60111, ss = Ne ? Symbol.for("react.concurrent_mode") : 60111, ls = Ne ? Symbol.for("react.forward_ref") : 60112, us = Ne ? Symbol.for("react.suspense") : 60113, Ag = Ne ? Symbol.for("react.suspense_list") : 60120, cs = Ne ? Symbol.for("react.memo") : 60115, ds = Ne ? Symbol.for("react.lazy") : 60116, jg = Ne ? Symbol.for("react.block") : 60121, Fg = Ne ? Symbol.for("react.fundamental") : 60117, zg = Ne ? Symbol.for("react.responder") : 60118, Wg = Ne ? Symbol.for("react.scope") : 60119;
function ct(e) {
  if (typeof e == "object" && e !== null) {
    var t = e.$$typeof;
    switch (t) {
      case zu:
        switch (e = e.type, e) {
          case Vu:
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
      case Wu:
        return t;
    }
  }
}
function pf(e) {
  return ct(e) === ss;
}
ie.AsyncMode = Vu;
ie.ConcurrentMode = ss;
ie.ContextConsumer = os;
ie.ContextProvider = as;
ie.Element = zu;
ie.ForwardRef = ls;
ie.Fragment = ns;
ie.Lazy = ds;
ie.Memo = cs;
ie.Portal = Wu;
ie.Profiler = is;
ie.StrictMode = rs;
ie.Suspense = us;
ie.isAsyncMode = function(e) {
  return pf(e) || ct(e) === Vu;
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
  return ct(e) === Wu;
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
  return typeof e == "string" || typeof e == "function" || e === ns || e === ss || e === is || e === rs || e === us || e === Ag || typeof e == "object" && e !== null && (e.$$typeof === ds || e.$$typeof === cs || e.$$typeof === as || e.$$typeof === os || e.$$typeof === ls || e.$$typeof === Fg || e.$$typeof === zg || e.$$typeof === Wg || e.$$typeof === jg);
};
ie.typeOf = ct;
xf.exports = ie;
var Vg = xf.exports, hf = Vg;
var Bg = {
  $$typeof: !0,
  render: !0,
  defaultProps: !0,
  displayName: !0,
  propTypes: !0
}, Ug = {
  $$typeof: !0,
  compare: !0,
  defaultProps: !0,
  displayName: !0,
  propTypes: !0,
  type: !0
}, mf = {};
mf[hf.ForwardRef] = Bg;
mf[hf.Memo] = Ug;
var Aw = Object.prototype;
var $g = !0;
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
  $g === !1) && t.registered[i] === void 0 && (t.registered[i] = n.styles);
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
var Gg = {
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
}, Yg = !1, Xg = /[A-Z]|^ms/g, Qg = /_EMO_([^_]+?)_([^]*?)_EMO_/g, yf = function(t) {
  return t.charCodeAt(1) === 45;
}, x0 = function(t) {
  return t != null && typeof t != "boolean";
}, zs = /* @__PURE__ */ df(function(e) {
  return yf(e) ? e : e.replace(Xg, "-$&").toLowerCase();
}), p0 = function(t, n) {
  switch (t) {
    case "animation":
    case "animationName":
      if (typeof n == "string")
        return n.replace(Qg, function(r, i, a) {
          return jt = {
            name: i,
            styles: a,
            next: jt
          }, i;
        });
  }
  return Gg[t] !== 1 && !yf(t) && typeof n == "number" && n !== 0 ? n + "px" : n;
}, Jg = "Component selectors can only be used in conjunction with @emotion/babel-plugin, the swc Emotion plugin, or another Emotion-aware compiler transform.";
function Hi(e, t, n) {
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
      return Kg(e, t, n);
    }
    case "function": {
      if (e !== void 0) {
        var l = jt, c = n(e);
        return jt = l, Hi(e, t, c);
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
function Kg(e, t, n) {
  var r = "";
  if (Array.isArray(n))
    for (var i = 0; i < n.length; i++)
      r += Hi(e, t, n[i]) + ";";
  else
    for (var a in n) {
      var o = n[a];
      if (typeof o != "object") {
        var s = o;
        t != null && t[s] !== void 0 ? r += a + "{" + t[s] + "}" : x0(s) && (r += zs(a) + ":" + p0(a, s) + ";");
      } else {
        if (a === "NO_COMPONENT_SELECTOR" && Yg)
          throw new Error(Jg);
        if (Array.isArray(o) && typeof o[0] == "string" && (t == null || t[o[0]] === void 0))
          for (var l = 0; l < o.length; l++)
            x0(o[l]) && (r += zs(a) + ":" + p0(a, o[l]) + ";");
        else {
          var c = Hi(e, t, o);
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
    r = !1, i += Hi(n, t, a);
  else {
    var o = a;
    i += o[0];
  }
  for (var s = 1; s < e.length; s++)
    if (i += Hi(n, t, e[s]), r) {
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
var qg = function(t) {
  return t();
}, _f = Zc.useInsertionEffect ? Zc.useInsertionEffect : !1, kf = _f || qg, jw = _f || ae.useLayoutEffect, e2 = !1, t2 = /* @__PURE__ */ ae.createContext(
  // we're doing this to avoid preconstruct's dead code elimination in this one case
  // because this module is primarily intended for the browser and node
  // but it's also required in react native and similar environments sometimes
  // and we could have a special build just for that
  // but this is much easier and the native packages
  // might use a different theme context in the future anyway
  typeof HTMLElement < "u" ? /* @__PURE__ */ Hg({
    key: "css"
  }) : null
), Sf = function(t) {
  return /* @__PURE__ */ ae.forwardRef(function(n, r) {
    var i = ae.useContext(t2);
    return t(n, i, r);
  });
}, Cf = /* @__PURE__ */ ae.createContext({}), fs = {}.hasOwnProperty, bl = "__EMOTION_TYPE_PLEASE_DO_NOT_USE__", bf = function(t, n) {
  var r = {};
  for (var i in n)
    fs.call(n, i) && (r[i] = n[i]);
  return r[bl] = t, r;
}, n2 = function(t) {
  var n = t.cache, r = t.serialized, i = t.isStringTag;
  return Bu(n, r, i), kf(function() {
    return gf(n, r, i);
  }), null;
}, r2 = /* @__PURE__ */ Sf(
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
      fs.call(e, c) && c !== "css" && c !== bl && !e2 && (l[c] = e[c]);
    return l.className = o, n && (l.ref = n), /* @__PURE__ */ ae.createElement(ae.Fragment, null, /* @__PURE__ */ ae.createElement(n2, {
      cache: t,
      serialized: s,
      isStringTag: typeof i == "string"
    }), /* @__PURE__ */ ae.createElement(i, l));
  }
), Ef = r2;
function $(e, t, n) {
  return fs.call(t, "css") ? Wt.jsx(Ef, bf(e, t), n) : Wt.jsx(e, t, n);
}
function vn(e, t, n) {
  return fs.call(t, "css") ? Wt.jsxs(Ef, bf(e, t), n) : Wt.jsxs(e, t, n);
}
var i2 = /^((children|dangerouslySetInnerHTML|key|ref|autoFocus|defaultValue|defaultChecked|innerHTML|suppressContentEditableWarning|suppressHydrationWarning|valueLink|abbr|accept|acceptCharset|accessKey|action|allow|allowUserMedia|allowPaymentRequest|allowFullScreen|allowTransparency|alt|async|autoComplete|autoPlay|capture|cellPadding|cellSpacing|challenge|charSet|checked|cite|classID|className|cols|colSpan|content|contentEditable|contextMenu|controls|controlsList|coords|crossOrigin|data|dateTime|decoding|default|defer|dir|disabled|disablePictureInPicture|disableRemotePlayback|download|draggable|encType|enterKeyHint|form|formAction|formEncType|formMethod|formNoValidate|formTarget|frameBorder|headers|height|hidden|high|href|hrefLang|htmlFor|httpEquiv|id|inputMode|integrity|is|keyParams|keyType|kind|label|lang|list|loading|loop|low|marginHeight|marginWidth|max|maxLength|media|mediaGroup|method|min|minLength|multiple|muted|name|nonce|noValidate|open|optimum|pattern|placeholder|playsInline|poster|preload|profile|radioGroup|readOnly|referrerPolicy|rel|required|reversed|role|rows|rowSpan|sandbox|scope|scoped|scrolling|seamless|selected|shape|size|sizes|slot|span|spellCheck|src|srcDoc|srcLang|srcSet|start|step|style|summary|tabIndex|target|title|translate|type|useMap|value|width|wmode|wrap|about|datatype|inlist|prefix|property|resource|typeof|vocab|autoCapitalize|autoCorrect|autoSave|color|incremental|fallback|inert|itemProp|itemScope|itemType|itemID|itemRef|on|option|results|security|unselectable|accentHeight|accumulate|additive|alignmentBaseline|allowReorder|alphabetic|amplitude|arabicForm|ascent|attributeName|attributeType|autoReverse|azimuth|baseFrequency|baselineShift|baseProfile|bbox|begin|bias|by|calcMode|capHeight|clip|clipPathUnits|clipPath|clipRule|colorInterpolation|colorInterpolationFilters|colorProfile|colorRendering|contentScriptType|contentStyleType|cursor|cx|cy|d|decelerate|descent|diffuseConstant|direction|display|divisor|dominantBaseline|dur|dx|dy|edgeMode|elevation|enableBackground|end|exponent|externalResourcesRequired|fill|fillOpacity|fillRule|filter|filterRes|filterUnits|floodColor|floodOpacity|focusable|fontFamily|fontSize|fontSizeAdjust|fontStretch|fontStyle|fontVariant|fontWeight|format|from|fr|fx|fy|g1|g2|glyphName|glyphOrientationHorizontal|glyphOrientationVertical|glyphRef|gradientTransform|gradientUnits|hanging|horizAdvX|horizOriginX|ideographic|imageRendering|in|in2|intercept|k|k1|k2|k3|k4|kernelMatrix|kernelUnitLength|kerning|keyPoints|keySplines|keyTimes|lengthAdjust|letterSpacing|lightingColor|limitingConeAngle|local|markerEnd|markerMid|markerStart|markerHeight|markerUnits|markerWidth|mask|maskContentUnits|maskUnits|mathematical|mode|numOctaves|offset|opacity|operator|order|orient|orientation|origin|overflow|overlinePosition|overlineThickness|panose1|paintOrder|pathLength|patternContentUnits|patternTransform|patternUnits|pointerEvents|points|pointsAtX|pointsAtY|pointsAtZ|preserveAlpha|preserveAspectRatio|primitiveUnits|r|radius|refX|refY|renderingIntent|repeatCount|repeatDur|requiredExtensions|requiredFeatures|restart|result|rotate|rx|ry|scale|seed|shapeRendering|slope|spacing|specularConstant|specularExponent|speed|spreadMethod|startOffset|stdDeviation|stemh|stemv|stitchTiles|stopColor|stopOpacity|strikethroughPosition|strikethroughThickness|string|stroke|strokeDasharray|strokeDashoffset|strokeLinecap|strokeLinejoin|strokeMiterlimit|strokeOpacity|strokeWidth|surfaceScale|systemLanguage|tableValues|targetX|targetY|textAnchor|textDecoration|textRendering|textLength|to|transform|u1|u2|underlinePosition|underlineThickness|unicode|unicodeBidi|unicodeRange|unitsPerEm|vAlphabetic|vHanging|vIdeographic|vMathematical|values|vectorEffect|version|vertAdvY|vertOriginX|vertOriginY|viewBox|viewTarget|visibility|widths|wordSpacing|writingMode|x|xHeight|x1|x2|xChannelSelector|xlinkActuate|xlinkArcrole|xlinkHref|xlinkRole|xlinkShow|xlinkTitle|xlinkType|xmlBase|xmlns|xmlnsXlink|xmlLang|xmlSpace|y|y1|y2|yChannelSelector|z|zoomAndPan|for|class|autofocus)|(([Dd][Aa][Tt][Aa]|[Aa][Rr][Ii][Aa]|x)-.*))$/, a2 = /* @__PURE__ */ df(
  function(e) {
    return i2.test(e) || e.charCodeAt(0) === 111 && e.charCodeAt(1) === 110 && e.charCodeAt(2) < 91;
  }
  /* Z+1 */
), o2 = a2, s2 = function(t) {
  return t !== "theme";
}, m0 = function(t) {
  return typeof t == "string" && // 96 is one less than the char code
  // for "a" so this is checking that
  // it's a lowercase character
  t.charCodeAt(0) > 96 ? o2 : s2;
}, v0 = function(t, n, r) {
  var i;
  if (n) {
    var a = n.shouldForwardProp;
    i = t.__emotion_forwardProp && a ? function(o) {
      return t.__emotion_forwardProp(o) && a(o);
    } : a;
  }
  return typeof i != "function" && r && (i = t.__emotion_forwardProp), i;
}, l2 = !1, u2 = function(t) {
  var n = t.cache, r = t.serialized, i = t.isStringTag;
  return Bu(n, r, i), kf(function() {
    return gf(n, r, i);
  }), null;
}, c2 = function e(t, n) {
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
      return O.className = h, u && (O.ref = u), /* @__PURE__ */ ae.createElement(ae.Fragment, null, /* @__PURE__ */ ae.createElement(u2, {
        cache: _,
        serialized: S,
        isStringTag: typeof p == "string"
      }), /* @__PURE__ */ ae.createElement(p, O));
    });
    return y.displayName = a !== void 0 ? a : "Styled(" + (typeof i == "string" ? i : i.displayName || i.name || "Component") + ")", y.defaultProps = t.defaultProps, y.__emotion_real = y, y.__emotion_base = i, y.__emotion_styles = f, y.__emotion_forwardProp = s, Object.defineProperty(y, "toString", {
      value: function() {
        return o === void 0 && l2 ? "NO_COMPONENT_SELECTOR" : "." + o;
      }
    }), y.withComponent = function(x, _) {
      return e(x, Cl({}, n, _, {
        shouldForwardProp: v0(y, _, !0)
      })).apply(void 0, f);
    }, y;
  };
}, d2 = [
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
], Kn = c2.bind();
d2.forEach(function(e) {
  Kn[e] = Kn(e);
});
const f2 = "https://prosopo.io/?ref=prosopo.io&amp;utm_campaign=widget&amp;utm_medium=checkbox#features", x2 = "Visit prosopo.io to learn more about the service and its accessibility options.", p2 = 74, Tf = 80, Pf = "302px", h2 = {
  maxWidth: Pf,
  minHeight: `${Tf}px`
}, m2 = "8px", v2 = "2px", g2 = "1px solid", y2 = Kn.div`
  container-type: inline-size;
`, w2 = Kn.div`
  max-width: 100%;
  max-height: 100%;
  overflow: hidden;
  height: ${Tf}px;
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
`, Nf = {
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
}, vo = 10, Lf = {
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
    grey: Nf
  },
  spacing: {
    unit: vo,
    half: Math.floor(vo / 2)
  }
}, If = {
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
    grey: Nf
  },
  spacing: {
    unit: vo,
    half: Math.floor(vo / 2)
  }
}, _2 = ({ themeColor: e }) => {
  const t = ae.useMemo(() => e === "light" ? Lf : If, [e]), n = Kn.div`
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
}, k2 = ({ themeColor: e }) => {
  const t = ae.useMemo(() => e === "light" ? "#1d1d1b" : "#fff", [e]);
  return vn("svg", { className: "logo", id: "logo-with-text", xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 468.67004 487.99998", height: "35px", style: { fill: t }, "aria-label": "Prosopo Logo With Text", children: [$("title", { children: "Prosopo Logo With Text" }), vn("g", { id: "g1960", transform: "translate(0,-35.903035)", children: [vn("g", { id: "g943", transform: "matrix(0.82220888,0,0,0.82220888,103.56268,35.903035)", children: [$("path", { className: "cls-1", d: "m 335.55,1825.19 a 147.75,147.75 0 0 1 147.75,147.75 h 50.5 c 0,-109.49 -88.76,-198.25 -198.25,-198.25 z", transform: "translate(-215.73,-1774.69)", id: "path8" }), $("path", { className: "cls-1", d: "m 269.36,1891.39 a 147.74,147.74 0 0 1 147.74,147.74 h 50.5 c 0,-109.49 -88.75,-198.24 -198.24,-198.24 z", transform: "translate(-215.73,-1774.69)", id: "path10" }), $("path", { className: "cls-1", d: "M 414,2157.17 A 147.75,147.75 0 0 1 266.26,2009.43 h -50.5 c 0,109.49 88.75,198.24 198.24,198.24 z", transform: "translate(-215.73,-1774.69)", id: "path12" }), $("path", { className: "cls-1", d: "M 480.17,2091 A 147.74,147.74 0 0 1 332.43,1943.25 h -50.51 c 0,109.49 88.76,198.25 198.25,198.25 z", transform: "translate(-215.73,-1774.69)", id: "path14" })] }), vn("g", { id: "g937", transform: "translate(-3.3873724,-118.52322)", children: [$("path", { className: "cls-1", d: "m 63.842242,576.50288 q -7.89541,6.5896 -22.55626,6.5896 h -18.73684 v 32.33977 H 3.8901421 v -89.9368 H 42.516842 q 13.35216,0 21.29081,6.95569 7.93866,6.95569 7.94154,21.53871 -0.009,15.92343 -7.90695,22.51303 z m -14.35529,-32.40032 q -3.56577,-2.98636 -10.00259,-2.99212 h -16.92369 v 26.48235 h 16.93522 q 6.43394,0 10.00259,-3.23426 3.56864,-3.23427 3.57153,-10.2505 0,-7.01334 -3.58306,-10.00547 z", id: "path16", style: { strokeWidth: 0.288259 } }), $("path", { className: "cls-1", d: "m 116.56193,547.36566 c 0.22484,0.0231 0.72353,0.0548 1.49607,0.0922 v 17.81729 c -1.09827,-0.12107 -2.07547,-0.20466 -2.92872,-0.24502 -0.85324,-0.0404 -1.54506,-0.0605 -2.07546,-0.0605 q -10.49263,0 -14.092978,6.83462 -2.01782,3.84249 -2.01782,11.83591 v 31.79205 h -17.50885 v -66.51 h 16.59796 v 11.58225 q 4.035618,-6.65013 7.016218,-9.09169 4.88311,-4.08751 12.6834,-4.08751 c 0.34302,0.0115 0.60822,0.0202 0.83018,0.0404 z", id: "path18", style: { strokeWidth: 0.288259 } }), $("path", { className: "cls-1", d: "m 179.9645,607.2947 q -8.42005,10.39462 -25.56569,10.39462 -17.14565,0 -25.56569,-10.39462 -8.43446,-10.39462 -8.43446,-25.02664 0,-14.38413 8.42293,-24.93441 8.42292,-10.55028 25.56569,-10.54739 17.14276,0 25.56569,10.54739 8.42292,10.5474 8.42004,24.93441 0.0115,14.63202 -8.40851,25.02664 z m -13.91138,-9.60479 q 4.08463,-5.42215 4.08751,-15.41609 0.003,-9.99394 -4.08751,-15.38438 -4.0904,-5.39044 -11.71485,-5.39332 -7.62445,-0.003 -11.74367,5.38756 -4.11922,5.3962 -4.11922,15.38438 0,9.98817 4.11922,15.42185 4.11634,5.42216 11.74655,5.42216 7.63022,0 11.71197,-5.42216 z", id: "path20", style: { strokeWidth: 0.288259 } }), $("path", { className: "cls-1", d: "m 210.56895,594.19621 q 0.55346,4.64097 2.38967,6.59249 3.25156,3.4764 12.0204,3.4764 5.14542,0 8.18367,-1.52489 3.03825,-1.52489 3.03537,-4.57755 a 4.9349939,4.9349939 0 0 0 -2.44444,-4.4536 q -2.44732,-1.52201 -18.1949,-5.24632 -11.33723,-2.80476 -15.97243,-7.0191 -4.63521,-4.14805 -4.63809,-11.95987 0,-9.22429 7.24683,-15.83407 7.24683,-6.60978 20.39432,-6.62995 12.47009,0 20.33091,4.97246 7.86082,4.97247 9.01962,17.17736 h -17.39066 q -0.36609,-3.35534 -1.89675,-5.30973 -2.88259,-3.53694 -9.8008,-3.53982 -5.69023,0 -8.10873,1.76991 -2.41849,1.76991 -2.41561,4.15093 c 0,1.99187 0.86478,3.43893 2.57127,4.32388 q 2.56263,1.40959 18.16032,4.82258 10.37732,2.43867 15.5804,7.38231 5.12236,5.00129 5.12524,12.50756 0,9.88728 -7.3679,16.1425 -7.3679,6.25522 -22.77246,6.25522 -15.71299,0 -23.20196,-6.62996 -7.48897,-6.62995 -7.49474,-16.8718 z", id: "path22", style: { strokeWidth: 0.288259 } }), $("path", { className: "cls-1", d: "m 318.29999,607.2947 q -8.42293,10.39462 -25.56858,10.39462 -17.14564,0 -25.56569,-10.39462 -8.41716,-10.39462 -8.42004,-25.02664 0,-14.38413 8.42004,-24.93441 8.42005,-10.55028 25.56569,-10.54739 17.14853,0 25.56858,10.54739 8.42004,10.5474 8.42004,24.93441 0,14.63202 -8.42004,25.02664 z m -13.91427,-9.60479 q 4.0904,-5.42215 4.0904,-15.41609 0,-9.99394 -4.0904,-15.38438 -4.08751,-5.39044 -11.71484,-5.39332 -7.62733,-0.003 -11.74656,5.39332 -4.11633,5.39621 -4.11633,15.38438 0,9.98818 4.11633,15.41609 4.12211,5.42216 11.74656,5.42216 7.62445,0 11.71484,-5.42216 z", id: "path24", style: { strokeWidth: 0.288259 } }), $("path", { className: "cls-1", d: "m 389.56049,556.06243 q 8.14043,8.60165 8.13755,25.26014 0,17.5838 -7.95018,26.78791 -7.95018,9.20411 -20.48369,9.22428 -7.98189,0 -13.25991,-3.96644 -2.88259,-2.19653 -5.64988,-6.408 v 34.66026 h -17.22059 v -92.69833 h 16.65849 v 9.82387 q 2.82206,-4.32388 6.01885,-6.83462 5.83148,-4.44784 13.87967,-4.4536 11.73502,0 19.86969,8.60453 z m -13.34639,12.50756 q -3.54559,-5.91507 -11.49577,-5.91796 -9.55579,0 -13.12731,8.96774 -1.85351,4.75916 -1.85063,12.08382 0,11.59089 6.22063,16.28951 3.69548,2.74711 8.75443,2.74711 7.33619,0 11.19309,-5.61528 3.85691,-5.61529 3.85114,-14.94911 0,-7.68787 -3.54558,-13.60006 z", id: "path26", style: { strokeWidth: 0.288259 } }), $("path", { className: "cls-1", d: "m 463.46721,607.2947 q -8.41716,10.39462 -25.56569,10.39462 -17.14852,0 -25.56569,-10.39462 -8.42292,-10.39462 -8.42004,-25.02664 0,-14.38413 8.42004,-24.93441 8.42005,-10.55028 25.56569,-10.54739 17.14853,0 25.56569,10.54739 8.41716,10.5474 8.42293,24.93441 0,14.63202 -8.42293,25.02664 z m -13.91138,-9.60479 q 4.0904,-5.42215 4.08752,-15.41609 -0.003,-9.99394 -4.08752,-15.38438 -4.08751,-5.39044 -11.71484,-5.39332 -7.62733,-0.003 -11.74656,5.39332 -4.11633,5.39621 -4.11922,15.38438 -0.003,9.98818 4.11922,15.41609 4.12211,5.42216 11.74656,5.42216 7.62445,0 11.71484,-5.42216 z", id: "path28", style: { strokeWidth: 0.288259 } })] })] })] });
}, S2 = ({ themeColor: e }) => {
  const t = ae.useMemo(() => e === "light" ? "#1d1d1b" : "#fff", [e]);
  return vn("svg", { className: "logo", id: "logo-without-text", xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 260 348", height: "35px", style: { fill: t }, "aria-label": "Prosopo Logo Without Text", children: [$("title", { children: "Prosopo Logo Without Text" }), $("path", { d: "M95.7053 40.2707C127.005 40.2707 157.022 52.6841 179.154 74.78C201.286 96.8759 213.719 126.844 213.719 158.093H254.056C254.056 70.7808 183.16 -4.57764e-05 95.7053 -4.57764e-05V40.2707Z" }), $("path", { d: "M42.8365 93.0614C58.3333 93.0614 73.6784 96.1087 87.9955 102.029C102.313 107.95 115.322 116.628 126.279 127.568C137.237 138.508 145.93 151.496 151.86 165.79C157.79 180.084 160.843 195.404 160.843 210.875H201.179C201.179 123.564 130.291 52.7906 42.8365 52.7906V93.0614Z" }), $("path", { d: "M158.367 305.005C127.07 305.003 97.056 292.59 74.926 270.496C52.796 248.402 40.3626 218.437 40.3604 187.191H0.0239563C0.0239563 274.503 70.9123 345.276 158.367 345.276V305.005Z" }), $("path", { d: "M211.219 252.239C195.722 252.239 180.376 249.191 166.059 243.27C151.741 237.349 138.732 228.67 127.774 217.729C116.816 206.788 108.123 193.799 102.194 179.505C96.2637 165.21 93.2121 149.889 93.2132 134.417H52.8687C52.8687 221.729 123.765 292.509 211.219 292.509V252.239Z" })] });
}, C2 = Kn.div`
  padding: 4px;
  flex: 1 1 0;
`, b2 = Kn.div`
  padding: 4px;
`, E2 = ({ themeColor: e }) => $(C2, { children: vn(b2, { children: [$(S2, { themeColor: e }), $(k2, { themeColor: e })] }) }), Uu = (e) => {
  const t = e.darkMode === "light" ? "light" : "dark", n = e.darkMode === "light" ? Lf : If;
  return $("div", { children: $("div", { style: {
    maxWidth: Pf,
    maxHeight: "100%",
    overflowX: "auto"
  }, children: $(y2, { children: $(w2, { children: vn("div", { style: h2, "data-cy": "button-human", children: [" ", vn("div", { style: {
    padding: v2,
    border: g2,
    backgroundColor: n.palette.background.default,
    borderColor: n.palette.grey[300],
    borderRadius: m2,
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    justifyContent: "space-between",
    minHeight: `${p2}px`,
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
  }, children: $("div", { style: { display: "inline-flex" }, children: $(_2, { themeColor: t, "aria-label": "Loading spinner" }) }) }) }) }) }), $("div", { style: { display: "inline-flex", flexDirection: "column" }, children: $("a", { href: f2, target: "_blank", "aria-label": x2, rel: "noreferrer", children: $("div", { style: { flex: 1 }, children: $(E2, { themeColor: t, "aria-label": "Prosopo logo" }) }) }) })] })] }) }) }) }) });
}, go = new Array(256), Rf = new Array(256 * 256);
for (let e = 0; e < 256; e++)
  go[e] = e.toString(16).padStart(2, "0");
for (let e = 0; e < 256; e++) {
  const t = e << 8;
  for (let n = 0; n < 256; n++)
    Rf[t | n] = go[e] + go[n];
}
function Ws(e, t) {
  const n = e.length % 2 | 0, r = e.length - n | 0;
  for (let i = 0; i < r; i += 2)
    t += Rf[e[i] << 8 | e[i + 1]];
  return n && (t += go[e[r] | 0]), t;
}
function T2(e, t = -1, n = !0) {
  const r = n ? "0x" : "";
  if (e != null && e.length) {
    if (t > 0) {
      const i = Math.ceil(t / 8);
      if (e.length > i)
        return `${Ws(e.subarray(0, i / 2), r)}…${Ws(e.subarray(e.length - i / 2), "")}`;
    }
  } else return r;
  return Ws(e, r);
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
]), P2 = (e) => JSON.stringify(e, null, 2).replace(/"([^"]+)":/g, "$1:");
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
const zr = (e, t) => {
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
let Df = zr;
function N2(e) {
  Df = e;
}
function yo() {
  return Df;
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
}, L2 = [];
function P(e, t) {
  const n = yo(), r = wo({
    issueData: t,
    data: e.data,
    path: e.path,
    errorMaps: [
      e.common.contextualErrorMap,
      e.schemaErrorMap,
      n,
      n === zr ? void 0 : zr
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
}), mr = (e) => ({ status: "dirty", value: e }), Ue = (e) => ({ status: "valid", value: e }), Tl = (e) => e.status === "aborted", Pl = (e) => e.status === "dirty", Ai = (e) => e.status === "valid", ji = (e) => typeof Promise < "u" && e instanceof Promise;
function _o(e, t, n, r) {
  if (typeof t == "function" ? e !== t || !r : !t.has(e)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
  return t.get(e);
}
function Mf(e, t, n, r, i) {
  if (typeof t == "function" ? e !== t || !i : !t.has(e)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
  return t.set(e, n), n;
}
var H;
(function(e) {
  e.errToObj = (t) => typeof t == "string" ? { message: t } : t || {}, e.toString = (t) => typeof t == "string" ? t : t == null ? void 0 : t.message;
})(H || (H = {}));
var hi, mi;
class Zt {
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
    return Rn.create(this, this._def);
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
    return Vi.create([this, t], this._def);
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
    return new $u({
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
const I2 = /^c[^\s-]{8,}$/i, R2 = /^[0-9a-z]+$/, D2 = /^[0-9A-HJKMNP-TV-Z]{26}$/, M2 = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i, O2 = /^[a-z0-9_-]{21}$/i, H2 = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/, A2 = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i, j2 = "^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$";
let Vs;
const F2 = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/, z2 = /^(([a-f0-9]{1,4}:){7}|::([a-f0-9]{1,4}:){0,6}|([a-f0-9]{1,4}:){1}:([a-f0-9]{1,4}:){0,5}|([a-f0-9]{1,4}:){2}:([a-f0-9]{1,4}:){0,4}|([a-f0-9]{1,4}:){3}:([a-f0-9]{1,4}:){0,3}|([a-f0-9]{1,4}:){4}:([a-f0-9]{1,4}:){0,2}|([a-f0-9]{1,4}:){5}:([a-f0-9]{1,4}:){0,1})([a-f0-9]{1,4}|(((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2}))\.){3}((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2})))$/, W2 = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/, Of = "((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))", V2 = new RegExp(`^${Of}$`);
function Hf(e) {
  let t = "([01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d";
  return e.precision ? t = `${t}\\.\\d{${e.precision}}` : e.precision == null && (t = `${t}(\\.\\d+)?`), t;
}
function B2(e) {
  return new RegExp(`^${Hf(e)}$`);
}
function Af(e) {
  let t = `${Of}T${Hf(e)}`;
  const n = [];
  return n.push(e.local ? "Z?" : "Z"), e.offset && n.push("([+-]\\d{2}:?\\d{2})"), t = `${t}(${n.join("|")})`, new RegExp(`^${t}$`);
}
function U2(e, t) {
  return !!((t === "v4" || !t) && F2.test(e) || (t === "v6" || !t) && z2.test(e));
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
        A2.test(t.data) || (i = this._getOrReturnCtx(t, i), P(i, {
          validation: "email",
          code: E.invalid_string,
          message: a.message
        }), r.dirty());
      else if (a.kind === "emoji")
        Vs || (Vs = new RegExp(j2, "u")), Vs.test(t.data) || (i = this._getOrReturnCtx(t, i), P(i, {
          validation: "emoji",
          code: E.invalid_string,
          message: a.message
        }), r.dirty());
      else if (a.kind === "uuid")
        M2.test(t.data) || (i = this._getOrReturnCtx(t, i), P(i, {
          validation: "uuid",
          code: E.invalid_string,
          message: a.message
        }), r.dirty());
      else if (a.kind === "nanoid")
        O2.test(t.data) || (i = this._getOrReturnCtx(t, i), P(i, {
          validation: "nanoid",
          code: E.invalid_string,
          message: a.message
        }), r.dirty());
      else if (a.kind === "cuid")
        I2.test(t.data) || (i = this._getOrReturnCtx(t, i), P(i, {
          validation: "cuid",
          code: E.invalid_string,
          message: a.message
        }), r.dirty());
      else if (a.kind === "cuid2")
        R2.test(t.data) || (i = this._getOrReturnCtx(t, i), P(i, {
          validation: "cuid2",
          code: E.invalid_string,
          message: a.message
        }), r.dirty());
      else if (a.kind === "ulid")
        D2.test(t.data) || (i = this._getOrReturnCtx(t, i), P(i, {
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
      }), r.dirty()) : a.kind === "datetime" ? Af(a).test(t.data) || (i = this._getOrReturnCtx(t, i), P(i, {
        code: E.invalid_string,
        validation: "datetime",
        message: a.message
      }), r.dirty()) : a.kind === "date" ? V2.test(t.data) || (i = this._getOrReturnCtx(t, i), P(i, {
        code: E.invalid_string,
        validation: "date",
        message: a.message
      }), r.dirty()) : a.kind === "time" ? B2(a).test(t.data) || (i = this._getOrReturnCtx(t, i), P(i, {
        code: E.invalid_string,
        validation: "time",
        message: a.message
      }), r.dirty()) : a.kind === "duration" ? H2.test(t.data) || (i = this._getOrReturnCtx(t, i), P(i, {
        validation: "duration",
        code: E.invalid_string,
        message: a.message
      }), r.dirty()) : a.kind === "ip" ? U2(t.data, a.version) || (i = this._getOrReturnCtx(t, i), P(i, {
        validation: "ip",
        code: E.invalid_string,
        message: a.message
      }), r.dirty()) : a.kind === "base64" ? W2.test(t.data) || (i = this._getOrReturnCtx(t, i), P(i, {
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
function $2(e, t) {
  const n = (e.toString().split(".")[1] || "").length, r = (t.toString().split(".")[1] || "").length, i = n > r ? n : r, a = parseInt(e.toFixed(i).replace(".", "")), o = parseInt(t.toFixed(i).replace(".", ""));
  return a % o / Math.pow(10, i);
}
class Nn extends G {
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
      }), i.dirty()) : a.kind === "multipleOf" ? $2(t.data, a.value) !== 0 && (r = this._getOrReturnCtx(t, r), P(r, {
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
Nn.create = (e) => new Nn({
  checks: [],
  typeName: j.ZodNumber,
  coerce: (e == null ? void 0 : e.coerce) || !1,
  ...B(e)
});
class Ln extends G {
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
Ln.create = (e) => {
  var t;
  return new Ln({
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
class qn extends G {
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
    return new qn({
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
qn.create = (e) => new qn({
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
class Wi extends G {
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
Wi.create = (e) => new Wi({
  typeName: j.ZodNull,
  ...B(e)
});
class Wr extends G {
  constructor() {
    super(...arguments), this._any = !0;
  }
  _parse(t) {
    return Ue(t.data);
  }
}
Wr.create = (e) => new Wr({
  typeName: j.ZodAny,
  ...B(e)
});
class Xn extends G {
  constructor() {
    super(...arguments), this._unknown = !0;
  }
  _parse(t) {
    return Ue(t.data);
  }
}
Xn.create = (e) => new Xn({
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
      return Promise.all([...n.data].map((o, s) => i.type._parseAsync(new Zt(n, o, n.path, s)))).then((o) => Fe.mergeArray(r, o));
    const a = [...n.data].map((o, s) => i.type._parseSync(new Zt(n, o, n.path, s)));
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
function hr(e) {
  if (e instanceof pe) {
    const t = {};
    for (const n in e.shape) {
      const r = e.shape[n];
      t[n] = Bt.create(hr(r));
    }
    return new pe({
      ...e._def,
      shape: () => t
    });
  } else return e instanceof Nt ? new Nt({
    ...e._def,
    type: hr(e.element)
  }) : e instanceof Bt ? Bt.create(hr(e.unwrap())) : e instanceof Rn ? Rn.create(hr(e.unwrap())) : e instanceof Gt ? Gt.create(e.items.map((t) => hr(t))) : e;
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
        value: d._parse(new Zt(i, f, i.path, c)),
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
            new Zt(i, f, i.path, d)
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
    return hr(this);
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
    return jf(Q.objectKeys(this.shape));
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
class Vi extends G {
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
Vi.create = (e, t) => new Vi({
  options: e,
  typeName: j.ZodUnion,
  ...B(t)
});
const Qt = (e) => e instanceof $i ? Qt(e.schema) : e instanceof Rt ? Qt(e.innerType()) : e instanceof Zi ? [e.value] : e instanceof In ? e.options : e instanceof Gi ? Q.objectValues(e.enum) : e instanceof Yi ? Qt(e._def.innerType) : e instanceof zi ? [void 0] : e instanceof Wi ? [null] : e instanceof Bt ? [void 0, ...Qt(e.unwrap())] : e instanceof Rn ? [null, ...Qt(e.unwrap())] : e instanceof $u || e instanceof Qi ? Qt(e.unwrap()) : e instanceof Xi ? Qt(e._def.innerType) : [];
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
      return l ? l._parse(new Zt(r, o, r.path, s)) : null;
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
        key: a._parse(new Zt(r, s, r.path, s)),
        value: o._parse(new Zt(r, r.data[s], r.path, s)),
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
      key: i._parse(new Zt(r, s, r.path, [c, "key"])),
      value: a._parse(new Zt(r, l, r.path, [c, "value"]))
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
class er extends G {
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
    const s = [...r.data.values()].map((l, c) => a._parse(new Zt(r, l, r.path, c)));
    return r.common.async ? Promise.all(s).then((l) => o(l)) : o(s);
  }
  min(t, n) {
    return new er({
      ...this._def,
      minSize: { value: t, message: H.toString(n) }
    });
  }
  max(t, n) {
    return new er({
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
er.create = (e, t) => new er({
  valueType: e,
  minSize: null,
  maxSize: null,
  typeName: j.ZodSet,
  ...B(t)
});
class Rr extends G {
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
          zr
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
          zr
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
    return new Rr({
      ...this._def,
      args: Gt.create(t).rest(Xn.create())
    });
  }
  returns(t) {
    return new Rr({
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
    return new Rr({
      args: t || Gt.create([]).rest(Xn.create()),
      returns: n || Xn.create(),
      typeName: j.ZodFunction,
      ...B(r)
    });
  }
}
class $i extends G {
  get schema() {
    return this._def.getter();
  }
  _parse(t) {
    const { ctx: n } = this._processInputParams(t);
    return this._def.getter()._parse({ data: n.data, path: n.path, parent: n });
  }
}
$i.create = (e, t) => new $i({
  getter: e,
  typeName: j.ZodLazy,
  ...B(t)
});
class Zi extends G {
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
Zi.create = (e, t) => new Zi({
  value: e,
  typeName: j.ZodLiteral,
  ...B(t)
});
function jf(e, t) {
  return new In({
    values: e,
    typeName: j.ZodEnum,
    ...B(t)
  });
}
class In extends G {
  constructor() {
    super(...arguments), hi.set(this, void 0);
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
    if (_o(this, hi) || Mf(this, hi, new Set(this._def.values)), !_o(this, hi).has(t.data)) {
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
    return In.create(t, {
      ...this._def,
      ...n
    });
  }
  exclude(t, n = this._def) {
    return In.create(this.options.filter((r) => !t.includes(r)), {
      ...this._def,
      ...n
    });
  }
}
hi = /* @__PURE__ */ new WeakMap();
In.create = jf;
class Gi extends G {
  constructor() {
    super(...arguments), mi.set(this, void 0);
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
    if (_o(this, mi) || Mf(this, mi, new Set(Q.getValidEnumValues(this._def.values))), !_o(this, mi).has(t.data)) {
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
mi = /* @__PURE__ */ new WeakMap();
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
          return l.status === "aborted" ? z : l.status === "dirty" || n.value === "dirty" ? mr(l.value) : l;
        });
      {
        if (n.value === "aborted")
          return z;
        const s = this._def.schema._parseSync({
          data: o,
          path: r.path,
          parent: r
        });
        return s.status === "aborted" ? z : s.status === "dirty" || n.value === "dirty" ? mr(s.value) : s;
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
class Rn extends G {
  _parse(t) {
    return this._getType(t) === N.null ? Ue(null) : this._def.innerType._parse(t);
  }
  unwrap() {
    return this._def.innerType;
  }
}
Rn.create = (e, t) => new Rn({
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
class $u extends G {
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
        return a.status === "aborted" ? z : a.status === "dirty" ? (n.dirty(), mr(a.value)) : this._def.out._parseAsync({
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
function Zu(e, t = {}, n) {
  return e ? Wr.create().superRefine((r, i) => {
    var a, o;
    if (!e(r)) {
      const s = typeof t == "function" ? t(r) : typeof t == "string" ? { message: t } : t, l = (o = (a = s.fatal) !== null && a !== void 0 ? a : n) !== null && o !== void 0 ? o : !0, c = typeof s == "string" ? { message: s } : s;
      i.addIssue({ code: "custom", ...c, fatal: l });
    }
  }) : Wr.create();
}
const G2 = {
  object: pe.lazycreate
};
var j;
(function(e) {
  e.ZodString = "ZodString", e.ZodNumber = "ZodNumber", e.ZodNaN = "ZodNaN", e.ZodBigInt = "ZodBigInt", e.ZodBoolean = "ZodBoolean", e.ZodDate = "ZodDate", e.ZodSymbol = "ZodSymbol", e.ZodUndefined = "ZodUndefined", e.ZodNull = "ZodNull", e.ZodAny = "ZodAny", e.ZodUnknown = "ZodUnknown", e.ZodNever = "ZodNever", e.ZodVoid = "ZodVoid", e.ZodArray = "ZodArray", e.ZodObject = "ZodObject", e.ZodUnion = "ZodUnion", e.ZodDiscriminatedUnion = "ZodDiscriminatedUnion", e.ZodIntersection = "ZodIntersection", e.ZodTuple = "ZodTuple", e.ZodRecord = "ZodRecord", e.ZodMap = "ZodMap", e.ZodSet = "ZodSet", e.ZodFunction = "ZodFunction", e.ZodLazy = "ZodLazy", e.ZodLiteral = "ZodLiteral", e.ZodEnum = "ZodEnum", e.ZodEffects = "ZodEffects", e.ZodNativeEnum = "ZodNativeEnum", e.ZodOptional = "ZodOptional", e.ZodNullable = "ZodNullable", e.ZodDefault = "ZodDefault", e.ZodCatch = "ZodCatch", e.ZodPromise = "ZodPromise", e.ZodBranded = "ZodBranded", e.ZodPipeline = "ZodPipeline", e.ZodReadonly = "ZodReadonly";
})(j || (j = {}));
const Y2 = (e, t = {
  message: `Input not instance of ${e.name}`
}) => Zu((n) => n instanceof e, t), M = Pt.create, V = Nn.create, X2 = bo.create, Q2 = Ln.create, ps = Fi.create, J2 = qn.create, K2 = ko.create, Ll = zi.create, q2 = Wi.create, ey = Wr.create, ty = Xn.create, ny = rn.create, ry = So.create, Yt = Nt.create, F = pe.create, iy = pe.strictCreate, Ji = Vi.create, ay = xs.create, oy = Bi.create, sy = Gt.create, Gu = Ui.create, ly = Co.create, uy = er.create, cy = Rr.create, dy = $i.create, $n = Zi.create, ya = In.create, Yu = Gi.create, fy = Vr.create, y0 = Rt.create, xy = Bt.create, py = Rn.create, hy = Rt.createWithPreprocess, my = ga.create, vy = () => M().optional(), gy = () => V().optional(), yy = () => ps().optional(), wy = {
  string: (e) => Pt.create({ ...e, coerce: !0 }),
  number: (e) => Nn.create({ ...e, coerce: !0 }),
  boolean: (e) => Fi.create({
    ...e,
    coerce: !0
  }),
  bigint: (e) => Ln.create({ ...e, coerce: !0 }),
  date: (e) => qn.create({ ...e, coerce: !0 })
}, _y = z;
var rt = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  defaultErrorMap: zr,
  setErrorMap: N2,
  getErrorMap: yo,
  makeIssue: wo,
  EMPTY_PATH: L2,
  addIssueToContext: P,
  ParseStatus: Fe,
  INVALID: z,
  DIRTY: mr,
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
  datetimeRegex: Af,
  ZodString: Pt,
  ZodNumber: Nn,
  ZodBigInt: Ln,
  ZodBoolean: Fi,
  ZodDate: qn,
  ZodSymbol: ko,
  ZodUndefined: zi,
  ZodNull: Wi,
  ZodAny: Wr,
  ZodUnknown: Xn,
  ZodNever: rn,
  ZodVoid: So,
  ZodArray: Nt,
  ZodObject: pe,
  ZodUnion: Vi,
  ZodDiscriminatedUnion: xs,
  ZodIntersection: Bi,
  ZodTuple: Gt,
  ZodRecord: Ui,
  ZodMap: Co,
  ZodSet: er,
  ZodFunction: Rr,
  ZodLazy: $i,
  ZodLiteral: Zi,
  ZodEnum: In,
  ZodNativeEnum: Gi,
  ZodPromise: Vr,
  ZodEffects: Rt,
  ZodTransformer: Rt,
  ZodOptional: Bt,
  ZodNullable: Rn,
  ZodDefault: Yi,
  ZodCatch: Xi,
  ZodNaN: bo,
  BRAND: Z2,
  ZodBranded: $u,
  ZodPipeline: ga,
  ZodReadonly: Qi,
  custom: Zu,
  Schema: G,
  ZodSchema: G,
  late: G2,
  get ZodFirstPartyTypeKind() {
    return j;
  },
  coerce: wy,
  any: ey,
  array: Yt,
  bigint: Q2,
  boolean: ps,
  date: J2,
  discriminatedUnion: ay,
  effect: y0,
  enum: ya,
  function: cy,
  instanceof: Y2,
  intersection: oy,
  lazy: dy,
  literal: $n,
  map: ly,
  nan: X2,
  nativeEnum: Yu,
  never: ny,
  null: q2,
  nullable: py,
  number: V,
  object: F,
  oboolean: yy,
  onumber: gy,
  optional: xy,
  ostring: vy,
  pipeline: my,
  preprocess: hy,
  promise: fy,
  record: Gu,
  set: uy,
  strictObject: iy,
  string: M,
  symbol: K2,
  transformer: y0,
  tuple: sy,
  undefined: Ll,
  union: Ji,
  unknown: ty,
  void: ry,
  NEVER: _y,
  ZodIssueCode: E,
  quotelessJson: P2,
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
const ky = (e, t) => {
  const n = (r) => Object.keys(r).every((i) => e.safeParse(i).success);
  return Gu(t).refine(n);
}, gn = ya([
  "development",
  "rococo",
  "shiden",
  "astar"
]), Ff = Ji([
  $n("sr25519"),
  $n("ed25519"),
  $n("ecdsa"),
  $n("ethereum")
]), Sy = F({
  endpoint: Yt(M().url()),
  contract: F({
    address: M(),
    name: M()
  }),
  pairType: Ff,
  ss58Format: V().positive().default(42)
}), Cy = ky(gn, Sy.required({
  endpoint: !0,
  pairType: !0,
  ss58Format: !0
})), Na = Ff.parse("sr25519"), La = (e) => e || "", by = () => ({
  [gn.Values.development]: {
    endpoint: ["ws://127.0.0.1:9944"],
    contract: {
      name: "captcha",
      address: La("CONTRACT_NOT_DEPLOYED")
    },
    pairType: Na,
    ss58Format: 42
  },
  [gn.Values.rococo]: {
    endpoint: ["wss://rococo-contracts-rpc.polkadot.io:443"],
    contract: {
      name: "captcha",
      address: La("5HiVWQhJrysNcFNEWf2crArKht16zrhro3FcekVWocyQjx5u")
    },
    pairType: Na,
    ss58Format: 42
  },
  [gn.Values.shiden]: {
    endpoint: ["wss://shiden.public.blastapi.io"],
    contract: {
      address: La("XpRox5bNg6YV8BHafsuHQ3b8i7gSq3GKPeYLA1b8EZwrDb3"),
      name: "captcha"
    },
    pairType: Na,
    ss58Format: 42
  },
  [gn.Values.astar]: {
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
}), Xu = 60 * 1e3, wa = Xu, zf = wa * 2, Wf = wa * 3, Qu = wa * 15, hs = Xu, ms = hs * 2, Vf = hs * 3, Bf = Xu * 15;
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
const Ey = "___", Ty = Zu((e) => {
  const t = e.split(Ey);
  try {
    return t.length === 3;
  } catch {
    return !1;
  }
}), Py = F({
  captchaId: Ji([M(), Ll()]),
  captchaContentId: Ji([M(), Ll()]),
  salt: M().min(34),
  solution: V().array().optional(),
  unlabelled: V().array().optional(),
  timeLimit: V().optional()
}), Uf = F({
  hash: M(),
  data: M(),
  type: Yu(Rl)
}), $f = Uf.extend({
  hash: M()
}), Ny = $f.extend({
  label: M()
}), Ly = $f.extend({
  label: M().optional()
}), Zf = Py.extend({
  items: Yt(Uf),
  target: M()
}), Iy = Zf.extend({
  solution: M().array().optional(),
  unlabelled: M().array().optional()
}), Ry = Iy.extend({
  solution: V().array().optional(),
  unlabelled: V().array().optional()
}), Dy = Yt(Zf);
Yt(Ry);
const Gf = F({
  captchaId: M(),
  captchaContentId: M(),
  solution: M().array(),
  salt: M().min(34)
});
Yt(Gf);
F({
  items: Yt(Ly)
});
F({
  items: Yt(Ny)
});
F({
  captchas: Dy,
  format: Yu(Il)
});
F({
  labels: Yt(M())
});
var My = Object.defineProperty, Oy = (e, t, n) => t in e ? My(e, t, { enumerable: !0, configurable: !0, writable: !0, value: n }) : e[t] = n, b0 = (e, t, n) => (Oy(e, typeof t != "symbol" ? t + "" : t, n), n), Bs = {
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
function Hy(e) {
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
}, or = (e) => (t) => e(t instanceof E0 ? t : new E0(t instanceof Uint8Array ? t.buffer : typeof t == "string" ? Hy(t).buffer : t)), vs = (e) => {
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
}, Yf = (e, t) => (n) => e(t(n)), Xf = (e, t) => (n) => t(e(n)), Ay = ([e, t], n, r) => kt(Yf(e, n), Xf(t, r));
function jy(e, t) {
  return or((n) => {
    const r = n.v[t](n.i, !0);
    return n.i += e, r;
  });
}
function Fy(e, t) {
  return (n) => {
    const r = new Uint8Array(e);
    return new DataView(r.buffer)[t](0, n, !0), r;
  };
}
function On(e, t, n) {
  return kt(Fy(e, n), jy(e, t));
}
var Br = On(1, "getUint8", "setUint8"), Eo = On(2, "getUint16", "setUint16"), Ur = On(4, "getUint32", "setUint32"), Qf = On(8, "getBigUint64", "setBigUint64");
On(1, "getInt8", "setInt8");
On(2, "getInt16", "setInt16");
On(4, "getInt32", "setInt32");
On(8, "getBigInt64", "setBigInt64");
var Jf = (e) => {
  const t = new Uint8Array(16), n = new DataView(t.buffer);
  return n.setBigInt64(0, e, !0), n.setBigInt64(8, e >> 64n, !0), t;
}, Kf = (e) => or((t) => {
  const { v: n, i: r } = t, i = n.getBigUint64(r, !0), a = n[e](r + 8, !0);
  return t.i += 16, a << 64n | i;
});
kt(Jf, Kf("getBigUint64"));
kt(Jf, Kf("getBigInt64"));
var qf = (e) => {
  const t = new Uint8Array(32), n = new DataView(t.buffer);
  return n.setBigInt64(0, e, !0), n.setBigInt64(8, e >> 64n, !0), n.setBigInt64(16, e >> 128n, !0), n.setBigInt64(24, e >> 192n, !0), t;
}, ex = (e) => or((t) => {
  let n = t.v.getBigUint64(t.i, !0);
  return t.i += 8, n |= t.v.getBigUint64(t.i, !0) << 64n, t.i += 8, n |= t.v.getBigUint64(t.i, !0) << 128n, t.i += 8, n |= t.v[e](t.i, !0) << 192n, t.i += 8, n;
});
kt(qf, ex("getBigUint64"));
kt(qf, ex("getBigInt64"));
var tx = Ay(Br, (e) => e ? 1 : 0, Boolean), zy = [Br[1], Eo[1], Ur[1]], Wy = or((e) => {
  const t = e[e.i], n = t & 3;
  if (n < 3)
    return zy[n](e) >>> 2;
  const r = (t >>> 2) + 4;
  e.i++;
  let i = 0n;
  const a = r / 8 | 0;
  let o = 0n;
  for (let l = 0; l < a; l++)
    i = Qf[1](e) << o | i, o += 64n;
  let s = r % 8;
  return s > 3 && (i = BigInt(Ur[1](e)) << o | i, o += 32n, s -= 4), s > 1 && (i = BigInt(Eo[1](e)) << o | i, o += 16n, s -= 2), s && (i = BigInt(Br[1](e)) << o | i), i;
}), Vy = 1n << 56n, By = 1 << 24, Uy = 256, $y = 4294967295n, Zy = 64, Gy = 16384, Yy = 1 << 30, Xy = (e) => {
  if (e < 0)
    throw new Error(`Wrong compact input (${e})`);
  const t = Number(e) << 2;
  if (e < Zy)
    return Br[0](t);
  if (e < Gy)
    return Eo[0](t | 1);
  if (e < Yy)
    return Ur[0](t | 2);
  let n = [new Uint8Array(1)], r = BigInt(e);
  for (; r >= Vy; )
    n.push(Qf[0](r)), r >>= 64n;
  r >= By && (n.push(Ur[0](Number(r & $y))), r >>= 32n);
  let i = Number(r);
  i >= Uy && (n.push(Eo[0](i)), i >>= 16), i && n.push(Br[0](i));
  const a = vs(n);
  return a[0] = a.length - 5 << 2 | 3, a;
}, nx = kt(Xy, Wy), Qy = new TextEncoder(), Jy = (e) => {
  const t = Qy.encode(e);
  return vs([nx.enc(t.length), t]);
}, Ky = new TextDecoder(), qy = or((e) => {
  let t = nx.dec(e);
  const n = new DataView(e.buffer, e.i, t);
  return e.i += t, Ky.decode(n);
}), Wn = kt(Jy, qy), e4 = () => {
}, t4 = new Uint8Array(0);
kt(() => t4, e4);
var rx = (e) => or((t) => {
  const n = Br.dec(t);
  if (n !== 0)
    return e === tx[1] ? n === 1 : e(t);
}), ix = (e) => (t) => {
  const n = new Uint8Array(1);
  return t === void 0 ? (n[0] = 0, n) : (n[0] = 1, e === tx[0] ? (n[0] = t ? 1 : 2, n) : vs([n, e(t)]));
}, vr = (e) => kt(ix(e[0]), rx(e[1]));
vr.enc = ix;
vr.dec = rx;
var ax = (...e) => or((t) => e.map((n) => n(t))), ox = (...e) => (t) => vs(e.map((n, r) => n(t[r]))), gs = (...e) => kt(ox(...e.map(([t]) => t)), ax(...e.map(([, t]) => t)));
gs.enc = ox;
gs.dec = ax;
var sx = (e) => {
  const t = Object.keys(e);
  return Yf(gs.enc(...Object.values(e)), (n) => t.map((r) => n[r]));
}, lx = (e) => {
  const t = Object.keys(e);
  return Xf(gs.dec(...Object.values(e)), (n) => Object.fromEntries(n.map((r, i) => [t[i], r])));
}, ki = (e) => kt(sx(T0(e, (t) => t[0])), lx(T0(e, (t) => t[1])));
ki.enc = sx;
ki.dec = lx;
F({
  [D.commitmentId]: M().optional(),
  [D.providerUrl]: M().optional(),
  [D.dapp]: M(),
  [D.user]: M(),
  [D.blockNumber]: V(),
  [D.challenge]: M().optional(),
  [D.nonce]: V().optional(),
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
const n4 = ki({
  [D.commitmentId]: vr(Wn),
  [D.providerUrl]: vr(Wn),
  [D.dapp]: Wn,
  [D.user]: Wn,
  [D.blockNumber]: Ur,
  [D.challenge]: vr(Wn),
  [D.nonce]: vr(Ur),
  [D.timestamp]: Wn,
  [D.signature]: ki({
    [D.provider]: ki({
      [D.timestamp]: Wn
    })
  })
}), ux = M().startsWith("0x"), Fw = (e) => T2(n4.enc({
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
var gr;
(function(e) {
  e.BatchCommit = "/v1/prosopo/provider/admin/batch", e.UpdateDataset = "/v1/prosopo/provider/admin/dataset", e.ProviderDeregister = "/v1/prosopo/provider/admin/deregister", e.ProviderUpdate = "/v1/prosopo/provider/admin/update";
})(gr || (gr = {}));
const cx = {
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
  [gr.BatchCommit]: { windowMs: 6e4, limit: 5 },
  [gr.UpdateDataset]: { windowMs: 6e4, limit: 5 },
  [gr.ProviderDeregister]: { windowMs: 6e4, limit: 1 },
  [gr.ProviderUpdate]: { windowMs: 6e4, limit: 5 }
}, r4 = (e) => F(Object.entries(e).reduce((t, [n, r]) => {
  const i = n;
  return t[i] = F({
    windowMs: V().optional().default(r.windowMs),
    limit: V().optional().default(r.limit)
  }), t;
}, {})), i4 = r4(cx);
F({
  [D.user]: M(),
  [D.dapp]: M(),
  [D.datasetId]: M(),
  [D.blockNumber]: M()
});
const zw = F({
  [D.user]: M(),
  [D.dapp]: M(),
  [D.captchas]: Yt(Gf),
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
  [D.token]: ux,
  [D.dappUserSignature]: M(),
  [D.maxVerifiedTime]: V().optional().default(Qu)
});
F({
  [D.token]: ux,
  [D.dappSignature]: M(),
  [D.verifiedTimeout]: V().optional().default(ms)
});
F({
  [D.user]: M(),
  [D.dapp]: M()
});
const Ww = F({
  [D.challenge]: Ty,
  [D.difficulty]: V(),
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
  [D.nonce]: V(),
  [D.verifiedTimeout]: V().optional().default(ms)
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
]), a4 = Gu(To, F({
  type: M(),
  endpoint: M(),
  dbname: M(),
  authSource: M()
})), o4 = F({
  interval: V().positive().optional().default(300),
  maxBatchExtrinsicPercentage: V().positive().optional().default(59)
}), s4 = F({
  logLevel: P0.optional().default(P0.enum.info),
  defaultEnvironment: To.default(To.Values.production),
  defaultNetwork: gn.default(gn.Values.astar),
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
const dx = s4.merge(F({
  networks: Cy.default(by),
  database: a4.optional(),
  devOnlyWatchEvents: ps().optional()
})), l4 = F({
  solved: F({
    count: V().positive()
  }).optional().default({ count: 1 }),
  unsolved: F({
    count: V().nonnegative()
  }).optional().default({ count: 1 })
}), u4 = F({
  baseURL: M().url(),
  port: V().optional().default(9229)
}), c4 = F({
  requiredNumberOfSolutions: V().positive().min(2),
  solutionWinningPercentage: V().positive().max(100),
  captchaBlockRecency: V().positive().min(2)
}), fx = dx.merge(F({
  userAccountAddress: M().optional(),
  web2: ps().optional().default(!0),
  solutionThreshold: V().positive().max(100).optional().default(80),
  dappName: M().optional().default("ProsopoClientDapp"),
  serverUrl: M().optional()
})), xx = {
  challengeTimeout: wa,
  solutionTimeout: zf,
  verifiedTimeout: Wf,
  cachedTimeout: Qu
}, px = {
  challengeTimeout: ms,
  solutionTimeout: hs,
  cachedTimeout: Vf
}, hx = {
  maxVerifiedTime: Bf
}, Ju = {
  image: xx,
  pow: px,
  contract: hx
}, mx = F({
  image: F({
    challengeTimeout: V().positive().optional().default(wa),
    solutionTimeout: V().positive().optional().default(zf),
    verifiedTimeout: V().positive().optional().default(Wf),
    cachedTimeout: V().positive().optional().default(Qu)
  }).default(xx),
  pow: F({
    verifiedTimeout: V().positive().optional().default(ms),
    solutionTimeout: V().positive().optional().default(hs),
    cachedTimeout: V().positive().optional().default(Vf)
  }).default(px),
  contract: F({
    maxVerifiedTime: V().positive().optional().default(Bf)
  }).default(hx)
}).default(Ju);
fx.merge(F({
  serverUrl: M().url().optional(),
  timeouts: mx.optional().default(Ju)
}));
const d4 = F({
  area: F({
    width: V().positive(),
    height: V().positive()
  }),
  offsetParameter: V().positive(),
  multiplier: V().positive(),
  fontSizeFactor: V().positive(),
  maxShadowBlur: V().positive(),
  numberOfRounds: V().positive(),
  seed: V().positive()
}), f4 = Ji([$n("light"), $n("dark")]), x4 = fx.and(F({
  accountCreator: d4.optional(),
  theme: f4.optional(),
  captchas: mx.optional().default(Ju)
}));
dx.merge(F({
  captchas: l4.optional().default({
    solved: { count: 1 },
    unsolved: { count: 0 }
  }),
  captchaSolutions: c4.optional().default({
    requiredNumberOfSolutions: 3,
    solutionWinningPercentage: 80,
    captchaBlockRecency: 10
  }),
  batchCommit: o4.optional().default({
    interval: 300,
    maxBatchExtrinsicPercentage: 59
  }),
  captchaScheduler: F({
    schedule: M().optional()
  }).optional(),
  server: u4,
  mongoEventsUri: M().optional(),
  mongoCaptchaUri: M().optional(),
  rateLimits: i4.default(cx),
  proxyCount: V().optional().default(0)
}));
var Dl;
(function(e) {
  e.Image = "image", e.Pow = "pow", e.Frictionless = "frictionless";
})(Dl || (Dl = {}));
const p4 = ae.lazy(async () => import("./ProcaptchaWidget-CtdNKhRb.js")), vx = (e) => $(ae.Suspense, { fallback: $(Uu, { darkMode: e.config.theme }), children: $(p4, { config: e.config, callbacks: e.callbacks }) }), h4 = ae.lazy(async () => import("./ProcaptchaWidget-Bk0Iiawd.js")), gx = (e) => $(ae.Suspense, { fallback: $(Uu, { darkMode: e.config.theme }), children: $(h4, { config: e.config, callbacks: e.callbacks }) }), m4 = async () => await og().then((e) => ({ bot: e.isBot })), v4 = ({ config: e, callbacks: t, detectBot: n = m4 }) => {
  const [r, i] = ae.useState(Wt.jsx(Uu, { darkMode: e.theme }));
  return ae.useEffect(() => {
    (async () => {
      (await n()).bot ? i(Wt.jsx(gx, { config: e, callbacks: t })) : i(Wt.jsx(vx, { config: e, callbacks: t }));
    })();
  }, [e, t, n]), r;
};
var yx = { exports: {} }, dt = {}, wx = { exports: {} }, _x = {};
(function(e) {
  function t(I, W) {
    var Z = I.length;
    I.push(W);
    e: for (; 0 < Z; ) {
      var ue = Z - 1 >>> 1, ye = I[ue];
      if (0 < i(ye, W)) I[ue] = W, I[Z] = ye, Z = ue;
      else break e;
    }
  }
  function n(I) {
    return I.length === 0 ? null : I[0];
  }
  function r(I) {
    if (I.length === 0) return null;
    var W = I[0], Z = I.pop();
    if (Z !== W) {
      I[0] = Z;
      e: for (var ue = 0, ye = I.length, Fn = ye >>> 1; ue < Fn; ) {
        var tt = 2 * (ue + 1) - 1, Ms = I[tt], zn = tt + 1, ba = I[zn];
        if (0 > i(Ms, Z)) zn < ye && 0 > i(ba, Ms) ? (I[ue] = ba, I[zn] = Z, ue = zn) : (I[ue] = Ms, I[tt] = Z, ue = tt);
        else if (zn < ye && 0 > i(ba, Z)) I[ue] = ba, I[zn] = Z, ue = zn;
        else break e;
      }
    }
    return W;
  }
  function i(I, W) {
    var Z = I.sortIndex - W.sortIndex;
    return Z !== 0 ? Z : I.id - W.id;
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
    for (var W = n(c); W !== null; ) {
      if (W.callback === null) r(c);
      else if (W.startTime <= I) r(c), W.sortIndex = W.expirationTime, t(l, W);
      else break;
      W = n(c);
    }
  }
  function g(I) {
    if (x = !1, h(I), !y) if (n(l) !== null) y = !0, ri(k);
    else {
      var W = n(c);
      W !== null && ii(g, W.startTime - I);
    }
  }
  function k(I, W) {
    y = !1, x && (x = !1, u(L), L = -1), w = !0;
    var Z = m;
    try {
      for (h(W), f = n(l); f !== null && (!(f.expirationTime > W) || I && !A()); ) {
        var ue = f.callback;
        if (typeof ue == "function") {
          f.callback = null, m = f.priorityLevel;
          var ye = ue(f.expirationTime <= W);
          W = e.unstable_now(), typeof ye == "function" ? f.callback = ye : f === n(l) && r(l), h(W);
        } else r(l);
        f = n(l);
      }
      if (f !== null) var Fn = !0;
      else {
        var tt = n(c);
        tt !== null && ii(g, tt.startTime - W), Fn = !1;
      }
      return Fn;
    } finally {
      f = null, m = Z, w = !1;
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
      var W = !0;
      try {
        W = S(!0, I);
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
    var ur = new MessageChannel(), ni = ur.port2;
    ur.port1.onmessage = le, xt = function() {
      ni.postMessage(null);
    };
  } else xt = function() {
    _(le, 0);
  };
  function ri(I) {
    S = I, C || (C = !0, xt());
  }
  function ii(I, W) {
    L = _(function() {
      I(e.unstable_now());
    }, W);
  }
  e.unstable_IdlePriority = 5, e.unstable_ImmediatePriority = 1, e.unstable_LowPriority = 4, e.unstable_NormalPriority = 3, e.unstable_Profiling = null, e.unstable_UserBlockingPriority = 2, e.unstable_cancelCallback = function(I) {
    I.callback = null;
  }, e.unstable_continueExecution = function() {
    y || w || (y = !0, ri(k));
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
        var W = 3;
        break;
      default:
        W = m;
    }
    var Z = m;
    m = W;
    try {
      return I();
    } finally {
      m = Z;
    }
  }, e.unstable_pauseExecution = function() {
  }, e.unstable_requestPaint = function() {
  }, e.unstable_runWithPriority = function(I, W) {
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
    var Z = m;
    m = I;
    try {
      return W();
    } finally {
      m = Z;
    }
  }, e.unstable_scheduleCallback = function(I, W, Z) {
    var ue = e.unstable_now();
    switch (typeof Z == "object" && Z !== null ? (Z = Z.delay, Z = typeof Z == "number" && 0 < Z ? ue + Z : ue) : Z = ue, I) {
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
    return ye = Z + ye, I = { id: d++, callback: W, priorityLevel: I, startTime: Z, expirationTime: ye, sortIndex: -1 }, Z > ue ? (I.sortIndex = Z, t(c, I), n(l) === null && I === n(c) && (x ? (u(L), L = -1) : x = !0, ii(g, Z - ue))) : (I.sortIndex = ye, t(l, I), y || w || (y = !0, ri(k))), I;
  }, e.unstable_shouldYield = A, e.unstable_wrapCallback = function(I) {
    var W = m;
    return function() {
      var Z = m;
      m = W;
      try {
        return I.apply(this, arguments);
      } finally {
        m = Z;
      }
    };
  };
})(_x);
wx.exports = _x;
var g4 = wx.exports;
var y4 = ae, ut = g4;
function b(e) {
  for (var t = "https://reactjs.org/docs/error-decoder.html?invariant=" + e, n = 1; n < arguments.length; n++) t += "&args[]=" + encodeURIComponent(arguments[n]);
  return "Minified React error #" + e + "; visit " + t + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
}
var kx = /* @__PURE__ */ new Set(), Ki = {};
function sr(e, t) {
  $r(e, t), $r(e + "Capture", t);
}
function $r(e, t) {
  for (Ki[e] = t, e = 0; e < t.length; e++) kx.add(t[e]);
}
var an = !(typeof window > "u" || typeof window.document > "u" || typeof window.document.createElement > "u"), Ml = Object.prototype.hasOwnProperty, w4 = /^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/, N0 = {}, L0 = {};
function _4(e) {
  return Ml.call(L0, e) ? !0 : Ml.call(N0, e) ? !1 : w4.test(e) ? L0[e] = !0 : (N0[e] = !0, !1);
}
function k4(e, t, n, r) {
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
function S4(e, t, n, r) {
  if (t === null || typeof t > "u" || k4(e, t, n, r)) return !0;
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
var Ku = /[\-:]([a-z])/g;
function qu(e) {
  return e[1].toUpperCase();
}
"accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height".split(" ").forEach(function(e) {
  var t = e.replace(
    Ku,
    qu
  );
  De[t] = new Ze(t, 1, !1, e, null, !1, !1);
});
"xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type".split(" ").forEach(function(e) {
  var t = e.replace(Ku, qu);
  De[t] = new Ze(t, 1, !1, e, "http://www.w3.org/1999/xlink", !1, !1);
});
["xml:base", "xml:lang", "xml:space"].forEach(function(e) {
  var t = e.replace(Ku, qu);
  De[t] = new Ze(t, 1, !1, e, "http://www.w3.org/XML/1998/namespace", !1, !1);
});
["tabIndex", "crossOrigin"].forEach(function(e) {
  De[e] = new Ze(e, 1, !1, e.toLowerCase(), null, !1, !1);
});
De.xlinkHref = new Ze("xlinkHref", 1, !1, "xlink:href", "http://www.w3.org/1999/xlink", !0, !1);
["src", "href", "action", "formAction"].forEach(function(e) {
  De[e] = new Ze(e, 1, !1, e.toLowerCase(), null, !0, !0);
});
function ec(e, t, n, r) {
  var i = De.hasOwnProperty(t) ? De[t] : null;
  (i !== null ? i.type !== 0 : r || !(2 < t.length) || t[0] !== "o" && t[0] !== "O" || t[1] !== "n" && t[1] !== "N") && (S4(t, n, i, r) && (n = null), r || i === null ? _4(t) && (n === null ? e.removeAttribute(t) : e.setAttribute(t, "" + n)) : i.mustUseProperty ? e[i.propertyName] = n === null ? i.type === 3 ? !1 : "" : n : (t = i.attributeName, r = i.attributeNamespace, n === null ? e.removeAttribute(t) : (i = i.type, n = i === 3 || i === 4 && n === !0 ? "" : "" + n, r ? e.setAttributeNS(r, t, n) : e.setAttribute(t, n))));
}
var un = y4.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED, Ia = Symbol.for("react.element"), yr = Symbol.for("react.portal"), wr = Symbol.for("react.fragment"), tc = Symbol.for("react.strict_mode"), Ol = Symbol.for("react.profiler"), Sx = Symbol.for("react.provider"), Cx = Symbol.for("react.context"), nc = Symbol.for("react.forward_ref"), Hl = Symbol.for("react.suspense"), Al = Symbol.for("react.suspense_list"), rc = Symbol.for("react.memo"), fn = Symbol.for("react.lazy"), bx = Symbol.for("react.offscreen"), I0 = Symbol.iterator;
function si(e) {
  return e === null || typeof e != "object" ? null : (e = I0 && e[I0] || e["@@iterator"], typeof e == "function" ? e : null);
}
var ve = Object.assign, Us;
function vi(e) {
  if (Us === void 0) try {
    throw Error();
  } catch (n) {
    var t = n.stack.trim().match(/\n( *(at )?)/);
    Us = t && t[1] || "";
  }
  return `
` + Us + e;
}
var $s = !1;
function Zs(e, t) {
  if (!e || $s) return "";
  $s = !0;
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
    $s = !1, Error.prepareStackTrace = n;
  }
  return (e = e ? e.displayName || e.name : "") ? vi(e) : "";
}
function C4(e) {
  switch (e.tag) {
    case 5:
      return vi(e.type);
    case 16:
      return vi("Lazy");
    case 13:
      return vi("Suspense");
    case 19:
      return vi("SuspenseList");
    case 0:
    case 2:
    case 15:
      return e = Zs(e.type, !1), e;
    case 11:
      return e = Zs(e.type.render, !1), e;
    case 1:
      return e = Zs(e.type, !0), e;
    default:
      return "";
  }
}
function jl(e) {
  if (e == null) return null;
  if (typeof e == "function") return e.displayName || e.name || null;
  if (typeof e == "string") return e;
  switch (e) {
    case wr:
      return "Fragment";
    case yr:
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
    case Cx:
      return (e.displayName || "Context") + ".Consumer";
    case Sx:
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
function b4(e) {
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
function Dn(e) {
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
function Ex(e) {
  var t = e.type;
  return (e = e.nodeName) && e.toLowerCase() === "input" && (t === "checkbox" || t === "radio");
}
function E4(e) {
  var t = Ex(e) ? "checked" : "value", n = Object.getOwnPropertyDescriptor(e.constructor.prototype, t), r = "" + e[t];
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
  e._valueTracker || (e._valueTracker = E4(e));
}
function Tx(e) {
  if (!e) return !1;
  var t = e._valueTracker;
  if (!t) return !0;
  var n = t.getValue(), r = "";
  return e && (r = Ex(e) ? e.checked ? "true" : "false" : e.value), e = r, e !== n ? (t.setValue(e), !0) : !1;
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
  n = Dn(t.value != null ? t.value : n), e._wrapperState = { initialChecked: r, initialValue: n, controlled: t.type === "checkbox" || t.type === "radio" ? t.checked != null : t.value != null };
}
function Px(e, t) {
  t = t.checked, t != null && ec(e, "checked", t, !1);
}
function zl(e, t) {
  Px(e, t);
  var n = Dn(t.value), r = t.type;
  if (n != null) r === "number" ? (n === 0 && e.value === "" || e.value != n) && (e.value = "" + n) : e.value !== "" + n && (e.value = "" + n);
  else if (r === "submit" || r === "reset") {
    e.removeAttribute("value");
    return;
  }
  t.hasOwnProperty("value") ? Wl(e, t.type, n) : t.hasOwnProperty("defaultValue") && Wl(e, t.type, Dn(t.defaultValue)), t.checked == null && t.defaultChecked != null && (e.defaultChecked = !!t.defaultChecked);
}
function D0(e, t, n) {
  if (t.hasOwnProperty("value") || t.hasOwnProperty("defaultValue")) {
    var r = t.type;
    if (!(r !== "submit" && r !== "reset" || t.value !== void 0 && t.value !== null)) return;
    t = "" + e._wrapperState.initialValue, n || t === e.value || (e.value = t), e.defaultValue = t;
  }
  n = e.name, n !== "" && (e.name = ""), e.defaultChecked = !!e._wrapperState.initialChecked, n !== "" && (e.name = n);
}
function Wl(e, t, n) {
  (t !== "number" || Po(e.ownerDocument) !== e) && (n == null ? e.defaultValue = "" + e._wrapperState.initialValue : e.defaultValue !== "" + n && (e.defaultValue = "" + n));
}
var gi = Array.isArray;
function Dr(e, t, n, r) {
  if (e = e.options, t) {
    t = {};
    for (var i = 0; i < n.length; i++) t["$" + n[i]] = !0;
    for (n = 0; n < e.length; n++) i = t.hasOwnProperty("$" + e[n].value), e[n].selected !== i && (e[n].selected = i), i && r && (e[n].defaultSelected = !0);
  } else {
    for (n = "" + Dn(n), t = null, i = 0; i < e.length; i++) {
      if (e[i].value === n) {
        e[i].selected = !0, r && (e[i].defaultSelected = !0);
        return;
      }
      t !== null || e[i].disabled || (t = e[i]);
    }
    t !== null && (t.selected = !0);
  }
}
function Vl(e, t) {
  if (t.dangerouslySetInnerHTML != null) throw Error(b(91));
  return ve({}, t, { value: void 0, defaultValue: void 0, children: "" + e._wrapperState.initialValue });
}
function M0(e, t) {
  var n = t.value;
  if (n == null) {
    if (n = t.children, t = t.defaultValue, n != null) {
      if (t != null) throw Error(b(92));
      if (gi(n)) {
        if (1 < n.length) throw Error(b(93));
        n = n[0];
      }
      t = n;
    }
    t == null && (t = ""), n = t;
  }
  e._wrapperState = { initialValue: Dn(n) };
}
function Nx(e, t) {
  var n = Dn(t.value), r = Dn(t.defaultValue);
  n != null && (n = "" + n, n !== e.value && (e.value = n), t.defaultValue == null && e.defaultValue !== n && (e.defaultValue = n)), r != null && (e.defaultValue = "" + r);
}
function O0(e) {
  var t = e.textContent;
  t === e._wrapperState.initialValue && t !== "" && t !== null && (e.value = t);
}
function Lx(e) {
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
  return e == null || e === "http://www.w3.org/1999/xhtml" ? Lx(t) : e === "http://www.w3.org/2000/svg" && t === "foreignObject" ? "http://www.w3.org/1999/xhtml" : e;
}
var Da, Ix = function(e) {
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
var Si = {
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
}, T4 = ["Webkit", "ms", "Moz", "O"];
Object.keys(Si).forEach(function(e) {
  T4.forEach(function(t) {
    t = t + e.charAt(0).toUpperCase() + e.substring(1), Si[t] = Si[e];
  });
});
function Rx(e, t, n) {
  return t == null || typeof t == "boolean" || t === "" ? "" : n || typeof t != "number" || t === 0 || Si.hasOwnProperty(e) && Si[e] ? ("" + t).trim() : t + "px";
}
function Dx(e, t) {
  e = e.style;
  for (var n in t) if (t.hasOwnProperty(n)) {
    var r = n.indexOf("--") === 0, i = Rx(n, t[n], r);
    n === "float" && (n = "cssFloat"), r ? e.setProperty(n, i) : e[n] = i;
  }
}
var P4 = ve({ menuitem: !0 }, { area: !0, base: !0, br: !0, col: !0, embed: !0, hr: !0, img: !0, input: !0, keygen: !0, link: !0, meta: !0, param: !0, source: !0, track: !0, wbr: !0 });
function Ul(e, t) {
  if (t) {
    if (P4[e] && (t.children != null || t.dangerouslySetInnerHTML != null)) throw Error(b(137, e));
    if (t.dangerouslySetInnerHTML != null) {
      if (t.children != null) throw Error(b(60));
      if (typeof t.dangerouslySetInnerHTML != "object" || !("__html" in t.dangerouslySetInnerHTML)) throw Error(b(61));
    }
    if (t.style != null && typeof t.style != "object") throw Error(b(62));
  }
}
function $l(e, t) {
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
var Zl = null;
function ic(e) {
  return e = e.target || e.srcElement || window, e.correspondingUseElement && (e = e.correspondingUseElement), e.nodeType === 3 ? e.parentNode : e;
}
var Gl = null, Mr = null, Or = null;
function H0(e) {
  if (e = Sa(e)) {
    if (typeof Gl != "function") throw Error(b(280));
    var t = e.stateNode;
    t && (t = Ss(t), Gl(e.stateNode, e.type, t));
  }
}
function Mx(e) {
  Mr ? Or ? Or.push(e) : Or = [e] : Mr = e;
}
function Ox() {
  if (Mr) {
    var e = Mr, t = Or;
    if (Or = Mr = null, H0(e), t) for (e = 0; e < t.length; e++) H0(t[e]);
  }
}
function Hx(e, t) {
  return e(t);
}
function Ax() {
}
var Gs = !1;
function jx(e, t, n) {
  if (Gs) return e(t, n);
  Gs = !0;
  try {
    return Hx(e, t, n);
  } finally {
    Gs = !1, (Mr !== null || Or !== null) && (Ax(), Ox());
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
  var li = {};
  Object.defineProperty(li, "passive", { get: function() {
    Yl = !0;
  } }), window.addEventListener("test", li, li), window.removeEventListener("test", li, li);
} catch {
  Yl = !1;
}
function N4(e, t, n, r, i, a, o, s, l) {
  var c = Array.prototype.slice.call(arguments, 3);
  try {
    t.apply(n, c);
  } catch (d) {
    this.onError(d);
  }
}
var Ci = !1, No = null, Lo = !1, Xl = null, L4 = { onError: function(e) {
  Ci = !0, No = e;
} };
function I4(e, t, n, r, i, a, o, s, l) {
  Ci = !1, No = null, N4.apply(L4, arguments);
}
function R4(e, t, n, r, i, a, o, s, l) {
  if (I4.apply(this, arguments), Ci) {
    if (Ci) {
      var c = No;
      Ci = !1, No = null;
    } else throw Error(b(198));
    Lo || (Lo = !0, Xl = c);
  }
}
function lr(e) {
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
function Fx(e) {
  if (e.tag === 13) {
    var t = e.memoizedState;
    if (t === null && (e = e.alternate, e !== null && (t = e.memoizedState)), t !== null) return t.dehydrated;
  }
  return null;
}
function A0(e) {
  if (lr(e) !== e) throw Error(b(188));
}
function D4(e) {
  var t = e.alternate;
  if (!t) {
    if (t = lr(e), t === null) throw Error(b(188));
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
function zx(e) {
  return e = D4(e), e !== null ? Wx(e) : null;
}
function Wx(e) {
  if (e.tag === 5 || e.tag === 6) return e;
  for (e = e.child; e !== null; ) {
    var t = Wx(e);
    if (t !== null) return t;
    e = e.sibling;
  }
  return null;
}
var Vx = ut.unstable_scheduleCallback, j0 = ut.unstable_cancelCallback, M4 = ut.unstable_shouldYield, O4 = ut.unstable_requestPaint, we = ut.unstable_now, H4 = ut.unstable_getCurrentPriorityLevel, ac = ut.unstable_ImmediatePriority, Bx = ut.unstable_UserBlockingPriority, Io = ut.unstable_NormalPriority, A4 = ut.unstable_LowPriority, Ux = ut.unstable_IdlePriority, ys = null, Ut = null;
function j4(e) {
  if (Ut && typeof Ut.onCommitFiberRoot == "function") try {
    Ut.onCommitFiberRoot(ys, e, void 0, (e.current.flags & 128) === 128);
  } catch {
  }
}
var Lt = Math.clz32 ? Math.clz32 : W4, F4 = Math.log, z4 = Math.LN2;
function W4(e) {
  return e >>>= 0, e === 0 ? 32 : 31 - (F4(e) / z4 | 0) | 0;
}
var Ma = 64, Oa = 4194304;
function yi(e) {
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
    s !== 0 ? r = yi(s) : (a &= o, a !== 0 && (r = yi(a)));
  } else o = n & ~i, o !== 0 ? r = yi(o) : a !== 0 && (r = yi(a));
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
function B4(e, t) {
  for (var n = e.suspendedLanes, r = e.pingedLanes, i = e.expirationTimes, a = e.pendingLanes; 0 < a; ) {
    var o = 31 - Lt(a), s = 1 << o, l = i[o];
    l === -1 ? (!(s & n) || s & r) && (i[o] = V4(s, t)) : l <= t && (e.expiredLanes |= s), a &= ~s;
  }
}
function Ql(e) {
  return e = e.pendingLanes & -1073741825, e !== 0 ? e : e & 1073741824 ? 1073741824 : 0;
}
function $x() {
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
function U4(e, t) {
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
var Gx, sc, Yx, Xx, Qx, Jl = !1, Ha = [], _n = null, kn = null, Sn = null, ta = /* @__PURE__ */ new Map(), na = /* @__PURE__ */ new Map(), hn = [], $4 = "mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit".split(" ");
function F0(e, t) {
  switch (e) {
    case "focusin":
    case "focusout":
      _n = null;
      break;
    case "dragenter":
    case "dragleave":
      kn = null;
      break;
    case "mouseover":
    case "mouseout":
      Sn = null;
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
function ui(e, t, n, r, i, a) {
  return e === null || e.nativeEvent !== a ? (e = { blockedOn: t, domEventName: n, eventSystemFlags: r, nativeEvent: a, targetContainers: [i] }, t !== null && (t = Sa(t), t !== null && sc(t)), e) : (e.eventSystemFlags |= r, t = e.targetContainers, i !== null && t.indexOf(i) === -1 && t.push(i), e);
}
function Z4(e, t, n, r, i) {
  switch (t) {
    case "focusin":
      return _n = ui(_n, e, t, n, r, i), !0;
    case "dragenter":
      return kn = ui(kn, e, t, n, r, i), !0;
    case "mouseover":
      return Sn = ui(Sn, e, t, n, r, i), !0;
    case "pointerover":
      var a = i.pointerId;
      return ta.set(a, ui(ta.get(a) || null, e, t, n, r, i)), !0;
    case "gotpointercapture":
      return a = i.pointerId, na.set(a, ui(na.get(a) || null, e, t, n, r, i)), !0;
  }
  return !1;
}
function Jx(e) {
  var t = Zn(e.target);
  if (t !== null) {
    var n = lr(t);
    if (n !== null) {
      if (t = n.tag, t === 13) {
        if (t = Fx(n), t !== null) {
          e.blockedOn = t, Qx(e.priority, function() {
            Yx(n);
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
      Zl = r, n.target.dispatchEvent(r), Zl = null;
    } else return t = Sa(n), t !== null && sc(t), e.blockedOn = n, !1;
    t.shift();
  }
  return !0;
}
function z0(e, t, n) {
  eo(e) && n.delete(t);
}
function G4() {
  Jl = !1, _n !== null && eo(_n) && (_n = null), kn !== null && eo(kn) && (kn = null), Sn !== null && eo(Sn) && (Sn = null), ta.forEach(z0), na.forEach(z0);
}
function ci(e, t) {
  e.blockedOn === t && (e.blockedOn = null, Jl || (Jl = !0, ut.unstable_scheduleCallback(ut.unstable_NormalPriority, G4)));
}
function ra(e) {
  function t(i) {
    return ci(i, e);
  }
  if (0 < Ha.length) {
    ci(Ha[0], e);
    for (var n = 1; n < Ha.length; n++) {
      var r = Ha[n];
      r.blockedOn === e && (r.blockedOn = null);
    }
  }
  for (_n !== null && ci(_n, e), kn !== null && ci(kn, e), Sn !== null && ci(Sn, e), ta.forEach(t), na.forEach(t), n = 0; n < hn.length; n++) r = hn[n], r.blockedOn === e && (r.blockedOn = null);
  for (; 0 < hn.length && (n = hn[0], n.blockedOn === null); ) Jx(n), n.blockedOn === null && hn.shift();
}
var Hr = un.ReactCurrentBatchConfig, Do = !0;
function Y4(e, t, n, r) {
  var i = re, a = Hr.transition;
  Hr.transition = null;
  try {
    re = 1, lc(e, t, n, r);
  } finally {
    re = i, Hr.transition = a;
  }
}
function X4(e, t, n, r) {
  var i = re, a = Hr.transition;
  Hr.transition = null;
  try {
    re = 4, lc(e, t, n, r);
  } finally {
    re = i, Hr.transition = a;
  }
}
function lc(e, t, n, r) {
  if (Do) {
    var i = Kl(e, t, n, r);
    if (i === null) il(e, t, r, Mo, n), F0(e, r);
    else if (Z4(i, e, t, n, r)) r.stopPropagation();
    else if (F0(e, r), t & 4 && -1 < $4.indexOf(e)) {
      for (; i !== null; ) {
        var a = Sa(i);
        if (a !== null && Gx(a), a = Kl(e, t, n, r), a === null && il(e, t, r, Mo, n), a === i) break;
        i = a;
      }
      i !== null && r.stopPropagation();
    } else il(e, t, r, null, n);
  }
}
var Mo = null;
function Kl(e, t, n, r) {
  if (Mo = null, e = ic(r), e = Zn(e), e !== null) if (t = lr(e), t === null) e = null;
  else if (n = t.tag, n === 13) {
    if (e = Fx(t), e !== null) return e;
    e = null;
  } else if (n === 3) {
    if (t.stateNode.current.memoizedState.isDehydrated) return t.tag === 3 ? t.stateNode.containerInfo : null;
    e = null;
  } else t !== e && (e = null);
  return Mo = e, null;
}
function Kx(e) {
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
      switch (H4()) {
        case ac:
          return 1;
        case Bx:
          return 4;
        case Io:
        case A4:
          return 16;
        case Ux:
          return 536870912;
        default:
          return 16;
      }
    default:
      return 16;
  }
}
var yn = null, uc = null, to = null;
function qx() {
  if (to) return to;
  var e, t = uc, n = t.length, r, i = "value" in yn ? yn.value : yn.textContent, a = i.length;
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
function W0() {
  return !1;
}
function ft(e) {
  function t(n, r, i, a, o) {
    this._reactName = n, this._targetInst = i, this.type = r, this.nativeEvent = a, this.target = o, this.currentTarget = null;
    for (var s in e) e.hasOwnProperty(s) && (n = e[s], this[s] = n ? n(a) : a[s]);
    return this.isDefaultPrevented = (a.defaultPrevented != null ? a.defaultPrevented : a.returnValue === !1) ? Aa : W0, this.isPropagationStopped = W0, this;
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
var ei = { eventPhase: 0, bubbles: 0, cancelable: 0, timeStamp: function(e) {
  return e.timeStamp || Date.now();
}, defaultPrevented: 0, isTrusted: 0 }, cc = ft(ei), ka = ve({}, ei, { view: 0, detail: 0 }), Q4 = ft(ka), Xs, Qs, di, ws = ve({}, ka, { screenX: 0, screenY: 0, clientX: 0, clientY: 0, pageX: 0, pageY: 0, ctrlKey: 0, shiftKey: 0, altKey: 0, metaKey: 0, getModifierState: dc, button: 0, buttons: 0, relatedTarget: function(e) {
  return e.relatedTarget === void 0 ? e.fromElement === e.srcElement ? e.toElement : e.fromElement : e.relatedTarget;
}, movementX: function(e) {
  return "movementX" in e ? e.movementX : (e !== di && (di && e.type === "mousemove" ? (Xs = e.screenX - di.screenX, Qs = e.screenY - di.screenY) : Qs = Xs = 0, di = e), Xs);
}, movementY: function(e) {
  return "movementY" in e ? e.movementY : Qs;
} }), V0 = ft(ws), J4 = ve({}, ws, { dataTransfer: 0 }), K4 = ft(J4), q4 = ve({}, ka, { relatedTarget: 0 }), Js = ft(q4), e3 = ve({}, ei, { animationName: 0, elapsedTime: 0, pseudoElement: 0 }), t3 = ft(e3), n3 = ve({}, ei, { clipboardData: function(e) {
  return "clipboardData" in e ? e.clipboardData : window.clipboardData;
} }), r3 = ft(n3), i3 = ve({}, ei, { data: 0 }), B0 = ft(i3), a3 = {
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
}, o3 = {
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
}, s3 = { Alt: "altKey", Control: "ctrlKey", Meta: "metaKey", Shift: "shiftKey" };
function l3(e) {
  var t = this.nativeEvent;
  return t.getModifierState ? t.getModifierState(e) : (e = s3[e]) ? !!t[e] : !1;
}
function dc() {
  return l3;
}
var u3 = ve({}, ka, { key: function(e) {
  if (e.key) {
    var t = a3[e.key] || e.key;
    if (t !== "Unidentified") return t;
  }
  return e.type === "keypress" ? (e = no(e), e === 13 ? "Enter" : String.fromCharCode(e)) : e.type === "keydown" || e.type === "keyup" ? o3[e.keyCode] || "Unidentified" : "";
}, code: 0, location: 0, ctrlKey: 0, shiftKey: 0, altKey: 0, metaKey: 0, repeat: 0, locale: 0, getModifierState: dc, charCode: function(e) {
  return e.type === "keypress" ? no(e) : 0;
}, keyCode: function(e) {
  return e.type === "keydown" || e.type === "keyup" ? e.keyCode : 0;
}, which: function(e) {
  return e.type === "keypress" ? no(e) : e.type === "keydown" || e.type === "keyup" ? e.keyCode : 0;
} }), c3 = ft(u3), d3 = ve({}, ws, { pointerId: 0, width: 0, height: 0, pressure: 0, tangentialPressure: 0, tiltX: 0, tiltY: 0, twist: 0, pointerType: 0, isPrimary: 0 }), U0 = ft(d3), f3 = ve({}, ka, { touches: 0, targetTouches: 0, changedTouches: 0, altKey: 0, metaKey: 0, ctrlKey: 0, shiftKey: 0, getModifierState: dc }), x3 = ft(f3), p3 = ve({}, ei, { propertyName: 0, elapsedTime: 0, pseudoElement: 0 }), h3 = ft(p3), m3 = ve({}, ws, {
  deltaX: function(e) {
    return "deltaX" in e ? e.deltaX : "wheelDeltaX" in e ? -e.wheelDeltaX : 0;
  },
  deltaY: function(e) {
    return "deltaY" in e ? e.deltaY : "wheelDeltaY" in e ? -e.wheelDeltaY : "wheelDelta" in e ? -e.wheelDelta : 0;
  },
  deltaZ: 0,
  deltaMode: 0
}), v3 = ft(m3), g3 = [9, 13, 27, 32], fc = an && "CompositionEvent" in window, bi = null;
an && "documentMode" in document && (bi = document.documentMode);
var y3 = an && "TextEvent" in window && !bi, ep = an && (!fc || bi && 8 < bi && 11 >= bi), $0 = " ", Z0 = !1;
function tp(e, t) {
  switch (e) {
    case "keyup":
      return g3.indexOf(t.keyCode) !== -1;
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
function np(e) {
  return e = e.detail, typeof e == "object" && "data" in e ? e.data : null;
}
var _r = !1;
function w3(e, t) {
  switch (e) {
    case "compositionend":
      return np(t);
    case "keypress":
      return t.which !== 32 ? null : (Z0 = !0, $0);
    case "textInput":
      return e = t.data, e === $0 && Z0 ? null : e;
    default:
      return null;
  }
}
function _3(e, t) {
  if (_r) return e === "compositionend" || !fc && tp(e, t) ? (e = qx(), to = uc = yn = null, _r = !1, e) : null;
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
      return ep && t.locale !== "ko" ? null : t.data;
    default:
      return null;
  }
}
var k3 = { color: !0, date: !0, datetime: !0, "datetime-local": !0, email: !0, month: !0, number: !0, password: !0, range: !0, search: !0, tel: !0, text: !0, time: !0, url: !0, week: !0 };
function G0(e) {
  var t = e && e.nodeName && e.nodeName.toLowerCase();
  return t === "input" ? !!k3[e.type] : t === "textarea";
}
function rp(e, t, n, r) {
  Mx(r), t = Oo(t, "onChange"), 0 < t.length && (n = new cc("onChange", "change", null, n, r), e.push({ event: n, listeners: t }));
}
var Ei = null, ia = null;
function S3(e) {
  pp(e, 0);
}
function _s(e) {
  var t = Cr(e);
  if (Tx(t)) return e;
}
function C3(e, t) {
  if (e === "change") return t;
}
var ip = !1;
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
  ip = Ks && (!document.documentMode || 9 < document.documentMode);
}
function X0() {
  Ei && (Ei.detachEvent("onpropertychange", ap), ia = Ei = null);
}
function ap(e) {
  if (e.propertyName === "value" && _s(ia)) {
    var t = [];
    rp(t, ia, e, ic(e)), jx(S3, t);
  }
}
function b3(e, t, n) {
  e === "focusin" ? (X0(), Ei = t, ia = n, Ei.attachEvent("onpropertychange", ap)) : e === "focusout" && X0();
}
function E3(e) {
  if (e === "selectionchange" || e === "keyup" || e === "keydown") return _s(ia);
}
function T3(e, t) {
  if (e === "click") return _s(t);
}
function P3(e, t) {
  if (e === "input" || e === "change") return _s(t);
}
function N3(e, t) {
  return e === t && (e !== 0 || 1 / e === 1 / t) || e !== e && t !== t;
}
var Dt = typeof Object.is == "function" ? Object.is : N3;
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
function op(e, t) {
  return e && t ? e === t ? !0 : e && e.nodeType === 3 ? !1 : t && t.nodeType === 3 ? op(e, t.parentNode) : "contains" in e ? e.contains(t) : e.compareDocumentPosition ? !!(e.compareDocumentPosition(t) & 16) : !1 : !1;
}
function sp() {
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
function L3(e) {
  var t = sp(), n = e.focusedElem, r = e.selectionRange;
  if (t !== n && n && n.ownerDocument && op(n.ownerDocument.documentElement, n)) {
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
var I3 = an && "documentMode" in document && 11 >= document.documentMode, kr = null, ql = null, Ti = null, eu = !1;
function K0(e, t, n) {
  var r = n.window === n ? n.document : n.nodeType === 9 ? n : n.ownerDocument;
  eu || kr == null || kr !== Po(r) || (r = kr, "selectionStart" in r && xc(r) ? r = { start: r.selectionStart, end: r.selectionEnd } : (r = (r.ownerDocument && r.ownerDocument.defaultView || window).getSelection(), r = { anchorNode: r.anchorNode, anchorOffset: r.anchorOffset, focusNode: r.focusNode, focusOffset: r.focusOffset }), Ti && aa(Ti, r) || (Ti = r, r = Oo(ql, "onSelect"), 0 < r.length && (t = new cc("onSelect", "select", null, t, n), e.push({ event: t, listeners: r }), t.target = kr)));
}
function ja(e, t) {
  var n = {};
  return n[e.toLowerCase()] = t.toLowerCase(), n["Webkit" + e] = "webkit" + t, n["Moz" + e] = "moz" + t, n;
}
var Sr = { animationend: ja("Animation", "AnimationEnd"), animationiteration: ja("Animation", "AnimationIteration"), animationstart: ja("Animation", "AnimationStart"), transitionend: ja("Transition", "TransitionEnd") }, el = {}, lp = {};
an && (lp = document.createElement("div").style, "AnimationEvent" in window || (delete Sr.animationend.animation, delete Sr.animationiteration.animation, delete Sr.animationstart.animation), "TransitionEvent" in window || delete Sr.transitionend.transition);
function ks(e) {
  if (el[e]) return el[e];
  if (!Sr[e]) return e;
  var t = Sr[e], n;
  for (n in t) if (t.hasOwnProperty(n) && n in lp) return el[e] = t[n];
  return e;
}
var up = ks("animationend"), cp = ks("animationiteration"), dp = ks("animationstart"), fp = ks("transitionend"), xp = /* @__PURE__ */ new Map(), q0 = "abort auxClick cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");
function Hn(e, t) {
  xp.set(e, t), sr(t, [e]);
}
for (var tl = 0; tl < q0.length; tl++) {
  var nl = q0[tl], R3 = nl.toLowerCase(), D3 = nl[0].toUpperCase() + nl.slice(1);
  Hn(R3, "on" + D3);
}
Hn(up, "onAnimationEnd");
Hn(cp, "onAnimationIteration");
Hn(dp, "onAnimationStart");
Hn("dblclick", "onDoubleClick");
Hn("focusin", "onFocus");
Hn("focusout", "onBlur");
Hn(fp, "onTransitionEnd");
$r("onMouseEnter", ["mouseout", "mouseover"]);
$r("onMouseLeave", ["mouseout", "mouseover"]);
$r("onPointerEnter", ["pointerout", "pointerover"]);
$r("onPointerLeave", ["pointerout", "pointerover"]);
sr("onChange", "change click focusin focusout input keydown keyup selectionchange".split(" "));
sr("onSelect", "focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" "));
sr("onBeforeInput", ["compositionend", "keypress", "textInput", "paste"]);
sr("onCompositionEnd", "compositionend focusout keydown keypress keyup mousedown".split(" "));
sr("onCompositionStart", "compositionstart focusout keydown keypress keyup mousedown".split(" "));
sr("onCompositionUpdate", "compositionupdate focusout keydown keypress keyup mousedown".split(" "));
var wi = "abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" "), M3 = new Set("cancel close invalid load scroll toggle".split(" ").concat(wi));
function ed(e, t, n) {
  var r = e.type || "unknown-event";
  e.currentTarget = n, R4(r, t, void 0, e), e.currentTarget = null;
}
function pp(e, t) {
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
  n.has(r) || (hp(t, e, 2, !1), n.add(r));
}
function rl(e, t, n) {
  var r = 0;
  t && (r |= 4), hp(n, e, r, t);
}
var Fa = "_reactListening" + Math.random().toString(36).slice(2);
function oa(e) {
  if (!e[Fa]) {
    e[Fa] = !0, kx.forEach(function(n) {
      n !== "selectionchange" && (M3.has(n) || rl(n, !1, e), rl(n, !0, e));
    });
    var t = e.nodeType === 9 ? e : e.ownerDocument;
    t === null || t[Fa] || (t[Fa] = !0, rl("selectionchange", !1, t));
  }
}
function hp(e, t, n, r) {
  switch (Kx(t)) {
    case 1:
      var i = Y4;
      break;
    case 4:
      i = X4;
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
  jx(function() {
    var c = a, d = ic(n), f = [];
    e: {
      var m = xp.get(e);
      if (m !== void 0) {
        var w = cc, y = e;
        switch (e) {
          case "keypress":
            if (no(n) === 0) break e;
          case "keydown":
          case "keyup":
            w = c3;
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
            w = V0;
            break;
          case "drag":
          case "dragend":
          case "dragenter":
          case "dragexit":
          case "dragleave":
          case "dragover":
          case "dragstart":
          case "drop":
            w = K4;
            break;
          case "touchcancel":
          case "touchend":
          case "touchmove":
          case "touchstart":
            w = x3;
            break;
          case up:
          case cp:
          case dp:
            w = t3;
            break;
          case fp:
            w = h3;
            break;
          case "scroll":
            w = Q4;
            break;
          case "wheel":
            w = v3;
            break;
          case "copy":
          case "cut":
          case "paste":
            w = r3;
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
        if (m = e === "mouseover" || e === "pointerover", w = e === "mouseout" || e === "pointerout", m && n !== Zl && (y = n.relatedTarget || n.fromElement) && (Zn(y) || y[on])) break e;
        if ((w || m) && (m = d.window === d ? d : (m = d.ownerDocument) ? m.defaultView || m.parentWindow : window, w ? (y = n.relatedTarget || n.toElement, w = c, y = y ? Zn(y) : null, y !== null && (_ = lr(y), y !== _ || y.tag !== 5 && y.tag !== 6) && (y = null)) : (w = null, y = c), w !== y)) {
          if (x = V0, g = "onMouseLeave", u = "onMouseEnter", p = "mouse", (e === "pointerout" || e === "pointerover") && (x = U0, g = "onPointerLeave", u = "onPointerEnter", p = "pointer"), _ = w == null ? m : Cr(w), h = y == null ? m : Cr(y), m = new x(g, p + "leave", w, n, d), m.target = _, m.relatedTarget = h, g = null, Zn(d) === c && (x = new x(u, p + "enter", y, n, d), x.target = h, x.relatedTarget = _, g = x), _ = g, w && y) t: {
            for (x = w, u = y, p = 0, h = x; h; h = pr(h)) p++;
            for (h = 0, g = u; g; g = pr(g)) h++;
            for (; 0 < p - h; ) x = pr(x), p--;
            for (; 0 < h - p; ) u = pr(u), h--;
            for (; p--; ) {
              if (x === u || u !== null && x === u.alternate) break t;
              x = pr(x), u = pr(u);
            }
            x = null;
          }
          else x = null;
          w !== null && td(f, m, w, x, !1), y !== null && _ !== null && td(f, _, y, x, !0);
        }
      }
      e: {
        if (m = c ? Cr(c) : window, w = m.nodeName && m.nodeName.toLowerCase(), w === "select" || w === "input" && m.type === "file") var k = C3;
        else if (G0(m)) if (ip) k = P3;
        else {
          k = E3;
          var C = b3;
        }
        else (w = m.nodeName) && w.toLowerCase() === "input" && (m.type === "checkbox" || m.type === "radio") && (k = T3);
        if (k && (k = k(e, c))) {
          rp(f, k, n, d);
          break e;
        }
        C && C(e, m, c), e === "focusout" && (C = m._wrapperState) && C.controlled && m.type === "number" && Wl(m, "number", m.value);
      }
      switch (C = c ? Cr(c) : window, e) {
        case "focusin":
          (G0(C) || C.contentEditable === "true") && (kr = C, ql = c, Ti = null);
          break;
        case "focusout":
          Ti = ql = kr = null;
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
          if (I3) break;
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
      else _r ? tp(e, n) && (L = "onCompositionEnd") : e === "keydown" && n.keyCode === 229 && (L = "onCompositionStart");
      L && (ep && n.locale !== "ko" && (_r || L !== "onCompositionStart" ? L === "onCompositionEnd" && _r && (S = qx()) : (yn = d, uc = "value" in yn ? yn.value : yn.textContent, _r = !0)), C = Oo(c, L), 0 < C.length && (L = new B0(L, e, null, n, d), f.push({ event: L, listeners: C }), S ? L.data = S : (S = np(n), S !== null && (L.data = S)))), (S = y3 ? w3(e, n) : _3(e, n)) && (c = Oo(c, "onBeforeInput"), 0 < c.length && (d = new B0("onBeforeInput", "beforeinput", null, n, d), f.push({ event: d, listeners: c }), d.data = S));
    }
    pp(f, t);
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
function pr(e) {
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
var O3 = /\r\n?/g, H3 = /\u0000|\uFFFD/g;
function nd(e) {
  return (typeof e == "string" ? e : "" + e).replace(O3, `
`).replace(H3, "");
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
var iu = typeof setTimeout == "function" ? setTimeout : void 0, A3 = typeof clearTimeout == "function" ? clearTimeout : void 0, rd = typeof Promise == "function" ? Promise : void 0, j3 = typeof queueMicrotask == "function" ? queueMicrotask : typeof rd < "u" ? function(e) {
  return rd.resolve(null).then(e).catch(F3);
} : iu;
function F3(e) {
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
function Cn(e) {
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
var ti = Math.random().toString(36).slice(2), zt = "__reactFiber$" + ti, la = "__reactProps$" + ti, on = "__reactContainer$" + ti, au = "__reactEvents$" + ti, z3 = "__reactListeners$" + ti, W3 = "__reactHandles$" + ti;
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
function Cr(e) {
  if (e.tag === 5 || e.tag === 6) return e.stateNode;
  throw Error(b(33));
}
function Ss(e) {
  return e[la] || null;
}
var ou = [], br = -1;
function An(e) {
  return { current: e };
}
function de(e) {
  0 > br || (e.current = ou[br], ou[br] = null, br--);
}
function oe(e, t) {
  br++, ou[br] = e.current, e.current = t;
}
var Mn = {}, ze = An(Mn), Xe = An(!1), tr = Mn;
function Zr(e, t) {
  var n = e.type.contextTypes;
  if (!n) return Mn;
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
  if (ze.current !== Mn) throw Error(b(168));
  oe(ze, t), oe(Xe, n);
}
function mp(e, t, n) {
  var r = e.stateNode;
  if (t = t.childContextTypes, typeof r.getChildContext != "function") return n;
  r = r.getChildContext();
  for (var i in r) if (!(i in t)) throw Error(b(108, b4(e) || "Unknown", i));
  return ve({}, n, r);
}
function jo(e) {
  return e = (e = e.stateNode) && e.__reactInternalMemoizedMergedChildContext || Mn, tr = ze.current, oe(ze, e), oe(Xe, Xe.current), !0;
}
function od(e, t, n) {
  var r = e.stateNode;
  if (!r) throw Error(b(169));
  n ? (e = mp(e, t, tr), r.__reactInternalMemoizedMergedChildContext = e, de(Xe), de(ze), oe(ze, e)) : de(Xe), oe(Xe, n);
}
var qt = null, Cs = !1, ol = !1;
function vp(e) {
  qt === null ? qt = [e] : qt.push(e);
}
function V3(e) {
  Cs = !0, vp(e);
}
function jn() {
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
      throw qt !== null && (qt = qt.slice(e + 1)), Vx(ac, jn), i;
    } finally {
      re = t, ol = !1;
    }
  }
  return null;
}
var Er = [], Tr = 0, Fo = null, zo = 0, mt = [], vt = 0, nr = null, en = 1, tn = "";
function Vn(e, t) {
  Er[Tr++] = zo, Er[Tr++] = Fo, Fo = e, zo = t;
}
function gp(e, t, n) {
  mt[vt++] = en, mt[vt++] = tn, mt[vt++] = nr, nr = e;
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
  e.return !== null && (Vn(e, 1), gp(e, 1, 0));
}
function hc(e) {
  for (; e === Fo; ) Fo = Er[--Tr], Er[Tr] = null, zo = Er[--Tr], Er[Tr] = null;
  for (; e === nr; ) nr = mt[--vt], mt[vt] = null, tn = mt[--vt], mt[vt] = null, en = mt[--vt], mt[vt] = null;
}
var lt = null, at = null, xe = !1, Tt = null;
function yp(e, t) {
  var n = gt(5, null, null, 0);
  n.elementType = "DELETED", n.stateNode = t, n.return = e, t = e.deletions, t === null ? (e.deletions = [n], e.flags |= 16) : t.push(n);
}
function sd(e, t) {
  switch (e.tag) {
    case 5:
      var n = e.type;
      return t = t.nodeType !== 1 || n.toLowerCase() !== t.nodeName.toLowerCase() ? null : t, t !== null ? (e.stateNode = t, lt = e, at = Cn(t.firstChild), !0) : !1;
    case 6:
      return t = e.pendingProps === "" || t.nodeType !== 3 ? null : t, t !== null ? (e.stateNode = t, lt = e, at = null, !0) : !1;
    case 13:
      return t = t.nodeType !== 8 ? null : t, t !== null ? (n = nr !== null ? { id: en, overflow: tn } : null, e.memoizedState = { dehydrated: t, treeContext: n, retryLane: 1073741824 }, n = gt(18, null, null, 0), n.stateNode = t, n.return = e, e.child = n, lt = e, at = null, !0) : !1;
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
        t = Cn(n.nextSibling);
        var r = lt;
        t && sd(e, t) ? yp(r, n) : (e.flags = e.flags & -4097 | 2, xe = !1, lt = e);
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
function Wa(e) {
  if (e !== lt) return !1;
  if (!xe) return ld(e), xe = !0, !1;
  var t;
  if ((t = e.tag !== 3) && !(t = e.tag !== 5) && (t = e.type, t = t !== "head" && t !== "body" && !ru(e.type, e.memoizedProps)), t && (t = at)) {
    if (su(e)) throw wp(), Error(b(418));
    for (; t; ) yp(e, t), t = Cn(t.nextSibling);
  }
  if (ld(e), e.tag === 13) {
    if (e = e.memoizedState, e = e !== null ? e.dehydrated : null, !e) throw Error(b(317));
    e: {
      for (e = e.nextSibling, t = 0; e; ) {
        if (e.nodeType === 8) {
          var n = e.data;
          if (n === "/$") {
            if (t === 0) {
              at = Cn(e.nextSibling);
              break e;
            }
            t--;
          } else n !== "$" && n !== "$!" && n !== "$?" || t++;
        }
        e = e.nextSibling;
      }
      at = null;
    }
  } else at = lt ? Cn(e.stateNode.nextSibling) : null;
  return !0;
}
function wp() {
  for (var e = at; e; ) e = Cn(e.nextSibling);
}
function Gr() {
  at = lt = null, xe = !1;
}
function mc(e) {
  Tt === null ? Tt = [e] : Tt.push(e);
}
var B3 = un.ReactCurrentBatchConfig;
function fi(e, t, n) {
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
function Va(e, t) {
  throw e = Object.prototype.toString.call(t), Error(b(31, e === "[object Object]" ? "object with keys {" + Object.keys(t).join(", ") + "}" : e));
}
function ud(e) {
  var t = e._init;
  return t(e._payload);
}
function _p(e) {
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
    return u = Pn(u, p), u.index = 0, u.sibling = null, u;
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
    return k === wr ? d(u, p, h.props.children, g, h.key) : p !== null && (p.elementType === k || typeof k == "object" && k !== null && k.$$typeof === fn && ud(k) === p.type) ? (g = i(p, h.props), g.ref = fi(u, p, h), g.return = u, g) : (g = uo(h.type, h.key, h.props, null, u.mode, g), g.ref = fi(u, p, h), g.return = u, g);
  }
  function c(u, p, h, g) {
    return p === null || p.tag !== 4 || p.stateNode.containerInfo !== h.containerInfo || p.stateNode.implementation !== h.implementation ? (p = pl(h, u.mode, g), p.return = u, p) : (p = i(p, h.children || []), p.return = u, p);
  }
  function d(u, p, h, g, k) {
    return p === null || p.tag !== 7 ? (p = Jn(h, u.mode, g, k), p.return = u, p) : (p = i(p, h), p.return = u, p);
  }
  function f(u, p, h) {
    if (typeof p == "string" && p !== "" || typeof p == "number") return p = xl("" + p, u.mode, h), p.return = u, p;
    if (typeof p == "object" && p !== null) {
      switch (p.$$typeof) {
        case Ia:
          return h = uo(p.type, p.key, p.props, null, u.mode, h), h.ref = fi(u, null, p), h.return = u, h;
        case yr:
          return p = pl(p, u.mode, h), p.return = u, p;
        case fn:
          var g = p._init;
          return f(u, g(p._payload), h);
      }
      if (gi(p) || si(p)) return p = Jn(p, u.mode, h, null), p.return = u, p;
      Va(u, p);
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
        case yr:
          return h.key === k ? c(u, p, h, g) : null;
        case fn:
          return k = h._init, m(
            u,
            p,
            k(h._payload),
            g
          );
      }
      if (gi(h) || si(h)) return k !== null ? null : d(u, p, h, g, null);
      Va(u, h);
    }
    return null;
  }
  function w(u, p, h, g, k) {
    if (typeof g == "string" && g !== "" || typeof g == "number") return u = u.get(h) || null, s(p, u, "" + g, k);
    if (typeof g == "object" && g !== null) {
      switch (g.$$typeof) {
        case Ia:
          return u = u.get(g.key === null ? h : g.key) || null, l(p, u, g, k);
        case yr:
          return u = u.get(g.key === null ? h : g.key) || null, c(p, u, g, k);
        case fn:
          var C = g._init;
          return w(u, p, h, C(g._payload), k);
      }
      if (gi(g) || si(g)) return u = u.get(h) || null, d(p, u, g, k, null);
      Va(p, g);
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
    var k = si(h);
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
    if (typeof h == "object" && h !== null && h.type === wr && h.key === null && (h = h.props.children), typeof h == "object" && h !== null) {
      switch (h.$$typeof) {
        case Ia:
          e: {
            for (var k = h.key, C = p; C !== null; ) {
              if (C.key === k) {
                if (k = h.type, k === wr) {
                  if (C.tag === 7) {
                    n(u, C.sibling), p = i(C, h.props.children), p.return = u, u = p;
                    break e;
                  }
                } else if (C.elementType === k || typeof k == "object" && k !== null && k.$$typeof === fn && ud(k) === C.type) {
                  n(u, C.sibling), p = i(C, h.props), p.ref = fi(u, C, h), p.return = u, u = p;
                  break e;
                }
                n(u, C);
                break;
              } else t(u, C);
              C = C.sibling;
            }
            h.type === wr ? (p = Jn(h.props.children, u.mode, g, h.key), p.return = u, u = p) : (g = uo(h.type, h.key, h.props, null, u.mode, g), g.ref = fi(u, p, h), g.return = u, u = g);
          }
          return o(u);
        case yr:
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
      if (gi(h)) return y(u, p, h, g);
      if (si(h)) return x(u, p, h, g);
      Va(u, h);
    }
    return typeof h == "string" && h !== "" || typeof h == "number" ? (h = "" + h, p !== null && p.tag === 6 ? (n(u, p.sibling), p = i(p, h), p.return = u, u = p) : (n(u, p), p = xl(h, u.mode, g), p.return = u, u = p), o(u)) : n(u, p);
  }
  return _;
}
var Yr = _p(!0), kp = _p(!1), Wo = An(null), Vo = null, Pr = null, vc = null;
function gc() {
  vc = Pr = Vo = null;
}
function yc(e) {
  var t = Wo.current;
  de(Wo), e._currentValue = t;
}
function uu(e, t, n) {
  for (; e !== null; ) {
    var r = e.alternate;
    if ((e.childLanes & t) !== t ? (e.childLanes |= t, r !== null && (r.childLanes |= t)) : r !== null && (r.childLanes & t) !== t && (r.childLanes |= t), e === n) break;
    e = e.return;
  }
}
function Ar(e, t) {
  Vo = e, vc = Pr = null, e = e.dependencies, e !== null && e.firstContext !== null && (e.lanes & t && (Ye = !0), e.firstContext = null);
}
function wt(e) {
  var t = e._currentValue;
  if (vc !== e) if (e = { context: e, memoizedValue: t, next: null }, Pr === null) {
    if (Vo === null) throw Error(b(308));
    Pr = e, Vo.dependencies = { lanes: 0, firstContext: e };
  } else Pr = Pr.next = e;
  return t;
}
var Gn = null;
function wc(e) {
  Gn === null ? Gn = [e] : Gn.push(e);
}
function Sp(e, t, n, r) {
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
function Cp(e, t) {
  e = e.updateQueue, t.updateQueue === e && (t.updateQueue = { baseState: e.baseState, firstBaseUpdate: e.firstBaseUpdate, lastBaseUpdate: e.lastBaseUpdate, shared: e.shared, effects: e.effects });
}
function nn(e, t) {
  return { eventTime: e, lane: t, tag: 0, payload: null, callback: null, next: null };
}
function bn(e, t, n) {
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
    ir |= o, e.lanes = o, e.memoizedState = f;
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
var Ca = {}, $t = An(Ca), ua = An(Ca), ca = An(Ca);
function Yn(e) {
  if (e === Ca) throw Error(b(174));
  return e;
}
function kc(e, t) {
  switch (oe(ca, t), oe(ua, e), oe($t, Ca), e = t.nodeType, e) {
    case 9:
    case 11:
      t = (t = t.documentElement) ? t.namespaceURI : Bl(null, "");
      break;
    default:
      e = e === 8 ? t.parentNode : t, t = e.namespaceURI || null, e = e.tagName, t = Bl(t, e);
  }
  de($t), oe($t, t);
}
function Xr() {
  de($t), de(ua), de(ca);
}
function bp(e) {
  Yn(ca.current);
  var t = Yn($t.current), n = Bl(t, e.type);
  t !== n && (oe(ua, e), oe($t, n));
}
function Sc(e) {
  ua.current === e && (de($t), de(ua));
}
var he = An(0);
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
var io = un.ReactCurrentDispatcher, ll = un.ReactCurrentBatchConfig, rr = 0, me = null, Ce = null, Te = null, $o = !1, Pi = !1, da = 0, U3 = 0;
function Me() {
  throw Error(b(321));
}
function bc(e, t) {
  if (t === null) return !1;
  for (var n = 0; n < t.length && n < e.length; n++) if (!Dt(e[n], t[n])) return !1;
  return !0;
}
function Ec(e, t, n, r, i, a) {
  if (rr = a, me = t, t.memoizedState = null, t.updateQueue = null, t.lanes = 0, io.current = e === null || e.memoizedState === null ? Y3 : X3, e = n(r, i), Pi) {
    a = 0;
    do {
      if (Pi = !1, da = 0, 25 <= a) throw Error(b(301));
      a += 1, Te = Ce = null, t.updateQueue = null, io.current = Q3, e = n(r, i);
    } while (Pi);
  }
  if (io.current = Zo, t = Ce !== null && Ce.next !== null, rr = 0, Te = Ce = me = null, $o = !1, t) throw Error(b(300));
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
      if ((rr & d) === d) l !== null && (l = l.next = { lane: 0, action: c.action, hasEagerState: c.hasEagerState, eagerState: c.eagerState, next: null }), r = c.hasEagerState ? c.eagerState : e(r, c.action);
      else {
        var f = {
          lane: d,
          action: c.action,
          hasEagerState: c.hasEagerState,
          eagerState: c.eagerState,
          next: null
        };
        l === null ? (s = l = f, o = r) : l = l.next = f, me.lanes |= d, ir |= d;
      }
      c = c.next;
    } while (c !== null && c !== a);
    l === null ? o = r : l.next = s, Dt(r, t.memoizedState) || (Ye = !0), t.memoizedState = r, t.baseState = o, t.baseQueue = l, n.lastRenderedState = r;
  }
  if (e = n.interleaved, e !== null) {
    i = e;
    do
      a = i.lane, me.lanes |= a, ir |= a, i = i.next;
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
function Ep() {
}
function Tp(e, t) {
  var n = me, r = _t(), i = t(), a = !Dt(r.memoizedState, i);
  if (a && (r.memoizedState = i, Ye = !0), r = r.queue, Pc(Lp.bind(null, n, r, e), [e]), r.getSnapshot !== t || a || Te !== null && Te.memoizedState.tag & 1) {
    if (n.flags |= 2048, xa(9, Np.bind(null, n, r, i, t), void 0, null), Pe === null) throw Error(b(349));
    rr & 30 || Pp(n, t, i);
  }
  return i;
}
function Pp(e, t, n) {
  e.flags |= 16384, e = { getSnapshot: t, value: n }, t = me.updateQueue, t === null ? (t = { lastEffect: null, stores: null }, me.updateQueue = t, t.stores = [e]) : (n = t.stores, n === null ? t.stores = [e] : n.push(e));
}
function Np(e, t, n, r) {
  t.value = n, t.getSnapshot = r, Ip(t) && Rp(e);
}
function Lp(e, t, n) {
  return n(function() {
    Ip(t) && Rp(e);
  });
}
function Ip(e) {
  var t = e.getSnapshot;
  e = e.value;
  try {
    var n = t();
    return !Dt(e, n);
  } catch {
    return !0;
  }
}
function Rp(e) {
  var t = sn(e, 1);
  t !== null && It(t, e, 1, -1);
}
function fd(e) {
  var t = Ht();
  return typeof e == "function" && (e = e()), t.memoizedState = t.baseState = e, e = { pending: null, interleaved: null, lanes: 0, dispatch: null, lastRenderedReducer: fa, lastRenderedState: e }, t.queue = e, e = e.dispatch = G3.bind(null, me, e), [t.memoizedState, e];
}
function xa(e, t, n, r) {
  return e = { tag: e, create: t, destroy: n, deps: r, next: null }, t = me.updateQueue, t === null ? (t = { lastEffect: null, stores: null }, me.updateQueue = t, t.lastEffect = e.next = e) : (n = t.lastEffect, n === null ? t.lastEffect = e.next = e : (r = n.next, n.next = e, e.next = r, t.lastEffect = e)), e;
}
function Dp() {
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
function Mp(e, t) {
  return bs(4, 2, e, t);
}
function Op(e, t) {
  return bs(4, 4, e, t);
}
function Hp(e, t) {
  if (typeof t == "function") return e = e(), t(e), function() {
    t(null);
  };
  if (t != null) return e = e(), t.current = e, function() {
    t.current = null;
  };
}
function Ap(e, t, n) {
  return n = n != null ? n.concat([e]) : null, bs(4, 4, Hp.bind(null, t, e), n);
}
function Nc() {
}
function jp(e, t) {
  var n = _t();
  t = t === void 0 ? null : t;
  var r = n.memoizedState;
  return r !== null && t !== null && bc(t, r[1]) ? r[0] : (n.memoizedState = [e, t], e);
}
function Fp(e, t) {
  var n = _t();
  t = t === void 0 ? null : t;
  var r = n.memoizedState;
  return r !== null && t !== null && bc(t, r[1]) ? r[0] : (e = e(), n.memoizedState = [e, t], e);
}
function zp(e, t, n) {
  return rr & 21 ? (Dt(n, t) || (n = $x(), me.lanes |= n, ir |= n, e.baseState = !0), t) : (e.baseState && (e.baseState = !1, Ye = !0), e.memoizedState = n);
}
function $3(e, t) {
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
function Wp() {
  return _t().memoizedState;
}
function Z3(e, t, n) {
  var r = Tn(e);
  if (n = { lane: r, action: n, hasEagerState: !1, eagerState: null, next: null }, Vp(e)) Bp(t, n);
  else if (n = Sp(e, t, n, r), n !== null) {
    var i = Be();
    It(n, e, r, i), Up(n, t, r);
  }
}
function G3(e, t, n) {
  var r = Tn(e), i = { lane: r, action: n, hasEagerState: !1, eagerState: null, next: null };
  if (Vp(e)) Bp(t, i);
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
    n = Sp(e, t, i, r), n !== null && (i = Be(), It(n, e, r, i), Up(n, t, r));
  }
}
function Vp(e) {
  var t = e.alternate;
  return e === me || t !== null && t === me;
}
function Bp(e, t) {
  Pi = $o = !0;
  var n = e.pending;
  n === null ? t.next = t : (t.next = n.next, n.next = t), e.pending = t;
}
function Up(e, t, n) {
  if (n & 4194240) {
    var r = t.lanes;
    r &= e.pendingLanes, n |= r, t.lanes = n, oc(e, n);
  }
}
var Zo = { readContext: wt, useCallback: Me, useContext: Me, useEffect: Me, useImperativeHandle: Me, useInsertionEffect: Me, useLayoutEffect: Me, useMemo: Me, useReducer: Me, useRef: Me, useState: Me, useDebugValue: Me, useDeferredValue: Me, useTransition: Me, useMutableSource: Me, useSyncExternalStore: Me, useId: Me, unstable_isNewReconciler: !1 }, Y3 = { readContext: wt, useCallback: function(e, t) {
  return Ht().memoizedState = [e, t === void 0 ? null : t], e;
}, useContext: wt, useEffect: xd, useImperativeHandle: function(e, t, n) {
  return n = n != null ? n.concat([e]) : null, ao(
    4194308,
    4,
    Hp.bind(null, t, e),
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
  return t = n !== void 0 ? n(t) : t, r.memoizedState = r.baseState = t, e = { pending: null, interleaved: null, lanes: 0, dispatch: null, lastRenderedReducer: e, lastRenderedState: t }, r.queue = e, e = e.dispatch = Z3.bind(null, me, e), [r.memoizedState, e];
}, useRef: function(e) {
  var t = Ht();
  return e = { current: e }, t.memoizedState = e;
}, useState: fd, useDebugValue: Nc, useDeferredValue: function(e) {
  return Ht().memoizedState = e;
}, useTransition: function() {
  var e = fd(!1), t = e[0];
  return e = $3.bind(null, e[1]), Ht().memoizedState = e, [t, e];
}, useMutableSource: function() {
}, useSyncExternalStore: function(e, t, n) {
  var r = me, i = Ht();
  if (xe) {
    if (n === void 0) throw Error(b(407));
    n = n();
  } else {
    if (n = t(), Pe === null) throw Error(b(349));
    rr & 30 || Pp(r, t, n);
  }
  i.memoizedState = n;
  var a = { value: n, getSnapshot: t };
  return i.queue = a, xd(Lp.bind(
    null,
    r,
    a,
    e
  ), [e]), r.flags |= 2048, xa(9, Np.bind(null, r, a, n, t), void 0, null), n;
}, useId: function() {
  var e = Ht(), t = Pe.identifierPrefix;
  if (xe) {
    var n = tn, r = en;
    n = (r & ~(1 << 32 - Lt(r) - 1)).toString(32) + n, t = ":" + t + "R" + n, n = da++, 0 < n && (t += "H" + n.toString(32)), t += ":";
  } else n = U3++, t = ":" + t + "r" + n.toString(32) + ":";
  return e.memoizedState = t;
}, unstable_isNewReconciler: !1 }, X3 = {
  readContext: wt,
  useCallback: jp,
  useContext: wt,
  useEffect: Pc,
  useImperativeHandle: Ap,
  useInsertionEffect: Mp,
  useLayoutEffect: Op,
  useMemo: Fp,
  useReducer: ul,
  useRef: Dp,
  useState: function() {
    return ul(fa);
  },
  useDebugValue: Nc,
  useDeferredValue: function(e) {
    var t = _t();
    return zp(t, Ce.memoizedState, e);
  },
  useTransition: function() {
    var e = ul(fa)[0], t = _t().memoizedState;
    return [e, t];
  },
  useMutableSource: Ep,
  useSyncExternalStore: Tp,
  useId: Wp,
  unstable_isNewReconciler: !1
}, Q3 = { readContext: wt, useCallback: jp, useContext: wt, useEffect: Pc, useImperativeHandle: Ap, useInsertionEffect: Mp, useLayoutEffect: Op, useMemo: Fp, useReducer: cl, useRef: Dp, useState: function() {
  return cl(fa);
}, useDebugValue: Nc, useDeferredValue: function(e) {
  var t = _t();
  return Ce === null ? t.memoizedState = e : zp(t, Ce.memoizedState, e);
}, useTransition: function() {
  var e = cl(fa)[0], t = _t().memoizedState;
  return [e, t];
}, useMutableSource: Ep, useSyncExternalStore: Tp, useId: Wp, unstable_isNewReconciler: !1 };
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
  return (e = e._reactInternals) ? lr(e) === e : !1;
}, enqueueSetState: function(e, t, n) {
  e = e._reactInternals;
  var r = Be(), i = Tn(e), a = nn(r, i);
  a.payload = t, n != null && (a.callback = n), t = bn(e, a, i), t !== null && (It(t, e, i, r), ro(t, e, i));
}, enqueueReplaceState: function(e, t, n) {
  e = e._reactInternals;
  var r = Be(), i = Tn(e), a = nn(r, i);
  a.tag = 1, a.payload = t, n != null && (a.callback = n), t = bn(e, a, i), t !== null && (It(t, e, i, r), ro(t, e, i));
}, enqueueForceUpdate: function(e, t) {
  e = e._reactInternals;
  var n = Be(), r = Tn(e), i = nn(n, r);
  i.tag = 2, t != null && (i.callback = t), t = bn(e, i, r), t !== null && (It(t, e, r, n), ro(t, e, r));
} };
function pd(e, t, n, r, i, a, o) {
  return e = e.stateNode, typeof e.shouldComponentUpdate == "function" ? e.shouldComponentUpdate(r, a, o) : t.prototype && t.prototype.isPureReactComponent ? !aa(n, r) || !aa(i, a) : !0;
}
function $p(e, t, n) {
  var r = !1, i = Mn, a = t.contextType;
  return typeof a == "object" && a !== null ? a = wt(a) : (i = Qe(t) ? tr : ze.current, r = t.contextTypes, a = (r = r != null) ? Zr(e, i) : Mn), t = new t(n, a), e.memoizedState = t.state !== null && t.state !== void 0 ? t.state : null, t.updater = Es, e.stateNode = t, t._reactInternals = e, r && (e = e.stateNode, e.__reactInternalMemoizedUnmaskedChildContext = i, e.__reactInternalMemoizedMaskedChildContext = a), t;
}
function hd(e, t, n, r) {
  e = t.state, typeof t.componentWillReceiveProps == "function" && t.componentWillReceiveProps(n, r), typeof t.UNSAFE_componentWillReceiveProps == "function" && t.UNSAFE_componentWillReceiveProps(n, r), t.state !== e && Es.enqueueReplaceState(t, t.state, null);
}
function du(e, t, n, r) {
  var i = e.stateNode;
  i.props = n, i.state = e.memoizedState, i.refs = {}, _c(e);
  var a = t.contextType;
  typeof a == "object" && a !== null ? i.context = wt(a) : (a = Qe(t) ? tr : ze.current, i.context = Zr(e, a)), i.state = e.memoizedState, a = t.getDerivedStateFromProps, typeof a == "function" && (cu(e, t, a, n), i.state = e.memoizedState), typeof t.getDerivedStateFromProps == "function" || typeof i.getSnapshotBeforeUpdate == "function" || typeof i.UNSAFE_componentWillMount != "function" && typeof i.componentWillMount != "function" || (t = i.state, typeof i.componentWillMount == "function" && i.componentWillMount(), typeof i.UNSAFE_componentWillMount == "function" && i.UNSAFE_componentWillMount(), t !== i.state && Es.enqueueReplaceState(i, i.state, null), Bo(e, n, i, r), i.state = e.memoizedState), typeof i.componentDidMount == "function" && (e.flags |= 4194308);
}
function Qr(e, t) {
  try {
    var n = "", r = t;
    do
      n += C4(r), r = r.return;
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
var J3 = typeof WeakMap == "function" ? WeakMap : Map;
function Zp(e, t, n) {
  n = nn(-1, n), n.tag = 3, n.payload = { element: null };
  var r = t.value;
  return n.callback = function() {
    Yo || (Yo = !0, ku = r), fu(e, t);
  }, n;
}
function Gp(e, t, n) {
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
    fu(e, t), typeof r != "function" && (En === null ? En = /* @__PURE__ */ new Set([this]) : En.add(this));
    var o = t.stack;
    this.componentDidCatch(t.value, { componentStack: o !== null ? o : "" });
  }), n;
}
function md(e, t, n) {
  var r = e.pingCache;
  if (r === null) {
    r = e.pingCache = new J3();
    var i = /* @__PURE__ */ new Set();
    r.set(t, i);
  } else i = r.get(t), i === void 0 && (i = /* @__PURE__ */ new Set(), r.set(t, i));
  i.has(n) || (i.add(n), e = dw.bind(null, e, t, n), t.then(e, e));
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
  return e.mode & 1 ? (e.flags |= 65536, e.lanes = i, e) : (e === t ? e.flags |= 65536 : (e.flags |= 128, n.flags |= 131072, n.flags &= -52805, n.tag === 1 && (n.alternate === null ? n.tag = 17 : (t = nn(-1, 1), t.tag = 2, bn(n, t, 1))), n.lanes |= 1), e);
}
var K3 = un.ReactCurrentOwner, Ye = !1;
function Ve(e, t, n, r) {
  t.child = e === null ? kp(t, null, n, r) : Yr(t, e.child, n, r);
}
function yd(e, t, n, r, i) {
  n = n.render;
  var a = t.ref;
  return Ar(t, i), r = Ec(e, t, n, r, a, i), n = Tc(), e !== null && !Ye ? (t.updateQueue = e.updateQueue, t.flags &= -2053, e.lanes &= ~i, ln(e, t, i)) : (xe && n && pc(t), t.flags |= 1, Ve(e, t, r, i), t.child);
}
function wd(e, t, n, r, i) {
  if (e === null) {
    var a = n.type;
    return typeof a == "function" && !Ac(a) && a.defaultProps === void 0 && n.compare === null && n.defaultProps === void 0 ? (t.tag = 15, t.type = a, Yp(e, t, a, r, i)) : (e = uo(n.type, null, r, t, t.mode, i), e.ref = t.ref, e.return = t, t.child = e);
  }
  if (a = e.child, !(e.lanes & i)) {
    var o = a.memoizedProps;
    if (n = n.compare, n = n !== null ? n : aa, n(o, r) && e.ref === t.ref) return ln(e, t, i);
  }
  return t.flags |= 1, e = Pn(a, r), e.ref = t.ref, e.return = t, t.child = e;
}
function Yp(e, t, n, r, i) {
  if (e !== null) {
    var a = e.memoizedProps;
    if (aa(a, r) && e.ref === t.ref) if (Ye = !1, t.pendingProps = r = a, (e.lanes & i) !== 0) e.flags & 131072 && (Ye = !0);
    else return t.lanes = e.lanes, ln(e, t, i);
  }
  return xu(e, t, n, r, i);
}
function Xp(e, t, n) {
  var r = t.pendingProps, i = r.children, a = e !== null ? e.memoizedState : null;
  if (r.mode === "hidden") if (!(t.mode & 1)) t.memoizedState = { baseLanes: 0, cachePool: null, transitions: null }, oe(Lr, it), it |= n;
  else {
    if (!(n & 1073741824)) return e = a !== null ? a.baseLanes | n : n, t.lanes = t.childLanes = 1073741824, t.memoizedState = { baseLanes: e, cachePool: null, transitions: null }, t.updateQueue = null, oe(Lr, it), it |= e, null;
    t.memoizedState = { baseLanes: 0, cachePool: null, transitions: null }, r = a !== null ? a.baseLanes : n, oe(Lr, it), it |= r;
  }
  else a !== null ? (r = a.baseLanes | n, t.memoizedState = null) : r = n, oe(Lr, it), it |= r;
  return Ve(e, t, i, n), t.child;
}
function Qp(e, t) {
  var n = t.ref;
  (e === null && n !== null || e !== null && e.ref !== n) && (t.flags |= 512, t.flags |= 2097152);
}
function xu(e, t, n, r, i) {
  var a = Qe(n) ? tr : ze.current;
  return a = Zr(t, a), Ar(t, i), n = Ec(e, t, n, r, a, i), r = Tc(), e !== null && !Ye ? (t.updateQueue = e.updateQueue, t.flags &= -2053, e.lanes &= ~i, ln(e, t, i)) : (xe && r && pc(t), t.flags |= 1, Ve(e, t, n, i), t.child);
}
function _d(e, t, n, r, i) {
  if (Qe(n)) {
    var a = !0;
    jo(t);
  } else a = !1;
  if (Ar(t, i), t.stateNode === null) oo(e, t), $p(t, n, r), du(t, n, r, i), r = !0;
  else if (e === null) {
    var o = t.stateNode, s = t.memoizedProps;
    o.props = s;
    var l = o.context, c = n.contextType;
    typeof c == "object" && c !== null ? c = wt(c) : (c = Qe(n) ? tr : ze.current, c = Zr(t, c));
    var d = n.getDerivedStateFromProps, f = typeof d == "function" || typeof o.getSnapshotBeforeUpdate == "function";
    f || typeof o.UNSAFE_componentWillReceiveProps != "function" && typeof o.componentWillReceiveProps != "function" || (s !== r || l !== c) && hd(t, o, r, c), xn = !1;
    var m = t.memoizedState;
    o.state = m, Bo(t, r, o, i), l = t.memoizedState, s !== r || m !== l || Xe.current || xn ? (typeof d == "function" && (cu(t, n, d, r), l = t.memoizedState), (s = xn || pd(t, n, s, r, m, l, c)) ? (f || typeof o.UNSAFE_componentWillMount != "function" && typeof o.componentWillMount != "function" || (typeof o.componentWillMount == "function" && o.componentWillMount(), typeof o.UNSAFE_componentWillMount == "function" && o.UNSAFE_componentWillMount()), typeof o.componentDidMount == "function" && (t.flags |= 4194308)) : (typeof o.componentDidMount == "function" && (t.flags |= 4194308), t.memoizedProps = r, t.memoizedState = l), o.props = r, o.state = l, o.context = c, r = s) : (typeof o.componentDidMount == "function" && (t.flags |= 4194308), r = !1);
  } else {
    o = t.stateNode, Cp(e, t), s = t.memoizedProps, c = t.type === t.elementType ? s : bt(t.type, s), o.props = c, f = t.pendingProps, m = o.context, l = n.contextType, typeof l == "object" && l !== null ? l = wt(l) : (l = Qe(n) ? tr : ze.current, l = Zr(t, l));
    var w = n.getDerivedStateFromProps;
    (d = typeof w == "function" || typeof o.getSnapshotBeforeUpdate == "function") || typeof o.UNSAFE_componentWillReceiveProps != "function" && typeof o.componentWillReceiveProps != "function" || (s !== f || m !== l) && hd(t, o, r, l), xn = !1, m = t.memoizedState, o.state = m, Bo(t, r, o, i);
    var y = t.memoizedState;
    s !== f || m !== y || Xe.current || xn ? (typeof w == "function" && (cu(t, n, w, r), y = t.memoizedState), (c = xn || pd(t, n, c, r, m, y, l) || !1) ? (d || typeof o.UNSAFE_componentWillUpdate != "function" && typeof o.componentWillUpdate != "function" || (typeof o.componentWillUpdate == "function" && o.componentWillUpdate(r, y, l), typeof o.UNSAFE_componentWillUpdate == "function" && o.UNSAFE_componentWillUpdate(r, y, l)), typeof o.componentDidUpdate == "function" && (t.flags |= 4), typeof o.getSnapshotBeforeUpdate == "function" && (t.flags |= 1024)) : (typeof o.componentDidUpdate != "function" || s === e.memoizedProps && m === e.memoizedState || (t.flags |= 4), typeof o.getSnapshotBeforeUpdate != "function" || s === e.memoizedProps && m === e.memoizedState || (t.flags |= 1024), t.memoizedProps = r, t.memoizedState = y), o.props = r, o.state = y, o.context = l, r = c) : (typeof o.componentDidUpdate != "function" || s === e.memoizedProps && m === e.memoizedState || (t.flags |= 4), typeof o.getSnapshotBeforeUpdate != "function" || s === e.memoizedProps && m === e.memoizedState || (t.flags |= 1024), r = !1);
  }
  return pu(e, t, n, r, a, i);
}
function pu(e, t, n, r, i, a) {
  Qp(e, t);
  var o = (t.flags & 128) !== 0;
  if (!r && !o) return i && od(t, n, !1), ln(e, t, a);
  r = t.stateNode, K3.current = t;
  var s = o && typeof n.getDerivedStateFromError != "function" ? null : r.render();
  return t.flags |= 1, e !== null && o ? (t.child = Yr(t, e.child, null, a), t.child = Yr(t, null, s, a)) : Ve(e, t, s, a), t.memoizedState = r.state, i && od(t, n, !0), t.child;
}
function Jp(e) {
  var t = e.stateNode;
  t.pendingContext ? ad(e, t.pendingContext, t.pendingContext !== t.context) : t.context && ad(e, t.context, !1), kc(e, t.containerInfo);
}
function kd(e, t, n, r, i) {
  return Gr(), mc(i), t.flags |= 256, Ve(e, t, n, r), t.child;
}
var hu = { dehydrated: null, treeContext: null, retryLane: 0 };
function mu(e) {
  return { baseLanes: e, cachePool: null, transitions: null };
}
function Kp(e, t, n) {
  var r = t.pendingProps, i = he.current, a = !1, o = (t.flags & 128) !== 0, s;
  if ((s = o) || (s = e !== null && e.memoizedState === null ? !1 : (i & 2) !== 0), s ? (a = !0, t.flags &= -129) : (e === null || e.memoizedState !== null) && (i |= 1), oe(he, i & 1), e === null)
    return lu(t), e = t.memoizedState, e !== null && (e = e.dehydrated, e !== null) ? (t.mode & 1 ? e.data === "$!" ? t.lanes = 8 : t.lanes = 1073741824 : t.lanes = 1, null) : (o = r.children, e = r.fallback, a ? (r = t.mode, a = t.child, o = { mode: "hidden", children: o }, !(r & 1) && a !== null ? (a.childLanes = 0, a.pendingProps = o) : a = Ns(o, r, 0, null), e = Jn(e, r, n, null), a.return = t, e.return = t, a.sibling = e, t.child = a, t.child.memoizedState = mu(n), t.memoizedState = hu, e) : Lc(t, o));
  if (i = e.memoizedState, i !== null && (s = i.dehydrated, s !== null)) return q3(e, t, o, r, s, i, n);
  if (a) {
    a = r.fallback, o = t.mode, i = e.child, s = i.sibling;
    var l = { mode: "hidden", children: r.children };
    return !(o & 1) && t.child !== i ? (r = t.child, r.childLanes = 0, r.pendingProps = l, t.deletions = null) : (r = Pn(i, l), r.subtreeFlags = i.subtreeFlags & 14680064), s !== null ? a = Pn(s, a) : (a = Jn(a, o, n, null), a.flags |= 2), a.return = t, r.return = t, r.sibling = a, t.child = r, r = a, a = t.child, o = e.child.memoizedState, o = o === null ? mu(n) : { baseLanes: o.baseLanes | n, cachePool: null, transitions: o.transitions }, a.memoizedState = o, a.childLanes = e.childLanes & ~n, t.memoizedState = hu, r;
  }
  return a = e.child, e = a.sibling, r = Pn(a, { mode: "visible", children: r.children }), !(t.mode & 1) && (r.lanes = n), r.return = t, r.sibling = null, e !== null && (n = t.deletions, n === null ? (t.deletions = [e], t.flags |= 16) : n.push(e)), t.child = r, t.memoizedState = null, r;
}
function Lc(e, t) {
  return t = Ns({ mode: "visible", children: t }, e.mode, 0, null), t.return = e, e.child = t;
}
function Ba(e, t, n, r) {
  return r !== null && mc(r), Yr(t, e.child, null, n), e = Lc(t, t.pendingProps.children), e.flags |= 2, t.memoizedState = null, e;
}
function q3(e, t, n, r, i, a, o) {
  if (n)
    return t.flags & 256 ? (t.flags &= -257, r = dl(Error(b(422))), Ba(e, t, o, r)) : t.memoizedState !== null ? (t.child = e.child, t.flags |= 128, null) : (a = r.fallback, i = t.mode, r = Ns({ mode: "visible", children: r.children }, i, 0, null), a = Jn(a, i, o, null), a.flags |= 2, r.return = t, a.return = t, r.sibling = a, t.child = r, t.mode & 1 && Yr(t, e.child, null, o), t.child.memoizedState = mu(o), t.memoizedState = hu, a);
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
  return i.data === "$?" ? (t.flags |= 128, t.child = e.child, t = fw.bind(null, e), i._reactRetry = t, null) : (e = a.treeContext, at = Cn(i.nextSibling), lt = t, xe = !0, Tt = null, e !== null && (mt[vt++] = en, mt[vt++] = tn, mt[vt++] = nr, en = e.id, tn = e.overflow, nr = t), t = Lc(t, r.children), t.flags |= 4096, t);
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
function qp(e, t, n) {
  var r = t.pendingProps, i = r.revealOrder, a = r.tail;
  if (Ve(e, t, r.children, n), r = he.current, r & 2) r = r & 1 | 2, t.flags |= 128;
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
  if (e !== null && (t.dependencies = e.dependencies), ir |= t.lanes, !(n & t.childLanes)) return null;
  if (e !== null && t.child !== e.child) throw Error(b(153));
  if (t.child !== null) {
    for (e = t.child, n = Pn(e, e.pendingProps), t.child = n, n.return = t; e.sibling !== null; ) e = e.sibling, n = n.sibling = Pn(e, e.pendingProps), n.return = t;
    n.sibling = null;
  }
  return t.child;
}
function ew(e, t, n) {
  switch (t.tag) {
    case 3:
      Jp(t), Gr();
      break;
    case 5:
      bp(t);
      break;
    case 1:
      Qe(t.type) && jo(t);
      break;
    case 4:
      kc(t, t.stateNode.containerInfo);
      break;
    case 10:
      var r = t.type._context, i = t.memoizedProps.value;
      oe(Wo, r._currentValue), r._currentValue = i;
      break;
    case 13:
      if (r = t.memoizedState, r !== null)
        return r.dehydrated !== null ? (oe(he, he.current & 1), t.flags |= 128, null) : n & t.child.childLanes ? Kp(e, t, n) : (oe(he, he.current & 1), e = ln(e, t, n), e !== null ? e.sibling : null);
      oe(he, he.current & 1);
      break;
    case 19:
      if (r = (n & t.childLanes) !== 0, e.flags & 128) {
        if (r) return qp(e, t, n);
        t.flags |= 128;
      }
      if (i = t.memoizedState, i !== null && (i.rendering = null, i.tail = null, i.lastEffect = null), oe(he, he.current), r) break;
      return null;
    case 22:
    case 23:
      return t.lanes = 0, Xp(e, t, n);
  }
  return ln(e, t, n);
}
var eh, vu, th, nh;
eh = function(e, t) {
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
th = function(e, t, n, r) {
  var i = e.memoizedProps;
  if (i !== r) {
    e = t.stateNode, Yn($t.current);
    var a = null;
    switch (n) {
      case "input":
        i = Fl(e, i), r = Fl(e, r), a = [];
        break;
      case "select":
        i = ve({}, i, { value: void 0 }), r = ve({}, r, { value: void 0 }), a = [];
        break;
      case "textarea":
        i = Vl(e, i), r = Vl(e, r), a = [];
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
nh = function(e, t, n, r) {
  n !== r && (t.flags |= 4);
};
function xi(e, t) {
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
function tw(e, t, n) {
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
      return r = t.stateNode, Xr(), de(Xe), de(ze), Cc(), r.pendingContext && (r.context = r.pendingContext, r.pendingContext = null), (e === null || e.child === null) && (Wa(t) ? t.flags |= 4 : e === null || e.memoizedState.isDehydrated && !(t.flags & 256) || (t.flags |= 1024, Tt !== null && (bu(Tt), Tt = null))), vu(e, t), Oe(t), null;
    case 5:
      Sc(t);
      var i = Yn(ca.current);
      if (n = t.type, e !== null && t.stateNode != null) th(e, t, n, r, i), e.ref !== t.ref && (t.flags |= 512, t.flags |= 2097152);
      else {
        if (!r) {
          if (t.stateNode === null) throw Error(b(166));
          return Oe(t), null;
        }
        if (e = Yn($t.current), Wa(t)) {
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
              for (i = 0; i < wi.length; i++) ce(wi[i], r);
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
          o = i.nodeType === 9 ? i : i.ownerDocument, e === "http://www.w3.org/1999/xhtml" && (e = Lx(n)), e === "http://www.w3.org/1999/xhtml" ? n === "script" ? (e = o.createElement("div"), e.innerHTML = "<script><\/script>", e = e.removeChild(e.firstChild)) : typeof r.is == "string" ? e = o.createElement(n, { is: r.is }) : (e = o.createElement(n), n === "select" && (o = e, r.multiple ? o.multiple = !0 : r.size && (o.size = r.size))) : e = o.createElementNS(e, n), e[zt] = t, e[la] = r, eh(e, t, !1, !1), t.stateNode = e;
          e: {
            switch (o = $l(n, r), n) {
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
                for (i = 0; i < wi.length; i++) ce(wi[i], e);
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
                M0(e, r), i = Vl(e, r), ce("invalid", e);
                break;
              default:
                i = r;
            }
            Ul(n, i), s = i;
            for (a in s) if (s.hasOwnProperty(a)) {
              var l = s[a];
              a === "style" ? Dx(e, l) : a === "dangerouslySetInnerHTML" ? (l = l ? l.__html : void 0, l != null && Ix(e, l)) : a === "children" ? typeof l == "string" ? (n !== "textarea" || l !== "") && qi(e, l) : typeof l == "number" && qi(e, "" + l) : a !== "suppressContentEditableWarning" && a !== "suppressHydrationWarning" && a !== "autoFocus" && (Ki.hasOwnProperty(a) ? l != null && a === "onScroll" && ce("scroll", e) : l != null && ec(e, a, l, o));
            }
            switch (n) {
              case "input":
                Ra(e), D0(e, r, !1);
                break;
              case "textarea":
                Ra(e), O0(e);
                break;
              case "option":
                r.value != null && e.setAttribute("value", "" + Dn(r.value));
                break;
              case "select":
                e.multiple = !!r.multiple, a = r.value, a != null ? Dr(e, !!r.multiple, a, !1) : r.defaultValue != null && Dr(
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
      if (e && t.stateNode != null) nh(e, t, e.memoizedProps, r);
      else {
        if (typeof r != "string" && t.stateNode === null) throw Error(b(166));
        if (n = Yn(ca.current), Yn($t.current), Wa(t)) {
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
        if (xe && at !== null && t.mode & 1 && !(t.flags & 128)) wp(), Gr(), t.flags |= 98560, a = !1;
        else if (a = Wa(t), r !== null && r.dehydrated !== null) {
          if (e === null) {
            if (!a) throw Error(b(318));
            if (a = t.memoizedState, a = a !== null ? a.dehydrated : null, !a) throw Error(b(317));
            a[zt] = t;
          } else Gr(), !(t.flags & 128) && (t.memoizedState = null), t.flags |= 4;
          Oe(t), a = !1;
        } else Tt !== null && (bu(Tt), Tt = null), a = !0;
        if (!a) return t.flags & 65536 ? t : null;
      }
      return t.flags & 128 ? (t.lanes = n, t) : (r = r !== null, r !== (e !== null && e.memoizedState !== null) && r && (t.child.flags |= 8192, t.mode & 1 && (e === null || he.current & 1 ? be === 0 && (be = 3) : Hc())), t.updateQueue !== null && (t.flags |= 4), Oe(t), null);
    case 4:
      return Xr(), vu(e, t), e === null && oa(t.stateNode.containerInfo), Oe(t), null;
    case 10:
      return yc(t.type._context), Oe(t), null;
    case 17:
      return Qe(t.type) && Ao(), Oe(t), null;
    case 19:
      if (de(he), a = t.memoizedState, a === null) return Oe(t), null;
      if (r = (t.flags & 128) !== 0, o = a.rendering, o === null) if (r) xi(a, !1);
      else {
        if (be !== 0 || e !== null && e.flags & 128) for (e = t.child; e !== null; ) {
          if (o = Uo(e), o !== null) {
            for (t.flags |= 128, xi(a, !1), r = o.updateQueue, r !== null && (t.updateQueue = r, t.flags |= 4), t.subtreeFlags = 0, r = n, n = t.child; n !== null; ) a = n, e = r, a.flags &= 14680066, o = a.alternate, o === null ? (a.childLanes = 0, a.lanes = e, a.child = null, a.subtreeFlags = 0, a.memoizedProps = null, a.memoizedState = null, a.updateQueue = null, a.dependencies = null, a.stateNode = null) : (a.childLanes = o.childLanes, a.lanes = o.lanes, a.child = o.child, a.subtreeFlags = 0, a.deletions = null, a.memoizedProps = o.memoizedProps, a.memoizedState = o.memoizedState, a.updateQueue = o.updateQueue, a.type = o.type, e = o.dependencies, a.dependencies = e === null ? null : { lanes: e.lanes, firstContext: e.firstContext }), n = n.sibling;
            return oe(he, he.current & 1 | 2), t.child;
          }
          e = e.sibling;
        }
        a.tail !== null && we() > Jr && (t.flags |= 128, r = !0, xi(a, !1), t.lanes = 4194304);
      }
      else {
        if (!r) if (e = Uo(o), e !== null) {
          if (t.flags |= 128, r = !0, n = e.updateQueue, n !== null && (t.updateQueue = n, t.flags |= 4), xi(a, !0), a.tail === null && a.tailMode === "hidden" && !o.alternate && !xe) return Oe(t), null;
        } else 2 * we() - a.renderingStartTime > Jr && n !== 1073741824 && (t.flags |= 128, r = !0, xi(a, !1), t.lanes = 4194304);
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
function nw(e, t) {
  switch (hc(t), t.tag) {
    case 1:
      return Qe(t.type) && Ao(), e = t.flags, e & 65536 ? (t.flags = e & -65537 | 128, t) : null;
    case 3:
      return Xr(), de(Xe), de(ze), Cc(), e = t.flags, e & 65536 && !(e & 128) ? (t.flags = e & -65537 | 128, t) : null;
    case 5:
      return Sc(t), null;
    case 13:
      if (de(he), e = t.memoizedState, e !== null && e.dehydrated !== null) {
        if (t.alternate === null) throw Error(b(340));
        Gr();
      }
      return e = t.flags, e & 65536 ? (t.flags = e & -65537 | 128, t) : null;
    case 19:
      return de(he), null;
    case 4:
      return Xr(), null;
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
var Ua = !1, je = !1, rw = typeof WeakSet == "function" ? WeakSet : Set, R = null;
function Nr(e, t) {
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
function iw(e, t) {
  if (tu = Do, e = sp(), xc(e)) {
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
function Ni(e, t, n) {
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
function rh(e) {
  var t = e.alternate;
  t !== null && (e.alternate = null, rh(t)), e.child = null, e.deletions = null, e.sibling = null, e.tag === 5 && (t = e.stateNode, t !== null && (delete t[zt], delete t[la], delete t[au], delete t[z3], delete t[W3])), e.stateNode = null, e.return = null, e.dependencies = null, e.memoizedProps = null, e.memoizedState = null, e.pendingProps = null, e.stateNode = null, e.updateQueue = null;
}
function ih(e) {
  return e.tag === 5 || e.tag === 3 || e.tag === 4;
}
function bd(e) {
  e: for (; ; ) {
    for (; e.sibling === null; ) {
      if (e.return === null || ih(e.return)) return null;
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
  for (n = n.child; n !== null; ) ah(e, t, n), n = n.sibling;
}
function ah(e, t, n) {
  if (Ut && typeof Ut.onCommitFiberUnmount == "function") try {
    Ut.onCommitFiberUnmount(ys, n);
  } catch {
  }
  switch (n.tag) {
    case 5:
      je || Nr(n, t);
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
      if (!je && (Nr(n, t), r = n.stateNode, typeof r.componentWillUnmount == "function")) try {
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
    n === null && (n = e.stateNode = new rw()), t.forEach(function(r) {
      var i = xw.bind(null, e, r);
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
      ah(a, o, i), Le = null, Et = !1;
      var l = i.alternate;
      l !== null && (l.return = null), i.return = null;
    } catch (c) {
      ge(i, t, c);
    }
  }
  if (t.subtreeFlags & 12854) for (t = t.child; t !== null; ) oh(t, e), t = t.sibling;
}
function oh(e, t) {
  var n = e.alternate, r = e.flags;
  switch (e.tag) {
    case 0:
    case 11:
    case 14:
    case 15:
      if (St(t, e), Ot(e), r & 4) {
        try {
          Ni(3, e, e.return), Ts(3, e);
        } catch (x) {
          ge(e, e.return, x);
        }
        try {
          Ni(5, e, e.return);
        } catch (x) {
          ge(e, e.return, x);
        }
      }
      break;
    case 1:
      St(t, e), Ot(e), r & 512 && n !== null && Nr(n, n.return);
      break;
    case 5:
      if (St(t, e), Ot(e), r & 512 && n !== null && Nr(n, n.return), e.flags & 32) {
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
          s === "input" && a.type === "radio" && a.name != null && Px(i, a), $l(s, o);
          var c = $l(s, a);
          for (o = 0; o < l.length; o += 2) {
            var d = l[o], f = l[o + 1];
            d === "style" ? Dx(i, f) : d === "dangerouslySetInnerHTML" ? Ix(i, f) : d === "children" ? qi(i, f) : ec(i, d, f, c);
          }
          switch (s) {
            case "input":
              zl(i, a);
              break;
            case "textarea":
              Nx(i, a);
              break;
            case "select":
              var m = i._wrapperState.wasMultiple;
              i._wrapperState.wasMultiple = !!a.multiple;
              var w = a.value;
              w != null ? Dr(i, !!a.multiple, w, !1) : m !== !!a.multiple && (a.defaultValue != null ? Dr(
                i,
                !!a.multiple,
                a.defaultValue,
                !0
              ) : Dr(i, !!a.multiple, a.multiple ? [] : "", !1));
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
                Ni(4, m, m.return);
                break;
              case 1:
                Nr(m, m.return);
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
                Nr(m, m.return);
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
                i = f.stateNode, c ? (a = i.style, typeof a.setProperty == "function" ? a.setProperty("display", "none", "important") : a.display = "none") : (s = f.stateNode, l = f.memoizedProps.style, o = l != null && l.hasOwnProperty("display") ? l.display : null, s.style.display = Rx("display", o));
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
          if (ih(n)) {
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
function aw(e, t, n) {
  R = e, sh(e);
}
function sh(e, t, n) {
  for (var r = (e.mode & 1) !== 0; R !== null; ) {
    var i = R, a = i.child;
    if (i.tag === 22 && r) {
      var o = i.memoizedState !== null || Ua;
      if (!o) {
        var s = i.alternate, l = s !== null && s.memoizedState !== null || je;
        s = Ua;
        var c = je;
        if (Ua = o, (je = l) && !c) for (R = i; R !== null; ) o = R, l = o.child, o.tag === 22 && o.memoizedState !== null ? Nd(i) : l !== null ? (l.return = o, R = l) : Nd(i);
        for (; a !== null; ) R = a, sh(a), a = a.sibling;
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
var ow = Math.ceil, Go = un.ReactCurrentDispatcher, Ic = un.ReactCurrentOwner, yt = un.ReactCurrentBatchConfig, J = 0, Pe = null, ke = null, Re = 0, it = 0, Lr = An(0), be = 0, pa = null, ir = 0, Ps = 0, Rc = 0, Li = null, Ge = null, Dc = 0, Jr = 1 / 0, Jt = null, Yo = !1, ku = null, En = null, $a = !1, wn = null, Xo = 0, Ii = 0, Su = null, so = -1, lo = 0;
function Be() {
  return J & 6 ? we() : so !== -1 ? so : so = we();
}
function Tn(e) {
  return e.mode & 1 ? J & 2 && Re !== 0 ? Re & -Re : B3.transition !== null ? (lo === 0 && (lo = $x()), lo) : (e = re, e !== 0 || (e = window.event, e = e === void 0 ? 16 : Kx(e.type)), e) : 1;
}
function It(e, t, n, r) {
  if (50 < Ii) throw Ii = 0, Su = null, Error(b(185));
  _a(e, n, r), (!(J & 2) || e !== Pe) && (e === Pe && (!(J & 2) && (Ps |= n), be === 4 && mn(e, Re)), Je(e, r), n === 1 && J === 0 && !(t.mode & 1) && (Jr = we() + 500, Cs && jn()));
}
function Je(e, t) {
  var n = e.callbackNode;
  B4(e, t);
  var r = Ro(e, e === Pe ? Re : 0);
  if (r === 0) n !== null && j0(n), e.callbackNode = null, e.callbackPriority = 0;
  else if (t = r & -r, e.callbackPriority !== t) {
    if (n != null && j0(n), t === 1) e.tag === 0 ? V3(Ld.bind(null, e)) : vp(Ld.bind(null, e)), j3(function() {
      !(J & 6) && jn();
    }), n = null;
    else {
      switch (Zx(r)) {
        case 1:
          n = ac;
          break;
        case 4:
          n = Bx;
          break;
        case 16:
          n = Io;
          break;
        case 536870912:
          n = Ux;
          break;
        default:
          n = Io;
      }
      n = hh(n, lh.bind(null, e));
    }
    e.callbackPriority = t, e.callbackNode = n;
  }
}
function lh(e, t) {
  if (so = -1, lo = 0, J & 6) throw Error(b(327));
  var n = e.callbackNode;
  if (jr() && e.callbackNode !== n) return null;
  var r = Ro(e, e === Pe ? Re : 0);
  if (r === 0) return null;
  if (r & 30 || r & e.expiredLanes || t) t = Qo(e, r);
  else {
    t = r;
    var i = J;
    J |= 2;
    var a = ch();
    (Pe !== e || Re !== t) && (Jt = null, Jr = we() + 500, Qn(e, t));
    do
      try {
        uw();
        break;
      } catch (s) {
        uh(e, s);
      }
    while (!0);
    gc(), Go.current = a, J = i, ke !== null ? t = 0 : (Pe = null, Re = 0, t = be);
  }
  if (t !== 0) {
    if (t === 2 && (i = Ql(e), i !== 0 && (r = i, t = Cu(e, i))), t === 1) throw n = pa, Qn(e, 0), mn(e, r), Je(e, we()), n;
    if (t === 6) mn(e, r);
    else {
      if (i = e.current.alternate, !(r & 30) && !sw(i) && (t = Qo(e, r), t === 2 && (a = Ql(e), a !== 0 && (r = a, t = Cu(e, a))), t === 1)) throw n = pa, Qn(e, 0), mn(e, r), Je(e, we()), n;
      switch (e.finishedWork = i, e.finishedLanes = r, t) {
        case 0:
        case 1:
          throw Error(b(345));
        case 2:
          Bn(e, Ge, Jt);
          break;
        case 3:
          if (mn(e, r), (r & 130023424) === r && (t = Dc + 500 - we(), 10 < t)) {
            if (Ro(e, 0) !== 0) break;
            if (i = e.suspendedLanes, (i & r) !== r) {
              Be(), e.pingedLanes |= e.suspendedLanes & i;
              break;
            }
            e.timeoutHandle = iu(Bn.bind(null, e, Ge, Jt), t);
            break;
          }
          Bn(e, Ge, Jt);
          break;
        case 4:
          if (mn(e, r), (r & 4194240) === r) break;
          for (t = e.eventTimes, i = -1; 0 < r; ) {
            var o = 31 - Lt(r);
            a = 1 << o, o = t[o], o > i && (i = o), r &= ~a;
          }
          if (r = i, r = we() - r, r = (120 > r ? 120 : 480 > r ? 480 : 1080 > r ? 1080 : 1920 > r ? 1920 : 3e3 > r ? 3e3 : 4320 > r ? 4320 : 1960 * ow(r / 1960)) - r, 10 < r) {
            e.timeoutHandle = iu(Bn.bind(null, e, Ge, Jt), r);
            break;
          }
          Bn(e, Ge, Jt);
          break;
        case 5:
          Bn(e, Ge, Jt);
          break;
        default:
          throw Error(b(329));
      }
    }
  }
  return Je(e, we()), e.callbackNode === n ? lh.bind(null, e) : null;
}
function Cu(e, t) {
  var n = Li;
  return e.current.memoizedState.isDehydrated && (Qn(e, t).flags |= 256), e = Qo(e, t), e !== 2 && (t = Ge, Ge = n, t !== null && bu(t)), e;
}
function bu(e) {
  Ge === null ? Ge = e : Ge.push.apply(Ge, e);
}
function sw(e) {
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
  jr();
  var t = Ro(e, 0);
  if (!(t & 1)) return Je(e, we()), null;
  var n = Qo(e, t);
  if (e.tag !== 0 && n === 2) {
    var r = Ql(e);
    r !== 0 && (t = r, n = Cu(e, r));
  }
  if (n === 1) throw n = pa, Qn(e, 0), mn(e, t), Je(e, we()), n;
  if (n === 6) throw Error(b(345));
  return e.finishedWork = e.current.alternate, e.finishedLanes = t, Bn(e, Ge, Jt), Je(e, we()), null;
}
function Mc(e, t) {
  var n = J;
  J |= 1;
  try {
    return e(t);
  } finally {
    J = n, J === 0 && (Jr = we() + 500, Cs && jn());
  }
}
function ar(e) {
  wn !== null && wn.tag === 0 && !(J & 6) && jr();
  var t = J;
  J |= 1;
  var n = yt.transition, r = re;
  try {
    if (yt.transition = null, re = 1, e) return e();
  } finally {
    re = r, yt.transition = n, J = t, !(J & 6) && jn();
  }
}
function Oc() {
  it = Lr.current, de(Lr);
}
function Qn(e, t) {
  e.finishedWork = null, e.finishedLanes = 0;
  var n = e.timeoutHandle;
  if (n !== -1 && (e.timeoutHandle = -1, A3(n)), ke !== null) for (n = ke.return; n !== null; ) {
    var r = n;
    switch (hc(r), r.tag) {
      case 1:
        r = r.type.childContextTypes, r != null && Ao();
        break;
      case 3:
        Xr(), de(Xe), de(ze), Cc();
        break;
      case 5:
        Sc(r);
        break;
      case 4:
        Xr();
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
  if (Pe = e, ke = e = Pn(e.current, null), Re = it = t, be = 0, pa = null, Rc = Ps = ir = 0, Ge = Li = null, Gn !== null) {
    for (t = 0; t < Gn.length; t++) if (n = Gn[t], r = n.interleaved, r !== null) {
      n.interleaved = null;
      var i = r.next, a = n.pending;
      if (a !== null) {
        var o = a.next;
        a.next = i, r.next = o;
      }
      n.pending = r;
    }
    Gn = null;
  }
  return e;
}
function uh(e, t) {
  do {
    var n = ke;
    try {
      if (gc(), io.current = Zo, $o) {
        for (var r = me.memoizedState; r !== null; ) {
          var i = r.queue;
          i !== null && (i.pending = null), r = r.next;
        }
        $o = !1;
      }
      if (rr = 0, Te = Ce = me = null, Pi = !1, da = 0, Ic.current = null, n === null || n.return === null) {
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
            !(_.flags & 65536) && (_.flags |= 256), gd(_, o, s, a, t), mc(Qr(l, s));
            break e;
          }
        }
        a = l = Qr(l, s), be !== 4 && (be = 2), Li === null ? Li = [a] : Li.push(a), a = o;
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
              if (!(a.flags & 128) && (typeof p.getDerivedStateFromError == "function" || h !== null && typeof h.componentDidCatch == "function" && (En === null || !En.has(h)))) {
                a.flags |= 65536, t &= -t, a.lanes |= t;
                var g = Gp(a, s, t);
                cd(a, g);
                break e;
              }
          }
          a = a.return;
        } while (a !== null);
      }
      fh(n);
    } catch (k) {
      t = k, ke === n && n !== null && (ke = n = n.return);
      continue;
    }
    break;
  } while (!0);
}
function ch() {
  var e = Go.current;
  return Go.current = Zo, e === null ? Zo : e;
}
function Hc() {
  (be === 0 || be === 3 || be === 2) && (be = 4), Pe === null || !(ir & 268435455) && !(Ps & 268435455) || mn(Pe, Re);
}
function Qo(e, t) {
  var n = J;
  J |= 2;
  var r = ch();
  (Pe !== e || Re !== t) && (Jt = null, Qn(e, t));
  do
    try {
      lw();
      break;
    } catch (i) {
      uh(e, i);
    }
  while (!0);
  if (gc(), J = n, Go.current = r, ke !== null) throw Error(b(261));
  return Pe = null, Re = 0, be;
}
function lw() {
  for (; ke !== null; ) dh(ke);
}
function uw() {
  for (; ke !== null && !M4(); ) dh(ke);
}
function dh(e) {
  var t = ph(e.alternate, e, it);
  e.memoizedProps = e.pendingProps, t === null ? fh(e) : ke = t, Ic.current = null;
}
function fh(e) {
  var t = e;
  do {
    var n = t.alternate;
    if (e = t.return, t.flags & 32768) {
      if (n = nw(n, t), n !== null) {
        n.flags &= 32767, ke = n;
        return;
      }
      if (e !== null) e.flags |= 32768, e.subtreeFlags = 0, e.deletions = null;
      else {
        be = 6, ke = null;
        return;
      }
    } else if (n = tw(n, t, it), n !== null) {
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
    yt.transition = null, re = 1, cw(e, t, n, r);
  } finally {
    yt.transition = i, re = r;
  }
  return null;
}
function cw(e, t, n, r) {
  do
    jr();
  while (wn !== null);
  if (J & 6) throw Error(b(327));
  n = e.finishedWork;
  var i = e.finishedLanes;
  if (n === null) return null;
  if (e.finishedWork = null, e.finishedLanes = 0, n === e.current) throw Error(b(177));
  e.callbackNode = null, e.callbackPriority = 0;
  var a = n.lanes | n.childLanes;
  if (U4(e, a), e === Pe && (ke = Pe = null, Re = 0), !(n.subtreeFlags & 2064) && !(n.flags & 2064) || $a || ($a = !0, hh(Io, function() {
    return jr(), null;
  })), a = (n.flags & 15990) !== 0, n.subtreeFlags & 15990 || a) {
    a = yt.transition, yt.transition = null;
    var o = re;
    re = 1;
    var s = J;
    J |= 4, Ic.current = null, iw(e, n), oh(n, e), L3(nu), Do = !!tu, nu = tu = null, e.current = n, aw(n), O4(), J = s, re = o, yt.transition = a;
  } else e.current = n;
  if ($a && ($a = !1, wn = e, Xo = i), a = e.pendingLanes, a === 0 && (En = null), j4(n.stateNode), Je(e, we()), t !== null) for (r = e.onRecoverableError, n = 0; n < t.length; n++) i = t[n], r(i.value, { componentStack: i.stack, digest: i.digest });
  if (Yo) throw Yo = !1, e = ku, ku = null, e;
  return Xo & 1 && e.tag !== 0 && jr(), a = e.pendingLanes, a & 1 ? e === Su ? Ii++ : (Ii = 0, Su = e) : Ii = 0, jn(), null;
}
function jr() {
  if (wn !== null) {
    var e = Zx(Xo), t = yt.transition, n = re;
    try {
      if (yt.transition = null, re = 16 > e ? 16 : e, wn === null) var r = !1;
      else {
        if (e = wn, wn = null, Xo = 0, J & 6) throw Error(b(331));
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
                      Ni(8, d, a);
                  }
                  var f = d.child;
                  if (f !== null) f.return = d, R = f;
                  else for (; R !== null; ) {
                    d = R;
                    var m = d.sibling, w = d.return;
                    if (rh(d), d === c) {
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
                Ni(9, a, a.return);
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
        if (J = i, jn(), Ut && typeof Ut.onPostCommitFiberRoot == "function") try {
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
  t = Qr(n, t), t = Zp(e, t, 1), e = bn(e, t, 1), t = Be(), e !== null && (_a(e, 1, t), Je(e, t));
}
function ge(e, t, n) {
  if (e.tag === 3) Id(e, e, n);
  else for (; t !== null; ) {
    if (t.tag === 3) {
      Id(t, e, n);
      break;
    } else if (t.tag === 1) {
      var r = t.stateNode;
      if (typeof t.type.getDerivedStateFromError == "function" || typeof r.componentDidCatch == "function" && (En === null || !En.has(r))) {
        e = Qr(n, e), e = Gp(t, e, 1), t = bn(t, e, 1), e = Be(), t !== null && (_a(t, 1, e), Je(t, e));
        break;
      }
    }
    t = t.return;
  }
}
function dw(e, t, n) {
  var r = e.pingCache;
  r !== null && r.delete(t), t = Be(), e.pingedLanes |= e.suspendedLanes & n, Pe === e && (Re & n) === n && (be === 4 || be === 3 && (Re & 130023424) === Re && 500 > we() - Dc ? Qn(e, 0) : Rc |= n), Je(e, t);
}
function xh(e, t) {
  t === 0 && (e.mode & 1 ? (t = Oa, Oa <<= 1, !(Oa & 130023424) && (Oa = 4194304)) : t = 1);
  var n = Be();
  e = sn(e, t), e !== null && (_a(e, t, n), Je(e, n));
}
function fw(e) {
  var t = e.memoizedState, n = 0;
  t !== null && (n = t.retryLane), xh(e, n);
}
function xw(e, t) {
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
  r !== null && r.delete(t), xh(e, n);
}
var ph;
ph = function(e, t, n) {
  if (e !== null) if (e.memoizedProps !== t.pendingProps || Xe.current) Ye = !0;
  else {
    if (!(e.lanes & n) && !(t.flags & 128)) return Ye = !1, ew(e, t, n);
    Ye = !!(e.flags & 131072);
  }
  else Ye = !1, xe && t.flags & 1048576 && gp(t, zo, t.index);
  switch (t.lanes = 0, t.tag) {
    case 2:
      var r = t.type;
      oo(e, t), e = t.pendingProps;
      var i = Zr(t, ze.current);
      Ar(t, n), i = Ec(null, t, r, e, i, n);
      var a = Tc();
      return t.flags |= 1, typeof i == "object" && i !== null && typeof i.render == "function" && i.$$typeof === void 0 ? (t.tag = 1, t.memoizedState = null, t.updateQueue = null, Qe(r) ? (a = !0, jo(t)) : a = !1, t.memoizedState = i.state !== null && i.state !== void 0 ? i.state : null, _c(t), i.updater = Es, t.stateNode = i, i._reactInternals = t, du(t, r, e, n), t = pu(null, t, r, !0, a, n)) : (t.tag = 0, xe && a && pc(t), Ve(null, t, i, n), t = t.child), t;
    case 16:
      r = t.elementType;
      e: {
        switch (oo(e, t), e = t.pendingProps, i = r._init, r = i(r._payload), t.type = r, i = t.tag = hw(r), e = bt(r, e), i) {
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
        if (Jp(t), e === null) throw Error(b(387));
        r = t.pendingProps, a = t.memoizedState, i = a.element, Cp(e, t), Bo(t, r, null, n);
        var o = t.memoizedState;
        if (r = o.element, a.isDehydrated) if (a = { element: r, isDehydrated: !1, cache: o.cache, pendingSuspenseBoundaries: o.pendingSuspenseBoundaries, transitions: o.transitions }, t.updateQueue.baseState = a, t.memoizedState = a, t.flags & 256) {
          i = Qr(Error(b(423)), t), t = kd(e, t, r, n, i);
          break e;
        } else if (r !== i) {
          i = Qr(Error(b(424)), t), t = kd(e, t, r, n, i);
          break e;
        } else for (at = Cn(t.stateNode.containerInfo.firstChild), lt = t, xe = !0, Tt = null, n = kp(t, null, r, n), t.child = n; n; ) n.flags = n.flags & -3 | 4096, n = n.sibling;
        else {
          if (Gr(), r === i) {
            t = ln(e, t, n);
            break e;
          }
          Ve(e, t, r, n);
        }
        t = t.child;
      }
      return t;
    case 5:
      return bp(t), e === null && lu(t), r = t.type, i = t.pendingProps, a = e !== null ? e.memoizedProps : null, o = i.children, ru(r, i) ? o = null : a !== null && ru(r, a) && (t.flags |= 32), Qp(e, t), Ve(e, t, o, n), t.child;
    case 6:
      return e === null && lu(t), null;
    case 13:
      return Kp(e, t, n);
    case 4:
      return kc(t, t.stateNode.containerInfo), r = t.pendingProps, e === null ? t.child = Yr(t, null, r, n) : Ve(e, t, r, n), t.child;
    case 11:
      return r = t.type, i = t.pendingProps, i = t.elementType === r ? i : bt(r, i), yd(e, t, r, i, n);
    case 7:
      return Ve(e, t, t.pendingProps, n), t.child;
    case 8:
      return Ve(e, t, t.pendingProps.children, n), t.child;
    case 12:
      return Ve(e, t, t.pendingProps.children, n), t.child;
    case 10:
      e: {
        if (r = t.type._context, i = t.pendingProps, a = t.memoizedProps, o = i.value, oe(Wo, r._currentValue), r._currentValue = o, a !== null) if (Dt(a.value, o)) {
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
        Ve(e, t, i.children, n), t = t.child;
      }
      return t;
    case 9:
      return i = t.type, r = t.pendingProps.children, Ar(t, n), i = wt(i), r = r(i), t.flags |= 1, Ve(e, t, r, n), t.child;
    case 14:
      return r = t.type, i = bt(r, t.pendingProps), i = bt(r.type, i), wd(e, t, r, i, n);
    case 15:
      return Yp(e, t, t.type, t.pendingProps, n);
    case 17:
      return r = t.type, i = t.pendingProps, i = t.elementType === r ? i : bt(r, i), oo(e, t), t.tag = 1, Qe(r) ? (e = !0, jo(t)) : e = !1, Ar(t, n), $p(t, r, i), du(t, r, i, n), pu(null, t, r, !0, e, n);
    case 19:
      return qp(e, t, n);
    case 22:
      return Xp(e, t, n);
  }
  throw Error(b(156, t.tag));
};
function hh(e, t) {
  return Vx(e, t);
}
function pw(e, t, n, r) {
  this.tag = e, this.key = n, this.sibling = this.child = this.return = this.stateNode = this.type = this.elementType = null, this.index = 0, this.ref = null, this.pendingProps = t, this.dependencies = this.memoizedState = this.updateQueue = this.memoizedProps = null, this.mode = r, this.subtreeFlags = this.flags = 0, this.deletions = null, this.childLanes = this.lanes = 0, this.alternate = null;
}
function gt(e, t, n, r) {
  return new pw(e, t, n, r);
}
function Ac(e) {
  return e = e.prototype, !(!e || !e.isReactComponent);
}
function hw(e) {
  if (typeof e == "function") return Ac(e) ? 1 : 0;
  if (e != null) {
    if (e = e.$$typeof, e === nc) return 11;
    if (e === rc) return 14;
  }
  return 2;
}
function Pn(e, t) {
  var n = e.alternate;
  return n === null ? (n = gt(e.tag, t, e.key, e.mode), n.elementType = e.elementType, n.type = e.type, n.stateNode = e.stateNode, n.alternate = e, e.alternate = n) : (n.pendingProps = t, n.type = e.type, n.flags = 0, n.subtreeFlags = 0, n.deletions = null), n.flags = e.flags & 14680064, n.childLanes = e.childLanes, n.lanes = e.lanes, n.child = e.child, n.memoizedProps = e.memoizedProps, n.memoizedState = e.memoizedState, n.updateQueue = e.updateQueue, t = e.dependencies, n.dependencies = t === null ? null : { lanes: t.lanes, firstContext: t.firstContext }, n.sibling = e.sibling, n.index = e.index, n.ref = e.ref, n;
}
function uo(e, t, n, r, i, a) {
  var o = 2;
  if (r = e, typeof e == "function") Ac(e) && (o = 1);
  else if (typeof e == "string") o = 5;
  else e: switch (e) {
    case wr:
      return Jn(n.children, i, a, t);
    case tc:
      o = 8, i |= 8;
      break;
    case Ol:
      return e = gt(12, n, t, i | 2), e.elementType = Ol, e.lanes = a, e;
    case Hl:
      return e = gt(13, n, t, i), e.elementType = Hl, e.lanes = a, e;
    case Al:
      return e = gt(19, n, t, i), e.elementType = Al, e.lanes = a, e;
    case bx:
      return Ns(n, i, a, t);
    default:
      if (typeof e == "object" && e !== null) switch (e.$$typeof) {
        case Sx:
          o = 10;
          break e;
        case Cx:
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
function Jn(e, t, n, r) {
  return e = gt(7, e, r, t), e.lanes = n, e;
}
function Ns(e, t, n, r) {
  return e = gt(22, e, r, t), e.elementType = bx, e.lanes = n, e.stateNode = { isHidden: !1 }, e;
}
function xl(e, t, n) {
  return e = gt(6, e, null, t), e.lanes = n, e;
}
function pl(e, t, n) {
  return t = gt(4, e.children !== null ? e.children : [], e.key, t), t.lanes = n, t.stateNode = { containerInfo: e.containerInfo, pendingChildren: null, implementation: e.implementation }, t;
}
function mw(e, t, n, r, i) {
  this.tag = t, this.containerInfo = e, this.finishedWork = this.pingCache = this.current = this.pendingChildren = null, this.timeoutHandle = -1, this.callbackNode = this.pendingContext = this.context = null, this.callbackPriority = 0, this.eventTimes = Ys(0), this.expirationTimes = Ys(-1), this.entangledLanes = this.finishedLanes = this.mutableReadLanes = this.expiredLanes = this.pingedLanes = this.suspendedLanes = this.pendingLanes = 0, this.entanglements = Ys(0), this.identifierPrefix = r, this.onRecoverableError = i, this.mutableSourceEagerHydrationData = null;
}
function jc(e, t, n, r, i, a, o, s, l) {
  return e = new mw(e, t, n, s, l), t === 1 ? (t = 1, a === !0 && (t |= 8)) : t = 0, a = gt(3, null, null, t), e.current = a, a.stateNode = e, a.memoizedState = { element: r, isDehydrated: n, cache: null, transitions: null, pendingSuspenseBoundaries: null }, _c(a), e;
}
function vw(e, t, n) {
  var r = 3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
  return { $$typeof: yr, key: r == null ? null : "" + r, children: e, containerInfo: t, implementation: n };
}
function mh(e) {
  if (!e) return Mn;
  e = e._reactInternals;
  e: {
    if (lr(e) !== e || e.tag !== 1) throw Error(b(170));
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
    if (Qe(n)) return mp(e, n, t);
  }
  return t;
}
function vh(e, t, n, r, i, a, o, s, l) {
  return e = jc(n, r, !0, e, i, a, o, s, l), e.context = mh(null), n = e.current, r = Be(), i = Tn(n), a = nn(r, i), a.callback = t ?? null, bn(n, a, i), e.current.lanes = i, _a(e, i, r), Je(e, r), e;
}
function Ls(e, t, n, r) {
  var i = t.current, a = Be(), o = Tn(i);
  return n = mh(n), t.context === null ? t.context = n : t.pendingContext = n, t = nn(a, o), t.payload = { element: e }, r = r === void 0 ? null : r, r !== null && (t.callback = r), e = bn(i, t, o), e !== null && (It(e, i, o, a), ro(e, i, o)), o;
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
function gw() {
  return null;
}
var gh = typeof reportError == "function" ? reportError : function(e) {
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
    ar(function() {
      Ls(null, e, null, null);
    }), t[on] = null;
  }
};
function Is(e) {
  this._internalRoot = e;
}
Is.prototype.unstable_scheduleHydration = function(e) {
  if (e) {
    var t = Xx();
    e = { blockedOn: null, target: e, priority: t };
    for (var n = 0; n < hn.length && t !== 0 && t < hn[n].priority; n++) ;
    hn.splice(n, 0, e), n === 0 && Jx(e);
  }
};
function Wc(e) {
  return !(!e || e.nodeType !== 1 && e.nodeType !== 9 && e.nodeType !== 11);
}
function Rs(e) {
  return !(!e || e.nodeType !== 1 && e.nodeType !== 9 && e.nodeType !== 11 && (e.nodeType !== 8 || e.nodeValue !== " react-mount-point-unstable "));
}
function Dd() {
}
function yw(e, t, n, r, i) {
  if (i) {
    if (typeof r == "function") {
      var a = r;
      r = function() {
        var c = Jo(o);
        a.call(c);
      };
    }
    var o = vh(t, r, e, 0, null, !1, !1, "", Dd);
    return e._reactRootContainer = o, e[on] = o.current, oa(e.nodeType === 8 ? e.parentNode : e), ar(), o;
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
  return e._reactRootContainer = l, e[on] = l.current, oa(e.nodeType === 8 ? e.parentNode : e), ar(function() {
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
  } else o = yw(n, t, e, i, r);
  return Jo(o);
}
Gx = function(e) {
  switch (e.tag) {
    case 3:
      var t = e.stateNode;
      if (t.current.memoizedState.isDehydrated) {
        var n = yi(t.pendingLanes);
        n !== 0 && (oc(t, n | 1), Je(t, we()), !(J & 6) && (Jr = we() + 500, jn()));
      }
      break;
    case 13:
      ar(function() {
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
Yx = function(e) {
  if (e.tag === 13) {
    var t = Tn(e), n = sn(e, t);
    if (n !== null) {
      var r = Be();
      It(n, e, t, r);
    }
    Fc(e, t);
  }
};
Xx = function() {
  return re;
};
Qx = function(e, t) {
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
            Tx(r), zl(r, i);
          }
        }
      }
      break;
    case "textarea":
      Nx(e, n);
      break;
    case "select":
      t = n.value, t != null && Dr(e, !!n.multiple, t, !1);
  }
};
Hx = Mc;
Ax = ar;
var ww = { usingClientEntryPoint: !1, Events: [Sa, Cr, Ss, Mx, Ox, Mc] }, pi = { findFiberByHostInstance: Zn, bundleType: 0, version: "18.3.1", rendererPackageName: "react-dom" }, _w = { bundleType: pi.bundleType, version: pi.version, rendererPackageName: pi.rendererPackageName, rendererConfig: pi.rendererConfig, overrideHookState: null, overrideHookStateDeletePath: null, overrideHookStateRenamePath: null, overrideProps: null, overridePropsDeletePath: null, overridePropsRenamePath: null, setErrorHandler: null, setSuspenseHandler: null, scheduleUpdate: null, currentDispatcherRef: un.ReactCurrentDispatcher, findHostInstanceByFiber: function(e) {
  return e = zx(e), e === null ? null : e.stateNode;
}, findFiberByHostInstance: pi.findFiberByHostInstance || gw, findHostInstancesForRefresh: null, scheduleRefresh: null, scheduleRoot: null, setRefreshHandler: null, getCurrentFiber: null, reconcilerVersion: "18.3.1-next-f1338f8080-20240426" };
if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < "u") {
  var Za = __REACT_DEVTOOLS_GLOBAL_HOOK__;
  if (!Za.isDisabled && Za.supportsFiber) try {
    ys = Za.inject(_w), Ut = Za;
  } catch {
  }
}
dt.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = ww;
dt.createPortal = function(e, t) {
  var n = 2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
  if (!Wc(t)) throw Error(b(200));
  return vw(e, t, null, n);
};
dt.createRoot = function(e, t) {
  if (!Wc(e)) throw Error(b(299));
  var n = !1, r = "", i = gh;
  return t != null && (t.unstable_strictMode === !0 && (n = !0), t.identifierPrefix !== void 0 && (r = t.identifierPrefix), t.onRecoverableError !== void 0 && (i = t.onRecoverableError)), t = jc(e, 1, !1, null, null, n, !1, r, i), e[on] = t.current, oa(e.nodeType === 8 ? e.parentNode : e), new zc(t);
};
dt.findDOMNode = function(e) {
  if (e == null) return null;
  if (e.nodeType === 1) return e;
  var t = e._reactInternals;
  if (t === void 0)
    throw typeof e.render == "function" ? Error(b(188)) : (e = Object.keys(e).join(","), Error(b(268, e)));
  return e = zx(t), e = e === null ? null : e.stateNode, e;
};
dt.flushSync = function(e) {
  return ar(e);
};
dt.hydrate = function(e, t, n) {
  if (!Rs(t)) throw Error(b(200));
  return Ds(null, e, t, !0, n);
};
dt.hydrateRoot = function(e, t, n) {
  if (!Wc(e)) throw Error(b(405));
  var r = n != null && n.hydratedSources || null, i = !1, a = "", o = gh;
  if (n != null && (n.unstable_strictMode === !0 && (i = !0), n.identifierPrefix !== void 0 && (a = n.identifierPrefix), n.onRecoverableError !== void 0 && (o = n.onRecoverableError)), t = vh(t, null, e, 1, n ?? null, i, !1, a, o), e[on] = t.current, oa(e), r) for (e = 0; e < r.length; e++) n = r[e], i = n._getVersion, i = i(n._source), t.mutableSourceEagerHydrationData == null ? t.mutableSourceEagerHydrationData = [n, i] : t.mutableSourceEagerHydrationData.push(
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
  return e._reactRootContainer ? (ar(function() {
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
function yh() {
  if (!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > "u" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != "function"))
    try {
      __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(yh);
    } catch (e) {
      console.error(e);
    }
}
yh(), yx.exports = dt;
var kw = yx.exports, co, Sw = kw;
co = Sw.createRoot;
var Md;
const wh = "procaptcha.bundle.js", _h = () => document.querySelector('script[src*="'.concat(wh, '"]')), Cw = (e) => {
  const t = _h();
  if (t && t.src.indexOf("".concat(e)) !== -1) {
    const n = new URLSearchParams(t.src.split("?")[1]);
    return {
      onloadUrlCallback: n.get("onload") || void 0,
      renderExplicit: n.get("render") || void 0
    };
  }
  return { onloadUrlCallback: void 0, renderExplicit: void 0 };
}, kh = (e) => (e || (e = ""), x4.parse({
  defaultEnvironment: To.parse("production"),
  defaultNetwork: gn.parse("astar"),
  userAccountAddress: "",
  account: {
    address: e
  },
  serverUrl: "",
  mongoAtlasUri: "",
  devOnlyWatchEvents: !1
})), bw = (e) => e.closest("form"), Un = (e) => {
  const t = window[e.replace("window.", "")];
  if (typeof t != "function")
    throw new Error("Callback ".concat(e, " is not defined on the window object"));
  return t;
}, Eu = (e, t) => {
  Ft();
  const n = bw(e);
  if (!n) {
    console.error("Parent form not found for the element:", e);
    return;
  }
  const r = document.createElement("input");
  r.type = "hidden", r.name = D.procaptchaResponse, r.value = t, n.appendChild(r);
}, Ew = /* @__PURE__ */ new Set(["light", "dark"]), Tw = (e) => Ew.has(e) ? e : "light", Pw = (e, t, n) => {
  const r = (e == null ? void 0 : e["challenge-valid-length"]) || t.getAttribute("data-challenge-valid-length");
  r && (n.captchas.image.solutionTimeout = Number.parseInt(r), n.captchas.pow.solutionTimeout = Number.parseInt(r));
}, Ft = () => {
  Array.from(document.getElementsByName(D.procaptchaResponse)).map((t) => t.remove());
}, Nw = (e) => ({
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
}), Lw = (e, t, n) => {
  const r = (e == null ? void 0 : e.theme) || t.getAttribute("data-theme") || "light";
  n.theme = Tw(r);
};
function Iw(e, t, n) {
  if (typeof (e == null ? void 0 : e.callback) == "function") {
    const r = e.callback;
    t.onHuman = (i) => {
      Eu(n, i), r(i);
    };
  } else {
    const r = typeof (e == null ? void 0 : e.callback) == "string" ? e == null ? void 0 : e.callback : n.getAttribute("data-callback");
    r && (t.onHuman = (i) => {
      Eu(n, i), Un(r)(i);
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
      const i = Un(r);
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
      const i = Un(r);
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
      const i = Un(r);
      Ft(), i();
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
const Sh = (e, t, n) => {
  for (const r of e) {
    const i = Nw(r);
    switch (Iw(n, i, r), Lw(n, r, t), Pw(n, r, t), n == null ? void 0 : n.captchaType) {
      case "pow":
        co(r).render(Wt.jsx(vx, { config: t, callbacks: i }));
        break;
      case "frictionless":
        co(r).render(Wt.jsx(v4, { config: t, callbacks: i }));
        break;
      default:
        co(r).render(Wt.jsx(gx, { config: t, callbacks: i }));
        break;
    }
  }
}, Rw = () => {
  const e = Array.from(document.getElementsByClassName("procaptcha"));
  if (e.length) {
    const t = w0(e, 0).getAttribute("data-sitekey");
    if (!t) {
      console.error("No siteKey found");
      return;
    }
    const r = Object.values(Dl).find((i) => i === w0(e, 0).getAttribute("data-captcha-type")) || "frictionless";
    Sh(e, kh(t), { captchaType: r, siteKey: t });
  }
}, Dw = (e, t) => {
  const n = t.siteKey;
  Sh([e], kh(n), t);
};
function Vc(e) {
  document && document.readyState !== "loading" ? e() : document.addEventListener("DOMContentLoaded", e);
}
window.procaptcha = { ready: Vc, render: Dw };
const { onloadUrlCallback: Od, renderExplicit: Mw } = Cw(wh);
Mw !== "explicit" && Vc(Rw);
if (Od) {
  const e = Un(Od);
  (Md = _h()) == null || Md.addEventListener("load", () => {
    Vc(e);
  });
}
export {
  D as A,
  bh as B,
  y2 as C,
  Ow as D,
  ya as E,
  Hw as F,
  ht as G,
  zw as H,
  Dw as I,
  Vc as J,
  _2 as L,
  x4 as P,
  Wh as R,
  Ww as S,
  Cf as T,
  Pf as W,
  w0 as a,
  vn as b,
  w2 as c,
  If as d,
  Fw as e,
  h2 as f,
  v2 as g,
  g2 as h,
  m2 as i,
  $ as j,
  p2 as k,
  Lf as l,
  f2 as m,
  x2 as n,
  E2 as o,
  gf as p,
  kf as q,
  ae as r,
  wf as s,
  e2 as t,
  jw as u,
  Bu as v,
  Sf as w,
  vf as x,
  T2 as y,
  rt as z
};
