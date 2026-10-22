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

//! A Rust replacement for the zod 3.23 schemas that validate JSON: the same accept/reject
//! decisions, the same parsed output (unknown keys stripped, defaults, coercions and
//! transforms applied, keys in schema order) and the same issues. serde then types the
//! output. See MIGRATION.md §4.5 for why request bodies use this rather than bare serde.

mod issue;
mod js;

pub use issue::IssueData;
pub use js::string_to_number;

use crate::validation::{PathSegment, ValidationError, ValidationIssue};
use js::{
    js_keys, js_ordered, js_to_bigint, js_trim, number_value, strictly_equal, to_js_number,
    to_js_string,
};
use serde_json::{Map, Value};
use std::sync::Arc;

/// A value being parsed; `None` is `undefined`.
pub type Data = Option<Value>;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Status {
    Valid,
    Dirty,
    Aborted,
}

#[derive(Debug, Clone)]
struct Outcome {
    status: Status,
    value: Data,
}

impl Outcome {
    fn valid(value: Data) -> Outcome {
        Outcome {
            status: Status::Valid,
            value,
        }
    }

    fn with_status(status: Status, value: Data) -> Outcome {
        Outcome { status, value }
    }

    fn invalid() -> Outcome {
        Outcome {
            status: Status::Aborted,
            value: None,
        }
    }
}

/// `ParseStatus`: valid until an issue makes it dirty or a fatal one aborts it.
#[derive(Debug, Clone, Copy)]
struct ParseStatus(Status);

impl ParseStatus {
    fn new() -> ParseStatus {
        ParseStatus(Status::Valid)
    }

    fn dirty(&mut self) {
        if self.0 == Status::Valid {
            self.0 = Status::Dirty;
        }
    }

    fn abort(&mut self) {
        self.0 = Status::Aborted;
    }
}

#[derive(Debug, Default)]
struct Issues(Vec<Map<String, Value>>);

impl Issues {
    fn add(&mut self, path: &[PathSegment], data: IssueData) {
        self.0.push(data.into_issue(path));
    }
}

/// `ctx` in a `superRefine`, `transform` or `preprocess`.
pub struct RefinementContext<'a> {
    issues: &'a mut Issues,
    status: &'a mut ParseStatus,
    path: &'a [PathSegment],
}

impl RefinementContext<'_> {
    pub fn add_issue(&mut self, data: IssueData) {
        let fatal: bool = data.fatal;
        self.issues.add(self.path, data);
        if fatal {
            self.status.abort();
        } else {
            self.status.dirty();
        }
    }

    pub fn path(&self) -> &[PathSegment] {
        self.path
    }
}

type Refinement = Arc<dyn Fn(&Data, &mut RefinementContext<'_>) + Send + Sync>;
type Transform = Arc<dyn Fn(Data, &mut RefinementContext<'_>) -> Data + Send + Sync>;

#[derive(Clone)]
enum StringCheck {
    Min(usize, Option<String>),
    Max(usize, Option<String>),
    Length(usize, Option<String>),
    Email(Option<String>),
    Url(Option<String>),
    Regex(Arc<dyn Fn(&str) -> bool + Send + Sync>, Option<String>),
    StartsWith(String, Option<String>),
    EndsWith(String, Option<String>),
    Includes(String, Option<usize>, Option<String>),
    Trim,
    ToLowerCase,
}

#[derive(Clone)]
enum NumberCheck {
    Int(Option<String>),
    Min(f64, bool, Option<String>),
    Max(f64, bool, Option<String>),
    Finite(Option<String>),
}

#[derive(Clone, Copy, PartialEq, Eq)]
enum UnknownKeys {
    Strip,
    Strict,
    Passthrough,
}

#[derive(Clone)]
struct ObjectDef {
    shape: Vec<(String, Schema)>,
    unknown_keys: UnknownKeys,
    catchall: Option<Schema>,
}

#[derive(Clone)]
struct ArrayLimit {
    value: usize,
    message: Option<String>,
}

#[derive(Clone)]
enum Node {
    String {
        checks: Vec<StringCheck>,
        coerce: bool,
    },
    Number {
        checks: Vec<NumberCheck>,
        coerce: bool,
    },
    Boolean,
    BigInt {
        coerce: bool,
    },
    Undefined,
    Any,
    Literal(Value),
    Enum(Vec<Value>),
    NativeEnum(Vec<Value>),
    Object(ObjectDef),
    Array {
        item: Schema,
        min: Option<ArrayLimit>,
        max: Option<ArrayLimit>,
        exact: Option<ArrayLimit>,
    },
    Tuple(Vec<Schema>),
    Record(Schema, Schema),
    Union(Vec<Schema>),
    Intersection(Schema, Schema),
    Optional(Schema),
    Nullable(Schema),
    Default(Schema, Arc<dyn Fn() -> Value + Send + Sync>),
    Refinement(Schema, Refinement),
    Transform(Schema, Transform),
    Preprocess(Transform, Schema),
    Pipeline(Schema, Schema),
}

/// A zod schema. Cheap to clone; builder methods return a new schema, as zod's do.
#[derive(Clone)]
pub struct Schema(Arc<Node>);

pub fn string() -> Schema {
    Schema::new(Node::String {
        checks: Vec::new(),
        coerce: false,
    })
}

pub fn number() -> Schema {
    Schema::new(Node::Number {
        checks: Vec::new(),
        coerce: false,
    })
}

/// `coerce.number()`: `Number(input)` before the number checks.
pub fn coerce_number() -> Schema {
    Schema::new(Node::Number {
        checks: Vec::new(),
        coerce: true,
    })
}

/// `coerce.string()`.
pub fn coerce_string() -> Schema {
    Schema::new(Node::String {
        checks: Vec::new(),
        coerce: true,
    })
}

/// `bigint()`. JSON has no bigints, so only the coercing form accepts anything; a parsed
/// bigint is output as its decimal string, which serde then reads as a big integer.
pub fn bigint() -> Schema {
    Schema::new(Node::BigInt { coerce: false })
}

/// `coerce.bigint()`: `BigInt(input)`. zod 3.23 lets the `SyntaxError`, `RangeError` or
/// `TypeError` that `BigInt` throws escape `safeParse`; here the input fails with the
/// `invalid_type` issue zod 3.24 reports instead.
pub fn coerce_bigint() -> Schema {
    Schema::new(Node::BigInt { coerce: true })
}

pub fn boolean() -> Schema {
    Schema::new(Node::Boolean)
}

/// `undefined()`: only an absent value.
pub fn undefined() -> Schema {
    Schema::new(Node::Undefined)
}

/// `any()` and `unknown()`, which parse the same.
pub fn any() -> Schema {
    Schema::new(Node::Any)
}

pub fn literal(value: impl Into<Value>) -> Schema {
    Schema::new(Node::Literal(value.into()))
}

/// `enum([...])`: string values only.
pub fn string_enum(values: &[&str]) -> Schema {
    Schema::new(Node::Enum(
        values.iter().map(|value| Value::from(*value)).collect(),
    ))
}

/// `nativeEnum(E)` with the enum's values in declaration order.
pub fn native_enum<V: Into<Value> + Clone>(values: &[V]) -> Schema {
    Schema::new(Node::NativeEnum(
        values.iter().cloned().map(Into::into).collect(),
    ))
}

pub fn object(shape: Vec<(&str, Schema)>) -> Schema {
    Schema::new(Node::Object(ObjectDef {
        shape: shape
            .into_iter()
            .map(|(key, schema)| (key.to_string(), schema))
            .collect(),
        unknown_keys: UnknownKeys::Strip,
        catchall: None,
    }))
}

pub fn array(item: Schema) -> Schema {
    Schema::new(Node::Array {
        item,
        min: None,
        max: None,
        exact: None,
    })
}

pub fn tuple(items: Vec<Schema>) -> Schema {
    Schema::new(Node::Tuple(items))
}

/// `record(valueSchema)` keyed by `string()`.
pub fn record(value: Schema) -> Schema {
    Schema::new(Node::Record(string(), value))
}

pub fn record_with_keys(key: Schema, value: Schema) -> Schema {
    Schema::new(Node::Record(key, value))
}

pub fn union(options: Vec<Schema>) -> Schema {
    Schema::new(Node::Union(options))
}

pub fn preprocess(
    transform: impl Fn(Data, &mut RefinementContext<'_>) -> Data + Send + Sync + 'static,
    schema: Schema,
) -> Schema {
    Schema::new(Node::Preprocess(Arc::new(transform), schema))
}

/// `custom(check)`: any value, rejected with a fatal issue when `check` fails.
pub fn custom(check: impl Fn(&Data) -> bool + Send + Sync + 'static) -> Schema {
    custom_issue(check, None)
}

/// `custom(check, { message })`.
pub fn custom_with_message(
    check: impl Fn(&Data) -> bool + Send + Sync + 'static,
    message: impl Into<String>,
) -> Schema {
    custom_issue(check, Some(message.into()))
}

fn custom_issue(
    check: impl Fn(&Data) -> bool + Send + Sync + 'static,
    message: Option<String>,
) -> Schema {
    any().super_refine(move |value, ctx| {
        if !check(value) {
            let issue: IssueData = match &message {
                Some(message) => IssueData::code("custom").with("message", message.clone()),
                None => IssueData::code("custom"),
            };
            ctx.add_issue(issue.fatal());
        }
    })
}

impl Schema {
    fn new(node: Node) -> Schema {
        Schema(Arc::new(node))
    }

    fn with_string_check(&self, check: StringCheck) -> Schema {
        match &*self.0 {
            Node::String { checks, coerce } => {
                let mut checks: Vec<StringCheck> = checks.clone();
                checks.push(check);
                Schema::new(Node::String {
                    checks,
                    coerce: *coerce,
                })
            }
            _ => panic!("string check on a non-string schema"),
        }
    }

    fn with_number_check(&self, check: NumberCheck) -> Schema {
        match &*self.0 {
            Node::Number { checks, coerce } => {
                let mut checks: Vec<NumberCheck> = checks.clone();
                checks.push(check);
                Schema::new(Node::Number {
                    checks,
                    coerce: *coerce,
                })
            }
            _ => panic!("number check on a non-number schema"),
        }
    }

    fn with_array_limit(&self, kind: &str, value: usize, message: Option<String>) -> Schema {
        match &*self.0 {
            Node::Array {
                item,
                min,
                max,
                exact,
            } => {
                let limit: Option<ArrayLimit> = Some(ArrayLimit { value, message });
                let (min, max, exact) = match kind {
                    "min" => (limit, max.clone(), exact.clone()),
                    "max" => (min.clone(), limit, exact.clone()),
                    _ => (min.clone(), max.clone(), limit),
                };
                Schema::new(Node::Array {
                    item: item.clone(),
                    min,
                    max,
                    exact,
                })
            }
            _ => panic!("array limit on a non-array schema"),
        }
    }

    /// `.min(n)` on a string, number or array.
    pub fn min(&self, value: f64) -> Schema {
        match &*self.0 {
            Node::String { .. } => self.with_string_check(StringCheck::Min(value as usize, None)),
            Node::Number { .. } => self.with_number_check(NumberCheck::Min(value, true, None)),
            Node::Array { .. } => self.with_array_limit("min", value as usize, None),
            _ => panic!("min on a schema without a length or value"),
        }
    }

    /// `.max(n)` on a string, number or array.
    pub fn max(&self, value: f64) -> Schema {
        match &*self.0 {
            Node::String { .. } => self.with_string_check(StringCheck::Max(value as usize, None)),
            Node::Number { .. } => self.with_number_check(NumberCheck::Max(value, true, None)),
            Node::Array { .. } => self.with_array_limit("max", value as usize, None),
            _ => panic!("max on a schema without a length or value"),
        }
    }

    pub fn max_with_message(&self, value: f64, message: impl Into<String>) -> Schema {
        let message: Option<String> = Some(message.into());
        match &*self.0 {
            Node::String { .. } => {
                self.with_string_check(StringCheck::Max(value as usize, message))
            }
            Node::Number { .. } => self.with_number_check(NumberCheck::Max(value, true, message)),
            Node::Array { .. } => self.with_array_limit("max", value as usize, message),
            _ => panic!("max on a schema without a length or value"),
        }
    }

    pub fn min_with_message(&self, value: f64, message: impl Into<String>) -> Schema {
        let message: Option<String> = Some(message.into());
        match &*self.0 {
            Node::String { .. } => {
                self.with_string_check(StringCheck::Min(value as usize, message))
            }
            Node::Number { .. } => self.with_number_check(NumberCheck::Min(value, true, message)),
            Node::Array { .. } => self.with_array_limit("min", value as usize, message),
            _ => panic!("min on a schema without a length or value"),
        }
    }

    /// `.length(n)` on a string or array.
    pub fn length(&self, value: usize) -> Schema {
        match &*self.0 {
            Node::String { .. } => self.with_string_check(StringCheck::Length(value, None)),
            Node::Array { .. } => self.with_array_limit("length", value, None),
            _ => panic!("length on a schema without a length"),
        }
    }

    pub fn email(&self) -> Schema {
        self.with_string_check(StringCheck::Email(None))
    }

    pub fn url(&self) -> Schema {
        self.with_string_check(StringCheck::Url(None))
    }

    /// `.regex(re)`. `test` must answer as the JS regex does; patterns with lookaround or
    /// case-insensitive matching need care, because Rust's regex semantics differ there.
    pub fn regex(&self, test: impl Fn(&str) -> bool + Send + Sync + 'static) -> Schema {
        self.with_string_check(StringCheck::Regex(Arc::new(test), None))
    }

    pub fn regex_with_message(
        &self,
        test: impl Fn(&str) -> bool + Send + Sync + 'static,
        message: impl Into<String>,
    ) -> Schema {
        self.with_string_check(StringCheck::Regex(Arc::new(test), Some(message.into())))
    }

    pub fn starts_with(&self, prefix: impl Into<String>) -> Schema {
        self.with_string_check(StringCheck::StartsWith(prefix.into(), None))
    }

    pub fn ends_with(&self, suffix: impl Into<String>) -> Schema {
        self.with_string_check(StringCheck::EndsWith(suffix.into(), None))
    }

    pub fn includes(&self, value: impl Into<String>) -> Schema {
        self.with_string_check(StringCheck::Includes(value.into(), None, None))
    }

    pub fn trim(&self) -> Schema {
        self.with_string_check(StringCheck::Trim)
    }

    pub fn to_lower_case(&self) -> Schema {
        self.with_string_check(StringCheck::ToLowerCase)
    }

    pub fn int(&self) -> Schema {
        self.with_number_check(NumberCheck::Int(None))
    }

    /// `.positive()`: `> 0`.
    pub fn positive(&self) -> Schema {
        self.with_number_check(NumberCheck::Min(0.0, false, None))
    }

    /// `.nonnegative()`: `>= 0`.
    pub fn nonnegative(&self) -> Schema {
        self.with_number_check(NumberCheck::Min(0.0, true, None))
    }

    pub fn gt(&self, value: f64) -> Schema {
        self.with_number_check(NumberCheck::Min(value, false, None))
    }

    pub fn lt(&self, value: f64) -> Schema {
        self.with_number_check(NumberCheck::Max(value, false, None))
    }

    pub fn finite(&self) -> Schema {
        self.with_number_check(NumberCheck::Finite(None))
    }

    fn with_object(&self, update: impl FnOnce(&mut ObjectDef)) -> Schema {
        match &*self.0 {
            Node::Object(def) => {
                let mut def: ObjectDef = def.clone();
                update(&mut def);
                Schema::new(Node::Object(def))
            }
            _ => panic!("object method on a non-object schema"),
        }
    }

    pub fn strict(&self) -> Schema {
        self.with_object(|def| def.unknown_keys = UnknownKeys::Strict)
    }

    pub fn passthrough(&self) -> Schema {
        self.with_object(|def| def.unknown_keys = UnknownKeys::Passthrough)
    }

    pub fn catchall(&self, schema: Schema) -> Schema {
        self.with_object(|def| def.catchall = Some(schema))
    }

    /// `.extend(shape)`: a key already in the shape is replaced in place.
    pub fn extend(&self, shape: Vec<(&str, Schema)>) -> Schema {
        self.with_object(|def| {
            for (key, schema) in shape {
                match def.shape.iter_mut().find(|(name, _)| name == key) {
                    Some(entry) => entry.1 = schema,
                    None => def.shape.push((key.to_string(), schema)),
                }
            }
        })
    }

    /// `.merge(other)`: `other`'s shape over this one, and `other`'s unknown-key policy.
    pub fn merge(&self, other: &Schema) -> Schema {
        let Node::Object(other_def) = &*other.0 else {
            panic!("merge with a non-object schema");
        };
        let other_def: ObjectDef = other_def.clone();
        self.with_object(move |def| {
            for (key, schema) in other_def.shape {
                match def.shape.iter_mut().find(|(name, _)| *name == key) {
                    Some(entry) => entry.1 = schema,
                    None => def.shape.push((key, schema)),
                }
            }
            def.unknown_keys = other_def.unknown_keys;
            def.catchall = other_def.catchall;
        })
    }

    /// `.partial()`: every key optional.
    pub fn partial(&self) -> Schema {
        self.with_object(|def| {
            for entry in &mut def.shape {
                entry.1 = entry.1.optional();
            }
        })
    }

    /// The shape of an object schema, for building another from it.
    pub fn shape(&self) -> Vec<(String, Schema)> {
        match &*self.0 {
            Node::Object(def) => def.shape.clone(),
            _ => panic!("shape of a non-object schema"),
        }
    }

    pub fn optional(&self) -> Schema {
        Schema::new(Node::Optional(self.clone()))
    }

    pub fn nullable(&self) -> Schema {
        Schema::new(Node::Nullable(self.clone()))
    }

    /// `.nullish()`: `.nullable().optional()`.
    pub fn nullish(&self) -> Schema {
        self.nullable().optional()
    }

    /// `.array()`.
    pub fn array(&self) -> Schema {
        array(self.clone())
    }

    pub fn default(&self, value: impl Into<Value>) -> Schema {
        let value: Value = value.into();
        Schema::new(Node::Default(self.clone(), Arc::new(move || value.clone())))
    }

    pub fn default_with(&self, value: impl Fn() -> Value + Send + Sync + 'static) -> Schema {
        Schema::new(Node::Default(self.clone(), Arc::new(value)))
    }

    pub fn or(&self, other: Schema) -> Schema {
        union(vec![self.clone(), other])
    }

    pub fn and(&self, other: Schema) -> Schema {
        Schema::new(Node::Intersection(self.clone(), other))
    }

    pub fn pipe(&self, out: Schema) -> Schema {
        Schema::new(Node::Pipeline(self.clone(), out))
    }

    /// `.refine(check, { message })`: a non-fatal custom issue when `check` fails.
    pub fn refine(
        &self,
        check: impl Fn(&Data) -> bool + Send + Sync + 'static,
        message: Option<String>,
    ) -> Schema {
        self.refine_with(check, move |_| {
            IssueData::code("custom").with_optional("message", message.clone().map(Value::from))
        })
    }

    /// `.refine(check, (value) => issueProperties)`.
    pub fn refine_with(
        &self,
        check: impl Fn(&Data) -> bool + Send + Sync + 'static,
        issue: impl Fn(&Data) -> IssueData + Send + Sync + 'static,
    ) -> Schema {
        self.super_refine(move |value, ctx| {
            if !check(value) {
                ctx.add_issue(issue(value));
            }
        })
    }

    pub fn super_refine(
        &self,
        refinement: impl Fn(&Data, &mut RefinementContext<'_>) + Send + Sync + 'static,
    ) -> Schema {
        Schema::new(Node::Refinement(self.clone(), Arc::new(refinement)))
    }

    pub fn transform(
        &self,
        transform: impl Fn(Data, &mut RefinementContext<'_>) -> Data + Send + Sync + 'static,
    ) -> Schema {
        Schema::new(Node::Transform(self.clone(), Arc::new(transform)))
    }

    /// `safeParse`: the parsed output (`None` when it is `undefined`), or zod's issues.
    pub fn safe_parse(&self, input: Option<&Value>) -> Result<Data, Vec<Map<String, Value>>> {
        let mut issues: Issues = Issues::default();
        let outcome: Outcome = self.parse(input.cloned(), &[], &mut issues);
        match outcome.status {
            Status::Valid => Ok(outcome.value),
            Status::Dirty | Status::Aborted => Err(issues.0),
        }
    }

    /// [`Schema::safe_parse`] as the `Validate` contract wants it.
    pub fn validate(&self, input: Option<&Value>) -> Result<Value, ValidationError> {
        match self.safe_parse(input) {
            Ok(value) => Ok(value.unwrap_or(Value::Null)),
            Err(issues) => Err(ValidationError::new(
                issues.into_iter().map(validation_issue).collect(),
            )),
        }
    }

    fn parse(&self, data: Data, path: &[PathSegment], issues: &mut Issues) -> Outcome {
        match &*self.0 {
            Node::String { checks, coerce } => parse_string(checks, *coerce, data, path, issues),
            Node::Number { checks, coerce } => parse_number(checks, *coerce, data, path, issues),
            Node::Boolean => match data {
                Some(Value::Bool(flag)) => Outcome::valid(Some(Value::Bool(flag))),
                other => invalid_type(issues, path, "boolean", other.as_ref()),
            },
            Node::Undefined => match data {
                None => Outcome::valid(None),
                other => invalid_type(issues, path, "undefined", other.as_ref()),
            },
            Node::BigInt { coerce } => {
                match coerce.then(|| js_to_bigint(data.as_ref())).flatten() {
                    Some(value) => Outcome::valid(Some(Value::String(value.to_string()))),
                    None => invalid_type(issues, path, "bigint", data.as_ref()),
                }
            }
            Node::Any => Outcome::valid(data),
            Node::Literal(expected) => {
                if strictly_equal(data.as_ref(), Some(expected)) {
                    Outcome::valid(data)
                } else {
                    issues.add(
                        path,
                        IssueData::new()
                            .with_optional("received", data)
                            .with("code", "invalid_literal")
                            .with("expected", expected.clone()),
                    );
                    Outcome::invalid()
                }
            }
            Node::Enum(values) => parse_enum(values, false, data, path, issues),
            Node::NativeEnum(values) => parse_enum(values, true, data, path, issues),
            Node::Object(def) => parse_object(def, data, path, issues),
            Node::Array {
                item,
                min,
                max,
                exact,
            } => parse_array(item, min, max, exact, data, path, issues),
            Node::Tuple(items) => parse_tuple(items, data, path, issues),
            Node::Record(key, value) => parse_record(key, value, data, path, issues),
            Node::Union(options) => parse_union(options, data, path, issues),
            Node::Intersection(left, right) => {
                let left: Outcome = left.parse(data.clone(), path, issues);
                let right: Outcome = right.parse(data, path, issues);
                if left.status == Status::Aborted || right.status == Status::Aborted {
                    return Outcome::invalid();
                }
                match merge_values(left.value, right.value) {
                    Some(merged) => {
                        let status: Status =
                            if left.status == Status::Dirty || right.status == Status::Dirty {
                                Status::Dirty
                            } else {
                                Status::Valid
                            };
                        Outcome::with_status(status, merged)
                    }
                    None => {
                        issues.add(path, IssueData::code("invalid_intersection_types"));
                        Outcome::invalid()
                    }
                }
            }
            Node::Optional(inner) => match data {
                None => Outcome::valid(None),
                data => inner.parse(data, path, issues),
            },
            Node::Nullable(inner) => match data {
                Some(Value::Null) => Outcome::valid(Some(Value::Null)),
                data => inner.parse(data, path, issues),
            },
            Node::Default(inner, default) => {
                let data: Data = data.or_else(|| Some(default()));
                inner.parse(data, path, issues)
            }
            Node::Refinement(inner, refinement) => {
                let inner: Outcome = inner.parse(data, path, issues);
                if inner.status == Status::Aborted {
                    return Outcome::invalid();
                }
                let mut status: ParseStatus = ParseStatus::new();
                if inner.status == Status::Dirty {
                    status.dirty();
                }
                refinement(
                    &inner.value,
                    &mut RefinementContext {
                        issues,
                        status: &mut status,
                        path,
                    },
                );
                Outcome::with_status(status.0, inner.value)
            }
            Node::Transform(inner, transform) => {
                let base: Outcome = inner.parse(data, path, issues);
                if base.status != Status::Valid {
                    return base;
                }
                let mut status: ParseStatus = ParseStatus::new();
                let value: Data = transform(
                    base.value,
                    &mut RefinementContext {
                        issues,
                        status: &mut status,
                        path,
                    },
                );
                Outcome::with_status(status.0, value)
            }
            Node::Preprocess(transform, inner) => {
                let mut status: ParseStatus = ParseStatus::new();
                let processed: Data = transform(
                    data,
                    &mut RefinementContext {
                        issues,
                        status: &mut status,
                        path,
                    },
                );
                if status.0 == Status::Aborted {
                    return Outcome::invalid();
                }
                let result: Outcome = inner.parse(processed, path, issues);
                match result.status {
                    Status::Aborted => Outcome::invalid(),
                    Status::Dirty => Outcome::with_status(Status::Dirty, result.value),
                    Status::Valid if status.0 == Status::Dirty => {
                        Outcome::with_status(Status::Dirty, result.value)
                    }
                    Status::Valid => result,
                }
            }
            Node::Pipeline(input, out) => {
                let first: Outcome = input.parse(data, path, issues);
                match first.status {
                    Status::Aborted => Outcome::invalid(),
                    Status::Dirty => Outcome::with_status(Status::Dirty, first.value),
                    Status::Valid => out.parse(first.value, path, issues),
                }
            }
        }
    }
}

/// An issue map as `ValidationIssue`: `code`, `path` and `message`, with every other key as
/// a param.
fn validation_issue(mut issue: Map<String, Value>) -> ValidationIssue {
    let key_order: Vec<String> = issue.keys().cloned().collect();
    let code: String = issue
        .shift_remove("code")
        .and_then(|code| code.as_str().map(str::to_string))
        .unwrap_or_default();
    let path: Vec<PathSegment> = match issue.shift_remove("path") {
        Some(Value::Array(segments)) => segments
            .into_iter()
            .map(|segment| match segment {
                Value::Number(index) => PathSegment::Index(index.as_u64().unwrap_or(0) as usize),
                Value::String(key) => PathSegment::Key(key),
                other => PathSegment::Key(other.to_string()),
            })
            .collect(),
        _ => Vec::new(),
    };
    let message: String = issue
        .shift_remove("message")
        .and_then(|message| message.as_str().map(str::to_string))
        .unwrap_or_default();
    ValidationIssue {
        code,
        params: issue,
        path,
        message,
        key_order: Some(key_order),
    }
}

/// zod's `getParsedType` for a parsed value.
fn parsed_type(data: Option<&Value>) -> &'static str {
    match data {
        None => "undefined",
        Some(Value::Null) => "null",
        Some(Value::Bool(_)) => "boolean",
        Some(Value::Number(_)) => "number",
        Some(Value::String(_)) => "string",
        Some(Value::Array(_)) => "array",
        Some(Value::Object(_)) => "object",
    }
}

fn invalid_type(
    issues: &mut Issues,
    path: &[PathSegment],
    expected: &str,
    received: Option<&Value>,
) -> Outcome {
    issues.add(
        path,
        IssueData::code("invalid_type")
            .with("expected", expected)
            .with("received", parsed_type(received)),
    );
    Outcome::invalid()
}

fn with_message(data: IssueData, message: &Option<String>) -> IssueData {
    match message {
        Some(message) => data.with("message", message.clone()),
        None => data.with_undefined("message"),
    }
}

fn utf16_length(value: &str) -> usize {
    value.encode_utf16().count()
}

/// zod's `emailRegex`, `/^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i`.
/// The lookaheads become the first two tests, and JS's ASCII-only case folding the explicit
/// letter ranges, because Rust's `(?i)` also folds `ſ` and the Kelvin sign.
fn is_email(value: &str) -> bool {
    static EMAIL: std::sync::LazyLock<regex::Regex> = std::sync::LazyLock::new(|| {
        regex::Regex::new(
            r"^([A-Za-z0-9_'+\-.]*)[A-Za-z0-9_+\-]@([A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$",
        )
        .expect("email pattern compiles")
    });
    !value.starts_with('.') && !value.contains("..") && EMAIL.is_match(value)
}

fn utf16_offset(value: &str, position: usize) -> &str {
    let mut units: usize = 0;
    for (at, c) in value.char_indices() {
        if units >= position {
            return &value[at..];
        }
        units += c.len_utf16();
    }
    ""
}

fn parse_string(
    checks: &[StringCheck],
    coerce: bool,
    data: Data,
    path: &[PathSegment],
    issues: &mut Issues,
) -> Outcome {
    let data: Data = if coerce {
        Some(Value::from(to_js_string(data.as_ref())))
    } else {
        data
    };
    let Some(Value::String(mut text)) = data else {
        return invalid_type(issues, path, "string", data.as_ref());
    };
    let mut status: ParseStatus = ParseStatus::new();
    let mut fail = |issues: &mut Issues, issue: IssueData| {
        issues.add(path, issue);
        status.dirty();
    };
    for check in checks {
        match check {
            StringCheck::Min(minimum, message) => {
                if utf16_length(&text) < *minimum {
                    fail(
                        issues,
                        with_message(
                            size_issue("too_small", "minimum", *minimum, "string", false),
                            message,
                        ),
                    );
                }
            }
            StringCheck::Max(maximum, message) => {
                if utf16_length(&text) > *maximum {
                    fail(
                        issues,
                        with_message(
                            size_issue("too_big", "maximum", *maximum, "string", false),
                            message,
                        ),
                    );
                }
            }
            StringCheck::Length(length, message) => {
                let actual: usize = utf16_length(&text);
                if actual > *length {
                    fail(
                        issues,
                        with_message(
                            size_issue("too_big", "maximum", *length, "string", true),
                            message,
                        ),
                    );
                } else if actual < *length {
                    fail(
                        issues,
                        with_message(
                            size_issue("too_small", "minimum", *length, "string", true),
                            message,
                        ),
                    );
                }
            }
            StringCheck::Email(message) => {
                if !is_email(&text) {
                    fail(
                        issues,
                        with_message(validation_issue_data("email"), message),
                    );
                }
            }
            StringCheck::Url(message) => {
                if url::Url::parse(&text).is_err() {
                    fail(issues, with_message(validation_issue_data("url"), message));
                }
            }
            StringCheck::Regex(test, message) => {
                if !test(&text) {
                    fail(
                        issues,
                        with_message(validation_issue_data("regex"), message),
                    );
                }
            }
            StringCheck::StartsWith(prefix, message) => {
                if !text.starts_with(prefix.as_str()) {
                    let validation: Value = serde_json::json!({ "startsWith": prefix });
                    fail(
                        issues,
                        with_message(
                            IssueData::code("invalid_string").with("validation", validation),
                            message,
                        ),
                    );
                }
            }
            StringCheck::EndsWith(suffix, message) => {
                if !text.ends_with(suffix.as_str()) {
                    let validation: Value = serde_json::json!({ "endsWith": suffix });
                    fail(
                        issues,
                        with_message(
                            IssueData::code("invalid_string").with("validation", validation),
                            message,
                        ),
                    );
                }
            }
            StringCheck::Includes(needle, position, message) => {
                if !utf16_offset(&text, position.unwrap_or(0)).contains(needle.as_str()) {
                    let mut validation: Map<String, Value> = Map::new();
                    validation.insert("includes".to_string(), Value::from(needle.clone()));
                    if let Some(position) = position {
                        validation.insert("position".to_string(), Value::from(*position));
                    }
                    fail(
                        issues,
                        with_message(
                            IssueData::code("invalid_string")
                                .with("validation", Value::Object(validation)),
                            message,
                        ),
                    );
                }
            }
            StringCheck::Trim => text = js_trim(&text).to_string(),
            StringCheck::ToLowerCase => text = text.to_lowercase(),
        }
    }
    Outcome::with_status(status.0, Some(Value::String(text)))
}

/// `{ validation, code: "invalid_string", message }`: zod writes `validation` first here.
fn validation_issue_data(validation: &str) -> IssueData {
    IssueData::new()
        .with("validation", validation)
        .with("code", "invalid_string")
}

fn size_issue(code: &str, bound: &str, value: usize, kind: &str, exact: bool) -> IssueData {
    IssueData::code(code)
        .with(bound, value)
        .with("type", kind)
        .with("inclusive", true)
        .with("exact", exact)
}

fn parse_number(
    checks: &[NumberCheck],
    coerce: bool,
    data: Data,
    path: &[PathSegment],
    issues: &mut Issues,
) -> Outcome {
    let value: f64 = match (&data, coerce) {
        (_, true) => to_js_number(data.as_ref()),
        (Some(Value::Number(number)), false) => number.as_f64().unwrap_or(f64::NAN),
        _ => return invalid_type(issues, path, "number", data.as_ref()),
    };
    if value.is_nan() {
        issues.add(
            path,
            IssueData::code("invalid_type")
                .with("expected", "number")
                .with("received", "nan"),
        );
        return Outcome::invalid();
    }
    let mut status: ParseStatus = ParseStatus::new();
    for check in checks {
        let issue: Option<IssueData> = match check {
            NumberCheck::Int(message) => (value.fract() != 0.0 || !value.is_finite()).then(|| {
                with_message(
                    IssueData::code("invalid_type")
                        .with("expected", "integer")
                        .with("received", "float"),
                    message,
                )
            }),
            NumberCheck::Min(minimum, inclusive, message) => {
                let too_small: bool = if *inclusive {
                    value < *minimum
                } else {
                    value <= *minimum
                };
                too_small.then(|| {
                    with_message(
                        IssueData::code("too_small")
                            .with("minimum", number_value(*minimum))
                            .with("type", "number")
                            .with("inclusive", *inclusive)
                            .with("exact", false),
                        message,
                    )
                })
            }
            NumberCheck::Max(maximum, inclusive, message) => {
                let too_big: bool = if *inclusive {
                    value > *maximum
                } else {
                    value >= *maximum
                };
                too_big.then(|| {
                    with_message(
                        IssueData::code("too_big")
                            .with("maximum", number_value(*maximum))
                            .with("type", "number")
                            .with("inclusive", *inclusive)
                            .with("exact", false),
                        message,
                    )
                })
            }
            NumberCheck::Finite(message) => {
                (!value.is_finite()).then(|| with_message(IssueData::code("not_finite"), message))
            }
        };
        if let Some(issue) = issue {
            issues.add(path, issue);
            status.dirty();
        }
    }
    let output: Value = if coerce {
        number_value(value)
    } else {
        data.unwrap_or(Value::Null)
    };
    Outcome::with_status(status.0, Some(output))
}

fn parse_enum(
    values: &[Value],
    native: bool,
    data: Data,
    path: &[PathSegment],
    issues: &mut Issues,
) -> Outcome {
    let accepted_type: bool = match &data {
        Some(Value::String(_)) => true,
        Some(Value::Number(_)) => native,
        _ => false,
    };
    if !accepted_type {
        issues.add(
            path,
            IssueData::new()
                .with("expected", issue::join_values(values, " | "))
                .with("received", parsed_type(data.as_ref()))
                .with("code", "invalid_type"),
        );
        return Outcome::invalid();
    }
    if values
        .iter()
        .any(|value| strictly_equal(data.as_ref(), Some(value)))
    {
        return Outcome::valid(data);
    }
    issues.add(
        path,
        IssueData::new()
            .with_optional("received", data)
            .with("code", "invalid_enum_value")
            .with("options", Value::Array(values.to_vec())),
    );
    Outcome::invalid()
}

fn child_path(path: &[PathSegment], segment: PathSegment) -> Vec<PathSegment> {
    let mut child: Vec<PathSegment> = path.to_vec();
    child.push(segment);
    child
}

/// `ParseStatus.mergeObjectSync`: any aborted pair aborts the object.
fn merge_pairs(pairs: Vec<(Outcome, String, Outcome)>) -> Outcome {
    let mut status: ParseStatus = ParseStatus::new();
    let mut object: Map<String, Value> = Map::new();
    for (key, name, value) in pairs {
        if key.status == Status::Aborted || value.status == Status::Aborted {
            return Outcome::invalid();
        }
        if key.status == Status::Dirty || value.status == Status::Dirty {
            status.dirty();
        }
        if name != "__proto__" {
            if let Some(value) = value.value {
                object.insert(name, value);
            }
        }
    }
    Outcome::with_status(status.0, Some(Value::Object(js_ordered(object))))
}

fn valid_key(key: &str) -> Outcome {
    Outcome::valid(Some(Value::from(key)))
}

fn parse_object(def: &ObjectDef, data: Data, path: &[PathSegment], issues: &mut Issues) -> Outcome {
    let Some(Value::Object(input)) = data else {
        return invalid_type(issues, path, "object", data.as_ref());
    };
    let shape_keys: Vec<&str> = def.shape.iter().map(|(key, _)| key.as_str()).collect();
    let extra_keys: Vec<String> = js_keys(&input)
        .into_iter()
        .filter(|key| !shape_keys.contains(&key.as_str()))
        .cloned()
        .collect();
    let mut pairs: Vec<(Outcome, String, Outcome)> = def
        .shape
        .iter()
        .map(|(key, schema)| {
            let value: Outcome = schema.parse(
                input.get(key).cloned(),
                &child_path(path, key.clone().into()),
                issues,
            );
            (valid_key(key), key.clone(), value)
        })
        .collect();
    let mut status_issue: bool = false;
    match (&def.catchall, def.unknown_keys) {
        (Some(catchall), _) => {
            for key in &extra_keys {
                let value: Outcome = catchall.parse(
                    input.get(key).cloned(),
                    &child_path(path, key.clone().into()),
                    issues,
                );
                pairs.push((valid_key(key), key.clone(), value));
            }
        }
        (None, UnknownKeys::Passthrough) => {
            for key in &extra_keys {
                pairs.push((
                    valid_key(key),
                    key.clone(),
                    Outcome::valid(input.get(key).cloned()),
                ));
            }
        }
        (None, UnknownKeys::Strict) if !extra_keys.is_empty() => {
            issues.add(
                path,
                IssueData::code("unrecognized_keys").with(
                    "keys",
                    Value::Array(extra_keys.iter().cloned().map(Value::from).collect()),
                ),
            );
            status_issue = true;
        }
        (None, _) => {}
    }
    let merged: Outcome = merge_pairs(pairs);
    if status_issue && merged.status == Status::Valid {
        return Outcome::with_status(Status::Dirty, merged.value);
    }
    merged
}

fn array_issue(code: &str, bound: &str, limit: &ArrayLimit, exact: bool) -> IssueData {
    with_message(
        size_issue(code, bound, limit.value, "array", exact),
        &limit.message,
    )
}

fn parse_array(
    item: &Schema,
    min: &Option<ArrayLimit>,
    max: &Option<ArrayLimit>,
    exact: &Option<ArrayLimit>,
    data: Data,
    path: &[PathSegment],
    issues: &mut Issues,
) -> Outcome {
    let Some(Value::Array(items)) = data else {
        return invalid_type(issues, path, "array", data.as_ref());
    };
    let mut status: ParseStatus = ParseStatus::new();
    if let Some(exact) = exact {
        if items.len() > exact.value {
            issues.add(path, array_issue("too_big", "maximum", exact, true));
            status.dirty();
        } else if items.len() < exact.value {
            issues.add(path, array_issue("too_small", "minimum", exact, true));
            status.dirty();
        }
    }
    if let Some(min) = min {
        if items.len() < min.value {
            issues.add(path, array_issue("too_small", "minimum", min, false));
            status.dirty();
        }
    }
    if let Some(max) = max {
        if items.len() > max.value {
            issues.add(path, array_issue("too_big", "maximum", max, false));
            status.dirty();
        }
    }
    let results: Vec<Outcome> = items
        .into_iter()
        .enumerate()
        .map(|(index, value)| item.parse(Some(value), &child_path(path, index.into()), issues))
        .collect();
    merge_items(status, results)
}

/// `ParseStatus.mergeArray`; an `undefined` element is written as `null`, as JSON has it.
fn merge_items(mut status: ParseStatus, results: Vec<Outcome>) -> Outcome {
    let mut values: Vec<Value> = Vec::with_capacity(results.len());
    for result in results {
        match result.status {
            Status::Aborted => return Outcome::invalid(),
            Status::Dirty => status.dirty(),
            Status::Valid => {}
        }
        values.push(result.value.unwrap_or(Value::Null));
    }
    Outcome::with_status(status.0, Some(Value::Array(values)))
}

/// A tuple writes `type` last, unlike the other size issues.
fn tuple_size_issue(code: &str, bound: &str, value: usize) -> IssueData {
    IssueData::code(code)
        .with(bound, value)
        .with("inclusive", true)
        .with("exact", false)
        .with("type", "array")
}

fn parse_tuple(items: &[Schema], data: Data, path: &[PathSegment], issues: &mut Issues) -> Outcome {
    let Some(Value::Array(values)) = data else {
        return invalid_type(issues, path, "array", data.as_ref());
    };
    if values.len() < items.len() {
        issues.add(path, tuple_size_issue("too_small", "minimum", items.len()));
        return Outcome::invalid();
    }
    let mut status: ParseStatus = ParseStatus::new();
    if values.len() > items.len() {
        issues.add(path, tuple_size_issue("too_big", "maximum", items.len()));
        status.dirty();
    }
    let results: Vec<Outcome> = values
        .into_iter()
        .zip(items)
        .enumerate()
        .map(|(index, (value, schema))| {
            schema.parse(Some(value), &child_path(path, index.into()), issues)
        })
        .collect();
    merge_items(status, results)
}

fn parse_record(
    key_schema: &Schema,
    value_schema: &Schema,
    data: Data,
    path: &[PathSegment],
    issues: &mut Issues,
) -> Outcome {
    let Some(Value::Object(input)) = data else {
        return invalid_type(issues, path, "object", data.as_ref());
    };
    let pairs: Vec<(Outcome, String, Outcome)> = js_keys(&input)
        .into_iter()
        .map(|key| {
            let child: Vec<PathSegment> = child_path(path, key.clone().into());
            let parsed_key: Outcome =
                key_schema.parse(Some(Value::from(key.clone())), &child, issues);
            let value: Outcome = value_schema.parse(input.get(key).cloned(), &child, issues);
            let name: String = match &parsed_key.value {
                Some(Value::String(name)) => name.clone(),
                other => to_js_string(other.as_ref()),
            };
            (parsed_key, name, value)
        })
        .collect();
    merge_pairs(pairs)
}

fn parse_union(
    options: &[Schema],
    data: Data,
    path: &[PathSegment],
    issues: &mut Issues,
) -> Outcome {
    let mut dirty: Option<(Outcome, Issues)> = None;
    let mut failures: Vec<Vec<Map<String, Value>>> = Vec::new();
    for option in options {
        let mut option_issues: Issues = Issues::default();
        let result: Outcome = option.parse(data.clone(), path, &mut option_issues);
        if result.status == Status::Valid {
            return result;
        }
        if result.status == Status::Dirty && dirty.is_none() {
            dirty = Some((result, Issues(option_issues.0.clone())));
        }
        if !option_issues.0.is_empty() {
            failures.push(option_issues.0);
        }
    }
    if let Some((result, option_issues)) = dirty {
        issues.0.extend(option_issues.0);
        return result;
    }
    let union_errors: Vec<Value> = failures
        .into_iter()
        .map(|failure| {
            serde_json::json!({
                "issues": failure.into_iter().map(Value::Object).collect::<Vec<Value>>(),
                "name": "ZodError",
            })
        })
        .collect();
    issues.add(
        path,
        IssueData::code("invalid_union").with("unionErrors", Value::Array(union_errors)),
    );
    Outcome::invalid()
}

/// zod's `mergeValues` for an intersection.
fn merge_values(a: Data, b: Data) -> Option<Data> {
    if strictly_equal(a.as_ref(), b.as_ref()) {
        return Some(a);
    }
    match (a, b) {
        (Some(Value::Object(a)), Some(Value::Object(b))) => {
            let mut merged: Map<String, Value> = a.clone();
            for (key, value) in &b {
                merged.insert(key.clone(), value.clone());
            }
            for key in a.keys().filter(|key| b.contains_key(*key)) {
                let shared: Data = merge_values(a.get(key).cloned(), b.get(key).cloned())?;
                match shared {
                    Some(value) => merged.insert(key.clone(), value),
                    None => merged.remove(key),
                };
            }
            Some(Some(Value::Object(js_ordered(merged))))
        }
        (Some(Value::Array(a)), Some(Value::Array(b))) => {
            if a.len() != b.len() {
                return None;
            }
            let items: Option<Vec<Value>> = a
                .into_iter()
                .zip(b)
                .map(|(a, b)| {
                    merge_values(Some(a), Some(b)).map(|item| item.unwrap_or(Value::Null))
                })
                .collect();
            items.map(|items| Some(Value::Array(items)))
        }
        _ => None,
    }
}
