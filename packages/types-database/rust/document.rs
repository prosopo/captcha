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

//! What `Model.create(input)` does in mongoose 9.10, step for step, so a record the Rust
//! writes has the bytes mongoose would have written: the key order, the defaults, the
//! subdocument ids and the BSON number types.
//!
//! Building a document (the `Document` constructor, also used for every subdocument):
//! 1. an empty object for every nested path, in the order its first leaf is declared;
//! 2. defaults that apply before setters: plain values, a plain array's `[]`, `_id`;
//! 3. the given values, top-level keys in schema order. A given nested path is rebuilt from the
//!    given keys in schema order, then filled with every default under it;
//! 4. the top-level keys put back in schema order;
//! 5. defaults that apply after setters, appended: function defaults, a document array's `[]`.
//!
//! Saving it: validation, then the timestamps, then empty objects removed (`minimize`, not
//! inside arrays), then `__v: 0` appended. mongod then moves `_id` to the front.

use crate::number::{as_js_number, decimal128_from_integer, js_number};
use crate::schema::{join, number, DefaultTiming, Field, Ids, Kind, Node, Path, Schema};
use bson::oid::ObjectId;
use bson::{Bson, DateTime, Document};
use prosopo_api_route::schema::string_to_number;
use prosopo_logger::number_to_js_string;
use std::fmt;
use std::sync::LazyLock;

/// A validation failure, as mongoose names it in `ValidationError.errors`: the path and the
/// validator's kind (`required`, `enum`, `min`, `max`), or the type a cast failed for.
#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord)]
pub struct Issue {
    pub path: String,
    pub kind: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ValidationError {
    pub issues: Vec<Issue>,
}

impl fmt::Display for ValidationError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let paths: Vec<String> = self.issues.iter().map(|issue| format!("{} ({})", issue.path, issue.kind)).collect();
        write!(f, "validation failed: {}", paths.join(", "))
    }
}

impl std::error::Error for ValidationError {}

/// `new Model(input)` and `validateSync()`: the document as built, and every issue, sorted by
/// path.
pub fn build(schema: &Schema, input: &Document, ids: &mut dyn Ids) -> (Document, Vec<Issue>) {
    let mut issues: Vec<Issue> = Vec::new();
    let document: Document = construct_model(schema, input, ids, &mut issues);
    validate(schema, &document, "", &mut issues);
    issues.sort();
    (document, issues)
}

/// `Model.create(input)`: the document mongoose hands the driver, or why it refused.
pub fn create(schema: &Schema, input: &Document, ids: &mut dyn Ids) -> Result<Document, ValidationError> {
    let (mut document, issues): (Document, Vec<Issue>) = build(schema, input, ids);
    if !issues.is_empty() {
        return Err(ValidationError { issues });
    }
    if schema.timestamps {
        let created: Bson = match document.get("createdAt") {
            Some(Bson::DateTime(given)) => Bson::DateTime(*given),
            _ => Bson::DateTime(ids.now()),
        };
        document.insert("createdAt", created.clone());
        document.insert("updatedAt", created);
    }
    let mut sent: Document = minimize_schema(schema, document);
    sent.insert("__v", 0);
    Ok(sent)
}

/// `toObject()` of a document as built: `minimize` applied.
pub fn to_object(schema: &Schema, document: Document) -> Document {
    minimize_schema(schema, document)
}

/// The document as mongod stores an insert: `_id` moved to the front.
pub fn stored(mut document: Document) -> Document {
    match document.remove("_id") {
        Some(id) => {
            let mut out: Document = Document::new();
            out.insert("_id", id);
            out.extend(document);
            out
        }
        None => document,
    }
}

/// A stored document as a query without `lean` returns it, after `toObject()`: the model built
/// with `{ skipId: true }` (the nested objects, then the defaults that run before setters), each
/// stored field initialised in stored order (one that replaces a default moves to the end), the
/// remaining function defaults, then `minimize`. With a projection, only the selected paths get
/// their objects and defaults.
pub fn hydrate(schema: &Schema, stored: &Document, projection: Option<&Document>, ids: &mut dyn Ids) -> Document {
    let selection: Selection = Selection::of(projection);
    let mut issues: Vec<Issue> = Vec::new();
    let mut document: Document = selected_skeleton(&schema.fields, "", &selection);
    let selected = |path: &str| path != "_id" && selection.selects(path);
    apply_defaults_to(schema, &mut document, DefaultTiming::Before, "", selected, ids, &mut issues);
    init_fields(schema, stored, &mut document, "", ids, &mut issues);
    apply_defaults_to(schema, &mut document, DefaultTiming::After, "", selected, ids, &mut issues);
    minimize_schema(schema, document)
}

/// The paths a query's projection selects, as mongoose reads it: exclusive when every value
/// (but `_id`'s) is falsy.
struct Selection<'a> {
    fields: Option<&'a Document>,
    exclusive: bool,
}

impl<'a> Selection<'a> {
    fn of(projection: Option<&'a Document>) -> Selection<'a> {
        let fields: Option<&Document> = projection.filter(|fields| !fields.is_empty());
        let exclusive: bool = fields.is_some_and(|fields| {
            let mut values = fields.iter().filter(|(key, _)| key.as_str() != "_id").map(|(_, value)| value);
            let mut seen: bool = false;
            let all_falsy: bool = values.all(|value| {
                seen = true;
                !truthy(value)
            });
            if seen {
                all_falsy
            } else {
                fields.get("_id").is_some_and(|value| !truthy(value))
            }
        });
        Selection { fields, exclusive }
    }

    fn named(&self, path: &str) -> bool {
        let Some(fields) = self.fields else {
            return false;
        };
        let mut prefix: String = String::new();
        for piece in path.split('.') {
            prefix = join(&prefix, piece);
            if fields.contains_key(&prefix) {
                return true;
            }
        }
        false
    }

    fn selects(&self, path: &str) -> bool {
        match self.fields {
            None => true,
            Some(_) if self.exclusive => !self.named(path),
            Some(_) => self.named(path),
        }
    }

    /// A nested object is built if anything under it is selected.
    fn reaches(&self, path: &str) -> bool {
        match self.fields {
            None => true,
            Some(_) if self.exclusive => !self.named(path),
            Some(fields) => self.named(path) || fields.keys().any(|key| key.starts_with(&format!("{path}."))),
        }
    }
}

fn truthy(value: &Bson) -> bool {
    match value {
        Bson::Boolean(flag) => *flag,
        Bson::Null | Bson::Undefined => false,
        Bson::Int32(n) => *n != 0,
        Bson::Int64(n) => *n != 0,
        Bson::Double(n) => *n != 0.0 && !n.is_nan(),
        Bson::String(text) => !text.is_empty(),
        _ => true,
    }
}

fn selected_skeleton(fields: &[Field], prefix: &str, selection: &Selection) -> Document {
    let mut out: Document = Document::new();
    for field in fields {
        if let Node::Nested(children) = &field.node {
            let path: String = join(prefix, field.name);
            if selection.reaches(&path) {
                out.insert(field.name, selected_skeleton(children, &path, selection));
            }
        }
    }
    out
}

/// `init`: each stored key at `prefix`, cast by its path. A key the schema does not declare is
/// kept as stored, an object under it walked as a nested path.
fn init_fields(schema: &Schema, stored: &Document, document: &mut Document, prefix: &str, ids: &mut dyn Ids, issues: &mut Vec<Issue>) {
    for (key, value) in stored {
        let path: String = join(prefix, key);
        let leaf: Option<&Path> = if path == "__v" { Some(&VERSION_KEY) } else { schema.path(&path) };
        match (leaf, value) {
            (None, Bson::Document(inner)) => {
                if !matches!(document.get(key), Some(Bson::Document(_))) {
                    document.insert(key, Document::new());
                }
                if let Some(Bson::Document(target)) = document.get_mut(key) {
                    init_fields(schema, inner, target, &path, ids, issues);
                }
            }
            (None, other) => {
                document.insert(key, other.clone());
            }
            (Some(_), Bson::Undefined) => {}
            (Some(leaf), other) => {
                document.remove(key);
                let initialised: Option<Bson> = match other {
                    Bson::Null => Some(Bson::Null),
                    _ => init_value(&leaf.kind, other, &path, ids, issues),
                };
                if let Some(initialised) = initialised {
                    document.insert(key, initialised);
                }
            }
        }
    }
}

/// `schemaType.cast(value, doc, true)`: as a set casts, but a subdocument is initialised from
/// what was stored rather than built.
fn init_value(kind: &Kind, value: &Bson, path: &str, ids: &mut dyn Ids, issues: &mut Vec<Issue>) -> Option<Bson> {
    match (kind, value) {
        (Kind::Subdocument(sub), Bson::Document(stored)) => Some(Bson::Document(init_subdocument(sub, stored, ids, issues))),
        (Kind::Map(sub), Bson::Document(entries)) => Some(Bson::Document(
            entries
                .iter()
                .map(|(key, entry)| match entry {
                    Bson::Document(stored) => (key.clone(), Bson::Document(init_subdocument(sub, stored, ids, issues))),
                    other => (key.clone(), other.clone()),
                })
                .collect(),
        )),
        (Kind::DocumentArray(sub), Bson::Array(items)) => Some(Bson::Array(
            items
                .iter()
                .map(|item| match item {
                    Bson::Document(stored) => Bson::Document(init_array_element(sub, stored, ids, issues)),
                    other => other.clone(),
                })
                .collect(),
        )),
        (Kind::DocumentArray(sub), Bson::Document(stored)) => Some(Bson::Array(vec![Bson::Document(init_array_element(sub, stored, ids, issues))])),
        (Kind::Array(element), Bson::Array(items)) => {
            let mut out: Vec<Bson> = Vec::with_capacity(items.len());
            for (index, item) in items.iter().enumerate() {
                out.push(match item {
                    Bson::Null => Bson::Null,
                    _ => init_value(element, item, &join(path, &index.to_string()), ids, issues)?,
                });
            }
            Some(Bson::Array(out))
        }
        _ => cast(kind, value, path, ids, issues),
    }
}

/// A single nested subdocument: built with `{ defaults: false }`, initialised, given its function
/// defaults, then every other default.
fn init_subdocument(schema: &Schema, stored: &Document, ids: &mut dyn Ids, issues: &mut Vec<Issue>) -> Document {
    let mut document: Document = skeleton(&schema.fields);
    init_fields(schema, stored, &mut document, "", ids, issues);
    apply_defaults(schema, &mut document, DefaultTiming::After, "", ids, issues);
    apply_defaults(schema, &mut document, DefaultTiming::Before, "", ids, issues);
    document
}

/// A document array's element: built with `{ skipId: false }`, so its `_id` default runs (and
/// takes an id) before the stored one replaces it.
fn init_array_element(schema: &Schema, stored: &Document, ids: &mut dyn Ids, issues: &mut Vec<Issue>) -> Document {
    let mut document: Document = skeleton(&schema.fields);
    apply_defaults(schema, &mut document, DefaultTiming::Before, "", ids, issues);
    init_fields(schema, stored, &mut document, "", ids, issues);
    apply_defaults(schema, &mut document, DefaultTiming::After, "", ids, issues);
    document
}

/// A top-level document: a model's schema also has the version key, `__v`, as a Number path
/// after everything else, so a given `__v` takes that place (and `save` then overwrites it).
fn construct_model(schema: &Schema, input: &Document, ids: &mut dyn Ids, issues: &mut Vec<Issue>) -> Document {
    construct_with(schema, input, "", true, false, ids, issues)
}

/// The `Document` constructor for a subdocument: steps 1 to 5 of the module docs.
pub fn construct(schema: &Schema, input: &Document, prefix: &str, ids: &mut dyn Ids, issues: &mut Vec<Issue>) -> Document {
    construct_with(schema, input, prefix, false, false, ids, issues)
}

/// `findOneAndReplace`'s replacement: the model built with `{ skipId: true }`, validated, and sent
/// minimized without a version key.
pub fn replacement(schema: &Schema, input: &Document, ids: &mut dyn Ids) -> Result<Document, ValidationError> {
    let mut issues: Vec<Issue> = Vec::new();
    let document: Document = construct_with(schema, input, "", true, true, ids, &mut issues);
    validate(schema, &document, "", &mut issues);
    issues.sort();
    if !issues.is_empty() {
        return Err(ValidationError { issues });
    }
    Ok(minimize_schema(schema, document))
}

pub(crate) static VERSION_KEY: LazyLock<Path> = LazyLock::new(number);

fn construct_with(
    schema: &Schema,
    input: &Document,
    prefix: &str,
    model: bool,
    skip_id: bool,
    ids: &mut dyn Ids,
    issues: &mut Vec<Issue>,
) -> Document {
    let mut tree_keys: Vec<&str> = schema.tree_keys();
    if model {
        tree_keys.push("__v");
    }
    let mut document: Document = skeleton(&schema.fields);
    apply_defaults_to(schema, &mut document, DefaultTiming::Before, prefix, |path| !(skip_id && path == "_id"), ids, issues);
    for key in keys_in_schema_order(&tree_keys, input) {
        let value: &Bson = &input[key];
        let full: String = join(prefix, key);
        let target: Option<TopLevel> = match key {
            "__v" if model => Some(TopLevel::Path(&VERSION_KEY)),
            _ => top_level(schema, key),
        };
        match target {
            Some(TopLevel::Nested(children)) => match value {
                Bson::Document(given) => {
                    document.insert(key, set_nested(children, given, &full, ids, issues));
                    apply_defaults_to_nested(schema, &mut document, key, prefix, ids, issues);
                }
                Bson::Undefined | Bson::Null => {
                    document.insert(key, value.clone());
                }
                _ => {}
            },
            Some(TopLevel::Path(_)) if matches!(value, Bson::Undefined) && holds_value(document.get(key)) => {}
            Some(TopLevel::Path(leaf)) => {
                if let Some(cast) = cast(&leaf.kind, value, &full, ids, issues) {
                    document.insert(key, cast);
                }
            }
            None => {}
        }
    }
    let mut ordered: Document = Document::new();
    for key in tree_keys {
        if let Some(value) = document.remove(key) {
            ordered.insert(key, value);
        }
    }
    ordered.extend(document);
    apply_defaults(schema, &mut ordered, DefaultTiming::After, prefix, ids, issues);
    ordered
}

enum TopLevel<'a> {
    Nested(&'a [Field]),
    Path(&'a Path),
}

fn top_level<'a>(schema: &'a Schema, key: &str) -> Option<TopLevel<'a>> {
    match schema.fields.iter().find(|field| field.name == key) {
        Some(Field {
            node: Node::Nested(children),
            ..
        }) => Some(TopLevel::Nested(children)),
        Some(Field { node: Node::Path(leaf), .. }) => Some(TopLevel::Path(leaf)),
        None => schema.paths().into_iter().find(|(path, _)| path == key).map(|(_, leaf)| leaf).map(TopLevel::Path),
    }
}

/// `$__buildDoc`.
fn skeleton(fields: &[Field]) -> Document {
    let mut out: Document = Document::new();
    for field in fields {
        if let Node::Nested(children) = &field.node {
            out.insert(field.name, skeleton(children));
        }
    }
    out
}

/// `getKeysInSchemaOrder`: the given keys the schema knows, in its order, then the rest.
fn keys_in_schema_order<'a>(schema_keys: &[&str], given: &'a Document) -> Vec<&'a str> {
    let mut out: Vec<&'a str> = Vec::new();
    for key in schema_keys {
        if let Some(given_key) = given.keys().find(|given_key| given_key.as_str() == *key) {
            out.push(given_key.as_str());
        }
    }
    for key in given.keys() {
        if !schema_keys.contains(&key.as_str()) {
            out.push(key.as_str());
        }
    }
    out
}

/// A given nested path, rebuilt from the given keys in schema order. Undeclared keys go.
fn set_nested(fields: &[Field], given: &Document, path: &str, ids: &mut dyn Ids, issues: &mut Vec<Issue>) -> Document {
    let names: Vec<&str> = fields.iter().map(|field| field.name).collect();
    let mut out: Document = Document::new();
    for key in keys_in_schema_order(&names, given) {
        let full: String = join(path, key);
        match fields.iter().find(|field| field.name == key).map(|field| &field.node) {
            Some(Node::Nested(children)) => {
                if let Bson::Document(inner) = &given[key] {
                    out.insert(key, set_nested(children, inner, &full, ids, issues));
                }
            }
            Some(Node::Path(leaf)) => {
                if let Some(cast) = cast(&leaf.kind, &given[key], &full, ids, issues) {
                    out.insert(key, cast);
                }
            }
            None => {}
        }
    }
    out
}

/// Whether a key holds something other than JS `undefined`.
fn holds_value(value: Option<&Bson>) -> bool {
    !matches!(value, None | Some(Bson::Undefined))
}

/// `applyDefaults`, for one timing: each path's default where the path holds nothing yet.
fn apply_defaults(
    schema: &Schema,
    document: &mut Document,
    timing: DefaultTiming,
    prefix: &str,
    ids: &mut dyn Ids,
    issues: &mut Vec<Issue>,
) {
    apply_defaults_to(schema, document, timing, prefix, |_| true, ids, issues);
}

fn apply_defaults_to(
    schema: &Schema,
    document: &mut Document,
    timing: DefaultTiming,
    prefix: &str,
    wanted: impl Fn(&str) -> bool,
    ids: &mut dyn Ids,
    issues: &mut Vec<Issue>,
) {
    for (path, leaf) in schema.paths() {
        if leaf.timing() != timing || !wanted(&path) {
            continue;
        }
        let pieces: Vec<&str> = path.split('.').collect();
        let Some(parent) = descend(document, &pieces[..pieces.len() - 1], false) else {
            continue;
        };
        let last: &str = pieces[pieces.len() - 1];
        if holds_value(parent.get(last)) {
            continue;
        }
        if let Some(value) = default_for(leaf, &join(prefix, &path), ids, issues) {
            parent.insert(last, value);
        }
    }
}

/// `$applyDefaultsToNested`: every default under the given top-level nested path, whatever its
/// timing, creating the objects on the way.
fn apply_defaults_to_nested(
    schema: &Schema,
    document: &mut Document,
    nested: &str,
    prefix: &str,
    ids: &mut dyn Ids,
    issues: &mut Vec<Issue>,
) {
    let start: String = format!("{nested}.");
    for (path, leaf) in schema.paths() {
        if !path.starts_with(&start) || leaf.timing() == DefaultTiming::None {
            continue;
        }
        let pieces: Vec<&str> = path.split('.').collect();
        let Some(parent) = descend(document, &pieces[..pieces.len() - 1], true) else {
            continue;
        };
        let last: &str = pieces[pieces.len() - 1];
        if holds_value(parent.get(last)) {
            continue;
        }
        if let Some(value) = default_for(leaf, &join(prefix, &path), ids, issues) {
            parent.insert(last, value);
        }
    }
}

fn descend<'a>(document: &'a mut Document, pieces: &[&str], create: bool) -> Option<&'a mut Document> {
    let mut cursor: &'a mut Document = document;
    for piece in pieces {
        if create && !matches!(cursor.get(*piece), Some(Bson::Document(_))) {
            cursor.insert(*piece, Document::new());
        }
        cursor = match cursor.get_mut(*piece) {
            Some(Bson::Document(inner)) => inner,
            _ => return None,
        };
    }
    Some(cursor)
}

fn default_for(leaf: &Path, path: &str, ids: &mut dyn Ids, issues: &mut Vec<Issue>) -> Option<Bson> {
    let value: Bson = leaf.default_value_for(ids)?;
    cast(&leaf.kind, &value, path, ids, issues)
}

fn cast_issue(issues: &mut Vec<Issue>, path: &str, kind: &str) -> Option<Bson> {
    issues.push(Issue {
        path: path.to_string(),
        kind: kind.to_string(),
    });
    None
}

/// A given value cast to the path's type, or `None` (with an issue) if mongoose cannot cast it.
pub(crate) fn cast(kind: &Kind, value: &Bson, path: &str, ids: &mut dyn Ids, issues: &mut Vec<Issue>) -> Option<Bson> {
    if matches!(value, Bson::Null | Bson::Undefined) {
        return Some(value.clone());
    }
    match kind {
        Kind::String => match cast_string(value) {
            Some(text) => Some(Bson::String(text)),
            None => cast_issue(issues, path, "String"),
        },
        Kind::Number => match cast_number(value) {
            Some(Some(number)) => Some(js_number(number)),
            Some(None) => Some(Bson::Null),
            None => cast_issue(issues, path, "Number"),
        },
        Kind::Boolean => match cast_boolean(value) {
            Some(flag) => Some(Bson::Boolean(flag)),
            None => cast_issue(issues, path, "Boolean"),
        },
        Kind::Date => match cast_date(value) {
            Some(Some(date)) => Some(Bson::DateTime(date)),
            Some(None) => Some(Bson::Null),
            None => cast_issue(issues, path, "date"),
        },
        Kind::ObjectId => match value {
            Bson::ObjectId(_) => Some(value.clone()),
            Bson::String(text) if text.len() == 24 => match ObjectId::parse_str(text) {
                Ok(id) => Some(Bson::ObjectId(id)),
                Err(_) => cast_issue(issues, path, "ObjectId"),
            },
            _ => cast_issue(issues, path, "ObjectId"),
        },
        Kind::Mixed => Some(mixed(value)),
        Kind::IpHalf => match value {
            Bson::Decimal128(_) => Some(value.clone()),
            Bson::Int64(long) => Some(Bson::Decimal128(decimal128_from_integer(i128::from(*long as u64)))),
            Bson::String(text) => match text.parse::<i128>() {
                Ok(integer) if text.bytes().all(|b| b.is_ascii_digit() || b == b'-') => {
                    Some(Bson::Decimal128(decimal128_from_integer(integer)))
                }
                _ => cast_issue(issues, path, "Decimal128"),
            },
            Bson::Int32(_) | Bson::Double(_) => match as_js_number(value) {
                Some(number) if number.fract() == 0.0 && number.abs() < 1e30 => {
                    Some(Bson::Decimal128(decimal128_from_integer(number as i128)))
                }
                _ => cast_issue(issues, path, "Decimal128"),
            },
            _ => cast_issue(issues, path, "Decimal128"),
        },
        Kind::Array(element) => {
            let items: Vec<Bson> = match value {
                Bson::Array(items) => items.clone(),
                single => vec![single.clone()],
            };
            let mut out: Vec<Bson> = Vec::with_capacity(items.len());
            for (index, item) in items.iter().enumerate() {
                out.push(cast(element, item, &join(path, &index.to_string()), ids, issues)?);
            }
            Some(Bson::Array(out))
        }
        Kind::DocumentArray(schema) => {
            let Bson::Array(items) = value else {
                return cast_issue(issues, path, "DocumentArray");
            };
            let mut out: Vec<Bson> = Vec::with_capacity(items.len());
            for (index, item) in items.iter().enumerate() {
                let Bson::Document(given) = item else {
                    return cast_issue(issues, path, "DocumentArray");
                };
                out.push(Bson::Document(construct(schema, given, &join(path, &index.to_string()), ids, issues)));
            }
            Some(Bson::Array(out))
        }
        Kind::Subdocument(schema) => match value {
            Bson::Document(given) => Some(Bson::Document(construct(schema, given, path, ids, issues))),
            _ => cast_issue(issues, path, "Embedded"),
        },
        Kind::Map(schema) => {
            let Bson::Document(entries) = value else {
                return cast_issue(issues, path, "Map");
            };
            let mut out: Document = Document::new();
            for (key, entry) in entries {
                let Bson::Document(given) = entry else {
                    return cast_issue(issues, path, "Map");
                };
                out.insert(key, construct(schema, given, &join(path, key), ids, issues));
            }
            Some(Bson::Document(out))
        }
        Kind::ValueMap(element) => {
            let Bson::Document(entries) = value else {
                return cast_issue(issues, path, "Map");
            };
            let mut out: Document = Document::new();
            for (key, entry) in entries {
                out.insert(key, cast(&element.kind, entry, &join(path, key), ids, issues)?);
            }
            Some(Bson::Document(out))
        }
    }
}

/// `castString`: what `value.toString()` gives for the primitives a typed record can hold.
fn cast_string(value: &Bson) -> Option<String> {
    match value {
        Bson::String(text) => Some(text.clone()),
        Bson::Boolean(flag) => Some(flag.to_string()),
        Bson::ObjectId(id) => Some(id.to_hex()),
        Bson::Decimal128(decimal) => Some(decimal.to_string()),
        number => as_js_number(number).map(number_to_js_string),
    }
}

/// `castNumber`: `Number(...)` of a string or a boolean, `""` as null; `None` if NaN.
fn cast_number(value: &Bson) -> Option<Option<f64>> {
    let number: f64 = match value {
        Bson::String(text) if text.is_empty() => return Some(None),
        Bson::String(text) => string_to_number(text),
        Bson::Boolean(flag) => f64::from(u8::from(*flag)),
        other => as_js_number(other)?,
    };
    (!number.is_nan()).then_some(Some(number))
}

/// `castBoolean`: `true`, `"true"`, `1`, `"1"`, `"yes"` and their opposites.
fn cast_boolean(value: &Bson) -> Option<bool> {
    match value {
        Bson::Boolean(flag) => Some(*flag),
        Bson::String(text) => match text.as_str() {
            "true" | "1" | "yes" => Some(true),
            "false" | "0" | "no" => Some(false),
            _ => None,
        },
        number => match as_js_number(number)? {
            n if n == 1.0 => Some(true),
            n if n == 0.0 => Some(false),
            _ => None,
        },
    }
}

/// `castDate`: a date, or a number of milliseconds within the JS date range (`""` is null). A
/// boolean throws; date strings are not parsed (no typed record carries one).
fn cast_date(value: &Bson) -> Option<Option<DateTime>> {
    const MAX_TIME: f64 = 8.64e15;
    match value {
        Bson::DateTime(date) => Some(Some(*date)),
        Bson::String(text) if text.is_empty() => Some(None),
        Bson::Boolean(_) => None,
        number => {
            let millis: f64 = as_js_number(number)?;
            (millis.is_finite() && millis.abs() <= MAX_TIME).then(|| Some(DateTime::from_millis(millis.trunc() as i64)))
        }
    }
}

/// A Mixed value as JS holds it: every number a JS number.
pub(crate) fn mixed(value: &Bson) -> Bson {
    match value {
        Bson::Int32(_) | Bson::Int64(_) | Bson::Double(_) => js_number(as_js_number(value).unwrap_or(f64::NAN)),
        Bson::Array(items) => Bson::Array(items.iter().map(mixed).collect()),
        Bson::Document(entries) => Bson::Document(entries.iter().map(|(key, entry)| (key.clone(), mixed(entry))).collect()),
        other => other.clone(),
    }
}

fn lookup<'a>(document: &'a Document, path: &str) -> Option<&'a Bson> {
    let mut cursor: &Document = document;
    let pieces: Vec<&str> = path.split('.').collect();
    for piece in &pieces[..pieces.len() - 1] {
        cursor = match cursor.get(*piece) {
            Some(Bson::Document(inner)) => inner,
            _ => return None,
        };
    }
    cursor.get(pieces[pieces.len() - 1])
}

fn satisfies_required(kind: &Kind, value: Option<&Bson>) -> bool {
    match (kind, value) {
        (_, None | Some(Bson::Null | Bson::Undefined)) => false,
        (Kind::String, Some(Bson::String(text))) => !text.is_empty(),
        (Kind::String, Some(_)) => false,
        _ => true,
    }
}

/// `$validate`: per path, the first validator that fails (required, then enum or the bounds),
/// then each subdocument's own paths.
pub fn validate(schema: &Schema, document: &Document, prefix: &str, issues: &mut Vec<Issue>) {
    for (path, leaf) in schema.paths() {
        let full: String = join(prefix, &path);
        let value: Option<&Bson> = lookup(document, &path);
        let push = |issues: &mut Vec<Issue>, kind: &str| {
            issues.push(Issue {
                path: full.clone(),
                kind: kind.to_string(),
            })
        };
        if leaf.required && !satisfies_required(&leaf.kind, value) {
            push(issues, "required");
            continue;
        }
        match (&leaf.kind, value) {
            (Kind::String, Some(Bson::String(text))) => {
                if let Some(values) = &leaf.enum_values {
                    if !values.iter().any(|allowed| allowed == text) {
                        push(issues, "enum");
                    }
                }
            }
            (Kind::Number, Some(number)) => {
                if let Some(number) = as_js_number(number) {
                    if leaf.min.is_some_and(|min| number < min) {
                        push(issues, "min");
                    } else if leaf.max.is_some_and(|max| number > max) {
                        push(issues, "max");
                    }
                }
            }
            (Kind::Array(element), Some(Bson::Array(items))) => {
                if let Some(values) = &leaf.enum_values {
                    validate_element_enum(element, items, values, &full, issues);
                }
            }
            (Kind::Subdocument(sub), Some(Bson::Document(inner))) => validate(sub, inner, &full, issues),
            (Kind::DocumentArray(sub), Some(Bson::Array(items))) => {
                for (index, item) in items.iter().enumerate() {
                    if let Bson::Document(inner) = item {
                        validate(sub, inner, &join(&full, &index.to_string()), issues);
                    }
                }
            }
            (Kind::Map(sub), Some(Bson::Document(entries))) => {
                for (key, entry) in entries {
                    if let Bson::Document(inner) = entry {
                        validate(sub, inner, &join(&full, key), issues);
                    }
                }
            }
            _ => {}
        }
    }
}

/// An enum on an array's strings applies to each one, at any depth (`inputMethods.0.1`).
fn validate_element_enum(element: &Kind, items: &[Bson], values: &[String], path: &str, issues: &mut Vec<Issue>) {
    for (index, item) in items.iter().enumerate() {
        let at: String = join(path, &index.to_string());
        match (element, item) {
            (Kind::Array(inner), Bson::Array(nested)) => validate_element_enum(inner, nested, values, &at, issues),
            (Kind::String, Bson::String(text)) if !values.iter().any(|allowed| allowed == text) => issues.push(Issue {
                path: at,
                kind: "enum".to_string(),
            }),
            _ => {}
        }
    }
}

/// mongoose's `minimize`, as `toObject` applies it: an object left empty is removed, but an
/// array element is kept however empty, and so is a Map. Objects inside arrays are minimized.
fn minimize_with(fields: &[Field], schema: Option<&Schema>, document: Document) -> Document {
    let mut out: Document = Document::new();
    for (key, value) in document {
        let field: Option<&Node> = fields.iter().find(|field| field.name == key).map(|field| &field.node);
        let leaf: Option<&Path> = match field {
            Some(Node::Path(leaf)) => Some(leaf),
            Some(Node::Nested(_)) => None,
            None => schema.and_then(|schema| schema.path(&key)),
        };
        let kept: Option<Bson> = match (field, leaf.map(|leaf| &leaf.kind), value) {
            (_, _, Bson::Undefined) => None,
            (Some(Node::Nested(children)), _, Bson::Document(inner)) => non_empty(minimize_with(children, None, inner)),
            (_, Some(Kind::Map(sub)), Bson::Document(entries)) => Some(Bson::Document(
                entries
                    .into_iter()
                    .map(|(name, entry)| match entry {
                        Bson::Document(inner) => (name, Bson::Document(minimize_schema(sub, inner))),
                        other => (name, other),
                    })
                    .collect(),
            )),
            (_, Some(Kind::ValueMap(_)), Bson::Document(entries)) => Some(Bson::Document(entries)),
            (_, Some(Kind::Subdocument(sub)), Bson::Document(inner)) => non_empty(minimize_schema(sub, inner)),
            (_, Some(Kind::DocumentArray(sub)), Bson::Array(items)) => Some(Bson::Array(
                items
                    .into_iter()
                    .map(|item| match item {
                        Bson::Document(inner) => Bson::Document(minimize_schema(sub, inner)),
                        other => other,
                    })
                    .collect(),
            )),
            (_, _, other) => minimize_value(other),
        };
        if let Some(value) = kept {
            out.insert(key, value);
        }
    }
    out
}

pub(crate) fn minimize_schema(schema: &Schema, document: Document) -> Document {
    minimize_with(&schema.fields, Some(schema), document)
}

fn non_empty(document: Document) -> Option<Bson> {
    (!document.is_empty()).then_some(Bson::Document(document))
}

/// A value outside any declared subdocument (a Mixed value, an array of primitives).
fn minimize_value(value: Bson) -> Option<Bson> {
    match value {
        Bson::Undefined => None,
        Bson::Document(inner) => non_empty(minimize_plain(inner)),
        Bson::Array(items) => Some(Bson::Array(items.into_iter().map(minimize_element).collect())),
        other => Some(other),
    }
}

fn minimize_plain(document: Document) -> Document {
    document
        .into_iter()
        .filter_map(|(key, value)| minimize_value(value).map(|value| (key, value)))
        .collect()
}

fn minimize_element(value: Bson) -> Bson {
    match value {
        Bson::Undefined => Bson::Null,
        Bson::Document(inner) => Bson::Document(minimize_plain(inner)),
        Bson::Array(items) => Bson::Array(items.into_iter().map(minimize_element).collect()),
        other => other,
    }
}
