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

//! Rust port of `@prosopo/logger`: a JSON-lines logger whose output is byte-identical to the
//! TypeScript `NativeLogger`, because Vector parses those lines in production.

mod directives;
mod error;
mod js;
mod level;
mod logger;

pub use directives::{
    global_directives, parse_directives, resolve_level, set_global_directives, DirectiveStore,
    Directives,
};
pub use error::{ErrorObject, ErrorProperty, LogErr};
pub use level::{parse_log_level, LogLevel, UnknownLogLevel};
pub use logger::{
    get_logger, get_logger_with_runtime, Clock, ConsoleMethod, Format, FormatNotImplemented,
    LogObject, LogRecord, LogRuntime, Logger, Sink, StdioSink, SystemClock,
};

#[cfg(test)]
mod equivalence;
#[cfg(test)]
mod test_support;
#[cfg(test)]
mod tests;
