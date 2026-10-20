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

use crate::js::js_trim;
use std::fmt;
use std::str::FromStr;

/// Variants are declared in severity order, so the derived `Ord` is the TS `logLevelMap`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub enum LogLevel {
    Trace,
    Debug,
    Info,
    Warn,
    Error,
    Fatal,
}

impl LogLevel {
    /// `LogLevel.options`, in the TS declaration order.
    pub const OPTIONS: [LogLevel; 6] = [
        LogLevel::Info,
        LogLevel::Debug,
        LogLevel::Trace,
        LogLevel::Warn,
        LogLevel::Error,
        LogLevel::Fatal,
    ];

    pub fn as_str(self) -> &'static str {
        match self {
            LogLevel::Trace => "trace",
            LogLevel::Debug => "debug",
            LogLevel::Info => "info",
            LogLevel::Warn => "warn",
            LogLevel::Error => "error",
            LogLevel::Fatal => "fatal",
        }
    }

    pub(crate) fn from_index(index: u8) -> LogLevel {
        match index {
            0 => LogLevel::Trace,
            1 => LogLevel::Debug,
            2 => LogLevel::Info,
            3 => LogLevel::Warn,
            4 => LogLevel::Error,
            _ => LogLevel::Fatal,
        }
    }

    pub(crate) fn index(self) -> u8 {
        self as u8
    }
}

impl fmt::Display for LogLevel {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.as_str())
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct UnknownLogLevel(pub String);

impl fmt::Display for UnknownLogLevel {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "Unknown log level: {}", self.0)
    }
}

impl std::error::Error for UnknownLogLevel {}

impl FromStr for LogLevel {
    type Err = UnknownLogLevel;

    /// Exact match only, like the TS `isLogLevel` guard; no trimming or case folding.
    fn from_str(s: &str) -> Result<LogLevel, UnknownLogLevel> {
        LogLevel::OPTIONS
            .into_iter()
            .find(|level| level.as_str() == s)
            .ok_or_else(|| UnknownLogLevel(s.to_string()))
    }
}

/// Extracts the bare global level from a level or directive string such as
/// `"warn,database=trace"`, returning `or` when there is none.
pub fn parse_log_level(level: Option<&str>, or: LogLevel) -> LogLevel {
    let Some(level) = level.filter(|l| !l.is_empty()) else {
        return or;
    };
    for part in level.split(',') {
        let trimmed = js_trim(part);
        if !trimmed.is_empty() && !trimmed.contains('=') {
            if let Ok(parsed) = trimmed.parse::<LogLevel>() {
                return parsed;
            }
        }
    }
    or
}
