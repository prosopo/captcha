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

// Ported from src/tests/i18nBackend.unit.test.ts

use std::path::{Path, PathBuf};

use crate::catalogue::{
    default_locales_directory, locales_directory, Catalogues, LoadProblem, LOAD_ORDER,
};
use crate::language_utils::{best_match_from_codes, is_supported_code};
use crate::translation_key::Namespace;
use crate::translator::{I18n, DEFAULT_NAMESPACE, FALLBACK_NAMESPACES};

fn only(present: &[&str]) -> impl Fn(&Path) -> bool {
    let present: Vec<PathBuf> = present.iter().map(PathBuf::from).collect();
    move |file: &Path| present.iter().any(|candidate| candidate == file)
}

#[test]
fn carries_the_shared_options_through() {
    assert_eq!(best_match_from_codes(&["xx"]), "en");
    assert!(is_supported_code("en"));
    assert!(!is_supported_code("en-GB"));
}

#[test]
fn loads_all_three_namespaces_server_text_by_default() {
    assert_eq!(
        LOAD_ORDER,
        [Namespace::Server, Namespace::Widget, Namespace::Target]
    );
    assert_eq!(DEFAULT_NAMESPACE.name(), "translation");
    assert_eq!(FALLBACK_NAMESPACES, [Namespace::Widget, Namespace::Target]);
}

#[test]
fn points_the_backend_at_a_directory_holding_the_catalogues() {
    assert!(default_locales_directory()
        .join("en")
        .join("translation.json")
        .exists());
}

#[test]
fn still_loads_when_a_file_failed_to_load() {
    let directory: PathBuf =
        std::env::temp_dir().join(format!("prosopo-locale-partial-{}", std::process::id()));
    let english: PathBuf = directory.join("en");
    std::fs::create_dir_all(&english).expect("create temp catalogue");
    std::fs::write(
        english.join("translation.json"),
        r#"{"DATABASE":{"UNKNOWN":"Unknown"}}"#,
    )
    .expect("write catalogue");
    std::fs::write(english.join("widget.json"), "{ not json").expect("write catalogue");
    let catalogues: Catalogues = Catalogues::load(&directory);
    std::fs::remove_dir_all(&directory).expect("remove temp catalogue");

    let failed: Vec<&LoadProblem> = catalogues
        .problems()
        .iter()
        .filter(|problem| problem.language == "en")
        .collect();
    assert_eq!(
        failed
            .iter()
            .map(|problem| problem.namespace)
            .collect::<Vec<Namespace>>(),
        [Namespace::Widget, Namespace::Target]
    );
    let i18n: I18n = I18n::new(catalogues);
    assert_eq!(
        i18n.t("tr", "DATABASE.UNKNOWN", &Default::default()),
        "Unknown"
    );
    assert_eq!(
        i18n.t("tr", "WIDGET.NEXT", &Default::default()),
        "WIDGET.NEXT"
    );
}

#[test]
fn uses_locales_beside_the_module_as_in_the_esm_build() {
    assert_eq!(
        locales_directory(
            Path::new("/pkg/dist"),
            only(&["/pkg/dist/locales/en/translation.json"])
        ),
        PathBuf::from("/pkg/dist/locales")
    );
}

#[test]
fn uses_locales_one_level_up_as_in_the_cjs_build() {
    assert_eq!(
        locales_directory(
            Path::new("/pkg/dist/cjs"),
            only(&["/pkg/dist/locales/en/translation.json"])
        ),
        PathBuf::from("/pkg/dist/locales")
    );
}

#[test]
fn prefers_locales_beside_the_module_when_both_exist() {
    assert_eq!(
        locales_directory(
            Path::new("/pkg/dist/cjs"),
            only(&[
                "/pkg/dist/cjs/locales/en/translation.json",
                "/pkg/dist/locales/en/translation.json",
            ])
        ),
        PathBuf::from("/pkg/dist/cjs/locales")
    );
}

#[test]
fn falls_back_to_locales_beside_the_module_when_neither_exists() {
    assert_eq!(
        locales_directory(Path::new("/pkg/dist/cjs"), only(&[])),
        PathBuf::from("/pkg/dist/cjs/locales")
    );
}
