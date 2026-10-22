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

//! A mongoose schema, declared field for field as the TS declares it. The declaration is data:
//! [`crate::document`] reads it to build the document mongoose would store, and
//! [`Schema::indexes`] to list the indexes mongoose would create.

use bson::oid::ObjectId;
use bson::{Bson, DateTime, Document};
use std::sync::LazyLock;

pub type SchemaRef = &'static LazyLock<Schema>;

/// Where new `ObjectId`s and the current time come from, so a test can mint the ones mongoose
/// minted.
pub trait Ids {
    fn object_id(&mut self) -> ObjectId;
    fn now(&mut self) -> DateTime;
}

pub struct FreshIds;

impl Ids for FreshIds {
    fn object_id(&mut self) -> ObjectId {
        ObjectId::new()
    }

    fn now(&mut self) -> DateTime {
        DateTime::now()
    }
}

#[derive(Clone)]
pub enum Kind {
    String,
    Number,
    Boolean,
    Date,
    ObjectId,
    /// `Schema.Types.Mixed` and `type: Object`.
    Mixed,
    /// `Schema.Types.Decimal128` behind the `normaliseIpHalf` setter.
    IpHalf,
    Array(Box<Kind>),
    DocumentArray(SchemaRef),
    Subdocument(SchemaRef),
    /// `type: Map, of: <schema>`.
    Map(SchemaRef),
    /// `type: Map, of: <type>` for a type that is not a schema: each value is that path's.
    ValueMap(Box<Path>),
}

#[derive(Clone, Copy)]
pub enum Default {
    None,
    /// `default: <value>`.
    Value(fn() -> Bson),
    /// `default: () => …` or `default: Date.now`.
    Function(fn(&mut dyn Ids) -> Bson),
    /// A function default mongoose runs before setters: `_id`'s.
    FunctionBeforeSetters(fn(&mut dyn Ids) -> Bson),
    /// `default: undefined`, which turns off an array's implicit `[]`.
    Undefined,
}

/// When mongoose applies a path's default while building a document.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DefaultTiming {
    None,
    /// Before the given values are set: plain values, a plain array's `[]` and `_id`.
    Before,
    /// After the given values are set: function defaults and a document array's `[]`.
    After,
}

#[derive(Clone)]
pub struct Path {
    pub kind: Kind,
    pub required: bool,
    /// `required: function () { ... }`: required when this holds of the document being validated.
    pub required_when: Option<fn(&bson::Document) -> bool>,
    pub default: Default,
    /// For a string path, or a string array's elements.
    pub enum_values: Option<Vec<String>>,
    pub min: Option<f64>,
    pub max: Option<f64>,
    /// `expires`, in seconds: a TTL index on the path.
    pub expires: Option<i64>,
    pub unique: bool,
    /// `index: true`: a plain index on the path.
    pub index: bool,
    /// Set once on insert, never by an update: the timestamps' `createdAt`.
    pub immutable: bool,
}

impl Path {
    fn new(kind: Kind) -> Path {
        Path {
            kind,
            required: false,
            required_when: None,
            default: Default::None,
            enum_values: None,
            min: None,
            max: None,
            expires: None,
            unique: false,
            index: false,
            immutable: false,
        }
    }

    pub fn required(mut self) -> Path {
        self.required = true;
        self
    }

    pub fn required_when(mut self, condition: fn(&bson::Document) -> bool) -> Path {
        self.required_when = Some(condition);
        self
    }

    pub fn index(mut self) -> Path {
        self.index = true;
        self
    }

    pub fn default_value(mut self, value: fn() -> Bson) -> Path {
        self.default = Default::Value(value);
        self
    }

    pub fn default_fn(mut self, value: fn(&mut dyn Ids) -> Bson) -> Path {
        self.default = Default::Function(value);
        self
    }

    pub fn default_undefined(mut self) -> Path {
        self.default = Default::Undefined;
        self
    }

    pub fn one_of<I, S>(mut self, values: I) -> Path
    where
        I: IntoIterator<Item = S>,
        S: Into<String>,
    {
        self.enum_values = Some(values.into_iter().map(Into::into).collect());
        self
    }

    pub fn min(mut self, value: f64) -> Path {
        self.min = Some(value);
        self
    }

    pub fn max(mut self, value: f64) -> Path {
        self.max = Some(value);
        self
    }

    pub fn expires(mut self, seconds: i64) -> Path {
        self.expires = Some(seconds);
        self
    }

    pub fn unique(mut self) -> Path {
        self.unique = true;
        self
    }

    pub fn timing(&self) -> DefaultTiming {
        match (&self.default, &self.kind) {
            (Default::Undefined, _) => DefaultTiming::None,
            (Default::Value(_), _) => DefaultTiming::Before,
            (Default::Function(_), _) => DefaultTiming::After,
            (Default::FunctionBeforeSetters(_), _) => DefaultTiming::Before,
            (Default::None, Kind::Array(_)) => DefaultTiming::Before,
            (Default::None, Kind::DocumentArray(_)) => DefaultTiming::After,
            (Default::None, _) => DefaultTiming::None,
        }
    }

    /// The default's value before it is cast, or `None` if the path has no default.
    pub fn default_value_for(&self, ids: &mut dyn Ids) -> Option<Bson> {
        match (&self.default, &self.kind) {
            (Default::Value(value), _) => Some(value()),
            (Default::Function(value) | Default::FunctionBeforeSetters(value), _) => Some(value(ids)),
            (Default::None, Kind::Array(_) | Kind::DocumentArray(_)) => Some(Bson::Array(Vec::new())),
            _ => None,
        }
    }
}

pub fn string() -> Path {
    Path::new(Kind::String)
}

pub fn number() -> Path {
    Path::new(Kind::Number)
}

pub fn boolean() -> Path {
    Path::new(Kind::Boolean)
}

pub fn date() -> Path {
    Path::new(Kind::Date)
}

pub fn object_id() -> Path {
    Path::new(Kind::ObjectId)
}

pub fn mixed() -> Path {
    Path::new(Kind::Mixed)
}

pub fn ip_half() -> Path {
    Path::new(Kind::IpHalf)
}

pub fn array(element: Kind) -> Path {
    Path::new(Kind::Array(Box::new(element)))
}

pub fn document_array(schema: SchemaRef) -> Path {
    Path::new(Kind::DocumentArray(schema))
}

pub fn subdocument(schema: SchemaRef) -> Path {
    Path::new(Kind::Subdocument(schema))
}

pub fn map_of(schema: SchemaRef) -> Path {
    Path::new(Kind::Map(schema))
}

pub fn map_of_values(element: Path) -> Path {
    Path::new(Kind::ValueMap(Box::new(element)))
}

#[derive(Clone)]
pub enum Node {
    Path(Path),
    /// A nested path: an object literal whose fields belong to the same schema.
    Nested(Vec<Field>),
}

#[derive(Clone)]
pub struct Field {
    pub name: &'static str,
    pub node: Node,
}

pub fn field(name: &'static str, path: Path) -> Field {
    Field { name, node: Node::Path(path) }
}

pub fn nested(name: &'static str, fields: Vec<Field>) -> Field {
    Field {
        name,
        node: Node::Nested(fields),
    }
}

/// `schema.index(keys, options)`.
#[derive(Clone, Debug, PartialEq)]
pub struct Index {
    pub keys: Vec<(String, i32)>,
    pub options: IndexOptions,
}

impl Index {
    /// The name given, or the driver's: each key and direction joined by `_`.
    pub fn name(&self) -> String {
        match self.options.name {
            Some(name) => name.to_string(),
            None => self
                .keys
                .iter()
                .map(|(key, direction)| format!("{key}_{direction}"))
                .collect::<Vec<String>>()
                .join("_"),
        }
    }
}

#[derive(Clone, Debug, Default, PartialEq)]
pub struct IndexOptions {
    pub name: Option<&'static str>,
    pub unique: bool,
    pub sparse: bool,
    pub background: bool,
    pub expire_after_seconds: Option<i64>,
    pub partial_filter_expression: Option<Document>,
}

impl IndexOptions {
    pub fn named(name: &'static str) -> IndexOptions {
        IndexOptions {
            name: Some(name),
            ..IndexOptions::default()
        }
    }

    pub fn unique() -> IndexOptions {
        IndexOptions {
            unique: true,
            ..IndexOptions::default()
        }
    }

    pub fn sparse() -> IndexOptions {
        IndexOptions {
            sparse: true,
            ..IndexOptions::default()
        }
    }

    pub fn background_sparse() -> IndexOptions {
        IndexOptions {
            background: true,
            sparse: true,
            ..IndexOptions::default()
        }
    }

    pub fn background() -> IndexOptions {
        IndexOptions {
            background: true,
            ..IndexOptions::default()
        }
    }

    pub fn partial(mut self, filter: Document) -> IndexOptions {
        self.partial_filter_expression = Some(filter);
        self
    }

    /// The options as mongoose hands them to `createIndex`, in the order it keeps them.
    pub fn to_document(&self) -> Document {
        let mut out: Document = Document::new();
        if let Some(seconds) = self.expire_after_seconds {
            out.insert("expireAfterSeconds", crate::number::js_number(seconds as f64));
        }
        if let Some(name) = self.name {
            out.insert("name", name);
        }
        if self.background {
            out.insert("background", true);
        }
        if self.unique {
            out.insert("unique", true);
        }
        if self.sparse {
            out.insert("sparse", true);
        }
        if let Some(filter) = &self.partial_filter_expression {
            out.insert("partialFilterExpression", filter.clone());
        }
        out
    }
}

pub struct Schema {
    pub fields: Vec<Field>,
    /// Not declared `{ _id: false }`.
    pub id: bool,
    /// `{ timestamps: { createdAt: true, updatedAt: true } }`.
    pub timestamps: bool,
    /// The `schema.index(...)` calls, in order.
    pub indexes: Vec<Index>,
    /// Not declared `{ minimize: false }`: objects left empty are removed on save and by
    /// `toObject()`.
    pub minimize: bool,
    /// `schema.set("toObject", { virtuals })`, which mongoose also gives the schemas it created
    /// from plain objects inside this one.
    pub to_object_virtuals: Option<bool>,
}

static ID_PATH: LazyLock<Path> = LazyLock::new(|| Path {
    default: Default::FunctionBeforeSetters(|ids| Bson::ObjectId(ids.object_id())),
    ..object_id()
});
static CREATED_AT_PATH: LazyLock<Path> = LazyLock::new(|| Path {
    immutable: true,
    ..date()
});
static UPDATED_AT_PATH: LazyLock<Path> = LazyLock::new(date);

impl Schema {
    pub fn new(fields: Vec<Field>) -> Schema {
        Schema {
            fields,
            id: true,
            timestamps: false,
            indexes: Vec::new(),
            minimize: true,
            to_object_virtuals: None,
        }
    }

    pub fn without_id(mut self) -> Schema {
        self.id = false;
        self
    }

    pub fn with_to_object_virtuals(mut self) -> Schema {
        self.to_object_virtuals = Some(true);
        self
    }

    pub fn without_minimize(mut self) -> Schema {
        self.minimize = false;
        self
    }

    pub fn with_timestamps(mut self) -> Schema {
        self.timestamps = true;
        self
    }

    pub fn index(mut self, keys: &[(&'static str, i32)], options: IndexOptions) -> Schema {
        self.indexes.push(Index {
            keys: keys.iter().map(|(key, direction)| (key.to_string(), *direction)).collect(),
            options,
        });
        self
    }

    /// `schema.tree`'s keys that can hold a value: the fields, then `_id`, then the timestamps.
    pub fn tree_keys(&self) -> Vec<&'static str> {
        let mut keys: Vec<&'static str> = self.fields.iter().map(|field| field.name).collect();
        if self.id {
            keys.push("_id");
        }
        if self.timestamps {
            for key in ["createdAt", "updatedAt"] {
                if !keys.contains(&key) {
                    keys.push(key);
                }
            }
        }
        keys
    }

    /// `schema.paths`, in mongoose's order: every leaf path, dotted, then `_id`, then the
    /// timestamps the schema does not declare itself.
    pub fn paths(&self) -> Vec<(String, &Path)> {
        fn walk<'a>(fields: &'a [Field], prefix: &str, out: &mut Vec<(String, &'a Path)>) {
            for field in fields {
                let path: String = join(prefix, field.name);
                match &field.node {
                    Node::Path(leaf) => out.push((path, leaf)),
                    Node::Nested(children) => walk(children, &path, out),
                }
            }
        }
        let mut out: Vec<(String, &Path)> = Vec::new();
        walk(&self.fields, "", &mut out);
        if self.id {
            out.push(("_id".to_string(), &ID_PATH));
        }
        if self.timestamps {
            for (key, leaf) in [("createdAt", &*CREATED_AT_PATH), ("updatedAt", &*UPDATED_AT_PATH)] {
                if !self.fields.iter().any(|field| field.name == key) {
                    out.push((key.to_string(), leaf));
                }
            }
        }
        out
    }

    /// `schema.nested`: every nested path, dotted, in the order its first leaf appears.
    pub fn nested_paths(&self) -> Vec<String> {
        fn walk(fields: &[Field], prefix: &str, out: &mut Vec<String>) {
            for field in fields {
                if let Node::Nested(children) = &field.node {
                    let path: String = join(prefix, field.name);
                    out.push(path.clone());
                    walk(children, &path, out);
                }
            }
        }
        let mut out: Vec<String> = Vec::new();
        walk(&self.fields, "", &mut out);
        out
    }

    /// The fields of the nested path `path` (empty for the top level), or `None` if it is not
    /// a nested path.
    pub fn nested_fields(&self, path: &str) -> Option<&[Field]> {
        let mut fields: &[Field] = &self.fields;
        if path.is_empty() {
            return Some(fields);
        }
        for piece in path.split('.') {
            match fields.iter().find(|field| field.name == piece).map(|field| &field.node) {
                Some(Node::Nested(children)) => fields = children,
                _ => return None,
            }
        }
        Some(fields)
    }

    /// The leaf path `path` (dotted), if the schema declares one.
    pub fn path(&self, path: &str) -> Option<&Path> {
        self.paths().into_iter().find(|(name, _)| name == path).map(|(_, leaf)| leaf)
    }

    /// `schema.indexes()`: an index for every path declared with `expires`, `unique` or `index`, in
    /// path order, with a subdocument's or document array's own indexes in its place under its
    /// path, then the `schema.index(...)` calls.
    pub fn indexes(&self) -> Vec<Index> {
        let mut out: Vec<Index> = Vec::new();
        for (path, leaf) in self.paths() {
            if let Kind::Subdocument(sub) | Kind::DocumentArray(sub) = &leaf.kind {
                out.extend(sub.indexes().into_iter().map(|index| Index {
                    keys: index.keys.into_iter().map(|(key, direction)| (format!("{path}.{key}"), direction)).collect(),
                    options: index.options,
                }));
                continue;
            }
            if let Some(seconds) = leaf.expires {
                out.push(Index {
                    keys: vec![(path, 1)],
                    options: IndexOptions {
                        expire_after_seconds: Some(seconds),
                        ..IndexOptions::default()
                    },
                });
            } else if leaf.unique {
                out.push(Index {
                    keys: vec![(path, 1)],
                    options: IndexOptions::unique(),
                });
            } else if leaf.index {
                out.push(Index {
                    keys: vec![(path, 1)],
                    options: IndexOptions::default(),
                });
            }
        }
        out.extend(self.indexes.iter().cloned());
        out
    }
}

pub(crate) fn join(prefix: &str, name: &str) -> String {
    if prefix.is_empty() {
        name.to_string()
    } else {
        format!("{prefix}.{name}")
    }
}
