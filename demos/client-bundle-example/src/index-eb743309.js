function $p(e, t) {
  for (var n = 0; n < t.length; n++) {
    const r = t[n];
    if (typeof r != "string" && !Array.isArray(r)) {
      for (const i in r)
        if (i !== "default" && !(i in e)) {
          const o = Object.getOwnPropertyDescriptor(r, i);
          o && Object.defineProperty(e, i, o.get ? o : {
            enumerable: !0,
            get: () => r[i]
          });
        }
    }
  }
  return Object.freeze(Object.defineProperty(e, Symbol.toStringTag, { value: "Module" }));
}
var Z0 = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {};
function Dp(e) {
  return e && e.__esModule && Object.prototype.hasOwnProperty.call(e, "default") ? e.default : e;
}
function V0(e) {
  if (e.__esModule)
    return e;
  var t = e.default;
  if (typeof t == "function") {
    var n = function r() {
      return this instanceof r ? Reflect.construct(t, arguments, this.constructor) : t.apply(this, arguments);
    };
    n.prototype = t.prototype;
  } else
    n = {};
  return Object.defineProperty(n, "__esModule", { value: !0 }), Object.keys(e).forEach(function(r) {
    var i = Object.getOwnPropertyDescriptor(e, r);
    Object.defineProperty(n, r, i.get ? i : {
      enumerable: !0,
      get: function() {
        return e[r];
      }
    });
  }), n;
}
var jc = { exports: {} }, Vo = {}, Ac = { exports: {} }, V = {};
var hi = Symbol.for("react.element"), Zp = Symbol.for("react.portal"), Vp = Symbol.for("react.fragment"), Up = Symbol.for("react.strict_mode"), Fp = Symbol.for("react.profiler"), Bp = Symbol.for("react.provider"), Wp = Symbol.for("react.context"), Hp = Symbol.for("react.forward_ref"), Qp = Symbol.for("react.suspense"), qp = Symbol.for("react.memo"), Kp = Symbol.for("react.lazy"), au = Symbol.iterator;
function Yp(e) {
  return e === null || typeof e != "object" ? null : (e = au && e[au] || e["@@iterator"], typeof e == "function" ? e : null);
}
var $c = { isMounted: function() {
  return !1;
}, enqueueForceUpdate: function() {
}, enqueueReplaceState: function() {
}, enqueueSetState: function() {
} }, Dc = Object.assign, Zc = {};
function lr(e, t, n) {
  this.props = e, this.context = t, this.refs = Zc, this.updater = n || $c;
}
lr.prototype.isReactComponent = {};
lr.prototype.setState = function(e, t) {
  if (typeof e != "object" && typeof e != "function" && e != null)
    throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");
  this.updater.enqueueSetState(this, e, t, "setState");
};
lr.prototype.forceUpdate = function(e) {
  this.updater.enqueueForceUpdate(this, e, "forceUpdate");
};
function Vc() {
}
Vc.prototype = lr.prototype;
function na(e, t, n) {
  this.props = e, this.context = t, this.refs = Zc, this.updater = n || $c;
}
var ra = na.prototype = new Vc();
ra.constructor = na;
Dc(ra, lr.prototype);
ra.isPureReactComponent = !0;
var uu = Array.isArray, Uc = Object.prototype.hasOwnProperty, ia = { current: null }, Fc = { key: !0, ref: !0, __self: !0, __source: !0 };
function Bc(e, t, n) {
  var r, i = {}, o = null, l = null;
  if (t != null)
    for (r in t.ref !== void 0 && (l = t.ref), t.key !== void 0 && (o = "" + t.key), t)
      Uc.call(t, r) && !Fc.hasOwnProperty(r) && (i[r] = t[r]);
  var s = arguments.length - 2;
  if (s === 1)
    i.children = n;
  else if (1 < s) {
    for (var a = Array(s), u = 0; u < s; u++)
      a[u] = arguments[u + 2];
    i.children = a;
  }
  if (e && e.defaultProps)
    for (r in s = e.defaultProps, s)
      i[r] === void 0 && (i[r] = s[r]);
  return { $$typeof: hi, type: e, key: o, ref: l, props: i, _owner: ia.current };
}
function Gp(e, t) {
  return { $$typeof: hi, type: e.type, key: t, ref: e.ref, props: e.props, _owner: e._owner };
}
function oa(e) {
  return typeof e == "object" && e !== null && e.$$typeof === hi;
}
function Xp(e) {
  var t = { "=": "=0", ":": "=2" };
  return "$" + e.replace(/[=:]/g, function(n) {
    return t[n];
  });
}
var cu = /\/+/g;
function kl(e, t) {
  return typeof e == "object" && e !== null && e.key != null ? Xp("" + e.key) : t.toString(36);
}
function Fi(e, t, n, r, i) {
  var o = typeof e;
  (o === "undefined" || o === "boolean") && (e = null);
  var l = !1;
  if (e === null)
    l = !0;
  else
    switch (o) {
      case "string":
      case "number":
        l = !0;
        break;
      case "object":
        switch (e.$$typeof) {
          case hi:
          case Zp:
            l = !0;
        }
    }
  if (l)
    return l = e, i = i(l), e = r === "" ? "." + kl(l, 0) : r, uu(i) ? (n = "", e != null && (n = e.replace(cu, "$&/") + "/"), Fi(i, t, n, "", function(u) {
      return u;
    })) : i != null && (oa(i) && (i = Gp(i, n + (!i.key || l && l.key === i.key ? "" : ("" + i.key).replace(cu, "$&/") + "/") + e)), t.push(i)), 1;
  if (l = 0, r = r === "" ? "." : r + ":", uu(e))
    for (var s = 0; s < e.length; s++) {
      o = e[s];
      var a = r + kl(o, s);
      l += Fi(o, t, n, a, i);
    }
  else if (a = Yp(e), typeof a == "function")
    for (e = a.call(e), s = 0; !(o = e.next()).done; )
      o = o.value, a = r + kl(o, s++), l += Fi(o, t, n, a, i);
  else if (o === "object")
    throw t = String(e), Error("Objects are not valid as a React child (found: " + (t === "[object Object]" ? "object with keys {" + Object.keys(e).join(", ") + "}" : t) + "). If you meant to render a collection of children, use an array instead.");
  return l;
}
function Ci(e, t, n) {
  if (e == null)
    return e;
  var r = [], i = 0;
  return Fi(e, r, "", "", function(o) {
    return t.call(n, o, i++);
  }), r;
}
function Jp(e) {
  if (e._status === -1) {
    var t = e._result;
    t = t(), t.then(function(n) {
      (e._status === 0 || e._status === -1) && (e._status = 1, e._result = n);
    }, function(n) {
      (e._status === 0 || e._status === -1) && (e._status = 2, e._result = n);
    }), e._status === -1 && (e._status = 0, e._result = t);
  }
  if (e._status === 1)
    return e._result.default;
  throw e._result;
}
var Me = { current: null }, Bi = { transition: null }, bp = { ReactCurrentDispatcher: Me, ReactCurrentBatchConfig: Bi, ReactCurrentOwner: ia };
V.Children = { map: Ci, forEach: function(e, t, n) {
  Ci(e, function() {
    t.apply(this, arguments);
  }, n);
}, count: function(e) {
  var t = 0;
  return Ci(e, function() {
    t++;
  }), t;
}, toArray: function(e) {
  return Ci(e, function(t) {
    return t;
  }) || [];
}, only: function(e) {
  if (!oa(e))
    throw Error("React.Children.only expected to receive a single React element child.");
  return e;
} };
V.Component = lr;
V.Fragment = Vp;
V.Profiler = Fp;
V.PureComponent = na;
V.StrictMode = Up;
V.Suspense = Qp;
V.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = bp;
V.cloneElement = function(e, t, n) {
  if (e == null)
    throw Error("React.cloneElement(...): The argument must be a React element, but you passed " + e + ".");
  var r = Dc({}, e.props), i = e.key, o = e.ref, l = e._owner;
  if (t != null) {
    if (t.ref !== void 0 && (o = t.ref, l = ia.current), t.key !== void 0 && (i = "" + t.key), e.type && e.type.defaultProps)
      var s = e.type.defaultProps;
    for (a in t)
      Uc.call(t, a) && !Fc.hasOwnProperty(a) && (r[a] = t[a] === void 0 && s !== void 0 ? s[a] : t[a]);
  }
  var a = arguments.length - 2;
  if (a === 1)
    r.children = n;
  else if (1 < a) {
    s = Array(a);
    for (var u = 0; u < a; u++)
      s[u] = arguments[u + 2];
    r.children = s;
  }
  return { $$typeof: hi, type: e.type, key: i, ref: o, props: r, _owner: l };
};
V.createContext = function(e) {
  return e = { $$typeof: Wp, _currentValue: e, _currentValue2: e, _threadCount: 0, Provider: null, Consumer: null, _defaultValue: null, _globalName: null }, e.Provider = { $$typeof: Bp, _context: e }, e.Consumer = e;
};
V.createElement = Bc;
V.createFactory = function(e) {
  var t = Bc.bind(null, e);
  return t.type = e, t;
};
V.createRef = function() {
  return { current: null };
};
V.forwardRef = function(e) {
  return { $$typeof: Hp, render: e };
};
V.isValidElement = oa;
V.lazy = function(e) {
  return { $$typeof: Kp, _payload: { _status: -1, _result: e }, _init: Jp };
};
V.memo = function(e, t) {
  return { $$typeof: qp, type: e, compare: t === void 0 ? null : t };
};
V.startTransition = function(e) {
  var t = Bi.transition;
  Bi.transition = {};
  try {
    e();
  } finally {
    Bi.transition = t;
  }
};
V.unstable_act = function() {
  throw Error("act(...) is not supported in production builds of React.");
};
V.useCallback = function(e, t) {
  return Me.current.useCallback(e, t);
};
V.useContext = function(e) {
  return Me.current.useContext(e);
};
V.useDebugValue = function() {
};
V.useDeferredValue = function(e) {
  return Me.current.useDeferredValue(e);
};
V.useEffect = function(e, t) {
  return Me.current.useEffect(e, t);
};
V.useId = function() {
  return Me.current.useId();
};
V.useImperativeHandle = function(e, t, n) {
  return Me.current.useImperativeHandle(e, t, n);
};
V.useInsertionEffect = function(e, t) {
  return Me.current.useInsertionEffect(e, t);
};
V.useLayoutEffect = function(e, t) {
  return Me.current.useLayoutEffect(e, t);
};
V.useMemo = function(e, t) {
  return Me.current.useMemo(e, t);
};
V.useReducer = function(e, t, n) {
  return Me.current.useReducer(e, t, n);
};
V.useRef = function(e) {
  return Me.current.useRef(e);
};
V.useState = function(e) {
  return Me.current.useState(e);
};
V.useSyncExternalStore = function(e, t, n) {
  return Me.current.useSyncExternalStore(e, t, n);
};
V.useTransition = function() {
  return Me.current.useTransition();
};
V.version = "18.2.0";
Ac.exports = V;
var oe = Ac.exports;
const eh = /* @__PURE__ */ Dp(oe), du = /* @__PURE__ */ $p({
  __proto__: null,
  default: eh
}, [oe]);
var th = oe, nh = Symbol.for("react.element"), rh = Symbol.for("react.fragment"), ih = Object.prototype.hasOwnProperty, oh = th.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner, lh = { key: !0, ref: !0, __self: !0, __source: !0 };
function Wc(e, t, n) {
  var r, i = {}, o = null, l = null;
  n !== void 0 && (o = "" + n), t.key !== void 0 && (o = "" + t.key), t.ref !== void 0 && (l = t.ref);
  for (r in t)
    ih.call(t, r) && !lh.hasOwnProperty(r) && (i[r] = t[r]);
  if (e && e.defaultProps)
    for (r in t = e.defaultProps, t)
      i[r] === void 0 && (i[r] = t[r]);
  return { $$typeof: nh, type: e, key: o, ref: l, props: i, _owner: oh.current };
}
Vo.Fragment = rh;
Vo.jsx = Wc;
Vo.jsxs = Wc;
jc.exports = Vo;
var zr = jc.exports, F;
(function(e) {
  e.assertEqual = (i) => i;
  function t(i) {
  }
  e.assertIs = t;
  function n(i) {
    throw new Error();
  }
  e.assertNever = n, e.arrayToEnum = (i) => {
    const o = {};
    for (const l of i)
      o[l] = l;
    return o;
  }, e.getValidEnumValues = (i) => {
    const o = e.objectKeys(i).filter((s) => typeof i[i[s]] != "number"), l = {};
    for (const s of o)
      l[s] = i[s];
    return e.objectValues(l);
  }, e.objectValues = (i) => e.objectKeys(i).map(function(o) {
    return i[o];
  }), e.objectKeys = typeof Object.keys == "function" ? (i) => Object.keys(i) : (i) => {
    const o = [];
    for (const l in i)
      Object.prototype.hasOwnProperty.call(i, l) && o.push(l);
    return o;
  }, e.find = (i, o) => {
    for (const l of i)
      if (o(l))
        return l;
  }, e.isInteger = typeof Number.isInteger == "function" ? (i) => Number.isInteger(i) : (i) => typeof i == "number" && isFinite(i) && Math.floor(i) === i;
  function r(i, o = " | ") {
    return i.map((l) => typeof l == "string" ? `'${l}'` : l).join(o);
  }
  e.joinValues = r, e.jsonStringifyReplacer = (i, o) => typeof o == "bigint" ? o.toString() : o;
})(F || (F = {}));
var Jl;
(function(e) {
  e.mergeShapes = (t, n) => ({
    ...t,
    ...n
    // second overwrites first
  });
})(Jl || (Jl = {}));
const E = F.arrayToEnum([
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
]), $t = (e) => {
  switch (typeof e) {
    case "undefined":
      return E.undefined;
    case "string":
      return E.string;
    case "number":
      return isNaN(e) ? E.nan : E.number;
    case "boolean":
      return E.boolean;
    case "function":
      return E.function;
    case "bigint":
      return E.bigint;
    case "symbol":
      return E.symbol;
    case "object":
      return Array.isArray(e) ? E.array : e === null ? E.null : e.then && typeof e.then == "function" && e.catch && typeof e.catch == "function" ? E.promise : typeof Map < "u" && e instanceof Map ? E.map : typeof Set < "u" && e instanceof Set ? E.set : typeof Date < "u" && e instanceof Date ? E.date : E.object;
    default:
      return E.unknown;
  }
}, k = F.arrayToEnum([
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
]), sh = (e) => JSON.stringify(e, null, 2).replace(/"([^"]+)":/g, "$1:");
class ot extends Error {
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
    const n = t || function(o) {
      return o.message;
    }, r = { _errors: [] }, i = (o) => {
      for (const l of o.issues)
        if (l.code === "invalid_union")
          l.unionErrors.map(i);
        else if (l.code === "invalid_return_type")
          i(l.returnTypeError);
        else if (l.code === "invalid_arguments")
          i(l.argumentsError);
        else if (l.path.length === 0)
          r._errors.push(n(l));
        else {
          let s = r, a = 0;
          for (; a < l.path.length; ) {
            const u = l.path[a];
            a === l.path.length - 1 ? (s[u] = s[u] || { _errors: [] }, s[u]._errors.push(n(l))) : s[u] = s[u] || { _errors: [] }, s = s[u], a++;
          }
        }
    };
    return i(this), r;
  }
  toString() {
    return this.message;
  }
  get message() {
    return JSON.stringify(this.issues, F.jsonStringifyReplacer, 2);
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
ot.create = (e) => new ot(e);
const jr = (e, t) => {
  let n;
  switch (e.code) {
    case k.invalid_type:
      e.received === E.undefined ? n = "Required" : n = `Expected ${e.expected}, received ${e.received}`;
      break;
    case k.invalid_literal:
      n = `Invalid literal value, expected ${JSON.stringify(e.expected, F.jsonStringifyReplacer)}`;
      break;
    case k.unrecognized_keys:
      n = `Unrecognized key(s) in object: ${F.joinValues(e.keys, ", ")}`;
      break;
    case k.invalid_union:
      n = "Invalid input";
      break;
    case k.invalid_union_discriminator:
      n = `Invalid discriminator value. Expected ${F.joinValues(e.options)}`;
      break;
    case k.invalid_enum_value:
      n = `Invalid enum value. Expected ${F.joinValues(e.options)}, received '${e.received}'`;
      break;
    case k.invalid_arguments:
      n = "Invalid function arguments";
      break;
    case k.invalid_return_type:
      n = "Invalid function return type";
      break;
    case k.invalid_date:
      n = "Invalid date";
      break;
    case k.invalid_string:
      typeof e.validation == "object" ? "includes" in e.validation ? (n = `Invalid input: must include "${e.validation.includes}"`, typeof e.validation.position == "number" && (n = `${n} at one or more positions greater than or equal to ${e.validation.position}`)) : "startsWith" in e.validation ? n = `Invalid input: must start with "${e.validation.startsWith}"` : "endsWith" in e.validation ? n = `Invalid input: must end with "${e.validation.endsWith}"` : F.assertNever(e.validation) : e.validation !== "regex" ? n = `Invalid ${e.validation}` : n = "Invalid";
      break;
    case k.too_small:
      e.type === "array" ? n = `Array must contain ${e.exact ? "exactly" : e.inclusive ? "at least" : "more than"} ${e.minimum} element(s)` : e.type === "string" ? n = `String must contain ${e.exact ? "exactly" : e.inclusive ? "at least" : "over"} ${e.minimum} character(s)` : e.type === "number" ? n = `Number must be ${e.exact ? "exactly equal to " : e.inclusive ? "greater than or equal to " : "greater than "}${e.minimum}` : e.type === "date" ? n = `Date must be ${e.exact ? "exactly equal to " : e.inclusive ? "greater than or equal to " : "greater than "}${new Date(Number(e.minimum))}` : n = "Invalid input";
      break;
    case k.too_big:
      e.type === "array" ? n = `Array must contain ${e.exact ? "exactly" : e.inclusive ? "at most" : "less than"} ${e.maximum} element(s)` : e.type === "string" ? n = `String must contain ${e.exact ? "exactly" : e.inclusive ? "at most" : "under"} ${e.maximum} character(s)` : e.type === "number" ? n = `Number must be ${e.exact ? "exactly" : e.inclusive ? "less than or equal to" : "less than"} ${e.maximum}` : e.type === "bigint" ? n = `BigInt must be ${e.exact ? "exactly" : e.inclusive ? "less than or equal to" : "less than"} ${e.maximum}` : e.type === "date" ? n = `Date must be ${e.exact ? "exactly" : e.inclusive ? "smaller than or equal to" : "smaller than"} ${new Date(Number(e.maximum))}` : n = "Invalid input";
      break;
    case k.custom:
      n = "Invalid input";
      break;
    case k.invalid_intersection_types:
      n = "Intersection results could not be merged";
      break;
    case k.not_multiple_of:
      n = `Number must be a multiple of ${e.multipleOf}`;
      break;
    case k.not_finite:
      n = "Number must be finite";
      break;
    default:
      n = t.defaultError, F.assertNever(e);
  }
  return { message: n };
};
let Hc = jr;
function ah(e) {
  Hc = e;
}
function io() {
  return Hc;
}
const oo = (e) => {
  const { data: t, path: n, errorMaps: r, issueData: i } = e, o = [...n, ...i.path || []], l = {
    ...i,
    path: o
  };
  let s = "";
  const a = r.filter((u) => !!u).slice().reverse();
  for (const u of a)
    s = u(l, { data: t, defaultError: s }).message;
  return {
    ...i,
    path: o,
    message: i.message || s
  };
}, uh = [];
function T(e, t) {
  const n = oo({
    issueData: t,
    data: e.data,
    path: e.path,
    errorMaps: [
      e.common.contextualErrorMap,
      e.schemaErrorMap,
      io(),
      jr
      // then global default map
    ].filter((r) => !!r)
  });
  e.common.issues.push(n);
}
class Te {
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
    for (const i of n)
      r.push({
        key: await i.key,
        value: await i.value
      });
    return Te.mergeObjectSync(t, r);
  }
  static mergeObjectSync(t, n) {
    const r = {};
    for (const i of n) {
      const { key: o, value: l } = i;
      if (o.status === "aborted" || l.status === "aborted")
        return z;
      o.status === "dirty" && t.dirty(), l.status === "dirty" && t.dirty(), o.value !== "__proto__" && (typeof l.value < "u" || i.alwaysSet) && (r[o.value] = l.value);
    }
    return { status: t.value, value: r };
  }
}
const z = Object.freeze({
  status: "aborted"
}), Qc = (e) => ({ status: "dirty", value: e }), Re = (e) => ({ status: "valid", value: e }), bl = (e) => e.status === "aborted", es = (e) => e.status === "dirty", Ar = (e) => e.status === "valid", lo = (e) => typeof Promise < "u" && e instanceof Promise;
var R;
(function(e) {
  e.errToObj = (t) => typeof t == "string" ? { message: t } : t || {}, e.toString = (t) => typeof t == "string" ? t : t == null ? void 0 : t.message;
})(R || (R = {}));
class wt {
  constructor(t, n, r, i) {
    this._cachedPath = [], this.parent = t, this.data = n, this._path = r, this._key = i;
  }
  get path() {
    return this._cachedPath.length || (this._key instanceof Array ? this._cachedPath.push(...this._path, ...this._key) : this._cachedPath.push(...this._path, this._key)), this._cachedPath;
  }
}
const fu = (e, t) => {
  if (Ar(t))
    return { success: !0, data: t.value };
  if (!e.common.issues.length)
    throw new Error("Validation failed but no issues detected.");
  return {
    success: !1,
    get error() {
      if (this._error)
        return this._error;
      const n = new ot(e.common.issues);
      return this._error = n, this._error;
    }
  };
};
function j(e) {
  if (!e)
    return {};
  const { errorMap: t, invalid_type_error: n, required_error: r, description: i } = e;
  if (t && (n || r))
    throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
  return t ? { errorMap: t, description: i } : { errorMap: (l, s) => l.code !== "invalid_type" ? { message: s.defaultError } : typeof s.data > "u" ? { message: r ?? s.defaultError } : { message: n ?? s.defaultError }, description: i };
}
class D {
  constructor(t) {
    this.spa = this.safeParseAsync, this._def = t, this.parse = this.parse.bind(this), this.safeParse = this.safeParse.bind(this), this.parseAsync = this.parseAsync.bind(this), this.safeParseAsync = this.safeParseAsync.bind(this), this.spa = this.spa.bind(this), this.refine = this.refine.bind(this), this.refinement = this.refinement.bind(this), this.superRefine = this.superRefine.bind(this), this.optional = this.optional.bind(this), this.nullable = this.nullable.bind(this), this.nullish = this.nullish.bind(this), this.array = this.array.bind(this), this.promise = this.promise.bind(this), this.or = this.or.bind(this), this.and = this.and.bind(this), this.transform = this.transform.bind(this), this.brand = this.brand.bind(this), this.default = this.default.bind(this), this.catch = this.catch.bind(this), this.describe = this.describe.bind(this), this.pipe = this.pipe.bind(this), this.readonly = this.readonly.bind(this), this.isNullable = this.isNullable.bind(this), this.isOptional = this.isOptional.bind(this);
  }
  get description() {
    return this._def.description;
  }
  _getType(t) {
    return $t(t.data);
  }
  _getOrReturnCtx(t, n) {
    return n || {
      common: t.parent.common,
      data: t.data,
      parsedType: $t(t.data),
      schemaErrorMap: this._def.errorMap,
      path: t.path,
      parent: t.parent
    };
  }
  _processInputParams(t) {
    return {
      status: new Te(),
      ctx: {
        common: t.parent.common,
        data: t.data,
        parsedType: $t(t.data),
        schemaErrorMap: this._def.errorMap,
        path: t.path,
        parent: t.parent
      }
    };
  }
  _parseSync(t) {
    const n = this._parse(t);
    if (lo(n))
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
      parsedType: $t(t)
    }, o = this._parseSync({ data: t, path: i.path, parent: i });
    return fu(i, o);
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
      parsedType: $t(t)
    }, i = this._parse({ data: t, path: r.path, parent: r }), o = await (lo(i) ? i : Promise.resolve(i));
    return fu(r, o);
  }
  refine(t, n) {
    const r = (i) => typeof n == "string" || typeof n > "u" ? { message: n } : typeof n == "function" ? n(i) : n;
    return this._refinement((i, o) => {
      const l = t(i), s = () => o.addIssue({
        code: k.custom,
        ...r(i)
      });
      return typeof Promise < "u" && l instanceof Promise ? l.then((a) => a ? !0 : (s(), !1)) : l ? !0 : (s(), !1);
    });
  }
  refinement(t, n) {
    return this._refinement((r, i) => t(r) ? !0 : (i.addIssue(typeof n == "function" ? n(r, i) : n), !1));
  }
  _refinement(t) {
    return new ut({
      schema: this,
      typeName: M.ZodEffects,
      effect: { type: "refinement", refinement: t }
    });
  }
  superRefine(t) {
    return this._refinement(t);
  }
  optional() {
    return Et.create(this, this._def);
  }
  nullable() {
    return _n.create(this, this._def);
  }
  nullish() {
    return this.nullable().optional();
  }
  array() {
    return lt.create(this, this._def);
  }
  promise() {
    return Xn.create(this, this._def);
  }
  or(t) {
    return Vr.create([this, t], this._def);
  }
  and(t) {
    return Ur.create(this, t, this._def);
  }
  transform(t) {
    return new ut({
      ...j(this._def),
      schema: this,
      typeName: M.ZodEffects,
      effect: { type: "transform", transform: t }
    });
  }
  default(t) {
    const n = typeof t == "function" ? t : () => t;
    return new Qr({
      ...j(this._def),
      innerType: this,
      defaultValue: n,
      typeName: M.ZodDefault
    });
  }
  brand() {
    return new Kc({
      typeName: M.ZodBranded,
      type: this,
      ...j(this._def)
    });
  }
  catch(t) {
    const n = typeof t == "function" ? t : () => t;
    return new co({
      ...j(this._def),
      innerType: this,
      catchValue: n,
      typeName: M.ZodCatch
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
    return mi.create(this, t);
  }
  readonly() {
    return po.create(this);
  }
  isOptional() {
    return this.safeParse(void 0).success;
  }
  isNullable() {
    return this.safeParse(null).success;
  }
}
const ch = /^c[^\s-]{8,}$/i, dh = /^[a-z][a-z0-9]*$/, fh = /^[0-9A-HJKMNP-TV-Z]{26}$/, ph = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i, hh = /^(?!\.)(?!.*\.\.)([A-Z0-9_+-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i, mh = "^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$";
let xl;
const vh = /^(((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2}))\.){3}((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2}))$/, yh = /^(([a-f0-9]{1,4}:){7}|::([a-f0-9]{1,4}:){0,6}|([a-f0-9]{1,4}:){1}:([a-f0-9]{1,4}:){0,5}|([a-f0-9]{1,4}:){2}:([a-f0-9]{1,4}:){0,4}|([a-f0-9]{1,4}:){3}:([a-f0-9]{1,4}:){0,3}|([a-f0-9]{1,4}:){4}:([a-f0-9]{1,4}:){0,2}|([a-f0-9]{1,4}:){5}:([a-f0-9]{1,4}:){0,1})([a-f0-9]{1,4}|(((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2}))\.){3}((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2})))$/, gh = (e) => e.precision ? e.offset ? new RegExp(`^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{${e.precision}}(([+-]\\d{2}(:?\\d{2})?)|Z)$`) : new RegExp(`^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{${e.precision}}Z$`) : e.precision === 0 ? e.offset ? new RegExp("^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(([+-]\\d{2}(:?\\d{2})?)|Z)$") : new RegExp("^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$") : e.offset ? new RegExp("^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(\\.\\d+)?(([+-]\\d{2}(:?\\d{2})?)|Z)$") : new RegExp("^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(\\.\\d+)?Z$");
function wh(e, t) {
  return !!((t === "v4" || !t) && vh.test(e) || (t === "v6" || !t) && yh.test(e));
}
class it extends D {
  _parse(t) {
    if (this._def.coerce && (t.data = String(t.data)), this._getType(t) !== E.string) {
      const o = this._getOrReturnCtx(t);
      return T(
        o,
        {
          code: k.invalid_type,
          expected: E.string,
          received: o.parsedType
        }
        //
      ), z;
    }
    const r = new Te();
    let i;
    for (const o of this._def.checks)
      if (o.kind === "min")
        t.data.length < o.value && (i = this._getOrReturnCtx(t, i), T(i, {
          code: k.too_small,
          minimum: o.value,
          type: "string",
          inclusive: !0,
          exact: !1,
          message: o.message
        }), r.dirty());
      else if (o.kind === "max")
        t.data.length > o.value && (i = this._getOrReturnCtx(t, i), T(i, {
          code: k.too_big,
          maximum: o.value,
          type: "string",
          inclusive: !0,
          exact: !1,
          message: o.message
        }), r.dirty());
      else if (o.kind === "length") {
        const l = t.data.length > o.value, s = t.data.length < o.value;
        (l || s) && (i = this._getOrReturnCtx(t, i), l ? T(i, {
          code: k.too_big,
          maximum: o.value,
          type: "string",
          inclusive: !0,
          exact: !0,
          message: o.message
        }) : s && T(i, {
          code: k.too_small,
          minimum: o.value,
          type: "string",
          inclusive: !0,
          exact: !0,
          message: o.message
        }), r.dirty());
      } else if (o.kind === "email")
        hh.test(t.data) || (i = this._getOrReturnCtx(t, i), T(i, {
          validation: "email",
          code: k.invalid_string,
          message: o.message
        }), r.dirty());
      else if (o.kind === "emoji")
        xl || (xl = new RegExp(mh, "u")), xl.test(t.data) || (i = this._getOrReturnCtx(t, i), T(i, {
          validation: "emoji",
          code: k.invalid_string,
          message: o.message
        }), r.dirty());
      else if (o.kind === "uuid")
        ph.test(t.data) || (i = this._getOrReturnCtx(t, i), T(i, {
          validation: "uuid",
          code: k.invalid_string,
          message: o.message
        }), r.dirty());
      else if (o.kind === "cuid")
        ch.test(t.data) || (i = this._getOrReturnCtx(t, i), T(i, {
          validation: "cuid",
          code: k.invalid_string,
          message: o.message
        }), r.dirty());
      else if (o.kind === "cuid2")
        dh.test(t.data) || (i = this._getOrReturnCtx(t, i), T(i, {
          validation: "cuid2",
          code: k.invalid_string,
          message: o.message
        }), r.dirty());
      else if (o.kind === "ulid")
        fh.test(t.data) || (i = this._getOrReturnCtx(t, i), T(i, {
          validation: "ulid",
          code: k.invalid_string,
          message: o.message
        }), r.dirty());
      else if (o.kind === "url")
        try {
          new URL(t.data);
        } catch {
          i = this._getOrReturnCtx(t, i), T(i, {
            validation: "url",
            code: k.invalid_string,
            message: o.message
          }), r.dirty();
        }
      else
        o.kind === "regex" ? (o.regex.lastIndex = 0, o.regex.test(t.data) || (i = this._getOrReturnCtx(t, i), T(i, {
          validation: "regex",
          code: k.invalid_string,
          message: o.message
        }), r.dirty())) : o.kind === "trim" ? t.data = t.data.trim() : o.kind === "includes" ? t.data.includes(o.value, o.position) || (i = this._getOrReturnCtx(t, i), T(i, {
          code: k.invalid_string,
          validation: { includes: o.value, position: o.position },
          message: o.message
        }), r.dirty()) : o.kind === "toLowerCase" ? t.data = t.data.toLowerCase() : o.kind === "toUpperCase" ? t.data = t.data.toUpperCase() : o.kind === "startsWith" ? t.data.startsWith(o.value) || (i = this._getOrReturnCtx(t, i), T(i, {
          code: k.invalid_string,
          validation: { startsWith: o.value },
          message: o.message
        }), r.dirty()) : o.kind === "endsWith" ? t.data.endsWith(o.value) || (i = this._getOrReturnCtx(t, i), T(i, {
          code: k.invalid_string,
          validation: { endsWith: o.value },
          message: o.message
        }), r.dirty()) : o.kind === "datetime" ? gh(o).test(t.data) || (i = this._getOrReturnCtx(t, i), T(i, {
          code: k.invalid_string,
          validation: "datetime",
          message: o.message
        }), r.dirty()) : o.kind === "ip" ? wh(t.data, o.version) || (i = this._getOrReturnCtx(t, i), T(i, {
          validation: "ip",
          code: k.invalid_string,
          message: o.message
        }), r.dirty()) : F.assertNever(o);
    return { status: r.value, value: t.data };
  }
  _regex(t, n, r) {
    return this.refinement((i) => t.test(i), {
      validation: n,
      code: k.invalid_string,
      ...R.errToObj(r)
    });
  }
  _addCheck(t) {
    return new it({
      ...this._def,
      checks: [...this._def.checks, t]
    });
  }
  email(t) {
    return this._addCheck({ kind: "email", ...R.errToObj(t) });
  }
  url(t) {
    return this._addCheck({ kind: "url", ...R.errToObj(t) });
  }
  emoji(t) {
    return this._addCheck({ kind: "emoji", ...R.errToObj(t) });
  }
  uuid(t) {
    return this._addCheck({ kind: "uuid", ...R.errToObj(t) });
  }
  cuid(t) {
    return this._addCheck({ kind: "cuid", ...R.errToObj(t) });
  }
  cuid2(t) {
    return this._addCheck({ kind: "cuid2", ...R.errToObj(t) });
  }
  ulid(t) {
    return this._addCheck({ kind: "ulid", ...R.errToObj(t) });
  }
  ip(t) {
    return this._addCheck({ kind: "ip", ...R.errToObj(t) });
  }
  datetime(t) {
    var n;
    return typeof t == "string" ? this._addCheck({
      kind: "datetime",
      precision: null,
      offset: !1,
      message: t
    }) : this._addCheck({
      kind: "datetime",
      precision: typeof (t == null ? void 0 : t.precision) > "u" ? null : t == null ? void 0 : t.precision,
      offset: (n = t == null ? void 0 : t.offset) !== null && n !== void 0 ? n : !1,
      ...R.errToObj(t == null ? void 0 : t.message)
    });
  }
  regex(t, n) {
    return this._addCheck({
      kind: "regex",
      regex: t,
      ...R.errToObj(n)
    });
  }
  includes(t, n) {
    return this._addCheck({
      kind: "includes",
      value: t,
      position: n == null ? void 0 : n.position,
      ...R.errToObj(n == null ? void 0 : n.message)
    });
  }
  startsWith(t, n) {
    return this._addCheck({
      kind: "startsWith",
      value: t,
      ...R.errToObj(n)
    });
  }
  endsWith(t, n) {
    return this._addCheck({
      kind: "endsWith",
      value: t,
      ...R.errToObj(n)
    });
  }
  min(t, n) {
    return this._addCheck({
      kind: "min",
      value: t,
      ...R.errToObj(n)
    });
  }
  max(t, n) {
    return this._addCheck({
      kind: "max",
      value: t,
      ...R.errToObj(n)
    });
  }
  length(t, n) {
    return this._addCheck({
      kind: "length",
      value: t,
      ...R.errToObj(n)
    });
  }
  /**
   * @deprecated Use z.string().min(1) instead.
   * @see {@link ZodString.min}
   */
  nonempty(t) {
    return this.min(1, R.errToObj(t));
  }
  trim() {
    return new it({
      ...this._def,
      checks: [...this._def.checks, { kind: "trim" }]
    });
  }
  toLowerCase() {
    return new it({
      ...this._def,
      checks: [...this._def.checks, { kind: "toLowerCase" }]
    });
  }
  toUpperCase() {
    return new it({
      ...this._def,
      checks: [...this._def.checks, { kind: "toUpperCase" }]
    });
  }
  get isDatetime() {
    return !!this._def.checks.find((t) => t.kind === "datetime");
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
it.create = (e) => {
  var t;
  return new it({
    checks: [],
    typeName: M.ZodString,
    coerce: (t = e == null ? void 0 : e.coerce) !== null && t !== void 0 ? t : !1,
    ...j(e)
  });
};
function _h(e, t) {
  const n = (e.toString().split(".")[1] || "").length, r = (t.toString().split(".")[1] || "").length, i = n > r ? n : r, o = parseInt(e.toFixed(i).replace(".", "")), l = parseInt(t.toFixed(i).replace(".", ""));
  return o % l / Math.pow(10, i);
}
class Gt extends D {
  constructor() {
    super(...arguments), this.min = this.gte, this.max = this.lte, this.step = this.multipleOf;
  }
  _parse(t) {
    if (this._def.coerce && (t.data = Number(t.data)), this._getType(t) !== E.number) {
      const o = this._getOrReturnCtx(t);
      return T(o, {
        code: k.invalid_type,
        expected: E.number,
        received: o.parsedType
      }), z;
    }
    let r;
    const i = new Te();
    for (const o of this._def.checks)
      o.kind === "int" ? F.isInteger(t.data) || (r = this._getOrReturnCtx(t, r), T(r, {
        code: k.invalid_type,
        expected: "integer",
        received: "float",
        message: o.message
      }), i.dirty()) : o.kind === "min" ? (o.inclusive ? t.data < o.value : t.data <= o.value) && (r = this._getOrReturnCtx(t, r), T(r, {
        code: k.too_small,
        minimum: o.value,
        type: "number",
        inclusive: o.inclusive,
        exact: !1,
        message: o.message
      }), i.dirty()) : o.kind === "max" ? (o.inclusive ? t.data > o.value : t.data >= o.value) && (r = this._getOrReturnCtx(t, r), T(r, {
        code: k.too_big,
        maximum: o.value,
        type: "number",
        inclusive: o.inclusive,
        exact: !1,
        message: o.message
      }), i.dirty()) : o.kind === "multipleOf" ? _h(t.data, o.value) !== 0 && (r = this._getOrReturnCtx(t, r), T(r, {
        code: k.not_multiple_of,
        multipleOf: o.value,
        message: o.message
      }), i.dirty()) : o.kind === "finite" ? Number.isFinite(t.data) || (r = this._getOrReturnCtx(t, r), T(r, {
        code: k.not_finite,
        message: o.message
      }), i.dirty()) : F.assertNever(o);
    return { status: i.value, value: t.data };
  }
  gte(t, n) {
    return this.setLimit("min", t, !0, R.toString(n));
  }
  gt(t, n) {
    return this.setLimit("min", t, !1, R.toString(n));
  }
  lte(t, n) {
    return this.setLimit("max", t, !0, R.toString(n));
  }
  lt(t, n) {
    return this.setLimit("max", t, !1, R.toString(n));
  }
  setLimit(t, n, r, i) {
    return new Gt({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind: t,
          value: n,
          inclusive: r,
          message: R.toString(i)
        }
      ]
    });
  }
  _addCheck(t) {
    return new Gt({
      ...this._def,
      checks: [...this._def.checks, t]
    });
  }
  int(t) {
    return this._addCheck({
      kind: "int",
      message: R.toString(t)
    });
  }
  positive(t) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: !1,
      message: R.toString(t)
    });
  }
  negative(t) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: !1,
      message: R.toString(t)
    });
  }
  nonpositive(t) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: !0,
      message: R.toString(t)
    });
  }
  nonnegative(t) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: !0,
      message: R.toString(t)
    });
  }
  multipleOf(t, n) {
    return this._addCheck({
      kind: "multipleOf",
      value: t,
      message: R.toString(n)
    });
  }
  finite(t) {
    return this._addCheck({
      kind: "finite",
      message: R.toString(t)
    });
  }
  safe(t) {
    return this._addCheck({
      kind: "min",
      inclusive: !0,
      value: Number.MIN_SAFE_INTEGER,
      message: R.toString(t)
    })._addCheck({
      kind: "max",
      inclusive: !0,
      value: Number.MAX_SAFE_INTEGER,
      message: R.toString(t)
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
    return !!this._def.checks.find((t) => t.kind === "int" || t.kind === "multipleOf" && F.isInteger(t.value));
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
Gt.create = (e) => new Gt({
  checks: [],
  typeName: M.ZodNumber,
  coerce: (e == null ? void 0 : e.coerce) || !1,
  ...j(e)
});
class Xt extends D {
  constructor() {
    super(...arguments), this.min = this.gte, this.max = this.lte;
  }
  _parse(t) {
    if (this._def.coerce && (t.data = BigInt(t.data)), this._getType(t) !== E.bigint) {
      const o = this._getOrReturnCtx(t);
      return T(o, {
        code: k.invalid_type,
        expected: E.bigint,
        received: o.parsedType
      }), z;
    }
    let r;
    const i = new Te();
    for (const o of this._def.checks)
      o.kind === "min" ? (o.inclusive ? t.data < o.value : t.data <= o.value) && (r = this._getOrReturnCtx(t, r), T(r, {
        code: k.too_small,
        type: "bigint",
        minimum: o.value,
        inclusive: o.inclusive,
        message: o.message
      }), i.dirty()) : o.kind === "max" ? (o.inclusive ? t.data > o.value : t.data >= o.value) && (r = this._getOrReturnCtx(t, r), T(r, {
        code: k.too_big,
        type: "bigint",
        maximum: o.value,
        inclusive: o.inclusive,
        message: o.message
      }), i.dirty()) : o.kind === "multipleOf" ? t.data % o.value !== BigInt(0) && (r = this._getOrReturnCtx(t, r), T(r, {
        code: k.not_multiple_of,
        multipleOf: o.value,
        message: o.message
      }), i.dirty()) : F.assertNever(o);
    return { status: i.value, value: t.data };
  }
  gte(t, n) {
    return this.setLimit("min", t, !0, R.toString(n));
  }
  gt(t, n) {
    return this.setLimit("min", t, !1, R.toString(n));
  }
  lte(t, n) {
    return this.setLimit("max", t, !0, R.toString(n));
  }
  lt(t, n) {
    return this.setLimit("max", t, !1, R.toString(n));
  }
  setLimit(t, n, r, i) {
    return new Xt({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind: t,
          value: n,
          inclusive: r,
          message: R.toString(i)
        }
      ]
    });
  }
  _addCheck(t) {
    return new Xt({
      ...this._def,
      checks: [...this._def.checks, t]
    });
  }
  positive(t) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: !1,
      message: R.toString(t)
    });
  }
  negative(t) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: !1,
      message: R.toString(t)
    });
  }
  nonpositive(t) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: !0,
      message: R.toString(t)
    });
  }
  nonnegative(t) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: !0,
      message: R.toString(t)
    });
  }
  multipleOf(t, n) {
    return this._addCheck({
      kind: "multipleOf",
      value: t,
      message: R.toString(n)
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
Xt.create = (e) => {
  var t;
  return new Xt({
    checks: [],
    typeName: M.ZodBigInt,
    coerce: (t = e == null ? void 0 : e.coerce) !== null && t !== void 0 ? t : !1,
    ...j(e)
  });
};
class $r extends D {
  _parse(t) {
    if (this._def.coerce && (t.data = !!t.data), this._getType(t) !== E.boolean) {
      const r = this._getOrReturnCtx(t);
      return T(r, {
        code: k.invalid_type,
        expected: E.boolean,
        received: r.parsedType
      }), z;
    }
    return Re(t.data);
  }
}
$r.create = (e) => new $r({
  typeName: M.ZodBoolean,
  coerce: (e == null ? void 0 : e.coerce) || !1,
  ...j(e)
});
class gn extends D {
  _parse(t) {
    if (this._def.coerce && (t.data = new Date(t.data)), this._getType(t) !== E.date) {
      const o = this._getOrReturnCtx(t);
      return T(o, {
        code: k.invalid_type,
        expected: E.date,
        received: o.parsedType
      }), z;
    }
    if (isNaN(t.data.getTime())) {
      const o = this._getOrReturnCtx(t);
      return T(o, {
        code: k.invalid_date
      }), z;
    }
    const r = new Te();
    let i;
    for (const o of this._def.checks)
      o.kind === "min" ? t.data.getTime() < o.value && (i = this._getOrReturnCtx(t, i), T(i, {
        code: k.too_small,
        message: o.message,
        inclusive: !0,
        exact: !1,
        minimum: o.value,
        type: "date"
      }), r.dirty()) : o.kind === "max" ? t.data.getTime() > o.value && (i = this._getOrReturnCtx(t, i), T(i, {
        code: k.too_big,
        message: o.message,
        inclusive: !0,
        exact: !1,
        maximum: o.value,
        type: "date"
      }), r.dirty()) : F.assertNever(o);
    return {
      status: r.value,
      value: new Date(t.data.getTime())
    };
  }
  _addCheck(t) {
    return new gn({
      ...this._def,
      checks: [...this._def.checks, t]
    });
  }
  min(t, n) {
    return this._addCheck({
      kind: "min",
      value: t.getTime(),
      message: R.toString(n)
    });
  }
  max(t, n) {
    return this._addCheck({
      kind: "max",
      value: t.getTime(),
      message: R.toString(n)
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
gn.create = (e) => new gn({
  checks: [],
  coerce: (e == null ? void 0 : e.coerce) || !1,
  typeName: M.ZodDate,
  ...j(e)
});
class so extends D {
  _parse(t) {
    if (this._getType(t) !== E.symbol) {
      const r = this._getOrReturnCtx(t);
      return T(r, {
        code: k.invalid_type,
        expected: E.symbol,
        received: r.parsedType
      }), z;
    }
    return Re(t.data);
  }
}
so.create = (e) => new so({
  typeName: M.ZodSymbol,
  ...j(e)
});
class Dr extends D {
  _parse(t) {
    if (this._getType(t) !== E.undefined) {
      const r = this._getOrReturnCtx(t);
      return T(r, {
        code: k.invalid_type,
        expected: E.undefined,
        received: r.parsedType
      }), z;
    }
    return Re(t.data);
  }
}
Dr.create = (e) => new Dr({
  typeName: M.ZodUndefined,
  ...j(e)
});
class Zr extends D {
  _parse(t) {
    if (this._getType(t) !== E.null) {
      const r = this._getOrReturnCtx(t);
      return T(r, {
        code: k.invalid_type,
        expected: E.null,
        received: r.parsedType
      }), z;
    }
    return Re(t.data);
  }
}
Zr.create = (e) => new Zr({
  typeName: M.ZodNull,
  ...j(e)
});
class Gn extends D {
  constructor() {
    super(...arguments), this._any = !0;
  }
  _parse(t) {
    return Re(t.data);
  }
}
Gn.create = (e) => new Gn({
  typeName: M.ZodAny,
  ...j(e)
});
class hn extends D {
  constructor() {
    super(...arguments), this._unknown = !0;
  }
  _parse(t) {
    return Re(t.data);
  }
}
hn.create = (e) => new hn({
  typeName: M.ZodUnknown,
  ...j(e)
});
class Nt extends D {
  _parse(t) {
    const n = this._getOrReturnCtx(t);
    return T(n, {
      code: k.invalid_type,
      expected: E.never,
      received: n.parsedType
    }), z;
  }
}
Nt.create = (e) => new Nt({
  typeName: M.ZodNever,
  ...j(e)
});
class ao extends D {
  _parse(t) {
    if (this._getType(t) !== E.undefined) {
      const r = this._getOrReturnCtx(t);
      return T(r, {
        code: k.invalid_type,
        expected: E.void,
        received: r.parsedType
      }), z;
    }
    return Re(t.data);
  }
}
ao.create = (e) => new ao({
  typeName: M.ZodVoid,
  ...j(e)
});
class lt extends D {
  _parse(t) {
    const { ctx: n, status: r } = this._processInputParams(t), i = this._def;
    if (n.parsedType !== E.array)
      return T(n, {
        code: k.invalid_type,
        expected: E.array,
        received: n.parsedType
      }), z;
    if (i.exactLength !== null) {
      const l = n.data.length > i.exactLength.value, s = n.data.length < i.exactLength.value;
      (l || s) && (T(n, {
        code: l ? k.too_big : k.too_small,
        minimum: s ? i.exactLength.value : void 0,
        maximum: l ? i.exactLength.value : void 0,
        type: "array",
        inclusive: !0,
        exact: !0,
        message: i.exactLength.message
      }), r.dirty());
    }
    if (i.minLength !== null && n.data.length < i.minLength.value && (T(n, {
      code: k.too_small,
      minimum: i.minLength.value,
      type: "array",
      inclusive: !0,
      exact: !1,
      message: i.minLength.message
    }), r.dirty()), i.maxLength !== null && n.data.length > i.maxLength.value && (T(n, {
      code: k.too_big,
      maximum: i.maxLength.value,
      type: "array",
      inclusive: !0,
      exact: !1,
      message: i.maxLength.message
    }), r.dirty()), n.common.async)
      return Promise.all([...n.data].map((l, s) => i.type._parseAsync(new wt(n, l, n.path, s)))).then((l) => Te.mergeArray(r, l));
    const o = [...n.data].map((l, s) => i.type._parseSync(new wt(n, l, n.path, s)));
    return Te.mergeArray(r, o);
  }
  get element() {
    return this._def.type;
  }
  min(t, n) {
    return new lt({
      ...this._def,
      minLength: { value: t, message: R.toString(n) }
    });
  }
  max(t, n) {
    return new lt({
      ...this._def,
      maxLength: { value: t, message: R.toString(n) }
    });
  }
  length(t, n) {
    return new lt({
      ...this._def,
      exactLength: { value: t, message: R.toString(n) }
    });
  }
  nonempty(t) {
    return this.min(1, t);
  }
}
lt.create = (e, t) => new lt({
  type: e,
  minLength: null,
  maxLength: null,
  exactLength: null,
  typeName: M.ZodArray,
  ...j(t)
});
function On(e) {
  if (e instanceof ee) {
    const t = {};
    for (const n in e.shape) {
      const r = e.shape[n];
      t[n] = Et.create(On(r));
    }
    return new ee({
      ...e._def,
      shape: () => t
    });
  } else
    return e instanceof lt ? new lt({
      ...e._def,
      type: On(e.element)
    }) : e instanceof Et ? Et.create(On(e.unwrap())) : e instanceof _n ? _n.create(On(e.unwrap())) : e instanceof _t ? _t.create(e.items.map((t) => On(t))) : e;
}
class ee extends D {
  constructor() {
    super(...arguments), this._cached = null, this.nonstrict = this.passthrough, this.augment = this.extend;
  }
  _getCached() {
    if (this._cached !== null)
      return this._cached;
    const t = this._def.shape(), n = F.objectKeys(t);
    return this._cached = { shape: t, keys: n };
  }
  _parse(t) {
    if (this._getType(t) !== E.object) {
      const u = this._getOrReturnCtx(t);
      return T(u, {
        code: k.invalid_type,
        expected: E.object,
        received: u.parsedType
      }), z;
    }
    const { status: r, ctx: i } = this._processInputParams(t), { shape: o, keys: l } = this._getCached(), s = [];
    if (!(this._def.catchall instanceof Nt && this._def.unknownKeys === "strip"))
      for (const u in i.data)
        l.includes(u) || s.push(u);
    const a = [];
    for (const u of l) {
      const p = o[u], h = i.data[u];
      a.push({
        key: { status: "valid", value: u },
        value: p._parse(new wt(i, h, i.path, u)),
        alwaysSet: u in i.data
      });
    }
    if (this._def.catchall instanceof Nt) {
      const u = this._def.unknownKeys;
      if (u === "passthrough")
        for (const p of s)
          a.push({
            key: { status: "valid", value: p },
            value: { status: "valid", value: i.data[p] }
          });
      else if (u === "strict")
        s.length > 0 && (T(i, {
          code: k.unrecognized_keys,
          keys: s
        }), r.dirty());
      else if (u !== "strip")
        throw new Error("Internal ZodObject error: invalid unknownKeys value.");
    } else {
      const u = this._def.catchall;
      for (const p of s) {
        const h = i.data[p];
        a.push({
          key: { status: "valid", value: p },
          value: u._parse(
            new wt(i, h, i.path, p)
            //, ctx.child(key), value, getParsedType(value)
          ),
          alwaysSet: p in i.data
        });
      }
    }
    return i.common.async ? Promise.resolve().then(async () => {
      const u = [];
      for (const p of a) {
        const h = await p.key;
        u.push({
          key: h,
          value: await p.value,
          alwaysSet: p.alwaysSet
        });
      }
      return u;
    }).then((u) => Te.mergeObjectSync(r, u)) : Te.mergeObjectSync(r, a);
  }
  get shape() {
    return this._def.shape();
  }
  strict(t) {
    return R.errToObj, new ee({
      ...this._def,
      unknownKeys: "strict",
      ...t !== void 0 ? {
        errorMap: (n, r) => {
          var i, o, l, s;
          const a = (l = (o = (i = this._def).errorMap) === null || o === void 0 ? void 0 : o.call(i, n, r).message) !== null && l !== void 0 ? l : r.defaultError;
          return n.code === "unrecognized_keys" ? {
            message: (s = R.errToObj(t).message) !== null && s !== void 0 ? s : a
          } : {
            message: a
          };
        }
      } : {}
    });
  }
  strip() {
    return new ee({
      ...this._def,
      unknownKeys: "strip"
    });
  }
  passthrough() {
    return new ee({
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
    return new ee({
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
    return new ee({
      unknownKeys: t._def.unknownKeys,
      catchall: t._def.catchall,
      shape: () => ({
        ...this._def.shape(),
        ...t._def.shape()
      }),
      typeName: M.ZodObject
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
    return new ee({
      ...this._def,
      catchall: t
    });
  }
  pick(t) {
    const n = {};
    return F.objectKeys(t).forEach((r) => {
      t[r] && this.shape[r] && (n[r] = this.shape[r]);
    }), new ee({
      ...this._def,
      shape: () => n
    });
  }
  omit(t) {
    const n = {};
    return F.objectKeys(this.shape).forEach((r) => {
      t[r] || (n[r] = this.shape[r]);
    }), new ee({
      ...this._def,
      shape: () => n
    });
  }
  /**
   * @deprecated
   */
  deepPartial() {
    return On(this);
  }
  partial(t) {
    const n = {};
    return F.objectKeys(this.shape).forEach((r) => {
      const i = this.shape[r];
      t && !t[r] ? n[r] = i : n[r] = i.optional();
    }), new ee({
      ...this._def,
      shape: () => n
    });
  }
  required(t) {
    const n = {};
    return F.objectKeys(this.shape).forEach((r) => {
      if (t && !t[r])
        n[r] = this.shape[r];
      else {
        let o = this.shape[r];
        for (; o instanceof Et; )
          o = o._def.innerType;
        n[r] = o;
      }
    }), new ee({
      ...this._def,
      shape: () => n
    });
  }
  keyof() {
    return qc(F.objectKeys(this.shape));
  }
}
ee.create = (e, t) => new ee({
  shape: () => e,
  unknownKeys: "strip",
  catchall: Nt.create(),
  typeName: M.ZodObject,
  ...j(t)
});
ee.strictCreate = (e, t) => new ee({
  shape: () => e,
  unknownKeys: "strict",
  catchall: Nt.create(),
  typeName: M.ZodObject,
  ...j(t)
});
ee.lazycreate = (e, t) => new ee({
  shape: e,
  unknownKeys: "strip",
  catchall: Nt.create(),
  typeName: M.ZodObject,
  ...j(t)
});
class Vr extends D {
  _parse(t) {
    const { ctx: n } = this._processInputParams(t), r = this._def.options;
    function i(o) {
      for (const s of o)
        if (s.result.status === "valid")
          return s.result;
      for (const s of o)
        if (s.result.status === "dirty")
          return n.common.issues.push(...s.ctx.common.issues), s.result;
      const l = o.map((s) => new ot(s.ctx.common.issues));
      return T(n, {
        code: k.invalid_union,
        unionErrors: l
      }), z;
    }
    if (n.common.async)
      return Promise.all(r.map(async (o) => {
        const l = {
          ...n,
          common: {
            ...n.common,
            issues: []
          },
          parent: null
        };
        return {
          result: await o._parseAsync({
            data: n.data,
            path: n.path,
            parent: l
          }),
          ctx: l
        };
      })).then(i);
    {
      let o;
      const l = [];
      for (const a of r) {
        const u = {
          ...n,
          common: {
            ...n.common,
            issues: []
          },
          parent: null
        }, p = a._parseSync({
          data: n.data,
          path: n.path,
          parent: u
        });
        if (p.status === "valid")
          return p;
        p.status === "dirty" && !o && (o = { result: p, ctx: u }), u.common.issues.length && l.push(u.common.issues);
      }
      if (o)
        return n.common.issues.push(...o.ctx.common.issues), o.result;
      const s = l.map((a) => new ot(a));
      return T(n, {
        code: k.invalid_union,
        unionErrors: s
      }), z;
    }
  }
  get options() {
    return this._def.options;
  }
}
Vr.create = (e, t) => new Vr({
  options: e,
  typeName: M.ZodUnion,
  ...j(t)
});
const Wi = (e) => e instanceof Br ? Wi(e.schema) : e instanceof ut ? Wi(e.innerType()) : e instanceof Wr ? [e.value] : e instanceof Jt ? e.options : e instanceof Hr ? Object.keys(e.enum) : e instanceof Qr ? Wi(e._def.innerType) : e instanceof Dr ? [void 0] : e instanceof Zr ? [null] : null;
class Uo extends D {
  _parse(t) {
    const { ctx: n } = this._processInputParams(t);
    if (n.parsedType !== E.object)
      return T(n, {
        code: k.invalid_type,
        expected: E.object,
        received: n.parsedType
      }), z;
    const r = this.discriminator, i = n.data[r], o = this.optionsMap.get(i);
    return o ? n.common.async ? o._parseAsync({
      data: n.data,
      path: n.path,
      parent: n
    }) : o._parseSync({
      data: n.data,
      path: n.path,
      parent: n
    }) : (T(n, {
      code: k.invalid_union_discriminator,
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
    for (const o of n) {
      const l = Wi(o.shape[t]);
      if (!l)
        throw new Error(`A discriminator value for key \`${t}\` could not be extracted from all schema options`);
      for (const s of l) {
        if (i.has(s))
          throw new Error(`Discriminator property ${String(t)} has duplicate value ${String(s)}`);
        i.set(s, o);
      }
    }
    return new Uo({
      typeName: M.ZodDiscriminatedUnion,
      discriminator: t,
      options: n,
      optionsMap: i,
      ...j(r)
    });
  }
}
function ts(e, t) {
  const n = $t(e), r = $t(t);
  if (e === t)
    return { valid: !0, data: e };
  if (n === E.object && r === E.object) {
    const i = F.objectKeys(t), o = F.objectKeys(e).filter((s) => i.indexOf(s) !== -1), l = { ...e, ...t };
    for (const s of o) {
      const a = ts(e[s], t[s]);
      if (!a.valid)
        return { valid: !1 };
      l[s] = a.data;
    }
    return { valid: !0, data: l };
  } else if (n === E.array && r === E.array) {
    if (e.length !== t.length)
      return { valid: !1 };
    const i = [];
    for (let o = 0; o < e.length; o++) {
      const l = e[o], s = t[o], a = ts(l, s);
      if (!a.valid)
        return { valid: !1 };
      i.push(a.data);
    }
    return { valid: !0, data: i };
  } else
    return n === E.date && r === E.date && +e == +t ? { valid: !0, data: e } : { valid: !1 };
}
class Ur extends D {
  _parse(t) {
    const { status: n, ctx: r } = this._processInputParams(t), i = (o, l) => {
      if (bl(o) || bl(l))
        return z;
      const s = ts(o.value, l.value);
      return s.valid ? ((es(o) || es(l)) && n.dirty(), { status: n.value, value: s.data }) : (T(r, {
        code: k.invalid_intersection_types
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
    ]).then(([o, l]) => i(o, l)) : i(this._def.left._parseSync({
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
Ur.create = (e, t, n) => new Ur({
  left: e,
  right: t,
  typeName: M.ZodIntersection,
  ...j(n)
});
class _t extends D {
  _parse(t) {
    const { status: n, ctx: r } = this._processInputParams(t);
    if (r.parsedType !== E.array)
      return T(r, {
        code: k.invalid_type,
        expected: E.array,
        received: r.parsedType
      }), z;
    if (r.data.length < this._def.items.length)
      return T(r, {
        code: k.too_small,
        minimum: this._def.items.length,
        inclusive: !0,
        exact: !1,
        type: "array"
      }), z;
    !this._def.rest && r.data.length > this._def.items.length && (T(r, {
      code: k.too_big,
      maximum: this._def.items.length,
      inclusive: !0,
      exact: !1,
      type: "array"
    }), n.dirty());
    const o = [...r.data].map((l, s) => {
      const a = this._def.items[s] || this._def.rest;
      return a ? a._parse(new wt(r, l, r.path, s)) : null;
    }).filter((l) => !!l);
    return r.common.async ? Promise.all(o).then((l) => Te.mergeArray(n, l)) : Te.mergeArray(n, o);
  }
  get items() {
    return this._def.items;
  }
  rest(t) {
    return new _t({
      ...this._def,
      rest: t
    });
  }
}
_t.create = (e, t) => {
  if (!Array.isArray(e))
    throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
  return new _t({
    items: e,
    typeName: M.ZodTuple,
    rest: null,
    ...j(t)
  });
};
class Fr extends D {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(t) {
    const { status: n, ctx: r } = this._processInputParams(t);
    if (r.parsedType !== E.object)
      return T(r, {
        code: k.invalid_type,
        expected: E.object,
        received: r.parsedType
      }), z;
    const i = [], o = this._def.keyType, l = this._def.valueType;
    for (const s in r.data)
      i.push({
        key: o._parse(new wt(r, s, r.path, s)),
        value: l._parse(new wt(r, r.data[s], r.path, s))
      });
    return r.common.async ? Te.mergeObjectAsync(n, i) : Te.mergeObjectSync(n, i);
  }
  get element() {
    return this._def.valueType;
  }
  static create(t, n, r) {
    return n instanceof D ? new Fr({
      keyType: t,
      valueType: n,
      typeName: M.ZodRecord,
      ...j(r)
    }) : new Fr({
      keyType: it.create(),
      valueType: t,
      typeName: M.ZodRecord,
      ...j(n)
    });
  }
}
class uo extends D {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(t) {
    const { status: n, ctx: r } = this._processInputParams(t);
    if (r.parsedType !== E.map)
      return T(r, {
        code: k.invalid_type,
        expected: E.map,
        received: r.parsedType
      }), z;
    const i = this._def.keyType, o = this._def.valueType, l = [...r.data.entries()].map(([s, a], u) => ({
      key: i._parse(new wt(r, s, r.path, [u, "key"])),
      value: o._parse(new wt(r, a, r.path, [u, "value"]))
    }));
    if (r.common.async) {
      const s = /* @__PURE__ */ new Map();
      return Promise.resolve().then(async () => {
        for (const a of l) {
          const u = await a.key, p = await a.value;
          if (u.status === "aborted" || p.status === "aborted")
            return z;
          (u.status === "dirty" || p.status === "dirty") && n.dirty(), s.set(u.value, p.value);
        }
        return { status: n.value, value: s };
      });
    } else {
      const s = /* @__PURE__ */ new Map();
      for (const a of l) {
        const u = a.key, p = a.value;
        if (u.status === "aborted" || p.status === "aborted")
          return z;
        (u.status === "dirty" || p.status === "dirty") && n.dirty(), s.set(u.value, p.value);
      }
      return { status: n.value, value: s };
    }
  }
}
uo.create = (e, t, n) => new uo({
  valueType: t,
  keyType: e,
  typeName: M.ZodMap,
  ...j(n)
});
class wn extends D {
  _parse(t) {
    const { status: n, ctx: r } = this._processInputParams(t);
    if (r.parsedType !== E.set)
      return T(r, {
        code: k.invalid_type,
        expected: E.set,
        received: r.parsedType
      }), z;
    const i = this._def;
    i.minSize !== null && r.data.size < i.minSize.value && (T(r, {
      code: k.too_small,
      minimum: i.minSize.value,
      type: "set",
      inclusive: !0,
      exact: !1,
      message: i.minSize.message
    }), n.dirty()), i.maxSize !== null && r.data.size > i.maxSize.value && (T(r, {
      code: k.too_big,
      maximum: i.maxSize.value,
      type: "set",
      inclusive: !0,
      exact: !1,
      message: i.maxSize.message
    }), n.dirty());
    const o = this._def.valueType;
    function l(a) {
      const u = /* @__PURE__ */ new Set();
      for (const p of a) {
        if (p.status === "aborted")
          return z;
        p.status === "dirty" && n.dirty(), u.add(p.value);
      }
      return { status: n.value, value: u };
    }
    const s = [...r.data.values()].map((a, u) => o._parse(new wt(r, a, r.path, u)));
    return r.common.async ? Promise.all(s).then((a) => l(a)) : l(s);
  }
  min(t, n) {
    return new wn({
      ...this._def,
      minSize: { value: t, message: R.toString(n) }
    });
  }
  max(t, n) {
    return new wn({
      ...this._def,
      maxSize: { value: t, message: R.toString(n) }
    });
  }
  size(t, n) {
    return this.min(t, n).max(t, n);
  }
  nonempty(t) {
    return this.min(1, t);
  }
}
wn.create = (e, t) => new wn({
  valueType: e,
  minSize: null,
  maxSize: null,
  typeName: M.ZodSet,
  ...j(t)
});
class Fn extends D {
  constructor() {
    super(...arguments), this.validate = this.implement;
  }
  _parse(t) {
    const { ctx: n } = this._processInputParams(t);
    if (n.parsedType !== E.function)
      return T(n, {
        code: k.invalid_type,
        expected: E.function,
        received: n.parsedType
      }), z;
    function r(s, a) {
      return oo({
        data: s,
        path: n.path,
        errorMaps: [
          n.common.contextualErrorMap,
          n.schemaErrorMap,
          io(),
          jr
        ].filter((u) => !!u),
        issueData: {
          code: k.invalid_arguments,
          argumentsError: a
        }
      });
    }
    function i(s, a) {
      return oo({
        data: s,
        path: n.path,
        errorMaps: [
          n.common.contextualErrorMap,
          n.schemaErrorMap,
          io(),
          jr
        ].filter((u) => !!u),
        issueData: {
          code: k.invalid_return_type,
          returnTypeError: a
        }
      });
    }
    const o = { errorMap: n.common.contextualErrorMap }, l = n.data;
    if (this._def.returns instanceof Xn) {
      const s = this;
      return Re(async function(...a) {
        const u = new ot([]), p = await s._def.args.parseAsync(a, o).catch((w) => {
          throw u.addIssue(r(a, w)), u;
        }), h = await Reflect.apply(l, this, p);
        return await s._def.returns._def.type.parseAsync(h, o).catch((w) => {
          throw u.addIssue(i(h, w)), u;
        });
      });
    } else {
      const s = this;
      return Re(function(...a) {
        const u = s._def.args.safeParse(a, o);
        if (!u.success)
          throw new ot([r(a, u.error)]);
        const p = Reflect.apply(l, this, u.data), h = s._def.returns.safeParse(p, o);
        if (!h.success)
          throw new ot([i(p, h.error)]);
        return h.data;
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
    return new Fn({
      ...this._def,
      args: _t.create(t).rest(hn.create())
    });
  }
  returns(t) {
    return new Fn({
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
    return new Fn({
      args: t || _t.create([]).rest(hn.create()),
      returns: n || hn.create(),
      typeName: M.ZodFunction,
      ...j(r)
    });
  }
}
class Br extends D {
  get schema() {
    return this._def.getter();
  }
  _parse(t) {
    const { ctx: n } = this._processInputParams(t);
    return this._def.getter()._parse({ data: n.data, path: n.path, parent: n });
  }
}
Br.create = (e, t) => new Br({
  getter: e,
  typeName: M.ZodLazy,
  ...j(t)
});
class Wr extends D {
  _parse(t) {
    if (t.data !== this._def.value) {
      const n = this._getOrReturnCtx(t);
      return T(n, {
        received: n.data,
        code: k.invalid_literal,
        expected: this._def.value
      }), z;
    }
    return { status: "valid", value: t.data };
  }
  get value() {
    return this._def.value;
  }
}
Wr.create = (e, t) => new Wr({
  value: e,
  typeName: M.ZodLiteral,
  ...j(t)
});
function qc(e, t) {
  return new Jt({
    values: e,
    typeName: M.ZodEnum,
    ...j(t)
  });
}
class Jt extends D {
  _parse(t) {
    if (typeof t.data != "string") {
      const n = this._getOrReturnCtx(t), r = this._def.values;
      return T(n, {
        expected: F.joinValues(r),
        received: n.parsedType,
        code: k.invalid_type
      }), z;
    }
    if (this._def.values.indexOf(t.data) === -1) {
      const n = this._getOrReturnCtx(t), r = this._def.values;
      return T(n, {
        received: n.data,
        code: k.invalid_enum_value,
        options: r
      }), z;
    }
    return Re(t.data);
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
  extract(t) {
    return Jt.create(t);
  }
  exclude(t) {
    return Jt.create(this.options.filter((n) => !t.includes(n)));
  }
}
Jt.create = qc;
class Hr extends D {
  _parse(t) {
    const n = F.getValidEnumValues(this._def.values), r = this._getOrReturnCtx(t);
    if (r.parsedType !== E.string && r.parsedType !== E.number) {
      const i = F.objectValues(n);
      return T(r, {
        expected: F.joinValues(i),
        received: r.parsedType,
        code: k.invalid_type
      }), z;
    }
    if (n.indexOf(t.data) === -1) {
      const i = F.objectValues(n);
      return T(r, {
        received: r.data,
        code: k.invalid_enum_value,
        options: i
      }), z;
    }
    return Re(t.data);
  }
  get enum() {
    return this._def.values;
  }
}
Hr.create = (e, t) => new Hr({
  values: e,
  typeName: M.ZodNativeEnum,
  ...j(t)
});
class Xn extends D {
  unwrap() {
    return this._def.type;
  }
  _parse(t) {
    const { ctx: n } = this._processInputParams(t);
    if (n.parsedType !== E.promise && n.common.async === !1)
      return T(n, {
        code: k.invalid_type,
        expected: E.promise,
        received: n.parsedType
      }), z;
    const r = n.parsedType === E.promise ? n.data : Promise.resolve(n.data);
    return Re(r.then((i) => this._def.type.parseAsync(i, {
      path: n.path,
      errorMap: n.common.contextualErrorMap
    })));
  }
}
Xn.create = (e, t) => new Xn({
  type: e,
  typeName: M.ZodPromise,
  ...j(t)
});
class ut extends D {
  innerType() {
    return this._def.schema;
  }
  sourceType() {
    return this._def.schema._def.typeName === M.ZodEffects ? this._def.schema.sourceType() : this._def.schema;
  }
  _parse(t) {
    const { status: n, ctx: r } = this._processInputParams(t), i = this._def.effect || null, o = {
      addIssue: (l) => {
        T(r, l), l.fatal ? n.abort() : n.dirty();
      },
      get path() {
        return r.path;
      }
    };
    if (o.addIssue = o.addIssue.bind(o), i.type === "preprocess") {
      const l = i.transform(r.data, o);
      return r.common.issues.length ? {
        status: "dirty",
        value: r.data
      } : r.common.async ? Promise.resolve(l).then((s) => this._def.schema._parseAsync({
        data: s,
        path: r.path,
        parent: r
      })) : this._def.schema._parseSync({
        data: l,
        path: r.path,
        parent: r
      });
    }
    if (i.type === "refinement") {
      const l = (s) => {
        const a = i.refinement(s, o);
        if (r.common.async)
          return Promise.resolve(a);
        if (a instanceof Promise)
          throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
        return s;
      };
      if (r.common.async === !1) {
        const s = this._def.schema._parseSync({
          data: r.data,
          path: r.path,
          parent: r
        });
        return s.status === "aborted" ? z : (s.status === "dirty" && n.dirty(), l(s.value), { status: n.value, value: s.value });
      } else
        return this._def.schema._parseAsync({ data: r.data, path: r.path, parent: r }).then((s) => s.status === "aborted" ? z : (s.status === "dirty" && n.dirty(), l(s.value).then(() => ({ status: n.value, value: s.value }))));
    }
    if (i.type === "transform")
      if (r.common.async === !1) {
        const l = this._def.schema._parseSync({
          data: r.data,
          path: r.path,
          parent: r
        });
        if (!Ar(l))
          return l;
        const s = i.transform(l.value, o);
        if (s instanceof Promise)
          throw new Error("Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.");
        return { status: n.value, value: s };
      } else
        return this._def.schema._parseAsync({ data: r.data, path: r.path, parent: r }).then((l) => Ar(l) ? Promise.resolve(i.transform(l.value, o)).then((s) => ({ status: n.value, value: s })) : l);
    F.assertNever(i);
  }
}
ut.create = (e, t, n) => new ut({
  schema: e,
  typeName: M.ZodEffects,
  effect: t,
  ...j(n)
});
ut.createWithPreprocess = (e, t, n) => new ut({
  schema: t,
  effect: { type: "preprocess", transform: e },
  typeName: M.ZodEffects,
  ...j(n)
});
class Et extends D {
  _parse(t) {
    return this._getType(t) === E.undefined ? Re(void 0) : this._def.innerType._parse(t);
  }
  unwrap() {
    return this._def.innerType;
  }
}
Et.create = (e, t) => new Et({
  innerType: e,
  typeName: M.ZodOptional,
  ...j(t)
});
class _n extends D {
  _parse(t) {
    return this._getType(t) === E.null ? Re(null) : this._def.innerType._parse(t);
  }
  unwrap() {
    return this._def.innerType;
  }
}
_n.create = (e, t) => new _n({
  innerType: e,
  typeName: M.ZodNullable,
  ...j(t)
});
class Qr extends D {
  _parse(t) {
    const { ctx: n } = this._processInputParams(t);
    let r = n.data;
    return n.parsedType === E.undefined && (r = this._def.defaultValue()), this._def.innerType._parse({
      data: r,
      path: n.path,
      parent: n
    });
  }
  removeDefault() {
    return this._def.innerType;
  }
}
Qr.create = (e, t) => new Qr({
  innerType: e,
  typeName: M.ZodDefault,
  defaultValue: typeof t.default == "function" ? t.default : () => t.default,
  ...j(t)
});
class co extends D {
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
    return lo(i) ? i.then((o) => ({
      status: "valid",
      value: o.status === "valid" ? o.value : this._def.catchValue({
        get error() {
          return new ot(r.common.issues);
        },
        input: r.data
      })
    })) : {
      status: "valid",
      value: i.status === "valid" ? i.value : this._def.catchValue({
        get error() {
          return new ot(r.common.issues);
        },
        input: r.data
      })
    };
  }
  removeCatch() {
    return this._def.innerType;
  }
}
co.create = (e, t) => new co({
  innerType: e,
  typeName: M.ZodCatch,
  catchValue: typeof t.catch == "function" ? t.catch : () => t.catch,
  ...j(t)
});
class fo extends D {
  _parse(t) {
    if (this._getType(t) !== E.nan) {
      const r = this._getOrReturnCtx(t);
      return T(r, {
        code: k.invalid_type,
        expected: E.nan,
        received: r.parsedType
      }), z;
    }
    return { status: "valid", value: t.data };
  }
}
fo.create = (e) => new fo({
  typeName: M.ZodNaN,
  ...j(e)
});
const kh = Symbol("zod_brand");
class Kc extends D {
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
class mi extends D {
  _parse(t) {
    const { status: n, ctx: r } = this._processInputParams(t);
    if (r.common.async)
      return (async () => {
        const o = await this._def.in._parseAsync({
          data: r.data,
          path: r.path,
          parent: r
        });
        return o.status === "aborted" ? z : o.status === "dirty" ? (n.dirty(), Qc(o.value)) : this._def.out._parseAsync({
          data: o.value,
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
    return new mi({
      in: t,
      out: n,
      typeName: M.ZodPipeline
    });
  }
}
class po extends D {
  _parse(t) {
    const n = this._def.innerType._parse(t);
    return Ar(n) && (n.value = Object.freeze(n.value)), n;
  }
}
po.create = (e, t) => new po({
  innerType: e,
  typeName: M.ZodReadonly,
  ...j(t)
});
const Yc = (e, t = {}, n) => e ? Gn.create().superRefine((r, i) => {
  var o, l;
  if (!e(r)) {
    const s = typeof t == "function" ? t(r) : typeof t == "string" ? { message: t } : t, a = (l = (o = s.fatal) !== null && o !== void 0 ? o : n) !== null && l !== void 0 ? l : !0, u = typeof s == "string" ? { message: s } : s;
    i.addIssue({ code: "custom", ...u, fatal: a });
  }
}) : Gn.create(), xh = {
  object: ee.lazycreate
};
var M;
(function(e) {
  e.ZodString = "ZodString", e.ZodNumber = "ZodNumber", e.ZodNaN = "ZodNaN", e.ZodBigInt = "ZodBigInt", e.ZodBoolean = "ZodBoolean", e.ZodDate = "ZodDate", e.ZodSymbol = "ZodSymbol", e.ZodUndefined = "ZodUndefined", e.ZodNull = "ZodNull", e.ZodAny = "ZodAny", e.ZodUnknown = "ZodUnknown", e.ZodNever = "ZodNever", e.ZodVoid = "ZodVoid", e.ZodArray = "ZodArray", e.ZodObject = "ZodObject", e.ZodUnion = "ZodUnion", e.ZodDiscriminatedUnion = "ZodDiscriminatedUnion", e.ZodIntersection = "ZodIntersection", e.ZodTuple = "ZodTuple", e.ZodRecord = "ZodRecord", e.ZodMap = "ZodMap", e.ZodSet = "ZodSet", e.ZodFunction = "ZodFunction", e.ZodLazy = "ZodLazy", e.ZodLiteral = "ZodLiteral", e.ZodEnum = "ZodEnum", e.ZodEffects = "ZodEffects", e.ZodNativeEnum = "ZodNativeEnum", e.ZodOptional = "ZodOptional", e.ZodNullable = "ZodNullable", e.ZodDefault = "ZodDefault", e.ZodCatch = "ZodCatch", e.ZodPromise = "ZodPromise", e.ZodBranded = "ZodBranded", e.ZodPipeline = "ZodPipeline", e.ZodReadonly = "ZodReadonly";
})(M || (M = {}));
const Sh = (e, t = {
  message: `Input not instance of ${e.name}`
}) => Yc((n) => n instanceof e, t), L = it.create, K = Gt.create, Ch = fo.create, Eh = Xt.create, Fo = $r.create, Th = gn.create, Nh = so.create, ns = Dr.create, Ph = Zr.create, Oh = Gn.create, Rh = hn.create, Mh = Nt.create, Ih = ao.create, It = lt.create, H = ee.create, Lh = ee.strictCreate, qr = Vr.create, zh = Uo.create, jh = Ur.create, Ah = _t.create, la = Fr.create, $h = uo.create, Dh = wn.create, Zh = Fn.create, Vh = Br.create, cn = Wr.create, vi = Jt.create, sa = Hr.create, Uh = Xn.create, pu = ut.create, Fh = Et.create, Bh = _n.create, Wh = ut.createWithPreprocess, Hh = mi.create, Qh = () => L().optional(), qh = () => K().optional(), Kh = () => Fo().optional(), Yh = {
  string: (e) => it.create({ ...e, coerce: !0 }),
  number: (e) => Gt.create({ ...e, coerce: !0 }),
  boolean: (e) => $r.create({
    ...e,
    coerce: !0
  }),
  bigint: (e) => Xt.create({ ...e, coerce: !0 }),
  date: (e) => gn.create({ ...e, coerce: !0 })
}, Gh = z;
var U0 = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  defaultErrorMap: jr,
  setErrorMap: ah,
  getErrorMap: io,
  makeIssue: oo,
  EMPTY_PATH: uh,
  addIssueToContext: T,
  ParseStatus: Te,
  INVALID: z,
  DIRTY: Qc,
  OK: Re,
  isAborted: bl,
  isDirty: es,
  isValid: Ar,
  isAsync: lo,
  get util() {
    return F;
  },
  get objectUtil() {
    return Jl;
  },
  ZodParsedType: E,
  getParsedType: $t,
  ZodType: D,
  ZodString: it,
  ZodNumber: Gt,
  ZodBigInt: Xt,
  ZodBoolean: $r,
  ZodDate: gn,
  ZodSymbol: so,
  ZodUndefined: Dr,
  ZodNull: Zr,
  ZodAny: Gn,
  ZodUnknown: hn,
  ZodNever: Nt,
  ZodVoid: ao,
  ZodArray: lt,
  ZodObject: ee,
  ZodUnion: Vr,
  ZodDiscriminatedUnion: Uo,
  ZodIntersection: Ur,
  ZodTuple: _t,
  ZodRecord: Fr,
  ZodMap: uo,
  ZodSet: wn,
  ZodFunction: Fn,
  ZodLazy: Br,
  ZodLiteral: Wr,
  ZodEnum: Jt,
  ZodNativeEnum: Hr,
  ZodPromise: Xn,
  ZodEffects: ut,
  ZodTransformer: ut,
  ZodOptional: Et,
  ZodNullable: _n,
  ZodDefault: Qr,
  ZodCatch: co,
  ZodNaN: fo,
  BRAND: kh,
  ZodBranded: Kc,
  ZodPipeline: mi,
  ZodReadonly: po,
  custom: Yc,
  Schema: D,
  ZodSchema: D,
  late: xh,
  get ZodFirstPartyTypeKind() {
    return M;
  },
  coerce: Yh,
  any: Oh,
  array: It,
  bigint: Eh,
  boolean: Fo,
  date: Th,
  discriminatedUnion: zh,
  effect: pu,
  enum: vi,
  function: Zh,
  instanceof: Sh,
  intersection: jh,
  lazy: Vh,
  literal: cn,
  map: $h,
  nan: Ch,
  nativeEnum: sa,
  never: Mh,
  null: Ph,
  nullable: Bh,
  number: K,
  object: H,
  oboolean: Kh,
  onumber: qh,
  optional: Fh,
  ostring: Qh,
  pipeline: Hh,
  preprocess: Wh,
  promise: Uh,
  record: la,
  set: Dh,
  strictObject: Lh,
  string: L,
  symbol: Nh,
  transformer: pu,
  tuple: Ah,
  undefined: ns,
  union: qr,
  unknown: Rh,
  void: Ih,
  NEVER: Gh,
  ZodIssueCode: k,
  quotelessJson: sh,
  ZodError: ot
});
const Xh = (e, t) => {
  const n = (r) => Object.keys(r).every((i) => e.safeParse(i).success);
  return la(t).refine(n);
}, mn = vi(["development", "rococo", "shiden"]), Gc = qr([
  cn("sr25519"),
  cn("ed25519"),
  cn("ecdsa"),
  cn("ethereum")
]), Jh = H({
  endpoint: L().url(),
  contract: H({
    address: L(),
    name: L()
  }),
  pairType: Gc,
  ss58Format: K().positive().default(42)
}), bh = Xh(mn, Jh.required({
  endpoint: !0,
  pairType: !0,
  ss58Format: !0
})), Sl = Gc.parse("sr25519"), Cl = (e) => "5G9D7bUeopdiQdfM1aaJHmJr2BKMaWHrH5t8TF4nh9WtiDXK", em = () => ({
  [mn.Values.development]: {
    endpoint: "ws://localhost:9944",
    contract: {
      name: "captcha",
      address: Cl()
    },
    pairType: Sl,
    ss58Format: 42
  },
  [mn.Values.rococo]: {
    endpoint: "ws://localhost:9944",
    contract: {
      name: "captcha",
      address: Cl()
    },
    pairType: Sl,
    ss58Format: 42
  },
  [mn.Values.shiden]: {
    endpoint: "ws://localhost:9944",
    contract: {
      address: Cl(),
      name: "captcha"
    },
    pairType: Sl,
    ss58Format: 5
  }
}), hu = vi(["trace", "debug", "info", "warn", "error", "fatal", "log"]);
vi(["mongo", "mongoMemory"]);
const ho = vi(["development", "staging", "production"]), tm = la(ho, H({
  type: L(),
  endpoint: L(),
  dbname: L(),
  authSource: L()
})), nm = H({
  interval: K().positive().optional().default(300),
  maxBatchExtrinsicPercentage: K().positive().optional().default(59)
}), rm = H({
  logLevel: hu.optional().default(hu.enum.info),
  defaultEnvironment: ho.default(ho.Values.production),
  defaultNetwork: mn.default(mn.Values.rococo),
  account: H({
    address: L().optional(),
    secret: L().optional(),
    password: L().optional()
  })
}), Xc = rm.merge(H({
  networks: bh.default(em),
  database: tm.optional()
})), im = H({
  solved: H({
    count: K().positive()
  }).optional().default({ count: 1 }),
  unsolved: H({
    count: K().nonnegative()
  }).optional().default({ count: 1 })
}), om = H({
  baseURL: L().url(),
  port: K().optional().default(9229)
}), lm = H({
  requiredNumberOfSolutions: K().positive().min(2),
  solutionWinningPercentage: K().positive().max(100),
  captchaBlockRecency: K().positive().min(2)
}), Jc = Xc.merge(H({
  userAccountAddress: L().optional(),
  web2: Fo().optional().default(!0),
  solutionThreshold: K().positive().max(100).optional().default(80),
  dappName: L().optional().default("ProsopoClientDapp"),
  serverUrl: L().optional()
}));
Jc.merge(H({
  serverUrl: L().url()
}));
const sm = H({
  area: H({
    width: K().positive(),
    height: K().positive()
  }),
  offsetParameter: K().positive(),
  multiplier: K().positive(),
  fontSizeFactor: K().positive(),
  maxShadowBlur: K().positive(),
  numberOfRounds: K().positive(),
  seed: K().positive()
}), am = qr([cn("light"), cn("dark")]), um = Jc.and(H({
  accountCreator: sm.optional(),
  theme: am.optional(),
  challengeValidLength: K().positive().optional(),
  devOnlyWatchEvents: Fo().optional()
}));
Xc.merge(H({
  captchas: im.optional().default({
    solved: { count: 1 },
    unsolved: { count: 0 }
  }),
  captchaSolutions: lm.optional().default({
    requiredNumberOfSolutions: 3,
    solutionWinningPercentage: 80,
    captchaBlockRecency: 10
  }),
  batchCommit: nm.optional().default({
    interval: 300,
    maxBatchExtrinsicPercentage: 59
  }),
  server: om,
  mongoAtlasUri: L().optional()
}));
var rs;
(function(e) {
  e.SelectAll = "SelectAll";
})(rs || (rs = {}));
var is;
(function(e) {
  e.Text = "text", e.Image = "image";
})(is || (is = {}));
var mu;
(function(e) {
  e.Solved = "solved", e.Unsolved = "unsolved";
})(mu || (mu = {}));
const cm = H({
  captchaId: qr([L(), ns()]),
  captchaContentId: qr([L(), ns()]),
  salt: L().min(34),
  solution: K().array().optional(),
  unlabelled: K().array().optional(),
  timeLimit: K().optional()
}), bc = H({
  hash: L(),
  data: L(),
  type: sa(is)
}), ed = bc.extend({
  hash: L()
}), dm = ed.extend({
  label: L()
}), fm = ed.extend({
  label: L().optional()
}), td = cm.extend({
  items: It(bc),
  target: L()
}), pm = td.extend({
  solution: L().array().optional(),
  unlabelled: L().array().optional()
}), hm = pm.extend({
  solution: K().array().optional(),
  unlabelled: K().array().optional()
}), mm = It(td);
It(hm);
const nd = H({
  captchaId: L(),
  captchaContentId: L(),
  solution: L().array(),
  salt: L().min(34)
});
It(nd);
H({
  items: It(fm)
});
H({
  items: It(dm)
});
H({
  captchas: mm,
  format: sa(rs)
});
H({
  labels: It(L())
});
var vu;
(function(e) {
  e.GetCaptchaChallenge = "/v1/prosopo/provider/captcha", e.SubmitCaptchaSolution = "/v1/prosopo/provider/solution", e.VerifyCaptchaSolution = "/v1/prosopo/provider/verify", e.GetProviderStatus = "/v1/prosopo/provider/status", e.GetProviderDetails = "/v1/prosopo/provider/details", e.SubmitUserEvents = "/v1/prosopo/provider/events";
})(vu || (vu = {}));
var yu;
(function(e) {
  e.BatchCommit = "/v1/prosopo/provider/admin/batch", e.UpdateDataset = "/v1/prosopo/provider/admin/dataset", e.ProviderDeregister = "/v1/prosopo/provider/admin/deregister", e.ProviderUpdate = "/v1/prosopo/provider/admin/update";
})(yu || (yu = {}));
var Ee;
(function(e) {
  e.datasetId = "datasetId", e.user = "user", e.dapp = "dapp", e.blockNumber = "blockNumber", e.signature = "signature", e.requestHash = "requestHash", e.captchas = "captchas", e.commitmentId = "commitmentId", e.proof = "proof", e.providerUrl = "providerUrl", e.procaptchaResponse = "procaptcha-response", e.maxVerifiedTime = "maxVerifiedTime";
})(Ee || (Ee = {}));
H({
  [Ee.user]: L(),
  [Ee.dapp]: L(),
  [Ee.datasetId]: L(),
  [Ee.blockNumber]: L()
});
const F0 = H({
  [Ee.user]: L(),
  [Ee.dapp]: L(),
  [Ee.captchas]: It(nd),
  [Ee.requestHash]: L(),
  [Ee.signature]: L()
});
H({
  [Ee.dapp]: L(),
  [Ee.user]: L(),
  [Ee.commitmentId]: L().optional(),
  [Ee.maxVerifiedTime]: K().optional()
});
function vm(e) {
  if (e.sheet)
    return e.sheet;
  for (var t = 0; t < document.styleSheets.length; t++)
    if (document.styleSheets[t].ownerNode === e)
      return document.styleSheets[t];
}
function ym(e) {
  var t = document.createElement("style");
  return t.setAttribute("data-emotion", e.key), e.nonce !== void 0 && t.setAttribute("nonce", e.nonce), t.appendChild(document.createTextNode("")), t.setAttribute("data-s", ""), t;
}
var gm = /* @__PURE__ */ function() {
  function e(n) {
    var r = this;
    this._insertTag = function(i) {
      var o;
      r.tags.length === 0 ? r.insertionPoint ? o = r.insertionPoint.nextSibling : r.prepend ? o = r.container.firstChild : o = r.before : o = r.tags[r.tags.length - 1].nextSibling, r.container.insertBefore(i, o), r.tags.push(i);
    }, this.isSpeedy = n.speedy === void 0 ? !0 : n.speedy, this.tags = [], this.ctr = 0, this.nonce = n.nonce, this.key = n.key, this.container = n.container, this.prepend = n.prepend, this.insertionPoint = n.insertionPoint, this.before = null;
  }
  var t = e.prototype;
  return t.hydrate = function(r) {
    r.forEach(this._insertTag);
  }, t.insert = function(r) {
    this.ctr % (this.isSpeedy ? 65e3 : 1) === 0 && this._insertTag(ym(this));
    var i = this.tags[this.tags.length - 1];
    if (this.isSpeedy) {
      var o = vm(i);
      try {
        o.insertRule(r, o.cssRules.length);
      } catch {
      }
    } else
      i.appendChild(document.createTextNode(r));
    this.ctr++;
  }, t.flush = function() {
    this.tags.forEach(function(r) {
      return r.parentNode && r.parentNode.removeChild(r);
    }), this.tags = [], this.ctr = 0;
  }, e;
}(), Se = "-ms-", mo = "-moz-", B = "-webkit-", rd = "comm", aa = "rule", ua = "decl", wm = "@import", id = "@keyframes", _m = "@layer", km = Math.abs, Bo = String.fromCharCode, xm = Object.assign;
function Sm(e, t) {
  return ge(e, 0) ^ 45 ? (((t << 2 ^ ge(e, 0)) << 2 ^ ge(e, 1)) << 2 ^ ge(e, 2)) << 2 ^ ge(e, 3) : 0;
}
function od(e) {
  return e.trim();
}
function Cm(e, t) {
  return (e = t.exec(e)) ? e[0] : e;
}
function W(e, t, n) {
  return e.replace(t, n);
}
function os(e, t) {
  return e.indexOf(t);
}
function ge(e, t) {
  return e.charCodeAt(t) | 0;
}
function Kr(e, t, n) {
  return e.slice(t, n);
}
function pt(e) {
  return e.length;
}
function ca(e) {
  return e.length;
}
function Ei(e, t) {
  return t.push(e), e;
}
function Em(e, t) {
  return e.map(t).join("");
}
var Wo = 1, Jn = 1, ld = 0, De = 0, ae = 0, sr = "";
function Ho(e, t, n, r, i, o, l) {
  return { value: e, root: t, parent: n, type: r, props: i, children: o, line: Wo, column: Jn, length: l, return: "" };
}
function fr(e, t) {
  return xm(Ho("", null, null, "", null, null, 0), e, { length: -e.length }, t);
}
function Tm() {
  return ae;
}
function Nm() {
  return ae = De > 0 ? ge(sr, --De) : 0, Jn--, ae === 10 && (Jn = 1, Wo--), ae;
}
function Ue() {
  return ae = De < ld ? ge(sr, De++) : 0, Jn++, ae === 10 && (Jn = 1, Wo++), ae;
}
function vt() {
  return ge(sr, De);
}
function Hi() {
  return De;
}
function yi(e, t) {
  return Kr(sr, e, t);
}
function Yr(e) {
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
function sd(e) {
  return Wo = Jn = 1, ld = pt(sr = e), De = 0, [];
}
function ad(e) {
  return sr = "", e;
}
function Qi(e) {
  return od(yi(De - 1, ls(e === 91 ? e + 2 : e === 40 ? e + 1 : e)));
}
function Pm(e) {
  for (; (ae = vt()) && ae < 33; )
    Ue();
  return Yr(e) > 2 || Yr(ae) > 3 ? "" : " ";
}
function Om(e, t) {
  for (; --t && Ue() && !(ae < 48 || ae > 102 || ae > 57 && ae < 65 || ae > 70 && ae < 97); )
    ;
  return yi(e, Hi() + (t < 6 && vt() == 32 && Ue() == 32));
}
function ls(e) {
  for (; Ue(); )
    switch (ae) {
      case e:
        return De;
      case 34:
      case 39:
        e !== 34 && e !== 39 && ls(ae);
        break;
      case 40:
        e === 41 && ls(e);
        break;
      case 92:
        Ue();
        break;
    }
  return De;
}
function Rm(e, t) {
  for (; Ue() && e + ae !== 47 + 10; )
    if (e + ae === 42 + 42 && vt() === 47)
      break;
  return "/*" + yi(t, De - 1) + "*" + Bo(e === 47 ? e : Ue());
}
function Mm(e) {
  for (; !Yr(vt()); )
    Ue();
  return yi(e, De);
}
function Im(e) {
  return ad(qi("", null, null, null, [""], e = sd(e), 0, [0], e));
}
function qi(e, t, n, r, i, o, l, s, a) {
  for (var u = 0, p = 0, h = l, m = 0, w = 0, g = 0, v = 1, I = 1, d = 1, c = 0, f = "", y = i, S = o, C = r, x = f; I; )
    switch (g = c, c = Ue()) {
      case 40:
        if (g != 108 && ge(x, h - 1) == 58) {
          os(x += W(Qi(c), "&", "&\f"), "&\f") != -1 && (d = -1);
          break;
        }
      case 34:
      case 39:
      case 91:
        x += Qi(c);
        break;
      case 9:
      case 10:
      case 13:
      case 32:
        x += Pm(g);
        break;
      case 92:
        x += Om(Hi() - 1, 7);
        continue;
      case 47:
        switch (vt()) {
          case 42:
          case 47:
            Ei(Lm(Rm(Ue(), Hi()), t, n), a);
            break;
          default:
            x += "/";
        }
        break;
      case 123 * v:
        s[u++] = pt(x) * d;
      case 125 * v:
      case 59:
      case 0:
        switch (c) {
          case 0:
          case 125:
            I = 0;
          case 59 + p:
            d == -1 && (x = W(x, /\f/g, "")), w > 0 && pt(x) - h && Ei(w > 32 ? wu(x + ";", r, n, h - 1) : wu(W(x, " ", "") + ";", r, n, h - 2), a);
            break;
          case 59:
            x += ";";
          default:
            if (Ei(C = gu(x, t, n, u, p, i, s, f, y = [], S = [], h), o), c === 123)
              if (p === 0)
                qi(x, t, C, C, y, o, h, s, S);
              else
                switch (m === 99 && ge(x, 3) === 110 ? 100 : m) {
                  case 100:
                  case 108:
                  case 109:
                  case 115:
                    qi(e, C, C, r && Ei(gu(e, C, C, 0, 0, i, s, f, i, y = [], h), S), i, S, h, s, r ? y : S);
                    break;
                  default:
                    qi(x, C, C, C, [""], S, 0, s, S);
                }
        }
        u = p = w = 0, v = d = 1, f = x = "", h = l;
        break;
      case 58:
        h = 1 + pt(x), w = g;
      default:
        if (v < 1) {
          if (c == 123)
            --v;
          else if (c == 125 && v++ == 0 && Nm() == 125)
            continue;
        }
        switch (x += Bo(c), c * v) {
          case 38:
            d = p > 0 ? 1 : (x += "\f", -1);
            break;
          case 44:
            s[u++] = (pt(x) - 1) * d, d = 1;
            break;
          case 64:
            vt() === 45 && (x += Qi(Ue())), m = vt(), p = h = pt(f = x += Mm(Hi())), c++;
            break;
          case 45:
            g === 45 && pt(x) == 2 && (v = 0);
        }
    }
  return o;
}
function gu(e, t, n, r, i, o, l, s, a, u, p) {
  for (var h = i - 1, m = i === 0 ? o : [""], w = ca(m), g = 0, v = 0, I = 0; g < r; ++g)
    for (var d = 0, c = Kr(e, h + 1, h = km(v = l[g])), f = e; d < w; ++d)
      (f = od(v > 0 ? m[d] + " " + c : W(c, /&\f/g, m[d]))) && (a[I++] = f);
  return Ho(e, t, n, i === 0 ? aa : s, a, u, p);
}
function Lm(e, t, n) {
  return Ho(e, t, n, rd, Bo(Tm()), Kr(e, 2, -2), 0);
}
function wu(e, t, n, r) {
  return Ho(e, t, n, ua, Kr(e, 0, r), Kr(e, r + 1, -1), r);
}
function Bn(e, t) {
  for (var n = "", r = ca(e), i = 0; i < r; i++)
    n += t(e[i], i, e, t) || "";
  return n;
}
function zm(e, t, n, r) {
  switch (e.type) {
    case _m:
      if (e.children.length)
        break;
    case wm:
    case ua:
      return e.return = e.return || e.value;
    case rd:
      return "";
    case id:
      return e.return = e.value + "{" + Bn(e.children, r) + "}";
    case aa:
      e.value = e.props.join(",");
  }
  return pt(n = Bn(e.children, r)) ? e.return = e.value + "{" + n + "}" : "";
}
function jm(e) {
  var t = ca(e);
  return function(n, r, i, o) {
    for (var l = "", s = 0; s < t; s++)
      l += e[s](n, r, i, o) || "";
    return l;
  };
}
function Am(e) {
  return function(t) {
    t.root || (t = t.return) && e(t);
  };
}
function ud(e) {
  var t = /* @__PURE__ */ Object.create(null);
  return function(n) {
    return t[n] === void 0 && (t[n] = e(n)), t[n];
  };
}
var $m = function(t, n, r) {
  for (var i = 0, o = 0; i = o, o = vt(), i === 38 && o === 12 && (n[r] = 1), !Yr(o); )
    Ue();
  return yi(t, De);
}, Dm = function(t, n) {
  var r = -1, i = 44;
  do
    switch (Yr(i)) {
      case 0:
        i === 38 && vt() === 12 && (n[r] = 1), t[r] += $m(De - 1, n, r);
        break;
      case 2:
        t[r] += Qi(i);
        break;
      case 4:
        if (i === 44) {
          t[++r] = vt() === 58 ? "&\f" : "", n[r] = t[r].length;
          break;
        }
      default:
        t[r] += Bo(i);
    }
  while (i = Ue());
  return t;
}, Zm = function(t, n) {
  return ad(Dm(sd(t), n));
}, _u = /* @__PURE__ */ new WeakMap(), Vm = function(t) {
  if (!(t.type !== "rule" || !t.parent || // positive .length indicates that this rule contains pseudo
  // negative .length indicates that this rule has been already prefixed
  t.length < 1)) {
    for (var n = t.value, r = t.parent, i = t.column === r.column && t.line === r.line; r.type !== "rule"; )
      if (r = r.parent, !r)
        return;
    if (!(t.props.length === 1 && n.charCodeAt(0) !== 58 && !_u.get(r)) && !i) {
      _u.set(t, !0);
      for (var o = [], l = Zm(n, o), s = r.props, a = 0, u = 0; a < l.length; a++)
        for (var p = 0; p < s.length; p++, u++)
          t.props[u] = o[a] ? l[a].replace(/&\f/g, s[p]) : s[p] + " " + l[a];
    }
  }
}, Um = function(t) {
  if (t.type === "decl") {
    var n = t.value;
    // charcode for l
    n.charCodeAt(0) === 108 && // charcode for b
    n.charCodeAt(2) === 98 && (t.return = "", t.value = "");
  }
};
function cd(e, t) {
  switch (Sm(e, t)) {
    case 5103:
      return B + "print-" + e + e;
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
      return B + e + e;
    case 5349:
    case 4246:
    case 4810:
    case 6968:
    case 2756:
      return B + e + mo + e + Se + e + e;
    case 6828:
    case 4268:
      return B + e + Se + e + e;
    case 6165:
      return B + e + Se + "flex-" + e + e;
    case 5187:
      return B + e + W(e, /(\w+).+(:[^]+)/, B + "box-$1$2" + Se + "flex-$1$2") + e;
    case 5443:
      return B + e + Se + "flex-item-" + W(e, /flex-|-self/, "") + e;
    case 4675:
      return B + e + Se + "flex-line-pack" + W(e, /align-content|flex-|-self/, "") + e;
    case 5548:
      return B + e + Se + W(e, "shrink", "negative") + e;
    case 5292:
      return B + e + Se + W(e, "basis", "preferred-size") + e;
    case 6060:
      return B + "box-" + W(e, "-grow", "") + B + e + Se + W(e, "grow", "positive") + e;
    case 4554:
      return B + W(e, /([^-])(transform)/g, "$1" + B + "$2") + e;
    case 6187:
      return W(W(W(e, /(zoom-|grab)/, B + "$1"), /(image-set)/, B + "$1"), e, "") + e;
    case 5495:
    case 3959:
      return W(e, /(image-set\([^]*)/, B + "$1$`$1");
    case 4968:
      return W(W(e, /(.+:)(flex-)?(.*)/, B + "box-pack:$3" + Se + "flex-pack:$3"), /s.+-b[^;]+/, "justify") + B + e + e;
    case 4095:
    case 3583:
    case 4068:
    case 2532:
      return W(e, /(.+)-inline(.+)/, B + "$1$2") + e;
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
      if (pt(e) - 1 - t > 6)
        switch (ge(e, t + 1)) {
          case 109:
            if (ge(e, t + 4) !== 45)
              break;
          case 102:
            return W(e, /(.+:)(.+)-([^]+)/, "$1" + B + "$2-$3$1" + mo + (ge(e, t + 3) == 108 ? "$3" : "$2-$3")) + e;
          case 115:
            return ~os(e, "stretch") ? cd(W(e, "stretch", "fill-available"), t) + e : e;
        }
      break;
    case 4949:
      if (ge(e, t + 1) !== 115)
        break;
    case 6444:
      switch (ge(e, pt(e) - 3 - (~os(e, "!important") && 10))) {
        case 107:
          return W(e, ":", ":" + B) + e;
        case 101:
          return W(e, /(.+:)([^;!]+)(;|!.+)?/, "$1" + B + (ge(e, 14) === 45 ? "inline-" : "") + "box$3$1" + B + "$2$3$1" + Se + "$2box$3") + e;
      }
      break;
    case 5936:
      switch (ge(e, t + 11)) {
        case 114:
          return B + e + Se + W(e, /[svh]\w+-[tblr]{2}/, "tb") + e;
        case 108:
          return B + e + Se + W(e, /[svh]\w+-[tblr]{2}/, "tb-rl") + e;
        case 45:
          return B + e + Se + W(e, /[svh]\w+-[tblr]{2}/, "lr") + e;
      }
      return B + e + Se + e + e;
  }
  return e;
}
var Fm = function(t, n, r, i) {
  if (t.length > -1 && !t.return)
    switch (t.type) {
      case ua:
        t.return = cd(t.value, t.length);
        break;
      case id:
        return Bn([fr(t, {
          value: W(t.value, "@", "@" + B)
        })], i);
      case aa:
        if (t.length)
          return Em(t.props, function(o) {
            switch (Cm(o, /(::plac\w+|:read-\w+)/)) {
              case ":read-only":
              case ":read-write":
                return Bn([fr(t, {
                  props: [W(o, /:(read-\w+)/, ":" + mo + "$1")]
                })], i);
              case "::placeholder":
                return Bn([fr(t, {
                  props: [W(o, /:(plac\w+)/, ":" + B + "input-$1")]
                }), fr(t, {
                  props: [W(o, /:(plac\w+)/, ":" + mo + "$1")]
                }), fr(t, {
                  props: [W(o, /:(plac\w+)/, Se + "input-$1")]
                })], i);
            }
            return "";
          });
    }
}, Bm = [Fm], Wm = function(t) {
  var n = t.key;
  if (n === "css") {
    var r = document.querySelectorAll("style[data-emotion]:not([data-s])");
    Array.prototype.forEach.call(r, function(v) {
      var I = v.getAttribute("data-emotion");
      I.indexOf(" ") !== -1 && (document.head.appendChild(v), v.setAttribute("data-s", ""));
    });
  }
  var i = t.stylisPlugins || Bm, o = {}, l, s = [];
  l = t.container || document.head, Array.prototype.forEach.call(
    // this means we will ignore elements which don't have a space in them which
    // means that the style elements we're looking at are only Emotion 11 server-rendered style elements
    document.querySelectorAll('style[data-emotion^="' + n + ' "]'),
    function(v) {
      for (var I = v.getAttribute("data-emotion").split(" "), d = 1; d < I.length; d++)
        o[I[d]] = !0;
      s.push(v);
    }
  );
  var a, u = [Vm, Um];
  {
    var p, h = [zm, Am(function(v) {
      p.insert(v);
    })], m = jm(u.concat(i, h)), w = function(I) {
      return Bn(Im(I), m);
    };
    a = function(I, d, c, f) {
      p = c, w(I ? I + "{" + d.styles + "}" : d.styles), f && (g.inserted[d.name] = !0);
    };
  }
  var g = {
    key: n,
    sheet: new gm({
      key: n,
      container: l,
      nonce: t.nonce,
      speedy: t.speedy,
      prepend: t.prepend,
      insertionPoint: t.insertionPoint
    }),
    nonce: t.nonce,
    inserted: o,
    registered: {},
    insert: a
  };
  return g.sheet.hydrate(s), g;
};
function ss() {
  return ss = Object.assign ? Object.assign.bind() : function(e) {
    for (var t = 1; t < arguments.length; t++) {
      var n = arguments[t];
      for (var r in n)
        Object.prototype.hasOwnProperty.call(n, r) && (e[r] = n[r]);
    }
    return e;
  }, ss.apply(this, arguments);
}
var dd = { exports: {} }, q = {};
var me = typeof Symbol == "function" && Symbol.for, da = me ? Symbol.for("react.element") : 60103, fa = me ? Symbol.for("react.portal") : 60106, Qo = me ? Symbol.for("react.fragment") : 60107, qo = me ? Symbol.for("react.strict_mode") : 60108, Ko = me ? Symbol.for("react.profiler") : 60114, Yo = me ? Symbol.for("react.provider") : 60109, Go = me ? Symbol.for("react.context") : 60110, pa = me ? Symbol.for("react.async_mode") : 60111, Xo = me ? Symbol.for("react.concurrent_mode") : 60111, Jo = me ? Symbol.for("react.forward_ref") : 60112, bo = me ? Symbol.for("react.suspense") : 60113, Hm = me ? Symbol.for("react.suspense_list") : 60120, el = me ? Symbol.for("react.memo") : 60115, tl = me ? Symbol.for("react.lazy") : 60116, Qm = me ? Symbol.for("react.block") : 60121, qm = me ? Symbol.for("react.fundamental") : 60117, Km = me ? Symbol.for("react.responder") : 60118, Ym = me ? Symbol.for("react.scope") : 60119;
function We(e) {
  if (typeof e == "object" && e !== null) {
    var t = e.$$typeof;
    switch (t) {
      case da:
        switch (e = e.type, e) {
          case pa:
          case Xo:
          case Qo:
          case Ko:
          case qo:
          case bo:
            return e;
          default:
            switch (e = e && e.$$typeof, e) {
              case Go:
              case Jo:
              case tl:
              case el:
              case Yo:
                return e;
              default:
                return t;
            }
        }
      case fa:
        return t;
    }
  }
}
function fd(e) {
  return We(e) === Xo;
}
q.AsyncMode = pa;
q.ConcurrentMode = Xo;
q.ContextConsumer = Go;
q.ContextProvider = Yo;
q.Element = da;
q.ForwardRef = Jo;
q.Fragment = Qo;
q.Lazy = tl;
q.Memo = el;
q.Portal = fa;
q.Profiler = Ko;
q.StrictMode = qo;
q.Suspense = bo;
q.isAsyncMode = function(e) {
  return fd(e) || We(e) === pa;
};
q.isConcurrentMode = fd;
q.isContextConsumer = function(e) {
  return We(e) === Go;
};
q.isContextProvider = function(e) {
  return We(e) === Yo;
};
q.isElement = function(e) {
  return typeof e == "object" && e !== null && e.$$typeof === da;
};
q.isForwardRef = function(e) {
  return We(e) === Jo;
};
q.isFragment = function(e) {
  return We(e) === Qo;
};
q.isLazy = function(e) {
  return We(e) === tl;
};
q.isMemo = function(e) {
  return We(e) === el;
};
q.isPortal = function(e) {
  return We(e) === fa;
};
q.isProfiler = function(e) {
  return We(e) === Ko;
};
q.isStrictMode = function(e) {
  return We(e) === qo;
};
q.isSuspense = function(e) {
  return We(e) === bo;
};
q.isValidElementType = function(e) {
  return typeof e == "string" || typeof e == "function" || e === Qo || e === Xo || e === Ko || e === qo || e === bo || e === Hm || typeof e == "object" && e !== null && (e.$$typeof === tl || e.$$typeof === el || e.$$typeof === Yo || e.$$typeof === Go || e.$$typeof === Jo || e.$$typeof === qm || e.$$typeof === Km || e.$$typeof === Ym || e.$$typeof === Qm);
};
q.typeOf = We;
dd.exports = q;
var Gm = dd.exports, pd = Gm, Xm = {
  $$typeof: !0,
  render: !0,
  defaultProps: !0,
  displayName: !0,
  propTypes: !0
}, Jm = {
  $$typeof: !0,
  compare: !0,
  defaultProps: !0,
  displayName: !0,
  propTypes: !0,
  type: !0
}, hd = {};
hd[pd.ForwardRef] = Xm;
hd[pd.Memo] = Jm;
var bm = !0;
function md(e, t, n) {
  var r = "";
  return n.split(" ").forEach(function(i) {
    e[i] !== void 0 ? t.push(e[i] + ";") : r += i + " ";
  }), r;
}
var ha = function(t, n, r) {
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
  bm === !1) && t.registered[i] === void 0 && (t.registered[i] = n.styles);
}, vd = function(t, n, r) {
  ha(t, n, r);
  var i = t.key + "-" + n.name;
  if (t.inserted[n.name] === void 0) {
    var o = n;
    do
      t.insert(n === o ? "." + i : "", o, t.sheet, !0), o = o.next;
    while (o !== void 0);
  }
};
function e1(e) {
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
var t1 = {
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
}, n1 = /[A-Z]|^ms/g, r1 = /_EMO_([^_]+?)_([^]*?)_EMO_/g, yd = function(t) {
  return t.charCodeAt(1) === 45;
}, ku = function(t) {
  return t != null && typeof t != "boolean";
}, El = /* @__PURE__ */ ud(function(e) {
  return yd(e) ? e : e.replace(n1, "-$&").toLowerCase();
}), xu = function(t, n) {
  switch (t) {
    case "animation":
    case "animationName":
      if (typeof n == "string")
        return n.replace(r1, function(r, i, o) {
          return ht = {
            name: i,
            styles: o,
            next: ht
          }, i;
        });
  }
  return t1[t] !== 1 && !yd(t) && typeof n == "number" && n !== 0 ? n + "px" : n;
};
function Gr(e, t, n) {
  if (n == null)
    return "";
  if (n.__emotion_styles !== void 0)
    return n;
  switch (typeof n) {
    case "boolean":
      return "";
    case "object": {
      if (n.anim === 1)
        return ht = {
          name: n.name,
          styles: n.styles,
          next: ht
        }, n.name;
      if (n.styles !== void 0) {
        var r = n.next;
        if (r !== void 0)
          for (; r !== void 0; )
            ht = {
              name: r.name,
              styles: r.styles,
              next: ht
            }, r = r.next;
        var i = n.styles + ";";
        return i;
      }
      return i1(e, t, n);
    }
    case "function": {
      if (e !== void 0) {
        var o = ht, l = n(e);
        return ht = o, Gr(e, t, l);
      }
      break;
    }
  }
  if (t == null)
    return n;
  var s = t[n];
  return s !== void 0 ? s : n;
}
function i1(e, t, n) {
  var r = "";
  if (Array.isArray(n))
    for (var i = 0; i < n.length; i++)
      r += Gr(e, t, n[i]) + ";";
  else
    for (var o in n) {
      var l = n[o];
      if (typeof l != "object")
        t != null && t[l] !== void 0 ? r += o + "{" + t[l] + "}" : ku(l) && (r += El(o) + ":" + xu(o, l) + ";");
      else if (Array.isArray(l) && typeof l[0] == "string" && (t == null || t[l[0]] === void 0))
        for (var s = 0; s < l.length; s++)
          ku(l[s]) && (r += El(o) + ":" + xu(o, l[s]) + ";");
      else {
        var a = Gr(e, t, l);
        switch (o) {
          case "animation":
          case "animationName": {
            r += El(o) + ":" + a + ";";
            break;
          }
          default:
            r += o + "{" + a + "}";
        }
      }
    }
  return r;
}
var Su = /label:\s*([^\s;\n{]+)\s*(;|$)/g, ht, ma = function(t, n, r) {
  if (t.length === 1 && typeof t[0] == "object" && t[0] !== null && t[0].styles !== void 0)
    return t[0];
  var i = !0, o = "";
  ht = void 0;
  var l = t[0];
  l == null || l.raw === void 0 ? (i = !1, o += Gr(r, n, l)) : o += l[0];
  for (var s = 1; s < t.length; s++)
    o += Gr(r, n, t[s]), i && (o += l[s]);
  Su.lastIndex = 0;
  for (var a = "", u; (u = Su.exec(o)) !== null; )
    a += "-" + // $FlowFixMe we know it's not null
    u[1];
  var p = e1(o) + a;
  return {
    name: p,
    styles: o,
    next: ht
  };
}, o1 = function(t) {
  return t();
}, l1 = du["useInsertionEffect"] ? du["useInsertionEffect"] : !1, gd = l1 || o1, nl = {}.hasOwnProperty, wd = /* @__PURE__ */ oe.createContext(
  // we're doing this to avoid preconstruct's dead code elimination in this one case
  // because this module is primarily intended for the browser and node
  // but it's also required in react native and similar environments sometimes
  // and we could have a special build just for that
  // but this is much easier and the native packages
  // might use a different theme context in the future anyway
  typeof HTMLElement < "u" ? /* @__PURE__ */ Wm({
    key: "css"
  }) : null
);
wd.Provider;
var _d = function(t) {
  return /* @__PURE__ */ oe.forwardRef(function(n, r) {
    var i = oe.useContext(wd);
    return t(n, i, r);
  });
}, kd = /* @__PURE__ */ oe.createContext({}), as = "__EMOTION_TYPE_PLEASE_DO_NOT_USE__", xd = function(t, n) {
  var r = {};
  for (var i in n)
    nl.call(n, i) && (r[i] = n[i]);
  return r[as] = t, r;
}, s1 = function(t) {
  var n = t.cache, r = t.serialized, i = t.isStringTag;
  return ha(n, r, i), gd(function() {
    return vd(n, r, i);
  }), null;
}, a1 = /* @__PURE__ */ _d(function(e, t, n) {
  var r = e.css;
  typeof r == "string" && t.registered[r] !== void 0 && (r = t.registered[r]);
  var i = e[as], o = [r], l = "";
  typeof e.className == "string" ? l = md(t.registered, o, e.className) : e.className != null && (l = e.className + " ");
  var s = ma(o, void 0, oe.useContext(kd));
  l += t.key + "-" + s.name;
  var a = {};
  for (var u in e)
    nl.call(e, u) && u !== "css" && u !== as && (a[u] = e[u]);
  return a.ref = n, a.className = l, /* @__PURE__ */ oe.createElement(oe.Fragment, null, /* @__PURE__ */ oe.createElement(s1, {
    cache: t,
    serialized: s,
    isStringTag: typeof i == "string"
  }), /* @__PURE__ */ oe.createElement(i, a));
}), Sd = a1;
function ve(e, t, n) {
  return nl.call(t, "css") ? zr.jsx(Sd, xd(e, t), n) : zr.jsx(e, t, n);
}
function Tl(e, t, n) {
  return nl.call(t, "css") ? zr.jsxs(Sd, xd(e, t), n) : zr.jsxs(e, t, n);
}
const Cd = {
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
}, Ed = {
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
    grey: Cd
  }
}, Td = {
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
    grey: Cd
  }
};
function B0(e, t, n = !0) {
  const r = e[t];
  if (n && r === void 0)
    throw new Error(`Object has no property '${String(t)}': ${JSON.stringify(e, null, 2)}`);
  return r;
}
function u1(e, t, n) {
  if (e.length === 0)
    throw new Error("Array is empty");
  if (n != null && n.noWrap || (t > 0 ? t = t % e.length : t = Math.ceil(Math.abs(t) / e.length) * e.length + t), t >= e.length)
    throw new Error(`Index ${t} larger than array length ${e.length}`);
  if (t < 0)
    throw new Error(`Index ${t} smaller than 0`);
  return e[t];
}
var c1 = /^((children|dangerouslySetInnerHTML|key|ref|autoFocus|defaultValue|defaultChecked|innerHTML|suppressContentEditableWarning|suppressHydrationWarning|valueLink|abbr|accept|acceptCharset|accessKey|action|allow|allowUserMedia|allowPaymentRequest|allowFullScreen|allowTransparency|alt|async|autoComplete|autoPlay|capture|cellPadding|cellSpacing|challenge|charSet|checked|cite|classID|className|cols|colSpan|content|contentEditable|contextMenu|controls|controlsList|coords|crossOrigin|data|dateTime|decoding|default|defer|dir|disabled|disablePictureInPicture|download|draggable|encType|enterKeyHint|form|formAction|formEncType|formMethod|formNoValidate|formTarget|frameBorder|headers|height|hidden|high|href|hrefLang|htmlFor|httpEquiv|id|inputMode|integrity|is|keyParams|keyType|kind|label|lang|list|loading|loop|low|marginHeight|marginWidth|max|maxLength|media|mediaGroup|method|min|minLength|multiple|muted|name|nonce|noValidate|open|optimum|pattern|placeholder|playsInline|poster|preload|profile|radioGroup|readOnly|referrerPolicy|rel|required|reversed|role|rows|rowSpan|sandbox|scope|scoped|scrolling|seamless|selected|shape|size|sizes|slot|span|spellCheck|src|srcDoc|srcLang|srcSet|start|step|style|summary|tabIndex|target|title|translate|type|useMap|value|width|wmode|wrap|about|datatype|inlist|prefix|property|resource|typeof|vocab|autoCapitalize|autoCorrect|autoSave|color|incremental|fallback|inert|itemProp|itemScope|itemType|itemID|itemRef|on|option|results|security|unselectable|accentHeight|accumulate|additive|alignmentBaseline|allowReorder|alphabetic|amplitude|arabicForm|ascent|attributeName|attributeType|autoReverse|azimuth|baseFrequency|baselineShift|baseProfile|bbox|begin|bias|by|calcMode|capHeight|clip|clipPathUnits|clipPath|clipRule|colorInterpolation|colorInterpolationFilters|colorProfile|colorRendering|contentScriptType|contentStyleType|cursor|cx|cy|d|decelerate|descent|diffuseConstant|direction|display|divisor|dominantBaseline|dur|dx|dy|edgeMode|elevation|enableBackground|end|exponent|externalResourcesRequired|fill|fillOpacity|fillRule|filter|filterRes|filterUnits|floodColor|floodOpacity|focusable|fontFamily|fontSize|fontSizeAdjust|fontStretch|fontStyle|fontVariant|fontWeight|format|from|fr|fx|fy|g1|g2|glyphName|glyphOrientationHorizontal|glyphOrientationVertical|glyphRef|gradientTransform|gradientUnits|hanging|horizAdvX|horizOriginX|ideographic|imageRendering|in|in2|intercept|k|k1|k2|k3|k4|kernelMatrix|kernelUnitLength|kerning|keyPoints|keySplines|keyTimes|lengthAdjust|letterSpacing|lightingColor|limitingConeAngle|local|markerEnd|markerMid|markerStart|markerHeight|markerUnits|markerWidth|mask|maskContentUnits|maskUnits|mathematical|mode|numOctaves|offset|opacity|operator|order|orient|orientation|origin|overflow|overlinePosition|overlineThickness|panose1|paintOrder|pathLength|patternContentUnits|patternTransform|patternUnits|pointerEvents|points|pointsAtX|pointsAtY|pointsAtZ|preserveAlpha|preserveAspectRatio|primitiveUnits|r|radius|refX|refY|renderingIntent|repeatCount|repeatDur|requiredExtensions|requiredFeatures|restart|result|rotate|rx|ry|scale|seed|shapeRendering|slope|spacing|specularConstant|specularExponent|speed|spreadMethod|startOffset|stdDeviation|stemh|stemv|stitchTiles|stopColor|stopOpacity|strikethroughPosition|strikethroughThickness|string|stroke|strokeDasharray|strokeDashoffset|strokeLinecap|strokeLinejoin|strokeMiterlimit|strokeOpacity|strokeWidth|surfaceScale|systemLanguage|tableValues|targetX|targetY|textAnchor|textDecoration|textRendering|textLength|to|transform|u1|u2|underlinePosition|underlineThickness|unicode|unicodeBidi|unicodeRange|unitsPerEm|vAlphabetic|vHanging|vIdeographic|vMathematical|values|vectorEffect|version|vertAdvY|vertOriginX|vertOriginY|viewBox|viewTarget|visibility|widths|wordSpacing|writingMode|x|xHeight|x1|x2|xChannelSelector|xlinkActuate|xlinkArcrole|xlinkHref|xlinkRole|xlinkShow|xlinkTitle|xlinkType|xmlBase|xmlns|xmlnsXlink|xmlLang|xmlSpace|y|y1|y2|yChannelSelector|z|zoomAndPan|for|class|autofocus)|(([Dd][Aa][Tt][Aa]|[Aa][Rr][Ii][Aa]|x)-.*))$/, d1 = /* @__PURE__ */ ud(
  function(e) {
    return c1.test(e) || e.charCodeAt(0) === 111 && e.charCodeAt(1) === 110 && e.charCodeAt(2) < 91;
  }
  /* Z+1 */
);
function f1() {
  for (var e = arguments.length, t = new Array(e), n = 0; n < e; n++)
    t[n] = arguments[n];
  return ma(t);
}
var p1 = d1, h1 = function(t) {
  return t !== "theme";
}, Cu = function(t) {
  return typeof t == "string" && // 96 is one less than the char code
  // for "a" so this is checking that
  // it's a lowercase character
  t.charCodeAt(0) > 96 ? p1 : h1;
}, Eu = function(t, n, r) {
  var i;
  if (n) {
    var o = n.shouldForwardProp;
    i = t.__emotion_forwardProp && o ? function(l) {
      return t.__emotion_forwardProp(l) && o(l);
    } : o;
  }
  return typeof i != "function" && r && (i = t.__emotion_forwardProp), i;
}, m1 = function(t) {
  var n = t.cache, r = t.serialized, i = t.isStringTag;
  return ha(n, r, i), gd(function() {
    return vd(n, r, i);
  }), null;
}, v1 = function e(t, n) {
  var r = t.__emotion_real === t, i = r && t.__emotion_base || t, o, l;
  n !== void 0 && (o = n.label, l = n.target);
  var s = Eu(t, n, r), a = s || Cu(i), u = !a("as");
  return function() {
    var p = arguments, h = r && t.__emotion_styles !== void 0 ? t.__emotion_styles.slice(0) : [];
    if (o !== void 0 && h.push("label:" + o + ";"), p[0] == null || p[0].raw === void 0)
      h.push.apply(h, p);
    else {
      h.push(p[0][0]);
      for (var m = p.length, w = 1; w < m; w++)
        h.push(p[w], p[0][w]);
    }
    var g = _d(function(v, I, d) {
      var c = u && v.as || i, f = "", y = [], S = v;
      if (v.theme == null) {
        S = {};
        for (var C in v)
          S[C] = v[C];
        S.theme = oe.useContext(kd);
      }
      typeof v.className == "string" ? f = md(I.registered, y, v.className) : v.className != null && (f = v.className + " ");
      var x = ma(h.concat(y), I.registered, S);
      f += I.key + "-" + x.name, l !== void 0 && (f += " " + l);
      var O = u && s === void 0 ? Cu(c) : a, Y = {};
      for (var $ in v)
        u && $ === "as" || // $FlowFixMe
        O($) && (Y[$] = v[$]);
      return Y.className = f, Y.ref = d, /* @__PURE__ */ oe.createElement(oe.Fragment, null, /* @__PURE__ */ oe.createElement(m1, {
        cache: I,
        serialized: x,
        isStringTag: typeof c == "string"
      }), /* @__PURE__ */ oe.createElement(c, Y));
    });
    return g.displayName = o !== void 0 ? o : "Styled(" + (typeof i == "string" ? i : i.displayName || i.name || "Component") + ")", g.defaultProps = t.defaultProps, g.__emotion_real = g, g.__emotion_base = i, g.__emotion_styles = h, g.__emotion_forwardProp = s, Object.defineProperty(g, "toString", {
      value: function() {
        return "." + l;
      }
    }), g.withComponent = function(v, I) {
      return e(v, ss({}, n, I, {
        shouldForwardProp: Eu(g, I, !0)
      })).apply(void 0, h);
    }, g;
  };
}, y1 = [
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
], us = v1.bind();
y1.forEach(function(e) {
  us[e] = us(e);
});
const g1 = ({ themeColor: e }) => {
  const t = oe.useMemo(() => e === "light" ? Ed : Td, [e]), n = us.div`
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
  return ve(n, {});
}, Tu = f1`
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
`, w1 = (e) => {
  const t = e.darkMode, n = { maxWidth: "400px", minWidth: "200px", margin: "8px" }, r = t ? "light" : "dark", i = oe.useMemo(() => t === "light" ? Ed : Td, [t]);
  return ve("div", { children: ve("div", { style: { maxWidth: "100%", maxHeight: "100%", overflowX: "auto" }, children: Tl("div", { style: n, "data-cy": "button-human", children: [" ", Tl("div", { style: {
    padding: "8px",
    border: "1px solid",
    backgroundColor: i.palette.background.default,
    borderColor: i.palette.grey[300],
    borderRadius: "8px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap"
  }, children: [ve("div", { style: { display: "flex", flexDirection: "column" }, children: ve("div", { style: {
    display: "flex",
    justifyContent: "flex-start",
    alignItems: "center",
    flexWrap: "wrap"
  }, children: ve("div", { style: {
    height: "50px",
    width: "50px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
    verticalAlign: "middle"
  }, children: ve("div", { style: {
    display: "flex"
  }, children: ve("div", { style: { flex: 1 }, children: ve(g1, { themeColor: r }) }) }) }) }) }), ve("div", { children: ve("a", { href: "https://www.prosopo.io/#features?ref=accounts.prosopo.io&utm_campaign=widget&utm_medium=checkbox", target: "_blank", "aria-label": "Visit prosopo.io to learn more about the service and its accessibility options.", children: ve("div", { children: Tl("div", { children: [ve("div", { css: Tu, dangerouslySetInnerHTML: {
    __html: t === "light" ? S1 : x1
  } }), ve("div", { css: Tu, dangerouslySetInnerHTML: {
    __html: t === "light" ? _1 : k1
  } })] }) }) }) })] })] }) }) });
}, _1 = '<svg id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2062.63 468.67" height="35px" width="140px"><defs><style>.cls-1{fill:#1d1d1b;}</style></defs><title>Prosopo Logo Black</title><path class="cls-1" d="M335.55,1825.19A147.75,147.75,0,0,1,483.3,1972.94h50.5c0-109.49-88.76-198.25-198.25-198.25v50.5Z" transform="translate(-215.73 -1774.69)"/><path class="cls-1" d="M269.36,1891.39A147.74,147.74,0,0,1,417.1,2039.13h50.5c0-109.49-88.75-198.24-198.24-198.24v50.5Z" transform="translate(-215.73 -1774.69)"/><path class="cls-1" d="M414,2157.17a147.75,147.75,0,0,1-147.74-147.74h-50.5c0,109.49,88.75,198.24,198.24,198.24v-50.5Z" transform="translate(-215.73 -1774.69)"/><path class="cls-1" d="M480.17,2091a147.74,147.74,0,0,1-147.74-147.75H281.92c0,109.49,88.76,198.25,198.25,198.25V2091Z" transform="translate(-215.73 -1774.69)"/><path class="cls-1" d="M862.8,2017.5q-27.39,22.86-78.25,22.86h-65v112.19H654.82v-312h134q46.32,0,73.86,24.13t27.55,74.72Q890.2,1994.64,862.8,2017.5ZM813,1905.1q-12.37-10.36-34.7-10.38H719.59v91.87h58.75q22.32,0,34.7-11.22t12.39-35.56Q825.43,1915.48,813,1905.1Z" transform="translate(-215.73 -1774.69)"/><path class="cls-1" d="M1045.69,1916.42c.78.08,2.51.19,5.19.32v61.81c-3.81-.42-7.2-.71-10.16-.85s-5.36-.21-7.2-.21q-36.4,0-48.89,23.71-7,13.33-7,41.06v110.29H916.89V1921.82h57.58V1962q14-23.07,24.34-31.54,16.94-14.18,44-14.18C1044,1916.32,1044.92,1916.35,1045.69,1916.42Z" transform="translate(-215.73 -1774.69)"/><path class="cls-1" d="M1265.64,2124.32q-29.21,36.06-88.69,36.06t-88.69-36.06Q1059,2088.26,1059,2037.5q0-49.9,29.22-86.5t88.69-36.59q59.47,0,88.69,36.59t29.21,86.5Q1294.85,2088.26,1265.64,2124.32ZM1217.38,2091q14.17-18.81,14.18-53.48t-14.18-53.37q-14.19-18.7-40.64-18.71T1136,1984.13q-14.29,18.72-14.29,53.37T1136,2091q14.28,18.81,40.75,18.81T1217.38,2091Z" transform="translate(-215.73 -1774.69)"/><path class="cls-1" d="M1371.81,2078.88q1.92,16.1,8.29,22.87,11.28,12.06,41.7,12.06,17.85,0,28.39-5.29t10.53-15.88a17.12,17.12,0,0,0-8.48-15.45q-8.49-5.28-63.12-18.2-39.33-9.73-55.41-24.35-16.08-14.39-16.09-41.49,0-32,25.14-54.93t70.75-23q43.26,0,70.53,17.25t31.29,59.59H1455q-1.27-11.64-6.58-18.42-10-12.27-34-12.28-19.74,0-28.13,6.14t-8.38,14.4c0,6.91,3,11.93,8.92,15q8.89,4.89,63,16.73,36,8.46,54.05,25.61,17.77,17.35,17.78,43.39,0,34.3-25.56,56t-79,21.7q-54.51,0-80.49-23t-26-58.53Z" transform="translate(-215.73 -1774.69)"/><path class="cls-1" d="M1745.54,2124.32q-29.22,36.06-88.7,36.06t-88.69-36.06q-29.2-36.06-29.21-86.82,0-49.9,29.21-86.5t88.69-36.59q59.49,0,88.7,36.59t29.21,86.5Q1774.75,2088.26,1745.54,2124.32ZM1697.27,2091q14.19-18.81,14.19-53.48t-14.19-53.37q-14.18-18.7-40.64-18.71t-40.75,18.71q-14.28,18.72-14.28,53.37t14.28,53.48q14.3,18.81,40.75,18.81T1697.27,2091Z" transform="translate(-215.73 -1774.69)"/><path class="cls-1" d="M1992.75,1946.59q28.24,29.84,28.23,87.63,0,61-27.58,92.93t-71.06,32q-27.69,0-46-13.76-10-7.62-19.6-22.23v120.24H1797V1921.82h57.79v34.08q9.79-15,20.88-23.71,20.23-15.43,48.15-15.45Q1964.53,1916.74,1992.75,1946.59Zm-46.3,43.39q-12.3-20.52-39.88-20.53-33.15,0-45.54,31.11-6.43,16.51-6.42,41.92,0,40.21,21.58,56.51,12.82,9.53,30.37,9.53,25.45,0,38.83-19.48t13.36-51.86Q1958.75,2010.51,1946.45,1990Z" transform="translate(-215.73 -1774.69)"/><path class="cls-1" d="M2249.14,2124.32q-29.2,36.06-88.69,36.06t-88.69-36.06q-29.22-36.06-29.21-86.82,0-49.9,29.21-86.5t88.69-36.59q59.49,0,88.69,36.59t29.22,86.5Q2278.36,2088.26,2249.14,2124.32ZM2200.88,2091q14.19-18.81,14.18-53.48t-14.18-53.37q-14.18-18.7-40.64-18.71t-40.75,18.71q-14.28,18.72-14.29,53.37t14.29,53.48q14.3,18.81,40.75,18.81T2200.88,2091Z" transform="translate(-215.73 -1774.69)"/></svg>', k1 = '<svg id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2062.63 468.67" height="35px" width="140px"><defs><style>.cls-1{fill:#fff;}</style></defs><title>Prosopo Logo Black</title><path class="cls-1" d="M335.55,1825.19A147.75,147.75,0,0,1,483.3,1972.94h50.5c0-109.49-88.76-198.25-198.25-198.25v50.5Z" transform="translate(-215.73 -1774.69)"/><path class="cls-1" d="M269.36,1891.39A147.74,147.74,0,0,1,417.1,2039.13h50.5c0-109.49-88.75-198.24-198.24-198.24v50.5Z" transform="translate(-215.73 -1774.69)"/><path class="cls-1" d="M414,2157.17a147.75,147.75,0,0,1-147.74-147.74h-50.5c0,109.49,88.75,198.24,198.24,198.24v-50.5Z" transform="translate(-215.73 -1774.69)"/><path class="cls-1" d="M480.17,2091a147.74,147.74,0,0,1-147.74-147.75H281.92c0,109.49,88.76,198.25,198.25,198.25V2091Z" transform="translate(-215.73 -1774.69)"/><path class="cls-1" d="M862.8,2017.5q-27.39,22.86-78.25,22.86h-65v112.19H654.82v-312h134q46.32,0,73.86,24.13t27.55,74.72Q890.2,1994.64,862.8,2017.5ZM813,1905.1q-12.37-10.36-34.7-10.38H719.59v91.87h58.75q22.32,0,34.7-11.22t12.39-35.56Q825.43,1915.48,813,1905.1Z" transform="translate(-215.73 -1774.69)"/><path class="cls-1" d="M1045.69,1916.42c.78.08,2.51.19,5.19.32v61.81c-3.81-.42-7.2-.71-10.16-.85s-5.36-.21-7.2-.21q-36.4,0-48.89,23.71-7,13.33-7,41.06v110.29H916.89V1921.82h57.58V1962q14-23.07,24.34-31.54,16.94-14.18,44-14.18C1044,1916.32,1044.92,1916.35,1045.69,1916.42Z" transform="translate(-215.73 -1774.69)"/><path class="cls-1" d="M1265.64,2124.32q-29.21,36.06-88.69,36.06t-88.69-36.06Q1059,2088.26,1059,2037.5q0-49.9,29.22-86.5t88.69-36.59q59.47,0,88.69,36.59t29.21,86.5Q1294.85,2088.26,1265.64,2124.32ZM1217.38,2091q14.17-18.81,14.18-53.48t-14.18-53.37q-14.19-18.7-40.64-18.71T1136,1984.13q-14.29,18.72-14.29,53.37T1136,2091q14.28,18.81,40.75,18.81T1217.38,2091Z" transform="translate(-215.73 -1774.69)"/><path class="cls-1" d="M1371.81,2078.88q1.92,16.1,8.29,22.87,11.28,12.06,41.7,12.06,17.85,0,28.39-5.29t10.53-15.88a17.12,17.12,0,0,0-8.48-15.45q-8.49-5.28-63.12-18.2-39.33-9.73-55.41-24.35-16.08-14.39-16.09-41.49,0-32,25.14-54.93t70.75-23q43.26,0,70.53,17.25t31.29,59.59H1455q-1.27-11.64-6.58-18.42-10-12.27-34-12.28-19.74,0-28.13,6.14t-8.38,14.4c0,6.91,3,11.93,8.92,15q8.89,4.89,63,16.73,36,8.46,54.05,25.61,17.77,17.35,17.78,43.39,0,34.3-25.56,56t-79,21.7q-54.51,0-80.49-23t-26-58.53Z" transform="translate(-215.73 -1774.69)"/><path class="cls-1" d="M1745.54,2124.32q-29.22,36.06-88.7,36.06t-88.69-36.06q-29.2-36.06-29.21-86.82,0-49.9,29.21-86.5t88.69-36.59q59.49,0,88.7,36.59t29.21,86.5Q1774.75,2088.26,1745.54,2124.32ZM1697.27,2091q14.19-18.81,14.19-53.48t-14.19-53.37q-14.18-18.7-40.64-18.71t-40.75,18.71q-14.28,18.72-14.28,53.37t14.28,53.48q14.3,18.81,40.75,18.81T1697.27,2091Z" transform="translate(-215.73 -1774.69)"/><path class="cls-1" d="M1992.75,1946.59q28.24,29.84,28.23,87.63,0,61-27.58,92.93t-71.06,32q-27.69,0-46-13.76-10-7.62-19.6-22.23v120.24H1797V1921.82h57.79v34.08q9.79-15,20.88-23.71,20.23-15.43,48.15-15.45Q1964.53,1916.74,1992.75,1946.59Zm-46.3,43.39q-12.3-20.52-39.88-20.53-33.15,0-45.54,31.11-6.43,16.51-6.42,41.92,0,40.21,21.58,56.51,12.82,9.53,30.37,9.53,25.45,0,38.83-19.48t13.36-51.86Q1958.75,2010.51,1946.45,1990Z" transform="translate(-215.73 -1774.69)"/><path class="cls-1" d="M2249.14,2124.32q-29.2,36.06-88.69,36.06t-88.69-36.06q-29.22-36.06-29.21-86.82,0-49.9,29.21-86.5t88.69-36.59q59.49,0,88.69,36.59t29.22,86.5Q2278.36,2088.26,2249.14,2124.32ZM2200.88,2091q14.19-18.81,14.18-53.48t-14.18-53.37q-14.18-18.7-40.64-18.71t-40.75,18.71q-14.28,18.72-14.29,53.37t14.29,53.48q14.3,18.81,40.75,18.81T2200.88,2091Z" transform="translate(-215.73 -1774.69)"/></svg>', x1 = '<svg id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 348" height="35px"><path id="Vector" d="M95.7053 40.2707C127.005 40.2707 157.022 52.6841 179.154 74.78C201.286 96.8759 213.719 126.844 213.719 158.093H254.056C254.056 70.7808 183.16 -4.57764e-05 95.7053 -4.57764e-05V40.2707Z" fill="#fff"/><path id="Vector_2" d="M42.8365 93.0614C58.3333 93.0614 73.6784 96.1087 87.9955 102.029C102.313 107.95 115.322 116.628 126.279 127.568C137.237 138.508 145.93 151.496 151.86 165.79C157.79 180.084 160.843 195.404 160.843 210.875H201.179C201.179 123.564 130.291 52.7906 42.8365 52.7906V93.0614Z" fill="#fff"/><path id="Vector_3" d="M158.367 305.005C127.07 305.003 97.056 292.59 74.926 270.496C52.796 248.402 40.3626 218.437 40.3604 187.191H0.0239563C0.0239563 274.503 70.9123 345.276 158.367 345.276V305.005Z" fill="#fff"/><path id="Vector_4" d="M211.219 252.239C195.722 252.239 180.376 249.191 166.059 243.27C151.741 237.349 138.732 228.67 127.774 217.729C116.816 206.788 108.123 193.799 102.194 179.505C96.2637 165.21 93.2121 149.889 93.2132 134.417H52.8687C52.8687 221.729 123.765 292.509 211.219 292.509V252.239Z" fill="#fff"/></g><defs><clipPath id="clip0_1_2"><rect width="254" height="345" fill="white"/></clipPath></defs></svg>', S1 = '<svg id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 348" height="35px"><path id="Vector" d="M95.7053 40.2707C127.005 40.2707 157.022 52.6841 179.154 74.78C201.286 96.8759 213.719 126.844 213.719 158.093H254.056C254.056 70.7808 183.16 -4.57764e-05 95.7053 -4.57764e-05V40.2707Z" fill="#000000"/><path id="Vector_2" d="M42.8365 93.0614C58.3333 93.0614 73.6784 96.1087 87.9955 102.029C102.313 107.95 115.322 116.628 126.279 127.568C137.237 138.508 145.93 151.496 151.86 165.79C157.79 180.084 160.843 195.404 160.843 210.875H201.179C201.179 123.564 130.291 52.7906 42.8365 52.7906V93.0614Z" fill="#000000"/><path id="Vector_3" d="M158.367 305.005C127.07 305.003 97.056 292.59 74.926 270.496C52.796 248.402 40.3626 218.437 40.3604 187.191H0.0239563C0.0239563 274.503 70.9123 345.276 158.367 345.276V305.005Z" fill="#000000"/><path id="Vector_4" d="M211.219 252.239C195.722 252.239 180.376 249.191 166.059 243.27C151.741 237.349 138.732 228.67 127.774 217.729C116.816 206.788 108.123 193.799 102.194 179.505C96.2637 165.21 93.2121 149.889 93.2132 134.417H52.8687C52.8687 221.729 123.765 292.509 211.219 292.509V252.239Z" fill="#000000"/></g><defs><clipPath id="clip0_1_2"><rect width="254" height="345" fill="white"/></clipPath></defs></svg>', C1 = oe.lazy(async () => import("./ProcaptchaWidget-4aab717b.js")), E1 = (e) => ve(oe.Suspense, { fallback: ve(w1, { darkMode: e.config.theme }), children: ve(C1, { config: e.config, callbacks: e.callbacks }) }), T1 = E1;
var Nd = { exports: {} }, He = {}, Pd = { exports: {} }, Od = {};
(function(e) {
  function t(P, A) {
    var Z = P.length;
    P.push(A);
    e:
      for (; 0 < Z; ) {
        var le = Z - 1 >>> 1, fe = P[le];
        if (0 < i(fe, A))
          P[le] = A, P[Z] = fe, Z = le;
        else
          break e;
      }
  }
  function n(P) {
    return P.length === 0 ? null : P[0];
  }
  function r(P) {
    if (P.length === 0)
      return null;
    var A = P[0], Z = P.pop();
    if (Z !== A) {
      P[0] = Z;
      e:
        for (var le = 0, fe = P.length, xi = fe >>> 1; le < xi; ) {
          var on = 2 * (le + 1) - 1, _l = P[on], ln = on + 1, Si = P[ln];
          if (0 > i(_l, Z))
            ln < fe && 0 > i(Si, _l) ? (P[le] = Si, P[ln] = Z, le = ln) : (P[le] = _l, P[on] = Z, le = on);
          else if (ln < fe && 0 > i(Si, Z))
            P[le] = Si, P[ln] = Z, le = ln;
          else
            break e;
        }
    }
    return A;
  }
  function i(P, A) {
    var Z = P.sortIndex - A.sortIndex;
    return Z !== 0 ? Z : P.id - A.id;
  }
  if (typeof performance == "object" && typeof performance.now == "function") {
    var o = performance;
    e.unstable_now = function() {
      return o.now();
    };
  } else {
    var l = Date, s = l.now();
    e.unstable_now = function() {
      return l.now() - s;
    };
  }
  var a = [], u = [], p = 1, h = null, m = 3, w = !1, g = !1, v = !1, I = typeof setTimeout == "function" ? setTimeout : null, d = typeof clearTimeout == "function" ? clearTimeout : null, c = typeof setImmediate < "u" ? setImmediate : null;
  typeof navigator < "u" && navigator.scheduling !== void 0 && navigator.scheduling.isInputPending !== void 0 && navigator.scheduling.isInputPending.bind(navigator.scheduling);
  function f(P) {
    for (var A = n(u); A !== null; ) {
      if (A.callback === null)
        r(u);
      else if (A.startTime <= P)
        r(u), A.sortIndex = A.expirationTime, t(a, A);
      else
        break;
      A = n(u);
    }
  }
  function y(P) {
    if (v = !1, f(P), !g)
      if (n(a) !== null)
        g = !0, gl(S);
      else {
        var A = n(u);
        A !== null && wl(y, A.startTime - P);
      }
  }
  function S(P, A) {
    g = !1, v && (v = !1, d(O), O = -1), w = !0;
    var Z = m;
    try {
      for (f(A), h = n(a); h !== null && (!(h.expirationTime > A) || P && !be()); ) {
        var le = h.callback;
        if (typeof le == "function") {
          h.callback = null, m = h.priorityLevel;
          var fe = le(h.expirationTime <= A);
          A = e.unstable_now(), typeof fe == "function" ? h.callback = fe : h === n(a) && r(a), f(A);
        } else
          r(a);
        h = n(a);
      }
      if (h !== null)
        var xi = !0;
      else {
        var on = n(u);
        on !== null && wl(y, on.startTime - A), xi = !1;
      }
      return xi;
    } finally {
      h = null, m = Z, w = !1;
    }
  }
  var C = !1, x = null, O = -1, Y = 5, $ = -1;
  function be() {
    return !(e.unstable_now() - $ < Y);
  }
  function cr() {
    if (x !== null) {
      var P = e.unstable_now();
      $ = P;
      var A = !0;
      try {
        A = x(!0, P);
      } finally {
        A ? dr() : (C = !1, x = null);
      }
    } else
      C = !1;
  }
  var dr;
  if (typeof c == "function")
    dr = function() {
      c(cr);
    };
  else if (typeof MessageChannel < "u") {
    var su = new MessageChannel(), Ap = su.port2;
    su.port1.onmessage = cr, dr = function() {
      Ap.postMessage(null);
    };
  } else
    dr = function() {
      I(cr, 0);
    };
  function gl(P) {
    x = P, C || (C = !0, dr());
  }
  function wl(P, A) {
    O = I(function() {
      P(e.unstable_now());
    }, A);
  }
  e.unstable_IdlePriority = 5, e.unstable_ImmediatePriority = 1, e.unstable_LowPriority = 4, e.unstable_NormalPriority = 3, e.unstable_Profiling = null, e.unstable_UserBlockingPriority = 2, e.unstable_cancelCallback = function(P) {
    P.callback = null;
  }, e.unstable_continueExecution = function() {
    g || w || (g = !0, gl(S));
  }, e.unstable_forceFrameRate = function(P) {
    0 > P || 125 < P ? console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported") : Y = 0 < P ? Math.floor(1e3 / P) : 5;
  }, e.unstable_getCurrentPriorityLevel = function() {
    return m;
  }, e.unstable_getFirstCallbackNode = function() {
    return n(a);
  }, e.unstable_next = function(P) {
    switch (m) {
      case 1:
      case 2:
      case 3:
        var A = 3;
        break;
      default:
        A = m;
    }
    var Z = m;
    m = A;
    try {
      return P();
    } finally {
      m = Z;
    }
  }, e.unstable_pauseExecution = function() {
  }, e.unstable_requestPaint = function() {
  }, e.unstable_runWithPriority = function(P, A) {
    switch (P) {
      case 1:
      case 2:
      case 3:
      case 4:
      case 5:
        break;
      default:
        P = 3;
    }
    var Z = m;
    m = P;
    try {
      return A();
    } finally {
      m = Z;
    }
  }, e.unstable_scheduleCallback = function(P, A, Z) {
    var le = e.unstable_now();
    switch (typeof Z == "object" && Z !== null ? (Z = Z.delay, Z = typeof Z == "number" && 0 < Z ? le + Z : le) : Z = le, P) {
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
    return fe = Z + fe, P = { id: p++, callback: A, priorityLevel: P, startTime: Z, expirationTime: fe, sortIndex: -1 }, Z > le ? (P.sortIndex = Z, t(u, P), n(a) === null && P === n(u) && (v ? (d(O), O = -1) : v = !0, wl(y, Z - le))) : (P.sortIndex = fe, t(a, P), g || w || (g = !0, gl(S))), P;
  }, e.unstable_shouldYield = be, e.unstable_wrapCallback = function(P) {
    var A = m;
    return function() {
      var Z = m;
      m = A;
      try {
        return P.apply(this, arguments);
      } finally {
        m = Z;
      }
    };
  };
})(Od);
Pd.exports = Od;
var N1 = Pd.exports;
var Rd = oe, Be = N1;
function _(e) {
  for (var t = "https://reactjs.org/docs/error-decoder.html?invariant=" + e, n = 1; n < arguments.length; n++)
    t += "&args[]=" + encodeURIComponent(arguments[n]);
  return "Minified React error #" + e + "; visit " + t + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
}
var Md = /* @__PURE__ */ new Set(), Xr = {};
function Tn(e, t) {
  bn(e, t), bn(e + "Capture", t);
}
function bn(e, t) {
  for (Xr[e] = t, e = 0; e < t.length; e++)
    Md.add(t[e]);
}
var Pt = !(typeof window > "u" || typeof window.document > "u" || typeof window.document.createElement > "u"), cs = Object.prototype.hasOwnProperty, P1 = /^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/, Nu = {}, Pu = {};
function O1(e) {
  return cs.call(Pu, e) ? !0 : cs.call(Nu, e) ? !1 : P1.test(e) ? Pu[e] = !0 : (Nu[e] = !0, !1);
}
function R1(e, t, n, r) {
  if (n !== null && n.type === 0)
    return !1;
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
function M1(e, t, n, r) {
  if (t === null || typeof t > "u" || R1(e, t, n, r))
    return !0;
  if (r)
    return !1;
  if (n !== null)
    switch (n.type) {
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
function Ie(e, t, n, r, i, o, l) {
  this.acceptsBooleans = t === 2 || t === 3 || t === 4, this.attributeName = r, this.attributeNamespace = i, this.mustUseProperty = n, this.propertyName = e, this.type = t, this.sanitizeURL = o, this.removeEmptyString = l;
}
var _e = {};
"children dangerouslySetInnerHTML defaultValue defaultChecked innerHTML suppressContentEditableWarning suppressHydrationWarning style".split(" ").forEach(function(e) {
  _e[e] = new Ie(e, 0, !1, e, null, !1, !1);
});
[["acceptCharset", "accept-charset"], ["className", "class"], ["htmlFor", "for"], ["httpEquiv", "http-equiv"]].forEach(function(e) {
  var t = e[0];
  _e[t] = new Ie(t, 1, !1, e[1], null, !1, !1);
});
["contentEditable", "draggable", "spellCheck", "value"].forEach(function(e) {
  _e[e] = new Ie(e, 2, !1, e.toLowerCase(), null, !1, !1);
});
["autoReverse", "externalResourcesRequired", "focusable", "preserveAlpha"].forEach(function(e) {
  _e[e] = new Ie(e, 2, !1, e, null, !1, !1);
});
"allowFullScreen async autoFocus autoPlay controls default defer disabled disablePictureInPicture disableRemotePlayback formNoValidate hidden loop noModule noValidate open playsInline readOnly required reversed scoped seamless itemScope".split(" ").forEach(function(e) {
  _e[e] = new Ie(e, 3, !1, e.toLowerCase(), null, !1, !1);
});
["checked", "multiple", "muted", "selected"].forEach(function(e) {
  _e[e] = new Ie(e, 3, !0, e, null, !1, !1);
});
["capture", "download"].forEach(function(e) {
  _e[e] = new Ie(e, 4, !1, e, null, !1, !1);
});
["cols", "rows", "size", "span"].forEach(function(e) {
  _e[e] = new Ie(e, 6, !1, e, null, !1, !1);
});
["rowSpan", "start"].forEach(function(e) {
  _e[e] = new Ie(e, 5, !1, e.toLowerCase(), null, !1, !1);
});
var va = /[\-:]([a-z])/g;
function ya(e) {
  return e[1].toUpperCase();
}
"accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height".split(" ").forEach(function(e) {
  var t = e.replace(
    va,
    ya
  );
  _e[t] = new Ie(t, 1, !1, e, null, !1, !1);
});
"xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type".split(" ").forEach(function(e) {
  var t = e.replace(va, ya);
  _e[t] = new Ie(t, 1, !1, e, "http://www.w3.org/1999/xlink", !1, !1);
});
["xml:base", "xml:lang", "xml:space"].forEach(function(e) {
  var t = e.replace(va, ya);
  _e[t] = new Ie(t, 1, !1, e, "http://www.w3.org/XML/1998/namespace", !1, !1);
});
["tabIndex", "crossOrigin"].forEach(function(e) {
  _e[e] = new Ie(e, 1, !1, e.toLowerCase(), null, !1, !1);
});
_e.xlinkHref = new Ie("xlinkHref", 1, !1, "xlink:href", "http://www.w3.org/1999/xlink", !0, !1);
["src", "href", "action", "formAction"].forEach(function(e) {
  _e[e] = new Ie(e, 1, !1, e.toLowerCase(), null, !0, !0);
});
function ga(e, t, n, r) {
  var i = _e.hasOwnProperty(t) ? _e[t] : null;
  (i !== null ? i.type !== 0 : r || !(2 < t.length) || t[0] !== "o" && t[0] !== "O" || t[1] !== "n" && t[1] !== "N") && (M1(t, n, i, r) && (n = null), r || i === null ? O1(t) && (n === null ? e.removeAttribute(t) : e.setAttribute(t, "" + n)) : i.mustUseProperty ? e[i.propertyName] = n === null ? i.type === 3 ? !1 : "" : n : (t = i.attributeName, r = i.attributeNamespace, n === null ? e.removeAttribute(t) : (i = i.type, n = i === 3 || i === 4 && n === !0 ? "" : "" + n, r ? e.setAttributeNS(r, t, n) : e.setAttribute(t, n))));
}
var Lt = Rd.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED, Ti = Symbol.for("react.element"), Rn = Symbol.for("react.portal"), Mn = Symbol.for("react.fragment"), wa = Symbol.for("react.strict_mode"), ds = Symbol.for("react.profiler"), Id = Symbol.for("react.provider"), Ld = Symbol.for("react.context"), _a = Symbol.for("react.forward_ref"), fs = Symbol.for("react.suspense"), ps = Symbol.for("react.suspense_list"), ka = Symbol.for("react.memo"), jt = Symbol.for("react.lazy"), zd = Symbol.for("react.offscreen"), Ou = Symbol.iterator;
function pr(e) {
  return e === null || typeof e != "object" ? null : (e = Ou && e[Ou] || e["@@iterator"], typeof e == "function" ? e : null);
}
var re = Object.assign, Nl;
function kr(e) {
  if (Nl === void 0)
    try {
      throw Error();
    } catch (n) {
      var t = n.stack.trim().match(/\n( *(at )?)/);
      Nl = t && t[1] || "";
    }
  return `
` + Nl + e;
}
var Pl = !1;
function Ol(e, t) {
  if (!e || Pl)
    return "";
  Pl = !0;
  var n = Error.prepareStackTrace;
  Error.prepareStackTrace = void 0;
  try {
    if (t)
      if (t = function() {
        throw Error();
      }, Object.defineProperty(t.prototype, "props", { set: function() {
        throw Error();
      } }), typeof Reflect == "object" && Reflect.construct) {
        try {
          Reflect.construct(t, []);
        } catch (u) {
          var r = u;
        }
        Reflect.construct(e, [], t);
      } else {
        try {
          t.call();
        } catch (u) {
          r = u;
        }
        e.call(t.prototype);
      }
    else {
      try {
        throw Error();
      } catch (u) {
        r = u;
      }
      e();
    }
  } catch (u) {
    if (u && r && typeof u.stack == "string") {
      for (var i = u.stack.split(`
`), o = r.stack.split(`
`), l = i.length - 1, s = o.length - 1; 1 <= l && 0 <= s && i[l] !== o[s]; )
        s--;
      for (; 1 <= l && 0 <= s; l--, s--)
        if (i[l] !== o[s]) {
          if (l !== 1 || s !== 1)
            do
              if (l--, s--, 0 > s || i[l] !== o[s]) {
                var a = `
` + i[l].replace(" at new ", " at ");
                return e.displayName && a.includes("<anonymous>") && (a = a.replace("<anonymous>", e.displayName)), a;
              }
            while (1 <= l && 0 <= s);
          break;
        }
    }
  } finally {
    Pl = !1, Error.prepareStackTrace = n;
  }
  return (e = e ? e.displayName || e.name : "") ? kr(e) : "";
}
function I1(e) {
  switch (e.tag) {
    case 5:
      return kr(e.type);
    case 16:
      return kr("Lazy");
    case 13:
      return kr("Suspense");
    case 19:
      return kr("SuspenseList");
    case 0:
    case 2:
    case 15:
      return e = Ol(e.type, !1), e;
    case 11:
      return e = Ol(e.type.render, !1), e;
    case 1:
      return e = Ol(e.type, !0), e;
    default:
      return "";
  }
}
function hs(e) {
  if (e == null)
    return null;
  if (typeof e == "function")
    return e.displayName || e.name || null;
  if (typeof e == "string")
    return e;
  switch (e) {
    case Mn:
      return "Fragment";
    case Rn:
      return "Portal";
    case ds:
      return "Profiler";
    case wa:
      return "StrictMode";
    case fs:
      return "Suspense";
    case ps:
      return "SuspenseList";
  }
  if (typeof e == "object")
    switch (e.$$typeof) {
      case Ld:
        return (e.displayName || "Context") + ".Consumer";
      case Id:
        return (e._context.displayName || "Context") + ".Provider";
      case _a:
        var t = e.render;
        return e = e.displayName, e || (e = t.displayName || t.name || "", e = e !== "" ? "ForwardRef(" + e + ")" : "ForwardRef"), e;
      case ka:
        return t = e.displayName || null, t !== null ? t : hs(e.type) || "Memo";
      case jt:
        t = e._payload, e = e._init;
        try {
          return hs(e(t));
        } catch {
        }
    }
  return null;
}
function L1(e) {
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
      return hs(t);
    case 8:
      return t === wa ? "StrictMode" : "Mode";
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
      if (typeof t == "function")
        return t.displayName || t.name || null;
      if (typeof t == "string")
        return t;
  }
  return null;
}
function bt(e) {
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
function jd(e) {
  var t = e.type;
  return (e = e.nodeName) && e.toLowerCase() === "input" && (t === "checkbox" || t === "radio");
}
function z1(e) {
  var t = jd(e) ? "checked" : "value", n = Object.getOwnPropertyDescriptor(e.constructor.prototype, t), r = "" + e[t];
  if (!e.hasOwnProperty(t) && typeof n < "u" && typeof n.get == "function" && typeof n.set == "function") {
    var i = n.get, o = n.set;
    return Object.defineProperty(e, t, { configurable: !0, get: function() {
      return i.call(this);
    }, set: function(l) {
      r = "" + l, o.call(this, l);
    } }), Object.defineProperty(e, t, { enumerable: n.enumerable }), { getValue: function() {
      return r;
    }, setValue: function(l) {
      r = "" + l;
    }, stopTracking: function() {
      e._valueTracker = null, delete e[t];
    } };
  }
}
function Ni(e) {
  e._valueTracker || (e._valueTracker = z1(e));
}
function Ad(e) {
  if (!e)
    return !1;
  var t = e._valueTracker;
  if (!t)
    return !0;
  var n = t.getValue(), r = "";
  return e && (r = jd(e) ? e.checked ? "true" : "false" : e.value), e = r, e !== n ? (t.setValue(e), !0) : !1;
}
function vo(e) {
  if (e = e || (typeof document < "u" ? document : void 0), typeof e > "u")
    return null;
  try {
    return e.activeElement || e.body;
  } catch {
    return e.body;
  }
}
function ms(e, t) {
  var n = t.checked;
  return re({}, t, { defaultChecked: void 0, defaultValue: void 0, value: void 0, checked: n ?? e._wrapperState.initialChecked });
}
function Ru(e, t) {
  var n = t.defaultValue == null ? "" : t.defaultValue, r = t.checked != null ? t.checked : t.defaultChecked;
  n = bt(t.value != null ? t.value : n), e._wrapperState = { initialChecked: r, initialValue: n, controlled: t.type === "checkbox" || t.type === "radio" ? t.checked != null : t.value != null };
}
function $d(e, t) {
  t = t.checked, t != null && ga(e, "checked", t, !1);
}
function vs(e, t) {
  $d(e, t);
  var n = bt(t.value), r = t.type;
  if (n != null)
    r === "number" ? (n === 0 && e.value === "" || e.value != n) && (e.value = "" + n) : e.value !== "" + n && (e.value = "" + n);
  else if (r === "submit" || r === "reset") {
    e.removeAttribute("value");
    return;
  }
  t.hasOwnProperty("value") ? ys(e, t.type, n) : t.hasOwnProperty("defaultValue") && ys(e, t.type, bt(t.defaultValue)), t.checked == null && t.defaultChecked != null && (e.defaultChecked = !!t.defaultChecked);
}
function Mu(e, t, n) {
  if (t.hasOwnProperty("value") || t.hasOwnProperty("defaultValue")) {
    var r = t.type;
    if (!(r !== "submit" && r !== "reset" || t.value !== void 0 && t.value !== null))
      return;
    t = "" + e._wrapperState.initialValue, n || t === e.value || (e.value = t), e.defaultValue = t;
  }
  n = e.name, n !== "" && (e.name = ""), e.defaultChecked = !!e._wrapperState.initialChecked, n !== "" && (e.name = n);
}
function ys(e, t, n) {
  (t !== "number" || vo(e.ownerDocument) !== e) && (n == null ? e.defaultValue = "" + e._wrapperState.initialValue : e.defaultValue !== "" + n && (e.defaultValue = "" + n));
}
var xr = Array.isArray;
function Wn(e, t, n, r) {
  if (e = e.options, t) {
    t = {};
    for (var i = 0; i < n.length; i++)
      t["$" + n[i]] = !0;
    for (n = 0; n < e.length; n++)
      i = t.hasOwnProperty("$" + e[n].value), e[n].selected !== i && (e[n].selected = i), i && r && (e[n].defaultSelected = !0);
  } else {
    for (n = "" + bt(n), t = null, i = 0; i < e.length; i++) {
      if (e[i].value === n) {
        e[i].selected = !0, r && (e[i].defaultSelected = !0);
        return;
      }
      t !== null || e[i].disabled || (t = e[i]);
    }
    t !== null && (t.selected = !0);
  }
}
function gs(e, t) {
  if (t.dangerouslySetInnerHTML != null)
    throw Error(_(91));
  return re({}, t, { value: void 0, defaultValue: void 0, children: "" + e._wrapperState.initialValue });
}
function Iu(e, t) {
  var n = t.value;
  if (n == null) {
    if (n = t.children, t = t.defaultValue, n != null) {
      if (t != null)
        throw Error(_(92));
      if (xr(n)) {
        if (1 < n.length)
          throw Error(_(93));
        n = n[0];
      }
      t = n;
    }
    t == null && (t = ""), n = t;
  }
  e._wrapperState = { initialValue: bt(n) };
}
function Dd(e, t) {
  var n = bt(t.value), r = bt(t.defaultValue);
  n != null && (n = "" + n, n !== e.value && (e.value = n), t.defaultValue == null && e.defaultValue !== n && (e.defaultValue = n)), r != null && (e.defaultValue = "" + r);
}
function Lu(e) {
  var t = e.textContent;
  t === e._wrapperState.initialValue && t !== "" && t !== null && (e.value = t);
}
function Zd(e) {
  switch (e) {
    case "svg":
      return "http://www.w3.org/2000/svg";
    case "math":
      return "http://www.w3.org/1998/Math/MathML";
    default:
      return "http://www.w3.org/1999/xhtml";
  }
}
function ws(e, t) {
  return e == null || e === "http://www.w3.org/1999/xhtml" ? Zd(t) : e === "http://www.w3.org/2000/svg" && t === "foreignObject" ? "http://www.w3.org/1999/xhtml" : e;
}
var Pi, Vd = function(e) {
  return typeof MSApp < "u" && MSApp.execUnsafeLocalFunction ? function(t, n, r, i) {
    MSApp.execUnsafeLocalFunction(function() {
      return e(t, n, r, i);
    });
  } : e;
}(function(e, t) {
  if (e.namespaceURI !== "http://www.w3.org/2000/svg" || "innerHTML" in e)
    e.innerHTML = t;
  else {
    for (Pi = Pi || document.createElement("div"), Pi.innerHTML = "<svg>" + t.valueOf().toString() + "</svg>", t = Pi.firstChild; e.firstChild; )
      e.removeChild(e.firstChild);
    for (; t.firstChild; )
      e.appendChild(t.firstChild);
  }
});
function Jr(e, t) {
  if (t) {
    var n = e.firstChild;
    if (n && n === e.lastChild && n.nodeType === 3) {
      n.nodeValue = t;
      return;
    }
  }
  e.textContent = t;
}
var Er = {
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
}, j1 = ["Webkit", "ms", "Moz", "O"];
Object.keys(Er).forEach(function(e) {
  j1.forEach(function(t) {
    t = t + e.charAt(0).toUpperCase() + e.substring(1), Er[t] = Er[e];
  });
});
function Ud(e, t, n) {
  return t == null || typeof t == "boolean" || t === "" ? "" : n || typeof t != "number" || t === 0 || Er.hasOwnProperty(e) && Er[e] ? ("" + t).trim() : t + "px";
}
function Fd(e, t) {
  e = e.style;
  for (var n in t)
    if (t.hasOwnProperty(n)) {
      var r = n.indexOf("--") === 0, i = Ud(n, t[n], r);
      n === "float" && (n = "cssFloat"), r ? e.setProperty(n, i) : e[n] = i;
    }
}
var A1 = re({ menuitem: !0 }, { area: !0, base: !0, br: !0, col: !0, embed: !0, hr: !0, img: !0, input: !0, keygen: !0, link: !0, meta: !0, param: !0, source: !0, track: !0, wbr: !0 });
function _s(e, t) {
  if (t) {
    if (A1[e] && (t.children != null || t.dangerouslySetInnerHTML != null))
      throw Error(_(137, e));
    if (t.dangerouslySetInnerHTML != null) {
      if (t.children != null)
        throw Error(_(60));
      if (typeof t.dangerouslySetInnerHTML != "object" || !("__html" in t.dangerouslySetInnerHTML))
        throw Error(_(61));
    }
    if (t.style != null && typeof t.style != "object")
      throw Error(_(62));
  }
}
function ks(e, t) {
  if (e.indexOf("-") === -1)
    return typeof t.is == "string";
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
var xs = null;
function xa(e) {
  return e = e.target || e.srcElement || window, e.correspondingUseElement && (e = e.correspondingUseElement), e.nodeType === 3 ? e.parentNode : e;
}
var Ss = null, Hn = null, Qn = null;
function zu(e) {
  if (e = _i(e)) {
    if (typeof Ss != "function")
      throw Error(_(280));
    var t = e.stateNode;
    t && (t = sl(t), Ss(e.stateNode, e.type, t));
  }
}
function Bd(e) {
  Hn ? Qn ? Qn.push(e) : Qn = [e] : Hn = e;
}
function Wd() {
  if (Hn) {
    var e = Hn, t = Qn;
    if (Qn = Hn = null, zu(e), t)
      for (e = 0; e < t.length; e++)
        zu(t[e]);
  }
}
function Hd(e, t) {
  return e(t);
}
function Qd() {
}
var Rl = !1;
function qd(e, t, n) {
  if (Rl)
    return e(t, n);
  Rl = !0;
  try {
    return Hd(e, t, n);
  } finally {
    Rl = !1, (Hn !== null || Qn !== null) && (Qd(), Wd());
  }
}
function br(e, t) {
  var n = e.stateNode;
  if (n === null)
    return null;
  var r = sl(n);
  if (r === null)
    return null;
  n = r[t];
  e:
    switch (t) {
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
  if (e)
    return null;
  if (n && typeof n != "function")
    throw Error(_(231, t, typeof n));
  return n;
}
var Cs = !1;
if (Pt)
  try {
    var hr = {};
    Object.defineProperty(hr, "passive", { get: function() {
      Cs = !0;
    } }), window.addEventListener("test", hr, hr), window.removeEventListener("test", hr, hr);
  } catch {
    Cs = !1;
  }
function $1(e, t, n, r, i, o, l, s, a) {
  var u = Array.prototype.slice.call(arguments, 3);
  try {
    t.apply(n, u);
  } catch (p) {
    this.onError(p);
  }
}
var Tr = !1, yo = null, go = !1, Es = null, D1 = { onError: function(e) {
  Tr = !0, yo = e;
} };
function Z1(e, t, n, r, i, o, l, s, a) {
  Tr = !1, yo = null, $1.apply(D1, arguments);
}
function V1(e, t, n, r, i, o, l, s, a) {
  if (Z1.apply(this, arguments), Tr) {
    if (Tr) {
      var u = yo;
      Tr = !1, yo = null;
    } else
      throw Error(_(198));
    go || (go = !0, Es = u);
  }
}
function Nn(e) {
  var t = e, n = e;
  if (e.alternate)
    for (; t.return; )
      t = t.return;
  else {
    e = t;
    do
      t = e, t.flags & 4098 && (n = t.return), e = t.return;
    while (e);
  }
  return t.tag === 3 ? n : null;
}
function Kd(e) {
  if (e.tag === 13) {
    var t = e.memoizedState;
    if (t === null && (e = e.alternate, e !== null && (t = e.memoizedState)), t !== null)
      return t.dehydrated;
  }
  return null;
}
function ju(e) {
  if (Nn(e) !== e)
    throw Error(_(188));
}
function U1(e) {
  var t = e.alternate;
  if (!t) {
    if (t = Nn(e), t === null)
      throw Error(_(188));
    return t !== e ? null : e;
  }
  for (var n = e, r = t; ; ) {
    var i = n.return;
    if (i === null)
      break;
    var o = i.alternate;
    if (o === null) {
      if (r = i.return, r !== null) {
        n = r;
        continue;
      }
      break;
    }
    if (i.child === o.child) {
      for (o = i.child; o; ) {
        if (o === n)
          return ju(i), e;
        if (o === r)
          return ju(i), t;
        o = o.sibling;
      }
      throw Error(_(188));
    }
    if (n.return !== r.return)
      n = i, r = o;
    else {
      for (var l = !1, s = i.child; s; ) {
        if (s === n) {
          l = !0, n = i, r = o;
          break;
        }
        if (s === r) {
          l = !0, r = i, n = o;
          break;
        }
        s = s.sibling;
      }
      if (!l) {
        for (s = o.child; s; ) {
          if (s === n) {
            l = !0, n = o, r = i;
            break;
          }
          if (s === r) {
            l = !0, r = o, n = i;
            break;
          }
          s = s.sibling;
        }
        if (!l)
          throw Error(_(189));
      }
    }
    if (n.alternate !== r)
      throw Error(_(190));
  }
  if (n.tag !== 3)
    throw Error(_(188));
  return n.stateNode.current === n ? e : t;
}
function Yd(e) {
  return e = U1(e), e !== null ? Gd(e) : null;
}
function Gd(e) {
  if (e.tag === 5 || e.tag === 6)
    return e;
  for (e = e.child; e !== null; ) {
    var t = Gd(e);
    if (t !== null)
      return t;
    e = e.sibling;
  }
  return null;
}
var Xd = Be.unstable_scheduleCallback, Au = Be.unstable_cancelCallback, F1 = Be.unstable_shouldYield, B1 = Be.unstable_requestPaint, se = Be.unstable_now, W1 = Be.unstable_getCurrentPriorityLevel, Sa = Be.unstable_ImmediatePriority, Jd = Be.unstable_UserBlockingPriority, wo = Be.unstable_NormalPriority, H1 = Be.unstable_LowPriority, bd = Be.unstable_IdlePriority, rl = null, yt = null;
function Q1(e) {
  if (yt && typeof yt.onCommitFiberRoot == "function")
    try {
      yt.onCommitFiberRoot(rl, e, void 0, (e.current.flags & 128) === 128);
    } catch {
    }
}
var st = Math.clz32 ? Math.clz32 : Y1, q1 = Math.log, K1 = Math.LN2;
function Y1(e) {
  return e >>>= 0, e === 0 ? 32 : 31 - (q1(e) / K1 | 0) | 0;
}
var Oi = 64, Ri = 4194304;
function Sr(e) {
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
function _o(e, t) {
  var n = e.pendingLanes;
  if (n === 0)
    return 0;
  var r = 0, i = e.suspendedLanes, o = e.pingedLanes, l = n & 268435455;
  if (l !== 0) {
    var s = l & ~i;
    s !== 0 ? r = Sr(s) : (o &= l, o !== 0 && (r = Sr(o)));
  } else
    l = n & ~i, l !== 0 ? r = Sr(l) : o !== 0 && (r = Sr(o));
  if (r === 0)
    return 0;
  if (t !== 0 && t !== r && !(t & i) && (i = r & -r, o = t & -t, i >= o || i === 16 && (o & 4194240) !== 0))
    return t;
  if (r & 4 && (r |= n & 16), t = e.entangledLanes, t !== 0)
    for (e = e.entanglements, t &= r; 0 < t; )
      n = 31 - st(t), i = 1 << n, r |= e[n], t &= ~i;
  return r;
}
function G1(e, t) {
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
function X1(e, t) {
  for (var n = e.suspendedLanes, r = e.pingedLanes, i = e.expirationTimes, o = e.pendingLanes; 0 < o; ) {
    var l = 31 - st(o), s = 1 << l, a = i[l];
    a === -1 ? (!(s & n) || s & r) && (i[l] = G1(s, t)) : a <= t && (e.expiredLanes |= s), o &= ~s;
  }
}
function Ts(e) {
  return e = e.pendingLanes & -1073741825, e !== 0 ? e : e & 1073741824 ? 1073741824 : 0;
}
function ef() {
  var e = Oi;
  return Oi <<= 1, !(Oi & 4194240) && (Oi = 64), e;
}
function Ml(e) {
  for (var t = [], n = 0; 31 > n; n++)
    t.push(e);
  return t;
}
function gi(e, t, n) {
  e.pendingLanes |= t, t !== 536870912 && (e.suspendedLanes = 0, e.pingedLanes = 0), e = e.eventTimes, t = 31 - st(t), e[t] = n;
}
function J1(e, t) {
  var n = e.pendingLanes & ~t;
  e.pendingLanes = t, e.suspendedLanes = 0, e.pingedLanes = 0, e.expiredLanes &= t, e.mutableReadLanes &= t, e.entangledLanes &= t, t = e.entanglements;
  var r = e.eventTimes;
  for (e = e.expirationTimes; 0 < n; ) {
    var i = 31 - st(n), o = 1 << i;
    t[i] = 0, r[i] = -1, e[i] = -1, n &= ~o;
  }
}
function Ca(e, t) {
  var n = e.entangledLanes |= t;
  for (e = e.entanglements; n; ) {
    var r = 31 - st(n), i = 1 << r;
    i & t | e[r] & t && (e[r] |= t), n &= ~i;
  }
}
var Q = 0;
function tf(e) {
  return e &= -e, 1 < e ? 4 < e ? e & 268435455 ? 16 : 536870912 : 4 : 1;
}
var nf, Ea, rf, of, lf, Ns = !1, Mi = [], Ft = null, Bt = null, Wt = null, ei = /* @__PURE__ */ new Map(), ti = /* @__PURE__ */ new Map(), Dt = [], b1 = "mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit".split(" ");
function $u(e, t) {
  switch (e) {
    case "focusin":
    case "focusout":
      Ft = null;
      break;
    case "dragenter":
    case "dragleave":
      Bt = null;
      break;
    case "mouseover":
    case "mouseout":
      Wt = null;
      break;
    case "pointerover":
    case "pointerout":
      ei.delete(t.pointerId);
      break;
    case "gotpointercapture":
    case "lostpointercapture":
      ti.delete(t.pointerId);
  }
}
function mr(e, t, n, r, i, o) {
  return e === null || e.nativeEvent !== o ? (e = { blockedOn: t, domEventName: n, eventSystemFlags: r, nativeEvent: o, targetContainers: [i] }, t !== null && (t = _i(t), t !== null && Ea(t)), e) : (e.eventSystemFlags |= r, t = e.targetContainers, i !== null && t.indexOf(i) === -1 && t.push(i), e);
}
function ev(e, t, n, r, i) {
  switch (t) {
    case "focusin":
      return Ft = mr(Ft, e, t, n, r, i), !0;
    case "dragenter":
      return Bt = mr(Bt, e, t, n, r, i), !0;
    case "mouseover":
      return Wt = mr(Wt, e, t, n, r, i), !0;
    case "pointerover":
      var o = i.pointerId;
      return ei.set(o, mr(ei.get(o) || null, e, t, n, r, i)), !0;
    case "gotpointercapture":
      return o = i.pointerId, ti.set(o, mr(ti.get(o) || null, e, t, n, r, i)), !0;
  }
  return !1;
}
function sf(e) {
  var t = dn(e.target);
  if (t !== null) {
    var n = Nn(t);
    if (n !== null) {
      if (t = n.tag, t === 13) {
        if (t = Kd(n), t !== null) {
          e.blockedOn = t, lf(e.priority, function() {
            rf(n);
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
function Ki(e) {
  if (e.blockedOn !== null)
    return !1;
  for (var t = e.targetContainers; 0 < t.length; ) {
    var n = Ps(e.domEventName, e.eventSystemFlags, t[0], e.nativeEvent);
    if (n === null) {
      n = e.nativeEvent;
      var r = new n.constructor(n.type, n);
      xs = r, n.target.dispatchEvent(r), xs = null;
    } else
      return t = _i(n), t !== null && Ea(t), e.blockedOn = n, !1;
    t.shift();
  }
  return !0;
}
function Du(e, t, n) {
  Ki(e) && n.delete(t);
}
function tv() {
  Ns = !1, Ft !== null && Ki(Ft) && (Ft = null), Bt !== null && Ki(Bt) && (Bt = null), Wt !== null && Ki(Wt) && (Wt = null), ei.forEach(Du), ti.forEach(Du);
}
function vr(e, t) {
  e.blockedOn === t && (e.blockedOn = null, Ns || (Ns = !0, Be.unstable_scheduleCallback(Be.unstable_NormalPriority, tv)));
}
function ni(e) {
  function t(i) {
    return vr(i, e);
  }
  if (0 < Mi.length) {
    vr(Mi[0], e);
    for (var n = 1; n < Mi.length; n++) {
      var r = Mi[n];
      r.blockedOn === e && (r.blockedOn = null);
    }
  }
  for (Ft !== null && vr(Ft, e), Bt !== null && vr(Bt, e), Wt !== null && vr(Wt, e), ei.forEach(t), ti.forEach(t), n = 0; n < Dt.length; n++)
    r = Dt[n], r.blockedOn === e && (r.blockedOn = null);
  for (; 0 < Dt.length && (n = Dt[0], n.blockedOn === null); )
    sf(n), n.blockedOn === null && Dt.shift();
}
var qn = Lt.ReactCurrentBatchConfig, ko = !0;
function nv(e, t, n, r) {
  var i = Q, o = qn.transition;
  qn.transition = null;
  try {
    Q = 1, Ta(e, t, n, r);
  } finally {
    Q = i, qn.transition = o;
  }
}
function rv(e, t, n, r) {
  var i = Q, o = qn.transition;
  qn.transition = null;
  try {
    Q = 4, Ta(e, t, n, r);
  } finally {
    Q = i, qn.transition = o;
  }
}
function Ta(e, t, n, r) {
  if (ko) {
    var i = Ps(e, t, n, r);
    if (i === null)
      Ul(e, t, r, xo, n), $u(e, r);
    else if (ev(i, e, t, n, r))
      r.stopPropagation();
    else if ($u(e, r), t & 4 && -1 < b1.indexOf(e)) {
      for (; i !== null; ) {
        var o = _i(i);
        if (o !== null && nf(o), o = Ps(e, t, n, r), o === null && Ul(e, t, r, xo, n), o === i)
          break;
        i = o;
      }
      i !== null && r.stopPropagation();
    } else
      Ul(e, t, r, null, n);
  }
}
var xo = null;
function Ps(e, t, n, r) {
  if (xo = null, e = xa(r), e = dn(e), e !== null)
    if (t = Nn(e), t === null)
      e = null;
    else if (n = t.tag, n === 13) {
      if (e = Kd(t), e !== null)
        return e;
      e = null;
    } else if (n === 3) {
      if (t.stateNode.current.memoizedState.isDehydrated)
        return t.tag === 3 ? t.stateNode.containerInfo : null;
      e = null;
    } else
      t !== e && (e = null);
  return xo = e, null;
}
function af(e) {
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
      switch (W1()) {
        case Sa:
          return 1;
        case Jd:
          return 4;
        case wo:
        case H1:
          return 16;
        case bd:
          return 536870912;
        default:
          return 16;
      }
    default:
      return 16;
  }
}
var Vt = null, Na = null, Yi = null;
function uf() {
  if (Yi)
    return Yi;
  var e, t = Na, n = t.length, r, i = "value" in Vt ? Vt.value : Vt.textContent, o = i.length;
  for (e = 0; e < n && t[e] === i[e]; e++)
    ;
  var l = n - e;
  for (r = 1; r <= l && t[n - r] === i[o - r]; r++)
    ;
  return Yi = i.slice(e, 1 < r ? 1 - r : void 0);
}
function Gi(e) {
  var t = e.keyCode;
  return "charCode" in e ? (e = e.charCode, e === 0 && t === 13 && (e = 13)) : e = t, e === 10 && (e = 13), 32 <= e || e === 13 ? e : 0;
}
function Ii() {
  return !0;
}
function Zu() {
  return !1;
}
function Qe(e) {
  function t(n, r, i, o, l) {
    this._reactName = n, this._targetInst = i, this.type = r, this.nativeEvent = o, this.target = l, this.currentTarget = null;
    for (var s in e)
      e.hasOwnProperty(s) && (n = e[s], this[s] = n ? n(o) : o[s]);
    return this.isDefaultPrevented = (o.defaultPrevented != null ? o.defaultPrevented : o.returnValue === !1) ? Ii : Zu, this.isPropagationStopped = Zu, this;
  }
  return re(t.prototype, { preventDefault: function() {
    this.defaultPrevented = !0;
    var n = this.nativeEvent;
    n && (n.preventDefault ? n.preventDefault() : typeof n.returnValue != "unknown" && (n.returnValue = !1), this.isDefaultPrevented = Ii);
  }, stopPropagation: function() {
    var n = this.nativeEvent;
    n && (n.stopPropagation ? n.stopPropagation() : typeof n.cancelBubble != "unknown" && (n.cancelBubble = !0), this.isPropagationStopped = Ii);
  }, persist: function() {
  }, isPersistent: Ii }), t;
}
var ar = { eventPhase: 0, bubbles: 0, cancelable: 0, timeStamp: function(e) {
  return e.timeStamp || Date.now();
}, defaultPrevented: 0, isTrusted: 0 }, Pa = Qe(ar), wi = re({}, ar, { view: 0, detail: 0 }), iv = Qe(wi), Il, Ll, yr, il = re({}, wi, { screenX: 0, screenY: 0, clientX: 0, clientY: 0, pageX: 0, pageY: 0, ctrlKey: 0, shiftKey: 0, altKey: 0, metaKey: 0, getModifierState: Oa, button: 0, buttons: 0, relatedTarget: function(e) {
  return e.relatedTarget === void 0 ? e.fromElement === e.srcElement ? e.toElement : e.fromElement : e.relatedTarget;
}, movementX: function(e) {
  return "movementX" in e ? e.movementX : (e !== yr && (yr && e.type === "mousemove" ? (Il = e.screenX - yr.screenX, Ll = e.screenY - yr.screenY) : Ll = Il = 0, yr = e), Il);
}, movementY: function(e) {
  return "movementY" in e ? e.movementY : Ll;
} }), Vu = Qe(il), ov = re({}, il, { dataTransfer: 0 }), lv = Qe(ov), sv = re({}, wi, { relatedTarget: 0 }), zl = Qe(sv), av = re({}, ar, { animationName: 0, elapsedTime: 0, pseudoElement: 0 }), uv = Qe(av), cv = re({}, ar, { clipboardData: function(e) {
  return "clipboardData" in e ? e.clipboardData : window.clipboardData;
} }), dv = Qe(cv), fv = re({}, ar, { data: 0 }), Uu = Qe(fv), pv = {
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
}, hv = {
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
}, mv = { Alt: "altKey", Control: "ctrlKey", Meta: "metaKey", Shift: "shiftKey" };
function vv(e) {
  var t = this.nativeEvent;
  return t.getModifierState ? t.getModifierState(e) : (e = mv[e]) ? !!t[e] : !1;
}
function Oa() {
  return vv;
}
var yv = re({}, wi, { key: function(e) {
  if (e.key) {
    var t = pv[e.key] || e.key;
    if (t !== "Unidentified")
      return t;
  }
  return e.type === "keypress" ? (e = Gi(e), e === 13 ? "Enter" : String.fromCharCode(e)) : e.type === "keydown" || e.type === "keyup" ? hv[e.keyCode] || "Unidentified" : "";
}, code: 0, location: 0, ctrlKey: 0, shiftKey: 0, altKey: 0, metaKey: 0, repeat: 0, locale: 0, getModifierState: Oa, charCode: function(e) {
  return e.type === "keypress" ? Gi(e) : 0;
}, keyCode: function(e) {
  return e.type === "keydown" || e.type === "keyup" ? e.keyCode : 0;
}, which: function(e) {
  return e.type === "keypress" ? Gi(e) : e.type === "keydown" || e.type === "keyup" ? e.keyCode : 0;
} }), gv = Qe(yv), wv = re({}, il, { pointerId: 0, width: 0, height: 0, pressure: 0, tangentialPressure: 0, tiltX: 0, tiltY: 0, twist: 0, pointerType: 0, isPrimary: 0 }), Fu = Qe(wv), _v = re({}, wi, { touches: 0, targetTouches: 0, changedTouches: 0, altKey: 0, metaKey: 0, ctrlKey: 0, shiftKey: 0, getModifierState: Oa }), kv = Qe(_v), xv = re({}, ar, { propertyName: 0, elapsedTime: 0, pseudoElement: 0 }), Sv = Qe(xv), Cv = re({}, il, {
  deltaX: function(e) {
    return "deltaX" in e ? e.deltaX : "wheelDeltaX" in e ? -e.wheelDeltaX : 0;
  },
  deltaY: function(e) {
    return "deltaY" in e ? e.deltaY : "wheelDeltaY" in e ? -e.wheelDeltaY : "wheelDelta" in e ? -e.wheelDelta : 0;
  },
  deltaZ: 0,
  deltaMode: 0
}), Ev = Qe(Cv), Tv = [9, 13, 27, 32], Ra = Pt && "CompositionEvent" in window, Nr = null;
Pt && "documentMode" in document && (Nr = document.documentMode);
var Nv = Pt && "TextEvent" in window && !Nr, cf = Pt && (!Ra || Nr && 8 < Nr && 11 >= Nr), Bu = String.fromCharCode(32), Wu = !1;
function df(e, t) {
  switch (e) {
    case "keyup":
      return Tv.indexOf(t.keyCode) !== -1;
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
function ff(e) {
  return e = e.detail, typeof e == "object" && "data" in e ? e.data : null;
}
var In = !1;
function Pv(e, t) {
  switch (e) {
    case "compositionend":
      return ff(t);
    case "keypress":
      return t.which !== 32 ? null : (Wu = !0, Bu);
    case "textInput":
      return e = t.data, e === Bu && Wu ? null : e;
    default:
      return null;
  }
}
function Ov(e, t) {
  if (In)
    return e === "compositionend" || !Ra && df(e, t) ? (e = uf(), Yi = Na = Vt = null, In = !1, e) : null;
  switch (e) {
    case "paste":
      return null;
    case "keypress":
      if (!(t.ctrlKey || t.altKey || t.metaKey) || t.ctrlKey && t.altKey) {
        if (t.char && 1 < t.char.length)
          return t.char;
        if (t.which)
          return String.fromCharCode(t.which);
      }
      return null;
    case "compositionend":
      return cf && t.locale !== "ko" ? null : t.data;
    default:
      return null;
  }
}
var Rv = { color: !0, date: !0, datetime: !0, "datetime-local": !0, email: !0, month: !0, number: !0, password: !0, range: !0, search: !0, tel: !0, text: !0, time: !0, url: !0, week: !0 };
function Hu(e) {
  var t = e && e.nodeName && e.nodeName.toLowerCase();
  return t === "input" ? !!Rv[e.type] : t === "textarea";
}
function pf(e, t, n, r) {
  Bd(r), t = So(t, "onChange"), 0 < t.length && (n = new Pa("onChange", "change", null, n, r), e.push({ event: n, listeners: t }));
}
var Pr = null, ri = null;
function Mv(e) {
  Cf(e, 0);
}
function ol(e) {
  var t = jn(e);
  if (Ad(t))
    return e;
}
function Iv(e, t) {
  if (e === "change")
    return t;
}
var hf = !1;
if (Pt) {
  var jl;
  if (Pt) {
    var Al = "oninput" in document;
    if (!Al) {
      var Qu = document.createElement("div");
      Qu.setAttribute("oninput", "return;"), Al = typeof Qu.oninput == "function";
    }
    jl = Al;
  } else
    jl = !1;
  hf = jl && (!document.documentMode || 9 < document.documentMode);
}
function qu() {
  Pr && (Pr.detachEvent("onpropertychange", mf), ri = Pr = null);
}
function mf(e) {
  if (e.propertyName === "value" && ol(ri)) {
    var t = [];
    pf(t, ri, e, xa(e)), qd(Mv, t);
  }
}
function Lv(e, t, n) {
  e === "focusin" ? (qu(), Pr = t, ri = n, Pr.attachEvent("onpropertychange", mf)) : e === "focusout" && qu();
}
function zv(e) {
  if (e === "selectionchange" || e === "keyup" || e === "keydown")
    return ol(ri);
}
function jv(e, t) {
  if (e === "click")
    return ol(t);
}
function Av(e, t) {
  if (e === "input" || e === "change")
    return ol(t);
}
function $v(e, t) {
  return e === t && (e !== 0 || 1 / e === 1 / t) || e !== e && t !== t;
}
var ct = typeof Object.is == "function" ? Object.is : $v;
function ii(e, t) {
  if (ct(e, t))
    return !0;
  if (typeof e != "object" || e === null || typeof t != "object" || t === null)
    return !1;
  var n = Object.keys(e), r = Object.keys(t);
  if (n.length !== r.length)
    return !1;
  for (r = 0; r < n.length; r++) {
    var i = n[r];
    if (!cs.call(t, i) || !ct(e[i], t[i]))
      return !1;
  }
  return !0;
}
function Ku(e) {
  for (; e && e.firstChild; )
    e = e.firstChild;
  return e;
}
function Yu(e, t) {
  var n = Ku(e);
  e = 0;
  for (var r; n; ) {
    if (n.nodeType === 3) {
      if (r = e + n.textContent.length, e <= t && r >= t)
        return { node: n, offset: t - e };
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
    n = Ku(n);
  }
}
function vf(e, t) {
  return e && t ? e === t ? !0 : e && e.nodeType === 3 ? !1 : t && t.nodeType === 3 ? vf(e, t.parentNode) : "contains" in e ? e.contains(t) : e.compareDocumentPosition ? !!(e.compareDocumentPosition(t) & 16) : !1 : !1;
}
function yf() {
  for (var e = window, t = vo(); t instanceof e.HTMLIFrameElement; ) {
    try {
      var n = typeof t.contentWindow.location.href == "string";
    } catch {
      n = !1;
    }
    if (n)
      e = t.contentWindow;
    else
      break;
    t = vo(e.document);
  }
  return t;
}
function Ma(e) {
  var t = e && e.nodeName && e.nodeName.toLowerCase();
  return t && (t === "input" && (e.type === "text" || e.type === "search" || e.type === "tel" || e.type === "url" || e.type === "password") || t === "textarea" || e.contentEditable === "true");
}
function Dv(e) {
  var t = yf(), n = e.focusedElem, r = e.selectionRange;
  if (t !== n && n && n.ownerDocument && vf(n.ownerDocument.documentElement, n)) {
    if (r !== null && Ma(n)) {
      if (t = r.start, e = r.end, e === void 0 && (e = t), "selectionStart" in n)
        n.selectionStart = t, n.selectionEnd = Math.min(e, n.value.length);
      else if (e = (t = n.ownerDocument || document) && t.defaultView || window, e.getSelection) {
        e = e.getSelection();
        var i = n.textContent.length, o = Math.min(r.start, i);
        r = r.end === void 0 ? o : Math.min(r.end, i), !e.extend && o > r && (i = r, r = o, o = i), i = Yu(n, o);
        var l = Yu(
          n,
          r
        );
        i && l && (e.rangeCount !== 1 || e.anchorNode !== i.node || e.anchorOffset !== i.offset || e.focusNode !== l.node || e.focusOffset !== l.offset) && (t = t.createRange(), t.setStart(i.node, i.offset), e.removeAllRanges(), o > r ? (e.addRange(t), e.extend(l.node, l.offset)) : (t.setEnd(l.node, l.offset), e.addRange(t)));
      }
    }
    for (t = [], e = n; e = e.parentNode; )
      e.nodeType === 1 && t.push({ element: e, left: e.scrollLeft, top: e.scrollTop });
    for (typeof n.focus == "function" && n.focus(), n = 0; n < t.length; n++)
      e = t[n], e.element.scrollLeft = e.left, e.element.scrollTop = e.top;
  }
}
var Zv = Pt && "documentMode" in document && 11 >= document.documentMode, Ln = null, Os = null, Or = null, Rs = !1;
function Gu(e, t, n) {
  var r = n.window === n ? n.document : n.nodeType === 9 ? n : n.ownerDocument;
  Rs || Ln == null || Ln !== vo(r) || (r = Ln, "selectionStart" in r && Ma(r) ? r = { start: r.selectionStart, end: r.selectionEnd } : (r = (r.ownerDocument && r.ownerDocument.defaultView || window).getSelection(), r = { anchorNode: r.anchorNode, anchorOffset: r.anchorOffset, focusNode: r.focusNode, focusOffset: r.focusOffset }), Or && ii(Or, r) || (Or = r, r = So(Os, "onSelect"), 0 < r.length && (t = new Pa("onSelect", "select", null, t, n), e.push({ event: t, listeners: r }), t.target = Ln)));
}
function Li(e, t) {
  var n = {};
  return n[e.toLowerCase()] = t.toLowerCase(), n["Webkit" + e] = "webkit" + t, n["Moz" + e] = "moz" + t, n;
}
var zn = { animationend: Li("Animation", "AnimationEnd"), animationiteration: Li("Animation", "AnimationIteration"), animationstart: Li("Animation", "AnimationStart"), transitionend: Li("Transition", "TransitionEnd") }, $l = {}, gf = {};
Pt && (gf = document.createElement("div").style, "AnimationEvent" in window || (delete zn.animationend.animation, delete zn.animationiteration.animation, delete zn.animationstart.animation), "TransitionEvent" in window || delete zn.transitionend.transition);
function ll(e) {
  if ($l[e])
    return $l[e];
  if (!zn[e])
    return e;
  var t = zn[e], n;
  for (n in t)
    if (t.hasOwnProperty(n) && n in gf)
      return $l[e] = t[n];
  return e;
}
var wf = ll("animationend"), _f = ll("animationiteration"), kf = ll("animationstart"), xf = ll("transitionend"), Sf = /* @__PURE__ */ new Map(), Xu = "abort auxClick cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");
function tn(e, t) {
  Sf.set(e, t), Tn(t, [e]);
}
for (var Dl = 0; Dl < Xu.length; Dl++) {
  var Zl = Xu[Dl], Vv = Zl.toLowerCase(), Uv = Zl[0].toUpperCase() + Zl.slice(1);
  tn(Vv, "on" + Uv);
}
tn(wf, "onAnimationEnd");
tn(_f, "onAnimationIteration");
tn(kf, "onAnimationStart");
tn("dblclick", "onDoubleClick");
tn("focusin", "onFocus");
tn("focusout", "onBlur");
tn(xf, "onTransitionEnd");
bn("onMouseEnter", ["mouseout", "mouseover"]);
bn("onMouseLeave", ["mouseout", "mouseover"]);
bn("onPointerEnter", ["pointerout", "pointerover"]);
bn("onPointerLeave", ["pointerout", "pointerover"]);
Tn("onChange", "change click focusin focusout input keydown keyup selectionchange".split(" "));
Tn("onSelect", "focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" "));
Tn("onBeforeInput", ["compositionend", "keypress", "textInput", "paste"]);
Tn("onCompositionEnd", "compositionend focusout keydown keypress keyup mousedown".split(" "));
Tn("onCompositionStart", "compositionstart focusout keydown keypress keyup mousedown".split(" "));
Tn("onCompositionUpdate", "compositionupdate focusout keydown keypress keyup mousedown".split(" "));
var Cr = "abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" "), Fv = new Set("cancel close invalid load scroll toggle".split(" ").concat(Cr));
function Ju(e, t, n) {
  var r = e.type || "unknown-event";
  e.currentTarget = n, V1(r, t, void 0, e), e.currentTarget = null;
}
function Cf(e, t) {
  t = (t & 4) !== 0;
  for (var n = 0; n < e.length; n++) {
    var r = e[n], i = r.event;
    r = r.listeners;
    e: {
      var o = void 0;
      if (t)
        for (var l = r.length - 1; 0 <= l; l--) {
          var s = r[l], a = s.instance, u = s.currentTarget;
          if (s = s.listener, a !== o && i.isPropagationStopped())
            break e;
          Ju(i, s, u), o = a;
        }
      else
        for (l = 0; l < r.length; l++) {
          if (s = r[l], a = s.instance, u = s.currentTarget, s = s.listener, a !== o && i.isPropagationStopped())
            break e;
          Ju(i, s, u), o = a;
        }
    }
  }
  if (go)
    throw e = Es, go = !1, Es = null, e;
}
function X(e, t) {
  var n = t[js];
  n === void 0 && (n = t[js] = /* @__PURE__ */ new Set());
  var r = e + "__bubble";
  n.has(r) || (Ef(t, e, 2, !1), n.add(r));
}
function Vl(e, t, n) {
  var r = 0;
  t && (r |= 4), Ef(n, e, r, t);
}
var zi = "_reactListening" + Math.random().toString(36).slice(2);
function oi(e) {
  if (!e[zi]) {
    e[zi] = !0, Md.forEach(function(n) {
      n !== "selectionchange" && (Fv.has(n) || Vl(n, !1, e), Vl(n, !0, e));
    });
    var t = e.nodeType === 9 ? e : e.ownerDocument;
    t === null || t[zi] || (t[zi] = !0, Vl("selectionchange", !1, t));
  }
}
function Ef(e, t, n, r) {
  switch (af(t)) {
    case 1:
      var i = nv;
      break;
    case 4:
      i = rv;
      break;
    default:
      i = Ta;
  }
  n = i.bind(null, t, n, e), i = void 0, !Cs || t !== "touchstart" && t !== "touchmove" && t !== "wheel" || (i = !0), r ? i !== void 0 ? e.addEventListener(t, n, { capture: !0, passive: i }) : e.addEventListener(t, n, !0) : i !== void 0 ? e.addEventListener(t, n, { passive: i }) : e.addEventListener(t, n, !1);
}
function Ul(e, t, n, r, i) {
  var o = r;
  if (!(t & 1) && !(t & 2) && r !== null)
    e:
      for (; ; ) {
        if (r === null)
          return;
        var l = r.tag;
        if (l === 3 || l === 4) {
          var s = r.stateNode.containerInfo;
          if (s === i || s.nodeType === 8 && s.parentNode === i)
            break;
          if (l === 4)
            for (l = r.return; l !== null; ) {
              var a = l.tag;
              if ((a === 3 || a === 4) && (a = l.stateNode.containerInfo, a === i || a.nodeType === 8 && a.parentNode === i))
                return;
              l = l.return;
            }
          for (; s !== null; ) {
            if (l = dn(s), l === null)
              return;
            if (a = l.tag, a === 5 || a === 6) {
              r = o = l;
              continue e;
            }
            s = s.parentNode;
          }
        }
        r = r.return;
      }
  qd(function() {
    var u = o, p = xa(n), h = [];
    e: {
      var m = Sf.get(e);
      if (m !== void 0) {
        var w = Pa, g = e;
        switch (e) {
          case "keypress":
            if (Gi(n) === 0)
              break e;
          case "keydown":
          case "keyup":
            w = gv;
            break;
          case "focusin":
            g = "focus", w = zl;
            break;
          case "focusout":
            g = "blur", w = zl;
            break;
          case "beforeblur":
          case "afterblur":
            w = zl;
            break;
          case "click":
            if (n.button === 2)
              break e;
          case "auxclick":
          case "dblclick":
          case "mousedown":
          case "mousemove":
          case "mouseup":
          case "mouseout":
          case "mouseover":
          case "contextmenu":
            w = Vu;
            break;
          case "drag":
          case "dragend":
          case "dragenter":
          case "dragexit":
          case "dragleave":
          case "dragover":
          case "dragstart":
          case "drop":
            w = lv;
            break;
          case "touchcancel":
          case "touchend":
          case "touchmove":
          case "touchstart":
            w = kv;
            break;
          case wf:
          case _f:
          case kf:
            w = uv;
            break;
          case xf:
            w = Sv;
            break;
          case "scroll":
            w = iv;
            break;
          case "wheel":
            w = Ev;
            break;
          case "copy":
          case "cut":
          case "paste":
            w = dv;
            break;
          case "gotpointercapture":
          case "lostpointercapture":
          case "pointercancel":
          case "pointerdown":
          case "pointermove":
          case "pointerout":
          case "pointerover":
          case "pointerup":
            w = Fu;
        }
        var v = (t & 4) !== 0, I = !v && e === "scroll", d = v ? m !== null ? m + "Capture" : null : m;
        v = [];
        for (var c = u, f; c !== null; ) {
          f = c;
          var y = f.stateNode;
          if (f.tag === 5 && y !== null && (f = y, d !== null && (y = br(c, d), y != null && v.push(li(c, y, f)))), I)
            break;
          c = c.return;
        }
        0 < v.length && (m = new w(m, g, null, n, p), h.push({ event: m, listeners: v }));
      }
    }
    if (!(t & 7)) {
      e: {
        if (m = e === "mouseover" || e === "pointerover", w = e === "mouseout" || e === "pointerout", m && n !== xs && (g = n.relatedTarget || n.fromElement) && (dn(g) || g[Ot]))
          break e;
        if ((w || m) && (m = p.window === p ? p : (m = p.ownerDocument) ? m.defaultView || m.parentWindow : window, w ? (g = n.relatedTarget || n.toElement, w = u, g = g ? dn(g) : null, g !== null && (I = Nn(g), g !== I || g.tag !== 5 && g.tag !== 6) && (g = null)) : (w = null, g = u), w !== g)) {
          if (v = Vu, y = "onMouseLeave", d = "onMouseEnter", c = "mouse", (e === "pointerout" || e === "pointerover") && (v = Fu, y = "onPointerLeave", d = "onPointerEnter", c = "pointer"), I = w == null ? m : jn(w), f = g == null ? m : jn(g), m = new v(y, c + "leave", w, n, p), m.target = I, m.relatedTarget = f, y = null, dn(p) === u && (v = new v(d, c + "enter", g, n, p), v.target = f, v.relatedTarget = I, y = v), I = y, w && g)
            t: {
              for (v = w, d = g, c = 0, f = v; f; f = Pn(f))
                c++;
              for (f = 0, y = d; y; y = Pn(y))
                f++;
              for (; 0 < c - f; )
                v = Pn(v), c--;
              for (; 0 < f - c; )
                d = Pn(d), f--;
              for (; c--; ) {
                if (v === d || d !== null && v === d.alternate)
                  break t;
                v = Pn(v), d = Pn(d);
              }
              v = null;
            }
          else
            v = null;
          w !== null && bu(h, m, w, v, !1), g !== null && I !== null && bu(h, I, g, v, !0);
        }
      }
      e: {
        if (m = u ? jn(u) : window, w = m.nodeName && m.nodeName.toLowerCase(), w === "select" || w === "input" && m.type === "file")
          var S = Iv;
        else if (Hu(m))
          if (hf)
            S = Av;
          else {
            S = zv;
            var C = Lv;
          }
        else
          (w = m.nodeName) && w.toLowerCase() === "input" && (m.type === "checkbox" || m.type === "radio") && (S = jv);
        if (S && (S = S(e, u))) {
          pf(h, S, n, p);
          break e;
        }
        C && C(e, m, u), e === "focusout" && (C = m._wrapperState) && C.controlled && m.type === "number" && ys(m, "number", m.value);
      }
      switch (C = u ? jn(u) : window, e) {
        case "focusin":
          (Hu(C) || C.contentEditable === "true") && (Ln = C, Os = u, Or = null);
          break;
        case "focusout":
          Or = Os = Ln = null;
          break;
        case "mousedown":
          Rs = !0;
          break;
        case "contextmenu":
        case "mouseup":
        case "dragend":
          Rs = !1, Gu(h, n, p);
          break;
        case "selectionchange":
          if (Zv)
            break;
        case "keydown":
        case "keyup":
          Gu(h, n, p);
      }
      var x;
      if (Ra)
        e: {
          switch (e) {
            case "compositionstart":
              var O = "onCompositionStart";
              break e;
            case "compositionend":
              O = "onCompositionEnd";
              break e;
            case "compositionupdate":
              O = "onCompositionUpdate";
              break e;
          }
          O = void 0;
        }
      else
        In ? df(e, n) && (O = "onCompositionEnd") : e === "keydown" && n.keyCode === 229 && (O = "onCompositionStart");
      O && (cf && n.locale !== "ko" && (In || O !== "onCompositionStart" ? O === "onCompositionEnd" && In && (x = uf()) : (Vt = p, Na = "value" in Vt ? Vt.value : Vt.textContent, In = !0)), C = So(u, O), 0 < C.length && (O = new Uu(O, e, null, n, p), h.push({ event: O, listeners: C }), x ? O.data = x : (x = ff(n), x !== null && (O.data = x)))), (x = Nv ? Pv(e, n) : Ov(e, n)) && (u = So(u, "onBeforeInput"), 0 < u.length && (p = new Uu("onBeforeInput", "beforeinput", null, n, p), h.push({ event: p, listeners: u }), p.data = x));
    }
    Cf(h, t);
  });
}
function li(e, t, n) {
  return { instance: e, listener: t, currentTarget: n };
}
function So(e, t) {
  for (var n = t + "Capture", r = []; e !== null; ) {
    var i = e, o = i.stateNode;
    i.tag === 5 && o !== null && (i = o, o = br(e, n), o != null && r.unshift(li(e, o, i)), o = br(e, t), o != null && r.push(li(e, o, i))), e = e.return;
  }
  return r;
}
function Pn(e) {
  if (e === null)
    return null;
  do
    e = e.return;
  while (e && e.tag !== 5);
  return e || null;
}
function bu(e, t, n, r, i) {
  for (var o = t._reactName, l = []; n !== null && n !== r; ) {
    var s = n, a = s.alternate, u = s.stateNode;
    if (a !== null && a === r)
      break;
    s.tag === 5 && u !== null && (s = u, i ? (a = br(n, o), a != null && l.unshift(li(n, a, s))) : i || (a = br(n, o), a != null && l.push(li(n, a, s)))), n = n.return;
  }
  l.length !== 0 && e.push({ event: t, listeners: l });
}
var Bv = /\r\n?/g, Wv = /\u0000|\uFFFD/g;
function ec(e) {
  return (typeof e == "string" ? e : "" + e).replace(Bv, `
`).replace(Wv, "");
}
function ji(e, t, n) {
  if (t = ec(t), ec(e) !== t && n)
    throw Error(_(425));
}
function Co() {
}
var Ms = null, Is = null;
function Ls(e, t) {
  return e === "textarea" || e === "noscript" || typeof t.children == "string" || typeof t.children == "number" || typeof t.dangerouslySetInnerHTML == "object" && t.dangerouslySetInnerHTML !== null && t.dangerouslySetInnerHTML.__html != null;
}
var zs = typeof setTimeout == "function" ? setTimeout : void 0, Hv = typeof clearTimeout == "function" ? clearTimeout : void 0, tc = typeof Promise == "function" ? Promise : void 0, Qv = typeof queueMicrotask == "function" ? queueMicrotask : typeof tc < "u" ? function(e) {
  return tc.resolve(null).then(e).catch(qv);
} : zs;
function qv(e) {
  setTimeout(function() {
    throw e;
  });
}
function Fl(e, t) {
  var n = t, r = 0;
  do {
    var i = n.nextSibling;
    if (e.removeChild(n), i && i.nodeType === 8)
      if (n = i.data, n === "/$") {
        if (r === 0) {
          e.removeChild(i), ni(t);
          return;
        }
        r--;
      } else
        n !== "$" && n !== "$?" && n !== "$!" || r++;
    n = i;
  } while (n);
  ni(t);
}
function Ht(e) {
  for (; e != null; e = e.nextSibling) {
    var t = e.nodeType;
    if (t === 1 || t === 3)
      break;
    if (t === 8) {
      if (t = e.data, t === "$" || t === "$!" || t === "$?")
        break;
      if (t === "/$")
        return null;
    }
  }
  return e;
}
function nc(e) {
  e = e.previousSibling;
  for (var t = 0; e; ) {
    if (e.nodeType === 8) {
      var n = e.data;
      if (n === "$" || n === "$!" || n === "$?") {
        if (t === 0)
          return e;
        t--;
      } else
        n === "/$" && t++;
    }
    e = e.previousSibling;
  }
  return null;
}
var ur = Math.random().toString(36).slice(2), mt = "__reactFiber$" + ur, si = "__reactProps$" + ur, Ot = "__reactContainer$" + ur, js = "__reactEvents$" + ur, Kv = "__reactListeners$" + ur, Yv = "__reactHandles$" + ur;
function dn(e) {
  var t = e[mt];
  if (t)
    return t;
  for (var n = e.parentNode; n; ) {
    if (t = n[Ot] || n[mt]) {
      if (n = t.alternate, t.child !== null || n !== null && n.child !== null)
        for (e = nc(e); e !== null; ) {
          if (n = e[mt])
            return n;
          e = nc(e);
        }
      return t;
    }
    e = n, n = e.parentNode;
  }
  return null;
}
function _i(e) {
  return e = e[mt] || e[Ot], !e || e.tag !== 5 && e.tag !== 6 && e.tag !== 13 && e.tag !== 3 ? null : e;
}
function jn(e) {
  if (e.tag === 5 || e.tag === 6)
    return e.stateNode;
  throw Error(_(33));
}
function sl(e) {
  return e[si] || null;
}
var As = [], An = -1;
function nn(e) {
  return { current: e };
}
function J(e) {
  0 > An || (e.current = As[An], As[An] = null, An--);
}
function G(e, t) {
  An++, As[An] = e.current, e.current = t;
}
var en = {}, Ne = nn(en), je = nn(!1), kn = en;
function er(e, t) {
  var n = e.type.contextTypes;
  if (!n)
    return en;
  var r = e.stateNode;
  if (r && r.__reactInternalMemoizedUnmaskedChildContext === t)
    return r.__reactInternalMemoizedMaskedChildContext;
  var i = {}, o;
  for (o in n)
    i[o] = t[o];
  return r && (e = e.stateNode, e.__reactInternalMemoizedUnmaskedChildContext = t, e.__reactInternalMemoizedMaskedChildContext = i), i;
}
function Ae(e) {
  return e = e.childContextTypes, e != null;
}
function Eo() {
  J(je), J(Ne);
}
function rc(e, t, n) {
  if (Ne.current !== en)
    throw Error(_(168));
  G(Ne, t), G(je, n);
}
function Tf(e, t, n) {
  var r = e.stateNode;
  if (t = t.childContextTypes, typeof r.getChildContext != "function")
    return n;
  r = r.getChildContext();
  for (var i in r)
    if (!(i in t))
      throw Error(_(108, L1(e) || "Unknown", i));
  return re({}, n, r);
}
function To(e) {
  return e = (e = e.stateNode) && e.__reactInternalMemoizedMergedChildContext || en, kn = Ne.current, G(Ne, e), G(je, je.current), !0;
}
function ic(e, t, n) {
  var r = e.stateNode;
  if (!r)
    throw Error(_(169));
  n ? (e = Tf(e, t, kn), r.__reactInternalMemoizedMergedChildContext = e, J(je), J(Ne), G(Ne, e)) : J(je), G(je, n);
}
var xt = null, al = !1, Bl = !1;
function Nf(e) {
  xt === null ? xt = [e] : xt.push(e);
}
function Gv(e) {
  al = !0, Nf(e);
}
function rn() {
  if (!Bl && xt !== null) {
    Bl = !0;
    var e = 0, t = Q;
    try {
      var n = xt;
      for (Q = 1; e < n.length; e++) {
        var r = n[e];
        do
          r = r(!0);
        while (r !== null);
      }
      xt = null, al = !1;
    } catch (i) {
      throw xt !== null && (xt = xt.slice(e + 1)), Xd(Sa, rn), i;
    } finally {
      Q = t, Bl = !1;
    }
  }
  return null;
}
var $n = [], Dn = 0, No = null, Po = 0, qe = [], Ke = 0, xn = null, St = 1, Ct = "";
function sn(e, t) {
  $n[Dn++] = Po, $n[Dn++] = No, No = e, Po = t;
}
function Pf(e, t, n) {
  qe[Ke++] = St, qe[Ke++] = Ct, qe[Ke++] = xn, xn = e;
  var r = St;
  e = Ct;
  var i = 32 - st(r) - 1;
  r &= ~(1 << i), n += 1;
  var o = 32 - st(t) + i;
  if (30 < o) {
    var l = i - i % 5;
    o = (r & (1 << l) - 1).toString(32), r >>= l, i -= l, St = 1 << 32 - st(t) + i | n << i | r, Ct = o + e;
  } else
    St = 1 << o | n << i | r, Ct = e;
}
function Ia(e) {
  e.return !== null && (sn(e, 1), Pf(e, 1, 0));
}
function La(e) {
  for (; e === No; )
    No = $n[--Dn], $n[Dn] = null, Po = $n[--Dn], $n[Dn] = null;
  for (; e === xn; )
    xn = qe[--Ke], qe[Ke] = null, Ct = qe[--Ke], qe[Ke] = null, St = qe[--Ke], qe[Ke] = null;
}
var Fe = null, Ve = null, b = !1, rt = null;
function Of(e, t) {
  var n = Ye(5, null, null, 0);
  n.elementType = "DELETED", n.stateNode = t, n.return = e, t = e.deletions, t === null ? (e.deletions = [n], e.flags |= 16) : t.push(n);
}
function oc(e, t) {
  switch (e.tag) {
    case 5:
      var n = e.type;
      return t = t.nodeType !== 1 || n.toLowerCase() !== t.nodeName.toLowerCase() ? null : t, t !== null ? (e.stateNode = t, Fe = e, Ve = Ht(t.firstChild), !0) : !1;
    case 6:
      return t = e.pendingProps === "" || t.nodeType !== 3 ? null : t, t !== null ? (e.stateNode = t, Fe = e, Ve = null, !0) : !1;
    case 13:
      return t = t.nodeType !== 8 ? null : t, t !== null ? (n = xn !== null ? { id: St, overflow: Ct } : null, e.memoizedState = { dehydrated: t, treeContext: n, retryLane: 1073741824 }, n = Ye(18, null, null, 0), n.stateNode = t, n.return = e, e.child = n, Fe = e, Ve = null, !0) : !1;
    default:
      return !1;
  }
}
function $s(e) {
  return (e.mode & 1) !== 0 && (e.flags & 128) === 0;
}
function Ds(e) {
  if (b) {
    var t = Ve;
    if (t) {
      var n = t;
      if (!oc(e, t)) {
        if ($s(e))
          throw Error(_(418));
        t = Ht(n.nextSibling);
        var r = Fe;
        t && oc(e, t) ? Of(r, n) : (e.flags = e.flags & -4097 | 2, b = !1, Fe = e);
      }
    } else {
      if ($s(e))
        throw Error(_(418));
      e.flags = e.flags & -4097 | 2, b = !1, Fe = e;
    }
  }
}
function lc(e) {
  for (e = e.return; e !== null && e.tag !== 5 && e.tag !== 3 && e.tag !== 13; )
    e = e.return;
  Fe = e;
}
function Ai(e) {
  if (e !== Fe)
    return !1;
  if (!b)
    return lc(e), b = !0, !1;
  var t;
  if ((t = e.tag !== 3) && !(t = e.tag !== 5) && (t = e.type, t = t !== "head" && t !== "body" && !Ls(e.type, e.memoizedProps)), t && (t = Ve)) {
    if ($s(e))
      throw Rf(), Error(_(418));
    for (; t; )
      Of(e, t), t = Ht(t.nextSibling);
  }
  if (lc(e), e.tag === 13) {
    if (e = e.memoizedState, e = e !== null ? e.dehydrated : null, !e)
      throw Error(_(317));
    e: {
      for (e = e.nextSibling, t = 0; e; ) {
        if (e.nodeType === 8) {
          var n = e.data;
          if (n === "/$") {
            if (t === 0) {
              Ve = Ht(e.nextSibling);
              break e;
            }
            t--;
          } else
            n !== "$" && n !== "$!" && n !== "$?" || t++;
        }
        e = e.nextSibling;
      }
      Ve = null;
    }
  } else
    Ve = Fe ? Ht(e.stateNode.nextSibling) : null;
  return !0;
}
function Rf() {
  for (var e = Ve; e; )
    e = Ht(e.nextSibling);
}
function tr() {
  Ve = Fe = null, b = !1;
}
function za(e) {
  rt === null ? rt = [e] : rt.push(e);
}
var Xv = Lt.ReactCurrentBatchConfig;
function tt(e, t) {
  if (e && e.defaultProps) {
    t = re({}, t), e = e.defaultProps;
    for (var n in e)
      t[n] === void 0 && (t[n] = e[n]);
    return t;
  }
  return t;
}
var Oo = nn(null), Ro = null, Zn = null, ja = null;
function Aa() {
  ja = Zn = Ro = null;
}
function $a(e) {
  var t = Oo.current;
  J(Oo), e._currentValue = t;
}
function Zs(e, t, n) {
  for (; e !== null; ) {
    var r = e.alternate;
    if ((e.childLanes & t) !== t ? (e.childLanes |= t, r !== null && (r.childLanes |= t)) : r !== null && (r.childLanes & t) !== t && (r.childLanes |= t), e === n)
      break;
    e = e.return;
  }
}
function Kn(e, t) {
  Ro = e, ja = Zn = null, e = e.dependencies, e !== null && e.firstContext !== null && (e.lanes & t && (ze = !0), e.firstContext = null);
}
function Xe(e) {
  var t = e._currentValue;
  if (ja !== e)
    if (e = { context: e, memoizedValue: t, next: null }, Zn === null) {
      if (Ro === null)
        throw Error(_(308));
      Zn = e, Ro.dependencies = { lanes: 0, firstContext: e };
    } else
      Zn = Zn.next = e;
  return t;
}
var fn = null;
function Da(e) {
  fn === null ? fn = [e] : fn.push(e);
}
function Mf(e, t, n, r) {
  var i = t.interleaved;
  return i === null ? (n.next = n, Da(t)) : (n.next = i.next, i.next = n), t.interleaved = n, Rt(e, r);
}
function Rt(e, t) {
  e.lanes |= t;
  var n = e.alternate;
  for (n !== null && (n.lanes |= t), n = e, e = e.return; e !== null; )
    e.childLanes |= t, n = e.alternate, n !== null && (n.childLanes |= t), n = e, e = e.return;
  return n.tag === 3 ? n.stateNode : null;
}
var At = !1;
function Za(e) {
  e.updateQueue = { baseState: e.memoizedState, firstBaseUpdate: null, lastBaseUpdate: null, shared: { pending: null, interleaved: null, lanes: 0 }, effects: null };
}
function If(e, t) {
  e = e.updateQueue, t.updateQueue === e && (t.updateQueue = { baseState: e.baseState, firstBaseUpdate: e.firstBaseUpdate, lastBaseUpdate: e.lastBaseUpdate, shared: e.shared, effects: e.effects });
}
function Tt(e, t) {
  return { eventTime: e, lane: t, tag: 0, payload: null, callback: null, next: null };
}
function Qt(e, t, n) {
  var r = e.updateQueue;
  if (r === null)
    return null;
  if (r = r.shared, U & 2) {
    var i = r.pending;
    return i === null ? t.next = t : (t.next = i.next, i.next = t), r.pending = t, Rt(e, n);
  }
  return i = r.interleaved, i === null ? (t.next = t, Da(r)) : (t.next = i.next, i.next = t), r.interleaved = t, Rt(e, n);
}
function Xi(e, t, n) {
  if (t = t.updateQueue, t !== null && (t = t.shared, (n & 4194240) !== 0)) {
    var r = t.lanes;
    r &= e.pendingLanes, n |= r, t.lanes = n, Ca(e, n);
  }
}
function sc(e, t) {
  var n = e.updateQueue, r = e.alternate;
  if (r !== null && (r = r.updateQueue, n === r)) {
    var i = null, o = null;
    if (n = n.firstBaseUpdate, n !== null) {
      do {
        var l = { eventTime: n.eventTime, lane: n.lane, tag: n.tag, payload: n.payload, callback: n.callback, next: null };
        o === null ? i = o = l : o = o.next = l, n = n.next;
      } while (n !== null);
      o === null ? i = o = t : o = o.next = t;
    } else
      i = o = t;
    n = { baseState: r.baseState, firstBaseUpdate: i, lastBaseUpdate: o, shared: r.shared, effects: r.effects }, e.updateQueue = n;
    return;
  }
  e = n.lastBaseUpdate, e === null ? n.firstBaseUpdate = t : e.next = t, n.lastBaseUpdate = t;
}
function Mo(e, t, n, r) {
  var i = e.updateQueue;
  At = !1;
  var o = i.firstBaseUpdate, l = i.lastBaseUpdate, s = i.shared.pending;
  if (s !== null) {
    i.shared.pending = null;
    var a = s, u = a.next;
    a.next = null, l === null ? o = u : l.next = u, l = a;
    var p = e.alternate;
    p !== null && (p = p.updateQueue, s = p.lastBaseUpdate, s !== l && (s === null ? p.firstBaseUpdate = u : s.next = u, p.lastBaseUpdate = a));
  }
  if (o !== null) {
    var h = i.baseState;
    l = 0, p = u = a = null, s = o;
    do {
      var m = s.lane, w = s.eventTime;
      if ((r & m) === m) {
        p !== null && (p = p.next = {
          eventTime: w,
          lane: 0,
          tag: s.tag,
          payload: s.payload,
          callback: s.callback,
          next: null
        });
        e: {
          var g = e, v = s;
          switch (m = t, w = n, v.tag) {
            case 1:
              if (g = v.payload, typeof g == "function") {
                h = g.call(w, h, m);
                break e;
              }
              h = g;
              break e;
            case 3:
              g.flags = g.flags & -65537 | 128;
            case 0:
              if (g = v.payload, m = typeof g == "function" ? g.call(w, h, m) : g, m == null)
                break e;
              h = re({}, h, m);
              break e;
            case 2:
              At = !0;
          }
        }
        s.callback !== null && s.lane !== 0 && (e.flags |= 64, m = i.effects, m === null ? i.effects = [s] : m.push(s));
      } else
        w = { eventTime: w, lane: m, tag: s.tag, payload: s.payload, callback: s.callback, next: null }, p === null ? (u = p = w, a = h) : p = p.next = w, l |= m;
      if (s = s.next, s === null) {
        if (s = i.shared.pending, s === null)
          break;
        m = s, s = m.next, m.next = null, i.lastBaseUpdate = m, i.shared.pending = null;
      }
    } while (1);
    if (p === null && (a = h), i.baseState = a, i.firstBaseUpdate = u, i.lastBaseUpdate = p, t = i.shared.interleaved, t !== null) {
      i = t;
      do
        l |= i.lane, i = i.next;
      while (i !== t);
    } else
      o === null && (i.shared.lanes = 0);
    Cn |= l, e.lanes = l, e.memoizedState = h;
  }
}
function ac(e, t, n) {
  if (e = t.effects, t.effects = null, e !== null)
    for (t = 0; t < e.length; t++) {
      var r = e[t], i = r.callback;
      if (i !== null) {
        if (r.callback = null, r = n, typeof i != "function")
          throw Error(_(191, i));
        i.call(r);
      }
    }
}
var Lf = new Rd.Component().refs;
function Vs(e, t, n, r) {
  t = e.memoizedState, n = n(r, t), n = n == null ? t : re({}, t, n), e.memoizedState = n, e.lanes === 0 && (e.updateQueue.baseState = n);
}
var ul = { isMounted: function(e) {
  return (e = e._reactInternals) ? Nn(e) === e : !1;
}, enqueueSetState: function(e, t, n) {
  e = e._reactInternals;
  var r = Oe(), i = Kt(e), o = Tt(r, i);
  o.payload = t, n != null && (o.callback = n), t = Qt(e, o, i), t !== null && (at(t, e, i, r), Xi(t, e, i));
}, enqueueReplaceState: function(e, t, n) {
  e = e._reactInternals;
  var r = Oe(), i = Kt(e), o = Tt(r, i);
  o.tag = 1, o.payload = t, n != null && (o.callback = n), t = Qt(e, o, i), t !== null && (at(t, e, i, r), Xi(t, e, i));
}, enqueueForceUpdate: function(e, t) {
  e = e._reactInternals;
  var n = Oe(), r = Kt(e), i = Tt(n, r);
  i.tag = 2, t != null && (i.callback = t), t = Qt(e, i, r), t !== null && (at(t, e, r, n), Xi(t, e, r));
} };
function uc(e, t, n, r, i, o, l) {
  return e = e.stateNode, typeof e.shouldComponentUpdate == "function" ? e.shouldComponentUpdate(r, o, l) : t.prototype && t.prototype.isPureReactComponent ? !ii(n, r) || !ii(i, o) : !0;
}
function zf(e, t, n) {
  var r = !1, i = en, o = t.contextType;
  return typeof o == "object" && o !== null ? o = Xe(o) : (i = Ae(t) ? kn : Ne.current, r = t.contextTypes, o = (r = r != null) ? er(e, i) : en), t = new t(n, o), e.memoizedState = t.state !== null && t.state !== void 0 ? t.state : null, t.updater = ul, e.stateNode = t, t._reactInternals = e, r && (e = e.stateNode, e.__reactInternalMemoizedUnmaskedChildContext = i, e.__reactInternalMemoizedMaskedChildContext = o), t;
}
function cc(e, t, n, r) {
  e = t.state, typeof t.componentWillReceiveProps == "function" && t.componentWillReceiveProps(n, r), typeof t.UNSAFE_componentWillReceiveProps == "function" && t.UNSAFE_componentWillReceiveProps(n, r), t.state !== e && ul.enqueueReplaceState(t, t.state, null);
}
function Us(e, t, n, r) {
  var i = e.stateNode;
  i.props = n, i.state = e.memoizedState, i.refs = Lf, Za(e);
  var o = t.contextType;
  typeof o == "object" && o !== null ? i.context = Xe(o) : (o = Ae(t) ? kn : Ne.current, i.context = er(e, o)), i.state = e.memoizedState, o = t.getDerivedStateFromProps, typeof o == "function" && (Vs(e, t, o, n), i.state = e.memoizedState), typeof t.getDerivedStateFromProps == "function" || typeof i.getSnapshotBeforeUpdate == "function" || typeof i.UNSAFE_componentWillMount != "function" && typeof i.componentWillMount != "function" || (t = i.state, typeof i.componentWillMount == "function" && i.componentWillMount(), typeof i.UNSAFE_componentWillMount == "function" && i.UNSAFE_componentWillMount(), t !== i.state && ul.enqueueReplaceState(i, i.state, null), Mo(e, n, i, r), i.state = e.memoizedState), typeof i.componentDidMount == "function" && (e.flags |= 4194308);
}
function gr(e, t, n) {
  if (e = n.ref, e !== null && typeof e != "function" && typeof e != "object") {
    if (n._owner) {
      if (n = n._owner, n) {
        if (n.tag !== 1)
          throw Error(_(309));
        var r = n.stateNode;
      }
      if (!r)
        throw Error(_(147, e));
      var i = r, o = "" + e;
      return t !== null && t.ref !== null && typeof t.ref == "function" && t.ref._stringRef === o ? t.ref : (t = function(l) {
        var s = i.refs;
        s === Lf && (s = i.refs = {}), l === null ? delete s[o] : s[o] = l;
      }, t._stringRef = o, t);
    }
    if (typeof e != "string")
      throw Error(_(284));
    if (!n._owner)
      throw Error(_(290, e));
  }
  return e;
}
function $i(e, t) {
  throw e = Object.prototype.toString.call(t), Error(_(31, e === "[object Object]" ? "object with keys {" + Object.keys(t).join(", ") + "}" : e));
}
function dc(e) {
  var t = e._init;
  return t(e._payload);
}
function jf(e) {
  function t(d, c) {
    if (e) {
      var f = d.deletions;
      f === null ? (d.deletions = [c], d.flags |= 16) : f.push(c);
    }
  }
  function n(d, c) {
    if (!e)
      return null;
    for (; c !== null; )
      t(d, c), c = c.sibling;
    return null;
  }
  function r(d, c) {
    for (d = /* @__PURE__ */ new Map(); c !== null; )
      c.key !== null ? d.set(c.key, c) : d.set(c.index, c), c = c.sibling;
    return d;
  }
  function i(d, c) {
    return d = Yt(d, c), d.index = 0, d.sibling = null, d;
  }
  function o(d, c, f) {
    return d.index = f, e ? (f = d.alternate, f !== null ? (f = f.index, f < c ? (d.flags |= 2, c) : f) : (d.flags |= 2, c)) : (d.flags |= 1048576, c);
  }
  function l(d) {
    return e && d.alternate === null && (d.flags |= 2), d;
  }
  function s(d, c, f, y) {
    return c === null || c.tag !== 6 ? (c = Gl(f, d.mode, y), c.return = d, c) : (c = i(c, f), c.return = d, c);
  }
  function a(d, c, f, y) {
    var S = f.type;
    return S === Mn ? p(d, c, f.props.children, y, f.key) : c !== null && (c.elementType === S || typeof S == "object" && S !== null && S.$$typeof === jt && dc(S) === c.type) ? (y = i(c, f.props), y.ref = gr(d, c, f), y.return = d, y) : (y = ro(f.type, f.key, f.props, null, d.mode, y), y.ref = gr(d, c, f), y.return = d, y);
  }
  function u(d, c, f, y) {
    return c === null || c.tag !== 4 || c.stateNode.containerInfo !== f.containerInfo || c.stateNode.implementation !== f.implementation ? (c = Xl(f, d.mode, y), c.return = d, c) : (c = i(c, f.children || []), c.return = d, c);
  }
  function p(d, c, f, y, S) {
    return c === null || c.tag !== 7 ? (c = yn(f, d.mode, y, S), c.return = d, c) : (c = i(c, f), c.return = d, c);
  }
  function h(d, c, f) {
    if (typeof c == "string" && c !== "" || typeof c == "number")
      return c = Gl("" + c, d.mode, f), c.return = d, c;
    if (typeof c == "object" && c !== null) {
      switch (c.$$typeof) {
        case Ti:
          return f = ro(c.type, c.key, c.props, null, d.mode, f), f.ref = gr(d, null, c), f.return = d, f;
        case Rn:
          return c = Xl(c, d.mode, f), c.return = d, c;
        case jt:
          var y = c._init;
          return h(d, y(c._payload), f);
      }
      if (xr(c) || pr(c))
        return c = yn(c, d.mode, f, null), c.return = d, c;
      $i(d, c);
    }
    return null;
  }
  function m(d, c, f, y) {
    var S = c !== null ? c.key : null;
    if (typeof f == "string" && f !== "" || typeof f == "number")
      return S !== null ? null : s(d, c, "" + f, y);
    if (typeof f == "object" && f !== null) {
      switch (f.$$typeof) {
        case Ti:
          return f.key === S ? a(d, c, f, y) : null;
        case Rn:
          return f.key === S ? u(d, c, f, y) : null;
        case jt:
          return S = f._init, m(
            d,
            c,
            S(f._payload),
            y
          );
      }
      if (xr(f) || pr(f))
        return S !== null ? null : p(d, c, f, y, null);
      $i(d, f);
    }
    return null;
  }
  function w(d, c, f, y, S) {
    if (typeof y == "string" && y !== "" || typeof y == "number")
      return d = d.get(f) || null, s(c, d, "" + y, S);
    if (typeof y == "object" && y !== null) {
      switch (y.$$typeof) {
        case Ti:
          return d = d.get(y.key === null ? f : y.key) || null, a(c, d, y, S);
        case Rn:
          return d = d.get(y.key === null ? f : y.key) || null, u(c, d, y, S);
        case jt:
          var C = y._init;
          return w(d, c, f, C(y._payload), S);
      }
      if (xr(y) || pr(y))
        return d = d.get(f) || null, p(c, d, y, S, null);
      $i(c, y);
    }
    return null;
  }
  function g(d, c, f, y) {
    for (var S = null, C = null, x = c, O = c = 0, Y = null; x !== null && O < f.length; O++) {
      x.index > O ? (Y = x, x = null) : Y = x.sibling;
      var $ = m(d, x, f[O], y);
      if ($ === null) {
        x === null && (x = Y);
        break;
      }
      e && x && $.alternate === null && t(d, x), c = o($, c, O), C === null ? S = $ : C.sibling = $, C = $, x = Y;
    }
    if (O === f.length)
      return n(d, x), b && sn(d, O), S;
    if (x === null) {
      for (; O < f.length; O++)
        x = h(d, f[O], y), x !== null && (c = o(x, c, O), C === null ? S = x : C.sibling = x, C = x);
      return b && sn(d, O), S;
    }
    for (x = r(d, x); O < f.length; O++)
      Y = w(x, d, O, f[O], y), Y !== null && (e && Y.alternate !== null && x.delete(Y.key === null ? O : Y.key), c = o(Y, c, O), C === null ? S = Y : C.sibling = Y, C = Y);
    return e && x.forEach(function(be) {
      return t(d, be);
    }), b && sn(d, O), S;
  }
  function v(d, c, f, y) {
    var S = pr(f);
    if (typeof S != "function")
      throw Error(_(150));
    if (f = S.call(f), f == null)
      throw Error(_(151));
    for (var C = S = null, x = c, O = c = 0, Y = null, $ = f.next(); x !== null && !$.done; O++, $ = f.next()) {
      x.index > O ? (Y = x, x = null) : Y = x.sibling;
      var be = m(d, x, $.value, y);
      if (be === null) {
        x === null && (x = Y);
        break;
      }
      e && x && be.alternate === null && t(d, x), c = o(be, c, O), C === null ? S = be : C.sibling = be, C = be, x = Y;
    }
    if ($.done)
      return n(
        d,
        x
      ), b && sn(d, O), S;
    if (x === null) {
      for (; !$.done; O++, $ = f.next())
        $ = h(d, $.value, y), $ !== null && (c = o($, c, O), C === null ? S = $ : C.sibling = $, C = $);
      return b && sn(d, O), S;
    }
    for (x = r(d, x); !$.done; O++, $ = f.next())
      $ = w(x, d, O, $.value, y), $ !== null && (e && $.alternate !== null && x.delete($.key === null ? O : $.key), c = o($, c, O), C === null ? S = $ : C.sibling = $, C = $);
    return e && x.forEach(function(cr) {
      return t(d, cr);
    }), b && sn(d, O), S;
  }
  function I(d, c, f, y) {
    if (typeof f == "object" && f !== null && f.type === Mn && f.key === null && (f = f.props.children), typeof f == "object" && f !== null) {
      switch (f.$$typeof) {
        case Ti:
          e: {
            for (var S = f.key, C = c; C !== null; ) {
              if (C.key === S) {
                if (S = f.type, S === Mn) {
                  if (C.tag === 7) {
                    n(d, C.sibling), c = i(C, f.props.children), c.return = d, d = c;
                    break e;
                  }
                } else if (C.elementType === S || typeof S == "object" && S !== null && S.$$typeof === jt && dc(S) === C.type) {
                  n(d, C.sibling), c = i(C, f.props), c.ref = gr(d, C, f), c.return = d, d = c;
                  break e;
                }
                n(d, C);
                break;
              } else
                t(d, C);
              C = C.sibling;
            }
            f.type === Mn ? (c = yn(f.props.children, d.mode, y, f.key), c.return = d, d = c) : (y = ro(f.type, f.key, f.props, null, d.mode, y), y.ref = gr(d, c, f), y.return = d, d = y);
          }
          return l(d);
        case Rn:
          e: {
            for (C = f.key; c !== null; ) {
              if (c.key === C)
                if (c.tag === 4 && c.stateNode.containerInfo === f.containerInfo && c.stateNode.implementation === f.implementation) {
                  n(d, c.sibling), c = i(c, f.children || []), c.return = d, d = c;
                  break e;
                } else {
                  n(d, c);
                  break;
                }
              else
                t(d, c);
              c = c.sibling;
            }
            c = Xl(f, d.mode, y), c.return = d, d = c;
          }
          return l(d);
        case jt:
          return C = f._init, I(d, c, C(f._payload), y);
      }
      if (xr(f))
        return g(d, c, f, y);
      if (pr(f))
        return v(d, c, f, y);
      $i(d, f);
    }
    return typeof f == "string" && f !== "" || typeof f == "number" ? (f = "" + f, c !== null && c.tag === 6 ? (n(d, c.sibling), c = i(c, f), c.return = d, d = c) : (n(d, c), c = Gl(f, d.mode, y), c.return = d, d = c), l(d)) : n(d, c);
  }
  return I;
}
var nr = jf(!0), Af = jf(!1), ki = {}, gt = nn(ki), ai = nn(ki), ui = nn(ki);
function pn(e) {
  if (e === ki)
    throw Error(_(174));
  return e;
}
function Va(e, t) {
  switch (G(ui, t), G(ai, e), G(gt, ki), e = t.nodeType, e) {
    case 9:
    case 11:
      t = (t = t.documentElement) ? t.namespaceURI : ws(null, "");
      break;
    default:
      e = e === 8 ? t.parentNode : t, t = e.namespaceURI || null, e = e.tagName, t = ws(t, e);
  }
  J(gt), G(gt, t);
}
function rr() {
  J(gt), J(ai), J(ui);
}
function $f(e) {
  pn(ui.current);
  var t = pn(gt.current), n = ws(t, e.type);
  t !== n && (G(ai, e), G(gt, n));
}
function Ua(e) {
  ai.current === e && (J(gt), J(ai));
}
var te = nn(0);
function Io(e) {
  for (var t = e; t !== null; ) {
    if (t.tag === 13) {
      var n = t.memoizedState;
      if (n !== null && (n = n.dehydrated, n === null || n.data === "$?" || n.data === "$!"))
        return t;
    } else if (t.tag === 19 && t.memoizedProps.revealOrder !== void 0) {
      if (t.flags & 128)
        return t;
    } else if (t.child !== null) {
      t.child.return = t, t = t.child;
      continue;
    }
    if (t === e)
      break;
    for (; t.sibling === null; ) {
      if (t.return === null || t.return === e)
        return null;
      t = t.return;
    }
    t.sibling.return = t.return, t = t.sibling;
  }
  return null;
}
var Wl = [];
function Fa() {
  for (var e = 0; e < Wl.length; e++)
    Wl[e]._workInProgressVersionPrimary = null;
  Wl.length = 0;
}
var Ji = Lt.ReactCurrentDispatcher, Hl = Lt.ReactCurrentBatchConfig, Sn = 0, ne = null, ce = null, pe = null, Lo = !1, Rr = !1, ci = 0, Jv = 0;
function ke() {
  throw Error(_(321));
}
function Ba(e, t) {
  if (t === null)
    return !1;
  for (var n = 0; n < t.length && n < e.length; n++)
    if (!ct(e[n], t[n]))
      return !1;
  return !0;
}
function Wa(e, t, n, r, i, o) {
  if (Sn = o, ne = t, t.memoizedState = null, t.updateQueue = null, t.lanes = 0, Ji.current = e === null || e.memoizedState === null ? n0 : r0, e = n(r, i), Rr) {
    o = 0;
    do {
      if (Rr = !1, ci = 0, 25 <= o)
        throw Error(_(301));
      o += 1, pe = ce = null, t.updateQueue = null, Ji.current = i0, e = n(r, i);
    } while (Rr);
  }
  if (Ji.current = zo, t = ce !== null && ce.next !== null, Sn = 0, pe = ce = ne = null, Lo = !1, t)
    throw Error(_(300));
  return e;
}
function Ha() {
  var e = ci !== 0;
  return ci = 0, e;
}
function ft() {
  var e = { memoizedState: null, baseState: null, baseQueue: null, queue: null, next: null };
  return pe === null ? ne.memoizedState = pe = e : pe = pe.next = e, pe;
}
function Je() {
  if (ce === null) {
    var e = ne.alternate;
    e = e !== null ? e.memoizedState : null;
  } else
    e = ce.next;
  var t = pe === null ? ne.memoizedState : pe.next;
  if (t !== null)
    pe = t, ce = e;
  else {
    if (e === null)
      throw Error(_(310));
    ce = e, e = { memoizedState: ce.memoizedState, baseState: ce.baseState, baseQueue: ce.baseQueue, queue: ce.queue, next: null }, pe === null ? ne.memoizedState = pe = e : pe = pe.next = e;
  }
  return pe;
}
function di(e, t) {
  return typeof t == "function" ? t(e) : t;
}
function Ql(e) {
  var t = Je(), n = t.queue;
  if (n === null)
    throw Error(_(311));
  n.lastRenderedReducer = e;
  var r = ce, i = r.baseQueue, o = n.pending;
  if (o !== null) {
    if (i !== null) {
      var l = i.next;
      i.next = o.next, o.next = l;
    }
    r.baseQueue = i = o, n.pending = null;
  }
  if (i !== null) {
    o = i.next, r = r.baseState;
    var s = l = null, a = null, u = o;
    do {
      var p = u.lane;
      if ((Sn & p) === p)
        a !== null && (a = a.next = { lane: 0, action: u.action, hasEagerState: u.hasEagerState, eagerState: u.eagerState, next: null }), r = u.hasEagerState ? u.eagerState : e(r, u.action);
      else {
        var h = {
          lane: p,
          action: u.action,
          hasEagerState: u.hasEagerState,
          eagerState: u.eagerState,
          next: null
        };
        a === null ? (s = a = h, l = r) : a = a.next = h, ne.lanes |= p, Cn |= p;
      }
      u = u.next;
    } while (u !== null && u !== o);
    a === null ? l = r : a.next = s, ct(r, t.memoizedState) || (ze = !0), t.memoizedState = r, t.baseState = l, t.baseQueue = a, n.lastRenderedState = r;
  }
  if (e = n.interleaved, e !== null) {
    i = e;
    do
      o = i.lane, ne.lanes |= o, Cn |= o, i = i.next;
    while (i !== e);
  } else
    i === null && (n.lanes = 0);
  return [t.memoizedState, n.dispatch];
}
function ql(e) {
  var t = Je(), n = t.queue;
  if (n === null)
    throw Error(_(311));
  n.lastRenderedReducer = e;
  var r = n.dispatch, i = n.pending, o = t.memoizedState;
  if (i !== null) {
    n.pending = null;
    var l = i = i.next;
    do
      o = e(o, l.action), l = l.next;
    while (l !== i);
    ct(o, t.memoizedState) || (ze = !0), t.memoizedState = o, t.baseQueue === null && (t.baseState = o), n.lastRenderedState = o;
  }
  return [o, r];
}
function Df() {
}
function Zf(e, t) {
  var n = ne, r = Je(), i = t(), o = !ct(r.memoizedState, i);
  if (o && (r.memoizedState = i, ze = !0), r = r.queue, Qa(Ff.bind(null, n, r, e), [e]), r.getSnapshot !== t || o || pe !== null && pe.memoizedState.tag & 1) {
    if (n.flags |= 2048, fi(9, Uf.bind(null, n, r, i, t), void 0, null), he === null)
      throw Error(_(349));
    Sn & 30 || Vf(n, t, i);
  }
  return i;
}
function Vf(e, t, n) {
  e.flags |= 16384, e = { getSnapshot: t, value: n }, t = ne.updateQueue, t === null ? (t = { lastEffect: null, stores: null }, ne.updateQueue = t, t.stores = [e]) : (n = t.stores, n === null ? t.stores = [e] : n.push(e));
}
function Uf(e, t, n, r) {
  t.value = n, t.getSnapshot = r, Bf(t) && Wf(e);
}
function Ff(e, t, n) {
  return n(function() {
    Bf(t) && Wf(e);
  });
}
function Bf(e) {
  var t = e.getSnapshot;
  e = e.value;
  try {
    var n = t();
    return !ct(e, n);
  } catch {
    return !0;
  }
}
function Wf(e) {
  var t = Rt(e, 1);
  t !== null && at(t, e, 1, -1);
}
function fc(e) {
  var t = ft();
  return typeof e == "function" && (e = e()), t.memoizedState = t.baseState = e, e = { pending: null, interleaved: null, lanes: 0, dispatch: null, lastRenderedReducer: di, lastRenderedState: e }, t.queue = e, e = e.dispatch = t0.bind(null, ne, e), [t.memoizedState, e];
}
function fi(e, t, n, r) {
  return e = { tag: e, create: t, destroy: n, deps: r, next: null }, t = ne.updateQueue, t === null ? (t = { lastEffect: null, stores: null }, ne.updateQueue = t, t.lastEffect = e.next = e) : (n = t.lastEffect, n === null ? t.lastEffect = e.next = e : (r = n.next, n.next = e, e.next = r, t.lastEffect = e)), e;
}
function Hf() {
  return Je().memoizedState;
}
function bi(e, t, n, r) {
  var i = ft();
  ne.flags |= e, i.memoizedState = fi(1 | t, n, void 0, r === void 0 ? null : r);
}
function cl(e, t, n, r) {
  var i = Je();
  r = r === void 0 ? null : r;
  var o = void 0;
  if (ce !== null) {
    var l = ce.memoizedState;
    if (o = l.destroy, r !== null && Ba(r, l.deps)) {
      i.memoizedState = fi(t, n, o, r);
      return;
    }
  }
  ne.flags |= e, i.memoizedState = fi(1 | t, n, o, r);
}
function pc(e, t) {
  return bi(8390656, 8, e, t);
}
function Qa(e, t) {
  return cl(2048, 8, e, t);
}
function Qf(e, t) {
  return cl(4, 2, e, t);
}
function qf(e, t) {
  return cl(4, 4, e, t);
}
function Kf(e, t) {
  if (typeof t == "function")
    return e = e(), t(e), function() {
      t(null);
    };
  if (t != null)
    return e = e(), t.current = e, function() {
      t.current = null;
    };
}
function Yf(e, t, n) {
  return n = n != null ? n.concat([e]) : null, cl(4, 4, Kf.bind(null, t, e), n);
}
function qa() {
}
function Gf(e, t) {
  var n = Je();
  t = t === void 0 ? null : t;
  var r = n.memoizedState;
  return r !== null && t !== null && Ba(t, r[1]) ? r[0] : (n.memoizedState = [e, t], e);
}
function Xf(e, t) {
  var n = Je();
  t = t === void 0 ? null : t;
  var r = n.memoizedState;
  return r !== null && t !== null && Ba(t, r[1]) ? r[0] : (e = e(), n.memoizedState = [e, t], e);
}
function Jf(e, t, n) {
  return Sn & 21 ? (ct(n, t) || (n = ef(), ne.lanes |= n, Cn |= n, e.baseState = !0), t) : (e.baseState && (e.baseState = !1, ze = !0), e.memoizedState = n);
}
function bv(e, t) {
  var n = Q;
  Q = n !== 0 && 4 > n ? n : 4, e(!0);
  var r = Hl.transition;
  Hl.transition = {};
  try {
    e(!1), t();
  } finally {
    Q = n, Hl.transition = r;
  }
}
function bf() {
  return Je().memoizedState;
}
function e0(e, t, n) {
  var r = Kt(e);
  if (n = { lane: r, action: n, hasEagerState: !1, eagerState: null, next: null }, ep(e))
    tp(t, n);
  else if (n = Mf(e, t, n, r), n !== null) {
    var i = Oe();
    at(n, e, r, i), np(n, t, r);
  }
}
function t0(e, t, n) {
  var r = Kt(e), i = { lane: r, action: n, hasEagerState: !1, eagerState: null, next: null };
  if (ep(e))
    tp(t, i);
  else {
    var o = e.alternate;
    if (e.lanes === 0 && (o === null || o.lanes === 0) && (o = t.lastRenderedReducer, o !== null))
      try {
        var l = t.lastRenderedState, s = o(l, n);
        if (i.hasEagerState = !0, i.eagerState = s, ct(s, l)) {
          var a = t.interleaved;
          a === null ? (i.next = i, Da(t)) : (i.next = a.next, a.next = i), t.interleaved = i;
          return;
        }
      } catch {
      } finally {
      }
    n = Mf(e, t, i, r), n !== null && (i = Oe(), at(n, e, r, i), np(n, t, r));
  }
}
function ep(e) {
  var t = e.alternate;
  return e === ne || t !== null && t === ne;
}
function tp(e, t) {
  Rr = Lo = !0;
  var n = e.pending;
  n === null ? t.next = t : (t.next = n.next, n.next = t), e.pending = t;
}
function np(e, t, n) {
  if (n & 4194240) {
    var r = t.lanes;
    r &= e.pendingLanes, n |= r, t.lanes = n, Ca(e, n);
  }
}
var zo = { readContext: Xe, useCallback: ke, useContext: ke, useEffect: ke, useImperativeHandle: ke, useInsertionEffect: ke, useLayoutEffect: ke, useMemo: ke, useReducer: ke, useRef: ke, useState: ke, useDebugValue: ke, useDeferredValue: ke, useTransition: ke, useMutableSource: ke, useSyncExternalStore: ke, useId: ke, unstable_isNewReconciler: !1 }, n0 = { readContext: Xe, useCallback: function(e, t) {
  return ft().memoizedState = [e, t === void 0 ? null : t], e;
}, useContext: Xe, useEffect: pc, useImperativeHandle: function(e, t, n) {
  return n = n != null ? n.concat([e]) : null, bi(
    4194308,
    4,
    Kf.bind(null, t, e),
    n
  );
}, useLayoutEffect: function(e, t) {
  return bi(4194308, 4, e, t);
}, useInsertionEffect: function(e, t) {
  return bi(4, 2, e, t);
}, useMemo: function(e, t) {
  var n = ft();
  return t = t === void 0 ? null : t, e = e(), n.memoizedState = [e, t], e;
}, useReducer: function(e, t, n) {
  var r = ft();
  return t = n !== void 0 ? n(t) : t, r.memoizedState = r.baseState = t, e = { pending: null, interleaved: null, lanes: 0, dispatch: null, lastRenderedReducer: e, lastRenderedState: t }, r.queue = e, e = e.dispatch = e0.bind(null, ne, e), [r.memoizedState, e];
}, useRef: function(e) {
  var t = ft();
  return e = { current: e }, t.memoizedState = e;
}, useState: fc, useDebugValue: qa, useDeferredValue: function(e) {
  return ft().memoizedState = e;
}, useTransition: function() {
  var e = fc(!1), t = e[0];
  return e = bv.bind(null, e[1]), ft().memoizedState = e, [t, e];
}, useMutableSource: function() {
}, useSyncExternalStore: function(e, t, n) {
  var r = ne, i = ft();
  if (b) {
    if (n === void 0)
      throw Error(_(407));
    n = n();
  } else {
    if (n = t(), he === null)
      throw Error(_(349));
    Sn & 30 || Vf(r, t, n);
  }
  i.memoizedState = n;
  var o = { value: n, getSnapshot: t };
  return i.queue = o, pc(Ff.bind(
    null,
    r,
    o,
    e
  ), [e]), r.flags |= 2048, fi(9, Uf.bind(null, r, o, n, t), void 0, null), n;
}, useId: function() {
  var e = ft(), t = he.identifierPrefix;
  if (b) {
    var n = Ct, r = St;
    n = (r & ~(1 << 32 - st(r) - 1)).toString(32) + n, t = ":" + t + "R" + n, n = ci++, 0 < n && (t += "H" + n.toString(32)), t += ":";
  } else
    n = Jv++, t = ":" + t + "r" + n.toString(32) + ":";
  return e.memoizedState = t;
}, unstable_isNewReconciler: !1 }, r0 = {
  readContext: Xe,
  useCallback: Gf,
  useContext: Xe,
  useEffect: Qa,
  useImperativeHandle: Yf,
  useInsertionEffect: Qf,
  useLayoutEffect: qf,
  useMemo: Xf,
  useReducer: Ql,
  useRef: Hf,
  useState: function() {
    return Ql(di);
  },
  useDebugValue: qa,
  useDeferredValue: function(e) {
    var t = Je();
    return Jf(t, ce.memoizedState, e);
  },
  useTransition: function() {
    var e = Ql(di)[0], t = Je().memoizedState;
    return [e, t];
  },
  useMutableSource: Df,
  useSyncExternalStore: Zf,
  useId: bf,
  unstable_isNewReconciler: !1
}, i0 = { readContext: Xe, useCallback: Gf, useContext: Xe, useEffect: Qa, useImperativeHandle: Yf, useInsertionEffect: Qf, useLayoutEffect: qf, useMemo: Xf, useReducer: ql, useRef: Hf, useState: function() {
  return ql(di);
}, useDebugValue: qa, useDeferredValue: function(e) {
  var t = Je();
  return ce === null ? t.memoizedState = e : Jf(t, ce.memoizedState, e);
}, useTransition: function() {
  var e = ql(di)[0], t = Je().memoizedState;
  return [e, t];
}, useMutableSource: Df, useSyncExternalStore: Zf, useId: bf, unstable_isNewReconciler: !1 };
function ir(e, t) {
  try {
    var n = "", r = t;
    do
      n += I1(r), r = r.return;
    while (r);
    var i = n;
  } catch (o) {
    i = `
Error generating stack: ` + o.message + `
` + o.stack;
  }
  return { value: e, source: t, stack: i, digest: null };
}
function Kl(e, t, n) {
  return { value: e, source: null, stack: n ?? null, digest: t ?? null };
}
function Fs(e, t) {
  try {
    console.error(t.value);
  } catch (n) {
    setTimeout(function() {
      throw n;
    });
  }
}
var o0 = typeof WeakMap == "function" ? WeakMap : Map;
function rp(e, t, n) {
  n = Tt(-1, n), n.tag = 3, n.payload = { element: null };
  var r = t.value;
  return n.callback = function() {
    Ao || (Ao = !0, Js = r), Fs(e, t);
  }, n;
}
function ip(e, t, n) {
  n = Tt(-1, n), n.tag = 3;
  var r = e.type.getDerivedStateFromError;
  if (typeof r == "function") {
    var i = t.value;
    n.payload = function() {
      return r(i);
    }, n.callback = function() {
      Fs(e, t);
    };
  }
  var o = e.stateNode;
  return o !== null && typeof o.componentDidCatch == "function" && (n.callback = function() {
    Fs(e, t), typeof r != "function" && (qt === null ? qt = /* @__PURE__ */ new Set([this]) : qt.add(this));
    var l = t.stack;
    this.componentDidCatch(t.value, { componentStack: l !== null ? l : "" });
  }), n;
}
function hc(e, t, n) {
  var r = e.pingCache;
  if (r === null) {
    r = e.pingCache = new o0();
    var i = /* @__PURE__ */ new Set();
    r.set(t, i);
  } else
    i = r.get(t), i === void 0 && (i = /* @__PURE__ */ new Set(), r.set(t, i));
  i.has(n) || (i.add(n), e = w0.bind(null, e, t, n), t.then(e, e));
}
function mc(e) {
  do {
    var t;
    if ((t = e.tag === 13) && (t = e.memoizedState, t = t !== null ? t.dehydrated !== null : !0), t)
      return e;
    e = e.return;
  } while (e !== null);
  return null;
}
function vc(e, t, n, r, i) {
  return e.mode & 1 ? (e.flags |= 65536, e.lanes = i, e) : (e === t ? e.flags |= 65536 : (e.flags |= 128, n.flags |= 131072, n.flags &= -52805, n.tag === 1 && (n.alternate === null ? n.tag = 17 : (t = Tt(-1, 1), t.tag = 2, Qt(n, t, 1))), n.lanes |= 1), e);
}
var l0 = Lt.ReactCurrentOwner, ze = !1;
function Pe(e, t, n, r) {
  t.child = e === null ? Af(t, null, n, r) : nr(t, e.child, n, r);
}
function yc(e, t, n, r, i) {
  n = n.render;
  var o = t.ref;
  return Kn(t, i), r = Wa(e, t, n, r, o, i), n = Ha(), e !== null && !ze ? (t.updateQueue = e.updateQueue, t.flags &= -2053, e.lanes &= ~i, Mt(e, t, i)) : (b && n && Ia(t), t.flags |= 1, Pe(e, t, r, i), t.child);
}
function gc(e, t, n, r, i) {
  if (e === null) {
    var o = n.type;
    return typeof o == "function" && !tu(o) && o.defaultProps === void 0 && n.compare === null && n.defaultProps === void 0 ? (t.tag = 15, t.type = o, op(e, t, o, r, i)) : (e = ro(n.type, null, r, t, t.mode, i), e.ref = t.ref, e.return = t, t.child = e);
  }
  if (o = e.child, !(e.lanes & i)) {
    var l = o.memoizedProps;
    if (n = n.compare, n = n !== null ? n : ii, n(l, r) && e.ref === t.ref)
      return Mt(e, t, i);
  }
  return t.flags |= 1, e = Yt(o, r), e.ref = t.ref, e.return = t, t.child = e;
}
function op(e, t, n, r, i) {
  if (e !== null) {
    var o = e.memoizedProps;
    if (ii(o, r) && e.ref === t.ref)
      if (ze = !1, t.pendingProps = r = o, (e.lanes & i) !== 0)
        e.flags & 131072 && (ze = !0);
      else
        return t.lanes = e.lanes, Mt(e, t, i);
  }
  return Bs(e, t, n, r, i);
}
function lp(e, t, n) {
  var r = t.pendingProps, i = r.children, o = e !== null ? e.memoizedState : null;
  if (r.mode === "hidden")
    if (!(t.mode & 1))
      t.memoizedState = { baseLanes: 0, cachePool: null, transitions: null }, G(Un, Ze), Ze |= n;
    else {
      if (!(n & 1073741824))
        return e = o !== null ? o.baseLanes | n : n, t.lanes = t.childLanes = 1073741824, t.memoizedState = { baseLanes: e, cachePool: null, transitions: null }, t.updateQueue = null, G(Un, Ze), Ze |= e, null;
      t.memoizedState = { baseLanes: 0, cachePool: null, transitions: null }, r = o !== null ? o.baseLanes : n, G(Un, Ze), Ze |= r;
    }
  else
    o !== null ? (r = o.baseLanes | n, t.memoizedState = null) : r = n, G(Un, Ze), Ze |= r;
  return Pe(e, t, i, n), t.child;
}
function sp(e, t) {
  var n = t.ref;
  (e === null && n !== null || e !== null && e.ref !== n) && (t.flags |= 512, t.flags |= 2097152);
}
function Bs(e, t, n, r, i) {
  var o = Ae(n) ? kn : Ne.current;
  return o = er(t, o), Kn(t, i), n = Wa(e, t, n, r, o, i), r = Ha(), e !== null && !ze ? (t.updateQueue = e.updateQueue, t.flags &= -2053, e.lanes &= ~i, Mt(e, t, i)) : (b && r && Ia(t), t.flags |= 1, Pe(e, t, n, i), t.child);
}
function wc(e, t, n, r, i) {
  if (Ae(n)) {
    var o = !0;
    To(t);
  } else
    o = !1;
  if (Kn(t, i), t.stateNode === null)
    eo(e, t), zf(t, n, r), Us(t, n, r, i), r = !0;
  else if (e === null) {
    var l = t.stateNode, s = t.memoizedProps;
    l.props = s;
    var a = l.context, u = n.contextType;
    typeof u == "object" && u !== null ? u = Xe(u) : (u = Ae(n) ? kn : Ne.current, u = er(t, u));
    var p = n.getDerivedStateFromProps, h = typeof p == "function" || typeof l.getSnapshotBeforeUpdate == "function";
    h || typeof l.UNSAFE_componentWillReceiveProps != "function" && typeof l.componentWillReceiveProps != "function" || (s !== r || a !== u) && cc(t, l, r, u), At = !1;
    var m = t.memoizedState;
    l.state = m, Mo(t, r, l, i), a = t.memoizedState, s !== r || m !== a || je.current || At ? (typeof p == "function" && (Vs(t, n, p, r), a = t.memoizedState), (s = At || uc(t, n, s, r, m, a, u)) ? (h || typeof l.UNSAFE_componentWillMount != "function" && typeof l.componentWillMount != "function" || (typeof l.componentWillMount == "function" && l.componentWillMount(), typeof l.UNSAFE_componentWillMount == "function" && l.UNSAFE_componentWillMount()), typeof l.componentDidMount == "function" && (t.flags |= 4194308)) : (typeof l.componentDidMount == "function" && (t.flags |= 4194308), t.memoizedProps = r, t.memoizedState = a), l.props = r, l.state = a, l.context = u, r = s) : (typeof l.componentDidMount == "function" && (t.flags |= 4194308), r = !1);
  } else {
    l = t.stateNode, If(e, t), s = t.memoizedProps, u = t.type === t.elementType ? s : tt(t.type, s), l.props = u, h = t.pendingProps, m = l.context, a = n.contextType, typeof a == "object" && a !== null ? a = Xe(a) : (a = Ae(n) ? kn : Ne.current, a = er(t, a));
    var w = n.getDerivedStateFromProps;
    (p = typeof w == "function" || typeof l.getSnapshotBeforeUpdate == "function") || typeof l.UNSAFE_componentWillReceiveProps != "function" && typeof l.componentWillReceiveProps != "function" || (s !== h || m !== a) && cc(t, l, r, a), At = !1, m = t.memoizedState, l.state = m, Mo(t, r, l, i);
    var g = t.memoizedState;
    s !== h || m !== g || je.current || At ? (typeof w == "function" && (Vs(t, n, w, r), g = t.memoizedState), (u = At || uc(t, n, u, r, m, g, a) || !1) ? (p || typeof l.UNSAFE_componentWillUpdate != "function" && typeof l.componentWillUpdate != "function" || (typeof l.componentWillUpdate == "function" && l.componentWillUpdate(r, g, a), typeof l.UNSAFE_componentWillUpdate == "function" && l.UNSAFE_componentWillUpdate(r, g, a)), typeof l.componentDidUpdate == "function" && (t.flags |= 4), typeof l.getSnapshotBeforeUpdate == "function" && (t.flags |= 1024)) : (typeof l.componentDidUpdate != "function" || s === e.memoizedProps && m === e.memoizedState || (t.flags |= 4), typeof l.getSnapshotBeforeUpdate != "function" || s === e.memoizedProps && m === e.memoizedState || (t.flags |= 1024), t.memoizedProps = r, t.memoizedState = g), l.props = r, l.state = g, l.context = a, r = u) : (typeof l.componentDidUpdate != "function" || s === e.memoizedProps && m === e.memoizedState || (t.flags |= 4), typeof l.getSnapshotBeforeUpdate != "function" || s === e.memoizedProps && m === e.memoizedState || (t.flags |= 1024), r = !1);
  }
  return Ws(e, t, n, r, o, i);
}
function Ws(e, t, n, r, i, o) {
  sp(e, t);
  var l = (t.flags & 128) !== 0;
  if (!r && !l)
    return i && ic(t, n, !1), Mt(e, t, o);
  r = t.stateNode, l0.current = t;
  var s = l && typeof n.getDerivedStateFromError != "function" ? null : r.render();
  return t.flags |= 1, e !== null && l ? (t.child = nr(t, e.child, null, o), t.child = nr(t, null, s, o)) : Pe(e, t, s, o), t.memoizedState = r.state, i && ic(t, n, !0), t.child;
}
function ap(e) {
  var t = e.stateNode;
  t.pendingContext ? rc(e, t.pendingContext, t.pendingContext !== t.context) : t.context && rc(e, t.context, !1), Va(e, t.containerInfo);
}
function _c(e, t, n, r, i) {
  return tr(), za(i), t.flags |= 256, Pe(e, t, n, r), t.child;
}
var Hs = { dehydrated: null, treeContext: null, retryLane: 0 };
function Qs(e) {
  return { baseLanes: e, cachePool: null, transitions: null };
}
function up(e, t, n) {
  var r = t.pendingProps, i = te.current, o = !1, l = (t.flags & 128) !== 0, s;
  if ((s = l) || (s = e !== null && e.memoizedState === null ? !1 : (i & 2) !== 0), s ? (o = !0, t.flags &= -129) : (e === null || e.memoizedState !== null) && (i |= 1), G(te, i & 1), e === null)
    return Ds(t), e = t.memoizedState, e !== null && (e = e.dehydrated, e !== null) ? (t.mode & 1 ? e.data === "$!" ? t.lanes = 8 : t.lanes = 1073741824 : t.lanes = 1, null) : (l = r.children, e = r.fallback, o ? (r = t.mode, o = t.child, l = { mode: "hidden", children: l }, !(r & 1) && o !== null ? (o.childLanes = 0, o.pendingProps = l) : o = pl(l, r, 0, null), e = yn(e, r, n, null), o.return = t, e.return = t, o.sibling = e, t.child = o, t.child.memoizedState = Qs(n), t.memoizedState = Hs, e) : Ka(t, l));
  if (i = e.memoizedState, i !== null && (s = i.dehydrated, s !== null))
    return s0(e, t, l, r, s, i, n);
  if (o) {
    o = r.fallback, l = t.mode, i = e.child, s = i.sibling;
    var a = { mode: "hidden", children: r.children };
    return !(l & 1) && t.child !== i ? (r = t.child, r.childLanes = 0, r.pendingProps = a, t.deletions = null) : (r = Yt(i, a), r.subtreeFlags = i.subtreeFlags & 14680064), s !== null ? o = Yt(s, o) : (o = yn(o, l, n, null), o.flags |= 2), o.return = t, r.return = t, r.sibling = o, t.child = r, r = o, o = t.child, l = e.child.memoizedState, l = l === null ? Qs(n) : { baseLanes: l.baseLanes | n, cachePool: null, transitions: l.transitions }, o.memoizedState = l, o.childLanes = e.childLanes & ~n, t.memoizedState = Hs, r;
  }
  return o = e.child, e = o.sibling, r = Yt(o, { mode: "visible", children: r.children }), !(t.mode & 1) && (r.lanes = n), r.return = t, r.sibling = null, e !== null && (n = t.deletions, n === null ? (t.deletions = [e], t.flags |= 16) : n.push(e)), t.child = r, t.memoizedState = null, r;
}
function Ka(e, t) {
  return t = pl({ mode: "visible", children: t }, e.mode, 0, null), t.return = e, e.child = t;
}
function Di(e, t, n, r) {
  return r !== null && za(r), nr(t, e.child, null, n), e = Ka(t, t.pendingProps.children), e.flags |= 2, t.memoizedState = null, e;
}
function s0(e, t, n, r, i, o, l) {
  if (n)
    return t.flags & 256 ? (t.flags &= -257, r = Kl(Error(_(422))), Di(e, t, l, r)) : t.memoizedState !== null ? (t.child = e.child, t.flags |= 128, null) : (o = r.fallback, i = t.mode, r = pl({ mode: "visible", children: r.children }, i, 0, null), o = yn(o, i, l, null), o.flags |= 2, r.return = t, o.return = t, r.sibling = o, t.child = r, t.mode & 1 && nr(t, e.child, null, l), t.child.memoizedState = Qs(l), t.memoizedState = Hs, o);
  if (!(t.mode & 1))
    return Di(e, t, l, null);
  if (i.data === "$!") {
    if (r = i.nextSibling && i.nextSibling.dataset, r)
      var s = r.dgst;
    return r = s, o = Error(_(419)), r = Kl(o, r, void 0), Di(e, t, l, r);
  }
  if (s = (l & e.childLanes) !== 0, ze || s) {
    if (r = he, r !== null) {
      switch (l & -l) {
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
      i = i & (r.suspendedLanes | l) ? 0 : i, i !== 0 && i !== o.retryLane && (o.retryLane = i, Rt(e, i), at(r, e, i, -1));
    }
    return eu(), r = Kl(Error(_(421))), Di(e, t, l, r);
  }
  return i.data === "$?" ? (t.flags |= 128, t.child = e.child, t = _0.bind(null, e), i._reactRetry = t, null) : (e = o.treeContext, Ve = Ht(i.nextSibling), Fe = t, b = !0, rt = null, e !== null && (qe[Ke++] = St, qe[Ke++] = Ct, qe[Ke++] = xn, St = e.id, Ct = e.overflow, xn = t), t = Ka(t, r.children), t.flags |= 4096, t);
}
function kc(e, t, n) {
  e.lanes |= t;
  var r = e.alternate;
  r !== null && (r.lanes |= t), Zs(e.return, t, n);
}
function Yl(e, t, n, r, i) {
  var o = e.memoizedState;
  o === null ? e.memoizedState = { isBackwards: t, rendering: null, renderingStartTime: 0, last: r, tail: n, tailMode: i } : (o.isBackwards = t, o.rendering = null, o.renderingStartTime = 0, o.last = r, o.tail = n, o.tailMode = i);
}
function cp(e, t, n) {
  var r = t.pendingProps, i = r.revealOrder, o = r.tail;
  if (Pe(e, t, r.children, n), r = te.current, r & 2)
    r = r & 1 | 2, t.flags |= 128;
  else {
    if (e !== null && e.flags & 128)
      e:
        for (e = t.child; e !== null; ) {
          if (e.tag === 13)
            e.memoizedState !== null && kc(e, n, t);
          else if (e.tag === 19)
            kc(e, n, t);
          else if (e.child !== null) {
            e.child.return = e, e = e.child;
            continue;
          }
          if (e === t)
            break e;
          for (; e.sibling === null; ) {
            if (e.return === null || e.return === t)
              break e;
            e = e.return;
          }
          e.sibling.return = e.return, e = e.sibling;
        }
    r &= 1;
  }
  if (G(te, r), !(t.mode & 1))
    t.memoizedState = null;
  else
    switch (i) {
      case "forwards":
        for (n = t.child, i = null; n !== null; )
          e = n.alternate, e !== null && Io(e) === null && (i = n), n = n.sibling;
        n = i, n === null ? (i = t.child, t.child = null) : (i = n.sibling, n.sibling = null), Yl(t, !1, i, n, o);
        break;
      case "backwards":
        for (n = null, i = t.child, t.child = null; i !== null; ) {
          if (e = i.alternate, e !== null && Io(e) === null) {
            t.child = i;
            break;
          }
          e = i.sibling, i.sibling = n, n = i, i = e;
        }
        Yl(t, !0, n, null, o);
        break;
      case "together":
        Yl(t, !1, null, null, void 0);
        break;
      default:
        t.memoizedState = null;
    }
  return t.child;
}
function eo(e, t) {
  !(t.mode & 1) && e !== null && (e.alternate = null, t.alternate = null, t.flags |= 2);
}
function Mt(e, t, n) {
  if (e !== null && (t.dependencies = e.dependencies), Cn |= t.lanes, !(n & t.childLanes))
    return null;
  if (e !== null && t.child !== e.child)
    throw Error(_(153));
  if (t.child !== null) {
    for (e = t.child, n = Yt(e, e.pendingProps), t.child = n, n.return = t; e.sibling !== null; )
      e = e.sibling, n = n.sibling = Yt(e, e.pendingProps), n.return = t;
    n.sibling = null;
  }
  return t.child;
}
function a0(e, t, n) {
  switch (t.tag) {
    case 3:
      ap(t), tr();
      break;
    case 5:
      $f(t);
      break;
    case 1:
      Ae(t.type) && To(t);
      break;
    case 4:
      Va(t, t.stateNode.containerInfo);
      break;
    case 10:
      var r = t.type._context, i = t.memoizedProps.value;
      G(Oo, r._currentValue), r._currentValue = i;
      break;
    case 13:
      if (r = t.memoizedState, r !== null)
        return r.dehydrated !== null ? (G(te, te.current & 1), t.flags |= 128, null) : n & t.child.childLanes ? up(e, t, n) : (G(te, te.current & 1), e = Mt(e, t, n), e !== null ? e.sibling : null);
      G(te, te.current & 1);
      break;
    case 19:
      if (r = (n & t.childLanes) !== 0, e.flags & 128) {
        if (r)
          return cp(e, t, n);
        t.flags |= 128;
      }
      if (i = t.memoizedState, i !== null && (i.rendering = null, i.tail = null, i.lastEffect = null), G(te, te.current), r)
        break;
      return null;
    case 22:
    case 23:
      return t.lanes = 0, lp(e, t, n);
  }
  return Mt(e, t, n);
}
var dp, qs, fp, pp;
dp = function(e, t) {
  for (var n = t.child; n !== null; ) {
    if (n.tag === 5 || n.tag === 6)
      e.appendChild(n.stateNode);
    else if (n.tag !== 4 && n.child !== null) {
      n.child.return = n, n = n.child;
      continue;
    }
    if (n === t)
      break;
    for (; n.sibling === null; ) {
      if (n.return === null || n.return === t)
        return;
      n = n.return;
    }
    n.sibling.return = n.return, n = n.sibling;
  }
};
qs = function() {
};
fp = function(e, t, n, r) {
  var i = e.memoizedProps;
  if (i !== r) {
    e = t.stateNode, pn(gt.current);
    var o = null;
    switch (n) {
      case "input":
        i = ms(e, i), r = ms(e, r), o = [];
        break;
      case "select":
        i = re({}, i, { value: void 0 }), r = re({}, r, { value: void 0 }), o = [];
        break;
      case "textarea":
        i = gs(e, i), r = gs(e, r), o = [];
        break;
      default:
        typeof i.onClick != "function" && typeof r.onClick == "function" && (e.onclick = Co);
    }
    _s(n, r);
    var l;
    n = null;
    for (u in i)
      if (!r.hasOwnProperty(u) && i.hasOwnProperty(u) && i[u] != null)
        if (u === "style") {
          var s = i[u];
          for (l in s)
            s.hasOwnProperty(l) && (n || (n = {}), n[l] = "");
        } else
          u !== "dangerouslySetInnerHTML" && u !== "children" && u !== "suppressContentEditableWarning" && u !== "suppressHydrationWarning" && u !== "autoFocus" && (Xr.hasOwnProperty(u) ? o || (o = []) : (o = o || []).push(u, null));
    for (u in r) {
      var a = r[u];
      if (s = i != null ? i[u] : void 0, r.hasOwnProperty(u) && a !== s && (a != null || s != null))
        if (u === "style")
          if (s) {
            for (l in s)
              !s.hasOwnProperty(l) || a && a.hasOwnProperty(l) || (n || (n = {}), n[l] = "");
            for (l in a)
              a.hasOwnProperty(l) && s[l] !== a[l] && (n || (n = {}), n[l] = a[l]);
          } else
            n || (o || (o = []), o.push(
              u,
              n
            )), n = a;
        else
          u === "dangerouslySetInnerHTML" ? (a = a ? a.__html : void 0, s = s ? s.__html : void 0, a != null && s !== a && (o = o || []).push(u, a)) : u === "children" ? typeof a != "string" && typeof a != "number" || (o = o || []).push(u, "" + a) : u !== "suppressContentEditableWarning" && u !== "suppressHydrationWarning" && (Xr.hasOwnProperty(u) ? (a != null && u === "onScroll" && X("scroll", e), o || s === a || (o = [])) : (o = o || []).push(u, a));
    }
    n && (o = o || []).push("style", n);
    var u = o;
    (t.updateQueue = u) && (t.flags |= 4);
  }
};
pp = function(e, t, n, r) {
  n !== r && (t.flags |= 4);
};
function wr(e, t) {
  if (!b)
    switch (e.tailMode) {
      case "hidden":
        t = e.tail;
        for (var n = null; t !== null; )
          t.alternate !== null && (n = t), t = t.sibling;
        n === null ? e.tail = null : n.sibling = null;
        break;
      case "collapsed":
        n = e.tail;
        for (var r = null; n !== null; )
          n.alternate !== null && (r = n), n = n.sibling;
        r === null ? t || e.tail === null ? e.tail = null : e.tail.sibling = null : r.sibling = null;
    }
}
function xe(e) {
  var t = e.alternate !== null && e.alternate.child === e.child, n = 0, r = 0;
  if (t)
    for (var i = e.child; i !== null; )
      n |= i.lanes | i.childLanes, r |= i.subtreeFlags & 14680064, r |= i.flags & 14680064, i.return = e, i = i.sibling;
  else
    for (i = e.child; i !== null; )
      n |= i.lanes | i.childLanes, r |= i.subtreeFlags, r |= i.flags, i.return = e, i = i.sibling;
  return e.subtreeFlags |= r, e.childLanes = n, t;
}
function u0(e, t, n) {
  var r = t.pendingProps;
  switch (La(t), t.tag) {
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
      return xe(t), null;
    case 1:
      return Ae(t.type) && Eo(), xe(t), null;
    case 3:
      return r = t.stateNode, rr(), J(je), J(Ne), Fa(), r.pendingContext && (r.context = r.pendingContext, r.pendingContext = null), (e === null || e.child === null) && (Ai(t) ? t.flags |= 4 : e === null || e.memoizedState.isDehydrated && !(t.flags & 256) || (t.flags |= 1024, rt !== null && (ta(rt), rt = null))), qs(e, t), xe(t), null;
    case 5:
      Ua(t);
      var i = pn(ui.current);
      if (n = t.type, e !== null && t.stateNode != null)
        fp(e, t, n, r, i), e.ref !== t.ref && (t.flags |= 512, t.flags |= 2097152);
      else {
        if (!r) {
          if (t.stateNode === null)
            throw Error(_(166));
          return xe(t), null;
        }
        if (e = pn(gt.current), Ai(t)) {
          r = t.stateNode, n = t.type;
          var o = t.memoizedProps;
          switch (r[mt] = t, r[si] = o, e = (t.mode & 1) !== 0, n) {
            case "dialog":
              X("cancel", r), X("close", r);
              break;
            case "iframe":
            case "object":
            case "embed":
              X("load", r);
              break;
            case "video":
            case "audio":
              for (i = 0; i < Cr.length; i++)
                X(Cr[i], r);
              break;
            case "source":
              X("error", r);
              break;
            case "img":
            case "image":
            case "link":
              X(
                "error",
                r
              ), X("load", r);
              break;
            case "details":
              X("toggle", r);
              break;
            case "input":
              Ru(r, o), X("invalid", r);
              break;
            case "select":
              r._wrapperState = { wasMultiple: !!o.multiple }, X("invalid", r);
              break;
            case "textarea":
              Iu(r, o), X("invalid", r);
          }
          _s(n, o), i = null;
          for (var l in o)
            if (o.hasOwnProperty(l)) {
              var s = o[l];
              l === "children" ? typeof s == "string" ? r.textContent !== s && (o.suppressHydrationWarning !== !0 && ji(r.textContent, s, e), i = ["children", s]) : typeof s == "number" && r.textContent !== "" + s && (o.suppressHydrationWarning !== !0 && ji(
                r.textContent,
                s,
                e
              ), i = ["children", "" + s]) : Xr.hasOwnProperty(l) && s != null && l === "onScroll" && X("scroll", r);
            }
          switch (n) {
            case "input":
              Ni(r), Mu(r, o, !0);
              break;
            case "textarea":
              Ni(r), Lu(r);
              break;
            case "select":
            case "option":
              break;
            default:
              typeof o.onClick == "function" && (r.onclick = Co);
          }
          r = i, t.updateQueue = r, r !== null && (t.flags |= 4);
        } else {
          l = i.nodeType === 9 ? i : i.ownerDocument, e === "http://www.w3.org/1999/xhtml" && (e = Zd(n)), e === "http://www.w3.org/1999/xhtml" ? n === "script" ? (e = l.createElement("div"), e.innerHTML = "<script><\/script>", e = e.removeChild(e.firstChild)) : typeof r.is == "string" ? e = l.createElement(n, { is: r.is }) : (e = l.createElement(n), n === "select" && (l = e, r.multiple ? l.multiple = !0 : r.size && (l.size = r.size))) : e = l.createElementNS(e, n), e[mt] = t, e[si] = r, dp(e, t, !1, !1), t.stateNode = e;
          e: {
            switch (l = ks(n, r), n) {
              case "dialog":
                X("cancel", e), X("close", e), i = r;
                break;
              case "iframe":
              case "object":
              case "embed":
                X("load", e), i = r;
                break;
              case "video":
              case "audio":
                for (i = 0; i < Cr.length; i++)
                  X(Cr[i], e);
                i = r;
                break;
              case "source":
                X("error", e), i = r;
                break;
              case "img":
              case "image":
              case "link":
                X(
                  "error",
                  e
                ), X("load", e), i = r;
                break;
              case "details":
                X("toggle", e), i = r;
                break;
              case "input":
                Ru(e, r), i = ms(e, r), X("invalid", e);
                break;
              case "option":
                i = r;
                break;
              case "select":
                e._wrapperState = { wasMultiple: !!r.multiple }, i = re({}, r, { value: void 0 }), X("invalid", e);
                break;
              case "textarea":
                Iu(e, r), i = gs(e, r), X("invalid", e);
                break;
              default:
                i = r;
            }
            _s(n, i), s = i;
            for (o in s)
              if (s.hasOwnProperty(o)) {
                var a = s[o];
                o === "style" ? Fd(e, a) : o === "dangerouslySetInnerHTML" ? (a = a ? a.__html : void 0, a != null && Vd(e, a)) : o === "children" ? typeof a == "string" ? (n !== "textarea" || a !== "") && Jr(e, a) : typeof a == "number" && Jr(e, "" + a) : o !== "suppressContentEditableWarning" && o !== "suppressHydrationWarning" && o !== "autoFocus" && (Xr.hasOwnProperty(o) ? a != null && o === "onScroll" && X("scroll", e) : a != null && ga(e, o, a, l));
              }
            switch (n) {
              case "input":
                Ni(e), Mu(e, r, !1);
                break;
              case "textarea":
                Ni(e), Lu(e);
                break;
              case "option":
                r.value != null && e.setAttribute("value", "" + bt(r.value));
                break;
              case "select":
                e.multiple = !!r.multiple, o = r.value, o != null ? Wn(e, !!r.multiple, o, !1) : r.defaultValue != null && Wn(
                  e,
                  !!r.multiple,
                  r.defaultValue,
                  !0
                );
                break;
              default:
                typeof i.onClick == "function" && (e.onclick = Co);
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
      return xe(t), null;
    case 6:
      if (e && t.stateNode != null)
        pp(e, t, e.memoizedProps, r);
      else {
        if (typeof r != "string" && t.stateNode === null)
          throw Error(_(166));
        if (n = pn(ui.current), pn(gt.current), Ai(t)) {
          if (r = t.stateNode, n = t.memoizedProps, r[mt] = t, (o = r.nodeValue !== n) && (e = Fe, e !== null))
            switch (e.tag) {
              case 3:
                ji(r.nodeValue, n, (e.mode & 1) !== 0);
                break;
              case 5:
                e.memoizedProps.suppressHydrationWarning !== !0 && ji(r.nodeValue, n, (e.mode & 1) !== 0);
            }
          o && (t.flags |= 4);
        } else
          r = (n.nodeType === 9 ? n : n.ownerDocument).createTextNode(r), r[mt] = t, t.stateNode = r;
      }
      return xe(t), null;
    case 13:
      if (J(te), r = t.memoizedState, e === null || e.memoizedState !== null && e.memoizedState.dehydrated !== null) {
        if (b && Ve !== null && t.mode & 1 && !(t.flags & 128))
          Rf(), tr(), t.flags |= 98560, o = !1;
        else if (o = Ai(t), r !== null && r.dehydrated !== null) {
          if (e === null) {
            if (!o)
              throw Error(_(318));
            if (o = t.memoizedState, o = o !== null ? o.dehydrated : null, !o)
              throw Error(_(317));
            o[mt] = t;
          } else
            tr(), !(t.flags & 128) && (t.memoizedState = null), t.flags |= 4;
          xe(t), o = !1;
        } else
          rt !== null && (ta(rt), rt = null), o = !0;
        if (!o)
          return t.flags & 65536 ? t : null;
      }
      return t.flags & 128 ? (t.lanes = n, t) : (r = r !== null, r !== (e !== null && e.memoizedState !== null) && r && (t.child.flags |= 8192, t.mode & 1 && (e === null || te.current & 1 ? de === 0 && (de = 3) : eu())), t.updateQueue !== null && (t.flags |= 4), xe(t), null);
    case 4:
      return rr(), qs(e, t), e === null && oi(t.stateNode.containerInfo), xe(t), null;
    case 10:
      return $a(t.type._context), xe(t), null;
    case 17:
      return Ae(t.type) && Eo(), xe(t), null;
    case 19:
      if (J(te), o = t.memoizedState, o === null)
        return xe(t), null;
      if (r = (t.flags & 128) !== 0, l = o.rendering, l === null)
        if (r)
          wr(o, !1);
        else {
          if (de !== 0 || e !== null && e.flags & 128)
            for (e = t.child; e !== null; ) {
              if (l = Io(e), l !== null) {
                for (t.flags |= 128, wr(o, !1), r = l.updateQueue, r !== null && (t.updateQueue = r, t.flags |= 4), t.subtreeFlags = 0, r = n, n = t.child; n !== null; )
                  o = n, e = r, o.flags &= 14680066, l = o.alternate, l === null ? (o.childLanes = 0, o.lanes = e, o.child = null, o.subtreeFlags = 0, o.memoizedProps = null, o.memoizedState = null, o.updateQueue = null, o.dependencies = null, o.stateNode = null) : (o.childLanes = l.childLanes, o.lanes = l.lanes, o.child = l.child, o.subtreeFlags = 0, o.deletions = null, o.memoizedProps = l.memoizedProps, o.memoizedState = l.memoizedState, o.updateQueue = l.updateQueue, o.type = l.type, e = l.dependencies, o.dependencies = e === null ? null : { lanes: e.lanes, firstContext: e.firstContext }), n = n.sibling;
                return G(te, te.current & 1 | 2), t.child;
              }
              e = e.sibling;
            }
          o.tail !== null && se() > or && (t.flags |= 128, r = !0, wr(o, !1), t.lanes = 4194304);
        }
      else {
        if (!r)
          if (e = Io(l), e !== null) {
            if (t.flags |= 128, r = !0, n = e.updateQueue, n !== null && (t.updateQueue = n, t.flags |= 4), wr(o, !0), o.tail === null && o.tailMode === "hidden" && !l.alternate && !b)
              return xe(t), null;
          } else
            2 * se() - o.renderingStartTime > or && n !== 1073741824 && (t.flags |= 128, r = !0, wr(o, !1), t.lanes = 4194304);
        o.isBackwards ? (l.sibling = t.child, t.child = l) : (n = o.last, n !== null ? n.sibling = l : t.child = l, o.last = l);
      }
      return o.tail !== null ? (t = o.tail, o.rendering = t, o.tail = t.sibling, o.renderingStartTime = se(), t.sibling = null, n = te.current, G(te, r ? n & 1 | 2 : n & 1), t) : (xe(t), null);
    case 22:
    case 23:
      return ba(), r = t.memoizedState !== null, e !== null && e.memoizedState !== null !== r && (t.flags |= 8192), r && t.mode & 1 ? Ze & 1073741824 && (xe(t), t.subtreeFlags & 6 && (t.flags |= 8192)) : xe(t), null;
    case 24:
      return null;
    case 25:
      return null;
  }
  throw Error(_(156, t.tag));
}
function c0(e, t) {
  switch (La(t), t.tag) {
    case 1:
      return Ae(t.type) && Eo(), e = t.flags, e & 65536 ? (t.flags = e & -65537 | 128, t) : null;
    case 3:
      return rr(), J(je), J(Ne), Fa(), e = t.flags, e & 65536 && !(e & 128) ? (t.flags = e & -65537 | 128, t) : null;
    case 5:
      return Ua(t), null;
    case 13:
      if (J(te), e = t.memoizedState, e !== null && e.dehydrated !== null) {
        if (t.alternate === null)
          throw Error(_(340));
        tr();
      }
      return e = t.flags, e & 65536 ? (t.flags = e & -65537 | 128, t) : null;
    case 19:
      return J(te), null;
    case 4:
      return rr(), null;
    case 10:
      return $a(t.type._context), null;
    case 22:
    case 23:
      return ba(), null;
    case 24:
      return null;
    default:
      return null;
  }
}
var Zi = !1, Ce = !1, d0 = typeof WeakSet == "function" ? WeakSet : Set, N = null;
function Vn(e, t) {
  var n = e.ref;
  if (n !== null)
    if (typeof n == "function")
      try {
        n(null);
      } catch (r) {
        ie(e, t, r);
      }
    else
      n.current = null;
}
function Ks(e, t, n) {
  try {
    n();
  } catch (r) {
    ie(e, t, r);
  }
}
var xc = !1;
function f0(e, t) {
  if (Ms = ko, e = yf(), Ma(e)) {
    if ("selectionStart" in e)
      var n = { start: e.selectionStart, end: e.selectionEnd };
    else
      e: {
        n = (n = e.ownerDocument) && n.defaultView || window;
        var r = n.getSelection && n.getSelection();
        if (r && r.rangeCount !== 0) {
          n = r.anchorNode;
          var i = r.anchorOffset, o = r.focusNode;
          r = r.focusOffset;
          try {
            n.nodeType, o.nodeType;
          } catch {
            n = null;
            break e;
          }
          var l = 0, s = -1, a = -1, u = 0, p = 0, h = e, m = null;
          t:
            for (; ; ) {
              for (var w; h !== n || i !== 0 && h.nodeType !== 3 || (s = l + i), h !== o || r !== 0 && h.nodeType !== 3 || (a = l + r), h.nodeType === 3 && (l += h.nodeValue.length), (w = h.firstChild) !== null; )
                m = h, h = w;
              for (; ; ) {
                if (h === e)
                  break t;
                if (m === n && ++u === i && (s = l), m === o && ++p === r && (a = l), (w = h.nextSibling) !== null)
                  break;
                h = m, m = h.parentNode;
              }
              h = w;
            }
          n = s === -1 || a === -1 ? null : { start: s, end: a };
        } else
          n = null;
      }
    n = n || { start: 0, end: 0 };
  } else
    n = null;
  for (Is = { focusedElem: e, selectionRange: n }, ko = !1, N = t; N !== null; )
    if (t = N, e = t.child, (t.subtreeFlags & 1028) !== 0 && e !== null)
      e.return = t, N = e;
    else
      for (; N !== null; ) {
        t = N;
        try {
          var g = t.alternate;
          if (t.flags & 1024)
            switch (t.tag) {
              case 0:
              case 11:
              case 15:
                break;
              case 1:
                if (g !== null) {
                  var v = g.memoizedProps, I = g.memoizedState, d = t.stateNode, c = d.getSnapshotBeforeUpdate(t.elementType === t.type ? v : tt(t.type, v), I);
                  d.__reactInternalSnapshotBeforeUpdate = c;
                }
                break;
              case 3:
                var f = t.stateNode.containerInfo;
                f.nodeType === 1 ? f.textContent = "" : f.nodeType === 9 && f.documentElement && f.removeChild(f.documentElement);
                break;
              case 5:
              case 6:
              case 4:
              case 17:
                break;
              default:
                throw Error(_(163));
            }
        } catch (y) {
          ie(t, t.return, y);
        }
        if (e = t.sibling, e !== null) {
          e.return = t.return, N = e;
          break;
        }
        N = t.return;
      }
  return g = xc, xc = !1, g;
}
function Mr(e, t, n) {
  var r = t.updateQueue;
  if (r = r !== null ? r.lastEffect : null, r !== null) {
    var i = r = r.next;
    do {
      if ((i.tag & e) === e) {
        var o = i.destroy;
        i.destroy = void 0, o !== void 0 && Ks(t, n, o);
      }
      i = i.next;
    } while (i !== r);
  }
}
function dl(e, t) {
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
function Ys(e) {
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
function hp(e) {
  var t = e.alternate;
  t !== null && (e.alternate = null, hp(t)), e.child = null, e.deletions = null, e.sibling = null, e.tag === 5 && (t = e.stateNode, t !== null && (delete t[mt], delete t[si], delete t[js], delete t[Kv], delete t[Yv])), e.stateNode = null, e.return = null, e.dependencies = null, e.memoizedProps = null, e.memoizedState = null, e.pendingProps = null, e.stateNode = null, e.updateQueue = null;
}
function mp(e) {
  return e.tag === 5 || e.tag === 3 || e.tag === 4;
}
function Sc(e) {
  e:
    for (; ; ) {
      for (; e.sibling === null; ) {
        if (e.return === null || mp(e.return))
          return null;
        e = e.return;
      }
      for (e.sibling.return = e.return, e = e.sibling; e.tag !== 5 && e.tag !== 6 && e.tag !== 18; ) {
        if (e.flags & 2 || e.child === null || e.tag === 4)
          continue e;
        e.child.return = e, e = e.child;
      }
      if (!(e.flags & 2))
        return e.stateNode;
    }
}
function Gs(e, t, n) {
  var r = e.tag;
  if (r === 5 || r === 6)
    e = e.stateNode, t ? n.nodeType === 8 ? n.parentNode.insertBefore(e, t) : n.insertBefore(e, t) : (n.nodeType === 8 ? (t = n.parentNode, t.insertBefore(e, n)) : (t = n, t.appendChild(e)), n = n._reactRootContainer, n != null || t.onclick !== null || (t.onclick = Co));
  else if (r !== 4 && (e = e.child, e !== null))
    for (Gs(e, t, n), e = e.sibling; e !== null; )
      Gs(e, t, n), e = e.sibling;
}
function Xs(e, t, n) {
  var r = e.tag;
  if (r === 5 || r === 6)
    e = e.stateNode, t ? n.insertBefore(e, t) : n.appendChild(e);
  else if (r !== 4 && (e = e.child, e !== null))
    for (Xs(e, t, n), e = e.sibling; e !== null; )
      Xs(e, t, n), e = e.sibling;
}
var ye = null, nt = !1;
function zt(e, t, n) {
  for (n = n.child; n !== null; )
    vp(e, t, n), n = n.sibling;
}
function vp(e, t, n) {
  if (yt && typeof yt.onCommitFiberUnmount == "function")
    try {
      yt.onCommitFiberUnmount(rl, n);
    } catch {
    }
  switch (n.tag) {
    case 5:
      Ce || Vn(n, t);
    case 6:
      var r = ye, i = nt;
      ye = null, zt(e, t, n), ye = r, nt = i, ye !== null && (nt ? (e = ye, n = n.stateNode, e.nodeType === 8 ? e.parentNode.removeChild(n) : e.removeChild(n)) : ye.removeChild(n.stateNode));
      break;
    case 18:
      ye !== null && (nt ? (e = ye, n = n.stateNode, e.nodeType === 8 ? Fl(e.parentNode, n) : e.nodeType === 1 && Fl(e, n), ni(e)) : Fl(ye, n.stateNode));
      break;
    case 4:
      r = ye, i = nt, ye = n.stateNode.containerInfo, nt = !0, zt(e, t, n), ye = r, nt = i;
      break;
    case 0:
    case 11:
    case 14:
    case 15:
      if (!Ce && (r = n.updateQueue, r !== null && (r = r.lastEffect, r !== null))) {
        i = r = r.next;
        do {
          var o = i, l = o.destroy;
          o = o.tag, l !== void 0 && (o & 2 || o & 4) && Ks(n, t, l), i = i.next;
        } while (i !== r);
      }
      zt(e, t, n);
      break;
    case 1:
      if (!Ce && (Vn(n, t), r = n.stateNode, typeof r.componentWillUnmount == "function"))
        try {
          r.props = n.memoizedProps, r.state = n.memoizedState, r.componentWillUnmount();
        } catch (s) {
          ie(n, t, s);
        }
      zt(e, t, n);
      break;
    case 21:
      zt(e, t, n);
      break;
    case 22:
      n.mode & 1 ? (Ce = (r = Ce) || n.memoizedState !== null, zt(e, t, n), Ce = r) : zt(e, t, n);
      break;
    default:
      zt(e, t, n);
  }
}
function Cc(e) {
  var t = e.updateQueue;
  if (t !== null) {
    e.updateQueue = null;
    var n = e.stateNode;
    n === null && (n = e.stateNode = new d0()), t.forEach(function(r) {
      var i = k0.bind(null, e, r);
      n.has(r) || (n.add(r), r.then(i, i));
    });
  }
}
function et(e, t) {
  var n = t.deletions;
  if (n !== null)
    for (var r = 0; r < n.length; r++) {
      var i = n[r];
      try {
        var o = e, l = t, s = l;
        e:
          for (; s !== null; ) {
            switch (s.tag) {
              case 5:
                ye = s.stateNode, nt = !1;
                break e;
              case 3:
                ye = s.stateNode.containerInfo, nt = !0;
                break e;
              case 4:
                ye = s.stateNode.containerInfo, nt = !0;
                break e;
            }
            s = s.return;
          }
        if (ye === null)
          throw Error(_(160));
        vp(o, l, i), ye = null, nt = !1;
        var a = i.alternate;
        a !== null && (a.return = null), i.return = null;
      } catch (u) {
        ie(i, t, u);
      }
    }
  if (t.subtreeFlags & 12854)
    for (t = t.child; t !== null; )
      yp(t, e), t = t.sibling;
}
function yp(e, t) {
  var n = e.alternate, r = e.flags;
  switch (e.tag) {
    case 0:
    case 11:
    case 14:
    case 15:
      if (et(t, e), dt(e), r & 4) {
        try {
          Mr(3, e, e.return), dl(3, e);
        } catch (v) {
          ie(e, e.return, v);
        }
        try {
          Mr(5, e, e.return);
        } catch (v) {
          ie(e, e.return, v);
        }
      }
      break;
    case 1:
      et(t, e), dt(e), r & 512 && n !== null && Vn(n, n.return);
      break;
    case 5:
      if (et(t, e), dt(e), r & 512 && n !== null && Vn(n, n.return), e.flags & 32) {
        var i = e.stateNode;
        try {
          Jr(i, "");
        } catch (v) {
          ie(e, e.return, v);
        }
      }
      if (r & 4 && (i = e.stateNode, i != null)) {
        var o = e.memoizedProps, l = n !== null ? n.memoizedProps : o, s = e.type, a = e.updateQueue;
        if (e.updateQueue = null, a !== null)
          try {
            s === "input" && o.type === "radio" && o.name != null && $d(i, o), ks(s, l);
            var u = ks(s, o);
            for (l = 0; l < a.length; l += 2) {
              var p = a[l], h = a[l + 1];
              p === "style" ? Fd(i, h) : p === "dangerouslySetInnerHTML" ? Vd(i, h) : p === "children" ? Jr(i, h) : ga(i, p, h, u);
            }
            switch (s) {
              case "input":
                vs(i, o);
                break;
              case "textarea":
                Dd(i, o);
                break;
              case "select":
                var m = i._wrapperState.wasMultiple;
                i._wrapperState.wasMultiple = !!o.multiple;
                var w = o.value;
                w != null ? Wn(i, !!o.multiple, w, !1) : m !== !!o.multiple && (o.defaultValue != null ? Wn(
                  i,
                  !!o.multiple,
                  o.defaultValue,
                  !0
                ) : Wn(i, !!o.multiple, o.multiple ? [] : "", !1));
            }
            i[si] = o;
          } catch (v) {
            ie(e, e.return, v);
          }
      }
      break;
    case 6:
      if (et(t, e), dt(e), r & 4) {
        if (e.stateNode === null)
          throw Error(_(162));
        i = e.stateNode, o = e.memoizedProps;
        try {
          i.nodeValue = o;
        } catch (v) {
          ie(e, e.return, v);
        }
      }
      break;
    case 3:
      if (et(t, e), dt(e), r & 4 && n !== null && n.memoizedState.isDehydrated)
        try {
          ni(t.containerInfo);
        } catch (v) {
          ie(e, e.return, v);
        }
      break;
    case 4:
      et(t, e), dt(e);
      break;
    case 13:
      et(t, e), dt(e), i = e.child, i.flags & 8192 && (o = i.memoizedState !== null, i.stateNode.isHidden = o, !o || i.alternate !== null && i.alternate.memoizedState !== null || (Xa = se())), r & 4 && Cc(e);
      break;
    case 22:
      if (p = n !== null && n.memoizedState !== null, e.mode & 1 ? (Ce = (u = Ce) || p, et(t, e), Ce = u) : et(t, e), dt(e), r & 8192) {
        if (u = e.memoizedState !== null, (e.stateNode.isHidden = u) && !p && e.mode & 1)
          for (N = e, p = e.child; p !== null; ) {
            for (h = N = p; N !== null; ) {
              switch (m = N, w = m.child, m.tag) {
                case 0:
                case 11:
                case 14:
                case 15:
                  Mr(4, m, m.return);
                  break;
                case 1:
                  Vn(m, m.return);
                  var g = m.stateNode;
                  if (typeof g.componentWillUnmount == "function") {
                    r = m, n = m.return;
                    try {
                      t = r, g.props = t.memoizedProps, g.state = t.memoizedState, g.componentWillUnmount();
                    } catch (v) {
                      ie(r, n, v);
                    }
                  }
                  break;
                case 5:
                  Vn(m, m.return);
                  break;
                case 22:
                  if (m.memoizedState !== null) {
                    Tc(h);
                    continue;
                  }
              }
              w !== null ? (w.return = m, N = w) : Tc(h);
            }
            p = p.sibling;
          }
        e:
          for (p = null, h = e; ; ) {
            if (h.tag === 5) {
              if (p === null) {
                p = h;
                try {
                  i = h.stateNode, u ? (o = i.style, typeof o.setProperty == "function" ? o.setProperty("display", "none", "important") : o.display = "none") : (s = h.stateNode, a = h.memoizedProps.style, l = a != null && a.hasOwnProperty("display") ? a.display : null, s.style.display = Ud("display", l));
                } catch (v) {
                  ie(e, e.return, v);
                }
              }
            } else if (h.tag === 6) {
              if (p === null)
                try {
                  h.stateNode.nodeValue = u ? "" : h.memoizedProps;
                } catch (v) {
                  ie(e, e.return, v);
                }
            } else if ((h.tag !== 22 && h.tag !== 23 || h.memoizedState === null || h === e) && h.child !== null) {
              h.child.return = h, h = h.child;
              continue;
            }
            if (h === e)
              break e;
            for (; h.sibling === null; ) {
              if (h.return === null || h.return === e)
                break e;
              p === h && (p = null), h = h.return;
            }
            p === h && (p = null), h.sibling.return = h.return, h = h.sibling;
          }
      }
      break;
    case 19:
      et(t, e), dt(e), r & 4 && Cc(e);
      break;
    case 21:
      break;
    default:
      et(
        t,
        e
      ), dt(e);
  }
}
function dt(e) {
  var t = e.flags;
  if (t & 2) {
    try {
      e: {
        for (var n = e.return; n !== null; ) {
          if (mp(n)) {
            var r = n;
            break e;
          }
          n = n.return;
        }
        throw Error(_(160));
      }
      switch (r.tag) {
        case 5:
          var i = r.stateNode;
          r.flags & 32 && (Jr(i, ""), r.flags &= -33);
          var o = Sc(e);
          Xs(e, o, i);
          break;
        case 3:
        case 4:
          var l = r.stateNode.containerInfo, s = Sc(e);
          Gs(e, s, l);
          break;
        default:
          throw Error(_(161));
      }
    } catch (a) {
      ie(e, e.return, a);
    }
    e.flags &= -3;
  }
  t & 4096 && (e.flags &= -4097);
}
function p0(e, t, n) {
  N = e, gp(e);
}
function gp(e, t, n) {
  for (var r = (e.mode & 1) !== 0; N !== null; ) {
    var i = N, o = i.child;
    if (i.tag === 22 && r) {
      var l = i.memoizedState !== null || Zi;
      if (!l) {
        var s = i.alternate, a = s !== null && s.memoizedState !== null || Ce;
        s = Zi;
        var u = Ce;
        if (Zi = l, (Ce = a) && !u)
          for (N = i; N !== null; )
            l = N, a = l.child, l.tag === 22 && l.memoizedState !== null ? Nc(i) : a !== null ? (a.return = l, N = a) : Nc(i);
        for (; o !== null; )
          N = o, gp(o), o = o.sibling;
        N = i, Zi = s, Ce = u;
      }
      Ec(e);
    } else
      i.subtreeFlags & 8772 && o !== null ? (o.return = i, N = o) : Ec(e);
  }
}
function Ec(e) {
  for (; N !== null; ) {
    var t = N;
    if (t.flags & 8772) {
      var n = t.alternate;
      try {
        if (t.flags & 8772)
          switch (t.tag) {
            case 0:
            case 11:
            case 15:
              Ce || dl(5, t);
              break;
            case 1:
              var r = t.stateNode;
              if (t.flags & 4 && !Ce)
                if (n === null)
                  r.componentDidMount();
                else {
                  var i = t.elementType === t.type ? n.memoizedProps : tt(t.type, n.memoizedProps);
                  r.componentDidUpdate(i, n.memoizedState, r.__reactInternalSnapshotBeforeUpdate);
                }
              var o = t.updateQueue;
              o !== null && ac(t, o, r);
              break;
            case 3:
              var l = t.updateQueue;
              if (l !== null) {
                if (n = null, t.child !== null)
                  switch (t.child.tag) {
                    case 5:
                      n = t.child.stateNode;
                      break;
                    case 1:
                      n = t.child.stateNode;
                  }
                ac(t, l, n);
              }
              break;
            case 5:
              var s = t.stateNode;
              if (n === null && t.flags & 4) {
                n = s;
                var a = t.memoizedProps;
                switch (t.type) {
                  case "button":
                  case "input":
                  case "select":
                  case "textarea":
                    a.autoFocus && n.focus();
                    break;
                  case "img":
                    a.src && (n.src = a.src);
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
                var u = t.alternate;
                if (u !== null) {
                  var p = u.memoizedState;
                  if (p !== null) {
                    var h = p.dehydrated;
                    h !== null && ni(h);
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
              throw Error(_(163));
          }
        Ce || t.flags & 512 && Ys(t);
      } catch (m) {
        ie(t, t.return, m);
      }
    }
    if (t === e) {
      N = null;
      break;
    }
    if (n = t.sibling, n !== null) {
      n.return = t.return, N = n;
      break;
    }
    N = t.return;
  }
}
function Tc(e) {
  for (; N !== null; ) {
    var t = N;
    if (t === e) {
      N = null;
      break;
    }
    var n = t.sibling;
    if (n !== null) {
      n.return = t.return, N = n;
      break;
    }
    N = t.return;
  }
}
function Nc(e) {
  for (; N !== null; ) {
    var t = N;
    try {
      switch (t.tag) {
        case 0:
        case 11:
        case 15:
          var n = t.return;
          try {
            dl(4, t);
          } catch (a) {
            ie(t, n, a);
          }
          break;
        case 1:
          var r = t.stateNode;
          if (typeof r.componentDidMount == "function") {
            var i = t.return;
            try {
              r.componentDidMount();
            } catch (a) {
              ie(t, i, a);
            }
          }
          var o = t.return;
          try {
            Ys(t);
          } catch (a) {
            ie(t, o, a);
          }
          break;
        case 5:
          var l = t.return;
          try {
            Ys(t);
          } catch (a) {
            ie(t, l, a);
          }
      }
    } catch (a) {
      ie(t, t.return, a);
    }
    if (t === e) {
      N = null;
      break;
    }
    var s = t.sibling;
    if (s !== null) {
      s.return = t.return, N = s;
      break;
    }
    N = t.return;
  }
}
var h0 = Math.ceil, jo = Lt.ReactCurrentDispatcher, Ya = Lt.ReactCurrentOwner, Ge = Lt.ReactCurrentBatchConfig, U = 0, he = null, ue = null, we = 0, Ze = 0, Un = nn(0), de = 0, pi = null, Cn = 0, fl = 0, Ga = 0, Ir = null, Le = null, Xa = 0, or = 1 / 0, kt = null, Ao = !1, Js = null, qt = null, Vi = !1, Ut = null, $o = 0, Lr = 0, bs = null, to = -1, no = 0;
function Oe() {
  return U & 6 ? se() : to !== -1 ? to : to = se();
}
function Kt(e) {
  return e.mode & 1 ? U & 2 && we !== 0 ? we & -we : Xv.transition !== null ? (no === 0 && (no = ef()), no) : (e = Q, e !== 0 || (e = window.event, e = e === void 0 ? 16 : af(e.type)), e) : 1;
}
function at(e, t, n, r) {
  if (50 < Lr)
    throw Lr = 0, bs = null, Error(_(185));
  gi(e, n, r), (!(U & 2) || e !== he) && (e === he && (!(U & 2) && (fl |= n), de === 4 && Zt(e, we)), $e(e, r), n === 1 && U === 0 && !(t.mode & 1) && (or = se() + 500, al && rn()));
}
function $e(e, t) {
  var n = e.callbackNode;
  X1(e, t);
  var r = _o(e, e === he ? we : 0);
  if (r === 0)
    n !== null && Au(n), e.callbackNode = null, e.callbackPriority = 0;
  else if (t = r & -r, e.callbackPriority !== t) {
    if (n != null && Au(n), t === 1)
      e.tag === 0 ? Gv(Pc.bind(null, e)) : Nf(Pc.bind(null, e)), Qv(function() {
        !(U & 6) && rn();
      }), n = null;
    else {
      switch (tf(r)) {
        case 1:
          n = Sa;
          break;
        case 4:
          n = Jd;
          break;
        case 16:
          n = wo;
          break;
        case 536870912:
          n = bd;
          break;
        default:
          n = wo;
      }
      n = Tp(n, wp.bind(null, e));
    }
    e.callbackPriority = t, e.callbackNode = n;
  }
}
function wp(e, t) {
  if (to = -1, no = 0, U & 6)
    throw Error(_(327));
  var n = e.callbackNode;
  if (Yn() && e.callbackNode !== n)
    return null;
  var r = _o(e, e === he ? we : 0);
  if (r === 0)
    return null;
  if (r & 30 || r & e.expiredLanes || t)
    t = Do(e, r);
  else {
    t = r;
    var i = U;
    U |= 2;
    var o = kp();
    (he !== e || we !== t) && (kt = null, or = se() + 500, vn(e, t));
    do
      try {
        y0();
        break;
      } catch (s) {
        _p(e, s);
      }
    while (1);
    Aa(), jo.current = o, U = i, ue !== null ? t = 0 : (he = null, we = 0, t = de);
  }
  if (t !== 0) {
    if (t === 2 && (i = Ts(e), i !== 0 && (r = i, t = ea(e, i))), t === 1)
      throw n = pi, vn(e, 0), Zt(e, r), $e(e, se()), n;
    if (t === 6)
      Zt(e, r);
    else {
      if (i = e.current.alternate, !(r & 30) && !m0(i) && (t = Do(e, r), t === 2 && (o = Ts(e), o !== 0 && (r = o, t = ea(e, o))), t === 1))
        throw n = pi, vn(e, 0), Zt(e, r), $e(e, se()), n;
      switch (e.finishedWork = i, e.finishedLanes = r, t) {
        case 0:
        case 1:
          throw Error(_(345));
        case 2:
          an(e, Le, kt);
          break;
        case 3:
          if (Zt(e, r), (r & 130023424) === r && (t = Xa + 500 - se(), 10 < t)) {
            if (_o(e, 0) !== 0)
              break;
            if (i = e.suspendedLanes, (i & r) !== r) {
              Oe(), e.pingedLanes |= e.suspendedLanes & i;
              break;
            }
            e.timeoutHandle = zs(an.bind(null, e, Le, kt), t);
            break;
          }
          an(e, Le, kt);
          break;
        case 4:
          if (Zt(e, r), (r & 4194240) === r)
            break;
          for (t = e.eventTimes, i = -1; 0 < r; ) {
            var l = 31 - st(r);
            o = 1 << l, l = t[l], l > i && (i = l), r &= ~o;
          }
          if (r = i, r = se() - r, r = (120 > r ? 120 : 480 > r ? 480 : 1080 > r ? 1080 : 1920 > r ? 1920 : 3e3 > r ? 3e3 : 4320 > r ? 4320 : 1960 * h0(r / 1960)) - r, 10 < r) {
            e.timeoutHandle = zs(an.bind(null, e, Le, kt), r);
            break;
          }
          an(e, Le, kt);
          break;
        case 5:
          an(e, Le, kt);
          break;
        default:
          throw Error(_(329));
      }
    }
  }
  return $e(e, se()), e.callbackNode === n ? wp.bind(null, e) : null;
}
function ea(e, t) {
  var n = Ir;
  return e.current.memoizedState.isDehydrated && (vn(e, t).flags |= 256), e = Do(e, t), e !== 2 && (t = Le, Le = n, t !== null && ta(t)), e;
}
function ta(e) {
  Le === null ? Le = e : Le.push.apply(Le, e);
}
function m0(e) {
  for (var t = e; ; ) {
    if (t.flags & 16384) {
      var n = t.updateQueue;
      if (n !== null && (n = n.stores, n !== null))
        for (var r = 0; r < n.length; r++) {
          var i = n[r], o = i.getSnapshot;
          i = i.value;
          try {
            if (!ct(o(), i))
              return !1;
          } catch {
            return !1;
          }
        }
    }
    if (n = t.child, t.subtreeFlags & 16384 && n !== null)
      n.return = t, t = n;
    else {
      if (t === e)
        break;
      for (; t.sibling === null; ) {
        if (t.return === null || t.return === e)
          return !0;
        t = t.return;
      }
      t.sibling.return = t.return, t = t.sibling;
    }
  }
  return !0;
}
function Zt(e, t) {
  for (t &= ~Ga, t &= ~fl, e.suspendedLanes |= t, e.pingedLanes &= ~t, e = e.expirationTimes; 0 < t; ) {
    var n = 31 - st(t), r = 1 << n;
    e[n] = -1, t &= ~r;
  }
}
function Pc(e) {
  if (U & 6)
    throw Error(_(327));
  Yn();
  var t = _o(e, 0);
  if (!(t & 1))
    return $e(e, se()), null;
  var n = Do(e, t);
  if (e.tag !== 0 && n === 2) {
    var r = Ts(e);
    r !== 0 && (t = r, n = ea(e, r));
  }
  if (n === 1)
    throw n = pi, vn(e, 0), Zt(e, t), $e(e, se()), n;
  if (n === 6)
    throw Error(_(345));
  return e.finishedWork = e.current.alternate, e.finishedLanes = t, an(e, Le, kt), $e(e, se()), null;
}
function Ja(e, t) {
  var n = U;
  U |= 1;
  try {
    return e(t);
  } finally {
    U = n, U === 0 && (or = se() + 500, al && rn());
  }
}
function En(e) {
  Ut !== null && Ut.tag === 0 && !(U & 6) && Yn();
  var t = U;
  U |= 1;
  var n = Ge.transition, r = Q;
  try {
    if (Ge.transition = null, Q = 1, e)
      return e();
  } finally {
    Q = r, Ge.transition = n, U = t, !(U & 6) && rn();
  }
}
function ba() {
  Ze = Un.current, J(Un);
}
function vn(e, t) {
  e.finishedWork = null, e.finishedLanes = 0;
  var n = e.timeoutHandle;
  if (n !== -1 && (e.timeoutHandle = -1, Hv(n)), ue !== null)
    for (n = ue.return; n !== null; ) {
      var r = n;
      switch (La(r), r.tag) {
        case 1:
          r = r.type.childContextTypes, r != null && Eo();
          break;
        case 3:
          rr(), J(je), J(Ne), Fa();
          break;
        case 5:
          Ua(r);
          break;
        case 4:
          rr();
          break;
        case 13:
          J(te);
          break;
        case 19:
          J(te);
          break;
        case 10:
          $a(r.type._context);
          break;
        case 22:
        case 23:
          ba();
      }
      n = n.return;
    }
  if (he = e, ue = e = Yt(e.current, null), we = Ze = t, de = 0, pi = null, Ga = fl = Cn = 0, Le = Ir = null, fn !== null) {
    for (t = 0; t < fn.length; t++)
      if (n = fn[t], r = n.interleaved, r !== null) {
        n.interleaved = null;
        var i = r.next, o = n.pending;
        if (o !== null) {
          var l = o.next;
          o.next = i, r.next = l;
        }
        n.pending = r;
      }
    fn = null;
  }
  return e;
}
function _p(e, t) {
  do {
    var n = ue;
    try {
      if (Aa(), Ji.current = zo, Lo) {
        for (var r = ne.memoizedState; r !== null; ) {
          var i = r.queue;
          i !== null && (i.pending = null), r = r.next;
        }
        Lo = !1;
      }
      if (Sn = 0, pe = ce = ne = null, Rr = !1, ci = 0, Ya.current = null, n === null || n.return === null) {
        de = 1, pi = t, ue = null;
        break;
      }
      e: {
        var o = e, l = n.return, s = n, a = t;
        if (t = we, s.flags |= 32768, a !== null && typeof a == "object" && typeof a.then == "function") {
          var u = a, p = s, h = p.tag;
          if (!(p.mode & 1) && (h === 0 || h === 11 || h === 15)) {
            var m = p.alternate;
            m ? (p.updateQueue = m.updateQueue, p.memoizedState = m.memoizedState, p.lanes = m.lanes) : (p.updateQueue = null, p.memoizedState = null);
          }
          var w = mc(l);
          if (w !== null) {
            w.flags &= -257, vc(w, l, s, o, t), w.mode & 1 && hc(o, u, t), t = w, a = u;
            var g = t.updateQueue;
            if (g === null) {
              var v = /* @__PURE__ */ new Set();
              v.add(a), t.updateQueue = v;
            } else
              g.add(a);
            break e;
          } else {
            if (!(t & 1)) {
              hc(o, u, t), eu();
              break e;
            }
            a = Error(_(426));
          }
        } else if (b && s.mode & 1) {
          var I = mc(l);
          if (I !== null) {
            !(I.flags & 65536) && (I.flags |= 256), vc(I, l, s, o, t), za(ir(a, s));
            break e;
          }
        }
        o = a = ir(a, s), de !== 4 && (de = 2), Ir === null ? Ir = [o] : Ir.push(o), o = l;
        do {
          switch (o.tag) {
            case 3:
              o.flags |= 65536, t &= -t, o.lanes |= t;
              var d = rp(o, a, t);
              sc(o, d);
              break e;
            case 1:
              s = a;
              var c = o.type, f = o.stateNode;
              if (!(o.flags & 128) && (typeof c.getDerivedStateFromError == "function" || f !== null && typeof f.componentDidCatch == "function" && (qt === null || !qt.has(f)))) {
                o.flags |= 65536, t &= -t, o.lanes |= t;
                var y = ip(o, s, t);
                sc(o, y);
                break e;
              }
          }
          o = o.return;
        } while (o !== null);
      }
      Sp(n);
    } catch (S) {
      t = S, ue === n && n !== null && (ue = n = n.return);
      continue;
    }
    break;
  } while (1);
}
function kp() {
  var e = jo.current;
  return jo.current = zo, e === null ? zo : e;
}
function eu() {
  (de === 0 || de === 3 || de === 2) && (de = 4), he === null || !(Cn & 268435455) && !(fl & 268435455) || Zt(he, we);
}
function Do(e, t) {
  var n = U;
  U |= 2;
  var r = kp();
  (he !== e || we !== t) && (kt = null, vn(e, t));
  do
    try {
      v0();
      break;
    } catch (i) {
      _p(e, i);
    }
  while (1);
  if (Aa(), U = n, jo.current = r, ue !== null)
    throw Error(_(261));
  return he = null, we = 0, de;
}
function v0() {
  for (; ue !== null; )
    xp(ue);
}
function y0() {
  for (; ue !== null && !F1(); )
    xp(ue);
}
function xp(e) {
  var t = Ep(e.alternate, e, Ze);
  e.memoizedProps = e.pendingProps, t === null ? Sp(e) : ue = t, Ya.current = null;
}
function Sp(e) {
  var t = e;
  do {
    var n = t.alternate;
    if (e = t.return, t.flags & 32768) {
      if (n = c0(n, t), n !== null) {
        n.flags &= 32767, ue = n;
        return;
      }
      if (e !== null)
        e.flags |= 32768, e.subtreeFlags = 0, e.deletions = null;
      else {
        de = 6, ue = null;
        return;
      }
    } else if (n = u0(n, t, Ze), n !== null) {
      ue = n;
      return;
    }
    if (t = t.sibling, t !== null) {
      ue = t;
      return;
    }
    ue = t = e;
  } while (t !== null);
  de === 0 && (de = 5);
}
function an(e, t, n) {
  var r = Q, i = Ge.transition;
  try {
    Ge.transition = null, Q = 1, g0(e, t, n, r);
  } finally {
    Ge.transition = i, Q = r;
  }
  return null;
}
function g0(e, t, n, r) {
  do
    Yn();
  while (Ut !== null);
  if (U & 6)
    throw Error(_(327));
  n = e.finishedWork;
  var i = e.finishedLanes;
  if (n === null)
    return null;
  if (e.finishedWork = null, e.finishedLanes = 0, n === e.current)
    throw Error(_(177));
  e.callbackNode = null, e.callbackPriority = 0;
  var o = n.lanes | n.childLanes;
  if (J1(e, o), e === he && (ue = he = null, we = 0), !(n.subtreeFlags & 2064) && !(n.flags & 2064) || Vi || (Vi = !0, Tp(wo, function() {
    return Yn(), null;
  })), o = (n.flags & 15990) !== 0, n.subtreeFlags & 15990 || o) {
    o = Ge.transition, Ge.transition = null;
    var l = Q;
    Q = 1;
    var s = U;
    U |= 4, Ya.current = null, f0(e, n), yp(n, e), Dv(Is), ko = !!Ms, Is = Ms = null, e.current = n, p0(n), B1(), U = s, Q = l, Ge.transition = o;
  } else
    e.current = n;
  if (Vi && (Vi = !1, Ut = e, $o = i), o = e.pendingLanes, o === 0 && (qt = null), Q1(n.stateNode), $e(e, se()), t !== null)
    for (r = e.onRecoverableError, n = 0; n < t.length; n++)
      i = t[n], r(i.value, { componentStack: i.stack, digest: i.digest });
  if (Ao)
    throw Ao = !1, e = Js, Js = null, e;
  return $o & 1 && e.tag !== 0 && Yn(), o = e.pendingLanes, o & 1 ? e === bs ? Lr++ : (Lr = 0, bs = e) : Lr = 0, rn(), null;
}
function Yn() {
  if (Ut !== null) {
    var e = tf($o), t = Ge.transition, n = Q;
    try {
      if (Ge.transition = null, Q = 16 > e ? 16 : e, Ut === null)
        var r = !1;
      else {
        if (e = Ut, Ut = null, $o = 0, U & 6)
          throw Error(_(331));
        var i = U;
        for (U |= 4, N = e.current; N !== null; ) {
          var o = N, l = o.child;
          if (N.flags & 16) {
            var s = o.deletions;
            if (s !== null) {
              for (var a = 0; a < s.length; a++) {
                var u = s[a];
                for (N = u; N !== null; ) {
                  var p = N;
                  switch (p.tag) {
                    case 0:
                    case 11:
                    case 15:
                      Mr(8, p, o);
                  }
                  var h = p.child;
                  if (h !== null)
                    h.return = p, N = h;
                  else
                    for (; N !== null; ) {
                      p = N;
                      var m = p.sibling, w = p.return;
                      if (hp(p), p === u) {
                        N = null;
                        break;
                      }
                      if (m !== null) {
                        m.return = w, N = m;
                        break;
                      }
                      N = w;
                    }
                }
              }
              var g = o.alternate;
              if (g !== null) {
                var v = g.child;
                if (v !== null) {
                  g.child = null;
                  do {
                    var I = v.sibling;
                    v.sibling = null, v = I;
                  } while (v !== null);
                }
              }
              N = o;
            }
          }
          if (o.subtreeFlags & 2064 && l !== null)
            l.return = o, N = l;
          else
            e:
              for (; N !== null; ) {
                if (o = N, o.flags & 2048)
                  switch (o.tag) {
                    case 0:
                    case 11:
                    case 15:
                      Mr(9, o, o.return);
                  }
                var d = o.sibling;
                if (d !== null) {
                  d.return = o.return, N = d;
                  break e;
                }
                N = o.return;
              }
        }
        var c = e.current;
        for (N = c; N !== null; ) {
          l = N;
          var f = l.child;
          if (l.subtreeFlags & 2064 && f !== null)
            f.return = l, N = f;
          else
            e:
              for (l = c; N !== null; ) {
                if (s = N, s.flags & 2048)
                  try {
                    switch (s.tag) {
                      case 0:
                      case 11:
                      case 15:
                        dl(9, s);
                    }
                  } catch (S) {
                    ie(s, s.return, S);
                  }
                if (s === l) {
                  N = null;
                  break e;
                }
                var y = s.sibling;
                if (y !== null) {
                  y.return = s.return, N = y;
                  break e;
                }
                N = s.return;
              }
        }
        if (U = i, rn(), yt && typeof yt.onPostCommitFiberRoot == "function")
          try {
            yt.onPostCommitFiberRoot(rl, e);
          } catch {
          }
        r = !0;
      }
      return r;
    } finally {
      Q = n, Ge.transition = t;
    }
  }
  return !1;
}
function Oc(e, t, n) {
  t = ir(n, t), t = rp(e, t, 1), e = Qt(e, t, 1), t = Oe(), e !== null && (gi(e, 1, t), $e(e, t));
}
function ie(e, t, n) {
  if (e.tag === 3)
    Oc(e, e, n);
  else
    for (; t !== null; ) {
      if (t.tag === 3) {
        Oc(t, e, n);
        break;
      } else if (t.tag === 1) {
        var r = t.stateNode;
        if (typeof t.type.getDerivedStateFromError == "function" || typeof r.componentDidCatch == "function" && (qt === null || !qt.has(r))) {
          e = ir(n, e), e = ip(t, e, 1), t = Qt(t, e, 1), e = Oe(), t !== null && (gi(t, 1, e), $e(t, e));
          break;
        }
      }
      t = t.return;
    }
}
function w0(e, t, n) {
  var r = e.pingCache;
  r !== null && r.delete(t), t = Oe(), e.pingedLanes |= e.suspendedLanes & n, he === e && (we & n) === n && (de === 4 || de === 3 && (we & 130023424) === we && 500 > se() - Xa ? vn(e, 0) : Ga |= n), $e(e, t);
}
function Cp(e, t) {
  t === 0 && (e.mode & 1 ? (t = Ri, Ri <<= 1, !(Ri & 130023424) && (Ri = 4194304)) : t = 1);
  var n = Oe();
  e = Rt(e, t), e !== null && (gi(e, t, n), $e(e, n));
}
function _0(e) {
  var t = e.memoizedState, n = 0;
  t !== null && (n = t.retryLane), Cp(e, n);
}
function k0(e, t) {
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
      throw Error(_(314));
  }
  r !== null && r.delete(t), Cp(e, n);
}
var Ep;
Ep = function(e, t, n) {
  if (e !== null)
    if (e.memoizedProps !== t.pendingProps || je.current)
      ze = !0;
    else {
      if (!(e.lanes & n) && !(t.flags & 128))
        return ze = !1, a0(e, t, n);
      ze = !!(e.flags & 131072);
    }
  else
    ze = !1, b && t.flags & 1048576 && Pf(t, Po, t.index);
  switch (t.lanes = 0, t.tag) {
    case 2:
      var r = t.type;
      eo(e, t), e = t.pendingProps;
      var i = er(t, Ne.current);
      Kn(t, n), i = Wa(null, t, r, e, i, n);
      var o = Ha();
      return t.flags |= 1, typeof i == "object" && i !== null && typeof i.render == "function" && i.$$typeof === void 0 ? (t.tag = 1, t.memoizedState = null, t.updateQueue = null, Ae(r) ? (o = !0, To(t)) : o = !1, t.memoizedState = i.state !== null && i.state !== void 0 ? i.state : null, Za(t), i.updater = ul, t.stateNode = i, i._reactInternals = t, Us(t, r, e, n), t = Ws(null, t, r, !0, o, n)) : (t.tag = 0, b && o && Ia(t), Pe(null, t, i, n), t = t.child), t;
    case 16:
      r = t.elementType;
      e: {
        switch (eo(e, t), e = t.pendingProps, i = r._init, r = i(r._payload), t.type = r, i = t.tag = S0(r), e = tt(r, e), i) {
          case 0:
            t = Bs(null, t, r, e, n);
            break e;
          case 1:
            t = wc(null, t, r, e, n);
            break e;
          case 11:
            t = yc(null, t, r, e, n);
            break e;
          case 14:
            t = gc(null, t, r, tt(r.type, e), n);
            break e;
        }
        throw Error(_(
          306,
          r,
          ""
        ));
      }
      return t;
    case 0:
      return r = t.type, i = t.pendingProps, i = t.elementType === r ? i : tt(r, i), Bs(e, t, r, i, n);
    case 1:
      return r = t.type, i = t.pendingProps, i = t.elementType === r ? i : tt(r, i), wc(e, t, r, i, n);
    case 3:
      e: {
        if (ap(t), e === null)
          throw Error(_(387));
        r = t.pendingProps, o = t.memoizedState, i = o.element, If(e, t), Mo(t, r, null, n);
        var l = t.memoizedState;
        if (r = l.element, o.isDehydrated)
          if (o = { element: r, isDehydrated: !1, cache: l.cache, pendingSuspenseBoundaries: l.pendingSuspenseBoundaries, transitions: l.transitions }, t.updateQueue.baseState = o, t.memoizedState = o, t.flags & 256) {
            i = ir(Error(_(423)), t), t = _c(e, t, r, n, i);
            break e;
          } else if (r !== i) {
            i = ir(Error(_(424)), t), t = _c(e, t, r, n, i);
            break e;
          } else
            for (Ve = Ht(t.stateNode.containerInfo.firstChild), Fe = t, b = !0, rt = null, n = Af(t, null, r, n), t.child = n; n; )
              n.flags = n.flags & -3 | 4096, n = n.sibling;
        else {
          if (tr(), r === i) {
            t = Mt(e, t, n);
            break e;
          }
          Pe(e, t, r, n);
        }
        t = t.child;
      }
      return t;
    case 5:
      return $f(t), e === null && Ds(t), r = t.type, i = t.pendingProps, o = e !== null ? e.memoizedProps : null, l = i.children, Ls(r, i) ? l = null : o !== null && Ls(r, o) && (t.flags |= 32), sp(e, t), Pe(e, t, l, n), t.child;
    case 6:
      return e === null && Ds(t), null;
    case 13:
      return up(e, t, n);
    case 4:
      return Va(t, t.stateNode.containerInfo), r = t.pendingProps, e === null ? t.child = nr(t, null, r, n) : Pe(e, t, r, n), t.child;
    case 11:
      return r = t.type, i = t.pendingProps, i = t.elementType === r ? i : tt(r, i), yc(e, t, r, i, n);
    case 7:
      return Pe(e, t, t.pendingProps, n), t.child;
    case 8:
      return Pe(e, t, t.pendingProps.children, n), t.child;
    case 12:
      return Pe(e, t, t.pendingProps.children, n), t.child;
    case 10:
      e: {
        if (r = t.type._context, i = t.pendingProps, o = t.memoizedProps, l = i.value, G(Oo, r._currentValue), r._currentValue = l, o !== null)
          if (ct(o.value, l)) {
            if (o.children === i.children && !je.current) {
              t = Mt(e, t, n);
              break e;
            }
          } else
            for (o = t.child, o !== null && (o.return = t); o !== null; ) {
              var s = o.dependencies;
              if (s !== null) {
                l = o.child;
                for (var a = s.firstContext; a !== null; ) {
                  if (a.context === r) {
                    if (o.tag === 1) {
                      a = Tt(-1, n & -n), a.tag = 2;
                      var u = o.updateQueue;
                      if (u !== null) {
                        u = u.shared;
                        var p = u.pending;
                        p === null ? a.next = a : (a.next = p.next, p.next = a), u.pending = a;
                      }
                    }
                    o.lanes |= n, a = o.alternate, a !== null && (a.lanes |= n), Zs(
                      o.return,
                      n,
                      t
                    ), s.lanes |= n;
                    break;
                  }
                  a = a.next;
                }
              } else if (o.tag === 10)
                l = o.type === t.type ? null : o.child;
              else if (o.tag === 18) {
                if (l = o.return, l === null)
                  throw Error(_(341));
                l.lanes |= n, s = l.alternate, s !== null && (s.lanes |= n), Zs(l, n, t), l = o.sibling;
              } else
                l = o.child;
              if (l !== null)
                l.return = o;
              else
                for (l = o; l !== null; ) {
                  if (l === t) {
                    l = null;
                    break;
                  }
                  if (o = l.sibling, o !== null) {
                    o.return = l.return, l = o;
                    break;
                  }
                  l = l.return;
                }
              o = l;
            }
        Pe(e, t, i.children, n), t = t.child;
      }
      return t;
    case 9:
      return i = t.type, r = t.pendingProps.children, Kn(t, n), i = Xe(i), r = r(i), t.flags |= 1, Pe(e, t, r, n), t.child;
    case 14:
      return r = t.type, i = tt(r, t.pendingProps), i = tt(r.type, i), gc(e, t, r, i, n);
    case 15:
      return op(e, t, t.type, t.pendingProps, n);
    case 17:
      return r = t.type, i = t.pendingProps, i = t.elementType === r ? i : tt(r, i), eo(e, t), t.tag = 1, Ae(r) ? (e = !0, To(t)) : e = !1, Kn(t, n), zf(t, r, i), Us(t, r, i, n), Ws(null, t, r, !0, e, n);
    case 19:
      return cp(e, t, n);
    case 22:
      return lp(e, t, n);
  }
  throw Error(_(156, t.tag));
};
function Tp(e, t) {
  return Xd(e, t);
}
function x0(e, t, n, r) {
  this.tag = e, this.key = n, this.sibling = this.child = this.return = this.stateNode = this.type = this.elementType = null, this.index = 0, this.ref = null, this.pendingProps = t, this.dependencies = this.memoizedState = this.updateQueue = this.memoizedProps = null, this.mode = r, this.subtreeFlags = this.flags = 0, this.deletions = null, this.childLanes = this.lanes = 0, this.alternate = null;
}
function Ye(e, t, n, r) {
  return new x0(e, t, n, r);
}
function tu(e) {
  return e = e.prototype, !(!e || !e.isReactComponent);
}
function S0(e) {
  if (typeof e == "function")
    return tu(e) ? 1 : 0;
  if (e != null) {
    if (e = e.$$typeof, e === _a)
      return 11;
    if (e === ka)
      return 14;
  }
  return 2;
}
function Yt(e, t) {
  var n = e.alternate;
  return n === null ? (n = Ye(e.tag, t, e.key, e.mode), n.elementType = e.elementType, n.type = e.type, n.stateNode = e.stateNode, n.alternate = e, e.alternate = n) : (n.pendingProps = t, n.type = e.type, n.flags = 0, n.subtreeFlags = 0, n.deletions = null), n.flags = e.flags & 14680064, n.childLanes = e.childLanes, n.lanes = e.lanes, n.child = e.child, n.memoizedProps = e.memoizedProps, n.memoizedState = e.memoizedState, n.updateQueue = e.updateQueue, t = e.dependencies, n.dependencies = t === null ? null : { lanes: t.lanes, firstContext: t.firstContext }, n.sibling = e.sibling, n.index = e.index, n.ref = e.ref, n;
}
function ro(e, t, n, r, i, o) {
  var l = 2;
  if (r = e, typeof e == "function")
    tu(e) && (l = 1);
  else if (typeof e == "string")
    l = 5;
  else
    e:
      switch (e) {
        case Mn:
          return yn(n.children, i, o, t);
        case wa:
          l = 8, i |= 8;
          break;
        case ds:
          return e = Ye(12, n, t, i | 2), e.elementType = ds, e.lanes = o, e;
        case fs:
          return e = Ye(13, n, t, i), e.elementType = fs, e.lanes = o, e;
        case ps:
          return e = Ye(19, n, t, i), e.elementType = ps, e.lanes = o, e;
        case zd:
          return pl(n, i, o, t);
        default:
          if (typeof e == "object" && e !== null)
            switch (e.$$typeof) {
              case Id:
                l = 10;
                break e;
              case Ld:
                l = 9;
                break e;
              case _a:
                l = 11;
                break e;
              case ka:
                l = 14;
                break e;
              case jt:
                l = 16, r = null;
                break e;
            }
          throw Error(_(130, e == null ? e : typeof e, ""));
      }
  return t = Ye(l, n, t, i), t.elementType = e, t.type = r, t.lanes = o, t;
}
function yn(e, t, n, r) {
  return e = Ye(7, e, r, t), e.lanes = n, e;
}
function pl(e, t, n, r) {
  return e = Ye(22, e, r, t), e.elementType = zd, e.lanes = n, e.stateNode = { isHidden: !1 }, e;
}
function Gl(e, t, n) {
  return e = Ye(6, e, null, t), e.lanes = n, e;
}
function Xl(e, t, n) {
  return t = Ye(4, e.children !== null ? e.children : [], e.key, t), t.lanes = n, t.stateNode = { containerInfo: e.containerInfo, pendingChildren: null, implementation: e.implementation }, t;
}
function C0(e, t, n, r, i) {
  this.tag = t, this.containerInfo = e, this.finishedWork = this.pingCache = this.current = this.pendingChildren = null, this.timeoutHandle = -1, this.callbackNode = this.pendingContext = this.context = null, this.callbackPriority = 0, this.eventTimes = Ml(0), this.expirationTimes = Ml(-1), this.entangledLanes = this.finishedLanes = this.mutableReadLanes = this.expiredLanes = this.pingedLanes = this.suspendedLanes = this.pendingLanes = 0, this.entanglements = Ml(0), this.identifierPrefix = r, this.onRecoverableError = i, this.mutableSourceEagerHydrationData = null;
}
function nu(e, t, n, r, i, o, l, s, a) {
  return e = new C0(e, t, n, s, a), t === 1 ? (t = 1, o === !0 && (t |= 8)) : t = 0, o = Ye(3, null, null, t), e.current = o, o.stateNode = e, o.memoizedState = { element: r, isDehydrated: n, cache: null, transitions: null, pendingSuspenseBoundaries: null }, Za(o), e;
}
function E0(e, t, n) {
  var r = 3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
  return { $$typeof: Rn, key: r == null ? null : "" + r, children: e, containerInfo: t, implementation: n };
}
function Np(e) {
  if (!e)
    return en;
  e = e._reactInternals;
  e: {
    if (Nn(e) !== e || e.tag !== 1)
      throw Error(_(170));
    var t = e;
    do {
      switch (t.tag) {
        case 3:
          t = t.stateNode.context;
          break e;
        case 1:
          if (Ae(t.type)) {
            t = t.stateNode.__reactInternalMemoizedMergedChildContext;
            break e;
          }
      }
      t = t.return;
    } while (t !== null);
    throw Error(_(171));
  }
  if (e.tag === 1) {
    var n = e.type;
    if (Ae(n))
      return Tf(e, n, t);
  }
  return t;
}
function Pp(e, t, n, r, i, o, l, s, a) {
  return e = nu(n, r, !0, e, i, o, l, s, a), e.context = Np(null), n = e.current, r = Oe(), i = Kt(n), o = Tt(r, i), o.callback = t ?? null, Qt(n, o, i), e.current.lanes = i, gi(e, i, r), $e(e, r), e;
}
function hl(e, t, n, r) {
  var i = t.current, o = Oe(), l = Kt(i);
  return n = Np(n), t.context === null ? t.context = n : t.pendingContext = n, t = Tt(o, l), t.payload = { element: e }, r = r === void 0 ? null : r, r !== null && (t.callback = r), e = Qt(i, t, l), e !== null && (at(e, i, l, o), Xi(e, i, l)), l;
}
function Zo(e) {
  if (e = e.current, !e.child)
    return null;
  switch (e.child.tag) {
    case 5:
      return e.child.stateNode;
    default:
      return e.child.stateNode;
  }
}
function Rc(e, t) {
  if (e = e.memoizedState, e !== null && e.dehydrated !== null) {
    var n = e.retryLane;
    e.retryLane = n !== 0 && n < t ? n : t;
  }
}
function ru(e, t) {
  Rc(e, t), (e = e.alternate) && Rc(e, t);
}
function T0() {
  return null;
}
var Op = typeof reportError == "function" ? reportError : function(e) {
  console.error(e);
};
function iu(e) {
  this._internalRoot = e;
}
ml.prototype.render = iu.prototype.render = function(e) {
  var t = this._internalRoot;
  if (t === null)
    throw Error(_(409));
  hl(e, t, null, null);
};
ml.prototype.unmount = iu.prototype.unmount = function() {
  var e = this._internalRoot;
  if (e !== null) {
    this._internalRoot = null;
    var t = e.containerInfo;
    En(function() {
      hl(null, e, null, null);
    }), t[Ot] = null;
  }
};
function ml(e) {
  this._internalRoot = e;
}
ml.prototype.unstable_scheduleHydration = function(e) {
  if (e) {
    var t = of();
    e = { blockedOn: null, target: e, priority: t };
    for (var n = 0; n < Dt.length && t !== 0 && t < Dt[n].priority; n++)
      ;
    Dt.splice(n, 0, e), n === 0 && sf(e);
  }
};
function ou(e) {
  return !(!e || e.nodeType !== 1 && e.nodeType !== 9 && e.nodeType !== 11);
}
function vl(e) {
  return !(!e || e.nodeType !== 1 && e.nodeType !== 9 && e.nodeType !== 11 && (e.nodeType !== 8 || e.nodeValue !== " react-mount-point-unstable "));
}
function Mc() {
}
function N0(e, t, n, r, i) {
  if (i) {
    if (typeof r == "function") {
      var o = r;
      r = function() {
        var u = Zo(l);
        o.call(u);
      };
    }
    var l = Pp(t, r, e, 0, null, !1, !1, "", Mc);
    return e._reactRootContainer = l, e[Ot] = l.current, oi(e.nodeType === 8 ? e.parentNode : e), En(), l;
  }
  for (; i = e.lastChild; )
    e.removeChild(i);
  if (typeof r == "function") {
    var s = r;
    r = function() {
      var u = Zo(a);
      s.call(u);
    };
  }
  var a = nu(e, 0, !1, null, null, !1, !1, "", Mc);
  return e._reactRootContainer = a, e[Ot] = a.current, oi(e.nodeType === 8 ? e.parentNode : e), En(function() {
    hl(t, a, n, r);
  }), a;
}
function yl(e, t, n, r, i) {
  var o = n._reactRootContainer;
  if (o) {
    var l = o;
    if (typeof i == "function") {
      var s = i;
      i = function() {
        var a = Zo(l);
        s.call(a);
      };
    }
    hl(t, l, e, i);
  } else
    l = N0(n, t, e, i, r);
  return Zo(l);
}
nf = function(e) {
  switch (e.tag) {
    case 3:
      var t = e.stateNode;
      if (t.current.memoizedState.isDehydrated) {
        var n = Sr(t.pendingLanes);
        n !== 0 && (Ca(t, n | 1), $e(t, se()), !(U & 6) && (or = se() + 500, rn()));
      }
      break;
    case 13:
      En(function() {
        var r = Rt(e, 1);
        if (r !== null) {
          var i = Oe();
          at(r, e, 1, i);
        }
      }), ru(e, 1);
  }
};
Ea = function(e) {
  if (e.tag === 13) {
    var t = Rt(e, 134217728);
    if (t !== null) {
      var n = Oe();
      at(t, e, 134217728, n);
    }
    ru(e, 134217728);
  }
};
rf = function(e) {
  if (e.tag === 13) {
    var t = Kt(e), n = Rt(e, t);
    if (n !== null) {
      var r = Oe();
      at(n, e, t, r);
    }
    ru(e, t);
  }
};
of = function() {
  return Q;
};
lf = function(e, t) {
  var n = Q;
  try {
    return Q = e, t();
  } finally {
    Q = n;
  }
};
Ss = function(e, t, n) {
  switch (t) {
    case "input":
      if (vs(e, n), t = n.name, n.type === "radio" && t != null) {
        for (n = e; n.parentNode; )
          n = n.parentNode;
        for (n = n.querySelectorAll("input[name=" + JSON.stringify("" + t) + '][type="radio"]'), t = 0; t < n.length; t++) {
          var r = n[t];
          if (r !== e && r.form === e.form) {
            var i = sl(r);
            if (!i)
              throw Error(_(90));
            Ad(r), vs(r, i);
          }
        }
      }
      break;
    case "textarea":
      Dd(e, n);
      break;
    case "select":
      t = n.value, t != null && Wn(e, !!n.multiple, t, !1);
  }
};
Hd = Ja;
Qd = En;
var P0 = { usingClientEntryPoint: !1, Events: [_i, jn, sl, Bd, Wd, Ja] }, _r = { findFiberByHostInstance: dn, bundleType: 0, version: "18.2.0", rendererPackageName: "react-dom" }, O0 = { bundleType: _r.bundleType, version: _r.version, rendererPackageName: _r.rendererPackageName, rendererConfig: _r.rendererConfig, overrideHookState: null, overrideHookStateDeletePath: null, overrideHookStateRenamePath: null, overrideProps: null, overridePropsDeletePath: null, overridePropsRenamePath: null, setErrorHandler: null, setSuspenseHandler: null, scheduleUpdate: null, currentDispatcherRef: Lt.ReactCurrentDispatcher, findHostInstanceByFiber: function(e) {
  return e = Yd(e), e === null ? null : e.stateNode;
}, findFiberByHostInstance: _r.findFiberByHostInstance || T0, findHostInstancesForRefresh: null, scheduleRefresh: null, scheduleRoot: null, setRefreshHandler: null, getCurrentFiber: null, reconcilerVersion: "18.2.0-next-9e3b772b8-20220608" };
if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < "u") {
  var Ui = __REACT_DEVTOOLS_GLOBAL_HOOK__;
  if (!Ui.isDisabled && Ui.supportsFiber)
    try {
      rl = Ui.inject(O0), yt = Ui;
    } catch {
    }
}
He.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = P0;
He.createPortal = function(e, t) {
  var n = 2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
  if (!ou(t))
    throw Error(_(200));
  return E0(e, t, null, n);
};
He.createRoot = function(e, t) {
  if (!ou(e))
    throw Error(_(299));
  var n = !1, r = "", i = Op;
  return t != null && (t.unstable_strictMode === !0 && (n = !0), t.identifierPrefix !== void 0 && (r = t.identifierPrefix), t.onRecoverableError !== void 0 && (i = t.onRecoverableError)), t = nu(e, 1, !1, null, null, n, !1, r, i), e[Ot] = t.current, oi(e.nodeType === 8 ? e.parentNode : e), new iu(t);
};
He.findDOMNode = function(e) {
  if (e == null)
    return null;
  if (e.nodeType === 1)
    return e;
  var t = e._reactInternals;
  if (t === void 0)
    throw typeof e.render == "function" ? Error(_(188)) : (e = Object.keys(e).join(","), Error(_(268, e)));
  return e = Yd(t), e = e === null ? null : e.stateNode, e;
};
He.flushSync = function(e) {
  return En(e);
};
He.hydrate = function(e, t, n) {
  if (!vl(t))
    throw Error(_(200));
  return yl(null, e, t, !0, n);
};
He.hydrateRoot = function(e, t, n) {
  if (!ou(e))
    throw Error(_(405));
  var r = n != null && n.hydratedSources || null, i = !1, o = "", l = Op;
  if (n != null && (n.unstable_strictMode === !0 && (i = !0), n.identifierPrefix !== void 0 && (o = n.identifierPrefix), n.onRecoverableError !== void 0 && (l = n.onRecoverableError)), t = Pp(t, null, e, 1, n ?? null, i, !1, o, l), e[Ot] = t.current, oi(e), r)
    for (e = 0; e < r.length; e++)
      n = r[e], i = n._getVersion, i = i(n._source), t.mutableSourceEagerHydrationData == null ? t.mutableSourceEagerHydrationData = [n, i] : t.mutableSourceEagerHydrationData.push(
        n,
        i
      );
  return new ml(t);
};
He.render = function(e, t, n) {
  if (!vl(t))
    throw Error(_(200));
  return yl(null, e, t, !1, n);
};
He.unmountComponentAtNode = function(e) {
  if (!vl(e))
    throw Error(_(40));
  return e._reactRootContainer ? (En(function() {
    yl(null, null, e, !1, function() {
      e._reactRootContainer = null, e[Ot] = null;
    });
  }), !0) : !1;
};
He.unstable_batchedUpdates = Ja;
He.unstable_renderSubtreeIntoContainer = function(e, t, n, r) {
  if (!vl(n))
    throw Error(_(200));
  if (e == null || e._reactInternals === void 0)
    throw Error(_(38));
  return yl(e, t, n, !1, r);
};
He.version = "18.2.0-next-9e3b772b8-20220608";
function Rp() {
  if (!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > "u" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != "function"))
    try {
      __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(Rp);
    } catch (e) {
      console.error(e);
    }
}
Rp(), Nd.exports = He;
var R0 = Nd.exports, Mp, Ic = R0;
Mp = Ic.createRoot, Ic.hydrateRoot;
var Lc;
const Ip = "procaptcha.bundle.js", Lp = () => document.querySelector('script[src*="'.concat(Ip, '"]')), M0 = (e) => {
  const t = Lp();
  if (t && t.src.indexOf("".concat(e)) !== -1) {
    const n = new URLSearchParams(t.src.split("?")[1]);
    return {
      onloadUrlCallback: n.get("onload") || void 0,
      renderExplicit: n.get("render") || void 0
    };
  }
  return { onloadUrlCallback: void 0, renderExplicit: void 0 };
}, zp = (e) => (e || (e = "5HGjWAeFDfFCWPsjFQdVV2Msvz2XtMktvgocEZcCj68kUMaw"), um.parse({
  defaultEnvironment: ho.parse("development"),
  defaultNetwork: mn.parse("development"),
  userAccountAddress: "",
  account: {
    address: e
  },
  serverUrl: "",
  mongoAtlasUri: !1
})), I0 = (e) => e.closest("form"), un = (e) => {
  const t = window[e.replace("window.", "")];
  if (typeof t != "function")
    throw new Error("Callback ".concat(e, " is not defined on the window object"));
  return t;
}, L0 = (e, t) => {
  const n = I0(e);
  if (!n) {
    console.error("Parent form not found for the element:", e);
    return;
  }
  const r = document.createElement("input");
  r.type = "hidden", r.name = Ee.procaptchaResponse, r.value = JSON.stringify(t), n.appendChild(r);
}, z0 = /* @__PURE__ */ new Set(["light", "dark"]), j0 = (e) => z0.has(e) ? e : "light", jp = (e, t, n) => {
  e.forEach((r) => {
    const i = (n == null ? void 0 : n.callback) || r.getAttribute("data-callback"), o = (n == null ? void 0 : n["chalexpired-callback"]) || r.getAttribute("data-chalexpired-callback"), l = (n == null ? void 0 : n["error-callback"]) || r.getAttribute("data-error-callback"), s = (n == null ? void 0 : n["close-callback"]) || r.getAttribute("data-close-callback"), a = (n == null ? void 0 : n["open-callback"]) || r.getAttribute("data-open-callback"), u = (n == null ? void 0 : n["expired-callback"]) || r.getAttribute("data-expired-callback"), p = {
      onHuman: (w) => L0(r, w),
      onChallengeExpired: () => {
      },
      onExpired: () => {
        alert("Completed challenge has expired, please try again");
      },
      onError: (w) => {
        console.error(w);
      },
      onClose: () => {
      },
      onOpen: () => {
      }
    };
    i && (p.onHuman = un(i)), o && (p.onChallengeExpired = un(o)), u && (p.onExpired = un(u)), l && (p.onError = un(l)), s && (p.onClose = un(s)), a && (p.onOpen = un(a));
    const h = (n == null ? void 0 : n.theme) || r.getAttribute("data-theme") || "light";
    t.theme = j0(h);
    const m = (n == null ? void 0 : n["challenge-valid-length"]) || r.getAttribute("data-challenge-valid-length");
    m && (t.challengeValidLength = parseInt(m)), Mp(r).render(/* @__PURE__ */ zr.jsx(T1, { config: t, callbacks: p }));
  });
}, A0 = () => {
  const e = Array.from(document.getElementsByClassName("procaptcha"));
  if (e.length) {
    const t = u1(e, 0).getAttribute("data-sitekey") || void 0, n = zp(t);
    jp(e, n);
  }
}, $0 = (e, t) => {
  const n = t.siteKey, r = zp(n), i = document.getElementById(e);
  if (!i) {
    console.error("Element not found:", e);
    return;
  }
  jp([i], r, t);
};
function lu(e) {
  document && document.readyState !== "loading" ? e() : document.addEventListener("DOMContentLoaded", e);
}
window.procaptcha = { ready: lu, render: $0 };
const { onloadUrlCallback: zc, renderExplicit: D0 } = M0(Ip);
D0 !== "explicit" && lu(A0);
if (zc) {
  const e = un(zc);
  (Lc = Lp()) == null || Lc.addEventListener("load", () => {
    lu(e);
  });
}
export {
  vu as A,
  F0 as C,
  g1 as L,
  Gc as N,
  um as P,
  eh as R,
  Dp as a,
  Tl as b,
  Z0 as c,
  Td as d,
  vi as e,
  u1 as f,
  V0 as g,
  B0 as h,
  f1 as i,
  ve as j,
  $0 as k,
  Ed as l,
  lu as m,
  oe as r,
  U0 as z
};
