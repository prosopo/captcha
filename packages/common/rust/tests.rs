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

//! Ports of src/tests/error.unit.test.ts and src/tests/utils/batches.unit.test.ts. The
//! objectUtils helpers are not ported (see MIGRATION-LOG.md), so neither are their tests.

use crate::{
    chunk_into_batches, execute_batches_sequentially, unwrap_error, ApiErrorMessage, ErrorClass,
    ErrorContext, ErrorOptions, ErrorSource, ProsopoError, ThrownError, UnwrappedError,
    ZodLikeError, MAX_REPORTED_ISSUES,
};
use prosopo_locale::{is_translation_key, I18nLookup, TranslateOptions};
use prosopo_logger::{
    get_logger_with_runtime, ConsoleMethod, DirectiveStore, ErrorObject, LogLevel, LogRecord,
    LogRuntime, Logger, Sink, SystemClock,
};
use serde_json::{json, Value};
use std::cell::RefCell;
use std::collections::HashMap;
use std::num::NonZeroUsize;
use std::sync::{Arc, Mutex};

struct MapLookup(HashMap<&'static str, &'static str>);

impl I18nLookup for MapLookup {
    fn t(&self, key: &str) -> String {
        self.0
            .get(key)
            .map_or_else(|| key.to_string(), |text| text.to_string())
    }

    fn t_with(&self, key: &str, _options: &TranslateOptions) -> String {
        self.t(key)
    }

    fn exists(&self, key: &str) -> bool {
        self.0.contains_key(key)
    }
}

fn make_i18n(translations: &[(&'static str, &'static str)]) -> MapLookup {
    MapLookup(translations.iter().copied().collect())
}

fn english_i18n() -> MapLookup {
    make_i18n(&[
        ("CAPTCHA.NO_SESSION_FOUND", "No session found"),
        ("API.INVALID_SITE_KEY", "Invalid site key"),
        ("API.UNKNOWN", "Unknown error"),
    ])
}

fn french_i18n() -> MapLookup {
    make_i18n(&[
        ("CAPTCHA.NO_SESSION_FOUND", "Aucune session trouvée"),
        ("API.INVALID_SITE_KEY", "Clé de site invalide"),
    ])
}

/// Records every key `t` is asked for, like the TS `vi.fn` translator.
struct RecordingLookup<E: Fn(&str) -> bool> {
    exists: E,
    asked: RefCell<Vec<String>>,
}

impl<E: Fn(&str) -> bool> I18nLookup for RecordingLookup<E> {
    fn t(&self, key: &str) -> String {
        self.asked.borrow_mut().push(key.to_string());
        key.to_string()
    }

    fn t_with(&self, key: &str, _options: &TranslateOptions) -> String {
        self.t(key)
    }

    fn exists(&self, key: &str) -> bool {
        (self.exists)(key)
    }
}

#[derive(Default)]
struct CaptureSink {
    lines: Mutex<Vec<(ConsoleMethod, String)>>,
}

impl Sink for CaptureSink {
    fn write(&self, method: ConsoleMethod, line: &str) {
        self.lines
            .lock()
            .expect("capture lock")
            .push((method, line.to_string()));
    }
}

struct CapturedLog {
    level: String,
    raw: String,
    record: Value,
}

impl CaptureSink {
    fn logs(&self) -> Vec<CapturedLog> {
        self.lines
            .lock()
            .expect("capture lock")
            .iter()
            .map(|(_, line)| {
                let record: Value = serde_json::from_str(line).expect("log lines are JSON");
                CapturedLog {
                    level: record["level"].as_str().unwrap_or("").to_string(),
                    raw: line.clone(),
                    record,
                }
            })
            .collect()
    }
}

fn capturing_logger() -> (Logger, Arc<CaptureSink>) {
    let sink: Arc<CaptureSink> = Arc::new(CaptureSink::default());
    let runtime: LogRuntime = LogRuntime {
        sink: sink.clone(),
        clock: Arc::new(SystemClock),
        directives: Arc::new(DirectiveStore::new("")),
    };
    (
        get_logger_with_runtime(LogLevel::Debug, "test", runtime),
        sink,
    )
}

fn code_context(code: u16) -> ErrorContext {
    ErrorContext::new().with("code", code)
}

fn api_error(key: &str, code: u16, i18n: &dyn I18nLookup, logger: &Logger) -> ProsopoError {
    ProsopoError::new(
        ErrorClass::Api,
        ErrorSource::key(key),
        ErrorOptions {
            context: Some(code_context(code)),
            i18n: Some(i18n),
            logger: Some(logger),
            ..ErrorOptions::default()
        },
    )
}

fn silent_api_error(key: &str, code: u16, i18n: &dyn I18nLookup) -> ProsopoError {
    ProsopoError::new(
        ErrorClass::Api,
        ErrorSource::key(key),
        ErrorOptions {
            context: Some(code_context(code)),
            i18n: Some(i18n),
            silent: true,
            ..ErrorOptions::default()
        },
    )
}

fn unwrap(error: &ProsopoError, i18n: Option<&dyn I18nLookup>) -> UnwrappedError {
    unwrap_error(&ThrownError::from(error.clone()), i18n)
}

fn text(message: &str) -> ApiErrorMessage {
    ApiErrorMessage::Text(message.to_string())
}

mod log_error {
    use super::*;

    #[test]
    fn logs_the_translation_key_as_err_not_the_translated_message() {
        let (logger, sink) = capturing_logger();
        api_error("CAPTCHA.NO_SESSION_FOUND", 400, &english_i18n(), &logger);

        let logs: Vec<CapturedLog> = sink.logs();
        assert_eq!(logs.len(), 1);
        assert_eq!(logs[0].level, "error");
        assert_eq!(logs[0].record["err"], "CAPTCHA.NO_SESSION_FOUND");
        assert_ne!(logs[0].record["err"], "No session found");
    }

    #[test]
    fn logs_the_same_translation_key_regardless_of_locale() {
        let (en_logger, en_sink) = capturing_logger();
        let (fr_logger, fr_sink) = capturing_logger();
        api_error("CAPTCHA.NO_SESSION_FOUND", 400, &english_i18n(), &en_logger);
        api_error("CAPTCHA.NO_SESSION_FOUND", 400, &french_i18n(), &fr_logger);

        assert_eq!(en_sink.logs()[0].record["err"], "CAPTCHA.NO_SESSION_FOUND");
        assert_eq!(fr_sink.logs()[0].record["err"], "CAPTCHA.NO_SESSION_FOUND");
    }

    #[test]
    fn emits_error_type_and_context_under_data_with_no_error_params_nesting() {
        let (logger, sink) = capturing_logger();
        ProsopoError::new(
            ErrorClass::Api,
            ErrorSource::key("API.INVALID_SITE_KEY"),
            ErrorOptions {
                context: Some(code_context(400).with("siteKey", "abc")),
                i18n: Some(&english_i18n()),
                logger: Some(&logger),
                ..ErrorOptions::default()
            },
        );

        let data: &Value = &sink.logs()[0].record["data"];
        assert_eq!(data["errorType"], "ProsopoApiError");
        assert_eq!(data["context"]["code"], 400);
        assert_eq!(data["context"]["siteKey"], "abc");
        assert!(data.get("errorParams").is_none());
    }

    #[test]
    fn does_not_inject_a_translation_message_into_context_when_wrapping_an_error() {
        let (logger, sink) = capturing_logger();
        ProsopoError::new(
            ErrorClass::Env,
            ErrorSource::message("kaboom"),
            ErrorOptions {
                translation_key: Some("API.UNKNOWN".to_string()),
                context: Some(code_context(500)),
                i18n: Some(&english_i18n()),
                logger: Some(&logger),
                ..ErrorOptions::default()
            },
        );

        let logs: Vec<CapturedLog> = sink.logs();
        assert!(logs[0].record["data"]["context"]
            .get("translationMessage")
            .is_none());
        assert_eq!(logs[0].record["err"], "API.UNKNOWN");
    }

    fn raw_failure(logger: &Logger) {
        ProsopoError::new(
            ErrorClass::Env,
            ErrorSource::message("raw failure"),
            ErrorOptions {
                i18n: Some(&english_i18n()),
                logger: Some(logger),
                ..ErrorOptions::default()
            },
        );
    }

    #[test]
    fn falls_back_to_message_when_no_translation_key_is_available() {
        let (logger, sink) = capturing_logger();
        raw_failure(&logger);

        assert_eq!(sink.logs()[0].record["err"], "raw failure");
    }

    #[test]
    fn respects_silent_and_does_not_log() {
        let (logger, sink) = capturing_logger();
        ProsopoError::new(
            ErrorClass::Api,
            ErrorSource::key("API.INVALID_SITE_KEY"),
            ErrorOptions {
                context: Some(code_context(400)),
                i18n: Some(&english_i18n()),
                logger: Some(&logger),
                silent: true,
                ..ErrorOptions::default()
            },
        );

        assert!(sink.logs().is_empty());
    }

    fn debug_error(logger: &Logger) {
        ProsopoError::new(
            ErrorClass::Api,
            ErrorSource::key("API.INVALID_SITE_KEY"),
            ErrorOptions {
                context: Some(code_context(400)),
                i18n: Some(&english_i18n()),
                logger: Some(logger),
                log_level: Some(LogLevel::Debug),
                ..ErrorOptions::default()
            },
        );
    }

    #[test]
    fn logs_at_debug_level_and_includes_the_stack_when_log_level_is_debug() {
        let (logger, sink) = capturing_logger();
        debug_error(&logger);

        let logs: Vec<CapturedLog> = sink.logs();
        assert_eq!(logs[0].level, "debug");
        assert_eq!(logs[0].record["err"], "API.INVALID_SITE_KEY");
        assert!(logs[0].record["data"]["stack"].is_string());
    }

    #[test]
    fn emits_a_non_empty_msg_field_mirroring_the_translation_key() {
        let (logger, sink) = capturing_logger();
        api_error("API.INCORRECT_CAPTCHA_TYPE", 400, &english_i18n(), &logger);

        let logs: Vec<CapturedLog> = sink.logs();
        assert_eq!(logs.len(), 1);
        assert_eq!(logs[0].record["msg"], "API.INCORRECT_CAPTCHA_TYPE");
        assert_eq!(logs[0].record["msg"], logs[0].record["err"]);
    }

    #[test]
    fn emits_msg_on_the_debug_level_branch_too() {
        let (logger, sink) = capturing_logger();
        debug_error(&logger);

        let logs: Vec<CapturedLog> = sink.logs();
        assert_eq!(logs[0].level, "debug");
        assert_eq!(logs[0].record["msg"], "API.INVALID_SITE_KEY");
    }

    #[test]
    fn falls_back_to_the_raw_message_in_msg_when_no_translation_key_is_set() {
        let (logger, sink) = capturing_logger();
        raw_failure(&logger);

        let logs: Vec<CapturedLog> = sink.logs();
        assert_eq!(logs[0].record["msg"], "raw failure");
        assert_eq!(logs[0].record["msg"], logs[0].record["err"]);
    }
}

mod logger_unpack_error {
    use super::*;

    #[test]
    fn emits_the_translation_key_as_err_when_an_api_error_is_passed_as_err() {
        let api_error: ProsopoError =
            silent_api_error("CAPTCHA.NO_SESSION_FOUND", 400, &french_i18n());
        assert_eq!(api_error.message(), "Aucune session trouvée");

        let (logger, sink) = capturing_logger();
        logger.error(|| LogRecord::default().with_err(api_error.to_error_object()));

        let logs: Vec<CapturedLog> = sink.logs();
        assert_eq!(logs.len(), 1);
        assert_eq!(logs[0].record["err"], "CAPTCHA.NO_SESSION_FOUND");
        assert_ne!(logs[0].record["err"], "Aucune session trouvée");
    }

    #[test]
    fn falls_back_to_message_when_the_error_has_no_translation_key() {
        let (logger, sink) = capturing_logger();
        logger.error(|| LogRecord::default().with_err(ErrorObject::new("Error", "plain failure")));

        assert_eq!(sink.logs()[0].record["err"], "plain failure");
    }
}

mod unwrap_error_translates {
    use super::*;

    #[test]
    fn passes_only_catalogue_keys_to_the_translator_never_free_text() {
        let i18n = RecordingLookup {
            exists: is_translation_key,
            asked: RefCell::new(Vec::new()),
        };
        let error: ProsopoError = ProsopoError::new(
            ErrorClass::Api,
            ErrorSource::message("upstream: timed out"),
            ErrorOptions {
                context: Some(code_context(500)),
                i18n: Some(&i18n),
                silent: true,
                ..ErrorOptions::default()
            },
        );

        let unwrapped: UnwrappedError = unwrap(&error, Some(&i18n));
        assert_eq!(error.message(), "upstream: timed out");
        assert_eq!(unwrapped.json_error.message, text("upstream: timed out"));
        assert!(!i18n
            .asked
            .borrow()
            .contains(&"upstream: timed out".to_string()));
    }

    #[test]
    fn keeps_a_key_the_instance_has_no_text_for_as_the_widget_does_for_server_keys() {
        let widget_only = RecordingLookup {
            exists: |key: &str| key.starts_with("WIDGET."),
            asked: RefCell::new(Vec::new()),
        };
        let error: ProsopoError = ProsopoError::new(
            ErrorClass::Db,
            ErrorSource::message("DATABASE.CAPTCHA_GET_FAILED"),
            ErrorOptions {
                i18n: Some(&widget_only),
                silent: true,
                ..ErrorOptions::default()
            },
        );

        assert_eq!(error.message(), "DATABASE.CAPTCHA_GET_FAILED");
        assert!(widget_only.asked.borrow().is_empty());
    }

    #[test]
    fn leaves_a_key_untranslated_without_an_i18n_instance() {
        let error: ProsopoError = ProsopoError::new(
            ErrorClass::Db,
            ErrorSource::message("DATABASE.CAPTCHA_GET_FAILED"),
            ErrorOptions {
                silent: true,
                ..ErrorOptions::default()
            },
        );

        assert_eq!(error.message(), "DATABASE.CAPTCHA_GET_FAILED");
    }

    #[test]
    fn translates_the_message_for_the_response_body_even_though_the_log_emits_the_key() {
        let english: MapLookup = english_i18n();
        let error: ProsopoError = silent_api_error("CAPTCHA.NO_SESSION_FOUND", 400, &english);

        let unwrapped: UnwrappedError = unwrap(&error, Some(&english));
        assert_eq!(unwrapped.json_error.message, text("No session found"));
        assert_eq!(
            unwrapped.json_error.key.as_deref(),
            Some("CAPTCHA.NO_SESSION_FOUND")
        );
        assert_eq!(unwrapped.json_error.code, 400);
    }

    #[test]
    fn exposes_the_translation_key_on_the_response_regardless_of_construction_locale() {
        let (english, french): (MapLookup, MapLookup) = (english_i18n(), french_i18n());
        let en_error: ProsopoError = silent_api_error("CAPTCHA.NO_SESSION_FOUND", 400, &english);
        let fr_error: ProsopoError = silent_api_error("CAPTCHA.NO_SESSION_FOUND", 400, &french);

        assert_eq!(
            unwrap(&en_error, Some(&english)).json_error.key.as_deref(),
            Some("CAPTCHA.NO_SESSION_FOUND")
        );
        assert_eq!(
            unwrap(&fr_error, Some(&french)).json_error.key.as_deref(),
            Some("CAPTCHA.NO_SESSION_FOUND")
        );
    }

    fn turkish() -> MapLookup {
        make_i18n(&[("DATABASE.CAPTCHA_GET_FAILED", "Captcha alınamadı")])
    }

    #[test]
    fn adds_english_text_for_a_key_the_widget_has_no_text_for() {
        let turkish: MapLookup = turkish();
        let error: ProsopoError = ProsopoError::new(
            ErrorClass::Db,
            ErrorSource::key("DATABASE.CAPTCHA_GET_FAILED"),
            ErrorOptions {
                i18n: Some(&turkish),
                silent: true,
                ..ErrorOptions::default()
            },
        );

        let unwrapped: UnwrappedError = unwrap(&error, Some(&turkish));
        assert_eq!(unwrapped.json_error.message, text("Captcha alınamadı"));
        assert_eq!(
            unwrapped.json_error.key.as_deref(),
            Some("DATABASE.CAPTCHA_GET_FAILED")
        );
        assert_eq!(
            unwrapped.json_error.message_en.as_deref(),
            Some("Failed to get captcha")
        );
    }

    #[test]
    fn sends_only_the_keys_translation_for_a_key_the_widget_can_look_up() {
        let french: MapLookup = french_i18n();
        let error: ProsopoError = silent_api_error("CAPTCHA.NO_SESSION_FOUND", 400, &french);

        let unwrapped: UnwrappedError = unwrap(&error, Some(&french));
        assert_eq!(unwrapped.json_error.message, text("Aucune session trouvée"));
        assert_eq!(unwrapped.json_error.message_en, None);
    }

    #[test]
    fn adds_no_english_text_when_the_message_is_not_the_keys_text() {
        let turkish: MapLookup = turkish();
        let error: ProsopoError = ProsopoError::new(
            ErrorClass::Db,
            ErrorSource::message("upstream: timed out"),
            ErrorOptions {
                context: Some(
                    ErrorContext::new().with("translationKey", "DATABASE.CAPTCHA_GET_FAILED"),
                ),
                i18n: Some(&turkish),
                silent: true,
                ..ErrorOptions::default()
            },
        );

        let unwrapped: UnwrappedError = unwrap(&error, Some(&turkish));
        assert_eq!(unwrapped.json_error.message, text("upstream: timed out"));
        assert_eq!(
            unwrapped.json_error.key.as_deref(),
            Some("DATABASE.CAPTCHA_GET_FAILED")
        );
        assert_eq!(unwrapped.json_error.message_en, None);
    }

    #[test]
    fn adds_no_english_text_for_an_error_with_no_catalogue_key() {
        let error: ProsopoError = ProsopoError::new(
            ErrorClass::Api,
            ErrorSource::message("upstream: timed out"),
            ErrorOptions {
                context: Some(code_context(500).with("translationKey", "not.a.key")),
                silent: true,
                ..ErrorOptions::default()
            },
        );

        let unwrapped: UnwrappedError = unwrap(&error, None);
        assert_eq!(unwrapped.json_error.key.as_deref(), Some("not.a.key"));
        assert_eq!(unwrapped.json_error.message_en, None);
    }

    #[test]
    fn derives_status_message_from_the_resolved_status_code() {
        let english: MapLookup = english_i18n();
        let error: ProsopoError = silent_api_error("CAPTCHA.NO_SESSION_FOUND", 401, &english);

        let unwrapped: UnwrappedError = unwrap(&error, Some(&english));
        assert_eq!(unwrapped.code, 401);
        assert_eq!(unwrapped.status_message, "Unauthorized");
    }

    #[test]
    fn falls_back_to_a_5xx_reason_phrase_for_an_unmapped_server_error_code() {
        let english: MapLookup = english_i18n();
        let error: ProsopoError = silent_api_error("CAPTCHA.NO_SESSION_FOUND", 599, &english);

        let unwrapped: UnwrappedError = unwrap(&error, Some(&english));
        assert_eq!(unwrapped.code, 599);
        assert_eq!(unwrapped.status_message, "Internal Server Error");
    }
}

mod error_keys {
    use super::*;

    /// The TS rejects the misspelling at compile time only; both keep it at runtime.
    #[test]
    fn keeps_whatever_key_it_is_given() {
        let silent = || ErrorOptions {
            silent: true,
            ..ErrorOptions::default()
        };
        let known: ProsopoError = ProsopoError::new(
            ErrorClass::Db,
            ErrorSource::key("DATABASE.DATABASE_IMPORT_FAILED"),
            silent(),
        );
        let misspelt: ProsopoError = ProsopoError::new(
            ErrorClass::Db,
            ErrorSource::key("DATABASE.DATABASE_IMPORT_ERROR"),
            silent(),
        );
        assert_eq!(
            known.translation_key(),
            Some("DATABASE.DATABASE_IMPORT_FAILED")
        );
        assert_eq!(
            misspelt.translation_key(),
            Some("DATABASE.DATABASE_IMPORT_ERROR")
        );
        assert!(is_translation_key("DATABASE.DATABASE_IMPORT_FAILED"));
        assert!(!is_translation_key("DATABASE.DATABASE_IMPORT_ERROR"));
    }
}

fn fake_zod_error(issue_count: usize) -> ZodLikeError {
    let issues: Vec<Value> = (0..issue_count)
        .map(|i| json!({ "path": ["items", i], "message": "Expected object, received null" }))
        .collect();
    ZodLikeError {
        message: serde_json::to_string_pretty(&issues).expect("issues serialise"),
        issues,
    }
}

mod bounded_validation_errors {
    use super::*;

    const ISSUES: usize = 5000;

    fn parse_error(logger: Option<&Logger>) -> ProsopoError {
        ProsopoError::new(
            ErrorClass::Api,
            ErrorSource::key("CAPTCHA.PARSE_ERROR"),
            ErrorOptions {
                context: Some(code_context(400).with_error(fake_zod_error(ISSUES))),
                logger,
                silent: logger.is_none(),
                ..ErrorOptions::default()
            },
        )
    }

    #[test]
    fn returns_at_most_max_reported_issues_in_the_response_body() {
        let unwrapped: UnwrappedError = unwrap(&parse_error(None), Some(&english_i18n()));

        assert_eq!(unwrapped.code, 400);
        match &unwrapped.json_error.message {
            ApiErrorMessage::Issues(issues) => assert_eq!(issues.len(), MAX_REPORTED_ISSUES),
            other => panic!("expected issues, got {other:?}"),
        }
        let body: String = serde_json::to_string(&unwrapped.json_error).expect("serialises");
        assert!(body.len() < 5000, "{}", body.len());
    }

    #[test]
    fn keeps_every_issue_when_there_are_only_a_few() {
        let unwrapped: UnwrappedError =
            unwrap_error(&ThrownError::from(fake_zod_error(2)), Some(&english_i18n()));

        match &unwrapped.json_error.message {
            ApiErrorMessage::Issues(issues) => assert_eq!(issues.len(), 2),
            other => panic!("expected issues, got {other:?}"),
        }
    }

    #[test]
    fn logs_a_bounded_summary_of_the_issues_not_all_of_them() {
        let (logger, sink) = capturing_logger();
        parse_error(Some(&logger));

        let logged: &str = &sink.logs()[0].raw;
        assert!(logged.len() < 5000, "{}", logged.len());
        assert!(logged.contains(&format!("\"issueCount\":{ISSUES}")));
    }
}

mod batches {
    use super::*;

    fn two() -> NonZeroUsize {
        NonZeroUsize::new(2).expect("2 is not zero")
    }

    #[test]
    fn chunks_into_batches() {
        assert_eq!(
            chunk_into_batches(&[1, 2, 3], two()),
            vec![vec![1, 2], vec![3]]
        );
    }

    #[test]
    fn handles_the_empty_items_case() {
        assert_eq!(
            chunk_into_batches::<i32>(&[], two()),
            Vec::<Vec<i32>>::new()
        );
    }

    #[tokio::test]
    async fn executes_batches_in_order_with_their_index() {
        let batches: Vec<Vec<i32>> = chunk_into_batches(&[1, 2, 3, 4, 5], two());
        let order: RefCell<Vec<usize>> = RefCell::new(Vec::new());

        let sums: Result<Vec<i32>, String> =
            execute_batches_sequentially(&batches, |batch: &Vec<i32>, index: usize| {
                order.borrow_mut().push(index);
                let sum: i32 = batch.iter().sum();
                async move { Ok(sum) }
            })
            .await;

        assert_eq!(sums, Ok(vec![3, 7, 5]));
        assert_eq!(*order.borrow(), vec![0, 1, 2]);
    }

    #[tokio::test]
    async fn stops_at_the_first_failing_batch() {
        let batches: Vec<i32> = vec![1, 2, 3];
        let calls: RefCell<usize> = RefCell::new(0);

        let result: Result<Vec<i32>, String> =
            execute_batches_sequentially(&batches, |batch: &i32, _index: usize| {
                *calls.borrow_mut() += 1;
                let batch: i32 = *batch;
                async move {
                    if batch == 2 {
                        Err(format!("batch {batch} failed"))
                    } else {
                        Ok(batch)
                    }
                }
            })
            .await;

        assert_eq!(result, Err("batch 2 failed".to_string()));
        assert_eq!(*calls.borrow(), 2);
    }
}
