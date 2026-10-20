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

use crate::directives::{global_directives, resolve_level, DirectiveStore};
use crate::error::{is_object_like, unpack_error, LogErr};
use crate::js::{is_truthy, iso_timestamp, js_string, js_trim, json_stringify};
use crate::level::LogLevel;
use serde_json::{Map, Value};
use std::fmt;
use std::io::Write;
use std::sync::atomic::{AtomicBool, AtomicU8, Ordering};
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};

pub type LogObject = Map<String, Value>;

/// What a log call produces. BigInts do not exist here: values TS would hold as `bigint`
/// must be passed as their decimal string, which is what the TS logger emits for them.
#[derive(Debug, Clone, Default, PartialEq)]
pub struct LogRecord {
    pub err: Option<LogErr>,
    pub data: Option<LogObject>,
    pub msg: Option<String>,
}

impl LogRecord {
    pub fn msg(msg: impl Into<String>) -> LogRecord {
        LogRecord {
            msg: Some(msg.into()),
            ..LogRecord::default()
        }
    }

    pub fn with_msg(mut self, msg: impl Into<String>) -> LogRecord {
        self.msg = Some(msg.into());
        self
    }

    /// Non-object values are ignored: a TS `LogObject` is always an object.
    pub fn with_data(mut self, data: Value) -> LogRecord {
        if let Value::Object(map) = data {
            self.data = Some(map);
        }
        self
    }

    pub fn with_err(mut self, err: impl Into<LogErr>) -> LogRecord {
        self.err = Some(err.into());
        self
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Format {
    Json,
    Plain,
}

impl Format {
    pub fn as_str(self) -> &'static str {
        match self {
            Format::Json => "json",
            Format::Plain => "plain",
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct FormatNotImplemented;

impl fmt::Display for FormatNotImplemented {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str("Only JSON format implemented for now")
    }
}

impl std::error::Error for FormatNotImplemented {}

/// The `console` method the TS logger would call for a record.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum ConsoleMethod {
    Info,
    Debug,
    Trace,
    Warn,
    Error,
}

impl ConsoleMethod {
    pub fn as_str(self) -> &'static str {
        match self {
            ConsoleMethod::Info => "info",
            ConsoleMethod::Debug => "debug",
            ConsoleMethod::Trace => "trace",
            ConsoleMethod::Warn => "warn",
            ConsoleMethod::Error => "error",
        }
    }

    pub fn for_level(level: LogLevel) -> ConsoleMethod {
        match level {
            LogLevel::Trace => ConsoleMethod::Trace,
            LogLevel::Debug => ConsoleMethod::Debug,
            LogLevel::Info => ConsoleMethod::Info,
            LogLevel::Warn => ConsoleMethod::Warn,
            LogLevel::Error | LogLevel::Fatal => ConsoleMethod::Error,
        }
    }
}

pub trait Sink: Send + Sync {
    fn write(&self, method: ConsoleMethod, line: &str);
}

/// Writes where Node's console does: `info`/`debug` to stdout, `warn`/`error`/`trace` to
/// stderr, with `trace` prefixed `Trace: `. Node also appends a JS stack to `console.trace`
/// output, which has no Rust equivalent and is omitted.
#[derive(Debug, Clone, Copy, Default)]
pub struct StdioSink;

impl Sink for StdioSink {
    fn write(&self, method: ConsoleMethod, line: &str) {
        let _ = match method {
            ConsoleMethod::Info | ConsoleMethod::Debug => {
                writeln!(std::io::stdout().lock(), "{line}")
            }
            ConsoleMethod::Warn | ConsoleMethod::Error => {
                writeln!(std::io::stderr().lock(), "{line}")
            }
            ConsoleMethod::Trace => writeln!(std::io::stderr().lock(), "Trace: {line}"),
        };
    }
}

pub trait Clock: Send + Sync {
    fn now_ms(&self) -> i64;
}

#[derive(Debug, Clone, Copy, Default)]
pub struct SystemClock;

impl Clock for SystemClock {
    fn now_ms(&self) -> i64 {
        match SystemTime::now().duration_since(UNIX_EPOCH) {
            Ok(elapsed) => i64::try_from(elapsed.as_millis()).unwrap_or(i64::MAX),
            Err(before) => -i64::try_from(before.duration().as_millis()).unwrap_or(i64::MAX),
        }
    }
}

/// The process-wide things the TS logger reaches for implicitly (`console`, `Date`,
/// `PROSOPO_LOG_LEVEL`), made explicit so they can be replaced. Child loggers share it.
#[derive(Clone)]
pub struct LogRuntime {
    pub sink: Arc<dyn Sink>,
    pub clock: Arc<dyn Clock>,
    pub directives: Arc<DirectiveStore>,
}

impl Default for LogRuntime {
    fn default() -> LogRuntime {
        LogRuntime {
            sink: Arc::new(StdioSink),
            clock: Arc::new(SystemClock),
            directives: global_directives(),
        }
    }
}

impl fmt::Debug for LogRuntime {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("LogRuntime")
            .field("directives", &self.directives)
            .finish_non_exhaustive()
    }
}

#[derive(Debug)]
struct LoggerState {
    scope: String,
    default_data: Option<Arc<LogObject>>,
    level: AtomicU8,
    pretty: AtomicBool,
    print_stack: AtomicBool,
    format: AtomicBool,
    runtime: LogRuntime,
}

/// The TS `NativeLogger`. Cloning is cheap and yields a handle to the same logger, so setters
/// on one clone are seen by all, as with a shared TS object reference; `with` creates a new one.
#[derive(Debug, Clone)]
pub struct Logger {
    state: Arc<LoggerState>,
}

pub fn get_logger(log_level: LogLevel, scope: &str) -> Logger {
    let logger = Logger::new(scope);
    logger.set_log_level(log_level);
    logger
}

pub fn get_logger_with_runtime(log_level: LogLevel, scope: &str, runtime: LogRuntime) -> Logger {
    let logger = Logger::with_runtime(scope, runtime);
    logger.set_log_level(log_level);
    logger
}

impl Logger {
    /// `new NativeLogger(scope)`: level `info`, compact JSON, no stacks.
    pub fn new(scope: &str) -> Logger {
        Logger::with_runtime(scope, LogRuntime::default())
    }

    pub fn with_runtime(scope: &str, runtime: LogRuntime) -> Logger {
        Logger::build(scope.to_string(), None, LogLevel::Info, runtime)
    }

    fn build(
        scope: String,
        default_data: Option<Arc<LogObject>>,
        level: LogLevel,
        runtime: LogRuntime,
    ) -> Logger {
        Logger {
            state: Arc::new(LoggerState {
                scope,
                default_data,
                level: AtomicU8::new(level.index()),
                pretty: AtomicBool::new(false),
                print_stack: AtomicBool::new(false),
                format: AtomicBool::new(false),
                runtime,
            }),
        }
    }

    /// Records the format even when it is rejected, as the TS setter assigns before throwing.
    pub fn set_format(&self, format: Format) -> Result<(), FormatNotImplemented> {
        self.state
            .format
            .store(format == Format::Plain, Ordering::Relaxed);
        match format {
            Format::Json => Ok(()),
            Format::Plain => Err(FormatNotImplemented),
        }
    }

    pub fn get_format(&self) -> Format {
        if self.state.format.load(Ordering::Relaxed) {
            Format::Plain
        } else {
            Format::Json
        }
    }

    /// A child logger with `obj` merged over the parent's default data and `subscope`
    /// appended to the scope (`"database"` + `"queries"` → `"database:queries"`). The child
    /// starts at the parent's configured level; directives are still resolved at emit time.
    pub fn with(&self, obj: &LogObject, subscope: Option<&str>) -> Logger {
        let scope = match subscope.map(js_trim).filter(|s| !s.is_empty()) {
            Some(sub) if !self.state.scope.is_empty() => format!("{}:{sub}", self.state.scope),
            Some(sub) => sub.to_string(),
            None => self.state.scope.clone(),
        };
        let default_data = if obj.is_empty() {
            self.state.default_data.clone()
        } else {
            Some(Arc::new(self.merged_with_defaults(Some(obj))))
        };
        let child = Logger::build(
            scope,
            default_data,
            self.get_log_level(),
            self.state.runtime.clone(),
        );
        child.set_pretty(self.get_pretty());
        child.set_print_stack(self.get_print_stack());
        child
    }

    /// `{ ...defaultData, ...data }`: keys already present keep their position.
    fn merged_with_defaults(&self, data: Option<&LogObject>) -> LogObject {
        let mut merged: LogObject = self
            .state
            .default_data
            .as_deref()
            .cloned()
            .unwrap_or_default();
        for (key, value) in data.into_iter().flatten() {
            merged.insert(key.clone(), value.clone());
        }
        merged
    }

    pub fn get_print_stack(&self) -> bool {
        self.state.print_stack.load(Ordering::Relaxed)
    }

    pub fn set_print_stack(&self, print_stack: bool) {
        self.state.print_stack.store(print_stack, Ordering::Relaxed);
    }

    pub fn get_pretty(&self) -> bool {
        self.state.pretty.load(Ordering::Relaxed)
    }

    pub fn set_pretty(&self, pretty: bool) {
        self.state.pretty.store(pretty, Ordering::Relaxed);
    }

    pub fn get_scope(&self) -> &str {
        &self.state.scope
    }

    pub fn set_log_level(&self, level: LogLevel) {
        self.state.level.store(level.index(), Ordering::Relaxed);
    }

    pub fn get_log_level(&self) -> LogLevel {
        LogLevel::from_index(self.state.level.load(Ordering::Relaxed))
    }

    /// Whether a record at `level` would be emitted right now.
    pub fn enabled(&self, level: LogLevel) -> bool {
        let directives = self.state.runtime.directives.get();
        level >= resolve_level(&self.state.scope, &directives, self.get_log_level())
    }

    /// Renders the line the TS logger would pass to `console`, or `None` if filtered out.
    pub fn format_record<F: FnOnce() -> LogRecord>(&self, level: LogLevel, f: F) -> Option<String> {
        if !self.enabled(level) {
            return None;
        }
        let ts = iso_timestamp(self.state.runtime.clock.now_ms());
        let LogRecord { data, msg, err } = f();

        let mut err_msg: Option<String> = None;
        let mut err_data: Option<Map<String, Value>> = None;
        if let Some(err) = err.as_ref().filter(|e| is_truthy_err(e)) {
            if is_object_like(err) {
                let unpacked = unpack_error(err, self.get_print_stack());
                err_msg = Some(unpacked.msg);
                err_data = Some(unpacked.data);
            } else if let LogErr::Value(value) = err {
                err_msg = Some(js_string(value));
            }
        }

        let data = if self.state.default_data.is_some() {
            Some(self.merged_with_defaults(data.as_ref()))
        } else {
            data
        };
        let req_id = data
            .as_ref()
            .and_then(|d| d.get("requestId"))
            .and_then(Value::as_str)
            .filter(|id| !id.is_empty())
            .map(str::to_string);

        let mut record: Map<String, Value> = Map::new();
        record.insert("scope".to_string(), Value::String(self.state.scope.clone()));
        record.insert("ts".to_string(), Value::String(ts));
        record.insert(
            "level".to_string(),
            Value::String(level.as_str().to_string()),
        );
        if let Some(req_id) = req_id {
            record.insert("req_id".to_string(), Value::String(req_id));
        }
        if let Some(data) = data {
            record.insert("data".to_string(), Value::Object(data));
        }
        if let Some(msg) = msg.filter(|m| !m.is_empty()) {
            record.insert("msg".to_string(), Value::String(msg));
        }
        if let Some(err_msg) = err_msg.filter(|m| !m.is_empty()) {
            record.insert("err".to_string(), Value::String(err_msg));
        }
        if let Some(err_data) = err_data {
            record.insert("errData".to_string(), Value::Object(err_data));
        }
        let indent = if self.get_pretty() { 2 } else { 0 };
        Some(json_stringify(&Value::Object(record), indent))
    }

    fn print<F: FnOnce() -> LogRecord>(&self, level: LogLevel, f: F) {
        if let Some(line) = self.format_record(level, f) {
            self.state
                .runtime
                .sink
                .write(ConsoleMethod::for_level(level), &line);
        }
    }

    pub fn info<F: FnOnce() -> LogRecord>(&self, f: F) {
        self.print(LogLevel::Info, f);
    }

    pub fn debug<F: FnOnce() -> LogRecord>(&self, f: F) {
        self.print(LogLevel::Debug, f);
    }

    pub fn trace<F: FnOnce() -> LogRecord>(&self, f: F) {
        self.print(LogLevel::Trace, f);
    }

    pub fn warn<F: FnOnce() -> LogRecord>(&self, f: F) {
        self.print(LogLevel::Warn, f);
    }

    pub fn error<F: FnOnce() -> LogRecord>(&self, f: F) {
        self.print(LogLevel::Error, f);
    }

    pub fn fatal<F: FnOnce() -> LogRecord>(&self, f: F) {
        self.print(LogLevel::Fatal, f);
    }

    pub fn log<F: FnOnce() -> LogRecord>(&self, level: LogLevel, f: F) {
        self.print(level, f);
    }
}

fn is_truthy_err(err: &LogErr) -> bool {
    match err {
        LogErr::Error(_) => true,
        LogErr::Value(value) => is_truthy(value),
    }
}
