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

//! The update and filter mongoose 9.10 sends for `updateOne`, `updateMany`, `bulkWrite`'s
//! `updateOne` and `findOneAndUpdate`, so a Rust update changes a record exactly as the TS
//! update would.
//!
//! An update:
//! 1. on upsert, `$setOnInsert: { __v: 0 }` is added to it as given (`decorateUpdateWithVersionKey`);
//! 2. its operators are taken in reverse order, keys that are not operators going into `$set`
//!    (also in reverse), and each operator's paths are cast in place: a single subdocument is
//!    built as a new document (defaults, `_id`), a document array's elements likewise, a nested
//!    object is walked key by key, an undeclared path or an `undefined` value is dropped, and an
//!    operator left empty goes (`castUpdate`);
//! 3. on upsert, every path with a default that neither the update nor an equality in the
//!    filter touches is added to `$setOnInsert`, in schema order (`setDefaultsOnInsert`).
//!
//! A pipeline update (an array of stages) is not cast at all: the driver serialises it as given.

use crate::document::{cast, minimize_schema, mixed, validate_path, Issue, ValidationError, VERSION_KEY};
use crate::number::{as_js_number, js_number};
use crate::schema::{join, Ids, Kind, Path, Schema};
use bson::oid::ObjectId;
use bson::{Bson, Document};
use std::fmt;

const UPDATE_OPERATORS: [&str; 15] = [
    "$currentDate",
    "$inc",
    "$min",
    "$max",
    "$mul",
    "$rename",
    "$set",
    "$setOnInsert",
    "$unset",
    "$addToSet",
    "$pop",
    "$pull",
    "$push",
    "$pullAll",
    "$bit",
];

/// A value mongoose could not cast, which makes it throw before anything is sent.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CastError {
    pub issues: Vec<Issue>,
}

impl fmt::Display for CastError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let paths: Vec<String> = self.issues.iter().map(|issue| format!("{} ({})", issue.path, issue.kind)).collect();
        write!(f, "cast failed: {}", paths.join(", "))
    }
}

impl std::error::Error for CastError {}

/// What a path names in a schema, following subdocuments for dotted paths.
enum Target<'a> {
    Leaf(&'a Path),
    Nested,
    Unknown,
}

/// An element of an array named in a path: an index, `$`, or an array filter's `$[...]`. A
/// path through a document array may name one, or go straight to the elements' field as a
/// query on every element does.
fn is_array_position(segment: &str) -> bool {
    segment == "$" || (segment.starts_with("$[") && segment.ends_with(']')) || (!segment.is_empty() && segment.bytes().all(|b| b.is_ascii_digit()))
}

fn resolve<'a>(schema: &'a Schema, path: &str) -> Target<'a> {
    if let Some(leaf) = schema.path(path) {
        return Target::Leaf(leaf);
    }
    if schema.nested_paths().iter().any(|nested| nested == path) {
        return Target::Nested;
    }
    for (prefix, leaf) in schema.paths() {
        let start: String = format!("{prefix}.");
        if let Some(rest) = path.strip_prefix(&start) {
            return match &leaf.kind {
                Kind::Subdocument(sub) => resolve(sub, rest),
                Kind::DocumentArray(sub) => match rest.split_once('.') {
                    Some((position, deeper)) if is_array_position(position) => resolve(sub, deeper),
                    None if is_array_position(rest) => Target::Unknown,
                    _ => resolve(sub, rest),
                },
                Kind::Map(sub) => match rest.split_once('.') {
                    Some((_, deeper)) => resolve(sub, deeper),
                    None => Target::Unknown,
                },
                Kind::ValueMap(element) if !rest.contains('.') => Target::Leaf(element),
                Kind::Mixed => Target::Unknown,
                _ => Target::Unknown,
            };
        }
    }
    Target::Unknown
}

/// `castForQuery(null, value)` in an overwriting operator (`$set`, `$setOnInsert`). A subdocument
/// built here is sent as its `toBSON()`, which minimizes it.
fn cast_value(leaf: &Path, value: &Bson, path: &str, ids: &mut dyn Ids, issues: &mut Vec<Issue>) -> Option<Bson> {
    let cast_value: Bson = match &leaf.kind {
        Kind::Mixed => return Some(mixed(value)),
        kind => cast(kind, value, path, ids, issues)?,
    };
    Some(match (&leaf.kind, cast_value) {
        (Kind::Subdocument(sub), Bson::Document(built)) => Bson::Document(minimize_schema(sub, built)),
        (Kind::Map(sub), Bson::Document(entries)) => Bson::Document(
            entries
                .into_iter()
                .map(|(key, entry)| match entry {
                    Bson::Document(built) => (key, Bson::Document(minimize_schema(sub, built))),
                    other => (key, other),
                })
                .collect(),
        ),
        (Kind::DocumentArray(sub), Bson::Array(items)) => Bson::Array(
            items
                .into_iter()
                .map(|item| match item {
                    Bson::Document(built) => Bson::Document(minimize_schema(sub, built)),
                    other => other,
                })
                .collect(),
        ),
        (_, other) => other,
    })
}

/// `walkUpdatePath`: the operator's object cast in place, its key order kept.
fn walk(
    schema: &Schema,
    object: &Document,
    op: &str,
    prefix: &str,
    ids: &mut dyn Ids,
    issues: &mut Vec<Issue>,
) -> Document {
    let mut out: Document = Document::new();
    let keys: Vec<&String> = object.keys().collect();
    let mut cast_values: Vec<Option<Bson>> = vec![None; keys.len()];
    for index in (0..keys.len()).rev() {
        let key: &str = keys[index];
        let value: &Bson = &object[key];
        let path: String = join(prefix, key);
        let target: Target = if path == "__v" { Target::Leaf(&VERSION_KEY) } else { resolve(schema, &path) };
        cast_values[index] = match (target, value) {
            (_, Bson::Undefined) => None,
            (Target::Leaf(leaf), _) if leaf.immutable && op != "$setOnInsert" => None,
            (Target::Leaf(_), _) if op == "$unset" => Some(value.clone()),
            (Target::Leaf(leaf @ Path { kind: Kind::Array(_), .. }), _) if op == "$addToSet" || op == "$push" => {
                cast_array_addition(leaf, value, &path, ids, issues)
            }
            (Target::Leaf(leaf), _) => cast_value(leaf, value, &path, ids, issues),
            (Target::Nested, Bson::Document(inner)) if op != "$unset" => {
                Some(Bson::Document(walk(schema, inner, op, &path, ids, issues)))
            }
            (Target::Nested, _) => Some(value.clone()),
            (Target::Unknown, _) => None,
        };
    }
    for (key, value) in keys.iter().zip(cast_values) {
        if let Some(value) = value {
            out.insert(key.as_str(), value);
        }
    }
    out
}

/// `$addToSet` or `$push` on an array of primitives: `$each`'s values cast as the array's, its
/// other modifiers kept as given; a single value cast as one element.
fn cast_array_addition(leaf: &Path, value: &Bson, path: &str, ids: &mut dyn Ids, issues: &mut Vec<Issue>) -> Option<Bson> {
    let Kind::Array(element) = &leaf.kind else {
        return cast_value(leaf, value, path, ids, issues);
    };
    match value {
        Bson::Document(modifiers) if modifiers.contains_key("$each") => {
            let mut out: Document = Document::new();
            for (key, inner) in modifiers {
                let cast_inner: Bson = if key == "$each" { cast(&leaf.kind, inner, path, ids, issues)? } else { inner.clone() };
                out.insert(key.clone(), cast_inner);
            }
            Some(Bson::Document(out))
        }
        single => cast(element, single, path, ids, issues),
    }
}

/// Each method decorates an upsert in its own order, which decides where `$setOnInsert` and its
/// keys land: `updateOne` and `updateMany` add `__v: 0` to the update as given, cast it, then add
/// the defaults; `bulkWrite` adds the defaults and then `__v: 0` to the update as given and casts
/// the lot; `findOneAndUpdate` casts first, then adds `__v: 0`, then the defaults.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum UpdateMethod {
    UpdateOne,
    UpdateMany,
    BulkWriteUpdateOne,
    FindOneAndUpdate,
}

/// The update mongoose sends, or the casts that made it throw.
pub fn cast_update(
    schema: &Schema,
    method: UpdateMethod,
    update: &Document,
    filter: &Document,
    upsert: bool,
    ids: &mut dyn Ids,
) -> Result<Document, CastError> {
    let mut raw: Document = update.clone();
    match method {
        UpdateMethod::UpdateOne | UpdateMethod::UpdateMany => {
            if upsert {
                decorate_with_version_key(&mut raw);
            }
            apply_timestamps(schema, &mut raw, upsert, ids);
        }
        UpdateMethod::BulkWriteUpdateOne => {
            apply_timestamps(schema, &mut raw, upsert, ids);
            if upsert {
                set_defaults_on_insert(schema, filter, &mut raw, false, ids);
                decorate_with_version_key(&mut raw);
            }
        }
        UpdateMethod::FindOneAndUpdate => apply_timestamps(schema, &mut raw, upsert, ids),
    }
    if upsert {
        move_immutable_properties(schema, &mut raw);
    }
    let mut ret: Document = Document::new();
    let mut ops: Vec<String> = raw.keys().cloned().collect();
    let mut index: usize = ops.len();
    while index > 0 {
        index -= 1;
        let op: String = ops[index].clone();
        if !UPDATE_OPERATORS.contains(&op.as_str()) {
            if !ret.contains_key("$set") {
                let start: Document = match raw.get("$set") {
                    Some(Bson::Document(existing)) => existing.clone(),
                    _ => Document::new(),
                };
                ret.insert("$set", start);
            }
            if let Some(Bson::Document(set)) = ret.get_mut("$set") {
                set.insert(op.clone(), raw[&op].clone());
            }
            ops.remove(index);
            if !ops.iter().any(|existing| existing == "$set") {
                ops.push("$set".to_string());
            }
        } else if op == "$set" {
            if !ret.contains_key("$set") {
                ret.insert("$set", raw[&op].clone());
            }
        } else {
            ret.insert(op.clone(), raw[&op].clone());
        }
    }
    let mut issues: Vec<Issue> = Vec::new();
    let mut index: usize = ops.len();
    while index > 0 {
        index -= 1;
        let op: &str = &ops[index];
        let Some(Bson::Document(value)) = ret.get(op) else {
            continue;
        };
        let walked: Document = walk(schema, value, op, "", ids, &mut issues);
        if walked.is_empty() {
            ret.remove(op);
        } else {
            ret.insert(op, walked);
        }
    }
    if !issues.is_empty() {
        return Err(CastError { issues });
    }
    if ret.is_empty() && upsert && !filter.is_empty() {
        ret.insert("$setOnInsert", filter.clone());
    }
    if upsert {
        match method {
            UpdateMethod::UpdateOne | UpdateMethod::UpdateMany => set_defaults_on_insert(schema, filter, &mut ret, true, ids),
            UpdateMethod::FindOneAndUpdate => {
                decorate_with_version_key(&mut ret);
                set_defaults_on_insert(schema, filter, &mut ret, true, ids);
            }
            UpdateMethod::BulkWriteUpdateOne => {}
        }
    }
    Ok(undefined_to_null(ret))
}

/// `runValidators` on a cast update: each path it sets, sets on insert or unsets, through that
/// path's validators, an unset path's value being `undefined`. Paths under other operators are
/// not validated, as mongoose does not validate them.
pub fn validate_update(schema: &Schema, update: &Document) -> Result<(), ValidationError> {
    fn walk(schema: &Schema, path: &str, value: Option<&Bson>, issues: &mut Vec<Issue>) {
        if let Some(leaf) = schema.path(path) {
            validate_path(leaf, leaf.required, value, path, issues);
        } else if let (Some(_), Some(Bson::Document(children))) = (schema.nested_fields(path), value) {
            for (key, child) in children {
                walk(schema, &join(path, key), Some(child), issues);
            }
        }
    }
    let mut issues: Vec<Issue> = Vec::new();
    for (op, fields) in update {
        let (Bson::Document(fields), true) = (fields, ["$set", "$setOnInsert", "$unset"].contains(&op.as_str())) else {
            continue;
        };
        for (path, value) in fields {
            walk(schema, path, (op != "$unset").then_some(value), &mut issues);
        }
    }
    if issues.is_empty() {
        Ok(())
    } else {
        Err(ValidationError { issues })
    }
}

/// The driver writes a JS `undefined` that survives casting (inside a Mixed value) as `null`.
fn undefined_to_null(document: Document) -> Document {
    document.into_iter().map(|(key, value)| (key, undefined_value_to_null(value))).collect()
}

fn undefined_value_to_null(value: Bson) -> Bson {
    match value {
        Bson::Undefined => Bson::Null,
        Bson::Document(inner) => Bson::Document(undefined_to_null(inner)),
        Bson::Array(items) => Bson::Array(items.into_iter().map(undefined_value_to_null).collect()),
        other => other,
    }
}

fn truthy_value(value: Option<&Bson>) -> bool {
    match value {
        None | Some(Bson::Undefined | Bson::Null) => false,
        Some(Bson::Boolean(flag)) => *flag,
        Some(Bson::String(text)) => !text.is_empty(),
        Some(other) => as_js_number(other).map(|n| n != 0.0 && !n.is_nan()).unwrap_or(true),
    }
}

/// `applyTimestampsToUpdate`, for a schema with timestamps: `updatedAt` set to now, a given
/// `createdAt` dropped, and on upsert `createdAt` set to now on insert.
fn apply_timestamps(schema: &Schema, update: &mut Document, upsert: bool, ids: &mut dyn Ids) {
    if !schema.timestamps {
        return;
    }
    let now: Bson = Bson::DateTime(ids.now());
    if !matches!(update.get("$set"), Some(Bson::Document(_))) {
        update.insert("$set", Document::new());
    }
    if let Some(Bson::Document(set)) = update.get_mut("$set") {
        set.insert("updatedAt", now.clone());
    }
    update.remove("updatedAt");
    if truthy_value(update.get("createdAt")) {
        update.remove("createdAt");
    }
    if let Some(Bson::Document(set)) = update.get_mut("$set") {
        if truthy_value(set.get("createdAt")) {
            set.remove("createdAt");
        }
    }
    if upsert {
        if !matches!(update.get("$setOnInsert"), Some(Bson::Document(_))) {
            update.insert("$setOnInsert", Document::new());
        }
        if let Some(Bson::Document(set_on_insert)) = update.get_mut("$setOnInsert") {
            set_on_insert.insert("createdAt", now);
        }
    }
    if matches!(update.get("$set"), Some(Bson::Document(set)) if set.is_empty()) {
        update.remove("$set");
    }
}

/// `moveImmutableProperties`: on upsert an immutable path given in `$set` (or as a plain key)
/// moves to `$setOnInsert`, whatever its value.
fn move_immutable_properties(schema: &Schema, update: &mut Document) {
    let immutable = |path: &str| schema.path(path).is_some_and(|leaf| leaf.immutable);
    let keys: Vec<String> = update.keys().cloned().collect();
    for key in keys {
        let moved: Vec<(String, Bson)> = if key == "$set" {
            let Some(Bson::Document(set)) = update.get_mut("$set") else {
                continue;
            };
            let paths: Vec<String> = set.keys().filter(|path| immutable(path)).cloned().collect();
            paths.into_iter().filter_map(|path| set.remove(&path).map(|value| (path, value))).collect()
        } else if !key.starts_with('$') && immutable(&key) {
            update.remove(&key).map(|value| vec![(key.clone(), value)]).unwrap_or_default()
        } else {
            Vec::new()
        };
        for (path, value) in moved {
            if !matches!(update.get("$setOnInsert"), Some(Bson::Document(_))) {
                update.insert("$setOnInsert", Document::new());
            }
            if let Some(Bson::Document(set_on_insert)) = update.get_mut("$setOnInsert") {
                set_on_insert.insert(path, value);
            }
        }
    }
}

fn decorate_with_version_key(update: &mut Document) {
    let has = |key: &str, update: &Document| -> bool {
        update.contains_key(key)
            || ["$set", "$inc", "$setOnInsert"]
                .iter()
                .any(|op| matches!(update.get(*op), Some(Bson::Document(inner)) if inner.contains_key(key)))
    };
    if has("__v", update) {
        return;
    }
    if !matches!(update.get("$setOnInsert"), Some(Bson::Document(_))) {
        update.insert("$setOnInsert", Document::new());
    }
    if let Some(Bson::Document(set_on_insert)) = update.get_mut("$setOnInsert") {
        set_on_insert.insert("__v", 0);
    }
}

fn path_exists_in_update(update: &Document, path: &str, pieces: &[&str]) -> bool {
    if update.contains_key(path) {
        return true;
    }
    let mut current: String = pieces[0].to_string();
    for piece in &pieces[1..] {
        if update.contains_key(&current) {
            return true;
        }
        current = format!("{current}.{piece}");
    }
    let prefix: String = format!("{path}.");
    update.keys().any(|key| key.starts_with(&prefix))
}

/// `setDefaultsOnInsert`, with each default cast, or as it is when the update is cast afterwards.
fn set_defaults_on_insert(schema: &Schema, filter: &Document, update: &mut Document, cast_defaults: bool, ids: &mut dyn Ids) {
    let mut updated: Vec<String> = Vec::new();
    for (path, condition) in filter {
        if let Bson::Document(inner) = condition {
            if inner.keys().any(|key| key.starts_with('$')) {
                continue;
            }
        }
        updated.push(path.clone());
        let pieces: Vec<&str> = path.split('.').collect();
        let mut current: String = pieces[0].to_string();
        for piece in &pieces[1..] {
            updated.push(current.clone());
            current = format!("{current}.{piece}");
        }
    }
    let has_dollar: bool = update.keys().any(|key| key.starts_with('$'));
    for (path, leaf) in schema.paths() {
        if path == "_id" {
            continue;
        }
        let pieces: Vec<&str> = path.split('.').collect();
        let modified: bool = updated.iter().any(|key| *key == path)
            || (1..pieces.len()).any(|end| updated.contains(&pieces[..end].join(".")))
            || if has_dollar {
                update.iter().any(|(key, value)| {
                    key.starts_with('$') && matches!(value, Bson::Document(inner) if path_exists_in_update(inner, &path, &pieces))
                })
            } else {
                path_exists_in_update(update, &path, &pieces)
            };
        if modified {
            continue;
        }
        let Some(raw) = leaf.default_value_for(ids) else {
            continue;
        };
        let mut issues: Vec<Issue> = Vec::new();
        let value: Bson = if cast_defaults {
            let Some(value) = cast_value(leaf, &raw, &path, ids, &mut issues) else {
                continue;
            };
            value
        } else {
            raw
        };
        if !matches!(update.get("$setOnInsert"), Some(Bson::Document(_))) {
            update.insert("$setOnInsert", Document::new());
        }
        if let Some(Bson::Document(set_on_insert)) = update.get_mut("$setOnInsert") {
            set_on_insert.insert(path.clone(), value);
        }
    }
}

const QUERY_OPERATORS_WITH_ARRAYS: [&str; 3] = ["$in", "$nin", "$all"];

/// The filter mongoose sends: each value cast to its path's type, `$in` and the like element by
/// element, `$exists` to a boolean, undeclared paths left as they are (`strictQuery: false`).
/// An upsert refuses an undeclared path, which it would otherwise write into the new document.
pub fn cast_filter(schema: &Schema, filter: &Document, upsert: bool, ids: &mut dyn Ids) -> Result<Document, CastError> {
    let mut issues: Vec<Issue> = Vec::new();
    if upsert {
        for key in filter.keys().filter(|key| !key.starts_with('$')) {
            if key != "__v" && matches!(resolve(schema, key), Target::Unknown) {
                issues.push(Issue {
                    path: key.clone(),
                    kind: "strict".to_string(),
                });
            }
        }
        if !issues.is_empty() {
            return Err(CastError { issues });
        }
    }
    let out: Document = cast_filter_into(schema, filter, ids, &mut issues);
    if issues.is_empty() {
        Ok(out)
    } else {
        Err(CastError { issues })
    }
}

fn cast_filter_into(schema: &Schema, filter: &Document, ids: &mut dyn Ids, issues: &mut Vec<Issue>) -> Document {
    let mut out: Document = Document::new();
    for (key, value) in filter {
        if matches!(key.as_str(), "$and" | "$or" | "$nor") {
            let clauses: Vec<Bson> = match value {
                Bson::Array(items) => items
                    .iter()
                    .map(|item| match item {
                        Bson::Document(inner) => Bson::Document(cast_filter_into(schema, inner, ids, issues)),
                        other => other.clone(),
                    })
                    .collect(),
                other => vec![other.clone()],
            };
            out.insert(key, clauses);
            continue;
        }
        let leaf: Option<&Path> = match resolve(schema, key) {
            Target::Leaf(leaf) => Some(leaf),
            _ if key == "__v" => Some(&VERSION_KEY),
            _ => None,
        };
        let Some(leaf) = leaf else {
            out.insert(key, value.clone());
            continue;
        };
        let element: Kind = element_kind(&leaf.kind);
        match value {
            Bson::Document(conditions) if conditions.keys().next().is_some_and(|op| op.starts_with('$')) => {
                let mut cast_conditions: Document = Document::new();
                for (op, operand) in conditions {
                    let cast_operand: Bson = match op.as_str() {
                        "$exists" => match cast(&Kind::Boolean, operand, key, ids, issues) {
                            Some(cast_operand) => cast_operand,
                            None => continue,
                        },
                        op if QUERY_OPERATORS_WITH_ARRAYS.contains(&op) => match operand {
                            Bson::Array(items) => Bson::Array(
                                items.iter().filter_map(|item| query_cast(&element, item, key, ids, issues)).collect(),
                            ),
                            other => query_cast(&element, other, key, ids, issues).unwrap_or(Bson::Null),
                        },
                        _ => query_cast(&element, operand, key, ids, issues).unwrap_or(Bson::Null),
                    };
                    cast_conditions.insert(op, cast_operand);
                }
                out.insert(key, cast_conditions);
            }
            _ => {
                if let Some(cast_value) = query_cast(&element, value, key, ids, issues) {
                    out.insert(key, cast_value);
                }
            }
        }
    }
    out
}

/// What a query value is cast to: an array's element type, since `{ tags: "a" }` matches arrays.
fn element_kind(kind: &Kind) -> Kind {
    match kind {
        Kind::Array(element) => element_kind(element),
        other => other.clone(),
    }
}

fn query_cast(kind: &Kind, value: &Bson, path: &str, ids: &mut dyn Ids, issues: &mut Vec<Issue>) -> Option<Bson> {
    match (kind, value) {
        (Kind::ObjectId, Bson::String(text)) => match ObjectId::parse_str(text) {
            Ok(id) if text.len() == 24 => Some(Bson::ObjectId(id)),
            _ => {
                issues.push(Issue {
                    path: path.to_string(),
                    kind: "ObjectId".to_string(),
                });
                None
            }
        },
        (Kind::Number, number) if as_js_number(number).is_some() => Some(js_number(as_js_number(number).unwrap_or(0.0))),
        (Kind::Mixed, other) => Some(mixed(other)),
        (Kind::Subdocument(_) | Kind::DocumentArray(_) | Kind::Map(_) | Kind::ValueMap(_), other) => Some(other.clone()),
        _ => cast(kind, value, path, ids, issues),
    }
}
