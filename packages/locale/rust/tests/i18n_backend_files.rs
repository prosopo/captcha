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

// Ported from src/tests/i18nBackendFiles.unit.test.ts

use crate::tests::files_i18n;
use crate::translator::{FixedT, I18n, I18nLookup, TranslateOptions};

#[test]
fn has_every_namespace_loaded() {
    let i18n: &I18n = files_i18n();
    assert!(
        i18n.catalogues().problems().is_empty(),
        "{:?}",
        i18n.catalogues().problems()
    );
    let english: TranslateOptions = TranslateOptions::new().lng("en");
    let fixed: FixedT<'_> = i18n.fixed_t("tr");
    assert_eq!(fixed.t_with("TARGET.owl", &english), "owl");
    assert_eq!(
        fixed.t_with("WIDGET.SELECT_ALL", &english),
        "Select all containing the following:"
    );
    assert_eq!(
        fixed.t_with("DATABASE.UNKNOWN", &english),
        "Unknown database error"
    );
}

#[test]
fn translates_keys_from_all_three_namespaces_into_another_language() {
    let fixed: FixedT<'_> = files_i18n().fixed_t("tr");
    assert_eq!(fixed.language(), "tr");
    assert_eq!(fixed.t("TARGET.owl"), "baykuş");
    assert_eq!(
        fixed.t("WIDGET.SELECT_ALL"),
        "Aşağıdakini içeren tüm görselleri seçin:"
    );
    assert_eq!(fixed.t("DATABASE.UNKNOWN"), "Bilinmeyen veritabanı hatası");
}
