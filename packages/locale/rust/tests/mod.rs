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

mod error_message;
mod i18n_backend;
mod i18n_backend_files;
mod i18n_shared_options;
mod language_preference;
mod locale_placeholders;
mod locales;
mod port_extras;
mod request_language_detector;
mod thrown_error_keys;
mod translation_key;
mod translations;

use std::sync::LazyLock;

use serde_json::{Map, Value};

use crate::catalogue::default_locales_directory;
use crate::translation_key::{Namespace, NAMESPACES};
use crate::translator::I18n;

static FILES: LazyLock<I18n> = LazyLock::new(|| I18n::load(&default_locales_directory()));

/// The real catalogues on disk, loaded once for every test.
pub(crate) fn files_i18n() -> &'static I18n {
    &FILES
}

pub(crate) fn read_namespace(locale: &str, namespace: Namespace) -> Map<String, Value> {
    let path = default_locales_directory()
        .join(locale)
        .join(format!("{}.json", namespace.name()));
    let text: String = std::fs::read_to_string(&path)
        .unwrap_or_else(|error| panic!("{}: {error}", path.display()));
    match serde_json::from_str::<Value>(&text) {
        Ok(Value::Object(map)) => map,
        other => panic!("{} is not a JSON object: {other:?}", path.display()),
    }
}

/// All of a language's namespace files as one tree; keys never overlap.
pub(crate) fn read_locale(locale: &str) -> Map<String, Value> {
    let mut merged: Map<String, Value> = Map::new();
    for namespace in NAMESPACES {
        merged.extend(read_namespace(locale, namespace));
    }
    merged
}

/// Every leaf as a dotted path; non-string leaves are kept so they can fail.
pub(crate) fn flatten(tree: &Map<String, Value>) -> Vec<(String, Value)> {
    fn walk(tree: &Map<String, Value>, prefix: &str, into: &mut Vec<(String, Value)>) {
        for (key, value) in tree {
            match value {
                Value::Object(child) => walk(child, &format!("{prefix}{key}."), into),
                other => into.push((format!("{prefix}{key}"), other.clone())),
            }
        }
    }
    let mut leaves: Vec<(String, Value)> = Vec::new();
    walk(tree, "", &mut leaves);
    leaves
}
