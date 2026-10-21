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

//! Replays rust/equivalence/vectors.json, written by generate.ts from the TS. Each case
//! describes an error as JSON; the Rust builds the same error and must produce the same error
//! state, the same log lines (byte for byte, except that a stack is only checked to be
//! there), the same line when logged as `err`, and the same `unwrapError` result.

use crate::{
    unwrap_error, ContextValue, ErrorClass, ErrorContext, ErrorOptions, ErrorSource, ProsopoError,
    ThrownError, UnwrappedError, ZodLikeError,
};
use prosopo_locale::{default_locales_directory, FixedT, I18n, I18nLookup, TranslateOptions};
use prosopo_logger::{
    get_logger_with_runtime, parse_log_level, Clock, ConsoleMethod, DirectiveStore, ErrorObject,
    LogLevel, LogRecord, LogRuntime, Logger, Sink,
};
use serde::Deserialize;
use serde_json::{json, Map, Value};
use std::collections::{BTreeSet, HashMap};
use std::sync::{Arc, Mutex, OnceLock};

const VECTORS: &str = include_str!("equivalence/vectors.json");
const STACK_PLACEHOLDER: &str = "<stack>";

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct Vectors {
    #[serde(rename = "fixedNow")]
    fixed_now: i64,
    scope: String,
    keys: Vec<String>,
    cases: Vec<CaseVector>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(untagged)]
enum SourceSpec {
    Key { key: String },
    Message { message: String },
    Wrap { wrap: Box<ErrorSpec> },
}

#[derive(Debug, Clone, Deserialize)]
#[serde(untagged)]
enum ValueSpec {
    Json { json: Value },
    Thrown { thrown: ThrownSpec },
}

#[derive(Debug, Clone, Default, Deserialize)]
#[serde(deny_unknown_fields)]
struct OptionsSpec {
    name: Option<String>,
    #[serde(rename = "translationKey")]
    translation_key: Option<String>,
    #[serde(rename = "logLevel")]
    log_level: Option<String>,
    silent: Option<bool>,
    i18n: Option<bool>,
    context: Option<Vec<(String, ValueSpec)>>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(deny_unknown_fields)]
struct ErrorSpec {
    class: String,
    source: SourceSpec,
    options: Option<OptionsSpec>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(deny_unknown_fields)]
struct ZodSpec {
    count: usize,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(deny_unknown_fields)]
struct OtherSpec {
    name: String,
    message: String,
    props: Vec<(String, Value)>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(untagged)]
enum ThrownSpec {
    Prosopo { prosopo: ErrorSpec },
    Zod { zod: ZodSpec },
    Other { other: OtherSpec },
}

#[derive(Debug, Clone, Deserialize)]
#[serde(untagged)]
enum I18nSpec {
    Lang { lang: String },
    Map { map: HashMap<String, String> },
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct UnwrappedVector {
    code: u16,
    #[serde(rename = "statusMessage")]
    status_message: String,
    #[serde(rename = "jsonError")]
    json_error: String,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct StateVector {
    message: String,
    #[serde(rename = "translationKey")]
    translation_key: Option<String>,
    code: Option<u16>,
    json: String,
    #[serde(rename = "asErr")]
    as_err: String,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct CaseVector {
    label: String,
    i18n: Option<I18nSpec>,
    thrown: ThrownSpec,
    logs: Vec<String>,
    state: Option<StateVector>,
    unwrapped: UnwrappedVector,
    #[serde(rename = "unwrappedWithoutI18n")]
    unwrapped_without_i18n: UnwrappedVector,
}

fn vectors() -> &'static Vectors {
    static PARSED: OnceLock<Vectors> = OnceLock::new();
    PARSED.get_or_init(|| serde_json::from_str(VECTORS).expect("vectors.json parses"))
}

fn catalogue_i18n() -> &'static I18n {
    static I18N: OnceLock<I18n> = OnceLock::new();
    I18N.get_or_init(|| I18n::load(&default_locales_directory()))
}

struct MapLookup(HashMap<String, String>);

impl I18nLookup for MapLookup {
    fn t(&self, key: &str) -> String {
        self.0.get(key).cloned().unwrap_or_else(|| key.to_string())
    }

    fn t_with(&self, key: &str, _options: &TranslateOptions) -> String {
        self.t(key)
    }

    fn exists(&self, key: &str) -> bool {
        self.0.contains_key(key)
    }
}

enum Lookup {
    Catalogue(FixedT<'static>),
    Map(MapLookup),
}

impl Lookup {
    fn from_spec(spec: &Option<I18nSpec>) -> Option<Lookup> {
        match spec {
            None => None,
            Some(I18nSpec::Lang { lang }) => {
                Some(Lookup::Catalogue(catalogue_i18n().fixed_t(lang)))
            }
            Some(I18nSpec::Map { map }) => Some(Lookup::Map(MapLookup(map.clone()))),
        }
    }

    fn as_dyn(&self) -> &dyn I18nLookup {
        match self {
            Lookup::Catalogue(fixed) => fixed,
            Lookup::Map(map) => map,
        }
    }
}

#[derive(Default)]
struct CaptureSink {
    lines: Mutex<Vec<String>>,
}

impl Sink for CaptureSink {
    fn write(&self, _method: ConsoleMethod, line: &str) {
        self.lines
            .lock()
            .expect("capture lock")
            .push(line.to_string());
    }
}

impl CaptureSink {
    fn take(&self) -> Vec<String> {
        std::mem::take(&mut *self.lines.lock().expect("capture lock"))
            .into_iter()
            .map(|line| without_stack(&line))
            .collect()
    }
}

struct FixedClock(i64);

impl Clock for FixedClock {
    fn now_ms(&self) -> i64 {
        self.0
    }
}

/// generate.ts's `withoutStack`.
fn without_stack(line: &str) -> String {
    let mut record: Value = serde_json::from_str(line).expect("log lines are JSON");
    match record.pointer_mut("/data/stack") {
        Some(stack @ Value::String(_)) => {
            *stack = Value::from(STACK_PLACEHOLDER);
            serde_json::to_string(&record).expect("record serialises")
        }
        _ => line.to_string(),
    }
}

fn class(name: &str) -> ErrorClass {
    ErrorClass::ALL
        .into_iter()
        .find(|class| class.class_name() == name)
        .unwrap_or_else(|| panic!("unknown class {name}"))
}

/// generate.ts's `FakeZodError`.
fn zod(count: usize) -> ZodLikeError {
    let issues: Vec<Value> = (0..count)
        .map(|i| json!({ "path": ["items", i], "message": "Expected object, received null" }))
        .collect();
    ZodLikeError {
        message: serde_json::to_string_pretty(&issues).expect("issues serialise"),
        issues,
    }
}

struct Builder<'a> {
    logger: &'a Logger,
    i18n: Option<&'a dyn I18nLookup>,
}

impl Builder<'_> {
    fn thrown(&self, spec: &ThrownSpec) -> ThrownError {
        match spec {
            ThrownSpec::Prosopo { prosopo } => self.error(prosopo).into(),
            ThrownSpec::Zod { zod: spec } => zod(spec.count).into(),
            ThrownSpec::Other { other } => other
                .props
                .iter()
                .fold(
                    ErrorObject::new(other.name.clone(), other.message.clone()),
                    |error, (key, value)| error.with_prop(key.clone(), value.clone()),
                )
                .into(),
        }
    }

    fn value(&self, spec: &ValueSpec) -> ContextValue {
        match spec {
            ValueSpec::Json { json } => ContextValue::Json(json.clone()),
            ValueSpec::Thrown { thrown } => ContextValue::Thrown(self.thrown(thrown)),
        }
    }

    /// Builds the source before the context, as JS evaluates the constructor's arguments.
    fn error(&self, spec: &ErrorSpec) -> ProsopoError {
        let source: ErrorSource = match &spec.source {
            SourceSpec::Key { key } => ErrorSource::key(key.clone()),
            SourceSpec::Message { message } => ErrorSource::message(message.clone()),
            SourceSpec::Wrap { wrap } => ErrorSource::from(&self.error(wrap)),
        };
        let options: OptionsSpec = spec.options.clone().unwrap_or_default();
        let context: Option<ErrorContext> = options.context.as_ref().map(|entries| {
            let mut context: ErrorContext = ErrorContext::new();
            for (key, value) in entries {
                context.set(key.clone(), self.value(value));
            }
            context
        });
        ProsopoError::new(
            class(&spec.class),
            source,
            ErrorOptions {
                name: options.name,
                translation_key: options.translation_key,
                logger: Some(self.logger),
                log_level: options
                    .log_level
                    .as_deref()
                    .map(|level| parse_log_level(Some(level), LogLevel::Info)),
                context,
                silent: options.silent.unwrap_or(false),
                i18n: if options.i18n == Some(true) {
                    self.i18n
                } else {
                    None
                },
            },
        )
    }
}

fn assert_unwrapped(label: &str, actual: UnwrappedError, expected: &UnwrappedVector) {
    assert_eq!(actual.code, expected.code, "{label}: code");
    assert_eq!(
        actual.status_message, expected.status_message,
        "{label}: statusMessage"
    );
    assert_eq!(
        serde_json::to_string(&actual.json_error).expect("jsonError serialises"),
        expected.json_error,
        "{label}: jsonError"
    );
}

#[test]
fn every_case_matches_the_ts() {
    let vectors: &Vectors = vectors();
    let sink: Arc<CaptureSink> = Arc::new(CaptureSink::default());
    let runtime: LogRuntime = LogRuntime {
        sink: sink.clone(),
        clock: Arc::new(FixedClock(vectors.fixed_now)),
        directives: Arc::new(DirectiveStore::new("")),
    };
    let logger: Logger = get_logger_with_runtime(LogLevel::Debug, &vectors.scope, runtime);

    for case in &vectors.cases {
        let label: &str = &case.label;
        let lookup: Option<Lookup> = Lookup::from_spec(&case.i18n);
        let i18n: Option<&dyn I18nLookup> = lookup.as_ref().map(Lookup::as_dyn);
        let builder: Builder<'_> = Builder {
            logger: &logger,
            i18n,
        };
        let thrown: ThrownError = builder.thrown(&case.thrown);
        assert_eq!(sink.take(), case.logs, "{label}: log lines");

        match (&thrown, &case.state) {
            (ThrownError::Prosopo(error), Some(state)) => {
                assert_eq!(error.message(), state.message, "{label}: message");
                assert_eq!(
                    error.translation_key(),
                    state.translation_key.as_deref(),
                    "{label}: translationKey"
                );
                assert_eq!(error.code(), state.code, "{label}: code");
                assert_eq!(
                    serde_json::to_string(&error.to_json()).expect("error serialises"),
                    state.json,
                    "{label}: JSON.stringify"
                );
                logger.error(|| LogRecord::default().with_err(error.to_error_object()));
                assert_eq!(sink.take(), vec![state.as_err.clone()], "{label}: as err");
            }
            (ThrownError::Prosopo(_), None) => panic!("{label}: no recorded state"),
            (_, state) => assert!(state.is_none(), "{label}: unexpected state"),
        }

        assert_unwrapped(label, unwrap_error(&thrown, i18n), &case.unwrapped);
        assert_unwrapped(
            label,
            unwrap_error(&thrown, None),
            &case.unwrapped_without_i18n,
        );
    }
}

/// Guards against generate.ts silently losing coverage.
#[test]
fn the_cases_cover_what_matters() {
    let vectors: &Vectors = vectors();
    let classes: BTreeSet<&str> = vectors
        .cases
        .iter()
        .filter_map(|case| match &case.thrown {
            ThrownSpec::Prosopo { prosopo } => Some(prosopo.class.as_str()),
            _ => None,
        })
        .collect();
    assert_eq!(classes.len(), ErrorClass::ALL.len());
    let count = |predicate: &dyn Fn(&CaseVector) -> bool| -> usize {
        vectors.cases.iter().filter(|case| predicate(case)).count()
    };
    let json_errors: Vec<Map<String, Value>> = vectors
        .cases
        .iter()
        .map(|case| serde_json::from_str(&case.unwrapped.json_error).expect("jsonError parses"))
        .collect();
    assert!(json_errors
        .iter()
        .any(|error| error.contains_key("messageEn")));
    assert!(json_errors.iter().any(|error| error.contains_key("data")));
    assert!(json_errors.iter().any(|error| !error.contains_key("key")));
    assert!(json_errors.iter().any(|error| error["message"].is_array()));
    assert!(
        count(&|case| case
            .logs
            .iter()
            .any(|line| line.contains(STACK_PLACEHOLDER)))
            > 0
    );
    assert!(
        count(&|case| case
            .logs
            .iter()
            .any(|line| line.contains("\"issueCount\":25")))
            > 0
    );
    assert!(count(&|case| matches!(case.thrown, ThrownSpec::Other { .. })) > 0);
    assert!(count(&|case| matches!(case.i18n, Some(I18nSpec::Lang { .. }))) > 0);
    assert!(count(&|case| case.logs.len() > 1) > 0);
    assert!(vectors.keys.len() > 20);
}
