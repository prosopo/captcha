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

//! The catalogue store: i18next's `ResourceStore` filled the way
//! i18next-fs-backend fills it, from `<dir>/<lng>/<ns>.json`.

use std::fmt;
use std::path::{Component, Path, PathBuf};

use serde_json::{Map, Value};

use crate::js::{is_truthy, own_property};
use crate::languages::LANGUAGE_CODES;
use crate::translation_key::Namespace;

/// The namespaces in the order i18nBackend.ts lists them to i18next.
pub const LOAD_ORDER: [Namespace; 3] = [Namespace::Server, Namespace::Widget, Namespace::Target];

/// A catalogue file i18next would have failed to load. As there, the failure
/// is not fatal: lookups fall back to English or to the key.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct LoadProblem {
    pub language: String,
    pub namespace: Namespace,
    pub path: PathBuf,
    pub message: String,
}

impl fmt::Display for LoadProblem {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(formatter, "{}: {}", self.path.display(), self.message)
    }
}

/// Every language's namespaces, keyed `{ lng: { ns: tree } }` as i18next
/// stores them.
#[derive(Debug, Clone, Default)]
pub struct Catalogues {
    data: Value,
    problems: Vec<LoadProblem>,
}

/// The catalogues shipped with this package, found at run time from the
/// crate's own source directory. Deployments pass their own directory to
/// [`Catalogues::load`].
pub fn default_locales_directory() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("src")
        .join("locales")
}

fn normalise(path: &Path) -> PathBuf {
    let mut normalised: PathBuf = PathBuf::new();
    for component in path.components() {
        match component {
            Component::CurDir => {}
            Component::ParentDir => {
                let popped: bool = matches!(
                    normalised.components().next_back(),
                    Some(Component::Normal(_))
                ) && normalised.pop();
                if !popped && !normalised.has_root() {
                    normalised.push("..");
                }
            }
            other => normalised.push(other.as_os_str()),
        }
    }
    normalised
}

/// `localesDirectory`: `locales/` beside the module unless only the one a
/// level up holds the catalogues.
pub fn locales_directory<F: Fn(&Path) -> bool>(module_directory: &Path, exists: F) -> PathBuf {
    let beside: PathBuf = normalise(&module_directory.join("locales"));
    let above: PathBuf = normalise(&module_directory.join("..").join("locales"));
    let has_catalogues = |directory: &Path| -> bool {
        exists(
            &directory
                .join("en")
                .join(format!("{}.json", Namespace::Server.name())),
        )
    };
    if !has_catalogues(&beside) && has_catalogues(&above) {
        above
    } else {
        beside
    }
}

fn read_namespace(path: &Path) -> Result<Map<String, Value>, String> {
    let text: String = std::fs::read_to_string(path).map_err(|error| error.to_string())?;
    let text: &str = text.strip_prefix('\u{feff}').unwrap_or(&text);
    match serde_json::from_str::<Value>(text) {
        Ok(Value::Object(map)) => Ok(map),
        Ok(_) => Err("not a JSON object".to_owned()),
        Err(error) => Err(format!("error parsing {}: {error}", path.display())),
    }
}

impl Catalogues {
    /// Reads every supported language's namespace files from `directory`.
    pub fn load(directory: &Path) -> Catalogues {
        let mut data: Map<String, Value> = Map::new();
        let mut problems: Vec<LoadProblem> = Vec::new();
        for language in LANGUAGE_CODES {
            let mut namespaces: Map<String, Value> = Map::new();
            for namespace in LOAD_ORDER {
                let path: PathBuf = directory
                    .join(language)
                    .join(format!("{}.json", namespace.name()));
                match read_namespace(&path) {
                    Ok(tree) => {
                        namespaces.insert(namespace.name().to_owned(), Value::Object(tree));
                    }
                    Err(message) => problems.push(LoadProblem {
                        language: (*language).to_owned(),
                        namespace,
                        path,
                        message,
                    }),
                }
            }
            if !namespaces.is_empty() {
                data.insert((*language).to_owned(), Value::Object(namespaces));
            }
        }
        Catalogues {
            data: Value::Object(data),
            problems,
        }
    }

    /// From in-memory resources shaped `{ lng: { ns: tree } }`, like
    /// i18next's `resources` init option.
    pub fn from_resources(resources: Map<String, Value>) -> Catalogues {
        Catalogues {
            data: Value::Object(resources),
            problems: Vec::new(),
        }
    }

    /// The files that could not be read or parsed.
    pub fn problems(&self) -> &[LoadProblem] {
        &self.problems
    }

    /// `hasLanguageSomeTranslations`.
    pub fn has_language_some_translations(&self, language: &str) -> bool {
        match own_property(&self.data, language) {
            Some(Value::Object(namespaces)) => namespaces
                .values()
                .any(|tree| matches!(tree, Value::Object(map) if !map.is_empty())),
            _ => false,
        }
    }

    /// `ResourceStore.getResource(lng, ns, key)`.
    pub fn get_resource(&self, language: &str, namespace: &str, key: &str) -> Option<&Value> {
        let mut path: Vec<&str> = vec![language, namespace];
        if !key.is_empty() {
            path.extend(key.split('.'));
        }
        let result: Option<&Value> = get_path(&self.data, &path);
        if result.is_some_and(is_truthy) {
            return result;
        }
        let tree: Option<&Value> = own_property(&self.data, language)
            .and_then(|namespaces| own_property(namespaces, namespace));
        deep_find(tree, key)
    }
}

fn clean_key(key: &str) -> String {
    key.replace("###", ".")
}

fn cannot_traverse_deeper(value: &Value) -> bool {
    !is_truthy(value) || value.is_string()
}

static EMPTY: Value = Value::Null;

/// i18next's `getPath`: own properties only, `###` standing for a dot.
pub fn get_path<'a>(object: &'a Value, path: &[&str]) -> Option<&'a Value> {
    let (last, parents) = path.split_last()?;
    let mut current: &Value = object;
    let mut detached: bool = false;
    for part in parents {
        if !detached && cannot_traverse_deeper(current) {
            return None;
        }
        match own_property(current, &clean_key(part)) {
            Some(next) if !detached => current = next,
            _ => {
                detached = true;
                current = &EMPTY;
            }
        }
    }
    if detached || cannot_traverse_deeper(current) {
        return None;
    }
    own_property(current, &clean_key(last))
}

/// i18next's `deepFind`, which also matches keys that themselves contain dots.
pub fn deep_find<'a>(object: Option<&'a Value>, path: &str) -> Option<&'a Value> {
    let object: &Value = object.filter(|value| is_truthy(value))?;
    if let Some(direct) = own_property(object, path) {
        if is_truthy(direct) {
            return Some(direct);
        }
    }
    let tokens: Vec<&str> = path.split('.').collect();
    let mut current: Option<&Value> = Some(object);
    let mut index: usize = 0;
    while index < tokens.len() {
        let container: &Value = current.filter(|value| is_truthy(value))?;
        if !matches!(container, Value::Object(_) | Value::Array(_)) {
            return None;
        }
        let mut next: Option<&Value> = None;
        let mut next_path: String = String::new();
        for (offset, token) in tokens[index..].iter().enumerate() {
            let j: usize = index + offset;
            if j != index {
                next_path.push('.');
            }
            next_path.push_str(token);
            next = own_property(container, &next_path);
            if let Some(found) = next {
                if crate::js::is_primitive(found) && j < tokens.len() - 1 {
                    continue;
                }
                index = j + 1;
                break;
            }
        }
        current = next;
        if next.is_none() {
            return None;
        }
    }
    current
}
