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

// Ported from rust/equivalence/generate.ts, which records the TS logger's console output.

use crate::test_support::harness;
use crate::{
    get_logger_with_runtime, parse_directives, parse_log_level, resolve_level, ErrorObject, Format,
    LogErr, LogLevel, LogObject, LogRecord, Logger,
};
use serde::Deserialize;
use serde_json::{Map, Number, Value};
use std::collections::HashMap;
use std::sync::atomic::Ordering;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Vectors {
    scenarios: Vec<Scenario>,
    filter_vectors: Vec<FilterVector>,
    parse_log_level: Vec<ParseLogLevelVector>,
    parse_directives: Vec<ParseDirectivesVector>,
    resolve_level: Vec<ResolveLevelVector>,
}

#[derive(Deserialize)]
struct Scenario {
    name: String,
    steps: Vec<Step>,
    events: Vec<Value>,
}

#[derive(Deserialize)]
#[serde(tag = "op", rename_all = "camelCase")]
enum Step {
    Directives {
        raw: String,
    },
    Now {
        ms: i64,
    },
    GetLogger {
        id: String,
        level: String,
        scope: String,
    },
    New {
        id: String,
        scope: String,
    },
    With {
        id: String,
        parent: String,
        data: Value,
        subscope: Option<String>,
    },
    SetLevel {
        id: String,
        level: String,
    },
    SetPretty {
        id: String,
        value: bool,
    },
    SetPrintStack {
        id: String,
        value: bool,
    },
    SetFormat {
        id: String,
        format: String,
    },
    Inspect {
        id: String,
    },
    Emit {
        id: String,
        method: String,
        level: Option<String>,
        record: RecordSpec,
    },
}

#[derive(Deserialize)]
struct RecordSpec {
    msg: Option<String>,
    data: Option<Value>,
    err: Option<ErrSpec>,
}

#[derive(Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
enum ErrSpec {
    Value {
        value: Value,
    },
    Error {
        ctor: String,
        message: Option<String>,
        stack: Option<String>,
        cause: Option<Box<ErrSpec>>,
        props: Option<Vec<(String, ErrSpec)>>,
    },
}

#[derive(Deserialize)]
struct FilterVector {
    directives: String,
    scope: String,
    level: String,
    emitted: Vec<(String, String)>,
}

#[derive(Deserialize)]
struct ParseLogLevelVector {
    input: Option<String>,
    or: String,
    output: String,
}

#[derive(Deserialize)]
struct ParseDirectivesVector {
    raw: String,
    output: Vec<(String, String)>,
}

#[derive(Deserialize)]
struct ResolveLevelVector {
    scope: String,
    raw: String,
    fallback: String,
    output: String,
}

fn vectors() -> Vectors {
    serde_json::from_str(include_str!("equivalence/vectors.json")).expect("vectors.json parses")
}

fn level(name: &str) -> LogLevel {
    name.parse().expect("vector level is valid")
}

fn decode(value: &Value) -> Value {
    match value {
        Value::Array(items) => Value::Array(items.iter().map(decode).collect()),
        Value::Object(map) => {
            if let Some(Value::String(digits)) = map.get("$bigint") {
                return Value::String(digits.clone());
            }
            if map.get("$negzero") == Some(&Value::Bool(true)) {
                return Value::Number(Number::from_f64(-0.0).expect("finite"));
            }
            if let Some(Value::Array(entries)) = map.get("$entries") {
                let mut out = Map::new();
                for entry in entries {
                    if let Some([Value::String(key), inner]) = entry.as_array().map(Vec::as_slice) {
                        out.insert(key.clone(), decode(inner));
                    }
                }
                return Value::Object(out);
            }
            Value::Object(map.iter().map(|(k, v)| (k.clone(), decode(v))).collect())
        }
        other => other.clone(),
    }
}

fn decode_object(value: &Value) -> LogObject {
    match decode(value) {
        Value::Object(map) => map,
        other => panic!("expected an object, got {other}"),
    }
}

fn build_err(spec: &ErrSpec) -> LogErr {
    match spec {
        ErrSpec::Value { value } => LogErr::Value(decode(value)),
        ErrSpec::Error {
            ctor,
            message,
            stack,
            cause,
            props,
        } => {
            let mut err = match message {
                Some(message) => ErrorObject::new(ctor.as_str(), message.as_str()),
                None => ErrorObject::without_message(ctor.as_str()),
            };
            if let Some(stack) = stack {
                err = err.with_stack(stack.as_str());
            }
            if let Some(cause) = cause {
                err = err.with_cause(build_err(cause));
            }
            for (key, value) in props.iter().flatten() {
                err = err.with_prop(key.as_str(), build_err(value));
            }
            LogErr::Error(err)
        }
    }
}

fn build_record(spec: &RecordSpec) -> LogRecord {
    LogRecord {
        msg: spec.msg.clone(),
        data: spec.data.as_ref().map(decode_object),
        err: spec.err.as_ref().map(build_err),
    }
}

fn console_event(method: &str, line: &str) -> Value {
    serde_json::json!({ "console": method, "line": line })
}

fn run(scenario: &Scenario) -> Vec<Value> {
    let h = harness();
    let mut loggers: HashMap<String, Logger> = HashMap::new();
    let mut events: Vec<Value> = Vec::new();
    for step in &scenario.steps {
        match step {
            Step::Directives { raw } => h.directives.set(raw),
            Step::Now { ms } => h.clock.0.store(*ms, Ordering::Relaxed),
            Step::GetLogger {
                id,
                level: l,
                scope,
            } => {
                loggers.insert(
                    id.clone(),
                    get_logger_with_runtime(level(l), scope, h.runtime.clone()),
                );
            }
            Step::New { id, scope } => {
                loggers.insert(id.clone(), Logger::with_runtime(scope, h.runtime.clone()));
            }
            Step::With {
                id,
                parent,
                data,
                subscope,
            } => {
                let child = loggers[parent].with(&decode_object(data), subscope.as_deref());
                loggers.insert(id.clone(), child);
            }
            Step::SetLevel { id, level: l } => loggers[id].set_log_level(level(l)),
            Step::SetPretty { id, value } => loggers[id].set_pretty(*value),
            Step::SetPrintStack { id, value } => loggers[id].set_print_stack(*value),
            Step::SetFormat { id, format } => {
                let format = match format.as_str() {
                    "json" => Format::Json,
                    _ => Format::Plain,
                };
                let error = loggers[id].set_format(format).err().map(|e| e.to_string());
                events.push(serde_json::json!({ "setFormatError": error }));
            }
            Step::Inspect { id } => {
                let logger = &loggers[id];
                events.push(serde_json::json!({ "inspect": {
                    "level": logger.get_log_level().as_str(),
                    "scope": logger.get_scope(),
                    "pretty": logger.get_pretty(),
                    "printStack": logger.get_print_stack(),
                    "format": logger.get_format().as_str(),
                }}));
            }
            Step::Emit {
                id,
                method,
                level: log_level,
                record,
            } => {
                let logger = &loggers[id];
                let f = || build_record(record);
                match method.as_str() {
                    "log" => logger.log(level(log_level.as_deref().unwrap_or("info")), f),
                    "trace" => logger.trace(f),
                    "debug" => logger.debug(f),
                    "info" => logger.info(f),
                    "warn" => logger.warn(f),
                    "error" => logger.error(f),
                    "fatal" => logger.fatal(f),
                    other => panic!("unknown method {other}"),
                }
                for (method, line) in h.sink.take() {
                    events.push(console_event(method.as_str(), &line));
                }
            }
        }
    }
    events
}

#[test]
fn equivalence_scenarios() {
    let vectors = vectors();
    assert!(!vectors.scenarios.is_empty());
    for scenario in &vectors.scenarios {
        assert_eq!(run(scenario), scenario.events, "{}", scenario.name);
    }
}

#[test]
fn equivalence_filtering() {
    let vectors = vectors();
    assert!(!vectors.filter_vectors.is_empty());
    for vector in &vectors.filter_vectors {
        let h = harness();
        h.directives.set(&vector.directives);
        h.clock.0.store(1_767_225_600_123, Ordering::Relaxed);
        let logger =
            get_logger_with_runtime(level(&vector.level), &vector.scope, h.runtime.clone());
        for method in ["trace", "debug", "info", "warn", "error", "fatal"] {
            logger.log(level(method), || LogRecord::msg(method));
        }
        logger.log(LogLevel::Warn, || LogRecord::msg("log"));
        let emitted: Vec<(String, String)> = h
            .sink
            .take()
            .into_iter()
            .map(|(method, line)| (method.as_str().to_string(), line))
            .collect();
        assert_eq!(
            emitted, vector.emitted,
            "directives={:?} scope={:?} level={}",
            vector.directives, vector.scope, vector.level
        );
    }
}

#[test]
fn equivalence_parse_log_level() {
    for vector in vectors().parse_log_level {
        assert_eq!(
            parse_log_level(vector.input.as_deref(), level(&vector.or)).as_str(),
            vector.output,
            "{:?}",
            vector.input
        );
    }
}

#[test]
fn equivalence_parse_directives() {
    for vector in vectors().parse_directives {
        let mut entries: Vec<(String, String)> = parse_directives(&vector.raw)
            .into_iter()
            .map(|(scope, l)| (scope, l.as_str().to_string()))
            .collect();
        entries.sort();
        assert_eq!(entries, vector.output, "{:?}", vector.raw);
    }
}

#[test]
fn equivalence_resolve_level() {
    for vector in vectors().resolve_level {
        let directives = parse_directives(&vector.raw);
        assert_eq!(
            resolve_level(&vector.scope, &directives, level(&vector.fallback)).as_str(),
            vector.output,
            "{:?} {:?}",
            vector.scope,
            vector.raw
        );
    }
}
