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

use fancy_regex::{Regex, RegexBuilder};
use indexmap::IndexMap;
use std::sync::OnceLock;

/// The parsed contents of an env file, in the order `Object.keys` would list them.
pub type DotenvParsed = IndexMap<String, String>;

// dotenv 16's regexes, rewritten for fancy-regex. JS `\s`, `\w`, `.`, and the multiline `^`/`$`
// differ from their Rust spellings (Unicode classes, `\n`-only line ends), so the JS
// definitions are spelled out.
const JS_SPACE: &str = r"[\t\n\x0B\x0C\r \u{A0}\u{1680}\u{2000}-\u{200A}\u{2028}\u{2029}\u{202F}\u{205F}\u{3000}\u{FEFF}]";
const JS_LINE_START: &str = r"(?:\A|(?<=[\n\r\u{2028}\u{2029}]))";
const JS_LINE_END: &str = r"(?=[\n\r\u{2028}\u{2029}]|\z)";
const JS_DOT: &str = r"[^\n\r\u{2028}\u{2029}]";

// JS has no backtracking limit; inputs that exhaust this one are far beyond any real env file.
const BACKTRACK_LIMIT: usize = 1 << 40;

fn build(pattern: &str) -> Regex {
    RegexBuilder::new(pattern)
        .backtrack_limit(BACKTRACK_LIMIT)
        .build()
        .expect("static dotenv pattern compiles")
}

fn line_regex() -> &'static Regex {
    static LINE: OnceLock<Regex> = OnceLock::new();
    LINE.get_or_init(|| {
        build(&format!(
            r#"{bol}{s}*(?:export{s}+)?([A-Za-z0-9_.\-]+)(?:{s}*={s}*?|:{s}+?)({s}*'(?:\\'|[^'])*'|{s}*"(?:\\"|[^"])*"|{s}*`(?:\\`|[^`])*`|[^#\r\n]+)?{s}*(?:#{dot}*)?{eol}"#,
            bol = JS_LINE_START,
            s = JS_SPACE,
            dot = JS_DOT,
            eol = JS_LINE_END,
        ))
    })
}

fn surrounding_quotes_regex() -> &'static Regex {
    static QUOTES: OnceLock<Regex> = OnceLock::new();
    QUOTES.get_or_init(|| {
        build(&format!(
            r#"{bol}(['"`])((?s:.)*)\1{eol}"#,
            bol = JS_LINE_START,
            eol = JS_LINE_END,
        ))
    })
}

fn is_js_whitespace(c: char) -> bool {
    matches!(
        c,
        '\t' | '\n' | '\u{0B}' | '\u{0C}' | '\r' | ' ' | '\u{A0}' | '\u{1680}' | '\u{2000}'
            ..='\u{200A}'
                | '\u{2028}'
                | '\u{2029}'
                | '\u{202F}'
                | '\u{205F}'
                | '\u{3000}'
                | '\u{FEFF}'
    )
}

fn is_array_index(key: &str) -> bool {
    if key.is_empty() || !key.bytes().all(|b| b.is_ascii_digit()) {
        return false;
    }
    if key.len() > 1 && key.starts_with('0') {
        return false;
    }
    key.parse::<u64>().is_ok_and(|n| n < u64::from(u32::MAX))
}

type Entry = (String, String);

/// JS objects list integer-like keys first, ascending, then the rest in insertion order.
fn into_js_key_order(entries: DotenvParsed) -> DotenvParsed {
    let (mut indices, named): (Vec<Entry>, Vec<Entry>) = entries
        .into_iter()
        .partition(|(key, _)| is_array_index(key));
    indices.sort_by_key(|(key, _)| key.parse::<u64>().unwrap_or(u64::MAX));
    indices.into_iter().chain(named).collect()
}

/// `dotenv.parse` (v16.4.5).
pub fn parse(src: &str) -> DotenvParsed {
    let lines = src.replace("\r\n", "\n").replace('\r', "\n");
    let mut obj: DotenvParsed = IndexMap::new();

    for captures in line_regex().captures_iter(&lines) {
        let Ok(captures) = captures else { break };
        let key = captures.get(1).map_or("", |m| m.as_str());
        let raw = captures.get(2).map_or("", |m| m.as_str());
        let trimmed = raw.trim_matches(is_js_whitespace);
        let maybe_quote = trimmed.chars().next();

        let mut value = surrounding_quotes_regex()
            .replace_all(trimmed, "$2")
            .into_owned();
        if maybe_quote == Some('"') {
            value = value.replace("\\n", "\n").replace("\\r", "\r");
        }

        // Assigning a string to `obj.__proto__` is a no-op in JS.
        if key == "__proto__" {
            continue;
        }
        obj.insert(key.to_string(), value);
    }

    into_js_key_order(obj)
}
