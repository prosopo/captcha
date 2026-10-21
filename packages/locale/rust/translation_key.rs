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

//! Catalogue keys: the namespaces (translationKey.ts) and the English key
//! lists the server validates against (serverTranslationKeys.ts).

use std::collections::HashSet;
use std::fmt;
use std::sync::LazyLock;

use serde_json::{Map, Value};

use crate::js::{object_keys, own_property};

/// The i18next namespaces the catalogue is split into. Keys keep their
/// section prefix (`WIDGET.`, `TARGET.`), so a key reads the same whichever
/// namespace holds it.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Namespace {
    /// The widget's own text and the errors it shows. The only namespace the
    /// browser fetches.
    Widget,
    /// Image labels.
    Target,
    /// i18next's default namespace: server-only text.
    Server,
}

impl Namespace {
    /// The namespace name, which is also the catalogue file stem.
    pub const fn name(self) -> &'static str {
        match self {
            Namespace::Widget => "widget",
            Namespace::Target => "target",
            Namespace::Server => "translation",
        }
    }
}

/// `NAMESPACES`, in declaration order.
pub const NAMESPACES: [Namespace; 3] = [Namespace::Widget, Namespace::Target, Namespace::Server];

/// Thrown by `getLeafFieldPath` when it meets a JSON `null`, which
/// `Object.keys` rejects.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct LeafPathError;

impl fmt::Display for LeafPathError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str("Cannot convert undefined or null to object")
    }
}

impl std::error::Error for LeafPathError {}

/// `getLeafFieldPath`: every leaf of a catalogue tree as a dotted path, in
/// `Object.keys` order.
pub fn get_leaf_field_path(node: &Value) -> Result<Vec<String>, LeafPathError> {
    let keys: Vec<String> = match node {
        Value::String(_) | Value::Number(_) | Value::Bool(_) => return Ok(Vec::new()),
        Value::Null => return Err(LeafPathError),
        Value::Object(map) => object_keys(map).into_iter().map(str::to_owned).collect(),
        Value::Array(items) => (0..items.len()).map(|index| index.to_string()).collect(),
    };
    let mut paths: Vec<String> = Vec::new();
    for key in keys {
        let value: &Value = own_property(node, &key).ok_or(LeafPathError)?;
        if value.is_string() {
            paths.push(key);
            continue;
        }
        paths.extend(
            get_leaf_field_path(value)?
                .into_iter()
                .map(|child| format!("{key}.{child}")),
        );
    }
    Ok(paths)
}

const SERVER_EN: &str = include_str!("../src/locales/en/translation.json");
const WIDGET_EN: &str = include_str!("../src/locales/en/widget.json");
const TARGET_EN: &str = include_str!("../src/locales/en/target.json");

fn parse_bundled(source: &str) -> Map<String, Value> {
    match serde_json::from_str::<Value>(source.trim_start_matches('\u{feff}')) {
        Ok(Value::Object(map)) => map,
        _ => panic!("bundled English catalogue is not a JSON object"),
    }
}

/// `{ ...serverEn, ...widgetEn, ...targetEn }`: a shallow merge in which a
/// later section replaces an earlier one of the same name in place.
fn english_catalogue() -> Value {
    let mut merged: Map<String, Value> = Map::new();
    for source in [SERVER_EN, WIDGET_EN, TARGET_EN] {
        let catalogue: Map<String, Value> = parse_bundled(source);
        for key in object_keys(&catalogue) {
            merged.insert(key.to_owned(), catalogue[key].clone());
        }
    }
    Value::Object(merged)
}

static ENGLISH: LazyLock<Value> = LazyLock::new(english_catalogue);

static WIDGET_KEYS: LazyLock<HashSet<String>> = LazyLock::new(|| {
    get_leaf_field_path(&Value::Object(parse_bundled(WIDGET_EN)))
        .expect("bundled widget catalogue has no nulls")
        .into_iter()
        .collect()
});

static TRANSLATION_KEYS: LazyLock<Vec<String>> = LazyLock::new(|| {
    get_leaf_field_path(&ENGLISH).expect("bundled English catalogue has no nulls")
});

static TRANSLATION_KEY_SET: LazyLock<HashSet<&'static str>> =
    LazyLock::new(|| TRANSLATION_KEYS.iter().map(String::as_str).collect());

static TARGET_KEYS: LazyLock<Vec<String>> = LazyLock::new(|| {
    let catalogue: Map<String, Value> = parse_bundled(TARGET_EN);
    match catalogue.get("TARGET") {
        Some(Value::Object(labels)) => object_keys(labels).into_iter().map(str::to_owned).collect(),
        _ => panic!("bundled target catalogue has no TARGET section"),
    }
});

static TARGET_KEY_SET: LazyLock<HashSet<&'static str>> =
    LazyLock::new(|| TARGET_KEYS.iter().map(String::as_str).collect());

/// The bundled English catalogues, merged as `serverTranslationKeys.ts` does.
pub fn english_catalogue_tree() -> &'static Value {
    &ENGLISH
}

/// `isWidgetTranslationKey`: a key the widget has its own text for.
pub fn is_widget_translation_key(value: &str) -> bool {
    WIDGET_KEYS.contains(value)
}

/// `translationKeys`: every leaf of the English catalogue.
pub fn translation_keys() -> &'static [String] {
    &TRANSLATION_KEYS
}

/// `isTranslationKey`.
pub fn is_translation_key(value: &str) -> bool {
    TRANSLATION_KEY_SET.contains(value)
}

/// `targetKeys`: every image label, without the `TARGET.` prefix.
pub fn target_keys() -> &'static [String] {
    &TARGET_KEYS
}

/// `isTargetKey`.
pub fn is_target_key(value: &str) -> bool {
    TARGET_KEY_SET.contains(value)
}

/// `englishText`: the English text for a key whatever the request's
/// language, or the key itself when it names no string.
pub fn english_text(key: &str) -> String {
    let mut node: Option<&Value> = Some(&ENGLISH);
    for part in key.split('.') {
        node = node.and_then(|current| match current {
            Value::Object(_) | Value::Array(_) => own_property(current, part),
            _ => None,
        });
    }
    match node {
        Some(Value::String(text)) => text.clone(),
        _ => key.to_owned(),
    }
}
